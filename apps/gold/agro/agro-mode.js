/**
 * agro-mode.js — Modo Operativo switch (Fase 5)
 * Global segmented control: General / Cultivo / No cultivo / Herramientas
 * Communicates via body[data-agro-shell-mode], body[data-agro-mode] + agro:modechange CustomEvent
 */

const STORAGE_KEY = 'YG_AGRO_MODE_V1';
const EVENT_NAME = 'agro:modechange';
const MODES = Object.freeze(['all', 'crop', 'non_crop', 'tools']);
const DEFAULT_MODE = 'all';

const MODE_ALIASES = Object.freeze({
    general: 'all',
    all: 'all',
    todo: 'all',
    cultivo: 'crop',
    crop: 'crop',
    'no-cultivo': 'non_crop',
    'no_cultivo': 'non_crop',
    'non-crop': 'non_crop',
    non_crop: 'non_crop',
    herramientas: 'tools',
    tools: 'tools'
});

const LEGACY_MODE_BY_MODE = Object.freeze({
    all: 'general',
    crop: 'cultivo',
    non_crop: 'no-cultivo',
    tools: 'herramientas'
});

const MODE_OPTIONS = Object.freeze([
    { value: 'all',      icon: 'fa-layer-group',       label: 'General' },
    { value: 'crop',     icon: 'fa-seedling',          label: 'Cultivo' },
    { value: 'non_crop', icon: 'fa-tractor',           label: 'No cultivo' },
    { value: 'tools',    icon: 'fa-screwdriver-wrench', label: 'Herramientas' }
]);

let currentMode = DEFAULT_MODE;
let rootEl = null;

function normalizeMode(value) {
    const token = String(value || '').trim().toLowerCase();
    const normalized = MODE_ALIASES[token] || token;
    return MODES.includes(normalized) ? normalized : DEFAULT_MODE;
}

function toLegacyMode(mode) {
    return LEGACY_MODE_BY_MODE[normalizeMode(mode)] || LEGACY_MODE_BY_MODE[DEFAULT_MODE];
}

function syncBodyMode() {
    document.body.dataset.agroShellMode = currentMode;
    document.body.dataset.agroMode = toLegacyMode(currentMode);
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
    syncBodyMode();
    syncButtons();
    writeStoredMode(currentMode);
    if (options.broadcast !== false) {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, {
            detail: {
                mode: toLegacyMode(currentMode),
                shellMode: currentMode
            }
        }));
    }
}

function handleClick(event) {
    if (wasDragged) { wasDragged = false; return; }
    const btn = event.target.closest('[data-agro-mode]');
    if (!btn) return;
    event.preventDefault();
    setMode(btn.dataset.agroMode);
}

/* ── Desktop drag-scroll ── */
let wasDragged = false;
let dragActive = false;
let dragStartX = 0;
let dragScrollLeft = 0;
const DRAG_THRESHOLD = 6;

function onPointerDown(e) {
    if (e.pointerType === 'touch') return;
    if (e.button !== 0) return;
    dragActive = true;
    wasDragged = false;
    dragStartX = e.clientX;
    dragScrollLeft = rootEl.scrollLeft;
}

function onPointerMove(e) {
    if (!dragActive) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > DRAG_THRESHOLD) {
        if (!wasDragged) {
            wasDragged = true;
            rootEl.classList.add('is-dragging');
        }
    }
    rootEl.scrollLeft = dragScrollLeft - dx;
}

function onPointerUp() {
    if (!dragActive) return;
    dragActive = false;
    rootEl.classList.remove('is-dragging');
}

function onWheel(e) {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    rootEl.scrollLeft += e.deltaY;
}

function initDrag() {
    if (!rootEl) return;
    rootEl.addEventListener('pointerdown', onPointerDown);
    rootEl.addEventListener('pointermove', onPointerMove);
    rootEl.addEventListener('pointerup', onPointerUp);
    rootEl.addEventListener('pointercancel', onPointerUp);
    rootEl.addEventListener('wheel', onWheel, { passive: false });
}

export function initAgroMode() {
    rootEl = document.getElementById('agro-mode-switch');
    if (!rootEl) return null;

    currentMode = normalizeMode(readStoredMode());
    syncBodyMode();

    renderSwitch();
    rootEl.addEventListener('click', handleClick);
    initDrag();
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
        detail: {
            mode: toLegacyMode(currentMode),
            shellMode: currentMode
        }
    }));

    return { getMode: () => currentMode, setMode };
}
