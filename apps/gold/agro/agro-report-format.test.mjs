import assert from 'node:assert/strict';
import { test } from 'node:test';

// agro-report-format.js depende de agro-privacy (localStorage) y de
// agro-buyer-identity. En Node no hay localStorage real: instalamos un
// almacenamiento en memoria antes de que corra ningún test. El import es
// estático y se resuelve antes del cuerpo del módulo, pero agro-privacy solo
// toca storage dentro de funciones, así que basta con definirlo aquí arriba.
const store = new Map();
globalThis.localStorage = {
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

import {
    getMarkdownPrivacyState,
    normalizeReportClientKey,
    chooseReportClientName,
    maskReportName,
    maskReportMoney,
    maskReportMetric,
    normalizeReportClientName,
    sanitizeCropDisplayName,
    resolvePendingTransferDestination
} from './agro-report-format.js';

const BUYER_KEY = 'YG_HIDE_BUYER_NAMES';
const MONEY_KEY = 'YG_HIDE_MONEY_VALUES';
const LEGACY_KEY = 'YG_AGRO_RANKINGS_PRIVACY_V1';
const MASK = '••••';

function setPrivacy({ buyers = false, money = false } = {}) {
    localStorage.setItem(BUYER_KEY, buyers ? '1' : '0');
    localStorage.setItem(MONEY_KEY, money ? '1' : '0');
    localStorage.removeItem(LEGACY_KEY);
}

// ---------------------------------------------------------------------------
// getMarkdownPrivacyState
// ---------------------------------------------------------------------------

test('getMarkdownPrivacyState lee ambos flags desde el storage', () => {
    setPrivacy({ buyers: true, money: true });
    assert.deepEqual(getMarkdownPrivacyState(), { hideBuyerNames: true, hideMoneyValues: true });

    setPrivacy({ buyers: false, money: true });
    assert.deepEqual(getMarkdownPrivacyState(), { hideBuyerNames: false, hideMoneyValues: true });

    setPrivacy({ buyers: true, money: false });
    assert.deepEqual(getMarkdownPrivacyState(), { hideBuyerNames: true, hideMoneyValues: false });

    setPrivacy();
    assert.deepEqual(getMarkdownPrivacyState(), { hideBuyerNames: false, hideMoneyValues: false });
});

test('getMarkdownPrivacyState ignora valores de storage corruptos', () => {
    setPrivacy();
    localStorage.setItem(BUYER_KEY, 'basura');
    localStorage.setItem(MONEY_KEY, 'basura');
    assert.deepEqual(getMarkdownPrivacyState(), { hideBuyerNames: false, hideMoneyValues: false });
});

test('getMarkdownPrivacyState migra la clave legacy de rankings una sola vez', () => {
    setPrivacy();
    localStorage.removeItem(BUYER_KEY);
    localStorage.setItem(LEGACY_KEY, '1');

    assert.equal(getMarkdownPrivacyState().hideBuyerNames, true);
    assert.equal(localStorage.getItem(BUYER_KEY), '1', 'debe persistir la migración');

    // Tras la migración la clave nueva manda: cambiar la legacy ya no altera nada.
    localStorage.setItem(LEGACY_KEY, '0');
    assert.equal(getMarkdownPrivacyState().hideBuyerNames, true, 'la clave nueva tiene prioridad');
});

// ---------------------------------------------------------------------------
// normalizeReportClientKey / chooseReportClientName
// ---------------------------------------------------------------------------

test('normalizeReportClientKey colapsa y normaliza la clave del comprador', () => {
    assert.equal(normalizeReportClientKey('  JUAN  perez '), 'juan perez');
    assert.equal(normalizeReportClientKey('JUAN PEREZ'), 'juan perez');
    assert.equal(normalizeReportClientKey(null), '');
    assert.equal(normalizeReportClientKey(''), '');
    assert.equal(normalizeReportClientKey(undefined), '');
});

test('chooseReportClientName prefiere el nombre mejor formateado', () => {
    assert.equal(chooseReportClientName('', 'juan'), 'juan');
    assert.equal(chooseReportClientName('juan', ''), 'juan');
    assert.equal(chooseReportClientName('', ''), 'Sin cliente');
    assert.equal(chooseReportClientName('juan perez', 'Juan Pérez'), 'Juan Pérez');
    assert.equal(chooseReportClientName('Juan Pérez', 'juan perez'), 'Juan Pérez');
});

// ---------------------------------------------------------------------------
// maskReportName / maskReportMoney / maskReportMetric
// ---------------------------------------------------------------------------

test('maskReportName enmascara nombres cuando la privacidad está activa', () => {
    assert.equal(maskReportName('Juan Pérez', { hideBuyerNames: true, hideMoneyValues: false }), MASK);
    assert.equal(maskReportName('', { hideBuyerNames: true, hideMoneyValues: false }), MASK);
});

test('maskReportName respeta valor, vacío y fallback cuando la privacidad está inactiva', () => {
    const off = { hideBuyerNames: false, hideMoneyValues: false };
    assert.equal(maskReportName(' Juan Pérez ', off), 'Juan Pérez');
    assert.equal(maskReportName('', off), 'Sin cliente');
    assert.equal(maskReportName(null, off), 'Sin cliente');
    assert.equal(maskReportName(undefined, off), 'Sin cliente');
    assert.equal(maskReportName('', off, 'N/A'), 'N/A');
});

test('maskReportMoney y maskReportMetric enmascaran montos y métricas con privacidad activa', () => {
    const on = { hideBuyerNames: false, hideMoneyValues: true };
    assert.equal(maskReportMoney('$1,234.00 USD', on), MASK);
    assert.equal(maskReportMetric('45%', on), MASK);
});

test('maskReportMoney y maskReportMetric dejan pasar el valor con privacidad inactiva', () => {
    const off = { hideBuyerNames: false, hideMoneyValues: false };
    assert.equal(maskReportMoney('$1,234.00 USD', off), '$1,234.00 USD');
    assert.equal(maskReportMoney('1263.25', off), '1263.25');
    assert.equal(maskReportMetric('45%', off), '45%');
});

test('los masks usan por defecto el estado global de privacidad', () => {
    setPrivacy({ buyers: true, money: true });
    assert.equal(maskReportName('Juan'), MASK);
    assert.equal(maskReportMoney('$10.00'), MASK);

    setPrivacy();
    assert.equal(maskReportName('Juan'), 'Juan');
    assert.equal(maskReportMoney('$10.00'), '$10.00');
});

test('maskReportMoney convierte valores falsy en cadena vacía (callers pasan strings formateados)', () => {
    const off = { hideBuyerNames: false, hideMoneyValues: false };
    assert.equal(maskReportMoney(0, off), '');
    assert.equal(maskReportMoney(null, off), '');
    assert.equal(maskReportMoney(undefined, off), '');
});

// ---------------------------------------------------------------------------
// normalizeReportClientName
// ---------------------------------------------------------------------------

test('normalizeReportClientName capitaliza cada palabra', () => {
    assert.equal(normalizeReportClientName('juan pÉREZ'), 'Juan Pérez');
    assert.equal(normalizeReportClientName('JUAN PEREZ'), 'Juan Perez');
    assert.equal(normalizeReportClientName('  MARÍA   JOSEFA '), 'María Josefa');
    assert.equal(normalizeReportClientName('ana'), 'Ana');
});

test('normalizeReportClientName devuelve Sin cliente ante entradas vacías', () => {
    assert.equal(normalizeReportClientName(''), 'Sin cliente');
    assert.equal(normalizeReportClientName(null), 'Sin cliente');
    assert.equal(normalizeReportClientName(undefined), 'Sin cliente');
    assert.equal(normalizeReportClientName('   '), 'Sin cliente');
});

// ---------------------------------------------------------------------------
// sanitizeCropDisplayName
// ---------------------------------------------------------------------------

test('sanitizeCropDisplayName elimina emojis puros y conserva el texto', () => {
    assert.equal(sanitizeCropDisplayName('🌽 Maíz Norte'), 'Maíz Norte');
    assert.equal(sanitizeCropDisplayName('  🌽  Maíz 🌽  Norte  '), 'Maíz Norte');
    assert.equal(sanitizeCropDisplayName('Maíz Norte'), 'Maíz Norte');
    assert.equal(sanitizeCropDisplayName('123 🌽'), '123');
});

test('sanitizeCropDisplayName conserva tokens que mezclan emoji y texto', () => {
    assert.equal(sanitizeCropDisplayName('🌽Maíz'), '🌽Maíz');
    assert.equal(sanitizeCropDisplayName('123'), '123');
});

test('sanitizeCropDisplayName devuelve Sin nombre si no queda texto', () => {
    assert.equal(sanitizeCropDisplayName('🌽🌽'), 'Sin nombre');
    assert.equal(sanitizeCropDisplayName('🌽 🥑'), 'Sin nombre');
    assert.equal(sanitizeCropDisplayName(''), 'Sin nombre');
    assert.equal(sanitizeCropDisplayName(null), 'Sin nombre');
    assert.equal(sanitizeCropDisplayName('   '), 'Sin nombre');
});

// ---------------------------------------------------------------------------
// resolvePendingTransferDestination
// ---------------------------------------------------------------------------

test('resolvePendingTransferDestination normaliza el destino directo a pagado o pérdida', () => {
    assert.equal(resolvePendingTransferDestination({ transferred_to: 'Income' }), 'pagado');
    assert.equal(resolvePendingTransferDestination({ transferred_to: 'ingresos' }), 'pagado');
    assert.equal(resolvePendingTransferDestination({ transferred_to: 'pagado' }), 'pagado');
    assert.equal(resolvePendingTransferDestination({ transferred_to: 'Losses' }), 'pérdida');
    assert.equal(resolvePendingTransferDestination({ transferred_to: 'pérDidas' }), 'pérdida');
    assert.equal(resolvePendingTransferDestination({ transferred_to: 'pérdida' }), 'pérdida');
});

test('resolvePendingTransferDestination conserva destinos de finca reales', () => {
    assert.equal(resolvePendingTransferDestination({ transferred_to: 'otra_finca' }), 'otra_finca');
    assert.equal(resolvePendingTransferDestination({ transferred_to: 'Finca Norte' }), 'finca norte');
});

test('resolvePendingTransferDestination devuelve pagado/pérdida cuando hay estado pero no destino', () => {
    assert.equal(resolvePendingTransferDestination({ transferred_to: 'active' }), 'pagado/pérdida');
    assert.equal(resolvePendingTransferDestination({ transferred_to: 'transferred' }), 'pagado/pérdida');
    assert.equal(resolvePendingTransferDestination({ transfer_state: 'transferred' }), 'pagado/pérdida');
    assert.equal(resolvePendingTransferDestination({ transfer_state: 'active' }), 'pagado/pérdida');
    assert.equal(resolvePendingTransferDestination({ transferred_at: '2026-01-01' }), 'pagado/pérdida');
    assert.equal(resolvePendingTransferDestination({ transferred_income_id: 7 }), 'pagado/pérdida');
    assert.equal(resolvePendingTransferDestination({}), 'pagado/pérdida');
    assert.equal(resolvePendingTransferDestination(null), 'pagado/pérdida');
});
