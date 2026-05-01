import { initAgroShellFavorites } from './agro-shell-favorites.js';
import { initAgroShellSearch } from './agro-shell-search.js';

const AGRO_ACTIVE_VIEW_KEY = 'YG_AGRO_ACTIVE_VIEW_V1';
const AGRO_RAIL_EXPANDED_KEY = 'YG_AGRO_RAIL_EXPANDED_V1';
const AGRO_MOBILE_RAIL_COLLAPSED_KEY = 'YG_AGRO_MOBILE_RAIL_COLLAPSED_V1';
const AGRO_DEFAULT_VIEW = 'dashboard';
const AGRO_DEFAULT_SHELL_MODE = 'all';
const AGRO_DEFAULT_MOBILE_HUB = 'inicio';
const AGRO_CROPS_READY_EVENT = 'AGRO_CROPS_READY';
const AGRO_CROPS_STATE_KEY = '__AGRO_CROPS_STATE';
const AGRO_GENERAL_CROP_ID = '__general__';

const SHELL_ENTRY_SELECTOR = [
    '.agro-shell-link[data-agro-view]',
    '.agro-shell-sublink[data-agro-view]',
    '.agro-shell-link[data-agro-action]'
].join(',');

const SHELL_MODE_ALIASES = Object.freeze({
    all: 'all',
    general: 'all',
    crop: 'crop',
    cultivo: 'crop',
    non_crop: 'non_crop',
    'non-crop': 'non_crop',
    'no-cultivo': 'non_crop',
    no_cultivo: 'non_crop',
    tools: 'tools',
    herramientas: 'tools'
});

const TAB_TO_VIEW = Object.freeze({
    gastos: 'operaciones',
    ingresos: 'operaciones',
    pendientes: 'operaciones',
    perdidas: 'operaciones',
    transferencias: 'operaciones',
    otros: 'operaciones',
    carrito: 'carrito',
    rankings: 'rankings'
});

const CORE_OPERATIONS_TABS = new Set([
    'gastos',
    'ingresos',
    'pendientes',
    'perdidas',
    'transferencias',
    'otros'
]);

const MOBILE_HUBS = new Set(['inicio', 'operacion', 'memoria', 'menu']);

const VIEW_TO_MOBILE_HUB = Object.freeze({
    dashboard: 'inicio',
    ciclos: 'operacion',
    'period-cycles': 'operacion',
    operational: 'operacion',
    operaciones: 'operacion',
    carrito: 'operacion',
    rankings: 'operacion',
    'cartera-viva': 'operacion',
    clima: 'operacion',
    'task-cycles': 'operacion',
    agrorepo: 'memoria',
    asistente: 'memoria',
    perfil: 'inicio',
    herramientas: 'menu'
});

const ACTION_TO_MOBILE_CONTEXT = Object.freeze({
    'new-record': Object.freeze({ hub: 'inicio', label: 'Nuevo registro' }),
    'new-crop': Object.freeze({ hub: 'inicio', label: 'Nuevo cultivo' }),
    social: Object.freeze({ hub: 'operacion', label: 'Panel Agro Social' })
});

const VIEW_ALIASES = Object.freeze({
    cultivos: Object.freeze({ view: 'ciclos', subview: 'mis-cultivos' }),
    'historial-comercial': Object.freeze({ view: 'cartera-viva', subview: '' }),
    carrito: Object.freeze({ view: 'carrito', subview: 'summary' }),
    'operational-periods': Object.freeze({ view: 'period-cycles', subview: '' }),
    'period-cycles-active': Object.freeze({ view: 'period-cycles', subview: 'calendario' }),
    'period-cycles-calendario': Object.freeze({ view: 'period-cycles', subview: 'calendario' }),
    'period-cycles-compare': Object.freeze({ view: 'period-cycles', subview: 'comparar' }),
    'period-cycles-stats': Object.freeze({ view: 'period-cycles', subview: 'estadisticas' }),
    'operational-cart': Object.freeze({ view: 'carrito', subview: 'summary' }),
    'operational-active': Object.freeze({ view: 'operational', subview: 'active' }),
    'operational-finished': Object.freeze({ view: 'operational', subview: 'finished' }),
    'operational-donations': Object.freeze({ view: 'operational', subview: 'donations' }),
    'operational-losses': Object.freeze({ view: 'operational', subview: 'losses' }),
    'operational-export': Object.freeze({ view: 'operational', subview: 'export' })
});

const LEGACY_VIEW_REDIRECTS = Object.freeze({
    pagados: 'operaciones',
    fiados: 'operaciones',
    perdidas: 'operaciones',
    donaciones: 'operaciones',
    otros: 'operaciones'
});

const NAV_PARENT_GROUPS = Object.freeze({
    'historial-comercial': Object.freeze({
        views: Object.freeze(['cartera-viva', 'operational']),
        defaultView: 'cartera-viva'
    }),
    'granja-general': Object.freeze({
        views: Object.freeze(['ciclos', 'period-cycles']),
        defaultView: 'ciclos'
    })
});

const VIEW_SUBNAV_CONFIG = Object.freeze({
    ciclos: Object.freeze({ defaultSubview: 'mis-cultivos', allowed: ['mis-cultivos', 'comparar', 'estadisticas'] }),
    'period-cycles': Object.freeze({ defaultSubview: 'calendario', allowed: ['calendario', 'comparar', 'estadisticas'] }),
    carrito: Object.freeze({ defaultSubview: 'summary', allowed: ['summary', 'planning', 'calculator'] }),
    operational: Object.freeze({ defaultSubview: 'active', allowed: ['active', 'finished', 'donations', 'losses', 'export'] })
});

const VIEWS_WITH_SUBNAV = new Set(Object.keys(VIEW_SUBNAV_CONFIG));

const VIEW_CONFIG = Object.freeze({
    perfil: { region: 'perfil', label: 'Mi Perfil', focusSelector: '[data-agro-shell-region="perfil"]' },
    dashboard: { region: 'dashboard', label: 'Dashboard Agro', focusSelector: '[data-agro-shell-region="dashboard"]' },
    ciclos: { region: 'cultivos', label: 'Ciclos de cultivos', focusSelector: '#agro-cycles-finished-view' },
    'period-cycles': { region: 'period-cycles', label: 'Calendario operativo', focusSelector: '#agro-period-cycles-root' },
    operational: { region: 'operational', label: 'Cartera Operativa', focusSelector: '#agro-operational-root' },
    'task-cycles': { region: 'task-cycles', label: 'Ciclos de Tareas', focusSelector: '#agro-task-cycles-root' },
    operaciones: { region: 'ops', label: 'Mi Granja', resolveTab: resolveOperationsTab, dense: true },
    carrito: { region: 'ops', label: 'Mi Carrito', tab: 'carrito', focusSelector: '#agro-carrito-dedicated', dense: true },
    rankings: { region: 'ops', label: 'Rankings de Clientes', tab: 'rankings', focusSelector: '#agro-rankings-dedicated', dense: true },
    'cartera-viva': { region: 'cartera-viva', label: 'Cartera Viva', focusSelector: '#agro-cartera-viva-root' },
    clima: { region: 'clima', label: 'Clima Agro', focusSelector: '[data-agro-shell-region="clima"]' },
    herramientas: { region: 'herramientas', label: 'Ayuda y soporte', focusSelector: '#agro-tools-section' },
    agrorepo: { region: 'agrorepo', label: 'AgroRepo', focusSelector: '#agro-repo-section', dense: true },
    asistente: { region: 'asistente', label: 'Asistente IA', focusSelector: '[data-agro-shell-region="asistente"]' }
});

const SHELL_VIEW_KEYWORDS = Object.freeze({
    perfil: Object.freeze(['perfil', 'agricultor', 'finca', 'contacto', 'privacidad']),
    dashboard: Object.freeze(['inicio', 'resumen', 'arranque', 'dia', 'panel']),
    ciclos: Object.freeze(['cultivo', 'cultivos', 'siembra', 'cosecha', 'rendimiento', 'produccion']),
    'period-cycles': Object.freeze(['periodo', 'periodos', 'mes', 'mensual', 'cierre']),
    operational: Object.freeze(['cartera', 'operativa', 'facturero', 'movimiento', 'abono', 'pago']),
    'task-cycles': Object.freeze(['tareas', 'trabajo diario', 'pendientes', 'agenda']),
    operaciones: Object.freeze(['operacion comercial', 'gastos', 'ingresos', 'fiados', 'perdidas']),
    carrito: Object.freeze(['carrito', 'insumos', 'compras', 'lista']),
    rankings: Object.freeze(['ranking', 'rankings', 'clientes', 'estadisticas', 'top', 'comparacion']),
    'cartera-viva': Object.freeze(['cartera viva', 'clientes', 'fiados', 'deudas', 'pendientes']),
    clima: Object.freeze(['clima', 'temperatura', 'lluvia', 'tiempo']),
    herramientas: Object.freeze(['ayuda', 'soporte', 'documentacion', 'privacidad', 'herramientas']),
    agrorepo: Object.freeze(['bitacora', 'agrorepo', 'memoria', 'notas', 'historial']),
    asistente: Object.freeze(['asistente', 'ia', 'ayuda', 'contexto'])
});

const SHELL_SUBVIEW_KEYWORDS = Object.freeze({
    activos: Object.freeze(['activo', 'activos', 'en curso', 'abierto']),
    finalizados: Object.freeze(['finalizado', 'finalizados', 'cerrado', 'cerrados', 'historial']),
    comparar: Object.freeze(['comparar', 'comparacion', 'contraste']),
    estadisticas: Object.freeze(['estadistica', 'estadisticas', 'metricas', 'resumen'])
});

const SHELL_ACTION_KEYWORDS = Object.freeze({
    'new-crop': Object.freeze(['nuevo cultivo', 'crear cultivo', 'siembra', 'cultivo'])
});

function resolveOperationsTab() {
    const currentTab = String(document.querySelector('.financial-tab-btn.is-active')?.dataset?.tab || '').trim();
    if (CORE_OPERATIONS_TABS.has(currentTab)) return currentTab;
    return 'gastos';
}

function normalizeCropIdToken(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function readCropsSnapshot() {
    if (typeof window === 'undefined') return null;
    const snapshot = window[AGRO_CROPS_STATE_KEY];
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
}

function readSelectedCropId() {
    if (typeof window === 'undefined') return '';
    if (typeof window.getSelectedCropId === 'function') {
        return normalizeCropIdToken(window.getSelectedCropId());
    }
    return normalizeCropIdToken(window.YG_AGRO_SELECTED_CROP_ID);
}

function getRenderedActiveCropIds() {
    const activeRow = document.getElementById('ops-cultivos-active-row');
    if (!activeRow) return null;
    const chips = Array.from(activeRow.querySelectorAll('.ops-cultivo-chip[data-crop-id]'));
    const hasGeneralChip = chips.some((chip) => normalizeCropIdToken(chip.dataset.cropId) === AGRO_GENERAL_CROP_ID);
    if (!hasGeneralChip) return null;
    const ids = new Set();
    chips.forEach((chip) => {
        const cropId = normalizeCropIdToken(chip.dataset.cropId);
        if (cropId && cropId !== AGRO_GENERAL_CROP_ID) {
            ids.add(cropId);
        }
    });
    return ids;
}

function getCropChipLabel(crop) {
    const icon = String(crop?.icon || '🌱').trim() || '🌱';
    const name = String(crop?.name || crop?.nombre || 'Cultivo').trim() || 'Cultivo';
    return `${icon} ${name}`.trim();
}

function getCropChipMeta(crop) {
    const status = String(crop?.status_override || crop?.status || '').trim();
    const endDate = String(crop?.end_date || crop?.fecha_fin || crop?.finished_at || crop?.closed_at || '').trim();
    if (status) return status.replace(/[_-]+/g, ' ');
    if (endDate) return 'Cerrado';
    return 'Finalizado';
}

function createFinishedCropContextChip(crop, selectedId) {
    const cropId = normalizeCropIdToken(crop?.id);
    if (!cropId) return null;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'ops-cultivo-chip ops-cultivo-chip--finished';
    chip.dataset.agroFinishedCropContext = cropId;
    chip.dataset.cropId = cropId;
    chip.setAttribute('aria-pressed', cropId === selectedId ? 'true' : 'false');
    if (cropId === selectedId) {
        chip.classList.add('is-active');
    }

    const labelEl = document.createElement('span');
    labelEl.className = 'ops-cultivo-chip-name';
    labelEl.textContent = getCropChipLabel(crop);

    const metaEl = document.createElement('span');
    metaEl.className = 'ops-cultivo-chip-meta';
    metaEl.textContent = getCropChipMeta(crop);

    chip.append(labelEl, metaEl);
    return chip;
}

function renderRankingsFinishedCyclePicker() {
    const picker = document.getElementById('ops-cultivos-finished-picker');
    if (!picker) return;

    const activeIds = getRenderedActiveCropIds();
    if (!activeIds) return;

    const snapshot = readCropsSnapshot();
    const crops = Array.isArray(snapshot?.crops) ? snapshot.crops : [];
    const selectedId = readSelectedCropId();
    const finishedCrops = crops.filter((crop) => {
        const cropId = normalizeCropIdToken(crop?.id);
        return cropId && !activeIds.has(cropId);
    });

    picker.textContent = '';
    if (!finishedCrops.length) {
        const empty = document.createElement('p');
        empty.className = 'ops-cultivos-empty';
        empty.textContent = 'No hay ciclos cerrados disponibles para filtrar.';
        picker.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    finishedCrops.forEach((crop) => {
        const chip = createFinishedCropContextChip(crop, selectedId);
        if (chip) fragment.appendChild(chip);
    });
    picker.appendChild(fragment);
}

let rankingsFinishedCyclePickerFrame = 0;

function scheduleRankingsFinishedCyclePickerRender() {
    if (typeof window === 'undefined') return;
    if (rankingsFinishedCyclePickerFrame) {
        window.cancelAnimationFrame?.(rankingsFinishedCyclePickerFrame);
    }
    const run = () => {
        rankingsFinishedCyclePickerFrame = 0;
        renderRankingsFinishedCyclePicker();
    };
    if (typeof window.requestAnimationFrame === 'function') {
        rankingsFinishedCyclePickerFrame = window.requestAnimationFrame(run);
    } else {
        window.setTimeout(run, 0);
    }
}

function bindRankingsFinishedCyclePicker() {
    document.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-agro-finished-crop-context]');
        if (!chip) return;
        event.preventDefault();
        event.stopPropagation();
        const cropId = normalizeCropIdToken(chip.dataset.agroFinishedCropContext);
        if (!cropId || typeof window.setSelectedCropId !== 'function') return;
        const changed = window.setSelectedCropId(cropId);
        if (!changed) {
            window.dispatchEvent(new CustomEvent('agro:crop:changed', { detail: { cropId } }));
        }
        scheduleRankingsFinishedCyclePickerRender();
    });

    window.addEventListener(AGRO_CROPS_READY_EVENT, scheduleRankingsFinishedCyclePickerRender);
    window.addEventListener('agro:crop:changed', scheduleRankingsFinishedCyclePickerRender);
    window.addEventListener('agro:shell:view-changed', scheduleRankingsFinishedCyclePickerRender);
    document.addEventListener('data-refresh', scheduleRankingsFinishedCyclePickerRender);
}

function normalizeViewToken(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeShellMode(value) {
    const token = normalizeViewToken(value).replace(/\s+/g, '_');
    return SHELL_MODE_ALIASES[token] || AGRO_DEFAULT_SHELL_MODE;
}

function normalizeMobileHub(value) {
    const token = normalizeViewToken(value);
    return MOBILE_HUBS.has(token) ? token : AGRO_DEFAULT_MOBILE_HUB;
}

function parseShellModeScopes(value) {
    return String(value || '')
        .split(/[\s,|]+/)
        .map((entry) => normalizeShellMode(entry))
        .filter((entry) => entry && entry !== AGRO_DEFAULT_SHELL_MODE);
}

function readShellLabel(node) {
    return String(node?.querySelector('.agro-shell-link__label')?.textContent || node?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function readInteractiveLabel(node) {
    const explicitLabel = node?.querySelector('.agro-shell-link__label')?.textContent
        || (node?.matches?.('.agro-mobile-hub__item') ? node.querySelector('span')?.textContent : '');
    return String(explicitLabel || node?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function readShellIconClass(node) {
    return String(node?.querySelector('.agro-shell-link__icon')?.getAttribute('class') || '').trim();
}

function findGroupLabel(node) {
    const group = node?.closest('.agro-shell-sidebar__group');
    return String(group?.querySelector('.agro-shell-sidebar__label span')?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function findSubgroupLabel(node) {
    let current = node?.previousElementSibling || null;
    while (current) {
        if (current.matches?.('.agro-shell-subgroup-label')) {
            return String(current.textContent || '').replace(/\s+/g, ' ').trim();
        }
        current = current.previousElementSibling;
    }
    return '';
}

function buildShellEntryId(node) {
    const action = normalizeViewToken(node?.dataset?.agroAction);
    if (action) return `action:${action}`;

    const rawView = normalizeViewToken(node?.dataset?.agroView);
    const view = normalizeView(rawView);
    const subview = normalizeViewToken(node?.dataset?.agroSubview);
    return subview ? `view:${view}:${subview}` : `view:${view}`;
}

function buildShellKeywords(entry) {
    const keywords = new Set([
        entry.label,
        entry.groupLabel,
        entry.contextLabel,
        entry.view,
        entry.subview,
        entry.action,
        entry.modeScope
    ].filter(Boolean));

    (SHELL_VIEW_KEYWORDS[entry.view] || []).forEach((keyword) => keywords.add(keyword));
    (SHELL_SUBVIEW_KEYWORDS[entry.subview] || []).forEach((keyword) => keywords.add(keyword));
    (SHELL_ACTION_KEYWORDS[entry.action] || []).forEach((keyword) => keywords.add(keyword));

    return [...keywords];
}

function collectShellEntries(sidebar) {
    if (!sidebar) return [];

    const entries = [];
    const seen = new Set();
    sidebar.querySelectorAll(SHELL_ENTRY_SELECTOR).forEach((node) => {
        const id = buildShellEntryId(node);
        if (!id || seen.has(id)) return;

        const view = normalizeViewToken(node.dataset.agroView);
        const action = normalizeViewToken(node.dataset.agroAction);
        const subview = normalizeViewToken(node.dataset.agroSubview);
        const label = readShellLabel(node);
        if (!label) return;

        const groupLabel = findGroupLabel(node);
        const contextLabel = findSubgroupLabel(node) || groupLabel;
        const entry = {
            id,
            type: action ? 'action' : 'view',
            view,
            action,
            subview,
            label,
            groupLabel,
            contextLabel,
            modeScope: String(node.dataset.agroModeScope || '').trim(),
            iconClass: readShellIconClass(node),
            element: node
        };

        entry.keywords = buildShellKeywords(entry);
        entries.push(entry);
        seen.add(id);
    });

    return entries;
}

function shellNodeMatchesMode(node, mode) {
    if (!node || mode === AGRO_DEFAULT_SHELL_MODE) return true;
    const scopes = parseShellModeScopes(node.dataset?.agroModeScope);
    return scopes.includes(mode);
}

function scopedNodeIsVisible(node) {
    return !!node && !node.hidden && !node.closest('.agro-shell-nav-item[hidden]');
}

function resolveViewAlias(value) {
    const token = normalizeViewToken(value);
    return VIEW_ALIASES[token] || null;
}

function normalizeView(value) {
    const token = normalizeViewToken(value);
    if (LEGACY_VIEW_REDIRECTS[token]) {
        return LEGACY_VIEW_REDIRECTS[token];
    }
    if (VIEW_ALIASES[token]) {
        return VIEW_ALIASES[token].view;
    }
    return Object.prototype.hasOwnProperty.call(VIEW_CONFIG, token) ? token : AGRO_DEFAULT_VIEW;
}

function normalizeBootView(value) {
    return normalizeView(value);
}

function normalizeSubview(view, subview) {
    const config = VIEW_SUBNAV_CONFIG[view];
    if (!config) return '';
    const token = normalizeViewToken(subview);
    return config.allowed.includes(token) ? token : config.defaultSubview;
}

function resolveNavParentForView(view) {
    const matchedGroup = Object.entries(NAV_PARENT_GROUPS).find(([, config]) => config.views.includes(view));
    if (matchedGroup) return matchedGroup[0];
    return VIEWS_WITH_SUBNAV.has(view) ? view : null;
}

function isViewWithinNavParent(view, navParent) {
    const token = normalizeViewToken(navParent);
    const groupConfig = NAV_PARENT_GROUPS[token];
    if (groupConfig) return groupConfig.views.includes(view);
    return token === view;
}

function writeStoredView(view) {
    try {
        localStorage.setItem(AGRO_ACTIVE_VIEW_KEY, normalizeView(view));
    } catch (_err) {
        // Ignore storage errors.
    }
}

function readRailExpanded() {
    try {
        return localStorage.getItem(AGRO_RAIL_EXPANDED_KEY) === '1';
    } catch (_err) {
        return false;
    }
}

function writeRailExpanded(isExpanded) {
    try {
        localStorage.setItem(AGRO_RAIL_EXPANDED_KEY, isExpanded ? '1' : '0');
    } catch (_err) {
        // Ignore storage errors.
    }
}

function readMobileRailCollapsed() {
    try {
        return localStorage.getItem(AGRO_MOBILE_RAIL_COLLAPSED_KEY) === '1';
    } catch (_err) {
        return false;
    }
}

function writeMobileRailCollapsed(isCollapsed) {
    try {
        localStorage.setItem(AGRO_MOBILE_RAIL_COLLAPSED_KEY, isCollapsed ? '1' : '0');
    } catch (_err) {
        // Ignore storage errors.
    }
}

function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function setElementHiddenInert(element, shouldHide) {
    if (!element) return;
    element.hidden = !!shouldHide;
    if (shouldHide) {
        element.setAttribute('inert', '');
    } else {
        element.removeAttribute('inert');
    }
}

function focusTarget(selector, options = {}) {
    const target = selector ? document.querySelector(selector) : null;
    if (!target) return;

    if (options.scroll !== false) {
        target.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'start',
            inline: 'nearest'
        });
    }

    const focusable = target.matches('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ? target
        : target.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');

    if (!focusable) return;
    window.requestAnimationFrame(() => {
        try {
            focusable.focus({ preventScroll: true });
        } catch (_err) {
            focusable.focus();
        }
    });
}

function updateAccordionState(id, isOpen) {
    const details = document.getElementById(id);
    if (!details) return;
    details.open = !!isOpen;
    const summary = details.querySelector('summary');
    if (summary) {
        summary.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
}

const CYCLE_SUBVIEW_META = Object.freeze({
    'mis-cultivos': Object.freeze({
        title: 'Mis cultivos',
        copy: 'Activos, finalizados y perdidos en una sola vista',
        focusSelector: '#cyclesContainer'
    }),
    comparar: Object.freeze({
        title: 'Comparar ciclos',
        copy: 'Cruza rendimiento, duracion y resultado entre dos ciclos',
        focusSelector: '#agro-cycle-compare-root'
    }),
    estadisticas: Object.freeze({
        title: 'Estadisticas de ciclos',
        copy: 'Lectura global del portafolio con insights y exportes',
        focusSelector: '#agro-global-stats-panel'
    })
});

const PERIOD_CYCLE_SUBVIEW_META = Object.freeze({
    calendario: Object.freeze({
        title: 'Calendario operativo',
        copy: 'Períodos activos y finalizados en una sola vista',
        focusSelector: '#agro-period-cycles-root'
    }),
    comparar: Object.freeze({
        title: 'Comparar períodos',
        copy: 'Base preparada para contrastar meses y cierres operativos',
        focusSelector: '#agro-period-cycles-compare-view'
    }),
    estadisticas: Object.freeze({
        title: 'Estadísticas de períodos',
        copy: 'Lectura resumida del portafolio mensual visible',
        focusSelector: '#agro-period-cycles-stats-view'
    })
});

function resolveCycleSubviewMeta(subview) {
    const token = normalizeSubview('ciclos', subview);
    return CYCLE_SUBVIEW_META[token] || CYCLE_SUBVIEW_META['mis-cultivos'];
}

function resolvePeriodCycleSubviewMeta(subview) {
    const token = normalizeSubview('period-cycles', subview);
    return PERIOD_CYCLE_SUBVIEW_META[token] || PERIOD_CYCLE_SUBVIEW_META.calendario;
}

function syncCycleStatsPanel(subview) {
    const panel = document.getElementById('agro-global-stats-panel');
    const body = document.getElementById('agro-global-stats-body');
    if (!panel || !body) return;
    const isStatsView = subview === 'estadisticas';
    panel.classList.toggle('is-expanded', isStatsView);
    body.hidden = !isStatsView;
}

function syncCultivosSubview(view, subview) {
    const title = document.getElementById('crops-section-title');
    const subtitle = document.getElementById('crops-section-subtitle');
    const isCyclesView = view === 'ciclos';
    const meta = isCyclesView
        ? resolveCycleSubviewMeta(subview)
        : {
            title: 'Ciclos de cultivos',
            copy: 'Activos, cierres, comparacion y estadistica en una sola familia'
        };

    if (title) {
        title.textContent = meta.title;
    }

    if (subtitle) {
        subtitle.textContent = meta.copy;
    }

    syncCycleStatsPanel(isCyclesView ? subview : '');
}

function resolveCycleFocusSelector(subview) {
    return resolveCycleSubviewMeta(subview).focusSelector || '[data-agro-shell-region="cultivos"]';
}

function resolvePeriodCycleFocusSelector(subview) {
    return resolvePeriodCycleSubviewMeta(subview).focusSelector || '#agro-period-cycles-root';
}

function clickIfExists(selector) {
    const node = document.querySelector(selector);
    if (!node) return false;
    node.click();
    return true;
}

function runAction(action, currentView = '') {
    const token = String(action || '').trim().toLowerCase();
    switch (token) {
        case 'profile':
            return clickIfExists('#agro-profile-button');
        case 'new-crop':
            if (typeof window.openCropModal === 'function') {
                window.openCropModal();
                return true;
            }
            return clickIfExists('#btn-new-crop');
        case 'new-record':
            if (typeof window.launchAgroWizard === 'function') {
                if (currentView === 'cartera-viva' && typeof window.openCarteraVivaRecordContext === 'function') {
                    return window.openCarteraVivaRecordContext() === true;
                }
                window.launchAgroWizard('gastos');
                return true;
            }
            return false;
        case 'assistant':
            return false;
        case 'social':
            return clickIfExists('#btn-open-agro-social');
        case 'calculator':
            return false;
        default:
            return false;
    }
}

function mapTabToView(tabName) {
    const token = String(tabName || '').trim().toLowerCase();
    return TAB_TO_VIEW[token] || 'operaciones';
}

export function initAgroShell() {
    const sidebar = document.getElementById('agro-shell-sidebar');
    const backdrop = document.getElementById('agro-shell-backdrop');
    const toggle = document.getElementById('agro-shell-toggle');
    const railToggle = document.getElementById('agro-shell-rail-toggle');
    const railMenu = document.getElementById('agro-shell-rail-menu');
    const mobileHubRoot = document.querySelector('[data-agro-mobile-hub-root]');
    const mobileTabbar = document.querySelector('[data-agro-mobile-tabbar]');
    const mobileContextbar = document.querySelector('[data-agro-mobile-contextbar]');
    const mobileContextTitle = document.querySelector('[data-agro-mobile-context-title]');
    const mobileHubTabs = Array.from(document.querySelectorAll('[data-agro-mobile-tab]'));
    const mobileHubPanels = Array.from(document.querySelectorAll('[data-agro-mobile-panel]'));
    if (!sidebar || !backdrop) return null;

    const launcherClose = sidebar.querySelector('.agro-launcher__close');
    const bootViewToken = AGRO_DEFAULT_VIEW;
    let activeView = normalizeBootView(bootViewToken);
    let activeSubview = normalizeSubview(activeView, resolveViewAlias(bootViewToken)?.subview);
    let sidebarOpen = false;
    let railExpanded = readRailExpanded();
    let ignoreToggleHitClose = false;
    let expandedNavParent = resolveNavParentForView(activeView);
    let activeMobileHub = normalizeMobileHub(document.body?.dataset?.agroMobileHub || AGRO_DEFAULT_MOBILE_HUB);
    let shellDepth = document.body?.dataset?.agroShellDepth === 'module' ? 'module' : 'hub';
    let shellContextTitle = '';

    const topLevelRegions = Array.from(document.querySelectorAll('[data-agro-shell-region]'));
    const isPointerInsideToggle = (event) => {
        if (!toggle || typeof event?.clientX !== 'number' || typeof event?.clientY !== 'number') {
            return false;
        }

        const rect = toggle.getBoundingClientRect();
        return event.clientX >= rect.left
            && event.clientX <= rect.right
            && event.clientY >= rect.top
            && event.clientY <= rect.bottom;
    };

    const closeSidebar = () => {
        sidebarOpen = false;
        document.body.classList.remove('agro-shell-open');
        toggle?.setAttribute('aria-expanded', 'false');
        sidebar.setAttribute('aria-hidden', 'true');
        sidebar.setAttribute('inert', '');
        backdrop.hidden = true;
        backdrop.setAttribute('aria-hidden', 'true');
    };

    const openSidebar = () => {
        sidebarOpen = true;
        document.body.classList.add('agro-shell-open');
        toggle?.setAttribute('aria-expanded', 'true');
        sidebar.setAttribute('aria-hidden', 'false');
        sidebar.removeAttribute('inert');
        backdrop.hidden = false;
        backdrop.setAttribute('aria-hidden', 'false');
        expandedNavParent = resolveNavParentForView(activeView);
        syncSubnav();
    };

    const syncRailExpanded = () => {
        document.body.classList.toggle('agro-shell-rail-expanded', railExpanded);
        if (!railToggle) return;
        railToggle.setAttribute('aria-pressed', railExpanded ? 'true' : 'false');
        railToggle.setAttribute(
            'aria-label',
            railExpanded ? 'Colapsar navegación rápida Agro' : 'Expandir navegación rápida Agro'
        );
        railToggle.setAttribute('title', railExpanded ? 'Colapsar navegación' : 'Expandir navegación');
    };

    const syncMobileHub = () => {
        document.body.dataset.agroMobileHub = activeMobileHub;

        mobileHubTabs.forEach((tab) => {
            const isActive = normalizeMobileHub(tab.dataset.agroMobileTab) === activeMobileHub;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        mobileHubPanels.forEach((panel) => {
            const isActive = normalizeMobileHub(panel.dataset.agroMobilePanel) === activeMobileHub;
            setElementHiddenInert(panel, !isActive);
        });
    };

    const setMobileHub = (nextHub, options = {}) => {
        activeMobileHub = normalizeMobileHub(nextHub);
        syncMobileHub();

        if (options.focus === true) {
            focusTarget(`[data-agro-mobile-panel="${activeMobileHub}"]`, { scroll: true });
        }
    };

    const syncShellDepth = () => {
        document.body.dataset.agroShellDepth = shellDepth;
        setElementHiddenInert(mobileHubRoot, shellDepth !== 'hub');
        setElementHiddenInert(mobileTabbar, shellDepth !== 'hub');
        setElementHiddenInert(mobileContextbar, shellDepth !== 'module');

        if (mobileContextTitle) {
            mobileContextTitle.textContent = shellContextTitle || 'Módulo';
        }
    };

    const setShellDepth = (nextDepth, options = {}) => {
        shellDepth = nextDepth === 'module' ? 'module' : 'hub';
        if (typeof options.title === 'string' && options.title.trim()) {
            shellContextTitle = options.title.trim();
        }
        syncShellDepth();

        if (options.focus === true && shellDepth === 'hub') {
            focusTarget(`[data-agro-mobile-panel="${activeMobileHub}"]`, { scroll: true });
        }
    };

    const resolveSourceHub = (node, fallbackView = '') => {
        const panel = node?.closest?.('[data-agro-mobile-panel]');
        if (panel) return normalizeMobileHub(panel.dataset.agroMobilePanel);
        return normalizeMobileHub(VIEW_TO_MOBILE_HUB[fallbackView] || activeMobileHub);
    };

    const syncSubnav = () => {
        document.querySelectorAll('.agro-shell-subnav').forEach((nav) => {
            const parent = nav.closest('[data-agro-nav-parent]');
            const parentView = normalizeViewToken(parent?.dataset?.agroNavParent || '');
            const isVisible = parentView === expandedNavParent;
            nav.style.display = isVisible ? 'flex' : 'none';
        });

        document.querySelectorAll('.agro-shell-sublink').forEach((btn) => {
            const rawView = String(btn.dataset.agroView || '').trim();
            if (!rawView) {
                btn.classList.remove('is-active');
                return;
            }
            const btnView = normalizeView(btn.dataset.agroView);
            const hasSubview = String(btn.dataset.agroSubview || '').trim().length > 0;
            const btnSub = hasSubview ? normalizeSubview(btnView, btn.dataset.agroSubview) : '';
            const isActive = btnView === activeView && (!hasSubview || btnSub === activeSubview);
            btn.classList.toggle('is-active', isActive);
        });

        document.querySelectorAll('[data-agro-nav-toggle]').forEach((btn) => {
            const toggleView = normalizeViewToken(btn.dataset.agroNavToggle);
            const isActive = isViewWithinNavParent(activeView, toggleView);
            const isExpanded = expandedNavParent === toggleView;
            btn.classList.toggle('is-active', isActive);
            btn.classList.toggle('is-expanded', isExpanded);
            btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            if (isActive) {
                btn.setAttribute('aria-current', 'page');
            } else {
                btn.removeAttribute('aria-current');
            }
        });

        document.body.dataset.agroSubview = VIEWS_WITH_SUBNAV.has(activeView) ? activeSubview : '';
    };

    const applyShellModeFilter = (nextMode) => {
        const mode = normalizeShellMode(nextMode);
        document.body.dataset.agroShellMode = mode;

        const scopedNodes = Array.from(sidebar.querySelectorAll('[data-agro-mode-scope]'));
        scopedNodes.forEach((node) => {
            const shouldHide = !shellNodeMatchesMode(node, mode);
            setElementHiddenInert(node, shouldHide);
            node.classList.toggle('agro-shell-mode-filtered', shouldHide);
        });

        Array.from(sidebar.querySelectorAll('.agro-shell-nav-item')).forEach((item) => {
            const scopedChildren = Array.from(item.querySelectorAll('[data-agro-mode-scope]'))
                .filter((node) => node !== item);
            const selfIsHidden = item.matches('[data-agro-mode-scope]') && item.hidden;
            const hasVisibleChild = scopedChildren.some((node) => !node.hidden);
            const shouldHide = item.matches('[data-agro-mode-scope]')
                ? (selfIsHidden && !hasVisibleChild)
                : (scopedChildren.length > 0 && !hasVisibleChild);

            setElementHiddenInert(item, shouldHide);
            item.classList.toggle('agro-shell-mode-filtered', shouldHide);
        });

        Array.from(sidebar.querySelectorAll('.agro-shell-sidebar__group')).forEach((group) => {
            const scopedChildren = Array.from(group.querySelectorAll('[data-agro-mode-scope]'));
            const shouldHide = scopedChildren.length > 0 && !scopedChildren.some(scopedNodeIsVisible);
            setElementHiddenInert(group, shouldHide);
            group.classList.toggle('agro-shell-mode-filtered', shouldHide);
        });

        syncSubnav();
    };

    const syncViewButtons = () => {
        const config = VIEW_CONFIG[activeView] || VIEW_CONFIG[AGRO_DEFAULT_VIEW];
        document.body.dataset.agroActiveView = activeView;
        document.body.classList.toggle('agro-view-dense', config?.dense === true);

        document.querySelectorAll('[data-agro-view]').forEach((button) => {
            if (button.classList.contains('agro-shell-sublink')) return;
            const buttonView = normalizeView(button.dataset.agroView);
            const buttonSubview = String(button.dataset.agroSubview || '').trim();
            const isActive = buttonView === activeView
                && (!buttonSubview || normalizeSubview(buttonView, buttonSubview) === activeSubview);
            button.classList.toggle('is-active', isActive);
            if (isActive) {
                button.setAttribute('aria-current', 'page');
            } else {
                button.removeAttribute('aria-current');
            }
        });

        syncSubnav();
    };

    const FULLSCREEN_REGIONS = new Set(['asistente', 'perfil']);

    const syncRegions = (regionName) => {
        topLevelRegions.forEach((section) => {
            const isVisible = section.dataset.agroShellRegion === regionName;
            section.classList.toggle('is-shell-active', isVisible);
            section.classList.toggle('is-shell-hidden', !isVisible);
            setElementHiddenInert(section, !isVisible);
        });
        const footer = document.getElementById('agro-module-footer');
        if (footer) {
            footer.hidden = FULLSCREEN_REGIONS.has(regionName);
        }
    };

    const applyViewEffects = (view, options = {}) => {
        const config = VIEW_CONFIG[view] || VIEW_CONFIG[AGRO_DEFAULT_VIEW];
        const tabName = typeof config.resolveTab === 'function'
            ? config.resolveTab()
            : config.tab;

        if (options.syncTab !== false && tabName && typeof window.switchTab === 'function') {
            window.switchTab(tabName, { focus: false });
        }

        if (view === 'herramientas') {
            updateAccordionState('yg-acc-tools', true);
        } else {
            updateAccordionState('yg-acc-tools', false);
        }

        if (view === 'agrorepo') {
            updateAccordionState('yg-acc-agrorepo', true);
            if (typeof window.ensureAgroRepoReady === 'function') {
                window.ensureAgroRepoReady();
            }
        } else {
            updateAccordionState('yg-acc-agrorepo', false);
        }

        syncCultivosSubview(view, activeSubview);

        const focusSelector = view === 'ciclos'
            ? resolveCycleFocusSelector(activeSubview)
            : view === 'period-cycles'
                ? resolvePeriodCycleFocusSelector(activeSubview)
                : (config.focusSelector || `[data-agro-shell-region="${config.region}"]`);
        focusTarget(focusSelector, options);

        if (view === 'perfil' && typeof window.syncPerfilViewFromProfile === 'function') {
            window.syncPerfilViewFromProfile();
        }

        if (view === 'asistente' && typeof window.openAgroAssistantInline === 'function') {
            window.openAgroAssistantInline();
        }

        if (view === 'ciclos' && activeSubview === 'estadisticas' && typeof window.loadAgroGlobalStats === 'function') {
            window.loadAgroGlobalStats();
        }

        if (view === 'clima' && typeof window.openAgroClima === 'function') {
            window.openAgroClima({ inline: true });
        }
    };

    const setActiveView = (nextView, options = {}) => {
        const view = normalizeView(nextView);
        const aliasSubview = resolveViewAlias(nextView)?.subview || '';
        const config = VIEW_CONFIG[view] || VIEW_CONFIG[AGRO_DEFAULT_VIEW];
        activeView = view;
        activeSubview = normalizeSubview(view, options.subview || aliasSubview);
        expandedNavParent = resolveNavParentForView(view) || expandedNavParent;
        writeStoredView(view);
        syncRegions(config.region);
        syncViewButtons();
        applyViewEffects(view, options);
        if (options.preserveDepth !== true) {
            setMobileHub(options.mobileHub || VIEW_TO_MOBILE_HUB[view] || activeMobileHub);
            setShellDepth('module', { title: options.label || config.label });
        }
        window.dispatchEvent(new CustomEvent('agro:shell:view-changed', {
            detail: {
                view,
                region: config.region,
                label: config.label,
                subview: activeSubview
            }
        }));
    };

    const shellEntries = collectShellEntries(sidebar);
    const activateShellEntry = (entry) => {
        if (!entry) return false;
        if (entry.type === 'action') {
            const didRun = runAction(entry.action, activeView);
            if (didRun) {
                const actionMeta = ACTION_TO_MOBILE_CONTEXT[entry.action] || {};
                setMobileHub(actionMeta.hub || activeMobileHub);
                setShellDepth('module', { title: actionMeta.label || entry.label });
                closeSidebar();
            }
            return didRun;
        }

        if (!entry.view) return false;
        setActiveView(entry.view, {
            scroll: true,
            subview: entry.subview || null,
            label: entry.label,
            mobileHub: VIEW_TO_MOBILE_HUB[entry.view] || activeMobileHub
        });
        closeSidebar();
        return true;
    };

    initAgroShellFavorites({
        root: document.getElementById('agro-shell-favorites'),
        entries: shellEntries,
        onActivate: activateShellEntry
    });

    initAgroShellSearch({
        root: document.getElementById('agro-shell-search'),
        entries: shellEntries,
        onActivate: activateShellEntry
    });

    bindRankingsFinishedCyclePicker();

    toggle?.addEventListener('click', () => {
        if (sidebarOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }

        ignoreToggleHitClose = true;
        window.requestAnimationFrame(() => {
            ignoreToggleHitClose = false;
        });
    });

    railToggle?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        railExpanded = !railExpanded;
        writeRailExpanded(railExpanded);
        syncRailExpanded();
    });

    railMenu?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openSidebar();
    });

    const mobileRailToggle = document.getElementById('agro-shell-rail-mobile-toggle');
    let mobileRailCollapsed = readMobileRailCollapsed();

    const syncMobileRail = () => {
        document.body.classList.toggle('agro-shell-rail-collapsed', mobileRailCollapsed);
        if (!mobileRailToggle) return;
        mobileRailToggle.setAttribute('aria-expanded', mobileRailCollapsed ? 'false' : 'true');
        mobileRailToggle.setAttribute(
            'aria-label',
            mobileRailCollapsed ? 'Mostrar navegación' : 'Ocultar navegación'
        );
        mobileRailToggle.setAttribute(
            'title',
            mobileRailCollapsed ? 'Mostrar navegación' : 'Ocultar navegación'
        );
    };

    syncMobileRail();

    mobileRailToggle?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        mobileRailCollapsed = !mobileRailCollapsed;
        writeMobileRailCollapsed(mobileRailCollapsed);
        syncMobileRail();
    });

    launcherClose?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeSidebar();
    });

    backdrop.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeSidebar();
        }
    });

    document.addEventListener('click', (event) => {
        if (!ignoreToggleHitClose && sidebarOpen && isPointerInsideToggle(event)) {
            event.preventDefault();
            event.stopPropagation();
            closeSidebar();
            return;
        }

        const mobileHubTab = event.target.closest('[data-agro-mobile-tab]');
        if (mobileHubTab) {
            event.preventDefault();
            event.stopPropagation();
            setMobileHub(mobileHubTab.dataset.agroMobileTab, { focus: true });
            setShellDepth('hub');
            closeSidebar();
            return;
        }

        const mobileBackButton = event.target.closest('[data-agro-mobile-back]');
        if (mobileBackButton) {
            event.preventDefault();
            event.stopPropagation();
            setShellDepth('hub', { focus: true });
            closeSidebar();
            return;
        }

        const cropTab = event.target.closest('[data-agro-crop-tab]');
        if (cropTab) {
            const tabId = normalizeViewToken(cropTab.dataset.agroCropTab);
            const wrapper = cropTab.closest('[data-agro-cycle-subview="mis-cultivos"]');
            if (wrapper) {
                wrapper.querySelectorAll('[data-agro-crop-tab]').forEach((btn) => {
                    const isActive = normalizeViewToken(btn.dataset.agroCropTab) === tabId;
                    btn.classList.toggle('is-active', isActive);
                    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
                });
                wrapper.querySelectorAll('[data-agro-crop-tab-content]').forEach((panel) => {
                    const isActive = normalizeViewToken(panel.dataset.agroCropTabContent) === tabId;
                    panel.classList.toggle('is-active', isActive);
                });
            }
            return;
        }

        const mobileFeedbackButton = event.target.closest('[data-agro-mobile-feedback]');
        if (mobileFeedbackButton) {
            event.preventDefault();
            event.stopPropagation();
            setMobileHub('menu');
            setShellDepth('hub');
            closeSidebar();
            window.setTimeout(() => {
                document.querySelector('.agro-feedback-fab')?.click();
            }, 0);
            return;
        }

        const actionButton = event.target.closest('[data-agro-action]');
        if (actionButton) {
            const action = normalizeViewToken(actionButton.dataset.agroAction);
            const didRun = runAction(action, activeView);
            if (didRun) {
                const actionMeta = ACTION_TO_MOBILE_CONTEXT[action] || {};
                const label = readInteractiveLabel(actionButton) || actionMeta.label;
                const sourceHub = actionButton.closest('[data-agro-mobile-panel]')
                    ? resolveSourceHub(actionButton, activeView)
                    : (actionMeta.hub || resolveSourceHub(actionButton, activeView));
                setMobileHub(sourceHub);
                setShellDepth('module', { title: label });
                closeSidebar();
            }
        }

        const navToggle = event.target.closest('[data-agro-nav-toggle]');
        if (navToggle) {
            const toggleTarget = normalizeViewToken(navToggle.dataset.agroNavToggle);
            expandedNavParent = expandedNavParent === toggleTarget ? null : toggleTarget;
            syncSubnav();
            return;
        }

        const viewButton = event.target.closest('[data-agro-view]');
        if (!viewButton) return;
        const nextView = normalizeView(viewButton.dataset.agroView);
        const subviewAttr = viewButton.dataset.agroSubview || null;
        setActiveView(nextView, {
            scroll: true,
            subview: subviewAttr,
            label: readInteractiveLabel(viewButton),
            mobileHub: resolveSourceHub(viewButton, nextView)
        });
        closeSidebar();
    });

    window.addEventListener('agro:finance-tab:changed', (event) => {
        const tabName = normalizeViewToken(event.detail?.tabName);
        const nextView = mapTabToView(tabName);
        const nextSubview = nextView === 'carrito' ? 'summary' : activeSubview;
        setActiveView(nextView, { scroll: false, syncTab: false, subview: nextSubview });
    });

    window.addEventListener('agro:shell:set-view', (event) => {
        const nextView = event.detail?.view;
        setActiveView(nextView, {
            scroll: event.detail?.scroll !== false,
            subview: event.detail?.subview
        });
    });

    window.addEventListener('agro:modechange', (event) => {
        applyShellModeFilter(event.detail?.shellMode || event.detail?.mode);
    });

    sidebar.setAttribute('inert', '');
    applyShellModeFilter(document.body?.dataset?.agroShellMode || document.body?.dataset?.agroMode || AGRO_DEFAULT_SHELL_MODE);
    closeSidebar();
    syncRailExpanded();
    syncMobileHub();
    setActiveView(activeView, { scroll: false, syncTab: true, subview: activeSubview, preserveDepth: true });
    setShellDepth('hub');
    document.body.classList.add('agro-shell-ready');
    const splash = document.getElementById('agro-splash');
    if (splash) {
        splash.addEventListener('transitionend', () => splash.remove(), { once: true });
        setTimeout(() => splash.remove(), 800);
    }

    return {
        getActiveView: () => activeView,
        setActiveView,
        closeSidebar,
        openSidebar
    };
}
