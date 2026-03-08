/**
 * YavlGold Agro — Clima Agro (Vista Dedicada)
 * Módulo lazy-loaded para la vista completa de clima agrícola.
 * Lee ubicación de window.YGAgroLocationContext (publicado por dashboard.js)
 * y hace fetch propio a Open-Meteo para datos extendidos.
 */
'use strict';

const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';

const WMO_CODES = {
    0: { desc: 'Despejado', icon: '☀️', iconNight: '🌙' },
    1: { desc: 'Mayormente despejado', icon: '🌤️', iconNight: '🌙' },
    2: { desc: 'Parcialmente nublado', icon: '⛅', iconNight: '☁️' },
    3: { desc: 'Nublado', icon: '☁️', iconNight: '☁️' },
    45: { desc: 'Niebla', icon: '🌫️', iconNight: '🌫️' },
    48: { desc: 'Niebla con escarcha', icon: '🌫️', iconNight: '🌫️' },
    51: { desc: 'Llovizna ligera', icon: '🌦️', iconNight: '🌧️' },
    53: { desc: 'Llovizna moderada', icon: '🌦️', iconNight: '🌧️' },
    55: { desc: 'Llovizna intensa', icon: '🌧️', iconNight: '🌧️' },
    61: { desc: 'Lluvia ligera', icon: '🌧️', iconNight: '🌧️' },
    63: { desc: 'Lluvia moderada', icon: '🌧️', iconNight: '🌧️' },
    65: { desc: 'Lluvia intensa', icon: '🌧️', iconNight: '🌧️' },
    71: { desc: 'Nevada ligera', icon: '🌨️', iconNight: '🌨️' },
    73: { desc: 'Nevada moderada', icon: '🌨️', iconNight: '🌨️' },
    75: { desc: 'Nevada intensa', icon: '❄️', iconNight: '❄️' },
    80: { desc: 'Chubascos ligeros', icon: '🌦️', iconNight: '🌧️' },
    82: { desc: 'Chubascos fuertes', icon: '⛈️', iconNight: '⛈️' },
    95: { desc: 'Tormenta eléctrica', icon: '⛈️', iconNight: '⛈️' },
    99: { desc: 'Tormenta con granizo', icon: '⛈️', iconNight: '⛈️' }
};

function resolveWMO(code, isDay) {
    const entry = WMO_CODES[code] || WMO_CODES[Math.floor(code / 10) * 10] || { desc: 'Desconocido', icon: '❓', iconNight: '❓' };
    return { desc: entry.desc, icon: isDay !== 0 ? entry.icon : entry.iconNight };
}

let _initialized = false;
let _container = null;
let _locationCtx = null;
let _weatherData = null;

function getLocationContext() {
    if (window.YGAgroLocationContext) return window.YGAgroLocationContext;
    const Geo = window.YGGeolocation;
    if (!Geo) return null;
    try {
        const manual = Geo.getManualLocation?.();
        if (manual) return { lat: manual.lat, lon: manual.lon, label: manual.label, source: 'manual' };
        const pref = Geo.getLocationPreference?.() || 'gps';
        const cached = Geo.getCachedCoords?.(pref === 'ip' ? 'ip' : 'gps');
        if (cached) return cached;
    } catch (_e) { /* ignore */ }
    return null;
}

async function fetchClimaData(lat, lon) {
    const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}`
        + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl`
        + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset,uv_index_max`
        + `&timezone=auto&forecast_days=7`;

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
    } catch (err) {
        clearTimeout(tid);
        throw err;
    }
}

function windDirLabel(deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return dirs[Math.round(deg / 45) % 8] || '—';
}

function getAgroAdvice(code, temp, humidity, wind, rain) {
    const tips = [];
    if (code >= 95) tips.push({ icon: '⚠️', text: 'Tormenta activa — suspender labores de campo.', level: 'danger' });
    else if (code >= 61) tips.push({ icon: '🌧️', text: 'Lluvia significativa — evitar aplicación de agroquímicos.', level: 'warning' });
    else if (code >= 51) tips.push({ icon: '💧', text: 'Llovizna — buen momento para trasplantes.', level: 'info' });
    else if (code <= 1 && temp > 30) tips.push({ icon: '🔥', text: 'Calor intenso — regar en horas frescas (antes 7AM o después 5PM).', level: 'warning' });
    else if (code <= 1) tips.push({ icon: '☀️', text: 'Clima despejado — ideal para labores de campo y secado.', level: 'success' });

    if (humidity > 85) tips.push({ icon: '🍄', text: `Humedad alta (${humidity}%) — vigilar hongos y enfermedades foliares.`, level: 'warning' });
    if (humidity < 30) tips.push({ icon: '🏜️', text: `Humedad baja (${humidity}%) — aumentar frecuencia de riego.`, level: 'warning' });
    if (wind > 40) tips.push({ icon: '💨', text: `Viento fuerte (${wind} km/h) — proteger cultivos delicados.`, level: 'warning' });
    if (rain > 20) tips.push({ icon: '🚿', text: `Precipitación alta (${rain}mm) — revisar drenaje y erosión.`, level: 'warning' });

    if (tips.length === 0) tips.push({ icon: '✅', text: 'Condiciones normales para actividades agrícolas.', level: 'info' });
    return tips;
}

function renderClimaView(data) {
    if (!_container) return;
    const c = data.current;
    const d = data.daily;
    const tz = data.timezone || 'auto';
    const loc = _locationCtx;

    const wmo = resolveWMO(c.weather_code, c.is_day);
    const advice = getAgroAdvice(c.weather_code, c.temperature_2m, c.relative_humidity_2m, c.wind_speed_10m, d.precipitation_sum?.[0] || 0);

    const sourceLabel = loc?.source === 'manual' ? '📌 Manual' : loc?.source === 'gps' ? '📍 GPS' : '🌐 IP';

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    let forecastHTML = '';
    for (let i = 0; i < Math.min(7, (d.time || []).length); i++) {
        const [y, m, dd] = d.time[i].split('-').map(Number);
        const date = new Date(y, m - 1, dd);
        const dayName = i === 0 ? 'Hoy' : dayNames[date.getDay()];
        const fwmo = resolveWMO(d.weather_code[i], 1);
        const rain = d.precipitation_sum[i] || 0;
        const uvMax = d.uv_index_max?.[i] || 0;

        forecastHTML += `
            <div class="clima-forecast-day ${i === 0 ? 'is-today' : ''}">
                <div class="clima-forecast-day__name">${dayName}</div>
                <div class="clima-forecast-day__date">${dd}/${m}</div>
                <div class="clima-forecast-day__icon">${fwmo.icon}</div>
                <div class="clima-forecast-day__temps">
                    <span class="clima-temp-max">${Math.round(d.temperature_2m_max[i])}°</span>
                    <span class="clima-temp-min">${Math.round(d.temperature_2m_min[i])}°</span>
                </div>
                <div class="clima-forecast-day__rain">${rain > 0 ? rain.toFixed(1) + 'mm' : '—'}</div>
                ${uvMax >= 6 ? `<div class="clima-forecast-day__uv">UV ${Math.round(uvMax)}</div>` : ''}
            </div>`;
    }

    let adviceHTML = '';
    advice.forEach(tip => {
        adviceHTML += `<div class="clima-tip clima-tip--${tip.level}"><span class="clima-tip__icon">${tip.icon}</span><span class="clima-tip__text">${tip.text}</span></div>`;
    });

    _container.innerHTML = `
        <div class="clima-view">
            <header class="clima-view__header">
                <div class="clima-view__title-group">
                    <h2 class="clima-view__title">Clima Agro</h2>
                    <p class="clima-view__location">${sourceLabel} ${loc?.label || 'Ubicación desconocida'}</p>
                </div>
                <div class="clima-view__actions">
                    <button type="button" class="clima-btn-location" id="clima-btn-change-loc" title="Cambiar ubicación">📌 Cambiar</button>
                    <button type="button" class="clima-btn-refresh" id="clima-btn-refresh" title="Actualizar clima">🔄 Actualizar</button>
                </div>
            </header>

            <div class="clima-view__body">
                <section class="clima-current">
                    <div class="clima-current__main">
                        <div class="clima-current__icon">${wmo.icon}</div>
                        <div class="clima-current__temp">${Math.round(c.temperature_2m)}°C</div>
                        <div class="clima-current__desc">${wmo.desc}</div>
                    </div>
                    <div class="clima-current__details">
                        <div class="clima-detail">
                            <span class="clima-detail__label">Sensación</span>
                            <span class="clima-detail__value">${Math.round(c.apparent_temperature)}°C</span>
                        </div>
                        <div class="clima-detail">
                            <span class="clima-detail__label">Humedad</span>
                            <span class="clima-detail__value">${c.relative_humidity_2m}%</span>
                        </div>
                        <div class="clima-detail">
                            <span class="clima-detail__label">Viento</span>
                            <span class="clima-detail__value">${Math.round(c.wind_speed_10m)} km/h ${windDirLabel(c.wind_direction_10m)}</span>
                        </div>
                        <div class="clima-detail">
                            <span class="clima-detail__label">Presión</span>
                            <span class="clima-detail__value">${Math.round(c.pressure_msl)} hPa</span>
                        </div>
                        <div class="clima-detail">
                            <span class="clima-detail__label">Precip. hoy</span>
                            <span class="clima-detail__value">${(d.precipitation_sum?.[0] || 0).toFixed(1)} mm</span>
                        </div>
                        <div class="clima-detail">
                            <span class="clima-detail__label">UV máx</span>
                            <span class="clima-detail__value">${(d.uv_index_max?.[0] || 0).toFixed(1)}</span>
                        </div>
                    </div>
                </section>

                <section class="clima-advice">
                    <h3 class="clima-advice__title">🌾 Consejo Agrícola</h3>
                    <div class="clima-advice__list">${adviceHTML}</div>
                </section>

                <section class="clima-forecast">
                    <h3 class="clima-forecast__title">📅 Pronóstico 7 Días</h3>
                    <div class="clima-forecast__grid">${forecastHTML}</div>
                </section>
            </div>

            <footer class="clima-view__footer">
                <span>Datos: Open-Meteo · TZ: ${tz}</span>
                <span>Actualizado: ${new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
            </footer>
        </div>`;

    bindClimaEvents();
}

function renderLoading() {
    if (!_container) return;
    _container.innerHTML = `
        <div class="clima-view clima-view--loading">
            <div class="clima-loading">
                <div class="clima-loading__icon">☁️</div>
                <div class="clima-loading__text">Cargando Clima Agro...</div>
            </div>
        </div>`;
}

function renderError(msg) {
    if (!_container) return;
    _container.innerHTML = `
        <div class="clima-view clima-view--error">
            <div class="clima-error">
                <div class="clima-error__icon">⚠️</div>
                <div class="clima-error__title">No se pudo cargar el clima</div>
                <p class="clima-error__text">${msg}</p>
                <button type="button" class="clima-btn-refresh" id="clima-btn-retry">🔄 Reintentar</button>
            </div>
        </div>`;
    document.getElementById('clima-btn-retry')?.addEventListener('click', () => loadClima());
}

function bindClimaEvents() {
    document.getElementById('clima-btn-refresh')?.addEventListener('click', () => loadClima());
    document.getElementById('clima-btn-change-loc')?.addEventListener('click', () => {
        if (typeof window.YGGeolocation?.searchLocations === 'function') {
            openClimaLocationModal();
        }
    });
}

function openClimaLocationModal() {
    if (document.getElementById('clima-location-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'clima-location-modal';
    modal.className = 'clima-loc-modal';
    modal.innerHTML = `
        <div class="clima-loc-modal__box">
            <div class="clima-loc-modal__header">
                <h3>📌 Cambiar Ubicación</h3>
                <button type="button" class="clima-loc-modal__close" id="clima-loc-close">×</button>
            </div>
            <input type="text" class="clima-loc-modal__input" id="clima-loc-input" placeholder="Buscar ciudad..." autocomplete="off">
            <div class="clima-loc-modal__results" id="clima-loc-results">
                <p style="color:rgba(255,255,255,0.5);font-size:0.8rem;text-align:center;padding:1.5rem;">Escribe al menos 2 caracteres</p>
            </div>
        </div>`;
    document.body.appendChild(modal);

    const input = document.getElementById('clima-loc-input');
    const results = document.getElementById('clima-loc-results');
    const closeBtn = document.getElementById('clima-loc-close');

    setTimeout(() => input?.focus(), 100);

    closeBtn?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    let searchTimer = null;
    let searchId = 0;
    input?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = input.value.trim();
        const myId = ++searchId;
        if (q.length < 2) {
            results.innerHTML = '<p style="color:rgba(255,255,255,0.5);font-size:0.8rem;text-align:center;padding:1.5rem;">Escribe al menos 2 caracteres</p>';
            return;
        }
        results.innerHTML = '<p style="color:rgba(255,255,255,0.5);font-size:0.8rem;text-align:center;padding:1.5rem;">🔍 Buscando...</p>';
        searchTimer = setTimeout(async () => {
            try {
                const locs = await window.YGGeolocation.searchLocations(q);
                if (myId !== searchId) return;
                if (!locs.length) { results.innerHTML = '<p style="color:rgba(255,255,255,0.5);font-size:0.8rem;text-align:center;padding:1.5rem;">Sin resultados</p>'; return; }
                results.innerHTML = '';
                locs.forEach(loc => {
                    const item = document.createElement('div');
                    item.className = 'clima-loc-result';
                    item.textContent = loc.label || `${loc.lat}, ${loc.lon}`;
                    item.addEventListener('click', () => {
                        const Geo = window.YGGeolocation;
                        Geo.setManualLocation(loc);
                        _locationCtx = { lat: loc.lat, lon: loc.lon, label: loc.label, source: 'manual' };
                        modal.remove();
                        loadClima();
                    });
                    results.appendChild(item);
                });
            } catch (err) {
                if (myId !== searchId) return;
                results.innerHTML = `<p style="color:#ef4444;font-size:0.8rem;text-align:center;padding:1.5rem;">Error: ${err.message}</p>`;
            }
        }, 350);
    });

    input?.addEventListener('keydown', e => { if (e.key === 'Escape') modal.remove(); });
}

async function loadClima() {
    _locationCtx = getLocationContext();
    if (!_locationCtx || !Number.isFinite(_locationCtx.lat)) {
        renderError('Ubicación no disponible. Intenta activar GPS o seleccionar una ubicación manual.');
        return;
    }
    renderLoading();
    try {
        _weatherData = await fetchClimaData(_locationCtx.lat, _locationCtx.lon);
        renderClimaView(_weatherData);
    } catch (err) {
        console.error('[ClimaAgro] Fetch error:', err);
        renderError(err.name === 'AbortError' ? 'Timeout — la conexión tardó demasiado.' : err.message);
    }
}

function injectClimaStyles() {
    if (document.getElementById('agro-clima-styles')) return;
    const style = document.createElement('style');
    style.id = 'agro-clima-styles';
    style.textContent = `
        .clima-view {
            max-width: 900px;
            margin: 0 auto;
            padding: 0 0.5rem;
        }
        .clima-view__header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 1rem;
            padding: 1.2rem 0;
            border-bottom: 1px solid rgba(200,167,82,0.15);
            flex-wrap: wrap;
        }
        .clima-view__title {
            margin: 0;
            font-family: 'Orbitron', sans-serif;
            font-size: 1.15rem;
            letter-spacing: 1.5px;
            color: #fff;
            text-transform: uppercase;
        }
        .clima-view__location {
            margin: 0.3rem 0 0;
            font-size: 0.82rem;
            color: rgba(255,255,255,0.6);
            font-family: 'Rajdhani', sans-serif;
        }
        .clima-view__actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        .clima-btn-location,
        .clima-btn-refresh {
            border: 1px solid rgba(200,167,82,0.35);
            background: rgba(200,167,82,0.08);
            color: #C8A752;
            border-radius: 10px;
            padding: 0.4rem 0.7rem;
            font-size: 0.72rem;
            font-weight: 700;
            cursor: pointer;
            transition: background 180ms ease, border-color 180ms ease;
            font-family: 'Rajdhani', sans-serif;
            letter-spacing: 0.3px;
        }
        .clima-btn-location:hover,
        .clima-btn-refresh:hover {
            background: rgba(200,167,82,0.18);
            border-color: rgba(200,167,82,0.6);
        }
        .clima-view__body {
            display: flex;
            flex-direction: column;
            gap: 1.2rem;
            padding: 1.2rem 0;
        }

        /* Current conditions */
        .clima-current {
            display: flex;
            gap: 1.5rem;
            align-items: stretch;
            flex-wrap: wrap;
        }
        .clima-current__main {
            flex: 0 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-width: 180px;
            padding: 1.5rem 2rem;
            border: 1px solid rgba(200,167,82,0.2);
            border-radius: 18px;
            background:
                linear-gradient(135deg, rgba(200,167,82,0.08) 0%, rgba(200,167,82,0.02) 100%),
                rgba(8,8,8,0.92);
        }
        .clima-current__icon {
            font-size: 3.5rem;
            line-height: 1;
            margin-bottom: 0.5rem;
            filter: drop-shadow(0 2px 8px rgba(200,167,82,0.15));
        }
        .clima-current__temp {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.8rem;
            font-weight: 700;
            color: #fff;
            line-height: 1.1;
        }
        .clima-current__desc {
            font-size: 0.88rem;
            color: rgba(255,255,255,0.7);
            margin-top: 0.3rem;
            font-family: 'Rajdhani', sans-serif;
        }
        .clima-current__details {
            flex: 1;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 0.6rem;
            min-width: 0;
        }
        .clima-detail {
            padding: 0.7rem 0.85rem;
            border: 1px solid rgba(200,167,82,0.12);
            border-radius: 12px;
            background: rgba(15,15,15,0.7);
            display: flex;
            flex-direction: column;
            gap: 0.15rem;
        }
        .clima-detail__label {
            font-size: 0.68rem;
            color: rgba(255,255,255,0.5);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-family: 'Rajdhani', sans-serif;
        }
        .clima-detail__value {
            font-size: 0.95rem;
            font-weight: 700;
            color: #C8A752;
            font-family: 'Rajdhani', sans-serif;
        }

        /* Agro advice */
        .clima-advice {
            border: 1px solid rgba(200,167,82,0.15);
            border-radius: 16px;
            padding: 1rem 1.1rem;
            background: rgba(8,8,8,0.9);
        }
        .clima-advice__title {
            margin: 0 0 0.7rem;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.78rem;
            letter-spacing: 1px;
            color: #C8A752;
            text-transform: uppercase;
        }
        .clima-advice__list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .clima-tip {
            display: flex;
            align-items: flex-start;
            gap: 0.6rem;
            padding: 0.6rem 0.75rem;
            border-radius: 10px;
            font-size: 0.82rem;
            color: rgba(255,255,255,0.85);
            line-height: 1.4;
            font-family: 'Rajdhani', sans-serif;
        }
        .clima-tip--success { background: rgba(34,197,94,0.08); border-left: 3px solid rgba(34,197,94,0.5); }
        .clima-tip--info { background: rgba(200,167,82,0.06); border-left: 3px solid rgba(200,167,82,0.4); }
        .clima-tip--warning { background: rgba(234,179,8,0.08); border-left: 3px solid rgba(234,179,8,0.5); }
        .clima-tip--danger { background: rgba(239,68,68,0.08); border-left: 3px solid rgba(239,68,68,0.5); }
        .clima-tip__icon { flex-shrink: 0; font-size: 1rem; }
        .clima-tip__text { flex: 1; }

        /* 7-day forecast */
        .clima-forecast {
            border: 1px solid rgba(200,167,82,0.15);
            border-radius: 16px;
            padding: 1rem 1.1rem;
            background: rgba(8,8,8,0.9);
        }
        .clima-forecast__title {
            margin: 0 0 0.8rem;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.78rem;
            letter-spacing: 1px;
            color: #C8A752;
            text-transform: uppercase;
        }
        .clima-forecast__grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 0.4rem;
        }
        .clima-forecast-day {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            padding: 0.65rem 0.3rem;
            border: 1px solid rgba(200,167,82,0.1);
            border-radius: 12px;
            background: rgba(15,15,15,0.6);
            transition: border-color 160ms ease, background 160ms ease;
        }
        .clima-forecast-day:hover {
            border-color: rgba(200,167,82,0.3);
            background: rgba(200,167,82,0.04);
        }
        .clima-forecast-day.is-today {
            border-color: rgba(200,167,82,0.4);
            background:
                linear-gradient(180deg, rgba(200,167,82,0.1) 0%, rgba(200,167,82,0.02) 100%),
                rgba(12,12,12,0.9);
        }
        .clima-forecast-day__name {
            font-family: 'Orbitron', sans-serif;
            font-size: 0.62rem;
            font-weight: 700;
            color: rgba(255,255,255,0.8);
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .clima-forecast-day.is-today .clima-forecast-day__name {
            color: #C8A752;
        }
        .clima-forecast-day__date {
            font-size: 0.6rem;
            color: rgba(255,255,255,0.4);
        }
        .clima-forecast-day__icon {
            font-size: 1.5rem;
            line-height: 1;
            margin: 0.15rem 0;
        }
        .clima-forecast-day__temps {
            display: flex;
            gap: 0.3rem;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 700;
        }
        .clima-temp-max { font-size: 0.82rem; color: #fff; }
        .clima-temp-min { font-size: 0.72rem; color: rgba(255,255,255,0.45); }
        .clima-forecast-day__rain {
            font-size: 0.62rem;
            color: rgba(100,180,255,0.7);
            font-family: 'Rajdhani', sans-serif;
        }
        .clima-forecast-day__uv {
            font-size: 0.58rem;
            color: #ef4444;
            font-weight: 700;
        }

        /* Footer */
        .clima-view__footer {
            display: flex;
            justify-content: space-between;
            padding: 0.7rem 0;
            border-top: 1px solid rgba(200,167,82,0.1);
            font-size: 0.65rem;
            color: rgba(255,255,255,0.35);
            font-family: 'Rajdhani', sans-serif;
        }

        /* Loading / Error states */
        .clima-view--loading,
        .clima-view--error {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 400px;
        }
        .clima-loading,
        .clima-error {
            text-align: center;
        }
        .clima-loading__icon,
        .clima-error__icon {
            font-size: 3rem;
            margin-bottom: 0.8rem;
        }
        .clima-loading__text {
            font-family: 'Rajdhani', sans-serif;
            font-size: 0.9rem;
            color: rgba(255,255,255,0.6);
        }
        .clima-error__title {
            font-family: 'Orbitron', sans-serif;
            font-size: 0.9rem;
            color: #fff;
            margin-bottom: 0.5rem;
        }
        .clima-error__text {
            font-size: 0.8rem;
            color: rgba(255,255,255,0.5);
            margin: 0 0 1rem;
        }

        /* Location modal */
        .clima-loc-modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.85);
            backdrop-filter: blur(6px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .clima-loc-modal__box {
            background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
            border: 1px solid rgba(200,167,82,0.3);
            border-radius: 16px;
            padding: 1.2rem;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 0 50px rgba(200,167,82,0.1);
        }
        .clima-loc-modal__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        .clima-loc-modal__header h3 {
            margin: 0;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.78rem;
            color: #C8A752;
            letter-spacing: 1px;
        }
        .clima-loc-modal__close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.5);
            font-size: 1.3rem;
            cursor: pointer;
            padding: 0.2rem 0.4rem;
        }
        .clima-loc-modal__input {
            width: 100%;
            padding: 0.7rem 0.9rem;
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(200,167,82,0.3);
            border-radius: 10px;
            color: #fff;
            font-size: 0.85rem;
            font-family: 'Rajdhani', sans-serif;
            outline: none;
            box-sizing: border-box;
        }
        .clima-loc-modal__input:focus {
            border-color: #C8A752;
            box-shadow: 0 0 0 2px rgba(200,167,82,0.15);
        }
        .clima-loc-modal__results {
            margin-top: 0.7rem;
            max-height: 280px;
            overflow-y: auto;
        }
        .clima-loc-result {
            padding: 0.7rem 0.85rem;
            border-radius: 10px;
            cursor: pointer;
            font-size: 0.82rem;
            color: rgba(255,255,255,0.85);
            transition: background 150ms ease;
            border: 1px solid transparent;
            font-family: 'Rajdhani', sans-serif;
        }
        .clima-loc-result:hover {
            background: rgba(200,167,82,0.1);
            border-color: rgba(200,167,82,0.25);
        }

        /* Responsive */
        @media (max-width: 600px) {
            .clima-forecast__grid {
                grid-template-columns: repeat(4, 1fr);
            }
            .clima-current {
                flex-direction: column;
            }
            .clima-current__main {
                min-width: unset;
            }
        }
    `;
    document.head.appendChild(style);
}

export async function initAgroClima(options = {}) {
    _container = document.getElementById('agro-clima-root');
    if (!_container) {
        console.warn('[ClimaAgro] Root container not found');
        return;
    }

    injectClimaStyles();

    if (!_initialized || options.forceRefresh) {
        _initialized = true;
        await loadClima();
    }
}
