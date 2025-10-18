/**
 * YAVLGOLD - PROFILE MANAGER v1.0
 * Gestión de perfiles extendidos de usuarios
 */
const ProfileManager = {
  supabase: null,

  init() {
    if (!AuthClient.supabase) {
      console.error('[ProfileManager] ❌ AuthClient no inicializado');
      return false;
    }
    this.supabase = AuthClient.supabase;
    console.log('[ProfileManager] ✅ Inicializado');
    return true;
  },

  /**
   * Obtener perfil de usuario por ID
   */
  async getProfile(userId) {
    try {
      console.log('[ProfileManager] 🔍 Consultando perfil para ID:', userId);
      
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

      console.log('[ProfileManager] 📊 Respuesta Supabase:', { data, error, count: data?.length });

      if (error) throw error;

      // Verificar si hay resultados
      if (!data || data.length === 0) {
        console.warn('[ProfileManager] ⚠️ No se encontraron resultados para ID:', userId);
        return { success: false, error: 'Perfil no encontrado' };
      }

      // Si hay múltiples (no debería pasar), tomar el primero
      const profile = data[0];

      console.log('[ProfileManager] ✅ Perfil obtenido:', profile.username);
      return { success: true, profile: profile };
    } catch (error) {
      console.error('[ProfileManager] ❌ Error al obtener perfil:', error.message);
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
   */
  async updateProfile(userId, updates) {
    try {
      // Validar campos
      const allowedFields = ['username', 'bio', 'avatar_url'];
      const sanitizedUpdates = {};
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          sanitizedUpdates[field] = updates[field];
        }
      }

      // Validar username si se está actualizando
      if (sanitizedUpdates.username) {
        if (sanitizedUpdates.username.length < 3) {
          return { success: false, error: 'El username debe tener al menos 3 caracteres' };
        }
        if (!/^[a-z0-9_]+$/.test(sanitizedUpdates.username)) {
          return { success: false, error: 'El username solo puede contener letras minúsculas, números y guiones bajos' };
        }
        
        // Verificar que el username no esté en uso
        const { data: existing } = await this.supabase
          .from('profiles')
          .select('id')
          .eq('username', sanitizedUpdates.username)
          .neq('id', userId)
          .single();
        
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
        .select()
        .single();

      if (error) throw error;

      console.log('[ProfileManager] ✅ Perfil actualizado');
      
      // Actualizar sesión local si es el usuario actual
      const session = AuthClient.getSession();
      if (session?.user?.id === userId) {
        session.user.name = data.username;
        session.user.avatar = data.avatar_url;
        AuthClient.saveSession(session);
      }

      return { success: true, profile: data };
    } catch (error) {
      console.error('[ProfileManager] ❌ Error al actualizar perfil:', error.message);
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
    if (bio.length > 500) {
      return { success: false, error: 'La biografía no puede tener más de 500 caracteres' };
    }
    return await this.updateProfile(userId, { bio: bio });
  },

  /**
   * Actualizar username
   */
  async updateUsername(userId, username) {
    return await this.updateProfile(userId, { username: username });
  },

  /**
   * Verificar si un usuario es admin
   */
  async isAdmin(userId) {
    try {
      // Verificar que ProfileManager esté inicializado
      if (!this.supabase) {
        console.warn('[ProfileManager] ⚠️ No inicializado aún, esperando...');
        // Esperar un momento para que se inicialice
        await new Promise(resolve => setTimeout(resolve, 150));
        if (!this.supabase) {
          return { success: false, isAdmin: false, error: 'ProfileManager no inicializado' };
        }
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId);

      if (error) throw error;

      // Verificar si hay resultados
      if (!data || data.length === 0) {
        return { success: false, isAdmin: false, error: 'Perfil no encontrado' };
      }

      // Tomar el primer resultado (debería ser único por PK)
      const profile = data[0];

      return { success: true, isAdmin: profile.is_admin === true };
    } catch (error) {
      console.error('[ProfileManager] ❌ Error al verificar admin:', error.message);
      return { success: false, isAdmin: false };
    }
  },

  /**
   * Obtener múltiples perfiles (para mostrar usuarios)
   */
  async getProfiles(options = {}) {
    try {
      let query = this.supabase.from('profiles').select('*');

      // Aplicar filtros
      if (options.limit) query = query.limit(options.limit);
      if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending !== false });

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, profiles: data };
    } catch (error) {
      console.error('[ProfileManager] ❌ Error al obtener perfiles:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Buscar perfiles por username
   */
  async searchProfiles(searchTerm) {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      return { success: true, profiles: data };
    } catch (error) {
      console.error('[ProfileManager] ❌ Error al buscar perfiles:', error.message);
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
