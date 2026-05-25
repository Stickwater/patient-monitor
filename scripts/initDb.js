// 数据库初始化脚本
// 运行: node scripts/initDb.js (需在 backend/ 目录下执行)
const fs = require('fs');
const path = require('path');

// 从 backend/node_modules 加载依赖
module.paths.unshift(path.join(__dirname, '..', 'backend', 'node_modules'));

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDatabase() {
  console.log('=== 患者监护系统 - 数据库初始化 ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    multipleStatements: true
  });

  try {
    // 1. 读取 init.sql 并执行建表 + 种子数据（不含 users 的 INSERT）
    const sqlPath = path.join(__dirname, '../sql/init.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // 2. 运行时生成正确的 bcrypt 哈希
    console.log('生成密码哈希...');
    const hash = await bcrypt.hash('123456', 10);
    console.log('密码哈希: ' + hash);

    // 3. 插入用户数据（4医生 + 4护士 + 4患者 = 12账号）
    const insertUsers = `
INSERT INTO users (user_id, username, password, role, real_name, phone, department, status) VALUES
-- 医生（4人，4个科室）
('U2024001', 'doctor01', '${hash}', 'doctor', '张医生', '13800138001', '心内科', 'active'),
('U2024002', 'doctor02', '${hash}', 'doctor', '李医生', '13800138002', '呼吸科', 'active'),
('U2024003', 'doctor03', '${hash}', 'doctor', '刘医生', '13800138003', '神经内科', 'active'),
('U2024004', 'doctor04', '${hash}', 'doctor', '陈医生', '13800138004', '骨科', 'active'),
-- 护士（4人）
('U2024101', 'nurse01', '${hash}', 'nurse', '王护士', '13800138101', '心内科', 'active'),
('U2024102', 'nurse02', '${hash}', 'nurse', '赵护士', '13800138102', '呼吸科', 'active'),
('U2024103', 'nurse03', '${hash}', 'nurse', '孙护士', '13800138103', '神经内科', 'active'),
('U2024104', 'nurse04', '${hash}', 'nurse', '钱护士', '13800138104', '骨科', 'active'),
-- 患者账号（前4位患者可登录查看自身数据）
('U2024201', 'patient01', '${hash}', 'patient', '张三', '13800138201', NULL, 'active'),
('U2024202', 'patient02', '${hash}', 'patient', '李四', '13800138202', NULL, 'active'),
('U2024203', 'patient03', '${hash}', 'patient', '王五', '13800138203', NULL, 'active'),
('U2024204', 'patient04', '${hash}', 'patient', '赵六', '13800138204', NULL, 'active');
`;

    sql += '\n' + insertUsers;

    // 4. 执行 SQL
    console.log('执行 SQL 初始化...\n');
    await connection.query(sql);

    console.log('数据库初始化成功！');
    console.log('数据库: rjgc');
    console.log('表: users, patients, vital_signs, thresholds, alerts, patient_logs, medical_reports, compare_results, treatment_advice');
    console.log('\n测试账号（密码均为 123456）:');
    console.log('  医生: doctor01/02/03/04（心内科/呼吸科/神经内科/骨科）');
    console.log('  护士: nurse01/02/03/04');
    console.log('  患者: patient01/02/03/04');
    console.log('\n共14名住院患者，覆盖心内科5人、呼吸科3人、神经内科3人、骨科3人');

  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

initDatabase().catch(console.error);
