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

const CROP_REPORT_COLUMNS_FULL = 'id,name,variety,status,status_override,status_mode,area_size,start_date,expected_harvest_date,actual_harvest_date,investment,cycle_days,template_duration_days';
const CROP_REPORT_COLUMNS_SAFE = 'id,name,variety,status,status_override,status_mode,area_size,start_date,expected_harvest_date,investment';

function normalizeCropId(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text || null;
}

/**
 * Resuelve existencia de cultivos por id para el usuario.
 * Devuelve mapa `{ [cropId]: boolean }`.
 * En modo fail-open, ante error retorna `true` para no ocultar ciclos válidos por fallas de red.
 */
export async function resolveCropExistenceMap(userId, cropIds, opts = {}) {
    const list = Array.isArray(cropIds) ? cropIds : [];
    const ids = Array.from(
        new Set(
            list
                .map((id) => normalizeCropId(id))
                .filter(Boolean)
        )
    );
    const fallbackExists = opts.failOpen !== false;
    const map = Object.create(null);
    ids.forEach((id) => {
        map[id] = fallbackExists;
    });
    if (!ids.length) return map;

    const normalizedUserId = normalizeCropId(userId);
    if (!normalizedUserId) return map;

    try {
        const { data, error } = await supabase
            .from('agro_crops')
            .select('id')
            .eq('user_id', normalizedUserId)
            .in('id', ids);

        if (error) {
            console.warn('[CropReport] Error resolving crop existence map:', error.message);
            return map;
        }

        const existingIds = new Set((data || []).map((row) => normalizeCropId(row?.id)).filter(Boolean));
        ids.forEach((id) => {
            map[id] = existingIds.has(id);
        });
        return map;
    } catch (err) {
        console.warn('[CropReport] Exception resolving crop existence map:', err);
        return map;
    }
}

/**
 * Consulta un cultivo por id para el usuario.
 * Reutilizable en UI/exports para evitar duplicar contrato de `cropExists`.
 */
export async function fetchCropForUser(userId, cropId, selectFields = CROP_REPORT_COLUMNS_FULL) {
    const normalizedUserId = normalizeCropId(userId);
    const normalizedCropId = normalizeCropId(cropId);
    if (!normalizedUserId || !normalizedCropId) {
        return { exists: false, crop: null, error: null };
    }

    const requestedColumns = String(selectFields || CROP_REPORT_COLUMNS_FULL).trim() || CROP_REPORT_COLUMNS_FULL;
    const attempts = requestedColumns === CROP_REPORT_COLUMNS_SAFE
        ? [CROP_REPORT_COLUMNS_SAFE]
        : [requestedColumns, CROP_REPORT_COLUMNS_SAFE];
    const seen = new Set();
    let lastError = null;

    for (const columns of attempts) {
        if (seen.has(columns)) continue;
        seen.add(columns);
        try {
            const { data, error } = await supabase
                .from('agro_crops')
                .select(columns)
                .eq('id', normalizedCropId)
                .eq('user_id', normalizedUserId)
                .maybeSingle();

            if (error) {
                lastError = error;
                continue;
            }

            if (data) {
                return { exists: true, crop: data, error: null };
            }
            // No row for this user/crop_id -> no existe, no hace falta más retries.
            return { exists: false, crop: null, error: null };
        } catch (err) {
            lastError = err;
            continue;
        }
    }

    return { exists: false, crop: null, error: lastError };
}

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

        // Exclude transferred fiados (solo en modo operativo)
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
        const state = it.transfer_state || 'fiado';
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.monto));
        const flag = deletedFlag(it, historyMode);
        md += `| ${fmtDate(it.fecha)} | ${flag}${escMd(parsed.concept || raw)} | ${escMd(client)} | ${fmtUnits(it)} | ${currency} | ${centsToStr(toCents(it.monto))} | ${amtUsd} | ${escMd(state)} |\n`;
    }
    return md;
}

/** Tabla para fiados que fueron transferidos a pagado/pérdida */
function buildPendingTransferredTable(items) {
    if (!items.length) return 'Sin registros\n';
    let md = '| Fecha | Concepto | Cliente | Cantidad | Moneda | Monto | USD | Transferido a |\n';
    md += '|-------|----------|---------|----------|--------|------:|----:|--------------|\n';
    for (const it of items) {
        const raw = it.concepto || 'Sin concepto';
        const parsed = parseWho('pendientes', raw);
        const client = it.cliente || parsed.who || '-';
        const currency = it.currency || 'USD';
        const amtUsd = centsToStr(toCents(it.monto_usd ?? it.monto));
        const dest = it.transferred_to || it.transfer_state || 'pagado/pérdida';
        md += `| ${fmtDate(it.fecha)} | [TRANSFERIDO] ${escMd(parsed.concept || raw)} | ${escMd(client)} | ${fmtUnits(it)} | ${currency} | ${centsToStr(toCents(it.monto))} | ${amtUsd} | ${escMd(dest)} |\n`;
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
 * @param {{ skipHistoryConfirmation?: boolean }} [opts]
 */
export async function exportCropReport(cropId, opts = {}) {
    if (!cropId) { alert('No se seleccionó un cultivo.'); return; }
    const skipHistoryConfirmation = !!opts.skipHistoryConfirmation;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert('Sesión no válida.'); return; }

        const normalizedCropId = normalizeCropId(cropId) || String(cropId);
        const existsMap = await resolveCropExistenceMap(user.id, [normalizedCropId], { failOpen: false });
        const cropExists = existsMap[normalizedCropId] === true;
        let crop = null;
        let hasCropRow = false;
        let hasCropMetadata = false;

        if (cropExists) {
            const cropLookup = await fetchCropForUser(user.id, normalizedCropId, CROP_REPORT_COLUMNS_FULL);
            if (cropLookup?.crop) {
                crop = cropLookup.crop;
                hasCropRow = true;
                hasCropMetadata = !!(String(crop.name || '').trim() || String(crop.variety || '').trim());
            } else {
                if (cropLookup?.error) {
                    console.warn('[CropReport] Crop metadata fetch failed, keeping strict mode:', cropLookup.error);
                }
                crop = { id: normalizedCropId, name: 'Sin nombre' };
            }
        } else {
            console.warn('[CropReport] Crop not found in agro_crops. cropId:', normalizedCropId);
            if (!skipHistoryConfirmation) {
                // ── Guardia anti-accidente ────────────────────────────────────────
                // Este crop_id no existe en agro_crops. Puede ser:
                //   A) un ciclo eliminado con movimientos históricos (soft-deleted)
                //   B) un ciclo de QA/pruebas borrado definitivamente
                // Pedimos confirmación explícita antes de exportar en Modo Historial.
                const confirmed = window.confirm(
                    `⚠️ Modo Historial\n\n` +
                    `El cultivo asociado a este botón ya no existe en la base de datos.\n\n` +
                    `crop_id: ${normalizedCropId}\n\n` +
                    `¿Deseas exportar el expediente histórico del ciclo?\n` +
                    `(Incluirá movimientos eliminados marcados como [ELIMINADO] o [TRANSFERIDO])\n\n` +
                    `Pulsa Cancelar si esto no corresponde al cultivo que quieres exportar.`
                );
                if (!confirmed) return;
            }
            crop = { id: normalizedCropId, name: 'Ciclo eliminado' };
        }

        // Modo Historial: cuando el cultivo no existe en agro_crops, incluir soft-deleted
        const historyMode = !cropExists;
        const fetchOpts = { includeDeleted: historyMode };

        // Fetch all tabs in parallel
        const [income, expenses, pending, losses, transfers] = await Promise.all([
            fetchTabData(user.id, normalizedCropId, 'ingresos', fetchOpts),
            fetchTabData(user.id, normalizedCropId, 'gastos', fetchOpts),
            fetchTabData(user.id, normalizedCropId, 'pendientes', fetchOpts),
            fetchTabData(user.id, normalizedCropId, 'perdidas', fetchOpts),
            fetchTabData(user.id, normalizedCropId, 'transferencias', fetchOpts)
        ]);

        // ── Split semántico de fiados ──────────────────────────────────────────
        // transferred → pasó a pagado/pérdida (etiqueta [TRANSFERIDO])
        // deleted_at sin transfer → borrado lógico real (etiqueta [ELIMINADO])
        function isPendingTransferred(r) {
            return r.transfer_state === 'transferred' || !!r.transferred_at;
        }
        const pendingActive = pending.filter(r => !isPendingTransferred(r) && !r.deleted_at);
        const pendingTransferred = pending.filter(r => isPendingTransferred(r));
        const pendingDeletedReal = pending.filter(r => r.deleted_at && !isPendingTransferred(r));

        // Compute totals in cents (integer arithmetic)
        // «Fiados por cobrar» = SOLO activos (no inflamos con transferred)
        const totalIncomeCents = income.reduce((s, it) => s + toCents(it.monto_usd ?? it.monto), 0);
        const totalExpensesCents = expenses.reduce((s, it) => s + toCents(it.monto_usd ?? it.amount), 0);
        const totalPendingCents = pendingActive.reduce((s, it) => s + toCents(it.monto_usd ?? it.monto), 0);
        const totalLossesCents = losses.reduce((s, it) => s + toCents(it.monto_usd ?? it.monto), 0);
        const initialInvestmentCents = cropExists && crop?.investment !== null && crop?.investment !== undefined
            ? toCents(crop.investment)
            : 0;
        const totalCostWithInvestmentCents = totalExpensesCents + initialInvestmentCents;
        const profitCents = totalIncomeCents - totalCostWithInvestmentCents;
        const roiStr = totalCostWithInvestmentCents > 0
            ? (((totalIncomeCents - totalCostWithInvestmentCents) / totalCostWithInvestmentCents) * 100).toFixed(1) + '%'
            : 'N/A';

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
        const cropName = String(crop?.name || '').trim() || String(crop?.variety || '').trim() || 'Sin nombre';
        const progress = cropExists && hasCropRow ? computeCropProgress(crop) : null;
        const resolvedStatus = cropExists && hasCropRow ? resolveCropStatus(crop, progress) : null;
        const statusFallback = String(crop?.status || '').trim();
        const statusLine = cropExists
            ? (resolvedStatus
                ? formatCropStatusLine(resolvedStatus)
                : (statusFallback ? formatCropStatusLine(statusFallback) : 'N/A'))
            : null;
        const areaLine = cropExists && crop?.area_size !== null && crop?.area_size !== undefined
            ? `${crop.area_size} ha`
            : 'N/A';
        const startLine = cropExists && crop?.start_date ? fmtDate(crop.start_date) : 'N/A';
        const harvestLine = cropExists && crop?.expected_harvest_date ? fmtDate(crop.expected_harvest_date) : 'N/A';
        const progressLine = cropExists && progress?.ok ? formatCropProgressLine(progress) : 'N/A';
        const investmentLine = cropExists && crop?.investment !== null && crop?.investment !== undefined
            ? centsToStr(toCents(crop.investment))
            : 'N/A';

        // Conteos por modo
        const ci = countAliveDeleted(income);
        const ce = countAliveDeleted(expenses);
        const cl = countAliveDeleted(losses);
        const ct = countAliveDeleted(transfers);
        // Fiados: desglose de 3 partes
        const cpCell = historyMode
            ? `${pending.length} (${pendingActive.length}✓ / ${pendingTransferred.length}↔ / ${pendingDeletedReal.length}🗑)`
            : String(pendingActive.length);

        // Build Markdown
        let md = '';
        if (cropExists) {
            md += `# 🌾 Informe de Cultivo: ${cropName} — ${dateStr}\n`;
            if (!hasCropMetadata) {
                md += `> ⚠️ Metadata del cultivo no disponible; reporte generado en modo estricto.\n`;
                md += `> **crop_id:** \`${normalizedCropId}\`\n`;
            }
            md += `> **Estado:** ${statusLine}\n`;
            md += `> **Área:** ${areaLine}\n`;
            md += `> **Siembra:** ${startLine}\n`;
            md += `> **Cosecha esperada:** ${harvestLine}\n`;
            md += `> **Progreso:** ${progressLine}\n`;
            md += `> **Inversión:** ${investmentLine}\n`;
        } else {
            md += `# 🗃️ Expediente — Ciclo Eliminado\n`;
            md += `> 🧾 **Modo Historial:** incluye movimientos eliminados (soft-delete) para preservar el expediente del ciclo.\n`;
            md += `> ⚠️ El cultivo asociado ya no está disponible en agro_crops.\n`;
            md += `> **crop_id:** \`${normalizedCropId}\`\n`;
        }
        md += `> **Fecha del reporte:** ${dateStr} ${timeStr}\n`;
        md += `> **Sistema:** YavlGold\n\n`;
        md += `## 🔎 Evidencia (conteos)\n`;
        if (historyMode) {
            md += `> _Formato fiados: total (activos ✓ / transferidos ↔ / eliminados 🗑)_\n\n`;
        }
        md += `| Pagados | Gastos | Fiados | Pérdidas | Donaciones |\n`;
        md += `|------:|---------:|--------:|-------:|----------:|\n`;
        md += `| ${fmtCount(ci, historyMode)} | ${fmtCount(ce, historyMode)} | ${cpCell} | ${fmtCount(cl, historyMode)} | ${fmtCount(ct, historyMode)} |\n\n`;
        md += `---\n\n`;

        // Financial summary
        md += `## 💰 Resumen Financiero\n`;
        md += `| Concepto | Monto |\n`;
        md += `|----------|------:|\n`;
        md += `| Pagados | ${centsToStr(totalIncomeCents)} |\n`;
        md += `| Inversión inicial | ${centsToStr(initialInvestmentCents)} |\n`;
        md += `| Gastos vinculados | ${centsToStr(totalExpensesCents)} |\n`;
        md += `| Costos/Inversión | ${centsToStr(totalCostWithInvestmentCents)} |\n`;
        md += `| Ganancia neta | ${centsToStr(profitCents)} |\n`;
        md += `| Fiados por cobrar (activos) | ${centsToStr(totalPendingCents)} |\n`;
        md += `| Pérdidas | ${centsToStr(totalLossesCents)} |\n`;
        md += `| ROI | ${roiStr} |\n\n`;
        md += `> _Totales convertidos a USD \u00b7 Tasas al momento del registro_\n\n`;
        md += `---\n\n`;

        // Pagados
        md += `## 📥 Pagados (${fmtCount(ci, historyMode)})\n`;
        md += buildIncomeTable(income, historyMode);
        md += '\n';

        // Expenses
        md += `## 📤 Gastos (${fmtCount(ce, historyMode)})\n`;
        md += buildExpenseTable(expenses, historyMode);
        md += '\n';

        // Fiados — solo activos (por cobrar)
        md += `## ⏳ Fiados activos — por cobrar (${pendingActive.length})\n`;
        md += buildPendingTable(pendingActive, false);
        md += '\n';

        // Fiados transferidos (→ pagado / pérdida)
        if (historyMode || pendingTransferred.length > 0) {
            md += `## ⇔️ Fiados transferidos (${pendingTransferred.length})\n`;
            md += pendingTransferred.length
                ? buildPendingTransferredTable(pendingTransferred)
                : 'Sin fiados transferidos\n';
            md += '\n';
        }

        // Fiados eliminados reales (solo en historyMode)
        if (historyMode && pendingDeletedReal.length > 0) {
            md += `## 🗑️ Fiados eliminados (${pendingDeletedReal.length})\n`;
            md += buildPendingTable(pendingDeletedReal, true);
            md += '\n';
        }

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
            ? sanitizeFilename(cropName)
            : `cultivo-eliminado_${sanitizeFilename(normalizedCropId)}`;
        link.download = `Informe_${fileLabel}_${dateStr}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const exportedCropLabel = cropExists ? cropName : `cultivo eliminado (${normalizedCropId})`;
        console.info(`[CropReport] Exported report for "${exportedCropLabel}" (${income.length} income, ${expenses.length} expenses, ${pending.length} pending, ${losses.length} losses, ${transfers.length} transfers)`);
    } catch (err) {
        console.error('[CropReport] Export error:', err);
        alert('Error al exportar informe: ' + (err.message || err));
    }
}
