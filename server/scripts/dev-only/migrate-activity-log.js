/**
 * Buat tabel activity_log untuk mencatat aktivitas siswa saat assessment.
 * Jalankan: node server/scripts/dev-only/migrate-activity-log.js
 */
const pool = require('../../db');

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      hasil_id    INT NOT NULL,
      jenis       VARCHAR(50) NOT NULL,
      waktu       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      keterangan  VARCHAR(255),
      FOREIGN KEY (hasil_id) REFERENCES hasil_assessment(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✓ Tabel activity_log siap.');
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
