-- ============================================================
-- FrontSchooler Database Schema
-- Created for Skripsi S1 - BINUS University
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

-- Mata Pelajaran
INSERT INTO mata_pelajaran (nama, warna_hex) VALUES
('Matematika', '#378ADD'),
('Bahasa Indonesia', '#639922'),
('Bahasa Inggris', '#EF9F27');

-- Badge
INSERT INTO badge (id, nama, deskripsi, ikon_nama, warna_hex) VALUES
(1, 'Pemula', 'Menyelesaikan modul pertama', 'star-outline', '#EF9F27'),
(2, 'Rajin Belajar', 'Menyelesaikan 5 modul', 'book', '#378ADD'),
(3, 'Juara Kelas', 'Masuk top 3 leaderboard', 'trophy', '#EF9F27'),
(4, 'Pantang Menyerah', 'Berhasil lulus setelah remedial', 'refresh-circle', '#639922'),
(5, 'All Rounder', 'Mengumpulkan 500 poin', 'trophy', '#E24B4A');

-- Modul Matematika
INSERT INTO modul (mapel_id, judul, deskripsi, level, urutan, estimasi_menit, xp_reward) VALUES
(1, 'Aljabar Dasar', 'Mempelajari operasi aljabar dasar termasuk persamaan linear dan pertidaksamaan.', 1, 1, 30, 50),
(1, 'Fungsi dan Grafik', 'Memahami konsep fungsi, domain, kodomain, dan representasi grafik.', 2, 2, 45, 80),
(1, 'Trigonometri', 'Mempelajari rasio trigonometri, identitas, dan penerapannya.', 3, 3, 60, 120),
(1, 'Statistika Dasar', 'Memahami konsep statistik deskriptif, distribusi data, dan analisis dasar.', 2, 4, 45, 80);

-- Modul Bahasa Indonesia
INSERT INTO modul (mapel_id, judul, deskripsi, level, urutan, estimasi_menit, xp_reward) VALUES
(2, 'Teks Narasi', 'Memahami struktur, ciri kebahasaan, dan cara menulis teks narasi yang baik.', 1, 1, 30, 50),
(2, 'Teks Argumentasi', 'Mempelajari cara menyusun argumen yang logis dan persuasif.', 2, 2, 45, 80),
(2, 'Karya Sastra', 'Menganalisis unsur intrinsik dan ekstrinsik karya sastra Indonesia.', 3, 3, 60, 120);

-- Modul Bahasa Inggris
INSERT INTO modul (mapel_id, judul, deskripsi, level, urutan, estimasi_menit, xp_reward) VALUES
(3, 'Simple Present & Past', 'Memahami penggunaan simple present dan past tense dalam komunikasi sehari-hari.', 1, 1, 30, 50),
(3, 'Reading Comprehension', 'Melatih kemampuan memahami teks bahasa Inggris dan menjawab pertanyaan.', 2, 2, 45, 80),
(3, 'Writing Skills', 'Mempelajari cara menulis paragraf, essay, dan surat resmi dalam bahasa Inggris.', 3, 3, 60, 120);

-- Soal Matematika - Aljabar
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin) VALUES
(1, 'Jika 2x + 4 = 12, maka nilai x adalah...', '3', '4', '6', '8', 'b', 1),
(1, 'Hasil dari (3x + 2)(x - 1) adalah...', '3x² - x - 2', '3x² + x - 2', '3x² - x + 2', '3x² - 5x - 2', 'a', 1),
(1, 'Himpunan penyelesaian dari 2x - 3 > 7 adalah...', 'x > 5', 'x > 2', 'x < 5', 'x > 4', 'a', 1),
(1, 'Nilai dari x² - 5x + 6 = 0 adalah...', 'x = 2 atau x = 3', 'x = -2 atau x = -3', 'x = 1 atau x = 6', 'x = -1 atau x = -6', 'a', 1),
(1, 'Bentuk sederhana dari (4x² - 9) / (2x - 3) adalah...', '2x - 3', '2x + 3', '4x + 3', '4x - 3', 'b', 1);

-- Soal Matematika - Trigonometri
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin) VALUES
(3, 'Identitas trigonometri sin²θ + cos²θ = ...', '0', '1', '2', 'tan²θ', 'b', 1),
(3, 'Nilai dari sin 30° adalah...', '√3/2', '1/2', '√2/2', '1', 'b', 1),
(3, 'Nilai cos 60° adalah...', '√3/2', '√2/2', '1/2', '0', 'c', 1),
(3, 'tan 45° sama dengan...', '0', '√3', '1/√3', '1', 'd', 1),
(3, 'Nilai dari sin 90° adalah...', '0', '1/2', '√2/2', '1', 'd', 1);

-- Soal Bahasa Inggris - Simple Present
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin) VALUES
(8, 'She ___ to school every day.', 'go', 'goes', 'going', 'gone', 'b', 1),
(8, 'They ___ not like spicy food.', 'does', 'do', 'did', 'done', 'b', 1),
(8, 'Yesterday, he ___ his homework.', 'finish', 'finishes', 'finished', 'finishing', 'c', 1),
(8, '___ you go to the market last week?', 'Do', 'Does', 'Did', 'Will', 'c', 1),
(8, 'The correct simple present sentence is...', 'She go to school', 'She goes to school', 'She going to school', 'She gone to school', 'b', 1);

-- Assessment
INSERT INTO assessment (modul_id, judul, durasi_menit, max_retake, nilai_lulus, deadline) VALUES
(1, 'Ujian Aljabar Dasar', 20, 3, 60, DATE_ADD(NOW(), INTERVAL 30 DAY)),
(3, 'Ujian Trigonometri', 30, 3, 60, DATE_ADD(NOW(), INTERVAL 30 DAY)),
(8, 'Ujian Simple Present & Past', 20, 3, 60, DATE_ADD(NOW(), INTERVAL 30 DAY));

-- Users (password = "password123" semua)
INSERT INTO users (nama, email, password, role, sekolah_id) VALUES
('Justin Bryan', 'siswa1@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 1),
('Budi Santoso', 'siswa2@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 2),
('Citra Dewi', 'siswa3@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 3),
('Dian Rahayu', 'siswa4@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 4),
('Eka Putri', 'siswa5@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 5),
('Pak Guru', 'guru1@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru', 1);

-- Modul Progress awal (modul pertama tersedia untuk semua siswa)
INSERT INTO modul_progress (user_id, modul_id, status) VALUES
(1, 1, 'tersedia'), (1, 5, 'tersedia'), (1, 8, 'tersedia'),
(2, 1, 'tersedia'), (2, 5, 'tersedia'), (2, 8, 'tersedia'),
(3, 1, 'tersedia'), (3, 5, 'tersedia'), (3, 8, 'tersedia'),
(4, 1, 'tersedia'), (4, 5, 'tersedia'), (4, 8, 'tersedia'),
(5, 1, 'tersedia'), (5, 5, 'tersedia'), (5, 8, 'tersedia');

-- Sample Poin Log (untuk demo leaderboard)
INSERT INTO poin_log (user_id, jumlah, tipe, keterangan) VALUES
(1, 85, 'assessment', 'Ujian Aljabar Dasar'),
(1, 120, 'assessment', 'Ujian Trigonometri'),
(1, 50, 'modul', 'Selesai modul Aljabar Dasar'),
(2, 200, 'assessment', 'Ujian Aljabar Dasar'),
(2, 150, 'assessment', 'Ujian Simple Present'),
(3, 300, 'assessment', 'Ujian Trigonometri'),
(3, 80, 'modul', 'Selesai modul Trigonometri'),
(4, 75, 'assessment', 'Ujian Simple Present'),
(5, 95, 'assessment', 'Ujian Aljabar Dasar');
