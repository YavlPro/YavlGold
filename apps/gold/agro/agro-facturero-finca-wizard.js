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
import { deriveMovementDirection } from './agroOperationalCycles.js';
import { readMoneyValuesHidden } from './agro-privacy.js';

const ROOT_ID = 'agro-operational-root';
const FINCA_VIEWS = new Set(['facturero-finca', 'operational']);
const STORAGE_KEY = 'YG_AGRO_FINCA_WIZARD_STATE_V1';
const WIZARD_BODY_CLASS = 'agro-fcv-wizard-active';
const ACTIONS_WINDOW_HOURS = 24;
const LIST_LIMIT = 500;

const RAMA_VER = 'ver';
const RAMA_CREAR = 'crear';
const VER_TOTAL = 4;
const CREAR_TOTAL = 5;

// Tiles de lectura (default del owner). Datos: ledger crudo por farm_id.
// alias: agro_expenses usa date/concept/amount (los demas fecha/concepto/monto).
const VER_TILES = [
    {
        id: 'fiados', label: 'Fiados', icon: 'fa-solid fa-hand-hold-dollar',
        table: 'agro_pending', who: 'cliente', orderCol: 'fecha',
        cols: 'id,cliente,concepto,monto,monto_usd,currency,fecha,created_at',
        scope: (q) => q.is('reverted_at', null).neq('transfer_state', 'transferred')
    },
    {
        id: 'pagados', label: 'Pagados', icon: 'fa-solid fa-circle-check',
        table: 'agro_income', who: '', orderCol: 'fecha',
        cols: 'id,concepto,monto,monto_usd,currency,fecha,created_at',
        scope: (q) => q.is('reverted_at', null)
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
    },
    {
        id: 'gastos', label: 'Gastos', icon: 'fa-solid fa-receipt',
        table: 'agro_expenses', who: '', orderCol: 'date',
        cols: 'id,concept,amount,currency,date,created_at',
        alias: { concepto: 'concept', monto: 'amount', fecha: 'date' },
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
            finca: String(hash.get('finca') || '').trim()
        };
    } catch (_err) {
        return { paso: null, rama: RAMA_VER, finca: '' };
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
        tileId: 'fiados',
        tipoId: '',
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
            const url = new URL(window.location.href);
            url.hash = `#${params.toString()}`;
            history.replaceState(null, '', url);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                rama: state.rama, paso: state.paso, finca: state.farmId,
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
        // Entrada al Paso 4 de la rama VER: primera carga de la lista del tile.
        if (state.rama === RAMA_VER && state.paso === VER_TOTAL
            && state.listScope.phase === 'loading' && state.listScope.requestId === 0) {
            void fetchTileRows();
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

    // Salida oficial: el delegador global [data-agro-view] del shell procesa
    // este click y devuelve la superficie normal del facturero (subview activa).
    function exitToSurface() {
        const exitButton = root.querySelector('[data-fcwz-exit]');
        if (exitButton) {
            exitButton.click();
            return;
        }
        destroyWizard();
        window.location.hash = 'view=facturero-finca';
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

    async function fetchTileRows() {
        const scope = state.listScope;
        const tile = VER_TILES.find((entry) => entry.id === state.tileId) || VER_TILES[0];
        const requestId = ++scope.requestId;
        scope.phase = 'loading';
        scope.error = '';
        render();

        try {
            let query = supabase
                .from(tile.table)
                .select(tile.cols)
                .is('deleted_at', null)
                .order(tile.orderCol || 'fecha', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(LIST_LIMIT);
            if (tile.scope) query = tile.scope(query);
            if (state.farmId) query = query.eq('farm_id', state.farmId);

            const { data, error } = await query;
            if (error) throw error;
            if (requestId !== scope.requestId || !alive) return;
            const alias = tile.alias || {};
            scope.rows = (Array.isArray(data) ? data : []).map((row) => ({
                ...row,
                fecha: row?.[alias.fecha || 'fecha'],
                concepto: row?.[alias.concepto || 'concepto'],
                monto: row?.[alias.monto || 'monto']
            }));
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

            // Regla del modal: loss→lost, donation→closed, resto open.
            const status = economicType === 'loss' ? 'lost' : (economicType === 'donation' ? 'closed' : 'open');
            const amount = Number(state.monto);
            const rate = effectiveRate();
            const amountUsd = state.moneda === 'USD' ? amount : (rate > 0 ? convertToUSD(amount, state.moneda, rate) : null);

            const cyclePayload = {
                user_id: user.id,
                name: state.concepto.trim(),
                description: null,
                economic_type: economicType,
                category: 'other',
                crop_id: null, // movimiento general de finca: sin cultivo por decisión del owner
                farm_id: state.farmId || null,
                status,
                opened_at: state.fecha,
                closed_at: status === 'closed' ? todayLocalIso() : null,
                notes: null
            };
            const { data: cycleData, error: cycleError } = await supabase
                .from('agro_operational_cycles')
                .insert(cyclePayload)
                .select('id')
                .single();
            if (cycleError) throw cycleError;
            const cycleId = String(cycleData?.id || '');

            const movementPayload = {
                user_id: user.id,
                cycle_id: cycleId,
                direction: deriveMovementDirection(economicType),
                amount,
                currency: state.moneda,
                amount_usd: amountUsd,
                exchange_rate: state.moneda === 'USD' ? 1 : rate,
                concept: state.concepto.trim(),
                movement_date: state.fecha,
                quantity: null,
                unit_type: null,
                farm_id: state.farmId || null
            };
            const { error: movementError } = await supabase
                .from('agro_operational_movements')
                .insert(movementPayload);
            if (movementError) {
                // Rollback del ciclo, igual que createCycleRecord del modal.
                await supabase.from('agro_operational_cycles').delete().eq('id', cycleId).eq('user_id', user.id);
                throw movementError;
            }

            document.dispatchEvent(new CustomEvent('agro:operational-portfolio-updated'));
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
                <p class="fcvw-note">Este facturero trabaja por finca completa. Los movimientos ligados solo a un cultivo se leen en el Facturero del Cultivo.</p>
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

    function renderVerListBody() {
        const scope = state.listScope;
        const tile = VER_TILES.find((entry) => entry.id === state.tileId) || VER_TILES[0];

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
                ${scope.rows.map((row) => `
                    <li class="fcwz-movements__item">
                        <span class="fcwz-movements__date">${escapeHtml(String(row?.fecha || '').slice(0, 10) || 'Sin fecha')}</span>
                        <span class="fcwz-movements__text">${escapeHtml(movementText(row, tile))}</span>
                        <span class="fcwz-movements__amount">${renderMoneyNode(formatMoney(row))}</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    function renderVerStep4() {
        const tile = VER_TILES.find((entry) => entry.id === state.tileId) || VER_TILES[0];
        const actions = state.actionsScope;
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
            <p class="fcvw-clients__context">${escapeHtml(tile.label)} · ${escapeHtml(farmLabel())}</p>
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
            return renderVerStep4();
        }
        if (state.paso === 2) return renderFarmPicker();
        if (state.paso === 3) return renderCrearTypes();
        if (state.paso === 4) return renderCrearForm();
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
            return 'Registros del tipo elegido.';
        }
        if (state.paso === 3) return '¿Qué tipo de movimiento vas a registrar?';
        if (state.paso === 4) return 'Cuéntale al facturero los detalles del movimiento.';
        return 'Revisa que todo esté correcto antes de confirmar.';
    }

    function render() {
        if (!alive) return;
        const sub = subtitle();
        root.innerHTML = `
            <div class="fcwz">
                <div class="fcvw__topbar">
                    <button type="button" class="fcvw__back" data-fcwz-exit data-agro-view="facturero-finca">
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                        Entrada
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
                state.tileId = String(button.getAttribute('data-fcwz-tile') || '').trim() || 'fiados';
                render();
            });
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
            state.rama = RAMA_VER;
            state.paso = 2;
            render();
        });
        root.querySelector('[data-fcwz-create-otro]')?.addEventListener('click', () => {
            resetCreateFlow();
            state.paso = 2;
            render();
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

    // La lista se carga al entrar al paso 4 de la rama VER.
    if (state.rama === RAMA_VER && state.paso === VER_TOTAL) {
        void fetchTileRows();
    }

    return { destroy };
}
