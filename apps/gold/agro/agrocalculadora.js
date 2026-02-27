const CALCULATOR_MODAL_ID = 'modal-agro-calculator';
const CALCULATOR_OPEN_BUTTON_ID = 'btn-open-agro-calculator';

const state = {
    initialized: false,
    lastFocusedTrigger: null
};

function getModal() {
    return document.getElementById(CALCULATOR_MODAL_ID);
}

function isOpen() {
    const modal = getModal();
    return !!(modal && modal.classList.contains('is-open'));
}

function openModal(triggerElement = null) {
    const modal = getModal();
    if (!modal) return false;

    if (triggerElement instanceof HTMLElement) {
        state.lastFocusedTrigger = triggerElement;
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('agro-calculator-open');

    const panel = modal.querySelector('.agro-calculator-panel');
    if (panel && typeof panel.focus === 'function') {
        requestAnimationFrame(() => {
            panel.focus({ preventScroll: true });
        });
    }

    return true;
}

function closeModal() {
    const modal = getModal();
    if (!modal) return false;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('agro-calculator-open');

    if (state.lastFocusedTrigger && typeof state.lastFocusedTrigger.focus === 'function') {
        state.lastFocusedTrigger.focus({ preventScroll: true });
    }
    state.lastFocusedTrigger = null;
    return true;
}

function bindModalEvents(modal) {
    modal.querySelectorAll('[data-agro-calculator-close]').forEach((node) => {
        node.addEventListener('click', (event) => {
            event.preventDefault();
            closeModal();
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen()) {
            closeModal();
        }
    });
}

function bindOpenTrigger() {
    const openButton = document.getElementById(CALCULATOR_OPEN_BUTTON_ID);
    if (!openButton) return;
    openButton.addEventListener('click', (event) => {
        event.preventDefault();
        openAgroCalculadora(event.currentTarget);
    });
}

export function openAgroCalculadora(triggerEl = null) {
    if (!state.initialized) return false;
    return openModal(triggerEl);
}

export function initAgroCalculadora() {
    if (state.initialized) return;

    const modal = getModal();
    if (!modal) {
        console.warn('[AGRO_CALCULATOR] modal-agro-calculator no encontrado.');
        return;
    }

    state.initialized = true;
    bindModalEvents(modal);
    bindOpenTrigger();
}
