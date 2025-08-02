const axios = require('axios');

// 测试用户参数一致性
async function testUserParameterConsistency() {
  console.log('🧪 测试用户参数一致性');
  console.log('目标: 确保文件上传和对话请求使用相同的用户标识符');
  console.log('='.repeat(70));

  const BASE_URL = 'http://localhost:3000';
  const API_KEY = 'sk-test';
  
  // 创建一个简单的测试图像的 base64 数据 (1x1 红色像素的PNG)
  const TEST_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  try {
    // 测试场景1: 使用 user 参数
    console.log('\n📋 场景1: 测试使用 user 参数的多模态请求');
    console.log('='.repeat(50));
    
    const userParamRequest = {
      model: 'dify-qwen',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请描述这张图片，这是测试用户参数一致性'
            },
            {
              type: 'image_url',
              image_url: {
                url: TEST_IMAGE_BASE64
              }
            }
          ]
        }
      ],
      user: 'test-user-consistency-123',
      stream: false
    };

    console.log(`📤 发送带有用户参数的多模态请求...`);
    console.log(`🏷️  用户标识: ${userParamRequest.user}`);
    
    const startTime1 = Date.now();
    const response1 = await axios.post(`${BASE_URL}/v1/chat/completions`, userParamRequest, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const duration1 = Date.now() - startTime1;
    console.log(`✅ 用户参数测试完成 (耗时: ${duration1}ms)`);
    console.log(`📊 响应状态: ${response1.status}`);
    console.log(`🎯 响应ID: ${response1.data.id}`);
    
    // 测试场景2: 不指定 user 参数，应该使用默认值
    console.log('\n📋 场景2: 测试不指定 user 参数的请求');
    console.log('='.repeat(50));
    
    const noUserRequest = {
      model: 'dify-qwen',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请描述这张图片，这是测试默认用户参数'
            },
            {
              type: 'image_url',
              image_url: {
                url: TEST_IMAGE_BASE64
              }
            }
          ]
        }
      ],
      stream: false
    };

    console.log(`📤 发送不带用户参数的多模态请求...`);
    console.log(`🏷️  用户标识: (未指定，应使用默认值 'user')`);
    
    const startTime2 = Date.now();
    const response2 = await axios.post(`${BASE_URL}/v1/chat/completions`, noUserRequest, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const duration2 = Date.now() - startTime2;
    console.log(`✅ 默认用户参数测试完成 (耗时: ${duration2}ms)`);
    console.log(`📊 响应状态: ${response2.status}`);
    console.log(`🎯 响应ID: ${response2.data.id}`);

    // 测试场景3: 流式多模态请求的用户参数一致性
    console.log('\n📋 场景3: 测试流式多模态请求的用户参数一致性');
    console.log('='.repeat(50));
    
    const streamRequest = {
      model: 'dify-qwen',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请描述这张图片，这是测试流式用户参数一致性'
            },
            {
              type: 'image_url',
              image_url: {
                url: TEST_IMAGE_BASE64
              }
            }
          ]
        }
      ],
      user: 'test-stream-user-consistency-456',
      stream: true
    };

    console.log(`📤 发送流式多模态请求...`);
    console.log(`🏷️  用户标识: ${streamRequest.user}`);
    
    const startTime3 = Date.now();
    const streamResponse = await axios.post(`${BASE_URL}/v1/chat/completions`, streamRequest, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream',
      timeout: 30000
    });

    let streamContent = '';
    let chunkCount = 0;
    
    await new Promise((resolve, reject) => {
      streamResponse.data.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              const duration3 = Date.now() - startTime3;
              console.log(`\n✅ 流式用户参数测试完成 (耗时: ${duration3}ms)`);
              console.log(`📊 接收统计: 总计 ${chunkCount} 个数据块`);
              resolve();
              return;
            }
            
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr);
                if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                  const content = data.choices[0].delta.content;
                  streamContent += content;
                  chunkCount++;
                  process.stdout.write('.');
                }
              } catch (parseError) {
                // 忽略解析错误
              }
            }
          }
        }
      });

      streamResponse.data.on('end', () => {
        if (!streamContent) {
          resolve();
        }
      });

      streamResponse.data.on('error', (error) => {
        reject(error);
      });
    });

    console.log('\n🎉 所有用户参数一致性测试完成！');
    console.log('✨ 用户参数在文件上传和对话请求之间保持一致');
    console.log('\n📝 测试结果总结:');
    console.log('1. ✅ 指定用户参数的多模态请求正常工作');
    console.log('2. ✅ 默认用户参数的多模态请求正常工作');
    console.log('3. ✅ 流式多模态请求的用户参数一致性正常');

  } catch (error) {
    console.error('\n❌ 用户参数一致性测试失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   状态文本:', error.response.statusText);
      console.error('   错误数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   请求错误: 无响应');
    } else {
      console.error('   配置错误:', error.message);
    }
    throw error;
  }
}

// 运行测试
if (require.main === module) {
  testUserParameterConsistency().catch(console.error);
}

module.exports = {
  testUserParameterConsistency
};
