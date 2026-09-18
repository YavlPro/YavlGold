/**
 * Facturero del Cultivo — Wizard (S2 esqueleto + S3 lectura real).
 * Ruta hash: #view=facturero-cultivo&subview=wizard&paso=N&rama=ver|crear
 *            &finca=<id>&crop=<id>&cat=<slug>&done=1
 * F5 restaura paso/rama/finca/crop/cat por hash (ANEXO 12: sin storage; el
 * shell preserva el hash profundo en same-target).
 *
 * Partición (MANIFIESTO 4.5): SOLO registros con crop_id. Los movimientos
 * generales de finca viven en el wizard de Finca; los sin asociación, en el
 * futuro Facturero Personal.
 *
 * S3: VER lee por agro-ledger-reader.js — paso 3 tiles con conteos reales
 * (fetchTileRows por tile), paso 4 categorías con conteo (translateCategory
 * ya normalizó), paso 5 lista con tag "histórico operacional" y botones
 * editar/eliminar solo en filas ledger originales (editor reutilizado por
 * import dinámico). Stamps 3 ejes + refetch de entrada (14-B/B7).
 *
 * Selectores dinamicos (MANIFIESTO 4.5): VER permite "Vista general" en ambos
 * ejes; CREAR exige cultivo especifico (D-1: la particion se define por
 * crop_id). Cultivos desde el puente global window.__AGRO_CROPS_STATE
 * (patron GREEN de la familia clientes, flow.js:114-118) + evento
 * AGRO_CROPS_READY; fincas desde window._agroFarms.
 *
 * Dormicion del legacy: agroOperationalCycles.js duerme con subview=wizard
 * (guards :3637-3642 y :4037-4041, por subview sin importar la vista) —
 * misma convivencia probada por el wizard de Finca.
 *
 * ADN V12: tokens, FA 6.5 Free con aria-hidden, sin glow, transiciones
 * 120-220ms, reduced-motion (heredado del CSS global de la familia fcvw).
 * Clases reutilizadas en MODO LECTURA: fcvw__*, fcwz*, fcflow-* (cargadas
 * globalmente). Solo la doble tira vive en agro-facturero-cultivo-wizard.css.
 */

import {
    LEDGER_TILES,
    fetchTileRows,
    stampScope,
    isScopeStale,
    isLedgerRowEditable
} from './agro-ledger-reader.js';
import { supabase } from '../assets/js/config/supabase-config.js';
import { initExchangeRates, getRate, convertToUSD } from './agro-exchange.js';
import { assertOperationalPeriodOpen } from './agro-period-cycles.js';

const ROOT_ID = 'agro-operational-root';
const CULTIVO_VIEWS = new Set(['facturero-cultivo']);
const WIZARD_BODY_CLASS = 'agro-fcv-wizard-active';
const CROPS_READY_EVENT = 'AGRO_CROPS_READY';
// ANEXO 21: el nivel 1 agrupa por el MISMO mapeo que las tabs de Mis Cultivos
// (activo/finished/lost) — se consume del puente window._agroCyclesWorkspace
// (snapshot publicado por el monolito, agro.js:138-149), sin re-implementar
// resolveCropStatus ni inventar vocabulario de estados.
const CYCLES_SNAPSHOT_EVENT = 'agro:cycles:snapshot';
const ESTADO_TODOS = 'todos';
const ESTADO_OPTIONS = [
    { id: ESTADO_TODOS, label: 'Todos los cultivos', group: null },
    { id: 'activos', label: 'Activos', group: 'active' },
    { id: 'finalizados', label: 'Finalizados', group: 'finished' },
    { id: 'perdidos', label: 'Perdidos', group: 'lost' }
];

const RAMA_VER = 'ver';
const RAMA_CREAR = 'crear';
const VER_TOTAL = 5;
const CREAR_TOTAL = 6;

// Tiles de lectura (misma identidad que LEDGER_TILES del reader, sesion 3).
const VER_TILES = [
    { id: 'gastos', label: 'Gastos', icon: 'fa-solid fa-receipt' },
    { id: 'ingresos', label: 'Ingresos', icon: 'fa-solid fa-circle-check' },
    { id: 'fiados', label: 'Fiados', icon: 'fa-solid fa-handshake' },
    { id: 'perdidas', label: 'Pérdidas', icon: 'fa-solid fa-circle-xmark' },
    { id: 'donaciones', label: 'Donaciones', icon: 'fa-solid fa-hand-holding-heart' }
];

// Tipos de creacion: SIN fiado (su hogar es Facturero de Clientes, 4.5.1).
const CREAR_TYPES = [
    { id: 'expense', label: 'Gasto', icon: 'fa-solid fa-receipt', hint: 'Algo que pagas para el cultivo.' },
    { id: 'income', label: 'Ingreso', icon: 'fa-solid fa-hand-holding-dollar', hint: 'Dinero que entra por el cultivo.' },
    { id: 'donation', label: 'Donación', icon: 'fa-solid fa-gift', hint: 'Producción o dinero regalado.' },
    { id: 'loss', label: 'Pérdida', icon: 'fa-solid fa-circle-xmark', hint: 'Algo que se pierde y se cierra.' }
];

// Categorias canonicas (copia local — el vocabulario es fijo; el reader
// tradujo con el mismo id en S1). Ventas SOLO para income (D-3b).
const FARM_CATEGORIES = [
    { id: 'insumos', label: 'Insumos agrícolas', desc: 'Semillas, abono, agroquímicos', icon: 'fa-solid fa-seedling' },
    { id: 'herramientas', label: 'Herramientas y equipos', desc: 'Maquinaria, repuestos', icon: 'fa-solid fa-toolbox' },
    { id: 'mano_obra', label: 'Mano de obra', desc: 'Jornales y trabajo de campo', icon: 'fa-solid fa-people-group' },
    { id: 'mantenimiento', label: 'Mantenimiento', desc: 'Cercas, riego, infraestructura', icon: 'fa-solid fa-screwdriver-wrench' },
    { id: 'transporte', label: 'Transporte y combustible', desc: 'Gasolina, fletes', icon: 'fa-solid fa-truck' },
    { id: 'otros', label: 'Otros', desc: 'Lo que no encaja arriba', icon: 'fa-solid fa-ellipsis' }
];
const VENTA_CATEGORY = { id: 'ventas', label: 'Ventas', desc: 'Ingreso por venta de cosecha', icon: 'fa-solid fa-store' };

// Tiles cuya tabla ledger tiene columna de categoria (trazado canonico: solo
// agro_expenses.category y agro_income.categoria). El resto: nota honesta.
const CATEGORY_FIELD_TILES = new Set(['gastos', 'ingresos']);

// S4: destino de escritura por tipo (espejo del wizard Finca, D-B) y tile
// canonico de lectura tras crear (D4). Fiado excluido: hogar en Clientes.
const TYPE_TO_TABLE = Object.freeze({
    expense: 'agro_expenses',
    income: 'agro_income',
    donation: 'agro_transfers',
    loss: 'agro_losses'
});
const TYPE_TO_TILE = Object.freeze({
    expense: 'gastos',
    income: 'ingresos',
    donation: 'donaciones',
    loss: 'perdidas'
});

const CURRENCY_OPTIONS = [
    { value: 'COP', label: 'COP' },
    { value: 'USD', label: 'USD' },
    { value: 'VES', label: 'Bs (VES)' }
];

let activeSession = null;

export function initAgroCultivoWizard() {
    window.addEventListener('agro:shell:view-changed', (event) => {
        const view = String(event?.detail?.view || '').trim().toLowerCase();
        const subview = String(event?.detail?.subview || '').trim().toLowerCase();
        if (CULTIVO_VIEWS.has(view) && subview === 'wizard') {
            mountWizard();
            return;
        }
        destroyWizard();
    });
    // F5 / entrada directa: el dispatch del shell puede llegar antes de que
    // este modulo este importado; el hash manda (ANEXO 12).
    if (isWizardHashActive()) {
        mountWizard();
    }
}

function isWizardHashActive() {
    try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const view = String(hash.get('view') || '').trim().toLowerCase();
        const subview = String(hash.get('subview') || '').trim().toLowerCase();
        return CULTIVO_VIEWS.has(view) && subview === 'wizard';
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
        const estadoRaw = String(hash.get('estado') || '').trim().toLowerCase();
        return {
            paso: Number.parseInt(hash.get('paso') || '', 10) || null,
            rama: String(hash.get('rama') || '').trim().toLowerCase() === RAMA_CREAR ? RAMA_CREAR : RAMA_VER,
            finca: String(hash.get('finca') || '').trim(),
            crop: String(hash.get('crop') || '').trim(),
            estado: ESTADO_OPTIONS.some((option) => option.id === estadoRaw) ? estadoRaw : ESTADO_TODOS,
            cat: String(hash.get('cat') || '').trim(),
            done: String(hash.get('done') || '').trim() === '1'
        };
    } catch (_err) {
        return { paso: null, rama: RAMA_VER, finca: '', crop: '', estado: ESTADO_TODOS, cat: '', done: false };
    }
}

function createSession(root) {
    let alive = true;
    // ANEXO 12 (B8): la entrada decide SOLO por el hash. Con paso -> restaurar
    // (F5); sin paso -> gate limpio. Sin storage: un respaldo en storage
    // revive sesiones viejas al entrar desde el hub.
    const source = readWizardHash();

    const state = {
        rama: source.rama === RAMA_CREAR ? RAMA_CREAR : RAMA_VER,
        paso: 1,
        farmId: String(source.finca || ''),
        cropId: String(source.crop || ''),
        estadoId: source.estado || ESTADO_TODOS,
        tileId: 'gastos',
        tipoId: '',
        categoria: String(source.cat || ''),
        crearCategoria: String(source.cat || ''),
        concepto: '',
        monto: '',
        moneda: 'COP',
        fecha: todayLocalIso(),
        saving: false,
        contextNotice: '',
        created: source.done === true && source.rama === RAMA_CREAR && Number(source.paso) === CREAR_TOTAL,
        // S3: scopes de lectura. countsScope alimenta el paso 3 (conteo por
        // tile); listScope los pasos 4-5 (filas del tile elegido). Ambos se
        // estampan con el partition completo (B7 a 3 ejes) y refetchean de
        // entrada (14-B: los datos pueden haber cambiado en otra rama).
        countsScope: { phase: 'loading', error: '', counts: {}, stamp: null, requestId: 0 },
        listScope: { phase: 'loading', error: '', rows: [], stamp: null, requestId: 0 },
        exchangeRates: { USD: 1, COP: null, VES: null }
    };

    // S4: tasas para el cálculo honesto de monto_usd (respeta la histórica
    // al editar; aquí solo en la creación, espejo Finca).
    initExchangeRates()
        .then((rates) => {
            if (!alive) return;
            if (rates && typeof rates === 'object') state.exchangeRates = rates;
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

    // ---------- Fuentes de contexto (puentes globales, patron familia clientes) ----------

    function getFarms() {
        if (typeof window !== 'object' || typeof window._agroFarms?.getFarms !== 'function') return [];
        return Array.isArray(window._agroFarms.getFarms()) ? window._agroFarms.getFarms() : [];
    }

    function getCropsState() {
        if (typeof window !== 'object') return { phase: 'loading', crops: [] };
        const snapshot = window.__AGRO_CROPS_STATE;
        const crops = Array.isArray(snapshot?.crops) ? snapshot.crops : [];
        if (String(snapshot?.status || '').trim().toLowerCase() === 'ready') {
            return { phase: crops.length > 0 ? 'ready' : 'empty', crops };
        }
        return { phase: 'loading', crops };
    }

    // Regla estricta 4.5: nunca cultivos de otra finca. Sin finca
    // seleccionada ("Vista general") se ofrecen los cultivos de todas.
    function getScopedCrops() {
        const { crops } = getCropsState();
        if (!state.farmId) return crops;
        return crops.filter((crop) => String(crop?.farm_id || '') === state.farmId);
    }

    // ANEXO 21: grupos de estado desde el snapshot de Mis Cultivos (puente
    // global). known=false mientras el monolito no publica (arranque); no se
    // mienten grupos vacíos antes de tiempo.
    function getCycleGroups() {
        const empty = { known: false, ids: new Set() };
        if (typeof window !== 'object') return empty;
        const snapshot = window._agroCyclesWorkspace?.getSnapshot?.() || null;
        if (!snapshot || typeof snapshot !== 'object') return empty;
        const total = Number(snapshot.summary?.total || 0)
            + (snapshot.active?.length || 0) + (snapshot.finished?.length || 0) + (snapshot.lost?.length || 0);
        const known = Boolean(snapshot.updatedAt) || total > 0;
        if (!known) return empty;
        const rows = snapshot[groupKeyOf(state.estadoId)] || [];
        return {
            known: true,
            ids: new Set((Array.isArray(rows) ? rows : []).map((card) => String(card?.id || '')).filter(Boolean))
        };
    }

    function groupKeyOf(estadoId) {
        const option = ESTADO_OPTIONS.find((entry) => entry.id === estadoId);
        return option?.group || 'active';
    }

    function estadoLabel(estadoId = state.estadoId) {
        return ESTADO_OPTIONS.find((entry) => entry.id === estadoId)?.label || 'Todos los cultivos';
    }

    // Nivel 2: cultivos del grupo de estado, filtrados por la finca elegida
    // (regla estricta §4.5 sobre el grupo, no sobre todas las fincas).
    function getEstadoScopedCrops() {
        const scoped = getScopedCrops();
        if (state.estadoId === ESTADO_TODOS) return scoped;
        const groups = getCycleGroups();
        return scoped.filter((crop) => groups.ids.has(String(crop?.id || '')));
    }

    function cropChipLabel(crop) {
        const rawName = String(crop?.name || '').trim().replace(/^[^\p{L}\p{N}]+/u, '').trim();
        const name = rawName || 'Cultivo';
        const icon = String(crop?.icon || '').trim();
        const emoji = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.exec(icon)?.[0] || '';
        return emoji ? `${emoji} ${name}` : name;
    }

    // ANEXO 28 (D-5): token canonico directo — sin re-implementar
    // resolveCropStatus ni inventar vocabulario (header §49-52).
    function isPreCultivoCrop(crop) {
        const token = String(crop?.status_override || crop?.status || '').trim().toLowerCase();
        return token === 'precultivo';
    }

    function crearTypeBlocksPreCultivo() {
        return state.rama === RAMA_CREAR
            && (state.tipoId === 'income' || state.tipoId === 'donation');
    }

    // Reconciliacion honesta (ANEXO 21 extendida): el cultivo activo debe
    // pertenecer a la finca Y al grupo de estado elegido; si no, vuelve a la
    // lectura del grupo con nota visible (nunca mudo). Solo dirime cuando los
    // cultivos estan listos y — con estado especifico — el snapshot publicado.
    function reconcileCropSelection() {
        if (!state.cropId) return;
        if (getCropsState().phase !== 'ready') return;
        // ANEXO 28 (D-5): un pre-cultivo no admite Ingreso ni Donación.
        if (crearTypeBlocksPreCultivo()) {
            const selected = getCropsState().crops.find((crop) => String(crop?.id || '') === state.cropId);
            if (selected && isPreCultivoCrop(selected)) {
                state.cropId = '';
                state.contextNotice = 'El cultivo seleccionado es un pre-cultivo: solo admite Gasto y Pérdida.';
                return;
            }
        }
        const estadoGrupo = state.estadoId !== ESTADO_TODOS;
        const groups = estadoGrupo ? getCycleGroups() : { known: true, ids: null };
        if (!groups.known) return;
        const inFarm = !state.farmId
            || getScopedCrops().some((crop) => String(crop?.id || '') === state.cropId);
        if (inFarm && (!estadoGrupo || groups.ids.has(state.cropId))) return;
        const motivo = !inFarm
            ? 'El cultivo seleccionado no pertenece a esta finca: se volvió a la lectura por estado.'
            : `El cultivo restaurado no pertenece al estado «${estadoLabel()}»: se muestra el grupo completo.`;
        state.cropId = '';
        state.contextNotice = motivo;
    }

    function farmLabel() {
        if (!state.farmId) return 'Vista general';
        const farm = getFarms().find((entry) => String(entry?.id || '') === state.farmId);
        return String(farm?.name || 'Finca').trim();
    }

    function cropLabel() {
        if (!state.cropId) {
            return state.estadoId === ESTADO_TODOS
                ? 'Vista general de cultivos'
                : `Cultivos ${estadoLabel().toLowerCase()}`;
        }
        const crop = getCropsState().crops.find((entry) => String(entry?.id || '') === state.cropId);
        return crop ? cropChipLabel(crop) : 'Cultivo';
    }

    // ---------- Lectura S3: partición crop + fetchers con stamps (14-B/B7) ----------

    // Partición crop del contexto actual (ANEXO 21: consciente del estado):
    // cultivo individual -> cropId unico; estado especifico sin cultivo ->
    // cropIds del grupo filtrado por finca (vacio = cero honesto sin query);
    // "Todos los cultivos" -> comportamiento canon exacto (finca o todo).
    // Nunca filtra por farm_id de la fila.
    function currentPartition() {
        if (state.cropId) return { preset: 'crop', cropId: state.cropId };
        if (state.estadoId !== ESTADO_TODOS) {
            return {
                preset: 'crop',
                cropIds: getEstadoScopedCrops().map((crop) => String(crop?.id || '').trim()).filter(Boolean)
            };
        }
        if (state.farmId) {
            return {
                preset: 'crop',
                cropIds: getScopedCrops().map((crop) => String(crop?.id || '').trim()).filter(Boolean)
            };
        }
        return { preset: 'crop' };
    }

    function listScopeStale() {
        const scope = state.listScope;
        if (scope.phase === 'loading' && scope.requestId === 0) return true;
        return isScopeStale(scope.stamp, { tileId: state.tileId, partition: currentPartition() });
    }

    function countsScopeStale() {
        const scope = state.countsScope;
        if (scope.phase === 'loading' && scope.requestId === 0) return true;
        return isScopeStale(scope.stamp, { tileId: '__counts__', partition: currentPartition() });
    }

    async function fetchListRows() {
        const scope = state.listScope;
        const requestId = ++scope.requestId;
        scope.phase = 'loading';
        scope.error = '';
        scope.stamp = stampScope({ tileId: state.tileId, partition: currentPartition() });
        render();
        try {
            const rows = await fetchTileRows({ tileId: state.tileId, partition: currentPartition() });
            if (requestId !== scope.requestId || !alive) return;
            scope.rows = rows;
            scope.phase = 'ready';
        } catch (err) {
            if (requestId !== scope.requestId || !alive) return;
            console.error('[CultivoWizard] tile load failed:', err?.message || err);
            scope.rows = [];
            scope.error = String(err?.message || 'No se pudo leer los registros.');
            scope.phase = 'error';
        } finally {
            if (requestId === scope.requestId && alive) render();
        }
    }

    // Paso 3: conteo real por tile — fetchTileRows por cada tile con la MISMA
    // partición (el lector dedupa y une por tile). Cero inventado: lo que no
    // existe llega como 0 desde datos.
    async function fetchTileCounts() {
        const scope = state.countsScope;
        const requestId = ++scope.requestId;
        scope.phase = 'loading';
        scope.error = '';
        scope.stamp = stampScope({ tileId: '__counts__', partition: currentPartition() });
        render();
        try {
            const partition = currentPartition();
            const results = await Promise.all(VER_TILES.map((tile) =>
                fetchTileRows({ tileId: tile.id, partition })
            ));
            if (requestId !== scope.requestId || !alive) return;
            const counts = {};
            VER_TILES.forEach((tile, index) => { counts[tile.id] = results[index].length; });
            scope.counts = counts;
            scope.phase = 'ready';
        } catch (err) {
            if (requestId !== scope.requestId || !alive) return;
            console.error('[CultivoWizard] tile counts failed:', err?.message || err);
            scope.counts = {};
            scope.error = String(err?.message || 'No se pudieron contar los registros.');
            scope.phase = 'error';
        } finally {
            if (requestId === scope.requestId && alive) render();
        }
    }

    // ---------- Hash ----------

    function syncHash() {
        try {
            const params = new URLSearchParams();
            params.set('view', 'facturero-cultivo');
            params.set('subview', 'wizard');
            params.set('paso', String(state.paso));
            params.set('rama', state.rama);
            if (state.farmId) params.set('finca', state.farmId);
            if (state.cropId) params.set('crop', state.cropId);
            if (state.estadoId !== ESTADO_TODOS) params.set('estado', state.estadoId);
            const categoriaValue = state.rama === RAMA_CREAR ? state.crearCategoria : state.categoria;
            if (categoriaValue) params.set('cat', categoriaValue);
            if (state.created) params.set('done', '1');
            const url = new URL(window.location.href);
            url.hash = `#${params.toString()}`;
            history.replaceState(null, '', url);
        } catch (_err) {
            // Ignorar fallos de routing.
        }
    }

    // ---------- Navegacion (ANEXO 19) ----------

    function goStep(nextPaso, nextRama) {
        if (nextRama) state.rama = nextRama;
        state.paso = clampPaso(nextPaso);
        render();
        // 14-B/B7: entrada a paso de lectura SIEMPRE refresca (los datos
        // pueden haber cambiado en otra rama del wizard); el cacheo por
        // stamps queda solo para saltos internos. void + requestId: races.
        if (state.rama === RAMA_VER && state.paso === 3) {
            void fetchTileCounts();
        }
        if (state.rama === RAMA_VER && state.paso >= 4) {
            const isEnteringStep4 = state.paso === 4;
            const isJumpingToStep5 = state.paso === VER_TOTAL && !listScopeStale();
            if (isEnteringStep4 || isJumpingToStep5 || listScopeStale()) {
                void fetchListRows();
            }
        }
    }

    function goNext() {
        // D-1: en CREAR el cultivo es obligatorio — la particion vive de crop_id.
        if (state.rama === RAMA_CREAR && state.paso === 3 && !state.cropId) {
            showStepError('Elige el cultivo del registro para continuar.');
            return;
        }
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

    // ANEXO 19: "Volver" topbar y "Atras" footer retroceden UN paso; solo
        // desde el paso 1 (gate) se sale al hub Granja.
    function exitToSurface() {
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

    // ANEXO 19: borrador CREAR sin guardar. Los defaults (fecha de hoy,
    // moneda COP) no cuentan como borrador. El cultivo elegido tampoco: es el
    // contexto que se conserva igual que la finca en el wizard de Finca.
    function hasCreateDraft() {
        return Boolean(
            state.tipoId
            || state.crearCategoria
            || state.concepto.trim()
            || state.monto.trim()
            || state.fecha !== todayLocalIso()
        );
    }

    async function goToStart() {
        if (state.rama === RAMA_CREAR && !state.created && hasCreateDraft()) {
            const confirmed = typeof window.showAgroConfirmDialog === 'function'
                ? await window.showAgroConfirmDialog({
                    title: 'Ir al inicio',
                    message: 'Tienes un borrador sin guardar en este wizard. ¿Ir al inicio y descartarlo?',
                    confirmText: 'Descartar e ir al inicio',
                    cancelText: 'Quedarme aquí',
                    iconClass: 'fa-solid fa-house'
                })
                : false;
            if (!confirmed) return;
        }
        if (state.rama === RAMA_CREAR) resetCreateFlow();
        goStep(1);
    }

    function resetCreateFlow() {
        // Espejo Finca: conserva el contexto (finca y cultivo elegidos), resetea
        // el resto del flujo de creacion.
        state.tipoId = '';
        state.crearCategoria = '';
        state.concepto = '';
        state.monto = '';
        state.moneda = 'COP';
        state.fecha = todayLocalIso();
        state.created = false;
    }

    function showStepError(message) {
        let node = root.querySelector('[data-fcct-error]');
        if (!node) {
            node = document.createElement('div');
            node.setAttribute('data-fcct-error', '');
            root.querySelector('.fcwz__body')?.prepend(node);
        }
        node.innerHTML = `
            <div class="fcflow-note fcflow-note--warning">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <span>${escapeHtml(message)}</span>
            </div>`;
    }

    // ---------- Render ----------

    function renderGate() {
        return `
            <div class="fcflow-doors">
                <button type="button" class="fcflow-door" data-fcct-rama="${RAMA_CREAR}">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i>
                    <span class="fcflow-door__title">Crear registro</span>
                    <span class="fcflow-door__desc">Registra un movimiento de un cultivo, paso a paso.</span>
                </button>
                <button type="button" class="fcflow-door" data-fcct-rama="${RAMA_VER}">
                    <i class="fa-solid fa-list-check" aria-hidden="true"></i>
                    <span class="fcflow-door__title">Ver registros</span>
                    <span class="fcflow-door__desc">Explora los registros por cultivo y tipo.</span>
                </button>
            </div>
        `;
    }

    // Paso 2 VER / Paso 3 CREAR — doble tira de contexto (4.5).
    // obligatorio=true (CREAR, D-1): sin "Vista general" de cultivos y el
    // avance exige cultivo (guard en goNext).
    // ANEXO 21: selector de cultivo en DOS NIVELES — nivel 1 estado (grupos
    // de Mis Cultivos via snapshot), nivel 2 cultivos del grupo filtrados por
    // finca (regla estricta §4.5). "Todos los cultivos" = vista general
    // canon (comportamiento exacto anterior).
    function renderContextPicker({ obligatorio = false } = {}) {
        const farms = getFarms();
        const farmChips = [
            `<button type="button" class="fcvw-chip${!state.farmId ? ' is-active' : ''}" data-fcct-farm="">Vista general</button>`,
            ...farms.map((farm) => {
                const id = String(farm?.id || '').trim();
                if (!id) return '';
                return `<button type="button" class="fcvw-chip${state.farmId === id ? ' is-active' : ''}" data-fcct-farm="${escapeHtml(id)}">${escapeHtml(String(farm?.name || 'Finca').trim())}</button>`;
            })
        ].join('');

        const estadoChips = ESTADO_OPTIONS.map((option) => `
            <button type="button" class="fcvw-chip${state.estadoId === option.id ? ' is-active' : ''}" data-fcct-estado="${option.id}">${escapeHtml(option.label)}</button>
        `).join('');

        const cropsState = getCropsState();
        let cropStripHtml = '';
        if (cropsState.phase === 'loading') {
            cropStripHtml = `
                <p class="fcvw-note">Revisando tus cultivos…</p>
                <button type="button" class="fcvw-btn" data-fcct-retry-crops><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
            `;
        } else if (cropsState.phase === 'empty') {
            cropStripHtml = '<p class="fcvw-note">Todavía no hay cultivos registrados. Crea un cultivo en Mi Granja para usar este facturero.</p>';
        } else if (state.estadoId !== ESTADO_TODOS && !getCycleGroups().known) {
            cropStripHtml = `
                <p class="fcvw-note">Revisando los estados de tus cultivos…</p>
                <button type="button" class="fcvw-btn" data-fcct-retry-crops><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
            `;
        } else {
            let scoped = getEstadoScopedCrops();
            // ANEXO 28 (D-5): en CREAR con Ingreso/Donación los pre-cultivos
            // no aplican (aún no hay cosecha que vender ni regalar).
            const preCultivoNote = obligatorio && crearTypeBlocksPreCultivo()
                ? '<p class="fcvw-note">Los pre-cultivos solo admiten Gasto y Pérdida.</p>'
                : '';
            if (obligatorio && crearTypeBlocksPreCultivo()) {
                scoped = scoped.filter((crop) => !isPreCultivoCrop(crop));
            }
            // Comodín canon: primera opción del nivel 2 = lectura sin cultivo
            // individual ("Vista general de cultivos" o el grupo completo).
            const comodinLabel = state.estadoId === ESTADO_TODOS
                ? 'Vista general de cultivos'
                : `Todos los ${estadoLabel().toLowerCase()}`;
            const generalChip = obligatorio
                ? ''
                : `<button type="button" class="fcvw-chip fcct-crop${!state.cropId ? ' is-active' : ''}" data-fcct-crop="">${escapeHtml(comodinLabel)}</button>`;
            const cropChips = scoped.map((crop) => {
                const id = String(crop?.id || '').trim();
                if (!id) return '';
                return `<button type="button" class="fcvw-chip fcct-crop${state.cropId === id ? ' is-active' : ''}" data-fcct-crop="${escapeHtml(id)}">${escapeHtml(cropChipLabel(crop))}</button>`;
            }).join('');
            let emptyNote = '';
            if (scoped.length === 0) {
                emptyNote = state.estadoId === ESTADO_TODOS
                    ? (state.farmId ? 'Esta finca no tiene cultivos todavía.' : '')
                    : `Sin cultivos ${estadoLabel().toLowerCase()}${state.farmId ? ' en esta finca' : ''}.`;
                if (emptyNote) emptyNote = `<p class="fcvw-note">${escapeHtml(emptyNote)}</p>`;
            }
            cropStripHtml = `${generalChip}${cropChips}${preCultivoNote}${emptyNote}`;
        }

        const noticeHtml = state.contextNotice
            ? `<div class="fcflow-note fcflow-note--warning"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>${escapeHtml(state.contextNotice)}</span></div>`
            : '';

        const cropLabel2 = obligatorio ? 'Cultivo (obligatorio)' : 'Cultivo';
        return `
            <div class="fcct-context">
                <div class="fcvw-picker">
                    <span class="fcvw-picker__label">Finca</span>
                    <div class="fcvw-picker__strip" role="group" aria-label="Contexto de finca">${farmChips}</div>
                </div>
                <div class="fcct-divider" aria-hidden="true"></div>
                <div class="fcvw-picker">
                    <span class="fcvw-picker__label">Estado del ciclo</span>
                    <div class="fcvw-picker__strip" role="group" aria-label="Estado de cultivos">${estadoChips}</div>
                </div>
                <div class="fcct-divider" aria-hidden="true"></div>
                <div class="fcvw-picker">
                    <span class="fcvw-picker__label">${cropLabel2}</span>
                    <div class="fcvw-picker__strip fcct-cropstrip" role="group" aria-label="Contexto de cultivo">${cropStripHtml}</div>
                </div>
                ${noticeHtml}
                <p class="fcvw-note">Este facturero lee únicamente los registros ligados a un cultivo. Los movimientos generales de la finca viven en el Facturero de la Finca.</p>
            </div>
        `;
    }

    function renderVerTiles() {
        const scope = state.countsScope;
        const countsHtml = scope.phase === 'ready'
            ? (tile) => `<span class="fcvw-tile__count">${scope.counts[tile.id] ?? 0}</span>`
            : () => '';
        let statusHtml = '';
        if (scope.phase === 'loading') {
            statusHtml = '<p class="fcvw-note">Contando los registros reales de cada tipo…</p>';
        } else if (scope.phase === 'error') {
            statusHtml = `
                <p class="fcvw-note">${escapeHtml(scope.error)}</p>
                <button type="button" class="fcvw-btn" data-fcct-retry-counts><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
            `;
        } else {
            statusHtml = `<p class="fcvw-note">Conteos reales para ${escapeHtml(cropLabel())}. Un cero significa cero: nada inventado.</p>`;
        }
        return `
            <div class="fcvw-tiles fcvw-tiles--square">
                ${VER_TILES.map((tile) => `
                    <button type="button" class="fcvw-tile${state.tileId === tile.id ? ' is-active' : ''}" data-fcct-tile="${tile.id}" aria-pressed="${state.tileId === tile.id ? 'true' : 'false'}">
                        <i class="${tile.icon}" aria-hidden="true"></i>
                        <span class="fcvw-tile__label">${escapeHtml(tile.label)}</span>
                        ${countsHtml(tile)}
                    </button>
                `).join('')}
            </div>
            ${statusHtml}
        `;
    }

    // S3: categorías con CONTEO REAL (el reader ya tradujo cada fila a su id
    // canónico en row.categoria). Ventas aparece solo en ingresos (D-3b).
    function renderVerCategoria() {
        const scope = state.listScope;
        if (scope.phase === 'loading') {
            return '<p class="fcvw-note">Revisando las categorías de estos registros…</p>';
        }
        if (scope.phase === 'error') {
            return `
                <div class="cartera-viva-empty">
                    <h3 class="cartera-viva-empty__title">No se pudieron leer las categorías</h3>
                    <p class="cartera-viva-empty__copy">${escapeHtml(scope.error)}</p>
                    <button type="button" class="fcvw-btn" data-fcct-retry-list><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
                </div>
            `;
        }
        // Tiles cuya tabla no tiene columna de categoria (trazado canonico):
        // nota honesta en vez de vocabulario inventado.
        if (!CATEGORY_FIELD_TILES.has(state.tileId)) {
            return `
                <div class="fcvw-picker">
                    <span class="fcvw-picker__label">Categoría</span>
                    <div class="fcvw-picker__strip" role="group" aria-label="Filtrar por categoría">
                        <button type="button" class="fcvw-chip${!state.categoria ? ' is-active' : ''}" data-fcct-cat="">Todas</button>
                        <button type="button" class="fcvw-chip${state.categoria === '__sin__' ? ' is-active' : ''}" data-fcct-cat="__sin__">Sin categoría</button>
                    </div>
                    <p class="fcvw-note">Este tipo de registro todavía no lleva categorías: usa "Todas" para verlo completo.</p>
                </div>
            `;
        }

        const counts = new Map();
        let sinCategoriaCount = 0;
        scope.rows.forEach((row) => {
            const categoria = String(row?.categoria || '').trim();
            if (categoria) counts.set(categoria, (counts.get(categoria) || 0) + 1);
            else sinCategoriaCount += 1;
        });

        const vocabulary = state.tileId === 'ingresos'
            ? [...FARM_CATEGORIES, VENTA_CATEGORY]
            : FARM_CATEGORIES;
        const tiles = vocabulary.map((category) => `
            <button type="button" class="fcvw-tile fcvw-tile--cat${state.categoria === category.id ? ' is-active' : ''}" data-fcct-cat="${escapeHtml(category.id)}" aria-pressed="${state.categoria === category.id ? 'true' : 'false'}" title="${escapeHtml(category.desc)}">
                <i class="${category.icon}" aria-hidden="true"></i>
                <span class="fcvw-tile__label">${escapeHtml(category.label)}</span>
                <span class="fcvw-tile__desc">${escapeHtml(category.desc)}</span>
                <span class="fcvw-tile__count">${counts.get(category.id) || 0}</span>
            </button>
        `).join('');

        const comodines = [
            `<button type="button" class="fcvw-chip${!state.categoria ? ' is-active' : ''}" data-fcct-cat="">Todas</button>`,
            ...(sinCategoriaCount > 0 ? [`<button type="button" class="fcvw-chip${state.categoria === '__sin__' ? ' is-active' : ''}" data-fcct-cat="__sin__">Sin categoría (${sinCategoriaCount})</button>`] : [])
        ].join('');

        return `
            <div class="fcvw-tiles fcvw-tiles--square">${tiles}</div>
            <div class="fcvw-picker__strip" role="group" aria-label="Comodines de categoría">${comodines}</div>
            <p class="fcvw-note">El número de cada categoría es real para ${escapeHtml(cropLabel())} y este tipo. Los registros viejos se leen en su categoría canónica.</p>
        `;
    }

    // ---------- S4: creación real al ledger del cultivo ----------

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
        // D-1 revalidado en la escritura: sin cultivo no hay partición.
        if (!state.cropId) {
            showStepError('Elige el cultivo del registro antes de confirmar.');
            return;
        }
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

            // crop_id del paso 3 (D-1) y farm_id DERIVADO del cultivo: los
            // cultivos legacy pueden no tener finca — la fila vive igual en la
            // partición Cultivo (crop_id es el eje, nunca row.farm_id).
            const crop = getCropsState().crops.find((entry) => String(entry?.id || '') === state.cropId);
            const cropFarmId = String(crop?.farm_id || '').trim();

            const table = TYPE_TO_TABLE[economicType] || 'agro_expenses';
            const payload = {
                user_id: user.id,
                farm_id: cropFarmId || null,
                crop_id: state.cropId,
                fecha: state.fecha,
                concepto: state.concepto.trim(),
                monto: amount,
                currency: state.moneda,
                exchange_rate: state.moneda === 'USD' ? 1 : rate,
                monto_usd: amountUsd
            };
            // Columnas con nombre propio por tabla (asimetría ES/EN canonica):
            // agro_expenses usa date/concept/amount y category; agro_income
            // usa fecha/concepto/monto y categoria; loss/donation sin categoria.
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

            // Refresh de las superficies que escuchan estos eventos (como
            // flow.js y el propio wizard Finca — espejo del eventByTipo).
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
            console.error('[CultivoWizard] create failed:', err?.message || err);
            showStepError(err?.message || 'No se pudo guardar el registro.');
        } finally {
            state.saving = false;
            render();
        }
    }

    // ---------- Paso 5 VER: lista real (espejo honesto del wizard Finca) ----------

    function getCategoryLabel(id) {
        const category = [...FARM_CATEGORIES, VENTA_CATEGORY].find((entry) => entry.id === id);
        return category ? category.label : 'Sin categoría';
    }

    function ledgerTile() {
        return LEDGER_TILES.find((entry) => entry.id === state.tileId) || LEDGER_TILES[0];
    }

    function movementText(row, tile) {
        const who = String(row?.[tile.who] || '').trim();
        const concepto = String(row?.concepto || '').trim() || 'Sin concepto';
        return who ? `${concepto} — ${who}` : concepto;
    }

    function renderMoneyNode(value) {
        const safeValue = String(value ?? '').trim() || '$0.00';
        return `<strong data-money="1" data-raw-money="${escapeHtml(safeValue)}">${escapeHtml(safeValue)}</strong>`;
    }

    function formatMoney(row) {
        // Honestidad §8.5: monto null/undefined NO es cero — "Monto no
        // anotado" para eso (Number(null)===0 pintaba "$0.00" falso).
        const raw = row?.monto;
        if (raw === null || raw === undefined || String(raw).trim() === '') {
            return 'Monto no anotado';
        }
        const amount = Number(raw);
        if (!Number.isFinite(amount)) return '—';
        const currency = String(row?.currency || 'USD').trim().toUpperCase();
        const symbols = { USD: '$', COP: 'COL$', VES: 'Bs' };
        const symbol = symbols[currency] || '';
        return `${symbol}${amount.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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
                    <p class="cartera-viva-empty__copy">Buscando ${tile.label.toLowerCase()} de ${escapeHtml(cropLabel())}.</p>
                </div>
            `;
        }
        if (scope.phase === 'error') {
            return `
                <div class="cartera-viva-empty">
                    <h3 class="cartera-viva-empty__title">No se pudo leer los registros</h3>
                    <p class="cartera-viva-empty__copy">${escapeHtml(scope.error)}</p>
                    <button type="button" class="fcvw-btn" data-fcct-retry-list><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
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
                    <h3 class="cartera-viva-empty__title">Sin ${tile.label.toLowerCase()} en ${escapeHtml(cropLabel())}</h3>
                    <p class="cartera-viva-empty__copy">Cuando registres ${tile.label.toLowerCase()} de este cultivo, aparecerán aquí. Si esperabas registros y no aparecen, el lector deja un aviso técnico (canary) en la consola del navegador.</p>
                </div>
            `;
        }
        return `
            <ul class="fcwz-movements">
                ${rows.map((row) => `
                    <li class="fcwz-movements__item">
                        <span class="fcwz-movements__date">${escapeHtml(String(row?.fecha || '').slice(0, 10) || 'Sin fecha')}</span>
                        <span class="fcwz-movements__text">${escapeHtml(movementText(row, ledgerTile()))}${row?.origen === 'operacional' ? ' <span class="fcwz-movements__tag">histórico operacional</span>' : ''}${row?.categoria ? ` <span class="fcwz-movements__tag">${escapeHtml(getCategoryLabel(row.categoria))}</span>` : ''}</span>
                        <span class="fcwz-movements__amount">${renderMoneyNode(formatMoney(row))}</span>
                        ${isLedgerRowEditable(row) ? `
                        <span class="fcwz-movements__actions">
                            <button type="button" class="fcwz-iconbtn" data-fcct-edit-row="${escapeHtml(String(row.id || ''))}" aria-label="Editar registro"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                            <button type="button" class="fcwz-iconbtn" data-fcct-del-row="${escapeHtml(String(row.id || ''))}" aria-label="Eliminar registro"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
                        </span>` : ''}
                        ${row?.origen === 'operacional' ? `
                        <span class="fcwz-movements__actions">
                            <button type="button" class="fcwz-iconbtn" data-fcct-op-edit-row="${escapeHtml(String(row.id || ''))}" aria-label="Editar movimiento del ciclo"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                            <button type="button" class="fcwz-iconbtn" data-fcct-op-del-row="${escapeHtml(String(row.id || ''))}" aria-label="Eliminar movimiento del ciclo"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
                        </span>` : ''}
                    </li>
                `).join('')}
            </ul>
        `;
    }

    function renderVerList() {
        const tile = VER_TILES.find((entry) => entry.id === state.tileId) || VER_TILES[0];
        const catPart = state.categoria ? ` · ${escapeHtml(getCategoryLabel(state.categoria === '__sin__' ? '' : state.categoria))}` : '';
        return `
            <p class="fcvw-clients__context">${escapeHtml(tile.label)} · ${escapeHtml(cropLabel())}${catPart}</p>
            <div class="agro-privacy-strip" aria-label="Privacidad">
                <span class="agro-privacy-strip__label">Privacidad</span>
                <button type="button" class="btn-privacy-toggle" data-money-privacy-control="toggle" aria-pressed="false">Ocultar montos</button>
            </div>
            ${renderVerListBody()}
            <div class="fcvw-clients__bar">
                <button type="button" class="fcvw-btn" data-fcct-refresh-list>
                    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    Actualizar
                </button>
            </div>
        `;
    }

    // Fase 7 reutilizada (ANEXO 18): editar/eliminar SOLO filas ledger
    // originales — el editor revalida el triple filtro antes de tocar la base
    // y su contrato mantiene crop_id fuera del payload.
    function findEditableLedgerRow(rowId) {
        const id = String(rowId || '');
        if (!id) return null;
        const row = state.listScope.rows.find((entry) => String(entry?.id || '') === id);
        return isLedgerRowEditable(row) ? row : null;
    }

    async function openRowEditor(rowId) {
        const row = findEditableLedgerRow(rowId);
        if (!row) return;
        try {
            const { openFincaLedgerEditor } = await import('./agro-facturero-finca-edit.js');
            await openFincaLedgerEditor({
                table: ledgerTile().table,
                row,
                onChanged: () => { void fetchListRows(); }
            });
        } catch (err) {
            console.error('[CultivoWizard] edit module failed:', err?.message || err);
            showStepError('No se pudo abrir el editor del registro.');
        }
    }

    async function deleteRowFromList(rowId) {
        const row = findEditableLedgerRow(rowId);
        if (!row) return;
        try {
            const { deleteFincaLedgerRow } = await import('./agro-facturero-finca-edit.js');
            await deleteFincaLedgerRow({
                table: ledgerTile().table,
                row,
                onChanged: () => { void fetchListRows(); void fetchTileCounts(); }
            });
        } catch (err) {
            console.error('[CultivoWizard] delete failed:', err?.message || err);
            showStepError('No se pudo eliminar el registro.');
        }
    }

    // ANEXO 20 F1: gestión de históricos operacionales (Opción A) — editar
    // concepto/monto/fecha del movimiento o eliminarlo del ciclo. Refresca
    // lista Y conteos (14-B).
    function findOperationalRow(rowId) {
        const id = String(rowId || '');
        if (!id) return null;
        const row = state.listScope.rows.find((entry) => String(entry?.id || '') === id);
        return row?.origen === 'operacional' ? row : null;
    }

    async function openOpRowEditor(rowId) {
        const row = findOperationalRow(rowId);
        if (!row) return;
        try {
            const { openOperationalMovementEditor } = await import('./agro-operational-edit.js');
            await openOperationalMovementEditor({
                row,
                onChanged: () => { void fetchListRows(); void fetchTileCounts(); }
            });
        } catch (err) {
            console.error('[CultivoWizard] op edit failed:', err?.message || err);
            showStepError('No se pudo abrir el editor del movimiento.');
        }
    }

    async function deleteOpRowFromList(rowId) {
        const row = findOperationalRow(rowId);
        if (!row) return;
        try {
            const { deleteOperationalMovement } = await import('./agro-operational-edit.js');
            await deleteOperationalMovement({
                row,
                onChanged: () => { void fetchListRows(); void fetchTileCounts(); }
            });
        } catch (err) {
            console.error('[CultivoWizard] op delete failed:', err?.message || err);
            showStepError('No se pudo eliminar el movimiento del ciclo.');
        }
    }

    // ANEXO 20 F2: tipos como cards sobrias del canon (.fcvw-choice, igual
    // que el paso 2 del wizard Finca) — 2 columnas desktop, 1 columna en
    // <=480px (regla de la familia) y altura de contenido, sin tiles
    // cuadrados estirados por el grid.
    function renderCrearTypes() {
        return `
            <div class="fcvw-tiles fcvw-tiles--choice">
                ${CREAR_TYPES.map((type) => `
                    <button type="button" class="fcvw-choice${state.tipoId === type.id ? ' is-selected' : ''}" data-fcct-tipo="${type.id}">
                        <i class="${type.icon}" aria-hidden="true"></i>
                        <span class="fcvw-choice__body">
                            <span class="fcvw-choice__label">${escapeHtml(type.label)}</span>
                            <span class="fcvw-choice__hint">${escapeHtml(type.hint)}</span>
                        </span>
                    </button>
                `).join('')}
            </div>
            <p class="fcvw-note">Los fiados no se crean aquí: su hogar es el Facturero de Clientes.</p>
        `;
    }

    function renderCrearCategoria() {
        // Solo agro_expenses.category y agro_income.categoria tienen columna.
        if (state.tipoId !== 'expense' && state.tipoId !== 'income') {
            return `
                <div class="fcvw-picker">
                    <span class="fcvw-picker__label">Categoría</span>
                    <p class="fcvw-note">Este tipo de registro no lleva categoría: continúa al formulario.</p>
                </div>
            `;
        }
        const vocabulary = state.tipoId === 'income'
            ? [...FARM_CATEGORIES, VENTA_CATEGORY]
            : FARM_CATEGORIES;
        const tiles = vocabulary.map((category) => `
            <button type="button" class="fcvw-tile fcvw-tile--cat${state.crearCategoria === category.id ? ' is-active' : ''}" data-fcct-crear-cat="${escapeHtml(category.id)}" aria-pressed="${state.crearCategoria === category.id ? 'true' : 'false'}" title="${escapeHtml(category.desc)}">
                <i class="${category.icon}" aria-hidden="true"></i>
                <span class="fcvw-tile__label">${escapeHtml(category.label)}</span>
                <span class="fcvw-tile__desc">${escapeHtml(category.desc)}</span>
            </button>
        `).join('');
        const ventasNote = state.tipoId === 'income'
            ? ' "Ventas" es la categoría natural de los ingresos por cosecha.'
            : '';
        return `
            <div class="fcvw-tiles fcvw-tiles--square">${tiles}</div>
            <p class="fcvw-note">La categoría se guarda con el registro usando el id canónico.${ventasNote}</p>
        `;
    }

    function renderCrearForm() {
        const rate = effectiveRate();
        const rateBlock = state.moneda !== 'USD'
            ? `<p class="fcvw-note">Tasa ${state.moneda}/USD de mercado (solo lectura): ${rate > 0 ? escapeHtml(String(rate)) : 'sin tasa disponible ahora'}.</p>`
            : '';
        return `
            <div class="fcflow-field">
                <label class="fcflow-label" for="fcct-concepto">Concepto *</label>
                <input class="fcflow-input" type="text" id="fcct-concepto" value="${escapeHtml(state.concepto)}" placeholder="Ej: Fertilizante NPK — lote norte" autocomplete="off">
            </div>
            <div class="fcflow-field">
                <span class="fcflow-label">Moneda</span>
                <div class="fcvw-tiles fcvw-tiles--choice">
                    ${CURRENCY_OPTIONS.map((option) => `
                        <button type="button" class="fcvw-choice${state.moneda === option.value ? ' is-selected' : ''}" data-fcct-moneda="${option.value}">
                            <i class="fa-solid fa-coins" aria-hidden="true"></i>
                            <span class="fcvw-choice__body"><span class="fcvw-choice__label">${escapeHtml(option.label)}</span></span>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="fcflow-field">
                <label class="fcflow-label" for="fcct-monto">Monto *</label>
                <input class="fcflow-input" type="number" id="fcct-monto" min="0.01" step="0.01" inputmode="decimal" value="${escapeHtml(state.monto)}" placeholder="0.00">
            </div>
            <div class="fcflow-field">
                <label class="fcflow-label" for="fcct-fecha">Fecha *</label>
                <input class="fcflow-input" type="date" id="fcct-fecha" max="${todayLocalIso()}" value="${escapeHtml(state.fecha)}">
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
                <div class="fcflow-summary__row"><dt>Cultivo</dt><dd>${escapeHtml(cropLabel())}</dd></div>
                <div class="fcflow-summary__row"><dt>Categoría</dt><dd>${escapeHtml(state.crearCategoria ? getCategoryLabel(state.crearCategoria) : 'Sin categoría')}</dd></div>
                <div class="fcflow-summary__row"><dt>Concepto</dt><dd>${escapeHtml(state.concepto || '—')}</dd></div>
                <div class="fcflow-summary__row"><dt>Monto</dt><dd><strong>${escapeHtml(formatMoney({ monto: amount, currency: state.moneda }))}</strong></dd></div>
                ${state.moneda !== 'USD' ? `<div class="fcflow-summary__row"><dt>≈ USD</dt><dd>${usd != null ? `$${usd.toFixed(2)}` : 'sin tasa'}</dd></div>` : ''}
                <div class="fcflow-summary__row"><dt>Fecha</dt><dd>${escapeHtml(state.fecha)}</dd></div>
            </dl>
            <p class="fcvw-note">Registro ligado al cultivo (crop_id). Si el cultivo tiene finca, se anota también; si no, el registro vive igual en este facturero.</p>
        `;
    }

    function renderCrearDone() {
        return `
            <div class="fcflow-done">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                <p class="fcflow-done__title">Registro guardado.</p>
                <p class="fcflow-done__desc">${escapeHtml(state.concepto)} · ${escapeHtml(state.crearCategoria ? getCategoryLabel(state.crearCategoria) : 'Sin categoría')}</p>
                <p class="fcvw-note">Cultivo: ${escapeHtml(cropLabel())}.</p>
                <div class="fcflow-done__actions">
                    <button type="button" class="btn-gold" data-fcct-goto-ver>Ver registros</button>
                    <button type="button" class="btn-outline-gold" data-fcct-create-otro>Crear otro</button>
                </div>
            </div>
        `;
    }

    function bodyHtml() {
        if (state.paso <= 1) return renderGate();
        if (state.rama === RAMA_VER) {
            if (state.paso === 2) return renderContextPicker();
            if (state.paso === 3) return renderVerTiles();
            if (state.paso === 4) return renderVerCategoria();
            return renderVerList();
        }
        if (state.paso === 2) return renderCrearTypes();
        if (state.paso === 3) return renderContextPicker({ obligatorio: true });
        if (state.paso === 4) return renderCrearCategoria();
        if (state.paso === 5) return renderCrearForm();
        return state.created ? renderCrearDone() : renderCrearReview();
    }

    function footerHtml() {
        if (state.paso <= 1) return '';
        if (state.rama === RAMA_CREAR && state.paso === CREAR_TOTAL && state.created) return '';
        const backBtn = '<button type="button" class="btn-outline-gold" data-fcct-back>Atrás</button>';
        const isLastVer = state.rama === RAMA_VER && state.paso === VER_TOTAL;
        const nextLabel = state.rama === RAMA_CREAR && state.paso === CREAR_TOTAL ? 'Confirmar' : 'Siguiente';
        const nextBtn = isLastVer
            ? ''
            : `<button type="button" class="btn-gold" data-fcct-next ${state.saving ? 'disabled' : ''}>${state.saving ? 'Guardando…' : nextLabel}</button>`;
        return `<div class="fcvw__footer">${backBtn}${nextBtn}</div>`;
    }

    function guideText() {
        if (state.paso <= 1) return '¿Qué quieres hacer en el facturero del cultivo?';
        if (state.rama === RAMA_VER) {
            if (state.paso === 2) return 'Elige la finca y el cultivo que quieres leer.';
            if (state.paso === 3) return '¿Qué tipo de registros quieres ver?';
            if (state.paso === 4) return '¿Qué categoría quieres ver?';
            return 'Registros del cultivo, tipo y categoría elegidos.';
        }
        if (state.paso === 2) return '¿Qué tipo de movimiento vas a registrar?';
        if (state.paso === 3) return '¿De qué cultivo es el movimiento?';
        if (state.paso === 4) return '¿En qué categoría encaja el movimiento?';
        if (state.paso === 5) return 'Detalles del movimiento.';
        return 'Revisión final.';
    }

    function subtitle() {
        if (state.paso <= 1) return '';
        return state.rama === RAMA_CREAR
            ? 'Creación de registro del cultivo'
            : 'Ver registros del cultivo';
    }

    function render() {
        if (!alive) return;
        reconcileCropSelection();
        const sub = subtitle();
        root.innerHTML = `
            <div class="fcwz">
                <div class="fcvw__topbar">
                    <button type="button" class="fcvw__back" data-fcct-exit>
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                        Volver
                    </button>
                    ${state.paso >= 2 ? `
                    <button type="button" class="fcvw__home" data-fcct-home aria-label="Ir al inicio del facturero">
                        <i class="fa-solid fa-house" aria-hidden="true"></i>
                        <span class="fcvw__home-label">Ir a inicio</span>
                    </button>` : ''}
                    <p class="fcvw__title">Facturero del Cultivo${sub ? `<span class="fcvw__subtitle">${escapeHtml(sub)}</span>` : ''}</p>
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
        root.querySelector('[data-fcct-exit]')?.addEventListener('click', goBack);
        root.querySelector('[data-fcct-home]')?.addEventListener('click', () => { void goToStart(); });
        root.querySelector('[data-fcct-back]')?.addEventListener('click', goBack);
        root.querySelector('[data-fcct-next]')?.addEventListener('click', () => {
            if (state.rama === RAMA_CREAR && state.paso === CREAR_TOTAL && !state.created) {
                void confirmCreate();
                return;
            }
            goNext();
        });

        const conceptoInput = root.querySelector('#fcct-concepto');
        conceptoInput?.addEventListener('input', () => { state.concepto = conceptoInput.value; });
        const montoInput = root.querySelector('#fcct-monto');
        montoInput?.addEventListener('input', () => { state.monto = montoInput.value; });
        const fechaInput = root.querySelector('#fcct-fecha');
        fechaInput?.addEventListener('input', () => { state.fecha = fechaInput.value || todayLocalIso(); });
        root.querySelectorAll('[data-fcct-moneda]').forEach((button) => {
            button.addEventListener('click', () => {
                state.moneda = String(button.getAttribute('data-fcct-moneda') || 'COP');
                render();
            });
        });

        root.querySelector('[data-fcct-goto-ver]')?.addEventListener('click', () => {
            // D4: a la rama VER con el MISMO cultivo y el tile canonico del
            // tipo recien creado. Ambos scopes se resetean para que la fila
            // nueva (y los conteos) aparezcan sin recargar (14-B).
            state.tileId = TYPE_TO_TILE[state.tipoId] || 'gastos';
            state.categoria = '';
            const createdTipo = state.tipoId;
            resetCreateFlow();
            state.tipoId = createdTipo;
            state.listScope = { phase: 'loading', error: '', rows: [], stamp: null, requestId: 0 };
            state.countsScope = { phase: 'loading', error: '', counts: {}, stamp: null, requestId: 0 };
            goStep(VER_TOTAL, RAMA_VER);
        });
        root.querySelector('[data-fcct-create-otro]')?.addEventListener('click', () => {
            // D4: crear otro arranca desde el paso de TIPO, conservando el
            // contexto (finca y cultivo elegidos).
            resetCreateFlow();
            goStep(2, RAMA_CREAR);
        });

        root.querySelectorAll('[data-fcct-rama]').forEach((button) => {
            button.addEventListener('click', () => {
                state.rama = button.getAttribute('data-fcct-rama') === RAMA_CREAR ? RAMA_CREAR : RAMA_VER;
                state.contextNotice = '';
                goStep(2);
            });
        });
        root.querySelectorAll('[data-fcct-farm]').forEach((button) => {
            button.addEventListener('click', () => {
                state.farmId = String(button.getAttribute('data-fcct-farm') || '').trim();
                state.contextNotice = '';
                // Regla estricta: cambiar de finca reconcilia el cultivo (nota
                // visible si cae a Vista general).
                reconcileCropSelection();
                render();
            });
        });
        root.querySelectorAll('[data-fcct-estado]').forEach((button) => {
            button.addEventListener('click', () => {
                const next = String(button.getAttribute('data-fcct-estado') || '').trim() || ESTADO_TODOS;
                if (next === state.estadoId) return;
                state.estadoId = next;
                state.contextNotice = '';
                // El cultivo individual se conserva solo si pertenece al nuevo
                // grupo (y a la finca); si los datos aun no estan listos, la
                // reconciliacion del render lo dirime con nota cuando lleguen.
                if (state.cropId && getCropsState().phase === 'ready'
                    && (next === ESTADO_TODOS || getCycleGroups().known)
                    && !getEstadoScopedCrops().some((crop) => String(crop?.id || '') === state.cropId)) {
                    state.cropId = '';
                }
                render();
            });
        });
        root.querySelectorAll('[data-fcct-crop]').forEach((button) => {
            button.addEventListener('click', () => {
                state.cropId = String(button.getAttribute('data-fcct-crop') || '').trim();
                state.contextNotice = '';
                render();
            });
        });
        root.querySelector('[data-fcct-retry-crops]')?.addEventListener('click', render);
        root.querySelector('[data-fcct-retry-counts]')?.addEventListener('click', () => { void fetchTileCounts(); });
        root.querySelector('[data-fcct-retry-list]')?.addEventListener('click', () => { void fetchListRows(); });
        root.querySelector('[data-fcct-refresh-list]')?.addEventListener('click', () => { void fetchListRows(); });
        root.querySelectorAll('[data-fcct-edit-row]').forEach((button) => {
            button.addEventListener('click', () => { void openRowEditor(button.getAttribute('data-fcct-edit-row')); });
        });
        root.querySelectorAll('[data-fcct-del-row]').forEach((button) => {
            button.addEventListener('click', () => { void deleteRowFromList(button.getAttribute('data-fcct-del-row')); });
        });
        root.querySelectorAll('[data-fcct-op-edit-row]').forEach((button) => {
            button.addEventListener('click', () => { void openOpRowEditor(button.getAttribute('data-fcct-op-edit-row')); });
        });
        root.querySelectorAll('[data-fcct-op-del-row]').forEach((button) => {
            button.addEventListener('click', () => { void deleteOpRowFromList(button.getAttribute('data-fcct-op-del-row')); });
        });

        root.querySelectorAll('[data-fcct-tile]').forEach((button) => {
            button.addEventListener('click', () => {
                const nextTile = String(button.getAttribute('data-fcct-tile') || '').trim() || 'gastos';
                if (nextTile !== state.tileId) {
                    state.tileId = nextTile;
                    // La categoria pertenece al tile anterior: se resetea.
                    state.categoria = '';
                }
                render();
            });
        });
        root.querySelectorAll('[data-fcct-cat]').forEach((button) => {
            button.addEventListener('click', () => {
                state.categoria = String(button.getAttribute('data-fcct-cat') || '').trim();
                render();
            });
        });
        root.querySelectorAll('[data-fcct-tipo]').forEach((button) => {
            button.addEventListener('click', () => {
                const nextTipo = String(button.getAttribute('data-fcct-tipo') || '').trim();
                if (nextTipo !== state.tipoId) {
                    state.tipoId = nextTipo;
                    // "Ventas" solo existe para income: cambiar de tipo resetea
                    // la categoria para no escribir ids cruzados.
                    state.crearCategoria = '';
                }
                render();
            });
        });
        root.querySelectorAll('[data-fcct-crear-cat]').forEach((button) => {
            button.addEventListener('click', () => {
                state.crearCategoria = String(button.getAttribute('data-fcct-crear-cat') || '').trim();
                render();
            });
        });
    }

    function onCropsReady() {
        if (alive) render();
    }

    // ANEXO 21: cuando el monolito publica los grupos de Mis Cultivos, el
    // nivel 1 deja de estar "revisando" y la reconciliación puede dirimir.
    function onCyclesSnapshot() {
        if (alive) render();
    }

    function destroy() {
        alive = false;
        window.removeEventListener(CROPS_READY_EVENT, onCropsReady);
        window.removeEventListener(CYCLES_SNAPSHOT_EVENT, onCyclesSnapshot);
        document.body.classList.remove(WIZARD_BODY_CLASS);
    }

    document.body.classList.add(WIZARD_BODY_CLASS);
    window.addEventListener(CROPS_READY_EVENT, onCropsReady);
    window.addEventListener(CYCLES_SNAPSHOT_EVENT, onCyclesSnapshot);
    render();

    // F5: recargar lo que el paso restaurado necesite (14-B/B7).
    if (state.rama === RAMA_VER && state.paso === 3) {
        void fetchTileCounts();
    }
    if (state.rama === RAMA_VER && state.paso >= 4) {
        void fetchListRows();
    }

    return { destroy };
}
