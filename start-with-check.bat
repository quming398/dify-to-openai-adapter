@echo off
echo =====================================
echo Dify to OpenAI 适配器 - 启动脚本
echo =====================================
echo.

echo 检查 Node.js 环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo 检查依赖包...
if not exist "node_modules" (
    echo [警告] 未找到 node_modules，正在安装依赖...
    npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo 检查配置文件...
if not exist "config.json" (
    echo [警告] 未找到 config.json，请根据 config.template.json 创建配置文件
    if exist "config.template.json" (
        echo [提示] 可以运行: copy config.template.json config.json
        echo [提示] 然后编辑 config.json 添加你的 Dify 配置
    )
    pause
    exit /b 1
)

echo 配置检查完成，正在启动服务...
echo.
echo =====================================
echo 服务启动信息:
echo - 端口: 3000
echo - 健康检查: http://localhost:3000/health
echo - 会话管理: http://localhost:3000/health/sessions
echo - API 端点: http://localhost:3000/v1/chat/completions
echo =====================================
echo.
echo [提示] 按 Ctrl+C 停止服务
echo.

node src/index.js
