# 项目结构说明

本文档详细说明了 Dify to OpenAI API 适配器的项目结构和文件组织。

## 📁 根目录结构

```text
difyToOpenAi/
├── src/                    # 源代码目录
├── tests/                  # 测试文件目录
├── logs/                   # 日志文件目录
├── config.json            # 主配置文件
├── config.template.json   # 配置模板文件
├── package.json           # Node.js 依赖配置
├── README.md              # 项目说明文档
├── run-tests.bat          # Windows 测试运行脚本
├── run-tests.sh           # Linux/Mac 测试运行脚本
├── start.bat              # Windows 启动脚本
├── start.sh               # Linux/Mac 启动脚本
├── Dockerfile             # Docker 容器配置
├── docker-compose.yml     # Docker Compose 配置
└── 各种报告文档.md        # 实现报告和文档
```

## 🏗️ 源代码结构 (src/)

```text
src/
├── index.js               # 应用入口文件
├── middleware/            # 中间件
│   ├── auth.js           # API 认证和模型映射
│   └── errorHandler.js   # 错误处理中间件
├── routes/               # 路由处理
│   ├── chat.js          # 聊天完成 API
│   ├── completions.js   # 文本完成 API
│   ├── files.js         # 文件上传 API
│   ├── health.js        # 健康检查和会话管理 API
│   ├── models.js        # 模型列表 API
│   └── stop.js          # 停止响应 API
├── services/             # 核心服务
│   ├── difyClient.js    # Dify API 客户端（核心逻辑）
│   └── conversationManager.js # 会话管理服务
└── utils/               # 工具函数
    └── logger.js        # 日志工具
```

## 🧪 测试结构 (tests/)

```text
tests/
├── README.md            # 测试说明文档
├── unit/               # 单元测试
│   ├── test-class-only.js          # DifyClient 类测试
│   ├── test-logic-only.js          # 核心逻辑测试
│   ├── test-duplicate-issue.js     # 重复响应问题测试
│   ├── test-system-message-fix.js  # 系统消息处理测试
│   └── test-user-consistency.js    # 用户参数一致性测试
├── integration/        # 集成测试
│   ├── test-complete-features.js   # 完整功能集成测试
│   ├── test-all-models-duplicate.js # 多模型重复问题测试
│   └── test-real-streaming.js      # 真实流式响应测试
├── api/               # API 测试
│   ├── test-dify-api-diagnosis.js   # Dify API 诊断测试
│   ├── test-dify-upload.js         # Dify 文件上传测试
│   ├── test-file-upload.js         # 文件上传 API 测试
│   └── test-stop-api.js            # 停止 API 测试
├── multimodal/        # 多模态测试
│   ├── test-multimodal.js          # 多模态功能完整测试
│   ├── test-multimodal-text.js     # 纯文本多模态格式测试
│   └── test-field-fix.js           # 字段修复验证测试
├── session/           # 会话管理测试
│   ├── test-conversation-fix.js     # 会话修复测试
│   ├── test-conversation-manager.js # 会话管理器测试
│   ├── test-conversation-memory.js  # 会话记忆测试
│   ├── test-openai-session.js      # OpenAI 风格会话测试
│   └── test-smart-session.js       # 智能会话管理测试
└── util/              # 工具测试
    ├── simple-test.js              # 基础功能测试
    ├── test-simple-chat.js         # 简单聊天测试
    └── test-simple-conversation.js # 简单会话测试
```

## 🔧 核心组件说明

### 入口文件 (src/index.js)
- Express 应用配置和启动
- 中间件注册
- 路由配置
- 全局错误处理

### 认证中间件 (src/middleware/auth.js)
- API Key 验证
- 模型到 Dify 应用的映射
- 配置文件加载和管理

### Dify 客户端 (src/services/difyClient.js)
- **核心组件**：与 Dify API 的所有交互
- OpenAI 格式转换
- 流式响应处理
- 多模态内容支持
- 文件上传处理

### 会话管理器 (src/services/conversationManager.js)
- 对话上下文存储
- 会话生命周期管理
- OpenAI 风格会话 ID 映射
- 自动清理和内存管理

### 路由处理
- **chat.js**: 聊天完成 API (`/v1/chat/completions`)
- **completions.js**: 文本完成 API (`/v1/completions`)
- **files.js**: 文件上传 API (`/v1/files`)
- **models.js**: 模型列表 API (`/v1/models`)
- **health.js**: 健康检查和会话管理 API
- **stop.js**: 停止响应 API

## 📊 测试分类说明

### Unit Tests (单元测试)
测试独立的组件和功能：
- 类和方法的正确性
- 逻辑处理的准确性
- 错误处理机制

### Integration Tests (集成测试)
测试组件间的协作：
- 完整的请求-响应流程
- 多组件集成功能
- 端到端功能验证

### API Tests (API 测试)
测试外部接口：
- Dify API 连接性
- 文件上传功能
- 接口兼容性

### Multimodal Tests (多模态测试)
测试多媒体功能：
- 图像处理
- base64 编码/解码
- 多模态内容转换

### Session Tests (会话测试)
测试会话管理：
- 对话连续性
- 会话持久化
- 会话隔离

### Util Tests (工具测试)
基础功能测试：
- 简单的功能验证
- 开发调试工具
- 快速检查脚本

## 🚀 快速开始

### 开发环境设置
1. 克隆项目
2. 安装依赖：`npm install`
3. 复制配置：`cp config.template.json config.json`
4. 编辑配置文件
5. 启动服务：`npm start`

### 测试环境设置
1. 确保 Dify 服务正在运行
2. 配置正确的 API 端点
3. 运行测试：`npm run test:all`

### 生产部署
1. 使用 Docker：`docker-compose up -d`
2. 或直接运行：`npm start`
3. 配置反向代理（可选）

## 📋 维护指南

### 添加新功能
1. 在 `src/` 中添加相应模块
2. 在 `tests/` 中添加对应测试
3. 更新文档
4. 运行完整测试套件

### 调试问题
1. 查看日志：`logs/` 目录
2. 运行相关测试：`npm run test:xxx`
3. 检查配置：`config.json`
4. 验证 Dify 连接

### 代码质量
- 遵循现有代码风格
- 添加适当的错误处理
- 编写清晰的注释
- 保持测试覆盖率
