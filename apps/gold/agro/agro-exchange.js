/**
 * YavlGold V9.8 — Agro Exchange Rate Service
 * Multi-currency support: USD (base), COP, VES
 *
 * Priority: Manual override > API cache > API fetch > Stale cache
 * Cache TTL: 24 hours (zona rural)
 */

const LS_RATES_KEY = 'yavlgold_exchange_rates';
const LS_OVERRIDE_KEY = 'yavlgold_exchange_override';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const EXCHANGE_FETCH_TIMEOUT_MS = 10000;
const RATE_FIELDS = ['COP', 'VES'];

let lastExchangeStatus = {
    source: 'unknown',
    warning: '',
    fetchedAt: null
};

export const SUPPORTED_CURRENCIES = {
    USD: { symbol: '$', name: 'Dólar', flag: '💵', decimals: 2 },
    COP: { symbol: 'COP', name: 'Peso colombiano', flag: '🇨🇴', decimals: 0 },
    VES: { symbol: 'Bs', name: 'Bolívar', flag: '🇻🇪', decimals: 2 },
};

// ============================================================
// CACHE (localStorage)
// ============================================================

function getCachedRates() {
    try {
        const raw = localStorage.getItem(LS_RATES_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.rates) return null;
        return parsed;
    } catch (e) {
        return null;
    }
}

function setCachedRates(rates, source = 'unknown') {
    try {
        localStorage.setItem(LS_RATES_KEY, JSON.stringify({
            rates,
            fetchedAt: Date.now(),
            source
        }));
    } catch (e) {
        // storage full or blocked
    }
}

function isCacheFresh(cached) {
    if (!cached || !cached.fetchedAt) return false;
    return (Date.now() - cached.fetchedAt) < CACHE_TTL_MS;
}

// ============================================================
// MANUAL OVERRIDE
// ============================================================

export function getOverrides() {
    try {
        const raw = localStorage.getItem(LS_OVERRIDE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

export function setOverride(currency, rate) {
    try {
        const overrides = getOverrides() || {};
        overrides[currency] = { rate: Number(rate), setAt: Date.now() };
        localStorage.setItem(LS_OVERRIDE_KEY, JSON.stringify(overrides));
    } catch (e) {
        // ignore
    }
}

export function clearOverride(currency) {
    try {
        const overrides = getOverrides() || {};
        delete overrides[currency];
        if (Object.keys(overrides).length === 0) {
            localStorage.removeItem(LS_OVERRIDE_KEY);
        } else {
            localStorage.setItem(LS_OVERRIDE_KEY, JSON.stringify(overrides));
        }
    } catch (e) {
        // ignore
    }
}

export function clearAllOverrides() {
    try {
        localStorage.removeItem(LS_OVERRIDE_KEY);
    } catch (e) {
        // ignore
    }
}

// ============================================================
// API FETCH
// ============================================================

async function fetchFromFrankfurter() {
    const res = await fetchWithTimeout('https://api.frankfurter.app/latest?from=USD&to=COP,VES');
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const data = await res.json();
    return normalizeRates(data?.rates);
}

async function fetchFromErApi() {
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`ER-API ${res.status}`);
    const data = await res.json();
    if (data?.result && data.result !== 'success') {
        throw new Error(`ER-API result ${data.result}`);
    }
    return normalizeRates(data?.rates);
}

async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EXCHANGE_FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function toValidRate(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeRates(rawRates = null) {
    return {
        USD: 1,
        COP: toValidRate(rawRates?.COP),
        VES: toValidRate(rawRates?.VES)
    };
}

function mergeMissingRates(primary, fallback) {
    const merged = normalizeRates(primary);
    RATE_FIELDS.forEach((field) => {
        if (!toValidRate(merged[field])) {
            merged[field] = toValidRate(fallback?.[field]);
        }
    });
    return merged;
}

function hasMissingRates(rates) {
    return RATE_FIELDS.some((field) => !toValidRate(rates?.[field]));
}

function setExchangeStatus(source, warning = '', fetchedAt = null) {
    lastExchangeStatus = {
        source: String(source || 'unknown'),
        warning: String(warning || ''),
        fetchedAt: Number.isFinite(fetchedAt) ? fetchedAt : null
    };
}

function readFreshCache(cached) {
    if (!cached?.rates || !isCacheFresh(cached)) return null;
    setExchangeStatus('cache:fresh', '', cached.fetchedAt || null);
    return normalizeRates(cached.rates);
}

function readStaleCache(cached) {
    if (!cached?.rates) return null;
    const warning = 'tasa en caché (proveedores no disponibles)';
    setExchangeStatus('cache:stale', warning, cached.fetchedAt || null);
    console.warn(`[EXCHANGE] ${warning}`);
    return normalizeRates(cached.rates);
}

/**
 * Fetch exchange rates from APIs with fallback chain.
 * Returns { USD: 1, COP: number|null, VES: number|null }
 */
export async function fetchExchangeRates() {
    // Try primary API
    try {
        let rates = await fetchFromFrankfurter();
        let source = 'api:frankfurter';
        // Complete any missing rates from fallback provider
        if (hasMissingRates(rates)) {
            try {
                const fallback = await fetchFromErApi();
                rates = mergeMissingRates(rates, fallback);
                source = 'api:frankfurter+erapi';
            } catch (e) {
                // Keep available rates from provider 1
                console.warn('[EXCHANGE] ER-API complement failed:', e.message);
            }
        }
        rates = normalizeRates(rates);
        setCachedRates(rates, source);
        setExchangeStatus(source, '');
        return rates;
    } catch (e) {
        console.warn('[EXCHANGE] Frankfurter failed:', e.message);
    }

    // Try fallback API
    try {
        const rates = normalizeRates(await fetchFromErApi());
        setCachedRates(rates, 'api:erapi');
        setExchangeStatus('api:erapi', '');
        return rates;
    } catch (e) {
        console.warn('[EXCHANGE] ER-API failed:', e.message);
    }

    // Use stale cache
    const cached = getCachedRates();
    const staleRates = readStaleCache(cached);
    if (staleRates) {
        return staleRates;
    }

    // No data at all
    const warning = 'sin tasas disponibles; continuar con override manual o USD';
    setExchangeStatus('fallback:none', warning);
    console.warn('[EXCHANGE] No rates available');
    return normalizeRates(null);
}

/**
 * Get the effective rate for a currency.
 * Priority: manual override > cached/fetched rate
 */
export function getRate(currency, rates) {
    if (currency === 'USD') return 1;

    // Check manual override first
    const overrides = getOverrides();
    if (toValidRate(overrides?.[currency]?.rate)) {
        return overrides[currency].rate;
    }

    // Use provided rates
    if (toValidRate(rates?.[currency])) return rates[currency];

    // Fallback to cached
    const cached = getCachedRates();
    if (toValidRate(cached?.rates?.[currency])) return cached.rates[currency];

    return null;
}

/**
 * Convert local currency amount to USD.
 */
export function convertToUSD(monto, currency, rate) {
    if (currency === 'USD' || !rate || rate <= 0) return monto;
    return monto / rate;
}

/**
 * Convert USD amount to local currency.
 */
export function convertFromUSD(montoUsd, currency, rate) {
    if (currency === 'USD' || !rate || rate <= 0) return montoUsd;
    return montoUsd * rate;
}

/**
 * Initialize rates: use cache if fresh, else fetch.
 * Safe to call on page load.
 */
export async function initExchangeRates() {
    const cached = getCachedRates();
    const freshRates = readFreshCache(cached);
    if (freshRates) {
        console.info('[EXCHANGE] Using fresh cache');
        return freshRates;
    }
    return fetchExchangeRates();
}

/**
 * Returns metadata of the last exchange resolution.
 * Useful for UX warnings like "tasa en caché".
 */
export function getExchangeStatus() {
    return { ...lastExchangeStatus };
}

/**
 * Check if a currency has a manual override active.
 */
export function hasOverride(currency) {
    const overrides = getOverrides();
    return !!toValidRate(overrides?.[currency]?.rate);
}

/**
 * Format currency display for history items.
 * USD: "$36.59"
 * COP: "COP 150,000 (≈ $36.59)"
 * VES: "Bs 1,500.00 (≈ $33.33)"
 */
export function formatCurrencyDisplay(monto, currency, montoUsd) {
    const cfg = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
    if (!currency || currency === 'USD') {
        return `$${Number(monto || 0).toFixed(2)}`;
    }
    const localFormatted = cfg.decimals === 0
        ? `${cfg.symbol} ${Math.round(monto).toLocaleString()}`
        : `${cfg.symbol} ${Number(monto).toFixed(cfg.decimals)}`;
    const usdFormatted = `$${Number(montoUsd || 0).toFixed(2)}`;
    return `${localFormatted} (≈ ${usdFormatted})`;
}
