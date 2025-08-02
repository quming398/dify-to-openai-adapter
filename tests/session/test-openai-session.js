const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'test-api-key';

async function testOpenAISessionMapping() {
  console.log('=== 测试 OpenAI 风格的会话 ID 映射 ===\n');
  
  const userKey = 'test-user-' + Date.now();
  const model = 'dify-qwen';
  const sessionId = 'openai-session-' + Date.now(); // OpenAI 风格的会话 ID
  
  try {
    // 1. 检查初始状态
    console.log('1. 检查初始会话状态...');
    const initialHealthResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('初始会话数量:', Object.keys(initialHealthResponse.data.conversations || {}).length);
    console.log('初始 OpenAI 映射数量:', initialHealthResponse.data.openaiMappings || 0);
    console.log();
    
    // 2. 第一次请求 - 使用 OpenAI 会话 ID
    console.log('2. 发送第一次请求（使用 OpenAI 会话 ID）...');
    const firstMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我是张三。请记住我的名字。'
        }
      ],
      stream: false,
      user: userKey,
      session_id: sessionId // OpenAI 风格的会话 ID
    };
    
    console.log('使用 OpenAI 会话 ID:', sessionId);
    console.log('发送请求到:', `${BASE_URL}/v1/chat/completions`);
    
    const firstResponse = await axios.post(
      `${BASE_URL}/v1/chat/completions`, 
      firstMessage,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('第一次响应状态:', firstResponse.status);
    console.log('第一次响应内容:', firstResponse.data.choices[0].message.content.substring(0, 150) + '...');
    console.log();
    
    // 3. 等待一下确保会话被保存
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 检查会话映射是否被创建
    console.log('3. 检查 OpenAI 会话映射是否被创建...');
    const afterFirstResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('第一次请求后的会话状态:', JSON.stringify(afterFirstResponse.data, null, 2));
    console.log();
    
    // 5. 第二次请求 - 使用相同的 OpenAI 会话 ID
    console.log('4. 发送第二次请求（使用相同的 OpenAI 会话 ID）...');
    const secondMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我是张三。请记住我的名字。'
        },
        {
          role: 'assistant',
          content: firstResponse.data.choices[0].message.content
        },
        {
          role: 'user',
          content: '你还记得我的名字吗？请说出我的名字。'
        }
      ],
      stream: false,
      user: userKey,
      session_id: sessionId // 使用相同的 OpenAI 会话 ID
    };
    
    const secondResponse = await axios.post(
      `${BASE_URL}/v1/chat/completions`, 
      secondMessage,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('第二次响应状态:', secondResponse.status);
    console.log('第二次响应内容:', secondResponse.data.choices[0].message.content);
    console.log();
    
    // 6. 测试不同的 OpenAI 会话 ID（应该创建新的对话）
    console.log('5. 测试不同的 OpenAI 会话 ID（应该创建新对话）...');
    const newSessionId = 'openai-session-new-' + Date.now();
    const thirdMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我是李四。这是一个新的对话。'
        }
      ],
      stream: false,
      user: userKey,
      session_id: newSessionId // 新的 OpenAI 会话 ID
    };
    
    console.log('使用新的 OpenAI 会话 ID:', newSessionId);
    
    const thirdResponse = await axios.post(
      `${BASE_URL}/v1/chat/completions`, 
      thirdMessage,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('第三次响应状态:', thirdResponse.status);
    console.log('第三次响应内容:', thirdResponse.data.choices[0].message.content.substring(0, 150) + '...');
    console.log();
    
    // 7. 最终检查所有会话状态
    console.log('6. 最终检查所有会话状态...');
    const finalHealthResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('最终会话状态:', JSON.stringify(finalHealthResponse.data, null, 2));
    
    console.log('\n=== 测试完成 ===');
    console.log('✅ 如果看到 OpenAI 会话映射被正确创建和使用，说明功能正常！');
    
    // 8. 验证是否支持流式响应的 OpenAI 会话 ID
    console.log('\n7. 测试流式响应的 OpenAI 会话 ID 支持...');
    const streamMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我是张三。请记住我的名字。'
        },
        {
          role: 'assistant', 
          content: firstResponse.data.choices[0].message.content
        },
        {
          role: 'user',
          content: '你还记得我的名字吗？请说出我的名字。'
        },
        {
          role: 'assistant',
          content: secondResponse.data.choices[0].message.content
        },
        {
          role: 'user',
          content: '请用我的名字跟我说再见。'
        }
      ],
      stream: true,
      user: userKey,
      session_id: sessionId // 使用原始的 OpenAI 会话 ID
    };
    
    console.log('发送流式请求，使用 OpenAI 会话 ID:', sessionId);
    
    const streamResponse = await axios.post(
      `${BASE_URL}/v1/chat/completions`, 
      streamMessage,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );
    
    console.log('流式响应内容:');
    let streamContent = '';
    streamResponse.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices?.[0]?.delta?.content) {
              process.stdout.write(data.choices[0].delta.content);
              streamContent += data.choices[0].delta.content;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    });
    
    await new Promise((resolve) => {
      streamResponse.data.on('end', resolve);
    });
    
    console.log('\n流式响应完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误响应:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 提示：请确保服务已启动 (npm start 或 node src/index.js)');
    }
  }
}

// 运行测试
testOpenAISessionMapping();
