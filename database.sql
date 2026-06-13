-- ============================================================
-- FrontSchooler Database Schema
-- Fokus: Pembelajaran Matematika SMA Jakarta Barat
-- ============================================================

CREATE DATABASE IF NOT EXISTS edurank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE edurank;

-- ============================================================
-- TABEL SEKOLAH
-- ============================================================
CREATE TABLE IF NOT EXISTS sekolah (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_sekolah VARCHAR(150) NOT NULL,
  alamat TEXT,
  wilayah VARCHAR(100) DEFAULT 'Jakarta Barat',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABEL USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('siswa','guru','advisor','admin') DEFAULT 'siswa',
  sekolah_id INT,
  foto_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE SET NULL
);

-- ============================================================
-- TABEL MATA PELAJARAN
-- ============================================================
CREATE TABLE IF NOT EXISTS mata_pelajaran (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  warna_hex VARCHAR(10) DEFAULT '#378ADD'
);

-- ============================================================
-- TABEL MODUL
-- ============================================================
CREATE TABLE IF NOT EXISTS modul (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mapel_id INT NOT NULL,
  judul VARCHAR(150) NOT NULL,
  deskripsi TEXT,
  level TINYINT DEFAULT 1 COMMENT '1=Mudah 2=Menengah 3=Sulit',
  urutan INT DEFAULT 1,
  estimasi_menit INT DEFAULT 30,
  xp_reward INT DEFAULT 50,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id)
);

-- ============================================================
-- TABEL MODUL PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS modul_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  modul_id INT NOT NULL,
  status ENUM('terkunci','tersedia','sedang','selesai') DEFAULT 'terkunci',
  persen_selesai INT DEFAULT 0,
  mulai_at TIMESTAMP NULL,
  selesai_at TIMESTAMP NULL,
  UNIQUE KEY uq_user_modul (user_id, modul_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (modul_id) REFERENCES modul(id) ON DELETE CASCADE
);

-- ============================================================
-- TABEL SOAL
-- ============================================================
CREATE TABLE IF NOT EXISTS soal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  modul_id INT NOT NULL,
  pertanyaan TEXT NOT NULL,
  opsi_a TEXT NOT NULL,
  opsi_b TEXT NOT NULL,
  opsi_c TEXT NOT NULL,
  opsi_d TEXT NOT NULL,
  jawaban_benar ENUM('a','b','c','d') NOT NULL,
  bobot_poin INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (modul_id) REFERENCES modul(id) ON DELETE CASCADE
);

-- ============================================================
-- TABEL ASSESSMENT (UJIAN)
-- ============================================================
CREATE TABLE IF NOT EXISTS assessment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  modul_id INT NOT NULL,
  judul VARCHAR(150) NOT NULL,
  durasi_menit INT DEFAULT 30,
  max_retake INT DEFAULT 3,
  nilai_lulus INT DEFAULT 60,
  deadline DATETIME NULL,
  potongan_terlambat DECIMAL(5,2) DEFAULT 5.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (modul_id) REFERENCES modul(id) ON DELETE CASCADE
);

-- ============================================================
-- TABEL HASIL ASSESSMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS hasil_assessment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  assessment_id INT NOT NULL,
  skor DECIMAL(5,2) DEFAULT 0,
  poin_didapat INT DEFAULT 0,
  waktu_mulai TIMESTAMP NULL,
  waktu_selesai TIMESTAMP NULL,
  status ENUM('proses','lulus','remedial','tidak_lulus') DEFAULT 'proses',
  percobaan_ke INT DEFAULT 1,
  terlambat TINYINT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_id) REFERENCES assessment(id) ON DELETE CASCADE
);

-- ============================================================
-- TABEL JAWABAN SISWA
-- ============================================================
CREATE TABLE IF NOT EXISTS jawaban_siswa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hasil_id INT NOT NULL,
  soal_id INT NOT NULL,
  jawaban_dipilih ENUM('a','b','c','d') NOT NULL,
  benar TINYINT DEFAULT 0,
  FOREIGN KEY (hasil_id) REFERENCES hasil_assessment(id) ON DELETE CASCADE,
  FOREIGN KEY (soal_id) REFERENCES soal(id) ON DELETE CASCADE
);

-- ============================================================
-- TABEL BADGE
-- ============================================================
CREATE TABLE IF NOT EXISTS badge (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  ikon_nama VARCHAR(50) DEFAULT 'star',
  warna_hex VARCHAR(10) DEFAULT '#EF9F27'
);

-- ============================================================
-- TABEL USER BADGE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_badge (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_id INT NOT NULL,
  diraih_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_badge (user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badge(id) ON DELETE CASCADE
);

-- ============================================================
-- TABEL POIN LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS poin_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  jumlah INT NOT NULL,
  tipe ENUM('modul','assessment','remedial','bonus') DEFAULT 'assessment',
  keterangan VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- VIEW RANKING INDIVIDU
-- ============================================================
CREATE OR REPLACE VIEW v_ranking_individu AS
SELECT
  u.id AS user_id,
  u.nama,
  s.nama_sekolah AS sekolah,
  s.wilayah,
  COALESCE(SUM(pl.jumlah), 0) AS total_poin,
  RANK() OVER (ORDER BY COALESCE(SUM(pl.jumlah), 0) DESC) AS `rank`
FROM users u
LEFT JOIN sekolah s ON u.sekolah_id = s.id
LEFT JOIN poin_log pl ON pl.user_id = u.id
WHERE u.role = 'siswa'
GROUP BY u.id, u.nama, s.nama_sekolah, s.wilayah;

-- ============================================================
-- DATA AWAL (SEED)
-- ============================================================

-- Sekolah
INSERT INTO sekolah (nama_sekolah, alamat, wilayah) VALUES
('SMAN 1 Jakarta Barat', 'Jl. Budi Utomo No.7, Grogol', 'Jakarta Barat'),
('SMAN 2 Jakarta Barat', 'Jl. Kemanggisan Raya, Palmerah', 'Jakarta Barat'),
('SMAN 3 Jakarta Barat', 'Jl. Kalideres Raya, Kalideres', 'Jakarta Barat'),
('SMAN 4 Jakarta Barat', 'Jl. Raya Kembangan, Kembangan', 'Jakarta Barat'),
('SMAN 5 Jakarta Barat', 'Jl. Cengkareng Raya, Cengkareng', 'Jakarta Barat');

-- Mata Pelajaran (hanya Matematika)
INSERT INTO mata_pelajaran (id, nama, warna_hex) VALUES
(1, 'Matematika', '#378ADD');

-- Badge
INSERT INTO badge (id, nama, deskripsi, ikon_nama, warna_hex) VALUES
(1, 'Pemula', 'Menyelesaikan modul pertama', 'star-outline', '#EF9F27'),
(2, 'Rajin Belajar', 'Menyelesaikan 5 modul', 'book', '#378ADD'),
(3, 'Juara Kelas', 'Masuk top 3 leaderboard', 'trophy', '#EF9F27'),
(4, 'Pantang Menyerah', 'Berhasil lulus setelah remedial', 'refresh-circle', '#639922'),
(5, 'Ahli Matematika', 'Menyelesaikan semua modul Matematika', 'calculator', '#E24B4A'),
(6, 'Nilai Sempurna', 'Mendapat skor 100 dalam ujian', 'ribbon', '#9B59B6');

-- Modul Matematika (10 modul, urutan dari mudah ke sulit)
INSERT INTO modul (id, mapel_id, judul, deskripsi, level, urutan, estimasi_menit, xp_reward) VALUES
(1,  1, 'Aljabar Dasar',         'Mempelajari operasi aljabar dasar termasuk persamaan linear dan pertidaksamaan.', 1, 1,  30,  50),
(2,  1, 'Persamaan Kuadrat',     'Memahami cara menyelesaikan persamaan kuadrat dengan berbagai metode.', 1, 2,  35,  60),
(3,  1, 'Fungsi dan Grafik',     'Memahami konsep fungsi, domain, kodomain, dan representasi grafik.', 2, 3,  45,  80),
(4,  1, 'Barisan dan Deret',     'Mempelajari barisan aritmetika dan geometri serta deret tak hingga.', 2, 4,  45,  80),
(5,  1, 'Trigonometri Dasar',    'Mempelajari rasio trigonometri, sudut istimewa, dan identitas dasar.', 2, 5,  50,  90),
(6,  1, 'Trigonometri Lanjutan', 'Memahami rumus jumlah sudut, persamaan trigonometri, dan grafik fungsi trig.', 3, 6,  60, 120),
(7,  1, 'Statistika Dasar',      'Memahami konsep statistik deskriptif, mean, median, modus, dan penyebaran data.', 2, 7,  40,  70),
(8,  1, 'Peluang',               'Mempelajari konsep peluang, permutasi, kombinasi, dan distribusi peluang.', 2, 8,  45,  80),
(9,  1, 'Vektor',                'Memahami operasi vektor, dot product, cross product, dan penerapannya.', 3, 9,  55, 110),
(10, 1, 'Kalkulus Dasar',        'Pengantar limit, turunan, dan integral sebagai dasar kalkulus SMA.', 3, 10, 60, 120);

-- Soal Modul 1: Aljabar Dasar
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES
(1, 'Jika 2x + 4 = 12, maka nilai x adalah...', '3', '4', '6', '8', 'b'),
(1, 'Hasil dari (3x + 2)(x - 1) adalah...', '3x² - x - 2', '3x² + x - 2', '3x² - x + 2', '3x² - 5x - 2', 'a'),
(1, 'Himpunan penyelesaian dari 2x - 3 > 7 adalah...', 'x > 5', 'x > 2', 'x < 5', 'x > 4', 'a'),
(1, 'Nilai x yang memenuhi x² - 5x + 6 = 0 adalah...', 'x = 2 atau x = 3', 'x = -2 atau x = -3', 'x = 1 atau x = 6', 'x = -1 atau x = -6', 'a'),
(1, 'Bentuk sederhana dari (4x² - 9) / (2x - 3) adalah...', '2x - 3', '2x + 3', '4x + 3', '4x - 3', 'b'),
(1, 'Jika 3x - 7 = 2x + 5, maka x = ...', '10', '11', '12', '13', 'c'),
(1, 'Faktor dari x² - 9 adalah...', '(x-3)(x-3)', '(x+3)(x+3)', '(x-3)(x+3)', '(x-9)(x+1)', 'c'),
(1, 'Nilai dari 2³ × 2² adalah...', '2⁴', '2⁵', '2⁶', '4⁵', 'b');

-- Soal Modul 2: Persamaan Kuadrat
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES
(2, 'Akar-akar dari x² - 5x + 6 = 0 adalah...', 'x=1 dan x=6', 'x=2 dan x=3', 'x=-2 dan x=-3', 'x=2 dan x=-3', 'b'),
(2, 'Diskriminan dari x² - 4x + 4 = 0 adalah...', '-4', '0', '4', '8', 'b'),
(2, 'Jumlah akar-akar dari 2x² - 6x + 4 = 0 adalah...', '1', '2', '3', '4', 'c'),
(2, 'Persamaan kuadrat yang akar-akarnya 2 dan -3 adalah...', 'x²+x-6=0', 'x²-x-6=0', 'x²+x+6=0', 'x²-x+6=0', 'a'),
(2, 'Hasil kali akar-akar dari 3x² - 9x + 6 = 0 adalah...', '1', '2', '3', '6', 'b'),
(2, 'Nilai x dari (x-2)² = 9 adalah...', 'x=5 atau x=-1', 'x=5 atau x=1', 'x=3 atau x=-3', 'x=11 atau x=-7', 'a'),
(2, 'Persamaan x² + bx + 9 = 0 memiliki akar kembar jika b = ...', '3', '6', '9', '18', 'b'),
(2, 'Melengkapi kuadrat dari x² + 6x = 7 menghasilkan...', '(x+3)²=16', '(x+3)²=10', '(x+6)²=43', '(x+3)²=7', 'a');

-- Soal Modul 5: Trigonometri Dasar
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES
(5, 'Nilai dari sin 30° adalah...', '√3/2', '1/2', '√2/2', '1', 'b'),
(5, 'Nilai cos 60° adalah...', '√3/2', '√2/2', '1/2', '0', 'c'),
(5, 'tan 45° sama dengan...', '0', '√3', '1/√3', '1', 'd'),
(5, 'Identitas trigonometri sin²θ + cos²θ = ...', '0', '1', '2', 'tan²θ', 'b'),
(5, 'Nilai dari sin 90° adalah...', '0', '1/2', '√2/2', '1', 'd'),
(5, 'Nilai cos 0° adalah...', '0', '1/2', '√3/2', '1', 'd'),
(5, 'Jika sin θ = 3/5, maka cos θ = ...', '4/5', '3/4', '5/3', '5/4', 'a'),
(5, 'tan θ dapat dinyatakan sebagai...', 'sin θ × cos θ', 'sin θ / cos θ', 'cos θ / sin θ', '1 / sin θ', 'b');

-- Soal Modul 7: Statistika Dasar
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES
(7, 'Data: 5, 7, 8, 9, 11. Rata-rata (mean) dari data tersebut adalah...', '7', '8', '9', '10', 'b'),
(7, 'Data: 3, 5, 7, 9, 11. Median dari data tersebut adalah...', '5', '7', '9', '11', 'b'),
(7, 'Data: 2, 4, 4, 5, 7, 4. Modus dari data tersebut adalah...', '2', '4', '5', '7', 'b'),
(7, 'Jangkauan (range) dari data 3, 7, 2, 9, 5 adalah...', '5', '6', '7', '8', 'c'),
(7, 'Simpangan baku merupakan akar dari...', 'mean', 'median', 'varians', 'modus', 'c'),
(7, 'Data nilai ulangan: 60, 70, 80, 90, 100. Nilai rata-ratanya adalah...', '70', '80', '85', '90', 'b'),
(7, 'Histogram digunakan untuk menyajikan data...', 'kategori', 'bergolong', 'nominal', 'ordinal', 'b'),
(7, 'Kuartil bawah (Q1) adalah nilai yang membagi...', '25% data terbawah', '50% data', '75% data', '100% data', 'a');

-- Assessment (ujian untuk modul-modul utama)
INSERT INTO assessment (modul_id, judul, durasi_menit, max_retake, nilai_lulus, deadline) VALUES
(1,  'Ujian Aljabar Dasar',      20, 3, 60, DATE_ADD(NOW(), INTERVAL 60 DAY)),
(2,  'Ujian Persamaan Kuadrat',  25, 3, 60, DATE_ADD(NOW(), INTERVAL 60 DAY)),
(5,  'Ujian Trigonometri Dasar', 30, 3, 60, DATE_ADD(NOW(), INTERVAL 60 DAY)),
(7,  'Ujian Statistika Dasar',   25, 3, 60, DATE_ADD(NOW(), INTERVAL 60 DAY));

-- Users (password = "password123" semua, hash akan di-update)
INSERT INTO users (nama, email, password, role, sekolah_id) VALUES
('Justin Bryan',  'siswa1@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 1),
('Budi Santoso',  'siswa2@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 2),
('Citra Dewi',    'siswa3@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 3),
('Dian Rahayu',   'siswa4@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 4),
('Eka Putri',     'siswa5@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 5),
('Pak Guru',      'guru1@test.com',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru',  1);

-- Modul Progress awal (modul 1 tersedia untuk semua siswa)
INSERT INTO modul_progress (user_id, modul_id, status) VALUES
(1, 1, 'tersedia'),
(2, 1, 'tersedia'),
(3, 1, 'tersedia'),
(4, 1, 'tersedia'),
(5, 1, 'tersedia');

-- Sample Poin Log (untuk demo leaderboard)
INSERT INTO poin_log (user_id, jumlah, tipe, keterangan) VALUES
(1,  85, 'assessment', 'Ujian Aljabar Dasar'),
(1,  90, 'assessment', 'Ujian Persamaan Kuadrat'),
(1,  50, 'modul',      'Selesai modul Aljabar Dasar'),
(2, 200, 'assessment', 'Ujian Aljabar Dasar'),
(2, 150, 'assessment', 'Ujian Trigonometri Dasar'),
(3, 300, 'assessment', 'Ujian Trigonometri Dasar'),
(3,  80, 'modul',      'Selesai modul Trigonometri Dasar'),
(4,  75, 'assessment', 'Ujian Statistika Dasar'),
(5,  95, 'assessment', 'Ujian Aljabar Dasar'),
(5,  60, 'modul',      'Selesai modul Aljabar Dasar');
