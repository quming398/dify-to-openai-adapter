#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================"
echo " Dify to OpenAI API Dashboard"
echo "================================"
echo ""
echo -e "${GREEN}🚀 启动实时监控仪表板...${NC}"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装或不在 PATH 中${NC}"
    echo "请安装 Node.js 后重试"
    exit 1
fi

# 切换到脚本所在目录
cd "$(dirname "$0")"

echo -e "${YELLOW}💡 提示：${NC}"
echo "  - 按 R 刷新仪表板"
echo "  - 按 T 运行测试"
echo "  - 按 C 检查环境"
echo "  - 按 Q 退出"
echo ""
echo -e "${BLUE}🔄 启动中...${NC}"
echo ""

# 启动仪表板
npm run dashboard

echo ""
echo "👋 仪表板已退出"
