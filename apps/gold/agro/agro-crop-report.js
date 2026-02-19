/**
 * YavlGold V9.7 — Agro Crop Report
 * Generates a consolidated Markdown report for a single crop
 * covering ALL financial tabs (income, expenses, pending, losses, transfers).
 */

import supabase from '../assets/js/config/supabase-config.js';

// ============================================================
// HELPERS (self-contained to avoid coupling with agro.js internals)
// ============================================================

const TAB_CONFIGS = {
    ingresos: {
        table: 'agro_income',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        columns: 'id,concepto,monto,monto_usd,currency,exchange_rate,fecha,categoria,unit_type,unit_qty,quantity_kg,crop_id,deleted_at,transfer_state'
    },
    gastos: {
        table: 'agro_expenses',
        conceptField: 'concept',
        amountField: 'amount',
        dateField: 'date',
        columns: 'id,concept,amount,monto_usd,currency,exchange_rate,date,category,crop_id,deleted_at'
    },
    pendientes: {
        table: 'agro_pending',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        columns: 'id,concepto,monto,monto_usd,currency,exchange_rate,fecha,cliente,unit_type,unit_qty,quantity_kg,crop_id,deleted_at,transfer_state'
    },
    perdidas: {
        table: 'agro_losses',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        columns: 'id,concepto,monto,monto_usd,currency,exchange_rate,fecha,causa,unit_type,unit_qty,quantity_kg,crop_id,deleted_at'
    },
    transferencias: {
        table: 'agro_transfers',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        columns: 'id,concepto,monto,monto_usd,currency,exchange_rate,fecha,destino,unit_type,unit_qty,quantity_kg,crop_id,deleted_at'
    }
};

function toCents(value) {
    return Math.round((Number(value) || 0) * 100);
}

function centsToStr(cents) {
    const abs = Math.abs(cents);
    const sign = cents < 0 ? '-' : '';
    return `${sign}$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(numerator, denominator) {
    if (!denominator) return 'N/A';
    return ((numerator / denominator) * 100).toFixed(1) + '%';
}

function fmtDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
}

function escMd(str) {
    return String(str || '').replace(/\|/g, '·').replace(/\n/g, ' ');
}

function parseWho(tabName, concept) {
    const text = String(concept || '').trim();
    if (!text) return { concept: '', who: '' };
    if (tabName === 'ingresos') {
        const m = text.match(/^Venta a\s+(.+?)\s+-\s+(.+)$/i);
        if (m) return { who: m[1].trim(), concept: m[2].trim() };
    }
    if (tabName === 'pendientes') {
        const m = text.match(/^(.*?)\s+-\s+Cliente:\s*(.+)$/i);
        if (m) return { who: m[2].trim(), concept: m[1].trim() };
    }
    return { concept: text, who: '' };
}

function fmtUnits(item) {
    const parts = [];
    const unitType = String(item.unit_type || '').toLowerCase();
    const unitQty = Number(item.unit_qty);
    if (unitType && Number.isFinite(unitQty) && unitQty > 0) {
        const labels = { saco: 'sacos', cesta: 'cestas', kg: 'kg' };
        parts.push(`${unitQty} ${labels[unitType] || unitType}`);
    }
    const kg = Number(item.quantity_kg);
    if (Number.isFinite(kg) && kg > 0) parts.push(`${kg} kg`);
    return parts.join(' · ') || '-';
}

function sanitizeFilename(name) {
    return String(name || 'Cultivo').replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/gi, '').trim().replace(/\s+/g, '-');
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

// ============================================================
// QUERY HELPERS
// ============================================================

/**
 * @param {string} userId
 * @param {string} cropId
 * @param {string} tabName
 * @param {{ includeDeleted?: boolean }} [opts]
 */
async function fetchTabData(userId, cropId, tabName, opts = {}) {
    const cfg = TAB_CONFIGS[tabName];
    if (!cfg) return [];

    const includeDeleted = !!opts.includeDeleted;

    try {
        let q = supabase
            .from(cfg.table)
            .select(cfg.columns)
            .eq('user_id', userId)
            .eq('crop_id', cropId)
            .order(cfg.dateField, { ascending: false });

        // Modo Historial: incluir soft-deleted cuando se solicita explícitamente
        if (!includeDeleted) {
            q = q.is('deleted_at', null);
        }

        // Exclude transferred pendientes (solo en modo operativo)
        if (tabName === 'pendientes' && !includeDeleted) {
            q = q.neq('transfer_state', 'transferred');
        }

        const { data, error } = await q;
        if (error) {
            console.warn(`[CropReport] Error fetching ${tabName}:`, error.message);
            return [];
        }
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn(`[CropReport] Exception fetching ${tabName}:`, err);
        return [];
    }
}

/** Cuenta cuántas filas están activas vs. eliminadas (soft-delete) */
function countAliveDeleted(rows) {
    const deleted = rows.filter((r) => !!r.deleted_at).length;
    const active = rows.length - deleted;
    return { total: rows.length, active, deleted };
}

/** Formatea la celda de conteo para el bloque de evidencia */
function fmtCount(counts, historyMode) {
    if (!historyMode) return String(counts.total);
    return `${counts.total} (${counts.active}✓ / ${counts.deleted}🗑)`;
}

// ============================================================
// MARKDOWN BUILDERS
// ============================================================

function fmtMontoWithCurrency(item, amountField) {
    const monto = Number(item[amountField] || 0);
    const currency = item.currency || 'USD';
    const montoUsd = Number(item.monto_usd ?? item[amountField] ?? 0);
    if (currency === 'USD') return centsToStr(toCents(monto));
    const cfg = { COP: { symbol: 'COP', decimals: 0 }, VES: { symbol: 'Bs', decimals: 2 } };
    const c = cfg[currency] || { symbol: currency, decimals: 2 };
    const local = c.decimals === 0 ? `${c.symbol} ${Math.round(monto).toLocaleString()}` : `${c.symbol} ${monto.toFixed(c.decimals)}`;
    return `${local} (\u2248 ${centsToStr(toCents(montoUsd))})`;
}

/** Prefijo visual para filas soft-deleted en modo historial */
function deletedFlag(row, historyMode) {
    return historyMode && row.deleted_at ? '[ELIMINADO] ' : '';
}

function buildIncomeTable(items, historyMode = false) {
    if (!items.length) return 'Sin registros\n';
    let md = '| Fecha | Concepto | Comprador | Cantidad | Moneda | Monto | USD |\n';
    md += '|-------|----------|-----------|----------|--------|------:|----:|\n';
    for (const it of items) {
        const raw = it.concepto || 'Sin concepto';
        const parsed = parseWho('ingresos', raw);
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.monto));
        const flag = deletedFlag(it, historyMode);
        md += `| ${fmtDate(it.fecha)} | ${flag}${escMd(parsed.concept || raw)} | ${escMd(parsed.who) || '-'} | ${fmtUnits(it)} | ${currency} | ${centsToStr(toCents(it.monto))} | ${amtUsd} |\n`;
    }
    return md;
}

function buildExpenseTable(items, historyMode = false) {
    if (!items.length) return 'Sin registros\n';
    let md = '| Fecha | Concepto | Categoría | Moneda | Monto | USD |\n';
    md += '|-------|----------|-----------|--------|------:|----:|\n';
    for (const it of items) {
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.amount));
        const flag = deletedFlag(it, historyMode);
        md += `| ${fmtDate(it.date)} | ${flag}${escMd(it.concept)} | ${escMd(it.category) || '-'} | ${currency} | ${centsToStr(toCents(it.amount))} | ${amtUsd} |\n`;
    }
    return md;
}

function buildPendingTable(items, historyMode = false) {
    if (!items.length) return 'Sin registros\n';
    let md = '| Fecha | Concepto | Cliente | Cantidad | Moneda | Monto | USD | Estado |\n';
    md += '|-------|----------|---------|----------|--------|------:|----:|--------|\n';
    for (const it of items) {
        const raw = it.concepto || 'Sin concepto';
        const parsed = parseWho('pendientes', raw);
        const client = it.cliente || parsed.who || '-';
        const state = it.transfer_state || 'pendiente';
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.monto));
        const flag = deletedFlag(it, historyMode);
        md += `| ${fmtDate(it.fecha)} | ${flag}${escMd(parsed.concept || raw)} | ${escMd(client)} | ${fmtUnits(it)} | ${currency} | ${centsToStr(toCents(it.monto))} | ${amtUsd} | ${escMd(state)} |\n`;
    }
    return md;
}

function buildLossTable(items, historyMode = false) {
    if (!items.length) return 'Sin pérdidas registradas ✅\n';
    let md = '| Fecha | Concepto | Causa | Cantidad | Moneda | Monto | USD |\n';
    md += '|-------|----------|-------|----------|--------|------:|----:|\n';
    for (const it of items) {
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.monto));
        const flag = deletedFlag(it, historyMode);
        md += `| ${fmtDate(it.fecha)} | ${flag}${escMd(it.concepto)} | ${escMd(it.causa) || '-'} | ${fmtUnits(it)} | ${currency} | ${centsToStr(toCents(it.monto))} | ${amtUsd} |\n`;
    }
    return md;
}

function buildTransferTable(items, historyMode = false) {
    if (!items.length) return 'Sin donaciones registradas\n';
    let md = '| Fecha | Concepto | Beneficiario | Cantidad | Moneda | Monto | USD |\n';
    md += '|-------|----------|---------|----------|--------|------:|----:|\n';
    for (const it of items) {
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.monto));
        const flag = deletedFlag(it, historyMode);
        md += `| ${fmtDate(it.fecha)} | ${flag}${escMd(it.concepto)} | ${escMd(it.destino) || '-'} | ${fmtUnits(it)} | ${currency} | ${centsToStr(toCents(it.monto))} | ${amtUsd} |\n`;
    }
    return md;
}

// ============================================================
// MAIN EXPORT FUNCTION
// ============================================================

/**
 * Generates and downloads a consolidated Markdown report for a single crop.
 * @param {string} cropId - UUID of the crop
 */
export async function exportCropReport(cropId) {
    if (!cropId) { alert('No se seleccionó un cultivo.'); return; }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert('Sesión no válida.'); return; }

        // Fetch crop info
        const { data: cropData, error: cropErr } = await supabase
            .from('agro_crops')
            .select('id,name,variety,status,status_override,status_mode,area_size,start_date,expected_harvest_date,actual_harvest_date,investment,cycle_days,template_duration_days')
            .eq('id', cropId)
            .eq('user_id', user.id)
            .single();

        const cropExists = !cropErr && !!cropData;
        let crop = cropData;

        if (!cropExists) {
            console.warn('[CropReport] Crop not found, keeping strict crop_id export. cropId:', cropId, 'error:', cropErr);
            crop = {
                id: cropId,
                name: 'Cultivo eliminado'
            };
        }

        // Modo Historial: cuando el cultivo no existe en agro_crops, incluir soft-deleted
        const historyMode = !cropExists;
        const fetchOpts = { includeDeleted: historyMode };

        // Fetch all tabs in parallel
        const [income, expenses, pending, losses, transfers] = await Promise.all([
            fetchTabData(user.id, cropId, 'ingresos', fetchOpts),
            fetchTabData(user.id, cropId, 'gastos', fetchOpts),
            fetchTabData(user.id, cropId, 'pendientes', fetchOpts),
            fetchTabData(user.id, cropId, 'perdidas', fetchOpts),
            fetchTabData(user.id, cropId, 'transferencias', fetchOpts)
        ]);

        // Compute totals in cents (integer arithmetic)
        const totalIncomeCents = income.reduce((s, it) => s + toCents(it.monto_usd ?? it.monto), 0);
        const totalExpensesCents = expenses.reduce((s, it) => s + toCents(it.monto_usd ?? it.amount), 0);
        const totalPendingCents = pending.reduce((s, it) => s + toCents(it.monto_usd ?? it.monto), 0);
        const totalLossesCents = losses.reduce((s, it) => s + toCents(it.monto_usd ?? it.monto), 0);
        const profitCents = totalIncomeCents - totalExpensesCents;
        const roiStr = totalExpensesCents > 0
            ? (((totalIncomeCents - totalExpensesCents) / totalExpensesCents) * 100).toFixed(1) + '%'
            : 'N/A';

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
        const progress = cropExists ? computeCropProgress(crop) : null;
        const resolvedStatus = cropExists ? resolveCropStatus(crop, progress) : null;
        const statusLine = cropExists ? formatCropStatusLine(resolvedStatus) : null;
        const progressLine = cropExists ? formatCropProgressLine(progress) : null;

        // Conteos por modo
        const ci = countAliveDeleted(income);
        const ce = countAliveDeleted(expenses);
        const cp = countAliveDeleted(pending);
        const cl = countAliveDeleted(losses);
        const ct = countAliveDeleted(transfers);

        // Build Markdown
        let md = '';
        if (cropExists) {
            md += `# 🌾 Informe de Cultivo: ${crop.name || 'Sin nombre'}\n`;
            md += `> **Estado:** ${statusLine}\n`;
            md += `> **Área:** ${crop.area_size || 0} ha\n`;
            md += `> **Siembra:** ${fmtDate(crop.start_date)}\n`;
            md += `> **Cosecha esperada:** ${fmtDate(crop.expected_harvest_date)}\n`;
            md += `> **Progreso:** ${progressLine}\n`;
        } else {
            md += `# 🗃️ Expediente — Ciclo Eliminado\n`;
            md += `> 🧾 **Modo Historial:** incluye movimientos eliminados (soft-delete) para preservar el expediente del ciclo.\n`;
            md += `> ⚠️ El cultivo asociado ya no está disponible en agro_crops.\n`;
            md += `> **crop_id:** \`${cropId}\`\n`;
        }
        md += `> **Fecha del reporte:** ${dateStr} ${timeStr}\n`;
        md += `> **Sistema:** YavlGold\n\n`;
        md += `## 🔎 Evidencia (conteos)\n`;
        if (historyMode) {
            md += `> _Formato: total (activos ✓ / eliminados 🗑)_\n\n`;
        }
        md += `| income | expenses | pending | losses | transfers |\n`;
        md += `|------:|---------:|--------:|-------:|----------:|\n`;
        md += `| ${fmtCount(ci, historyMode)} | ${fmtCount(ce, historyMode)} | ${fmtCount(cp, historyMode)} | ${fmtCount(cl, historyMode)} | ${fmtCount(ct, historyMode)} |\n\n`;
        md += `---\n\n`;

        // Financial summary
        md += `## 💰 Resumen Financiero\n`;
        md += `| Concepto | Monto |\n`;
        md += `|----------|------:|\n`;
        md += `| Ingresos cobrados | ${centsToStr(totalIncomeCents)} |\n`;
        md += `| Costos/Inversión | ${centsToStr(totalExpensesCents)} |\n`;
        md += `| Ganancia neta | ${centsToStr(profitCents)} |\n`;
        md += `| Pendientes por cobrar | ${centsToStr(totalPendingCents)} |\n`;
        md += `| Pérdidas | ${centsToStr(totalLossesCents)} |\n`;
        md += `| ROI | ${roiStr} |\n\n`;
        md += `> _Totales convertidos a USD \u00b7 Tasas al momento del registro_\n\n`;
        md += `---\n\n`;

        // Income
        md += `## 📥 Ingresos (${fmtCount(ci, historyMode)})\n`;
        md += buildIncomeTable(income, historyMode);
        md += '\n';

        // Expenses
        md += `## 📤 Gastos (${fmtCount(ce, historyMode)})\n`;
        md += buildExpenseTable(expenses, historyMode);
        md += '\n';

        // Pending
        md += `## ⏳ Pendientes (${fmtCount(cp, historyMode)})\n`;
        md += buildPendingTable(pending, historyMode);
        md += '\n';

        // Losses
        md += `## 📉 Pérdidas (${fmtCount(cl, historyMode)})\n`;
        md += buildLossTable(losses, historyMode);
        md += '\n';

        // Transfers
        md += `## 🎁 Donaciones (${fmtCount(ct, historyMode)})\n`;
        md += buildTransferTable(transfers, historyMode);
        md += '\n';

        // Footer
        md += `---\n`;
        md += `> ⚠️ Documento confidencial — datos financieros personales\n`;
        md += `> Generado por YavlGold · yavlgold.com\n`;

        // Download with UTF-8 BOM
        const blob = new Blob(['\ufeff' + md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileLabel = cropExists
            ? sanitizeFilename(crop.name)
            : `cultivo-eliminado_${sanitizeFilename(cropId)}`;
        link.download = `Informe_${fileLabel}_${dateStr}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const exportedCropLabel = cropExists ? crop.name : `cultivo eliminado (${cropId})`;
        console.info(`[CropReport] Exported report for "${exportedCropLabel}" (${income.length} income, ${expenses.length} expenses, ${pending.length} pending, ${losses.length} losses, ${transfers.length} transfers)`);
    } catch (err) {
        console.error('[CropReport] Export error:', err);
        alert('Error al exportar informe: ' + (err.message || err));
    }
}
