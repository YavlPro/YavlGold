import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calcularRentabilidad } from './agro-profit-calculator.js';

test('Batata amarilla 2 usa pagados, inversión y pérdidas canónicas del MD', () => {
    assert.deepEqual(
        calcularRentabilidad({
            pagados: 1263.25,
            inversion: 200,
            gastos: 0,
            perdidas: 108.13
        }),
        {
            pagados: 1263.25,
            inversion: 200,
            gastos: 0,
            perdidas: 108.13,
            fiadosPendientes: 0,
            costosTotales: 308.13,
            rentabilidad: 955.12,
            rentabilidadReal: 955.12,
            balanceActual: 955.12,
            capitalEnRiesgo: 308.13,
            estadoCultivo: 'Finalizado',
            estadoCliente: 'Perdido',
            estado_cultivo: 'Finalizado',
            estado_cliente: 'Perdido',
            capital_en_riesgo: 308.13
        }
    );
});

test('Maíz mio no infla inversión y separa fiados de rentabilidad real', () => {
    const result = calcularRentabilidad({
        pagados: 0,
        inversion: 92.64,
        gastos: 14,
        perdidas: 0,
        fiados: 439
    });

    assert.equal(result.rentabilidad, -106.64);
    assert.equal(result.balanceActual, -545.64);
    assert.equal(result.capitalEnRiesgo, 545.64);
    assert.equal(result.estadoCliente, 'Fiado');
});

test('un cliente con pérdida nunca queda clasificado como pagado', () => {
    const result = calcularRentabilidad({
        pagados: 119,
        inversion: 0,
        gastos: 0,
        perdidas: 108.13,
        fiados: 0
    });

    assert.equal(result.estadoCliente, 'Perdido');
    assert.equal(result.estado_cliente, 'Perdido');
});
