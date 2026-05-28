# Roadmap — Pendientes y Próximos Pasos

---

## Visión del producto

**"Un sistema de mejora continua para traders algorítmicos."**

No es solo ver cómo van los bots. Es un ciclo completo:

```
SQX genera bot
    ↓
Dashboard lo sigue (trades live)
    ↓
Overlap cruza lógica + resultados
    ↓
Sistema sugiere qué cambiar
    ↓
Usuario mejora el bot en SQX
    ↓
Vuelve al inicio con mejor versión
```

**Propuesta de valor:**
> "Sabés qué bots tenés, cuándo correrlos, cuáles combinan bien,
> y el sistema te avisa cuando algo sale mal."

---

## Las 4 capas del producto

### Capa 1 — Seguimiento ✅ (implementado)
¿Cómo está funcionando cada bot?
- Backtest vs live, PF, DD, WR en tiempo real
- Trades desde MT5 via TradeCapture_v3
- Métricas automáticas por magic number

### Capa 2 — Contexto ⚠️ (existe, mejorar)
¿En qué condiciones opera mejor cada bot?
- Estacionalidad por activo → saber cuándo activar o pausar
- Conectar bots activos con calendario estacional
- "Este par históricamente cae en Q1 — pausar bots de XAUUSD"

### Capa 3 — Portfolio e inteligencia ✅ (implementado 2026-05-28)
¿Qué bots conviven bien juntos?
- ✅ Equity curve combinada desde trades reales (portfolio.html)
- ✅ Métricas del conjunto: PF, DD, WR, Net P&L, periodo
- ✅ Concentración por activo — warning si > 60% en un solo par
- ✅ Ranking de bots del portfolio ordenados por PF
- ✅ Checklist con chips — selección interactiva
- ⬜ Correlación matemática en tiempo real entre bots activos

### Capa 4 — Optimización ⚠️ (parcialmente implementado)
¿Cómo mejorar los bots existentes?
- ✅ **Indicadores × Performance**: en overlap.html, para cada indicador muestra PF promedio y DD promedio de bots live que lo usan
- ✅ Identifica qué indicadores correlacionan con mejor PF y menor DD
- ⬜ Sugerencias concretas por bot: "Bot X usa Bollinger → avg PF 0.98 en tu portfolio"
- ⬜ Ciclo de feedback: dashboard → SQX → bot mejorado → dashboard

### Capa 5 — Alertas ⬜ (futuro)
¿Qué está pasando ahora mismo?
- Bot fuera de parámetros históricos
- Drawdown elevado → notificación
- Estación desfavorable → sugerencia de pausa
- Correlación peligrosa entre bots activos → aviso

---

## Flujo de onboarding (producto vendible)

```
PASO 1 — Cargar CSV de SQX
  → Bots creados con métricas de backtest
  → Estado: "Sin vincular"

PASO 2 — Instalar TradeCapture_v3 en MT5
  → Trades llegan a Supabase (historial completo + nuevos)
  → Estado: "Trades esperando vinculación"

PASO 3 — Vincular bots con magic numbers (una sola vez)
  → Dashboard sugiere matches por nombre similar
  → Usuario confirma con un clic
  → Vinculado para siempre

PASO 4 — Todo fluye automáticamente
  → Nuevos trades → métricas actualizadas
  → Overview y pseudocódigo → enriquecimiento opcional
```

**Regla del producto:** CSV primero, EA después. Sin bots creados, los trades no tienen donde aterrizar.

---

## Pendientes técnicos prioritarios

### 1. Pantalla de vinculación magic numbers ✅ (implementado 2026-05-28)
**Qué es:** Sección colapsable en index.html que muestra bots sin magic + sugerencias automáticas.
**Implementado:** `buildMagicSummary(trades)` + `suggestMagicForBot()` + `renderMagicLinking()` en index.html.
**Flujo:** Se abre al login si hay bots sin magic. Sugiere por similitud de nombre (comment MT5 = 31 chars del nombre).
**Funciones clave:** `applyOneMagic(botId)`, `saveAllMagics()`, `toggleMagicPanel()`.

### 2. TradeCapture_v3 — historial completo ✅ (desarrollado 2026-05-28)
**Qué es:** EA v3.10 que en la primera ejecución envía TODO el historial desde el año 2000.
**Implementado:** Archivo en `docs/TradeCapture_v3_historial_completo.mq5`.
**Pendiente:** Instalar en ambos VPS (reemplazar archivo en MetaEditor, compilar, reiniciar EA).

### 3. Duplicados fed26_ — limpieza ✅ (implementado 2026-05-28)
**Qué es:** `repairDuplicateBots()` corre automáticamente al login desde Supabase.
**Implementado:** `authGrant()` fusiona y guarda a Supabase si encuentra duplicados.
**Manual:** Botón "🧹 Limpiar duplicados" en ⚙ Configuración con reporte de cambios.

### 4. overlap.html — migrar a Supabase ✅ (implementado 2026-05-28)
**Implementado:** `loadAndRender()` async con 3 niveles: localStorage → Supabase → pantalla bienvenida.
**Nueva función:** `_botsToOverlapFormat(remoteBots, liveByMagic)` convierte bots de Supabase al formato DNA.

### 5. estacionalidad.html — conectar via Supabase ✅ (implementado 2026-05-28)
**Implementado:** `loadDashboard()` usa `sb.getBots()` si hay sesión, fallback a `bot_meta.json`.

### 6. Detección de duplicados en import CSV ⬜
**Qué es:** Al cargar CSV, si el nombre ya existe preguntar: "¿Actualizar o crear nuevo?"
**Estado:** Postergado — el merge automático actual cubre el caso principal correctamente.

### 7. Histórico de trades — importación masiva ⬜
**Qué es:** Script para importar trades anteriores a la instalación del EA.
**Estado:** Cubierto por TradeCapture_v3 v3.10 con historial completo desde año 2000.

---

## Mejoras UI implementadas (2026-05-28)
- **Columna PF⚡**: Profit Factor live en tabla principal, clickeable para ordenar
- **Filtro "Con live"**: Botón en barra de filtros para ver solo bots monitoreados
- **Stat "Con datos live"**: Tarjeta en el resumen muestra coverage (X / Total)
- **Orphan magics**: Panel vinculación muestra magic numbers sin bot asignado
- **supabase.js**: `getMyTrades()` incluye campo `comment` para auto-sugerencias

---

## Features futuras

### Overlap inteligente (Capa 4)
- Leer pseudocódigo de cada bot → extraer indicadores y condiciones de entrada
- Cruzar con performance real (trades) → encontrar patrones
- Mostrar: "Los bots con RSI en H4 tienen PF promedio 1.4 en los últimos 90 días"
- Mostrar: "Los bots con 3+ indicadores tienen WR menor que los de 1-2"
- Generar sugerencias por bot: qué cambiar para mejorar

### Portfolio Builder ✅ (implementado 2026-05-28)
- ✅ Selección de bots con checklist + chips
- ✅ Equity curve combinada desde trades reales (SVG)
- ✅ Métricas del conjunto: PF, DD, WR, Net P&L
- ✅ Concentración por activo con warning automático
- ⬜ Correlación matemática entre equity curves individuales

### Alertas y notificaciones
- DD elevado en un bot activo
- Bot con estación desfavorable activo
- Correlación peligrosa entre bots del portfolio
- Canal: email, WhatsApp, o dashboard interno

### Multi-usuario
- RLS ya implementado en Supabase
- Token EA personal ya implementado
- Falta: manual de onboarding, plan de precios, soporte

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-05-28 | Migración completa a Supabase |
| 2026-05-28 | TradeCapture_v3.mq5 — EA envía trades directo a Supabase |
| 2026-05-28 | Edge Function `record-trade` deployada |
| 2026-05-28 | Métricas live automáticas por magic number |
| 2026-05-28 | Panel vinculación magic numbers con sugerencias automáticas |
| 2026-05-28 | TradeCapture_v3 v3.10 — historial completo en primera ejecución |
| 2026-05-28 | overlap.html + estacionalidad.html migradas a Supabase |
| 2026-05-28 | Limpieza automática duplicados fed26_ en login |
| 2026-05-28 | Columna PF Live en tabla principal + filtro "Con live" |
| 2026-05-28 | ranking.html usa trades de Supabase |
| 2026-05-28 | Token EA visible en Config del dashboard |
| 2026-05-28 | Carpeta docs/ creada con arquitectura y roadmap |
| 2026-05-28 | buildMt5Block: Net P&L en lugar de Gain% para bots Supabase |
| 2026-05-28 | portfolio.html — Portfolio Builder (Capa 3) con equity combinada |
| 2026-05-28 | overlap.html — panel Indicadores × Performance Live (Capa 4 parcial) |
