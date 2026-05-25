// 补充Mock数据脚本：动态覆盖所有在院患者
const path = require('path');
// 从 backend/node_modules 加载依赖
module.paths.unshift(path.join(__dirname, '..', 'backend', 'node_modules'));
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// 基础体征范围（用作缺省值）
const DEFAULT_BASE = { pulse: 76, temp: 36.6, sys: 120, dia: 78 };

function generateRealisticPulse(basePulse, hourIndex) {
  const diurnal = Math.sin((hourIndex - 6) * Math.PI / 12) * 5;
  const noise = (Math.random() - 0.5) * 6;
  return Math.max(50, Math.min(130, Math.round(basePulse + diurnal + noise)));
}

function generateRealisticTemp(baseTemp, hourIndex) {
  const diurnal = Math.sin((hourIndex - 4) * Math.PI / 12) * 0.25;
  return parseFloat((baseTemp + diurnal + (Math.random() - 0.5) * 0.2).toFixed(1));
}

function generateBP(baseSys, baseDia, hourIndex) {
  const sysChange = Math.round(Math.sin((hourIndex - 8) * Math.PI / 12) * 6 + (Math.random() - 0.5) * 8);
  const diaChange = Math.round(sysChange * 0.6 + (Math.random() - 0.5) * 4);
  const systolic = Math.max(70, Math.min(180, baseSys + sysChange));
  const diastolic = Math.max(40, Math.min(110, baseDia + diaChange));
  return { systolic, diastolic };
}

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // 动态获取所有在院患者
  const [patients] = await conn.query('SELECT patient_id, name FROM patients WHERE status="admitted"');
  console.log(`共 ${patients.length} 名在院患者，准备生成体征数据...`);

  // 清除旧体征数据
  await conn.query(`DELETE FROM vital_signs WHERE signal_id LIKE 'SV%'`);
  
  const now = new Date();
  const ecgOptions = ['正常', '正常', '正常', '正常', '正常', '正常', '正常', '正常', '正常', '正常', '窦性心律不齐', 'ST段轻度改变'];
  let totalCount = 0;

  for (const p of patients) {
    const basePulse = randomInt(68, 82);
    const baseTemp = randomInt(360, 372) / 10;
    const baseSys = randomInt(110, 140);
    const baseDia = randomInt(70, 88);

    for (let h = 0; h < 24; h++) {
      const collectTime = new Date(now.getTime() - (23 - h) * 60 * 60 * 1000);
      const timestr = collectTime.toISOString().slice(0, 19).replace('T', ' ');

      const pulse = generateRealisticPulse(basePulse, h);
      const temperature = generateRealisticTemp(baseTemp, h);
      const bp = generateBP(baseSys, baseDia, h);
      const ecg = ecgOptions[Math.floor(Math.random() * ecgOptions.length)];

      await conn.query(
        `INSERT IGNORE INTO vital_signs (signal_id, patient_id, pulse, temperature, blood_pressure, ecg, collect_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['SV' + p.patient_id + String(h).padStart(2, '0'), p.patient_id, pulse, temperature, `${bp.systolic}/${bp.diastolic}`, ecg, timestr]
      );
      totalCount++;
    }
    console.log(`  ${p.patient_id} ${p.name}: 24条体征`);
  }
  console.log(`体征数据生成完成! 共${totalCount}条\n`);

  // 为所有在院患者生成默认阈值（已存在则跳过）
  console.log('=== 补充阈值配置 ===');
  for (const p of patients) {
    const [existing] = await conn.query('SELECT threshold_id FROM thresholds WHERE patient_id=?', [p.patient_id]);
    if (existing.length > 0) continue;
    const tid = 'T' + p.patient_id;
    await conn.query(
      `INSERT INTO thresholds (threshold_id, patient_id, pulse_min, pulse_max, temperature_min, temperature_max,
        bp_systolic_min, bp_systolic_max, bp_diastolic_min, bp_diastolic_max, ecg_rules, effective_time, created_by)
       VALUES (?, ?, 60, 100, 36.0, 37.3, 90, 140, 60, 90, '["心律不齐","ST段异常"]', NOW(), 'U2024001')`,
      [tid, p.patient_id]
    );
    console.log(`  ${p.patient_id} ${p.name}: 阈值已添加`);
  }
  console.log('阈值补充完成');

  await conn.end();
}

seed().catch(err => { console.error('Seed失败:', err.message); process.exit(1); });
