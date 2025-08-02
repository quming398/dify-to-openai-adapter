const axios = require('axios');
const FormData = require('form-data');

// 测试Dify文件上传API的可访问性
async function testDifyFileUpload() {
  console.log('🧪 测试Dify文件上传API可访问性');
  console.log('='.repeat(50));

  // 从配置文件读取敏感信息
  const config = require('../../config.json');
  const modelConfig = Object.values(config.model_mappings)[0]; // 使用第一个模型配置
  const difyBaseURL = modelConfig.dify_base_url;
  const difyApiKey = modelConfig.dify_api_key;
  
  try {
    // 创建一个简单的测试图像文件
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const imageBuffer = Buffer.from(testImageBase64, 'base64');
    
    console.log('📤 尝试上传测试图像到Dify...');
    console.log(`🌐 Dify URL: ${difyBaseURL}/v1/files/upload`);
    console.log(`🔑 API Key: ${difyApiKey.substring(0, 15)}...`);
    
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: 'test_image.png',
      contentType: 'image/png'
    });
    formData.append('user', 'test-user');
    
    const response = await axios.post(`${difyBaseURL}/v1/files/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${difyApiKey}`
      },
      timeout: 10000
    });
    
    console.log('✅ Dify文件上传API测试成功！');
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;

  } catch (error) {
    console.error('❌ Dify文件上传API测试失败:', error.message);
    
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   状态文本:', error.response.statusText);
      console.error('   响应头:', JSON.stringify(error.response.headers, null, 2));
      
      if (error.response.data) {
        const responseData = typeof error.response.data === 'string' 
          ? error.response.data.substring(0, 500) + (error.response.data.length > 500 ? '...' : '')
          : JSON.stringify(error.response.data, null, 2);
        console.error('   响应数据:', responseData);
      }
    } else if (error.request) {
      console.error('   请求错误: 无响应');
      console.error('   请求配置:', error.config?.url);
    } else {
      console.error('   配置错误:', error.message);
    }
    
    throw error;
  }
}

// 测试基本网络连接
async function testDifyConnection() {
  console.log('\n🌐 测试Dify服务器连接');
  console.log('='.repeat(50));
  
  // 从配置文件读取Dify服务器地址
  const config = require('../../config.json');
  const modelConfig = Object.values(config.model_mappings)[0];
  const difyBaseURL = modelConfig.dify_base_url;
  
  try {
    console.log(`📡 尝试连接: ${difyBaseURL}`);
    
    const response = await axios.get(difyBaseURL, {
      timeout: 5000
    });
    
    console.log('✅ Dify服务器连接成功');
    console.log(`📊 状态码: ${response.status}`);
    
  } catch (error) {
    console.error('❌ Dify服务器连接失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   原因: 连接被拒绝，服务器可能未运行或防火墙阻止');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   原因: 连接超时，网络可能有问题');
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始Dify API连接测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('='.repeat(70));

  try {
    // 测试1: 基本连接
    await testDifyConnection();
    
    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 测试2: 文件上传API
    await testDifyFileUpload();
    
    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('\n💥 测试过程中发生错误');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testDifyFileUpload, testDifyConnection };
