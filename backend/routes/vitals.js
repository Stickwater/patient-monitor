// 生理信号路由
const express = require('express');
const router = express.Router();
const vitalSignController = require('../controllers/VitalSignController');
const { authenticate, authorize } = require('../middleware/auth');

// POST /api/v1/vitals/upload - 上传生理信号（传感器调用或患者手动录入）
router.post('/upload', authenticate, vitalSignController.uploadVitalSign);

// GET /api/v1/vitals/my - 获取我的体征数据（患者端）
router.get('/my', authenticate, authorize('patient'), vitalSignController.getMyVitals);

// GET /api/v1/vitals/realtime/:patientId - 获取实时数据
router.get('/realtime/:patientId', authenticate, vitalSignController.getRealtimeData);

// GET /api/v1/vitals/history/:patientId - 获取历史数据
router.get('/history/:patientId', authenticate, vitalSignController.getHistoryData);

// GET /api/v1/vitals/trend/:patientId - 获取趋势数据
router.get('/trend/:patientId', authenticate, vitalSignController.getTrendData);

module.exports = router;
