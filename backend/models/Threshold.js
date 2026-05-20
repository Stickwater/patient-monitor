// 标准阈值模型
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Threshold = sequelize.define('Threshold', {
  threshold_id: {
    type: DataTypes.STRING(32),
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  pulse_min: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  pulse_max: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  temperature_min: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true
  },
  temperature_max: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true
  },
  bp_systolic_min: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  bp_systolic_max: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  bp_diastolic_min: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  bp_diastolic_max: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  ecg_rules: {
    type: DataTypes.JSON,
    allowNull: true
  },
  effective_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.STRING(32),
    allowNull: true
  }
}, {
  tableName: 'thresholds',
  timestamps: false
});

module.exports = Threshold;
