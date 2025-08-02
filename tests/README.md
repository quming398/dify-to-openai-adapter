# 测试文件组织结构

本目录包含了 Dify to OpenAI API 适配器的所有测试文件，按功能进行分类组织。

## 📁 目录结构

```
tests/
├── unit/           # 单元测试
├── integration/    # 集成测试  
├── api/           # API 测试
├── multimodal/    # 多模态功能测试
├── session/       # 会话管理测试
└── util/          # 工具和简单测试
```

## 🧪 测试分类说明

### Unit Tests (单元测试)
独立测试各个组件和功能模块：
- `test-class-only.js` - DifyClient 类测试
- `test-logic-only.js` - 核心逻辑测试
- `test-duplicate-issue.js` - 重复响应问题测试
- `test-system-message-fix.js` - 系统消息处理测试
- `test-user-consistency.js` - 用户参数一致性测试

### Integration Tests (集成测试)
测试整个系统的集成功能：
- `test-complete-features.js` - 完整功能集成测试
- `test-all-models-duplicate.js` - 多模型重复问题测试
- `test-real-streaming.js` - 真实流式响应测试

### API Tests (API 测试)
测试各种 API 接口：
- `test-dify-api-diagnosis.js` - Dify API 诊断测试
- `test-dify-upload.js` - Dify 文件上传测试
- `test-file-upload.js` - 文件上传 API 测试
- `test-stop-api.js` - 停止 API 测试

### Multimodal Tests (多模态测试)
测试多模态功能（文本+图像）：
- `test-multimodal.js` - 多模态功能完整测试
- `test-multimodal-text.js` - 纯文本多模态格式测试
- `test-field-fix.js` - 字段修复验证测试

### Session Tests (会话管理测试)
测试会话管理和持久化：
- `test-conversation-fix.js` - 会话修复测试
- `test-conversation-manager.js` - 会话管理器测试
- `test-conversation-memory.js` - 会话记忆测试
- `test-openai-session.js` - OpenAI 风格会话测试
- `test-smart-session.js` - 智能会话管理测试

### Util Tests (工具测试)
简单的工具和诊断测试：
- `simple-test.js` - 基础功能测试
- `test-simple-chat.js` - 简单聊天测试
- `test-simple-conversation.js` - 简单会话测试

## 🚀 运行测试

### 运行所有测试
```bash
npm run test:all
```

### 按分类运行测试
```bash
# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# API 测试
npm run test:api

# 多模态测试
npm run test:multimodal

# 会话测试
npm run test:session

# 工具测试
npm run test:util
```

### 运行单个测试
```bash
node tests/unit/test-class-only.js
node tests/api/test-dify-upload.js
# 等等...
```

## 📋 测试前置条件

1. **配置文件**: 确保 `config.json` 文件配置正确
2. **服务启动**: 确保 Dify 服务器正在运行
3. **依赖安装**: 运行 `npm install` 安装依赖
4. **环境变量**: 可选设置环境变量如 `LOG_LEVEL=debug` 用于调试

## 🔧 维护指南

- 新增测试时，请按功能分类放入对应目录
- 每个测试文件应该是独立可运行的
- 测试文件命名应该清晰表达测试目的
- 大型测试可以拆分为多个子测试文件

## 📊 测试覆盖范围

- ✅ API 兼容性测试
- ✅ 多模态功能测试  
- ✅ 会话管理测试
- ✅ 错误处理测试
- ✅ 流式响应测试
- ✅ 文件上传测试
- ✅ 用户参数测试
- ✅ 重复响应修复测试

## 🛠️ 开发和维护工具

### 环境检查工具

```bash
# 全面环境检查（检查服务状态、配置、依赖等）
npm run check

# 或直接运行
node tests/check-environment.js
```

### 实时监控仪表板

```bash
# 启动实时监控仪表板
npm run dashboard

# Windows 快捷方式
dashboard.bat

# Linux/Mac 快捷方式
./dashboard.sh
```

仪表板功能：

- 📊 实时服务状态监控
- 🔌 API 端点健康检查
- 📝 日志文件状态
- ⚙️ 配置文件验证
- 🎮 快捷操作（测试、检查等）

### 项目维护工具

```bash
# 运行完整维护检查
npm run maintenance

# 仅检查项目健康状态
npm run maintenance:health

# 清理旧日志文件
npm run maintenance:clean

# 更新项目依赖
npm run maintenance:update
```

### 工具文件说明

- `check-environment.js` - 环境检查工具
- `dashboard.js` - 实时监控仪表板
- `maintenance.js` - 项目维护工具

## 🔧 开发工作流建议

### 1. 开发前检查

```bash
npm run check          # 检查环境
npm run dashboard      # 启动监控（可选）
```

### 2. 开发过程中

```bash
npm run test:unit      # 单元测试
npm run test:api       # API 测试
```

### 3. 提交前验证

```bash
npm run test:all       # 完整测试
npm run maintenance    # 维护检查
```

### 4. 定期维护

```bash
npm run maintenance:clean   # 清理日志
npm run maintenance:update  # 更新依赖
```
