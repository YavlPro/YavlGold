const AGRO_ACTIVE_VIEW_KEY = 'YG_AGRO_ACTIVE_VIEW_V1';
const AGRO_DEFAULT_VIEW = 'dashboard';

const TAB_TO_VIEW = Object.freeze({
    gastos: 'operaciones',
    ingresos: 'pagados',
    pendientes: 'fiados',
    perdidas: 'perdidas',
    transferencias: 'donaciones',
    otros: 'otros',
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

const VIEW_CONFIG = Object.freeze({
    dashboard: { region: 'dashboard', label: 'Dashboard Agro', focusSelector: '[data-agro-shell-region="dashboard"]' },
    cultivos: { region: 'cultivos', label: 'Cultivos activos', focusSelector: '[data-agro-shell-region="cultivos"]' },
    ciclos: { region: 'cultivos', label: 'Historial de ciclos', focusSelector: '#crops-cycle-history-accordion' },
    operaciones: { region: 'ops', label: 'Centro de operaciones', resolveTab: resolveOperationsTab, dense: true },
    pagados: { region: 'ops', label: 'Pagados', tab: 'ingresos', focusSelector: '#agro-pagados-dedicated', dense: true },
    fiados: { region: 'ops', label: 'Fiados', tab: 'pendientes', dense: true },
    perdidas: { region: 'ops', label: 'Perdidas', tab: 'perdidas', dense: true },
    donaciones: { region: 'ops', label: 'Donaciones', tab: 'transferencias', dense: true },
    otros: { region: 'ops', label: 'Otros', tab: 'otros', dense: true },
    carrito: { region: 'ops', label: 'Carrito', tab: 'carrito', dense: true },
    rankings: { region: 'ops', label: 'Rankings', tab: 'rankings', dense: true },
    clima: { region: 'dashboard', label: 'Clima', focusSelector: '[data-widget="weather"]' },
    agenda: { region: 'dashboard', label: 'Agenda', focusSelector: '[data-widget="lunar"]' },
    herramientas: { region: 'herramientas', label: 'Herramientas', focusSelector: '#agro-tools-section' },
    agrorepo: { region: 'agrorepo', label: 'Bitacora', focusSelector: '#agro-repo-section', dense: true }
});

function resolveOperationsTab() {
    const currentTab = String(document.querySelector('.financial-tab-btn.is-active')?.dataset?.tab || '').trim();
    if (CORE_OPERATIONS_TABS.has(currentTab)) return currentTab;
    return 'gastos';
}

function normalizeView(value) {
    const token = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(VIEW_CONFIG, token) ? token : AGRO_DEFAULT_VIEW;
}

function readStoredView() {
    try {
        return normalizeView(localStorage.getItem(AGRO_ACTIVE_VIEW_KEY));
    } catch (_err) {
        return AGRO_DEFAULT_VIEW;
    }
}

function writeStoredView(view) {
    try {
        localStorage.setItem(AGRO_ACTIVE_VIEW_KEY, normalizeView(view));
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

function syncCultivosSubview(view) {
    const isHistoryView = view === 'ciclos';
    const title = document.getElementById('crops-section-title');
    const subtitle = document.getElementById('crops-section-subtitle');

    if (title) {
        title.textContent = isHistoryView
            ? (title.dataset.historyLabel || 'Historial de ciclos')
            : (title.dataset.activeLabel || 'Cultivos activos');
    }

    if (subtitle) {
        subtitle.textContent = isHistoryView
            ? (subtitle.dataset.historyCopy || 'Finalizados, perdidos y auditoria de ciclos cerrados')
            : (subtitle.dataset.activeCopy || 'Gestion de ciclos en produccion');
    }

    updateAccordionState('crops-cycle-history-accordion', isHistoryView);
}

function clickIfExists(selector) {
    const node = document.querySelector(selector);
    if (!node) return false;
    node.click();
    return true;
}

function runAction(action) {
    const token = String(action || '').trim().toLowerCase();
    switch (token) {
        case 'new-crop':
            if (typeof window.openCropModal === 'function') {
                window.openCropModal();
                return true;
            }
            return clickIfExists('#btn-new-crop');
        case 'new-record':
            if (typeof window.launchAgroWizard === 'function') {
                window.launchAgroWizard('gastos');
                return true;
            }
            return false;
        case 'assistant':
            return clickIfExists('#btn-open-agro-assistant');
        case 'social':
            return clickIfExists('#btn-open-agro-social');
        case 'calculator':
            return clickIfExists('#btn-open-agro-calculator');
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
    if (!sidebar || !backdrop || !toggle) return null;

    let activeView = readStoredView();
    let sidebarOpen = false;
    let ignoreToggleHitClose = false;

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
        toggle.setAttribute('aria-expanded', 'false');
        sidebar.setAttribute('aria-hidden', 'true');
        sidebar.setAttribute('inert', '');
        backdrop.hidden = true;
        backdrop.setAttribute('aria-hidden', 'true');
    };

    const openSidebar = () => {
        sidebarOpen = true;
        document.body.classList.add('agro-shell-open');
        toggle.setAttribute('aria-expanded', 'true');
        sidebar.setAttribute('aria-hidden', 'false');
        sidebar.removeAttribute('inert');
        backdrop.hidden = false;
        backdrop.setAttribute('aria-hidden', 'false');
    };

    const syncViewButtons = () => {
        const config = VIEW_CONFIG[activeView] || VIEW_CONFIG[AGRO_DEFAULT_VIEW];
        document.body.dataset.agroActiveView = activeView;
        document.body.classList.toggle('agro-view-dense', config?.dense === true);

        document.querySelectorAll('[data-agro-view]').forEach((button) => {
            const isActive = normalizeView(button.dataset.agroView) === activeView;
            button.classList.toggle('is-active', isActive);
            if (isActive) {
                button.setAttribute('aria-current', 'page');
            } else {
                button.removeAttribute('aria-current');
            }
        });
    };

    const syncRegions = (regionName) => {
        topLevelRegions.forEach((section) => {
            const isVisible = section.dataset.agroShellRegion === regionName;
            section.classList.toggle('is-shell-active', isVisible);
            section.classList.toggle('is-shell-hidden', !isVisible);
            setElementHiddenInert(section, !isVisible);
        });
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
        } else {
            updateAccordionState('yg-acc-agrorepo', false);
        }

        syncCultivosSubview(view);

        const focusSelector = config.focusSelector || `[data-agro-shell-region="${config.region}"]`;
        focusTarget(focusSelector, options);

        if (view === 'agenda' && typeof window.openAgroAgenda === 'function') {
            window.openAgroAgenda();
        }
    };

    const setActiveView = (nextView, options = {}) => {
        const view = normalizeView(nextView);
        const config = VIEW_CONFIG[view] || VIEW_CONFIG[AGRO_DEFAULT_VIEW];
        activeView = view;
        writeStoredView(view);
        syncRegions(config.region);
        syncViewButtons();
        applyViewEffects(view, options);
        window.dispatchEvent(new CustomEvent('agro:shell:view-changed', {
            detail: {
                view,
                region: config.region,
                label: config.label
            }
        }));
    };

    toggle.addEventListener('click', () => {
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

        const actionButton = event.target.closest('[data-agro-action]');
        if (actionButton) {
            const didRun = runAction(actionButton.dataset.agroAction);
            if (didRun) {
                closeSidebar();
            }
        }

        const viewButton = event.target.closest('[data-agro-view]');
        if (!viewButton) return;
        const nextView = normalizeView(viewButton.dataset.agroView);
        setActiveView(nextView, { scroll: true });
        closeSidebar();
    });

    window.addEventListener('agro:finance-tab:changed', (event) => {
        const nextView = mapTabToView(event.detail?.tabName);
        setActiveView(nextView, { scroll: false, syncTab: false });
    });

    window.addEventListener('agro:shell:set-view', (event) => {
        const nextView = normalizeView(event.detail?.view);
        setActiveView(nextView, { scroll: event.detail?.scroll !== false });
    });

    sidebar.setAttribute('inert', '');
    closeSidebar();
    setActiveView(activeView, { scroll: false, syncTab: true });

    return {
        getActiveView: () => activeView,
        setActiveView,
        closeSidebar,
        openSidebar
    };
}
