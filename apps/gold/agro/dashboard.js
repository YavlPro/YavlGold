/**
 * YavlGold V9.4 - Agro Dashboard Widgets
 * Clima (Open-Meteo), Mercado (Binance), Fase Lunar (Algoritmo), FX (Partículas)
 * Updated: Universal location with GPS/IP/VPN support
 */

// ============================================
// 1. MÓDULO CLIMA (Geolocalización Universal)
// ============================================
const WEATHER_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_CACHE_KEY = 'yavlgold_weather_cache';
const WEATHER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Estado del clima
let currentLocation = null;

/**
 * Get cached weather data if still valid
 */
function getCachedWeather() {
    try {
        const cached = localStorage.getItem(WEATHER_CACHE_KEY);
        if (!cached) return null;
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp > WEATHER_CACHE_TTL) {
            localStorage.removeItem(WEATHER_CACHE_KEY);
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
}

/**
 * Save weather data to cache
 */
function setCachedWeather(data) {
    try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
            ...data,
            timestamp: Date.now()
        }));
    } catch (e) {
        // Ignore
    }
}

/**
 * Inicializa el módulo de clima con geolocalización robusta
 */
async function initWeather() {
    // Wait for geolocation module to be ready
    if (typeof window.YGGeolocation === 'undefined') {
        console.warn('[Agro] Geolocation module not loaded, retrying...');
        setTimeout(initWeather, 100);
        return;
    }

    const Geo = window.YGGeolocation;
    const preference = Geo.getLocationPreference();
    const preferIp = preference === 'ip';

    try {
        currentLocation = await Geo.getCoordsSmart({ preferIp: preferIp });
        console.log('[Agro] 📍 Location:', currentLocation.source, '-', currentLocation.label);
        await fetchWeather();
    } catch (err) {
        console.error('[Agro] Location error:', err);
        const cached = getCachedWeather();
        if (cached) {
            displayWeather(cached);
        }
    }

    // Initialize VPN toggle
    initLocationToggle();
}

/**
 * Creates an in-page toggle for GPS vs IP (VPN mode)
 */
function initLocationToggle() {
    const container = document.querySelector('.kpi-card.animate-in.delay-2 .kpi-secondary');
    if (!container) return;

    if (document.getElementById('location-mode-toggle')) return;

    const Geo = window.YGGeolocation;
    const preference = Geo.getLocationPreference();

    const toggleWrapper = document.createElement('div');
    toggleWrapper.id = 'location-mode-toggle';
    toggleWrapper.style.cssText = 'margin-top: 8px; display: flex; gap: 6px; align-items: center;';
    toggleWrapper.innerHTML = `
        <button id="btn-gps-mode" style="font-size: 9px; padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(200, 167, 82, 0.3); background: ${preference === 'gps' ? 'rgba(200, 167, 82, 0.2)' : 'transparent'}; color: ${preference === 'gps' ? '#C8A752' : '#666'}; cursor: pointer; transition: all 0.2s;" title="Usar GPS (ubicación física precisa)">
            📍 GPS
        </button>
        <button id="btn-ip-mode" style="font-size: 9px; padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(200, 167, 82, 0.3); background: ${preference === 'ip' ? 'rgba(200, 167, 82, 0.2)' : 'transparent'}; color: ${preference === 'ip' ? '#C8A752' : '#666'}; cursor: pointer; transition: all 0.2s;" title="Usar IP (para VPN/proxy)">
            🌐 VPN/IP
        </button>
    `;

    container.appendChild(toggleWrapper);

    document.getElementById('btn-gps-mode').addEventListener('click', function () { switchLocationMode('gps'); });
    document.getElementById('btn-ip-mode').addEventListener('click', function () { switchLocationMode('ip'); });
}

/**
 * Switch between GPS and IP location modes
 */
async function switchLocationMode(mode) {
    const btnGps = document.getElementById('btn-gps-mode');
    const btnIp = document.getElementById('btn-ip-mode');
    const descEl = document.getElementById('weather-desc');
    const Geo = window.YGGeolocation;

    if (mode === 'gps') {
        btnGps.style.background = 'rgba(200, 167, 82, 0.2)';
        btnGps.style.color = '#C8A752';
        btnIp.style.background = 'transparent';
        btnIp.style.color = '#666';
    } else {
        btnIp.style.background = 'rgba(200, 167, 82, 0.2)';
        btnIp.style.color = '#C8A752';
        btnGps.style.background = 'transparent';
        btnGps.style.color = '#666';
    }

    Geo.setLocationPreference(mode);

    if (descEl) descEl.textContent = '🔄 Actualizando ubicación...';

    try {
        currentLocation = await Geo.getCoordsSmart({ preferIp: mode === 'ip', forceRefresh: true });
        await fetchWeather();
        console.log('[Agro] 📍 Switched to', mode, 'mode:', currentLocation.label);
    } catch (err) {
        console.error('[Agro] Mode switch error:', err);
        if (descEl) descEl.textContent = '⚠️ Error obteniendo ubicación';
    }
}

/**
 * Fetch weather from Open-Meteo API
 */
async function fetchWeather() {
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const humEl = document.getElementById('weather-humidity');

    if (!tempEl || !currentLocation) return;

    const url = WEATHER_BASE_URL + '?latitude=' + currentLocation.lat + '&longitude=' + currentLocation.lon + '&current=temperature_2m,relative_humidity_2m,is_day,weather_code&daily=sunrise,sunset&timezone=auto';

    const controller = new AbortController();
    const timeoutId = setTimeout(function () { controller.abort(); }, 8000);

    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        const current = data.current;

        const weatherData = {
            temp: Math.round(current.temperature_2m),
            humidity: current.relative_humidity_2m,
            code: current.weather_code,
            isDay: current.is_day,
            timezone: data.timezone,
            location: currentLocation
        };

        setCachedWeather(weatherData);
        displayWeather(weatherData);

    } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
            console.warn('[Agro] Weather API timeout');
        } else {
            console.error('[Agro] Weather API error:', err);
        }

        const cached = getCachedWeather();
        if (cached) {
            displayWeather(cached);
            if (descEl) {
                const currentText = descEl.textContent;
                descEl.textContent = currentText + ' (última lectura)';
            }
        } else {
            tempEl.textContent = '--';
            descEl.textContent = '⚠️ Clima no disponible';
            if (humEl) humEl.textContent = '💧 --%';
        }
    }
}

/**
 * Display weather data in the UI
 */
function displayWeather(data) {
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const humEl = document.getElementById('weather-humidity');
    const labelEl = document.querySelector('.kpi-card:first-child .kpi-value');

    if (!tempEl) return;

    tempEl.textContent = data.temp + '°C';

    if (humEl) humEl.textContent = '💧 ' + data.humidity + '%';

    const code = data.code;
    let desc = 'Desconocido';
    let icon = '❓';

    if (code === 0 || code === 1) {
        desc = 'Despejado';
        icon = data.isDay ? '☀️' : '🌙';
    }
    else if (code >= 2 && code <= 3) { desc = 'Nublado'; icon = '☁️'; }
    else if (code >= 45 && code <= 48) { desc = 'Niebla'; icon = '🌫️'; }
    else if (code >= 51 && code <= 55) { desc = 'Llovizna'; icon = '🌦️'; }
    else if (code >= 56 && code <= 57) { desc = 'Llovizna helada'; icon = '🌧️'; }
    else if (code >= 61 && code <= 67) { desc = 'Lluvia'; icon = '🌧️'; }
    else if (code >= 71 && code <= 77) { desc = 'Nieve'; icon = '❄️'; }
    else if (code >= 80 && code <= 82) { desc = 'Chubascos'; icon = '🌦️'; }
    else if (code >= 85 && code <= 86) { desc = 'Nevada'; icon = '🌨️'; }
    else if (code >= 95 && code <= 99) { desc = 'Tormenta'; icon = '⛈️'; }

    if (descEl) descEl.textContent = icon + ' ' + desc;

    if (labelEl && data.location) {
        const sourceIcon = data.location.source === 'gps' ? '📍' :
            data.location.source === 'ip' ? '🌐' : '📌';
        labelEl.innerHTML = sourceIcon + ' ' + data.location.label + ': <span class="highlight" id="weather-temp">' + data.temp + '°C</span>';
    }

    console.log('[Agro] 🌦️ Weather:', desc, '|', (data.location ? data.location.label : 'Unknown'));
}

// ============================================
// 2. MÓDULO MERCADO - LEGACY (Moved to agro-market.js)
// ============================================

// ============================================
// 3. MÓDULO ASTRONÓMICO (Fase Lunar)
// ============================================
function calculateMoonPhase() {
    const phaseEl = document.getElementById('moon-phase');
    const adviceEl = document.getElementById('moon-advice');
    const iconEl = document.getElementById('moon-icon');

    if (!phaseEl) return;

    const date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();

    if (month < 3) { year--; month += 12; }
    ++month;

    let c = 365.25 * year;
    let e = 30.6 * month;
    let jd = c + e + day - 694039.09;
    jd /= 29.5305882;
    let b = parseInt(jd);
    jd -= b;
    b = Math.round(jd * 8);

    if (b >= 8) b = 0;

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
            advice = '🥔 Siembra de raíces';
            icon = '🌗';
            break;
    }

    phaseEl.textContent = phaseName;
    adviceEl.textContent = advice;

    if (iconEl) iconEl.textContent = icon;

    console.log('[Agro] 🌙 Fase Lunar:', phaseName, '(Index:', b + ')');
}

// ============================================
// 4. EFECTOS VISUALES (Partículas)
// ============================================
function initParticles() {
    document.querySelectorAll('.particle').forEach(function (particle) {
        particle.style.top = (Math.random() * 100) + '%';
        particle.style.left = (Math.random() * 100) + '%';
        particle.style.animationDelay = (-Math.random() * 20) + 's';
        particle.style.animationDuration = (15 + Math.random() * 15) + 's';
    });
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    initWeather();
    calculateMoonPhase();
    initParticles();

    setInterval(function () {
        if (currentLocation) fetchWeather();
    }, 600000);
});
