-- ============================================================
-- FrontSchooler Database Schema
-- Fokus: Pembelajaran Matematika SMA
-- ============================================================


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

-- Sub-Topik Matematika (sebagai mata_pelajaran)
INSERT INTO mata_pelajaran (id, nama, warna_hex) VALUES
(1, 'Aljabar',       '#378ADD'),
(2, 'Trigonometri',  '#E24B4A'),
(3, 'Statistika',    '#639922'),
(4, 'Geometri',      '#9B59B6'),
(5, 'Kalkulus',      '#EF9F27');

-- Badge
INSERT INTO badge (id, nama, deskripsi, ikon_nama, warna_hex) VALUES
(1, 'Pemula',           'Menyelesaikan modul pertama',              'star-outline',    '#EF9F27'),
(2, 'Rajin Belajar',    'Menyelesaikan 5 modul',                    'book',            '#378ADD'),
(3, 'Juara Kelas',      'Masuk top 3 leaderboard',                  'trophy',          '#EF9F27'),
(4, 'Pantang Menyerah', 'Berhasil lulus setelah remedial',          'refresh-circle',  '#639922'),
(5, 'Ahli Matematika',  'Menyelesaikan semua sub-topik',            'calculator',      '#E24B4A'),
(6, 'Nilai Sempurna',   'Mendapat skor 100 dalam ujian',            'ribbon',          '#9B59B6');

-- Modul Aljabar (mapel_id=1) — 2 modul: Mudah & Menengah
INSERT INTO modul (id, mapel_id, judul, deskripsi, level, urutan, estimasi_menit, xp_reward) VALUES
(1, 1, 'Persamaan Linear & Pertidaksamaan', 'Pelajari cara menyusun dan menyelesaikan persamaan linear satu variabel serta pertidaksamaan, termasuk sistem persamaan linear dua variabel.', 1, 1, 30, 50),
(2, 1, 'Fungsi, Komposisi & Invers',        'Memahami konsep fungsi dan notasi f(x), komposisi fungsi (f∘g), fungsi invers f⁻¹(x), serta representasi grafik dan transformasinya.',         2, 2, 45, 80);

-- Modul Trigonometri (mapel_id=2)
INSERT INTO modul (id, mapel_id, judul, deskripsi, level, urutan, estimasi_menit, xp_reward) VALUES
(5, 2, 'Rasio & Identitas Trigonometri', 'Kuasai sin, cos, tan pada segitiga siku-siku, sudut-sudut istimewa, identitas Pythagoras, serta aturan sinus dan cosinus.', 2, 1, 50, 90);

-- Modul Statistika (mapel_id=3)
INSERT INTO modul (id, mapel_id, judul, deskripsi, level, urutan, estimasi_menit, xp_reward) VALUES
(7, 3, 'Statistika Deskriptif', 'Pahami cara meringkas dan menganalisis data: mean, median, modus, jangkauan, ragam, simpangan baku, serta penyajian histogram dan diagram lingkaran.', 2, 1, 40, 70);

-- Modul Geometri (mapel_id=4)
INSERT INTO modul (id, mapel_id, judul, deskripsi, level, urutan, estimasi_menit, xp_reward) VALUES
(9, 4, 'Vektor', 'Memahami operasi vektor 2D dan 3D, panjang vektor, dot product, cross product, serta penerapannya dalam geometri dan fisika.', 3, 1, 55, 110);

-- Modul Kalkulus (mapel_id=5)
INSERT INTO modul (id, mapel_id, judul, deskripsi, level, urutan, estimasi_menit, xp_reward) VALUES
(10, 5, 'Limit, Turunan & Integral', 'Pengantar kalkulus SMA: konsep limit, kekontinuan, aturan turunan (diferensiasi), anti-turunan, dan integral dasar — mengikuti jalur Kalkulus AB.', 3, 1, 60, 120);

-- Soal Modul 1: Persamaan Linear & Pertidaksamaan
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES
(1, 'Jika 2x + 4 = 12, maka nilai x adalah...', '3', '4', '6', '8', 'b'),
(1, 'Himpunan penyelesaian dari 2x - 3 > 7 adalah...', 'x > 5', 'x > 2', 'x < 5', 'x > 4', 'a'),
(1, 'Jika 3x - 7 = 2x + 5, maka x = ...', '10', '11', '12', '13', 'c'),
(1, 'Penyelesaian sistem: x + y = 5 dan x - y = 1 adalah...', 'x=2, y=3', 'x=3, y=2', 'x=4, y=1', 'x=1, y=4', 'b'),
(1, 'Nilai x yang memenuhi 3x + 2 ≤ 11 adalah...', 'x ≤ 3', 'x ≥ 3', 'x ≤ 4', 'x < 3', 'a'),
(1, 'Jika 5(x - 2) = 3x + 4, maka x = ...', '5', '6', '7', '8', '3'),
(1, 'Faktor dari x² - 9 adalah...', '(x-3)(x-3)', '(x+3)(x+3)', '(x-3)(x+3)', '(x-9)(x+1)', 'c'),
(1, 'Penyelesaian dari |2x - 4| = 6 adalah...', 'x=5 atau x=-1', 'x=5 atau x=1', 'x=3 atau x=-1', 'x=4 atau x=0', 'a');

-- Soal Modul 2: Fungsi, Komposisi & Invers
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES
(2, 'Jika f(x) = 2x + 1 dan g(x) = x², maka (f∘g)(3) adalah...', '18', '19', '20', '21', 'b'),
(2, 'Fungsi invers dari f(x) = 3x - 6 adalah...', 'f⁻¹(x) = x/3 + 2', 'f⁻¹(x) = x/3 - 2', 'f⁻¹(x) = 3x + 6', 'f⁻¹(x) = (x+6)/3', 'a'),
(2, 'Domain dari f(x) = √(x - 4) adalah...', 'x > 4', 'x ≥ 4', 'x < 4', 'semua x', 'b'),
(2, 'Jika f(x) = x + 3 dan g(x) = 2x, maka (g∘f)(x) adalah...', '2x + 3', '2x + 6', 'x + 6', '2x² + 3', 'b'),
(2, 'Jika f(x) = 5x - 10, maka f⁻¹(20) adalah...', '4', '5', '6', '30', 'c'),
(2, 'Fungsi f: A → B bersifat bijektif jika...', 'setiap elemen A punya pasangan di B', 'injektif dan surjektif sekaligus', 'tidak ada elemen yang berpasangan', 'hanya surjektif', 'b'),
(2, 'Jika f(x) = x² + 1, maka f(f(2)) adalah...', '25', '26', '27', '28', 'b'),
(2, 'Grafik f(x) = |x| mengalami refleksi terhadap sumbu-x menjadi...', 'f(x) = |x|', 'f(x) = -|x|', 'f(x) = |−x|', 'f(x) = x', 'b');

-- Soal Modul 5: Rasio & Identitas Trigonometri
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES
(5, 'Nilai dari sin 30° adalah...', '√3/2', '1/2', '√2/2', '1', 'b'),
(5, 'Nilai cos 60° adalah...', '√3/2', '√2/2', '1/2', '0', 'c'),
(5, 'tan 45° sama dengan...', '0', '√3', '1/√3', '1', 'd'),
(5, 'Identitas trigonometri sin²θ + cos²θ = ...', '0', '1', '2', 'tan²θ', 'b'),
(5, 'Jika sin θ = 3/5, maka cos θ = ...', '4/5', '3/4', '5/3', '5/4', 'a'),
(5, 'tan θ dapat dinyatakan sebagai...', 'sin θ × cos θ', 'sin θ / cos θ', 'cos θ / sin θ', '1 / sin θ', 'b'),
(5, 'Pada segitiga ABC, jika a=7, b=8, sudut C=60°, maka c² = ...', '50', '53', '57', '60', 'c'),
(5, 'Nilai dari cos 180° adalah...', '1', '0', '-1', '√2/2', 'c');

-- Soal Modul 9: Vektor
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES
(9, 'Panjang vektor a = (3, 4) adalah...', '5', '6', '7', '√7', 'a'),
(9, 'Hasil dari (2,3) + (1,-1) adalah...', '(3,2)', '(3,4)', '(1,4)', '(2,2)', 'a'),
(9, 'Dot product dari a=(1,2) dan b=(3,4) adalah...', '10', '11', '12', '14', 'b'),
(9, 'Dua vektor saling tegak lurus jika dot product-nya...', '= 1', '= -1', '= 0', '≠ 0', 'c'),
(9, 'Vektor satuan dari a=(0,5) adalah...', '(0,1)', '(0,5)', '(1,0)', '(5,0)', 'a'),
(9, 'Jika a=(2,1) dan b=(4,2), maka a dan b adalah...', 'tegak lurus', 'berlawanan arah', 'searah (paralel)', 'tidak berhubungan', 'c'),
(9, 'Cross product dua vektor sejajar menghasilkan...', 'vektor tegak lurus', 'vektor nol', 'vektor satuan', 'skalar', 'b'),
(9, 'Proyeksi vektor a=(6,0) pada b=(1,0) adalah...', '3', '6', '1', '0', 'b');

-- Soal Modul 10: Limit, Turunan & Integral
INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES
(10, 'lim(x→2) (x² - 4)/(x - 2) adalah...', '2', '4', '0', 'tidak ada', 'b'),
(10, 'Turunan dari f(x) = x³ adalah...', '3x', '3x²', 'x²', '3x³', 'b'),
(10, 'Turunan dari f(x) = 5x² + 3x - 7 adalah...', '10x + 3', '5x + 3', '10x - 3', '5x² + 3', 'a'),
(10, 'Integral dari ∫2x dx adalah...', 'x² + C', '2x² + C', 'x + C', '2 + C', 'a'),
(10, 'lim(x→0) sin(x)/x adalah...', '0', '∞', '1', 'tidak ada', 'c'),
(10, 'Jika f(x) = x⁴, maka f''(x) adalah...', '4x³', '4x', '12x²', 'x³', 'a'),
(10, '∫(1 sampai 3) 2x dx = ...', '6', '8', '10', '12', 'b'),
(10, 'Nilai stasioner f(x) = x² - 4x + 3 terjadi di x = ...', '1', '2', '3', '4', 'b');

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

-- Assessment (ujian per modul)
INSERT INTO assessment (modul_id, judul, durasi_menit, max_retake, nilai_lulus, deadline) VALUES
(1,  'Ujian Persamaan Linear & Pertidaksamaan', 20, 3, 60, DATE_ADD(NOW(), INTERVAL 60 DAY)),
(2,  'Ujian Fungsi, Komposisi & Invers',        25, 3, 60, DATE_ADD(NOW(), INTERVAL 60 DAY)),
(5,  'Ujian Rasio & Identitas Trigonometri',    30, 3, 60, DATE_ADD(NOW(), INTERVAL 60 DAY)),
(7,  'Ujian Statistika Deskriptif',             25, 3, 60, DATE_ADD(NOW(), INTERVAL 60 DAY)),
(9,  'Ujian Vektor',                            30, 3, 60, DATE_ADD(NOW(), INTERVAL 60 DAY)),
(10, 'Ujian Limit, Turunan & Integral',         35, 3, 60, DATE_ADD(NOW(), INTERVAL 60 DAY));

-- Users (password = "password123" semua, hash akan di-update)
INSERT INTO users (nama, email, password, role, sekolah_id) VALUES
('Justin Bryan',  'siswa1@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 1),
('Budi Santoso',  'siswa2@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 2),
('Citra Dewi',    'siswa3@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 3),
('Dian Rahayu',   'siswa4@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 4),
('Eka Putri',     'siswa5@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', 5),
('Pak Guru',      'guru1@test.com',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru',  1);

-- Modul Progress awal
-- Aljabar: modul 1 (Mudah) tersedia dulu, modul 2 (Menengah) terkunci
-- Trig=5, Statistika=7, Geometri=9, Kalkulus=10 masing-masing tersedia
INSERT INTO modul_progress (user_id, modul_id, status) VALUES
(1, 1, 'tersedia'), (1, 2, 'terkunci'), (1, 5, 'tersedia'), (1, 7, 'tersedia'), (1, 9, 'tersedia'), (1, 10, 'tersedia'),
(2, 1, 'tersedia'), (2, 2, 'terkunci'), (2, 5, 'tersedia'), (2, 7, 'tersedia'), (2, 9, 'tersedia'), (2, 10, 'tersedia'),
(3, 1, 'tersedia'), (3, 2, 'terkunci'), (3, 5, 'tersedia'), (3, 7, 'tersedia'), (3, 9, 'tersedia'), (3, 10, 'tersedia'),
(4, 1, 'tersedia'), (4, 2, 'terkunci'), (4, 5, 'tersedia'), (4, 7, 'tersedia'), (4, 9, 'tersedia'), (4, 10, 'tersedia'),
(5, 1, 'tersedia'), (5, 2, 'terkunci'), (5, 5, 'tersedia'), (5, 7, 'tersedia'), (5, 9, 'tersedia'), (5, 10, 'tersedia');

-- Sample Poin Log (untuk demo leaderboard)
INSERT INTO poin_log (user_id, jumlah, tipe, keterangan) VALUES
(1,  85, 'assessment', 'Ujian Persamaan Linear & Pertidaksamaan'),
(1,  80, 'modul',      'Selesai modul Persamaan Linear & Pertidaksamaan'),
(1,  90, 'assessment', 'Ujian Fungsi, Komposisi & Invers'),
(2, 200, 'assessment', 'Ujian Persamaan Linear & Pertidaksamaan'),
(2, 150, 'assessment', 'Ujian Rasio & Identitas Trigonometri'),
(2,  90, 'modul',      'Selesai modul Rasio & Identitas Trigonometri'),
(3, 300, 'assessment', 'Ujian Rasio & Identitas Trigonometri'),
(3,  90, 'modul',      'Selesai modul Rasio & Identitas Trigonometri'),
(4,  75, 'assessment', 'Ujian Statistika Deskriptif'),
(4,  70, 'modul',      'Selesai modul Statistika Deskriptif'),
(5,  95, 'assessment', 'Ujian Persamaan Linear & Pertidaksamaan'),
(5,  50, 'modul',      'Selesai modul Persamaan Linear & Pertidaksamaan');
