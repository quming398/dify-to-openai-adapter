const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testConversationPersistence() {
  console.log('=== 测试对话持久化修复 ===\n');
  
  const userKey = 'test-user-' + Date.now();
  const model = 'dify-qwen';
  
  try {
    // 1. 检查初始健康状态
    console.log('1. 检查服务健康状态...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('健康状态:', healthResponse.data);
    console.log();
    
    // 2. 发送第一条消息（新建对话）
    console.log('2. 发送第一条消息（新建对话）...');
    const firstMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我叫小明。请记住我的名字。'
        }
      ],
      stream: false,
      user: userKey
    };
    
    const firstResponse = await axios.post(`${BASE_URL}/v1/chat/completions`, firstMessage);
    console.log('第一条消息响应:', firstResponse.data.choices[0].message.content);
    console.log();
    
    // 3. 等待一下，确保数据被保存
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 检查会话管理器状态
    console.log('3. 检查会话管理器状态...');
    const sessionsResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('会话状态:', JSON.stringify(sessionsResponse.data, null, 2));
    console.log();
    
    // 5. 发送第二条消息（应该记住上下文）
    console.log('4. 发送第二条消息（测试记忆功能）...');
    const secondMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我叫小明。请记住我的名字。'
        },
        {
          role: 'assistant',
          content: firstResponse.data.choices[0].message.content
        },
        {
          role: 'user',
          content: '你还记得我的名字吗？'
        }
      ],
      stream: false,
      user: userKey
    };
    
    const secondResponse = await axios.post(`${BASE_URL}/v1/chat/completions`, secondMessage);
    console.log('第二条消息响应:', secondResponse.data.choices[0].message.content);
    console.log();
    
    // 6. 再次检查会话状态
    console.log('5. 再次检查会话状态...');
    const finalSessionsResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('最终会话状态:', JSON.stringify(finalSessionsResponse.data, null, 2));
    console.log();
    
    // 7. 测试流式响应的对话持久化
    console.log('6. 测试流式响应的对话持久化...');
    const streamMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我叫小明。请记住我的名字。'
        },
        {
          role: 'assistant',
          content: firstResponse.data.choices[0].message.content
        },
        {
          role: 'user',
          content: '你还记得我的名字吗？'
        },
        {
          role: 'assistant',
          content: secondResponse.data.choices[0].message.content
        },
        {
          role: 'user',
          content: '请用我的名字跟我打招呼。'
        }
      ],
      stream: true,
      user: userKey + '-stream'
    };
    
    const streamResponse = await axios.post(`${BASE_URL}/v1/chat/completions`, streamMessage, {
      responseType: 'stream'
    });
    
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
    
    console.log('\n');
    
    // 8. 最终检查所有会话
    console.log('7. 最终检查所有会话...');
    const allSessionsResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('所有会话状态:', JSON.stringify(allSessionsResponse.data, null, 2));
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('错误状态:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
  }
}

// 运行测试
testConversationPersistence();
