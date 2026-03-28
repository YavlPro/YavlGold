import { supabase } from '../assets/js/config/supabase-config.js';
import { fetchBuyerPortfolioSummary } from './agro-cartera-viva.js';
import {
    fetchBuyerHistoryTimeline,
    renderBuyerHistoryDetail
} from './agro-cartera-viva-detail.js';

const CARTERA_VIVA_VIEW = 'cartera-viva';
const CARTERA_VIVA_ROOT_ID = 'agro-cartera-viva-root';
const CARTERA_VIVA_CATEGORY_KEY = 'YG_AGRO_CARTERA_VIVA_CATEGORY_V1';

const CATEGORY_META = Object.freeze({
    fiados: Object.freeze({
        label: 'Fiados',
        emptyTitle: 'No hay fiados activos',
        emptyCopy: 'Esta categoria solo muestra compradores con estado global Fiado.'
    }),
    pagados: Object.freeze({
        label: 'Pagados',
        emptyTitle: 'No hay compradores totalmente pagados',
        emptyCopy: 'Esta categoria muestra compradores sin pendiente activo y sin revision abierta.'
    }),
    perdidos: Object.freeze({
        label: 'Perdidos',
        emptyTitle: 'No hay perdidas buyer-centric para mostrar',
        emptyCopy: 'Esta categoria solo muestra compradores con perdida confiable registrada.'
    }),
    mixto: Object.freeze({
        label: 'Mixto',
        emptyTitle: 'No hay balances mixtos en este momento',
        emptyCopy: 'Aqui aparecen compradores con deuda activa combinada con pagos, perdidas o revision.'
    })
});

const CATEGORY_ORDER = Object.freeze(['fiados', 'pagados', 'perdidos', 'mixto']);

let initialized = false;
let rootNode = null;
let activeCategory = readStoredCategory();
let summaryRows = [];
let loading = false;
let lastErrorMessage = '';
let selectedBuyerId = '';
let detailRows = [];
let detailLoading = false;
let detailErrorMessage = '';

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

function normalizeCategory(category) {
    const token = String(category || '').trim().toLowerCase();
    return CATEGORY_ORDER.includes(token) ? token : 'fiados';
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

function formatCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count) || count <= 0) return '0';
    return new Intl.NumberFormat('es-VE').format(Math.trunc(count));
}

function comparePortfolioRows(a, b) {
    const pendingDiff = Number(b?.pending_total || 0) - Number(a?.pending_total || 0);
    if (pendingDiff !== 0) return pendingDiff;

    const reviewDiff = Number(b?.review_required_total || 0) - Number(a?.review_required_total || 0);
    if (reviewDiff !== 0) return reviewDiff;

    return String(a?.display_name || '').localeCompare(String(b?.display_name || ''), 'es');
}

function filterRowsByCategory(rows, category) {
    const safeRows = Array.isArray(rows) ? rows.slice() : [];
    return safeRows
        .filter((row) => {
            if (category === 'fiados') return row?.global_status === 'Fiado';
            if (category === 'pagados') return row?.global_status === 'Pagado';
            if (category === 'perdidos') return Number(row?.loss_total || 0) > 0;
            if (category === 'mixto') return row?.global_status === 'Mixto';
            return true;
        })
        .sort(comparePortfolioRows);
}

function getCategoryCounts(rows) {
    return {
        fiados: filterRowsByCategory(rows, 'fiados').length,
        pagados: filterRowsByCategory(rows, 'pagados').length,
        perdidos: filterRowsByCategory(rows, 'perdidos').length,
        mixto: filterRowsByCategory(rows, 'mixto').length
    };
}

function sumField(rows, fieldName) {
    return (Array.isArray(rows) ? rows : []).reduce((total, row) => total + (Number(row?.[fieldName] || 0)), 0);
}

function resolveContextMetric(row, category) {
    const paidTotal = Number(row?.paid_total || 0);
    const pendingTotal = Number(row?.pending_total || 0);
    const lossTotal = Number(row?.loss_total || 0);
    const reviewTotal = Number(row?.review_required_total || 0) + Number(row?.legacy_unclassified_total || 0);

    if (category === 'pagados') {
        return {
            label: 'Pagado confirmado',
            value: formatMoney(paidTotal),
            hint: Number.isFinite(row?.compliance_percent)
                ? `Cumplimiento ${formatPercent(row.compliance_percent)}`
                : 'Sin porcentaje confiable'
        };
    }

    if (category === 'perdidos') {
        return {
            label: 'Perdida registrada',
            value: formatMoney(lossTotal),
            hint: reviewTotal > 0
                ? `Revision pendiente ${formatMoney(reviewTotal)}`
                : 'Salida registrada del eje deuda'
        };
    }

    if (category === 'mixto') {
        return {
            label: 'Balance mixto',
            value: formatMoney(pendingTotal),
            hint: `${formatMoney(paidTotal)} pagado · ${formatMoney(lossTotal)} perdido`
        };
    }

    return {
        label: 'Pendiente activo',
        value: formatMoney(pendingTotal),
        hint: paidTotal > 0
            ? `${formatMoney(paidTotal)} ya cobrado`
            : 'Sin pagos confirmados todavia'
    };
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

function renderInsightStrip(filteredRows) {
    return `
        <div class="cartera-viva-insight-strip" aria-label="Resumen de la categoria activa">
            <article class="cartera-viva-insight">
                <span class="cartera-viva-insight__label">Compradores</span>
                <strong class="cartera-viva-insight__value">${formatCount(filteredRows.length)}</strong>
            </article>
            <article class="cartera-viva-insight">
                <span class="cartera-viva-insight__label">Pendiente activo</span>
                <strong class="cartera-viva-insight__value">${formatMoney(sumField(filteredRows, 'pending_total'))}</strong>
            </article>
            <article class="cartera-viva-insight">
                <span class="cartera-viva-insight__label">Pagado confiable</span>
                <strong class="cartera-viva-insight__value">${formatMoney(sumField(filteredRows, 'paid_total'))}</strong>
            </article>
            <article class="cartera-viva-insight">
                <span class="cartera-viva-insight__label">En revision</span>
                <strong class="cartera-viva-insight__value">${formatMoney(sumField(filteredRows, 'review_required_total') + sumField(filteredRows, 'legacy_unclassified_total'))}</strong>
            </article>
        </div>
    `;
}

function renderReviewLine(row) {
    const reviewRequired = Number(row?.review_required_total || 0);
    const legacyUnclassified = Number(row?.legacy_unclassified_total || 0);
    const parts = [];

    if (reviewRequired > 0) {
        parts.push(`Revision ${formatMoney(reviewRequired)}`);
    }
    if (legacyUnclassified > 0) {
        parts.push(`Legacy ambiguo ${formatMoney(legacyUnclassified)}`);
    }
    if (Number(row?.balance_gap_total || 0) !== 0) {
        parts.push(`Gap ${formatMoney(row.balance_gap_total)}`);
    }

    if (parts.length === 0) return '';

    return `
        <div class="cartera-viva-card__review">
            <span class="cartera-viva-card__review-label">Revision</span>
            <span class="cartera-viva-card__review-copy">${parts.join(' · ')}</span>
        </div>
    `;
}

function renderSecondaryLine(row) {
    const parts = [];

    if (Number(row?.loss_total || 0) > 0) {
        parts.push(`Perdida ${formatMoney(row.loss_total)}`);
    }
    if (Number(row?.transferred_total || 0) > 0) {
        parts.push(`Transferido ${formatMoney(row.transferred_total)}`);
    }
    if (Number(row?.non_debt_income_total || 0) > 0) {
        parts.push(`Fuera de deuda ${formatMoney(row.non_debt_income_total)}`);
    }
    if (Number(row?.pending_total || 0) <= 0) {
        parts.push('Sin pendiente activo');
    }

    if (parts.length === 0) return '';
    return `<p class="cartera-viva-card__secondary">${parts.join(' · ')}</p>`;
}

function renderPortfolioCards(filteredRows) {
    return filteredRows.map((row) => {
        const context = resolveContextMetric(row, activeCategory);
        const reviewBadge = row?.requires_review ? '<span class="cartera-viva-badge cartera-viva-badge--review">Revision</span>' : '';
        const statusClass = String(row?.global_status || 'Mixto').toLowerCase();
        return `
            <article class="cartera-viva-card${row?.requires_review ? ' is-review' : ''}">
                <header class="cartera-viva-card__head">
                    <div class="cartera-viva-card__identity">
                        <p class="cartera-viva-card__eyebrow">Comprador canonico</p>
                        <h3 class="cartera-viva-card__title">${escapeHtml(row?.display_name || 'Comprador sin nombre')}</h3>
                        <p class="cartera-viva-card__key">${escapeHtml(row?.group_key || 'sin-group-key')}</p>
                    </div>
                    <div class="cartera-viva-card__badges">
                        <span class="cartera-viva-badge cartera-viva-badge--${escapeHtml(statusClass)}">${escapeHtml(row?.global_status || 'Mixto')}</span>
                        ${reviewBadge}
                    </div>
                </header>

                <section class="cartera-viva-card__context">
                    <p class="cartera-viva-card__context-label">${context.label}</p>
                    <strong class="cartera-viva-card__context-value">${context.value}</strong>
                    <p class="cartera-viva-card__context-copy">${context.hint}</p>
                </section>

                <dl class="cartera-viva-card__metrics">
                    <div class="cartera-viva-card__metric">
                        <dt>Fiado total</dt>
                        <dd>${formatMoney(row?.credited_total)}</dd>
                    </div>
                    <div class="cartera-viva-card__metric">
                        <dt>Pagado</dt>
                        <dd>${formatMoney(row?.paid_total)}</dd>
                    </div>
                    <div class="cartera-viva-card__metric">
                        <dt>Pendiente</dt>
                        <dd>${formatMoney(row?.pending_total)}</dd>
                    </div>
                    <div class="cartera-viva-card__metric">
                        <dt>Cumplimiento</dt>
                        <dd>${formatPercent(row?.compliance_percent)}</dd>
                    </div>
                </dl>

                ${renderSecondaryLine(row)}
                ${renderReviewLine(row)}

                <div class="cartera-viva-card__footer">
                    <button
                        type="button"
                        class="cartera-viva-detail-link"
                        data-cartera-open-history="${escapeHtml(row?.buyer_id || '')}">
                        Ver historial
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

function renderEmptyState(config = {}) {
    const title = escapeHtml(config.title || 'Sin datos para mostrar');
    const copy = escapeHtml(config.copy || 'Cartera Viva todavia no tiene una lectura disponible para esta vista.');
    const action = config.action === 'new-record'
        ? `
            <button type="button" class="cartera-viva-empty__action" data-agro-action="new-record">
                Registrar movimiento
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
            <h3 class="cartera-viva-empty__title">Cargando Cartera Viva</h3>
            <p class="cartera-viva-empty__copy">Leyendo la fuente buyer-centric por comprador.</p>
        </div>
    `;
}

function renderErrorState(message) {
    return renderEmptyState({
        title: 'No se pudo cargar Cartera Viva',
        copy: message || 'La vista no pudo leer la fuente buyer-centric. Intenta actualizar la vista.'
    });
}

function getSelectedBuyerRow() {
    if (!selectedBuyerId) return null;
    return summaryRows.find((row) => String(row?.buyer_id || '') === selectedBuyerId) || null;
}

function renderListView(root) {
    const categoryCounts = getCategoryCounts(summaryRows);
    const filteredRows = filterRowsByCategory(summaryRows, activeCategory);
    const hasReliableMetrics = summaryRows.some((row) =>
        Number(row?.credited_total || 0) > 0
        || Number(row?.paid_total || 0) > 0
        || Number(row?.loss_total || 0) > 0
        || Number(row?.pending_total || 0) > 0
    );

    let bodyContent = '';
    if (loading) {
        bodyContent = renderLoadingState();
    } else if (lastErrorMessage) {
        bodyContent = renderErrorState(lastErrorMessage);
    } else if (summaryRows.length <= 0) {
        bodyContent = renderEmptyState({
            title: 'Cartera Viva aun no tiene compradores',
            copy: 'Registra fiados o movimientos buyer-centric para empezar a leer compradores unicos.',
            action: 'new-record'
        });
    } else if (!hasReliableMetrics) {
        bodyContent = renderEmptyState({
            title: 'Solo hay metricas en revision',
            copy: 'La base buyer-centric existe, pero todavia no hay totales confiables suficientes para esta lectura.'
        });
    } else if (filteredRows.length <= 0) {
        const categoryMeta = CATEGORY_META[activeCategory];
        bodyContent = renderEmptyState({
            title: categoryMeta.emptyTitle,
            copy: categoryMeta.emptyCopy
        });
    } else {
        bodyContent = `
            ${renderInsightStrip(filteredRows)}
            <div class="cartera-viva-grid">
                ${renderPortfolioCards(filteredRows)}
            </div>
        `;
    }

    root.innerHTML = `
        <section class="cartera-viva-view" aria-label="Cartera Viva buyer-centric">
            <header class="cartera-viva-view__header">
                <div class="cartera-viva-view__copy">
                    <p class="cartera-viva-view__eyebrow">Cartera Viva</p>
                    <h2 class="cartera-viva-view__title">Compradores buyer-centric</h2>
                    <p class="cartera-viva-view__subtitle">Una sola categoria visible a la vez. Orden base: mayor pendiente primero.</p>
                </div>
                <div class="cartera-viva-view__actions">
                    <span class="cartera-viva-view__meta">Fuente: buyer summary</span>
                    <button type="button" class="cartera-viva-refresh" data-cartera-refresh>
                        Actualizar
                    </button>
                </div>
            </header>

            <div class="cartera-viva-category-bar" role="group" aria-label="Categorias de Cartera Viva">
                ${renderCategoryControls(categoryCounts)}
            </div>

            <div class="cartera-viva-view__body">
                ${bodyContent}
            </div>
        </section>
    `;
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
            onBack: () => {
                resetDetailState();
                renderView();
            },
            onRefresh: () => {
                if (!selectedBuyerId) return;
                loadBuyerDetail(selectedBuyerId);
            }
        });
        return;
    }

    renderListView(root);
    bindListViewEvents(root);
}

async function loadSummary() {
    loading = true;
    lastErrorMessage = '';
    renderView();

    try {
        summaryRows = await fetchBuyerPortfolioSummary(supabase);
    } catch (error) {
        console.error('[CarteraViva] summary load failed:', error?.message || error);
        lastErrorMessage = String(error?.message || 'Error leyendo el summary buyer-centric.');
        summaryRows = [];
    } finally {
        loading = false;
        renderView();
    }
}

async function loadBuyerDetail(buyerId) {
    selectedBuyerId = String(buyerId || '').trim();
    detailLoading = true;
    detailErrorMessage = '';
    detailRows = [];
    renderView();

    try {
        const buyerRow = getSelectedBuyerRow();
        detailRows = await fetchBuyerHistoryTimeline(supabase, buyerRow);
    } catch (error) {
        console.error('[CarteraViva] buyer detail load failed:', error?.message || error);
        detailErrorMessage = String(error?.message || 'Error leyendo el historial contextual del comprador.');
        detailRows = [];
    } finally {
        detailLoading = false;
        renderView();
    }
}

function bindListViewEvents(root) {
    root.querySelectorAll('[data-cartera-category]').forEach((button) => {
        button.addEventListener('click', () => {
            const nextCategory = normalizeCategory(button.dataset.carteraCategory);
            if (nextCategory === activeCategory) return;
            activeCategory = nextCategory;
            writeStoredCategory(activeCategory);
            renderView();
        });
    });

    root.querySelector('[data-cartera-refresh]')?.addEventListener('click', () => {
        loadSummary();
    });

    root.querySelectorAll('[data-cartera-open-history]').forEach((button) => {
        button.addEventListener('click', () => {
            const buyerId = String(button.dataset.carteraOpenHistory || '').trim();
            if (!buyerId) return;
            loadBuyerDetail(buyerId);
        });
    });
}

function resetDetailState() {
    selectedBuyerId = '';
    detailRows = [];
    detailLoading = false;
    detailErrorMessage = '';
}

function handleShellViewChanged(event) {
    const nextView = String(event?.detail?.view || '').trim().toLowerCase();
    if (nextView !== CARTERA_VIVA_VIEW) return;

    if (!summaryRows.length) {
        loadSummary();
        return;
    }

    renderView();
}

export function initAgroCarteraVivaView() {
    if (initialized) {
        if (String(document.body?.dataset?.agroActiveView || '').trim().toLowerCase() === CARTERA_VIVA_VIEW) {
            loadSummary();
        }
        return;
    }

    initialized = true;
    getRootNode();
    renderView();
    window.addEventListener('agro:shell:view-changed', handleShellViewChanged);

    if (String(document.body?.dataset?.agroActiveView || '').trim().toLowerCase() === CARTERA_VIVA_VIEW) {
        loadSummary();
    }
}
