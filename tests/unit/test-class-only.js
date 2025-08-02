// 只测试类定义，不包含模块导出部分
const fs = require('fs');

// 读取文件内容
const code = fs.readFileSync('./src/services/conversationManager.js', 'utf8');

// 找到类定义结束的位置 (第291行，数组索引290)
const lines = code.split('\n');
const classEndIndex = 290; // 数组索引从0开始

console.log('Line 290 (array index 289):', lines[289]);
console.log('Line 291 (array index 290):', lines[290]);
console.log('Line 292 (array index 291):', lines[291]);

if (classEndIndex === -1) {
  console.log('Could not find class end marker');
  process.exit(1);
}

// 提取只包含类定义的代码
const classCode = lines.slice(0, classEndIndex).join('\n');

console.log('Testing class definition...');
console.log('Class code ends at line:', classEndIndex);
console.log('Class code length:', classCode.length);

try {
  console.log('About to eval class code...');
  // 执行类定义
  eval(classCode);
  console.log('Class code evaluated successfully.');
  
  // 尝试实例化
  console.log('Creating instance...');
  const instance = new ConversationManager(120);
  
  console.log('Success! Instance created.');
  console.log('Constructor name:', instance.constructor.name);
  console.log('Available methods:');
  
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
    .filter(name => typeof instance[name] === 'function' && name !== 'constructor');
  
  methods.forEach(method => {
    console.log(`  - ${method}()`);
  });
  
  // 测试核心方法
  console.log('\nTesting getStats():');
  const stats = instance.getStats();
  console.log(stats);
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
