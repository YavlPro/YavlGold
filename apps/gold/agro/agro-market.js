/**
 * YavlGold V9.4.2 - Agro Market Intelligence
 * Ticker Financiero con Crypto (Binance Vision) + Fiat (Exchange Rates API)
 *
 * Resiliencia:
 * - Endpoint único: data-api.binance.vision (sin CORS)
 * - NO fallback a api.binance.com (CORS/451 regional)
 * - Fallback a cache localStorage si falla fetch
 * - Singleton global para evitar doble polling
 * - UI degradada con edad de cache
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const MARKET_CONFIG = {
    // Único endpoint - data-api.binance.vision es apto para browser
    binanceAPI: 'https://data-api.binance.vision/api/v3/ticker/price',
    fiatAPI: 'https://open.er-api.com/v6/latest/USD',
    timeout: 8000,
    maxRetries: 3,
    refreshInterval: 60000, // 60 segundos
    cacheTTL: 10 * 60 * 1000, // 10 minutos (cache válido)
    cacheMaxAge: 60 * 60 * 1000, // 1 hora (cache stale pero usable)
    cacheKey: 'YG_AGRO_MARKET_V1'
};

// ============================================================
// SINGLETON GLOBAL (evitar doble polling)
// ============================================================
window.__YG_MARKET_TICKER__ = window.__YG_MARKET_TICKER__ || {
    inited: false,
    intervalId: null,
    lastState: null // 'OK' | 'DEGRADED' | 'ERROR'
};

const tickerState = window.__YG_MARKET_TICKER__;

// ============================================================
// UTILIDADES DE CACHE
// ============================================================
function getMarketCache() {
    try {
        const raw = localStorage.getItem(MARKET_CONFIG.cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const age = Date.now() - (parsed.ts || 0);

        // Cache completamente expirado (más de 1 hora)
        if (age > MARKET_CONFIG.cacheMaxAge) {
            return null;
        }

        return {
            crypto: parsed.crypto,
            fiat: parsed.fiat,
            ts: parsed.ts,
            stale: age > MARKET_CONFIG.cacheTTL,
            ageMinutes: Math.round(age / 60000)
        };
    } catch {
        return null;
    }
}

function setMarketCache(crypto, fiat) {
    try {
        localStorage.setItem(MARKET_CONFIG.cacheKey, JSON.stringify({
            crypto,
            fiat,
            ts: Date.now(),
            source: 'binance-vision'
        }));
    } catch (e) {
        console.debug('[AGRO_MARKET] Cache write failed:', e.message);
    }
}

// ============================================================
// FETCH CON TIMEOUT + RETRY + BACKOFF
// ============================================================
async function fetchWithTimeout(url, timeoutMs = MARKET_CONFIG.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res;
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt) {
    const base = Math.min(1000 * Math.pow(2, attempt), 8000);
    const jitter = Math.random() * 500;
    return base + jitter;
}

async function fetchWithRetry(url, retries = MARKET_CONFIG.maxRetries) {
    let lastError = null;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await fetchWithTimeout(url);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            return await res.json();
        } catch (e) {
            lastError = e;
            if (attempt < retries - 1) {
                const delay = getBackoffDelay(attempt);
                console.debug(`[AGRO_MARKET] Retry ${attempt + 1}/${retries} in ${Math.round(delay)}ms`);
                await sleep(delay);
            }
        }
    }
    throw lastError;
}

// ============================================================
// FETCH CRYPTO PRICES (solo data-api.binance.vision)
// ============================================================
async function fetchCryptoPrices() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    const prices = {};

    for (const symbol of symbols) {
        try {
            const data = await fetchWithRetry(`${MARKET_CONFIG.binanceAPI}?symbol=${symbol}`);
            const key = symbol.replace('USDT', '');
            prices[key] = parseFloat(data.price);
        } catch (e) {
            // NO fallback a api.binance.com - si falla, usaremos cache
            console.debug(`[AGRO_MARKET] ${symbol} fetch failed`);
        }
    }

    return prices;
}

// ============================================================
// FETCH FIAT RATES
// ============================================================
async function fetchFiatRates() {
    try {
        const data = await fetchWithRetry(MARKET_CONFIG.fiatAPI);
        return data.rates || {};
    } catch (e) {
        console.debug('[AGRO_MARKET] Fiat rates fetch failed');
        return {};
    }
}

// ============================================================
// DETECCIÓN DE MONEDA LOCAL
// ============================================================
function detectUserCurrency(locationLabel) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let currency = 'USD';
    let label = 'Global';

    if (tz.includes('Caracas')) {
        currency = 'VES';
        label = 'Venezuela 🇻🇪';
    } else if (tz.includes('Bogota')) {
        currency = 'COP';
        label = 'Colombia 🇨🇴';
    } else if (tz.includes('Mexico')) {
        currency = 'MXN';
        label = 'M\u00e9xico 🇲🇽';
    } else if (tz.includes('Buenos_Aires')) {
        currency = 'ARS';
        label = 'Argentina 🇦🇷';
    } else if (tz.includes('Lima')) {
        currency = 'PEN';
        label = 'Per\u00fa 🇵🇪';
    } else if (tz.includes('Santiago')) {
        currency = 'CLP';
        label = 'Chile 🇨🇱';
    } else if (tz.includes('Madrid') || tz.includes('Canary')) {
        currency = 'EUR';
        label = 'Espa\u00f1a 🇪🇸';
    }

    if (locationLabel) {
        locationLabel.innerHTML = `<i class="fa-solid fa-location-dot" style="color: var(--gold-primary);"></i> ${label}`;
    }

    return currency;
}

// ============================================================
// RENDERIZADO DEL TICKER
// ============================================================
function renderTicker(tickerTrack, crypto, fiat, localCurrency, cacheInfo = null) {
    const fmt = (n) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const fmtFiat = (n, c) => {
        try {
            return n.toLocaleString('es-ES', { style: 'currency', currency: c, maximumFractionDigits: 0 });
        } catch {
            return `${c} ${n.toLocaleString()}`;
        }
    };

    let items = '';

    // Crypto Assets
    if (crypto.BTC) items += createTickerItem('BTC', fmt(crypto.BTC), 'text-yellow-500', 'fa-brands fa-bitcoin');
    if (crypto.ETH) items += createTickerItem('ETH', fmt(crypto.ETH), 'text-blue-400', 'fa-brands fa-ethereum');
    if (crypto.SOL) items += createTickerItem('SOL', fmt(crypto.SOL), 'text-purple-400', 'fa-solid fa-sun');
    items += createTickerItem('USDT', '$1.00', 'text-green-400', 'fa-solid fa-circle-dollar-to-slot');

    // Fiat Dinámico
    if (fiat[localCurrency] && localCurrency !== 'USD') {
        items += createTickerItem(`USD/${localCurrency}`, fmtFiat(fiat[localCurrency], localCurrency), 'text-gold', 'fa-solid fa-money-bill-transfer');
    }

    // Venezuela: mostrar COP también
    if (localCurrency === 'VES' && fiat['COP']) {
        items += createTickerItem('USD/COP', fmtFiat(fiat['COP'], 'COP'), 'text-orange-400', 'fa-solid fa-money-bill-1');
    }

    // Indicador de cache si aplica
    if (cacheInfo) {
        const ageText = cacheInfo.ageMinutes < 1 ? 'ahora' : `hace ${cacheInfo.ageMinutes} min`;
        items += `<span class="ticker-item ticker-cache-badge">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span style="font-size: 0.75rem; opacity: 0.8;">\u00daltimo dato (${ageText})</span>
        </span>`;
    }

    // Clear before render (idempotent) + Duplicar para scroll infinito
    tickerTrack.innerHTML = '';
    tickerTrack.innerHTML = items + items;
    injectTickerStyles();
}

function renderDegradedState(tickerTrack, hasCache = false) {
    const message = hasCache
        ? '<i class="fa-solid fa-clock-rotate-left"></i> Mostrando \u00faltimo dato guardado'
        : '<i class="fa-solid fa-signal-slash"></i> Mercado no disponible (red/restricci\u00f3n)';

    tickerTrack.innerHTML = `
        <span class="ticker-item ticker-degraded">
            ${message}
        </span>
    `;
    injectTickerStyles();
}

function createTickerItem(label, value, colorClass, iconClass) {
    return `
        <div class="ticker-item">
            <i class="${iconClass} ${colorClass}"></i>
            <span class="ticker-label">${label}</span>
            <span class="ticker-value">${value}</span>
        </div>
    `;
}

// ============================================================
// ESTILOS CSS
// ============================================================
function injectTickerStyles() {
    if (document.getElementById('ticker-animation-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'ticker-animation-styles';
    styleEl.textContent = `
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }

        .animate-marquee {
            animation: marquee 25s linear infinite;
        }

        .animate-marquee:hover {
            animation-play-state: paused;
        }

        .ticker-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 16px;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
        }

        .ticker-label {
            font-weight: 700;
            color: #e5e5e5;
            font-family: 'Rajdhani', sans-serif;
        }

        .ticker-value {
            font-family: 'Orbitron', monospace;
            color: var(--gold-primary, #C8A752);
            font-size: 0.9rem;
        }

        .ticker-cache-badge {
            color: var(--text-muted, #888);
            font-size: 0.8rem;
        }

        .ticker-degraded {
            color: var(--gold-primary, #C8A752);
            font-size: 0.85rem;
            opacity: 0.9;
        }

        .text-gold { color: var(--gold-primary, #C8A752); }
        .text-yellow-500 { color: #eab308; }
        .text-blue-400 { color: #60a5fa; }
        .text-purple-400 { color: #c084fc; }
        .text-green-400 { color: #4ade80; }
        .text-orange-400 { color: #fb923c; }
    `;
    document.head.appendChild(styleEl);
}

// ============================================================
// INICIALIZACIÓN PRINCIPAL
// ============================================================
let marketInFlight = false;

async function fetchAndRenderMarket() {
    const tickerTrack = document.getElementById('market-ticker-track');
    const locationLabel = document.getElementById('market-location');

    if (!tickerTrack) return;

    // Anti-spam: evitar fetches duplicados
    if (marketInFlight) {
        console.debug('[AGRO_MARKET] Fetch in progress, skipping');
        return;
    }

    marketInFlight = true;
    const userCurrency = detectUserCurrency(locationLabel);

    try {
        const [crypto, fiat] = await Promise.all([
            fetchCryptoPrices(),
            fetchFiatRates()
        ]);

        const hasData = Object.keys(crypto).length > 0;

        if (hasData) {
            setMarketCache(crypto, fiat);
            renderTicker(tickerTrack, crypto, fiat, userCurrency, null);

            // Log solo en cambio de estado
            if (tickerState.lastState !== 'OK') {
                console.log('[AGRO_MARKET] \u2705 Ticker actualizado');
                tickerState.lastState = 'OK';
            }
        } else {
            // Sin datos frescos, intentar cache
            const cache = getMarketCache();
            if (cache) {
                renderTicker(tickerTrack, cache.crypto, cache.fiat, userCurrency, cache);
                if (tickerState.lastState !== 'DEGRADED') {
                    console.log('[AGRO_MARKET] \u26a0\ufe0f Usando cache (sin datos frescos)');
                    tickerState.lastState = 'DEGRADED';
                }
            } else {
                renderDegradedState(tickerTrack, false);
                if (tickerState.lastState !== 'ERROR') {
                    console.log('[AGRO_MARKET] \u274c Sin datos ni cache');
                    tickerState.lastState = 'ERROR';
                }
            }
        }
    } catch (error) {
        // Fallback a cache (NO a api.binance.com)
        const cache = getMarketCache();
        if (cache) {
            renderTicker(tickerTrack, cache.crypto, cache.fiat, userCurrency, cache);
            if (tickerState.lastState !== 'DEGRADED') {
                console.log('[AGRO_MARKET] \u{1f4e6} Fallback a cache');
                tickerState.lastState = 'DEGRADED';
            }
        } else {
            renderDegradedState(tickerTrack, false);
            if (tickerState.lastState !== 'ERROR') {
                console.log('[AGRO_MARKET] \u274c Error y sin cache disponible');
                tickerState.lastState = 'ERROR';
            }
        }
    } finally {
        marketInFlight = false;
    }
}

export async function initMarketIntelligence() {
    // Singleton: evitar doble inicialización
    if (tickerState.inited) {
        console.debug('[AGRO_MARKET] Ya inicializado (singleton)');
        // Pero sí actualizar la vista si hay datos en cache
        await fetchAndRenderMarket();
        return;
    }

    const tickerTrack = document.getElementById('market-ticker-track');
    if (!tickerTrack) {
        console.debug('[AGRO_MARKET] Ticker track not found');
        return;
    }

    tickerState.inited = true;

    // Primera carga
    await fetchAndRenderMarket();

    // Auto-refresh cada 60s (singleton interval)
    if (!tickerState.intervalId) {
        tickerState.intervalId = setInterval(fetchAndRenderMarket, MARKET_CONFIG.refreshInterval);
        console.debug('[AGRO_MARKET] Auto-refresh iniciado (60s)');
    }
}

export function startTickerAutoRefresh() {
    // Mantenido por compatibilidad, pero el intervalo ya se inicia en initMarketIntelligence
    if (!tickerState.intervalId) {
        tickerState.intervalId = setInterval(fetchAndRenderMarket, MARKET_CONFIG.refreshInterval);
    }
}

export function stopTickerAutoRefresh() {
    if (tickerState.intervalId) {
        clearInterval(tickerState.intervalId);
        tickerState.intervalId = null;
        tickerState.inited = false;
        console.debug('[AGRO_MARKET] Auto-refresh detenido');
    }
}

if (typeof window !== 'undefined') {
    window.startTickerAutoRefresh = startTickerAutoRefresh;
    window.stopTickerAutoRefresh = stopTickerAutoRefresh;
}
