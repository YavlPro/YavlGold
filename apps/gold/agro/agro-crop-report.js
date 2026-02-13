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

// ============================================================
// QUERY HELPERS
// ============================================================

async function fetchTabData(userId, cropId, tabName) {
    const cfg = TAB_CONFIGS[tabName];
    if (!cfg) return [];

    try {
        let q = supabase
            .from(cfg.table)
            .select(cfg.columns)
            .eq('user_id', userId)
            .eq('crop_id', cropId)
            .order(cfg.dateField, { ascending: false });

        // Soft-delete filter
        q = q.is('deleted_at', null);

        // Exclude transferred pendientes
        if (tabName === 'pendientes') {
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

function buildIncomeTable(items) {
    if (!items.length) return 'Sin registros\n';
    let md = '| Fecha | Concepto | Comprador | Cantidad | Moneda | Monto | USD |\n';
    md += '|-------|----------|-----------|----------|--------|------:|----:|\n';
    for (const it of items) {
        const raw = it.concepto || 'Sin concepto';
        const parsed = parseWho('ingresos', raw);
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.monto));
        md += `| ${fmtDate(it.fecha)} | ${escMd(parsed.concept || raw)} | ${escMd(parsed.who) || '-'} | ${fmtUnits(it)} | ${currency} | ${centsToStr(toCents(it.monto))} | ${amtUsd} |\n`;
    }
    return md;
}

function buildExpenseTable(items) {
    if (!items.length) return 'Sin registros\n';
    let md = '| Fecha | Concepto | Categoría | Moneda | Monto | USD |\n';
    md += '|-------|----------|-----------|--------|------:|----:|\n';
    for (const it of items) {
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.amount));
        md += `| ${fmtDate(it.date)} | ${escMd(it.concept)} | ${escMd(it.category) || '-'} | ${currency} | ${centsToStr(toCents(it.amount))} | ${amtUsd} |\n`;
    }
    return md;
}

function buildPendingTable(items) {
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
        md += `| ${fmtDate(it.fecha)} | ${escMd(parsed.concept || raw)} | ${escMd(client)} | ${fmtUnits(it)} | ${currency} | ${centsToStr(toCents(it.monto))} | ${amtUsd} | ${escMd(state)} |\n`;
    }
    return md;
}

function buildLossTable(items) {
    if (!items.length) return 'Sin pérdidas registradas ✅\n';
    let md = '| Fecha | Concepto | Causa | Cantidad | Moneda | Monto | USD |\n';
    md += '|-------|----------|-------|----------|--------|------:|----:|\n';
    for (const it of items) {
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.monto));
        md += `| ${fmtDate(it.fecha)} | ${escMd(it.concepto)} | ${escMd(it.causa) || '-'} | ${fmtUnits(it)} | ${currency} | ${centsToStr(toCents(it.monto))} | ${amtUsd} |\n`;
    }
    return md;
}

function buildTransferTable(items) {
    if (!items.length) return 'Sin transferencias registradas\n';
    let md = '| Fecha | Concepto | Destino | Cantidad | Moneda | Monto | USD |\n';
    md += '|-------|----------|---------|----------|--------|------:|----:|\n';
    for (const it of items) {
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.monto));
        md += `| ${fmtDate(it.fecha)} | ${escMd(it.concepto)} | ${escMd(it.destino) || '-'} | ${fmtUnits(it)} | ${currency} | ${centsToStr(toCents(it.monto))} | ${amtUsd} |\n`;
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
        const { data: crop, error: cropErr } = await supabase
            .from('agro_crops')
            .select('id,name,variety,status,area_size,start_date,expected_harvest_date,investment,progress')
            .eq('id', cropId)
            .eq('user_id', user.id)
            .single();

        if (cropErr || !crop) {
            console.error('[CropReport] Crop not found:', cropErr);
            alert('Cultivo no encontrado.');
            return;
        }

        // Fetch all tabs in parallel
        const [income, expenses, pending, losses, transfers] = await Promise.all([
            fetchTabData(user.id, cropId, 'ingresos'),
            fetchTabData(user.id, cropId, 'gastos'),
            fetchTabData(user.id, cropId, 'pendientes'),
            fetchTabData(user.id, cropId, 'perdidas'),
            fetchTabData(user.id, cropId, 'transferencias')
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
        const progress = Number(crop.progress) || 0;

        // Build Markdown
        let md = '';
        md += `# 🌾 Informe de Cultivo: ${crop.name || 'Sin nombre'}\n`;
        md += `> **Estado:** ${crop.status || 'N/A'}\n`;
        md += `> **Área:** ${crop.area_size || 0} ha\n`;
        md += `> **Siembra:** ${fmtDate(crop.start_date)}\n`;
        md += `> **Cosecha esperada:** ${fmtDate(crop.expected_harvest_date)}\n`;
        md += `> **Progreso:** ${progress}%\n`;
        md += `> **Fecha del reporte:** ${dateStr} ${timeStr}\n`;
        md += `> **Sistema:** YavlGold\n\n`;
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
        md += `## 📥 Ingresos (${income.length})\n`;
        md += buildIncomeTable(income);
        md += '\n';

        // Expenses
        md += `## 📤 Gastos (${expenses.length})\n`;
        md += buildExpenseTable(expenses);
        md += '\n';

        // Pending
        md += `## ⏳ Pendientes (${pending.length})\n`;
        md += buildPendingTable(pending);
        md += '\n';

        // Losses
        md += `## 📉 Pérdidas (${losses.length})\n`;
        md += buildLossTable(losses);
        md += '\n';

        // Transfers
        md += `## 🔄 Transferencias (${transfers.length})\n`;
        md += buildTransferTable(transfers);
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
        link.download = `Informe_${sanitizeFilename(crop.name)}_${dateStr}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.info(`[CropReport] Exported report for "${crop.name}" (${income.length} income, ${expenses.length} expenses, ${pending.length} pending, ${losses.length} losses, ${transfers.length} transfers)`);
    } catch (err) {
        console.error('[CropReport] Export error:', err);
        alert('Error al exportar informe: ' + (err.message || err));
    }
}
