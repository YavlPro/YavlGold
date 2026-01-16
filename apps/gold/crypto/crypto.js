const API_BASE = 'https://api.binance.com/api/v3/ticker/24hr?symbol=';
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

function setStatus(text) {
  if (statusText) statusText.textContent = text;
}

function setError(message) {
  if (errorEl) errorEl.textContent = message || '';
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

async function fetchTicker(symbol) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(API_BASE + encodeURIComponent(symbol), { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      symbol: data.symbol,
      price: data.lastPrice,
      change: data.priceChangePercent
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadMarketData() {
  setStatus('CONECTANDO');
  setError('');

  const results = await Promise.allSettled(
    PAIRS.map((pair) => fetchTicker(pair.symbol))
  );

  const rows = [];
  results.forEach((res, index) => {
    if (res.status !== 'fulfilled') return;
    rows.push({
      symbol: res.value.symbol,
      name: PAIRS[index].name,
      price: res.value.price,
      change: res.value.change
    });
  });

  if (rows.length === 0) {
    setStatus('SIN CONEXION');
    setError('No se pudo cargar market data. Reintenta en unos segundos.');
    return;
  }

  renderCards(rows);
  setStatus('LIVE DATA');

  if (updatedEl) {
    const now = new Date();
    updatedEl.textContent = `Actualizado ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadMarketData();
  setInterval(loadMarketData, 20000);
});
