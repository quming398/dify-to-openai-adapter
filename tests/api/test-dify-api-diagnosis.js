const axios = require('axios');
const FormData = require('form-data');

// 从配置文件读取Dify配置
const config = require('../../config.json');
const modelConfig = Object.values(config.model_mappings)[0]; // 使用第一个模型配置

const DIFY_CONFIG = {
  baseURL: modelConfig.dify_base_url,
  apiKey: modelConfig.dify_api_key
};

// 测试不同的Dify API端点
async function testDifyEndpoints() {
  console.log('🔍 开始检测Dify API端点可用性');
  console.log('='.repeat(70));
  
  const testUrls = [
    '/',
    '/v1',
    '/v1/files',
    '/v1/files/upload',
    '/files',
    '/files/upload',
    '/api/v1/files/upload'
  ];
  
  const client = axios.create({
    baseURL: DIFY_CONFIG.baseURL,
    timeout: 5000,
    headers: {
      'Authorization': `Bearer ${DIFY_CONFIG.apiKey}`
    }
  });
  
  for (const url of testUrls) {
    try {
      console.log(`\n🌐 测试端点: ${DIFY_CONFIG.baseURL}${url}`);
      
      const response = await client.get(url);
      
      console.log(`✅ 状态码: ${response.status}`);
      console.log(`📊 响应头:`, JSON.stringify(response.headers, null, 2));
      
      if (response.data) {
        const dataStr = typeof response.data === 'string' 
          ? response.data.substring(0, 200) + '...'
          : JSON.stringify(response.data, null, 2);
        console.log(`📦 响应数据:`, dataStr);
      }
      
    } catch (error) {
      console.log(`❌ 失败: ${error.response?.status || error.code} - ${error.message}`);
      
      if (error.response?.status === 404) {
        console.log(`   → 端点不存在`);
      } else if (error.response?.status === 405) {
        console.log(`   → 方法不允许 (端点存在但不支持GET)`);
      } else if (error.response?.status === 401) {
        console.log(`   → 认证失败`);
      }
    }
  }
}

// 测试POST文件上传端点
async function testFileUploadEndpoints() {
  console.log('\n📤 测试文件上传端点 (POST)');
  console.log('='.repeat(70));
  
  const uploadUrls = [
    '/v1/files/upload',
    '/files/upload',
    '/api/v1/files/upload'
  ];
  
  // 创建测试图像
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const imageBuffer = Buffer.from(testImageBase64, 'base64');
  
  const client = axios.create({
    baseURL: DIFY_CONFIG.baseURL,
    timeout: 10000
  });
  
  for (const url of uploadUrls) {
    try {
      console.log(`\n📤 测试上传端点: ${DIFY_CONFIG.baseURL}${url}`);
      
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: 'test_image.png',
        contentType: 'image/png'
      });
      formData.append('user', 'test-user');
      
      console.log(`🔑 使用API Key: ${DIFY_CONFIG.apiKey.substring(0, 15)}...`);
      
      const response = await client.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${DIFY_CONFIG.apiKey}`
        }
      });
      
      console.log(`✅ 上传成功! 状态码: ${response.status}`);
      console.log(`📊 响应数据:`, JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log(`❌ 上传失败: ${error.response?.status || error.code} - ${error.message}`);
      
      if (error.response) {
        console.log(`   状态文本: ${error.response.statusText}`);
        
        if (error.response.data) {
          const errorData = typeof error.response.data === 'string'
            ? error.response.data.substring(0, 300) + '...'
            : JSON.stringify(error.response.data, null, 2);
          console.log(`   错误数据:`, errorData);
        }
      }
    }
  }
}

// 测试Dify聊天API (验证基础连接)
async function testChatAPI() {
  console.log('\n💬 测试Dify聊天API (验证基础连接)');
  console.log('='.repeat(70));
  
  try {
    const client = axios.create({
      baseURL: DIFY_CONFIG.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIFY_CONFIG.apiKey}`
      }
    });
    
    console.log(`🌐 测试URL: ${DIFY_CONFIG.baseURL}/v1/chat-messages`);
    
    const payload = {
      inputs: {},
      query: "Hello, this is a test message",
      response_mode: "blocking",
      user: "test-user"
    };
    
    console.log(`📤 发送测试消息...`);
    
    const response = await client.post('/v1/chat-messages', payload);
    
    console.log(`✅ 聊天API测试成功!`);
    console.log(`📊 状态码: ${response.status}`);
    console.log(`💬 AI回复:`, response.data.answer || response.data);
    
  } catch (error) {
    console.log(`❌ 聊天API测试失败: ${error.response?.status || error.code} - ${error.message}`);
    
    if (error.response?.data) {
      console.log(`   错误详情:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 主测试函数
async function runDiagnostics() {
  console.log('🔧 Dify API 诊断工具');
  console.log('目标服务器:', DIFY_CONFIG.baseURL);
  console.log('测试时间:', new Date().toLocaleString());
  console.log('='.repeat(70));

  try {
    // 测试1: 端点检测
    await testDifyEndpoints();
    
    // 等待
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 测试2: 文件上传
    await testFileUploadEndpoints();
    
    // 等待
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 测试3: 基础聊天API
    await testChatAPI();
    
    console.log('\n🎉 诊断完成!');
    console.log('请根据上述结果分析问题原因');

  } catch (error) {
    console.error('\n💥 诊断过程中发生错误:', error.message);
  }
}

// 运行诊断
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = { testDifyEndpoints, testFileUploadEndpoints, testChatAPI };
