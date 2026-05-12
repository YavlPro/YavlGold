const QA_PATTERN = /^(?:QA_|QA\s|test_|prueba|admin_test|borrador|demo)/i;
const QA_FIELDS = ['name', 'client_name', 'concept', 'concepto', 'description', 'descripcion', 'notes', 'notas', 'variety', 'variedad'];

export function isQARow(row) {
    if (!row || typeof row !== 'object') return false;
    for (const field of QA_FIELDS) {
        const val = row[field];
        if (typeof val === 'string' && QA_PATTERN.test(val.trim())) return true;
    }
    return false;
}

export function filterQARows(rows, options = {}) {
    if (!Array.isArray(rows)) return [];
    return rows.filter((row) => !isQARow(row));
}

const EPSILON_CENTS = 1;

export function validateExportBundle(bundle) {
    const errors = [];
    if (!bundle || typeof bundle !== 'object') {
        return { valid: false, errors: ['Bundle vacío o inválido.'] };
    }
    const { rows, totals, currency } = bundle;
    if (!currency || typeof currency !== 'string') {
        errors.push('Moneda base no declarada.');
    }
    if (Array.isArray(rows) && rows.some(isQARow)) {
        errors.push('Filas QA residuales detectadas en el bundle.');
    }
    if (totals && typeof totals === 'object' && Array.isArray(rows)) {
        const sumCents = rows.reduce((s, r) => {
            const val = r.monto_usd ?? r.amount_usd ?? r.monto ?? r.amount ?? 0;
            return s + Math.round((Number(val) || 0) * 100);
        }, 0);
        const expectedCents = Math.round((Number(totals.incomeUsd ?? totals.total ?? 0)) * 100);
        if (expectedCents > 0 && Math.abs(sumCents - expectedCents) > EPSILON_CENTS) {
            errors.push(`Discrepancia numérica en totales: suma=$${(sumCents / 100).toFixed(2)}, esperado=$${(expectedCents / 100).toFixed(2)}.`);
        }
    }
    return { valid: errors.length === 0, errors };
}

export function showExportError(errors) {
    const msg = 'Error de integridad en reporte: ' + errors.join(', ');
    if (typeof window !== 'undefined' && window.YGUXMessages) {
        if (typeof window.YGUXMessages.popup === 'function') {
            window.YGUXMessages.popup({ type: 'error', title: 'Exportación cancelada', message: msg });
        } else {
            window.YGUXMessages.error(msg);
        }
    } else {
        console.error('[ReportGuard] ' + msg);
    }
}