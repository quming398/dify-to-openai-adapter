@echo off
title Dify-OpenAI Dashboard
color 0A

echo ================================
echo  Dify to OpenAI API Dashboard
echo ================================
echo.
echo 🚀 启动实时监控仪表板...
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装或不在 PATH 中
    echo 请安装 Node.js 后重试
    pause
    exit /b 1
)

REM 切换到项目目录
cd /d "%~dp0"

REM 启动仪表板
echo 💡 提示：
echo   - 按 R 刷新仪表板
echo   - 按 T 运行测试
echo   - 按 C 检查环境
echo   - 按 Q 退出
echo.
echo 🔄 启动中...
echo.

npm run dashboard

echo.
echo 👋 仪表板已退出
pause
