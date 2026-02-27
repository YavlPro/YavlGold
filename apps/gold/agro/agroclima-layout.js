const WEEKLY_TOGGLE_ID = 'btn-toggle-weekly-forecast';
const WEEKLY_HOST_ID = 'clima-weekly-host';
const WEEKLY_ROOT_ID = 'yg-acc-weekly';

const state = {
    initialized: false,
    isOpen: false
};

function getNodes() {
    const toggle = document.getElementById(WEEKLY_TOGGLE_ID);
    const host = document.getElementById(WEEKLY_HOST_ID);
    const weeklyRoot = document.getElementById(WEEKLY_ROOT_ID);
    return { toggle, host, weeklyRoot };
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
    if (state.initialized) return;

    const nodes = getNodes();
    if (!nodes.toggle || !nodes.host || !nodes.weeklyRoot) {
        console.warn('[AGRO_CLIMA_LAYOUT] Missing clima weekly nodes; embed not initialized.');
        return;
    }

    moveWeeklyIntoHost(nodes);
    setOpen(false, nodes);
    bindEvents(nodes);
    state.initialized = true;
}
