import {
    getTemplate,
    getTemplateLabel,
    getTemplateSeed,
    inferTemplateKeyFromLegacy,
    normalizeTemplateKey
} from './agro-repo-templates.js';
import { buildNoteSnippet, sortNotesByUpdatedAt } from './agro-repo-search.js';

export const AGRO_REPO_STORAGE_KEY = 'agrorepo_mvp_v1';
export const AGRO_REPO_LEGACY_TREE_KEY = 'agrorepo_virtual_v3';
export const AGRO_REPO_LEGACY_FLAT_KEY = 'agrorepo_ultimate_v2';
export const AGRO_REPO_VERSION = '1.0.0';

function randomBase36(length = 8) {
    const size = Math.max(1, Number(length) || 8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(size);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
    }
    return (Date.now().toString(36) + '000000000000').slice(-size);
}

function safeNow() {
    return new Date().toISOString();
}

function safeParse(raw) {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function sanitizeTitle(value) {
    return String(value || '')
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function ensureMarkdownTitle(value, fallback = 'nota') {
    const base = sanitizeTitle(value).replace(/\.md$/i, '') || fallback;
    return `${base}.md`;
}

function buildId() {
    return `agrp_${Date.now().toString(36)}_${randomBase36(6)}`;
}

function isLikelyGeneratedLegacyTitle(title) {
    const safe = String(title || '').trim().toLowerCase();
    if (!safe) return true;
    return /^\d{4}-\d{2}-\d{2}-\d{4}-[a-z-]+-\d+\.md$/i.test(safe);
}

function firstMeaningfulLine(content) {
    const lines = String(content || '')
        .split(/\r?\n/)
        .map((line) => line.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
    return lines[0] || '';
}

function formatLegacyDateStem(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return 'nota';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function buildMigratedTitle(candidateTitle, content, templateKey, fallbackDate, prefix = '') {
    const rawCandidate = String(candidateTitle || '').trim();
    const cleanCandidate = ensureMarkdownTitle(rawCandidate, getTemplate(templateKey).defaultTitle.replace(/\.md$/i, ''));
    if (rawCandidate && !isLikelyGeneratedLegacyTitle(cleanCandidate)) return cleanCandidate;

    const line = sanitizeTitle(firstMeaningfulLine(content)).slice(0, 58);
    const label = sanitizeTitle(prefix).slice(0, 28);
    const dateStem = formatLegacyDateStem(fallbackDate);
    const fallback = [label, line || getTemplateLabel(templateKey), dateStem]
        .filter(Boolean)
        .join(' - ')
        .slice(0, 72);

    return ensureMarkdownTitle(fallback, getTemplate(templateKey).defaultTitle.replace(/\.md$/i, ''));
}

function ensureUniqueTitle(title, notes, ignoreId = null) {
    const safe = ensureMarkdownTitle(title, 'nota');
    const base = safe.replace(/\.md$/i, '');
    const inUse = new Set(
        (Array.isArray(notes) ? notes : [])
            .filter((note) => note?.id !== ignoreId)
            .map((note) => String(note?.title || '').toLowerCase())
    );

    if (!inUse.has(safe.toLowerCase())) return safe;

    let index = 2;
    while (inUse.has(`${base}-${index}.md`.toLowerCase())) {
        index += 1;
    }
    return `${base}-${index}.md`;
}

function buildLegacyNodeMap(nodes) {
    const map = new Map();
    (Array.isArray(nodes) ? nodes : []).forEach((node) => {
        if (node?.id) map.set(node.id, node);
    });
    return map;
}

function getLegacyPath(node, nodeMap) {
    const parts = [];
    let cursor = node;

    while (cursor && cursor.id) {
        parts.unshift(String(cursor.title || '').trim());
        cursor = cursor.parentId ? nodeMap.get(cursor.parentId) : null;
    }

    return parts.filter(Boolean).join(' / ');
}

function normalizeNote(note, notes = []) {
    const templateKey = normalizeTemplateKey(note?.templateKey);
    const createdAt = note?.createdAt || safeNow();
    const updatedAt = note?.updatedAt || createdAt;
    const fallbackTitle = getTemplate(templateKey).defaultTitle.replace(/\.md$/i, '');

    return {
        id: String(note?.id || buildId()),
        templateKey,
        title: ensureUniqueTitle(note?.title || fallbackTitle, notes, note?.id || null),
        content: String(note?.content || ''),
        legacyPath: String(note?.legacyPath || ''),
        createdAt,
        updatedAt
    };
}

export function createEmptyRepo() {
    return {
        version: AGRO_REPO_VERSION,
        notes: [],
        activeNoteId: null,
        lastSaved: null,
        migratedFrom: null
    };
}

function ensureMiFincaNote(repo) {
    const safeRepo = repo || createEmptyRepo();
    const hasMiFinca = safeRepo.notes.some((note) => note?.templateKey === 'mi-finca');
    if (hasMiFinca) return safeRepo;

    const note = buildNote('mi-finca', safeRepo.notes);
    safeRepo.notes.unshift(note);
    if (!safeRepo.activeNoteId) safeRepo.activeNoteId = note.id;
    return safeRepo;
}

export function normalizeRepo(repoLike) {
    const draft = createEmptyRepo();
    const rawNotes = Array.isArray(repoLike?.notes) ? repoLike.notes : [];
    const normalizedNotes = [];

    rawNotes.forEach((note) => {
        normalizedNotes.push(normalizeNote(note, normalizedNotes));
    });

    draft.notes = normalizedNotes;
    draft.activeNoteId = normalizedNotes.some((note) => note.id === repoLike?.activeNoteId)
        ? repoLike.activeNoteId
        : normalizedNotes[0]?.id || null;
    draft.lastSaved = repoLike?.lastSaved || null;
    draft.migratedFrom = repoLike?.migratedFrom || null;

    if (!draft.activeNoteId) {
        draft.activeNoteId = draft.notes[0]?.id || null;
    }

    return draft;
}

export function ensureStarterNote(repoLike) {
    const repo = normalizeRepo(repoLike);
    if (repo.notes.length > 0) return repo;
    ensureMiFincaNote(repo);
    repo.activeNoteId = repo.notes[0]?.id || null;
    return repo;
}

export function buildNote(templateKey, existingNotes = [], overrides = {}) {
    const safeTemplateKey = normalizeTemplateKey(templateKey);
    const template = getTemplate(safeTemplateKey);
    const createdAt = overrides.createdAt || safeNow();
    const updatedAt = overrides.updatedAt || createdAt;
    const rawTitle = overrides.title || template.defaultTitle;
    const title = ensureUniqueTitle(rawTitle, existingNotes, overrides.id || null);

    return {
        id: String(overrides.id || buildId()),
        templateKey: safeTemplateKey,
        title,
        content: overrides.content ?? getTemplateSeed(safeTemplateKey),
        legacyPath: String(overrides.legacyPath || ''),
        createdAt,
        updatedAt
    };
}

function migrateFromTreeV3(payload) {
    const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
    const nodeMap = buildLegacyNodeMap(nodes);
    const notes = [];

    sortNotesByUpdatedAt(
        nodes
            .filter((node) => node?.type === 'file')
            .map((file) => ({
                ...file,
                updatedAt: file?.updatedAt || file?.createdAt || safeNow()
            }))
    ).forEach((file) => {
        const templateKey = inferTemplateKeyFromLegacy(file?.entryType);
        const legacyPath = getLegacyPath(file, nodeMap);
        const title = buildMigratedTitle(
            file?.title,
            file?.content,
            templateKey,
            file?.updatedAt || file?.createdAt,
            legacyPath.split(' / ').slice(-2, -1)[0] || ''
        );

        notes.push(buildNote(templateKey, notes, {
            title,
            content: String(file?.content || ''),
            createdAt: file?.createdAt || safeNow(),
            updatedAt: file?.updatedAt || file?.createdAt || safeNow(),
            legacyPath
        }));
    });

    return normalizeRepo({
        version: AGRO_REPO_VERSION,
        notes,
        activeNoteId: notes[0]?.id || null,
        migratedFrom: AGRO_REPO_LEGACY_TREE_KEY
    });
}

function migrateFromFlatV2(payload) {
    const notes = [];
    const bitacoras = Array.isArray(payload?.bitacoras) ? payload.bitacoras : [];

    bitacoras.forEach((bitacora) => {
        const legacyPath = sanitizeTitle(bitacora?.name || 'Bitacora');
        const reports = Array.isArray(bitacora?.reports) ? bitacora.reports : [];

        reports
            .slice()
            .sort((left, right) => new Date(right?.updatedAt || right?.createdAt || 0).getTime() - new Date(left?.updatedAt || left?.createdAt || 0).getTime())
            .forEach((report) => {
                const templateKey = inferTemplateKeyFromLegacy(report?.entryType);
                const title = buildMigratedTitle(
                    report?.title,
                    report?.content,
                    templateKey,
                    report?.updatedAt || report?.createdAt,
                    legacyPath
                );

                notes.push(buildNote(templateKey, notes, {
                    title,
                    content: String(report?.content || ''),
                    createdAt: report?.createdAt || safeNow(),
                    updatedAt: report?.updatedAt || report?.createdAt || safeNow(),
                    legacyPath
                }));
            });
    });

    return normalizeRepo({
        version: AGRO_REPO_VERSION,
        notes,
        activeNoteId: notes[0]?.id || null,
        migratedFrom: AGRO_REPO_LEGACY_FLAT_KEY
    });
}

function readStorage(key) {
    try {
        return safeParse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export function loadRepoState() {
    const current = readStorage(AGRO_REPO_STORAGE_KEY);
    if (current?.version || Array.isArray(current?.notes)) {
        return {
            repo: normalizeRepo(current),
            notice: ''
        };
    }

    const legacyTree = readStorage(AGRO_REPO_LEGACY_TREE_KEY);
    if (Array.isArray(legacyTree?.nodes)) {
        const repo = persistRepoState(ensureStarterNote(migrateFromTreeV3(legacyTree)));
        return {
            repo,
            notice: 'Se migro tu AgroRepo legacy al nuevo MVP local-first.'
        };
    }

    const legacyFlat = readStorage(AGRO_REPO_LEGACY_FLAT_KEY);
    if (Array.isArray(legacyFlat?.bitacoras)) {
        const repo = persistRepoState(ensureStarterNote(migrateFromFlatV2(legacyFlat)));
        return {
            repo,
            notice: 'Se migraron tus notas legacy al nuevo AgroRepo.'
        };
    }

    return {
        repo: ensureStarterNote(createEmptyRepo()),
        notice: ''
    };
}

export function persistRepoState(repoLike) {
    const repo = normalizeRepo(repoLike);
    repo.lastSaved = safeNow();
    writeStorage(AGRO_REPO_STORAGE_KEY, {
        version: AGRO_REPO_VERSION,
        notes: repo.notes,
        activeNoteId: repo.activeNoteId,
        lastSaved: repo.lastSaved,
        migratedFrom: repo.migratedFrom
    });
    return repo;
}

export function buildRepoContext(repoLike) {
    const repo = normalizeRepo(repoLike);
    const sorted = sortNotesByUpdatedAt(repo.notes);
    const activeNote = repo.notes.find((note) => note.id === repo.activeNoteId) || null;
    const distinctSections = new Set(repo.notes.map((note) => note.templateKey));

    return {
        bitacoras_count: distinctSections.size,
        total_reports: repo.notes.length,
        total_files: repo.notes.length,
        active_bitacora: activeNote ? getTemplateLabel(activeNote.templateKey) : null,
        active_path: activeNote?.title || '',
        recent_entries: sorted.slice(0, 12).map((note) => ({
            bitacora: getTemplateLabel(note.templateKey),
            path: note.legacyPath || note.title,
            type: note.templateKey,
            tags: [note.templateKey],
            content: buildNoteSnippet(note.content, 180),
            date: note.updatedAt || note.createdAt
        }))
    };
}
