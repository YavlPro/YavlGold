import { convertToUSD, getRate, initExchangeRates } from './agro-exchange.js';
import { assertOperationalPeriodOpen, mountAgroPeriodCycles, unmountAgroPeriodCycles } from './agro-period-cycles.js';

const ROOT_ID = 'agro-operational-root';
const PERIOD_ROOT_ID = 'agro-period-cycles-root';
const VIEW_NAME = 'operational';
const PERIOD_VIEW_NAME = 'period-cycles';
const SUBVIEW_ACTIVE = 'active';
const SUBVIEW_FINISHED = 'finished';
const SUBVIEW_DONATIONS = 'donations';
const SUBVIEW_LOSSES = 'losses';
const SUBVIEW_EXPORT = 'export';
const FAMILY_LINKED = 'linked';
const FAMILY_UNLINKED = 'unlinked';
const FAMILY_ALL = 'all';
const FAMILY_OPTIONS = Object.freeze([FAMILY_LINKED, FAMILY_UNLINKED, FAMILY_ALL]);
const CROPS_READY_EVENT = 'AGRO_CROPS_READY';
const VIEW_CHANGED_EVENT = 'agro:shell:view-changed';
const MODE_CHANGE_EVENT = 'agro:modechange';
const OPERATIONAL_PORTFOLIO_UPDATED_EVENT = 'agro:operational-portfolio-updated';
const EMPTY_AMOUNT_LABEL = '📝 Monto no anotado';
const EMPTY_BALANCE_LABEL = '📝 Sin balance monetario';

const ACTIVE_STATUS_VALUES = Object.freeze(['open', 'in_progress', 'compensating']);
const FINISHED_STATUS_VALUES = Object.freeze(['closed', 'lost']);
const SUBVIEW_OPTIONS = Object.freeze([SUBVIEW_ACTIVE, SUBVIEW_FINISHED, SUBVIEW_DONATIONS, SUBVIEW_LOSSES, SUBVIEW_EXPORT]);
const CURRENCY_OPTIONS = Object.freeze(['COP', 'USD', 'VES']);
const CROP_DISPLAY_FALLBACK_ICON = '🌱';
const CROP_DISPLAY_FALLBACK_NAME = 'Cultivo';
const CROP_EMOJI_TOKEN_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
const CROP_TEXT_TOKEN_RE = /[\p{L}\p{N}]/u;

const ECONOMIC_TYPE_OPTIONS = Object.freeze([
    { value: 'expense', label: '💸 Gasto' },
    { value: 'income', label: '💰 Ingreso' },
    { value: 'donation', label: '🤝 Donación / Regalo' },
    { value: 'loss', label: '💔 Pérdida' }
]);

const CATEGORY_OPTIONS = Object.freeze([
    { value: 'tools', label: '🔧 Herramientas' },
    { value: 'maintenance', label: '🛠️ Mantenimiento' },
    { value: 'labor', label: '👷 Mano de obra' },
    { value: 'transport', label: '🚛 Transporte' },
    { value: 'supplies', label: '📦 Insumos' },
    { value: 'other', label: '📋 Otro' }
]);

const STATUS_OPTIONS = Object.freeze([
    { value: 'open', label: '🟡 No pagado' },
    { value: 'in_progress', label: '🟠 En seguimiento' },
    { value: 'compensating', label: '🟠 Compensándose' },
    { value: 'closed', label: '✅ Pagado' },
    { value: 'lost', label: '🔴 Perdido' }
]);

const CREATE_STATUS_OPTIONS = Object.freeze([
    { value: 'open', label: '🟡 No pagado' },
    { value: 'closed', label: '✅ Pagado' }
]);

const UNIT_TYPE_OPTIONS = Object.freeze([
    { value: 'unidad', label: 'Unidad' },
    { value: 'saco', label: 'Saco' },
    { value: 'cesta', label: 'Cesta' },
    { value: 'kg', label: 'Kg' }
]);

const PERIOD_OPTIONS = Object.freeze([
    { value: 'week', label: '📅 Esta semana' },
    { value: 'month', label: '📅 Este mes' },
    { value: 'quarter', label: '📅 Este trimestre' },
    { value: 'year', label: '📅 Este año' },
    { value: 'all', label: '📅 Todo' }
]);

const CATEGORY_FILTER_OPTIONS = Object.freeze([
    { value: 'all', label: '📁 Todas las categorías' },
    ...CATEGORY_OPTIONS
]);

const TYPE_FILTER_OPTIONS = Object.freeze([
    { value: 'all', label: '💰 Todos los tipos' },
    ...ECONOMIC_TYPE_OPTIONS
]);

const DIRECTION_BY_TYPE = Object.freeze({
    expense: 'out',
    income: 'in',
    donation: 'out',
    loss: 'out'
});

const STATUS_CLASS_BY_VALUE = Object.freeze({
    open: 'is-open',
    in_progress: 'is-in-progress',
    compensating: 'is-compensating',
    closed: 'is-closed',
    lost: 'is-lost'
});

const TYPE_CLASS_BY_VALUE = Object.freeze({
    expense: 'is-expense',
    income: 'is-income',
    donation: 'is-donation',
    loss: 'is-loss'
});

const WIZARD_STEPS = Object.freeze([
    { id: 1, eyebrow: 'Paso 1', title: '¿Qué pasó?' },
    { id: 2, eyebrow: 'Paso 2', title: '¿Cómo se clasifica?' },
    { id: 3, eyebrow: 'Paso 3', title: '¿Cuánto y cuándo?' },
    { id: 4, eyebrow: 'Paso 4', title: 'Confirmar' }
]);

const state = {
    root: null,
    refs: null,
    supabase: null,
    userId: '',
    crops: [],
    datasets: createDatasetsState(),
    portfolioByCrop: new Map(),
    operationalExpensesByCrop: new Map(),
    operationalPendingByCrop: new Map(),
    exchangeRates: { USD: 1, COP: null, VES: null },
    cycleIndex: new Map(),
    initialized: false,
    loadedOnce: false,
    loading: false,
    saving: false,
    needsRefresh: false,
    modalOpen: false,
    currentView: '',
    currentSubview: SUBVIEW_ACTIVE,
    familyFilter: FAMILY_LINKED,
    editId: '',
    schemaMissing: false,
    cropDeletedAtSupported: true,
    lastCascadeCheck: null,
    ui: createUiState(),
    form: createFormState()
};

function createDefaultFilters() {
    return {
        period: 'all',
        category: 'all',
        economicType: 'all'
    };
}

function createDatasetState() {
    return {
        filters: createDefaultFilters(),
        cycles: [],
        summary: createDatasetSummary([])
    };
}

function createDatasetsState() {
    return {
        [SUBVIEW_ACTIVE]: createDatasetState(),
        [SUBVIEW_FINISHED]: createDatasetState()
    };
}

function createUiState() {
    return {
        detailsOpen: new Map()
    };
}

function createClosedPortfolioState(cropId = '') {
    return {
        cropId: normalizeId(cropId),
        totalCycles: 0,
        openCycles: 0,
        closedCycles: 0,
        lostCycles: 0,
        status: 'closed',
        tone: 'closed',
        label: 'Cartera operativa cerrada'
    };
}

function serializePortfolioState(entry) {
    const safeEntry = entry && typeof entry === 'object'
        ? entry
        : createClosedPortfolioState('');
    return {
        cropId: normalizeId(safeEntry.cropId),
        totalCycles: Number(safeEntry.totalCycles || 0),
        openCycles: Number(safeEntry.openCycles || 0),
        closedCycles: Number(safeEntry.closedCycles || 0),
        lostCycles: Number(safeEntry.lostCycles || 0),
        status: safeEntry.openCycles > 0 ? 'open' : 'closed',
        tone: safeEntry.openCycles > 0 ? 'active' : 'closed',
        label: safeEntry.openCycles > 0 ? 'Cartera operativa abierta' : 'Cartera operativa cerrada'
    };
}

function toFiniteNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeExchangeRates(rates = null) {
    return {
        USD: 1,
        COP: toPositiveNumber(rates?.COP),
        VES: toPositiveNumber(rates?.VES)
    };
}

function hasOperationalExchangeRates(rates = null) {
    const safeRates = sanitizeExchangeRates(rates);
    return Boolean(safeRates.COP || safeRates.VES);
}

async function ensureOperationalExchangeRates() {
    if (hasOperationalExchangeRates(state.exchangeRates)) {
        return sanitizeExchangeRates(state.exchangeRates);
    }

    try {
        state.exchangeRates = sanitizeExchangeRates(await initExchangeRates());
    } catch (error) {
        console.warn('[agroOperationalCycles] No se pudieron inicializar tasas de cambio:', error);
        state.exchangeRates = sanitizeExchangeRates(state.exchangeRates);
    }

    return sanitizeExchangeRates(state.exchangeRates);
}

function resolveMovementExchangeRate(movement, exchangeRates = state.exchangeRates) {
    const currency = String(movement?.currency || 'USD').trim().toUpperCase();
    if (currency === 'USD') return 1;

    const persistedRate = toPositiveNumber(movement?.exchange_rate);
    if (persistedRate) return persistedRate;

    return toPositiveNumber(getRate(currency, sanitizeExchangeRates(exchangeRates)));
}

function resolveMovementAmountUsd(movement, exchangeRates = state.exchangeRates) {
    const amount = toFiniteNumber(movement?.amount);
    if (amount == null || amount <= 0) return 0;

    const persistedUsd = toPositiveNumber(movement?.amount_usd);
    if (persistedUsd) return persistedUsd;

    const currency = String(movement?.currency || 'USD').trim().toUpperCase();
    if (currency === 'USD') return amount;

    const rate = resolveMovementExchangeRate(movement, exchangeRates);
    if (!rate) return 0;

    const converted = toFiniteNumber(convertToUSD(amount, currency, rate));
    return converted != null && converted > 0 ? converted : 0;
}

function sumOutgoingMovementsUsd(movements = [], exchangeRates = state.exchangeRates) {
    return (Array.isArray(movements) ? movements : []).reduce((total, movement) => {
        if (movement?.direction === 'in') return total;
        return total + resolveMovementAmountUsd(movement, exchangeRates);
    }, 0);
}

function rebuildPortfolioByCrop(exchangeRates = state.exchangeRates) {
    const index = new Map();
    const expenseIndex = new Map();
    const pendingIndex = new Map();
    const registerAmount = (targetIndex, cropId, amountUsd) => {
        if (!(amountUsd > 0)) return;
        targetIndex.set(cropId, (targetIndex.get(cropId) || 0) + amountUsd);
    };
    const registerCycle = (cycle) => {
        const cropId = normalizeId(cycle?.crop_id);
        if (!cropId) return;

        const current = index.get(cropId) || createClosedPortfolioState(cropId);
        current.totalCycles += 1;

        if (ACTIVE_STATUS_VALUES.includes(normalizeToken(cycle?.status))) {
            current.openCycles += 1;
        } else if (normalizeToken(cycle?.status) === 'lost') {
            current.lostCycles += 1;
        } else {
            current.closedCycles += 1;
        }

        index.set(cropId, current);

        const outgoingUsd = sumOutgoingMovementsUsd(cycle?.movements, exchangeRates);
        if (!(outgoingUsd > 0)) return;

        const status = normalizeToken(cycle?.status);
        if (isLossCycle(cycle)) {
            registerAmount(expenseIndex, cropId, outgoingUsd);
            return;
        }
        if (status === 'closed') {
            registerAmount(expenseIndex, cropId, outgoingUsd);
            return;
        }
        if (ACTIVE_STATUS_VALUES.includes(status)) {
            registerAmount(pendingIndex, cropId, outgoingUsd);
        }
    };

    state.datasets[SUBVIEW_ACTIVE].cycles.forEach(registerCycle);
    state.datasets[SUBVIEW_FINISHED].cycles.forEach(registerCycle);
    state.portfolioByCrop = index;
    state.operationalExpensesByCrop = expenseIndex;
    state.operationalPendingByCrop = pendingIndex;
}

function getPortfolioStateByCrop(cropId) {
    const normalizedCropId = normalizeId(cropId);
    if (!normalizedCropId) return null;
    const entry = state.portfolioByCrop.get(normalizedCropId);
    if (!entry) return null;
    return serializePortfolioState(entry);
}

function getOperationalExpensesByCrop() {
    return state.operationalExpensesByCrop instanceof Map
        ? new Map(state.operationalExpensesByCrop)
        : new Map();
}

function getOperationalPendingByCrop() {
    return state.operationalPendingByCrop instanceof Map
        ? new Map(state.operationalPendingByCrop)
        : new Map();
}

function emitPortfolioSnapshot() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(OPERATIONAL_PORTFOLIO_UPDATED_EVENT, {
        detail: {
            portfolioByCrop: Array.from(state.portfolioByCrop.values()).map((entry) => serializePortfolioState(entry))
        }
    }));
}

function createDraftValues(overrides = {}) {
    return {
        name: '',
        description: '',
        economicType: 'expense',
        category: 'other',
        cropId: '',
        amount: '',
        currency: 'COP',
        movementDate: todayLocalIso(),
        quantity: '',
        unitType: '',
        closeOnSave: false,
        status: 'open',
        notes: '',
        ...overrides
    };
}

function createFormState(overrides = {}) {
    return {
        mode: 'create',
        step: 1,
        values: createDraftValues(),
        ...overrides
    };
}

function normalizeToken(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeId(value) {
    return String(value || '').trim();
}

function normalizeOperationalSubview(value) {
    const token = normalizeToken(value);
    return SUBVIEW_OPTIONS.includes(token) ? token : SUBVIEW_ACTIVE;
}

function normalizeFamilyFilter(value) {
    const token = normalizeToken(value);
    return FAMILY_OPTIONS.includes(token) ? token : FAMILY_LINKED;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function renderMoneyNode(value, { tag = 'span', className = '' } = {}) {
    const safeValue = String(value ?? '').trim();
    const classAttr = className ? ` class="${escapeAttr(className)}"` : '';
    if (!safeValue) return `<${tag}${classAttr}></${tag}>`;
    if (!/\d/.test(safeValue)) {
        return `<${tag}${classAttr}>${escapeHtml(safeValue)}</${tag}>`;
    }
    return `<${tag}${classAttr} data-money="1" data-raw-money="${escapeAttr(safeValue)}">${escapeHtml(safeValue)}</${tag}>`;
}

function todayLocalIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isValidLocalDateIso(value) {
    const raw = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
    const [year, month, day] = raw.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year
        && parsed.getMonth() === month - 1
        && parsed.getDate() === day;
}

function assertMovementDateAllowed(value) {
    const safeDate = String(value || '').trim();
    if (!safeDate) {
        throw new Error('La fecha del movimiento es obligatoria.');
    }
    if (!isValidLocalDateIso(safeDate)) {
        throw new Error('La fecha del movimiento no es válida.');
    }
    if (safeDate > todayLocalIso()) {
        throw new Error('No se permiten fechas futuras.');
    }
    return safeDate;
}

function currentMonthKey() {
    return todayLocalIso().slice(0, 7);
}

function isMissingColumnError(error, columnName) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes(String(columnName || '').toLowerCase());
}

function isSchemaMissingError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('agro_operational_cycles')
        || message.includes('agro_operational_movements')
        || message.includes('does not exist')
        || message.includes('could not find')
        || String(error?.code || '') === '42P01';
}

function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function readLabel(options, value, fallback = 'Sin definir') {
    const token = normalizeToken(value);
    const match = options.find((option) => option.value === token);
    return match?.label || fallback;
}

function formatDateLabel(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'Sin fecha';
    const date = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('es-VE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function formatCurrencyValue(value, currency = 'COP') {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return EMPTY_AMOUNT_LABEL;
    const code = CURRENCY_OPTIONS.includes(String(currency || '').toUpperCase())
        ? String(currency).toUpperCase()
        : 'COP';
    const locale = code === 'USD' ? 'en-US' : (code === 'VES' ? 'es-VE' : 'es-CO');
    const fractionDigits = Number.isInteger(amount) ? 0 : 2;
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatSignedCurrencyValue(value, currency = 'COP') {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return EMPTY_BALANCE_LABEL;
    const sign = amount > 0 ? '+' : (amount < 0 ? '-' : '');
    return `${sign}${formatCurrencyValue(Math.abs(amount), currency)}`;
}

function toNullableNumber(value, label) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`${label} no es valido.`);
    }
    return parsed;
}

function toNullableText(value) {
    const text = String(value ?? '').trim();
    return text ? text : null;
}

function ensureAllowedValue(value, allowedValues, message) {
    const token = normalizeToken(value);
    if (allowedValues.includes(token)) return token;
    throw new Error(message);
}

function derivePrimaryConcept(name, description) {
    return String(description || name || '').trim() || 'Movimiento inicial';
}

function createMoneyBucket() {
    return new Map();
}

function addMoneyAmount(bucket, currency, amount) {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) return;
    const code = CURRENCY_OPTIONS.includes(String(currency || '').toUpperCase())
        ? String(currency).toUpperCase()
        : 'COP';
    bucket.set(code, (bucket.get(code) || 0) + numeric);
}

function mergeMoneyBuckets(target, source) {
    source.forEach((value, key) => {
        target.set(key, (target.get(key) || 0) + value);
    });
    return target;
}

function subtractMoneyBuckets(incoming, outgoing) {
    const bucket = createMoneyBucket();
    mergeMoneyBuckets(bucket, incoming);
    outgoing.forEach((value, key) => {
        bucket.set(key, (bucket.get(key) || 0) - value);
    });
    return bucket;
}

function formatMoneyBucket(bucket, options = {}) {
    const map = bucket instanceof Map ? bucket : createMoneyBucket();
    if (map.size === 0) {
        return options.emptyText || EMPTY_AMOUNT_LABEL;
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, value]) => (
            options.signed
                ? formatSignedCurrencyValue(value, currency)
                : formatCurrencyValue(value, currency)
        ))
        .join(' · ');
}

function resolveBalanceTone(balanceBucket) {
    const values = Array.from((balanceBucket instanceof Map ? balanceBucket : createMoneyBucket()).values());
    if (values.length !== 1) return 'gold';
    const value = values[0];
    if (value > 0) return 'success';
    if (value < 0) return 'danger';
    return 'gold';
}

function summarizeMovements(movements = []) {
    const incoming = createMoneyBucket();
    const outgoing = createMoneyBucket();

    movements.forEach((movement) => {
        if (movement?.amount == null) return;
        if (movement.direction === 'in') {
            addMoneyAmount(incoming, movement.currency, movement.amount);
            return;
        }
        addMoneyAmount(outgoing, movement.currency, movement.amount);
    });

    return {
        incoming,
        outgoing,
        balance: subtractMoneyBuckets(incoming, outgoing)
    };
}

function isCropEmojiToken(token) {
    const value = String(token || '').trim();
    if (!value) return false;
    return CROP_EMOJI_TOKEN_RE.test(value) && !CROP_TEXT_TOKEN_RE.test(value);
}

function normalizeCropIcon(icon, fallback = CROP_DISPLAY_FALLBACK_ICON) {
    const value = String(icon || '').trim();
    if (isCropEmojiToken(value)) return value;
    return String(fallback || CROP_DISPLAY_FALLBACK_ICON).trim() || CROP_DISPLAY_FALLBACK_ICON;
}

function buildCropDisplay(crop) {
    const rawName = String(crop?.name || '').trim();
    const tokens = rawName ? rawName.split(/\s+/).filter(Boolean) : [];
    const leadingIcons = [];
    let cursor = 0;

    while (cursor < tokens.length && isCropEmojiToken(tokens[cursor])) {
        leadingIcons.push(tokens[cursor]);
        cursor += 1;
    }

    const cleanedName = tokens.slice(cursor).join(' ').trim();
    const iconFromName = leadingIcons.length ? leadingIcons[leadingIcons.length - 1] : '';
    const icon = normalizeCropIcon(iconFromName || crop?.icon);
    const name = cleanedName || (rawName && leadingIcons.length === 0 ? rawName : CROP_DISPLAY_FALLBACK_NAME);
    const variety = String(crop?.variety || '').trim();
    return {
        id: normalizeId(crop?.id),
        icon,
        name,
        variety,
        label: variety ? `${icon} ${name} (${variety})` : `${icon} ${name}`
    };
}

function readRuntimeCropsSnapshot() {
    const snapshot = globalThis?.__AGRO_CROPS_STATE;
    if (!snapshot || !Array.isArray(snapshot.crops) || snapshot.crops.length === 0) {
        return [];
    }

    const runtimeUserId = normalizeId(snapshot.userId);
    const expectedUserId = normalizeId(state.userId || globalThis?.YG_AGRO_CROPS_USER_ID);
    if (expectedUserId && runtimeUserId && runtimeUserId !== expectedUserId) {
        return [];
    }

    return snapshot.crops.filter((crop) => normalizeId(crop?.id));
}

function getAvailableCrops() {
    const cropIndex = new Map();

    [state.crops, readRuntimeCropsSnapshot()].forEach((source) => {
        (Array.isArray(source) ? source : []).forEach((crop) => {
            const cropId = normalizeId(crop?.id);
            if (!cropId || cropIndex.has(cropId)) return;
            cropIndex.set(cropId, crop);
        });
    });

    return Array.from(cropIndex.values());
}

function sortMovementsAscending(left, right) {
    const leftKey = `${left?.movement_date || ''} ${left?.created_at || ''}`;
    const rightKey = `${right?.movement_date || ''} ${right?.created_at || ''}`;
    return leftKey.localeCompare(rightKey);
}

function directionSummaryLabel(direction, economicType) {
    if (direction === 'in') return '💰 Recibí / Cobré';
    if (normalizeToken(economicType) === 'donation') return '🤝 Donación / Regalo';
    return '💸 Pagué / Gasté';
}

function directionDetailLabel(direction, economicType) {
    if (direction === 'in') return '💰 Entrada de dinero';
    if (normalizeToken(economicType) === 'donation') return '🤝 Donación / Regalo';
    return '💸 Salida de dinero';
}

function formatAmountLabel(amount, currency) {
    return amount == null ? EMPTY_AMOUNT_LABEL : formatCurrencyValue(amount, currency);
}

function formatPhysicalUnitLabel(unitType, quantity) {
    const token = normalizeToken(unitType);
    const singular = Math.abs(Number(quantity) - 1) < 1e-9;
    if (token === 'kg') return 'kg';
    if (token === 'saco') return singular ? 'saco' : 'sacos';
    if (token === 'cesta') return singular ? 'cesta' : 'cestas';
    return singular ? 'unidad' : 'unidades';
}

function formatUniversalQuantityLabel(quantity) {
    const numeric = Number(quantity);
    if (!Number.isFinite(numeric) || numeric <= 0) return '0 unidades';
    return `${numeric} ${Math.abs(numeric - 1) < 1e-9 ? 'unidad' : 'unidades'}`;
}

function formatQuantityLabel(quantity, unitType) {
    if (quantity == null || !unitType) return 'Sin cantidad física';
    return `${quantity} ${formatPhysicalUnitLabel(unitType, quantity)}`;
}

function summarizePhysicalMovements(movements = []) {
    const physicalMovements = (Array.isArray(movements) ? movements : []).filter((movement) =>
        movement?.quantity != null && Number.isFinite(Number(movement.quantity)) && Number(movement.quantity) > 0 && movement?.unit_type
    );
    const familyBuckets = new Map();

    physicalMovements.forEach((movement) => {
        const unitType = normalizeToken(movement.unit_type);
        const familyKey = unitType === 'saco'
            ? 'sacks'
            : (unitType === 'cesta'
                ? 'baskets'
                : (unitType === 'kg' ? 'kg' : 'other'));
        if (familyKey === 'other') return;
        if (!familyBuckets.has(familyKey)) {
            familyBuckets.set(familyKey, {
                id: familyKey,
                label: familyKey === 'sacks' ? 'Sacos' : (familyKey === 'baskets' ? 'Cestas' : 'Kilogramos'),
                unitType,
                total: 0
            });
        }
        familyBuckets.get(familyKey).total += Number(movement.quantity || 0);
    });
    const familyList = Array.from(familyBuckets.values()).map((family) => ({
        ...family,
        totalText: formatQuantityLabel(family.total, family.unitType)
    }));

    if (physicalMovements.length <= 0) {
        return {
            mode: 'none',
            unitType: '',
            total: 0,
            incoming: 0,
            outgoing: 0,
            summaryText: 'Sin unidades',
            hintText: 'Sin base física registrada en este ciclo.',
            families: []
        };
    }

    const unitTypes = Array.from(new Set(physicalMovements.map((movement) => normalizeToken(movement.unit_type)).filter(Boolean)));
    if (unitTypes.length !== 1) {
        return {
            mode: 'mixed',
            unitType: '',
            total: 0,
            incoming: 0,
            outgoing: 0,
            summaryText: 'Base separada por unidad',
            hintText: 'Hay mezcla de unidades físicas dentro del mismo ciclo.',
            families: familyList
        };
    }

    const unitType = unitTypes[0];
    const incoming = physicalMovements
        .filter((movement) => movement.direction === 'in')
        .reduce((total, movement) => total + Number(movement.quantity || 0), 0);
    const outgoing = physicalMovements
        .filter((movement) => movement.direction !== 'in')
        .reduce((total, movement) => total + Number(movement.quantity || 0), 0);
    const total = incoming + outgoing;
    const unitDescriptor = formatPhysicalUnitLabel(unitType, total > 1 ? total : 2);

    return {
        mode: 'unified',
        unitType,
        total,
        incoming,
        outgoing,
        summaryText: formatQuantityLabel(total, unitType),
        hintText: `Unidad real: ${unitDescriptor} · Entradas: ${formatQuantityLabel(incoming, unitType)} · Salidas: ${formatQuantityLabel(outgoing, unitType)}`,
        families: familyList
    };
}

function buildCycleViewModel(cycle, movementsByCycle, cropMap) {
    const cycleId = normalizeId(cycle?.id);
    const movements = Array.isArray(movementsByCycle.get(cycleId))
        ? [...movementsByCycle.get(cycleId)]
        : [];
    movements.sort(sortMovementsAscending);

    const summary = summarizeMovements(movements);
    const primaryMovement = movements[0] || null;
    const crop = cycle?.crop_id ? cropMap.get(normalizeId(cycle.crop_id)) || null : null;
    const movementCount = movements.length;
    const direction = primaryMovement?.direction || deriveMovementDirection(cycle?.economic_type);

    return {
        id: cycleId,
        name: String(cycle?.name || 'Cartera operativa').trim() || 'Cartera operativa',
        description: toNullableText(cycle?.description),
        economic_type: normalizeToken(cycle?.economic_type),
        category: normalizeToken(cycle?.category),
        crop_id: normalizeId(cycle?.crop_id),
        crop,
        status: normalizeToken(cycle?.status || 'open'),
        opened_at: String(cycle?.opened_at || '').trim(),
        closed_at: String(cycle?.closed_at || '').trim(),
        notes: toNullableText(cycle?.notes),
        created_at: String(cycle?.created_at || '').trim(),
        updated_at: String(cycle?.updated_at || '').trim(),
        movements,
        primaryMovement,
        movementCount,
        direction,
        incomingText: formatMoneyBucket(summary.incoming, { emptyText: EMPTY_AMOUNT_LABEL }),
        outgoingText: formatMoneyBucket(summary.outgoing, { emptyText: EMPTY_AMOUNT_LABEL }),
        balanceText: formatMoneyBucket(summary.balance, { signed: true, emptyText: EMPTY_BALANCE_LABEL }),
        balanceTone: resolveBalanceTone(summary.balance),
        physicalSummary: summarizePhysicalMovements(movements),
        summary
    };
}

function createDatasetSummary(cycles = []) {
    const incoming = createMoneyBucket();
    const outgoing = createMoneyBucket();
    let linkedCount = 0;
    let unlinkedCount = 0;
    let movementCount = 0;

    cycles.forEach((cycle) => {
        if (cycle.crop_id) linkedCount += 1;
        else unlinkedCount += 1;
        movementCount += Number(cycle.movementCount || 0);
        mergeMoneyBuckets(incoming, cycle.summary.incoming);
        mergeMoneyBuckets(outgoing, cycle.summary.outgoing);
    });

    const balance = subtractMoneyBuckets(incoming, outgoing);

    return {
        count: cycles.length,
        linkedCount,
        unlinkedCount,
        movementCount,
        incoming,
        outgoing,
        balance,
        incomingText: formatMoneyBucket(incoming, { emptyText: EMPTY_AMOUNT_LABEL }),
        outgoingText: formatMoneyBucket(outgoing, { emptyText: EMPTY_AMOUNT_LABEL }),
        balanceText: formatMoneyBucket(balance, { signed: true, emptyText: EMPTY_BALANCE_LABEL }),
        balanceTone: resolveBalanceTone(balance)
    };
}

function normalizeOperationalError(error) {
    if (error instanceof Error && error.message) {
        if (isSchemaMissingError(error)) {
            return 'Falta aplicar la migración de Cartera Operativa en Supabase.';
        }
        return error.message;
    }
    return 'No se pudo completar la operación.';
}

function notify(message, type = 'info') {
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    if (type === 'error') {
        console.error('[agroOperationalCycles]', message);
        return;
    }
    console.info('[agroOperationalCycles]', message);
}

function setFeedback(message = '', tone = 'info') {
    const text = String(message || '').trim();
    const feedbackNodes = [state.refs?.feedback, state.refs?.modalFeedback].filter(Boolean);
    if (feedbackNodes.length === 0) return;
    feedbackNodes.forEach((feedback) => {
        feedback.textContent = text;
        feedback.dataset.tone = tone;
        feedback.classList.toggle('is-visible', !!text);
    });
}

function clearFeedback() {
    setFeedback('', 'info');
}

function setDraftFieldValue(key, value) {
    state.form.values[key] = value;
}

function getDataset(subview) {
    const key = subview === SUBVIEW_FINISHED ? SUBVIEW_FINISHED : SUBVIEW_ACTIVE;
    return state.datasets[key];
}

function getAllCycles() {
    return [
        ...state.datasets[SUBVIEW_ACTIVE].cycles,
        ...state.datasets[SUBVIEW_FINISHED].cycles
    ];
}

function rebuildCycleIndex() {
    state.cycleIndex = new Map();
    getAllCycles().forEach((cycle) => {
        state.cycleIndex.set(cycle.id, cycle);
    });
}

async function getSupabaseClient() {
    if (state.supabase) return state.supabase;
    if (typeof globalThis !== 'undefined' && globalThis.__YG_AGRO_SUPABASE) {
        state.supabase = globalThis.__YG_AGRO_SUPABASE;
        return state.supabase;
    }
    const mod = await import('../assets/js/config/supabase-config.js');
    state.supabase = mod.default || mod.supabase;
    return state.supabase;
}

async function ensureUserId(initialUserId = '') {
    const preferredId = normalizeId(initialUserId || state.userId || globalThis?.YG_AGRO_CROPS_USER_ID);
    if (preferredId) {
        state.userId = preferredId;
        return preferredId;
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    const userId = normalizeId(data?.user?.id);
    if (!userId) {
        throw new Error('No se pudo resolver la sesión activa de Agro.');
    }

    state.userId = userId;
    return userId;
}

async function fetchCrops(supabase, userId) {
    let query = supabase
        .from('agro_crops')
        .select(state.cropDeletedAtSupported ? 'id,name,variety,icon,deleted_at' : 'id,name,variety,icon')
        .eq('user_id', userId)
        .order('name');

    if (state.cropDeletedAtSupported) {
        query = query.is('deleted_at', null);
    }

    const { data, error } = await query;
    if (error && state.cropDeletedAtSupported && isMissingColumnError(error, 'deleted_at')) {
        state.cropDeletedAtSupported = false;
        return fetchCrops(supabase, userId);
    }
    if (error) throw error;

    return (data || []).filter((crop) => !crop?.deleted_at);
}

function getPeriodRange(period) {
    const token = normalizeToken(period);
    if (!token || token === 'all') return null;

    const now = new Date();
    const end = todayLocalIso();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (token === 'week') {
        const weekday = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - weekday);
    } else if (token === 'month') {
        start.setDate(1);
    } else if (token === 'quarter') {
        start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
    } else if (token === 'year') {
        start.setMonth(0, 1);
    } else {
        return null;
    }

    const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    return { start: startIso, end };
}

async function fetchCycles(supabase, userId, filters, statuses) {
    let query = supabase
        .from('agro_operational_cycles')
        .select('id,user_id,name,description,economic_type,category,crop_id,status,opened_at,closed_at,notes,created_at,updated_at')
        .eq('user_id', userId)
        .in('status', statuses)
        .order('opened_at', { ascending: false })
        .order('created_at', { ascending: false });

    const category = normalizeToken(filters?.category);
    const economicType = normalizeToken(filters?.economicType);
    const period = normalizeToken(filters?.period);

    if (category && category !== 'all') {
        query = query.eq('category', category);
    }

    if (economicType && economicType !== 'all') {
        query = query.eq('economic_type', economicType);
    }

    const range = getPeriodRange(period);
    if (range?.start) {
        query = query.gte('opened_at', range.start);
    }
    if (range?.end) {
        query = query.lte('opened_at', range.end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function fetchMovements(supabase, userId, cycleIds = []) {
    if (!Array.isArray(cycleIds) || cycleIds.length === 0) return [];

    const { data, error } = await supabase
        .from('agro_operational_movements')
        .select('id,user_id,cycle_id,direction,amount,currency,amount_usd,exchange_rate,concept,movement_date,quantity,unit_type,created_at')
        .eq('user_id', userId)
        .in('cycle_id', cycleIds)
        .order('movement_date', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

async function validateCropId(supabase, userId, cropId) {
    const normalizedId = normalizeId(cropId);
    if (!normalizedId) return null;

    let query = supabase
        .from('agro_crops')
        .select(state.cropDeletedAtSupported ? 'id,deleted_at' : 'id')
        .eq('id', normalizedId)
        .eq('user_id', userId);

    if (state.cropDeletedAtSupported) {
        query = query.is('deleted_at', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error && state.cropDeletedAtSupported && isMissingColumnError(error, 'deleted_at')) {
        state.cropDeletedAtSupported = false;
        return validateCropId(supabase, userId, normalizedId);
    }
    if (error) throw error;
    if (!data?.id) {
        throw new Error('Cultivo no valido.');
    }
    return normalizedId;
}

function ensureLocalCropSelection(cropId) {
    const normalizedId = normalizeId(cropId);
    if (!normalizedId) return '';
    // When crops haven't loaded yet (API path / root not mounted), skip local check;
    // DB validation in createCycleRecord / validateCropId will catch invalid IDs.
    const availableCrops = getAvailableCrops();
    if (availableCrops.length === 0) return normalizedId;
    const isOwnedCrop = availableCrops.some((crop) => buildCropDisplay(crop).id === normalizedId);
    if (!isOwnedCrop) {
        throw new Error('Cultivo no valido.');
    }
    return normalizedId;
}

function normalizePayload(source = {}, options = {}) {
    const mode = options.mode === 'edit' ? 'edit' : 'create';
    const existingCycle = options.existingCycle || null;
    const name = String(source.name || '').trim();
    if (!name) {
        throw new Error('El nombre del ciclo es obligatorio.');
    }

    const description = toNullableText(source.description);
    const economicType = ensureAllowedValue(
        source.economicType || source.economic_type,
        ECONOMIC_TYPE_OPTIONS.map((option) => option.value),
        'Tipo económico no valido.'
    );
    const category = ensureAllowedValue(
        source.category,
        CATEGORY_OPTIONS.map((option) => option.value),
        'Categoría no valida.'
    );
    const movementDate = assertMovementDateAllowed(source.movementDate || source.movement_date || source.openedAt || source.opened_at || todayLocalIso());

    const amount = toNullableNumber(source.amount, 'El monto');
    const quantity = toNullableNumber(source.quantity, 'La cantidad');
    const unitTypeRaw = toNullableText(source.unitType || source.unit_type);
    const unitType = unitTypeRaw
        ? ensureAllowedValue(
            unitTypeRaw,
            UNIT_TYPE_OPTIONS.map((option) => option.value),
            'Unidad no valida.'
        )
        : null;

    if ((quantity == null) !== (unitType == null)) {
        throw new Error('Cantidad y unidad deben viajar juntas.');
    }

    const currencyRaw = String(source.currency || 'COP').trim().toUpperCase();
    const currency = CURRENCY_OPTIONS.includes(currencyRaw) ? currencyRaw : 'COP';

    let status = mode === 'edit'
        ? ensureAllowedValue(
            source.status || existingCycle?.status || 'open',
            STATUS_OPTIONS.map((option) => option.value),
            'Estado no valido.'
        )
        : 'open';

    const requestedStatus = normalizeToken(source.status);
    if (mode === 'create' && STATUS_OPTIONS.some((option) => option.value === requestedStatus)) {
        status = requestedStatus;
    }

    return {
        name,
        description,
        economicType,
        category,
        cropId: ensureLocalCropSelection(source.cropId || source.crop_id),
        amount,
        currency,
        movementDate,
        quantity,
        unitType,
        status,
        notes: mode === 'edit' ? toNullableText(source.notes) : null
    };
}

async function deriveMovementPayload(userId, cycleId, payload) {
    const amount = toFiniteNumber(payload.amount);
    const currency = String(payload.currency || 'USD').trim().toUpperCase();
    const exchangeRates = currency === 'USD'
        ? sanitizeExchangeRates(state.exchangeRates)
        : await ensureOperationalExchangeRates();
    const exchangeRate = resolveMovementExchangeRate({ currency }, exchangeRates);
    const amountUsd = amount == null
        ? null
        : (currency === 'USD'
            ? amount
            : (exchangeRate ? convertToUSD(amount, currency, exchangeRate) : null));

    return {
        user_id: userId,
        cycle_id: cycleId,
        direction: deriveMovementDirection(payload.economicType),
        amount,
        currency,
        amount_usd: toFiniteNumber(amountUsd),
        exchange_rate: currency === 'USD' ? 1 : exchangeRate,
        concept: derivePrimaryConcept(payload.name, payload.description),
        movement_date: payload.movementDate,
        quantity: payload.quantity,
        unit_type: payload.unitType
    };
}

export function deriveMovementDirection(economicType) {
    return DIRECTION_BY_TYPE[normalizeToken(economicType)] || 'out';
}

async function upsertInitialMovement(supabase, userId, cycleId, movementId, payload) {
    const movementPayload = await deriveMovementPayload(userId, cycleId, payload);
    if (movementId) {
        const { error } = await supabase
            .from('agro_operational_movements')
            .update(movementPayload)
            .eq('id', movementId)
            .eq('user_id', userId);

        if (error) throw error;
        return movementId;
    }

    const { data, error } = await supabase
        .from('agro_operational_movements')
        .insert(movementPayload)
        .select('id')
        .single();

    if (error) throw error;
    return normalizeId(data?.id);
}

async function verifyCascadeDelete(supabase, userId, cycleId) {
    const { count, error } = await supabase
        .from('agro_operational_movements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('cycle_id', cycleId);

    if (error) return null;
    return Number(count || 0) === 0;
}

async function createCycleRecord(payload) {
    const supabase = await getSupabaseClient();
    const userId = await ensureUserId();
    await assertOperationalPeriodOpen({
        movementDate: payload?.movementDate,
        userId
    });
    const cropId = await validateCropId(supabase, userId, payload.cropId);
    const closedAt = payload.status === 'closed' ? todayLocalIso() : null;

    const cyclePayload = {
        user_id: userId,
        name: payload.name,
        description: payload.description,
        economic_type: payload.economicType,
        category: payload.category,
        crop_id: cropId,
        status: payload.status,
        opened_at: payload.movementDate,
        closed_at: closedAt,
        notes: null
    };

    const { data, error } = await supabase
        .from('agro_operational_cycles')
        .insert(cyclePayload)
        .select('id,name')
        .single();

    if (error) throw error;

    const cycleId = normalizeId(data?.id);
    try {
        await upsertInitialMovement(supabase, userId, cycleId, '', payload);
    } catch (movementError) {
        await supabase
            .from('agro_operational_cycles')
            .delete()
            .eq('id', cycleId)
            .eq('user_id', userId);
        throw movementError;
    }

    return {
        cycleId,
        message: payload.status === 'closed'
            ? 'Cartera operativa creada y cerrada.'
            : 'Cartera operativa creada.'
    };
}

async function updateCycleRecord(cycleId, payload) {
    const supabase = await getSupabaseClient();
    const userId = await ensureUserId();
    await assertOperationalPeriodOpen({
        movementDate: payload?.movementDate,
        userId
    });
    const existingCycle = state.cycleIndex.get(cycleId);
    if (!existingCycle) {
        throw new Error('No se encontró la cartera operativa a editar.');
    }

    const cropId = await validateCropId(supabase, userId, payload.cropId);
    const closedAt = payload.status === 'closed'
        ? (existingCycle.closed_at || todayLocalIso())
        : null;

    const cyclePayload = {
        name: payload.name,
        description: payload.description,
        economic_type: payload.economicType,
        category: payload.category,
        crop_id: cropId,
        status: payload.status,
        opened_at: payload.movementDate,
        closed_at: closedAt,
        notes: payload.notes
    };

    const { error } = await supabase
        .from('agro_operational_cycles')
        .update(cyclePayload)
        .eq('id', cycleId)
        .eq('user_id', userId);

    if (error) throw error;

    await upsertInitialMovement(
        supabase,
        userId,
        cycleId,
        normalizeId(existingCycle.primaryMovement?.id),
        payload
    );

    return {
        cycleId,
        message: 'Cambios guardados en la cartera operativa.'
    };
}

async function deleteCycleRecord(cycleId, options = {}) {
    const supabase = await getSupabaseClient();
    const userId = await ensureUserId();
    const existingCycle = state.cycleIndex.get(cycleId);
    if (!existingCycle) {
        throw new Error('No se encontró la cartera operativa a eliminar.');
    }

    if (!options.skipConfirm) {
        const confirmed = typeof window.confirm === 'function'
            ? window.confirm(`¿Eliminar "${existingCycle.name}"? Esta acción también borrará su historial de movimientos.`)
            : true;
        if (!confirmed) {
            return {
                cycleId,
                skipped: true,
                cascadeVerified: null,
                message: 'Eliminación cancelada.'
            };
        }
    }

    const { error } = await supabase
        .from('agro_operational_cycles')
        .delete()
        .eq('id', cycleId)
        .eq('user_id', userId);

    if (error) throw error;

    const cascadeVerified = await verifyCascadeDelete(supabase, userId, cycleId);
    state.lastCascadeCheck = {
        cycleId,
        cascadeVerified
    };

    return {
        cycleId,
        cascadeVerified,
        message: cascadeVerified === true
            ? '🗑️ Ciclo eliminado y cascade verificado.'
            : '🗑️ Ciclo eliminado.'
    };
}

function renderShell() {
    if (!state.root) return;

    state.root.innerHTML = `
        <div class="agro-operational-shell agro-ops-v10">
            <header class="module-header animate-in delay-3">
                <div class="module-title-group agro-operational-shell__heading">
                    <div class="agro-commercial-family" aria-label="Operación comercial">
                        <div class="agro-commercial-family__tabs" role="group" aria-label="Familia comercial">
                            <button type="button" class="agro-commercial-family__tab" data-agro-view="cartera-viva">
                                Cartera Viva
                            </button>
                            <button type="button" class="agro-commercial-family__tab is-active" data-agro-view="operational">
                                Cartera Operativa
                            </button>
                        </div>
                    </div>
                    <div class="module-title-group">
                        <div class="module-icon">💼</div>
                        <div class="module-heading">
                            <p class="ops-module-eyebrow">Operación comercial</p>
                            <h2 class="module-title">Cartera Operativa</h2>
                            <p class="module-subtitle">Registra, filtra y exporta con movimientos reales sin salir del módulo.</p>
                        </div>
                    </div>
                </div>
                <div class="header-actions">
                    <button type="button" class="btn btn-primary" data-operational-action="new-cycle">Nueva cartera operativa</button>
                    <button type="button" class="btn" data-agro-view="period-cycles">📆 Ver períodos</button>
                    <button type="button" class="agro-operational-refresh-btn" data-operational-action="refresh" aria-label="Actualizar Cartera Operativa" title="Actualizar">
                        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    </button>
                </div>
            </header>

            <div class="agro-operational-feedback agro-operational-feedback--page" id="agro-operational-feedback" data-tone="info"></div>
            <div class="agro-privacy-strip" aria-label="Controles de privacidad de Cartera Operativa">
                <span class="agro-privacy-strip__label">Privacidad</span>
                <button type="button" class="btn-privacy-toggle" data-money-privacy-control="toggle" aria-pressed="false">Ocultar montos</button>
            </div>
            <div class="agro-operational-family-toggle" id="agro-operational-family-toggle" role="group" aria-label="Familia de cartera operativa"></div>
            <div class="agro-operational-subview-switch" id="agro-operational-subview-switch" role="group" aria-label="Lecturas de cartera operativa"></div>

            <section id="agro-operational-list-section" class="agro-operational-list-section">
                <div class="agro-operational-list-head">
                    <div>
                        <p class="agro-operational-list-eyebrow" id="agro-operational-list-eyebrow">🟡 Activos</p>
                        <h3 class="agro-operational-list-title" id="agro-operational-list-title">🟡 Carteras operativas activas</h3>
                        <p class="agro-operational-list-copy" id="agro-operational-list-copy">No pagados, en seguimiento o compensándose con lectura operativa.</p>
                    </div>
                    <button type="button" class="btn" data-operational-action="new-cycle">Nueva cartera operativa</button>
                </div>
                <div id="agro-operational-filters-host"></div>
                <section id="agro-operational-overview-panel" class="agro-operational-panel agro-operational-overview-panel">
                    <div class="agro-operational-panel__head">
                        <div>
                            <p class="agro-operational-panel__eyebrow" id="agro-operational-overview-eyebrow">🟡 Activos</p>
                            <h3 class="agro-operational-panel__title" id="agro-operational-overview-title">Vista organizada por estado</h3>
                            <p class="agro-operational-panel__copy" id="agro-operational-overview-copy">Cada subvista recalcula balance y conserva filtros compactos.</p>
                        </div>
                    </div>
                    <div id="agro-operational-overview-body"></div>
                </section>
                <p class="agro-operational-list-section__status" id="agro-operational-list-status" aria-live="polite" aria-atomic="true">Cargando cartera operativa...</p>
                <div class="agro-operational-list" id="agro-operational-list"></div>
            </section>

            <div id="agro-operational-modal" class="modal-overlay agro-operational-modal agro-modal-canon${state.modalOpen ? ' active' : ''}" aria-hidden="${state.modalOpen ? 'false' : 'true'}">
                <div class="modal-container agro-operational-modal__dialog agro-modal-canon__dialog" role="dialog" aria-modal="true" aria-labelledby="agro-operational-form-title">
                    <div class="modal-header agro-operational-modal__header agro-modal-canon__header">
                        <div class="agro-operational-modal__title-group">
                            <p class="agro-operational-modal__eyebrow" id="agro-operational-form-eyebrow">Creación guiada</p>
                            <h3 class="modal-title agro-operational-modal__title" id="agro-operational-form-title">Nueva cartera operativa</h3>
                            <p class="agro-operational-modal__copy" id="agro-operational-form-copy">Describe, clasifica, registra y confirma sin cargar la vista principal.</p>
                        </div>
                        <button type="button" class="modal-close agro-operational-modal__close agro-modal-canon__close" data-operational-action="cancel-form" aria-label="Cerrar modal">&times;</button>
                    </div>
                    <div class="modal-body agro-operational-modal__body agro-modal-canon__body">
                        <div class="agro-operational-feedback agro-operational-feedback--modal" id="agro-operational-modal-feedback" data-tone="info"></div>
                        <div id="agro-operational-wizard-host"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    state.refs = {
        feedback: document.getElementById('agro-operational-feedback'),
        modalFeedback: document.getElementById('agro-operational-modal-feedback'),
        modalOverlay: document.getElementById('agro-operational-modal'),
        wizardHost: document.getElementById('agro-operational-wizard-host'),
        overviewEyebrow: document.getElementById('agro-operational-overview-eyebrow'),
        overviewTitle: document.getElementById('agro-operational-overview-title'),
        overviewCopy: document.getElementById('agro-operational-overview-copy'),
        overviewBody: document.getElementById('agro-operational-overview-body'),
        overviewSection: document.getElementById('agro-operational-overview-panel'),
        familyToggle: document.getElementById('agro-operational-family-toggle'),
        subviewHost: document.getElementById('agro-operational-subview-switch'),
        listEyebrow: document.getElementById('agro-operational-list-eyebrow'),
        listTitle: document.getElementById('agro-operational-list-title'),
        listCopy: document.getElementById('agro-operational-list-copy'),
        filtersHost: document.getElementById('agro-operational-filters-host'),
        listStatus: document.getElementById('agro-operational-list-status'),
        list: document.getElementById('agro-operational-list'),
        listSection: document.getElementById('agro-operational-list-section'),
        formEyebrow: document.getElementById('agro-operational-form-eyebrow'),
        formTitle: document.getElementById('agro-operational-form-title'),
        formCopy: document.getElementById('agro-operational-form-copy')
    };

    syncModalVisibility();
}

function syncCommercialFamilyTabs() {
    if (!state.root) return;
    const currentView = normalizeToken(document.body?.dataset?.agroActiveView || state.currentView);

    state.root.querySelectorAll('.agro-commercial-family__tab[data-agro-view]').forEach((button) => {
        const buttonView = normalizeToken(button.dataset.agroView);
        const isActive = buttonView === currentView;
        button.classList.toggle('is-active', isActive);
        if (isActive) {
            button.setAttribute('aria-current', 'page');
        } else {
            button.removeAttribute('aria-current');
        }
    });
}

function syncModalVisibility() {
    const isOpen = !!state.modalOpen;
    state.refs?.modalOverlay?.classList.toggle('active', isOpen);
    state.refs?.modalOverlay?.classList.toggle('is-open', isOpen);
    state.refs?.modalOverlay?.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.body?.classList.toggle('agro-operational-modal-open', isOpen);
}

function openComposerModal() {
    state.modalOpen = true;
    syncModalVisibility();
    setControlsDisabled(state.schemaMissing || state.saving);
}

function closeComposerModal() {
    state.modalOpen = false;
    syncModalVisibility();
}

function buildCropOptionsMarkup(selectedValue = '') {
    const selected = normalizeId(selectedValue);
    const options = ['<option value="">Sin asociar a cultivo</option>'];
    getAvailableCrops().forEach((crop) => {
        const display = buildCropDisplay(crop);
        const isSelected = display.id === selected ? ' selected' : '';
        options.push(`<option value="${escapeAttr(display.id)}"${isSelected}>${escapeHtml(display.label)}</option>`);
    });
    return options.join('');
}

function buildSelectOptionsMarkup(options, selectedValue = '') {
    return options.map((option) => {
        const selected = option.value === selectedValue ? ' selected' : '';
        return `<option value="${escapeAttr(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
    }).join('');
}

function normalizeDetailsKey(value) {
    return String(value || '').trim();
}

function buildOverviewDetailsKey(subview = state.currentSubview) {
    return `overview:${normalizeOperationalSubview(subview)}`;
}

function buildAdvancedFiltersDetailsKey(subview) {
    return `filters:${normalizeOperationalSubview(subview)}`;
}

function buildCardDetailsKey(cycleId) {
    return `cycle:${normalizeId(cycleId)}`;
}

function rememberDetailsOpenState(details) {
    if (!(details instanceof HTMLDetailsElement)) return;
    const key = normalizeDetailsKey(details.dataset?.operationalDetailsKey);
    if (!key) return;
    state.ui.detailsOpen.set(key, Boolean(details.open));
}

function captureOperationalDetailsState(root = state.root) {
    if (!root) return;
    root.querySelectorAll('details[data-operational-details-key]').forEach((details) => {
        rememberDetailsOpenState(details);
    });
}

function readDetailsOpenState(key, defaultOpen = false) {
    const safeKey = normalizeDetailsKey(key);
    if (safeKey && state.ui.detailsOpen.has(safeKey)) {
        return state.ui.detailsOpen.get(safeKey) === true;
    }
    return Boolean(defaultOpen);
}

function renderDetailsOpenAttribute(key, defaultOpen = false) {
    return readDetailsOpenState(key, defaultOpen) ? ' open' : '';
}

function handleRootToggle(event) {
    rememberDetailsOpenState(event.target);
}

function captureWizardFocusState() {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) return null;

    const field = activeElement.dataset?.operationalDraft;
    if (!field) return null;

    const selectionStart = typeof activeElement.selectionStart === 'number'
        ? activeElement.selectionStart
        : null;
    const selectionEnd = typeof activeElement.selectionEnd === 'number'
        ? activeElement.selectionEnd
        : null;

    return {
        field,
        selectionStart,
        selectionEnd,
        selectionDirection: typeof activeElement.selectionDirection === 'string'
            ? activeElement.selectionDirection
            : 'none',
        scrollTop: typeof activeElement.scrollTop === 'number' ? activeElement.scrollTop : null
    };
}

function restoreWizardFocusState(snapshot) {
    if (!snapshot?.field) return;

    const nextField = state.refs?.form?.querySelector(`[data-operational-draft="${snapshot.field}"]`);
    if (!(nextField instanceof HTMLElement) || nextField.disabled) return;

    nextField.focus({ preventScroll: true });

    if (typeof snapshot.scrollTop === 'number' && 'scrollTop' in nextField) {
        nextField.scrollTop = snapshot.scrollTop;
    }

    if (typeof nextField.setSelectionRange !== 'function') return;
    if (snapshot.selectionStart == null || snapshot.selectionEnd == null) return;

    const safeValue = String(nextField.value ?? '');
    const maxIndex = safeValue.length;
    const start = Math.max(0, Math.min(snapshot.selectionStart, maxIndex));
    const end = Math.max(start, Math.min(snapshot.selectionEnd, maxIndex));

    try {
        nextField.setSelectionRange(start, end, snapshot.selectionDirection || 'none');
    } catch (_error) {
        // Some input types do not allow manual selection restore.
    }
}

function renderEditForm(focusSnapshot) {
    const values = state.form.values;

    state.refs.formEyebrow.textContent = 'Edición directa';
    state.refs.formTitle.textContent = 'Editar cartera operativa';
    state.refs.formCopy.textContent = 'Modifica los campos necesarios y guarda. Todos los cambios se aplican de una vez.';

    state.refs.wizardHost.innerHTML = `
        <form id="agro-operational-form" class="agro-operational-form agro-operational-form--modal" novalidate>
            <div class="agro-operational-form__body">
                <div class="agro-operational-edit-form">
                    <div class="agro-operational-form-grid">
                        <div class="input-group input-group--full">
                            <label class="input-label" for="agro-operational-name">Nombre del ciclo</label>
                            <input type="text" id="agro-operational-name" class="styled-input" maxlength="140" placeholder="Ej: Botas de cuero Titan" required data-operational-draft="name" value="${escapeAttr(values.name)}">
                        </div>
                        <div class="input-group input-group--full">
                            <label class="input-label" for="agro-operational-description">Descripción</label>
                            <textarea id="agro-operational-description" class="styled-input" placeholder="Contexto opcional sobre el ciclo." data-operational-draft="description">${escapeHtml(values.description)}</textarea>
                        </div>
                        <div class="input-group">
                            <label class="input-label" for="agro-operational-economic-type">Tipo económico</label>
                            <select id="agro-operational-economic-type" class="styled-input" data-operational-draft="economicType">
                                ${buildSelectOptionsMarkup(ECONOMIC_TYPE_OPTIONS, values.economicType)}
                            </select>
                        </div>
                        <div class="input-group">
                            <label class="input-label" for="agro-operational-category">Categoría</label>
                            <select id="agro-operational-category" class="styled-input" data-operational-draft="category">
                                ${buildSelectOptionsMarkup(CATEGORY_OPTIONS, values.category)}
                            </select>
                        </div>
                        <div class="input-group input-group--full">
                            <label class="input-label" for="agro-operational-crop">Cultivo asociado</label>
                            <select id="agro-operational-crop" class="styled-input" data-operational-draft="cropId">
                                ${buildCropOptionsMarkup(values.cropId)}
                            </select>
                        </div>
                        <div class="input-group">
                            <label class="input-label" for="agro-operational-amount">Monto</label>
                            <input type="number" id="agro-operational-amount" class="styled-input" step="any" min="0" placeholder="0.00" data-operational-draft="amount" value="${escapeAttr(values.amount)}">
                        </div>
                        <div class="input-group">
                            <label class="input-label" for="agro-operational-currency">Moneda</label>
                            <select id="agro-operational-currency" class="styled-input" data-operational-draft="currency">
                                ${buildSelectOptionsMarkup(CURRENCY_OPTIONS.map((c) => ({ value: c, label: c })), values.currency)}
                            </select>
                        </div>
                        <div class="input-group">
                            <label class="input-label" for="agro-operational-date">Fecha</label>
                            <input type="date" id="agro-operational-date" class="styled-input" data-operational-draft="movementDate" value="${escapeAttr(values.movementDate)}" max="${todayLocalIso()}">
                        </div>
                        <div class="input-group">
                            <label class="input-label" for="agro-operational-quantity">Cantidad</label>
                            <input type="number" id="agro-operational-quantity" class="styled-input" step="any" min="0" placeholder="0" data-operational-draft="quantity" value="${escapeAttr(values.quantity)}">
                        </div>
                        <div class="input-group">
                            <label class="input-label" for="agro-operational-unit-type">Unidad</label>
                            <select id="agro-operational-unit-type" class="styled-input" data-operational-draft="unitType">
                                ${buildSelectOptionsMarkup(UNIT_TYPE_OPTIONS, values.unitType)}
                            </select>
                        </div>
                        <div class="input-group">
                            <label class="input-label" for="agro-operational-status">Estado</label>
                            <select id="agro-operational-status" class="styled-input" data-operational-draft="status">
                                ${buildSelectOptionsMarkup(STATUS_OPTIONS, values.status)}
                            </select>
                        </div>
                        <div class="input-group input-group--full">
                            <label class="input-label" for="agro-operational-notes">Observaciones</label>
                            <textarea id="agro-operational-notes" class="styled-input" placeholder="Notas adicionales." data-operational-draft="notes">${escapeHtml(values.notes)}</textarea>
                        </div>
                    </div>
                </div>
            </div>

            <div class="agro-operational-form-actions">
                <button type="button" class="btn agro-modal-canon__button agro-modal-canon__button--secondary agro-operational-form-actions__cancel" data-operational-action="cancel-form">Cancelar</button>
                <button type="submit" class="btn btn-primary agro-modal-canon__button agro-modal-canon__button--primary">Guardar cambios</button>
            </div>
        </form>
    `;

    cacheDynamicRefs();
    setControlsDisabled(state.schemaMissing || state.saving);
    restoreWizardFocusState(focusSnapshot);
}

function renderWizard() {
    if (!state.refs?.wizardHost) return;

    const focusSnapshot = captureWizardFocusState();
    const isEdit = state.form.mode === 'edit';

    if (isEdit) {
        renderEditForm(focusSnapshot);
        return;
    }

    const values = state.form.values;
    const currentStep = Number(state.form.step || 1);
    const currentStepMeta = WIZARD_STEPS.find((step) => step.id === currentStep) || WIZARD_STEPS[0];
    const direction = deriveMovementDirection(values.economicType);
    const parsedAmount = toNullableNumber(values.amount, 'El monto');
    const parsedQuantity = toNullableNumber(values.quantity, 'La cantidad');
    const effectiveStatus = readLabel(STATUS_OPTIONS, values.status, '🟡 No pagado');

    state.refs.formEyebrow.textContent = `Creación guiada · ${currentStepMeta.eyebrow}`;
    state.refs.formTitle.textContent = 'Nueva cartera operativa';
    state.refs.formCopy.textContent = 'Guíate paso a paso para crear el ciclo, registrar el movimiento inicial y decidir si se cierra hoy mismo.';

    state.refs.wizardHost.innerHTML = `
        <form id="agro-operational-form" class="agro-operational-form agro-operational-form--modal" novalidate>
            <div class="agro-operational-form__body">
                <div class="agro-operational-stepper" role="list">
                    ${WIZARD_STEPS.map((step) => {
        const isActive = currentStep === step.id;
        const isComplete = currentStep > step.id;
        return `
                            <button type="button" class="agro-operational-step${isActive ? ' is-active' : ''}${isComplete ? ' is-complete' : ''}" data-operational-action="wizard-goto" data-step="${step.id}"${isActive ? ' aria-current="step"' : ''}>
                                <span class="agro-operational-step__index">${step.id}</span>
                                <span class="agro-operational-step__copy">
                                    <strong>${escapeHtml(step.title)}</strong>
                                    <small>${escapeHtml(step.eyebrow)}</small>
                                </span>
                            </button>
                        `;
    }).join('')}
                </div>

                <div class="agro-operational-step-panels">
                    <section class="agro-operational-step-panel${currentStep === 1 ? ' is-active' : ''}" data-step-panel="1"${currentStep === 1 ? '' : ' hidden'}>
                        <div class="agro-operational-step-panel__head">
                            <p class="agro-operational-step-panel__eyebrow">Paso 1</p>
                            <h4 class="agro-operational-step-panel__title">¿Qué pasó?</h4>
                            <p class="agro-operational-step-panel__copy">Ponle nombre claro al ciclo y deja la descripción principal si hace falta contexto.</p>
                        </div>
                        <div class="agro-operational-form-grid">
                            <div class="input-group input-group--full">
                                <label class="input-label" for="agro-operational-name">Nombre del ciclo</label>
                                <input type="text" id="agro-operational-name" class="styled-input" maxlength="140" placeholder="Ej: Botas de cuero Titan" required data-operational-draft="name" value="${escapeAttr(values.name)}">
                            </div>
                            <div class="input-group input-group--full">
                                <label class="input-label" for="agro-operational-description">Descripción principal</label>
                                <textarea id="agro-operational-description" class="styled-input" placeholder="Cuéntame qué pasó o qué se resolvió." data-operational-draft="description">${escapeHtml(values.description)}</textarea>
                            </div>
                        </div>
                    </section>

                    <section class="agro-operational-step-panel${currentStep === 2 ? ' is-active' : ''}" data-step-panel="2"${currentStep === 2 ? '' : ' hidden'}>
                        <div class="agro-operational-step-panel__head">
                            <p class="agro-operational-step-panel__eyebrow">Paso 2</p>
                            <h4 class="agro-operational-step-panel__title">¿Cómo se clasifica?</h4>
                            <p class="agro-operational-step-panel__copy">Define el tipo económico, la categoría y, si aplica, amárralo a un cultivo real del usuario.</p>
                        </div>
                        <div class="agro-operational-form-grid">
                            <div class="input-group">
                                <label class="input-label" for="agro-operational-economic-type">Tipo económico</label>
                                <select id="agro-operational-economic-type" class="styled-input" data-operational-draft="economicType">
                                    ${buildSelectOptionsMarkup(ECONOMIC_TYPE_OPTIONS, values.economicType)}
                                </select>
                            </div>
                            <div class="input-group">
                                <label class="input-label" for="agro-operational-category">Categoría</label>
                                <select id="agro-operational-category" class="styled-input" data-operational-draft="category">
                                    ${buildSelectOptionsMarkup(CATEGORY_OPTIONS, values.category)}
                                </select>
                            </div>
                            <div class="input-group input-group--full">
                                <label class="input-label" for="agro-operational-crop">Cultivo asociado</label>
                                <select id="agro-operational-crop" class="styled-input" data-operational-draft="cropId">
                                    ${buildCropOptionsMarkup(values.cropId)}
                                </select>
                            </div>
                            ${!isEdit ? `
                            <div class="input-group input-group--full">
                                <label class="input-label">Estado inicial</label>
                                ${values.economicType === 'loss'
                ? '<p class="agro-operational-derived-status">Se registrará como perdido</p>'
                : values.economicType === 'donation'
                    ? '<p class="agro-operational-derived-status">Se registrará como cerrado (donación)</p>'
                    : `<select id="agro-operational-create-status" class="styled-input" data-operational-draft="status">
                                        ${buildSelectOptionsMarkup(CREATE_STATUS_OPTIONS, values.status)}
                                    </select>`
            }
                            </div>
                            ` : ''}
                        </div>
                    </section>

                    <section class="agro-operational-step-panel${currentStep === 3 ? ' is-active' : ''}" data-step-panel="3"${currentStep === 3 ? '' : ' hidden'}>
                        <div class="agro-operational-step-panel__head">
                            <p class="agro-operational-step-panel__eyebrow">Paso 3</p>
                            <h4 class="agro-operational-step-panel__title">¿Cuánto y cuándo?</h4>
                            <p class="agro-operational-step-panel__copy">El monto puede quedar nulo. La fecha del movimiento inicial sí es obligatoria.</p>
                        </div>
                        <div class="agro-operational-inline-meta">
                            <div class="agro-operational-impact">
                                <span>Impacto inicial</span>
                                <span class="agro-operational-impact__badge ${direction === 'in' ? 'is-in' : 'is-out'}">${escapeHtml(directionDetailLabel(direction, values.economicType))}</span>
                            </div>
                        </div>
                        <div class="agro-operational-form-grid">
                            <div class="input-group">
                                <label class="input-label" for="agro-operational-amount">Monto</label>
                                <input type="number" id="agro-operational-amount" class="styled-input" min="0" step="0.01" placeholder="Opcional" data-operational-draft="amount" value="${escapeAttr(values.amount)}">
                            </div>
                            <div class="input-group">
                                <label class="input-label" for="agro-operational-currency">Moneda</label>
                                <select id="agro-operational-currency" class="styled-input" data-operational-draft="currency">
                                    ${CURRENCY_OPTIONS.map((currency) => `<option value="${currency}"${currency === values.currency ? ' selected' : ''}>${currency}</option>`).join('')}
                                </select>
                            </div>
                            <div class="input-group">
                                <label class="input-label" for="agro-operational-date">Fecha</label>
                                <input type="date" id="agro-operational-date" class="styled-input" data-operational-draft="movementDate" value="${escapeAttr(values.movementDate)}" max="${todayLocalIso()}">
                            </div>
                            <div class="input-group">
                                <label class="input-label" for="agro-operational-quantity">Cantidad física</label>
                                <input type="number" id="agro-operational-quantity" class="styled-input" min="0" step="0.01" placeholder="Opcional" data-operational-draft="quantity" value="${escapeAttr(values.quantity)}">
                            </div>
                            <div class="input-group">
                                <label class="input-label" for="agro-operational-unit-type">Unidad</label>
                                <select id="agro-operational-unit-type" class="styled-input" data-operational-draft="unitType">
                                    <option value="">Sin unidad</option>
                                    ${buildSelectOptionsMarkup(UNIT_TYPE_OPTIONS, values.unitType)}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section class="agro-operational-step-panel${currentStep === 4 ? ' is-active' : ''}" data-step-panel="4"${currentStep === 4 ? '' : ' hidden'}>
                        <div class="agro-operational-step-panel__head">
                            <p class="agro-operational-step-panel__eyebrow">Paso 4</p>
                            <h4 class="agro-operational-step-panel__title">Confirmar</h4>
                            <p class="agro-operational-step-panel__copy">Revisa el resumen antes de guardar. Puedes volver atrás sin perder datos.</p>
                        </div>
                        <div class="agro-operational-confirm-grid">
                        <article class="agro-operational-confirm-item">
                            <span class="agro-operational-confirm-item__label">Nombre</span>
                            <strong class="agro-operational-confirm-item__value">${escapeHtml(values.name || 'Sin nombre')}</strong>
                        </article>
                        <article class="agro-operational-confirm-item">
                            <span class="agro-operational-confirm-item__label">Tipo económico</span>
                            <strong class="agro-operational-confirm-item__value">${escapeHtml(readLabel(ECONOMIC_TYPE_OPTIONS, values.economicType, 'Sin tipo'))}</strong>
                        </article>
                        <article class="agro-operational-confirm-item">
                            <span class="agro-operational-confirm-item__label">Categoría</span>
                            <strong class="agro-operational-confirm-item__value">${escapeHtml(readLabel(CATEGORY_OPTIONS, values.category, 'Sin categoría'))}</strong>
                        </article>
                        <article class="agro-operational-confirm-item">
                            <span class="agro-operational-confirm-item__label">Cultivo asociado</span>
                            <strong class="agro-operational-confirm-item__value">${escapeHtml(resolveDraftCropLabel(values.cropId))}</strong>
                        </article>
                        <article class="agro-operational-confirm-item">
                            <span class="agro-operational-confirm-item__label">${escapeHtml(directionSummaryLabel(direction, values.economicType))}</span>
                            <strong class="agro-operational-confirm-item__value">${escapeHtml(formatAmountLabel(parsedAmount, values.currency))}</strong>
                        </article>
                        <article class="agro-operational-confirm-item">
                            <span class="agro-operational-confirm-item__label">Balance del ciclo</span>
                            <strong class="agro-operational-confirm-item__value">${escapeHtml(parsedAmount == null ? EMPTY_BALANCE_LABEL : formatSignedCurrencyValue(direction === 'in' ? parsedAmount : -parsedAmount, values.currency))}</strong>
                        </article>
                        <article class="agro-operational-confirm-item">
                            <span class="agro-operational-confirm-item__label">Fecha</span>
                            <strong class="agro-operational-confirm-item__value">${escapeHtml(formatDateLabel(values.movementDate))}</strong>
                        </article>
                        <article class="agro-operational-confirm-item">
                            <span class="agro-operational-confirm-item__label">Cantidad física</span>
                            <strong class="agro-operational-confirm-item__value">${escapeHtml(formatQuantityLabel(parsedQuantity, values.unitType))}</strong>
                        </article>
                        <article class="agro-operational-confirm-item agro-operational-confirm-item--wide">
                            <span class="agro-operational-confirm-item__label">Descripción principal</span>
                            <strong class="agro-operational-confirm-item__value">${escapeHtml(values.description || 'Sin descripción principal')}</strong>
                        </article>
                        <article class="agro-operational-confirm-item">
                            <span class="agro-operational-confirm-item__label">Estado final</span>
                            <strong class="agro-operational-confirm-item__value">${escapeHtml(effectiveStatus)}</strong>
                        </article>
                        </div>

                        ${isEdit ? `
                            <div class="agro-operational-form-grid agro-operational-confirm-form">
                                <div class="input-group">
                                    <label class="input-label" for="agro-operational-status">Estado</label>
                                    <select id="agro-operational-status" class="styled-input" data-operational-draft="status">
                                        ${buildSelectOptionsMarkup(STATUS_OPTIONS, values.status)}
                                    </select>
                                </div>
                                <div class="input-group input-group--full">
                                    <label class="input-label" for="agro-operational-notes">Observaciones posteriores</label>
                                    <textarea id="agro-operational-notes" class="styled-input" placeholder="Notas que aparecieron después de crear el ciclo." data-operational-draft="notes">${escapeHtml(values.notes)}</textarea>
                                </div>
                            </div>
                        ` : ''}
                    </section>
                </div>
            </div>

            <div class="agro-operational-form-actions">
                <button type="button" class="btn agro-modal-canon__button agro-modal-canon__button--secondary agro-operational-form-actions__cancel" data-operational-action="cancel-form">Cancelar</button>
                <div class="agro-operational-form-actions__nav">
                    ${currentStep > 1 ? '<button type="button" class="btn agro-modal-canon__button agro-modal-canon__button--secondary" data-operational-action="wizard-prev">Atrás</button>' : ''}
                    ${currentStep < 4
            ? '<button type="button" class="btn btn-primary agro-modal-canon__button agro-modal-canon__button--primary" data-operational-action="wizard-next">Siguiente</button>'
            : `<button type="submit" class="btn btn-primary agro-modal-canon__button agro-modal-canon__button--primary">${isEdit ? 'Guardar cambios' : 'Guardar cartera operativa'}</button>`}
                </div>
            </div>
        </form>
    `;

    cacheDynamicRefs();
    setControlsDisabled(state.schemaMissing || state.saving);
    restoreWizardFocusState(focusSnapshot);
}

function cacheDynamicRefs() {
    if (!state.refs) return;
    Object.assign(state.refs, {
        form: document.getElementById('agro-operational-form'),
        name: document.getElementById('agro-operational-name'),
        description: document.getElementById('agro-operational-description'),
        economicType: document.getElementById('agro-operational-economic-type'),
        category: document.getElementById('agro-operational-category'),
        crop: document.getElementById('agro-operational-crop'),
        amount: document.getElementById('agro-operational-amount'),
        currency: document.getElementById('agro-operational-currency'),
        date: document.getElementById('agro-operational-date'),
        quantity: document.getElementById('agro-operational-quantity'),
        unitType: document.getElementById('agro-operational-unit-type'),
        createStatus: document.getElementById('agro-operational-create-status'),
        status: document.getElementById('agro-operational-status'),
        notes: document.getElementById('agro-operational-notes')
    });
}

function setControlsDisabled(disabled) {
    const form = state.refs?.form;
    if (!form) return;
    form.querySelectorAll('input, select, textarea, button').forEach((element) => {
        element.disabled = !!disabled;
    });
}

function resolveDraftCropLabel(cropId) {
    const normalizedId = normalizeId(cropId);
    if (!normalizedId) return 'Sin asociar a cultivo';
    const match = getAvailableCrops().find((crop) => buildCropDisplay(crop).id === normalizedId);
    return match ? buildCropDisplay(match).label : 'Cultivo no valido.';
}

function filterCyclesByFamily(cycles, family) {
    if (!Array.isArray(cycles)) return [];
    if (family === FAMILY_LINKED) return cycles.filter((c) => !!c?.crop_id);
    if (family === FAMILY_UNLINKED) return cycles.filter((c) => !c?.crop_id);
    return cycles;
}

function getFamilyLabel(family) {
    if (family === FAMILY_UNLINKED) return '\u{1F33E} No asociados al cultivo';
    if (family === FAMILY_ALL) return '\u{1F4CA} Todos los registros';
    return '\u{1F331} Asociados al cultivo';
}

function getSubviewMeta(subview) {
    const familyLabel = getFamilyLabel(state.familyFilter);

    if (subview === SUBVIEW_FINISHED) {
        return {
            eyebrow: '✅ Pagados',
            title: `✅ Pagados — ${familyLabel}`,
            copy: state.familyFilter === FAMILY_LINKED
                ? 'Ciclos ya pagados o cerrados, asociados a un cultivo.'
                : 'Ciclos ya pagados o cerrados, sin vínculo con cultivo.'
        };
    }

    if (subview === SUBVIEW_DONATIONS) {
        return {
            eyebrow: '🤝 Donaciones',
            title: `🤝 Donaciones — ${familyLabel}`,
            copy: state.familyFilter === FAMILY_LINKED
                ? 'Donaciones y regalos asociados a un cultivo, incluidos como gastos.'
                : 'Donaciones y regalos sin vínculo con cultivo, incluidos como gastos.'
        };
    }

    if (subview === SUBVIEW_LOSSES) {
        return {
            eyebrow: '💔 Pérdidas',
            title: `💔 Pérdidas — ${familyLabel}`,
            copy: state.familyFilter === FAMILY_LINKED
                ? 'Pérdidas o cancelaciones operativas asociadas a un cultivo.'
                : 'Pérdidas o cancelaciones operativas sin vínculo con cultivo.'
        };
    }

    if (subview === SUBVIEW_EXPORT) {
        return {
            eyebrow: '📥 Exportar MD',
            title: '📥 Exportar Cartera Operativa a Markdown',
            copy: 'Descarga un reporte limpio usando los filtros activos de No pagados y Pagados / pérdidas.'
        };
    }

    return {
        eyebrow: '🟡 No pagados',
        title: `🟡 No pagados — ${familyLabel}`,
        copy: state.familyFilter === FAMILY_LINKED
            ? 'No pagados, en seguimiento o compensándose, asociados a un cultivo.'
            : 'No pagados, en seguimiento o compensándose, sin vínculo con cultivo.'
    };
}

function renderFamilyToggle() {
    if (!state.refs?.familyToggle) return;
    state.refs.familyToggle.hidden = false;
    state.refs.familyToggle.setAttribute('aria-hidden', 'false');

    const allActive = state.datasets[SUBVIEW_ACTIVE]?.cycles || [];
    const allFinished = state.datasets[SUBVIEW_FINISHED]?.cycles || [];
    const linkedCount = allActive.filter((c) => !!c?.crop_id).length + allFinished.filter((c) => !!c?.crop_id).length;
    const unlinkedCount = allActive.filter((c) => !c?.crop_id).length + allFinished.filter((c) => !c?.crop_id).length;

    const totalCount = linkedCount + unlinkedCount;
    const options = [
        { value: FAMILY_LINKED, label: '\u{1F331} Asociados al cultivo', count: linkedCount },
        { value: FAMILY_UNLINKED, label: '\u{1F33E} No asociados al cultivo', count: unlinkedCount },
        { value: FAMILY_ALL, label: '\u{1F4CA} Todos los registros', count: totalCount }
    ];

    state.refs.familyToggle.innerHTML = options.map((option) => `
        <button
            type="button"
            class="agro-operational-family-toggle__btn${state.familyFilter === option.value ? ' is-active' : ''}"
            data-operational-action="set-family"
            data-family="${escapeAttr(option.value)}"
            aria-pressed="${state.familyFilter === option.value ? 'true' : 'false'}">
            <span class="agro-operational-family-toggle__label">${escapeHtml(option.label)}</span>
            <span class="agro-operational-family-toggle__count">${option.count}</span>
        </button>
    `).join('');
}

function getDonationCycles() {
    return getAllCycles().filter((cycle) => normalizeToken(cycle?.economic_type) === 'donation');
}

function isDonationCycle(cycle) {
    return normalizeToken(cycle?.economic_type) === 'donation';
}

function isLossCycle(cycle) {
    if (isDonationCycle(cycle)) return false;
    return normalizeToken(cycle?.economic_type) === 'loss' || normalizeToken(cycle?.status) === 'lost';
}

function getPendingCycles() {
    const active = state.datasets[SUBVIEW_ACTIVE]?.cycles || [];
    return active.filter((cycle) => ACTIVE_STATUS_VALUES.includes(normalizeToken(cycle?.status)) && !isDonationCycle(cycle) && !isLossCycle(cycle));
}

function getPaidCycles() {
    const finished = state.datasets[SUBVIEW_FINISHED]?.cycles || [];
    return finished.filter((cycle) => normalizeToken(cycle?.status) === 'closed' && !isDonationCycle(cycle) && !isLossCycle(cycle));
}

function getLossCycles() {
    return getAllCycles().filter(isLossCycle);
}

function getCyclesForSubview(subview) {
    if (subview === SUBVIEW_FINISHED) return getPaidCycles();
    if (subview === SUBVIEW_DONATIONS) return getDonationCycles();
    if (subview === SUBVIEW_LOSSES) return getLossCycles();
    return getPendingCycles();
}

function renderSubviewSwitch() {
    if (!state.refs?.subviewHost) return;

    const family = state.familyFilter;
    const activeCycles = filterCyclesByFamily(getCyclesForSubview(SUBVIEW_ACTIVE), family);
    const paidCycles = filterCyclesByFamily(getCyclesForSubview(SUBVIEW_FINISHED), family);
    const donationCycles = filterCyclesByFamily(getCyclesForSubview(SUBVIEW_DONATIONS), family);
    const lossCycles = filterCyclesByFamily(getCyclesForSubview(SUBVIEW_LOSSES), family);
    const activeCount = activeCycles.length;
    const paidCount = paidCycles.length;
    const donationCount = donationCycles.length;
    const lossCount = lossCycles.length;
    const totalCount = activeCount + paidCount + donationCount + lossCount;
    const options = [
        { value: SUBVIEW_ACTIVE, label: '🟡 No pagados', count: activeCount },
        { value: SUBVIEW_FINISHED, label: '✅ Pagados', count: paidCount },
        { value: SUBVIEW_DONATIONS, label: '🤝 Donaciones', count: donationCount },
        { value: SUBVIEW_LOSSES, label: '💔 Pérdidas', count: lossCount },
        { value: SUBVIEW_EXPORT, label: '📥 Exportar', count: totalCount }
    ];

    state.refs.subviewHost.innerHTML = options.map((option) => `
        <button
            type="button"
            class="agro-operational-subview-switch__btn${state.currentSubview === option.value ? ' is-active' : ''}"
            data-operational-action="set-subview"
            data-subview="${escapeAttr(option.value)}"
            aria-pressed="${state.currentSubview === option.value ? 'true' : 'false'}">
            <span class="agro-operational-subview-switch__label">${escapeHtml(option.label)}</span>
            ${Number.isFinite(option.count) ? `<span class="agro-operational-subview-switch__count">${option.count}</span>` : ''}
        </button>
    `).join('');
}

function syncStandalonePeriodCyclesView() {
    const root = document.getElementById(PERIOD_ROOT_ID);
    if (!root) return;

    if (state.currentView === PERIOD_VIEW_NAME) {
        void mountAgroPeriodCycles(root, {
            initialUserId: state.userId,
            initialSubview: document.body?.dataset?.agroSubview || 'calendario'
        });
        return;
    }

    unmountAgroPeriodCycles();
}

function renderFilterPills(filters) {
    const pills = [
        readLabel(PERIOD_OPTIONS, filters.period, '📅 Todo'),
        readLabel(CATEGORY_FILTER_OPTIONS, filters.category, '📁 Todas las categorías'),
        readLabel(TYPE_FILTER_OPTIONS, filters.economicType, '💰 Todos los tipos')
    ];

    return `
        <div class="agro-operational-filter-pills">
            ${pills.map((label) => `<span class="agro-operational-filter-pill">${escapeHtml(label)}</span>`).join('')}
        </div>
    `;
}

function hasActiveAdvancedFilters(filters = {}) {
    return ['period', 'category', 'economicType'].some((key) => {
        const value = normalizeToken(filters[key]);
        return value && value !== 'all';
    });
}

function renderAdvancedFilterMeta(filters = {}) {
    return [
        `Período: ${readLabel(PERIOD_OPTIONS, filters.period, 'Todo')}`,
        `Categoría: ${readLabel(CATEGORY_FILTER_OPTIONS, filters.category, 'Todas')}`,
        `Tipo: ${readLabel(TYPE_FILTER_OPTIONS, filters.economicType, 'Todos')}`
    ].join(' · ');
}

function mergeSummaryBalanceText(leftSummary, rightSummary) {
    const incoming = createMoneyBucket();
    const outgoing = createMoneyBucket();
    mergeMoneyBuckets(incoming, leftSummary.incoming);
    mergeMoneyBuckets(incoming, rightSummary.incoming);
    mergeMoneyBuckets(outgoing, leftSummary.outgoing);
    mergeMoneyBuckets(outgoing, rightSummary.outgoing);
    const balance = subtractMoneyBuckets(incoming, outgoing);
    return formatMoneyBucket(balance, { signed: true, emptyText: EMPTY_BALANCE_LABEL });
}

function renderCompactOverview({ label, summary, familyLabel, balanceLabel = 'Balance', balanceHint = '', detailsKey = '' }) {
    const count = Number(summary?.count || 0);
    const movementCount = Number(summary?.movementCount || 0);
    const cycleWord = count === 1 ? 'ciclo' : 'ciclos';
    const movementWord = movementCount === 1 ? 'movimiento' : 'movimientos';
    const safeFamilyLabel = String(familyLabel || '').trim();
    const safeDetailsKey = normalizeDetailsKey(detailsKey) || buildOverviewDetailsKey();

    return `
        <details
            class="agro-operational-overview-details"
            data-operational-summary-details
            data-operational-details-key="${escapeAttr(safeDetailsKey)}"${renderDetailsOpenAttribute(safeDetailsKey)}>
            <summary class="agro-operational-overview-summary">
                <span class="agro-operational-overview-summary__label">${escapeHtml(label || 'Resumen de esta vista')}</span>
                <span class="agro-operational-overview-summary__meta">
                    ${count} ${cycleWord} · ${movementCount} ${movementWord} · ${escapeHtml(balanceLabel)}:
                    ${renderMoneyNode(summary?.balanceText)}
                </span>
                <span class="agro-operational-overview-summary__action">Ver detalles <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span>
            </summary>
            <div class="agro-operational-summary-grid">
                <article class="agro-operational-summary-card">
                    <span class="agro-operational-summary-card__label">Ciclos visibles</span>
                    <strong class="agro-operational-summary-card__value">${count}</strong>
                    <p class="agro-operational-summary-card__hint">${escapeHtml(safeFamilyLabel || 'Registros visibles')} en esta subvista.</p>
                </article>
                <article class="agro-operational-summary-card">
                    <span class="agro-operational-summary-card__label">Movimientos</span>
                    <strong class="agro-operational-summary-card__value">${movementCount}</strong>
                    <p class="agro-operational-summary-card__hint">Total de movimientos registrados.</p>
                </article>
                <article class="agro-operational-summary-card" data-tone="${escapeAttr(summary?.balanceTone)}">
                    <span class="agro-operational-summary-card__label">${escapeHtml(balanceLabel)}</span>
                    ${renderMoneyNode(summary?.balanceText, { tag: 'strong', className: 'agro-operational-summary-card__value' })}
                    <p class="agro-operational-summary-card__hint">${balanceHint || `Recibí / Cobré: ${renderMoneyNode(summary?.incomingText)} · Pagué / Gasté: ${renderMoneyNode(summary?.outgoingText)}`}</p>
                </article>
            </div>
        </details>
    `;
}

function renderExportCompactOverview(activeSummary, finishedSummary, totalCount, detailsKey = '') {
    const combinedBalance = mergeSummaryBalanceText(activeSummary, finishedSummary);
    const safeDetailsKey = normalizeDetailsKey(detailsKey) || buildOverviewDetailsKey(SUBVIEW_EXPORT);

    return `
        <details
            class="agro-operational-overview-details"
            data-operational-summary-details
            data-operational-details-key="${escapeAttr(safeDetailsKey)}"${renderDetailsOpenAttribute(safeDetailsKey)}>
            <summary class="agro-operational-overview-summary">
                <span class="agro-operational-overview-summary__label">Resumen de exportación</span>
                <span class="agro-operational-overview-summary__meta">
                    ${totalCount} ciclo${totalCount === 1 ? '' : 's'} · Balance combinado:
                    ${renderMoneyNode(combinedBalance)}
                </span>
                <span class="agro-operational-overview-summary__action">Ver detalles <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span>
            </summary>
            <div class="agro-operational-summary-grid">
                <article class="agro-operational-summary-card">
                    <span class="agro-operational-summary-card__label">Activos exportables</span>
                    <strong class="agro-operational-summary-card__value">${activeSummary.count}</strong>
                    <p class="agro-operational-summary-card__hint">${renderMoneyNode(activeSummary.balanceText)}</p>
                </article>
                <article class="agro-operational-summary-card">
                    <span class="agro-operational-summary-card__label">Pagados / pérdidas</span>
                    <strong class="agro-operational-summary-card__value">${finishedSummary.count}</strong>
                    <p class="agro-operational-summary-card__hint">${renderMoneyNode(finishedSummary.balanceText)}</p>
                </article>
                <article class="agro-operational-summary-card">
                    <span class="agro-operational-summary-card__label">Archivo</span>
                    <strong class="agro-operational-summary-card__value">${totalCount}</strong>
                    <p class="agro-operational-summary-card__hint">Saldrá como <code>${escapeHtml(buildExportFileName())}</code>.</p>
                </article>
                <article class="agro-operational-summary-card">
                    <span class="agro-operational-summary-card__label">Balance combinado</span>
                    ${renderMoneyNode(combinedBalance, { tag: 'strong', className: 'agro-operational-summary-card__value' })}
                    <p class="agro-operational-summary-card__hint">Respeta filtros activos y finalizados por separado.</p>
                </article>
            </div>
        </details>
    `;
}

function buildTypeClass(economicType) {
    return TYPE_CLASS_BY_VALUE[normalizeToken(economicType)] || 'is-expense';
}

function buildCycleCropText(cycle) {
    if (!cycle?.crop_id) return '🌾 Sin asociar a cultivo';
    return cycle.crop?.label || '🌱 Cultivo asociado no disponible';
}

function splitCyclesByAssociation(cycles = []) {
    const linked = [];
    const unlinked = [];

    cycles.forEach((cycle) => {
        if (cycle?.crop_id) linked.push(cycle);
        else unlinked.push(cycle);
    });

    return { linked, unlinked };
}

function buildFamilySummaryChips(cycles) {
    let openCount = 0;
    let closedCount = 0;
    let donationCount = 0;
    let expenseCount = 0;
    let incomeCount = 0;
    let lossCount = 0;

    (Array.isArray(cycles) ? cycles : []).forEach((cycle) => {
        const status = normalizeToken(cycle?.status);
        if (ACTIVE_STATUS_VALUES.includes(status)) openCount += 1;
        else if (status === 'closed') closedCount += 1;

        const type = normalizeToken(cycle?.economic_type);
        if (type === 'donation') donationCount += 1;
        else if (type === 'expense') expenseCount += 1;
        else if (type === 'income') incomeCount += 1;
        else if (type === 'loss') lossCount += 1;
    });

    const chips = [];
    if (openCount > 0) chips.push({ label: `No pagado: ${openCount}`, cls: 'is-open' });
    if (closedCount > 0) chips.push({ label: `Pagado: ${closedCount}`, cls: 'is-closed' });
    if (donationCount > 0) chips.push({ label: `Donacion / Regalo: ${donationCount}`, cls: 'is-donation' });
    if (expenseCount > 0) chips.push({ label: `Gasto: ${expenseCount}`, cls: 'is-expense' });
    if (incomeCount > 0) chips.push({ label: `Ingreso: ${incomeCount}`, cls: 'is-income' });
    if (lossCount > 0) chips.push({ label: `Perdida: ${lossCount}`, cls: 'is-loss' });
    return chips;
}

function renderFamilySummaryChips(cycles) {
    const chips = buildFamilySummaryChips(cycles);
    if (chips.length === 0) return '';
    return `
        <div class="agro-operational-family-section__chips">
            ${chips.map((chip) => `<span class="agro-operational-family-chip ${chip.cls}">${escapeHtml(chip.label)}</span>`).join('')}
        </div>
    `;
}

function renderCycleFamilySection({ familyKey, title, copy, cycles }) {
    if (!Array.isArray(cycles) || cycles.length === 0) return '';

    return `
        <section class="agro-operational-family-section" data-family="${escapeAttr(familyKey)}">
            <div class="agro-operational-family-section__head">
                <div>
                    <p class="agro-operational-family-section__eyebrow">Ciclos visibles</p>
                    <h4 class="agro-operational-family-section__title">${escapeHtml(title)}</h4>
                    <p class="agro-operational-family-section__copy">${escapeHtml(copy)}</p>
                    ${renderFamilySummaryChips(cycles)}
                </div>
                <span class="agro-operational-family-section__count">${cycles.length}</span>
            </div>
            <div class="agro-operational-family-section__grid">
                ${cycles.map((cycle) => renderCycleCard(cycle)).join('')}
            </div>
        </section>
    `;
}

function renderGroupedCycleList(cycles = []) {
    const { linked, unlinked } = splitCyclesByAssociation(cycles);

    return [
        renderCycleFamilySection({
            familyKey: 'linked',
            title: '🌱 Asociados al cultivo',
            copy: 'Conservan crop_id para trazabilidad, pero su lectura oficial vive en Ciclos de Período.',
            cycles: linked
        }),
        linked.length && unlinked.length
            ? `
                <div class="agro-operational-family-break" aria-hidden="true">
                    <span class="agro-operational-family-break__line"></span>
                    <span class="agro-operational-family-break__label">Movimientos generales fuera del cultivo</span>
                    <span class="agro-operational-family-break__line"></span>
                </div>
            `
            : '',
        renderCycleFamilySection({
            familyKey: 'unlinked',
            title: '🌾 No asociados al cultivo',
            copy: 'Son movimientos generales sin crop_id, separados de la lectura del cultivo.',
            cycles: unlinked
        })
    ].filter(Boolean).join('');
}

function renderOverview() {
    if (!state.refs?.overviewBody) return;

    renderSubviewSwitch();
    const meta = getSubviewMeta(state.currentSubview);
    const isSoftRefreshing = state.loading && state.loadedOnce;
    state.refs.overviewEyebrow.textContent = meta.eyebrow;
    state.refs.overviewTitle.textContent = meta.title;
    state.refs.overviewCopy.textContent = meta.copy;
    state.refs.overviewSection?.classList.toggle('is-refreshing', isSoftRefreshing);

    if (isSoftRefreshing) {
        return;
    }

    const shouldBlockInitialLoading = !state.loadedOnce && !state.schemaMissing;

    if (shouldBlockInitialLoading) {
        state.refs.overviewBody.innerHTML = `
            <div class="agro-operational-summary-grid agro-operational-summary-grid--loading">
                <article class="agro-operational-summary-card agro-operational-summary-card--loading">
                    <span class="agro-operational-summary-card__label">Preparando vista</span>
                    <strong class="agro-operational-summary-card__value">Cargando</strong>
                    <p class="agro-operational-summary-card__hint">Leyendo ciclos, cultivos y balances visibles.</p>
                </article>
                <article class="agro-operational-summary-card agro-operational-summary-card--loading">
                    <span class="agro-operational-summary-card__label">Asociados al cultivo</span>
                    <strong class="agro-operational-summary-card__value">En lectura</strong>
                    <p class="agro-operational-summary-card__hint">Se ordenan aparte para no mezclar la lectura por cultivo.</p>
                </article>
                <article class="agro-operational-summary-card agro-operational-summary-card--loading">
                    <span class="agro-operational-summary-card__label">No asociados</span>
                    <strong class="agro-operational-summary-card__value">Ordenando</strong>
                    <p class="agro-operational-summary-card__hint">Los movimientos generales quedan fuera de la lectura del cultivo.</p>
                </article>
                <article class="agro-operational-summary-card agro-operational-summary-card--loading">
                    <span class="agro-operational-summary-card__label">Balance</span>
                    <strong class="agro-operational-summary-card__value">Calculando</strong>
                    <p class="agro-operational-summary-card__hint">La primera carga evita pintar vacíos transitorios.</p>
                </article>
            </div>
        `;
        return;
    }

    if (state.currentSubview === SUBVIEW_EXPORT) {
        const activeSummary = state.datasets[SUBVIEW_ACTIVE].summary;
        const finishedSummary = state.datasets[SUBVIEW_FINISHED].summary;
        const totalCount = activeSummary.count + finishedSummary.count;
        state.refs.overviewBody.innerHTML = `
            ${renderExportCompactOverview(activeSummary, finishedSummary, totalCount)}
            <div class="agro-operational-overview-stack">
                <div>
                    <p class="agro-operational-subtext">Filtros activos para exportar:</p>
                    ${renderFilterPills(state.datasets[SUBVIEW_ACTIVE].filters)}
                </div>
                <div>
                    <p class="agro-operational-subtext">Filtros pagados / pérdidas para exportar:</p>
                    ${renderFilterPills(state.datasets[SUBVIEW_FINISHED].filters)}
                </div>
            </div>
        `;
        return;
    }

    if (state.currentSubview === SUBVIEW_DONATIONS) {
        const donationCycles = filterCyclesByFamily(getCyclesForSubview(SUBVIEW_DONATIONS), state.familyFilter);
        const summary = createDatasetSummary(donationCycles);
        const familyLabel = getFamilyLabel(state.familyFilter);
        state.refs.overviewBody.innerHTML = `
            ${renderCompactOverview({
                label: 'Resumen de esta vista',
                summary,
                familyLabel: `${familyLabel} — donaciones incluidas como gastos`,
                balanceLabel: 'Balance donaciones',
                balanceHint: `Recibí: ${renderMoneyNode(summary.incomingText)} · Gasté: ${renderMoneyNode(summary.outgoingText)}`
            })}
        `;
        return;
    }

    if (state.currentSubview === SUBVIEW_LOSSES) {
        const lossCycles = filterCyclesByFamily(getCyclesForSubview(SUBVIEW_LOSSES), state.familyFilter);
        const summary = createDatasetSummary(lossCycles);
        const familyLabel = getFamilyLabel(state.familyFilter);
        state.refs.overviewBody.innerHTML = `
            ${renderCompactOverview({
                label: 'Resumen de esta vista',
                summary,
                familyLabel: `${familyLabel} — cancelaciones o pérdidas operativas`,
                balanceLabel: 'Balance pérdidas',
                balanceHint: `Recibí: ${renderMoneyNode(summary.incomingText)} · Gasté: ${renderMoneyNode(summary.outgoingText)}`
            })}
        `;
        return;
    }

    const familyCycles = filterCyclesByFamily(getCyclesForSubview(state.currentSubview), state.familyFilter);
    const summary = createDatasetSummary(familyCycles);
    const familyLabel = getFamilyLabel(state.familyFilter);
    state.refs.overviewBody.innerHTML = `
        ${renderCompactOverview({
            label: 'Resumen de esta vista',
            summary,
            familyLabel
        })}
    `;
}

function renderFilters(subview) {
    const dataset = getDataset(subview);
    const filters = dataset.filters;
    const hasActiveFilters = hasActiveAdvancedFilters(filters);
    const detailsKey = buildAdvancedFiltersDetailsKey(subview);

    return `
        <section class="agro-operational-filter-bar">
            <details
                class="agro-operational-filter-details"
                data-operational-advanced-filters
                data-operational-details-key="${escapeAttr(detailsKey)}"${renderDetailsOpenAttribute(detailsKey, hasActiveFilters)}>
                <summary class="agro-operational-filter-summary">
                    <span class="agro-operational-filter-summary__label">Filtros avanzados</span>
                    <span class="agro-operational-filter-summary__meta">${escapeHtml(renderAdvancedFilterMeta(filters))}</span>
                    <span class="agro-operational-filter-summary__chevron"><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span>
                </summary>
                <div class="agro-operational-filter-grid">
                    <label class="agro-operational-filter">
                        <span class="agro-operational-filter__label">Período</span>
                        <select class="styled-input" data-operational-filter-view="${subview}" data-operational-filter-key="period">
                            ${buildSelectOptionsMarkup(PERIOD_OPTIONS, filters.period)}
                        </select>
                    </label>
                    <label class="agro-operational-filter">
                        <span class="agro-operational-filter__label">Categoría</span>
                        <select class="styled-input" data-operational-filter-view="${subview}" data-operational-filter-key="category">
                            ${buildSelectOptionsMarkup(CATEGORY_FILTER_OPTIONS, filters.category)}
                        </select>
                    </label>
                    <label class="agro-operational-filter">
                        <span class="agro-operational-filter__label">Tipo</span>
                        <select class="styled-input" data-operational-filter-view="${subview}" data-operational-filter-key="economicType">
                            ${buildSelectOptionsMarkup(TYPE_FILTER_OPTIONS, filters.economicType)}
                        </select>
                    </label>
                </div>
            </details>
        </section>
    `;
}

function clearFiltersHost() {
    if (!state.refs?.filtersHost) return;
    state.refs.filtersHost.innerHTML = '';
}

function syncFiltersHost(subview) {
    if (!state.refs?.filtersHost) return;
    if (subview !== SUBVIEW_ACTIVE && subview !== SUBVIEW_FINISHED) {
        clearFiltersHost();
        return;
    }

    const host = state.refs.filtersHost;
    const filters = getDataset(subview).filters;
    const expectedKeys = ['period', 'category', 'economicType'];
    const existingSelects = expectedKeys.map((key) => host.querySelector(`[data-operational-filter-key="${key}"]`));
    const canReuse = existingSelects.every((select) => select instanceof HTMLSelectElement);

    if (!canReuse) {
        host.innerHTML = renderFilters(subview);
    }

    expectedKeys.forEach((key) => {
        const select = host.querySelector(`[data-operational-filter-key="${key}"]`);
        if (!(select instanceof HTMLSelectElement)) return;
        select.dataset.operationalFilterView = subview;
        const nextValue = normalizeToken(filters[key]) || 'all';
        if (select.value !== nextValue) {
            select.value = nextValue;
        }
    });

    const filterDetails = host.querySelector('.agro-operational-filter-details');
    const filterMeta = host.querySelector('.agro-operational-filter-summary__meta');
    const filterDetailsKey = buildAdvancedFiltersDetailsKey(subview);
    if (filterMeta) {
        filterMeta.textContent = renderAdvancedFilterMeta(filters);
    }
    if (filterDetails instanceof HTMLDetailsElement) {
        filterDetails.dataset.operationalDetailsKey = filterDetailsKey;
        filterDetails.open = readDetailsOpenState(filterDetailsKey, hasActiveAdvancedFilters(filters));
    }
}

function buildStatusClass(status) {
    return STATUS_CLASS_BY_VALUE[normalizeToken(status)] || 'is-open';
}

function renderMovementRows(cycle) {
    if (!Array.isArray(cycle.movements) || cycle.movements.length === 0) {
        return `
            <div class="agro-operational-empty">
                <div class="agro-operational-empty__icon"><i class="fa-solid fa-file-circle-question" aria-hidden="true"></i></div>
                <p class="agro-operational-empty__title">📜 Sin historial todavía</p>
                <p class="agro-operational-empty__copy">Este ciclo aún no tiene movimientos visibles.</p>
            </div>
        `;
    }

    return `
        <div class="agro-operational-detail-list">
            ${cycle.movements.map((movement) => `
                <article class="agro-operational-detail-item">
                    <span class="agro-operational-movement-badge ${movement.direction === 'in' ? 'is-in' : 'is-out'}">${escapeHtml(directionDetailLabel(movement.direction, cycle.economic_type))}</span>
                    <div>
                        <p class="agro-operational-detail-item__concept">${escapeHtml(movement.concept || cycle.name)}</p>
                        <p class="agro-operational-detail-item__meta">${escapeHtml(formatDateLabel(movement.movement_date))} · ${escapeHtml(formatQuantityLabel(movement.quantity, movement.unit_type))} · ${escapeHtml(formatAmountLabel(movement.amount, movement.currency))}</p>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

function renderCyclePhysicalSummary(cycle) {
    const physicalSummary = cycle?.physicalSummary;
    if (!physicalSummary) return '';
    const familyBreakdown = Array.isArray(physicalSummary.families) && physicalSummary.families.length > 1
        ? `
            <div class="agro-operational-physical-summary__families">
                ${physicalSummary.families.map((family) => `
                    <span class="agro-operational-physical-summary__family">
                        ${escapeHtml(family.label)}: ${escapeHtml(family.totalText)}
                    </span>
                `).join('')}
            </div>
        `
        : '';

    return `
        <section class="agro-operational-physical-summary" data-mode="${escapeAttr(physicalSummary.mode)}">
            <span class="agro-operational-physical-summary__label">Base operativa</span>
            <strong class="agro-operational-physical-summary__value">${escapeHtml(physicalSummary.summaryText)}</strong>
            <p class="agro-operational-physical-summary__hint">${escapeHtml(physicalSummary.hintText)}</p>
            ${familyBreakdown}
        </section>
    `;
}

function renderCycleCard(cycle) {
    const cropText = buildCycleCropText(cycle);
    const statusLabel = readLabel(STATUS_OPTIONS, cycle.status, '🟡 No pagado');
    const economicTypeLabel = readLabel(ECONOMIC_TYPE_OPTIONS, cycle.economic_type, 'Operación');
    const primaryAmount = formatAmountLabel(cycle.primaryMovement?.amount, cycle.primaryMovement?.currency);
    const detailsKey = buildCardDetailsKey(cycle.id);
    const dates = cycle.closed_at
        ? `${formatDateLabel(cycle.opened_at)} · Cierre: ${formatDateLabel(cycle.closed_at)}`
        : `${formatDateLabel(cycle.opened_at)} · Sin cierre`;

    return `
        <article class="agro-operational-card" data-cycle-id="${escapeAttr(cycle.id)}">
            <div class="agro-operational-card__head">
                <div class="agro-operational-card__stack">
                    <p class="agro-operational-card__eyebrow">${escapeHtml(readLabel(CATEGORY_OPTIONS, cycle.category, 'Categoría'))}</p>
                    <h3 class="agro-operational-card__title">${escapeHtml(cycle.name)}</h3>
                    <p class="agro-operational-card__meta">${escapeHtml(cropText)} · ${escapeHtml(dates)}</p>
                </div>
                <div class="agro-operational-card__badges">
                    <span class="agro-operational-status ${buildStatusClass(cycle.status)}">${escapeHtml(statusLabel)}</span>
                    <span class="agro-operational-pill ${buildTypeClass(cycle.economic_type)}">${escapeHtml(economicTypeLabel)}</span>
                </div>
            </div>

            ${cycle.description ? `<p class="agro-operational-card__description"><strong>📝 Descripción:</strong> ${escapeHtml(cycle.description)}</p>` : ''}
            ${cycle.notes ? `<p class="agro-operational-card__notes"><strong>📌 Observaciones:</strong> ${escapeHtml(cycle.notes)}</p>` : ''}
            ${renderCyclePhysicalSummary(cycle)}

            <div class="agro-operational-money-grid">
                <div class="agro-operational-money-cell" data-tone="gold">
                    <span class="agro-operational-money-cell__label">${escapeHtml(directionSummaryLabel(cycle.direction, cycle.economic_type))}</span>
                    ${renderMoneyNode(primaryAmount, { tag: 'strong', className: 'agro-operational-money-cell__value' })}
                </div>
                <div class="agro-operational-money-cell">
                    <span class="agro-operational-money-cell__label">💰 Recibí / Cobré</span>
                    ${renderMoneyNode(cycle.incomingText, { tag: 'strong', className: 'agro-operational-money-cell__value' })}
                </div>
                <div class="agro-operational-money-cell">
                    <span class="agro-operational-money-cell__label">💸 Pagué / Gasté</span>
                    ${renderMoneyNode(cycle.outgoingText, { tag: 'strong', className: 'agro-operational-money-cell__value' })}
                </div>
                <div class="agro-operational-money-cell" data-tone="${escapeAttr(cycle.balanceTone)}">
                    <span class="agro-operational-money-cell__label">📊 Balance del ciclo</span>
                    ${renderMoneyNode(cycle.balanceText, { tag: 'strong', className: 'agro-operational-money-cell__value' })}
                </div>
            </div>

            <div class="agro-operational-card__footer">
                <div class="agro-operational-card__support">
                    <span class="agro-operational-card__support-item">📜 ${cycle.movementCount} movimiento${cycle.movementCount === 1 ? '' : 's'}</span>
                    <span class="agro-operational-card__support-item">${escapeHtml(cycle.crop_id ? '🌱 Asociado al cultivo' : '🌾 No asociado al cultivo')}</span>
                    <span class="agro-operational-card__support-item">${escapeHtml(readLabel(CATEGORY_OPTIONS, cycle.category, '📋 Otro'))}</span>
                </div>
                <div class="agro-operational-card__actions">
                    <button type="button" class="btn" data-operational-action="edit" data-cycle-id="${escapeAttr(cycle.id)}">✏️ Editar</button>
                    <button type="button" class="btn btn-primary" data-operational-action="delete" data-cycle-id="${escapeAttr(cycle.id)}">🗑️ Eliminar</button>
                </div>
            </div>

            <details
                class="agro-operational-card__details"
                data-operational-card-details
                data-operational-details-key="${escapeAttr(detailsKey)}"${renderDetailsOpenAttribute(detailsKey)}>
                <summary>
                    <span>📜 Historial (${cycle.movementCount} movimiento${cycle.movementCount === 1 ? '' : 's'})</span>
                    <span>${escapeHtml(statusLabel)}</span>
                </summary>
                ${renderMovementRows(cycle)}
            </details>
        </article>
    `;
}

function renderEmptyState(subview) {
    const title = subview === SUBVIEW_DONATIONS
        ? '🤝 Sin donaciones en esta familia'
        : subview === SUBVIEW_LOSSES
            ? '💔 Sin pérdidas en esta familia'
            : subview === SUBVIEW_FINISHED
                ? '✅ Sin pagados con esos filtros'
                : '🟡 Sin ciclos no pagados con esos filtros';
    const copy = subview === SUBVIEW_DONATIONS
        ? 'No hay carteras operativas de tipo donación registradas para esta familia.'
        : subview === SUBVIEW_LOSSES
            ? 'No hay carteras operativas clasificadas como pérdida para esta familia.'
            : subview === SUBVIEW_FINISHED
                ? 'Ajusta período, categoría o tipo económico para ver ciclos ya pagados o cerrados.'
                : 'Ajusta período, categoría o tipo económico para ver ciclos no pagados, en seguimiento o compensándose.';

    return `
        <div class="agro-operational-empty">
            <div class="agro-operational-empty__icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></div>
            <p class="agro-operational-empty__title">${title}</p>
            <p class="agro-operational-empty__copy">${copy}</p>
            <div class="agro-operational-empty__cta">
                <button type="button" class="btn btn-primary" data-operational-action="new-cycle">Nueva cartera operativa</button>
            </div>
        </div>
    `;
}

function buildExportFileName() {
    return `ciclos-operativos-${currentMonthKey()}.md`;
}

function buildMarkdownSection(title, datasetKey) {
    const dataset = getDataset(datasetKey);
    const lines = [`## ${title}`, ''];
    lines.push(`Filtros: ${readLabel(PERIOD_OPTIONS, dataset.filters.period, '📅 Todo')} · ${readLabel(CATEGORY_FILTER_OPTIONS, dataset.filters.category, '📁 Todas las categorías')} · ${readLabel(TYPE_FILTER_OPTIONS, dataset.filters.economicType, '💰 Todos los tipos')}`);
    lines.push(`Balance: ${dataset.summary.balanceText}`);
    lines.push(`Ciclos visibles: ${dataset.summary.count}`);
    lines.push('');

    if (dataset.cycles.length === 0) {
        lines.push('- Sin ciclos con los filtros actuales.');
        lines.push('');
        return lines;
    }

    dataset.cycles.forEach((cycle) => {
        lines.push(`### ${cycle.name}`);
        lines.push(`- Tipo económico: ${readLabel(ECONOMIC_TYPE_OPTIONS, cycle.economic_type, 'Sin tipo')}`);
        lines.push(`- Categoría: ${readLabel(CATEGORY_OPTIONS, cycle.category, 'Sin categoría')}`);
        lines.push(`- Estado: ${readLabel(STATUS_OPTIONS, cycle.status, '🟡 No pagado')}`);
        lines.push(`- Familia: ${cycle.crop_id ? 'Asociado al cultivo' : 'No asociado al cultivo'}`);
        lines.push(`- Cultivo asociado: ${buildCycleCropText(cycle)}`);
        lines.push(`- Fechas: ${cycle.closed_at ? `${formatDateLabel(cycle.opened_at)} · Cierre ${formatDateLabel(cycle.closed_at)}` : `${formatDateLabel(cycle.opened_at)} · Sin cierre`}`);
        lines.push(`- ${directionSummaryLabel(cycle.direction, cycle.economic_type)}: ${formatAmountLabel(cycle.primaryMovement?.amount, cycle.primaryMovement?.currency)}`);
        lines.push(`- 📊 Balance del ciclo: ${cycle.balanceText}`);
        lines.push(`- Descripción principal: ${cycle.description || 'Sin descripción principal'}`);
        if (cycle.notes) {
            lines.push(`- Observaciones posteriores: ${cycle.notes}`);
        }
        lines.push('- 📜 Historial:');
        if (cycle.movements.length === 0) {
            lines.push('  - Sin movimientos visibles.');
        } else {
            cycle.movements.forEach((movement) => {
                lines.push(`  - ${formatDateLabel(movement.movement_date)} · ${directionDetailLabel(movement.direction, cycle.economic_type)} · ${formatAmountLabel(movement.amount, movement.currency)} · ${movement.concept || cycle.name}`);
            });
        }
        lines.push('');
    });

    return lines;
}

function buildExportMarkdown() {
    const lines = [
        '# 💼 Cartera Operativa',
        '',
        `Generado: ${formatDateLabel(todayLocalIso())}`,
        '',
        '## 📊 Resumen',
        '',
        `- 🟡 Activos exportados: ${state.datasets[SUBVIEW_ACTIVE].summary.count}`,
        `- ✅ Pagados / pérdidas exportados: ${state.datasets[SUBVIEW_FINISHED].summary.count}`,
        `- 📊 Balance combinado: ${mergeSummaryBalanceText(state.datasets[SUBVIEW_ACTIVE].summary, state.datasets[SUBVIEW_FINISHED].summary)}`,
        ''
    ];

    buildMarkdownSection('🟡 Activos', SUBVIEW_ACTIVE).forEach((line) => lines.push(line));
    buildMarkdownSection('✅ Pagados / pérdidas', SUBVIEW_FINISHED).forEach((line) => lines.push(line));

    return lines.join('\n');
}

function downloadMarkdownFile() {
    const markdown = buildExportMarkdown();
    const filename = buildExportFileName();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return {
        filename,
        markdown
    };
}

function renderExportView() {
    const markdown = buildExportMarkdown();

    return `
        <div class="agro-operational-export-panel">
            <div class="agro-operational-export-actions">
                <button type="button" class="btn btn-primary" data-operational-action="download-markdown">📥 Exportar MD</button>
                <span class="agro-operational-export-filename">${escapeHtml(buildExportFileName())}</span>
            </div>
            <div class="agro-operational-export-preview">
                <p class="agro-operational-export-preview__label">Vista previa del archivo</p>
                <pre>${escapeHtml(markdown)}</pre>
            </div>
        </div>
    `;
}

function renderCurrentSubview() {
    if (!state.refs?.list || !state.refs?.listStatus || !state.refs?.filtersHost) return;

    renderSubviewSwitch();
    const meta = getSubviewMeta(state.currentSubview);
    const isSoftRefreshing = state.loading && state.loadedOnce;
    state.refs.listEyebrow.textContent = meta.eyebrow;
    state.refs.listTitle.textContent = meta.title;
    state.refs.listCopy.textContent = meta.copy;
    state.refs.listSection?.classList.toggle('is-refreshing', isSoftRefreshing);
    state.refs.listStatus.classList.toggle('is-refreshing', isSoftRefreshing);
    state.refs.listStatus.toggleAttribute('aria-busy', isSoftRefreshing);

    unmountAgroPeriodCycles();
    const shouldBlockInitialLoading = !state.loadedOnce && !state.schemaMissing;

    if (shouldBlockInitialLoading) {
        syncFiltersHost(state.currentSubview);
        state.refs.listStatus.textContent = 'Cargando cartera operativa...';
        state.refs.list.innerHTML = `
            <div class="agro-operational-panel">
                <div class="agro-operational-loading">
                    <span class="agro-operational-loading__spinner" aria-hidden="true"></span>
                    <span>Consultando ciclos y movimientos...</span>
                </div>
            </div>
        `;
        return;
    }

    if (state.schemaMissing) {
        clearFiltersHost();
        state.refs.listStatus.textContent = 'La vista quedó lista, pero Supabase aún no tiene la migración aplicada.';
        state.refs.list.innerHTML = `
            <div class="agro-operational-empty">
                <div class="agro-operational-empty__icon"><i class="fa-solid fa-database" aria-hidden="true"></i></div>
                <p class="agro-operational-empty__title">Migración pendiente</p>
                <p class="agro-operational-empty__copy">Aplica la migración canónica para habilitar <code>agro_operational_cycles</code> y <code>agro_operational_movements</code>.</p>
            </div>
        `;
        return;
    }

    if (isSoftRefreshing) {
        return;
    }

    if (state.currentSubview === SUBVIEW_EXPORT) {
        const activeCount = state.datasets[SUBVIEW_ACTIVE].summary.count;
        const finishedCount = state.datasets[SUBVIEW_FINISHED].summary.count;
        clearFiltersHost();
        state.refs.listStatus.textContent = `Exportarás ${activeCount + finishedCount} ciclo${activeCount + finishedCount === 1 ? '' : 's'} respetando los filtros activos.`;
        state.refs.list.innerHTML = renderExportView();
        return;
    }

    if (state.currentSubview === SUBVIEW_DONATIONS) {
        const donationCycles = filterCyclesByFamily(getCyclesForSubview(SUBVIEW_DONATIONS), state.familyFilter);
        clearFiltersHost();
        state.refs.listStatus.textContent = `${donationCycles.length} donación${donationCycles.length === 1 ? '' : 'es'} — ${getFamilyLabel(state.familyFilter)}`;

        if (donationCycles.length === 0) {
            state.refs.list.innerHTML = renderEmptyState(SUBVIEW_DONATIONS);
            return;
        }

        const familyKey = state.familyFilter;
        state.refs.list.innerHTML = renderCycleFamilySection({
            familyKey,
            title: `🤝 Donaciones — ${getFamilyLabel(familyKey)}`,
            copy: 'Donaciones y regalos registrados como gastos operativos.',
            cycles: donationCycles
        });
        return;
    }

    if (state.currentSubview === SUBVIEW_LOSSES) {
        const lossCycles = filterCyclesByFamily(getCyclesForSubview(SUBVIEW_LOSSES), state.familyFilter);
        clearFiltersHost();
        state.refs.listStatus.textContent = `${lossCycles.length} pérdida${lossCycles.length === 1 ? '' : 's'} — ${getFamilyLabel(state.familyFilter)}`;

        if (lossCycles.length === 0) {
            state.refs.list.innerHTML = renderEmptyState(SUBVIEW_LOSSES);
            return;
        }

        const familyKey = state.familyFilter;
        state.refs.list.innerHTML = renderCycleFamilySection({
            familyKey,
            title: `💔 Pérdidas — ${getFamilyLabel(familyKey)}`,
            copy: 'Pérdidas o cancelaciones registradas como lectura operativa real.',
            cycles: lossCycles
        });
        return;
    }

    const dataset = getDataset(state.currentSubview);
    const familyCycles = filterCyclesByFamily(getCyclesForSubview(state.currentSubview), state.familyFilter);
    syncFiltersHost(state.currentSubview);
    state.refs.listStatus.textContent = `${familyCycles.length} ciclo${familyCycles.length === 1 ? '' : 's'} visible${familyCycles.length === 1 ? '' : 's'} — ${getFamilyLabel(state.familyFilter)}`;

    if (familyCycles.length === 0) {
        state.refs.list.innerHTML = renderEmptyState(state.currentSubview);
        return;
    }

    const familyKey = state.familyFilter;
    state.refs.list.innerHTML = renderCycleFamilySection({
        familyKey,
        title: getFamilyLabel(familyKey),
        copy: familyKey === FAMILY_LINKED
            ? 'Conservan crop_id para trazabilidad, pero su lectura oficial vive en Ciclos de Período.'
            : 'Son movimientos generales sin crop_id, separados de la lectura del cultivo.',
        cycles: familyCycles
    });
}

function renderAll() {
    renderWizard();
    syncCommercialFamilyTabs();
    renderFamilyToggle();
    renderOverview();
    renderCurrentSubview();
}

function readExistingCycle(cycleId) {
    return state.cycleIndex.get(normalizeId(cycleId)) || null;
}

function resetForm() {
    state.editId = '';
    state.form = createFormState({
        values: createDraftValues({
            economicType: state.form.values.economicType || 'expense',
            category: state.form.values.category || 'other',
            currency: state.form.values.currency || 'COP',
            movementDate: todayLocalIso()
        })
    });
    clearFeedback();
    renderWizard();
}

function setEditMode(cycle) {
    if (!cycle) return;
    state.editId = normalizeId(cycle.id);
    state.form = createFormState({
        mode: 'edit',
        step: 1,
        values: createDraftValues({
            name: cycle.name,
            description: cycle.description || '',
            economicType: cycle.economic_type,
            category: cycle.category,
            cropId: cycle.crop_id,
            amount: cycle.primaryMovement?.amount == null ? '' : String(cycle.primaryMovement.amount),
            currency: cycle.primaryMovement?.currency || 'COP',
            movementDate: cycle.primaryMovement?.movement_date || cycle.opened_at || todayLocalIso(),
            quantity: cycle.primaryMovement?.quantity == null ? '' : String(cycle.primaryMovement.quantity),
            unitType: cycle.primaryMovement?.unit_type || '',
            status: cycle.status || 'open',
            notes: cycle.notes || '',
            closeOnSave: cycle.status === 'closed'
        })
    });
    clearFeedback();
    renderWizard();
}

function focusForm() {
    openComposerModal();
    window.requestAnimationFrame(() => {
        const focusNode = state.refs?.name || state.refs?.form?.querySelector('input, select, textarea, button');
        focusNode?.focus?.();
    });
}

function focusWizardStep(step) {
    window.requestAnimationFrame(() => {
        if (step === 1) {
            state.refs?.name?.focus?.();
            return;
        }
        if (step === 2) {
            state.refs?.economicType?.focus?.();
            return;
        }
        if (step === 3) {
            state.refs?.amount?.focus?.();
            return;
        }
        const focusNode = state.refs?.status || state.refs?.form?.querySelector('button[type="submit"]');
        focusNode?.focus?.();
    });
}

function validateStep(step) {
    try {
        const values = state.form.values;
        if (step === 1 && !String(values.name || '').trim()) {
            throw new Error('El nombre del ciclo es obligatorio.');
        }

        if (step === 2) {
            ensureAllowedValue(values.economicType, ECONOMIC_TYPE_OPTIONS.map((option) => option.value), 'Tipo económico no valido.');
            ensureAllowedValue(values.category, CATEGORY_OPTIONS.map((option) => option.value), 'Categoría no valida.');
            if (!state.editId) {
                ensureLocalCropSelection(values.cropId);
            }
        }

        if (step === 3) {
            assertMovementDateAllowed(values.movementDate);
            toNullableNumber(values.amount, 'El monto');
            const quantity = toNullableNumber(values.quantity, 'La cantidad');
            const unitTypeRaw = toNullableText(values.unitType);
            if ((quantity == null) !== (unitTypeRaw == null)) {
                throw new Error('Cantidad y unidad deben viajar juntas.');
            }
            if (unitTypeRaw) {
                ensureAllowedValue(unitTypeRaw, UNIT_TYPE_OPTIONS.map((option) => option.value), 'Unidad no valida.');
            }
        }

        clearFeedback();
        return true;
    } catch (error) {
        const message = normalizeOperationalError(error);
        setFeedback(message, 'error');
        notify(message, 'error');
        return false;
    }
}

function readFormPayload() {
    return normalizePayload(state.form.values, {
        mode: state.form.mode,
        existingCycle: state.editId ? readExistingCycle(state.editId) : null
    });
}

async function fetchDatasetRecords(supabase, userId, datasetKey, statuses) {
    const filters = getDataset(datasetKey).filters;
    const cycles = await fetchCycles(supabase, userId, filters, statuses);
    const cycleIds = cycles.map((cycle) => normalizeId(cycle.id)).filter(Boolean);
    const movements = await fetchMovements(supabase, userId, cycleIds);
    return { cycles, movements };
}

async function refreshData(options = {}) {
    if (!state.root) return;
    if (state.loading) {
        state.needsRefresh = true;
        return;
    }

    captureOperationalDetailsState();
    state.loading = true;
    state.schemaMissing = false;
    renderOverview();
    renderCurrentSubview();

    try {
        const supabase = await getSupabaseClient();
        const userId = await ensureUserId(options.initialUserId);
        const [exchangeRates, crops, activeRecords, finishedRecords] = await Promise.all([
            initExchangeRates(),
            fetchCrops(supabase, userId),
            fetchDatasetRecords(supabase, userId, SUBVIEW_ACTIVE, ACTIVE_STATUS_VALUES),
            fetchDatasetRecords(supabase, userId, SUBVIEW_FINISHED, FINISHED_STATUS_VALUES)
        ]);
        state.exchangeRates = sanitizeExchangeRates(exchangeRates);

        const cropMap = new Map(crops.map((crop) => {
            const display = buildCropDisplay(crop);
            return [display.id, display];
        }));

        const buildCyclesFromRecords = (records) => {
            const movementMap = new Map();
            records.movements.forEach((movement) => {
                const cycleId = normalizeId(movement?.cycle_id);
                if (!movementMap.has(cycleId)) {
                    movementMap.set(cycleId, []);
                }
                movementMap.get(cycleId).push(movement);
            });
            return records.cycles.map((cycle) => buildCycleViewModel(cycle, movementMap, cropMap));
        };

        state.crops = crops;
        state.datasets[SUBVIEW_ACTIVE].cycles = buildCyclesFromRecords(activeRecords);
        state.datasets[SUBVIEW_ACTIVE].summary = createDatasetSummary(state.datasets[SUBVIEW_ACTIVE].cycles);
        state.datasets[SUBVIEW_FINISHED].cycles = buildCyclesFromRecords(finishedRecords);
        state.datasets[SUBVIEW_FINISHED].summary = createDatasetSummary(state.datasets[SUBVIEW_FINISHED].cycles);
        rebuildPortfolioByCrop(state.exchangeRates);
        rebuildCycleIndex();
        state.loadedOnce = true;

        const preserveOpenCreateWizard = state.modalOpen
            && state.form.mode === 'create'
            && state.refs?.form;

        if (state.editId) {
            const current = readExistingCycle(state.editId);
            if (current) {
                // Preserve in-flight edit draft — do NOT rehydrate from server data.
                // refreshData() still updates datasets (cycles, crops, etc.) above;
                // only the form values are protected to avoid overwriting user edits.
            } else {
                resetForm();
            }
        } else if (!preserveOpenCreateWizard) {
            renderWizard();
        }

        renderFamilyToggle();
        renderOverview();
        renderCurrentSubview();
    } catch (error) {
        state.schemaMissing = isSchemaMissingError(error);
        state.crops = [];
        state.datasets = createDatasetsState();
        state.portfolioByCrop = new Map();
        state.operationalExpensesByCrop = new Map();
        state.operationalPendingByCrop = new Map();
        rebuildCycleIndex();
        renderWizard();
        renderFamilyToggle();
        renderOverview();
        renderCurrentSubview();
        setFeedback(normalizeOperationalError(error), 'error');
    } finally {
        state.loading = false;
        setControlsDisabled(state.schemaMissing || state.saving);
        renderFamilyToggle();
        renderCurrentSubview();
        renderOverview();
        emitPortfolioSnapshot();
        if (state.needsRefresh) {
            state.needsRefresh = false;
            window.setTimeout(() => refreshData(), 0);
        }
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    if (state.saving) return;
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    clearFeedback();
    state.saving = true;
    setControlsDisabled(true);

    try {
        const payload = readFormPayload();
        const result = state.editId
            ? await updateCycleRecord(state.editId, payload)
            : await createCycleRecord(payload);

        await refreshData();
        resetForm();
        closeComposerModal();
        setFeedback(result.message, 'success');
        notify(result.message, 'success');
    } catch (error) {
        const message = normalizeOperationalError(error);
        setFeedback(message, 'error');
        notify(message, 'error');
    } finally {
        state.saving = false;
        setControlsDisabled(state.schemaMissing || false);
    }
}

function updateDraftFromField(field, value) {
    setDraftFieldValue(field, value);

    if (field === 'economicType' && !state.editId) {
        const type = String(value || '').trim();
        if (type === 'loss') setDraftFieldValue('status', 'lost');
        else if (type === 'donation') setDraftFieldValue('status', 'closed');
        else if (state.form.values.status === 'lost') setDraftFieldValue('status', 'open');
    }

    if (field === 'economicType' || field === 'status' || field === 'cropId' || field === 'unitType') {
        if (!state.editId) renderWizard();
    }

    if (state.form.step === 4 && ['amount', 'currency', 'movementDate', 'quantity', 'description', 'name', 'category'].includes(field)) {
        if (!state.editId) renderWizard();
    }
}

async function handleRootClick(event) {
    if (state.modalOpen && event.target === state.refs?.modalOverlay) {
        resetForm();
        closeComposerModal();
        return;
    }

    const viewButton = event.target.closest('[data-agro-view]');
    if (viewButton) {
        window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
            detail: { view: viewButton.dataset.agroView, scroll: true }
        }));
        return;
    }

    const button = event.target.closest('[data-operational-action]');
    if (!button) return;

    const action = button.dataset.operationalAction;

    if (action === 'new-cycle') {
        resetForm();
        focusForm();
        return;
    }

    if (action === 'refresh') {
        await refreshData();
        return;
    }

    if (action === 'set-family') {
        state.familyFilter = normalizeFamilyFilter(button.dataset.family);
        renderFamilyToggle();
        renderSubviewSwitch();
        renderOverview();
        renderCurrentSubview();
        return;
    }

    if (action === 'set-subview') {
        const nextSubview = normalizeOperationalSubview(button.dataset.subview);
        window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
            detail: {
                view: VIEW_NAME,
                subview: nextSubview,
                scroll: false
            }
        }));
        return;
    }

    if (action === 'focus-form') {
        focusForm();
        return;
    }

    if (action === 'cancel-form' || action === 'close-modal') {
        resetForm();
        closeComposerModal();
        return;
    }

    if (action === 'wizard-next') {
        if (!validateStep(state.form.step)) return;
        state.form.step = Math.min(4, state.form.step + 1);
        renderWizard();
        focusWizardStep(state.form.step);
        return;
    }

    if (action === 'wizard-prev') {
        state.form.step = Math.max(1, state.form.step - 1);
        clearFeedback();
        renderWizard();
        focusWizardStep(state.form.step);
        return;
    }

    if (action === 'wizard-goto') {
        const nextStep = Number(button.dataset.step || 1);
        if (!Number.isFinite(nextStep) || nextStep < 1 || nextStep > 4) return;
        if (nextStep > state.form.step) {
            for (let step = state.form.step; step < nextStep; step += 1) {
                if (!validateStep(step)) return;
            }
        }
        state.form.step = nextStep;
        clearFeedback();
        renderWizard();
        focusWizardStep(state.form.step);
        return;
    }

    if (action === 'download-markdown') {
        const result = downloadMarkdownFile();
        const message = `📥 Export listo: ${result.filename}`;
        setFeedback(message, 'success');
        notify(message, 'success');
        return;
    }

    const cycleId = normalizeId(button.dataset.cycleId);
    if (!cycleId) return;

    if (action === 'edit') {
        const cycle = readExistingCycle(cycleId);
        if (!cycle) return;
        setEditMode(cycle);
        focusForm();
        return;
    }

    if (action === 'delete') {
        clearFeedback();
        try {
            const result = await deleteCycleRecord(cycleId);
            if (result?.skipped) return;
            if (state.editId === cycleId) {
                resetForm();
            }
            await refreshData();
            setFeedback(result.message, result.cascadeVerified === false ? 'info' : 'success');
            notify(result.message, result.cascadeVerified === false ? 'warning' : 'success');
        } catch (error) {
            const message = normalizeOperationalError(error);
            setFeedback(message, 'error');
            notify(message, 'error');
        }
    }
}

function handleRootInput(event) {
    const target = event.target;
    const field = target.dataset.operationalDraft;
    if (!field) return;
    if (target instanceof HTMLSelectElement) return;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') return;
    const value = target.value;
    updateDraftFromField(field, value);
}

async function handleRootChange(event) {
    const filterKey = event.target.dataset.operationalFilterKey;
    const filterView = normalizeOperationalSubview(event.target.dataset.operationalFilterView);
    if (filterKey && (filterView === SUBVIEW_ACTIVE || filterView === SUBVIEW_FINISHED)) {
        getDataset(filterView).filters[filterKey] = normalizeToken(event.target.value) || 'all';
        await refreshData();
        return;
    }

    const field = event.target.dataset.operationalDraft;
    if (!field) return;
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    updateDraftFromField(field, value);
}

function bindEvents() {
    if (!state.root || state.root.dataset.operationalBound === '1') return;

    state.root.addEventListener('submit', (event) => {
        if (event.target?.id === 'agro-operational-form') {
            handleFormSubmit(event);
        }
    });
    state.root.addEventListener('click', (event) => {
        void handleRootClick(event);
    });
    state.root.addEventListener('input', handleRootInput);
    state.root.addEventListener('change', (event) => {
        void handleRootChange(event);
    });
    state.root.addEventListener('toggle', handleRootToggle, true);

    window.addEventListener(VIEW_CHANGED_EVENT, (event) => {
        state.currentView = normalizeToken(event?.detail?.view);
        state.currentSubview = normalizeOperationalSubview(event?.detail?.subview || state.currentSubview);

        if (state.currentView === PERIOD_VIEW_NAME) {
            closeComposerModal();
            syncStandalonePeriodCyclesView();
            return;
        }

        syncStandalonePeriodCyclesView();

        if (state.currentView !== VIEW_NAME) {
            closeComposerModal();
            return;
        }

        syncCommercialFamilyTabs();
        renderFamilyToggle();
        renderOverview();
        renderCurrentSubview();
        void refreshData();
    });

    window.addEventListener(CROPS_READY_EVENT, () => {
        if (state.currentView === VIEW_NAME) {
            void refreshData();
        }
    });

    window.addEventListener(MODE_CHANGE_EVENT, (event) => {
        const mode = normalizeToken(event?.detail?.mode);
        if (mode === 'cultivo') state.familyFilter = FAMILY_LINKED;
        else if (mode === 'no-cultivo') state.familyFilter = FAMILY_UNLINKED;
        else state.familyFilter = FAMILY_ALL;
        if (state.currentView !== VIEW_NAME) return;
        renderFamilyToggle();
        renderSubviewSwitch();
        renderOverview();
        renderCurrentSubview();
    });

    window.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !state.modalOpen) return;
        resetForm();
        closeComposerModal();
    });

    state.root.dataset.operationalBound = '1';
}

function buildDatasetSnapshot(datasetKey) {
    const dataset = getDataset(datasetKey);
    return {
        filters: { ...dataset.filters },
        summary: {
            count: dataset.summary.count,
            linkedCount: dataset.summary.linkedCount,
            unlinkedCount: dataset.summary.unlinkedCount,
            movementCount: dataset.summary.movementCount,
            incomingText: dataset.summary.incomingText,
            outgoingText: dataset.summary.outgoingText,
            balanceText: dataset.summary.balanceText
        },
        cycles: dataset.cycles.map((cycle) => ({
            id: cycle.id,
            name: cycle.name,
            description: cycle.description,
            notes: cycle.notes,
            economic_type: cycle.economic_type,
            category: cycle.category,
            crop_id: cycle.crop_id,
            crop_label: buildCycleCropText(cycle),
            status: cycle.status,
            direction: cycle.direction,
            movementCount: cycle.movementCount,
            primaryAmount: cycle.primaryMovement?.amount ?? null,
            primaryAmountLabel: formatAmountLabel(cycle.primaryMovement?.amount, cycle.primaryMovement?.currency),
            incomingText: cycle.incomingText,
            outgoingText: cycle.outgoingText,
            balanceText: cycle.balanceText
        }))
    };
}

function buildDebugSnapshot() {
    return {
        userId: state.userId,
        currentView: state.currentView,
        currentSubview: state.currentSubview,
        schemaMissing: state.schemaMissing,
        loading: state.loading,
        saving: state.saving,
        modalOpen: state.modalOpen,
        editId: state.editId,
        formMode: state.form.mode,
        wizardStep: state.form.step,
        formValues: { ...state.form.values },
        lastCascadeCheck: state.lastCascadeCheck,
        activeFilters: { ...state.datasets[SUBVIEW_ACTIVE].filters },
        finishedFilters: { ...state.datasets[SUBVIEW_FINISHED].filters },
        crops: getAvailableCrops().map((crop) => buildCropDisplay(crop)),
        datasets: {
            active: buildDatasetSnapshot(SUBVIEW_ACTIVE),
            finished: buildDatasetSnapshot(SUBVIEW_FINISHED)
        },
        portfolioByCrop: Array.from(state.portfolioByCrop.values()).map((entry) => serializePortfolioState(entry)),
        markdownPreview: buildExportMarkdown()
    };
}

async function ensureInitialized(options = {}) {
    if (!state.initialized) {
        await initAgroOperationalCycles(options);
        return;
    }
    if (options.initialUserId) {
        state.userId = normalizeId(options.initialUserId);
    }
}

async function createFromPayload(payload = {}) {
    await ensureInitialized();
    const normalized = normalizePayload(payload, { mode: 'create' });
    const result = await createCycleRecord(normalized);
    await refreshData();
    return result;
}

async function updateById(cycleId, payload = {}) {
    await ensureInitialized();
    const existingCycle = readExistingCycle(cycleId);
    const normalized = normalizePayload(payload, {
        mode: 'edit',
        existingCycle
    });
    const result = await updateCycleRecord(normalizeId(cycleId), normalized);
    await refreshData();
    return result;
}

async function deleteById(cycleId, options = {}) {
    await ensureInitialized();
    const result = await deleteCycleRecord(normalizeId(cycleId), {
        skipConfirm: options.skipConfirm !== false
    });
    await refreshData();
    return result;
}

function exposeGlobalApi() {
    if (typeof window === 'undefined') return;
    window.YGAgroOperationalCycles = {
        init: initAgroOperationalCycles,
        refresh: () => refreshData(),
        getSnapshot: buildDebugSnapshot,
        getPortfolioStateByCrop,
        getOperationalExpensesByCrop,
        getOperationalPendingByCrop,
        createFromPayload,
        updateById,
        deleteById,
        downloadMarkdown: downloadMarkdownFile,
        openView: (subview = SUBVIEW_ACTIVE) => {
            window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
                detail: {
                    view: VIEW_NAME,
                    subview: normalizeOperationalSubview(subview),
                    scroll: true
                }
            }));
        }
    };
}

export async function initAgroOperationalCycles(options = {}) {
    state.root = document.getElementById(ROOT_ID);
    if (!state.root) return null;

    if (!state.initialized) {
        renderShell();
        bindEvents();
        state.initialized = true;
    }

    if (options.initialUserId) {
        state.userId = normalizeId(options.initialUserId);
    }

    exposeGlobalApi();
    state.currentView = normalizeToken(document.body?.dataset?.agroActiveView || state.currentView);
    state.currentSubview = normalizeOperationalSubview(document.body?.dataset?.agroSubview || state.currentSubview);

    const initialMode = normalizeToken(document.body?.dataset?.agroMode || 'general');
    if (initialMode === 'cultivo') state.familyFilter = FAMILY_LINKED;
    else if (initialMode === 'no-cultivo') state.familyFilter = FAMILY_UNLINKED;
    else state.familyFilter = FAMILY_ALL;

    syncStandalonePeriodCyclesView();

    if (state.currentView === VIEW_NAME) {
        renderAll();
        await refreshData({ initialUserId: options.initialUserId });
    }

    return {
        refresh: () => refreshData(),
        getSnapshot: buildDebugSnapshot
    };
}
