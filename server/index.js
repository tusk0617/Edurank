require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/modul', require('./routes/modul'));
app.use('/api/assessment', require('./routes/assessment'));
app.use('/api/guru', require('./routes/guru'));

// Web siswa (browser-based assessment)
app.use('/siswa', express.static(path.join(__dirname, 'public/siswa')));
app.get('/siswa', (req, res) => res.sendFile(path.join(__dirname, 'public/siswa/index.html')));
app.get('/siswa/home', (req, res) => res.sendFile(path.join(__dirname, 'public/siswa/home.html')));
app.get('/siswa/assessment', (req, res) => res.sendFile(path.join(__dirname, 'public/siswa/assessment.html')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EduRank server running on port ${PORT}`);
});
