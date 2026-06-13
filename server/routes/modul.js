const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/modul
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT m.*, mp.nama AS nama_mapel, mp.warna_hex,
              COALESCE(p.status, 'terkunci') AS status_progress,
              COALESCE(p.persen_selesai, 0) AS persen_selesai
       FROM modul m
       JOIN mata_pelajaran mp ON m.mapel_id = mp.id
       LEFT JOIN modul_progress p ON p.modul_id = m.id AND p.user_id = ?
       ORDER BY m.mapel_id, m.urutan`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/modul/progress/saya
router.get('/progress/saya', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [[{ total_xp }]] = await pool.query(
      'SELECT COALESCE(SUM(jumlah), 0) AS total_xp FROM poin_log WHERE user_id = ?',
      [userId]
    );

    const [[{ modul_selesai }]] = await pool.query(
      "SELECT COUNT(*) AS modul_selesai FROM modul_progress WHERE user_id = ? AND status = 'selesai'",
      [userId]
    );

    const [badges] = await pool.query(
      `SELECT b.*, ub.diraih_at FROM user_badge ub
       JOIN badge b ON ub.badge_id = b.id
       WHERE ub.user_id = ?
       ORDER BY ub.diraih_at DESC`,
      [userId]
    );

    res.json({ total_xp, modul_selesai, badges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/modul/:id
router.get('/:id', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const modulId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT m.*, mp.nama AS nama_mapel, mp.warna_hex,
              COALESCE(p.status, 'terkunci') AS status_progress,
              COALESCE(p.persen_selesai, 0) AS persen_selesai,
              p.mulai_at, p.selesai_at
       FROM modul m
       JOIN mata_pelajaran mp ON m.mapel_id = mp.id
       LEFT JOIN modul_progress p ON p.modul_id = m.id AND p.user_id = ?
       WHERE m.id = ?`,
      [userId, modulId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Modul tidak ditemukan' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/modul/:id/mulai
router.post('/:id/mulai', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const modulId = req.params.id;
  try {
    await pool.query(
      `INSERT INTO modul_progress (user_id, modul_id, status, mulai_at)
       VALUES (?, ?, 'sedang', NOW())
       ON DUPLICATE KEY UPDATE status = IF(status = 'terkunci' OR status = 'tersedia', 'sedang', status),
       mulai_at = IF(mulai_at IS NULL, NOW(), mulai_at)`,
      [userId, modulId]
    );

    res.json({ message: 'Modul dimulai' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/modul/:id/selesai
router.post('/:id/selesai', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const modulId = parseInt(req.params.id);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Update progress
    await conn.query(
      `INSERT INTO modul_progress (user_id, modul_id, status, persen_selesai, selesai_at)
       VALUES (?, ?, 'selesai', 100, NOW())
       ON DUPLICATE KEY UPDATE status = 'selesai', persen_selesai = 100, selesai_at = NOW()`,
      [userId, modulId]
    );

    // Get XP reward
    const [[modul]] = await conn.query('SELECT xp_reward, mapel_id, urutan FROM modul WHERE id = ?', [modulId]);

    // Add XP to poin_log
    await conn.query(
      "INSERT INTO poin_log (user_id, jumlah, tipe, keterangan) VALUES (?, ?, 'modul', ?)",
      [userId, modul.xp_reward, `Selesai modul ID ${modulId}`]
    );

    // Unlock next module in same mapel
    const [[nextModul]] = await conn.query(
      'SELECT id FROM modul WHERE mapel_id = ? AND urutan = ?',
      [modul.mapel_id, modul.urutan + 1]
    );

    let newBadges = [];

    if (nextModul) {
      await conn.query(
        `INSERT INTO modul_progress (user_id, modul_id, status)
         VALUES (?, ?, 'tersedia')
         ON DUPLICATE KEY UPDATE status = IF(status = 'terkunci', 'tersedia', status)`,
        [userId, nextModul.id]
      );
    }

    // Check badges
    const [[{ modul_selesai }]] = await conn.query(
      "SELECT COUNT(*) AS modul_selesai FROM modul_progress WHERE user_id = ? AND status = 'selesai'",
      [userId]
    );

    // Badge: Pemula (1 modul)
    if (modul_selesai >= 1) {
      const [[existing]] = await conn.query(
        'SELECT id FROM user_badge WHERE user_id = ? AND badge_id = 1',
        [userId]
      );
      if (!existing) {
        await conn.query('INSERT IGNORE INTO user_badge (user_id, badge_id) VALUES (?, 1)', [userId]);
        newBadges.push({ id: 1, nama: 'Pemula', ikon_nama: 'star-outline', warna_hex: '#EF9F27' });
      }
    }

    // Badge: Rajin Belajar (5 modul)
    if (modul_selesai >= 5) {
      const [[existing]] = await conn.query(
        'SELECT id FROM user_badge WHERE user_id = ? AND badge_id = 2',
        [userId]
      );
      if (!existing) {
        await conn.query('INSERT IGNORE INTO user_badge (user_id, badge_id) VALUES (?, 2)', [userId]);
        newBadges.push({ id: 2, nama: 'Rajin Belajar', ikon_nama: 'book', warna_hex: '#378ADD' });
      }
    }

    // Badge: All Rounder (500 poin)
    const [[{ total_poin }]] = await conn.query(
      'SELECT COALESCE(SUM(jumlah), 0) AS total_poin FROM poin_log WHERE user_id = ?',
      [userId]
    );
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

    await conn.commit();
    res.json({ message: 'Modul selesai', xp_didapat: modul.xp_reward, new_badges: newBadges });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;
