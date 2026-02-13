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

function setCachedRates(rates) {
    try {
        localStorage.setItem(LS_RATES_KEY, JSON.stringify({
            rates,
            fetchedAt: Date.now()
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
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=COP');
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const data = await res.json();
    // Frankfurter may not support VES
    return {
        USD: 1,
        COP: data.rates?.COP || null,
        VES: null // Frankfurter typically doesn't have VES
    };
}

async function fetchFromErApi() {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`ER-API ${res.status}`);
    const data = await res.json();
    return {
        USD: 1,
        COP: data.rates?.COP || null,
        VES: data.rates?.VES || null
    };
}

/**
 * Fetch exchange rates from APIs with fallback chain.
 * Returns { USD: 1, COP: number|null, VES: number|null }
 */
export async function fetchExchangeRates() {
    // Try primary API
    try {
        const rates = await fetchFromFrankfurter();
        // If VES missing, try fallback for VES only
        if (!rates.VES) {
            try {
                const fallback = await fetchFromErApi();
                rates.VES = fallback.VES || null;
            } catch (e) {
                // VES stays null — user can set manually
            }
        }
        setCachedRates(rates);
        return rates;
    } catch (e) {
        console.warn('[EXCHANGE] Frankfurter failed:', e.message);
    }

    // Try fallback API
    try {
        const rates = await fetchFromErApi();
        setCachedRates(rates);
        return rates;
    } catch (e) {
        console.warn('[EXCHANGE] ER-API failed:', e.message);
    }

    // Use stale cache
    const cached = getCachedRates();
    if (cached?.rates) {
        console.info('[EXCHANGE] Using stale cache');
        return cached.rates;
    }

    // No data at all
    console.warn('[EXCHANGE] No rates available');
    return { USD: 1, COP: null, VES: null };
}

/**
 * Get the effective rate for a currency.
 * Priority: manual override > cached/fetched rate
 */
export function getRate(currency, rates) {
    if (currency === 'USD') return 1;

    // Check manual override first
    const overrides = getOverrides();
    if (overrides?.[currency]?.rate) {
        return overrides[currency].rate;
    }

    // Use provided rates
    if (rates?.[currency]) return rates[currency];

    // Fallback to cached
    const cached = getCachedRates();
    if (cached?.rates?.[currency]) return cached.rates[currency];

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
    if (isCacheFresh(cached)) {
        console.info('[EXCHANGE] Using fresh cache');
        return cached.rates;
    }
    return fetchExchangeRates();
}

/**
 * Check if a currency has a manual override active.
 */
export function hasOverride(currency) {
    const overrides = getOverrides();
    return !!(overrides?.[currency]?.rate);
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
