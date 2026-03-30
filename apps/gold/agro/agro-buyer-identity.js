const ACCENT_STRIP_RE = /[\u0300-\u036f]/g;
const SPACE_COLLAPSE_RE = /\s+/g;
const INCOME_BUYER_RE = /^Venta a\s+(.+?)\s+-\s+.+$/i;
const LABELED_BUYER_RE = /(?:Cliente|Comprador):\s*(.+)$/i;
const LOSS_CONCEPT_RE = /^.+?\s+-\s+Causa(?:\/Responsable)?:\s*(.+)$/i;
const LOSS_CAUSE_CLIENT_RE = /Cliente:\s*(.+)$/i;

const PLACEHOLDER_TOKENS = new Set([
    '',
    'cliente general',
    'beneficiario general',
    'sin causa especificada',
    'sin comprador',
    'sin nombre'
]);

export const BUYER_MATCH_STATUS = Object.freeze({
    MATCHED: 'matched',
    REVIEW_REQUIRED: 'legacy_review_required',
    UNCLASSIFIED: 'legacy_unclassified'
});

function collapseSpaces(value) {
    return String(value || '').replace(SPACE_COLLAPSE_RE, ' ').trim();
}

function cleanBuyerName(value) {
    const safe = collapseSpaces(value);
    if (!safe) return '';
    const normalized = safe
        .normalize('NFD')
        .replace(ACCENT_STRIP_RE, '')
        .toLowerCase();
    if (PLACEHOLDER_TOKENS.has(normalized)) return '';
    return safe;
}

function extractMatch(text, regex) {
    const safeText = String(text || '').trim();
    if (!safeText) return '';
    const match = safeText.match(regex);
    return cleanBuyerName(match?.[1] || '');
}

export function normalizeBuyerGroupKey(value) {
    const raw = cleanBuyerName(value);
    if (!raw) return '';
    return raw
        .normalize('NFD')
        .replace(ACCENT_STRIP_RE, '')
        .toLowerCase()
        .replace(SPACE_COLLAPSE_RE, ' ')
        .trim();
}

export function isBuyerIdentityRelevantTab(tabName) {
    const safeTab = String(tabName || '').trim().toLowerCase();
    return safeTab === 'pendientes' || safeTab === 'ingresos' || safeTab === 'perdidas';
}

export function extractBuyerIdentityCandidate({
    tabName,
    concept = '',
    whoValue = '',
    buyerHint = '',
    cause = '',
    originTable = ''
} = {}) {
    const safeTab = String(tabName || '').trim().toLowerCase();
    const safeOrigin = String(originTable || '').trim().toLowerCase();
    const directName = cleanBuyerName(whoValue) || cleanBuyerName(buyerHint);

    if (safeTab === 'pendientes') {
        const rawName = directName || extractMatch(concept, LABELED_BUYER_RE);
        return {
            rawName,
            groupKey: normalizeBuyerGroupKey(rawName),
            status: rawName ? BUYER_MATCH_STATUS.MATCHED : BUYER_MATCH_STATUS.REVIEW_REQUIRED
        };
    }

    if (safeTab === 'ingresos') {
        const rawName = directName || extractMatch(concept, INCOME_BUYER_RE) || extractMatch(concept, LABELED_BUYER_RE);
        return {
            rawName,
            groupKey: normalizeBuyerGroupKey(rawName),
            status: rawName ? BUYER_MATCH_STATUS.MATCHED : BUYER_MATCH_STATUS.REVIEW_REQUIRED
        };
    }

    if (safeTab === 'perdidas') {
        if (safeOrigin === 'agro_pending') {
            const rawName = directName
                || extractMatch(cause, LOSS_CAUSE_CLIENT_RE)
                || extractMatch(concept, LOSS_CONCEPT_RE)
                || extractMatch(concept, LABELED_BUYER_RE);
            return {
                rawName,
                groupKey: normalizeBuyerGroupKey(rawName),
                status: rawName ? BUYER_MATCH_STATUS.MATCHED : BUYER_MATCH_STATUS.REVIEW_REQUIRED
            };
        }

        const explicitLegacyName = directName
            || extractMatch(cause, LOSS_CAUSE_CLIENT_RE)
            || extractMatch(concept, LABELED_BUYER_RE);
        return {
            rawName: explicitLegacyName,
            groupKey: normalizeBuyerGroupKey(explicitLegacyName),
            status: explicitLegacyName ? BUYER_MATCH_STATUS.REVIEW_REQUIRED : BUYER_MATCH_STATUS.UNCLASSIFIED
        };
    }

    return {
        rawName: '',
        groupKey: '',
        status: null
    };
}

export async function ensureBuyerIdentityLink({
    supabase,
    userId,
    tabName,
    concept = '',
    whoValue = '',
    buyerHint = '',
    cause = '',
    originTable = ''
} = {}) {
    const candidate = extractBuyerIdentityCandidate({
        tabName,
        concept,
        whoValue,
        buyerHint,
        cause,
        originTable
    });

    if (!candidate?.status) {
        return {};
    }

    const fallbackPayload = {
        buyer_id: null,
        buyer_group_key: candidate.groupKey || null,
        buyer_match_status: candidate.status
    };

    if (candidate.status !== BUYER_MATCH_STATUS.MATCHED || !candidate.groupKey || !supabase || !userId) {
        return fallbackPayload;
    }

    try {
        const safeUserId = String(userId || '').trim();
        const existing = await supabase
            .from('agro_buyers')
            .select('id')
            .eq('user_id', safeUserId)
            .eq('group_key', candidate.groupKey)
            .maybeSingle();

        if (existing.error) {
            throw existing.error;
        }

        if (existing.data?.id) {
            return {
                buyer_id: existing.data.id,
                buyer_group_key: candidate.groupKey,
                buyer_match_status: BUYER_MATCH_STATUS.MATCHED
            };
        }

        const inserted = await supabase
            .from('agro_buyers')
            .insert([{
                user_id: safeUserId,
                display_name: candidate.rawName || 'Comprador',
                group_key: candidate.groupKey,
                canonical_name: candidate.groupKey,
                status: 'active'
            }])
            .select('id')
            .single();

        if (inserted.error) {
            throw inserted.error;
        }

        return {
            buyer_id: inserted.data?.id || null,
            buyer_group_key: candidate.groupKey,
            buyer_match_status: inserted.data?.id
                ? BUYER_MATCH_STATUS.MATCHED
                : BUYER_MATCH_STATUS.REVIEW_REQUIRED
        };
    } catch (error) {
        console.warn('[AGRO][BUYER_IDENTITY] ensure link fallback:', error?.message || error);
        return {
            buyer_id: null,
            buyer_group_key: candidate.groupKey || null,
            buyer_match_status: BUYER_MATCH_STATUS.REVIEW_REQUIRED
        };
    }
}
