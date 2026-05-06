const ROOT_SELECTOR = '#agro-reports-center-root';
const VIEW_CHANGED_EVENT = 'agro:shell:view-changed';
const CROP_CHANGED_EVENT = 'agro:crop:changed';
const CROPS_READY_EVENT = 'AGRO_CROPS_READY';

const REPORT_STATUS = Object.freeze({
    available: 'Disponible',
    pending: 'Pendiente de conectar',
    soon: 'Próximamente'
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
                description: 'Exporta el informe Markdown del ciclo seleccionado.',
                status: 'available',
                action: 'export-selected-crop',
                requiresSelectedCrop: true
            },
            {
                id: 'crop-closed',
                name: 'Reporte de ciclo finalizado o perdido',
                description: 'Queda listo para conectar cuando el centro tenga selector de ciclos cerrados.',
                status: 'pending'
            },
            {
                id: 'crop-comparison',
                name: 'Resumen comparativo de ciclos',
                description: 'Comparativo exportable cuando el módulo exponga una salida Markdown estable.',
                status: 'pending'
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
                description: 'Pendiente de API central para exportar la cartera sin entrar al detalle de cliente.',
                status: 'pending'
            },
            {
                id: 'cartera-operativa',
                name: 'Reporte de Cartera Operativa',
                description: 'Usa el exportador Markdown del módulo de Cartera Operativa cuando esté cargado.',
                status: 'available',
                action: 'export-operational-wallet',
                runtimeAvailable: () => typeof window !== 'undefined'
                    && typeof window.YGAgroOperationalCycles?.downloadMarkdown === 'function'
            },
            {
                id: 'mi-carrito',
                name: 'Reporte de Mi Carrito',
                description: 'El carrito ya exporta desde su módulo; falta API pública para centralizarlo aquí.',
                status: 'pending'
            }
        ])
    },
    {
        id: 'clientes',
        title: 'Clientes',
        copy: 'Reportes relacionados con contactos, cartera y lectura de clientes.',
        reports: Object.freeze([
            {
                id: 'mis-clientes',
                name: 'Reporte de Mis Clientes',
                description: 'Pendiente de conectar cuando Mis Clientes exponga exportación Markdown propia.',
                status: 'pending'
            },
            {
                id: 'rankings-clientes',
                name: 'Reporte de rankings de clientes',
                description: 'El ranking conserva su exporte actual; falta wrapper público para este centro.',
                status: 'pending'
            }
        ])
    },
    {
        id: 'trabajo-memoria',
        title: 'Trabajo y memoria',
        copy: 'Bitácora, tareas y memoria operativa en formato Markdown.',
        reports: Object.freeze([
            {
                id: 'trabajo-diario',
                name: 'Reporte de Trabajo Diario',
                description: 'Disponible cuando Ciclos de Tareas exponga un exportador Markdown estable.',
                status: 'pending'
            },
            {
                id: 'agrorepo-memoria',
                name: 'Reporte de AgroRepo',
                description: 'AgroRepo mantiene sus exportes internos; falta selección central de archivo o carpeta.',
                status: 'pending'
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
                description: 'Usa el informe Markdown global del perfil cuando esté cargado.',
                status: 'available',
                action: 'export-profile-global',
                runtimeAvailable: () => typeof window !== 'undefined'
                    && typeof window.exportAgroGlobalMd === 'function'
            },
            {
                id: 'estadisticas-periodos',
                name: 'Estadísticas de períodos',
                description: 'Pendiente de exportador Markdown público para ciclos de período.',
                status: 'pending'
            },
            {
                id: 'financiero-detallado',
                name: 'Reporte financiero detallado',
                description: 'Se conectará cuando exista una salida única para todas las carteras.',
                status: 'soon'
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

function getSelectedCropId() {
    if (typeof window === 'undefined') return '';
    if (typeof window.getSelectedCropId === 'function') {
        return String(window.getSelectedCropId() || '').trim();
    }
    return String(window.YG_AGRO_SELECTED_CROP_ID || '').trim();
}

function isRuntimeAvailable(report) {
    if (typeof report.runtimeAvailable !== 'function') return true;
    try {
        return report.runtimeAvailable() === true;
    } catch (_err) {
        return false;
    }
}

function resolveReportStatus(report) {
    if (report.status !== 'available') return report.status;
    return isRuntimeAvailable(report) ? 'available' : 'pending';
}

function canExportReport(report) {
    if (resolveReportStatus(report) !== 'available') return false;
    if (!report.action) return false;
    if (report.requiresSelectedCrop && !getSelectedCropId()) return false;
    return state.busyReportId !== report.id;
}

function resolveActionLabel(report) {
    if (state.busyReportId === report.id) return 'Exportando';
    if (resolveReportStatus(report) !== 'available') return 'No disponible';
    if (report.requiresSelectedCrop && !getSelectedCropId()) return 'Selecciona cultivo';
    return 'Exportar MD';
}

function countAvailableReports() {
    return REPORT_CATEGORIES.reduce((total, category) => (
        total + category.reports.filter((report) => resolveReportStatus(report) === 'available').length
    ), 0);
}

function countPendingReports() {
    return REPORT_CATEGORIES.reduce((total, category) => (
        total + category.reports.filter((report) => resolveReportStatus(report) !== 'available').length
    ), 0);
}

function renderStatusChip(status) {
    const label = REPORT_STATUS[status] || REPORT_STATUS.pending;
    return `<span class="agro-report-card__status" data-status="${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function renderReportCard(category, report) {
    const status = resolveReportStatus(report);
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

function render() {
    const root = state.root;
    if (!root) return;

    root.innerHTML = `
        <div class="agro-reports-center" tabindex="-1">
            <header class="agro-reports-hero">
                <button type="button" class="agro-reports-back" data-reports-back>
                    <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                    <span>Volver</span>
                </button>
                <div class="agro-reports-hero__copy">
                    <p class="agro-reports-hero__eyebrow">Trabajo y lectura</p>
                    <h1 class="agro-reports-hero__title">Centro de Reportes</h1>
                    <p class="agro-reports-hero__subtitle">Reportes Markdown de Agro, ordenados por categoría.</p>
                </div>
                <dl class="agro-reports-summary" aria-label="Resumen de reportes">
                    <div>
                        <dt>Disponibles</dt>
                        <dd>${countAvailableReports()}</dd>
                    </div>
                    <div>
                        <dt>Pendientes</dt>
                        <dd>${countPendingReports()}</dd>
                    </div>
                </dl>
            </header>
            ${renderFeedback()}
            <div class="agro-reports-list">
                ${REPORT_CATEGORIES.map(renderCategory).join('')}
            </div>
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
        if (report) return report;
    }
    return null;
}

async function exportSelectedCrop() {
    const cropId = getSelectedCropId();
    if (!cropId) {
        throw new Error('Selecciona un cultivo antes de exportar este reporte.');
    }
    const mod = await import('./agro-crop-report.js');
    if (typeof mod.exportCropReport !== 'function') {
        throw new Error('El exportador de cultivo no está disponible.');
    }
    await mod.exportCropReport(cropId);
}

async function exportGlobalStats() {
    const mod = await import('./agro-stats-report.js');
    if (typeof mod.exportStatsReport !== 'function') {
        throw new Error('El exportador de estadísticas no está disponible.');
    }
    await mod.exportStatsReport();
}

async function exportProfileGlobal() {
    if (typeof window === 'undefined' || typeof window.exportAgroGlobalMd !== 'function') {
        throw new Error('El informe global todavía no está disponible en esta sesión.');
    }
    await window.exportAgroGlobalMd();
}

async function exportOperationalWallet() {
    const api = typeof window !== 'undefined' ? window.YGAgroOperationalCycles : null;
    if (typeof api?.downloadMarkdown !== 'function') {
        throw new Error('Cartera Operativa todavía no está lista para exportar desde este centro.');
    }
    await api.downloadMarkdown();
}

const EXPORT_ACTIONS = Object.freeze({
    'export-selected-crop': exportSelectedCrop,
    'export-global-stats': exportGlobalStats,
    'export-profile-global': exportProfileGlobal,
    'export-operational-wallet': exportOperationalWallet
});

async function runReportExport(reportId) {
    const report = findReport(reportId);
    if (!report) return;

    if (!canExportReport(report)) {
        if (report.requiresSelectedCrop && !getSelectedCropId()) {
            setFeedback('Selecciona un cultivo antes de exportar ese reporte.', 'warn');
        }
        return;
    }

    const handler = EXPORT_ACTIONS[report.action];
    if (typeof handler !== 'function') {
        setFeedback('Este reporte todavía no tiene exportación conectada.', 'warn');
        return;
    }

    state.busyReportId = report.id;
    state.feedback = '';
    render();

    try {
        await handler();
        setFeedback(`${report.name}: exportación iniciada.`, 'success');
    } catch (err) {
        console.warn('[AgroReportsCenter] Export error:', err);
        setFeedback(err?.message || 'No se pudo exportar el reporte.', 'warn');
    } finally {
        state.busyReportId = '';
        render();
    }
}

function goBackToHub() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
        detail: {
            view: 'dashboard',
            scroll: true
        }
    }));
}

function bindRootEvents(root) {
    if (root.dataset.reportsCenterBound === '1') return;
    root.dataset.reportsCenterBound = '1';

    root.addEventListener('click', (event) => {
        const backButton = event.target.closest('[data-reports-back]');
        if (backButton) {
            event.preventDefault();
            goBackToHub();
            return;
        }

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
    document.addEventListener('data-refresh', render);
}

export function initAgroReportsCenter() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return null;
    state.root = root;
    bindRootEvents(root);
    render();
    window.setTimeout(render, 600);
    window.setTimeout(render, 1600);
    return {
        refresh: render
    };
}
