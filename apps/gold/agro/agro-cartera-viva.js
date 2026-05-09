export {
    BUYER_MATCH_STATUS,
    ensureBuyerIdentityLink,
    extractBuyerIdentityCandidate,
    isBuyerIdentityRelevantTab,
    normalizeBuyerGroupKey
} from './agro-buyer-identity.js';

export const AGRO_BUYER_PORTFOLIO_RPC = 'agro_buyer_portfolio_summary_v1';
export const CARTERA_VIVA_BALANCE_EPSILON = 0.000001;
const BUYER_PORTFOLIO_CROP_SCOPE_TABLES = Object.freeze([
    Object.freeze({ table: 'agro_pending', excludeReverted: true }),
    Object.freeze({ table: 'agro_income', excludeReverted: true }),
    Object.freeze({ table: 'agro_losses', excludeReverted: true })
]);

const BUYER_PORTFOLIO_NUMERIC_FIELDS = Object.freeze([
    'credited_total',
    'paid_total',
    'loss_total',
    'transferred_total',
    'pending_total',
    'review_required_total',
    'legacy_unclassified_total',
    'non_debt_income_total',
    'balance_gap_total'
]);

const BUYER_PORTFOLIO_NULLABLE_NUMERIC_FIELDS = Object.freeze([
    'compliance_percent'
]);

const BUYER_PORTFOLIO_COUNT_FIELDS = Object.freeze([
    'review_required_count',
    'legacy_unclassified_count'
]);

function normalizeBuyerPortfolioNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : 0;
}

function normalizeBuyerPortfolioNullableNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : null;
}

function normalizeBuyerPortfolioBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === 't' || normalized === '1';
    }
    return Boolean(value);
}

export function readBuyerPortfolioNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : 0;
}

export function isPositiveBuyerPortfolioAmount(value) {
    return readBuyerPortfolioNumber(value) > CARTERA_VIVA_BALANCE_EPSILON;
}

export function resolvePendingPortfolioState(row, closures = []) {
    const transferState = String(row?.transfer_state || '').trim().toLowerCase();
    const transferredTo = String(row?.transferred_to || '').trim().toLowerCase();
    const hasTransferMarker = transferState === 'transferred'
        || Boolean(row?.transferred_at)
        || Boolean(row?.transferred_income_id)
        || Boolean(row?.transferred_to_id)
        || transferredTo !== '';
    const safeClosures = Array.isArray(closures) ? closures : [];
    const hasPaidClosure = safeClosures.some((closure) => String(closure?.type || '').trim().toLowerCase() === 'income');
    const hasLossClosure = safeClosures.some((closure) => String(closure?.type || '').trim().toLowerCase() === 'loss');
    const isReverted = transferState === 'reverted'
        || transferState === 'reverted_to_pending'
        || Boolean(row?.reverted_at)
        || Boolean(row?.reverted_reason);

    if (isReverted) {
        return {
            status: 'pending',
            label: 'Fiado',
            ledgerScope: 'fiados',
            tone: 'review',
            countsAsReceivable: true,
            canTransfer: true,
            isClosed: false,
            isReverted: true
        };
    }

    if (hasTransferMarker) {
        if (transferredTo === 'losses' || hasLossClosure) {
            return {
                status: 'lost',
                label: 'Perdido',
                ledgerScope: 'perdidos',
                tone: 'loss',
                countsAsReceivable: false,
                canTransfer: false,
                isClosed: true,
                isReverted: false
            };
        }

        return {
            status: 'paid',
            label: 'Cobrado',
            ledgerScope: 'pagados',
            tone: 'paid',
            countsAsReceivable: false,
            canTransfer: false,
            isClosed: true,
            isReverted: false
        };
    }

    return {
        status: 'pending',
        label: 'Fiado',
        ledgerScope: 'fiados',
        tone: safeClosures.length > 0 ? 'pending' : 'pending',
        countsAsReceivable: true,
        canTransfer: true,
        isClosed: false,
        isReverted: false
    };
}

export function getBuyerLivePendingBalance(record) {
    const pendingTotal = readBuyerPortfolioNumber(record?.pending_total);
    const credited = readBuyerPortfolioNumber(record?.credited_total);
    const paid = readBuyerPortfolioNumber(record?.paid_total);
    const loss = readBuyerPortfolioNumber(record?.loss_total);
    const transferred = readBuyerPortfolioNumber(record?.transferred_total);
    const derivedBalance = Math.max(0, credited - paid - loss - transferred);
    const hasLedgerTotals = [credited, paid, loss, transferred].some(isPositiveBuyerPortfolioAmount);
    const hasPendingTotal = record && Object.prototype.hasOwnProperty.call(record, 'pending_total');
    const balance = hasPendingTotal && hasLedgerTotals
        ? Math.min(Math.max(0, pendingTotal), derivedBalance)
        : (hasLedgerTotals ? derivedBalance : Math.max(0, pendingTotal));
    return isPositiveBuyerPortfolioAmount(balance) ? balance : 0;
}

export function getBuyerLiveStatus(record) {
    const pending = getBuyerLivePendingBalance(record);
    const credited = readBuyerPortfolioNumber(record?.credited_total);
    const paid = readBuyerPortfolioNumber(record?.paid_total);
    const loss = readBuyerPortfolioNumber(record?.loss_total);
    const review = readBuyerPortfolioNumber(record?.review_required_total)
        + readBuyerPortfolioNumber(record?.legacy_unclassified_total);

    if (isPositiveBuyerPortfolioAmount(pending)) return 'pending';
    if (isPositiveBuyerPortfolioAmount(loss)) return 'lost';
    if (isPositiveBuyerPortfolioAmount(paid)) return 'paid';
    if (isPositiveBuyerPortfolioAmount(credited) && !isPositiveBuyerPortfolioAmount(review)) return 'paid';
    if (isPositiveBuyerPortfolioAmount(review)) return 'review';
    return 'no-record';
}

export function isAgroQaClientName(value) {
    const token = normalizeHistorySearchToken(value);
    return /^qa(?:[_\s-]|$)/.test(token);
}

export function normalizeBuyerPortfolioSummaryRow(row) {
    const nextRow = row && typeof row === 'object' ? { ...row } : {};

    BUYER_PORTFOLIO_NUMERIC_FIELDS.forEach((field) => {
        nextRow[field] = normalizeBuyerPortfolioNumber(nextRow[field]);
    });

    BUYER_PORTFOLIO_NULLABLE_NUMERIC_FIELDS.forEach((field) => {
        nextRow[field] = normalizeBuyerPortfolioNullableNumber(nextRow[field]);
    });

    BUYER_PORTFOLIO_COUNT_FIELDS.forEach((field) => {
        nextRow[field] = Math.max(0, Math.trunc(normalizeBuyerPortfolioNumber(nextRow[field])));
    });

    nextRow.canonical_name = String(nextRow.canonical_name || nextRow.group_key || '').trim();
    nextRow.client_status = String(nextRow.client_status || 'active').trim().toLowerCase() === 'archived'
        ? 'archived'
        : 'active';
    nextRow.global_status = String(nextRow.global_status || 'Mixto');
    nextRow.requires_review = normalizeBuyerPortfolioBoolean(nextRow.requires_review);

    return nextRow;
}

export async function fetchBuyerPortfolioSummary(supabaseClient) {
    if (!supabaseClient || typeof supabaseClient.rpc !== 'function') {
        throw new TypeError('fetchBuyerPortfolioSummary requires a Supabase client with rpc().');
    }

    const { data, error } = await supabaseClient.rpc(AGRO_BUYER_PORTFOLIO_RPC);
    if (error) throw error;

    return Array.isArray(data)
        ? data.map(normalizeBuyerPortfolioSummaryRow)
        : [];
}

export function buildBuyerPortfolioScopeKey(row) {
    const buyerId = String(row?.buyer_id || '').trim();
    if (buyerId) return `buyer:${buyerId}`;

    const buyerGroupKey = normalizeHistorySearchToken(
        row?.buyer_group_key
        || row?.group_key
        || ''
    );
    if (buyerGroupKey) return `group:${buyerGroupKey}`;

    return '';
}

export async function fetchBuyerPortfolioCropScopeKeys(supabaseClient, cropId) {
    const safeCropId = String(cropId || '').trim();
    if (!safeCropId) return new Set();

    if (!supabaseClient?.from) {
        throw new TypeError('fetchBuyerPortfolioCropScopeKeys requires a Supabase client with from().');
    }

    const queries = BUYER_PORTFOLIO_CROP_SCOPE_TABLES.map(({ table, excludeReverted }) => {
        let query = supabaseClient
            .from(table)
            .select('id,buyer_id,buyer_group_key')
            .eq('crop_id', safeCropId)
            .is('deleted_at', null);

        if (excludeReverted !== false) {
            query = query.is('reverted_at', null);
        }

        return query;
    });

    const results = await Promise.all(queries);
    const visibleKeys = new Set();

    results.forEach((result) => {
        if (result?.error) throw result.error;
        if (!Array.isArray(result?.data)) return;

        result.data.forEach((row) => {
            const scopeKey = buildBuyerPortfolioScopeKey(row);
            if (scopeKey) visibleKeys.add(scopeKey);
        });
    });

    return visibleKeys;
}

export function normalizeHistorySearchToken(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function readHistoryItemField(item, fields) {
    if (!item || typeof item !== 'object' || !Array.isArray(fields)) return null;
    for (const field of fields) {
        const raw = item[field];
        if (raw === undefined || raw === null) continue;
        if (typeof raw === 'string' && raw.trim() === '') continue;
        return raw;
    }
    return null;
}

export function readHistoryItemFieldWithSource(item, fields) {
    if (!item || typeof item !== 'object' || !Array.isArray(fields)) {
        return { field: '', value: null };
    }
    for (const field of fields) {
        const raw = item[field];
        if (raw === undefined || raw === null) continue;
        if (typeof raw === 'string' && raw.trim() === '') continue;
        return { field: String(field || ''), value: raw };
    }
    return { field: '', value: null };
}

export function getHistoryRowTimestamp(row, dateFieldName = 'fecha') {
    const dateStr = row?.[dateFieldName] || row?.fecha || row?.date;
    if (dateStr && typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const datePart = dateStr.slice(0, 10);
        const [yyyy, mm, dd] = datePart.split('-').map(Number);
        const date = new Date(yyyy, mm - 1, dd, 12, 0, 0);
        return date.getTime();
    }

    if (row?.created_at) {
        const createdAt = Date.parse(row.created_at);
        if (!Number.isNaN(createdAt)) return createdAt;
    }

    if (row?.updated_at) {
        const updatedAt = Date.parse(row.updated_at);
        if (!Number.isNaN(updatedAt)) return updatedAt;
    }

    return 0;
}

export function getHistoryDayKey(row, dateFieldName = 'fecha') {
    const dateStr = row?.[dateFieldName] || row?.fecha || row?.date;
    if (dateStr && typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.slice(0, 10);
    }

    if (row?.created_at) {
        const createdAt = new Date(row.created_at);
        if (!Number.isNaN(createdAt.getTime())) {
            return `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
        }
    }

    return 'unknown';
}

export function formatHistoryAbsoluteDayLabel(dayKey) {
    if (dayKey === 'unknown') return 'Sin fecha';
    const [yyyy, mm, dd] = String(dayKey || '').split('-').map(Number);
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd) || !monthNames[mm - 1]) {
        return 'Sin fecha';
    }
    return `${dd} ${monthNames[mm - 1]} ${yyyy}`;
}

export function formatHistoryDayLabel(dayKey) {
    if (dayKey === 'unknown') return 'Sin fecha';
    const [yyyy, mm, dd] = String(dayKey || '').split('-').map(Number);
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd) || !monthNames[mm - 1]) {
        return 'Sin fecha';
    }

    const today = new Date();
    const isToday = today.getFullYear() === yyyy && (today.getMonth() + 1) === mm && today.getDate() === dd;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.getFullYear() === yyyy && (yesterday.getMonth() + 1) === mm && yesterday.getDate() === dd;

    if (isToday) return 'Hoy';
    if (isYesterday) return 'Ayer';
    return `${dd} ${monthNames[mm - 1]} ${yyyy}`;
}

export function groupHistoryRowsByDay(rows, dateFieldName = 'fecha') {
    const sorted = Array.isArray(rows)
        ? [...rows].sort((a, b) => getHistoryRowTimestamp(b, dateFieldName) - getHistoryRowTimestamp(a, dateFieldName))
        : [];

    const groups = new Map();
    sorted.forEach((row) => {
        const dayKey = getHistoryDayKey(row, dateFieldName);
        if (!groups.has(dayKey)) {
            groups.set(dayKey, []);
        }
        groups.get(dayKey).push(row);
    });

    return Array.from(groups.keys())
        .sort((a, b) => b.localeCompare(a))
        .map((dayKey) => ({
            dayKey,
            label: formatHistoryDayLabel(dayKey),
            rows: groups.get(dayKey) || []
        }));
}

export function renderHistoryDayGroups(listEl, rows, options = {}) {
    if (!listEl || typeof options.renderRow !== 'function') return;

    const dateFieldName = String(options.dateFieldName || 'fecha');
    const formatDayLabel = typeof options.formatDayLabel === 'function'
        ? options.formatDayLabel
        : formatHistoryAbsoluteDayLabel;
    const groups = groupHistoryRowsByDay(rows, dateFieldName);
    const fragment = document.createDocumentFragment();

    groups.forEach((group) => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'facturero-day-header date-divider';
        dayHeader.textContent = formatDayLabel(group?.dayKey);
        fragment.appendChild(dayHeader);

        (group?.rows || []).forEach((row) => {
            options.renderRow(fragment, row, group);
        });
    });

    listEl.appendChild(fragment);
}
