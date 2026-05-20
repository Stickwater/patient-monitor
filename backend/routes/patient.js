// 患者路由
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/PatientController');
const { authenticate, authorize, authorizePatient } = require('../middleware/auth');

// GET /api/v1/patients - 获取患者列表
router.get('/', authenticate, authorize('nurse', 'doctor'), patientController.getPatients);

// GET /api/v1/patients/:patientId - 获取患者详情
router.get('/:patientId', authenticate, authorizePatient, patientController.getPatientById);

// POST /api/v1/patients - 创建患者
router.post('/', authenticate, authorize('doctor'), patientController.createPatient);

// PUT /api/v1/patients/:patientId - 更新患者信息
router.put('/:patientId', authenticate, authorize('doctor'), patientController.updatePatient);

// GET /api/v1/patients/:patientId/latest-vital - 获取患者最新生理信号
router.get('/:patientId/latest-vital', authenticate, authorizePatient, patientController.getLatestVital);

module.exports = router;
