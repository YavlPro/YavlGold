/* ==========================================================================
   YAVLGOLD AGRO - MOVIMIENTOS GENERALES DE FINCA (VANILLA JS ES6 MODULE)
   ==========================================================================
   Post-procesa las filas renderizadas por agro.js en el Facturero de la Finca
   para inyectar badges de finca en movimientos con farm_id.

   NO modifica agro.js. Trabaja observando el DOM y haciendo queries
   complementarias a Supabase.
   ========================================================================== */

import { supabase } from '../assets/js/config/supabase-config.js';

// ---------------------------------------------------------------------------
// Constants — mirrors FACTURERO_CONFIG list/container IDs from agro.js
// ---------------------------------------------------------------------------
const LIST_ID_MAP = {
    gastos: 'expenses-list',
    ingresos: 'income-list',
    pendientes: 'pending-history-list',
    perdidas: 'loss-history-list',
    transferencias: 'transfer-history-list'
};

const TABLE_MAP = {
    gastos: 'agro_expenses',
    ingresos: 'agro_income',
    pendientes: 'agro_pending',
    perdidas: 'agro_losses',
    transferencias: 'agro_transfers'
};

/** Events dispatched by agro.js after refreshing each tab */
const TAB_EVENTS = {
    pendientes: 'agro:pending:refreshed',
    perdidas: 'agro:losses:refreshed',
    transferencias: 'agro:transfers:refreshed',
    otros: 'agro:others:refreshed'
};

const CACHE_TTL_MS = 5000;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
let userId = null;
const farmIdCache = new Map(); // key: `${tab}:${rowId}` → farmId string
const farmIdCacheTimestamp = new Map(); // key: tab → last fetch timestamp

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getFarms() {
    return (typeof window._agroFarms?.getFarms === 'function')
        ? window._agroFarms.getFarms()
        : [];
}

function resolveFarmName(farmId) {
    if (!farmId) return null;
    const farms = getFarms();
    const farm = farms.find(f => f.id === farmId || f.id === String(farmId));
    return farm ? (farm.name || 'Finca') : null;
}

// ---------------------------------------------------------------------------
// Supabase queries — fetch movement ids that have farm_id set
// ---------------------------------------------------------------------------
async function fetchRowsWithFarmId(tabName) {
    const table = TABLE_MAP[tabName];
    if (!table) return new Map();

    try {
        const { data, error } = await supabase
            .from(table)
            .select('id, farm_id')
            .eq('user_id', userId)
            .not('farm_id', 'is', null);

        if (error) {
            // Graceful: column may not exist yet (pre-migration)
            if (error.message && error.message.includes('farm_id')) return new Map();
            console.warn(`[FarmMovements] Query error (${tabName}):`, error.message);
            return new Map();
        }

        const map = new Map();
        (data || []).forEach(r => {
            map.set(String(r.id), String(r.farm_id));
            farmIdCache.set(`${tabName}:${r.id}`, String(r.farm_id));
        });
        farmIdCacheTimestamp.set(tabName, Date.now());
        return map;
    } catch (err) {
        console.warn('[FarmMovements] fetchRowsWithFarmId exception:', err.message);
        return new Map();
    }
}

function isCacheFresh(tabName) {
    const ts = farmIdCacheTimestamp.get(tabName);
    return ts && (Date.now() - ts) < CACHE_TTL_MS;
}

// ---------------------------------------------------------------------------
// Badge injection
// ---------------------------------------------------------------------------
function injectFarmBadge(rowEl, farmName) {
    // Avoid duplicate badges
    if (rowEl.querySelector('.tx-farm-badge')) return;

    const cropSpan = rowEl.querySelector('.tx-crop');
    if (!cropSpan) return;

    const badge = document.createElement('span');
    badge.className = 'tx-farm-badge badge-farm';
    badge.textContent = `🏠 Finca: ${farmName}`;
    badge.title = 'Movimiento general de finca';

    cropSpan.insertAdjacentElement('afterend', badge);
}

// ---------------------------------------------------------------------------
// DOM enrichment — runs after agro.js renders each tab
// ---------------------------------------------------------------------------
async function enrichRenderedRows(tabName) {
    const listId = LIST_ID_MAP[tabName];
    if (!listId) return;

    const container = document.getElementById(listId);
    if (!container) return;

    // Fetch fresh farm_id data (or use cache)
    let farmMap;
    if (isCacheFresh(tabName)) {
        // Rebuild map from cache entries for this tab
        farmMap = new Map();
        farmIdCache.forEach((farmId, key) => {
            if (key.startsWith(`${tabName}:`)) {
                const rowId = key.slice(tabName.length + 1);
                farmMap.set(rowId, farmId);
            }
        });
    } else {
        farmMap = await fetchRowsWithFarmId(tabName);
    }

    if (!farmMap || farmMap.size === 0) return;

    // Find rendered rows and inject badges
    const rows = container.querySelectorAll('.facturero-item[data-id]');
    rows.forEach(row => {
        const rowId = row.dataset.id;
        if (!rowId) return;

        const farmId = farmMap.get(rowId);
        if (!farmId) return;

        const farmName = resolveFarmName(farmId);
        if (farmName) {
            injectFarmBadge(row, farmName);
        }
    });
}

// ---------------------------------------------------------------------------
// Event-driven enrichment
// ---------------------------------------------------------------------------
function setupEventListeners() {
    // Tabs that dispatch custom events after refresh
    Object.entries(TAB_EVENTS).forEach(([tab, eventName]) => {
        document.addEventListener(eventName, () => {
            // Small delay to ensure agro.js has finished rendering
            setTimeout(() => enrichRenderedRows(tab), 100);
        });
    });
}

// ---------------------------------------------------------------------------
// MutationObserver — for tabs without custom events (gastos, ingresos)
// ---------------------------------------------------------------------------
const observers = [];

function setupMutationObservers() {
    ['gastos', 'ingresos'].forEach(tabName => {
        const listId = LIST_ID_MAP[tabName];
        if (!listId) return;

        const container = document.getElementById(listId);
        if (!container) return;

        let debounceTimer = null;
        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => enrichRenderedRows(tabName), 300);
        });

        observer.observe(container, { childList: true, subtree: true });
        observers.push(observer);
    });
}

// ---------------------------------------------------------------------------
// Global refresh trigger — called after wizard saves
// ---------------------------------------------------------------------------
function refreshAllFarmBadges() {
    Object.keys(LIST_ID_MAP).forEach(tabName => {
        // Invalidate cache
        farmIdCacheTimestamp.delete(tabName);
        setTimeout(() => enrichRenderedRows(tabName), 150);
    });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function initFarmMovements(options = {}) {
    userId = options.initialUserId || null;

    // If userId not provided, try to get it from Supabase session
    if (!userId) {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                userId = data.user.id;
                setupEventListeners();
                setupMutationObservers();
                // Initial enrichment pass
                refreshAllFarmBadges();
            }
        }).catch(err => {
            console.warn('[FarmMovements] Init error:', err.message);
        });
    } else {
        setupEventListeners();
        setupMutationObservers();
        // Initial enrichment pass
        refreshAllFarmBadges();
    }

    console.info('[FarmMovements] Module initialized');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export { initFarmMovements, enrichRenderedRows, refreshAllFarmBadges };

// Global exposure for cross-module access
if (typeof window !== 'undefined') {
    window._agroFarmMovements = {
        initFarmMovements,
        enrichRenderedRows,
        refreshAllFarmBadges
    };
}
