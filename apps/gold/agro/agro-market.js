/**
 * YavlGold V9.4 - Agro Market Intelligence
 * Ticker Financiero con Crypto (Binance) + Fiat (Exchange Rates API)
 * Detección automática de zona horaria para mostrar moneda local
 */

const MARKET_CONFIG = {
    binanceAPI: 'https://api.binance.com/api/v3/ticker/price',
    fiatAPI: 'https://open.er-api.com/v6/latest/USD',
};

/**
 * Inicializa el módulo de inteligencia de mercado
 */
export async function initMarketIntelligence() {
    const tickerTrack = document.getElementById('market-ticker-track');
    const locationLabel = document.getElementById('market-location');

    if (!tickerTrack) {
        console.warn('[AgroMarket] Ticker track element not found');
        return;
    }

    try {
        const [crypto, fiat] = await Promise.all([
            fetchCryptoPrices(),
            fetchFiatRates()
        ]);
        const userCurrency = detectUserCurrency(locationLabel);
        renderTicker(tickerTrack, crypto, fiat, userCurrency);
        console.log('[AgroMarket] 📡 Ticker inicializado');
    } catch (error) {
        console.error('[AgroMarket] Error:', error);
        tickerTrack.innerHTML = '<span class="text-red-400 text-sm px-4">📡 Sin señal de mercado</span>';
    }
}

/**
 * Obtiene precios de criptomonedas desde Binance
 */
async function fetchCryptoPrices() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    const prices = {};

    // Fetch individual because batch requires different format
    for (const symbol of symbols) {
        try {
            const res = await fetch(`${MARKET_CONFIG.binanceAPI}?symbol=${symbol}`);
            const data = await res.json();
            const key = symbol.replace('USDT', '');
            prices[key] = parseFloat(data.price);
        } catch (e) {
            console.warn(`[AgroMarket] Error fetching ${symbol}:`, e);
        }
    }

    return prices;
}

/**
 * Obtiene tasas de cambio Fiat desde Exchange Rates API
 */
async function fetchFiatRates() {
    try {
        const res = await fetch(MARKET_CONFIG.fiatAPI);
        const data = await res.json();
        return data.rates || {};
    } catch (e) {
        console.warn('[AgroMarket] Error fetching fiat rates:', e);
        return {};
    }
}

/**
 * Detecta la moneda del usuario basándose en su zona horaria
 */
function detectUserCurrency(locationLabel) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let currency = 'USD';
    let label = 'Global';

    // Mapeo de zonas horarias a monedas
    if (tz.includes('Caracas')) {
        currency = 'VES';
        label = 'Venezuela 🇻🇪';
    } else if (tz.includes('Bogota')) {
        currency = 'COP';
        label = 'Colombia 🇨🇴';
    } else if (tz.includes('Mexico')) {
        currency = 'MXN';
        label = 'México 🇲🇽';
    } else if (tz.includes('Buenos_Aires')) {
        currency = 'ARS';
        label = 'Argentina 🇦🇷';
    } else if (tz.includes('Lima')) {
        currency = 'PEN';
        label = 'Perú 🇵🇪';
    } else if (tz.includes('Santiago')) {
        currency = 'CLP';
        label = 'Chile 🇨🇱';
    } else if (tz.includes('Madrid') || tz.includes('Canary')) {
        currency = 'EUR';
        label = 'España 🇪🇸';
    }

    if (locationLabel) {
        locationLabel.innerHTML = `<i class="fa-solid fa-location-dot" style="color: var(--gold-primary);"></i> ${label}`;
    }

    console.log(`[AgroMarket] 🌍 Zona: ${tz} → Moneda: ${currency}`);
    return currency;
}

/**
 * Renderiza el ticker con los datos obtenidos
 */
function renderTicker(tickerTrack, crypto, fiat, localCurrency) {
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

    // Fiat Dinámico (moneda local del usuario)
    if (fiat[localCurrency] && localCurrency !== 'USD') {
        items += createTickerItem(`USD/${localCurrency}`, fmtFiat(fiat[localCurrency], localCurrency), 'text-gold', 'fa-solid fa-money-bill-transfer');
    }

    // Especial Zona Frontera Venezuela: mostrar también COP
    if (localCurrency === 'VES' && fiat['COP']) {
        items += createTickerItem('USD/COP', fmtFiat(fiat['COP'], 'COP'), 'text-orange-400', 'fa-solid fa-money-bill-1');
    }

    // Duplicar contenido para efecto de scroll infinito
    tickerTrack.innerHTML = items + items;

    // Inyectar estilos de animación
    injectTickerStyles();
}

/**
 * Crea un item individual del ticker
 */
function createTickerItem(label, value, colorClass, iconClass) {
    return `
        <div class="ticker-item">
            <i class="${iconClass} ${colorClass}"></i>
            <span class="ticker-label">${label}</span>
            <span class="ticker-value">${value}</span>
        </div>
    `;
}

/**
 * Inyecta los estilos CSS necesarios para la animación del ticker
 */
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

        .text-gold { color: var(--gold-primary, #C8A752); }
        .text-yellow-500 { color: #eab308; }
        .text-blue-400 { color: #60a5fa; }
        .text-purple-400 { color: #c084fc; }
        .text-green-400 { color: #4ade80; }
        .text-orange-400 { color: #fb923c; }
        .text-red-400 { color: #f87171; }
    `;
    document.head.appendChild(styleEl);
}

/**
 * Auto-refresh del ticker cada 30 segundos
 */
export function startTickerAutoRefresh() {
    setInterval(initMarketIntelligence, 30000);
}
