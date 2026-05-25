// 创建阈值修改历史数据
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

async function seedHistory() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // 每个患者创建2条历史阈值记录
  const historyData = [
    // P001 王建国 68岁
    { pid: 'P001', tid: 'TH00101', pulseMin: 65, pulseMax: 105, tempMin: 36.0, tempMax: 37.5, sysMin: 90, sysMax: 145, diaMin: 60, diaMax: 95, daysAgo: 30, doctor: 'U2024001' },
    { pid: 'P001', tid: 'TH00102', pulseMin: 60, pulseMax: 100, tempMin: 36.0, tempMax: 37.3, sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90, daysAgo: 15, doctor: 'U2024001' },
    // P002 陈丽华 35岁
    { pid: 'P002', tid: 'TH00201', pulseMin: 70, pulseMax: 110, tempMin: 36.0, tempMax: 37.5, sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90, daysAgo: 28, doctor: 'U2024002' },
    { pid: 'P002', tid: 'TH00202', pulseMin: 65, pulseMax: 105, tempMin: 36.0, tempMax: 37.5, sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90, daysAgo: 14, doctor: 'U2024002' },
    // P003 刘志强 72岁
    { pid: 'P003', tid: 'TH00301', pulseMin: 60, pulseMax: 100, tempMin: 36.0, tempMax: 37.3, sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90, daysAgo: 25, doctor: 'U2024001' },
    { pid: 'P003', tid: 'TH00302', pulseMin: 55, pulseMax: 95, tempMin: 35.5, tempMax: 37.5, sysMin: 85, sysMax: 135, diaMin: 55, diaMax: 85, daysAgo: 12, doctor: 'U2024001' },
    // P005 赵永刚 45岁
    { pid: 'P005', tid: 'TH00501', pulseMin: 60, pulseMax: 100, tempMin: 36.0, tempMax: 37.3, sysMin: 90, sysMax: 140, diaMin: 60, diaMax: 90, daysAgo: 20, doctor: 'U2024001' },
    { pid: 'P005', tid: 'TH00502', pulseMin: 55, pulseMax: 90, tempMin: 35.5, tempMax: 37.5, sysMin: 85, sysMax: 135, diaMin: 55, diaMax: 85, daysAgo: 10, doctor: 'U2024001' },
  ];

  for (const h of historyData) {
    const effectiveTime = new Date();
    effectiveTime.setDate(effectiveTime.getDate() - h.daysAgo);
    const timeStr = effectiveTime.toISOString().slice(0, 19).replace('T', ' ');
    
    await conn.query(
      `INSERT IGNORE INTO thresholds (threshold_id, patient_id, pulse_min, pulse_max, temperature_min, temperature_max,
        bp_systolic_min, bp_systolic_max, bp_diastolic_min, bp_diastolic_max, ecg_rules, effective_time, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '["心律不齐"]', ?, ?)`,
      [h.tid, h.pid, h.pulseMin, h.pulseMax, h.tempMin, h.tempMax, h.sysMin, h.sysMax, h.diaMin, h.diaMax, timeStr, h.doctor]
    );
  }
  console.log(`${historyData.length}条阈值历史记录已添加`);
  await conn.end();
}

seedHistory().catch(err => { console.error(err.message); process.exit(1); });
