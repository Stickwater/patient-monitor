// 病情报告服务
const { MedicalReport, Patient, VitalSign, Alert, PatientLog } = require('../models');
const { BusinessError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// 生成病情报告
const generateReport = async (patientId, startTime, endTime, title) => {
  const patient = await Patient.findByPk(patientId);
  
  if (!patient) {
    throw new BusinessError('患者不存在', 404);
  }

  // BR-013: 获取体征趋势图数据
  const vitals = await VitalSign.findAll({
    where: {
      patient_id: patientId,
      collect_time: {
        [Op.between]: [new Date(startTime), new Date(endTime)]
      }
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

  // BR-014: 获取异常事件
  const abnormalAlerts = await Alert.findAll({
    where: {
      patient_id: patientId,
      timestamp: {
        [Op.between]: [new Date(startTime), new Date(endTime)]
      }
    },
    order: [['timestamp', 'ASC']]
  });

  const abnormalEvents = abnormalAlerts.map(alert => ({
    time: alert.timestamp,
    indicator: alert.indicator,
    level: alert.alert_level,
    actualValue: alert.actual_value,
    thresholdValue: alert.threshold_value,
    status: alert.status
  }));

  // 生成报告内容
  const content = generateReportContent(patient, vitals, abnormalAlerts, startTime, endTime);

  // 生成报告
  const reportId = 'R' + Date.now();
  
  const report = await MedicalReport.create({
    report_id: reportId,
    patient_id: patientId,
    title: title || `患者${patient.name}病情监测报告`,
    content,
    trend_data: trendData,
    abnormal_events: abnormalEvents,
    start_time: startTime,
    end_time: endTime,
    version: '1.0'
  });

  // BR-015: 记录病人日志
  await PatientLog.create({
    log_id: 'L' + Date.now(),
    patient_id: patientId,
    title: `生成病情报告：${report.title}`,
    format: 'JSON',
    content: JSON.stringify(report),
    log_time: new Date()
  });

  return report;
};

// 生成报告内容文本
const generateReportContent = (patient, vitals, alerts, startTime, endTime) => {
  const lines = [];
  lines.push(`患者姓名：${patient.name}`);
  lines.push(`床位号：${patient.bed_number}`);
  lines.push(`报告时间范围：${new Date(startTime).toLocaleString()} 至 ${new Date(endTime).toLocaleString()}`);
  lines.push('');

  // 统计信息
  const pulseValues = vitals.filter(v => v.pulse).map(v => v.pulse);
  const tempValues = vitals.filter(v => v.temperature).map(v => parseFloat(v.temperature));

  lines.push('【生命体征统计】');
  if (pulseValues.length > 0) {
    lines.push(`  脉搏：平均${(pulseValues.reduce((a, b) => a + b, 0) / pulseValues.length).toFixed(1)}次/分钟，范围${Math.min(...pulseValues)}-${Math.max(...pulseValues)}次/分钟`);
  }
  if (tempValues.length > 0) {
    lines.push(`  体温：平均${(tempValues.reduce((a, b) => a + b, 0) / tempValues.length).toFixed(1)}°C，范围${Math.min(...tempValues).toFixed(1)}-${Math.max(...tempValues).toFixed(1)}°C`);
  }
  lines.push(`  共采集${vitals.length}条生理信号记录`);
  lines.push('');

  // 异常事件
  lines.push(`【异常事件】共${alerts.length}次`);
  alerts.forEach((alert, index) => {
    lines.push(`  ${index + 1}. ${alert.timestamp} - ${alert.alert_level} - ${alert.alert_content}`);
  });

  return lines.join('\n');
};

// 查询报告列表
const getReports = async (query = {}) => {
  const { 
    patientId,
    startTime,
    endTime,
    page = 1, 
    size = 20 
  } = query;

  const where = {};

  if (patientId) {
    where.patient_id = patientId;
  }

  if (startTime && endTime) {
    where.create_time = {
      [Op.between]: [new Date(startTime), new Date(endTime)]
    };
  }

  const result = await MedicalReport.findAndCountAll({
    where,
    include: [
      { 
        model: Patient, 
        as: 'patient',
        attributes: ['patient_id', 'name', 'bed_number']
      }
    ],
    order: [['create_time', 'DESC']],
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

// 查看报告详情
const getReportById = async (reportId) => {
  const report = await MedicalReport.findByPk(reportId, {
    include: [
      { 
        model: Patient, 
        as: 'patient',
        attributes: ['patient_id', 'name', 'bed_number', 'age', 'gender', 'admission_date']
      }
    ]
  });

  if (!report) {
    throw new BusinessError('报告不存在', 404);
  }

  return {
    reportId: report.report_id,
    patientId: report.patient_id,
    patientName: report.patient?.name,
    bedNumber: report.patient?.bed_number,
    age: report.patient?.age,
    gender: report.patient?.gender,
    admissionDate: report.patient?.admission_date,
    title: report.title,
    content: report.content,
    trendData: report.trend_data,
    abnormalEvents: report.abnormal_events,
    startTime: report.start_time,
    endTime: report.end_time,
    version: report.version,
    createTime: report.create_time
  };
};

// 更新病情报告（生成新版本）
const updateReport = async (reportId, patientId, startTime, endTime) => {
  // BR-016: 更新操作必须保留历史版本
  const oldReport = await MedicalReport.findByPk(reportId);
  
  if (!oldReport) {
    throw new BusinessError('报告不存在', 404);
  }

  // 生成新版本
  // BR-017: 版本号自动递增
  const oldVersion = parseFloat(oldReport.version);
  const newVersion = (oldVersion + 0.1).toFixed(1);

  // 生成新报告
  const newReport = await generateReport(patientId, startTime, endTime, `${oldReport.title}（更新版）`);
  
  await newReport.update({
    report_id: 'R' + Date.now(),
    version: newVersion
  });

  // 标记旧版本为失效（可选）
  await oldReport.update({
    content: oldReport.content + '\n\n[已生成更新版本: ' + newReport.report_id + ']'
  });

  return newReport;
};

// 打印报告（返回PDF格式的报告数据）
const getPrintReport = async (reportId) => {
  const reportDetail = await getReportById(reportId);
  
  // 实际项目中应生成PDF，这里返回结构化数据供前端打印
  return reportDetail;
};

// 自动生成每日报告（定时任务）
const autoGenerateDailyReports = async () => {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const startTime = new Date(yesterday.setHours(0, 0, 0, 0));
  const endTime = new Date(yesterday.setHours(23, 59, 59, 999));

  // 获取所有在院患者
  const patients = await Patient.findAll({
    where: { status: 'admitted' }
  });

  const reports = [];
  for (const patient of patients) {
    try {
      const report = await generateReport(
        patient.patient_id,
        startTime,
        endTime,
        `患者${patient.name}病情日报（${startTime.toLocaleDateString()}）`
      );
      reports.push(report);
    } catch (error) {
      console.error(`为患者${patient.patient_id}生成报告失败:`, error);
    }
  }

  return {
    generatedCount: reports.length,
    reports
  };
};

module.exports = {
  generateReport,
  getReports,
  getReportById,
  updateReport,
  getPrintReport,
  autoGenerateDailyReports
};
