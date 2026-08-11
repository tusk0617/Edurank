/**
 * Ganti nama display S101 & S102 agar sesuai dengan username barunya.
 */
const pool = require('../../db');

async function run() {
  const [r1] = await pool.query("UPDATE users SET nama='Siswa S101' WHERE username='S101'");
  console.log(`S101 nama updated: ${r1.affectedRows} row`);

  const [r2] = await pool.query("UPDATE users SET nama='Siswa S102' WHERE username='S102'");
  console.log(`S102 nama updated: ${r2.affectedRows} row`);

  // Verifikasi
  const [rows] = await pool.query(
    "SELECT username, nama FROM users WHERE username IN ('S001','S002','S101','S102') ORDER BY username"
  );
  console.log('\nHasil:');
  rows.forEach(r => console.log(`  ${r.username} → ${r.nama}`));
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
