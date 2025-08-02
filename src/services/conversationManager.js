/**
 * 会话管理器 - 智能会话管理，基于消息数量判断是否创建新会话
 * 支持可配置的会话超时时间
 */
class ConversationManager {
  constructor(sessionTimeoutMinutes = 120) {
    // 存储会话映射 {sessionKey: conversationId}
    // sessionKey 格式: "user:model" 或 "apiKey:model"
    this.conversations = new Map();
    
    // 存储会话的最后活动时间 {sessionKey: timestamp}
    this.lastActivity = new Map();
    
    // 可选：支持自定义会话ID的映射（通过Header传递）
    this.customSessionMapping = new Map();
    
    // 会话超时时间（可配置，默认2小时）
    this.sessionTimeout = sessionTimeoutMinutes * 60 * 1000;
    
    console.log(`[ConversationManager] Initialized with session timeout: ${sessionTimeoutMinutes} minutes`);
    
    // 定期清理过期会话
    this.startCleanupTimer();
  }

  /**
   * 判断是否应该创建新会话
   * 核心逻辑：如果只有一条消息，则创建新会话；多条消息则继续现有会话
   * @param {Array} messages - OpenAI 格式的消息数组
   * @param {string} userIdentifier - 用户标识
   * @param {string} modelId - 模型ID
   * @param {string} customSessionId - 可选的自定义会话ID
   * @returns {boolean} 是否应该创建新会话
   */  shouldCreateNewSession(messages, userIdentifier, modelId = 'default', customSessionId = null) {
    // 1. 只计算用户消息数量，system消息不算在对话历史中
    const userMessages = (messages || []).filter(msg => msg.role === 'user');
    if (userMessages.length <= 1) {
      console.log(`[ConversationManager] Single user message detected (${userMessages.length}/${messages?.length || 0} total), creating new session`);
      return true;
    }
    
    // 2. 如果有自定义会话ID，检查是否存在对应的映射
    if (customSessionId) {
      const exists = this.customSessionMapping.has(customSessionId);
      if (!exists) {
        console.log(`[ConversationManager] Custom session ID not found: ${customSessionId}, creating new session`);
        return true;
      }
    }
    
    // 3. 检查现有会话是否存在且未过期
    const sessionKey = `${userIdentifier}:${modelId}`;
    if (!this.conversations.has(sessionKey)) {
      console.log(`[ConversationManager] No existing session found for ${sessionKey}, creating new session`);
      return true;
    }
    
    // 4. 检查会话是否过期
    const lastActivity = this.lastActivity.get(sessionKey) || 0;
    const now = Date.now();
    if (now - lastActivity >= this.sessionTimeout) {
      console.log(`[ConversationManager] Session expired for ${sessionKey}, creating new session`);
      this.cleanupSession(sessionKey);
      return true;
    }
      console.log(`[ConversationManager] Continuing existing session for ${sessionKey} (${userMessages?.length || 0} user messages, ${messages?.length || 0} total messages)`);
    return false;
  }

  /**
   * 获取现有会话的 conversation_id
   * @param {string} userIdentifier - 用户标识
   * @param {string} modelId - 模型ID
   * @param {string} customSessionId - 可选的自定义会话ID
   * @returns {string|null} conversation_id 或 null
   */
  getExistingConversation(userIdentifier, modelId = 'default', customSessionId = null) {
    // 优先使用自定义会话ID
    if (customSessionId && this.customSessionMapping.has(customSessionId)) {
      const conversationId = this.customSessionMapping.get(customSessionId);
      console.log(`[ConversationManager] Found conversation via custom session ID: ${customSessionId} -> ${conversationId?.substring(0, 8)}...`);
      return conversationId;
    }
    
    // 使用标准的用户+模型会话
    const sessionKey = `${userIdentifier}:${modelId}`;
    
    if (this.conversations.has(sessionKey)) {
      const lastActivity = this.lastActivity.get(sessionKey) || 0;
      const now = Date.now();
      
      if (now - lastActivity < this.sessionTimeout) {
        // 更新最后活动时间
        this.lastActivity.set(sessionKey, now);
        const conversationId = this.conversations.get(sessionKey);
        console.log(`[ConversationManager] Using existing conversation: ${conversationId?.substring(0, 8)}... for ${sessionKey}`);
        return conversationId;
      } else {
        // 清理过期会话
        this.cleanupSession(sessionKey);
      }
    }
    
    return null;
  }

  /**
   * 保存 conversation_id
   * @param {string} userIdentifier - 用户标识
   * @param {string} modelId - 模型ID
   * @param {string} conversationId - Dify conversation_id
   * @param {string} customSessionId - 可选的自定义会话ID
   */
  saveConversation(userIdentifier, modelId = 'default', conversationId, customSessionId = null) {
    const sessionKey = `${userIdentifier}:${modelId}`;
    const now = Date.now();
    
    // 保存到主会话映射
    const existingId = this.conversations.get(sessionKey);
    if (existingId !== conversationId) {
      this.conversations.set(sessionKey, conversationId);
      console.log(`[ConversationManager] Saved conversation_id: ${conversationId?.substring(0, 8)}... for ${sessionKey}`);
      if (existingId) {
        console.log(`[ConversationManager] Replaced old conversation_id: ${existingId?.substring(0, 8)}...`);
      }
    }
    this.lastActivity.set(sessionKey, now);
    
    // 如果有自定义会话ID，也保存映射
    if (customSessionId) {
      this.customSessionMapping.set(customSessionId, conversationId);
      console.log(`[ConversationManager] Created custom session mapping: ${customSessionId} -> ${conversationId?.substring(0, 8)}...`);
    }
  }

  /**
   * 清理单个会话
   * @param {string} sessionKey - 会话密钥
   */
  cleanupSession(sessionKey) {
    const conversationId = this.conversations.get(sessionKey);
    this.conversations.delete(sessionKey);
    this.lastActivity.delete(sessionKey);
    
    // 清理相关的自定义会话映射
    if (conversationId) {
      for (const [customId, convId] of this.customSessionMapping.entries()) {
        if (convId === conversationId) {
          this.customSessionMapping.delete(customId);
          console.log(`[ConversationManager] Cleaned up custom session mapping: ${customId}`);
        }
      }
    }
    
    console.log(`[ConversationManager] Cleaned up session: ${sessionKey} (${conversationId?.substring(0, 8)}...)`);
  }

  /**
   * 手动结束会话
   * @param {string} userIdentifier - 用户标识
   * @param {string} modelId - 模型ID
   */
  endConversation(userIdentifier, modelId = 'default') {
    const sessionKey = `${userIdentifier}:${modelId}`;
    
    if (this.conversations.has(sessionKey)) {
      this.cleanupSession(sessionKey);
      return true;
    }
    
    return false;
  }

  /**
   * 通过自定义会话ID结束会话
   * @param {string} customSessionId - 自定义会话ID
   */
  endCustomSession(customSessionId) {
    if (this.customSessionMapping.has(customSessionId)) {
      const conversationId = this.customSessionMapping.get(customSessionId);
      this.customSessionMapping.delete(customSessionId);
      
      // 查找并清理主会话映射
      for (const [sessionKey, convId] of this.conversations.entries()) {
        if (convId === conversationId) {
          this.cleanupSession(sessionKey);
          break;
        }
      }
      
      console.log(`[ConversationManager] Ended custom session: ${customSessionId}`);
      return true;
    }
    
    return false;
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionKey, lastActivity] of this.lastActivity.entries()) {
      if (now - lastActivity >= this.sessionTimeout) {
        expiredSessions.push(sessionKey);
      }
    }
    
    expiredSessions.forEach(sessionKey => {
      this.cleanupSession(sessionKey);
    });
    
    if (expiredSessions.length > 0) {
      console.log(`[ConversationManager] Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * 启动定时清理器
   */
  startCleanupTimer() {
    // 每15分钟清理一次过期会话
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 15 * 60 * 1000);
    
    console.log('[ConversationManager] Started session cleanup timer (every 15 minutes)');
  }
  /**
   * 获取当前活跃会话统计
   * @returns {object} 统计信息
   */
  getStats() {
    return {
      activeConversations: this.conversations.size,
      customSessionMappings: this.customSessionMapping.size,
      conversationTimeout: this.sessionTimeout / (60 * 1000) + ' minutes'
    };
  }

  /**
   * 获取所有会话数据（用于调试和管理）
   * @returns {object} 所有会话数据
   */
  getAllSessionData() {
    const conversations = {};
    const customSessionMappings = {};
    const lastActivity = {};
    
    // 转换 Map 为普通对象
    for (const [key, value] of this.conversations.entries()) {
      conversations[key] = value;
    }
    
    for (const [key, value] of this.customSessionMapping.entries()) {
      customSessionMappings[key] = value;
    }
    
    for (const [key, value] of this.lastActivity.entries()) {
      lastActivity[key] = new Date(value).toISOString();
    }
    
    return {
      conversations,
      customSessionMappings,
      lastActivity
    };
  }

  /**
   * 设置会话超时时间
   * @param {number} sessionTimeoutMinutes - 超时时间（分钟）
   */
  setSessionTimeout(sessionTimeoutMinutes) {
    this.sessionTimeout = sessionTimeoutMinutes * 60 * 1000;
    console.log(`[ConversationManager] Session timeout updated to: ${sessionTimeoutMinutes} minutes`);
  }
}

// 读取配置并创建全局单例
let conversationManager;

try {
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, '../../config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const sessionTimeoutMinutes = config.settings?.session_timeout_minutes || 120;
  
  conversationManager = new ConversationManager(sessionTimeoutMinutes);
} catch (error) {
  console.warn('[ConversationManager] Failed to load config, using default timeout (120 minutes)');
  conversationManager = new ConversationManager(120);
}

module.exports = conversationManager;
