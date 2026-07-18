const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

const getPeriodFilter = (periode) => {
  if (periode === 'minggu') return "AND pl.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
  if (periode === 'bulan') return "AND pl.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
  return '';
};

// GET /api/ranking/individu
router.get('/individu', verifyToken, async (req, res) => {
  const periode = req.query.periode || 'semua';
  const periodFilter = getPeriodFilter(periode);

  try {
    const [rows] = await pool.query(
      `SELECT u.id AS user_id, u.nama,
              COALESCE(SUM(pl.jumlah), 0) AS total_poin,
              RANK() OVER (ORDER BY COALESCE(SUM(pl.jumlah), 0) DESC) AS \`rank\`
       FROM users u
       LEFT JOIN poin_log pl ON pl.user_id = u.id ${periodFilter}
       WHERE u.role = 'siswa'
       GROUP BY u.id, u.nama
       ORDER BY total_poin DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/ranking/wilayah
router.get('/wilayah', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.wilayah,
              COALESCE(AVG(sub.total_poin), 0) AS rata_poin,
              COUNT(DISTINCT sub.user_id) AS jumlah_siswa,
              COUNT(DISTINCT s.id) AS jumlah_sekolah
       FROM sekolah s
       LEFT JOIN (
         SELECT u.id AS user_id, u.sekolah_id, COALESCE(SUM(pl.jumlah), 0) AS total_poin
         FROM users u
         LEFT JOIN poin_log pl ON pl.user_id = u.id
         WHERE u.role = 'siswa'
         GROUP BY u.id, u.sekolah_id
       ) sub ON sub.sekolah_id = s.id
       GROUP BY s.wilayah
       ORDER BY rata_poin DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/ranking/saya
router.get('/saya', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [allRanks] = await pool.query(
      `SELECT u.id AS user_id, COALESCE(SUM(pl.jumlah), 0) AS total_poin,
              RANK() OVER (ORDER BY COALESCE(SUM(pl.jumlah), 0) DESC) AS \`rank\`
       FROM users u
       LEFT JOIN poin_log pl ON pl.user_id = u.id
       WHERE u.role = 'siswa'
       GROUP BY u.id`
    );

    const myRank = allRanks.find(r => r.user_id === userId);
    res.json(myRank || { user_id: userId, total_poin: 0, rank: allRanks.length + 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/gap/analisis (guru & advisor only)
router.get('/gap/analisis', verifyToken, async (req, res) => {
  if (!['guru', 'advisor'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Akses ditolak' });
  }

  try {
    // Per sekolah per mapel
    const [perSekolah] = await pool.query(
      `SELECT s.nama_sekolah, mp.nama AS mapel, COALESCE(AVG(ha.skor), 0) AS rata_skor
       FROM sekolah s
       CROSS JOIN mata_pelajaran mp
       LEFT JOIN modul m ON m.mapel_id = mp.id
       LEFT JOIN assessment a ON a.modul_id = m.id
       LEFT JOIN hasil_assessment ha ON ha.assessment_id = a.id
       LEFT JOIN users u ON ha.user_id = u.id AND u.sekolah_id = s.id
       GROUP BY s.id, s.nama_sekolah, mp.id, mp.nama
       ORDER BY s.nama_sekolah, mp.nama`
    );

    // Heatmap: sekolah x level
    const [heatmap] = await pool.query(
      `SELECT s.nama_sekolah, m.level,
              COALESCE(AVG(ha.skor), 0) AS rata_skor,
              COUNT(DISTINCT ha.id) AS jumlah_ujian
       FROM sekolah s
       CROSS JOIN (SELECT DISTINCT level FROM modul) lv
       LEFT JOIN modul m ON m.level = lv.level
       LEFT JOIN assessment a ON a.modul_id = m.id
       LEFT JOIN hasil_assessment ha ON ha.assessment_id = a.id
       LEFT JOIN users u ON ha.user_id = u.id AND u.sekolah_id = s.id
       GROUP BY s.id, s.nama_sekolah, m.level
       ORDER BY s.nama_sekolah, m.level`
    );

    // Siswa berisiko (skor rata-rata < 60)
    const [siswaBerisiko] = await pool.query(
      `SELECT u.nama, s.nama_sekolah,
              AVG(ha.skor) AS rata_skor,
              (SELECT mp.nama FROM mata_pelajaran mp
               JOIN modul m2 ON m2.mapel_id = mp.id
               JOIN assessment a2 ON a2.modul_id = m2.id
               JOIN hasil_assessment ha2 ON ha2.assessment_id = a2.id AND ha2.user_id = u.id
               GROUP BY mp.id ORDER BY AVG(ha2.skor) ASC LIMIT 1) AS mapel_lemah
       FROM users u
       JOIN sekolah s ON u.sekolah_id = s.id
       JOIN hasil_assessment ha ON ha.user_id = u.id
       WHERE u.role = 'siswa'
       GROUP BY u.id, u.nama, s.nama_sekolah
       HAVING rata_skor < 60
       ORDER BY rata_skor ASC`
    );

    // Summary
    const sekolahTerbaik = perSekolah.reduce((acc, curr) => {
      const key = curr.nama_sekolah;
      acc[key] = (acc[key] || []);
      acc[key].push(curr.rata_skor);
      return acc;
    }, {});

    const sekolahAvg = Object.entries(sekolahTerbaik).map(([nama, scores]) => ({
      nama,
      avg: scores.reduce((a, b) => a + parseFloat(b), 0) / scores.length,
    })).sort((a, b) => b.avg - a.avg);

    res.json({
      per_sekolah: perSekolah,
      heatmap,
      siswa_berisiko: siswaBerisiko,
      summary: {
        sekolah_terbaik: sekolahAvg[0] || null,
        sekolah_terlemah: sekolahAvg[sekolahAvg.length - 1] || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
