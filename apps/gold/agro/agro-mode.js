/**
 * agro-mode.js — Modo Operativo switch (Fase 5)
 * Global tri-state segmented control: Cultivo / No cultivo / General
 * Communicates via body[data-agro-mode] + agro:modechange CustomEvent
 */

const STORAGE_KEY = 'YG_AGRO_MODE_V1';
const EVENT_NAME = 'agro:modechange';
const MODES = Object.freeze(['cultivo', 'no-cultivo', 'general']);
const DEFAULT_MODE = 'general';

const MODE_OPTIONS = Object.freeze([
    { value: 'cultivo',    icon: 'fa-seedling',    label: 'Cultivo' },
    { value: 'no-cultivo', icon: 'fa-tractor',     label: 'No cultivo' },
    { value: 'general',    icon: 'fa-layer-group', label: 'General' }
]);

let currentMode = DEFAULT_MODE;
let rootEl = null;

function normalizeMode(value) {
    const token = String(value || '').trim().toLowerCase();
    return MODES.includes(token) ? token : DEFAULT_MODE;
}

function readStoredMode() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
}

function writeStoredMode(mode) {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* noop */ }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderSwitch() {
    if (!rootEl) return;
    rootEl.innerHTML = MODE_OPTIONS.map((opt) => {
        const active = opt.value === currentMode ? ' is-active' : '';
        return `<button type="button"
            class="agro-mode-switch__btn${active}"
            data-agro-mode="${escapeHtml(opt.value)}"
            aria-pressed="${opt.value === currentMode ? 'true' : 'false'}">
            <span class="agro-mode-switch__icon" aria-hidden="true"><i class="fa-solid ${opt.icon}"></i></span>
            <span class="agro-mode-switch__label">${escapeHtml(opt.label)}</span>
        </button>`;
    }).join('');
}

function syncButtons() {
    if (!rootEl) return;
    const buttons = rootEl.querySelectorAll('.agro-mode-switch__btn');
    buttons.forEach((btn) => {
        const mode = btn.dataset.agroMode;
        const isActive = mode === currentMode;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function setMode(next, options = {}) {
    const mode = normalizeMode(next);
    if (mode === currentMode) return;
    currentMode = mode;
    document.body.dataset.agroMode = currentMode;
    syncButtons();
    writeStoredMode(currentMode);
    if (options.broadcast !== false) {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, {
            detail: { mode: currentMode }
        }));
    }
}

function handleClick(event) {
    const btn = event.target.closest('[data-agro-mode]');
    if (!btn) return;
    event.preventDefault();
    setMode(btn.dataset.agroMode);
}

export function initAgroMode() {
    rootEl = document.getElementById('agro-mode-switch');
    if (!rootEl) return null;

    currentMode = normalizeMode(readStoredMode());
    document.body.dataset.agroMode = currentMode;

    renderSwitch();
    rootEl.addEventListener('click', handleClick);

    return { getMode: () => currentMode, setMode };
}
