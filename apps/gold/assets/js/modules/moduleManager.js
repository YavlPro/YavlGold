/**
 * ModuleManager - Dynamic Module Loading from Supabase
 * YavlGold V9.4
 */
import { supabase } from '../config/supabase-config.js';
import { logger } from '../utils/logger.js';

export const ModuleManager = {
    /**
     * Get all modules from database ordered by min_level
     * @returns {Promise<Array>} Array of modules or empty array on error
     */
    async getAllModules() {
        try {
            logger.debug('[ModuleManager] Fetching modules from database...');

            const { data, error } = await supabase
                .from('modules')
                .select('*')
                .order('min_level', { ascending: true });

            if (error) {
                logger.error('[ModuleManager] Error fetching modules:', error.message);
                return [];
            }

            logger.success(`[ModuleManager] Loaded ${data?.length || 0} modules`);
            return data || [];
        } catch (err) {
            logger.error('[ModuleManager] Unexpected error:', err.message);
            return [];
        }
    },

    /**
     * Get a single module by slug
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
    }
};

// Make available globally for inline scripts
if (typeof window !== 'undefined') {
    window.ModuleManager = ModuleManager;
}

export default ModuleManager;
