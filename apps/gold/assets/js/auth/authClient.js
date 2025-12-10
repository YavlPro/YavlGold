/**
 * YavlGold - Cliente Auth (V9.5 - Refactorización Forense)
 * Ruta: apps/gold/assets/js/auth/authClient.js
 *
 * ESCUADRÓN KIMI - FIXES CRÍTICOS:
 * 1. Configuración explícita de detectSessionInUrl + persistSession + autoRefreshToken
 * 2. Orden de hidratación correcto: Hash URL → getSession() → localStorage
 * 3. Race condition eliminada: cliente listo antes de cualquier getSession
 * 4. Listener robusto manejando INITIAL_SESSION
 * 5. Key unificada yavl:session
 */

const authClient = {
    supabase: null,
    currentSession: null,
    STORAGE_KEY: 'yavl:session',
    _initPromise: null,
    _clientReady: false,

    /**
     * Inicializar el cliente de autenticación
     */
    async init() {
        console.log('[AuthClient] 🚀 Inicializando con lógica forense corregida...');

        if (this._initPromise) return this._initPromise;

        this._initPromise = this._doInit();
        return this._initPromise;
    },

    async _doInit() {
        // PASO 1: INICIALIZAR CLIENTE SUPABASE CON CONFIGURACIÓN CORRECTA
        await this._ensureSupabaseClient();

        if (!this.supabase) {
            console.error('[AuthClient] ❌ No se pudo inicializar Supabase');
            // Como último recurso, cargar sesión local
            this._loadSessionFromLocalStorage();
            return;
        }

        // Marcar cliente como listo ANTES de cualquier operación
        this._clientReady = true;
        console.log('[AuthClient] ✅ Cliente Supabase listo y configurado');

        // PASO 2: VERIFICAR SI HAY HASH EN URL (Magic Link)
        const hasHashInUrl = this._checkForUrlHash();

        if (hasHashInUrl) {
            console.log('[AuthClient] 🔗 Hash detectado en URL, esperando procesamiento de Supabase...');
            // Esperar un momento para que Supabase procese el hash
            await this._waitForHashProcessing();
        }

        // PASO 3: VERIFICAR SESIÓN CON SUPABASE (getSession)
        const supabaseSession = await this._getSupabaseSession();

        if (supabaseSession) {
            console.log('[AuthClient] ✅ Sesión activa de Supabase:', supabaseSession.user.email);
            this._processSession(supabaseSession);
        } else {
            // PASO 4: SOLO SI NO HAY SESIÓN EN SUPABASE, USAR LOCALSTORAGE
            console.log('[AuthClient] ℹ️ No hay sesión en Supabase, verificando localStorage...');
            this._loadSessionFromLocalStorage();
        }

        // Configurar listener de cambios (DEBE incluir INITIAL_SESSION)
        this._setupAuthListener();

        // Actualizar UI inmediatamente
        this.updateDashboardUI();

        console.log('[AuthClient] ✅ Sistema auth completamente inicializado');
    },

    /**
     * FIX #1 y #3: Asegurar cliente Supabase con configuración correcta
     */
    async _ensureSupabaseClient() {
        // Intentar usar cliente global
        if (typeof window !== 'undefined' && window.supabase?.auth) {
            this.supabase = window.supabase;
            console.log('[AuthClient] ✅ Usando cliente global existente');
            return;
        }

        // Intentar importar configuración
        try {
            const config = await import('../config/supabase-config.js');
            if (config.supabase?.auth) {
                this.supabase = config.supabase;
                console.log('[AuthClient] ✅ Cliente importado desde config');
                return;
            } else if (config.getSupabaseClient) {
                this.supabase = await config.getSupabaseClient();
                console.log('[AuthClient] ✅ Cliente obtenido con getSupabaseClient');
                return;
            }
        } catch (e) {
            console.warn('[AuthClient] ⚠️ Import de supabase-config falló:', e.message);
        }

        // Intentar crear cliente con configuración CORRECTA
        this._tryCreateClientWithCorrectConfig();

        // Si aún no hay cliente, esperar
        if (!this.supabase) {
            console.log('[AuthClient] ⏳ Esperando cliente Supabase global...');
            await this._waitForSupabase();
        }
    },

    /**
     * FIX #1: Crear cliente con auth config obligatoria
     */
    _tryCreateClientWithCorrectConfig() {
        try {
            let url, key;

            if (typeof import.meta !== 'undefined' && import.meta.env) {
                url = import.meta.env.VITE_SUPABASE_URL;
                key = import.meta.env.VITE_SUPABASE_ANON_KEY;
            }

            if (url && key && typeof window !== 'undefined' && window.supabase?.createClient) {
                // FIX CRÍTICO: Pasar configuración de auth explícitamente
                this.supabase = window.supabase.createClient(url, key, {
                    auth: {
                        detectSessionInUrl: true,    // CRÍTICO: detectar hash en URL
                        persistSession: true,          // Mantener sesión en localStorage
                        autoRefreshToken: true         // Refrescar token automáticamente
                    }
                });

                window.supabase = this.supabase;
                console.log('[AuthClient] ✅ Cliente creado con configuración auth correcta');
            }
        } catch (e) {
            console.warn('[AuthClient] ⚠️ Error creando cliente:', e.message);
        }
    },

    /**
     * FIX #2: Verificar si hay hash en URL
     */
    _checkForUrlHash() {
        if (typeof window === 'undefined') return false;

        const hash = window.location.hash;

        // Buscar parámetros de autenticación en el hash
        const hasAccessToken = hash.includes('access_token=');
        const hasRefreshToken = hash.includes('refresh_token=');
        const hasType = hash.includes('type=');

        return hasAccessToken || hasRefreshToken || hasType;
    },

    /**
     * FIX #2: Esperar a que Supabase procese el hash
     */
    async _waitForHashProcessing() {
        return new Promise((resolve) => {
            // Dar tiempo a Supabase para procesar el hash
            setTimeout(resolve, 500);
        });
    },

    /**
     * FIX #2 y #3: Obtener sesión de Supabase (solo cuando cliente esté listo)
     */
    async _getSupabaseSession() {
        if (!this.supabase || !this._clientReady) {
            console.warn('[AuthClient] ⚠️ Cliente no listo para getSession');
            return null;
        }

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error) {
                console.warn('[AuthClient] ⚠️ Error al obtener sesión:', error.message);
                return null;
            }

            return session;
        } catch (e) {
            console.error('[AuthClient] ❌ Error verificando sesión:', e);
            return null;
        }
    },

    /**
     * FIX #4: Listener robusto que maneja INITIAL_SESSION
     */
    _setupAuthListener() {
        if (!this.supabase) return;

        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AuthClient] 🔔 Auth cambió:', event, '| Session:', session ? 'EXISTS' : 'NULL');

            // FIX CRÍTICO: Manejar INITIAL_SESSION explícitamente
            if (event === 'INITIAL_SESSION') {
                if (session) {
                    console.log('[AuthClient] 🎯 INITIAL_SESSION detectada:', session.user.email);
                    this._processSession(session);
                    this._checkRedirectToHome();
                } else {
                    console.log('[AuthClient] ℹ️ INITIAL_SESSION sin sesión activa');
                }
            }
            // Manejar login y refresh de token
            else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session) {
                    console.log('[AuthClient] ✅ Sesión detectada:', session.user.email);
                    this._processSession(session);
                    this._checkRedirectToHome();
                }
            }
            // Manejar logout
            else if (event === 'SIGNED_OUT') {
                console.log('[AuthClient] 🚪 Sesión cerrada');
                this.currentSession = null;
                localStorage.removeItem(this.STORAGE_KEY);
                this.updateDashboardUI();
                this.emitAuthChange('SIGNED_OUT');
            }
        });
    },

    /**
     * FIX #2: Cargar de localStorage SOLO como último recurso
     */
    _loadSessionFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const session = JSON.parse(stored);

                // Verificar si la sesión no ha expirado
                if (session.expiresAt && session.expiresAt < Date.now()) {
                    console.log('[AuthClient] ⚠️ Sesión local expirada, limpiando...');
                    localStorage.removeItem(this.STORAGE_KEY);
                    return;
                }

                this.currentSession = session;
                console.log('[AuthClient] ✅ Sesión cargada de localStorage:', this.currentSession.user?.email);

                this._checkRedirectToHome();
                this.updateDashboardUI();
            } else {
                console.log('[AuthClient] ℹ️ No hay sesión guardada en localStorage');
            }
        } catch (e) {
            console.error('[AuthClient] ❌ Error al cargar sesión:', e);
            localStorage.removeItem(this.STORAGE_KEY);
        }
    },

    /**
     * Procesar sesión y actualizar estado
     */
    _processSession(session) {
        this.currentSession = {
            user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                avatar: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email)}&background=C8A752&color=0B0C0F&bold=true`,
                role: 'user',
                createdAt: session.user.created_at
            },
            token: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000).getTime() : null,
            createdAt: Date.now()
        };

        // Guardar en localStorage
        this._saveSessionToLocalStorage(this.currentSession);

        // Actualizar UI
        this.updateDashboardUI();

        // Emitir evento
        this.emitAuthChange('SIGNED_IN');
    },

    /**
     * Esperar a que Supabase esté disponible
     */
    _waitForSupabase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 20;

            const check = () => {
                attempts++;

                if (typeof window !== 'undefined' && window.supabase?.auth) {
                    this.supabase = window.supabase;
                    resolve(true);
                    return;
                }

                if (attempts >= maxAttempts) {
                    resolve(false);
                    return;
                }

                setTimeout(check, 100);
            };

            setTimeout(check, 100);
        });
    },

    /**
     * Verificar si debemos redirigir al dashboard
     */
    _checkRedirectToHome() {
        const path = window.location.pathname;
        const isHomePage = path === '/' || path === '/index.html' || path.endsWith('/index.html') || path === '';
        const notInDashboard = !path.includes('/dashboard');

        if (isHomePage && notInDashboard && this.currentSession) {
            console.log('[AuthClient] 🚀 Redirigiendo al Dashboard...');
            setTimeout(() => {
                window.location.href = '/dashboard/';
            }, 500);
        }
    },

    /**
     * 🎯 ACTUALIZACIÓN DIRECTA DE UI
     */
    updateDashboardUI() {
        const user = this.currentSession?.user;

        console.log('[AuthClient] 🎨 Actualizando UI...', user ? `Usuario: ${user.email}` : 'Sin sesión');

        // Elementos comunes
        const authButtons = document.querySelector('.auth-buttons') || document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const userMenuBtn = document.getElementById('user-menu-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');

        if (user) {
            // USUARIO AUTENTICADO
            console.log('[AuthClient] 🟢 Mostrando UI de usuario autenticado');

            // Ocultar botones de login/registro
            if (authButtons) authButtons.style.display = 'none';

            // Mostrar menú de usuario
            if (userMenu) userMenu.style.display = 'flex';

            // Actualizar nombre en el botón del menú
            if (userMenuBtn) {
                const nameSpan = userMenuBtn.querySelector('span');
                if (nameSpan) nameSpan.textContent = user.name || user.email.split('@')[0];

                const avatarImg = userMenuBtn.querySelector('.user-avatar-sm');
                if (avatarImg) {
                    avatarImg.src = user.avatar;
                    avatarImg.alt = user.name || 'Usuario';
                }
            }

            // Actualizar avatar en sidebar (dashboard)
            if (userAvatar) {
                userAvatar.textContent = (user.name || user.email).substring(0, 2).toUpperCase();
            }

            // Actualizar nombre en sidebar
            if (userName) {
                userName.textContent = user.name || user.email.split('@')[0];
            }

            // Actualizar email si existe el elemento
            if (userEmail) {
                userEmail.textContent = user.email;
            }

            // Mostrar botón de logout
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
                // Asegurar que tiene el evento de click
                logoutBtn.onclick = (e) => {
                    e.preventDefault();
                    this.logout();
                    window.location.href = '/';
                };
            }

        } else {
            // NO AUTENTICADO
            console.log('[AuthClient] 🔴 Mostrando UI de invitado');

            // Mostrar botones de login/registro
            if (authButtons) authButtons.style.display = 'flex';

            // Ocultar menú de usuario
            if (userMenu) userMenu.style.display = 'none';
        }

        // Emitir evento para que otros sistemas actualicen
        window.dispatchEvent(new CustomEvent('auth:ui:updated', {
            detail: { user, isAuthenticated: !!user }
        }));
    },

    async login(email, password) {
        console.log('[AuthClient] 🔐 Iniciando login...');

        if (!this.supabase) {
            return { success: false, error: 'Servicio no disponible. Recarga la página.' };
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

            console.log('✅ [AuthClient] Login exitoso:', data.user.email);

            // Procesar sesión (guarda y actualiza UI)
            this._processSession(data.session);

            // Redirigir al dashboard
            console.log('🚀 Redirigiendo al Dashboard...');
            setTimeout(() => {
                window.location.href = '/dashboard/';
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
            return { success: false, error: 'Servicio no disponible. Recarga la página.' };
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
        this.updateDashboardUI();
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

    _saveSessionToLocalStorage(session) {
        try {
            if (!session?.user) return;
            this.currentSession = session;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
            console.log('[AuthClient] ✅ Sesión guardada en localStorage');
        } catch (e) {
            console.error('[AuthClient] ❌ Error al guardar sesión:', e);
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

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.AuthClient = authClient;
}

// Named export para compatibilidad con imports
export { authClient as AuthClient };
export default authClient;
