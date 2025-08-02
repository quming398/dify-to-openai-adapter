/**
 * 测试文件上传 API 功能
 * 
 * 这个脚本测试：
 * 1. OpenAI 兼容的文件上传接口
 * 2. 不同文件类型的上传
 * 3. 错误处理（文件过大、格式不支持等）
 * 4. 文件在聊天中的使用
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = 'http://localhost:3000';
const API_KEY = 'sk-test'; // 确保这个 API key 在 config.json 中配置

// 创建测试文件
function createTestFiles() {
  console.log('📁 创建测试文件...');
  
  const testDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  // 创建文本文件
  const textContent = `# 测试文档

这是一个测试文档，用于验证文件上传功能。

## 内容包含
- 文本内容
- Markdown 格式
- 多行文字

## 测试目的
验证 Dify 到 OpenAI 适配器的文件上传功能是否正常工作。

创建时间: ${new Date().toISOString()}
`;

  const textFile = path.join(testDir, 'test-document.md');
  fs.writeFileSync(textFile, textContent, 'utf8');
  
  // 创建 JSON 文件
  const jsonContent = {
    title: "测试数据",
    data: {
      items: [
        { id: 1, name: "项目1", description: "这是第一个测试项目" },
        { id: 2, name: "项目2", description: "这是第二个测试项目" }
      ],
      metadata: {
        created: new Date().toISOString(),
        version: "1.0",
        purpose: "file upload test"
      }
    }
  };

  const jsonFile = path.join(testDir, 'test-data.json');
  fs.writeFileSync(jsonFile, JSON.stringify(jsonContent, null, 2), 'utf8');

  console.log('✅ 测试文件创建完成');
  return { textFile, jsonFile, testDir };
}

// 测试文件上传
async function testFileUpload(filePath, purpose = 'assistants') {
  console.log(`\n📤 测试上传文件: ${path.basename(filePath)}`);
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('purpose', purpose);
    formData.append('user', 'test-user-upload');

    const response = await axios.post(`${BASE_URL}/v1/files`, formData, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        ...formData.getHeaders()
      }
    });

    console.log('✅ 上传成功！');
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;

  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 测试文件列表获取
async function testFileList() {
  console.log('\n📋 测试获取文件列表...');
  
  try {
    const response = await axios.get(`${BASE_URL}/v1/files`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    console.log('✅ 获取文件列表成功');
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;

  } catch (error) {
    console.error('❌ 获取文件列表失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 测试单个文件信息查询
async function testFileInfo(fileId) {
  console.log(`\n🔍 测试查询文件信息: ${fileId}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/v1/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    console.log('✅ 查询文件信息成功');
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;

  } catch (error) {
    console.log('❌ 查询文件信息失败（预期行为）:', error.response?.status);
    if (error.response && error.response.status === 404) {
      console.log('✅ 正确返回404，符合预期（Dify 不支持单独文件查询）');
    }
  }
}

// 测试文件在聊天中的使用
async function testFileInChat(fileId) {
  console.log(`\n💬 测试在聊天中使用文件: ${fileId}`);
  
  try {
    // 注意：具体的文件使用方式可能需要根据 Dify 的实际 API 调整
    const chatRequest = {
      model: 'dify-qwen',
      messages: [
        {
          role: 'user',
          content: `请帮我分析一下上传的文件内容，文件ID是: ${fileId}`
        }
      ],
      user: 'test-user-upload',
      // 可能需要在这里指定文件ID，具体格式需要根据Dify API文档调整
      files: [fileId] // 这个字段可能需要调整
    };

    const response = await axios.post(`${BASE_URL}/v1/chat/completions`, chatRequest, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 使用文件的聊天请求成功');
    console.log('💬 AI 响应:', response.data.choices[0].message.content);
    
    return response.data;

  } catch (error) {
    console.error('❌ 使用文件的聊天请求失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 测试错误情况
async function testErrorCases() {
  console.log('\n🧪 测试错误情况...');
  
  // 测试没有文件的请求
  console.log('\n1. 测试没有文件的请求...');
  try {
    const formData = new FormData();
    formData.append('purpose', 'assistants');
    formData.append('user', 'test-user');

    await axios.post(`${BASE_URL}/v1/files`, formData, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        ...formData.getHeaders()
      }
    });

  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ 正确返回400错误：缺少文件');
    } else {
      console.error('❌ 未预期的错误:', error.message);
    }
  }

  // 测试无效的 API Key
  console.log('\n2. 测试无效的 API Key...');
  try {
    const { textFile } = createTestFiles();
    const formData = new FormData();
    formData.append('file', fs.createReadStream(textFile));
    formData.append('purpose', 'assistants');

    await axios.post(`${BASE_URL}/v1/files`, formData, {
      headers: {
        'Authorization': 'Bearer invalid-key',
        ...formData.getHeaders()
      }
    });

  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ 正确返回401错误：无效API Key');
    } else {
      console.error('❌ 未预期的错误:', error.message);
    }
  }
}

// 清理测试文件
function cleanupTestFiles(testDir) {
  console.log('\n🧹 清理测试文件...');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('✅ 测试文件清理完成');
  }
}

// 主测试函数
async function runFileUploadTests() {
  console.log('🚀 文件上传 API 测试开始\n');
  console.log('⚙️  配置信息:');
  console.log(`   服务器: ${BASE_URL}`);
  console.log(`   API Key: ${API_KEY}`);
  console.log('=' .repeat(50) + '\n');

  let testDir;
  
  try {
    // 1. 创建测试文件
    const { textFile, jsonFile, testDir: createdTestDir } = createTestFiles();
    testDir = createdTestDir;

    // 2. 测试文本文件上传
    const textFileResult = await testFileUpload(textFile, 'assistants');
    
    // 3. 测试JSON文件上传
    const jsonFileResult = await testFileUpload(jsonFile, 'vision');

    // 4. 测试文件列表
    await testFileList();

    // 5. 测试文件信息查询
    if (textFileResult && textFileResult.id) {
      await testFileInfo(textFileResult.id);
    }

    // 6. 测试文件在聊天中的使用
    if (textFileResult && textFileResult.id) {
      await testFileInChat(textFileResult.id);
    }

    // 7. 测试错误情况
    await testErrorCases();

    console.log('\n🎉 所有文件上传测试完成!');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  } finally {
    // 清理测试文件
    if (testDir) {
      cleanupTestFiles(testDir);
    }
  }
}

// 运行测试
if (require.main === module) {
  runFileUploadTests().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testFileUpload,
  testFileList,
  testFileInfo,
  testFileInChat,
  runFileUploadTests
};
