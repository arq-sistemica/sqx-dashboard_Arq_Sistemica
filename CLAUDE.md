# SQX Dashboard — Arquitectura Sistémica

## Descripción
Dashboard web personal para analizar bots de trading de StrategyQuant X (SQX) con datos live de MT5 via Supabase.

- **Live**: https://arq-sistemica.github.io/sqx-dashboard_Arq_Sistemica
- **Repo**: github.com/arq-sistemica/sqx-dashboard_Arq_Sistemica
- **Local**: `C:\Users\Fede\Desktop\claude code\Arquitectura Sistemica\`

## Stack — RESTRICCIONES CRÍTICAS
- HTML/CSS/JS puro — **sin librerías externas, sin npm, sin build step**
- Gráficos en **SVG puro** (sin Chart.js ni similar)
- Tema claro: fondo blanco, texto oscuro
- Leer solo el rango de líneas necesario al editar — los archivos son grandes

## Archivos principales
| Archivo | Rol |
|---|---|
| `index.html` | Dashboard principal — tabla de bots, fichas, métricas |
| `ranking.html` | Ranking live de bots por performance real |
| `overlap.html` | Análisis de correlación entre bots |
| `supabase.js` | Cliente REST Supabase (sin librerías) |
| `CLAUDE.md` | Este archivo |

## Backend — Supabase
- **URL**: `https://ofrbktacgwbwsgpftoky.supabase.co`
- **Publishable key** (frontend, en supabase.js): `sb_publishable_OReO6Y5yhrK-BmPWf3fOhw_ODQ1-0_-`
- **Service key**: SOLO en `vps_secrets.py` (en .gitignore, NUNCA commitear)
- **Auth**: email/password, sesión en localStorage bajo clave `sb_arq_session`
- **Tablas**: `bots` (131 bots), `trades` (crece diariamente), `user_tokens`, `accounts`, `bot_results`
- **Edge Function**: `record-trade` — recibe trades del EA via POST, valida token, inserta en `trades`

## Pipeline de datos
```
MT5 EA (TradeCapture_v3.mq5)
  → WebRequest POST a Edge Function
  → valida token en user_tokens
  → inserta en tabla trades (ticket+account_id únicos)
  → Dashboard lee trades via sb.getMyTrades()
  → computeLiveMetrics() agrupa por magic → PF, DD, WR
  → se muestra automáticamente en bots con magic number coincidente
```

## Estructura de datos — Bot
```js
{
  id: string,          // PK en Supabase (texto único)
  name: string,
  symbol: string,
  tf: string,          // timeframe
  magic: number,       // magic number MT5 — clave de vinculación con trades
  direction: string,
  source: 'csv'|'manual',
  estado: string,
  // Métricas IS/OOS: pf, cagr, wr, trades, sharpe, dd, np, retdd, cagrdd, fitness, stability, sqn, stag, zp
  overviewData: {...},       // Overview SQX (tabla mensual, curva equity)
  mt5Data: {...},            // Datos MT5 cargados manualmente (legacy)
  pseudocodigoData: {...},
}
```

## supabase.js — API disponible
```js
sb.signIn(email, pw)     // login → guarda sesión en localStorage
sb.signUp(email, pw)     // registro
sb.signOut()
sb.isAuthenticated()     // verifica expiración del token
sb.getToken()            // access_token de la sesión
sb.getBots()             // GET /rest/v1/bots → [{id, ...data}]
sb.upsertBots(bots)      // POST con resolution=merge-duplicates
sb.deleteBot(id)
sb.getMyTokens()         // tokens EA del usuario
sb.getMyTrades()         // todos los trades del usuario (orden close_time)
```

## Funciones clave — index.html
```js
render()                 // re-renderiza tabla completa — llamar siempre al modificar DB
getVD(bot, view)         // métricas según vista IS/OOS/Full
computeLiveMetrics(trades) // agrupa trades por magic → {pf, ddPct, winRate, tradeList}
authGrant()              // post-login: carga bots + trades, activa render
saveToSupabase()         // upsert de DB completo a Supabase
markDirty()              // marca cambios sin guardar
```

## Vinculación MT5 ↔ Bots
- Campo clave: `bot.magic` (número mágico MT5)
- `window.LIVE = computeLiveMetrics(trades)` — disponible globalmente post-login
- Acceso: `window.LIVE[String(bot.magic)]` → {pf, ddPct, winRate, tradeList}
- Si el bot no tiene `magic` asignado, no muestra datos live automáticamente

## Colores del sistema
- Verde: `#1a7f4b` | Amarillo: `#d97706` | Rojo: `#b91c1c`
- CSS vars: `--bg`, `--text`, `--text2`, `--border`, `--border2`, `--radius`

## Reglas para modificar código
1. Leer solo el rango de líneas necesario (archivos ~4000+ líneas)
2. No agregar librerías externas
3. No romper el parser CSV existente (`parseCSV`, `parseOverview`)
4. `render()` siempre al final de cambios que afecten la tabla
5. git add → commit → push al terminar cada feature

## Pendiente / Próximos pasos
1. **Magic numbers** — asignar `magic` a bots que no lo tienen (UI o SQL)
2. **overlap.html** — actualizar para usar trades de Supabase
3. **Histórico** — importar trades anteriores a la instalación del EA
4. **Portfolio Builder** — equity combinada de múltiples bots
