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

function looksLikeSchemaMismatch(error) {
    const blob = `${String(error?.message || '')} ${String(error?.details || '')} ${String(error?.hint || '')} ${String(error?.code || '')}`.toLowerCase();
    return (
        blob.includes('42703') ||
        blob.includes('column') ||
        blob.includes('does not exist') ||
        blob.includes('could not find')
    );
}

async function fetchRowsWithAttempts(table, userId, attempts = []) {
    let lastError = null;
    const list = Array.isArray(attempts) ? attempts : [];

    for (const attempt of list) {
        try {
            let query = supabase
                .from(table)
                .select(attempt.select)
                .eq('user_id', userId);
            if (attempt.filterDeletedAt) {
                query = query.is('deleted_at', null);
            }
            if (typeof attempt.extendQuery === 'function') {
                query = attempt.extendQuery(query);
            }

            const { data, error } = await query;
            if (!error) {
                return { rows: Array.isArray(data) ? data : [], usedAttempt: attempt };
            }

            lastError = error;
            if (!looksLikeSchemaMismatch(error)) {
                break;
            }
        } catch (err) {
            lastError = err;
        }
    }

    return { rows: [], error: lastError };
}

function toSafeNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    const raw = String(value ?? '').trim();
    if (!raw) return 0;

    const normalized = raw
        .replace(/\s/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(/,(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function resolveAmountUsd(row) {
    const explicitUsd = toSafeNumber(row?.monto_usd);
    if (row?.monto_usd !== null && row?.monto_usd !== undefined && row?.monto_usd !== '') {
        return explicitUsd;
    }

    const amount = toSafeNumber(row?.monto ?? row?.amount);
    const currency = String(row?.currency || 'USD').trim().toUpperCase();
    const rate = toSafeNumber(row?.exchange_rate);
    if (currency !== 'USD' && rate > 0) {
        return amount / rate;
    }
    return amount;
}

function resolveBuyerName(row) {
    const direct = String(row?.cliente || row?.comprador || '').trim();
    if (direct) return direct;
    const fromConcept = parseWhoFromIncome(row?.concepto);
    return fromConcept || 'Sin comprador';
}

const CROP_STATUS_UI = {
    sembrado: { emoji: '🌱', text: 'Sembrado' },
    creciendo: { emoji: '🌿', text: 'Creciendo' },
    produccion: { emoji: '🌾', text: 'Producción' },
    finalizado: { emoji: '✅', text: 'Finalizado' },
    cancelado: { emoji: '❌', text: 'Cancelado' }
};

const CROP_STATUS_LEGACY_MAP = {
    growing: 'creciendo',
    ready: 'produccion',
    attention: 'sembrado',
    harvested: 'finalizado'
};

const CROP_STATUS_THRESHOLDS = {
    sembrado: 0,
    creciendo: 25,
    produccion: 70,
    finalizado: 100
};

function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
}

function getTodayKey() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function toUtcDate(dateStr) {
    const parts = String(dateStr || '').split('-').map((p) => Number(p));
    if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return null;
    const [year, month, day] = parts;
    return new Date(Date.UTC(year, month - 1, day));
}

function diffDays(dateA, dateB) {
    const a = toUtcDate(dateA);
    const b = toUtcDate(dateB);
    if (!a || !b) return null;
    return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function addDaysToDateKey(dateStr, days) {
    const base = toUtcDate(dateStr);
    if (!base || !Number.isFinite(days)) return null;
    base.setUTCDate(base.getUTCDate() + Math.round(days));
    const yyyy = base.getUTCFullYear();
    const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(base.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function normalizeCropStatus(status) {
    const value = String(status || '').toLowerCase().trim();
    if (!value) return 'creciendo';
    if (CROP_STATUS_UI[value]) return value;
    if (CROP_STATUS_LEGACY_MAP[value]) return CROP_STATUS_LEGACY_MAP[value];
    return value;
}

function computeCropProgress(crop) {
    const startDate = crop?.start_date;
    if (!startDate) return { ok: false, percent: null, dayIndex: 0, totalDays: 0 };

    const cycleDays = Number(crop?.cycle_days ?? crop?.template_duration_days);
    let totalDays = Number.isFinite(cycleDays) && cycleDays > 0 ? Math.round(cycleDays) : null;
    let endDate = totalDays ? addDaysToDateKey(startDate, totalDays) : null;

    if (!totalDays && crop?.expected_harvest_date) {
        const byDates = diffDays(crop.expected_harvest_date, startDate);
        if (byDates !== null) {
            totalDays = Math.max(1, byDates);
            endDate = crop.expected_harvest_date;
        }
    }

    if (!totalDays || !endDate) {
        return { ok: false, percent: null, dayIndex: 0, totalDays: 0 };
    }

    const todayKey = getTodayKey();
    const dayDiff = diffDays(todayKey, startDate);
    const dayIndex = clampNumber((dayDiff === null ? 0 : dayDiff) + 1, 0, totalDays);
    const percent = clampNumber((dayIndex / totalDays) * 100, 0, 100);

    return {
        ok: true,
        percent,
        dayIndex,
        totalDays
    };
}

function computeAutoCropStatus(crop, progress) {
    if (crop?.actual_harvest_date) return 'finalizado';
    if (!progress?.ok) {
        const fallback = normalizeCropStatus(crop?.status);
        return fallback || 'creciendo';
    }
    const percent = Number.isFinite(progress.percent) ? progress.percent : 0;
    if (percent >= CROP_STATUS_THRESHOLDS.finalizado) return 'finalizado';
    if (percent >= CROP_STATUS_THRESHOLDS.produccion) return 'produccion';
    if (percent >= CROP_STATUS_THRESHOLDS.creciendo) return 'creciendo';
    return 'sembrado';
}

function resolveCropStatus(crop, progress) {
    const override = String(crop?.status_override || '').trim();
    if (override) return normalizeCropStatus(override);
    const mode = String(crop?.status_mode || '').toLowerCase().trim();
    if (mode === 'auto') return computeAutoCropStatus(crop, progress);
    if (crop?.status) return normalizeCropStatus(crop.status);
    return computeAutoCropStatus(crop, progress);
}

function formatCropStatusLine(status) {
    const normalized = normalizeCropStatus(status);
    const meta = CROP_STATUS_UI[normalized];
    if (!meta) return status || 'N/A';
    return `${meta.emoji} ${meta.text}`;
}

function formatCropProgressLine(progress) {
    if (!progress?.ok) return 'N/A';
    const pctRounded = Math.round(Number(progress.percent) || 0);
    return `${pctRounded}% (día ${progress.dayIndex} de ${progress.totalDays})`;
}

function isUnassignedCropId(value) {
    return value === null || value === undefined || String(value).trim() === '';
}

function isCropActive(crop) {
    const progress = computeCropProgress(crop);
    const status = resolveCropStatus(crop, progress);
    return status !== 'finalizado' && status !== 'cancelado';
}

// ============================================================
// DATA FETCHERS (for sections not covered by summary)
// ============================================================

async function fetchCrops(userId) {
    try {
        const attempts = [
            {
                select: 'id,name,variety,status,status_override,status_mode,start_date,expected_harvest_date,actual_harvest_date,cycle_days,template_duration_days,investment',
                filterDeletedAt: true
            },
            {
                select: 'id,name,variety,status,status_override,status_mode,start_date,expected_harvest_date,actual_harvest_date,cycle_days,template_duration_days,investment',
                filterDeletedAt: false
            },
            {
                select: 'id,name,variety,status,start_date,expected_harvest_date,actual_harvest_date,investment',
                filterDeletedAt: false
            }
        ];
        const { rows, error } = await fetchRowsWithAttempts('agro_crops', userId, attempts);
        if (error) {
            console.warn('[StatsReport] crops error:', error.message || error);
        }
        return rows;
    } catch (err) {
        console.warn('[StatsReport] crops exception:', err);
        return [];
    }
}

async function fetchIncome(userId) {
    try {
        const attempts = [
            {
                select: 'id,concepto,monto,monto_usd,currency,exchange_rate,fecha,crop_id,cliente,comprador',
                filterDeletedAt: true
            },
            {
                select: 'id,concepto,monto,monto_usd,currency,exchange_rate,fecha,crop_id,comprador',
                filterDeletedAt: true
            },
            {
                select: 'id,concepto,monto,monto_usd,currency,fecha,crop_id,comprador',
                filterDeletedAt: true
            },
            {
                select: 'id,concepto,monto,monto_usd,currency,fecha,crop_id,comprador',
                filterDeletedAt: false
            },
            {
                select: 'id,concepto,monto,fecha,crop_id,comprador',
                filterDeletedAt: false
            }
        ];
        const { rows, error } = await fetchRowsWithAttempts('agro_income', userId, attempts);
        if (error) {
            console.warn('[StatsReport] income error:', error.message || error);
        }
        return rows;
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
    const unassigned = {
        incomeCents: 0,
        expenseCents: 0,
        pendingCents: 0,
        lossesCents: 0,
        incomeCount: 0,
        expenseCount: 0,
        pendingCount: 0,
        lossesCount: 0
    };

    if (!crops.length) {
        return { tableMd: 'Sin cultivos registrados\n', unassigned };
    }

    const cropMap = new Map();
    for (const c of crops) {
        cropMap.set(String(c.id), {
            name: c.name || 'Sin nombre',
            variety: c.variety || '',
            crop: c,
            investmentCents: toCents(c.investment),
            incomeCents: 0,
            expenseCents: 0,
            pendingCents: 0,
            lossesCents: 0
        });
    }

    for (const r of incomeRows) {
        const e = cropMap.get(String(r.crop_id));
        if (e) {
            e.incomeCents += toCents(r.monto_usd ?? r.monto);
        } else if (isUnassignedCropId(r.crop_id)) {
            unassigned.incomeCents += toCents(r.monto_usd ?? r.monto);
            unassigned.incomeCount += 1;
        }
    }
    for (const r of expenseRows) {
        const e = cropMap.get(String(r.crop_id));
        if (e) {
            e.expenseCents += toCents(r.monto_usd ?? r.amount);
        } else if (isUnassignedCropId(r.crop_id)) {
            unassigned.expenseCents += toCents(r.monto_usd ?? r.amount);
            unassigned.expenseCount += 1;
        }
    }
    for (const r of pendingRows) {
        const e = cropMap.get(String(r.crop_id));
        if (e) {
            e.pendingCents += toCents(r.monto_usd ?? r.monto);
        } else if (isUnassignedCropId(r.crop_id)) {
            unassigned.pendingCents += toCents(r.monto_usd ?? r.monto);
            unassigned.pendingCount += 1;
        }
    }
    for (const r of lossesRows) {
        const e = cropMap.get(String(r.crop_id));
        if (e) {
            e.lossesCents += toCents(r.monto_usd ?? r.monto);
        } else if (isUnassignedCropId(r.crop_id)) {
            unassigned.lossesCents += toCents(r.monto_usd ?? r.monto);
            unassigned.lossesCount += 1;
        }
    }

    let md = '| Cultivo | Estado | Progreso | Ingresos | Costos | Ganancia | Pendientes | ROI |\n';
    md += '|---------|--------|----------|----------|--------|----------|------------|-----|\n';

    for (const [, c] of cropMap) {
        const label = c.variety ? `${c.name} (${c.variety})` : c.name;
        const costCents = c.investmentCents + c.expenseCents + c.lossesCents;
        const profitCents = c.incomeCents - costCents;
        const roi = costCents > 0 ? (((c.incomeCents - costCents) / costCents) * 100).toFixed(1) + '%' : 'N/A';
        const progress = computeCropProgress(c.crop);
        const status = resolveCropStatus(c.crop, progress);
        const statusLine = formatCropStatusLine(status);
        const progressLine = formatCropProgressLine(progress);
        md += `| ${escMd(label)} | ${escMd(statusLine)} | ${escMd(progressLine)} | ${centsToStr(c.incomeCents)} | ${centsToStr(costCents)} | ${centsToStr(profitCents)} | ${centsToStr(c.pendingCents)} | ${roi} |\n`;
    }

    return { tableMd: md, unassigned };
}

function buildUnassignedSection(unassigned) {
    const info = unassigned || {};
    const totalCount = (info.incomeCount || 0)
        + (info.expenseCount || 0)
        + (info.pendingCount || 0)
        + (info.lossesCount || 0);

    let md = '## 📋 Sin cultivo asociado\n';
    if (!totalCount) {
        md += 'Sin movimientos sin cultivo asociado.\n\n';
        return md;
    }

    const profitCents = (info.incomeCents || 0) - ((info.expenseCents || 0) + (info.lossesCents || 0));

    md += '| Concepto | Registros | Monto (USD) |\n';
    md += '|----------|----------:|------------:|\n';
    md += `| Ingresos | ${info.incomeCount || 0} | ${centsToStr(info.incomeCents || 0)} |\n`;
    md += `| Gastos | ${info.expenseCount || 0} | ${centsToStr(info.expenseCents || 0)} |\n`;
    md += `| Pendientes | ${info.pendingCount || 0} | ${centsToStr(info.pendingCents || 0)} |\n`;
    md += `| Pérdidas | ${info.lossesCount || 0} | ${centsToStr(info.lossesCents || 0)} |\n`;
    md += `| Resultado neto | - | ${centsToStr(profitCents)} |\n\n`;
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
        const who = resolveBuyerName(r);
        if (!buyers.has(who)) buyers.set(who, { count: 0, totalCents: 0, paid: true, currencies: new Set() });
        const b = buyers.get(who);
        b.count += 1;
        b.totalCents += toCents(resolveAmountUsd(r));
        const cur = String(r.currency || 'USD').trim().toUpperCase() || 'USD';
        b.currencies.add(cur);
        currencyCount.set(cur, (currencyCount.get(cur) || 0) + 1);
    }

    for (const r of pendingRows) {
        const who = String(r?.cliente || r?.comprador || '').trim() || 'Sin cliente';
        if (!buyers.has(who)) buyers.set(who, { count: 0, totalCents: 0, paid: true, currencies: new Set() });
        const b = buyers.get(who);
        b.count += 1;
        b.totalCents += toCents(resolveAmountUsd(r));
        const cur = String(r.currency || 'USD').trim().toUpperCase() || 'USD';
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

        const activeCrops = crops.filter((crop) => isCropActive(crop));

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
        const perCropBreakdown = buildPerCropTable(crops, incomeRows, expenseRows, pendingRows, lossesRows);
        md += `## 🌾 Resumen por Cultivo\n`;
        md += perCropBreakdown.tableMd;
        md += '\n> _Montos en USD \u00b7 Tasas al momento del registro_\n\n---\n\n';
        md += buildUnassignedSection(perCropBreakdown.unassigned);
        md += '---\n\n';

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
