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
  
  // 0. 重置所有测试账号（删除后重建，确保密码正确）
  const baseUsers = [
    { user_id: 'U001', username: 'doctor01', password: '123456', role: 'doctor', real_name: '张医生' },
    { user_id: 'U002', username: 'nurse01', password: '123456', role: 'nurse', real_name: '李护士' },
    { user_id: 'U011', username: 'patient01', password: '123456', role: 'patient', real_name: '张三' }
  ];
  
  for (const user of baseUsers) {
    try {
      // 先删除已存在的用户
      await User.destroy({ where: { username: user.username } });
      // 重新创建（密码会在 beforeCreate 钩子中自动哈希）
      await User.create({
        ...user,
        status: 'active'
      });
      console.log(`✓ 重置测试账号: ${user.username}`);
    } catch (e) {
      console.log(`- 测试账号 ${user.username} 操作失败: ${e.message}`);
    }
  }
  
  // 1. 添加更多医生用户
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
          status: 'active'
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
          status: 'active'
        }
      });
      if (created) {
        console.log(`✓ 添加护士用户: ${user.username}`);
      }
    } catch (e) {
      console.log(`- 护士用户 ${user.username} 已存在`);
    }
  }
  
  // 3. 添加患者记录（P001-P010，bed_number 统一格式：X区-XXX床）
  const patients = [
    { patient_id: 'P001', name: '张三', gender: 'M', age: 30, bed_number: 'A区-101床', admission_date: new Date('2026-05-01'), status: 'admitted', attending_doctor_id: 'U001' },
    { patient_id: 'P002', name: '李四', gender: 'M', age: 50, bed_number: 'A区-102床', admission_date: new Date('2026-05-05'), status: 'admitted', attending_doctor_id: 'U001' },
    { patient_id: 'P003', name: '王五', gender: 'M', age: 55, bed_number: 'A区-103床', admission_date: new Date('2026-05-08'), status: 'admitted', attending_doctor_id: 'U001' },
    { patient_id: 'P004', name: '赵六', gender: 'F', age: 42, bed_number: 'B区-201床', admission_date: new Date('2026-05-10'), status: 'admitted', attending_doctor_id: 'U003' },
    { patient_id: 'P005', name: '孙七', gender: 'M', age: 48, bed_number: 'B区-202床', admission_date: new Date('2026-05-12'), status: 'admitted', attending_doctor_id: 'U003' },
    { patient_id: 'P006', name: '赵丽', gender: 'F', age: 45, bed_number: 'C区-306床', admission_date: new Date('2026-05-15'), status: 'admitted', attending_doctor_id: 'U003' },
    { patient_id: 'P007', name: '钱明', gender: 'M', age: 62, bed_number: 'C区-307床', admission_date: new Date('2026-05-18'), status: 'admitted', attending_doctor_id: 'U003' },
    { patient_id: 'P008', name: '孙华', gender: 'F', age: 35, bed_number: 'D区-401床', admission_date: new Date('2026-05-19'), status: 'admitted', attending_doctor_id: 'U004' },
    { patient_id: 'P009', name: '周强', gender: 'M', age: 55, bed_number: 'D区-402床', admission_date: new Date('2026-05-20'), status: 'admitted', attending_doctor_id: 'U004' },
    { patient_id: 'P010', name: '吴芳', gender: 'F', age: 28, bed_number: 'D区-403床', admission_date: new Date('2026-05-20'), status: 'admitted', attending_doctor_id: 'U003' }
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
    { user_id: 'U012', username: 'patient02', password: '123456', role: 'patient', real_name: '李四' },
    { user_id: 'U013', username: 'patient03', password: '123456', role: 'patient', real_name: '王五' },
    { user_id: 'U014', username: 'patient04', password: '123456', role: 'patient', real_name: '赵六' },
    { user_id: 'U015', username: 'patient05', password: '123456', role: 'patient', real_name: '孙七' },
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
          status: 'active'
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
    { threshold_id: 'T001', patient_id: 'P001', pulse_min: 60, pulse_max: 100, temperature_min: 36.0, temperature_max: 37.3, bp_systolic_min: 90, bp_systolic_max: 140, bp_diastolic_min: 60, bp_diastolic_max: 90, effective_time: new Date(), created_by: 'U001' },
    { threshold_id: 'T002', patient_id: 'P002', pulse_min: 60, pulse_max: 100, temperature_min: 36.0, temperature_max: 37.3, bp_systolic_min: 90, bp_systolic_max: 140, bp_diastolic_min: 60, bp_diastolic_max: 90, effective_time: new Date(), created_by: 'U001' },
    { threshold_id: 'T003', patient_id: 'P003', pulse_min: 55, pulse_max: 100, temperature_min: 35.5, temperature_max: 37.5, bp_systolic_min: 85, bp_systolic_max: 150, bp_diastolic_min: 55, bp_diastolic_max: 90, effective_time: new Date(), created_by: 'U001' },
    { threshold_id: 'T004', patient_id: 'P004', pulse_min: 60, pulse_max: 100, temperature_min: 36.0, temperature_max: 37.3, bp_systolic_min: 90, bp_systolic_max: 140, bp_diastolic_min: 60, bp_diastolic_max: 90, effective_time: new Date(), created_by: 'U003' },
    { threshold_id: 'T005', patient_id: 'P005', pulse_min: 60, pulse_max: 100, temperature_min: 36.0, temperature_max: 37.3, bp_systolic_min: 90, bp_systolic_max: 140, bp_diastolic_min: 60, bp_diastolic_max: 90, effective_time: new Date(), created_by: 'U003' },
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
  
  // 6. 添加历史体征数据（所有在院患者 P001-P010）
  const now = Date.now();
  const patientsForVitals = ['P001', 'P002', 'P003', 'P006', 'P007', 'P008', 'P009', 'P010'];
  
  for (const patientId of patientsForVitals) {
    // 每2小时生成一条数据，生成48小时的数据（共25条）
    for (let i = 24; i >= 0; i--) {
      const collectTime = new Date(now - i * 2 * 60 * 60 * 1000);
      
      // 根据患者生成有差异的数据，部分患者有一些异常值
      let basePulse = 65;
      let baseTemp = 36.5;
      let baseSys = 110;
      if (patientId === 'P002') { baseTemp = 37.1; basePulse = 72; } // 李四体温偏高
      if (patientId === 'P006') { basePulse = 58; } // 赵丽脉搏偏低
      if (patientId === 'P007') { baseTemp = 37.0; baseSys = 125; } // 钱明血压偏高
      if (patientId === 'P009') { basePulse = 78; baseSys = 130; } // 周强血压偏高
      
      const pulse = basePulse + Math.floor(Math.random() * 20 - 10);
      const temperature = (baseTemp + Math.random() * 0.8 - 0.4).toFixed(1);
      const systolic = baseSys + Math.floor(Math.random() * 30 - 15);
      const diastolic = 70 + Math.floor(Math.random() * 20 - 10);
      
      try {
        const [vital, created] = await VitalSign.findOrCreate({
          where: { 
            signal_id: `S${now - i * 2000}_${patientId}` 
          },
          defaults: {
            signal_id: `S${now - i * 2000}_${patientId}`,
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
  
  // 7. 添加报警记录（覆盖更多患者）
  const alerts = [
    { alert_id: 'A025', patient_id: 'P001', indicator: 'pulse', alert_level: '一般', alert_content: '脉搏稍高', actual_value: '105', threshold_value: '60-100', status: '已确认', timestamp: new Date(now - 2 * 60 * 60 * 1000) },
    { alert_id: 'A026', patient_id: 'P002', indicator: 'temperature', alert_level: '严重', alert_content: '体温偏高', actual_value: '38.2', threshold_value: '36-37.3', status: '待处理', timestamp: new Date(now - 1 * 60 * 60 * 1000) },
    { alert_id: 'A027', patient_id: 'P003', indicator: 'bloodPressure_systolic', alert_level: '一般', alert_content: '收缩压稍高', actual_value: '148', threshold_value: '90-140', status: '已解除', timestamp: new Date(now - 30 * 60 * 1000) },
    { alert_id: 'A028', patient_id: 'P006', indicator: 'pulse', alert_level: '危急', alert_content: '脉搏过快', actual_value: '125', threshold_value: '60-100', status: '待处理', timestamp: new Date(now - 15 * 60 * 1000) },
    { alert_id: 'A029', patient_id: 'P007', indicator: 'temperature', alert_level: '严重', alert_content: '体温偏高', actual_value: '38.5', threshold_value: '35.5-37.5', status: '待处理', timestamp: new Date(now - 5 * 60 * 1000) },
    { alert_id: 'A030', patient_id: 'P008', indicator: 'pulse', alert_level: '一般', alert_content: '脉搏偏快', actual_value: '108', threshold_value: '60-100', status: '已确认', timestamp: new Date(now - 8 * 60 * 60 * 1000) },
    { alert_id: 'A031', patient_id: 'P009', indicator: 'bloodPressure_systolic', alert_level: '严重', alert_content: '收缩压过高', actual_value: '155', threshold_value: '90-140', status: '待处理', timestamp: new Date(now - 3 * 60 * 60 * 1000) },
    { alert_id: 'A032', patient_id: 'P010', indicator: 'temperature', alert_level: '一般', alert_content: '体温略低', actual_value: '35.8', threshold_value: '36-37.3', status: '已解除', timestamp: new Date(now - 12 * 60 * 60 * 1000) }
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
  
  // 8. 添加病情报告（包含趋势数据和异常事件）
  // now 已在上方定义
  const reportConfigs = [
    { report_id: 'R025', patient_id: 'P001', name: '张三', trend: { pulse: [72, 75, 68, 80, 74, 76, 70, 78, 73, 71, 75, 69], temperature: [36.5, 36.6, 36.4, 36.7, 36.5, 36.6, 36.5, 36.8, 36.5, 36.4, 36.6, 36.5], bloodPressure: ['110/70', '115/72', '108/68', '112/71', '114/73', '110/69', '109/70', '113/72', '111/71', '110/70', '112/71', '111/70'], timestamps: Array.from({length: 12}, (_, i) => new Date(now - (24 - i * 2) * 60 * 60 * 1000)) }, alerts: [{ time: new Date(now - 4 * 60 * 60 * 1000), indicator: 'pulse', level: '一般', actualValue: '105', thresholdValue: '60-100', status: '已确认' }] },
    { report_id: 'R026', patient_id: 'P002', name: '李四', trend: { pulse: [78, 82, 80, 85, 88, 90, 86, 84, 82, 80, 79, 81], temperature: [36.6, 36.8, 37.0, 37.2, 37.5, 37.8, 38.0, 38.2, 37.9, 37.5, 37.2, 37.0], bloodPressure: ['120/75', '118/74', '122/76', '120/75', '119/74', '121/75', '120/76', '118/74', '119/75', '120/75', '121/76', '120/75'], timestamps: Array.from({length: 12}, (_, i) => new Date(now - (24 - i * 2) * 60 * 60 * 1000)) }, alerts: [{ time: new Date(now - 6 * 60 * 60 * 1000), indicator: 'temperature', level: '严重', actualValue: '38.2', thresholdValue: '36-37.3', status: '待处理' }] },
    { report_id: 'R027', patient_id: 'P003', name: '王五', trend: { pulse: [70, 72, 68, 71, 69, 73, 70, 72, 71, 69, 70, 71], temperature: [36.5, 36.4, 36.6, 36.5, 36.5, 36.7, 36.5, 36.6, 36.5, 36.4, 36.5, 36.5], bloodPressure: ['140/85', '142/86', '138/84', '140/85', '139/84', '141/85', '140/86', '138/85', '140/84', '139/85', '140/85', '141/86'], timestamps: Array.from({length: 12}, (_, i) => new Date(now - (24 - i * 2) * 60 * 60 * 1000)) }, alerts: [{ time: new Date(now - 8 * 60 * 60 * 1000), indicator: 'bloodPressure_systolic', level: '一般', actualValue: '148', thresholdValue: '90-140', status: '已解除' }] },
    { report_id: 'R028', patient_id: 'P006', name: '赵丽', trend: { pulse: [55, 58, 60, 62, 59, 57, 61, 60, 58, 59, 60, 58], temperature: [36.2, 36.3, 36.4, 36.5, 36.3, 36.4, 36.5, 36.3, 36.4, 36.5, 36.4, 36.3], bloodPressure: ['105/68', '108/70', '106/69', '107/68', '106/70', '105/69', '107/70', '106/68', '105/69', '107/70', '106/69', '105/68'], timestamps: Array.from({length: 12}, (_, i) => new Date(now - (24 - i * 2) * 60 * 60 * 1000)) }, alerts: [{ time: new Date(now - 10 * 60 * 60 * 1000), indicator: 'pulse', level: '危急', actualValue: '125', thresholdValue: '60-100', status: '待处理' }] },
    { report_id: 'R029', patient_id: 'P007', name: '钱明', trend: { pulse: [72, 74, 76, 78, 80, 82, 84, 86, 84, 82, 80, 78], temperature: [36.8, 37.0, 37.2, 37.4, 37.6, 37.8, 38.0, 38.5, 38.2, 37.8, 37.5, 37.2], bloodPressure: ['130/80', '132/81', '131/80', '133/82', '130/81', '132/80', '131/82', '130/80', '131/81', '132/82', '130/80', '131/81'], timestamps: Array.from({length: 12}, (_, i) => new Date(now - (24 - i * 2) * 60 * 60 * 1000)) }, alerts: [{ time: new Date(now - 4 * 60 * 60 * 1000), indicator: 'temperature', level: '严重', actualValue: '38.5', thresholdValue: '35.5-37.5', status: '待处理' }] },
    { report_id: 'R030', patient_id: 'P008', name: '孙华', trend: { pulse: [68, 70, 72, 74, 76, 75, 73, 71, 70, 69, 70, 71], temperature: [36.4, 36.5, 36.6, 36.5, 36.7, 36.5, 36.6, 36.5, 36.4, 36.5, 36.6, 36.5], bloodPressure: ['112/72', '114/73', '113/72', '115/74', '112/73', '113/72', '114/73', '112/72', '113/73', '114/72', '113/73', '112/72'], timestamps: Array.from({length: 12}, (_, i) => new Date(now - (24 - i * 2) * 60 * 60 * 1000)) }, alerts: [{ time: new Date(now - 12 * 60 * 60 * 1000), indicator: 'pulse', level: '一般', actualValue: '108', thresholdValue: '60-100', status: '已确认' }] },
    { report_id: 'R031', patient_id: 'P009', name: '周强', trend: { pulse: [75, 78, 80, 82, 79, 77, 80, 83, 81, 79, 78, 80], temperature: [36.6, 36.7, 36.5, 36.6, 36.8, 36.7, 36.6, 36.5, 36.7, 36.6, 36.5, 36.6], bloodPressure: ['128/78', '130/80', '132/81', '135/82', '138/84', '140/85', '142/86', '145/88', '140/85', '138/84', '135/82', '132/80'], timestamps: Array.from({length: 12}, (_, i) => new Date(now - (24 - i * 2) * 60 * 60 * 1000)) }, alerts: [{ time: new Date(now - 6 * 60 * 60 * 1000), indicator: 'bloodPressure_systolic', level: '严重', actualValue: '155', thresholdValue: '90-140', status: '待处理' }] },
    { report_id: 'R032', patient_id: 'P010', name: '吴芳', trend: { pulse: [65, 67, 66, 68, 70, 69, 67, 66, 68, 67, 66, 67], temperature: [36.2, 36.0, 35.9, 35.8, 36.0, 36.1, 36.2, 36.0, 35.9, 36.1, 36.2, 36.1], bloodPressure: ['108/68', '110/70', '109/69', '108/68', '110/69', '109/70', '108/68', '110/70', '109/69', '108/68', '110/70', '109/69'], timestamps: Array.from({length: 12}, (_, i) => new Date(now - (24 - i * 2) * 60 * 60 * 1000)) }, alerts: [{ time: new Date(now - 14 * 60 * 60 * 1000), indicator: 'temperature', level: '一般', actualValue: '35.8', thresholdValue: '36-37.3', status: '已解除' }] }
  ];
  
  for (const cfg of reportConfigs) {
    try {
      const startTime = cfg.trend.timestamps[0];
      const endTime = cfg.trend.timestamps[cfg.trend.timestamps.length - 1];
      const pulseAvg = (cfg.trend.pulse.reduce((a, b) => a + b, 0) / cfg.trend.pulse.length).toFixed(1);
      const tempAvg = (cfg.trend.temperature.reduce((a, b) => a + parseFloat(b), 0) / cfg.trend.temperature.length).toFixed(1);
      
      let contentLines = [
        `患者姓名：${cfg.name}`,
        `报告时间范围：${startTime.toLocaleString()} 至 ${endTime.toLocaleString()}`,
        '',
        '【生命体征统计】',
        `  脉搏：平均${pulseAvg}次/分钟，范围${Math.min(...cfg.trend.pulse)}-${Math.max(...cfg.trend.pulse)}次/分钟`,
        `  体温：平均${tempAvg}°C，范围${Math.min(...cfg.trend.temperature.map(Number)).toFixed(1)}-${Math.max(...cfg.trend.temperature.map(Number)).toFixed(1)}°C`,
        `  共采集${cfg.trend.pulse.length}条生理信号记录`,
        '',
        `【异常事件】共${cfg.alerts.length}次`,
        ...cfg.alerts.map((a, i) => `  ${i + 1}. ${new Date(a.time).toLocaleString()} - ${a.level} - ${a.indicator}异常（实际值：${a.actualValue}）`)
      ];
      
      const [r, created] = await MedicalReport.findOrCreate({
        where: { report_id: cfg.report_id },
        defaults: {
          report_id: cfg.report_id,
          patient_id: cfg.patient_id,
          title: `患者${cfg.name}病情监测报告`,
          content: contentLines.join('\n'),
          trend_data: cfg.trend,
          abnormal_events: cfg.alerts,
          start_time: startTime,
          end_time: endTime,
          create_time: new Date(now - 2 * 60 * 60 * 1000),
          version: '1.0'
        }
      });
      if (created) {
        console.log(`✓ 添加病情报告: ${cfg.report_id}`);
      }
    } catch (e) {
      console.log(`- 报告 ${cfg.report_id} 添加失败: ${e.message}`);
    }
  }
  
  // 9. 修正已有患者的 bed_number 格式
  const bedUpdates = [
    { patient_id: 'P001', bed_number: 'A区-101床' },
    { patient_id: 'P002', bed_number: 'A区-102床' },
    { patient_id: 'P003', bed_number: 'A区-103床' },
    { patient_id: 'P004', bed_number: 'B区-201床' },
    { patient_id: 'P005', bed_number: 'B区-202床' },
    { patient_id: 'P006', bed_number: 'C区-306床' },
    { patient_id: 'P007', bed_number: 'C区-307床' },
    { patient_id: 'P008', bed_number: 'D区-401床' },
    { patient_id: 'P009', bed_number: 'D区-402床' },
    { patient_id: 'P010', bed_number: 'D区-403床' }
  ];
  
  for (const update of bedUpdates) {
    try {
      await Patient.update(
        { bed_number: update.bed_number },
        { where: { patient_id: update.patient_id } }
      );
      console.log(`✓ 更新床位号: ${update.patient_id} -> ${update.bed_number}`);
    } catch (e) {
      console.log(`- 更新床位号失败: ${update.patient_id}`);
    }
  }
  
  // 10. 为已有报告补充 trend_data 和 abnormal_events
  const reportUpdates = [
    { report_id: 'R025', trend_data: reportConfigs[0].trend, abnormal_events: reportConfigs[0].alerts },
    { report_id: 'R026', trend_data: reportConfigs[1].trend, abnormal_events: reportConfigs[1].alerts },
    { report_id: 'R027', trend_data: reportConfigs[2].trend, abnormal_events: reportConfigs[2].alerts },
    { report_id: 'R028', trend_data: reportConfigs[3].trend, abnormal_events: reportConfigs[3].alerts },
    { report_id: 'R029', trend_data: reportConfigs[4].trend, abnormal_events: reportConfigs[4].alerts }
  ];
  
  for (const update of reportUpdates) {
    try {
      await MedicalReport.update(
        { trend_data: update.trend_data, abnormal_events: update.abnormal_events },
        { where: { report_id: update.report_id } }
      );
      console.log(`✓ 更新报告趋势数据: ${update.report_id}`);
    } catch (e) {
      console.log(`- 更新报告失败: ${update.report_id}: ${e.message}`);
    }
  }
  
  console.log('\n演示数据添加完成！');
};

updateDatabase();
