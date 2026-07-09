// Detección del tipo de orden (Market/Buy Stop/Sell Stop/Buy Limit/Sell Limit)
// desde el pseudocódigo SQX. Única fuente de verdad — usada por sqx.html e
// index.html para que ambos parsers no puedan desincronizarse entre sí.
function getOrderBlocks(pseudo) {
  if (!pseudo) return {};
  const blocks = {};
  for (const m of pseudo.matchAll(/Open\s+(Long|Short)\s+order\s+at\s+([\s\S]*?);/gi)) {
    const isLong = /^long$/i.test(m[1]);
    const expr = m[2].trim();
    let type = null;
    if (/^market$/i.test(expr)) type = 'Market';
    else if (/\bstop\s*$/i.test(expr))  type = isLong ? 'Buy Stop'  : 'Sell Stop';
    else if (/\blimit\s*$/i.test(expr)) type = isLong ? 'Buy Limit' : 'Sell Limit';
    blocks[isLong ? 'Long' : 'Short'] = type;
  }
  return blocks;
}
function formatEntryTypes(blocks) {
  const types = [...new Set(Object.values(blocks).filter(Boolean))];
  return types.length ? types.join(' / ') : null;
}
function getEntryType(pseudo) { return formatEntryTypes(getOrderBlocks(pseudo)); }
