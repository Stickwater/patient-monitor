// 数据库更新脚本 - 添加 create_time 字段并添加演示数据
const { sequelize, setupAssociations } = require('../models');
const { Patient, User, Threshold, VitalSign, Alert, MedicalReport, CompareResult, PatientLog } = require('../models');
const bcrypt = require('bcryptjs');

const updateDatabase = async () => {
  try {
    console.log('开始数据库更新...');
    
    // 连接数据库
    setupAssociations();
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 添加 create_time 字段（如果不存在）
    try {
      await sequelize.query(`
        ALTER TABLE medical_reports 
        ADD COLUMN IF NOT EXISTS create_time DATETIME DEFAULT NULL
      `);
      console.log('✓ medical_reports.create_time 字段已添加');
    } catch (err) {
      // MySQL 不支持 IF NOT EXISTS，尝试直接添加
      try {
        await sequelize.query(`
          ALTER TABLE medical_reports ADD COLUMN create_time DATETIME DEFAULT NULL
        `);
        console.log('✓ medical_reports.create_time 字段已添加');
      } catch (e) {
        if (e.message.includes('Duplicate')) {
          console.log('- medical_reports.create_time 字段已存在');
        } else {
          console.log('- 添加字段时出错:', e.message);
        }
      }
    }
    
    // 为现有报告添加 create_time
    await sequelize.query(`
      UPDATE medical_reports SET create_time = COALESCE(create_time, start_time, NOW()) WHERE create_time IS NULL
    `);
    console.log('✓ 现有报告的 create_time 已更新');
    
    // 添加更多演示数据
    await addDemoData();
    
    console.log('\n数据库更新完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库更新失败:', error);
    process.exit(1);
  }
};

// 添加演示数据
const addDemoData = async () => {
  console.log('\n开始添加演示数据...');
  
  // 1. 添加更多患者用户（医生）
  const doctorUsers = [
    { user_id: 'U003', username: 'doctor03', password: '123456', role: 'doctor', real_name: '孙主任' },
    { user_id: 'U004', username: 'doctor04', password: '123456', role: 'doctor', real_name: '周医生' }
  ];
  
  for (const user of doctorUsers) {
    try {
      const [u, created] = await User.findOrCreate({
        where: { username: user.username },
        defaults: {
          ...user,
          password: await bcrypt.hash(user.password, 10)
        }
      });
      if (created) {
        console.log(`✓ 添加医生用户: ${user.username}`);
      }
    } catch (e) {
      console.log(`- 医生用户 ${user.username} 已存在`);
    }
  }
  
  // 2. 添加更多护士用户
  const nurseUsers = [
    { user_id: 'U004', username: 'nurse04', password: '123456', role: 'nurse', real_name: '郑护士' },
    { user_id: 'U005', username: 'nurse05', password: '123456', role: 'nurse', real_name: '冯护士' }
  ];
  
  for (const user of nurseUsers) {
    try {
      const [u, created] = await User.findOrCreate({
        where: { username: user.username },
        defaults: {
          ...user,
          password: await bcrypt.hash(user.password, 10)
        }
      });
      if (created) {
        console.log(`✓ 添加护士用户: ${user.username}`);
      }
    } catch (e) {
      console.log(`- 护士用户 ${user.username} 已存在`);
    }
  }
  
  // 3. 添加更多患者
  const patients = [
    { patient_id: 'P006', name: '赵丽', gender: 'F', age: 45, bed_number: '3-6', admission_date: new Date('2026-05-15'), status: 'admitted', attending_doctor_id: 'U003' },
    { patient_id: 'P007', name: '钱明', gender: 'M', age: 62, bed_number: '3-7', admission_date: new Date('2026-05-18'), status: 'admitted', attending_doctor_id: 'U003' },
    { patient_id: 'P008', name: '孙华', gender: 'F', age: 35, bed_number: '4-1', admission_date: new Date('2026-05-19'), status: 'admitted', attending_doctor_id: 'U004' },
    { patient_id: 'P009', name: '周强', gender: 'M', age: 55, bed_number: '4-2', admission_date: new Date('2026-05-20'), status: 'admitted', attending_doctor_id: 'U004' },
    { patient_id: 'P010', name: '吴芳', gender: 'F', age: 28, bed_number: '4-3', admission_date: new Date('2026-05-20'), status: 'admitted', attending_doctor_id: 'U003' }
  ];
  
  for (const patient of patients) {
    try {
      const [p, created] = await Patient.findOrCreate({
        where: { patient_id: patient.patient_id },
        defaults: patient
      });
      if (created) {
        console.log(`✓ 添加患者: ${p.name}`);
      }
    } catch (e) {
      console.log(`- 患者 ${patient.name} 添加失败: ${e.message}`);
    }
  }
  
  // 4. 添加患者对应的用户账号
  const patientUsers = [
    { user_id: 'U006', username: 'patient06', password: '123456', role: 'patient', real_name: '赵丽' },
    { user_id: 'U007', username: 'patient07', password: '123456', role: 'patient', real_name: '钱明' },
    { user_id: 'U008', username: 'patient08', password: '123456', role: 'patient', real_name: '孙华' },
    { user_id: 'U009', username: 'patient09', password: '123456', role: 'patient', real_name: '周强' },
    { user_id: 'U010', username: 'patient10', password: '123456', role: 'patient', real_name: '吴芳' }
  ];
  
  for (const user of patientUsers) {
    try {
      const [u, created] = await User.findOrCreate({
        where: { username: user.username },
        defaults: {
          ...user,
          password: await bcrypt.hash(user.password, 10)
        }
      });
      if (created) {
        console.log(`✓ 添加用户账号: ${user.username}`);
      }
    } catch (e) {
      console.log(`- 用户账号 ${user.username} 已存在`);
    }
  }
  
  // 5. 添加阈值配置
  const thresholds = [
    { threshold_id: 'T006', patient_id: 'P006', pulse_min: 60, pulse_max: 100, temperature_min: 36.0, temperature_max: 37.3, bp_systolic_min: 90, bp_systolic_max: 140, bp_diastolic_min: 60, bp_diastolic_max: 90, effective_time: new Date(), created_by: 'U003' },
    { threshold_id: 'T007', patient_id: 'P007', pulse_min: 55, pulse_max: 100, temperature_min: 35.5, temperature_max: 37.5, bp_systolic_min: 85, bp_systolic_max: 150, bp_diastolic_min: 55, bp_diastolic_max: 90, effective_time: new Date(), created_by: 'U003' },
    { threshold_id: 'T008', patient_id: 'P008', pulse_min: 60, pulse_max: 100, temperature_min: 36.0, temperature_max: 37.3, bp_systolic_min: 90, bp_systolic_max: 140, bp_diastolic_min: 60, bp_diastolic_max: 90, effective_time: new Date(), created_by: 'U004' },
    { threshold_id: 'T009', patient_id: 'P009', pulse_min: 55, pulse_max: 100, temperature_min: 35.5, temperature_max: 37.5, bp_systolic_min: 85, bp_systolic_max: 150, bp_diastolic_min: 55, bp_diastolic_max: 90, effective_time: new Date(), created_by: 'U004' },
    { threshold_id: 'T010', patient_id: 'P010', pulse_min: 60, pulse_max: 100, temperature_min: 36.0, temperature_max: 37.3, bp_systolic_min: 90, bp_systolic_max: 140, bp_diastolic_min: 60, bp_diastolic_max: 90, effective_time: new Date(), created_by: 'U003' }
  ];
  
  for (const threshold of thresholds) {
    try {
      const [t, created] = await Threshold.findOrCreate({
        where: { threshold_id: threshold.threshold_id },
        defaults: threshold
      });
      if (created) {
        console.log(`✓ 添加阈值配置: ${threshold.threshold_id}`);
      }
    } catch (e) {
      console.log(`- 阈值 ${threshold.threshold_id} 添加失败`);
    }
  }
  
  // 6. 添加历史体征数据
  const now = Date.now();
  const patientsForVitals = ['P001', 'P002', 'P003', 'P006', 'P007'];
  
  for (const patientId of patientsForVitals) {
    // 每小时生成一条数据，生成24小时的数据
    for (let i = 24; i >= 0; i--) {
      const collectTime = new Date(now - i * 60 * 60 * 1000);
      
      // 随机生成正常范围内的体征数据
      const pulse = 60 + Math.floor(Math.random() * 30);
      const temperature = (36 + Math.random() * 1.2).toFixed(1);
      const systolic = 100 + Math.floor(Math.random() * 40);
      const diastolic = 60 + Math.floor(Math.random() * 25);
      
      try {
        const [vital, created] = await VitalSign.findOrCreate({
          where: { 
            signal_id: `S${now - i * 1000}_${patientId}` 
          },
          defaults: {
            signal_id: `S${now - i * 1000}_${patientId}`,
            patient_id: patientId,
            pulse,
            temperature,
            blood_pressure: `${systolic}/${diastolic}`,
            collect_time: collectTime
          }
        });
      } catch (e) {
        // 忽略重复插入
      }
    }
    console.log(`✓ 添加体征数据: ${patientId}`);
  }
  
  // 7. 添加一些报警记录
  const alerts = [
    { alert_id: 'A025', patient_id: 'P001', indicator: 'pulse', alert_level: '一般', alert_content: '脉搏稍高', actual_value: '105', threshold_value: '60-100', status: '已确认', timestamp: new Date(now - 2 * 60 * 60 * 1000) },
    { alert_id: 'A026', patient_id: 'P002', indicator: 'temperature', alert_level: '严重', alert_content: '体温偏高', actual_value: '38.2', threshold_value: '36-37.3', status: '待处理', timestamp: new Date(now - 1 * 60 * 60 * 1000) },
    { alert_id: 'A027', patient_id: 'P003', indicator: 'bloodPressure_systolic', alert_level: '一般', alert_content: '收缩压稍高', actual_value: '148', threshold_value: '90-140', status: '已解除', timestamp: new Date(now - 30 * 60 * 1000) },
    { alert_id: 'A028', patient_id: 'P006', indicator: 'pulse', alert_level: '危急', alert_content: '脉搏过快', actual_value: '125', threshold_value: '60-100', status: '待处理', timestamp: new Date(now - 15 * 60 * 1000) },
    { alert_id: 'A029', patient_id: 'P007', indicator: 'temperature', alert_level: '严重', alert_content: '体温偏高', actual_value: '38.5', threshold_value: '35.5-37.5', status: '待处理', timestamp: new Date(now - 5 * 60 * 1000) }
  ];
  
  for (const alert of alerts) {
    try {
      const [a, created] = await Alert.findOrCreate({
        where: { alert_id: alert.alert_id },
        defaults: alert
      });
      if (created) {
        console.log(`✓ 添加报警记录: ${alert.alert_id}`);
      }
    } catch (e) {
      console.log(`- 报警 ${alert.alert_id} 添加失败`);
    }
  }
  
  // 8. 添加更多病情报告
  const reports = [
    { report_id: 'R025', patient_id: 'P001', title: '患者张三病情日报（2026-05-20）', content: '患者张三病情稳定，今日体征数据正常。继续观察治疗。', start_time: new Date('2026-05-20 00:00:00'), end_time: new Date('2026-05-20 23:59:59'), create_time: new Date('2026-05-20 18:00:00'), version: '1.0' },
    { report_id: 'R026', patient_id: 'P002', title: '患者李四病情日报（2026-05-20）', content: '患者李四体温略有升高，已安排检查。', start_time: new Date('2026-05-20 00:00:00'), end_time: new Date('2026-05-20 23:59:59'), create_time: new Date('2026-05-20 18:00:00'), version: '1.0' },
    { report_id: 'R027', patient_id: 'P003', title: '患者王五病情日报（2026-05-20）', content: '患者王五血压已恢复正常，各项指标稳定。', start_time: new Date('2026-05-20 00:00:00'), end_time: new Date('2026-05-20 23:59:59'), create_time: new Date('2026-05-20 18:00:00'), version: '1.0' },
    { report_id: 'R028', patient_id: 'P006', title: '患者赵丽病情日报（2026-05-20）', content: '患者赵丽入院第三天，病情稳定。', start_time: new Date('2026-05-20 00:00:00'), end_time: new Date('2026-05-20 23:59:59'), create_time: new Date('2026-05-20 18:00:00'), version: '1.0' },
    { report_id: 'R029', patient_id: 'P007', title: '患者钱明病情日报（2026-05-20）', content: '患者钱明体温偏高，继续监测。', start_time: new Date('2026-05-20 00:00:00'), end_time: new Date('2026-05-20 23:59:59'), create_time: new Date('2026-05-20 18:00:00'), version: '1.0' }
  ];
  
  for (const report of reports) {
    try {
      const [r, created] = await MedicalReport.findOrCreate({
        where: { report_id: report.report_id },
        defaults: report
      });
      if (created) {
        console.log(`✓ 添加病情报告: ${report.report_id}`);
      }
    } catch (e) {
      console.log(`- 报告 ${report.report_id} 添加失败`);
    }
  }
  
  console.log('\n演示数据添加完成！');
};

updateDatabase();
