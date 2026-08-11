/**
 * Tambah kolom referensi di tabel soal, lalu insert 7 soal dari UN 2018.
 * Soal UN SMA/MA IPA/MIPA 2018 Paket 1, Kemdikbud — No. 16,17,18,19,27,28,29
 * Jalankan: node server/scripts/dev-only/add-soal-un2018.js
 */
const pool = require('../../db');

async function run() {
  // ── Tambah kolom referensi ────────────────────────────────────────────
  try {
    await pool.query('ALTER TABLE soal ADD COLUMN referensi VARCHAR(255) NULL AFTER jawaban_benar');
    console.log("Kolom 'referensi' ditambahkan ke tabel soal.");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log("Kolom 'referensi' sudah ada, lanjut.");
    } else throw e;
  }

  // ── Ambil modul_id secara dinamis ────────────────────────────────────
  const [[modGA]] = await pool.query(
    "SELECT m.id FROM modul m JOIN mata_pelajaran mp ON m.mapel_id=mp.id WHERE mp.nama='Geometri Analitik' LIMIT 1"
  );
  const [[modTF]] = await pool.query(
    "SELECT m.id FROM modul m JOIN mata_pelajaran mp ON m.mapel_id=mp.id WHERE mp.nama='Turunan Fungsi' LIMIT 1"
  );

  if (!modGA || !modTF) {
    console.error('Modul tidak ditemukan. Jalankan seed-mapel-baru.js terlebih dahulu.');
    process.exit(1);
  }

  const REF = 'UN SMA/MA IPA/MIPA 2018 Paket 1, Kemdikbud';

  const soalBaru = [
    // ── GEOMETRI ANALITIK (UN 2018 No. 27) ──────────────────────────────
    // Opsi E (x²+y²+10x-4y-198=0) dihapus karena paling jauh dari jawaban
    {
      modul_id: modGA.id,
      pertanyaan: 'Persamaan lingkaran yang berpusat di titik (-2, 5) dan melalui titik (3, -7) adalah...',
      opsi_a: 'x² + y² + 4x - 10y - 140 = 0',
      opsi_b: 'x² + y² - 4x - 10y - 140 = 0',
      opsi_c: 'x² + y² + 4x - 10y - 198 = 0',
      opsi_d: 'x² + y² + 10x - 4y - 140 = 0',
      jawaban_benar: 'a',
      referensi: REF + ', No. 27',
    },

    // ── GEOMETRI ANALITIK (UN 2018 No. 28) ──────────────────────────────
    // Opsi E (5x-12y=7 atau 5x+12y=85) dihapus karena beda gradien
    {
      modul_id: modGA.id,
      pertanyaan: 'Persamaan garis singgung lingkaran x²+y²-6x+4y+4=0 yang tegak lurus garis 5x+12y-12=0 adalah...',
      opsi_a: '12x - 5y = 7 atau 12x - 5y = 85',
      opsi_b: '12x + 5y = 7 atau 12x + 5y = 85',
      opsi_c: '12x + 5y = 7 atau 12x - 5y = 85',
      opsi_d: '12x - 5y = 7 atau 12x + 5y = 85',
      jawaban_benar: 'a',
      referensi: REF + ', No. 28',
    },

    // ── GEOMETRI ANALITIK (UN 2018 No. 29) ──────────────────────────────
    // Opsi E (A'(5,4), B'(2,0), C'(4,-1)) dihapus karena C' salah
    {
      modul_id: modGA.id,
      pertanyaan: "Segitiga ABC dengan A(-1,2), B(6,-2), C(5,2) dirotasi 180° dengan pusat (2,-1). Koordinat bayangan segitiga adalah...",
      opsi_a: "A'(-4,5), B'(-2,0), C'(-1,-4)",
      opsi_b: "A'(5,-4), B'(2,0), C'(-1,-4)",
      opsi_c: "A'(5,-4), B'(-2,0), C'(-1,-4)",
      opsi_d: "A'(5,4), B'(0,-2), C'(-4,-1)",
      jawaban_benar: 'c',
      referensi: REF + ', No. 29',
    },

    // ── TURUNAN FUNGSI (UN 2018 No. 16) ─────────────────────────────────
    // Opsi A asli (40x-15) dihapus; opsi B-E digeser ke A-D
    {
      modul_id: modTF.id,
      pertanyaan: "Diketahui f(x)=5x-3 dan g(x)=4x²-3x. Jika h(x)=f(x)·g(x), maka h'(x) adalah...",
      opsi_a: '-20x² + 24x - 9',
      opsi_b: '20x³ - 27x² + 9x',
      opsi_c: '20x² + 25x - 15',
      opsi_d: '60x² - 54x + 9',
      jawaban_benar: 'd',
      referensi: REF + ', No. 16',
    },

    // ── TURUNAN FUNGSI (UN 2018 No. 17) ─────────────────────────────────
    // Opsi E (-½ < x < 2) dihapus karena batas kanan salah
    {
      modul_id: modTF.id,
      pertanyaan: 'Fungsi f(x) = ⅔x³ - 7/2 x² - 4x + 5 turun pada interval...',
      opsi_a: 'x < -4 atau x > 1',
      opsi_b: 'x < -½ atau x > 4',
      opsi_c: '-½ < x < 4',
      opsi_d: '-4 < x < 1',
      jawaban_benar: 'c',
      referensi: REF + ', No. 17',
    },

    // ── TURUNAN FUNGSI (UN 2018 No. 18) ─────────────────────────────────
    // Opsi E (x-3y+4=0) dihapus karena gradien berbeda
    {
      modul_id: modTF.id,
      pertanyaan: 'Persamaan garis singgung kurva y=x²-5x+12 yang sejajar dengan garis 3x-y+5=0 adalah...',
      opsi_a: '3x - y + 4 = 0',
      opsi_b: '3x - y - 4 = 0',
      opsi_c: '3x - y - 20 = 0',
      opsi_d: 'x - 3y - 4 = 0',
      jawaban_benar: 'b',
      referensi: REF + ', No. 18',
    },

    // ── TURUNAN FUNGSI (UN 2018 No. 19) ─────────────────────────────────
    // Opsi E (Rp145 juta) dihapus; opsi A-D tetap
    {
      modul_id: modTF.id,
      pertanyaan: 'Suatu industri memproduksi barang selama x hari dengan biaya (4x + 100/x + 40) juta rupiah per hari. Biaya minimum produksi per hari adalah...',
      opsi_a: 'Rp75.000.000,00',
      opsi_b: 'Rp80.000.000,00',
      opsi_c: 'Rp90.000.000,00',
      opsi_d: 'Rp120.000.000,00',
      jawaban_benar: 'b',
      referensi: REF + ', No. 19',
    },
  ];

  console.log('\nMenambahkan soal dari UN 2018...');
  for (const s of soalBaru) {
    const [res] = await pool.query(
      `INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin, referensi)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [s.modul_id, s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d, s.jawaban_benar, s.referensi]
    );
    console.log(`  [id=${res.insertId}] ${s.pertanyaan.substring(0, 65)}...`);
  }

  // Ringkasan bank soal
  const [[{ ga }]] = await pool.query('SELECT COUNT(*) AS ga FROM soal WHERE modul_id = ?', [modGA.id]);
  const [[{ tf }]] = await pool.query('SELECT COUNT(*) AS tf FROM soal WHERE modul_id = ?', [modTF.id]);

  console.log('\nBank soal sekarang:');
  console.log(`  Geometri Analitik : ${ga} soal → tampil 10 acak saat ujian`);
  console.log(`  Turunan Fungsi    : ${tf} soal → tampil 10 acak saat ujian`);
  console.log('\nReferensi dicantumkan: ' + REF);
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
