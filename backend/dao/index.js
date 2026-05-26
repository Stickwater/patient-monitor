// DAO 层统一导出
const userDAO = require('./UserDAO');
const patientDAO = require('./PatientDAO');
const vitalSignDAO = require('./VitalSignDAO');
const alertDAO = require('./AlertDAO');
const thresholdDAO = require('./ThresholdDAO');
const compareResultDAO = require('./CompareResultDAO');
const medicalReportDAO = require('./MedicalReportDAO');
const patientLogDAO = require('./PatientLogDAO');
const treatmentAdviceDAO = require('./TreatmentAdviceDAO');

module.exports = {
  userDAO,
  patientDAO,
  vitalSignDAO,
  alertDAO,
  thresholdDAO,
  compareResultDAO,
  medicalReportDAO,
  patientLogDAO,
  treatmentAdviceDAO
};
