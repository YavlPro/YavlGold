/**
 * agro-memory-workspace.js — Workspace "Memoria" (AgroRepo + Asistente IA)
 * ANEXO 29 S2/S3 (2026-09-18). Decisiones cerradas del owner (D-1/D-3):
 * superficie única tipo IDE, toggle [Ambas | Memoria | IA], sin hub intermedio.
 *
 * Responsabilidad: montar la región fullscreen `memoria`, reubicar los dos
 * paneles EXISTENTES (sección AgroRepo y superficie del asistente) bajo su
 * control y gobernar el estado de paneles con clases/atributos — NUNCA
 * destruye ni re-crea: los init de AgroRepo (initWidget guard) y del
 * asistente (openAgroAssistantInline) se llaman UNA sola vez y ocultar es
 * solo [hidden] sobre el contenedor del panel.
 *
 * Contrato de dependencias (§3.3, sin circulares):
 * - No importa agro-assistant.js ni agro-repo-app.js: los consume por sus
 *   puentes window (ensureAgroRepoReady / openAgroAssistantInline) con
 *   carga defensiva de agrorepo.js si el puente aún no existe.
 * - agro-assistant.js NO crece en este frente (bandera B1 del ANEXO).
 *
 * Persistencia: YG_AGRO_MEMORIA_PANEL_V1 ('both' | 'rag' | 'ia'). Primera
 * vez: 'both' en desktop, 'ia' en móvil (≤768px). El panel también viaja
 * como subview del hash (#view=memoria&subview=ia) usando la maquinaria
 * nativa del shell (VIEW_SUBNAV_CONFIG + aliases asistente/agrorepo).
 */

import './agro-memory-workspace.css';

const PANEL_STORAGE_KEY = 'YG_AGRO_MEMORIA_PANEL_V1';
const PANEL_STATES = ['both', 'rag', 'ia'];
const VIEW_NAME = 'memoria';

const state = {
    initialized: false,
    panelsReady: false,
    panel: 'both',
    lastHub: 'inicio',
    root: null,
    toggleRoot: null,
    ragHost: null,
    iaHost: null,
    repoSection: null,
    assistantSection: null
};

function isMobileViewport() {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
}

function normalizePanelState(value) {
    const token = String(value || '').trim().toLowerCase();
    return PANEL_STATES.includes(token) ? token : '';
}

function resolveDefaultPanel() {
    return isMobileViewport() ? 'ia' : 'both';
}

function readStoredPanel() {
    try {
        return normalizePanelState(localStorage.getItem(PANEL_STORAGE_KEY));
    } catch (_err) {
        return '';
    }
}

function writeStoredPanel(panel) {
    try {
        localStorage.setItem(PANEL_STORAGE_KEY, panel);
    } catch (_err) {
        // Ignore storage failures; panel state remains runtime-only.
    }
}

function readHashPanel() {
    try {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        if (params.get('view') !== VIEW_NAME) return '';
        return normalizePanelState(params.get('subview'));
    } catch (_err) {
        return '';
    }
}

function syncHashPanel() {
    try {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.hash.replace(/^#/, ''));
        if (params.get('view') !== VIEW_NAME) return;
        params.set('subview', state.panel);
        url.hash = params.toString();
        history.replaceState(null, '', url);
    } catch (_err) {
        // Ignore history failures (sandboxed iframes, etc.).
    }
}

function setHostVisible(host, visible, animate) {
    if (!host) return;
    if (visible) {
        if (host.hidden) {
            host.hidden = false;
            host.removeAttribute('inert');
            if (animate) {
                host.classList.remove('amw-panel--enter');
                // Restart the entry animation on reveal (class re-add on next frame).
                window.requestAnimationFrame(() => host.classList.add('amw-panel--enter'));
                host.addEventListener('animationend', () => host.classList.remove('amw-panel--enter'), { once: true });
            }
        }
    } else {
        host.hidden = true;
        host.setAttribute('inert', '');
    }
}

function setPanelVisibility(animate) {
    const showRag = state.panel === 'both' || state.panel === 'rag';
    const showIa = state.panel === 'both' || state.panel === 'ia';
    setHostVisible(state.ragHost, showRag, animate);
    setHostVisible(state.iaHost, showIa, animate);
}

function applyPanelState(nextPanel, options = {}) {
    let panel = normalizePanelState(nextPanel) || resolveDefaultPanel();
    if (isMobileViewport() && panel === 'both') panel = 'ia';

    const changed = panel !== state.panel;
    state.panel = panel;

    if (state.root) state.root.dataset.amwState = panel;
    state.toggleRoot?.querySelectorAll('[data-amw-panel]').forEach((btn) => {
        const isActive = btn.dataset.amwPanel === panel;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    setPanelVisibility(changed && options.animate !== false);

    if (options.persist !== false) writeStoredPanel(panel);
    if (options.updateHash === true) syncHashPanel();
}

// Carga defensiva: agro.js ya importa agrorepo.js en el bootstrap, pero el
// workspace no debe asumir ordenes de carga entre imports dinámicos.
async function ensurePanels() {
    if (state.panelsReady) return;
    state.panelsReady = true;

    try {
        if (typeof window.ensureAgroRepoReady !== 'function') {
            const mod = await import('./agrorepo.js');
            mod.initAgroRepo?.();
        }
        window.ensureAgroRepoReady?.();
    } catch (err) {
        state.panelsReady = false;
        console.warn('[Memoria] AgroRepo no pudo inicializarse:', err?.message || err);
    }

    if (typeof window.openAgroAssistantInline === 'function') {
        window.openAgroAssistantInline();
    } else {
        console.warn('[Memoria] superficie del asistente no disponible');
    }
}

// Las secciones reubicadas dejan de ser regiones del shell: si el shell las
 //capturó en topLevelRegions antes de la reubicación, syncRegions las oculta
// en cada cambio de vista. Este unhide corre tras cada activación (el evento
// view-changed se dispara DESPUÉS de syncRegions) y en el init tardío.
function unhideEmbeddedSections() {
    [state.repoSection, state.assistantSection].forEach((section) => {
        if (!section) return;
        section.hidden = false;
        section.removeAttribute('inert');
    });
}

function activateFromContext() {
    ensurePanels();
    unhideEmbeddedSections();

    const hashPanel = readHashPanel();
    if (hashPanel) {
        applyPanelState(hashPanel, { persist: true, updateHash: false });
    } else {
        applyPanelState(readStoredPanel() || resolveDefaultPanel(), { persist: false, updateHash: false });
    }
}

function relocatePanels() {
    state.repoSection = document.getElementById('agro-repo-section');
    state.assistantSection = document.querySelector('.asistente-dedicado');

    if (state.repoSection && state.ragHost && !state.ragHost.contains(state.repoSection)) {
        state.repoSection.removeAttribute('data-agro-shell-region');
        state.repoSection.removeAttribute('hidden');
        state.repoSection.removeAttribute('inert');
        state.repoSection.style.removeProperty('margin-top');
        state.repoSection.classList.add('amw-embedded', 'amw-embedded--rag');
        state.ragHost.appendChild(state.repoSection);
    }

    if (state.assistantSection && state.iaHost && !state.iaHost.contains(state.assistantSection)) {
        state.assistantSection.removeAttribute('data-agro-shell-region');
        state.assistantSection.removeAttribute('hidden');
        state.assistantSection.removeAttribute('inert');
        state.assistantSection.classList.add('amw-embedded', 'amw-embedded--ia');
        state.iaHost.appendChild(state.assistantSection);
    }
}

// ANEXO 29 S2: revela el panel RAG desde una cita del asistente.
// Desktop: IA → Ambas; ya Ambas/Memoria se mantiene. Móvil: → Memoria.
window._agroMemoriaRevealRag = () => {
    if (!state.root) return;
    const workspaceActive = state.root.classList.contains('is-shell-active');
    const nextPanel = isMobileViewport()
        ? 'rag'
        : (state.panel === 'ia' ? 'both' : state.panel);
    if (!workspaceActive) {
        window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
            detail: { view: VIEW_NAME, subview: nextPanel, scroll: false }
        }));
    }
    applyPanelState(nextPanel, { persist: true, updateHash: true });
};

export function initAgroMemoryWorkspace() {
    if (state.initialized) return;
    const root = document.getElementById('agro-memory-workspace');
    if (!root) return;

    state.initialized = true;
    state.root = root;
    state.toggleRoot = document.getElementById('amw-toggle');
    state.ragHost = document.querySelector('[data-amw-panel-container="rag"]');
    state.iaHost = document.querySelector('[data-amw-panel-container="ia"]');

    relocatePanels();

    state.toggleRoot?.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-amw-panel]');
        if (!btn || !state.toggleRoot.contains(btn)) return;
        applyPanelState(btn.dataset.amwPanel, { persist: true, updateHash: true });
    });

    document.getElementById('amw-back')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
            detail: { view: state.lastHub }
        }));
    });

    window.addEventListener('agro:shell:gate-changed', (event) => {
        const gate = String(event.detail?.view || '').trim();
        if (gate) state.lastHub = gate;
    });

    window.addEventListener('agro:shell:view-changed', (event) => {
        if (event.detail?.view === VIEW_NAME) activateFromContext();
    });

    window.addEventListener('resize', () => {
        // Móvil no soporta "Ambas": coerción suave sin pisar lo persistido.
        if (isMobileViewport() && state.panel === 'both') {
            applyPanelState('ia', { persist: false, updateHash: false });
        }
    });

    // Carrera de carga: si el shell ya activó memoria antes de que este
    // módulo terminara de importarse, el evento view-changed se perdió.
    if (document.body?.dataset?.agroActiveView === VIEW_NAME) {
        activateFromContext();
    } else {
        applyPanelState(resolveDefaultPanel(), { persist: false, updateHash: false, animate: false });
    }

    console.info('[Memoria] workspace wired');
}
