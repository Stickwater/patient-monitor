// 报警记录模型
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Alert = sequelize.define('Alert', {
  alert_id: {
    type: DataTypes.STRING(32),
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  alert_level: {
    type: DataTypes.ENUM('一般', '严重', '危急'),
    allowNull: false
  },
  alert_content: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  indicator: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  actual_value: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  threshold_value: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('待处理', '已确认', '已解除', '已升级'),
    defaultValue: '待处理'
  },
  handled_by: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  handled_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'alerts',
  timestamps: false
});

module.exports = Alert;
