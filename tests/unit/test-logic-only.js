// 简单测试ConversationManager的修复
const ConversationManager = require('./src/services/conversationManager');

console.log('=== 测试 ConversationManager 的 System 消息处理 ===\n');

// 测试单条用户消息 + system消息
const messagesWithSystem = [
  { role: 'system', content: 'User Context:\n\n' },
  { role: 'user', content: '你是谁3333' }
];

console.log('测试消息数组:', JSON.stringify(messagesWithSystem, null, 2));
console.log('总消息数:', messagesWithSystem.length);
console.log('用户消息数:', messagesWithSystem.filter(m => m.role === 'user').length);

const shouldCreateNew = ConversationManager.shouldCreateNewSession(
  messagesWithSystem, 
  'test-user', 
  'test-model'
);

console.log('应该创建新会话?', shouldCreateNew);
console.log('预期结果: true（因为只有1条用户消息）');

// 测试多条用户消息 + system消息
const messagesWithMultipleUsers = [
  { role: 'system', content: 'User Context:\n\n' },
  { role: 'user', content: '你好' },
  { role: 'assistant', content: '你好！' },
  { role: 'user', content: '你记得我说过什么吗？' }
];

console.log('\n测试多条用户消息:');
console.log('总消息数:', messagesWithMultipleUsers.length);
console.log('用户消息数:', messagesWithMultipleUsers.filter(m => m.role === 'user').length);

// 先模拟保存一个会话，这样第二次请求就会检查现有会话
console.log('\n模拟保存一个会话...');
ConversationManager.saveConversation('test-user', 'test-model', 'fake-conversation-id-123');

const shouldCreateNew2 = ConversationManager.shouldCreateNewSession(
  messagesWithMultipleUsers, 
  'test-user', 
  'test-model'
);

console.log('应该创建新会话?', shouldCreateNew2);
console.log('预期结果: false（因为有2条用户消息且存在现有会话）');

// 测试不同用户的会话隔离
console.log('\n测试不同用户的会话隔离:');
const shouldCreateNew3 = ConversationManager.shouldCreateNewSession(
  messagesWithMultipleUsers, 
  'different-user', // 不同用户
  'test-model'
);

console.log('不同用户应该创建新会话?', shouldCreateNew3);
console.log('预期结果: true（因为是不同用户，即使有多条消息）');

console.log('\n=== 测试完成 ===');
