@echo off
echo ================================================
echo   Dify to OpenAI API Adapter
echo ================================================
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js not found
    echo Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version: 
node --version
echo.

REM 检查依赖是否安装
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM 检查配置文件
if not exist "config.json" (
    echo Error: config.json not found
    echo Please copy config.template.json to config.json and configure it
    pause
    exit /b 1
)

echo Starting Dify to OpenAI API Adapter...
echo Server will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

node src/index.js

REM 检查依赖是否安装
if not exist node_modules (
    echo 📦 安装依赖包...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
)

REM 检查配置文件
if not exist config.json (
    echo ⚠️  未找到 config.json 配置文件
    echo 正在从 config.template.json 创建...
    copy config.template.json config.json
    echo.
    echo 📝 请编辑 config.json 文件，配置您的 Dify 服务器信息
    echo    然后重新运行启动脚本
    echo.
    pause
    exit /b 1
)

REM 验证配置
echo 🔍 验证配置...
node verify.js
if %errorlevel% neq 0 (
    echo ❌ 配置验证失败
    echo 请检查 config.json 文件
    pause
    exit /b 1
)
echo.

echo 🚀 启动服务...
echo.
echo ┌─────────────────────────────────────────┐
echo │ 🌐 服务地址: http://localhost:3000      │
echo │ 🏥 健康检查: /health                    │
echo │ 🤖 OpenAI API: /v1                     │
echo └─────────────────────────────────────────┘
echo.
echo 📋 API Key 映射:
echo   dify-app-1-key → 智能客服助手 (dify-chat-model)
echo   dify-app-2-key → 文本生成助手 (dify-completion-model)  
echo   dify-app-3-key → 多功能AI助手 (dify-assistant)
echo.
echo 🔧 管理命令:
echo   npm run config     - 配置管理
echo   npm run test       - 功能测试
echo   npm run verify     - 验证配置
echo.
echo 🌐 在 open-webui 中使用:
echo   API Base URL: http://localhost:3000/v1
echo   API Key: 使用上述对应的 key
echo.
echo 按 Ctrl+C 停止服务
echo ================================================
echo.

npm start
