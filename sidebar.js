// sidebar.js — Sidebar compartido, ancho ajustado al contenido
(function () {
  function applySidebarMargin() {
    var sb = document.querySelector('.sidebar');
    if (!sb) return;
    var w = sb.offsetWidth;
    document.querySelectorAll('.topbar,.main,.page-wrap').forEach(function(el) {
      el.style.marginLeft = w + 'px';
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySidebarMargin);
  } else {
    applySidebarMargin();
  }
  window.addEventListener('resize', applySidebarMargin);
})();
