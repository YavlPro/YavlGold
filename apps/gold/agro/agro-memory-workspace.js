/**
 * agro-memory-workspace.js — Workspace "Memoria" por capas (ANEXO 29 S3-b)
 * IA = superficie HOGAR inmersiva fullscreen (ancho completo); AgroRepo =
 * capa INTERNA fullscreen con topbar propia cuyo Volver regresa a la IA.
 * El toggle de tres estados [Ambas|Memoria|IA] y el split murieron por
 * decisión del owner (18-sep): una capa a la vez, sin media pantalla.
 *
 * Responsabilidad: montar la región fullscreen `memoria`, reubicar los dos
 * paneles EXISTENTES bajo su control (appendChild, sin destruir estado) y
 * gobernar la capa activa [ia|rag] con visibilidad por clases/atributos.
 * Los init de AgroRepo y del asistente se llaman UNA sola vez (guards).
 *
 * Contrato de dependencias (§3.3, sin circulares):
 * - No importa agro-assistant.js ni agro-repo-app.js: los consume por sus
 *   puentes window (ensureAgroRepoReady / openAgroAssistantInline) con
 *   carga defensiva de agrorepo.js si el puente aún no existe.
 * - agro-assistant.js NO crece en este frente (bandera B1 del ANEXO).
 *
 * Capa IA: sin contextbar del shell ni Volver propio — la salida es la barra
 * del hub (tabbar móvil / franja de puertas desktop), gestionada por el flag
 * body[data-agro-memoria-layer] con la colaboración de syncShellDepth
 * (agro-shell.js deja de ocultar por atributo tabbar+hub en memoria).
 * Capa RAG: barra del hub oculta; salida = Volver de su topbar → IA.
 *
 * Persistencia: YG_AGRO_MEMORIA_PANEL_V1 con valores 'ia'|'rag' (migración:
 * 'both' → 'ia' al leer). La capa también viaja como subview del hash
 * (#view=memoria&subview=rag) usando la maquinaria nativa del shell.
 */

import './agro-memory-workspace.css';
import { setAssistantDrawerOpen } from './agro-assistant-ui.js';

const PANEL_STORAGE_KEY = 'YG_AGRO_MEMORIA_PANEL_V1';
const LAYER_STATES = ['ia', 'rag'];
const DEFAULT_LAYER = 'ia';
const VIEW_NAME = 'memoria';

const state = {
    initialized: false,
    panelsReady: false,
    layer: DEFAULT_LAYER,
    root: null,
    ragTopbar: null,
    ragHost: null,
    iaHost: null,
    repoSection: null,
    assistantSection: null
};

function normalizeLayerState(value) {
    const token = String(value || '').trim().toLowerCase();
    // Migración S3-b: el estado 'both' del split de S2/S3 coerciona a 'ia'.
    if (token === 'both') return DEFAULT_LAYER;
    return LAYER_STATES.includes(token) ? token : '';
}

function readStoredLayer() {
    try {
        return normalizeLayerState(localStorage.getItem(PANEL_STORAGE_KEY));
    } catch (_err) {
        return '';
    }
}

function writeStoredLayer(layer) {
    try {
        localStorage.setItem(PANEL_STORAGE_KEY, layer);
    } catch (_err) {
        // Ignore storage failures; layer state remains runtime-only.
    }
}

function readHashLayer() {
    try {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        if (params.get('view') !== VIEW_NAME) return '';
        return normalizeLayerState(params.get('subview'));
    } catch (_err) {
        return '';
    }
}

function syncHashLayer() {
    try {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.hash.replace(/^#/, ''));
        if (params.get('view') !== VIEW_NAME) return;
        params.set('subview', state.layer);
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

function setLayerVisibility(animate) {
    setHostVisible(state.ragHost, state.layer === 'rag', animate);
    setHostVisible(state.iaHost, state.layer === 'ia', animate);
    if (state.ragTopbar) state.ragTopbar.hidden = state.layer !== 'rag';
}

function applyLayer(nextLayer, options = {}) {
    const layer = normalizeLayerState(nextLayer) || DEFAULT_LAYER;
    const changed = layer !== state.layer;
    state.layer = layer;

    if (state.root) state.root.dataset.amwLayer = layer;
    // Flag de capa SOLO con memoria activa: el CSS del workspace (y solo él)
    // reactiva la barra del hub como salida en 'ia'; en 'rag' las reglas del
    // shell mandan (oculta). Sin el guard, el init en frío dejaría el tabbar
    // desvanecido-anulado dentro de OTROS módulos en móvil.
    if (document.body?.dataset?.agroActiveView === VIEW_NAME) {
        document.body.dataset.agroMemoriaLayer = layer;
    }

    setLayerVisibility(changed && options.animate !== false);

    if (options.persist !== false) writeStoredLayer(layer);
    if (options.updateHash === true) syncHashLayer();
}

// Carga defensiva: agro.js ya importa agrorepo.js en el bootstrap, pero el
// workspace no debe asumir órdenes de carga entre imports dinámicos.
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

// QA-fix 1 (18-sep): syncRegions oculta las regiones no activas con la clase
// .is-shell-hidden (display:none !important, agro.css) MÁS el atributo hidden,
// y las secciones reubicadas siguen viviendo en topLevelRegions del shell.
// Hay que retirar clase y atributo aquí y en cada activación (el evento
// view-changed llega DESPUÉS de syncRegions, así que el orden es correcto).
function revealEmbeddedSection(section) {
    if (!section) return;
    section.hidden = false;
    section.removeAttribute('inert');
    section.classList.remove('is-shell-hidden', 'is-shell-active');
}

function unhideEmbeddedSections() {
    [state.repoSection, state.assistantSection].forEach(revealEmbeddedSection);
}

function activateFromContext() {
    ensurePanels();
    unhideEmbeddedSections();

    const hashLayer = readHashLayer();
    if (hashLayer) {
        applyLayer(hashLayer, { persist: true, updateHash: false });
    } else {
        applyLayer(readStoredLayer() || DEFAULT_LAYER, { persist: false, updateHash: false });
    }
}

function relocatePanels() {
    state.repoSection = document.getElementById('agro-repo-section');
    state.assistantSection = document.querySelector('.asistente-dedicado');

    if (state.repoSection && state.ragHost && !state.ragHost.contains(state.repoSection)) {
        state.repoSection.removeAttribute('data-agro-shell-region');
        revealEmbeddedSection(state.repoSection);
        state.repoSection.style.removeProperty('margin-top');
        state.repoSection.classList.add('amw-embedded', 'amw-embedded--rag');
        state.ragHost.appendChild(state.repoSection);
    }

    if (state.assistantSection && state.iaHost && !state.iaHost.contains(state.assistantSection)) {
        state.assistantSection.removeAttribute('data-agro-shell-region');
        revealEmbeddedSection(state.assistantSection);
        state.assistantSection.classList.add('amw-embedded', 'amw-embedded--ia');
        state.iaHost.appendChild(state.assistantSection);
    }
}

// ANEXO 29 S3-b: revela la capa AgroRepo desde una cita del asistente o desde
// el botón "AgroRepo" de su sidebar. Móvil y desktop por igual: capa completa.
window._agroMemoriaRevealRag = () => {
    if (!state.root) return;
    const workspaceActive = state.root.classList.contains('is-shell-active');
    if (!workspaceActive) {
        window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
            detail: { view: VIEW_NAME, subview: 'rag', scroll: false }
        }));
    }
    applyLayer('rag', { persist: true, updateHash: true });
};

export function initAgroMemoryWorkspace() {
    if (state.initialized) return;
    const root = document.getElementById('agro-memory-workspace');
    if (!root) return;

    state.initialized = true;
    state.root = root;
    state.ragTopbar = document.getElementById('amw-rag-topbar');
    state.ragHost = document.querySelector('[data-amw-panel-container="rag"]');
    state.iaHost = document.querySelector('[data-amw-panel-container="ia"]');

    relocatePanels();

    // Capa rag: su Volver regresa a la IA (NO al hub) conservando el thread.
    document.getElementById('amw-rag-back')?.addEventListener('click', () => {
        applyLayer('ia', { persist: true, updateHash: true });
    });

    // Botón "AgroRepo" de la sidebar del asistente (markup estático): entra a
    // la capa rag. El wiring vive aquí para no tocar agro-assistant.js (B1).
    document.getElementById('ast-open-agrorepo')?.addEventListener('click', () => {
        window._agroMemoriaRevealRag();
    });

    // ANEXO 29 QA-fix (mobile): drawer de historial del asistente. En ≤768 la
    // sidebar es una fila compacta y la lista de threads vive en un bottom
    // sheet (clases drawer-open/open de setAssistantDrawerOpen, mecanismo
    // existente). Seleccionar un thread cierra el sheet. Desktop intacto:
    // los estilos del drawer viven solo dentro del media ≤768.
    const historyToggle = document.getElementById('ast-history-toggle');
    const assistantSidebar = document.getElementById('assistant-sidebar');
    const threadListEl = document.getElementById('assistant-thread-list');

    const closeHistoryDrawer = () => {
        setAssistantDrawerOpen(false);
        historyToggle?.setAttribute('aria-expanded', 'false');
    };

    historyToggle?.addEventListener('click', () => {
        const isOpen = assistantSidebar?.classList.contains('open') === true;
        setAssistantDrawerOpen(!isOpen);
        historyToggle?.setAttribute('aria-expanded', String(!isOpen));
    });

    threadListEl?.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('.assistant-thread')) {
            closeHistoryDrawer();
        }
    });

    window.addEventListener('agro:shell:view-changed', (event) => {
        if (event.detail?.view === VIEW_NAME) {
            activateFromContext();
        } else if (document.body?.dataset?.agroMemoriaLayer) {
            // Al salir de memoria, devolver el control de la barra del hub a
            // las reglas nativas del shell (flag de capa fuera).
            delete document.body.dataset.agroMemoriaLayer;
        }
    });

    // Carrera de carga: si el shell ya activó memoria antes de que este
    // módulo terminara de importarse, el evento view-changed se perdió.
    if (document.body?.dataset?.agroActiveView === VIEW_NAME) {
        activateFromContext();
    } else {
        applyLayer(DEFAULT_LAYER, { persist: false, updateHash: false, animate: false });
    }

    console.info('[Memoria] workspace por capas wired');
}
