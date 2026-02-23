/**
 * ============================================================================
 * YAVLGOLD ACADEMIA - SISTEMA DE PROGRESO ACADÉMICO
 * ============================================================================
 * 
 * Sistema completo de tracking de progreso, XP, badges y gamificación.
 * Integrado con Supabase para persistencia de datos.
 * 
 * Funcionalidades principales:
 * - Tracking de lecciones completadas
 * - Sistema de XP y niveles (Novice → Adept → Expert → Master)
 * - Badges y logros
 * - Racha de estudio (streak)
 * - Quizzes con validación
 * - Certificados de módulos
 * 
 * @author Yerikson Varela (@YavlPro)
 * @version 1.0.0
 * @date Octubre 2025
 */

class AcademiaProgress {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.userProfile = null;
        this.sessionStartTime = Date.now();
        
        // Constantes de XP
        this.XP_REWARDS = {
            LESSON_COMPLETE: 10,
            QUIZ_PASS: 5,
            QUIZ_PERFECT: 15,
            MODULE_COMPLETE: 100,
            STREAK_7_DAYS: 25,
            FIRST_LESSON: 10
        };
        
        // Niveles
        this.LEVELS = {
            NOVICE: { min: 0, max: 99, name: 'Novice', icon: '👶', color: '#4CAF50' },
            ADEPT: { min: 100, max: 499, name: 'Adept', icon: '🎓', color: '#2196F3' },
            EXPERT: { min: 500, max: 999, name: 'Expert', icon: '🏆', color: '#FF9800' },
            MASTER: { min: 1000, max: Infinity, name: 'Master', icon: '👑', color: '#C8A752' }
        };
        
        this.init();
    }
    
    /**
     * Inicializar el sistema de academia
     */
    async init() {
        try {
            // Verificar autenticación
            const { data: { user } } = await this.supabase.auth.getUser();
            
            if (!user) {
                console.log('[Academia] Usuario no autenticado');
                return;
            }
            
            this.currentUser = user;
            
            // Cargar perfil del usuario
            await this.loadUserProfile();
            
            // Actualizar racha de estudio
            await this.updateStudyStreak();
            
            console.log('[Academia] Sistema inicializado correctamente');
            
        } catch (error) {
            console.error('[Academia] Error al inicializar:', error);
        }
    }
    
    /**
     * Cargar perfil académico del usuario desde Supabase
     */
    async loadUserProfile() {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();
            
            if (error) {
                // Si no existe el perfil, crearlo
                if (error.code === 'PGRST116') {
                    await this.createUserProfile();
                    return;
                }
                throw error;
            }
            
            this.userProfile = data;
            console.log('[Academia] Perfil cargado:', this.userProfile);
            
        } catch (error) {
            console.error('[Academia] Error al cargar perfil:', error);
            throw error;
        }
    }
    
    /**
     * Crear perfil académico inicial para nuevo usuario
     */
    async createUserProfile() {
        try {
            const username = this.currentUser.user_metadata?.username || 
                            this.currentUser.email?.split('@')[0] || 
                            'estudiante';
            
            const { data, error } = await this.supabase
                .from('profiles')
                .insert([{
                    id: this.currentUser.id,
                    username: username,
                    bio: 'Nuevo estudiante en YavlGold Academia 🚀',
                    xp_points: 0,
                    current_level: 'Novice',
                    study_streak_days: 0
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            this.userProfile = data;
            console.log('[Academia] Perfil creado:', this.userProfile);
            
            // Otorgar badge de Early Adopter
            await this.unlockBadge('early_adopter');
            
        } catch (error) {
            console.error('[Academia] Error al crear perfil:', error);
            throw error;
        }
    }
    
    /**
     * Marcar una lección como completada
     * @param {string} lessonId - UUID de la lección
     */
    async markLessonComplete(lessonId) {
        try {
            // Verificar si ya fue completada
            const { data: existing } = await this.supabase
                .from('user_lesson_progress')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('lesson_id', lessonId)
                .eq('status', 'completed')
                .single();
            
            if (existing) {
                console.log('[Academia] Lección ya completada anteriormente');
                return { alreadyCompleted: true };
            }
            
            // Calcular tiempo de estudio de esta sesión
            const timeSpent = Math.floor((Date.now() - this.sessionStartTime) / 60000); // minutos
            
            // Marcar como completada
            const { error: progressError } = await this.supabase
                .from('user_lesson_progress')
                .upsert({
                    user_id: this.currentUser.id,
                    lesson_id: lessonId,
                    status: 'completed',
                    progress_percentage: 100,
                    time_spent_minutes: timeSpent,
                    completed_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,lesson_id'
                });
            
            if (progressError) throw progressError;
            
            // Actualizar XP
            await this.addXP(this.XP_REWARDS.LESSON_COMPLETE, 'Lección completada');
            
            // Actualizar tiempo total de estudio
            await this.updateTotalStudyTime(timeSpent);
            
            // Verificar si es la primera lección
            const { count } = await this.supabase
                .from('user_lesson_progress')
                .select('*', { count: 'exact' })
                .limit(1)
                .eq('user_id', this.currentUser.id)
                .eq('status', 'completed');
            
            if (count === 1) {
                await this.unlockBadge('primer_curso');
                await this.addXP(this.XP_REWARDS.FIRST_LESSON, 'Primera lección completada');
            }
            
            // Verificar si se completó un módulo
            await this.checkModuleCompletion(lessonId);
            
            console.log('[Academia] Lección completada exitosamente');
            
            return {
                success: true,
                xpEarned: this.XP_REWARDS.LESSON_COMPLETE,
                timeSpent: timeSpent
            };
            
        } catch (error) {
            console.error('[Academia] Error al marcar lección:', error);
            throw error;
        }
    }
    
    /**
     * Agregar XP al perfil del usuario
     * @param {number} amount - Cantidad de XP a agregar
     * @param {string} reason - Razón del XP
     */
    async addXP(amount, reason = '') {
        try {
            const newXP = this.userProfile.xp_points + amount;
            const oldLevel = this.userProfile.current_level;
            
            // El nivel se actualiza automáticamente por trigger en Supabase
            const { data, error } = await this.supabase
                .from('profiles')
                .update({ 
                    xp_points: newXP,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id)
                .select()
                .single();
            
            if (error) throw error;
            
            this.userProfile = data;
            
            // Verificar si subió de nivel
            if (data.current_level !== oldLevel) {
                this.showLevelUpNotification(oldLevel, data.current_level, newXP);
            }
            
            console.log(`[Academia] +${amount} XP: ${reason} (Total: ${newXP} XP)`);
            
            return { newXP, levelUp: data.current_level !== oldLevel };
            
        } catch (error) {
            console.error('[Academia] Error al agregar XP:', error);
            throw error;
        }
    }
    
    /**
     * Actualizar racha de estudio (streak)
     */
    async updateStudyStreak() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const lastStudy = this.userProfile?.last_study_date;
            
            if (lastStudy === today) {
                // Ya estudió hoy, no hacer nada
                return;
            }
            
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            let newStreak = this.userProfile?.study_streak_days || 0;
            
            if (lastStudy === yesterdayStr) {
                // Continuó la racha
                newStreak += 1;
            } else if (lastStudy < yesterdayStr) {
                // Rompió la racha
                newStreak = 1;
            }
            
            // Actualizar en BD
            const { error } = await this.supabase
                .from('profiles')
                .update({
                    study_streak_days: newStreak,
                    last_study_date: today
                })
                .eq('id', this.currentUser.id);
            
            if (error) throw error;
            
            // Verificar badges de racha
            if (newStreak === 7) {
                await this.unlockBadge('racha_7_dias');
                await this.addXP(this.XP_REWARDS.STREAK_7_DAYS, 'Racha de 7 días');
            } else if (newStreak === 30) {
                await this.unlockBadge('racha_30_dias');
            }
            
            this.userProfile.study_streak_days = newStreak;
            console.log(`[Academia] Racha actualizada: ${newStreak} días`);
            
        } catch (error) {
            console.error('[Academia] Error al actualizar racha:', error);
        }
    }
    
    /**
     * Actualizar tiempo total de estudio
     * @param {number} minutes - Minutos a agregar
     */
    async updateTotalStudyTime(minutes) {
        try {
            const newTotal = (this.userProfile.total_study_time_minutes || 0) + minutes;
            
            const { error } = await this.supabase
                .from('profiles')
                .update({ total_study_time_minutes: newTotal })
                .eq('id', this.currentUser.id);
            
            if (error) throw error;
            
            this.userProfile.total_study_time_minutes = newTotal;
            
        } catch (error) {
            console.error('[Academia] Error al actualizar tiempo de estudio:', error);
        }
    }
    
    /**
     * Desbloquear un badge
     * @param {string} badgeKey - Clave del badge (ej: 'primer_curso')
     */
    async unlockBadge(badgeKey) {
        try {
            // Verificar si ya tiene el badge
            const { data: existing } = await this.supabase
                .from('user_badges')
                .select('id')
                .eq('user_id', this.currentUser.id)
                .eq('badge_id', (await this.getBadgeId(badgeKey)))
                .single();
            
            if (existing) {
                console.log(`[Academia] Badge ${badgeKey} ya desbloqueado`);
                return;
            }
            
            // Obtener info del badge
            const badgeId = await this.getBadgeId(badgeKey);
            const { data: badge } = await this.supabase
                .from('badges')
                .select('*')
                .eq('badge_key', badgeKey)
                .single();
            
            if (!badge) {
                console.warn(`[Academia] Badge ${badgeKey} no encontrado`);
                return;
            }
            
            // Desbloquear badge
            const { error } = await this.supabase
                .from('user_badges')
                .insert({
                    user_id: this.currentUser.id,
                    badge_id: badgeId
                });
            
            if (error) throw error;
            
            // Agregar XP del badge
            if (badge.xp_reward > 0) {
                await this.addXP(badge.xp_reward, `Badge desbloqueado: ${badge.title}`);
            }
            
            // Mostrar notificación
            this.showBadgeNotification(badge);
            
            console.log(`[Academia] Badge desbloqueado: ${badge.title}`);
            
        } catch (error) {
            console.error('[Academia] Error al desbloquear badge:', error);
        }
    }
    
    /**
     * Obtener ID de un badge por su clave
     * @param {string} badgeKey - Clave del badge
     */
    async getBadgeId(badgeKey) {
        const { data } = await this.supabase
            .from('badges')
            .select('id')
            .eq('badge_key', badgeKey)
            .single();
        
        return data?.id;
    }
    
    /**
     * Verificar si se completó un módulo
     * @param {string} lessonId - UUID de la lección recién completada
     */
    async checkModuleCompletion(lessonId) {
        try {
            // Obtener módulo de la lección
            const { data: lesson } = await this.supabase
                .from('lessons')
                .select('module_id')
                .eq('id', lessonId)
                .single();
            
            if (!lesson) return;
            
            // Contar lecciones totales del módulo
            const { count: totalLessons } = await this.supabase
                .from('lessons')
                .select('*', { count: 'exact' })
                .limit(1)
                .eq('module_id', lesson.module_id)
                .eq('is_published', true);
            
            // Contar lecciones completadas del módulo
            const { count: completedLessons } = await this.supabase
                .from('user_lesson_progress')
                .select('lesson_id', { count: 'exact' })
                .limit(1)
                .eq('user_id', this.currentUser.id)
                .eq('status', 'completed')
                .in('lesson_id', (await this.getModuleLessonIds(lesson.module_id)));
            
            // Si completó todas las lecciones
            if (completedLessons === totalLessons) {
                await this.completeModule(lesson.module_id);
            }
            
        } catch (error) {
            console.error('[Academia] Error al verificar módulo:', error);
        }
    }
    
    /**
     * Obtener IDs de lecciones de un módulo
     * @param {string} moduleId - UUID del módulo
     */
    async getModuleLessonIds(moduleId) {
        const { data } = await this.supabase
            .from('lessons')
            .select('id')
            .eq('module_id', moduleId)
            .eq('is_published', true);
        
        return data?.map(l => l.id) || [];
    }
    
    /**
     * Completar un módulo completo
     * @param {string} moduleId - UUID del módulo
     */
    async completeModule(moduleId) {
        try {
            // Obtener info del módulo
            const { data: module } = await this.supabase
                .from('modules')
                .select('*')
                .eq('id', moduleId)
                .single();
            
            if (!module) return;
            
            // Agregar XP de módulo completado
            await this.addXP(this.XP_REWARDS.MODULE_COMPLETE, `Módulo completado: ${module.title}`);
            
            // Desbloquear badge
            await this.unlockBadge('modulo_completo');
            
            // Crear certificado
            await this.issueCertificate(moduleId);
            
            // Mostrar notificación de módulo completado
            this.showModuleCompleteNotification(module);
            
            console.log(`[Academia] Módulo completado: ${module.title}`);
            
        } catch (error) {
            console.error('[Academia] Error al completar módulo:', error);
        }
    }
    
    /**
     * Emitir certificado de módulo
     * @param {string} moduleId - UUID del módulo
     */
    async issueCertificate(moduleId) {
        try {
            // Verificar si ya tiene certificado
            const { data: existing } = await this.supabase
                .from('certificates')
                .select('id')
                .eq('user_id', this.currentUser.id)
                .eq('module_id', moduleId)
                .single();
            
            if (existing) return;
            
            // Calcular score promedio del módulo
            const avgScore = await this.calculateModuleAverageScore(moduleId);
            
            // Emitir certificado
            const { error } = await this.supabase
                .from('certificates')
                .insert({
                    user_id: this.currentUser.id,
                    module_id: moduleId,
                    certificate_type: avgScore >= 90 ? 'excellence' : 'completion',
                    score_percentage: avgScore
                });
            
            if (error) throw error;
            
            console.log('[Academia] Certificado emitido');
            
        } catch (error) {
            console.error('[Academia] Error al emitir certificado:', error);
        }
    }
    
    /**
     * Calcular score promedio de quizzes de un módulo
     * @param {string} moduleId - UUID del módulo
     */
    async calculateModuleAverageScore(moduleId) {
        // TODO: Implementar cuando tengamos quizzes
        return 85; // Por ahora retornar un valor por defecto
    }
    
    /**
     * Obtener estadísticas de progreso del usuario
     */
    async getProgressStats() {
        try {
            // Lecciones completadas
            const { count: lessonsCompleted } = await this.supabase
                .from('user_lesson_progress')
                .select('*', { count: 'exact' })
                .limit(1)
                .eq('user_id', this.currentUser.id)
                .eq('status', 'completed');
            
            // Quizzes aprobados
            const { count: quizzesPassed } = await this.supabase
                .from('user_quiz_attempts')
                .select('*', { count: 'exact' })
                .limit(1)
                .eq('user_id', this.currentUser.id)
                .eq('passed', true);
            
            // Badges obtenidos
            const { count: badgesEarned } = await this.supabase
                .from('user_badges')
                .select('*', { count: 'exact' })
                .limit(1)
                .eq('user_id', this.currentUser.id);
            
            // Certificados
            const { count: certificates } = await this.supabase
                .from('certificates')
                .select('*', { count: 'exact' })
                .limit(1)
                .eq('user_id', this.currentUser.id);
            
            return {
                xp: this.userProfile.xp_points,
                level: this.userProfile.current_level,
                streak: this.userProfile.study_streak_days,
                totalStudyTime: this.userProfile.total_study_time_minutes,
                lessonsCompleted,
                quizzesPassed,
                badgesEarned,
                certificates
            };
            
        } catch (error) {
            console.error('[Academia] Error al obtener stats:', error);
            return null;
        }
    }
    
    /**
     * Mostrar notificación de nivel subido
     */
    showLevelUpNotification(oldLevel, newLevel, xp) {
        const levelInfo = Object.values(this.LEVELS).find(l => l.name === newLevel);
        
        console.log(`🎉 ¡LEVEL UP! ${oldLevel} → ${newLevel} ${levelInfo?.icon || ''}`);
        
        // TODO: Implementar notificación visual en UI
        // Por ahora solo log en consola
    }
    
    /**
     * Mostrar notificación de badge desbloqueado
     */
    showBadgeNotification(badge) {
        console.log(`🏆 Badge desbloqueado: ${badge.title}`);
        
        // TODO: Implementar notificación visual en UI
    }
    
    /**
     * Mostrar notificación de módulo completado
     */
    showModuleCompleteNotification(module) {
        console.log(`🎓 ¡Módulo completado! ${module.title}`);
        
        // TODO: Implementar notificación visual en UI
    }
}

// Inicializar cuando el DOM esté listo
let academiaProgress;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        academiaProgress = new AcademiaProgress();
    });
} else {
    academiaProgress = new AcademiaProgress();
}

// Exportar para uso global
window.AcademiaProgress = AcademiaProgress;
window.academiaProgress = academiaProgress;
