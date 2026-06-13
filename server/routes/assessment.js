const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/assessment
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT a.*, m.judul AS nama_modul, mp.nama AS nama_mapel, mp.warna_hex,
              (SELECT COUNT(*) FROM hasil_assessment ha WHERE ha.user_id = ? AND ha.assessment_id = a.id) AS jumlah_percobaan,
              (SELECT MAX(ha.skor) FROM hasil_assessment ha WHERE ha.user_id = ? AND ha.assessment_id = a.id) AS skor_terbaik,
              (SELECT ha.status FROM hasil_assessment ha WHERE ha.user_id = ? AND ha.assessment_id = a.id ORDER BY ha.id DESC LIMIT 1) AS status_terakhir
       FROM assessment a
       JOIN modul m ON a.modul_id = m.id
       JOIN mata_pelajaran mp ON m.mapel_id = mp.id
       ORDER BY a.deadline ASC`,
      [userId, userId, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/assessment/:id/soal
router.get('/:id/soal', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const assessmentId = req.params.id;

  try {
    const [[assessment]] = await pool.query(
      'SELECT * FROM assessment WHERE id = ?',
      [assessmentId]
    );

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment tidak ditemukan' });
    }

    // Check percobaan
    const [[{ percobaan }]] = await pool.query(
      'SELECT COUNT(*) AS percobaan FROM hasil_assessment WHERE user_id = ? AND assessment_id = ?',
      [userId, assessmentId]
    );

    if (percobaan >= assessment.max_retake) {
      return res.status(403).json({ message: 'Batas percobaan telah habis' });
    }

    // Buat sesi baru
    const terlambat = assessment.deadline && new Date() > new Date(assessment.deadline);
    const [result] = await pool.query(
      `INSERT INTO hasil_assessment (user_id, assessment_id, waktu_mulai, terlambat, percobaan_ke)
       VALUES (?, ?, NOW(), ?, ?)`,
      [userId, assessmentId, terlambat ? 1 : 0, percobaan + 1]
    );

    // Ambil soal acak
    const [soal] = await pool.query(
      'SELECT id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d FROM soal WHERE modul_id = ? ORDER BY RAND()',
      [assessment.modul_id]
    );

    res.json({ sesi_id: result.insertId, soal, durasi_menit: assessment.durasi_menit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/assessment/:id/submit
router.post('/:id/submit', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const assessmentId = req.params.id;
  const { sesi_id, jawaban } = req.body;

  if (!sesi_id || !jawaban || !Array.isArray(jawaban)) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Get assessment & sesi info
    const [[assessment]] = await conn.query('SELECT * FROM assessment WHERE id = ?', [assessmentId]);
    const [[sesi]] = await conn.query('SELECT * FROM hasil_assessment WHERE id = ? AND user_id = ?', [sesi_id, userId]);

    if (!sesi) {
      await conn.rollback();
      return res.status(404).json({ message: 'Sesi tidak ditemukan' });
    }

    // Hitung skor
    let totalBobot = 0;
    let totalBenar = 0;
    const pembahasanArr = [];

    for (const j of jawaban) {
      const [[soal]] = await conn.query(
        'SELECT id, jawaban_benar, bobot_poin, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d FROM soal WHERE id = ?',
        [j.soal_id]
      );

      if (!soal) continue;

      const benar = soal.jawaban_benar === j.jawaban;
      totalBobot += soal.bobot_poin;
      if (benar) totalBenar += soal.bobot_poin;

      await conn.query(
        'INSERT INTO jawaban_siswa (hasil_id, soal_id, jawaban_dipilih, benar) VALUES (?, ?, ?, ?)',
        [sesi_id, j.soal_id, j.jawaban, benar]
      );

      pembahasanArr.push({
        soal_id: soal.id,
        pertanyaan: soal.pertanyaan,
        jawaban_dipilih: j.jawaban,
        jawaban_benar: soal.jawaban_benar,
        benar,
        opsi: { a: soal.opsi_a, b: soal.opsi_b, c: soal.opsi_c, d: soal.opsi_d },
      });
    }

    let skor = totalBobot > 0 ? (totalBenar / totalBobot) * 100 : 0;

    // Hitung potongan keterlambatan
    let potonganTerlambat = 0;
    if (sesi.terlambat && assessment.deadline) {
      const hariTerlambat = Math.ceil((new Date() - new Date(assessment.deadline)) / (1000 * 60 * 60 * 24));
      potonganTerlambat = Math.min(hariTerlambat * parseFloat(assessment.potongan_terlambat), 60);
    }

    // Hitung potongan remedial
    let potonganRemedial = 0;
    const percobaan = sesi.percobaan_ke;
    if (percobaan === 2) potonganRemedial = 20;
    else if (percobaan >= 3) potonganRemedial = 40;

    const skorAkhir = Math.max(0, skor - potonganTerlambat - potonganRemedial);
    const lulus = skorAkhir >= 60;
    const statusHasil = lulus ? 'lulus' : (percobaan < assessment.max_retake ? 'remedial' : 'tidak_lulus');
    const poinDidapat = Math.round(skorAkhir);

    // Update sesi
    await conn.query(
      'UPDATE hasil_assessment SET skor = ?, poin_didapat = ?, waktu_selesai = NOW(), status = ? WHERE id = ?',
      [skorAkhir, poinDidapat, statusHasil, sesi_id]
    );

    // Log poin
    const tipePoin = percobaan > 1 ? 'remedial' : 'assessment';
    await conn.query(
      'INSERT INTO poin_log (user_id, jumlah, tipe, keterangan) VALUES (?, ?, ?, ?)',
      [userId, poinDidapat, tipePoin, `${assessment.judul} - percobaan ke-${percobaan}`]
    );

    // Cek badge All Rounder
    const [[{ total_poin }]] = await conn.query(
      'SELECT COALESCE(SUM(jumlah), 0) AS total_poin FROM poin_log WHERE user_id = ?',
      [userId]
    );

    let newBadges = [];
    if (total_poin >= 500) {
      const [[existing]] = await conn.query(
        'SELECT id FROM user_badge WHERE user_id = ? AND badge_id = 5',
        [userId]
      );
      if (!existing) {
        await conn.query('INSERT IGNORE INTO user_badge (user_id, badge_id) VALUES (?, 5)', [userId]);
        newBadges.push({ id: 5, nama: 'All Rounder', ikon_nama: 'trophy', warna_hex: '#E24B4A' });
      }
    }

    // Get ranking baru
    const [[rankRow]] = await conn.query(
      `SELECT r.rank FROM v_ranking_individu r WHERE r.user_id = ?`,
      [userId]
    );

    await conn.commit();

    res.json({
      skor: skorAkhir,
      skor_mentah: skor,
      potongan_terlambat: potonganTerlambat,
      potongan_remedial: potonganRemedial,
      poin_didapat: poinDidapat,
      lulus,
      status: statusHasil,
      ranking_baru: rankRow ? rankRow.rank : null,
      percobaan_ke: percobaan,
      bisa_remedial: !lulus && percobaan < assessment.max_retake,
      new_badges: newBadges,
      pembahasan: pembahasanArr,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;
