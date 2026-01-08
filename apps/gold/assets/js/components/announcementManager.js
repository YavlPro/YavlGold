/**
 * AnnouncementManager - Global Announcements Carousel System
 * YavlGold V9.4 - TV News Ticker Style
 */
import { supabase } from '../config/supabase-config.js';
import { logger } from '../utils/logger.js';

const DISMISSED_KEY = 'yavl_dismissed_announcements';
const CYCLE_INTERVAL = 5000; // 5 seconds between announcements

export const AnnouncementManager = {
    _initialized: false,
    _queue: [],
    _currentIndex: 0,
    _cycleTimer: null,
    _isPaused: false,
    _bannerElement: null,

    /**
     * Initialize announcements system
     */
    async init() {
        if (this._initialized) return;
        this._initialized = true;

        this._injectStyles();
        await this.loadAnnouncements();

        logger.debug('[AnnouncementManager] ✅ Initialized with carousel mode');
    },

    /**
     * Load all active announcements
     */
    async loadAnnouncements() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                logger.error('[AnnouncementManager] Error:', error.message);
                return;
            }

            if (!data || data.length === 0) return;

            // Filter out dismissed announcements
            const dismissed = this._getDismissedIds();
            this._queue = data.filter(a => !dismissed.includes(a.id));

            if (this._queue.length === 0) return;

            // Render first announcement and start carousel
            this._currentIndex = 0;
            this._renderBanner();

            if (this._queue.length > 1) {
                this._startCycle();
            }
        } catch (err) {
            logger.error('[AnnouncementManager] Unexpected error:', err.message);
        }
    },

    /**
     * Get dismissed announcement IDs
     * @private
     */
    _getDismissedIds() {
        try {
            return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]');
        } catch {
            return [];
        }
    },

    /**
     * Mark announcement as dismissed
     * @private
     */
    _dismiss(id) {
        try {
            const dismissed = this._getDismissedIds();
            if (!dismissed.includes(id)) {
                dismissed.push(id);
                sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
            }
        } catch {
            sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([id]));
        }
    },

    /**
     * Render or update the banner
     * @private
     */
    _renderBanner() {
        const announcement = this._queue[this._currentIndex];
        if (!announcement) return;

        const typeClass = `banner-${announcement.type || 'info'}`;
        const icon = this._getIcon(announcement.type);

        // Create banner if doesn't exist
        if (!this._bannerElement) {
            this._bannerElement = document.createElement('div');
            this._bannerElement.id = 'announcement-banner';
            this._bannerElement.className = 'announcement-banner';

            this._bannerElement.innerHTML = `
                <div class="announcement-content">
                    <span class="announcement-icon"></span>
                    <div class="announcement-text">
                        <strong class="announcement-title"></strong>
                        <span class="announcement-message"></span>
                    </div>
                </div>
                <div class="announcement-controls">
                    <span class="announcement-counter"></span>
                    <button class="announcement-close" title="Cerrar">&times;</button>
                </div>
            `;

            // Event listeners
            this._bannerElement.querySelector('.announcement-close').addEventListener('click', () => {
                this._handleDismiss();
            });

            // Pause on hover
            this._bannerElement.addEventListener('mouseenter', () => {
                this._isPaused = true;
            });

            this._bannerElement.addEventListener('mouseleave', () => {
                this._isPaused = false;
            });

            document.body.appendChild(this._bannerElement);

            // Animate in
            requestAnimationFrame(() => {
                this._bannerElement.classList.add('visible');
            });
        }

        // Update content with transition
        this._bannerElement.classList.add('transitioning');

        setTimeout(() => {
            // Update class for color
            this._bannerElement.className = `announcement-banner visible ${typeClass}`;

            // Update content
            this._bannerElement.querySelector('.announcement-icon').textContent = icon;
            this._bannerElement.querySelector('.announcement-title').textContent = announcement.title;

            const messageEl = this._bannerElement.querySelector('.announcement-message');
            if (announcement.message) {
                messageEl.textContent = announcement.message;
                messageEl.style.display = 'block';
            } else {
                messageEl.style.display = 'none';
            }

            // Update counter
            if (this._queue.length > 1) {
                this._bannerElement.querySelector('.announcement-counter').textContent =
                    `${this._currentIndex + 1}/${this._queue.length}`;
            } else {
                this._bannerElement.querySelector('.announcement-counter').textContent = '';
            }

            // Remove transition class
            this._bannerElement.classList.remove('transitioning');
        }, 200);
    },

    /**
     * Handle dismiss button click
     * @private
     */
    _handleDismiss() {
        const currentAnnouncement = this._queue[this._currentIndex];
        if (currentAnnouncement) {
            this._dismiss(currentAnnouncement.id);
        }

        // Remove from queue
        this._queue.splice(this._currentIndex, 1);

        if (this._queue.length === 0) {
            // No more announcements, hide banner
            this._hideBanner();
            return;
        }

        // Adjust index if needed
        if (this._currentIndex >= this._queue.length) {
            this._currentIndex = 0;
        }

        // Show next announcement
        this._renderBanner();

        // Stop cycle if only one left
        if (this._queue.length <= 1) {
            this._stopCycle();
        }
    },

    /**
     * Hide and remove banner
     * @private
     */
    _hideBanner() {
        if (this._bannerElement) {
            this._bannerElement.classList.add('hiding');
            this._bannerElement.classList.remove('visible');
            setTimeout(() => {
                this._bannerElement?.remove();
                this._bannerElement = null;
            }, 300);
        }
        this._stopCycle();
    },

    /**
     * Start the carousel cycle
     * @private
     */
    _startCycle() {
        this._stopCycle(); // Clear any existing timer

        this._cycleTimer = setInterval(() => {
            if (this._isPaused || this._queue.length <= 1) return;

            this._currentIndex = (this._currentIndex + 1) % this._queue.length;
            this._renderBanner();
        }, CYCLE_INTERVAL);
    },

    /**
     * Stop the carousel cycle
     * @private
     */
    _stopCycle() {
        if (this._cycleTimer) {
            clearInterval(this._cycleTimer);
            this._cycleTimer = null;
        }
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
            /* Floating Minimalist Carousel Banner */
            .announcement-banner {
                position: fixed;
                top: 1rem;
                left: 50%;
                transform: translateX(-50%) translateY(-20px);
                width: auto;
                max-width: 520px;
                min-width: 300px;
                z-index: 9999;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.7rem 1rem;
                font-family: 'Rajdhani', sans-serif;
                border-radius: 12px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
                opacity: 0;
                transition: transform 0.4s ease, opacity 0.4s ease, background 0.3s ease;
            }
            .announcement-banner.visible {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            .announcement-banner.hiding {
                transform: translateX(-50%) translateY(-20px);
                opacity: 0;
            }
            .announcement-banner.transitioning .announcement-content {
                opacity: 0.3;
            }
            .announcement-content {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
                transition: opacity 0.2s ease;
            }
            .announcement-icon {
                font-size: 1.1rem;
                flex-shrink: 0;
            }
            .announcement-text {
                display: flex;
                flex-direction: column;
                gap: 1px;
                min-width: 0;
            }
            .announcement-title {
                font-size: 0.9rem;
                font-weight: 700;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .announcement-message {
                font-size: 0.8rem;
                opacity: 0.85;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .announcement-controls {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-left: 12px;
                flex-shrink: 0;
            }
            .announcement-counter {
                font-size: 0.7rem;
                opacity: 0.7;
                font-weight: 600;
            }
            .announcement-close {
                background: rgba(255, 255, 255, 0.15);
                border: none;
                color: inherit;
                font-size: 1.2rem;
                width: 26px;
                height: 26px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                transition: background 0.2s, transform 0.2s;
            }
            .announcement-close:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: scale(1.1);
            }

            /* Type-specific colors */
            .banner-info {
                background: linear-gradient(135deg, #1976D2, #1565C0);
                color: #fff;
            }
            .banner-success {
                background: linear-gradient(135deg, #C8A752, #A8903A);
                color: #000;
            }
            .banner-warning {
                background: linear-gradient(135deg, #FB8C00, #E65100);
                color: #000;
            }
            .banner-danger {
                background: linear-gradient(135deg, #E53935, #C62828);
                color: #fff;
            }

            /* Mobile adjustments - Below header, smaller */
            @media (max-width: 768px) {
                .announcement-banner {
                    top: 70px;
                    min-width: 90%;
                    max-width: 95%;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.85rem;
                    border-radius: 8px;
                    z-index: 9990;
                }
                .announcement-icon {
                    font-size: 1rem;
                }
                .announcement-title {
                    font-size: 0.8rem;
                }
                .announcement-message {
                    font-size: 0.7rem;
                }
                .announcement-close {
                    width: 24px;
                    height: 24px;
                    font-size: 1rem;
                }
                .announcement-counter {
                    font-size: 0.65rem;
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
