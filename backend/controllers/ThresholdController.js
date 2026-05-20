// 阈值控制器
const { thresholdService } = require('../services');

// 获取患者阈值
const getThresholdByPatientId = async (req, res, next) => {
  try {
    const threshold = await thresholdService.getThresholdByPatientId(req.params.patientId);
    res.json({
      code: 200,
      message: '获取成功',
      data: threshold
    });
  } catch (error) {
    next(error);
  }
};

// 设置阈值
const setThreshold = async (req, res, next) => {
  try {
    const result = await thresholdService.setThreshold(
      req.params.patientId,
      req.body,
      req.userId
    );
    res.json({
      code: 200,
      message: '阈值配置成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取阈值历史
const getThresholdHistory = async (req, res, next) => {
  try {
    const history = await thresholdService.getThresholdHistory(req.params.patientId);
    res.json({
      code: 200,
      message: '获取成功',
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// 获取我的阈值（患者端）
const getMyThreshold = async (req, res, next) => {
  try {
    const threshold = await thresholdService.getMyThreshold(req.userId);
    res.json({
      code: 200,
      message: '获取成功',
      data: threshold
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getThresholdByPatientId,
  setThreshold,
  getThresholdHistory,
  getMyThreshold
};
