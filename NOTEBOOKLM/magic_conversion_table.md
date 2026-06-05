# Tabla de conversión de Magic Numbers

Generada 2026-06-05. Usar para:
1. UPDATE en Supabase (trades históricos)
2. Cambio de magic en MT5
3. Referencia futura

## Conversiones confirmadas

| Magic viejo | Magic correcto | Símbolo |
|---|---|---|
| 334 | 334515 | GBPJPY |
| 1119 | 11192414 | AUDJPY |
| 1222 | 1222415 | XAUUSD |
| 1263 | 1263114 | EURUSD |
| 1315 | 1315314 | XAUUSD |
| 1319 | 13191116 | GBPJPY |
| 1420 | 1420314 | GBPJPY |
| 1452 | 1452315 | GBPJPY |
| 1514 | 1514117 | XAUUSD |
| 1555 | 1555115 | EURUSD |
| 1621 | 1621114 | GBPJPY |
| 1916 | 19162142 | AUDJPY |
| 1917 | 1917115 | XAUUSD |
| 2225 | 2225417 | XAUUSD |
| 2325 | 2325316 | XAUUSD |
| 2620 | 2620215 | XAUUSD |
| 2642 | 2642214 | GBPJPY |
| 3117 | 3117215 | XAUUSD |
| 3118 | 3118114 | XAUUSD |
| 3145 | 3145314 | GBPJPY |
| 3315 | 3315514 | AUDJPY |
| 3845 | 3845514 | EURUSD |
| 4125 | 41253314 | XAUUSD |
| 4126 | 41263314 | XAUUSD |
| 4217 | 421711151 | GBPJPY |
| 4642 | 4642317 | EURUSD |
| 4718 | 47181214 | GBPJPY |
| 47181 | 47181214 | GBPJPY |
| 43261 | 43261416 | GBPJPY |
| 9125 | 9125 | NDX |
| 11111 | 41253314 | XAUUSD |

## Identificados posteriormente

| Magic viejo | Magic correcto | Estrategia | Símbolo |
|---|---|---|---|
| 2718 | 27181115 | Strategy_2_7_18_Improved_1_1_5 | XAUUSD |
| 191751 | 1917516 | Strategy_1_9_17_1_Improved_5_1_6 | XAUUSD |

## Notas
- Magic 0: trades de balance/depósitos — filtrar siempre, nunca mostrar
- Cuentas: normalizar "Demo_oro" → "Demo_Oro" en Supabase
- 4718 y 47181 son el mismo bot (47181214)
- 11111 era el magic por defecto de SQX del bot 4125
