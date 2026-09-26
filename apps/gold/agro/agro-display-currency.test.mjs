import assert from 'node:assert/strict';
import { test } from 'node:test';

import { setOverride, clearAllOverrides, getRate } from './agro-exchange.js';

// agro-display-currency.js lee window.localStorage EN el top-level del módulo
// (let currentCurrency = readStoredCurrency()), así que el entorno debe existir
// ANTES de que el módulo se evalúe: por eso el import es dinámico. También
// instanciamos window apuntando al mismo almacén en memoria que localStorage
// global, para que agro-exchange (que usa el global) y el display compartan
// estado sin tocar el storage real del sistema.
const store = new Map();
const memoryStorage = {
    getItem(key) {
        return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
        store.set(key, String(value));
    },
    removeItem(key) {
        store.delete(key);
    },
    clear() {
        store.clear();
    }
};

globalThis.localStorage = memoryStorage;
globalThis.window = { localStorage: memoryStorage };

let fetchCalls = 0;
globalThis.fetch = () => {
    fetchCalls += 1;
    return Promise.reject(new Error('offline: test sin red'));
};

const DISPLAY_STORAGE_KEY = 'yavlgold_agro_cycle_display_currency';
const RATES_STORAGE_KEY = 'yavlgold_exchange_rates';

// Sembramos la divisa guardada antes del import para probar que el módulo
// restaura el estado desde storage al cargar.
memoryStorage.setItem(DISPLAY_STORAGE_KEY, 'COP');

const display = await import('./agro-display-currency.js');

const {
    normalizeCycleDisplayCurrency,
    getCycleDisplayCurrency,
    getCycleDisplayCurrencyLabel,
    getNextCycleDisplayCurrency,
    getNextCycleDisplayCurrencyLabel,
    initCycleDisplayCurrency,
    rotateCycleDisplayCurrency,
    formatCycleDisplayMoneyFromUsd,
    formatSignedCycleDisplayMoneyFromUsd
} = display;

function seedFreshRates(rates) {
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify({
        rates,
        fetchedAt: Date.now(),
        source: 'test'
    }));
}

// El formateo USD pasa por Intl con estilo currency y emite un espacio no
// break (U+00A0). Normalizamos para comparar sin depender de ese detalle ICU.
function normalize(text) {
    return String(text).replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Estado inicial y normalización
// ---------------------------------------------------------------------------

test('la divisa inicial se restaura desde el storage al cargar el módulo', () => {
    assert.equal(getCycleDisplayCurrency(), 'COP');
});

test('normalizeCycleDisplayCurrency resuelve variantes y basura a una divisa válida', () => {
    assert.equal(normalizeCycleDisplayCurrency('COP'), 'COP');
    assert.equal(normalizeCycleDisplayCurrency('cop'), 'COP');
    assert.equal(normalizeCycleDisplayCurrency('  cop  '), 'COP');
    assert.equal(normalizeCycleDisplayCurrency('VES'), 'VES');
    assert.equal(normalizeCycleDisplayCurrency('bs'), 'VES');
    assert.equal(normalizeCycleDisplayCurrency('BS'), 'VES');
    assert.equal(normalizeCycleDisplayCurrency('USD'), 'USD');
    assert.equal(normalizeCycleDisplayCurrency('usd'), 'USD');
    assert.equal(normalizeCycleDisplayCurrency(''), 'USD');
    assert.equal(normalizeCycleDisplayCurrency(null), 'USD');
    assert.equal(normalizeCycleDisplayCurrency(undefined), 'USD');
    assert.equal(normalizeCycleDisplayCurrency('EUR'), 'USD');
    assert.equal(normalizeCycleDisplayCurrency(42), 'USD');
});

test('getCycleDisplayCurrencyLabel expone las etiquetas de cada divisa', () => {
    assert.equal(getCycleDisplayCurrencyLabel('USD'), 'USD');
    assert.equal(getCycleDisplayCurrencyLabel('COP'), 'COP');
    assert.equal(getCycleDisplayCurrencyLabel('VES'), 'BS');
    assert.equal(getCycleDisplayCurrencyLabel('ves'), 'BS');
    assert.equal(getCycleDisplayCurrencyLabel('EUR'), 'USD');
    assert.equal(getCycleDisplayCurrencyLabel(), 'COP', 'sin argumento usa la divisa actual');
});

test('getNextCycleDisplayCurrency rota en orden USD → COP → VES → USD', () => {
    assert.equal(getNextCycleDisplayCurrency('USD'), 'COP');
    assert.equal(getNextCycleDisplayCurrency('COP'), 'VES');
    assert.equal(getNextCycleDisplayCurrency('VES'), 'USD');
    assert.equal(getNextCycleDisplayCurrency('EUR'), 'COP', 'normaliza antes de rotar');
    assert.equal(getNextCycleDisplayCurrency(), 'VES', 'sin argumento parte de la divisa actual');
    assert.equal(getNextCycleDisplayCurrencyLabel('USD'), 'COP');
    assert.equal(getNextCycleDisplayCurrencyLabel('VES'), 'USD');
});

// ---------------------------------------------------------------------------
// formatCycleDisplayMoneyFromUsd
// ---------------------------------------------------------------------------

test('formatCycleDisplayMoneyFromUsd en USD redondea a enteros', () => {
    assert.equal(normalize(formatCycleDisplayMoneyFromUsd(36.59, { currency: 'USD' })), 'USD 37');
    assert.equal(normalize(formatCycleDisplayMoneyFromUsd(0, { currency: 'USD' })), 'USD 0');
    assert.equal(normalize(formatCycleDisplayMoneyFromUsd(1500, { currency: 'USD' })), 'USD 1.500');
    assert.equal(normalize(formatCycleDisplayMoneyFromUsd(-40.7, { currency: 'USD' })), 'USD 41');
});

test('formatCycleDisplayMoneyFromUsd devuelve N/D ante monto no numérico o sin tasa', () => {
    clearAllOverrides();
    localStorage.removeItem(RATES_STORAGE_KEY);

    assert.equal(formatCycleDisplayMoneyFromUsd('abc', { currency: 'USD' }), 'N/D USD');
    assert.equal(formatCycleDisplayMoneyFromUsd(undefined, { currency: 'USD' }), 'N/D USD');
    assert.equal(formatCycleDisplayMoneyFromUsd(null, { currency: 'COP' }), 'N/D COP');
    assert.equal(formatCycleDisplayMoneyFromUsd(36.59, { currency: 'COP' }), 'N/D COP');
    assert.equal(formatCycleDisplayMoneyFromUsd(36.59, { currency: 'VES' }), 'N/D BS');
});

test('formatCycleDisplayMoneyFromUsd trata null como 0 en USD (convención de la casa)', () => {
    assert.equal(normalize(formatCycleDisplayMoneyFromUsd(null, { currency: 'USD' })), 'USD 0');
});

test('formatCycleDisplayMoneyFromUsd convierte a COP con la tasa efectiva', () => {
    setOverride('COP', 4100);

    assert.equal(
        formatCycleDisplayMoneyFromUsd(36.59, { currency: 'COP' }),
        'COP 150.019'
    );
    assert.equal(
        formatCycleDisplayMoneyFromUsd(100, { currency: 'COP' }),
        'COP 410.000'
    );
    assert.equal(
        normalize(formatCycleDisplayMoneyFromUsd(36.59, { currency: 'COP' })),
        'COP 150.019'
    );
});

test('formatCycleDisplayMoneyFromUsd convierte a VES con la tasa efectiva', () => {
    setOverride('VES', 40);

    assert.equal(
        formatCycleDisplayMoneyFromUsd(10, { currency: 'VES' }),
        'Bs 400,00'
    );
    assert.equal(
        formatCycleDisplayMoneyFromUsd(12.5, { currency: 'VES' }),
        'Bs 500,00'
    );
});

test('formatCycleDisplayMoneyFromUsd usa la divisa actual si no viene en options', () => {
    clearAllOverrides();
    localStorage.removeItem(RATES_STORAGE_KEY);
    // currentCurrency es 'COP' (sembrada en storage) y no hay tasa => N/D COP.
    assert.equal(formatCycleDisplayMoneyFromUsd(36.59), 'N/D COP');
});

// ---------------------------------------------------------------------------
// formatSignedCycleDisplayMoneyFromUsd
// ---------------------------------------------------------------------------

test('formatSignedCycleDisplayMoneyFromUsd siempre lleva signo explícito', () => {
    setOverride('VES', 40);
    setOverride('COP', 4100);

    assert.equal(formatSignedCycleDisplayMoneyFromUsd(10, { currency: 'VES' }), '+Bs 400,00');
    assert.equal(formatSignedCycleDisplayMoneyFromUsd(-10, { currency: 'VES' }), '-Bs 400,00');
    assert.equal(formatSignedCycleDisplayMoneyFromUsd(36.59, { currency: 'COP' }), '+COP 150.019');
    assert.equal(formatSignedCycleDisplayMoneyFromUsd(-36.59, { currency: 'COP' }), '-COP 150.019');
    assert.equal(
        normalize(formatSignedCycleDisplayMoneyFromUsd(-40.7, { currency: 'USD' })),
        '-USD 41'
    );
});

test('formatSignedCycleDisplayMoneyFromUsd devuelve N/D cuando no hay monto o tasa', () => {
    clearAllOverrides();
    localStorage.removeItem(RATES_STORAGE_KEY);

    assert.equal(formatSignedCycleDisplayMoneyFromUsd('abc', { currency: 'USD' }), 'N/D USD');
    assert.equal(formatSignedCycleDisplayMoneyFromUsd(null, { currency: 'COP' }), 'N/D COP');
    assert.equal(formatSignedCycleDisplayMoneyFromUsd(10, { currency: 'VES' }), 'N/D BS');
});

// ---------------------------------------------------------------------------
// initCycleDisplayCurrency
// ---------------------------------------------------------------------------

test('initCycleDisplayCurrency resuelve con caché fresca y devuelve siempre la misma promesa', async () => {
    clearAllOverrides();
    seedFreshRates({ USD: 1, COP: 4100, VES: 40 });
    const before = fetchCalls;

    const first = initCycleDisplayCurrency();
    const second = initCycleDisplayCurrency();

    assert.equal(first, second, 'la inicialización debe ser un singleton');

    const rates = await first;

    assert.deepEqual(rates, { USD: 1, COP: 4100, VES: 40 });
    assert.equal(fetchCalls, before, 'con caché fresca no debe tocar la red');
});

test('la tasa cacheada por init alimenta el formateo de COP sin overrides', async () => {
    await initCycleDisplayCurrency();

    assert.equal(getRate('COP', null), 4100);
    assert.equal(
        formatCycleDisplayMoneyFromUsd(10, { currency: 'COP' }),
        'COP 41.000'
    );
});

// ---------------------------------------------------------------------------
// rotateCycleDisplayCurrency
// ---------------------------------------------------------------------------

test('rotateCycleDisplayCurrency rota, persiste y cierra el ciclo', () => {
    assert.equal(getCycleDisplayCurrency(), 'COP', 'estado de partida');

    assert.equal(rotateCycleDisplayCurrency(), 'VES');
    assert.equal(getCycleDisplayCurrency(), 'VES');
    assert.equal(localStorage.getItem(DISPLAY_STORAGE_KEY), 'VES');

    assert.equal(rotateCycleDisplayCurrency(), 'USD');
    assert.equal(getCycleDisplayCurrency(), 'USD');
    assert.equal(localStorage.getItem(DISPLAY_STORAGE_KEY), 'USD');

    assert.equal(rotateCycleDisplayCurrency(), 'COP');
    assert.equal(getCycleDisplayCurrency(), 'COP');
    assert.equal(localStorage.getItem(DISPLAY_STORAGE_KEY), 'COP');
});
