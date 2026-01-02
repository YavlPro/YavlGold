/**
 * YAVLGOLD - PROFILE MANAGER v1.1 (Security Hardened)
 * Gestión de perfiles extendidos de usuarios
 *
 * SECURITY FIXES v1.1:
 * - Explicit column selection (no select('*'))
 * - maybeSingle() instead of single() for existence checks
 * - Bio validation in updateProfile
 * - Logger instead of console.log
 * - isAdmin scoped to current user only
 */
import { logger } from '../utils/logger.js';

// Columnas seguras para diferentes contextos
const PROFILE_COLUMNS = {
  public: 'id, username, avatar_url, bio',
  own: 'id, username, avatar_url, bio, updated_at, created_at',
  admin: 'id, is_admin'
};

const ProfileManager = {
  supabase: null,

  init() {
    if (!AuthClient.supabase) {
      logger.error('[ProfileManager] AuthClient no inicializado');
      return false;
    }
    this.supabase = AuthClient.supabase;
    logger.success('[ProfileManager] Inicializado');
    return true;
  },

  /**
   * Obtener perfil de usuario por ID
   * Usa columnas explícitas para evitar fuga de datos
   */
  async getProfile(userId) {
    try {
      logger.debug('[ProfileManager] Consultando perfil');

      const { data, error } = await this.supabase
        .from('profiles')
        .select(PROFILE_COLUMNS.own)
        .eq('id', userId)
        .maybeSingle(); // Fix: maybeSingle en lugar de array

      if (error) throw error;

      if (!data) {
        logger.warn('[ProfileManager] Perfil no encontrado');
        return { success: false, error: 'Perfil no encontrado' };
      }

      logger.debug('[ProfileManager] Perfil obtenido', { hasData: !!data });
      return { success: true, profile: data };
    } catch (error) {
      logger.error('[ProfileManager] Error al obtener perfil:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener perfil actual del usuario logueado
   */
  async getCurrentProfile() {
    const session = AuthClient.getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'No hay sesión activa' };
    }
    return await this.getProfile(session.user.id);
  },

  /**
   * Actualizar perfil de usuario
   * Incluye validación de bio dentro del método
   */
  async updateProfile(userId, updates) {
    try {
      // Validar campos permitidos (whitelist)
      const allowedFields = ['username', 'bio', 'avatar_url'];
      const sanitizedUpdates = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          sanitizedUpdates[field] = updates[field];
        }
      }

      // Validar bio si se está actualizando (fix: validación centralizada)
      if (sanitizedUpdates.bio && sanitizedUpdates.bio.length > 500) {
        return { success: false, error: 'La biografía no puede tener más de 500 caracteres' };
      }

      // Validar username si se está actualizando
      if (sanitizedUpdates.username) {
        if (sanitizedUpdates.username.length < 3) {
          return { success: false, error: 'El username debe tener al menos 3 caracteres' };
        }
        if (!/^[a-z0-9_]+$/.test(sanitizedUpdates.username)) {
          return { success: false, error: 'El username solo puede contener letras minúsculas, números y guiones bajos' };
        }

        // Fix: usar maybeSingle() en lugar de single()
        const { data: existing, error: existErr } = await this.supabase
          .from('profiles')
          .select('id')
          .eq('username', sanitizedUpdates.username)
          .neq('id', userId)
          .maybeSingle();

        if (existErr) throw existErr;
        if (existing) {
          return { success: false, error: 'Este username ya está en uso' };
        }
      }

      // Agregar timestamp de actualización
      sanitizedUpdates.updated_at = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('profiles')
        .update(sanitizedUpdates)
        .eq('id', userId)
        .select(PROFILE_COLUMNS.own)
        .maybeSingle();

      if (error) throw error;

      logger.success('[ProfileManager] Perfil actualizado');

      // Actualizar sesión local si es el usuario actual
      const session = AuthClient.getSession();
      if (session?.user?.id === userId && data) {
        session.user.name = data.username;
        session.user.avatar = data.avatar_url;
        AuthClient.saveSession(session);
      }

      return { success: true, profile: data };
    } catch (error) {
      logger.error('[ProfileManager] Error al actualizar perfil:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Actualizar avatar
   */
  async updateAvatar(userId, avatarUrl) {
    return await this.updateProfile(userId, { avatar_url: avatarUrl });
  },

  /**
   * Actualizar biografía
   */
  async updateBio(userId, bio) {
    // La validación ahora está centralizada en updateProfile
    return await this.updateProfile(userId, { bio: bio });
  },

  /**
   * Actualizar username
   */
  async updateUsername(userId, username) {
    return await this.updateProfile(userId, { username: username });
  },

  /**
   * Verificar si el USUARIO ACTUAL es admin
   * Fix: Solo permite verificar el usuario logueado, no cualquier userId
   */
  async isCurrentUserAdmin() {
    try {
      const session = AuthClient.getSession();
      const uid = session?.user?.id;

      if (!uid) {
        return { success: false, isAdmin: false, error: 'No hay sesión activa' };
      }

      // Verificar que ProfileManager esté inicializado
      if (!this.supabase) {
        logger.warn('[ProfileManager] No inicializado aún, esperando...');
        await new Promise(resolve => setTimeout(resolve, 150));
        if (!this.supabase) {
          return { success: false, isAdmin: false, error: 'ProfileManager no inicializado' };
        }
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select(PROFILE_COLUMNS.admin)
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        logger.error('[ProfileManager] Error al verificar admin:', error.message);
        return { success: false, isAdmin: false, error: error.message };
      }

      return { success: true, isAdmin: data?.is_admin === true };
    } catch (error) {
      logger.error('[ProfileManager] Error al verificar admin:', error.message);
      return { success: false, isAdmin: false };
    }
  },

  /**
   * @deprecated Use isCurrentUserAdmin() instead
   * Mantiene compatibilidad pero solo verifica usuario actual
   */
  async isAdmin(userId) {
    logger.warn('[ProfileManager] isAdmin(userId) deprecado, usar isCurrentUserAdmin()');
    const session = AuthClient.getSession();
    // Solo permitir verificar si es el usuario actual
    if (userId !== session?.user?.id) {
      return { success: false, isAdmin: false, error: 'Solo puedes verificar tu propio estado de admin' };
    }
    return await this.isCurrentUserAdmin();
  },

  /**
   * Obtener múltiples perfiles (para mostrar usuarios)
   * Fix: Solo columnas públicas, nunca select('*')
   */
  async getProfiles(options = {}) {
    try {
      let query = this.supabase
        .from('profiles')
        .select(PROFILE_COLUMNS.public); // Fix: columnas explícitas

      // Aplicar filtros
      if (options.limit) query = query.limit(options.limit);
      if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending !== false });

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, profiles: data };
    } catch (error) {
      logger.error('[ProfileManager] Error al obtener perfiles:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Buscar perfiles por username
   * Fix: Solo columnas públicas, nunca select('*')
   */
  async searchProfiles(searchTerm) {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select(PROFILE_COLUMNS.public) // Fix: columnas explícitas
        .ilike('username', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      return { success: true, profiles: data };
    } catch (error) {
      logger.error('[ProfileManager] Error al buscar perfiles:', error.message);
      return { success: false, error: error.message };
    }
  }
};

// Exponer ProfileManager globalmente
window.ProfileManager = ProfileManager;

// Auto-inicializar cuando se carga el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => ProfileManager.init(), 100);
  });
} else {
  setTimeout(() => ProfileManager.init(), 100);
}
