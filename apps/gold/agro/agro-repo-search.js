export function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function buildSearchableNodeText(node, resolveLabel = () => '') {
    return normalizeSearchText([
        node?.title,
        node?.legacyPath,
        node?.type === 'file' ? node?.content : '',
        node?.type === 'file' ? resolveLabel(node) : ''
    ].join(' '));
}

export function nodeMatchesQuery(node, query, resolveLabel = () => '') {
    const safeQuery = normalizeSearchText(query);
    if (!safeQuery) return true;
    return buildSearchableNodeText(node, resolveLabel).includes(safeQuery);
}

export function buildNoteSnippet(content, maxLength = 132) {
    const safe = String(content || '').replace(/\s+/g, ' ').trim();
    if (!safe) return 'Sin contenido todavia.';
    if (safe.length <= maxLength) return safe;
    return `${safe.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

export function compareByUpdatedAt(left, right) {
    const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime();
    return rightTime - leftTime;
}

export function compareByName(left, right) {
    return String(left?.title || '').localeCompare(String(right?.title || ''), 'es', {
        sensitivity: 'base',
        numeric: true
    });
}

export function sortByMode(items, mode = 'updated') {
    const safe = Array.isArray(items) ? [...items] : [];
    if (mode === 'name') return safe.sort(compareByName);
    return safe.sort(compareByUpdatedAt);
}
