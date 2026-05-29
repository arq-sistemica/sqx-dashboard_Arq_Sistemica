// sidebar.js — Toggle colapsable, compartido por todas las páginas
(function () {
  const W_EXP = 220;   // expandido
  const W_COL = 52;    // colapsado

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

    const btn = document.querySelector('.sidebar-toggle');
    if (btn) btn.textContent = collapsed ? '▶' : '◀';

    if (!animate) {
      requestAnimationFrame(() => {
        sidebar.style.transition = '';
        contentEls().forEach(el => el.style.transition = '');
      });
    }
  }

  window.toggleSidebar = function () {
    const collapsed = document.querySelector('.sidebar').classList.contains('collapsed');
    const next = collapsed ? W_EXP : W_COL;
    localStorage.setItem('sqx_sidebar', next === W_COL ? '1' : '0');
    apply(next, true);
  };

  function init() {
    const col = localStorage.getItem('sqx_sidebar') === '1';
    apply(col ? W_COL : W_EXP, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
