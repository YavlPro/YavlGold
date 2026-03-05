const UNIT_TOTAL_ORDER = ['sacos', 'kilogramos', 'cestas'];
const UNIT_TYPE_FIELDS = ['unit_type', 'unitType', 'unit', 'measure', 'measure_unit', 'unit_name'];
const UNIT_QTY_STRICT_FIELDS = ['unit_qty', 'unitQty'];
const UNIT_QTY_LOOSE_FIELDS = ['qty', 'quantity', 'units', 'amount_units'];
const KG_QTY_FIELDS = ['quantity_kg', 'quantityKg', 'kg', 'kilogramos'];
const CONCEPT_FIELDS = ['concepto', 'concept'];
const CROP_ID_FIELDS = ['crop_id', 'cropId'];

function normalizeToken(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function readField(item, fields) {
    if (!item || typeof item !== 'object' || !Array.isArray(fields)) return null;
    for (const field of fields) {
        const value = item[field];
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' && value.trim() === '') continue;
        return value;
    }
    return null;
}

function toSafeLocaleNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    const raw = String(value).trim();
    if (!raw) return null;

    const sanitized = raw
        .replace(/\s+/g, '')
        .replace(/\.(?=\d{3}(?:\D|$))/g, '')
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '');
    if (!sanitized || sanitized === '-' || sanitized === '.') return null;

    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : null;
}

function roundTo(value, digits = 3) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    const factor = 10 ** digits;
    return Math.round(n * factor) / factor;
}

function isIntegerLike(value) {
    return Math.abs(value - Math.round(value)) < 1e-9;
}

function formatQuantityValue(value, decimals = 2) {
    const safe = Number(value);
    if (!Number.isFinite(safe)) return '0';
    const normalized = isIntegerLike(safe) ? safe : Number(safe.toFixed(decimals));
    if (isIntegerLike(normalized)) return String(Math.round(normalized));
    return String(normalized);
}

export function createUnitTotalsAccumulator() {
    return {
        sacos: 0,
        kilogramos: 0,
        cestas: 0
    };
}

export function hasPositiveUnitTotals(totals) {
    if (!totals || typeof totals !== 'object') return false;
    return UNIT_TOTAL_ORDER.some((key) => Number(totals[key] || 0) > 0);
}

export function addUnitTotals(target, source) {
    if (!target || typeof target !== 'object' || !source || typeof source !== 'object') return;
    target.sacos += Number(source.sacos || 0);
    target.kilogramos += Number(source.kilogramos || 0);
    target.cestas += Number(source.cestas || 0);
}

export function normalizeHistoryUnitKey(rawUnit) {
    const value = normalizeToken(rawUnit).trim();
    if (!value) return '';
    if (value === 'saco' || value === 'sacos') return 'sacos';
    if (value === 'cesta' || value === 'cestas') return 'cestas';
    if (
        value === 'kg'
        || value === 'kgs'
        || value === 'kilogramo'
        || value === 'kilogramos'
        || value === 'kilogram'
        || value === 'kilograms'
    ) {
        return 'kilogramos';
    }
    return '';
}

function normalizeSplitMeta(raw) {
    if (!raw) return null;
    let parsed = raw;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch (_error) {
            return null;
        }
    }
    if (!parsed || typeof parsed !== 'object') return null;
    const typeToken = String(parsed.type || '').trim().toLowerCase();
    if (typeToken && typeToken !== 'partial_transfer') return null;

    const qtyTotal = toSafeLocaleNumber(parsed.qty_total);
    const qtyMoved = toSafeLocaleNumber(parsed.qty_moved);
    const qtyLeft = toSafeLocaleNumber(parsed.qty_left);

    return {
        role: String(parsed.role || '').trim().toLowerCase() === 'destination' ? 'destination' : 'origin',
        unit_type: String(parsed.unit_type || '').trim().toLowerCase(),
        qty_total: qtyTotal,
        qty_moved: qtyMoved,
        qty_left: qtyLeft
    };
}

function parseExpenseConceptUnitMeta(concept) {
    const raw = String(concept || '').trim();
    if (!raw) {
        return { unit_type: '', unit_qty: null, quantity_kg: null };
    }

    const plainKg = raw.match(/(-?\d+(?:[.,]\d+)?)\s*(kg|kgs|kilogramos?|kilograms?)\b/i);
    if (plainKg) {
        const kgValue = toSafeLocaleNumber(plainKg[1]);
        if (kgValue !== null && kgValue > 0) {
            return { unit_type: '', unit_qty: null, quantity_kg: kgValue };
        }
    }

    const plainUnit = raw.match(/(-?\d+(?:[.,]\d+)?)\s*(sacos?|cestas?)\b/i);
    if (plainUnit) {
        const qtyValue = toSafeLocaleNumber(plainUnit[1]);
        if (qtyValue !== null && qtyValue > 0) {
            const unitToken = String(plainUnit[2] || '').trim().toLowerCase();
            return {
                unit_type: unitToken.startsWith('cesta') ? 'cesta' : 'saco',
                unit_qty: qtyValue,
                quantity_kg: null
            };
        }
    }

    const parts = raw.split('·').map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 1) {
        return { unit_type: '', unit_qty: null, quantity_kg: null };
    }

    let unitType = '';
    let unitQty = null;
    let kgQty = null;
    for (let i = 1; i < parts.length; i += 1) {
        const part = parts[i];
        const kgMatch = part.match(/^(-?\d+(?:[.,]\d+)?)\s*kg$/i);
        if (kgMatch) {
            const parsedKg = toSafeLocaleNumber(kgMatch[1]);
            if (parsedKg !== null && parsedKg > 0) {
                kgQty = parsedKg;
                continue;
            }
        }
        const unitMatch = part.match(/^(-?\d+(?:[.,]\d+)?)\s+(.+)$/);
        if (!unitMatch) continue;
        const parsedQty = toSafeLocaleNumber(unitMatch[1]);
        if (!(parsedQty !== null && parsedQty > 0)) continue;
        const normalized = normalizeHistoryUnitKey(unitMatch[2]);
        if (!normalized) continue;
        unitType = normalized === 'kilogramos' ? 'kg' : normalized.replace(/s$/u, '');
        unitQty = parsedQty;
    }

    return {
        unit_type: unitType,
        unit_qty: unitQty,
        quantity_kg: kgQty
    };
}

function resolveSplitMetaUnitFallback(row) {
    const meta = normalizeSplitMeta(readField(row, ['split_meta']));
    if (!meta) return { unitType: '', unitQty: null };
    const unitType = String(meta.unit_type || '').trim().toLowerCase();
    let unitQty = meta.role === 'destination'
        ? toSafeLocaleNumber(meta.qty_moved)
        : toSafeLocaleNumber(meta.qty_left);
    if (!(unitQty !== null && unitQty > 0)) {
        unitQty = toSafeLocaleNumber(meta.qty_total);
    }
    return {
        unitType,
        unitQty: unitQty !== null && unitQty > 0 ? unitQty : null
    };
}

function resolveConceptUnitFallback(row) {
    const parsed = parseExpenseConceptUnitMeta(readField(row, CONCEPT_FIELDS));
    return {
        unitType: String(parsed?.unit_type || '').trim().toLowerCase(),
        unitQty: toSafeLocaleNumber(parsed?.unit_qty),
        kgQty: toSafeLocaleNumber(parsed?.quantity_kg)
    };
}

function accumulateRowUnitTotals(target, row) {
    if (!target || typeof target !== 'object' || !row || typeof row !== 'object') return;

    const unitTypeDirect = readField(row, UNIT_TYPE_FIELDS);
    const unitQtyStrict = toSafeLocaleNumber(readField(row, UNIT_QTY_STRICT_FIELDS));
    const unitQtyLoose = toSafeLocaleNumber(readField(row, UNIT_QTY_LOOSE_FIELDS));
    const kgDirect = toSafeLocaleNumber(readField(row, KG_QTY_FIELDS));
    const splitFallback = resolveSplitMetaUnitFallback(row);
    const conceptFallback = resolveConceptUnitFallback(row);

    let unitTypeRaw = unitTypeDirect;
    if (String(unitTypeRaw || '').trim() === '') {
        unitTypeRaw = splitFallback.unitType || conceptFallback.unitType || '';
    }

    let unitQty = unitQtyStrict;
    if (!(unitQty !== null && unitQty > 0)) {
        if (splitFallback.unitQty !== null && splitFallback.unitQty > 0) {
            unitQty = splitFallback.unitQty;
        } else if (conceptFallback.unitQty !== null && conceptFallback.unitQty > 0) {
            unitQty = conceptFallback.unitQty;
        } else if (String(unitTypeRaw || '').trim() !== '' && unitQtyLoose !== null && unitQtyLoose > 0) {
            unitQty = unitQtyLoose;
        }
    }

    let kgQty = kgDirect;
    if (!(kgQty !== null && kgQty > 0) && conceptFallback.kgQty !== null && conceptFallback.kgQty > 0) {
        kgQty = conceptFallback.kgQty;
    }

    const unitKey = normalizeHistoryUnitKey(unitTypeRaw);
    if (unitKey && unitQty !== null && unitQty > 0) {
        target[unitKey] += unitQty;
    }

    const shouldAddKgFromDedicatedField = kgQty !== null && kgQty > 0 && !unitKey;
    if (shouldAddKgFromDedicatedField) {
        target.kilogramos += kgQty;
    }
}

export function computeUnitTotalsFromRows(rows) {
    const totals = createUnitTotalsAccumulator();
    const list = Array.isArray(rows) ? rows : [];
    list.forEach((row) => accumulateRowUnitTotals(totals, row));
    UNIT_TOTAL_ORDER.forEach((unitKey) => {
        totals[unitKey] = roundTo(Math.max(Number(totals[unitKey] || 0), 0), 3);
    });
    return totals;
}

function normalizeCropId(value) {
    if (value === undefined || value === null) return '';
    const token = String(value).trim();
    return token || '';
}

export function computeUnitTotalsByCropFromRows(rows) {
    const map = new Map();
    const list = Array.isArray(rows) ? rows : [];
    list.forEach((row) => {
        const cropId = normalizeCropId(readField(row, CROP_ID_FIELDS)) || '__no_crop__';
        const bucket = map.get(cropId) || createUnitTotalsAccumulator();
        accumulateRowUnitTotals(bucket, row);
        if (hasPositiveUnitTotals(bucket)) {
            map.set(cropId, bucket);
        }
    });
    return map;
}

export function mergeUnitTotalsMaps(maps = []) {
    const merged = new Map();
    (Array.isArray(maps) ? maps : []).forEach((map) => {
        if (!(map instanceof Map)) return;
        map.forEach((totals, cropId) => {
            const key = normalizeCropId(cropId) || '__no_crop__';
            const bucket = merged.get(key) || createUnitTotalsAccumulator();
            addUnitTotals(bucket, totals);
            if (hasPositiveUnitTotals(bucket)) {
                merged.set(key, bucket);
            }
        });
    });
    return merged;
}

export function mergeUnitTotalsPreferHigher(baseTotalsByCrop, pendingTransferredTotalsByCrop) {
    const merged = mergeUnitTotalsMaps([baseTotalsByCrop]);
    if (!(pendingTransferredTotalsByCrop instanceof Map)) return merged;

    pendingTransferredTotalsByCrop.forEach((pendingTotals, cropId) => {
        const key = normalizeCropId(cropId) || '__no_crop__';
        const current = merged.get(key) || createUnitTotalsAccumulator();
        const pending = pendingTotals || createUnitTotalsAccumulator();
        const next = createUnitTotalsAccumulator();
        next.sacos = Math.max(Number(current.sacos || 0), Number(pending.sacos || 0));
        next.kilogramos = Math.max(Number(current.kilogramos || 0), Number(pending.kilogramos || 0));
        next.cestas = Math.max(Number(current.cestas || 0), Number(pending.cestas || 0));
        if (hasPositiveUnitTotals(next)) {
            merged.set(key, next);
        }
    });

    return merged;
}

export function sumUnitTotalsFromMap(totalsByCrop) {
    const total = createUnitTotalsAccumulator();
    if (!(totalsByCrop instanceof Map)) return total;
    totalsByCrop.forEach((value) => addUnitTotals(total, value));
    UNIT_TOTAL_ORDER.forEach((unitKey) => {
        total[unitKey] = roundTo(Math.max(Number(total[unitKey] || 0), 0), 3);
    });
    return total;
}

export function getPendingTransferToken(row) {
    const explicit = String(
        row?.transfer_state
        ?? row?.transfer_type
        ?? row?.transferType
        ?? ''
    ).trim().toLowerCase();
    if (explicit === 'transferred') return 'transferred';
    if (explicit === 'reverted' || explicit === 'reverted_to_pending') return 'reverted';
    if (row?.reverted_at || row?.reverted_reason) return 'reverted';
    if (row?.transferred_at || row?.transferred_income_id || row?.transferred_to_id || String(row?.transferred_to || '').trim()) {
        return 'transferred';
    }
    return explicit;
}

function formatUnitLine(unitKey, value) {
    const safe = Number(value);
    if (!Number.isFinite(safe) || safe <= 0) return '';
    const qtyText = formatQuantityValue(safe, isIntegerLike(safe) ? 0 : 2);
    if (unitKey === 'kilogramos') return `${qtyText} kg`;
    if (unitKey === 'sacos') return `${qtyText} ${Math.abs(safe - 1) < 1e-9 ? 'saco' : 'sacos'}`;
    if (unitKey === 'cestas') return `${qtyText} ${Math.abs(safe - 1) < 1e-9 ? 'cesta' : 'cestas'}`;
    return `${qtyText} ${unitKey}`;
}

export function formatUnitTotalsMarkdown(totals, options = {}) {
    if (!hasPositiveUnitTotals(totals)) return '';
    const heading = String(options?.heading || '## 📦 Unidades').trim() || '## 📦 Unidades';
    const lines = [heading];
    UNIT_TOTAL_ORDER.forEach((unitKey) => {
        const value = Number(totals?.[unitKey] || 0);
        const line = formatUnitLine(unitKey, value);
        if (!line) return;
        lines.push(`- ${line}`);
    });
    return `${lines.join('\n')}\n\n`;
}
