// 测试 conversationManager 是否正确导出和可用
const conversationManager = require('./src/services/conversationManager');

console.log('Testing conversationManager...');
console.log('Type:', typeof conversationManager);
console.log('Constructor:', conversationManager.constructor?.name);
console.log('Available methods:');

// 列出所有可用的方法和属性
for (const prop in conversationManager) {
  if (typeof conversationManager[prop] === 'function') {
    console.log(`  - ${prop}(): function`);
  } else {
    console.log(`  - ${prop}: ${typeof conversationManager[prop]}`);
  }
}

// 尝试调用 getStats 方法
try {
  const stats = conversationManager.getStats();
  console.log('getStats() works! Result:', stats);
} catch (error) {
  console.error('getStats() failed:', error.message);
}

// 测试其他核心方法
try {
  const shouldCreate = conversationManager.shouldCreateNewSession(['test'], 'test-user', 'test-model');
  console.log('shouldCreateNewSession() works! Result:', shouldCreate);
} catch (error) {
  console.error('shouldCreateNewSession() failed:', error.message);
}
