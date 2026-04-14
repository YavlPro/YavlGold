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
.apm-overlay {
    position: fixed; inset: 0;
    z-index: 10100;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0;
    transition: opacity 180ms ease;
}
.apm-overlay.apm-visible { opacity: 1; }
.apm-overlay.apm-closing { opacity: 0; }

.apm-modal {
    background: var(--bg-2, #141414);
    border: 1px solid var(--gold-4, #C8A752);
    border-radius: 12px;
    width: min(420px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    display: flex; flex-direction: column;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.apm-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--border-neutral, rgba(255,255,255,0.08));
}
.apm-header-left { display: flex; align-items: center; gap: 10px; }
.apm-header-icon { color: var(--gold-4, #C8A752); font-size: 1.1rem; }
.apm-header-title {
    font-family: var(--font-heading, 'Orbitron', sans-serif);
    font-size: 0.95rem; font-weight: 600;
    color: var(--text-primary, #ffffff);
}
.apm-close {
    background: none; border: none; color: var(--text-muted, #94A3B8);
    font-size: 1.4rem; cursor: pointer; padding: 4px 8px; line-height: 1;
    transition: color 150ms ease;
}
.apm-close:hover { color: var(--text-primary, #ffffff); }

.apm-body { padding: 20px; }
.apm-label {
    font-family: var(--font-body, 'Rajdhani', sans-serif);
    font-size: 0.88rem; color: var(--text-secondary, #cccccc);
    display: block; margin-bottom: 10px;
}
.apm-input {
    width: 100%;
    background: var(--bg-3, #1e1e1e);
    color: var(--text-primary, #ffffff);
    border: 1px solid var(--border-neutral, rgba(255,255,255,0.08));
    border-radius: 8px;
    padding: 10px 14px;
    font-family: var(--font-body, 'Rajdhani', sans-serif);
    font-size: 0.92rem;
    transition: border-color 150ms ease;
    box-sizing: border-box;
}
.apm-input:hover { border-color: var(--gold-5, #A68A3E); }
.apm-input:focus {
    outline: none;
    border-color: var(--gold-4, #C8A752);
    box-shadow: 0 0 0 3px rgba(200,167,82,0.15);
}

.apm-footer {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 20px 16px;
    border-top: 1px solid var(--border-neutral, rgba(255,255,255,0.08));
}
.apm-footer-spacer { flex: 1; }
.apm-btn {
    font-family: var(--font-body, 'Rajdhani', sans-serif);
    font-size: 0.85rem; font-weight: 600;
    border-radius: 6px;
    padding: 8px 18px;
    cursor: pointer;
    transition: opacity 150ms ease, background 150ms ease;
    border: none;
    min-height: 44px;
}
.apm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.apm-btn--primary {
    background: var(--gold-4, #C8A752);
    color: var(--bg-1, #0a0a0a);
}
.apm-btn--primary:hover:not(:disabled) { opacity: 0.9; }
.apm-btn--primary:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--bg-1, #0a0a0a), 0 0 0 4px var(--gold-4, #C8A752);
}
.apm-btn--secondary {
    background: var(--bg-3, #1e1e1e);
    color: var(--text-secondary, #cccccc);
    border: 1px solid var(--border-neutral, rgba(255,255,255,0.08));
}
.apm-btn--secondary:hover { border-color: var(--gold-5, #A68A3E); }
.apm-btn--secondary:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--bg-1, #0a0a0a), 0 0 0 4px var(--gold-4, #C8A752);
}

@media (max-width: 480px) {
    .apm-modal { border-radius: 8px; }
    .apm-body { padding: 16px; }
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
        overlay.className = 'apm-overlay';
        overlay.id = PROMPT_OVERLAY_ID;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'apm-title');

        overlay.innerHTML = `
        <div class="apm-modal">
            <div class="apm-header">
                <div class="apm-header-left">
                    <i class="fa-solid fa-pen-to-square apm-header-icon" aria-hidden="true"></i>
                    <span class="apm-header-title" id="apm-title">${title}</span>
                </div>
                <button type="button" class="apm-close" id="apm-close" aria-label="Cerrar">&times;</button>
            </div>
            <div class="apm-body">
                <label class="apm-label" for="apm-input">${label}</label>
                <input type="text" class="apm-input" id="apm-input" value="${defaultValue}" placeholder="${placeholder}" autocomplete="off" />
            </div>
            <div class="apm-footer">
                <div class="apm-footer-spacer"></div>
                <button type="button" class="apm-btn apm-btn--secondary" id="apm-cancel">Cancelar</button>
                <button type="button" class="apm-btn apm-btn--primary" id="apm-ok">Aceptar</button>
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
