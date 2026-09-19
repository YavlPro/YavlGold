/**
 * agro-memory-retrieval.js — Retrieval local full-text de la memoria AgroRepo
 * ANEXO 29 S1 (2026-09-18). Decisión D-2 del owner: Fase 1 = full-text SIN
 * embeddings y SIN Supabase (AgroRepo vive en localStorage, ver Fase 0).
 *
 * Rol: dado el texto real de la consulta del usuario, seleccionar las entradas
 * más relevantes del AgroRepo para el contexto del Asistente IA, reemplazando
 * el cap fijo de 8 recientes (agro-assistant.js getAssistantContext).
 *
 * Contrato de dependencias (§3.3, sin circulares):
 * - Importa agro-repo-storage.js (lectura pura del árbol) y agro-repo-search.js
 *   (normalizeSearchText / buildNoteSnippet / compareByUpdatedAt). Ambos son
 *   módulos hoja; nadie más importa este módulo salvo agro-assistant.js.
 *
 * Comportamiento:
 * - Consulta con matches   → top-K por scoring: título×4, path/bitácora×2,
 *   línea de contenido×1 (cap por archivo) + boost de recencia con
 *   decaimiento suave (vida media 60 días, máx +2).
 * - Consulta sin matches   → top 8 recientes (comportamiento previo al ANEXO).
 * - Excerpt alrededor de la línea con match (~200 chars por entrada) con
 *   presupuesto total (~2.5KB) para no inflar el prompt del asistente.
 * - Lectura 100% local: localStorage 'agrorepo_mvp_v1', sin escrituras ni red.
 */

import {
    AGRO_REPO_STORAGE_KEY,
    getAllFiles,
    getPathNodes,
    normalizeRepo
} from './agro-repo-storage.js';
import { buildNoteSnippet, compareByUpdatedAt, normalizeSearchText } from './agro-repo-search.js';

export const MEMORY_RETRIEVAL_DEFAULT_LIMIT = 6;

// Cap histórico del proto-RAG: sin matches se envían las 8 recientes de hoy.
const MEMORY_RETRIEVAL_FALLBACK_LIMIT = 8;
const MEMORY_RETRIEVAL_MAX_LIMIT = 12;
const MIN_TOKEN_LENGTH = 3;
const TITLE_WEIGHT = 4;
const PATH_WEIGHT = 2;
const CONTENT_SCORE_CAP = 6;
const RECENCY_BOOST_MAX = 2;
const RECENCY_HALF_LIFE_DAYS = 60;
const EXCERPT_MAX_CHARS = 200;
const TOTAL_EXCERPT_BUDGET_CHARS = 2560;

// Stopwords mínimas del español para que conectivas como "cómo" o "mi" no
// dominen el scoring. Lista cerrada y conservadora: filtrar de más daña el
// recall en notas cortas.
const SPANISH_STOPWORDS = new Set([
    'los', 'las', 'del', 'que', 'por', 'para', 'con', 'una', 'uno', 'unos',
    'unas', 'como', 'pero', 'sus', 'mis', 'este', 'esta', 'estos', 'estas',
    'ese', 'esa', 'esos', 'esas', 'fue', 'son', 'soy', 'hay', 'mas', 'menos',
    'muy', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras',
    'sobre', 'entre', 'cuando', 'donde', 'porque', 'cual', 'cuales', 'quien',
    'quienes', 'cuanto', 'dime', 'muestra', 'lista', 'puedes', 'quiero',
    'sabras', 'sabe', 'tenia', 'tiene', 'tenian', 'hace', 'hicimos', 'esta'
]);

function tokenizeQuery(query) {
    const tokens = [];
    const seen = new Set();
    normalizeSearchText(query)
        .split(/[^a-z0-9]+/)
        .forEach((token) => {
            if (token.length < MIN_TOKEN_LENGTH) return;
            if (SPANISH_STOPWORDS.has(token)) return;
            if (seen.has(token)) return;
            seen.add(token);
            tokens.push(token);
        });
    return tokens;
}

// Lectura pura del árbol persistido: normalizeRepo NO persiste (a diferencia
// de loadRepoState), así que este camino no compite con el widget de AgroRepo.
function readRepoSnapshot() {
    try {
        const raw = localStorage.getItem(AGRO_REPO_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed ? normalizeRepo(parsed) : null;
    } catch (_err) {
        return null;
    }
}

function getRootFolderOf(nodes, fileId) {
    return getPathNodes(nodes, fileId).find((node) => node?.type === 'folder' && node.parentId === null) || null;
}

// Espejo de buildRepoContext (agro-repo-storage.js:992) + el campo `id`
// aditivo del ANEXO 29 S1, necesario para las citas con deep-link.
function buildEntry(file, nodes, excerpt) {
    const pathNodes = getPathNodes(nodes, file.id);
    const root = pathNodes.find((node) => node?.type === 'folder' && node.parentId === null) || null;
    return {
        id: file.id,
        bitacora: root?.title || null,
        path: pathNodes.map((node) => node.title).join(' / '),
        type: file.templateKey,
        tags: [file.templateKey],
        content: excerpt,
        date: file.updatedAt || file.createdAt
    };
}

function recencyBoost(file) {
    const ts = Date.parse(file.updatedAt || file.createdAt || '');
    if (!Number.isFinite(ts)) return 0;
    const ageDays = Math.max(0, (Date.now() - ts) / 86400000);
    return RECENCY_BOOST_MAX * Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

function scoreFileAgainstTokens(file, tokens, pathNorm, lineNorms) {
    const titleNorm = normalizeSearchText(file.title);

    let titleHits = 0;
    let pathHits = 0;
    let contentScore = 0;

    tokens.forEach((token) => {
        if (titleNorm.includes(token)) titleHits += 1;
        if (pathNorm.includes(token)) pathHits += 1;
        if (contentScore >= CONTENT_SCORE_CAP) return;
        lineNorms.forEach((lineNorm) => {
            if (contentScore < CONTENT_SCORE_CAP && lineNorm.includes(token)) {
                contentScore += 1;
            }
        });
    });

    const matches = titleHits + pathHits + contentScore;
    if (matches <= 0) return { matches: 0, score: 0 };

    return {
        matches,
        score: (titleHits * TITLE_WEIGHT) + (pathHits * PATH_WEIGHT) + contentScore + recencyBoost(file)
    };
}

// Excerpt centrado en la primera línea con match. El índice del token se
// busca sobre la línea cruda lowercased (lax): los diacríticos eliminados por
// normalizeSearchText romperían el mapeo índice→texto original.
function buildExcerpt(file, tokens) {
    const lines = String(file.content || '').split(/\r?\n/);
    let matchToken = '';
    let matchLineIndex = -1;

    for (let i = 0; i < lines.length; i += 1) {
        const lineNorm = normalizeSearchText(lines[i]);
        matchToken = tokens.find((token) => lineNorm.includes(token)) || '';
        if (matchToken) {
            matchLineIndex = i;
            break;
        }
    }

    if (matchLineIndex === -1) {
        return buildNoteSnippet(file.content, EXCERPT_MAX_CHARS);
    }

    const flat = lines[matchLineIndex].replace(/\s+/g, ' ').trim();
    if (flat.length <= EXCERPT_MAX_CHARS) return flat;

    const at = flat.toLowerCase().indexOf(matchToken);
    const start = at > 0 ? Math.max(0, at - Math.floor(EXCERPT_MAX_CHARS / 2)) : 0;
    return `${flat.slice(start, start + EXCERPT_MAX_CHARS - 1).trimEnd()}…`;
}

function applyExcerptBudget(entries) {
    let budget = TOTAL_EXCERPT_BUDGET_CHARS;
    entries.forEach((entry) => {
        if (!entry.content) return;
        if (entry.content.length <= budget) {
            budget -= entry.content.length;
            return;
        }
        entry.content = budget > 80
            ? `${entry.content.slice(0, Math.max(0, budget - 1)).trimEnd()}…`
            : '';
        budget = 0;
    });
}

/**
 * retrieveRepoMemory(query, { limit }) →
 *   { bitacoras, total_entries, recent: [{ id, bitacora, path, type, tags, content, date }] }
 * o null cuando no hay memoria local disponible (el caller conserva su
 * fallback de bridge/window._agroRepoContext).
 */
export function retrieveRepoMemory(query, options = {}) {
    const rawLimit = Number(options.limit) || MEMORY_RETRIEVAL_DEFAULT_LIMIT;
    const limit = Math.max(1, Math.min(rawLimit, MEMORY_RETRIEVAL_MAX_LIMIT));

    const repo = readRepoSnapshot();
    if (!repo) return null;

    const files = getAllFiles(repo.nodes);
    if (!files.length) return null;

    const rootKeys = new Set();
    files.forEach((file) => {
        const root = getRootFolderOf(repo.nodes, file.id);
        if (root?.folderKey) rootKeys.add(root.folderKey);
    });
    const base = {
        bitacoras: rootKeys.size,
        total_entries: files.length
    };

    const tokens = tokenizeQuery(query);

    const candidates = [];
    if (tokens.length) {
        files.forEach((file) => {
            const pathNorm = normalizeSearchText(getPathNodes(repo.nodes, file.id).map((node) => node.title).join(' '));
            const lineNorms = String(file.content || '')
                .split(/\r?\n/)
                .map((line) => normalizeSearchText(line));
            const { matches, score } = scoreFileAgainstTokens(file, tokens, pathNorm, lineNorms);
            if (matches > 0) candidates.push({ file, score });
        });
    }

    // Sin tokens útiles o sin matches: comportamiento de hoy (top 8 recientes).
    if (!candidates.length) {
        const fallback = files
            .slice()
            .sort(compareByUpdatedAt)
            .slice(0, MEMORY_RETRIEVAL_FALLBACK_LIMIT)
            .map((file) => buildEntry(file, repo.nodes, buildNoteSnippet(file.content, EXCERPT_MAX_CHARS)));
        return { ...base, recent: fallback };
    }

    candidates.sort((a, b) => (b.score - a.score) || compareByUpdatedAt(a.file, b.file));

    const recent = candidates
        .slice(0, limit)
        .map((candidate) => buildEntry(candidate.file, repo.nodes, buildExcerpt(candidate.file, tokens)));

    applyExcerptBudget(recent);
    return { ...base, recent };
}
