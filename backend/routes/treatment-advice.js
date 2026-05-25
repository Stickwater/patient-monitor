// 诊疗建议路由
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const adviceController = require('../controllers/TreatmentAdviceController');

// 医生：创建诊疗建议
router.post('/advice', authenticate, authorize('doctor'), adviceController.createAdvice);

// 医生/护士：获取患者诊疗建议
router.get('/patient/:patientId/advices', authenticate, authorize('doctor', 'nurse'), adviceController.getAdvicesByPatient);

// 患者：获取我的诊疗建议
router.get('/my/advices', authenticate, authorize('patient'), adviceController.getMyAdvices);

// 医生：删除诊疗建议
router.delete('/advice/:adviceId', authenticate, authorize('doctor'), adviceController.deleteAdvice);

module.exports = router;
