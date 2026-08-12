const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const guruOnly = [verifyToken, requireRole('guru')];

// ─── SOAL ─────────────────────────────────────────────────────────────────────

// GET /api/guru/soal — flat list semua soal
router.get('/soal', ...guruOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d,
              s.jawaban_benar, s.bobot_poin
       FROM soal s
       ORDER BY s.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/guru/soal — tambah soal (modul_id opsional)
router.post('/soal', ...guruOnly, async (req, res) => {
  const { pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin } = req.body;
  if (!pertanyaan || !opsi_a || !opsi_b || !opsi_c || !opsi_d || !jawaban_benar) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO soal (pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin || 1]
    );
    res.status(201).json({ message: 'Soal berhasil ditambahkan', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/guru/soal/bulk — tambah banyak soal sekaligus
router.post('/soal/bulk', ...guruOnly, async (req, res) => {
  const { soal } = req.body;
  if (!Array.isArray(soal) || soal.length === 0) {
    return res.status(400).json({ message: 'Data soal tidak valid' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const ids = [];
    for (const s of soal) {
      if (!s.pertanyaan || !s.opsi_a || !s.opsi_b || !s.opsi_c || !s.opsi_d || !s.jawaban_benar) continue;
      const [result] = await conn.query(
        'INSERT INTO soal (pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d, s.jawaban_benar, s.bobot_poin || 1]
      );
      ids.push(result.insertId);
    }
    await conn.commit();
    res.status(201).json({ message: `${ids.length} soal berhasil ditambahkan`, ids });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT /api/guru/soal/:id
router.put('/soal/:id', ...guruOnly, async (req, res) => {
  const { pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin } = req.body;
  if (!pertanyaan || !opsi_a || !opsi_b || !opsi_c || !opsi_d || !jawaban_benar) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }
  try {
    await pool.query(
      'UPDATE soal SET pertanyaan=?, opsi_a=?, opsi_b=?, opsi_c=?, opsi_d=?, jawaban_benar=?, bobot_poin=? WHERE id=?',
      [pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin || 1, req.params.id]
    );
    res.json({ message: 'Soal berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/guru/soal/:id
router.delete('/soal/:id', ...guruOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM soal WHERE id = ?', [req.params.id]);
    res.json({ message: 'Soal berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── ASSESSMENT ───────────────────────────────────────────────────────────────

// GET /api/guru/assessment
router.get('/assessment', ...guruOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.id, a.judul, a.deadline, a.durasi_menit,
             COUNT(DISTINCT aso.soal_id)   AS jumlah_soal,
             COUNT(DISTINCT ha.user_id)    AS total_peserta
      FROM assessment a
      LEFT JOIN assessment_soal aso ON aso.assessment_id = a.id
      LEFT JOIN hasil_assessment ha  ON ha.assessment_id = a.id
      GROUP BY a.id, a.judul, a.deadline, a.durasi_menit
      ORDER BY a.id DESC
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/guru/assessment/:id/soal-ids — soal yang terpilih untuk assessment ini
router.get('/assessment/:id/soal-ids', ...guruOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT soal_id FROM assessment_soal WHERE assessment_id = ? ORDER BY urutan',
      [req.params.id]
    );
    res.json(rows.map(r => r.soal_id));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/guru/assessment/:id/hasil — daftar siswa + skor
router.get('/assessment/:id/hasil', ...guruOnly, async (req, res) => {
  try {
    const [[assessment]] = await pool.query('SELECT id, judul FROM assessment WHERE id = ?', [req.params.id]);
    if (!assessment) return res.status(404).json({ message: 'Assessment tidak ditemukan' });

    const [hasil] = await pool.query(`
      SELECT ha.id, u.nama, u.username, ha.skor, ha.status,
             ha.waktu_mulai, ha.waktu_selesai,
             TIMESTAMPDIFF(SECOND, ha.waktu_mulai, ha.waktu_selesai) AS durasi_detik,
             ha.jumlah_keluar AS total_pelanggaran
      FROM hasil_assessment ha
      JOIN users u ON ha.user_id = u.id
      WHERE ha.assessment_id = ? AND ha.waktu_selesai IS NOT NULL
      ORDER BY ha.skor DESC, ha.waktu_selesai ASC
    `, [req.params.id]);

    res.json({ assessment, hasil });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// POST /api/guru/assessment
router.post('/assessment', ...guruOnly, async (req, res) => {
  const { judul, soal_ids, deadline, durasi_menit } = req.body;
  if (!judul || !durasi_menit || !soal_ids?.length) {
    return res.status(400).json({ message: 'Judul, durasi, dan minimal 1 soal wajib diisi' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO assessment (judul, deadline, durasi_menit, max_retake) VALUES (?, ?, ?, 1)',
      [judul, deadline || null, durasi_menit]
    );
    const assessmentId = result.insertId;
    for (let i = 0; i < soal_ids.length; i++) {
      await conn.query(
        'INSERT INTO assessment_soal (assessment_id, soal_id, urutan) VALUES (?, ?, ?)',
        [assessmentId, soal_ids[i], i + 1]
      );
    }
    await conn.commit();
    res.status(201).json({ message: 'Assessment berhasil dibuat', id: assessmentId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT /api/guru/assessment/:id
router.put('/assessment/:id', ...guruOnly, async (req, res) => {
  const { judul, deadline, durasi_menit, soal_ids } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'UPDATE assessment SET judul=?, deadline=?, durasi_menit=? WHERE id=?',
      [judul, deadline || null, durasi_menit, req.params.id]
    );
    if (soal_ids?.length) {
      await conn.query('DELETE FROM assessment_soal WHERE assessment_id = ?', [req.params.id]);
      for (let i = 0; i < soal_ids.length; i++) {
        await conn.query(
          'INSERT INTO assessment_soal (assessment_id, soal_id, urutan) VALUES (?, ?, ?)',
          [req.params.id, soal_ids[i], i + 1]
        );
      }
    }
    await conn.commit();
    res.json({ message: 'Assessment berhasil diperbarui' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// DELETE /api/guru/assessment/:id
router.delete('/assessment/:id', ...guruOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM assessment WHERE id=?', [req.params.id]);
    res.json({ message: 'Assessment berhasil dihapus' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/guru/hasil/:hasilId/jawaban — detail jawaban siswa per soal
router.get('/hasil/:hasilId/jawaban', ...guruOnly, async (req, res) => {
  try {
    const [[sesi]] = await pool.query(`
      SELECT ha.id, u.nama, u.username, a.judul AS assessment,
             ha.skor, ha.status, ha.waktu_mulai, ha.waktu_selesai,
             TIMESTAMPDIFF(SECOND, ha.waktu_mulai, ha.waktu_selesai) AS durasi_detik,
             ha.jumlah_keluar AS total_pelanggaran
      FROM hasil_assessment ha
      JOIN users u ON ha.user_id = u.id
      JOIN assessment a ON ha.assessment_id = a.id
      WHERE ha.id = ?
    `, [req.params.hasilId]);
    if (!sesi) return res.status(404).json({ message: 'Tidak ditemukan' });

    const [jawaban] = await pool.query(`
      SELECT js.soal_id, js.jawaban_dipilih, js.benar,
             s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d, s.jawaban_benar, s.bobot_poin
      FROM jawaban_siswa js
      JOIN soal s ON js.soal_id = s.id
      WHERE js.hasil_id = ?
      ORDER BY js.id ASC
    `, [req.params.hasilId]);

    res.json({ sesi, jawaban });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────

// GET /api/guru/activity-log — sesi dengan pelanggaran tab switch
router.get('/activity-log', ...guruOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ha.id AS hasil_id, u.nama AS siswa, u.username,
             a.judul AS assessment,
             ha.jumlah_keluar AS total_pelanggaran,
             ha.skor, ha.status, ha.waktu_mulai, ha.waktu_selesai
      FROM hasil_assessment ha
      JOIN users u ON ha.user_id = u.id
      JOIN assessment a ON ha.assessment_id = a.id
      WHERE ha.jumlah_keluar > 0
      ORDER BY ha.jumlah_keluar DESC, ha.waktu_mulai DESC
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/guru/activity-log/:hasilId — detail log per sesi
router.get('/activity-log/:hasilId', ...guruOnly, async (req, res) => {
  try {
    const [[sesi]] = await pool.query(`
      SELECT ha.id, u.nama AS siswa, a.judul AS assessment,
             ha.waktu_mulai, ha.waktu_selesai, ha.skor, ha.status
      FROM hasil_assessment ha
      JOIN users u ON ha.user_id = u.id
      JOIN assessment a ON ha.assessment_id = a.id
      WHERE ha.id = ?
    `, [req.params.hasilId]);
    if (!sesi) return res.status(404).json({ message: 'Sesi tidak ditemukan' });

    const [logs] = await pool.query(
      'SELECT id, jenis, waktu, keterangan FROM activity_log WHERE hasil_id = ? ORDER BY waktu ASC',
      [req.params.hasilId]
    );
    res.json({ sesi, logs });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
