// Supabase REST client — Arquitectura Sistémica
// Sin librerías externas: solo fetch() nativo

const SUPABASE_URL = 'https://ofrbktacgwbwsgpftoky.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OReO6Y5yhrK-BmPWf3fOhw_ODQ1-0_-';
const SESSION_KEY  = 'sb_arq_session';

function _sbHeaders(token) {
  return {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type':  'application/json',
  };
}

// DB row → objeto bot JS anidado
// Soporta esquema viejo (data JSONB) y nuevo (columnas planas)
function _rowToBot(row) {
  if (row.data !== undefined) {
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
      if (!r.ok) break;
      const data = await r.json();
      all = all.concat(data);
      if (data.length < batch) break;
      from += batch;
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
};
