const pool = require('./db');

async function migrate() {
  // jawaban_siswa — tanpa FK agar kompatibel di semua konfigurasi MySQL
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jawaban_siswa (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      hasil_id        INT NOT NULL,
      soal_id         INT NOT NULL,
      jawaban_dipilih VARCHAR(1),
      benar           TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // activity_log
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      hasil_id  INT NOT NULL,
      jenis     VARCHAR(50),
      keterangan TEXT,
      waktu     DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Ubah status dari ENUM ke VARCHAR agar bisa pakai nilai 'berlangsung'/'selesai'
  try {
    await pool.query(`ALTER TABLE hasil_assessment MODIFY COLUMN status VARCHAR(20) DEFAULT 'berlangsung'`);
  } catch (e) { /* abaikan jika sudah VARCHAR */ }

  // Tabel log keluar aplikasi (structured exit timing)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS log_keluar_aplikasi (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      hasil_id            INT NOT NULL,
      waktu_keluar        DATETIME NOT NULL,
      waktu_kembali       DATETIME NULL,
      durasi_diluar_detik INT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Kolom tambahan di hasil_assessment
  const haColumns = [
    { col: 'percobaan_ke',   sql: 'ADD COLUMN percobaan_ke INT DEFAULT 1' },
    { col: 'terlambat',      sql: 'ADD COLUMN terlambat TINYINT(1) DEFAULT 0' },
    { col: 'jumlah_keluar',  sql: 'ADD COLUMN jumlah_keluar INT DEFAULT 0' },
  ];
  for (const { col, sql } of haColumns) {
    try {
      await pool.query(`ALTER TABLE hasil_assessment ${sql}`);
    } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
  }

  // Kolom bobot_poin di soal (mungkin belum ada di DB lama)
  try {
    await pool.query('ALTER TABLE soal ADD COLUMN bobot_poin INT DEFAULT 1');
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

  // Kolom max_retake di assessment
  try {
    await pool.query('ALTER TABLE assessment ADD COLUMN max_retake INT DEFAULT 1');
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

  console.log('✓ Migration OK');
}

module.exports = migrate;
