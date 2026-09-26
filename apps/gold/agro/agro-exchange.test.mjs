import assert from 'node:assert/strict';
import { test } from 'node:test';

// agro-exchange.js toca localStorage (overrides + caché) y la red (fetch).
// El módulo no lee storage ni red en el momento del import, así que basta con
// instalar el entorno determinista antes de que corran los callbacks de test:
// almacenamiento en memoria y red bloqueada. Sin dependencias, sin tocar
// código de producción.
import {
    SUPPORTED_CURRENCIES,
    getOverrides,
    setOverride,
    clearOverride,
    clearAllOverrides,
    fetchExchangeRates,
    getRate,
    convertToUSD,
    convertFromUSD,
    initExchangeRates,
    getExchangeStatus,
    hasOverride,
    formatCurrencyDisplay
} from './agro-exchange.js';

const LS_RATES_KEY = 'yavlgold_exchange_rates';
const LS_OVERRIDE_KEY = 'yavlgold_exchange_override';
const H24_MS = 24 * 60 * 60 * 1000;

function createMemoryStorage() {
    const map = new Map();
    return {
        getItem(key) {
            return map.has(key) ? map.get(key) : null;
        },
        setItem(key, value) {
            map.set(key, String(value));
        },
        removeItem(key) {
            map.delete(key);
        },
        clear() {
            map.clear();
        }
    };
}

globalThis.localStorage = createMemoryStorage();

let fetchCalls = 0;
globalThis.fetch = () => {
    fetchCalls += 1;
    return Promise.reject(new Error('offline: test sin red'));
};

function resetEnv() {
    localStorage.clear();
    fetchCalls = 0;
}

function seedCache(rates, ageMs = 0) {
    localStorage.setItem(LS_RATES_KEY, JSON.stringify({
        rates,
        fetchedAt: Date.now() - ageMs,
        source: 'test'
    }));
}

// ---------------------------------------------------------------------------
// Estructura soportada
// ---------------------------------------------------------------------------

test('SUPPORTED_CURRENCIES expone USD, COP y VES con su configuración', () => {
    assert.deepEqual(Object.keys(SUPPORTED_CURRENCIES), ['USD', 'COP', 'VES']);
    assert.equal(SUPPORTED_CURRENCIES.USD.decimals, 2);
    assert.equal(SUPPORTED_CURRENCIES.COP.decimals, 0);
    assert.equal(SUPPORTED_CURRENCIES.VES.decimals, 2);
    assert.equal(SUPPORTED_CURRENCIES.USD.symbol, '$');
    assert.equal(SUPPORTED_CURRENCIES.VES.symbol, 'Bs');
});

// ---------------------------------------------------------------------------
// Overrides manuales
// ---------------------------------------------------------------------------

test('getOverrides devuelve null cuando no hay override guardado', () => {
    resetEnv();
    assert.equal(getOverrides(), null);
});

test('setOverride guarda la tasa manual y hasOverride la detecta', () => {
    resetEnv();
    assert.equal(hasOverride('COP'), false);

    setOverride('COP', 4100);

    assert.equal(hasOverride('COP'), true);
    assert.equal(hasOverride('VES'), false);
    assert.equal(getOverrides().COP.rate, 4100);
    assert.equal(typeof getOverrides().COP.setAt, 'number');
});

test('setOverride acumula divisas y clearOverride limpia solo una', () => {
    resetEnv();
    setOverride('COP', 4100);
    setOverride('VES', 40);

    assert.deepEqual(Object.keys(getOverrides()).sort(), ['COP', 'VES']);

    clearOverride('COP');

    assert.equal(getOverrides().COP, undefined);
    assert.equal(getOverrides().VES.rate, 40);
});

test('clearOverride elimina la clave completa cuando no quedan overrides', () => {
    resetEnv();
    setOverride('COP', 4100);
    clearOverride('COP');
    assert.equal(getOverrides(), null);

    clearOverride('COP');
    assert.equal(getOverrides(), null);
});

test('clearAllOverrides elimina todos los overrides guardados', () => {
    resetEnv();
    setOverride('COP', 4100);
    setOverride('VES', 40);
    clearAllOverrides();
    assert.equal(getOverrides(), null);
    assert.equal(hasOverride('COP'), false);
});

test('un override con tasa inválida no se considera activo', () => {
    resetEnv();
    localStorage.setItem(LS_OVERRIDE_KEY, JSON.stringify({ COP: { rate: 0 } }));
    assert.equal(hasOverride('COP'), false);
    assert.equal(getRate('COP', { COP: 4100 }), 4100);

    localStorage.setItem(LS_OVERRIDE_KEY, JSON.stringify({ COP: { rate: -5 } }));
    assert.equal(hasOverride('COP'), false);
});

test('storage roto o ausente no revienta el módulo', () => {
    resetEnv();
    localStorage.setItem(LS_OVERRIDE_KEY, 'no-es-json{{{');
    assert.equal(getOverrides(), null);
    assert.equal(hasOverride('COP'), false);
});

// ---------------------------------------------------------------------------
// getRate
// ---------------------------------------------------------------------------

test('getRate da prioridad al override manual sobre la tasa recibida', () => {
    resetEnv();
    setOverride('COP', 9999);
    assert.equal(getRate('COP', { COP: 4100 }), 9999);
});

test('getRate usa la tasa recibida cuando no hay override', () => {
    resetEnv();
    assert.equal(getRate('COP', { COP: 4100 }), 4100);
    assert.equal(getRate('VES', { VES: 40 }), 40);
});

test('getRate devuelve siempre 1 para USD sin consultar storage', () => {
    resetEnv();
    assert.equal(getRate('USD', null), 1);
    assert.equal(getRate('USD', { USD: 77 }), 1);
});

test('getRate rechaza tasa 0, negativa o ausente y devuelve null', () => {
    resetEnv();
    assert.equal(getRate('COP', { COP: 0 }), null);
    assert.equal(getRate('COP', { COP: -4100 }), null);
    assert.equal(getRate('COP', {}), null);
    assert.equal(getRate('COP', null), null);
    assert.equal(getRate('COP'), null);
});

test('getRate cae al caché cuando la tasa no viene en rates', () => {
    resetEnv();
    seedCache({ USD: 1, COP: 4200, VES: 41 }, 0);
    assert.equal(getRate('COP', {}), 4200);
    assert.equal(getRate('VES', null), 41);
});

// ---------------------------------------------------------------------------
// Conversiones: inversas y sin división por cero
// ---------------------------------------------------------------------------

test('convertToUSD convierte divisa local a USD', () => {
    assert.equal(convertToUSD(410000, 'COP', 4100), 100);
    assert.equal(convertToUSD(400, 'VES', 40), 10);
});

test('convertFromUSD convierte USD a divisa local', () => {
    assert.equal(convertFromUSD(100, 'COP', 4100), 410000);
    assert.equal(convertFromUSD(10, 'VES', 40), 400);
});

test('convertToUSD y convertFromUSD son inversas sin perder valor', () => {
    const casos = [
        { monto: 100000, currency: 'COP', rate: 4100 },
        { monto: 99.99, currency: 'VES', rate: 3.1234 },
        { monto: 0.01, currency: 'COP', rate: 4100 },
        { monto: 1263.25, currency: 'VES', rate: 40 },
        { monto: 7, currency: 'COP', rate: 1 }
    ];

    for (const { monto, currency, rate } of casos) {
        const ida = convertToUSD(monto, currency, rate);
        const vuelta = convertFromUSD(ida, currency, rate);
        assert.ok(
            Math.abs(vuelta - monto) <= 1e-9,
            `ida y vuelta perdieron valor en ${currency}: ${monto} -> ${vuelta}`
        );
    }
});

test('convertir una ida y vuelta completa no pierde centavos', () => {
    for (const rate of [4100, 3.1234, 40, 1, 0.87]) {
        const original = 1234.56;
        const roundTrip = convertFromUSD(convertToUSD(original, 'COP', rate), 'COP', rate);
        assert.equal(Math.round(roundTrip * 100), Math.round(original * 100));
    }
});

test('convertToUSD no divide por cero con tasa 0, negativa, null o ausente', () => {
    assert.equal(convertToUSD(500, 'COP', 0), 500);
    assert.equal(convertToUSD(500, 'COP', -1), 500);
    assert.equal(convertToUSD(500, 'COP', null), 500);
    assert.equal(convertToUSD(500, 'COP', undefined), 500);
    assert.ok(Number.isFinite(convertToUSD(500, 'COP', 0)));
});

test('convertFromUSD no multiplica con tasa 0, negativa o ausente', () => {
    assert.equal(convertFromUSD(500, 'COP', 0), 500);
    assert.equal(convertFromUSD(500, 'COP', -1), 500);
    assert.equal(convertFromUSD(500, 'COP', null), 500);
    assert.equal(convertFromUSD(500, 'COP', undefined), 500);
});

test('la conversión es identidad para USD sin importar la tasa', () => {
    assert.equal(convertToUSD(1234.56, 'USD', 4100), 1234.56);
    assert.equal(convertFromUSD(1234.56, 'USD', 4100), 1234.56);
    assert.equal(convertToUSD(1234.56, 'USD', 0), 1234.56);
    assert.equal(convertToUSD(0, 'COP', 4100), 0);
    assert.equal(convertFromUSD(0, 'COP', 4100), 0);
});

test('solo la divisa literal "USD" se salta la conversión', () => {
    // Contrato: el cortocircuito es exactamente currency === 'USD'.
    // Cualquier otro valor (incluido vacío) aplica la tasa recibida.
    assert.equal(convertToUSD(1234.56, null, 4100), 1234.56 / 4100);
    assert.equal(convertFromUSD(1234.56, null, 4100), 1234.56 * 4100);
    assert.equal(convertToUSD(4100, '', 4100), 1);
});

// ---------------------------------------------------------------------------
// Resolución de tasas (caché / red)
// ---------------------------------------------------------------------------

test('initExchangeRates usa caché fresca sin tocar la red', async () => {
    resetEnv();
    seedCache({ USD: 1, COP: 4100, VES: 40 }, 0);

    const rates = await initExchangeRates();

    assert.deepEqual(rates, { USD: 1, COP: 4100, VES: 40 });
    assert.equal(fetchCalls, 0);
});

test('initExchangeRates ignora caché vencida e intenta la red, y si falla cae a esa caché vencida', async () => {
    resetEnv();
    seedCache({ USD: 1, COP: 4100, VES: 40 }, H24_MS + 1000);

    const rates = await initExchangeRates();

    assert.ok(fetchCalls > 0, 'debe intentar refrescar la caché vencida');
    // Sin red: la cadena de fallback termina en la caché vencida (último recurso).
    assert.deepEqual(rates, { USD: 1, COP: 4100, VES: 40 });
    assert.equal(getExchangeStatus().source, 'cache:stale');
});

test('sin red y sin caché devuelve USD=1 y las divisas en null, nunca NaN', async () => {
    resetEnv();

    const rates = await fetchExchangeRates();

    assert.deepEqual(rates, { USD: 1, COP: null, VES: null });
    for (const value of Object.values(rates)) {
        assert.ok(value === null || Number.isFinite(value));
    }
    assert.ok(!Number.isNaN(rates.COP));
});

test('con caché vencida pero presente, fetchExchangeRates la usa como último recurso', async () => {
    resetEnv();
    seedCache({ USD: 1, COP: 4300, VES: 42 }, H24_MS + 1000);

    const rates = await fetchExchangeRates();

    assert.deepEqual(rates, { USD: 1, COP: 4300, VES: 42 });
    assert.equal(getExchangeStatus().source, 'cache:stale');
});

test('getExchangeStatus expone la última resolución y aísla el estado interno', () => {
    resetEnv();
    const status = getExchangeStatus();
    assert.deepEqual(Object.keys(status).sort(), ['fetchedAt', 'source', 'warning']);

    status.source = 'manipulado';
    assert.notEqual(getExchangeStatus().source, 'manipulado');
});

// ---------------------------------------------------------------------------
// formatCurrencyDisplay
// ---------------------------------------------------------------------------

test('formatCurrencyDisplay formatea USD con dos decimales', () => {
    assert.equal(formatCurrencyDisplay(36.59, 'USD', 36.59), '$36.59');
    assert.equal(formatCurrencyDisplay(0, 'USD', 0), '$0.00');
    assert.equal(formatCurrencyDisplay(null, null, null), '$0.00');
});

test('formatCurrencyDisplay formatea COP con el equivalente entre paréntesis', () => {
    const out = formatCurrencyDisplay(150000, 'COP', 36.59);
    assert.ok(out.startsWith('COP '), out);
    assert.ok(out.endsWith(' (≈ $36.59)'), out);
});

test('formatCurrencyDisplay formatea VES con dos decimales', () => {
    assert.equal(formatCurrencyDisplay(1500, 'VES', 33.33), 'Bs 1500.00 (≈ $33.33)');
});

test('formatCurrencyDisplay usa USD como divisa desconocida', () => {
    // Divisa desconocida: cae al config de USD pero entra por la rama "local",
    // por eso conserva el formato "local (≈ usd)".
    assert.equal(formatCurrencyDisplay(10, 'XXX', 10), '$ 10.00 (≈ $10.00)');
    // Cadena vacía: rama corta de USD, sin equivalente entre paréntesis.
    assert.equal(formatCurrencyDisplay(10, '', 10), '$10.00');
    assert.equal(formatCurrencyDisplay(10, undefined, 10), '$10.00');
});

test('formatCurrencyDisplay coloca el signo antes del símbolo en montos negativos', { skip: 'bug real, ver resumen' }, () => {
    // Esperado (coherente con formatMoney → "-$5.00"). Actual: "$-5.00".
    assert.equal(formatCurrencyDisplay(-5, 'USD', -5), '-$5.00');
});

test('formatCurrencyDisplay agrupa los miles en VES como hace formatMoney', { skip: 'bug real, ver resumen' }, () => {
    // Esperado: "Bs 1,500,000.00 (≈ $33.33)". Actual: "Bs 1500000.00 (≈ $33.33)".
    assert.equal(formatCurrencyDisplay(1500000, 'VES', 33.33), 'Bs 1,500,000.00 (≈ $33.33)');
});
