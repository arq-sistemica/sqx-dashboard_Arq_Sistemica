# SQX Dashboard — Arquitectura Sistémica

## Documentación del proyecto
- [`docs/arquitectura.md`](docs/arquitectura.md) — mapa completo del ecosistema y módulos
- [`docs/roadmap.md`](docs/roadmap.md) — pendientes y features futuras
- [`docs/convenciones.md`](docs/convenciones.md) — reglas de trabajo y convenciones

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
| `index.html` | Dashboard principal — tabla de bots, fichas, métricas, alertas live |
| `ranking.html` | Ranking live de bots por performance real |
| `overlap.html` | Análisis de correlación entre bots + intelligence panel (Capa 4) |
| `portfolio.html` | Portfolio Builder — equity combinada, métricas de conjunto (Capa 3) |
| `estacionalidad.html` | Estacionalidad anual por par/activo — carga bots desde Supabase |
| `supabase.js` | Cliente REST Supabase (sin librerías) |
| `CLAUDE.md` | Este archivo |
| `docs/TradeCapture_v3_historial_completo.mq5` | EA v3.10 — envía historial completo en primera ejecución |

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
render()                    // re-renderiza tabla completa — llamar siempre al modificar DB
getVD(bot, view)            // métricas según vista IS/OOS/Full
computeLiveMetrics(trades)  // agrupa trades por magic → {pf, ddPct, winRate, tradeList, netProfit}
buildMagicSummary(trades)   // trades → {magic: {topComment, count, symbols}} para sugerencias
renderMagicLinking()        // muestra panel de vinculación si hay bots sin magic
renderAlerts()              // panel Alertas Live: DD > 20%, PF < 1.0, inactividad > 7 días
applyOneMagic(botId)        // asigna magic a un bot desde el panel y guarda en DB local
saveAllMagics()             // guarda todos los magics del panel a Supabase
authGrant()                 // post-login: carga bots + trades, activa render + alertas + vinculación
saveToSupabase()            // upsert de DB completo a Supabase
markDirty()                 // marca cambios sin guardar
dismissAlerts()             // cierra panel de alertas por sesión (sessionStorage)
```

## portfolio.html — funciones clave
```js
initPortfolio()             // auth check → carga bots + trades → render lista
computeLiveByMagic(trades)  // igual que computeLiveMetrics pero solo PF, DD, WR, netProfit
toggleBot(magic)            // agrega/quita bot de la selección → re-renderiza análisis
renderAnalysis()            // equity curve + KPIs + concentración + ranking del portfolio
renderEquityCurve(trades)   // SVG combinado de todos los trades seleccionados
renderConcentration(trades) // barras por activo + warning si concentración > 60%
renderKPIs(metrics)         // tarjetas PF, DD, WR, Net P&L, periodo
```

## Variables globales post-login
```js
window.LIVE          // {[magic]: {pf, ddPct, winRate, tradeList}} — computeLiveMetrics(trades)
window._lastTrades   // array crudo de trades (para re-computar LIVE sin fetch)
window._magicSummary // {[magic]: {topComment, count, symbols}} — buildMagicSummary(trades)
```

## Vinculación MT5 ↔ Bots
- Campo clave: `bot.magic` (número mágico MT5)
- Panel "🔗 Vincular Magic Numbers" aparece al login si hay bots sin magic
- Auto-sugiere magic por similitud de nombre (`_normName()` normaliza ambos)
- `window.LIVE[String(bot.magic)]` → datos live del bot
- Si el bot no tiene `magic` asignado, no muestra datos live automáticamente

## Colores del sistema
- Verde: `#1a7f4b` | Amarillo: `#92400e` | Rojo: `#b91c1c`
- CSS vars: `--bg`, `--text`, `--text2`, `--text3`, `--border`, `--border2`, `--radius`
- CSS vars color: `--green`, `--green-bg`, `--red`, `--red-bg`, `--amber`, `--amber-bg`

## Reglas para modificar código
1. Leer solo el rango de líneas necesario (archivos ~4500+ líneas)
2. No agregar librerías externas
3. No romper el parser CSV existente (`parseCSV`, `parseOverview`)
4. `render()` siempre al final de cambios que afecten la tabla
5. git add → commit → push al terminar cada feature

## Reglas de eficiencia (ahorro de tokens)
- **Contexto primero**: leer archivos relevantes antes de escribir código. Si falta contexto, preguntar.
- **Edit, nunca Write** en archivos existentes salvo que el cambio sea >80% del archivo.
- **No releer** archivos ya leídos en la misma conversación.
- **Leer solo lo necesario**: usar `offset` y `limit` — nunca leer el archivo completo si solo se necesita una sección.
- **Paralelizar tool calls**: leer múltiples archivos independientes en un solo mensaje.
- **Validar antes de declarar hecho**: verificar que funciona antes de decir "listo".
- **Soluciones mínimas**: implementar solo lo pedido. Sin abstracciones, helpers ni features extra.
- **Sin narración**: no describir el plan antes de ejecutar ni copiar código editado en la respuesta.
- **Sin charla**: no usar "Excelente", "Perfecto", "Gran idea". Ir directo al trabajo.
- **Grep/Read antes que Agent**: Agent solo para búsquedas amplias o tareas complejas.

## Pendiente / Próximos pasos
1. **Instalar TradeCapture_v3 v3.10 en ambos VPS** — reemplazar archivo en MetaEditor, compilar, reiniciar EA, borrar GlobalVariables tc3_*
2. **Asignar magic numbers** — usar el panel "🔗 Vincular Magic Numbers" en el dashboard al hacer login
3. **Correlación matemática** — en portfolio.html, agregar correlación entre equity curves individuales
4. **Alertas externas** — Telegram/email/WhatsApp para alertas críticas (Capa 5 completa)
