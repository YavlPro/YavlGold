import {
    formatHistoryAbsoluteDayLabel,
    normalizeHistorySearchToken,
    readHistoryItemField,
    renderHistoryDayGroups
} from './agro-cartera-viva.js';

const PENDING_HISTORY_COLUMNS = [
    'id',
    'concepto',
    'cliente',
    'monto',
    'monto_usd',
    'fecha',
    'created_at',
    'updated_at',
    'unit_type',
    'unit_qty',
    'quantity_kg',
    'transfer_state',
    'transferred_to',
    'buyer_id',
    'buyer_group_key',
    'buyer_match_status',
    'deleted_at',
    'reverted_at'
].join(',');

const INCOME_HISTORY_COLUMNS = [
    'id',
    'concepto',
    'categoria',
    'monto',
    'monto_usd',
    'fecha',
    'created_at',
    'updated_at',
    'origin_table',
    'origin_id',
    'transfer_state',
    'buyer_id',
    'buyer_group_key',
    'buyer_match_status',
    'deleted_at',
    'reverted_at'
].join(',');

const LOSS_HISTORY_COLUMNS = [
    'id',
    'concepto',
    'causa',
    'monto',
    'monto_usd',
    'fecha',
    'created_at',
    'updated_at',
    'origin_table',
    'origin_id',
    'transfer_state',
    'buyer_id',
    'buyer_group_key',
    'buyer_match_status',
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
    if (!Number.isFinite(nextValue)) return 'En revision';
    return `${nextValue.toFixed(0)}%`;
}

function normalizeMoney(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
}

function normalizeBuyerScope(buyerRow) {
    const buyerId = String(buyerRow?.buyer_id || '').trim();
    const groupKey = normalizeHistorySearchToken(buyerRow?.group_key || '');

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

    let label = 'Fiado';
    let note = 'Movimiento de deuda registrado para este comprador.';
    let tone = 'pending';

    if (transferState === 'transferred' && transferredTo === 'income') {
        label = 'Fiado convertido en pago';
        note = 'Este fiado ya fue movido al eje de pagos vinculados.';
        tone = 'paid';
    } else if (transferState === 'transferred' && transferredTo === 'losses') {
        label = 'Fiado convertido en perdida';
        note = 'Este fiado ya fue movido al eje de perdidas vinculadas.';
        tone = 'loss';
    } else if (transferState === 'transferred') {
        label = 'Fiado transferido';
        note = 'El movimiento salio del eje deuda hacia otro destino operativo.';
        tone = 'review';
    }

    if (isReview) {
        tone = 'review';
        note = 'Movimiento buyer-centric en revision. No entra como lectura confiable cerrada.';
    }

    return {
        history_id: `agro_pending:${row?.id || ''}`,
        source_table: 'agro_pending',
        title: String(row?.cliente || '').trim() ? `Fiado a ${row.cliente}` : 'Fiado registrado',
        label,
        amount,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: buildMovementMeta(row),
        note,
        tone,
        is_review: isReview
    };
}

function buildIncomeHistoryRow(row) {
    const amount = normalizeMoney(readHistoryItemField(row, ['monto_usd', 'monto']));
    const fromPending = String(row?.origin_table || '').trim().toLowerCase() === 'agro_pending';
    const isReview = String(row?.buyer_match_status || '').trim().toLowerCase() !== 'matched';

    return {
        history_id: `agro_income:${row?.id || ''}`,
        source_table: 'agro_income',
        title: fromPending ? 'Pago vinculado a deuda' : 'Ingreso fuera de deuda',
        label: fromPending ? 'Pago' : 'Ingreso operativo',
        amount,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: String(row?.categoria || '').trim(),
        note: isReview
            ? 'Ingreso en revision buyer-centric. No se toma como pago confiable.'
            : (fromPending
                ? 'Entrada confirmada como cobro de deuda.'
                : 'Entrada atribuible al comprador, pero fuera del eje deuda.'),
        tone: isReview ? 'review' : (fromPending ? 'paid' : 'neutral'),
        is_review: isReview
    };
}

function buildLossHistoryRow(row) {
    const amount = normalizeMoney(readHistoryItemField(row, ['monto_usd', 'monto']));
    const fromPending = String(row?.origin_table || '').trim().toLowerCase() === 'agro_pending';
    const matchStatus = String(row?.buyer_match_status || '').trim().toLowerCase();
    const isReview = matchStatus !== 'matched';

    return {
        history_id: `agro_losses:${row?.id || ''}`,
        source_table: 'agro_losses',
        title: fromPending ? 'Perdida vinculada a deuda' : 'Perdida en revision',
        label: fromPending ? 'Perdida' : 'Revision',
        amount,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: String(row?.causa || '').trim(),
        note: isReview
            ? (matchStatus === 'legacy_unclassified'
                ? 'Legacy ambiguo. Se muestra por contexto, no como lectura cerrada.'
                : 'Perdida atribuible al comprador, pero todavia en revision.')
            : 'Salida confirmada del eje deuda.',
        tone: isReview ? 'review' : 'loss',
        is_review: isReview
    };
}

function compareHistoryRows(a, b) {
    const aDate = Date.parse(a?.fecha || a?.created_at || '') || 0;
    const bDate = Date.parse(b?.fecha || b?.created_at || '') || 0;
    return bDate - aDate;
}

export async function fetchBuyerHistoryTimeline(supabaseClient, buyerRow) {
    const buyerScope = normalizeBuyerScope(buyerRow);
    if (!buyerScope.hasIdentity) return [];

    const [pendingRows, incomeRows, lossRows] = await Promise.all([
        fetchBuyerScopedRows(supabaseClient, 'agro_pending', PENDING_HISTORY_COLUMNS, buyerScope),
        fetchBuyerScopedRows(supabaseClient, 'agro_income', INCOME_HISTORY_COLUMNS, buyerScope),
        fetchBuyerScopedRows(supabaseClient, 'agro_losses', LOSS_HISTORY_COLUMNS, buyerScope)
    ]);

    return [
        ...pendingRows.map(buildPendingHistoryRow),
        ...incomeRows.map(buildIncomeHistoryRow),
        ...lossRows.map(buildLossHistoryRow)
    ].sort(compareHistoryRows);
}

function renderEmptyState(config = {}) {
    const title = escapeHtml(config.title || 'Sin historial legible');
    const copy = escapeHtml(config.copy || 'Este comprador todavia no tiene movimientos buyer-centric visibles.');

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

function renderBuyerSummary(buyerRow) {
    const reviewTotal = Number(buyerRow?.review_required_total || 0) + Number(buyerRow?.legacy_unclassified_total || 0);
    const reviewCopy = reviewTotal > 0
        ? `Revision abierta ${formatMoney(reviewTotal)}`
        : 'Sin revision abierta';

    return `
        <section class="cartera-viva-detail__summary">
            <header class="cartera-viva-detail__summary-head">
                <div class="cartera-viva-detail__identity">
                    <p class="cartera-viva-card__eyebrow">Comprador canonico</p>
                    <h2 class="cartera-viva-detail__title">${escapeHtml(buyerRow?.display_name || 'Comprador no encontrado')}</h2>
                    <p class="cartera-viva-card__key">${escapeHtml(buyerRow?.group_key || 'sin-group-key')}</p>
                </div>
                <div class="cartera-viva-card__badges">
                    <span class="cartera-viva-badge cartera-viva-badge--${escapeHtml(String(buyerRow?.global_status || 'Mixto').toLowerCase())}">
                        ${escapeHtml(buyerRow?.global_status || 'Mixto')}
                    </span>
                    ${buyerRow?.requires_review ? '<span class="cartera-viva-badge cartera-viva-badge--review">Revision</span>' : ''}
                </div>
            </header>

            <div class="cartera-viva-insight-strip cartera-viva-insight-strip--detail">
                ${renderDetailInsight('Pendiente', formatMoney(buyerRow?.pending_total))}
                ${renderDetailInsight('Pagado', formatMoney(buyerRow?.paid_total))}
                ${renderDetailInsight('Fiado total', formatMoney(buyerRow?.credited_total))}
                ${renderDetailInsight('Cumplimiento', formatPercent(buyerRow?.compliance_percent))}
            </div>

            <p class="cartera-viva-detail__summary-copy">${escapeHtml(reviewCopy)}</p>
        </section>
    `;
}

function createTimelineRowElement(row) {
    const article = document.createElement('article');
    article.className = `cartera-viva-history-item cartera-viva-history-item--${row?.tone || 'neutral'}`;

    const amountValue = formatMoney(row?.amount);
    const title = escapeHtml(row?.title || 'Movimiento');
    const label = escapeHtml(row?.label || 'Contexto');
    const meta = row?.meta ? `<p class="cartera-viva-history-item__meta">${escapeHtml(row.meta)}</p>` : '';
    const concept = row?.concept ? `<p class="cartera-viva-history-item__concept">${escapeHtml(row.concept)}</p>` : '';
    const note = row?.note ? `<p class="cartera-viva-history-item__note">${escapeHtml(row.note)}</p>` : '';

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
            </div>
            <strong class="cartera-viva-history-item__amount">${amountValue}</strong>
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

    if (!buyerRow) {
        root.innerHTML = `
            <section class="cartera-viva-view cartera-viva-view--detail" aria-label="Historial contextual">
                <div class="cartera-viva-detail__toolbar">
                    <button type="button" class="cartera-viva-back" data-cartera-detail-back>Volver</button>
                </div>
                ${renderEmptyState({
                    title: 'Comprador no encontrado',
                    copy: 'La grilla buyer-centric ya no tiene disponible este comprador.'
                })}
            </section>
        `;
        root.querySelector('[data-cartera-detail-back]')?.addEventListener('click', () => {
            options.onBack?.();
        });
        return;
    }

    let bodyContent = '';
    if (loading) {
        bodyContent = renderEmptyState({
            title: 'Cargando historial del comprador',
            copy: 'Leyendo la historia comercial atribuible a este comprador.'
        });
    } else if (errorMessage) {
        bodyContent = renderEmptyState({
            title: 'No se pudo leer el historial',
            copy: errorMessage
        });
    } else if (historyRows.length <= 0) {
        bodyContent = renderEmptyState({
            title: 'Sin historial legible',
            copy: 'Este comprador no tiene movimientos suficientes para contar una historia contextual todavia.'
        });
    } else {
        bodyContent = '<div class="cartera-viva-detail__timeline" data-cartera-detail-timeline></div>';
    }

    root.innerHTML = `
        <section class="cartera-viva-view cartera-viva-view--detail" aria-label="Historial contextual por comprador">
            <div class="cartera-viva-detail__toolbar">
                <button type="button" class="cartera-viva-back" data-cartera-detail-back>Volver</button>
                <button type="button" class="cartera-viva-refresh" data-cartera-detail-refresh>Actualizar historial</button>
            </div>

            ${renderBuyerSummary(buyerRow)}

            <section class="cartera-viva-detail__body">
                <header class="cartera-viva-detail__body-head">
                    <div>
                        <p class="cartera-viva-view__eyebrow">Historial contextual</p>
                        <h3 class="cartera-viva-detail__section-title">Historia comercial del comprador</h3>
                    </div>
                    <p class="cartera-viva-detail__body-copy">
                        Fiados, pagos, perdidas y registros en revision atribuibles honestamente a este comprador.
                    </p>
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

    const timelineNode = root.querySelector('[data-cartera-detail-timeline]');
    if (timelineNode) {
        renderHistoryDayGroups(timelineNode, historyRows, {
            dateFieldName: 'fecha',
            formatDayLabel: formatHistoryAbsoluteDayLabel,
            renderRow(fragment, row) {
                fragment.appendChild(createTimelineRowElement(row));
            }
        });
    }
}
