const axios = require('axios');

// 测试只有文本的多模态格式
async function testTextOnlyMultimodal() {
  console.log('\n🧪 测试纯文本多模态格式');
  console.log('='.repeat(50));

  try {
    const request = {
      model: 'dify-qwen',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '你好，请介绍一下你自己'
            }
          ]
        }
      ],
      user: 'test-text-multimodal-user',
      stream: false
    };

    console.log('📤 发送纯文本多模态请求...');
    console.log('📋 请求内容:');
    console.log(`   模型: ${request.model}`);
    console.log(`   消息类型: 多模态格式 (仅文本)`);
    console.log(`   流式: ${request.stream ? '是' : '否'}`);

    const startTime = Date.now();
    const response = await axios.post('http://localhost:3000/v1/chat/completions', request, {
      headers: {
        'Authorization': 'Bearer sk-test',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const duration = Date.now() - startTime;
    console.log(`✅ 纯文本多模态请求成功 (耗时: ${duration}ms)`);
    console.log('📊 响应统计:');
    console.log(`   响应ID: ${response.data.id}`);
    console.log(`   模型: ${response.data.model}`);
    console.log(`   完成原因: ${response.data.choices?.[0]?.finish_reason || '未知'}`);
    
    console.log('\n💬 AI 响应内容:');
    console.log(response.data.choices[0].message.content);
    
    return response.data;

  } catch (error) {
    console.error('❌ 纯文本多模态请求失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   状态文本:', error.response.statusText);
      console.error('   错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 测试普通文本格式
async function testNormalTextChat() {
  console.log('\n🧪 测试普通文本聊天');
  console.log('='.repeat(50));

  try {
    const request = {
      model: 'dify-qwen',
      messages: [
        {
          role: 'user',
          content: '你好，请介绍一下你自己'
        }
      ],
      user: 'test-normal-user',
      stream: false
    };

    console.log('📤 发送普通文本请求...');

    const startTime = Date.now();
    const response = await axios.post('http://localhost:3000/v1/chat/completions', request, {
      headers: {
        'Authorization': 'Bearer sk-test',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const duration = Date.now() - startTime;
    console.log(`✅ 普通文本请求成功 (耗时: ${duration}ms)`);
    console.log('\n💬 AI 响应内容:');
    console.log(response.data.choices[0].message.content);
    
    return response.data;

  } catch (error) {
    console.error('❌ 普通文本请求失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始基础多模态兼容性测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('='.repeat(70));

  try {
    // 测试1: 普通文本
    await testNormalTextChat();
    
    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 测试2: 多模态格式的纯文本
    await testTextOnlyMultimodal();
    
    console.log('\n🎉 基础测试完成！');
    console.log('✨ 多模态格式兼容性测试成功');

  } catch (error) {
    console.error('\n💥 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}
