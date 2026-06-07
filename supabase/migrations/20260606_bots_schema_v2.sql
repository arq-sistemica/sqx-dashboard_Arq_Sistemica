-- ══════════════════════════════════════════════════════════════════
-- Migración tabla bots — esquema plano (sin data JSONB)
-- Fecha: 2026-06-06
--
-- EJECUTAR EN SUPABASE SQL EDITOR — un bloque a la vez
-- Tabla arranca vacía; repoblar via Scan SQX en sqx.html
-- ══════════════════════════════════════════════════════════════════


-- ════════════════════════════
-- Paso 1: Renombrar tabla actual
-- ════════════════════════════
ALTER TABLE bots RENAME TO bots_legacy;


-- ════════════════════════════
-- Paso 2: Crear tabla nueva (esquema plano)
-- ════════════════════════════
CREATE TABLE bots (
  user_id      UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  id           BIGINT      NOT NULL,
  PRIMARY KEY (user_id, id),

  -- Identidad
  name         TEXT        NOT NULL,
  symbol       TEXT        NOT NULL DEFAULT '',
  tf           TEXT        NOT NULL DEFAULT '',
  estado       TEXT        NOT NULL DEFAULT 'activo',
  filter       TEXT,

  -- IS metrics (CSV Databank Export)
  is_pf        NUMERIC,
  is_cagr      NUMERIC,
  is_wr        NUMERIC,
  is_trades    INTEGER,
  is_sharpe    NUMERIC,
  is_dd        NUMERIC,
  is_np        NUMERIC,
  is_retdd     NUMERIC,
  is_cagrdd    NUMERIC,
  is_stability NUMERIC,
  is_fitness   NUMERIC,
  is_exposure  NUMERIC,
  is_rexp      NUMERIC,
  is_sqn       NUMERIC,
  is_stag      NUMERIC,
  is_zp        NUMERIC,

  -- OOS metrics (CSV Databank Export)
  oos_pf        NUMERIC,
  oos_cagr      NUMERIC,
  oos_wr        NUMERIC,
  oos_trades    INTEGER,
  oos_sharpe    NUMERIC,
  oos_dd        NUMERIC,
  oos_np        NUMERIC,
  oos_retdd     NUMERIC,
  oos_cagrdd    NUMERIC,
  oos_stability NUMERIC,
  oos_fitness   NUMERIC,
  oos_sqn       NUMERIC,
  oos_stag      NUMERIC,
  oos_zp        NUMERIC,

  -- Full-period stats (panel Overview SQX)
  full_sqn         NUMERIC,
  full_stag        NUMERIC,
  full_zp          NUMERIC,
  full_str_quality NUMERIC,

  -- Datos complejos
  overview_data JSONB,
  pseudocodigo  TEXT,

  -- Metadata
  added         DATE        DEFAULT CURRENT_DATE,
  notes         TEXT        DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════
-- Paso 3: RLS
-- ════════════════════════════
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bots"
  ON bots FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════
-- Paso 4: Verificar (tabla debe estar vacía)
-- ════════════════════════════
SELECT COUNT(*) AS bots_nuevos FROM bots;
SELECT COUNT(*) AS bots_legacy FROM bots_legacy;
-- Esperado: bots_nuevos = 0, bots_legacy = 133


-- ════════════════════════════
-- Paso 5: Eliminar legacy (solo cuando todo funcione)
-- ════════════════════════════
-- DROP TABLE bots_legacy;
