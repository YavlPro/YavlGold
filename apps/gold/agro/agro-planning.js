/**
 * YavlGold V9.4 - Agro Planning Module
 * "El Oráculo del Agricultor" - Inteligencia Reactiva
 * Pronóstico extendido 7 días + Consejos Agronómicos Sincronizados con Cultivos
 */

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_COORDS = { lat: 8.13, lon: -71.98 }; // La Grita, Táchira

// Almacenamos datos del pronóstico para acceso global
let currentForecastData = null;

/**
 * Inicializa el módulo de planificación
 */
export async function initPlanning() {
    const container = document.getElementById('forecast-container');

    if (!container) {
        console.warn('[AgroPlanning] Contenedor de pronóstico no encontrado');
        return;
    }

    try {
        // 1. Obtener ubicación
        const pos = await getPosition();
        console.log(`[AgroPlanning] 📍 Ubicación: ${pos.lat}, ${pos.lon}`);

        // 2. Llamar Open-Meteo para 7 días (incluyendo viento)
        const url = `${FORECAST_API}?latitude=${pos.lat}&longitude=${pos.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.daily) throw new Error('Sin datos diarios');

        // 3. Guardar referencia global
        currentForecastData = data.daily;

        // 4. Renderizar visualización interactiva
        renderForecast(data.daily);

        // 5. Auto-seleccionar HOY (índice 0)
        window.selectForecastDay(0);

        console.log('[AgroPlanning] ✅ Oráculo Inteligente inicializado');

    } catch (e) {
        console.error('[AgroPlanning] Error:', e);
        container.innerHTML = '<p class="text-red-400 text-xs p-4">⚠️ Error cargando proyección meteorológica</p>';
    }
}

/**
 * Obtiene la posición del usuario (con fallback)
 */
function getPosition() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(DEFAULT_COORDS);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
            () => resolve(DEFAULT_COORDS),
            { timeout: 5000 }
        );
    });
}

// ============================================
// LECTURA DE CULTIVOS REALES (localStorage)
// ============================================

function getUserCrops() {
    try {
        const crops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
        return crops.map(c => c.name ? c.name.toLowerCase() : '');
    } catch (e) {
        console.warn('[AgroPlanning] Error leyendo cultivos:', e);
        return [];
    }
}

// ============================================
// RENDERIZADOR INTERACTIVO
// ============================================

function renderForecast(daily) {
    const container = document.getElementById('forecast-container');
    if (!container) return;

    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let html = '';

    for (let i = 0; i < 7; i++) {
        // Fix: Parse manually to avoid UTC timezone adjustment
        const [y, m, d] = daily.time[i].split('-').map(Number);
        const date = new Date(y, m - 1, d);

        const dayName = days[date.getDay()];
        const isToday = i === 0;
        const tempMax = Math.round(daily.temperature_2m_max[i]);
        const rain = daily.precipitation_sum[i] || 0;
        const isRainy = rain > 2;

        // Altura de barra (escala: 40°C = 100%)
        const height = Math.min(95, Math.max(20, (tempMax / 40) * 100));

        // Colores según condición
        const barColor = isRainy ? 'bg-blue-500' : 'bg-amber-500';
        const icon = isRainy ? '💧' : (tempMax > 28 ? '☀️' : '⛅');

        html += `
            <div class="forecast-day ${isToday ? 'today' : ''}" id="day-card-${i}" onclick="window.selectForecastDay(${i})">
                <span class="day-name">${isToday ? 'HOY' : dayName}</span>
                <span class="day-icon">${icon}</span>
                <div class="bar-container">
                    <div class="bar ${barColor}" style="height: ${height}%"></div>
                </div>
                <span class="temp-value">${tempMax}°</span>
                <span class="rain-value">${rain > 0 ? rain.toFixed(1) + 'mm' : ''}</span>
            </div>
        `;
    }

    container.innerHTML = html;
    injectForecastStyles();
}

// ============================================
// CEREBRO DE LA IA - Selección Interactiva
// ============================================

window.selectForecastDay = function (index) {
    if (!currentForecastData || !currentForecastData.time) return;

    // 1. Highlight Visual - Reset all, activate selected
    for (let i = 0; i < 7; i++) {
        const el = document.getElementById(`day-card-${i}`);
        if (el) {
            el.classList.remove('selected');
            if (i === index) {
                el.classList.add('selected');
            }
        }
    }

    // 2. Extraer datos del día seleccionado
    const dayData = {
        date: currentForecastData.time[index],
        rain: currentForecastData.precipitation_sum[index] || 0,
        tempMax: currentForecastData.temperature_2m_max[index],
        tempMin: currentForecastData.temperature_2m_min[index],
        wind: currentForecastData.wind_speed_10m_max ? currentForecastData.wind_speed_10m_max[index] : 0
    };

    // 3. Generar consejo inteligente
    generateSmartAdvice(dayData, index === 0);
};

// ============================================
// MOTOR DE REGLAS - Sincronizado con Cultivos
// ============================================

function generateSmartAdvice(data, isToday) {
    const userCrops = getUserCrops();

    // Parse fecha correctamente (sin UTC shift)
    const [y, m, d] = data.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dateStr = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' });

    let title = isToday ? '📡 Análisis en Tiempo Real' : `📅 Previsión: ${dateStr}`;
    let text = '';
    let tags = [];
    let type = 'neutral'; // neutral, warning, danger, success

    // ========== REGLAS CLIMÁTICAS BASE (FORMATO RICO) ==========

    // 1. Lluvia Extrema (>15mm)
    if (data.rain > 15) {
        text = `🌧️ <strong class="text-red-400">PRECIPITACIÓN INTENSA:</strong> Se esperan <strong>${data.rain.toFixed(1)}mm</strong> de lluvia. <span style="color: #fbbf24;">Suspender fertirriego</span> y preparar drenaje. Riesgo de <strong>erosión</strong> y lavado de nutrientes.`;
        tags.push('🚿 Drenaje', '⚠️ Erosión');
        type = 'danger';
    }
    // 2. Calor Extremo (>32°C)
    else if (data.tempMax > 32) {
        text = `🌡️ <strong class="text-orange-400">ESTRÉS TÉRMICO:</strong> Temperatura máxima de <strong>${Math.round(data.tempMax)}°C</strong>. <span style="color: #4ade80;">Aumentar riego</span> en horas frescas (6-8 AM). <strong>Evitar</strong> aplicaciones químicas al mediodía.`;
        tags.push('💧 Hidratación', '🏕️ Sombra');
        type = 'warning';
    }
    // 3. Viento Fuerte (>25km/h)
    else if (data.wind > 25) {
        text = `💨 <strong class="text-orange-400">RÁFAGAS FUERTES:</strong> Vientos de hasta <strong>${Math.round(data.wind)} km/h</strong>. <span style="color: #fbbf24;">Asegurar tutores</span>, revisar invernaderos y proteger cultivos altos.`;
        tags.push('🔧 Infraestructura');
        type = 'warning';
    }
    // 4. Frío Peligroso (<10°C)
    else if (data.tempMin < 10) {
        text = `❄️ <strong class="text-blue-400">RIESGO DE HELADAS:</strong> Mínima de <strong>${Math.round(data.tempMin)}°C</strong>. <span style="color: #fbbf24;">Protege cultivos sensibles</span> con cobertores. Regar en la mañana para atenuar el frío.`;
        tags.push('🛡️ Proteger', '🌅 Riego AM');
        type = 'warning';
    }
    // 5. Lluvia Moderada (5-15mm)
    else if (data.rain > 5) {
        text = `🌦️ <strong class="text-blue-400">LLUVIA MODERADA:</strong> Se esperan <strong>${data.rain.toFixed(1)}mm</strong>. <span style="color: #4ade80;">Reducir riego artificial</span>. Buen momento para aplicaciones foliares post-lluvia.`;
        tags.push('💦 Ajustar Riego');
        type = 'warning';
    }
    // 6. Condiciones Ideales
    else {
        text = `✨ <strong class="text-green-400">CONDICIONES ÓPTIMAS:</strong> Ventana climática <span style="color: #4ade80;">favorable</span> para labores de campo. Ideal para <strong>poda</strong>, <strong>fertilización</strong> y trasplantes.`;
        tags.push('✅ Operativo');
        type = 'success';
    }

    // ========== SINCRONIZACIÓN CON CULTIVOS (ALERTAS PERSONALIZADAS) ==========

    // Regla: Tomate/Papa + Lluvia = HONGOS (Tizón)
    if (data.rain > 5 && userCrops.some(c => c.includes('tomate') || c.includes('papa'))) {
        text = `🍅 <strong class="text-red-400">ALERTA FUNGOSA:</strong> La humedad (${data.rain.toFixed(1)}mm) crea condiciones para <strong>Tizón</strong> en tus <span style="color: #C8A752;">Tomates/Papas</span>. <strong style="color: #ef4444;">Aplicar fungicida preventivo AHORA.</strong>`;
        tags = ['💊 Fungicida', '🍅 Solanáceas'];
        type = 'danger';
    }

    // Regla: Maíz/Plátano + Viento = CAÍDA (Acame)
    if (data.wind > 20 && userCrops.some(c => c.includes('maiz') || c.includes('maíz') || c.includes('platano') || c.includes('plátano') || c.includes('cambur'))) {
        text = `🌽 <strong class="text-orange-400">ALERTA DE VIENTO:</strong> Ráfagas de <strong>${Math.round(data.wind)} km/h</strong>. Riesgo de <strong>acame</strong> en tus <span style="color: #C8A752;">Maíz/Plátano</span>. Revisar tutores y barreras.`;
        tags = ['💨 Viento', '⚠️ Acame'];
        type = 'warning';
    }

    // Regla: Hortalizas + Calor = Estrés Hídrico
    if (data.tempMax > 30 && userCrops.some(c => c.includes('lechuga') || c.includes('cilantro') || c.includes('espinaca'))) {
        text = `🥬 <strong class="text-orange-400">ALERTA HORTALIZA:</strong> <strong>${Math.round(data.tempMax)}°C</strong> es crítico para <span style="color: #C8A752;">Lechuga/Cilantro</span>. <span style="color: #4ade80;">Aumentar riego 2x</span> y activar malla sombra.`;
        tags = ['💧 Riego Extra', '🏕️ Sombra'];
        type = 'warning';
    }

    // Regla: Café + Helada
    if (data.tempMin < 12 && userCrops.some(c => c.includes('cafe') || c.includes('café'))) {
        text = `☕ <strong class="text-blue-400">ALERTA CAFÉ:</strong> Temperatura de <strong>${Math.round(data.tempMin)}°C</strong>. Los cafetales son sensibles al frío. <span style="color: #fbbf24;">Regar temprano</span> para proteger raíces.`;
        tags = ['☕ Café', '🌅 Riego AM'];
        type = 'warning';
    }

    // Actualizar UI
    updateAdviceUI(title, text, tags, type);
}

function updateAdviceUI(title, text, tags, type) {
    const titleEl = document.getElementById('advice-title');
    const textEl = document.getElementById('advice-text');
    const tagsEl = document.getElementById('advice-tags');

    if (!titleEl || !textEl) return;

    // Colores según severidad
    let colorClass = 'text-gold';
    if (type === 'danger') colorClass = 'text-red-500';
    if (type === 'warning') colorClass = 'text-orange-400';
    if (type === 'success') colorClass = 'text-green-400';

    titleEl.className = `font-bold text-sm mb-1 capitalize ${colorClass} transition-colors duration-300`;
    titleEl.textContent = title;
    textEl.innerHTML = text; // Rich HTML formatting

    if (tagsEl) {
        tagsEl.innerHTML = tags.map(t =>
            `<span class="advice-tag">${t}</span>`
        ).join('');
    }

    // Animación visual de "pensando" en el icono del bot
    const iconEl = document.querySelector('#advice-panel .fa-robot, #advice-panel .fa-brain');
    if (iconEl) {
        iconEl.classList.add('animate-pulse');
        setTimeout(() => iconEl.classList.remove('animate-pulse'), 1000);
    }
}

// ============================================
// ESTILOS CSS INYECTADOS
// ============================================

function injectForecastStyles() {
    if (document.getElementById('forecast-styles')) return;

    const style = document.createElement('style');
    style.id = 'forecast-styles';
    style.textContent = `
        #forecast-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 4px;
            height: 140px;
            padding: 12px 0;
            margin-top: 16px; /* Fix: Espaciado extra para evitar solapamiento */
        }

        .forecast-day {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            flex: 1;
            padding: 6px 4px;
            border-radius: 8px;
            transition: all 0.25s ease;
            cursor: pointer;
            border: 1px solid transparent;
        }

        .forecast-day:hover {
            background: rgba(255, 255, 255, 0.05);
            transform: scale(1.03);
        }

        .forecast-day.today {
            background: rgba(200, 167, 82, 0.1);
            border: 1px solid rgba(200, 167, 82, 0.2);
        }

        .forecast-day.selected {
            background: rgba(200, 167, 82, 0.15);
            border: 1px solid rgba(200, 167, 82, 0.5);
            transform: scale(1.05);
            box-shadow: 0 0 15px rgba(200, 167, 82, 0.2);
        }

        .day-name {
            font-size: 10px;
            color: #888;
            font-weight: 600;
            text-transform: uppercase;
        }

        .forecast-day.today .day-name,
        .forecast-day.selected .day-name {
            color: var(--gold-primary, #C8A752);
        }

        .day-icon {
            font-size: 14px;
        }

        .bar-container {
            width: 8px;
            height: 60px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            display: flex;
            align-items: flex-end;
            overflow: hidden;
        }

        .bar {
            width: 100%;
            border-radius: 4px 4px 0 0;
            transition: height 0.5s ease;
        }

        .bg-blue-500 { background: #3b82f6; }
        .bg-amber-500 { background: #f59e0b; }

        .temp-value {
            font-size: 11px;
            font-weight: 700;
            color: #e5e5e5;
            font-family: 'Orbitron', monospace;
        }

        .rain-value {
            font-size: 9px;
            color: #60a5fa;
            height: 12px;
        }

        .advice-tag {
            font-size: 10px;
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            color: #aaa;
        }

        .text-gold { color: var(--gold-primary, #C8A752); }
        .text-red-500 { color: #ef4444; }
        .text-orange-400 { color: #fb923c; }
        .text-green-400 { color: #4ade80; }

        .animate-pulse {
            animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    document.head.appendChild(style);
}
