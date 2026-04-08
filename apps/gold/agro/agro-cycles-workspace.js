const COMPARE_ROOT_ID = 'agro-cycle-compare-root';
const SELECT_PRIMARY_ID = 'agro-cycle-compare-a';
const SELECT_SECONDARY_ID = 'agro-cycle-compare-b';

const state = {
    initialized: false,
    snapshot: createEmptySnapshot(),
    primaryId: '',
    secondaryId: ''
};

const METRICS = Object.freeze([
    {
        key: 'estado',
        label: 'Estado del cultivo',
        kind: 'text',
        helper: 'Lectura agricola del ciclo'
    },
    {
        key: 'progreso',
        label: 'Progreso',
        kind: 'percent',
        helper: 'Avance acumulado del ciclo',
        highlight: true
    },
    {
        key: 'duracion',
        label: 'Duracion prevista',
        kind: 'days',
        helper: 'Dias totales estimados'
    },
    {
        key: 'area',
        label: 'Area',
        kind: 'number',
        helper: 'Escala del ciclo',
        unit: ' Ha'
    },
    {
        key: 'baseInvestmentUsd',
        label: 'Inversion base',
        kind: 'currency',
        helper: 'Capital base del ciclo'
    },
    {
        key: 'costosUsd',
        label: 'Costos totales',
        kind: 'currency',
        helper: 'Base + gastos + perdidas'
    },
    {
        key: 'pagadosUsd',
        label: 'Pagados',
        kind: 'currency',
        helper: 'Cobros confirmados',
        highlight: true
    },
    {
        key: 'fiadosUsd',
        label: 'Fiados',
        kind: 'currency',
        helper: 'Pendiente por cobrar'
    },
    {
        key: 'rentabilidad',
        label: 'Resultado cobrado',
        kind: 'signedCurrency',
        helper: 'Pagados menos costos',
        highlight: true
    },
    {
        key: 'potencialNeto',
        label: 'Resultado potencial',
        kind: 'signedCurrency',
        helper: 'Incluye lo pendiente por cobrar',
        highlight: true
    }
]);

function createEmptySnapshot() {
    return {
        active: [],
        finished: [],
        lost: [],
        auditCount: 0,
        summary: {
            active: 0,
            finished: 0,
            lost: 0,
            audit: 0,
            closed: 0,
            total: 0
        }
    };
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function extractNumericValue(value) {
    const text = String(value ?? '').replace(',', '.');
    const match = text.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
}

function resolvePortfolioStatus(fiadosUsd) {
    const globalState = readBuyerPortfolioState();
    if (globalState?.known === true) {
        return globalState.hasActivePending
            ? { label: 'Cartera activa', tone: 'active' }
            : { label: 'Cartera cerrada', tone: 'closed' };
    }

    const pending = Number(fiadosUsd);
    if (!Number.isFinite(pending)) {
        return { label: '', tone: '' };
    }
    return pending > 0
        ? { label: 'Cartera activa', tone: 'active' }
        : { label: 'Cartera cerrada', tone: 'closed' };
}

function readBuyerPortfolioState() {
    if (typeof window === 'undefined') return null;

    try {
        const api = window._agroBuyerPortfolioState;
        if (typeof api?.getState !== 'function') return null;
        const snapshot = api.getState();
        return snapshot && typeof snapshot === 'object' ? snapshot : null;
    } catch (_error) {
        return null;
    }
}

function formatUsd(value, options = {}) {
    const number = toNumber(value, 0);
    const abs = Math.abs(number);
    const text = abs.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
    if (!options.signed) return text;
    if (number === 0) return text;
    return `${number > 0 ? '+' : '-'}${text}`;
}

function formatPercent(value) {
    const number = toNumber(value, 0);
    return `${Math.round(number)}%`;
}

function formatDays(value) {
    const number = Math.max(0, Math.round(toNumber(value, 0)));
    if (!number) return 'N/D';
    return `${number} dia${number === 1 ? '' : 's'}`;
}

function formatSignedNumber(value, unit = '') {
    const number = toNumber(value, 0);
    const abs = Math.abs(number);
    const formatted = abs.toLocaleString('en-US', {
        minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    });
    if (!number) return `0${unit}`;
    return `${number > 0 ? '+' : '-'}${formatted}${unit}`;
}

function readBridgeSnapshot() {
    const snapshot = typeof window !== 'undefined'
        ? window._agroCyclesWorkspace?.getSnapshot?.()
        : null;
    if (!snapshot || typeof snapshot !== 'object') {
        return createEmptySnapshot();
    }
    return {
        active: Array.isArray(snapshot.active) ? snapshot.active : [],
        finished: Array.isArray(snapshot.finished) ? snapshot.finished : [],
        lost: Array.isArray(snapshot.lost) ? snapshot.lost : [],
        auditCount: Math.max(0, Number(snapshot.auditCount || snapshot.summary?.audit || 0) || 0),
        summary: {
            active: Math.max(0, Number(snapshot.summary?.active || snapshot.active?.length || 0) || 0),
            finished: Math.max(0, Number(snapshot.summary?.finished || snapshot.finished?.length || 0) || 0),
            lost: Math.max(0, Number(snapshot.summary?.lost || snapshot.lost?.length || 0) || 0),
            audit: Math.max(0, Number(snapshot.summary?.audit || snapshot.auditCount || 0) || 0),
            closed: Math.max(0, Number(snapshot.summary?.closed || 0) || 0),
            total: Math.max(0, Number(snapshot.summary?.total || 0) || 0)
        }
    };
}

function buildCycleCollection(snapshot) {
    const groups = [
        ['active', snapshot.active],
        ['finished', snapshot.finished],
        ['lost', snapshot.lost]
    ];
    const items = [];
    groups.forEach(([kind, rows]) => {
        rows.forEach((row, index) => {
            const cycleId = String(row?.id || `${kind}-${index}`).trim();
            const lifecycleLabel = kind === 'active'
                ? 'Activo'
                : (kind === 'lost' ? 'Perdido' : 'Finalizado');
            const portfolioStatus = resolvePortfolioStatus(row?.fiadosUsd);
            items.push({
                ...row,
                compareId: `${kind}:${cycleId}`,
                cycleId,
                lifecycle: kind,
                lifecycleLabel,
                progreso: toNumber(row?.porcentaje, kind === 'active' ? 0 : 100),
                diaActual: toNumber(row?.diaActual, 0),
                duracion: toNumber(row?.diasTotales, 0),
                area: String(row?.area || 'N/D').trim() || 'N/D',
                areaValue: extractNumericValue(row?.area),
                estado: String(row?.estadoTexto || lifecycleLabel).trim() || lifecycleLabel,
                carteraEstado: portfolioStatus.label,
                carteraEstadoTone: portfolioStatus.tone,
                baseInvestmentUsd: toNumber(row?.baseInvestmentUsd ?? row?.inversionUSD, 0),
                costosUsd: toNumber(row?.costosUsd, 0),
                pagadosUsd: toNumber(row?.pagadosUsd, 0),
                fiadosUsd: toNumber(row?.fiadosUsd, 0),
                rentabilidad: toNumber(row?.rentabilidad, 0),
                potencialNeto: toNumber(row?.potencialNeto, 0),
                siembra: String(row?.siembra || 'N/D').trim() || 'N/D',
                cosechaEst: String(row?.cosechaEst || 'N/D').trim() || 'N/D',
                variedad: String(row?.variedad || 'Sin variedad').trim() || 'Sin variedad',
                nombre: String(row?.nombre || 'Cultivo').trim() || 'Cultivo'
            });
        });
    });
    return items;
}

function ensureSelectionState(items) {
    const keys = items.map((item) => item.compareId);
    if (!keys.length) {
        state.primaryId = '';
        state.secondaryId = '';
        return;
    }
    if (!keys.includes(state.primaryId)) {
        state.primaryId = keys[0];
    }
    if (keys.length < 2) {
        state.secondaryId = state.primaryId;
        return;
    }
    if (!keys.includes(state.secondaryId) || state.secondaryId === state.primaryId) {
        state.secondaryId = keys.find((key) => key !== state.primaryId) || keys[0];
    }
}

function findCycle(items, compareId) {
    return items.find((item) => item.compareId === compareId) || null;
}

function buildOptionLabel(item) {
    const detail = item.variedad && item.variedad !== 'Sin variedad'
        ? `${item.nombre} · ${item.variedad}`
        : item.nombre;
    return `${detail} · ${item.lifecycleLabel}`;
}

function syncOverviewCards(snapshot) {
    const summary = snapshot.summary || {};
    const finished = document.getElementById('agro-cycle-finished-count');
    const lost = document.getElementById('agro-cycle-lost-count');
    const audit = document.getElementById('agro-cycle-audit-count');
    if (finished) finished.textContent = String(summary.finished || snapshot.finished.length || 0);
    if (lost) lost.textContent = String(summary.lost || snapshot.lost.length || 0);
    if (audit) audit.textContent = String(summary.audit || snapshot.auditCount || 0);
}

function resolveMetricValue(metric, item) {
    switch (metric.key) {
        case 'estado':
            return {
                main: item.estado,
                sub: item.lifecycleLabel
            };
        case 'progreso':
            return {
                raw: item.progreso,
                main: formatPercent(item.progreso),
                sub: item.lifecycle === 'active'
                    ? `Dia ${Math.round(toNumber(item.diaActual, 0))}/${Math.round(toNumber(item.duracion, 0)) || 0}`
                    : 'Ciclo cerrado'
            };
        case 'duracion':
            return {
                raw: item.duracion,
                main: formatDays(item.duracion),
                sub: `Siembra ${item.siembra}`
            };
        case 'area':
            return {
                raw: item.areaValue,
                main: item.area,
                sub: item.cosechaEst !== 'N/D' ? `Cierre/estimado ${item.cosechaEst}` : 'Sin fecha de cierre'
            };
        case 'baseInvestmentUsd':
            return {
                raw: item.baseInvestmentUsd,
                main: formatUsd(item.baseInvestmentUsd),
                sub: 'Base reportada'
            };
        case 'costosUsd':
            return {
                raw: item.costosUsd,
                main: formatUsd(item.costosUsd),
                sub: 'Incluye perdidas'
            };
        case 'pagadosUsd':
            return {
                raw: item.pagadosUsd,
                main: formatUsd(item.pagadosUsd),
                sub: 'Cobros confirmados'
            };
        case 'fiadosUsd':
            return {
                raw: item.fiadosUsd,
                main: formatUsd(item.fiadosUsd),
                sub: 'Pendiente por cobrar'
            };
        case 'rentabilidad':
            return {
                raw: item.rentabilidad,
                main: formatUsd(item.rentabilidad, { signed: true }),
                sub: 'Solo cobrado',
                tone: item.rentabilidad < 0 ? 'danger' : 'gold'
            };
        case 'potencialNeto':
            return {
                raw: item.potencialNeto,
                main: formatUsd(item.potencialNeto, { signed: true }),
                sub: item.lifecycle === 'active' ? 'Incluye fiados' : 'Resultado final',
                tone: item.potencialNeto < 0 ? 'danger' : 'gold'
            };
        default:
            return {
                main: 'N/D',
                sub: metric.helper || ''
            };
    }
}

function resolveDelta(metric, leftValue, rightValue) {
    if (!Number.isFinite(leftValue?.raw) || !Number.isFinite(rightValue?.raw)) {
        return {
            label: 'A - B',
            value: 'Sin delta numérica',
            tone: ''
        };
    }

    const delta = leftValue.raw - rightValue.raw;
    let value = 'Sin delta numérica';
    if (metric.kind === 'currency' || metric.kind === 'signedCurrency') {
        value = formatUsd(delta, { signed: true });
    } else if (metric.kind === 'percent') {
        value = `${delta >= 0 ? '+' : ''}${Math.round(delta)} pts`;
    } else if (metric.kind === 'days') {
        value = `${delta >= 0 ? '+' : ''}${Math.round(delta)} dias`;
    } else if (metric.kind === 'number') {
        value = formatSignedNumber(delta, metric.unit || '');
    }

    return {
        label: 'A - B',
        value,
        tone: metric.highlight === true
            ? (delta < 0 ? 'danger' : (delta > 0 ? 'gold' : ''))
            : ''
    };
}

function renderSummaryCard(label, item) {
    const portfolioToneClass = item.carteraEstadoTone
        ? ` agro-cycle-compare__summary-pill--portfolio-${item.carteraEstadoTone}`
        : '';
    return `
        <article class="agro-cycle-compare__summary-card">
            <p class="agro-cycle-compare__summary-eyebrow">${escapeHtml(label)}</p>
            <h4 class="agro-cycle-compare__summary-title">${escapeHtml(item.nombre)}</h4>
            <p class="agro-cycle-compare__summary-copy">${escapeHtml(item.variedad)}</p>
            <span class="agro-cycle-compare__summary-pill">${escapeHtml(item.lifecycleLabel)} · ${escapeHtml(item.estado)}</span>
            ${item.carteraEstado ? `<span class="agro-cycle-compare__summary-pill${portfolioToneClass}">${escapeHtml(item.carteraEstado)}</span>` : ''}
            <div class="agro-cycle-compare__summary-meta">
                <div>
                    <span class="agro-cycle-compare__summary-label">Siembra</span>
                    <strong class="agro-cycle-compare__summary-value">${escapeHtml(item.siembra)}</strong>
                </div>
                <div>
                    <span class="agro-cycle-compare__summary-label">Cierre/estimado</span>
                    <strong class="agro-cycle-compare__summary-value">${escapeHtml(item.cosechaEst)}</strong>
                </div>
                <div>
                    <span class="agro-cycle-compare__summary-label">Duración</span>
                    <strong class="agro-cycle-compare__summary-value">${escapeHtml(formatDays(item.duracion))}</strong>
                </div>
                <div>
                    <span class="agro-cycle-compare__summary-label">Área</span>
                    <strong class="agro-cycle-compare__summary-value">${escapeHtml(item.area)}</strong>
                </div>
            </div>
        </article>
    `;
}

function renderMetric(metric, leftItem, rightItem) {
    const leftValue = resolveMetricValue(metric, leftItem);
    const rightValue = resolveMetricValue(metric, rightItem);
    const delta = resolveDelta(metric, leftValue, rightValue);
    const leftToneAttr = leftValue.tone ? ` data-tone="${leftValue.tone}"` : '';
    const rightToneAttr = rightValue.tone ? ` data-tone="${rightValue.tone}"` : '';
    const deltaToneAttr = delta.tone ? ` data-tone="${delta.tone}"` : '';
    return `
        <article class="agro-cycle-compare__metric">
            <div class="agro-cycle-compare__metric-label">${escapeHtml(metric.label)}</div>
            <div class="agro-cycle-compare__metric-value"${leftToneAttr}>
                <strong class="agro-cycle-compare__metric-main">${escapeHtml(leftValue.main)}</strong>
                <span class="agro-cycle-compare__metric-sub">${escapeHtml(leftValue.sub || metric.helper || '')}</span>
            </div>
            <div class="agro-cycle-compare__delta"${deltaToneAttr}>
                <span class="agro-cycle-compare__delta-label">${escapeHtml(delta.label)}</span>
                <strong class="agro-cycle-compare__delta-value">${escapeHtml(delta.value)}</strong>
            </div>
            <div class="agro-cycle-compare__metric-value"${rightToneAttr}>
                <strong class="agro-cycle-compare__metric-main">${escapeHtml(rightValue.main)}</strong>
                <span class="agro-cycle-compare__metric-sub">${escapeHtml(rightValue.sub || metric.helper || '')}</span>
            </div>
        </article>
    `;
}

function renderEmptyState(root, items) {
    const count = Array.isArray(items) ? items.length : 0;
    let copy = 'Aún no hay suficiente base para comparar. Necesitas al menos dos ciclos.';
    if (count === 1) {
        copy = 'Solo hay un ciclo disponible. Cuando exista un segundo ciclo, esta vista mostrará la comparación.';
    }
    root.innerHTML = `
        <div class="agro-cycle-compare__empty">
            <p class="agro-cycle-compare__empty-title">Comparar ciclos</p>
            <p class="agro-cycle-compare__empty-copy">${escapeHtml(copy)}</p>
        </div>
    `;
}

function renderCompare(snapshot) {
    const root = document.getElementById(COMPARE_ROOT_ID);
    if (!root) return;

    const items = buildCycleCollection(snapshot);
    if (items.length < 2) {
        renderEmptyState(root, items);
        return;
    }

    ensureSelectionState(items);
    const primary = findCycle(items, state.primaryId) || items[0];
    const secondary = findCycle(items, state.secondaryId) || items[1];

    root.innerHTML = `
        <section class="agro-cycle-compare__shell">
            <header class="agro-cycle-compare__head">
                <div>
                    <p class="agro-cycle-compare__eyebrow">Comparación útil</p>
                    <h3 class="agro-cycle-compare__title">Dos ciclos frente a frente</h3>
                    <p class="agro-cycle-compare__copy">Puedes comparar ciclos activos, finalizados o perdidos. Los activos conservan lectura de resultado potencial.</p>
                </div>
            </header>

            <div class="agro-cycle-compare__controls">
                <label class="agro-cycle-compare__field" for="${SELECT_PRIMARY_ID}">
                    <span class="agro-cycle-compare__field-label">Ciclo A</span>
                    <select id="${SELECT_PRIMARY_ID}" class="styled-input agro-cycle-compare__select">
                        ${items.map((item) => `<option value="${escapeHtml(item.compareId)}"${item.compareId === primary.compareId ? ' selected' : ''}>${escapeHtml(buildOptionLabel(item))}</option>`).join('')}
                    </select>
                </label>
                <label class="agro-cycle-compare__field" for="${SELECT_SECONDARY_ID}">
                    <span class="agro-cycle-compare__field-label">Ciclo B</span>
                    <select id="${SELECT_SECONDARY_ID}" class="styled-input agro-cycle-compare__select">
                        ${items.map((item) => `<option value="${escapeHtml(item.compareId)}"${item.compareId === secondary.compareId ? ' selected' : ''}>${escapeHtml(buildOptionLabel(item))}</option>`).join('')}
                    </select>
                </label>
            </div>

            <div class="agro-cycle-compare__summary">
                ${renderSummaryCard('Ciclo A', primary)}
                ${renderSummaryCard('Ciclo B', secondary)}
            </div>

            <div class="agro-cycle-compare__matrix">
                ${METRICS.map((metric) => renderMetric(metric, primary, secondary)).join('')}
            </div>
        </section>
    `;
}

function handleSnapshotChange(snapshot = null) {
    state.snapshot = snapshot && typeof snapshot === 'object'
        ? snapshot
        : readBridgeSnapshot();
    syncOverviewCards(state.snapshot);
    renderCompare(state.snapshot);
}

function handleCompareChange(event) {
    const target = event.target;
    if (!target) return;
    if (target.id === SELECT_PRIMARY_ID) {
        state.primaryId = String(target.value || '').trim();
    }
    if (target.id === SELECT_SECONDARY_ID) {
        state.secondaryId = String(target.value || '').trim();
    }
    handleSnapshotChange(state.snapshot);
}

export function initAgroCyclesWorkspace() {
    if (state.initialized) {
        handleSnapshotChange(readBridgeSnapshot());
        return;
    }

    state.initialized = true;
    document.addEventListener('change', handleCompareChange);
    window.addEventListener('agro:cycles:snapshot', (event) => {
        handleSnapshotChange(event.detail || null);
    });
    window.addEventListener('agro:shell:view-changed', () => {
        syncOverviewCards(state.snapshot);
    });

    handleSnapshotChange(readBridgeSnapshot());
}
