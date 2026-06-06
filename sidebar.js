// sidebar.js — Global topbar navigation
(function () {
  var PAGES = [
    { href: 'index.html',          label: 'Dashboard',      icon: '📋' },
    { href: 'portfolio.html',      label: 'Portfolio',      icon: '💼' },
    { href: 'ranking.html',        label: 'Ranking',        icon: '🏆' },
    { href: 'overlap.html',        label: 'Overlap',        icon: '📊' },
    { href: 'tendencia.html',      label: 'Tendencia',      icon: '📈' },
    { href: 'estacionalidad.html', label: 'Estacionalidad', icon: '📅' },
    { href: 'sqx.html',            label: 'SQX',            icon: '⚙️' },
    { href: 'mt5.html',            label: 'MT5',            icon: '📉' },
  ];

  var style = document.createElement('style');
  style.id = 'sb-style';
  style.textContent =
    '.global-nav{position:sticky;top:0;z-index:200;height:48px;display:flex;' +
    'align-items:center;padding:0 1.25rem;background:var(--bg,#fff);' +
    'border-bottom:1px solid var(--border,#e0e3e8);gap:0}' +
    '.global-nav .nav-logo{font-size:15px;font-weight:700;color:var(--text,#111318);' +
    'white-space:nowrap;text-decoration:none}' +
    '.global-nav .nav-logo span{color:var(--accent,#4f46e5)}' +
    '.global-nav .nav-links{display:flex;gap:2px;flex:1;justify-content:center}' +
    '.global-nav .nav-links a{padding:5px 11px;border-radius:var(--radius,6px);' +
    'font-size:13px;color:var(--text2,#4a5060);text-decoration:none;' +
    'transition:background .15s,color .15s;white-space:nowrap}' +
    '.global-nav .nav-links a:hover{background:var(--bg3,#f1f3f5);color:var(--text,#111318)}' +
    '.global-nav .nav-links a.active{background:var(--accent-light,#eef2ff);' +
    'color:var(--accent,#4f46e5);font-weight:600}' +
    '.global-nav .nav-right{display:flex;align-items:center;gap:10px;white-space:nowrap}' +
    '.global-nav .nav-brand{font-size:11px;color:var(--text3,#9098a8)}' +
    '.global-nav .nav-logout{font-size:12px;padding:3px 9px;' +
    'border:1px solid var(--border,#e0e3e8);border-radius:var(--radius,6px);' +
    'background:var(--bg,#fff);color:var(--text2,#4a5060);cursor:pointer}' +
    '.global-nav .nav-logout:hover{background:var(--bg3,#f1f3f5)}' +
    '.sidebar,#sb-float,.mobile-nav{display:none!important}' +
    '.topbar,.main,.page-wrap{margin-left:0!important}' +
    '@media(max-width:600px){' +
    '.global-nav .nav-brand{display:none}' +
    '.global-nav .nav-links a{padding:5px 7px;font-size:12px}' +
    '.global-nav{padding:0 0.75rem}}';
  document.head.appendChild(style);

  function onReady() {
    var page = location.pathname.split('/').pop() || 'index.html';

    var links = PAGES.map(function (p) {
      var active = (page === p.href || (p.href === 'index.html' && !page)) ? ' class="active"' : '';
      return '<a href="' + p.href + '"' + active + '>' + p.icon + ' ' + p.label + '</a>';
    }).join('');

    var nav = document.createElement('nav');
    nav.className = 'global-nav';
    nav.innerHTML =
      '<a href="index.html" class="nav-logo">SQX<span>.</span>Dashboard</a>' +
      '<div class="nav-links">' + links + '</div>' +
      '<div class="nav-right">' +
      '<span class="nav-brand">Arq. Sistémica</span>' +
      '<button class="nav-logout" onclick="if(typeof authLogout===\'function\')authLogout()">⎋ Cerrar sesión</button>' +
      '</div>';

    document.body.insertBefore(nav, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
