const API_BASE = 'https://data-api.binance.vision/api/v3/ticker/24hr?symbol=';
const BACKOFF_STEPS_MS = [20000, 40000, 60000];
const REQUEST_TIMEOUT_MS = 6000;
const FNG_URL = 'https://api.alternative.me/fng/?limit=1';
const FNG_STORAGE_KEY = 'YG_FNG_V1';
const FNG_CACHE_TTL_MS = 15 * 60 * 1000;
const PAIRS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', name: 'Ethereum' },
  { symbol: 'SOLUSDT', name: 'Solana' },
  { symbol: 'BNBUSDT', name: 'BNB' }
];

const grid = document.getElementById('market-grid');
const statusText = document.getElementById('market-status-text');
const updatedEl = document.getElementById('market-updated');
const errorEl = document.getElementById('market-error');
const fngCard = document.getElementById('fng-card');
const fngValueEl = document.getElementById('fng-value');
const fngLabelEl = document.getElementById('fng-label');
const fngUpdatedEl = document.getElementById('fng-updated');
const fngErrorEl = document.getElementById('fng-error');
const fngMarkerEl = document.getElementById('fng-marker');
let backoffIndex = 0;
let refreshTimer = null;
let isLoading = false;
let fngTimer = null;

class FetchError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function setStatus(text) {
  if (statusText) statusText.textContent = text;
}

function setError(message) {
  if (errorEl) errorEl.textContent = message || '';
}

function setFngError(message) {
  if (fngErrorEl) fngErrorEl.textContent = message || '';
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getFngState(value) {
  if (value <= 24) return { label: 'Miedo Extremo', state: 'extreme-fear' };
  if (value <= 49) return { label: 'Miedo', state: 'fear' };
  if (value <= 54) return { label: 'Neutral', state: 'neutral' };
  if (value <= 74) return { label: 'Codicia', state: 'greed' };
  return { label: 'Codicia Extrema', state: 'extreme-greed' };
}

function readFngCache() {
  try {
    const raw = localStorage.getItem(FNG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.value !== 'number' || typeof parsed.timestamp !== 'number') return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function writeFngCache(payload) {
  try {
    localStorage.setItem(FNG_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    // Ignore storage failures.
  }
}

function renderFng(payload) {
  if (!fngValueEl || !fngLabelEl || !fngMarkerEl) return;
  const numericValue = clampNumber(Math.round(payload.value), 0, 100);
  const meta = getFngState(numericValue);
  fngValueEl.textContent = String(numericValue);
  fngLabelEl.textContent = meta.label;
  if (fngCard) fngCard.dataset.state = meta.state;
  fngMarkerEl.style.left = `${numericValue}%`;

  if (fngUpdatedEl && payload.timestamp) {
    const updatedAt = new Date(payload.timestamp);
    if (!Number.isNaN(updatedAt.getTime())) {
      fngUpdatedEl.textContent = `Actualizado ${updatedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
}

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function formatChange(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return { text: '--', className: '' };
  const sign = num >= 0 ? '+' : '';
  return { text: `${sign}${num.toFixed(2)}%`, className: num >= 0 ? 'up' : 'down' };
}

function renderCards(rows) {
  if (!grid) return;
  grid.innerHTML = rows.map((row) => {
    const change = formatChange(row.change);
    return `
      <div class="market-card">
        <div class="market-pair">${row.symbol.replace('USDT', '/USDT')}</div>
        <div class="market-name">${row.name}</div>
        <div class="market-price">${formatPrice(row.price)}</div>
        <div class="market-change ${change.className}">${change.text}</div>
      </div>
    `;
  }).join('');
}

function scheduleFngRefresh(delay) {
  if (fngTimer) clearTimeout(fngTimer);
  fngTimer = setTimeout(loadFearGreed, delay);
}

function setFngLoading() {
  if (fngLabelEl) fngLabelEl.textContent = 'Cargando';
  if (fngValueEl) fngValueEl.textContent = '--';
}

async function loadFearGreed() {
  if (!fngValueEl || !fngLabelEl) return;

  const cached = readFngCache();
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age >= 0 && age < FNG_CACHE_TTL_MS) {
      renderFng(cached);
      setFngError('');
      scheduleFngRefresh(Math.max(FNG_CACHE_TTL_MS - age, 60000));
      return;
    }
  }

  setFngLoading();
  setFngError('');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(FNG_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    const entry = payload && payload.data && payload.data[0];
    const value = Number(entry && entry.value);
    if (!Number.isFinite(value)) throw new Error('invalid');
    const timestampSeconds = Number(entry && entry.timestamp);
    const timestamp = Number.isFinite(timestampSeconds) ? timestampSeconds * 1000 : Date.now();
    const data = { value, timestamp };
    writeFngCache(data);
    renderFng(data);
    setFngError('');
  } catch (err) {
    if (cached) {
      renderFng(cached);
      setFngError('Dato no disponible. Mostrando ultimo valor.');
    } else {
      setFngError('Dato no disponible.');
      if (fngLabelEl) fngLabelEl.textContent = 'Sin datos';
    }
  } finally {
    clearTimeout(timeoutId);
    scheduleFngRefresh(FNG_CACHE_TTL_MS);
  }
}

async function fetchTicker(symbol) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(API_BASE + encodeURIComponent(symbol), { signal: controller.signal });
    if (!res.ok) throw new FetchError(`HTTP ${res.status}`, res.status, 'http');
    const data = await res.json();
    return {
      symbol: data.symbol,
      price: data.lastPrice,
      change: data.priceChangePercent
    };
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (err && err.name === 'AbortError') throw new FetchError('timeout', null, 'network');
    throw new FetchError('network', null, 'network');
  } finally {
    clearTimeout(timeoutId);
  }
}

function scheduleNext(delay) {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(loadMarketData, delay);
}

async function loadMarketData() {
  if (isLoading) return;
  isLoading = true;
  setStatus('CONECTANDO');
  setError('');

  let nextDelay = BACKOFF_STEPS_MS[backoffIndex];

  try {
    const results = await Promise.allSettled(
      PAIRS.map((pair) => fetchTicker(pair.symbol))
    );

    const rows = [];
    let hasRestricted = false;
    let hasNetworkError = false;

    results.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        rows.push({
          symbol: res.value.symbol,
          name: PAIRS[index].name,
          price: res.value.price,
          change: res.value.change
        });
        return;
      }

      const reason = res.reason;
      if (reason && reason.status === 451) hasRestricted = true;
      if (reason && reason.code === 'network') hasNetworkError = true;
    });

    if (rows.length === 0) {
      setStatus('SIN CONEXION');
      if (hasRestricted) {
        setError('Sin conexion / restringido por region (451).');
      } else if (hasNetworkError) {
        setError('Error de red. Reintenta en unos segundos.');
      } else {
        setError('No se pudo cargar market data. Reintenta en unos segundos.');
      }

      backoffIndex = Math.min(backoffIndex + 1, BACKOFF_STEPS_MS.length - 1);
      nextDelay = BACKOFF_STEPS_MS[backoffIndex];
      return;
    }

    renderCards(rows);
    setStatus('LIVE DATA');
    backoffIndex = 0;
    nextDelay = BACKOFF_STEPS_MS[backoffIndex];

    if (updatedEl) {
      const now = new Date();
      updatedEl.textContent = `Actualizado ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
  } finally {
    isLoading = false;
    scheduleNext(nextDelay);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadMarketData();
  loadFearGreed();
});
