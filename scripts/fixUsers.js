const mysql = require('mysql2/promise');
const bcrypt = require('../backend/node_modules/bcryptjs');

async function fix() {
  const c = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'rjgc'
  });

  const hash = bcrypt.hashSync('123456', 10);
  console.log('New hash:', hash);

  await c.query(
    "UPDATE users SET password = ?, status = 'active', login_attempts = 0, lock_until = NULL WHERE username IN ('doctor001', 'doctor002', 'nurse001', 'nurse002', 'patient001', 'patient002')",
    [hash]
  );

  const [r] = await c.query("SELECT username, status, login_attempts FROM users");
  console.log('Updated users:', r);

  c.end();
}

fix().catch(e => console.log('Error:', e.message));
