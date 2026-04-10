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
const AGRO_LOCATION_UPDATED_EVENT = 'agro:location:updated';

// ============================================================
// SINGLETON GLOBAL (evitar doble polling)
// ============================================================
window.__YG_MARKET_TICKER__ = window.__YG_MARKET_TICKER__ || {
    inited: false,
    intervalId: null,
    lastState: null, // 'OK' | 'DEGRADED' | 'ERROR'
    snapshot: null
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

function buildMarketSnapshot({ crypto = {}, fiat = {}, localCurrency = 'USD', cacheInfo = null, source = 'OK' } = {}) {
    return {
        crypto: { ...crypto },
        fiat: { ...fiat },
        localCurrency,
        cacheInfo: cacheInfo ? { ...cacheInfo } : null,
        ageMinutes: cacheInfo?.ageMinutes ?? 0,
        stale: Boolean(cacheInfo?.stale),
        source,
        updatedAt: cacheInfo?.ts ?? Date.now()
    };
}

function cloneMarketSnapshot(snapshot) {
    return snapshot ? buildMarketSnapshot(snapshot) : null;
}

function updateMarketSnapshot({ crypto = {}, fiat = {}, localCurrency = 'USD', cacheInfo = null, source = 'OK' } = {}) {
    tickerState.snapshot = buildMarketSnapshot({ crypto, fiat, localCurrency, cacheInfo, source });
    return tickerState.snapshot;
}

export function getMarketTickerSnapshot() {
    if (tickerState.snapshot) {
        return cloneMarketSnapshot(tickerState.snapshot);
    }

    const cache = getMarketCache();
    if (!cache) return null;

    return buildMarketSnapshot({
        crypto: cache.crypto || {},
        fiat: cache.fiat || {},
        localCurrency: detectUserCurrency(null),
        cacheInfo: cache,
        source: 'DEGRADED'
    });
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
function normalizeLocationText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function formatMarketLocationLabel(location) {
    const rawLabel = String(location?.label || '').trim();
    if (!rawLabel) return '';
    return rawLabel
        .replace(/^ubicacion por ip:\s*/i, '')
        .replace(/^gps no disponible\s*→\s*ip:\s*/i, '')
        .replace(/^gps no disponible\s*->\s*ip:\s*/i, '')
        .trim();
}

function updateMarketLocationLabel(locationLabel, label) {
    if (!locationLabel) return;
    locationLabel.replaceChildren();
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-location-dot';
    icon.style.color = 'var(--gold-primary)';
    locationLabel.append(icon, document.createTextNode(` ${label}`));
}

function inferCurrencyFromTimezone() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('Caracas')) return { currency: 'VES', label: 'Venezuela 🇻🇪' };
    if (tz.includes('Bogota')) return { currency: 'COP', label: 'Colombia 🇨🇴' };
    if (tz.includes('Mexico')) return { currency: 'MXN', label: 'México 🇲🇽' };
    if (tz.includes('Buenos_Aires')) return { currency: 'ARS', label: 'Argentina 🇦🇷' };
    if (tz.includes('Lima')) return { currency: 'PEN', label: 'Perú 🇵🇪' };
    if (tz.includes('Santiago')) return { currency: 'CLP', label: 'Chile 🇨🇱' };
    if (tz.includes('Madrid') || tz.includes('Canary')) return { currency: 'EUR', label: 'España 🇪🇸' };
    return { currency: 'USD', label: 'Global' };
}

function inferCurrencyFromLocation(location) {
    const haystack = normalizeLocationText([
        location?.countryCode,
        location?.country,
        location?.admin1,
        location?.region,
        location?.city,
        location?.label
    ].filter(Boolean).join(' | '));

    if (!haystack) return { currency: 'USD', label: 'Global' };
    if (/(^|[^a-z])(ve|venezuela)([^a-z]|$)|caracas|tachira/.test(haystack)) {
        return { currency: 'VES', label: formatMarketLocationLabel(location) || 'Venezuela 🇻🇪' };
    }
    if (/(^|[^a-z])(co|colombia)([^a-z]|$)|bogota|medellin|antioquia/.test(haystack)) {
        return { currency: 'COP', label: formatMarketLocationLabel(location) || 'Colombia 🇨🇴' };
    }
    if (/(^|[^a-z])(mx|mexico)([^a-z]|$)|ciudad de mexico|guadalajara|monterrey/.test(haystack)) {
        return { currency: 'MXN', label: formatMarketLocationLabel(location) || 'México 🇲🇽' };
    }
    if (/(^|[^a-z])(ar|argentina)([^a-z]|$)|buenos aires|cordoba/.test(haystack)) {
        return { currency: 'ARS', label: formatMarketLocationLabel(location) || 'Argentina 🇦🇷' };
    }
    if (/(^|[^a-z])(pe|peru)([^a-z]|$)|lima|cusco/.test(haystack)) {
        return { currency: 'PEN', label: formatMarketLocationLabel(location) || 'Perú 🇵🇪' };
    }
    if (/(^|[^a-z])(cl|chile)([^a-z]|$)|santiago/.test(haystack)) {
        return { currency: 'CLP', label: formatMarketLocationLabel(location) || 'Chile 🇨🇱' };
    }
    if (/(^|[^a-z])(es|espana|spain)([^a-z]|$)|madrid|canarias|canary/.test(haystack)) {
        return { currency: 'EUR', label: formatMarketLocationLabel(location) || 'España 🇪🇸' };
    }
    return { currency: 'USD', label: formatMarketLocationLabel(location) || 'Global' };
}

function resolveMarketLocationContext() {
    if (typeof window === 'undefined') return null;
    if (window.YGAgroLocationContext) return window.YGAgroLocationContext;
    return window.YGGeolocation?.getResolvedContext?.() || null;
}

function detectUserCurrency(locationLabel) {
    const resolvedLocation = resolveMarketLocationContext();
    if (resolvedLocation) {
        const inferred = inferCurrencyFromLocation(resolvedLocation);
        const hasRegionMeta = !!(
            resolvedLocation.country
            || resolvedLocation.countryCode
            || resolvedLocation.region
            || resolvedLocation.admin1
            || resolvedLocation.city
        );
        if (inferred.currency !== 'USD' || hasRegionMeta) {
            updateMarketLocationLabel(locationLabel, inferred.label);
            return inferred.currency;
        }

        const tzFallback = inferCurrencyFromTimezone();
        updateMarketLocationLabel(
            locationLabel,
            formatMarketLocationLabel(resolvedLocation) || tzFallback.label
        );
        return tzFallback.currency;
    }

    const fallback = inferCurrencyFromTimezone();
    updateMarketLocationLabel(locationLabel, fallback.label);
    return fallback.currency;
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

    const previousCache = getMarketCache();
    const previousCrypto = previousCache?.crypto || {};
    const previousFiat = previousCache?.fiat || {};
    let items = '';

    // Crypto Assets
    if (crypto.BTC) {
        const value = fmt(crypto.BTC);
        const trend = resolveTrendMeta(crypto.BTC, previousCrypto.BTC);
        items += createTickerItem('BTC', value, { rawMoney: value, trendClass: trend.className });
    }
    if (crypto.ETH) {
        const value = fmt(crypto.ETH);
        const trend = resolveTrendMeta(crypto.ETH, previousCrypto.ETH);
        items += createTickerItem('ETH', value, { rawMoney: value, trendClass: trend.className });
    }
    if (crypto.SOL) {
        const value = fmt(crypto.SOL);
        const trend = resolveTrendMeta(crypto.SOL, previousCrypto.SOL);
        items += createTickerItem('SOL', value, { rawMoney: value, trendClass: trend.className });
    }
    items += createTickerItem('USDT', '$1.00', { rawMoney: '$1.00', trendClass: 'agro-ticker-up' });

    // Fiat Dinámico
    if (fiat[localCurrency] && localCurrency !== 'USD') {
        const value = fmtFiat(fiat[localCurrency], localCurrency);
        const trend = resolveTrendMeta(fiat[localCurrency], previousFiat[localCurrency]);
        items += createTickerItem(`USD/${localCurrency}`, value, { rawMoney: value, trendClass: trend.className });
    }

    // Venezuela: mostrar COP también
    if (localCurrency === 'VES' && fiat['COP']) {
        const value = fmtFiat(fiat.COP, 'COP');
        const trend = resolveTrendMeta(fiat.COP, previousFiat.COP);
        items += createTickerItem('USD/COP', value, { rawMoney: value, trendClass: trend.className });
    }

    // Indicador de cache si aplica
    if (cacheInfo) {
        const ageText = cacheInfo.ageMinutes < 1 ? 'ahora' : `hace ${cacheInfo.ageMinutes} min`;
        items += `<span class="agro-ticker-item agro-ticker-meta">
            <span class="agro-ticker-symbol">SYNC</span>
            <span class="agro-ticker-value">\u00daltimo dato (${ageText})</span>
            <span class="agro-ticker-trend agro-ticker-up">•</span>
        </span>`;
    }

    // Clear before render (idempotent) + Duplicar para scroll infinito
    tickerTrack.innerHTML = '';
    tickerTrack.innerHTML = items + items;
    injectTickerStyles();
}

function renderDegradedState(tickerTrack, hasCache = false) {
    const message = hasCache
        ? 'Mostrando ultimo dato guardado'
        : 'Mercado no disponible (red/restriccion)';

    tickerTrack.innerHTML = `
        <span class="agro-ticker-item agro-ticker-meta">
            <span class="agro-ticker-symbol">SYNC</span>
            <span class="agro-ticker-value">${message}</span>
            <span class="agro-ticker-trend agro-ticker-down">•</span>
        </span>
    `;
    injectTickerStyles();
}

function escapeAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function resolveTrendMeta(current, previous) {
    const currentValue = Number(current);
    const previousValue = Number(previous);
    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
        return { className: 'agro-ticker-up' };
    }
    if (currentValue < previousValue) {
        return { className: 'agro-ticker-down' };
    }
    return { className: 'agro-ticker-up' };
}

function createTickerItem(label, value, options = {}) {
    const trendClass = options.trendClass === 'agro-ticker-down' ? 'agro-ticker-down' : 'agro-ticker-up';
    const trendSymbol = trendClass === 'agro-ticker-down' ? '▼' : '▲';
    const rawMoney = String(options.rawMoney ?? value);

    return `
        <div class="agro-ticker-item">
            <span class="agro-ticker-symbol">${label}</span>
            <span class="agro-ticker-value" data-money="1" data-raw-money="${escapeAttr(rawMoney)}">${value}</span>
            <span class="agro-ticker-trend ${trendClass}">${trendSymbol}</span>
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
let marketLocationSyncBound = false;

function bindMarketLocationSync() {
    if (marketLocationSyncBound || typeof window === 'undefined') return;
    marketLocationSyncBound = true;
    window.addEventListener(AGRO_LOCATION_UPDATED_EVENT, () => {
        if (!tickerState.inited) return;
        fetchAndRenderMarket();
    });
}

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
            updateMarketSnapshot({
                crypto,
                fiat,
                localCurrency: userCurrency,
                source: 'OK'
            });
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
                updateMarketSnapshot({
                    crypto: cache.crypto || {},
                    fiat: cache.fiat || {},
                    localCurrency: userCurrency,
                    cacheInfo: cache,
                    source: 'DEGRADED'
                });
                renderTicker(tickerTrack, cache.crypto, cache.fiat, userCurrency, cache);
                if (tickerState.lastState !== 'DEGRADED') {
                    console.log('[AGRO_MARKET] \u26a0\ufe0f Usando cache (sin datos frescos)');
                    tickerState.lastState = 'DEGRADED';
                }
            } else {
                tickerState.snapshot = null;
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
            updateMarketSnapshot({
                crypto: cache.crypto || {},
                fiat: cache.fiat || {},
                localCurrency: userCurrency,
                cacheInfo: cache,
                source: 'DEGRADED'
            });
            renderTicker(tickerTrack, cache.crypto, cache.fiat, userCurrency, cache);
            if (tickerState.lastState !== 'DEGRADED') {
                console.log('[AGRO_MARKET] \u{1f4e6} Fallback a cache');
                tickerState.lastState = 'DEGRADED';
            }
        } else {
            tickerState.snapshot = null;
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
    bindMarketLocationSync();
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
