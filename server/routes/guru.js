const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const guruOnly = [verifyToken, requireRole('guru')];

// GET /api/guru/mapel — list mata pelajaran untuk picker
router.get('/mapel', ...guruOnly, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nama, warna_hex FROM mata_pelajaran ORDER BY nama');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/guru/modul — dropdown list
router.get('/modul', ...guruOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.id, m.judul, mp.nama AS nama_mapel
       FROM modul m
       JOIN mata_pelajaran mp ON m.mapel_id = mp.id
       ORDER BY mp.nama, m.urutan`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/guru/modul — tambah materi baru
router.post('/modul', ...guruOnly, async (req, res) => {
  const { judul, mapel_id, level } = req.body;
  if (!judul || !mapel_id || !level) {
    return res.status(400).json({ message: 'Judul, kategori, dan tingkat kesulitan wajib diisi' });
  }
  const levelMap = { 'Mudah': 1, 'Sedang': 2, 'Sulit': 3 };
  const levelInt = levelMap[level] || 1;
  try {
    const [[{ urutan }]] = await pool.query(
      'SELECT COALESCE(MAX(urutan), 0) + 1 AS urutan FROM modul WHERE mapel_id = ?',
      [mapel_id]
    );
    const [result] = await pool.query(
      'INSERT INTO modul (mapel_id, judul, level, urutan) VALUES (?, ?, ?, ?)',
      [mapel_id, judul.trim(), levelInt, urutan]
    );
    res.status(201).json({ message: 'Materi berhasil ditambahkan', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/guru/soal
router.get('/soal', ...guruOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.modul_id, s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d,
              s.jawaban_benar, s.bobot_poin, m.judul AS judul_modul, mp.nama AS nama_mapel
       FROM soal s
       JOIN modul m ON s.modul_id = m.id
       JOIN mata_pelajaran mp ON m.mapel_id = mp.id
       ORDER BY mp.nama, m.urutan, s.id`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/guru/soal
router.post('/soal', ...guruOnly, async (req, res) => {
  const { modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin } = req.body;
  if (!modul_id || !pertanyaan || !opsi_a || !opsi_b || !opsi_c || !opsi_d || !jawaban_benar) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO soal (modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin || 1]
    );
    res.status(201).json({ message: 'Soal berhasil ditambahkan', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/guru/soal/:id
router.put('/soal/:id', ...guruOnly, async (req, res) => {
  const { modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin } = req.body;
  if (!pertanyaan || !opsi_a || !opsi_b || !opsi_c || !opsi_d || !jawaban_benar) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }
  try {
    await pool.query(
      'UPDATE soal SET modul_id=?, pertanyaan=?, opsi_a=?, opsi_b=?, opsi_c=?, opsi_d=?, jawaban_benar=?, bobot_poin=? WHERE id=?',
      [modul_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, bobot_poin || 1, req.params.id]
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

const THRESHOLD_PERHATIAN = 60;

// GET /api/guru/gap/siswa — analisis capaian poin per siswa
router.get('/gap/siswa', ...guruOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         u.id AS user_id,
         u.nama,
         COUNT(js.id) AS total_jawaban,
         COALESCE(SUM(CASE WHEN js.benar = 1 THEN s.bobot_poin ELSE 0 END), 0) AS poin_terkumpul,
         COALESCE(SUM(s.bobot_poin), 0) AS total_poin_seharusnya,
         CASE
           WHEN COALESCE(SUM(s.bobot_poin), 0) = 0 THEN 0
           ELSE ROUND(
             SUM(CASE WHEN js.benar = 1 THEN s.bobot_poin ELSE 0 END) /
             SUM(s.bobot_poin) * 100, 1
           )
         END AS persentase_capaian
       FROM users u
       LEFT JOIN hasil_assessment ha ON ha.user_id = u.id
       LEFT JOIN jawaban_siswa js ON js.hasil_id = ha.id
       LEFT JOIN soal s ON js.soal_id = s.id
       WHERE u.role = 'siswa'
       GROUP BY u.id, u.nama
       ORDER BY persentase_capaian ASC`
    );
    const siswa = rows.map(row => ({
      ...row,
      perlu_perhatian: parseFloat(row.persentase_capaian) < THRESHOLD_PERHATIAN,
    }));
    res.json(siswa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/guru/gap/modul — daftar modul dengan statistik jawaban salah
router.get('/gap/modul', ...guruOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         m.id AS modul_id,
         m.judul,
         mp.nama AS nama_mapel,
         mp.warna_hex,
         COUNT(DISTINCT s.id) AS total_soal,
         COUNT(js.id) AS total_jawaban,
         SUM(CASE WHEN js.benar = 0 THEN 1 ELSE 0 END) AS total_salah,
         ROUND(SUM(CASE WHEN js.benar = 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(js.id), 0) * 100, 1) AS persen_salah
       FROM modul m
       JOIN mata_pelajaran mp ON m.mapel_id = mp.id
       LEFT JOIN soal s ON s.modul_id = m.id
       LEFT JOIN jawaban_siswa js ON js.soal_id = s.id
       GROUP BY m.id, m.judul, mp.nama, mp.warna_hex
       HAVING total_jawaban > 0
       ORDER BY persen_salah DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/guru/gap/modul/:id — soal dalam modul diurutkan persen_salah DESC
router.get('/gap/modul/:id', ...guruOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         s.id,
         s.pertanyaan,
         s.jawaban_benar,
         COUNT(js.id) AS total_jawaban,
         SUM(CASE WHEN js.benar = 0 THEN 1 ELSE 0 END) AS total_salah,
         ROUND(SUM(CASE WHEN js.benar = 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(js.id), 0) * 100, 1) AS persen_salah
       FROM soal s
       LEFT JOIN jawaban_siswa js ON js.soal_id = s.id
       WHERE s.modul_id = ?
       GROUP BY s.id, s.pertanyaan, s.jawaban_benar
       ORDER BY persen_salah DESC, total_salah DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/guru/gap — persentase salah per mata pelajaran + top soal paling banyak salah
router.get('/gap', ...guruOnly, async (req, res) => {
  try {
    const [perMapel] = await pool.query(
      `SELECT mp.nama AS mapel,
              COUNT(js.id) AS total_jawaban,
              SUM(CASE WHEN js.benar = 0 THEN 1 ELSE 0 END) AS total_salah,
              ROUND(SUM(CASE WHEN js.benar = 0 THEN 1 ELSE 0 END) / COUNT(js.id) * 100, 1) AS persen_salah
       FROM jawaban_siswa js
       JOIN soal s ON js.soal_id = s.id
       JOIN modul m ON s.modul_id = m.id
       JOIN mata_pelajaran mp ON m.mapel_id = mp.id
       GROUP BY mp.id, mp.nama
       ORDER BY persen_salah DESC`
    );

    const [topSalah] = await pool.query(
      `SELECT SUBSTRING(s.pertanyaan, 1, 80) AS pertanyaan, mp.nama AS mapel, m.judul AS modul,
              COUNT(js.id) AS total_jawaban,
              SUM(CASE WHEN js.benar = 0 THEN 1 ELSE 0 END) AS total_salah,
              ROUND(SUM(CASE WHEN js.benar = 0 THEN 1 ELSE 0 END) / COUNT(js.id) * 100, 1) AS persen_salah
       FROM jawaban_siswa js
       JOIN soal s ON js.soal_id = s.id
       JOIN modul m ON s.modul_id = m.id
       JOIN mata_pelajaran mp ON m.mapel_id = mp.id
       GROUP BY s.id, s.pertanyaan, mp.nama, m.judul
       HAVING total_jawaban > 0
       ORDER BY persen_salah DESC
       LIMIT 10`
    );

    const [[{ total_siswa }]] = await pool.query(
      "SELECT COUNT(*) AS total_siswa FROM users WHERE role = 'siswa'"
    );
    const [[{ total_soal }]] = await pool.query('SELECT COUNT(*) AS total_soal FROM soal');
    const [[{ total_jawaban }]] = await pool.query('SELECT COUNT(*) AS total_jawaban FROM jawaban_siswa');

    res.json({
      per_mapel: perMapel,
      top_soal_salah: topSalah,
      ringkasan: { total_siswa, total_soal, total_jawaban },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
