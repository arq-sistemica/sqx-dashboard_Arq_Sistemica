# Roadmap — Pendientes y Próximos Pasos

## Pendientes prioritarios

### 1. Magic numbers sin asignar
**Problema:** Bots sin campo `magic` no muestran datos live automáticamente.
**Solución:** UI o SQL para asignar el magic number a cada bot.
**Impacto:** Alto — desbloquea datos live para todos los bots.

### 2. Duplicados fed26_
**Problema:** El sistema viejo creaba bots duplicados (fed26_ + SQX) porque MT5 truncaba el nombre a 31 chars.
**Solución:** SQL que fusione: copia mt5Data del fed26_ al SQX correspondiente, borra el fed26_.
**Impacto:** Alto — limpia la base de datos.

### 3. Detección de duplicados en import
**Problema:** Al cargar un CSV nuevo, si el bot ya existe se crea otro duplicado.
**Solución:** Al importar CSV, detectar nombre similar y preguntar: "¿Actualizar existente o crear nuevo?"
**Impacto:** Alto — previene futuros duplicados.

### 4. overlap.html — migrar a Supabase
**Problema:** Depende de localStorage populado por index.html. Si se abre directo, no funciona.
**Solución:** Cargar bots directo de Supabase como hace ranking.html.
**Impacto:** Medio.

### 5. Histórico de trades
**Problema:** Trades anteriores a la instalación del EA (TradeCapture_v3) no están en Supabase.
**Solución:** Script de importación o carga manual de historial MT5.
**Impacto:** Medio — mejora las métricas históricas.

### 6. estacionalidad.html — conectar bots activos via Supabase
**Problema:** Los bots activos se leen desde localStorage, no desde Supabase.
**Solución:** Cargar bots activos desde Supabase para marcar los pares en la tabla estacional.
**Impacto:** Bajo.

---

## Features futuras

### Portfolio Builder
Página `portfolio.html` para construir y analizar carteras de bots.
- Selección de bots con checklist
- Equity curve combinada (suma de trades reales)
- Métricas del conjunto: PF, DD, correlación entre bots
- Fuente: tabla `trades` de Supabase

### Correlación SQX vs Live
Comparar backtest vs performance real por bot.
- PF backtest vs PF live
- Equity curve backtest superpuesta con equity live
- Detectar divergencia entre lo prometido y lo real

### Multi-usuario / Producto vendible
- Cada usuario tiene sus propios bots y trades (RLS ya implementado)
- Token EA personal (ya implementado)
- Manual de instrucciones para onboarding
- Posibilidad de vincular/desvincular cuentas MT5 entre usuarios

---

## Historial de cambios importantes

| Fecha | Cambio |
|---|---|
| 2026-05-28 | Migración completa a Supabase (abandono GitHub API + localStorage) |
| 2026-05-28 | TradeCapture_v3.mq5 — EA envía trades directo a Supabase |
| 2026-05-28 | Edge Function `record-trade` deployada |
| 2026-05-28 | Métricas live automáticas por magic number en index.html |
| 2026-05-28 | ranking.html usa trades de Supabase directamente |
| 2026-05-28 | Token EA visible en ⚙ Config del dashboard |
