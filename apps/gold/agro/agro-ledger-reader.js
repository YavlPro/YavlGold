/**
 * Agro — Lector canonico del ledger por particion (Sesion 1 frente Cultivo).
 *
 * Reader PURO sin wiring: ningun archivo vivo lo importa todavia. Lo consumira
 * primero el wizard del Cultivo (sesion 3); Finca migra despues con QA de
 * matriz. Extraccion fiel de fetchTileRows de agro-facturero-finca-wizard.js
 * (:466-617) con las particiones como parametro en vez de estado de sesion.
 *
 * Particiones canonicas (MANIFIESTO 4.5):
 *   { preset: 'farm',   farmId?  } -> crop_id IS NULL (+eq farm_id si farmId)
 *   { preset: 'crop',   cropId? | cropIds? } -> crop_id NOT NULL (+eq/.in)
 *   { preset: 'orphan' }            -> crop_id IS NULL AND farm_id IS NULL
 *
 * NOTA crop: NUNCA se filtran filas crop por farm_id (data real: con_finca = 0
 * en las 5 tablas). El eje finca del wizard de Cultivo solo acota QUE cultivos
 * entran en cropIds; la criba de datos ignora farm_id en preset crop.
 *
 * NOTA farm (S8): la particion farm EXCLUYE los registros sin finca — los
 * ambos-null viven en el Facturero Personal. "Vista general" de Finca muestra
 * todas las fincas, sin huerfanos. La union operacional es simetrica: los
 * ciclos sin finca y sin cultivo quedan para orphan, no para farm.
 *
 * Vocabulario de tipo (5 valores, alineado a tablas): expense | income |
 * pending | loss | transfer. La union operacional traduce el vocabulario de
 * ciclos (economic_type donation) a 'transfer' via CYCLE_TYPE_TO_TYPE.
 *
 * RLS: igual que el wizard de Finca (GREEN en produccion), no se filtra
 * user_id explicito — las policies por tabla (ALL / sin delete en income)
 * acotan al dueno. Hard delete en operacionales: sin deleted_at.
 *
 * Leyes aplicadas (SKILLS/2026-09-11-LECCIONES-FACTURERO-FINCA.md):
 * - Leccion 1: todo campo que la criba compara (farm_id, crop_id) vive en los
 *   cols del select de CADA tile; verificacion estatica campo-por-campo.
 * - Leccion 3: canary si crudo > 0 && filtrado === 0 (ambas ramas).
 * - Stamps B7 generalizados a los 3 ejes de la particion.
 * Errores: console.error + throw. Nunca [] silencioso.
 */

import { supabase } from '../assets/js/config/supabase-config.js';

const LEDGER_LIMIT_DEFAULT = 500;
const OPERATIONAL_LIMIT_DEFAULT = 3000;

const PRESET_FARM = 'farm';
const PRESET_CROP = 'crop';
const PRESET_ORPHAN = 'orphan';
const VALID_PRESETS = new Set([PRESET_FARM, PRESET_CROP, PRESET_ORPHAN]);

// Tiles -> vocabulario de 5 tipos (contrato Sesion 1). Fiados mapea a pending:
// los ciclos operacionales NO admiten economic_type 'pending', por eso la union
// D-B se salta ese tipo (precedente wizard :53 "Fiados no tiene union").
export const TILE_TO_OP_TYPE = Object.freeze({
    gastos: 'expense',
    ingresos: 'income',
    fiados: 'pending',
    perdidas: 'loss',
    donaciones: 'transfer'
});

// Puente de vocabulario ciclos -> ledger: donation (cycles) = transfer (tile
// donaciones / tabla agro_transfers). Desconocidos pasan tal cual (no matchean
// ningun tile y caen fuera de la union, sin inventar semantica).
const CYCLE_TYPE_TO_TYPE = Object.freeze({
    expense: 'expense',
    income: 'income',
    donation: 'transfer',
    loss: 'loss'
});

const OP_UNION_SKIPPED_TYPES = new Set(['pending']);

// Categorias canonicas del libro (identidad en translateCategory) + 'ventas'
// (D-3b, supuesto reversible: ventas/venta son categorias reales de income en
// la particion crop — 104 + 4 filas). Revertir = quitar las 3 lineas marcadas.
const CATEGORY_ALIASES = Object.freeze({
    tools: 'herramientas',
    maintenance: 'mantenimiento',
    labor: 'mano_obra',
    transport: 'transporte',
    transporte: 'transporte',
    supplies: 'insumos',
    insumos: 'insumos',
    insumo: 'insumos',
    other: 'otros',
    otro: 'otros',
    otros: 'otros',
    operacion: 'otros',
    logistica: 'otros',
    herramientas: 'herramientas',
    herramienta: 'herramientas',
    mano_obra: 'mano_obra',
    mantenimiento: 'mantenimiento',
    venta: 'ventas',   // D-3b (1/3)
    ventas: 'ventas'   // D-3b (2/3)
});
const KNOWN_CATEGORY_IDS = new Set([
    'insumos', 'herramientas', 'mano_obra', 'mantenimiento', 'transporte', 'otros',
    'ventas' // D-3b (3/3)
]);

// Tiles del ledger: mismos destinos, alias y scopes validados en produccion
// por el wizard de Finca (VER_TILES :108-140) + crop_id anadido a TODOS los
// cols (Leccion 1: la criba compara cropKey en las 3 particiones). origin_table
// solo existe en income/losses; split_from_id existe en las 5.
export const LEDGER_TILES = Object.freeze([
    Object.freeze({
        id: 'gastos', label: 'Gastos', icon: 'fa-solid fa-receipt',
        table: 'agro_expenses', who: '', orderCol: 'date',
        cols: 'id,concept,amount,category,currency,date,created_at,farm_id,crop_id,split_from_id',
        alias: Object.freeze({ concepto: 'concept', monto: 'amount', fecha: 'date' }),
        categoryField: 'category',
        scope: null
    }),
    Object.freeze({
        id: 'ingresos', label: 'Ingresos', icon: 'fa-solid fa-circle-check',
        table: 'agro_income', who: '', orderCol: 'fecha',
        cols: 'id,concepto,monto,monto_usd,categoria,currency,fecha,created_at,farm_id,crop_id,origin_table,split_from_id',
        alias: null,
        categoryField: 'categoria',
        scope: (q) => q.is('reverted_at', null)
    }),
    Object.freeze({
        id: 'fiados', label: 'Fiados', icon: 'fa-solid fa-handshake',
        table: 'agro_pending', who: 'cliente', orderCol: 'fecha',
        cols: 'id,cliente,concepto,monto,monto_usd,currency,fecha,created_at,farm_id,crop_id,split_from_id',
        alias: null,
        categoryField: '',
        scope: (q) => q.is('reverted_at', null).neq('transfer_state', 'transferred')
    }),
    Object.freeze({
        id: 'perdidas', label: 'Pérdidas', icon: 'fa-solid fa-circle-xmark',
        table: 'agro_losses', who: 'causa', orderCol: 'fecha',
        cols: 'id,causa,concepto,monto,monto_usd,currency,fecha,created_at,farm_id,crop_id,origin_table,split_from_id',
        alias: null,
        categoryField: '',
        scope: (q) => q.is('reverted_at', null)
    }),
    Object.freeze({
        id: 'donaciones', label: 'Donaciones', icon: 'fa-solid fa-hand-holding-heart',
        table: 'agro_transfers', who: 'destino', orderCol: 'fecha',
        cols: 'id,destino,concepto,monto,monto_usd,currency,fecha,created_at,farm_id,crop_id,split_from_id',
        alias: null,
        categoryField: '',
        scope: null
    })
]);

const STAMP_KEYS = Object.freeze(['tileId', 'preset', 'farmId', 'cropId', 'cropIds']);

// ---------- Helpers internos ----------

function normalizeToken(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeId(value) {
    return String(value || '').trim();
}

// strict=true (fetchers): preset invalido lanza. strict=false (stamps): devuelve
// preset '' para que isScopeStale degrade a "stale" en vez de romper el render.
function normalizePartition(partition, { strict = true } = {}) {
    const preset = normalizeToken(partition?.preset);
    if (!VALID_PRESETS.has(preset)) {
        if (!strict) return { preset: '', farmId: '', cropId: '', cropIds: null };
        throw new Error('[ledger-reader] particion invalida: preset debe ser farm|crop|orphan');
    }
    return {
        preset,
        // farmId solo vive en preset farm; en crop se descarta a proposito
        // (regla: jamas filtrar filas crop por farm_id).
        farmId: preset === PRESET_FARM ? normalizeId(partition.farmId) : '',
        cropId: preset === PRESET_CROP ? normalizeId(partition.cropId) : '',
        cropIds: preset === PRESET_CROP && Array.isArray(partition.cropIds)
            ? partition.cropIds.map(normalizeId).filter(Boolean)
            : null
    };
}

// Selector sin candidatos (finca sin cultivos): cero honesto sin query y sin
// canary (crudo=0). Solo aplica a preset crop sin cropId unico.
function isEmptyCropSelection(p) {
    return p.preset === PRESET_CROP && !p.cropId && Array.isArray(p.cropIds) && p.cropIds.length === 0;
}

// Criba post-normalizacion (ANEXO 9): la query refuerza, pero la unica puerta
// de verdad es el filtro sobre campos normalizados. Consume row.farmKey y
// row.cropKey — ambos presentes en el select de cada tile (Leccion 1).
function partitionPredicate(p) {
    if (p.preset === PRESET_FARM) {
        // S8: farm exige finca (farmKey no vacio). Simultaneamente refuerza el
        // crop-null. Los ambos-null (ledger y ciclos) quedan para orphan.
        return (row) => row.cropKey === '' && row.farmKey !== '' && (!p.farmId || row.farmKey === p.farmId);
    }
    if (p.preset === PRESET_CROP) {
        if (p.cropId) return (row) => row.cropKey !== '' && row.cropKey === p.cropId;
        if (p.cropIds) return (row) => row.cropKey !== '' && p.cropIds.includes(row.cropKey);
        return (row) => row.cropKey !== '';
    }
    return (row) => row.cropKey === '' && row.farmKey === '';
}

// Leccion 3: la criba que descarta TODO lo crudo se confiesa. En la rama
// operacional "crudo" cuenta solo las filas ya emparejadas por tipo (sin ruido
// de otros tiles), para que el canary senale particiones ciegas reales.
function canaryCriba(crudas, filtradas, context) {
    if (crudas > 0 && filtradas === 0) {
        console.warn('[ledger-reader] criba descarto todo', { crudas, filtradas, ...context });
    }
}

// ---------- API publica ----------

// CAT-3: traduccion historica en lectura (sin reescribir datos). 'general' es
// el default del sistema (no una eleccion) -> '' (Sin categoria); ids canonicos
// y alias legacy caen en su tile canonico; desconocido -> 'otros' (comodin).
export function translateCategory(rawValue) {
    const value = normalizeToken(rawValue);
    if (!value || value === 'general') return '';
    if (CATEGORY_ALIASES[value]) return CATEGORY_ALIASES[value];
    if (KNOWN_CATEGORY_IDS.has(value)) return value;
    return 'otros';
}

export async function fetchLedgerTile({ tileId, partition, limit = LEDGER_LIMIT_DEFAULT } = {}) {
    const tile = LEDGER_TILES.find((entry) => entry.id === normalizeToken(tileId));
    if (!tile) throw new Error(`[ledger-reader] tile desconocido: ${tileId}`);
    const p = normalizePartition(partition);
    if (isEmptyCropSelection(p)) return [];

    const opType = TILE_TO_OP_TYPE[tile.id];
    let query = supabase
        .from(tile.table)
        .select(tile.cols)
        .is('deleted_at', null)
        .order(tile.orderCol || 'fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

    if (p.preset === PRESET_FARM) {
        // S8: sin huerfanos en Finca — ambos-null vive en Personal.
        query = query.is('crop_id', null).not('farm_id', 'is', null);
        if (p.farmId) query = query.eq('farm_id', p.farmId);
    } else if (p.preset === PRESET_CROP) {
        query = query.not('crop_id', 'is', null);
        if (p.cropId) query = query.eq('crop_id', p.cropId);
        else if (p.cropIds) query = query.in('crop_id', p.cropIds);
    } else {
        query = query.is('crop_id', null).is('farm_id', null);
    }

    if (tile.scope) query = tile.scope(query);

    const { data, error } = await query;
    if (error) {
        console.error('[ledger-reader] ledger query error:', error?.message || error, { table: tile.table, partition: p });
        throw error;
    }

    const alias = tile.alias || {};
    const raw = Array.isArray(data) ? data : [];
    const predicate = partitionPredicate(p);
    const rows = raw
        .map((row) => ({
            ...row,
            origen: 'ledger',
            type: opType,
            farmKey: String(row?.farm_id || '').trim(),
            cropKey: String(row?.crop_id || '').trim(),
            fecha: row?.[alias.fecha || 'fecha'],
            concepto: row?.[alias.concepto || 'concepto'],
            monto: row?.[alias.monto || 'monto'],
            categoria: translateCategory(row?.[tile.categoryField])
        }))
        .filter((row) => row.type === opType && predicate(row));

    canaryCriba(raw.length, rows.length, { origen: 'ledger', tileId: tile.id, partition: p });
    return rows;
}

// Union D-B (ANEXO 9): movimientos operativos historicos NORMALIZADOS fila por
// fila antes de filtrar. Tipo por direction (in -> income) con la semantica del
// ciclo (donation -> transfer, loss) cuando direction no basta; farmKey con
// fallback al ciclo; cultivo del ciclo (los movements no llevan crop propio).
export async function fetchOperationalUnion({ opType, partition, limit = OPERATIONAL_LIMIT_DEFAULT } = {}) {
    const type = normalizeToken(opType);
    if (!type) throw new Error('[ledger-reader] fetchOperationalUnion requiere opType');
    if (OP_UNION_SKIPPED_TYPES.has(type)) return [];
    const p = normalizePartition(partition);
    if (isEmptyCropSelection(p)) return [];

    const [cyclesResult, movementsResult] = await Promise.all([
        supabase.from('agro_operational_cycles')
            .select('id,economic_type,category,crop_id,farm_id')
            .limit(limit),
        supabase.from('agro_operational_movements')
            .select('id,cycle_id,direction,amount,currency,amount_usd,concept,movement_date,created_at,farm_id')
            .limit(limit)
    ]);
    if (cyclesResult.error) {
        console.error('[ledger-reader] cycles query error:', cyclesResult.error?.message || cyclesResult.error);
        throw cyclesResult.error;
    }
    if (movementsResult.error) {
        console.error('[ledger-reader] movements query error:', movementsResult.error?.message || movementsResult.error);
        throw movementsResult.error;
    }

    const cycleById = new Map(
        (cyclesResult.data || []).map((cycle) => [String(cycle?.id || ''), cycle])
    );
    const predicate = partitionPredicate(p);

    const typedRows = [];
    const rows = [];
    (movementsResult.data || []).forEach((movement) => {
        const cycle = cycleById.get(String(movement?.cycle_id || '')) || null;
        const direction = normalizeToken(movement?.direction);
        const cycleType = normalizeToken(cycle?.economic_type);
        const mappedType = CYCLE_TYPE_TO_TYPE[cycleType] || cycleType;

        const row = {
            ...movement,
            origen: 'operacional',
            type: direction === 'in' ? 'income'
                : (mappedType === 'transfer' || mappedType === 'loss') ? mappedType
                    : direction ? 'expense'
                        : mappedType,
            farmKey: String(movement?.farm_id || cycle?.farm_id || '').trim(),
            cropKey: String(cycle?.crop_id || '').trim(),
            fecha: movement?.movement_date,
            concepto: movement?.concept,
            monto: movement?.amount,
            categoria: translateCategory(cycle?.category)
        };
        if (row.type !== type) return;
        typedRows.push(row);
        if (predicate(row)) rows.push(row);
    });

    canaryCriba(typedRows.length, rows.length, { origen: 'operacional', opType: type, partition: p });
    return rows;
}

// Composicion canonica de un tile: ledger + union operacional + dedup
// (fecha + monto + concepto; ledger prima) + orden fecha descendente.
// El manejo de estados (loading/error/empty) y los guards de carrera
// (requestId) pertenecen al consumidor UI; el reader es stateless y lanza.
export async function fetchTileRows({ tileId, partition } = {}) {
    const tile = LEDGER_TILES.find((entry) => entry.id === normalizeToken(tileId));
    if (!tile) throw new Error(`[ledger-reader] tile desconocido: ${tileId}`);
    const p = normalizePartition(partition);
    const opType = TILE_TO_OP_TYPE[tile.id];

    const [ledgerRows, opRows] = await Promise.all([
        fetchLedgerTile({ tileId: tile.id, partition: p, limit: LEDGER_LIMIT_DEFAULT }),
        fetchOperationalUnion({ opType, partition: p, limit: OPERATIONAL_LIMIT_DEFAULT })
    ]);

    const dedupeKey = (row) =>
        `${String(row.fecha || '')}|${Number(row.monto) || 0}|${String(row.concepto || '').trim().toLowerCase()}`;
    const seenKeys = new Set(ledgerRows.map(dedupeKey));
    const dedupedOp = opRows.filter((row) => {
        const key = dedupeKey(row);
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
    });

    return [...ledgerRows, ...dedupedOp].sort((a, b) =>
        String(b.fecha || '').localeCompare(String(a.fecha || ''))
    );
}

// Stamps B7 generalizados: el scope se estampa con TODOS los ejes que
// produjeron el dataset (tile + particion completa). Un guard de "solo la
// primera vez" sirve datos cruzados al cambiar de seleccion.
export function stampScope({ tileId, partition } = {}) {
    const p = normalizePartition(partition, { strict: false });
    return Object.freeze({
        tileId: normalizeToken(tileId),
        preset: p.preset,
        farmId: p.farmId,
        cropId: p.cropId,
        cropIds: Array.isArray(p.cropIds) ? p.cropIds.slice().sort().join(',') : ''
    });
}

export function isScopeStale(scope, next) {
    const target = stampScope(next);
    if (!scope || typeof scope !== 'object') return true;
    return STAMP_KEYS.some((key) => String(scope[key] ?? '') !== String(target[key] ?? ''));
}

// Limite 3 (triple filtro): solo filas ledger originales. Las operacionales
// viven en ciclos (intocables aqui) y las derivadas (origin_table = cobro de
// fiado; split_from_id = parte de cobro parcial) las gobierna Clientes.
export function isLedgerRowEditable(row) {
    return Boolean(row)
        && row.origen === 'ledger'
        && Boolean(row.id)
        && !row.origin_table
        && !row.split_from_id;
}
