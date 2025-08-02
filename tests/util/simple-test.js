const axios = require('axios');

async function simpleTest() {
  console.log('Simple Dify connection test');
  
  try {
    console.log('Testing basic connection...');
    // 从配置文件读取Dify服务器地址
    const config = require('../../config.json');
    const modelConfig = Object.values(config.model_mappings)[0];
    const difyBaseURL = modelConfig.dify_base_url;
    
    const response = await axios.get(difyBaseURL, { timeout: 5000 });
    console.log('Connection successful:', response.status);
  } catch (error) {
    console.log('Connection failed:', error.message);
    if (error.code) console.log('Error code:', error.code);
  }
}

simpleTest();
