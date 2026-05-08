const ROOT_SELECTOR = '#agro-reports-center-root';
const VIEW_CHANGED_EVENT = 'agro:shell:view-changed';
const DATA_REFRESH_EVENT = 'data-refresh';

const REPORT_STATUS = Object.freeze({
    available: 'Disponible',
    empty: 'Sin datos',
    unloaded: 'No cargado',
    unavailable: 'No disponible'
});

const REPORT_CATEGORIES = Object.freeze([
    {
        id: 'estadisticas',
        title: 'Estadísticas',
        copy: 'Reportes generales de operación y ciclos productivos.',
        reports: Object.freeze([
            {
                id: 'estadisticas-globales',
                name: 'Informe estadístico global',
                description: 'Exporta el informe estadístico oficial de cultivos, clientes y operación.',
                status: 'available',
                action: 'export-global-stats'
            }
        ])
    },
    {
        id: 'rankings',
        title: 'Rankings',
        copy: 'Exportación oficial de rankings de clientes y cultivos.',
        reports: Object.freeze([
            {
                id: 'rankings-clientes',
                name: 'Rankings de clientes (Markdown)',
                description: 'Exporta los rankings de clientes desde Ciclos Operativos.',
                status: 'available',
                action: 'export-rankings'
            }
        ])
    }
]);

const CROP_REPORT_NOTE = 'Los reportes detallados por cultivo se acceden directamente desde cada ciclo de cultivo creado. Abre Mis cultivos y usa el botón "Informe del Cultivo" en la tarjeta correspondiente.';

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

function resolveReportStatus(report) {
    if (!report?.action) return 'unavailable';
    return 'available';
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
            <p class="agro-reports-overview__note">Solo aparecen reportes oficiales generales. Los informes por cultivo viven en cada ciclo creado.</p>
        </section>
    `;
}

function renderCropNote() {
    return `
        <aside class="agro-reports-crop-note" role="note">
            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
            <p>${escapeHtml(CROP_REPORT_NOTE)}</p>
        </aside>
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
            ${renderCropNote()}
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

function buildHonestMarkdown({ report, category, reason }) {
    const title = report?.name || 'Reporte';
    const categoryTitle = category?.title || 'Agro';
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10);
    let md = `# YavlGold Agro - ${title}\n\n`;
    md += `Fecha: ${stamp}\n`;
    md += `Categoría: ${categoryTitle}\n`;
    md += `Estado: fuente no disponible en esta sesión\n\n`;
    md += `${reason}\n\n`;
    md += `No se inventaron datos.\n`;
    return md;
}

function downloadHonestReport({ report, category, reason }) {
    const markdown = buildHonestMarkdown({ report, category, reason });
    const filename = `yavlgold-reporte-${(report?.id || 'export')}-${new Date().toISOString().slice(0, 10)}.md`;
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

async function exportRankings(report, category) {
    if (typeof window !== 'undefined' && typeof window.exportOpsRankingsMarkdown === 'function') {
        window.exportOpsRankingsMarkdown();
        return;
    }
    downloadHonestReport({
        report,
        category,
        reason: 'El módulo de Rankings no está cargado en esta sesión.'
    });
}

async function exportGlobalStats(report, category) {
    const mod = await import('./agro-stats-report.js');
    if (typeof mod.exportStatsReport === 'function') {
        await mod.exportStatsReport();
        return;
    }
    downloadHonestReport({
        report,
        category,
        reason: 'El exportador de estadísticas globales no está disponible en esta sesión.'
    });
}

const EXPORT_ACTIONS = Object.freeze({
    'export-rankings': exportRankings,
    'export-global-stats': exportGlobalStats
});

async function runReportExport(reportId) {
    const { report, category } = findReport(reportId);
    if (!report) return;

    if (!canExportReport(report)) return;

    const handler = EXPORT_ACTIONS[report.action];
    if (typeof handler !== 'function') {
        downloadHonestReport({
            report,
            category,
            reason: 'Acción de exportación registrada en Centro de Reportes.'
        });
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
        downloadHonestReport({
            report,
            category,
            reason: `No se pudo leer la fuente del reporte: ${err?.message || 'Error desconocido.'}`
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