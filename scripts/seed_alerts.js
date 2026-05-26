// 从已有体征数据中比对阈值，生成报警记录 + 比对结果 + 病情报告
const path = require('path');
// 从 backend/node_modules 加载依赖
module.paths.unshift(path.join(__dirname, '..', 'backend', 'node_modules'));
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const STATUS_CYCLE = ['待处理', '已确认', '已升级', '已解除'];

// 每个患者的前4条报警按顺序分配四种状态，保证每种状态都有例子
function pickStatus(patientAlertCount) {
  if (patientAlertCount < 4) return STATUS_CYCLE[patientAlertCount];
  // 第5条起随机，加重待处理比例
  const r = Math.random();
  if (r < 0.55) return '待处理';
  if (r < 0.70) return '已确认';
  if (r < 0.90) return '已升级';
  return '已解除';
}

function pickLevel(deviation) {
  if (deviation <= 0.08) return '一般';
  if (deviation <= 0.25) return '严重';
  return '危急';
}

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  await conn.query(`DELETE FROM alerts`);
  await conn.query(`DELETE FROM compare_results`);
  await conn.query(`DELETE FROM medical_reports WHERE report_id LIKE 'MR%'`);
  console.log('已清空旧报警/比对/报告数据');

  const [thresholds] = await conn.query('SELECT * FROM thresholds');
  const [patients] = await conn.query('SELECT patient_id, name FROM patients WHERE status="admitted"');
  const [nurses] = await conn.query('SELECT user_id FROM users WHERE role="nurse"');
  const [doctors] = await conn.query('SELECT user_id FROM users WHERE role="doctor"');
  const handlers = [...nurses, ...doctors];
  console.log(`患者${patients.length}人, 阈值${thresholds.length}条, 处理人${handlers.length}人\n`);

  let alertCount = 0, compareCount = 0, reportCount = 0;

  for (const p of patients) {
    const threshold = thresholds.find(t => t.patient_id === p.patient_id);
    if (!threshold) { console.log(`  ${p.name}: 无阈值配置，跳过`); continue; }

    const [vitals] = await conn.query(
      'SELECT * FROM vital_signs WHERE patient_id=? ORDER BY collect_time ASC',
      [p.patient_id]
    );
    if (vitals.length === 0) { console.log(`  ${p.name}: 无体征数据，跳过`); continue; }

    let patientAlertCount = 0, patientCompareCount = 0;
    const vitalsForReport = vitals.slice(-48); // 最新48条用于报告

    for (const v of vitals) {
      // ---- 生成比对结果 ----
      let isNormal = true;
      let abnormalLevel = null;

      if (v.pulse != null && threshold.pulse_min != null) {
        const dev = v.pulse < threshold.pulse_min
          ? (threshold.pulse_min - v.pulse) / threshold.pulse_min
          : v.pulse > threshold.pulse_max ? (v.pulse - threshold.pulse_max) / threshold.pulse_max : 0;
        if (dev > 0) { isNormal = false; abnormalLevel = pickLevel(dev); }
        await conn.query(
          `INSERT INTO compare_results (result_id, patient_id, signal_id, indicator, actual_value, threshold_min, threshold_max, is_normal, abnormal_level, timestamp)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          ['CR' + Date.now() + Math.random().toString(36).substr(2,4), p.patient_id, v.signal_id,
           'pulse', String(v.pulse), String(threshold.pulse_min), String(threshold.pulse_max),
           dev <= 0, dev > 0 ? pickLevel(dev) : null, v.collect_time]
        );
        patientCompareCount++; compareCount++;
      }

      if (v.temperature != null && threshold.temperature_min != null) {
        const temp = parseFloat(v.temperature);
        const dev = temp < parseFloat(threshold.temperature_min)
          ? (parseFloat(threshold.temperature_min) - temp) / parseFloat(threshold.temperature_min)
          : temp > parseFloat(threshold.temperature_max) ? (temp - parseFloat(threshold.temperature_max)) / parseFloat(threshold.temperature_max) : 0;
        if (dev > 0) { isNormal = false; if (!abnormalLevel || dev > 0.08) abnormalLevel = pickLevel(dev); }
        await conn.query(
          `INSERT INTO compare_results (result_id, patient_id, signal_id, indicator, actual_value, threshold_min, threshold_max, is_normal, abnormal_level, timestamp)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          ['CR' + Date.now() + Math.random().toString(36).substr(2,4), p.patient_id, v.signal_id,
           'temperature', String(v.temperature), String(threshold.temperature_min), String(threshold.temperature_max),
           dev <= 0, dev > 0 ? pickLevel(dev) : null, v.collect_time]
        );
        patientCompareCount++; compareCount++;
      }

      // ---- 生成报警（每个指标独立判断，每人最多8条）----
      if (patientAlertCount >= 12) continue;

      // 脉搏报警
      if (v.pulse != null && threshold.pulse_min != null) {
        if (v.pulse < threshold.pulse_min || v.pulse > threshold.pulse_max) {
          const dev = v.pulse < threshold.pulse_min
            ? (threshold.pulse_min - v.pulse) / threshold.pulse_min
            : (v.pulse - threshold.pulse_max) / threshold.pulse_max;
          const level = pickLevel(dev);
          const status = pickStatus(patientAlertCount);
          const alertId = 'A' + Date.now() + Math.random().toString(36).substr(2,4);
          const h = status !== '待处理' && handlers.length ? handlers[Math.floor(Math.random() * handlers.length)] : null;
          await conn.query(
            `INSERT INTO alerts (alert_id,patient_id,alert_level,alert_content,indicator,actual_value,threshold_value,status,handled_by,handled_time,timestamp)
             VALUES (?,?,?,?,?,?,?,?,?,?,NOW())`,
            [alertId, p.patient_id, level,
             v.pulse < threshold.pulse_min
               ? `脉搏偏低：${v.pulse}次/分钟（阈值${threshold.pulse_min}-${threshold.pulse_max}次/分钟）`
               : `脉搏偏高：${v.pulse}次/分钟（阈值${threshold.pulse_min}-${threshold.pulse_max}次/分钟）`,
             'pulse', String(v.pulse), `${threshold.pulse_min}-${threshold.pulse_max}`, status,
             h?.user_id || null, h ? v.collect_time : null]
          );
          alertCount++; patientAlertCount++;
        }
      }

      // 体温报警
      if (v.temperature != null && threshold.temperature_min != null && patientAlertCount < 12) {
        const temp = parseFloat(v.temperature);
        if (temp < parseFloat(threshold.temperature_min) || temp > parseFloat(threshold.temperature_max)) {
          const dev = temp < parseFloat(threshold.temperature_min)
            ? (parseFloat(threshold.temperature_min) - temp) / parseFloat(threshold.temperature_min)
            : (temp - parseFloat(threshold.temperature_max)) / parseFloat(threshold.temperature_max);
          const level = pickLevel(dev);
          const status = pickStatus(patientAlertCount);
          const alertId = 'A' + Date.now() + Math.random().toString(36).substr(2,4);
          const h = status !== '待处理' && handlers.length ? handlers[Math.floor(Math.random() * handlers.length)] : null;
          await conn.query(
            `INSERT INTO alerts (alert_id,patient_id,alert_level,alert_content,indicator,actual_value,threshold_value,status,handled_by,handled_time,timestamp)
             VALUES (?,?,?,?,?,?,?,?,?,?,NOW())`,
            [alertId, p.patient_id, level,
             temp < parseFloat(threshold.temperature_min)
               ? `体温偏低：${v.temperature}°C（阈值${threshold.temperature_min}-${threshold.temperature_max}°C）`
               : `体温偏高：${v.temperature}°C（阈值${threshold.temperature_min}-${threshold.temperature_max}°C）`,
             'temperature', String(v.temperature), `${threshold.temperature_min}-${threshold.temperature_max}`, status,
             h?.user_id || null, h ? v.collect_time : null]
          );
          alertCount++; patientAlertCount++;
        }
      }

      // 血压报警
      if (v.blood_pressure && threshold.bp_systolic_min != null && patientAlertCount < 12) {
        const parts = v.blood_pressure.split('/');
        if (parts.length === 2) {
          const sys = parseInt(parts[0]), dia = parseInt(parts[1]);
          const sysAb = sys < threshold.bp_systolic_min || sys > threshold.bp_systolic_max;
          const diaAb = threshold.bp_diastolic_min != null && (dia < threshold.bp_diastolic_min || dia > threshold.bp_diastolic_max);
          if (sysAb || diaAb) {
            const content = sysAb && diaAb
              ? `血压异常：${v.blood_pressure}mmHg（收缩压阈值${threshold.bp_systolic_min}-${threshold.bp_systolic_max}，舒张压阈值${threshold.bp_diastolic_min}-${threshold.bp_diastolic_max}）`
              : sysAb ? `收缩压异常：${sys}mmHg（阈值${threshold.bp_systolic_min}-${threshold.bp_systolic_max}mmHg）`
              : `舒张压异常：${dia}mmHg（阈值${threshold.bp_diastolic_min}-${threshold.bp_diastolic_max}mmHg）`;
            const dev = sysAb
              ? (sys < threshold.bp_systolic_min ? (threshold.bp_systolic_min - sys) / threshold.bp_systolic_min : (sys - threshold.bp_systolic_max) / threshold.bp_systolic_max)
              : (dia < threshold.bp_diastolic_min ? (threshold.bp_diastolic_min - dia) / threshold.bp_diastolic_min : (dia - threshold.bp_diastolic_max) / threshold.bp_diastolic_max);
            const level = pickLevel(dev);
            const status = pickStatus(patientAlertCount);
            const alertId = 'A' + Date.now() + Math.random().toString(36).substr(2,4);
            const h = status !== '待处理' && handlers.length ? handlers[Math.floor(Math.random() * handlers.length)] : null;
            await conn.query(
              `INSERT INTO alerts (alert_id,patient_id,alert_level,alert_content,indicator,actual_value,threshold_value,status,handled_by,handled_time,timestamp)
               VALUES (?,?,?,?,?,?,?,?,?,?,NOW())`,
              [alertId, p.patient_id, level, content, 'bloodPressure', v.blood_pressure,
               `${threshold.bp_systolic_min}/${threshold.bp_diastolic_min}-${threshold.bp_systolic_max}/${threshold.bp_diastolic_max}`,
               status, h?.user_id || null, h ? v.collect_time : null]
            );
            alertCount++; patientAlertCount++;
          }
        }
      }
    }

    // ---- 生成病情报告（取最近48条生成趋势） ----
    if (vitalsForReport.length >= 12) {
      const pulseTrend = vitalsForReport.filter(v => v.pulse).map(v => v.pulse);
      const tempTrend = vitalsForReport.filter(v => v.temperature).map(v => parseFloat(v.temperature));
      const bpTrend = vitalsForReport.filter(v => v.blood_pressure).map(v => v.blood_pressure);
      const endTime = vitalsForReport[vitalsForReport.length - 1].collect_time;
      const startTime = vitalsForReport[0].collect_time;

      const abnormalEvents = [];
      for (const v of vitalsForReport) {
        if (v.pulse && threshold.pulse_min && (v.pulse < threshold.pulse_min || v.pulse > threshold.pulse_max)) {
          abnormalEvents.push({ time: v.collect_time, indicator: 'pulse', value: String(v.pulse), level: '异常' });
        }
        if (v.temperature && threshold.temperature_min) {
          const t = parseFloat(v.temperature);
          if (t < parseFloat(threshold.temperature_min) || t > parseFloat(threshold.temperature_max)) {
            abnormalEvents.push({ time: v.collect_time, indicator: 'temperature', value: String(v.temperature), level: '异常' });
          }
        }
      }

      await conn.query(
        `INSERT INTO medical_reports (report_id, patient_id, title, content, trend_data, abnormal_events, start_time, end_time, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, '1.0')`,
        ['MR' + p.patient_id + '01', p.patient_id,
         `${p.name}病情监测报告`,
         `${p.name}近48小时生命体征监测汇总，共分析${vitalsForReport.length}条体征数据。`,
         JSON.stringify({ pulse: pulseTrend.slice(-24), temperature: tempTrend.slice(-24), bloodPressure: bpTrend.slice(-24) }),
         JSON.stringify(abnormalEvents.slice(0, 20)),
         startTime, endTime]
      );
      reportCount++;
    }

    console.log(`  ${p.name}: ${patientAlertCount}条报警, ${patientCompareCount}条比对, 报告${reportCount > 0 ? '1' : '0'}份`);
  }

  const [stats] = await conn.query('SELECT status, COUNT(*) as cnt FROM alerts GROUP BY status');
  console.log(`\n总结果: ${alertCount}条报警 | ${compareCount}条比对 | ${reportCount}份报告`);
  console.log('报警状态分布:');
  stats.forEach(s => console.log(`  ${s.status}: ${s.cnt} 条`));
  await conn.end();
}

seed().catch(err => { console.error('失败:', err.message); process.exit(1); });

