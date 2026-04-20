/**
 * YavlGold Agro — Per-Section Statistics
 * Independent stats computation, rendering, charts, insights, and MD export.
 * Fetches data directly from Supabase per section (not from global summary).
 */

import supabase from '../assets/js/config/supabase-config.js';

// ============================================================
// SECTION CONFIGURATION
// ============================================================

const SECTIONS = {
    pagados: {
        table: 'agro_income',
        columns: 'id,concepto,monto,monto_usd,currency,crop_id,fecha,reverted_at,created_at',
        dateField: 'fecha',
        filterFn: (r) => !r.reverted_at,
        amtUsd: (r) => parseFloat(r.monto_usd) || parseFloat(r.monto) || 0,
        amtLocal: (r) => parseFloat(r.monto) || 0,
        whoExtract: (r) => extractWhoFromConcept(r.concepto),
        label: 'Pagados',
        labelTotal: 'Total cobrado',
        labelWho: 'Cliente',
        icon: '\uD83D\uDCB0'
    },
    fiados: {
        table: 'agro_pending',
        columns: 'id,concepto,monto,monto_usd,currency,cliente,crop_id,fecha,transfer_state,created_at',
        dateField: 'fecha',
        filterFn: (r) => String(r.transfer_state || '').trim().toLowerCase() !== 'transferred',
        amtUsd: (r) => parseFloat(r.monto_usd) || parseFloat(r.monto) || 0,
        amtLocal: (r) => parseFloat(r.monto) || 0,
        whoExtract: (r) => String(r.cliente || '').trim() || extractWhoFromConcept(r.concepto),
        label: 'Fiados',
        labelTotal: 'Total pendiente',
        labelWho: 'Cliente',
        icon: '\uD83D\uDCD2'
    },
    perdidas: {
        table: 'agro_losses',
        columns: 'id,concepto,monto,monto_usd,currency,causa,crop_id,fecha,reverted_at,created_at',
        dateField: 'fecha',
        filterFn: (r) => !r.reverted_at,
        amtUsd: (r) => parseFloat(r.monto_usd) || parseFloat(r.monto) || 0,
        amtLocal: (r) => parseFloat(r.monto) || 0,
        whoExtract: (r) => String(r.causa || '').trim(),
        label: 'Perdidas',
        labelTotal: 'Total perdido',
        labelWho: 'Causa',
        icon: '\u26A0\uFE0F'
    },
    donaciones: {
        table: 'agro_transfers',
        columns: 'id,concepto,monto,monto_usd,currency,crop_id,fecha,created_at',
        dateField: 'fecha',
        filterFn: () => true,
        amtUsd: (r) => parseFloat(r.monto_usd) || parseFloat(r.monto) || 0,
        amtLocal: (r) => parseFloat(r.monto) || 0,
        whoExtract: (r) => extractWhoFromConcept(r.concepto),
        label: 'Donaciones',
        labelTotal: 'Total donado',
        labelWho: 'Beneficiario',
        icon: '\uD83C\uDF81'
    },
    otros: {
        composite: true,
        label: 'Otros',
        labelTotal: 'Total otros',
        labelWho: 'Origen',
        icon: '\uD83D\uDCE6'
    }
};

const TIME_RANGES = [
    { key: '7d', label: '7 dias', days: 7 },
    { key: '30d', label: '30 dias', days: 30 },
    { key: '90d', label: '90 dias', days: 90 },
    { key: 'year', label: 'Ano', days: 365 },
    { key: 'all', label: 'Todo', days: null }
];

// ============================================================
// STATE
// ============================================================

const sectionStatsCache = {};
const activeSectionRange = {};
const chartInstances = {};
const sectionLoadSequence = {};
let cropsMapCache = null;

// ============================================================
// DATA FETCHING
// ============================================================

async function getAuthUserId() {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
}

function normalizeCropId(value) {
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    return str || null;
}

function getStartDateISO(days) {
    if (!days) return null;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

async function fetchSectionRows(sectionKey, rangeDays, options = {}) {
    const cfg = SECTIONS[sectionKey];
    if (!cfg) return [];
    if (cfg.composite) return fetchOtrosRows(rangeDays, options);

    const userId = await getAuthUserId();
    if (!userId) return [];

    const startDate = getStartDateISO(rangeDays);
    const cropId = normalizeCropId(options.cropId);
    let query = supabase.from(cfg.table)
        .select(cfg.columns)
        .eq('user_id', userId)
        .is('deleted_at', null);

    if (cropId) {
        query = query.eq('crop_id', cropId);
    }

    if (startDate && cfg.dateField) {
        query = query.gte(cfg.dateField, startDate);
    }

    const { data, error } = await query;
    if (error) {
        console.warn(`[SECTION_STATS] Error fetching ${cfg.table}:`, error.message);
        if (error.message && error.message.includes('cliente')) {
            return fetchSectionRowsFallback(sectionKey, rangeDays, userId, options);
        }
        return [];
    }
    return (data || []).filter(cfg.filterFn);
}

async function fetchSectionRowsFallback(sectionKey, rangeDays, userId, options = {}) {
    const cfg = SECTIONS[sectionKey];
    if (!cfg) return [];
    const cols = cfg.columns.split(',').filter((c) => c.trim() !== 'cliente').join(',');
    const startDate = getStartDateISO(rangeDays);
    const cropId = normalizeCropId(options.cropId);
    let query = supabase.from(cfg.table)
        .select(cols)
        .eq('user_id', userId)
        .is('deleted_at', null);
    if (cropId) {
        query = query.eq('crop_id', cropId);
    }
    if (startDate && cfg.dateField) {
        query = query.gte(cfg.dateField, startDate);
    }
    const { data, error } = await query;
    if (error) {
        console.warn(`[SECTION_STATS] Fallback error ${cfg.table}:`, error.message);
        return [];
    }
    return (data || []).filter(cfg.filterFn);
}

async function fetchOtrosRows(rangeDays, options = {}) {
    const userId = await getAuthUserId();
    if (!userId) return [];

    const sources = [
        { table: 'agro_income', dateField: 'fecha', filter: (r) => !r.reverted_at, tag: 'pagados' },
        { table: 'agro_pending', dateField: 'fecha', filter: (r) => String(r.transfer_state || '').trim().toLowerCase() !== 'transferred', tag: 'fiados' },
        { table: 'agro_losses', dateField: 'fecha', filter: (r) => !r.reverted_at, tag: 'perdidas' },
        { table: 'agro_transfers', dateField: 'fecha', filter: () => true, tag: 'donaciones' },
        { table: 'agro_expenses', dateField: 'date', filter: () => true, tag: 'gastos' }
    ];

    const startDate = getStartDateISO(rangeDays);
    const cropId = normalizeCropId(options.cropId);
    const allRows = [];

    for (const src of sources) {
        const baseCols = src.table === 'agro_expenses'
            ? 'id,amount,monto_usd,currency,category,crop_id,date,created_at'
            : 'id,concepto,monto,monto_usd,currency,crop_id,' + src.dateField + ',created_at';

        let query = supabase.from(src.table)
            .select(baseCols)
            .eq('user_id', userId)
            .is('deleted_at', null);

        if (cropId) {
            query = query.eq('crop_id', cropId);
        } else {
            query = query.is('crop_id', null);
        }

        if (startDate) {
            query = query.gte(src.dateField, startDate);
        }

        const { data, error } = await query;
        if (error) {
            console.warn(`[SECTION_STATS] Otros fetch ${src.table}:`, error.message);
            continue;
        }
        (data || []).filter(src.filter).forEach((r) => {
            r._sourceTag = src.tag;
            if (src.table === 'agro_expenses') {
                r.fecha = r.date;
                r.monto = r.amount;
            }
            allRows.push(r);
        });
    }
    return allRows;
}

// ============================================================
// CROPS MAP
// ============================================================

async function buildCropsMap() {
    const userId = await getAuthUserId();
    if (!userId) return {};
    const { data } = await supabase.from('agro_crops')
        .select('id, name')
        .eq('user_id', userId)
        .is('deleted_at', null);
    const map = {};
    (data || []).forEach((c) => { map[c.id] = c.name; });
    return map;
}

async function getCropsMap() {
    if (!cropsMapCache) {
        cropsMapCache = await buildCropsMap();
    }
    return cropsMapCache;
}

// ============================================================
// STATS COMPUTATION
// ============================================================

function extractWhoFromConcept(concepto) {
    const str = String(concepto || '');
    const match = str.match(/(?:comprador|cliente|beneficiario|destino):\s*(.+?)(?:\s*[·|]|$)/i);
    return match ? match[1].trim() : '';
}

function computeStats(sectionKey, rows, cropsMap) {
    const cfg = SECTIONS[sectionKey];
    const getUsd = cfg?.composite
        ? (r) => parseFloat(r.monto_usd) || parseFloat(r.monto) || parseFloat(r.amount) || 0
        : cfg.amtUsd;
    const getLocal = cfg?.composite
        ? (r) => parseFloat(r.monto) || parseFloat(r.amount) || 0
        : cfg.amtLocal;
    const getWho = cfg?.composite
        ? (r) => r._sourceTag || ''
        : cfg.whoExtract;

    let totalUsd = 0;
    let totalBs = 0;
    let totalCop = 0;
    const byCrop = {};
    const byMonth = {};
    const byWho = {};
    const byWeek = {};

    rows.forEach((r) => {
        const usd = getUsd(r);
        totalUsd += usd;

        const curr = String(r.currency || '').toUpperCase();
        const local = getLocal(r);
        if (curr === 'VES') totalBs += local;
        else if (curr === 'COP') totalCop += local;

        const cropId = r.crop_id || '_sin_cultivo';
        if (!byCrop[cropId]) byCrop[cropId] = { usd: 0, count: 0 };
        byCrop[cropId].usd += usd;
        byCrop[cropId].count += 1;

        const fecha = r.fecha || r.date || r.created_at || '';
        const month = fecha ? fecha.substring(0, 7) : 'Sin fecha';
        if (!byMonth[month]) byMonth[month] = { usd: 0, bs: 0, count: 0 };
        byMonth[month].usd += usd;
        if (curr === 'VES') byMonth[month].bs += local;
        byMonth[month].count += 1;

        const weekKey = fecha ? getWeekKey(fecha) : 'Sin fecha';
        if (!byWeek[weekKey]) byWeek[weekKey] = { usd: 0, count: 0 };
        byWeek[weekKey].usd += usd;
        byWeek[weekKey].count += 1;

        const who = getWho(r);
        if (who) {
            if (!byWho[who]) byWho[who] = { usd: 0, count: 0 };
            byWho[who].usd += usd;
            byWho[who].count += 1;
        }
    });

    const byCropNamed = {};
    Object.entries(byCrop).forEach(([id, val]) => {
        const name = id === '_sin_cultivo'
            ? 'Sin cultivo'
            : (cropsMap[id] || ('Cultivo ' + id.slice(0, 6)));
        byCropNamed[name] = val;
    });

    const topCrops = Object.entries(byCropNamed).sort((a, b) => b[1].usd - a[1].usd);
    const topWho = Object.entries(byWho).sort((a, b) => b[1].usd - a[1].usd);
    const sortedMonths = Object.entries(byMonth)
        .filter(([k]) => k !== 'Sin fecha')
        .sort((a, b) => a[0].localeCompare(b[0]));
    const sortedWeeks = Object.entries(byWeek)
        .filter(([k]) => k !== 'Sin fecha')
        .sort((a, b) => a[0].localeCompare(b[0]));

    const bestMonth = sortedMonths.length > 0
        ? sortedMonths.reduce((best, curr) => curr[1].usd > best[1].usd ? curr : best)
        : null;
    const bestWeek = sortedWeeks.length > 0
        ? sortedWeeks.reduce((best, curr) => curr[1].usd > best[1].usd ? curr : best)
        : null;

    return {
        totalUsd,
        totalBs,
        totalCop,
        count: rows.length,
        avg: rows.length > 0 ? totalUsd / rows.length : 0,
        topCrops,
        topWho,
        sortedMonths,
        sortedWeeks,
        bestMonth,
        bestWeek,
        rows
    };
}

function getWeekKey(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Sin fecha';
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

// ============================================================
// FORMATTERS
// ============================================================

function fmtUSD(n) {
    const v = Number(n) || 0;
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtBs(n) {
    const v = Number(n) || 0;
    return 'Bs ' + v.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCOP(n) {
    const v = Number(n) || 0;
    return 'COP ' + v.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function slugify(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function readSelectedCropIdFromApp() {
    if (typeof window === 'undefined') return null;
    if (typeof window.getSelectedCropId === 'function') {
        return normalizeCropId(window.getSelectedCropId());
    }
    return normalizeCropId(window.YG_AGRO_SELECTED_CROP_ID);
}

function buildScopeContext(sectionKey, cropId, cropsMap) {
    const normalizedCropId = normalizeCropId(cropId);
    if (!normalizedCropId) {
        return {
            cropId: null,
            isGeneral: true,
            scopeLabel: 'Vista general',
            scopeCopy: sectionKey === 'otros'
                ? 'Analitica agregada de movimientos sin cultivo asignado dentro de esta seccion.'
                : 'Analitica agregada de todos los cultivos dentro de esta seccion.',
            scopeSlug: 'vista-general'
        };
    }

    const cropName = String(cropsMap?.[normalizedCropId] || '').trim() || 'Cultivo filtrado';
    return {
        cropId: normalizedCropId,
        isGeneral: false,
        scopeLabel: cropName,
        scopeCopy: sectionKey === 'otros'
            ? 'Analitica compuesta filtrada unicamente por ' + cropName + '.'
            : 'Analitica filtrada unicamente por ' + cropName + '.',
        scopeSlug: slugify(cropName) || 'cultivo-filtrado'
    };
}

function formatMonthLabel(m) {
    if (!m || m === 'Sin fecha') return 'Sin fecha';
    const parts = m.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return (months[parseInt(parts[1], 10) - 1] || parts[1]) + ' ' + parts[0];
}

function escMd(str) {
    return String(str || '').replace(/\|/g, '\u00B7').replace(/\n/g, ' ');
}

// ============================================================
// RENDERING
// ============================================================

function renderPanel(sectionKey, stats) {
    const cfg = SECTIONS[sectionKey];
    if (!cfg) return;
    const container = document.getElementById(sectionKey + '-dedicated-stats');
    if (!container) return;

    const range = activeSectionRange[sectionKey] || 'all';
    destroySectionCharts(sectionKey);
    container.innerHTML = '';
    container.hidden = false;
    container.appendChild(buildContextBar(stats));

    // Range bar
    container.appendChild(buildRangeBar(sectionKey, range));

    if (stats.count === 0) {
        const empty = document.createElement('div');
        empty.className = 'agro-ss-empty';
        empty.innerHTML = '<p class="agro-ss-empty__text">' + (stats.emptyText || 'No hay datos para este periodo.') + '</p>';
        container.appendChild(empty);
        return;
    }

    // KPI cards
    const kpis = document.createElement('div');
    kpis.className = 'agro-ss-kpis';
    let kpiHTML = '';
    kpiHTML += kpiCard(fmtUSD(stats.totalUsd), cfg.labelTotal + ' (USD)');
    if (stats.totalBs > 0) kpiHTML += kpiCard(fmtBs(stats.totalBs), cfg.labelTotal + ' (Bs)');
    if (stats.totalCop > 0) kpiHTML += kpiCard(fmtCOP(stats.totalCop), cfg.labelTotal + ' (COP)');
    kpiHTML += kpiCard(String(stats.count), 'Movimientos');
    kpiHTML += kpiCard(fmtUSD(stats.avg), 'Promedio (USD)');
    kpis.innerHTML = kpiHTML;
    container.appendChild(kpis);

    // Charts
    const chartsGrid = document.createElement('div');
    chartsGrid.className = 'agro-ss-charts';
    let hasCharts = false;

    if (stats.sortedMonths.length > 1) {
        chartsGrid.appendChild(createChartCard(cfg.labelTotal + ' por periodo', sectionKey + '-ss-chart-time'));
        hasCharts = true;
    }

    if (stats.topCrops.length > 1) {
        chartsGrid.appendChild(createChartCard('Por cultivo', sectionKey + '-ss-chart-crop'));
        hasCharts = true;
    }

    if (stats.topWho.length > 1) {
        const whoLabel = cfg.labelWho ? ('Por ' + cfg.labelWho.toLowerCase()) : 'Por origen';
        chartsGrid.appendChild(createChartCard(whoLabel, sectionKey + '-ss-chart-who'));
        hasCharts = true;
    }

    if (hasCharts) container.appendChild(chartsGrid);

    // Insights
    const insights = generateInsights(sectionKey, stats);
    if (insights.length > 0) {
        const insDiv = document.createElement('div');
        insDiv.className = 'agro-ss-insights';
        insights.forEach((text) => {
            const p = document.createElement('p');
            p.className = 'agro-ss-insight';
            p.textContent = text;
            insDiv.appendChild(p);
        });
        container.appendChild(insDiv);
    }

    // Export button
    const expDiv = document.createElement('div');
    expDiv.className = 'agro-ss-export';
    const expBtn = document.createElement('button');
    expBtn.type = 'button';
    expBtn.className = 'btn btn-gold agro-ss-export__btn';
    expBtn.textContent = 'Exportar estadisticas ' + cfg.label;
    expBtn.dataset.ssExport = sectionKey;
    expDiv.appendChild(expBtn);
    container.appendChild(expDiv);

    // Render charts after DOM paint
    requestAnimationFrame(() => renderCharts(sectionKey, stats));
}

function kpiCard(value, label) {
    return '<div class="agro-ss-kpi"><span class="agro-ss-kpi__value">' + value + '</span><span class="agro-ss-kpi__label">' + label + '</span></div>';
}

function buildContextBar(stats) {
    const wrapper = document.createElement('div');
    wrapper.className = 'agro-ss-context';

    const eyebrow = document.createElement('span');
    eyebrow.className = 'agro-ss-context__eyebrow';
    eyebrow.textContent = 'Contexto activo';

    const value = document.createElement('strong');
    value.className = 'agro-ss-context__value';
    value.textContent = stats.scopeLabel || 'Vista general';

    const copy = document.createElement('p');
    copy.className = 'agro-ss-context__copy';
    copy.textContent = stats.scopeCopy || 'Analitica agregada de todos los cultivos dentro de esta seccion.';

    wrapper.append(eyebrow, value, copy);
    return wrapper;
}

function createChartCard(title, canvasId) {
    const card = document.createElement('div');
    card.className = 'agro-ss-chart-card';

    const heading = document.createElement('h5');
    heading.className = 'agro-ss-chart-card__title';
    heading.textContent = title;

    const viewport = document.createElement('div');
    viewport.className = 'agro-ss-chart-card__viewport';

    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    viewport.appendChild(canvas);

    card.appendChild(heading);
    card.appendChild(viewport);
    return card;
}

function buildRangeBar(sectionKey, activeRange) {
    const bar = document.createElement('div');
    bar.className = 'agro-ss-range';
    TIME_RANGES.forEach(({ key, label }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'agro-ss-range__btn' + (key === activeRange ? ' is-active' : '');
        btn.dataset.ssRange = key;
        btn.dataset.ssSection = sectionKey;
        btn.textContent = label;
        bar.appendChild(btn);
    });
    return bar;
}

// ============================================================
// CHARTS
// ============================================================

const CHART_PALETTE = [
    '#C8A752', '#E8D5A0', '#8B7535', '#F0E6C8', '#6B5B2A',
    '#D4B96A', '#A08840', '#FFE8A0', '#BFA04A', '#9C8230'
];

function destroySectionCharts(sectionKey) {
    Object.keys(chartInstances).forEach((key) => {
        if (key.startsWith(sectionKey + '-')) {
            try { chartInstances[key].destroy(); } catch (_) { /* noop */ }
            delete chartInstances[key];
        }
    });
}

function renderCharts(sectionKey, stats) {
    const cfg = SECTIONS[sectionKey];
    if (!cfg) return;

    // Timeline bar chart
    const timeCanvas = document.getElementById(sectionKey + '-ss-chart-time');
    if (timeCanvas && stats.sortedMonths.length > 1 && typeof Chart !== 'undefined') {
        chartInstances[sectionKey + '-time'] = new Chart(timeCanvas, {
            type: 'bar',
            data: {
                labels: stats.sortedMonths.map(([m]) => formatMonthLabel(m)),
                datasets: [{
                    label: cfg.labelTotal + ' (USD)',
                    data: stats.sortedMonths.map(([, v]) => v.usd),
                    backgroundColor: 'rgba(200, 167, 82, 0.55)',
                    borderColor: '#C8A752',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: barChartOptions()
        });
    }

    // Crop doughnut
    const cropCanvas = document.getElementById(sectionKey + '-ss-chart-crop');
    if (cropCanvas && stats.topCrops.length > 1 && typeof Chart !== 'undefined') {
        const topN = stats.topCrops.slice(0, 8);
        chartInstances[sectionKey + '-crop'] = new Chart(cropCanvas, {
            type: 'doughnut',
            data: {
                labels: topN.map(([name]) => name),
                datasets: [{
                    data: topN.map(([, v]) => v.usd),
                    backgroundColor: CHART_PALETTE.slice(0, topN.length),
                    borderWidth: 0
                }]
            },
            options: doughnutChartOptions()
        });
    }

    // Who horizontal bar
    const whoCanvas = document.getElementById(sectionKey + '-ss-chart-who');
    if (whoCanvas && stats.topWho.length > 1 && typeof Chart !== 'undefined') {
        const topN = stats.topWho.slice(0, 8);
        chartInstances[sectionKey + '-who'] = new Chart(whoCanvas, {
            type: 'bar',
            data: {
                labels: topN.map(([name]) => name.length > 18 ? name.slice(0, 16) + '...' : name),
                datasets: [{
                    label: 'USD',
                    data: topN.map(([, v]) => v.usd),
                    backgroundColor: 'rgba(200, 167, 82, 0.45)',
                    borderColor: '#C8A752',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: barChartOptions(true)
        });
    }
}

function barChartOptions(horizontal) {
    const opts = {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion ? false : undefined,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => fmtUSD(ctx.parsed[horizontal ? 'x' : 'y'])
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: 'rgba(255,255,255,0.5)', callback: horizontal ? undefined : (v) => '$' + Number(v).toLocaleString() },
                grid: { color: 'rgba(255,255,255,0.06)' }
            },
            x: {
                beginAtZero: horizontal ? true : undefined,
                ticks: { color: 'rgba(255,255,255,0.5)', maxRotation: 45, callback: horizontal ? (v) => '$' + Number(v).toLocaleString() : undefined },
                grid: { display: !horizontal, color: 'rgba(255,255,255,0.06)' }
            }
        }
    };
    return opts;
}

function doughnutChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion ? false : undefined,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: 'rgba(255,255,255,0.7)',
                    font: { family: 'Rajdhani', size: 12 },
                    boxWidth: 14,
                    padding: 10
                }
            },
            tooltip: {
                callbacks: { label: (ctx) => ctx.label + ': ' + fmtUSD(ctx.parsed) }
            }
        }
    };
}

// ============================================================
// INSIGHTS
// ============================================================

function generateInsights(sectionKey, stats) {
    const cfg = SECTIONS[sectionKey];
    if (!cfg) return [];
    const insights = [];

    if (stats.bestMonth) {
        insights.push('El periodo con mas ' + cfg.label.toLowerCase() + ' fue ' + formatMonthLabel(stats.bestMonth[0]) + ' con ' + fmtUSD(stats.bestMonth[1].usd) + '.');
    }

    if (stats.topCrops.length > 0 && stats.topCrops[0][0] !== 'Sin cultivo') {
        const [name, val] = stats.topCrops[0];
        insights.push('El cultivo con mas ' + cfg.label.toLowerCase() + ' es ' + name + ' con ' + fmtUSD(val.usd) + ' (' + val.count + ' mov.).');
    }

    if (stats.topWho.length > 0 && cfg.labelWho) {
        const [name, val] = stats.topWho[0];
        if (sectionKey === 'fiados') {
            insights.push('El cliente con mayor deuda es ' + name + ' con ' + fmtUSD(val.usd) + ' (' + val.count + ' cuenta' + (val.count !== 1 ? 's' : '') + ').');
        } else if (sectionKey === 'pagados') {
            insights.push('El cliente principal es ' + name + ' con ' + fmtUSD(val.usd) + ' (' + val.count + ' mov.).');
        } else if (sectionKey === 'perdidas') {
            insights.push('La causa principal es ' + name + ' con ' + fmtUSD(val.usd) + '.');
        }
    }

    if (sectionKey === 'fiados' && stats.count > 0) {
        insights.push('Faltan por cobrar ' + fmtUSD(stats.totalUsd) + ' en ' + stats.count + ' cuenta' + (stats.count !== 1 ? 's' : '') + ' pendiente' + (stats.count !== 1 ? 's' : '') + '.');
    }

    if (stats.totalBs > 0 && stats.totalUsd > 0) {
        const bsPct = ((stats.totalBs / (stats.totalBs + stats.totalUsd)) * 100).toFixed(0);
        insights.push('El ' + bsPct + '% del movimiento esta en Bs y el resto en USD.');
    }

    return insights;
}

// ============================================================
// EXPORT MARKDOWN
// ============================================================

function buildSectionMD(sectionKey, stats) {
    const cfg = SECTIONS[sectionKey];
    if (!cfg) return '';
    const range = activeSectionRange[sectionKey] || 'all';
    const rangeLabel = TIME_RANGES.find((r) => r.key === range)?.label || 'Todo';
    const now = new Date().toISOString().split('T')[0];

    let md = '# ' + cfg.icon + ' Estadisticas: ' + cfg.label + '\n\n';
    md += '**Fecha:** ' + now + '  \n';
    md += '**Periodo:** ' + rangeLabel + '  \n';
    md += '**Contexto:** ' + escMd(stats.scopeLabel || 'Vista general') + '\n\n';

    md += '## KPIs\n\n';
    md += '| Metrica | Valor |\n|---|---|\n';
    md += '| ' + cfg.labelTotal + ' (USD) | ' + fmtUSD(stats.totalUsd) + ' |\n';
    if (stats.totalBs > 0) md += '| ' + cfg.labelTotal + ' (Bs) | ' + fmtBs(stats.totalBs) + ' |\n';
    if (stats.totalCop > 0) md += '| ' + cfg.labelTotal + ' (COP) | ' + fmtCOP(stats.totalCop) + ' |\n';
    md += '| Movimientos | ' + stats.count + ' |\n';
    md += '| Promedio (USD) | ' + fmtUSD(stats.avg) + ' |\n\n';

    if (stats.sortedMonths.length > 0) {
        md += '## Breakdown temporal\n\n';
        md += '| Periodo | USD | Mov. |\n|---|---|---|\n';
        stats.sortedMonths.forEach(([m, v]) => {
            md += '| ' + escMd(formatMonthLabel(m)) + ' | ' + fmtUSD(v.usd) + ' | ' + v.count + ' |\n';
        });
        md += '\n';
    }

    if (stats.topCrops.length > 0) {
        md += '## Por cultivo\n\n';
        md += '| Cultivo | USD | Mov. |\n|---|---|---|\n';
        stats.topCrops.forEach(([name, v]) => {
            md += '| ' + escMd(name) + ' | ' + fmtUSD(v.usd) + ' | ' + v.count + ' |\n';
        });
        md += '\n';
    }

    if (stats.topWho.length > 0) {
        md += '## Por ' + cfg.labelWho.toLowerCase() + '\n\n';
        md += '| ' + cfg.labelWho + ' | USD | Mov. |\n|---|---|---|\n';
        stats.topWho.slice(0, 15).forEach(([name, v]) => {
            md += '| ' + escMd(name) + ' | ' + fmtUSD(v.usd) + ' | ' + v.count + ' |\n';
        });
        md += '\n';
    }

    md += '---\n*Generado por YavlGold Agro*\n';
    return md;
}

function downloadMD(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// ============================================================
// ORCHESTRATOR
// ============================================================

const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showLoading(sectionKey) {
    const container = document.getElementById(sectionKey + '-dedicated-stats');
    if (!container) return;
    destroySectionCharts(sectionKey);
    container.hidden = false;
    container.innerHTML = '<div class="agro-ss-loading"><span class="agro-ss-loading__spinner"></span><p class="agro-ss-loading__text">Cargando estadisticas...</p></div>';
}

async function loadSectionStats(sectionKey, range) {
    const requestId = (sectionLoadSequence[sectionKey] || 0) + 1;
    sectionLoadSequence[sectionKey] = requestId;
    activeSectionRange[sectionKey] = range || 'all';
    const days = TIME_RANGES.find((r) => r.key === (range || 'all'))?.days || null;
    const cropId = readSelectedCropIdFromApp();
    showLoading(sectionKey);

    try {
        const [rows, cropsMap] = await Promise.all([
            fetchSectionRows(sectionKey, days, { cropId }),
            getCropsMap()
        ]);
        if (sectionLoadSequence[sectionKey] !== requestId) return;
        const scopeContext = buildScopeContext(sectionKey, cropId, cropsMap);
        const stats = computeStats(sectionKey, rows, cropsMap);
        Object.assign(stats, scopeContext, {
            emptyText: scopeContext.isGeneral
                ? 'No hay datos para este periodo en Vista general.'
                : 'No hay datos para este periodo en ' + scopeContext.scopeLabel + '.'
        });
        sectionStatsCache[sectionKey] = stats;
        renderPanel(sectionKey, stats);
    } catch (err) {
        if (sectionLoadSequence[sectionKey] !== requestId) return;
        console.error('[SECTION_STATS] Error loading', sectionKey, err);
        const container = document.getElementById(sectionKey + '-dedicated-stats');
        if (container) {
            container.innerHTML = '<div class="agro-ss-empty"><p class="agro-ss-empty__text">Error al cargar estadisticas.</p></div>';
        }
    }
}

// ============================================================
// INIT
// ============================================================

export function initSectionStats() {
    const reloadActiveStatsSection = () => {
        const activeView = typeof document !== 'undefined'
            ? String(document.body?.dataset?.agroActiveView || '').trim()
            : '';
        const activeSubview = typeof document !== 'undefined'
            ? String(document.body?.dataset?.agroSubview || '').trim()
            : '';
        if (activeSubview !== 'stats' || !SECTIONS[activeView]) return;
        const range = activeSectionRange[activeView] || 'all';
        loadSectionStats(activeView, range);
    };

    window.addEventListener('agro:shell:view-changed', (e) => {
        const { view, subview } = e.detail || {};
        if (subview === 'stats' && SECTIONS[view]) {
            const range = activeSectionRange[view] || 'all';
            loadSectionStats(view, range);
        }
    });
    window.addEventListener('agro:crop:changed', reloadActiveStatsSection);
    window.addEventListener('AGRO_CROPS_READY', () => {
        cropsMapCache = null;
        reloadActiveStatsSection();
    });

    document.addEventListener('click', (e) => {
        const rangeBtn = e.target.closest('[data-ss-range]');
        if (rangeBtn) {
            const range = rangeBtn.dataset.ssRange;
            const section = rangeBtn.dataset.ssSection;
            if (section && SECTIONS[section]) {
                loadSectionStats(section, range);
            }
            return;
        }

        const exportBtn = e.target.closest('[data-ss-export]');
        if (exportBtn) {
            const section = exportBtn.dataset.ssExport;
            const stats = sectionStatsCache[section];
            if (stats) {
                const md = buildSectionMD(section, stats);
                downloadMD(
                    'estadisticas-' + section + '-' + (stats.scopeSlug || 'vista-general') + '-' + new Date().toISOString().split('T')[0] + '.md',
                    md
                );
            }
            return;
        }
    });

    console.log('[SECTION_STATS] Initialized');
}
