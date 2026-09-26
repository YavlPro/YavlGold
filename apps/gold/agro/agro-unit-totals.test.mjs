import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    createUnitTotalsAccumulator,
    hasPositiveUnitTotals,
    addUnitTotals,
    normalizeHistoryUnitKey,
    computeUnitTotalsFromRows,
    computeUnitTotalsByCropFromRows,
    mergeUnitTotalsMaps,
    mergeUnitTotalsPreferHigher,
    sumUnitTotalsFromMap,
    getPendingTransferToken,
    formatUnitTotalsMarkdown
} from './agro-unit-totals.js';

// ---------------------------------------------------------------------------
// createUnitTotalsAccumulator
// ---------------------------------------------------------------------------

test('createUnitTotalsAccumulator devuelve las tres familias en 0', () => {
    assert.deepEqual(createUnitTotalsAccumulator(), { sacos: 0, kilogramos: 0, cestas: 0 });
});

test('createUnitTotalsAccumulator entrega un objeto nuevo en cada llamada', () => {
    const a = createUnitTotalsAccumulator();
    const b = createUnitTotalsAccumulator();
    a.sacos = 99;
    assert.equal(b.sacos, 0);
    assert.notEqual(a, b);
});

// ---------------------------------------------------------------------------
// hasPositiveUnitTotals
// ---------------------------------------------------------------------------

test('hasPositiveUnitTotals es false ante entradas vacías o inválidas', () => {
    assert.equal(hasPositiveUnitTotals(null), false);
    assert.equal(hasPositiveUnitTotals(undefined), false);
    assert.equal(hasPositiveUnitTotals('sacos'), false);
    assert.equal(hasPositiveUnitTotals(42), false);
    assert.equal(hasPositiveUnitTotals({}), false);
    assert.equal(hasPositiveUnitTotals({ sacos: 0, kilogramos: 0, cestas: 0 }), false);
    assert.equal(hasPositiveUnitTotals({ sacos: -5 }), false);
});

test('hasPositiveUnitTotals es true si al menos una familia es positiva', () => {
    assert.equal(hasPositiveUnitTotals({ sacos: 0, kilogramos: 0, cestas: 1 }), true);
    assert.equal(hasPositiveUnitTotals({ sacos: 0.5, kilogramos: 0, cestas: 0 }), true);
});

// ---------------------------------------------------------------------------
// addUnitTotals
// ---------------------------------------------------------------------------

test('addUnitTotals suma cada familia sin mezclarlas', () => {
    const target = { sacos: 1, kilogramos: 2, cestas: 3 };
    addUnitTotals(target, { sacos: 10, kilogramos: 20, cestas: 30 });
    assert.deepEqual(target, { sacos: 11, kilogramos: 22, cestas: 33 });
});

test('addUnitTotals ignora entradas que no son objetos', () => {
    const target = { sacos: 5, kilogramos: 5, cestas: 5 };
    addUnitTotals(target, null);
    addUnitTotals(target, undefined);
    addUnitTotals(target, 'sacos');
    addUnitTotals(target, 7);
    assert.deepEqual(target, { sacos: 5, kilogramos: 5, cestas: 5 });
});

test('addUnitTotals tolera valores ausentes, string y NaN sin propagar NaN', () => {
    const target = createUnitTotalsAccumulator();
    addUnitTotals(target, { sacos: '3' });
    addUnitTotals(target, { kilogramos: NaN, cestas: undefined });
    addUnitTotals(target, { sacos: null, cestas: '' });
    assert.deepEqual(target, { sacos: 3, kilogramos: 0, cestas: 0 });
});

// ---------------------------------------------------------------------------
// normalizeHistoryUnitKey
// ---------------------------------------------------------------------------

test('normalizeHistoryUnitKey normaliza singular, plural y mayúsculas', () => {
    assert.equal(normalizeHistoryUnitKey('saco'), 'sacos');
    assert.equal(normalizeHistoryUnitKey('Sacos'), 'sacos');
    assert.equal(normalizeHistoryUnitKey('SACOS'), 'sacos');
    assert.equal(normalizeHistoryUnitKey('cesta'), 'cestas');
    assert.equal(normalizeHistoryUnitKey('Cestas'), 'cestas');
    assert.equal(normalizeHistoryUnitKey('kg'), 'kilogramos');
    assert.equal(normalizeHistoryUnitKey('KGS'), 'kilogramos');
    assert.equal(normalizeHistoryUnitKey('kilogramo'), 'kilogramos');
    assert.equal(normalizeHistoryUnitKey('kilogram'), 'kilogramos');
    assert.equal(normalizeHistoryUnitKey('kilograms'), 'kilogramos');
});

test('normalizeHistoryUnitKey tolera acentos, espacios y basura', () => {
    assert.equal(normalizeHistoryUnitKey('  Kilógramos  '), 'kilogramos');
    assert.equal(normalizeHistoryUnitKey('litros'), '');
    assert.equal(normalizeHistoryUnitKey('cajas'), '');
    assert.equal(normalizeHistoryUnitKey(''), '');
    assert.equal(normalizeHistoryUnitKey(null), '');
    assert.equal(normalizeHistoryUnitKey(undefined), '');
    assert.equal(normalizeHistoryUnitKey(123), '');
});

// ---------------------------------------------------------------------------
// computeUnitTotalsFromRows
// ---------------------------------------------------------------------------

test('computeUnitTotalsFromRows devuelve ceros ante entradas vacías', () => {
    const vacio = { sacos: 0, kilogramos: 0, cestas: 0 };
    assert.deepEqual(computeUnitTotalsFromRows([]), vacio);
    assert.deepEqual(computeUnitTotalsFromRows(null), vacio);
    assert.deepEqual(computeUnitTotalsFromRows(undefined), vacio);
    assert.deepEqual(computeUnitTotalsFromRows('no-array'), vacio);
});

test('computeUnitTotalsFromRows agrega por familia sin mezclarlas', () => {
    const totals = computeUnitTotalsFromRows([
        { unit_type: 'sacos', unit_qty: 10 },
        { unit_type: 'cestas', unit_qty: 5 },
        { quantity_kg: 25 }
    ]);
    assert.deepEqual(totals, { sacos: 10, kilogramos: 25, cestas: 5 });
});

test('una fila con sacos no contamina la familia de kilogramos', () => {
    const totals = computeUnitTotalsFromRows([
        { unit_type: 'sacos', unit_qty: 10, quantity_kg: 150 }
    ]);
    assert.equal(totals.sacos, 10);
    assert.equal(totals.kilogramos, 0, 'el kg dedicado no debe sumarse si la fila ya tiene familia');
    assert.equal(totals.cestas, 0);
});

test('computeUnitTotalsFromRows acepta números con formato de locale', () => {
    const totals = computeUnitTotalsFromRows([
        { unit_type: 'kilogramos', unit_qty: '1.500' },
        { unit_type: 'sacos', unit_qty: '1,5' }
    ]);
    assert.equal(totals.kilogramos, 1500);
    assert.equal(totals.sacos, 1.5);
});

test('computeUnitTotalsFromRows descarta cantidades cero, negativas y no numéricas', () => {
    const totals = computeUnitTotalsFromRows([
        { unit_type: 'sacos', unit_qty: 0 },
        { unit_type: 'sacos', unit_qty: -4 },
        { unit_type: 'sacos', unit_qty: 'abc' },
        { unit_type: 'sacos', unit_qty: null },
        { unit_type: 'cestas', unit_qty: '  ' },
        { unit_type: 'sacos' }
    ]);
    assert.deepEqual(totals, { sacos: 0, kilogramos: 0, cestas: 0 });
});

test('computeUnitTotalsFromRows redondea a 3 decimales y no devuelve negativos', () => {
    const totals = computeUnitTotalsFromRows([
        { unit_type: 'sacos', unit_qty: 0.123456789 },
        { unit_type: 'cestas', unit_qty: 1e-12 }
    ]);
    assert.equal(totals.sacos, 0.123);
    assert.equal(totals.cestas, 0);
    assert.ok(totals.sacos >= 0);
});

test('una fila sin unidad conocida solo aporta kilogramos dedicados', () => {
    const totals = computeUnitTotalsFromRows([
        { qty: 5 },
        { quantity_kg: 7.5 }
    ]);
    assert.deepEqual(totals, { sacos: 0, kilogramos: 7.5, cestas: 0 });
});

test('parsea la unidad embebida en el concepto del gasto', () => {
    const totals = computeUnitTotalsFromRows([
        { concepto: 'Flete · 3 sacos' },
        { concepto: 'Compra · 12 kg' },
        { concepto: 'Semilla' }
    ]);
    assert.equal(totals.sacos, 3);
    assert.equal(totals.kilogramos, 12);
    assert.equal(totals.cestas, 0);
});

test('usa el split_meta como respaldo de unidad y cantidad', () => {
    const totals = computeUnitTotalsFromRows([
        {
            split_meta: JSON.stringify({
                type: 'partial_transfer',
                role: 'destination',
                unit_type: 'sacos',
                qty_total: 10,
                qty_moved: 4,
                qty_left: 6
            })
        }
    ]);
    assert.equal(totals.sacos, 4);
});

// ---------------------------------------------------------------------------
// computeUnitTotalsByCropFromRows
// ---------------------------------------------------------------------------

test('computeUnitTotalsByCropFromRows agrupa por cultivo', () => {
    const map = computeUnitTotalsByCropFromRows([
        { crop_id: 'A', unit_type: 'sacos', unit_qty: 2 },
        { crop_id: 'B', unit_type: 'cestas', unit_qty: 1 },
        { crop_id: 'A', unit_type: 'sacos', unit_qty: 3 }
    ]);

    assert.ok(map instanceof Map);
    assert.equal(map.size, 2);
    assert.equal(map.get('A').sacos, 5);
    assert.equal(map.get('B').cestas, 1);
});

test('las filas sin cultivo caen en __no_crop__ y las vacías se descartan', () => {
    const map = computeUnitTotalsByCropFromRows([
        { crop_id: '', unit_type: 'sacos', unit_qty: 1 },
        { unit_type: 'sacos', unit_qty: 2 },
        { crop_id: 'Z', unit_type: 'sacos', unit_qty: 0 }
    ]);

    assert.equal(map.size, 1);
    assert.equal(map.get('__no_crop__').sacos, 3);
    assert.equal(map.has('Z'), false, 'un cultivo sin unidades positivas no debe persistir');
});

test('computeUnitTotalsByCropFromRows con entradas vacías devuelve Map vacío', () => {
    assert.equal(computeUnitTotalsByCropFromRows([]).size, 0);
    assert.equal(computeUnitTotalsByCropFromRows(null).size, 0);
});

// ---------------------------------------------------------------------------
// mergeUnitTotalsMaps / mergeUnitTotalsPreferHigher / sumUnitTotalsFromMap
// ---------------------------------------------------------------------------

test('mergeUnitTotalsMaps con listas vacías o inválidas devuelve Map vacío', () => {
    assert.equal(mergeUnitTotalsMaps([]).size, 0);
    assert.equal(mergeUnitTotalsMaps().size, 0);
    assert.equal(mergeUnitTotalsMaps(null).size, 0);
    assert.equal(mergeUnitTotalsMaps('no-array').size, 0);
    assert.equal(mergeUnitTotalsMaps([null, 42, 'x']).size, 0);
});

test('mergeUnitTotalsMaps suma el mismo cultivo entre mapas', () => {
    const a = computeUnitTotalsByCropFromRows([{ crop_id: 'A', unit_type: 'sacos', unit_qty: 2 }]);
    const b = computeUnitTotalsByCropFromRows([
        { crop_id: 'A', unit_type: 'sacos', unit_qty: 3 },
        { crop_id: 'B', unit_type: 'cestas', unit_qty: 7 }
    ]);

    const merged = mergeUnitTotalsMaps([a, b]);

    assert.equal(merged.get('A').sacos, 5);
    assert.equal(merged.get('B').cestas, 7);
    assert.equal(merged.get('A').cestas, 0, 'las familias no se mezclan al fusionar');
    assert.equal(merged.size, 2);
});

test('mergeUnitTotalsMaps descarta cultivos que quedan en cero', () => {
    const mapa = new Map([['A', { sacos: 0, kilogramos: 0, cestas: 0 }]]);
    assert.equal(mergeUnitTotalsMaps([mapa]).size, 0);
});

test('mergeUnitTotalsPreferHigher toma el máximo por familia, no la suma', () => {
    const base = computeUnitTotalsByCropFromRows([{ crop_id: 'A', unit_type: 'sacos', unit_qty: 5 }]);
    const pendiente = computeUnitTotalsByCropFromRows([
        { crop_id: 'A', unit_type: 'sacos', unit_qty: 2 },
        { crop_id: 'A', quantity_kg: 9 }
    ]);

    const merged = mergeUnitTotalsPreferHigher(base, pendiente);

    assert.equal(merged.get('A').sacos, 5, 'no debe duplicar contando dos veces el mismo cultivo');
    assert.equal(merged.get('A').kilogramos, 9);
});

test('mergeUnitTotalsPreferHigher tolera mapas ausentes', () => {
    const base = computeUnitTotalsByCropFromRows([{ crop_id: 'A', unit_type: 'sacos', unit_qty: 5 }]);

    assert.equal(mergeUnitTotalsPreferHigher(base, null).get('A').sacos, 5);
    assert.equal(mergeUnitTotalsPreferHigher(base, undefined).get('A').sacos, 5);
    assert.equal(mergeUnitTotalsPreferHigher(null, new Map([['A', base.get('A')]])).get('A').sacos, 5);
    assert.equal(mergeUnitTotalsPreferHigher(undefined, undefined).size, 0);
});

test('sumUnitTotalsFromMap agrega todos los cultivos en un solo total', () => {
    const map = computeUnitTotalsByCropFromRows([
        { crop_id: 'A', unit_type: 'sacos', unit_qty: 2 },
        { crop_id: 'B', unit_type: 'sacos', unit_qty: 3 },
        { crop_id: 'B', unit_type: 'cestas', unit_qty: 4 },
        { crop_id: 'B', quantity_kg: 10 }
    ]);

    assert.deepEqual(sumUnitTotalsFromMap(map), { sacos: 5, kilogramos: 10, cestas: 4 });
});

test('sumUnitTotalsFromMap devuelve ceros ante entradas inválidas o vacías', () => {
    const cero = { sacos: 0, kilogramos: 0, cestas: 0 };
    assert.deepEqual(sumUnitTotalsFromMap(null), cero);
    assert.deepEqual(sumUnitTotalsFromMap(undefined), cero);
    assert.deepEqual(sumUnitTotalsFromMap({}), cero);
    assert.deepEqual(sumUnitTotalsFromMap(new Map()), cero);
});

test('sumUnitTotalsFromMap redondea a 3 decimales', () => {
    const map = new Map([
        ['A', { sacos: 0.123456, kilogramos: 0, cestas: 0 }],
        ['B', { sacos: 0.123456, kilogramos: 0, cestas: 0 }]
    ]);
    assert.equal(sumUnitTotalsFromMap(map).sacos, 0.247);
});

// ---------------------------------------------------------------------------
// getPendingTransferToken
// ---------------------------------------------------------------------------

test('getPendingTransferToken detecta transferencias explícitas', () => {
    assert.equal(getPendingTransferToken({ transfer_state: 'transferred' }), 'transferred');
    assert.equal(getPendingTransferToken({ transfer_state: 'reverted' }), 'reverted');
    assert.equal(getPendingTransferToken({ transfer_state: 'reverted_to_pending' }), 'reverted');
    assert.equal(getPendingTransferToken({ transfer_type: 'transferred' }), 'transferred');
});

test('getPendingTransferToken detecta transferencias por fechas e ids', () => {
    assert.equal(getPendingTransferToken({ transferred_at: '2026-01-01' }), 'transferred');
    assert.equal(getPendingTransferToken({ transferred_income_id: 7 }), 'transferred');
    assert.equal(getPendingTransferToken({ transferred_to: 'finca_norte' }), 'transferred');
    assert.equal(getPendingTransferToken({ reverted_at: '2026-01-01' }), 'reverted');
});

test('una reversión gana sobre la transferencia simultánea', () => {
    assert.equal(
        getPendingTransferToken({ transferred_at: '2026-01-01', reverted_at: '2026-01-02' }),
        'reverted'
    );
});

test('getPendingTransferToken devuelve vacío o el estado crudo cuando no hay datos', () => {
    assert.equal(getPendingTransferToken({}), '');
    assert.equal(getPendingTransferToken(null), '');
    assert.equal(getPendingTransferToken(undefined), '');
    assert.equal(getPendingTransferToken({ transfer_state: 'pending' }), 'pending');
    assert.equal(getPendingTransferToken({ transfer_state: '  TRANSFERRED  ' }), 'transferred');
    assert.equal(getPendingTransferToken({ transfer_state: '', transferred_at: '' }), '');
});

// ---------------------------------------------------------------------------
// formatUnitTotalsMarkdown
// ---------------------------------------------------------------------------

test('formatUnitTotalsMarkdown devuelve cadena vacía sin unidades positivas', () => {
    assert.equal(formatUnitTotalsMarkdown({ sacos: 0, kilogramos: 0, cestas: 0 }), '');
    assert.equal(formatUnitTotalsMarkdown({}), '');
    assert.equal(formatUnitTotalsMarkdown(null), '');
    assert.equal(formatUnitTotalsMarkdown(undefined), '');
    assert.equal(formatUnitTotalsMarkdown('sacos'), '');
});

test('formatUnitTotalsMarkdown usa el encabezado por defecto y el personalizado', () => {
    assert.ok(formatUnitTotalsMarkdown({ sacos: 1 }).startsWith('## 📦 Unidades\n'));
    assert.ok(formatUnitTotalsMarkdown({ sacos: 1 }, { heading: '### Total' }).startsWith('### Total\n'));
    assert.ok(formatUnitTotalsMarkdown({ sacos: 1 }, { heading: '   ' }).startsWith('## 📦 Unidades\n'));
});

test('formatUnitTotalsMarkdown singulariza 1 y pluraliza el resto', () => {
    assert.ok(formatUnitTotalsMarkdown({ sacos: 1 }).includes('- 1 saco\n'));
    assert.ok(formatUnitTotalsMarkdown({ sacos: 2 }).includes('- 2 sacos\n'));
    assert.ok(formatUnitTotalsMarkdown({ cestas: 1 }).includes('- 1 cesta\n'));
    assert.ok(formatUnitTotalsMarkdown({ cestas: 4 }).includes('- 4 cestas\n'));
    assert.ok(formatUnitTotalsMarkdown({ kilogramos: 1 }).includes('- 1 kg\n'));
});

test('formatUnitTotalsMarkdown respeta el orden sacos, kilogramos, cestas y omite los ceros', () => {
    const md = formatUnitTotalsMarkdown({ sacos: 2, kilogramos: 3.5, cestas: 4 });
    const lineas = md.trim().split('\n');
    assert.deepEqual(lineas, [
        '## 📦 Unidades',
        '- 2 sacos',
        '- 3.5 kg',
        '- 4 cestas'
    ]);

    const parcial = formatUnitTotalsMarkdown({ sacos: 0, kilogramos: 0, cestas: 4 }).trim().split('\n');
    assert.deepEqual(parcial, ['## 📦 Unidades', '- 4 cestas']);
});

test('formatUnitTotalsMarkdown cierra con doble salto de línea para concatenar reportes', () => {
    assert.ok(formatUnitTotalsMarkdown({ sacos: 1 }).endsWith('\n\n'));
});
