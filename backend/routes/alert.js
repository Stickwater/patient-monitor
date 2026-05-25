// 报警路由
const express = require('express');
const router = express.Router();
const alertController = require('../controllers/AlertController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/v1/alerts - 获取报警列表
router.get('/', authenticate, authorize('nurse', 'doctor'), alertController.getAlerts);

// GET /api/v1/alerts/stats - 获取报警统计
router.get('/stats', authenticate, authorize('nurse', 'doctor'), alertController.getAlertStats);

// GET /api/v1/alerts/:alertId - 获取报警详情
router.get('/:alertId', authenticate, authorize('nurse', 'doctor'), alertController.getAlertById);

// POST /api/v1/alerts/:alertId/confirm - 确认报警
router.post('/:alertId/confirm', authenticate, authorize('nurse', 'doctor'), alertController.confirmAlert);

// POST /api/v1/alerts/:alertId/resolve - 解除报警
router.post('/:alertId/resolve', authenticate, authorize('nurse', 'doctor'), alertController.resolveAlert);

// POST /api/v1/alerts/:alertId/escalate - 升级报警
router.post('/:alertId/escalate', authenticate, authorize('nurse', 'doctor'), alertController.escalateAlert);

module.exports = router;
