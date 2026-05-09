import { convertToUSD, getRate, initExchangeRates } from './agro-exchange.js';
import { getPendingTransferToken } from './agro-unit-totals.js';

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
    warnings: [],
    usdAudit: {
        unverifiedCount: 0,
        unverifiedByBucket: {},
        unverifiedRows: []
    }
};

const USD_LEGACY_OUTLIER_THRESHOLD = 1000;
const USD_AUDIT_PREVIEW_LIMIT = 40;
const CROP_DISPLAY_FALLBACK_ICON = '🌱';
const CROP_DISPLAY_FALLBACK_NAME = 'Cultivo';
const CROP_EMOJI_TOKEN_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
const CROP_TEXT_TOKEN_RE = /[\p{L}\p{N}]/u;

function isCropEmojiToken(token) {
    const value = String(token || '').trim();
    if (!value) return false;
    return CROP_EMOJI_TOKEN_RE.test(value) && !CROP_TEXT_TOKEN_RE.test(value);
}

function normalizeCropIcon(icon, fallback = CROP_DISPLAY_FALLBACK_ICON) {
    const value = String(icon || '').trim();
    if (isCropEmojiToken(value)) return value;
    return String(fallback || CROP_DISPLAY_FALLBACK_ICON).trim() || CROP_DISPLAY_FALLBACK_ICON;
}

function buildCropDisplayLabel(crop) {
    const rawName = String(crop?.name || '').trim();
    const tokens = rawName ? rawName.split(/\s+/).filter(Boolean) : [];
    const leadingIcons = [];
    let cursor = 0;

    while (cursor < tokens.length && isCropEmojiToken(tokens[cursor])) {
        leadingIcons.push(tokens[cursor]);
        cursor += 1;
    }

    const cleanedName = tokens.slice(cursor).join(' ').trim();
    const iconFromName = leadingIcons.length ? leadingIcons[leadingIcons.length - 1] : '';
    const icon = normalizeCropIcon(iconFromName || crop?.icon);
    const name = cleanedName || (rawName && leadingIcons.length === 0 ? rawName : CROP_DISPLAY_FALLBACK_NAME);
    const variety = String(crop?.variety || '').trim();
    const label = `${icon} ${name}`;
    return variety ? `${label} (${variety})` : label;
}

function isActivePendingRow(row) {
    const token = getPendingTransferToken(row);
    return token !== 'transferred' && token !== 'reverted';
}

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

function roughlyEqual(a, b, epsilon = 1e-6) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return Math.abs(a - b) <= epsilon;
}

function resolvePrimaryAmount(row, amountFields) {
    const fields = Array.isArray(amountFields) ? amountFields : [];
    for (const field of fields) {
        const candidate = toSafeNumber(row?.[field]);
        if (Number.isFinite(candidate)) return candidate;
    }
    return null;
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

function evaluateUsdAmount(row, amountFields, options = {}) {
    const outlierThreshold = Number(options.outlierThreshold || USD_LEGACY_OUTLIER_THRESHOLD);
    const amount = resolvePrimaryAmount(row, amountFields);
    const explicitUsd = toSafeNumber(row?.monto_usd ?? row?.amount_usd ?? row?.usd_amount);
    const currency = normalizeMoneyCurrency(row?.currency ?? row?.moneda ?? row?.currency_code);
    const exchangeRate = toPositiveRate(row?.exchange_rate ?? row?.usd_rate ?? row?.rate);

    if (Number.isFinite(explicitUsd)) {
        return {
            verified: true,
            usd: explicitUsd,
            amount,
            currency,
            exchangeRate,
            reason: ''
        };
    }

    if (!Number.isFinite(amount)) {
        return {
            verified: false,
            usd: 0,
            amount: null,
            currency,
            exchangeRate,
            reason: 'Monto inválido o ausente'
        };
    }

    if (currency === 'USD') {
        const rateMissingOrOne = exchangeRate === null || roughlyEqual(exchangeRate, 1);
        const usdMissingOrSameAmount = explicitUsd === null || roughlyEqual(explicitUsd, amount);
        const seemsLegacyOutlier = rateMissingOrOne && usdMissingOrSameAmount && Math.abs(amount) > outlierThreshold;

        if (seemsLegacyOutlier) {
            return {
                verified: false,
                usd: 0,
                amount,
                currency,
                exchangeRate,
                reason: `USD legacy sospechoso (>${outlierThreshold} sin monto_usd confiable)`
            };
        }

        return {
            verified: true,
            usd: amount,
            amount,
            currency,
            exchangeRate,
            reason: ''
        };
    }

    if (currency !== 'COP' && currency !== 'VES') {
        return {
            verified: false,
            usd: 0,
            amount,
            currency,
            exchangeRate,
            reason: `Moneda ${currency} sin regla de conversión`
        };
    }

    if (!exchangeRate) {
        return {
            verified: false,
            usd: 0,
            amount,
            currency,
            exchangeRate,
            reason: 'Sin exchange_rate para convertir a USD'
        };
    }

    const converted = convertToUSD(amount, currency, exchangeRate);
    if (!Number.isFinite(converted)) {
        return {
            verified: false,
            usd: 0,
            amount,
            currency,
            exchangeRate,
            reason: 'No se pudo convertir a USD'
        };
    }

    return {
        verified: true,
        usd: converted,
        amount,
        currency,
        exchangeRate,
        reason: ''
    };
}

function buildUsdUnverifiedEntry(row, evaluation, bucket) {
    const concept = String(row?.concepto || row?.concept || row?.description || 'Sin concepto').trim() || 'Sin concepto';
    const parsedBuyer = parseBuyerName(concept);
    const fallbackBuyer = parsedBuyer && parsedBuyer !== 'Sin cliente' ? parsedBuyer : '';
    const cliente = String(row?.cliente || row?.client || fallbackBuyer || '').trim() || 'Sin cliente';
    const rawDate = String(row?.fecha || row?.date || row?.created_at || '').trim();
    const normalizedDate = normalizeDateKey(rawDate);
    const amount = Number.isFinite(evaluation?.amount) ? evaluation.amount : null;

    return {
        bucket: String(bucket || 'General'),
        cliente,
        concepto: concept,
        fecha: normalizedDate || rawDate || 'N/D',
        monto: amount,
        currency: evaluation?.currency || 'N/D',
        reason: String(evaluation?.reason || 'No verificable')
    };
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
    if (!text) return 'Sin cliente';

    const saleMatch = text.match(/^venta\s+a\s+(.+?)(?:\s*-\s*|$)/i);
    if (saleMatch?.[1]) return saleMatch[1].trim();

    const taggedMatch = text.match(/(?:comprador|cliente|beneficiario|destino):\s*([^|·]+?)(?:\s*[·|]|$)/i);
    if (taggedMatch?.[1]) return taggedMatch[1].trim();

    return 'Sin cliente';
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
                'id,name,variety,icon,status,status_override,investment,created_at,start_date,deleted_at',
                'id,name,variety,icon,status,investment,created_at,start_date',
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
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha,deleted_at,transfer_state,transferred_to,transferred_income_id,reverted_at',
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha,deleted_at,transfer_state,transferred_to,transferred_income_id',
                'id,crop_id,concepto,monto,monto_usd,currency,exchange_rate,created_at,fecha,deleted_at,transfer_state',
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
                'id,crop_id,concept,amount,monto_usd,currency,exchange_rate,category,date,created_at,deleted_at',
                'id,crop_id,concept,amount,monto_usd,currency,exchange_rate,category,date,created_at',
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
    const pending = pendingRows.filter((row) => !row?.deleted_at && isActivePendingRow(row));
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

    const usdUnverifiedByBucket = {};
    const usdUnverifiedRows = [];
    const incomeUsdByRow = new WeakMap();

    function pushUsdUnverified(bucket, row, evaluation) {
        const key = String(bucket || 'General');
        usdUnverifiedByBucket[key] = (usdUnverifiedByBucket[key] || 0) + 1;
        if (usdUnverifiedRows.length < USD_AUDIT_PREVIEW_LIMIT) {
            usdUnverifiedRows.push(buildUsdUnverifiedEntry(row, evaluation, key));
        }
    }

    function sumRowsUsd(rows, amountFields, bucket, rowUsdMap = null) {
        let total = 0;
        rows.forEach((row) => {
            const evaluation = evaluateUsdAmount(row, amountFields, {
                outlierThreshold: USD_LEGACY_OUTLIER_THRESHOLD
            });

            if (!evaluation.verified) {
                if (rowUsdMap) rowUsdMap.set(row, 0);
                pushUsdUnverified(bucket, row, evaluation);
                return;
            }

            const usd = Number(evaluation.usd || 0);
            total += usd;
            if (rowUsdMap) rowUsdMap.set(row, usd);
        });
        return total;
    }

    const incomeUsd = sumRowsUsd(incomes, ['monto', 'amount'], 'Ingresos', incomeUsdByRow);
    const pendingUsd = sumRowsUsd(pending, ['monto', 'amount'], 'Fiados');
    const expenseUsd = sumRowsUsd(expenses, ['amount', 'monto'], 'Gastos');
    const lossesUsd = sumRowsUsd(losses, ['monto', 'amount'], 'Pérdidas');
    const transfersUsd = sumRowsUsd(transfers, ['monto', 'amount'], 'Donaciones');
    const investmentUsd = crops.reduce((sum, row) => sum + resolveCropInvestmentUsd(row, effectiveRates), 0);

    const cropMap = new Map();
    crops.forEach((row) => {
        const key = String(row?.id || '').trim();
        if (!key) return;
        cropMap.set(key, buildCropDisplayLabel(row));
    });

    const buyerTotals = new Map();
    incomes.forEach((row) => {
        const totalUsd = Number(incomeUsdByRow.get(row) || 0);
        if (!(totalUsd > 0)) return;
        const buyer = parseBuyerName(row?.concepto);
        const key = buyer.toLowerCase();
        const current = buyerTotals.get(key) || { name: buyer, totalUsd: 0, count: 0 };
        current.totalUsd += totalUsd;
        current.count += 1;
        buyerTotals.set(key, current);
    });

    const cropTotals = new Map();
    incomes.forEach((row) => {
        const totalUsd = Number(incomeUsdByRow.get(row) || 0);
        if (!(totalUsd > 0)) return;
        const cropId = String(row?.crop_id || '').trim();
        if (!cropId) return;
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
    const usdUnverifiedCount = Object.values(usdUnverifiedByBucket).reduce((sum, value) => sum + Number(value || 0), 0);
    if (usdUnverifiedCount > 0) {
        warnings.push(`USD no verificado: ${usdUnverifiedCount} movimiento(s) excluido(s) del total.`);
    }

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
        warnings,
        usdAudit: {
            unverifiedCount: usdUnverifiedCount,
            unverifiedByBucket: usdUnverifiedByBucket,
            unverifiedRows: usdUnverifiedRows
        }
    };
}
