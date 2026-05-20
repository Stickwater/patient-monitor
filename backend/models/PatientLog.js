// 病人日志模型
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PatientLog = sequelize.define('PatientLog', {
  log_id: {
    type: DataTypes.STRING(32),
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  format: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  log_time: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'patient_logs',
  timestamps: false
});

module.exports = PatientLog;
