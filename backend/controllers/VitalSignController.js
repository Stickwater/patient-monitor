// 生理信号控制器
const { vitalSignService } = require('../services');
const { emitVitalUpdate } = require('../websocket/server');

// 上传生理信号（传感器调用）
const uploadVitalSign = async (req, res, next) => {
  try {
    const result = await vitalSignService.uploadVitalSign(req.body);

    // 实时推送数据
    if (result.status === 'normal') {
      emitVitalUpdate(req.body.patientId, result.compareResult);
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
  getRealtimeData,
  getHistoryData,
  getTrendData
};
