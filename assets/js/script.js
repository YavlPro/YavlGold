// Tu código existente de script.js (si tienes algo) debería ir aquí arriba.
// Por ahora, el archivo solo contendrá el sistema de autenticación.

// =============================================
// SISTEMA DE AUTENTICACIÓN - INTERCEPTORES
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar estado de autenticación (opcional, para lógica de UI)
    checkAuthStatus();
});

// Intercepta SOLO enlaces protegidos; no toques enlaces públicos (Academia, etc.)
(function guardProtectedLinks(){
  document.querySelectorAll('a[data-protected="true"]').forEach(a=>{
    a.addEventListener('click',(e)=>{
      const s = JSON.parse(localStorage.getItem('gg:auth')||'{}');
      const ok = s?.ok===true && s?.src==='supabase' && s?.version==='v2';
      if(!ok){
        e.preventDefault();
        try{ sessionStorage.setItem('gg:intended', new URL(a.href).pathname); }catch{}
        document.querySelector('[data-open="login"]')?.click()
          || (location.href='/dashboard/?needLogin=1#login');
      }
    });
  });
})();

// Overlay de sidebar: si está oculta, no captura clics
(() => {
  const ov = document.querySelector('.gg-overlay');
  if (ov) ov.style.pointerEvents = ov.classList.contains('is-show') ? 'auto' : 'none';
  new MutationObserver(()=> {
    if (!ov) return;
    ov.style.pointerEvents = ov.classList.contains('is-show') ? 'auto' : 'none';
  }).observe(document.documentElement, { attributes:true, subtree:true, attributeFilter:['class'] });
})();

// Función para verificar autenticación
function checkAuthStatus() {
    const auth = JSON.parse(localStorage.getItem('gg:auth') || '{}');
    if (auth.ok === true) {
        console.log('✅ Usuario autenticado');
    } else {
        console.log('❌ Usuario NO autenticado');
    }
    return auth.ok === true;
}

// Login simulado (para usar desde la consola o botones)
window.simularLogin = function() {
    localStorage.setItem('gg:auth', JSON.stringify({
        ok: true,
        t: Date.now(),
        user: 'usuario_demo'
    }));
    
    const intended = sessionStorage.getItem('gg:intended') || 'herramientas.html';
    sessionStorage.removeItem('gg:intended');
    window.location.href = intended;
};

// Logout (para usar desde la consola o botones)
window.logout = function() {
    localStorage.removeItem('gg:auth');
    sessionStorage.removeItem('gg:intended');
    window.location.href = 'index.html';
};
