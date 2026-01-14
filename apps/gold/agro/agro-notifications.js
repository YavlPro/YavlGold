/**
 * YavlGold V9.4 - Agro Notifications Module
 * "Centro de Alertas Inteligente"
 * Con historial persistente, timestamps y sincronización IA en tiempo real
 */

// ============================================
// STATE
// ============================================
let notifications = [];
let readNotifications = [];
let isDropdownOpen = false;
let adviceObserver = null;
let lastAdviceText = '';

const STORAGE_KEY = 'yavlgold_agro_notifications';
const READ_STORAGE_KEY = 'yavlgold_agro_notifications_read';
const MAX_READ_HISTORY = 20; // Máximo de notificaciones leídas a conservar

// ============================================
// INITIALIZATION
// ============================================

export function initNotifications() {
    console.log('[AgroNotif] 🔔 Inicializando Centro de Alertas...');

    // Load from localStorage
    loadNotificationsFromStorage();

    // Setup event listeners
    setupEventListeners();

    // Generate initial system notifications (only if empty)
    if (notifications.length === 0) {
        generateSystemNotifications();
    } else {
        renderNotifications();
        updateBadge();
    }

    // Start observing AI Advisor changes (MutationObserver)
    setupAdviceObserver();

    console.log('[AgroNotif] ✅ Sistema de notificaciones activo con historial');
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

function generateSystemNotifications() {
    const crops = getCrops();

    if (crops.length === 0) {
        addNotification('info', '🌱 Sin cultivos', 'Agrega tu primer cultivo para alertas personalizadas.', 'fa-seedling');
    } else {
        crops.forEach(checkCropAlerts);
    }

    checkWeatherAlerts();
    addNotification('success', '✅ Sistema Listo', 'El Oráculo está monitoreando. Consejos IA aparecerán aquí.', 'fa-satellite-dish');

    renderNotifications();
    updateBadge();
    saveNotificationsToStorage();
}

function getCrops() {
    try {
        return JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
    } catch (e) { return []; }
}

function checkCropAlerts(crop) {
    const now = new Date();
    const harvestDate = crop.harvest_date ? new Date(crop.harvest_date) : null;

    if (harvestDate) {
        const days = Math.ceil((harvestDate - now) / (1000 * 60 * 60 * 24));
        if (days > 0 && days <= 7) {
            addNotification('warning', `📅 Cosecha: ${crop.name}`, `Faltan ${days} días.`, 'fa-calendar-check');
        }
        if (days < 0) {
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

    return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
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

window.refreshAgroNotifications = () => {
    generateSystemNotifications();
};

window.clearAgroNotificationHistory = () => {
    readNotifications = [];
    saveNotificationsToStorage();
    renderNotifications();
};
