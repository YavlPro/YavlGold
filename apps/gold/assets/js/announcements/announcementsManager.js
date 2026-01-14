/**
 * YAVLGOLD - ANNOUNCEMENTS MANAGER v1.0
 * Gestión de anuncios y comunicados
 */
const AnnouncementsManager = {
  supabase: null,
  _initialized: false,
  cache: {
    announcements: [],
    lastFetch: 0,
    cacheDuration: 5 * 60 * 1000 // 5 minutos
  },

  init(attempt = 0) {
    if (this._initialized) return true;

    const client = typeof window !== 'undefined' ? window.AuthClient : null;
    if (!client?.supabase) {
      const maxAttempts = 20;
      const retryDelayMs = 200;

      if (attempt < maxAttempts) {
        setTimeout(() => this.init(attempt + 1), retryDelayMs);
        return false;
      }

      console.error('[AnnouncementsManager] ? AuthClient no inicializado');
      return false;
    }
    this.supabase = client.supabase;
    this._initialized = true;
    console.log('[AnnouncementsManager] ? Inicializado');
    return true;
  },

  /**
   * Obtener todos los anuncios (ordenados por fecha)
   */
  async getAnnouncements(options = {}) {
    try {
      // Usar caché si está disponible y no ha expirado Y no se fuerza refresh
      const now = Date.now();
      if (!options.forceRefresh && 
          this.cache.announcements.length > 0 && 
          (now - this.cache.lastFetch) < this.cache.cacheDuration) {
        console.log('[AnnouncementsManager] 📦 Usando caché');
        return { success: true, announcements: this.cache.announcements, fromCache: true };
      }

      console.log('[AnnouncementsManager] 🔄 Consultando base de datos (forceRefresh:', options.forceRefresh, ')');

      let query = this.supabase
        .from('announcements')
        .select(`
          *,
          author:profiles!announcements_author_id_fkey(username, avatar_url)
        `);

      // Aplicar filtros
      if (options.limit) query = query.limit(options.limit);
      if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      
      // Ordenar por fecha de creación descendente (más recientes primero)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Actualizar caché
      this.cache.announcements = data;
      this.cache.lastFetch = now;

      console.log('[AnnouncementsManager] ✅ Anuncios obtenidos:', data.length);
      if (data.length > 0) {
        console.log('[AnnouncementsManager] 📋 IDs:', data.map(a => a.id));
      }
      return { success: true, announcements: data, fromCache: false };
    } catch (error) {
      console.error('[AnnouncementsManager] ❌ Error al obtener anuncios:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener un anuncio específico por ID
   */
  async getAnnouncement(id) {
    try {
      const { data, error } = await this.supabase
        .from('announcements')
        .select(`
          *,
          author:profiles!announcements_author_id_fkey(username, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, announcement: data };
    } catch (error) {
      console.error('[AnnouncementsManager] ❌ Error al obtener anuncio:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Crear nuevo anuncio (solo admins)
   */
  async createAnnouncement(title, content) {
    try {
      const session = AuthClient.getSession();
      if (!session?.user?.id) {
        return { success: false, error: 'No hay sesión activa' };
      }

      // Verificar que el usuario es admin
      const adminCheck = await ProfileManager.isAdmin(session.user.id);
      if (!adminCheck.success || !adminCheck.isAdmin) {
        return { success: false, error: 'No tienes permisos para crear anuncios' };
      }

      // Validar campos
      if (!title || title.trim().length === 0) {
        return { success: false, error: 'El título es obligatorio' };
      }
      if (!content || content.trim().length === 0) {
        return { success: false, error: 'El contenido es obligatorio' };
      }
      if (title.length > 200) {
        return { success: false, error: 'El título no puede tener más de 200 caracteres' };
      }
      if (content.length > 5000) {
        return { success: false, error: 'El contenido no puede tener más de 5000 caracteres' };
      }

      const { data, error } = await this.supabase
        .from('announcements')
        .insert({
          title: title.trim(),
          content: content.trim(),
          author_id: session.user.id
        })
        .select(`
          *,
          author:profiles!announcements_author_id_fkey(username, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Invalidar caché
      this.cache.lastFetch = 0;

      console.log('[AnnouncementsManager] ✅ Anuncio creado:', data.id);
      return { success: true, announcement: data };
    } catch (error) {
      console.error('[AnnouncementsManager] ❌ Error al crear anuncio:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Actualizar anuncio existente (solo autor o admin)
   */
  async updateAnnouncement(id, updates) {
    try {
      const session = AuthClient.getSession();
      if (!session?.user?.id) {
        return { success: false, error: 'No hay sesión activa' };
      }

      // Obtener anuncio actual
      const current = await this.getAnnouncement(id);
      if (!current.success) {
        return current;
      }

      // Verificar permisos (autor o admin)
      const isAuthor = current.announcement.author_id === session.user.id;
      const adminCheck = await ProfileManager.isAdmin(session.user.id);
      const isAdmin = adminCheck.success && adminCheck.isAdmin;

      if (!isAuthor && !isAdmin) {
        return { success: false, error: 'No tienes permisos para editar este anuncio' };
      }

      // Validar campos
      const allowedFields = ['title', 'content'];
      const sanitizedUpdates = {};
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          if (field === 'title' && updates[field].length > 200) {
            return { success: false, error: 'El título no puede tener más de 200 caracteres' };
          }
          if (field === 'content' && updates[field].length > 5000) {
            return { success: false, error: 'El contenido no puede tener más de 5000 caracteres' };
          }
          sanitizedUpdates[field] = updates[field].trim();
        }
      }

      sanitizedUpdates.updated_at = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('announcements')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select(`
          *,
          author:profiles!announcements_author_id_fkey(username, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Invalidar caché
      this.cache.lastFetch = 0;

      console.log('[AnnouncementsManager] ✅ Anuncio actualizado:', id);
      return { success: true, announcement: data };
    } catch (error) {
      console.error('[AnnouncementsManager] ❌ Error al actualizar anuncio:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Eliminar anuncio (solo autor o admin)
   */
  async deleteAnnouncement(id) {
    try {
      const session = AuthClient.getSession();
      if (!session?.user?.id) {
        return { success: false, error: 'No hay sesión activa' };
      }

      // Obtener anuncio actual
      const current = await this.getAnnouncement(id);
      if (!current.success) {
        return current;
      }

      // Verificar permisos (autor o admin)
      const isAuthor = current.announcement.author_id === session.user.id;
      const adminCheck = await ProfileManager.isAdmin(session.user.id);
      const isAdmin = adminCheck.success && adminCheck.isAdmin;

      if (!isAuthor && !isAdmin) {
        return { success: false, error: 'No tienes permisos para eliminar este anuncio' };
      }

      const { error } = await this.supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Invalidar caché
      this.cache.lastFetch = 0;

      console.log('[AnnouncementsManager] ✅ Anuncio eliminado:', id);
      return { success: true };
    } catch (error) {
      console.error('[AnnouncementsManager] ❌ Error al eliminar anuncio:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Buscar anuncios por título o contenido
   */
  async searchAnnouncements(searchTerm) {
    try {
      const { data, error } = await this.supabase
        .from('announcements')
        .select(`
          *,
          author:profiles!announcements_author_id_fkey(username, avatar_url)
        `)
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      console.log('[AnnouncementsManager] 🔍 Búsqueda completada:', data.length, 'resultados');
      return { success: true, announcements: data };
    } catch (error) {
      console.error('[AnnouncementsManager] ❌ Error en búsqueda:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Limpiar caché manualmente
   */
  clearCache() {
    this.cache.announcements = [];
    this.cache.lastFetch = 0;
    console.log('[AnnouncementsManager] 🗑️ Caché limpiado');
  }
};

// Auto-inicializar cuando se carga el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => AnnouncementsManager.init(), 100);
  });
} else {
  setTimeout(() => AnnouncementsManager.init(), 100);
}
