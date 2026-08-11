/**
 * Hapus semua hasil_assessment milik user G001.
 * Jalankan sekali: node server/scripts/dev-only/delete-g001-results.js
 */
const pool = require('../../db');

async function run() {
  const [[g001]] = await pool.query(
    'SELECT id FROM users WHERE username = ?', ['G001']
  );
  if (!g001) {
    console.log('User G001 tidak ditemukan.');
    process.exit(0);
  }

  const userId = g001.id;

  // Hapus jawaban dulu (FK constraint)
  const [jawaban] = await pool.query(
    'DELETE js FROM jawaban_siswa js JOIN hasil_assessment ha ON js.hasil_id = ha.id WHERE ha.user_id = ?',
    [userId]
  );
  console.log(`Deleted ${jawaban.affectedRows} jawaban rows`);

  // Hapus hasil
  const [hasil] = await pool.query(
    'DELETE FROM hasil_assessment WHERE user_id = ?', [userId]
  );
  console.log(`Deleted ${hasil.affectedRows} hasil_assessment rows`);

  console.log('Selesai. Data ujian G001 sudah dihapus.');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
