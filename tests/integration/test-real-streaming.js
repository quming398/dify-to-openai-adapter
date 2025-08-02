const axios = require('axios');

// 测试真正的流式响应
async function testRealStreaming() {
    console.log('🚀 测试真正的流式响应适配...');
    
    // 启动服务器测试
    const serverURL = 'http://localhost:3000';
    
    try {
        // 测试 dify-deepseek 流式模式
        console.log('\n=== 测试 dify-deepseek 流式模式 ===');
        
        const response = await axios.post(`${serverURL}/v1/chat/completions`, {
            model: 'dify-deepseek',
            messages: [
                { role: 'user', content: '你好，请介绍一下自己' }
            ],
            stream: true,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': 'Bearer test-key',
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });
        
        console.log('✓ 流式请求发送成功');
        console.log('响应状态:', response.status);
        console.log('Content-Type:', response.headers['content-type']);
        
        return new Promise((resolve, reject) => {
            let chunks = [];
            let chunkCount = 0;
            let totalContent = '';
            
            response.data.on('data', (chunk) => {
                const chunkStr = chunk.toString();
                chunks.push(chunkStr);
                chunkCount++;
                
                console.log(`\n--- Chunk ${chunkCount} ---`);
                console.log(chunkStr);
                
                // 解析 OpenAI 流式格式
                const lines = chunkStr.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') {
                            console.log('✓ 收到 [DONE] 标记');
                        } else if (dataStr) {
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.choices && data.choices[0].delta.content) {
                                    totalContent += data.choices[0].delta.content;
                                    console.log(`内容: "${data.choices[0].delta.content}"`);
                                }
                                if (data.choices && data.choices[0].finish_reason === 'stop') {
                                    console.log('✓ 收到完成标记');
                                }
                            } catch (e) {
                                console.log('解析错误:', e.message);
                            }
                        }
                    }
                }
            });
            
            response.data.on('end', () => {
                console.log(`\n✓ 流式响应完成`);
                console.log(`总计 ${chunkCount} 个数据块`);
                console.log(`完整内容: "${totalContent}"`);
                console.log(`内容长度: ${totalContent.length} 字符`);
                resolve({ chunks, totalContent, chunkCount });
            });
            
            response.data.on('error', (error) => {
                console.error('✗ 流式响应错误:', error);
                reject(error);
            });
        });
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('错误状态:', error.response.status);
            console.error('错误数据:', error.response.data);
        }
        throw error;
    }
}

async function testNonStreaming() {
    console.log('\n=== 测试 dify-qwen 非流式模式 ===');
    
    const serverURL = 'http://localhost:3000';
    
    try {
        const response = await axios.post(`${serverURL}/v1/chat/completions`, {
            model: 'dify-qwen',
            messages: [
                { role: 'user', content: '你好' }
            ],
            stream: false
        }, {
            headers: {
                'Authorization': 'Bearer test-key',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✓ 非流式请求成功');
        console.log('响应数据:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('❌ 非流式测试失败:', error.message);
        if (error.response) {
            console.error('错误数据:', error.response.data);
        }
    }
}

async function main() {
    console.log('🧪 Dify 流式适配测试');
    console.log('请确保服务器在 http://localhost:3000 运行');
    
    try {
        // 检查服务器是否运行
        await axios.get('http://localhost:3000/v1/models');
        console.log('✓ 服务器运行正常');
        
        await testRealStreaming();
        await testNonStreaming();
        
        console.log('\n🎉 所有测试完成');
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ 无法连接到服务器');
            console.error('请先启动服务器: npm start 或 node src/index.js');
        } else {
            console.error('❌ 测试失败:', error.message);
        }
    }
}

main();
