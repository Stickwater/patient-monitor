// 报警服务
const { alertDAO, patientDAO, userDAO, vitalSignDAO } = require('../dao');
const { BusinessError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { emitAlert } = require('../websocket/server');
const cacheService = require('./CacheService');

// 获取报警列表
const getAlerts = async (query = {}) => {
  const { 
    status, 
    level,
    patientId,
    page = 1, 
    size = 20,
    startTime,
    endTime
  } = query;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (level) {
    where.alert_level = level;
  }

  if (patientId) {
    where.patient_id = patientId;
  }

  if (startTime && endTime) {
    where.timestamp = {
      [Op.between]: [new Date(startTime), new Date(endTime)]
    };
  }

  const result = await alertDAO.findAndCountAll(where, {
    include: [
      { 
        model: patientDAO.Model, 
        as: 'patient',
        attributes: ['patient_id', 'name', 'bed_number']
      },
      { 
        model: userDAO.Model, 
        as: 'handler',
        attributes: ['user_id', 'real_name']
      }
    ],
    order: [['timestamp', 'DESC']],
    limit: parseInt(size),
    offset: (parseInt(page) - 1) * parseInt(size)
  });

  // 格式化返回数据
  const list = result.rows.map(alert => ({
    alertId: alert.alert_id,
    patientId: alert.patient_id,
    patientName: alert.patient?.name,
    bedNumber: alert.patient?.bed_number,
    alertLevel: alert.alert_level,
    alertContent: alert.alert_content,
    indicator: alert.indicator,
    actualValue: alert.actual_value,
    thresholdValue: alert.threshold_value,
    status: alert.status,
    handledBy: alert.handler?.real_name,
    handledTime: alert.handled_time,
    timestamp: alert.timestamp
  }));

  return {
    total: result.count,
    list,
    page: parseInt(page),
    size: parseInt(size),
    totalPages: Math.ceil(result.count / size)
  };
};

// 获取单个报警详情
const getAlertById = async (alertId) => {
  const alert = await alertDAO.findByPk(alertId, {
    include: [
      { 
        model: patientDAO.Model, 
        as: 'patient',
        attributes: ['patient_id', 'name', 'bed_number', 'age', 'gender']
      },
      { 
        model: userDAO.Model, 
        as: 'handler',
        attributes: ['user_id', 'real_name']
      }
    ]
  });

  if (!alert) {
    throw new BusinessError('报警记录不存在', 404);
  }

  // 获取最新的生理信号
  const latestVital = await vitalSignDAO.findOne({
    patient_id: alert.patient_id
  }, {
    order: [['collect_time', 'DESC']]
  });

  return {
    alertId: alert.alert_id,
    patientId: alert.patient_id,
    patientName: alert.patient?.name,
    bedNumber: alert.patient?.bed_number,
    age: alert.patient?.age,
    gender: alert.patient?.gender,
    alertLevel: alert.alert_level,
    alertContent: alert.alert_content,
    indicator: alert.indicator,
    actualValue: alert.actual_value,
    thresholdValue: alert.threshold_value,
    status: alert.status,
    handledBy: alert.handler?.real_name,
    handledTime: alert.handled_time,
    timestamp: alert.timestamp,
    latestVital
  };
};

// 创建报警（从比对结果创建，每个异常指标生成一条报警）
const createAlertFromCompare = async (patientId, compareResult, patient) => {
  if (!compareResult.abnormalItems || compareResult.abnormalItems.length === 0) return [];

  const alerts = [];
  const levelOrder = { '危急': 3, '严重': 2, '一般': 1 };

  // 为每个异常指标创建独立报警
  for (const item of compareResult.abnormalItems) {
    const alertId = 'A' + Date.now() + Math.random().toString(36).substr(2, 4);

    const alert = await alertDAO.create({
      alert_id: alertId,
      patient_id: patientId,
      alert_level: item.abnormalLevel || '一般',
      alert_content: formatAlertContent(item),
      indicator: item.indicator,
      actual_value: item.actualValue?.toString() || '',
      threshold_value: `${item.thresholdMin || ''}-${item.thresholdMax || ''}`,
      status: '待处理',
      timestamp: new Date()
    });

    alerts.push(alert);
  }

  // 找到最严重的报警用于WebSocket通知
  const mostSevere = alerts.reduce((max, a) => {
    return levelOrder[a.alert_level] > levelOrder[max?.alert_level || '一般'] ? a : max;
  }, alerts[0]);

  if (mostSevere) {
    // 汇总所有异常信息
    const allAbnormalContent = compareResult.abnormalItems
      .map(item => formatAlertContent(item))
      .join('；');

    emitAlert({
      type: 'ALERT',
      alert: {
        alertId: mostSevere.alert_id,
        patientId: mostSevere.patient_id,
        patientName: patient.name,
        bedNumber: patient.bed_number,
        alertLevel: mostSevere.alert_level,
        alertContent: allAbnormalContent,
        indicator: mostSevere.indicator,
        actualValue: mostSevere.actual_value,
        thresholdValue: mostSevere.threshold_value,
        status: mostSevere.status,
        timestamp: mostSevere.timestamp,
        allAlertsCount: alerts.length
      }
    });
  }

  // 清除报警相关缓存
  await cacheService.invalidateAlertCache();

  return alerts;
};

// 格式化报警内容
const formatAlertContent = (item) => {
  const indicatorNames = {
    'pulse': '脉搏',
    'temperature': '体温',
    'bloodPressure_systolic': '收缩压',
    'bloodPressure_diastolic': '舒张压',
    'ecg': '心电图'
  };

  const name = indicatorNames[item.indicator] || item.indicator;
  const unit = item.indicator === 'temperature' ? '°C' : 
               item.indicator.includes('bloodPressure') ? 'mmHg' : 
               item.indicator === 'pulse' ? '次/分钟' : '';

  return `${name}异常：${item.actualValue}${unit}（阈值范围：${item.thresholdMin || 'N/A'}-${item.thresholdMax || 'N/A'}${unit}）`;
};

// 确认报警
const confirmAlert = async (alertId, nurseId, action) => {
  const alert = await alertDAO.findByPk(alertId);

  if (!alert) {
    throw new BusinessError('报警记录不存在', 404);
  }

  if (alert.status !== '待处理') {
    throw new BusinessError('该报警已被处理', 400);
  }

  await alert.update({
    status: '已确认',
    handled_by: nurseId,
    handled_time: new Date()
  });

  await cacheService.invalidateAlertCache();

  return {
    alertId: alert.alert_id,
    status: '已确认',
    handledBy: nurseId,
    handledTime: new Date()
  };
};

// 解除报警
const resolveAlert = async (alertId, nurseId, resolution, vitalRestored) => {
  const alert = await alertDAO.findByPk(alertId);

  if (!alert) {
    throw new BusinessError('报警记录不存在', 404);
  }

  if (alert.status === '已解除') {
    throw new BusinessError('该报警已被解除', 400);
  }

  await alert.update({
    status: '已解除',
    handled_by: nurseId,
    handled_time: new Date(),
    alert_content: alert.alert_content + ` | 处理结果：${resolution}`
  });

  await cacheService.invalidateAlertCache();

  return {
    alertId: alert.alert_id,
    status: '已解除',
    handledBy: nurseId,
    handledTime: new Date()
  };
};

// 升级报警（自动或手动）
const escalateAlert = async (alertId) => {
  const alert = await alertDAO.findByPk(alertId);

  if (!alert) {
    throw new BusinessError('报警记录不存在', 404);
  }

  // 获取患者主治医生
  const patient = await patientDAO.findByPk(alert.patient_id);

  if (!patient || !patient.attending_doctor_id) {
    throw new BusinessError('无法获取主治医生信息', 400);
  }

  // 更新报警状态
  await alert.update({
    status: '已升级',
    alert_content: `[升级] ${alert.alert_content}`
  });

  // 通过WebSocket通知医生
  emitAlert({
    type: 'ALERT_ESCALATED',
    alert: {
      alertId: alert.alert_id,
      patientId: alert.patient_id,
      patientName: patient.name,
      bedNumber: patient.bed_number,
      alertLevel: alert.alert_level,
      alertContent: alert.alert_content,
      doctorId: patient.attending_doctor_id,
      status: '已升级',
      timestamp: new Date(),
      message: '报警已超时未处理，已升级通知'
    }
  });

  await cacheService.invalidateAlertCache();

  return {
    alertId: alert.alert_id,
    status: '已升级',
    doctorId: patient.attending_doctor_id
  };
};

// 获取待处理报警统计（强制返回四类状态，缺失的补0）
const getAlertStats = async () => {
  return await cacheService.cacheOrFetch('alert:stats:summary', async () => {
    const stats = await alertDAO.Model.findAll({
      attributes: [
        'status',
        [alertDAO.Model.sequelize.fn('COUNT', alertDAO.Model.sequelize.col('alert_id')), 'count']
      ],
      group: ['status']
    });

    const total = stats.reduce((sum, s) => sum + parseInt(s.get('count')), 0);
    const pendingCount = stats.find(s => s.status === '待处理')?.get('count') || 0;

    const allStatuses = ['待处理', '已确认', '已升级', '已解除'];
    const statusCountMap = {};
    stats.forEach(s => { statusCountMap[s.status] = parseInt(s.get('count')); });

    const byStatus = allStatuses.map(status => ({
      status,
      count: statusCountMap[status] || 0
    }));

    return {
      total,
      pendingCount: parseInt(pendingCount),
      byStatus
    };
  }, 30); // TTL 30 秒
};

// 检查超时报警（定时任务）
const checkOverdueAlerts = async () => {
  const timeoutMinutes = parseInt(process.env.ALERT_TIMEOUT_MINUTES) || 5;
  const timeoutTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  const overdueAlerts = await alertDAO.findAll({
    status: '待处理',
    timestamp: { [Op.lt]: timeoutTime }
  });

  for (const alert of overdueAlerts) {
    await escalateAlert(alert.alert_id);
  }

  return {
    checkedCount: overdueAlerts.length,
    escalatedCount: overdueAlerts.length
  };
};

module.exports = {
  getAlerts,
  getAlertById,
  createAlertFromCompare,
  confirmAlert,
  resolveAlert,
  escalateAlert,
  getAlertStats,
  checkOverdueAlerts
};
