const axios = require('axios');

/**
 * 测试会话记忆功能
 * 验证多轮对话中的上下文保持
 */

const serverURL = 'http://localhost:3000';
const testApiKey = 'test-conversation-key';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessage(message, model = 'dify-qwen') {
  try {
    const response = await axios.post(`${serverURL}/v1/chat/completions`, {
      model: model,
      messages: [
        { role: 'user', content: message }
      ],
      stream: false,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${testApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
    throw error;
  }
}

async function testConversationMemory() {
  console.log('🧪 测试会话记忆功能...\n');
  
  try {
    // 检查服务器状态
    console.log('📋 检查服务器状态...');
    const healthResponse = await axios.get(`${serverURL}/health`);
    console.log('✓ 服务器运行正常');
    console.log(`📊 活跃会话数: ${healthResponse.data.services.conversation_manager.activeConversations}`);
    console.log(`⏱️  会话超时: ${healthResponse.data.services.conversation_manager.conversationTimeout}\n`);
    
    // 第一轮对话：建立上下文
    console.log('🗣️  第一轮对话：建立上下文');
    console.log('用户: 我叫小明，我今年25岁，是一名程序员');
    
    const response1 = await sendMessage('我叫小明，我今年25岁，是一名程序员');
    console.log('助手:', response1);
    console.log('');
    
    await sleep(2000); // 等待2秒
    
    // 第二轮对话：测试记忆
    console.log('🗣️  第二轮对话：测试记忆');
    console.log('用户: 你还记得我的名字吗？');
    
    const response2 = await sendMessage('你还记得我的名字吗？');
    console.log('助手:', response2);
    console.log('');
    
    await sleep(2000);
    
    // 第三轮对话：测试更复杂的记忆
    console.log('🗣️  第三轮对话：测试复杂记忆');
    console.log('用户: 根据我之前告诉你的信息，我适合学习什么编程语言？');
    
    const response3 = await sendMessage('根据我之前告诉你的信息，我适合学习什么编程语言？');
    console.log('助手:', response3);
    console.log('');
    
    // 检查会话状态
    console.log('📊 检查会话状态...');
    const finalHealthResponse = await axios.get(`${serverURL}/health`);
    console.log(`✓ 当前活跃会话数: ${finalHealthResponse.data.services.conversation_manager.activeConversations}`);
    
    // 分析结果
    console.log('\n🔍 会话记忆分析:');
    
    const containsName = response2.toLowerCase().includes('小明') || 
                        response2.includes('你的名字') ||
                        response2.includes('记得');
    
    const containsContext = response3.toLowerCase().includes('程序员') ||
                           response3.toLowerCase().includes('25') ||
                           response3.includes('编程');
    
    if (containsName) {
      console.log('✅ 第二轮对话：成功记住了用户姓名');
    } else {
      console.log('❌ 第二轮对话：未能记住用户姓名');
    }
    
    if (containsContext) {
      console.log('✅ 第三轮对话：成功利用了之前的上下文信息');
    } else {
      console.log('❌ 第三轮对话：未能利用之前的上下文信息');
    }
    
    if (containsName && containsContext) {
      console.log('\n🎉 会话记忆功能测试通过！');
    } else {
      console.log('\n⚠️  会话记忆功能可能存在问题，请检查 Dify 工作流配置');
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('请确保服务器在 http://localhost:3000 运行');
    }
  }
}

async function testMultipleModels() {
  console.log('\n🔄 测试多模型会话隔离...\n');
  
  try {
    // 在 dify-qwen 中建立上下文
    console.log('📝 在 dify-qwen 中建立上下文:');
    console.log('用户: 我最喜欢的颜色是蓝色');
    
    const qwenResponse1 = await sendMessage('我最喜欢的颜色是蓝色', 'dify-qwen');
    console.log('dify-qwen:', qwenResponse1);
    
    await sleep(1000);
    
    // 在 dify-deepseek 中测试隔离
    console.log('\n📝 在 dify-deepseek 中测试隔离:');
    console.log('用户: 你知道我最喜欢什么颜色吗？');
    
    const deepseekResponse = await sendMessage('你知道我最喜欢什么颜色吗？', 'dify-deepseek');
    console.log('dify-deepseek:', deepseekResponse);
    
    await sleep(1000);
    
    // 回到 dify-qwen 测试记忆保持
    console.log('\n📝 回到 dify-qwen 测试记忆保持:');
    console.log('用户: 你还记得我刚才说的颜色偏好吗？');
    
    const qwenResponse2 = await sendMessage('你还记得我刚才说的颜色偏好吗？', 'dify-qwen');
    console.log('dify-qwen:', qwenResponse2);
    
    // 分析结果
    console.log('\n🔍 多模型隔离分析:');
    
    const deepseekKnowsColor = deepseekResponse.toLowerCase().includes('蓝色');
    const qwenRemembersColor = qwenResponse2.toLowerCase().includes('蓝色');
    
    if (!deepseekKnowsColor) {
      console.log('✅ dify-deepseek 正确隔离：不知道在 dify-qwen 中说的内容');
    } else {
      console.log('❌ dify-deepseek 隔离失败：错误地知道了其他模型的上下文');
    }
    
    if (qwenRemembersColor) {
      console.log('✅ dify-qwen 记忆保持：正确记住了之前的对话');
    } else {
      console.log('❌ dify-qwen 记忆丢失：未能记住之前的对话');
    }
    
  } catch (error) {
    console.error('❌ 多模型测试失败:', error.message);
  }
}

async function testSessionManagement() {
  console.log('\n🔧 测试会话管理 API...\n');
  
  try {
    // 建立会话
    console.log('📝 建立测试会话...');
    await sendMessage('这是一个测试会话，请记住这条消息', 'dify-qwen');
    
    // 检查会话状态
    const healthBefore = await axios.get(`${serverURL}/health`);
    console.log(`📊 删除前活跃会话数: ${healthBefore.data.services.conversation_manager.activeConversations}`);
    
    // 删除会话
    console.log('🗑️  尝试删除会话...');
    try {
      const deleteResponse = await axios.delete(`${serverURL}/health/conversations/${testApiKey}/dify-qwen`, {
        headers: {
          'Authorization': `Bearer ${testApiKey}`
        }
      });
      console.log('✅ 会话删除成功:', deleteResponse.data.message);
    } catch (deleteError) {
      if (deleteError.response?.status === 404) {
        console.log('ℹ️  没有找到活跃会话（可能已过期）');
      } else {
        console.log('❌ 会话删除失败:', deleteError.message);
      }
    }
    
    // 检查删除后状态
    const healthAfter = await axios.get(`${serverURL}/health`);
    console.log(`📊 删除后活跃会话数: ${healthAfter.data.services.conversation_manager.activeConversations}`);
    
    // 测试会话是否真的被删除
    console.log('\n🔍 验证会话是否被删除...');
    console.log('用户: 你还记得我刚才说的测试消息吗？');
    
    const testResponse = await sendMessage('你还记得我刚才说的测试消息吗？', 'dify-qwen');
    console.log('助手:', testResponse);
    
    const remembersTest = testResponse.toLowerCase().includes('测试会话') || 
                         testResponse.toLowerCase().includes('记住');
    
    if (!remembersTest) {
      console.log('✅ 会话管理正常：删除后不记得之前的内容');
    } else {
      console.log('❌ 会话管理异常：删除后仍然记得之前的内容');
    }
    
  } catch (error) {
    console.error('❌ 会话管理测试失败:', error.message);
  }
}

async function main() {
  console.log('🧪 Dify 会话记忆功能测试');
  console.log('===============================\n');
  
  try {
    await testConversationMemory();
    await testMultipleModels();
    await testSessionManagement();
    
    console.log('\n🎊 所有测试完成！');
    
  } catch (error) {
    console.error('\n💥 测试过程中发生错误:', error.message);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = {
  sendMessage,
  testConversationMemory,
  testMultipleModels,
  testSessionManagement
};
