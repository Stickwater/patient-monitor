// 患者模型
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Patient = sequelize.define('Patient', {
  patient_id: {
    type: DataTypes.STRING(32),
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('M', 'F'),
    allowNull: false
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  bed_number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  admission_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  attending_doctor_id: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('admitted', 'discharged'),
    defaultValue: 'admitted'
  },
  medical_history: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '病史'
  },
  allergy: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '过敏史'
  }
}, {
  tableName: 'patients',
  timestamps: false
});

module.exports = Patient;
