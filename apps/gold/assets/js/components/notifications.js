/**
 * NotificationsManager - Dashboard Notification System
 * YavlGold V9.4
 */
import { supabase } from '../config/supabase-config.js';
import { logger } from '../utils/logger.js';

export const NotificationsManager = {
    _unreadCount: 0,
    _notifications: [],
    _initialized: false,

    /**
     * Initialize notifications system
     */
    async init() {
        if (this._initialized) return;
        this._initialized = true;

        await this.checkUnread();
        this._setupBellClick();

        // Check for new notifications every 2 minutes
        setInterval(() => this.checkUnread(), 120000);

        logger.debug('[NotificationsManager] ✅ Initialized');
    },

    /**
     * Check unread notifications count and update badge
     */
    async checkUnread() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id)
                .eq('is_read', false);

            if (error) {
                logger.error('[NotificationsManager] Error:', error.message);
                return;
            }

            this._unreadCount = count || 0;
            this._updateBadge();

            logger.debug(`[NotificationsManager] 🔔 ${this._unreadCount} unread`);
        } catch (err) {
            logger.error('[NotificationsManager] Unexpected error:', err.message);
        }
    },

    /**
     * Update the notification badge UI
     * @private
     */
    _updateBadge() {
        const badge = document.getElementById('notification-badge');
        const bell = document.getElementById('notification-bell') || document.querySelector('.notification-bell');

        if (badge) {
            if (this._unreadCount > 0) {
                badge.textContent = this._unreadCount > 9 ? '9+' : this._unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        // Add/remove pulse animation on bell
        if (bell && this._unreadCount > 0) {
            bell.classList.add('has-notifications');
        } else if (bell) {
            bell.classList.remove('has-notifications');
        }
    },

    /**
     * Setup click handler for notification bell
     * @private
     */
    _setupBellClick() {
        const bell = document.getElementById('notification-bell') || document.querySelector('.notification-bell');
        if (!bell) return;

        bell.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.showNotifications();
        });
    },

    /**
     * Fetch and display notifications
     */
    async showNotifications() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                logger.error('[NotificationsManager] Fetch error:', error.message);
                return;
            }

            this._notifications = data || [];

            if (this._notifications.length === 0) {
                this._showToast('📭 No tienes notificaciones', 'info');
                return;
            }

            // Show notifications dropdown or modal
            this._renderDropdown();

        } catch (err) {
            logger.error('[NotificationsManager] Show error:', err.message);
        }
    },

    /**
     * Render notifications dropdown
     * @private
     */
    _renderDropdown() {
        // Remove existing dropdown
        const existing = document.getElementById('notifications-dropdown');
        if (existing) existing.remove();

        const dropdown = document.createElement('div');
        dropdown.id = 'notifications-dropdown';
        dropdown.className = 'notifications-dropdown';
        dropdown.innerHTML = `
            <div class="notifications-header">
                <h4>🔔 Notificaciones</h4>
                <button class="notifications-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="notifications-list">
                ${this._notifications.map(n => `
                    <div class="notification-item ${n.is_read ? 'read' : 'unread'}" data-id="${n.id}">
                        <div class="notification-icon">${this._getIcon(n.type)}</div>
                        <div class="notification-content">
                            <strong>${n.title}</strong>
                            <p>${n.message || ''}</p>
                            <small>${this._formatDate(n.created_at)}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="notifications-footer">
                <button onclick="window.NotificationsManager.markAllRead()">Marcar todo como leído</button>
            </div>
        `;

        // Add styles if not present
        this._injectStyles();

        // Position near the bell
        const bell = document.getElementById('notification-bell') || document.querySelector('.notification-bell');
        if (bell) {
            const rect = bell.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.top = (rect.bottom + 10) + 'px';
            dropdown.style.right = (window.innerWidth - rect.right) + 'px';
        }

        document.body.appendChild(dropdown);

        // Close when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this._closeDropdown, { once: true });
        }, 100);
    },

    /**
     * Close dropdown
     * @private
     */
    _closeDropdown(e) {
        const dropdown = document.getElementById('notifications-dropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.remove();
        }
    },

    /**
     * Mark all notifications as read
     */
    async markAllRead() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', session.user.id)
                .eq('is_read', false);

            if (error) {
                logger.error('[NotificationsManager] Mark read error:', error.message);
                return;
            }

            this._unreadCount = 0;
            this._updateBadge();

            // Close dropdown
            const dropdown = document.getElementById('notifications-dropdown');
            if (dropdown) dropdown.remove();

            this._showToast('✅ Todas marcadas como leídas', 'success');

        } catch (err) {
            logger.error('[NotificationsManager] Error:', err.message);
        }
    },

    /**
     * Get icon for notification type
     * @private
     */
    _getIcon(type) {
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'alert': '🚨'
        };
        return icons[type] || '📌';
    },

    /**
     * Format date for display
     * @private
     */
    _formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora mismo';
        if (diffMins < 60) return `Hace ${diffMins}m`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        return date.toLocaleDateString('es-ES');
    },

    /**
     * Show toast message
     * @private
     */
    _showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `notification-toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(10, 10, 10, 0.95);
            color: #C8A752;
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid #C8A752;
            font-family: 'Rajdhani', sans-serif;
            z-index: 10001;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    /**
     * Inject dropdown styles
     * @private
     */
    _injectStyles() {
        if (document.getElementById('notifications-styles')) return;

        const style = document.createElement('style');
        style.id = 'notifications-styles';
        style.textContent = `
            .notifications-dropdown {
                background: rgba(15, 15, 15, 0.98);
                border: 1px solid rgba(200, 167, 82, 0.3);
                border-radius: 12px;
                width: 320px;
                max-height: 400px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                z-index: 10000;
            }
            .notifications-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid rgba(200, 167, 82, 0.2);
            }
            .notifications-header h4 {
                margin: 0;
                color: #C8A752;
                font-family: 'Orbitron', sans-serif;
                font-size: 0.9rem;
            }
            .notifications-close {
                background: none;
                border: none;
                color: #C8A752;
                font-size: 1.2rem;
                cursor: pointer;
            }
            .notifications-list {
                max-height: 280px;
                overflow-y: auto;
            }
            .notification-item {
                display: flex;
                gap: 12px;
                padding: 12px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                transition: background 0.2s;
                border-left: 3px solid transparent;
            }
            .notification-item:hover {
                background: rgba(200, 167, 82, 0.1);
            }
            .notification-item.read {
                opacity: 0.6;
            }
            .notification-item.unread {
                background: rgba(200, 167, 82, 0.08);
                border-left-color: #C8A752;
            }
            .notification-item.unread strong {
                color: #C8A752;
            }
            .notification-icon {
                font-size: 1.2rem;
            }
            .notification-content {
                flex: 1;
            }
            .notification-content strong {
                color: #fff;
                font-size: 0.9rem;
            }
            .notification-content p {
                color: rgba(255, 255, 255, 0.6);
                font-size: 0.8rem;
                margin: 4px 0;
            }
            .notification-content small {
                color: rgba(200, 167, 82, 0.7);
                font-size: 0.75rem;
            }
            .notifications-footer {
                padding: 10px 16px;
                border-top: 1px solid rgba(200, 167, 82, 0.2);
            }
            .notifications-footer button {
                width: 100%;
                background: transparent;
                border: 1px solid rgba(200, 167, 82, 0.5);
                color: #C8A752;
                padding: 8px;
                border-radius: 6px;
                cursor: pointer;
                font-family: 'Rajdhani', sans-serif;
                transition: all 0.2s;
            }
            .notifications-footer button:hover {
                background: rgba(200, 167, 82, 0.2);
            }
            .notification-bell.has-notifications {
                animation: bellPulse 2s infinite;
            }
            @keyframes bellPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
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
    window.NotificationsManager = NotificationsManager;
}

export default NotificationsManager;
