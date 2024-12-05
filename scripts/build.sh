#!/bin/bash

# 检查是否安装了必要的依赖
if ! command -v yarn &> /dev/null; then
    echo "错误: 未安装 yarn"
    exit 1
fi

# 清理之前的构建
echo "清理之前的构建..."
rm -rf dist
mkdir -p dist/assets
mkdir -p dist/config
mkdir -p dist/src

# 复制源代码文件
echo "复制源代码文件..."
cp -r src/* dist/src/ || {
    echo "错误: 复制源代码文件失败"
    exit 1
}

# 复制配置文件和资源文件
echo "复制配置文件..."
cp config/exam-config.json dist/config/ || {
    echo "错误: 复制配置文件失败"
    exit 1
}

# 复制 assets 目录
echo "复制 assets 目录..."
if [ -d "assets" ]; then
    cp -r assets/* dist/assets/ 2>/dev/null || true
fi

echo "复制说明文档..."
cp README.md dist/ || {
    echo "错误: 复制说明文档失败"
    exit 1
}

cp "使用说明.txt" dist/ 2>/dev/null || {
    echo "警告: 复制使用说明失败"
}

# 复制 package.json 和 pkg 配置
echo "复制配置文件..."
cp package.json dist/ || {
    echo "错误: 复制 package.json 失败"
    exit 1
}

# 安装依赖
echo "安装依赖..."
cd dist && yarn install --production || {
    echo "错误: 安装依赖失败"
    exit 1
}
cd ..

# 构建 Windows 版本
echo "构建 Windows 版本..."
NODE_OPTIONS="--no-warnings" yarn build:win || {
    echo "错误: Windows 版本构建失败"
    exit 1
}

# 构建 macOS 版本
echo "构建 macOS 版本..."
NODE_OPTIONS="--no-warnings" yarn build:mac || {
    echo "错误: macOS 版本构建失败"
    exit 1
}

# 清理临时文件
echo "清理临时文件..."
rm -rf dist/node_modules
rm -rf dist/package.json

# 添加执行权限
echo "添加执行权限..."
chmod +x dist/create-exam-macos || {
    echo "警告: 添加执行权限失败"
}

# 创建启动脚本
echo "创建启动脚本..."
cat > dist/start-mac.sh << 'EOL'
#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"
./create-exam-macos create -c config/exam-config.json
EOL

cat > dist/start-win.bat << 'EOL'
@echo off
cd /d "%~dp0"
create-exam-win.exe create -c config/exam-config.json
pause
EOL

chmod +x dist/start-mac.sh

echo "构建完成！"
echo "Windows 版本: dist/create-exam-win.exe (使用 start-win.bat 启动)"
echo "macOS 版本: dist/create-exam-macos (使用 start-mac.sh 启动)"
echo "请确保配置文件和考生名单放在正确的位置" 