// 补充Mock数据脚本：动态覆盖所有在院患者，生成72小时体征数据 + 日志 + 报告 + 诊疗建议
const path = require('path');
// 从 backend/node_modules 加载依赖
module.paths.unshift(path.join(__dirname, '..', 'backend', 'node_modules'));
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// 每6小时产生一个异常窗口(窗口内2小时)，确保每人每天有4个异常时段 → 72h有12个窗口
function isAbnormal(hour) {
  const h6 = hour % 6;
  return h6 >= 1 && h6 <= 2; // 每6小时的第1-2小时为异常
}

// 每个患者的基础体征和病情特征（体现不同疾病的差异）
const PATIENT_PROFILES = {
  // 心内科
  'P2024001': { base: { pulse: 78, temp: 36.7, sys: 130, dia: 85 }, condition: 'heart_disease', desc: '冠心病+高血压' },
  'P2024002': { base: { pulse: 88, temp: 36.5, sys: 120, dia: 78 }, condition: 'arrhythmia', desc: '房颤' },
  'P2024007': { base: { pulse: 72, temp: 36.8, sys: 125, dia: 82 }, condition: 'post_mi', desc: '心梗恢复期' },
  'P2024011': { base: { pulse: 65, temp: 36.3, sys: 115, dia: 72 }, condition: 'heart_failure', desc: '心衰+糖尿病' },
  'P2024014': { base: { pulse: 58, temp: 36.4, sys: 110, dia: 68 }, condition: 'cardiomyopathy', desc: '扩张型心肌病' },
  // 呼吸科
  'P2024003': { base: { pulse: 92, temp: 37.0, sys: 135, dia: 88 }, condition: 'copd', desc: 'COPD' },
  'P2024004': { base: { pulse: 85, temp: 37.8, sys: 118, dia: 76 }, condition: 'pneumonia', desc: '肺炎' },
  'P2024009': { base: { pulse: 78, temp: 36.5, sys: 120, dia: 80 }, condition: 'asthma', desc: '哮喘' },
  // 神经内科
  'P2024005': { base: { pulse: 70, temp: 36.4, sys: 145, dia: 92 }, condition: 'stroke', desc: '脑梗死后遗症' },
  'P2024008': { base: { pulse: 68, temp: 36.3, sys: 140, dia: 88 }, condition: 'parkinson', desc: '帕金森+高血压' },
  'P2024013': { base: { pulse: 72, temp: 36.2, sys: 135, dia: 85 }, condition: 'alzheimer', desc: '阿尔茨海默' },
  // 骨科
  'P2024006': { base: { pulse: 80, temp: 37.1, sys: 125, dia: 80 }, condition: 'fracture', desc: '骨折术后' },
  'P2024010': { base: { pulse: 74, temp: 36.6, sys: 122, dia: 78 }, condition: 'spine', desc: '腰椎术后' },
  'P2024012': { base: { pulse: 82, temp: 37.3, sys: 128, dia: 82 }, condition: 'joint', desc: '关节置换术后' },
};

function generatePulse(base, hour, condition) {
  // 异常时段产生超阈值数据
  if (isAbnormal(hour)) {
    // 随机偏高或偏低
    if (Math.random() < 0.5) return Math.max(30, base - randomInt(15, 30));
    return Math.min(160, base + randomInt(15, 35));
  }
  const diurnal = Math.sin((hour - 6) * Math.PI / 12) * 4;
  const noise = (Math.random() - 0.5) * 8;
  let val = Math.round(base + diurnal + noise);
  if (condition === 'heart_failure' || condition === 'cardiomyopathy') val -= randomInt(3, 8);
  if (condition === 'arrhythmia') val += randomInt(-10, 15);
  if (condition === 'copd' || condition === 'pneumonia') val += randomInt(2, 10);
  if (condition === 'stroke') val += randomInt(0, 8);
  if (condition === 'post_mi') val += randomInt(-5, 5);
  if (condition === 'fracture' || condition === 'joint') val += randomInt(3, 10);
  return Math.max(40, Math.min(140, val));
}

function generateTemp(base, hour, condition) {
  if (isAbnormal(hour)) {
    if (Math.random() < 0.5) return parseFloat(Math.max(34.5, base - randomInt(10, 20) / 10).toFixed(1));
    return parseFloat(Math.min(40.0, base + randomInt(8, 18) / 10).toFixed(1));
  }
  const diurnal = Math.sin((hour - 4) * Math.PI / 12) * 0.2;
  const noise = (Math.random() - 0.5) * 0.3;
  let val = base + diurnal + noise;
  if (condition === 'pneumonia') val += randomInt(30, 80) / 100;
  if (condition === 'fracture' || condition === 'joint') val += randomInt(10, 40) / 100;
  return parseFloat(Math.max(35.0, Math.min(39.5, val)).toFixed(1));
}

function generateBP(baseSys, baseDia, hour, condition) {
  if (isAbnormal(hour)) {
    const sysOff = randomInt(15, 30) * (Math.random() < 0.5 ? -1 : 1);
    const diaOff = Math.round(sysOff * 0.6);
    return { systolic: Math.max(60, Math.min(210, baseSys + sysOff)), diastolic: Math.max(35, Math.min(130, baseDia + diaOff)) };
  }
  const sysChange = Math.round(Math.sin((hour - 8) * Math.PI / 12) * 5 + (Math.random() - 0.5) * 10);
  const diaChange = Math.round(sysChange * 0.6 + (Math.random() - 0.5) * 5);
  let systolic = baseSys + sysChange;
  let diastolic = baseDia + diaChange;
  if (condition === 'stroke') { systolic += randomInt(5, 15); diastolic += randomInt(3, 8); }
  if (condition === 'heart_failure' || condition === 'cardiomyopathy') { systolic -= randomInt(5, 15); diastolic -= randomInt(3, 8); }
  systolic = Math.max(70, Math.min(200, systolic));
  diastolic = Math.max(40, Math.min(120, diastolic));
  return { systolic, diastolic };
}

function generateECG(condition) {
  const r = Math.random();
  switch (condition) {
    case 'heart_disease': return r < 0.15 ? 'ST段改变' : r < 0.25 ? 'T波异常' : r < 0.30 ? '室性早搏' : '正常';
    case 'arrhythmia': return r < 0.30 ? '心房颤动' : r < 0.40 ? 'ST段改变' : '正常';
    case 'post_mi': return r < 0.15 ? 'ST段抬高' : r < 0.25 ? '病理性Q波' : r < 0.35 ? '室性早搏' : '正常';
    case 'heart_failure': return r < 0.20 ? '房颤' : r < 0.30 ? 'ST-T改变' : '正常';
    case 'cardiomyopathy': return r < 0.35 ? '完全性左束支传导阻滞' : r < 0.45 ? '室性心动过速' : '正常';
    case 'copd': return r < 0.15 ? '窦性心动过速' : r < 0.25 ? '肺性P波' : '正常';
    case 'pneumonia': return r < 0.25 ? '窦性心动过速' : '正常';
    case 'stroke': return r < 0.15 ? '心房颤动' : r < 0.20 ? 'ST-T改变' : '正常';
    default: return r < 0.08 ? '窦性心律不齐' : r < 0.12 ? 'ST段轻度改变' : '正常';
  }
}

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [patients] = await conn.query('SELECT patient_id, name FROM patients WHERE status="admitted"');
  console.log(`共 ${patients.length} 名在院患者，准备生成72小时体征数据...`);

  // 清除旧模拟数据
  await conn.query(`DELETE FROM vital_signs WHERE signal_id LIKE 'SV%'`);
  await conn.query(`DELETE FROM compare_results`);
  await conn.query(`DELETE FROM patient_logs WHERE log_id LIKE 'LG%'`);
  await conn.query(`DELETE FROM medical_reports WHERE report_id LIKE 'MR%'`);
  await conn.query(`DELETE FROM treatment_advice WHERE advice_id LIKE 'TA%'`);

  const now = new Date();
  const HOURS = 72; // 72小时数据
  let totalSignals = 0;

  for (const p of patients) {
    const profile = PATIENT_PROFILES[p.patient_id] || { base: { pulse: 76, temp: 36.6, sys: 120, dia: 78 }, condition: 'normal', desc: '常规' };
    const { base, condition, desc } = profile;

    for (let h = 0; h < HOURS; h++) {
      const collectTime = new Date(now.getTime() - (HOURS - 1 - h) * 60 * 60 * 1000);
      const timestr = collectTime.toISOString().slice(0, 19).replace('T', ' ');

      const pulse = generatePulse(base.pulse, h % 24, condition);
      const temperature = generateTemp(base.temp, h % 24, condition);
      const bp = generateBP(base.sys, base.dia, h % 24, condition);
      const ecg = generateECG(condition);

      await conn.query(
        `INSERT IGNORE INTO vital_signs (signal_id, patient_id, pulse, temperature, blood_pressure, ecg, collect_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['SV' + p.patient_id + String(h).padStart(3, '0'), p.patient_id, pulse, temperature, `${bp.systolic}/${bp.diastolic}`, ecg, timestr]
      );
      totalSignals++;
    }
    console.log(`  ${p.patient_id} ${p.name} [${desc}]: ${HOURS}条体征`);
  }
  console.log(`体征数据生成完成! 共${totalSignals}条 (${patients.length}人 × ${HOURS}小时)\n`);

  // ===== 生成患者日志 =====
  console.log('=== 生成患者日志 ===');
  const logTemplates = [
    '患者今日生命体征平稳，继续常规监测。',
    '患者主诉轻度不适，已通知主管医生。',
    '按时完成常规护理，生命体征正常。',
    '患者血压波动较大，已调整用药方案。',
    '体温较昨日有所下降，继续观察。',
    '患者饮食正常，睡眠质量良好。',
    '伤口换药完成，愈合情况良好。',
    '康复训练按计划进行，耐受良好。',
    '患者情绪稳定，积极配合治疗。',
    '夜间巡视无异常，心电监护正常。',
    '患者出现偶发早搏，已记录并上报。',
    '血压控制达标，维持当前用药剂量。',
    '患者主诉疼痛，已给药处理。',
    '物理治疗按时完成，关节活动度改善。',
    '血气分析结果回报，氧合指数改善中。',
    '家属探视后患者情绪稳定，继续观察。',
    '吸氧浓度下调至2L/min，SpO2维持在95%以上。',
    '患者自主排尿功能恢复良好。',
    '引流管拔除顺利完成，无并发症。',
    '康复师评估后建议增加下床活动频次。'
  ];
  let logCount = 0;
  for (const p of patients) {
    const logDays = randomInt(3, 6);
    for (let d = 0; d < logDays; d++) {
      const logTime = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const ts = logTime.toISOString().slice(0, 19).replace('T', ' ');
      const content = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      await conn.query(
        `INSERT INTO patient_logs (log_id, patient_id, title, format, content, log_time)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`LG${p.patient_id}${String(d).padStart(2,'0')}`, p.patient_id, '护理记录', 'text', content, ts]
      );
      logCount++;
    }
  }
  console.log(`患者日志: ${logCount} 条\n`);

  // ===== 生成诊疗建议 =====
  console.log('=== 生成诊疗建议 ===');
  const adviceByCondition = {
    'heart_disease': [
      { type: 'treatment', title: '冠心病药物治疗方案', content: '阿司匹林100mg qd + 阿托伐他汀20mg qn + 美托洛尔25mg bid，定期复查血脂和心电图。' },
      { type: 'diet', title: '低盐低脂饮食指导', content: '每日钠摄入<5g，减少动物脂肪，增加鱼类和蔬果，控制总热量。' },
      { type: 'rehabilitation', title: '心脏康复运动处方', content: '第一阶段：床边活动，每次10分钟，每日2次；逐步过渡到步行训练。' },
    ],
    'arrhythmia': [
      { type: 'treatment', title: '房颤抗凝治疗方案', content: '华法林3mg qd，INR目标2.0-3.0，每周监测一次。' },
      { type: 'health', title: '房颤自我管理注意事项', content: '避免咖啡因和酒精摄入，注意心率监测，出现心悸胸闷及时报告。' },
    ],
    'post_mi': [
      { type: 'treatment', title: '心肌梗死二级预防', content: '双联抗血小板(阿司匹林+替格瑞洛)至少12个月，β受体阻滞剂长期使用。' },
      { type: 'rehabilitation', title: '心梗后康复计划', content: '起始MET≤2.0，逐周递增，第4周开始亚极量运动试验。' },
      { type: 'diet', title: '低胆固醇饮食方案', content: '胆固醇<200mg/日，增加膳食纤维至25-30g/日。' },
    ],
    'heart_failure': [
      { type: 'treatment', title: '心衰综合治疗', content: '沙库巴曲缬沙坦50mg bid + 螺内酯20mg qd + 呋塞米20mg qd，严格记录每日出入量。' },
      { type: 'diet', title: '限钠限水饮食方案', content: '钠<2g/日，液体摄入<1500ml/日，每日称重监测。' },
    ],
    'copd': [
      { type: 'treatment', title: 'COPD急性加重期治疗', content: '氧疗2-3L/min维持SpO2 88-92%，布地奈德/福莫特罗吸入bid，必要时抗生素。' },
      { type: 'rehabilitation', title: '肺康复训练', content: '缩唇呼吸+腹式呼吸每日3次，每次15分钟；上肢力量训练逐步增加。' },
      { type: 'health', title: '戒烟指导及随访', content: '尼古丁替代疗法，定期肺功能随访，每年流感疫苗接种。' },
    ],
    'pneumonia': [
      { type: 'treatment', title: '社区获得性肺炎抗感染方案', content: '莫西沙星400mg iv qd，疗程7-14天，监测体温和血象变化。' },
      { type: 'diet', title: '高蛋白半流质饮食', content: '每日蛋白质摄入1.2-1.5g/kg，少量多餐，增加维生素C摄入。' },
    ],
    'stroke': [
      { type: 'treatment', title: '脑梗死后遗症综合管理', content: '氯吡格雷75mg qd + 氨氯地平5mg qd控制血压，目标<140/90mmHg。' },
      { type: 'rehabilitation', title: '左侧肢体康复训练计划', content: '物理治疗每日1次，作业治疗隔日1次，针灸辅助治疗。' },
    ],
    'parkinson': [
      { type: 'treatment', title: '帕金森病药物治疗', content: '多巴丝肼125mg tid + 普拉克索0.25mg tid，根据运动症状调整。' },
      { type: 'health', title: '防跌倒安全管理', content: '床栏保护，呼叫铃随手可及，如厕需辅助。' },
    ],
    'fracture': [
      { type: 'treatment', title: '骨折术后管理', content: '头孢唑林2g bid预防感染(3天)，塞来昔布200mg bid止痛。' },
      { type: 'rehabilitation', title: '下肢功能恢复训练', content: '踝泵运动每日4组，股四头肌等长收缩训练，CPM机辅助。' },
    ],
    'spine': [
      { type: 'treatment', title: '腰椎术后康复方案', content: '佩戴腰围4周，避免弯腰和提重物，逐步核心肌群训练。' },
      { type: 'health', title: '正确坐姿及睡眠指导', content: '座椅腰部支撑，睡眠时侧卧屈膝位，避免久坐超过30分钟。' },
    ],
    'joint': [
      { type: 'treatment', title: '膝关节置换术后管理', content: '利伐沙班10mg qd抗凝14天，冰敷每日4次降低肿胀。' },
      { type: 'rehabilitation', title: '早期关节活动训练', content: '术后第1日：被动屈伸0-30°，逐步增加至90°；CPM每日2次。' },
      { type: 'health', title: '伤口护理及感染预防', content: '保持敷料干燥，每2日换药，注意观察红肿热痛等感染征象。' },
    ],
  };
  let adviceCount = 0;
  for (const p of patients) {
    const profile = PATIENT_PROFILES[p.patient_id];
    if (!profile) continue;
    const advices = adviceByCondition[profile.condition] || [
      { type: 'treatment', title: '常规治疗', content: '继续当前治疗方案，密切监测生命体征变化。' }
    ];
    for (let i = 0; i < advices.length; i++) {
      const a = advices[i];
      await conn.query(
        `INSERT INTO treatment_advice (advice_id, patient_id, doctor_id, type, title, content, is_active, create_time)
         VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
        [`TA${p.patient_id}${String(i).padStart(2,'0')}`, p.patient_id,
         profile.condition === 'heart_disease' || profile.condition === 'arrhythmia' || profile.condition === 'post_mi' || profile.condition === 'heart_failure' || profile.condition === 'cardiomyopathy' ? 'U2024001' :
         profile.condition === 'copd' || profile.condition === 'pneumonia' || profile.condition === 'asthma' ? 'U2024002' :
         profile.condition === 'stroke' || profile.condition === 'parkinson' || profile.condition === 'alzheimer' ? 'U2024003' : 'U2024004',
         a.type, a.title, a.content]
      );
      adviceCount++;
    }
  }
  console.log(`诊疗建议: ${adviceCount} 条\n`);

  await conn.end();
}

seed().catch(err => { console.error('Seed失败:', err.message); process.exit(1); });

