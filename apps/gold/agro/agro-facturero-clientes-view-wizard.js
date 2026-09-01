/**
 * Facturero de Clientes — Wizard "Ver clientes" (4 pasos a página completa).
 * Ruta hash: #view=facturero-clientes&subview=ver-clientes&paso=N (F5 restaura el paso).
 *
 * ADN Visual V12: solo tokens var(--...), FA 6.5 con aria-hidden, sin glow,
 * transiciones 120-220ms, prefers-reduced-motion respetado (ver CSS del módulo).
 *
 * Reglas canónicas de estados (MANIFIESTO §4.5.1): este wizard NO recalcula
 * categorías. Las filas llegan filtradas desde la vista via ctx.getCategoryRows,
 * que consume las reglas EPSILON existentes (resolveVisibleCategory/hasVisibleCategory).
 *
 * Donaciones es una decisión de sesión del owner (2026-09-01): tile visible con
 * empty state honesto porque hoy no existe vínculo transfer→buyer.
 *
 * Anti-mock: datos reales de Supabase (query 24h) o empty state honesto.
 */

import { supabase } from '../assets/js/config/supabase-config.js';
import { writeFactureroHashRoute } from './agro-facturero-clientes-flow.js';

const WIZARD_BODY_CLASS = 'agro-fcv-wizard-active';
const TOTAL_STEPS = 4;
const ACTIONS_WINDOW_HOURS = 24;

const ACCOUNT_TILES = [
    { id: 'account', label: 'Con cuenta YavlGold', hint: 'Se vincula tras verificar su correo.', icon: 'fa-solid fa-link' },
    { id: 'none', label: 'Sin cuenta', hint: 'Registro normal, sin vínculo.', icon: 'fa-solid fa-user' }
];

const STATE_TILES = [
    { id: 'fiados', label: 'Fiados', icon: 'fa-solid fa-hand-hold-dollar' },
    { id: 'pagados', label: 'Registro pagado', icon: 'fa-solid fa-circle-check' },
    { id: 'perdidos', label: 'Pérdidas', icon: 'fa-solid fa-circle-xmark' },
    { id: 'donaciones', label: 'Donaciones', icon: 'fa-solid fa-hand-holding-heart' },
    { id: 'sin-registro', label: 'Sin registro', icon: 'fa-solid fa-inbox' }
];

let activeWizardSession = null;

export function openFactureroViewWizard(root, options = {}) {
    if (activeWizardSession) {
        activeWizardSession.update(options);
        return;
    }
    activeWizardSession = createWizardSession(root, options);
}

export function destroyFactureroViewWizard() {
    if (!activeWizardSession) return;
    activeWizardSession.destroy();
    activeWizardSession = null;
}

function createWizardSession(root, options) {
    let alive = true;
    let ctx = options;
    const state = {
        stepIndex: clampStep(Number(options.startPaso) || 1) - 1,
        accountChoice: '',
        stateChoice: 'fiados',
        showSystemActions: false,
        manageMenuOpen: false,
        actionsLoading: false,
        actionsError: '',
        actionRows: [],
        actionsLoaded: false,
        actionsRequestId: 0
    };

    function clampStep(paso) {
        return Math.min(Math.max(Number(paso) || 1, 1), TOTAL_STEPS);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function syncHash() {
        writeFactureroHashRoute({
            subview: 'ver-clientes',
            paso: state.stepIndex + 1,
            id: ''
        });
    }

    function showStepError(message) {
        let node = root.querySelector('[data-fcvw-error]');
        if (!node) {
            node = document.createElement('div');
            node.setAttribute('data-fcvw-error', '');
            root.querySelector('.fcvw__body')?.prepend(node);
        }
        node.innerHTML = `
            <div class="fcflow-note fcflow-note--warning">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <span>${escapeHtml(message)}</span>
            </div>`;
    }

    function goNext() {
        if (state.stepIndex === 0 && !state.accountChoice) {
            showStepError('Elige una opción para continuar.');
            return;
        }
        if (state.stepIndex >= TOTAL_STEPS - 1) return;
        state.stepIndex += 1;
        state.manageMenuOpen = false;
        if (state.stepIndex === TOTAL_STEPS - 1) {
            ctx.onCategorySelected?.(state.stateChoice);
        }
        render();
    }

    function goBack() {
        if (state.stepIndex > 0) {
            state.stepIndex -= 1;
            state.manageMenuOpen = false;
            render();
            return;
        }
        ctx.onExit?.();
    }

    function guideText() {
        switch (state.stepIndex) {
            case 0: return 'Primero lo básico: ¿tu cliente ya usa YavlGold?';
            case 1: return 'Elige la finca y el cultivo que quieres revisar.';
            case 2: return '¿Qué estado de clientes quieres ver?';
            default: return '';
        }
    }

    function isLinkedRow(row) {
        return Boolean(String(row?.linked_user_id || '').trim());
    }

    function currentRows() {
        if (state.stateChoice === 'donaciones') return [];
        if (typeof ctx.getCategoryRows !== 'function') return [];
        let rows = ctx.getCategoryRows(state.stateChoice) || [];
        if (state.accountChoice === 'account') {
            rows = rows.filter((row) => isLinkedRow(row));
        } else if (state.accountChoice === 'none') {
            rows = rows.filter((row) => !isLinkedRow(row));
        }
        return rows;
    }

    function contextLine() {
        const tile = STATE_TILES.find((entry) => entry.id === state.stateChoice) || STATE_TILES[0];
        const account = state.accountChoice === 'account'
            ? 'Con cuenta YavlGold'
            : (state.accountChoice === 'none' ? 'Sin cuenta' : '');
        const farmId = String(ctx.data?.selectedFarmId || '').trim();
        const cropId = String(ctx.data?.selectedCropId || '').trim();
        const farms = Array.isArray(ctx.data?.farms) ? ctx.data.farms : [];
        const crops = Array.isArray(ctx.data?.crops) ? ctx.data.crops : [];
        let scope = 'Vista general';
        if (cropId) {
            const crop = crops.find((entry) => String(entry?.id || '') === cropId);
            scope = `Cultivo: ${cropShortLabel(crop)}`;
        } else if (farmId) {
            const farm = farms.find((entry) => String(entry?.id || '') === farmId);
            scope = `Finca: ${String(farm?.name || 'Finca').trim()}`;
        }
        return [tile.label, account, scope].filter(Boolean).join(' · ');
    }

    function cropShortLabel(crop) {
        const rawName = String(crop?.name || '').trim();
        const safeName = rawName.replace(/^[^\p{L}\p{N}]+/u, '').trim() || rawName || 'Cultivo';
        return safeName;
    }

    function renderStepAccount() {
        return `
            <div class="fcvw-tiles fcvw-tiles--choice">
                ${ACCOUNT_TILES.map((tile) => `
                    <button type="button" class="fcvw-choice${state.accountChoice === tile.id ? ' is-selected' : ''}" data-fcvw-account="${tile.id}">
                        <i class="${tile.icon}" aria-hidden="true"></i>
                        <span class="fcvw-choice__body">
                            <span class="fcvw-choice__label">${escapeHtml(tile.label)}</span>
                            <span class="fcvw-choice__hint">${escapeHtml(tile.hint)}</span>
                        </span>
                    </button>
                `).join('')}
            </div>
            <p class="fcvw-note">Una cuenta solo cuenta como vinculada si pasó la verificación segura de YavlGold.</p>
        `;
    }

    function renderStepContext() {
        const farms = Array.isArray(ctx.data?.farms) ? ctx.data.farms : [];
        const crops = Array.isArray(ctx.data?.crops) ? ctx.data.crops : [];
        const farmId = String(ctx.data?.selectedFarmId || '').trim();
        const cropId = String(ctx.data?.selectedCropId || '').trim();
        const scopedCrops = farmId
            ? crops.filter((crop) => String(crop?.farm_id || '') === farmId)
            : crops;

        const farmChips = [
            `<button type="button" class="fcvw-chip${!farmId ? ' is-active' : ''}" data-fcvw-farm="">Vista general</button>`,
            ...farms.map((farm) => {
                const id = String(farm?.id || '').trim();
                if (!id) return '';
                return `<button type="button" class="fcvw-chip${farmId === id ? ' is-active' : ''}" data-fcvw-farm="${escapeHtml(id)}">${escapeHtml(String(farm?.name || 'Finca').trim())}</button>`;
            })
        ].join('');

        const cropChips = [
            `<button type="button" class="fcvw-chip${!cropId ? ' is-active' : ''}" data-fcvw-crop="">Vista general</button>`,
            ...scopedCrops.map((crop) => {
                const id = String(crop?.id || '').trim();
                if (!id) return '';
                const variety = String(crop?.variety || '').trim();
                const label = variety ? `${cropShortLabel(crop)} · ${variety}` : cropShortLabel(crop);
                return `<button type="button" class="fcvw-chip${cropId === id ? ' is-active' : ''}" data-fcvw-crop="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
            })
        ].join('');

        return `
            <div class="fcvw-picker">
                <span class="fcvw-picker__label">Finca</span>
                <div class="fcvw-picker__strip" role="group" aria-label="Contexto de finca">${farmChips}</div>
            </div>
            <div class="fcvw-picker">
                <span class="fcvw-picker__label">Cultivo</span>
                <div class="fcvw-picker__strip" role="group" aria-label="Contexto de cultivo">${cropChips}</div>
            </div>
            <p class="fcvw-note">El cultivo solo muestra opciones de la finca elegida. Vista general incluye todo.</p>
        `;
    }

    function renderStepState() {
        return `
            <div class="fcvw-tiles fcvw-tiles--square">
                ${STATE_TILES.map((tile) => `
                    <button type="button" class="fcvw-tile${state.stateChoice === tile.id ? ' is-active' : ''}" data-fcvw-state="${tile.id}" aria-pressed="${state.stateChoice === tile.id ? 'true' : 'false'}">
                        <i class="${tile.icon}" aria-hidden="true"></i>
                        <span class="fcvw-tile__label">${escapeHtml(tile.label)}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    function renderEmptyBody({ title, copy }) {
        return `
            <div class="cartera-viva-empty">
                <div class="cartera-viva-empty__icon" aria-hidden="true"><i class="fa-solid fa-inbox"></i></div>
                <h3 class="cartera-viva-empty__title">${escapeHtml(title)}</h3>
                <p class="cartera-viva-empty__copy">${escapeHtml(copy)}</p>
            </div>
        `;
    }

    function renderStepClientsBody() {
        if (ctx.data?.loading && !ctx.data?.hasLoadedSummary) {
            return `
                <div class="cartera-viva-empty cartera-viva-empty--loading">
                    <div class="cartera-viva-loading-dot" aria-hidden="true"></div>
                    <h3 class="cartera-viva-empty__title">Cargando clientes</h3>
                    <p class="cartera-viva-empty__copy">Ordenando clientes y saldos visibles.</p>
                </div>
            `;
        }
        if (ctx.data?.errorMessage) {
            return renderEmptyBody({
                title: 'No se pudo cargar la lista',
                copy: ctx.data.errorMessage
            });
        }
        if (state.stateChoice === 'donaciones') {
            return renderEmptyBody({
                title: 'Sin lectura de donaciones por ahora',
                copy: 'Donaciones solo entra cuando la data real la sostiene. Aquí verás a los clientes con donaciones cuando existan.'
            });
        }

        const rows = currentRows();
        if (rows.length <= 0) {
            const meta = (typeof ctx.getCategoryMeta === 'function' ? ctx.getCategoryMeta(state.stateChoice) : null) || {};
            return renderEmptyBody({
                title: meta.emptyTitle || 'No hay clientes en esta vista',
                copy: meta.emptyCopy || 'Aquí aparecerán los clientes de este estado.'
            });
        }

        return `
            <div class="cartera-viva-grid" data-fcvw-grid>
                ${rows.map((row) => (typeof ctx.renderClientCard === 'function' ? ctx.renderClientCard(row) : '')).join('')}
            </div>
        `;
    }

    function renderStepClients() {
        return `
            <div class="fcvw-clients">
                <p class="fcvw-clients__context">${escapeHtml(contextLine())}</p>
                ${typeof ctx.renderPrivacyStrip === 'function' ? ctx.renderPrivacyStrip() : ''}
                <div class="fcvw-clients__body">${renderStepClientsBody()}</div>
                <div class="fcvw-clients__bar">
                    <div class="fcvw-menu">
                        <button type="button" class="fcvw-btn" data-fcvw-manage aria-expanded="${state.manageMenuOpen ? 'true' : 'false'}">
                            Gestionar clientes
                            <i class="fa-solid fa-caret-down" aria-hidden="true"></i>
                        </button>
                        ${state.manageMenuOpen ? `
                        <div class="fcvw-menu__panel" role="menu">
                            <button type="button" class="fcvw-menu__item" role="menuitem" data-fcvw-unify>
                                <i class="fa-solid fa-people-arrows" aria-hidden="true"></i>
                                Unificar clientes
                            </button>
                            <button type="button" class="fcvw-menu__item" role="menuitem" data-fcvw-refresh>
                                <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                                Actualizar
                            </button>
                        </div>` : ''}
                    </div>
                    <button type="button" class="fcvw-btn fcvw-btn--gold" data-fcvw-export>
                        <i class="fa-solid fa-file-export" aria-hidden="true"></i>
                        Exportar lista
                    </button>
                </div>
                <button type="button" class="fcvw-syslink" data-fcvw-system-actions>
                    <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
                    Acciones del sistema
                </button>
            </div>
        `;
    }

    function footerHtml() {
        if (state.stepIndex >= TOTAL_STEPS - 1) return '';
        return `
            <div class="fcvw__footer">
                <button type="button" class="btn-gold" data-fcvw-next>Siguiente</button>
            </div>
        `;
    }

    // ---------- Subvista: Acciones del sistema (24 h) ----------

    function withinWindow(timestamp, sinceMs) {
        const ts = Date.parse(String(timestamp || ''));
        return Number.isFinite(ts) && ts >= sinceMs;
    }

    function resolveName(row, fallback) {
        if (typeof ctx.resolveBuyerName === 'function') {
            const name = ctx.resolveBuyerName({
                buyerId: row?.buyer_id,
                groupKey: row?.buyer_group_key,
                fallback
            });
            if (name) return name;
        }
        return String(fallback || '').trim() || 'un cliente';
    }

    function relativeTime(ts) {
        const minutes = Math.max(0, Math.round((Date.now() - ts) / 60000));
        if (minutes < 1) return 'hace un momento';
        if (minutes < 60) return `hace ${minutes} min`;
        const hours = Math.max(1, Math.floor(minutes / 60));
        return `hace ${hours} h`;
    }

    function buildActionEntries(pendingRows, incomeRows, lossRows, sinceMs) {
        const entries = [];

        (Array.isArray(pendingRows) ? pendingRows : []).forEach((row) => {
            const name = resolveName(row, row?.cliente);
            if (withinWindow(row?.transferred_at, sinceMs)) {
                const target = String(row?.transferred_to || '').trim().toLowerCase();
                const destiny = target === 'income' ? 'Pagado' : (target === 'losses' ? 'Pérdida' : 'fuera de la cartera');
                entries.push({
                    kind: 'transfer',
                    ts: Date.parse(row.transferred_at),
                    text: `El fiado de ${name} pasó a ${destiny}`
                });
            }
            if (withinWindow(row?.reverted_at, sinceMs)) {
                entries.push({
                    kind: 'revert',
                    ts: Date.parse(row.reverted_at),
                    text: `Un fiado de ${name} fue revertido`
                });
            }
            if (!row?.transferred_at && !row?.reverted_at && withinWindow(row?.created_at, sinceMs)) {
                entries.push({
                    kind: 'new',
                    ts: Date.parse(row.created_at),
                    text: `Fiado registrado a ${name}`
                });
            }
        });

        (Array.isArray(incomeRows) ? incomeRows : []).forEach((row) => {
            const name = resolveName(row, '');
            if (withinWindow(row?.reverted_at, sinceMs)) {
                entries.push({
                    kind: 'revert',
                    ts: Date.parse(row.reverted_at),
                    text: `El cobro de ${name} volvió a fiado`
                });
            }
            if (!row?.reverted_at && withinWindow(row?.created_at, sinceMs)) {
                const isDebtPayment = String(row?.origin_table || '').trim().toLowerCase() === 'agro_pending';
                entries.push({
                    kind: 'new',
                    ts: Date.parse(row.created_at),
                    text: isDebtPayment ? `Cobro registrado de ${name}` : `Ingreso registrado de ${name}`
                });
            }
        });

        (Array.isArray(lossRows) ? lossRows : []).forEach((row) => {
            const name = resolveName(row, row?.causa);
            if (withinWindow(row?.reverted_at, sinceMs)) {
                entries.push({
                    kind: 'revert',
                    ts: Date.parse(row.reverted_at),
                    text: `La pérdida de ${name} volvió a fiado`
                });
            }
            if (!row?.reverted_at && withinWindow(row?.created_at, sinceMs)) {
                entries.push({
                    kind: 'new',
                    ts: Date.parse(row.created_at),
                    text: `Pérdida registrada de ${name}`
                });
            }
        });

        return entries
            .filter((entry) => Number.isFinite(entry.ts))
            .sort((a, b) => b.ts - a.ts);
    }

    async function loadSystemActions() {
        const requestId = ++state.actionsRequestId;
        state.actionsLoading = true;
        state.actionsError = '';
        render();

        try {
            const sinceMs = Date.now() - ACTIONS_WINDOW_HOURS * 3600 * 1000;
            const sinceIso = new Date(sinceMs).toISOString();
            // agro_income/agro_losses no tienen transferred_at (solo agro_pending);
            // el filtro .or() es por tabla para no romper contra el schema real.
            const pendingOr = `transferred_at.gte.${sinceIso},reverted_at.gte.${sinceIso},created_at.gte.${sinceIso}`;
            const simpleOr = `reverted_at.gte.${sinceIso},created_at.gte.${sinceIso}`;

            const [pendingResult, incomeResult, lossResult] = await Promise.all([
                supabase
                    .from('agro_pending')
                    .select('id,buyer_id,buyer_group_key,cliente,concepto,monto,currency,transfer_state,transferred_at,transferred_to,reverted_at,created_at')
                    .is('deleted_at', null)
                    .or(pendingOr),
                supabase
                    .from('agro_income')
                    .select('id,buyer_id,buyer_group_key,concepto,monto,currency,origin_table,reverted_at,created_at')
                    .is('deleted_at', null)
                    .or(simpleOr),
                supabase
                    .from('agro_losses')
                    .select('id,buyer_id,buyer_group_key,causa,concepto,monto,currency,origin_table,reverted_at,created_at')
                    .is('deleted_at', null)
                    .or(simpleOr)
            ]);

            if (pendingResult?.error) throw pendingResult.error;
            if (incomeResult?.error) throw incomeResult.error;
            if (lossResult?.error) throw lossResult.error;
            if (requestId !== state.actionsRequestId || !alive) return;

            state.actionRows = buildActionEntries(
                pendingResult?.data,
                incomeResult?.data,
                lossResult?.data,
                sinceMs
            );
        } catch (error) {
            if (requestId !== state.actionsRequestId || !alive) return;
            console.error('[FactureroViewWizard] system actions load failed:', error?.message || error);
            state.actionRows = [];
            state.actionsError = String(error?.message || 'No se pudo leer las acciones del sistema.');
        } finally {
            if (requestId === state.actionsRequestId && alive) {
                state.actionsLoading = false;
                state.actionsLoaded = true;
                render();
            }
        }
    }

    function openSystemActions() {
        state.showSystemActions = true;
        state.manageMenuOpen = false;
        render();
        if (!state.actionsLoaded && !state.actionsLoading) {
            void loadSystemActions();
        }
    }

    function closeSystemActions() {
        state.showSystemActions = false;
        render();
    }

    function renderActionsBody() {
        if (state.actionsLoading) {
            return `
                <div class="cartera-viva-empty cartera-viva-empty--loading">
                    <div class="cartera-viva-loading-dot" aria-hidden="true"></div>
                    <h3 class="cartera-viva-empty__title">Cargando acciones</h3>
                    <p class="cartera-viva-empty__copy">Buscando transferencias y reversiones de las últimas 24 horas.</p>
                </div>
            `;
        }
        if (state.actionsError) {
            return renderEmptyBody({
                title: 'No se pudo leer las acciones del sistema',
                copy: state.actionsError
            });
        }
        if (state.actionRows.length <= 0) {
            return renderEmptyBody({
                title: 'Sin acciones en las últimas 24 horas',
                copy: 'Cuando registres transferencias, reversiones o transacciones, aparecerán aquí en lenguaje claro.'
            });
        }

        const icons = {
            transfer: 'fa-solid fa-arrow-right-arrow-left',
            revert: 'fa-solid fa-rotate-left',
            new: 'fa-solid fa-circle-plus'
        };
        return `
            <ul class="fcvw-actions">
                ${state.actionRows.map((entry) => `
                    <li class="fcvw-actions__item">
                        <i class="${icons[entry.kind] || icons.new}" aria-hidden="true"></i>
                        <span class="fcvw-actions__text">${escapeHtml(entry.text)}</span>
                        <span class="fcvw-actions__time">${escapeHtml(relativeTime(entry.ts))}</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    function renderSystemActions() {
        return `
            <div class="fcvw">
                <div class="fcvw__topbar">
                    <button type="button" class="fcvw__back" data-fcvw-actions-back>
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                        Volver
                    </button>
                    <p class="fcvw__title">Acciones del sistema</p>
                    <span class="fcvw__step">Paso ${TOTAL_STEPS} de ${TOTAL_STEPS}</span>
                </div>
                <p class="fcvw__guide">Transferencias, reversiones y transacciones de las últimas ${ACTIONS_WINDOW_HOURS} horas.</p>
                <div class="fcvw__body">${renderActionsBody()}</div>
            </div>
        `;
    }

    // ---------- Render principal y eventos ----------

    function bodyHtml() {
        switch (state.stepIndex) {
            case 0: return renderStepAccount();
            case 1: return renderStepContext();
            case 2: return renderStepState();
            default: return renderStepClients();
        }
    }

    function render() {
        if (!alive || !root) return;

        if (state.showSystemActions) {
            root.innerHTML = renderSystemActions();
            bindEvents();
            return;
        }

        const paso = state.stepIndex + 1;
        const guide = guideText();
        root.innerHTML = `
            <div class="fcvw">
                <div class="fcvw__topbar">
                    <button type="button" class="fcvw__back" data-fcvw-back>
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                        Volver
                    </button>
                    <p class="fcvw__title">Facturero de Clientes</p>
                    <span class="fcvw__step">Paso ${paso} de ${TOTAL_STEPS}</span>
                </div>
                ${guide ? `<p class="fcvw__guide">${escapeHtml(guide)}</p>` : ''}
                <div class="fcvw__body">${bodyHtml()}</div>
                ${footerHtml()}
            </div>
        `;
        bindEvents();
        syncHash();
    }

    function handleFarmTap(farmId) {
        const currentCropId = String(ctx.data?.selectedCropId || '').trim();
        const crops = Array.isArray(ctx.data?.crops) ? ctx.data.crops : [];
        // Regla estricta: si el cultivo activo no pertenece a la finca elegida,
        // vuelve a Vista general (nunca cultivos de otra finca).
        let nextCropId = currentCropId;
        if (farmId && currentCropId) {
            const cropBelongsToFarm = crops.some((crop) =>
                String(crop?.id || '') === currentCropId
                && String(crop?.farm_id || '') === String(farmId)
            );
            if (!cropBelongsToFarm) nextCropId = '';
        }
        ctx.onApplyContext?.({ farmId: String(farmId || ''), cropId: nextCropId });
    }

    function handleCropTap(cropId) {
        ctx.onApplyContext?.({
            farmId: String(ctx.data?.selectedFarmId || ''),
            cropId: String(cropId || '')
        });
    }

    // Delegación persistente en el root: sobrevive a los innerHTML del render.
    // Cubre las acciones de las cards (que se regeneran en cada refresh de datos).
    function handleRootClick(event) {
        const target = event.target instanceof Element ? event.target : null;
        if (!target || !root) return;

        if (state.manageMenuOpen && !target.closest('.fcvw-menu') && !target.closest('[data-fcvw-manage]')) {
            state.manageMenuOpen = false;
            render();
            return;
        }

        const detailButton = target.closest('[data-cartera-open-history]');
        if (detailButton) {
            const buyerId = String(detailButton.getAttribute('data-cartera-open-history') || '').trim();
            const scope = String(detailButton.getAttribute('data-cartera-open-history-scope') || '').trim();
            if (buyerId) ctx.onOpenDetail?.(buyerId, scope);
            return;
        }

        const editButton = target.closest('[data-cartera-edit-client]');
        if (editButton) {
            const buyerId = String(editButton.getAttribute('data-cartera-edit-client') || '').trim();
            if (buyerId) ctx.onEditClient?.(buyerId);
            return;
        }

        const deleteButton = target.closest('[data-cartera-delete-client]');
        if (deleteButton) {
            const buyerId = String(deleteButton.getAttribute('data-cartera-delete-client') || '').trim();
            if (buyerId) ctx.onDeleteClient?.(buyerId);
        }
    }

    function bindEvents() {
        root.querySelector('[data-fcvw-back]')?.addEventListener('click', goBack);
        root.querySelector('[data-fcvw-next]')?.addEventListener('click', goNext);
        root.querySelector('[data-fcvw-actions-back]')?.addEventListener('click', closeSystemActions);
        root.querySelector('[data-fcvw-system-actions]')?.addEventListener('click', openSystemActions);
        root.querySelector('[data-fcvw-manage]')?.addEventListener('click', () => {
            state.manageMenuOpen = !state.manageMenuOpen;
            render();
        });
        root.querySelector('[data-fcvw-unify]')?.addEventListener('click', () => {
            state.manageMenuOpen = false;
            ctx.onUnifyClients?.();
        });
        root.querySelector('[data-fcvw-refresh]')?.addEventListener('click', () => {
            state.manageMenuOpen = false;
            ctx.onRefresh?.();
        });
        root.querySelector('[data-fcvw-export]')?.addEventListener('click', () => {
            ctx.onExportList?.(currentRows());
        });

        root.querySelectorAll('[data-fcvw-account]').forEach((button) => {
            button.addEventListener('click', () => {
                state.accountChoice = button.getAttribute('data-fcvw-account') === 'account' ? 'account' : 'none';
                render();
            });
        });
        root.querySelectorAll('[data-fcvw-farm]').forEach((button) => {
            button.addEventListener('click', () => handleFarmTap(button.getAttribute('data-fcvw-farm')));
        });
        root.querySelectorAll('[data-fcvw-crop]').forEach((button) => {
            button.addEventListener('click', () => handleCropTap(button.getAttribute('data-fcvw-crop')));
        });
        root.querySelectorAll('[data-fcvw-state]').forEach((button) => {
            button.addEventListener('click', () => {
                const nextState = String(button.getAttribute('data-fcvw-state') || '').trim();
                const tile = STATE_TILES.find((entry) => entry.id === nextState);
                if (!tile) return;
                state.stateChoice = tile.id;
                ctx.onCategorySelected?.(tile.id);
                // Auto-advance: tap selecciona y avanza directo a Paso 4.
                state.stepIndex = TOTAL_STEPS - 1;
                render();
            });
        });
    }

    function update(nextOptions) {
        ctx = nextOptions;
        render();
    }

    function destroy() {
        alive = false;
        root?.removeEventListener('click', handleRootClick);
        document.body.classList.remove(WIZARD_BODY_CLASS);
    }

    document.body.classList.add(WIZARD_BODY_CLASS);
    root.addEventListener('click', handleRootClick);
    render();

    return { update, destroy };
}
