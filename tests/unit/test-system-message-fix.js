const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'sk-test';

async function testSystemMessageHandling() {
  console.log('=== 测试 System 消息处理修复 ===\n');
  
  const userKey = 'test-user-' + Date.now();
  const model = 'dify-qwen';
  
  try {
    // 1. 检查初始状态
    console.log('1. 检查初始会话状态...');
    const initialHealthResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('初始会话数量:', Object.keys(initialHealthResponse.data.conversations || {}).length);
    console.log();
    
    // 2. 发送带有 system 消息的单条用户消息（应该创建新会话）
    console.log('2. 发送带有 system 消息的单条用户消息（应该创建新会话）...');
    const firstMessage = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'User Context:\n\n'
        },
        {
          role: 'user',
          content: '你是谁？请简单介绍一下你自己。'
        }
      ],
      stream: false,
      user: userKey
    };
    
    console.log('📦 请求消息数组:');
    console.log(`   总消息数: ${firstMessage.messages.length}`);
    console.log(`   用户消息数: ${firstMessage.messages.filter(m => m.role === 'user').length}`);
    console.log(`   系统消息数: ${firstMessage.messages.filter(m => m.role === 'system').length}`);
    console.log();
    
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
    console.log('会话详情:', JSON.stringify(afterFirstResponse.data.conversations, null, 2));
    console.log();
    
    // 5. 发送第二条消息（多条用户消息，应该继续现有会话）
    console.log('4. 发送第二条消息（多条用户消息，应该继续现有会话）...');
    const secondMessage = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'User Context:\n\n'
        },
        {
          role: 'user',
          content: '你是谁？请简单介绍一下你自己。'
        },
        {
          role: 'assistant',
          content: firstResponse.data.choices[0].message.content
        },
        {
          role: 'user',
          content: '很好，现在请告诉我今天是几号？'
        }
      ],
      stream: false,
      user: userKey
    };
    
    console.log('📦 第二次请求消息数组:');
    console.log(`   总消息数: ${secondMessage.messages.length}`);
    console.log(`   用户消息数: ${secondMessage.messages.filter(m => m.role === 'user').length}`);
    console.log(`   系统消息数: ${secondMessage.messages.filter(m => m.role === 'system').length}`);
    console.log(`   助手消息数: ${secondMessage.messages.filter(m => m.role === 'assistant').length}`);
    console.log();
    
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
    
    // 6. 最终检查会话状态
    console.log('5. 最终检查会话状态...');
    const finalHealthResponse = await axios.get(`${BASE_URL}/health/sessions`);
    console.log('最终会话数量:', Object.keys(finalHealthResponse.data.conversations || {}).length);
    console.log('会话详情:', JSON.stringify(finalHealthResponse.data.conversations, null, 2));
    
    console.log('\n=== 测试完成 ===');
    console.log('✅ 验证要点：');
    console.log('  - 单条用户消息（忽略system消息）应该创建新会话');
    console.log('  - 多条用户消息应该继续现有会话');
    console.log('  - System 消息不应该影响会话判断逻辑');
    
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

if (require.main === module) {
  testSystemMessageHandling();
}

module.exports = { testSystemMessageHandling };
