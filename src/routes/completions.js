const express = require('express');
const DifyClient = require('../services/difyClient');
const { getAllModels, getDifyConfigByModel } = require('../middleware/auth');

function createCompletionsRouter() {
  const router = express.Router();
  router.post('/', async (req, res, next) => {
    const requestId = `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 打印原始请求详情
    console.log(`\n🟡 [${requestId}] ==================== 收到补全请求 ====================`);
    console.log(`📅 时间: ${new Date().toISOString()}`);
    console.log(`🌐 来源IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`🔑 API Key: ${req.get('Authorization')?.substring(0, 20)}...`);
    console.log(`📦 请求体:`, JSON.stringify(req.body, null, 2));
    
    try {
      const {
        model,
        prompt,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty,
        stop,
        stream,
        user,
        ...otherOptions
      } = req.body;

      // 验证必需参数
      if (!prompt) {
        console.log(`❌ [${requestId}] 参数验证失败: prompt 参数缺失`);
        return res.status(400).json({
          error: {
            message: 'Prompt is required',
            type: 'invalid_request_error',
            code: 'invalid_prompt'
          }        });
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

      // 打印解析后的参数
      console.log(`🎯 [${requestId}] 解析后的参数:`);
      console.log(`   模型: ${model}`);
      console.log(`   提示词长度: ${typeof prompt === 'string' ? prompt.length : JSON.stringify(prompt).length} 字符`);
      console.log(`   流式响应: ${stream ? '是' : '否'}`);
      console.log(`   温度: ${temperature || '默认'}`);
      console.log(`   最大令牌: ${max_tokens || '默认'}`);

      // 根据模型获取 Dify 配置
      const difyConfig = getDifyConfigByModel(model);
      if (!difyConfig) {
        console.log(`❌ [${requestId}] 模型配置未找到: ${model}`);
        return res.status(400).json({
          error: {
            message: `Model '${model}' not found in configuration`,
            type: 'invalid_request_error',
            code: 'model_not_found'
          }
        });
      }

      console.log(`✅ [${requestId}] 找到模型配置: ${model} → ${difyConfig.appName}`);

      // 创建基于模型配置的 DifyClient
      console.log(`🔨 [${requestId}] 创建 Dify 客户端...`);
      const difyClient = new DifyClient(difyConfig);      // 如果启用流式响应
      if (stream) {
        console.log(`🌊 [${requestId}] 处理流式补全请求...`);
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*'
        });

        try {
          console.log(`📤 [${requestId}] 发送请求到 Dify API...`);
          // 模拟流式响应
          const response = await difyClient.completions(prompt, {
            model: model,
            temperature,
            max_tokens,
            top_p,
            user,
            prompt,
            ...otherOptions
          });

          const duration = Date.now() - startTime;
          console.log(`✅ [${requestId}] 收到 Dify 响应 (耗时: ${duration}ms)`);

          const streamData = {
            id: response.id,
            object: 'text_completion',
            created: response.created,
            model: response.model,
            choices: [{
              text: response.choices[0].text,
              index: 0,
              logprobs: null,
              finish_reason: null
            }]
          };          res.write(`data: ${JSON.stringify(streamData)}\n\n`);
          
          // 发送结束标记
          const endData = {
            id: response.id,
            object: 'text_completion',
            created: response.created,
            model: response.model,
            choices: [{
              text: '',
              index: 0,
              logprobs: null,
              finish_reason: 'stop'
            }]
          };

          res.write(`data: ${JSON.stringify(endData)}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          
          console.log(`✅ [${requestId}] 流式补全请求处理完成`);
        } catch (error) {
          const duration = Date.now() - startTime;
          console.error(`❌ [${requestId}] 流式补全处理失败 (耗时: ${duration}ms):`, error.message);
          res.write(`data: {"error": {"message": "${error.message}"}}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      } else {
        console.log(`📋 [${requestId}] 处理阻塞式补全请求...`);        const response = await difyClient.completions(prompt, {
          model: model,
          temperature,
          max_tokens,
          top_p,
          user,
          prompt,
          ...otherOptions
        });

        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] 阻塞式补全请求处理完成 (耗时: ${duration}ms)`);
        console.log(`📊 [${requestId}] 响应统计:`);
        console.log(`   响应ID: ${response.id}`);
        console.log(`   模型: ${response.model}`);
        if (response.usage) {
          console.log(`   令牌使用: 输入${response.usage.prompt_tokens} + 输出${response.usage.completion_tokens} = 总计${response.usage.total_tokens}`);
        }
        
        const completionText = response.choices?.[0]?.text || '';
        const textPreview = completionText.length > 100 
          ? completionText.substring(0, 100) + '...' 
          : completionText;
        console.log(`💬 [${requestId}] 补全内容预览: ${textPreview}`);

        res.json(response);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`💀 [${requestId}] 补全请求处理发生未捕获错误 (耗时: ${duration}ms):`, error.message);
      console.error(`🔴 [${requestId}] 完整错误信息:`, error);
      console.log(`🔚 [${requestId}] ==================== 补全请求处理结束 ====================\n`);
      next(error);
    }
  });

  return router;
}

module.exports = {
  createCompletionsRouter
};
