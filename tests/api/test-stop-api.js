/**
 * 测试停止响应 API 功能
 * 
 * 这个脚本测试：
 * 1. 启动一个流式聊天请求
 * 2. 在响应过程中调用停止 API
 * 3. 验证停止功能是否正常工作
 */

const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3000';
const API_KEY = 'sk-test'; // 确保这个 API key 在 config.json 中配置
const MODEL = 'dify-qwen'; // 使用配置的模型

// 测试停止响应功能
async function testStopResponse() {
  console.log('🧪 开始测试停止响应 API...\n');
  
  try {
    console.log('📤 1. 发送流式聊天请求...');
    
    // 发送一个可能需要较长时间回答的问题
    const chatRequest = {
      model: MODEL,
      messages: [
        {
          role: "user",
          content: "请详细解释机器学习的各种算法，包括监督学习、无监督学习和强化学习的具体实现方法，并给出每种算法的应用场景和代码示例。请写得尽可能详细，至少1000字。"
        }
      ],
      stream: true,
      user: "test-stop-user"
    };

    // 开始流式请求
    const response = await axios.post(`${BASE_URL}/v1/chat/completions`, chatRequest, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    console.log(`✅ 聊天请求已发送，开始接收流式数据...`);
    
    let taskId = null;
    let chunkCount = 0;
    let hasCalledStop = false;
    
    // 处理流式响应
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const data = JSON.parse(line.substring(6));
            
            // 提取 task_id（应该在每个响应块的 id 字段中）
            if (data.id && !taskId) {
              taskId = data.id;
              console.log(`📋 捕获到 task_id: ${taskId}`);
            }
            
            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
              chunkCount++;
              process.stdout.write('.');
              
              // 在收到几个响应块后尝试停止
              if (chunkCount === 3 && taskId && !hasCalledStop) {
                hasCalledStop = true;
                console.log(`\n\n🛑 2. 在第 ${chunkCount} 个响应块后尝试停止响应...`);
                testStopRequest(taskId);
              }
            }
          } catch (e) {
            // 忽略解析错误（可能是不完整的 JSON）
          }
        }
      }
    });

    response.data.on('end', () => {
      console.log('\n📋 流式响应完成');
      if (!taskId) {
        console.log('⚠️  警告：未能捕获到 task_id，可能无法测试停止功能');
      }
    });

    response.data.on('error', (error) => {
      console.error('❌ 流式响应错误:', error.message);
    });

  } catch (error) {
    console.error('❌ 发送聊天请求失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误数据:', error.response.data);
    }
  }
}

// 测试停止请求
async function testStopRequest(taskId) {
  try {
    console.log(`📤 发送停止请求，task_id: ${taskId}`);
    
    const stopRequest = {
      user: "test-stop-user",
      model: MODEL
    };

    const stopResponse = await axios.post(
      `${BASE_URL}/v1/chat/completions/${taskId}/stop`, 
      stopRequest,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ 停止请求成功!');
    console.log('📊 停止响应:', JSON.stringify(stopResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ 停止请求失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 测试无效 task_id 的处理
async function testInvalidTaskId() {
  console.log('\n🧪 3. 测试无效 task_id 的错误处理...');
  
  try {
    const stopRequest = {
      user: "test-stop-user",
      model: MODEL
    };

    await axios.post(
      `${BASE_URL}/v1/chat/completions/invalid-task-id-123/stop`, 
      stopRequest,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('✅ 无效 task_id 正确返回 404 错误');
      console.log('📊 错误响应:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ 无效 task_id 测试失败:', error.message);
    }
  }
}

// 测试缺少参数的处理
async function testMissingParameters() {
  console.log('\n🧪 4. 测试缺少参数的错误处理...');
  
  try {
    // 测试缺少 user 参数
    await axios.post(
      `${BASE_URL}/v1/chat/completions/test-task-id/stop`, 
      { model: MODEL }, // 缺少 user 参数
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ 缺少 user 参数正确返回 400 错误');
      console.log('📊 错误响应:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ 缺少参数测试失败:', error.message);
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 停止响应 API 测试开始\n');
  console.log('⚙️  配置信息:');
  console.log(`   服务器: ${BASE_URL}`);
  console.log(`   模型: ${MODEL}`);
  console.log(`   API Key: ${API_KEY}`);
  console.log('=' * 50 + '\n');

  // 等待一下让流式响应有时间启动
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 运行所有测试
  await testStopResponse();
  await testInvalidTaskId();
  await testMissingParameters();
  
  console.log('\n🎉 所有测试完成!');
  
  // 给一些时间让异步操作完成
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testStopResponse,
  testStopRequest,
  testInvalidTaskId,
  testMissingParameters
};
