/**
 * YavlGold V9.4 - Agro Statistics Module
 * "Monitor de Rentabilidad"
 * Chart.js Visualization with Real Data
 *
 * UNIFIED SOURCE OF TRUTH: computeAgroFinanceSummaryV1()
 */

import supabase from '../assets/js/config/supabase-config.js';

let roiChartInstance = null;
let expensesChartInstance = null;

// Anti-race guard for refresh
window.__YG_AGRO_STATS_REFRESH_INFLIGHT__ = false;

// Schema capability cache (avoid repeated 400/404)
const schemaCaps = (() => {
    if (typeof window === 'undefined') {
        return { tables: {}, columns: {} };
    }
    if (!window.__YG_AGRO_SCHEMA_CAPS__) {
        window.__YG_AGRO_SCHEMA_CAPS__ = { tables: {}, columns: {} };
    } else {
        window.__YG_AGRO_SCHEMA_CAPS__.tables = window.__YG_AGRO_SCHEMA_CAPS__.tables || {};
        window.__YG_AGRO_SCHEMA_CAPS__.columns = window.__YG_AGRO_SCHEMA_CAPS__.columns || {};
    }
    return window.__YG_AGRO_SCHEMA_CAPS__;
})();

function getColumnCaps(table) {
    if (!schemaCaps.columns[table]) schemaCaps.columns[table] = {};
    return schemaCaps.columns[table];
}

function markTableMissing(table) {
    if (schemaCaps.tables[table] === false) return false;
    schemaCaps.tables[table] = false;
    console.debug('[AGRO_STATS] Missing table cached:', table);
    return true;
}

function markColumnMissing(table, column) {
    const cols = getColumnCaps(table);
    if (cols[column] === false) return false;
    cols[column] = false;
    console.debug('[AGRO_STATS] Missing column cached:', `${table}.${column}`);
    return true;
}

function isMissingTableError(error, table) {
    if (!error) return false;
    const code = (error.code || '').toString();
    const msg = (error.message || '').toLowerCase();
    const details = (error.details || '').toLowerCase();
    const text = `${msg} ${details}`;
    const tableRef = (table || '').toLowerCase();
    const hasMissingPhrase = text.includes('does not exist') || text.includes('could not find') || text.includes('not found');
    if (code === '42P01') return true;
    if (code === 'PGRST116' && hasMissingPhrase) return true;
    if (!hasMissingPhrase) return false;
    const mentionsTable = !tableRef || text.includes(tableRef);
    return (text.includes('relation') || text.includes('table')) && mentionsTable;
}

function isMissingColumnError(error, column) {
    if (!error) return false;
    const code = (error.code || '').toString();
    const col = column.toLowerCase();
    const msg = (error.message || '').toLowerCase();
    const details = (error.details || '').toLowerCase();
    const text = `${msg} ${details}`;
    const hasMissingPhrase = text.includes('does not exist') || text.includes('could not find') || text.includes('not found');
    if (code === '42703') return true;
    if (code === 'PGRST204' && hasMissingPhrase) return true;
    if (!hasMissingPhrase) return false;
    return text.includes('column') && text.includes(col);
}

async function selectAgroTable(table, columns, useDeletedAt) {
    if (schemaCaps.tables[table] === false) {
        return { data: null, error: null, skipped: true };
    }

    const columnCaps = getColumnCaps(table);
    const shouldUseDeletedAt = useDeletedAt && columnCaps.deleted_at !== false;

    let query = supabase.from(table).select(columns);
    if (shouldUseDeletedAt) query = query.is('deleted_at', null);

    let { data, error } = await query;

    if (error) {
        if (isMissingTableError(error, table)) {
            markTableMissing(table);
            return { data: null, error: null, skipped: true };
        }

        if (shouldUseDeletedAt && isMissingColumnError(error, 'deleted_at')) {
            markColumnMissing(table, 'deleted_at');
            const retry = await supabase.from(table).select(columns);
            data = retry.data;
            error = retry.error;
            if (error && isMissingTableError(error, table)) {
                markTableMissing(table);
                return { data: null, error: null, skipped: true };
            }
        }
    }

    return { data, error, skipped: false };
}

// ============================================================
// FUENTE ÚNICA DE VERDAD - Unified Finance Summary V1
// ============================================================

/**
 * Computes unified financial summary from all Agro data sources.
 * This is THE SINGLE SOURCE OF TRUTH for all KPIs and charts.
 *
 * @returns {Promise<Object|null>} Unified summary object or null if not authenticated
 */
export async function computeAgroFinanceSummaryV1() {
    // Anti-race: skip if already in flight
    if (window.__YG_AGRO_STATS_REFRESH_INFLIGHT__) {
        console.debug('[AGRO_STATS] Refresh already in flight, skipping');
        return null;
    }
    window.__YG_AGRO_STATS_REFRESH_INFLIGHT__ = true;

    try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
            console.warn('[AGRO_STATS] Usuario no autenticado');
            return null;
        }

        const userId = userData.user.id;

        // 1) Expenses REALES (filtrar deleted_at IS NULL)
        let expenseTotal = 0;
        const costByCategory = {};
        try {
            const result = await selectAgroTable('agro_expenses', 'amount, category', true);
            if (result?.error) {
                console.warn('[AGRO_STATS] Error fetching expenses:', result.error);
            }
            const expenses = result?.data;
            if (expenses) {
                expenses.forEach(e => {
                    const amt = parseFloat(e.amount) || 0;
                    expenseTotal += amt;
                    const cat = e.category || 'Otros';
                    costByCategory[cat] = (costByCategory[cat] || 0) + amt;
                });
            }
        } catch (err) {
            console.warn('[AGRO_STATS] Error fetching expenses:', err);
        }

        // 2) Income REALES (filter deleted_at if column exists)
        let incomeTotal = 0;
        try {
            const result = await selectAgroTable('agro_income', 'monto', true);
            if (result?.error) {
                console.warn('[AGRO_STATS] Error fetching income:', result.error);
            }
            const income = result?.data;
            if (income) {
                income.forEach(i => {
                    incomeTotal += parseFloat(i.monto) || 0;
                });
            }
        } catch (err) {
            console.warn('[AGRO_STATS] Error fetching income:', err);
        }

        // 3) Pending (si la tabla existe - graceful fallback)
        let pendingTotal = 0;
        try {
            const result = await selectAgroTable('agro_pending', 'monto', true);
            if (result?.error) {
                console.warn('[AGRO_STATS] Error fetching pending:', result.error);
            }
            const pending = result?.data;
            if (pending) {
                pending.forEach(p => {
                    pendingTotal += parseFloat(p.monto) || 0;
                });
            }
        } catch (err) {
            console.warn('[AGRO_STATS] Error fetching pending:', err);
        }

        // 4) Losses (si la tabla existe - graceful fallback)
        let lossesTotal = 0;
        try {
            const result = await selectAgroTable('agro_losses', 'monto, causa', true);
            if (result?.error) {
                console.warn('[AGRO_STATS] Error fetching losses:', result.error);
            }
            const losses = result?.data;
            if (losses) {
                losses.forEach(l => {
                    const amt = parseFloat(l.monto) || 0;
                    lossesTotal += amt;
                    const cat = l.category || 'Pérdidas';
                    costByCategory[cat] = (costByCategory[cat] || 0) + amt;
                });
            }
        } catch (err) {
            console.warn('[AGRO_STATS] Error fetching losses:', err);
        }

        // 5) Transfers (si la tabla existe - graceful fallback)
        let transfersTotal = 0;
        try {
            const result = await selectAgroTable('agro_transfers', 'monto', true);
            if (result?.error) {
                console.warn('[AGRO_STATS] Error fetching transfers:', result.error);
            }
            const transfers = result?.data;
            if (transfers) {
                transfers.forEach(t => {
                    transfersTotal += parseFloat(t.monto) || 0;
                });
            }
        } catch (err) {
            console.warn('[AGRO_STATS] Error fetching transfers:', err);
        }

        // 6) Crops visibles (solo inversion - NO usar revenue_projected)
        let cropsInvestmentTotal = 0;
        // V9.5: revenue_projected ELIMINADO - solo usamos ingresos reales
        try {
            const result = await selectAgroTable('agro_crops', 'investment, status', true);
            if (result?.error) {
                console.warn('[AGRO_STATS] Error fetching crops:', result.error);
            }
            const crops = result?.data;
            if (crops) {
                crops.forEach(c => {
                    cropsInvestmentTotal += parseFloat(c.investment) || 0;
                });
            }
        } catch (err) {
            console.warn('[AGRO_STATS] Error fetching crops:', err);
        }

        // Cálculos derivados - V9.5: SOLO datos reales, NO proyecciones
        const costTotal = cropsInvestmentTotal + expenseTotal + lossesTotal; // Costo Total = Inversión + Gastos + Pérdidas
        const profitNet = incomeTotal - costTotal;    // Ganancia Neta = Ingresos - Costos

        // ROI: N/A si no hay ingresos reales (V9.5: NO usar revenue_projected)
        let roiDisplay = 'N/A';
        let roiValue = null;
        if (incomeTotal > 0 && costTotal > 0) {
            roiValue = ((incomeTotal - costTotal) / costTotal) * 100;
            roiDisplay = roiValue.toFixed(1) + '%';
        }

        const summary = {
            expenseTotal,
            incomeTotal,
            pendingTotal,
            lossesTotal,
            transfersTotal,
            costTotal,
            cropsInvestmentTotal,
            // V9.5: revenueProjectedTotal ELIMINADO
            profitNet,
            roiDisplay,
            roiValue,
            costByCategory,
            hasData: expenseTotal > 0 || incomeTotal > 0 || cropsInvestmentTotal > 0 || pendingTotal > 0 || lossesTotal > 0 || transfersTotal > 0,
            updatedAtISO: new Date().toISOString()
        };

        console.log('[AGRO_STATS] Summary computed:', summary);
        return summary;

    } finally {
        window.__YG_AGRO_STATS_REFRESH_INFLIGHT__ = false;
    }
}

// ============================================================
// UI UPDATE FUNCTIONS - Consume unified summary
// ============================================================

/**
 * Updates ALL KPIs and charts from unified summary object.
 * @param {Object} summary - Output from computeAgroFinanceSummaryV1()
 */
export function updateUIFromSummary(summary) {
    if (!summary) return;

    const formatCurrency = (num) => {
        const safe = Number(num);
        if (!Number.isFinite(safe)) return '$0.00';
        return '$' + safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const formatK = (num) => {
        const safe = Number(num);
        if (!Number.isFinite(safe) || safe === 0) return '$0.00';
        if (Math.abs(safe) < 1000) return formatCurrency(safe);
        return '$' + (safe / 1000).toFixed(1) + 'k';
    };

    // 1. Facturero KPIs
    const kpiExpenses = document.getElementById('kpi-expenses-total');
    if (kpiExpenses) kpiExpenses.textContent = formatCurrency(summary.expenseTotal);

    const kpiInvestment = document.getElementById('kpi-crops-investment');
    if (kpiInvestment) kpiInvestment.textContent = formatCurrency(summary.cropsInvestmentTotal);

    const kpiGlobal = document.getElementById('kpi-global-total');
    if (kpiGlobal) kpiGlobal.textContent = formatCurrency(summary.expenseTotal + summary.cropsInvestmentTotal);

    const kpiPending = document.getElementById('kpi-pending-total');
    if (kpiPending) kpiPending.textContent = formatCurrency(summary.pendingTotal || 0);

    const kpiLosses = document.getElementById('kpi-losses-total');
    if (kpiLosses) kpiLosses.textContent = formatCurrency(summary.lossesTotal || 0);

    const kpiTransfers = document.getElementById('kpi-transfers-total');
    if (kpiTransfers) kpiTransfers.textContent = formatCurrency(summary.transfersTotal || 0);

    // 2. ROI Badge (neutral when N/A) + "Sin ventas registradas" message
    const roiBadge = document.getElementById('roi-badge');
    if (roiBadge) {
        if (summary.roiDisplay === 'N/A') {
            roiBadge.textContent = 'ROI: N/A';
            roiBadge.style.color = '#9ca3af'; // Neutral gray
            roiBadge.style.borderColor = 'rgba(156, 163, 175, 0.3)';
            roiBadge.style.background = 'rgba(156, 163, 175, 0.1)';
        } else {
            const isPositive = summary.roiValue >= 0;
            roiBadge.textContent = `ROI: ${isPositive ? '+' : ''}${summary.roiDisplay}`;
            roiBadge.style.color = isPositive ? '#C8A752' : '#f87171';
            roiBadge.style.borderColor = isPositive ? 'rgba(200, 167, 82, 0.3)' : 'rgba(248, 113, 113, 0.3)';
            roiBadge.style.background = isPositive ? 'rgba(200, 167, 82, 0.1)' : 'rgba(248, 113, 113, 0.1)';
        }
    }

    // ROI subtitle message
    const roiSubtitle = document.getElementById('roi-subtitle');
    if (roiSubtitle) {
        if (summary.roiDisplay === 'N/A') {
            roiSubtitle.textContent = 'Sin ventas registradas';
            roiSubtitle.style.display = 'block';
        } else {
            roiSubtitle.textContent = '';
            roiSubtitle.style.display = 'none';
        }
    }

    // 3. Resumen Financiero Panel - V9.5: Solo ingresos REALES
    const summaryRevenue = document.getElementById('summary-revenue');
    if (summaryRevenue) summaryRevenue.textContent = formatK(summary.incomeTotal);

    const summaryCost = document.getElementById('summary-cost');
    if (summaryCost) summaryCost.textContent = formatK(summary.costTotal);

    const summaryProfit = document.getElementById('summary-profit');
    if (summaryProfit) {
        summaryProfit.textContent = formatK(summary.profitNet);
        summaryProfit.style.color = summary.profitNet >= 0 ? '#C8A752' : '#f87171';
    }

    const summaryMargin = document.getElementById('summary-margin');
    if (summaryMargin) {
        if (summary.incomeTotal <= 0) {
            summaryMargin.textContent = 'N/A';
            summaryMargin.style.color = '#9ca3af';
        } else {
            const marginPct = ((summary.profitNet / summary.incomeTotal) * 100).toFixed(1);
            summaryMargin.textContent = marginPct + '%';
            summaryMargin.style.color = parseFloat(marginPct) >= 0 ? '#C8A752' : '#f87171';
        }
    }

    // 4. Expenses Total (doughnut center)
    const expensesTotal = document.getElementById('expenses-total');
    if (expensesTotal) {
        expensesTotal.textContent = formatK(summary.costTotal);
        expensesTotal.style.color = summary.costTotal > 0 ? '#fff' : '#666';
    }

    // 5. Timestamp display "Actualizado hace X min"
    const statsTimestamp = document.getElementById('stats-updated-timestamp');
    if (statsTimestamp && summary.updatedAtISO) {
        const updatedAt = new Date(summary.updatedAtISO);
        const now = new Date();
        const diffMs = now - updatedAt;
        const diffMin = Math.floor(diffMs / 60000);
        const timeText = diffMin < 1 ? 'ahora' : `hace ${diffMin} min`;
        statsTimestamp.textContent = `Actualizado ${timeText}`;
        statsTimestamp.style.cssText = 'font-size: 0.75rem; color: #6b7280; font-style: italic;';
    }

    // 6. Update Charts with REAL data
    updateExpensesChartFromSummary(summary.costByCategory, summary.costTotal);
    updateROIChartFromSummary(summary);
}

/**
 * Updates expenses doughnut chart with REAL category data
 */
function updateExpensesChartFromSummary(costByCategory, costTotal) {
    if (!expensesChartInstance) return;

    const categories = Object.keys(costByCategory);
    const values = Object.values(costByCategory).map(v => v / 1000);

    if (categories.length === 0 || values.every(v => v === 0)) {
        expensesChartInstance.data.labels = ['Sin datos'];
        expensesChartInstance.data.datasets[0].data = [0.1];
        expensesChartInstance.data.datasets[0].backgroundColor = ['#333'];
    } else {
        // Color palette for categories
        const colors = ['#C8A752', '#3b82f6', '#a855f7', '#4b5563', '#10b981', '#f59e0b', '#ef4444'];
        expensesChartInstance.data.labels = categories;
        expensesChartInstance.data.datasets[0].data = values;
        expensesChartInstance.data.datasets[0].backgroundColor = categories.map((_, i) => colors[i % colors.length]);
    }

    expensesChartInstance.update();
}

/**
 * Updates ROI bar chart with real data - V9.5: NO usar revenueProjectedTotal
 */
function updateROIChartFromSummary(summary) {
    if (!roiChartInstance) return;

    const invK = summary.cropsInvestmentTotal / 1000;
    // V9.5: Solo ingresos reales, sin fallback a proyección
    const revK = summary.incomeTotal / 1000;
    const profitK = summary.profitNet / 1000;

    // Si no hay ingresos reales, mostrar mensaje en gráfico
    if (summary.incomeTotal === 0) {
        roiChartInstance.data.datasets[0].data = [invK, 0, 0];
        roiChartInstance.options.plugins.title = {
            display: true,
            text: 'Sin ingresos registrados',
            color: '#9ca3af',
            font: { size: 12 }
        };
    } else {
        roiChartInstance.data.datasets[0].data = [invK, revK, profitK];
        roiChartInstance.options.plugins.title = { display: false };
    }
    roiChartInstance.update();
}

export function initStats() {
    if (typeof Chart === 'undefined') {
        setTimeout(() => {
            if (typeof Chart !== 'undefined') {
                setupROIChart();
                setupExpensesChart();
                updateStats([]); // Init with empty stats
            }
        }, 500);
        return;
    }

    setupROIChart();
    setupExpensesChart();
    updateStats([]); // Init with empty stats
}

/**
 * Update charts and summary with real crop data
 * V9.5: NO más gastos ficticios. Solo datos reales.
 * @param {Array} crops List of crop objects
 */
export function updateStats(crops) {
    if (!crops) crops = [];

    // Calculate Totals - V9.5: Solo inversión real de cultivos
    let totalInvestment = 0;
    let totalArea = 0;

    // V9.5: ELIMINADO - No más estimación ficticia de gastos
    // Los gastos reales vienen de agro_expenses via computeAgroFinanceSummaryV1()

    crops.forEach(crop => {
        const inv = parseFloat(crop.investment) || 0;
        totalInvestment += inv;
        totalArea += parseFloat(crop.area_size) || 0;
    });

    // V9.5: profit/roi/margin ahora se calculan en computeAgroFinanceSummaryV1()
    // Esta función solo sincroniza los datos de cultivos

    // Update UI Summary Panel con inversión
    updateSummaryPanel(0, totalInvestment, 0, 'N/A', 'N/A');

    // V9.5: Los gráficos ahora se actualizan via updateUIFromSummary()
    // No llamar updateExpensesChart con datos ficticios
    updateROIChart(crops, totalInvestment, 0);
}

function updateSummaryPanel(revenue, investment, profit, margin, roi) {
    const formatK = (num) => {
        if (num === 0) return '$0k';
        return '$' + (num / 1000).toFixed(1) + 'k';
    };

    // NOTE: ROI Badge is now handled by updateUIFromSummary() with proper N/A logic
    // Do NOT update roi-badge here to prevent overriding unified stats

    // 2. Expenses Total - DEPRECATED: handled by updateUIFromSummary
    const expensesTotal = document.getElementById('expenses-total');
    if (expensesTotal) {
        expensesTotal.textContent = formatK(investment);
    }

    // 3. Summary Panel Values
    const revEl = document.getElementById('summary-revenue');
    if (revEl) revEl.textContent = formatK(revenue);

    const costEl = document.getElementById('summary-cost');
    if (costEl) costEl.textContent = formatK(investment);

    const profitEl = document.getElementById('summary-profit');
    if (profitEl) {
        profitEl.textContent = formatK(profit);
        profitEl.style.color = profit >= 0 ? '#C8A752' : '#f87171';
    }

    const marginEl = document.getElementById('summary-margin');
    if (marginEl) {
        marginEl.textContent = `${margin}%`;
        marginEl.style.color = margin >= 0 ? '#C8A752' : '#f87171';
    }
}

// Opciones comunes
const COMMON_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(10, 10, 10, 0.95)',
            titleColor: '#C8A752',
            bodyColor: '#fff',
            borderColor: 'rgba(200,167,82,0.3)',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
                label: function (context) {
                    return ` ${context.label}: $${context.parsed.y || context.parsed}k`;
                }
            }
        }
    }
};

function setupROIChart() {
    const ctx = document.getElementById('roiChart')?.getContext('2d');
    if (!ctx) return;

    const gradientGold = ctx.createLinearGradient(0, 0, 0, 280);
    gradientGold.addColorStop(0, 'rgba(200, 167, 82, 0.4)');
    gradientGold.addColorStop(1, 'rgba(200, 167, 82, 0.0)');

    roiChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Inicio', 'Siembra', 'Crecimiento', 'Maduración', 'Cosecha', 'Venta'],
            datasets: [
                {
                    label: 'Retorno (Ventas)',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#C8A752',
                    backgroundColor: gradientGold,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Inversión',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            ...COMMON_OPTIONS,
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#666', callback: v => '$' + v + 'k' }
                },
                x: { grid: { display: false }, ticks: { color: '#888' } }
            }
        }
    });
}

function updateROIChart(crops, totalInv, totalRev) {
    if (!roiChartInstance) return;

    // Simulate timeline based on crop stages
    // If no crops, flatline 0
    if (crops.length === 0) {
        roiChartInstance.data.datasets[0].data = [0, 0, 0, 0, 0, 0];
        roiChartInstance.data.datasets[1].data = [0, 0, 0, 0, 0, 0];
        roiChartInstance.update();
        return;
    }

    // Simple projection logic
    const timelineDataInv = [
        totalInv * 0.2, // Inicio
        totalInv * 0.5, // Siembra
        totalInv * 0.7, // Crecimiento
        totalInv * 0.9, // Maduración
        totalInv * 1.0, // Cosecha
        totalInv * 1.0  // Venta
    ].map(v => v / 1000); // Convert to K

    const timelineDataRev = [
        0, 0, 0,
        totalRev * 0.1, // Maduración (early sales?)
        totalRev * 0.4, // Cosecha
        totalRev * 1.0  // Venta
    ].map(v => v / 1000);

    roiChartInstance.data.datasets[0].data = timelineDataRev;
    roiChartInstance.data.datasets[1].data = timelineDataInv;
    roiChartInstance.update();
}

function setupExpensesChart() {
    const ctx = document.getElementById('expensesChart')?.getContext('2d');
    if (!ctx) return;

    expensesChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Insumos', 'Riego/Luz', 'Mano de Obra', 'Otros'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#C8A752', '#3b82f6', '#a855f7', '#4b5563'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: { legend: { display: false } }
        }
    });
}

function updateExpensesChart(inputs, utils, labor, other) {
    if (!expensesChartInstance) return;

    const data = [inputs, utils, labor, other].map(v => v / 1000);

    // Check if empty
    if (data.every(v => v === 0)) {
        // Show empty grey ring maybe? Or just 0
        expensesChartInstance.data.datasets[0].data = [0.1, 0, 0, 0]; // Tiny placeholder?
        // Better: just zeroes
        expensesChartInstance.data.datasets[0].data = [0, 0, 0, 0];
        expensesChartInstance.data.datasets[0].backgroundColor = ['#333']; // Grey for empty
    } else {
        expensesChartInstance.data.datasets[0].data = data;
        expensesChartInstance.data.datasets[0].backgroundColor = ['#C8A752', '#3b82f6', '#a855f7', '#4b5563'];
    }

    expensesChartInstance.update();

    // Also update center text via ID
    const totalLabel = document.getElementById('expenses-total');
    if (totalLabel) {
        const total = (inputs + utils + labor + other) / 1000;
        totalLabel.textContent = `$${total.toFixed(1)}k`;
        totalLabel.style.color = total > 0 ? '#fff' : '#666';
    }
}
