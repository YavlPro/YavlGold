/**
 * Guardián del Dashboard - Protección de Acceso V2.0
 * YavlGold V9.4 - Fix de compatibilidad módulo/global
 *
 * IMPORTANTE: Este script usa el cliente Supabase GLOBAL (window.supabase)
 * que ya está cargado en el HTML. No usamos imports ESM aquí para evitar
 * conflictos entre el script global y los módulos.
 */

(async () => {
    console.log("🛡️ [AuthGuard] Verificando credenciales de acceso...");

    // Esperar a que Supabase esté disponible globalmente
    const waitForSupabase = () => {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos máximo

            const check = () => {
                attempts++;

                // Opción 1: Cliente global creado por supabase-js script
                if (typeof window !== 'undefined' && window.supabase && window.supabase.auth) {
                    console.log("🛡️ [AuthGuard] ✅ Supabase global detectado");
                    resolve(window.supabase);
                    return;
                }

                // Opción 2: AuthClient ya inicializado
                if (typeof window !== 'undefined' && window.AuthClient && window.AuthClient.supabase) {
                    console.log("🛡️ [AuthGuard] ✅ AuthClient detectado");
                    resolve(window.AuthClient.supabase);
                    return;
                }

                if (attempts >= maxAttempts) {
                    reject(new Error("Timeout: Supabase no disponible"));
                    return;
                }

                setTimeout(check, 100);
            };

            check();
        });
    };

    try {
        // NO fallback: obliga uso del cliente central desde supabase-config.js
        if (!window.supabase) {
            console.error("🛡️ [AuthGuard] ❌ Cliente Supabase no disponible. Verifica carga de supabase-config.js");
        }

        const client = await waitForSupabase();

        if (!client) {
            console.warn("⚠️ [AuthGuard] Cliente Supabase no disponible");
            window.location.href = '/index.html#login';
            return;
        }

        // Verificar sesión
        const { data: { session }, error } = await client.auth.getSession();

        if (error) {
            console.error("❌ [AuthGuard] Error al verificar sesión:", error);
            window.location.href = '/index.html#login';
            return;
        }

        if (!session) {
            console.warn("⛔ [AuthGuard] Intruso detectado. Redirigiendo al Login.");
            window.location.href = '/index.html#login';
            return;
        }

        // ✅ Sesión válida (email redactado por privacidad)
        const emailMasked = session.user.email.replace(/(.{2}).+(@.+)/, '$1***$2');
        console.log("✅ [AuthGuard] Acceso concedido Comandante:", emailMasked);

        // Emitir evento para que otros scripts sepan que el usuario está autenticado
        window.dispatchEvent(new CustomEvent('auth:guard:passed', {
            detail: { user: session.user }
        }));

    } catch (error) {
        console.error("❌ [AuthGuard] Error crítico:", error.message);
        // En caso de error, redirigir al login
        window.location.href = '/index.html#login';
    }
})();
