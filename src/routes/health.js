const express = require('express');
const DifyClient = require('../services/difyClient');
const { loadConfig, getDifyConfigByModel, getAllModels } = require('../middleware/auth');
const conversationManager = require('../services/conversationManager');

function createHealthRouter() {
  const router = express.Router();
  router.get('/', async (req, res) => {
    const requestId = `health-${Date.now()}`;
    console.log(`🔍 [${requestId}] 健康检查请求 - ${req.method} ${req.originalUrl}`);
    
    try {
      const startTime = Date.now();
      
      // 获取配置
      const config = loadConfig();
      
      // 检查所有模型对应的 Dify 服务健康状态
      const models = getAllModels();
      const difyHealthChecks = [];
      
      for (const model of models) {
        try {
          const difyConfig = getDifyConfigByModel(model.id);
          if (difyConfig) {
            const difyClient = new DifyClient(difyConfig);
            const isHealthy = await difyClient.healthCheck();
            difyHealthChecks.push({
              model: model.id,
              app_name: difyConfig.appName,
              status: isHealthy ? 'up' : 'down',
              endpoint: difyConfig.baseURL
            });
          }
        } catch (error) {
          console.error(`[HEALTH] Dify health check error for model ${model.id}:`, error.message);
          difyHealthChecks.push({
            model: model.id,
            status: 'down',
            error: error.message
          });
        }
      }
      
      const responseTime = Date.now() - startTime;
      const allServicesHealthy = difyHealthChecks.every(check => check.status === 'up');
      
      const healthStatus = {
        status: allServicesHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: {
          node_version: process.version,
          platform: process.platform,
          memory_usage: process.memoryUsage()
        },        services: {
          dify_apps: difyHealthChecks,
          total_models: models.length,
          healthy_models: difyHealthChecks.filter(check => check.status === 'up').length,
          response_time_ms: responseTime,
          conversation_manager: conversationManager.getStats()
        },
        api: {
          version: '1.0.0',
          openai_compatible: true,
          mapping_mode: 'model_based',
          supported_endpoints: [
            '/v1/models',
            '/v1/chat/completions',
            '/v1/completions',
            '/health'
          ]
        }      };

      // 根据服务状态设置 HTTP 状态码
      const statusCode = allServicesHealthy ? 200 : 503;
      
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      console.error('Health check error:', error);
      
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: {
          message: 'Health check failed',
          type: 'health_check_error',
          details: error.message
        },
        services: {
          dify_apps: [],
          total_models: 0,
          healthy_models: 0
        }
      });
    }
  });

  // 简单的存活检查端点
  router.get('/alive', (req, res) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  });
  // 就绪检查端点
  router.get('/ready', async (req, res) => {
    try {
      // 检查所有模型对应的 Dify 服务是否就绪
      const models = getAllModels();
      let allReady = true;
      const reasons = [];
      
      for (const model of models) {
        try {
          const difyConfig = getDifyConfigByModel(model.id);
          if (difyConfig) {
            const difyClient = new DifyClient(difyConfig);
            const isHealthy = await difyClient.healthCheck();
            if (!isHealthy) {
              allReady = false;
              reasons.push(`Model ${model.id} service unavailable`);
            }
          }
        } catch (error) {
          allReady = false;
          reasons.push(`Model ${model.id} error: ${error.message}`);
        }
      }
      
      if (allReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          total_models: models.length
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          reasons: reasons
        });
      }
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });
  // 新增：会话管理 API
  router.get('/sessions', (req, res) => {
    try {
      const stats = conversationManager.getStats();
      const sessionData = conversationManager.getAllSessionData();
      
      res.json({
        ...stats,
        conversations: sessionData.conversations,
        openaiMappings: sessionData.openaiMappings,
        lastActivity: sessionData.lastActivity
      });
    } catch (error) {
      console.error('[HEALTH] Session stats error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get session statistics',
          type: 'internal_error'
        }
      });
    }
  });

  // 查询特定 OpenAI 会话 ID 的映射
  router.get('/sessions/openai/:sessionId', (req, res) => {
    try {
      const { sessionId } = req.params;
      const difyConversationId = conversationManager.getDifyConversationByOpenAI(sessionId);
      
      if (difyConversationId) {
        res.json({
          openai_session_id: sessionId,
          dify_conversation_id: difyConversationId,
          found: true
        });
      } else {
        res.status(404).json({
          openai_session_id: sessionId,
          found: false,
          error: {
            message: 'OpenAI session not found',
            type: 'not_found_error',
            code: 'session_not_found'
          }
        });
      }
    } catch (error) {
      console.error('[HEALTH] OpenAI session lookup error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to lookup OpenAI session',
          type: 'internal_error'
        }
      });
    }
  });

  // 删除特定的 OpenAI 会话映射
  router.delete('/sessions/openai/:sessionId', (req, res) => {
    try {
      const { sessionId } = req.params;
      const success = conversationManager.deleteOpenAISession(sessionId);
      
      if (success) {
        res.json({
          message: 'OpenAI session mapping deleted successfully',
          openai_session_id: sessionId
        });
      } else {
        res.status(404).json({
          error: {
            message: 'OpenAI session not found',
            type: 'not_found_error',
            code: 'session_not_found'
          }
        });
      }
    } catch (error) {
      console.error('[HEALTH] OpenAI session deletion error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to delete OpenAI session',
          type: 'internal_error'
        }
      });
    }
  });

  router.delete('/conversations/:userKey/:modelId?', (req, res) => {
    try {
      const { userKey, modelId } = req.params;
      
      // 验证用户权限（这里简单检查，实际应用中需要更严格的验证）
      if (userKey !== req.apiKey && !req.apiKey.startsWith('admin-')) {
        return res.status(403).json({
          error: {
            message: 'Permission denied',
            type: 'permission_error',
            code: 'insufficient_permissions'
          }
        });
      }
      
      const success = conversationManager.endConversation(userKey, modelId || 'default');
      
      if (success) {
        res.json({
          message: 'Conversation ended successfully',
          userKey: userKey,
          modelId: modelId || 'default'
        });
      } else {
        res.status(404).json({
          error: {
            message: 'No active conversation found',
            type: 'not_found_error',
            code: 'conversation_not_found'
          }
        });
      }
    } catch (error) {
      console.error('[HEALTH] Conversation management error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to manage conversation',
          type: 'internal_error'
        }
      });
    }
  });

  return router;
}

module.exports = {
  createHealthRouter
};
