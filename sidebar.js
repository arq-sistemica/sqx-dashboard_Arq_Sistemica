// sidebar.js — Sidebar colapsable, ancho expandido medido dinámicamente
(function () {
  var W_COL = 52;
  var W_EXP = 220; // fallback; se mide en onReady()

  // default: expandido (solo colapsado si localStorage === '1')
  var isCol = localStorage.getItem('sqx_sidebar') === '1';

  var styleEl = document.createElement('style');
  styleEl.id = 'sb-style';
  // Inyectar CSS colapsado inmediatamente para evitar flash
  if (isCol) {
    styleEl.textContent = buildCollapsed();
  }
  document.head.appendChild(styleEl);

  function buildCollapsed() {
    return '.topbar,.main,.page-wrap{margin-left:' + W_COL + 'px!important}' +
      '.sidebar{width:' + W_COL + 'px!important;overflow:hidden!important}' +
      '.sidebar .nl,.sidebar .nav-section-lbl,.sidebar-logo-text,' +
      '.sidebar-footer{display:none!important}' +
      '.sidebar .nav-item{justify-content:center!important;padding:8px 0!important;' +
      'margin:1px 4px!important;width:calc(100% - 8px)!important}';
  }

  function buildExpanded() {
    return '.topbar,.main,.page-wrap{margin-left:' + W_EXP + 'px!important}';
  }

  var CSS_TRANS =
    '.topbar,.main,.page-wrap{transition:margin-left .25s ease}' +
    '.sidebar{transition:width .25s ease}';

  function applyState(withTransition) {
    var sidebar = document.querySelector('.sidebar');
    var fb = document.getElementById('sb-float');
    var w = isCol ? W_COL : W_EXP;
    styleEl.textContent = (withTransition ? CSS_TRANS : '') + (isCol ? buildCollapsed() : buildExpanded());
    if (sidebar) sidebar.classList.toggle('collapsed', isCol);
    if (fb) {
      fb.style.left = w + 'px';
      fb.textContent = isCol ? '▶' : '◀';
    }
  }

  window.toggleSidebar = function () {
    isCol = !isCol;
    localStorage.setItem('sqx_sidebar', isCol ? '1' : '0');
    applyState(true);
  };

  function onReady() {
    var sidebar = document.querySelector('.sidebar');

    // Medir ancho expandido real (fit-content) sin el CSS colapsado
    var saved = styleEl.textContent;
    styleEl.textContent = '';
    W_EXP = sidebar ? sidebar.offsetWidth : 220;
    styleEl.textContent = saved;

    // Aplicar estado correcto con el ancho medido
    applyState(false);

    // Botón flotante en el borde del sidebar
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

    // Agregar transiciones después del primer paint
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        applyState(true);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
