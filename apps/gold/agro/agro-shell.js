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

const VIEW_ALIASES = Object.freeze({
    cultivos: Object.freeze({ view: 'ciclos', subview: 'activos' }),
    'historial-comercial': Object.freeze({ view: 'cartera-viva', subview: '' }),
    'operational-active': Object.freeze({ view: 'operational', subview: 'active' }),
    'operational-finished': Object.freeze({ view: 'operational', subview: 'finished' }),
    'operational-export': Object.freeze({ view: 'operational', subview: 'export' })
});

const NAV_PARENT_GROUPS = Object.freeze({
    'historial-comercial': Object.freeze({
        views: Object.freeze(['cartera-viva', 'operational']),
        defaultView: 'cartera-viva'
    })
});

const VIEW_SUBNAV_CONFIG = Object.freeze({
    ciclos: Object.freeze({ defaultSubview: 'finalizados', allowed: ['activos', 'finalizados', 'comparar', 'estadisticas'] }),
    operational: Object.freeze({ defaultSubview: 'active', allowed: ['active', 'finished', 'export'] }),
    pagados: Object.freeze({ defaultSubview: 'historial', allowed: ['historial', 'stats'] }),
    fiados: Object.freeze({ defaultSubview: 'historial', allowed: ['historial', 'stats'] }),
    perdidas: Object.freeze({ defaultSubview: 'historial', allowed: ['historial', 'stats'] }),
    donaciones: Object.freeze({ defaultSubview: 'historial', allowed: ['historial', 'stats'] }),
    otros: Object.freeze({ defaultSubview: 'historial', allowed: ['historial', 'stats'] })
});

const VIEWS_WITH_SUBNAV = new Set(Object.keys(VIEW_SUBNAV_CONFIG));

const VIEW_CONFIG = Object.freeze({
    perfil: { region: 'perfil', label: 'Mi Perfil', focusSelector: '[data-agro-shell-region="perfil"]' },
    dashboard: { region: 'dashboard', label: 'Dashboard Agro', focusSelector: '[data-agro-shell-region="dashboard"]' },
    ciclos: { region: 'cultivos', label: 'Ciclos de cultivos', focusSelector: '#agro-cycles-finished-view' },
    operational: { region: 'operational', label: 'Ciclos Operativos', focusSelector: '#agro-operational-root' },
    operaciones: { region: 'ops', label: 'Operaciones', resolveTab: resolveOperationsTab, dense: true },
    pagados: { region: 'ops', label: 'Pagados', tab: 'ingresos', focusSelector: '#agro-pagados-dedicated', dense: true },
    fiados: { region: 'ops', label: 'Fiados', tab: 'pendientes', focusSelector: '#agro-fiados-dedicated', dense: true },
    perdidas: { region: 'ops', label: 'Perdidas', tab: 'perdidas', focusSelector: '#agro-perdidas-dedicated', dense: true },
    donaciones: { region: 'ops', label: 'Donaciones', tab: 'transferencias', focusSelector: '#agro-donaciones-dedicated', dense: true },
    otros: { region: 'ops', label: 'Otros', tab: 'otros', focusSelector: '#agro-otros-dedicated', dense: true },
    carrito: { region: 'ops', label: 'Carrito', tab: 'carrito', focusSelector: '#agro-carrito-dedicated', dense: true },
    rankings: { region: 'ops', label: 'Rankings', tab: 'rankings', focusSelector: '#agro-rankings-dedicated', dense: true },
    'cartera-viva': { region: 'cartera-viva', label: 'Cartera Viva', focusSelector: '#agro-cartera-viva-root' },
    clima: { region: 'clima', label: 'Clima Agro', focusSelector: '[data-agro-shell-region="clima"]' },
    agenda: { region: 'agenda', label: 'Agenda', focusSelector: '[data-agro-shell-region="agenda"]' },
    herramientas: { region: 'herramientas', label: 'Herramientas', focusSelector: '#agro-tools-section' },
    agrorepo: { region: 'agrorepo', label: 'Bitacora', focusSelector: '#agro-repo-section', dense: true },
    asistente: { region: 'asistente', label: 'Asistente IA', focusSelector: '[data-agro-shell-region="asistente"]' }
});

function resolveOperationsTab() {
    const currentTab = String(document.querySelector('.financial-tab-btn.is-active')?.dataset?.tab || '').trim();
    if (CORE_OPERATIONS_TABS.has(currentTab)) return currentTab;
    return 'gastos';
}

function normalizeViewToken(value) {
    return String(value || '').trim().toLowerCase();
}

function resolveViewAlias(value) {
    const token = normalizeViewToken(value);
    return VIEW_ALIASES[token] || null;
}

function normalizeView(value) {
    const token = normalizeViewToken(value);
    if (VIEW_ALIASES[token]) {
        return VIEW_ALIASES[token].view;
    }
    return Object.prototype.hasOwnProperty.call(VIEW_CONFIG, token) ? token : AGRO_DEFAULT_VIEW;
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

function readStoredViewToken() {
    try {
        return String(localStorage.getItem(AGRO_ACTIVE_VIEW_KEY) || '').trim();
    } catch (_err) {
        return '';
    }
}

function readStoredView() {
    return normalizeView(readStoredViewToken());
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

const CYCLE_SUBVIEW_META = Object.freeze({
    activos: Object.freeze({
        title: 'Ciclos activos',
        copy: 'Operacion y seguimiento de ciclos en curso',
        focusSelector: '#cyclesContainer'
    }),
    finalizados: Object.freeze({
        title: 'Ciclos finalizados',
        copy: 'Historial de cierres, perdidas y auditoria de ciclos',
        focusSelector: '#agro-cycles-finished-view'
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

function resolveCycleSubviewMeta(subview) {
    const token = normalizeSubview('ciclos', subview);
    return CYCLE_SUBVIEW_META[token] || CYCLE_SUBVIEW_META.finalizados;
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

    updateAccordionState('crops-cycle-history-accordion', isCyclesView && subview === 'finalizados');
    syncCycleStatsPanel(isCyclesView ? subview : '');
}

function resolveCycleFocusSelector(subview) {
    return resolveCycleSubviewMeta(subview).focusSelector || '[data-agro-shell-region="cultivos"]';
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
                if (activeView === 'cartera-viva' && typeof window.openCarteraVivaRecordContext === 'function') {
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

    const storedViewToken = readStoredViewToken();
    let activeView = normalizeView(storedViewToken);
    let activeSubview = normalizeSubview(activeView, resolveViewAlias(storedViewToken)?.subview);
    let sidebarOpen = false;
    let ignoreToggleHitClose = false;
    let expandedNavParent = resolveNavParentForView(activeView);

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
        expandedNavParent = resolveNavParentForView(activeView);
        syncSubnav();
    };

    const syncSubnav = () => {
        document.querySelectorAll('.agro-shell-subnav').forEach((nav) => {
            const parent = nav.closest('[data-agro-nav-parent]');
            const parentView = normalizeViewToken(parent?.dataset?.agroNavParent || '');
            const isVisible = parentView === expandedNavParent;
            nav.style.display = isVisible ? 'flex' : 'none';
        });

        document.querySelectorAll('.agro-shell-sublink').forEach((btn) => {
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

        if (view === 'agenda' && typeof window.openAgroAgenda === 'function') {
            window.openAgroAgenda({ inline: true });
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
        window.dispatchEvent(new CustomEvent('agro:shell:view-changed', {
            detail: {
                view,
                region: config.region,
                label: config.label,
                subview: activeSubview
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
        setActiveView(nextView, { scroll: true, subview: subviewAttr });
        closeSidebar();
    });

    window.addEventListener('agro:finance-tab:changed', (event) => {
        const nextView = mapTabToView(event.detail?.tabName);
        setActiveView(nextView, { scroll: false, syncTab: false, subview: activeSubview });
    });

    window.addEventListener('agro:shell:set-view', (event) => {
        const nextView = event.detail?.view;
        setActiveView(nextView, {
            scroll: event.detail?.scroll !== false,
            subview: event.detail?.subview
        });
    });

    sidebar.setAttribute('inert', '');
    closeSidebar();
    setActiveView(activeView, { scroll: false, syncTab: true, subview: activeSubview });
    document.body.classList.add('agro-shell-ready');

    return {
        getActiveView: () => activeView,
        setActiveView,
        closeSidebar,
        openSidebar
    };
}
