/**
 * YavlGold - Cliente Auth (V9.5 - Fix Completo de Sesión)
 * Ruta: apps/gold/assets/js/auth/authClient.js
 *
 * FIXES:
 * - Sincronización de keys de localStorage
 * - updateDashboardUI para actualización directa
 * - Mejor manejo de INITIAL_SESSION
 */

const authClient = {
    supabase: null,
    currentSession: null,
    STORAGE_KEY: 'yavl:session',
    _initPromise: null,

    /**
     * Inicializar el cliente de autenticación
     */
    async init() {
        console.log('[AuthClient] 🚀 Inicializando...');

        if (this._initPromise) return this._initPromise;

        this._initPromise = this._doInit();
        return this._initPromise;
    },

    async _doInit() {
        // Buscar cliente Supabase
        if (typeof window !== 'undefined' && window.supabase && window.supabase.auth) {
            this.supabase = window.supabase;
            console.log('[AuthClient] ✅ Usando cliente global existente');
        } else {
            try {
                const config = await import('../config/supabase-config.js');
                if (config.supabase && config.supabase.auth) {
                    this.supabase = config.supabase;
                    console.log('[AuthClient] ✅ Usando cliente importado');
                } else if (config.getSupabaseClient) {
                    this.supabase = await config.getSupabaseClient();
                    console.log('[AuthClient] ✅ Cliente obtenido con getSupabaseClient');
                }
            } catch (e) {
                console.warn('[AuthClient] ⚠️ Import de supabase-config falló:', e.message);
            }
        }

        if (!this.supabase) {
            this._tryCreateClient();
        }

        if (!this.supabase) {
            console.warn('[AuthClient] ⚠️ Supabase no disponible. Esperando...');
            await this._waitForSupabase();
        }

        if (!this.supabase) {
            console.error('[AuthClient] ❌ No se pudo inicializar Supabase');
            // Aún así intentar cargar sesión local
            this.loadSession();
            return;
        }

        // Cargar sesión local primero
        this.loadSession();

        // Luego verificar con Supabase
        await this.checkSupabaseSession();

        // Escuchar cambios futuros
        this.listenAuthChanges();

        // Actualizar UI inmediatamente
        this.updateDashboardUI();

        console.log('[AuthClient] ✅ Sistema auth inicializado');
    },

    /**
     * Verificar sesión directamente con Supabase
     */
    async checkSupabaseSession() {
        if (!this.supabase) return;

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error) {
                console.warn('[AuthClient] ⚠️ Error al obtener sesión:', error.message);
                return;
            }

            if (session) {
                console.log('[AuthClient] ✅ Sesión de Supabase encontrada:', session.user.email);
                this._processSession(session);
            } else {
                console.log('[AuthClient] ℹ️ No hay sesión activa en Supabase');
                // Si no hay sesión en Supabase pero sí local, la sesión expiró
                if (this.currentSession) {
                    console.log('[AuthClient] ⚠️ Sesión local expirada, limpiando...');
                    this.currentSession = null;
                    localStorage.removeItem(this.STORAGE_KEY);
                }
            }
        } catch (e) {
            console.error('[AuthClient] ❌ Error verificando sesión:', e);
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
        this.saveSession(this.currentSession);

        // Actualizar UI
        this.updateDashboardUI();

        // Emitir evento
        this.emitAuthChange('SIGNED_IN');
    },

    _waitForSupabase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 20;

            const check = () => {
                attempts++;

                if (typeof window !== 'undefined' && window.supabase && window.supabase.auth) {
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

    _tryCreateClient() {
        try {
            let url, key;

            if (typeof import.meta !== 'undefined' && import.meta.env) {
                url = import.meta.env.VITE_SUPABASE_URL;
                key = import.meta.env.VITE_SUPABASE_ANON_KEY;
            }

            if (url && key && typeof window !== 'undefined') {
                if (window.supabase?.createClient) {
                    this.supabase = window.supabase.createClient(url, key);
                    window.supabase = this.supabase;
                    console.log('[AuthClient] ✅ Cliente creado con env vars');
                }
            }
        } catch (e) {
            console.warn('[AuthClient] ⚠️ Error creando cliente:', e.message);
        }
    },

    listenAuthChanges() {
        if (!this.supabase) return;

        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AuthClient] 🔔 Auth cambió:', event, '| Session:', session ? 'EXISTS' : 'NULL');

            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
                console.log('[AuthClient] ✅ Sesión detectada:', session.user.email);
                this._processSession(session);

                // Redirección si estamos en homepage
                this._checkRedirectToHome();

            } else if (event === 'SIGNED_OUT') {
                console.log('[AuthClient] 🚪 Sesión cerrada');
                this.currentSession = null;
                localStorage.removeItem(this.STORAGE_KEY);
                this.updateDashboardUI();
                this.emitAuthChange('SIGNED_OUT');
            }
            // INITIAL_SESSION se maneja en checkSupabaseSession()
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
     * Esta función actualiza los elementos del DOM directamente
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

    saveSession(session) {
        try {
            if (!session?.user) return;
            this.currentSession = session;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
            console.log('[AuthClient] ✅ Sesión guardada en localStorage');
        } catch (e) {
            console.error('[AuthClient] Error al guardar sesión:', e);
        }
    },

    loadSession() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.currentSession = JSON.parse(stored);
                console.log('[AuthClient] ✅ Sesión cargada de localStorage:', this.currentSession.user?.email);

                // Verificar si debemos redirigir
                this._checkRedirectToHome();

                // Actualizar UI con la sesión local
                this.updateDashboardUI();
            } else {
                console.log('[AuthClient] ℹ️ No hay sesión guardada en localStorage');
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

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.AuthClient = authClient;
}

export default authClient;
