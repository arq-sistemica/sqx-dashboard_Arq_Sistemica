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

  // ── BOTS ──────────────────────────────────────────────────────
  async getBots() {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bots?select=id,data&order=id`, {
      headers: _sbHeaders(sb.getToken()),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || `Error ${r.status} al cargar bots`);
    }
    const rows = await r.json();
    // Cada fila: { id, data: { ...campos del bot sin id } }
    return rows.map(row => ({ id: row.id, ...row.data }));
  },

  async upsertBots(bots) {
    // Separar id del resto y guardar en columna data (JSONB)
    const rows = bots.map(({ id, ...rest }) => ({ id, data: rest }));
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

  async deleteBot(id) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/bots?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: _sbHeaders(sb.getToken()) }
    );
    if (!r.ok) throw new Error(`Error ${r.status} al eliminar bot`);
  },
};
