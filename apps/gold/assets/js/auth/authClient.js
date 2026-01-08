/**
 * YavlGold - Cliente Auth (V9.8 - "Bala de Plata")
 * Ruta: apps/gold/assets/js/auth/authClient.js
 */

// 🚨 INYECCIÓN TEMPRANA: Detectar recovery ANTES de que Supabase despierte
(function () {
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery')) {
        sessionStorage.setItem('yavl_recovery_pending', 'true');
        console.log('[AuthClient] ⚡ INSTANTE CERO: Recovery detectado. Bandera plantada.');
    }
})();

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

        // 2. PROCESAR HASH (MAGIC LINK / RECOVERY) - INTERCAMBIO FORZADO
        let sessionFromHash = null;
        if (this._checkForUrlHash()) {
            sessionFromHash = await this._processUrlHash();
        }

        // 2.5 FRENO DE EMERGENCIA: Detectar flujo de recuperación de contraseña
        const isRecoveryFlow = (window.location.hash || '').includes('type=recovery');
        if (isRecoveryFlow && sessionFromHash) {
            console.log('[AuthClient] 🔑 Flujo de RECOVERY detectado. Dejando nota para AuthUI...');
            this._processSession(sessionFromHash);
            // NOTA EN LA NEVERA: AuthUI leerá esto cuando esté lista
            sessionStorage.setItem('yavl_recovery_pending', 'true');
            // STOP: No continuar con el flujo normal (evita redirección al Dashboard)
            return;
        }

        // 3. DETERMINAR SESIÓN ACTIVA
        let activeSession = sessionFromHash;
        if (!activeSession) {
            activeSession = await this._getSupabaseSession();
        }

        if (activeSession) {
            const emailMasked = activeSession.user.email.replace(/(.{2}).+(@.+)/, '$1***$2');
            console.log('[AuthClient] ✅ Sesión activa confirmada:', emailMasked);
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
                // const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
                // window.history.replaceState(null, document.title, cleanUrl);
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
        // Detectar: Token O MagicLink O Recovery
        return hash.includes('access_token=') || hash.includes('type=magiclink') || hash.includes('type=recovery');
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

    // --- SMART AUTH GUARD V9.4 (ANTI-LOOP ENHANCED) ---
    PROTECTED_PREFIXES: ["/dashboard", "/academia", "/suite", "/herramientas"],

    _authGuardInitialized: false,
    _isRedirecting: false,  // Lock para evitar múltiples redirects

    _normalizePath(p) { return (p || "").replace(/\/+$/, "") || "/"; },
    _currentPath() { return this._normalizePath(window.location.pathname); },

    _isProtected(path) {
        return this.PROTECTED_PREFIXES.some(prefix => path.includes(prefix));
    },

    _isAuthEntry(path) {
        return path === "/" || path === "/index.html";
    },

    async _enforceAuth() {
        // 🔒 REFUERZO DE TITANIO: Doble candado - Si hay bandera O hash de recovery, PARALIZAR
        const hasRecoveryFlag = sessionStorage.getItem('yavl_recovery_pending') === 'true';
        const hasRecoveryHash = (window.location.hash || '').includes('type=recovery');

        if (hasRecoveryFlag || hasRecoveryHash) {
            console.log('[AuthGuard] 🛑 Recovery detectado (flag:', hasRecoveryFlag, 'hash:', hasRecoveryHash, '). PARALIZADO.');
            return;
        }

        // Evitar múltiples redirects simultáneos
        if (this._isRedirecting) {
            console.log('[AuthGuard] ⏳ Redirect en curso, ignorando...');
            return;
        }

        const { data } = await this.supabase.auth.getSession();
        const session = data?.session;
        const path = this._currentPath();

        console.log('[AuthGuard] enforce()', { path, hasSession: !!session });

        // Intruso en área protegida -> Login
        if (this._isProtected(path) && !session) {
            this._isRedirecting = true;
            sessionStorage.setItem("__returnTo", window.location.href);
            console.log('[AuthGuard] REDIRECT -> / (protected-no-session)');
            window.location.replace("/");
            return;
        }

        // Usuario logueado en Home -> Dashboard (o returnTo)
        // PASO A: NO redirigir si estamos en flujo de recovery
        const isRecoveryFlow = (window.location.hash || '').includes('type=recovery');
        if (this._isAuthEntry(path) && session && !isRecoveryFlow) {
            this._isRedirecting = true;
            this._processSession(session);
            const returnTo = sessionStorage.getItem("__returnTo");
            sessionStorage.removeItem("__returnTo");
            const dest = returnTo || "/dashboard";
            console.log('[AuthGuard] REDIRECT ->', dest, '(already-logged-in)');
            window.location.replace(dest);
        }
    },

    _setupAuthListener() {
        if (!this.supabase) return;

        // Evitar doble inicialización (Race Condition Fix)
        if (this._authGuardInitialized) {
            console.log('[AuthGuard] ⚠️ Ya inicializado, ignorando...');
            return;
        }
        this._authGuardInitialized = true;
        console.log('[AuthGuard] 🛡️ Smart AuthGuard V9.4 inicializado');

        // Listener INTELIGENTE: Solo actúa en contextos específicos
        this.supabase.auth.onAuthStateChange((event, session) => {
            const path = this._currentPath();
            console.log(`[AuthGuard] 🔔 Evento: ${event} (path: ${path})`);

            // SIGNED_OUT en área protegida -> Login
            if (event === "SIGNED_OUT" && this._isProtected(path)) {
                if (!this._isRedirecting) {
                    this._isRedirecting = true;
                    window.location.replace("/");
                }
                return;
            }

            // 🧱 MURO DE CONTENCIÓN TOTAL: Bloquear TODO en SIGNED_IN si hay recovery
            if (event === 'SIGNED_IN') {
                const hasRecoveryFlag = sessionStorage.getItem('yavl_recovery_pending') === 'true';
                const hasRecoveryHash = (window.location.hash || '').includes('type=recovery');

                if (hasRecoveryFlag || hasRecoveryHash) {
                    console.log('[AuthGuard] 🧱 MURO: SIGNED_IN bloqueado por recovery. Sesión activa, sin redirect.');
                    // Procesar sesión (para mantener permisos) pero NO redirigir
                    if (session) this._processSession(session);
                    // Asegurar que la bandera esté puesta
                    sessionStorage.setItem('yavl_recovery_pending', 'true');
                    return; // STOP TOTAL
                }
            }

            // Procesar sesión en eventos relevantes (SIN redirigir)
            if (['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event) && session) {
                this._processSession(session);
            }

            // CRÍTICO: Solo redirigir en SIGNED_IN si estamos en Home/Login
            // Si ya estamos dentro de un módulo, IGNORAR para evitar bucles
            if (event === "SIGNED_IN" && this._isAuthEntry(path) && !this._isRedirecting) {
                this._enforceAuth();
            }
        });

        // Chequeo inicial (solo si no estamos ya redirigiendo)
        if (!this._isRedirecting) {
            this._enforceAuth();
        }

        // Fix para iOS/Safari (Back/Forward Cache)
        window.addEventListener("pageshow", (e) => {
            if (e.persisted && !this._isRedirecting) {
                console.log('[AuthGuard] 📱 pageshow (bfcache)');
                this._enforceAuth();
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

        // Validar captcha (for non-invisible mode fallback)
        let captchaToken = null;
        if (typeof hcaptcha !== 'undefined') {
            captchaToken = hcaptcha.getResponse();
            if (!captchaToken) {
                return { success: false, error: 'Por favor completa el captcha' };
            }
        }

        return this._doLogin(email, password, captchaToken);
    },

    // Login with pre-obtained captcha token (for invisible hCaptcha)
    async loginWithToken(email, password, captchaToken) {
        console.log('[AuthClient] 🔐 LoginWithToken...');
        if (!this.supabase) return { success: false, error: 'Sistema no inicializado' };
        return this._doLogin(email, password, captchaToken);
    },

    // Internal login logic
    async _doLogin(email, password, captchaToken) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password,
                options: { captchaToken: captchaToken }
            });

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
            if (!sessionStorage.getItem('yavl_recovery_pending')) {
                setTimeout(() => { window.location.href = '/dashboard/'; }, 500);
            } else {
                console.log('[AuthClient] 🛑 Redirección al Dashboard bloqueada por Recovery');
            }
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

        // Validar captcha (for non-invisible mode fallback)
        let captchaToken = null;
        if (typeof hcaptcha !== 'undefined') {
            captchaToken = hcaptcha.getResponse();
            if (!captchaToken) {
                return { success: false, error: 'Por favor completa el captcha' };
            }
        }

        return this._doRegister(email, password, name, captchaToken);
    },

    // Register with pre-obtained captcha token (for invisible hCaptcha)
    async registerWithToken(email, password, name = '', captchaToken) {
        console.log('[AuthClient] 📝 RegisterWithToken...');
        if (!this.supabase) return { success: false, error: 'Error sistema' };
        return this._doRegister(email, password, name, captchaToken);
    },

    // Internal register logic
    async _doRegister(email, password, name, captchaToken) {
        const options = {
            data: name ? { full_name: name } : {},
            captchaToken: captchaToken
        };

        const { data, error } = await this.supabase.auth.signUp({
            email, password, options
        });
        return error ? { success: false, error: error.message } : { success: true, user: data.user };
    },

    resetPassword: async function (email) {
        if (!this.supabase) return { success: false, error: 'Sistema no inicializado' };

        // Validar captcha
        let captchaToken = null;
        if (typeof hcaptcha !== 'undefined') {
            captchaToken = hcaptcha.getResponse();
            if (!captchaToken) {
                return { success: false, error: 'Por favor completa el captcha' };
            }
        }

        try {
            const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/`,
                captchaToken: captchaToken
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
