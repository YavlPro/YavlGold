/**
 * ModuleManager - Dynamic Module Loading from Supabase
 * YavlGold V9.4 (with LocalStorage Cache)
 */
import { supabase } from '../config/supabase-config.js';
import { logger } from '../utils/logger.js';

// 🗄️ CACHE CONFIG
const CACHE_KEY = 'yavl_modules_v1';
const CACHE_TTL = 300000; // 5 minutos

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
                .select('*')
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
                .select('*')
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
        logger.debug('[ModuleManager] 🗑️ Cache cleared');
    }
};

// Make available globally for inline scripts
if (typeof window !== 'undefined') {
    window.ModuleManager = ModuleManager;
}

export default ModuleManager;

