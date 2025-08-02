const express = require('express');
const DifyClient = require('../services/difyClient');
const { getDifyConfigByModel, getModelMapping } = require('../middleware/auth');
const { logRequest } = require('../utils/logger');

function createChatRouter() {
  const router = express.Router();  router.post('/completions', async (req, res, next) => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 同时记录到专门的请求日志文件
    logRequest(`🔵 [${requestId}] ==================== 收到聊天请求 ====================`);
    logRequest(`📅 时间: ${new Date().toISOString()}`);
    logRequest(`🌐 来源IP: ${req.ip || req.connection.remoteAddress}`);
    logRequest(`📋 User-Agent: ${req.get('User-Agent') || 'Unknown'}`);
    logRequest(`🔑 API Key: ${req.get('Authorization')?.substring(0, 20)}...`);
    logRequest(`📊 请求方法: ${req.method} ${req.originalUrl}`);
    logRequest(`📦 原始请求体: ${JSON.stringify(req.body, null, 2)}`);
    
    // 打印原始请求详情（控制台 + 通用日志）
    console.log(`\n🔵 [${requestId}] ==================== 收到聊天请求 ====================`);
    console.log(`📅 时间: ${new Date().toISOString()}`);
    console.log(`🌐 来源IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`📋 User-Agent: ${req.get('User-Agent') || 'Unknown'}`);
    console.log(`🔑 API Key: ${req.get('Authorization')?.substring(0, 20)}...`);
    console.log(`📊 请求方法: ${req.method} ${req.originalUrl}`);
    
    // 打印请求头信息
    console.log(`📋 重要请求头:`);
    console.log(`   Content-Type: ${req.get('Content-Type')}`);
    console.log(`   Content-Length: ${req.get('Content-Length')}`);
    if (req.get('X-Session-ID')) {
      console.log(`   X-Session-ID: ${req.get('X-Session-ID')}`);
    }
    if (req.get('X-Conversation-ID')) {
      console.log(`   X-Conversation-ID: ${req.get('X-Conversation-ID')}`);
    }
    
    // 打印完整的请求体
    console.log(`📦 原始请求体:`);
    console.log(JSON.stringify(req.body, null, 2));
    
    try {
      const {
        model,
        messages,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty,
        stop,
        stream,
        user,
        // OpenAI 会话 ID 支持
        session_id,
        openai_session_id,
        conversation_id,
        ...otherOptions
      } = req.body;      // 验证必需参数
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        console.log(`❌ [${requestId}] 参数验证失败: messages 参数无效`);
        return res.status(400).json({
          error: {
            message: 'Messages are required and must be a non-empty array',
            type: 'invalid_request_error',
            code: 'invalid_messages'
          }
        });
      }

      // 验证模型参数
      if (!model) {
        console.log(`❌ [${requestId}] 参数验证失败: model 参数缺失`);
        return res.status(400).json({
          error: {
            message: 'Model parameter is required',
            type: 'invalid_request_error',
            code: 'missing_model'
          }
        });
      }

      // 打印解析后的核心参数
      console.log(`🎯 [${requestId}] 解析后的参数:`);
      console.log(`   模型: ${model}`);
      console.log(`   消息数量: ${messages.length}`);
      console.log(`   流式响应: ${stream ? '是' : '否'}`);
      console.log(`   用户标识: ${user || '未指定'}`);
      console.log(`   会话ID: ${session_id || openai_session_id || conversation_id || '无'}`);
      console.log(`   温度: ${temperature || '默认'}`);
      console.log(`   最大令牌: ${max_tokens || '默认'}`);
      
      // 打印消息详情
      console.log(`💬 [${requestId}] 消息详情:`);
      messages.forEach((msg, index) => {
        const content = typeof msg.content === 'string' 
          ? (msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content)
          : JSON.stringify(msg.content);
        console.log(`   [${index + 1}] ${msg.role}: ${content}`);
      });

      // 根据模型ID获取对应的Dify配置
      const difyConfig = getDifyConfigByModel(model);
      if (!difyConfig) {
        console.log(`❌ [${requestId}] 模型配置未找到: ${model}`);
        return res.status(400).json({
          error: {
            message: `Model '${model}' not found in configuration`,
            type: 'invalid_request_error',
            code: 'model_not_found'
          }
        });      }
      
      console.log(`✅ [${requestId}] 找到模型配置: ${model}`);
      console.log(`🏭 [${requestId}] Dify 应用信息:`);
      console.log(`   应用名称: ${difyConfig.appName}`);
      console.log(`   应用类型: ${difyConfig.appType}`);
      console.log(`   基础URL: ${difyConfig.baseURL}`);
      console.log(`   API Key: ${difyConfig.apiKey.substring(0, 15)}...`);
      console.log(`   支持流式: ${difyConfig.supportsStreaming}`);
      console.log(`   支持阻塞: ${difyConfig.supportsBlocking}`);
      console.log(`   默认模式: ${difyConfig.defaultMode}`);

      // 检查是否需要强制流式模式
      const forceStreaming = !difyConfig.supportsBlocking;
      const useStreaming = forceStreaming || stream;
      
      if (forceStreaming && !stream) {
        console.log(`⚠️ [${requestId}] Agent应用检测到，强制启用流式模式`);
      }

      console.log(`🔧 [${requestId}] 请求处理模式: ${useStreaming ? '流式' : '阻塞'} (客户端请求: ${stream ? '流式' : '阻塞'})`);

      // 创建基于模型映射的 DifyClient
      console.log(`🔨 [${requestId}] 创建 Dify 客户端...`);
      const difyClient = new DifyClient(difyConfig);      // 处理请求
      if (useStreaming && stream) {
        console.log(`🌊 [${requestId}] 开始处理流式请求...`);
        // 客户端明确请求流式响应 - 真正的流式转发
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*'
        });

        // 设置客户端断开连接处理
        let isClientDisconnected = false;
        
        req.on('close', () => {
          isClientDisconnected = true;
          console.log(`🔌 [${requestId}] 客户端断开连接，终止流式响应`);
        });
        
        req.on('aborted', () => {
          isClientDisconnected = true;
          console.log(`⚡ [${requestId}] 客户端中止请求，终止流式响应`);
        });
        
        res.on('close', () => {
          isClientDisconnected = true;
          console.log(`📡 [${requestId}] 响应连接关闭，终止流式响应`);
        });

        try {
          console.log(`📡 [${requestId}] 开始流式转发到 Dify...`);
          // 直接处理流式请求而不等待完整响应
          await difyClient.handleStreamingRequestWithForward(messages, {
            model: model,
            temperature,
            max_tokens,
            top_p,
            user,
            messages,
            stream: true,
            userKey: req.apiKey, // 使用 API Key 作为用户标识
            // OpenAI 会话 ID 支持
            session_id,
            openai_session_id,
            conversation_id,
            // 传递断开连接检查函数
            isClientDisconnected: () => isClientDisconnected,
            ...otherOptions
          }, res);
          
          const duration = Date.now() - startTime;
          if (!isClientDisconnected) {
            console.log(`✅ [${requestId}] 流式请求处理完成 (耗时: ${duration}ms)`);
          } else {
            console.log(`🔌 [${requestId}] 流式请求因客户端断开而终止 (耗时: ${duration}ms)`);
          }

        } catch (error) {
          const duration = Date.now() - startTime;
          console.error(`❌ [${requestId}] 流式处理失败 (耗时: ${duration}ms):`, error.message);
          console.error(`💥 [${requestId}] 错误堆栈:`, error.stack);
            // 发送错误流式响应（仅在客户端未断开时）
          if (!isClientDisconnected) {
            const errorData = {
              id: 'chatcmpl-' + Date.now(),
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: model,
              choices: [{
                index: 0,
                delta: {},
                finish_reason: 'stop'
              }],
              error: {
                message: error.message,
                type: 'server_error'
              }
            };
            res.write(`data: ${JSON.stringify(errorData)}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          }
        }
      } else {
        console.log(`📋 [${requestId}] 开始处理阻塞式请求...`);
        // 非流式响应或强制流式但客户端期望非流式
        try {
          console.log(`📤 [${requestId}] 发送请求到 Dify API...`);
          const response = await difyClient.chatCompletions(messages, {
            model: model,
            temperature,
            max_tokens,
            top_p,
            user,
            messages,
            stream: false, // DifyClient 内部会处理强制流式的情况
            userKey: req.apiKey, // 使用 API Key 作为用户标识
            // OpenAI 会话 ID 支持
            session_id,
            openai_session_id,
            conversation_id,
            ...otherOptions
          });

          const duration = Date.now() - startTime;
          console.log(`✅ [${requestId}] 阻塞式请求处理完成 (耗时: ${duration}ms)`);
          console.log(`📊 [${requestId}] 响应统计:`);
          console.log(`   响应ID: ${response.id}`);
          console.log(`   模型: ${response.model}`);
          console.log(`   完成原因: ${response.choices?.[0]?.finish_reason || '未知'}`);
          if (response.usage) {
            console.log(`   令牌使用: 输入${response.usage.prompt_tokens} + 输出${response.usage.completion_tokens} = 总计${response.usage.total_tokens}`);
          }
          
          const responseContent = response.choices?.[0]?.message?.content || '';
          const contentPreview = responseContent.length > 100 
            ? responseContent.substring(0, 100) + '...' 
            : responseContent;
          console.log(`💬 [${requestId}] 响应内容预览: ${contentPreview}`);

          res.json(response);
        } catch (error) {
          const duration = Date.now() - startTime;
          console.error(`❌ [${requestId}] 阻塞式处理失败 (耗时: ${duration}ms):`, error.message);
          console.error(`💥 [${requestId}] 错误堆栈:`, error.stack);
          
          if (error.response && error.response.data) {
            console.error(`🔍 [${requestId}] Dify 错误响应:`, JSON.stringify(error.response.data, null, 2));
            
            // 如果是 Agent Chat App 不支持阻塞模式的错误，提供有用的错误信息
            if (error.response.data.code === 'invalid_param' && 
                error.response.data.message.includes('Agent Chat App does not support blocking mode')) {
              console.log(`⚠️ [${requestId}] Agent应用不支持阻塞模式，建议客户端使用流式请求`);
              return res.status(400).json({
                error: {
                  message: `Model '${model}' is an Agent Chat App that only supports streaming mode. Please set "stream": true in your request.`,
                  type: 'invalid_request_error',
                  code: 'streaming_required',
                  details: {
                    model: model,
                    app_type: difyConfig.appType,
                    supports_streaming: difyConfig.supportsStreaming,
                    supports_blocking: difyConfig.supportsBlocking,
                    suggestion: 'Add "stream": true to your request body'
                  }
                }
              });
            }
          }          throw error;
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`💀 [${requestId}] 请求处理发生未捕获错误 (耗时: ${duration}ms):`, error.message);
      console.error(`🔴 [${requestId}] 完整错误信息:`, error);
      console.log(`🔚 [${requestId}] ==================== 请求处理结束 ====================\n`);
      next(error);
    }
  });

  return router;
}

module.exports = {
  createChatRouter
};
