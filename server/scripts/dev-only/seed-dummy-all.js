/**
 * Seed data dummy 8 siswa dengan profil performa bervariasi.
 * Kompatibel dengan struktur saat ini: Geometri Analitik + Turunan Fungsi.
 *
 * Profil:
 *   S001, S002 → Baik (≥80%)
 *   S003, S004, S005 → Cukup (65–79%)
 *   S006, S007, S008 → Perlu Perhatian (<65%)
 *
 * Jalankan: node server/scripts/dev-only/seed-dummy-all.js
 */
const pool = require('../../db');

// [username, target_rate_GA, target_rate_TF]
const PROFILES = [
  { username: 'S001', gaRate: 0.90, tfRate: 0.85 },
  { username: 'S002', gaRate: 0.80, tfRate: 0.82 },
  { username: 'S003', gaRate: 0.70, tfRate: 0.68 },
  { username: 'S004', gaRate: 0.68, tfRate: 0.72 },
  { username: 'S005', gaRate: 0.66, tfRate: 0.65 },
  { username: 'S006', gaRate: 0.45, tfRate: 0.50 },
  { username: 'S007', gaRate: 0.30, tfRate: 0.55 },
  { username: 'S008', gaRate: 0.50, tfRate: 0.30 },
];

const SOAL_PER_SESI = 10;

function wrongAnswer(correct) {
  const opts = ['a', 'b', 'c', 'd'].filter(o => o !== correct);
  return opts[Math.floor(Math.random() * opts.length)];
}

function pickRandom(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

function generateJawaban(soalList, rate) {
  return soalList.map(s => {
    const benar = Math.random() < rate;
    return {
      soal_id: s.id,
      dipilih: benar ? s.jawaban_benar : wrongAnswer(s.jawaban_benar),
      benar: benar ? 1 : 0,
    };
  });
}

async function seedSesi(userId, assessmentId, percobaan_ke, daysAgo, jawaban, maxRetake) {
  const benarCount = jawaban.filter(j => j.benar).length;
  const skorMentah = (benarCount / jawaban.length) * 100;
  const potongan = percobaan_ke === 2 ? 20 : percobaan_ke >= 3 ? 40 : 0;
  const skor = Math.max(0, skorMentah - potongan);
  const lulus = skor >= 60;
  const status = lulus ? 'lulus' : (percobaan_ke < maxRetake ? 'remedial' : 'tidak_lulus');

  const waktu_mulai = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const waktu_selesai = new Date(waktu_mulai.getTime() + 25 * 60 * 1000);

  const [h] = await pool.query(
    `INSERT INTO hasil_assessment
       (user_id, assessment_id, waktu_mulai, waktu_selesai, skor, status, terlambat, percobaan_ke)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [userId, assessmentId, waktu_mulai, waktu_selesai, skor, status, percobaan_ke]
  );

  for (const j of jawaban) {
    await pool.query(
      'INSERT INTO jawaban_siswa (hasil_id, soal_id, jawaban_dipilih, benar) VALUES (?, ?, ?, ?)',
      [h.insertId, j.soal_id, j.dipilih, j.benar]
    );
  }

  return { skor, lulus, status, benarCount };
}

async function run() {
  // Ambil semua assessment + mapel-nya
  const [assessments] = await pool.query(`
    SELECT a.id, a.judul, a.max_retake, mp.nama AS mapel
    FROM assessment a
    JOIN modul m ON a.modul_id = m.id
    JOIN mata_pelajaran mp ON m.mapel_id = mp.id
    WHERE mp.nama IN ('Geometri Analitik', 'Turunan Fungsi')
    ORDER BY mp.nama, a.id
  `);

  if (assessments.length === 0) {
    console.error('Tidak ada assessment untuk GA/TF. Pastikan data assessment sudah ada.');
    process.exit(1);
  }

  console.log(`Ditemukan ${assessments.length} assessment:`);
  assessments.forEach(a => console.log(`  [${a.id}] ${a.judul} (${a.mapel}) — max_retake=${a.max_retake}`));

  // Ambil semua soal per mapel
  const [allSoal] = await pool.query(`
    SELECT s.id, s.jawaban_benar, mp.nama AS mapel
    FROM soal s
    JOIN modul m ON s.modul_id = m.id
    JOIN mata_pelajaran mp ON m.mapel_id = mp.id
    WHERE mp.nama IN ('Geometri Analitik', 'Turunan Fungsi')
  `);

  const soalByMapel = {};
  for (const s of allSoal) {
    if (!soalByMapel[s.mapel]) soalByMapel[s.mapel] = [];
    soalByMapel[s.mapel].push(s);
  }
  console.log(`\nBank soal: GA=${soalByMapel['Geometri Analitik']?.length || 0}, TF=${soalByMapel['Turunan Fungsi']?.length || 0}\n`);

  let totalJawaban = 0;

  for (const profile of PROFILES) {
    const [[user]] = await pool.query('SELECT id FROM users WHERE username = ?', [profile.username]);
    if (!user) {
      console.log(`Skip: ${profile.username} tidak ditemukan di DB`);
      continue;
    }

    // Bersihkan data lama
    await pool.query(
      'DELETE js FROM jawaban_siswa js JOIN hasil_assessment ha ON js.hasil_id = ha.id WHERE ha.user_id = ?',
      [user.id]
    );
    await pool.query('DELETE FROM hasil_assessment WHERE user_id = ?', [user.id]);

    let log = `✓ ${profile.username}:`;

    for (const assessment of assessments) {
      const isGA = assessment.mapel === 'Geometri Analitik';
      const rate = isGA ? profile.gaRate : profile.tfRate;
      const soalPool = soalByMapel[assessment.mapel] || [];

      if (soalPool.length === 0) continue;

      // Percobaan 1 — 14 hari lalu
      const soal1 = pickRandom(soalPool, SOAL_PER_SESI);
      const j1 = generateJawaban(soal1, rate);
      const s1 = await seedSesi(user.id, assessment.id, 1, 14, j1, assessment.max_retake);
      totalJawaban += j1.length;

      log += ` ${assessment.mapel === 'Geometri Analitik' ? 'GA' : 'TF'}_P1=${s1.skor.toFixed(0)}%(${s1.status})`;

      // Percobaan 2 jika remedial dan max_retake ≥ 2
      if (!s1.lulus && assessment.max_retake >= 2) {
        const rate2 = Math.min(rate + 0.15, 0.95);
        const soal2 = pickRandom(soalPool, SOAL_PER_SESI);
        const j2 = generateJawaban(soal2, rate2);
        const s2 = await seedSesi(user.id, assessment.id, 2, 7, j2, assessment.max_retake);
        totalJawaban += j2.length;
        log += `→P2=${s2.skor.toFixed(0)}%(${s2.status})`;
      }
    }

    console.log(log);
  }

  console.log(`\nTotal jawaban terseed: ${totalJawaban}`);
  console.log('Selesai! Reload app untuk melihat data di Gap Analisis dan Statistik.\n');
  process.exit(0);
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
