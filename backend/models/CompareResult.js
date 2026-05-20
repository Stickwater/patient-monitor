// 比对结果模型
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompareResult = sequelize.define('CompareResult', {
  result_id: {
    type: DataTypes.STRING(32),
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  signal_id: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  indicator: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  actual_value: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  threshold_min: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  threshold_max: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  is_normal: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  abnormal_level: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'compare_results',
  timestamps: false
});

module.exports = CompareResult;
