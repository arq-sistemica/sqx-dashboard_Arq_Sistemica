// sidebar.js — Sidebar colapsable, compartido por todas las páginas
(function () {
  var W_EXP = 220;
  var W_COL = 52;

  // CSS según estado
  var CSS_COL =
    '.topbar,.main,.page-wrap{margin-left:' + W_COL + 'px!important}' +
    '.sidebar{width:' + W_COL + 'px!important;overflow:hidden!important}' +
    '.sidebar .nl,.sidebar .nav-section-lbl,.sidebar-logo-text,' +
    '.sidebar-footer,.sidebar-toggle{display:none!important}' +
    '.sidebar .nav-item{justify-content:center!important;padding:8px 0!important;' +
    'margin:1px 4px!important;width:calc(100% - 8px)!important}';

  var CSS_EXP =
    '.topbar,.main,.page-wrap{margin-left:' + W_EXP + 'px!important}';

  var CSS_TRANS =
    '.topbar,.main,.page-wrap{transition:margin-left .25s ease}' +
    '.sidebar{transition:width .25s ease}';

  // ── SYNC: inyectar CSS antes del primer render del browser
  var isCol = localStorage.getItem('sqx_sidebar') !== '0'; // default: colapsado
  var styleEl = document.createElement('style');
  styleEl.id = 'sb-style';
  styleEl.textContent = isCol ? CSS_COL : CSS_EXP;
  document.head.appendChild(styleEl); // document.head ya existe en este punto

  // ── TOGGLE
  window.toggleSidebar = function () {
    isCol = !isCol;
    localStorage.setItem('sqx_sidebar', isCol ? '1' : '0');
    var sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed', isCol);
    styleEl.textContent = CSS_TRANS + (isCol ? CSS_COL : CSS_EXP);
    var fb = document.getElementById('sb-float');
    if (fb) {
      fb.style.left = (isCol ? W_COL : W_EXP) + 'px';
      fb.textContent = isCol ? '▶' : '◀';
    }
  };

  // ── DOM LISTO: crear botón flotante y aplicar clase al sidebar
  function onReady() {
    var sidebar = document.querySelector('.sidebar');
    if (sidebar && isCol) sidebar.classList.add('collapsed');

    // Botón flotante en el borde, centrado verticalmente
    var fb = document.createElement('button');
    fb.id = 'sb-float';
    fb.onclick = window.toggleSidebar;
    fb.title = 'Expandir / colapsar menú';
    fb.style.cssText =
      'position:fixed;top:50%;transform:translateY(-50%);' +
      'left:' + (isCol ? W_COL : W_EXP) + 'px;' +
      'width:14px;height:44px;padding:0;' +
      'background:#fff;border:1px solid #c8cdd5;border-left:none;' +
      'border-radius:0 6px 6px 0;box-shadow:2px 0 8px rgba(0,0,0,.08);' +
      'cursor:pointer;z-index:300;font-size:9px;color:#9098a8;' +
      'display:flex;align-items:center;justify-content:center;' +
      'transition:left 0.25s ease,background 0.12s,color 0.12s;' +
      'font-family:inherit;line-height:1;';
    fb.textContent = isCol ? '▶' : '◀';
    fb.addEventListener('mouseenter', function () {
      fb.style.background = '#eef2ff';
      fb.style.color = '#4f46e5';
      fb.style.borderColor = '#c7d2fe';
    });
    fb.addEventListener('mouseleave', function () {
      fb.style.background = '#fff';
      fb.style.color = '#9098a8';
      fb.style.borderColor = '#c8cdd5';
    });
    document.body.appendChild(fb);

    // Agregar transiciones después de 2 frames (sin animación en el load inicial)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        styleEl.textContent = CSS_TRANS + styleEl.textContent;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
