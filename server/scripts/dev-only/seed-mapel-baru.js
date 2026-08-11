/**
 * Reset semua data mata pelajaran, modul, soal, assessment (+ hasil siswa),
 * lalu seed 2 kategori baru: Geometri Analitik & Turunan Fungsi
 * dengan masing-masing 15 soal di bank.
 *
 * Jalankan: node server/scripts/dev-only/seed-mapel-baru.js
 */
const pool = require('../../db');

async function run() {
  console.log('Menghapus data lama...');
  await pool.query('DELETE FROM jawaban_siswa');
  await pool.query('DELETE FROM hasil_assessment');
  await pool.query('DELETE FROM assessment');
  await pool.query('DELETE FROM soal');
  await pool.query('DELETE FROM modul');
  await pool.query('DELETE FROM mata_pelajaran');
  console.log('  Data lama dihapus.\n');

  // ── Mata Pelajaran ────────────────────────────────────────
  const [mp1] = await pool.query(
    "INSERT INTO mata_pelajaran (nama, warna_hex) VALUES ('Geometri Analitik', '#3B82F6')"
  );
  const [mp2] = await pool.query(
    "INSERT INTO mata_pelajaran (nama, warna_hex) VALUES ('Turunan Fungsi', '#10B981')"
  );
  const mapelGA = mp1.insertId;
  const mapelTF = mp2.insertId;
  console.log(`Mata pelajaran: Geometri Analitik (id=${mapelGA}), Turunan Fungsi (id=${mapelTF})`);

  // ── Modul ────────────────────────────────────────────────
  const [m1] = await pool.query(
    'INSERT INTO modul (mapel_id, judul, level, urutan) VALUES (?, ?, ?, ?)',
    [mapelGA, 'Geometri Analitik', 2, 1]
  );
  const [m2] = await pool.query(
    'INSERT INTO modul (mapel_id, judul, level, urutan) VALUES (?, ?, ?, ?)',
    [mapelTF, 'Turunan Fungsi', 2, 1]
  );
  const modulGA = m1.insertId;
  const modulTF = m2.insertId;
  console.log(`Modul: Geometri Analitik (id=${modulGA}), Turunan Fungsi (id=${modulTF})`);

  // ── Assessment ───────────────────────────────────────────
  await pool.query(
    `INSERT INTO assessment (modul_id, judul, durasi_menit, max_retake, potongan_terlambat, deadline)
     VALUES (?, ?, 30, 3, 5, NULL)`,
    [modulGA, 'Ujian Geometri Analitik']
  );
  await pool.query(
    `INSERT INTO assessment (modul_id, judul, durasi_menit, max_retake, potongan_terlambat, deadline)
     VALUES (?, ?, 30, 3, 5, NULL)`,
    [modulTF, 'Ujian Turunan Fungsi']
  );
  console.log('Assessment dibuat.\n');

  // ── Soal Geometri Analitik (15 soal) ────────────────────
  const soalGA = [
    {
      pertanyaan: 'Jarak antara titik A(3, 1) dan B(7, 4) adalah...',
      opsi_a: '4', opsi_b: '5', opsi_c: '6', opsi_d: '7',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Koordinat titik tengah ruas garis AB dengan A(-4, 2) dan B(6, 8) adalah...',
      opsi_a: '(2, 10)', opsi_b: '(1, 5)', opsi_c: '(1, 3)', opsi_d: '(5, 1)',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Gradien garis yang melalui titik P(1, 3) dan Q(4, 9) adalah...',
      opsi_a: '1', opsi_b: '2', opsi_c: '3', opsi_d: '6',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Persamaan garis dengan gradien 2 yang melalui titik (3, 1) adalah...',
      opsi_a: 'y = 2x + 1', opsi_b: 'y = 2x - 5', opsi_c: 'y = 2x + 5', opsi_d: 'y = x + 2',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Garis l₁: y = 3x + 1 dan l₂: y = 3x - 4. Hubungan kedua garis adalah...',
      opsi_a: 'Berimpit', opsi_b: 'Tegak lurus', opsi_c: 'Berpotongan', opsi_d: 'Sejajar',
      jawaban_benar: 'd',
    },
    {
      pertanyaan: 'Pusat lingkaran (x - 2)² + (y + 3)² = 16 adalah...',
      opsi_a: '(2, 3)', opsi_b: '(-2, 3)', opsi_c: '(2, -3)', opsi_d: '(-2, -3)',
      jawaban_benar: 'c',
    },
    {
      pertanyaan: 'Jari-jari lingkaran x² + y² = 25 adalah...',
      opsi_a: '5', opsi_b: '10', opsi_c: '25', opsi_d: '√5',
      jawaban_benar: 'a',
    },
    {
      pertanyaan: 'Jarak titik (2, 4) ke garis 3x + 4y - 6 = 0 adalah...',
      opsi_a: '2', opsi_b: '4', opsi_c: '16/5', opsi_d: '4/5',
      jawaban_benar: 'c',
    },
    {
      pertanyaan: 'Persamaan garis yang tegak lurus y = -½x + 3 dan melalui titik (0, 0) adalah...',
      opsi_a: 'y = -½x', opsi_b: 'y = 2x', opsi_c: 'y = -2x', opsi_d: 'y = ½x',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Titik A(1, 2) dirotasi 90° berlawanan arah jarum jam terhadap titik asal. Bayangan A adalah...',
      opsi_a: '(-1, 2)', opsi_b: '(2, 1)', opsi_c: '(-2, 1)', opsi_d: '(1, -2)',
      jawaban_benar: 'c',
    },
    {
      pertanyaan: 'Persamaan lingkaran berpusat di (1, -2) dengan jari-jari 3 adalah...',
      opsi_a: '(x+1)² + (y-2)² = 9', opsi_b: '(x-1)² + (y+2)² = 3',
      opsi_c: '(x-1)² + (y+2)² = 9', opsi_d: '(x-1)² + (y-2)² = 9',
      jawaban_benar: 'c',
    },
    {
      pertanyaan: 'Garis 4x + 3y = 12 memotong sumbu y di titik...',
      opsi_a: '(3, 0)', opsi_b: '(0, 4)', opsi_c: '(4, 0)', opsi_d: '(0, 3)',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Panjang ruas garis dari titik asal ke titik A(5, 12) adalah...',
      opsi_a: '10', opsi_b: '11', opsi_c: '12', opsi_d: '13',
      jawaban_benar: 'd',
    },
    {
      pertanyaan: 'Gradien garis 2y - 6x + 4 = 0 adalah...',
      opsi_a: '-3', opsi_b: '2', opsi_c: '3', opsi_d: '6',
      jawaban_benar: 'c',
    },
    {
      pertanyaan: 'Titik (1, 1) terhadap lingkaran x² + y² = 4 berada...',
      opsi_a: 'Di luar lingkaran', opsi_b: 'Pada lingkaran',
      opsi_c: 'Di dalam lingkaran', opsi_d: 'Di pusat lingkaran',
      jawaban_benar: 'c',
    },
  ];

  // ── Soal Turunan Fungsi (15 soal) ───────────────────────
  const soalTF = [
    {
      pertanyaan: 'Turunan dari f(x) = 6x⁴ adalah...',
      opsi_a: '24x³', opsi_b: '6x³', opsi_c: '24x⁴', opsi_d: '4x³',
      jawaban_benar: 'a',
    },
    {
      pertanyaan: 'Turunan dari f(x) = 3x² - 5x + 7 adalah...',
      opsi_a: '6x + 5', opsi_b: '6x - 5', opsi_c: '3x - 5', opsi_d: '6x - 7',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Turunan dari f(x) = (x² + 1)³ adalah...',
      opsi_a: '3(x²+1)²', opsi_b: '6x(x²+1)³', opsi_c: '6x(x²+1)²', opsi_d: '2x(x²+1)³',
      jawaban_benar: 'c',
    },
    {
      pertanyaan: 'Turunan dari f(x) = x · eˣ adalah...',
      opsi_a: 'eˣ', opsi_b: 'x · eˣ', opsi_c: 'eˣ(1 + x)', opsi_d: 'eˣ(x - 1)',
      jawaban_benar: 'c',
    },
    {
      pertanyaan: 'Turunan dari f(x) = sin²x adalah...',
      opsi_a: '2 cos x', opsi_b: 'sin 2x', opsi_c: '2 sin x', opsi_d: 'cos 2x',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Nilai f\'(1) jika f(x) = 2x³ - 3x adalah...',
      opsi_a: '-1', opsi_b: '2', opsi_c: '3', opsi_d: '4',
      jawaban_benar: 'c',
    },
    {
      pertanyaan: 'Persamaan garis singgung kurva y = x² di titik (2, 4) adalah...',
      opsi_a: 'y = 4x - 4', opsi_b: 'y = 2x', opsi_c: 'y = 4x + 4', opsi_d: 'y = 4x - 8',
      jawaban_benar: 'a',
    },
    {
      pertanyaan: 'Turunan dari f(x) = ln(3x) adalah...',
      opsi_a: '3/x', opsi_b: '1/(3x)', opsi_c: '3', opsi_d: '1/x',
      jawaban_benar: 'd',
    },
    {
      pertanyaan: 'Turunan dari f(x) = cos(2x) adalah...',
      opsi_a: '-sin(2x)', opsi_b: '-2 sin(2x)', opsi_c: '2 sin(2x)', opsi_d: 'sin(2x)',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Nilai stasioner fungsi f(x) = x³ - 6x² + 9x terjadi di x = ...',
      opsi_a: 'x = 1 saja', opsi_b: 'x = 3 saja', opsi_c: 'x = 1 dan x = 3', opsi_d: 'x = 2',
      jawaban_benar: 'c',
    },
    {
      pertanyaan: 'Turunan dari f(x) = x / (x + 1) adalah...',
      opsi_a: '1/(x+1)', opsi_b: '1/(x+1)²', opsi_c: 'x/(x+1)²', opsi_d: '-1/(x+1)²',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Jika y = u³ dan u = 2x - 1, maka dy/dx adalah...',
      opsi_a: '3(2x-1)²', opsi_b: '6(2x-1)²', opsi_c: '6(2x-1)', opsi_d: '3u²',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Turunan dari f(x) = tan x adalah...',
      opsi_a: 'cot x', opsi_b: 'sec x', opsi_c: 'sec²x', opsi_d: '-sec²x',
      jawaban_benar: 'c',
    },
    {
      pertanyaan: 'Turunan kedua dari f(x) = 4x³ adalah...',
      opsi_a: '12x', opsi_b: '24x', opsi_c: '12x²', opsi_d: '24x²',
      jawaban_benar: 'b',
    },
    {
      pertanyaan: 'Laju perubahan volume bola V = (4/3)πr³ terhadap jari-jari r adalah...',
      opsi_a: '(4/3)πr²', opsi_b: '4πr', opsi_c: '4πr²', opsi_d: '(4/3)π',
      jawaban_benar: 'c',
    },
  ];

  // Insert soal GA
  for (const s of soalGA) {
    await pool.query(
      'INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin) VALUES (?,?,?,?,?,?,?,1)',
      [modulGA, s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d, s.jawaban_benar]
    );
  }
  console.log(`Soal Geometri Analitik: ${soalGA.length} soal dimasukkan.`);

  // Insert soal TF
  for (const s of soalTF) {
    await pool.query(
      'INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin) VALUES (?,?,?,?,?,?,?,1)',
      [modulTF, s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d, s.jawaban_benar]
    );
  }
  console.log(`Soal Turunan Fungsi: ${soalTF.length} soal dimasukkan.`);

  console.log('\nSelesai! Bank soal siap:');
  console.log('  - Geometri Analitik : 15 soal → tampil 10 acak saat ujian');
  console.log('  - Turunan Fungsi    : 15 soal → tampil 10 acak saat ujian');
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
