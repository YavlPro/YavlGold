// GlobalGold - Floating Search FAB (draggable) with dialog search
(function(){
  if (typeof document === 'undefined') return;

  function injectStyles(){
    if (document.getElementById('gg-search-styles')) return;
    const css = `
.gg-fab{
  position:fixed; right:16px; bottom:16px; z-index:90;
  width:56px; height:56px; border-radius:50%;
  display:grid; place-items:center; font-size:22px; cursor:grab;
  background:linear-gradient(135deg,#F5D06E,#D4AF37 50%,#B8860B); color:#141414;
  box-shadow:0 14px 30px rgba(0,0,0,.45), 0 0 0 2px rgba(212,175,55,.25);
  border:none; user-select:none; touch-action:none;
}
.gg-fab:active{ cursor:grabbing; }
.gg-fab:focus-visible{ outline:2px solid #FFE7A3; outline-offset:3px; }
#gg-search-dialog{
  width:min(720px,92vw); border:1px solid #22262D; border-radius:14px; padding:16px;
  background:#0B0C0F; color:#E8EAED; box-shadow:0 24px 60px rgba(0,0,0,.6); z-index:100;
}
#gg-search-dialog::backdrop{ background:rgba(0,0,0,.55); backdrop-filter:saturate(110%) blur(2px); }
.gg-search{ display:grid; gap:12px; }
#gg-search-input{
  padding:12px; border-radius:10px; border:1px solid #22262D; background:#0E1116; color:#E8EAED;
}
#gg-search-input:focus{ outline:none; border-color:#3A3F48; box-shadow:0 0 0 3px rgba(212,175,55,.15); }
#gg-search-results{ list-style:none; margin:0; padding:0; max-height:320px; overflow:auto; border:1px solid #22262D; border-radius:10px; }
#gg-search-results li{ padding:10px 12px; border-bottom:1px solid #151a20; }
#gg-search-results li:last-child{ border-bottom:none; }
#gg-search-results a{ color:#E8EAED; text-decoration:none; display:block; }
#gg-search-results a:hover, #gg-search-results a:focus{ text-decoration:underline; }
.gg-actions{ display:flex; gap:8px; justify-content:flex-end; }
.btn{ background:#14171D; border:1px solid #22262D; color:#E8EAED; padding:8px 12px; border-radius:10px; }
.btn-gold{ background:linear-gradient(135deg,#F5D06E,#D4AF37 50%,#B8860B); color:#141414; border:none; padding:8px 12px; border-radius:10px; font-weight:700; }
@media (prefers-reduced-motion: reduce){ .gg-fab{ transition:none; } }
`;
    const style = document.createElement('style');
    style.id = 'gg-search-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectMarkup(){
    if (document.getElementById('gg-search-fab')) return;
    const fab = document.createElement('button');
    fab.id = 'gg-search-fab';
    fab.className = 'gg-fab';
    fab.setAttribute('aria-label','Buscar (Ctrl+K)');
    fab.title = 'Buscar (Ctrl+K)';
    fab.textContent = '🔎';
    document.body.appendChild(fab);

    const dlg = document.createElement('dialog');
    dlg.id = 'gg-search-dialog';
    dlg.setAttribute('aria-modal','true');
    dlg.setAttribute('aria-labelledby','gg-search-title');
    dlg.innerHTML = `
      <form id="gg-search-form" method="dialog" class="gg-search">
        <h2 id="gg-search-title">Buscar</h2>
        <input id="gg-search-input" type="search" placeholder="Escribe para buscar… (Enter)" autocomplete="off" />
        <ul id="gg-search-results" role="listbox" aria-label="Resultados"></ul>
        <div class="gg-actions">
          <button type="submit" class="btn-gold">Buscar</button>
          <button type="button" id="gg-search-close" class="btn">Cerrar</button>
        </div>
        <small class="muted">Sugerencias locales + Google (site:${location.host}). Atajo: Ctrl+K o /</small>
      </form>`;
    document.body.appendChild(dlg);
  }

  // Config: páginas locales
  const GG_SEARCH_PAGES = [
    { t:'Inicio', u:'/' },
    { t:'Herramientas', u:'/herramientas/' },
    { t:'Calculadora de rentabilidad', u:'/herramientas/calculadora.html' },
    { t:'Academia', u:'/academia/' },
    { t:'Lección 01: Introducción a cripto', u:'/academia/lecciones/01-introduccion-cripto.html' },
    { t:'Lección 02: Seguridad básica', u:'/academia/lecciones/02-seguridad-basica.html' },
    { t:'Lección 03: Trading básico', u:'/academia/lecciones/03-trading-basico.html' },
    { t:'Lección 04: Gestión de riesgo', u:'/academia/lecciones/04-gestion-riesgo.html' },
    { t:'Lección 05: Glosario', u:'/academia/lecciones/05-glosario.html' },
    { t:'Dashboard', u:'/dashboard/' }
  ];

  function track(ev, props){ try{ (window.plausible||function(){ })(ev,{props}); }catch(e){}
  }

  function initLogic(){
    const fab = document.getElementById('gg-search-fab');
    const dlg = document.getElementById('gg-search-dialog');
    const input = document.getElementById('gg-search-input');
    const list = document.getElementById('gg-search-results');
    const form = document.getElementById('gg-search-form');
    const btnClose = document.getElementById('gg-search-close');
    if (!fab || !dlg || !input || !list || !form || !btnClose) return;

    // Restaurar posición
    try {
      const pos = JSON.parse(localStorage.getItem('gg:search_pos')||'null');
      if (pos){ fab.style.left = pos.left; fab.style.top = pos.top; fab.style.right = 'auto'; fab.style.bottom = 'auto'; }
    } catch {}

    let dragging=false, startX=0, startY=0, originLeft=0, originTop=0, clickGuard=false;
    const onDown = (x,y)=>{ dragging=true; fab.style.cursor='grabbing'; startX=x; startY=y; const r=fab.getBoundingClientRect(); originLeft=r.left; originTop=r.top; clickGuard=false; };
    const onMove = (x,y)=>{
      if(!dragging) return;
      const dx=x-startX, dy=y-startY;
      if(Math.abs(dx)+Math.abs(dy)>3) clickGuard=true;
      const left = Math.max(8, Math.min(window.innerWidth - fab.offsetWidth - 8, originLeft + dx));
      const top  = Math.max(8, Math.min(window.innerHeight - fab.offsetHeight - 8, originTop + dy));
      fab.style.left = left+'px'; fab.style.top = top+'px'; fab.style.right='auto'; fab.style.bottom='auto';
    };
    const onUp = ()=>{ if(!dragging) return; dragging=false; fab.style.cursor=''; localStorage.setItem('gg:search_pos', JSON.stringify({ left: fab.style.left, top: fab.style.top })); setTimeout(()=> clickGuard=false, 50); };

    fab.addEventListener('mousedown', e=>{ onDown(e.clientX,e.clientY); e.preventDefault(); });
    window.addEventListener('mousemove', e=> onMove(e.clientX,e.clientY));
    window.addEventListener('mouseup', onUp);

    fab.addEventListener('touchstart', e=>{ const t=e.touches[0]; onDown(t.clientX,t.clientY); }, {passive:true});
    window.addEventListener('touchmove', e=>{ const t=e.touches[0]; onMove(t.clientX,t.clientY); }, {passive:true});
    window.addEventListener('touchend', onUp);

    fab.addEventListener('click', ()=>{ if(clickGuard) return; openDialog(); });

    addEventListener('keydown', e=>{
      const tag = document.activeElement && document.activeElement.tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openDialog(); }
      else if(!e.ctrlKey && !e.metaKey && e.key==='/' && tag !== 'INPUT' && tag !== 'TEXTAREA'){ e.preventDefault(); openDialog(); }
    });

    function openDialog(){
      if(typeof dlg.showModal==='function') dlg.showModal(); else dlg.setAttribute('open','');
      document.body.classList.add('no-scroll');
      input.value=''; render(''); input.focus();
      track('search_open',{from: location.pathname});
    }
    function closeDialog(){
      if(dlg.open && typeof dlg.close==='function') dlg.close(); else dlg.removeAttribute('open');
      document.body.classList.remove('no-scroll'); fab.focus();
    }

    btnClose.addEventListener('click', closeDialog);
    dlg.addEventListener('cancel', e=>{ e.preventDefault(); closeDialog(); });

    input.addEventListener('input', ()=> render(input.value));
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const q = input.value.trim();
      if(q){
        track('search_submit',{q});
        const url = `https://www.google.com/search?q=${encodeURIComponent(`site:${location.origin} ${q}`)}`;
        window.open(url,'_blank','noopener');
      }
      closeDialog();
    });

    dlg.addEventListener('keydown', e=>{
      if(!['ArrowDown','ArrowUp','Enter'].includes(e.key)) return;
      const links = Array.from(list.querySelectorAll('a'));
      const idx = links.indexOf(document.activeElement);
      if(e.key==='Enter' && document.activeElement.tagName==='A'){ closeDialog(); }
      if(e.key==='ArrowDown'){ e.preventDefault(); (links[idx+1]||links[0]||input).focus(); }
      if(e.key==='ArrowUp'){ e.preventDefault(); (links[idx-1]||links[links.length-1]||input).focus(); }
    });

    function isAuthenticated(){
      try{
        const goldAuth = localStorage.getItem('goldAuth') === 'true';
        const currentUser = localStorage.getItem('currentUser');
        const gg = JSON.parse(localStorage.getItem('gg:auth')||'{}');
        return goldAuth || !!currentUser || gg.ok === true;
      }catch(e){ return false; }
    }

    function handleProtectedNav(href){
      if (isAuthenticated()) return false; // no intercept
      try{
        const a = document.createElement('a'); a.href = href;
        sessionStorage.setItem('gg:intended', a.pathname);
      }catch(e){}
      // Fallback al flujo de login del dashboard
      window.location.href = '/dashboard/?needLogin=1#login';
      return true;
    }

    function render(q){
      list.innerHTML = '';
      const term = (q||'').trim().toLowerCase();
      let items = [];
      if (term){
        items = GG_SEARCH_PAGES.filter(p => p.t.toLowerCase().includes(term) || p.u.toLowerCase().includes(term)).slice(0,8);
      } else {
        items = GG_SEARCH_PAGES.slice(0,6);
      }
      if(items.length === 0){
        const li = document.createElement('li'); li.className = 'muted';
        li.textContent = 'Sin resultados locales. Presiona Enter para buscar en Google.';
        list.appendChild(li); return;
      }
      for (const it of items){
        const li = document.createElement('li');
        const a = document.createElement('a'); a.href = it.u; a.textContent = it.t; a.setAttribute('role','option');
        a.addEventListener('click', (ev)=>{
          track('search_click',{t:it.t,u:it.u});
          // Intercepta rutas protegidas
          if (it.u.startsWith('/herramientas') || it.u.startsWith('/dashboard')){
            ev.preventDefault();
            if (!handleProtectedNav(it.u)) { closeDialog(); location.href = it.u; }
            else { closeDialog(); }
          } else {
            closeDialog();
          }
        });
        li.appendChild(a); list.appendChild(li);
      }
    }
  }

  function bootstrap(){
    injectStyles();
    injectMarkup();
    initLogic();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
