// Extrae symbol, direction, tf, name, magic de la DB embebida en index.html
// y genera bot_meta.json para que estacionalidad.html lo lea.
// Uso: node generate_bot_meta.cjs

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const outPath  = path.join(__dirname, 'bot_meta.json');

const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<script id="db-store" type="application\/json">([\s\S]*?)<\/script>/);
if (!m) { console.error('ERROR: no se encontró db-store en index.html'); process.exit(1); }

const db = JSON.parse(m[1]);

const DIR_MAP = {
  'Buy (Long)':        'Long',
  'Sell (Short)':      'Short',
  'Both (Buy + Sell)': 'Both',
};

const meta = db
  .filter(b => b.symbol)
  .map(b => {
    // Prioridad: direction explícito → pseudocódigo → null
    let direction = b.direction || null;
    if (!direction) {
      const et = b.pseudocodigoData?.parsed?.entradaTipo;
      if (et && DIR_MAP[et]) direction = DIR_MAP[et];
    }
    return {
      id:        b.id,
      magic:     b.magic     || null,
      name:      b.name      || '',
      symbol:    b.symbol.toUpperCase().replace(/[^A-Z]/g, ''),
      tf:        b.tf        || null,
      direction: direction,
    };
  });

fs.writeFileSync(outPath, JSON.stringify(meta, null, 2), 'utf8');

const conDir = meta.filter(b => b.direction).length;
console.log(`bot_meta.json generado: ${meta.length} bots, ${conDir} con dirección conocida`);
