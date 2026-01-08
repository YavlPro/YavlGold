/**
 * AnnouncementManager - Global Announcements Banner System
 * YavlGold V9.4
 */
import { supabase } from '../config/supabase-config.js';
import { logger } from '../utils/logger.js';

const DISMISSED_KEY = 'yavl_dismissed_announcements';

export const AnnouncementManager = {
    _initialized: false,
    _currentAnnouncement: null,

    /**
     * Initialize announcements system
     */
    async init() {
        if (this._initialized) return;
        this._initialized = true;

        this._injectStyles();
        await this.checkAnnouncements();

        logger.debug('[AnnouncementManager] ✅ Initialized');
    },

    /**
     * Check for active announcements
     */
    async checkAnnouncements() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                logger.error('[AnnouncementManager] Error:', error.message);
                return;
            }

            if (data && data.length > 0) {
                const announcement = data[0];

                // Check if user already dismissed this announcement
                if (this._isDismissed(announcement.id)) {
                    logger.debug('[AnnouncementManager] Announcement already dismissed');
                    return;
                }

                this._currentAnnouncement = announcement;
                this._renderBanner(announcement);
            }
        } catch (err) {
            logger.error('[AnnouncementManager] Unexpected error:', err.message);
        }
    },

    /**
     * Check if announcement was dismissed in this session
     * @private
     */
    _isDismissed(id) {
        try {
            const dismissed = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]');
            return dismissed.includes(id);
        } catch {
            return false;
        }
    },

    /**
     * Mark announcement as dismissed
     * @private
     */
    _dismiss(id) {
        try {
            const dismissed = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]');
            if (!dismissed.includes(id)) {
                dismissed.push(id);
                sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
            }
        } catch {
            sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([id]));
        }
    },

    /**
     * Render announcement banner
     * @private
     */
    _renderBanner(announcement) {
        // Remove existing banner if any
        const existing = document.getElementById('announcement-banner');
        if (existing) existing.remove();

        const typeClass = `banner-${announcement.type || 'info'}`;
        const icon = this._getIcon(announcement.type);

        const banner = document.createElement('div');
        banner.id = 'announcement-banner';
        banner.className = `announcement-banner ${typeClass}`;
        banner.innerHTML = `
            <div class="announcement-content">
                <span class="announcement-icon">${icon}</span>
                <div class="announcement-text">
                    <strong>${announcement.title}</strong>
                    ${announcement.message ? `<span>${announcement.message}</span>` : ''}
                </div>
            </div>
            <button class="announcement-close" title="Cerrar">&times;</button>
        `;

        // Close button handler
        banner.querySelector('.announcement-close').addEventListener('click', () => {
            this._dismiss(announcement.id);
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), 300);
        });

        // Insert at the top of body or before main content
        const target = document.querySelector('.dashboard-main') || document.body.firstChild;
        if (target && target.parentNode) {
            target.parentNode.insertBefore(banner, target);
        } else {
            document.body.prepend(banner);
        }

        // Animate in
        requestAnimationFrame(() => {
            banner.classList.add('visible');
        });
    },

    /**
     * Get icon for announcement type
     * @private
     */
    _getIcon(type) {
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'danger': '🚨'
        };
        return icons[type] || 'ℹ️';
    },

    /**
     * Inject banner styles
     * @private
     */
    _injectStyles() {
        if (document.getElementById('announcement-styles')) return;

        const style = document.createElement('style');
        style.id = 'announcement-styles';
        style.textContent = `
            .announcement-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 9999;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 20px;
                font-family: 'Rajdhani', sans-serif;
                transform: translateY(-100%);
                transition: transform 0.3s ease, opacity 0.3s ease;
                opacity: 0;
            }
            .announcement-banner.visible {
                transform: translateY(0);
                opacity: 1;
            }
            .announcement-banner.hiding {
                transform: translateY(-100%);
                opacity: 0;
            }
            .announcement-content {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
            }
            .announcement-icon {
                font-size: 1.3rem;
            }
            .announcement-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .announcement-text strong {
                font-size: 1rem;
                font-weight: 700;
            }
            .announcement-text span {
                font-size: 0.9rem;
                opacity: 0.9;
            }
            .announcement-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: inherit;
                font-size: 1.5rem;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                transition: background 0.2s;
            }
            .announcement-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            /* Type-specific colors */
            .banner-info {
                background: linear-gradient(135deg, #1E88E5, #1565C0);
                color: #fff;
            }
            .banner-success {
                background: linear-gradient(135deg, #C8A752, #B8941A);
                color: #000;
            }
            .banner-warning {
                background: linear-gradient(135deg, #FFA726, #FB8C00);
                color: #000;
            }
            .banner-danger {
                background: linear-gradient(135deg, #EF5350, #D32F2F);
                color: #fff;
            }

            /* Mobile adjustments */
            @media (max-width: 600px) {
                .announcement-banner {
                    padding: 10px 16px;
                }
                .announcement-text strong {
                    font-size: 0.9rem;
                }
                .announcement-text span {
                    font-size: 0.8rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.AnnouncementManager = AnnouncementManager;
}

export default AnnouncementManager;
