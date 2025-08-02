const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function colorLog(color, message) {
  console.log(color + message + colors.reset);
}

// 项目维护工具
class ProjectMaintenance {
  constructor() {
    this.projectRoot = __dirname.replace(/\\/g, '/').replace('/tests', '');
    this.logFile = path.join(this.projectRoot, 'logs', 'maintenance.log');
  }

  // 日志记录
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    // 确保日志目录存在
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(this.logFile, logMessage);
    console.log(`[${level}] ${message}`);
  }

  // 检查项目健康状态
  async checkProjectHealth() {
    colorLog(colors.blue + colors.bright, '🔍 项目健康检查');
    console.log('='.repeat(60));
    
    const checks = {
      dependencies: await this.checkDependencies(),
      configFiles: this.checkConfigFiles(),
      testStructure: this.checkTestStructure(),
      codeQuality: await this.checkCodeQuality(),
      logs: this.checkLogFiles()
    };
    
    this.generateHealthReport(checks);
    return checks;
  }

  // 检查依赖
  async checkDependencies() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(
        path.join(this.projectRoot, 'package.json'), 'utf8'
      ));
      
      const outdatedResult = await execAsync('npm outdated --json', { 
        cwd: this.projectRoot 
      }).catch(() => ({ stdout: '{}' }));
      
      const outdated = JSON.parse(outdatedResult.stdout || '{}');
      const outdatedCount = Object.keys(outdated).length;
      
      if (outdatedCount === 0) {
        colorLog(colors.green, '✅ 所有依赖都是最新的');
        return { status: 'good', outdated: 0 };
      } else {
        colorLog(colors.yellow, `⚠️ 有 ${outdatedCount} 个过时的依赖`);
        Object.keys(outdated).forEach(pkg => {
          console.log(`  📦 ${pkg}: ${outdated[pkg].current} → ${outdated[pkg].latest}`);
        });
        return { status: 'warning', outdated: outdatedCount, packages: outdated };
      }
    } catch (error) {
      colorLog(colors.red, '❌ 依赖检查失败: ' + error.message);
      return { status: 'error', error: error.message };
    }
  }
  // 检查配置文件
  checkConfigFiles() {
    const configFiles = [
      'config.json',
      'config.template.json',
      'package.json'
    ];
    
    let allPresent = true;
    const missing = [];
    
    configFiles.forEach(file => {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        missing.push(file);
        allPresent = false;
      }
    });
    
    if (allPresent) {
      colorLog(colors.green, '✅ 所有配置文件都存在');
      return { status: 'good' };
    } else {
      colorLog(colors.red, `❌ 缺少配置文件: ${missing.join(', ')}`);
      return { status: 'error', missing };
    }
  }

  // 检查测试结构
  checkTestStructure() {
    const testDir = path.join(this.projectRoot, 'tests');
    const expectedDirs = ['unit', 'integration', 'api', 'multimodal', 'session', 'util'];
    
    let totalTests = 0;
    const structure = {};
    
    expectedDirs.forEach(dir => {
      const dirPath = path.join(testDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.js'));
        structure[dir] = files.length;
        totalTests += files.length;
      } else {
        structure[dir] = 0;
      }
    });
    
    colorLog(colors.green, `📊 测试结构: ${totalTests} 个测试文件`);
    expectedDirs.forEach(dir => {
      console.log(`  📁 ${dir}: ${structure[dir]} 个文件`);
    });
    
    return { status: 'good', totalTests, structure };
  }

  // 检查代码质量
  async checkCodeQuality() {
    try {
      const srcDir = path.join(this.projectRoot, 'src');
      const jsFiles = this.getJSFiles(srcDir);
      
      let totalLines = 0;
      let totalFiles = jsFiles.length;
      const largeFiles = [];
      
      jsFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').length;
        totalLines += lines;
        
        if (lines > 500) {
          largeFiles.push({ file: path.relative(this.projectRoot, file), lines });
        }
      });
      
      colorLog(colors.green, `📊 代码统计: ${totalFiles} 个文件，${totalLines} 行代码`);
      
      if (largeFiles.length > 0) {
        colorLog(colors.yellow, '⚠️ 大文件提醒:');
        largeFiles.forEach(({ file, lines }) => {
          console.log(`  📄 ${file}: ${lines} 行`);
        });
      }
      
      return { 
        status: largeFiles.length > 0 ? 'warning' : 'good', 
        totalFiles, 
        totalLines, 
        largeFiles 
      };
    } catch (error) {
      colorLog(colors.red, '❌ 代码质量检查失败: ' + error.message);
      return { status: 'error', error: error.message };
    }
  }

  // 检查日志文件
  checkLogFiles() {
    const logDir = path.join(this.projectRoot, 'logs');
    
    if (!fs.existsSync(logDir)) {
      colorLog(colors.yellow, '⚠️ 日志目录不存在');
      return { status: 'warning', message: '日志目录不存在' };
    }
    
    const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
    let totalSize = 0;
    
    logFiles.forEach(file => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });
    
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
    
    if (totalSize > 100 * 1024 * 1024) { // 100MB
      colorLog(colors.yellow, `⚠️ 日志文件较大: ${sizeMB}MB`);
      return { status: 'warning', size: sizeMB, files: logFiles.length };
    } else {
      colorLog(colors.green, `✅ 日志文件正常: ${sizeMB}MB`);
      return { status: 'good', size: sizeMB, files: logFiles.length };
    }
  }

  // 获取 JS 文件列表
  getJSFiles(dir) {
    let files = [];
    
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files = files.concat(this.getJSFiles(fullPath));
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  // 生成健康报告
  generateHealthReport(checks) {
    console.log('\n' + '='.repeat(60));
    colorLog(colors.blue + colors.bright, '📋 健康报告汇总');
    console.log('='.repeat(60));
    
    const categories = [
      { name: '依赖管理', check: checks.dependencies },
      { name: '配置文件', check: checks.configFiles },
      { name: '测试结构', check: checks.testStructure },
      { name: '代码质量', check: checks.codeQuality },
      { name: '日志管理', check: checks.logs }
    ];
    
    let goodCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    
    categories.forEach(({ name, check }) => {
      let status, icon, color;
      
      switch (check.status) {
        case 'good':
          status = '良好';
          icon = '✅';
          color = colors.green;
          goodCount++;
          break;
        case 'warning':
          status = '警告';
          icon = '⚠️';
          color = colors.yellow;
          warningCount++;
          break;
        case 'error':
          status = '错误';
          icon = '❌';
          color = colors.red;
          errorCount++;
          break;
      }
      
      colorLog(color, `${icon} ${name}: ${status}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (errorCount === 0 && warningCount === 0) {
      colorLog(colors.green + colors.bright, '🎉 项目状态优秀！所有检查都通过了。');
    } else if (errorCount === 0) {
      colorLog(colors.yellow + colors.bright, `⚠️ 项目状态良好，但有 ${warningCount} 个警告需要关注。`);
    } else {
      colorLog(colors.red + colors.bright, `❌ 项目有 ${errorCount} 个错误需要修复。`);
    }
    
    this.log(`Health check completed: ${goodCount} good, ${warningCount} warnings, ${errorCount} errors`);
  }

  // 清理日志文件
  async cleanLogs() {
    colorLog(colors.blue + colors.bright, '🧹 清理日志文件');
    
    const logDir = path.join(this.projectRoot, 'logs');
    if (!fs.existsSync(logDir)) {
      colorLog(colors.yellow, '⚠️ 日志目录不存在');
      return;
    }
    
    const files = fs.readdirSync(logDir);
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    let cleanedCount = 0;
    let savedSpace = 0;
    
    files.forEach(file => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime.getTime() < sevenDaysAgo) {
        savedSpace += stats.size;
        fs.unlinkSync(filePath);
        cleanedCount++;
        this.log(`Cleaned old log file: ${file}`);
      }
    });
    
    if (cleanedCount > 0) {
      const savedMB = (savedSpace / 1024 / 1024).toFixed(2);
      colorLog(colors.green, `✅ 清理了 ${cleanedCount} 个旧日志文件，节省 ${savedMB}MB 空间`);
    } else {
      colorLog(colors.green, '✅ 没有需要清理的旧日志文件');
    }
  }

  // 更新依赖
  async updateDependencies() {
    colorLog(colors.blue + colors.bright, '📦 更新依赖');
    
    try {
      colorLog(colors.yellow, '⏳ 正在检查可更新的依赖...');
      await execAsync('npm update', { cwd: this.projectRoot });
      
      colorLog(colors.green, '✅ 依赖更新完成');
      this.log('Dependencies updated successfully');
    } catch (error) {
      colorLog(colors.red, '❌ 依赖更新失败: ' + error.message);
      this.log('Dependencies update failed: ' + error.message, 'ERROR');
    }
  }

  // 运行维护任务
  async runMaintenance() {
    console.log('🔧 项目维护工具启动');
    console.log('时间:', new Date().toLocaleString());
    console.log('='.repeat(60));
    
    // 1. 健康检查
    const healthChecks = await this.checkProjectHealth();
    
    // 2. 清理日志
    await this.cleanLogs();
    
    // 3. 如果有过时的依赖，询问是否更新
    if (healthChecks.dependencies.status === 'warning') {
      console.log('\n是否要更新过时的依赖？(y/N)');
      // 在实际使用中可以添加用户输入处理
    }
    
    console.log('\n🎯 维护建议:');
    if (healthChecks.codeQuality.largeFiles?.length > 0) {
      console.log('  • 考虑重构大文件，提高代码可维护性');
    }
    if (healthChecks.logs.status === 'warning') {
      console.log('  • 考虑设置日志轮转，控制日志文件大小');
    }
    if (healthChecks.dependencies.status === 'warning') {
      console.log('  • 定期更新依赖，保持安全性');
    }
    
    console.log('\n✨ 维护完成！');
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const maintenance = new ProjectMaintenance();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'health':
      maintenance.checkProjectHealth();
      break;
    case 'clean':
      maintenance.cleanLogs();
      break;
    case 'update':
      maintenance.updateDependencies();
      break;
    case 'full':
    default:
      maintenance.runMaintenance();
      break;
  }
}

module.exports = ProjectMaintenance;
