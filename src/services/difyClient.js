const axios = require('axios');
const conversationManager = require('./conversationManager');

class DifyClient {  constructor(config = null) {
    // 如果没有提供配置，从config.json加载默认配置
    if (!config) {
      const fs = require('fs');
      const path = require('path');
      try {
        const configPath = path.join(__dirname, '../../config.json');
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const defaultConfig = configData.default_dify_config;
        
        config = {
          baseURL: defaultConfig?.base_url,
          apiKey: defaultConfig?.api_key,
          appName: defaultConfig?.app_name || 'Default App'
        };
      } catch (error) {
        console.warn('[DifyClient] Failed to load default config from config.json:', error.message);
        throw new Error('No configuration provided and failed to load default config');
      }
    }
    
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.modelId = config.modelId || null;
    this.appName = config.appName || 'Default App';
    
    // 应用类型和模式配置
    this.appType = config.appType || 'chatbot';
    this.supportsStreaming = config.supportsStreaming !== false;
    this.supportsBlocking = config.supportsBlocking !== false;
    this.defaultMode = config.defaultMode || 'blocking';
    
    console.log(`[${this.appName}] Initializing DifyClient with:`);
    console.log(`[${this.appName}]   baseURL: ${this.baseURL}`);
    console.log(`[${this.appName}]   apiKey: ${this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'NOT_SET'}`);
    console.log(`[${this.appName}]   modelId: ${this.modelId}`);
    console.log(`[${this.appName}]   appType: ${this.appType}`);
    console.log(`[${this.appName}]   supportsStreaming: ${this.supportsStreaming}`);
    console.log(`[${this.appName}]   supportsBlocking: ${this.supportsBlocking}`);
    console.log(`[${this.appName}]   defaultMode: ${this.defaultMode}`);
    
    // 验证配置
    if (!this.baseURL || !this.apiKey) {
      throw new Error('Base URL and API Key are required');
    }
      // 确保 baseURL 格式正确
    let validBaseURL = this.baseURL;
    if (!validBaseURL.startsWith('http://') && !validBaseURL.startsWith('https://')) {
      validBaseURL = 'http://' + validBaseURL;
    }
    
    // 确保末尾没有斜杠
    validBaseURL = validBaseURL.replace(/\/$/, '');
    
    this.client = axios.create({
      baseURL: validBaseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
      console.log(`[${this.appName}] DifyClient configured with final baseURL: ${validBaseURL}`);
    console.log(`[${this.appName}] Using Dify API Key: ${this.apiKey ? this.apiKey.substring(0, 15) + '...' : 'NOT_SET'}`);
    
    // 验证应用配置
    this.validateAppConfig();
    
    // 检查应用配置是否正确
    this.validateAppConfig();
  }
  // 创建基于请求配置的客户端实例（保持向后兼容）
  static fromRequest(req) {
    console.warn('[DifyClient] fromRequest is deprecated, use constructor directly');
    if (req.difyConfig) {
      return new DifyClient({
        baseURL: req.difyConfig.baseURL,
        apiKey: req.difyConfig.apiKey,
        modelId: req.difyConfig.modelId,
        appName: req.difyConfig.appName
      });
    }
    return new DifyClient();
  }  async chatCompletions(messages, options = {}) {
    try {
      // 如果有指定的模型ID，使用它；否则使用传入的模型
      const modelId = this.modelId || options.model || 'dify-chat-model';
      
      // 检查是否需要强制使用流式模式
      const forceStreaming = !this.supportsBlocking;
      const useStreaming = forceStreaming || options.stream;
      
      if (forceStreaming && !options.stream) {
        console.log(`[${this.appName}] Agent Chat App detected, forcing streaming mode`);
      }
      
      // 处理多模态内容（图像）
      let processedFiles = [];
      const userIdentifier = options.user || options.userKey || 'user';
        // 检查是否有多模态内容需要处理
      const hasMultimodalContent = messages.some(msg => 
        msg.role === 'user' && Array.isArray(msg.content) && 
        msg.content.some(part => part.type === 'image_url')
      );
      
      if (hasMultimodalContent) {
        console.log(`[${this.appName}] 检测到多模态内容，处理图像...`);
        try {
          processedFiles = await this.processMultimodalImages(messages, userIdentifier);
        } catch (imageError) {
          console.warn(`[${this.appName}] 图像处理失败，继续文本对话: ${imageError.message}`);
        }
      }
      
      // 转换 OpenAI 格式到 Dify 格式
      const difyPayload = this.convertOpenAIToDifyChat(messages, { 
        ...options, 
        model: modelId,
        stream: useStreaming,
        processedFiles: processedFiles  // 传递处理后的文件列表
      });
        console.log(`[${this.appName}] Sending chat request to Dify...`);
      console.log(`[${this.appName}] Request URL: ${this.client.defaults.baseURL}/v1/chat-messages`);
      console.log(`[${this.appName}] Using ${useStreaming ? 'streaming' : 'blocking'} mode`);
      console.log(`[${this.appName}] Request payload:`, JSON.stringify(difyPayload, null, 2));
      
      // 验证请求内容是否异常
      if (difyPayload.query && difyPayload.query.includes('### Task:')) {
        console.error(`[${this.appName}] 🚨 检测到异常请求！用户消息被转换成了任务指令`);
        console.error(`[${this.appName}] 原始消息长度: ${JSON.stringify(messages).length}`);
        console.error(`[${this.appName}] 转换后查询长度: ${difyPayload.query.length}`);
        console.error(`[${this.appName}] 这可能表明 Dify 应用配置了不当的提示词模板`);
      }
      
      if (useStreaming) {
        // 检查是否有 responseStream 参数，如果有，说明需要直接转发流
        if (options.responseStream) {
          console.log(`[${this.appName}] Using direct stream forwarding mode`);
          throw new Error('Use handleStreamingRequestWithForward for direct streaming');
        } else {
          // 正常的流式处理（等待完整响应）
          return await this.handleStreamingRequest(difyPayload, { ...options, model: modelId });
        }
      } else {
        // 使用正确的 Dify API 端点
        const response = await this.client.post('/v1/chat-messages', difyPayload);
        
        // 转换 Dify 响应到 OpenAI 格式
        return this.convertDifyToOpenAIChat(response.data, { ...options, model: modelId });
      }
    } catch (error) {
      console.error(`[${this.appName}] Dify chat completions error:`, error.message);
      if (error.response) {
        console.error(`[${this.appName}] Response status:`, error.response.status);
        console.error(`[${this.appName}] Response data:`, error.response.data);
      }
      throw error;
    }
  }
  async completions(prompt, options = {}) {
    try {
      // 如果有指定的模型ID，使用它；否则使用传入的模型
      const modelId = this.modelId || options.model || 'dify-completion-model';
      
      // 转换 OpenAI 格式到 Dify 格式
      const difyPayload = this.convertOpenAIToDifyCompletion(prompt, { ...options, model: modelId });
      
      console.log(`[${this.appName}] Sending completion request to Dify...`);
      const response = await this.client.post('/v1/completion-messages', difyPayload);
      
      // 转换 Dify 响应到 OpenAI 格式
      return this.convertDifyToOpenAICompletion(response.data, { ...options, model: modelId });
    } catch (error) {
      console.error(`[${this.appName}] Dify completions error:`, error.message);
      if (error.response) {
        console.error(`[${this.appName}] Response status:`, error.response.status);
        console.error(`[${this.appName}] Response data:`, error.response.data);
      }
      throw error;
    }
  }

  async healthCheck() {
    try {
      // 尝试调用 Dify API 检查健康状态
      const response = await this.client.get('/');
      console.log(`[${this.appName}] Health check passed`);
      return true;
    } catch (error) {
      console.error(`[${this.appName}] Health check failed:`, error.message);
      return false;
    }
  }  convertOpenAIToDifyChat(messages, options) {
    // 提取最后一条用户消息作为查询
    const userMessages = messages.filter(msg => msg.role === 'user');
    
    // 处理多模态内容（文本 + 图片）
    let query = '';
    let files = [];
    
    if (userMessages.length > 0) {
      const lastMessage = userMessages[userMessages.length - 1];
      
      if (typeof lastMessage.content === 'string') {
        // 简单文本消息
        query = lastMessage.content;
      } else if (Array.isArray(lastMessage.content)) {
        // 多模态内容（文本 + 图片）
        const textParts = [];
        
        for (const part of lastMessage.content) {
          if (part.type === 'text') {
            textParts.push(part.text);
          } else if (part.type === 'image_url') {
            // 处理 base64 图片，需要上传到 Dify
            console.log(`[${this.appName}] Detected image_url content, will process separately`);
            // 标记需要处理图片
            if (!options._processedImages) {
              options._processedImages = [];
            }
            options._processedImages.push(part.image_url);
          }
        }
        
        query = textParts.join(' ');
      }
    }
    
    // 如果 options 中已经有处理好的文件列表，使用它们
    if (options.processedFiles && options.processedFiles.length > 0) {
      files = options.processedFiles;
    }
      // 智能会话管理：基于消息数量和用户标识自动决定是否创建新会话
    let conversationId = options.conversation_id || '';
    
    if (!conversationId && options.userKey) {
      // 优先使用 user 参数，回退到 API Key
      const userIdentifier = options.user || options.userKey;
      const modelId = this.modelId || options.model || 'default';
      const customSessionId = options['X-Session-ID'] || options['X-Conversation-ID'];
      
      // 判断是否应该创建新会话（核心逻辑：单条消息创建新会话）
      const shouldCreateNew = conversationManager.shouldCreateNewSession(
        messages,
        userIdentifier, 
        modelId,
        customSessionId
      );
      
      if (!shouldCreateNew) {
        // 尝试获取现有会话
        conversationId = conversationManager.getExistingConversation(
          userIdentifier,
          modelId,
          customSessionId
        ) || '';
      }
      // 如果 shouldCreateNew = true，则保持 conversationId 为空，让 Dify 创建新会话
    }
    
    console.log(`[${this.appName}] Messages count: ${messages?.length || 0}`);
    console.log(`[${this.appName}] Using conversation_id: ${conversationId || 'none (new conversation)'}`);
    if (options.user) {
      console.log(`[${this.appName}] User identifier: ${options.user}`);
    }
      // 确保 user 参数一致性：优先使用 user 参数，回退到 userKey
    const userIdentifier = options.user || options.userKey || 'user';
    
    const payload = {
      inputs: {},
      query: query,
      response_mode: options.stream ? 'streaming' : 'blocking',
      user: userIdentifier
    };
    
    // 只有当 conversation_id 不为空时才包含在请求中
    if (conversationId) {
      payload.conversation_id = conversationId;
    }
    
    // 如果有文件，添加到 payload 中
    if (files.length > 0) {
      payload.files = files;
      console.log(`[${this.appName}] Added ${files.length} files to payload`);
    }
    
    return payload;
  }

  convertOpenAIToDifyCompletion(prompt, options) {
    return {
      inputs: {},
      query: prompt,
      response_mode: options.stream ? 'streaming' : 'blocking',
      user: options.user || 'user'
    };
  }
  convertDifyToOpenAIChat(difyResponse, options) {
    const model = options.model || this.modelId || 'dify-chat-model';    // 保存 conversation_id 到会话管理器（如果存在）
    if (difyResponse.conversation_id && options.userKey) {
      const userIdentifier = options.user || options.userKey;
      const modelId = options.model || this.modelId || 'default';
      const customSessionId = options['X-Session-ID'] || options['X-Conversation-ID'];
      
      conversationManager.saveConversation(userIdentifier, modelId, difyResponse.conversation_id, customSessionId);
      console.log(`[${this.appName}] Saved conversation_id: ${difyResponse.conversation_id} for user: ${userIdentifier}, model: ${modelId}`);
    }
    
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: difyResponse.answer || difyResponse.data?.answer || ''
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: this.estimateTokens(options.messages || []),
        completion_tokens: this.estimateTokens(difyResponse.answer || ''),
        total_tokens: 0
      }
    };
  }

  convertDifyToOpenAICompletion(difyResponse, options) {
    const model = options.model || this.modelId || 'dify-completion-model';
    
    return {
      id: `cmpl-${Date.now()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        text: difyResponse.answer || difyResponse.data?.answer || '',
        index: 0,
        logprobs: null,
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: this.estimateTokens(options.prompt || ''),
        completion_tokens: this.estimateTokens(difyResponse.answer || ''),
        total_tokens: 0
      }
    };
  }

  estimateTokens(text) {
    if (Array.isArray(text)) {
      return text.reduce((total, msg) => total + this.estimateTokens(msg.content || ''), 0);
    }
    // 简单的 token 估算：大约 4 个字符 = 1 个 token
    return Math.ceil((text || '').length / 4);
  }  
  // 处理流式请求
  async handleStreamingRequest(difyPayload, options = {}) {
    try {
      console.log(`[${this.appName}] Handling streaming request...`);
      
      // 使用流式响应
      const response = await this.client.post('/v1/chat-messages', difyPayload, {
        responseType: 'stream'
      });
      
      // 处理流式响应并转换为 OpenAI 格式
      return this.processStreamResponse(response, options);
      
    } catch (error) {
      console.error(`[${this.appName}] Streaming request error:`, error.message);
      if (error.response) {
        console.error(`[${this.appName}] Response status:`, error.response.status);
        console.error(`[${this.appName}] Response data:`, error.response.data);
      }
      throw error;
    }
  }  // 处理流式响应 - 适配 Dify 和 OpenAI 格式
  async processStreamResponse(response, options = {}) {
    return new Promise((resolve, reject) => {
      let fullContent = '';
      let messageId = null;
      let conversationId = null;
      let taskId = null;
      const chatId = 'chatcmpl-' + Date.now();
      const created = Math.floor(Date.now() / 1000);
      let buffer = ''; // 添加缓冲区处理不完整的 JSON
      
      console.log(`[${this.appName}] Starting stream processing...`);
      
      response.data.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        buffer += chunkStr; // 累积数据到缓冲区
        const lines = buffer.split('\n');
        
        // 保留最后一行（可能不完整），处理前面的完整行
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              
              const data = JSON.parse(jsonStr);
              console.log(`[${this.appName}] Received event: ${data.event}`);
              
              switch (data.event) {
                case 'message':
                case 'agent_message':
                  // 普通消息或 Agent 消息
                  messageId = data.message_id;
                  conversationId = data.conversation_id;
                  taskId = data.task_id;
                  fullContent += data.answer || '';
                  console.log(`[${this.appName}] Message chunk: "${data.answer}"`);
                  break;
                  
                case 'agent_thought':
                  // Agent 思考过程（可选择是否包含）
                  console.log(`[${this.appName}] Agent thought: ${data.thought}`);
                  if (data.tool) {
                    console.log(`[${this.appName}] Tool used: ${data.tool}`);
                  }
                  break;
                  
                case 'message_file':
                  // 文件事件（暂时忽略）
                  console.log(`[${this.appName}] File event: ${data.type} - ${data.url}`);
                  break;
                  
                // 新增：处理工作流相关事件
                case 'workflow_started':
                  console.log(`[${this.appName}] Workflow started: ${data.workflow_run_id}`);
                  break;
                  
                case 'workflow_finished':
                  console.log(`[${this.appName}] Workflow finished: ${data.workflow_run_id}`);
                  break;
                  
                case 'node_started':
                  console.log(`[${this.appName}] Node started: ${data.data?.title || data.data?.node_id} (${data.data?.node_type})`);
                  break;
                  
                case 'node_finished':
                  console.log(`[${this.appName}] Node finished: ${data.data?.title || data.data?.node_id} (${data.data?.node_type})`);
                  // 检查是否有输出内容需要收集
                  if (data.data?.outputs && typeof data.data.outputs === 'object') {
                    // 尝试从 outputs 中提取文本内容
                    const outputText = this.extractTextFromOutputs(data.data.outputs);
                    if (outputText) {
                      fullContent += outputText;
                      console.log(`[${this.appName}] Extracted content from node: "${outputText.substring(0, 100)}..."`);
                    }
                  }
                  break;                case 'message_end':
                  // 消息结束
                  console.log(`[${this.appName}] Stream ended with content: ${fullContent.substring(0, 100)}${fullContent.length > 100 ? '...' : ''}`);
                  
                  // 保存 conversation_id 到会话管理器
                  if (conversationId && options.userKey) {
                    const modelId = options.model || this.modelId || 'default';
                    const openaiSessionId = options.openai_session_id || options.session_id;
                    conversationManager.saveConversation(options.userKey, modelId, conversationId, openaiSessionId);
                    console.log(`[${this.appName}] Saved conversation_id: ${conversationId} for user: ${options.userKey}, model: ${modelId}`);
                    if (openaiSessionId) {
                      console.log(`[${this.appName}] Created OpenAI session mapping: ${openaiSessionId} -> ${conversationId.substring(0, 8)}...`);
                    }
                  }
                  
                  const usage = data.metadata?.usage || {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                  };
                  
                  const finalResponse = {
                    id: chatId,
                    object: 'chat.completion',
                    created: created,
                    model: options.model || this.modelId || 'dify-model',
                    choices: [{
                      index: 0,
                      message: {
                        role: 'assistant',
                        content: fullContent
                      },
                      finish_reason: 'stop'
                    }],
                    usage: {
                      prompt_tokens: usage.prompt_tokens || 0,
                      completion_tokens: usage.completion_tokens || 0,
                      total_tokens: usage.total_tokens || 0
                    }
                  };
                  
                  resolve(finalResponse);
                  return;
                  
                case 'message_replace':
                  // 内容替换（审查）
                  console.log(`[${this.appName}] Content replaced by moderation`);
                  fullContent = data.answer;
                  break;
                  
                case 'error':
                  console.error(`[${this.appName}] Stream error event:`, data);
                  reject(new Error(`Dify stream error: ${data.message} (${data.code})`));
                  return;
                  
                case 'ping':
                  // 保持连接的 ping 事件
                  console.log(`[${this.appName}] Received ping`);
                  break;
                  
                case 'tts_message':
                case 'tts_message_end':
                  // TTS 音频事件（暂时忽略）
                  console.log(`[${this.appName}] TTS event: ${data.event}`);
                  break;
                  
                default:
                  console.log(`[${this.appName}] Unknown/Unhandled event: ${data.event}`);
              }
              
            } catch (parseError) {
              // 改进错误日志，显示更多上下文信息
              const trimmedLine = line.trim();
              if (trimmedLine.length > 200) {
                console.warn(`[${this.appName}] Failed to parse large stream data (${trimmedLine.length} chars): ${trimmedLine.substring(0, 100)}...${trimmedLine.substring(trimmedLine.length - 50)}`);
              } else {
                console.warn(`[${this.appName}] Failed to parse stream data: ${trimmedLine}`);
              }
              console.warn(`[${this.appName}] Parse error:`, parseError.message);
            }
          }
        }
      });
      
      response.data.on('end', () => {
        console.log(`[${this.appName}] Stream ended`);
        
        // 处理缓冲区中剩余的数据
        if (buffer.trim()) {
          console.log(`[${this.appName}] Processing remaining buffer data: ${buffer.substring(0, 100)}...`);
          if (buffer.trim().startsWith('data: ')) {
            try {
              const jsonStr = buffer.slice(6).trim();
              if (jsonStr) {
                const data = JSON.parse(jsonStr);
                console.log(`[${this.appName}] Final buffer event: ${data.event}`);
                // 根据需要处理最后的事件
              }
            } catch (parseError) {
              console.warn(`[${this.appName}] Failed to parse final buffer data:`, parseError.message);
            }
          }
        }
        
        if (!messageId && fullContent) {
          // 如果没有收到 message_end 事件，但有内容，创建默认响应
          const finalResponse = {
            id: chatId,
            object: 'chat.completion',
            created: created,
            model: options.model || this.modelId || 'dify-model',
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: fullContent
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          };
          
          console.log(`[${this.appName}] Stream ended without message_end event, using fallback response`);
          resolve(finalResponse);
        } else if (!messageId) {
          // 完全没有收到消息
          reject(new Error('No message received from Dify stream'));
        }
      });
      
      response.data.on('error', (error) => {
        console.error(`[${this.appName}] Stream connection error:`, error);
        reject(error);
      });
    });
  }  // 处理流式请求并转发 - 真正的流式响应
  async handleStreamingRequestWithForward(messages, options = {}, res) {
    try {
      console.log(`[${this.appName}] Handling streaming request with real-time forwarding...`);
      
      // 如果有指定的模型ID，使用它；否则使用传入的模型
      const modelId = this.modelId || options.model || 'dify-chat-model';
      
      // 处理多模态内容（图像）
      let processedFiles = [];
      const userIdentifier = options.user || options.userKey || 'user';
      
      // 检查是否有多模态内容需要处理
      const hasMultimodalContent = messages.some(msg => 
        msg.role === 'user' && Array.isArray(msg.content) && 
        msg.content.some(part => part.type === 'image_url')
      );
      
      if (hasMultimodalContent) {
        console.log(`[${this.appName}] Detected multimodal content in streaming request, processing images...`);
        processedFiles = await this.processMultimodalImages(messages, userIdentifier);
      }
      
      // 转换 OpenAI 格式到 Dify 格式
      const difyPayload = this.convertOpenAIToDifyChat(messages, { 
        ...options, 
        model: modelId,
        stream: true,
        processedFiles: processedFiles  // 传递处理后的文件列表
      });
      
      console.log(`[${this.appName}] Sending streaming request to Dify...`);
      console.log(`[${this.appName}] Request URL: ${this.client.defaults.baseURL}/v1/chat-messages`);
      console.log(`[${this.appName}] Request payload:`, JSON.stringify(difyPayload, null, 2));
      
      // 发起流式请求
      const response = await this.client.post('/v1/chat-messages', difyPayload, {
        responseType: 'stream'
      });
        let messageContent = '';
      let messageId = null;
      let conversationId = null;
      let taskId = null; // 添加 taskId 变量来存储 Dify 的 task_id
      let chatId = 'chatcmpl-' + Date.now(); // 初始默认 ID，将被 taskId 替换
      const created = Math.floor(Date.now() / 1000);
      let hasStarted = false;
      let buffer = ''; // 添加缓冲区处理不完整的 JSON
      
      console.log(`[${this.appName}] Starting real-time stream forwarding...`);
        response.data.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        buffer += chunkStr; // 累积数据到缓冲区
        const lines = buffer.split('\n');
        
        // 保留最后一行（可能不完整），处理前面的完整行
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              
              const data = JSON.parse(jsonStr);
                switch (data.event) {
                case 'message':
                case 'agent_message':
                  messageId = data.message_id;
                  conversationId = data.conversation_id;
                  taskId = data.task_id; // 捕获 task_id
                  messageContent += data.answer || '';
                  
                  // 如果获得了 task_id，更新 chatId 为实际的 task_id
                  if (taskId && chatId.startsWith('chatcmpl-')) {
                    chatId = taskId;
                    console.log(`[${this.appName}] Using Dify task_id as response ID: ${taskId}`);
                  }
                  
                  // 发送 OpenAI 格式的流式响应
                  if (!hasStarted) {
                    // 第一个 chunk 包含角色信息
                    const startChunk = {
                      id: chatId,
                      object: 'chat.completion.chunk',
                      created: created,
                      model: modelId,
                      choices: [{
                        index: 0,
                        delta: {
                          role: 'assistant',
                          content: data.answer || ''
                        },
                        finish_reason: null
                      }]
                    };
                    res.write(`data: ${JSON.stringify(startChunk)}\n\n`);
                    hasStarted = true;
                  } else {
                    // 后续 chunk 只包含内容
                    const contentChunk = {
                      id: chatId,
                      object: 'chat.completion.chunk',
                      created: created,
                      model: modelId,
                      choices: [{
                        index: 0,
                        delta: {
                          content: data.answer || ''
                        },
                        finish_reason: null
                      }]
                    };
                    res.write(`data: ${JSON.stringify(contentChunk)}\n\n`);
                  }
                  
                  // console.log(`[${this.appName}] Forwarded chunk: "${data.answer}"`);
                  break;
                  
                case 'agent_thought':
                  // Agent 思考过程 - 可选择是否转发
                  // console.log(`[${this.appName}] Agent thought: ${data.thought}`);
                  break;
                  
                // 新增：处理工作流相关事件
                case 'workflow_started':
                  // console.log(`[${this.appName}] Workflow started: ${data.workflow_run_id}`);
                  break;
                  
                case 'workflow_finished':
                  // console.log(`[${this.appName}] Workflow finished: ${data.workflow_run_id}`);
                  break;
                  
                case 'node_started':
                  console.log(`[${this.appName}] Node started: ${data.data?.title || data.data?.node_id} (${data.data?.node_type})`);
                  break;
                    case 'node_finished':
                  console.log(`[${this.appName}] Node finished: ${data.data?.title || data.data?.node_id} (${data.data?.node_type})`);
                  // 注意：不再自动转发 node_finished 的输出内容，因为通常 message 事件已经包含了相同内容
                  // 这样可以避免重复发送相同的回答内容
                  if (data.data?.outputs && typeof data.data.outputs === 'object') {
                    const outputText = this.extractTextFromOutputs(data.data.outputs);
                    if (outputText) {
                      // 只记录但不发送，避免与 message 事件重复
                      console.log(`[${this.appName}] Node output (not forwarded to avoid duplication): "${outputText.substring(0, 100)}..."`);
                    }}
                  break;
                    case 'message_end':
                  console.log(`[${this.appName}] Stream completed, total content: ${messageContent.length} chars`);
                  
                  // 保存 conversation_id 到会话管理器
                  if (conversationId && options.userKey) {
                    const modelId = options.model || this.modelId || 'default';
                    const openaiSessionId = options.openai_session_id || options.session_id;
                    conversationManager.saveConversation(options.userKey, modelId, conversationId, openaiSessionId);
                    console.log(`[${this.appName}] Saved conversation_id: ${conversationId} for user: ${options.userKey}, model: ${modelId}`);
                    if (openaiSessionId) {
                      console.log(`[${this.appName}] Created OpenAI session mapping: ${openaiSessionId} -> ${conversationId.substring(0, 8)}...`);
                    }
                  }
                  
                  // 发送结束 chunk
                  const endChunk = {
                    id: chatId,
                    object: 'chat.completion.chunk',
                    created: created,
                    model: modelId,
                    choices: [{
                      index: 0,
                      delta: {},
                      finish_reason: 'stop'
                    }]
                  };
                  
                  // 如果有使用信息，包含在最后的 chunk 中
                  if (data.metadata?.usage) {
                    endChunk.usage = {
                      prompt_tokens: data.metadata.usage.prompt_tokens || 0,
                      completion_tokens: data.metadata.usage.completion_tokens || 0,
                      total_tokens: data.metadata.usage.total_tokens || 0
                    };
                  }
                  
                  res.write(`data: ${JSON.stringify(endChunk)}\n\n`);
                  res.write('data: [DONE]\n\n');
                  res.end();
                  return;
                  
                case 'message_replace':
                  console.log(`[${this.appName}] Content replaced by moderation`);
                  // 清空之前的内容，发送替换内容
                  messageContent = data.answer;
                  const replaceChunk = {
                    id: chatId,
                    object: 'chat.completion.chunk',
                    created: created,
                    model: modelId,
                    choices: [{
                      index: 0,
                      delta: {
                        content: data.answer
                      },
                      finish_reason: null
                    }]
                  };
                  res.write(`data: ${JSON.stringify(replaceChunk)}\n\n`);
                  break;
                  
                case 'error':
                  console.error(`[${this.appName}] Dify stream error:`, data);
                  const errorChunk = {
                    id: chatId,
                    object: 'chat.completion.chunk',
                    created: created,
                    model: modelId,
                    choices: [{
                      index: 0,
                      delta: {},
                      finish_reason: 'stop'
                    }],
                    error: {
                      message: data.message,
                      type: 'server_error',
                      code: data.code
                    }
                  };
                  res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
                  res.write('data: [DONE]\n\n');
                  res.end();
                  return;
                  
                case 'ping':
                  // 保持连接的 ping - 不转发给客户端
                  console.log(`[${this.appName}] Received ping`);
                  break;
                  
                default:
                  console.log(`[${this.appName}] Other event: ${data.event}`);
              }
              
            } catch (parseError) {
              // 改进错误日志
              const trimmedLine = line.trim();
              if (trimmedLine.length > 200) {
                console.warn(`[${this.appName}] Failed to parse large stream data (${trimmedLine.length} chars)`);
              } else {
                console.warn(`[${this.appName}] Failed to parse stream data: ${trimmedLine.substring(0, 150)}...`);
              }
            }
          }
        }
      });
      
      response.data.on('end', () => {
        console.log(`[${this.appName}] Dify stream ended`);
        if (!res.headersSent && !res.finished) {
          // 如果还没有发送结束信号，发送一个
          const fallbackEndChunk = {
            id: chatId,
            object: 'chat.completion.chunk',
            created: created,
            model: modelId,
            choices: [{
              index: 0,
              delta: {},
              finish_reason: 'stop'
            }]
          };
          res.write(`data: ${JSON.stringify(fallbackEndChunk)}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      });
      
      response.data.on('error', (error) => {
        console.error(`[${this.appName}] Stream connection error:`, error);
        if (!res.headersSent && !res.finished) {
          const errorChunk = {
            id: chatId,
            object: 'chat.completion.chunk',
            created: created,
            model: modelId,
            choices: [{
              index: 0,
              delta: {},
              finish_reason: 'stop'
            }],
            error: {
              message: error.message,
              type: 'connection_error'
            }
          };
          res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      });
      
    } catch (error) {
      console.error(`[${this.appName}] Streaming request setup error:`, error.message);
      throw error;
    }
  }
  /**
   * 停止流式响应
   * @param {string} taskId - Dify 任务ID 
   * @param {string} user - 用户标识
   * @returns {Promise<object>} 停止结果
   */
  async stopChatMessage(taskId, user) {
    try {
      console.log(`[${this.appName}] Stopping chat message with task_id: ${taskId}`);
      
      // 调用Dify停止API: POST /chat-messages/:task_id/stop
      const response = await this.client.post(`/v1/chat-messages/${taskId}/stop`, {
        user: user
      });
      
      console.log(`[${this.appName}] Stop request successful:`, response.data);
      return response.data;
      
    } catch (error) {
      console.error(`[${this.appName}] Stop request error:`, error.message);
      if (error.response) {
        console.error(`[${this.appName}] Stop response status:`, error.response.status);
        console.error(`[${this.appName}] Stop response data:`, error.response.data);
      }
      throw error;
    }
  }
  /**
   * 上传文件到 Dify
   * @param {Object} file - multer 文件对象
   * @param {string} user - 用户标识
   * @returns {Promise<object>} 上传结果
   */
  async uploadFile(file, user) {
    try {
      console.log(`[${this.appName}] 📤 上传文件: ${file.originalname} (${Math.round(file.size/1024)}KB)`);
      
      // 创建 FormData 用于文件上传
      const FormData = require('form-data');
      const formData = new FormData();
      
      // 添加文件数据
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
      
      // 添加用户标识
      formData.append('user', user);
      
      // 调用 Dify 文件上传 API - 修正API路径
      const response = await this.client.post('/v1/files/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          // 保留原有的认证头
          'Authorization': `Bearer ${this.apiKey}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      console.log(`[${this.appName}] ✅ 文件上传成功: ${response.data.id || response.data.file_id || 'unknown'}`);
      return response.data;
      
    } catch (error) {
      console.error(`[${this.appName}] ❌ 文件上传失败: ${error.message}`);
      if (error.response) {
        console.error(`[${this.appName}]    状态: ${error.response.status} ${error.response.statusText}`);
      }
      throw error;
    }
  }
  /**
   * 处理 base64 编码的图像上传
   * @param {string} base64Data - base64 编码的图像数据（包含 data:image/...;base64, 前缀）
   * @param {string} user - 用户标识
   * @returns {Promise<string>} 返回 Dify 文件 ID
   */  async uploadBase64Image(base64Data, user) {
    try {
      // 解析 base64 数据
      const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid base64 image format');
      }
      
      const imageType = matches[1]; // jpg, png, etc.
      const base64Content = matches[2];
      
      // 转换 base64 为 Buffer
      const imageBuffer = Buffer.from(base64Content, 'base64');
      const filename = `image_${Date.now()}.${imageType}`;
      
      console.log(`[${this.appName}] 📤 上传图像: ${imageType} (${Math.round(imageBuffer.length/1024)}KB)`);
      
      // 创建 FormData 用于文件上传
      const FormData = require('form-data');
      const formData = new FormData();
      
      // 添加文件数据
      formData.append('file', imageBuffer, {
        filename: filename,
        contentType: `image/${imageType}`
      });
      
      // 添加用户标识
      formData.append('user', user);
      
      // 调用 Dify 文件上传 API - 修正API路径
      const response = await this.client.post('/v1/files/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      const fileId = response.data.id;
      console.log(`[${this.appName}] ✅ 图像上传成功: ${fileId}`);
      return fileId;
      
    } catch (error) {
      console.error(`[${this.appName}] ❌ 图像上传失败: ${error.message}`);
      
      // 简化错误信息，只显示关键信息
      if (error.response) {
        console.error(`[${this.appName}]    状态: ${error.response.status} ${error.response.statusText}`);
        if (error.response.status === 404) {
          console.error(`[${this.appName}]    提示: Dify服务器可能不支持文件上传API`);
        }
      }
      
      throw error;
    }
  }  /**
   * 处理 OpenAI 多模态消息中的图像
   * @param {Array} messages - OpenAI 格式的消息数组
   * @param {string} user - 用户标识
   * @returns {Promise<Array>} 返回处理后的 Dify 文件数组
   */
  async processMultimodalImages(messages, user) {
    const files = [];
    
    try {
      // 查找包含图像的用户消息
      const userMessages = messages.filter(msg => msg.role === 'user');
      
      for (const message of userMessages) {
        if (Array.isArray(message.content)) {
          for (const part of message.content) {
            if (part.type === 'image_url' && part.image_url && part.image_url.url) {
              const imageUrl = part.image_url.url;
              
              // 检查是否是 base64 编码的图像
              if (imageUrl.startsWith('data:image/')) {
                try {
                  // 尝试上传 base64 图像到 Dify
                  const fileId = await this.uploadBase64Image(imageUrl, user);
                  // 添加到文件列表，使用 Dify 的正确文件格式
                  files.push({
                    type: "image",
                    transfer_method: "local_file",
                    upload_file_id: fileId
                  });
                } catch (uploadError) {
                  console.warn(`[${this.appName}] 跳过图像: ${uploadError.message}`);
                  // 不抛出错误，继续处理其他内容
                }
              } else {
                // 处理外部 URL 图像
                files.push({
                  type: "image",
                  transfer_method: "remote_url",
                  url: imageUrl
                });
              }
            }
          }
        }
      }
      
      if (files.length > 0) {
        console.log(`[${this.appName}] 处理了 ${files.length} 张图像`);
      }
      return files;
      
    } catch (error) {
      console.warn(`[${this.appName}] 图像处理出错，继续文本对话: ${error.message}`);
      return [];
    }
  }

  // 检查应用配置是否正确
  validateAppConfig() {
    if (this.appType === 'agent') {
      // console.warn(`[${this.appName}] 警告: Agent 类型应用可能不适合标准聊天场景`);
      // console.warn(`[${this.appName}] 建议使用 chatbot 类型的应用进行聊天对话`);
    }
  }

  // 从工作流节点输出中提取文本内容
  extractTextFromOutputs(outputs) {
    if (!outputs || typeof outputs !== 'object') {
      return '';
    }
    
    // 常见的文本输出字段
    const textFields = ['text', 'content', 'answer', 'result', 'output', 'response'];
    
    for (const field of textFields) {
      if (outputs[field] && typeof outputs[field] === 'string') {
        return outputs[field];
      }
    }
    
    // 如果没有找到标准字段，尝试查找任何字符串值
    for (const [key, value] of Object.entries(outputs)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        // 跳过系统字段
        if (!key.startsWith('sys.') && !key.includes('id') && !key.includes('time')) {
          return value;
        }
      }
    }
    
    return '';
  }
}

module.exports = DifyClient;
