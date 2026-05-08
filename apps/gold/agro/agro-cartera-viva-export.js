import {
    formatHistoryAbsoluteDayLabel,
    groupHistoryRowsByDay
} from './agro-cartera-viva.js';

const CARTERA_VIVA_EXPORT_EPSILON = 0.000001;

function readPortfolioNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function isPositivePortfolioAmount(value) {
    return readPortfolioNumber(value) > CARTERA_VIVA_EXPORT_EPSILON;
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

function getReviewTotal(buyerRow) {
    return readPortfolioNumber(buyerRow?.review_required_total) + readPortfolioNumber(buyerRow?.legacy_unclassified_total);
}

function getOutstandingBalance(buyerRow) {
    const pendingTotal = readPortfolioNumber(buyerRow?.pending_total);
    const credited = readPortfolioNumber(buyerRow?.credited_total);
    const paid = readPortfolioNumber(buyerRow?.paid_total);
    const loss = readPortfolioNumber(buyerRow?.loss_total);
    const transferred = readPortfolioNumber(buyerRow?.transferred_total);
    const derivedBalance = Math.max(0, credited - paid - loss - transferred);
    const hasLedgerTotals = [credited, paid, loss, transferred].some(isPositivePortfolioAmount);
    const balance = hasLedgerTotals ? derivedBalance : Math.max(0, pendingTotal);
    return isPositivePortfolioAmount(balance) ? balance : 0;
}

function resolveBuyerStatus(buyerRow) {
    const pending = getOutstandingBalance(buyerRow);
    const paid = readPortfolioNumber(buyerRow?.paid_total);
    const loss = readPortfolioNumber(buyerRow?.loss_total);
    const review = getReviewTotal(buyerRow);

    if (isPositivePortfolioAmount(pending)) return isPositivePortfolioAmount(paid) ? 'Cobro en curso' : 'Fiado activo';
    if (isPositivePortfolioAmount(paid) && !isPositivePortfolioAmount(loss)) return 'Pagado';
    if (isPositivePortfolioAmount(loss)) return 'Pérdida';
    if (isPositivePortfolioAmount(review)) return 'Por revisar';
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
        `- Por revisar: ${formatMoney(buyerRow?.review_required_total)}`,
        `- Registros antiguos por ordenar: ${formatMoney(buyerRow?.legacy_unclassified_total)}`
    ];

    if (Number(buyerRow?.non_debt_income_total || 0) > 0) {
        lines.push(`- Ingreso aparte: ${formatMoney(buyerRow?.non_debt_income_total)}`);
    }

    if (Number(buyerRow?.transferred_total || 0) > 0) {
        lines.push(`- Movido fuera de cartera: ${formatMoney(buyerRow?.transferred_total)}`);
    }

    if (Number(buyerRow?.balance_gap_total || 0) !== 0) {
        lines.push(`- Diferencia pendiente por cuadrar: ${formatMoney(buyerRow?.balance_gap_total)}`);
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
            lines.push(`- **${row?.label || 'Movimiento'}** · ${formatMoney(row?.amount)}`);
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
        `# Cartera de clientes — ${buyerRow.display_name || 'Cliente'}`,
        '',
        `- Fecha de exportación: ${formatExportTimestamp(exportedAt)}`,
        `- Estado: ${resolveBuyerStatus(buyerRow)}`,
        `- Requiere revisión: ${buyerRow.requires_review ? 'Sí' : 'No'}`,
        '',
        '## Resumen de cartera',
        '',
        `- Fiado: ${formatMoney(buyerRow.credited_total)}`,
        `- Cobrado: ${formatMoney(buyerRow.paid_total)}`,
        `- Pérdida: ${formatMoney(buyerRow.loss_total)}`,
        `- Falta por cobrar: ${formatMoney(getOutstandingBalance(buyerRow))}`,
        `- Cumplimiento: ${formatPercent(buyerRow.compliance_percent)}`,
        '',
        '## Movimientos separados',
        '',
        ...reviewLines,
        '',
        ...historyLines,
        '',
        '---',
        'Generado por YavlGold Agro · Cartera Viva'
    ].join('\n');
}

export function buildBuyerPortfolioExportFilename(buyerRow, exportedAt = new Date()) {
    if (!buyerRow || typeof buyerRow !== 'object') {
        throw new TypeError('buildBuyerPortfolioExportFilename requires a buyer summary row.');
    }

    return `cartera-viva-${sanitizeFileToken(buyerRow.display_name || buyerRow.group_key)}-${getDateStamp(exportedAt)}.md`;
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
