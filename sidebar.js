// sidebar.js — Toggle colapsable, compartido por todas las páginas
(function () {
  const W_EXP = 220;
  const W_COL = 52;

  function contentEls() {
    return document.querySelectorAll('.topbar, .main, .page-wrap');
  }

  function apply(w, animate) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const collapsed = w === W_COL;

    if (!animate) {
      sidebar.style.transition = 'none';
      contentEls().forEach(el => el.style.transition = 'none');
    }

    sidebar.classList.toggle('collapsed', collapsed);
    contentEls().forEach(el => el.style.marginLeft = w + 'px');

    // Mover botón flotante
    const fb = document.getElementById('sb-float');
    if (fb) {
      if (!animate) fb.style.transition = 'none';
      fb.style.left = w + 'px';
      fb.textContent = collapsed ? '▶' : '◀';
      if (!animate) requestAnimationFrame(() => { fb.style.transition = 'left 0.25s ease,background 0.12s,color 0.12s'; });
    }

    if (!animate) {
      requestAnimationFrame(() => {
        sidebar.style.transition = '';
        contentEls().forEach(el => el.style.transition = '');
      });
    }
  }

  window.toggleSidebar = function () {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const collapsed = sidebar.classList.contains('collapsed');
    const next = collapsed ? W_EXP : W_COL;
    localStorage.setItem('sqx_sidebar', next === W_COL ? '1' : '0');
    apply(next, true);
  };

  function init() {
    // Ocultar botón de toggle interno (reemplazado por botón flotante)
    const style = document.createElement('style');
    style.textContent = '.sidebar-toggle{display:none!important}';
    document.head.appendChild(style);

    // Crear botón flotante en el borde izquierdo, centrado verticalmente
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

    // Estado inicial: colapsado por defecto salvo que el usuario lo haya expandido
    const saved = localStorage.getItem('sqx_sidebar');
    const col = saved === null ? true : saved === '1';
    apply(col ? W_COL : W_EXP, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
