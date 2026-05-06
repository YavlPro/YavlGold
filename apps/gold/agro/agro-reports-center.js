const ROOT_SELECTOR = '#agro-reports-center-root';
const VIEW_CHANGED_EVENT = 'agro:shell:view-changed';
const CROP_CHANGED_EVENT = 'agro:crop:changed';
const CROPS_READY_EVENT = 'AGRO_CROPS_READY';
const DATA_REFRESH_EVENT = 'data-refresh';

const REPORT_STATUS = Object.freeze({
    available: 'Disponible'
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
                description: 'Exporta el informe Markdown del ciclo seleccionado o deja constancia si no hay cultivo activo.',
                status: 'available',
                action: 'export-selected-crop'
            },
            {
                id: 'crop-closed',
                name: 'Reporte de ciclo finalizado o perdido',
                description: 'Exporta ciclos cerrados desde la memoria de cultivos disponible en la sesión.',
                status: 'available',
                action: 'export-closed-cycles'
            },
            {
                id: 'crop-comparison',
                name: 'Resumen comparativo de ciclos',
                description: 'Resume activos, finalizados y perdidos con los datos cargados del módulo de ciclos.',
                status: 'available',
                action: 'export-cycle-comparison'
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
                description: 'Exporta el estado disponible de la cartera de clientes y deja claro si faltan datos.',
                status: 'available',
                action: 'export-cartera-viva'
            },
            {
                id: 'cartera-operativa',
                name: 'Reporte de Cartera Operativa',
                description: 'Usa el exportador Markdown del módulo o genera una salida honesta si no está cargado.',
                status: 'available',
                action: 'export-operational-wallet'
            },
            {
                id: 'mi-carrito',
                name: 'Reporte de Mi Carrito',
                description: 'Exporta el estado del carrito cuando exista fuente accesible; si no, documenta qué falta.',
                status: 'available',
                action: 'export-cart'
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
                description: 'Exporta contactos manuales y derivados si el módulo puede cargarlos en esta sesión.',
                status: 'available',
                action: 'export-clients'
            },
            {
                id: 'rankings-clientes',
                name: 'Reporte de rankings de clientes',
                description: 'Exporta la lectura visible de rankings o un estado honesto si aún no fue cargada.',
                status: 'available',
                action: 'export-rankings'
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
                description: 'Exporta tareas cargadas desde Ciclos de Tareas o explica si la fuente no está lista.',
                status: 'available',
                action: 'export-task-cycles'
            },
            {
                id: 'agrorepo-memoria',
                name: 'Reporte de AgroRepo',
                description: 'Exporta un índice de notas recientes cuando la memoria local esté disponible.',
                status: 'available',
                action: 'export-agrorepo'
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
                description: 'Usa el informe Markdown global del perfil o documenta si no está cargado.',
                status: 'available',
                action: 'export-profile-global'
            },
            {
                id: 'estadisticas-periodos',
                name: 'Estadísticas de períodos',
                description: 'Exporta el resumen disponible de ciclos de período.',
                status: 'available',
                action: 'export-period-stats'
            },
            {
                id: 'financiero-detallado',
                name: 'Reporte financiero detallado',
                description: 'Exporta una lectura financiera desde el resumen global disponible.',
                status: 'available',
                action: 'export-financial-detail'
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

function readCycleName(cycle) {
    return cycle?.name || cycle?.label || cycle?.title || cycle?.crop_label || cycle?.id || 'Ciclo sin nombre';
}

function mapCycleRows(cycles, stateLabel) {
    return (Array.isArray(cycles) ? cycles : []).map((cycle) => ({
        Ciclo: readCycleName(cycle),
        Estado: cycle?.status || stateLabel,
        Cultivo: cycle?.variety || cycle?.crop_label || cycle?.cropName || cycle?.name || '-',
        Inicio: cycle?.start_date || cycle?.startDate || cycle?.created_at || '-',
        Cierre: cycle?.end_date || cycle?.closed_at || cycle?.updated_at || '-'
    }));
}

function resolveReportStatus() {
    return 'available';
}

function canExportReport(report) {
    if (resolveReportStatus(report) !== 'available') return false;
    if (!report.action) return false;
    return state.busyReportId !== report.id;
}

function resolveActionLabel(report) {
    return state.busyReportId === report.id ? 'Exportando' : 'Exportar MD';
}

function countReports() {
    return REPORT_CATEGORIES.reduce((total, category) => total + category.reports.length, 0);
}

function renderStatusChip(status) {
    const label = REPORT_STATUS[status] || REPORT_STATUS.available;
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

function renderOverview() {
    return `
        <section class="agro-reports-overview" aria-label="Resumen del Centro de Reportes">
            <dl class="agro-reports-summary" aria-label="Resumen de reportes">
                <div>
                    <dt>Reportes</dt>
                    <dd>${countReports()}</dd>
                </div>
                <div>
                    <dt>Categorías</dt>
                    <dd>${REPORT_CATEGORIES.length}</dd>
                </div>
            </dl>
            <p class="agro-reports-overview__note">Cada descarga genera un Markdown real; si falta una fuente, el archivo lo declara sin inventar datos.</p>
        </section>
    `;
}

function render() {
    const root = state.root;
    if (!root) return;

    root.innerHTML = `
        <div class="agro-reports-center" tabindex="-1">
            ${renderOverview()}
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
    const cropId = getSelectedCropId();
    if (!cropId) {
        downloadReport({
            report,
            category,
            status: 'sin datos cargados',
            summary: [{ label: 'Cultivo seleccionado', value: 'Ninguno' }],
            data: 'No hay cultivo seleccionado en esta sesión.',
            observations: ['Selecciona un cultivo para generar el informe completo del ciclo.'],
            nextData: 'Cultivo seleccionado desde Mis cultivos.'
        });
        return;
    }

    const mod = await import('./agro-crop-report.js');
    if (typeof mod.exportCropReport !== 'function') {
        exportHonestUnavailable(report, category, 'Exportador de cultivo cargado como función pública.');
        return;
    }
    await mod.exportCropReport(cropId);
}

async function exportClosedCycles(report, category) {
    const snapshot = getCropSnapshot();
    const finished = Array.isArray(snapshot?.finished) ? snapshot.finished : [];
    const lost = Array.isArray(snapshot?.lost) ? snapshot.lost : [];
    const rows = [
        ...mapCycleRows(finished, 'Finalizado'),
        ...mapCycleRows(lost, 'Perdido')
    ];
    const status = snapshot ? (rows.length ? 'con datos' : 'sin datos cargados') : 'fuente no disponible en esta sesión';

    downloadReport({
        report,
        category,
        status,
        summary: [
            { label: 'Finalizados', value: finished.length },
            { label: 'Perdidos', value: lost.length },
            { label: 'Total cerrado', value: rows.length }
        ],
        data: markdownTable(['Ciclo', 'Estado', 'Cultivo', 'Inicio', 'Cierre'], rows),
        observations: snapshot ? [] : ['La memoria de ciclos no está disponible todavía en esta sesión.'],
        nextData: snapshot ? '' : 'Información de ciclos cargada desde Mis cultivos.'
    });
}

async function exportCycleComparison(report, category) {
    const snapshot = getCropSnapshot();
    const summary = snapshot?.summary || {};
    const active = Array.isArray(snapshot?.active) ? snapshot.active : [];
    const finished = Array.isArray(snapshot?.finished) ? snapshot.finished : [];
    const lost = Array.isArray(snapshot?.lost) ? snapshot.lost : [];
    const total = Number(summary.total || active.length + finished.length + lost.length) || 0;
    const rows = [
        { Grupo: 'Activos', Cantidad: active.length },
        { Grupo: 'Finalizados', Cantidad: finished.length },
        { Grupo: 'Perdidos', Cantidad: lost.length },
        { Grupo: 'Total visible', Cantidad: total }
    ];

    downloadReport({
        report,
        category,
        status: snapshot ? (total ? 'con datos' : 'sin datos cargados') : 'fuente no disponible en esta sesión',
        summary: [
            { label: 'Ciclos activos', value: active.length },
            { label: 'Ciclos cerrados', value: finished.length + lost.length },
            { label: 'Total visible', value: total }
        ],
        data: markdownTable(['Grupo', 'Cantidad'], rows),
        observations: ['Este resumen compara disponibilidad por estado; no recalcula finanzas.'],
        nextData: snapshot ? '' : 'Información de ciclos cargada desde Mis cultivos.'
    });
}

async function exportCarteraViva(report, category) {
    const carteraState = typeof window !== 'undefined'
        ? window._agroBuyerPortfolioState?.getState?.()
        : null;
    const hasState = carteraState && typeof carteraState === 'object';
    const rows = hasState ? [{
        Dato: 'Fiados activos generales',
        Valor: carteraState.hasActivePending ? 'Sí' : 'No'
    }, {
        Dato: 'Total pendiente general',
        Valor: formatMoneyUsd(carteraState.pendingGeneralTotalUsd)
    }, {
        Dato: 'Actualizado',
        Valor: carteraState.updatedAt || '-'
    }] : [];

    downloadReport({
        report,
        category,
        status: hasState && carteraState.known ? 'con datos' : (hasState ? 'sin datos cargados' : 'fuente no disponible en esta sesión'),
        summary: [
            { label: 'Fuente de cartera', value: hasState ? 'Resumen disponible de Cartera Viva' : 'No cargada' },
            { label: 'Fiados activos', value: hasState && carteraState.hasActivePending ? 'Sí' : 'No' },
            { label: 'Pendiente general', value: hasState ? formatMoneyUsd(carteraState.pendingGeneralTotalUsd) : '-' }
        ],
        data: markdownTable(['Dato', 'Valor'], rows),
        observations: ['La fuente actual muestra estado general, no el detalle completo de cada cliente.'],
        nextData: hasState && carteraState.known ? 'Resumen de clientes, cobrados y pérdidas disponible para el centro.' : 'Cartera Viva cargada con estado conocido.'
    });
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
    exportHonestUnavailable(
        report,
        category,
        'Lista de carritos e ítems activos disponible para Centro de Reportes.',
        [{ label: 'Fuente actual', value: 'El exportador existe dentro de Mi Carrito, pero todavía no hay entrada central estable.' }]
    );
}

async function exportClients(report, category) {
    try {
        const mod = await import('./agro-clients.js');
        const api = typeof mod.initAgroClients === 'function' ? mod.initAgroClients() : null;
        if (typeof api?.refresh === 'function') await api.refresh();
        const clients = typeof api?.getClients === 'function' ? api.getClients() : [];
        const rows = (Array.isArray(clients) ? clients : []).map((client) => ({
            Cliente: client.display_name || 'Sin nombre',
            Tipo: client.source === 'buyer' || client.source === 'cartera-viva' ? 'Cartera Viva' : (client.client_type || client.type || 'Manual'),
            Contacto: client.phone || client.whatsapp || client.email || '-',
            Finca: client.location || '-'
        }));
        downloadReport({
            report,
            category,
            status: rows.length ? 'con datos' : 'sin datos cargados',
            summary: [
                { label: 'Contactos visibles', value: rows.length },
                { label: 'Fuente', value: 'Mis Clientes' }
            ],
            data: markdownTable(['Cliente', 'Tipo', 'Contacto', 'Finca'], rows),
            observations: rows.length ? [] : ['Mis Clientes no devolvió contactos para esta sesión.'],
            nextData: rows.length ? '' : 'Contactos manuales o derivados cargados en Mis Clientes.'
        });
    } catch (err) {
        console.warn('[AgroReportsCenter] Clients export fallback:', err);
        exportHonestUnavailable(report, category, 'Módulo Mis Clientes inicializado y con lectura de contactos.');
    }
}

function readListText(selector) {
    return Array.from(document.querySelectorAll(selector))
        .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .filter((text) => !/^sin datos/i.test(text));
}

async function exportRankings(report, category) {
    const topClients = readListText('#ops-rankings-top-clients .ops-ranking-item, #ops-rankings-top-clients li');
    const pendingClients = readListText('#ops-rankings-pending-clients .ops-ranking-item, #ops-rankings-pending-clients li');
    const topCrops = readListText('#ops-rankings-top-crops .ops-ranking-item, #ops-rankings-top-crops li');
    const rows = [
        ...topClients.map((text, index) => ({ Sección: 'Top clientes cobrados', Orden: index + 1, Lectura: text })),
        ...pendingClients.map((text, index) => ({ Sección: 'Fiados por cliente', Orden: index + 1, Lectura: text })),
        ...topCrops.map((text, index) => ({ Sección: 'Cultivos rentables', Orden: index + 1, Lectura: text }))
    ];

    downloadReport({
        report,
        category,
        status: rows.length ? 'con datos' : 'fuente no disponible en esta sesión',
        summary: [
            { label: 'Top clientes', value: topClients.length },
            { label: 'Fiados por cliente', value: pendingClients.length },
            { label: 'Cultivos', value: topCrops.length }
        ],
        data: markdownTable(['Sección', 'Orden', 'Lectura'], rows),
        observations: rows.length ? ['Lectura tomada del panel de Rankings visible en pantalla.'] : ['Rankings todavía no está abierto o cargado para el centro.'],
        nextData: rows.length ? '' : 'Rankings cargado antes de exportar o fuente central de rankings.'
    });
}

async function exportTaskCycles(report, category) {
    let api = typeof window !== 'undefined' ? window.YGAgroTaskCycles : null;
    if (!api) {
        try {
            const mod = await import('./agroTaskCycles.js');
            if (typeof mod.initAgroTaskCycles === 'function') {
                api = await mod.initAgroTaskCycles();
            }
        } catch (err) {
            console.warn('[AgroReportsCenter] Task cycles init fallback:', err);
        }
    }
    if (typeof api?.refresh === 'function') await api.refresh();
    const snapshot = typeof api?.getSnapshot === 'function' ? api.getSnapshot() : null;
    const tasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : [];
    const rows = tasks.map((task) => ({
        Tarea: task.title || task.name || task.task_name || task.description || 'Tarea sin nombre',
        Estado: task.task_status || task.status || '-',
        Fecha: task.task_date || task.date || '-',
        Cultivo: task.crop?.shortLabel || task.crop?.label || task.crop_id || 'General',
        Duración: task.duration_minutes ? `${task.duration_minutes} min` : '-'
    }));

    downloadReport({
        report,
        category,
        status: snapshot ? (rows.length ? 'con datos' : 'sin datos cargados') : 'fuente no disponible en esta sesión',
        summary: [
            { label: 'Tareas', value: rows.length },
            { label: 'Vista', value: snapshot?.currentView || '-' }
        ],
        data: markdownTable(['Tarea', 'Estado', 'Fecha', 'Cultivo', 'Duración'], rows),
        observations: snapshot ? [] : ['No se encontró lectura de Ciclos de Tareas.'],
        nextData: snapshot ? '' : 'Trabajo Diario cargado con lista de tareas.'
    });
}

async function exportAgroRepo(report, category) {
    try {
        if (typeof window !== 'undefined' && typeof window.ensureAgroRepoReady === 'function') {
            window.ensureAgroRepoReady();
        }
    } catch (err) {
        console.warn('[AgroReportsCenter] AgroRepo ready fallback:', err);
    }
    const context = typeof window !== 'undefined' ? window._agroRepoContext : null;
    const entries = Array.isArray(context?.recent_entries) ? context.recent_entries : [];
    const rows = entries.map((entry) => ({
        Bitácora: entry.bitacora || '-',
        Ruta: entry.path || '-',
        Tipo: entry.type || '-',
        Fecha: entry.date || '-',
        Resumen: entry.content || '-'
    }));

    downloadReport({
        report,
        category,
        status: context ? (rows.length ? 'con datos' : 'sin datos cargados') : 'fuente no disponible en esta sesión',
        summary: [
            { label: 'Archivos', value: context?.total_files ?? '-' },
            { label: 'Bitácoras', value: context?.bitacoras_count ?? '-' },
            { label: 'Archivo activo', value: context?.active_file || '-' }
        ],
        data: markdownTable(['Bitácora', 'Ruta', 'Tipo', 'Fecha', 'Resumen'], rows),
        observations: context ? ['Exporta un índice de memoria, no reemplaza los exportes propios de AgroRepo.'] : ['AgroRepo no expuso contexto local en esta sesión.'],
        nextData: context ? '' : 'Memoria local cargada desde AgroRepo.'
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

async function exportPeriodStats(report, category) {
    try {
        const mod = await import('./agro-period-cycles.js');
        const summary = typeof mod.getAgroPeriodCyclesSummary === 'function'
            ? mod.getAgroPeriodCyclesSummary()
            : null;
        const hasSummary = summary && typeof summary === 'object';
        const rows = hasSummary ? [{
            Métrica: 'Períodos visibles',
            Valor: summary.total ?? 0
        }, {
            Métrica: 'Activos',
            Valor: summary.active ?? 0
        }, {
            Métrica: 'Finalizados',
            Valor: summary.finalized ?? 0
        }, {
            Métrica: 'Operativa abierta / cerrada',
            Valor: `${summary.open ?? 0} / ${summary.closed ?? 0}`
        }] : [];

        downloadReport({
            report,
            category,
            status: hasSummary ? (Number(summary.total || 0) > 0 ? 'con datos' : 'sin datos cargados') : 'fuente no disponible en esta sesión',
            summary: [
                { label: 'Períodos', value: hasSummary ? summary.total : '-' },
                { label: 'Subvista', value: hasSummary ? summary.currentSubview : '-' }
            ],
            data: markdownTable(['Métrica', 'Valor'], rows),
            observations: ['Resumen tomado del módulo de ciclos de período cuando está disponible.'],
            nextData: hasSummary && Number(summary.total || 0) > 0 ? '' : 'Ciclos de período cargados o actividad mensual visible.'
        });
    } catch (err) {
        console.warn('[AgroReportsCenter] Period stats fallback:', err);
        exportHonestUnavailable(report, category, 'Módulo de ciclos de período cargado con resumen público.');
    }
}

async function exportFinancialDetail(report, category) {
    let summary = typeof window !== 'undefined' ? window.__YG_AGRO_LAST_SUMMARY__ : null;
    if ((!summary || typeof summary !== 'object') && typeof window !== 'undefined' && typeof window.refreshAgroStats === 'function') {
        summary = await window.refreshAgroStats();
    }
    const hasSummary = summary && typeof summary === 'object';
    const rows = hasSummary ? [
        { Métrica: 'Ingresos cobrados', Valor: formatMoneyUsd(summary.incomeTotal) },
        { Métrica: 'Gastos directos', Valor: formatMoneyUsd(summary.directExpenseTotal ?? summary.expenseTotal) },
        { Métrica: 'Inversión base', Valor: formatMoneyUsd(summary.cropsInvestmentTotal) },
        { Métrica: 'Fiados', Valor: formatMoneyUsd(summary.pendingTotal) },
        { Métrica: 'Pérdidas', Valor: formatMoneyUsd(summary.lossesTotal) },
        { Métrica: 'Costos totales', Valor: formatMoneyUsd(summary.costTotal) },
        { Métrica: 'Rentabilidad', Valor: formatMoneyUsd(summary.profitNet) }
    ] : [];

    downloadReport({
        report,
        category,
        status: hasSummary ? (summary.hasData ? 'con datos' : 'sin datos cargados') : 'fuente no disponible en esta sesión',
        summary: [
            { label: 'Tiene datos', value: hasSummary && summary.hasData ? 'Sí' : 'No' },
            { label: 'Rentabilidad', value: hasSummary ? formatMoneyUsd(summary.profitNet) : '-' }
        ],
        data: markdownTable(['Métrica', 'Valor'], rows),
        observations: ['Montos leídos desde el resumen financiero global disponible en Agro.'],
        nextData: hasSummary ? '' : 'Resumen financiero global cargado.'
    });
}

const EXPORT_ACTIONS = Object.freeze({
    'export-selected-crop': exportSelectedCrop,
    'export-closed-cycles': exportClosedCycles,
    'export-cycle-comparison': exportCycleComparison,
    'export-cartera-viva': exportCarteraViva,
    'export-operational-wallet': exportOperationalWallet,
    'export-cart': exportCart,
    'export-clients': exportClients,
    'export-rankings': exportRankings,
    'export-task-cycles': exportTaskCycles,
    'export-agrorepo': exportAgroRepo,
    'export-global-stats': exportGlobalStats,
    'export-profile-global': exportProfileGlobal,
    'export-period-stats': exportPeriodStats,
    'export-financial-detail': exportFinancialDetail
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
