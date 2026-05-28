# SQX Dashboard — Arquitectura Sistémica

## Proyecto
Dashboard web para analizar bots de trading de StrategyQuant X (SQX) y compararlos con resultados live de Myfxbook.

- **Archivo principal**: `index.html` (HTML puro, sin frameworks, sin servidor)
- **Datos**: `db_data.json` — base de datos de bots, se sincroniza con GitHub via API
- **Live**: https://arq-sistemica.github.io/sqx-dashboard_Arq_Sistemica
- **Repo**: github.com/arq-sistemica/sqx-dashboard_Arq_Sistemica

## Stack y restricciones CRÍTICAS
- HTML/CSS/JS puro — **sin librerías externas, sin npm, sin build step**
- Gráficos en **SVG puro** (sin Chart.js ni similar)
- Token de GitHub guardado en `localStorage` — no modificar esa lógica
- Persistencia vía GitHub API (commit directo al repo)
- Tema claro: fondo blanco, texto oscuro

## Colores del sistema (semáforo)
- Verde: `#1a7f4b`
- Amarillo: `#d97706`
- Rojo: `#b91c1c`
- Variables CSS: `--bg`, `--text`, `--text2`, `--border2`, `--radius`

## Estructura de datos de cada bot
Cada bot tiene:
- Métricas IS (in-sample) y OOS (out-of-sample): `pf`, `cagr`, `wr`, `trades`, `sharpe`, `dd`, `np`, `retdd`, `cagrdd`, `fitness`, `stability`
- Métricas globales: `sqn`, `stag` (stagnation days), `zp` (Z-probability)
- `overviewData`: datos completos del Overview de SQX (incluyendo tabla mensual)

## Vistas
Toggle IS / OOS / Full. La función `getVD(bot, view)` devuelve las métricas según la vista.
- **Full** = promedio IS+OOS para métricas numéricas, suma para trades y net profit, peor drawdown

## Criterios de evaluación (HobbieCode)
Los bots se evalúan con semáforo verde/amarillo/rojo según umbrales mínimos configurados.

## Fuentes de datos
- **SQX Databank CSV**: backtest metrics (IS/OOS)
- **SQX Overview text**: métricas adicionales — SQN, Stagnation, Z-Probability, tabla mensual de performance
- **Myfxbook**: resultados live (a integrar en features futuras)

## Features en desarrollo (roadmap)
1. **Correlación SQX vs Myfxbook** — comparar backtest vs live por bot (PF, WR, DD, equity curves superpuestas)
2. **Portfolio Builder** (`portfolio.html`) — selección de bots, equity combinada, métricas del conjunto

## Funciones clave a conocer
- `render()` — re-renderiza toda la tabla, llamar siempre después de modificar DB
- `updateBotDropdown()` — puebla selects de bots, llamar al final de `render()`
- `markDirty()` — marca que hay cambios sin guardar
- `parseOverview(text)` — parsea el texto del Overview de SQX
- `getVD(bot, view)` — devuelve métricas según vista IS/OOS/Full

## Reglas para modificar el código
- Leer solo el rango de líneas necesario, no el archivo completo
- No romper el parser CSV existente
- No agregar librerías externas
- Hacer commit y push a GitHub al terminar cada feature
