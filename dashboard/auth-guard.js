// Guardián del Dashboard - Protección de Acceso
// Ajusta la ruta relativa para llegar a apps/gold/assets/js/config/supabase-config.js
import { supabase } from '../apps/gold/assets/js/config/supabase-config.js';

(async function checkAuth() {
    console.log("🛡️ Verificando acceso al Dashboard...");

    if (!supabase) {
        console.warn("⚠️ Cliente Supabase no disponible");
        window.location.href = '/index.html#login';
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        console.warn("⛔ No hay sesión activa. Redirigiendo al Login.");
        window.location.href = '/index.html#login';
    } else {
        console.log("✅ Acceso permitido:", session.user.email);
    }
})();
