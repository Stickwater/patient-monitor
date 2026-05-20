// 报告路由
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/ReportController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/v1/reports - 查询报告列表
router.get('/', authenticate, authorize('nurse', 'doctor'), reportController.getReports);

// POST /api/v1/reports/generate - 生成报告
router.post('/generate', authenticate, authorize('nurse', 'doctor'), reportController.generateReport);

// GET /api/v1/reports/:reportId - 查看报告详情
router.get('/:reportId', authenticate, authorize('nurse', 'doctor'), reportController.getReportById);

// PUT /api/v1/reports/:reportId - 更新报告
router.put('/:reportId', authenticate, authorize('nurse', 'doctor'), reportController.updateReport);

// GET /api/v1/reports/:reportId/print - 打印报告
router.get('/:reportId/print', authenticate, authorize('nurse', 'doctor'), reportController.getPrintReport);

module.exports = router;
