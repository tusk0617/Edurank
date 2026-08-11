/**
 * Migrasi v2: assessment_soal junction table + nullable modul_id
 * Jalankan: node server/scripts/dev-only/migrate-v2.js
 */
const pool = require('../../db');

async function run() {
  // 1. Buat nullable modul_id di soal dan assessment
  await pool.query('ALTER TABLE soal MODIFY modul_id INT NULL');
  console.log('✓ soal.modul_id → nullable');

  await pool.query('ALTER TABLE assessment MODIFY modul_id INT NULL');
  console.log('✓ assessment.modul_id → nullable');

  // 2. Buat tabel assessment_soal
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assessment_soal (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      assessment_id INT NOT NULL,
      soal_id      INT NOT NULL,
      urutan       INT NOT NULL DEFAULT 1,
      UNIQUE KEY uniq_as (assessment_id, soal_id),
      FOREIGN KEY (assessment_id) REFERENCES assessment(id) ON DELETE CASCADE,
      FOREIGN KEY (soal_id)       REFERENCES soal(id)       ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✓ Tabel assessment_soal dibuat');

  // 3. Seed assessment_soal dari data lama (assessment → modul → soal)
  const [rows] = await pool.query(`
    SELECT a.id AS assessment_id, s.id AS soal_id, s.id AS urutan
    FROM assessment a
    JOIN soal s ON s.modul_id = a.modul_id
    WHERE a.modul_id IS NOT NULL
  `);

  if (rows.length > 0) {
    for (const row of rows) {
      await pool.query(
        'INSERT IGNORE INTO assessment_soal (assessment_id, soal_id, urutan) VALUES (?, ?, ?)',
        [row.assessment_id, row.soal_id, row.urutan]
      );
    }
    console.log(`✓ Seed ${rows.length} baris ke assessment_soal dari data lama`);
  } else {
    console.log('ℹ  Tidak ada data lama untuk di-seed');
  }

  console.log('\nMigrasi v2 selesai.');
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
