// 报告控制器
const { reportService } = require('../services');

// 生成报告
const generateReport = async (req, res, next) => {
  try {
    const { patientId, startTime, endTime, title } = req.body;
    const report = await reportService.generateReport(patientId, startTime, endTime, title);
    res.json({
      code: 200,
      message: '报告生成成功',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// 查询报告列表
const getReports = async (req, res, next) => {
  try {
    const result = await reportService.getReports(req.query);
    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 查看报告详情
const getReportById = async (req, res, next) => {
  try {
    const report = await reportService.getReportById(req.params.reportId);
    res.json({
      code: 200,
      message: '获取成功',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// 更新报告
const updateReport = async (req, res, next) => {
  try {
    const { patientId, startTime, endTime } = req.body;
    const report = await reportService.updateReport(req.params.reportId, patientId, startTime, endTime);
    res.json({
      code: 200,
      message: '报告更新成功',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// 打印报告
const getPrintReport = async (req, res, next) => {
  try {
    const report = await reportService.getPrintReport(req.params.reportId);
    res.json({
      code: 200,
      message: '获取成功',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// 获取我的报告列表（患者端）
const getMyReports = async (req, res, next) => {
  try {
    const result = await reportService.getMyReports(req.userId, req.query);
    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取我的报告详情（患者端）
const getMyReportDetail = async (req, res, next) => {
  try {
    const report = await reportService.getMyReportDetail(req.userId, req.params.reportId);
    res.json({
      code: 200,
      message: '获取成功',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateReport,
  getReports,
  getReportById,
  updateReport,
  getPrintReport,
  getMyReports,
  getMyReportDetail
};
