import {
    formatHistoryAbsoluteDayLabel,
    groupHistoryRowsByDay
} from './agro-facturero-clientes.js';
import { normalizeReportClientName } from './agro-report-format.js';
import { readBuyerNamesHidden, readMoneyValuesHidden } from './agro-privacy.js';

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

// Privacidad (MANIFIESTO §8): los exportes MD respetan los mismos controles
// "ocultar nombres" / "ocultar montos" que la UI. Nunca exportan en claro lo
// que el usuario pidió ocultar.
function privacyName(value) {
    if (readBuyerNamesHidden()) return 'Cliente oculto';
    return String(value ?? '').trim() || 'Cliente';
}

function privacyMoney(value) {
    if (readMoneyValuesHidden()) return '$ ···';
    return formatMoney(value);
}

function privacyPercent(value) {
    if (readMoneyValuesHidden()) return '···';
    return formatPercent(value);
}

function formatPercent(value) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return 'Sin lectura';
    return `${nextValue.toFixed(0)}%`;
}

function getReviewTotal(buyerRow) {
    return Number(buyerRow?.review_required_total || 0) + Number(buyerRow?.legacy_unclassified_total || 0);
}

function resolveBuyerStatus(buyerRow) {
    const pending = Number(buyerRow?.pending_total || 0);
    const paid = Number(buyerRow?.paid_total || 0);
    const loss = Number(buyerRow?.loss_total || 0);
    const review = getReviewTotal(buyerRow);

    if (pending > 0) return paid > 0 ? 'Cobro en curso' : 'Fiado activo';
    if (paid > 0) return 'Pagado';
    if (loss > 0) return 'Pérdida';
    if (review > 0) return 'Por revisar';
    return 'Seguimiento';
}

function sanitizeFileToken(value) {
    return String(value || 'cliente')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        || 'cliente';
}

function getDateStamp(date = new Date()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatExportTimestamp(date = new Date()) {
    return new Intl.DateTimeFormat('es-VE', {
        dateStyle: 'long',
        timeStyle: 'short'
    }).format(date);
}

function buildReviewSectionLines(buyerRow) {
    const lines = [
        `- Por revisar: ${privacyMoney(buyerRow?.review_required_total)}`,
        `- Registros antiguos por ordenar: ${privacyMoney(buyerRow?.legacy_unclassified_total)}`
    ];

    if (Number(buyerRow?.non_debt_income_total || 0) > 0) {
        lines.push(`- Ingreso aparte: ${privacyMoney(buyerRow?.non_debt_income_total)}`);
    }

    if (Number(buyerRow?.transferred_total || 0) > 0) {
        lines.push(`- Movido fuera de cartera: ${privacyMoney(buyerRow?.transferred_total)}`);
    }

    if (Number(buyerRow?.balance_gap_total || 0) !== 0) {
        lines.push(`- Diferencia pendiente por cuadrar: ${privacyMoney(buyerRow?.balance_gap_total)}`);
    }

    return lines;
}

function getHistoryConfidenceLabel(row) {
    return row?.is_review ? 'Por revisar' : 'Confirmado';
}

function buildHistoryLines(rows) {
    if (!Array.isArray(rows) || rows.length <= 0) {
        return [
            '## Historial contextual',
            '',
            '_No hay historial contextual exportable para este cliente._'
        ];
    }

    const groups = groupHistoryRowsByDay(rows, 'fecha');
    const lines = ['## Historial contextual', ''];

    groups.forEach((group) => {
        lines.push(`### ${formatHistoryAbsoluteDayLabel(group?.dayKey)}`);
        lines.push('');

        (group?.rows || []).forEach((row) => {
            lines.push(`- **${row?.label || 'Movimiento'}** · ${privacyMoney(row?.amount)}`);
            lines.push(`  - Registro: ${row?.title || 'Movimiento del cliente'}`);
            lines.push(`  - Estado: ${getHistoryConfidenceLabel(row)}`);
            if (row?.meta) {
                lines.push(`  - Contexto: ${row.meta}`);
            }
            if (row?.concept) {
                lines.push(`  - Concepto: ${row.concept}`);
            }
            if (row?.note) {
                lines.push(`  - Nota: ${row.note}`);
            }
            if (row?.support_url_resolved) {
                lines.push(`  - Soporte: [Abrir](${row.support_url_resolved})`);
            }
        });

        lines.push('');
    });

    return lines;
}

export function buildBuyerPortfolioExportMarkdown({ buyerRow, historyRows, exportedAt = new Date() } = {}) {
    if (!buyerRow || typeof buyerRow !== 'object') {
        throw new TypeError('buildBuyerPortfolioExportMarkdown requires a buyer summary row.');
    }

    const reviewLines = buildReviewSectionLines(buyerRow);
    const historyLines = buildHistoryLines(historyRows);

    return [
        `# Cartera de clientes — ${privacyName(buyerRow.display_name || 'Cliente')}`,
        '',
        `- Fecha de exportación: ${formatExportTimestamp(exportedAt)}`,
        `- Estado: ${resolveBuyerStatus(buyerRow)}`,
        `- Requiere revisión: ${buyerRow.requires_review ? 'Sí' : 'No'}`,
        '',
        '## Resumen de cartera',
        '',
        `- Fiado: ${privacyMoney(buyerRow.credited_total)}`,
        `- Cobrado: ${privacyMoney(buyerRow.paid_total)}`,
        `- Pérdida: ${privacyMoney(buyerRow.loss_total)}`,
        `- Falta por cobrar: ${privacyMoney(buyerRow.pending_total)}`,
        `- Cumplimiento: ${privacyPercent(buyerRow.compliance_percent)}`,
        '',
        '## Movimientos separados',
        '',
        ...reviewLines,
        '',
        ...historyLines,
        '',
        '---',
        'Generado por YavlGold Agro · Facturero de Clientes'
    ].join('\n');
}

export function buildBuyerPortfolioExportFilename(buyerRow, exportedAt = new Date()) {
    if (!buyerRow || typeof buyerRow !== 'object') {
        throw new TypeError('buildBuyerPortfolioExportFilename requires a buyer summary row.');
    }

    // Con nombres ocultos, el nombre de archivo tampoco puede exponerlos.
    const nameToken = readBuyerNamesHidden()
        ? 'cliente'
        : (buyerRow.display_name || buyerRow.group_key);
    return `cartera-viva-${sanitizeFileToken(nameToken)}-${getDateStamp(exportedAt)}.md`;
}

export function downloadBuyerPortfolioExport({ buyerRow, historyRows, exportedAt = new Date() } = {}) {
    const markdown = buildBuyerPortfolioExportMarkdown({ buyerRow, historyRows, exportedAt });
    const filename = buildBuyerPortfolioExportFilename(buyerRow, exportedAt);
    const blob = new Blob(['\ufeff' + markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return filename;
}

// ---------------------------------------------------------------------------
// F2 — Global list export (table summary, no per-client movement detail)
// ---------------------------------------------------------------------------

/**
 * Builds the scope label for the list export header.
 * @param {{ farmName?: string|null, cropName?: string|null }} opts
 */
function buildListExportScopeLabel({ farmName, cropName } = {}) {
    if (cropName) return `Cultivo: ${cropName}`;
    if (farmName) return `Finca: ${farmName}`;
    return 'Vista general';
}

/**
 * Generates a Markdown table summary of the visible client list.
 * Respects active filters (category + search + farm/crop).
 * Does NOT include per-client movement detail — that lives in the individual export.
 *
 * @param {{ rows: object[], farmName?: string|null, cropName?: string|null, activeCategory?: string, exportedAt?: Date }} opts
 */
export function buildBuyerListExportMarkdown({ rows, farmName, cropName, activeCategory, exportedAt = new Date() } = {}) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const scopeLabel = buildListExportScopeLabel({ farmName, cropName });

    const lines = [
        `# Cartera de Clientes — ${scopeLabel}`,
        '',
        `- Fecha de exportación: ${formatExportTimestamp(exportedAt)}`,
        `- Alcance: ${scopeLabel}`,
        activeCategory && activeCategory !== 'todos'
            ? `- Categoría: ${activeCategory}`
            : `- Categoría: Todas`,
        `- Clientes visibles: ${safeRows.length}`,
        '',
        '## Resumen por cliente',
        '',
        '| Cliente | Categoría | Fiado | Cobrado | Pérdida | Cumplimiento |',
        '|---------|-----------|------:|--------:|--------:|-------------:|',
    ];

    let totalCredited = 0;
    let totalPaid = 0;
    let totalLoss = 0;

    safeRows.forEach((row) => {
        // Cambio 1: normaliza capitalización del nombre (agro-report-format.js).
        // Solo el texto del nombre; cifras y totales sin tocar.
        // Con nombres ocultos, el export respeta la privacidad (§8 MANIFIESTO).
        const rawName = String(row?.display_name || row?.canonical_name || 'Sin nombre').trim();
        const name = readBuyerNamesHidden()
            ? 'Cliente oculto'
            : normalizeReportClientName(rawName);
        const category = resolveExportCategory(row);
        const credited = Number(row?.credited_total || 0);
        const paid = Number(row?.paid_total || 0);
        const loss = Number(row?.loss_total || 0);
        const compliance = readMoneyValuesHidden()
            ? '···'
            : (row?.compliance_percent !== null && row?.compliance_percent !== undefined
                ? `${Number(row.compliance_percent).toFixed(0)}%`
                : 'N/A');
        totalCredited += credited;
        totalPaid += paid;
        totalLoss += loss;
        lines.push(
            `| ${escapeListMd(name)} | ${escapeListMd(category)} | ${privacyMoney(credited)} | ${privacyMoney(paid)} | ${privacyMoney(loss)} | ${compliance} |`
        );
    });

    lines.push('');
    lines.push('## Totales');
    lines.push('');
    lines.push(`| Fiado total | Cobrado total | Pérdida total |`);
    lines.push(`|------------:|-------------:|--------------:|`);
    lines.push(`| ${privacyMoney(totalCredited)} | ${privacyMoney(totalPaid)} | ${privacyMoney(totalLoss)} |`);
    lines.push('');
    lines.push('---');
    lines.push('> Para el historial detallado de cada cliente, usa el export individual en el detalle del cliente.');
    if (farmName) {
        lines.push(`> Esta vista incluye solo movimientos asociados a cultivos de **${farmName}**. La Vista general incluye movimientos sin asociar (legacy).`);
    }
    lines.push('> Generado por YavlGold Agro · Facturero de Clientes');

    return lines.join('\n');
}

function escapeListMd(value) {
    return String(value || '').replace(/\|/g, '·').replace(/\n/g, ' ');
}

function resolveExportCategory(row) {
    const pending = Number(row?.pending_total || 0);
    const paid = Number(row?.paid_total || 0);
    const loss = Number(row?.loss_total || 0);
    const review = Number(row?.review_required_total || 0) + Number(row?.legacy_unclassified_total || 0);
    if (pending > 0) return 'Fiados';
    if (paid > 0 && !pending && !loss) return 'Pagados';
    if (loss > 0) return 'Pérdidas';
    if (review > 0) return 'Por revisar';
    return 'Sin registro';
}

/**
 * Builds the filename for the list export.
 * Avoids filename collision between scopes on the same date by including the scope token.
 */
export function buildBuyerListExportFilename({ farmName, cropName, exportedAt = new Date() } = {}) {
    const dateStamp = getDateStamp(exportedAt);
    if (cropName) return `cartera-lista-cultivo-${sanitizeFileToken(cropName)}-${dateStamp}.md`;
    if (farmName) return `cartera-lista-finca-${sanitizeFileToken(farmName)}-${dateStamp}.md`;
    return `cartera-lista-vista-general-${dateStamp}.md`;
}

/**
 * Downloads the global list export as a Markdown file.
 * Reuses the same BOM + Blob + link pattern as downloadBuyerPortfolioExport (V-D verified).
 */
export function downloadBuyerListExport({ rows, farmName, cropName, activeCategory, exportedAt = new Date() } = {}) {
    const markdown = buildBuyerListExportMarkdown({ rows, farmName, cropName, activeCategory, exportedAt });
    const filename = buildBuyerListExportFilename({ farmName, cropName, exportedAt });
    const blob = new Blob(['\ufeff' + markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return filename;
}
