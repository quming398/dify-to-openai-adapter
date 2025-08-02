# 🚀 开发者快速启动指南

本指南帮助开发者快速设置和运行 Dify to OpenAI API 适配器。

## ⚡ 一分钟快速启动

### 1. 基础设置
```bash
# 1. 克隆项目
git clone <repository-url>
cd difyToOpenAi

# 2. 安装依赖
npm install

# 3. 复制配置文件
cp config.template.json config.json
```

### 2. 配置 Dify 应用
编辑 `config.json`：
```json
{
  "model_mappings": {
    "my-chatbot": {
      "dify_api_key": "app-YOUR_DIFY_API_KEY",
      "dify_base_url": "http://192.168.0.107:880",
      "app_name": "我的聊天机器人",
      "app_type": "chatbot",
      "supports_streaming": true,
      "supports_blocking": true
    }
  }
}
```

### 3. 启动服务
```bash
# Windows
start.bat

# Linux/Mac
./start.sh

# 或直接运行
npm start
```

### 4. 验证安装
```bash
# 检查环境
npm run check

# 运行所有测试
npm run test:all
```

## 🧪 开发和测试

### 环境检查
```bash
# 全面环境检查
npm run check
```

### 分类测试
```bash
# 单元测试
npm run test:unit

# API 连接测试
npm run test:api

# 多模态功能测试
npm run test:multimodal

# 会话管理测试
npm run test:session

# 快速验证测试
npm run test:util

# 集成测试
npm run test:integration
```

### 快速验证
```bash
# 测试基本 API
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"my-chatbot","messages":[{"role":"user","content":"你好"}]}'
```

## 📁 项目结构速览

```text
📦 项目根目录
├── 🏗️ src/              # 源代码
│   ├── index.js         # 应用入口
│   ├── middleware/      # 中间件（认证、错误处理）
│   ├── routes/          # API 路由
│   ├── services/        # 核心服务（Dify客户端、会话管理）
│   └── utils/           # 工具函数
├── 🧪 tests/            # 测试文件
│   ├── unit/            # 单元测试
│   ├── integration/     # 集成测试
│   ├── api/             # API 测试
│   ├── multimodal/      # 多模态测试
│   ├── session/         # 会话测试
│   └── util/            # 工具测试
├── 📊 logs/             # 日志文件
├── ⚙️ config.json       # 配置文件
└── 📚 文档和脚本        # README、启动脚本等
```

## 🔧 常见问题解决

### 1. 服务无法启动
```bash
# 检查端口占用
netstat -ano | findstr :3000

# 检查配置文件
npm run check
```

### 2. Dify 连接失败
```bash
# 测试 Dify 连接
node tests/api/test-dify-api-diagnosis.js

# 检查防火墙和网络
ping 192.168.0.107
```

### 3. 模型映射问题
```bash
# 检查模型配置
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer test-key"
```

### 4. 测试失败
```bash
# 逐个运行测试类别
npm run test:unit
npm run test:api
# ... 等等

# 查看详细日志
node tests/util/simple-test.js
```

## 🚦 开发工作流

### 1. 开发新功能
```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发代码 (src/)
# 3. 编写测试 (tests/)
# 4. 运行测试
npm run test:all

# 5. 提交代码
git commit -m "feat: add new feature"
```

### 2. 调试问题
```bash
# 1. 检查环境
npm run check

# 2. 查看日志
tail -f logs/app.log

# 3. 运行相关测试
npm run test:api  # 例如调试 API 问题

# 4. 逐步测试
node tests/util/simple-test.js
```

### 3. 部署准备
```bash
# 1. 运行完整测试
npm run test:all

# 2. 检查配置
npm run check

# 3. 构建 Docker 镜像
npm run docker:build

# 4. 测试部署
npm run docker:run
```

## 📋 检查清单

### 开发环境设置 ✅
- [ ] Node.js 已安装 (建议 v16+)
- [ ] 依赖已安装 (`npm install`)
- [ ] 配置文件已创建 (`config.json`)
- [ ] Dify 服务器可访问
- [ ] 环境检查通过 (`npm run check`)

### 功能验证 ✅
- [ ] 基础 API 响应正常
- [ ] 模型映射工作正常
- [ ] 流式响应功能正常
- [ ] 会话管理功能正常
- [ ] 多模态支持正常（如需要）

### 测试覆盖 ✅
- [ ] 单元测试通过
- [ ] API 测试通过
- [ ] 集成测试通过
- [ ] 错误处理测试通过

## 🎯 下一步

1. **了解架构**: 阅读 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
2. **深入测试**: 查看 [tests/README.md](tests/README.md)
3. **功能文档**: 查看各种实现报告 (`*_REPORT.md`)
4. **生产部署**: 参考主 [README.md](README.md) 的部署部分

## 💡 提示

- 使用 `npm run check` 快速诊断环境问题
- 开发时使用 `npm run dev` 启动自动重载
- 查看 `logs/` 目录获取详细日志
- 测试前确保 Dify 服务正在运行
- 遇到问题时先运行相关的测试类别

Happy Coding! 🎉
