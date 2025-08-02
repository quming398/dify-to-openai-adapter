const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// 首先初始化日志系统
require('./utils/logger');

const { createModelsRouter } = require('./routes/models');
const { createChatRouter } = require('./routes/chat');
const { createCompletionsRouter } = require('./routes/completions');
const { createHealthRouter } = require('./routes/health');
const { createFilesRouter } = require('./routes/files');
const createStopRouter = require('./routes/stop');
const { errorHandler } = require('./middleware/errorHandler');
const { validateApiKey, loadConfig } = require('./middleware/auth');
const conversationManager = require('./services/conversationManager');

const app = express();

// 从配置文件获取端口和主机配置
const config = loadConfig();
const port = config?.settings?.port || process.env.PORT || 3000;
const host = config?.settings?.host || process.env.HOST || '0.0.0.0';

// 会话管理器已在导入时自动配置，无需手动设置
console.log(`[App] Conversation manager initialized with config from file`);

// 中间件
app.use(helmet());
app.use(cors());

// 自定义请求日志中间件（比 morgan 更详细）
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // 只记录API请求，忽略静态文件等
  if (url.startsWith('/v1/') || url.startsWith('/health')) {
    console.log(`\n🌐 [${timestamp}] ${method} ${url}`);
    console.log(`   📍 客户端: ${ip}`);
    console.log(`   🔧 User-Agent: ${userAgent.substring(0, 80)}${userAgent.length > 80 ? '...' : ''}`);
    
    if (req.get('Authorization')) {
      console.log(`   🔑 Authorization: ${req.get('Authorization').substring(0, 20)}...`);
    }
  }
  
  next();
});

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API 密钥验证中间件（对于需要认证的路由）
app.use('/v1/chat', validateApiKey);
app.use('/v1/completions', validateApiKey);
app.use('/v1/models', validateApiKey);
app.use('/v1/files', validateApiKey);

// 路由
app.use('/v1/models', createModelsRouter());
app.use('/v1/chat', createChatRouter());
app.use('/v1/completions', createCompletionsRouter());
app.use('/v1/files', createFilesRouter());
app.use('/', createStopRouter()); // 停止响应路由（包含自己的认证）
app.use('/health', createHealthRouter());
app.use('/', createHealthRouter()); // 根路径也返回健康状态

// 错误处理
app.use(errorHandler);

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      type: 'invalid_request_error',
      code: 'not_found'
    }
  });
});

app.listen(port, host, () => {
  console.log(`🚀 Dify to OpenAI API adapter running on http://${host}:${port}`);
  console.log(`📊 Health check available at http://${host}:${port}/health`);
  
  // 显示模型映射信息
  const modelMappings = config?.model_mappings || {};
  const mappingCount = Object.keys(modelMappings).length;
  console.log(`🔧 Model mappings configured: ${mappingCount}`);
  
  if (mappingCount > 0) {
    console.log(`📋 Available models:`);
    Object.keys(modelMappings).forEach(modelName => {
      const mapping = modelMappings[modelName];
      console.log(`   - ${modelName}: ${mapping.app_name} (${mapping.app_type})`);
    });
    
    const defaultModel = config?.settings?.default_model;
    if (defaultModel && modelMappings[defaultModel]) {
      console.log(`🎯 Default model: ${defaultModel}`);
    }  } else {
    console.log(`⚠️  No model mappings configured. Please check your config.json file.`);
  }
  
  // 显示会话管理信息
  const conversationStats = conversationManager.getStats();
  console.log(`💬 Conversation manager: ${conversationStats.conversationTimeout} timeout`);
  console.log(`🔧 Session management: Enabled (cleanup every 15 minutes)`);
});
