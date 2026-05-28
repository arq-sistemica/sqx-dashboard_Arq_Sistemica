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

### Capa 3 — Portfolio e inteligencia ⬜ (diseñado, no implementado)
¿Qué bots conviven bien juntos?
- Correlación en tiempo real entre bots activos
- Equity curve combinada
- Evitar exposición concentrada en el mismo activo/lógica

### Capa 4 — Optimización ⬜ (visión)
¿Cómo mejorar los bots existentes?
- **Overlap inteligente**: cruzar pseudocódigo + resultados live
- Identificar qué indicadores/combinaciones correlacionan con buen PF
- Identificar qué combinaciones correlacionan con alto DD
- Sugerencias concretas: "Bot X usa Bollinger en XAUUSD → históricamente bajo en este período"
- Ciclo de feedback: dashboard → SQX → bot mejorado → dashboard

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

### 3. Duplicados fed26_ — limpieza
**Qué es:** SQL que fusiona bots `fed26_` con sus pares SQX y elimina los duplicados.
**Por qué:** Base de datos limpia antes de construir features nuevas.

### 4. Detección de duplicados en import CSV
**Qué es:** Al cargar CSV, si el nombre ya existe preguntar: "¿Actualizar o crear nuevo?"
**Por qué:** Previene que vuelvan a crearse duplicados.

### 5. overlap.html — migrar a Supabase
**Qué es:** Cargar bots directo de Supabase (hoy depende de localStorage).

### 6. Histórico de trades — importación masiva
**Qué es:** Script para importar trades anteriores a la instalación del EA.

---

## Features futuras

### Overlap inteligente (Capa 4)
- Leer pseudocódigo de cada bot → extraer indicadores y condiciones de entrada
- Cruzar con performance real (trades) → encontrar patrones
- Mostrar: "Los bots con RSI en H4 tienen PF promedio 1.4 en los últimos 90 días"
- Mostrar: "Los bots con 3+ indicadores tienen WR menor que los de 1-2"
- Generar sugerencias por bot: qué cambiar para mejorar

### Portfolio Builder
- Selección de bots con checklist
- Equity curve combinada desde trades reales
- Métricas del conjunto: PF, DD, correlación
- "Este portfolio tiene 70% de exposición en XAUUSD — diversificar"

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
| 2026-05-28 | ranking.html usa trades de Supabase |
| 2026-05-28 | Token EA visible en Config del dashboard |
| 2026-05-28 | Carpeta docs/ creada con arquitectura y roadmap |
