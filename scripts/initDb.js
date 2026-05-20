// 数据库初始化脚本
// 运行: node scripts/initDb.js

const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  console.log('开始初始化数据库...');
  
  // 连接MySQL服务器（不指定数据库）
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    multipleStatements: true
  });

  try {
    // 读取SQL文件
    const sqlPath = path.join(__dirname, '../sql/init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // 执行SQL
    await connection.query(sql);
    
    console.log('✅ 数据库初始化成功！');
    console.log('数据库: rjgc');
    console.log('表结构已创建: users, patients, vital_signs, thresholds, alerts, patient_logs, medical_reports, compare_results');
    console.log('测试数据已导入');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

initDatabase().catch(console.error);
