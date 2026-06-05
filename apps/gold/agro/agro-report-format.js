import {
    BUYER_PRIVACY_MASK,
    MONEY_PRIVACY_MASK,
    readBuyerNamesHidden,
    readMoneyValuesHidden
} from './agro-privacy.js';
import { normalizeBuyerGroupKey } from './agro-buyer-identity.js';

export function getMarkdownPrivacyState() {
    return {
        hideBuyerNames: readBuyerNamesHidden(),
        hideMoneyValues: readMoneyValuesHidden()
    };
}

export function normalizeReportClientKey(value) {
    const key = normalizeBuyerGroupKey(value);
    return key || '';
}

function scoreDisplayName(value) {
    const text = String(value || '').trim();
    if (!text) return 0;
    let score = text.length;
    if (/[A-ZÁÉÍÓÚÑ]/.test(text.charAt(0))) score += 4;
    if (/[áéíóúñÁÉÍÓÚÑ]/.test(text)) score += 3;
    if (/\s/.test(text)) score += 2;
    if (text === text.toLowerCase()) score -= 2;
    return score;
}

export function chooseReportClientName(current, candidate) {
    const currentText = String(current || '').trim();
    const candidateText = String(candidate || '').trim();
    if (!currentText) return candidateText || 'Sin cliente';
    if (!candidateText) return currentText;
    return scoreDisplayName(candidateText) > scoreDisplayName(currentText)
        ? candidateText
        : currentText;
}

export function maskReportName(value, privacy = getMarkdownPrivacyState(), fallback = 'Sin cliente') {
    if (privacy?.hideBuyerNames) return BUYER_PRIVACY_MASK;
    const text = String(value || '').trim();
    return text || fallback;
}

export function maskReportMoney(value, privacy = getMarkdownPrivacyState()) {
    if (privacy?.hideMoneyValues) return MONEY_PRIVACY_MASK;
    return String(value || '');
}

export function maskReportMetric(value, privacy = getMarkdownPrivacyState()) {
    if (privacy?.hideMoneyValues) return MONEY_PRIVACY_MASK;
    return String(value || '');
}

// ---------------------------------------------------------------------------
// Problem #3: Normalizar capitalización de nombres de clientes
// ---------------------------------------------------------------------------

export function normalizeReportClientName(name) {
    const text = String(name || '').trim();
    if (!text) return 'Sin cliente';
    return text.split(/\s+/).map(word => {
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

// ---------------------------------------------------------------------------
// Problem #4: Sanitizar emojis acumulados en nombres de cultivos
// ---------------------------------------------------------------------------

const _CROP_EMOJI_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
const _CROP_TEXT_RE = /[\p{L}\p{N}]/u;

export function sanitizeCropDisplayName(rawName) {
    const name = String(rawName || '').trim();
    if (!name) return 'Sin nombre';
    const tokens = name.split(/\s+/).filter(Boolean);
    const clean = [];
    for (const t of tokens) {
        if (_CROP_EMOJI_RE.test(t) && !_CROP_TEXT_RE.test(t)) continue;
        clean.push(t);
    }
    return clean.join(' ').trim() || 'Sin nombre';
}

export function resolvePendingTransferDestination(row) {
    const direct = String(row?.transferred_to || '').trim().toLowerCase();
    if (direct === 'income' || direct === 'ingreso' || direct === 'ingresos' || direct === 'pagado' || direct === 'pagados') {
        return 'pagado';
    }
    if (direct === 'losses' || direct === 'loss' || direct === 'perdida' || direct === 'pérdida' || direct === 'perdidas' || direct === 'pérdidas') {
        return 'pérdida';
    }
    if (direct && direct !== 'active' && direct !== 'transferred') return direct;

    const state = String(row?.transfer_state || '').trim().toLowerCase();
    if (state === 'active') return 'pagado/pérdida';
    if (state === 'transferred') return 'pagado/pérdida';
    if (row?.transferred_income_id || row?.transferred_at) return 'pagado/pérdida';
    return 'pagado/pérdida';
}
