// 从已有体征数据中比对阈值，生成报警记录（含多种状态，覆盖所有在院患者）
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  await conn.query(`DELETE FROM alerts`);
  console.log('已清空旧报警记录');

  const [thresholds] = await conn.query('SELECT * FROM thresholds');
  const [patients] = await conn.query('SELECT patient_id FROM patients WHERE status="admitted"');
  const [nurses] = await conn.query('SELECT user_id FROM users WHERE role="nurse" LIMIT 5');
  const [doctors] = await conn.query('SELECT user_id FROM users WHERE role="doctor" LIMIT 5');
  const handlers = [...nurses, ...doctors];
  console.log(`患者${patients.length}人, 阈值${thresholds.length}条, 处理人${handlers.length}人`);

  function pickStatus() {
    const r = Math.random();
    if (r < 0.35) return '待处理';      // 35%
    if (r < 0.55) return '已确认';      // 20%
    if (r < 0.80) return '已升级';      // 25%
    return '已解除';                     // 20%
  }

  let alertCount = 0;

  for (const p of patients) {
    const threshold = thresholds.find(t => t.patient_id === p.patient_id);
    if (!threshold) continue;

    const [vitals] = await conn.query(
      'SELECT * FROM vital_signs WHERE patient_id=? ORDER BY collect_time DESC LIMIT 24',
      [p.patient_id]
    );
    if (vitals.length === 0) continue;

    let patientAlertCount = 0;
    const usedIndicators = new Set();

    for (const v of vitals) {
      if (patientAlertCount >= 3) break;

      // ---- 脉搏 ----
      if (!usedIndicators.has('pulse') && v.pulse != null && threshold.pulse_min != null) {
        if (v.pulse < threshold.pulse_min || v.pulse > threshold.pulse_max) {
          const dev = v.pulse < threshold.pulse_min
            ? (threshold.pulse_min - v.pulse) / threshold.pulse_min
            : (v.pulse - threshold.pulse_max) / threshold.pulse_max;
          const level = dev <= 0.1 ? '一般' : dev <= 0.3 ? '严重' : '危急';
          const status = pickStatus();
          const alertId = 'A' + Date.now() + Math.random().toString(36).substr(2, 4);
          const h = status !== '待处理' && handlers.length ? handlers[Math.floor(Math.random() * handlers.length)] : null;
          await conn.query(
            `INSERT INTO alerts (alert_id,patient_id,alert_level,alert_content,indicator,actual_value,threshold_value,status,handled_by,handled_time,timestamp)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [alertId, p.patient_id, level, `脉搏异常：${v.pulse}次/分钟（阈值${threshold.pulse_min}-${threshold.pulse_max}）`,
             'pulse', String(v.pulse), `${threshold.pulse_min}-${threshold.pulse_max}`, status,
             h?.user_id || null, h ? v.collect_time : null, v.collect_time]
          );
          alertCount++; patientAlertCount++; usedIndicators.add('pulse');
        }
      }

      // ---- 体温 ----
      if (!usedIndicators.has('temperature') && v.temperature != null && threshold.temperature_min != null) {
        const temp = parseFloat(v.temperature);
        if (temp < parseFloat(threshold.temperature_min) || temp > parseFloat(threshold.temperature_max)) {
          const dev = temp < parseFloat(threshold.temperature_min)
            ? (parseFloat(threshold.temperature_min) - temp) / parseFloat(threshold.temperature_min)
            : (temp - parseFloat(threshold.temperature_max)) / parseFloat(threshold.temperature_max);
          const level = dev <= 0.1 ? '一般' : dev <= 0.3 ? '严重' : '危急';
          const status = pickStatus();
          const alertId = 'A' + Date.now() + Math.random().toString(36).substr(2, 4);
          const h = status !== '待处理' && handlers.length ? handlers[Math.floor(Math.random() * handlers.length)] : null;
          await conn.query(
            `INSERT INTO alerts (alert_id,patient_id,alert_level,alert_content,indicator,actual_value,threshold_value,status,handled_by,handled_time,timestamp)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [alertId, p.patient_id, level, `体温异常：${v.temperature}°C（阈值${threshold.temperature_min}-${threshold.temperature_max}）`,
             'temperature', String(v.temperature), `${threshold.temperature_min}-${threshold.temperature_max}`, status,
             h?.user_id || null, h ? v.collect_time : null, v.collect_time]
          );
          alertCount++; patientAlertCount++; usedIndicators.add('temperature');
        }
      }

      // ---- 血压 ----
      if (!usedIndicators.has('bloodPressure') && v.blood_pressure && threshold.bp_systolic_min != null) {
        const parts = v.blood_pressure.split('/');
        if (parts.length === 2) {
          const sys = parseInt(parts[0]), dia = parseInt(parts[1]);
          const sysAb = sys < threshold.bp_systolic_min || sys > threshold.bp_systolic_max;
          const diaAb = threshold.bp_diastolic_min != null && (dia < threshold.bp_diastolic_min || dia > threshold.bp_diastolic_max);
          if (sysAb || diaAb) {
            const content = sysAb && diaAb
              ? `血压异常：${v.blood_pressure}mmHg（收缩压阈值${threshold.bp_systolic_min}-${threshold.bp_systolic_max}，舒张压阈值${threshold.bp_diastolic_min}-${threshold.bp_diastolic_max}）`
              : sysAb ? `收缩压异常：${sys}mmHg（阈值${threshold.bp_systolic_min}-${threshold.bp_systolic_max}）`
              : `舒张压异常：${dia}mmHg（阈值${threshold.bp_diastolic_min}-${threshold.bp_diastolic_max}）`;
            const dev = sysAb ? (sys < threshold.bp_systolic_min ? (threshold.bp_systolic_min - sys) / threshold.bp_systolic_min : (sys - threshold.bp_systolic_max) / threshold.bp_systolic_max)
              : (dia < threshold.bp_diastolic_min ? (threshold.bp_diastolic_min - dia) / threshold.bp_diastolic_min : (dia - threshold.bp_diastolic_max) / threshold.bp_diastolic_max);
            const level = dev <= 0.1 ? '一般' : dev <= 0.3 ? '严重' : '危急';
            const status = pickStatus();
            const alertId = 'A' + Date.now() + Math.random().toString(36).substr(2, 4);
            const h = status !== '待处理' && handlers.length ? handlers[Math.floor(Math.random() * handlers.length)] : null;
            await conn.query(
              `INSERT INTO alerts (alert_id,patient_id,alert_level,alert_content,indicator,actual_value,threshold_value,status,handled_by,handled_time,timestamp)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
              [alertId, p.patient_id, level, content, 'bloodPressure', String(v.blood_pressure),
               `${threshold.bp_systolic_min}/${threshold.bp_diastolic_min}-${threshold.bp_systolic_max}/${threshold.bp_diastolic_max}`,
               status, h?.user_id || null, h ? v.collect_time : null, v.collect_time]
            );
            alertCount++; patientAlertCount++; usedIndicators.add('bloodPressure');
          }
        }
      }
    }
  }

  const [stats] = await conn.query('SELECT status, COUNT(*) as cnt FROM alerts GROUP BY status');
  console.log(`\n报警生成完成! 共 ${alertCount} 条`);
  stats.forEach(s => console.log(`  ${s.status}: ${s.cnt} 条`));
  await conn.end();
}

seed().catch(err => { console.error('失败:', err.message); process.exit(1); });
