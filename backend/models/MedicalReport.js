// 病情报告模型
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MedicalReport = sequelize.define('MedicalReport', {
  report_id: {
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
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  trend_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  abnormal_events: {
    type: DataTypes.JSON,
    allowNull: true
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  version: {
    type: DataTypes.STRING(10),
    defaultValue: '1.0'
  }
}, {
  tableName: 'medical_reports',
  timestamps: false
});

module.exports = MedicalReport;
