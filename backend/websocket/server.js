// WebSocket服务器
const WebSocket = require('ws');
const { verifyToken } = require('../config/jwt');
const { User } = require('../models');

let wss = null;
const clients = new Map(); // userId -> Set of WebSocket connections

// 初始化WebSocket服务器
const initWebSocket = (server) => {
  wss = new WebSocket.Server({ 
    server,
    path: '/ws/vitals'
  });

  wss.on('connection', async (ws, req) => {
    console.log('新的WebSocket连接');

    // 从查询参数获取token
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, '未提供认证token');
      return;
    }

    // 验证token
    const decoded = verifyToken(token);
    if (!decoded) {
      ws.close(4002, 'Token无效');
      return;
    }

    const userId = decoded.userId;
    
    // 保存连接
    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId).add(ws);

    console.log(`用户 ${userId} 已连接，当前连接数: ${clients.size}`);

    // 发送连接成功消息
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      message: '连接成功',
      timestamp: new Date().toISOString()
    }));

    // 处理消息
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(userId, data, ws);
      } catch (error) {
        console.error('消息解析错误:', error);
      }
    });

    // 处理断开
    ws.on('close', () => {
      const userClients = clients.get(userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          clients.delete(userId);
        }
      }
      console.log(`用户 ${userId} 已断开`);
    });

    // 处理错误
    ws.on('error', (error) => {
      console.error('WebSocket错误:', error);
    });
  });

  console.log('WebSocket服务器已启动');
  return wss;
};

// 处理WebSocket消息
const handleMessage = (userId, data, ws) => {
  switch (data.type) {
    case 'HEARTBEAT':
      ws.send(JSON.stringify({
        type: 'HEARTBEAT_ACK',
        timestamp: new Date().toISOString()
      }));
      break;
    
    case 'SUBSCRIBE_PATIENT':
      // 订阅患者实时数据
      console.log(`用户 ${userId} 订阅了患者 ${data.patientId}`);
      ws.subscribedPatients = ws.subscribedPatients || new Set();
      ws.subscribedPatients.add(data.patientId);
      break;

    case 'UNSUBSCRIBE_PATIENT':
      if (ws.subscribedPatients) {
        ws.subscribedPatients.delete(data.patientId);
      }
      break;

    default:
      console.log(`未知消息类型: ${data.type}`);
  }
};

// 广播消息给所有连接
const broadcast = (message) => {
  if (!wss) return;

  const messageStr = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
};

// 发送给指定用户
const sendToUser = (userId, message) => {
  const userClients = clients.get(userId);
  if (!userClients) return;

  const messageStr = JSON.stringify(message);
  userClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
};

// 广播生理数据更新
const emitVitalUpdate = (patientId, vitalData) => {
  broadcast({
    type: 'VITAL_UPDATE',
    patientId,
    data: vitalData,
    timestamp: new Date().toISOString()
  });
};

// 广播报警信息
const emitAlert = (alertData) => {
  // 发送给所有护士
  broadcast({
    type: 'ALERT',
    alert: alertData.alert,
    timestamp: new Date().toISOString()
  });

  // 如果是升级报警，单独通知医生
  if (alertData.type === 'ALERT_ESCALATED') {
    sendToUser(alertData.alert.doctorId, {
      type: 'ALERT_ESCALATED',
      alert: alertData.alert,
      timestamp: new Date().toISOString()
    });
  }
};

// 获取连接统计
const getConnectionStats = () => {
  return {
    totalConnections: clients.size,
    userCount: clients.size,
    connections: Array.from(clients.entries()).map(([userId, wsSet]) => ({
      userId,
      connectionCount: wsSet.size
    }))
  };
};

module.exports = {
  initWebSocket,
  broadcast,
  sendToUser,
  emitVitalUpdate,
  emitAlert,
  getConnectionStats
};
