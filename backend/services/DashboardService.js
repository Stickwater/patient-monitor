// 仪表盘聚合服务 — 单次请求返回监护面板全部数据
const { patientDAO, vitalSignDAO, thresholdDAO, alertDAO } = require('../dao');
const { Op } = require('sequelize');
const cacheService = require('./CacheService');

const getOverview = async () => {
  return await cacheService.cacheOrFetch('dashboard:overview', async () => {
    // 1. 获取所有在院患者
    const patients = await patientDAO.findAll({ status: 'admitted' });

    // 2. 获取所有患者的阈值配置
    const allThresholds = await thresholdDAO.Model.findAll({
      attributes: ['patient_id', 'pulse_min', 'pulse_max', 'temperature_min', 'temperature_max',
        'bp_systolic_min', 'bp_systolic_max', 'bp_diastolic_min', 'bp_diastolic_max', 'ecg_rules']
    });
    const thresholdMap = {};
    allThresholds.forEach(t => { thresholdMap[t.patient_id] = t; });

    // 3. 获取昨天零点之后的体征数据（用于趋势）
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const allVitals = await vitalSignDAO.findAll(
      { collect_time: { [Op.gte]: startTime } },
      { order: [['collect_time', 'ASC']] }
    );

    // 按患者分组体征数据
    const vitalsByPatient = {};
    allVitals.forEach(v => {
      if (!vitalsByPatient[v.patient_id]) vitalsByPatient[v.patient_id] = [];
      vitalsByPatient[v.patient_id].push(v);
    });

    // 4. 获取活跃报警（待处理/已确认/已升级）
    const activeAlerts = await alertDAO.findAll({
      status: { [Op.in]: ['待处理', '已确认', '已升级'] }
    });
    const alertPatientIds = new Set(activeAlerts.map(a => a.patient_id));

    // 5. 组装每个患者卡片的完整数据
    const cards = patients.map(patient => {
      const vitals = vitalsByPatient[patient.patient_id] || [];
      const latestVital = vitals.length > 0 ? vitals[vitals.length - 1] : null;
      const threshold = thresholdMap[patient.patient_id] || null;
      const hasActiveAlert = alertPatientIds.has(patient.patient_id);

      // 趋势数据
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

      // 阈值比对
      let pulseAbnormal = false, tempAbnormal = false, bpAbnormal = false, ecgAbnormal = false;
      if (latestVital && threshold) {
        if (threshold.pulse_min != null) {
          pulseAbnormal = latestVital.pulse < threshold.pulse_min || latestVital.pulse > threshold.pulse_max;
        }
        if (threshold.temperature_min != null) {
          tempAbnormal = parseFloat(latestVital.temperature) < parseFloat(threshold.temperature_min) ||
                         parseFloat(latestVital.temperature) > parseFloat(threshold.temperature_max);
        }
        if (latestVital.blood_pressure) {
          const bp = latestVital.blood_pressure.split('/');
          if (bp.length === 2) {
            const sysAb = threshold.bp_systolic_min != null && (parseInt(bp[0]) < threshold.bp_systolic_min || parseInt(bp[0]) > threshold.bp_systolic_max);
            const diaAb = threshold.bp_diastolic_min != null && (parseInt(bp[1]) < threshold.bp_diastolic_min || parseInt(bp[1]) > threshold.bp_diastolic_max);
            bpAbnormal = sysAb || diaAb;
          }
        }
        const rules = Array.isArray(threshold.ecg_rules) ? threshold.ecg_rules : [];
        ecgAbnormal = latestVital.ecg && rules.length > 0 && latestVital.ecg !== '正常';
      }

      const hasAlert = pulseAbnormal || tempAbnormal || bpAbnormal || ecgAbnormal;

      return {
        patientId: patient.patient_id,
        name: patient.name,
        bedNumber: patient.bed_number,
        age: patient.age,
        gender: patient.gender,
        admissionDate: patient.admission_date,
        attendingDoctorId: patient.attending_doctor_id,
        latestVital,
        trendData,
        thresholdInfo: threshold ? {
          pulse_min: threshold.pulse_min, pulse_max: threshold.pulse_max,
          temperature_min: threshold.temperature_min, temperature_max: threshold.temperature_max,
          bp_systolic_min: threshold.bp_systolic_min, bp_systolic_max: threshold.bp_systolic_max,
          bp_diastolic_min: threshold.bp_diastolic_min, bp_diastolic_max: threshold.bp_diastolic_max,
          ecg_rules: threshold.ecg_rules
        } : null,
        hasAlert,
        hasActiveAlertRecord: hasActiveAlert,
        abnormalIndicators: { pulseAbnormal, tempAbnormal, bpAbnormal, ecgAbnormal }
      };
    });

    return { patients: cards, total: cards.length };
  }, 10); // TTL 10秒
};

module.exports = { getOverview };
