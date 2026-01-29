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

const STORAGE_KEY = 'yavlgold_agro_notifications';
const READ_STORAGE_KEY = 'yavlgold_agro_notifications_read';
const MAX_READ_HISTORY = 20; // Máximo de notificaciones leídas a conservar
const EMPTY_CROPS_TITLE = '🌱 Sin cultivos';
const AGRO_CROPS_READY_EVENT = 'AGRO_CROPS_READY';
const AGRO_DEBUG = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('debug') === '1';

const ALERTS_SESSION_MAX_ATTEMPTS = 8;
const ALERTS_SESSION_BASE_DELAY = 200;
const ALERTS_SESSION_MAX_DELAY = 800;

function logAgroNotifDebug(label, detail = {}) {
    if (!AGRO_DEBUG) return;
    console.log(`[AgroNotif] ${label}`, detail);
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

function pruneEmptyCropsDuringLoading() {
    const readyCount = getCropsReadyCount();
    if (!isCropsReady() || (Number.isFinite(readyCount) && readyCount > 0)) {
        removeNotificationByTitle(EMPTY_CROPS_TITLE);
    }
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

        if (Number.isFinite(snapshot.count) && snapshot.count > 0) {
            removeNotificationByTitle(EMPTY_CROPS_TITLE);
        }

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
    console.log('[AGRO] V9.6.4: 🔔 Inicializando Centro de Alertas...');

    // Load from localStorage
    loadNotificationsFromStorage();
    const initialSnapshot = syncCropsSnapshot();
    pruneEmptyCropsDuringLoading();
    setupCropsReadyListener();
    logAgroNotifDebug('init', {
        status: initialSnapshot?.status || cropsStatus,
        seq: initialSnapshot?.seq,
        ts: initialSnapshot?.ts,
        count: Number.isFinite(initialSnapshot?.count) ? initialSnapshot.count : null
    });

    // Setup event listeners
    setupEventListeners();

    // Render existing immediately for fast UI
    renderNotifications();
    updateBadge();

    // Setup auth listener for late sessions
    setupAuthRefresh();

    // Refresh system notifications in background
    refreshSystemNotifications('init');

    // Start observing AI Advisor changes (MutationObserver)
    setupAdviceObserver();

    console.log('[AGRO] V9.6.4: ✅ Sistema de notificaciones activo con historial');
}

function loadNotificationsFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const storedRead = localStorage.getItem(READ_STORAGE_KEY);

        if (stored) {
            notifications = JSON.parse(stored);
            // Convert date strings back to Date objects
            notifications.forEach(n => n.timestamp = new Date(n.timestamp));
        }

        if (storedRead) {
            readNotifications = JSON.parse(storedRead);
            readNotifications.forEach(n => n.timestamp = new Date(n.timestamp));
        }

        console.log(`[AgroNotif] 📂 Cargadas ${notifications.length} activas, ${readNotifications.length} leídas`);
    } catch (e) {
        console.warn('[AgroNotif] Error cargando historial:', e);
        notifications = [];
        readNotifications = [];
    }
}

function saveNotificationsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(readNotifications.slice(0, MAX_READ_HISTORY)));
    } catch (e) {
        console.warn('[AgroNotif] Error guardando:', e);
    }
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

    console.log('[AgroNotif] 👁️ Observer conectado a advice-title');
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

    console.log('[AgroNotif] 🧠 IA actualizó consejo:', newTitle);
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
        addNotification('info', EMPTY_CROPS_TITLE, 'Agrega tu primer cultivo para alertas personalizadas.', 'fa-seedling');
    } else {
        removeNotificationByTitle(EMPTY_CROPS_TITLE);
        if (cropsForAlerts.length > 0) {
            cropsForAlerts.forEach(checkCropAlerts);
        }
    }

    checkWeatherAlerts();
    addNotification('success', '✅ Sistema Listo', 'El Oráculo está monitoreando. Consejos IA aparecerán aquí.', 'fa-satellite-dish');

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

function addNotification(type, title, message, icon) {
    // Avoid duplicates (same title in last 5 min)
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const isDupe = notifications.some(n => n.title === title && new Date(n.timestamp).getTime() > fiveMinAgo);
    if (isDupe) return;

    notifications.push({
        id: Date.now() + Math.random(),
        type, title, message,
        icon: icon || 'fa-info-circle',
        timestamp: new Date(),
        read: false
    });
}

function addNotificationToTop(type, title, message, icon) {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const isDupe = notifications.some(n => n.title === title && new Date(n.timestamp).getTime() > fiveMinAgo);
    if (isDupe) return;

    notifications.unshift({
        id: Date.now() + Math.random(),
        type, title, message,
        icon: icon || 'fa-robot',
        timestamp: new Date(),
        read: false
    });

    renderNotifications();
    updateBadge();
    saveNotificationsToStorage();
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
    // Move all to read history
    notifications.forEach(n => {
        n.read = true;
        n.readAt = new Date();
        readNotifications.unshift(n);
    });

    // Keep only MAX_READ_HISTORY
    readNotifications = readNotifications.slice(0, MAX_READ_HISTORY);
    notifications = [];

    renderNotifications();
    updateBadge();
    saveNotificationsToStorage();
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
// TIME FORMATTING
// ============================================

function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days}d`;

    const [year, month, day] = date.split('-').map(Number);
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

    if (notifications.length > 0) {
        list.appendChild(createSectionHeader(
            `Nuevas (${notifications.length})`,
            'padding: 6px 12px; font-size: 9px; color: #C8A752; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; border-bottom: 1px solid rgba(200,167,82,0.2);'
        ));
        notifications.forEach((n) => list.appendChild(renderNotificationItem(n)));
    }

    if (readNotifications.length > 0) {
        list.appendChild(createSectionHeader(
            'Historial',
            'padding: 6px 12px; margin-top: 8px; font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.05);'
        ));
        readNotifications.slice(0, 10).forEach((n) => list.appendChild(renderNotificationItem(n, true)));
    }

    if (notifications.length == 0 && readNotifications.length == 0) {
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

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 8px;';

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 10px; font-weight: 700; color: #fff; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;';
    title.textContent = titleText;

    const time = document.createElement('span');
    time.style.cssText = 'font-size: 8px; color: #666; white-space: nowrap;';
    time.textContent = timeStr;

    header.append(title, time);

    const message = document.createElement('div');
    message.style.cssText = 'font-size: 9px; color: #888; line-height: 1.3; margin-top: 2px;';
    message.textContent = messageText;

    content.append(header, message);
    wrapper.append(iconBox, content);
    item.appendChild(wrapper);
    return item;
}

function updateBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    const unreadCount = notifications.filter(n => !n.read).length;
    badge.style.display = unreadCount > 0 ? 'block' : 'none';
}

// ============================================
// PUBLIC API
// ============================================

window.triggerAgroNotification = (type, title, message, icon) => {
    addNotificationToTop(type, title, message, icon);
};

window.refreshAgroNotifications = async () => {
    refreshSystemNotifications('manual');
};

window.clearAgroNotificationHistory = () => {
    readNotifications = [];
    saveNotificationsToStorage();
    renderNotifications();
};
