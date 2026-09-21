/**
 * Facturero Personal — Wizard (S8).
 * Ruta hash: #view=facturero-personal&subview=wizard&paso=N&rama=ver|crear
 *            &cat=<slug>&done=1
 * F5 restaura paso/rama/cat por hash (ANEXO 12: sin storage).
 *
 * Partición (MANIFIESTO 4.5): SOLO registros sin finca y sin cultivo
 * (ambos null) — sin selectores por diseño (§4.5:494). Los movimientos de
 * finca viven en el wizard de Finca; los de cultivo, en el de Cultivo.
 *
 * VER 4 pasos: gate -> tile (conteos reales) -> categoría -> lista.
 * CREAR 5 pasos: gate -> tipo -> categoría -> formulario -> confirmación.
 * Sin fiado en CREAR (hogar: Facturero de Clientes). Escritura al ledger con
 * farm_id null y crop_id null (la partición se define por ambos).
 *
 * Lectura y edición por agro-ledger-reader.js + agro-facturero-finca-edit.js
 * (reuso; el editor jamás toca farm_id/crop_id). Legacy duerme con
 * subview=wizard (mismo guard que Finca/Cultivo).
 *
 * ADN V12: clases de la familia fcvw/fcwz/fcflow en modo lectura; solo la
 * franja de identidad vive en agro-facturero-personal-wizard.css.
 */

import {
    LEDGER_TILES,
    fetchTileRows,
    translateCategoryPersonal,
    stampScope,
    isScopeStale,
    isLedgerRowEditable
} from './agro-ledger-reader.js';
import { supabase } from '../assets/js/config/supabase-config.js';
import { initExchangeRates, getRate, convertToUSD } from './agro-exchange.js';
import { assertOperationalPeriodOpen } from './agro-period-cycles.js';
import { escapeHtml, renderInto } from './agro-safe-html.js';

const ROOT_ID = 'agro-operational-root';
const PERSONAL_VIEWS = new Set(['facturero-personal']);
const WIZARD_BODY_CLASS = 'agro-fcv-wizard-active';

const RAMA_VER = 'ver';
const RAMA_CREAR = 'crear';
const VER_TOTAL = 4;
const CREAR_TOTAL = 5;

// Partición fija de este facturero: registros sin finca y sin cultivo.
const PARTITION = Object.freeze({ preset: 'orphan' });

const VER_TILES = [
    { id: 'gastos', label: 'Gastos', icon: 'fa-solid fa-receipt' },
    { id: 'ingresos', label: 'Ingresos', icon: 'fa-solid fa-circle-check' },
    { id: 'fiados', label: 'Fiados', icon: 'fa-solid fa-handshake' },
    { id: 'perdidas', label: 'Pérdidas', icon: 'fa-solid fa-circle-xmark' },
    { id: 'donaciones', label: 'Donaciones', icon: 'fa-solid fa-hand-holding-heart' }
];

// Sin fiado en creación: su hogar es Facturero de Clientes (§4.5.1).
const CREAR_TYPES = [
    { id: 'expense', label: 'Gasto', icon: 'fa-solid fa-receipt', hint: 'Algo que pagas fuera de la finca y del cultivo.' },
    { id: 'income', label: 'Ingreso', icon: 'fa-solid fa-hand-holding-dollar', hint: 'Dinero que entra fuera de la finca y del cultivo.' },
    { id: 'donation', label: 'Donación', icon: 'fa-solid fa-gift', hint: 'Producción o dinero regalado.' },
    { id: 'loss', label: 'Pérdida', icon: 'fa-solid fa-circle-xmark', hint: 'Algo que se pierde y se cierra.' }
];

// Categorías personales (ANEXO 22): el bolsillo del dueño, no el campo —
// una pala pagada de tu bolsillo vive aquí aunque termine usada en la finca.
// Legacy (ids de finca, vacío, 'general') se lee en Otros (sin mapa inventado).
const PERSONAL_GASTOS = [
    { id: 'p_herramientas', label: 'Herramientas y equipo', desc: 'Pala, baretón, machete', icon: 'fa-solid fa-hammer' },
    { id: 'p_ropa', label: 'Ropa y protección', desc: 'Ropa de trabajo, botas', icon: 'fa-solid fa-shirt' },
    { id: 'p_transporte', label: 'Transporte', desc: 'Pasajes, gasolina personal', icon: 'fa-solid fa-bus-simple' },
    { id: 'p_alimentacion', label: 'Alimentación y mercado', desc: 'Mercado y comida del día', icon: 'fa-solid fa-basket-shopping' },
    { id: 'p_salud', label: 'Salud', desc: 'Medicinas, consultas', icon: 'fa-solid fa-heart-pulse' },
    { id: 'p_otros', label: 'Otros', desc: 'Lo que no encaja arriba', icon: 'fa-solid fa-ellipsis' }
];
const PERSONAL_INGRESOS = [
    { id: 'p_trabajo', label: 'Trabajo y jornales', desc: 'Sueldo, jornales', icon: 'fa-solid fa-person-digging' },
    { id: 'p_ventas', label: 'Ventas propias', desc: 'Lo que vendes por tu cuenta', icon: 'fa-solid fa-tag' },
    { id: 'p_servicios', label: 'Servicios y encargos', desc: 'Encargos que te pagan', icon: 'fa-solid fa-screwdriver-wrench' },
    { id: 'p_otros', label: 'Otros', desc: 'Lo que no encaja arriba', icon: 'fa-solid fa-ellipsis' }
];
const CATEGORY_FIELD_TILES = new Set(['gastos', 'ingresos']);

// ANEXO 22: el vocabulario personal solo se aplica donde el registro lleva
// categoría (gastos/ingresos); el resto de tiles conserva la lectura sin
// categoría del traductor de finca (CAT-2 espejo: pérdidas/donaciones sin
// categoría).
function translateForTile(tileId) {
    return CATEGORY_FIELD_TILES.has(tileId) ? translateCategoryPersonal : undefined;
}

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

// Escape y sink de render centralizados en agro-safe-html.js: DOMPurify
// (sanitizer modelado por CodeQL) corta el flujo taint DOM-text→HTML de las
// alertas #74-76 y neutraliza en runtime interpolaciones sin escapar.

let activeSession = null;

export function initAgroPersonalWizard() {
    window.addEventListener('agro:shell:view-changed', (event) => {
        const view = String(event?.detail?.view || '').trim().toLowerCase();
        const subview = String(event?.detail?.subview || '').trim().toLowerCase();
        if (PERSONAL_VIEWS.has(view) && subview === 'wizard') {
            mountWizard();
            return;
        }
        destroyWizard();
    });
    if (isWizardHashActive()) {
        mountWizard();
    }
}

function isWizardHashActive() {
    try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const view = String(hash.get('view') || '').trim().toLowerCase();
        const subview = String(hash.get('subview') || '').trim().toLowerCase();
        return PERSONAL_VIEWS.has(view) && subview === 'wizard';
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
            cat: String(hash.get('cat') || '').trim(),
            done: String(hash.get('done') || '').trim() === '1'
        };
    } catch (_err) {
        return { paso: null, rama: RAMA_VER, cat: '', done: false };
    }
}

function createSession(root) {
    let alive = true;
    const source = readWizardHash();

    const state = {
        rama: source.rama === RAMA_CREAR ? RAMA_CREAR : RAMA_VER,
        paso: 1,
        tileId: 'gastos',
        tipoId: '',
        categoria: String(source.cat || ''),
        crearCategoria: String(source.cat || ''),
        concepto: '',
        monto: '',
        moneda: 'COP',
        fecha: todayLocalIso(),
        saving: false,
        created: source.done === true && source.rama === RAMA_CREAR && Number(source.paso) === CREAR_TOTAL,
        countsScope: { phase: 'loading', error: '', counts: {}, stamp: null, requestId: 0 },
        listScope: { phase: 'loading', error: '', rows: [], stamp: null, requestId: 0 },
        exchangeRates: { USD: 1, COP: null, VES: null }
    };

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

    state.paso = clampPaso(Number(source.paso) || 1);

    function totalPasos() {
        return state.rama === RAMA_CREAR ? CREAR_TOTAL : VER_TOTAL;
    }

    function todayLocalIso() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // ---------- Lectura (misma disciplina 14-B/B7 que Cultivo) ----------

    function listScopeStale() {
        const scope = state.listScope;
        if (scope.phase === 'loading' && scope.requestId === 0) return true;
        return isScopeStale(scope.stamp, { tileId: state.tileId, partition: PARTITION });
    }

    async function fetchListRows() {
        const scope = state.listScope;
        const requestId = ++scope.requestId;
        scope.phase = 'loading';
        scope.error = '';
        scope.stamp = stampScope({ tileId: state.tileId, partition: PARTITION });
        render();
        try {
            const rows = await fetchTileRows({ tileId: state.tileId, partition: PARTITION, translate: translateForTile(state.tileId) });
            if (requestId !== scope.requestId || !alive) return;
            scope.rows = rows;
            scope.phase = 'ready';
        } catch (err) {
            if (requestId !== scope.requestId || !alive) return;
            console.error('[PersonalWizard] tile load failed:', err?.message || err);
            scope.rows = [];
            scope.error = String(err?.message || 'No se pudo leer los registros.');
            scope.phase = 'error';
        } finally {
            if (requestId === scope.requestId && alive) render();
        }
    }

    async function fetchTileCounts() {
        const scope = state.countsScope;
        const requestId = ++scope.requestId;
        scope.phase = 'loading';
        scope.error = '';
        scope.stamp = stampScope({ tileId: '__counts__', partition: PARTITION });
        render();
        try {
            const results = await Promise.all(VER_TILES.map((tile) =>
                fetchTileRows({ tileId: tile.id, partition: PARTITION, translate: translateForTile(tile.id) })
            ));
            if (requestId !== scope.requestId || !alive) return;
            const counts = {};
            VER_TILES.forEach((tile, index) => { counts[tile.id] = results[index].length; });
            scope.counts = counts;
            scope.phase = 'ready';
        } catch (err) {
            if (requestId !== scope.requestId || !alive) return;
            console.error('[PersonalWizard] tile counts failed:', err?.message || err);
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
            params.set('view', 'facturero-personal');
            params.set('subview', 'wizard');
            params.set('paso', String(state.paso));
            params.set('rama', state.rama);
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

    // ---------- Navegación (ANEXO 19) ----------

    function goStep(nextPaso, nextRama) {
        if (nextRama) state.rama = nextRama;
        state.paso = clampPaso(nextPaso);
        render();
        if (state.rama === RAMA_VER && state.paso === 2) {
            void fetchTileCounts();
        }
        if (state.rama === RAMA_VER && state.paso >= 3) {
            const isEnteringStep3 = state.paso === 3;
            const isJumpingToStep4 = state.paso === VER_TOTAL && !listScopeStale();
            if (isEnteringStep3 || isJumpingToStep4 || listScopeStale()) {
                void fetchListRows();
            }
        }
    }

    function goNext() {
        if (state.rama === RAMA_CREAR && state.paso === 4 && !formValid()) {
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

    // ANEXO 19: borrador CREAR sin guardar (defaults no cuentan).
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
        state.tipoId = '';
        state.crearCategoria = '';
        state.concepto = '';
        state.monto = '';
        state.moneda = 'COP';
        state.fecha = todayLocalIso();
        state.created = false;
    }

    function showStepError(message) {
        let node = root.querySelector('[data-fcp-error]');
        if (!node) {
            node = document.createElement('div');
            node.setAttribute('data-fcp-error', '');
            root.querySelector('.fcwz__body')?.prepend(node);
        }
        node.innerHTML = `
            <div class="fcflow-note fcflow-note--warning">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <span>${escapeHtml(message)}</span>
            </div>`;
    }

    // ---------- Creación (ambos null por partición) ----------

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

            // Partición Personal: sin finca y sin cultivo, por definición.
            const table = TYPE_TO_TABLE[economicType] || 'agro_expenses';
            const payload = {
                user_id: user.id,
                farm_id: null,
                crop_id: null,
                fecha: state.fecha,
                concepto: state.concepto.trim(),
                monto: amount,
                currency: state.moneda,
                exchange_rate: state.moneda === 'USD' ? 1 : rate,
                monto_usd: amountUsd
            };
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
            console.error('[PersonalWizard] create failed:', err?.message || err);
            showStepError(err?.message || 'No se pudo guardar el registro.');
        } finally {
            state.saving = false;
            render();
        }
    }

    // ---------- Render ----------

    function renderGate() {
        return `
            <div class="fcp-identity">
                <i class="fa-solid fa-user" aria-hidden="true"></i>
                <p>Aquí viven tus registros <strong>sin finca y sin cultivo</strong>: lo personal del negocio agrícola. Los movimientos de una finca viven en el Facturero de la Finca; los de un cultivo, en el Facturero del Cultivo.</p>
            </div>
            <div class="fcflow-doors">
                <button type="button" class="fcflow-door" data-fcp-rama="${RAMA_CREAR}">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i>
                    <span class="fcflow-door__title">Crear registro</span>
                    <span class="fcflow-door__desc">Registra un movimiento personal, paso a paso.</span>
                </button>
                <button type="button" class="fcflow-door" data-fcp-rama="${RAMA_VER}">
                    <i class="fa-solid fa-list-check" aria-hidden="true"></i>
                    <span class="fcflow-door__title">Ver registros</span>
                    <span class="fcflow-door__desc">Explora tus registros personales por tipo.</span>
                </button>
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
                <button type="button" class="fcvw-btn" data-fcp-retry-counts><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
            `;
        } else {
            statusHtml = '<p class="fcvw-note">Conteos reales de tus registros personales. Un cero significa cero.</p>';
        }
        return `
            <div class="fcvw-tiles fcvw-tiles--square">
                ${VER_TILES.map((tile) => `
                    <button type="button" class="fcvw-tile${state.tileId === tile.id ? ' is-active' : ''}" data-fcp-tile="${tile.id}" aria-pressed="${state.tileId === tile.id ? 'true' : 'false'}">
                        <i class="${tile.icon}" aria-hidden="true"></i>
                        <span class="fcvw-tile__label">${escapeHtml(tile.label)}</span>
                        ${countsHtml(tile)}
                    </button>
                `).join('')}
            </div>
            ${statusHtml}
        `;
    }

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
                    <button type="button" class="fcvw-btn" data-fcp-retry-list><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
                </div>
            `;
        }
        if (!CATEGORY_FIELD_TILES.has(state.tileId)) {
            return `
                <div class="fcvw-picker">
                    <span class="fcvw-picker__label">Categoría</span>
                    <div class="fcvw-picker__strip" role="group" aria-label="Filtrar por categoría">
                        <button type="button" class="fcvw-chip${!state.categoria ? ' is-active' : ''}" data-fcp-cat="">Todas</button>
                        <button type="button" class="fcvw-chip${state.categoria === '__sin__' ? ' is-active' : ''}" data-fcp-cat="__sin__">Sin categoría</button>
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
            ? PERSONAL_INGRESOS
            : PERSONAL_GASTOS;
        const tiles = vocabulary.map((category) => `
            <button type="button" class="fcvw-tile fcvw-tile--cat${state.categoria === category.id ? ' is-active' : ''}" data-fcp-cat="${escapeHtml(category.id)}" aria-pressed="${state.categoria === category.id ? 'true' : 'false'}" title="${escapeHtml(category.desc)}">
                <i class="${category.icon}" aria-hidden="true"></i>
                <span class="fcvw-tile__label">${escapeHtml(category.label)}</span>
                <span class="fcvw-tile__desc">${escapeHtml(category.desc)}</span>
                <span class="fcvw-tile__count">${counts.get(category.id) || 0}</span>
            </button>
        `).join('');

        const comodines = [
            `<button type="button" class="fcvw-chip${!state.categoria ? ' is-active' : ''}" data-fcp-cat="">Todas</button>`,
            ...(sinCategoriaCount > 0 ? [`<button type="button" class="fcvw-chip${state.categoria === '__sin__' ? ' is-active' : ''}" data-fcp-cat="__sin__">Sin categoría (${sinCategoriaCount})</button>`] : [])
        ].join('');

        return `
            <div class="fcvw-tiles fcvw-tiles--square">${tiles}</div>
            <div class="fcvw-picker__strip" role="group" aria-label="Comodines de categoría">${comodines}</div>
            <p class="fcvw-note">El número de cada categoría es real para tus registros personales. Los registros antiguos sin categoría personal se leen en Otros.</p>
        `;
    }

    function getCategoryLabel(id) {
        const category = [...PERSONAL_GASTOS, ...PERSONAL_INGRESOS].find((entry) => entry.id === id);
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
                    <p class="cartera-viva-empty__copy">Buscando ${tile.label.toLowerCase()} personales.</p>
                </div>
            `;
        }
        if (scope.phase === 'error') {
            return `
                <div class="cartera-viva-empty">
                    <h3 class="cartera-viva-empty__title">No se pudo leer los registros</h3>
                    <p class="cartera-viva-empty__copy">${escapeHtml(scope.error)}</p>
                    <button type="button" class="fcvw-btn" data-fcp-retry-list><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
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
                    <h3 class="cartera-viva-empty__title">Sin ${tile.label.toLowerCase()} personales</h3>
                    <p class="cartera-viva-empty__copy">Aquí solo aparecen los registros sin finca y sin cultivo. Lo que registraste bajo una finca vive en el Facturero de la Finca; lo de un cultivo, en el Facturero del Cultivo. Si esperabas registros y no aparecen, el lector deja un aviso técnico (canary) en la consola.</p>
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
                            <button type="button" class="fcwz-iconbtn" data-fcp-edit-row="${escapeHtml(String(row.id || ''))}" aria-label="Editar registro"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                            <button type="button" class="fcwz-iconbtn" data-fcp-del-row="${escapeHtml(String(row.id || ''))}" aria-label="Eliminar registro"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
                        </span>` : ''}
                        ${row?.origen === 'operacional' ? `
                        <span class="fcwz-movements__actions">
                            <button type="button" class="fcwz-iconbtn" data-fcp-op-edit-row="${escapeHtml(String(row.id || ''))}" aria-label="Editar movimiento del ciclo"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                            <button type="button" class="fcwz-iconbtn" data-fcp-op-del-row="${escapeHtml(String(row.id || ''))}" aria-label="Eliminar movimiento del ciclo"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
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
            <p class="fcvw-clients__context">${escapeHtml(tile.label)} · Registros personales${catPart}</p>
            <div class="agro-privacy-strip" aria-label="Privacidad">
                <span class="agro-privacy-strip__label">Privacidad</span>
                <button type="button" class="btn-privacy-toggle" data-money-privacy-control="toggle" aria-pressed="false">Ocultar montos</button>
            </div>
            ${renderVerListBody()}
            <div class="fcvw-clients__bar">
                <button type="button" class="fcvw-btn" data-fcp-refresh-list>
                    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    Actualizar
                </button>
            </div>
        `;
    }

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
            console.error('[PersonalWizard] edit module failed:', err?.message || err);
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
            console.error('[PersonalWizard] delete failed:', err?.message || err);
            showStepError('No se pudo eliminar el registro.');
        }
    }

    // ANEXO 20 F1: históricos operacionales gestionables (Opción A).
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
            console.error('[PersonalWizard] op edit failed:', err?.message || err);
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
            console.error('[PersonalWizard] op delete failed:', err?.message || err);
            showStepError('No se pudo eliminar el movimiento del ciclo.');
        }
    }

    function renderCrearTypes() {
        return `
            <div class="fcvw-tiles fcvw-tiles--choice">
                ${CREAR_TYPES.map((type) => `
                    <button type="button" class="fcvw-choice${state.tipoId === type.id ? ' is-selected' : ''}" data-fcp-tipo="${type.id}">
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
        if (state.tipoId !== 'expense' && state.tipoId !== 'income') {
            return `
                <div class="fcvw-picker">
                    <span class="fcvw-picker__label">Categoría</span>
                    <p class="fcvw-note">Este tipo de registro no lleva categoría: continúa al formulario.</p>
                </div>
            `;
        }
        const vocabulary = state.tipoId === 'income'
            ? PERSONAL_INGRESOS
            : PERSONAL_GASTOS;
        const tiles = vocabulary.map((category) => `
            <button type="button" class="fcvw-tile fcvw-tile--cat${state.crearCategoria === category.id ? ' is-active' : ''}" data-fcp-crear-cat="${escapeHtml(category.id)}" aria-pressed="${state.crearCategoria === category.id ? 'true' : 'false'}" title="${escapeHtml(category.desc)}">
                <i class="${category.icon}" aria-hidden="true"></i>
                <span class="fcvw-tile__label">${escapeHtml(category.label)}</span>
                <span class="fcvw-tile__desc">${escapeHtml(category.desc)}</span>
            </button>
        `).join('');
        return `
            <div class="fcvw-tiles fcvw-tiles--square">${tiles}</div>
            <p class="fcvw-note">La categoría se guarda con el registro usando el id canónico.</p>
        `;
    }

    function renderCrearForm() {
        const rate = effectiveRate();
        const rateBlock = state.moneda !== 'USD'
            ? `<p class="fcvw-note">Tasa ${state.moneda}/USD de mercado (solo lectura): ${rate > 0 ? escapeHtml(String(rate)) : 'sin tasa disponible ahora'}.</p>`
            : '';
        return `
            <div class="fcflow-field">
                <label class="fcflow-label" for="fcp-concepto">Concepto *</label>
                <input class="fcflow-input" type="text" id="fcp-concepto" value="${escapeHtml(state.concepto)}" placeholder="Ej: Botas de cuero Titan" autocomplete="off">
            </div>
            <div class="fcflow-field">
                <span class="fcflow-label">Moneda</span>
                <div class="fcvw-tiles fcvw-tiles--choice">
                    ${CURRENCY_OPTIONS.map((option) => `
                        <button type="button" class="fcvw-choice${state.moneda === option.value ? ' is-selected' : ''}" data-fcp-moneda="${option.value}">
                            <i class="fa-solid fa-coins" aria-hidden="true"></i>
                            <span class="fcvw-choice__body"><span class="fcvw-choice__label">${escapeHtml(option.label)}</span></span>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="fcflow-field">
                <label class="fcflow-label" for="fcp-monto">Monto *</label>
                <input class="fcflow-input" type="number" id="fcp-monto" min="0.01" step="0.01" inputmode="decimal" value="${escapeHtml(state.monto)}" placeholder="0.00">
            </div>
            <div class="fcflow-field">
                <label class="fcflow-label" for="fcp-fecha">Fecha *</label>
                <input class="fcflow-input" type="date" id="fcp-fecha" max="${todayLocalIso()}" value="${escapeHtml(state.fecha)}">
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
                <div class="fcflow-summary__row"><dt>Categoría</dt><dd>${escapeHtml(state.crearCategoria ? getCategoryLabel(state.crearCategoria) : 'Sin categoría')}</dd></div>
                <div class="fcflow-summary__row"><dt>Concepto</dt><dd>${escapeHtml(state.concepto || '—')}</dd></div>
                <div class="fcflow-summary__row"><dt>Monto</dt><dd><strong>${escapeHtml(formatMoney({ monto: amount, currency: state.moneda }))}</strong></dd></div>
                ${state.moneda !== 'USD' ? `<div class="fcflow-summary__row"><dt>≈ USD</dt><dd>${usd != null ? `$${usd.toFixed(2)}` : 'sin tasa'}</dd></div>` : ''}
                <div class="fcflow-summary__row"><dt>Fecha</dt><dd>${escapeHtml(state.fecha)}</dd></div>
            </dl>
            <p class="fcvw-note">Registro personal: sin finca y sin cultivo.</p>
        `;
    }

    function renderCrearDone() {
        return `
            <div class="fcflow-done">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                <p class="fcflow-done__title">Registro guardado.</p>
                <p class="fcflow-done__desc">${escapeHtml(state.concepto)} · ${escapeHtml(state.crearCategoria ? getCategoryLabel(state.crearCategoria) : 'Sin categoría')}</p>
                <p class="fcvw-note">Vive en tus registros personales (sin finca y sin cultivo).</p>
                <div class="fcflow-done__actions">
                    <button type="button" class="btn-gold" data-fcp-goto-ver>Ver registros</button>
                    <button type="button" class="btn-outline-gold" data-fcp-create-otro>Crear otro</button>
                </div>
            </div>
        `;
    }

    function bodyHtml() {
        if (state.paso <= 1) return renderGate();
        if (state.rama === RAMA_VER) {
            if (state.paso === 2) return renderVerTiles();
            if (state.paso === 3) return renderVerCategoria();
            return renderVerList();
        }
        if (state.paso === 2) return renderCrearTypes();
        if (state.paso === 3) return renderCrearCategoria();
        if (state.paso === 4) return renderCrearForm();
        return state.created ? renderCrearDone() : renderCrearReview();
    }

    function footerHtml() {
        if (state.paso <= 1) return '';
        if (state.rama === RAMA_CREAR && state.paso === CREAR_TOTAL && state.created) return '';
        const backBtn = '<button type="button" class="btn-outline-gold" data-fcp-back>Atrás</button>';
        const isLastVer = state.rama === RAMA_VER && state.paso === VER_TOTAL;
        const nextLabel = state.rama === RAMA_CREAR && state.paso === CREAR_TOTAL ? 'Confirmar' : 'Siguiente';
        const nextBtn = isLastVer
            ? ''
            : `<button type="button" class="btn-gold" data-fcp-next ${state.saving ? 'disabled' : ''}>${state.saving ? 'Guardando…' : nextLabel}</button>`;
        return `<div class="fcvw__footer">${backBtn}${nextBtn}</div>`;
    }

    function guideText() {
        if (state.paso <= 1) return '¿Qué quieres hacer en el facturero personal?';
        if (state.rama === RAMA_VER) {
            if (state.paso === 2) return '¿Qué tipo de registros quieres ver?';
            if (state.paso === 3) return '¿Qué categoría quieres ver?';
            return 'Registros personales del tipo y categoría elegidos.';
        }
        if (state.paso === 2) return '¿Qué tipo de movimiento vas a registrar?';
        if (state.paso === 3) return '¿En qué categoría encaja el movimiento?';
        if (state.paso === 4) return 'Cuéntale al facturero los detalles del movimiento.';
        return 'Revisa que todo esté correcto antes de confirmar.';
    }

    function subtitle() {
        if (state.paso <= 1) return '';
        return state.rama === RAMA_CREAR
            ? 'Creación de registro personal'
            : 'Ver registros personales';
    }

    function render() {
        if (!alive) return;
        const sub = subtitle();
        renderInto(root, `
            <div class="fcwz">
                <div class="fcvw__topbar">
                    <button type="button" class="fcvw__back" data-fcp-exit>
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                        Volver
                    </button>
                    ${state.paso >= 2 ? `
                    <button type="button" class="fcvw__home" data-fcp-home aria-label="Ir al inicio del facturero">
                        <i class="fa-solid fa-house" aria-hidden="true"></i>
                        <span class="fcvw__home-label">Ir a inicio</span>
                    </button>` : ''}
                    <p class="fcvw__title">Facturero Personal${sub ? `<span class="fcvw__subtitle">${escapeHtml(sub)}</span>` : ''}</p>
                    <span class="fcvw__step">Paso ${state.paso} de ${totalPasos()}</span>
                </div>
                <p class="fcvw__guide">${escapeHtml(guideText())}</p>
                <div class="fcwz__body">${bodyHtml()}</div>
                ${footerHtml()}
            </div>
        `);
        bindEvents();
        syncHash();
    }

    function bindEvents() {
        root.querySelector('[data-fcp-exit]')?.addEventListener('click', goBack);
        root.querySelector('[data-fcp-home]')?.addEventListener('click', () => { void goToStart(); });
        root.querySelector('[data-fcp-back]')?.addEventListener('click', goBack);
        root.querySelector('[data-fcp-next]')?.addEventListener('click', () => {
            if (state.rama === RAMA_CREAR && state.paso === CREAR_TOTAL && !state.created) {
                void confirmCreate();
                return;
            }
            goNext();
        });

        root.querySelectorAll('[data-fcp-rama]').forEach((button) => {
            button.addEventListener('click', () => {
                state.rama = button.getAttribute('data-fcp-rama') === RAMA_CREAR ? RAMA_CREAR : RAMA_VER;
                goStep(2);
            });
        });

        root.querySelector('[data-fcp-retry-counts]')?.addEventListener('click', () => { void fetchTileCounts(); });
        root.querySelector('[data-fcp-retry-list]')?.addEventListener('click', () => { void fetchListRows(); });
        root.querySelector('[data-fcp-refresh-list]')?.addEventListener('click', () => { void fetchListRows(); });
        root.querySelectorAll('[data-fcp-edit-row]').forEach((button) => {
            button.addEventListener('click', () => { void openRowEditor(button.getAttribute('data-fcp-edit-row')); });
        });
        root.querySelectorAll('[data-fcp-del-row]').forEach((button) => {
            button.addEventListener('click', () => { void deleteRowFromList(button.getAttribute('data-fcp-del-row')); });
        });
        root.querySelectorAll('[data-fcp-op-edit-row]').forEach((button) => {
            button.addEventListener('click', () => { void openOpRowEditor(button.getAttribute('data-fcp-op-edit-row')); });
        });
        root.querySelectorAll('[data-fcp-op-del-row]').forEach((button) => {
            button.addEventListener('click', () => { void deleteOpRowFromList(button.getAttribute('data-fcp-op-del-row')); });
        });

        root.querySelectorAll('[data-fcp-tile]').forEach((button) => {
            button.addEventListener('click', () => {
                const nextTile = String(button.getAttribute('data-fcp-tile') || '').trim() || 'gastos';
                if (nextTile !== state.tileId) {
                    state.tileId = nextTile;
                    state.categoria = '';
                }
                render();
            });
        });
        root.querySelectorAll('[data-fcp-cat]').forEach((button) => {
            button.addEventListener('click', () => {
                state.categoria = String(button.getAttribute('data-fcp-cat') || '').trim();
                render();
            });
        });
        root.querySelectorAll('[data-fcp-tipo]').forEach((button) => {
            button.addEventListener('click', () => {
                const nextTipo = String(button.getAttribute('data-fcp-tipo') || '').trim();
                if (nextTipo !== state.tipoId) {
                    state.tipoId = nextTipo;
                    state.crearCategoria = '';
                }
                render();
            });
        });
        root.querySelectorAll('[data-fcp-crear-cat]').forEach((button) => {
            button.addEventListener('click', () => {
                state.crearCategoria = String(button.getAttribute('data-fcp-crear-cat') || '').trim();
                render();
            });
        });

        const conceptoInput = root.querySelector('#fcp-concepto');
        conceptoInput?.addEventListener('input', () => { state.concepto = conceptoInput.value; });
        const montoInput = root.querySelector('#fcp-monto');
        montoInput?.addEventListener('input', () => { state.monto = montoInput.value; });
        const fechaInput = root.querySelector('#fcp-fecha');
        fechaInput?.addEventListener('input', () => { state.fecha = fechaInput.value || todayLocalIso(); });
        root.querySelectorAll('[data-fcp-moneda]').forEach((button) => {
            button.addEventListener('click', () => {
                state.moneda = String(button.getAttribute('data-fcp-moneda') || 'COP');
                render();
            });
        });

        root.querySelector('[data-fcp-goto-ver]')?.addEventListener('click', () => {
            state.tileId = TYPE_TO_TILE[state.tipoId] || 'gastos';
            state.categoria = '';
            const createdTipo = state.tipoId;
            resetCreateFlow();
            state.tipoId = createdTipo;
            state.listScope = { phase: 'loading', error: '', rows: [], stamp: null, requestId: 0 };
            state.countsScope = { phase: 'loading', error: '', counts: {}, stamp: null, requestId: 0 };
            goStep(VER_TOTAL, RAMA_VER);
        });
        root.querySelector('[data-fcp-create-otro]')?.addEventListener('click', () => {
            resetCreateFlow();
            goStep(2, RAMA_CREAR);
        });
    }

    function destroy() {
        alive = false;
        document.body.classList.remove(WIZARD_BODY_CLASS);
    }

    document.body.classList.add(WIZARD_BODY_CLASS);
    render();

    // F5: recargar lo que el paso restaurado necesite (14-B/B7).
    if (state.rama === RAMA_VER && state.paso === 2) {
        void fetchTileCounts();
    }
    if (state.rama === RAMA_VER && state.paso >= 3) {
        void fetchListRows();
    }

    return { destroy };
}
