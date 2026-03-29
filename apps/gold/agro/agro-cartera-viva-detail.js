import {
    formatHistoryAbsoluteDayLabel,
    normalizeHistorySearchToken,
    readHistoryItemField,
    renderHistoryDayGroups
} from './agro-cartera-viva.js';
import {
    SUPPORTED_CURRENCIES,
    convertFromUSD,
    getRate,
    hasOverride
} from './agro-exchange.js';

const PENDING_HISTORY_COLUMNS = [
    'id',
    'concepto',
    'cliente',
    'monto',
    'monto_usd',
    'currency',
    'exchange_rate',
    'fecha',
    'created_at',
    'unit_type',
    'unit_qty',
    'quantity_kg',
    'transfer_state',
    'transferred_to',
    'buyer_id',
    'buyer_group_key',
    'buyer_match_status',
    'crop_id',
    'evidence_url',
    'deleted_at',
    'reverted_at'
].join(',');

const INCOME_HISTORY_COLUMNS = [
    'id',
    'concepto',
    'categoria',
    'monto',
    'monto_usd',
    'currency',
    'exchange_rate',
    'fecha',
    'created_at',
    'origin_table',
    'origin_id',
    'transfer_state',
    'buyer_id',
    'buyer_group_key',
    'buyer_match_status',
    'crop_id',
    'soporte_url',
    'deleted_at',
    'reverted_at'
].join(',');

const LOSS_HISTORY_COLUMNS = [
    'id',
    'concepto',
    'causa',
    'monto',
    'monto_usd',
    'currency',
    'exchange_rate',
    'fecha',
    'created_at',
    'origin_table',
    'origin_id',
    'transfer_state',
    'buyer_id',
    'buyer_group_key',
    'buyer_match_status',
    'crop_id',
    'evidence_url',
    'deleted_at',
    'reverted_at'
].join(',');

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

const DETAIL_PAIR_OPTIONS = Object.freeze([
    Object.freeze({ id: 'USD/COP', currency: 'COP', label: 'USD/COP' }),
    Object.freeze({ id: 'USD/VES', currency: 'VES', label: 'USD/Bs' })
]);

function normalizeDetailCurrency(value) {
    const token = String(value || '').trim().toUpperCase();
    if (token === 'BS') return 'VES';
    return SUPPORTED_CURRENCIES[token] ? token : 'USD';
}

function normalizeDetailPair(value) {
    const token = String(value || '').trim().toUpperCase();
    return DETAIL_PAIR_OPTIONS.some((pair) => pair.id === token) ? token : DETAIL_PAIR_OPTIONS[0].id;
}

function formatMoneyByCurrency(value, currency = 'USD') {
    const code = normalizeDetailCurrency(currency);
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
        if (code === 'COP') return 'N/D COP';
        if (code === 'VES') return 'N/D Bs';
        return '$0.00';
    }

    if (code === 'USD') {
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    if (code === 'COP') {
        return `COP ${Math.round(amount).toLocaleString('es-CO')}`;
    }

    return `Bs ${amount.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function resolveDetailRateForCurrency(currency, exchangeRates) {
    return getRate(normalizeDetailCurrency(currency), exchangeRates);
}

function buildConvertedAmount(usdAmount, currency, exchangeRates) {
    const code = normalizeDetailCurrency(currency);
    const rate = resolveDetailRateForCurrency(code, exchangeRates);
    if (code === 'USD') {
        return {
            currency: 'USD',
            rate: 1,
            amount: Number(usdAmount) || 0,
            display: formatMoneyByCurrency(usdAmount, 'USD'),
            available: true
        };
    }

    if (!Number.isFinite(Number(usdAmount)) || !Number.isFinite(Number(rate)) || Number(rate) <= 0) {
        return {
            currency: code,
            rate: Number(rate) || null,
            amount: Number.NaN,
            display: code === 'COP' ? 'N/D COP' : 'N/D Bs',
            available: false
        };
    }

    const amount = convertFromUSD(Number(usdAmount), code, Number(rate));
    return {
        currency: code,
        rate: Number(rate),
        amount,
        display: formatMoneyByCurrency(amount, code),
        available: true
    };
}

function normalizeMoney(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
}

function clampPercent(value) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return 0;
    return Math.min(100, Math.max(0, nextValue));
}

function getReviewTotal(buyerRow) {
    return Number(buyerRow?.review_required_total || 0) + Number(buyerRow?.legacy_unclassified_total || 0);
}

function getProgressBase(buyerRow) {
    const credited = Number(buyerRow?.credited_total || 0);
    const combined = Number(buyerRow?.paid_total || 0) + Number(buyerRow?.pending_total || 0) + Number(buyerRow?.loss_total || 0);
    return Math.max(credited, combined, 0);
}

function getPaidPercent(buyerRow) {
    const compliance = Number(buyerRow?.compliance_percent);
    if (Number.isFinite(compliance)) return clampPercent(compliance);

    const base = getProgressBase(buyerRow);
    if (base <= 0) return 0;
    return clampPercent((Number(buyerRow?.paid_total || 0) / base) * 100);
}

function resolveBuyerStatus(buyerRow) {
    const pending = Number(buyerRow?.pending_total || 0);
    const paid = Number(buyerRow?.paid_total || 0);
    const loss = Number(buyerRow?.loss_total || 0);
    const review = getReviewTotal(buyerRow);

    if (pending > 0) {
        return {
            tone: 'fiado',
            label: paid > 0 ? 'Cobro en curso' : 'Fiado activo',
            copy: `${formatMoney(pending)} por cobrar`
        };
    }

    if (paid > 0) {
        return {
            tone: 'pagado',
            label: 'Pagado',
            copy: 'Saldo cerrado sin pendiente'
        };
    }

    if (loss > 0) {
        return {
            tone: 'perdido',
            label: 'Pérdida',
            copy: `${formatMoney(loss)} cerrados fuera de cartera`
        };
    }

    return {
        tone: review > 0 ? 'review' : 'seguimiento',
        label: review > 0 ? 'Por revisar' : 'Seguimiento',
        copy: review > 0 ? `${formatMoney(review)} por ordenar` : 'Sin saldo suficiente para resumir'
    };
}

function buildProgressBreakdown(buyerRow) {
    const base = Math.max(getProgressBase(buyerRow), 1);
    const paid = Math.max(0, Number(buyerRow?.paid_total || 0));
    const pending = Math.max(0, Number(buyerRow?.pending_total || 0));
    const loss = Math.max(0, Number(buyerRow?.loss_total || 0));

    const paidShare = clampPercent((paid / base) * 100);
    const lossShare = clampPercent((loss / base) * 100);
    const pendingShare = clampPercent(Math.max(0, 100 - paidShare - lossShare));

    return {
        paidShare,
        lossShare,
        pendingShare,
        paidPercent: getPaidPercent(buyerRow),
        base
    };
}

function normalizeBuyerScope(buyerRow) {
    const buyerId = String(buyerRow?.buyer_id || '').trim();
    const groupKey = normalizeHistorySearchToken(buyerRow?.group_key || buyerRow?.buyer_group_key || '');

    return {
        buyerId,
        groupKey,
        displayName: String(buyerRow?.display_name || '').trim(),
        hasIdentity: Boolean(buyerId || groupKey)
    };
}

async function fetchBuyerScopedRows(supabaseClient, tableName, columns, buyerScope, options = {}) {
    if (!supabaseClient?.from) {
        throw new TypeError('fetchBuyerScopedRows requires a Supabase client with from().');
    }

    const filters = Array.isArray(options.extraFilters) ? options.extraFilters : [];
    const queries = [];

    if (buyerScope.buyerId) {
        let query = supabaseClient
            .from(tableName)
            .select(columns)
            .eq('buyer_id', buyerScope.buyerId)
            .is('deleted_at', null);

        if (options.excludeReverted !== false) {
            query = query.is('reverted_at', null);
        }

        filters.forEach((applyFilter) => {
            query = applyFilter(query);
        });

        queries.push(query);
    }

    if (buyerScope.groupKey) {
        let query = supabaseClient
            .from(tableName)
            .select(columns)
            .is('buyer_id', null)
            .eq('buyer_group_key', buyerScope.groupKey)
            .is('deleted_at', null);

        if (options.excludeReverted !== false) {
            query = query.is('reverted_at', null);
        }

        filters.forEach((applyFilter) => {
            query = applyFilter(query);
        });

        queries.push(query);
    }

    if (queries.length <= 0) return [];

    const results = await Promise.all(queries);
    const rows = [];

    results.forEach((result) => {
        if (result?.error) throw result.error;
        if (Array.isArray(result?.data)) {
            rows.push(...result.data);
        }
    });

    const seen = new Set();
    return rows.filter((row) => {
        const key = `${tableName}:${row?.id || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function buildMovementMeta(row) {
    const parts = [];
    const quantity = readHistoryItemField(row, ['unit_qty', 'quantity_kg']);
    const unitType = readHistoryItemField(row, ['unit_type']);

    if (quantity !== null && quantity !== undefined && String(quantity).trim() !== '') {
        parts.push(`${quantity} ${String(unitType || '').trim() || 'unidad(es)'}`);
    }

    return parts.join(' · ');
}

function buildPendingHistoryRow(row) {
    const amount = normalizeMoney(readHistoryItemField(row, ['monto_usd', 'monto']));
    const transferState = String(row?.transfer_state || 'active').trim().toLowerCase();
    const transferredTo = String(row?.transferred_to || '').trim().toLowerCase();
    const isReview = String(row?.buyer_match_status || '').trim().toLowerCase() !== 'matched';
    const isTransferred = transferState === 'transferred';
    const isReverted = transferState === 'reverted' || Boolean(row?.reverted_at);

    let label = 'Fiado';
    let note = 'Saldo abierto dentro de la cartera del comprador.';
    let tone = 'pending';

    if (isReverted) {
        label = 'Revertido';
        note = 'Este fiado volvió a quedar activo después de una transferencia.';
        tone = 'review';
    } else if (transferState === 'transferred' && transferredTo === 'income') {
        label = 'Fiado cerrado';
        note = 'Este saldo ya terminó como cobro.';
        tone = 'paid';
    } else if (transferState === 'transferred' && transferredTo === 'losses') {
        label = 'Fiado cerrado';
        note = 'Este saldo terminó cerrado como pérdida.';
        tone = 'loss';
    } else if (transferState === 'transferred') {
        label = 'Fiado movido';
        note = 'El movimiento salió de cartera hacia otra salida operativa.';
        tone = 'review';
    }

    if (isReview) {
        tone = 'review';
        label = 'Por revisar';
        note = 'Este movimiento aún necesita revisión antes de cerrar su lectura.';
    }

    return {
        history_id: `agro_pending:${row?.id || ''}`,
        source_table: 'agro_pending',
        source_tab: 'pendientes',
        source_id: String(row?.id || '').trim(),
        title: String(row?.cliente || '').trim() ? `Fiado a ${row.cliente}` : 'Fiado registrado',
        label,
        amount,
        currency: normalizeDetailCurrency(row?.currency),
        exchange_rate: Number(row?.exchange_rate) || null,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: buildMovementMeta(row),
        note,
        tone,
        is_review: isReview,
        crop_id: String(row?.crop_id || '').trim(),
        unit_type: String(row?.unit_type || '').trim().toLowerCase(),
        unit_qty: Number(row?.unit_qty ?? row?.quantity_kg ?? NaN),
        transfer_state: transferState,
        transferred_to: transferredTo,
        reverted_at: row?.reverted_at || '',
        origin_table: '',
        origin_id: '',
        is_transfer_related: isTransferred,
        support_url_raw: String(row?.evidence_url || row?.soporte_url || '').trim(),
        support_url_resolved: '',
        support_label: 'Ver soporte'
    };
}

function buildIncomeHistoryRow(row) {
    const amount = normalizeMoney(readHistoryItemField(row, ['monto_usd', 'monto']));
    const fromPending = String(row?.origin_table || '').trim().toLowerCase() === 'agro_pending';
    const isReview = String(row?.buyer_match_status || '').trim().toLowerCase() !== 'matched';
    const isReverted = String(row?.transfer_state || '').trim().toLowerCase() === 'reverted' || Boolean(row?.reverted_at);

    return {
        history_id: `agro_income:${row?.id || ''}`,
        source_table: 'agro_income',
        source_tab: 'ingresos',
        source_id: String(row?.id || '').trim(),
        title: isReverted ? 'Cobro revertido' : (fromPending ? 'Cobro registrado' : 'Ingreso aparte'),
        label: isReverted ? 'Revertido' : (fromPending ? 'Pago' : 'Ingreso aparte'),
        amount,
        currency: normalizeDetailCurrency(row?.currency),
        exchange_rate: Number(row?.exchange_rate) || null,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: String(row?.categoria || '').trim(),
        note: isReverted
            ? 'Este cobro fue devuelto a Fiados.'
            : isReview
            ? 'Este ingreso aún está pendiente por revisar.'
            : (fromPending
                ? 'Entrada confirmada como cobro del saldo.'
                : 'Entrada relacionada con el comprador, pero separada de la cartera.'),
        tone: isReverted ? 'review' : (isReview ? 'review' : (fromPending ? 'paid' : 'neutral')),
        is_review: isReview,
        crop_id: String(row?.crop_id || '').trim(),
        unit_type: String(row?.unit_type || '').trim().toLowerCase(),
        unit_qty: Number(row?.unit_qty ?? row?.quantity_kg ?? NaN),
        transfer_state: String(row?.transfer_state || '').trim().toLowerCase(),
        transferred_to: '',
        reverted_at: row?.reverted_at || '',
        origin_table: String(row?.origin_table || '').trim().toLowerCase(),
        origin_id: String(row?.origin_id || '').trim(),
        is_transfer_related: fromPending && !isReverted,
        support_url_raw: String(row?.soporte_url || row?.evidence_url || '').trim(),
        support_url_resolved: '',
        support_label: 'Ver soporte'
    };
}

function buildLossHistoryRow(row) {
    const amount = normalizeMoney(readHistoryItemField(row, ['monto_usd', 'monto']));
    const fromPending = String(row?.origin_table || '').trim().toLowerCase() === 'agro_pending';
    const matchStatus = String(row?.buyer_match_status || '').trim().toLowerCase();
    const isReview = matchStatus !== 'matched';
    const isReverted = String(row?.transfer_state || '').trim().toLowerCase() === 'reverted' || Boolean(row?.reverted_at);

    return {
        history_id: `agro_losses:${row?.id || ''}`,
        source_table: 'agro_losses',
        source_tab: 'perdidas',
        source_id: String(row?.id || '').trim(),
        title: isReverted ? 'Pérdida revertida' : (fromPending ? 'Pérdida registrada' : 'Pérdida por revisar'),
        label: isReverted ? 'Revertido' : (fromPending ? 'Pérdida' : 'Por revisar'),
        amount,
        currency: normalizeDetailCurrency(row?.currency),
        exchange_rate: Number(row?.exchange_rate) || null,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: String(row?.causa || '').trim(),
        note: isReverted
            ? 'Esta pérdida fue devuelta a Fiados.'
            : isReview
            ? (matchStatus === 'legacy_unclassified'
                ? 'Hay un registro antiguo que todavía necesita ordenarse.'
                : 'Esta pérdida aún necesita confirmación final.')
            : 'Salida cerrada de la cartera.',
        tone: isReverted ? 'review' : (isReview ? 'review' : 'loss'),
        is_review: isReview,
        crop_id: String(row?.crop_id || '').trim(),
        unit_type: String(row?.unit_type || '').trim().toLowerCase(),
        unit_qty: Number(row?.unit_qty ?? row?.quantity_kg ?? NaN),
        transfer_state: String(row?.transfer_state || '').trim().toLowerCase(),
        transferred_to: '',
        reverted_at: row?.reverted_at || '',
        origin_table: String(row?.origin_table || '').trim().toLowerCase(),
        origin_id: String(row?.origin_id || '').trim(),
        is_transfer_related: fromPending && !isReverted,
        support_url_raw: String(row?.evidence_url || row?.soporte_url || '').trim(),
        support_url_resolved: '',
        support_label: 'Ver soporte'
    };
}

function compareHistoryRows(a, b) {
    const aDate = Date.parse(a?.fecha || a?.created_at || '') || 0;
    const bDate = Date.parse(b?.fecha || b?.created_at || '') || 0;
    return bDate - aDate;
}

function isAbsoluteSupportUrl(value) {
    return /^(https?:)?\/\//i.test(String(value || '').trim());
}

async function resolveHistorySupportUrl(rawValue) {
    const safeValue = String(rawValue || '').trim();
    if (!safeValue) return '';
    if (isAbsoluteSupportUrl(safeValue)) return safeValue;

    const bridge = typeof window !== 'undefined' ? window._agroFactureroBridge : null;
    if (typeof bridge?.resolveEvidenceUrl === 'function') {
        try {
            const resolved = await bridge.resolveEvidenceUrl(safeValue);
            return String(resolved || '').trim();
        } catch (error) {
            console.warn('[CarteraViva] support url resolve failed:', error?.message || error);
        }
    }

    return '';
}

async function hydrateHistorySupportUrls(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    return Promise.all(safeRows.map(async (row) => {
        const rawValue = String(row?.support_url_raw || '').trim();
        if (!rawValue) return row;

        const resolvedUrl = await resolveHistorySupportUrl(rawValue);
        return {
            ...row,
            support_url_resolved: resolvedUrl
        };
    }));
}

export async function fetchBuyerHistoryTimeline(supabaseClient, buyerRow, options = {}) {
    const buyerScope = normalizeBuyerScope(buyerRow);
    if (!buyerScope.hasIdentity) return [];
    const cropId = String(options?.cropId || '').trim();
    const extraFilters = cropId
        ? [(query) => query.eq('crop_id', cropId)]
        : [];

    const [pendingRows, incomeRows, lossRows] = await Promise.all([
        fetchBuyerScopedRows(supabaseClient, 'agro_pending', PENDING_HISTORY_COLUMNS, buyerScope, { extraFilters, excludeReverted: false }),
        fetchBuyerScopedRows(supabaseClient, 'agro_income', INCOME_HISTORY_COLUMNS, buyerScope, { extraFilters, excludeReverted: false }),
        fetchBuyerScopedRows(supabaseClient, 'agro_losses', LOSS_HISTORY_COLUMNS, buyerScope, { extraFilters, excludeReverted: false })
    ]);

    const timelineRows = [
        ...pendingRows.map(buildPendingHistoryRow),
        ...incomeRows.map(buildIncomeHistoryRow),
        ...lossRows.map(buildLossHistoryRow)
    ].sort(compareHistoryRows);

    return hydrateHistorySupportUrls(timelineRows);
}

function renderEmptyState(config = {}) {
    const title = escapeHtml(config.title || 'Sin historial legible');
    const copy = escapeHtml(config.copy || 'Este comprador todavía no tiene movimientos visibles para contar su historia.');

    return `
        <div class="cartera-viva-empty">
            <div class="cartera-viva-empty__icon" aria-hidden="true">🧾</div>
            <h3 class="cartera-viva-empty__title">${title}</h3>
            <p class="cartera-viva-empty__copy">${copy}</p>
        </div>
    `;
}

function renderDetailInsight(label, value) {
    return `
        <article class="cartera-viva-insight">
            <span class="cartera-viva-insight__label">${escapeHtml(label)}</span>
            <strong class="cartera-viva-insight__value">${escapeHtml(value)}</strong>
        </article>
    `;
}

function normalizeHistoryFilter(value) {
    const token = String(value || '').trim().toLowerCase();
    if (token === 'transferidos') return 'transferidos';
    if (token === 'revertidos') return 'revertidos';
    return 'todos';
}

function isTransferRelatedHistoryRow(row) {
    if (!row || typeof row !== 'object') return false;
    if (isRevertedHistoryRow(row)) return false;
    if (row.is_transfer_related) return true;

    const sourceTable = String(row?.source_table || '').trim().toLowerCase();
    const transferState = String(row?.transfer_state || '').trim().toLowerCase();
    const originTable = String(row?.origin_table || '').trim().toLowerCase();

    if (sourceTable === 'agro_pending' && transferState === 'transferred') return true;
    if ((sourceTable === 'agro_income' || sourceTable === 'agro_losses') && originTable === 'agro_pending') return true;
    return false;
}

function isRevertedHistoryRow(row) {
    if (!row || typeof row !== 'object') return false;
    const transferState = String(row?.transfer_state || '').trim().toLowerCase();
    return transferState === 'reverted' || Boolean(row?.reverted_at);
}

function filterHistoryRows(rows, filterMode) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const normalizedFilter = normalizeHistoryFilter(filterMode);
    if (normalizedFilter === 'transferidos') {
        return safeRows.filter((row) => isTransferRelatedHistoryRow(row));
    }
    if (normalizedFilter === 'revertidos') {
        return safeRows.filter((row) => isRevertedHistoryRow(row));
    }
    return safeRows;
}

function getHistoryFilterCount(rows, filterMode) {
    return filterHistoryRows(rows, filterMode).length;
}

export function getVisibleBuyerHistoryRows(rows, filterMode) {
    return filterHistoryRows(rows, filterMode);
}

function renderHistoryFilters(historyRows, activeFilter) {
    const transferCount = getHistoryFilterCount(historyRows, 'transferidos');
    const revertedCount = getHistoryFilterCount(historyRows, 'revertidos');
    if (transferCount <= 0 && revertedCount <= 0) return '';

    const normalizedFilter = normalizeHistoryFilter(activeFilter);
    const allCount = getHistoryFilterCount(historyRows, 'todos');
    const filters = [
        { id: 'todos', label: `Todo (${allCount})`, visible: true },
        { id: 'transferidos', label: `Ver transferidos (${transferCount})`, visible: transferCount > 0 },
        { id: 'revertidos', label: `Ver revertidos (${revertedCount})`, visible: revertedCount > 0 }
    ];

    return `
        <div class="cartera-viva-detail__filters" role="group" aria-label="Filtrar historial">
            ${filters
                .filter((filter) => filter.visible)
                .map((filter) => `
                    <button
                        type="button"
                        class="cartera-viva-detail__filter${normalizedFilter === filter.id ? ' is-active' : ''}"
                        data-cartera-detail-history-filter="${filter.id}"
                        aria-pressed="${normalizedFilter === filter.id ? 'true' : 'false'}">
                        ${filter.label}
                    </button>
                `).join('')}
        </div>
    `;
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
}

function renderHistoryActionButton(config = {}) {
    const className = String(config.className || '').trim();
    const label = String(config.label || 'Acción').trim();
    const iconClass = String(config.iconClass || 'fa fa-circle').trim();
    const sourceTab = String(config.sourceTab || '').trim();
    const sourceId = String(config.sourceId || '').trim();
    const historyId = String(config.historyId || sourceId).trim();
    const action = String(config.action || '').trim();
    const disabled = Boolean(config.disabled);
    const disabledAttrs = disabled ? ' disabled aria-disabled="true"' : '';
    const datasetAttrs = action
        ? ` data-cartera-history-action="${escapeAttribute(action)}" data-cartera-history-id="${escapeAttribute(historyId)}" data-cartera-history-tab="${escapeAttribute(sourceTab)}"`
        : ` data-tab="${escapeAttribute(sourceTab)}" data-id="${escapeAttribute(sourceId)}"`;

    return `
        <button type="button" class="cartera-viva-history-item__menu-action${className ? ` ${className}` : ''}"${datasetAttrs}${disabledAttrs}>
            <i class="${escapeAttribute(iconClass)}" aria-hidden="true"></i>
            <span>${escapeHtml(label)}</span>
        </button>
    `;
}

function resolveHistoryMenuActions(row, options = {}) {
    const actions = [];
    const sourceTab = String(row?.source_tab || '').trim().toLowerCase();
    const sourceId = String(row?.source_id || '').trim();
    const transferState = String(row?.transfer_state || '').trim().toLowerCase();
    const originTable = String(row?.origin_table || '').trim().toLowerCase();
    const cropId = String(row?.crop_id || '').trim();

    if (!sourceTab || !sourceId) return actions;

    actions.push(
        {
            className: 'btn-edit-facturero',
            label: 'Editar',
            iconClass: 'fa fa-pen',
            sourceTab,
            sourceId
        },
        {
            className: 'btn-duplicate-facturero',
            label: 'Duplicar a otro cultivo',
            iconClass: 'fa fa-copy',
            sourceTab,
            sourceId
        },
        {
            className: 'btn-delete-facturero',
            label: 'Eliminar',
            iconClass: 'fa fa-trash',
            sourceTab,
            sourceId
        }
    );

    if (!cropId) {
        actions.push({
            className: 'btn-move-general',
            label: 'Asignar cultivo',
            iconClass: 'fa fa-seedling',
            sourceTab,
            sourceId
        });
    } else {
        actions.push({
            className: 'btn-edit-facturero',
            label: 'Reasignar cultivo',
            iconClass: 'fa fa-seedling',
            sourceTab,
            sourceId
        });
    }

    if (sourceTab === 'pendientes' && transferState !== 'transferred') {
        actions.push({
            className: 'btn-transfer-pending',
            label: 'Transferir',
            iconClass: 'fa fa-arrow-right-long',
            sourceTab,
            sourceId
        });
    }

    if (sourceTab === 'ingresos') {
        actions.push({
            className: 'btn-transfer-income',
            label: 'Transferir',
            iconClass: 'fa fa-arrow-right-long',
            sourceTab,
            sourceId
        });
        if (originTable === 'agro_pending' && !row?.reverted_at) {
            actions.push({
                className: 'btn-revert-income',
                label: 'Revertir',
                iconClass: 'fa fa-rotate-left',
                sourceTab,
                sourceId
            });
        }
    }

    if (sourceTab === 'perdidas') {
        actions.push({
            className: 'btn-transfer-loss',
            label: 'Transferir',
            iconClass: 'fa fa-arrow-right-long',
            sourceTab,
            sourceId
        });
        if (originTable === 'agro_pending' && !row?.reverted_at) {
            actions.push({
                className: 'btn-revert-loss',
                label: 'Revertir',
                iconClass: 'fa fa-rotate-left',
                sourceTab,
                sourceId
            });
        }
    }

    if (typeof options.onCreateCycle === 'function') {
        actions.push({
            action: 'create-cycle',
            label: 'Crear ciclo',
            iconClass: 'fa fa-seedling',
            historyId: String(row?.history_id || '').trim(),
            sourceTab,
            sourceId,
            disabled: !cropId
        });
    }

    return actions;
}

function renderHistoryActionMenu(row, options = {}) {
    const actions = resolveHistoryMenuActions(row, options);
    if (actions.length <= 0) return '';

    return `
        <details class="cartera-viva-history-item__actions">
            <summary class="cartera-viva-history-item__actions-trigger" aria-label="Acciones del movimiento">
                <i class="fa fa-ellipsis-vertical" aria-hidden="true"></i>
            </summary>
            <div class="cartera-viva-history-item__menu" role="menu">
                ${actions.map((action) => renderHistoryActionButton(action)).join('')}
            </div>
        </details>
    `;
}

function renderHistorySupportLink(row) {
    const supportUrl = String(row?.support_url_resolved || '').trim();
    const label = String(row?.support_label || 'Ver soporte').trim();
    if (!supportUrl) return '';

    return `
        <a
            href="${escapeAttribute(supportUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="cartera-viva-history-item__support"
            title="${escapeAttribute(label)}">
            <i class="fa fa-cloud" aria-hidden="true"></i>
            <span>${escapeHtml(label)}</span>
        </a>
    `;
}

function resolvePrimarySummaryMetric(buyerRow) {
    const reviewTotal = getReviewTotal(buyerRow);
    const buyerStatus = resolveBuyerStatus(buyerRow);
    const pending = Number(buyerRow?.pending_total || 0);
    const paid = Number(buyerRow?.paid_total || 0);
    const loss = Number(buyerRow?.loss_total || 0);

    if (pending > 0) {
        return {
            label: 'Pendiente',
            amountUsd: pending,
            copy: buyerStatus.detail || buyerStatus.copy
        };
    }

    if (loss > 0) {
        return {
            label: 'Pérdida',
            amountUsd: loss,
            copy: buyerStatus.detail || buyerStatus.copy
        };
    }

    if (paid > 0) {
        return {
            label: 'Cobrado',
            amountUsd: paid,
            copy: buyerStatus.detail || buyerStatus.copy
        };
    }

    return {
        label: reviewTotal > 0 ? 'Revisión' : 'Saldo',
        amountUsd: reviewTotal,
        copy: reviewTotal > 0
            ? `Hay ${formatMoney(reviewTotal)} por revisar en este comprador`
            : buyerStatus.copy
    };
}

function resolvePairOption(pairId) {
    const safePairId = normalizeDetailPair(pairId);
    return DETAIL_PAIR_OPTIONS.find((pair) => pair.id === safePairId) || DETAIL_PAIR_OPTIONS[0];
}

function formatPairRate(rate, currency) {
    const code = normalizeDetailCurrency(currency);
    if (!Number.isFinite(Number(rate)) || Number(rate) <= 0) {
        return code === 'COP' ? 'N/D COP' : 'N/D Bs';
    }
    if (code === 'COP') {
        return Math.round(Number(rate)).toLocaleString('es-CO');
    }
    return Number(rate).toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function resolvePairStatusLabel(pairOption, exchangeStatus = {}) {
    if (hasOverride(pairOption.currency)) return 'manual';

    const source = String(exchangeStatus?.source || '').trim().toLowerCase();
    if (!source) return 'sin tasa';
    if (source.includes('cache:fresh')) return 'cache';
    if (source.includes('cache:stale')) return 'cache vieja';
    if (source.includes('api')) return 'mercado';
    if (source.includes('fallback:none')) return 'sin tasa';
    return 'mercado';
}

function buildPairSeries(historyRows, pairOption) {
    return (Array.isArray(historyRows) ? historyRows : [])
        .filter((row) => normalizeDetailCurrency(row?.currency) === pairOption.currency)
        .map((row) => {
            const rate = Number(row?.exchange_rate);
            const timestamp = Date.parse(row?.fecha || row?.created_at || '') || 0;
            return Number.isFinite(rate) && rate > 0
                ? { rate, timestamp }
                : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-10);
}

function renderPairSparkline(series) {
    if (!Array.isArray(series) || series.length <= 1) {
        return `
            <div class="cartera-viva-pair__sparkline cartera-viva-pair__sparkline--empty">
                <span>Sin serie suficiente</span>
            </div>
        `;
    }

    const values = series.map((point) => point.rate);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const width = 104;
    const height = 30;
    const spread = Math.max(max - min, max * 0.01, 1);

    const points = values.map((value, index) => {
        const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
        const y = height - (((value - min) / spread) * height);
        return `${x.toFixed(1)},${Math.max(1, Math.min(height - 1, y)).toFixed(1)}`;
    });
    const lastPoint = points[points.length - 1]?.split(',') || ['0', '0'];
    const delta = values[values.length - 1] - values[0];
    const toneClass = delta >= 0 ? 'is-up' : 'is-down';

    return `
        <svg class="cartera-viva-pair__sparkline ${toneClass}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Microlectura del par">
            <polyline points="${points.join(' ')}"></polyline>
            <circle cx="${lastPoint[0]}" cy="${lastPoint[1]}" r="2.4"></circle>
        </svg>
    `;
}

function renderPairSelector(selectedPair) {
    const activePair = normalizeDetailPair(selectedPair);
    return `
        <div class="cartera-viva-pair__selector" role="group" aria-label="Seleccionar par">
            ${DETAIL_PAIR_OPTIONS.map((pair) => `
                <button
                    type="button"
                    class="cartera-viva-pair__chip${pair.id === activePair ? ' is-active' : ''}"
                    data-cartera-detail-pair="${pair.id}">
                    ${pair.label}
                </button>
            `).join('')}
        </div>
    `;
}

function renderEquivalentItem(label, value) {
    return `
        <div class="cartera-viva-detail__equivalent">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </div>
    `;
}

function renderBuyerSummary(buyerRow, options = {}) {
    const buyerStatus = resolveBuyerStatus(buyerRow);
    const progress = buildProgressBreakdown(buyerRow);
    const primaryMetric = resolvePrimarySummaryMetric(buyerRow);
    const pairOption = resolvePairOption(options.selectedPair);
    const exchangeRates = options.exchangeRates && typeof options.exchangeRates === 'object'
        ? options.exchangeRates
        : { USD: 1, COP: null, VES: null };
    const exchangeStatus = options.exchangeStatus && typeof options.exchangeStatus === 'object'
        ? options.exchangeStatus
        : {};
    const copEquivalent = buildConvertedAmount(primaryMetric.amountUsd, 'COP', exchangeRates);
    const vesEquivalent = buildConvertedAmount(primaryMetric.amountUsd, 'VES', exchangeRates);
    const pairRate = resolveDetailRateForCurrency(pairOption.currency, exchangeRates);
    const pairSeries = buildPairSeries(options.historyRows, pairOption);
    const loss = Number(buyerRow?.loss_total || 0);
    const secondaryLabel = loss > 0 && Number(buyerRow?.pending_total || 0) <= 0 ? 'Pérdida' : 'Falta';
    const secondaryValue = secondaryLabel === 'Pérdida'
        ? formatMoney(loss)
        : formatMoney(buyerRow?.pending_total || 0);

    return `
        <section class="cartera-viva-detail__summary">
            <header class="cartera-viva-detail__summary-head">
                <div class="cartera-viva-detail__identity">
                    <h2 class="cartera-viva-detail__title">${escapeHtml(buyerRow?.display_name || 'Comprador no encontrado')}</h2>
                    <p class="cartera-viva-detail__subtitle">${escapeHtml(primaryMetric.copy)}</p>
                </div>
                <div class="cartera-viva-card__badges">
                    <span class="cartera-viva-badge cartera-viva-badge--${buyerStatus.tone}">${escapeHtml(buyerStatus.label)}</span>
                    ${buyerRow?.requires_review ? '<span class="cartera-viva-badge cartera-viva-badge--review">Por revisar</span>' : ''}
                </div>
            </header>

            <div class="cartera-viva-detail__hero">
                <section class="cartera-viva-detail__amount-panel">
                    <p class="cartera-viva-detail__amount-label">${escapeHtml(primaryMetric.label)}</p>
                    <strong class="cartera-viva-detail__amount">${formatMoney(primaryMetric.amountUsd)}</strong>
                    <div class="cartera-viva-detail__equivalents">
                        ${renderEquivalentItem('COP', copEquivalent.display)}
                        ${renderEquivalentItem('Bs', vesEquivalent.display)}
                    </div>
                </section>

                <aside class="cartera-viva-pair" aria-label="Par de referencia">
                    <div class="cartera-viva-pair__head">
                        <p class="cartera-viva-pair__eyebrow">Par</p>
                        <span class="cartera-viva-pair__status">${escapeHtml(resolvePairStatusLabel(pairOption, exchangeStatus))}</span>
                    </div>
                    ${renderPairSelector(pairOption.id)}
                    <div class="cartera-viva-pair__value-row">
                        <strong class="cartera-viva-pair__value">1 USD = ${escapeHtml(formatPairRate(pairRate, pairOption.currency))}</strong>
                        <span class="cartera-viva-pair__value-copy">${escapeHtml(pairOption.label)}</span>
                    </div>
                    ${renderPairSparkline(pairSeries)}
                </aside>
            </div>

            <section class="cartera-viva-progress cartera-viva-progress--large">
                <div class="cartera-viva-progress__head">
                    <span class="cartera-viva-progress__label">Avance</span>
                    <span class="cartera-viva-progress__value">${formatPercent(progress.paidPercent)}</span>
                </div>
                <div class="cartera-viva-progress__track">
                    ${progress.paidShare > 0 ? `<span class="cartera-viva-progress__segment is-paid" style="width:${progress.paidShare}%"></span>` : ''}
                    ${progress.pendingShare > 0 ? `<span class="cartera-viva-progress__segment is-pending" style="width:${progress.pendingShare}%"></span>` : ''}
                    ${progress.lossShare > 0 ? `<span class="cartera-viva-progress__segment is-loss" style="width:${progress.lossShare}%"></span>` : ''}
                </div>
                <div class="cartera-viva-progress__legend">
                    <span>Base ${formatMoney(progress.base)}</span>
                    <span>${secondaryLabel} ${secondaryValue}</span>
                </div>
            </section>

            <div class="cartera-viva-insight-strip cartera-viva-insight-strip--detail">
                ${renderDetailInsight('Fiado', formatMoney(buyerRow?.credited_total))}
                ${renderDetailInsight('Cobrado', formatMoney(buyerRow?.paid_total))}
                ${renderDetailInsight(secondaryLabel, secondaryValue)}
            </div>
        </section>
    `;
}

function createTimelineRowElement(row, options = {}) {
    const article = document.createElement('article');
    article.className = `cartera-viva-history-item cartera-viva-history-item--${row?.tone || 'neutral'}`;
    article.dataset.historyId = String(row?.history_id || '').trim();

    const amountValue = formatMoney(row?.amount);
    const title = escapeHtml(row?.title || 'Movimiento');
    const label = escapeHtml(row?.label || 'Contexto');
    const meta = row?.meta ? `<p class="cartera-viva-history-item__meta">${escapeHtml(row.meta)}</p>` : '';
    const concept = row?.concept ? `<p class="cartera-viva-history-item__concept">${escapeHtml(row.concept)}</p>` : '';
    const note = row?.note ? `<p class="cartera-viva-history-item__note">${escapeHtml(row.note)}</p>` : '';
    const supportLink = renderHistorySupportLink(row);

    article.innerHTML = `
        <div class="cartera-viva-history-item__main">
            <div class="cartera-viva-history-item__copy">
                <div class="cartera-viva-history-item__head">
                    <h3 class="cartera-viva-history-item__title">${title}</h3>
                    <span class="cartera-viva-history-item__label">${label}</span>
                </div>
                ${meta}
                ${concept}
                ${note}
                ${supportLink}
            </div>
            <div class="cartera-viva-history-item__side">
                <strong class="cartera-viva-history-item__amount">${amountValue}</strong>
                ${renderHistoryActionMenu(row, options)}
            </div>
        </div>
    `;

    return article;
}

export function renderBuyerHistoryDetail(root, options = {}) {
    if (!root) return;

    const buyerRow = options.buyerRow || null;
    const historyRows = Array.isArray(options.historyRows) ? options.historyRows : [];
    const loading = Boolean(options.loading);
    const errorMessage = String(options.errorMessage || '').trim();
    const exportPending = Boolean(options.exportPending);
    const exportMessage = String(options.exportMessage || '').trim();
    const exportTone = String(options.exportTone || '').trim().toLowerCase();
    const selectedPair = normalizeDetailPair(options.selectedPair);
    const historyFilter = normalizeHistoryFilter(options.historyFilter);
    const exchangeRates = options.exchangeRates && typeof options.exchangeRates === 'object'
        ? options.exchangeRates
        : { USD: 1, COP: null, VES: null };
    const exchangeStatus = options.exchangeStatus && typeof options.exchangeStatus === 'object'
        ? options.exchangeStatus
        : {};
    const visibleHistoryRows = filterHistoryRows(historyRows, historyFilter);
    const filterEmptyTitle = historyFilter === 'revertidos'
        ? 'Sin revertidos visibles'
        : 'Sin transferidos visibles';
    const filterEmptyCopy = historyFilter === 'revertidos'
        ? 'Este comprador no tiene movimientos revertidos dentro del filtro activo.'
        : 'Este comprador no tiene movimientos transferidos dentro del filtro activo.';

    if (!buyerRow) {
        root.innerHTML = `
            <section class="cartera-viva-view cartera-viva-view--detail" aria-label="Historial contextual">
                <div class="cartera-viva-detail__toolbar">
                    <button type="button" class="cartera-viva-back" data-cartera-detail-back>Volver</button>
                </div>
                ${renderEmptyState({
                    title: 'Comprador no encontrado',
                    copy: 'La grilla ya no tiene disponible este comprador.'
                })}
            </section>
        `;
        root.querySelector('[data-cartera-detail-back]')?.addEventListener('click', () => {
            options.onBack?.();
        });
        return;
    }

    let bodyContent = '';
    const exportStatus = exportMessage
        ? `<p class="cartera-viva-detail__status${exportTone ? ` is-${escapeHtml(exportTone)}` : ''}">${escapeHtml(exportMessage)}</p>`
        : '';

    if (loading) {
        bodyContent = renderEmptyState({
            title: 'Cargando historial del comprador',
            copy: 'Ordenando los movimientos relacionados a este comprador.'
        });
    } else if (errorMessage) {
        bodyContent = renderEmptyState({
            title: 'No se pudo leer el historial',
            copy: errorMessage
        });
    } else if (historyRows.length <= 0) {
        bodyContent = renderEmptyState({
            title: 'Sin historial legible',
            copy: 'Este comprador todavía no tiene movimientos suficientes para contar su historia.'
        });
    } else if (visibleHistoryRows.length <= 0) {
        bodyContent = renderEmptyState({
            title: filterEmptyTitle,
            copy: filterEmptyCopy
        });
    } else {
        bodyContent = '<div class="cartera-viva-detail__timeline" data-cartera-detail-timeline></div>';
    }

    root.innerHTML = `
        <section class="cartera-viva-view cartera-viva-view--detail" aria-label="Historial contextual por comprador">
            <div class="cartera-viva-detail__toolbar">
                <button type="button" class="cartera-viva-back" data-cartera-detail-back>Volver</button>
                <div class="cartera-viva-detail__toolbar-actions">
                <button type="button" class="cartera-viva-refresh" data-cartera-detail-refresh>Actualizar</button>
                <button type="button" class="cartera-viva-refresh" data-cartera-detail-create-cycle>Crear ciclo</button>
                <button
                    type="button"
                    class="cartera-viva-refresh"
                    data-cartera-detail-export
                    ${loading || exportPending ? 'disabled' : ''}>
                        ${exportPending ? 'Exportando…' : 'Exportar'}
                    </button>
                </div>
            </div>

            ${exportStatus}

            ${renderBuyerSummary(buyerRow, {
                historyRows,
                selectedPair,
                exchangeRates,
                exchangeStatus
            })}

            <section class="cartera-viva-detail__body">
                <header class="cartera-viva-detail__body-head">
                    <div>
                        <p class="cartera-viva-view__eyebrow">Historial</p>
                        <h3 class="cartera-viva-detail__section-title">Movimientos del comprador</h3>
                    </div>
                    <div class="cartera-viva-detail__body-meta">
                        <p class="cartera-viva-detail__body-copy">
                            Fiados, cobros, pérdidas e ingresos relacionados con este comprador.
                        </p>
                        ${renderHistoryFilters(historyRows, historyFilter)}
                    </div>
                </header>
                ${bodyContent}
            </section>
        </section>
    `;

    root.querySelector('[data-cartera-detail-back]')?.addEventListener('click', () => {
        options.onBack?.();
    });

    root.querySelector('[data-cartera-detail-refresh]')?.addEventListener('click', () => {
        options.onRefresh?.();
    });

    root.querySelector('[data-cartera-detail-create-cycle]')?.addEventListener('click', () => {
        options.onCreateCycle?.({
            buyerRow,
            historyRow: null
        });
    });

    root.querySelector('[data-cartera-detail-export]')?.addEventListener('click', () => {
        options.onExport?.();
    });

    root.querySelectorAll('[data-cartera-detail-pair]').forEach((button) => {
        button.addEventListener('click', () => {
            const nextPair = normalizeDetailPair(button.dataset.carteraDetailPair);
            if (nextPair === selectedPair) return;
            options.onPairChange?.(nextPair);
        });
    });

    root.querySelectorAll('[data-cartera-detail-history-filter]').forEach((button) => {
        button.addEventListener('click', () => {
            const nextFilter = normalizeHistoryFilter(button.dataset.carteraDetailHistoryFilter);
            if (nextFilter === historyFilter) return;
            options.onHistoryFilterChange?.(nextFilter);
        });
    });

    root.querySelectorAll('[data-cartera-history-action="create-cycle"]').forEach((button) => {
        button.addEventListener('click', () => {
            const historyId = String(button.dataset.carteraHistoryId || '').trim();
            const historyRow = historyRows.find((row) => String(row?.history_id || '').trim() === historyId) || null;
            options.onCreateCycle?.({
                buyerRow,
                historyRow
            });
        });
    });

    const timelineNode = root.querySelector('[data-cartera-detail-timeline]');
    if (timelineNode) {
        renderHistoryDayGroups(timelineNode, visibleHistoryRows, {
            dateFieldName: 'fecha',
            formatDayLabel: formatHistoryAbsoluteDayLabel,
            renderRow(fragment, row) {
                fragment.appendChild(createTimelineRowElement(row, {
                    onCreateCycle: options.onCreateCycle
                }));
            }
        });
    }
}
