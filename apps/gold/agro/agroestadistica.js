import { convertToUSD, getRate, initExchangeRates } from './agro-exchange.js';

const CROP_STATUSES = {
    FINALIZED: new Set(['finalizado', 'finalized', 'harvested', 'completed', 'cosechado']),
    LOST: new Set(['lost', 'perdido', 'perdida', 'damaged'])
};

const EMPTY_STATS = {
    crops: {
        total: 0,
        active: 0,
        finalized: 0,
        lost: 0
    },
    money: {
        incomeUsd: 0,
        expenseUsd: 0,
        pendingUsd: 0,
        lossesUsd: 0,
        transfersUsd: 0,
        investmentUsd: 0,
        costUsd: 0,
        profitUsd: 0
    },
    topBuyers: [],
    topCrops: [],
    updatedAt: null,
    warnings: []
};

function toSafeNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (!text) return null;
    const direct = Number(text);
    if (Number.isFinite(direct)) return direct;
    const normalized = text.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveRate(value) {
    const parsed = toSafeNumber(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
}

function normalizeMoneyCurrency(value) {
    const raw = String(value || '').trim().toUpperCase();
    if (!raw) return 'USD';

    if (raw === 'USD' || raw === '$' || raw === 'USDT' || raw.includes('DOL')) return 'USD';
    if (raw === 'COP' || raw === 'COL' || raw === 'PESO' || raw === 'PESOS') return 'COP';
    if (raw === 'VES' || raw === 'VEF' || raw === 'BS' || raw === 'BSS' || raw === 'BOLIVAR' || raw === 'BOLIVARES') return 'VES';

    return raw;
}

function isMissingTableError(error) {
    if (!error) return false;
    const code = String(error.code || '').toUpperCase();
    const text = `${String(error.message || '')} ${String(error.details || '')}`.toLowerCase();
    if (code === '42P01') return true;
    if (code === 'PGRST116' && (text.includes('not found') || text.includes('does not exist'))) return true;
    return false;
}

function isMissingColumnError(error) {
    if (!error) return false;
    const code = String(error.code || '').toUpperCase();
    const text = `${String(error.message || '')} ${String(error.details || '')}`.toLowerCase();
    if (code === '42703' || code === 'PGRST204') return true;
    return text.includes('column') && (text.includes('does not exist') || text.includes('not found'));
}

function normalizeDateKey(value) {
    if (!value) return '';
    const text = String(value).trim();
    const key = text.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : '';
}

function rowInRange(row, range, dateCandidates = []) {
    if (!range?.startDate || !range?.endDate) return true;
    for (const field of dateCandidates) {
        const key = normalizeDateKey(row?.[field]);
        if (!key) continue;
        return key >= range.startDate && key <= range.endDate;
    }
    return true;
}

async function fetchRowsWithFallback(supabaseClient, table, userId, columnVariants, warnings, options = {}) {
    for (const columns of columnVariants) {
        const { data, error } = await supabaseClient
            .from(table)
            .select(columns)
            .eq('user_id', userId);

        if (!error) {
            const rows = Array.isArray(data) ? data : [];
            const filtered = rows.filter((row) => rowInRange(row, options.range, options.dateCandidates));
            return filtered;
        }

        if (isMissingTableError(error)) {
            warnings.push(`${table}: tabla no disponible (omitida).`);
            return [];
        }

        if (isMissingColumnError(error)) {
            continue;
        }

        throw error;
    }

    warnings.push(`${table}: columnas esperadas no disponibles (omitida).`);
    return [];
}

function resolveUsdAmount(row, amountFields, rates) {
    const explicitUsd = toSafeNumber(row?.monto_usd ?? row?.amount_usd ?? row?.usd_amount);
    if (Number.isFinite(explicitUsd)) return explicitUsd;

    let amount = null;
    for (const field of amountFields) {
        amount = toSafeNumber(row?.[field]);
        if (Number.isFinite(amount)) break;
    }
    if (!Number.isFinite(amount)) return 0;

    const currency = normalizeMoneyCurrency(row?.currency ?? row?.moneda ?? row?.currency_code);
    if (currency === 'USD') return amount;

    const rowRate = toPositiveRate(row?.exchange_rate ?? row?.usd_rate ?? row?.rate);
    const fallbackRate = currency === 'COP' ? rates.usdCop : rates.usdVes;
    const effectiveRate = rowRate || fallbackRate;
    if (!effectiveRate) return 0;

    return convertToUSD(amount, currency, effectiveRate);
}

function resolveCropInvestmentUsd(crop, rates) {
    const explicitUsd = toSafeNumber(crop?.investment_usd_equiv);
    if (Number.isFinite(explicitUsd)) return explicitUsd;

    const amount = toSafeNumber(crop?.investment_amount ?? crop?.investment);
    if (!Number.isFinite(amount)) return 0;

    const currency = normalizeMoneyCurrency(crop?.investment_currency);
    if (currency === 'USD') return amount;

    if (currency !== 'COP' && currency !== 'VES') return amount;

    const rowRate = currency === 'COP'
        ? toPositiveRate(crop?.fx_usd_cop ?? crop?.usd_cop)
        : toPositiveRate(crop?.fx_usd_bs ?? crop?.fx_usd_ves ?? crop?.usd_ves);
    const fallbackRate = currency === 'COP' ? rates.usdCop : rates.usdVes;
    const effectiveRate = rowRate || fallbackRate;
    if (!effectiveRate) return 0;
    return convertToUSD(amount, currency, effectiveRate);
}

function normalizeCropStatus(statusRaw) {
    const normalized = String(statusRaw || '').trim().toLowerCase();
    if (!normalized) return 'active';
    if (CROP_STATUSES.FINALIZED.has(normalized) || normalized.includes('final') || normalized.includes('cosech')) return 'finalized';
    if (CROP_STATUSES.LOST.has(normalized) || normalized.includes('perdid') || normalized.includes('dañ') || normalized.includes('dan')) return 'lost';
    return 'active';
}

function parseBuyerName(concepto) {
    const text = String(concepto || '').trim();
    if (!text) return 'Sin comprador';

    const saleMatch = text.match(/^venta\s+a\s+(.+?)(?:\s*-\s*|$)/i);
    if (saleMatch?.[1]) return saleMatch[1].trim();

    const clientMatch = text.match(/cliente:\s*([^|]+)$/i);
    if (clientMatch?.[1]) return clientMatch[1].trim();

    return 'Sin comprador';
}

function resolveCropLabel(cropMap, cropId) {
    const key = String(cropId || '').trim();
    if (!key) return 'Sin cultivo';
    if (cropMap.has(key)) return cropMap.get(key);
    return `Cultivo ${key.slice(0, 8)}`;
}

function buildTopRows(sourceMap, limit = 5) {
    return Array.from(sourceMap.values())
        .sort((a, b) => b.totalUsd - a.totalUsd)
        .slice(0, limit)
        .map((row) => ({
            ...row,
            totalUsd: Number(row.totalUsd || 0),
            count: Number(row.count || 0)
        }));
}

export function formatUsd(amount) {
    const safe = Number(amount || 0);
    return `$${safe.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

export async function getGlobalStats({ supabase: supabaseClient, userId, range } = {}) {
    if (!supabaseClient) {
        throw new Error('getGlobalStats requiere cliente Supabase.');
    }

    const warnings = [];
    let resolvedUserId = String(userId || '').trim();

    if (!resolvedUserId) {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError) throw authError;
        resolvedUserId = String(authData?.user?.id || '').trim();
    }

    if (!resolvedUserId) {
        return { ...EMPTY_STATS };
    }

    const rates = await initExchangeRates().catch(() => ({ USD: 1, COP: null, VES: null }));
    const effectiveRates = {
        usdCop: toPositiveRate(getRate('COP', rates)),
        usdVes: toPositiveRate(getRate('VES', rates))
    };

    const [cropsRows, incomeRows, pendingRows, expenseRows, lossesRows, transferRows] = await Promise.all([
        fetchRowsWithFallback(
            supabaseClient,
            'agro_crops',
            resolvedUserId,
            [
                'id,name,variety,status,status_override,investment,investment_amount,investment_currency,investment_usd_equiv,fx_usd_cop,fx_usd_bs,fx_usd_ves,created_at,start_date,deleted_at',
                'id,name,variety,status,investment,investment_amount,investment_currency,investment_usd_equiv,created_at,start_date,deleted_at',
                'id,name,variety,status,investment,created_at,start_date'
            ],
            warnings,
            { range, dateCandidates: ['start_date', 'created_at'] }
        ),
        fetchRowsWithFallback(
            supabaseClient,
            'agro_income',
            resolvedUserId,
            [
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha,deleted_at,reverted_at',
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha,deleted_at',
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha'
            ],
            warnings,
            { range, dateCandidates: ['fecha', 'created_at'] }
        ),
        fetchRowsWithFallback(
            supabaseClient,
            'agro_pending',
            resolvedUserId,
            [
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha,deleted_at',
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha'
            ],
            warnings,
            { range, dateCandidates: ['fecha', 'created_at'] }
        ),
        fetchRowsWithFallback(
            supabaseClient,
            'agro_expenses',
            resolvedUserId,
            [
                'id,crop_id,concepto,amount,monto_usd,currency,exchange_rate,category,date,created_at,deleted_at',
                'id,crop_id,concepto,amount,monto_usd,currency,exchange_rate,category,date,created_at',
                'id,crop_id,amount,monto_usd,currency,exchange_rate,date,created_at'
            ],
            warnings,
            { range, dateCandidates: ['date', 'created_at'] }
        ),
        fetchRowsWithFallback(
            supabaseClient,
            'agro_losses',
            resolvedUserId,
            [
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha,deleted_at',
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha'
            ],
            warnings,
            { range, dateCandidates: ['fecha', 'created_at'] }
        ),
        fetchRowsWithFallback(
            supabaseClient,
            'agro_transfers',
            resolvedUserId,
            [
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha,deleted_at',
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha'
            ],
            warnings,
            { range, dateCandidates: ['fecha', 'created_at'] }
        )
    ]);

    const crops = cropsRows.filter((row) => !row?.deleted_at);
    const incomes = incomeRows.filter((row) => !row?.deleted_at && !row?.reverted_at);
    const pending = pendingRows.filter((row) => !row?.deleted_at);
    const expenses = expenseRows.filter((row) => !row?.deleted_at);
    const losses = lossesRows.filter((row) => !row?.deleted_at);
    const transfers = transferRows.filter((row) => !row?.deleted_at);

    const cropsSummary = crops.reduce((acc, row) => {
        const statusValue = normalizeCropStatus(row?.status_override ?? row?.status);
        acc.total += 1;
        if (statusValue === 'finalized') acc.finalized += 1;
        else if (statusValue === 'lost') acc.lost += 1;
        else acc.active += 1;
        return acc;
    }, { total: 0, active: 0, finalized: 0, lost: 0 });

    const incomeUsd = incomes.reduce((sum, row) => sum + resolveUsdAmount(row, ['monto', 'amount'], effectiveRates), 0);
    const pendingUsd = pending.reduce((sum, row) => sum + resolveUsdAmount(row, ['monto', 'amount'], effectiveRates), 0);
    const expenseUsd = expenses.reduce((sum, row) => sum + resolveUsdAmount(row, ['amount', 'monto'], effectiveRates), 0);
    const lossesUsd = losses.reduce((sum, row) => sum + resolveUsdAmount(row, ['monto', 'amount'], effectiveRates), 0);
    const transfersUsd = transfers.reduce((sum, row) => sum + resolveUsdAmount(row, ['monto', 'amount'], effectiveRates), 0);
    const investmentUsd = crops.reduce((sum, row) => sum + resolveCropInvestmentUsd(row, effectiveRates), 0);

    const cropMap = new Map();
    crops.forEach((row) => {
        const key = String(row?.id || '').trim();
        if (!key) return;
        const name = String(row?.name || '').trim() || 'Cultivo';
        const variety = String(row?.variety || '').trim();
        cropMap.set(key, variety ? `${name} (${variety})` : name);
    });

    const buyerTotals = new Map();
    incomes.forEach((row) => {
        const buyer = parseBuyerName(row?.concepto);
        const key = buyer.toLowerCase();
        const totalUsd = resolveUsdAmount(row, ['monto', 'amount'], effectiveRates);
        const current = buyerTotals.get(key) || { name: buyer, totalUsd: 0, count: 0 };
        current.totalUsd += totalUsd;
        current.count += 1;
        buyerTotals.set(key, current);
    });

    const cropTotals = new Map();
    incomes.forEach((row) => {
        const cropId = String(row?.crop_id || '').trim();
        if (!cropId) return;
        const totalUsd = resolveUsdAmount(row, ['monto', 'amount'], effectiveRates);
        const current = cropTotals.get(cropId) || {
            cropId,
            cropName: resolveCropLabel(cropMap, cropId),
            totalUsd: 0,
            count: 0
        };
        current.totalUsd += totalUsd;
        current.count += 1;
        cropTotals.set(cropId, current);
    });

    const costUsd = investmentUsd + expenseUsd + lossesUsd;
    const profitUsd = incomeUsd - costUsd;

    return {
        crops: cropsSummary,
        money: {
            incomeUsd,
            expenseUsd,
            pendingUsd,
            lossesUsd,
            transfersUsd,
            investmentUsd,
            costUsd,
            profitUsd
        },
        topBuyers: buildTopRows(buyerTotals),
        topCrops: buildTopRows(cropTotals),
        updatedAt: new Date().toISOString(),
        warnings
    };
}
