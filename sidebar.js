// sidebar.js — Toggle colapsable, compartido por todas las páginas
(function () {
  const W_EXP = 220;
  const W_COL = 52;

  // Inyectar CSS dinámico (más robusto que inline styles)
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent =
      // Sin transición durante init (evita flash)
      '.sb-no-trans .topbar,.sb-no-trans .main,.sb-no-trans .page-wrap,.sb-no-trans .sidebar{transition:none!important}' +
      // Márgenes cuando está colapsado — !important gana sobre cualquier CSS de la página
      '.sb-col .topbar,.sb-col .main,.sb-col .page-wrap{margin-left:' + W_COL + 'px!important}' +
      // Transición suave en contenido
      '.topbar,.main,.page-wrap{transition:margin-left .25s ease}' +
      // Ocultar botón de toggle interno (reemplazado por flotante)
      '.sidebar-toggle{display:none!important}';
    document.head.appendChild(s);
  }

  // Botón flotante en el borde del sidebar, centrado verticalmente
  function createFloatBtn() {
    const fb = document.createElement('button');
    fb.id = 'sb-float';
    fb.onclick = window.toggleSidebar;
    fb.title = 'Expandir / colapsar menú';
    fb.style.cssText =
      'position:fixed;top:50%;transform:translateY(-50%);' +
      'width:14px;height:44px;padding:0;' +
      'background:#fff;border:1px solid #c8cdd5;border-left:none;' +
      'border-radius:0 6px 6px 0;box-shadow:2px 0 8px rgba(0,0,0,.08);' +
      'cursor:pointer;z-index:300;font-size:9px;color:#9098a8;' +
      'display:flex;align-items:center;justify-content:center;' +
      'transition:left 0.25s ease,background 0.12s,color 0.12s;' +
      'font-family:inherit;line-height:1;';
    fb.addEventListener('mouseenter', () => {
      fb.style.background = '#eef2ff';
      fb.style.color = '#4f46e5';
      fb.style.borderColor = '#c7d2fe';
    });
    fb.addEventListener('mouseleave', () => {
      fb.style.background = '#fff';
      fb.style.color = '#9098a8';
      fb.style.borderColor = '#c8cdd5';
    });
    document.body.appendChild(fb);
    return fb;
  }

  function applyState(col, fb) {
    const sidebar = document.querySelector('.sidebar');
    document.body.classList.toggle('sb-col', col);
    if (sidebar) sidebar.classList.toggle('collapsed', col);
    if (fb) {
      fb.style.left = (col ? W_COL : W_EXP) + 'px';
      fb.textContent = col ? '▶' : '◀';
    }
  }

  window.toggleSidebar = function () {
    const col = !document.body.classList.contains('sb-col');
    localStorage.setItem('sqx_sidebar', col ? '1' : '0');
    applyState(col, document.getElementById('sb-float'));
  };

  function init() {
    injectStyles();
    const fb = createFloatBtn();

    // Deshabilitar transiciones durante el estado inicial
    document.body.classList.add('sb-no-trans');

    // Por defecto: colapsado (a menos que el usuario lo haya expandido explícitamente)
    const saved = localStorage.getItem('sqx_sidebar');
    const col = saved === null ? true : saved === '1';
    applyState(col, fb);

    // Re-habilitar transiciones después de 2 frames (garantiza que no hay flash)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.remove('sb-no-trans');
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
