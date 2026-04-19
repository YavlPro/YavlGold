// agro-display-currency.js — Visual currency layer for crop cycles.
// Base financial math stays in USD; this module only formats display values.

import {
  convertFromUSD,
  getRate,
  initExchangeRates
} from './agro-exchange.js';

const STORAGE_KEY = 'yavlgold_agro_cycle_display_currency';
const DISPLAY_ORDER = ['USD', 'COP', 'VES'];
const DISPLAY_LABELS = {
  USD: 'USD',
  COP: 'COP',
  VES: 'BS'
};

let exchangeRates = { USD: 1, COP: null, VES: null };
let ratesPromise = null;
let currentCurrency = readStoredCurrency();

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch (error) {
    return false;
  }
}

function readStoredCurrency() {
  if (!canUseStorage()) return 'USD';
  try {
    return normalizeCycleDisplayCurrency(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return 'USD';
  }
}

function persistCurrency(currency) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, normalizeCycleDisplayCurrency(currency));
  } catch (error) {
    // Storage can be unavailable in private/restricted contexts.
  }
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveRate(currency) {
  if (currency === 'USD') return 1;
  const rate = Number(getRate(currency, exchangeRates));
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function formatUnsignedAmount(amount, currency) {
  const value = Math.abs(Number(amount) || 0);
  if (currency === 'COP') {
    return `COP ${Math.round(value).toLocaleString('es-CO')}`;
  }
  if (currency === 'VES') {
    return `Bs ${value.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
  return value.toLocaleString('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

export function normalizeCycleDisplayCurrency(value) {
  const token = String(value || '').trim().toUpperCase();
  if (token === 'BS' || token === 'VES') return 'VES';
  if (token === 'COP') return 'COP';
  return 'USD';
}

export function getCycleDisplayCurrency() {
  return currentCurrency;
}

export function getCycleDisplayCurrencyLabel(currency = currentCurrency) {
  return DISPLAY_LABELS[normalizeCycleDisplayCurrency(currency)] || DISPLAY_LABELS.USD;
}

export function getNextCycleDisplayCurrency(currency = currentCurrency) {
  const normalized = normalizeCycleDisplayCurrency(currency);
  const index = DISPLAY_ORDER.indexOf(normalized);
  return DISPLAY_ORDER[(index + 1) % DISPLAY_ORDER.length];
}

export function getNextCycleDisplayCurrencyLabel(currency = currentCurrency) {
  return getCycleDisplayCurrencyLabel(getNextCycleDisplayCurrency(currency));
}

export function initCycleDisplayCurrency() {
  if (!ratesPromise) {
    ratesPromise = initExchangeRates()
      .then((rates) => {
        exchangeRates = rates && typeof rates === 'object'
          ? { USD: 1, COP: rates.COP ?? null, VES: rates.VES ?? null }
          : { USD: 1, COP: null, VES: null };
        return exchangeRates;
      })
      .catch((error) => {
        console.warn('[agro-display-currency] No se pudieron inicializar tasas:', error);
        return exchangeRates;
      });
  }
  return ratesPromise;
}

export function rotateCycleDisplayCurrency() {
  currentCurrency = getNextCycleDisplayCurrency(currentCurrency);
  persistCurrency(currentCurrency);
  initCycleDisplayCurrency();
  return currentCurrency;
}

export function formatCycleDisplayMoneyFromUsd(value, options = {}) {
  const currency = normalizeCycleDisplayCurrency(options.currency || currentCurrency);
  const label = getCycleDisplayCurrencyLabel(currency);
  const amountUsd = toFiniteNumber(value);
  if (amountUsd === null) return `N/D ${label}`;

  const rate = resolveRate(currency);
  if (!rate) return `N/D ${label}`;

  const converted = currency === 'USD'
    ? amountUsd
    : convertFromUSD(amountUsd, currency, rate);

  return formatUnsignedAmount(converted, currency);
}

export function formatSignedCycleDisplayMoneyFromUsd(value, options = {}) {
  const amountUsd = toFiniteNumber(value);
  const currency = normalizeCycleDisplayCurrency(options.currency || currentCurrency);
  const label = getCycleDisplayCurrencyLabel(currency);
  if (amountUsd === null) return `N/D ${label}`;

  const rate = resolveRate(currency);
  if (!rate) return `N/D ${label}`;

  const sign = amountUsd >= 0 ? '+' : '-';
  const converted = currency === 'USD'
    ? amountUsd
    : convertFromUSD(amountUsd, currency, rate);

  return `${sign}${formatUnsignedAmount(converted, currency)}`;
}
