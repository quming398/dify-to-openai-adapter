const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 项目设置向导
class ProjectSetupWizard {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.projectRoot = __dirname.replace(/\\/g, '/').replace('/tests', '');
    this.config = {
      model_mappings: {}
    };
  }

  // 颜色输出
  colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m'
  };

  colorLog(color, message) {
    console.log(color + message + this.colors.reset);
  }

  // 询问用户输入
  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  // 询问是否确认
  askConfirm(question) {
    return new Promise((resolve) => {
      this.rl.question(question + ' (y/N): ', (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  // 显示欢迎信息
  showWelcome() {
    console.clear();
    this.colorLog(this.colors.blue + this.colors.bright, 
      '🚀 Dify to OpenAI API 适配器 - 项目设置向导');
    console.log('='.repeat(60));
    console.log('本向导将帮助您快速配置项目，包括：');
    console.log('• 检查依赖和环境');
    console.log('• 创建配置文件');
    console.log('• 配置 Dify 应用映射');
    console.log('• 验证设置');
    console.log('='.repeat(60));
    console.log('');
  }

  // 检查先决条件
  async checkPrerequisites() {
    this.colorLog(this.colors.yellow, '📋 步骤 1: 检查先决条件');
    console.log('─'.repeat(40));

    // 检查 Node.js
    try {
      const { execSync } = require('child_process');
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      this.colorLog(this.colors.green, `✅ Node.js: ${nodeVersion}`);
    } catch (error) {
      this.colorLog(this.colors.red, '❌ Node.js 未安装或不在 PATH 中');
      return false;
    }

    // 检查 npm
    try {
      const { execSync } = require('child_process');
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      this.colorLog(this.colors.green, `✅ npm: v${npmVersion}`);
    } catch (error) {
      this.colorLog(this.colors.red, '❌ npm 未安装');
      return false;
    }

    // 检查 package.json
    const packagePath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(packagePath)) {
      this.colorLog(this.colors.green, '✅ package.json 存在');
    } else {
      this.colorLog(this.colors.red, '❌ package.json 不存在');
      return false;
    }

    console.log('');
    return true;
  }

  // 安装依赖
  async installDependencies() {
    this.colorLog(this.colors.yellow, '📦 步骤 2: 安装依赖');
    console.log('─'.repeat(40));

    const shouldInstall = await this.askConfirm('是否安装/更新项目依赖？');
    
    if (shouldInstall) {
      try {
        console.log('⏳ 正在安装依赖...');
        const { execSync } = require('child_process');
        execSync('npm install', { 
          cwd: this.projectRoot, 
          stdio: 'inherit' 
        });
        this.colorLog(this.colors.green, '✅ 依赖安装完成');
      } catch (error) {
        this.colorLog(this.colors.red, '❌ 依赖安装失败');
        return false;
      }
    } else {
      this.colorLog(this.colors.yellow, '⚠️ 跳过依赖安装');
    }

    console.log('');
    return true;
  }

  // 配置 Dify 应用
  async configureDifyApps() {
    this.colorLog(this.colors.yellow, '⚙️ 步骤 3: 配置 Dify 应用');
    console.log('─'.repeat(40));

    console.log('现在开始配置 Dify 应用映射。');
    console.log('您可以配置多个 Dify 应用，每个应用对应一个模型名称。');
    console.log('');

    let addMore = true;
    let appCount = 0;

    while (addMore) {
      appCount++;
      console.log(`🔧 配置第 ${appCount} 个 Dify 应用:`);

      // 模型名称
      const modelName = await this.askQuestion('模型名称 (例如: gpt-3.5-turbo, claude-3): ');
      if (!modelName) {
        console.log('模型名称不能为空，跳过此配置。');
        continue;
      }

      // Dify API Key
      const apiKey = await this.askQuestion('Dify API Key (app-开头): ');
      if (!apiKey || !apiKey.startsWith('app-')) {
        console.log('⚠️ API Key 格式可能不正确，但将继续配置。');
      }

      // Dify 服务器地址
      const baseUrl = await this.askQuestion('Dify 服务器地址 (例如: http://192.168.1.100:880): ');
      if (!baseUrl) {
        console.log('服务器地址不能为空，跳过此配置。');
        continue;
      }

      // 应用名称
      const appName = await this.askQuestion('应用显示名称: ') || modelName;

      // 应用类型
      console.log('应用类型选择:');
      console.log('  1. chatbot (聊天机器人，支持阻塞和流式)');
      console.log('  2. agent (智能代理，仅支持流式)');
      const appTypeChoice = await this.askQuestion('选择应用类型 (1/2): ');
      const appType = appTypeChoice === '2' ? 'agent' : 'chatbot';

      // 保存配置
      this.config.model_mappings[modelName] = {
        dify_api_key: apiKey,
        dify_base_url: baseUrl,
        app_name: appName,
        description: `${appName} - 配置于 ${new Date().toLocaleDateString()}`,
        app_type: appType,
        supports_streaming: true,
        supports_blocking: appType === 'chatbot',
        default_mode: appType === 'chatbot' ? 'blocking' : 'streaming'
      };

      this.colorLog(this.colors.green, `✅ 已配置模型: ${modelName}`);
      console.log('');

      // 询问是否继续添加
      addMore = await this.askConfirm('是否要添加更多 Dify 应用？');
      console.log('');
    }

    if (appCount === 0) {
      this.colorLog(this.colors.yellow, '⚠️ 未配置任何 Dify 应用');
      return false;
    }

    return true;
  }

  // 保存配置文件
  async saveConfiguration() {
    this.colorLog(this.colors.yellow, '💾 步骤 4: 保存配置');
    console.log('─'.repeat(40));

    const configPath = path.join(this.projectRoot, 'config.json');
    
    // 检查是否已存在配置文件
    if (fs.existsSync(configPath)) {
      console.log('⚠️ config.json 文件已存在');
      const shouldOverwrite = await this.askConfirm('是否覆盖现有配置？');
      
      if (!shouldOverwrite) {
        this.colorLog(this.colors.yellow, '⚠️ 跳过保存配置文件');
        return true;
      }
    }

    try {
      // 美化 JSON 格式
      const configContent = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(configPath, configContent, 'utf8');
      
      this.colorLog(this.colors.green, '✅ 配置文件已保存到 config.json');
      
      // 显示配置摘要
      console.log('');
      console.log('📊 配置摘要:');
      const modelCount = Object.keys(this.config.model_mappings).length;
      console.log(`   模型数量: ${modelCount}`);
      Object.keys(this.config.model_mappings).forEach(model => {
        console.log(`   📋 ${model} (${this.config.model_mappings[model].app_type})`);
      });
      
    } catch (error) {
      this.colorLog(this.colors.red, '❌ 配置文件保存失败: ' + error.message);
      return false;
    }

    console.log('');
    return true;
  }

  // 验证配置
  async validateConfiguration() {
    this.colorLog(this.colors.yellow, '✅ 步骤 5: 验证配置');
    console.log('─'.repeat(40));

    const shouldValidate = await this.askConfirm('是否运行环境检查来验证配置？');
    
    if (shouldValidate) {
      try {
        console.log('⏳ 正在验证配置...');
        const { execSync } = require('child_process');
        execSync('npm run check', { 
          cwd: this.projectRoot, 
          stdio: 'inherit' 
        });
        this.colorLog(this.colors.green, '✅ 配置验证完成');
      } catch (error) {
        this.colorLog(this.colors.yellow, '⚠️ 配置验证发现问题，请查看上面的输出');
      }
    } else {
      console.log('跳过配置验证');
    }

    console.log('');
    return true;
  }

  // 显示下一步操作
  showNextSteps() {
    this.colorLog(this.colors.blue + this.colors.bright, '🎉 设置完成！下一步操作:');
    console.log('='.repeat(60));
    console.log('');
    
    console.log('1️⃣ 启动服务:');
    console.log('   npm start');
    console.log('   或者 start.bat (Windows) / ./start.sh (Linux/Mac)');
    console.log('');
    
    console.log('2️⃣ 测试 API:');
    console.log('   npm run test:all');
    console.log('   或者 run-tests.bat (Windows) / ./run-tests.sh (Linux/Mac)');
    console.log('');
    
    console.log('3️⃣ 实时监控:');
    console.log('   npm run dashboard');
    console.log('   或者 dashboard.bat (Windows) / ./dashboard.sh (Linux/Mac)');
    console.log('');
    
    console.log('4️⃣ 测试 API 调用:');
    console.log('   curl -X POST http://localhost:3000/v1/chat/completions \\');
    console.log('     -H "Authorization: Bearer test-key" \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"model":"your-model-name","messages":[{"role":"user","content":"你好"}]}\'');
    console.log('');
      console.log('📚 更多信息:');
    console.log('   • README.md - 完整使用说明');
    console.log('   • tests/README.md - 测试说明');
    console.log('   • docs/DEVELOPER_GUIDE.md - 开发指南');
    console.log('');
    
    this.colorLog(this.colors.green, '🚀 享受使用 Dify to OpenAI API 适配器！');
  }

  // 运行向导
  async runWizard() {
    try {
      this.showWelcome();

      // 检查先决条件
      if (!(await this.checkPrerequisites())) {
        this.colorLog(this.colors.red, '❌ 先决条件检查失败，请安装必要的软件后重试');
        this.rl.close();
        return;
      }

      // 安装依赖
      if (!(await this.installDependencies())) {
        this.colorLog(this.colors.red, '❌ 依赖安装失败');
        this.rl.close();
        return;
      }

      // 配置 Dify 应用
      if (!(await this.configureDifyApps())) {
        this.colorLog(this.colors.red, '❌ Dify 应用配置失败');
        this.rl.close();
        return;
      }

      // 保存配置
      if (!(await this.saveConfiguration())) {
        this.colorLog(this.colors.red, '❌ 配置保存失败');
        this.rl.close();
        return;
      }

      // 验证配置
      await this.validateConfiguration();

      // 显示下一步操作
      this.showNextSteps();

    } catch (error) {
      this.colorLog(this.colors.red, '❌ 设置过程中发生错误: ' + error.message);
    } finally {
      this.rl.close();
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const wizard = new ProjectSetupWizard();
  wizard.runWizard();
}

module.exports = ProjectSetupWizard;
