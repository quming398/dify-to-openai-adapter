@echo off
echo ================================================
echo  Dify to OpenAI API Adapter - 测试套件
echo ================================================
echo 测试时间: %date% %time%
echo.

REM 设置错误处理
setlocal EnableDelayedExpansion
set "error_count=0"

echo [0/7] 环境检查...
echo ----------------------------------------
call npm run check
if %errorlevel% neq 0 (
    echo ❌ 环境检查失败，建议先解决环境问题
    set /a error_count+=1
    echo.
    echo 是否继续运行测试？按任意键继续，Ctrl+C 取消...
    pause >nul
) else (
    echo ✅ 环境检查通过
)
echo.

echo [1/7] 运行单元测试...
echo ----------------------------------------
call npm run test:unit
if %errorlevel% neq 0 (
    echo ❌ 单元测试失败
    set /a error_count+=1
) else (
    echo ✅ 单元测试通过
)
echo.

echo [2/7] 运行 API 测试...
echo ----------------------------------------
call npm run test:api
if %errorlevel% neq 0 (
    echo ❌ API 测试失败
    set /a error_count+=1
) else (
    echo ✅ API 测试通过
)
echo.

echo [3/7] 运行多模态测试...
echo ----------------------------------------
call npm run test:multimodal
if %errorlevel% neq 0 (
    echo ❌ 多模态测试失败
    set /a error_count+=1
) else (
    echo ✅ 多模态测试通过
)
echo.

echo [4/7] 运行会话管理测试...
echo ----------------------------------------
call npm run test:session
if %errorlevel% neq 0 (
    echo ❌ 会话管理测试失败
    set /a error_count+=1
) else (
    echo ✅ 会话管理测试通过
)
echo.

echo [5/7] 运行工具测试...
echo ----------------------------------------
call npm run test:util
if %errorlevel% neq 0 (
    echo ❌ 工具测试失败
    set /a error_count+=1
) else (
    echo ✅ 工具测试通过
)
echo.

echo [6/7] 运行集成测试...
echo ----------------------------------------
call npm run test:integration
if %errorlevel% neq 0 (
    echo ❌ 集成测试失败
    set /a error_count+=1
) else (
    echo ✅ 集成测试通过
)
echo.

echo ================================================
echo  测试结果汇总
echo ================================================
if %error_count% equ 0 (
    echo 🎉 所有测试都通过了！
    echo ✅ 单元测试      ✅ API 测试
    echo ✅ 多模态测试    ✅ 会话管理测试
    echo ✅ 工具测试      ✅ 集成测试
    echo.
    echo 系统状态: 健康 ✅
) else (
    echo ❌ 有 %error_count% 个测试类别失败
    echo.
    echo 请检查上面的详细错误信息
    echo 建议先运行单个测试类别进行调试：
    echo   npm run test:unit
    echo   npm run test:api
    echo   npm run test:multimodal
    echo   npm run test:session
    echo   npm run test:util
    echo   npm run test:integration
)
echo.
echo 测试完成时间: %date% %time%
echo ================================================

if %error_count% neq 0 (
    exit /b 1
)
