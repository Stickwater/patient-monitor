const mysql = require('mysql2/promise');

async function check() {
  const c = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'rjgc'
  });
  const [r] = await c.query("SELECT username, status, login_attempts, lock_until FROM users WHERE username='doctor001'");
  console.log('User:', r[0]);
  c.end();
}

check().catch(e => console.log('Error:', e.message));
