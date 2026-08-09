// ============================================================
// Seed kode responden: S001-S030 dan G001-G035
// Password default: password123
// Jalankan: node seed-responden.js
// ============================================================

require('dotenv').config({ path: '../../.env' });
const bcrypt = require('bcryptjs');
const pool = require('../../db');

async function seed() {
  const hash = await bcrypt.hash('password123', 10);

  const codes = [
    ...Array.from({ length: 30 }, (_, i) => `S${String(i + 1).padStart(3, '0')}`),
    ...Array.from({ length: 35 }, (_, i) => `G${String(i + 1).padStart(3, '0')}`),
  ];

  let inserted = 0;
  let skipped = 0;

  for (const code of codes) {
    const nama = `Siswa ${code}`;
    try {
      const [result] = await pool.query(
        'INSERT IGNORE INTO users (username, nama, password, role) VALUES (?, ?, ?, ?)',
        [code, nama, hash, 'siswa']
      );
      if (result.affectedRows > 0) {
        inserted++;
        console.log(`✓ Dibuat: ${code}`);
      } else {
        skipped++;
        console.log(`— Skip (sudah ada): ${code}`);
      }
    } catch (err) {
      console.error(`✗ Error ${code}:`, err.message);
    }
  }

  console.log(`\nSelesai: ${inserted} dibuat, ${skipped} dilewati.`);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
