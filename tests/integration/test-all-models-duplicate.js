const axios = require('axios');

// 测试不同模型的重复回答问题
async function testDifferentModels() {
  console.log('🔍 测试不同模型的重复回答问题...\n');
  
  const BASE_URL = 'http://localhost:3000';
  const API_KEY = 'test-key';
  const models = ['dify-qwen', 'dify-deepseek'];
  
  for (const model of models) {
    console.log(`\n=== 测试模型: ${model} ===`);
    
    try {
      console.log('发送流式请求...');
      const response = await axios.post(
        `${BASE_URL}/v1/chat/completions`, 
        {
          model: model,
          messages: [
            { role: 'user', content: '请简单介绍一下你自己' }
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
      
      let chunkCount = 0;
      let messageContent = '';
      let responseChunks = [];
      
      await new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          const chunkStr = chunk.toString();
          chunkCount++;
          
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
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });
        
        response.data.on('end', () => {
          resolve();
        });
        
        response.data.on('error', reject);
      });
      
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
      
    } catch (error) {
      console.error(`❌ 测试模型 ${model} 失败:`, error.message);
      if (error.response) {
        console.error('错误状态:', error.response.status);
        console.error('错误数据:', error.response.data);
      }
    }
  }
}

// 执行测试
async function main() {
  await testDifferentModels();
  console.log('\n🎉 所有模型测试完成');
}

main().catch(console.error);
