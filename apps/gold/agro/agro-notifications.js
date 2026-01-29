/**
 * YavlGold V9.6.2 - Agro Notifications Module
 * "Centro de Alertas Inteligente"
 * Con historial persistente, timestamps y sincronización IA en tiempo real
 * V9.6.2: Consulta Supabase para cultivos si hay sesión
 */
import supabase from '../assets/js/config/supabase-config.js';

// ============================================
// STATE
// ============================================
let notifications = [];
let readNotifications = [];
let notificationsReady = false;
let isDropdownOpen = false;
let adviceObserver = null;
let lastAdviceText = '';
let authListenerAttached = false;
let refreshInFlight = false;
let refreshQueued = false;
let cropsStatus = 'idle';
let cropsReadyCount = null;
let cropsReadyAt = null;
let cropsSnapshot = null;
let lastSeenSeq = -1;
let lastSeenAt = 0;
let lastEvaluatedSeq = -1;
let lastEvaluatedAt = 0;
let cropsReadyListenerAttached = false;
let pendingRefreshReason = null;
let alertsEvalSeq = 0;
let sessionState = 'unknown';

const STORAGE_KEY = 'yavlgold_agro_notifications';
const READ_STORAGE_KEY = 'yavlgold_agro_notifications_read';
const MAX_READ_HISTORY = 200; // Máximo de notificaciones leídas a conservar
const AGRO_CROPS_READY_EVENT = 'AGRO_CROPS_READY';
const SYSTEM_ID_PREFIX = 'sys-';
const SYSTEM_LOADING_ID = 'sys-loading-crops';
const SYSTEM_NO_CROPS_ID = 'sys-no-crops';
const SYSTEM_LOADING_TITLE = 'Cargando cultivos...';
const SYSTEM_NO_CROPS_TITLE = 'Agrega tu primer cultivo';
const SYSTEM_NO_CROPS_MESSAGE = 'Agrega tu primer cultivo para alertas personalizadas.';
const AGRO_DEBUG = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('debug') === '1';
const ALERTS_MODE = 'facturero';
const FACTURERO_ONLY = ALERTS_MODE === 'facturero';
const FACTURERO_TABS = new Set(['gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias']);
const FACTURERO_SOURCE_LABEL = 'Facturero';
const FACTURERO_LABELS = {
    gastos: { singular: 'Gasto', plural: 'Gastos' },
    ingresos: { singular: 'Ingreso', plural: 'Ingresos' },
    pendientes: { singular: 'Pendiente', plural: 'Pendientes' },
    perdidas: { singular: 'Pérdida', plural: 'Pérdidas' },
    transferencias: { singular: 'Transferencia', plural: 'Transferencias' }
};
const FACTURERO_RECENT_DAYS = 2;
const FACTURERO_LARGE_AMOUNT = 500;

const ALERTS_SESSION_MAX_ATTEMPTS = 8;
const ALERTS_SESSION_BASE_DELAY = 200;
const ALERTS_SESSION_MAX_DELAY = 800;

function logAgroNotifDebug(label, detail = {}) {
    if (!AGRO_DEBUG) return;
    console.log(`[AgroNotif] ${label}`, detail);
}

function isSystemNotif(notif) {
    return typeof notif?.id === 'string' && notif.id.startsWith(SYSTEM_ID_PREFIX);
}

function isLegacySystemTitle(notif) {
    const rawTitle = notif?.title ? String(notif.title) : '';
    const title = rawTitle.toLowerCase().trim();
    if (!title) return false;
    if (title.includes('sin cultivos')) return true;
    if (title.includes('cargando')) return true;
    return false;
}

function getNotificationText(notif) {
    const title = notif?.title ? String(notif.title) : '';
    const message = notif?.message ? String(notif.message) : '';
    const text = notif?.text ? String(notif.text) : '';
    return `${title} ${message} ${text}`.toLowerCase();
}

function isLegacySystemReady(notif) {
    const text = getNotificationText(notif);
    if (!text) return false;
    if (text.includes('sistema listo')) return true;
    if (text.includes('oráculo está monitoreando')) return true;
    if (text.includes('oraculo esta monitoreando')) return true;
    if (text.includes('consejos ia')) return true;
    return false;
}

function isTransientNotification(notif) {
    return isSystemNotif(notif) || isLegacySystemTitle(notif) || isLegacySystemReady(notif);
}

function sanitizeNotifications(list) {
    const items = Array.isArray(list) ? list : [];
    return items.filter((notif) => {
        const id = notif?.id;
        if (id === null || id === undefined || String(id).trim() === '') return false;
        return !isTransientNotification(notif);
    });
}

function normalizeNotificationId(id) {
    if (id === null || id === undefined) return '';
    return String(id).trim();
}

function coerceDate(value, fallback = null) {
    if (!value) return fallback;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date;
}

function normalizeNotification(raw, options = {}) {
    if (!raw) return null;
    const id = normalizeNotificationId(raw.id);
    if (!id) return null;

    const timestamp = coerceDate(raw.timestamp, new Date());
    const readAt = coerceDate(raw.readAt, null);
    const meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : null;
    const read = options.forceRead ? true : !!raw.read;
    let origin = raw.origin || meta?.origin || '';
    let entity = raw.entity || meta?.entity || '';
    if (!origin && id.startsWith('facturero:')) {
        origin = 'facturero';
        const parts = id.split(':');
        if (parts.length > 1) entity = parts[1];
    }
    if (!entity && meta?.tab) entity = meta.tab;
    const sourceLabel = raw.sourceLabel || meta?.sourceLabel || (origin === 'facturero' ? FACTURERO_SOURCE_LABEL : '');
    const deepLink = raw.deepLink || meta?.deepLink || null;
    const subtitle = raw.subtitle ? String(raw.subtitle) : '';
    const metaLine = raw.metaLine ? String(raw.metaLine) : '';

    return {
        id,
        type: raw.type || 'warning',
        title: raw.title ? String(raw.title) : '',
        message: raw.message ? String(raw.message) : '',
        icon: raw.icon ? String(raw.icon) : 'fa-info-circle',
        timestamp,
        read,
        readAt: read ? (readAt || new Date()) : null,
        origin,
        entity,
        sourceLabel,
        deepLink,
        subtitle,
        metaLine,
        meta
    };
}

function normalizeNotificationList(list, options = {}) {
    const items = sanitizeNotifications(list);
    const deduped = [];
    const seen = new Set();
    items.forEach((raw) => {
        const notif = normalizeNotification(raw, options);
        if (!notif || seen.has(notif.id)) return;
        seen.add(notif.id);
        deduped.push(notif);
    });
    return deduped;
}

function serializeNotification(notif) {
    if (!notif) return null;
    return {
        id: normalizeNotificationId(notif.id),
        type: notif.type || 'warning',
        title: notif.title ? String(notif.title) : '',
        message: notif.message ? String(notif.message) : '',
        icon: notif.icon ? String(notif.icon) : 'fa-info-circle',
        timestamp: coerceDate(notif.timestamp, new Date()).toISOString(),
        read: !!notif.read,
        readAt: notif.read ? coerceDate(notif.readAt, new Date()).toISOString() : null,
        origin: notif.origin || '',
        entity: notif.entity || '',
        sourceLabel: notif.sourceLabel || '',
        deepLink: notif.deepLink || null,
        subtitle: notif.subtitle ? String(notif.subtitle) : '',
        metaLine: notif.metaLine ? String(notif.metaLine) : '',
        meta: notif.meta && typeof notif.meta === 'object' ? notif.meta : null
    };
}

function getNotificationIndexById(list, id) {
    const notifId = normalizeNotificationId(id);
    if (!notifId) return -1;
    return (Array.isArray(list) ? list : []).findIndex((n) => normalizeNotificationId(n?.id) === notifId);
}

function getNotificationById(id) {
    const notifId = normalizeNotificationId(id);
    if (!notifId) return null;
    const activeIndex = getNotificationIndexById(notifications, notifId);
    if (activeIndex >= 0) return notifications[activeIndex];
    const readIndex = getNotificationIndexById(readNotifications, notifId);
    if (readIndex >= 0) return readNotifications[readIndex];
    return null;
}

function migrateNotifStorage() {
    const keys = [STORAGE_KEY, READ_STORAGE_KEY];
    const parseArrayOrNull = (raw) => {
        if (raw === null) return { arr: null, valid: true };
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return { arr: parsed, valid: true };
            return { arr: [], valid: false };
        } catch (err) {
            return { arr: [], valid: false };
        }
    };

    let mutated = false;
    keys.forEach((key) => {
        const raw = localStorage.getItem(key);
        const { arr, valid } = parseArrayOrNull(raw);
        if (arr === null) return;
        const forceRead = key === READ_STORAGE_KEY;
        const normalized = normalizeNotificationList(arr, { forceRead: forceRead });
        const serialized = normalized.map(serializeNotification).filter(Boolean);
        const changed = !valid
            || serialized.length !== arr.length
            || JSON.stringify(serialized) !== JSON.stringify(arr);

        if (changed) {
            localStorage.setItem(key, JSON.stringify(serialized));
            mutated = true;
        }
    });
    if (mutated) {
        logAgroNotifDebug('migrate storage', { cleaned: true });
    }
}

function shouldShowSystemLayer() {
    return sessionState === 'yes';
}

function buildSystemNotifications(snapshot = null) {
    if (!shouldShowSystemLayer()) return [];

    const snap = snapshot || cropsSnapshot || getCropsSnapshot();
    if (!snap) return [];

    const status = snap.status || cropsStatus;
    const count = Number.isFinite(snap.count) ? snap.count : null;
    const system = [];

    if (status === 'loading') {
        system.push({
            id: SYSTEM_LOADING_ID,
            type: 'info',
            title: SYSTEM_LOADING_TITLE,
            message: 'Espera un momento.',
            icon: 'fa-spinner',
            timestamp: new Date()
        });
        return system;
    }

    if (status === 'ready' && count === 0) {
        system.push({
            id: SYSTEM_NO_CROPS_ID,
            type: 'info',
            title: SYSTEM_NO_CROPS_TITLE,
            message: SYSTEM_NO_CROPS_MESSAGE,
            icon: 'fa-seedling',
            timestamp: new Date()
        });
    }

    return system;
}

async function refreshSessionState(reason = 'manual') {
    const sb = getSupabaseClient();
    if (!sb?.auth?.getSession) return sessionState;
    try {
        const { data, error } = await sb.auth.getSession();
        if (error) throw error;
        const nextState = data?.session?.user ? 'yes' : 'no';
        if (nextState !== sessionState) {
            sessionState = nextState;
            logAgroNotifDebug('session state', { reason, state: sessionState });
            renderNotifications();
        }
    } catch (err) {
        sessionState = 'unknown';
        logAgroNotifDebug('session state error', { reason });
    }
    return sessionState;
}

function getCropsSnapshot() {
    if (typeof window === 'undefined') return null;
    return window.__AGRO_CROPS_STATE || null;
}

function syncCropsSnapshot() {
    const snapshot = getCropsSnapshot();
    if (!snapshot) return null;

    cropsSnapshot = snapshot;
    if (snapshot.status) cropsStatus = snapshot.status;
    if (Number.isFinite(snapshot.count)) cropsReadyCount = snapshot.count;
    if (Number.isFinite(snapshot.ts)) {
        cropsReadyAt = new Date(snapshot.ts);
        lastSeenAt = Math.max(lastSeenAt, snapshot.ts);
    }
    if (Number.isFinite(snapshot.seq)) {
        lastSeenSeq = Math.max(lastSeenSeq, snapshot.seq);
    }

    return snapshot;
}

function getCropsReadyCount(snapshot = null) {
    const snap = snapshot || cropsSnapshot || getCropsSnapshot();
    if (Number.isFinite(snap?.count)) return snap.count;
    return Number.isFinite(cropsReadyCount) ? cropsReadyCount : null;
}

function isCropsReady(snapshot = null) {
    const snap = snapshot || cropsSnapshot || getCropsSnapshot();
    const status = snap?.status || cropsStatus;
    return status === 'ready';
}

function isSnapshotNewer(snapshot) {
    if (!snapshot) return false;
    const seq = Number(snapshot.seq);
    if (Number.isFinite(seq)) return seq > lastSeenSeq;
    const ts = Number(snapshot.ts);
    if (Number.isFinite(ts)) return ts > lastSeenAt;
    return true;
}

function shouldEvaluateSnapshot(snapshot) {
    if (!snapshot || snapshot.status !== 'ready') return false;
    const seq = Number(snapshot.seq);
    if (Number.isFinite(seq) && seq <= lastEvaluatedSeq) return false;
    const ts = Number(snapshot.ts);
    if (Number.isFinite(ts) && ts <= lastEvaluatedAt) return false;
    return true;
}

function markSnapshotEvaluated(snapshot) {
    if (!snapshot) return;
    const seq = Number(snapshot.seq);
    if (Number.isFinite(seq)) lastEvaluatedSeq = Math.max(lastEvaluatedSeq, seq);
    const ts = Number(snapshot.ts);
    if (Number.isFinite(ts)) {
        lastEvaluatedAt = Math.max(lastEvaluatedAt, ts);
    } else {
        lastEvaluatedAt = Date.now();
    }
}

function purgeTransientNotifications() {
    const beforeCounts = { active: notifications.length, read: readNotifications.length };
    notifications = sanitizeNotifications(notifications);
    readNotifications = sanitizeNotifications(readNotifications);
    const removed = (beforeCounts.active !== notifications.length)
        || (beforeCounts.read !== readNotifications.length);
    if (removed) saveNotificationsToStorage();
}

function setupCropsReadyListener() {
    if (cropsReadyListenerAttached || typeof window === 'undefined') return;
    cropsReadyListenerAttached = true;

    window.addEventListener(AGRO_CROPS_READY_EVENT, (event) => {
        const snapshot = event?.detail && typeof event.detail === 'object' ? event.detail : null;
        if (!snapshot) return;

        if (!isSnapshotNewer(snapshot)) {
            logAgroNotifDebug('event ignored (stale)', {
                seq: snapshot.seq,
                ts: snapshot.ts
            });
            return;
        }

        cropsSnapshot = snapshot;
        cropsStatus = snapshot.status || 'ready';
        if (Number.isFinite(snapshot.count)) cropsReadyCount = snapshot.count;
        if (Number.isFinite(snapshot.ts)) {
            cropsReadyAt = new Date(snapshot.ts);
            lastSeenAt = Math.max(lastSeenAt, snapshot.ts);
        }
        if (Number.isFinite(snapshot.seq)) {
            lastSeenSeq = Math.max(lastSeenSeq, snapshot.seq);
        }

        purgeTransientNotifications();

        logAgroNotifDebug('event received', {
            ts: snapshot.ts,
            seq: snapshot.seq,
            count: Number.isFinite(snapshot.count) ? snapshot.count : null
        });

        const reason = pendingRefreshReason || 'crops-ready';
        pendingRefreshReason = null;
        refreshSystemNotifications(reason);
    });
}

// ============================================
// INITIALIZATION
// ============================================

export async function initNotifications() {
    if (AGRO_DEBUG) {
        console.log('[AGRO] V9.6.4: 🔔 Inicializando Centro de Alertas...');
    }

    // Load from localStorage
    migrateNotifStorage();
    loadNotificationsFromStorage();
    notificationsReady = true;
    const initialSnapshot = FACTURERO_ONLY ? null : syncCropsSnapshot();
    purgeTransientNotifications();
    if (!FACTURERO_ONLY) {
        setupCropsReadyListener();
        logAgroNotifDebug('init', {
            status: initialSnapshot?.status || cropsStatus,
            seq: initialSnapshot?.seq,
            ts: initialSnapshot?.ts,
            count: Number.isFinite(initialSnapshot?.count) ? initialSnapshot.count : null
        });
    }

    // Setup event listeners
    setupEventListeners();

    // Render existing immediately for fast UI
    renderNotifications();
    updateBadge();

    if (!FACTURERO_ONLY) {
        // Setup auth listener for late sessions
        setupAuthRefresh();
        void refreshSessionState('init');

        // Refresh system notifications in background
        refreshSystemNotifications('init');

        // Start observing AI Advisor changes (MutationObserver)
        setupAdviceObserver();
    }

    if (AGRO_DEBUG) {
        console.log('[AGRO] V9.6.4: ✅ Sistema de notificaciones activo con historial');
    }
}

function loadNotificationsFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const storedRead = localStorage.getItem(READ_STORAGE_KEY);
        let shouldPersist = false;

        if (stored) {
            const parsed = JSON.parse(stored);
            notifications = normalizeNotificationList(parsed);
            const serialized = notifications.map(serializeNotification).filter(Boolean);
            if (JSON.stringify(serialized) !== JSON.stringify(parsed)) {
                shouldPersist = true;
            }
        }

        if (storedRead) {
            const parsedRead = JSON.parse(storedRead);
            readNotifications = normalizeNotificationList(parsedRead, { forceRead: true });
            const serializedRead = readNotifications.map(serializeNotification).filter(Boolean);
            if (JSON.stringify(serializedRead) !== JSON.stringify(parsedRead)) {
                shouldPersist = true;
            }
        }

        if (readNotifications.length && notifications.length) {
            const readIds = new Set(readNotifications.map(n => normalizeNotificationId(n?.id)));
            const filteredActive = notifications.filter(n => !readIds.has(normalizeNotificationId(n?.id)));
            if (filteredActive.length !== notifications.length) {
                notifications = filteredActive;
                shouldPersist = true;
            }
        }

        if (shouldPersist) saveNotificationsToStorage();

        if (AGRO_DEBUG) {
            console.log(`[AgroNotif] 📂 Cargadas ${notifications.length} activas, ${readNotifications.length} leídas`);
        }
    } catch (e) {
        console.warn('[AgroNotif] Error cargando historial:', e);
        notifications = [];
        readNotifications = [];
    }
}

function saveNotificationsToStorage() {
    try {
        const persistActive = sanitizeNotifications(notifications).map(serializeNotification).filter(Boolean);
        readNotifications = sanitizeNotifications(readNotifications).slice(0, MAX_READ_HISTORY);
        const persistRead = readNotifications.map(serializeNotification).filter(Boolean);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistActive));
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(persistRead));
    } catch (e) {
        console.warn('[AgroNotif] Error guardando:', e);
    }
}

function ensureNotificationsReady() {
    if (notificationsReady) return;
    migrateNotifStorage();
    loadNotificationsFromStorage();
    purgeTransientNotifications();
    notificationsReady = true;
}

function setupEventListeners() {
    const btn = document.getElementById('notif-btn');
    const dropdown = document.getElementById('notif-dropdown');
    const markReadBtn = document.getElementById('mark-read-btn');

    if (!btn || !dropdown) {
        console.warn('[AgroNotif] Elementos de notificación no encontrados');
        return;
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    if (markReadBtn) {
        markReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllAsRead();
        });
    }

    document.addEventListener('click', (e) => {
        if (isDropdownOpen && !dropdown.contains(e.target) && e.target !== btn) {
            closeDropdown();
        }
    });
}

// ============================================
// MUTATION OBSERVER - Sincronización con IA
// ============================================

function setupAdviceObserver() {
    const adviceTitle = document.getElementById('advice-title');
    const adviceText = document.getElementById('advice-text');

    if (!adviceTitle) {
        setTimeout(setupAdviceObserver, 1000);
        return;
    }

    if (AGRO_DEBUG) {
        console.log('[AgroNotif] 👁️ Observer conectado a advice-title');
    }
    lastAdviceText = adviceTitle.textContent || '';

    adviceObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                handleAdviceChange(adviceTitle, adviceText);
            }
        });
    });

    const observerConfig = { childList: true, characterData: true, subtree: true };
    adviceObserver.observe(adviceTitle, observerConfig);
    if (adviceText) adviceObserver.observe(adviceText, observerConfig);
}

function handleAdviceChange(titleEl, textEl) {
    const newTitle = titleEl?.textContent?.trim() || '';
    const newText = textEl?.textContent?.trim() || '';

    if (!newTitle || newTitle === lastAdviceText) return;
    if (newTitle.toLowerCase().includes('analizando') || newTitle.toLowerCase().includes('cargando')) return;

    if (AGRO_DEBUG) {
        console.log('[AgroNotif] 🧠 IA actualizó consejo:', newTitle);
    }
    lastAdviceText = newTitle;

    const type = detectAdviceType(titleEl, newTitle, newText);
    const icon = getAdviceIcon(type, newText);

    addNotificationToTop(type, `🤖 ${newTitle}`, newText || 'Consejo del Oráculo Agrícola.', icon);
}

function detectAdviceType(titleEl, title, text) {
    const classList = titleEl?.className || '';

    if (classList.includes('text-red') || classList.includes('danger')) return 'danger';
    if (classList.includes('text-orange') || classList.includes('warning')) return 'warning';
    if (classList.includes('text-green') || classList.includes('success')) return 'success';

    const combined = (title + ' ' + text).toLowerCase();
    if (combined.includes('alerta') || combined.includes('peligro') || combined.includes('riesgo')) return 'danger';
    if (combined.includes('precaución') || combined.includes('viento') || combined.includes('calor')) return 'warning';
    if (combined.includes('favorable') || combined.includes('ideal') || combined.includes('operativo')) return 'success';

    return 'info';
}

function getAdviceIcon(type, text) {
    const textLower = text.toLowerCase();
    if (textLower.includes('lluvia')) return 'fa-cloud-rain';
    if (textLower.includes('viento')) return 'fa-wind';
    if (textLower.includes('calor') || textLower.includes('térmico')) return 'fa-temperature-high';
    if (textLower.includes('helada') || textLower.includes('frío')) return 'fa-snowflake';
    if (textLower.includes('hong') || textLower.includes('tizón')) return 'fa-disease';

    const iconMap = { danger: 'fa-triangle-exclamation', warning: 'fa-exclamation-circle', success: 'fa-check-circle', info: 'fa-robot' };
    return iconMap[type] || 'fa-robot';
}

// ============================================
// DROPDOWN CONTROL
// ============================================

function toggleDropdown() {
    const dropdown = document.getElementById('notif-dropdown');
    if (!dropdown) return;

    isDropdownOpen = !isDropdownOpen;
    dropdown.style.display = isDropdownOpen ? 'block' : 'none';
}

function closeDropdown() {
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
        isDropdownOpen = false;
    }
}

// ============================================
// NOTIFICATION GENERATION
// ============================================

async function generateSystemNotifications(reason = 'manual', snapshotOverride = null) {
    const snapshot = snapshotOverride || syncCropsSnapshot();
    const evalSeq = ++alertsEvalSeq;
    const startTs = new Date().toISOString();
    const readyCount = getCropsReadyCount(snapshot);
    const statusSnapshot = snapshot?.status || cropsStatus;

    logAgroNotifDebug('evaluate START', {
        ts: startTs,
        seq: evalSeq,
        reason,
        status: statusSnapshot,
        readyCount,
        snapSeq: snapshot?.seq
    });

    if (!isCropsReady(snapshot)) {
        logAgroNotifDebug('evaluate SKIP (not ready)', {
            ts: new Date().toISOString(),
            seq: evalSeq,
            reason,
            status: statusSnapshot
        });
        return;
    }

    if (!shouldEvaluateSnapshot(snapshot)) {
        logAgroNotifDebug('evaluate SKIP (stale)', {
            ts: new Date().toISOString(),
            seq: evalSeq,
            reason,
            snapSeq: snapshot?.seq,
            lastEvaluatedSeq
        });
        return;
    }

    const crops = await getCropsAsync();
    const effectiveCount = Number.isFinite(readyCount) ? readyCount : crops.length;
    const cropsForAlerts = crops.length > 0
        ? crops
        : (Array.isArray(snapshot?.crops) ? snapshot.crops : []);

    if (effectiveCount === 0) {
        purgeTransientNotifications();
    } else {
        if (cropsForAlerts.length > 0) {
            cropsForAlerts.forEach(checkCropAlerts);
        }
    }

    checkWeatherAlerts();

    renderNotifications();
    updateBadge();
    saveNotificationsToStorage();
    markSnapshotEvaluated(snapshot);

    logAgroNotifDebug('evaluate END', {
        ts: new Date().toISOString(),
        seq: evalSeq,
        cropsCount: crops.length,
        readyCount: effectiveCount,
        notifications: notifications.length,
        snapSeq: snapshot?.seq
    });
}

/**
 * V9.6.2: Get crops from Supabase if session available, else fallback to localStorage
 */
async function getCropsAsync() {
    try {
        const sb = getSupabaseClient();
        if (!sb?.auth) {
            const localCrops = getLocalCrops();
            logAlertsStatus(false, 'local', localCrops.length, 0);
            return localCrops;
        }

        const { session, attempts } = await waitForSession(sb);
        if (!session?.user) {
            const localCrops = getLocalCrops();
            logAlertsStatus(false, 'local', localCrops.length, attempts);
            return localCrops;
        }

        // Query Supabase for crops (V9.6.5: removed harvest_date, column doesn't exist)
        let query = sb.from('agro_crops')
            .select('id,name,start_date,expected_harvest_date,status')
            .eq('user_id', session.user.id);

        // Try with deleted_at filter first
        let { data, error } = await query.is('deleted_at', null);

        // If column doesn't exist, retry without it
        if (error?.message?.includes('deleted_at')) {
            console.warn('[AGRO] V9.6.2: deleted_at column not found, retrying without filter');
            const retry = await sb.from('agro_crops')
                .select('id,name,start_date,expected_harvest_date,status')
                .eq('user_id', session.user.id);
            data = retry.data;
            error = retry.error;
        }

        if (error) {
            console.warn('[AGRO] V9.6.2: Supabase query error, fallback to local:', error.message);
            const localCrops = getLocalCrops();
            logAlertsStatus(true, 'local', localCrops.length, attempts);
            return localCrops;
        }

        logAlertsStatus(true, 'supabase', data?.length || 0, attempts);
        return data || [];
    } catch (e) {
        console.warn('[AGRO] V9.6.2: getCropsAsync exception, fallback to local:', e);
        const localCrops = getLocalCrops();
        logAlertsStatus(false, 'local', localCrops.length, ALERTS_SESSION_MAX_ATTEMPTS);
        return localCrops;
    }
}

function getLocalCrops() {
    try {
        return JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
    } catch (e) { return []; }
}

function checkCropAlerts(crop) {
    const now = new Date();
    // V9.6.5: Use expected_harvest_date (harvest_date column doesn't exist)
    const harvestDate = crop.expected_harvest_date ? new Date(crop.expected_harvest_date) : null;
    const status = (crop.status || '').toLowerCase();

    // Map legacy English status to Spanish if needed (though DB migration fixed this)
    const isActive = ['sembrado', 'creciendo', 'produccion', 'growing', 'ready'].includes(status);

    // console.log(`[AgroNotif] Checking crop: ${crop.name}, status=${status}, harvest=${crop.expected_harvest_date}`);

    if (harvestDate) {
        const days = Math.ceil((harvestDate - now) / (1000 * 60 * 60 * 24));
        // console.log(`[AgroNotif] Days to harvest: ${days}`);

        if (days > 0 && days <= 15) { // V9.6.5: Increased warning window to 15 days
            addNotification('warning', `📅 Cosecha: ${crop.name}`, `Faltan ${days} días.`, 'fa-calendar-check');
        }
        if (days < 0 && status !== 'finalizado' && status !== 'harvested') {
            addNotification('danger', `⚠️ Atrasada: ${crop.name}`, `Pasaron ${Math.abs(days)} días.`, 'fa-exclamation-triangle');
        }
    }
}

function checkWeatherAlerts() {
    const w = window.currentForecastData;
    if (w?.precipitation_sum?.[0] > 10) {
        addNotification('warning', '🌧️ Lluvia Intensa', `${w.precipitation_sum[0].toFixed(1)}mm hoy.`, 'fa-cloud-rain');
    }
    if (w?.temperature_2m_max?.[0] > 32) {
        addNotification('danger', '🌡️ Calor Extremo', `Máx ${Math.round(w.temperature_2m_max[0])}°C.`, 'fa-temperature-high');
    }
}

// ============================================
// NOTIFICATION MANAGEMENT
// ============================================

export function upsertAgroNotification(input, options = {}) {
    const notif = normalizeNotification(input);
    if (!notif) return false;

    const silent = !!options.silent;
    const reopenIfRead = !!options.reopenIfRead;
    const activeIndex = getNotificationIndexById(notifications, notif.id);
    const readIndex = getNotificationIndexById(readNotifications, notif.id);
    let changed = false;

    if (activeIndex >= 0) {
        const existing = notifications[activeIndex];
        notifications[activeIndex] = {
            ...existing,
            ...notif,
            read: false,
            readAt: null
        };
        changed = true;
    } else if (readIndex >= 0) {
        if (reopenIfRead) {
            const existing = readNotifications.splice(readIndex, 1)[0];
            notifications.unshift({
                ...existing,
                ...notif,
                read: false,
                readAt: null
            });
            changed = true;
        } else {
            const existing = readNotifications[readIndex];
            readNotifications[readIndex] = {
                ...existing,
                ...notif,
                read: true,
                readAt: existing.readAt || new Date()
            };
            changed = true;
        }
    } else {
        notifications.unshift({
            ...notif,
            read: false,
            readAt: null
        });
        changed = true;
    }

    if (changed && !silent) {
        saveNotificationsToStorage();
        renderNotifications();
        updateBadge();
    }
    return changed;
}

export function markAsRead(id, options = {}) {
    const silent = !!options.silent;
    const index = getNotificationIndexById(notifications, id);
    if (index < 0) return false;

    const notif = notifications.splice(index, 1)[0];
    notif.read = true;
    notif.readAt = new Date();
    readNotifications.unshift(notif);
    readNotifications = sanitizeNotifications(readNotifications).slice(0, MAX_READ_HISTORY);

    if (!silent) {
        saveNotificationsToStorage();
        renderNotifications();
        updateBadge();
    }
    return true;
}

export function computeUnreadCount() {
    return sanitizeNotifications(notifications).filter(n => !n.read).length;
}

function flushNotifications() {
    saveNotificationsToStorage();
    renderNotifications();
    updateBadge();
}

function removeNotificationById(id, options = {}) {
    const includeRead = !!options.includeRead;
    let changed = false;
    const notifId = normalizeNotificationId(id);
    if (!notifId) return false;

    const beforeActive = notifications.length;
    notifications = notifications.filter(n => normalizeNotificationId(n?.id) !== notifId);
    if (notifications.length !== beforeActive) changed = true;

    if (includeRead) {
        const beforeRead = readNotifications.length;
        readNotifications = readNotifications.filter(n => normalizeNotificationId(n?.id) !== notifId);
        if (readNotifications.length !== beforeRead) changed = true;
    }

    if (changed && !options.silent) flushNotifications();
    return changed;
}

function removeNotificationsByPrefix(prefix, keepIds = new Set(), options = {}) {
    const includeRead = !!options.includeRead;
    let changed = false;
    const before = notifications.length;
    notifications = notifications.filter(n => {
        const id = normalizeNotificationId(n?.id);
        if (!id.startsWith(prefix)) return true;
        if (keepIds && keepIds.has(id)) return true;
        return false;
    });
    if (notifications.length !== before) changed = true;

    if (includeRead) {
        const beforeRead = readNotifications.length;
        readNotifications = readNotifications.filter(n => {
            const id = normalizeNotificationId(n?.id);
            if (!id.startsWith(prefix)) return true;
            if (keepIds && keepIds.has(id)) return true;
            return false;
        });
        if (readNotifications.length !== beforeRead) changed = true;
    }

    return changed;
}

function isKnownNotificationId(id) {
    return getNotificationIndexById(notifications, id) >= 0
        || getNotificationIndexById(readNotifications, id) >= 0;
}

function addNotification(type, title, message, icon) {
    if (isLegacySystemReady({ title, message })) return;
    const id = `legacy:${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    upsertAgroNotification({
        id,
        type,
        title,
        message,
        icon: icon || 'fa-info-circle',
        timestamp: new Date()
    });
}

function addNotificationToTop(type, title, message, icon) {
    addNotification(type, title, message, icon || 'fa-robot');
    flashBadge();
}

function removeNotificationByTitle(title) {
    if (!title) return;
    notifications = notifications.filter(n => n?.title !== title);
    readNotifications = readNotifications.filter(n => n?.title !== title);
}

function flashBadge() {
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.style.transform = 'scale(1.5)';
        setTimeout(() => badge.style.transform = 'scale(1)', 200);
    }
}

function markAllAsRead() {
    const ids = notifications.map(n => n?.id).filter(Boolean);
    ids.forEach(id => {
        markAsRead(id, { silent: true });
    });
    notifications = [];
    flushNotifications();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function logAlertsStatus(hasSession, source, crops, attempts) {
    if (!AGRO_DEBUG) return;
    const sessionLabel = hasSession ? 'yes' : 'no';
    const cropCount = Number.isFinite(crops) ? crops : 0;
    const attemptCount = Number.isFinite(attempts) ? attempts : 0;
    console.info(`[AGRO] Alerts: session=${sessionLabel} source=${source} crops=${cropCount} attempts=${attemptCount}`);
}

function getSupabaseClient() {
    if (supabase?.auth) return supabase;
    if (typeof window !== 'undefined' && window.supabase?.auth) return window.supabase;
    if (typeof window !== 'undefined' && window.AuthClient?.supabase?.auth) return window.AuthClient.supabase;
    return null;
}

async function waitForSession(sb) {
    let attempt = 0;
    while (attempt < ALERTS_SESSION_MAX_ATTEMPTS) {
        attempt += 1;
        try {
            const { data, error } = await sb.auth.getSession();
            if (!error && data?.session?.user) {
                return { session: data.session, attempts: attempt };
            }
        } catch (e) {
            // Ignore and retry
        }
        const delay = Math.min(ALERTS_SESSION_MAX_DELAY, ALERTS_SESSION_BASE_DELAY * Math.pow(2, attempt - 1));
        await sleep(delay);
    }
    return { session: null, attempts: ALERTS_SESSION_MAX_ATTEMPTS };
}

function setupAuthRefresh() {
    const sb = getSupabaseClient();
    if (!sb?.auth?.onAuthStateChange || authListenerAttached) return;
    authListenerAttached = true;

    sb.auth.onAuthStateChange((event, session) => {
        const nextState = session?.user ? 'yes' : 'no';
        if (nextState !== sessionState) {
            sessionState = nextState;
            logAgroNotifDebug('session event', { event, state: sessionState });
            renderNotifications();
        }
        if (!session?.user) return;
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
            refreshSystemNotifications(`auth:${event.toLowerCase()}`);
        }
    });
}

function refreshSystemNotifications(reason = 'manual') {
    const snapshot = syncCropsSnapshot();
    if (!snapshot || !isCropsReady(snapshot)) {
        pendingRefreshReason = reason;
        logAgroNotifDebug('refresh deferred', {
            ts: new Date().toISOString(),
            reason,
            status: snapshot?.status || cropsStatus
        });
        renderNotifications();
        return;
    }
    if (!shouldEvaluateSnapshot(snapshot)) {
        logAgroNotifDebug('refresh skipped (stale)', {
            ts: new Date().toISOString(),
            reason,
            snapSeq: snapshot?.seq,
            lastEvaluatedSeq
        });
        return;
    }
    if (refreshInFlight) {
        refreshQueued = true;
        return;
    }
    refreshInFlight = true;
    Promise.resolve()
        .then(() => generateSystemNotifications(reason, snapshot))
        .finally(() => {
            refreshInFlight = false;
            if (refreshQueued) {
                refreshQueued = false;
                refreshSystemNotifications('queued');
            }
        });
}

// ============================================
// FACTURERO ALERTS (Campana Agro)
// ============================================

function getFactureroLabel(entity, plural = false) {
    const key = entity || '';
    const entry = FACTURERO_LABELS[key];
    if (!entry) return '';
    return plural ? entry.plural : entry.singular;
}

function buildFactureroChip(entity, plural = false) {
    const label = getFactureroLabel(entity, plural);
    if (!label) return FACTURERO_SOURCE_LABEL;
    return `${FACTURERO_SOURCE_LABEL} • ${label}`;
}

function formatCurrency(amount) {
    const value = Number(amount || 0);
    return `$${value.toFixed(2)}`;
}

function formatShortDate(date) {
    const dateObj = coerceDate(date, null);
    if (!dateObj) return '';
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
}

function isPastDue(date) {
    const dateObj = coerceDate(date, null);
    if (!dateObj) return false;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dateObj < startOfToday;
}

function isWithinDays(date, days) {
    const dateObj = coerceDate(date, null);
    if (!dateObj) return false;
    const diffMs = Date.now() - dateObj.getTime();
    if (diffMs < 0) return false;
    return diffMs <= days * 24 * 60 * 60 * 1000;
}

function formatDayCount(days) {
    const abs = Math.abs(days);
    return `${abs} ${abs === 1 ? 'día' : 'días'}`;
}

function computeDueStatus(date) {
    const dateObj = coerceDate(date, null);
    if (!dateObj) return '';
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfDue = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const diffDays = Math.round((startOfDue - startOfToday) / 86400000);

    if (diffDays === 0) return 'Vence hoy';
    if (diffDays < 0) return `Vencido hace ${formatDayCount(diffDays)}`;
    return `Vence en ${formatDayCount(diffDays)}`;
}

function getPendingClient(item) {
    return String(item?.cliente || '').trim() || 'Cliente';
}

function getUnitSummary(item) {
    const unitQty = Number(item?.unit_qty || item?.unitQty || 0);
    const unitType = String(item?.unit_type || item?.unitType || '').trim();
    const kgValue = Number(item?.quantity_kg || item?.quantityKg || 0);
    const parts = [];
    if (Number.isFinite(unitQty) && unitQty > 0 && unitType) {
        parts.push(`${unitQty} ${unitType}`);
    }
    if (Number.isFinite(kgValue) && kgValue > 0) {
        parts.push(`${kgValue} kg`);
    }
    return parts.join(' • ');
}

function getLossConcept(item) {
    return String(item?.concepto || item?.concept || 'Pérdida registrada').trim();
}

function getLossCause(item) {
    return String(item?.causa || '').trim();
}

function getTransferDest(item) {
    return String(item?.destino || '').trim() || 'Destino';
}

function getExpenseConcept(item) {
    return String(item?.concept || item?.concepto || 'Gasto registrado').trim();
}

function getIncomeConcept(item) {
    return String(item?.concepto || item?.concept || 'Ingreso registrado').trim();
}

function getAmountField(item) {
    if (item?.monto !== undefined && item?.monto !== null) return Number(item.monto);
    if (item?.amount !== undefined && item?.amount !== null) return Number(item.amount);
    return 0;
}

function buildDeepLink(tab, itemId) {
    return {
        tab,
        accordionKey: 'history',
        itemId: itemId || null
    };
}

export function syncFactureroNotifications(tabName, items) {
    if (!FACTURERO_TABS.has(tabName)) return;

    ensureNotificationsReady();

    const rows = Array.isArray(items) ? items : [];
    let changed = false;

    const legacyPrefixes = {
        pendientes: ['pending:'],
        perdidas: ['loss:'],
        transferencias: ['transfer:'],
        gastos: ['expense:'],
        ingresos: ['income:']
    };
    (legacyPrefixes[tabName] || []).forEach((prefix) => {
        if (removeNotificationsByPrefix(prefix, new Set(), { includeRead: true })) changed = true;
    });

    if (tabName === 'pendientes') {
        const keepIds = new Set();
        let overdueCount = 0;

        rows.forEach((item) => {
            const rowId = normalizeNotificationId(item?.id);
            if (!rowId) return;

            const notifId = `facturero:pendientes:${rowId}`;
            keepIds.add(notifId);

            const client = getPendingClient(item);
            const amountValue = getAmountField(item);
            const amount = formatCurrency(amountValue);
            const unit = getUnitSummary(item);
            const dueDate = coerceDate(item?.fecha, null);
            const overdue = isPastDue(dueDate);
            const statusLabel = computeDueStatus(dueDate) || (overdue ? 'Vencido' : '');
            if (overdue) overdueCount += 1;
            const rowTimestamp = coerceDate(item?.created_at || item?.fecha, new Date());

            const title = `${buildFactureroChip('pendientes', false)}`;
            const subtitle = `Cliente: ${client}`;
            const metaLine = `${amount}${unit ? ` • ${unit}` : ''}${statusLabel ? ` — ${statusLabel}` : ''}`;

            changed = upsertAgroNotification({
                id: notifId,
                type: overdue ? 'danger' : 'warning',
                title,
                subtitle,
                message: subtitle,
                metaLine,
                icon: 'fa-hourglass-half',
                timestamp: rowTimestamp,
                origin: 'facturero',
                entity: 'pendientes',
                sourceLabel: FACTURERO_SOURCE_LABEL,
                deepLink: buildDeepLink('pendientes', rowId),
                meta: { tab: 'pendientes', rowId }
            }, { silent: true }) || changed;
        });

        const summaryId = 'facturero:pendientes:summary';
        if (rows.length > 0) {
            keepIds.add(summaryId);
            const prev = getNotificationById(summaryId);
            const countChanged = prev?.meta?.count !== rows.length
                || prev?.meta?.overdue !== overdueCount;

            const title = `${buildFactureroChip('pendientes', true)} (${rows.length})`;
            const subtitle = overdueCount > 0 ? `${overdueCount} vencidos` : 'Sin vencidos';

            changed = upsertAgroNotification({
                id: summaryId,
                type: overdueCount > 0 ? 'danger' : 'warning',
                title,
                subtitle,
                message: subtitle,
                icon: 'fa-hourglass-half',
                timestamp: new Date(),
                origin: 'facturero',
                entity: 'pendientes',
                sourceLabel: FACTURERO_SOURCE_LABEL,
                deepLink: buildDeepLink('pendientes', null),
                meta: { count: rows.length, overdue: overdueCount }
            }, { silent: true, reopenIfRead: countChanged }) || changed;
        } else {
            changed = removeNotificationById(summaryId, { silent: true }) || changed;
        }

        if (removeNotificationsByPrefix('facturero:pendientes:', keepIds)) changed = true;
    }

    if (tabName === 'perdidas') {
        rows.forEach((item) => {
            const rowId = normalizeNotificationId(item?.id);
            if (!rowId) return;

            const notifId = `facturero:perdidas:${rowId}`;
            if (isKnownNotificationId(notifId)) return;

            const rowDate = coerceDate(item?.fecha || item?.created_at, null);
            if (rowDate && !isWithinDays(rowDate, 7)) return;

            const cause = getLossCause(item);
            const concept = getLossConcept(item);
            const amount = formatCurrency(getAmountField(item));
            const unit = getUnitSummary(item);

            const title = `${buildFactureroChip('perdidas', false)}`;
            const subtitle = cause ? `Causa: ${cause}` : `Concepto: ${concept}`;
            const metaLine = `${amount}${unit ? ` • ${unit}` : ''}`;

            changed = upsertAgroNotification({
                id: notifId,
                type: 'danger',
                title,
                subtitle,
                message: subtitle,
                metaLine,
                icon: 'fa-triangle-exclamation',
                timestamp: rowDate || new Date(),
                origin: 'facturero',
                entity: 'perdidas',
                sourceLabel: FACTURERO_SOURCE_LABEL,
                deepLink: buildDeepLink('perdidas', rowId),
                meta: { tab: 'perdidas', rowId }
            }, { silent: true }) || changed;
        });
    }

    if (tabName === 'transferencias') {
        rows.forEach((item) => {
            const rowId = normalizeNotificationId(item?.id);
            if (!rowId) return;

            const notifId = `facturero:transferencias:${rowId}`;
            if (isKnownNotificationId(notifId)) return;

            const rowDate = coerceDate(item?.fecha || item?.created_at, null);
            const dest = getTransferDest(item);
            const amount = formatCurrency(getAmountField(item));
            const unit = getUnitSummary(item);

            const title = `${buildFactureroChip('transferencias', false)}`;
            const subtitle = `Destino: ${dest}`;
            const metaLine = `${amount}${unit ? ` • ${unit}` : ''}`;

            changed = upsertAgroNotification({
                id: notifId,
                type: 'success',
                title,
                subtitle,
                message: subtitle,
                metaLine,
                icon: 'fa-right-left',
                timestamp: rowDate || new Date(),
                origin: 'facturero',
                entity: 'transferencias',
                sourceLabel: FACTURERO_SOURCE_LABEL,
                deepLink: buildDeepLink('transferencias', rowId),
                meta: { tab: 'transferencias', rowId }
            }, { silent: true }) || changed;
        });
    }

    if (tabName === 'gastos') {
        rows.forEach((item) => {
            const rowId = normalizeNotificationId(item?.id);
            if (!rowId) return;

            const notifId = `facturero:gastos:${rowId}`;
            if (isKnownNotificationId(notifId)) return;

            const rowDate = coerceDate(item?.date || item?.fecha || item?.created_at, null);
            const amountValue = getAmountField(item);
            const isRecent = rowDate ? isWithinDays(rowDate, FACTURERO_RECENT_DAYS) : false;
            const isLarge = amountValue >= FACTURERO_LARGE_AMOUNT;
            if (!isRecent && !isLarge) return;

            const concept = getExpenseConcept(item);
            const amount = formatCurrency(amountValue);
            const unit = getUnitSummary(item);

            const title = `${buildFactureroChip('gastos', false)}`;
            const subtitle = `Concepto: ${concept}`;
            const metaLine = `${amount}${unit ? ` • ${unit}` : ''}`;

            changed = upsertAgroNotification({
                id: notifId,
                type: 'warning',
                title,
                subtitle,
                message: subtitle,
                metaLine,
                icon: 'fa-receipt',
                timestamp: rowDate || new Date(),
                origin: 'facturero',
                entity: 'gastos',
                sourceLabel: FACTURERO_SOURCE_LABEL,
                deepLink: buildDeepLink('gastos', rowId),
                meta: { tab: 'gastos', rowId }
            }, { silent: true }) || changed;
        });
    }

    if (tabName === 'ingresos') {
        rows.forEach((item) => {
            const rowId = normalizeNotificationId(item?.id);
            if (!rowId) return;

            const notifId = `facturero:ingresos:${rowId}`;
            if (isKnownNotificationId(notifId)) return;

            const rowDate = coerceDate(item?.fecha || item?.date || item?.created_at, null);
            const amountValue = getAmountField(item);
            const isRecent = rowDate ? isWithinDays(rowDate, FACTURERO_RECENT_DAYS) : false;
            const isLarge = amountValue >= FACTURERO_LARGE_AMOUNT;
            if (!isRecent && !isLarge) return;

            const concept = getIncomeConcept(item);
            const amount = formatCurrency(amountValue);
            const unit = getUnitSummary(item);

            const title = `${buildFactureroChip('ingresos', false)}`;
            const subtitle = `Concepto: ${concept}`;
            const metaLine = `${amount}${unit ? ` • ${unit}` : ''}`;

            changed = upsertAgroNotification({
                id: notifId,
                type: 'success',
                title,
                subtitle,
                message: subtitle,
                metaLine,
                icon: 'fa-circle-up',
                timestamp: rowDate || new Date(),
                origin: 'facturero',
                entity: 'ingresos',
                sourceLabel: FACTURERO_SOURCE_LABEL,
                deepLink: buildDeepLink('ingresos', rowId),
                meta: { tab: 'ingresos', rowId }
            }, { silent: true }) || changed;
        });
    }

    if (changed) {
        flushNotifications();
        flashBadge();
    }
}

// ============================================
// TIME FORMATTING
// ============================================

function formatRelativeTime(date) {
    const now = new Date();
    const dateObj = coerceDate(date, now);
    const diff = now - dateObj;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days}d`;

    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${day} ${months[month - 1]}`;
}

// ============================================
// UI RENDERING
// ============================================

function createSectionHeader(text, styleCss) {
    const item = document.createElement('li');
    item.style.cssText = styleCss;
    item.textContent = text;
    return item;
}

function createEmptyStateItem() {
    const item = document.createElement('li');
    item.style.cssText = 'padding: 2rem; text-align: center; color: #555;';

    const icon = document.createElement('i');
    icon.className = 'fa-regular fa-bell-slash';
    icon.style.cssText = 'font-size: 1.5rem; margin-bottom: 0.5rem; display: block; opacity: 0.3;';

    const text = document.createElement('span');
    text.style.cssText = 'font-size: 11px;';
    text.textContent = 'Sin notificaciones';

    item.append(icon, text);
    return item;
}

function renderNotifications() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    list.textContent = '';

    const snapshot = FACTURERO_ONLY ? null : syncCropsSnapshot();
    const systemNotifications = FACTURERO_ONLY ? [] : buildSystemNotifications(snapshot);
    const activeNotifications = sanitizeNotifications(notifications).filter(n => !n.read);
    const historyNotifications = sanitizeNotifications(readNotifications);

    if (systemNotifications.length > 0) {
        list.appendChild(createSectionHeader(
            'Sistema',
            'padding: 6px 12px; font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.08);'
        ));
        systemNotifications.forEach((n) => list.appendChild(renderNotificationItem(n)));
    }

    if (activeNotifications.length > 0) {
        list.appendChild(createSectionHeader(
            `Nuevas (${activeNotifications.length})`,
            'padding: 6px 12px; font-size: 9px; color: #C8A752; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; border-bottom: 1px solid rgba(200,167,82,0.2);'
        ));
        activeNotifications.forEach((n) => list.appendChild(renderNotificationItem(n)));
    }

    if (historyNotifications.length > 0) {
        list.appendChild(createSectionHeader(
            'Historial',
            'padding: 6px 12px; margin-top: 8px; font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.05);'
        ));
        historyNotifications.slice(0, 10).forEach((n) => list.appendChild(renderNotificationItem(n, true)));
    }

    if (systemNotifications.length === 0 && activeNotifications.length === 0 && historyNotifications.length === 0) {
        list.appendChild(createEmptyStateItem());
    }
}

function renderNotificationItem(n, isRead = false) {
    const typeColors = {
        info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', icon: '#3b82f6' },
        success: { bg: 'rgba(74, 222, 128, 0.1)', border: 'rgba(74, 222, 128, 0.3)', icon: '#4ade80' },
        warning: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', icon: '#fbbf24' },
        danger: { bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.3)', icon: '#f87171' }
    };

    const colors = typeColors[n.type] || typeColors.info;
    const opacity = isRead ? '0.6' : '1';
    const timeStr = formatRelativeTime(n.timestamp);
    const iconClass = n.icon ? String(n.icon) : 'fa-info-circle';
    const titleText = n.title ? String(n.title) : '';
    const messageText = n.message ? String(n.message) : '';
    const subtitleText = n.subtitle ? String(n.subtitle) : '';
    const metaLineText = n.metaLine ? String(n.metaLine) : '';
    const entityLabel = n.entity ? getFactureroLabel(n.entity, false) : '';
    const chipLabel = n.sourceLabel && entityLabel ? `${n.sourceLabel} • ${entityLabel}` : (n.sourceLabel || '');
    const showChip = chipLabel && (!titleText || !titleText.toLowerCase().includes(chipLabel.toLowerCase()));

    const item = document.createElement('li');
    item.style.cssText = `margin: 4px; padding: 10px; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; opacity: ${opacity}; transition: all 0.2s;`;
    item.addEventListener('mouseenter', () => { item.style.transform = 'translateX(4px)'; });
    item.addEventListener('mouseleave', () => { item.style.transform = 'translateX(0)'; });

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; gap: 10px; align-items: flex-start;';

    const iconBox = document.createElement('div');
    iconBox.style.cssText = `width: 26px; height: 26px; border-radius: 6px; background: ${colors.bg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;`;

    const icon = document.createElement('i');
    icon.className = `fa-solid ${iconClass}`;
    icon.style.cssText = `color: ${colors.icon}; font-size: 11px;`;

    iconBox.appendChild(icon);

    const content = document.createElement('div');
    content.style.cssText = 'flex: 1; min-width: 0;';

    if (showChip) {
        const chip = document.createElement('div');
        chip.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; font-size: 8px; font-weight: 700; color: #C8A752; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(200,167,82,0.12); border: 1px solid rgba(200,167,82,0.35); border-radius: 999px; padding: 2px 6px; margin-bottom: 6px;';
        chip.textContent = chipLabel;
        content.appendChild(chip);
    }

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 8px;';

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 10px; font-weight: 700; color: #fff; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;';
    title.textContent = titleText || chipLabel;

    const time = document.createElement('span');
    time.style.cssText = 'font-size: 8px; color: #666; white-space: nowrap;';
    time.textContent = timeStr;

    const meta = document.createElement('div');
    meta.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    meta.appendChild(time);

    if (!isRead) {
        const markBtn = document.createElement('button');
        markBtn.type = 'button';
        markBtn.title = 'Marcar como leída';
        markBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        markBtn.style.cssText = [
            'background: rgba(200,167,82,0.12)',
            'border: 1px solid rgba(200,167,82,0.35)',
            'color: #C8A752',
            'width: 20px',
            'height: 20px',
            'border-radius: 6px',
            'display: inline-flex',
            'align-items: center',
            'justify-content: center',
            'cursor: pointer',
            'font-size: 9px',
            'padding: 0'
        ].join('; ');
        markBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAsRead(n.id);
        });
        meta.appendChild(markBtn);
    }

    header.append(title, meta);

    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size: 9px; color: #b7b7b7; line-height: 1.3; margin-top: 2px;';
    subtitle.textContent = subtitleText || messageText;

    const metaLine = document.createElement('div');
    metaLine.style.cssText = 'font-size: 9px; color: #888; line-height: 1.3; margin-top: 2px;';
    metaLine.textContent = metaLineText;

    const actionsRow = document.createElement('div');
    actionsRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 6px;';

    if (n.deepLink && n.deepLink.tab) {
        const cta = document.createElement('button');
        cta.type = 'button';
        cta.textContent = 'Ver en Facturero';
        cta.style.cssText = [
            'font-size: 9px',
            'font-weight: 600',
            'padding: 4px 8px',
            'border-radius: 8px',
            'border: 1px solid rgba(200,167,82,0.35)',
            'background: rgba(200,167,82,0.12)',
            'color: #C8A752',
            'cursor: pointer'
        ].join('; ');
        cta.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.YG_AGRO_NAV?.openFacturero) {
                window.YG_AGRO_NAV.openFacturero(n.deepLink);
            }
            closeDropdown();
        });
        actionsRow.appendChild(cta);
    }

    content.append(header, subtitle);
    if (metaLineText) content.appendChild(metaLine);
    if (actionsRow.childNodes.length > 0) content.appendChild(actionsRow);
    wrapper.append(iconBox, content);
    item.appendChild(wrapper);
    return item;
}

function updateBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    const unreadCount = computeUnreadCount();
    if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
        badge.style.width = unreadCount > 9 ? '22px' : '16px';
        badge.style.height = '16px';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.fontSize = '8px';
        badge.style.fontWeight = '700';
        badge.style.color = '#fff';
        badge.style.lineHeight = '1';
    } else {
        badge.style.display = 'none';
        badge.textContent = '';
    }
}

// ============================================
// PUBLIC API
// ============================================

window.triggerAgroNotification = (type, title, message, icon) => {
    addNotificationToTop(type, title, message, icon);
};

window.refreshAgroNotifications = async () => {
    if (FACTURERO_ONLY) {
        renderNotifications();
        updateBadge();
        return;
    }
    refreshSystemNotifications('manual');
};

window.clearAgroNotificationHistory = () => {
    readNotifications = [];
    saveNotificationsToStorage();
    renderNotifications();
    updateBadge();
};

window.upsertAgroNotification = upsertAgroNotification;
window.markAgroNotificationRead = (id) => markAsRead(id);
window.computeAgroUnreadCount = () => computeUnreadCount();
