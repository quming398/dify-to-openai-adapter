#!/bin/bash

echo "================================================"
echo " Dify to OpenAI API Adapter - 测试套件"
echo "================================================"
echo "测试时间: $(date)"
echo ""

# 设置错误处理
set -e
error_count=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${YELLOW}[$3] 运行 $test_name...${NC}"
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name 通过${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name 失败${NC}"
        return 1
    fi
}

# 环境检查
echo -e "${YELLOW}[0/7] 环境检查...${NC}"
echo "----------------------------------------"
if npm run check; then
    echo -e "${GREEN}✅ 环境检查通过${NC}"
else
    echo -e "${RED}❌ 环境检查失败，建议先解决环境问题${NC}"
    ((error_count++))
    echo ""
    echo "是否继续运行测试？按 Enter 继续，Ctrl+C 取消..."
    read
fi
echo ""

# 运行测试
run_test "单元测试" "npm run test:unit" "1/7" || ((error_count++))
echo ""

run_test "API 测试" "npm run test:api" "2/7" || ((error_count++))
echo ""

run_test "多模态测试" "npm run test:multimodal" "3/7" || ((error_count++))
echo ""

run_test "会话管理测试" "npm run test:session" "4/7" || ((error_count++))
echo ""

run_test "工具测试" "npm run test:util" "5/7" || ((error_count++))
echo ""

run_test "集成测试" "npm run test:integration" "6/7" || ((error_count++))
echo ""

echo "================================================"
echo " 测试结果汇总"
echo "================================================"

if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试都通过了！${NC}"
    echo -e "${GREEN}✅ 单元测试      ✅ API 测试${NC}"
    echo -e "${GREEN}✅ 多模态测试    ✅ 会话管理测试${NC}"
    echo -e "${GREEN}✅ 工具测试      ✅ 集成测试${NC}"
    echo ""
    echo -e "${GREEN}系统状态: 健康 ✅${NC}"
else
    echo -e "${RED}❌ 有 $error_count 个测试类别失败${NC}"
    echo ""
    echo "请检查上面的详细错误信息"
    echo "建议先运行单个测试类别进行调试："
    echo "  npm run test:unit"
    echo "  npm run test:api"
    echo "  npm run test:multimodal"
    echo "  npm run test:session"
    echo "  npm run test:util"
    echo "  npm run test:integration"
fi

echo ""
echo "测试完成时间: $(date)"
echo "================================================"

if [ $error_count -ne 0 ]; then
    exit 1
fi
