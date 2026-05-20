// 报警控制器
const { alertService } = require('../services');

// 获取报警列表
const getAlerts = async (req, res, next) => {
  try {
    const result = await alertService.getAlerts(req.query);
    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个报警详情
const getAlertById = async (req, res, next) => {
  try {
    const alert = await alertService.getAlertById(req.params.alertId);
    res.json({
      code: 200,
      message: '获取成功',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

// 确认报警
const confirmAlert = async (req, res, next) => {
  try {
    const { nurseId, action } = req.body;
    const result = await alertService.confirmAlert(req.params.alertId, nurseId, action);
    res.json({
      code: 200,
      message: '确认成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 解除报警
const resolveAlert = async (req, res, next) => {
  try {
    const { nurseId, resolution, vitalRestored } = req.body;
    const result = await alertService.resolveAlert(req.params.alertId, nurseId, resolution, vitalRestored);
    res.json({
      code: 200,
      message: '解除成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 升级报警
const escalateAlert = async (req, res, next) => {
  try {
    const result = await alertService.escalateAlert(req.params.alertId);
    res.json({
      code: 200,
      message: '升级成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取报警统计
const getAlertStats = async (req, res, next) => {
  try {
    const stats = await alertService.getAlertStats();
    res.json({
      code: 200,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  getAlertById,
  confirmAlert,
  resolveAlert,
  escalateAlert,
  getAlertStats
};
