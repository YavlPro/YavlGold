// Helper universal para drag con persistencia
function initDraggable(el, storageKey){
  if(!el) return;
  el.style.touchAction = 'none';
  // Restaurar
  try{
    const pos = JSON.parse(localStorage.getItem(storageKey)||'null');
    if(pos && pos.left && pos.top){
      el.style.left = pos.left; el.style.top = pos.top;
      el.style.right = 'auto'; el.style.bottom = 'auto';
    }
  }catch{}
  let down=false, sx=0, sy=0, ox=0, oy=0, clickGuard=false;
  const onDown = (e)=>{
    const p = e.touches ? e.touches[0] : e;
    down=true; sx=p.clientX; sy=p.clientY; clickGuard=false;
    const r=el.getBoundingClientRect(); ox=r.left; oy=r.top;
    el.style.cursor='grabbing';
  };
  const onMove = (e)=>{
    if(!down) return;
    const p = e.touches ? e.touches[0] : e;
    const dx=p.clientX-sx, dy=p.clientY-sy;
    if(Math.abs(dx)+Math.abs(dy)>3) clickGuard=true;
    const L = Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 8, ox + dx));
    const T = Math.max(8, Math.min(window.innerHeight - el.offsetHeight - 8, oy + dy));
    el.style.left=L+'px'; el.style.top=T+'px'; el.style.right='auto'; el.style.bottom='auto';
  };
  const onUp = ()=>{
    if(!down) return;
    down=false; el.style.cursor='';
    localStorage.setItem(storageKey, JSON.stringify({ left: el.style.left, top: el.style.top }));
    setTimeout(()=> clickGuard=false, 50);
  };
  el.addEventListener('pointerdown', (e)=>{ onDown(e); el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', (e)=>{ onUp(); el.releasePointerCapture(e.pointerId); });
  // Evitar navegación si fue drag
  el.addEventListener('click', (e)=>{ if(clickGuard) e.preventDefault(); });
  // Doble click para reset
  el.addEventListener('dblclick', (e)=>{
    e.preventDefault();
    localStorage.removeItem(storageKey);
    el.style.left=''; el.style.top=''; el.style.right='16px';
    el.style.bottom='calc(16px + env(safe-area-inset-bottom,0px))';
  });
}

// Activa para WhatsApp y búsqueda cuando estén disponibles
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar drag para FABs
  setTimeout(() => {
    initDraggable(document.getElementById('gg-wa-fab'), 'gg:wa_pos');
    initDraggable(document.getElementById('gg-search-fab'), 'gg:search_pos');
  }, 100);
});