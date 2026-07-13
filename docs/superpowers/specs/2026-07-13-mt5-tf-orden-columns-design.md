# Diseño: columnas TF y Orden en la pestaña MT5

## Contexto
`mt5.html` muestra la tabla de resultados live de MT5 por magic number. Ya tiene una columna
"Dir" (dirección observada, calculada contando trades Buy vs Sell reales — no se toca).
`sqx.html` ya tiene columnas "TF" (timeframe) y "Orden" (tipo de orden: Market/Buy Stop/Sell
Stop/Buy Limit/Sell Limit), derivadas de datos del bot (tabla `bots` en Supabase) que también
están disponibles en `mt5.html` vía `_botsByMagic[magic]` (mismo `sb.getBots()`).

## Objetivo
Agregar a `mt5.html` las columnas **TF** y **Orden**, replicando el patrón ya validado en
`sqx.html`, sin tocar la columna "Dir" existente ni su lógica de cálculo por trades reales.

## Fuente de datos
- **TF**: `bot.tf` (string, ya presente en el objeto bot de Supabase).
- **Orden**: `getEntryType(bot.pseudocodigo)`, función que vive en `pseudocode-order.js`
  (compartida por `sqx.html` e `index.html` para no desincronizar el parser). `mt5.html` no
  incluye hoy ese script — hay que agregar `<script src="pseudocode-order.js"></script>`.
- Bots sin `tf` o sin `pseudocodigo` muestran `—` (mismo patrón que sqx.html).

## Cambios en la tabla (`mt5.html`)
- Agregar `<th>` "Orden" y "TF" después de la columna "Dir" (mismo orden que sqx.html: Dir →
  Orden → TF), con `onclick="sortBy(...)"` igual que las demás columnas.
- En `renderTable()`, computar `orderType: getEntryType(bot?.pseudocodigo)` y `tf: bot?.tf` por
  fila, y renderizar las celdas correspondientes.
- Agregar `orderType` y `tf` a la tabla `KEY{}` de sorting.
- Ajustar el `colspan` de la fila de estado vacío ("Sin trades para mostrar...") para
  contemplar las 2 columnas nuevas.

## Cambios en filtros (`filters-bar`)
Replicar el patrón de sqx.html:
- Filtro **TF**: `<select id="f-tf">` poblado dinámicamente con los timeframes presentes en los
  bots vinculados (`[...new Set(...)].sort()`), opción "Todos" por defecto.
- Filtro **Orden**: `<select id="f-orden">` con opciones fijas: Todos / Market / Buy Stop /
  Sell Stop / Buy Limit / Sell Limit.
- Ambos filtros se aplican en `applyFilters()` (o `renderTable()`, según corresponda) filtrando
  sobre los mismos campos derivados.

## Fuera de alcance
- No se modifica la columna "Dir" existente (dirección observada de trades reales).
- No se agregan estos campos a ningún export/CSV.
- No se replica ninguna otra columna de sqx.html (PF, WR, Complexity, etc.) — ya existen
  equivalentes propios en MT5 con datos live.

## Testing
- Verificar visualmente en el navegador: bots con TF/Orden cargados muestran el dato correcto;
  bots sin pseudocódigo o sin tf muestran "—".
- Verificar que los filtros TF y Orden filtran correctamente la tabla.
- Verificar que el sorting por las columnas nuevas funciona (asc/desc).
- Verificar que la fila de estado vacío no rompe el layout (colspan correcto).
