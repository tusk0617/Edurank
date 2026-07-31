const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const adminOnly = [verifyToken, requireRole('admin')];

// GET /api/admin/users
router.get('/users', ...adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nama, email, role, created_at
       FROM users
       WHERE role IN ('siswa', 'guru')
       ORDER BY role DESC, nama ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', ...adminOnly, async (req, res) => {
  try {
    const [[{ total_siswa }]] = await pool.query("SELECT COUNT(*) AS total_siswa FROM users WHERE role = 'siswa'");
    const [[{ total_guru }]] = await pool.query("SELECT COUNT(*) AS total_guru FROM users WHERE role = 'guru'");
    res.json({ total_siswa, total_guru });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/users
router.post('/users', ...adminOnly, async (req, res) => {
  const { nama, email, password, role } = req.body;
  if (!nama || !email || !password || !role) {
    return res.status(400).json({ message: 'Nama, email, password, dan role wajib diisi' });
  }
  if (!['siswa', 'guru'].includes(role)) {
    return res.status(400).json({ message: 'Role tidak valid' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, ?)',
      [nama, email, hashed, role]
    );
    res.status(201).json({ message: 'Akun berhasil dibuat', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/reset-password
router.put('/users/:id/reset-password', ...adminOnly, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password minimal 6 karakter' });
  }
  try {
    const [[user]] = await pool.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    if (!['siswa', 'guru'].includes(user.role)) {
      return res.status(403).json({ message: 'Tidak dapat mereset password akun ini' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
    res.json({ message: 'Password berhasil direset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', ...adminOnly, async (req, res) => {
  try {
    const [[user]] = await pool.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    if (!['siswa', 'guru'].includes(user.role)) {
      return res.status(403).json({ message: 'Tidak dapat menghapus akun ini' });
    }
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Akun berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
