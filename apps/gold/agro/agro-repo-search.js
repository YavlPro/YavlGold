import { getTemplateLabel } from './agro-repo-templates.js';

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function buildNoteSnippet(content, maxLength = 132) {
    const safe = String(content || '').replace(/\s+/g, ' ').trim();
    if (!safe) return 'Sin contenido todavia.';
    if (safe.length <= maxLength) return safe;
    return `${safe.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

export function sortNotesByUpdatedAt(notes) {
    return [...(Array.isArray(notes) ? notes : [])].sort((left, right) => {
        const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
        const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime();
        return rightTime - leftTime;
    });
}

export function filterNotes(notes, options = {}) {
    const query = normalizeText(options.query);
    const section = String(options.section || 'all').trim();

    return sortNotesByUpdatedAt(notes).filter((note) => {
        if (section !== 'all' && note?.templateKey !== section) return false;
        if (!query) return true;

        const haystack = normalizeText([
            note?.title,
            note?.content,
            note?.legacyPath,
            getTemplateLabel(note?.templateKey)
        ].join(' '));

        return haystack.includes(query);
    });
}

export function countNotesBySection(notes) {
    return (Array.isArray(notes) ? notes : []).reduce((accumulator, note) => {
        const key = String(note?.templateKey || 'nota-libre');
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
    }, {});
}
