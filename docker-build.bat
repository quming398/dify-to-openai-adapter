@echo off
echo Dify to OpenAI Docker 构建脚本
echo ================================

echo.
echo 正在检测网络环境...

REM 尝试连接 Docker Hub
echo 测试 Docker Hub 连接...
docker pull hello-world >nul 2>&1
if %errorlevel% == 0 (
    echo [成功] Docker Hub 连接正常
    echo 使用官方镜像构建...
    docker build -t dify-to-openai .
) else (
    echo [失败] Docker Hub 连接超时
    echo 尝试使用国内镜像源...
    
    REM 检查是否存在国内镜像 Dockerfile
    if exist "Dockerfile.cn" (
        echo 使用国内镜像源构建...
        docker build -f Dockerfile.cn -t dify-to-openai .
    ) else (
        echo 创建国内镜像源 Dockerfile...
        echo # 使用阿里云镜像源 > Dockerfile.cn
        echo FROM registry.cn-hangzhou.aliyuncs.com/library/node:18-alpine >> Dockerfile.cn
        echo. >> Dockerfile.cn
        echo WORKDIR /app >> Dockerfile.cn
        echo. >> Dockerfile.cn
        echo # 设置 npm 国内镜像源 >> Dockerfile.cn
        echo RUN npm config set registry https://registry.npmmirror.com >> Dockerfile.cn
        echo. >> Dockerfile.cn
        type Dockerfile | findstr /v "FROM node:18-alpine" >> Dockerfile.cn
        
        echo 使用国内镜像源构建...
        docker build -f Dockerfile.cn -t dify-to-openai .
    )
)

if %errorlevel% == 0 (
    echo.
    echo [成功] Docker 镜像构建完成！
    echo.
    echo 使用以下命令运行容器：
    echo docker run -p 3000:3000 -v %cd%\config.json:/app/config.json dify-to-openai
    echo.
    echo 或使用 docker-compose：
    echo docker-compose up -d
) else (
    echo.
    echo [失败] Docker 镜像构建失败！
    echo.
    echo 可能的解决方案：
    echo 1. 检查网络连接
    echo 2. 配置 Docker 镜像源
    echo 3. 使用代理服务器
    echo.
    echo 详细信息请运行 docker-fix.bat
)

pause
