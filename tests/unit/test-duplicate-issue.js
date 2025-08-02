const axios = require('axios');

// 测试重复回答问题
async function testDuplicateResponse() {
  console.log('🔍 测试重复回答问题...\n');
  
  const BASE_URL = 'http://localhost:3000';
  const API_KEY = 'test-key';
  
  try {
    console.log('发送流式请求...');
    const response = await axios.post(
      `${BASE_URL}/v1/chat/completions`, 
      {
        model: 'dify-qwen',
        messages: [
          { role: 'user', content: '你好' }
        ],
        stream: true,
        user: 'test-user'
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );
    
    console.log('开始接收流式响应...\n');
    
    let chunkCount = 0;
    let messageContent = '';
    let responseChunks = [];
    
    response.data.on('data', (chunk) => {
      const chunkStr = chunk.toString();
      chunkCount++;
      
      console.log(`--- Chunk ${chunkCount} ---`);
      console.log(chunkStr);
      
      // 解析每个 chunk
      const lines = chunkStr.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices?.[0]?.delta?.content) {
              const content = data.choices[0].delta.content;
              messageContent += content;
              responseChunks.push(content);
              console.log(`  Content: "${content}"`);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    });
    
    return new Promise((resolve) => {
      response.data.on('end', () => {
        console.log('\n=== 分析结果 ===');
        console.log(`总 chunks: ${chunkCount}`);
        console.log(`完整内容: "${messageContent}"`);
        console.log(`内容片段数量: ${responseChunks.length}`);
        
        // 检查是否有重复内容
        const uniqueChunks = [...new Set(responseChunks)];
        console.log(`唯一内容片段: ${uniqueChunks.length}`);
        
        if (responseChunks.length > uniqueChunks.length) {
          console.log('🚨 发现重复内容！');
          
          // 统计每个 chunk 的出现次数
          const chunkCounts = {};
          responseChunks.forEach(chunk => {
            chunkCounts[chunk] = (chunkCounts[chunk] || 0) + 1;
          });
          
          console.log('\n重复内容统计:');
          Object.entries(chunkCounts).forEach(([chunk, count]) => {
            if (count > 1) {
              console.log(`"${chunk}" 出现 ${count} 次`);
            }
          });
        } else {
          console.log('✅ 没有发现重复内容');
        }
        
        resolve();
      });
    });
    
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('错误状态:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
  }
}

// 执行测试
async function main() {
  await testDuplicateResponse();
  console.log('\n测试完成');
}

// 直接执行
main().catch(console.error);

module.exports = { testDuplicateResponse };
