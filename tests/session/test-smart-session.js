const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'test-api-key';

async function testSmartSessionManagement() {
  console.log('=== 测试智能会话管理（基于消息数量判断） ===\n');
  
  const userKey = 'test-user-' + Date.now();
  const model = 'dify-qwen';
  
  try {
    // 1. 检查初始状态
    console.log('1. 检查初始会话状态...');
    const initialHealthResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('初始会话数量:', Object.keys(initialHealthResponse.data.conversations || {}).length);
    console.log();
    
    // 2. 发送第一条消息（单条消息，应该创建新会话）
    console.log('2. 发送第一条消息（单条消息，应该创建新会话）...');
    const firstMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我叫小明，今年25岁。'
        }
      ],
      stream: false,
      user: userKey
    };
    
    console.log('发送单条消息，预期：创建新会话');
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
    
    console.log('第一次响应:', firstResponse.data.choices[0].message.content.substring(0, 100) + '...');
    console.log();
    
    // 3. 等待一下确保会话被保存
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 检查会话是否被创建
    console.log('3. 检查会话是否被创建...');
    const afterFirstResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('第一次请求后的会话数量:', Object.keys(afterFirstResponse.data.conversations || {}).length);
    console.log();
    
    // 5. 发送第二条消息（多条消息，应该继续现有会话）
    console.log('4. 发送第二条消息（多条消息，应该继续现有会话）...');
    const secondMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我叫小明，今年25岁。'
        },
        {
          role: 'assistant',
          content: firstResponse.data.choices[0].message.content
        },
        {
          role: 'user',
          content: '你还记得我的名字和年龄吗？'
        }
      ],
      stream: false,
      user: userKey
    };
    
    console.log('发送多条消息，预期：继续现有会话');
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
    
    console.log('第二次响应:', secondResponse.data.choices[0].message.content);
    console.log();
    
    // 6. 再次发送单条消息（应该创建新会话）
    console.log('5. 再次发送单条消息（应该创建新会话）...');
    const thirdMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我是李华，我想问个问题。'
        }
      ],
      stream: false,
      user: userKey
    };
    
    console.log('发送单条消息，预期：创建新会话（重置对话）');
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
    
    console.log('第三次响应:', thirdResponse.data.choices[0].message.content.substring(0, 100) + '...');
    console.log();
    
    // 7. 继续第三次会话
    console.log('6. 继续第三次会话（多条消息）...');
    const fourthMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，我是李华，我想问个问题。'
        },
        {
          role: 'assistant',
          content: thirdResponse.data.choices[0].message.content
        },
        {
          role: 'user',
          content: '你记得我的名字吗？我刚才说我叫什么？'
        }
      ],
      stream: false,
      user: userKey
    };
    
    console.log('发送多条消息，预期：继续当前会话');
    const fourthResponse = await axios.post(
      `${BASE_URL}/v1/chat/completions`, 
      fourthMessage,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('第四次响应:', fourthResponse.data.choices[0].message.content);
    console.log();
    
    // 8. 最终检查会话状态
    console.log('7. 最终检查会话状态...');
    const finalHealthResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('最终会话状态:', JSON.stringify(finalHealthResponse.data, null, 2));
    
    console.log('\n=== 测试完成 ===');
    console.log('✅ 验证要点：');
    console.log('  - 单条消息应该创建新会话');
    console.log('  - 多条消息应该继续现有会话');
    console.log('  - 会话超时时间：2小时');
    console.log('  - 如果AI能记住"李华"但忘记了"小明"，说明会话切换成功');
    
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
testSmartSessionManagement();
