// 诊疗建议模型
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TreatmentAdvice = sequelize.define('TreatmentAdvice', {
  advice_id: {
    type: DataTypes.STRING(32),
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  doctor_id: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('treatment', 'diet', 'rehabilitation', 'health'),
    defaultValue: 'treatment',
    comment: '建议类型：治疗/饮食/康复/健康'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  create_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'treatment_advice',
  timestamps: false
});

module.exports = TreatmentAdvice;
