/**
 * YavlGold V9.7 — Agro Stats Report
 * Generates a global statistical Markdown report
 * reusing computeAgroFinanceSummaryV1() as single source of truth.
 */

import supabase from '../assets/js/config/supabase-config.js';
import { computeAgroFinanceSummaryV1 } from './agro-stats.js';

// ============================================================
// HELPERS
// ============================================================

function toCents(value) {
    return Math.round((Number(value) || 0) * 100);
}

function centsToStr(cents) {
    const abs = Math.abs(cents);
    const sign = cents < 0 ? '-' : '';
    return `${sign}$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pctSafe(numerator, denominator) {
    if (!denominator) return 'N/A';
    return ((numerator / denominator) * 100).toFixed(1) + '%';
}

function escMd(str) {
    return String(str || '').replace(/\|/g, '·').replace(/\n/g, ' ');
}

// ============================================================
// DATA FETCHERS (for sections not covered by summary)
// ============================================================

async function fetchCrops(userId) {
    try {
        const { data, error } = await supabase
            .from('agro_crops')
            .select('id,name,variety,status,investment')
            .eq('user_id', userId)
            .is('deleted_at', null);
        if (error) { console.warn('[StatsReport] crops error:', error.message); return []; }
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn('[StatsReport] crops exception:', err);
        return [];
    }
}

async function fetchIncome(userId) {
    try {
        const { data, error } = await supabase
            .from('agro_income')
            .select('id,concepto,monto,monto_usd,currency,fecha,crop_id,deleted_at')
            .eq('user_id', userId)
            .is('deleted_at', null);
        if (error) { console.warn('[StatsReport] income error:', error.message); return []; }
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn('[StatsReport] income exception:', err);
        return [];
    }
}

async function fetchExpenses(userId) {
    try {
        const { data, error } = await supabase
            .from('agro_expenses')
            .select('id,amount,monto_usd,currency,crop_id,deleted_at')
            .eq('user_id', userId)
            .is('deleted_at', null);
        if (error) { console.warn('[StatsReport] expenses error:', error.message); return []; }
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn('[StatsReport] expenses exception:', err);
        return [];
    }
}

async function fetchPending(userId) {
    try {
        const { data, error } = await supabase
            .from('agro_pending')
            .select('id,concepto,monto,monto_usd,currency,fecha,cliente,crop_id,deleted_at,transfer_state')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .neq('transfer_state', 'transferred');
        if (error) { console.warn('[StatsReport] pending error:', error.message); return []; }
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn('[StatsReport] pending exception:', err);
        return [];
    }
}

async function fetchLosses(userId) {
    try {
        const { data, error } = await supabase
            .from('agro_losses')
            .select('id,monto,monto_usd,currency,crop_id,deleted_at')
            .eq('user_id', userId)
            .is('deleted_at', null);
        if (error) { console.warn('[StatsReport] losses error:', error.message); return []; }
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn('[StatsReport] losses exception:', err);
        return [];
    }
}

// ============================================================
// PER-CROP BREAKDOWN
// ============================================================

function buildPerCropTable(crops, incomeRows, expenseRows, pendingRows, lossesRows) {
    if (!crops.length) return 'Sin cultivos registrados\n';

    const cropMap = new Map();
    for (const c of crops) {
        cropMap.set(String(c.id), {
            name: c.name || 'Sin nombre',
            variety: c.variety || '',
            status: c.status || 'N/A',
            investmentCents: toCents(c.investment),
            incomeCents: 0,
            expenseCents: 0,
            pendingCents: 0,
            lossesCents: 0
        });
    }

    for (const r of incomeRows) {
        const e = cropMap.get(String(r.crop_id));
        if (e) e.incomeCents += toCents(r.monto_usd ?? r.monto);
    }
    for (const r of expenseRows) {
        const e = cropMap.get(String(r.crop_id));
        if (e) e.expenseCents += toCents(r.monto_usd ?? r.amount);
    }
    for (const r of pendingRows) {
        const e = cropMap.get(String(r.crop_id));
        if (e) e.pendingCents += toCents(r.monto_usd ?? r.monto);
    }
    for (const r of lossesRows) {
        const e = cropMap.get(String(r.crop_id));
        if (e) e.lossesCents += toCents(r.monto_usd ?? r.monto);
    }

    let md = '| Cultivo | Estado | Ingresos | Costos | Ganancia | Pendientes | ROI |\n';
    md += '|---------|--------|----------|--------|----------|------------|-----|\n';

    for (const [, c] of cropMap) {
        const label = c.variety ? `${c.name} (${c.variety})` : c.name;
        const costCents = c.investmentCents + c.expenseCents + c.lossesCents;
        const profitCents = c.incomeCents - costCents;
        const roi = costCents > 0 ? (((c.incomeCents - costCents) / costCents) * 100).toFixed(1) + '%' : 'N/A';
        md += `| ${escMd(label)} | ${escMd(c.status)} | ${centsToStr(c.incomeCents)} | ${centsToStr(costCents)} | ${centsToStr(profitCents)} | ${centsToStr(c.pendingCents)} | ${roi} |\n`;
    }

    return md;
}

// ============================================================
// BUYER RANKING
// ============================================================

function parseWhoFromIncome(concept) {
    const text = String(concept || '').trim();
    const m = text.match(/^Venta a\s+(.+?)\s+-\s+(.+)$/i);
    return m ? m[1].trim() : '';
}

function buildBuyerRanking(incomeRows, pendingRows) {
    const buyers = new Map();
    const currencyCount = new Map();

    for (const r of incomeRows) {
        const who = parseWhoFromIncome(r.concepto) || 'Sin comprador';
        if (!buyers.has(who)) buyers.set(who, { count: 0, totalCents: 0, paid: true, currencies: new Set() });
        const b = buyers.get(who);
        b.count += 1;
        b.totalCents += toCents(r.monto_usd ?? r.monto);
        const cur = r.currency || 'USD';
        b.currencies.add(cur);
        currencyCount.set(cur, (currencyCount.get(cur) || 0) + 1);
    }

    for (const r of pendingRows) {
        const who = r.cliente || 'Sin cliente';
        if (!buyers.has(who)) buyers.set(who, { count: 0, totalCents: 0, paid: true, currencies: new Set() });
        const b = buyers.get(who);
        b.count += 1;
        b.totalCents += toCents(r.monto_usd ?? r.monto);
        const cur = r.currency || 'USD';
        b.currencies.add(cur);
        b.paid = false;
        currencyCount.set(cur, (currencyCount.get(cur) || 0) + 1);
    }

    const sorted = Array.from(buyers.entries())
        .sort((a, b) => b[1].totalCents - a[1].totalCents);

    if (!sorted.length) return 'Sin compradores registrados\n';

    let md = '| Cliente | Compras | Monedas | Total (USD) | Estado |\n';
    md += '|---------|--------:|---------|------------:|--------|\n';
    for (const [name, b] of sorted) {
        const estado = b.paid ? '✅ Pagado' : '⏳ Debe';
        const curs = Array.from(b.currencies).join(', ');
        md += `| ${escMd(name)} | ${b.count} | ${curs} | ${centsToStr(b.totalCents)} | ${estado} |\n`;
    }
    return md;
}

// ============================================================
// MAIN EXPORT FUNCTION
// ============================================================

/**
 * Generates and downloads a global statistical Markdown report.
 */
export async function exportStatsReport() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert('Sesión no válida.'); return; }

        // Get profile name
        let userName = user.email || 'Usuario';
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name,username')
                .eq('id', user.id)
                .single();
            if (profile) {
                userName = profile.full_name || profile.username || userName;
            }
        } catch { /* ignore */ }

        // Compute unified summary (single source of truth)
        const summary = await computeAgroFinanceSummaryV1();

        // Fetch raw rows for per-crop breakdown and buyer ranking
        const [crops, incomeRows, expenseRows, pendingRows, lossesRows] = await Promise.all([
            fetchCrops(user.id),
            fetchIncome(user.id),
            fetchExpenses(user.id),
            fetchPending(user.id),
            fetchLosses(user.id)
        ]);

        // Use summary totals (already computed, audited)
        const incomeCents = toCents(summary?.incomeTotal || 0);
        const costCents = toCents(summary?.costTotal || 0);
        const pendingCents = toCents(summary?.pendingTotal || 0);
        const lossesCents = toCents(summary?.lossesTotal || 0);
        const profitCents = incomeCents - costCents;

        // Margin = (profit / income) * 100
        const marginStr = incomeCents > 0 ? ((profitCents / incomeCents) * 100).toFixed(1) + '%' : 'N/A';
        // ROI = (profit / cost) * 100
        const roiStr = costCents > 0 ? ((profitCents / costCents) * 100).toFixed(1) + '%' : 'N/A';

        // Projected (if all pending is collected)
        const projIncomeCents = incomeCents + pendingCents;
        const projProfitCents = projIncomeCents - costCents;
        const projRoiStr = costCents > 0 ? (((projIncomeCents - costCents) / costCents) * 100).toFixed(1) + '%' : 'N/A';

        const activeCrops = crops.filter(c => c.status === 'activo' || c.status === 'En progreso' || c.status === 'cosechado');

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

        // Build Markdown
        let md = '';
        md += `# 📊 YavlGold — Informe Estadístico\n`;
        md += `> **Fecha:** ${dateStr} ${timeStr}\n`;
        md += `> **Usuario:** ${escMd(userName)}\n`;
        md += `> **Cultivos activos:** ${activeCrops.length}\n`;
        md += `> **Sistema:** YavlGold\n\n`;
        md += `---\n\n`;

        // Global summary
        md += `## 💰 Resumen Global\n`;
        md += `| Concepto | Monto |\n`;
        md += `|----------|------:|\n`;
        md += `| Total ingresos | ${centsToStr(incomeCents)} |\n`;
        md += `| Total costos | ${centsToStr(costCents)} |\n`;
        md += `| Ganancia neta | ${centsToStr(profitCents)} |\n`;
        md += `| Margen | ${marginStr} |\n`;
        md += `| ROI | ${roiStr} |\n`;
        md += `| Pendientes por cobrar | ${centsToStr(pendingCents)} |\n`;
        md += `| Ingreso proyectado (si se cobra todo) | ${centsToStr(projIncomeCents)} |\n`;
        md += `| ROI proyectado | ${projRoiStr} |\n\n`;
        md += `> _Moneda base: USD \u00b7 Tasas al momento del registro_\n\n`;
        md += `---\n\n`;

        // Per-crop breakdown
        md += `## 🌾 Resumen por Cultivo\n`;
        md += buildPerCropTable(crops, incomeRows, expenseRows, pendingRows, lossesRows);
        md += '\n> _Montos en USD \u00b7 Tasas al momento del registro_\n\n---\n\n';

        // Buyer ranking
        md += `## 👥 Ranking de Compradores\n`;
        md += buildBuyerRanking(incomeRows, pendingRows);
        md += '\n---\n\n';

        // Projection
        md += `## 📈 Proyección\n`;
        md += `Si se cobran los ${centsToStr(pendingCents)} pendientes:\n`;
        md += `- **Ingreso total:** ${centsToStr(projIncomeCents)}\n`;
        md += `- **Ganancia neta:** ${centsToStr(projProfitCents)}\n`;
        md += `- **ROI:** ${projRoiStr}\n\n`;

        // Footer
        md += `---\n`;
        md += `> ⚠️ Documento confidencial — datos financieros personales\n`;
        md += `> Generado por YavlGold · yavlgold.com\n`;

        // Download with UTF-8 BOM
        const blob = new Blob(['\ufeff' + md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Estadisticas_YavlGold_${dateStr}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.info(`[StatsReport] Exported global stats report (${crops.length} crops, ${incomeRows.length} income, ${expenseRows.length} expenses, ${pendingRows.length} pending, ${lossesRows.length} losses)`);
    } catch (err) {
        console.error('[StatsReport] Export error:', err);
        alert('Error al exportar estadísticas: ' + (err.message || err));
    }
}
