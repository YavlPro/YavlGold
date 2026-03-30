const WEEKLY_TOGGLE_ID = 'btn-toggle-weekly-forecast';
const WEEKLY_HOST_ID = 'clima-weekly-host';
const WEEKLY_ROOT_ID = 'yg-acc-weekly';
const WEATHER_CARD_SELECTOR = '.agro-dash-card[data-widget="weather"]';

const state = {
    initialized: false,
    isOpen: false
};

function isClimaViewActive() {
    const activeView = String(document.body?.dataset?.agroActiveView || '').trim().toLowerCase();
    if (activeView === 'clima') return true;
    const climaRegion = document.querySelector('[data-agro-shell-region="clima"]');
    return !!(climaRegion && !climaRegion.hasAttribute('hidden') && !climaRegion.hasAttribute('inert'));
}

function getNodes() {
    const toggle = document.getElementById(WEEKLY_TOGGLE_ID);
    const host = document.getElementById(WEEKLY_HOST_ID);
    const weeklyRoot = document.getElementById(WEEKLY_ROOT_ID);
    const weatherCard = document.querySelector(WEATHER_CARD_SELECTOR);
    const weatherFooter = weatherCard?.querySelector('.agro-dash-card__footer') || null;
    return { toggle, host, weeklyRoot, weatherCard, weatherFooter };
}

function anchorNodesToWeatherKpi(nodes) {
    if (!nodes.weatherCard || !nodes.toggle || !nodes.host) return;

    // Keep toggle action inside weather KPI footer.
    if (nodes.weatherFooter && nodes.toggle.parentElement !== nodes.weatherFooter) {
        nodes.weatherFooter.appendChild(nodes.toggle);
    }

    // Keep weekly host as part of the weather KPI card.
    if (nodes.host.parentElement !== nodes.weatherCard) {
        nodes.weatherCard.appendChild(nodes.host);
    }
}

function setOpen(nextOpen, nodes) {
    const open = !!nextOpen;
    state.isOpen = open;

    nodes.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    nodes.toggle.textContent = open ? '📅 Ocultar pronóstico' : '📅 Ver pronóstico';

    nodes.host.hidden = !open;
    nodes.host.classList.toggle('is-open', open);
    nodes.host.classList.toggle('is-collapsed', !open);

    if (open) {
        requestAnimationFrame(() => {
            if (typeof nodes.host.scrollIntoView === 'function') {
                nodes.host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }
}

function moveWeeklyIntoHost(nodes) {
    if (!nodes.host || !nodes.weeklyRoot) return;
    if (nodes.weeklyRoot.parentElement !== nodes.host) {
        nodes.host.appendChild(nodes.weeklyRoot);
    }
    nodes.weeklyRoot.open = true;
}

function bindEvents(nodes) {
    nodes.toggle.addEventListener('click', (event) => {
        event.preventDefault();
        setOpen(!state.isOpen, nodes);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!state.isOpen) return;
        setOpen(false, nodes);
    });
}

export function initClimaWeeklyEmbed() {
    const nodes = getNodes();
    const hasWeeklyNode = !!(nodes.toggle || nodes.host || nodes.weeklyRoot);
    const climaViewActive = isClimaViewActive();

    if (!hasWeeklyNode) {
        return;
    }

    if (!climaViewActive && (!nodes.toggle || !nodes.host || !nodes.weeklyRoot)) {
        return;
    }

    if (!nodes.toggle || !nodes.host || !nodes.weeklyRoot) {
        console.warn('[AGRO_CLIMA_LAYOUT] Missing clima weekly nodes; embed not initialized.');
        return;
    }

    anchorNodesToWeatherKpi(nodes);
    moveWeeklyIntoHost(nodes);

    if (!state.initialized) {
        setOpen(false, nodes);
        bindEvents(nodes);
        state.initialized = true;
        return;
    }

    // If init runs again, re-apply current UI state after re-anchoring.
    setOpen(state.isOpen, nodes);
}
