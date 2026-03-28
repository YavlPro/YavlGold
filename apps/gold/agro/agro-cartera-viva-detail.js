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
    if (!Number.isFinite(nextValue)) return 'Sin lectura';
    return `${nextValue.toFixed(0)}%`;
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
    let note = 'Saldo abierto dentro de la cartera del comprador.';
    let tone = 'pending';

    if (transferState === 'transferred' && transferredTo === 'income') {
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
        title: fromPending ? 'Cobro registrado' : 'Ingreso aparte',
        label: fromPending ? 'Pago' : 'Ingreso aparte',
        amount,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: String(row?.categoria || '').trim(),
        note: isReview
            ? 'Este ingreso aún está pendiente por revisar.'
            : (fromPending
                ? 'Entrada confirmada como cobro del saldo.'
                : 'Entrada relacionada con el comprador, pero separada de la cartera.'),
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
        title: fromPending ? 'Pérdida registrada' : 'Pérdida por revisar',
        label: fromPending ? 'Pérdida' : 'Por revisar',
        amount,
        fecha: row?.fecha || '',
        created_at: row?.created_at || '',
        concept: String(row?.concepto || '').trim(),
        meta: String(row?.causa || '').trim(),
        note: isReview
            ? (matchStatus === 'legacy_unclassified'
                ? 'Hay un registro antiguo que todavía necesita ordenarse.'
                : 'Esta pérdida aún necesita confirmación final.')
            : 'Salida cerrada de la cartera.',
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

function renderBuyerSummary(buyerRow) {
    const reviewTotal = getReviewTotal(buyerRow);
    const buyerStatus = resolveBuyerStatus(buyerRow);
    const progress = buildProgressBreakdown(buyerRow);
    const reviewCopy = reviewTotal > 0
        ? `Hay ${formatMoney(reviewTotal)} por revisar en este comprador`
        : buyerStatus.copy;

    return `
        <section class="cartera-viva-detail__summary">
            <header class="cartera-viva-detail__summary-head">
                <div class="cartera-viva-detail__identity">
                    <h2 class="cartera-viva-detail__title">${escapeHtml(buyerRow?.display_name || 'Comprador no encontrado')}</h2>
                    <p class="cartera-viva-detail__subtitle">${escapeHtml(reviewCopy)}</p>
                </div>
                <div class="cartera-viva-card__badges">
                    <span class="cartera-viva-badge cartera-viva-badge--${buyerStatus.tone}">${escapeHtml(buyerStatus.label)}</span>
                    ${buyerRow?.requires_review ? '<span class="cartera-viva-badge cartera-viva-badge--review">Por revisar</span>' : ''}
                </div>
            </header>

            <section class="cartera-viva-progress cartera-viva-progress--large">
                <div class="cartera-viva-progress__head">
                    <span class="cartera-viva-progress__label">Cobrado de ${formatMoney(progress.base)}</span>
                    <span class="cartera-viva-progress__value">${formatPercent(progress.paidPercent)}</span>
                </div>
                <div class="cartera-viva-progress__track">
                    ${progress.paidShare > 0 ? `<span class="cartera-viva-progress__segment is-paid" style="width:${progress.paidShare}%"></span>` : ''}
                    ${progress.pendingShare > 0 ? `<span class="cartera-viva-progress__segment is-pending" style="width:${progress.pendingShare}%"></span>` : ''}
                    ${progress.lossShare > 0 ? `<span class="cartera-viva-progress__segment is-loss" style="width:${progress.lossShare}%"></span>` : ''}
                </div>
                <div class="cartera-viva-progress__legend">
                    <span>${formatMoney(buyerRow?.paid_total || 0)} cobrados</span>
                    <span>${Number(buyerRow?.pending_total || 0) > 0 ? `Faltan ${formatMoney(buyerRow?.pending_total || 0)}` : 'Sin saldo pendiente'}</span>
                </div>
            </section>

            <div class="cartera-viva-insight-strip cartera-viva-insight-strip--detail">
                ${renderDetailInsight('Fiado', formatMoney(buyerRow?.credited_total))}
                ${renderDetailInsight('Cobrado', formatMoney(buyerRow?.paid_total))}
                ${renderDetailInsight('Falta', formatMoney(buyerRow?.pending_total))}
                ${renderDetailInsight('Cumplimiento', formatPercent(getPaidPercent(buyerRow)))}
            </div>
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
    const exportPending = Boolean(options.exportPending);
    const exportMessage = String(options.exportMessage || '').trim();
    const exportTone = String(options.exportTone || '').trim().toLowerCase();

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
    } else {
        bodyContent = '<div class="cartera-viva-detail__timeline" data-cartera-detail-timeline></div>';
    }

    root.innerHTML = `
        <section class="cartera-viva-view cartera-viva-view--detail" aria-label="Historial contextual por comprador">
            <div class="cartera-viva-detail__toolbar">
                <button type="button" class="cartera-viva-back" data-cartera-detail-back>Volver</button>
                <div class="cartera-viva-detail__toolbar-actions">
                    <button type="button" class="cartera-viva-refresh" data-cartera-detail-refresh>Actualizar</button>
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

            ${renderBuyerSummary(buyerRow)}

            <section class="cartera-viva-detail__body">
                <header class="cartera-viva-detail__body-head">
                    <div>
                        <p class="cartera-viva-view__eyebrow">Historial</p>
                        <h3 class="cartera-viva-detail__section-title">Movimientos del comprador</h3>
                    </div>
                    <p class="cartera-viva-detail__body-copy">
                        Fiados, cobros, pérdidas e ingresos relacionados con este comprador.
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

    root.querySelector('[data-cartera-detail-export]')?.addEventListener('click', () => {
        options.onExport?.();
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
