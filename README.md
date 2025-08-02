# Dify to OpenAI API 适配器

将 Dify 应用转换为 OpenAI 兼容的 API 接口，支持模型映射和流式响应。

## 功能特性

- ✅ 支持基于模型的映射机制
- ✅ 兼容 OpenAI ChatGPT API 格式
- ✅ 支持流式和阻塞响应模式
- ✅ 自动检测 Dify 应用类型（Chatbot/Agent/Workflow）
- ✅ 支持多个 Dify 应用映射
- ✅ **智能会话管理：支持多轮对话上下文记忆**
- ✅ **多模型会话隔离：不同模型间的对话相互独立**
- ✅ **自动会话清理：防止内存泄漏**

## 📚 文档导航

- 📖 **[开发者指南](docs/DEVELOPER_GUIDE.md)** - 开发环境设置和API使用
- 🏗️ **[项目结构](docs/PROJECT_STRUCTURE.md)** - 详细的项目架构说明
- 🚀 **[多模态实现](docs/MULTIMODAL_IMPLEMENTATION_REPORT.md)** - 图像+文本处理功能详解
- 🔧 **[问题修复报告](docs/DUPLICATE_FIX_REPORT.md)** - 重复响应等问题的修复说明
- 📊 **[完整文档列表](docs/README.md)** - 所有项目文档的索引

## 快速开始


### 1. 安装依赖

```bash
npm install
```

### 2. 配置应用

复制配置模板并编辑：

```bash
cp config.template.json config.json
```

编辑 `config.json`，添加你的 Dify 应用配置：

```json
{
  "model_mappings": {
    "your-model-name": {
      "dify_api_key": "app-YOUR_DIFY_API_KEY",
      "dify_base_url": "http://your-dify-server:port",
      "app_name": "你的应用名称",
      "description": "应用描述",
      "app_type": "chatbot",
      "supports_streaming": true,
      "supports_blocking": true,
      "default_mode": "blocking"
    }
  }
}
```

### 3. 启动服务

### 源码 启动
```bash
# Windows
start.bat

# Linux/Mac
./start.sh

# 或直接运行
npm start
```

### Docker 启动

```bash
# 运行容器
docker run -d -p 3000:3000 -v $(pwd)/config.json:/app/config.json chengmq/dify-to-openai-adapter:latest

```

服务将在 `http://localhost:3000` 启动。

## 🔒 安全注意事项

**重要**: 本项目已修复了敏感信息泄露问题，请遵循以下安全最佳实践：

- ✅ 真实的 `config.json` 已被 `.gitignore` 忽略
- ✅ 使用 `config.template.json` 作为配置模板
- ✅ 生产环境请使用环境变量存储敏感信息
- ✅ 定期轮换 API 密钥

详细安全指南请参阅 [SECURITY.md](SECURITY.md)。

## API 使用

### Chat Completions API

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model-name",
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "stream": false
  }'
```

### 使用 OpenAI 风格的会话 ID

支持通过 `session_id` 参数实现与 OpenAI 兼容的会话管理：

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model-name",
    "messages": [
      {"role": "user", "content": "你好，我叫张三"}
    ],
    "session_id": "my-conversation-123",
    "stream": false
  }'
```

后续请求使用相同的 `session_id` 将继续相同的对话：

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model-name", 
    "messages": [
      {"role": "user", "content": "你好，我叫张三"},
      {"role": "assistant", "content": "你好张三！很高兴认识你..."},
      {"role": "user", "content": "你还记得我的名字吗？"}
    ],
    "session_id": "my-conversation-123",
    "stream": false
  }'
```

### 流式响应

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model-name",
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "stream": true
  }'
```

### 获取可用模型

```bash
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer your-api-key"
```

## 会话管理功能

### 智能对话记忆（基于消息数量的智能判断）

系统采用智能会话管理策略，**根据消息数量自动判断是否创建新会话**：

- **单条消息**：自动创建新的 Dify 对话会话（重置上下文）
- **多条消息**：继续使用现有会话（保持对话连续性）
- **会话超时**：默认 2 小时后自动清理过期会话（可配置）
- **用户隔离**：不同用户（API Key）的对话完全隔离
- **模型隔离**：不同模型的对话相互独立

### 工作原理

```bash
# 单条用户消息 - 创建新会话
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},  # system消息不计入对话历史
    {"role": "user", "content": "你好，我叫张三"}
  ]
}
# 结果：创建新的 Dify conversation_id

# 多条用户消息 - 继续现有会话
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "你好，我叫张三"},
    {"role": "assistant", "content": "你好张三！很高兴认识你..."},
    {"role": "user", "content": "你还记得我的名字吗？"}
  ]
}
# 结果：使用现有的 conversation_id，AI 能记住上下文
```

### 配置选项

在 `config.json` 中配置会话超时时间：

```json
{
  "settings": {
    "session_timeout_minutes": 120
  }
}
```

### 会话生命周期

- **会话超时**：默认 1 小时后自动清理过期会话
- **手动清理**：支持通过 API 手动删除特定会话
- **自动清理**：定期清理过期会话，防止内存泄漏

### 会话管理 API

```bash
# 查看当前所有会话
curl http://localhost:3000/health/sessions \
  -H "Authorization: Bearer your-api-key"

# 查询特定 OpenAI 会话 ID 的映射
curl http://localhost:3000/health/sessions/openai/my-conversation-123 \
  -H "Authorization: Bearer your-api-key"

# 删除特定的 OpenAI 会话映射
curl -X DELETE http://localhost:3000/health/sessions/openai/my-conversation-123 \
  -H "Authorization: Bearer your-api-key"

# 删除特定用户的会话
curl -X DELETE http://localhost:3000/health/conversations/your-user-key \
  -H "Authorization: Bearer your-api-key"

# 删除特定用户特定模型的会话
curl -X DELETE http://localhost:3000/health/conversations/your-user-key/model-name \
  -H "Authorization: Bearer your-api-key"
```

## 配置说明

### 应用类型

- **chatbot**: 标准聊天应用，支持阻塞和流式模式
- **agent**: Agent 应用，仅支持流式模式

### 模型配置参数

- `dify_api_key`: Dify 应用的 API Key
- `dify_base_url`: Dify 服务器地址
- `app_name`: 应用显示名称
- `app_type`: 应用类型（chatbot/agent）
- `supports_streaming`: 是否支持流式模式
- `supports_blocking`: 是否支持阻塞模式
- `default_mode`: 默认响应模式


## Docker 自己构建
```bash
# 构建镜像
docker build -t dify-to-openai-adapter .

# 运行容器
docker run -p 3000:3000 -v $(pwd)/config.json:/app/config.json dify-to-openai-adapter

# 或使用 docker-compose
docker-compose up -d
```

## 环境变量配置

所有配置都在 `config.json` 文件中管理。你也可以使用环境变量覆盖某些设置：

```bash
PORT=3000                # 服务端口 (可选，默认值在 config.json 中设置)
HOST=0.0.0.0            # 服务主机 (可选，默认值在 config.json 中设置)  
LOG_LEVEL=info          # 日志级别 (可选，默认 info)
```

### 环境变量配置
创建 `.env` 文件（基于 `.env.example`）：

```bash
cp .env.example .env
# 编辑 .env 文件填入真实值
```

### Docker部署安全
```bash
# 使用环境变量启动
export DIFY_BASE_URL="http://your-server:port"
export DIFY_API_KEY="your-api-key"
docker-compose up -d
```

更多安全指南请参阅 [SECURITY.md](SECURITY.md)。

## 🧪 测试

本项目包含完整的测试套件，按功能分类组织：

### 测试结构

```text
tests/
├── unit/           # 单元测试（组件和逻辑测试）
├── integration/    # 集成测试（整体功能测试）
├── api/           # API 测试（接口和连接测试）
├── multimodal/    # 多模态功能测试
├── session/       # 会话管理测试
└── util/          # 工具和简单测试
```

### 运行测试

#### 快速运行所有测试

```bash
# Windows
run-tests.bat

# Linux/Mac
./run-tests.sh

# 或使用 npm
npm run test:all
```

#### 按分类运行测试

```bash
# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# API 测试
npm run test:api

# 多模态测试
npm run test:multimodal

# 会话管理测试
npm run test:session

# 工具测试
npm run test:util
```

#### 运行单个测试

```bash
# 测试 Dify 文件上传
node tests/api/test-dify-upload.js

# 测试多模态功能
node tests/multimodal/test-multimodal.js

# 测试会话管理
node tests/session/test-openai-session.js
```

### 测试覆盖范围

- ✅ OpenAI API 兼容性
- ✅ 多模态支持（图像+文本）
- ✅ 会话管理和持久化
- ✅ 流式响应处理
- ✅ 文件上传功能
- ✅ 错误处理和恢复
- ✅ 用户参数一致性
- ✅ 重复响应修复

详细的测试说明请参考 [tests/README.md](tests/README.md)。

## 🧪 测试脚本

```bash
# 完整功能测试
node test-complete-features.js

# 多模态功能测试 (新增)
node test-multimodal.js

# 多模态文本格式测试 (新增)  
node test-multimodal-text.js

# Dify API诊断工具 (新增)
node test-dify-api-diagnosis.js

# 文件上传功能测试  
node test-file-upload.js

# 停止响应功能测试
node test-stop-api.js

# 智能会话管理测试
node test-smart-session.js

# 基础对话功能测试
node test-simple-conversation.js

# 流式响应测试
node test-real-streaming.js
```

## 许可证

MIT License
