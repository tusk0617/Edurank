const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/assessment — daftar assessment untuk siswa
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(`
      SELECT a.id, a.judul, a.deadline, a.durasi_menit,
             COUNT(DISTINCT aso.soal_id) AS jumlah_soal,
             CASE WHEN ha.id IS NOT NULL THEN 'selesai' ELSE 'tersedia' END AS status,
             ha.skor
      FROM assessment a
      LEFT JOIN assessment_soal aso ON aso.assessment_id = a.id
      LEFT JOIN hasil_assessment ha
             ON ha.assessment_id = a.id AND ha.user_id = ? AND ha.waktu_selesai IS NOT NULL
      GROUP BY a.id, a.judul, a.deadline, a.durasi_menit, ha.id, ha.skor
      ORDER BY a.id DESC
    `, [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/assessment/:id/soal — ambil soal dan buat/lanjutkan sesi
router.get('/:id/soal', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const assessmentId = req.params.id;
  try {
    const [[assessment]] = await pool.query('SELECT * FROM assessment WHERE id = ?', [assessmentId]);
    if (!assessment) return res.status(404).json({ message: 'Assessment tidak ditemukan' });

    // Cek sudah pernah submit
    const [[{ sudah }]] = await pool.query(
      'SELECT COUNT(*) AS sudah FROM hasil_assessment WHERE user_id = ? AND assessment_id = ? AND waktu_selesai IS NOT NULL',
      [userId, assessmentId]
    );
    if (sudah > 0) return res.status(403).json({ message: 'Assessment sudah diselesaikan' });

    // Lanjutkan sesi aktif atau buat baru
    const [[sesiAktif]] = await pool.query(
      'SELECT id FROM hasil_assessment WHERE user_id = ? AND assessment_id = ? AND waktu_selesai IS NULL ORDER BY id DESC LIMIT 1',
      [userId, assessmentId]
    );

    let sesiId;
    if (sesiAktif) {
      sesiId = sesiAktif.id;
    } else {
      const terlambat = assessment.deadline && new Date() > new Date(assessment.deadline) ? 1 : 0;
      const [result] = await pool.query(
        'INSERT INTO hasil_assessment (user_id, assessment_id, waktu_mulai, terlambat, percobaan_ke) VALUES (?, ?, NOW(), ?, 1)',
        [userId, assessmentId, terlambat]
      );
      sesiId = result.insertId;
    }

    // Ambil soal dari assessment_soal
    const [soal] = await pool.query(`
      SELECT s.id, s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d
      FROM assessment_soal aso
      JOIN soal s ON aso.soal_id = s.id
      WHERE aso.assessment_id = ?
      ORDER BY aso.urutan, aso.soal_id
    `, [assessmentId]);

    res.json({ sesi_id: sesiId, soal, durasi_menit: assessment.durasi_menit, judul: assessment.judul });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/assessment/:id/submit
router.post('/:id/submit', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { sesi_id, jawaban } = req.body;

  if (!sesi_id || !jawaban || !Array.isArray(jawaban)) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[sesi]] = await conn.query(
      'SELECT * FROM hasil_assessment WHERE id = ? AND user_id = ?',
      [sesi_id, userId]
    );
    if (!sesi) { await conn.rollback(); return res.status(404).json({ message: 'Sesi tidak ditemukan' }); }

    let totalBobot = 0;
    let totalBenar = 0;

    for (const j of jawaban) {
      const [[soal]] = await conn.query(
        'SELECT id, jawaban_benar, bobot_poin FROM soal WHERE id = ?',
        [j.soal_id]
      );
      if (!soal) continue;
      const benar = soal.jawaban_benar === j.jawaban;
      totalBobot += soal.bobot_poin;
      if (benar) totalBenar += soal.bobot_poin;
      await conn.query(
        'INSERT INTO jawaban_siswa (hasil_id, soal_id, jawaban_dipilih, benar) VALUES (?, ?, ?, ?)',
        [sesi_id, j.soal_id, j.jawaban, benar ? 1 : 0]
      );
    }

    const skor = totalBobot > 0 ? Math.round((totalBenar / totalBobot) * 100) : 0;
    const durasiDetik = Math.round((Date.now() - new Date(sesi.waktu_mulai).getTime()) / 1000);

    await conn.query(
      "UPDATE hasil_assessment SET skor = ?, waktu_selesai = NOW(), status = 'selesai' WHERE id = ?",
      [skor, sesi_id]
    );

    await conn.commit();
    res.json({ skor, durasi_detik: durasiDetik });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// POST /api/assessment/:id/activity — log tab switch
router.post('/:id/activity', verifyToken, async (req, res) => {
  const { sesi_id, jenis, keterangan } = req.body;
  if (!sesi_id || !jenis) return res.status(400).json({ message: 'Data tidak lengkap' });
  try {
    await pool.query(
      'INSERT INTO activity_log (hasil_id, jenis, keterangan) VALUES (?, ?, ?)',
      [sesi_id, jenis, keterangan || null]
    );
    res.json({ message: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
