const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 项目状态仪表板
class ProjectDashboard {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.startTime = Date.now();
  }

  // 颜色输出
  colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m',
    gray: '\x1b[90m'
  };

  colorLog(color, message) {
    console.log(color + message + this.colors.reset);
  }

  // 清屏并移动光标到顶部
  clearScreen() {
    console.clear();
  }

  // 获取服务状态
  async getServiceStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
      return {
        status: 'online',
        uptime: response.data.uptime || 'N/A',
        timestamp: response.data.timestamp || new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'offline',
        error: error.code === 'ECONNREFUSED' ? 'Service not running' : error.message
      };
    }
  }

  // 获取会话统计
  async getSessionStats() {
    try {
      const response = await axios.get(`${this.baseUrl}/health/sessions`, { 
        timeout: 2000,
        headers: { 'Authorization': 'Bearer dashboard-key' }
      });
      return {
        available: true,
        conversations: Object.keys(response.data.conversations || {}).length,
        openaiMappings: response.data.openaiMappings || 0,
        lastActivity: response.data.lastActivity || {}
      };
    } catch (error) {
      return {
        available: false,
        error: error.response?.status === 401 ? 'Auth required' : 'Unavailable'
      };
    }
  }

  // 获取模型列表
  async getModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/models`, { 
        timeout: 2000,
        headers: { 'Authorization': 'Bearer dashboard-key' }
      });
      return {
        available: true,
        count: response.data.data?.length || 0,
        models: response.data.data || []
      };
    } catch (error) {
      return {
        available: false,
        error: error.response?.status === 401 ? 'Auth required' : 'Unavailable'
      };
    }
  }

  // 获取日志统计
  getLogStats() {
    try {
      const logDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logDir)) {
        return { available: false, error: 'Log directory not found' };
      }

      const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
      let totalSize = 0;
      let latestLog = null;
      let latestTime = 0;

      files.forEach(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        
        if (stats.mtime.getTime() > latestTime) {
          latestTime = stats.mtime.getTime();
          latestLog = file;
        }
      });

      return {
        available: true,
        fileCount: files.length,
        totalSize: (totalSize / 1024 / 1024).toFixed(2), // MB
        latestLog,
        latestTime: latestTime ? new Date(latestTime).toLocaleString() : 'N/A'
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  // 获取配置状态
  getConfigStatus() {
    try {
      const configPath = path.join(__dirname, '..', 'config.json');
      if (!fs.existsSync(configPath)) {
        return { available: false, error: 'Config file not found' };
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const modelMappings = config.model_mappings || {};
      
      return {
        available: true,
        modelCount: Object.keys(modelMappings).length,
        models: Object.keys(modelMappings)
      };
    } catch (error) {
      return { available: false, error: 'Invalid config format' };
    }
  }

  // 渲染状态栏
  renderStatusBar(status) {
    const indicator = status === 'online' 
      ? this.colors.green + '●' + this.colors.reset
      : this.colors.red + '●' + this.colors.reset;
    
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const uptimeStr = `${Math.floor(uptime / 60)}:${(uptime % 60).toString().padStart(2, '0')}`;
    
    return `${indicator} Dify-OpenAI Dashboard | Status: ${status} | Monitoring: ${uptimeStr}`;
  }

  // 渲染仪表板
  async renderDashboard() {
    this.clearScreen();
    
    // 获取所有状态
    const [serviceStatus, sessionStats, models, logStats, configStatus] = await Promise.all([
      this.getServiceStatus(),
      this.getSessionStats(),
      this.getModels(),
      this.getLogStats(),
      Promise.resolve(this.getConfigStatus())
    ]);

    // 标题栏
    console.log('═'.repeat(80));
    this.colorLog(this.colors.blue + this.colors.bright, 
      '🚀 Dify to OpenAI API Adapter - Real-time Dashboard');
    console.log(this.renderStatusBar(serviceStatus.status));
    console.log('═'.repeat(80));

    // 服务状态区域
    console.log('\n📊 SERVICE STATUS');
    console.log('─'.repeat(40));
    if (serviceStatus.status === 'online') {
      this.colorLog(this.colors.green, '✅ Service: ONLINE');
      console.log(`⏱️  Uptime: ${serviceStatus.uptime}`);
      console.log(`🕐 Last Check: ${new Date().toLocaleTimeString()}`);
    } else {
      this.colorLog(this.colors.red, '❌ Service: OFFLINE');
      console.log(`💥 Error: ${serviceStatus.error}`);
    }

    // 配置状态
    console.log('\n⚙️  CONFIGURATION');
    console.log('─'.repeat(40));
    if (configStatus.available) {
      this.colorLog(this.colors.green, `✅ Config: ${configStatus.modelCount} models configured`);
      configStatus.models.slice(0, 3).forEach(model => {
        console.log(`   📋 ${model}`);
      });
      if (configStatus.modelCount > 3) {
        console.log(`   ... and ${configStatus.modelCount - 3} more`);
      }
    } else {
      this.colorLog(this.colors.red, `❌ Config: ${configStatus.error}`);
    }

    // API 状态
    console.log('\n🔌 API ENDPOINTS');
    console.log('─'.repeat(40));
    if (models.available) {
      this.colorLog(this.colors.green, `✅ Models API: ${models.count} models available`);
    } else {
      this.colorLog(this.colors.red, `❌ Models API: ${models.error}`);
    }

    if (sessionStats.available) {
      this.colorLog(this.colors.green, 
        `✅ Sessions API: ${sessionStats.conversations} conversations, ${sessionStats.openaiMappings} mappings`);
    } else {
      this.colorLog(this.colors.red, `❌ Sessions API: ${sessionStats.error}`);
    }

    // 日志状态
    console.log('\n📝 LOGS & MONITORING');
    console.log('─'.repeat(40));
    if (logStats.available) {
      this.colorLog(this.colors.green, 
        `✅ Logs: ${logStats.fileCount} files, ${logStats.totalSize}MB total`);
      console.log(`📄 Latest: ${logStats.latestLog || 'None'}`);
      console.log(`🕐 Updated: ${logStats.latestTime}`);
    } else {
      this.colorLog(this.colors.red, `❌ Logs: ${logStats.error}`);
    }

    // 快速操作
    console.log('\n🎮 QUICK ACTIONS');
    console.log('─'.repeat(40));
    console.log('Press:');
    console.log('  [R] Refresh dashboard');
    console.log('  [T] Run tests');
    console.log('  [L] View latest logs');
    console.log('  [C] Check environment');
    console.log('  [Q] Quit');

    console.log('\n' + '═'.repeat(80));
    this.colorLog(this.colors.gray, 
      `Dashboard refreshed at ${new Date().toLocaleTimeString()} | Press any key for actions`);
  }

  // 启动实时监控
  async startMonitoring() {
    console.log('🚀 Starting Dify-OpenAI Dashboard...\n');
    
    // 初始渲染
    await this.renderDashboard();

    // 设置自动刷新
    const refreshInterval = setInterval(async () => {
      await this.renderDashboard();
    }, 10000); // 每10秒刷新

    // 监听键盘输入
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async (key) => {
      const keyStr = key.toString().toLowerCase();
      
      switch (keyStr) {
        case 'q':
          clearInterval(refreshInterval);
          process.stdin.setRawMode(false);
          console.log('\n👋 Dashboard stopped. Goodbye!');
          process.exit(0);
          break;
          
        case 'r':
          await this.renderDashboard();
          break;
          
        case 't':
          clearInterval(refreshInterval);
          process.stdin.setRawMode(false);
          console.log('\n🧪 Running tests...');
          const { spawn } = require('child_process');
          const testProcess = spawn('npm', ['run', 'test:all'], { 
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
          });
          testProcess.on('close', () => {
            console.log('\nPress any key to return to dashboard...');
            process.stdin.once('data', () => {
              this.startMonitoring();
            });
          });
          break;
          
        case 'c':
          clearInterval(refreshInterval);
          process.stdin.setRawMode(false);
          console.log('\n🔍 Checking environment...');
          const { spawn: spawnCheck } = require('child_process');
          const checkProcess = spawnCheck('npm', ['run', 'check'], { 
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
          });
          checkProcess.on('close', () => {
            console.log('\nPress any key to return to dashboard...');
            process.stdin.once('data', () => {
              this.startMonitoring();
            });
          });
          break;
          
        case 'l':
          console.log('\n📄 Latest log entries would be shown here...');
          // 这里可以添加显示最新日志的逻辑
          break;
          
        default:
          // 刷新显示
          await this.renderDashboard();
          break;
      }
    });

    // 优雅退出处理
    process.on('SIGINT', () => {
      clearInterval(refreshInterval);
      process.stdin.setRawMode(false);
      console.log('\n👋 Dashboard stopped. Goodbye!');
      process.exit(0);
    });
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const dashboard = new ProjectDashboard();
  dashboard.startMonitoring().catch(console.error);
}

module.exports = ProjectDashboard;
