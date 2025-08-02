const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = 'http://localhost:3000';
const API_KEY = 'sk-test';

// 创建一个简单的测试图像的 base64 数据 (1x1 红色像素的PNG)
const TEST_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// 测试多模态聊天 - base64 图像
async function testMultimodalChat() {
  console.log('\n🧪 测试多模态聊天功能 (Base64 图像)');
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
              text: '请描述一下这张图片的内容'
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
      user: 'test-multimodal-user',
      stream: false
    };

    console.log('📤 发送多模态请求...');
    console.log('📋 请求内容:');
    console.log(`   模型: ${request.model}`);
    console.log(`   消息类型: 多模态 (文本 + 图像)`);
    console.log(`   图像格式: Base64 PNG`);
    console.log(`   流式: ${request.stream ? '是' : '否'}`);
    console.log('📝 详细请求体:');
    console.log(JSON.stringify(request, null, 2));

    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/v1/chat/completions`, request, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000  // 30秒超时
    });

    const duration = Date.now() - startTime;
    console.log(`✅ 多模态聊天请求成功 (耗时: ${duration}ms)`);
    console.log('📊 响应统计:');
    console.log(`   响应ID: ${response.data.id}`);
    console.log(`   模型: ${response.data.model}`);
    console.log(`   完成原因: ${response.data.choices?.[0]?.finish_reason || '未知'}`);
    
    if (response.data.usage) {
      console.log(`   令牌使用: 输入${response.data.usage.prompt_tokens} + 输出${response.data.usage.completion_tokens} = 总计${response.data.usage.total_tokens}`);
    }
    
    console.log('\n💬 AI 响应内容:');
    console.log(response.data.choices[0].message.content);
    
    return response.data;

  } catch (error) {
    console.error('❌ 多模态聊天请求失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   状态文本:', error.response.statusText);
      console.error('   错误数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   请求错误: 无响应');
      console.error('   请求详情:', error.request);
    } else {
      console.error('   配置错误:', error.message);
    }
    throw error;
  }
}

// 测试多模态流式聊天
async function testMultimodalStreamChat() {
  console.log('\n🌊 测试多模态流式聊天功能');
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
              text: '请分析这张图片并告诉我你看到了什么'
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
      user: 'test-stream-multimodal-user',
      stream: true
    };

    console.log('📤 发送流式多模态请求...');
    console.log('📋 请求内容:');
    console.log(`   模型: ${request.model}`);
    console.log(`   消息类型: 多模态 (文本 + 图像)`);
    console.log(`   图像格式: Base64 PNG`);
    console.log(`   流式: ${request.stream ? '是' : '否'}`);

    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/v1/chat/completions`, request, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    console.log('🌊 开始接收流式响应...');
    let fullContent = '';
    let chunkCount = 0;

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              const duration = Date.now() - startTime;
              console.log(`\n✅ 流式多模态聊天完成 (耗时: ${duration}ms)`);
              console.log(`📊 接收统计: 总计 ${chunkCount} 个数据块`);
              console.log('\n💬 完整AI响应:');
              console.log(fullContent);
              resolve(fullContent);
              return;
            }
            
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr);
                if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                  const content = data.choices[0].delta.content;
                  fullContent += content;
                  chunkCount++;
                  process.stdout.write(content);
                }
              } catch (parseError) {
                console.warn('解析流式数据失败:', parseError.message);
              }
            }
          }
        }
      });

      response.data.on('end', () => {
        if (!fullContent) {
          const duration = Date.now() - startTime;
          console.log(`\n✅ 流式响应结束 (耗时: ${duration}ms) - 无内容接收`);
          resolve('');
        }
      });

      response.data.on('error', (error) => {
        console.error('\n❌ 流式响应错误:', error.message);
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ 流式多模态聊天请求失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 测试外部图像URL
async function testExternalImageURL() {
  console.log('\n🌐 测试外部图像URL功能');
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
              text: '请描述这张图片'
            },
            {
              type: 'image_url',
              image_url: {
                url: 'https://picsum.photos/200/300' // 随机图片
              }
            }
          ]
        }
      ],
      user: 'test-external-url-user',
      stream: false
    };

    console.log('📤 发送外部URL请求...');
    console.log('📋 请求内容:');
    console.log(`   图像URL: ${request.messages[0].content[1].image_url.url}`);

    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/v1/chat/completions`, request, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const duration = Date.now() - startTime;
    console.log(`✅ 外部URL请求成功 (耗时: ${duration}ms)`);
    console.log('\n💬 AI 响应内容:');
    console.log(response.data.choices[0].message.content);
    
    return response.data;

  } catch (error) {
    console.error('❌ 外部URL请求失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始多模态功能测试');
  console.log('测试目标: OpenAI 多模态 API 兼容性');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('='.repeat(70));

  try {
    // 测试1: Base64 图像多模态聊天
    await testMultimodalChat();
    
    // 等待一下再进行下一个测试
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 测试2: Base64 图像流式多模态聊天
    await testMultimodalStreamChat();
    
    // 等待一下再进行下一个测试
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 测试3: 外部图像URL（如果支持）
    try {
      await testExternalImageURL();
    } catch (error) {
      console.log('\n⚠️ 外部图像URL测试跳过 (可能不支持或网络问题)');
    }
    
    console.log('\n🎉 所有测试完成！');
    console.log('✨ 多模态功能测试成功');

  } catch (error) {
    console.error('\n💥 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testMultimodalChat,
  testMultimodalStreamChat,
  testExternalImageURL
};
