// 患者服务
const { Patient, User, VitalSign, Threshold } = require('../models');
const { Op } = require('sequelize');
const { BusinessError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

// 获取患者列表
const getPatients = async (query = {}) => {
  const { 
    page = 1, 
    size = 20, 
    status, 
    bedNumber, 
    doctorId,
    keyword 
  } = query;

  const where = {};
  
  if (status) {
    where.status = status;
  }
  
  if (bedNumber) {
    where.bed_number = { [Op.like]: `%${bedNumber}%` };
  }
  
  if (doctorId) {
    where.attending_doctor_id = doctorId;
  }
  
  if (keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { patient_id: { [Op.like]: `%${keyword}%` } }
    ];
  }

  const result = await Patient.findAndCountAll({
    where,
    include: [
      { model: User, as: 'attendingDoctor', attributes: ['user_id', 'real_name', 'department'] }
    ],
    order: [['bed_number', 'ASC']],
    limit: parseInt(size),
    offset: (parseInt(page) - 1) * parseInt(size)
  });

  return {
    total: result.count,
    list: result.rows,
    page: parseInt(page),
    size: parseInt(size),
    totalPages: Math.ceil(result.count / size)
  };
};

// 获取患者详情
const getPatientById = async (patientId) => {
  const patient = await Patient.findByPk(patientId, {
    include: [
      { model: User, as: 'attendingDoctor', attributes: ['user_id', 'real_name', 'department', 'phone'] },
      { model: Threshold, as: 'Thresholds', limit: 1, order: [['effective_time', 'DESC']] }
    ]
  });

  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  return patient;
};

// 根据用户ID获取患者信息（患者端使用）
const getPatientByUserId = async (userId) => {
  const patient = await Patient.findOne({
    where: { user_id: userId },
    include: [
      { model: User, as: 'attendingDoctor', attributes: ['user_id', 'real_name', 'department', 'phone'] }
    ]
  });

  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  return patient;
};

// 创建患者
const createPatient = async (data) => {
  const patientId = 'P' + Date.now();
  
  const patient = await Patient.create({
    patient_id: patientId,
    name: data.name,
    gender: data.gender,
    age: data.age,
    bed_number: data.bedNumber,
    admission_date: data.admissionDate || new Date(),
    attending_doctor_id: data.attendingDoctorId,
    status: 'admitted'
  });

  return patient;
};

// 更新患者信息
const updatePatient = async (patientId, data) => {
  const patient = await Patient.findByPk(patientId);
  
  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  await patient.update({
    name: data.name || patient.name,
    gender: data.gender || patient.gender,
    age: data.age || patient.age,
    bed_number: data.bedNumber || patient.bed_number,
    attending_doctor_id: data.attendingDoctorId || patient.attending_doctor_id,
    status: data.status || patient.status
  });

  return patient;
};

// 获取患者最新生理信号
const getLatestVital = async (patientId) => {
  const patient = await Patient.findByPk(patientId);
  
  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  const vital = await VitalSign.findOne({
    where: { patient_id: patientId },
    order: [['collect_time', 'DESC']]
  });

  if (!vital) {
    return null;
  }

  return {
    pulse: vital.pulse,
    temperature: vital.temperature,
    blood_pressure: vital.blood_pressure,
    collect_time: vital.collect_time
  };
};

module.exports = {
  getPatients,
  getPatientById,
  getPatientByUserId,
  createPatient,
  updatePatient,
  getLatestVital
};
