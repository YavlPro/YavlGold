/**
 * YavlGold V9.4 - Agro Interactions Module
 * "Profundidad & Interacción Revitalizada"
 * Calendario Lunar 2026 + Centro Financiero Unificado + Agenda Real (localStorage)
 * ----------------------------------------------------------------------------------
 * DNA Visual V9.4 Compliance:
 *   - Gradiente sutiles en modales (no negro plano)
 *   - Bordes con brillo dorado
 *   - Botón X elegante con hover rojo
 *   - Consistencia visual Crypto = Fiat
 *   - localStorage para notas reales
 */

// Base de conocimiento lunar (Luna Nueva: 19 Enero 2026)
const BASE_NEW_MOON = new Date('2026-01-19T00:00:00');
const LUNAR_CYCLE = 29.53058867; // Días del ciclo lunar

// Clave localStorage para tareas
const TASKS_STORAGE_KEY = 'yavlgold_agro_tasks';

// Market Hub config (Centro Financiero)
const MARKET_HUB_CONFIG = {
    binanceAPI: 'https://data-api.binance.vision/api/v3/ticker/24hr',
    refreshInterval: 60000,
    cacheTTL: 10 * 60 * 1000,
    cacheMaxAge: 60 * 60 * 1000,
    cacheKey: 'YG_AGRO_MARKET_V1',
    timeout: 8000
};

window.__YG_MARKET_HUB__ = window.__YG_MARKET_HUB__ || {
    intervalId: null,
    inFlight: false,
    lastState: null
};

const marketHubState = window.__YG_MARKET_HUB__;

// Fecha actualmente seleccionada
let selectedDateStr = null;

/**
 * Inicializa las interacciones y expone funciones globales
 */
export function initInteractions() {
    // Modales
    window.openLunarCalendar = openLunarCalendar;
    window.showFiatTable = showFiatTable;

    // Market Hub
    window.openMarketHub = openMarketHub;
    window.switchMarketTab = switchMarketTab;

    // Función global para cerrar modales correctamente
    window.closeModal = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.style.display = 'none';
        }
        if (id === 'modal-market') {
            stopMarketHubPolling();
            if (typeof window.stopTickerAutoRefresh === 'function') {
                window.stopTickerAutoRefresh();
            }
        }
    };

    // Agenda Lunar Real
    window.selectDate = selectDate;
    window.saveTask = saveTask;
    window.deleteTask = deleteTask;

    console.log('[AgroInteractions] ✅ Módulo de interacciones inicializado con Agenda Real');
}

// ============================================
// AGENDA LUNAR REAL (localStorage)
// ============================================

/**
 * Carga todas las tareas desde localStorage
 * @returns {Object} { "YYYY-MM-DD": ["tarea1", "tarea2"], ... }
 */
function loadAllTasks() {
    try {
        const stored = localStorage.getItem(TASKS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('[AgroInteractions] Error loading tasks:', e);
        return {};
    }
}

/**
 * Guarda todas las tareas en localStorage
 */
function saveAllTasks(tasks) {
    try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
        console.error('[AgroInteractions] Error saving tasks:', e);
    }
}

/**
 * Carga las tareas de una fecha específica
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD
 * @returns {Array} Lista de tareas
 */
function loadTasks(dateStr) {
    const allTasks = loadAllTasks();
    return allTasks[dateStr] || [];
}

/**
 * Guarda una nueva tarea para la fecha seleccionada
 */
function saveTask() {
    if (!selectedDateStr) {
        console.warn('[AgroInteractions] No hay fecha seleccionada');
        return;
    }

    const input = document.getElementById('agenda-note-input');
    if (!input) return;

    const note = input.value.trim();
    if (!note) {
        input.style.borderColor = '#f87171';
        setTimeout(() => { input.style.borderColor = 'rgba(255,255,255,0.15)'; }, 1000);
        return;
    }

    // Cargar, agregar, guardar
    const allTasks = loadAllTasks();
    if (!allTasks[selectedDateStr]) {
        allTasks[selectedDateStr] = [];
    }
    allTasks[selectedDateStr].push(note);
    saveAllTasks(allTasks);

    // Limpiar input y re-renderizar
    input.value = '';
    renderAgendaPanel(selectedDateStr);

    // Animación de confirmación
    const btn = document.getElementById('agenda-add-btn');
    if (btn) {
        btn.style.background = '#4ade80';
        setTimeout(() => { btn.style.background = 'var(--gold-primary, #C8A752)'; }, 300);
    }
}

/**
 * Elimina una tarea específica
 * @param {string} dateStr - Fecha
 * @param {number} index - Índice de la tarea
 */
function deleteTask(dateStr, index) {
    const allTasks = loadAllTasks();
    if (allTasks[dateStr] && allTasks[dateStr][index] !== undefined) {
        allTasks[dateStr].splice(index, 1);
        // Limpiar fechas vacías
        if (allTasks[dateStr].length === 0) {
            delete allTasks[dateStr];
        }
        saveAllTasks(allTasks);
        renderAgendaPanel(dateStr);
    }
}

/**
 * Selecciona una fecha y renderiza el panel de agenda
 */
function selectDate(dateStr) {
    selectedDateStr = dateStr;

    // Actualizar estilos del día seleccionado en el calendario
    updateSelectedDayStyles(dateStr);

    // Renderizar panel de agenda
    renderAgendaPanel(dateStr);
}

/**
 * Actualiza los estilos visuales del día seleccionado
 */
function updateSelectedDayStyles(dateStr) {
    // Quitar selección anterior
    document.querySelectorAll('.day-cell.selected').forEach(cell => {
        cell.classList.remove('selected');
    });

    // Agregar selección al nuevo día
    const cells = document.querySelectorAll('.day-cell[data-date]');
    cells.forEach(cell => {
        if (cell.dataset.date === dateStr) {
            cell.classList.add('selected');
        }
    });
}

/**
 * Renderiza el panel de agenda con tareas reales
 */
function renderAgendaPanel(dateStr) {
    const panel = document.getElementById('agenda-panel');
    if (!panel) return;

    const [year, month, day] = dateStr.split('-').map(Number);
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    const weekday = weekdays[utcDate.getUTCDay()];
    const humanDate = `${weekday}, ${day} de ${months[month - 1]} de ${year}`;
    const phase = getMoonPhase(utcDate);
    const phaseInfo = getPhaseIcon(phase);

    const tasks = loadTasks(dateStr);

    // Generar HTML de tareas
    let tasksHtml = '';
    if (tasks.length === 0) {
        tasksHtml = `
            <div style="padding: 24px; text-align: center; color: #555; font-size: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.1);">
                <i class="fa-regular fa-calendar-xmark" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.4; display: block;"></i>
                Sin tareas planificadas.<br>Añade una nota.
            </div>
        `;
    } else {
        tasks.forEach((task, index) => {
            tasksHtml += `
                <div style="background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 10px; justify-content: space-between; transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(200,167,82,0.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--gold-primary, #C8A752); flex-shrink: 0;"></div>
                        <span style="color: #ccc; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(task)}</span>
                    </div>
                    <button onclick="window.deleteTask('${dateStr}', ${index})"
                        style="width: 28px; height: 28px; border-radius: 6px; background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.2); color: #f87171; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0;"
                        onmouseover="this.style.background='#f87171';this.style.color='#000'"
                        onmouseout="this.style.background='rgba(248, 113, 113, 0.1)';this.style.color='#f87171'"
                        title="Eliminar tarea">
                        <i class="fa-solid fa-trash-can" style="font-size: 11px;"></i>
                    </button>
                </div>
            `;
        });
    }

    panel.innerHTML = `
        <div style="animation: fadeIn 0.3s ease;">
            <div style="font-size: 10px; color: var(--gold-primary, #C8A752); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">PROGRAMACIÓN</div>
            <h2 style="font-size: 1.2rem; color: #fff; font-family: 'Orbitron', sans-serif; margin: 0 0 6px 0; text-transform: capitalize; line-height: 1.3;">${humanDate}</h2>
            <div style="font-size: 12px; color: #888; margin-bottom: 20px;">${phaseInfo.icon} ${phaseInfo.name}</div>

            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; max-height: 220px; overflow-y: auto;">
                ${tasksHtml}
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                <label style="font-size: 11px; color: #666; display: block; margin-bottom: 8px;">Agregar Nota</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="agenda-note-input" placeholder="Ej: Comprar fertilizante..."
                        style="flex: 1; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #fff; outline: none; transition: border-color 0.2s; font-family: 'Rajdhani', sans-serif;"
                        onfocus="this.style.borderColor='var(--gold-primary, #C8A752)'"
                        onblur="this.style.borderColor='rgba(255,255,255,0.15)'"
                        onkeypress="if(event.key === 'Enter') window.saveTask()">
                    <button id="agenda-add-btn" onclick="window.saveTask()"
                        style="background: var(--gold-primary, #C8A752); color: #000; border: none; padding: 0 14px; border-radius: 8px; cursor: pointer; font-weight: 700; transition: all 0.2s; display: flex; align-items: center; justify-content: center;"
                        onmouseover="this.style.background='#d4b866'"
                        onmouseout="this.style.background='var(--gold-primary, #C8A752)'">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// MARKET HUB (Centro Financiero Unificado)
// ============================================

function openMarketHub(defaultTab = 'crypto') {
    const modal = document.getElementById('modal-market');
    if (!modal) {
        console.error('[AgroInteractions] Modal market no encontrado');
        return;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    switchMarketTab(defaultTab);
    loadDetailedCrypto();
    loadFiatRates();
    startMarketHubPolling();
    if (typeof window.startTickerAutoRefresh === 'function') {
        window.startTickerAutoRefresh();
    }
}

function switchMarketTab(tab) {
    const btnCrypto = document.getElementById('tab-btn-crypto');
    const btnFiat = document.getElementById('tab-btn-fiat');
    const viewCrypto = document.getElementById('view-crypto');
    const viewFiat = document.getElementById('view-fiat');

    if (!btnCrypto || !btnFiat || !viewCrypto || !viewFiat) return;

    const activeStyle = 'flex: 1; padding: 14px; font-size: 11px; font-weight: 700; letter-spacing: 1px; background: rgba(255,255,255,0.03); border: none; border-bottom: 2px solid var(--gold-primary, #C8A752); color: #fff; cursor: pointer; transition: all 0.2s;';
    const inactiveStyle = 'flex: 1; padding: 14px; font-size: 11px; font-weight: 700; letter-spacing: 1px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #666; cursor: pointer; transition: all 0.2s;';

    if (tab === 'crypto') {
        btnCrypto.style.cssText = activeStyle;
        btnFiat.style.cssText = inactiveStyle;
        viewCrypto.style.display = 'flex';
        viewFiat.style.display = 'none';
    } else {
        btnCrypto.style.cssText = inactiveStyle;
        btnFiat.style.cssText = activeStyle;
        viewCrypto.style.display = 'none';
        viewFiat.style.display = 'flex';
    }
}

function startMarketHubPolling() {
    if (marketHubState.intervalId) return;
    marketHubState.intervalId = setInterval(loadDetailedCrypto, MARKET_HUB_CONFIG.refreshInterval);
}

function stopMarketHubPolling() {
    if (marketHubState.intervalId) {
        clearInterval(marketHubState.intervalId);
        marketHubState.intervalId = null;
    }
}

function fetchWithTimeout(url, timeoutMs = MARKET_HUB_CONFIG.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal })
        .then((res) => {
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .catch((err) => {
            clearTimeout(timeoutId);
            throw err;
        });
}

function getMarketHubCache() {
    try {
        const raw = localStorage.getItem(MARKET_HUB_CONFIG.cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const age = Date.now() - (parsed.ts || 0);
        if (age > MARKET_HUB_CONFIG.cacheMaxAge) return null;
        return {
            crypto: parsed.crypto || null,
            cryptoDetail: parsed.cryptoDetail || null,
            ts: parsed.ts,
            ageMinutes: Math.round(age / 60000),
            stale: age > MARKET_HUB_CONFIG.cacheTTL
        };
    } catch (e) {
        return null;
    }
}

function setMarketHubCache(cryptoDetail) {
    try {
        const raw = localStorage.getItem(MARKET_HUB_CONFIG.cacheKey);
        const parsed = raw ? JSON.parse(raw) : {};
        const crypto = {};

        cryptoDetail.forEach((item) => {
            const key = item?.cacheSymbol || item?.symbol;
            if (key) {
                crypto[key] = item.priceValue;
            }
        });

        localStorage.setItem(MARKET_HUB_CONFIG.cacheKey, JSON.stringify({
            ...parsed,
            crypto,
            cryptoDetail,
            ts: Date.now(),
            source: 'binance-vision'
        }));
    } catch (e) {
        // Ignore cache errors
    }
}

function setMarketHubState(state, message) {
    if (marketHubState.lastState === state) return;
    marketHubState.lastState = state;
    if (message) {
        console.log(`[AgroMarketHub] ${message}`);
    }
}

function renderMarketNotice(container, message) {
    if (!container) return;
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted, #888); padding: 40px 0;">${message}</div>`;
}

function renderCacheBadge(container, ageMinutes) {
    if (!container) return;
    const ageText = ageMinutes <= 0 ? 'ahora' : `hace ${ageMinutes} min`;
    const badge = `
        <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; margin-bottom: 12px; border-radius: 999px; border: 1px solid rgba(200,167,82,0.35); color: var(--gold-primary, #C8A752); font-size: 0.75rem; background: rgba(200,167,82,0.08);">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span>Ultimo dato (${ageText})</span>
        </div>
    `;
    container.insertAdjacentHTML('afterbegin', badge);
}

function buildCryptoItemsFromCache(cache) {
    const meta = [
        { symbol: 'BTC', name: 'Bitcoin', icon: 'fa-brands fa-bitcoin', iconColor: '#f7931a' },
        { symbol: 'ETH', name: 'Ethereum', icon: 'fa-brands fa-ethereum', iconColor: '#627eea' },
        { symbol: 'SOL', name: 'Solana', icon: 'fa-solid fa-sun', iconColor: '#00ffa3' }
    ];
    const crypto = cache?.crypto || {};

    return meta
        .filter((item) => typeof crypto[item.symbol] === 'number')
        .map((item) => ({
            name: item.name,
            symbol: `${item.symbol}/USDT`,
            price: crypto[item.symbol].toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
            priceValue: crypto[item.symbol],
            meta: 'Dato guardado',
            iconHtml: `<i class="${item.icon}" style="font-size: 1.8rem; color: ${item.iconColor};"></i>`
        }));
}

/**
 * Renderizador Unificado para Crypto y Fiat
 * DNA Visual V9.4: Consistencia absoluta
 * - Nombre: Blanco + Negrita
 * - Símbolo: Gris pequeño
 * - Precio: GOLD #C8A752 + font-mono
 */
function renderUnifiedList(items, container) {
    if (!container) return;

    let html = '';
    items.forEach(item => {
        const changeHtml = item.meta ? `
            <div style="font-size: 10px; color: var(--text-muted, #888);">${item.meta}</div>
        ` : (item.change !== undefined && item.change !== null ? `
            <div style="font-size: 11px; color: ${item.change >= 0 ? '#4ade80' : '#f87171'}; font-weight: 600;">
                ${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%
            </div>
        ` : `
            <div style="font-size: 10px; color: #4ade80;">Tasa Oficial</div>
        `);

        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(200,167,82,0.1); transition: all 0.2s; box-shadow: 0 0 10px rgba(200,167,82,0.02);"
                onmouseover="this.style.borderColor='rgba(200,167,82,0.3)';this.style.boxShadow='0 0 20px rgba(200,167,82,0.08)'"
                onmouseout="this.style.borderColor='rgba(200,167,82,0.1)';this.style.boxShadow='0 0 10px rgba(200,167,82,0.02)'">
                <div style="display: flex; align-items: center; gap: 14px;">
                    ${item.iconHtml}
                    <div>
                        <div style="font-weight: 700; color: #fff; font-size: 1rem;">${item.name}</div>
                        <div style="font-size: 11px; color: #666;">${item.symbol}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-family: 'Courier New', monospace; color: #C8A752; font-size: 1rem; font-weight: 700;">${item.price}</div>
                    ${changeHtml}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function loadDetailedCrypto() {
    const container = document.getElementById('crypto-list-container');
    if (!container) return;

    if (marketHubState.inFlight) return;
    marketHubState.inFlight = true;

    renderMarketNotice(container, 'Cargando mercado...');

    try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
        const results = await Promise.all(
            symbols.map(s => fetchWithTimeout(`${MARKET_HUB_CONFIG.binanceAPI}?symbol=${s}`))
        );

        const cryptoMeta = [
            { symbol: 'BTC', name: 'Bitcoin', icon: 'fa-brands fa-bitcoin', iconColor: '#f7931a' },
            { symbol: 'ETH', name: 'Ethereum', icon: 'fa-brands fa-ethereum', iconColor: '#627eea' },
            { symbol: 'SOL', name: 'Solana', icon: 'fa-solid fa-sun', iconColor: '#00ffa3' }
        ];

        const items = results.map((data, i) => ({
            name: cryptoMeta[i].name,
            symbol: `${cryptoMeta[i].symbol}/USDT`,
            cacheSymbol: cryptoMeta[i].symbol,
            price: parseFloat(data.lastPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
            priceValue: parseFloat(data.lastPrice),
            change: parseFloat(data.priceChangePercent),
            iconHtml: `<i class="${cryptoMeta[i].icon}" style="font-size: 1.8rem; color: ${cryptoMeta[i].iconColor};"></i>`
        }));

        renderUnifiedList(items, container);
        setMarketHubCache(items);
        setMarketHubState('OK', 'Ticker actualizado');
    } catch (e) {
        const cache = getMarketHubCache();
        if (cache) {
            const items = Array.isArray(cache.cryptoDetail) && cache.cryptoDetail.length > 0
                ? cache.cryptoDetail
                : buildCryptoItemsFromCache(cache);

            if (items.length > 0) {
                renderUnifiedList(items, container);
                renderCacheBadge(container, cache.ageMinutes);
                setMarketHubState('DEGRADED', 'Usando cache');
            } else {
                renderMarketNotice(container, 'Mercado no disponible (red/restriccion)');
                setMarketHubState('ERROR', 'Sin datos ni cache');
            }
        } else {
            renderMarketNotice(container, 'Mercado no disponible (red/restriccion)');
            setMarketHubState('ERROR', 'Sin datos ni cache');
        }
    } finally {
        marketHubState.inFlight = false;
    }
}

async function loadFiatRates() {
    const container = document.getElementById('fiat-list-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; color: #666; padding: 60px 0;">📡 Cargando divisas...</div>';

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        const rates = data.rates;

        const currencies = [
            { code: 'VES', name: 'Bolívar Digital', flag: '🇻🇪' },
            { code: 'COP', name: 'Peso Colombiano', flag: '🇨🇴' },
            { code: 'MXN', name: 'Peso Mexicano', flag: '🇲🇽' },
            { code: 'ARS', name: 'Peso Argentino', flag: '🇦🇷' },
            { code: 'BRL', name: 'Real Brasileño', flag: '🇧🇷' },
            { code: 'CLP', name: 'Peso Chileno', flag: '🇨🇱' },
            { code: 'PEN', name: 'Sol Peruano', flag: '🇵🇪' },
            { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
        ];

        const items = [];
        currencies.forEach(({ code, name, flag }) => {
            if (rates[code]) {
                items.push({
                    name: `USD/${code}`,
                    symbol: name,
                    price: rates[code].toLocaleString('es-ES', { maximumFractionDigits: 2 }),
                    iconHtml: `<span style="font-size: 1.6rem;">${flag}</span>`
                });
            }
        });

        renderUnifiedList(items, container);

    } catch (e) {
        console.error('[AgroInteractions] Error fiat:', e);
        container.innerHTML = '<div style="text-align: center; color: #f87171; padding: 60px 0;">❌ Error cargando divisas</div>';
    }
}

// ============================================
// CALENDARIO LUNAR 2026
// ============================================

function openLunarCalendar() {
    const modal = document.getElementById('modal-lunar');
    const grid = document.getElementById('lunar-calendar-grid');

    if (!modal || !grid) {
        console.error('[AgroInteractions] Modal lunar no encontrado');
        return;
    }

    // Abrir correctamente: quitar hidden y poner display flex
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    // Solo renderizar si está vacío
    if (grid.children.length > 0) return;

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    let html = '';

    for (let m = 0; m < 12; m++) {
        html += `
            <div class="lunar-month">
                <h4 class="month-title">${months[m]}</h4>
                <div class="month-grid">
                    <span class="day-header">L</span>
                    <span class="day-header">M</span>
                    <span class="day-header">M</span>
                    <span class="day-header">J</span>
                    <span class="day-header">V</span>
                    <span class="day-header">S</span>
                    <span class="day-header">D</span>
        `;

        // Calcular primer día del mes (0 = Domingo, ajustar para empezar en Lunes)
        const firstDay = new Date(2026, m, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1; // Lunes = 0

        // Celdas vacías antes del día 1
        for (let i = 0; i < offset; i++) {
            html += `<span class="day-cell empty"></span>`;
        }

        const daysInMonth = new Date(2026, m + 1, 0).getDate();
        const today = new Date();
        const allTasks = loadAllTasks();

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(2026, m, d);
            const phase = getMoonPhase(date);
            const phaseInfo = getPhaseIcon(phase);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

            const isToday = date.toDateString() === today.toDateString();
            const isSelected = dateStr === selectedDateStr;
            const hasTasks = allTasks[dateStr] && allTasks[dateStr].length > 0;

            let classes = 'day-cell';
            if (isToday) classes += ' today';
            if (isSelected) classes += ' selected';
            if (hasTasks) classes += ' has-tasks';

            html += `
                <div class="${classes}" title="${phaseInfo.name}" data-date="${dateStr}" onclick="window.selectDate('${dateStr}')">
                    <span class="day-num">${d}</span>
                    <span class="phase-icon">${phaseInfo.icon}</span>
                    ${hasTasks ? '<span class="task-indicator"></span>' : ''}
                </div>
            `;
        }

        html += `</div></div>`;
    }

    grid.innerHTML = html;
    injectLunarStyles();
}

/**
 * Calcula la fase lunar para una fecha dada
 * @returns {number} 0.0 a 1.0 (0 = Luna Nueva, 0.5 = Luna Llena)
 */
function getMoonPhase(date) {
    const diffTime = date.getTime() - BASE_NEW_MOON.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    const cycles = diffDays / LUNAR_CYCLE;
    return cycles - Math.floor(cycles);
}

/**
 * Obtiene el icono y nombre de la fase lunar
 */
function getPhaseIcon(phase) {
    if (phase < 0.03 || phase > 0.97) return { icon: '🌑', name: 'Luna Nueva' };
    if (phase < 0.22) return { icon: '', name: 'Creciente' };
    if (phase < 0.28) return { icon: '🌓', name: 'Cuarto Creciente' };
    if (phase < 0.47) return { icon: '', name: 'Gibosa Creciente' };
    if (phase < 0.53) return { icon: '🌕', name: 'Luna Llena' };
    if (phase < 0.72) return { icon: '', name: 'Gibosa Menguante' };
    if (phase < 0.78) return { icon: '🌗', name: 'Cuarto Menguante' };
    return { icon: '', name: 'Menguante' };
}

// ============================================
// TABLA DE TASAS FIAT (Legacy - para compatibilidad)
// ============================================

async function showFiatTable() {
    const modal = document.getElementById('modal-fiat');
    const tbody = document.getElementById('fiat-table-body');

    if (!modal || !tbody) {
        // Fallback: abrir Market Hub en pestaña Fiat
        openMarketHub('fiat');
        return;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    tbody.innerHTML = '<tr><td colspan="2" class="loading-cell">📡 Cargando tasas...</td></tr>';

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        const rates = data.rates;

        const currencies = [
            { code: 'COP', name: 'Peso Colombiano', flag: '🇨🇴' },
            { code: 'VES', name: 'Bolívar Digital', flag: '🇻🇪' },
            { code: 'MXN', name: 'Peso Mexicano', flag: '🇲🇽' },
            { code: 'BRL', name: 'Real Brasileño', flag: '🇧🇷' },
            { code: 'ARS', name: 'Peso Argentino', flag: '🇦🇷' },
            { code: 'CLP', name: 'Peso Chileno', flag: '🇨🇱' },
            { code: 'PEN', name: 'Sol Peruano', flag: '🇵🇪' },
            { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
        ];

        let html = '';
        currencies.forEach(({ code, name, flag }) => {
            if (rates[code]) {
                const formatted = formatCurrency(rates[code], code);
                html += `
                    <tr class="fiat-row">
                        <td class="fiat-currency">
                            <span class="flag">${flag}</span>
                            <div class="currency-info">
                                <span class="code">${code}</span>
                                <span class="name">${name}</span>
                            </div>
                        </td>
                        <td class="fiat-rate">${formatted}</td>
                    </tr>
                `;
            }
        });

        tbody.innerHTML = html;

    } catch (e) {
        console.error('[AgroInteractions] Error fiat:', e);
        tbody.innerHTML = '<tr><td colspan="2" class="error-cell">❌ Error cargando tasas</td></tr>';
    }
}

/**
 * Formatea el valor de la moneda
 */
function formatCurrency(value, code) {
    try {
        return value.toLocaleString('es-ES', {
            style: 'currency',
            currency: code,
            maximumFractionDigits: code === 'VES' || code === 'ARS' ? 2 : 0
        });
    } catch {
        return `${code} ${value.toLocaleString()}`;
    }
}

// ============================================
// ESTILOS CSS (DNA Visual V9.4 Compliant)
// ============================================

function injectLunarStyles() {
    if (document.getElementById('lunar-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'lunar-modal-styles';
    style.textContent = `
        /* Animaciones */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Calendarios Lunares */
        .lunar-month {
            background: linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(10, 10, 10, 0.95));
            border-radius: 12px;
            padding: 12px;
            border: 1px solid rgba(200, 167, 82, 0.15);
            box-shadow: 0 0 20px rgba(200, 167, 82, 0.03);
            transition: all 0.3s;
        }

        .lunar-month:hover {
            border-color: rgba(200, 167, 82, 0.3);
            box-shadow: 0 0 30px rgba(200, 167, 82, 0.08);
        }

        .month-title {
            text-align: center;
            color: var(--gold-primary, #C8A752);
            font-weight: 700;
            font-size: 0.9rem;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(200, 167, 82, 0.15);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .month-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
        }

        .day-header {
            font-size: 9px;
            color: #666;
            text-align: center;
            padding: 4px 0;
        }

        .day-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 36px;
            font-size: 11px;
            color: #888;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
            border: 1px solid transparent;
        }

        .day-cell:hover:not(.empty) {
            background: rgba(200, 167, 82, 0.15);
            color: #fff;
            border-color: rgba(200, 167, 82, 0.3);
        }

        /* Día seleccionado - DNA Visual V9.4 */
        .day-cell.selected {
            background: rgba(200, 167, 82, 0.2);
            border: 2px solid #C8A752 !important;
            color: #fff;
            font-weight: 700;
            box-shadow: 0 0 15px rgba(200, 167, 82, 0.4), inset 0 0 10px rgba(200, 167, 82, 0.1);
        }

        .day-cell.today {
            background: var(--gold-primary, #C8A752);
            color: #000;
            font-weight: 700;
            box-shadow: 0 0 12px rgba(200, 167, 82, 0.5);
        }

        .day-cell.today.selected {
            box-shadow: 0 0 20px rgba(200, 167, 82, 0.7), 0 0 30px rgba(200, 167, 82, 0.4);
        }

        .day-cell.has-tasks::after {
            content: '';
            position: absolute;
            bottom: 3px;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #4ade80;
        }

        .day-cell.empty {
            background: transparent;
            cursor: default;
        }

        .day-num {
            line-height: 1;
            font-weight: 600;
        }

        .phase-icon {
            font-size: 8px;
            line-height: 1;
            margin-top: 2px;
        }

        /* Fiat Table Styles */
        .fiat-row {
            transition: background 0.2s;
        }

        .fiat-row:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .fiat-currency {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
        }

        .fiat-currency .flag {
            font-size: 1.5rem;
        }

        .currency-info {
            display: flex;
            flex-direction: column;
        }

        .currency-info .code {
            font-weight: 700;
            color: #e5e5e5;
        }

        .currency-info .name {
            font-size: 10px;
            color: #666;
        }

        .fiat-rate {
            text-align: right;
            padding: 12px 16px;
            font-family: 'Courier New', monospace;
            color: var(--gold-primary, #C8A752);
            font-size: 0.9rem;
            font-weight: 700;
        }

        .loading-cell, .error-cell {
            text-align: center;
            padding: 24px;
            color: #888;
        }

        .error-cell {
            color: #f87171;
        }
    `;
    document.head.appendChild(style);
}
