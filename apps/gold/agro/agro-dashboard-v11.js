/**
 * YavlGold Agro — Dashboard V11 (6 bloques)
 * ----------------------------------------------------------
 * Renderiza los 6 bloques del dashboard evolucionado:
 *   0. Header contextual (saludo reutilizado del navbar)
 *   1. Selector de finca (chips vía window._agroFarms)
 *   2. Pulso del día (clima/mercados reutilizados + fase lunar ya inyectada)
 *   3. Cómo va mi finca (balance por finca, sumas client-side)
 *   4. Mis cultivos activos (por finca + estado semántico)
 *   5. Mis tareas del día (agro_task_cycles)
 *   6. Accesos rápidos (navegación real data-agro-view en HTML estático)
 *
 * No toca agro.js. Reutiliza dashboard.js (clima/luna) y agro-market.js (snapshot).
 * ADN V11: sin glow dorado, tokens de agro-tokens.css, estados de carga/error.
 */

import { supabase } from '../assets/js/config/supabase-config.js';
import { getMarketTickerSnapshot } from './agro-market.js';

// ============================================================
// CONSTANTES
// ============================================================
const STORAGE_SELECTED_FARM = 'YG_AGRO_DASH_V11_FARM';

const CROP_ACTIVE_STATUSES = ['sembrado', 'creciendo', 'produccion'];
const TASK_DONE_STATUSES = ['completed', 'not_executed'];
const TASK_PENDING_STATUSES = ['pending', 'active'];

const FMT_USD = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
});

// ============================================================
// ESTADO DEL MÓDULO
// ============================================================
const state = {
    initialized: false,
    selectedFarmId: null,
    farms: [],
    balanceBusy: false,
    cropsBusy: false,
    tasksLoaded: false,
};

// ============================================================
// ICONOS SVG DE ESTADO (círculo + flecha canónica)
// ============================================================
const STATUS_ICONS = {
    ganado: `
        <svg class="ygd-status-indicator ygd-status-ganado" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="18"/>
            <path d="M14 26 L26 14"/>
            <path d="M19 14 L26 14 L26 21"/>
        </svg>`,
    recuperando: `
        <svg class="ygd-status-indicator ygd-status-recuperando" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="18"/>
            <path d="M12 20 L28 20"/>
            <path d="M22 14 L28 20 L22 26"/>
        </svg>`,
    invirtiendo: `
        <svg class="ygd-status-indicator ygd-status-invirtiendo" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="18"/>
            <path d="M13 13 L27 27 M20 27 L27 27 L27 20" stroke="currentColor"/>
        </svg>`,
};

// ============================================================
// UTILIDADES
// ============================================================
function $(id) { return document.getElementById(id); }
function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
function fmtUSD(n) {
    try { return FMT_USD.format(safeNum(n)); }
    catch { return '$' + safeNum(n); }
}
function isDashboardActive() {
    return Boolean(document.querySelector('.agro-dashboard-v11:not([hidden]):not([inert])'));
}

// ============================================================
// BLOQUE 0 — SALUDO (reutiliza el nombre del navbar)
// ============================================================
async function renderGreeting() {
    const target = $('ygd-greeting-name');
    if (!target) return;

    // PASO 1 — Nombre instantáneo desde el cache (sin parpadeo).
    // agro.js persiste aquí el nombre resuelto (writeCachedDisplayName).
    const CACHE_KEY = 'YG_AGRO_DISPLAY_NAME_V1';
    let cachedName = '';
    try {
        cachedName = String(localStorage.getItem(CACHE_KEY) || '').trim();
    } catch (_e) { /* ignore */ }
    if (cachedName) {
        target.textContent = `Bienvenido, ${cachedName}`;
    }

    // PASO 2 — Resolver nombre canónico async (jerarquía igual a agro.js).
    let displayName = 'Agricultor';
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            displayName = String(user.user_metadata?.full_name || user.email || 'Agricultor').trim() || 'Agricultor';
            const { data: profile, error } = await supabase
                .from('agro_farmer_profile')
                .select('display_name')
                .eq('user_id', user.id)
                .maybeSingle();
            if (!error) {
                const profileName = String(profile?.display_name || '').trim();
                if (profileName) displayName = profileName;
            }
        }
    } catch (_err) {
        // Mantener el cache si ya se mostró; si no, queda 'Agricultor'.
    }

    // PASO 3 — Actualizar el DOM con el nombre resuelto.
    target.textContent = `Bienvenido, ${displayName}`;
}

// ============================================================
// BLOQUE 1 — SELECTOR DE FINCA
// ============================================================
function renderFarmChips() {
    const chipsHost = $('ygd-farm-chips');
    if (!chipsHost) return;

    const farms = state.farms;

    // Estado vacío: reubicar la guía "Cómo empezar" del dashboard anterior.
    if (!farms.length) {
        chipsHost.innerHTML = `
            <div class="ygd-farm-empty" style="flex: 1 1 100%;">
                <div class="ygd-farm-empty-copy">
                    <p class="ygd-block-eyebrow" style="color: var(--gold-4);">Ruta sugerida</p>
                    <h3 class="ygd-farm-empty-title">Cómo empezar</h3>
                    <p class="ygd-farm-empty-text">
                        Crea tu primera finca para ver su balance, cultivos y tareas aquí.
                    </p>
                </div>
                <div class="ygd-farm-empty-steps">
                    <button type="button" class="ygd-guide-step" data-agro-view="ciclos"
                        data-agro-subview="mis-fincas">
                        <span class="ygd-guide-step__index">1</span>
                        <span>Crear mi finca</span>
                    </button>
                    <button type="button" class="ygd-guide-step" data-agro-view="clima">
                        <span class="ygd-guide-step__index">2</span>
                        <span>Ver clima</span>
                    </button>
                </div>
            </div>`;
        // Los botones data-agro-view los wirea agro-shell.js por delegación.
        return;
    }

    const fragment = document.createDocumentFragment();
    farms.forEach((farm, idx) => {
        const isSelected = farm.id === state.selectedFarmId
            || (!state.selectedFarmId && (farm.is_default || idx === 0));
        if (isSelected) state.selectedFarmId = farm.id;

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ygd-farm-chip';
        chip.setAttribute('role', 'tab');
        chip.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        chip.dataset.farmId = farm.id;
        chip.innerHTML = `
            <span class="ygd-farm-chip-dot" aria-hidden="true"></span>
            <span>${escapeHtml(farm.name || 'Finca')}</span>`;
        chip.addEventListener('click', () => selectFarm(farm.id));
        fragment.appendChild(chip);
    });
    chipsHost.replaceChildren(fragment);

    // Al montar por primera vez, disparar el render de los bloques dependientes.
    if (state.selectedFarmId) {
        refreshFarmDependentBlocks();
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function selectFarm(farmId) {
    if (state.selectedFarmId === farmId) return;
    state.selectedFarmId = farmId;
    try { localStorage.setItem(STORAGE_SELECTED_FARM, farmId); } catch { /* ignore */ }

    // Actualizar aria-selected de los chips.
    document.querySelectorAll('.ygd-farm-chip').forEach(chip => {
        chip.setAttribute('aria-selected', chip.dataset.farmId === farmId ? 'true' : 'false');
    });

    refreshFarmDependentBlocks();
}

function refreshFarmDependentBlocks() {
    renderBalance();
    renderCrops();
}

// ============================================================
// BLOQUE 2 — MERCADOS (desde agro-market.js snapshot)
// ============================================================
function renderMarkets() {
    const list = $('ygd-markets-list');
    if (!list) return;

    const snapshot = getMarketTickerSnapshot();

    if (!snapshot) {
        list.innerHTML = `
            <li class="ygd-market-row">
                <span class="ygd-market-label">Cargando mercados...</span>
            </li>`;
        // Reintentar en 2s si el snapshot aún no está listo.
        if (!state._marketRetry) {
            state._marketRetry = setTimeout(() => { state._marketRetry = null; renderMarkets(); }, 2000);
        }
        return;
    }

    const rows = [];
    const crypto = snapshot.crypto || {};
    const fiat = snapshot.fiat || {};
    const local = snapshot.localCurrency || 'USD';

    // Crypto principal: BTC
    if (crypto.BTC) {
        rows.push({ label: 'BTC', value: fmtUSD(crypto.BTC) });
    }
    // Fiat local vs USD
    if (local === 'VES' && fiat.VES) {
        rows.push({ label: 'USD / VES', value: `${formatNumber(fiat.VES)} Bs` });
    } else if (local === 'COP' && fiat.COP) {
        rows.push({ label: 'USD / COP', value: `$${formatNumber(fiat.COP)}` });
    }
    // Complementaria: si la local es VES, mostrar también COP; y viceversa.
    if (local === 'VES' && fiat.COP) {
        rows.push({ label: 'USD / COP', value: `$${formatNumber(fiat.COP)}` });
    } else if (local !== 'VES' && fiat.VES) {
        rows.push({ label: 'USD / VES', value: `${formatNumber(fiat.VES)} Bs` });
    }

    if (!rows.length) {
        list.innerHTML = `
            <li class="ygd-market-row">
                <span class="ygd-market-label">Mercados no disponibles</span>
            </li>`;
        return;
    }

    list.innerHTML = rows.map(r => `
        <li class="ygd-market-row">
            <span class="ygd-market-label">${escapeHtml(r.label)}</span>
            <span class="ygd-market-value">${escapeHtml(r.value)}</span>
        </li>`).join('');
}

function formatNumber(n) {
    const num = safeNum(n);
    try { return num.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
    catch { return String(num); }
}

// ============================================================
// BLOQUE 3 — CÓMO VA MI FINCA (balance por finca)
// Balance consolidado vía RPC server-side get_farm_balance, que
// replica la atribución crop-céntrica de computeFarmStats (Mis
// Fincas) para que las cifras coincidan exactamente con esas cards.
// ============================================================
// Cache de balance por farmId: { farmId: { inversion, cobrado, fiados } }
let farmStatsCache = new Map();

// Balance consolidado vía RPC server-side get_farm_balance.
// El RPC replica la atribución crop-céntrica de computeFarmStats (Mis Fincas),
// así que los números coinciden exactamente con las cards de Mis Fincas.
async function fetchFarmBalance(farmId, userId) {
    if (!farmId || !userId) return { inversion: 0, cobrado: 0, fiados: 0 };

    // Cache en sesión: evita recalcular al alternar entre fincas.
    if (farmStatsCache.has(farmId)) return farmStatsCache.get(farmId);

    const { data, error } = await supabase.rpc('get_farm_balance', {
        p_farm_id: farmId,
        p_user_id: userId,
    });
    if (error) throw error;

    // El RPC devuelve una fila { inversion_total, cobrado_real, fiados_pendientes }.
    const row = Array.isArray(data) ? data[0] : data;
    const result = {
        inversion: safeNum(row?.inversion_total),
        cobrado: safeNum(row?.cobrado_real),
        fiados: safeNum(row?.fiados_pendientes),
    };
    farmStatsCache.set(farmId, result);
    return result;
}

async function renderBalance() {
    const farmId = state.selectedFarmId;
    const farmNameEl = $('ygd-balance-farm-name');
    const statsHost = $('ygd-balance-stats');
    const descEl = $('ygd-balance-desc');
    const statusEl = $('ygd-gauge-status-name');

    if (!farmId) {
        if (farmNameEl) farmNameEl.textContent = 'Selecciona una finca';
        if (descEl) descEl.textContent = 'Selecciona una finca para ver su balance.';
        setGauge('muted');
        if (statsHost) renderBalanceStats(0, 0, 0);
        return;
    }

    const farm = state.farms.find(f => f.id === farmId);
    if (farmNameEl) farmNameEl.textContent = farm ? farm.name : 'Finca';

    if (state.balanceBusy) return;
    state.balanceBusy = true;

    if (statsHost) statsHost.innerHTML = skeletonStats();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { inversion, cobrado, fiados } = await fetchFarmBalance(farmId, user?.id);

        const estadoKey = computeBalanceEstado(cobrado, inversion, fiados);
        const labelMap = { success: 'Ganando', warning: 'Recuperando', muted: 'Neutral' };

        renderBalanceStats(inversion, cobrado, fiados);
        setGauge(estadoKey);
        if (statusEl) {
            statusEl.textContent = labelMap[estadoKey];
            statusEl.className = 'ygd-gauge-status-name is-' + estadoKey;
        }
        if (descEl) descEl.textContent = balanceDescription(estadoKey);
    } catch (err) {
        console.error('[DashboardV11] Balance error:', err);
        if (statsHost) statsHost.innerHTML = `<div class="ygd-error" style="grid-column: 1 / -1;">No se pudo cargar esta información</div>`;
        setGauge('muted');
    } finally {
        state.balanceBusy = false;
    }
}

function resolveRecordUsd(row) {
    if (row.monto_usd != null) return safeNum(row.monto_usd);
    if (row.amount_usd != null) return safeNum(row.amount_usd);
    const amount = safeNum(row.amount || row.monto);
    const currency = String(row.currency || 'USD').toUpperCase();
    if (currency === 'USD') return amount;
    const rate = safeNum(row.exchange_rate) || 1;
    return rate > 0 ? amount / rate : amount;
}

function computeBalanceEstado(cobrado, inversion, fiados) {
    if (cobrado >= inversion && inversion > 0) return 'success';
    if (fiados > 0) return 'warning';
    return 'muted';
}

function balanceDescription(estadoKey) {
    switch (estadoKey) {
        case 'success': return 'Vas ganando: lo cobrado supera la inversión. Mantén el ritmo.';
        case 'warning': return 'Dinero en la calle, gestiona cobros en Facturero de Clientes.';
        default: return 'Sin movimientos suficientes para medir el estado de esta finca.';
    }
}

function renderBalanceStats(inversion, cobrado, fiados) {
    const host = $('ygd-balance-stats');
    if (!host) return;
    const cobradoClass = cobrado > 0 ? 'is-success' : 'is-muted';
    const fiadosClass = fiados > 0 ? 'is-warning' : 'is-muted';
    host.innerHTML = `
        <div class="ygd-balance-stat">
            <span class="ygd-balance-stat-label">Inversión total</span>
            <span class="ygd-balance-stat-value">${escapeHtml(fmtUSD(inversion))}</span>
        </div>
        <div class="ygd-balance-stat">
            <span class="ygd-balance-stat-label">Cobrado real</span>
            <span class="ygd-balance-stat-value ${cobradoClass}">${escapeHtml(fmtUSD(cobrado))}</span>
        </div>
        <div class="ygd-balance-stat">
            <span class="ygd-balance-stat-label">Fiados pendientes</span>
            <span class="ygd-balance-stat-value ${fiadosClass}">${escapeHtml(fmtUSD(fiados))}</span>
        </div>`;
}

function skeletonStats() {
    return `
        <div class="ygd-balance-stat">
            <span class="ygd-balance-stat-label">Inversión total</span>
            <span class="ygd-skeleton ygd-skeleton-stat"></span>
        </div>
        <div class="ygd-balance-stat">
            <span class="ygd-balance-stat-label">Cobrado real</span>
            <span class="ygd-skeleton ygd-skeleton-stat"></span>
        </div>
        <div class="ygd-balance-stat">
            <span class="ygd-balance-stat-label">Fiados pendientes</span>
            <span class="ygd-skeleton ygd-skeleton-stat"></span>
        </div>`;
}

// ============================================================
// VELOCÍMETRO — actualiza aguja y arco activo
// ============================================================
function setGauge(estadoKey) {
    const needle = $('ygd-gauge-needle');
    if (!needle) return;
    document.querySelectorAll('.ygd-gauge-arc').forEach(a => a.classList.remove('active'));

    let rotation = -60;
    let activeClass = 'ygd-gauge-arc-neutral';
    if (estadoKey === 'warning') {
        rotation = 0;
        activeClass = 'ygd-gauge-arc-recuperando';
    } else if (estadoKey === 'success') {
        rotation = 60;
        activeClass = 'ygd-gauge-arc-ganando';
    }
    needle.style.transform = `rotate(${rotation}deg)`;
    const activeArc = document.querySelector('.' + activeClass);
    if (activeArc) activeArc.classList.add('active');
}

// ============================================================
// BLOQUE 4 — MIS CULTIVOS ACTIVOS (por finca)
// ============================================================
async function renderCrops() {
    const grid = $('ygd-crops-grid');
    if (!grid) return;

    const farmId = state.selectedFarmId;
    if (!farmId) {
        grid.innerHTML = cropsEmptyHtml('Selecciona una finca para ver sus cultivos.');
        return;
    }

    if (state.cropsBusy) return;
    state.cropsBusy = true;
    grid.innerHTML = cropsSkeleton();

    try {
        const { data, error } = await supabase
            .from('agro_crops')
            .select('id, name, variety, status, farm_id')
            .eq('farm_id', farmId)
            .in('status', CROP_ACTIVE_STATUSES)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(3);
        if (error) throw error;

        const crops = data || [];
        if (!crops.length) {
            grid.innerHTML = cropsEmptyHtml('No hay cultivos activos en esta finca.');
            return;
        }

        // Para cada cultivo, calcular su estado semántico (requiere sus movimientos).
        const enriched = await Promise.all(crops.map(async (crop) => {
            const { rentabilidadReal, fiadosPendientes } = await computeCropFinances(crop.id);
            const estado = computeCropEstado(rentabilidadReal, fiadosPendientes);
            return { ...crop, rentabilidadReal, fiadosPendientes, estado };
        }));

        grid.innerHTML = enriched.map(crop => cropCardHtml(crop)).join('');
    } catch (err) {
        console.error('[DashboardV11] Crops error:', err);
        grid.innerHTML = `<div class="ygd-error" style="grid-column: 1 / -1;">No se pudo cargar esta información</div>`;
    } finally {
        state.cropsBusy = false;
    }
}

async function computeCropFinances(cropId) {
    const [ingresos, egresosDirectos, egresosOperativos, fiados] = await Promise.all([
        sumByCrop('agro_income', cropId, 'monto_usd'),
        sumByCrop('agro_expenses', cropId, 'monto_usd', 'amount'),
        fetchOperationalExpenses(cropId),
        sumByCropPending('agro_pending', cropId, 'monto_usd'),
    ]);
    // Gastos totales del cultivo = agro_expenses + movimientos operativos
    // (misma composición que usa la card de detalle de Mis Cultivos).
    const egresos = egresosDirectos + egresosOperativos;
    return { rentabilidadReal: ingresos - egresos, fiadosPendientes: fiados };
}

// Gastos del "Facturero de cultivos": agro_operational_cycles + agro_operational_movements.
// Prioriza la API ya calculada por agroOperationalCycles (fuente de verdad de Mis Cultivos);
// si no está cargada, hace la query directa (agro-crop-report.js:740-766).
async function fetchOperationalExpenses(cropId) {
    const opsApi = window.YGAgroOperationalCycles;
    if (opsApi?.getOperationalExpensesByCrop) {
        const map = opsApi.getOperationalExpensesByCrop();
        const amount = map.get(cropId);
        if (amount !== undefined) return safeNum(amount);
    }
    return fetchOperationalExpensesDirect(cropId);
}

async function fetchOperationalExpensesDirect(cropId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;
        // 2-hop: ciclos operativos del cultivo → movimientos salientes.
        const { data: cycles, error: cyclesError } = await supabase
            .from('agro_operational_cycles')
            .select('id')
            .eq('user_id', user.id)
            .eq('crop_id', cropId)
            .in('economic_type', ['expense', 'loss', 'donation']);
        if (cyclesError || !cycles?.length) return 0;
        const cycleIds = cycles.map(c => c.id);
        const { data: movements, error: movError } = await supabase
            .from('agro_operational_movements')
            .select('amount,currency,amount_usd,exchange_rate,direction')
            .in('cycle_id', cycleIds);
        if (movError || !movements?.length) return 0;
        // Salientes = direction !== 'in' (mismo criterio que rebuildPortfolioByCrop).
        return movements
            .filter(m => m.direction !== 'in')
            .reduce((sum, m) => sum + resolveRecordUsd(m), 0);
    } catch (err) {
        console.warn('[DashboardV11] operational expenses error:', err?.message || err);
        return 0;
    }
}

async function sumByCrop(table, cropId, primaryCol, fallbackCol) {
    const { data, error } = await supabase
        .from(table)
        .select(`${primaryCol}${fallbackCol ? `, ${fallbackCol}` : ''}, currency, exchange_rate`)
        .eq('crop_id', cropId)
        .is('deleted_at', null);
    if (error) throw error;
    return (data || []).reduce((acc, row) => acc + pickAmount(row, primaryCol, fallbackCol), 0);
}

// Precedencia canónica de monto USD — idéntica a resolveRecordUsd de agro-farm-compare.js
// (monto_usd → amount_usd → amount/monto con currency/exchange_rate).
function pickAmount(row, primaryCol, fallbackCol) {
    if (row.monto_usd !== undefined && row.monto_usd !== null) return safeNum(row.monto_usd);
    if (row.amount_usd !== undefined && row.amount_usd !== null) return safeNum(row.amount_usd);
    const amount = safeNum(row.amount || row.monto);
    const currency = String(row.currency || 'USD').toUpperCase();
    if (currency === 'USD') return amount;
    const rate = safeNum(row.exchange_rate) || 1;
    return rate > 0 ? amount / rate : amount;
}

async function sumByCropPending(table, cropId, primaryCol) {
    const { data, error } = await supabase
        .from(table)
        .select(primaryCol)
        .eq('crop_id', cropId)
        .is('deleted_at', null)
        .is('reverted_at', null);
    if (error) throw error;
    return (data || []).reduce((acc, row) => acc + safeNum(row?.[primaryCol]), 0);
}

function computeCropEstado(rentabilidadReal, fiadosPendientes) {
    // §4.3 del Manifiesto
    if (fiadosPendientes > 0) return 'recuperando';
    if (rentabilidadReal > 0) return 'ganado';
    if (rentabilidadReal === 0) return 'equilibrio';
    return 'invirtiendo';
}

function cropCardHtml(crop) {
    const estadoLabels = {
        ganado: 'Ganado', recuperando: 'Recuperando', invirtiendo: 'Invirtiendo', equilibrio: 'Equilibrio',
    };
    const iconKey = (crop.estado === 'equilibrio') ? 'invirtiendo' : crop.estado;
    const icon = STATUS_ICONS[iconKey] || STATUS_ICONS.invirtiendo;
    const labelClass = crop.estado === 'ganado' ? 'is-success'
        : crop.estado === 'recuperando' ? 'is-warning' : 'is-muted';

    const descMap = {
        ganado: 'Recuperaste la inversión, saldo positivo en mano.',
        recuperando: 'Dinero en la calle, gestiona cobros.',
        invirtiendo: 'Ciclo joven, inversión en curso.',
        equilibrio: 'Ingresos y egresos empatados por ahora.',
    };

    const meta = crop.fiadosPendientes > 0
        ? `<div class="ygd-crop-meta">
              <span class="ygd-crop-meta-label">Fiados pendientes:</span>
              <span class="ygd-crop-meta-value">${escapeHtml(fmtUSD(crop.fiadosPendientes))}</span>
           </div>` : '';

    const nameVariety = crop.variety
        ? `${escapeHtml(crop.name)} · ${escapeHtml(crop.variety)}`
        : escapeHtml(crop.name);

    return `
        <article class="ygd-card ygd-crop-card">
            <div class="ygd-crop-card-head">
                <h3 class="ygd-crop-name">${nameVariety}</h3>
                ${icon}
            </div>
            <span class="ygd-crop-estado-label ${labelClass}">${estadoLabels[crop.estado]}</span>
            <p class="ygd-crop-desc">${descMap[crop.estado]}</p>
            ${meta}
        </article>`;
}

function cropsEmptyHtml(text) {
    return `
        <div class="ygd-crops-empty" style="grid-column: 1 / -1;">
            <svg class="ygd-crops-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 22V12" />
                <path d="M12 12c0-3 2-6 6-6 0 4-3 6-6 6z" />
                <path d="M12 14c0-3-2-6-6-6 0 4 3 6 6 6z" />
            </svg>
            <p class="ygd-crops-empty-text">${escapeHtml(text)}</p>
        </div>`;
}

function cropsSkeleton() {
    const card = `
        <article class="ygd-card ygd-crop-card">
            <div class="ygd-crop-card-head">
                <span class="ygd-skeleton ygd-skeleton-stat" style="width: 60%;"></span>
                <span class="ygd-skeleton" style="width: 40px; height: 40px; border-radius: 50%;"></span>
            </div>
            <span class="ygd-skeleton ygd-skeleton-line"></span>
            <span class="ygd-skeleton ygd-skeleton-line"></span>
        </article>`;
    return card + card + card;
}

// ============================================================
// BLOQUE 5 — MIS TAREAS DEL DÍA (agro_task_cycles)
// ============================================================
async function renderTasks() {
    const list = $('ygd-tasks-list');
    if (!list) return;
    if (state.tasksLoaded) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
        .from('agro_task_cycles')
        .select('id, title, task_status, task_date, duration_label')
        .eq('user_id', user.id)
        .eq('task_date', today)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('[DashboardV11] Tasks error:', error);
        list.innerHTML = `<li class="ygd-error">No se pudo cargar esta información</li>`;
        state.tasksLoaded = true;
        return;
    }

    const tasks = data || [];
    if (!tasks.length) {
        list.innerHTML = `<li class="ygd-tasks-empty">No hay tareas registradas para hoy.</li>`;
        state.tasksLoaded = true;
        return;
    }

    list.innerHTML = tasks.map(task => {
        const done = TASK_DONE_STATUSES.includes(task.task_status);
        const time = task.duration_label ? `<span class="ygd-task-time">${escapeHtml(task.duration_label)}</span>` : '';
        return `
            <li class="ygd-task-row">
                <span class="ygd-task-check ${done ? 'done' : ''}" aria-hidden="true">
                    ${done ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/></svg>` : ''}
                </span>
                <span class="ygd-task-text ${done ? 'done' : ''}">${escapeHtml(task.title)}</span>
                ${time}
                <span class="ygd-badge ${done ? 'ygd-badge-done' : 'ygd-badge-pending'}">
                    ${done ? 'Completada' : 'Pendiente'}
                </span>
            </li>`;
    }).join('');

    state.tasksLoaded = true;
}

// ============================================================
// CARGA DE FINCAS (puente con agro-farms.js)
// ============================================================
async function ensureFarms() {
    // Preferir el cache de agro-farms.js si ya cargó.
    if (window._agroFarms?.getFarms) {
        const cached = window._agroFarms.getFarms();
        if (cached && cached.length) {
            state.farms = cached;
            return;
        }
    }

    // Si no hay cache, forzar la carga.
    if (typeof window._agroFarms?.loadFarms === 'function') {
        try {
            await window._agroFarms.loadFarms();
            const cached = window._agroFarms.getFarms?.() || [];
            if (cached.length) {
                state.farms = cached;
                return;
            }
        } catch (err) {
            console.warn('[DashboardV11] loadFarms fallback falló:', err);
        }
    }

    // Fallback final: query directa.
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
            .from('agro_farms')
            .select('*')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .order('is_default', { ascending: false })
            .order('name', { ascending: true });
        if (error) throw error;
        state.farms = data || [];
    } catch (err) {
        console.error('[DashboardV11] ensureFarms error:', err);
        state.farms = [];
    }
}

function restoreSelectedFarm() {
    try {
        const saved = localStorage.getItem(STORAGE_SELECTED_FARM);
        if (saved && state.farms.some(f => f.id === saved)) {
            state.selectedFarmId = saved;
        }
    } catch { /* ignore */ }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
async function initDashboardV11() {
    if (state.initialized) return;
    state.initialized = true;

    // Bloque 0: saludo (usa MutationObserver sobre el navbar).
    renderGreeting();

    // Bloque 2: mercados (snapshot puede no estar listo aún; reintentos internos).
    renderMarkets();

    // Bloque 5: tareas (una sola vez; no depende de finca).
    renderTasks();

    // Bloques 1, 3, 4 dependen de fincas.
    await ensureFarms();
    restoreSelectedFarm();
    renderFarmChips(); // dispara refreshFarmDependentBlocks() si hay finca seleccionada
}

// Escuchar recarga de fincas desde agro-farms.js (agro:farms-loaded).
function bindFarmEvents() {
    document.addEventListener('agro:farms-loaded', async () => {
        const cached = window._agroFarms?.getFarms?.() || [];
        state.farms = cached;
        farmStatsCache.clear(); // invalidar: las cifras deben recalcularse
        if (!state.selectedFarmId || !state.farms.some(f => f.id === state.selectedFarmId)) {
            restoreSelectedFarm();
        }
        renderFarmChips();
    });
}

// ============================================================
// AUTOARRANQUE
// ============================================================
function startWhenReady() {
    bindFarmEvents();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboardV11, { once: true });
    } else {
        initDashboardV11();
    }
}

// Exponer API mínima para depuración / re-render manual.
window.YGDashboardV11 = {
    init: initDashboardV11,
    renderMarkets,
    renderTasks,
    refreshFarms: async () => { await ensureFarms(); renderFarmChips(); },
};

startWhenReady();
