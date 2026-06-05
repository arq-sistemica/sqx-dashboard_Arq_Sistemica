# Comprensión de Entradas — Estrategias AUDUSD
**Generado:** 04/05/2026  
**Actualizado:** 04/05/2026 — incorpora cruce databank SQX vs métricas live  
**Par:** AUDUSD / H1  
**Backtested:** 2006.01.01 – 2026.02.09  
**Track record live:** 22/01/2026 – 04/05/2026 | Incubadora ~50 bots | Base $10,000 por bot

---

> **ADVERTENCIA SOBRE EL ANÁLISIS ANTERIOR**
> El primer análisis de métricas (basado en la cuenta IC Markets sin filtrar) mostraba a 4914
> como el mejor bot (+$101) y a 2719 como segundo. Esos números estaban distorsionados porque
> los magic numbers de múltiples bots se superponían en la misma cuenta.
> El filtro individual de Myfxbook por magic number invierte el ranking completamente.
> **Los números de este documento son los correctos.**

---

## RANKING REAL (filtro Myfxbook individual)

| Posición | Bot | Profit live | Drawdown | G/DD ratio | Fitness IS | Veredicto |
|----------|-----|-------------|----------|------------|------------|-----------|
| **1°** | **2719** | **+$156.63** | **1.29%** | **1.22x** | 0.75 | **Mantener — único con edge real** |
| 2° | 2623 | +$6.39 | 1.94% | 0.03x | 0.80 | Observar — marginal |
| 3° | 4914 | -$15.68 | 2.56% | negativo | 0.76 | Revisar / Reemplazar |

---

## HALLAZGO CENTRAL: el ranking backtest es el INVERSO del ranking live

```
Ranking SQX IS (backtest):   2623 (mejor) → 4914 → 2719 (peor)
Ranking Myfxbook (live):     2719 (mejor) → 2623 → 4914 (peor)
```

El sistema con mejor fitness en backtest (2623, 0.80) es el peor en vivo.
El sistema con menor fitness en backtest (2719, 0.75) es el único con edge real en vivo.

**Causa:** Los tres sistemas tienen OOS = 0 en el databank. No existe validación
out-of-sample en SQX. El track record live enero–mayo 2026 es el OOS real,
y solo el 2719 lo pasa.

---

## CRUCE BACKTEST vs LIVE — LOS TRES BOTS

### Tabla de degradación IS → live

| Métrica | **2719** IS | **2719** live | **4914** IS | **4914** live | **2623** IS | **2623** live |
|---------|------------|--------------|------------|--------------|------------|--------------|
| Net profit | $4,825 | +$156 | $5,301 | **-$15** | $6,436 | +$6 |
| Profit Factor | 1.18 | ~1.20 est. | 1.18 | <1.0 | 1.20 | <1.0 |
| Avg Win | $67.87 | $62.97 | $56.45 | $43.72 | $72.96 | **$35.41** |
| Avg Loss | $60.86 | $49.56 | $55.62 | $62.81 | $63.61 | $53.41 |
| Payoff | 1.12x | **1.27x** ↑ | 1.01x | 0.70x ↓ | 1.15x | **0.66x** ↓↓ |
| Stability IS | 0.77 | — | 0.89 | — | 0.85 | — |
| OOS | ⚠️ vacío | — | ⚠️ vacío | — | ⚠️ vacío | — |

**Lectura rápida:**
- 2719: payoff mejora en vivo vs backtest → señal de robustez real, sin overfitting
- 4914: payoff cae moderado, resultado negativo por contexto macro adverso
- 2623: avg win se reduce a la mitad ($72 → $35), payoff colapsa de 1.15x a 0.66x → degradación severa

---

## Strategy 2.7.19(1) — Improved 1.1.7 (Magic 2719) — MEJOR BOT

### Tipo de entrada
**Momentum bajista de confirmación doble — continuación de tendencia**

### Lógica en palabras simples
Requiere que tanto la estructura intraday como la diaria confirmen una tendencia bajista activa. Usa dos Parabolic SAR (rápido y lento) para confirmar dirección en H1, y exige que los máximos diarios lleven 5 barras cayendo por debajo del SAR rápido. Es el filtro más exigente del trío — y su principal ventaja.

### Condiciones exactas
```
1. PSAR(0.010, 0.3)[1] <= Low[1]
   → SAR rápido debajo del mínimo anterior → dirección bajista en H1

2. PSAR(0.020, 0.1)[1] <= Low[1]
   → SAR lento también debajo → doble confirmación bajista

3. HighDaily[1] < PSAR(0.01, 0.3)[1] durante 5 barras diarias
   → Máximos diarios llevan 5 días bajo el SAR → tendencia diaria confirmada
```

### Parámetros de gestión
| Parámetro | Valor |
|-----------|-------|
| Stop Loss | 2.9 × ATR(70) |
| Trailing Stop | 3.8 × ATR(179) |
| Take Profit | No — trailing + tiempo |
| Exit After | 15 H1 bars (~15h) |
| Lots | 0.25 |

### Métricas backtest SQX IS (2006–2026)
| Métrica | Valor |
|---------|-------|
| Net profit IS | $4,825.54 |
| Trades IS | 901 (~45/año) |
| Profit Factor IS | 1.18 |
| Sharpe IS | 0.43 |
| Annual Return IS | 2.41% |
| Stability IS | 0.77 |
| Drawdown IS | $1,348.97 |
| Ret/DD ratio IS | 3.58 |
| Avg Win IS | $67.87 |
| Avg Loss IS | $60.86 |
| Payoff IS | 1.12x |
| Avg Bars in Trade IS | 13.25 |
| Fitness IS | 0.75 |
| OOS | ⚠️ sin datos |

### Métricas live (22/01/2026 – 04/05/2026)
| Métrica | Valor |
|---------|-------|
| Gain live | +1.57% |
| Profit neto | +$156.63 |
| Drawdown | 1.29% |
| G/DD ratio | 1.22x |
| Highest equity | $10,254.77 (13 Abr) |

### Diagnóstico IS → live
El payoff sube de 1.12x a 1.27x en vivo respecto al backtest — comportamiento contrario a lo esperado en sistemas overfitted. El avg loss cae ($60.86 → $49.56) porque el trailing stop también corta pérdidas cuando la señal falla rápido. Cuando captura una tendencia real, la deja correr y genera winners mayores que en backtest.

**El filtro de 5 días no es una debilidad — es su escudo.** En el entorno alcista de enero–mayo 2026, no disparó durante el rally → no acumuló pérdidas. Disparó en las correcciones reales (Abr 8-10) → capturó +$220 en 3 días con trailing.

### Acción
**No tocar.** Es el único bot con edge demostrado IS + live. Si se escala sizing, empezar por este (de 0.25 a 0.30 lots cuando el contexto bajista se confirme por ≥5 días).

---

## Strategy 2.6.23 — Improved 2.1.4 (Magic 2623) — MARGINAL

### Tipo de entrada
**Fade de breakout sobreextendido — reversión post-ruptura del PDH**

### Lógica en palabras simples
Entra Short después de que el precio ya rompió el máximo del día anterior y lleva 7 horas sosteniendo esa ruptura, además el cierre supera el mayor open de las últimas 40 barras. Apuesta a que el breakout es falso y revertirá.

### Condiciones exactas
```
1. High[1] > HighDaily[1] durante 7 barras consecutivas
   → H1 lleva 7h por encima del PDH → ruptura sostenida confirmada

2. Highest(40, PRICE_OPEN)[1] <= Close[1]
   → Cierre >= mayor open de las últimas 40 barras → sobreextensión
```

### Parámetros de gestión
| Parámetro | Valor |
|-----------|-------|
| Stop Loss | 2.7 × ATR(30) |
| Take Profit | No — corre hasta SL o tiempo |
| Exit After | 14 H1 bars (~14h) |
| Lots | 0.30 |

### Métricas backtest SQX IS (2006–2026)
| Métrica | Valor |
|---------|-------|
| Net profit IS | $6,436.52 — mayor del trío |
| Trades IS | 1,027 (~51/año) |
| Profit Factor IS | 1.20 — mayor del trío |
| Sharpe IS | 0.49 |
| Annual Return IS | 3.22% — mayor del trío |
| Stability IS | 0.85 |
| Drawdown IS | $1,325.69 — menor del trío |
| Ret/DD ratio IS | 4.86 — mayor del trío |
| Avg Win IS | $72.96 — mayor del trío |
| Avg Loss IS | $63.61 |
| Payoff IS | 1.15x |
| Avg Bars in Trade IS | 12.39 |
| Fitness IS | 0.80 — mayor del trío |
| OOS | ⚠️ sin datos |

### Métricas live (22/01/2026 – 04/05/2026)
| Métrica | Valor |
|---------|-------|
| Gain live | +0.06% |
| Profit neto | +$6.39 |
| Drawdown | 1.94% |
| G/DD ratio | 0.03x |
| Highest equity | $10,175.96 (10 Abr) |

### Diagnóstico IS → live — degradación severa
| | IS | Live | Cambio |
|--|----|----|--------|
| Avg Win | $72.96 | $35.41 | **-51%** |
| Avg Loss | $63.61 | $53.41 | -16% |
| Payoff | 1.15x | 0.66x | **colapso** |

El avg win se redujo a la mitad. En backtest capturaba reversiones de ~$73 promedio; en vivo solo logra ~$35. Sin TP fijo, el sistema depende de que el precio revierta lo suficiente antes del vencimiento de 14 barras — en un contexto macro alcista, los breakouts son reales y no revierten en ese plazo.

**Este es el mayor gap IS → live del trío y la señal de alerta más seria.** El fitness 0.80 del backtest fue engañoso — el sistema puede estar overfitted al período IS o las condiciones de mercado 2026 son estructuralmente distintas al promedio histórico.

### Acción
**Observar 15 trades más.** Umbral de decisión: si G/DD no supera 0.30x, reemplazar con versión regenerada en SQX usando datos actualizados post-2024.

---

## Strategy 4.9.14 — Improved 1.1.5 (Magic 4914) — EN NEGATIVO

### Tipo de entrada
**Fade de resistencia — toque del máximo diario con confirmación Fibonacci**

### Lógica en palabras simples
Espera que el precio toque el Daily High y verifica que una extensión Fibonacci (-23.6% del rango Open-Close del día anterior) lleve 7 barras por encima de ese Daily High. Entra Short cuando el precio toca ese techo con resistencia Fibonacci confirmada.

### Condiciones exactas
```
1. High[1] >= HighDaily[1]
   → H1 tocó o superó el máximo diario

2. Fibo(Open-Close prev. day, Level=-23.6) > HighDaily[1] durante 7 barras
   → Extensión Fibonacci 7 barras por encima del Daily High → resistencia confirmada
```

### Parámetros de gestión
| Parámetro | Valor |
|-----------|-------|
| Stop Loss | 2.5 × ATR(85) |
| Take Profit | 2.5 × ATR(85) — simétrico |
| Exit After | 8 H1 bars (~8h) |
| Lots | 0.30 |

### Métricas backtest SQX IS (2006–2026)
| Métrica | Valor |
|---------|-------|
| Net profit IS | $5,301.79 |
| Trades IS | 1,168 (~58/año) — mayor frecuencia del trío |
| Profit Factor IS | 1.18 |
| Sharpe IS | 0.51 — mayor del trío |
| Annual Return IS | 2.65% |
| Stability IS | 0.89 — mayor del trío |
| Drawdown IS | $1,344.88 |
| Ret/DD ratio IS | 3.94 |
| Avg Win IS | $56.45 |
| Avg Loss IS | $55.62 |
| Payoff IS | 1.01x — menor del trío |
| Avg Bars in Trade IS | 6.55 — hold más corto |
| Fitness IS | 0.76 |
| OOS | ⚠️ sin datos |

### Métricas live (22/01/2026 – 04/05/2026)
| Métrica | Valor |
|---------|-------|
| Gain live | -0.16% |
| Profit neto | -$15.68 |
| Drawdown | 2.56% — mayor del trío |
| G/DD ratio | negativo |
| Highest equity | $10,246.53 (26 Feb) |

### Diagnóstico IS → live
La Stability IS de 0.89 (la más alta del trío) indica que en backtest la curva de equity era la más suave y consistente. Pero esa estabilidad se construyó en 20 años donde el AUDUSD pasó por múltiples rangos y tendencias. En el tramo live (ene–may 2026), el mercado estuvo en tendencia alcista sostenida — exactamente el escenario donde el fade al Daily High genera pérdidas sistemáticas.

**La alta frecuencia de señales (1,168 trades en IS, ~58/año) fue un activo en backtest y un pasivo en vivo:** en tendencia alcista, el Daily High avanza cada sesión y el bot sigue shortando cada toque → acumula pérdidas pequeñas hasta que el DD supera cualquier ganancia acumulada.

### Contexto donde puede recuperarse
- Mercado en rango estricto (50-60 pips) durante semanas sin narrativa macro dominante
- AUDUSD pierde el sesgo alcista (pérdida sostenida de 0.7087)
- Baja volatilidad post-evento, sin catalizador direccional

### Acción
**Candidato a reemplazo.** Ya existe Magic 2623 que reemplazó a 4914 en DarwinexZero. Evaluar lo mismo en la incubadora. Alternativa: pausar hasta que AUDUSD pierda 0.7087 con convicción y el contexto macro cambie.

---

## Tabla comparativa completa — Backtest + Live

| | **2719** | **2623** | **4914** |
|--|---------|---------|---------|
| **Tipo de entrada** | Momentum bajista | Fade de breakout | Fade en resistencia |
| **Fitness IS** | 0.75 | **0.80** | 0.76 |
| **Net profit IS** | $4,825 | **$6,436** | $5,301 |
| **Stability IS** | 0.77 | 0.85 | **0.89** |
| **Payoff IS** | 1.12x | 1.15x | 1.01x |
| **Trades IS/año** | ~45 | ~51 | **~58** |
| **OOS** | ⚠️ vacío | ⚠️ vacío | ⚠️ vacío |
| **Profit live** | **+$156.63** | +$6.39 | -$15.68 |
| **Drawdown live** | **1.29%** | 1.94% | 2.56% |
| **G/DD live** | **1.22x** | 0.03x | negativo |
| **Degradación payoff** | +0.15x ↑ | **-0.49x ↓↓** | -0.31x ↓ |
| **Veredicto** | **Mantener / Escalar** | Observar | Revisar / Reemplazar |

---

## Por qué el backtest fitness no predijo el ganador

El 2623 tiene el mayor fitness IS (0.80), el mayor profit IS ($6,436), el mejor Ret/DD IS (4.86) — y es el segundo peor en vivo. El 2719 tiene el menor fitness IS (0.75) — y es el único con G/DD positivo en vivo.

La explicación:

```
2623 — alta señal en IS porque:
  Backtest 2006-2026 incluye muchos rangos donde los breakouts revertierten
  → avg win $72.96, payoff 1.15x en 20 años de data mixta
  Sin OOS, el sistema no fue desafiado con datos fuera de muestra
  En vivo (2026 alcista), los breakouts son reales → avg win colapsa a $35

2719 — señal moderada en IS porque:
  El filtro de 5 días reduce la frecuencia de trades → menor profit absoluto
  Pero cada señal tiene mayor calidad → payoff 1.12x consistente
  La lógica es suficientemente simple para generalizar fuera del IS
  En vivo el filtro lo protege en el entorno alcista → G/DD 1.22x
```

**Lección:** fitness IS alto sin OOS puede reflejar overfitting al período de optimización. La robustez real se mide en G/DD live, no en fitness IS.

---

## Jerarquía de activación por contexto de mercado

### Contexto A — Rango lateral (0.700–0.722), sin tendencia clara
```
4914 → ACTIVA (su contexto natural — puede recuperarse)
2623 → ACTIVA con cautela (sobreextensiones en 0.7200+)
2719 → INACTIVA (no construye 5 días bajistas en rango)
```

### Contexto B — Corrección bajista sostenida (pérdida de 0.7087)
```
4914 → Se desactiva (Daily High baja, Fibo pierde relevancia)
2623 → Se desactiva (precio no está sobre el PDH)
2719 → SE ACTIVA → contexto ideal, trailing captura el movimiento
```

### Contexto C — Ruptura alcista genuina (superación de 0.7222)
```
4914 → PELIGRO — Daily High sigue subiendo, el bot sigue shortando
2623 → PELIGRO — entra Short contra el breakout real
2719 → INACTIVA — se protege solo, no dispara
```

---

## Acciones concretas para capitalizar mejor

### Inmediatas
1. **Bot 2719 → No modificar.** Único con edge IS + live confirmado. Si se escala, subir de 0.25 a 0.30 lots cuando aparezca la próxima señal en contexto bajista confirmado (≥5 días).

2. **Bot 4914 → Decisión pendiente.** Opciones por orden de preferencia:
   - Pausar mientras AUDUSD mantenga sesgo macro alcista
   - Reemplazar con EA regenerado en SQX con datos post-2024
   - Reducir a 0.15 lots para limitar daño mientras se evalúa

3. **Bot 2623 → Monitorear.** 15 trades más. Umbral de corte: G/DD < 0.30x → reemplazar con versión regenerada en SQX.

### Para el mediano plazo
- **No agregar bots Short AUDUSD** hasta que el G/DD portfolio supere 0.50x consistente
- Regenerar 4914 y 2623 en SQX con datos 2020-2026 para ver si el edge persiste en datos recientes
- El 2719 demostró que en este entorno la combinación correcta es: **filtro exigente + trailing**, no **alta frecuencia + TP fijo**

---

## Evaluación mayo 2026

**Contexto:** Rango 0.700–0.722, macro bullish (Fed dovish + oro + China), resistencia 0.7197–0.7222, evento crítico 15/05 (nuevo Presidente Fed).

| Bot | Fit mayo | Riesgo específico |
|-----|---------|-------------------|
| **2719** | Neutro — no dispara en rango, se protege solo | Si dispara cerca del 15/05 y macro revierte al alza, trailing tarda en salir |
| **2623** | Bajo — macro alcista es su peor entorno | Puede entrar Short en 7h de subida sostenida si el macro sigue |
| **4914** | Muy bajo — Daily High sube con el macro | Cada señal es un Short contra el trend macro |

**Alerta 13–15 mayo:** Semana del anuncio del nuevo Presidente Fed. Si es dovish → USD baja → AUDUSD sube fuerte. Mayor riesgo para 4914 y 2623 que puedan abrir Short justo antes del evento.

---

## Métricas globales del portfolio AUDUSD (referencia Myfxbook)

| Métrica | Valor |
|---------|-------|
| Gain total | +2.10% (+$209.57) |
| Monthly avg | +0.60% |
| Drawdown máximo | 5.14% |
| Profit Factor | 1.26 |
| Z-Score | -2.44 (99.99%) — edge no aleatorio |
| Expectancy | $5.82 por trade / 3.9 pips |
| Balance | $10,209.57 |

---

*Documento generado por Claude Code | claude-sonnet-4-6 | 04/05/2026*  
*Fuentes: DatabankExport_audusd.csv (SQX IS) + Myfxbook filtro individual — Incubadora AUDUSD*  
*Magic numbers: 2719 / 4914-4914115 / 2623-2623214*
