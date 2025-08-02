const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'test-api-key';

async function testConversationFlow() {
  console.log('=== 测试对话流程和 conversation_id 处理 ===\n');
  
  const userKey = 'test-user-' + Date.now();
  const model = 'dify-qwen';
  
  try {
    // 1. 检查初始状态
    console.log('1. 检查初始会话状态...');
    const initialHealthResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('初始会话数量:', Object.keys(initialHealthResponse.data.conversations || {}).length);
    console.log();
    
    // 2. 第一次请求 - 应该创建新对话
    console.log('2. 发送第一次请求（应该创建新对话）...');
    const firstMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，请简单介绍一下你自己。'
        }
      ],
      stream: false,
      user: userKey
    };
    
    console.log('发送请求到:', `${BASE_URL}/v1/chat/completions`);
    console.log('请求数据:', JSON.stringify(firstMessage, null, 2));
    
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
    console.log('第一次响应内容:', firstResponse.data.choices[0].message.content.substring(0, 100) + '...');
    console.log();
    
    // 3. 等待一下确保会话被保存
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 检查会话是否被保存
    console.log('3. 检查会话是否被保存...');
    const afterFirstResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('第一次请求后的会话状态:', JSON.stringify(afterFirstResponse.data, null, 2));
    console.log();
    
    // 5. 第二次请求 - 应该使用现有对话
    console.log('4. 发送第二次请求（应该使用现有对话）...');
    const secondMessage = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，请简单介绍一下你自己。'
        },
        {
          role: 'assistant',
          content: firstResponse.data.choices[0].message.content
        },
        {
          role: 'user',
          content: '好的，现在请告诉我今天是几号？'
        }
      ],
      stream: false,
      user: userKey
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
    console.log('第二次响应内容:', secondResponse.data.choices[0].message.content.substring(0, 100) + '...');
    console.log();
    
    // 6. 最终检查会话状态
    console.log('5. 最终检查会话状态...');
    const finalHealthResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('最终会话状态:', JSON.stringify(finalHealthResponse.data, null, 2));
    
    console.log('\n=== 测试完成 ===');
    console.log('✅ 如果看到会话被正确保存和使用，说明修复成功！');
    
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
testConversationFlow();
