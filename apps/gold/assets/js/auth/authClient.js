/**
 * YavlGold - Cliente Auth (V9.8 - "Bala de Plata")
 * Ruta: apps/gold/assets/js/auth/authClient.js
 */

const authClient = {
    supabase: null,
    currentSession: null,
    STORAGE_KEY: 'yavl:session',
    _initPromise: null,
    _clientReady: false,

    async init() {
        console.log('[AuthClient] 🚀 Inicializando V9.8 (Explicit Exchange)...');
        if (this._initPromise) return this._initPromise;
        this._initPromise = this._doInit();
        return this._initPromise;
    },

    async _doInit() {
        // 1. INICIALIZAR
        await this._ensureSupabaseClient();

        if (!this.supabase) {
            console.error('[AuthClient] ❌ Falla crítica: No se pudo inicializar Supabase');
            this._loadSessionFromLocalStorage();
            return;
        }

        this._clientReady = true;

        // 2. PROCESAR HASH (MAGIC LINK) - INTERCAMBIO FORZADO
        let sessionFromHash = null;
        if (this._checkForUrlHash()) {
            sessionFromHash = await this._processUrlHash();
        }

        // 3. DETERMINAR SESIÓN ACTIVA
        let activeSession = sessionFromHash;
        if (!activeSession) {
            activeSession = await this._getSupabaseSession();
        }

        if (activeSession) {
            console.log('[AuthClient] ✅ Sesión activa confirmada:', activeSession.user.email);
            this._processSession(activeSession);
        } else {
            // 4. FALLBACK A LOCALSTORAGE
            console.log('[AuthClient] ℹ️ Verificando caché local...');
            this._loadSessionFromLocalStorage();
        }

        this._setupAuthListener();
        this.updateDashboardUI();
        console.log('[AuthClient] ✅ Sistema operativo');
    },

    /**
     * TÁCTICA VITAL: Forzar intercambio de token desde URL
     */
    async _processUrlHash() {
        if (!this.supabase || typeof window === 'undefined') return null;
        console.log('[AuthClient] 🔗 Procesando Hash explícitamente...');

        try {
            const { data, error } = await this.supabase.auth.getSessionFromUrl({ storeSession: true });

            if (error) {
                console.error('[AuthClient] ❌ Error hash:', error.message);
                return null;
            }

            if (data?.session) {
                console.log('[AuthClient] ✅ Sesión capturada del Hash');
                // Limpiar URL
                const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
                window.history.replaceState(null, document.title, cleanUrl);
                return data.session;
            }
            return null;
        } catch (e) {
            console.error('[AuthClient] ❌ Excepción Hash:', e);
            return null;
        }
    },

    _checkForUrlHash() {
        if (typeof window === 'undefined') return false;
        const hash = window.location.hash || '';
        return hash.includes('access_token=') || hash.includes('type=magiclink');
    },

    async _ensureSupabaseClient() {
        if (typeof window !== 'undefined' && window.supabase?.auth) {
            this.supabase = window.supabase;
            return;
        }
        const config = await import('../config/supabase-config.js');
        if (!config.supabase?.auth) {
            throw new Error('[AuthClient] ❌ No se pudo cargar el cliente Supabase desde config/supabase-config.js. Verifica las VITE_ en .env');
        }
        this.supabase = config.supabase;
    },


    async _getSupabaseSession() {
        if (!this.supabase) return null;
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            return session;
        } catch (e) { return null; }
    },

    _setupAuthListener() {
        if (!this.supabase) return;
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log(`[AuthClient] 🔔 Evento: ${event}`);
            if (['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
                if (session) {
                    this._processSession(session);
                    this._checkRedirectToHome();
                }
            } else if (event === 'SIGNED_OUT') {
                this.logout();
            }
        });
    },

    _processSession(session) {
        if (!session?.user) return;
        this.currentSession = {
            user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                avatar: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email)}&background=C8A752&color=0B0C0F&bold=true`,
                role: 'user'
            },
            token: session.access_token,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000).getTime() : null
        };
        this._saveSessionToLocalStorage(this.currentSession);
        this.updateDashboardUI();
        this.emitAuthChange('SIGNED_IN');
    },

    async login(email, password) {
        console.log('[AuthClient] 🔐 Login...');
        if (!this.supabase) return { success: false, error: 'Sistema no inicializado' };

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

            if (error) {
                // LOG FORENSE PARA DIAGNÓSTICO
                console.error('[AuthClient] 🔍 ERROR LOGIN DETALLADO:', {
                    msg: error.message,
                    status: error.status,
                    code: error.code
                });

                const msg = error.message.toLowerCase();
                if (msg.includes('invalid login credentials') || msg.includes('invalid_grant'))
                    return { success: false, error: 'Credenciales incorrectas' };
                if (msg.includes('confirm'))
                    return { success: false, error: 'Debes confirmar tu email' };

                return { success: false, error: `Error: ${error.message}` };
            }

            this._processSession(data.session);
            setTimeout(() => { window.location.href = '/dashboard/'; }, 500);
            return { success: true, user: data.user };
        } catch (err) {
            return { success: false, error: 'Error de conexión' };
        }
    },

    logout() {
        if (this.supabase) this.supabase.auth.signOut();
        this.currentSession = null;
        localStorage.removeItem(this.STORAGE_KEY);
        this.updateDashboardUI();
        window.location.href = '/';
    },

    _saveSessionToLocalStorage(session) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    },

    _loadSessionFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const session = JSON.parse(stored);
                if (session.expiresAt && Date.now() > session.expiresAt) {
                    localStorage.removeItem(this.STORAGE_KEY);
                    return;
                }
                this.currentSession = session;
                this.updateDashboardUI();
            }
        } catch (e) { localStorage.removeItem(this.STORAGE_KEY); }
    },

    updateDashboardUI() {
        const user = this.currentSession?.user;
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userNameDisplays = document.querySelectorAll('#user-name, .user-name-display');

        if (user) {
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            if (userMenuBtn) {
                const span = userMenuBtn.querySelector('span');
                if (span) span.textContent = user.name;
                const img = userMenuBtn.querySelector('img');
                if (img) img.src = user.avatar;
            }
            userNameDisplays.forEach(el => el.textContent = user.name);
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) logoutBtn.onclick = (e) => { e.preventDefault(); this.logout(); };
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
        }
        window.dispatchEvent(new CustomEvent('auth:ui:updated', { detail: { user } }));
    },

    register: async function (email, password, name = '') {
        if (!this.supabase) return { success: false, error: 'Error sistema' };
        const options = name ? { data: { full_name: name } } : {};
        const { data, error } = await this.supabase.auth.signUp({
            email, password, options
        });
        return error ? { success: false, error: error.message } : { success: true, user: data.user };
    },

    resetPassword: async function (email) {
        if (!this.supabase) return { success: false, error: 'Sistema no inicializado' };
        try {
            const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/`
            });
            if (error) throw error;
            console.log('[AuthClient] ✅ Email de reset enviado');
            return { success: true };
        } catch (error) {
            console.error('[AuthClient] ❌ Error reset:', error.message);
            return { success: false, error: error.message };
        }
    },
    isAuthenticated: function () { return !!this.currentSession; },
    getCurrentUser: function () { return this.currentSession?.user; },

    _checkRedirectToHome() {
        const path = window.location.pathname;
        if ((path === '/' || path.includes('index.html')) && this.currentSession) {
            setTimeout(() => window.location.href = '/dashboard/', 300);
        }
    },
    emitAuthChange(event) {
        window.dispatchEvent(new CustomEvent(`auth:${event.toLowerCase()}`, { detail: { user: this.currentSession?.user } }));
    }
};

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => authClient.init());
}

window.AuthClient = authClient;
export { authClient as AuthClient };
export default authClient;
