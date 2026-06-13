require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function resetPasswords() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('Hash baru:', hash);

  await pool.query('UPDATE users SET password = ?', [hash]);
  console.log('Semua password berhasil direset ke: password123');
  process.exit(0);
}

resetPasswords().catch(err => {
  console.error(err);
  process.exit(1);
});
