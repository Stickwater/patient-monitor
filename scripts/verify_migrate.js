const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // 检查patients表结构
  const [cols] = await conn.query("SHOW COLUMNS FROM patients LIKE 'medical_history'");
  console.log('patients.medical_history 字段:', cols.length > 0 ? '已存在' : '不存在');

  const [cols2] = await conn.query("SHOW COLUMNS FROM patients LIKE 'allergy'");
  console.log('patients.allergy 字段:', cols2.length > 0 ? '已存在' : '不存在');

  // 检查treatment_advice表
  const [tables] = await conn.query("SHOW TABLES LIKE 'treatment_advice'");
  console.log('treatment_advice 表:', tables.length > 0 ? '已创建' : '未创建');

  // 检查测试数据
  const [rows] = await conn.query("SELECT patient_id, name, medical_history, allergy FROM patients WHERE patient_id IN ('P001','P002')");
  for (const r of rows) {
    console.log(`${r.patient_id} ${r.name}: 病史=${r.medical_history}, 过敏=${r.allergy}`);
  }

  await conn.end();
  console.log('\n验证完成');
}

main().catch(err => {
  console.error('验证失败:', err.message);
  process.exit(1);
});
