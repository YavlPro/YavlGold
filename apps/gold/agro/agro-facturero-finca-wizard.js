/**
 * Facturero de la Finca — Wizard de lectura y creación (gate + 2 ramas).
 * Ruta hash: #view=facturero-finca&subview=wizard&paso=N&rama=ver|crear
 * F5 restaura paso/rama (hash + respaldo localStorage).
 *
 * Decisiones de sesión del owner (2026-09-02, pendientes de canonización §4.5.2):
 * - SIN selector de cultivo en ningún paso: este facturero es exclusivo de finca.
 * - Tiles de lectura: Fiados · Pagados · Pérdidas · Donaciones · Gastos.
 * - Creación: NO incluye Fiado (su hogar es Facturero de Clientes); escribe en
 *   el mismo destino que el modal actual (agro_operational_cycles + primer
 *   agro_operational_movements, con rollback), cero tablas nuevas.
 * - Coexistencia: la superficie actual de agroOperationalCycles.js sigue viva;
 *   este módulo solo toma el root cuando subview=wizard (guards en aquel módulo).
 *
 * ADN V12: tokens, FA 6.5 con aria-hidden, sin glow, transiciones 120-220ms.
 * Ley defensiva de render (lección F4): toda salida asíncrona termina en un
 * estado terminal (ready|error) + render; guards nunca bloquean por estado inicial.
 */

import { supabase } from '../assets/js/config/supabase-config.js';
import { initExchangeRates, getRate, convertToUSD } from './agro-exchange.js';
import { assertOperationalPeriodOpen } from './agro-period-cycles.js';
import { renderSystemActionsListHtml } from './agro-facturero-clientes-view-wizard.js';
import { readMoneyValuesHidden } from './agro-privacy.js';

const ROOT_ID = 'agro-operational-root';
const FINCA_VIEWS = new Set(['facturero-finca', 'operational']);
const STORAGE_KEY = 'YG_AGRO_FINCA_WIZARD_STATE_V1';
const WIZARD_BODY_CLASS = 'agro-fcv-wizard-active';
const ACTIONS_WINDOW_HOURS = 24;
const LIST_LIMIT = 500;

const RAMA_VER = 'ver';
const RAMA_CREAR = 'crear';
const VER_TOTAL = 5;
const CREAR_TOTAL = 6;

// D-B (decision de sesion, pendiente §4.5.2): CREAR escribe al ledger por tipo.
// Trazado de columnas de categoria (2026-09-03): solo agro_expenses.category y
// agro_income.categoria tienen columna; pending/losses/transfers NO (sus
// registros caen en "Sin categoria"). agro_operational_movements no tiene
// categoria: la historica vive en agro_operational_cycles.category (join).
const TYPE_TO_TABLE = Object.freeze({
    expense: 'agro_expenses',
    income: 'agro_income',
    donation: 'agro_transfers',
    loss: 'agro_losses'
});
const TYPE_TO_TABLE_CATEGORY_FIELD = Object.freeze({
    expense: 'category',
    income: 'categoria'
});
// Union VER: movimientos operativos historicos mapeados por tipo del ciclo.
// Fiados no tiene union (cycles no admite economic_type 'pending').
const TILE_TO_OP_TYPE = Object.freeze({
    gastos: 'expense',
    ingresos: 'income',
    donaciones: 'donation',
    perdidas: 'loss'
});
const OP_CATEGORY_LABELS = Object.freeze({
    tools: 'Herramientas',
    maintenance: 'Mantenimiento',
    labor: 'Mano de obra',
    transport: 'Transporte',
    supplies: 'Insumos',
    other: 'Otro'
});

// Tiles de lectura (canon §4.5.2 / D2): Gastos · Ingresos · Fiados · Pérdidas · Donaciones.
// alias: agro_expenses usa date/concept/amount (los demas fecha/concepto/monto).
const VER_TILES = [
    {
        id: 'gastos', label: 'Gastos', icon: 'fa-solid fa-receipt',
        table: 'agro_expenses', who: '', orderCol: 'date',
        cols: 'id,concept,amount,category,currency,date,created_at',
        alias: { concepto: 'concept', monto: 'amount', fecha: 'date' },
        scope: null
    },
    {
        id: 'ingresos', label: 'Ingresos', icon: 'fa-solid fa-circle-check',
        table: 'agro_income', who: '', orderCol: 'fecha',
        cols: 'id,concepto,monto,monto_usd,categoria,currency,fecha,created_at',
        scope: (q) => q.is('reverted_at', null)
    },
    {
        id: 'fiados', label: 'Fiados', icon: 'fa-solid fa-handshake',
        table: 'agro_pending', who: 'cliente', orderCol: 'fecha',
        cols: 'id,cliente,concepto,monto,monto_usd,currency,fecha,created_at',
        scope: (q) => q.is('reverted_at', null).neq('transfer_state', 'transferred')
    },
    {
        id: 'perdidas', label: 'Pérdidas', icon: 'fa-solid fa-circle-xmark',
        table: 'agro_losses', who: 'causa', orderCol: 'fecha',
        cols: 'id,causa,concepto,monto,monto_usd,currency,fecha,created_at',
        scope: (q) => q.is('reverted_at', null)
    },
    {
        id: 'donaciones', label: 'Donaciones', icon: 'fa-solid fa-hand-holding-heart',
        table: 'agro_transfers', who: 'destino', orderCol: 'fecha',
        cols: 'id,destino,concepto,monto,monto_usd,currency,fecha,created_at',
        scope: null
    }
];

// Tipos de creación: mismo destino que el modal (economic_type de ciclos).
// Fiado excluido por diseño: los fiados se crean en Facturero de Clientes.
const CREAR_TYPES = [
    { id: 'expense', label: 'Gasto', icon: 'fa-solid fa-receipt', hint: 'Algo que pagas para la finca.' },
    { id: 'income', label: 'Ingreso', icon: 'fa-solid fa-hand-holding-dollar', hint: 'Dinero que entra a la finca.' },
    { id: 'donation', label: 'Donación', icon: 'fa-solid fa-gift', hint: 'Producción o dinero regalado.' },
    { id: 'loss', label: 'Pérdida', icon: 'fa-solid fa-circle-xmark', hint: 'Algo que se pierde y se cierra.' }
];

const CURRENCY_OPTIONS = [
    { value: 'COP', label: 'COP' },
    { value: 'USD', label: 'USD' },
    { value: 'VES', label: 'Bs (VES)' }
];

// D4: del exito de creacion a la lectura del MISMO tipo (misma finca, tile canonico).
const TYPE_TO_TILE = Object.freeze({
    expense: 'gastos',
    income: 'ingresos',
    donation: 'donaciones',
    loss: 'perdidas'
});

let activeSession = null;

export function initAgroFincaWizard() {
    window.addEventListener('agro:shell:view-changed', (event) => {
        const view = String(event?.detail?.view || '').trim().toLowerCase();
        const subview = String(event?.detail?.subview || '').trim().toLowerCase();
        if (FINCA_VIEWS.has(view) && subview === 'wizard') {
            mountWizard();
            return;
        }
        destroyWizard();
    });
    // F5 / entrada directa: el dispatch del shell puede llegar antes de que
    // este módulo esté importado; el hash manda.
    if (isWizardHashActive()) {
        mountWizard();
    }
}

function isWizardHashActive() {
    try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const view = String(hash.get('view') || '').trim().toLowerCase();
        const subview = String(hash.get('subview') || '').trim().toLowerCase();
        return FINCA_VIEWS.has(view) && subview === 'wizard';
    } catch (_err) {
        return false;
    }
}

function destroyWizard() {
    if (!activeSession) return;
    activeSession.destroy();
    activeSession = null;
}

function mountWizard() {
    if (activeSession) return;
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    activeSession = createSession(root);
}

function readWizardHash() {
    try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        return {
            paso: Number.parseInt(hash.get('paso') || '', 10) || null,
            rama: String(hash.get('rama') || '').trim().toLowerCase() === RAMA_CREAR ? RAMA_CREAR : RAMA_VER,
            finca: String(hash.get('finca') || '').trim(),
            cat: String(hash.get('cat') || '').trim()
        };
    } catch (_err) {
        return { paso: null, rama: RAMA_VER, finca: '', cat: '' };
    }
}

function readStoredState() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_err) {
        return null;
    }
}

function createSession(root) {
    let alive = true;
    const initial = readWizardHash();
    const stored = initial.paso ? null : readStoredState(); // respaldo si el shell pisó el hash
    const source = initial.paso ? initial : (stored || {});

    const state = {
        rama: source.rama === RAMA_CREAR ? RAMA_CREAR : RAMA_VER,
        paso: 1,
        farmId: String(source.finca || ''),
        tileId: 'gastos',
        tipoId: '',
        categoria: String(source.cat || source.categoria || ''),
        crearCategoria: String(source.cat || source.crearCategoria || ''),
        catScope: { phase: 'idle', values: [], error: '', requestId: 0 },
        concepto: '',
        monto: '',
        moneda: 'COP',
        fecha: todayLocalIso(),
        saving: false,
        created: false,
        listScope: { phase: 'loading', rows: [], error: '', requestId: 0 },
        actionsScope: { phase: 'idle', rows: [], error: '', requestId: 0 },
        exchangeRates: { USD: 1, COP: null, VES: null },
        created: source.created === true && source.rama === RAMA_CREAR && Number(source.paso) === CREAR_TOTAL
    };

    let exchangeReady = false;
    initExchangeRates()
        .then((rates) => {
            if (!alive) return;
            if (rates && typeof rates === 'object') state.exchangeRates = rates;
            exchangeReady = true;
            render();
        })
        .catch(() => {});

    function clampPaso(paso) {
        const max = state.rama === RAMA_CREAR ? CREAR_TOTAL : VER_TOTAL;
        return Math.min(Math.max(Number(paso) || 1, 1), max);
    }

    // Re-clamp inicial: la rama restaurada define el tope de pasos.
    state.paso = clampPaso(Number(source.paso) || 1);

    function totalPasos() {
        return state.rama === RAMA_CREAR ? CREAR_TOTAL : VER_TOTAL;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function todayLocalIso() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function getFarms() {
        if (typeof window !== 'object' || typeof window._agroFarms?.getFarms !== 'function') return [];
        return Array.isArray(window._agroFarms.getFarms()) ? window._agroFarms.getFarms() : [];
    }

    function farmLabel() {
        if (!state.farmId) return 'Vista general';
        const farm = getFarms().find((entry) => String(entry?.id || '') === state.farmId);
        return String(farm?.name || 'Finca').trim();
    }

    function syncHash() {
        try {
            const params = new URLSearchParams();
            params.set('view', 'facturero-finca');
            params.set('subview', 'wizard');
            params.set('paso', String(state.paso));
            params.set('rama', state.rama);
            if (state.farmId) params.set('finca', state.farmId);
            // D-C: la categoria restaura con F5 (hash + storage).
            const categoriaValue = state.rama === RAMA_CREAR ? state.crearCategoria : state.categoria;
            if (categoriaValue) params.set('cat', categoriaValue);
            const url = new URL(window.location.href);
            url.hash = `#${params.toString()}`;
            history.replaceState(null, '', url);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                rama: state.rama, paso: state.paso, finca: state.farmId,
                categoria: state.categoria,
                crearCategoria: state.crearCategoria,
                // created evita que un F5 en la pantalla de exito re-ofrezca
                // confirmar el mismo registro dos veces.
                created: state.created
            }));
        } catch (_err) {
            // Ignorar fallos de routing.
        }
    }

    function subtitle() {
        if (state.paso <= 1) return '';
        return state.rama === RAMA_CREAR
            ? 'Creación de registro de la finca'
            : 'Ver registros de la finca';
    }

    function goStep(nextPaso, nextRama) {
        if (nextRama) state.rama = nextRama;
        state.paso = clampPaso(nextPaso);
        render();
        // D-C + B7: al entrar al Paso 4+ de VER se cargan (o recargan si el
        // tile o la finca cambiaron desde la ultima carga) los registros.
        if (state.rama === RAMA_VER && state.paso >= 4 && tileRowsStale()) {
            void fetchTileRows();
        }
        // D-C: vocabulario real de categorías para el tipo elegido en CREAR.
        if (state.rama === RAMA_CREAR && state.paso === 4
            && (state.catScope.phase === 'idle' || state.catScope.tipo !== state.tipoId)) {
            void fetchCrearCategorias();
        }
    }

    function goNext() {
        if (state.rama === RAMA_CREAR && state.paso === 5 && !formValid()) {
            showStepError('Completa concepto, monto y fecha para continuar.');
            return;
        }
        if (state.paso >= totalPasos()) return;
        goStep(state.paso + 1);
    }

    function goBack() {
        if (state.paso > 1) {
            goStep(state.paso - 1);
            return;
        }
        exitToSurface();
    }

    // D-A: la topbar regresa al GATE (paso 1, pagina principal crear/ver)
    // desde cualquier paso >= 2; solo desde el gate sale al hub Granja.
    function exitToSurface() {
        if (state.paso > 1) {
            goStep(1);
            return;
        }
        destroyWizard();
        window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
            detail: { view: 'granja', scroll: true }
        }));
        try {
            const url = new URL(window.location.href);
            url.hash = '#view=granja';
            history.replaceState(null, '', url);
        } catch (_err) {
            // Ignorar fallos de routing.
        }
    }

    function showStepError(message) {
        let node = root.querySelector('[data-fcwz-error]');
        if (!node) {
            node = document.createElement('div');
            node.setAttribute('data-fcwz-error', '');
            root.querySelector('.fcwz__body')?.prepend(node);
        }
        node.innerHTML = `
            <div class="fcflow-note fcflow-note--warning">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <span>${escapeHtml(message)}</span>
            </div>`;
    }

    function renderMoneyNode(value) {
        const safeValue = String(value ?? '').trim() || '$0.00';
        return `<strong data-money="1" data-raw-money="${escapeHtml(safeValue)}">${escapeHtml(safeValue)}</strong>`;
    }

    function formatMoney(row) {
        const amount = Number(row?.monto);
        if (!Number.isFinite(amount)) return '—';
        const currency = String(row?.currency || 'USD').trim().toUpperCase();
        const symbols = { USD: '$', COP: 'COL$', VES: 'Bs' };
        const symbol = symbols[currency] || '';
        return `${symbol}${amount.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }

    // ---------- Datos: lectura por tile (ledger crudo, farm scope) ----------

    // B7 (ANEXO 7, hipotesis (g)): el fetch solo corria la primera vez
    // (phase loading + requestId 0), asi que al cambiar de tile o de finca el
    // Paso 5 re-renderizaba las filas cacheadas del tile anterior — un gasto
    // quedaba servido bajo Ingresos. Solucion: el scope se estampa con el
    // tile+finca que cargó; cualquier desvio fuerza refetch.
    function tileRowsStale() {
        const scope = state.listScope;
        if (scope.phase === 'loading' && scope.requestId === 0) return true;
        return scope.tileId !== state.tileId || scope.farmId !== (state.farmId || '');
    }

    async function fetchTileRows() {
        const scope = state.listScope;
        const tile = VER_TILES.find((entry) => entry.id === state.tileId) || VER_TILES[0];
        const requestId = ++scope.requestId;
        scope.phase = 'loading';
        scope.error = '';
        scope.tileId = tile.id;
        scope.farmId = state.farmId || '';
        render();

        try {
            // (1) Ledger crudo (fuente nueva de CREAR desde D-B).
            // Q1 (ANEXO 6): partición estricta del wizard — solo Movimientos
            // Generales de finca (crop_id null). El agregado de finca completa
            // (incluidos cultivos) vive en Períodos, no aquí.
            let query = supabase
                .from(tile.table)
                .select(tile.cols)
                .is('deleted_at', null)
                .is('crop_id', null)
                .order(tile.orderCol || 'fecha', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(LIST_LIMIT);
            if (tile.scope) query = tile.scope(query);
            if (state.farmId) query = query.eq('farm_id', state.farmId);
            const ledgerResult = await query;
            if (ledgerResult.error) throw ledgerResult.error;

            const alias = tile.alias || {};
            const categoryField = tile.id === 'gastos' ? 'category' : (tile.id === 'ingresos' ? 'categoria' : '');
            const ledgerRows = (Array.isArray(ledgerResult.data) ? ledgerResult.data : []).map((row) => ({
                ...row,
                origen: 'ledger',
                fecha: row?.[alias.fecha || 'fecha'],
                concepto: row?.[alias.concepto || 'concepto'],
                monto: row?.[alias.monto || 'monto'],
                categoria: categoryField ? String(row?.[categoryField] || '').trim() : ''
            }));

            // (2) Union D-B: movimientos operativos historicos del tipo mapeado.
            // La categoria historica vive en agro_operational_cycles (join logico).
            // Q1/Q5: solo Movimientos Generales (ciclo sin cultivo), congelados
            // para lectura; backfill de particiones, despues.
            const opType = TILE_TO_OP_TYPE[tile.id];
            let opRows = [];
            if (opType) {
                const [cyclesResult, movementsResult] = await Promise.all([
                    supabase.from('agro_operational_cycles')
                        .select('id,economic_type,category,crop_id')
                        .eq('economic_type', opType)
                        .limit(2000),
                    (() => {
                        let q = supabase.from('agro_operational_movements')
                            .select('id,cycle_id,amount,currency,amount_usd,concept,movement_date,created_at,farm_id')
                            .limit(3000);
                        if (state.farmId) q = q.eq('farm_id', state.farmId);
                        return q;
                    })()
                ]);
                if (cyclesResult.error) throw cyclesResult.error;
                if (movementsResult.error) throw movementsResult.error;
                const cycleById = new Map(
                    (cyclesResult.data || [])
                        .filter((cycle) => !String(cycle?.crop_id || '').trim())
                        .map((cycle) => [String(cycle.id), cycle])
                );
                opRows = (movementsResult.data || [])
                    .filter((row) => cycleById.has(String(row.cycle_id)))
                    .map((row) => ({
                        ...row,
                        origen: 'operacional',
                        fecha: row?.movement_date,
                        concepto: row?.concept,
                        monto: row?.amount,
                        categoria: String(cycleById.get(String(row.cycle_id))?.category || '').trim()
                    }));
            }

            // (3) Sin duplicados: ledger prima ante coincidencia exacta
            // (fecha + monto + concepto) dentro del mismo tile y finca.
            const seenKeys = new Set(ledgerRows.map((row) =>
                `${String(row.fecha || '')}|${Number(row.monto) || 0}|${String(row.concepto || '').trim().toLowerCase()}`
            ));
            const dedupedOp = opRows.filter((row) => {
                const key = `${String(row.fecha || '')}|${Number(row.monto) || 0}|${String(row.concepto || '').trim().toLowerCase()}`;
                if (seenKeys.has(key)) return false;
                seenKeys.add(key);
                return true;
            });

            if (requestId !== scope.requestId || !alive) return;
            scope.rows = [...ledgerRows, ...dedupedOp].sort((a, b) => {
                const fa = String(a.fecha || '');
                const fb = String(b.fecha || '');
                return fb.localeCompare(fa);
            });
            scope.phase = 'ready';
        } catch (err) {
            if (requestId !== scope.requestId || !alive) return;
            console.error('[FincaWizard] tile load failed:', err?.message || err);
            scope.rows = [];
            scope.error = String(err?.message || 'No se pudo leer los registros.');
            scope.phase = 'error';
        } finally {
            if (requestId === scope.requestId && alive) render();
        }
    }

    // D-C: vocabulario de categorias REALES para la rama CREAR, segun el tipo
    // (solo agro_expenses/agro_income tienen columna; los demas tipos no).
    async function fetchCrearCategorias() {
        const scope = state.catScope;
        const tipoId = state.tipoId;
        const field = TYPE_TO_TABLE_CATEGORY_FIELD[tipoId];
        if (scope.loading || (scope.phase === 'ready' && scope.tipo === tipoId)) return;

        if (!field) {
            scope.values = [];
            scope.error = '';
            scope.phase = 'ready';
            scope.tipo = tipoId;
            render();
            return;
        }

        const requestId = ++scope.requestId;
        scope.phase = 'loading';
        scope.error = '';
        render();

        try {
            const { data, error } = await supabase
                .from(TYPE_TO_TABLE[tipoId])
                .select(field)
                .is('deleted_at', null)
                .limit(1000);
            if (error) throw error;
            if (requestId !== scope.requestId || !alive) return;
            const values = Array.from(new Set(
                (Array.isArray(data) ? data : [])
                    .map((row) => String(row?.[field] || '').trim())
                    .filter(Boolean)
            )).sort((a, b) => a.localeCompare(b, 'es'));
            scope.values = values;
            scope.phase = 'ready';
            scope.tipo = tipoId;
        } catch (err) {
            if (requestId !== scope.requestId || !alive) return;
            console.error('[FincaWizard] categorias load failed:', err?.message || err);
            scope.values = [];
            scope.error = String(err?.message || 'No se pudieron leer las categorías.');
            scope.phase = 'error';
        } finally {
            if (requestId === scope.requestId && alive) render();
        }
    }

    function movementText(row, tile) {
        const who = String(row?.[tile.who] || '').trim();
        const concepto = String(row?.concepto || '').trim() || 'Sin concepto';
        return who ? `${concepto} — ${who}` : concepto;
    }

    // ---------- Datos: acciones del sistema (24 h, farm scope) ----------

    function withinWindow(timestamp, sinceMs) {
        const ts = Date.parse(String(timestamp || ''));
        return Number.isFinite(ts) && ts >= sinceMs;
    }

    function relativeTime(ts) {
        const minutes = Math.max(0, Math.round((Date.now() - ts) / 60000));
        if (minutes < 1) return 'hace un momento';
        if (minutes < 60) return `hace ${minutes} min`;
        return `hace ${Math.max(1, Math.floor(minutes / 60))} h`;
    }

    async function fetchActions() {
        const scope = state.actionsScope;
        const requestId = ++scope.requestId;
        scope.phase = 'loading';
        scope.error = '';
        render();

        try {
            const sinceMs = Date.now() - ACTIONS_WINDOW_HOURS * 3600 * 1000;
            const sinceIso = new Date(sinceMs).toISOString();
            const farmEq = (q) => (state.farmId ? q.eq('farm_id', state.farmId) : q);
            const [pending, income, losses, transfers, expenses] = await Promise.all([
                farmEq(supabase.from('agro_pending').select('id,cliente,concepto,transfer_state,transferred_at,transferred_to,reverted_at,created_at').is('deleted_at', null)
                    .or(`transferred_at.gte.${sinceIso},reverted_at.gte.${sinceIso},created_at.gte.${sinceIso}`)),
                farmEq(supabase.from('agro_income').select('id,concepto,reverted_at,created_at').is('deleted_at', null)
                    .or(`reverted_at.gte.${sinceIso},created_at.gte.${sinceIso}`)),
                farmEq(supabase.from('agro_losses').select('id,causa,concepto,reverted_at,created_at').is('deleted_at', null)
                    .or(`reverted_at.gte.${sinceIso},created_at.gte.${sinceIso}`)),
                farmEq(supabase.from('agro_transfers').select('id,destino,concepto,created_at').is('deleted_at', null)
                    .gte('created_at', sinceIso)),
                farmEq(supabase.from('agro_expenses').select('id,concepto,created_at').is('deleted_at', null)
                    .gte('created_at', sinceIso))
            ]);
            [pending, income, losses, transfers, expenses].forEach((result) => {
                if (result?.error) throw result.error;
            });
            if (requestId !== scope.requestId || !alive) return;

            const entries = [];
            const push = (kind, ts, text) => entries.push({ kind, ts: Date.parse(ts), text });

            (pending.data || []).forEach((row) => {
                const quien = String(row?.cliente || '').trim() || 'un cliente';
                if (withinWindow(row?.transferred_at, sinceMs)) {
                    const target = String(row?.transferred_to || '').toLowerCase();
                    const destino = target === 'income' ? 'Pagado' : (target === 'losses' ? 'Pérdida' : 'fuera de la cartera');
                    push('transfer', row.transferred_at, `El fiado de ${quien} pasó a ${destino}`);
                }
                if (withinWindow(row?.reverted_at, sinceMs)) push('revert', row.reverted_at, `Un fiado de ${quien} fue revertido`);
                if (!row?.transferred_at && !row?.reverted_at) push('new', row.created_at, `Fiado registrado a ${quien}`);
            });
            (income.data || []).forEach((row) => {
                if (withinWindow(row?.reverted_at, sinceMs)) push('revert', row.reverted_at, 'Un ingreso volvió a fiado');
                else push('new', row.created_at, 'Ingreso registrado en la finca');
            });
            (losses.data || []).forEach((row) => {
                const causa = String(row?.causa || '').trim();
                if (withinWindow(row?.reverted_at, sinceMs)) push('revert', row.reverted_at, `La pérdida${causa ? ` de ${causa}` : ''} volvió a fiado`);
                else push('new', row.created_at, 'Pérdida registrada en la finca');
            });
            (transfers.data || []).forEach((row) => {
                const quien = String(row?.destino || '').trim() || 'beneficiario';
                push('new', row.created_at, `Donación registrada para ${quien}`);
            });
            (expenses.data || []).forEach((row) => {
                push('new', row.created_at, 'Gasto registrado en la finca');
            });

            scope.rows = entries.filter((entry) => Number.isFinite(entry.ts)).sort((a, b) => b.ts - a.ts);
            scope.phase = 'ready';
        } catch (err) {
            if (requestId !== scope.requestId || !alive) return;
            console.error('[FincaWizard] actions load failed:', err?.message || err);
            scope.rows = [];
            scope.error = String(err?.message || 'No se pudo leer las acciones del sistema.');
            scope.phase = 'error';
        } finally {
            if (requestId === scope.requestId && alive) render();
        }
    }

    // ---------- Export MD (respeta privacidad de montos) ----------

    function privacyMoney(value) {
        if (readMoneyValuesHidden()) return '$ ···';
        return String(value ?? '—');
    }

    function exportTileMarkdown() {
        const tile = VER_TILES.find((entry) => entry.id === state.tileId) || VER_TILES[0];
        const rows = state.listScope.rows;
        const lines = [
            `# Facturero de la Finca — ${tile.label}`,
            '',
            `- Fecha de exportación: ${new Date().toLocaleString('es-VE')}`,
            `- Alcance: ${farmLabel()}`,
            `- Registros visibles: ${rows.length}`,
            '',
            '| Fecha | Registro | Monto |',
            '|-------|----------|------:|'
        ];
        rows.forEach((row) => {
            const fecha = String(row?.fecha || '').slice(0, 10) || 'Sin fecha';
            lines.push(`| ${fecha} | ${escapeHtml(movementText(row, tile)).replace(/\|/g, '·')} | ${privacyMoney(formatMoney(row))} |`);
        });
        lines.push('', '---', 'Generado por YavlGold Agro · Facturero de la Finca');

        const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `facturero-finca-${tile.id}-${todayLocalIso()}.md`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    // ---------- Creación: mismo destino que el modal (ciclo + movimiento) ----------

    function formValid() {
        return Boolean(
            state.concepto.trim()
            && Number(state.monto) > 0
            && /^\d{4}-\d{2}-\d{2}$/.test(state.fecha)
        );
    }

    function effectiveRate() {
        if (state.moneda === 'USD') return 1;
        return getRate(state.moneda, state.exchangeRates) || 0;
    }

    async function confirmCreate() {
        if (state.saving) return;
        if (!formValid()) {
            showStepError('Completa concepto, monto y fecha antes de confirmar.');
            return;
        }
        state.saving = true;
        render();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Sesión expirada.');

            const tipo = CREAR_TYPES.find((entry) => entry.id === state.tipoId);
            const economicType = tipo?.id || 'expense';
            await assertOperationalPeriodOpen({ movementDate: state.fecha, userId: user.id });

            const amount = Number(state.monto);
            const rate = effectiveRate();
            const amountUsd = state.moneda === 'USD' ? amount : (rate > 0 ? convertToUSD(amount, state.moneda, rate) : null);
            const safeCategoria = state.crearCategoria ? String(state.crearCategoria).trim() : '';

            // D-B (decision de sesion): CREAR escribe directo al ledger por tipo.
            // farm_id set, crop_id null (facturero de finca puro), deleted_at null.
            // Insert unico por tabla: sin ciclo que requiera rollback.
            const table = TYPE_TO_TABLE[economicType] || 'agro_expenses';
            const payload = {
                user_id: user.id,
                farm_id: state.farmId || null,
                crop_id: null,
                fecha: state.fecha,
                concepto: state.concepto.trim(),
                monto: amount,
                currency: state.moneda,
                exchange_rate: state.moneda === 'USD' ? 1 : rate,
                monto_usd: amountUsd
            };
            // Columnas con nombre propio por tabla (trazado 2026-09-03):
            // agro_expenses usa date/concept/amount y category; agro_income usa
            // fecha/concepto/monto y categoria; transfers/losses sin categoria.
            if (economicType === 'expense') {
                delete payload.fecha;
                delete payload.concepto;
                delete payload.monto;
                payload.date = state.fecha;
                payload.concept = state.concepto.trim();
                payload.amount = amount;
                payload.category = safeCategoria || 'general';
            } else if (economicType === 'income') {
                payload.categoria = safeCategoria || 'general';
            }

            const { error: insertError } = await supabase.from(table).insert(payload);
            if (insertError) throw insertError;

            // Refresh de las superficies que escuchan estos eventos (como flow.js).
            const eventByTipo = {
                expense: 'data-refresh',
                income: 'agro:income:changed',
                donation: 'agro:transfers:refreshed',
                loss: 'agro:losses:changed'
            };
            document.dispatchEvent(new CustomEvent(eventByTipo[economicType] || 'data-refresh'));

            state.created = true;
            render();
        } catch (err) {
            console.error('[FincaWizard] create failed:', err?.message || err);
            showStepError(err?.message || 'No se pudo guardar el registro.');
        } finally {
            state.saving = false;
            render();
        }
    }

    function resetCreateFlow() {
        state.tipoId = '';
        state.concepto = '';
        state.monto = '';
        state.moneda = 'COP';
        state.fecha = todayLocalIso();
        state.crearCategoria = '';
        state.created = false;
    }

    // ---------- Render ----------

    function renderGate() {
        return `
            <div class="fcflow-doors">
                <button type="button" class="fcflow-door" data-fcwz-rama="${RAMA_CREAR}">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i>
                    <span class="fcflow-door__title">Crear registro</span>
                    <span class="fcflow-door__desc">Registra un movimiento de la finca, paso a paso.</span>
                </button>
                <button type="button" class="fcflow-door" data-fcwz-rama="${RAMA_VER}">
                    <i class="fa-solid fa-list-check" aria-hidden="true"></i>
                    <span class="fcflow-door__title">Ver registros</span>
                    <span class="fcflow-door__desc">Explora los registros de la finca por tipo.</span>
                </button>
            </div>
            <button type="button" class="fcvw-syslink" data-agro-view="period-cycles">
                <i class="fa-solid fa-calendar-days" aria-hidden="true"></i>
                Ver períodos
            </button>
        `;
    }

    function renderFarmPicker() {
        const farms = getFarms();
        const chips = [
            `<button type="button" class="fcvw-chip${!state.farmId ? ' is-active' : ''}" data-fcwz-farm="">Vista general</button>`,
            ...farms.map((farm) => {
                const id = String(farm?.id || '').trim();
                if (!id) return '';
                return `<button type="button" class="fcvw-chip${state.farmId === id ? ' is-active' : ''}" data-fcwz-farm="${escapeHtml(id)}">${escapeHtml(String(farm?.name || 'Finca').trim())}</button>`;
            })
        ].join('');
        return `
            <div class="fcvw-picker">
                <span class="fcvw-picker__label">Finca</span>
                <div class="fcvw-picker__strip" role="group" aria-label="Contexto de finca">${chips}</div>
                <p class="fcvw-note">Este facturero lee los movimientos generales de la finca (sin cultivo). Los ligados a un cultivo se leen en el Facturero del Cultivo; Períodos agrega la finca completa por fecha.</p>
            </div>
        `;
    }

    function renderVerTiles() {
        return `
            <div class="fcvw-tiles fcvw-tiles--square">
                ${VER_TILES.map((tile) => `
                    <button type="button" class="fcvw-tile${state.tileId === tile.id ? ' is-active' : ''}" data-fcwz-tile="${tile.id}" aria-pressed="${state.tileId === tile.id ? 'true' : 'false'}">
                        <i class="${tile.icon}" aria-hidden="true"></i>
                        <span class="fcvw-tile__label">${escapeHtml(tile.label)}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    function categoryLabel(value) {
        const safeValue = String(value || '').trim();
        if (!safeValue) return 'Sin categoría';
        return OP_CATEGORY_LABELS[safeValue] || safeValue;
    }

    // D-C (VER, Paso 4): chips con el vocabulario REAL de categorias presentes
    // en los registros del tile y finca elegidos + "Todas" + "Sin categoria".
    function renderVerCategoria() {
        const scope = state.listScope;
        if (scope.phase === 'loading') {
            return '<p class="fcvw-note">Revisando las categorías reales de estos registros…</p>';
        }
        if (scope.phase === 'error') {
            return `
                <div class="cartera-viva-empty">
                    <h3 class="cartera-viva-empty__title">No se pudieron leer las categorías</h3>
                    <p class="cartera-viva-empty__copy">${escapeHtml(scope.error)}</p>
                    <button type="button" class="fcvw-btn" data-fcwz-retry-list><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
                </div>
            `;
        }

        const categorias = Array.from(new Set(
            scope.rows.map((row) => String(row?.categoria || '').trim()).filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, 'es'));
        const sinCategoria = scope.rows.some((row) => !String(row?.categoria || '').trim());
        // Tiles cuya tabla no tiene columna de categoria (trazado ANEXO 6/7:
        // pending/losses/transfers): nota honesta en vez de vocabulario inventado.
        const notaTileSinCategoria = ['fiados', 'perdidas', 'donaciones'].includes(state.tileId)
            ? 'Este tipo de registro todavía no lleva categorías: usa "Todas" para verlo completo.'
            : 'Las categorías salen de tus registros reales. Los registros sin categoría viven en "Sin categoría".';

        const chips = [
            `<button type="button" class="fcvw-chip${!state.categoria ? ' is-active' : ''}" data-fcwz-cat="">Todas</button>`,
            ...categorias.map((value) => `
                <button type="button" class="fcvw-chip${state.categoria === value ? ' is-active' : ''}" data-fcwz-cat="${escapeHtml(value)}">${escapeHtml(categoryLabel(value))}</button>
            `),
            ...(sinCategoria ? [`<button type="button" class="fcvw-chip${state.categoria === '__sin__' ? ' is-active' : ''}" data-fcwz-cat="__sin__">Sin categoría</button>`] : [])
        ].join('');

        return `
            <div class="fcvw-picker">
                <span class="fcvw-picker__label">Categoría</span>
                <div class="fcvw-picker__strip" role="group" aria-label="Filtrar por categoría">${chips}</div>
                <p class="fcvw-note">${escapeHtml(notaTileSinCategoria)}</p>
            </div>
        `;
    }

    // D-C (CREAR, Paso 4): vocabulario REAL de la tabla destino del tipo elegido.
    // pending/losses/transfers no tienen columna: solo "Sin categoría" + nota.
    function renderCrearCategoria() {
        const field = TYPE_TO_TABLE_CATEGORY_FIELD[state.tipoId];
        const scope = state.catScope;

        if (!field) {
            return `
                <div class="fcvw-picker">
                    <span class="fcvw-picker__label">Categoría</span>
                    <div class="fcvw-picker__strip" role="group" aria-label="Categoría">
                        <button type="button" class="fcvw-chip is-active">Sin categoría</button>
                    </div>
                    <p class="fcvw-note">Este tipo de registro todavía no maneja categorías. Continúa con Siguiente.</p>
                </div>
            `;
        }
        if (scope.phase === 'loading' || (scope.phase !== 'ready' && scope.phase !== 'error')) {
            return '<p class="fcvw-note">Revisando las categorías que ya usas en este tipo de registro…</p>';
        }
        if (scope.phase === 'error') {
            return `
                <div class="cartera-viva-empty">
                    <h3 class="cartera-viva-empty__title">No se pudieron leer las categorías</h3>
                    <p class="cartera-viva-empty__copy">${escapeHtml(scope.error)}</p>
                    <button type="button" class="fcvw-btn" data-fcwz-retry-cats><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
                </div>
            `;
        }

        const chips = [
            ...scope.values.map((value) => `
                <button type="button" class="fcvw-chip${state.crearCategoria === value ? ' is-active' : ''}" data-fcwz-crear-cat="${escapeHtml(value)}">${escapeHtml(categoryLabel(value))}</button>
            `),
            `<button type="button" class="fcvw-chip${!state.crearCategoria ? ' is-active' : ''}" data-fcwz-crear-cat="">Sin categoría</button>`
        ].join('');

        return `
            <div class="fcvw-picker">
                <span class="fcvw-picker__label">Categoría</span>
                <div class="fcvw-picker__strip" role="group" aria-label="Categoría del registro">${chips}</div>
                <p class="fcvw-note">Salen de las categorías que ya usas. "Sin categoría" deja el valor general del registro.</p>
            </div>
        `;
    }

    function filteredTileRows() {
        const rows = state.listScope.rows;
        if (!state.categoria) return rows;
        if (state.categoria === '__sin__') {
            return rows.filter((row) => !String(row?.categoria || '').trim());
        }
        return rows.filter((row) => String(row?.categoria || '').trim() === state.categoria);
    }

    function renderVerListBody() {
        const scope = state.listScope;
        const tile = VER_TILES.find((entry) => entry.id === state.tileId) || VER_TILES[0];
        const rows = filteredTileRows();

        if (scope.phase === 'loading') {
            return `
                <div class="cartera-viva-empty cartera-viva-empty--loading">
                    <div class="cartera-viva-loading-dot" aria-hidden="true"></div>
                    <h3 class="cartera-viva-empty__title">Cargando registros</h3>
                    <p class="cartera-viva-empty__copy">Buscando ${tile.label.toLowerCase()} de ${escapeHtml(farmLabel())}.</p>
                </div>
            `;
        }
        if (scope.phase === 'error') {
            return `
                <div class="cartera-viva-empty">
                    <h3 class="cartera-viva-empty__title">No se pudo leer los registros</h3>
                    <p class="cartera-viva-empty__copy">${escapeHtml(scope.error)}</p>
                    <button type="button" class="fcvw-btn" data-fcwz-retry-list><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
                </div>
            `;
        }
        if (rows.length <= 0 && scope.rows.length > 0) {
            return `
                <div class="cartera-viva-empty">
                    <h3 class="cartera-viva-empty__title">Sin registros en esta categoría</h3>
                    <p class="cartera-viva-empty__copy">Vuelve atrás y elige "Todas" para ver los ${tile.label.toLowerCase()} completos.</p>
                </div>
            `;
        }
        if (scope.rows.length <= 0) {
            return `
                <div class="cartera-viva-empty">
                    <h3 class="cartera-viva-empty__title">Sin ${tile.label.toLowerCase()} en ${escapeHtml(farmLabel())}</h3>
                    <p class="cartera-viva-empty__copy">Cuando registres ${tile.label.toLowerCase()} de esta finca, aparecerán aquí.</p>
                </div>
            `;
        }
        return `
            <ul class="fcwz-movements">
                ${rows.map((row) => `
                    <li class="fcwz-movements__item">
                        <span class="fcwz-movements__date">${escapeHtml(String(row?.fecha || '').slice(0, 10) || 'Sin fecha')}</span>
                        <span class="fcwz-movements__text">${escapeHtml(movementText(row, tile))}${row?.categoria ? ` <span class="fcwz-movements__tag">${escapeHtml(categoryLabel(row.categoria))}</span>` : ''}</span>
                        <span class="fcwz-movements__amount">${renderMoneyNode(formatMoney(row))}</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    function renderVerStep5() {
        const tile = VER_TILES.find((entry) => entry.id === state.tileId) || VER_TILES[0];
        const actions = state.actionsScope;
        const catPart = state.categoria ? ` · ${escapeHtml(categoryLabel(state.categoria === '__sin__' ? '' : state.categoria))}` : '';
        let actionsHtml = '';
        if (actions.phase === 'loading') {
            actionsHtml = '<p class="fcvw-note">Buscando acciones de las últimas 24 horas…</p>';
        } else if (actions.phase === 'error') {
            actionsHtml = `
                <p class="fcvw-note">${escapeHtml(actions.error)}</p>
                <button type="button" class="fcvw-btn" data-fcwz-retry-actions>Reintentar acciones</button>
            `;
        } else if (actions.phase === 'ready') {
            actionsHtml = actions.rows.length > 0
                ? renderSystemActionsListHtml(actions.rows.map((entry) => ({
                    kind: entry.kind,
                    text: entry.text,
                    timeLabel: relativeTime(entry.ts)
                })))
                : '<p class="fcvw-note">Sin acciones del sistema en las últimas 24 horas.</p>';
        }

        return `
            <p class="fcvw-clients__context">${escapeHtml(tile.label)} · ${escapeHtml(farmLabel())}${catPart}</p>
            <div class="agro-privacy-strip" aria-label="Privacidad">
                <span class="agro-privacy-strip__label">Privacidad</span>
                <button type="button" class="btn-privacy-toggle" data-money-privacy-control="toggle" aria-pressed="false">Ocultar montos</button>
            </div>
            ${renderVerListBody()}
            <div class="fcvw-clients__bar">
                <button type="button" class="fcvw-btn fcvw-btn--gold" data-fcwz-export>
                    <i class="fa-solid fa-file-export" aria-hidden="true"></i>
                    Exportar
                </button>
                <button type="button" class="fcvw-btn" data-fcwz-refresh-list>
                    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    Actualizar
                </button>
            </div>
            <details class="fcwz-actions">
                <summary class="fcvw-syslink">
                    <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
                    Acciones del sistema (24 h)
                </summary>
                <div class="fcwz-actions__body">${actionsHtml}</div>
            </details>
        `;
    }

    function renderCrearTypes() {
        return `
            <div class="fcvw-tiles fcvw-tiles--choice">
                ${CREAR_TYPES.map((tipo) => `
                    <button type="button" class="fcvw-choice${state.tipoId === tipo.id ? ' is-selected' : ''}" data-fcwz-tipo="${tipo.id}">
                        <i class="${tipo.icon}" aria-hidden="true"></i>
                        <span class="fcvw-choice__body">
                            <span class="fcvw-choice__label">${escapeHtml(tipo.label)}</span>
                            <span class="fcvw-choice__hint">${escapeHtml(tipo.hint)}</span>
                        </span>
                    </button>
                `).join('')}
            </div>
            <p class="fcvw-note">Los fiados se registran desde Facturero de Clientes, porque llevan cliente.</p>
        `;
    }

    function renderCrearForm() {
        const rate = effectiveRate();
        const rateBlock = state.moneda !== 'USD'
            ? `<p class="fcvw-note">Tasa ${state.moneda}/USD de mercado (solo lectura): ${rate > 0 ? escapeHtml(String(rate)) : 'sin tasa disponible ahora'}.</p>`
            : '';
        return `
            <div class="fcflow-field">
                <label class="fcflow-label" for="fcwz-concepto">Concepto *</label>
                <input class="fcflow-input" type="text" id="fcwz-concepto" value="${escapeHtml(state.concepto)}" placeholder="Ej: Bomba de riego" autocomplete="off">
            </div>
            <div class="fcflow-field">
                <span class="fcflow-label">Moneda</span>
                <div class="fcvw-tiles fcvw-tiles--choice">
                    ${CURRENCY_OPTIONS.map((option) => `
                        <button type="button" class="fcvw-choice${state.moneda === option.value ? ' is-selected' : ''}" data-fcwz-moneda="${option.value}">
                            <i class="fa-solid fa-coins" aria-hidden="true"></i>
                            <span class="fcvw-choice__body"><span class="fcvw-choice__label">${escapeHtml(option.label)}</span></span>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="fcflow-field">
                <label class="fcflow-label" for="fcwz-monto">Monto *</label>
                <input class="fcflow-input" type="number" id="fcwz-monto" min="0.01" step="0.01" inputmode="decimal" value="${escapeHtml(state.monto)}" placeholder="0.00">
            </div>
            <div class="fcflow-field">
                <label class="fcflow-label" for="fcwz-fecha">Fecha *</label>
                <input class="fcflow-input" type="date" id="fcwz-fecha" max="${todayLocalIso()}" value="${escapeHtml(state.fecha)}">
            </div>
            ${rateBlock}
        `;
    }

    function renderCrearReview() {
        const tipo = CREAR_TYPES.find((entry) => entry.id === state.tipoId);
        const rate = effectiveRate();
        const amount = Number(state.monto) || 0;
        const usd = state.moneda === 'USD' ? amount : (rate > 0 ? convertToUSD(amount, state.moneda, rate) : null);
        return `
            <dl class="fcflow-summary">
                <div class="fcflow-summary__row"><dt>Tipo</dt><dd>${escapeHtml(tipo?.label || '—')}</dd></div>
                <div class="fcflow-summary__row"><dt>Finca</dt><dd>${escapeHtml(farmLabel())}</dd></div>
                <div class="fcflow-summary__row"><dt>Categoría</dt><dd>${escapeHtml(state.crearCategoria ? categoryLabel(state.crearCategoria) : 'Sin categoría')}</dd></div>
                <div class="fcflow-summary__row"><dt>Concepto</dt><dd>${escapeHtml(state.concepto || '—')}</dd></div>
                <div class="fcflow-summary__row"><dt>Monto</dt><dd><strong>${escapeHtml(formatMoney({ monto: amount, currency: state.moneda }))}</strong></dd></div>
                ${state.moneda !== 'USD' ? `<div class="fcflow-summary__row"><dt>≈ USD</dt><dd>${usd != null ? `$${usd.toFixed(2)}` : 'sin tasa'}</dd></div>` : ''}
                <div class="fcflow-summary__row"><dt>Fecha</dt><dd>${escapeHtml(state.fecha)}</dd></div>
            </dl>
            <p class="fcvw-note">Movimiento general de la finca, sin cultivo asociado.</p>
        `;
    }

    function renderCrearDone() {
        return `
            <div class="fcflow-done">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                <p class="fcflow-done__title">Registro guardado.</p>
                <p class="fcflow-done__desc">${escapeHtml(state.concepto)} · ${escapeHtml(farmLabel())}</p>
                <div class="fcflow-done__actions">
                    <button type="button" class="btn-gold" data-fcwz-goto-ver">Ver registros</button>
                    <button type="button" class="btn-outline-gold" data-fcwz-create-otro>Crear otro</button>
                </div>
            </div>
        `;
    }

    function bodyHtml() {
        if (state.paso <= 1) return renderGate();
        if (state.rama === RAMA_VER) {
            if (state.paso === 2) return renderFarmPicker();
            if (state.paso === 3) return renderVerTiles();
            if (state.paso === 4) return renderVerCategoria();
            return renderVerStep5();
        }
        if (state.paso === 2) return renderFarmPicker();
        if (state.paso === 3) return renderCrearTypes();
        if (state.paso === 4) return renderCrearCategoria();
        if (state.paso === 5) return renderCrearForm();
        return state.created ? renderCrearDone() : renderCrearReview();
    }

    function footerHtml() {
        if (state.paso <= 1) return '';
        if (state.rama === RAMA_CREAR && state.paso === CREAR_TOTAL && state.created) return '';
        const backBtn = '<button type="button" class="btn-outline-gold" data-fcwz-back>Atrás</button>';
        const isLastVer = state.rama === RAMA_VER && state.paso === VER_TOTAL;
        const nextLabel = state.rama === RAMA_CREAR && state.paso === CREAR_TOTAL ? 'Confirmar' : 'Siguiente';
        const nextBtn = isLastVer ? '' : `<button type="button" class="btn-gold" data-fcwz-next ${state.saving ? 'disabled' : ''}>${state.saving ? 'Guardando…' : nextLabel}</button>`;
        return `<div class="fcvw__footer">${backBtn}${nextBtn}</div>`;
    }

    function guideText() {
        if (state.paso <= 1) return '¿Qué quieres hacer en el facturero de la finca?';
        if (state.paso === 2) return 'Elige la finca que quieres trabajar.';
        if (state.rama === RAMA_VER) {
            if (state.paso === 3) return '¿Qué tipo de registros quieres ver?';
            if (state.paso === 4) return '¿Qué categoría quieres ver?';
            return 'Registros del tipo y categoría elegidos.';
        }
        if (state.paso === 3) return '¿Qué tipo de movimiento vas a registrar?';
        if (state.paso === 4) return '¿En qué categoría encaja el movimiento?';
        if (state.paso === 5) return 'Cuéntale al facturero los detalles del movimiento.';
        return 'Revisa que todo esté correcto antes de confirmar.';
    }

    function render() {
        if (!alive) return;
        const sub = subtitle();
        root.innerHTML = `
            <div class="fcwz">
                <div class="fcvw__topbar">
                    <button type="button" class="fcvw__back" data-fcwz-exit>
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                        Volver
                    </button>
                    <p class="fcvw__title">Facturero de la Finca${sub ? `<span class="fcvw__subtitle">${escapeHtml(sub)}</span>` : ''}</p>
                    <span class="fcvw__step">Paso ${state.paso} de ${totalPasos()}</span>
                </div>
                <p class="fcvw__guide">${escapeHtml(guideText())}</p>
                <div class="fcwz__body">${bodyHtml()}</div>
                ${footerHtml()}
            </div>
        `;
        bindEvents();
        syncHash();
    }

    function bindEvents() {
        root.querySelector('[data-fcwz-exit]')?.addEventListener('click', exitToSurface);
        root.querySelector('[data-fcwz-back]')?.addEventListener('click', goBack);
        root.querySelector('[data-fcwz-next]')?.addEventListener('click', () => {
            if (state.rama === RAMA_CREAR && state.paso === CREAR_TOTAL && !state.created) {
                void confirmCreate();
                return;
            }
            goNext();
        });

        root.querySelectorAll('[data-fcwz-rama]').forEach((button) => {
            button.addEventListener('click', () => {
                state.rama = button.getAttribute('data-fcwz-rama') === RAMA_CREAR ? RAMA_CREAR : RAMA_VER;
                goStep(2);
            });
        });
        root.querySelectorAll('[data-fcwz-farm]').forEach((button) => {
            button.addEventListener('click', () => {
                state.farmId = String(button.getAttribute('data-fcwz-farm') || '').trim();
                render();
            });
        });
        root.querySelectorAll('[data-fcwz-tile]').forEach((button) => {
            button.addEventListener('click', () => {
                const nextTile = String(button.getAttribute('data-fcwz-tile') || '').trim() || 'gastos';
                if (nextTile !== state.tileId) {
                    state.tileId = nextTile;
                    // La categoría pertenece al tile anterior: se resetea.
                    state.categoria = '';
                }
                render();
            });
        });
        root.querySelectorAll('[data-fcwz-cat]').forEach((button) => {
            button.addEventListener('click', () => {
                state.categoria = String(button.getAttribute('data-fcwz-cat') || '').trim();
                render();
            });
        });
        root.querySelectorAll('[data-fcwz-crear-cat]').forEach((button) => {
            button.addEventListener('click', () => {
                state.crearCategoria = String(button.getAttribute('data-fcwz-crear-cat') || '').trim();
                render();
            });
        });
        root.querySelector('[data-fcwz-retry-cats]')?.addEventListener('click', () => {
            state.catScope.phase = 'idle';
            void fetchCrearCategorias();
        });
        root.querySelectorAll('[data-fcwz-tipo]').forEach((button) => {
            button.addEventListener('click', () => {
                state.tipoId = String(button.getAttribute('data-fcwz-tipo') || '').trim();
                render();
            });
        });
        root.querySelectorAll('[data-fcwz-moneda]').forEach((button) => {
            button.addEventListener('click', () => {
                state.moneda = String(button.getAttribute('data-fcwz-moneda') || 'COP');
                render();
            });
        });

        const conceptoInput = root.querySelector('#fcwz-concepto');
        conceptoInput?.addEventListener('input', () => { state.concepto = conceptoInput.value; });
        const montoInput = root.querySelector('#fcwz-monto');
        montoInput?.addEventListener('input', () => { state.monto = montoInput.value; });
        const fechaInput = root.querySelector('#fcwz-fecha');
        fechaInput?.addEventListener('input', () => { state.fecha = fechaInput.value || todayLocalIso(); });

        root.querySelector('[data-fcwz-export]')?.addEventListener('click', exportTileMarkdown);
        root.querySelector('[data-fcwz-refresh-list]')?.addEventListener('click', () => { void fetchTileRows(); });
        root.querySelector('[data-fcwz-retry-list]')?.addEventListener('click', () => { void fetchTileRows(); });
        root.querySelector('[data-fcwz-retry-actions]')?.addEventListener('click', () => { void fetchActions(); });
        root.querySelector('details.fcwz-actions')?.addEventListener('toggle', (event) => {
            if (event.target.open && state.actionsScope.phase === 'idle') void fetchActions();
        });
        root.querySelector('[data-fcwz-goto-ver]')?.addEventListener('click', () => {
            // D4: a la rama VER con la MISMA finca y el tile canonico del tipo
            // recien creado (navegacion que no miente). El scope se resetea para
            // que el registro nuevo aparezca sin recargar la pagina.
            state.tileId = TYPE_TO_TILE[state.tipoId] || 'gastos';
            state.categoria = '';
            const createdTipo = state.tipoId;
            resetCreateFlow();
            state.tipoId = createdTipo;
            state.listScope = { phase: 'loading', rows: [], error: '', requestId: 0 };
            goStep(VER_TOTAL, RAMA_VER);
        });
        root.querySelector('[data-fcwz-create-otro]')?.addEventListener('click', () => {
            // D4: crear otro arranca desde el paso de TIPO, conservando la finca.
            resetCreateFlow();
            goStep(3, RAMA_CREAR);
        });
    }

    function destroy() {
        alive = false;
        document.body.classList.remove(WIZARD_BODY_CLASS);
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch (_err) { /* ignore */ }
    }

    document.body.classList.add(WIZARD_BODY_CLASS);
    render();

    // F5: recargar lo que el paso restaurado necesite (D-C + B7).
    if (state.rama === RAMA_VER && state.paso >= 4 && tileRowsStale()) {
        void fetchTileRows();
    }
    if (state.rama === RAMA_CREAR && state.paso === 4) {
        void fetchCrearCategorias();
    }

    return { destroy };
}
