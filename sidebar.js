// sidebar.js — Toggle colapsable, compartido por todas las páginas
(function () {
  const W_EXP = 220;
  const W_COL = 52;

  function setMargins(w) {
    // setProperty con 'important' gana sobre cualquier CSS de la página
    document.querySelectorAll('.topbar, .main, .page-wrap').forEach(function(el) {
      el.style.setProperty('margin-left', w + 'px', 'important');
    });
  }

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
    fb.addEventListener('mouseenter', function() {
      fb.style.background = '#eef2ff';
      fb.style.color = '#4f46e5';
      fb.style.borderColor = '#c7d2fe';
    });
    fb.addEventListener('mouseleave', function() {
      fb.style.background = '#fff';
      fb.style.color = '#9098a8';
      fb.style.borderColor = '#c8cdd5';
    });
    document.body.appendChild(fb);
    return fb;
  }

  function applyState(col, animate) {
    const sidebar = document.querySelector('.sidebar');
    const fb = document.getElementById('sb-float');
    const w = col ? W_COL : W_EXP;

    if (sidebar) sidebar.classList.toggle('collapsed', col);

    if (!animate) {
      // Sin transición: ocultar .sidebar-toggle interno también
      var s = document.createElement('style');
      s.textContent = '.sidebar-toggle{display:none!important}' +
        '.topbar,.main,.page-wrap{transition:margin-left .25s ease}' +
        '.sidebar{transition:width .25s ease}';
      document.head.appendChild(s);
    }

    setMargins(w);

    if (fb) {
      fb.style.left = w + 'px';
      fb.textContent = col ? '▶' : '◀';
    }
  }

  window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const col = !sidebar.classList.contains('collapsed');
    localStorage.setItem('sqx_sidebar', col ? '1' : '0');
    applyState(col, true);
  };

  function init() {
    const fb = createFloatBtn();

    // Estado inicial sin animación
    const saved = localStorage.getItem('sqx_sidebar');
    const col = (saved === null) ? true : (saved === '1');

    // Aplicar inmediatamente antes del primer paint
    applyState(col, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
