'use strict';

function randomBase36(length = 6) {
    const size = Math.max(1, Number(length) || 6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(size);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
    }
    return (Date.now().toString(36) + '000000000000').slice(-size);
}

const AGROREPO_ENABLED = true;
const STORAGE_KEY = 'agrorepo_virtual_v3';
const LEGACY_STORAGE_KEY = 'agrorepo_ultimate_v2';
const REPO_VERSION = '3.0.0';
const ROOT_FOLDERS = [
    { title: 'Cultivos', icon: '🌽' },
    { title: 'Finanzas', icon: '💰' },
    { title: 'Clima y campo', icon: '⛅' },
    { title: 'General', icon: '📁' }
];
const CROP_ICONS = {
    maiz: '🌽',
    caraota: '🫘',
    tomate: '🍅',
    papa: '🥔',
    cafe: '☕',
    lechuga: '🥬',
    cebolla: '🧅',
    ajo: '🧄',
    batata: '🍠',
    yuca: '🥔',
    otro: '🌾'
};
const TAG_CONFIG = {
    riego: { icon: '💧', label: 'Riego' },
    abono: { icon: '🧪', label: 'Abono' },
    plaga: { icon: '🐛', label: 'Plaga' },
    cosecha: { icon: '🌽', label: 'Cosecha' },
    siembra: { icon: '🌱', label: 'Siembra' },
    clima: { icon: '🌦️', label: 'Clima' },
    general: { icon: '📋', label: 'General' }
};
const ENTRY_TYPE_CONFIG = {
    observacion: { icon: '👁️', label: 'Observacion', color: 'var(--arw-gold-primary)' },
    decision: { icon: '⚡', label: 'Decision', color: 'var(--arw-success)' },
    problema: { icon: '⚠️', label: 'Problema', color: 'var(--arw-warning)' },
    aprendizaje: { icon: '💡', label: 'Aprendizaje', color: 'var(--arw-text-secondary)' },
    evento: { icon: '📌', label: 'Evento', color: 'var(--arw-gold-muted)' }
};

const state = {
    repo: createEmptyRepo(false),
    deleteTargetId: null,
    nodeModal: null,
    autosaveTimer: null,
    pendingNotice: ''
};

let root = null;
let widgetInitialized = false;

const qs = (selector, scope = root) => scope?.querySelector(selector) || null;
const qsa = (selector, scope = root) => Array.from(scope?.querySelectorAll(selector) || []);
const generateId = () => `arw_${Date.now().toString(36)}_${randomBase36(6)}`;
const generateHash = () => randomBase36(6).toUpperCase();

function createEmptyRepo(bootstrap = true) {
    const repo = {
        version: REPO_VERSION,
        nodes: [],
        activeNodeId: null,
        expandedIds: [],
        lastSaved: null
    };
    if (bootstrap) seedRootFolders(repo);
    return repo;
}

function seedRootFolders(repo) {
    if (!repo || repo.nodes.length) return;
    const now = new Date().toISOString();
    ROOT_FOLDERS.forEach((seed, index) => {
        repo.nodes.push(makeFolderNode({
            title: seed.title,
            icon: seed.icon,
            parentId: null,
            createdAt: now,
            updatedAt: now,
            position: index
        }));
    });
    repo.expandedIds = repo.nodes.map((node) => node.id);
    repo.activeNodeId = repo.nodes[0]?.id || null;
}

function makeFolderNode({
    title,
    parentId = null,
    icon = '📁',
    createdAt = new Date().toISOString(),
    updatedAt = createdAt,
    position = 0,
    cropId = null,
    id = generateId()
}) {
    const safeTitle = normalizeFolderTitle(title);
    return {
        id,
        type: 'folder',
        parentId,
        title: safeTitle,
        slug: slugify(safeTitle),
        icon,
        createdAt,
        updatedAt,
        position,
        cropId
    };
}

function makeFileNode({
    title,
    parentId,
    content = '',
    tags = ['general'],
    entryType = 'observacion',
    createdAt = new Date().toISOString(),
    updatedAt = createdAt,
    position = 0,
    cropId = null,
    hash = generateHash(),
    id = generateId()
}) {
    const safeTitle = normalizeFileTitle(title);
    return {
        id,
        type: 'file',
        parentId,
        title: safeTitle,
        slug: slugify(stripMarkdownExtension(safeTitle)),
        content: String(content || ''),
        tags: normalizeTags(tags),
        entryType: normalizeEntryType(entryType),
        createdAt,
        updatedAt,
        position,
        cropId,
        hash
    };
}

function normalizeFolderTitle(title) {
    return sanitizeTitle(title) || 'Nueva carpeta';
}

function normalizeFileTitle(title) {
    const base = sanitizeTitle(title).replace(/\.md$/i, '');
    return `${base || getTodayFileStem()}.md`;
}

function normalizeEntryType(value) {
    return ENTRY_TYPE_CONFIG[value] ? value : 'observacion';
}

function normalizeTags(tags) {
    const safe = Array.isArray(tags) ? tags.filter((tag) => TAG_CONFIG[tag]) : [];
    return safe.length ? Array.from(new Set(safe)) : ['general'];
}

function sanitizeTitle(value) {
    return String(value || '')
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function slugify(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'nota';
}

function stripMarkdownExtension(title) {
    return String(title || '').replace(/\.md$/i, '');
}

function formatDate(iso) {
    try {
        return new Date(iso).toLocaleDateString('es-VE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return iso;
    }
}

function formatDay(iso) {
    try {
        return new Date(iso).toLocaleDateString('es-VE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return iso;
    }
}

function timeAgo(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `Hace ${days}d`;
    return formatDay(iso);
}

function getTodayFileStem() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getStorageSize() {
    const data = localStorage.getItem(STORAGE_KEY) || '';
    const bytes = new Blob([data]).size;
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function showToast(message, type = 'info') {
    const container = qs('#arw-toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `arw-toast arw-toast--${type}`;
    toast.innerHTML = `<span class="arw-toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span><span class="arw-toast-copy">${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('is-leaving');
        setTimeout(() => toast.remove(), 260);
    }, 2600);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(text) {
    return escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
}

function renderMarkdown(text) {
    const lines = String(text || '').split(/\r?\n/);
    const blocks = [];
    let listItems = [];

    function flushList() {
        if (!listItems.length) return;
        blocks.push(`<ul class="arw-md-list">${listItems.join('')}</ul>`);
        listItems = [];
    }

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            blocks.push('<div class="arw-md-gap"></div>');
            return;
        }
        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
            flushList();
            const level = Math.min(heading[1].length, 3);
            blocks.push(`<h${level + 1} class="arw-md-heading">${renderInlineMarkdown(heading[2])}</h${level + 1}>`);
            return;
        }
        const bullet = trimmed.match(/^[-*]\s+(.+)$/);
        if (bullet) {
            listItems.push(`<li>${renderInlineMarkdown(bullet[1])}</li>`);
            return;
        }
        flushList();
        blocks.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    });

    flushList();
    if (!blocks.length) return '<p class="arw-md-empty">Sin contenido aún.</p>';
    return blocks.join('');
}

function stripMarkdown(text) {
    return String(text || '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^[-*]\s+/gm, '')
        .replace(/^#{1,3}\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getWordCount(text) {
    const normalized = stripMarkdown(text);
    return normalized ? normalized.split(/\s+/).length : 0;
}

function getSnippet(text, maxLength = 120) {
    const plain = stripMarkdown(text);
    if (plain.length <= maxLength) return plain;
    return `${plain.slice(0, maxLength).trim()}…`;
}

function pluralize(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function getTagLabel(tag) {
    const config = TAG_CONFIG[tag];
    return config ? `${config.icon} ${config.label}` : tag;
}

function getCropIcon(name) {
    const lower = String(name || '').toLowerCase();
    for (const [needle, icon] of Object.entries(CROP_ICONS)) {
        if (lower.includes(needle)) return icon;
    }
    return '🌾';
}

function getNode(id) {
    return state.repo.nodes.find((node) => node.id === id) || null;
}

function getChildren(parentId, sourceNodes = state.repo.nodes) {
    return sortNodes(sourceNodes.filter((node) => (node.parentId || null) === (parentId || null)));
}

function sortNodes(nodes) {
    return [...nodes].sort((left, right) => {
        if (left.type !== right.type) return left.type === 'folder' ? -1 : 1;
        if ((left.position ?? 0) !== (right.position ?? 0)) return (left.position ?? 0) - (right.position ?? 0);
        return String(left.title || '').localeCompare(String(right.title || ''), 'es', { sensitivity: 'base' });
    });
}

function getDescendants(nodeId, sourceNodes = state.repo.nodes) {
    const children = sourceNodes.filter((node) => node.parentId === nodeId);
    return children.flatMap((child) => [child, ...getDescendants(child.id, sourceNodes)]);
}

function getAllFiles(sourceNodes = state.repo.nodes) {
    return sourceNodes.filter((node) => node.type === 'file');
}

function getPathNodes(nodeId, sourceNodes = state.repo.nodes) {
    const path = [];
    let current = sourceNodes.find((node) => node.id === nodeId) || null;
    while (current) {
        path.unshift(current);
        current = current.parentId ? sourceNodes.find((node) => node.id === current.parentId) || null : null;
    }
    return path;
}

function ensureUniqueTitle(title, parentId, type, ignoreId = null, sourceNodes = state.repo.nodes) {
    const safeTitle = type === 'file' ? normalizeFileTitle(title) : normalizeFolderTitle(title);
    const existing = new Set(
        sourceNodes
            .filter((node) => node.parentId === parentId && node.type === type && node.id !== ignoreId)
            .map((node) => String(node.title || '').toLowerCase())
    );
    if (!existing.has(safeTitle.toLowerCase())) return safeTitle;

    const base = type === 'file' ? stripMarkdownExtension(safeTitle) : safeTitle;
    let suffix = 2;
    let candidate = type === 'file' ? `${base} ${suffix}.md` : `${base} ${suffix}`;
    while (existing.has(candidate.toLowerCase())) {
        suffix += 1;
        candidate = type === 'file' ? `${base} ${suffix}.md` : `${base} ${suffix}`;
    }
    return candidate;
}

function getNextPosition(parentId) {
    const siblings = state.repo.nodes.filter((node) => node.parentId === parentId);
    if (!siblings.length) return 0;
    return Math.max(...siblings.map((node) => Number(node.position) || 0)) + 1;
}

function getActiveNode() {
    return getNode(state.repo.activeNodeId);
}

function getActiveFile() {
    const active = getActiveNode();
    return active?.type === 'file' ? active : null;
}

function getSelectedFolderId(explicitParentId = null) {
    if (explicitParentId && getNode(explicitParentId)?.type === 'folder') return explicitParentId;
    const active = getActiveNode();
    if (active?.type === 'folder') return active.id;
    if (active?.type === 'file' && getNode(active.parentId)?.type === 'folder') return active.parentId;
    const general = state.repo.nodes.find((node) => node.type === 'folder' && node.parentId === null && node.title === 'General');
    return general?.id || state.repo.nodes.find((node) => node.type === 'folder')?.id || null;
}

function ensureAncestorsExpanded(nodeId, repo = state.repo) {
    const sourceNodes = repo.nodes;
    getPathNodes(nodeId, sourceNodes)
        .filter((node) => node.type === 'folder')
        .forEach((node) => {
            if (!repo.expandedIds.includes(node.id)) repo.expandedIds.push(node.id);
        });
}

function normalizeNode(rawNode) {
    if (!rawNode || !rawNode.id || !rawNode.type) return null;
    if (rawNode.type === 'folder') {
        return makeFolderNode({
            id: rawNode.id,
            title: rawNode.title,
            parentId: rawNode.parentId || null,
            icon: rawNode.icon || getCropIcon(rawNode.title),
            createdAt: rawNode.createdAt || new Date().toISOString(),
            updatedAt: rawNode.updatedAt || rawNode.createdAt || new Date().toISOString(),
            position: Number(rawNode.position) || 0,
            cropId: rawNode.cropId || null
        });
    }
    if (rawNode.type === 'file') {
        return makeFileNode({
            id: rawNode.id,
            title: rawNode.title,
            parentId: rawNode.parentId || null,
            content: rawNode.content || '',
            tags: rawNode.tags || [],
            entryType: rawNode.entryType || 'observacion',
            createdAt: rawNode.createdAt || new Date().toISOString(),
            updatedAt: rawNode.updatedAt || rawNode.createdAt || new Date().toISOString(),
            position: Number(rawNode.position) || 0,
            cropId: rawNode.cropId || null,
            hash: rawNode.hash || generateHash()
        });
    }
    return null;
}

function normalizeRepoShape(parsed) {
    const repo = createEmptyRepo(false);
    repo.nodes = Array.isArray(parsed?.nodes)
        ? parsed.nodes.map(normalizeNode).filter(Boolean)
        : [];
    if (!repo.nodes.length) seedRootFolders(repo);
    repo.activeNodeId = repo.nodes.some((node) => node.id === parsed?.activeNodeId)
        ? parsed.activeNodeId
        : repo.nodes[0]?.id || null;
    repo.expandedIds = Array.isArray(parsed?.expandedIds)
        ? parsed.expandedIds.filter((id, index, list) => list.indexOf(id) === index && repo.nodes.some((node) => node.id === id))
        : [];
    ensureAncestorsExpanded(repo.activeNodeId, repo);
    repo.lastSaved = parsed?.lastSaved || null;
    return repo;
}

function buildMigratedFileName(report, index) {
    const date = new Date(report?.createdAt || Date.now());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const suffix = slugify(report?.entryType || 'registro');
    return `${year}-${month}-${day}-${hours}${minutes}-${suffix}-${index + 1}.md`;
}

function migrateLegacyData(parsed) {
    const repo = createEmptyRepo(true);
    const cultivos = repo.nodes.find((node) => node.title === 'Cultivos') || repo.nodes[0];
    const bitacoras = Array.isArray(parsed?.bitacoras) ? parsed.bitacoras : [];

    bitacoras.forEach((bitacora, index) => {
        const folderTitle = ensureUniqueTitle(bitacora?.name || 'Cultivo', cultivos.id, 'folder', null, repo.nodes);
        const reports = Array.isArray(bitacora?.reports) ? bitacora.reports : [];
        const lastReportDate = reports[0]?.updatedAt || reports[0]?.createdAt || bitacora?.createdAt || new Date().toISOString();
        const folder = makeFolderNode({
            title: folderTitle,
            parentId: cultivos.id,
            icon: bitacora?.icon || getCropIcon(bitacora?.name),
            createdAt: bitacora?.createdAt || new Date().toISOString(),
            updatedAt: lastReportDate,
            position: index,
            cropId: bitacora?.id || null
        });
        repo.nodes.push(folder);
        repo.expandedIds.push(folder.id);

        [...reports]
            .sort((left, right) => new Date(left?.createdAt || 0) - new Date(right?.createdAt || 0))
            .forEach((report, reportIndex) => {
                const fileTitle = ensureUniqueTitle(buildMigratedFileName(report, reportIndex), folder.id, 'file', null, repo.nodes);
                repo.nodes.push(makeFileNode({
                    title: fileTitle,
                    parentId: folder.id,
                    content: report?.content || '',
                    tags: report?.tags || [],
                    entryType: report?.entryType || 'observacion',
                    createdAt: report?.createdAt || new Date().toISOString(),
                    updatedAt: report?.updatedAt || report?.createdAt || new Date().toISOString(),
                    position: reportIndex,
                    cropId: bitacora?.id || null,
                    hash: report?.hash || generateHash()
                }));
            });
    });

    repo.activeNodeId = cultivos?.id || repo.nodes[0]?.id || null;
    ensureAncestorsExpanded(repo.activeNodeId, repo);
    return repo;
}

function loadState() {
    try {
        const current = localStorage.getItem(STORAGE_KEY);
        if (current) {
            state.repo = normalizeRepoShape(JSON.parse(current));
            return;
        }

        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
            const parsed = JSON.parse(legacy);
            if (Array.isArray(parsed?.nodes)) {
                state.repo = normalizeRepoShape(parsed);
                return;
            }
            if (Array.isArray(parsed?.bitacoras)) {
                state.repo = migrateLegacyData(parsed);
                state.pendingNotice = 'Se migraron tus bitácoras legacy al árbol virtual de AgroRepo.';
                persist();
                return;
            }
        }

        state.repo = createEmptyRepo(true);
    } catch (error) {
        console.error('[AgroRepo] Load error:', error);
        state.repo = createEmptyRepo(true);
        state.pendingNotice = 'Se reinició AgroRepo por un problema al leer el almacenamiento local.';
    }
}

function persist() {
    try {
        state.repo.lastSaved = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version: REPO_VERSION,
            nodes: state.repo.nodes,
            activeNodeId: state.repo.activeNodeId,
            expandedIds: Array.from(new Set(state.repo.expandedIds)),
            lastSaved: state.repo.lastSaved
        }));
        updateSidebarStats();
        updateSaveStateLabel();
        syncRepoBridge();
    } catch (error) {
        console.error('[AgroRepo] Persist error:', error);
        showToast('No se pudo guardar AgroRepo en local.', 'error');
    }
}

function schedulePersist() {
    clearTimeout(state.autosaveTimer);
    updateSaveStateLabel('Guardando localmente...');
    state.autosaveTimer = window.setTimeout(() => {
        persist();
        renderContextRail();
    }, 220);
}

function syncRepoBridge() {
    const files = getAllFiles()
        .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
        .slice(0, 15)
        .map((file) => ({
            bitacora: getPathNodes(file.parentId).slice(-1)[0]?.title || null,
            path: getPathNodes(file.id).map((node) => node.title).join(' / '),
            type: file.entryType || 'observacion',
            tags: file.tags || [],
            content: getSnippet(file.content, 180),
            date: file.updatedAt || file.createdAt
        }));

    const cropRoot = state.repo.nodes.find((node) => node.type === 'folder' && node.parentId === null && node.title === 'Cultivos');
    const cropFolders = cropRoot
        ? getChildren(cropRoot.id).filter((node) => node.type === 'folder').length
        : 0;

    window._agroRepoContext = {
        bitacoras_count: cropFolders,
        total_reports: getAllFiles().length,
        total_folders: state.repo.nodes.filter((node) => node.type === 'folder').length,
        total_files: getAllFiles().length,
        active_bitacora: getPathNodes(state.repo.activeNodeId).find((node) => node.parentId === cropRoot?.id)?.title || null,
        active_path: getPathNodes(state.repo.activeNodeId).map((node) => node.title).join(' / '),
        recent_entries: files
    };
}

function toggleFolder(nodeId) {
    const folder = getNode(nodeId);
    if (!folder || folder.type !== 'folder') return;
    if (state.repo.expandedIds.includes(nodeId)) {
        state.repo.expandedIds = state.repo.expandedIds.filter((id) => id !== nodeId);
    } else {
        state.repo.expandedIds.push(nodeId);
    }
    persist();
    renderTree();
}

function selectNode(nodeId) {
    const node = getNode(nodeId);
    if (!node) return;
    state.repo.activeNodeId = node.id;
    ensureAncestorsExpanded(node.id);
    persist();
    renderAll();
    closeSidebar();
}

function createNode(nodeType, parentId, requestedTitle) {
    const safeParentId = nodeType === 'folder' || nodeType === 'file'
        ? getSelectedFolderId(parentId)
        : null;

    if ((nodeType === 'folder' || nodeType === 'file') && !safeParentId) {
        showToast('Selecciona una carpeta destino primero.', 'warning');
        return;
    }

    const title = ensureUniqueTitle(requestedTitle, safeParentId, nodeType);
    const position = getNextPosition(safeParentId);
    const now = new Date().toISOString();
    const parentNode = getNode(safeParentId);

    const node = nodeType === 'folder'
        ? makeFolderNode({
            title,
            parentId: safeParentId,
            icon: getCropIcon(title),
            createdAt: now,
            updatedAt: now,
            position
        })
        : makeFileNode({
            title,
            parentId: safeParentId,
            content: '',
            tags: ['general'],
            entryType: 'observacion',
            createdAt: now,
            updatedAt: now,
            position,
            cropId: parentNode?.cropId || null
        });

    state.repo.nodes.push(node);
    if (safeParentId && !state.repo.expandedIds.includes(safeParentId)) {
        state.repo.expandedIds.push(safeParentId);
    }
    state.repo.activeNodeId = node.id;
    persist();
    renderAll();
    showToast(nodeType === 'folder' ? 'Carpeta virtual creada.' : 'Archivo Markdown creado.', 'success');
}

function renameNode(nodeId, requestedTitle) {
    const node = getNode(nodeId);
    if (!node) return;
    const safeTitle = ensureUniqueTitle(requestedTitle, node.parentId || null, node.type, node.id);
    node.title = safeTitle;
    node.slug = slugify(node.type === 'file' ? stripMarkdownExtension(safeTitle) : safeTitle);
    node.updatedAt = new Date().toISOString();
    if (node.type === 'folder' && !node.icon) node.icon = getCropIcon(node.title);
    persist();
    renderAll();
    showToast(`${node.type === 'folder' ? 'Carpeta' : 'Archivo'} renombrado.`, 'success');
}

function deleteNode(nodeId) {
    const node = getNode(nodeId);
    if (!node) return;
    const descendants = getDescendants(nodeId);
    const idsToRemove = new Set([nodeId, ...descendants.map((entry) => entry.id)]);
    state.repo.nodes = state.repo.nodes.filter((entry) => !idsToRemove.has(entry.id));
    state.repo.expandedIds = state.repo.expandedIds.filter((id) => !idsToRemove.has(id));

    if (idsToRemove.has(state.repo.activeNodeId)) {
        state.repo.activeNodeId = node.parentId || state.repo.nodes[0]?.id || null;
    }

    if (!state.repo.nodes.length) {
        state.repo = createEmptyRepo(true);
    }

    persist();
    renderAll();
    showToast(node.type === 'folder' ? 'Carpeta eliminada.' : 'Archivo eliminado.', 'success');
}

function showDeleteModal(nodeId) {
    const node = getNode(nodeId);
    const modal = qs('#arw-deleteModal');
    const text = qs('#arw-deleteModalText');
    if (!node || !modal || !text) return;
    const descendants = getDescendants(nodeId);
    const fileCount = descendants.filter((entry) => entry.type === 'file').length + (node.type === 'file' ? 1 : 0);
    const folderCount = descendants.filter((entry) => entry.type === 'folder').length + (node.type === 'folder' ? 1 : 0);
    state.deleteTargetId = nodeId;
    text.textContent = node.type === 'folder'
        ? `Eliminar "${node.title}" quitará ${pluralize(folderCount, 'carpeta')} y ${pluralize(fileCount, 'archivo')} del árbol virtual.`
        : `Eliminar "${node.title}" quitará este archivo Markdown de AgroRepo.`;
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
}

function closeDeleteModal() {
    const modal = qs('#arw-deleteModal');
    if (!modal) return;
    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
    state.deleteTargetId = null;
}

function openNodeModal(mode, nodeType, options = {}) {
    const modal = qs('#arw-nodeModal');
    const title = qs('#arw-nodeModalTitle');
    const hint = qs('#arw-nodeModalHint');
    const input = qs('#arw-nodeModalName');
    const parent = qs('#arw-nodeModalParent');
    const confirm = qs('#arw-nodeModalConfirm');
    if (!modal || !title || !hint || !input || !parent || !confirm) return;

    const targetFolderId = getSelectedFolderId(options.parentId);
    const folder = getNode(targetFolderId);
    const node = options.nodeId ? getNode(options.nodeId) : null;
    state.nodeModal = {
        mode,
        nodeType,
        nodeId: options.nodeId || null,
        parentId: targetFolderId
    };

    title.textContent = mode === 'rename'
        ? `Renombrar ${nodeType === 'folder' ? 'carpeta' : 'archivo'}`
        : `Crear ${nodeType === 'folder' ? 'carpeta' : 'archivo Markdown'}`;
    hint.textContent = mode === 'rename'
        ? 'Cambia el nombre sin perder el contenido ni el historial local.'
        : nodeType === 'folder'
            ? 'Las carpetas virtuales organizan tu memoria agrícola sin tocar archivos del sistema.'
            : 'Crea una nota diaria o técnica dentro de la carpeta activa. Se exportará como `.md` cuando lo necesites.';
    input.value = mode === 'rename'
        ? String(node?.title || '')
        : nodeType === 'file'
            ? `${getTodayFileStem()}.md`
            : '';
    parent.textContent = mode === 'rename'
        ? `Ubicación: ${getPathNodes(node?.parentId).map((entry) => entry.title).join(' / ') || 'Raíz de AgroRepo'}`
        : `Destino: ${folder ? getPathNodes(folder.id).map((entry) => entry.title).join(' / ') : 'Selecciona una carpeta'}`;
    confirm.textContent = mode === 'rename' ? 'Actualizar' : 'Crear';
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => input.focus(), 20);
}

function closeNodeModal() {
    const modal = qs('#arw-nodeModal');
    if (!modal) return;
    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
    state.nodeModal = null;
}

function submitNodeModal() {
    const modalState = state.nodeModal;
    const input = qs('#arw-nodeModalName');
    if (!modalState || !input) return;
    const value = input.value.trim();
    if (!value) {
        showToast('Escribe un nombre antes de continuar.', 'warning');
        input.focus();
        return;
    }

    if (modalState.mode === 'rename') {
        renameNode(modalState.nodeId, value);
    } else {
        createNode(modalState.nodeType, modalState.parentId, value);
    }

    closeNodeModal();
}

function normalizeActiveFileTitleOnBlur() {
    const file = getActiveFile();
    if (!file) return;
    const normalized = ensureUniqueTitle(file.title, file.parentId, 'file', file.id);
    if (file.title !== normalized) {
        file.title = normalized;
        file.slug = slugify(stripMarkdownExtension(normalized));
        file.updatedAt = new Date().toISOString();
        persist();
        renderAll();
    } else {
        updateLiveFileUI();
    }
}

function saveActiveFile(notify = true) {
    const file = getActiveFile();
    if (!file) return;
    file.title = ensureUniqueTitle(file.title, file.parentId, 'file', file.id);
    file.slug = slugify(stripMarkdownExtension(file.title));
    file.updatedAt = new Date().toISOString();
    persist();
    renderAll();
    if (notify) showToast('Archivo guardado localmente.', 'success');
}

function updateActiveFileField(patch) {
    const file = getActiveFile();
    if (!file) return;
    Object.assign(file, patch, { updatedAt: new Date().toISOString() });
    schedulePersist();
}

function toggleActiveFileTag(tag) {
    const file = getActiveFile();
    if (!file) return;
    const tags = new Set(file.tags || []);
    if (tags.has(tag)) tags.delete(tag);
    else tags.add(tag);
    file.tags = normalizeTags(Array.from(tags));
    file.updatedAt = new Date().toISOString();
    schedulePersist();
    updateLiveFileUI();
    renderContextRail();
}

function setActiveFileEntryType(entryType) {
    const file = getActiveFile();
    if (!file) return;
    file.entryType = normalizeEntryType(entryType);
    file.updatedAt = new Date().toISOString();
    schedulePersist();
    updateLiveFileUI();
    renderContextRail();
}

function getNodeIcon(node) {
    if (!node) return '📁';
    if (node.type === 'folder') return node.icon || getCropIcon(node.title);
    return ENTRY_TYPE_CONFIG[node.entryType]?.icon || '📝';
}

function renderTreeNode(node, depth = 0) {
    const isFolder = node.type === 'folder';
    const active = node.id === state.repo.activeNodeId;
    const expanded = isFolder && state.repo.expandedIds.includes(node.id);
    const children = isFolder ? getChildren(node.id) : [];
    const directFolders = children.filter((child) => child.type === 'folder').length;
    const directFiles = children.filter((child) => child.type === 'file').length;
    const meta = isFolder
        ? `${pluralize(directFolders, 'subcarpeta')} · ${pluralize(directFiles, 'archivo')}`
        : `${ENTRY_TYPE_CONFIG[node.entryType]?.label || 'Archivo'} · ${timeAgo(node.updatedAt || node.createdAt)}`;

    return `
        <div class="arw-tree-node ${active ? 'is-active' : ''}" style="--arw-depth:${depth}">
            <div class="arw-tree-row">
                ${isFolder
            ? `<button type="button" class="arw-tree-toggle ${expanded ? 'is-open' : ''}" data-action="toggle-folder" data-node-id="${node.id}" aria-label="${expanded ? 'Contraer' : 'Expandir'} carpeta">›</button>`
            : '<span class="arw-tree-toggle arw-tree-toggle--spacer"></span>'}
                <button type="button" class="arw-tree-hit" data-action="select-node" data-node-id="${node.id}">
                    <span class="arw-tree-icon" data-tree-icon-for="${node.id}">${getNodeIcon(node)}</span>
                    <span class="arw-tree-copy">
                        <span class="arw-tree-label" data-tree-label-for="${node.id}">${escapeHtml(node.title)}</span>
                        <span class="arw-tree-meta" data-tree-meta-for="${node.id}">${escapeHtml(meta)}</span>
                    </span>
                </button>
                <div class="arw-tree-actions">
                    ${isFolder ? `<button type="button" class="arw-mini-btn" data-action="create-file" data-parent-id="${node.id}" title="Nuevo archivo">+</button>` : ''}
                    <button type="button" class="arw-mini-btn" data-action="rename-node" data-node-id="${node.id}" title="Renombrar">✎</button>
                    <button type="button" class="arw-mini-btn arw-mini-btn--danger" data-action="delete-node" data-node-id="${node.id}" title="Eliminar">✕</button>
                </div>
            </div>
            ${isFolder && expanded ? `<div class="arw-tree-children">${children.map((child) => renderTreeNode(child, depth + 1)).join('')}</div>` : ''}
        </div>
    `;
}

function renderTree() {
    const container = qs('#arw-treeList');
    if (!container) return;
    const roots = getChildren(null);
    if (!roots.length) {
        container.innerHTML = `
            <div class="arw-empty-mini">
                <div class="arw-empty-mini-title">Sin estructura aún</div>
                <p>Recupera la estructura base para comenzar a sembrar tu bitácora.</p>
                <button type="button" class="arw-btn-secondary arw-btn-block" data-action="restore-structure">Recrear estructura base</button>
            </div>
        `;
        return;
    }
    container.innerHTML = roots.map((node) => renderTreeNode(node, 0)).join('');
}

function renderBreadcrumb() {
    const breadcrumb = qs('#arw-breadcrumb');
    if (!breadcrumb) return;
    const parts = getPathNodes(state.repo.activeNodeId);
    const crumbs = ['<span class="arw-breadcrumb-item">AgroRepo</span>'];
    parts.forEach((part) => {
        crumbs.push('<span class="arw-breadcrumb-sep">›</span>');
        crumbs.push(`<span class="arw-breadcrumb-item ${part.id === state.repo.activeNodeId ? 'is-current' : ''}">${escapeHtml(part.title)}</span>`);
    });
    breadcrumb.innerHTML = crumbs.join('');
}

function renderNodeCard(node) {
    const isFolder = node.type === 'folder';
    const descendants = isFolder ? getDescendants(node.id) : [];
    const folderCount = descendants.filter((entry) => entry.type === 'folder').length;
    const fileCount = descendants.filter((entry) => entry.type === 'file').length;
    const meta = isFolder
        ? `${pluralize(folderCount, 'subcarpeta')} · ${pluralize(fileCount, 'archivo')}`
        : `${ENTRY_TYPE_CONFIG[node.entryType]?.label || 'Archivo'} · ${timeAgo(node.updatedAt || node.createdAt)}`;

    return `
        <article class="arw-node-card">
            <button type="button" class="arw-node-card-main" data-action="select-node" data-node-id="${node.id}">
                <span class="arw-node-card-icon">${getNodeIcon(node)}</span>
                <span class="arw-node-card-copy">
                    <span class="arw-node-card-title">${escapeHtml(node.title)}</span>
                    <span class="arw-node-card-meta">${escapeHtml(meta)}</span>
                </span>
            </button>
            <div class="arw-node-card-actions">
                ${isFolder ? `<button type="button" class="arw-mini-btn" data-action="create-file" data-parent-id="${node.id}" title="Nuevo archivo">Archivo</button>` : `<button type="button" class="arw-mini-btn" data-action="export-node-md" data-node-id="${node.id}" title="Exportar .md">.md</button>`}
                <button type="button" class="arw-mini-btn" data-action="rename-node" data-node-id="${node.id}" title="Renombrar">Renombrar</button>
                <button type="button" class="arw-mini-btn arw-mini-btn--danger" data-action="delete-node" data-node-id="${node.id}" title="Eliminar">Eliminar</button>
            </div>
        </article>
    `;
}

function renderWelcomeView() {
    const roots = getChildren(null);
    return `
        <section class="arw-view arw-welcome-view">
            <div class="arw-hero-card">
                <div class="arw-hero-eyebrow">AgroRepo · Memoria operativa</div>
                <div class="arw-hero-main">
                    <div>
                        <h2>Una bitácora agrícola que se navega como árbol virtual</h2>
                        <p>
                            Organiza cultivos, finanzas, clima y decisiones del campo en carpetas virtuales y archivos Markdown exportables.
                            El timeline y el contexto para IA se derivan del mismo árbol.
                        </p>
                    </div>
                    <div class="arw-hero-actions">
                        <button type="button" class="arw-btn-primary" data-action="create-folder">Nueva carpeta</button>
                        <button type="button" class="arw-btn-secondary" data-action="create-file">Nuevo archivo .md</button>
                    </div>
                </div>
                <div class="arw-feature-grid">
                    <div class="arw-feature-card">
                        <strong>Árbol claro</strong>
                        <p>Carpetas y archivos distinguidos visualmente, con foco claro y ruta visible.</p>
                    </div>
                    <div class="arw-feature-card">
                        <strong>Diario agrícola</strong>
                        <p>Notas por fecha, decisiones, fertilización, clima y plagas en Markdown.</p>
                    </div>
                    <div class="arw-feature-card">
                        <strong>Local-first útil</strong>
                        <p>Todo persiste en tu navegador, con backup JSON y exporte por archivo.</p>
                    </div>
                </div>
            </div>
            <div class="arw-node-grid">
                ${roots.map((rootNode) => renderNodeCard(rootNode)).join('')}
            </div>
        </section>
    `;
}

function renderFolderView(folder) {
    const children = getChildren(folder.id);
    const descendants = getDescendants(folder.id);
    const files = descendants.filter((entry) => entry.type === 'file');
    const folders = descendants.filter((entry) => entry.type === 'folder');
    const lastActivity = files[0]?.updatedAt || folder.updatedAt || folder.createdAt;

    return `
        <section class="arw-view arw-folder-view">
            <div class="arw-hero-card">
                <div class="arw-hero-eyebrow">Carpeta virtual</div>
                <div class="arw-hero-main">
                    <div>
                        <h2>${getNodeIcon(folder)} ${escapeHtml(folder.title)}</h2>
                        <p>${escapeHtml(getPathNodes(folder.id).map((node) => node.title).join(' / '))}</p>
                    </div>
                    <div class="arw-hero-actions">
                        <button type="button" class="arw-btn-primary" data-action="create-folder" data-parent-id="${folder.id}">Subcarpeta</button>
                        <button type="button" class="arw-btn-secondary" data-action="create-file" data-parent-id="${folder.id}">Nuevo archivo .md</button>
                        <button type="button" class="arw-btn-secondary" data-action="rename-node" data-node-id="${folder.id}">Renombrar</button>
                        <button type="button" class="arw-btn-secondary" data-action="delete-node" data-node-id="${folder.id}">Eliminar</button>
                    </div>
                </div>
                <div class="arw-hero-stats">
                    <div class="arw-stat-card">
                        <span class="arw-stat-card-label">Subcarpetas</span>
                        <strong>${folders.length}</strong>
                    </div>
                    <div class="arw-stat-card">
                        <span class="arw-stat-card-label">Archivos</span>
                        <strong>${files.length}</strong>
                    </div>
                    <div class="arw-stat-card">
                        <span class="arw-stat-card-label">Última señal</span>
                        <strong>${escapeHtml(timeAgo(lastActivity))}</strong>
                    </div>
                </div>
            </div>

            <div class="arw-section-block">
                <div class="arw-section-heading">
                    <h3>Contenido inmediato</h3>
                    <p>Abre un archivo para editarlo o sigue creciendo el árbol desde esta carpeta.</p>
                </div>
                ${children.length
            ? `<div class="arw-node-grid">${children.map((node) => renderNodeCard(node)).join('')}</div>`
            : `
                        <div class="arw-empty-panel">
                            <div class="arw-empty-panel-icon">🧺</div>
                            <h4>Carpeta vacía</h4>
                            <p>Crea una subcarpeta para organizar una temporada o abre un archivo Markdown para empezar el diario.</p>
                            <div class="arw-inline-actions">
                                <button type="button" class="arw-btn-primary" data-action="create-file" data-parent-id="${folder.id}">Crear archivo .md</button>
                                <button type="button" class="arw-btn-secondary" data-action="create-folder" data-parent-id="${folder.id}">Crear subcarpeta</button>
                            </div>
                        </div>
                    `}
            </div>
        </section>
    `;
}

function renderEntryTypeButtons(file) {
    return Object.entries(ENTRY_TYPE_CONFIG).map(([key, config]) => `
        <button
            type="button"
            class="arw-chip arw-chip--entry ${file.entryType === key ? 'is-active' : ''}"
            data-action="set-entry-type"
            data-entry-type="${key}"
            style="--arw-chip-accent:${config.color};"
        >
            <span>${config.icon}</span>
            <span>${config.label}</span>
        </button>
    `).join('');
}

function renderTagButtons(file) {
    return Object.entries(TAG_CONFIG).map(([key, config]) => `
        <button
            type="button"
            class="arw-chip ${file.tags.includes(key) ? 'is-active' : ''}"
            data-action="toggle-tag"
            data-tag="${key}"
        >
            <span>${config.icon}</span>
            <span>${config.label}</span>
        </button>
    `).join('');
}

function renderFileView(file) {
    return `
        <section class="arw-view arw-file-view">
            <div class="arw-hero-card">
                <div class="arw-hero-eyebrow">Archivo Markdown virtual</div>
                <div class="arw-hero-main">
                    <div>
                        <h2><span class="arw-file-hero-icon" id="arw-fileHeroIcon">${getNodeIcon(file)}</span> <span id="arw-fileHeroTitle">${escapeHtml(file.title)}</span></h2>
                        <p>${escapeHtml(getPathNodes(file.id).map((node) => node.title).join(' / '))}</p>
                    </div>
                    <div class="arw-hero-actions">
                        <button type="button" class="arw-btn-primary" data-action="save-file">Guardar cambios</button>
                        <button type="button" class="arw-btn-secondary" data-action="export-active-md">Exportar .md</button>
                        <button type="button" class="arw-btn-secondary" data-action="delete-node" data-node-id="${file.id}">Eliminar</button>
                    </div>
                </div>
            </div>

            <div class="arw-file-shell">
                <div class="arw-form-card">
                    <div class="arw-form-group">
                        <label class="arw-input-label" for="arw-fileTitle">Nombre del archivo</label>
                        <input type="text" id="arw-fileTitle" class="arw-input-field arw-input-field--single" value="${escapeHtml(file.title)}" maxlength="100" />
                    </div>
                    <div class="arw-file-status">
                        <span id="arw-liveSaveState">Guardado local ${escapeHtml(state.repo.lastSaved ? timeAgo(state.repo.lastSaved) : 'pendiente')}</span>
                        <span id="arw-fileMeta">${escapeHtml(`${getWordCount(file.content)} palabras · ${file.content.length} caracteres`)}</span>
                    </div>
                    <div class="arw-form-group">
                        <label class="arw-input-label">Tipo de entrada</label>
                        <div class="arw-chip-row">${renderEntryTypeButtons(file)}</div>
                    </div>
                    <div class="arw-form-group">
                        <label class="arw-input-label">Tags agrícolas</label>
                        <div class="arw-chip-row">${renderTagButtons(file)}</div>
                    </div>
                </div>

                <div class="arw-editor-grid">
                    <div class="arw-form-card arw-editor-card">
                        <div class="arw-pane-header">Edición Markdown</div>
                        <textarea id="arw-fileContent" class="arw-input-field arw-input-field--editor" placeholder="Ejemplo:
- Riego realizado
- Fertilización aplicada
- Observación del clima
- Señales de plaga o suelo">${escapeHtml(file.content)}</textarea>
                    </div>
                    <div class="arw-form-card arw-preview-card">
                        <div class="arw-pane-header">Vista previa</div>
                        <div class="arw-markdown-preview" id="arw-filePreview">${renderMarkdown(file.content)}</div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderMainView() {
    const container = qs('#arw-mainView');
    if (!container) return;
    const active = getActiveNode();
    if (!active) {
        container.innerHTML = renderWelcomeView();
        return;
    }
    container.innerHTML = active.type === 'folder'
        ? renderFolderView(active)
        : renderFileView(active);
}

function getContextFiles() {
    const active = getActiveNode();
    if (!active) return getAllFiles().sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt));
    if (active.type === 'file') {
        const parent = getNode(active.parentId);
        return parent
            ? [active, ...getDescendants(parent.id).filter((entry) => entry.type === 'file' && entry.id !== active.id)]
                .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
            : [active];
    }
    return getDescendants(active.id)
        .filter((entry) => entry.type === 'file')
        .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt));
}

function renderInfoRows(rows) {
    return rows.map((row) => `
        <div class="arw-info-row">
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(row.value)}</strong>
        </div>
    `).join('');
}

function renderContextSummary() {
    const container = qs('#arw-contextSummary');
    if (!container) return;
    const active = getActiveNode();
    if (!active) {
        container.innerHTML = renderInfoRows([
            { label: 'Carpetas', value: String(state.repo.nodes.filter((node) => node.type === 'folder').length) },
            { label: 'Archivos', value: String(getAllFiles().length) },
            { label: 'Modo', value: 'Local-first' }
        ]);
        return;
    }

    if (active.type === 'folder') {
        const descendants = getDescendants(active.id);
        const folders = descendants.filter((entry) => entry.type === 'folder');
        const files = descendants.filter((entry) => entry.type === 'file');
        container.innerHTML = renderInfoRows([
            { label: 'Ruta', value: getPathNodes(active.id).map((node) => node.title).join(' / ') },
            { label: 'Subcarpetas', value: String(folders.length) },
            { label: 'Archivos', value: String(files.length) },
            { label: 'Última señal', value: timeAgo(files[0]?.updatedAt || active.updatedAt || active.createdAt) }
        ]);
        return;
    }

    container.innerHTML = renderInfoRows([
        { label: 'Ruta', value: getPathNodes(active.id).map((node) => node.title).join(' / ') },
        { label: 'Tipo', value: ENTRY_TYPE_CONFIG[active.entryType]?.label || 'Observacion' },
        { label: 'Tags', value: active.tags.map((tag) => TAG_CONFIG[tag]?.label || tag).join(', ') || 'General' },
        { label: 'Creado', value: formatDate(active.createdAt) },
        { label: 'Actualizado', value: formatDate(active.updatedAt || active.createdAt) }
    ]);
}

function renderContextTimeline() {
    const container = qs('#arw-contextTimeline');
    if (!container) return;
    const files = getContextFiles().slice(0, 8);
    if (!files.length) {
        container.innerHTML = '<div class="arw-empty-mini"><div class="arw-empty-mini-title">Sin actividad</div><p>El timeline aparecerá cuando guardes archivos Markdown.</p></div>';
        return;
    }

    container.innerHTML = files.map((file) => `
        <button type="button" class="arw-timeline-item ${file.id === state.repo.activeNodeId ? 'is-active' : ''}" data-action="select-node" data-node-id="${file.id}">
            <div class="arw-timeline-item-head">
                <span>${getNodeIcon(file)} ${escapeHtml(file.title)}</span>
                <span>${escapeHtml(timeAgo(file.updatedAt || file.createdAt))}</span>
            </div>
            <div class="arw-timeline-item-body">${escapeHtml(getSnippet(file.content || '', 90) || 'Archivo listo para empezar.')}</div>
        </button>
    `).join('');
}

function renderContextTags() {
    const container = qs('#arw-contextTags');
    if (!container) return;
    const counts = {};
    getContextFiles().forEach((file) => {
        (file.tags || []).forEach((tag) => {
            counts[tag] = (counts[tag] || 0) + 1;
        });
    });

    const rows = Object.entries(counts).sort((left, right) => right[1] - left[1]).slice(0, 8);
    if (!rows.length) {
        container.innerHTML = '<div class="arw-empty-mini"><div class="arw-empty-mini-title">Sin tags aún</div><p>Cuando etiquetes riego, clima o plaga verás las señales aquí.</p></div>';
        return;
    }

    container.innerHTML = rows.map(([tag, count]) => `
        <div class="arw-tag-stat">
            <span>${escapeHtml(getTagLabel(tag))}</span>
            <strong>${count}</strong>
        </div>
    `).join('');
}

function renderContextRail() {
    renderContextSummary();
    renderContextTimeline();
    renderContextTags();
}

function updateSidebarStats() {
    const folders = state.repo.nodes.filter((node) => node.type === 'folder').length;
    const files = getAllFiles().length;
    const foldersEl = qs('#arw-statFolders');
    const filesEl = qs('#arw-statFiles');
    const storage = qs('#arw-storageStatus');
    if (foldersEl) foldersEl.textContent = String(folders);
    if (filesEl) filesEl.textContent = String(files);
    if (storage) storage.textContent = `LocalStorage · ${getStorageSize()} · 100% Offline`;
}

function updateHeaderActionsState() {
    const exportButton = qs('#arw-btnExportActiveMd');
    if (!exportButton) return;
    exportButton.disabled = !getActiveFile();
}

function updateSaveStateLabel(text = '') {
    const label = qs('#arw-liveSaveState');
    if (!label) return;
    if (text) {
        label.textContent = text;
        return;
    }
    label.textContent = `Guardado local ${state.repo.lastSaved ? timeAgo(state.repo.lastSaved) : 'pendiente'}`;
}

function updateLiveFileUI() {
    const file = getActiveFile();
    if (!file) return;
    const preview = qs('#arw-filePreview');
    const heroTitle = qs('#arw-fileHeroTitle');
    const heroIcon = qs('#arw-fileHeroIcon');
    const meta = qs('#arw-fileMeta');
    const treeLabel = qs(`[data-tree-label-for="${file.id}"]`);
    const treeIcon = qs(`[data-tree-icon-for="${file.id}"]`);
    const treeMeta = qs(`[data-tree-meta-for="${file.id}"]`);

    if (preview) preview.innerHTML = renderMarkdown(file.content);
    if (heroTitle) heroTitle.textContent = file.title;
    if (heroIcon) heroIcon.textContent = getNodeIcon(file);
    if (meta) meta.textContent = `${getWordCount(file.content)} palabras · ${file.content.length} caracteres`;
    if (treeLabel) treeLabel.textContent = file.title || 'Sin nombre';
    if (treeIcon) treeIcon.textContent = getNodeIcon(file);
    if (treeMeta) treeMeta.textContent = `${ENTRY_TYPE_CONFIG[file.entryType]?.label || 'Archivo'} · ${timeAgo(file.updatedAt || file.createdAt)}`;

    qsa('[data-action="set-entry-type"]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.entryType === file.entryType);
    });
    qsa('[data-action="toggle-tag"]').forEach((button) => {
        button.classList.toggle('is-active', file.tags.includes(button.dataset.tag));
    });

    updateSaveStateLabel();
}

function renderAll() {
    renderTree();
    renderBreadcrumb();
    renderMainView();
    renderContextRail();
    updateSidebarStats();
    updateHeaderActionsState();
    updateLiveFileUI();
}

function buildBackupPayload() {
    return {
        exportedAt: new Date().toISOString(),
        version: REPO_VERSION,
        system: 'AgroRepo Tree Memory | YavlGold',
        nodes: state.repo.nodes,
        activeNodeId: state.repo.activeNodeId,
        expandedIds: state.repo.expandedIds
    };
}

function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

async function saveToFile() {
    const data = JSON.stringify(buildBackupPayload(), null, 2);
    const filename = `agrorepo_backup_${getTodayFileStem()}.json`;
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{ description: 'AgroRepo Backup', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(data);
            await writable.close();
            showToast('Backup guardado en disco.', 'success');
            return;
        } catch (error) {
            if (error?.name === 'AbortError') return;
        }
    }
    downloadBlob(data, filename, 'application/json');
    showToast('Backup JSON descargado.', 'success');
}

function exportJSON() {
    downloadBlob(JSON.stringify(buildBackupPayload(), null, 2), `agrorepo_backup_${getTodayFileStem()}.json`, 'application/json');
    showToast('Backup JSON exportado.', 'success');
}

function buildFileMarkdown(file) {
    const folderPath = getPathNodes(file.parentId).map((node) => node.title).join(' / ') || 'AgroRepo';
    const typeLabel = ENTRY_TYPE_CONFIG[file.entryType]?.label || 'Observacion';
    const tags = file.tags.map((tag) => TAG_CONFIG[tag]?.label || tag).join(', ') || 'General';
    const content = String(file.content || '').trim() || '_Sin contenido._';
    return [
        `# ${stripMarkdownExtension(file.title)}`,
        '',
        `- Ruta: ${folderPath}`,
        `- Tipo: ${typeLabel}`,
        `- Tags: ${tags}`,
        `- Creado: ${formatDate(file.createdAt)}`,
        `- Actualizado: ${formatDate(file.updatedAt || file.createdAt)}`,
        '',
        '---',
        '',
        content,
        ''
    ].join('\n');
}

function exportActiveMarkdown(fileId = null) {
    const file = fileId ? getNode(fileId) : getActiveFile();
    if (!file || file.type !== 'file') {
        showToast('Selecciona un archivo Markdown primero.', 'warning');
        return;
    }
    const safeTitle = normalizeFileTitle(file.title);
    downloadBlob(buildFileMarkdown(file), safeTitle, 'text/markdown');
    showToast(`Archivo ${safeTitle} exportado.`, 'success');
}

function mergeImportedRepo(incomingRepo) {
    if (isSeedOnlyRepo(state.repo)) {
        state.repo = incomingRepo;
        return incomingRepo.nodes.length;
    }

    const currentIds = new Set(state.repo.nodes.map((node) => node.id));
    let added = 0;
    incomingRepo.nodes.forEach((node) => {
        if (!currentIds.has(node.id)) {
            state.repo.nodes.push(node);
            currentIds.add(node.id);
            added += 1;
        }
    });
    state.repo.expandedIds = Array.from(new Set([...state.repo.expandedIds, ...incomingRepo.expandedIds]));
    if (!state.repo.activeNodeId && incomingRepo.activeNodeId) {
        state.repo.activeNodeId = incomingRepo.activeNodeId;
    }
    return added;
}

function isSeedOnlyRepo(repo) {
    const files = repo.nodes.filter((node) => node.type === 'file');
    if (files.length) return false;
    const rootNames = getChildren(null, repo.nodes).map((node) => node.title).join('|');
    return rootNames === ROOT_FOLDERS.map((entry) => entry.title).join('|');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            try {
                const parsed = JSON.parse(loadEvent.target?.result);
                const importedRepo = Array.isArray(parsed?.nodes)
                    ? normalizeRepoShape(parsed)
                    : Array.isArray(parsed?.bitacoras)
                        ? migrateLegacyData(parsed)
                        : null;
                if (!importedRepo) throw new Error('Formato no compatible');
                const added = mergeImportedRepo(importedRepo);
                persist();
                renderAll();
                showToast(`Importación completada: ${pluralize(added, 'nodo')} agregado${added === 1 ? '' : 's'}.`, 'success');
            } catch (error) {
                console.error('[AgroRepo] Import error:', error);
                showToast('El archivo no tiene un formato AgroRepo válido.', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function restoreSeedStructure() {
    state.repo = createEmptyRepo(true);
    persist();
    renderAll();
    showToast('Se recreó la estructura base de AgroRepo.', 'success');
}

function toggleSidebar() {
    qs('#arw-sidebar')?.classList.toggle('is-open');
    qs('#arw-sidebarBackdrop')?.classList.toggle('is-visible');
}

function closeSidebar() {
    qs('#arw-sidebar')?.classList.remove('is-open');
    qs('#arw-sidebarBackdrop')?.classList.remove('is-visible');
}

function handleAction(event) {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;

    const { action, nodeId, parentId, entryType, tag } = actionTarget.dataset;

    switch (action) {
        case 'toggle-folder':
            toggleFolder(nodeId);
            return;
        case 'select-node':
            selectNode(nodeId);
            return;
        case 'create-folder':
            openNodeModal('create', 'folder', { parentId });
            return;
        case 'create-file':
            openNodeModal('create', 'file', { parentId });
            return;
        case 'rename-node': {
            const node = getNode(nodeId);
            if (!node) return;
            openNodeModal('rename', node.type, { nodeId });
            return;
        }
        case 'delete-node':
            showDeleteModal(nodeId);
            return;
        case 'confirm-delete':
            if (state.deleteTargetId) deleteNode(state.deleteTargetId);
            closeDeleteModal();
            return;
        case 'close-delete-modal':
            closeDeleteModal();
            return;
        case 'close-node-modal':
            closeNodeModal();
            return;
        case 'save-file':
            saveActiveFile(true);
            return;
        case 'save-backup':
            saveToFile();
            return;
        case 'export-json':
            exportJSON();
            return;
        case 'import-json':
            importData();
            return;
        case 'export-active-md':
            exportActiveMarkdown();
            return;
        case 'export-node-md':
            exportActiveMarkdown(nodeId);
            return;
        case 'toggle-tag':
            toggleActiveFileTag(tag);
            return;
        case 'set-entry-type':
            setActiveFileEntryType(entryType);
            return;
        case 'restore-structure':
            restoreSeedStructure();
            return;
        default:
            break;
    }
}

function handleInput(event) {
    const activeFile = getActiveFile();
    if (!activeFile) return;

    if (event.target.id === 'arw-fileTitle') {
        updateActiveFileField({ title: event.target.value || getTodayFileStem() });
        updateLiveFileUI();
        return;
    }

    if (event.target.id === 'arw-fileContent') {
        updateActiveFileField({ content: event.target.value });
        updateLiveFileUI();
    }
}

function handleBlur(event) {
    if (event.target.id === 'arw-fileTitle') {
        normalizeActiveFileTitleOnBlur();
    }
}

function handleKeydown(event) {
    if (event.key === 'Escape') {
        closeDeleteModal();
        closeNodeModal();
        closeSidebar();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (getActiveFile()) saveActiveFile(true);
        else saveToFile();
    }
}

function bindEvents() {
    root?.addEventListener('click', handleAction);
    root?.addEventListener('input', handleInput);
    root?.addEventListener('blur', handleBlur, true);
    root?.addEventListener('keydown', handleKeydown);
    qs('#arw-menuToggle')?.addEventListener('click', toggleSidebar);
    qs('#arw-sidebarBackdrop')?.addEventListener('click', closeSidebar);
    qs('#arw-nodeModalForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        submitNodeModal();
    });
    qs('#arw-deleteModal')?.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) closeDeleteModal();
    });
    qs('#arw-nodeModal')?.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) closeNodeModal();
    });
}

function initWidget() {
    if (widgetInitialized) return;
    root = document.getElementById('agro-widget-root');
    if (!root) {
        console.error('[AgroRepo] Root not found');
        return;
    }
    if (root.dataset.loaded === '1') return;

    const template = document.getElementById('agro-repo-template');
    if (!template) {
        console.error('[AgroRepo] Template not found');
        return;
    }

    widgetInitialized = true;
    root.dataset.loaded = '1';
    root.replaceChildren();
    root.appendChild(template.content.cloneNode(true));

    loadState();
    bindEvents();
    syncRepoBridge();
    renderAll();

    if (state.pendingNotice) {
        showToast(state.pendingNotice, 'success');
        state.pendingNotice = '';
    }

    console.log('[AgroRepo] Tree Memory v3 loaded with', state.repo.nodes.length, 'nodes');
}

function setupAccordionListener() {
    const accordion = document.getElementById('yg-acc-agrorepo');
    if (!accordion) {
        console.warn('[AgroRepo] Accordion not found');
        return;
    }
    if (accordion.dataset.listenerBound === '1') return;
    accordion.dataset.listenerBound = '1';
    accordion.addEventListener('toggle', () => {
        if (accordion.open && !widgetInitialized) initWidget();
    });
    if (accordion.open) initWidget();
}

export function initAgroRepo() {
    if (!AGROREPO_ENABLED) {
        const section = document.getElementById('agro-repo-section');
        if (section) section.style.display = 'none';
        return;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAccordionListener);
    } else {
        setupAccordionListener();
    }

    console.log('[AgroRepo] Tree Memory v3 ready (lazy init on accordion open)');
}
