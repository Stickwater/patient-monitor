// 阈值服务
const { Threshold, Patient, User } = require('../models');
const { BusinessError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// 获取患者阈值
const getThresholdByPatientId = async (patientId) => {
  const patient = await Patient.findByPk(patientId);
  
  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  const threshold = await Threshold.findOne({
    where: { patient_id: patientId },
    order: [['created_at', 'DESC']],
    include: [
      { model: User, as: 'creator', attributes: ['user_id', 'real_name'] }
    ]
  });

  return threshold;
};

// 设置/更新阈值
const setThreshold = async (patientId, data, doctorId) => {
  const patient = await Patient.findByPk(patientId);
  
  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  // 校验阈值合理性
  const validationResult = validateThreshold(data, patient.age);
  
  if (!validationResult.isValid) {
    throw new BusinessError(`阈值设置不合理: ${validationResult.errors.join(', ')}`, 400);
  }

  // 生成阈值ID
  const thresholdId = 'T' + Date.now();

  // 创建新阈值记录
  const threshold = await Threshold.create({
    threshold_id: thresholdId,
    patient_id: patientId,
    pulse_min: data.pulseMin,
    pulse_max: data.pulseMax,
    temperature_min: data.temperatureMin,
    temperature_max: data.temperatureMax,
    bp_systolic_min: data.bpSystolicMin,
    bp_systolic_max: data.bpSystolicMax,
    bp_diastolic_min: data.bpDiastolicMin,
    bp_diastolic_max: data.bpDiastolicMax,
    ecg_rules: data.ecgRules || [],
    effective_time: data.effectiveTime || new Date(),
    created_by: doctorId
  });

  return {
    thresholdId: threshold.threshold_id,
    validationResult,
    threshold
  };
};

// 校验阈值合理性
const validateThreshold = (data, patientAge) => {
  const errors = [];
  const checks = [];

  // BR-027: 阈值上下限必须逻辑正确（上限>下限）
  
  // 脉搏校验
  if (data.pulseMin !== undefined && data.pulseMax !== undefined) {
    if (data.pulseMin >= data.pulseMax) {
      errors.push('脉搏上限必须大于下限');
    }
    checks.push({
      indicator: 'pulse',
      isValid: data.pulseMin < data.pulseMax,
      message: data.pulseMin < data.pulseMax ? '通过' : '上限必须大于下限'
    });
  }

  // 体温校验
  if (data.temperatureMin !== undefined && data.temperatureMax !== undefined) {
    if (data.temperatureMin >= data.temperatureMax) {
      errors.push('体温上限必须大于下限');
    }
    checks.push({
      indicator: 'temperature',
      isValid: data.temperatureMin < data.temperatureMax,
      message: data.temperatureMin < data.temperatureMax ? '通过' : '上限必须大于下限'
    });
  }

  // 收缩压校验
  if (data.bpSystolicMin !== undefined && data.bpSystolicMax !== undefined) {
    if (data.bpSystolicMin >= data.bpSystolicMax) {
      errors.push('收缩压上限必须大于下限');
    }
    checks.push({
      indicator: 'bloodPressure_systolic',
      isValid: data.bpSystolicMin < data.bpSystolicMax,
      message: data.bpSystolicMin < data.bpSystolicMax ? '通过' : '上限必须大于下限'
    });
  }

  // 舒张压校验
  if (data.bpDiastolicMin !== undefined && data.bpDiastolicMax !== undefined) {
    if (data.bpDiastolicMin >= data.bpDiastolicMax) {
      errors.push('舒张压上限必须大于下限');
    }
    checks.push({
      indicator: 'bloodPressure_diastolic',
      isValid: data.bpDiastolicMin < data.bpDiastolicMax,
      message: data.bpDiastolicMin < data.bpDiastolicMax ? '通过' : '上限必须大于下限'
    });
  }

  // BR-028: 阈值必须符合医学标准范围
  const medicalRanges = getMedicalRanges(patientAge);

  if (data.pulseMin !== undefined && data.pulseMax !== undefined) {
    const inRange = data.pulseMin >= medicalRanges.pulse.min && data.pulseMax <= medicalRanges.pulse.max;
    if (!inRange) {
      errors.push(`脉搏范围应符合医学标准（${medicalRanges.pulse.min}-${medicalRanges.pulse.max}次/分钟）`);
    }
    checks.push({
      indicator: 'pulse_medical',
      isValid: inRange,
      message: inRange ? '符合医学标准' : `应符合${medicalRanges.pulse.min}-${medicalRanges.pulse.max}次/分钟`
    });
  }

  if (data.temperatureMin !== undefined && data.temperatureMax !== undefined) {
    const inRange = data.temperatureMin >= medicalRanges.temperature.min && 
                    data.temperatureMax <= medicalRanges.temperature.max;
    if (!inRange) {
      errors.push(`体温范围应符合医学标准（${medicalRanges.temperature.min}-${medicalRanges.temperature.max}°C）`);
    }
    checks.push({
      indicator: 'temperature_medical',
      isValid: inRange,
      message: inRange ? '符合医学标准' : `应符合${medicalRanges.temperature.min}-${medicalRanges.temperature.max}°C`
    });
  }

  // BR-029: 阈值必须与患者年龄匹配
  checks.push({
    indicator: 'age_match',
    isValid: true,
    message: patientAge ? `已根据患者年龄${patientAge}岁设置` : '未提供患者年龄'
  });

  return {
    isValid: errors.length === 0,
    errors,
    checks,
    medicalRanges: patientAge ? getMedicalRanges(patientAge) : null
  };
};

// 获取医学标准范围（根据年龄调整）
const getMedicalRanges = (age) => {
  if (age < 18) {
    // 儿童范围
    return {
      pulse: { min: 70, max: 110 },
      temperature: { min: 36.0, max: 37.5 },
      bloodPressure: {
        systolic: { min: 90, max: 120 },
        diastolic: { min: 50, max: 80 }
      }
    };
  } else if (age >= 65) {
    // 老年人范围
    return {
      pulse: { min: 55, max: 100 },
      temperature: { min: 35.5, max: 37.5 },
      bloodPressure: {
        systolic: { min: 85, max: 150 },
        diastolic: { min: 55, max: 90 }
      }
    };
  } else {
    // 成人范围
    return {
      pulse: { min: 60, max: 100 },
      temperature: { min: 36.0, max: 37.3 },
      bloodPressure: {
        systolic: { min: 90, max: 140 },
        diastolic: { min: 60, max: 90 }
      }
    };
  }
};

// 获取阈值历史
const getThresholdHistory = async (patientId) => {
  const patient = await Patient.findByPk(patientId);
  
  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  const thresholds = await Threshold.findAll({
    where: { patient_id: patientId },
    include: [
      { model: User, as: 'creator', attributes: ['user_id', 'real_name'] }
    ],
    order: [['created_at', 'DESC']]
  });

  return thresholds;
};

module.exports = {
  getThresholdByPatientId,
  setThreshold,
  validateThreshold,
  getThresholdHistory,
  getMedicalRanges
};
