// Tu código existente de script.js (si tienes algo) debería ir aquí arriba.
// Por ahora, el archivo solo contendrá el sistema de autenticación.

// =============================================
// SISTEMA DE AUTENTICACIÓN - INTERCEPTORES
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // INTERCEPTOR SOLO para enlaces protegidos
    document.querySelectorAll('a[data-protected="true"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const auth = JSON.parse(localStorage.getItem('gg:auth') || '{}');
            const isAuthenticated = auth.ok === true;
            if (!isAuthenticated) {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const abs = new URL(this.href, window.location.origin);
                    sessionStorage.setItem('gg:intended', abs.pathname);
                } catch {}
                // Abre modal si existe; si no, fallback al dashboard login público
                const openLoginBtn = document.querySelector('[data-open="login"], .btn-login, [href="#login"]');
                if (openLoginBtn) {
                    openLoginBtn.click();
                } else {
                    window.location.href = '/dashboard/?needLogin=1#login';
                }
            }
        });
    });

    // Verificar estado de autenticación (opcional, para lógica de UI)
    checkAuthStatus();
});

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
