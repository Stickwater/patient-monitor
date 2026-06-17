// 服务导出汇总
const authService = require('./AuthService');
const patientService = require('./PatientService');
const vitalSignService = require('./VitalSignService');
const alertService = require('./AlertService');
const thresholdService = require('./ThresholdService');
const reportService = require('./ReportService');
const treatmentAdviceService = require('./TreatmentAdviceService');
const dashboardService = require('./DashboardService');

module.exports = {
  authService,
  patientService,
  vitalSignService,
  alertService,
  thresholdService,
  reportService,
  treatmentAdviceService,
  dashboardService
};
