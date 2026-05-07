const ROOT_SELECTOR = '#agro-reports-center-root';
const VIEW_CHANGED_EVENT = 'agro:shell:view-changed';
const CROP_CHANGED_EVENT = 'agro:crop:changed';
const CROPS_READY_EVENT = 'AGRO_CROPS_READY';
const DATA_REFRESH_EVENT = 'data-refresh';

const REPORT_STATUS = Object.freeze({
    available: 'Disponible',
    empty: 'Sin datos',
    unloaded: 'No cargado',
    unavailable: 'No disponible'
});

const REPORT_CATEGORIES = Object.freeze([
    {
        id: 'cultivos',
        title: 'Cultivos y ciclos',
        copy: 'Reportes de ciclos productivos y lectura de cultivos.',
        reports: Object.freeze([
            {
                id: 'crop-selected',
                name: 'Reporte de cultivo seleccionado',
                description: 'Exporta el informe Markdown real del ciclo seleccionado.',
                status: 'available',
                action: 'export-selected-crop'
            }
        ])
    },
    {
        id: 'operacion-comercial',
        title: 'Operación Comercial',
        copy: 'Carteras, compras e información comercial exportable.',
        reports: Object.freeze([
            {
                id: 'cartera-viva',
                name: 'Reporte de Cartera Viva',
                description: 'Exporta el informe Markdown del cliente desde Cartera Viva.',
                status: 'available',
                action: 'export-cartera-viva'
            },
            {
                id: 'cartera-operativa',
                name: 'Reporte de Cartera Operativa',
                description: 'Usa el exportador Markdown original del módulo cuando hay ciclos visibles.',
                status: 'available',
                action: 'export-operational-wallet'
            },
            {
                id: 'mi-carrito',
                name: 'Reporte de Mi Carrito',
                description: 'Exporta el carrito activo en formato Markdown.',
                status: 'available',
                action: 'export-cart'
            },
            {
                id: 'rankings-clientes',
                name: 'Reporte de rankings de clientes',
                description: 'Exporta los rankings de clientes desde Ciclos Operativos.',
                status: 'available',
                action: 'export-rankings'
            }
        ])
    },
    {
        id: 'estadisticas',
        title: 'Estadísticas',
        copy: 'Informes consolidados y lecturas financieras disponibles.',
        reports: Object.freeze([
            {
                id: 'estadisticas-globales',
                name: 'Informe estadístico global',
                description: 'Exporta estadísticas globales de cultivos, clientes y operación.',
                status: 'available',
                action: 'export-global-stats'
            },
            {
                id: 'perfil-global',
                name: 'Informe global de Agro',
                description: 'Usa el informe Markdown global original del perfil.',
                status: 'available',
                action: 'export-profile-global'
            }
        ])
    }
]);

const state = {
    root: null,
    feedback: '',
    feedbackTone: 'info',
    busyReportId: ''
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeMd(value) {
    return String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function mdCell(value) {
    const safe = normalizeMd(value);
    return safe ? safe.replace(/\|/g, '·').replace(/\n/g, ' ') : '-';
}

function getDateStamp(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function formatExportDate(date = new Date()) {
    return date.toLocaleString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function slugify(value) {
    return String(value || 'reporte')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 72) || 'reporte';
}

function formatMoneyUsd(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return 'USD 0.00';
    return `USD ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function markdownTable(headers, rows) {
    const safeHeaders = headers.map(mdCell);
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return 'Sin datos cargados.\n';

    const headerLine = `| ${safeHeaders.join(' | ')} |`;
    const separatorLine = `| ${safeHeaders.map(() => '---').join(' | ')} |`;
    const rowLines = safeRows.map((row) => `| ${headers.map((header) => mdCell(row?.[header])).join(' | ')} |`);
    return `${headerLine}\n${separatorLine}\n${rowLines.join('\n')}\n`;
}

function buildReportMarkdown({
    report,
    category,
    status = 'sin datos cargados',
    summary = [],
    data = '',
    observations = [],
    nextData = ''
} = {}) {
    const title = report?.name || 'Reporte';
    const categoryTitle = category?.title || 'Agro';
    const now = new Date();
    const summaryRows = Array.isArray(summary) ? summary : [];
    const observationRows = [
        'Reporte generado desde Centro de Reportes.',
        ...((Array.isArray(observations) ? observations : []).filter(Boolean))
    ];

    let md = `# YavlGold Agro - ${normalizeMd(title)}\n\n`;
    md += `Fecha: ${formatExportDate(now)}\n`;
    md += `Categoría: ${normalizeMd(categoryTitle)}\n`;
    md += `Estado: ${normalizeMd(status)}\n\n`;
    md += `## Resumen\n\n`;
    md += summaryRows.length
        ? summaryRows.map((item) => `- ${normalizeMd(item.label || 'Dato')}: ${normalizeMd(item.value ?? '-')}`).join('\n') + '\n'
        : '- Sin datos cargados.\n';
    md += `\n## Datos\n\n`;
    md += `${normalizeMd(data) || 'Sin datos cargados.'}\n\n`;
    md += `## Observaciones\n\n`;
    md += observationRows.map((item) => `- ${normalizeMd(item)}`).join('\n');
    if (nextData) {
        md += `\n\n## Próximo dato necesario\n\n${normalizeMd(nextData)}\n`;
    }
    return `${md}\n`;
}

function downloadMarkdown(markdown, filename) {
    const blob = new Blob(['\ufeff' + markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function downloadReport({ report, category, status, summary, data, observations, nextData }) {
    const markdown = buildReportMarkdown({ report, category, status, summary, data, observations, nextData });
    const filename = `yavlgold-reporte-${slugify(category?.title)}-${slugify(report?.name)}-${getDateStamp()}.md`;
    downloadMarkdown(markdown, filename);
}

function getSelectedCropId() {
    if (typeof window === 'undefined') return '';
    if (typeof window.getSelectedCropId === 'function') {
        return String(window.getSelectedCropId() || '').trim();
    }
    return String(window.YG_AGRO_SELECTED_CROP_ID || '').trim();
}

function getCropSnapshot() {
    if (typeof window === 'undefined') return null;
    const workspaceSnapshot = window._agroCyclesWorkspace?.getSnapshot?.();
    if (workspaceSnapshot && typeof workspaceSnapshot === 'object') return workspaceSnapshot;
    const cropsState = window.__AGRO_CROPS_STATE;
    if (cropsState && typeof cropsState === 'object') {
        const crops = Array.isArray(cropsState.crops) ? cropsState.crops : [];
        return {
            active: crops.filter((crop) => !['finalizado', 'perdido', 'lost', 'finished'].includes(String(crop?.status || '').toLowerCase())),
            finished: crops.filter((crop) => ['finalizado', 'finished'].includes(String(crop?.status || '').toLowerCase())),
            lost: crops.filter((crop) => ['perdido', 'lost'].includes(String(crop?.status || '').toLowerCase())),
            summary: { total: crops.length },
            updatedAt: cropsState.ts || cropsState.updatedAt || null
        };
    }
    return null;
}

function resolveCropReportStatus(kind) {
    const snapshot = getCropSnapshot();
    if (!snapshot) return 'unloaded';
    const active = Array.isArray(snapshot.active) ? snapshot.active : [];
    const finished = Array.isArray(snapshot.finished) ? snapshot.finished : [];
    const lost = Array.isArray(snapshot.lost) ? snapshot.lost : [];
    const total = Number(snapshot.summary?.total || active.length + finished.length + lost.length) || 0;

    if (kind === 'selected') return getSelectedCropId() ? 'available' : 'empty';
    if (kind === 'closed') return finished.length + lost.length > 0 ? 'available' : 'empty';
    return total > 0 ? 'available' : 'empty';
}

function resolveOperationalStatus() {
    const api = typeof window !== 'undefined' ? window.YGAgroOperationalCycles : null;
    if (typeof api?.downloadMarkdown !== 'function') return 'unloaded';
    const snapshot = typeof api.getSnapshot === 'function' ? api.getSnapshot() : null;
    if (!snapshot || typeof snapshot !== 'object') return 'unloaded';
    const activeCount = Number(snapshot.datasets?.active?.summary?.count || 0);
    const finishedCount = Number(snapshot.datasets?.finished?.summary?.count || 0);
    return activeCount + finishedCount > 0 ? 'available' : 'empty';
}

function resolveGlobalStatsStatus() {
    const summary = typeof window !== 'undefined' ? window.__YG_AGRO_LAST_SUMMARY__ : null;
    if (!summary || typeof summary !== 'object') return 'unloaded';
    return summary.hasData ? 'available' : 'empty';
}

function resolveProfileGlobalStatus() {
    return typeof window !== 'undefined' && typeof window.exportAgroGlobalMd === 'function'
        ? 'available'
        : 'unloaded';
}

function resolveReportStatus(report) {
    switch (report?.action) {
        case 'export-selected-crop':
            return resolveCropReportStatus('selected');
        case 'export-cartera-viva':
            return 'available';
        case 'export-operational-wallet':
            return resolveOperationalStatus();
        case 'export-cart':
            return typeof window !== 'undefined' && typeof window.exportActiveCartMD === 'function'
                ? 'available'
                : 'unloaded';
        case 'export-rankings':
            return typeof window !== 'undefined' && typeof window.exportOpsRankingsMarkdown === 'function'
                ? 'available'
                : 'unloaded';
        case 'export-global-stats':
            return resolveGlobalStatsStatus();
        case 'export-profile-global':
            return resolveProfileGlobalStatus();
        default:
            return report?.action ? 'unloaded' : 'unavailable';
    }
}

function canExportReport(report) {
    if ((report?.status || resolveReportStatus(report)) !== 'available') return false;
    if (!report.action) return false;
    return state.busyReportId !== report.id;
}

function resolveActionLabel(report) {
    return state.busyReportId === report.id ? 'Exportando' : 'Exportar MD';
}

function getVisibleReportCategories() {
    return REPORT_CATEGORIES.map((category) => {
        const reports = category.reports
            .map((report) => ({
                ...report,
                status: resolveReportStatus(report)
            }))
            .filter((report) => report.status === 'available');

        return reports.length ? { ...category, reports } : null;
    }).filter(Boolean);
}

function countReports(categories) {
    return categories.reduce((total, category) => total + category.reports.length, 0);
}

function renderStatusChip(status) {
    const label = REPORT_STATUS[status] || REPORT_STATUS.unloaded;
    return `<span class="agro-report-card__status" data-status="${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function renderReportCard(category, report) {
    const status = report.status || resolveReportStatus(report);
    const enabled = canExportReport(report);
    const disabledAttr = enabled ? '' : ' disabled aria-disabled="true"';

    return `
        <article class="agro-report-card" data-report-id="${escapeHtml(report.id)}">
            <div class="agro-report-card__body">
                <div class="agro-report-card__meta">
                    <span class="agro-report-card__category">${escapeHtml(category.title)}</span>
                    ${renderStatusChip(status)}
                </div>
                <h3 class="agro-report-card__title">${escapeHtml(report.name)}</h3>
                <p class="agro-report-card__copy">${escapeHtml(report.description)}</p>
            </div>
            <div class="agro-report-card__actions">
                <button type="button" class="agro-report-card__action" data-report-export="${escapeHtml(report.id)}"${disabledAttr}>
                    <i class="fa-solid fa-file-export" aria-hidden="true"></i>
                    <span>${escapeHtml(resolveActionLabel(report))}</span>
                </button>
            </div>
        </article>
    `;
}

function renderCategory(category) {
    return `
        <section class="agro-reports-category" aria-labelledby="agro-reports-category-${escapeHtml(category.id)}">
            <header class="agro-reports-category__header">
                <div>
                    <p class="agro-reports-category__eyebrow">Categoría</p>
                    <h2 class="agro-reports-category__title" id="agro-reports-category-${escapeHtml(category.id)}">${escapeHtml(category.title)}</h2>
                </div>
                <p class="agro-reports-category__copy">${escapeHtml(category.copy)}</p>
            </header>
            <div class="agro-reports-category__grid">
                ${category.reports.map((report) => renderReportCard(category, report)).join('')}
            </div>
        </section>
    `;
}

function renderFeedback() {
    if (!state.feedback) return '';
    return `
        <p class="agro-reports-feedback" data-tone="${escapeHtml(state.feedbackTone)}" role="status">
            ${escapeHtml(state.feedback)}
        </p>
    `;
}

function renderOverview(categories) {
    return `
        <section class="agro-reports-overview" aria-label="Resumen del Centro de Reportes">
            <dl class="agro-reports-summary" aria-label="Resumen de reportes">
                <div>
                    <dt>Reportes</dt>
                    <dd>${countReports(categories)}</dd>
                </div>
                <div>
                    <dt>Categorías</dt>
                    <dd>${categories.length}</dd>
                </div>
            </dl>
            <p class="agro-reports-overview__note">Solo aparecen reportes con fuente lista para exportar en esta sesión.</p>
        </section>
    `;
}

function renderEmptyState() {
    return `
        <section class="agro-reports-empty" aria-live="polite">
            <h2 class="agro-reports-empty__title">No hay reportes disponibles</h2>
            <p class="agro-reports-empty__copy">Aún no hay fuentes listas para exportar en esta sesión.</p>
        </section>
    `;
}

function render() {
    const root = state.root;
    if (!root) return;
    const visibleCategories = getVisibleReportCategories();
    const content = visibleCategories.length
        ? `<div class="agro-reports-list">${visibleCategories.map(renderCategory).join('')}</div>`
        : renderEmptyState();

    root.innerHTML = `
        <div class="agro-reports-center" tabindex="-1">
            ${renderOverview(visibleCategories)}
            ${renderFeedback()}
            ${content}
        </div>
    `;
}

function setFeedback(message, tone = 'info') {
    state.feedback = String(message || '').trim();
    state.feedbackTone = tone;
    render();
}

function findReport(reportId) {
    for (const category of REPORT_CATEGORIES) {
        const report = category.reports.find((item) => item.id === reportId);
        if (report) return { report, category };
    }
    return { report: null, category: null };
}

function exportHonestUnavailable(report, category, nextData, summary = []) {
    downloadReport({
        report,
        category,
        status: 'fuente no disponible en esta sesión',
        summary,
        data: 'La vista actual no expone datos suficientes para construir este reporte con detalle.',
        observations: ['No se inventaron datos.'],
        nextData
    });
}

async function exportSelectedCrop(report, category) {
    const carteraState = typeof window !== 'undefined'
        ? window._agroBuyerPortfolioState?.getState?.()
        : null;
    if (!carteraState || typeof carteraState !== 'object' || !carteraState.selectedBuyerRow) {
        downloadReport({
            report,
            category,
            status: 'sin datos cargados',
            summary: [{ label: 'Fuente', value: 'Cartera Viva' }, { label: 'Estado', value: 'Ningún cliente seleccionado' }],
            data: 'Selecciona un cliente en Cartera Viva para exportar su informe.',
            observations: ['El exportador original requiere un cliente seleccionado en Cartera Viva.'],
            nextData: 'Cartera Viva con un cliente seleccionado.'
        });
        return;
    }
    try {
        const mod = await import('./agro-cartera-viva-export.js');
        if (typeof mod.downloadBuyerPortfolioExport === 'function') {
            await mod.downloadBuyerPortfolioExport({
                buyerRow: carteraState.selectedBuyerRow,
                historyRows: carteraState.selectedBuyerHistory || []
            });
            return;
        }
        const markdown = mod.buildBuyerPortfolioExportMarkdown({
            buyerRow: carteraState.selectedBuyerRow,
            historyRows: carteraState.selectedBuyerHistory || []
        });
        const filename = mod.buildBuyerPortfolioExportFilename(carteraState.selectedBuyerRow);
        downloadMarkdown(markdown, filename);
    } catch (err) {
        console.warn('[AgroReportsCenter] Cartera Viva export fallback:', err);
        downloadReport({
            report,
            category,
            status: 'fuente no disponible en esta sesión',
            summary: [{ label: 'Fuente', value: 'Cartera Viva' }],
            data: 'No se pudo cargar el exportador de Cartera Viva.',
            observations: ['No se inventaron datos.'],
            nextData: 'Módulo de Cartera Viva cargado con cliente seleccionado.'
        });
    }
}

async function exportOperationalWallet(report, category) {
    const api = typeof window !== 'undefined' ? window.YGAgroOperationalCycles : null;
    if (typeof api?.downloadMarkdown === 'function') {
        await api.downloadMarkdown();
        return;
    }
    exportHonestUnavailable(report, category, 'Cartera Operativa cargada con exportación Markdown disponible.');
}

async function exportCart(report, category) {
    if (typeof window !== 'undefined' && typeof window.exportActiveCartMD === 'function') {
        window.exportActiveCartMD();
        return;
    }
    try {
        const mod = await import('./agro-cart.js');
        if (typeof mod.exportActiveCartMD === 'function') {
            await mod.exportActiveCartMD();
            return;
        }
    } catch (err) {
        console.warn('[AgroReportsCenter] Cart export fallback:', err);
    }
    downloadReport({
        report,
        category,
        status: 'sin datos cargados',
        summary: [{ label: 'Fuente', value: 'Mi Carrito' }],
        data: 'El módulo de Carrito no está disponible en esta sesión.',
        observations: ['No se inventaron datos.'],
        nextData: 'Mi Carrito cargado con un carrito activo.'
    });
}

async function exportRankings(report, category) {
    if (typeof window !== 'undefined' && typeof window.exportOpsRankingsMarkdown === 'function') {
        window.exportOpsRankingsMarkdown();
        return;
    }
    downloadReport({
        report,
        category,
        status: 'fuente no disponible en esta sesión',
        summary: [{ label: 'Fuente', value: 'Rankings de clientes' }],
        data: 'El módulo de Rankings no está cargado en esta sesión.',
        observations: ['No se inventaron datos.'],
        nextData: 'Ciclos Operativos con Rankings cargado.'
    });
}

async function exportGlobalStats(report, category) {
    const mod = await import('./agro-stats-report.js');
    if (typeof mod.exportStatsReport === 'function') {
        await mod.exportStatsReport();
        return;
    }
    exportHonestUnavailable(report, category, 'Exportador de estadísticas globales disponible.');
}

async function exportProfileGlobal(report, category) {
    if (typeof window !== 'undefined' && typeof window.exportAgroGlobalMd === 'function') {
        await window.exportAgroGlobalMd();
        return;
    }
    exportHonestUnavailable(report, category, 'Informe global del perfil cargado en la sesión.');
}

const EXPORT_ACTIONS = Object.freeze({
    'export-selected-crop': exportSelectedCrop,
    'export-cartera-viva': exportCarteraViva,
    'export-operational-wallet': exportOperationalWallet,
    'export-cart': exportCart,
    'export-rankings': exportRankings,
    'export-global-stats': exportGlobalStats,
    'export-profile-global': exportProfileGlobal
});

async function runReportExport(reportId) {
    const { report, category } = findReport(reportId);
    if (!report) return;

    if (!canExportReport(report)) return;

    const handler = EXPORT_ACTIONS[report.action];
    if (typeof handler !== 'function') {
        exportHonestUnavailable(report, category, 'Acción de exportación registrada en Centro de Reportes.');
        return;
    }

    state.busyReportId = report.id;
    state.feedback = '';
    render();

    try {
        await handler(report, category);
        setFeedback(`${report.name}: exportación iniciada.`, 'success');
    } catch (err) {
        console.warn('[AgroReportsCenter] Export error:', err);
        downloadReport({
            report,
            category,
            status: 'fuente no disponible en esta sesión',
            summary: [{ label: 'Error de exportación', value: err?.message || 'No se pudo exportar.' }],
            data: 'No se pudo leer la fuente del reporte durante esta sesión.',
            observations: ['No se inventaron datos.'],
            nextData: 'Revisar que el módulo origen esté cargado y exponga su fuente.'
        });
        setFeedback(`${report.name}: se descargó un reporte honesto sin datos completos.`, 'warn');
    } finally {
        state.busyReportId = '';
        render();
    }
}

function bindRootEvents(root) {
    if (root.dataset.reportsCenterBound === '1') return;
    root.dataset.reportsCenterBound = '1';

    root.addEventListener('click', (event) => {
        const exportButton = event.target.closest('[data-report-export]');
        if (!exportButton) return;
        event.preventDefault();
        runReportExport(exportButton.dataset.reportExport);
    });

    window.addEventListener(VIEW_CHANGED_EVENT, (event) => {
        if (event.detail?.view === 'reportes') {
            render();
        }
    });
    window.addEventListener(CROP_CHANGED_EVENT, render);
    window.addEventListener(CROPS_READY_EVENT, render);
    window.addEventListener('agro:buyer-portfolio-state-updated', render);
    window.addEventListener('agro:operational-portfolio-updated', render);
    window.addEventListener('agro:clients:changed', render);
    window.addEventListener('agro:period-cycles:updated', render);
    document.addEventListener(DATA_REFRESH_EVENT, render);
}

export function initAgroReportsCenter() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return null;
    state.root = root;
    bindRootEvents(root);
    render();
    if (typeof window !== 'undefined') {
        window.setTimeout(render, 600);
        window.setTimeout(render, 1600);
    }
    return {
        refresh: render
    };
}
