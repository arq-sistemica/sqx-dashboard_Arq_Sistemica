# Arquitectura Sistémica — Mapa del Ecosistema

## Visión general

Sistema de análisis de trading algorítmico que conecta tres mundos:
- **SQX (StrategyQuant X)** — donde se crean y backtestean los bots
- **MT5 (MetaTrader 5)** — donde los bots operan en tiempo real
- **Dashboard web** — donde se visualiza todo junto

```
SQX (backtest)          MT5 (live)
     │                      │
   CSV export          TradeCapture_v3.mq5
     │                      │ WebRequest
     ▼                      ▼
  index.html         Edge Function (Supabase)
     │                      │
     └──────────────────────┘
              │
         Supabase DB
         ┌──────────┐
         │  bots    │  ← 131 bots con métricas SQX
         │  trades  │  ← trades live de MT5
         │user_token│  ← tokens de autenticación EA
         └──────────┘
              │
    ┌─────────┼──────────┬──────────┐
    ▼         ▼          ▼          ▼
index.html ranking.html overlap.html estacionalidad.html
```

---

## Módulos

### 1. index.html — Dashboard Principal
**Propósito:** Centro de control. Gestión de bots, carga de datos, métricas.

**Qué hace:**
- Login via Supabase (email/password)
- Carga bots + trades al login
- Calcula métricas live por magic number automáticamente
- Muestra PF/DD/WR tanto de backtest (SQX) como de live (MT5)
- Permite cargar CSV de SQX, Overview text, pseudocódigo
- Guarda cambios en Supabase

**Funciones clave:**
- `render()` — re-renderiza la tabla completa
- `computeLiveMetrics(trades)` — agrupa trades por magic → métricas
- `authGrant()` — post-login: carga bots + trades
- `getVD(bot, view)` — métricas según vista IS/OOS/Full

**Estado:** ✅ Completo

---

### 2. ranking.html — Ranking Live
**Propósito:** Tabla de posiciones ordenada por performance real.

**Qué hace:**
- Carga bots + trades frescos de Supabase al abrir
- Calcula PF, DD%, WinRate por magic number
- Rankea con sistema de puntaje ponderado
- Historial de snapshots semana a semana

**Estado:** ✅ Completo

---

### 3. overlap.html — Análisis de Correlación
**Propósito:** Visualizar cuánto se solapan los indicadores entre bots.

**Qué hace:**
- Muestra matriz de overlap entre pares de bots
- Detecta estrategias correlacionadas
- Ayuda a construir portfolios diversificados

**Estado:** ⚠️ Pendiente migrar a Supabase directo

---

### 4. estacionalidad.html — Análisis de Estacionalidad
**Propósito:** Ver en qué meses cada par históricamente sube o baja.

**Qué hace:**
- Tabla de pares × meses con colores (verde/rojo)
- Filtra por pares activos del dashboard
- Datos estacionales desde `bot_meta.json`

**Estado:** ⚠️ Datos estáticos, no conectado a trades live

---

### 5. TradeCapture_v3.mq5 — EA de Captura
**Propósito:** Puente entre MT5 y Supabase.

**Qué hace:**
- Corre en MT5 como Expert Advisor
- Captura cada trade cerrado
- Envía via WebRequest a Edge Function de Supabase
- Usa token personal para identificar al usuario

**Inputs del EA:**
- `UserToken` — UUID copiado desde ⚙ Config del dashboard
- `AccountLabel` — nombre de la cuenta ("Principal" / "Incubacion")

**Estado:** ✅ Corriendo en ambos VPS

---

## Infraestructura compartida

### supabase.js
Cliente REST sin librerías. Usado por todos los módulos HTML.

### Supabase
- URL: `https://ofrbktacgwbwsgpftoky.supabase.co`
- Tablas: `bots`, `trades`, `user_tokens`
- Edge Function: `record-trade`

### Vínculo clave: Magic Number
`bot.magic` es el puente entre SQX y MT5.
El dashboard hace `window.LIVE[String(bot.magic)]` para mostrar datos live automáticamente.

---

## Estado por módulo

| Módulo | Supabase | Trades live | Pendiente |
|---|---|---|---|
| index.html | ✅ | ✅ | Magic numbers sin asignar |
| ranking.html | ✅ | ✅ | — |
| overlap.html | ⚠️ | ❌ | Migrar a Supabase |
| estacionalidad.html | ❌ | ❌ | Conectar bots activos |
| TradeCapture_v3 | ✅ | ✅ | Importar histórico previo |
