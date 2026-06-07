/**
 * YavlGold V9.7 — Agro Stats Report
 * Generates a global statistical Markdown report
 * from export raw rows to keep global and per-crop totals aligned.
 */

import supabase from '../assets/js/config/supabase-config.js';
import { getPendingTransferToken } from './agro-unit-totals.js';
import { filterQARows, validateExportBundle, showExportError } from './agro-report-guard.js';
import { toCents, formatMoney, resolveAmountUsd } from './agro-format.js';
import { calcularRentabilidad } from './agro-profit-calculator.js';
import {
    chooseReportClientName,
    getMarkdownPrivacyState,
    maskReportMetric,
    maskReportMoney,
    maskReportName,
    normalizeReportClientKey,
    normalizeReportClientName
} from './agro-report-format.js';
import {
    CROP_STATUS_UI,
    CROP_STATUS_LEGACY_MAP,
    CROP_STATUS_THRESHOLDS,
    CROP_DISPLAY_FALLBACK_ICON,
    CROP_DISPLAY_FALLBACK_NAME,
    CROP_EMOJI_TOKEN_RE,
    CROP_TEXT_TOKEN_RE,
    clampNumber,
    getTodayKey,
    toUtcDate,
    diffDays,
    addDaysToDateKey,
    isCropEmojiToken,
    normalizeCropIcon,
    buildCropDisplayLabel,
    normalizeCropStatus,
    computeCropProgress,
    computeAutoCropStatus,
    resolveCropStatus,
    formatCropStatusLine,
    formatCropProgressLine,
    isUnassignedCropId,
    isCropActive
} from './agro-report-shared.js';

// ============================================================
// HELPERS
// ============================================================

function pctSafe(numerator, denominator) {
    if (!denominator) return 'N/A';
    return ((numerator / denominator) * 100).toFixed(1) + '%';
}

function escMd(str) {
    return String(str || '').replace(/\|/g, '·').replace(/\n/g, ' ');
}

function fmtMoneyMd(cents, currency, privacy) {
    return maskReportMoney(formatMoney(cents, currency), privacy);
}

function fmtMetricMd(value, privacy) {
    return maskReportMetric(value, privacy);
}

function isActivePendingRow(row) {
    const token = getPendingTransferToken(row);
    return token !== 'transferred' && token !== 'reverted';
}

function looksLikeSchemaMismatch(error) {
    const blob = `${String(error?.message || '')} ${String(error?.details || '')} ${String(error?.hint || '')} ${String(error?.code || '')}`.toLowerCase();
    return (
        blob.includes('42703') ||
        blob.includes('pgrst204') ||
        blob.includes('42p01') ||
        blob.includes('column') ||
        blob.includes('does not exist') ||
        blob.includes('could not find')
    );
}

const statsReportMissingColumnsCache = new Map();

function getMissingColumnsForTable(table) {
    const key = String(table || '').trim().toLowerCase();
    if (!key) return new Set();
    if (!statsReportMissingColumnsCache.has(key)) {
        statsReportMissingColumnsCache.set(key, new Set());
    }
    return statsReportMissingColumnsCache.get(key);
}

function rememberMissingColumn(table, column) {
    const key = String(table || '').trim().toLowerCase();
    const col = String(column || '').trim().toLowerCase();
    if (!key || !col) return;
    getMissingColumnsForTable(key).add(col);
}

function extractMissingColumnName(error) {
    const text = `${String(error?.message || '')} ${String(error?.details || '')}`.toLowerCase();
    const patterns = [
        /column\s+([a-z0-9_]+)\s+does not exist/i,
        /column\s+([a-z0-9_]+)\b/i,
        /column\s+[a-z0-9_]+\.\s*([a-z0-9_]+)\s+does not exist/i,
        /could not find the '([a-z0-9_]+)' column/i,
        /'"([a-z0-9_]+)"'/i,
        /'([a-z0-9_]+)'/i
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]) return match[1].toLowerCase();
    }
    return '';
}

async function fetchRowsWithAttempts(table, userId, attempts = []) {
    let lastError = null;
    const list = Array.isArray(attempts) ? attempts : [];
    const missingColumns = getMissingColumnsForTable(table);

    for (const attempt of list) {
        let selectFields = String(attempt?.select || '')
            .split(',')
            .map((field) => String(field || '').trim())
            .filter((field) => field.length > 0 && !missingColumns.has(field.toLowerCase()));
        let applyDeletedAt = !!attempt?.filterDeletedAt && !missingColumns.has('deleted_at');
        let useExtendedQuery = typeof attempt?.extendQuery === 'function';

        for (let retry = 0; retry < 6; retry += 1) {
            if (!selectFields.length) break;

            try {
                let query = supabase
                    .from(table)
                    .select(selectFields.join(','))
                    .eq('user_id', userId);
                // Exclude soft-deleted rows by default, even if deleted_at is not in select list.
                if (applyDeletedAt) {
                    query = query.is('deleted_at', null);
                }
                if (useExtendedQuery) {
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

                const missingCol = extractMissingColumnName(error);
                if (!missingCol) {
                    break;
                }

                rememberMissingColumn(table, missingCol);
                const beforeLength = selectFields.length;
                selectFields = selectFields.filter((field) => field.toLowerCase() !== missingCol);

                if (missingCol === 'deleted_at') {
                    applyDeletedAt = false;
                }

                if (beforeLength === selectFields.length && useExtendedQuery) {
                    useExtendedQuery = false;
                }

                continue;
            } catch (err) {
                lastError = err;
                break;
            }
        }
    }

    return { rows: [], error: lastError };
}

function resolveBuyerName(row) {
    const direct = String(row?.cliente || row?.comprador || '').trim();
    if (direct) return direct;
    const fromConcept = parseWhoFromIncome(row?.concepto);
    return fromConcept || 'Sin cliente';
}

// ============================================================
// DATA FETCHERS (for sections not covered by summary)
// ============================================================

async function fetchCrops(userId) {
    try {
        const attempts = [
            {
                select: 'id,name,variety,icon,status,status_override,start_date,expected_harvest_date,actual_harvest_date,investment',
                filterDeletedAt: true
            },
            {
                select: 'id,name,variety,icon,status,status_override,start_date,expected_harvest_date,actual_harvest_date,investment',
                filterDeletedAt: false
            },
            {
                select: 'id,name,variety,icon,status,start_date,expected_harvest_date,actual_harvest_date,investment',
                filterDeletedAt: false
            },
            {
                select: 'id,name,variety,icon,start_date,expected_harvest_date,investment',
                filterDeletedAt: false
            }
        ];
        const { rows, error } = await fetchRowsWithAttempts('agro_crops', userId, attempts);
        if (error) {
            console.warn('[StatsReport] crops error:', error.message || error);
        }
        return filterQARows(rows);
    } catch (err) {
        console.warn('[StatsReport] crops exception:', err);
        return [];
    }
}

async function fetchIncome(userId) {
    try {
        const attempts = [
            {
                select: 'id,concepto,monto,monto_usd,currency,exchange_rate,fecha,crop_id,buyer_group_key,reverted_at',
                filterDeletedAt: true,
                extendQuery: (query) => query.is('reverted_at', null)
            },
            {
                select: 'id,concepto,monto,monto_usd,currency,exchange_rate,fecha,crop_id,buyer_group_key',
                filterDeletedAt: true
            },
            {
                select: 'id,concepto,monto,monto_usd,currency,fecha,crop_id,buyer_group_key',
                filterDeletedAt: true
            },
            {
                select: 'id,concepto,monto,fecha,crop_id',
                filterDeletedAt: true
            }
        ];
        const { rows, error } = await fetchRowsWithAttempts('agro_income', userId, attempts);
        if (error) {
            console.warn('[StatsReport] income error:', error.message || error);
        }
        return filterQARows(rows);
    } catch (err) {
        console.warn('[StatsReport] income exception:', err);
        return [];
    }
}

async function fetchExpenses(userId) {
    try {
        const attempts = [
            {
                select: 'id,concept,amount,monto_usd,currency,crop_id,deleted_at',
                filterDeletedAt: true
            },
            {
                select: 'id,concept,amount,monto_usd,currency,crop_id',
                filterDeletedAt: true
            }
        ];
        const { rows, error } = await fetchRowsWithAttempts('agro_expenses', userId, attempts);
        if (error) {
            console.warn('[StatsReport] expenses error:', error.message || error);
        }
        return filterQARows(rows);
    } catch (err) {
        console.warn('[StatsReport] expenses exception:', err);
        return [];
    }
}

async function fetchPending(userId) {
    try {
        const attempts = [
            {
                select: 'id,concepto,monto,monto_usd,currency,exchange_rate,fecha,cliente,crop_id,buyer_group_key,deleted_at,transfer_state,transferred_to,transferred_income_id,reverted_at',
                filterDeletedAt: true
            },
            {
                select: 'id,concepto,monto,monto_usd,currency,fecha,cliente,crop_id,buyer_group_key,deleted_at',
                filterDeletedAt: true
            },
            {
                select: 'id,concepto,monto,monto_usd,currency,fecha,cliente,crop_id,buyer_group_key',
                filterDeletedAt: true
            }
        ];
        const { rows, error } = await fetchRowsWithAttempts('agro_pending', userId, attempts);
        if (error) {
            console.warn('[StatsReport] pending error:', error.message || error);
        }
        return filterQARows(rows).filter(isActivePendingRow);
    } catch (err) {
        console.warn('[StatsReport] pending exception:', err);
        return [];
    }
}

async function fetchLosses(userId) {
    try {
        const attempts = [
            {
                select: 'id,concepto,monto,monto_usd,currency,crop_id,deleted_at',
                filterDeletedAt: true
            },
            {
                select: 'id,concepto,monto,monto_usd,currency,crop_id',
                filterDeletedAt: true
            }
        ];
        const { rows, error } = await fetchRowsWithAttempts('agro_losses', userId, attempts);
        if (error) {
            console.warn('[StatsReport] losses error:', error.message || error);
        }
        return filterQARows(rows);
    } catch (err) {
        console.warn('[StatsReport] losses exception:', err);
        return [];
    }
}

// ============================================================
// PER-CROP BREAKDOWN
// ============================================================

function buildPerCropTable(crops, incomeRows, expenseRows, pendingRows, lossesRows, privacy = getMarkdownPrivacyState()) {
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

    const cropMap = new Map();
    for (const c of crops) {
        cropMap.set(String(c.id), {
            name: c.name || 'Sin nombre',
            variety: c.variety || '',
            label: buildCropDisplayLabel(c),
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
        const amountCents = toCents(resolveAmountUsd(r));
        if (e) {
            e.incomeCents += amountCents;
        } else if (isUnassignedCropId(r.crop_id)) {
            unassigned.incomeCents += amountCents;
            unassigned.incomeCount += 1;
        }
    }
    for (const r of expenseRows) {
        const e = cropMap.get(String(r.crop_id));
        const amountCents = toCents(resolveAmountUsd(r));
        if (e) {
            e.expenseCents += amountCents;
        } else if (isUnassignedCropId(r.crop_id)) {
            unassigned.expenseCents += amountCents;
            unassigned.expenseCount += 1;
        }
    }
    for (const r of pendingRows) {
        const e = cropMap.get(String(r.crop_id));
        const amountCents = toCents(resolveAmountUsd(r));
        if (e) {
            e.pendingCents += amountCents;
        } else if (isUnassignedCropId(r.crop_id)) {
            unassigned.pendingCents += amountCents;
            unassigned.pendingCount += 1;
        }
    }
    for (const r of lossesRows) {
        const e = cropMap.get(String(r.crop_id));
        const amountCents = toCents(resolveAmountUsd(r));
        if (e) {
            e.lossesCents += amountCents;
        } else if (isUnassignedCropId(r.crop_id)) {
            unassigned.lossesCents += amountCents;
            unassigned.lossesCount += 1;
        }
    }

    // Operational expenses from YGAgroOperationalCycles (closed cycles)
    const opsApi = typeof window !== 'undefined' ? window.YGAgroOperationalCycles : null;
    if (opsApi?.getOperationalExpensesByCrop) {
        const opsByCrop = opsApi.getOperationalExpensesByCrop();
        for (const [cropIdKey, opsUsd] of opsByCrop) {
            const e = cropMap.get(String(cropIdKey));
            if (e) e.expenseCents += toCents(Number(opsUsd) || 0);
        }
    }

    const totals = {
        investmentCents: 0,
        incomeCents: 0,
        expenseCents: 0,
        pendingCents: 0,
        lossesCents: 0,
        costCents: 0,
        profitCents: 0,
        projectedIncomeCents: 0,
        projectedProfitCents: 0
    };

    let md = '';
    if (!cropMap.size) {
        md = 'Sin cultivos registrados\n';
    } else {
        md = '| Cultivo | Estado | Progreso | Pagados | Costos | Ganancia | Fiados | ROI |\n';
        md += '|---------|--------|----------|----------|--------|----------|------------|-----|\n';

        for (const [, c] of cropMap) {
            totals.investmentCents += c.investmentCents;
            totals.incomeCents += c.incomeCents;
            totals.expenseCents += c.expenseCents;
            totals.pendingCents += c.pendingCents;
            totals.lossesCents += c.lossesCents;

            const label = c.label || (c.variety ? `${c.name} (${c.variety})` : c.name);
            const finance = calcularRentabilidad({
                pagados: c.incomeCents,
                inversion: c.investmentCents,
                gastos: c.expenseCents,
                perdidas: c.lossesCents,
                fiados: c.pendingCents
            });
            const costCents = finance.costosTotales;
            const profitCents = finance.rentabilidad;
            const roi = costCents > 0 ? (((c.incomeCents - costCents) / costCents) * 100).toFixed(1) + '%' : 'N/A';
            const progress = computeCropProgress(c.crop);
            const status = resolveCropStatus(c.crop, progress);
            const statusLine = formatCropStatusLine(status);
            const progressLine = formatCropProgressLine(progress);
            md += `| ${escMd(label)} | ${escMd(statusLine)} | ${escMd(progressLine)} | ${fmtMoneyMd(c.incomeCents, 'USD', privacy)} | ${fmtMoneyMd(costCents, 'USD', privacy)} | ${fmtMoneyMd(profitCents, 'USD', privacy)} | ${fmtMoneyMd(c.pendingCents, 'USD', privacy)} | ${fmtMetricMd(roi, privacy)} |\n`;
        }
    }

    totals.incomeCents += unassigned.incomeCents;
    totals.expenseCents += unassigned.expenseCents;
    totals.pendingCents += unassigned.pendingCents;
    totals.lossesCents += unassigned.lossesCents;
    const totalsFinance = calcularRentabilidad({
        pagados: totals.incomeCents,
        inversion: totals.investmentCents,
        gastos: totals.expenseCents,
        perdidas: totals.lossesCents,
        fiados: totals.pendingCents
    });
    totals.costCents = totalsFinance.costosTotales;
    totals.profitCents = totalsFinance.rentabilidad;
    totals.projectedIncomeCents = totals.incomeCents + totals.pendingCents;
    totals.projectedProfitCents = totals.projectedIncomeCents - totals.costCents;

    return { tableMd: md, unassigned, totals };
}

function buildUnassignedSection(unassigned, privacy = getMarkdownPrivacyState()) {
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

    const profitCents = calcularRentabilidad({
        pagados: info.incomeCents || 0,
        gastos: info.expenseCents || 0,
        perdidas: info.lossesCents || 0,
        fiados: info.pendingCents || 0
    }).rentabilidad;

    md += '| Concepto | Registros | Monto (USD) |\n';
    md += '|----------|----------:|------------:|\n';
    md += `| Pagados | ${info.incomeCount || 0} | ${fmtMoneyMd(info.incomeCents || 0, 'USD', privacy)} |\n`;
    md += `| Gastos | ${info.expenseCount || 0} | ${fmtMoneyMd(info.expenseCents || 0, 'USD', privacy)} |\n`;
    md += `| Fiados | ${info.pendingCount || 0} | ${fmtMoneyMd(info.pendingCents || 0, 'USD', privacy)} |\n`;
    md += `| Pérdidas | ${info.lossesCount || 0} | ${fmtMoneyMd(info.lossesCents || 0, 'USD', privacy)} |\n`;
    md += `| Resultado neto | - | ${fmtMoneyMd(profitCents, 'USD', privacy)} |\n\n`;
    return md;
}

// ============================================================
// BUYER RANKING
// ============================================================

function parseWhoFromIncome(concept) {
    const text = String(concept || '').trim();
    if (!text) return '';

    const tokenMatch = text.match(/(?:comprador|cliente|beneficiario|destino):\s*([^|·]+?)(?:\s*[·|]|$)/i);
    if (tokenMatch?.[1]) {
        return tokenMatch[1].trim();
    }

    const legacyMatch = text.match(/^Venta a\s+(.+?)\s+-\s+(.+)$/i);
    return legacyMatch?.[1]?.trim() || '';
}

function resolveBuyerKey(row, displayName) {
    return normalizeReportClientKey(row?.buyer_group_key || displayName) || normalizeReportClientKey(displayName);
}

function buildBuyerRanking(incomeRows, pendingRows, privacy = getMarkdownPrivacyState()) {
    const buyers = new Map();
    const currencyCount = new Map();

    for (const r of incomeRows) {
        const who = resolveBuyerName(r);
        const key = resolveBuyerKey(r, who) || `__income_${buyers.size}`;
        if (!buyers.has(key)) buyers.set(key, { displayWho: who, count: 0, totalCents: 0, hasPaid: false, hasPending: false, currencies: new Set() });
        const b = buyers.get(key);
        b.displayWho = chooseReportClientName(b.displayWho, who);
        b.count += 1;
        b.totalCents += toCents(resolveAmountUsd(r));
        b.hasPaid = true;
        const cur = String(r.currency || 'USD').trim().toUpperCase() || 'USD';
        b.currencies.add(cur);
        currencyCount.set(cur, (currencyCount.get(cur) || 0) + 1);
    }

    for (const r of pendingRows) {
        const who = resolveBuyerName(r);
        const key = resolveBuyerKey(r, who) || `__pending_${buyers.size}`;
        if (!buyers.has(key)) buyers.set(key, { displayWho: who, count: 0, totalCents: 0, hasPaid: false, hasPending: false, currencies: new Set() });
        const b = buyers.get(key);
        b.displayWho = chooseReportClientName(b.displayWho, who);
        b.count += 1;
        b.totalCents += toCents(resolveAmountUsd(r));
        b.hasPending = true;
        const cur = String(r.currency || 'USD').trim().toUpperCase() || 'USD';
        b.currencies.add(cur);
        currencyCount.set(cur, (currencyCount.get(cur) || 0) + 1);
    }

    const sorted = Array.from(buyers.entries())
        .sort((a, b) => b[1].totalCents - a[1].totalCents);

    if (!sorted.length) return 'Sin clientes registrados\n';

    let md = '| Cliente | Compras | Monedas | Total (USD) | Estado |\n';
    md += '|---------|--------:|---------|------------:|--------|\n';
    for (const [, b] of sorted) {
        const name = maskReportName(normalizeReportClientName(b.displayWho), privacy);
        const estado = b.hasPaid && b.hasPending ? '🔔 Mixto' : b.hasPaid ? '✅ Pagado' : '⏳ Debe';
        const curs = Array.from(b.currencies).join(', ');
        md += `| ${escMd(name)} | ${b.count} | ${curs} | ${fmtMoneyMd(b.totalCents, 'USD', privacy)} | ${estado} |\n`;
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
        if (!user) { showExportError(['Sesión no válida.']); return; }

        // Get profile name
        let userName = user.email || 'Usuario';
        try {
            const { data: farmerProfile } = await supabase
                .from('agro_farmer_profile')
                .select('display_name,farm_name')
                .eq('user_id', user.id)
                .maybeSingle();
            if (farmerProfile) {
                userName = farmerProfile.display_name || farmerProfile.farm_name || userName;
            } else {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', user.id)
                    .maybeSingle();
                if (profile?.username) {
                    userName = profile.username;
                }
            }
        } catch { /* ignore */ }

        // Fetch raw rows for per-crop breakdown and buyer ranking
        const [crops, incomeRows, expenseRows, pendingRows, lossesRows] = await Promise.all([
            fetchCrops(user.id),
            fetchIncome(user.id),
            fetchExpenses(user.id),
            fetchPending(user.id),
            fetchLosses(user.id)
        ]);
        const privacy = getMarkdownPrivacyState();

        // Keep global totals aligned with the same source used in per-crop tables.
        const perCropBreakdown = buildPerCropTable(crops, incomeRows, expenseRows, pendingRows, lossesRows, privacy);
        const totals = perCropBreakdown.totals || {};
        const incomeCents = Number(totals.incomeCents) || 0;
        const costCents = Number(totals.costCents) || 0;
        const pendingCents = Number(totals.pendingCents) || 0;
        const lossesCents = Number(totals.lossesCents) || 0;
        const profitCents = Number(totals.profitCents) || 0;

        // Margin = (profit / income) * 100
        const marginStr = incomeCents > 0 ? ((profitCents / incomeCents) * 100).toFixed(1) + '%' : 'N/A';
        // ROI = (profit / cost) * 100
        const roiStr = costCents > 0 ? ((profitCents / costCents) * 100).toFixed(1) + '%' : 'N/A';

        // Projected (if all pending is collected)
        const projIncomeCents = Number(totals.projectedIncomeCents) || (incomeCents + pendingCents);
        const projProfitCents = Number(totals.projectedProfitCents) || (projIncomeCents - costCents);
        const projRoiStr = costCents > 0 ? (((projIncomeCents - costCents) / costCents) * 100).toFixed(1) + '%' : 'N/A';

        const activeCrops = crops.filter((crop) => isCropActive(crop));

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

        // Build Markdown
        let md = '';
        md += `# 📊 YavlGold — Informe Estadístico\n`;
        md += `> **Fecha:** ${dateStr} ${timeStr}\n`;
        md += `> **Usuario:** ${escMd(maskReportName(userName, privacy, 'Usuario'))}\n`;
        md += `> **Cultivos activos:** ${activeCrops.length}\n`;
        md += `> **Sistema:** YavlGold\n\n`;
        md += `---\n\n`;

        // Global summary
        md += `## 💰 Resumen Global\n`;
        md += `| Concepto | Monto |\n`;
        md += `|----------|------:|\n`;
        md += `| Total pagados | ${fmtMoneyMd(incomeCents, 'USD', privacy)} |\n`;
        md += `| Total costos | ${fmtMoneyMd(costCents, 'USD', privacy)} |\n`;
        md += `| Ganancia neta | ${fmtMoneyMd(profitCents, 'USD', privacy)} |\n`;
        md += `| Margen | ${fmtMetricMd(marginStr, privacy)} |\n`;
        md += `| ROI | ${fmtMetricMd(roiStr, privacy)} |\n`;
        md += `| Fiados por cobrar | ${fmtMoneyMd(pendingCents, 'USD', privacy)} |\n`;
        md += `| Pagado proyectado (si se cobra todo) | ${fmtMoneyMd(projIncomeCents, 'USD', privacy)} |\n`;
        md += `| ROI proyectado | ${fmtMetricMd(projRoiStr, privacy)} |\n\n`;
        md += `> _Moneda base: USD \u00b7 Tasas al momento del registro_\n\n`;
        md += `---\n\n`;

        // Per-crop breakdown
        md += `## 🌾 Resumen por Cultivo\n`;
        md += perCropBreakdown.tableMd;
        md += '\n> _Montos en USD \u00b7 Tasas al momento del registro_\n\n---\n\n';
        md += buildUnassignedSection(perCropBreakdown.unassigned, privacy);
        md += '---\n\n';

        // Buyer ranking
        md += `## 👥 Ranking de Clientes\n`;
        md += buildBuyerRanking(incomeRows, pendingRows, privacy);
        md += '\n---\n\n';

        // Projection
        md += `## 📈 Proyección\n`;
        md += `Si se cobran los ${fmtMoneyMd(pendingCents, 'USD', privacy)} fiados:\n`;
        md += `- **Pagado total:** ${fmtMoneyMd(projIncomeCents, 'USD', privacy)}\n`;
        md += `- **Ganancia neta:** ${fmtMoneyMd(projProfitCents, 'USD', privacy)}\n`;
        md += `- **ROI:** ${fmtMetricMd(projRoiStr, privacy)}\n\n`;

        // Footer
        md += `---\n`;
        md += `> ⚠️ Documento confidencial — datos financieros personales\n`;
        md += `> Generado por YavlGold · yavlgold.com\n`;

        // Download with UTF-8 BOM
        // Filter income rows to only valid (non-deleted) crops before guard check,
        // matching the same filter applied inside buildPerCropTable.
        const validCropIdsForGuard = new Set(crops.map((c) => String(c.id || '').trim()).filter(Boolean));
        const guardIncomeRows = incomeRows.filter((r) => {
            const cid = String(r?.crop_id || '').trim();
            return !cid || validCropIdsForGuard.has(cid);
        });
        const vResult = validateExportBundle({
            rows: guardIncomeRows,
            totals: { incomeUsd: incomeCents / 100 },
            currency: 'USD'
        });
        if (!vResult.valid) {
            showExportError(vResult.errors);
            return;
        }
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
        showExportError(['Error al exportar estadísticas: ' + (err.message || err)]);
    }
}
