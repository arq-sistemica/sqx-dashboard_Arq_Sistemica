// config.js — Modal de configuración global (token EA + Anthropic API Key)
(function () {
  function injectModal() {
    if (document.getElementById('cfg-modal-overlay')) return;
    var el = document.createElement('div');
    el.innerHTML =
      '<div id="cfg-modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1000;align-items:center;justify-content:center">' +
        '<div style="background:#fff;border-radius:12px;padding:2rem;width:480px;max-width:95vw;border:1px solid var(--border,#e0e3e8)">' +
          '<div style="font-size:15px;font-weight:700;margin-bottom:1rem">⚙ Configuración</div>' +
          '<p style="font-size:12px;color:var(--text3,#9098a8);margin-bottom:1.2rem">Configuración guardada en este navegador.</p>' +
          '<div style="font-size:11px;font-weight:700;color:var(--text2,#4a5060);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Token EA — MetaTrader 5</div>' +
          '<div style="font-size:12px;color:var(--text3,#9098a8);margin-bottom:8px">Copiá este token y pegalo en los inputs del EA <strong>TradeCapture_v3</strong>.</div>' +
          '<div id="cfg-token-list" style="margin-bottom:1.2rem"><div style="font-size:12px;color:var(--text3,#9098a8)">Cargando...</div></div>' +
          '<div style="border-top:1px solid var(--border,#e0e3e8);margin-bottom:1.2rem"></div>' +
          '<div style="font-size:11px;font-weight:700;color:var(--text2,#4a5060);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Claude AI — Análisis narrativo de pseudocódigo</div>' +
          '<div style="margin-bottom:1.2rem">' +
            '<label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Anthropic API Key (sk-ant-...)</label>' +
            '<input id="cfg-anthropic" type="password" placeholder="sk-ant-api03-..." style="width:100%;height:32px;padding:0 10px;border:1px solid var(--border2,#c8cdd5);border-radius:6px;font-size:12px;font-family:inherit">' +
            '<div style="font-size:11px;color:var(--text3,#9098a8);margin-top:4px">Opcional. Si está configurada, Claude explicará en lenguaje simple por qué entra la estrategia.</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button onclick="saveConfig()" style="height:32px;padding:0 14px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;background:#4f46e5;border:1px solid #4f46e5;color:#fff;font-family:inherit">Guardar</button>' +
            '<button onclick="hideConfig()" style="height:32px;padding:0 14px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border2,#c8cdd5);background:#fff;color:var(--text2,#4a5060);font-family:inherit">Cancelar</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectModal);
  } else {
    injectModal();
  }
})();

function showConfig() {
  var overlay = document.getElementById('cfg-modal-overlay');
  if (!overlay) return;
  var inp = document.getElementById('cfg-anthropic');
  if (inp) inp.value = localStorage.getItem('anthropic_key') || '';
  overlay.style.display = 'flex';
  var el = document.getElementById('cfg-token-list');
  if (!el) return;
  if (typeof sb === 'undefined' || !sb.isAuthenticated()) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3,#9098a8)">Iniciá sesión para ver tu token.</div>';
    return;
  }
  sb.getMyTokens().then(function (tokens) {
    if (!tokens.length) {
      el.innerHTML = '<div style="font-size:12px;color:var(--text3,#9098a8)">No hay tokens generados.</div>';
      return;
    }
    el.innerHTML = tokens.map(function (t) {
      return '<div style="display:flex;align-items:center;gap:8px;background:#f8f9fa;border:1px solid var(--border,#e0e3e8);border-radius:6px;padding:8px 10px">' +
        '<code style="flex:1;font-size:11px;color:#1a1a2e;word-break:break-all">' + t.token + '</code>' +
        '<button onclick="navigator.clipboard.writeText(\'' + t.token + '\').then(function(){if(typeof alertOk===\'function\')alertOk(\'Token copiado\')})" style="font-size:11px;padding:3px 8px;height:auto;border-radius:4px;cursor:pointer;border:1px solid var(--border2,#c8cdd5);background:#fff;font-family:inherit">Copiar</button>' +
        '</div>';
    }).join('');
  }).catch(function () {
    el.innerHTML = '<div style="font-size:12px;color:#b91c1c">Error al cargar tokens.</div>';
  });
}

function hideConfig() {
  var overlay = document.getElementById('cfg-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function saveConfig() {
  var inp = document.getElementById('cfg-anthropic');
  var k = inp ? inp.value.trim() : '';
  if (k) localStorage.setItem('anthropic_key', k);
  else localStorage.removeItem('anthropic_key');
  hideConfig();
  if (typeof alertOk === 'function') alertOk('✓ Configuración guardada.');
}
