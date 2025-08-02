const express = require('express');
const multer = require('multer');
const { getDifyConfigByModel, loadConfig } = require('../middleware/auth');
const DifyClient = require('../services/difyClient');
const logger = require('../utils/logger');

function createFilesRouter() {
  const router = express.Router();
  
  // 配置 multer 用于处理文件上传
  const upload = multer({
    storage: multer.memoryStorage(), // 将文件存储在内存中
    limits: {
      fileSize: 512 * 1024 * 1024, // 512MB 限制，匹配 OpenAI 标准
      files: 1 // 只允许一个文件
    },
    fileFilter: (req, file, cb) => {
      // 基础文件类型检查，具体限制由 Dify 后端处理
      console.log(`📁 上传文件信息: ${file.originalname}, MIME: ${file.mimetype}, 大小: ${file.size || '未知'}`);
      cb(null, true);
    }
  });

  /**
   * 上传文件 - 兼容 OpenAI 格式
   * POST /v1/files
   * 
   * 将 OpenAI 文件上传请求适配到 Dify 文件上传 API
   */
  router.post('/v1/files', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    const requestId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    console.log(`📤 [${requestId}] 收到文件上传请求`);
    console.log(`   来源IP: ${req.ip}`);
    console.log(`   User-Agent: ${req.get('User-Agent')}`);
    
    // 记录详细请求日志
    logger.info('File upload request received', {
      requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      purpose: req.body.purpose,
      hasFile: !!req.file
    });

    try {
      // 验证必需参数
      if (!req.file) {
        console.log(`❌ [${requestId}] 缺少文件`);
        return res.status(400).json({
          error: {
            message: 'No file provided',
            type: 'invalid_request_error',
            code: 'no_file_uploaded'
          }
        });
      }

      const { purpose = 'assistants' } = req.body;
      const { user } = req.body; // 可选的用户标识

      // 如果没有提供 user，使用 API key 作为用户标识
      const userIdentifier = user || req.apiKey || 'default-user';

      console.log(`📋 [${requestId}] 文件上传参数:`);
      console.log(`   文件名: ${req.file.originalname}`);
      console.log(`   文件大小: ${req.file.size} bytes`);
      console.log(`   MIME类型: ${req.file.mimetype}`);
      console.log(`   用途: ${purpose}`);
      console.log(`   用户标识: ${userIdentifier}`);

      // 获取默认的 Dify 配置用于文件上传
      const config = loadConfig();
      const defaultModel = config.settings.default_model || 'dify-qwen';
      const difyConfig = getDifyConfigByModel(defaultModel);

      if (!difyConfig) {
        console.log(`❌ [${requestId}] 找不到默认模型配置: ${defaultModel}`);
        return res.status(500).json({
          error: {
            message: `Default model configuration not found: ${defaultModel}`,
            type: 'configuration_error',
            code: 'model_config_missing'
          }
        });
      }

      console.log(`✅ [${requestId}] 使用模型配置: ${defaultModel}`);
      console.log(`🏭 [${requestId}] Dify 应用信息:`);
      console.log(`   应用名称: ${difyConfig.appName}`);
      console.log(`   基础URL: ${difyConfig.baseURL}`);

      // 创建 DifyClient 实例
      const difyClient = new DifyClient(difyConfig);

      console.log(`📤 [${requestId}] 发送文件到 Dify...`);
      
      // 调用 Dify 文件上传 API
      const difyResponse = await difyClient.uploadFile(req.file, userIdentifier);

      const duration = Date.now() - startTime;
      console.log(`✅ [${requestId}] 文件上传完成 (耗时: ${duration}ms)`);
      console.log(`📊 [${requestId}] Dify 响应:`, difyResponse);

      // 记录成功日志
      logger.info('File upload successful', {
        requestId,
        fileId: difyResponse.id,
        fileName: difyResponse.name,
        fileSize: difyResponse.size,
        duration
      });

      // 转换为 OpenAI 兼容格式
      const openaiResponse = {
        id: `file-${difyResponse.id}`, // 添加 OpenAI 风格的前缀
        object: 'file',
        bytes: difyResponse.size,
        created_at: Math.floor(new Date(difyResponse.created_at).getTime() / 1000),
        filename: difyResponse.name,
        purpose: purpose,
        // 保留 Dify 原始信息用于调试
        _dify: {
          original_id: difyResponse.id,
          extension: difyResponse.extension,
          mime_type: difyResponse.mime_type,
          created_by: difyResponse.created_by
        }
      };

      res.json(openaiResponse);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [${requestId}] 文件上传失败 (耗时: ${duration}ms):`, error.message);
      
      // 记录错误日志
      logger.error('File upload failed', {
        requestId,
        error: error.message,
        duration,
        fileName: req.file?.originalname,
        fileSize: req.file?.size
      });
      
      if (error.response) {
        console.error(`   HTTP状态: ${error.response.status}`);
        console.error(`   错误数据:`, error.response.data);
        
        // 根据 Dify 错误码映射到 OpenAI 错误格式
        const difyError = error.response.data;
        let openaiError = {
          message: 'File upload failed',
          type: 'server_error',
          code: 'upload_failed'
        };

        // 映射常见的 Dify 错误到 OpenAI 格式
        switch (difyError.code) {
          case 'no_file_uploaded':
            openaiError = {
              message: 'No file provided',
              type: 'invalid_request_error',
              code: 'no_file_uploaded'
            };
            break;
            
          case 'too_many_files':
            openaiError = {
              message: 'Only one file is allowed per request',
              type: 'invalid_request_error',
              code: 'too_many_files'
            };
            break;
            
          case 'file_too_large':
            openaiError = {
              message: 'File size exceeds the maximum limit',
              type: 'invalid_request_error',
              code: 'file_too_large'
            };
            break;
            
          case 'unsupported_file_type':
            openaiError = {
              message: 'Unsupported file type',
              type: 'invalid_request_error',
              code: 'unsupported_file_type'
            };
            break;
            
          default:
            openaiError.message = difyError.message || 'File upload failed';
        }

        return res.status(error.response.status).json({ error: openaiError });
      }

      res.status(500).json({
        error: {
          message: 'Internal server error during file upload',
          type: 'internal_error',
          code: 'upload_failed',
          details: error.message
        }
      });
    }
  });

  /**
   * 获取文件列表 - OpenAI 兼容格式
   * GET /v1/files
   * 
   * 注意：Dify 可能不支持文件列表功能，这个端点主要用于兼容性
   */
  router.get('/v1/files', async (req, res) => {
    const requestId = `files-list-${Date.now()}`;
    console.log(`📋 [${requestId}] 收到文件列表请求`);
    
    // 由于 Dify 可能不支持文件列表功能，返回提示信息
    res.json({
      object: 'list',
      data: [],
      has_more: false,
      _note: 'File listing is not supported by Dify backend. Files are managed per conversation.'
    });
  });

  /**
   * 获取单个文件信息 - OpenAI 兼容格式
   * GET /v1/files/:file_id
   * 
   * 注意：Dify 可能不支持单独的文件查询功能
   */
  router.get('/v1/files/:file_id', async (req, res) => {
    const requestId = `file-info-${Date.now()}`;
    const { file_id } = req.params;
    
    console.log(`📋 [${requestId}] 收到文件信息查询: ${file_id}`);
    
    // 由于 Dify 可能不支持单独的文件查询，返回基础信息
    res.status(404).json({
      error: {
        message: `File ${file_id} not found or file querying is not supported by Dify backend`,
        type: 'not_found_error',
        code: 'file_not_found'
      }
    });
  });

  /**
   * 删除文件 - OpenAI 兼容格式
   * DELETE /v1/files/:file_id
   * 
   * 注意：Dify 可能不支持文件删除功能
   */
  router.delete('/v1/files/:file_id', async (req, res) => {
    const requestId = `file-delete-${Date.now()}`;
    const { file_id } = req.params;
    
    console.log(`🗑️ [${requestId}] 收到文件删除请求: ${file_id}`);
    
    // 由于 Dify 可能不支持文件删除，返回提示信息
    res.status(501).json({
      error: {
        message: 'File deletion is not supported by Dify backend',
        type: 'not_implemented_error',
        code: 'delete_not_supported'
      }
    });
  });

  return router;
}

module.exports = {
  createFilesRouter
};
