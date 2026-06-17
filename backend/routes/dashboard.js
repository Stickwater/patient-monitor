// 仪表盘路由
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/DashboardController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/v1/dashboard/overview - 仪表盘聚合数据
router.get('/overview', authenticate, authorize('nurse', 'doctor'), dashboardController.getOverview);

module.exports = router;
