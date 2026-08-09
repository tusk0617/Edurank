// ============================================================
// Seed kode responden: S001-S035 (siswa) dan G001-G010 (guru)
// Password default: password123
// Jalankan: node seed-responden.js
// ============================================================

require('dotenv').config({ path: '../../.env' });
const bcrypt = require('bcryptjs');
const pool = require('../../db');

async function seed() {
  const hash = await bcrypt.hash('password123', 10);

  const entries = [
    ...Array.from({ length: 35 }, (_, i) => ({ code: `S${String(i + 1).padStart(3, '0')}`, role: 'siswa' })),
    ...Array.from({ length: 10 }, (_, i) => ({ code: `G${String(i + 1).padStart(3, '0')}`, role: 'guru' })),
  ];

  let inserted = 0;
  let skipped = 0;

  for (const { code, role } of entries) {
    const nama = `${role === 'guru' ? 'Guru' : 'Siswa'} ${code}`;
    try {
      const [result] = await pool.query(
        'INSERT IGNORE INTO users (username, nama, password, role) VALUES (?, ?, ?, ?)',
        [code, nama, hash, role]
      );
      if (result.affectedRows > 0) {
        inserted++;
        console.log(`✓ Dibuat: ${code} (${role})`);
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
