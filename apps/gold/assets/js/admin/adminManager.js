/**
 * AdminManager - Super Admin Panel for Global Management
 * YavlGold V9.4
 */
import { supabase } from '../config/supabase-config.js';
import { logger } from '../utils/logger.js';

export const AdminManager = {
    _initialized: false,
    _isAdmin: false,
    _adminRole: null,

    /**
     * Initialize admin system - checks if current user is admin
     */
    async init() {
        console.log('👑 [AdminManager] init() llamado');
        if (this._initialized) {
            console.log('👑 [AdminManager] Ya inicializado, saliendo');
            return;
        }
        this._initialized = true;

        await this._checkAdminStatus();

        console.log('👑 [AdminManager] _isAdmin =', this._isAdmin);

        if (this._isAdmin) {
            console.log('👑 [AdminManager] Inyectando botón...');
            this._injectAdminButton();
            this._injectStyles();
            console.log('👑 [AdminManager] ¡Admin mode ACTIVADO!');
            logger.success('[AdminManager] 👑 Admin mode activated');
        } else {
            console.log('👑 [AdminManager] Usuario NO es admin');
        }
    },

    /**
     * Check if current user is an admin
     * @private
     */
    async _checkAdminStatus() {
        console.log('👑 [AdminManager] Verificando status de admin...');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.log('👑 [AdminManager] No hay sesión');
                return;
            }

            console.log('👑 [AdminManager] User ID:', session.user.id);

            const { data, error } = await supabase
                .from('app_admins')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle();

            console.log('👑 [AdminManager] Query result:', { data, error });

            if (error) {
                console.warn('👑 [AdminManager] Error en query:', error.message);
                logger.debug('[AdminManager] Not an admin or table not exists');
                return;
            }

            if (data) {
                this._isAdmin = true;
                this._adminRole = data.role;
                console.log('👑 [AdminManager] ¡ES ADMIN! Role:', data.role);
                logger.debug(`[AdminManager] Admin detected: ${data.role}`);
            } else {
                console.log('👑 [AdminManager] No está en app_admins');
            }
        } catch (err) {
            console.error('👑 [AdminManager] Error inesperado:', err);
            logger.error('[AdminManager] Check status error:', err.message);
        }
    },

    /**
     * Inject admin button in dashboard header
     * @private
     */
    _injectAdminButton() {
        const header = document.querySelector('.dashboard-header');
        if (!header) return;

        // Find settings button to insert before it
        const settingsBtn = document.getElementById('settings-btn');

        const adminBtn = document.createElement('button');
        adminBtn.id = 'admin-btn';
        adminBtn.className = 'btn-admin';
        adminBtn.title = 'Panel de Administración';
        adminBtn.innerHTML = '<i class="fas fa-crown"></i>';

        adminBtn.addEventListener('click', () => this.showAdminPanel());

        if (settingsBtn && settingsBtn.parentNode) {
            settingsBtn.parentNode.insertBefore(adminBtn, settingsBtn);
        } else {
            header.appendChild(adminBtn);
        }
    },

    /**
     * Show admin panel modal
     */
    async showAdminPanel() {
        const existing = document.getElementById('admin-panel-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'admin-panel-modal';
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-header">
                    <h2>👑 Panel de Control Global</h2>
                    <button class="admin-close" onclick="document.getElementById('admin-panel-modal').remove()">&times;</button>
                </div>

                <div class="admin-tabs">
                    <button class="admin-tab active" data-tab="announcements">📢 Anuncios</button>
                    <button class="admin-tab" data-tab="stats">📊 Stats</button>
                </div>

                <div class="admin-tab-content active" id="tab-announcements">
                    <div class="admin-section">
                        <h3>Crear Anuncio</h3>
                        <form id="admin-announcement-form">
                            <div class="admin-form-group">
                                <label>Título</label>
                                <input type="text" id="ann-title" placeholder="Título del anuncio" required>
                            </div>
                            <div class="admin-form-group">
                                <label>Mensaje (opcional)</label>
                                <textarea id="ann-message" placeholder="Descripción..."></textarea>
                            </div>
                            <div class="admin-form-row">
                                <div class="admin-form-group">
                                    <label>Tipo</label>
                                    <select id="ann-type">
                                        <option value="info">ℹ️ Info (Azul)</option>
                                        <option value="success">✅ Success (Dorado)</option>
                                        <option value="warning">⚠️ Warning (Naranja)</option>
                                        <option value="danger">🚨 Danger (Rojo)</option>
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label>Estado</label>
                                    <label class="admin-switch">
                                        <input type="checkbox" id="ann-active" checked>
                                        <span class="slider"></span>
                                        <span class="label">Activo</span>
                                    </label>
                                </div>
                            </div>
                            <button type="submit" class="btn-admin-submit">
                                <i class="fas fa-bullhorn"></i> Publicar Anuncio
                            </button>
                        </form>
                    </div>

                    <div class="admin-section">
                        <h3>Anuncios Existentes</h3>
                        <div id="admin-announcements-list" class="admin-list">
                            <div class="admin-loading">Cargando...</div>
                        </div>
                    </div>
                </div>

                <div class="admin-tab-content" id="tab-stats">
                    <div class="admin-section">
                        <h3>Estadísticas del Sistema</h3>
                        <div id="admin-stats" class="admin-stats-grid">
                            <div class="stat-box">
                                <span class="stat-value" id="admin-stat-users">-</span>
                                <span class="stat-label">Usuarios</span>
                            </div>
                            <div class="stat-box">
                                <span class="stat-value" id="admin-stat-modules">-</span>
                                <span class="stat-label">Módulos</span>
                            </div>
                            <div class="stat-box">
                                <span class="stat-value" id="admin-stat-feedback">-</span>
                                <span class="stat-label">Feedback</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event handlers
        this._setupPanelEvents(modal);

        // Load announcements list
        await this._loadAnnouncementsList();
        await this._loadStats();
    },

    /**
     * Setup panel event handlers
     * @private
     */
    _setupPanelEvents(modal) {
        // Tab switching
        modal.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                modal.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
            });
        });

        // Form submission
        document.getElementById('admin-announcement-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this._createAnnouncement();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    /**
     * Create new announcement
     * @private
     */
    async _createAnnouncement() {
        const title = document.getElementById('ann-title').value.trim();
        const message = document.getElementById('ann-message').value.trim();
        const type = document.getElementById('ann-type').value;
        const isActive = document.getElementById('ann-active').checked;

        if (!title) {
            this._showToast('⚠️ El título es requerido', 'warning');
            return;
        }

        const submitBtn = document.querySelector('.btn-admin-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';

        try {
            const { error } = await supabase
                .from('announcements')
                .insert({
                    title,
                    message: message || null,
                    type,
                    is_active: isActive
                });

            if (error) {
                throw error;
            }

            this._showToast('✅ Anuncio publicado exitosamente', 'success');

            // Reset form
            document.getElementById('admin-announcement-form').reset();
            document.getElementById('ann-active').checked = true;

            // Reload list
            await this._loadAnnouncementsList();

        } catch (err) {
            logger.error('[AdminManager] Create error:', err.message);
            this._showToast('❌ Error: ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-bullhorn"></i> Publicar Anuncio';
        }
    },

    /**
     * Load announcements list
     * @private
     */
    async _loadAnnouncementsList() {
        const container = document.getElementById('admin-announcements-list');
        if (!container) return;

        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="admin-empty">No hay anuncios</p>';
                return;
            }

            container.innerHTML = data.map(ann => `
                <div class="admin-list-item ${ann.is_active ? 'active' : 'inactive'}">
                    <div class="item-info">
                        <span class="item-type type-${ann.type}">${this._getTypeIcon(ann.type)}</span>
                        <div class="item-text">
                            <strong>${ann.title}</strong>
                            <small>${new Date(ann.created_at).toLocaleDateString('es-ES')}</small>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-toggle ${ann.is_active ? 'on' : 'off'}"
                                onclick="window.AdminManager.toggleAnnouncement('${ann.id}', ${!ann.is_active})"
                                title="${ann.is_active ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${ann.is_active ? 'eye' : 'eye-slash'}"></i>
                        </button>
                        <button class="btn-delete"
                                onclick="window.AdminManager.deleteAnnouncement('${ann.id}')"
                                title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            logger.error('[AdminManager] Load list error:', err.message);
            container.innerHTML = '<p class="admin-error">Error al cargar</p>';
        }
    },

    /**
     * Toggle announcement active status
     */
    async toggleAnnouncement(id, newStatus) {
        try {
            const { error } = await supabase
                .from('announcements')
                .update({ is_active: newStatus })
                .eq('id', id);

            if (error) throw error;

            this._showToast(newStatus ? '✅ Anuncio activado' : '⏸️ Anuncio desactivado', 'success');
            await this._loadAnnouncementsList();

        } catch (err) {
            logger.error('[AdminManager] Toggle error:', err.message);
            this._showToast('❌ Error: ' + err.message, 'error');
        }
    },

    /**
     * Delete announcement
     */
    async deleteAnnouncement(id) {
        if (!confirm('¿Estás seguro de eliminar este anuncio?')) return;

        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this._showToast('🗑️ Anuncio eliminado', 'success');
            await this._loadAnnouncementsList();

        } catch (err) {
            logger.error('[AdminManager] Delete error:', err.message);
            this._showToast('❌ Error: ' + err.message, 'error');
        }
    },

    /**
     * Load system stats
     * @private
     */
    async _loadStats() {
        try {
            // Users count (profiles)
            const { count: usersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            const usersEl = document.getElementById('admin-stat-users');
            if (usersEl) usersEl.textContent = usersCount || 0;

            // Modules count
            const { count: modulesCount } = await supabase
                .from('modules')
                .select('*', { count: 'exact', head: true });

            const modulesEl = document.getElementById('admin-stat-modules');
            if (modulesEl) modulesEl.textContent = modulesCount || 0;

            // Feedback count
            const { count: feedbackCount } = await supabase
                .from('feedback')
                .select('*', { count: 'exact', head: true });

            const feedbackEl = document.getElementById('admin-stat-feedback');
            if (feedbackEl) feedbackEl.textContent = feedbackCount || 0;

        } catch (err) {
            logger.error('[AdminManager] Stats error:', err.message);
        }
    },

    /**
     * Get icon for announcement type
     * @private
     */
    _getTypeIcon(type) {
        const icons = { 'info': 'ℹ️', 'success': '✅', 'warning': '⚠️', 'danger': '🚨' };
        return icons[type] || 'ℹ️';
    },

    /**
     * Show toast notification
     * @private
     */
    _showToast(message, type = 'info') {
        const colors = { 'info': '#1E88E5', 'success': '#C8A752', 'warning': '#FFA726', 'error': '#EF5350' };
        const toast = document.createElement('div');
        toast.className = 'admin-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(10, 10, 10, 0.95);
            color: ${colors[type] || colors.info};
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid ${colors[type] || colors.info};
            font-family: 'Rajdhani', sans-serif;
            z-index: 10003;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    },

    /**
     * Inject admin panel styles
     * @private
     */
    _injectStyles() {
        if (document.getElementById('admin-styles')) return;

        const style = document.createElement('style');
        style.id = 'admin-styles';
        style.textContent = `
            /* Admin Button */
            .btn-admin {
                background: linear-gradient(135deg, #C8A752, #B8941A);
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                color: #000;
            }
            .btn-admin:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 15px rgba(200, 167, 82, 0.4);
            }

            /* Modal */
            .admin-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                animation: fadeIn 0.2s ease;
            }
            .admin-modal-content {
                background: #0f0f0f;
                border: 1px solid rgba(200, 167, 82, 0.3);
                border-radius: 16px;
                width: 95%;
                max-width: 600px;
                max-height: 85vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .admin-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(200, 167, 82, 0.2);
                background: rgba(200, 167, 82, 0.05);
            }
            .admin-header h2 {
                margin: 0;
                color: #C8A752;
                font-family: 'Orbitron', sans-serif;
                font-size: 1.1rem;
            }
            .admin-close {
                background: none;
                border: none;
                color: #C8A752;
                font-size: 1.5rem;
                cursor: pointer;
            }

            /* Tabs */
            .admin-tabs {
                display: flex;
                border-bottom: 1px solid rgba(200, 167, 82, 0.2);
            }
            .admin-tab {
                flex: 1;
                padding: 12px;
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.5);
                font-family: 'Rajdhani', sans-serif;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .admin-tab.active {
                color: #C8A752;
                border-bottom: 2px solid #C8A752;
            }
            .admin-tab-content {
                display: none;
                padding: 20px;
                overflow-y: auto;
                max-height: calc(85vh - 140px);
            }
            .admin-tab-content.active {
                display: block;
            }

            /* Sections */
            .admin-section {
                margin-bottom: 24px;
            }
            .admin-section h3 {
                color: #C8A752;
                font-family: 'Rajdhani', sans-serif;
                font-size: 1rem;
                margin: 0 0 12px 0;
            }

            /* Form */
            .admin-form-group {
                margin-bottom: 12px;
            }
            .admin-form-group label {
                display: block;
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.85rem;
                margin-bottom: 4px;
            }
            .admin-form-group input,
            .admin-form-group textarea,
            .admin-form-group select {
                width: 100%;
                padding: 10px 12px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(200, 167, 82, 0.3);
                border-radius: 8px;
                color: #fff;
                font-family: 'Rajdhani', sans-serif;
            }
            .admin-form-group textarea {
                min-height: 60px;
                resize: vertical;
            }
            .admin-form-row {
                display: flex;
                gap: 12px;
            }
            .admin-form-row .admin-form-group {
                flex: 1;
            }

            /* Switch */
            .admin-switch {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
            }
            .admin-switch input {
                display: none;
            }
            .admin-switch .slider {
                width: 40px;
                height: 22px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 11px;
                position: relative;
                transition: background 0.2s;
            }
            .admin-switch .slider::after {
                content: '';
                position: absolute;
                width: 18px;
                height: 18px;
                background: #fff;
                border-radius: 50%;
                top: 2px;
                left: 2px;
                transition: transform 0.2s;
            }
            .admin-switch input:checked + .slider {
                background: #C8A752;
            }
            .admin-switch input:checked + .slider::after {
                transform: translateX(18px);
            }
            .admin-switch .label {
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.85rem;
            }

            /* Submit Button */
            .btn-admin-submit {
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #C8A752, #B8941A);
                border: none;
                border-radius: 8px;
                color: #000;
                font-family: 'Rajdhani', sans-serif;
                font-weight: 700;
                font-size: 1rem;
                cursor: pointer;
                margin-top: 12px;
                transition: all 0.2s;
            }
            .btn-admin-submit:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(200, 167, 82, 0.3);
            }
            .btn-admin-submit:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            /* List */
            .admin-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .admin-list-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border-left: 3px solid transparent;
            }
            .admin-list-item.active {
                border-left-color: #4CAF50;
            }
            .admin-list-item.inactive {
                border-left-color: #888;
                opacity: 0.6;
            }
            .item-info {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .item-type {
                font-size: 1.1rem;
            }
            .item-text strong {
                display: block;
                color: #fff;
                font-size: 0.9rem;
            }
            .item-text small {
                color: rgba(255, 255, 255, 0.5);
                font-size: 0.75rem;
            }
            .item-actions {
                display: flex;
                gap: 6px;
            }
            .item-actions button {
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .btn-toggle {
                background: rgba(200, 167, 82, 0.2);
                color: #C8A752;
            }
            .btn-delete {
                background: rgba(239, 83, 80, 0.2);
                color: #EF5350;
            }
            .item-actions button:hover {
                transform: scale(1.1);
            }

            /* Stats */
            .admin-stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
            }
            .stat-box {
                background: rgba(200, 167, 82, 0.1);
                border: 1px solid rgba(200, 167, 82, 0.2);
                border-radius: 12px;
                padding: 16px;
                text-align: center;
            }
            .stat-box .stat-value {
                display: block;
                font-size: 1.8rem;
                font-weight: 700;
                color: #C8A752;
                font-family: 'Orbitron', sans-serif;
            }
            .stat-box .stat-label {
                color: rgba(255, 255, 255, 0.6);
                font-size: 0.8rem;
            }

            /* Empty & Loading */
            .admin-empty, .admin-error, .admin-loading {
                text-align: center;
                padding: 20px;
                color: rgba(255, 255, 255, 0.5);
            }
            .admin-error {
                color: #EF5350;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.AdminManager = AdminManager;
}

export default AdminManager;
