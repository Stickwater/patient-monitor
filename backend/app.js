// 患者监护系统 - 主应用入口
const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

// 导入配置和模型
const { sequelize, testConnection, setupAssociations } = require('./models');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initWebSocket, getConnectionStats } = require('./websocket/server');
const { setupAllTasks } = require('./task/scheduledTasks');

// 导入路由
const setupRoutes = require('./routes');

const app = express();
const server = http.createServer(app);

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    code: 200,
    message: '服务正常运行',
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      websocket: getConnectionStats()
    }
  });
});

// 静态文件服务（托管前端打包产物）
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API 路由
setupRoutes(app);

// SPA 路由兜底：未匹配到 API 的请求指向前端 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 测试数据库连接
    await testConnection();
    
    // 初始化模型关联
    setupAssociations();
    
    // 同步数据库（开发环境）
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('数据库模型同步完成');
    }

    // 初始化WebSocket
    initWebSocket(server);

    // 启动定时任务
    setupAllTasks();

    // 启动HTTP服务器
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║           患者监护系统 API 服务已启动                       ║
╠═══════════════════════════════════════════════════════════╣
║  HTTP Server: http://localhost:${PORT}                       ║
║  WebSocket:   ws://localhost:${PORT}/ws/vitals               ║
║  环境:        ${process.env.NODE_ENV || 'development'}                              ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    sequelize.close();
    console.log('服务器已关闭');
    process.exit(0);
  });
});

startServer();

module.exports = { app, server };
