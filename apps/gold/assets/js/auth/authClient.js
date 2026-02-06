/**
 * YavlGold - Cliente Auth (V9.8 - "Bala de Plata")
 * Ruta: apps/gold/assets/js/auth/authClient.js
 */

// 🚨 INYECCIÓN TEMPRANA: Detectar recovery ANTES de que Supabase despierte
(function () {
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search || '');
    const flowType = (hashParams.get('type') || searchParams.get('type') || '').toLowerCase();
    if (flowType === 'recovery') {
        sessionStorage.setItem('yavl_recovery_pending', 'true');
        console.log('[AuthClient] ⚡ INSTANTE CERO: Recovery detectado. Bandera plantada.');
    }
})();

const LOGIN_REDIRECT_URL = '/index.html#login';

function normalizeAvatarLabel(value) {
    if (typeof value !== 'string') return 'Usuario';
    const trimmed = value.trim();
    return trimmed || 'Usuario';
}

function getInitials(label) {
    const clean = normalizeAvatarLabel(label);
    const words = clean.split(/\s+/).filter(Boolean);
    if (!words.length) return 'U';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function buildLocalAvatarDataUri(seed) {
    const label = normalizeAvatarLabel(seed);
    const initials = getInitials(label);
    const palette = ['#C8A752', '#B8941F', '#9D8040', '#E4D08E'];
    const bg = palette[hashString(label) % palette.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Rajdhani, Arial, sans-serif" font-size="36" font-weight="700" fill="#0a0a0a">${initials}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const authClient = {
    supabase: null,
    currentSession: null,

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
            return;
        }

        this._clientReady = true;

        // 2. PROCESAR CALLBACK AUTH (PKCE/HASH LEGACY)
        let sessionFromHash = null;
        if (this._checkForUrlHash()) {
            sessionFromHash = await this._processUrlHash();
        }

        // 2.5 FRENO DE EMERGENCIA: Detectar flujo de recuperación de contraseña
        const isRecoveryFlow = this._isRecoveryFlowUrl();
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
            // 4. FALLBACK A LOCALSTORAGE (ELIMINADO POR SEGURIDAD)
            console.log('[AuthClient] ℹ️ Esperando sesión de Supabase...');
        }

        this._setupAuthListener();
        this.updateDashboardUI();
        console.log('[AuthClient] ✅ Sistema operativo');
    },

    _isRecoveryFlowUrl() {
        const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
        const searchParams = new URLSearchParams(window.location.search || '');
        const flowType = (hashParams.get('type') || searchParams.get('type') || '').toLowerCase();
        return flowType === 'recovery';
    },

    _notifyAuthCallbackError(message) {
        const safeMessage = message || 'No se pudo procesar el enlace de acceso.';
        console.error('[AuthClient] ❌ Auth callback error:', safeMessage);
        window.dispatchEvent(new CustomEvent('auth:callback:error', { detail: { message: safeMessage } }));
        if (window.AuthUI?.showError) {
            window.AuthUI.showError('login', safeMessage);
        }
    },

    _clearAuthCallbackUrl() {
        try {
            const cleanUrl = new URL(window.location.href);
            ['code', 'type', 'error', 'error_code', 'error_description'].forEach((key) => cleanUrl.searchParams.delete(key));
            const query = cleanUrl.searchParams.toString();
            const nextUrl = `${cleanUrl.pathname}${query ? `?${query}` : ''}`;
            window.history.replaceState({}, document.title, nextUrl);
        } catch (_e) {
            // Ignore URL cleanup failures.
        }
    },

    /**
     * TÁCTICA VITAL: procesar callback PKCE y fallback hash legacy
     */
    async _processUrlHash() {
        if (!this.supabase || typeof window === 'undefined') return null;
        console.log('[AuthClient] 🔗 Procesando callback de autenticación...');

        const searchParams = new URLSearchParams(window.location.search || '');
        const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        try {
            if (code) {
                const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    this._notifyAuthCallbackError('No se pudo validar el enlace de acceso. Solicita uno nuevo.');
                    return null;
                }
                this._clearAuthCallbackUrl();
                return data?.session || null;
            }

            if (accessToken && refreshToken) {
                const { data, error } = await this.supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                if (error) {
                    this._notifyAuthCallbackError('No se pudo restaurar la sesión desde el enlace.');
                    return null;
                }
                this._clearAuthCallbackUrl();
                return data?.session || null;
            }

            return null;
        } catch (_e) {
            this._notifyAuthCallbackError('Error inesperado procesando el enlace de acceso.');
            return null;
        }
    },

    _checkForUrlHash() {
        if (typeof window === 'undefined') return false;
        const searchParams = new URLSearchParams(window.location.search || '');
        const hash = window.location.hash || '';
        if (searchParams.get('code')) return true;
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
    PROTECTED_PREFIXES: ["/dashboard", "/academia", "/agro", "/crypto", "/tecnologia", "/herramientas"],

    _authGuardInitialized: false,
    _isRedirecting: false,  // Lock para evitar múltiples redirects

    _normalizePath(p) { return (p || "").replace(/\/+$/, "") || "/"; },
    _currentPath() { return this._normalizePath(window.location.pathname); },

    _isProtected(path) {
        const normalized = this._normalizePath(path);
        return this.PROTECTED_PREFIXES.some(prefix => {
            const normalizedPrefix = this._normalizePath(prefix);
            return normalized === normalizedPrefix || normalized.startsWith(normalizedPrefix + '/');
        });
    },

    _isAuthEntry(path) {
        return path === "/" || path === "/index.html";
    },

    async _enforceAuth() {
        // 🔒 REFUERZO DE TITANIO: Doble candado - Si hay bandera O hash de recovery, PARALIZAR
        const hasRecoveryFlag = sessionStorage.getItem('yavl_recovery_pending') === 'true';
        const hasRecoveryHash = this._isRecoveryFlowUrl();

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
            console.log('[AuthGuard] REDIRECT ->', LOGIN_REDIRECT_URL, '(protected-no-session)');
            window.location.replace(LOGIN_REDIRECT_URL);
            return;
        }

        // Usuario logueado en Home -> Dashboard (o returnTo)
        // PASO A: NO redirigir si estamos en flujo de recovery
        const isRecoveryFlow = this._isRecoveryFlowUrl();
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
                    window.location.replace(LOGIN_REDIRECT_URL);
                }
                return;
            }

            // 🧱 MURO DE CONTENCIÓN TOTAL: Bloquear TODO en SIGNED_IN si hay recovery
            if (event === 'SIGNED_IN') {
                const hasRecoveryFlag = sessionStorage.getItem('yavl_recovery_pending') === 'true';
                const hasRecoveryHash = this._isRecoveryFlowUrl();

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
        const displayName = session.user.user_metadata?.name
            || session.user.user_metadata?.full_name
            || session.user.email?.split('@')[0]
            || 'Usuario';
        this.currentSession = {
            user: {
                id: session.user.id,
                email: session.user.email,
                name: displayName,
                avatar: session.user.user_metadata?.avatar_url || this.buildLocalAvatar(displayName),
                role: 'user'
            },
            token: session.access_token,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000).getTime() : null
        };
        // SEC: Removed insecure localStorage save
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
        console.log('[AuthClient] 🔐 LoginWithToken iniciado (Invisible Captcha)');
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
        this.updateDashboardUI();
        window.location.href = '/';
    },

    // _saveSessionToLocalStorage removed for security
    // _loadSessionFromLocalStorage removed for security

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
    getSession: function () { return this.currentSession; },
    buildLocalAvatar: function (seed) { return buildLocalAvatarDataUri(seed || 'Usuario'); },

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
