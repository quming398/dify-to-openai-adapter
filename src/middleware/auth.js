const fs = require('fs');
const path = require('path');

// 加载配置文件
function loadConfig() {
  try {
    const configPath = path.join(__dirname, '../../config.json');
    console.log('[CONFIG] Loading config from:', configPath);
    
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      console.log('[CONFIG] Config loaded successfully');
      return config;
    } else {
      console.warn('[CONFIG] Config file not found at:', configPath);
    }
  } catch (error) {
    console.warn('[CONFIG] Failed to load config.json:', error.message);
  }
  return null;
}

// 获取模型对应的配置
function getModelMapping(modelId) {
  const config = loadConfig();
  if (!config) {
    return null;
  }
  
  return config.model_mappings?.[modelId] || null;
}

// 根据模型ID获取Dify配置
function getDifyConfigByModel(modelId) {
  const modelMapping = getModelMapping(modelId);
  
  if (modelMapping) {
    return {
      apiKey: modelMapping.dify_api_key,
      baseURL: modelMapping.dify_base_url,
      modelId: modelId,
      appName: modelMapping.app_name,
      description: modelMapping.description,
      appType: modelMapping.app_type || 'chatbot',
      supportsStreaming: modelMapping.supports_streaming !== false,
      supportsBlocking: modelMapping.supports_blocking !== false,
      defaultMode: modelMapping.default_mode || 'blocking'
    };
  }
  
  // 如果没有找到模型映射，使用默认配置
  const config = loadConfig();
  const defaultConfig = config?.default_dify_config;
  
  return {
    apiKey: defaultConfig?.api_key || 'app-default-key',
    baseURL: defaultConfig?.base_url || 'http://localhost:3000',
    modelId: modelId,
    appName: defaultConfig?.app_name || 'Default App',
    description: defaultConfig?.description || 'Default Dify application'
  };
}

const validateApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: {
        message: 'Missing Authorization header',
        type: 'invalid_request_error',
        code: 'missing_authorization'
      }
    });
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      error: {
        message: 'Invalid Authorization header format',
        type: 'invalid_request_error',
        code: 'invalid_authorization'
      }
    });
  }

  // 保存 API Key，但不进行映射（映射将在路由中根据 model 进行）
  req.apiKey = token;
  
  console.log(`[AUTH] API Key validated: ${token.substring(0, 10)}...`);
  
  next();
};

// 获取所有可用的模型列表
function getAllModels() {
  const config = loadConfig();
  
  if (!config || !config.model_mappings) {
    return [];
  }
  
  // 从 model_mappings 生成模型列表
  return Object.keys(config.model_mappings).map(modelId => {
    const mapping = config.model_mappings[modelId];
    return {
      id: modelId,
      name: mapping.app_name || modelId,
      description: mapping.description || '',
      type: mapping.app_type || 'chatbot',
      max_tokens: mapping.max_tokens || 4096,
      pricing: mapping.pricing || { input: 0, output: 0 }
    };
  });
}

module.exports = {
  validateApiKey,
  getAllModels,
  getModelMapping,
  getDifyConfigByModel,
  loadConfig
};
