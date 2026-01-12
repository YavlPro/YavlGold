/**
 * YavlGold V9.4 - Agro Interactions Module
 * "Profundidad & Interacción"
 * Calendario Lunar 2026 + Modal Fiat Rates
 */

// Base de conocimiento lunar (Luna Nueva: 19 Enero 2026)
const BASE_NEW_MOON = new Date('2026-01-19T00:00:00');
const LUNAR_CYCLE = 29.53058867; // Días del ciclo lunar

/**
 * Inicializa las interacciones y expone funciones globales
 */
export function initInteractions() {
    // Modales
    window.openLunarCalendar = openLunarCalendar;
    window.showFiatTable = showFiatTable;

    // Market Hub
    window.openMarketHub = openMarketHub;
    window.switchMarketTab = switchMarketTab;

    // Función global para cerrar modales correctamente
    window.closeModal = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.style.display = 'none';
        }
    };

    console.log('[AgroInteractions] ✅ Módulo de interacciones inicializado');
}

// ============================================
// MARKET HUB (Centro Financiero Unificado)
// ============================================

function openMarketHub(defaultTab = 'crypto') {
    const modal = document.getElementById('modal-market');
    if (!modal) {
        console.error('[AgroInteractions] Modal market no encontrado');
        return;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    switchMarketTab(defaultTab);
    loadDetailedCrypto();
    loadFiatRates();
}

function switchMarketTab(tab) {
    const btnCrypto = document.getElementById('tab-btn-crypto');
    const btnFiat = document.getElementById('tab-btn-fiat');
    const viewCrypto = document.getElementById('view-crypto');
    const viewFiat = document.getElementById('view-fiat');

    if (!btnCrypto || !btnFiat || !viewCrypto || !viewFiat) return;

    const activeStyle = 'padding: 12px 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; background: transparent; border: none; border-bottom: 2px solid var(--gold-primary, #C8A752); color: #fff; cursor: pointer; transition: all 0.2s;';
    const inactiveStyle = 'padding: 12px 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #666; cursor: pointer; transition: all 0.2s;';

    if (tab === 'crypto') {
        btnCrypto.style.cssText = activeStyle;
        btnFiat.style.cssText = inactiveStyle;
        viewCrypto.style.display = 'block';
        viewFiat.style.display = 'none';
    } else {
        btnCrypto.style.cssText = inactiveStyle;
        btnFiat.style.cssText = activeStyle;
        viewCrypto.style.display = 'none';
        viewFiat.style.display = 'block';
    }
}

async function loadDetailedCrypto() {
    const container = document.getElementById('crypto-list-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; color: #666; padding: 40px 0;">📡 Conectando con mercados...</div>';

    try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
        const results = await Promise.all(
            symbols.map(s => fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s}`).then(r => r.json()))
        );

        const cryptoData = [
            { symbol: 'BTC', name: 'Bitcoin', icon: 'fa-brands fa-bitcoin', iconColor: '#f7931a' },
            { symbol: 'ETH', name: 'Ethereum', icon: 'fa-brands fa-ethereum', iconColor: '#627eea' },
            { symbol: 'SOL', name: 'Solana', icon: 'fa-solid fa-sun', iconColor: '#00ffa3' },
            { symbol: 'BNB', name: 'BNB Chain', icon: 'fa-solid fa-coins', iconColor: '#f3ba2f' },
        ];

        let html = '';
        results.forEach((data, i) => {
            const price = parseFloat(data.lastPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            const change = parseFloat(data.priceChangePercent);
            const changeColor = change >= 0 ? '#4ade80' : '#f87171';
            const changeSign = change >= 0 ? '+' : '';

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(200,167,82,0.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <i class="${cryptoData[i].icon}" style="font-size: 1.8rem; color: ${cryptoData[i].iconColor};"></i>
                        <div>
                            <div style="font-weight: 700; color: #fff; font-size: 1rem;">${cryptoData[i].name}</div>
                            <div style="font-size: 11px; color: #666;">${cryptoData[i].symbol}/USDT</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-family: 'Orbitron', monospace; color: #fff; font-size: 1rem;">${price}</div>
                        <div style="font-size: 11px; color: ${changeColor}; font-weight: 600;">${changeSign}${change.toFixed(2)}%</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (e) {
        console.error('[AgroInteractions] Error crypto:', e);
        container.innerHTML = '<div style="text-align: center; color: #f87171; padding: 40px 0;">❌ Error cargando mercado</div>';
    }
}

async function loadFiatRates() {
    const tbody = document.getElementById('fiat-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 24px; color: #666;">📡 Cargando tasas...</td></tr>';

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        const rates = data.rates;

        const currencies = [
            { code: 'VES', name: 'Bolívar Digital', flag: '🇻🇪' },
            { code: 'COP', name: 'Peso Colombiano', flag: '🇨🇴' },
            { code: 'MXN', name: 'Peso Mexicano', flag: '🇲🇽' },
            { code: 'ARS', name: 'Peso Argentino', flag: '🇦🇷' },
            { code: 'BRL', name: 'Real Brasileño', flag: '🇧🇷' },
            { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
        ];

        let html = '';
        currencies.forEach(({ code, name, flag }) => {
            if (rates[code]) {
                const formatted = rates[code].toLocaleString('es-ES', { maximumFractionDigits: 2 });
                html += `
                    <tr style="transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                        <td style="padding: 14px 16px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 1.4rem;">${flag}</span>
                                <div>
                                    <div style="font-weight: 700; color: #eee;">${code}</div>
                                    <div style="font-size: 10px; color: #666;">${name}</div>
                                </div>
                            </div>
                        </td>
                        <td style="padding: 14px 16px; text-align: right; font-family: 'Orbitron', monospace; color: var(--gold-primary, #C8A752);">
                            ${formatted}
                        </td>
                    </tr>
                `;
            }
        });

        tbody.innerHTML = html;

    } catch (e) {
        console.error('[AgroInteractions] Error fiat:', e);
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 24px; color: #f87171;">❌ Error cargando tasas</td></tr>';
    }
}

// ============================================
// CALENDARIO LUNAR 2026
// ============================================

function openLunarCalendar() {
    const modal = document.getElementById('modal-lunar');
    const grid = document.getElementById('lunar-calendar-grid');

    if (!modal || !grid) {
        console.error('[AgroInteractions] Modal lunar no encontrado');
        return;
    }

    // Abrir correctamente: quitar hidden y poner display flex
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    // Solo renderizar si está vacío
    if (grid.children.length > 0) return;

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    let html = '';

    for (let m = 0; m < 12; m++) {
        html += `
            <div class="lunar-month">
                <h4 class="month-title">${months[m]}</h4>
                <div class="month-grid">
                    <span class="day-header">L</span>
                    <span class="day-header">M</span>
                    <span class="day-header">M</span>
                    <span class="day-header">J</span>
                    <span class="day-header">V</span>
                    <span class="day-header">S</span>
                    <span class="day-header">D</span>
        `;

        // Calcular primer día del mes (0 = Domingo, ajustar para empezar en Lunes)
        const firstDay = new Date(2026, m, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1; // Lunes = 0

        // Celdas vacías antes del día 1
        for (let i = 0; i < offset; i++) {
            html += `<span class="day-cell empty"></span>`;
        }

        const daysInMonth = new Date(2026, m + 1, 0).getDate();
        const today = new Date();

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(2026, m, d);
            const phase = getMoonPhase(date);
            const phaseInfo = getPhaseIcon(phase);

            const isToday = date.toDateString() === today.toDateString();
            const todayClass = isToday ? 'today' : '';

            html += `
                <div class="day-cell ${todayClass}" title="${phaseInfo.name}">
                    <span class="day-num">${d}</span>
                    <span class="phase-icon">${phaseInfo.icon}</span>
                </div>
            `;
        }

        html += `</div></div>`;
    }

    grid.innerHTML = html;
    injectLunarStyles();
}

/**
 * Calcula la fase lunar para una fecha dada
 * @returns {number} 0.0 a 1.0 (0 = Luna Nueva, 0.5 = Luna Llena)
 */
function getMoonPhase(date) {
    const diffTime = date.getTime() - BASE_NEW_MOON.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    const cycles = diffDays / LUNAR_CYCLE;
    return cycles - Math.floor(cycles);
}

/**
 * Obtiene el icono y nombre de la fase lunar
 */
function getPhaseIcon(phase) {
    if (phase < 0.03 || phase > 0.97) return { icon: '🌑', name: 'Luna Nueva' };
    if (phase < 0.22) return { icon: '', name: 'Creciente' };
    if (phase < 0.28) return { icon: '🌓', name: 'Cuarto Creciente' };
    if (phase < 0.47) return { icon: '', name: 'Gibosa Creciente' };
    if (phase < 0.53) return { icon: '🌕', name: 'Luna Llena' };
    if (phase < 0.72) return { icon: '', name: 'Gibosa Menguante' };
    if (phase < 0.78) return { icon: '🌗', name: 'Cuarto Menguante' };
    return { icon: '', name: 'Menguante' };
}

// ============================================
// TABLA DE TASAS FIAT
// ============================================

async function showFiatTable() {
    const modal = document.getElementById('modal-fiat');
    const tbody = document.getElementById('fiat-table-body');

    if (!modal || !tbody) {
        console.error('[AgroInteractions] Modal fiat no encontrado');
        return;
    }

    // Abrir correctamente: quitar hidden y poner display flex
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    tbody.innerHTML = '<tr><td colspan="2" class="loading-cell">📡 Cargando tasas...</td></tr>';

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        const rates = data.rates;

        // Monedas de interés para agricultores latinos
        const currencies = [
            { code: 'COP', name: 'Peso Colombiano', flag: '🇨🇴' },
            { code: 'VES', name: 'Bolívar Digital', flag: '🇻🇪' },
            { code: 'MXN', name: 'Peso Mexicano', flag: '🇲🇽' },
            { code: 'BRL', name: 'Real Brasileño', flag: '🇧🇷' },
            { code: 'ARS', name: 'Peso Argentino', flag: '🇦🇷' },
            { code: 'CLP', name: 'Peso Chileno', flag: '🇨🇱' },
            { code: 'PEN', name: 'Sol Peruano', flag: '🇵🇪' },
            { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
        ];

        let html = '';
        currencies.forEach(({ code, name, flag }) => {
            if (rates[code]) {
                const formatted = formatCurrency(rates[code], code);
                html += `
                    <tr class="fiat-row">
                        <td class="fiat-currency">
                            <span class="flag">${flag}</span>
                            <div class="currency-info">
                                <span class="code">${code}</span>
                                <span class="name">${name}</span>
                            </div>
                        </td>
                        <td class="fiat-rate">${formatted}</td>
                    </tr>
                `;
            }
        });

        tbody.innerHTML = html;

    } catch (e) {
        console.error('[AgroInteractions] Error fiat:', e);
        tbody.innerHTML = '<tr><td colspan="2" class="error-cell">❌ Error cargando tasas</td></tr>';
    }
}

/**
 * Formatea el valor de la moneda
 */
function formatCurrency(value, code) {
    try {
        return value.toLocaleString('es-ES', {
            style: 'currency',
            currency: code,
            maximumFractionDigits: code === 'VES' || code === 'ARS' ? 2 : 0
        });
    } catch {
        return `${code} ${value.toLocaleString()}`;
    }
}

// ============================================
// ESTILOS CSS
// ============================================

function injectLunarStyles() {
    if (document.getElementById('lunar-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'lunar-modal-styles';
    style.textContent = `
        .lunar-month {
            background: rgba(0, 0, 0, 0.4);
            border-radius: 12px;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: border-color 0.3s;
        }

        .lunar-month:hover {
            border-color: rgba(200, 167, 82, 0.2);
        }

        .month-title {
            text-align: center;
            color: var(--gold-primary, #C8A752);
            font-weight: 700;
            font-size: 0.9rem;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(200, 167, 82, 0.15);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .month-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
        }

        .day-header {
            font-size: 9px;
            color: #555;
            text-align: center;
            padding: 4px 0;
        }

        .day-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 32px;
            font-size: 10px;
            color: #666;
            border-radius: 4px;
            cursor: default;
            transition: all 0.2s;
        }

        .day-cell:hover:not(.empty) {
            background: rgba(200, 167, 82, 0.1);
            color: #fff;
        }

        .day-cell.today {
            background: var(--gold-primary, #C8A752);
            color: #000;
            font-weight: 700;
            box-shadow: 0 0 12px rgba(200, 167, 82, 0.4);
        }

        .day-cell.empty {
            background: transparent;
        }

        .day-num {
            line-height: 1;
        }

        .phase-icon {
            font-size: 8px;
            line-height: 1;
            margin-top: 1px;
        }

        /* Fiat Table Styles */
        .fiat-row {
            transition: background 0.2s;
        }

        .fiat-row:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .fiat-currency {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
        }

        .fiat-currency .flag {
            font-size: 1.5rem;
        }

        .currency-info {
            display: flex;
            flex-direction: column;
        }

        .currency-info .code {
            font-weight: 700;
            color: #e5e5e5;
        }

        .currency-info .name {
            font-size: 10px;
            color: #666;
        }

        .fiat-rate {
            text-align: right;
            padding: 12px 16px;
            font-family: 'Orbitron', monospace;
            color: var(--gold-primary, #C8A752);
            font-size: 0.9rem;
        }

        .loading-cell, .error-cell {
            text-align: center;
            padding: 24px;
            color: #888;
        }

        .error-cell {
            color: #f87171;
        }
    `;
    document.head.appendChild(style);
}
