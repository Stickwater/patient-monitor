// 生理信号模型
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VitalSign = sequelize.define('VitalSign', {
  signal_id: {
    type: DataTypes.STRING(32),
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  pulse: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  temperature: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true
  },
  blood_pressure: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  ecg: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  collect_time: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'vital_signs',
  timestamps: false
});

module.exports = VitalSign;
