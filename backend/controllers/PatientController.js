// 患者控制器
const { patientService } = require('../services');

// 获取患者列表
const getPatients = async (req, res, next) => {
  try {
    const result = await patientService.getPatients(req.query);
    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取患者详情
const getPatientById = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientById(req.params.patientId);
    res.json({
      code: 200,
      message: '获取成功',
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

// 创建患者
const createPatient = async (req, res, next) => {
  try {
    const patient = await patientService.createPatient(req.body);
    res.json({
      code: 200,
      message: '创建成功',
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

// 更新患者信息
const updatePatient = async (req, res, next) => {
  try {
    const patient = await patientService.updatePatient(req.params.patientId, req.body);
    res.json({
      code: 200,
      message: '更新成功',
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

// 获取患者最新生理信号
const getLatestVital = async (req, res, next) => {
  try {
    const result = await patientService.getLatestVital(req.params.patientId);
    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取当前患者自己的信息（患者端）
const getMyInfo = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientByUserId(req.userId);
    res.json({
      code: 200,
      message: '获取成功',
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  getLatestVital,
  getMyInfo
};
