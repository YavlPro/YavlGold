/**
 * agro-repo-sync.js — Sincronización AgroRepo ↔ Supabase (Fase 4, F4-2/F4-4)
 *
 * Decisiones canónicas del owner (2026-09-20):
 *  - A1: Supabase es la fuente de verdad persistente; localStorage es la
 *    caché de trabajo offline.
 *  - B1: la migración automática en primera carga hace un RESPALDO LOCAL
 *    PREVIO obligatorio (agrorepo_mvp_v1_backup_pre_sync).
 *  - C2: el retrieval de la IA (agro-memory-retrieval.js) sigue leyendo la
 *    caché local — este módulo la mantiene sincronizada tras cada pull.
 *  - Conflictos V1: "última escritura gana" por updated_at (LWW por entrada).
 *
 * Contrato de dependencias (§3.3, sin circulares):
 *  - Importa supabase-config, agro-repo-storage.js y agro-repo-templates.js
 *    (todos hoja respecto de este módulo).
 *  - agro-repo-storage.js lo carga con import() DINÁMICO desde
 *    persistRepoState (F4-3) — no existe import estático inverso.
 *
 * Garantías de seguridad de datos:
 *  - El pull NUNCA elimina nodos locales: solo añade filas nuevas del server
 *    o sobrescribe nodos cuyo updated_at del server es MAYOR (LWW).
 *  - El push NUNCA hace DELETE: solo inserta/actualiza filas que difieren
 *    del baseline del último pull (por contenido, no por timestamp — el
 *    storage no bumpa updatedAt en soft-delete/restore).
 *  - Si el server está vacío (primera sincronización), el árbol local
 *    completo se migra tal cual (después del respaldo obligatorio).
 *  - Sin sesión autenticada: el módulo no opera (comportamiento local-only
 *    intacto).
 */

import { supabase } from '../assets/js/config/supabase-config.js';
import {
    AGRO_REPO_STORAGE_KEY,
    normalizeRepo,
    persistRepoState
} from './agro-repo-storage.js';
import { AGRO_REPO_ROOT_FOLDERS } from './agro-repo-templates.js';

const SYNC_BACKUP_KEY = 'agrorepo_mvp_v1_backup_pre_sync';
const SYNC_BACKUP_MARKER_KEY = 'agrorepo_sync_backup_v1';
const SYNC_PENDING_KEY = 'agrorepo_sync_pending_v1';
const PUSH_DEBOUNCE_MS = 1500;
const UPSERT_CHUNK_SIZE = 200;

const state = {
    initialized: false,
    initializing: null,
    userId: null,
    syncing: false,
    pushTimer: null,
    onlineListenerBound: false,
    // Baseline del último pull: client_id -> firma de contenido de la fila.
    // El push solo envía filas nuevas o cuya firma local difiere.
    baseline: new Map()
};

// ---------------------------------------------------------------------------
// Local raw IO (la caché de trabajo; nunca es fuente de verdad post-sync)
// ---------------------------------------------------------------------------

function readLocalRepoRaw() {
    try {
        const raw = localStorage.getItem(AGRO_REPO_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_err) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// B1: respaldo local previo obligatorio (antes de tocar nada del server)
// ---------------------------------------------------------------------------

function ensurePreSyncBackup() {
    try {
        if (localStorage.getItem(SYNC_BACKUP_MARKER_KEY) === '1') return;
        const raw = localStorage.getItem(AGRO_REPO_STORAGE_KEY);
        // Solo respalda si hay árbol que proteger; el marcador se marca igual
        // para no reintentar en cada carga.
        if (raw) {
            localStorage.setItem(SYNC_BACKUP_KEY, raw);
        }
        localStorage.setItem(SYNC_BACKUP_MARKER_KEY, '1');
    } catch (_err) {
        // Sin espacio para el respaldo: NO se sincroniza (B1 es obligatorio).
        throw new Error('REPO_SYNC_BACKUP_FAILED');
    }
}

// ---------------------------------------------------------------------------
// Flatten / expand (árbol plano con parentId ⇄ filas)
// ---------------------------------------------------------------------------

function comparableRowFromNode(node, position) {
    return {
        client_id: String(node?.id || ''),
        parent_client_id: node?.parentId ? String(node.parentId) : null,
        entry_type: node?.type === 'folder' ? 'folder' : 'note',
        title: String(node?.title || ''),
        content: node?.type === 'file' ? String(node.content ?? '') : '',
        template: node?.type === 'file' ? (node.templateKey || null) : null,
        folder_key: node?.type === 'folder' ? (node.folderKey || null) : null,
        position,
        is_system_root: Boolean(node?.type === 'folder' && node?.system),
        deleted_at: node?.deletedAt ? String(node.deletedAt) : null,
        deleted_from_parent_id: node?.deletedFromParentId ? String(node.deletedFromParentId) : null
    };
}

function rowSignature(row) {
    return JSON.stringify([
        row.client_id, row.parent_client_id, row.entry_type, row.title,
        row.content, row.template, row.folder_key, row.position,
        row.is_system_root, row.deleted_at, row.deleted_from_parent_id
    ]);
}

// Aplana el árbol preservando el orden de hermanos (índice dentro del padre).
function flattenLocalTree(nodes) {
    const counterByParent = new Map();
    const rows = [];
    (Array.isArray(nodes) ? nodes : []).forEach((node) => {
        const parentKey = node?.parentId ? String(node.parentId) : '';
        const position = counterByParent.get(parentKey) || 0;
        counterByParent.set(parentKey, position + 1);
        rows.push(comparableRowFromNode(node, position));
    });
    return rows;
}

function nodeFromServerRow(row, existingNode) {
    const createdAt = row.created_at || (existingNode?.createdAt || null);
    const updatedAt = row.updated_at || createdAt || null;
    if (row.entry_type === 'folder') {
        return {
            id: String(row.client_id),
            type: 'folder',
            parentId: row.parent_client_id ? String(row.parent_client_id) : null,
            title: String(row.title || ''),
            folderKey: row.folder_key ? String(row.folder_key) : '',
            system: Boolean(row.is_system_root),
            createdAt,
            updatedAt,
            legacyPath: String(existingNode?.legacyPath || ''),
            deletedAt: row.deleted_at ? String(row.deleted_at) : '',
            deletedFromParentId: row.deleted_from_parent_id ? String(row.deleted_from_parent_id) : null
        };
    }
    return {
        id: String(row.client_id),
        type: 'file',
        parentId: row.parent_client_id ? String(row.parent_client_id) : null,
        title: String(row.title || ''),
        templateKey: row.template ? String(row.template) : 'nota-libre',
        content: String(row.content ?? ''),
        createdAt,
        updatedAt,
        legacyPath: String(existingNode?.legacyPath || ''),
        deletedAt: row.deleted_at ? String(row.deleted_at) : '',
        deletedFromParentId: row.deleted_from_parent_id ? String(row.deleted_from_parent_id) : null
    };
}

// Reconstruye el orden del array respetando position entre hermanos.
function reorderNodesByPosition(nodes) {
    const withPos = (Array.isArray(nodes) ? nodes : []).map((node, index) => ({ node, index }));
    const byParent = new Map();
    withPos.forEach((entry) => {
        const parentKey = entry.node?.parentId ? String(entry.node.parentId) : '';
        if (!byParent.has(parentKey)) byParent.set(parentKey, []);
        byParent.get(parentKey).push(entry);
    });

    const positionById = new Map();
    byParent.forEach((siblings) => {
        siblings
            .slice()
            .sort((a, b) => {
                const posA = Number(a.node?.__syncPosition);
                const posB = Number(b.node?.__syncPosition);
                const aHas = Number.isFinite(posA);
                const bHas = Number.isFinite(posB);
                if (aHas && bHas && posA !== posB) return posA - posB;
                if (aHas !== bHas) return aHas ? -1 : 1;
                return a.index - b.index;
            })
            .forEach((entry, order) => positionById.set(entry.node.id, order));
    });

    const out = [];
    const emit = (parentKey) => {
        (byParent.get(parentKey) || []).forEach((entry) => {
            out.push(entry.node);
            emit(String(entry.node.id));
        });
    };
    emit('');
    // Defensivo: nodos no alcanzables desde la raíz van al final (normalize
    // los re-ubicará en el fallback de huérfanos).
    withPos.forEach((entry) => {
        if (!out.includes(entry.node)) out.push(entry.node);
    });
    return out;
}

// Deriva los overrides de sistema (renamedSystemFolders /
// deletedSystemFolders) desde las filas del server, para que otro
// dispositivo no revierta renombres ni recreé roots borrados.
function deriveSystemOverrides(serverRows) {
    const canonicalByKey = new Map(AGRO_REPO_ROOT_FOLDERS.map((folder) => [folder.key, folder.label]));
    const renamed = {};
    const deleted = [];
    (Array.isArray(serverRows) ? serverRows : []).forEach((row) => {
        if (!row?.is_system_root || !row?.folder_key) return;
        if (row.deleted_at) {
            deleted.push(String(row.folder_key));
            return;
        }
        const canonical = canonicalByKey.get(String(row.folder_key));
        const title = String(row.title || '').trim();
        if (canonical && title && title !== canonical) {
            renamed[String(row.folder_key)] = title;
        }
    });
    return { renamed, deleted };
}

// ---------------------------------------------------------------------------
// Pull (server → caché local, LWW por updated_at; nunca elimina nodos)
// ---------------------------------------------------------------------------

async function pullAndMerge() {
    const { data: serverRows, error } = await supabase
        .from('agro_repo_entries')
        .select('client_id,parent_client_id,entry_type,title,content,template,folder_key,position,is_system_root,deleted_at,deleted_from_parent_id,created_at,updated_at')
        .order('updated_at', { ascending: true });
    if (error) throw error;
    const rows = Array.isArray(serverRows) ? serverRows : [];

    // Reconstruye el baseline para el push por contenido.
    state.baseline = new Map(rows.map((row) => {
        const comparable = comparableRowFromServer(row);
        return [String(row.client_id), rowSignature(comparable)];
    }));

    const local = readLocalRepoRaw() || {};
    const localNodes = Array.isArray(local.nodes) ? [...local.nodes] : [];
    const localById = new Map(localNodes.map((node) => [String(node?.id), node]));

    let changed = false;
    rows.forEach((row) => {
        const clientKey = String(row.client_id || '');
        if (!clientKey) return;
        const existing = localById.get(clientKey);
        const serverUpdatedMs = Date.parse(row.updated_at || '') || 0;
        const localUpdatedMs = existing
            ? (Date.parse(existing.updatedAt || existing.createdAt || '') || 0)
            : 0;

        // LWW: solo aplica el server cuando es estrictamente más nuevo (o es
        // un nodo que no existe localmente).
        if (existing && serverUpdatedMs <= localUpdatedMs) return;

        const merged = nodeFromServerRow(row, existing);
        if (Number.isFinite(Number(row.position))) {
            merged.__syncPosition = Number(row.position);
        }
        if (existing) {
            localById.set(clientKey, merged);
            const idx = localNodes.findIndex((node) => String(node?.id) === clientKey);
            if (idx >= 0) localNodes[idx] = merged;
        } else {
            localNodes.push(merged);
        }
        changed = true;
    });

    const overrides = deriveSystemOverrides(rows);
    const localDeletedKeys = Array.isArray(local.deletedSystemFolders) ? local.deletedSystemFolders : [];
    const localRenamed = local.renamedSystemFolders && typeof local.renamedSystemFolders === 'object'
        ? local.renamedSystemFolders
        : {};
    const overridesChanged =
        JSON.stringify([...localDeletedKeys].sort()) !== JSON.stringify([...overrides.deleted].sort()) ||
        JSON.stringify(localRenamed) !== JSON.stringify(overrides.renamed);

    if (!changed && !overridesChanged) return;

    const ordered = reorderNodesByPosition(localNodes).map((node) => {
        const { __syncPosition, ...rest } = node;
        return rest;
    });

    // Limpia claves internas antes de persistir la caché sincronizada (C2).
    const mergedRepo = {
        ...local,
        nodes: ordered,
        deletedSystemFolders: Array.from(new Set([...localDeletedKeys, ...overrides.deleted])),
        renamedSystemFolders: { ...localRenamed, ...overrides.renamed }
    };

    // persistRepoState → normalizeRepo re-deriva canónicos (roots, huérfanos
    // → mi-finca, tabs válidos). Su evento 'persist' reentrante es no-op: el
    // baseline ya refleja este estado.
    persistRepoState(mergedRepo);
}

function comparableRowFromServer(row) {
    return {
        client_id: String(row.client_id || ''),
        parent_client_id: row.parent_client_id ? String(row.parent_client_id) : null,
        entry_type: row.entry_type === 'folder' ? 'folder' : 'note',
        title: String(row.title || ''),
        content: String(row.content ?? ''),
        template: row.template ? String(row.template) : null,
        folder_key: row.folder_key ? String(row.folder_key) : null,
        position: Number(row.position) || 0,
        is_system_root: Boolean(row.is_system_root),
        deleted_at: row.deleted_at ? String(row.deleted_at) : null,
        deleted_from_parent_id: row.deleted_from_parent_id ? String(row.deleted_from_parent_id) : null
    };
}

// ---------------------------------------------------------------------------
// Push (caché local → server; insert/update de diferencias, nunca DELETE)
// ---------------------------------------------------------------------------

async function pushLocalTree() {
    if (!state.userId) return;

    const local = readLocalRepoRaw();
    if (!local || !Array.isArray(local.nodes)) return;

    // flatten sobre el árbol normalizado leído de la caché (post-pull).
    const rows = flattenLocalTree(normalizeRepo(local).nodes)
        .filter((row) => row.client_id);

    // Solo filas nuevas o cuya firma difiere del baseline del último pull.
    const dirty = rows.filter((row) => {
        const signature = rowSignature(row);
        return state.baseline.get(row.client_id) !== signature;
    });
    if (!dirty.length) return;

    const stamped = dirty.map((row) => ({
        ...row,
        user_id: state.userId,
        created_at: null,
        updated_at: null
    }));

    // Preserva created_at/updated_at del nodo local (LWW por updated_at).
    const nodesById = new Map((local.nodes || []).map((node) => [String(node?.id), node]));
    stamped.forEach((row) => {
        const node = nodesById.get(row.client_id);
        row.created_at = node?.createdAt || new Date().toISOString();
        row.updated_at = node?.updatedAt || node?.createdAt || new Date().toISOString();
        // Los soft-deletes/restores cuentan como escritura para LWW.
        if (node?.deletedAt && String(node.deletedAt) > row.updated_at) {
            row.updated_at = String(node.deletedAt);
        }
    });

    for (let i = 0; i < stamped.length; i += UPSERT_CHUNK_SIZE) {
        const chunk = stamped.slice(i, i + UPSERT_CHUNK_SIZE);
        const { error } = await supabase
            .from('agro_repo_entries')
            .upsert(chunk, { onConflict: 'user_id,client_id' });
        if (error) throw error;
    }

    // Actualiza el baseline con lo recién empujado.
    stamped.forEach((row) => {
        state.baseline.set(row.client_id, rowSignature(row));
    });
}

// ---------------------------------------------------------------------------
// Orquestación
// ---------------------------------------------------------------------------

function isOfflineishError(err) {
    const name = String(err?.name || '');
    const message = String(err?.message || '').toLowerCase();
    return name === 'FunctionsFetchError' ||
        name === 'FunctionsRelayError' ||
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('failed to');
}

function markPendingSync(pending) {
    try {
        if (pending) localStorage.setItem(SYNC_PENDING_KEY, '1');
        else localStorage.removeItem(SYNC_PENDING_KEY);
    } catch (_err) { /* best-effort */ }
}

async function syncNow(reason) {
    if (state.syncing || !state.userId) return;
    state.syncing = true;
    try {
        await pullAndMerge();
        await pushLocalTree();
        markPendingSync(false);
    } catch (err) {
        if (isOfflineishError(err)) {
            // F4-4: cola offline — se reintenta al recuperar conexión (o en la
            // próxima mutación que llegue estando online).
            markPendingSync(true);
        } else {
            console.warn('[AgroRepoSync] error de sincronización:', err?.message || err);
        }
    } finally {
        state.syncing = false;
    }
}

function scheduleDebouncedSync() {
    if (state.pushTimer) clearTimeout(state.pushTimer);
    state.pushTimer = setTimeout(() => {
        state.pushTimer = null;
        syncNow('debounced-persist');
    }, PUSH_DEBOUNCE_MS);
}

function bindOnlineListener() {
    if (state.onlineListenerBound || typeof window === 'undefined') return;
    state.onlineListenerBound = true;
    // Listener de vida de la app (singleton del módulo): sin removeEventListener
    // por diseño, documentado bajo §11.2.
    window.addEventListener('online', () => {
        syncNow('online');
    });
}

async function ensureInitialized() {
    if (state.initialized) return;
    if (state.initializing) return state.initializing;

    state.initializing = (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // Sin sesión: comportamiento local-only intacto. Se reintenta en
            // el próximo evento de persistencia.
            state.initializing = null;
            return;
        }
        state.userId = user.id;

        // B1: respaldo local previo obligatorio ANTES de la primera
        // sincronización. Si el respaldo falla, no se sincroniza nada.
        ensurePreSyncBackup();

        bindOnlineListener();
        await syncNow('init');
        state.initialized = true;
    })().catch((_err) => {
        state.initializing = null;
    });

    return state.initializing;
}

/**
 * Punto de entrada notificado por agro-repo-storage.js (F4-3). Cada
 * persistencia local (carga inicial incluida) asegura la inicialización del
 * sync y agenda un ciclo pull+push debounced. El guard por contenido del
 * baseline hace que las persistencias sin cambios (normalizaciones de carga)
 * sean no-op en el server.
 */
export function notifyRepoSyncEvent(event) {
    ensureInitialized()
        .then(() => {
            if (!state.userId) return;
            if (event === 'persist') {
                scheduleDebouncedSync();
            }
        })
        .catch(() => { /* best-effort */ });
}

console.info('[AgroRepoSync] módulo de sincronización cargado (Fase 4)');
