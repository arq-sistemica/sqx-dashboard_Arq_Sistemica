-- ══════════════════════════════════════════════════════════════════
-- ETAPA 1 — Rediseño tabla bots
-- Fecha: 2026-06-06
--
-- Cambios:
--   - id TEXT (random) → BIGINT (magic number = dígitos del nombre)
--   - data JSONB (blob) → columnas planas tipadas
--   - Eliminados: source, magic_locked, mt5Data, myfxbookData, myfxbook, phase, stubs
--
-- EJECUTAR EN SUPABASE SQL EDITOR — verificar antes del Paso 6 (DROP)
-- ══════════════════════════════════════════════════════════════════

-- PREVIO: detectar colisiones de magic antes de migrar
-- (Correr esto primero y revisar el output — si hay duplicados, decidir cuál preservar)
SELECT
  REGEXP_REPLACE(data->>'name', '[^0-9]', '', 'g')::BIGINT AS magic,
  COUNT(*) AS cantidad,
  ARRAY_AGG(data->>'name') AS nombres
FROM bots
WHERE REGEXP_REPLACE(data->>'name', '[^0-9]', '', 'g') != ''
GROUP BY 1
HAVING COUNT(*) > 1;


-- ════════════════════════════
-- Paso 1: Renombrar tabla actual
-- ════════════════════════════
ALTER TABLE bots RENAME TO bots_legacy;


-- ════════════════════════════
-- Paso 2: Crear nueva tabla
-- ════════════════════════════
CREATE TABLE bots (
  user_id      UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  id           BIGINT      NOT NULL,
  PRIMARY KEY (user_id, id),

  -- Identidad
  name         TEXT        NOT NULL,
  symbol       TEXT        NOT NULL DEFAULT '',
  tf           TEXT        NOT NULL DEFAULT '',
  estado       TEXT        NOT NULL DEFAULT 'activo',  -- activo / pausado / descartado
  filter       TEXT,                                    -- PASSED / FAILED (de SQX Databank)

  -- IS metrics (del CSV Databank Export)
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
  -- IS stats no en CSV (nullable; future SQX export o entry manual)
  is_sqn       NUMERIC,
  is_stag      NUMERIC,
  is_zp        NUMERIC,

  -- OOS metrics (del CSV Databank Export)
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

  -- Full-period stats (del panel Overview de SQX — periodo IS+OOS completo)
  full_sqn         NUMERIC,
  full_stag        NUMERIC,
  full_zp          NUMERIC,
  full_str_quality NUMERIC,

  -- Datos complejos
  overview_data JSONB,  -- tabla mensual + curva equity (overviewData anterior)
  pseudocodigo  TEXT,   -- contenido del archivo Pseud_codigos/

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
-- Paso 4: Migrar datos
-- Magic = todos los dígitos del nombre concatenados
-- Ej: "Strategy 3.1.18(1) - Improved 5.1.6" → 31181516
-- ════════════════════════════
INSERT INTO bots (
  user_id, id, name, symbol, tf, estado, filter,
  is_pf,        is_cagr,      is_wr,        is_trades,    is_sharpe,
  is_dd,        is_np,        is_retdd,     is_cagrdd,    is_stability,
  is_fitness,   is_exposure,  is_rexp,
  oos_pf,       oos_cagr,     oos_wr,       oos_trades,   oos_sharpe,
  oos_dd,       oos_np,       oos_retdd,    oos_cagrdd,   oos_stability,
  oos_fitness,
  full_sqn,     full_stag,    full_zp,      full_str_quality,
  overview_data, pseudocodigo, added, notes
)
SELECT
  auth.uid()                                                                  AS user_id,
  REGEXP_REPLACE(data->>'name', '[^0-9]', '', 'g')::BIGINT                  AS id,
  data->>'name'                                                               AS name,
  COALESCE(data->>'symbol', '')                                               AS symbol,
  COALESCE(data->>'tf', '')                                                   AS tf,
  COALESCE(data->>'estado', 'activo')                                         AS estado,
  data->>'sqxFilter'                                                           AS filter,
  -- IS
  (data->'is'->>'pf')::NUMERIC,
  (data->'is'->>'cagr')::NUMERIC,
  (data->'is'->>'wr')::NUMERIC,
  (data->'is'->>'trades')::INTEGER,
  (data->'is'->>'sharpe')::NUMERIC,
  (data->'is'->>'dd')::NUMERIC,
  (data->'is'->>'np')::NUMERIC,
  (data->'is'->>'retdd')::NUMERIC,
  (data->'is'->>'cagrdd')::NUMERIC,
  (data->'is'->>'stability')::NUMERIC,
  (data->'is'->>'fitness')::NUMERIC,
  (data->'is'->>'exposure')::NUMERIC,
  (data->'is'->>'rexp')::NUMERIC,
  -- OOS
  (data->'oos'->>'pf')::NUMERIC,
  (data->'oos'->>'cagr')::NUMERIC,
  (data->'oos'->>'wr')::NUMERIC,
  (data->'oos'->>'trades')::INTEGER,
  (data->'oos'->>'sharpe')::NUMERIC,
  (data->'oos'->>'dd')::NUMERIC,
  (data->'oos'->>'np')::NUMERIC,
  (data->'oos'->>'retdd')::NUMERIC,
  (data->'oos'->>'cagrdd')::NUMERIC,
  (data->'oos'->>'stability')::NUMERIC,
  (data->'oos'->>'fitness')::NUMERIC,
  -- Full-period (del overviewData — NOT IS/OOS specific)
  (data->'overviewData'->>'sqn')::NUMERIC,
  (data->'overviewData'->>'stag')::NUMERIC,
  COALESCE((data->'overviewData'->>'zp'), (data->>'zp'))::NUMERIC,
  (data->'overviewData'->>'strQuality')::NUMERIC,
  -- JSON + texto
  data->'overviewData'                                                         AS overview_data,
  data->>'pseudocodigo'                                                        AS pseudocodigo,
  -- Metadata
  NULLIF(data->>'added', '')::DATE,
  COALESCE(data->>'notes', '')
FROM bots_legacy
WHERE REGEXP_REPLACE(data->>'name', '[^0-9]', '', 'g') != ''
ON CONFLICT (user_id, id) DO NOTHING;  -- duplicados: gana el primero insertado


-- ════════════════════════════
-- Paso 5: Verificar
-- ════════════════════════════
SELECT COUNT(*) AS migrados FROM bots;
SELECT COUNT(*) AS legacy   FROM bots_legacy;

-- Spot-check magic
SELECT id, name, is_pf, oos_pf, full_sqn FROM bots LIMIT 10;

-- Verificar ejemplo específico
SELECT id, name FROM bots WHERE name LIKE '%3.1.18%';
-- Esperado: id = 311815 ó 31181516 según el nombre exacto


-- ════════════════════════════
-- Paso 6: Eliminar tabla legacy (solo si verificación OK)
-- ════════════════════════════
-- DROP TABLE bots_legacy;
