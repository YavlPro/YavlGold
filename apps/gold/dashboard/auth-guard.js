// Guardián del Dashboard - Protección de Acceso
// Importamos la configuración central de Supabase
import { supabase } from '../assets/js/config/supabase-config.js';

(async () => {
    console.log("🛡️ Verificando credenciales de acceso...");

    if (!supabase) {
        console.warn("⚠️ Cliente Supabase no disponible");
        window.location.href = '/index.html#login';
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        console.warn("⛔ Intruso detectado. Redirigiendo al Login.");
        window.location.href = '/index.html#login';
    } else {
        console.log("✅ Acceso concedido Comandante:", session.user.email);
    }
})();
