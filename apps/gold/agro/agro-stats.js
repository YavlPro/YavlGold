/**
 * YavlGold V9.4 - Agro Statistics Module
 * "Monitor de Rentabilidad"
 * Chart.js Visualization with Real Data
 */

let roiChartInstance = null;
let expensesChartInstance = null;

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
 * @param {Array} crops List of crop objects
 */
export function updateStats(crops) {
    if (!crops) crops = [];

    // Calculate Totals
    let totalInvestment = 0;
    let totalRevenue = 0;
    let totalArea = 0;

    // Expenses breakdown (Estimation based on investment)
    // Assuming investment is split: 45% Inputs, 15% Utilities, 30% Labor, 10% Other
    let expenseInputs = 0;
    let expenseUtilities = 0;
    let expenseLabor = 0;
    let expenseOther = 0;

    crops.forEach(crop => {
        const inv = parseFloat(crop.investment) || 0;
        const rev = parseFloat(crop.revenue_projected) || (inv * 1.5); // Fallback projection if not set

        totalInvestment += inv;
        totalRevenue += rev;
        totalArea += parseFloat(crop.area_size) || 0;

        expenseInputs += inv * 0.45;
        expenseUtilities += inv * 0.15;
        expenseLabor += inv * 0.30;
        expenseOther += inv * 0.10;
    });

    const netProfit = totalRevenue - totalInvestment;
    const roi = totalInvestment > 0 ? ((netProfit / totalInvestment) * 100).toFixed(1) : 0;
    const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Update UI Summary Panel
    updateSummaryPanel(totalRevenue, totalInvestment, netProfit, margin, roi);

    // Update Charts
    updateROIChart(crops, totalInvestment, totalRevenue);
    updateExpensesChart(expenseInputs, expenseUtilities, expenseLabor, expenseOther);
}

function updateSummaryPanel(revenue, investment, profit, margin, roi) {
    const formatK = (num) => {
        if (num === 0) return '$0k';
        return '$' + (num / 1000).toFixed(1) + 'k';
    };

    // 1. ROI Badge
    const roiBadge = document.getElementById('roi-badge');
    if (roiBadge) {
        roiBadge.textContent = `ROI: ${roi > 0 ? '+' : ''}${roi}%`;
        roiBadge.style.color = roi >= 0 ? '#C8A752' : '#f87171';
        roiBadge.style.borderColor = roi >= 0 ? 'rgba(200, 167, 82, 0.3)' : 'rgba(248, 113, 113, 0.3)';
        roiBadge.style.background = roi >= 0 ? 'rgba(200, 167, 82, 0.1)' : 'rgba(248, 113, 113, 0.1)';
    }

    // 2. Expenses Total
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
