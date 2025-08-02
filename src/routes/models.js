const express = require('express');
const { getAllModels, getModelMapping } = require('../middleware/auth');

function createModelsRouter() {
  const router = express.Router();
  router.get('/', async (req, res) => {
    const requestId = `models-${Date.now()}`;
    console.log(`📋 [${requestId}] 模型列表请求 - ${req.method} ${req.originalUrl}`);
    
    try {
      // 返回所有可用的模型（因为现在基于model_id映射，所有模型都可见）
      const models = getAllModels();
      
      console.log(`✅ [${requestId}] 返回 ${models.length} 个可用模型`);
      models.forEach((model, index) => {
        console.log(`   [${index + 1}] ${model.id} - ${model.name}`);
      });
      
      res.json({
        object: 'list',
        data: models.map(model => ({
          id: model.id,
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'dify',
          name: model.name,
          description: model.description,
          type: model.type,
          max_tokens: model.max_tokens,
          pricing: model.pricing
        }))
      });
    } catch (error) {
      console.error('[MODELS] Error fetching models:', error);
      res.status(500).json({
        error: {
          message: 'Failed to fetch models',
          type: 'internal_error',
          code: 'models_fetch_failed'
        }
      });
    }
  });
  router.get('/:model', (req, res) => {
    try {
      const modelId = req.params.model;
      const allModels = getAllModels();
      
      // 检查模型是否存在
      const modelConfig = allModels.find(model => model.id === modelId);

      if (!modelConfig) {
        return res.status(404).json({
          error: {
            message: `Model '${modelId}' not found`,
            type: 'invalid_request_error',
            code: 'model_not_found'
          }
        });
      }

      // 获取模型映射信息
      const modelMapping = getModelMapping(modelId);

      const response = {
        id: modelConfig.id,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'dify',
        name: modelConfig.name,
        description: modelConfig.description,
        type: modelConfig.type,
        max_tokens: modelConfig.max_tokens,
        permission: [{
          id: `modelperm-${Date.now()}`,
          object: 'model_permission',
          created: Math.floor(Date.now() / 1000),
          allow_create_engine: false,
          allow_sampling: true,
          allow_logprobs: false,
          allow_search_indices: false,
          allow_view: true,
          allow_fine_tuning: false,
          organization: '*',
          group: null,
          is_blocking: false
        }]
      };

      // 如果有模型映射，添加映射信息
      if (modelMapping) {
        response.model_info = {
          app_name: modelMapping.app_name,
          description: modelMapping.description,
          app_type: modelMapping.app_type,
          dify_endpoint: modelMapping.dify_base_url,
          supports_streaming: modelMapping.supports_streaming,
          supports_blocking: modelMapping.supports_blocking,
          default_mode: modelMapping.default_mode
        };
      }

      res.json(response);
    } catch (error) {
      console.error('[MODELS] Model details error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to retrieve model details',
          type: 'api_error',
          code: 'model_error'
        }
      });
    }
  });

  return router;
}

module.exports = {
  createModelsRouter
};
