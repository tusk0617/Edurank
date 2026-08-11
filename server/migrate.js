const pool = require('./db');

async function migrate() {
  // jawaban_siswa
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jawaban_siswa (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      hasil_id        INT NOT NULL,
      soal_id         INT NOT NULL,
      jawaban_dipilih VARCHAR(1),
      benar           TINYINT(1) DEFAULT 0,
      FOREIGN KEY (hasil_id) REFERENCES hasil_assessment(id) ON DELETE CASCADE,
      FOREIGN KEY (soal_id)  REFERENCES soal(id)             ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Kolom status di hasil_assessment
  try {
    await pool.query(`ALTER TABLE hasil_assessment ADD COLUMN status VARCHAR(20) DEFAULT 'berlangsung'`);
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

  // Kolom percobaan_ke
  try {
    await pool.query(`ALTER TABLE hasil_assessment ADD COLUMN percobaan_ke INT DEFAULT 1`);
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

  // Kolom terlambat
  try {
    await pool.query(`ALTER TABLE hasil_assessment ADD COLUMN terlambat TINYINT(1) DEFAULT 0`);
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

  console.log('✓ Migration OK');
}

module.exports = migrate;
