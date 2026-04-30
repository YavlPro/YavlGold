/**
 * agro-prompt-modal.js — Reusable text-input modal to replace window.prompt()
 * Canon de Modales YavlGold §19 — Flat gold sobrio
 *
 * Exporta:
 *   showPromptModal({ title, label, defaultValue, placeholder }) → Promise<string|null>
 *
 * Devuelve el texto ingresado o null si el usuario cancela.
 * Respeto: focus-visible, Escape, overlay close, ARIA, reduced-motion.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROMPT_OVERLAY_ID = 'agro-prompt-overlay';

// ---------------------------------------------------------------------------
// CSS (injected once)
// ---------------------------------------------------------------------------

function injectStyles() {
    if (document.getElementById('agro-prompt-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'agro-prompt-modal-styles';
    style.textContent = `
/* agro-prompt-modal — §19 Canon de Modales */
.apm-overlay { opacity: 0; }
.apm-overlay.apm-visible { opacity: 1; }
.apm-overlay.apm-closing { opacity: 0; }

.apm-modal { width: min(420px, calc(100vw - 32px)); }

.apm-header-left { display: flex; align-items: center; gap: 10px; }
.apm-header-icon { color: var(--gold-4); font-size: 1.1rem; }
.apm-header-title {
    font-family: var(--font-heading);
    font-size: 0.95rem; font-weight: 600;
    color: var(--text-primary);
}

.apm-label {
    font-family: var(--font-body);
    font-size: 0.88rem; color: var(--text-secondary);
    display: block; margin-bottom: 10px;
}
.apm-input {
    width: 100%;
    background: var(--bg-3);
    color: var(--text-primary);
    border: 1px solid var(--border-neutral);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-family: var(--font-body);
    font-size: 0.92rem;
    transition: border-color 150ms ease;
    box-sizing: border-box;
}
.apm-input:hover { border-color: var(--gold-5); }
.apm-input:focus {
    outline: none;
    border-color: var(--gold-4);
    box-shadow: var(--state-focus-ring);
}
.apm-footer-spacer { flex: 1; }
.apm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 480px) {
    .apm-modal { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
    .apm-overlay, .apm-modal, .apm-btn, .apm-close, .apm-input { transition: none; }
}
`;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Show a prompt modal and return the user input.
 * @param {{ title?: string, label: string, defaultValue?: string, placeholder?: string }} opts
 * @returns {Promise<string|null>} User input or null if cancelled.
 */
export function showPromptModal(opts = {}) {
    return new Promise((resolve) => {
        // Prevent double open
        if (document.getElementById(PROMPT_OVERLAY_ID)) return resolve(null);

        injectStyles();

        const title = opts.title || 'Entrada requerida';
        const label = opts.label || '';
        const defaultValue = opts.defaultValue || '';
        const placeholder = opts.placeholder || '';

        const overlay = document.createElement('div');
        overlay.className = 'apm-overlay agro-modal-canon';
        overlay.id = PROMPT_OVERLAY_ID;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'apm-title');

        overlay.innerHTML = `
        <div class="apm-modal agro-modal-canon__dialog">
            <div class="apm-header agro-modal-canon__header">
                <div class="apm-header-left">
                    <i class="fa-solid fa-pen-to-square apm-header-icon" aria-hidden="true"></i>
                    <span class="apm-header-title" id="apm-title">${title}</span>
                </div>
                <button type="button" class="apm-close agro-modal-canon__close" id="apm-close" aria-label="Cerrar">&times;</button>
            </div>
            <div class="apm-body agro-modal-canon__body">
                <label class="apm-label" for="apm-input">${label}</label>
                <input type="text" class="apm-input" id="apm-input" value="${defaultValue}" placeholder="${placeholder}" autocomplete="off" />
            </div>
            <div class="apm-footer agro-modal-canon__footer">
                <div class="apm-footer-spacer"></div>
                <button type="button" class="apm-btn agro-modal-canon__button agro-modal-canon__button--secondary" id="apm-cancel">Cancelar</button>
                <button type="button" class="apm-btn agro-modal-canon__button agro-modal-canon__button--primary" id="apm-ok">Aceptar</button>
            </div>
        </div>`;

        document.body.appendChild(overlay);

        const input = document.getElementById('apm-input');
        const closeBtn = document.getElementById('apm-close');
        const cancelBtn = document.getElementById('apm-cancel');
        const okBtn = document.getElementById('apm-ok');

        let resolved = false;

        function finish(value) {
            if (resolved) return;
            resolved = true;
            overlay.classList.remove('apm-visible');
            overlay.classList.add('apm-closing');
            setTimeout(() => {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }, 200);
            resolve(value);
        }

        function cancel() { finish(null); }
        function accept() { finish(input.value); }

        closeBtn.addEventListener('click', cancel);
        cancelBtn.addEventListener('click', cancel);
        okBtn.addEventListener('click', accept);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); accept(); }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cancel();
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') cancel();
        };
        document.addEventListener('keydown', escHandler);

        // Focus input after paint
        requestAnimationFrame(() => {
            input.focus();
            input.select();
            overlay.classList.add('apm-visible');
        });
    });
}

// Expose for inline/window usage by legacy modules
window.showPromptModal = showPromptModal;
