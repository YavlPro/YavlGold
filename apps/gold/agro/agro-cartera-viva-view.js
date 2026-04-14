import { supabase } from '../assets/js/config/supabase-config.js';
import { getExchangeStatus, initExchangeRates } from './agro-exchange.js';
import {
    buildBuyerPortfolioScopeKey,
    fetchBuyerPortfolioCropScopeKeys,
    fetchBuyerPortfolioSummary,
    normalizeBuyerGroupKey,
    normalizeBuyerPortfolioSummaryRow,
    normalizeHistorySearchToken
} from './agro-cartera-viva.js';
import { downloadBuyerPortfolioExport } from './agro-cartera-viva-export.js';
import {
    fetchBuyerHistoryTimeline,
    getVisibleBuyerHistoryRows,
    renderBuyerHistoryDetail
} from './agro-cartera-viva-detail.js';
import {
    openBuyerProfileById,
    openNewBuyerProfile
} from './agrocompradores.js';

const CARTERA_VIVA_VIEW = 'cartera-viva';
const CARTERA_VIVA_ROOT_ID = 'agro-cartera-viva-root';
const CARTERA_VIVA_CATEGORY_KEY = 'YG_AGRO_CARTERA_VIVA_CATEGORY_V1';
const CARTERA_VIVA_SEARCH_KEY = 'YG_AGRO_CARTERA_VIVA_SEARCH_V1';
const CARTERA_VIVA_UNIT_FAMILY_KEY = 'YG_AGRO_CARTERA_VIVA_UNIT_FAMILY_V1';
const CARTERA_VIVA_GENERAL_CROP_ID = '__general__';

const CATEGORY_META = Object.freeze({
    'sin-registro': Object.freeze({
        label: 'Sin registro',
        emptyTitle: 'No hay clientes sin registro',
        emptyCopy: 'Aquí aparecen los clientes canónicos creados que todavía no tienen historial.'
    }),
    fiados: Object.freeze({
        label: 'Fiados',
        emptyTitle: 'No hay fiados activos',
        emptyCopy: 'Aquí ves a quienes todavía tienen saldo pendiente.'
    }),
    pagados: Object.freeze({
        label: 'Pagados',
        emptyTitle: 'No hay clientes al día',
        emptyCopy: 'Aquí aparecen los clientes que ya cerraron su saldo.'
    }),
    perdidos: Object.freeze({
        label: 'Pérdidas',
        emptyTitle: 'No hay pérdidas registradas',
        emptyCopy: 'Aquí solo quedan los casos cerrados como pérdida.'
    })
});

const CATEGORY_ORDER = Object.freeze(['sin-registro', 'fiados', 'pagados', 'perdidos']);
const OPERATIONAL_FAMILY_ORDER = Object.freeze(['all', 'sacks', 'baskets', 'kg']);
const OPERATIONAL_FAMILY_META = Object.freeze({
    all: Object.freeze({ label: 'Vista general', shortLabel: 'General' }),
    sacks: Object.freeze({ label: 'Sacos', shortLabel: 'Sacos' }),
    baskets: Object.freeze({ label: 'Cestas', shortLabel: 'Cestas' }),
    kg: Object.freeze({ label: 'Kilogramos', shortLabel: 'Kg' })
});

let initialized = false;
let rootNode = null;
let activeCategory = readStoredCategory();
let searchQuery = readStoredSearch();
let activeOperationalFamily = readStoredOperationalFamily();
let summaryRows = [];
let loading = false;
let hasLoadedSummary = false;
let lastErrorMessage = '';
let selectedBuyerId = '';
let detailRows = [];
let detailLoading = false;
let detailErrorMessage = '';
let detailExportPending = false;
let detailExportMessage = '';
let detailExportTone = '';
let detailHistoryFilter = 'todos';
let detailLedgerScope = 'todos';
let detailSelectedPair = readStoredDetailPair();
let detailExchangeRates = { USD: 1, COP: null, VES: null };
let detailExchangeStatus = { source: 'unknown', warning: '', fetchedAt: null };
let visibleCropScopeKeys = null;
let visibleCropScopeId = null;
let visibleCropScopeLoading = false;
let visibleCropScopeError = '';
let visibleCropScopeRequestId = 0;
const sessionCropBuyerScopeKeys = new Map();
let externalRefreshTimer = 0;
let cropScopedSummaryMap = new Map();
let operationalProgressMap = new Map();
let operationalProgressFamilyMap = new Map();

function readStoredCategory() {
    try {
        return normalizeCategory(localStorage.getItem(CARTERA_VIVA_CATEGORY_KEY));
    } catch (_error) {
        return 'fiados';
    }
}

function writeStoredCategory(category) {
    try {
        localStorage.setItem(CARTERA_VIVA_CATEGORY_KEY, normalizeCategory(category));
    } catch (_error) {
        // Ignore storage failures.
    }
}

function readStoredSearch() {
    try {
        return String(localStorage.getItem(CARTERA_VIVA_SEARCH_KEY) || '').trim();
    } catch (_error) {
        return '';
    }
}

function writeStoredSearch(value) {
    try {
        const safeValue = String(value || '').trim();
        if (safeValue) {
            localStorage.setItem(CARTERA_VIVA_SEARCH_KEY, safeValue);
            return;
        }
        localStorage.removeItem(CARTERA_VIVA_SEARCH_KEY);
    } catch (_error) {
        // Ignore storage failures.
    }
}

function readStoredOperationalFamily() {
    try {
        return normalizeOperationalFamily(localStorage.getItem(CARTERA_VIVA_UNIT_FAMILY_KEY));
    } catch (_error) {
        return 'all';
    }
}

function writeStoredOperationalFamily(value) {
    try {
        localStorage.setItem(CARTERA_VIVA_UNIT_FAMILY_KEY, normalizeOperationalFamily(value));
    } catch (_error) {
        // Ignore storage failures.
    }
}

function readStoredDetailPair() {
    try {
        const raw = String(localStorage.getItem('YG_AGRO_CARTERA_VIVA_PAIR_V1') || '').trim().toUpperCase();
        return raw === 'USD/VES' ? raw : 'USD/COP';
    } catch (_error) {
        return 'USD/COP';
    }
}

function writeStoredDetailPair(value) {
    try {
        const safeValue = String(value || '').trim().toUpperCase();
        localStorage.setItem('YG_AGRO_CARTERA_VIVA_PAIR_V1', safeValue === 'USD/VES' ? safeValue : 'USD/COP');
    } catch (_error) {
        // Ignore storage failures.
    }
}

function normalizeCategory(category) {
    const token = String(category || '').trim().toLowerCase();
    if (token === 'sin registro' || token === 'sin-registro' || token === 'sinregistro') return 'sin-registro';
    return CATEGORY_ORDER.includes(token) ? token : 'fiados';
}

function normalizeOperationalFamily(value) {
    const token = String(value || '').trim().toLowerCase();
    if (token === 'sacks' || token === 'sack' || token === 'saco' || token === 'sacos') return 'sacks';
    if (token === 'baskets' || token === 'basket' || token === 'cesta' || token === 'cestas') return 'baskets';
    if (token === 'kg' || token === 'kilogram' || token === 'kilograms' || token === 'kilogramo' || token === 'kilogramos') return 'kg';
    return 'all';
}

function createBuyerPortfolioFallbackRow(buyer = {}) {
    const buyerId = String(buyer?.id || '').trim();
    const canonicalName = normalizeBuyerGroupKey(buyer?.canonical_name || buyer?.group_key || buyer?.display_name || '');
    const displayName = String(buyer?.display_name || '').trim() || 'Cliente';

    return normalizeBuyerPortfolioSummaryRow({
        buyer_id: buyerId,
        display_name: displayName,
        group_key: canonicalName,
        canonical_name: canonicalName,
        client_status: String(buyer?.status || 'active').trim().toLowerCase() === 'archived' ? 'archived' : 'active',
        global_status: 'Sin movimientos',
        requires_review: false,
        created_at: buyer?.created_at || null,
        updated_at: buyer?.updated_at || null
    });
}

async function fetchBuyerDirectorySummaryRows() {
    const { data, error } = await supabase
        .from('agro_buyers')
        .select('id,display_name,group_key,canonical_name,status,created_at,updated_at')
        .order('updated_at', { ascending: false });

    if (error) throw error;

    return Array.isArray(data)
        ? data.map((buyer) => createBuyerPortfolioFallbackRow(buyer))
        : [];
}

function rowsMatchBuyerIdentity(summaryRow, buyerRow) {
    const summaryBuyerId = String(summaryRow?.buyer_id || '').trim();
    const buyerId = String(buyerRow?.buyer_id || '').trim();
    if (summaryBuyerId && buyerId && summaryBuyerId === buyerId) return true;

    const summaryCanonical = normalizeBuyerGroupKey(
        summaryRow?.canonical_name
        || summaryRow?.group_key
        || summaryRow?.display_name
        || ''
    );
    const buyerCanonical = normalizeBuyerGroupKey(
        buyerRow?.canonical_name
        || buyerRow?.group_key
        || buyerRow?.display_name
        || ''
    );

    return Boolean(summaryCanonical && buyerCanonical && summaryCanonical === buyerCanonical);
}

function mergeSummaryRowsWithBuyerDirectory(summaryData, buyerDirectoryRows) {
    const mergedRows = Array.isArray(summaryData)
        ? summaryData.map((row) => normalizeBuyerPortfolioSummaryRow(row))
        : [];

    (Array.isArray(buyerDirectoryRows) ? buyerDirectoryRows : []).forEach((buyerRow) => {
        const matchIndex = mergedRows.findIndex((summaryRow) => rowsMatchBuyerIdentity(summaryRow, buyerRow));
        if (matchIndex >= 0) {
            const currentRow = mergedRows[matchIndex];
            mergedRows[matchIndex] = normalizeBuyerPortfolioSummaryRow({
                ...buyerRow,
                ...currentRow,
                buyer_id: String(currentRow?.buyer_id || buyerRow?.buyer_id || '').trim(),
                display_name: String(buyerRow?.display_name || currentRow?.display_name || '').trim(),
                group_key: String(buyerRow?.group_key || currentRow?.group_key || '').trim(),
                canonical_name: String(buyerRow?.canonical_name || currentRow?.canonical_name || '').trim(),
                client_status: String(buyerRow?.client_status || currentRow?.client_status || 'active').trim()
            });
            return;
        }

        mergedRows.push(buyerRow);
    });

    return mergedRows;
}

function getSessionCropScopeKeys(cropId = getSelectedCropId()) {
    const safeCropId = normalizeCropId(cropId);
    if (!safeCropId) return null;
    const existingKeys = sessionCropBuyerScopeKeys.get(safeCropId);
    if (existingKeys instanceof Set) return existingKeys;
    const nextKeys = new Set();
    sessionCropBuyerScopeKeys.set(safeCropId, nextKeys);
    return nextKeys;
}

function pinBuyerToCurrentCropScope(clientId = '', groupKey = '') {
    const scopeKeys = getSessionCropScopeKeys();
    if (!(scopeKeys instanceof Set)) return;

    const safeBuyerId = String(clientId || '').trim();
    const safeGroupKey = normalizeBuyerGroupKey(groupKey);
    if (safeBuyerId) scopeKeys.add(`buyer:${safeBuyerId}`);
    if (safeGroupKey) scopeKeys.add(`group:${safeGroupKey}`);
}

function unpinBuyerFromSessionCropScopes(clientId = '', groupKey = '') {
    const safeBuyerId = String(clientId || '').trim();
    const safeGroupKey = normalizeBuyerGroupKey(groupKey);
    if (!safeBuyerId && !safeGroupKey) return;

    sessionCropBuyerScopeKeys.forEach((scopeKeys) => {
        if (!(scopeKeys instanceof Set)) return;
        if (safeBuyerId) scopeKeys.delete(`buyer:${safeBuyerId}`);
        if (safeGroupKey) scopeKeys.delete(`group:${safeGroupKey}`);
    });
}

function getRootNode() {
    if (rootNode && document.body.contains(rootNode)) return rootNode;
    rootNode = document.getElementById(CARTERA_VIVA_ROOT_ID);
    return rootNode;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
}

function renderBuyerNameNode(value, options = {}) {
    const tag = String(options.tag || 'span').trim() || 'span';
    const className = String(options.className || '').trim();
    const fallback = String(options.fallback || 'Cliente').trim() || 'Cliente';
    const safeValue = String(value || '').trim() || fallback;
    const classAttr = className ? ` class="${escapeAttribute(className)}"` : '';

    return `<${tag}${classAttr} data-buyer-name="1" data-raw-name="${escapeAttribute(safeValue)}">${escapeHtml(safeValue)}</${tag}>`;
}

function renderMoneyNode(value, options = {}) {
    const tag = String(options.tag || 'span').trim() || 'span';
    const className = String(options.className || '').trim();
    const safeValue = String(value || '').trim() || '$0.00';
    const classAttr = className ? ` class="${escapeAttribute(className)}"` : '';

    return `<${tag}${classAttr} data-money="1" data-raw-money="${escapeAttribute(safeValue)}">${escapeHtml(safeValue)}</${tag}>`;
}

function normalizeCropId(value) {
    const token = String(value || '').trim();
    return token || null;
}

function normalizeSearchQuery(value) {
    return String(value || '').trim();
}

function normalizeDetailHistoryFilter(value) {
    const token = String(value || '').trim().toLowerCase();
    if (token === 'transferidos') return 'transferidos';
    if (token === 'revertidos') return 'revertidos';
    return 'todos';
}

function normalizeDetailLedgerScope(value) {
    const token = String(value || '').trim().toLowerCase();
    if (token === 'fiados') return 'fiados';
    if (token === 'pagados') return 'pagados';
    if (token === 'perdidos') return 'perdidos';
    return 'todos';
}

function getSearchToken(value) {
    return normalizeHistorySearchToken(String(value || '').trim());
}

function getCropSnapshot() {
    if (typeof window === 'undefined') return null;
    const snapshot = window.__AGRO_CROPS_STATE;
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
}

function getAvailableCrops() {
    const snapshot = getCropSnapshot();
    return Array.isArray(snapshot?.crops) ? snapshot.crops : [];
}

function getSelectedCropId() {
    if (typeof window !== 'undefined' && typeof window.getSelectedCropId === 'function') {
        return normalizeCropId(window.getSelectedCropId());
    }
    if (typeof window !== 'undefined') {
        return normalizeCropId(window.YG_AGRO_SELECTED_CROP_ID);
    }
    return null;
}

function getSelectedCrop() {
    const selectedId = getSelectedCropId();
    if (!selectedId) return null;
    return getAvailableCrops().find((crop) => normalizeCropId(crop?.id) === selectedId) || null;
}

function resolveCropDisplay(crop) {
    const rawName = String(crop?.name || '').trim();
    const icon = String(crop?.icon || '').trim() || '🌱';
    const safeName = rawName.replace(/^[^\p{L}\p{N}]+/u, '').trim() || rawName || 'Cultivo';
    const variety = String(crop?.variety || '').trim();
    return {
        icon,
        label: variety ? `${icon} ${safeName} · ${variety}` : `${icon} ${safeName}`,
        shortLabel: safeName
    };
}

function getSelectedCropShortLabel() {
    const selectedCrop = getSelectedCrop();
    if (!selectedCrop) return 'este cultivo';
    return resolveCropDisplay(selectedCrop).shortLabel || 'este cultivo';
}

function normalizeOperationalCurrency(value) {
    const token = String(value || '').trim().toUpperCase();
    if (token === 'BS') return 'VES';
    return ['USD', 'COP', 'VES'].includes(token) ? token : 'USD';
}

function normalizeOperationalUnitType(value) {
    const token = String(value || '').trim().toLowerCase();
    return ['unidad', 'saco', 'cesta', 'kg'].includes(token) ? token : '';
}

function normalizeProgressUnitType(value) {
    const token = String(value || '').trim().toLowerCase();
    if (!token) return '';
    if (token === 'kg' || token === 'kilo' || token === 'kilos') return 'kg';
    if (token === 'saco' || token === 'sacos') return 'saco';
    if (token === 'cesta' || token === 'cestas') return 'cesta';
    if (token === 'unidad' || token === 'unidades') return 'unidad';
    return token;
}

function formatOperationalQuantity(value, decimals = 2) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return '0';
    if (Math.abs(numeric - Math.round(numeric)) < 1e-9) {
        return String(Math.round(numeric));
    }
    return String(Number(numeric.toFixed(decimals)));
}

function formatOperationalUnitLabel(unitType, quantity) {
    const normalizedType = normalizeProgressUnitType(unitType);
    const singular = Math.abs(Number(quantity) - 1) < 1e-9;
    if (normalizedType === 'kg') return 'kg';
    if (normalizedType === 'saco') return singular ? 'saco' : 'sacos';
    if (normalizedType === 'cesta') return singular ? 'cesta' : 'cestas';
    if (normalizedType === 'unidad') return singular ? 'unidad' : 'unidades';
    return normalizedType || (singular ? 'unidad' : 'unidades');
}

function formatOperationalValue(value, unitType) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return `0 ${formatOperationalUnitLabel(unitType, 0)}`;
    }
    return `${formatOperationalQuantity(numeric)} ${formatOperationalUnitLabel(unitType, numeric)}`;
}

function resolveOperationalFamilyKey(unitType, quantityKg = null) {
    const normalizedType = normalizeProgressUnitType(unitType);
    if (normalizedType === 'saco') return 'sacks';
    if (normalizedType === 'cesta') return 'baskets';
    if (normalizedType === 'kg') return 'kg';
    if (Number.isFinite(Number(quantityKg)) && Number(quantityKg) > 0) return 'kg';
    return '';
}

function getOperationalFamilyMeta(family) {
    return OPERATIONAL_FAMILY_META[normalizeOperationalFamily(family)] || OPERATIONAL_FAMILY_META.all;
}

function formatUniversalUnitValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return '0 unidades';
    const quantityText = formatOperationalQuantity(numeric);
    return `${quantityText} ${Math.abs(numeric - 1) < 1e-9 ? 'unidad' : 'unidades'}`;
}

function formatOperationalStatePhrase(value, singularState, pluralState) {
    const numeric = Number(value);
    const stateLabel = Math.abs(numeric - 1) < 1e-9 ? singularState : pluralState;
    return `${formatUniversalUnitValue(numeric)} ${stateLabel}`;
}

function formatOperationalUnitDescriptor(unitType, quantity = 2) {
    const normalizedType = normalizeProgressUnitType(unitType);
    if (!normalizedType || normalizedType === 'unidad') return '';
    return formatOperationalUnitLabel(normalizedType, quantity);
}

function createEmptyOperationalProgressBucket() {
    return {
        pending: [],
        paid: [],
        loss: []
    };
}

function createEmptyOperationalFamilyBucketMap() {
    return {
        sacks: createEmptyOperationalProgressBucket(),
        baskets: createEmptyOperationalProgressBucket(),
        kg: createEmptyOperationalProgressBucket()
    };
}

function createOperationalProgressEntry(row) {
    const naturalType = normalizeProgressUnitType(row?.unit_type);
    const naturalQty = Number(row?.unit_qty);
    const kgQty = Number(row?.quantity_kg);
    const hasNatural = naturalType && Number.isFinite(naturalQty) && naturalQty > 0;
    const hasKg = Number.isFinite(kgQty) && kgQty > 0;

    if (!hasNatural && !hasKg) return null;

    return {
        naturalType: hasNatural ? naturalType : '',
        naturalQty: hasNatural ? naturalQty : null,
        kgQty: hasKg ? kgQty : null
    };
}

function appendOperationalProgressEntry(progressMapTarget, scopeKey, stage, row) {
    const safeScopeKey = String(scopeKey || '').trim();
    if (!safeScopeKey || !['pending', 'paid', 'loss'].includes(stage)) return;
    const entry = createOperationalProgressEntry(row);
    if (!entry) return;

    if (!progressMapTarget.has(safeScopeKey)) {
        progressMapTarget.set(safeScopeKey, createEmptyOperationalProgressBucket());
    }

    progressMapTarget.get(safeScopeKey)[stage].push(entry);
}

function appendOperationalProgressFamilyEntry(progressMapTarget, scopeKey, stage, row) {
    const safeScopeKey = String(scopeKey || '').trim();
    if (!safeScopeKey || !['pending', 'paid', 'loss'].includes(stage)) return;

    const familyKey = resolveOperationalFamilyKey(row?.unit_type, row?.quantity_kg);
    if (!familyKey || familyKey === 'all') return;

    const entry = createOperationalProgressEntry(row);
    if (!entry) return;

    if (!progressMapTarget.has(safeScopeKey)) {
        progressMapTarget.set(safeScopeKey, createEmptyOperationalFamilyBucketMap());
    }

    progressMapTarget.get(safeScopeKey)[familyKey][stage].push(entry);
}

function sumOperationalEntries(entries, fieldName) {
    return (Array.isArray(entries) ? entries : []).reduce((total, entry) => total + Number(entry?.[fieldName] || 0), 0);
}

function resolveUnifiedOperationalProgress(bucket) {
    const safeBucket = bucket && typeof bucket === 'object'
        ? bucket
        : createEmptyOperationalProgressBucket();
    const allEntries = ['pending', 'paid', 'loss'].flatMap((stage) => safeBucket[stage] || []);

    if (allEntries.length <= 0) {
        return {
            mode: 'none',
            unitType: '',
            pending: 0,
            paid: 0,
            loss: 0,
            total: 0,
            percent: null,
            paidShare: 0,
            pendingShare: 0,
            lossShare: 0,
            pendingLabel: 'Sin unidades',
            paidLabel: 'Sin unidades',
            lossLabel: 'Sin unidades',
            totalLabel: 'Sin unidades'
        };
    }

    const everyHasNatural = allEntries.every((entry) =>
        entry?.naturalType && Number.isFinite(entry?.naturalQty) && entry.naturalQty > 0
    );
    const naturalTypes = Array.from(new Set(
        allEntries.map((entry) => entry?.naturalType).filter(Boolean)
    ));
    const everyHasKg = allEntries.every((entry) =>
        Number.isFinite(entry?.kgQty) && entry.kgQty > 0
    );

    let unitType = '';
    let fieldName = '';

    if (everyHasNatural && naturalTypes.length === 1) {
        unitType = naturalTypes[0];
        fieldName = 'naturalQty';
    } else if (everyHasKg) {
        unitType = 'kg';
        fieldName = 'kgQty';
    } else {
        return {
            mode: 'mixed',
            unitType: '',
            pending: 0,
            paid: 0,
            loss: 0,
            total: 0,
            percent: null,
            paidShare: 0,
            pendingShare: 0,
            lossShare: 0,
            pendingLabel: 'No unificado',
            paidLabel: 'No unificado',
            lossLabel: 'No unificado',
            totalLabel: 'Avance no unificado'
        };
    }

    const pending = sumOperationalEntries(safeBucket.pending, fieldName);
    const paid = sumOperationalEntries(safeBucket.paid, fieldName);
    const loss = sumOperationalEntries(safeBucket.loss, fieldName);
    const total = Math.max(0, pending + paid + loss);
    const percent = total > 0 ? clampPercent(((paid + loss) / total) * 100) : 0;
    const paidShare = total > 0 ? clampPercent((paid / total) * 100) : 0;
    const lossShare = total > 0 ? clampPercent((loss / total) * 100) : 0;
    const pendingShare = total > 0 ? clampPercent(Math.max(0, 100 - paidShare - lossShare)) : 0;

    return {
        mode: 'unified',
        unitType,
        pending,
        paid,
        loss,
        total,
        percent,
        paidShare,
        pendingShare,
        lossShare,
        pendingLabel: formatOperationalValue(pending, unitType),
        paidLabel: formatOperationalValue(paid, unitType),
        lossLabel: formatOperationalValue(loss, unitType),
        totalLabel: formatOperationalValue(total, unitType)
    };
}

function roundPortfolioMetric(value, decimals = 2) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    const precision = 10 ** decimals;
    return Math.round(numeric * precision) / precision;
}

function readPortfolioAmount(row) {
    const amountUsd = Number(row?.monto_usd);
    if (Number.isFinite(amountUsd)) return amountUsd;
    const amount = Number(row?.monto);
    return Number.isFinite(amount) ? amount : 0;
}

function createEmptyCropScopedSummaryBucket() {
    return {
        credited_total: 0,
        paid_total: 0,
        loss_total: 0,
        transferred_total: 0,
        pending_total: 0,
        review_required_total: 0,
        legacy_unclassified_total: 0,
        non_debt_income_total: 0,
        review_required_count: 0,
        legacy_unclassified_count: 0
    };
}

function ensureCropScopedSummaryBucket(summaryMapTarget, row) {
    const scopeKey = buildBuyerPortfolioScopeKey(row);
    if (!scopeKey) return null;
    if (!summaryMapTarget.has(scopeKey)) {
        summaryMapTarget.set(scopeKey, createEmptyCropScopedSummaryBucket());
    }
    return summaryMapTarget.get(scopeKey);
}

function appendCropScopedReview(summaryMapTarget, row) {
    const matchStatus = String(row?.buyer_match_status || '').trim().toLowerCase();
    if (!matchStatus || matchStatus === 'matched') return;

    const bucket = ensureCropScopedSummaryBucket(summaryMapTarget, row);
    if (!bucket) return;

    const amount = readPortfolioAmount(row);
    if (matchStatus === 'legacy_review_required') {
        bucket.review_required_total += amount;
        bucket.review_required_count += 1;
        return;
    }

    if (matchStatus === 'legacy_unclassified') {
        bucket.legacy_unclassified_total += amount;
        bucket.legacy_unclassified_count += 1;
    }
}

function resolveCropScopedGlobalStatus(bucket, clientStatus = 'active') {
    const safeClientStatus = String(clientStatus || 'active').trim().toLowerCase();
    if (safeClientStatus === 'archived') return 'Archivado';

    const credited = Number(bucket?.credited_total || 0);
    const paid = Number(bucket?.paid_total || 0);
    const loss = Number(bucket?.loss_total || 0);
    const transferred = Number(bucket?.transferred_total || 0);
    const pending = Number(bucket?.pending_total || 0);
    const reviewRequired = Number(bucket?.review_required_total || 0);
    const legacyUnclassified = Number(bucket?.legacy_unclassified_total || 0);
    const visibleBalance = credited - paid - loss - transferred;

    if (pending > 0 && paid <= 0 && loss <= 0 && transferred <= 0) return 'Fiado';
    if (
        credited > 0
        && pending <= 0
        && visibleBalance >= 0
        && reviewRequired <= 0
        && legacyUnclassified <= 0
    ) {
        return 'Pagado';
    }
    if (
        credited <= 0
        && paid <= 0
        && loss <= 0
        && pending <= 0
        && reviewRequired <= 0
        && legacyUnclassified <= 0
    ) {
        return 'Sin movimientos';
    }
    return 'Mixto';
}

function buildCropScopedSummaryOverlay(row, bucket = null) {
    const safeBucket = bucket && typeof bucket === 'object'
        ? bucket
        : createEmptyCropScopedSummaryBucket();
    const credited = Number(safeBucket.credited_total || 0);
    const paid = Number(safeBucket.paid_total || 0);
    const loss = Number(safeBucket.loss_total || 0);
    const transferred = Number(safeBucket.transferred_total || 0);
    const pending = Number(safeBucket.pending_total || 0);
    const visibleBalance = credited - paid - loss - transferred;
    const compliance = credited <= 0 || visibleBalance < 0
        ? null
        : roundPortfolioMetric((paid / credited) * 100, 2);

    return normalizeBuyerPortfolioSummaryRow({
        ...row,
        ...safeBucket,
        compliance_percent: compliance,
        global_status: resolveCropScopedGlobalStatus(safeBucket, row?.client_status),
        balance_gap_total: roundPortfolioMetric(pending - visibleBalance, 2),
        requires_review: Number(safeBucket.review_required_total || 0) > 0
            || Number(safeBucket.legacy_unclassified_total || 0) > 0
            || visibleBalance < 0
    });
}

async function fetchOperationalProgressMap(supabaseClient, cropId = null) {
    const safeCropId = normalizeCropId(cropId);
    const baseColumns = 'buyer_id,buyer_group_key,unit_type,unit_qty,quantity_kg,monto,monto_usd,buyer_match_status';
    const pendingQuery = supabaseClient
        .from('agro_pending')
        .select(`${baseColumns},transfer_state,transferred_to,crop_id`)
        .is('deleted_at', null)
        .is('reverted_at', null);
    const incomeQuery = supabaseClient
        .from('agro_income')
        .select(`${baseColumns},origin_table,crop_id`)
        .is('deleted_at', null)
        .is('reverted_at', null);
    const lossQuery = supabaseClient
        .from('agro_losses')
        .select(`${baseColumns},origin_table,crop_id`)
        .is('deleted_at', null)
        .is('reverted_at', null);

    const scopedPendingQuery = safeCropId ? pendingQuery.eq('crop_id', safeCropId) : pendingQuery;
    const scopedIncomeQuery = safeCropId ? incomeQuery.eq('crop_id', safeCropId) : incomeQuery;
    const scopedLossQuery = safeCropId ? lossQuery.eq('crop_id', safeCropId) : lossQuery;

    const [pendingResult, incomeResult, lossResult] = await Promise.all([
        scopedPendingQuery,
        scopedIncomeQuery,
        scopedLossQuery
    ]);

    if (pendingResult?.error) throw pendingResult.error;
    if (incomeResult?.error) throw incomeResult.error;
    if (lossResult?.error) throw lossResult.error;

    const nextMap = new Map();
    const nextFamilyMap = new Map();
    const nextSummaryMap = new Map();

    (Array.isArray(pendingResult?.data) ? pendingResult.data : []).forEach((row) => {
        const transferState = String(row?.transfer_state || 'active').trim().toLowerCase();
        const matchStatus = String(row?.buyer_match_status || '').trim().toLowerCase();
        if (safeCropId) {
            appendCropScopedReview(nextSummaryMap, row);
            if (matchStatus === 'matched') {
                const bucket = ensureCropScopedSummaryBucket(nextSummaryMap, row);
                if (bucket) {
                    const amount = readPortfolioAmount(row);
                    bucket.credited_total += amount;
                    if (transferState === 'active') {
                        bucket.pending_total += amount;
                    } else if (
                        transferState === 'transferred'
                        && !['income', 'losses'].includes(String(row?.transferred_to || '').trim().toLowerCase())
                    ) {
                        bucket.transferred_total += amount;
                    }
                }
            }
        }
        if (transferState !== 'active') return;
        const scopeKey = buildBuyerPortfolioScopeKey(row);
        appendOperationalProgressEntry(nextMap, scopeKey, 'pending', row);
        appendOperationalProgressFamilyEntry(nextFamilyMap, scopeKey, 'pending', row);
    });

    (Array.isArray(incomeResult?.data) ? incomeResult.data : []).forEach((row) => {
        const originTable = String(row?.origin_table || '').trim().toLowerCase();
        const matchStatus = String(row?.buyer_match_status || '').trim().toLowerCase();
        if (safeCropId) {
            appendCropScopedReview(nextSummaryMap, row);
            if (matchStatus === 'matched') {
                const bucket = ensureCropScopedSummaryBucket(nextSummaryMap, row);
                if (bucket) {
                    const amount = readPortfolioAmount(row);
                    if (originTable === 'agro_pending') {
                        bucket.paid_total += amount;
                    } else {
                        bucket.non_debt_income_total += amount;
                    }
                }
            }
        }
        if (originTable !== 'agro_pending') return;
        const scopeKey = buildBuyerPortfolioScopeKey(row);
        appendOperationalProgressEntry(nextMap, scopeKey, 'paid', row);
        appendOperationalProgressFamilyEntry(nextFamilyMap, scopeKey, 'paid', row);
    });

    (Array.isArray(lossResult?.data) ? lossResult.data : []).forEach((row) => {
        const originTable = String(row?.origin_table || '').trim().toLowerCase();
        const matchStatus = String(row?.buyer_match_status || '').trim().toLowerCase();
        if (safeCropId) {
            appendCropScopedReview(nextSummaryMap, row);
            if (matchStatus === 'matched' && originTable === 'agro_pending') {
                const bucket = ensureCropScopedSummaryBucket(nextSummaryMap, row);
                if (bucket) {
                    bucket.loss_total += readPortfolioAmount(row);
                }
            }
        }
        if (originTable !== 'agro_pending') return;
        const scopeKey = buildBuyerPortfolioScopeKey(row);
        appendOperationalProgressEntry(nextMap, scopeKey, 'loss', row);
        appendOperationalProgressFamilyEntry(nextFamilyMap, scopeKey, 'loss', row);
    });

    nextMap.forEach((bucket, scopeKey) => {
        nextMap.set(scopeKey, resolveUnifiedOperationalProgress(bucket));
    });

    nextFamilyMap.forEach((bucketMap, scopeKey) => {
        nextFamilyMap.set(scopeKey, {
            sacks: resolveUnifiedOperationalProgress(bucketMap?.sacks),
            baskets: resolveUnifiedOperationalProgress(bucketMap?.baskets),
            kg: resolveUnifiedOperationalProgress(bucketMap?.kg)
        });
    });

    return {
        aggregateMap: nextMap,
        familyMap: nextFamilyMap,
        summaryMap: nextSummaryMap
    };
}

function getOperationalProgressByFamily(row, family = activeOperationalFamily) {
    const scopeKey = buildBuyerPortfolioScopeKey(row);
    if (!scopeKey) return resolveUnifiedOperationalProgress(null);

    const normalizedFamily = normalizeOperationalFamily(family);
    if (normalizedFamily === 'all') {
        return operationalProgressMap.get(scopeKey) || resolveUnifiedOperationalProgress(null);
    }

    const familyProgress = operationalProgressFamilyMap.get(scopeKey);
    return familyProgress?.[normalizedFamily] || resolveUnifiedOperationalProgress(null);
}

function getOperationalProgress(row) {
    return getOperationalProgressByFamily(row, activeOperationalFamily);
}

function rowHasOperationalFamily(row, family = activeOperationalFamily) {
    const progress = getOperationalProgressByFamily(row, family);
    return progress.mode === 'unified' && progress.total > 0;
}

function filterRowsByOperationalFamily(rows, family = activeOperationalFamily) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const normalizedFamily = normalizeOperationalFamily(family);
    if (normalizedFamily === 'all') return safeRows;
    return safeRows.filter((row) => rowHasOperationalFamily(row, normalizedFamily));
}

function formatMoney(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '$0.00';
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatPercent(value) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return 'Sin lectura';
    return `${nextValue.toFixed(0)}%`;
}

function formatCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count) || count <= 0) return '0';
    return new Intl.NumberFormat('es-VE').format(Math.trunc(count));
}

function formatShortDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function clampPercent(value) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return 0;
    return Math.min(100, Math.max(0, nextValue));
}

function getReviewTotal(row) {
    return Number(row?.review_required_total || 0) + Number(row?.legacy_unclassified_total || 0);
}

function getOutstandingBalance(row) {
    const pendingTotal = Number(row?.pending_total);
    if (Number.isFinite(pendingTotal)) return Math.max(0, pendingTotal);

    const credited = Number(row?.credited_total || 0);
    const paid = Number(row?.paid_total || 0);
    const loss = Number(row?.loss_total || 0);
    const transferred = Number(row?.transferred_total || 0);
    return Math.max(0, credited - paid - loss - transferred);
}

function getProgressBase(row) {
    const operationalProgress = getOperationalProgress(row);
    if (operationalProgress.mode === 'unified') {
        return Math.max(operationalProgress.total, 0);
    }

    const credited = Number(row?.credited_total || 0);
    const combined = Number(row?.paid_total || 0) + getOutstandingBalance(row) + Number(row?.loss_total || 0);
    return Math.max(credited, combined, 0);
}

function getPaidPercent(row) {
    const operationalProgress = getOperationalProgress(row);
    if (operationalProgress.mode === 'unified') {
        return clampPercent(operationalProgress.percent);
    }

    const compliance = Number(row?.compliance_percent);
    if (Number.isFinite(compliance) && compliance > 0) return clampPercent(compliance);

    const base = getProgressBase(row);
    if (base <= 0) return 0;
    return clampPercent((Number(row?.paid_total || 0) / base) * 100);
}

function getProgressBreakdown(row) {
    const operationalProgress = getOperationalProgress(row);
    if (operationalProgress.mode === 'unified') {
        return {
            base: operationalProgress.total,
            paidShare: operationalProgress.paidShare,
            lossShare: operationalProgress.lossShare,
            pendingShare: operationalProgress.pendingShare,
            paidPercent: operationalProgress.percent,
            mode: 'unified'
        };
    }

    const base = Math.max(getProgressBase(row), 1);
    const paid = Math.max(0, Number(row?.paid_total || 0));
    const pending = Math.max(0, getOutstandingBalance(row));
    const loss = Math.max(0, Number(row?.loss_total || 0));

    const paidShare = clampPercent((paid / base) * 100);
    const lossShare = clampPercent((loss / base) * 100);
    const pendingShare = clampPercent(Math.max(0, 100 - paidShare - lossShare));

    return {
        base,
        paidShare,
        lossShare,
        pendingShare,
        paidPercent: getPaidPercent(row),
        mode: operationalProgress.mode || 'financial'
    };
}

function getOperationalStatusSnapshot(row, family = activeOperationalFamily) {
    const visibleFamilies = getVisibleOperationalProgressFamilies(row, family);
    if (visibleFamilies.length > 0) {
        return {
            hasPaid: visibleFamilies.some((entry) => Number(entry?.paid || 0) > 0),
            hasPending: visibleFamilies.some((entry) => Number(entry?.pending || 0) > 0),
            hasLoss: visibleFamilies.some((entry) => Number(entry?.loss || 0) > 0),
            primaryProgress: visibleFamilies.length === 1 ? visibleFamilies[0] : null,
            hasSeparatedFamilies: visibleFamilies.length > 1
        };
    }

    const progress = getOperationalProgressByFamily(row, family);
    return {
        hasPaid: Number(progress?.paid || 0) > 0,
        hasPending: Number(progress?.pending || 0) > 0,
        hasLoss: Number(progress?.loss || 0) > 0,
        primaryProgress: progress?.mode === 'unified' ? progress : null,
        hasSeparatedFamilies: false
    };
}

function formatOperationalPartialChip(progress) {
    const paid = Number(progress?.paid || 0);
    const pending = Number(progress?.pending || 0);
    const unitType = normalizeProgressUnitType(progress?.unitType);
    const total = paid + pending;

    if (!(paid > 0) || !(pending > 0) || !(total > 0) || !unitType) return '';

    return `${formatOperationalQuantity(paid)} de ${formatOperationalQuantity(total)} ${formatOperationalUnitLabel(unitType, total)} cobrados`;
}

function hasBuyerPortfolioHistory(row) {
    const numericFields = [
        'credited_total',
        'paid_total',
        'loss_total',
        'transferred_total',
        'pending_total',
        'review_required_total',
        'legacy_unclassified_total',
        'non_debt_income_total',
        'balance_gap_total'
    ];

    const hasNumericHistory = numericFields.some((field) => Number(row?.[field] || 0) > 0);
    if (hasNumericHistory) return true;

    return Number(row?.review_required_count || 0) > 0
        || Number(row?.legacy_unclassified_count || 0) > 0;
}

function resolveVisibleCategory(row) {
    const hasHistory = hasBuyerPortfolioHistory(row);
    const pending = getOutstandingBalance(row);
    const paid = Number(row?.paid_total || 0);
    const loss = Number(row?.loss_total || 0);
    const review = getReviewTotal(row);

    if (!hasHistory) return 'sin-registro';
    if (pending > 0) return 'fiados';
    if (loss > 0) return 'perdidos';
    if (paid > 0) return 'pagados';
    if (review > 0) return 'fiados';
    return 'fiados';
}

function resolveDisplayCategory(row) {
    const explicitCategory = String(row?.__portfolioCategory || '').trim().toLowerCase();
    return CATEGORY_ORDER.includes(explicitCategory)
        ? explicitCategory
        : resolveVisibleCategory(row);
}

function hasVisibleCategory(row, category) {
    const safeCategory = normalizeCategory(category);
    const hasHistory = hasBuyerPortfolioHistory(row);
    const pending = getOutstandingBalance(row);
    const paid = Number(row?.paid_total || 0);
    const loss = Number(row?.loss_total || 0);
    const review = getReviewTotal(row);

    if (safeCategory === 'sin-registro') return !hasHistory;
    if (safeCategory === 'pagados') return paid > 0;
    if (safeCategory === 'perdidos') return loss > 0;
    return pending > 0 || review > 0;
}

function buildPortfolioEntries(rows, category) {
    const safeRows = Array.isArray(rows) ? rows.slice() : [];
    const categories = category ? [normalizeCategory(category)] : CATEGORY_ORDER;

    return safeRows.flatMap((row) => categories
        .filter((candidate) => hasVisibleCategory(row, candidate))
        .map((candidate) => ({
            ...row,
            __portfolioCategory: candidate,
            __portfolioEntryKey: `${buildBuyerPortfolioScopeKey(row) || String(row?.buyer_id || row?.group_key || row?.display_name || 'cliente')}:${candidate}`
        })));
}

function getCategorySortMetric(row, category) {
    const safeCategory = normalizeCategory(category);
    const operationalProgress = getOperationalProgress(row);
    if (safeCategory === 'sin-registro') {
        return Date.parse(row?.updated_at || row?.created_at || '') || 0;
    }
    if (activeOperationalFamily !== 'all' && operationalProgress.mode === 'unified') {
        if (safeCategory === 'pagados') return Number(operationalProgress.paid || 0);
        if (safeCategory === 'perdidos') return Number(operationalProgress.loss || 0);
        return Math.max(Number(operationalProgress.pending || 0), 0);
    }
    if (safeCategory === 'pagados') return Number(row?.paid_total || 0);
    if (safeCategory === 'perdidos') return Number(row?.loss_total || 0);
    return Math.max(getOutstandingBalance(row), getReviewTotal(row));
}

function resolveBuyerStatus(row) {
    const clientStatus = String(row?.client_status || 'active').trim().toLowerCase();
    const hasHistory = hasBuyerPortfolioHistory(row);
    const pending = getOutstandingBalance(row);
    const paid = Number(row?.paid_total || 0);
    const loss = Number(row?.loss_total || 0);
    const review = getReviewTotal(row);
    const operationalProgress = getOperationalProgress(row);
    const operationalStatus = getOperationalStatusSnapshot(row, activeOperationalFamily);
    const hasSeparatedFamilies = activeOperationalFamily === 'all' && operationalStatus.hasSeparatedFamilies;
    const hasOpPaid = operationalStatus.hasPaid;
    const pendingUnits = operationalProgress.mode === 'unified'
        ? formatOperationalStatePhrase(operationalProgress.pending, 'pendiente', 'pendientes')
        : '';
    const paidUnits = operationalProgress.mode === 'unified'
        ? formatOperationalStatePhrase(operationalProgress.paid, 'cobrada', 'cobradas')
        : '';
    const lossUnits = operationalProgress.mode === 'unified'
        ? formatOperationalStatePhrase(operationalProgress.loss, 'perdida', 'perdidas')
        : '';

    if (clientStatus === 'archived') {
        return {
            tone: 'review',
            label: 'Archivado',
            detail: 'Cliente fuera del flujo activo, con historial preservado.'
        };
    }

    if (!hasHistory) {
        return {
            tone: 'empty',
            label: 'Sin registro',
            detail: 'Sin registros de historial'
        };
    }

    if (pending > 0) {
        if (hasOpPaid) {
            return {
                tone: 'fiado',
                label: 'Cobro en proceso',
                detail: operationalProgress.mode === 'unified'
                    ? `${pendingUnits} · ${paidUnits}`
                    : (hasSeparatedFamilies
                        ? 'Cobro operativo separado por unidad'
                        : (operationalProgress.mode === 'mixed'
                            ? 'Pendiente operativo sin base unificada'
                            : `Pendiente operativo${review > 0 ? ' · con revisión pendiente' : ''}`))
            };
        }

        return {
            tone: 'fiado',
            label: 'Fiado activo',
            detail: operationalProgress.mode === 'unified'
                ? `${pendingUnits}${review > 0 ? ' · con revisión pendiente' : ''}`
                : (hasSeparatedFamilies
                    ? `Pendiente operativo separado por unidad${review > 0 ? ' · con revisión pendiente' : ''}`
                    : (operationalProgress.mode === 'mixed'
                        ? `Pendiente operativo sin base unificada${review > 0 ? ' · con revisión pendiente' : ''}`
                        : `Pendiente operativo${review > 0 ? ' · con revisión pendiente' : ''}`))
        };
    }

    if (loss > 0) {
        return {
            tone: 'perdido',
            label: paid > 0 ? 'Con pérdida' : 'Pérdida',
            detail: operationalProgress.mode === 'unified'
                ? `${lossUnits}`
                : (hasSeparatedFamilies
                    ? 'Pérdida separada por unidad'
                    : (operationalProgress.mode === 'mixed'
                        ? 'Pérdida sin base unificada'
                        : 'Pérdida sin base física'))
        };
    }

    if (hasOpPaid) {
        return {
            tone: 'pagado',
            label: 'Pagado',
            detail: operationalProgress.mode === 'unified'
                ? `${paidUnits} · sin pendiente operativo`
                : (hasSeparatedFamilies
                    ? 'Cierre operativo separado por unidad'
                    : (operationalProgress.mode === 'mixed'
                        ? 'Cierre operativo sin base unificada'
                        : 'Cuenta cerrada sin base física'))
        };
    }

    if (paid > 0) {
        return {
            tone: 'pagado',
            label: 'Ingreso registrado',
            detail: 'Ingreso del cultivo sin pendiente operativo.'
        };
    }

    return {
        tone: review > 0 ? 'review' : 'seguimiento',
        label: review > 0 ? 'Por revisar' : 'Sin movimientos',
        detail: review > 0
            ? 'Pendiente operativo por ordenar'
            : 'Cliente listo para registrar su primer movimiento.'
    };
}

function resolveBuyerStatusForCategory(row, category) {
    const globalStatus = resolveBuyerStatus(row);
    const safeCategory = normalizeCategory(category);

    if (safeCategory === 'sin-registro') return globalStatus;

    const pending = getOutstandingBalance(row);
    const loss = Number(row?.loss_total || 0);
    if (pending > 0 || loss > 0) return globalStatus;

    return globalStatus;
}

function getVisibleOperationalProgressFamilies(row, family = activeOperationalFamily) {
    const normalizedFamily = normalizeOperationalFamily(family);
    const targetFamilies = normalizedFamily === 'all'
        ? ['sacks', 'baskets', 'kg']
        : [normalizedFamily];

    return targetFamilies.map((familyKey) => {
        const progress = getOperationalProgressByFamily(row, familyKey);
        if (progress.mode !== 'unified' || Number(progress.total || 0) <= 0) return null;

        const familyMeta = getOperationalFamilyMeta(familyKey);
        const lossCopy = Number(progress.loss || 0) > 0 ? ` · Pér ${progress.lossLabel}` : '';

        return {
            mode: 'unified',
            family: familyKey,
            label: familyMeta.label,
            progressLabel: familyMeta.label,
            progressValue: formatPercent(progress.percent),
            legendStart: `Pend ${progress.pendingLabel}`,
            legendEnd: `Cob ${progress.paidLabel}${lossCopy}`,
            metricsCopy: `Pend ${progress.pendingLabel} · Cob ${progress.paidLabel}${lossCopy}`,
            totalLabel: formatOperationalValue(progress.total, progress.unitType),
            unitType: progress.unitType,
            total: progress.total,
            pending: progress.pending,
            paid: progress.paid,
            loss: progress.loss,
            paidShare: progress.paidShare,
            pendingShare: progress.pendingShare,
            lossShare: progress.lossShare,
            percent: progress.percent,
            pendingLabel: progress.pendingLabel,
            paidLabel: progress.paidLabel,
            lossLabel: progress.lossLabel
        };
    }).filter(Boolean);
}

function comparePortfolioRows(a, b) {
    const aCategory = resolveDisplayCategory(a);
    const bCategory = resolveDisplayCategory(b);
    const categoryDiff = CATEGORY_ORDER.indexOf(aCategory) - CATEGORY_ORDER.indexOf(bCategory);
    if (categoryDiff !== 0) return categoryDiff;

    const primaryDiff = getCategorySortMetric(b, bCategory) - getCategorySortMetric(a, aCategory);
    if (primaryDiff !== 0) return primaryDiff;

    const reviewDiff = Number(b?.review_required_total || 0) - Number(a?.review_required_total || 0);
    if (reviewDiff !== 0) return reviewDiff;

    return String(a?.display_name || '').localeCompare(String(b?.display_name || ''), 'es');
}

function matchesPortfolioSearch(row, query = searchQuery) {
    const token = getSearchToken(query);
    if (!token) return true;

    const haystack = [
        row?.display_name,
        row?.canonical_name,
        row?.buyer_group_key,
        row?.group_key,
        row?.global_status
    ]
        .filter(Boolean)
        .join(' ');

    return getSearchToken(haystack).includes(token);
}

function getCropScopedRows(rows) {
    const safeRows = Array.isArray(rows) ? rows.slice() : [];
    const selectedCropId = getSelectedCropId();
    if (!selectedCropId) return safeRows;
    if (!(visibleCropScopeKeys instanceof Set) || visibleCropScopeId !== selectedCropId) return [];
    const sessionKeys = getSessionCropScopeKeys(selectedCropId);

    return safeRows.flatMap((row) => {
        if (!hasBuyerPortfolioHistory(row)) return [row];
        const scopeKey = buildBuyerPortfolioScopeKey(row);
        if (!scopeKey || (!visibleCropScopeKeys.has(scopeKey) && !sessionKeys?.has(scopeKey))) {
            return [];
        }
        return [buildCropScopedSummaryOverlay(row, cropScopedSummaryMap.get(scopeKey))];
    });
}

function filterRowsByCategory(rows, category) {
    return buildPortfolioEntries(rows, category)
        .filter((row) => matchesPortfolioSearch(row))
        .sort(comparePortfolioRows);
}

function getCategoryCounts(rows, family = activeOperationalFamily) {
    return {
        'sin-registro': filterRowsByCategory(rows, 'sin-registro').length,
        fiados: filterRowsByOperationalFamily(filterRowsByCategory(rows, 'fiados'), family).length,
        pagados: filterRowsByOperationalFamily(filterRowsByCategory(rows, 'pagados'), family).length,
        perdidos: filterRowsByOperationalFamily(filterRowsByCategory(rows, 'perdidos'), family).length
    };
}

function sumField(rows, fieldName) {
    return (Array.isArray(rows) ? rows : []).reduce((total, row) => total + Number(row?.[fieldName] || 0), 0);
}

function resolveRecordWizardTab(category = activeCategory) {
    if (category === 'pagados') return 'ingresos';
    if (category === 'perdidos') return 'perdidas';
    return 'pendientes';
}

function resolveRecordActionLabel(category = activeCategory) {
    if (category === 'pagados') return 'Nuevo cobro';
    if (category === 'perdidos') return 'Nueva pérdida';
    return 'Nuevo fiado';
}

function getCarteraVivaActionContext() {
    return {
        category: activeCategory,
        wizardTab: resolveRecordWizardTab(activeCategory),
        cropId: getSelectedCropId(),
        searchQuery
    };
}

function openRecordFromCarteraContext() {
    if (typeof window === 'undefined' || typeof window.launchAgroWizard !== 'function') return false;
    const context = getCarteraVivaActionContext();
    if (typeof window.setSelectedCropId === 'function') {
        window.setSelectedCropId(context.cropId || null);
    }
    window.launchAgroWizard(context.wizardTab, {
        initialCropId: context.cropId || null,
        debtContext: true
    });
    return true;
}

async function resolveCyclePayloadFromContext(context = {}) {
    const buyerRow = context?.buyerRow || null;
    const historyRow = context?.historyRow || null;
    const cropId = normalizeCropId(historyRow?.crop_id || getSelectedCropId());
    const sourceTab = String(historyRow?.source_tab || '').trim().toLowerCase();
    const buyerName = String(
        buyerRow?.display_name
        || historyRow?.buyer_name
        || getSelectedBuyerRow?.()?.display_name
        || 'Cliente'
    ).trim();
    const baseConcept = String(historyRow?.concept || historyRow?.title || '').trim();
    const suggestedName = historyRow
        ? `${buyerName} · ${baseConcept || 'Seguimiento'}`
        : `${buyerName} · Seguimiento comercial`;
    const name = typeof window !== 'undefined' && typeof window.showPromptModal === 'function'
        ? await window.showPromptModal({ title: 'Nueva cartera operativa', label: 'Nombre de la cartera operativa', defaultValue: suggestedName })
        : (typeof window !== 'undefined' && typeof window.prompt === 'function'
            ? window.prompt('Nombre de la cartera operativa', suggestedName)
            : suggestedName);
    const unitType = normalizeOperationalUnitType(historyRow?.unit_type || '');
    const quantityRaw = Number(historyRow?.unit_qty);

    if (name === null) return null;

    let economicType = 'expense';
    if (sourceTab === 'ingresos') economicType = 'income';
    else if (sourceTab === 'perdidas') economicType = 'loss';
    else if (sourceTab === 'transferencias') economicType = 'donation';

    const amount = historyRow
        ? Number(historyRow?.amount || 0)
        : Math.max(
            getOutstandingBalance(buyerRow),
            Number(buyerRow?.loss_total || 0),
            Number(buyerRow?.paid_total || 0),
            0
        );

    return {
        name: String(name || suggestedName).trim() || suggestedName,
        description: historyRow
            ? `Creado desde Cartera Viva para ${buyerName}. ${historyRow.title || 'Movimiento'}${baseConcept ? ` · ${baseConcept}` : ''}.`
            : `Creado desde Cartera Viva para ${buyerName}.`,
        economicType,
        category: 'other',
        cropId: cropId || '',
        amount: Number.isFinite(amount) && amount > 0 ? amount : null,
        currency: normalizeOperationalCurrency(historyRow?.currency || 'USD'),
        movementDate: String(historyRow?.fecha || new Date().toISOString().slice(0, 10)).trim(),
        quantity: unitType && Number.isFinite(quantityRaw) ? quantityRaw : null,
        unitType,
        status: 'open'
    };
}

async function createOperationalCycleFromCartera(context = {}) {
    const opsApi = typeof window !== 'undefined' ? window.YGAgroOperationalCycles : null;
    if (!opsApi?.createFromPayload || !opsApi?.openView) {
        setDetailExportState('Cartera Operativa no está disponible en esta sesión.', 'error');
        renderView();
        return;
    }

    const payload = await resolveCyclePayloadFromContext(context);
    if (!payload) return;

    if (!payload.cropId) {
        setDetailExportState('Necesitas un cultivo activo o un movimiento con cultivo para crear el ciclo.', 'error');
        renderView();
        return;
    }

    try {
        const result = await opsApi.createFromPayload(payload);
        setDetailExportState(String(result?.message || 'Cartera operativa creada desde Cartera Viva.'), 'success');
        opsApi.openView('active');
    } catch (error) {
        console.error('[CarteraViva] create operational cycle failed:', error?.message || error);
        setDetailExportState(String(error?.message || 'No se pudo crear la cartera operativa desde Cartera Viva.'), 'error');
        renderView();
    }
}

function syncCarteraVivaGlobalContext() {
    if (typeof window === 'undefined') return;
    window.getCarteraVivaActionContext = getCarteraVivaActionContext;
    window.openCarteraVivaRecordContext = openRecordFromCarteraContext;
}

function renderHeroSignal(rows) {
    const pendingTotal = rows.reduce((total, row) => total + getOutstandingBalance(row), 0);
    const base = Math.max(
        sumField(rows, 'credited_total'),
        sumField(rows, 'paid_total') + pendingTotal + sumField(rows, 'loss_total'),
        1
    );
    const paidShare = clampPercent((sumField(rows, 'paid_total') / base) * 100);
    const lossShare = clampPercent((sumField(rows, 'loss_total') / base) * 100);
    const pendingShare = clampPercent(Math.max(0, 100 - paidShare - lossShare));

    return `
        <div class="cartera-viva-hero__signal" aria-hidden="true">
            <span class="cartera-viva-hero__signal-track">
                ${paidShare > 0 ? `<span class="cartera-viva-hero__signal-segment is-paid" style="width:${paidShare}%"></span>` : ''}
                ${pendingShare > 0 ? `<span class="cartera-viva-hero__signal-segment is-pending" style="width:${pendingShare}%"></span>` : ''}
                ${lossShare > 0 ? `<span class="cartera-viva-hero__signal-segment is-loss" style="width:${lossShare}%"></span>` : ''}
            </span>
            <span class="cartera-viva-hero__signal-legend">
                <span>Cobrado</span>
                <span>Falta</span>
                <span>Pérdida</span>
            </span>
        </div>
    `;
}

function renderProgressSignalFromSummary(summary = null) {
    if (!summary || Number(summary.total || 0) <= 0) {
        return `
            <div class="cartera-viva-hero__signal cartera-viva-hero__signal--separated" aria-hidden="true">
                <span class="cartera-viva-hero__signal-track">
                    <span class="cartera-viva-progress__segment is-neutral" style="width:100%"></span>
                </span>
                <span class="cartera-viva-hero__signal-legend">
                    <span>Base separada</span>
                    <span>Sin suma forzada</span>
                </span>
            </div>
        `;
    }

    return `
        <div class="cartera-viva-hero__signal" aria-hidden="true">
            <span class="cartera-viva-hero__signal-track">
                ${summary.paidShare > 0 ? `<span class="cartera-viva-hero__signal-segment is-paid" style="width:${summary.paidShare}%"></span>` : ''}
                ${summary.pendingShare > 0 ? `<span class="cartera-viva-hero__signal-segment is-pending" style="width:${summary.pendingShare}%"></span>` : ''}
                ${summary.lossShare > 0 ? `<span class="cartera-viva-hero__signal-segment is-loss" style="width:${summary.lossShare}%"></span>` : ''}
            </span>
            <span class="cartera-viva-hero__signal-legend">
                <span>Cobrado</span>
                <span>Pendiente</span>
                <span>Pérdida</span>
            </span>
        </div>
    `;
}

function getOperationalFamilyUnitType(family) {
    const normalizedFamily = normalizeOperationalFamily(family);
    if (normalizedFamily === 'sacks') return 'saco';
    if (normalizedFamily === 'baskets') return 'cesta';
    if (normalizedFamily === 'kg') return 'kg';
    return 'unidad';
}

function summarizeOperationalFamilyRows(rows, family) {
    const normalizedFamily = normalizeOperationalFamily(family);
    const safeRows = filterRowsByOperationalFamily(rows, normalizedFamily);
    const unitType = getOperationalFamilyUnitType(normalizedFamily);
    let pending = 0;
    let paid = 0;
    let loss = 0;

    safeRows.forEach((row) => {
        const progress = getOperationalProgressByFamily(row, normalizedFamily);
        if (progress.mode !== 'unified' || progress.total <= 0) return;
        pending += Number(progress.pending || 0);
        paid += Number(progress.paid || 0);
        loss += Number(progress.loss || 0);
    });

    const total = Math.max(0, pending + paid + loss);
    const paidShare = total > 0 ? clampPercent((paid / total) * 100) : 0;
    const lossShare = total > 0 ? clampPercent((loss / total) * 100) : 0;
    const pendingShare = total > 0 ? clampPercent(Math.max(0, 100 - paidShare - lossShare)) : 0;

    return {
        family: normalizedFamily,
        label: getOperationalFamilyMeta(normalizedFamily).label,
        count: safeRows.length,
        unitType,
        pending,
        paid,
        loss,
        total,
        pendingUniversal: formatUniversalUnitValue(pending),
        paidUniversal: formatUniversalUnitValue(paid),
        lossUniversal: formatUniversalUnitValue(loss),
        totalUniversal: formatUniversalUnitValue(total),
        pendingConcrete: formatOperationalValue(pending, unitType),
        paidConcrete: formatOperationalValue(paid, unitType),
        lossConcrete: formatOperationalValue(loss, unitType),
        paidShare,
        pendingShare,
        lossShare
    };
}

function getOperationalFamilyCount(rows, family) {
    return summarizeOperationalFamilyRows(rows, family).count;
}

function renderOperationalFamilyControls(rows) {
    const filters = OPERATIONAL_FAMILY_ORDER.map((family) => ({
        id: family,
        label: getOperationalFamilyMeta(family).label,
        count: family === 'all' ? (Array.isArray(rows) ? rows.length : 0) : getOperationalFamilyCount(rows, family)
    })).filter((filter) => filter.id === 'all' || filter.count > 0);

    if (filters.length <= 1) return '';

    return `
        <div class="cartera-viva-family-bar" role="group" aria-label="Familia operativa">
            ${filters.map((filter) => `
                <button
                    type="button"
                    class="cartera-viva-family-chip${activeOperationalFamily === filter.id ? ' is-active' : ''}"
                    data-cartera-unit-family="${filter.id}"
                    aria-pressed="${activeOperationalFamily === filter.id ? 'true' : 'false'}">
                    <span>${filter.label}</span>
                    <span class="cartera-viva-family-chip__count">${formatCount(filter.count)}</span>
                </button>
            `).join('')}
        </div>
    `;
}

function resolveCategorySummary(rows, category) {
    if (category === 'sin-registro') {
        const count = Array.isArray(rows) ? rows.length : 0;
        return {
            mode: 'empty-cycle',
            label: '⚪ Sin registro',
            amount: `${formatCount(count)} cliente${count === 1 ? '' : 's'}`,
            copy: `${formatCount(count)} cliente${count === 1 ? '' : 's'} canónico${count === 1 ? '' : 's'} sin historial operativo todavía.`,
            stats: [
                { label: 'Pendiente', value: '0 unidades' },
                { label: 'Cobrado', value: '0 unidades' },
                { label: 'Pérdida', value: '0 unidades' }
            ],
            signal: null
        };
    }

    const familySummaries = ['sacks', 'baskets', 'kg']
        .map((family) => summarizeOperationalFamilyRows(rows, family))
        .filter((summary) => summary.count > 0 && summary.total > 0);

    if (activeOperationalFamily !== 'all') {
        const familySummary = summarizeOperationalFamilyRows(rows, activeOperationalFamily);
        if (familySummary.total > 0) {
            const categoryAmount = category === 'pagados'
                ? formatOperationalStatePhrase(familySummary.paid, 'cobrada', 'cobradas')
                : category === 'perdidos'
                    ? formatOperationalStatePhrase(familySummary.loss, 'perdida', 'perdidas')
                    : formatOperationalStatePhrase(familySummary.pending, 'pendiente', 'pendientes');
            const copy = `${familySummary.label} · ${formatCount(familySummary.count)} cliente${familySummary.count === 1 ? '' : 's'} visibles`;

            return {
                mode: 'family',
                label: familySummary.label,
                amount: categoryAmount,
                amountIsMoney: false,
                copy,
                stats: [
                    { label: 'Pendiente', value: familySummary.pendingConcrete },
                    { label: 'Cobrado', value: familySummary.paidConcrete },
                    { label: 'Pérdida', value: familySummary.lossConcrete }
                ],
                signal: familySummary
            };
        }

        return {
            mode: 'family-empty',
            label: getOperationalFamilyMeta(activeOperationalFamily).label,
            amount: 'Sin base operativa',
            amountIsMoney: false,
            copy: 'No hay registros visibles de esta familia en el contexto actual.',
            stats: [
                { label: 'Pendiente', value: '0 unidades' },
                { label: 'Cobrado', value: '0 unidades' },
                { label: 'Pérdida', value: '0 unidades' }
            ],
            signal: null
        };
    }

    if (familySummaries.length > 0) {
        return {
            mode: 'overview',
            label: 'Base operativa',
            amount: 'Separada por unidad',
            amountIsMoney: false,
            copy: 'Sacos, cestas y kilogramos se leen como familias independientes.',
            stats: familySummaries.map((summary) => ({
                label: summary.label,
                value: summary.totalUniversal,
                copy: `Pend ${summary.pendingUniversal} · Cob ${summary.paidUniversal} · Pér ${summary.lossUniversal}`
            })),
            signal: null
        };
    }

    const count = rows.length;
    const pending = rows.reduce((total, row) => total + getOutstandingBalance(row), 0);
    const paid = sumField(rows, 'paid_total');
    const loss = sumField(rows, 'loss_total');
    const review = rows.reduce((total, row) => total + getReviewTotal(row), 0);
    const pendingClients = rows.filter((row) => getOutstandingBalance(row) > 0).length;
    const readyClients = rows.filter((row) =>
        getOutstandingBalance(row) <= 0
        && Number(row?.paid_total || 0) <= 0
        && Number(row?.loss_total || 0) <= 0
        && Number(row?.credited_total || 0) <= 0
        && getReviewTotal(row) <= 0
    ).length;

    if (category === 'pagados') {
        return {
            label: '✅ Cobrado',
            amount: formatMoney(paid),
            amountIsMoney: true,
            copy: `${formatCount(count)} cliente${count === 1 ? '' : 's'} con saldo cerrado`,
            stats: [
                { label: 'Clientes', value: formatCount(count) },
                { label: 'Fiado total', value: formatMoney(sumField(rows, 'credited_total')), isMoney: true },
                { label: 'Por revisar', value: formatMoney(review), isMoney: true }
            ]
        };
    }

    if (category === 'perdidos') {
        return {
            label: '🔴 Pérdidas',
            amount: formatMoney(loss),
            amountIsMoney: true,
            copy: `${formatCount(count)} caso${count === 1 ? '' : 's'} cerrados fuera de cartera`,
            stats: [
                { label: 'Casos', value: formatCount(count) },
                { label: 'Cobrado antes', value: formatMoney(paid), isMoney: true },
                { label: 'Por revisar', value: formatMoney(review), isMoney: true }
            ]
        };
    }

    return {
        label: '🟡 Por cobrar',
        amount: formatMoney(pending),
        amountIsMoney: true,
        copy: pendingClients > 0
            ? `${formatCount(pendingClients)} cliente${pendingClients === 1 ? '' : 's'} con saldo activo${readyClients > 0 ? ` · ${formatCount(readyClients)} listos para registrar` : ''}`
            : `${formatCount(count)} cliente${count === 1 ? '' : 's'} listos para registrar`,
        stats: [
            { label: 'Clientes', value: formatCount(count) },
            { label: 'Ya cobrado', value: formatMoney(paid), isMoney: true },
            { label: 'Por revisar', value: formatMoney(review), isMoney: true }
        ]
    };
}

function renderHeaderSummary(filteredRows, options = {}) {
    if (options.loading) {
        return `
            <div class="cartera-viva-summary-strip cartera-viva-summary-strip--loading" aria-live="polite">
                <div class="cartera-viva-summary-strip__main">
                        <p class="cartera-viva-summary-strip__label">Cartera Viva</p>
                        <div class="cartera-viva-summary-strip__amount-row">
                            <strong class="cartera-viva-summary-strip__amount">Preparando lectura</strong>
                        <p class="cartera-viva-summary-strip__copy">Ordenando clientes, saldos y categorías visibles.</p>
                        </div>
                </div>
                <div class="cartera-viva-summary-strip__loading">
                    <span class="cartera-viva-loading-dot" aria-hidden="true"></span>
                    <span>Cargando cartera</span>
                </div>
            </div>
        `;
    }

    const summary = resolveCategorySummary(filteredRows, activeCategory);
    const amountMarkup = summary.amountIsMoney
        ? renderMoneyNode(summary.amount, {
            tag: 'strong',
            className: 'cartera-viva-summary-strip__amount'
        })
        : `<strong class="cartera-viva-summary-strip__amount">${escapeHtml(summary.amount)}</strong>`;
    return `
        <div class="cartera-viva-summary-strip">
            <div class="cartera-viva-summary-strip__main">
                <p class="cartera-viva-summary-strip__label">${summary.label}</p>
                <div class="cartera-viva-summary-strip__amount-row">
                    ${amountMarkup}
                    <p class="cartera-viva-summary-strip__copy">${summary.copy}</p>
                </div>
            </div>
            <div class="cartera-viva-summary-strip__signal">
                ${summary.mode === 'overview' || summary.mode === 'family-empty' || summary.mode === 'empty-cycle'
            ? renderProgressSignalFromSummary(null)
            : (summary.signal ? renderProgressSignalFromSummary(summary.signal) : renderHeroSignal(filteredRows))}
            </div>
            <div class="cartera-viva-summary-strip__stats">
                ${summary.stats.map((stat) => `
                        <div class="cartera-viva-summary-strip__stat">
                            <span class="cartera-viva-summary-strip__stat-label">${stat.label}</span>
                            ${stat.isMoney
                    ? renderMoneyNode(stat.value, {
                        tag: 'strong',
                        className: 'cartera-viva-summary-strip__stat-value'
                    })
                    : `<strong class="cartera-viva-summary-strip__stat-value">${escapeHtml(stat.value)}</strong>`}
                            ${stat.copy ? `<span class="cartera-viva-summary-strip__stat-copy">${stat.copy}</span>` : ''}
                        </div>
                    `).join('')}
            </div>
        </div>
    `;
}

function renderSearchBar() {
    return `
        <label class="cartera-viva-search" aria-label="Buscar cliente">
            <span class="cartera-viva-search__icon" aria-hidden="true">⌕</span>
            <input
                type="search"
                class="cartera-viva-search__input"
                data-cartera-search
                value="${escapeHtml(searchQuery)}"
                placeholder="Buscar cliente">
        </label>
    `;
}

function renderCropSelector() {
    const crops = getAvailableCrops();
    const snapshot = getCropSnapshot();
    const selectedId = getSelectedCropId();

    if (!crops.length && snapshot?.status === 'loading') {
        return `
            <div class="cartera-viva-crop-strip is-loading" aria-hidden="true">
                <span class="cartera-viva-crop-chip is-skeleton"></span>
                <span class="cartera-viva-crop-chip is-skeleton"></span>
                <span class="cartera-viva-crop-chip is-skeleton"></span>
            </div>
        `;
    }

    const buttons = [
        `
            <button
                type="button"
                class="cartera-viva-crop-chip${!selectedId ? ' is-active' : ''}"
                data-cartera-crop="${CARTERA_VIVA_GENERAL_CROP_ID}">
                Vista general
            </button>
        `
    ];

    crops.forEach((crop) => {
        const cropId = normalizeCropId(crop?.id);
        if (!cropId) return;
        const display = resolveCropDisplay(crop);
        buttons.push(`
            <button
                type="button"
                class="cartera-viva-crop-chip${selectedId === cropId ? ' is-active' : ''}"
                data-cartera-crop="${escapeHtml(cropId)}">
                ${escapeHtml(display.shortLabel)}
            </button>
        `);
    });

    return `
        <div class="cartera-viva-crop-picker">
            <span class="cartera-viva-crop-picker__label">Cultivo activo</span>
            <div class="cartera-viva-crop-strip" role="group" aria-label="Contexto de cultivo para nuevos registros">
                ${buttons.join('')}
            </div>
        </div>
    `;
}

function renderPrivacyStrip() {
    return `
        <div class="agro-privacy-strip cartera-viva-privacy-strip" aria-label="Controles de privacidad">
            <span class="agro-privacy-strip__label">Privacidad</span>
            <button type="button" class="btn-privacy-toggle" data-buyer-privacy-control="toggle" aria-pressed="false">
                👁 Ocultar nombres
            </button>
            <button type="button" class="btn-privacy-toggle" data-money-privacy-control="toggle" aria-pressed="false">
                💰 Ocultar montos
            </button>
        </div>
    `;
}

function renderToolbarControls() {
    return `
        <div class="cartera-viva-toolbar">
            ${renderSearchBar()}
            <div class="cartera-viva-toolbar__row">
                <div data-cartera-crop-picker-slot>
                    ${renderCropSelector()}
                </div>
                <button type="button" class="cartera-viva-quick-action" data-cartera-new-client>
                    Nuevo cliente
                </button>
            </div>
            ${renderPrivacyStrip()}
        </div>
    `;
}

function renderCommercialFamilyNav(activeView = CARTERA_VIVA_VIEW) {
    return `
        <div class="agro-commercial-family" aria-label="Operación comercial">
            <div class="agro-commercial-family__tabs" role="group" aria-label="Familia comercial">
                <button
                    type="button"
                    class="agro-commercial-family__tab${activeView === 'cartera-viva' ? ' is-active' : ''}"
                    data-agro-view="cartera-viva">
                    Cartera Viva
                </button>
                <button
                    type="button"
                    class="agro-commercial-family__tab${activeView === 'operational' ? ' is-active' : ''}"
                    data-agro-view="operational">
                    Cartera Operativa
                </button>
            </div>
        </div>
    `;
}

function renderScopeNote() {
    const selectedCropId = getSelectedCropId();
    if (selectedCropId) {
        return `Resumen, lista y detalle filtrados por ${escapeHtml(getSelectedCropShortLabel())}. Los clientes sin historial siguen visibles en Sin registro. Otros pertenece a Cartera Operativa.`;
    }
    return 'Otros pertenece a Cartera Operativa. Donaciones solo entra cuando la data real la sostiene.';
}

function renderCategoryControls(counts) {
    return CATEGORY_ORDER.map((category) => {
        const meta = CATEGORY_META[category];
        const isActive = activeCategory === category;
        return `
            <button
                type="button"
                class="cartera-viva-category${isActive ? ' is-active' : ''}"
                data-cartera-category="${category}"
                aria-pressed="${isActive ? 'true' : 'false'}">
                <span class="cartera-viva-category__label">${meta.label}</span>
                <span class="cartera-viva-category__count">${formatCount(counts[category])}</span>
            </button>
        `;
    }).join('');
}

function getOperationalCardMetrics(row) {
    const visibleFamilies = getVisibleOperationalProgressFamilies(row, activeOperationalFamily);
    const operationalProgress = getOperationalProgress(row);
    const hasHistory = hasBuyerPortfolioHistory(row);

    if (!hasHistory) {
        return {
            mode: 'empty',
            progressLabel: 'Avance operativo',
            progressValue: '0%',
            legendStart: 'Sin registros de historial',
            legendEnd: 'Estado inicial del cliente',
            metrics: [
                { label: 'Pendiente', value: '0 unidades' },
                { label: 'Cobrado', value: '0 unidades' },
                { label: 'Pérdida', value: '0 unidades' }
            ]
        };
    }

    if (visibleFamilies.length > 1 && activeOperationalFamily === 'all') {
        return {
            mode: 'family-collection',
            progressLabel: 'Base operativa',
            progressValue: `${formatCount(visibleFamilies.length)} familias`,
            legendStart: 'Lectura separada',
            legendEnd: 'Una barra por unidad',
            metrics: visibleFamilies.map((family) => ({
                label: family.label,
                value: family.totalLabel,
                copy: family.metricsCopy
            }))
        };
    }

    if (visibleFamilies.length === 1) {
        const familyProgress = visibleFamilies[0];
        const unitDescriptor = formatOperationalUnitDescriptor(familyProgress.unitType, familyProgress.total);
        return {
            mode: 'unified',
            progressLabel: 'Avance operativo',
            progressValue: familyProgress.progressValue,
            legendStart: `Base ${formatUniversalUnitValue(familyProgress.total)}`,
            legendEnd: unitDescriptor ? `Unidad real: ${unitDescriptor}` : 'Base operativa unificada',
            metrics: [
                { label: 'Pendiente', value: familyProgress.pendingLabel },
                { label: 'Cobrado', value: familyProgress.paidLabel },
                { label: 'Pérdida', value: familyProgress.lossLabel }
            ]
        };
    }

    if (operationalProgress.mode === 'unified') {
        const unitDescriptor = formatOperationalUnitDescriptor(operationalProgress.unitType, operationalProgress.total);
        return {
            mode: 'unified',
            progressLabel: 'Avance operativo',
            progressValue: formatPercent(operationalProgress.percent),
            legendStart: `Base ${formatUniversalUnitValue(operationalProgress.total)}`,
            legendEnd: unitDescriptor ? `Unidad real: ${unitDescriptor}` : 'Base operativa unificada',
            metrics: [
                { label: 'Pendiente', value: operationalProgress.pendingLabel },
                { label: 'Cobrado', value: operationalProgress.paidLabel },
                { label: 'Pérdida', value: operationalProgress.lossLabel }
            ]
        };
    }

    if (operationalProgress.mode === 'mixed') {
        return {
            mode: 'mixed',
            progressLabel: 'Avance operativo',
            progressValue: 'Sin %',
            legendStart: 'Unidades incompatibles',
            legendEnd: 'Revisa unidad canónica',
            metrics: [
                { label: 'Pendiente', value: 'No unificado' },
                { label: 'Cobrado', value: 'No unificado' },
                { label: 'Pérdida', value: 'No unificado' }
            ]
        };
    }

    return {
        mode: 'none',
        progressLabel: 'Avance operativo',
        progressValue: 'Sin %',
        legendStart: 'Sin unidades registradas',
        legendEnd: 'Usa unidad canónica',
        metrics: [
            { label: 'Pendiente', value: 'Sin unidades' },
            { label: 'Cobrado', value: 'Sin unidades' },
            { label: 'Pérdida', value: 'Sin unidades' }
        ]
    };
}

function renderOperationalProgressTrack(progressSummary = null) {
    if (!progressSummary || progressSummary.mode !== 'unified' || Number(progressSummary.total || progressSummary.base || 0) <= 0) {
        return '<span class="cartera-viva-progress__segment is-neutral" style="width:100%"></span>';
    }

    return `
        ${progressSummary.paidShare > 0 ? `<span class="cartera-viva-progress__segment is-paid" style="width:${progressSummary.paidShare}%"></span>` : ''}
        ${progressSummary.pendingShare > 0 ? `<span class="cartera-viva-progress__segment is-pending" style="width:${progressSummary.pendingShare}%"></span>` : ''}
        ${progressSummary.lossShare > 0 ? `<span class="cartera-viva-progress__segment is-loss" style="width:${progressSummary.lossShare}%"></span>` : ''}
    `;
}

function getSignalHeight(share, minimum = 4) {
    return Math.max(minimum, Math.round(clampPercent(share) / 7) + minimum);
}

function renderCardSignal(row) {
    const operationalProgress = getOperationalProgress(row);
    const hasHistory = hasBuyerPortfolioHistory(row);
    if (!hasHistory) {
        return `
            <svg class="cartera-viva-card__signal" viewBox="0 0 28 18" role="img" aria-label="Señal inicial del cliente">
                <rect class="is-empty" x="1" y="12" width="6" height="6" rx="2"></rect>
                <rect class="is-empty" x="11" y="12" width="6" height="6" rx="2"></rect>
                <rect class="is-empty" x="21" y="12" width="6" height="6" rx="2"></rect>
            </svg>
        `;
    }
    let paid = 6;
    let pending = 6;
    let third = 6;
    let thirdClass = 'is-review';

    if (operationalProgress.mode === 'unified' && operationalProgress.total > 0) {
        paid = getSignalHeight(operationalProgress.paidShare);
        pending = getSignalHeight(operationalProgress.pendingShare);
        third = getSignalHeight(operationalProgress.lossShare);
        thirdClass = 'is-loss';
    } else if (operationalProgress.mode === 'mixed') {
        pending = 10;
    }

    return `
        <svg class="cartera-viva-card__signal" viewBox="0 0 28 18" role="img" aria-label="Señal rápida del cliente">
            <rect x="1" y="${18 - paid}" width="6" height="${paid}" rx="2"></rect>
            <rect x="11" y="${18 - pending}" width="6" height="${pending}" rx="2"></rect>
            <rect class="${thirdClass}" x="21" y="${18 - third}" width="6" height="${third}" rx="2"></rect>
        </svg>
    `;
}

function renderSupportChips(row) {
    const chips = [];
    const review = getReviewTotal(row);
    const operationalProgress = getOperationalProgress(row);
    const operationalStatus = getOperationalStatusSnapshot(row, activeOperationalFamily);
    const visibleFamilies = getVisibleOperationalProgressFamilies(row, activeOperationalFamily);
    const hasHistory = hasBuyerPortfolioHistory(row);

    if (!hasHistory) return '';

    if (activeOperationalFamily === 'all' && visibleFamilies.length > 1) {
        chips.push('<span class="cartera-viva-chip">Base separada por unidad</span>');
    } else if (operationalProgress.mode === 'mixed') {
        chips.push('<span class="cartera-viva-chip is-review">Avance no unificado</span>');
    } else if (operationalProgress.mode === 'none') {
        chips.push('<span class="cartera-viva-chip">Sin base operativa</span>');
    }

    const partialChip = formatOperationalPartialChip(operationalStatus.primaryProgress);
    if (partialChip) {
        chips.push(`<span class="cartera-viva-chip">${partialChip}</span>`);
    }
    if (Number(row?.loss_total || 0) > 0) {
        chips.push(`<span class="cartera-viva-chip is-loss">Pérdida ${renderMoneyNode(formatMoney(row.loss_total))}</span>`);
    }
    if (review > 0) {
        chips.push(`<span class="cartera-viva-chip is-review">Por revisar ${renderMoneyNode(formatMoney(review))}</span>`);
    }
    if (Number(row?.non_debt_income_total || 0) > 0) {
        chips.push(`<span class="cartera-viva-chip">Ingreso registrado ${renderMoneyNode(formatMoney(row.non_debt_income_total))}</span>`);
    }

    if (chips.length <= 0) return '';

    return `
        <div class="cartera-viva-card__chips">
            ${chips.join('')}
        </div>
    `;
}

function renderProgressBlock(row, options = {}) {
    const large = options.large === true;
    const noLegend = options.noLegend === true;
    const metrics = getOperationalCardMetrics(row);
    const visibleFamilies = getVisibleOperationalProgressFamilies(row, activeOperationalFamily);
    const fallbackProgress = visibleFamilies[0] || getProgressBreakdown(row);

    if (visibleFamilies.length > 1 && activeOperationalFamily === 'all') {
        return `
            <div class="cartera-viva-progress-stack" aria-label="Avance por familia operativa">
                ${visibleFamilies.map((family) => `
                    <section class="cartera-viva-progress cartera-viva-progress--family${large ? ' cartera-viva-progress--large' : ''}">
                        <div class="cartera-viva-progress__head">
                            <span class="cartera-viva-progress__label">${family.label}</span>
                            <span class="cartera-viva-progress__value">${family.progressValue}</span>
                        </div>
                        <div class="cartera-viva-progress__track">
                            ${renderOperationalProgressTrack(family)}
                        </div>
                    </section>
                `).join('')}
            </div>
        `;
    }

    return `
        <section class="cartera-viva-progress${large ? ' cartera-viva-progress--large' : ''}">
            <div class="cartera-viva-progress__head">
                <span class="cartera-viva-progress__label">${metrics.progressLabel}</span>
                <span class="cartera-viva-progress__value">${metrics.progressValue}</span>
            </div>
            <div class="cartera-viva-progress__track">
                ${renderOperationalProgressTrack(fallbackProgress)}
            </div>
            ${!noLegend ? `
            <div class="cartera-viva-progress__legend">
                <span>${metrics.legendStart}</span>
                <span>${metrics.legendEnd}</span>
            </div>
            ` : ''}
        </section>
    `;
}

function renderPortfolioCard(row) {
    const category = resolveDisplayCategory(row);
    const status = resolveBuyerStatusForCategory(row, category);
    const metrics = getOperationalCardMetrics(row);
    const hasReview = getReviewTotal(row) > 0;
    const isArchived = String(row?.client_status || '').trim().toLowerCase() === 'archived';
    const safeBuyerId = escapeHtml(row?.buyer_id || '');
    const activeStateCount = [
        getOutstandingBalance(row) > 0,
        Number(row?.paid_total || 0) > 0,
        Number(row?.loss_total || 0) > 0
    ].filter(Boolean).length;
    const safeScope = activeStateCount > 1 ? 'todos' : escapeHtml(category);
    const safeEntryKey = escapeHtml(row?.__portfolioEntryKey || '');

    return `
        <article
            class="cartera-viva-card cartera-viva-card--${category}${row?.requires_review ? ' is-review' : ''}"
            data-portfolio-entry-key="${safeEntryKey}">
            <header class="cartera-viva-card__head">
                <div class="cartera-viva-card__identity">
                    ${renderBuyerNameNode(row?.display_name, {
        tag: 'h3',
        className: 'cartera-viva-card__title',
        fallback: 'Cliente sin nombre'
    })}
                    <p class="cartera-viva-card__subtitle">${escapeHtml(status.detail)}${row?.created_at ? ` · ${escapeHtml(formatShortDate(row.created_at))}` : ''}</p>
                </div>
                <div class="cartera-viva-card__head-side">
                    ${renderCardSignal(row)}
                    <span class="cartera-viva-badge cartera-viva-badge--${status.tone}">${status.label}</span>
                    ${isArchived ? '<span class="cartera-viva-badge cartera-viva-badge--review">Archivado</span>' : ''}
                    ${hasReview ? '<span class="cartera-viva-badge cartera-viva-badge--review">Revisar</span>' : ''}
                </div>
            </header>

            ${renderProgressBlock(row, { noLegend: true })}
            ${renderSupportChips(row)}

            <dl class="cartera-viva-card__metrics">
                ${metrics.metrics.map((metric) => `
                    <div class="cartera-viva-card__metric">
                        <dt>${metric.label}</dt>
                        <dd>${metric.value}</dd>
                        ${metric.copy ? `<span class="cartera-viva-card__metric-copy">${metric.copy}</span>` : ''}
                    </div>
                `).join('')}
            </dl>

            <div class="cartera-viva-card__footer">
                <button
                    type="button"
                    class="cartera-viva-detail-link"
                    data-cartera-edit-client="${safeBuyerId}">
                    Editar cliente
                </button>
                <button
                    type="button"
                    class="cartera-viva-detail-link"
                    data-cartera-open-history="${safeBuyerId}"
                    data-cartera-open-history-scope="${safeScope}">
                    Ver detalle
                </button>
                <button
                    type="button"
                    class="cartera-viva-quick-action cartera-viva-quick-action--danger"
                    data-cartera-delete-client="${safeBuyerId}">
                    Eliminar cliente canónico
                </button>
            </div>
        </article>
    `;
}

function renderPortfolioCards(filteredRows) {
    return filteredRows.map((row) => renderPortfolioCard(row)).join('');
}

function renderEmptyState(config = {}) {
    const title = escapeHtml(config.title || 'Sin datos para mostrar');
    const copy = escapeHtml(config.copy || 'Cartera Viva todavia no tiene una lectura disponible para esta vista.');
    const action = config.action === 'new-client'
        ? `
            <button type="button" class="cartera-viva-empty__action" data-cartera-new-client>
                Nuevo cliente
            </button>
        `
        : '';

    return `
        <div class="cartera-viva-empty">
            <div class="cartera-viva-empty__icon" aria-hidden="true">🧾</div>
            <h3 class="cartera-viva-empty__title">${title}</h3>
            <p class="cartera-viva-empty__copy">${copy}</p>
            ${action}
        </div>
    `;
}

function renderLoadingState() {
    return `
        <div class="cartera-viva-empty cartera-viva-empty--loading">
            <div class="cartera-viva-loading-dot" aria-hidden="true"></div>
            <h3 class="cartera-viva-empty__title">Cargando cartera</h3>
            <p class="cartera-viva-empty__copy">Ordenando clientes y saldos visibles.</p>
        </div>
    `;
}

function renderErrorState(message) {
    return renderEmptyState({
        title: 'No se pudo cargar Cartera Viva',
        copy: message || 'La vista no pudo leer los saldos de clientes. Intenta actualizar.'
    });
}

function getSelectedBuyerRow() {
    if (!selectedBuyerId) return null;
    const sourceRows = getSelectedCropId() ? getCropScopedRows(summaryRows) : summaryRows;
    return sourceRows.find((row) => String(row?.buyer_id || '') === selectedBuyerId) || null;
}

function getListViewState() {
    const selectedCropId = getSelectedCropId();
    const cropScopedRows = getCropScopedRows(summaryRows);
    const shouldBlockInitialLoading = !hasLoadedSummary && !lastErrorMessage;
    const isSoftRefreshing = loading && hasLoadedSummary;
    const categoryRows = filterRowsByCategory(cropScopedRows, activeCategory);
    const summaryRowsForHeader = categoryRows;
    const categoryCounts = getCategoryCounts(cropScopedRows, activeOperationalFamily);
    const filteredRows = activeCategory === 'sin-registro'
        ? categoryRows
        : filterRowsByOperationalFamily(categoryRows, activeOperationalFamily);
    let bodyMode = 'grid';
    let bodyContent = '';

    if (shouldBlockInitialLoading) {
        bodyMode = 'loading';
        bodyContent = renderLoadingState();
    } else if (visibleCropScopeLoading && selectedCropId) {
        bodyMode = 'crop-loading';
        bodyContent = renderEmptyState({
            title: 'Cargando clientes del cultivo',
            copy: `Buscando movimientos visibles para ${getSelectedCropShortLabel()}.`
        });
    } else if (visibleCropScopeError && selectedCropId) {
        bodyMode = 'error';
        bodyContent = renderErrorState(visibleCropScopeError);
    } else if (lastErrorMessage) {
        bodyMode = 'error';
        bodyContent = renderErrorState(lastErrorMessage);
    } else if (summaryRows.length <= 0) {
        bodyMode = 'empty';
        bodyContent = renderEmptyState({
            title: 'Todavía no hay clientes en Cartera Viva',
            copy: 'Crea tu primer cliente para empezar a registrar su historial desde aquí.',
            action: 'new-client'
        });
    } else if (filteredRows.length <= 0) {
        bodyMode = 'empty';
        const categoryMeta = CATEGORY_META[activeCategory];
        bodyContent = renderEmptyState({
            title: searchQuery ? 'Sin coincidencias en esta vista' : categoryMeta.emptyTitle,
            copy: searchQuery
                ? `No encontramos clientes para "${searchQuery}" dentro de ${categoryMeta.label.toLowerCase()}.`
                : (selectedCropId
                    ? `${categoryMeta.emptyCopy} Ahora mismo ${getSelectedCropShortLabel()} no tiene clientes visibles en esta categoría.`
                    : categoryMeta.emptyCopy)
        });
    } else {
        bodyContent = '';
    }

    return {
        selectedCropId,
        cropScopedRows,
        shouldBlockInitialLoading,
        isSoftRefreshing,
        summaryRowsForHeader,
        categoryCounts,
        categoryRows,
        filteredRows,
        bodyMode,
        bodyContent
    };
}

function renderListBody(state) {
    if (state.bodyMode === 'grid') {
        return `
            <div class="cartera-viva-grid" data-cartera-grid>
                ${renderPortfolioCards(state.filteredRows)}
            </div>
        `;
    }
    return state.bodyContent;
}

function renderListViewMarkup(state) {
    return `
        <section
            class="cartera-viva-view${state.isSoftRefreshing ? ' is-refreshing' : ''}"
            data-cartera-list-view
            aria-label="Cartera de clientes"
            aria-busy="${loading ? 'true' : 'false'}">
            <header class="cartera-viva-view__header">
                ${renderCommercialFamilyNav('cartera-viva')}
                <div class="cartera-viva-view__headline">
                    <div class="cartera-viva-view__copy">
                        <p class="cartera-viva-view__eyebrow">Cartera Viva</p>
                        <h2 class="cartera-viva-view__title">Cartera de clientes</h2>
                        <p class="cartera-viva-view__subtitle">Primero vive el cliente; luego sus movimientos.</p>
                    </div>
                <div class="cartera-viva-view__actions">
                    <button type="button" class="cartera-viva-refresh" data-cartera-new-client>
                        Nuevo cliente
                    </button>
                    <button type="button" class="cartera-viva-refresh" data-cartera-refresh ${loading ? 'disabled' : ''}>
                        ${loading ? 'Actualizando…' : 'Actualizar'}
                    </button>
                </div>
            </div>
                <div data-cartera-summary-slot>
                    ${renderHeaderSummary(state.summaryRowsForHeader, { loading: state.shouldBlockInitialLoading })}
                </div>
                <div data-cartera-family-controls-slot>
                    ${renderOperationalFamilyControls(state.summaryRowsForHeader)}
                </div>
            </header>

            ${renderToolbarControls()}

            <div class="cartera-viva-category-bar" data-cartera-category-bar role="group" aria-label="Categorias de Cartera Viva">
                ${renderCategoryControls(state.categoryCounts)}
            </div>

            <p class="cartera-viva-view__note" data-cartera-scope-note>${renderScopeNote()}</p>

            <div class="cartera-viva-view__body" data-cartera-view-body>
                ${renderListBody(state)}
            </div>
        </section>
    `;
}

function createPortfolioCardElement(row) {
    const template = document.createElement('template');
    template.innerHTML = renderPortfolioCard(row).trim();
    return template.content.firstElementChild;
}

function updatePortfolioCardNode(cardNode, row) {
    const nextNode = createPortfolioCardElement(row);
    if (!nextNode) return;
    cardNode.className = nextNode.className;
    cardNode.setAttribute('data-portfolio-entry-key', nextNode.getAttribute('data-portfolio-entry-key') || '');
    cardNode.innerHTML = nextNode.innerHTML;
}

function updatePortfolioGrid(gridNode, rows) {
    if (!gridNode) return;

    const existingNodes = new Map(
        Array.from(gridNode.querySelectorAll('[data-portfolio-entry-key]')).map((node) => [
            String(node.getAttribute('data-portfolio-entry-key') || '').trim(),
            node
        ])
    );
    const fragment = document.createDocumentFragment();

    rows.forEach((row) => {
        const entryKey = String(row?.__portfolioEntryKey || '').trim();
        let cardNode = existingNodes.get(entryKey) || null;
        if (cardNode) {
            updatePortfolioCardNode(cardNode, row);
            existingNodes.delete(entryKey);
        } else {
            cardNode = createPortfolioCardElement(row);
        }
        if (cardNode) fragment.appendChild(cardNode);
    });

    existingNodes.forEach((node) => node.remove());
    gridNode.replaceChildren(fragment);
}

function updateListBody(bodyNode, state) {
    if (!bodyNode) return;

    const currentGrid = bodyNode.querySelector('[data-cartera-grid]');
    if (state.bodyMode !== 'grid') {
        if (loading && currentGrid && state.bodyMode !== 'error') {
            return;
        }
        bodyNode.innerHTML = renderListBody(state);
        return;
    }

    if (!currentGrid) {
        bodyNode.innerHTML = renderListBody(state);
        return;
    }

    updatePortfolioGrid(currentGrid, state.filteredRows);
}

function patchListView(root, state) {
    const viewNode = root.querySelector('[data-cartera-list-view]');
    if (!viewNode) return;

    viewNode.className = `cartera-viva-view${state.isSoftRefreshing ? ' is-refreshing' : ''}`;
    viewNode.setAttribute('aria-busy', loading ? 'true' : 'false');

    const refreshButton = viewNode.querySelector('[data-cartera-refresh]');
    if (refreshButton) {
        refreshButton.disabled = loading;
        refreshButton.textContent = loading ? 'Actualizando…' : 'Actualizar';
    }

    const summarySlot = viewNode.querySelector('[data-cartera-summary-slot]');
    if (summarySlot) {
        summarySlot.innerHTML = renderHeaderSummary(state.summaryRowsForHeader, {
            loading: state.shouldBlockInitialLoading
        });
    }

    const familyControlsSlot = viewNode.querySelector('[data-cartera-family-controls-slot]');
    if (familyControlsSlot) {
        familyControlsSlot.innerHTML = renderOperationalFamilyControls(state.summaryRowsForHeader);
    }

    const searchInput = viewNode.querySelector('[data-cartera-search]');
    if (searchInput && document.activeElement !== searchInput && searchInput.value !== searchQuery) {
        searchInput.value = searchQuery;
    }

    const cropSlot = viewNode.querySelector('[data-cartera-crop-picker-slot]');
    if (cropSlot) {
        cropSlot.innerHTML = renderCropSelector();
    }

    const categoryBar = viewNode.querySelector('[data-cartera-category-bar]');
    if (categoryBar) {
        categoryBar.innerHTML = renderCategoryControls(state.categoryCounts);
    }

    const scopeNote = viewNode.querySelector('[data-cartera-scope-note]');
    if (scopeNote) {
        scopeNote.textContent = renderScopeNote();
    }

    updateListBody(viewNode.querySelector('[data-cartera-view-body]'), state);
}

function renderListView(root) {
    const state = getListViewState();
    const hasShell = root.querySelector('[data-cartera-list-view]');

    if (!hasShell) {
        root.innerHTML = renderListViewMarkup(state);
        return;
    }

    patchListView(root, state);
}

function renderView() {
    const root = getRootNode();
    if (!root) return;

    const selectedBuyerRow = getSelectedBuyerRow();
    if (selectedBuyerId) {
        renderBuyerHistoryDetail(root, {
            buyerRow: selectedBuyerRow,
            historyRows: detailRows,
            loading: detailLoading,
            errorMessage: detailErrorMessage,
            exportPending: detailExportPending,
            exportMessage: detailExportMessage,
            exportTone: detailExportTone,
            historyFilter: detailHistoryFilter,
            ledgerScope: detailLedgerScope,
            unitFamily: activeOperationalFamily,
            selectedPair: detailSelectedPair,
            exchangeRates: detailExchangeRates,
            exchangeStatus: detailExchangeStatus,
            onBack: () => {
                resetDetailState();
                renderView();
            },
            onRefresh: () => {
                if (!selectedBuyerId) return;
                loadBuyerDetail(selectedBuyerId);
            },
            onEditClient: () => {
                const buyerRow = getSelectedBuyerRow();
                if (!buyerRow?.buyer_id) return;
                openBuyerProfileById(buyerRow.buyer_id, buyerRow.display_name || '');
            },
            onOpenRecord: (tabName) => {
                const buyerRow = getSelectedBuyerRow();
                if (!buyerRow) return;
                openClientRecordWizard(tabName, buyerRow);
            },
            onExport: () => {
                exportBuyerDetail();
            },
            onCreateCycle: (context) => {
                createOperationalCycleFromCartera(context);
            },
            onHistoryFilterChange: (nextFilter) => {
                detailHistoryFilter = normalizeDetailHistoryFilter(nextFilter);
                renderView();
            },
            onLedgerScopeChange: (nextScope) => {
                detailLedgerScope = normalizeDetailLedgerScope(nextScope);
                renderView();
            },
            onUnitFamilyChange: (nextFamily) => {
                activeOperationalFamily = normalizeOperationalFamily(nextFamily);
                writeStoredOperationalFamily(activeOperationalFamily);
                renderView();
            },
            onPairChange: (nextPair) => {
                detailSelectedPair = String(nextPair || '').trim().toUpperCase() === 'USD/VES' ? 'USD/VES' : 'USD/COP';
                writeStoredDetailPair(detailSelectedPair);
                renderView();
            }
        });
        return;
    }

    renderListView(root);
    bindListViewEvents(root);
}

async function syncVisibleCropScope(options = {}) {
    const selectedCropId = getSelectedCropId();
    const requestId = ++visibleCropScopeRequestId;
    const shouldRender = options.render !== false;

    if (!selectedCropId) {
        visibleCropScopeKeys = null;
        visibleCropScopeId = null;
        visibleCropScopeLoading = false;
        visibleCropScopeError = '';
        if (shouldRender) renderView();
        return;
    }

    visibleCropScopeLoading = true;
    visibleCropScopeError = '';
    visibleCropScopeId = selectedCropId;
    if (shouldRender) renderView();

    try {
        const nextKeys = await fetchBuyerPortfolioCropScopeKeys(supabase, selectedCropId);
        if (requestId !== visibleCropScopeRequestId) return;
        visibleCropScopeKeys = nextKeys;
    } catch (error) {
        if (requestId !== visibleCropScopeRequestId) return;
        console.error('[CarteraViva] crop scope load failed:', error?.message || error);
        visibleCropScopeKeys = new Set();
        visibleCropScopeError = String(error?.message || 'No se pudo filtrar la cartera por cultivo.');
    } finally {
        if (requestId !== visibleCropScopeRequestId) return;
        visibleCropScopeLoading = false;
        if (shouldRender) renderView();
    }
}

async function loadSummary() {
    loading = true;
    lastErrorMessage = '';
    renderView();

    try {
        const selectedCropId = getSelectedCropId();
        const [nextSummaryRows, nextBuyerDirectoryRows, nextOperationalProgress] = await Promise.all([
            fetchBuyerPortfolioSummary(supabase),
            fetchBuyerDirectorySummaryRows().catch((error) => {
                console.warn('[CarteraViva] buyer directory fallback unavailable:', error?.message || error);
                return [];
            }),
            fetchOperationalProgressMap(supabase, selectedCropId).catch((error) => {
                console.warn('[CarteraViva] operational progress load failed:', error?.message || error);
                return {
                    aggregateMap: new Map(),
                    familyMap: new Map()
                };
            })
        ]);
        summaryRows = mergeSummaryRowsWithBuyerDirectory(nextSummaryRows, nextBuyerDirectoryRows);
        cropScopedSummaryMap = nextOperationalProgress?.summaryMap instanceof Map
            ? nextOperationalProgress.summaryMap
            : new Map();
        operationalProgressMap = nextOperationalProgress?.aggregateMap instanceof Map
            ? nextOperationalProgress.aggregateMap
            : new Map();
        operationalProgressFamilyMap = nextOperationalProgress?.familyMap instanceof Map
            ? nextOperationalProgress.familyMap
            : new Map();
        await syncVisibleCropScope({ render: false });
    } catch (error) {
        console.error('[CarteraViva] summary load failed:', error?.message || error);
        lastErrorMessage = String(error?.message || 'Error leyendo la cartera de clientes.');
        summaryRows = [];
        cropScopedSummaryMap = new Map();
        operationalProgressMap = new Map();
        operationalProgressFamilyMap = new Map();
        visibleCropScopeKeys = null;
        visibleCropScopeId = null;
        visibleCropScopeLoading = false;
        visibleCropScopeError = '';
    } finally {
        loading = false;
        hasLoadedSummary = true;
        renderView();
    }
}

async function loadBuyerDetail(buyerId, options = {}) {
    const nextBuyerId = String(buyerId || '').trim();
    const switchingBuyer = nextBuyerId !== selectedBuyerId;
    const nextLedgerScope = Object.prototype.hasOwnProperty.call(options, 'ledgerScope')
        ? normalizeDetailLedgerScope(options.ledgerScope)
        : (switchingBuyer ? 'todos' : detailLedgerScope);
    // Reset history filter when switching to a different buyer to avoid showing
    // an empty "transferidos" or "revertidos" tab for clients that have no such rows.
    if (switchingBuyer) {
        detailHistoryFilter = 'todos';
        detailRows = [];
    }
    detailLedgerScope = nextLedgerScope;
    selectedBuyerId = nextBuyerId;
    detailLoading = true;
    detailErrorMessage = '';
    resetDetailExportState();
    renderView();

    try {
        const buyerRow = getSelectedBuyerRow();
        const [nextHistoryRows, nextExchangeRates] = await Promise.all([
            fetchBuyerHistoryTimeline(supabase, buyerRow, {
                cropId: getSelectedCropId()
            }),
            initExchangeRates().catch(() => null)
        ]);
        detailRows = nextHistoryRows;
        if (nextExchangeRates && typeof nextExchangeRates === 'object') {
            detailExchangeRates = nextExchangeRates;
        }
        detailExchangeStatus = getExchangeStatus();
    } catch (error) {
        console.error('[CarteraViva] buyer detail load failed:', error?.message || error);
        detailErrorMessage = String(error?.message || 'Error leyendo el historial contextual del cliente.');
        detailRows = [];
    } finally {
        detailLoading = false;
        renderView();
    }
}

function setDetailExportState(message = '', tone = '') {
    detailExportMessage = String(message || '').trim();
    detailExportTone = String(tone || '').trim().toLowerCase();
}

async function exportBuyerDetail() {
    const buyerRow = getSelectedBuyerRow();
    if (!buyerRow) {
        setDetailExportState('No se encontró el cliente activo para exportar.', 'error');
        renderView();
        return;
    }

    if (detailLoading) {
        setDetailExportState('Espera a que termine de cargar el historial antes de exportar.', 'error');
        renderView();
        return;
    }

    if (detailErrorMessage) {
        setDetailExportState('Actualiza el historial antes de exportar este cliente.', 'error');
        renderView();
        return;
    }

    detailExportPending = true;
    setDetailExportState('', '');
    renderView();

    try {
        const visibleHistoryRows = getVisibleBuyerHistoryRows(detailRows, detailHistoryFilter, detailLedgerScope, activeOperationalFamily);
        const fileName = downloadBuyerPortfolioExport({
            buyerRow,
            historyRows: visibleHistoryRows
        });
        setDetailExportState(`Exportado: ${fileName}`, 'success');
    } catch (error) {
        console.error('[CarteraViva] buyer export failed:', error?.message || error);
        setDetailExportState(String(error?.message || 'No se pudo generar la exportación del cliente.'), 'error');
    } finally {
        detailExportPending = false;
        renderView();
    }
}

function bindListViewEvents(root) {
    if (root.dataset.carteraListEventsBound === '1') return;
    root.dataset.carteraListEventsBound = '1';

    root.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (!target.matches('[data-cartera-search]')) return;
        if (!root.querySelector('[data-cartera-list-view]')) return;

        searchQuery = normalizeSearchQuery(target.value);
        writeStoredSearch(searchQuery);
        renderView();
    });

    root.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!root.querySelector('[data-cartera-list-view]')) return;

        const categoryButton = target.closest('[data-cartera-category]');
        if (categoryButton) {
            const nextCategory = normalizeCategory(categoryButton.getAttribute('data-cartera-category'));
            if (nextCategory === activeCategory) return;
            activeCategory = nextCategory;
            writeStoredCategory(activeCategory);
            renderView();
            return;
        }

        const familyButton = target.closest('[data-cartera-unit-family]');
        if (familyButton) {
            const nextFamily = normalizeOperationalFamily(familyButton.getAttribute('data-cartera-unit-family'));
            if (nextFamily === activeOperationalFamily) return;
            activeOperationalFamily = nextFamily;
            writeStoredOperationalFamily(activeOperationalFamily);
            renderView();
            return;
        }

        if (target.closest('[data-cartera-refresh]')) {
            loadSummary();
            return;
        }

        if (target.closest('[data-cartera-new-client]')) {
            openNewBuyerProfile('');
            return;
        }

        const cropButton = target.closest('[data-cartera-crop]');
        if (cropButton) {
            if (typeof window === 'undefined' || typeof window.setSelectedCropId !== 'function') return;
            const cropId = cropButton.getAttribute('data-cartera-crop') === CARTERA_VIVA_GENERAL_CROP_ID
                ? null
                : normalizeCropId(cropButton.getAttribute('data-cartera-crop'));
            window.setSelectedCropId(cropId);
            return;
        }

        const detailButton = target.closest('[data-cartera-open-history]');
        if (detailButton) {
            const buyerId = String(detailButton.getAttribute('data-cartera-open-history') || '').trim();
            const ledgerScope = normalizeDetailLedgerScope(
                detailButton.getAttribute('data-cartera-open-history-scope') || activeCategory
            );
            if (!buyerId) return;
            loadBuyerDetail(buyerId, { ledgerScope });
            return;
        }

        const editButton = target.closest('[data-cartera-edit-client]');
        if (editButton) {
            const buyerId = String(editButton.getAttribute('data-cartera-edit-client') || '').trim();
            const row = summaryRows.find((entry) => String(entry?.buyer_id || '').trim() === buyerId) || null;
            if (!buyerId) return;
            openBuyerProfileById(buyerId, row?.display_name || '');
            return;
        }

        const deleteButton = target.closest('[data-cartera-delete-client]');
        if (deleteButton) {
            const buyerId = String(deleteButton.getAttribute('data-cartera-delete-client') || '').trim();
            const row = summaryRows.find((entry) => String(entry?.buyer_id || '').trim() === buyerId) || null;
            if (!buyerId) return;
            openBuyerProfileById(buyerId, row?.display_name || '', {
                focusAction: 'delete'
            });
        }
    });
}

function resetDetailState() {
    selectedBuyerId = '';
    detailRows = [];
    detailLoading = false;
    detailErrorMessage = '';
    detailHistoryFilter = 'todos';
    detailLedgerScope = 'todos';
    resetDetailExportState();
}

function resetDetailExportState() {
    detailExportPending = false;
    detailExportMessage = '';
    detailExportTone = '';
}

function scheduleExternalPortfolioRefresh() {
    if (String(document.body?.dataset?.agroActiveView || '').trim().toLowerCase() !== CARTERA_VIVA_VIEW) return;

    if (externalRefreshTimer) {
        clearTimeout(externalRefreshTimer);
    }

    externalRefreshTimer = window.setTimeout(() => {
        externalRefreshTimer = 0;
        const activeBuyerId = selectedBuyerId;
        void (async () => {
            await loadSummary();
            if (activeBuyerId) {
                await loadBuyerDetail(activeBuyerId);
            }
        })();
    }, 350);
}

function handleShellViewChanged(event) {
    const nextView = String(event?.detail?.view || '').trim().toLowerCase();
    if (nextView !== CARTERA_VIVA_VIEW) return;

    if (!hasLoadedSummary) {
        loadSummary();
        return;
    }

    renderView();
}

async function handleCropContextUpdated() {
    if (String(document.body?.dataset?.agroActiveView || '').trim().toLowerCase() !== CARTERA_VIVA_VIEW) return;
    await loadSummary();
    if (selectedBuyerId) {
        await loadBuyerDetail(selectedBuyerId);
        return;
    }
    renderView();
}

function openClientRecordWizard(tabName, buyerRow) {
    const safeTab = String(tabName || '').trim().toLowerCase();
    if (!['pendientes', 'ingresos', 'perdidas'].includes(safeTab)) return false;
    if (typeof window === 'undefined' || typeof window.launchAgroWizard !== 'function') return false;

    const cropId = getSelectedCropId();
    if (typeof window.setSelectedCropId === 'function') {
        window.setSelectedCropId(cropId || null);
    }

    window.launchAgroWizard(safeTab, {
        initialCropId: cropId || null,
        debtContext: true,
        prefill: {
            who: String(buyerRow?.display_name || '').trim()
        }
    });
    return true;
}

function handleClientChanged(event) {
    const clientId = String(event?.detail?.clientId || '').trim();
    const groupKey = normalizeBuyerGroupKey(event?.detail?.groupKey || '');
    const openDetail = event?.detail?.openDetail === true;
    const created = event?.detail?.created === true;
    const deleted = event?.detail?.deleted === true;

    void (async () => {
        if (created && clientId) {
            activeCategory = 'sin-registro';
            writeStoredCategory(activeCategory);
            activeOperationalFamily = 'all';
            writeStoredOperationalFamily(activeOperationalFamily);
        }
        // Pin buyer to crop scope both for new clients and existing clients
        // saved through the wizard (openDetail signals wizard-originated save).
        if ((created || openDetail) && clientId) {
            pinBuyerToCurrentCropScope(clientId, groupKey);
        }
        if (deleted && clientId) {
            unpinBuyerFromSessionCropScopes(clientId, groupKey);
        }
        await loadSummary();
        if (clientId && openDetail) {
            // For existing clients, navigate to the buyer's actual category
            if (!created) {
                const buyerRow = getSelectedBuyerRow();
                if (buyerRow) {
                    const buyerCategory = resolveVisibleCategory(buyerRow);
                    if (buyerCategory !== activeCategory) {
                        activeCategory = buyerCategory;
                        writeStoredCategory(activeCategory);
                    }
                }
            }
            await loadBuyerDetail(clientId, { ledgerScope: 'todos' });
            return;
        }

        if (deleted && selectedBuyerId === clientId) {
            resetDetailState();
            renderView();
            return;
        }

        if (selectedBuyerId) {
            await loadBuyerDetail(selectedBuyerId);
        }
    })();
}

export function initAgroCarteraVivaView() {
    if (initialized) {
        syncCarteraVivaGlobalContext();
        if (String(document.body?.dataset?.agroActiveView || '').trim().toLowerCase() === CARTERA_VIVA_VIEW) {
            loadSummary();
        }
        return;
    }

    initialized = true;
    getRootNode();
    syncCarteraVivaGlobalContext();
    renderView();
    window.addEventListener('agro:shell:view-changed', handleShellViewChanged);
    window.addEventListener('agro:crop:changed', handleCropContextUpdated);
    window.addEventListener('AGRO_CROPS_READY', handleCropContextUpdated);
    document.addEventListener('data-refresh', scheduleExternalPortfolioRefresh);
    document.addEventListener('agro:income:changed', scheduleExternalPortfolioRefresh);
    document.addEventListener('agro:losses:changed', scheduleExternalPortfolioRefresh);
    document.addEventListener('agro:pending:refreshed', scheduleExternalPortfolioRefresh);
    document.addEventListener('agro:transfers:refreshed', scheduleExternalPortfolioRefresh);
    document.addEventListener('agro:client:changed', handleClientChanged);

    if (String(document.body?.dataset?.agroActiveView || '').trim().toLowerCase() === CARTERA_VIVA_VIEW) {
        loadSummary();
    }
}
