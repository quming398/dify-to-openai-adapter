#!/bin/bash

echo "================================================"
echo "   Dify to OpenAI API Adapter"
echo "================================================"
echo

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not found"
    echo "Please install Node.js: https://nodejs.org/"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies"
        exit 1
    fi
    echo "Dependencies installed successfully"
    echo
fi

# 检查配置文件
if [ ! -f "config.json" ]; then
    echo "⚠️  未找到 config.json 配置文件"
    echo "正在从 config.template.json 创建..."
    cp config.template.json config.json
    echo
    echo "📝 请编辑 config.json 文件，配置您的 Dify 服务器信息"
    echo "   然后重新运行启动脚本"
    echo
    exit 1
fi

echo "🚀 启动服务..."
echo
echo "服务将在以下地址运行:"
echo "   - 主服务: http://localhost:3000"
echo "   - 健康检查: http://localhost:3000/health"
echo "   - OpenAI 兼容 API: http://localhost:3000/v1"
echo
echo "在 open-webui 中使用:"
echo "   - API Base URL: http://localhost:3000/v1"
echo "   - API Key: 根据 config.json 中配置的模型使用对应的 key"
echo
echo "按 Ctrl+C 停止服务"
echo "================================================"
echo

node src/index.js
