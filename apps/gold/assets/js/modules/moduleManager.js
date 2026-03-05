/**
 * ModuleManager - Dynamic Module Loading from Supabase
 * YavlGold V9.4 (with LocalStorage Cache + Favorites + Stats)
 */
import { supabase } from '../config/supabase-config.js';
import { logger } from '../utils/logger.js';
import { normalizeFavoriteModuleKey } from './moduleIdentity.js';

// 🗄️ CACHE CONFIG
const CACHE_KEY = 'yavl_modules_v1';
const CACHE_TTL = 300000; // 5 minutos
const FAVORITES_CACHE_KEY = 'yavl_favorites_v1';
const MODULE_SELECT_COLUMNS = 'id,title,description,thumbnail_url,route,is_active,is_locked,min_level,created_at';

export const ModuleManager = {
    /**
     * Get all modules from database (with localStorage cache)
     * @returns {Promise<Array>} Array of modules or empty array on error
     */
    async getAllModules() {
        try {
            // 1. 🔍 INTENTAR LEER CACHÉ
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    const now = Date.now();
                    if (now - timestamp < CACHE_TTL) {
                        logger.debug(`[ModuleManager] ⚡ Loaded ${data.length} modules from cache`);
                        return data;
                    }
                    // Cache expirado, continuar a fetch
                    logger.debug('[ModuleManager] Cache expired, fetching fresh data...');
                } catch (parseErr) {
                    // JSON corrupto, ignorar y continuar
                    localStorage.removeItem(CACHE_KEY);
                }
            }

            // 2. 📡 FETCH DESDE SUPABASE
            logger.debug('[ModuleManager] Fetching modules from database...');

            const { data, error } = await supabase
                .from('modules')
                .select(MODULE_SELECT_COLUMNS)
                .order('min_level', { ascending: true });

            if (error) {
                logger.error('[ModuleManager] Error fetching modules:', error.message);
                return [];
            }

            // 3. 💾 GUARDAR EN CACHÉ
            if (data && data.length > 0) {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: data
                }));
                logger.debug('[ModuleManager] 💾 Modules cached for 5 minutes');
            }

            logger.success(`[ModuleManager] Loaded ${data?.length || 0} modules from Supabase`);
            return data || [];
        } catch (err) {
            logger.error('[ModuleManager] Unexpected error:', err.message);
            return [];
        }
    },

    /**
     * Get a single module by slug (no cache, direct fetch)
     * @param {string} slug - The module slug
     * @returns {Promise<Object|null>}
     */
    async getModuleBySlug(slug) {
        try {
            const { data, error } = await supabase
                .from('modules')
                .select(MODULE_SELECT_COLUMNS)
                .eq('slug', slug)
                .single();

            if (error) {
                logger.error('[ModuleManager] Module not found:', slug);
                return null;
            }

            return data;
        } catch (err) {
            logger.error('[ModuleManager] Error:', err.message);
            return null;
        }
    },

    /**
     * Check if user has access to a module based on level
     * @param {number} userLevel - User's current level
     * @param {number} requiredLevel - Module's minimum level
     * @returns {boolean}
     */
    canAccess(userLevel, requiredLevel) {
        return userLevel >= requiredLevel;
    },

    /**
     * Force refresh cache (for admin use)
     */
    clearCache() {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(FAVORITES_CACHE_KEY);
        logger.debug('[ModuleManager] 🗑️ Cache cleared');
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⭐ FAVORITES MANAGER - Persistent User Favorites
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const FavoritesManager = {
    _cache: null,
    _rawByCanonical: null,

    /**
     * Get all favorites for current user
     * @returns {Promise<Set<string>>} Set of module_keys
     */
    async getUserFavorites() {
        // Check cache first
        if (this._cache) return this._cache;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                logger.debug('[FavoritesManager] No session, returning empty favorites');
                return new Set();
            }

            const { data, error } = await supabase
                .from('user_favorites')
                .select('module_key')
                .eq('user_id', session.user.id);

            if (error) {
                logger.error('[FavoritesManager] Error:', error.message);
                return new Set();
            }

            const normalizedFavorites = new Set();
            const rawByCanonical = new Map();

            (data || []).forEach((favorite) => {
                const rawKey = String(favorite?.module_key || '').trim();
                const canonicalKey = normalizeFavoriteModuleKey(rawKey);
                if (!canonicalKey) return;

                normalizedFavorites.add(canonicalKey);
                if (!rawByCanonical.has(canonicalKey)) {
                    rawByCanonical.set(canonicalKey, new Set());
                }
                rawByCanonical.get(canonicalKey).add(rawKey);
            });

            this._cache = normalizedFavorites;
            this._rawByCanonical = rawByCanonical;
            logger.debug(`[FavoritesManager] ⭐ Loaded ${this._cache.size} favorites`);
            return this._cache;
        } catch (err) {
            logger.error('[FavoritesManager] Unexpected error:', err.message);
            return new Set();
        }
    },

    /**
     * Check if a module is favorited
     * @param {string} moduleKey
     * @returns {Promise<boolean>}
     */
    async isFavorite(moduleKey) {
        const canonicalKey = normalizeFavoriteModuleKey(moduleKey);
        if (!canonicalKey) return false;
        const favorites = await this.getUserFavorites();
        return favorites.has(canonicalKey);
    },

    /**
     * Toggle favorite status (with optimistic UI)
     * @param {string} moduleKey
     * @param {HTMLElement} starElement - The star icon to update
     * @returns {Promise<boolean>} New state (true = favorited)
     */
    async toggleFavorite(moduleKey, starElement) {
        try {
            const canonicalKey = normalizeFavoriteModuleKey(moduleKey);
            if (!canonicalKey) {
                if (starElement) this._updateStarUI(starElement, false);
                logger.warn('[FavoritesManager] Invalid module key, skipping favorite toggle');
                return false;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                logger.warn('[FavoritesManager] Must be logged in to favorite');
                return false;
            }

            const favorites = await this.getUserFavorites();
            const wasFavorite = favorites.has(canonicalKey);
            const newState = !wasFavorite;

            // 🎯 OPTIMISTIC UI: Update immediately
            if (starElement) {
                this._updateStarUI(starElement, newState);
            }

            // 📡 Persist to database
            if (newState) {
                // Add favorite
                const { error } = await supabase
                    .from('user_favorites')
                    .insert({ user_id: session.user.id, module_key: canonicalKey });

                if (error) {
                    // Revert on error
                    if (starElement) this._updateStarUI(starElement, wasFavorite);
                    logger.error('[FavoritesManager] Failed to add:', error.message);
                    return wasFavorite;
                }
                favorites.add(canonicalKey);
                if (!(this._rawByCanonical instanceof Map)) {
                    this._rawByCanonical = new Map();
                }
                this._rawByCanonical.set(canonicalKey, new Set([canonicalKey]));
                logger.success(`[FavoritesManager] ⭐ Added: ${canonicalKey}`);
            } else {
                // Remove favorite
                const rawKeys = Array.from(this._rawByCanonical?.get(canonicalKey) || []);
                const keysToDelete = Array.from(new Set([canonicalKey, ...rawKeys])).filter(Boolean);
                const { error } = await supabase
                    .from('user_favorites')
                    .delete()
                    .eq('user_id', session.user.id)
                    .in('module_key', keysToDelete);

                if (error) {
                    // Revert on error
                    if (starElement) this._updateStarUI(starElement, wasFavorite);
                    logger.error('[FavoritesManager] Failed to remove:', error.message);
                    return wasFavorite;
                }
                favorites.delete(canonicalKey);
                this._rawByCanonical?.delete(canonicalKey);
                logger.success(`[FavoritesManager] ☆ Removed: ${canonicalKey}`);
            }

            // Update stats
            StatsManager.updateFavoritesCount();

            return newState;
        } catch (err) {
            logger.error('[FavoritesManager] Toggle error:', err.message);
            return false;
        }
    },

    /**
     * Update star icon UI
     * @private
     */
    _updateStarUI(starElement, isFavorite) {
        if (!starElement) return;
        if (isFavorite) {
            starElement.classList.remove('fa-regular');
            starElement.classList.add('fa-solid');
            starElement.style.color = '#C8A752'; // Gold
        } else {
            starElement.classList.remove('fa-solid');
            starElement.classList.add('fa-regular');
            starElement.style.color = ''; // Default
        }
    },

    /**
     * Clear favorites cache
     */
    clearCache() {
        this._cache = null;
        this._rawByCanonical = null;
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 STATS MANAGER - Dashboard Statistics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const StatsManager = {
    /**
     * Update all dashboard stats from real data
     */
    async updateAllStats() {
        await Promise.all([
            this.updateModulesCount(),
            this.updateFavoritesCount()
        ]);
    },

    /**
     * Update total modules count
     */
    async updateModulesCount() {
        try {
            const { count, error } = await supabase
                .from('modules')
                .select('id', { count: 'exact' })
                .limit(1)
                .eq('is_active', true);

            if (!error) {
                const el = document.getElementById('stat-modules') || document.querySelector('[data-stat="modules"]');
                if (el) el.textContent = count || 0;
            }
        } catch (err) {
            logger.error('[StatsManager] Modules count error:', err.message);
        }
    },

    /**
     * Update user favorites count
     */
    async updateFavoritesCount() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const favorites = await FavoritesManager.getUserFavorites();
            const el = document.getElementById('stat-stars') || document.querySelector('[data-stat="stars"]');
            if (el) el.textContent = favorites.size || 0;
        } catch (err) {
            logger.error('[StatsManager] Favorites count error:', err.message);
        }
    },


};

// Make available globally for inline scripts
if (typeof window !== 'undefined') {
    window.ModuleManager = ModuleManager;
    window.FavoritesManager = FavoritesManager;
    window.StatsManager = StatsManager;
}

export default ModuleManager;
