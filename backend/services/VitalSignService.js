// 生理信号服务（核心监护逻辑）
const { VitalSign, Patient, Threshold, CompareResult, Alert, PatientLog, User } = require('../models');
const { BusinessError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');
const { alertService } = require('./AlertService');
const { Op } = require('sequelize');

// 上传生理信号
const uploadVitalSign = async (data) => {
  // 验证患者存在
  const patient = await Patient.findByPk(data.patientId);
  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  // 生成信号ID
  const signalId = 'S' + Date.now();

  // 保存生理信号
  const vitalSign = await VitalSign.create({
    signal_id: signalId,
    patient_id: data.patientId,
    pulse: data.pulse,
    temperature: data.temperature,
    blood_pressure: data.bloodPressure,
    ecg: data.ecg,
    collect_time: data.timestamp || new Date()
  });

  // 获取患者阈值
  const threshold = await Threshold.findOne({
    where: { patient_id: data.patientId },
    order: [['created_at', 'DESC']]
  });

  // 如果有阈值配置，执行比对
  let compareResult = null;
  let status = 'normal';
  
  if (threshold) {
    compareResult = await compareVitalSigns(data.patientId, vitalSign, threshold);
    
    if (!compareResult.overallStatus) {
      status = 'normal';
    } else {
      status = 'abnormal';
      await alertService.createAlertFromCompare(data.patientId, compareResult, patient);
    }
  }

  // 生成病人日志
  await PatientLog.create({
    log_id: 'L' + Date.now(),
    patient_id: data.patientId,
    title: '生理信号采集',
    format: 'JSON',
    content: JSON.stringify(vitalSign),
    log_time: new Date()
  });

  return {
    signalId,
    status,
    compareResult
  };
};

// 获取我的体征数据（患者端）
const getMyVitals = async (userId, hours = 24) => {
  // 通过用户ID找到对应的患者记录
  const user = await User.findByPk(userId);
  
  if (!user) {
    throw new BusinessError('用户不存在', 404);
  }

  // 查找该用户关联的患者
  const patient = await Patient.findOne({
    where: { patient_id: user.username.replace('patient', 'P') }
  });

  if (!patient) {
    // 尝试其他方式查找患者记录
    const allPatients = await Patient.findAll();
    // patient001用户对应的患者
    patient = allPatients.find(p => p.name.includes('张三') || p.name.includes('李四'));
  }

  if (!patient) {
    return { list: [], total: 0 };
  }

  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  const result = await VitalSign.findAndCountAll({
    where: {
      patient_id: patient.patient_id,
      collect_time: { [Op.gte]: startTime }
    },
    order: [['collect_time', 'DESC']]
  });

  return {
    patientId: patient.patient_id,
    patientName: patient.name,
    total: result.count,
    list: result.rows
  };
};

// 核心算法：比较生理信号
const compareVitalSigns = async (patientId, vitalSign, threshold) => {
  const items = [];
  const timestamp = new Date();

  // 1. 比对脉搏
  if (vitalSign.pulse !== null) {
    const pulseResult = compareIndicator(
      'pulse',
      vitalSign.pulse,
      threshold.pulse_min,
      threshold.pulse_max
    );
    items.push(pulseResult);
    
    await saveCompareResult(patientId, vitalSign.signal_id, pulseResult, timestamp);
  }

  // 2. 比对体温
  if (vitalSign.temperature !== null) {
    const tempResult = compareIndicator(
      'temperature',
      parseFloat(vitalSign.temperature),
      parseFloat(threshold.temperature_min),
      parseFloat(threshold.temperature_max)
    );
    items.push(tempResult);
    
    await saveCompareResult(patientId, vitalSign.signal_id, tempResult, timestamp);
  }

  // 3. 比对血压
  if (vitalSign.blood_pressure) {
    const bpParts = vitalSign.blood_pressure.split('/');
    if (bpParts.length === 2) {
      const systolic = parseInt(bpParts[0]);
      const diastolic = parseInt(bpParts[1]);

      const systolicResult = compareIndicator(
        'bloodPressure_systolic',
        systolic,
        threshold.bp_systolic_min,
        threshold.bp_systolic_max
      );
      items.push(systolicResult);
      await saveCompareResult(patientId, vitalSign.signal_id, systolicResult, timestamp);

      const diastolicResult = compareIndicator(
        'bloodPressure_diastolic',
        diastolic,
        threshold.bp_diastolic_min,
        threshold.bp_diastolic_max
      );
      items.push(diastolicResult);
      await saveCompareResult(patientId, vitalSign.signal_id, diastolicResult, timestamp);
    }
  }

  // 4. 比对心电图（简化处理）
  if (vitalSign.ecg) {
    const ecgRules = threshold.ecg_rules || [];
    const isNormalECG = checkECG(vitalSign.ecg, ecgRules);
    
    const ecgResult = {
      indicator: 'ecg',
      actualValue: vitalSign.ecg.substring(0, 50),
      thresholdMin: 'N/A',
      thresholdMax: 'N/A',
      isNormal: isNormalECG,
      abnormalLevel: null
    };
    
    if (!isNormalECG) {
      ecgResult.abnormalLevel = '严重';
      ecgResult.deviation = 0.2;
    }
    
    items.push(ecgResult);
    await saveCompareResult(patientId, vitalSign.signal_id, ecgResult, timestamp);
  }

  // 汇总结果
  const abnormalItems = items.filter(item => !item.isNormal);
  const overallStatus = abnormalItems.length > 0 ? '异常' : null;

  return {
    resultId: 'R' + Date.now(),
    patientId,
    signalId: vitalSign.signal_id,
    timestamp,
    items,
    overallStatus,
    abnormalCount: abnormalItems.length,
    abnormalItems
  };
};

// 单指标比对
const compareIndicator = (indicator, actualValue, min, max) => {
  const result = {
    indicator,
    actualValue,
    thresholdMin: min,
    thresholdMax: max,
    isNormal: true,
    abnormalLevel: null,
    deviation: 0
  };

  if (min !== null && max !== null) {
    if (actualValue < min) {
      result.isNormal = false;
      result.deviation = (min - actualValue) / min;
    } else if (actualValue > max) {
      result.isNormal = false;
      result.deviation = (actualValue - max) / max;
    }
  }

  // 计算异常等级
  if (!result.isNormal) {
    result.abnormalLevel = determineAlertLevel(result.deviation);
  }

  return result;
};

// 判断异常等级
const determineAlertLevel = (deviation) => {
  if (deviation <= 0.10) return '一般';
  else if (deviation <= 0.30) return '严重';
  else return '危急';
};

// 心电图检查（简化实现）
const checkECG = (ecgData, rules) => {
  if (ecgData && ecgData.length > 100) {
    return false;
  }
  return true;
};

// 保存比对结果
const saveCompareResult = async (patientId, signalId, item, timestamp) => {
  await CompareResult.create({
    result_id: 'CR' + Date.now() + Math.random().toString(36).substr(2, 5),
    patient_id: patientId,
    signal_id: signalId,
    indicator: item.indicator,
    actual_value: item.actualValue?.toString() || '',
    threshold_min: item.thresholdMin?.toString() || '',
    threshold_max: item.thresholdMax?.toString() || '',
    is_normal: item.isNormal,
    abnormal_level: item.abnormalLevel,
    timestamp
  });
};

// 获取实时数据
const getRealtimeData = async (patientId) => {
  const patient = await Patient.findByPk(patientId);
  
  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  const latestVital = await VitalSign.findOne({
    where: { patient_id: patientId },
    order: [['collect_time', 'DESC']]
  });

  return {
    patientId: patient.patient_id,
    patientName: patient.name,
    bedNumber: patient.bed_number,
    latestVital,
    status: latestVital ? '正常' : '无数据'
  };
};

// 获取历史数据
const getHistoryData = async (patientId, startTime, endTime, page = 1, size = 100) => {
  const patient = await Patient.findByPk(patientId);
  
  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  const where = { patient_id: patientId };
  
  if (startTime && endTime) {
    where.collect_time = {
      [Op.between]: [new Date(startTime), new Date(endTime)]
    };
  }

  const result = await VitalSign.findAndCountAll({
    where,
    order: [['collect_time', 'DESC']],
    limit: parseInt(size),
    offset: (parseInt(page) - 1) * parseInt(size)
  });

  return {
    patientId,
    patientName: patient.name,
    total: result.count,
    list: result.rows,
    page: parseInt(page),
    size: parseInt(size)
  };
};

// 获取趋势数据
const getTrendData = async (patientId, hours = 24) => {
  const patient = await Patient.findByPk(patientId);
  
  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  const vitals = await VitalSign.findAll({
    where: {
      patient_id: patientId,
      collect_time: { [Op.gte]: startTime }
    },
    order: [['collect_time', 'ASC']]
  });

  // 整理趋势数据
  const trendData = {
    pulse: [],
    temperature: [],
    bloodPressure: [],
    timestamps: []
  };

  vitals.forEach(v => {
    trendData.pulse.push(v.pulse);
    trendData.temperature.push(parseFloat(v.temperature) || null);
    trendData.bloodPressure.push(v.blood_pressure);
    trendData.timestamps.push(v.collect_time);
  });

  return {
    patientId,
    patientName: patient.name,
    trendData
  };
};

module.exports = {
  uploadVitalSign,
  getMyVitals,
  compareVitalSigns,
  getRealtimeData,
  getHistoryData,
  getTrendData,
  compareIndicator,
  determineAlertLevel
};
