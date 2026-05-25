// 生理信号控制器
const { vitalSignService } = require('../services');
const { emitVitalUpdate } = require('../websocket/server');
const { Patient, User } = require('../models');

// 上传生理信号（传感器调用）
const uploadVitalSign = async (req, res, next) => {
  try {
    let patientId = req.body.patientId;
    
    // 如果是患者上传，自动获取自己的patientId
    if (req.user && req.user.role === 'patient' && !patientId) {
      // 按 user_id 关联查找患者
      if (req.user.user_id) {
        const patient = await Patient.findOne({
          where: { user_id: req.user.user_id }
        });
        if (patient) {
          patientId = patient.patient_id;
        }
      }
      
      // 如果还是没找到，尝试通过姓名匹配
      if (!patientId) {
        const patient = await Patient.findOne({
          where: { name: req.user.real_name }
        });
        if (patient) {
          patientId = patient.patient_id;
        }
      }
    }
    
    if (!patientId) {
      return res.status(400).json({
        code: 400,
        message: '患者ID不能为空'
      });
    }
    
    const data = { ...req.body, patientId };
    const result = await vitalSignService.uploadVitalSign(data);

    // 实时推送数据
    if (result.status === 'normal') {
      emitVitalUpdate(patientId, result.compareResult);
    }

    res.json({
      code: 200,
      message: '采集成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取我的体征数据（患者端）
const getMyVitals = async (req, res, next) => {
  try {
    const { hours } = req.query;
    const result = await vitalSignService.getMyVitals(req.userId, parseInt(hours) || 24);
    res.json({
      code: 200,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取实时数据
const getRealtimeData = async (req, res, next) => {
  try {
    const result = await vitalSignService.getRealtimeData(req.params.patientId);
    res.json({
      code: 200,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取历史数据
const getHistoryData = async (req, res, next) => {
  try {
    const { startTime, endTime, page, size } = req.query;
    const result = await vitalSignService.getHistoryData(
      req.params.patientId,
      startTime,
      endTime,
      page,
      size
    );
    res.json({
      code: 200,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取趋势数据
const getTrendData = async (req, res, next) => {
  try {
    const { hours } = req.query;
    const result = await vitalSignService.getTrendData(
      req.params.patientId,
      parseInt(hours) || 24
    );
    res.json({
      code: 200,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadVitalSign,
  getMyVitals,
  getRealtimeData,
  getHistoryData,
  getTrendData
};
