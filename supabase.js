// Supabase REST client — Arquitectura Sistémica
// Sin librerías externas: solo fetch() nativo

const SUPABASE_URL = 'https://ofrbktacgwbwsgpftoky.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OReO6Y5yhrK-BmPWf3fOhw_ODQ1-0_-';
const SESSION_KEY  = 'sb_arq_session';

// Magics viejos/incompletos que el EA mandó antes de corregir el Magic Number en MT5 (sep-2026).
// Cada uno se unifica al magic correcto (todos los dígitos del nombre SQX) para que el
// historial de trades de un mismo bot no aparezca partido en varias filas del dashboard.
const MAGIC_ALIASES = {
  '1315314':   '13153141',   // Strategy 1.3.15 - Improved 3.1.4(1)
  '1324416':   '4324416',    // Strategy 4.3.24 - Improved 4.1.6
  '1326115':   '13261115',   // Strategy 1.3.26(1) - Improved 1.1.5
  '1326116':   '13261116',   // Strategy 1.3.26(1) - Improved 1.1.6
  '1452316':   '1452315',    // Strategy 1.4.5(2) - Improved 3.1.5
  '1916214':   '19162142',   // Strategy 1.9.16 - Improved 2.1.4(2)
  '1917':      '1917115',    // Strategy 1.9.17 - Improved 1.1.5
  '1917516':   '19171515',   // Strategy 1.9.17(1) - Improved 5.1.5
  '2225':      '2225417',    // Strategy 2.2.25 - Improved 4.1.7
  '2626':      '2626515',    // Strategy 2.6.26 - Improved 5.1.5
  '2718':      '2718115',    // Strategy 2.7.18 - Improved 1.1.5
  '3115216':   '31152216',   // Strategy 3.1.15(2) - Improved 2.1.6
  '311534151': '3115341511', // Strategy 3.1.15(3) - Improved 4.1.5(1)(1)
  '3115415':   '3115341511', // Strategy 3.1.15(3) - Improved 4.1.5(1)(1) (segundo magic viejo distinto)
  '3117':      '31172151',   // Strategy 3.1.17 - Improved 2.1.5(1)
  '3118':      '31186114',   // Strategy 3.1.18(6) - Improved 1.1.4
  '3118114':   '31186114',   // Strategy 3.1.18(6) - Improved 1.1.4 (segundo magic viejo distinto)
  '3220417':   '32201417',   // Strategy 3.2.20(1) - Improved 4.1.7
  '3223':      '3223415',    // Strategy 3.2.23 - Improved 4.1.5
  '3626236':   '36262361',   // Strategy 3.6.26 - Improved 2.3.6(1)
  '38171216':  '381712161',  // Strategy 3.8.17(1) - Improved 2.1.6(1)
  '41023':     '41023114',   // Strategy 4.10.23 - Improved 1.1.4
  '410241114': '4102411141', // Strategy 4.10.24(1) - Improved 1.1.4(1)
  '5524':      '55241415',   // Strategy 5.5.24(1) - Improved 4.1.5
  '5618':      '5618514',    // Strategy 5.6.18 - Improved 5.1.4
  '610163104': '6101631042', // Strategy 6.10.16 - Improved 3.10.4(2)
  '6214315':   '62143152',   // Strategy 6.2.14 - Improved 3.1.5(2)
};

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function _sbHeaders(token) {
  return {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type':  'application/json',
  };
}

// Deriva dirección ('Long'|'Short'|'Both'|null) desde texto de pseudocódigo SQX
function _pseudoToDir(pseudo) {
  if (!pseudo) return null;
  const lf = /LongEntrySignal\s*=\s*false\s*;/i.test(pseudo);
  const sf = /ShortEntrySignal\s*=\s*false\s*;/i.test(pseudo);
  if (!lf && sf)  return 'Long';
  if (lf  && !sf) return 'Short';
  if (!lf && !sf) return 'Both';
  return null;
}

// DB row → objeto bot JS anidado
// Soporta esquema viejo (data JSONB) y nuevo (columnas planas)
function _rowToBot(row) {
  if (row.data != null) {
    // Esquema viejo: todo en row.data JSONB
    const d = row.data;
    return {
      id:        String(row.id),
      magic:     d.magic ?? null,
      name:      d.name,
      symbol:    d.symbol,
      tf:        d.tf,
      estado:    d.estado,
      sqxFilter: d.sqxFilter,
      added:     d.added,
      notes:     d.notes  || '',
      sqn:       d.sqn   ?? d.overviewData?.sqn  ?? null,
      stag:      d.stag  ?? d.overviewData?.stag ?? null,
      zp:        d.zp    ?? d.overviewData?.zp   ?? null,
      is:        d.is    || {},
      oos:       d.oos   || {},
      overviewData: d.overviewData || null,
      pseudocodigo: d.pseudocodigo || null,
      direction:    d.direction    || _pseudoToDir(d.pseudocodigo) || null,
    };
  }
  // Esquema nuevo: columnas planas
  return {
    id:        String(row.id),
    magic:     row.id,
    name:      row.name,
    symbol:    row.symbol,
    tf:        row.tf,
    estado:    row.estado,
    sqxFilter: row.filter,
    added:     row.added,
    notes:     row.notes  || '',
    sqn:       row.full_sqn ?? row.overview_data?.sqn  ?? null,
    stag:      row.full_stag ?? row.overview_data?.stag ?? null,
    zp:        row.full_zp   ?? row.overview_data?.zp   ?? null,
    is: {
      pf:        row.is_pf,
      cagr:      row.is_cagr,
      wr:        row.is_wr,
      trades:    row.is_trades,
      sharpe:    row.is_sharpe,
      dd:        row.is_dd,
      np:        row.is_np,
      retdd:     row.is_retdd,
      cagrdd:    row.is_cagrdd,
      stability: row.is_stability,
      fitness:   row.is_fitness,
    },
    oos: {
      pf:        row.oos_pf,
      cagr:      row.oos_cagr,
      wr:        row.oos_wr,
      trades:    row.oos_trades,
      sharpe:    row.oos_sharpe,
      dd:        row.oos_dd,
      np:        row.oos_np,
      retdd:     row.oos_retdd,
      cagrdd:    row.oos_cagrdd,
      stability: row.oos_stability,
      fitness:   row.oos_fitness,
    },
    standalone:   row.overview_data?._standalone || null,
    overviewData: row.overview_data ? (({ _standalone, ...rest }) => Object.keys(rest).length ? rest : null)(row.overview_data) : null,
    pseudocodigo: row.pseudocodigo  || null,
    direction:    _pseudoToDir(row.pseudocodigo || null),
  };
}

// Objeto bot JS anidado → DB row (columnas planas)
function _botToRow(bot) {
  return {
    user_id: sb.getUserId(),
    id:      Number(bot.id) || Number(bot.magic),
    name:    bot.name,
    symbol:  bot.symbol  || '',
    tf:      bot.tf      || '',
    estado:  bot.estado  || 'activo',
    filter:  bot.sqxFilter || null,
    added:   bot.added   || null,
    notes:   bot.notes   || '',
    is_pf:        bot.is?.pf        ?? null,
    is_cagr:      bot.is?.cagr      ?? null,
    is_wr:        bot.is?.wr        ?? null,
    is_trades:    bot.is?.trades    ?? null,
    is_sharpe:    bot.is?.sharpe    ?? null,
    is_dd:        bot.is?.dd        ?? null,
    is_np:        bot.is?.np        ?? null,
    is_retdd:     bot.is?.retdd     ?? null,
    is_cagrdd:    bot.is?.cagrdd    ?? null,
    is_stability: bot.is?.stability ?? null,
    is_fitness:   bot.is?.fitness   ?? null,
    oos_pf:        bot.oos?.pf        ?? null,
    oos_cagr:      bot.oos?.cagr      ?? null,
    oos_wr:        bot.oos?.wr        ?? null,
    oos_trades:    bot.oos?.trades    ?? null,
    oos_sharpe:    bot.oos?.sharpe    ?? null,
    oos_dd:        bot.oos?.dd        ?? null,
    oos_np:        bot.oos?.np        ?? null,
    oos_retdd:     bot.oos?.retdd     ?? null,
    oos_cagrdd:    bot.oos?.cagrdd    ?? null,
    oos_stability: bot.oos?.stability ?? null,
    oos_fitness:   bot.oos?.fitness   ?? null,
    overview_data: (bot.standalone && Object.keys(bot.standalone).length)
      ? { ...(bot.overviewData || {}), _standalone: bot.standalone }
      : bot.overviewData || null,
    pseudocodigo:  bot.pseudocodigo || null,
  };
}

const sb = {
  // ── AUTH ──────────────────────────────────────────────────────
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || data.msg || data.message || 'Credenciales incorrectas');
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    return data;
  },

  async signUp(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:  'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || data.msg || data.message || 'Error al registrarse');
    // Si Supabase requiere confirmación de email, data.user existirá pero access_token no
    if (data.access_token) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    }
    return data;
  },

  async signOut() {
    const s = sb.getSession();
    if (s?.access_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method:  'POST',
        headers: _sbHeaders(s.access_token),
      }).catch(() => {});
    }
    localStorage.removeItem(SESSION_KEY);
  },

  getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  isAuthenticated() {
    const s = sb.getSession();
    if (!s?.access_token) return false;
    // expires_at es epoch en segundos (campo de Supabase)
    const exp = s.expires_at ?? (s.expires_in ? Math.floor(Date.now() / 1000) + s.expires_in : 0);
    return (Date.now() / 1000) < (exp - 60);
  },

  getToken() {
    return sb.getSession()?.access_token ?? SUPABASE_KEY;
  },

  getUserId() {
    return sb.getSession()?.user?.id ?? null;
  },

  // ── BOTS ──────────────────────────────────────────────────────
  async getBots() {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bots?select=*&order=id`, {
      headers: _sbHeaders(sb.getToken()),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || `Error ${r.status} al cargar bots`);
    }
    const rows = await r.json();
    return rows.map(_rowToBot);
  },

  async upsertBots(bots) {
    const rows = bots.map(_botToRow);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bots`, {
      method:  'POST',
      headers: {
        ..._sbHeaders(sb.getToken()),
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || `Error ${r.status} al guardar bots`);
    }
  },

  async upsertBot(bot) {
    return sb.upsertBots([bot]);
  },

  async deleteBot(id) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/bots?id=eq.${id}`,
      { method: 'DELETE', headers: _sbHeaders(sb.getToken()) }
    );
    if (!r.ok) throw new Error(`Error ${r.status} al eliminar bot`);
  },

  // ── USER TOKENS ───────────────────────────────────────────────
  async getMyTokens() {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/user_tokens?select=token,label,last_used&order=created_at`,
      { headers: _sbHeaders(sb.getToken()) }
    );
    if (!r.ok) return [];
    return r.json();
  },

  async getMyTrades() {
    const url = `${SUPABASE_URL}/rest/v1/trades?select=magic,profit,commission,swap,open_time,close_time,ticket,symbol,lots,type,open_price,close_price,comment,account_id,account_label&order=close_time`;
    const batch = 1000;
    let all = [], from = 0;
    while (true) {
      const headers = { ..._sbHeaders(sb.getToken()), 'Range': `${from}-${from+batch-1}`, 'Range-Unit': 'items' };
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || `Error ${r.status} al cargar trades (página ${from/batch + 1})`);
      }
      const data = await r.json();
      all = all.concat(data);
      if (data.length < batch) break;
      from += batch;
    }
    for (const t of all) {
      const alias = MAGIC_ALIASES[String(t.magic)];
      if (alias) t.magic = Number(alias);
    }
    return all;
  },

  async getMyAccounts() {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/accounts?select=*&order=id`,
      { headers: _sbHeaders(sb.getToken()) }
    );
    if (!r.ok) return [];
    return r.json();
  },

  async getPrefs() {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/user_prefs?select=prefs&limit=1`,
      { headers: _sbHeaders(sb.getToken()) }
    );
    if (!r.ok) return {};
    const rows = await r.json();
    return rows[0]?.prefs || {};
  },

  async savePrefs(prefs) {
    const uid = sb.getUserId();
    if (!uid) return;
    await fetch(`${SUPABASE_URL}/rest/v1/user_prefs`, {
      method: 'POST',
      headers: {
        ..._sbHeaders(sb.getToken()),
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ user_id: uid, prefs, updated_at: new Date().toISOString() }),
    });
  },
};
