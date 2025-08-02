const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}] ${stack || message}`;
  })
);

// 彩色控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level} ${message}`;
  })
);

// 创建 winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // 所有日志 - 按天滚动
    new DailyRotateFile({
      filename: path.join(logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat
    }),
    
    // 错误日志 - 单独文件
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat
    }),
    
    // 请求日志 - 单独文件
    new DailyRotateFile({
      filename: path.join(logDir, 'requests-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.printf(({ timestamp, message }) => {
          return `${timestamp} ${message}`;
        })
      )
    })
  ]
});

// 创建专门的请求日志记录器
const requestLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.printf(({ timestamp, message }) => {
      return `${timestamp} ${message}`;
    })
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'requests-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '7d'
    })
  ]
});

// 包装 console 方法以同时输出到日志文件
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

// 重写 console 方法
console.log = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  
  originalConsole.log(...args);
  logger.info(message);
};

console.info = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  
  originalConsole.info(...args);
  logger.info(message);
};

console.warn = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  
  originalConsole.warn(...args);
  logger.warn(message);
};

console.error = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  
  originalConsole.error(...args);
  logger.error(message);
};

console.debug = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  
  originalConsole.debug(...args);
  logger.debug(message);
};

// 导出方法
module.exports = {
  logger,
  requestLogger,
  
  // 专门的日志方法
  logRequest: (message) => {
    requestLogger.info(message);
  },
  
  logInfo: (message) => {
    logger.info(message);
  },
  
  logWarn: (message) => {
    logger.warn(message);
  },
  
  logError: (message, error = null) => {
    if (error) {
      logger.error(`${message} - Error: ${error.message}`, { stack: error.stack });
    } else {
      logger.error(message);
    }
  },
  
  logDebug: (message) => {
    logger.debug(message);
  }
};
