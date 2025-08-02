@echo off
title Dify-OpenAI Setup Wizard
color 0B

echo ========================================
echo  Dify to OpenAI API Adapter
echo  项目设置向导
echo ========================================
echo.
echo 🚀 欢迎使用 Dify to OpenAI API 适配器！
echo.
echo 这个向导将帮助您：
echo   ✅ 检查环境依赖
echo   ✅ 安装项目依赖
echo   ✅ 配置 Dify 应用
echo   ✅ 验证配置
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装或不在 PATH 中
    echo.
    echo 请先安装 Node.js (https://nodejs.org)
    echo 然后重新运行此脚本
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
echo.

REM 切换到项目目录
cd /d "%~dp0"

echo 🔧 启动设置向导...
echo.

REM 运行设置向导
npm run setup

echo.
echo 📋 设置向导已完成！
echo.
echo 💡 下一步建议：
echo   1. 运行 'npm start' 启动服务
echo   2. 运行 'npm run dashboard' 查看实时状态
echo   3. 运行 'npm run test:all' 测试所有功能
echo.
pause
