const axios = require('axios');

async function testSimpleChat() {
  try {
    console.log('🧪 开始测试简单聊天...');
    
    const response = await axios.post('http://localhost:3000/v1/chat/completions', {
      model: 'dify-qwen',
      messages: [
        { role: 'user', content: '你好' }
      ],
      stream: false
    }, {
      headers: {
        'Authorization': 'Bearer sk-test',
        'Content-Type': 'application/json'
      },
      timeout: 30000  // 30秒超时
    });

    console.log('✅ 简单聊天成功');
    console.log('响应:', response.data.choices[0].message.content);
  } catch (error) {
    console.error('❌ 简单聊天失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code) {
      console.error('错误代码:', error.code);
    }
  }
}

testSimpleChat();
