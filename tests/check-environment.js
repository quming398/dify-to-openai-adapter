const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 测试配置
const BASE_URL = 'http://localhost:3000';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(color + message + colors.reset);
}

// 检查服务状态
async function checkServiceHealth() {
  console.log('🏥 检查服务健康状态...');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    colorLog(colors.green, '✅ 服务健康检查通过');
    console.log('📊 服务状态:', response.data.status);
    console.log('🚀 服务启动时间:', response.data.uptime);
    return true;
  } catch (error) {
    colorLog(colors.red, '❌ 服务健康检查失败');
    console.log('错误信息:', error.message);
    if (error.code === 'ECONNREFUSED') {
      colorLog(colors.yellow, '💡 提示: 服务器可能未启动，请先运行 npm start');
    }
    return false;
  }
}

// 检查模型配置
async function checkModelsConfig() {
  console.log('\n🤖 检查模型配置...');
  console.log('='.repeat(50));
  
  try {
    // 检查配置文件
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) {
      colorLog(colors.red, '❌ config.json 文件不存在');
      colorLog(colors.yellow, '💡 提示: 请复制 config.template.json 为 config.json 并配置');
      return false;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const modelMappings = config.model_mappings || {};
    const modelCount = Object.keys(modelMappings).length;
    
    console.log(`📋 已配置模型数量: ${modelCount}`);
    
    if (modelCount === 0) {
      colorLog(colors.yellow, '⚠️ 警告: 未配置任何模型映射');
      return false;
    }
    
    // 检查每个模型配置
    for (const [modelId, config] of Object.entries(modelMappings)) {
      console.log(`  🔸 ${modelId}:`);
      console.log(`    应用名称: ${config.app_name || 'N/A'}`);
      console.log(`    应用类型: ${config.app_type || 'N/A'}`);
      console.log(`    Dify URL: ${config.dify_base_url || 'N/A'}`);
      console.log(`    API Key: ${config.dify_api_key ? config.dify_api_key.substring(0, 10) + '...' : 'N/A'}`);
    }
    
    colorLog(colors.green, '✅ 模型配置检查完成');
    return true;
    
  } catch (error) {
    colorLog(colors.red, '❌ 模型配置检查失败');
    console.log('错误信息:', error.message);
    return false;
  }
}

// 检查API可用性
async function checkAPIAvailability() {
  console.log('\n🔌 检查 API 可用性...');
  console.log('='.repeat(50));
  
  const endpoints = [
    { path: '/v1/models', name: '模型列表' },
    { path: '/health/sessions', name: '会话管理' }
  ];
  
  let allPassed = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint.path}`, { 
        timeout: 3000,
        headers: { 'Authorization': 'Bearer test-key' }
      });
      colorLog(colors.green, `✅ ${endpoint.name} API 可用 (${response.status})`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        colorLog(colors.green, `✅ ${endpoint.name} API 可用 (需要认证)`);
      } else {
        colorLog(colors.red, `❌ ${endpoint.name} API 不可用`);
        console.log(`   错误: ${error.message}`);
        allPassed = false;
      }
    }
  }
  
  return allPassed;
}

// 检测测试环境
async function checkTestEnvironment() {
  console.log('\n🧪 检查测试环境...');
  console.log('='.repeat(50));
  
  const testDirs = ['unit', 'integration', 'api', 'multimodal', 'session', 'util'];
  let testCount = 0;
  
  for (const dir of testDirs) {
    const testDir = path.join(__dirname, 'tests', dir);
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir).filter(f => f.endsWith('.js'));
      testCount += files.length;
      console.log(`  📁 ${dir}: ${files.length} 个测试文件`);
    } else {
      colorLog(colors.yellow, `  ⚠️ ${dir}: 目录不存在`);
    }
  }
  
  console.log(`📊 总测试文件数: ${testCount}`);
  
  if (testCount === 0) {
    colorLog(colors.red, '❌ 未找到测试文件');
    return false;
  }
  
  colorLog(colors.green, '✅ 测试环境检查完成');
  return true;
}

// 生成测试报告
function generateReport(results) {
  console.log('\n📋 检查结果汇总');
  console.log('='.repeat(70));
  
  const checks = [
    { name: '服务健康状态', result: results.health },
    { name: '模型配置', result: results.models },
    { name: 'API 可用性', result: results.api },
    { name: '测试环境', result: results.tests }
  ];
  
  let passedCount = 0;
  
  checks.forEach(check => {
    const status = check.result ? '✅ 通过' : '❌ 失败';
    const color = check.result ? colors.green : colors.red;
    colorLog(color, `${check.name}: ${status}`);
    if (check.result) passedCount++;
  });
  
  console.log('\n' + '='.repeat(70));
  
  if (passedCount === checks.length) {
    colorLog(colors.green, '🎉 所有检查都通过了！系统准备就绪。');
    console.log('\n🚀 你可以开始运行测试了：');
    console.log('   npm run test:all');
    console.log('   或者 run-tests.bat');
  } else {
    colorLog(colors.yellow, `⚠️ ${passedCount}/${checks.length} 项检查通过`);
    console.log('\n🔧 建议解决以下问题后再运行测试：');
    
    checks.forEach(check => {
      if (!check.result) {
        console.log(`   • ${check.name}`);
      }
    });
  }
  
  return passedCount === checks.length;
}

// 主函数
async function main() {
  console.log('🔍 Dify to OpenAI API 适配器 - 环境检查工具');
  console.log('检查时间:', new Date().toLocaleString());
  console.log('='.repeat(70));
  
  const results = {
    health: await checkServiceHealth(),
    models: await checkModelsConfig(),
    api: await checkAPIAvailability(),
    tests: await checkTestEnvironment()
  };
  
  const allPassed = generateReport(results);
  
  process.exit(allPassed ? 0 : 1);
}

// 运行检查
main().catch(error => {
  colorLog(colors.red, '\n💥 检查过程中发生错误:');
  console.error(error);
  process.exit(1);
});
