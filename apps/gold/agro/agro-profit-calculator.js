const EPSILON = 0.005;

function toFiniteMoney(value) {
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

function pickMoney(source, keys) {
    const row = source && typeof source === 'object' ? source : {};
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return toFiniteMoney(row[key]);
        }
    }
    return 0;
}

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function resolveCropState(input, rentabilidadReal) {
    const explicit = String(input?.estado_cultivo ?? input?.estadoCultivo ?? input?.cropState ?? '').trim();
    if (explicit) return explicit;
    if (pickMoney(input, ['perdidas', 'lossesTotal', 'losses', 'loss_total']) > EPSILON) return 'Finalizado';
    if (Math.abs(rentabilidadReal) <= EPSILON) return 'Activo';
    return rentabilidadReal >= 0 ? 'Finalizado' : 'Activo';
}

function resolveClientState(metrics) {
    if (metrics.perdidas > EPSILON) return 'Perdido';
    if (metrics.fiadosPendientes > EPSILON) return 'Fiado';
    if (metrics.pagados > EPSILON) return 'Pagado';
    return 'Sin registro';
}

export function calcularRentabilidad(cultivo = {}) {
    const pagados = pickMoney(cultivo, ['pagados', 'cobradoReal', 'incomeTotal', 'ingresos', 'paid', 'paid_total']);
    const inversion = pickMoney(cultivo, ['inversion', 'inversión', 'baseInvestment', 'baseInvestmentUsd', 'investment', 'investmentCents']);
    const gastos = pickMoney(cultivo, ['gastos', 'expenseInvestment', 'expenseTotal', 'expenses', 'gastosUsd']);
    const perdidas = pickMoney(cultivo, ['perdidas', 'pérdidas', 'lossesTotal', 'losses', 'loss_total', 'perdidasUsd']);
    const fiadosPendientes = pickMoney(cultivo, ['fiados', 'fiadosPendientes', 'pendingTotal', 'pending', 'pending_total', 'fiadosUsd']);

    const costosTotales = roundMoney(inversion + gastos + perdidas);
    const rentabilidad = roundMoney(pagados - costosTotales);
    const balanceActual = roundMoney(rentabilidad - fiadosPendientes);
    const capitalEnRiesgo = roundMoney(costosTotales + fiadosPendientes);
    const estadoCultivo = resolveCropState(cultivo, rentabilidad);
    const estadoCliente = resolveClientState({ pagados, perdidas, fiadosPendientes });

    return {
        pagados: roundMoney(pagados),
        inversion: roundMoney(inversion),
        gastos: roundMoney(gastos),
        perdidas: roundMoney(perdidas),
        fiadosPendientes: roundMoney(fiadosPendientes),
        costosTotales,
        rentabilidad,
        rentabilidadReal: rentabilidad,
        balanceActual,
        capitalEnRiesgo,
        estadoCultivo,
        estadoCliente,
        estado_cultivo: estadoCultivo,
        estado_cliente: estadoCliente,
        capital_en_riesgo: capitalEnRiesgo
    };
}

export const calcular_rentabilidad = calcularRentabilidad;
