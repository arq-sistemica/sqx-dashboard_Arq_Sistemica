-- Migración: agregar campos de broker a tabla accounts
-- Ejecutar en Supabase → SQL Editor

-- Agregar columnas si no existen
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS broker   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS server   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Comentarios para documentación
COMMENT ON COLUMN accounts.broker   IS 'Nombre del broker (ACCOUNT_COMPANY de MT5)';
COMMENT ON COLUMN accounts.server   IS 'Servidor MT5 (ACCOUNT_SERVER)';
COMMENT ON COLUMN accounts.currency IS 'Moneda base de la cuenta (ACCOUNT_CURRENCY)';
