// Sidebar GlobalGold - comportamiento accesible compartido
(function(){
  // Solo inicializar en páginas marcadas como layout-app (flujo tipo aplicación)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', gateAndInit);
  } else {
    gateAndInit();
  }

  function gateAndInit(){
    var isApp = document.body.classList.contains('layout-app');
    // Si se quisiera un híbrido desktop-only para layout-site:
    // var isDesktop = window.matchMedia('(min-width:1024px)').matches;
    if (!isApp) return;
    initSidebar();
  }
  function initSidebar(root){
    var sidebar = root || document.querySelector('.gold-sidebar');
    if (!sidebar) return;

    // Crear overlay si no existe
    var overlay = document.querySelector('.gg-overlay');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.className = 'gg-overlay';
      overlay.hidden = true;
      document.body.appendChild(overlay);
    }

    // Crear botón toggle móvil si no existe
    var toggle = document.querySelector('.gg-toggle');
    if (!toggle){
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'gg-toggle';
      toggle.setAttribute('aria-label', 'Expandir/cerrar menú');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '≡';
      document.body.appendChild(toggle);
    }

    // Marcar body con with-sidebar
    document.body.classList.add('with-sidebar');

    // Marcar activo según pathname y aria-current
    var links = sidebar.querySelectorAll('nav a');
    var current = window.location.pathname.replace(/\/index\.html$/, '/');
    links.forEach(function(link){
      var href = link.getAttribute('href');
      if (!href) return;
      // Normaliza relativos del dashboard
      var a = document.createElement('a');
      a.href = href;
      var path = a.pathname;
      if (path === current || (current.startsWith('/herramientas') && path === '/herramientas/') || (current.startsWith('/dashboard') && path === '/dashboard/')){
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    // Manejo de enlaces protegidos
    links.forEach(function(link){
      if (link.dataset.protected === 'true'){
        link.addEventListener('click', function(e){
          try{
            var goldAuth = localStorage.getItem('goldAuth') === 'true';
            var currentUser = localStorage.getItem('currentUser');
            if (!(goldAuth || currentUser)){
              e.preventDefault();
              var resolver = document.createElement('a');
              resolver.href = link.getAttribute('href');
              var targetPath = resolver.pathname + resolver.search + resolver.hash;
              sessionStorage.setItem('redirectAfterLogin', targetPath);
              window.location.href = '/login.html';
            }
          }catch(err){}
        });
      }
    });

    // Accesibilidad: foco, expanded, scroll lock y atajos
    var items = Array.prototype.slice.call(sidebar.querySelectorAll('nav a'));
    var lastFocus = null;

    function setOpen(open){
      var isOpen = !!open;
      if (isOpen){
        sidebar.classList.add('is-open');
      } else {
        sidebar.classList.remove('is-open');
      }
      if (toggle){ toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false'); }
      localStorage.setItem('gg:nav_open', isOpen ? '1' : '0');
      if (overlay){ overlay.classList.toggle('is-show', isOpen); overlay.hidden = !isOpen; }
      document.body.classList.toggle('no-scroll', isOpen);
      if (isOpen){
        lastFocus = document.activeElement;
        (items[0] || toggle).focus();
      } else {
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        else if (toggle) toggle.focus();
        lastFocus = null;
      }
    }

    // Restaurar estado abierto en móvil (opcional)
    try{
      var persisted = localStorage.getItem('gg:nav_open') === '1';
      if (persisted && window.matchMedia('(max-width: 600px)').matches){
        setOpen(true);
      }
    }catch(e){}

    toggle && toggle.addEventListener('click', function(){
      setOpen(!sidebar.classList.contains('is-open'));
    });
    overlay && overlay.addEventListener('click', function(){ setOpen(false); });

    // Navegación con teclado
    sidebar.addEventListener('keydown', function(e){
      if (!['ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
      e.preventDefault();
      var currentIdx = items.indexOf(document.activeElement.closest('a'));
      if (currentIdx < 0) currentIdx = 0;
      var next = currentIdx;
      if (e.key === 'ArrowDown') next = Math.min(items.length - 1, currentIdx + 1);
      if (e.key === 'ArrowUp') next = Math.max(0, currentIdx - 1);
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = items.length - 1;
      items[next] && items[next].focus && items[next].focus();
    });

    // Exponer para depuración
    window.__ggSidebar = { setOpen: setOpen, toggle: toggle, overlay: overlay };
  }

  // init se delega a gateAndInit
})();
