export {
    BUYER_MATCH_STATUS,
    ensureBuyerIdentityLink,
    extractBuyerIdentityCandidate,
    isBuyerIdentityRelevantTab,
    normalizeBuyerGroupKey
} from './agro-buyer-identity.js';

export function normalizeHistorySearchToken(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function readHistoryItemField(item, fields) {
    if (!item || typeof item !== 'object' || !Array.isArray(fields)) return null;
    for (const field of fields) {
        const raw = item[field];
        if (raw === undefined || raw === null) continue;
        if (typeof raw === 'string' && raw.trim() === '') continue;
        return raw;
    }
    return null;
}

export function readHistoryItemFieldWithSource(item, fields) {
    if (!item || typeof item !== 'object' || !Array.isArray(fields)) {
        return { field: '', value: null };
    }
    for (const field of fields) {
        const raw = item[field];
        if (raw === undefined || raw === null) continue;
        if (typeof raw === 'string' && raw.trim() === '') continue;
        return { field: String(field || ''), value: raw };
    }
    return { field: '', value: null };
}

export function getHistoryRowTimestamp(row, dateFieldName = 'fecha') {
    const dateStr = row?.[dateFieldName] || row?.fecha || row?.date;
    if (dateStr && typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const datePart = dateStr.slice(0, 10);
        const [yyyy, mm, dd] = datePart.split('-').map(Number);
        const date = new Date(yyyy, mm - 1, dd, 12, 0, 0);
        return date.getTime();
    }

    if (row?.created_at) {
        const createdAt = Date.parse(row.created_at);
        if (!Number.isNaN(createdAt)) return createdAt;
    }

    if (row?.updated_at) {
        const updatedAt = Date.parse(row.updated_at);
        if (!Number.isNaN(updatedAt)) return updatedAt;
    }

    return 0;
}

export function getHistoryDayKey(row, dateFieldName = 'fecha') {
    const dateStr = row?.[dateFieldName] || row?.fecha || row?.date;
    if (dateStr && typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.slice(0, 10);
    }

    if (row?.created_at) {
        const createdAt = new Date(row.created_at);
        if (!Number.isNaN(createdAt.getTime())) {
            return `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
        }
    }

    return 'unknown';
}

export function formatHistoryAbsoluteDayLabel(dayKey) {
    if (dayKey === 'unknown') return 'Sin fecha';
    const [yyyy, mm, dd] = String(dayKey || '').split('-').map(Number);
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd) || !monthNames[mm - 1]) {
        return 'Sin fecha';
    }
    return `${dd} ${monthNames[mm - 1]} ${yyyy}`;
}

export function formatHistoryDayLabel(dayKey) {
    if (dayKey === 'unknown') return 'Sin fecha';
    const [yyyy, mm, dd] = String(dayKey || '').split('-').map(Number);
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd) || !monthNames[mm - 1]) {
        return 'Sin fecha';
    }

    const today = new Date();
    const isToday = today.getFullYear() === yyyy && (today.getMonth() + 1) === mm && today.getDate() === dd;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.getFullYear() === yyyy && (yesterday.getMonth() + 1) === mm && yesterday.getDate() === dd;

    if (isToday) return 'Hoy';
    if (isYesterday) return 'Ayer';
    return `${dd} ${monthNames[mm - 1]} ${yyyy}`;
}

export function groupHistoryRowsByDay(rows, dateFieldName = 'fecha') {
    const sorted = Array.isArray(rows)
        ? [...rows].sort((a, b) => getHistoryRowTimestamp(b, dateFieldName) - getHistoryRowTimestamp(a, dateFieldName))
        : [];

    const groups = new Map();
    sorted.forEach((row) => {
        const dayKey = getHistoryDayKey(row, dateFieldName);
        if (!groups.has(dayKey)) {
            groups.set(dayKey, []);
        }
        groups.get(dayKey).push(row);
    });

    return Array.from(groups.keys())
        .sort((a, b) => b.localeCompare(a))
        .map((dayKey) => ({
            dayKey,
            label: formatHistoryDayLabel(dayKey),
            rows: groups.get(dayKey) || []
        }));
}

export function renderHistoryDayGroups(listEl, rows, options = {}) {
    if (!listEl || typeof options.renderRow !== 'function') return;

    const dateFieldName = String(options.dateFieldName || 'fecha');
    const formatDayLabel = typeof options.formatDayLabel === 'function'
        ? options.formatDayLabel
        : formatHistoryAbsoluteDayLabel;
    const groups = groupHistoryRowsByDay(rows, dateFieldName);
    const fragment = document.createDocumentFragment();

    groups.forEach((group) => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'facturero-day-header date-divider';
        dayHeader.textContent = formatDayLabel(group?.dayKey);
        fragment.appendChild(dayHeader);

        (group?.rows || []).forEach((row) => {
            options.renderRow(fragment, row, group);
        });
    });

    listEl.appendChild(fragment);
}
