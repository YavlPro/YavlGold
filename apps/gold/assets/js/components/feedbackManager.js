/**
 * FeedbackManager - User Feedback Collection System
 * YavlGold V9.4
 */
import { supabase } from '../config/supabase-config.js';
import { logger } from '../utils/logger.js';

export const FeedbackManager = {
    _initialized: false,

    /**
     * Initialize feedback system
     */
    init() {
        if (this._initialized) return;
        this._initialized = true;

        this._setupFeedbackButton();
        this._injectStyles();

        logger.debug('[FeedbackManager] ✅ Initialized');
    },

    /**
     * Setup click handler for feedback button
     * @private
     */
    _setupFeedbackButton() {
        // Look for feedback buttons in various locations
        const selectors = [
            '#feedback-btn',
            '.feedback-btn',
            '[data-action="feedback"]'
        ];

        selectors.forEach(selector => {
            const btn = document.querySelector(selector);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showFeedbackModal();
                });
            }
        });
    },

    /**
     * Show feedback modal
     */
    showFeedbackModal() {
        // Remove existing modal if any
        const existing = document.getElementById('feedback-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'feedback-modal';
        modal.className = 'feedback-modal';
        modal.innerHTML = `
            <div class="feedback-modal-content">
                <div class="feedback-header">
                    <h3>📝 Enviar Feedback</h3>
                    <button class="feedback-close" onclick="document.getElementById('feedback-modal').remove()">×</button>
                </div>
                <form id="feedback-form">
                    <div class="feedback-type-selector">
                        <label class="feedback-type-option">
                            <input type="radio" name="type" value="bug" checked>
                            <span>🐛 Bug</span>
                        </label>
                        <label class="feedback-type-option">
                            <input type="radio" name="type" value="idea">
                            <span>💡 Idea</span>
                        </label>
                        <label class="feedback-type-option">
                            <input type="radio" name="type" value="question">
                            <span>❓ Pregunta</span>
                        </label>
                        <label class="feedback-type-option">
                            <input type="radio" name="type" value="other">
                            <span>💬 Otro</span>
                        </label>
                    </div>
                    <textarea id="feedback-message" placeholder="Cuéntanos tu experiencia, reporte de error o sugerencia..." required></textarea>
                    <div class="feedback-actions">
                        <button type="button" class="btn-cancel" onclick="document.getElementById('feedback-modal').remove()">Cancelar</button>
                        <button type="submit" class="btn-submit">Enviar Feedback</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup form submission
        const form = document.getElementById('feedback-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this._submitFeedback();
        });

        // Focus on textarea
        setTimeout(() => {
            document.getElementById('feedback-message')?.focus();
        }, 100);
    },

    /**
     * Submit feedback to database
     * @private
     */
    async _submitFeedback() {
        const form = document.getElementById('feedback-form');
        const submitBtn = form.querySelector('.btn-submit');
        const message = document.getElementById('feedback-message').value.trim();
        const typeInput = form.querySelector('input[name="type"]:checked');
        const type = typeInput ? typeInput.value : 'other';

        if (!message) {
            this._showToast('⚠️ Por favor escribe un mensaje', 'warning');
            return;
        }

        // Disable button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                this._showToast('⚠️ Debes iniciar sesión', 'warning');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Feedback';
                return;
            }

            const { error } = await supabase
                .from('feedback')
                .insert({
                    user_id: session.user.id,
                    type: type,
                    message: message,
                    page_url: window.location.href,
                    user_agent: navigator.userAgent
                });

            if (error) {
                logger.error('[FeedbackManager] Submit error:', error.message);
                this._showToast('❌ Error al enviar. Intenta de nuevo.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Feedback';
                return;
            }

            // Success
            logger.success('[FeedbackManager] ✅ Feedback submitted');
            this._showToast('🎉 ¡Gracias por tu feedback!', 'success');

            // Close modal
            document.getElementById('feedback-modal')?.remove();

        } catch (err) {
            logger.error('[FeedbackManager] Unexpected error:', err.message);
            this._showToast('❌ Error inesperado', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Feedback';
        }
    },

    /**
     * Show toast notification
     * @private
     */
    _showToast(message, type = 'info') {
        const colors = {
            'info': '#C8A752',
            'success': '#4CAF50',
            'warning': '#FF9800',
            'error': '#F44336'
        };

        const toast = document.createElement('div');
        toast.className = 'feedback-toast';
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
            z-index: 10002;
            animation: slideInRight 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    },

    /**
     * Inject modal styles
     * @private
     */
    _injectStyles() {
        if (document.getElementById('feedback-styles')) return;

        const style = document.createElement('style');
        style.id = 'feedback-styles';
        style.textContent = `
            .feedback-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                animation: fadeIn 0.2s ease;
            }
            .feedback-modal-content {
                background: rgba(15, 15, 15, 0.98);
                border: 1px solid rgba(200, 167, 82, 0.3);
                border-radius: 16px;
                width: 90%;
                max-width: 450px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
            }
            .feedback-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(200, 167, 82, 0.2);
            }
            .feedback-header h3 {
                margin: 0;
                color: #C8A752;
                font-family: 'Orbitron', sans-serif;
                font-size: 1rem;
            }
            .feedback-close {
                background: none;
                border: none;
                color: #C8A752;
                font-size: 1.5rem;
                cursor: pointer;
                line-height: 1;
            }
            #feedback-form {
                padding: 20px;
            }
            .feedback-type-selector {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 16px;
            }
            .feedback-type-option {
                flex: 1;
                min-width: 80px;
            }
            .feedback-type-option input {
                display: none;
            }
            .feedback-type-option span {
                display: block;
                text-align: center;
                padding: 10px 8px;
                background: rgba(200, 167, 82, 0.1);
                border: 1px solid rgba(200, 167, 82, 0.3);
                border-radius: 8px;
                color: rgba(255, 255, 255, 0.7);
                font-family: 'Rajdhani', sans-serif;
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .feedback-type-option input:checked + span {
                background: rgba(200, 167, 82, 0.3);
                border-color: #C8A752;
                color: #C8A752;
            }
            #feedback-message {
                width: 100%;
                min-height: 120px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(200, 167, 82, 0.3);
                border-radius: 8px;
                padding: 12px;
                color: #fff;
                font-family: 'Rajdhani', sans-serif;
                font-size: 1rem;
                resize: vertical;
                outline: none;
            }
            #feedback-message:focus {
                border-color: #C8A752;
            }
            #feedback-message::placeholder {
                color: rgba(255, 255, 255, 0.4);
            }
            .feedback-actions {
                display: flex;
                gap: 12px;
                margin-top: 16px;
            }
            .feedback-actions button {
                flex: 1;
                padding: 12px;
                border-radius: 8px;
                font-family: 'Rajdhani', sans-serif;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-cancel {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: rgba(255, 255, 255, 0.6);
            }
            .btn-cancel:hover {
                border-color: rgba(255, 255, 255, 0.4);
                color: #fff;
            }
            .btn-submit {
                background: linear-gradient(135deg, #B8941A, #D4AF37);
                border: none;
                color: #000;
            }
            .btn-submit:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 15px rgba(200, 167, 82, 0.3);
            }
            .btn-submit:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.FeedbackManager = FeedbackManager;
}

export default FeedbackManager;
