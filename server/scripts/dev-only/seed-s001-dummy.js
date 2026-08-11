/**
 * Hapus semua data S001 lalu seed dummy hasil assessment untuk demo gap analysis.
 * S001 bagus di Aljabar & Kalkulus, lemah di Geometri & Trigonometri.
 * Jalankan: node server/scripts/dev-only/seed-s001-dummy.js
 */
const pool = require('../../db');

// Soal jawaban_benar dari DB (sudah dicek):
// Modul 1 (Aljabar - Persamaan Linear) soal 1-8: b,a,c,b,a,c,c,a
// Modul 2 (Aljabar - Fungsi) soal 9-16: b,a,b,b,c,b,b,b
// Modul 5 (Trigonometri) soal 17-24: b,c,d,b,a,b,c,c
// Modul 7 (Statistika) soal 41-48: b,b,b,c,c,b,b,a
// Modul 9 (Geometri - Vektor) soal 25-32: a,a,b,c,a,c,b,b
// Modul 10 (Kalkulus) soal 33-40: b,b,a,a,c,a,b,b

const attempts = [
  // assessment_id, percobaan_ke, waktu_mulai (days ago), jawaban per soal (ordered by soal.id ASC)
  {
    assessment_id: 1, // Aljabar - Persamaan Linear
    percobaan_ke: 1,
    days_ago: 21,
    // Soal 1-8, benar: b,a,c,b,a,c,c,a — 7/8 benar (salah soal 6: jawab a harusnya c)
    jawaban: [
      { soal_id: 1, dipilih: 'b' }, // BENAR
      { soal_id: 2, dipilih: 'a' }, // BENAR
      { soal_id: 3, dipilih: 'c' }, // BENAR
      { soal_id: 4, dipilih: 'b' }, // BENAR
      { soal_id: 5, dipilih: 'a' }, // BENAR
      { soal_id: 6, dipilih: 'a' }, // SALAH (benar: c)
      { soal_id: 7, dipilih: 'c' }, // BENAR
      { soal_id: 8, dipilih: 'a' }, // BENAR
    ],
  },
  {
    assessment_id: 2, // Aljabar - Fungsi
    percobaan_ke: 1,
    days_ago: 18,
    // Soal 9-16, benar: b,a,b,b,c,b,b,b — 5/8 benar (salah soal 11,14,15)
    jawaban: [
      { soal_id: 9,  dipilih: 'b' }, // BENAR
      { soal_id: 10, dipilih: 'a' }, // BENAR
      { soal_id: 11, dipilih: 'a' }, // SALAH (benar: b)
      { soal_id: 12, dipilih: 'b' }, // BENAR
      { soal_id: 13, dipilih: 'c' }, // BENAR
      { soal_id: 14, dipilih: 'd' }, // SALAH (benar: b)
      { soal_id: 15, dipilih: 'c' }, // SALAH (benar: b)
      { soal_id: 16, dipilih: 'b' }, // BENAR
    ],
  },
  {
    assessment_id: 3, // Trigonometri - percobaan 1
    percobaan_ke: 1,
    days_ago: 15,
    // Soal 17-24, benar: b,c,d,b,a,b,c,c — 3/8 benar (salah 17,18,20,22,23)
    jawaban: [
      { soal_id: 17, dipilih: 'a' }, // SALAH (benar: b)
      { soal_id: 18, dipilih: 'b' }, // SALAH (benar: c)
      { soal_id: 19, dipilih: 'd' }, // BENAR
      { soal_id: 20, dipilih: 'c' }, // SALAH (benar: b)
      { soal_id: 21, dipilih: 'a' }, // BENAR
      { soal_id: 22, dipilih: 'c' }, // SALAH (benar: b)
      { soal_id: 23, dipilih: 'a' }, // SALAH (benar: c)
      { soal_id: 24, dipilih: 'c' }, // BENAR
    ],
  },
  {
    assessment_id: 3, // Trigonometri - percobaan 2 (remedial)
    percobaan_ke: 2,
    days_ago: 12,
    // 5/8 benar (masih salah 17, 22)
    jawaban: [
      { soal_id: 17, dipilih: 'd' }, // SALAH (benar: b)
      { soal_id: 18, dipilih: 'c' }, // BENAR
      { soal_id: 19, dipilih: 'd' }, // BENAR
      { soal_id: 20, dipilih: 'b' }, // BENAR
      { soal_id: 21, dipilih: 'a' }, // BENAR
      { soal_id: 22, dipilih: 'c' }, // SALAH (benar: b)
      { soal_id: 23, dipilih: 'c' }, // BENAR
      { soal_id: 24, dipilih: 'c' }, // BENAR
    ],
  },
  {
    assessment_id: 4, // Statistika - percobaan 1
    percobaan_ke: 1,
    days_ago: 10,
    // Soal 41-48, benar: b,b,b,c,c,b,b,a — 4/8 benar (salah 41,43,45,47)
    jawaban: [
      { soal_id: 41, dipilih: 'a' }, // SALAH (benar: b)
      { soal_id: 42, dipilih: 'b' }, // BENAR
      { soal_id: 43, dipilih: 'c' }, // SALAH (benar: b)
      { soal_id: 44, dipilih: 'c' }, // BENAR
      { soal_id: 45, dipilih: 'a' }, // SALAH (benar: c)
      { soal_id: 46, dipilih: 'b' }, // BENAR
      { soal_id: 47, dipilih: 'd' }, // SALAH (benar: b)
      { soal_id: 48, dipilih: 'a' }, // BENAR
    ],
  },
  {
    assessment_id: 5, // Geometri - Vektor (lemah sekali)
    percobaan_ke: 1,
    days_ago: 7,
    // Soal 25-32, benar: a,a,b,c,a,c,b,b — 2/8 benar (salah 25,26,27,29,30,31)
    jawaban: [
      { soal_id: 25, dipilih: 'b' }, // SALAH (benar: a)
      { soal_id: 26, dipilih: 'c' }, // SALAH (benar: a)
      { soal_id: 27, dipilih: 'a' }, // SALAH (benar: b)
      { soal_id: 28, dipilih: 'c' }, // BENAR
      { soal_id: 29, dipilih: 'b' }, // SALAH (benar: a)
      { soal_id: 30, dipilih: 'a' }, // SALAH (benar: c)
      { soal_id: 31, dipilih: 'a' }, // SALAH (benar: b)
      { soal_id: 32, dipilih: 'b' }, // BENAR
    ],
  },
  {
    assessment_id: 6, // Kalkulus (bagus)
    percobaan_ke: 1,
    days_ago: 3,
    // Soal 33-40, benar: b,b,a,a,c,a,b,b — 7/8 benar (salah soal 37)
    jawaban: [
      { soal_id: 33, dipilih: 'b' }, // BENAR
      { soal_id: 34, dipilih: 'b' }, // BENAR
      { soal_id: 35, dipilih: 'a' }, // BENAR
      { soal_id: 36, dipilih: 'a' }, // BENAR
      { soal_id: 37, dipilih: 'b' }, // SALAH (benar: c)
      { soal_id: 38, dipilih: 'a' }, // BENAR
      { soal_id: 39, dipilih: 'b' }, // BENAR
      { soal_id: 40, dipilih: 'b' }, // BENAR
    ],
  },
];

// Map soal_id → jawaban_benar (dari query DB)
const kunciJawaban = {
  1:'b',2:'a',3:'c',4:'b',5:'a',6:'c',7:'c',8:'a',
  9:'b',10:'a',11:'b',12:'b',13:'c',14:'b',15:'b',16:'b',
  17:'b',18:'c',19:'d',20:'b',21:'a',22:'b',23:'c',24:'c',
  25:'a',26:'a',27:'b',28:'c',29:'a',30:'c',31:'b',32:'b',
  33:'b',34:'b',35:'a',36:'a',37:'c',38:'a',39:'b',40:'b',
  41:'b',42:'b',43:'b',44:'c',45:'c',46:'b',47:'b',48:'a',
};

function hitungSkor(jawaban, percobaan_ke) {
  const totalSoal = jawaban.length;
  const benar = jawaban.filter(j => kunciJawaban[j.soal_id] === j.dipilih).length;
  const skor_mentah = (benar / totalSoal) * 100;
  const potongan_remedial = percobaan_ke === 2 ? 20 : percobaan_ke >= 3 ? 40 : 0;
  const skor_akhir = Math.max(0, skor_mentah - potongan_remedial);
  return { skor_mentah, skor_akhir, benar };
}

async function run() {
  const [[s001]] = await pool.query("SELECT id FROM users WHERE username = 'S001'");
  if (!s001) { console.error('S001 tidak ditemukan'); process.exit(1); }
  const userId = s001.id;
  console.log(`S001 user_id = ${userId}`);

  // Hapus data lama
  const [delJawaban] = await pool.query(
    'DELETE js FROM jawaban_siswa js JOIN hasil_assessment ha ON js.hasil_id = ha.id WHERE ha.user_id = ?',
    [userId]
  );
  const [delHasil] = await pool.query('DELETE FROM hasil_assessment WHERE user_id = ?', [userId]);
  console.log(`Dihapus: ${delJawaban.affectedRows} jawaban, ${delHasil.affectedRows} hasil`);

  // Seed dummy
  for (const attempt of attempts) {
    const { skor_mentah, skor_akhir, benar } = hitungSkor(attempt.jawaban, attempt.percobaan_ke);
    const lulus = skor_akhir >= 60;

    // Cek max_retake untuk assessment ini
    const [[assessment]] = await pool.query('SELECT max_retake FROM assessment WHERE id = ?', [attempt.assessment_id]);
    const status = lulus ? 'lulus' : (attempt.percobaan_ke < assessment.max_retake ? 'remedial' : 'tidak_lulus');

    const waktu_mulai = new Date(Date.now() - attempt.days_ago * 24 * 60 * 60 * 1000);
    const waktu_selesai = new Date(waktu_mulai.getTime() + 25 * 60 * 1000); // 25 menit

    const [result] = await pool.query(
      `INSERT INTO hasil_assessment (user_id, assessment_id, waktu_mulai, waktu_selesai, skor, status, terlambat, percobaan_ke)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [userId, attempt.assessment_id, waktu_mulai, waktu_selesai, skor_akhir, status, attempt.percobaan_ke]
    );
    const hasilId = result.insertId;

    for (const j of attempt.jawaban) {
      const benarFlag = kunciJawaban[j.soal_id] === j.dipilih ? 1 : 0;
      await pool.query(
        'INSERT INTO jawaban_siswa (hasil_id, soal_id, jawaban_dipilih, benar) VALUES (?, ?, ?, ?)',
        [hasilId, j.soal_id, j.dipilih, benarFlag]
      );
    }

    const potongan = attempt.percobaan_ke === 2 ? '-20%' : attempt.percobaan_ke >= 3 ? '-40%' : '';
    console.log(
      `  [Assessment ${attempt.assessment_id} - percobaan ${attempt.percobaan_ke}] ${benar}/8 benar → skor_mentah=${skor_mentah.toFixed(1)} ${potongan} → skor=${skor_akhir.toFixed(1)} → ${status}`
    );
  }

  console.log('\nSelesai! Summary gap analysis yang diharapkan:');
  console.log('  Aljabar    : 7+5 = 12/16 benar → 75% | 25% salah');
  console.log('  Trigonometri: 3+5 = 8/16 benar → 50% | 50% salah');
  console.log('  Statistika : 4/8 benar       → 50% | 50% salah');
  console.log('  Geometri   : 2/8 benar        → 25% | 75% salah ← gap terbesar');
  console.log('  Kalkulus   : 7/8 benar        → 87.5% | 12.5% salah ← terbaik');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
