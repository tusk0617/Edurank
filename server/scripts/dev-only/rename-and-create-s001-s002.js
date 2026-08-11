/**
 * Rename S001→S101, S002→S102, lalu buat user baru S001 & S002.
 * Jalankan: node server/scripts/dev-only/rename-and-create-s001-s002.js
 */
const pool = require('../../db');
const bcrypt = require('bcryptjs');

async function run() {
  // Rename
  const [r1] = await pool.query("UPDATE users SET username='S101' WHERE username='S001'");
  console.log(`S001 → S101: ${r1.affectedRows} row`);

  const [r2] = await pool.query("UPDATE users SET username='S102' WHERE username='S002'");
  console.log(`S002 → S102: ${r2.affectedRows} row`);

  // Buat S001 & S002 baru
  const hash = await bcrypt.hash('password123', 10);

  const newUsers = [
    { username: 'S001', nama: 'Siswa S001' },
    { username: 'S002', nama: 'Siswa S002' },
  ];

  for (const u of newUsers) {
    const [res] = await pool.query(
      'INSERT IGNORE INTO users (username, nama, password, role) VALUES (?, ?, ?, ?)',
      [u.username, u.nama, hash, 'siswa']
    );
    console.log(`Buat ${u.username}: ${res.affectedRows === 1 ? 'berhasil' : 'sudah ada'}`);
  }

  console.log('\nSelesai.');
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
