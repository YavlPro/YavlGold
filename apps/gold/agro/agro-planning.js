/**
 * YavlGold V9.4 - Agro Planning Module
 * "El Oráculo del Agricultor"
 * Pronóstico extendido 7 días + Consejos Agronómicos
 */

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_COORDS = { lat: 8.13, lon: -71.98 }; // La Grita, Táchira

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

        // 2. Llamar Open-Meteo para 7 días
        const url = `${FORECAST_API}?latitude=${pos.lat}&longitude=${pos.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.daily) throw new Error('Sin datos diarios');

        // 3. Renderizar visualización
        renderForecast(data.daily);

        // 4. Generar consejos agronómicos
        generateAdvice(data.daily);

        console.log('[AgroPlanning] ✅ Oráculo inicializado');

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

/**
 * Renderiza el gráfico de barras del pronóstico semanal
 */
function renderForecast(daily) {
    const container = document.getElementById('forecast-container');
    if (!container) return;

    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let html = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date(daily.time[i]);
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
            <div class="forecast-day ${isToday ? 'today' : ''}">
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

/**
 * Genera consejos agronómicos basados en el pronóstico
 */
function generateAdvice(daily) {
    const titleEl = document.getElementById('advice-title');
    const textEl = document.getElementById('advice-text');
    const tagsEl = document.getElementById('advice-tags');

    if (!titleEl || !textEl) return;

    // Análisis de datos
    const totalRain = daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0);
    const maxTemp = Math.max(...daily.temperature_2m_max);
    const minTemp = Math.min(...daily.temperature_2m_min);
    const rainyDays = daily.precipitation_sum.filter(r => r > 2).length;

    // Lógica de decisiones agronómicas
    let title = 'Condiciones Óptimas';
    let text = 'Semana estable para siembra y mantenimiento general. Mantén el monitoreo regular de tus cultivos.';
    let colorClass = 'text-green-400';
    let tags = ['Siembra OK', 'Monitoreo'];

    if (totalRain > 30) {
        title = '⚠️ Alerta: Exceso de Humedad';
        text = `Se esperan ${totalRain.toFixed(0)}mm de lluvia esta semana. Suspende el riego, revisa drenajes y aplica fungicida preventivo.`;
        colorClass = 'text-blue-400';
        tags = ['Drenaje', 'Fungicida', 'No Regar'];
    } else if (rainyDays >= 4) {
        title = '🌧️ Semana Lluviosa';
        text = `Lluvia esperada ${rainyDays} de 7 días. Aprovecha para fertilizar antes de las lluvias y evita podas.`;
        colorClass = 'text-cyan-400';
        tags = ['Fertilizar Hoy', 'No Podar'];
    } else if (maxTemp > 32) {
        title = '🔥 Estrés Térmico';
        text = `Temperaturas críticas (hasta ${maxTemp}°C). Aumenta frecuencia de riego, aplica mulch y considera malla sombra.`;
        colorClass = 'text-orange-400';
        tags = ['Riego x2', 'Mulch', 'Sombra'];
    } else if (minTemp < 10) {
        title = '❄️ Riesgo de Helada';
        text = `Temperatura mínima de ${minTemp}°C detectada. Protege cultivos sensibles y evita riego nocturno.`;
        colorClass = 'text-purple-400';
        tags = ['Proteger', 'Riego AM'];
    } else if (totalRain < 5 && maxTemp > 25) {
        title = '☀️ Semana Seca';
        text = 'Poca lluvia esperada. Programa riego profundo cada 2-3 días y monitorea signos de estrés hídrico.';
        colorClass = 'text-amber-400';
        tags = ['Riego Profundo', 'Mulch'];
    }

    // Actualizar UI
    titleEl.textContent = title;
    titleEl.className = `font-bold text-sm mb-1 ${colorClass}`;
    textEl.textContent = text;

    tagsEl.innerHTML = tags.map(t =>
        `<span class="advice-tag">${t}</span>`
    ).join('');
}

/**
 * Inyecta estilos CSS para el forecast
 */
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
            padding: 8px 0;
        }

        .forecast-day {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            flex: 1;
            padding: 4px;
            border-radius: 6px;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .forecast-day:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .forecast-day.today {
            background: rgba(200, 167, 82, 0.1);
            border: 1px solid rgba(200, 167, 82, 0.2);
        }

        .day-name {
            font-size: 10px;
            color: #888;
            font-weight: 600;
            text-transform: uppercase;
        }

        .forecast-day.today .day-name {
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
    `;
    document.head.appendChild(style);
}
