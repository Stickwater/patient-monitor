// 路由汇总
const authRoutes = require('./auth');
const patientRoutes = require('./patient');
const vitalSignRoutes = require('./vitals');
const alertRoutes = require('./alert');
const thresholdRoutes = require('./threshold');
const reportRoutes = require('./report');

module.exports = (app) => {
  // 认证路由
  app.use('/api/v1/auth', authRoutes);

  // 患者路由
  app.use('/api/v1/patients', patientRoutes);

  // 生理信号路由
  app.use('/api/v1/vitals', vitalSignRoutes);

  // 报警路由
  app.use('/api/v1/alerts', alertRoutes);

  // 阈值路由
  app.use('/api/v1/thresholds', thresholdRoutes);

  // 报告路由
  app.use('/api/v1/reports', reportRoutes);

  // 仪表盘路由
  const dashboardRoutes = require('./dashboard');
  app.use('/api/v1/dashboard', dashboardRoutes);

  // 诊疗建议路由
  const treatmentAdviceRoutes = require('./treatment-advice');
  app.use('/api/v1', treatmentAdviceRoutes);
};
