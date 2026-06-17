/**
 * MySQL 数据种子脚本 —— 填充监护面板、报警管理所需完整数据
 * 运行：cd backend && node seed_mysql.js
 *
 * 产出：
 *  - 7 个住院患者（含正常/异常多种状态）
 *  - 每人 ~96 条体征历史（24h，每15分钟一条）→ 趋势图完整呈现
 *  - 每人阈值配置 → 阈值比对生效
 *  - 4 类报警状态（待处理/已确认/已解除/已升级）全覆盖
 *  - 报警等级（一般/严重/危急）全覆盖
 */
require('dotenv').config();
const { sequelize } = require('./config/database');
const { Patient, VitalSign, Threshold, Alert, User } = require('./models');
const { Op } = require('sequelize');

const NOW = new Date();
const HOUR = 3600 * 1000;
const MIN = 60 * 1000;

// ========== 用户定义（外键依赖）==========
const USER_DEFS = [
  { id: 'D2024001', username: 'doctor1', password: 'Doctor123', role: 'doctor', real_name: '陈国华', department: '心内科', phone: '13800001001' },
  { id: 'D2024002', username: 'doctor2', password: 'Doctor123', role: 'doctor', real_name: '王丽萍', department: '内分泌科', phone: '13800001002' },
  { id: 'N2024001', username: 'nurse1',   password: 'Nurse123',   role: 'nurse',   real_name: '刘小燕', department: '心内科', phone: '13800002001' },
  { id: 'N2024002', username: 'nurse2',   password: 'Nurse123',   role: 'nurse',   real_name: '张婷',   department: '内分泌科', phone: '13800002002' },
];

// ========== 患者定义 ==========
const PATIENT_DEFS = [
  { id: 'P2024001', name: '张伟', gender: 'M', age: 65, bed: '301', doctor: 'D2024001',
    history: '冠心病、高血压病史3年', allergy: '青霉素过敏',
    vitals: { pulseBase: 78, pulseVar: 5, tempBase: 36.5, tempVar: 0.2,
              sysBase: 125, sysVar: 5, diaBase: 80, diaVar: 3 } },
  { id: 'P2024002', name: '李芳', gender: 'F', age: 42, bed: '302', doctor: 'D2024001',
    history: '甲状腺功能亢进', allergy: '无',
    vitals: { pulseBase: 95, pulseVar: 8, tempBase: 37.2, tempVar: 0.3,
              sysBase: 135, sysVar: 8, diaBase: 88, diaVar: 5 } },
  { id: 'P2024003', name: '王明', gender: 'M', age: 58, bed: '303', doctor: 'D2024002',
    history: '2型糖尿病、肺炎', allergy: '磺胺类药物',
    vitals: { pulseBase: 82, pulseVar: 6, tempBase: 38.3, tempVar: 0.4,
              sysBase: 118, sysVar: 6, diaBase: 75, diaVar: 4 } },
  { id: 'P2024004', name: '陈静', gender: 'F', age: 72, bed: '304', doctor: 'D2024002',
    history: '高血压3级、脑梗后遗症', allergy: '无',
    vitals: { pulseBase: 70, pulseVar: 4, tempBase: 36.6, tempVar: 0.1,
              sysBase: 158, sysVar: 10, diaBase: 98, diaVar: 6 } },
  { id: 'P2024005', name: '刘强', gender: 'M', age: 35, bed: '305', doctor: 'D2024001',
    history: '急性心肌炎', allergy: '无',
    vitals: { pulseBase: 110, pulseVar: 12, tempBase: 38.0, tempVar: 0.3,
              sysBase: 145, sysVar: 10, diaBase: 95, diaVar: 7 } },
  { id: 'P2024006', name: '赵敏', gender: 'F', age: 50, bed: '306', doctor: 'D2024002',
    history: '胆囊术后恢复期', allergy: '海鲜过敏',
    vitals: { pulseBase: 68, pulseVar: 4, tempBase: 36.4, tempVar: 0.15,
              sysBase: 115, sysVar: 4, diaBase: 74, diaVar: 3 } },
  { id: 'P2024007', name: '孙健', gender: 'M', age: 48, bed: '307', doctor: 'D2024001',
    history: '心律失常（窦性心动过缓）', allergy: '无',
    vitals: { pulseBase: 52, pulseVar: 6, tempBase: 36.7, tempVar: 0.15,
              sysBase: 112, sysVar: 5, diaBase: 72, diaVar: 3 } },
];

// ========== 阈值配置 ==========
const THRESHOLD_DEFS = [
  { id: 'P2024001', pulseMin: 60, pulseMax: 100, tempMin: 36.0, tempMax: 37.3,
    sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90,
    ecgRules: [{ name: '窦性心动过速', condition: 'heartRate > 100', severity: 'warning' },
               { name: '窦性心动过缓', condition: 'heartRate < 60', severity: 'warning' }] },
  { id: 'P2024002', pulseMin: 60, pulseMax: 100, tempMin: 36.0, tempMax: 37.3,
    sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90, ecgRules: [] },
  { id: 'P2024003', pulseMin: 60, pulseMax: 100, tempMin: 36.0, tempMax: 37.5,
    sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90, ecgRules: [] },
  { id: 'P2024004', pulseMin: 55, pulseMax: 100, tempMin: 36.0, tempMax: 37.3,
    sysMin: 90, sysMax: 150, diaMin: 60, diaMax: 95, ecgRules: [] },
  { id: 'P2024005', pulseMin: 60, pulseMax: 100, tempMin: 36.0, tempMax: 37.3,
    sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90,
    ecgRules: [{ name: '室性早搏', condition: 'PVC > 6/min', severity: 'critical' }] },
  { id: 'P2024006', pulseMin: 60, pulseMax: 100, tempMin: 36.0, tempMax: 37.3,
    sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90, ecgRules: [] },
  { id: 'P2024007', pulseMin: 55, pulseMax: 100, tempMin: 36.0, tempMax: 37.3,
    sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90, ecgRules: [] },
];

// ========== 报警数据 ==========
// 4 类状态 × 3 类等级，确保全覆盖
const ALERT_DEFS = [
  // --- 待处理 ---
  { patient: 'P2024002', level: '严重', indicator: 'pulse', content: '脉搏异常：95次/分钟（阈值范围：60-100次/分钟）', actual: '95', threshold: '60-100', offset: -20 * MIN },
  { patient: 'P2024002', level: '一般', indicator: 'bloodPressure_systolic', content: '收缩压偏高：135mmHg（阈值范围：90-140mmHg）', actual: '135', threshold: '90-140', offset: -15 * MIN },
  { patient: 'P2024005', level: '危急', indicator: 'pulse', content: '脉搏异常：110次/分钟（阈值范围：60-100次/分钟）', actual: '110', threshold: '60-100', offset: -8 * MIN },
  { patient: 'P2024005', level: '严重', indicator: 'temperature', content: '体温偏高：38.0°C（阈值范围：36.0-37.3°C）', actual: '38.0', threshold: '36.0-37.3', offset: -5 * MIN },
  { patient: 'P2024005', level: '严重', indicator: 'bloodPressure_systolic', content: '收缩压偏高：145mmHg（阈值范围：90-140mmHg）', actual: '145', threshold: '90-140', offset: -3 * MIN },
  { patient: 'P2024007', level: '一般', indicator: 'pulse', content: '脉搏偏低：52次/分钟（阈值范围：55-100次/分钟）', actual: '52', threshold: '55-100', offset: -10 * MIN },
  { patient: 'P2024004', level: '严重', indicator: 'bloodPressure_systolic', content: '收缩压偏高：158mmHg（阈值范围：90-150mmHg）', actual: '158', threshold: '90-150', offset: -12 * MIN },
  { patient: 'P2024004', level: '严重', indicator: 'bloodPressure_diastolic', content: '舒张压偏高：98mmHg（阈值范围：60-95mmHg）', actual: '98', threshold: '60-95', offset: -12 * MIN },
  { patient: 'P2024003', level: '严重', indicator: 'temperature', content: '体温偏高：38.3°C（阈值范围：36.0-37.5°C）', actual: '38.3', threshold: '36.0-37.5', offset: -30 * MIN },
  { patient: 'P2024003', level: '一般', indicator: 'pulse', content: '脉搏偏高：82次/分钟（阈值范围：60-100次/分钟）', actual: '82', threshold: '60-100', offset: -25 * MIN },

  // --- 已确认 ---
  { patient: 'P2024002', level: '严重', indicator: 'pulse', content: '脉搏偏高：96次/分钟（阈值范围：60-100次/分钟）', actual: '96', threshold: '60-100',
    status: '已确认', handler: 'N2024001', offset: -2 * HOUR },
  { patient: 'P2024004', level: '严重', indicator: 'bloodPressure_systolic', content: '收缩压偏高：155mmHg（阈值范围：90-150mmHg）', actual: '155', threshold: '90-150',
    status: '已确认', handler: 'N2024001', offset: -1.5 * HOUR },
  { patient: 'P2024005', level: '危急', indicator: 'pulse', content: '脉搏严重偏高：108次/分钟（阈值范围：60-100次/分钟）', actual: '108', threshold: '60-100',
    status: '已确认', handler: 'N2024001', offset: -1 * HOUR },
  { patient: 'P2024003', level: '严重', indicator: 'temperature', content: '体温偏高：38.1°C（阈值范围：36.0-37.5°C）', actual: '38.1', threshold: '36.0-37.5',
    status: '已确认', handler: 'N2024002', offset: -3 * HOUR },

  // --- 已解除 ---
  { patient: 'P2024006', level: '一般', indicator: 'temperature', content: '体温偏高：37.4°C（阈值范围：36.0-37.3°C）→ 已恢复正常', actual: '37.4', threshold: '36.0-37.3',
    status: '已解除', handler: 'N2024002', offset: -6 * HOUR },
  { patient: 'P2024001', level: '一般', indicator: 'pulse', content: '脉搏偏高：102次/分钟（阈值范围：60-100次/分钟）→ 已恢复正常', actual: '102', threshold: '60-100',
    status: '已解除', handler: 'N2024001', offset: -8 * HOUR },
  { patient: 'P2024006', level: '严重', indicator: 'bloodPressure_systolic', content: '收缩压偏高：142mmHg（阈值范围：90-140mmHg）→ 术后应激，已恢复', actual: '142', threshold: '90-140',
    status: '已解除', handler: 'N2024002', offset: -10 * HOUR },
  { patient: 'P2024003', level: '严重', indicator: 'temperature', content: '体温偏高：38.5°C（阈值范围：36.0-37.5°C）→ 抗感染治疗后恢复', actual: '38.5', threshold: '36.0-37.5',
    status: '已解除', handler: 'N2024001', offset: -12 * HOUR },

  // --- 已升级 ---
  { patient: 'P2024005', level: '危急', indicator: 'pulse', content: '[升级] 脉搏危急偏高：115次/分钟（阈值范围：60-100次/分钟）', actual: '115', threshold: '60-100',
    status: '已升级', handler: null, offset: -45 * MIN },
  { patient: 'P2024004', level: '危急', indicator: 'bloodPressure_systolic', content: '[升级] 收缩压危急偏高：165mmHg（阈值范围：90-150mmHg）', actual: '165', threshold: '90-150',
    status: '已升级', handler: null, offset: -35 * MIN },
  { patient: 'P2024005', level: '危急', indicator: 'bloodPressure_diastolic', content: '[升级] 舒张压危急偏高：100mmHg（阈值范围：60-90mmHg）', actual: '100', threshold: '60-90',
    status: '已升级', handler: null, offset: -40 * MIN },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('MySQL 连接成功');
    await sequelize.sync(); // 确保 table 存在

    // ========== 0. 用户数据（外键依赖）==========
    console.log('\n--- 创建用户 ---');
    for (const u of USER_DEFS) {
      const existing = await User.findByPk(u.id);
      if (!existing) {
        await User.create({
          user_id: u.id,
          username: u.username,
          password: u.password,
          role: u.role,
          real_name: u.real_name,
          department: u.department,
          phone: u.phone,
          status: 'active',
          login_attempts: 0,
        });
        console.log(`  新建 ${u.role} ${u.real_name}(${u.id})`);
      } else {
        console.log(`  已存在 ${u.role} ${u.real_name}(${u.id})，跳过`);
      }
    }

    // ========== 1. 患者数据 ==========
    console.log('\n--- 创建患者 ---');
    const admissionBase = new Date(NOW.getTime() - 7 * 24 * HOUR);

    for (const p of PATIENT_DEFS) {
      await Patient.upsert({
        patient_id: p.id,
        user_id: null,
        name: p.name,
        gender: p.gender,
        age: p.age,
        bed_number: p.bed,
        admission_date: new Date(admissionBase.getTime() + Math.random() * 5 * 24 * HOUR),
        attending_doctor_id: p.doctor,
        status: 'admitted',
        medical_history: p.history,
        allergy: p.allergy,
      });
      console.log(`  患者 ${p.name}(${p.id}) ${p.bed}床`);
    }

    // ========== 2. 阈值配置 ==========
    console.log('\n--- 创建阈值 ---');
    // 先清除旧阈值
    await Threshold.destroy({ where: { patient_id: { [Op.in]: THRESHOLD_DEFS.map(t => t.id) } } });

    for (const t of THRESHOLD_DEFS) {
      await Threshold.create({
        threshold_id: 'T' + t.id,
        patient_id: t.id,
        pulse_min: t.pulseMin, pulse_max: t.pulseMax,
        temperature_min: t.tempMin, temperature_max: t.tempMax,
        bp_systolic_min: t.sysMin, bp_systolic_max: t.sysMax,
        bp_diastolic_min: t.diaMin, bp_diastolic_max: t.diaMax,
        ecg_rules: t.ecgRules,
        effective_time: new Date(NOW.getTime() - 3 * 24 * HOUR),
        created_by: t.id === 'P2024001' || t.id === 'P2024002' || t.id === 'P2024005' || t.id === 'P2024007' ? 'D2024001' : 'D2024002',
      });
      console.log(`  阈值 ${t.id}`);
    }

    // ========== 3. 体征历史（24h 趋势数据） ==========
    console.log('\n--- 创建体征历史 ---');
    // 先清除这些患者的旧体征数据
    await VitalSign.destroy({ where: { patient_id: { [Op.in]: PATIENT_DEFS.map(p => p.id) } } });

    const vitalBatch = [];
    let signalCounter = 1000;

    for (const p of PATIENT_DEFS) {
      const v = p.vitals;
      // 24 小时，每 15 分钟一条 ≈ 96 条
      for (let i = 0; i < 96; i++) {
        const collectTime = new Date(NOW.getTime() - (96 - i) * 15 * MIN);
        const timeOfDay = i / 96; // 0→1 代表 24h 进度

        // 脉搏：加入昼夜波动 + 随机噪声
        const pulseNoise = (Math.random() - 0.5) * v.pulseVar * 2;
        const pulseCycle = Math.sin(timeOfDay * Math.PI * 2) * v.pulseVar * 0.5;
        const pulse = Math.round(v.pulseBase + pulseNoise + pulseCycle);

        // 体温：缓慢变化
        const tempNoise = (Math.random() - 0.5) * v.tempVar;
        const tempCycle = Math.sin(timeOfDay * Math.PI) * v.tempVar * 0.3;
        const temp = parseFloat((v.tempBase + tempNoise + tempCycle).toFixed(1));

        // 血压
        const sysNoise = (Math.random() - 0.5) * v.sysVar;
        const diaNoise = (Math.random() - 0.5) * v.diaVar;
        const sys = Math.round(v.sysBase + sysNoise);
        const dia = Math.round(v.diaBase + diaNoise);
        const bp = `${sys}/${dia}`;

        // 心电图：部分患者有异常
        let ecg = '正常';
        if (p.id === 'P2024007' && i > 60) ecg = '窦性心动过缓';
        if (p.id === 'P2024005' && i > 70) ecg = '窦性心动过速，偶发室性早搏';
        if (p.id === 'P2024002' && i > 80) ecg = '窦性心动过速';

        vitalBatch.push({
          signal_id: `S_SEED_${signalCounter++}`,
          patient_id: p.id,
          pulse,
          temperature: temp,
          blood_pressure: bp,
          ecg,
          collect_time: collectTime,
        });
      }
      console.log(`  ${p.name} 96 条体征数据`);
    }

    // 批量插入（每批 200 条）
    for (let i = 0; i < vitalBatch.length; i += 200) {
      await VitalSign.bulkCreate(vitalBatch.slice(i, i + 200));
    }
    console.log(`  共 ${vitalBatch.length} 条体征数据写入`);

    // ========== 4. 报警数据 ==========
    console.log('\n--- 创建报警记录 ---');
    // 先清除这些患者的旧报警
    await Alert.destroy({ where: { patient_id: { [Op.in]: PATIENT_DEFS.map(p => p.id) } } });

    const alertBatch = [];
    let alertCounter = 5000;

    for (const a of ALERT_DEFS) {
      const timestamp = new Date(NOW.getTime() + a.offset);
      const status = a.status || '待处理';
      const handledTime = (status === '已确认' || status === '已解除') ? new Date(timestamp.getTime() + 10 * MIN) : null;

      alertBatch.push({
        alert_id: `A_SEED_${alertCounter++}`,
        patient_id: a.patient,
        alert_level: a.level,
        alert_content: a.content,
        indicator: a.indicator,
        actual_value: a.actual,
        threshold_value: a.threshold,
        status,
        handled_by: a.handler,
        handled_time: handledTime,
        timestamp,
      });
    }

    await Alert.bulkCreate(alertBatch);
    console.log(`  共 ${alertBatch.length} 条报警写入`);

    // 按状态统计
    const stats = await Alert.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('alert_id')), 'count']],
      group: ['status'],
      raw: true,
    });
    for (const s of stats) {
      console.log(`  ${s.status}: ${s.count} 条`);
    }

    // ========== 5. 刷新 Redis 缓存 ==========
    console.log('\n--- 刷新 Redis 缓存 ---');
    try {
      const cacheService = require('./services/CacheService');
      await cacheService.invalidateAlertCache();
      await cacheService.invalidatePatientListCache();
      await cacheService.invalidateDashboardCache();
      for (const p of PATIENT_DEFS) {
        await cacheService.invalidateVitalCache(p.id);
        await cacheService.invalidateThresholdCache(p.id);
      }
      console.log('  Redis 缓存已清除，后续请求将重新缓存');
    } catch (e) {
      console.log('  Redis 缓存清除失败(可能 Redis 未连接):', e.message);
    }

    console.log('\n✅ 种子脚本执行完成！');

    return { patients: PATIENT_DEFS.length, vitals: vitalBatch.length, alerts: alertBatch.length, thresholds: THRESHOLD_DEFS.length };
  } catch (err) {
    console.error('❌ 种子脚本执行失败:', err.message);
    throw err;
  }
}

// CLI 直接运行时自动执行
if (require.main === module) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seed };