import {
    AGRO_REPO_ROOT_FOLDERS,
    getRootFolder,
    getTemplate,
    getTemplateFolderKey,
    getTemplateLabel,
    getTemplateSeed,
    inferTemplateKeyFromLegacy,
    normalizeTemplateKey,
    resolveRootFolderKey
} from './agro-repo-templates.js';
import { buildNoteSnippet, compareByUpdatedAt } from './agro-repo-search.js';

export const AGRO_REPO_STORAGE_KEY = 'agrorepo_mvp_v1';
export const AGRO_REPO_LEGACY_TREE_KEY = 'agrorepo_virtual_v3';
export const AGRO_REPO_LEGACY_FLAT_KEY = 'agrorepo_ultimate_v2';
export const AGRO_REPO_VERSION = '1.1.0';

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

function buildId(prefix = 'agrp') {
    return `${prefix}_${Date.now().toString(36)}_${randomBase36(6)}`;
}

function splitLegacyPath(rawValue, title = '') {
    const safeTitle = String(title || '').trim().toLowerCase();
    const parts = String(rawValue || '')
        .split('/')
        .map((part) => sanitizeTitle(part))
        .filter(Boolean);

    if (parts.length && parts[parts.length - 1].toLowerCase() === safeTitle) {
        parts.pop();
    }

    return parts;
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
    if (rawCandidate) {
        return ensureMarkdownTitle(rawCandidate, getTemplate(templateKey).defaultTitle.replace(/\.md$/i, ''));
    }

    const line = sanitizeTitle(firstMeaningfulLine(content)).slice(0, 58);
    const label = sanitizeTitle(prefix).slice(0, 28);
    const dateStem = formatLegacyDateStem(fallbackDate);
    const fallback = [label, line || getTemplateLabel(templateKey), dateStem]
        .filter(Boolean)
        .join(' - ')
        .slice(0, 72);

    return ensureMarkdownTitle(fallback, getTemplate(templateKey).defaultTitle.replace(/\.md$/i, ''));
}

export function createEmptyRepo() {
    return {
        version: AGRO_REPO_VERSION,
        nodes: [],
        activeNodeId: null,
        expandedIds: [],
        lastSaved: null,
        migratedFrom: null
    };
}

export function getNode(nodes, nodeId) {
    return (Array.isArray(nodes) ? nodes : []).find((node) => node?.id === nodeId) || null;
}

export function getChildren(nodes, parentId) {
    return (Array.isArray(nodes) ? nodes : []).filter((node) => (node?.parentId || null) === (parentId || null));
}

export function getPathNodes(nodes, nodeId) {
    const path = [];
    let cursor = getNode(nodes, nodeId);

    while (cursor) {
        path.unshift(cursor);
        cursor = cursor.parentId ? getNode(nodes, cursor.parentId) : null;
    }

    return path;
}

export function getAllFiles(nodes) {
    return (Array.isArray(nodes) ? nodes : []).filter((node) => node?.type === 'file');
}

export function getRootFolders(nodes) {
    return (Array.isArray(nodes) ? nodes : []).filter((node) => node?.type === 'folder' && node?.parentId === null);
}

export function getActiveFolderId(repoLike) {
    const repo = repoLike || createEmptyRepo();
    const active = getNode(repo.nodes, repo.activeNodeId);
    if (!active) return null;
    return active.type === 'folder' ? active.id : active.parentId;
}

export function isSystemFolder(node) {
    return Boolean(node?.type === 'folder' && node?.parentId === null && node?.system === true);
}

export function ensureUniqueNodeTitle(title, parentId, type, nodes, ignoreId = null) {
    const safe = type === 'file'
        ? ensureMarkdownTitle(title, 'nota')
        : sanitizeTitle(title) || 'Nueva carpeta';
    const base = type === 'file' ? safe.replace(/\.md$/i, '') : safe;

    const inUse = new Set(
        (Array.isArray(nodes) ? nodes : [])
            .filter((node) => node?.id !== ignoreId && node?.parentId === (parentId || null) && node?.type === type)
            .map((node) => String(node?.title || '').toLowerCase())
    );

    if (!inUse.has(safe.toLowerCase())) return safe;

    let index = 2;
    const suffix = type === 'file' ? '.md' : '';
    while (inUse.has(`${base}-${index}${suffix}`.toLowerCase())) {
        index += 1;
    }
    return `${base}-${index}${suffix}`;
}

export function buildFolderNode(nodes, overrides = {}) {
    return {
        id: String(overrides.id || buildId('agrpf')),
        type: 'folder',
        parentId: overrides.parentId || null,
        title: ensureUniqueNodeTitle(overrides.title || 'Nueva carpeta', overrides.parentId || null, 'folder', nodes, overrides.id || null),
        folderKey: String(overrides.folderKey || ''),
        system: Boolean(overrides.system),
        createdAt: overrides.createdAt || safeNow(),
        updatedAt: overrides.updatedAt || overrides.createdAt || safeNow(),
        legacyPath: String(overrides.legacyPath || '')
    };
}

export function buildFileNode(nodes, overrides = {}) {
    const templateKey = normalizeTemplateKey(overrides.templateKey);
    return {
        id: String(overrides.id || buildId('agrpn')),
        type: 'file',
        parentId: overrides.parentId || null,
        title: ensureUniqueNodeTitle(overrides.title || getTemplate(templateKey).defaultTitle, overrides.parentId || null, 'file', nodes, overrides.id || null),
        templateKey,
        content: String(overrides.content ?? getTemplateSeed(templateKey)),
        createdAt: overrides.createdAt || safeNow(),
        updatedAt: overrides.updatedAt || overrides.createdAt || safeNow(),
        legacyPath: String(overrides.legacyPath || '')
    };
}

export function createFolderInRepo(repoLike, overrides = {}) {
    const repo = normalizeRepo(repoLike);
    const folder = buildFolderNode(repo.nodes, overrides);
    repo.nodes = [...repo.nodes, folder];
    repo.activeNodeId = folder.id;
    if (folder.parentId && !repo.expandedIds.includes(folder.parentId)) {
        repo.expandedIds = [...repo.expandedIds, folder.parentId];
    }
    return { repo, node: folder };
}

export function createFileInRepo(repoLike, overrides = {}) {
    const repo = normalizeRepo(repoLike);
    const file = buildFileNode(repo.nodes, overrides);
    repo.nodes = [...repo.nodes, file];
    repo.activeNodeId = file.id;
    if (file.parentId && !repo.expandedIds.includes(file.parentId)) {
        repo.expandedIds = [...repo.expandedIds, file.parentId];
    }
    return { repo, node: file };
}

export function updateNodeInRepo(repoLike, nodeId, updates = {}) {
    const repo = normalizeRepo(repoLike);
    const node = getNode(repo.nodes, nodeId);
    if (!node) return { repo, node: null };

    if (node.type === 'folder') {
        if (typeof updates.title !== 'undefined') {
            node.title = ensureUniqueNodeTitle(updates.title || node.title, node.parentId || null, 'folder', repo.nodes, node.id);
        }
    }

    if (node.type === 'file') {
        if (typeof updates.title !== 'undefined') {
            node.title = ensureUniqueNodeTitle(updates.title || node.title, node.parentId || null, 'file', repo.nodes, node.id);
        }
        if (typeof updates.content !== 'undefined') {
            node.content = String(updates.content ?? '');
        }
        if (typeof updates.templateKey !== 'undefined') {
            node.templateKey = normalizeTemplateKey(updates.templateKey || node.templateKey);
        }
    }

    if (typeof updates.legacyPath !== 'undefined') {
        node.legacyPath = String(updates.legacyPath || '');
    }

    node.updatedAt = updates.updatedAt || safeNow();
    return { repo, node };
}

export function deleteNodeFromRepo(repoLike, nodeId) {
    const repo = normalizeRepo(repoLike);
    const node = getNode(repo.nodes, nodeId);

    if (!node || isSystemFolder(node)) {
        return { repo, removedIds: [], removed: false };
    }

    const removedIds = [];
    const queue = [nodeId];

    while (queue.length) {
        const currentId = queue.shift();
        removedIds.push(currentId);
        getChildren(repo.nodes, currentId).forEach((child) => queue.push(child.id));
    }

    repo.nodes = repo.nodes.filter((entry) => !removedIds.includes(entry.id));
    repo.expandedIds = repo.expandedIds.filter((id) => !removedIds.includes(id));

    if (removedIds.includes(repo.activeNodeId)) {
        repo.activeNodeId = getAllFiles(repo.nodes)[0]?.id || getRootFolders(repo.nodes)[0]?.id || null;
    }

    return { repo, removedIds, removed: true };
}

function findSystemFolderIdByKey(nodes, folderKey) {
    return getRootFolders(nodes).find((node) => node.folderKey === folderKey)?.id || null;
}

function ensureFolderChain(repo, rootFolderKey, subfolders = []) {
    const safeRepo = repo || createEmptyRepo();
    let parentId = findSystemFolderIdByKey(safeRepo.nodes, rootFolderKey) || null;

    subfolders.forEach((title) => {
        const safeTitle = sanitizeTitle(title);
        if (!safeTitle) return;

        const existing = safeRepo.nodes.find((node) =>
            node?.type === 'folder'
            && node?.parentId === parentId
            && String(node?.title || '').toLowerCase() === safeTitle.toLowerCase()
        );

        if (existing) {
            parentId = existing.id;
            return;
        }

        const folder = buildFolderNode(safeRepo.nodes, {
            title: safeTitle,
            parentId,
            system: false
        });
        safeRepo.nodes.push(folder);
        parentId = folder.id;
    });

    return parentId || findSystemFolderIdByKey(safeRepo.nodes, rootFolderKey);
}

function ensureSystemRoots(repoLike) {
    const repo = repoLike || createEmptyRepo();
    const draftNodes = Array.isArray(repo.nodes) ? [...repo.nodes] : [];

    AGRO_REPO_ROOT_FOLDERS.forEach((folderDef) => {
        const existing = draftNodes.find((node) =>
            node?.type === 'folder'
            && node?.parentId === null
            && (node?.folderKey === folderDef.key || resolveRootFolderKey(node?.title) === folderDef.key)
        );

        if (existing) {
            existing.title = folderDef.label;
            existing.folderKey = folderDef.key;
            existing.system = true;
            return;
        }

        draftNodes.push(buildFolderNode(draftNodes, {
            title: folderDef.label,
            parentId: null,
            folderKey: folderDef.key,
            system: true
        }));
    });

    repo.nodes = draftNodes;

    const miFincaRootId = findSystemFolderIdByKey(repo.nodes, 'mi-finca');
    const hasMiFincaFile = repo.nodes.some((node) => node?.type === 'file' && node?.parentId === miFincaRootId);
    if (!hasMiFincaFile && miFincaRootId) {
        const seed = AGRO_REPO_ROOT_FOLDERS.find((folder) => folder.key === 'mi-finca')?.seedFiles || [];
        seed.forEach((file) => {
            repo.nodes.push(buildFileNode(repo.nodes, {
                parentId: miFincaRootId,
                templateKey: file.templateKey,
                title: file.title
            }));
        });
    }

    return repo;
}

function normalizeFolderNode(node, nodes) {
    const rootKey = node?.parentId === null
        ? resolveRootFolderKey(node?.folderKey || node?.title)
        : '';

    return buildFolderNode(nodes, {
        id: node?.id,
        parentId: node?.parentId || null,
        title: node?.parentId === null && rootKey ? getRootFolder(rootKey).label : node?.title,
        folderKey: rootKey,
        system: node?.parentId === null && Boolean(rootKey),
        createdAt: node?.createdAt,
        updatedAt: node?.updatedAt,
        legacyPath: node?.legacyPath
    });
}

function normalizeFileNode(node, nodes, fallbackParentId) {
    const parentId = getNode(nodes, node?.parentId)?.type === 'folder'
        ? node.parentId
        : fallbackParentId;
    const templateKey = node?.templateKey || inferTemplateKeyFromLegacy(node?.entryType);

    return buildFileNode(nodes, {
        id: node?.id,
        parentId,
        title: node?.title,
        templateKey,
        content: node?.content,
        createdAt: node?.createdAt,
        updatedAt: node?.updatedAt,
        legacyPath: node?.legacyPath
    });
}

function normalizeTreeRepo(repoLike) {
    const draft = createEmptyRepo();
    const rawNodes = Array.isArray(repoLike?.nodes) ? repoLike.nodes : [];

    rawNodes
        .filter((node) => node?.type === 'folder')
        .forEach((node) => {
            draft.nodes.push(normalizeFolderNode(node, draft.nodes));
        });

    ensureSystemRoots(draft);

    const fallbackParentId = findSystemFolderIdByKey(draft.nodes, 'mi-finca');

    rawNodes
        .filter((node) => node?.type === 'file')
        .forEach((node) => {
            draft.nodes.push(normalizeFileNode(node, draft.nodes, fallbackParentId));
        });

    ensureSystemRoots(draft);

    const folderIds = new Set(draft.nodes.filter((node) => node.type === 'folder').map((node) => node.id));
    draft.expandedIds = Array.isArray(repoLike?.expandedIds)
        ? Array.from(new Set(repoLike.expandedIds.filter((id) => folderIds.has(id))))
        : [];

    getRootFolders(draft.nodes).forEach((folder) => {
        if (!draft.expandedIds.includes(folder.id)) draft.expandedIds.push(folder.id);
    });

    draft.lastSaved = repoLike?.lastSaved || null;
    draft.migratedFrom = repoLike?.migratedFrom || null;

    const activeNode = getNode(draft.nodes, repoLike?.activeNodeId);
    draft.activeNodeId = activeNode?.id || getAllFiles(draft.nodes)[0]?.id || getRootFolders(draft.nodes)[0]?.id || null;

    getPathNodes(draft.nodes, draft.activeNodeId)
        .filter((node) => node.type === 'folder')
        .forEach((node) => {
            if (!draft.expandedIds.includes(node.id)) draft.expandedIds.push(node.id);
        });

    return draft;
}

function deriveTargetLocation(title, templateKey, legacyPath) {
    const pathParts = splitLegacyPath(legacyPath, title);
    const rootFromPath = resolveRootFolderKey(pathParts[0]);

    if (rootFromPath) {
        return {
            rootKey: rootFromPath,
            subfolders: pathParts.slice(1)
        };
    }

    return {
        rootKey: getTemplateFolderKey(templateKey),
        subfolders: pathParts
    };
}

function addFileToStructuredRepo(repo, fileLike) {
    const templateKey = normalizeTemplateKey(fileLike?.templateKey || inferTemplateKeyFromLegacy(fileLike?.entryType));
    const target = deriveTargetLocation(fileLike?.title, templateKey, fileLike?.legacyPath);
    const parentId = ensureFolderChain(repo, target.rootKey, target.subfolders);
    const hintLabel = target.subfolders[target.subfolders.length - 1] || getRootFolder(target.rootKey).label;
    const title = buildMigratedTitle(
        fileLike?.title,
        fileLike?.content,
        templateKey,
        fileLike?.updatedAt || fileLike?.createdAt,
        hintLabel
    );

    repo.nodes.push(buildFileNode(repo.nodes, {
        parentId,
        title,
        templateKey,
        content: String(fileLike?.content || ''),
        createdAt: fileLike?.createdAt || safeNow(),
        updatedAt: fileLike?.updatedAt || fileLike?.createdAt || safeNow(),
        legacyPath: String(fileLike?.legacyPath || '')
    }));
}

function migrateFromFlatMvp(payload) {
    const repo = ensureSystemRoots(createEmptyRepo());
    const notes = Array.isArray(payload?.notes) ? payload.notes : [];

    notes
        .slice()
        .sort(compareByUpdatedAt)
        .forEach((note) => addFileToStructuredRepo(repo, note));

    repo.activeNodeId = getAllFiles(repo.nodes)[0]?.id || getRootFolders(repo.nodes)[0]?.id || null;
    repo.expandedIds = getRootFolders(repo.nodes).map((folder) => folder.id);
    repo.migratedFrom = 'flat-mvp';
    return repo;
}

function migrateFromTreeV3(payload) {
    const repo = ensureSystemRoots(createEmptyRepo());
    const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
    const files = nodes
        .filter((node) => node?.type === 'file')
        .map((file) => ({
            ...file,
            templateKey: inferTemplateKeyFromLegacy(file?.entryType),
            legacyPath: getPathNodes(nodes, file.id).map((node) => node.title).join(' / ')
        }))
        .sort(compareByUpdatedAt);

    files.forEach((file) => addFileToStructuredRepo(repo, file));

    repo.activeNodeId = getAllFiles(repo.nodes)[0]?.id || getRootFolders(repo.nodes)[0]?.id || null;
    repo.expandedIds = getRootFolders(repo.nodes).map((folder) => folder.id);
    repo.migratedFrom = AGRO_REPO_LEGACY_TREE_KEY;
    return repo;
}

function migrateFromFlatV2(payload) {
    const repo = ensureSystemRoots(createEmptyRepo());
    const bitacoras = Array.isArray(payload?.bitacoras) ? payload.bitacoras : [];

    bitacoras.forEach((bitacora) => {
        const legacyBase = sanitizeTitle(bitacora?.name || 'Bitacora');
        const reports = Array.isArray(bitacora?.reports) ? bitacora.reports : [];

        reports
            .slice()
            .sort(compareByUpdatedAt)
            .forEach((report) => {
                addFileToStructuredRepo(repo, {
                    ...report,
                    templateKey: inferTemplateKeyFromLegacy(report?.entryType),
                    legacyPath: legacyBase
                });
            });
    });

    repo.activeNodeId = getAllFiles(repo.nodes)[0]?.id || getRootFolders(repo.nodes)[0]?.id || null;
    repo.expandedIds = getRootFolders(repo.nodes).map((folder) => folder.id);
    repo.migratedFrom = AGRO_REPO_LEGACY_FLAT_KEY;
    return repo;
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

export function normalizeRepo(repoLike) {
    const raw = repoLike || createEmptyRepo();
    if (Array.isArray(raw?.notes)) {
        return normalizeTreeRepo(migrateFromFlatMvp(raw));
    }
    return normalizeTreeRepo(raw);
}

export function loadRepoState() {
    try {
        const current = readStorage(AGRO_REPO_STORAGE_KEY);
        if (Array.isArray(current?.nodes) || Array.isArray(current?.notes)) {
            const repo = persistRepoState(normalizeRepo(current));
            return {
                repo,
                notice: Array.isArray(current?.notes) ? 'Se organizo tu AgroRepo actual en una estructura de carpetas local.' : ''
            };
        }

        const legacyTree = readStorage(AGRO_REPO_LEGACY_TREE_KEY);
        if (Array.isArray(legacyTree?.nodes)) {
            const repo = persistRepoState(migrateFromTreeV3(legacyTree));
            return {
                repo,
                notice: 'Se migro tu AgroRepo legacy a la nueva estructura de arbol local.'
            };
        }

        const legacyFlat = readStorage(AGRO_REPO_LEGACY_FLAT_KEY);
        if (Array.isArray(legacyFlat?.bitacoras)) {
            const repo = persistRepoState(migrateFromFlatV2(legacyFlat));
            return {
                repo,
                notice: 'Se migraron tus notas legacy al arbol local de AgroRepo.'
            };
        }

        return {
            repo: persistRepoState(ensureSystemRoots(createEmptyRepo())),
            notice: ''
        };
    } catch {
        return {
            repo: persistRepoState(ensureSystemRoots(createEmptyRepo())),
            notice: ''
        };
    }
}

export function persistRepoState(repoLike) {
    const repo = normalizeRepo(repoLike);
    repo.lastSaved = safeNow();
    writeStorage(AGRO_REPO_STORAGE_KEY, {
        version: AGRO_REPO_VERSION,
        nodes: repo.nodes,
        activeNodeId: repo.activeNodeId,
        expandedIds: repo.expandedIds,
        lastSaved: repo.lastSaved,
        migratedFrom: repo.migratedFrom
    });
    return repo;
}

function getRootFolderForNode(nodes, nodeId) {
    return getPathNodes(nodes, nodeId).find((node) => node.type === 'folder' && node.parentId === null) || null;
}

export function buildRepoContext(repoLike) {
    const repo = normalizeRepo(repoLike);
    const files = getAllFiles(repo.nodes).sort(compareByUpdatedAt);
    const activeNode = getNode(repo.nodes, repo.activeNodeId);
    const activeFile = activeNode?.type === 'file' ? activeNode : null;
    const rootKeysWithFiles = new Set(files.map((file) => getRootFolderForNode(repo.nodes, file.id)?.folderKey).filter(Boolean));

    return {
        bitacoras_count: rootKeysWithFiles.size,
        total_reports: files.length,
        total_files: files.length,
        active_bitacora: activeNode ? getRootFolderForNode(repo.nodes, activeNode.id)?.title || null : null,
        active_path: activeNode ? getPathNodes(repo.nodes, activeNode.id).map((node) => node.title).join(' / ') : '',
        recent_entries: files.slice(0, 12).map((file) => ({
            bitacora: getRootFolderForNode(repo.nodes, file.id)?.title || getTemplateLabel(file.templateKey),
            path: getPathNodes(repo.nodes, file.id).map((node) => node.title).join(' / '),
            type: file.templateKey,
            tags: [file.templateKey],
            content: buildNoteSnippet(file.content, 180),
            date: file.updatedAt || file.createdAt
        })),
        active_file: activeFile?.title || null
    };
}
