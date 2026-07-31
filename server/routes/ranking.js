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

module.exports = router;
