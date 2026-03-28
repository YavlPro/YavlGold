import { supabase } from '../assets/js/config/supabase-config.js';
import { fetchBuyerPortfolioSummary } from './agro-cartera-viva.js';
import { downloadBuyerPortfolioExport } from './agro-cartera-viva-export.js';
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
        emptyCopy: 'Aquí ves a quienes todavía tienen saldo pendiente.'
    }),
    pagados: Object.freeze({
        label: 'Pagados',
        emptyTitle: 'No hay compradores al día',
        emptyCopy: 'Aquí aparecen los compradores que ya cerraron su saldo.'
    }),
    perdidos: Object.freeze({
        label: 'Pérdidas',
        emptyTitle: 'No hay pérdidas registradas',
        emptyCopy: 'Aquí solo quedan los casos cerrados como pérdida.'
    })
});

const CATEGORY_ORDER = Object.freeze(['fiados', 'pagados', 'perdidos']);

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
let detailExportPending = false;
let detailExportMessage = '';
let detailExportTone = '';

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
    if (!Number.isFinite(nextValue)) return 'Sin lectura';
    return `${nextValue.toFixed(0)}%`;
}

function formatCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count) || count <= 0) return '0';
    return new Intl.NumberFormat('es-VE').format(Math.trunc(count));
}

function clampPercent(value) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return 0;
    return Math.min(100, Math.max(0, nextValue));
}

function getReviewTotal(row) {
    return Number(row?.review_required_total || 0) + Number(row?.legacy_unclassified_total || 0);
}

function getProgressBase(row) {
    const credited = Number(row?.credited_total || 0);
    const combined = Number(row?.paid_total || 0) + Number(row?.pending_total || 0) + Number(row?.loss_total || 0);
    return Math.max(credited, combined, 0);
}

function getPaidPercent(row) {
    const compliance = Number(row?.compliance_percent);
    if (Number.isFinite(compliance)) return clampPercent(compliance);

    const base = getProgressBase(row);
    if (base <= 0) return 0;
    return clampPercent((Number(row?.paid_total || 0) / base) * 100);
}

function getProgressBreakdown(row) {
    const base = Math.max(getProgressBase(row), 1);
    const paid = Math.max(0, Number(row?.paid_total || 0));
    const pending = Math.max(0, Number(row?.pending_total || 0));
    const loss = Math.max(0, Number(row?.loss_total || 0));

    const paidShare = clampPercent((paid / base) * 100);
    const lossShare = clampPercent((loss / base) * 100);
    const pendingShare = clampPercent(Math.max(0, 100 - paidShare - lossShare));

    return {
        base,
        paidShare,
        lossShare,
        pendingShare,
        paidPercent: getPaidPercent(row)
    };
}

function resolveVisibleCategory(row) {
    const pending = Number(row?.pending_total || 0);
    const paid = Number(row?.paid_total || 0);
    const loss = Number(row?.loss_total || 0);

    if (pending > 0) return 'fiados';
    if (paid > 0) return 'pagados';
    if (loss > 0) return 'perdidos';
    return 'fiados';
}

function resolveBuyerStatus(row) {
    const pending = Number(row?.pending_total || 0);
    const paid = Number(row?.paid_total || 0);
    const loss = Number(row?.loss_total || 0);
    const review = getReviewTotal(row);
    const paidPercent = getPaidPercent(row);

    if (pending > 0) {
        if (paid > 0 && paidPercent >= 65) {
            return {
                tone: 'fiado',
                label: 'Cobro avanzado',
                detail: `${formatMoney(pending)} por cobrar · ${formatMoney(paid)} ya cobrados`
            };
        }

        if (paid > 0) {
            return {
                tone: 'fiado',
                label: 'Fiado activo',
                detail: `${formatMoney(pending)} por cobrar · sigue abonando`
            };
        }

        return {
            tone: 'fiado',
            label: 'Fiado activo',
            detail: `${formatMoney(pending)} por cobrar${review > 0 ? ' · con revisión pendiente' : ''}`
        };
    }

    if (paid > 0) {
        return {
            tone: 'pagado',
            label: 'Pagado',
            detail: loss > 0
                ? `Saldo cobrado con ${formatMoney(loss)} cerrados como pérdida`
                : 'Cuenta cerrada sin saldo pendiente'
        };
    }

    if (loss > 0) {
        return {
            tone: 'perdido',
            label: 'Pérdida',
            detail: `${formatMoney(loss)} cerrados fuera de cartera`
        };
    }

    return {
        tone: review > 0 ? 'review' : 'seguimiento',
        label: review > 0 ? 'Por revisar' : 'Seguimiento',
        detail: review > 0
            ? `${formatMoney(review)} pendientes por ordenar`
            : 'Sin lectura suficiente todavía'
    };
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
        .filter((row) => resolveVisibleCategory(row) === category)
        .sort(comparePortfolioRows);
}

function getCategoryCounts(rows) {
    return {
        fiados: filterRowsByCategory(rows, 'fiados').length,
        pagados: filterRowsByCategory(rows, 'pagados').length,
        perdidos: filterRowsByCategory(rows, 'perdidos').length
    };
}

function sumField(rows, fieldName) {
    return (Array.isArray(rows) ? rows : []).reduce((total, row) => total + Number(row?.[fieldName] || 0), 0);
}

function renderHeroSignal(rows) {
    const base = Math.max(
        sumField(rows, 'credited_total'),
        sumField(rows, 'paid_total') + sumField(rows, 'pending_total') + sumField(rows, 'loss_total'),
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

function resolveCategoryHero(rows, category) {
    const count = rows.length;
    const pending = sumField(rows, 'pending_total');
    const paid = sumField(rows, 'paid_total');
    const loss = sumField(rows, 'loss_total');
    const review = rows.reduce((total, row) => total + getReviewTotal(row), 0);

    if (category === 'pagados') {
        return {
            label: 'Cobrado en esta vista',
            amount: formatMoney(paid),
            copy: `${formatCount(count)} comprador${count === 1 ? '' : 'es'} con saldo cerrado`,
            stats: [
                { label: 'Compradores', value: formatCount(count) },
                { label: 'Fiado que pasó por cartera', value: formatMoney(sumField(rows, 'credited_total')) },
                { label: 'Por revisar', value: formatMoney(review) }
            ]
        };
    }

    if (category === 'perdidos') {
        return {
            label: 'Saldo cerrado como pérdida',
            amount: formatMoney(loss),
            copy: `${formatCount(count)} caso${count === 1 ? '' : 's'} con salida registrada`,
            stats: [
                { label: 'Casos', value: formatCount(count) },
                { label: 'Cobrado antes del cierre', value: formatMoney(paid) },
                { label: 'Por revisar', value: formatMoney(review) }
            ]
        };
    }

    return {
        label: 'Te deben hoy',
        amount: formatMoney(pending),
        copy: `${formatCount(count)} comprador${count === 1 ? '' : 'es'} con saldo activo`,
        stats: [
            { label: 'Compradores', value: formatCount(count) },
            { label: 'Ya cobrado', value: formatMoney(paid) },
            { label: 'Por revisar', value: formatMoney(review) }
        ]
    };
}

function renderHeaderHero(filteredRows) {
    const hero = resolveCategoryHero(filteredRows, activeCategory);
    return `
        <div class="cartera-viva-hero">
            <div class="cartera-viva-hero__main">
                <p class="cartera-viva-hero__label">${hero.label}</p>
                <strong class="cartera-viva-hero__amount">${hero.amount}</strong>
                <p class="cartera-viva-hero__copy">${hero.copy}</p>
            </div>
            <div class="cartera-viva-hero__aside">
                ${renderHeroSignal(filteredRows)}
                <div class="cartera-viva-hero__stats">
                    ${hero.stats.map((stat) => `
                        <div class="cartera-viva-hero__stat">
                            <span class="cartera-viva-hero__stat-label">${stat.label}</span>
                            <strong class="cartera-viva-hero__stat-value">${stat.value}</strong>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderCardSignal(row) {
    const paid = Math.max(4, Math.round(clampPercent(getPaidPercent(row)) / 7) + 4);
    const pending = Math.max(4, Math.round(clampPercent((Number(row?.pending_total || 0) / Math.max(getProgressBase(row), 1)) * 100) / 7) + 4);
    const thirdMetric = Math.max(Number(row?.loss_total || 0), getReviewTotal(row));
    const third = Math.max(4, Math.round(clampPercent((thirdMetric / Math.max(getProgressBase(row), 1)) * 100) / 7) + 4);
    const thirdClass = Number(row?.loss_total || 0) > 0 ? 'is-loss' : 'is-review';

    return `
        <svg class="cartera-viva-card__signal" viewBox="0 0 28 18" role="img" aria-label="Señal rápida del comprador">
            <rect x="1" y="${18 - paid}" width="6" height="${paid}" rx="2"></rect>
            <rect x="11" y="${18 - pending}" width="6" height="${pending}" rx="2"></rect>
            <rect class="${thirdClass}" x="21" y="${18 - third}" width="6" height="${third}" rx="2"></rect>
        </svg>
    `;
}

function renderSupportChips(row) {
    const chips = [];
    const review = getReviewTotal(row);

    if (Number(row?.loss_total || 0) > 0) {
        chips.push(`<span class="cartera-viva-chip is-loss">Pérdida ${formatMoney(row.loss_total)}</span>`);
    }
    if (review > 0) {
        chips.push(`<span class="cartera-viva-chip is-review">Por revisar ${formatMoney(review)}</span>`);
    }
    if (Number(row?.non_debt_income_total || 0) > 0) {
        chips.push(`<span class="cartera-viva-chip">Ingreso aparte ${formatMoney(row.non_debt_income_total)}</span>`);
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
    const breakdown = getProgressBreakdown(row);
    const pending = Number(row?.pending_total || 0);
    const loss = Number(row?.loss_total || 0);
    const base = Math.max(breakdown.base, 0);
    const label = base > 0 ? `Cobrado de ${formatMoney(base)}` : 'Sin base para medir';
    let footer = 'Sin saldo pendiente';

    if (pending > 0) {
        footer = `Faltan ${formatMoney(pending)}`;
    } else if (loss > 0) {
        footer = `${formatMoney(loss)} cerrados como pérdida`;
    }

    return `
        <section class="cartera-viva-progress${large ? ' cartera-viva-progress--large' : ''}">
            <div class="cartera-viva-progress__head">
                <span class="cartera-viva-progress__label">${label}</span>
                <span class="cartera-viva-progress__value">${formatPercent(breakdown.paidPercent)}</span>
            </div>
            <div class="cartera-viva-progress__track">
                ${breakdown.paidShare > 0 ? `<span class="cartera-viva-progress__segment is-paid" style="width:${breakdown.paidShare}%"></span>` : ''}
                ${breakdown.pendingShare > 0 ? `<span class="cartera-viva-progress__segment is-pending" style="width:${breakdown.pendingShare}%"></span>` : ''}
                ${breakdown.lossShare > 0 ? `<span class="cartera-viva-progress__segment is-loss" style="width:${breakdown.lossShare}%"></span>` : ''}
            </div>
            <div class="cartera-viva-progress__legend">
                <span>${formatMoney(row?.paid_total || 0)} cobrados</span>
                <span>${footer}</span>
            </div>
        </section>
    `;
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

function renderPortfolioCards(filteredRows) {
    return filteredRows.map((row) => {
        const status = resolveBuyerStatus(row);
        const thirdMetricLabel = Number(row?.loss_total || 0) > 0 && Number(row?.pending_total || 0) <= 0
            ? 'Pérdida'
            : 'Falta';
        const thirdMetricValue = thirdMetricLabel === 'Pérdida'
            ? formatMoney(row?.loss_total || 0)
            : formatMoney(row?.pending_total || 0);
        return `
            <article class="cartera-viva-card${row?.requires_review ? ' is-review' : ''}">
                <header class="cartera-viva-card__head">
                    <div class="cartera-viva-card__identity">
                        <h3 class="cartera-viva-card__title">${escapeHtml(row?.display_name || 'Comprador sin nombre')}</h3>
                        <p class="cartera-viva-card__subtitle">${status.detail}</p>
                    </div>
                    <div class="cartera-viva-card__head-side">
                        ${renderCardSignal(row)}
                        <span class="cartera-viva-badge cartera-viva-badge--${status.tone}">${status.label}</span>
                    </div>
                </header>

                ${renderProgressBlock(row)}

                <dl class="cartera-viva-card__metrics">
                    <div class="cartera-viva-card__metric">
                        <dt>Fiado</dt>
                        <dd>${formatMoney(row?.credited_total)}</dd>
                    </div>
                    <div class="cartera-viva-card__metric">
                        <dt>Cobrado</dt>
                        <dd>${formatMoney(row?.paid_total)}</dd>
                    </div>
                    <div class="cartera-viva-card__metric">
                        <dt>${thirdMetricLabel}</dt>
                        <dd>${thirdMetricValue}</dd>
                    </div>
                </dl>

                ${renderSupportChips(row)}

                <div class="cartera-viva-card__footer">
                    <span class="cartera-viva-card__footer-copy">Cumplimiento ${formatPercent(getPaidPercent(row))}</span>
                    <button
                        type="button"
                        class="cartera-viva-detail-link"
                        data-cartera-open-history="${escapeHtml(row?.buyer_id || '')}">
                        Ver detalle
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
            <h3 class="cartera-viva-empty__title">Cargando cartera</h3>
            <p class="cartera-viva-empty__copy">Ordenando compradores y saldos visibles.</p>
        </div>
    `;
}

function renderErrorState(message) {
    return renderEmptyState({
        title: 'No se pudo cargar Cartera Viva',
        copy: message || 'La vista no pudo leer los saldos de compradores. Intenta actualizar.'
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
            title: 'Todavía no hay compradores en cartera',
            copy: 'Registra fiados o movimientos para empezar a ver compradores aquí.',
            action: 'new-record'
        });
    } else if (!hasReliableMetrics) {
        bodyContent = renderEmptyState({
            title: 'Todavía no hay lectura suficiente',
            copy: 'Hay movimientos por ordenar, pero aún no alcanzan para mostrar una cartera clara.'
        });
    } else if (filteredRows.length <= 0) {
        const categoryMeta = CATEGORY_META[activeCategory];
        bodyContent = renderEmptyState({
            title: categoryMeta.emptyTitle,
            copy: categoryMeta.emptyCopy
        });
    } else {
        bodyContent = `
            <div class="cartera-viva-grid">
                ${renderPortfolioCards(filteredRows)}
            </div>
        `;
    }

    root.innerHTML = `
        <section class="cartera-viva-view" aria-label="Cartera de compradores">
            <header class="cartera-viva-view__header">
                <div class="cartera-viva-view__headline">
                    <div class="cartera-viva-view__copy">
                        <p class="cartera-viva-view__eyebrow">Cartera Viva</p>
                        <h2 class="cartera-viva-view__title">Cartera de compradores</h2>
                        <p class="cartera-viva-view__subtitle">Una sola vista a la vez, ordenada por el saldo que todavía importa.</p>
                    </div>
                    <div class="cartera-viva-view__actions">
                        <button type="button" class="cartera-viva-refresh" data-cartera-refresh>
                            Actualizar
                        </button>
                    </div>
                </div>
                ${renderHeaderHero(filteredRows)}
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
            exportPending: detailExportPending,
            exportMessage: detailExportMessage,
            exportTone: detailExportTone,
            onBack: () => {
                resetDetailState();
                renderView();
            },
            onRefresh: () => {
                if (!selectedBuyerId) return;
                loadBuyerDetail(selectedBuyerId);
            },
            onExport: () => {
                exportBuyerDetail();
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
        lastErrorMessage = String(error?.message || 'Error leyendo la cartera de compradores.');
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
    resetDetailExportState();
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

function setDetailExportState(message = '', tone = '') {
    detailExportMessage = String(message || '').trim();
    detailExportTone = String(tone || '').trim().toLowerCase();
}

async function exportBuyerDetail() {
    const buyerRow = getSelectedBuyerRow();
    if (!buyerRow) {
        setDetailExportState('No se encontro el comprador activo para exportar.', 'error');
        renderView();
        return;
    }

    if (detailLoading) {
        setDetailExportState('Espera a que termine de cargar el historial antes de exportar.', 'error');
        renderView();
        return;
    }

    if (detailErrorMessage) {
        setDetailExportState('Actualiza el historial antes de exportar este comprador.', 'error');
        renderView();
        return;
    }

    detailExportPending = true;
    setDetailExportState('', '');
    renderView();

    try {
        const fileName = downloadBuyerPortfolioExport({
            buyerRow,
            historyRows: detailRows
        });
        setDetailExportState(`Exportado: ${fileName}`, 'success');
    } catch (error) {
        console.error('[CarteraViva] buyer export failed:', error?.message || error);
        setDetailExportState(String(error?.message || 'No se pudo generar la exportación del comprador.'), 'error');
    } finally {
        detailExportPending = false;
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
    resetDetailExportState();
}

function resetDetailExportState() {
    detailExportPending = false;
    detailExportMessage = '';
    detailExportTone = '';
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
