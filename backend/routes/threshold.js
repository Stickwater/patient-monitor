// 阈值路由
const express = require('express');
const router = express.Router();
const thresholdController = require('../controllers/ThresholdController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/v1/thresholds/:patientId - 获取患者阈值
router.get('/:patientId', authenticate, authorize('nurse', 'doctor', 'patient'), thresholdController.getThresholdByPatientId);

// POST /api/v1/thresholds/:patientId - 设置阈值（医生）
router.post('/:patientId', authenticate, authorize('doctor'), thresholdController.setThreshold);

// GET /api/v1/thresholds/:patientId/history - 获取阈值历史
router.get('/:patientId/history', authenticate, authorize('doctor'), thresholdController.getThresholdHistory);

module.exports = router;
