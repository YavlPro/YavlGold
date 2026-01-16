/**
 * YavlGold V9.4 - Agro Dashboard Widgets
 * Clima (Open-Meteo), Mercado (Binance), Fase Lunar (Algoritmo), FX (Partículas)
 * Updated: Universal location with GPS/IP/VPN + Manual selector support
 */

// ============================================
// 1. MÓDULO CLIMA (Geolocalización Universal)
// ============================================
const WEATHER_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_CACHE_PREFIX = 'yavlgold_weather_';
const WEATHER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Estado del clima
let currentLocation = null;

/**
 * Generate cache key based on lat/lon (rounded to 2 decimals)
 */
function getWeatherCacheKey(lat, lon) {
    const latRounded = Math.round(lat * 100) / 100;
    const lonRounded = Math.round(lon * 100) / 100;
    return WEATHER_CACHE_PREFIX + latRounded + '_' + lonRounded;
}

/**
 * Get cached weather data if still valid
 */
function getCachedWeather(lat, lon) {
    try {
        const key = getWeatherCacheKey(lat, lon);
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp > WEATHER_CACHE_TTL) {
            localStorage.removeItem(key);
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
function setCachedWeather(data, lat, lon) {
    try {
        const key = getWeatherCacheKey(lat, lon);
        localStorage.setItem(key, JSON.stringify({
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
        console.log('[Agro] Location:', currentLocation.source, '-', currentLocation.label);
        await fetchWeather();
    } catch (err) {
        console.error('[Agro] Location error:', err);
        // Try to show any cached weather
    }

    // Initialize location controls
    initLocationControls();
}

/**
 * Creates location control UI (mode toggle + manual selector)
 */
function initLocationControls() {
    const container = document.querySelector('.kpi-card.animate-in.delay-2 .kpi-secondary');
    if (!container) return;
    if (document.getElementById('location-controls')) return;

    const Geo = window.YGGeolocation;
    const preference = Geo.getLocationPreference();
    const manual = Geo.getManualLocation();

    const controlsWrapper = document.createElement('div');
    controlsWrapper.id = 'location-controls';
    controlsWrapper.style.cssText = 'margin-top: 8px;';

    // Mode toggle row
    const toggleRow = document.createElement('div');
    toggleRow.style.cssText = 'display: flex; gap: 6px; align-items: center; flex-wrap: wrap;';

    // Only show mode toggles if no manual location
    if (!manual) {
        toggleRow.innerHTML = `
            <button id="btn-gps-mode" class="loc-btn ${preference === 'gps' ? 'active' : ''}" title="Usar GPS">
                📍 GPS
            </button>
            <button id="btn-ip-mode" class="loc-btn ${preference === 'ip' ? 'active' : ''}" title="Usar IP/VPN">
                🌐 VPN/IP
            </button>
            <button id="btn-manual-mode" class="loc-btn" title="Elegir ubicación manual">
                ✏️ Cambiar
            </button>
        `;
    } else {
        toggleRow.innerHTML = `
            <span style="font-size: 9px; color: #C8A752; padding: 4px 8px; background: rgba(200, 167, 82, 0.15); border-radius: 12px;">
                📌 Manual
            </span>
            <button id="btn-manual-mode" class="loc-btn" title="Cambiar ubicación">
                ✏️ Cambiar
            </button>
            <button id="btn-clear-manual" class="loc-btn" title="Usar ubicación del dispositivo">
                📍 Usar dispositivo
            </button>
        `;
    }

    controlsWrapper.appendChild(toggleRow);

    // Add styles
    if (!document.getElementById('loc-btn-styles')) {
        const style = document.createElement('style');
        style.id = 'loc-btn-styles';
        style.textContent = `
            .loc-btn {
                font-size: 9px;
                padding: 4px 8px;
                border-radius: 12px;
                border: 1px solid rgba(200, 167, 82, 0.3);
                background: transparent;
                color: #666;
                cursor: pointer;
                transition: all 0.2s;
                font-family: inherit;
            }
            .loc-btn:hover {
                background: rgba(200, 167, 82, 0.1);
                color: #C8A752;
            }
            .loc-btn.active {
                background: rgba(200, 167, 82, 0.2);
                color: #C8A752;
            }
            #location-search-modal {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.9);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            #location-search-box {
                background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
                border: 1px solid rgba(200, 167, 82, 0.3);
                border-radius: 16px;
                padding: 24px;
                width: 100%;
                max-width: 400px;
                box-shadow: 0 0 60px rgba(200, 167, 82, 0.15);
            }
            #location-search-input {
                width: 100%;
                padding: 12px 16px;
                background: rgba(0,0,0,0.5);
                border: 1px solid rgba(200, 167, 82, 0.3);
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                font-family: inherit;
                outline: none;
            }
            #location-search-input:focus {
                border-color: #C8A752;
                box-shadow: 0 0 0 2px rgba(200, 167, 82, 0.2);
            }
            #location-search-input::placeholder {
                color: #666;
            }
            #location-results {
                margin-top: 12px;
                max-height: 300px;
                overflow-y: auto;
            }
            .location-result-item {
                padding: 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
            }
            .location-result-item:hover {
                background: rgba(200, 167, 82, 0.1);
                border-color: rgba(200, 167, 82, 0.3);
            }
            .location-result-name {
                color: #fff;
                font-weight: 600;
                font-size: 14px;
            }
            .location-result-region {
                color: #888;
                font-size: 12px;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(controlsWrapper);

    // Add event listeners
    if (!manual) {
        document.getElementById('btn-gps-mode').addEventListener('click', function () {
            switchLocationMode('gps');
        });
        document.getElementById('btn-ip-mode').addEventListener('click', function () {
            switchLocationMode('ip');
        });
    } else {
        document.getElementById('btn-clear-manual').addEventListener('click', clearManualAndRefresh);
    }

    document.getElementById('btn-manual-mode').addEventListener('click', openLocationSelector);
}

/**
 * Switch between GPS and IP location modes
 */
async function switchLocationMode(mode) {
    const Geo = window.YGGeolocation;
    const descEl = document.getElementById('weather-desc');

    // Clear manual location when switching modes
    Geo.clearManualLocation();
    Geo.setLocationPreference(mode);

    // Update button states
    const btnGps = document.getElementById('btn-gps-mode');
    const btnIp = document.getElementById('btn-ip-mode');
    if (btnGps && btnIp) {
        btnGps.classList.toggle('active', mode === 'gps');
        btnIp.classList.toggle('active', mode === 'ip');
    }

    if (descEl) descEl.textContent = '🔄 Actualizando...';

    try {
        currentLocation = await Geo.getCoordsSmart({ preferIp: mode === 'ip', forceRefresh: true });
        await fetchWeather();
        console.log('[Agro] Switched to', mode, ':', currentLocation.label);
    } catch (err) {
        console.error('[Agro] Mode switch error:', err);
        if (descEl) descEl.textContent = '⚠️ Error';
    }
}

/**
 * Clear manual location and use device location
 */
async function clearManualAndRefresh() {
    const Geo = window.YGGeolocation;
    const descEl = document.getElementById('weather-desc');

    Geo.clearManualLocation();

    if (descEl) descEl.textContent = '🔄 Detectando ubicación...';

    // Rebuild controls (will show GPS/IP toggles instead of Manual badge)
    const controls = document.getElementById('location-controls');
    if (controls) controls.remove();
    initLocationControls();

    try {
        const preference = Geo.getLocationPreference();
        currentLocation = await Geo.getCoordsSmart({ preferIp: preference === 'ip', forceRefresh: true });
        await fetchWeather();
    } catch (err) {
        console.error('[Agro] Clear manual error:', err);
    }
}

/**
 * Open location search modal
 */
function openLocationSelector() {
    // Don't create multiple modals
    if (document.getElementById('location-search-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'location-search-modal';
    modal.innerHTML = `
        <div id="location-search-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; color: #C8A752; font-family: 'Orbitron', sans-serif; font-size: 14px; letter-spacing: 1px;">
                    SELECCIONAR UBICACIÓN
                </h3>
                <button id="close-location-modal" style="background: none; border: none; color: #888; font-size: 20px; cursor: pointer; padding: 4px;">
                    ✕
                </button>
            </div>
            <input type="text" id="location-search-input" placeholder="Buscar ciudad... (ej: La Grita, Madrid)" autocomplete="off">
            <div id="location-results">
                <p style="color: #666; font-size: 12px; text-align: center; padding: 20px;">
                    Escribe el nombre de una ciudad para buscar
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Focus input
    setTimeout(function () {
        document.getElementById('location-search-input').focus();
    }, 100);

    // Event listeners
    document.getElementById('close-location-modal').addEventListener('click', closeLocationSelector);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeLocationSelector();
    });

    // Search on input
    let searchTimeout = null;
    document.getElementById('location-search-input').addEventListener('input', function (e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            document.getElementById('location-results').innerHTML = `
                <p style="color: #666; font-size: 12px; text-align: center; padding: 20px;">
                    Escribe al menos 2 caracteres para buscar
                </p>
            `;
            return;
        }

        document.getElementById('location-results').innerHTML = `
            <p style="color: #888; font-size: 12px; text-align: center; padding: 20px;">
                🔍 Buscando...
            </p>
        `;

        searchTimeout = setTimeout(function () {
            searchLocations(query);
        }, 300);
    });

    // Enter key
    document.getElementById('location-search-input').addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLocationSelector();
    });
}

/**
 * Close location selector modal
 */
function closeLocationSelector() {
    const modal = document.getElementById('location-search-modal');
    if (modal) modal.remove();
}

/**
 * Search locations using geocoding API
 */
async function searchLocations(query) {
    const Geo = window.YGGeolocation;
    const resultsContainer = document.getElementById('location-results');

    try {
        const results = await Geo.searchLocations(query);

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <p style="color: #888; font-size: 12px; text-align: center; padding: 20px;">
                    No se encontraron resultados para "${query}"
                </p>
            `;
            return;
        }

        resultsContainer.innerHTML = results.map(function (loc) {
            const parts = loc.label.split(', ');
            const name = parts[0];
            const region = parts.slice(1).join(', ');

            return `
                <div class="location-result-item" data-lat="${loc.lat}" data-lon="${loc.lon}" data-label="${loc.label}" data-country="${loc.country || ''}" data-admin1="${loc.admin1 || ''}">
                    <div class="location-result-name">${name}</div>
                    ${region ? '<div class="location-result-region">' + region + '</div>' : ''}
                </div>
            `;
        }).join('');

        // Add click handlers
        resultsContainer.querySelectorAll('.location-result-item').forEach(function (item) {
            item.addEventListener('click', function () {
                selectManualLocation({
                    lat: parseFloat(item.dataset.lat),
                    lon: parseFloat(item.dataset.lon),
                    label: item.dataset.label,
                    country: item.dataset.country,
                    admin1: item.dataset.admin1
                });
            });
        });

    } catch (err) {
        console.error('[Agro] Search error:', err);
        resultsContainer.innerHTML = `
            <p style="color: #f87171; font-size: 12px; text-align: center; padding: 20px;">
                ⚠️ Error al buscar. Verifica tu conexión.
            </p>
        `;
    }
}

/**
 * Select a manual location
 */
async function selectManualLocation(location) {
    const Geo = window.YGGeolocation;
    const descEl = document.getElementById('weather-desc');

    // Save manual location
    Geo.setManualLocation(location);

    // Close modal
    closeLocationSelector();

    // Rebuild controls (will show Manual badge)
    const controls = document.getElementById('location-controls');
    if (controls) controls.remove();
    initLocationControls();

    // Update weather
    if (descEl) descEl.textContent = '🔄 Cargando clima...';

    currentLocation = {
        lat: location.lat,
        lon: location.lon,
        label: location.label,
        source: 'manual'
    };

    await fetchWeather();
    console.log('[Agro] Manual location set:', location.label);
}

/**
 * Fetch weather from Open-Meteo API
 */
async function fetchWeather() {
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const humEl = document.getElementById('weather-humidity');

    if (!tempEl || !currentLocation) return;

    // Check cache first
    const cached = getCachedWeather(currentLocation.lat, currentLocation.lon);
    if (cached) {
        cached.location = currentLocation;
        displayWeather(cached);
        return;
    }

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

        setCachedWeather(weatherData, currentLocation.lat, currentLocation.lon);
        displayWeather(weatherData);

    } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
            console.warn('[Agro] Weather API timeout');
        } else {
            console.error('[Agro] Weather API error:', err);
        }

        tempEl.textContent = '--';
        descEl.textContent = '⚠️ Clima no disponible';
        if (humEl) humEl.textContent = '💧 --%';
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
        const sourceIcon = data.location.source === 'manual' ? '📌' :
            data.location.source === 'gps' ? '📍' :
                data.location.source === 'ip' ? '🌐' : '📌';
        labelEl.innerHTML = sourceIcon + ' ' + data.location.label + ': <span class="highlight" id="weather-temp">' + data.temp + '°C</span>';
    }

    console.log('[Agro] Weather:', desc, '|', (data.location ? data.location.label : 'Unknown'));
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

    console.log('[Agro] Moon Phase:', phaseName, '(Index:', b + ')');
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

    // Refresh weather every 10 minutes
    setInterval(function () {
        if (currentLocation) fetchWeather();
    }, 600000);
});
