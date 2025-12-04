/**
 * YavlGold - Cliente Auth (V9.3 - Fix Completo)
 * Ruta: apps/gold/assets/js/auth/authClient.js
 * Wrapper compatible con sistema packages/auth y authUI
 */
import { supabase } from '../config/supabase-config.js'

const authClient = {
    supabase: null,
    currentSession: null,
    STORAGE_KEY: 'yavl:session',

    init() {
        if (!supabase) {
            console.error('[AuthClient] ❌ Supabase no inicializado. Ver .env');
            return;
        }
        this.supabase = supabase;
        this.loadSession();
        this.listenAuthChanges();
        console.log('[AuthClient] ✅ Sistema auth inicializado con sb-* key');
    },

    listenAuthChanges() {
        if (!this.supabase) return;

        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AuthClient] 🔔 Auth cambió:', event);

            if (event === 'SIGNED_IN' && session) {
                this.currentSession = {
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                        avatar: session.user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email)}&background=C8A752&color=0B0C0F&bold=true`,
                        role: 'user',
                        createdAt: session.user.created_at
                    },
                    token: session.access_token,
                    refreshToken: session.refresh_token,
                    expiresAt: new Date(session.expires_at * 1000).getTime(),
                    createdAt: Date.now()
                };
                this.saveSession(this.currentSession);
                this.emitAuthChange('SIGNED_IN');
            } else if (event === 'SIGNED_OUT') {
                this.currentSession = null;
                localStorage.removeItem(this.STORAGE_KEY);
                this.emitAuthChange('SIGNED_OUT');
            }
        });
    },

    async login(email, password) {
        console.log('[AuthClient] 🔐 Iniciando login...');

        if (!this.supabase) {
            return { success: false, error: 'Servicio no disponible. Revisa .env' };
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                const msg = error.message.toLowerCase();
                if (msg.includes('invalid')) return { success: false, error: 'Credenciales incorrectas' };
                if (msg.includes('confirm')) return { success: false, error: 'Debes confirmar tu email primero' };
                return { success: false, error: error.message };
            }

            // ✅ Login exitoso - FORZAR redirección al Dashboard
            console.log('✅ [AuthClient] Login exitoso:', data.user.email);
            console.log('🚀 Login autorizado. Redirigiendo al Dashboard...');

            // Guardar sesión explícitamente por seguridad
            localStorage.setItem('sb_session', JSON.stringify(data.session));

            setTimeout(() => {
                // Redirección absoluta a la carpeta raíz dashboard
                window.location.href = '/dashboard/index.html';
            }, 500);

            return { success: true, user: data.user };
        } catch (err) {
            console.error('❌ [AuthClient] Error:', err);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async register(email, password, name) {
        console.log('[AuthClient] 📝 Registrando usuario...');

        if (!this.supabase) {
            return { success: false, error: 'Servicio no disponible. Revisa .env' };
        }

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name, full_name: name }
                }
            });

            if (error) return { success: false, error: error.message };

            console.log('✅ [AuthClient] Usuario registrado:', email);
            return { success: true, user: data.user, message: '¡Cuenta creada exitosamente!' };
        } catch (err) {
            console.error('❌ [AuthClient] Error en registro:', err);
            return { success: false, error: 'Error al registrar' };
        }
    },

    logout() {
        console.log('[AuthClient] 🚪 Cerrando sesión...');
        if (this.supabase) this.supabase.auth.signOut();
        this.currentSession = null;
        localStorage.removeItem(this.STORAGE_KEY);
        this.emitAuthChange('SIGNED_OUT');
    },

    isAuthenticated() {
        return !!this.currentSession?.user;
    },

    getCurrentUser() {
        return this.currentSession?.user || null;
    },

    getSession() {
        return this.currentSession;
    },

    saveSession(session) {
        try {
            if (!session?.user) return;
            this.currentSession = session;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
            console.log('[AuthClient] ✅ Sesión guardada');
        } catch (e) {
            console.error('[AuthClient] Error al guardar sesión:', e);
        }
    },

    loadSession() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.currentSession = JSON.parse(stored);
                console.log('[AuthClient] ✅ Sesión cargada:', this.currentSession.user?.email);
                this.emitAuthChange('INITIAL_SESSION');
            }
        } catch (e) {
            console.error('[AuthClient] Error al cargar sesión:', e);
            localStorage.removeItem(this.STORAGE_KEY);
        }
    },

    emitAuthChange(event) {
        const customEvent = new CustomEvent(`auth:${event.toLowerCase()}`, {
            detail: { user: this.currentSession?.user }
        });
        window.dispatchEvent(customEvent);
    }
};

// Auto-inicializar cuando el DOM esté listo
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => authClient.init());
    } else {
        authClient.init();
    }
}

// Exponer globalmente para backward compatibility
if (typeof window !== 'undefined') {
    window.AuthClient = authClient;
}

// Export default para imports de módulos
export default authClient;
