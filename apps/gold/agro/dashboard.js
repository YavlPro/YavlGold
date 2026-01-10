/**
 * YavlGold V9.4 - Agro Dashboard Widgets
 * Clima (Open-Meteo), Mercado (Binance), Fase Lunar (Algoritmo), FX (Partículas)
 */

// ============================================
// 1. MÓDULO CLIMA (La Grita, Táchira)
// ============================================
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast?latitude=8.1333&longitude=-71.9833&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto';

async function fetchWeather() {
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const humEl = document.getElementById('weather-humidity');

    if (!tempEl) return;

    try {
        const res = await fetch(WEATHER_API);
        const data = await res.json();
        const current = data.current;

        // Update DOM
        tempEl.textContent = `${Math.round(current.temperature_2m)}°C`;
        humEl.textContent = `💧 ${current.relative_humidity_2m}%`;

        // Map Weather Code
        const code = current.weather_code;
        let desc = 'Desconocido';
        let icon = '❓';

        if (code === 0) { desc = 'Despejado'; icon = '☀️'; }
        else if (code >= 1 && code <= 3) { desc = 'Nublado'; icon = '☁️'; }
        else if (code >= 45 && code <= 48) { desc = 'Niebla'; icon = '🌫️'; }
        else if (code >= 51 && code <= 67) { desc = 'Lluvia'; icon = '🌧️'; }
        else if (code >= 71 && code <= 77) { desc = 'Nieve'; icon = '❄️'; }
        else if (code >= 80 && code <= 82) { desc = 'Chubascos'; icon = '🌦️'; }
        else if (code >= 95 && code <= 99) { desc = 'Tormenta'; icon = '⛈️'; }

        descEl.textContent = `${icon} ${desc}`;
        console.log('[Agro] 🌦️ Clima actualizado:', desc);

    } catch (err) {
        console.error('[Agro] Error clima:', err);
        tempEl.textContent = '--';
        descEl.textContent = 'Error API';
    }
}

// ============================================
// 2. MÓDULO MERCADO (BTC/USDT)
// ============================================
const MARKET_API = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
let lastPrice = 0;

async function fetchBTC() {
    const priceEl = document.getElementById('btcPrice');
    if (!priceEl) return;

    try {
        const res = await fetch(MARKET_API);
        const data = await res.json();
        const price = parseFloat(data.price);

        // Flash Effect
        if (lastPrice > 0) {
            priceEl.style.transition = 'color 0.3s ease';
            priceEl.style.color = price >= lastPrice ? 'var(--success)' : 'var(--danger)';
            setTimeout(() => { priceEl.style.color = 'var(--gold-primary)'; }, 1000);
        }

        priceEl.textContent = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(price);

        lastPrice = price;
        // console.log('[Agro] 📈 BTC:', price);

    } catch (err) {
        console.error('[Agro] Error mercado:', err);
    }
}

// ============================================
// 3. MÓDULO ASTRONÓMICO (Fase Lunar)
// ============================================
function calculateMoonPhase() {
    const phaseEl = document.getElementById('moon-phase');
    const adviceEl = document.getElementById('moon-advice');
    const iconEl = document.getElementById('moon-icon');

    if (!phaseEl) return;

    // Algoritmo simple de fase lunar
    const date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();

    if (month < 3) { year--; month += 12; }
    ++month;

    let c = 365.25 * year;
    let e = 30.6 * month;
    let jd = c + e + day - 694039.09; // jd is total days elapsed
    jd /= 29.5305882; // divide by the moon cycle
    let b = parseInt(jd); // int(jd) -> b, take integer part of jd
    jd -= b; // subtract integer part to leave fractional part of original jd
    b = Math.round(jd * 8); // scale fraction from 0-8 and round

    if (b >= 8) b = 0; // 0 and 8 are the same so turn 8 into 0

    // Mapeo de fases (0-7)
    // 0 = Nueva, 4 = Llena
    let phaseName = '';
    let advice = '';
    let icon = '';

    switch (b) {
        case 0:
        case 7:
            phaseName = 'Nueva';
            advice = '🚫 Evitar siembra';
            icon = '🌑';
            break;
        case 1:
        case 2:
            phaseName = 'Creciente';
            advice = '🌿 Siembra de hojas';
            icon = '🌓';
            break;
        case 3:
        case 4:
            phaseName = 'Llena';
            advice = '🐛 Control de plagas';
            icon = '🌕';
            break;
        case 5:
        case 6:
            phaseName = 'Menguante';
            advice = '🥔 Siembra de raíces'; // Papas, zanahorias
            icon = '🌗';
            break;
    }

    phaseEl.textContent = phaseName;
    adviceEl.textContent = advice;

    if (iconEl) iconEl.textContent = icon;

    console.log(`[Agro] 🌙 Fase Lunar: ${phaseName} (Index: ${b})`);
}

// ============================================
// 4. EFECTOS VISUALES (Partículas)
// ============================================
function initParticles() {
    document.querySelectorAll('.particle').forEach((particle) => {
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${-Math.random() * 20}s`;
        particle.style.animationDuration = `${15 + Math.random() * 15}s`;
    });
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Widgets
    fetchWeather();
    fetchBTC();
    calculateMoonPhase();
    initParticles();

    // 2. Loop de Mercado (Cada 15s)
    setInterval(fetchBTC, 15000);

    // 3. Loop de Clima (Cada 10min)
    setInterval(fetchWeather, 600000);
});
