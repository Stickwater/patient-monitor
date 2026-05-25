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

    // 3. 插入用户数据
    const insertUsers = `
INSERT INTO users (user_id, username, password, role, real_name, phone, department, status) VALUES
('U2024001', 'doctor01', '${hash}', 'doctor', '张医生', '13800138001', '心内科', 'active'),
('U2024002', 'nurse01', '${hash}', 'nurse', '王护士', '13800138003', '心内科', 'active'),
('U2024003', 'patient01', '${hash}', 'patient', '患者张三', '13800138005', NULL, 'active');
`;

    sql += '\n' + insertUsers;

    // 4. 执行 SQL
    console.log('执行 SQL 初始化...\n');
    await connection.query(sql);

    console.log('数据库初始化成功！');
    console.log('数据库: rjgc');
    console.log('表: users, patients, vital_signs, thresholds, alerts, patient_logs, medical_reports, compare_results');
    console.log('\n测试账号（密码均为 123456）:');
    console.log('  doctor01   - 医生（张医生，心内科）');
    console.log('  nurse01    - 护士（王护士，心内科）');
    console.log('  patient01  - 患者（患者张三）');

  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

initDatabase().catch(console.error);
