// 模型导出汇总
const { sequelize, testConnection } = require('../config/database');
const User = require('./User');
const Patient = require('./Patient');
const VitalSign = require('./VitalSign');
const Threshold = require('./Threshold');
const Alert = require('./Alert');
const PatientLog = require('./PatientLog');
const MedicalReport = require('./MedicalReport');
const CompareResult = require('./CompareResult');

// 定义模型关联
const setupAssociations = () => {
  // 用户-患者关联（主治医生）
  User.hasMany(Patient, { foreignKey: 'attending_doctor_id', sourceKey: 'user_id' });
  Patient.belongsTo(User, { foreignKey: 'attending_doctor_id', as: 'attendingDoctor' });

  // 患者-生理信号
  Patient.hasMany(VitalSign, { foreignKey: 'patient_id', sourceKey: 'patient_id' });
  VitalSign.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

  // 患者-阈值
  Patient.hasMany(Threshold, { foreignKey: 'patient_id', sourceKey: 'patient_id' });
  Threshold.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

  // 阈值-医生
  User.hasMany(Threshold, { foreignKey: 'created_by', sourceKey: 'user_id' });
  Threshold.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

  // 患者-报警
  Patient.hasMany(Alert, { foreignKey: 'patient_id', sourceKey: 'patient_id' });
  Alert.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

  // 报警-处理人
  User.hasMany(Alert, { foreignKey: 'handled_by', sourceKey: 'user_id' });
  Alert.belongsTo(User, { foreignKey: 'handled_by', as: 'handler' });

  // 患者-日志
  Patient.hasMany(PatientLog, { foreignKey: 'patient_id', sourceKey: 'patient_id' });
  PatientLog.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

  // 患者-报告
  Patient.hasMany(MedicalReport, { foreignKey: 'patient_id', sourceKey: 'patient_id' });
  MedicalReport.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

  // 患者-比对结果
  Patient.hasMany(CompareResult, { foreignKey: 'patient_id', sourceKey: 'patient_id' });
  CompareResult.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

  // 生理信号-比对结果
  VitalSign.hasMany(CompareResult, { foreignKey: 'signal_id', sourceKey: 'signal_id' });
  CompareResult.belongsTo(VitalSign, { foreignKey: 'signal_id', as: 'vitalSign' });
};

module.exports = {
  sequelize,
  testConnection,
  User,
  Patient,
  VitalSign,
  Threshold,
  Alert,
  PatientLog,
  MedicalReport,
  CompareResult,
  setupAssociations
};
