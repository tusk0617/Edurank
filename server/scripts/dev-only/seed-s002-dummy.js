/**
 * Seed dummy hasil assessment S002 untuk demo gap analysis kategori "cukup" (~68%).
 * Jalankan: node server/scripts/dev-only/seed-s002-dummy.js
 */
const pool = require('../../db');

const kunciJawaban = {
  1:'b',2:'a',3:'c',4:'b',5:'a',6:'c',7:'c',8:'a',
  9:'b',10:'a',11:'b',12:'b',13:'c',14:'b',15:'b',16:'b',
  17:'b',18:'c',19:'d',20:'b',21:'a',22:'b',23:'c',24:'c',
  25:'a',26:'a',27:'b',28:'c',29:'a',30:'c',31:'b',32:'b',
  33:'b',34:'b',35:'a',36:'a',37:'c',38:'a',39:'b',40:'b',
  41:'b',42:'b',43:'b',44:'c',45:'c',46:'b',47:'b',48:'a',
};

// S002: 5-6 benar per ujian → rata-rata ~68.75% → kategori "cukup"
const attempts = [
  {
    assessment_id: 1, percobaan_ke: 1, days_ago: 19,
    // 5/8 benar (salah: 2,6,8)
    jawaban: [
      { soal_id: 1, dipilih: 'b' },  // BENAR
      { soal_id: 2, dipilih: 'b' },  // SALAH (a)
      { soal_id: 3, dipilih: 'c' },  // BENAR
      { soal_id: 4, dipilih: 'b' },  // BENAR
      { soal_id: 5, dipilih: 'a' },  // BENAR
      { soal_id: 6, dipilih: 'a' },  // SALAH (c)
      { soal_id: 7, dipilih: 'c' },  // BENAR
      { soal_id: 8, dipilih: 'c' },  // SALAH (a)
    ],
  },
  {
    assessment_id: 2, percobaan_ke: 1, days_ago: 16,
    // 6/8 benar (salah: 10,13)
    jawaban: [
      { soal_id: 9,  dipilih: 'b' }, // BENAR
      { soal_id: 10, dipilih: 'c' }, // SALAH (a)
      { soal_id: 11, dipilih: 'b' }, // BENAR
      { soal_id: 12, dipilih: 'b' }, // BENAR
      { soal_id: 13, dipilih: 'd' }, // SALAH (c)
      { soal_id: 14, dipilih: 'b' }, // BENAR
      { soal_id: 15, dipilih: 'b' }, // BENAR
      { soal_id: 16, dipilih: 'b' }, // BENAR
    ],
  },
  {
    assessment_id: 3, percobaan_ke: 1, days_ago: 13,
    // 5/8 benar (salah: 17,19,22)
    jawaban: [
      { soal_id: 17, dipilih: 'a' }, // SALAH (b)
      { soal_id: 18, dipilih: 'c' }, // BENAR
      { soal_id: 19, dipilih: 'b' }, // SALAH (d)
      { soal_id: 20, dipilih: 'b' }, // BENAR
      { soal_id: 21, dipilih: 'a' }, // BENAR
      { soal_id: 22, dipilih: 'c' }, // SALAH (b)
      { soal_id: 23, dipilih: 'c' }, // BENAR
      { soal_id: 24, dipilih: 'c' }, // BENAR
    ],
  },
  {
    assessment_id: 4, percobaan_ke: 1, days_ago: 9,
    // 6/8 benar (salah: 41,45)
    jawaban: [
      { soal_id: 41, dipilih: 'a' }, // SALAH (b)
      { soal_id: 42, dipilih: 'b' }, // BENAR
      { soal_id: 43, dipilih: 'b' }, // BENAR
      { soal_id: 44, dipilih: 'c' }, // BENAR
      { soal_id: 45, dipilih: 'd' }, // SALAH (c)
      { soal_id: 46, dipilih: 'b' }, // BENAR
      { soal_id: 47, dipilih: 'b' }, // BENAR
      { soal_id: 48, dipilih: 'a' }, // BENAR
    ],
  },
  {
    assessment_id: 5, percobaan_ke: 1, days_ago: 6,
    // 5/8 benar (salah: 25,26,30)
    jawaban: [
      { soal_id: 25, dipilih: 'b' }, // SALAH (a)
      { soal_id: 26, dipilih: 'c' }, // SALAH (a)
      { soal_id: 27, dipilih: 'b' }, // BENAR
      { soal_id: 28, dipilih: 'c' }, // BENAR
      { soal_id: 29, dipilih: 'a' }, // BENAR
      { soal_id: 30, dipilih: 'a' }, // SALAH (c)
      { soal_id: 31, dipilih: 'b' }, // BENAR
      { soal_id: 32, dipilih: 'b' }, // BENAR
    ],
  },
  {
    assessment_id: 6, percobaan_ke: 1, days_ago: 2,
    // 6/8 benar (salah: 35,37)
    jawaban: [
      { soal_id: 33, dipilih: 'b' }, // BENAR
      { soal_id: 34, dipilih: 'b' }, // BENAR
      { soal_id: 35, dipilih: 'c' }, // SALAH (a)
      { soal_id: 36, dipilih: 'a' }, // BENAR
      { soal_id: 37, dipilih: 'b' }, // SALAH (c)
      { soal_id: 38, dipilih: 'a' }, // BENAR
      { soal_id: 39, dipilih: 'b' }, // BENAR
      { soal_id: 40, dipilih: 'b' }, // BENAR
    ],
  },
];

async function run() {
  const [[s002]] = await pool.query("SELECT id FROM users WHERE username = 'S002'");
  if (!s002) { console.error('S002 tidak ditemukan'); process.exit(1); }
  const userId = s002.id;
  console.log(`S002 user_id = ${userId}`);

  // Hapus data lama jika ada
  await pool.query('DELETE js FROM jawaban_siswa js JOIN hasil_assessment ha ON js.hasil_id = ha.id WHERE ha.user_id = ?', [userId]);
  await pool.query('DELETE FROM hasil_assessment WHERE user_id = ?', [userId]);

  for (const attempt of attempts) {
    const benar = attempt.jawaban.filter(j => kunciJawaban[j.soal_id] === j.dipilih).length;
    const skor_mentah = (benar / attempt.jawaban.length) * 100;
    const potongan = attempt.percobaan_ke === 2 ? 20 : attempt.percobaan_ke >= 3 ? 40 : 0;
    const skor = Math.max(0, skor_mentah - potongan);
    const lulus = skor >= 60;

    const [[{ max_retake }]] = await pool.query('SELECT max_retake FROM assessment WHERE id = ?', [attempt.assessment_id]);
    const status = lulus ? 'lulus' : (attempt.percobaan_ke < max_retake ? 'remedial' : 'tidak_lulus');

    const waktu_mulai = new Date(Date.now() - attempt.days_ago * 24 * 60 * 60 * 1000);
    const waktu_selesai = new Date(waktu_mulai.getTime() + 22 * 60 * 1000);

    const [result] = await pool.query(
      `INSERT INTO hasil_assessment (user_id, assessment_id, waktu_mulai, waktu_selesai, skor, status, terlambat, percobaan_ke)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [userId, attempt.assessment_id, waktu_mulai, waktu_selesai, skor, status, attempt.percobaan_ke]
    );

    for (const j of attempt.jawaban) {
      await pool.query(
        'INSERT INTO jawaban_siswa (hasil_id, soal_id, jawaban_dipilih, benar) VALUES (?, ?, ?, ?)',
        [result.insertId, j.soal_id, j.dipilih, kunciJawaban[j.soal_id] === j.dipilih ? 1 : 0]
      );
    }

    console.log(`  [Ass ${attempt.assessment_id}] ${benar}/8 benar → skor=${skor.toFixed(1)} → ${status}`);
  }

  const totalBenar = attempts.reduce((sum, a) => sum + a.jawaban.filter(j => kunciJawaban[j.soal_id] === j.dipilih).length, 0);
  const totalSoal = attempts.reduce((sum, a) => sum + a.jawaban.length, 0);
  console.log(`\nS002 capaian: ${totalBenar}/${totalSoal} = ${(totalBenar/totalSoal*100).toFixed(1)}% → kategori: cukup`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
