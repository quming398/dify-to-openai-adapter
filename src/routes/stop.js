const express = require('express');
const { getDifyConfigByModel } = require('../middleware/auth');
const DifyClient = require('../services/difyClient');

function createStopRouter() {
  const router = express.Router();

  /**
   * 停止流式响应 - 兼容OpenAI格式
   * POST /v1/chat/completions/:id/stop
   * 这个路由适配OpenAI格式，但内部调用Dify的停止API
   */
  router.post('/v1/chat/completions/:id/stop', async (req, res) => {
    const startTime = Date.now();
    const requestId = `stop-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    console.log(`🛑 [${requestId}] 收到停止请求`);
    console.log(`   任务ID: ${req.params.id}`);
    console.log(`   来源IP: ${req.ip}`);
    console.log(`   User-Agent: ${req.get('User-Agent')}`);
    
    try {
      const { id: taskId } = req.params;
      const { user, model } = req.body;
      
      if (!taskId) {
        console.log(`❌ [${requestId}] 缺少任务ID`);
        return res.status(400).json({
          error: {
            message: 'Task ID is required',
            type: 'invalid_request_error',
            code: 'missing_task_id'
          }
        });
      }

      if (!user) {
        console.log(`❌ [${requestId}] 缺少用户标识`);
        return res.status(400).json({
          error: {
            message: 'User identifier is required',
            type: 'invalid_request_error', 
            code: 'missing_user'
          }
        });
      }

      // 根据模型ID获取对应的Dify配置
      const modelToUse = model || 'dify-qwen'; // 使用默认模型
      const difyConfig = getDifyConfigByModel(modelToUse);
      
      if (!difyConfig) {
        console.log(`❌ [${requestId}] 模型配置未找到: ${modelToUse}`);
        return res.status(400).json({
          error: {
            message: `Model '${modelToUse}' not found in configuration`,
            type: 'invalid_request_error',
            code: 'model_not_found'
          }
        });
      }

      console.log(`✅ [${requestId}] 找到模型配置: ${modelToUse}`);
      console.log(`🏭 [${requestId}] Dify 应用信息:`);
      console.log(`   应用名称: ${difyConfig.appName}`);
      console.log(`   基础URL: ${difyConfig.baseURL}`);

      // 创建DifyClient实例
      const difyClient = new DifyClient(difyConfig);

      console.log(`📤 [${requestId}] 发送停止请求到 Dify...`);
      
      // 调用Dify停止API
      const result = await difyClient.stopChatMessage(taskId, user);

      const duration = Date.now() - startTime;
      console.log(`✅ [${requestId}] 停止请求处理完成 (耗时: ${duration}ms)`);
      console.log(`📊 [${requestId}] 停止结果: ${result.result}`);

      // 返回OpenAI兼容格式
      res.json({
        id: taskId,
        object: 'chat.completion.stop',
        result: result.result,
        stopped_at: Math.floor(Date.now() / 1000),
        model: modelToUse
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [${requestId}] 停止请求失败 (耗时: ${duration}ms):`, error.message);
      
      if (error.response) {
        console.error(`   HTTP状态: ${error.response.status}`);
        console.error(`   错误数据:`, error.response.data);
        
        // 如果是404错误，说明任务不存在或已完成
        if (error.response.status === 404) {
          return res.status(404).json({
            error: {
              message: `Task ${req.params.id} not found or already completed`,
              type: 'not_found_error',
              code: 'task_not_found'
            }
          });
        }
      }

      res.status(500).json({
        error: {
          message: 'Failed to stop chat completion',
          type: 'internal_error',
          code: 'stop_failed',
          details: error.message
        }
      });
    }
  });

  /**
   * 兼容性路由：支持不同的停止API格式
   * POST /v1/completions/:id/stop - 为文本补全提供停止功能
   */
  router.post('/v1/completions/:id/stop', async (req, res) => {
    // 复用chat completions的停止逻辑
    req.url = req.url.replace('/completions/', '/chat/completions/');
    return createStopRouter().handle(req, res);
  });

  return router;
}

module.exports = createStopRouter;
