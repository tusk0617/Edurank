-- ============================================================
-- MIGRATION: Tambah kolom username, buat email nullable
-- Jalankan sekali di database Clever Cloud
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE NULL AFTER id,
  MODIFY COLUMN email VARCHAR(100) NULL;
