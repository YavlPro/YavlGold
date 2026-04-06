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
    'unit_type',
    'unit_qty',
    'quantity_kg',
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
    'unit_type',
    'unit_qty',
    'quantity_kg',
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

function getOutstandingBalance(buyerRow) {
    const pendingTotal = Number(buyerRow?.pending_total);
    if (Number.isFinite(pendingTotal)) return Math.max(0, pendingTotal);

    const credited = Number(buyerRow?.credited_total || 0);
    const paid = Number(buyerRow?.paid_total || 0);
    const loss = Number(buyerRow?.loss_total || 0);
    const transferred = Number(buyerRow?.transferred_total || 0);
    return Math.max(0, credited - paid - loss - transferred);
}

function getProgressBase(buyerRow) {
    const credited = Number(buyerRow?.credited_total || 0);
    const combined = Number(buyerRow?.paid_total || 0) + getOutstandingBalance(buyerRow) + Number(buyerRow?.loss_total || 0);
    return Math.max(credited, combined, 0);
}

function getPaidPercent(buyerRow) {
    const compliance = Number(buyerRow?.compliance_percent);
    if (Number.isFinite(compliance) && compliance > 0) return clampPercent(compliance);

    const base = getProgressBase(buyerRow);
    if (base <= 0) return 0;
    return clampPercent((Number(buyerRow?.paid_total || 0) / base) * 100);
}

function resolveBuyerStatus(buyerRow) {
    const pending = getOutstandingBalance(buyerRow);
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
    const pending = Math.max(0, getOutstandingBalance(buyerRow));
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

function formatHistoryQuantity(value, decimals = 2) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return '';
    if (Math.abs(numeric - Math.round(numeric)) < 1e-9) {
        return String(Math.round(numeric));
    }
    return String(Number(numeric.toFixed(decimals)));
}

function formatHistoryUnitLabel(unitType, quantity) {
    const normalizedType = String(unitType || '').trim().toLowerCase();
    const numeric = Number(quantity);
    const singular = Math.abs(numeric - 1) < 1e-9;

    if (normalizedType === 'kg') return 'kg';
    if (normalizedType === 'saco') return singular ? 'saco' : 'sacos';
    if (normalizedType === 'cesta') return singular ? 'cesta' : 'cestas';
    if (normalizedType === 'unidad') return singular ? 'unidad' : 'unidades';
    if (!normalizedType) return singular ? 'unidad' : 'unidades';
    return normalizedType;
}

function normalizeUnitFamily(value) {
    const token = String(value || '').trim().toLowerCase();
    if (token === 'sacks' || token === 'sack' || token === 'saco' || token === 'sacos') return 'sacks';
    if (token === 'baskets' || token === 'basket' || token === 'cesta' || token === 'cestas') return 'baskets';
    if (token === 'kg' || token === 'kilogramo' || token === 'kilogramos') return 'kg';
    return 'all';
}

function getUnitFamilyLabel(family) {
    const normalizedFamily = normalizeUnitFamily(family);
    if (normalizedFamily === 'sacks') return 'Sacos';
    if (normalizedFamily === 'baskets') return 'Cestas';
    if (normalizedFamily === 'kg') return 'Kilogramos';
    return 'Vista general';
}

function resolveHistoryUnitFamily(row) {
    const unitType = String(row?.unit_type || '').trim().toLowerCase();
    if (unitType === 'saco') return 'sacks';
    if (unitType === 'cesta') return 'baskets';
    if (unitType === 'kg') return 'kg';
    if (Number.isFinite(Number(row?.quantity_kg)) && Number(row.quantity_kg) > 0) return 'kg';
    return 'all';
}

function buildVisibleUnitParts(row) {
    const parts = [];
    const unitQty = Number(readHistoryItemField(row, ['unit_qty']));
    const quantityKg = Number(readHistoryItemField(row, ['quantity_kg']));
    const unitType = String(readHistoryItemField(row, ['unit_type']) || '').trim().toLowerCase();

    if (Number.isFinite(unitQty) && unitQty > 0) {
        parts.push(`${formatHistoryQuantity(unitQty)} ${formatHistoryUnitLabel(unitType, unitQty)}`);
    }

    if (Number.isFinite(quantityKg) && quantityKg > 0 && (!unitType || unitType !== 'kg')) {
        parts.push(`${formatHistoryQuantity(quantityKg)} kg`);
    }

    return parts;
}

function buildMovementMeta(row, primaryParts = []) {
    const parts = Array.isArray(primaryParts)
        ? primaryParts.map((part) => String(part || '').trim()).filter(Boolean)
        : [];

    buildVisibleUnitParts(row).forEach((part) => {
        if (!parts.includes(part)) {
            parts.push(part);
        }
    });

    return parts.join(' · ');
}

function createActionHistoryRow(row, config = {}) {
    const timestamp = String(config.timestamp || row?.created_at || row?.fecha || '').trim();
    const actionDate = /^\d{4}-\d{2}-\d{2}/.test(timestamp)
        ? timestamp.slice(0, 10)
        : String(row?.fecha || '').trim();

    return {
        history_id: String(config.history_id || '').trim(),
        row_kind: 'action',
        history_filter: String(config.history_filter || 'transferidos').trim().toLowerCase(),
        source_table: String(config.source_table || '').trim().toLowerCase(),
        source_tab: String(config.source_tab || '').trim().toLowerCase(),
        source_id: String(config.source_id || row?.id || '').trim(),
        title: String(config.title || 'Acción del sistema').trim(),
        label: String(config.label || 'Acción').trim(),
        amount: normalizeMoney(config.amount ?? readHistoryItemField(row, ['monto_usd', 'monto'])),
        currency: normalizeDetailCurrency(config.currency || row?.currency),
        exchange_rate: Number(config.exchange_rate ?? row?.exchange_rate) || null,
        fecha: actionDate,
        created_at: timestamp || row?.created_at || row?.fecha || '',
        concept: String((config.concept ?? row?.concepto) || '').trim(),
        meta: buildMovementMeta(row, config.metaParts || []),
        note: String(config.note || 'Evento auxiliar del sistema sobre la cartera.').trim(),
        tone: String(config.tone || 'review').trim().toLowerCase() || 'review',
        crop_id: String(config.crop_id || row?.crop_id || '').trim(),
        unit_type: String(row?.unit_type || (Number(row?.quantity_kg) > 0 ? 'kg' : '')).trim().toLowerCase(),
        unit_qty: Number(row?.unit_qty ?? row?.quantity_kg ?? NaN),
        quantity_kg: Number(row?.quantity_kg ?? NaN),
        ledger_scope: normalizeLedgerScope(config.ledger_scope),
        support_url_raw: '',
        support_url_resolved: '',
        support_label: ''
    };
}

function buildPendingLedgerRow(row) {
    const transferState = String(row?.transfer_state || 'active').trim().toLowerCase();
    if (transferState === 'transferred') return null;

    const amount = normalizeMoney(readHistoryItemField(row, ['monto_usd', 'monto']));
    const transferredTo = String(row?.transferred_to || '').trim().toLowerCase();
    const isReview = String(row?.buyer_match_status || '').trim().toLowerCase() !== 'matched';

    return {
        history_id: `agro_pending:${row?.id || ''}`,
        row_kind: 'ledger',
        history_filter: 'todos',
        source_table: 'agro_pending',
        source_tab: 'pendientes',
        source_id: String(row?.id || '').trim(),
        title: String(row?.cliente || '').trim() ? `Fiado a ${row.cliente}` : 'Fiado registrado',
        label: isReview ? 'Por revisar' : 'Fiado',
        amount,
        currency: normalizeDetailCurrency(row?.currency),
        exchange_rate: Number(row?.exchange_rate) || null,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: buildMovementMeta(row),
        note: isReview
            ? 'Este movimiento aún necesita revisión antes de cerrar su lectura.'
            : 'Registro canónico de deuda del cliente.',
        tone: isReview ? 'review' : 'pending',
        is_review: isReview,
        crop_id: String(row?.crop_id || '').trim(),
        unit_type: String(row?.unit_type || (Number(row?.quantity_kg) > 0 ? 'kg' : '')).trim().toLowerCase(),
        unit_qty: Number(row?.unit_qty ?? row?.quantity_kg ?? NaN),
        quantity_kg: Number(row?.quantity_kg ?? NaN),
        ledger_scope: 'fiados',
        transfer_state: transferState,
        transferred_to: transferredTo,
        reverted_at: row?.reverted_at || '',
        origin_table: '',
        origin_id: '',
        is_transfer_related: false,
        support_url_raw: String(row?.evidence_url || row?.soporte_url || '').trim(),
        support_url_resolved: '',
        support_label: 'Ver soporte'
    };
}

function buildPendingActionRows(row) {
    const transferState = String(row?.transfer_state || '').trim().toLowerCase();
    const transferredTo = String(row?.transferred_to || '').trim().toLowerCase();
    const isReverted = transferState === 'reverted' || Boolean(row?.reverted_at);

    if (isReverted) {
        return [
            createActionHistoryRow(row, {
                history_id: `agro_pending_action_revert:${row?.id || ''}`,
                history_filter: 'revertidos',
                source_table: 'agro_pending',
                source_tab: 'pendientes',
                source_id: String(row?.id || '').trim(),
                ledger_scope: 'fiados',
                label: 'Revertido a fiado',
                tone: 'review',
                note: 'Este fiado volvió a la cartera activa del cliente.'
            })
        ];
    }

    if (transferState !== 'transferred') return [];

    const transferLabel = transferredTo === 'income'
        ? 'Transferido a cobro'
        : transferredTo === 'losses'
            ? 'Transferido a pérdida'
            : (transferredTo ? `Transferido a ${transferredTo}` : 'Transferido fuera de cartera');

    return [
        createActionHistoryRow(row, {
            history_id: `agro_pending_action:${row?.id || ''}`,
            history_filter: 'transferidos',
            source_table: 'agro_pending',
            source_tab: 'pendientes',
            source_id: String(row?.id || '').trim(),
            ledger_scope: 'fiados',
            label: transferLabel,
            tone: 'review',
            note: 'Este fiado salió de la cartera activa hacia otra salida operativa.'
        })
    ];
}

function buildIncomeLedgerRow(row) {
    const amount = normalizeMoney(readHistoryItemField(row, ['monto_usd', 'monto']));
    const originTable = String(row?.origin_table || '').trim().toLowerCase();
    const originId = String(row?.origin_id || '').trim();
    const fromPendingContext = originTable === 'agro_pending';
    const hasTransferOrigin = fromPendingContext && !!originId;
    const isReview = String(row?.buyer_match_status || '').trim().toLowerCase() !== 'matched';
    const isReverted = String(row?.transfer_state || '').trim().toLowerCase() === 'reverted' || Boolean(row?.reverted_at);
    if (isReverted) return null;

    return {
        history_id: `agro_income:${row?.id || ''}`,
        row_kind: 'ledger',
        history_filter: 'todos',
        source_table: 'agro_income',
        source_tab: 'ingresos',
        source_id: String(row?.id || '').trim(),
        title: fromPendingContext ? 'Cobro registrado' : 'Ingreso aparte',
        label: fromPendingContext ? 'Cobro' : 'Ingreso aparte',
        amount,
        currency: normalizeDetailCurrency(row?.currency),
        exchange_rate: Number(row?.exchange_rate) || null,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: buildMovementMeta(row, [String(row?.categoria || '').trim()]),
        note: isReview
            ? 'Este ingreso aún está pendiente por revisar.'
            : (fromPendingContext
                ? 'Movimiento económico confirmado dentro del saldo del cliente.'
                : 'Entrada relacionada con el cliente, pero separada de la cartera.'),
        tone: isReview ? 'review' : (fromPendingContext ? 'paid' : 'neutral'),
        is_review: isReview,
        crop_id: String(row?.crop_id || '').trim(),
        unit_type: String(row?.unit_type || (Number(row?.quantity_kg) > 0 ? 'kg' : '')).trim().toLowerCase(),
        unit_qty: Number(row?.unit_qty ?? row?.quantity_kg ?? NaN),
        quantity_kg: Number(row?.quantity_kg ?? NaN),
        ledger_scope: 'pagados',
        transfer_state: String(row?.transfer_state || '').trim().toLowerCase(),
        transferred_to: '',
        reverted_at: row?.reverted_at || '',
        origin_table: originTable,
        origin_id: originId,
        is_transfer_related: hasTransferOrigin,
        support_url_raw: String(row?.soporte_url || row?.evidence_url || '').trim(),
        support_url_resolved: '',
        support_label: 'Ver soporte'
    };
}

function buildIncomeActionRows(row) {
    const originTable = String(row?.origin_table || '').trim().toLowerCase();
    const originId = String(row?.origin_id || '').trim();
    const isReverted = String(row?.transfer_state || '').trim().toLowerCase() === 'reverted' || Boolean(row?.reverted_at);

    if (originTable !== 'agro_pending' || !originId) {
        if (isReverted) {
            return [
                createActionHistoryRow(row, {
                    history_id: `agro_income_action_revert:${row?.id || ''}`,
                    history_filter: 'revertidos',
                    source_table: 'agro_income',
                    source_tab: 'ingresos',
                    source_id: String(row?.id || '').trim(),
                    ledger_scope: 'pagados',
                    label: 'Devuelto a fiados',
                    tone: 'review',
                    note: 'Este ingreso fue devuelto a la cartera activa del cliente.',
                    metaParts: [String(row?.categoria || '').trim()]
                })
            ];
        }
        return [];
    }

    if (isReverted) {
        return [
            createActionHistoryRow(row, {
                history_id: `agro_income_action_revert:${row?.id || ''}`,
                history_filter: 'revertidos',
                source_table: 'agro_income',
                source_tab: 'ingresos',
                source_id: String(row?.id || '').trim(),
                ledger_scope: 'pagados',
                label: 'Revertido desde cobro',
                tone: 'review',
                note: 'El cobro se devolvió nuevamente a Fiados.',
                metaParts: [String(row?.categoria || '').trim()]
            })
        ];
    }

    return [
        createActionHistoryRow(row, {
            history_id: `agro_income_action_transfer:${row?.id || ''}`,
            history_filter: 'transferidos',
            source_table: 'agro_income',
            source_tab: 'ingresos',
            source_id: String(row?.id || '').trim(),
            ledger_scope: 'pagados',
            label: 'Transferido a cobro',
            tone: 'paid',
            note: 'Acción del sistema: este cobro nació desde un fiado canónico.',
            metaParts: [String(row?.categoria || '').trim()]
        })
    ];
}

function buildLossLedgerRow(row) {
    const amount = normalizeMoney(readHistoryItemField(row, ['monto_usd', 'monto']));
    const originTable = String(row?.origin_table || '').trim().toLowerCase();
    const originId = String(row?.origin_id || '').trim();
    const fromPendingContext = originTable === 'agro_pending';
    const hasTransferOrigin = fromPendingContext && !!originId;
    const matchStatus = String(row?.buyer_match_status || '').trim().toLowerCase();
    const isReview = matchStatus !== 'matched';
    const isReverted = String(row?.transfer_state || '').trim().toLowerCase() === 'reverted' || Boolean(row?.reverted_at);
    if (isReverted) return null;

    return {
        history_id: `agro_losses:${row?.id || ''}`,
        row_kind: 'ledger',
        history_filter: 'todos',
        source_table: 'agro_losses',
        source_tab: 'perdidas',
        source_id: String(row?.id || '').trim(),
        title: fromPendingContext ? 'Pérdida registrada' : 'Pérdida por revisar',
        label: fromPendingContext ? 'Pérdida' : 'Por revisar',
        amount,
        currency: normalizeDetailCurrency(row?.currency),
        exchange_rate: Number(row?.exchange_rate) || null,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: buildMovementMeta(row, [String(row?.causa || '').trim()]),
        note: isReview
            ? (matchStatus === 'legacy_unclassified'
                ? 'Hay un registro antiguo que todavía necesita ordenarse.'
                : 'Esta pérdida aún necesita confirmación final.')
            : 'Salida cerrada de la cartera.',
        tone: isReview ? 'review' : 'loss',
        is_review: isReview,
        crop_id: String(row?.crop_id || '').trim(),
        unit_type: String(row?.unit_type || (Number(row?.quantity_kg) > 0 ? 'kg' : '')).trim().toLowerCase(),
        unit_qty: Number(row?.unit_qty ?? row?.quantity_kg ?? NaN),
        quantity_kg: Number(row?.quantity_kg ?? NaN),
        ledger_scope: 'perdidos',
        transfer_state: String(row?.transfer_state || '').trim().toLowerCase(),
        transferred_to: '',
        reverted_at: row?.reverted_at || '',
        origin_table: originTable,
        origin_id: originId,
        is_transfer_related: hasTransferOrigin,
        support_url_raw: String(row?.evidence_url || row?.soporte_url || '').trim(),
        support_url_resolved: '',
        support_label: 'Ver soporte'
    };
}

function buildLossActionRows(row) {
    const originTable = String(row?.origin_table || '').trim().toLowerCase();
    const originId = String(row?.origin_id || '').trim();
    const isReverted = String(row?.transfer_state || '').trim().toLowerCase() === 'reverted' || Boolean(row?.reverted_at);

    if (originTable !== 'agro_pending' || !originId) {
        if (isReverted) {
            return [
                createActionHistoryRow(row, {
                    history_id: `agro_losses_action_revert:${row?.id || ''}`,
                    history_filter: 'revertidos',
                    source_table: 'agro_losses',
                    source_tab: 'perdidas',
                    source_id: String(row?.id || '').trim(),
                    ledger_scope: 'perdidos',
                    label: 'Devuelto a fiados',
                    tone: 'review',
                    note: 'Esta pérdida fue devuelta a la cartera activa del cliente.',
                    metaParts: [String(row?.causa || '').trim()]
                })
            ];
        }
        return [];
    }

    if (isReverted) {
        return [
            createActionHistoryRow(row, {
                history_id: `agro_losses_action_revert:${row?.id || ''}`,
                history_filter: 'revertidos',
                source_table: 'agro_losses',
                source_tab: 'perdidas',
                source_id: String(row?.id || '').trim(),
                ledger_scope: 'perdidos',
                label: 'Revertido desde pérdida',
                tone: 'review',
                note: 'La pérdida se devolvió nuevamente a Fiados.',
                metaParts: [String(row?.causa || '').trim()]
            })
        ];
    }

    return [
        createActionHistoryRow(row, {
            history_id: `agro_losses_action_transfer:${row?.id || ''}`,
            history_filter: 'transferidos',
            source_table: 'agro_losses',
            source_tab: 'perdidas',
            source_id: String(row?.id || '').trim(),
            ledger_scope: 'perdidos',
            label: 'Transferido a pérdida',
            tone: 'loss',
            note: 'Acción del sistema: esta pérdida cerró un fiado del cliente.',
            metaParts: [String(row?.causa || '').trim()]
        })
    ];
}

function getHistorySortTimestamp(row) {
    const createdAt = Date.parse(row?.created_at || '') || 0;
    const explicitDate = Date.parse(row?.fecha || '') || 0;
    return Math.max(explicitDate, createdAt, 0);
}

function compareHistoryRows(a, b) {
    const aDate = getHistorySortTimestamp(a);
    const bDate = getHistorySortTimestamp(b);
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
        ...pendingRows.map(buildPendingLedgerRow).filter(Boolean),
        ...pendingRows.flatMap(buildPendingActionRows),
        ...incomeRows.map(buildIncomeLedgerRow).filter(Boolean),
        ...incomeRows.flatMap(buildIncomeActionRows),
        ...lossRows.map(buildLossLedgerRow).filter(Boolean),
        ...lossRows.flatMap(buildLossActionRows)
    ].sort(compareHistoryRows);

    return hydrateHistorySupportUrls(timelineRows);
}

function renderEmptyState(config = {}) {
    const title = escapeHtml(config.title || 'Sin historial legible');
    const copy = escapeHtml(config.copy || 'Este cliente todavía no tiene movimientos visibles para contar su historia.');

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

function renderTimelineSkeleton(count = 3) {
    const size = Math.max(1, Number(count) || 3);
    return `
        <div class="cartera-viva-detail__timeline-skeleton" aria-hidden="true">
            ${Array.from({ length: size }, () => `
                <article class="cartera-viva-history-item cartera-viva-history-item--skeleton">
                    <div class="cartera-viva-history-item__main">
                        <div class="cartera-viva-history-item__copy">
                            <span class="cartera-viva-skeleton-line cartera-viva-skeleton-line--title"></span>
                            <span class="cartera-viva-skeleton-line cartera-viva-skeleton-line--meta"></span>
                            <span class="cartera-viva-skeleton-line cartera-viva-skeleton-line--note"></span>
                        </div>
                        <div class="cartera-viva-history-item__side">
                            <span class="cartera-viva-skeleton-line cartera-viva-skeleton-line--amount"></span>
                        </div>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

function renderSystemActionShell() {
    return `
        <section class="cartera-viva-detail__actions-band cartera-viva-detail__actions-band--loading" aria-hidden="true">
            <div class="cartera-viva-detail__actions-head">
                <div>
                    <p class="cartera-viva-view__eyebrow">Acciones</p>
                    <h4 class="cartera-viva-detail__actions-title">Eventos del sistema</h4>
                </div>
                <span class="cartera-viva-skeleton-line cartera-viva-skeleton-line--tag"></span>
            </div>
            <p class="cartera-viva-detail__actions-copy">Preparando transferencias, cierres y reversiones…</p>
            ${renderTimelineSkeleton(2)}
        </section>
    `;
}

function normalizeHistoryFilter(value) {
    const token = String(value || '').trim().toLowerCase();
    if (token === 'transferidos') return 'transferidos';
    if (token === 'revertidos') return 'revertidos';
    return 'todos';
}

function normalizeLedgerScope(value) {
    const token = String(value || '').trim().toLowerCase();
    if (token === 'fiados') return 'fiados';
    if (token === 'pagados') return 'pagados';
    if (token === 'perdidos') return 'perdidos';
    return 'todos';
}

function resolveRowLedgerScope(row) {
    const explicitScope = normalizeLedgerScope(row?.ledger_scope);
    if (explicitScope !== 'todos') return explicitScope;

    const sourceTab = String(row?.source_tab || '').trim().toLowerCase();
    if (sourceTab === 'pendientes') return 'fiados';
    if (sourceTab === 'ingresos') return 'pagados';
    if (sourceTab === 'perdidas') return 'perdidos';
    return 'todos';
}

function matchesLedgerScope(row, ledgerScope) {
    const normalizedScope = normalizeLedgerScope(ledgerScope);
    const rowScope = resolveRowLedgerScope(row);
    if (normalizedScope === 'fiados') return rowScope === 'fiados';
    if (normalizedScope === 'pagados') return rowScope === 'pagados';
    if (normalizedScope === 'perdidos') return rowScope === 'perdidos';
    return true;
}

function filterLedgerRowsByScope(rows, ledgerScope) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const normalizedScope = normalizeLedgerScope(ledgerScope);
    if (normalizedScope === 'todos') return safeRows;
    return safeRows.filter((row) => matchesLedgerScope(row, normalizedScope));
}

function filterRowsByUnitFamily(rows, unitFamily) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const normalizedFamily = normalizeUnitFamily(unitFamily);
    if (normalizedFamily === 'all') return safeRows;
    return safeRows.filter((row) => resolveHistoryUnitFamily(row) === normalizedFamily);
}

function getLedgerScopeCount(rows, ledgerScope) {
    return filterLedgerRowsByScope(rows, ledgerScope).length;
}

function getUnitFamilyCount(rows, unitFamily) {
    return filterRowsByUnitFamily(rows, unitFamily).length;
}

function isActionHistoryRow(row) {
    return row && typeof row === 'object' && String(row?.row_kind || '').trim().toLowerCase() === 'action';
}

function getLedgerHistoryRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    return safeRows.filter((row) => !isActionHistoryRow(row));
}

function getActionHistoryRows(rows, filterMode = 'todos', unitFamily = 'all') {
    const safeRows = Array.isArray(rows) ? rows : [];
    const normalizedFilter = normalizeHistoryFilter(filterMode);
    const actionRows = normalizedFilter === 'todos'
        ? safeRows.filter((row) => isActionHistoryRow(row))
        : safeRows.filter((row) =>
            isActionHistoryRow(row)
            && String(row?.history_filter || '').trim().toLowerCase() === normalizedFilter
        );

    return filterRowsByUnitFamily(actionRows, unitFamily);
}

function filterHistoryRows(rows, filterMode, unitFamily = 'all', ledgerScope = 'todos') {
    const normalizedFilter = normalizeHistoryFilter(filterMode);
    if (normalizedFilter === 'todos') {
        return filterRowsByUnitFamily(filterLedgerRowsByScope(getLedgerHistoryRows(rows), ledgerScope), unitFamily);
    }
    return filterLedgerRowsByScope(getActionHistoryRows(rows, normalizedFilter, unitFamily), ledgerScope);
}

function getHistoryFilterCount(rows, filterMode, unitFamily = 'all', ledgerScope = 'todos') {
    return filterHistoryRows(rows, filterMode, unitFamily, ledgerScope).length;
}

export function getVisibleBuyerHistoryRows(rows, filterMode, ledgerScope = 'todos', unitFamily = 'all') {
    const normalizedFilter = normalizeHistoryFilter(filterMode);
    if (normalizedFilter !== 'todos') {
        return filterLedgerRowsByScope(getActionHistoryRows(rows, normalizedFilter, unitFamily), ledgerScope);
    }
    return filterRowsByUnitFamily(filterLedgerRowsByScope(getLedgerHistoryRows(rows), ledgerScope), unitFamily);
}

function renderHistoryFilters(historyRows, activeFilter, options = {}) {
    const unitFamily = normalizeUnitFamily(options.unitFamily);
    const ledgerScope = normalizeLedgerScope(options.ledgerScope);
    const transferCount = getHistoryFilterCount(historyRows, 'transferidos', unitFamily, ledgerScope);
    const revertedCount = getHistoryFilterCount(historyRows, 'revertidos', unitFamily, ledgerScope);
    if (transferCount <= 0 && revertedCount <= 0) return '';

    const normalizedFilter = normalizeHistoryFilter(activeFilter);
    const allCount = Number(options.timelineCount ?? getHistoryFilterCount(historyRows, 'todos', unitFamily, ledgerScope));
    const filters = [
        { id: 'todos', label: `Timeline (${allCount})`, visible: true },
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

function renderLedgerScopeFilters(ledgerRows, activeScope) {
    const normalizedScope = normalizeLedgerScope(activeScope);
    const filters = [
        { id: 'fiados', label: 'Fiados', count: getLedgerScopeCount(ledgerRows, 'fiados') },
        { id: 'pagados', label: 'Cobros', count: getLedgerScopeCount(ledgerRows, 'pagados') },
        { id: 'perdidos', label: 'Pérdidas', count: getLedgerScopeCount(ledgerRows, 'perdidos') },
        { id: 'todos', label: 'Todo', count: getLedgerScopeCount(ledgerRows, 'todos') }
    ].filter((filter) => filter.id === 'todos' || filter.count > 0);

    if (filters.length <= 1) return '';

    return `
        <div class="cartera-viva-detail__filters cartera-viva-detail__filters--scope" role="group" aria-label="Contexto del detalle">
            ${filters.map((filter) => `
                <button
                    type="button"
                    class="cartera-viva-detail__filter${normalizedScope === filter.id ? ' is-active' : ''}"
                    data-cartera-detail-ledger-scope="${filter.id}"
                    aria-pressed="${normalizedScope === filter.id ? 'true' : 'false'}">
                    ${filter.label} (${filter.count})
                </button>
            `).join('')}
        </div>
    `;
}

function renderUnitFamilyFilters(rows, activeFamily) {
    const normalizedFamily = normalizeUnitFamily(activeFamily);
    const filters = [
        { id: 'all', label: 'Vista general', count: Array.isArray(rows) ? rows.length : 0 },
        { id: 'sacks', label: 'Sacos', count: getUnitFamilyCount(rows, 'sacks') },
        { id: 'baskets', label: 'Cestas', count: getUnitFamilyCount(rows, 'baskets') },
        { id: 'kg', label: 'Kilogramos', count: getUnitFamilyCount(rows, 'kg') }
    ].filter((filter) => filter.id === 'all' || filter.count > 0);

    if (filters.length <= 1) return '';

    return `
        <div class="cartera-viva-detail__filters cartera-viva-detail__filters--family" role="group" aria-label="Familia operativa">
            ${filters.map((filter) => `
                <button
                    type="button"
                    class="cartera-viva-detail__filter${normalizedFamily === filter.id ? ' is-active' : ''}"
                    data-cartera-detail-unit-family="${filter.id}"
                    aria-pressed="${normalizedFamily === filter.id ? 'true' : 'false'}">
                    ${filter.label} (${filter.count})
                </button>
            `).join('')}
        </div>
    `;
}

function renderActionDisclosure(actions) {
    const safeActions = Array.isArray(actions) ? actions : [];
    if (safeActions.length <= 0) return '';

    const previewItems = safeActions.slice(0, 4).map((row) => `
        <span class="cartera-viva-action-pill cartera-viva-action-pill--${escapeHtml(row?.tone || 'review')}">
            ${escapeHtml(row?.label || 'Acción')}
        </span>
    `).join('');

    const remainingCount = Math.max(0, safeActions.length - 4);
    const disclosureItems = safeActions.map((row) => `
        <article class="cartera-viva-detail__action-mini cartera-viva-detail__action-mini--${escapeHtml(row?.tone || 'review')}">
            <div class="cartera-viva-detail__action-mini-head">
                <span class="cartera-viva-action-pill cartera-viva-action-pill--${escapeHtml(row?.tone || 'review')}">
                    ${escapeHtml(row?.label || 'Acción')}
                </span>
                <span class="cartera-viva-detail__action-mini-date">${escapeHtml(formatHistoryAbsoluteDayLabel(row?.fecha || row?.created_at || ''))}</span>
            </div>
            ${row?.note ? `<p class="cartera-viva-detail__action-mini-copy">${escapeHtml(row.note)}</p>` : ''}
        </article>
    `).join('');

    return `
        <details class="cartera-viva-detail__actions-disclosure">
            <summary class="cartera-viva-detail__actions-summary">
                <div class="cartera-viva-detail__actions-summary-copy">
                    <span class="cartera-viva-detail__actions-summary-title">Acciones del sistema</span>
                    <span class="cartera-viva-detail__actions-summary-subtitle">Transferencias, cierres y reversiones viven en una capa secundaria.</span>
                </div>
                <span class="cartera-viva-detail__actions-counter">${safeActions.length}</span>
            </summary>
            <div class="cartera-viva-detail__actions-preview">
                ${previewItems}
                ${remainingCount > 0 ? `<span class="cartera-viva-action-pill cartera-viva-action-pill--ghost">+${remainingCount}</span>` : ''}
            </div>
            <div class="cartera-viva-detail__actions-list">
                ${disclosureItems}
            </div>
        </details>
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

function createActionRowElement(row) {
    const article = document.createElement('article');
    article.className = `cartera-viva-history-action cartera-viva-history-action--${row?.tone || 'neutral'}`;
    article.dataset.historyId = String(row?.history_id || '').trim();

    const title = escapeHtml(row?.title || 'Acción del sistema');
    const label = escapeHtml(row?.label || 'Acción');
    const amount = Number(row?.amount);
    const amountMarkup = Number.isFinite(amount) && amount > 0
        ? `<strong class="cartera-viva-history-action__amount">${formatMoney(amount)}</strong>`
        : '';
    const meta = row?.meta ? `<p class="cartera-viva-history-action__meta">${escapeHtml(row.meta)}</p>` : '';
    const concept = row?.concept ? `<p class="cartera-viva-history-action__concept">${escapeHtml(row.concept)}</p>` : '';
    const note = row?.note ? `<p class="cartera-viva-history-action__note">${escapeHtml(row.note)}</p>` : '';

    article.innerHTML = `
        <div class="cartera-viva-history-action__head">
            <div class="cartera-viva-history-action__copy">
                <span class="cartera-viva-history-action__label cartera-viva-history-action__label--${escapeHtml(row?.tone || 'neutral')}">${label}</span>
                <h4 class="cartera-viva-history-action__title">${title}</h4>
            </div>
            ${amountMarkup}
        </div>
        ${meta}
        ${concept}
        ${note}
    `;

    return article;
}

function resolvePrimarySummaryMetric(buyerRow) {
    const reviewTotal = getReviewTotal(buyerRow);
    const buyerStatus = resolveBuyerStatus(buyerRow);
    const pending = getOutstandingBalance(buyerRow);
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
            ? `Hay ${formatMoney(reviewTotal)} por revisar en este cliente`
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

function renderCommercialFamilyNav(activeView = 'cartera-viva') {
    return `
        <div class="agro-commercial-family" aria-label="Historial comercial">
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
                    Ciclos Operativos
                </button>
            </div>
            <p class="agro-commercial-family__note">Legacy disponible temporalmente. Usa la nueva Cartera Viva.</p>
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
    const outstanding = getOutstandingBalance(buyerRow);
    const secondaryLabel = loss > 0 && outstanding <= 0 ? 'Pérdida' : 'Falta';
    const secondaryValue = secondaryLabel === 'Pérdida'
        ? formatMoney(loss)
        : formatMoney(outstanding);

    return `
        <section class="cartera-viva-detail__summary">
            <header class="cartera-viva-detail__summary-head">
                <div class="cartera-viva-detail__identity">
                    <h2 class="cartera-viva-detail__title">${escapeHtml(buyerRow?.display_name || 'Cliente no encontrado')}</h2>
                    <p class="cartera-viva-detail__subtitle">${escapeHtml(primaryMetric.copy)}</p>
                </div>
                <div class="cartera-viva-card__badges">
                    <span class="cartera-viva-badge cartera-viva-badge--${buyerStatus.tone}">${escapeHtml(buyerStatus.label)}</span>
                    ${String(buyerRow?.client_status || '').trim().toLowerCase() === 'archived' ? '<span class="cartera-viva-badge cartera-viva-badge--review">Archivado</span>' : ''}
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

            <div class="cartera-viva-card__footer">
                <button type="button" class="cartera-viva-quick-action" data-cartera-detail-record-tab="pendientes">Nuevo fiado</button>
                <button type="button" class="cartera-viva-quick-action" data-cartera-detail-record-tab="ingresos">Nuevo cobro</button>
                <button type="button" class="cartera-viva-quick-action" data-cartera-detail-record-tab="perdidas">Nueva pérdida</button>
                <button type="button" class="cartera-viva-quick-action" data-cartera-detail-edit-client>Editar cliente</button>
            </div>
        </section>
    `;
}

function createTimelineRowElement(row, options = {}) {
    if (isActionHistoryRow(row)) {
        return createActionRowElement(row);
    }

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
                    <span class="cartera-viva-history-item__label cartera-viva-history-item__label--${escapeHtml(row?.tone || 'neutral')}">${label}</span>
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
    const ledgerScope = normalizeLedgerScope(options.ledgerScope);
    const unitFamily = normalizeUnitFamily(options.unitFamily);
    const exchangeRates = options.exchangeRates && typeof options.exchangeRates === 'object'
        ? options.exchangeRates
        : { USD: 1, COP: null, VES: null };
    const exchangeStatus = options.exchangeStatus && typeof options.exchangeStatus === 'object'
        ? options.exchangeStatus
        : {};
    const isSoftRefreshing = loading && historyRows.length > 0;
    const ledgerRows = getLedgerHistoryRows(historyRows);
    const actionRows = getActionHistoryRows(historyRows, 'todos', unitFamily);
    const visibleLedgerRows = filterRowsByUnitFamily(filterLedgerRowsByScope(ledgerRows, ledgerScope), unitFamily);
    const visibleActionRows = filterLedgerRowsByScope(actionRows, ledgerScope);
    const visibleHistoryRows = historyFilter === 'todos'
        ? visibleLedgerRows
        : filterLedgerRowsByScope(getActionHistoryRows(historyRows, historyFilter, unitFamily), ledgerScope);
    const isCanonicalFilter = historyFilter === 'todos';
    const unitFamilyPrefix = unitFamily === 'all' ? '' : `${getUnitFamilyLabel(unitFamily)} · `;
    const filterEmptyTitle = historyFilter === 'revertidos'
        ? 'Sin acciones de reversión'
        : 'Sin acciones de transferencia';
    const filterEmptyCopy = historyFilter === 'revertidos'
        ? 'Este cliente no tiene reversiones reales dentro del filtro activo.'
        : 'Este cliente no tiene transferencias reales dentro del filtro activo.';

    if (!buyerRow) {
        root.innerHTML = `
            <section class="cartera-viva-view cartera-viva-view--detail" aria-label="Historial contextual">
                <div class="cartera-viva-detail__toolbar">
                    <button type="button" class="cartera-viva-back" data-cartera-detail-back>Volver</button>
                </div>
                ${renderEmptyState({
            title: 'Cliente no encontrado',
            copy: 'La grilla ya no tiene disponible este cliente.'
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

    if (loading && historyRows.length <= 0) {
        bodyContent = `
            ${renderTimelineSkeleton(3)}
            ${renderSystemActionShell()}
        `;
    } else if (errorMessage) {
        bodyContent = renderEmptyState({
            title: 'No se pudo leer el historial',
            copy: errorMessage
        });
    } else if (historyRows.length <= 0) {
        bodyContent = renderEmptyState({
            title: 'Sin historial canónico',
            copy: 'Este cliente todavía no tiene registros suficientes para reconstruir su timeline.'
        });
    } else if (visibleHistoryRows.length <= 0) {
        bodyContent = renderEmptyState({
            title: filterEmptyTitle,
            copy: filterEmptyCopy
        });
    } else {
        bodyContent = isCanonicalFilter
            ? `
                <div class="cartera-viva-detail__timeline" data-cartera-detail-timeline></div>
                ${renderActionDisclosure(visibleActionRows)}
            `
            : '<div class="cartera-viva-detail__timeline cartera-viva-detail__timeline--actions" data-cartera-detail-timeline></div>';
    }

    root.innerHTML = `
        <section class="cartera-viva-view cartera-viva-view--detail${isSoftRefreshing ? ' is-refreshing' : ''}" aria-label="Historial contextual por cliente" aria-busy="${loading ? 'true' : 'false'}">
            ${renderCommercialFamilyNav('cartera-viva')}
            <div class="cartera-viva-detail__toolbar">
                <button type="button" class="cartera-viva-back" data-cartera-detail-back>Volver</button>
                <div class="cartera-viva-detail__toolbar-actions">
                <button type="button" class="cartera-viva-refresh" data-cartera-detail-refresh ${loading ? 'disabled' : ''}>${loading ? 'Actualizando…' : 'Actualizar'}</button>
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
        historyRows: ledgerRows,
        selectedPair,
        exchangeRates,
        exchangeStatus
    })}

            <section class="cartera-viva-detail__body">
                <header class="cartera-viva-detail__body-head">
                    <div>
                        <p class="cartera-viva-view__eyebrow">Historial</p>
                        <h3 class="cartera-viva-detail__section-title">${isCanonicalFilter
            ? (ledgerScope === 'fiados'
                ? `${unitFamilyPrefix}Fiados del cliente`
                : (ledgerScope === 'pagados'
                    ? `${unitFamilyPrefix}Cobros del cliente`
                    : (ledgerScope === 'perdidos'
                        ? `${unitFamilyPrefix}Pérdidas del cliente`
                        : (unitFamily === 'all'
                            ? 'Timeline canónico del cliente'
                            : `Historial de ${getUnitFamilyLabel(unitFamily).toLowerCase()}`))))
            : 'Acciones del sistema'}</h3>
                    </div>
                    <div class="cartera-viva-detail__body-meta">
                        <p class="cartera-viva-detail__body-copy">
                            ${isCanonicalFilter
            ? (ledgerScope === 'todos'
                ? (unitFamily === 'all'
                    ? 'El timeline principal muestra solo movimientos económicos reales, separados por familia operativa cuando haga falta.'
                    : `El timeline principal muestra solo ${getUnitFamilyLabel(unitFamily).toLowerCase()} dentro del ledger económico del cliente.`)
                : 'El detalle respeta el contexto de entrada y muestra solo el ledger económico de esta categoría.')
            : 'Aquí solo ves eventos auxiliares del sistema, sin mezclar cobros o pérdidas normales.'}
                        </p>
                        ${renderUnitFamilyFilters(ledgerRows, unitFamily)}
                        ${isCanonicalFilter ? renderLedgerScopeFilters(filterRowsByUnitFamily(ledgerRows, unitFamily), ledgerScope) : ''}
                        ${renderHistoryFilters(historyRows, historyFilter, { timelineCount: visibleLedgerRows.length, unitFamily, ledgerScope })}
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

    root.querySelector('[data-cartera-detail-edit-client]')?.addEventListener('click', () => {
        options.onEditClient?.();
    });

    root.querySelectorAll('[data-cartera-detail-record-tab]').forEach((button) => {
        button.addEventListener('click', () => {
            const nextTab = String(button.dataset.carteraDetailRecordTab || '').trim().toLowerCase();
            options.onOpenRecord?.(nextTab);
        });
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

    root.querySelectorAll('[data-cartera-detail-ledger-scope]').forEach((button) => {
        button.addEventListener('click', () => {
            const nextScope = normalizeLedgerScope(button.dataset.carteraDetailLedgerScope);
            if (nextScope === ledgerScope) return;
            options.onLedgerScopeChange?.(nextScope);
        });
    });

    root.querySelectorAll('[data-cartera-detail-unit-family]').forEach((button) => {
        button.addEventListener('click', () => {
            const nextFamily = normalizeUnitFamily(button.dataset.carteraDetailUnitFamily);
            if (nextFamily === unitFamily) return;
            options.onUnitFamilyChange?.(nextFamily);
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
