/**
 * Facturero de Clientes — Wizard "Cliente existente" (subview=existente).
 * Nuevo registro (Fiado o Pagado) para un cliente ya registrado, en 8 pasos
 * a página completa. Espejo del wizard de creación (agro-facturero-clientes-flow.js):
 * mismo chrome fcflow, mismo footer y reglas de navegación.
 *
 * Rutas hash: #view=facturero-clientes&subview=existente&paso=N&id=...
 * ADN V12: tokens, FA 6.5, sin emojis funcionales, sin modales.
 *
 * Canon de la sesión 2026-09-20 (Tarea A):
 *  - P1 Cuenta YavlGold filtra clientes por vinculación REAL (linked_user_id).
 *  - P2 selección de cliente existente real (sin UUIDs visibles).
 *  - P3/P4 finca → cultivo con regla estricta de no mezcla; solo cultivos
 *    produccion/finalizado + chip honesto "Sin cultivo" (cultivo opcional).
 *  - P5 solo Fiado y Pagado; pérdidas y donaciones nacen por transferencia
 *    desde el detalle del cliente (D3), nunca aquí.
 *  - P6-P8 reutilizan exactamente la escritura de subview=nuevo
 *    (insertRowWithColumnFallback + ensureBuyerIdentityLink), sin contabilidad paralela.
 */

import { supabase } from '../assets/js/config/supabase-config.js';
import {
    SUPPORTED_CURRENCIES,
    initExchangeRates,
    getRate,
    convertToUSD
} from './agro-exchange.js';
import {
    ensureBuyerIdentityLink,
    isBuyerIdentityRelevantTab,
    normalizeHistorySearchToken
} from './agro-facturero-clientes.js';
import {
    writeFactureroHashRoute,
    RECORD_TYPES,
    UNIT_OPTIONS,
    buildConceptWithWho,
    insertRowWithColumnFallback,
    isEligibleFlowCrop,
    resolveFlowCropStatus,
    cropDisplayLabel
} from './agro-facturero-clientes-flow.js';

const EXISTING_FLOW_CLASS = 'fcflow';
const EXISTING_SUBTITLE = 'Nuevo registro para cliente existente';

// Mapa canónico de 8 pasos (P1..P8). La pantalla de éxito es terminal y no
// suma paso: "Confirmación y guardado" es P8.
const STEP_ORDER_EXISTING = ['account', 'client', 'farm', 'crop', 'type', 'category', 'form', 'summary'];
const TOTAL_STEPS = 8;

// D3: tipos permitidos en este wizard. Pérdidas y donaciones NO se crean aquí.
const EXISTING_RECORD_TYPES = Object.freeze({
    pendientes: RECORD_TYPES.pendientes,
    ingresos: RECORD_TYPES.ingresos
});

const USD_GUARDRAIL_MIN = 1000;

let activeExistingFlowToken = 0;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

// Nodos con atributos de privacidad (agro-privacy.js los enmascara solos vía
// MutationObserver cuando el perfil oculta nombres o montos).
function buyerNameNode(value) {
    const safeValue = String(value || '').trim() || 'Cliente';
    return `<span data-buyer-name="1" data-raw-name="${escapeAttribute(safeValue)}">${escapeHtml(safeValue)}</span>`;
}

function moneyNode(value) {
    const safeValue = String(value || '').trim() || '—';
    return `<span data-money="1" data-raw-money="${escapeAttribute(safeValue)}">${escapeHtml(safeValue)}</span>`;
}

function todayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatMoney(value, currency) {
    const amount = Number(value) || 0;
    const cfg = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
    if (currency === 'USD') return `$${amount.toFixed(2)}`;
    return cfg.decimals === 0
        ? `${cfg.symbol} ${Math.round(amount).toLocaleString()}`
        : `${cfg.symbol} ${amount.toFixed(cfg.decimals)}`;
}

function getFarms() {
    if (typeof window === 'undefined' || typeof window._agroFarms?.getFarms !== 'function') return [];
    const farms = window._agroFarms.getFarms();
    return Array.isArray(farms) ? farms : [];
}

function getAvailableCrops() {
    if (typeof window === 'undefined') return [];
    const snapshot = window.__AGRO_CROPS_STATE;
    return Array.isArray(snapshot?.crops) ? snapshot.crops : [];
}

// Finca de contexto del cliente: se guarda en notes como línea "Finca: X"
// (ver saveBuyerFromDataStep en flow.js). Lectura honesta, sin inventar.
function extractFarmContextFromNotes(notes) {
    const lines = String(notes || '').split('\n');
    const farmLine = lines.find((line) => /^finca\s*:/i.test(line.trim()));
    return farmLine ? farmLine.replace(/^finca\s*:/i, '').trim() : '';
}

function buyerContactText(buyer) {
    return String(buyer?.phone || buyer?.whatsapp || '').trim();
}

function buyerIsLinked(buyer) {
    return Boolean(String(buyer?.linked_user_id || '').trim());
}

// Categoría resuelta EXACTAMENTE como subview=nuevo la escribe en el insert
// (ingresos: ventas con cultivo / general sin cultivo; fiado: sin categoría).
function resolvedCategoryLabel(recordType, cropId) {
    if (recordType === 'ingresos') return cropId ? 'Ventas' : 'General';
    return '';
}

/**
 * options: {
 *   startStep: index 0-based dentro de STEP_ORDER_EXISTING (paso-1),
 *   preselectedBuyerId: id de cliente desde el hash (F5),
 *   onExit(): volver desde P1 sale a la puerta del Facturero de Clientes,
 *   onCreated(movement),
 *   onGoToDetail(buyerId), onGoToRecords()
 * }
 */
export function openFactureroExistingClientFlow(root, options = {}) {
    if (!root) return () => {};
    const token = ++activeExistingFlowToken;
    let stepIndex = Math.min(Math.max(Number(options.startStep) || 0, 0), STEP_ORDER_EXISTING.length - 1);
    let done = false;

    // Borrador del registro (baseline del guard de "Ir a inicio", ANEXO 19).
    const draftDefaults = {
        accountChoice: '',
        buyerId: '',
        buyerName: '',
        farmId: '',
        cropId: '',
        recordType: '',
        unitType: 'saco',
        unitQty: 1,
        monto: '',
        currency: 'COP',
        fecha: todayISO(),
        concepto: '',
        usdConfirmed: false
    };

    const state = {
        ...draftDefaults,
        clientSearch: '',
        clients: [],
        clientsLoading: true,
        clientsError: '',
        pendingBuyerId: String(options.preselectedBuyerId || '').trim(),
        saving: false
    };

    let exchangeRates = { USD: 1, COP: null, VES: null };
    // Non-blocking: no re-render al llegar las tasas para no pisar inputs en curso.
    initExchangeRates().then((rates) => { if (rates && token === activeExistingFlowToken) exchangeRates = rates; }).catch(() => {});

    function currentStep() { return STEP_ORDER_EXISTING[stepIndex]; }
    function stepNumber() { return Math.min(stepIndex + 1, TOTAL_STEPS); }

    function syncHash() {
        writeFactureroHashRoute({
            subview: 'existente',
            paso: stepNumber(),
            id: state.buyerId || ''
        });
    }

    function goNext() {
        if (stepIndex < STEP_ORDER_EXISTING.length - 1) {
            stepIndex += 1;
            syncHash();
            render();
        }
    }

    // Volver de paso: retrocede exactamente un paso. Solo desde P1 sale a la
    // puerta del Facturero de Clientes (canon 4.5.1).
    function goBack() {
        if (stepIndex > 0) {
            stepIndex -= 1;
            syncHash();
            render();
            return;
        }
        options.onExit?.();
    }

    function draftIsDirty() {
        return Object.keys(draftDefaults).some((key) => state[key] !== draftDefaults[key]);
    }

    function resetDraft() {
        Object.assign(state, { ...draftDefaults });
    }

    async function goToStart() {
        if (draftIsDirty()) {
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
            resetDraft();
        }
        stepIndex = 0;
        done = false;
        syncHash();
        render();
    }

    // ---------- Clientes reales (P2) ----------

    // Solo re-renderiza si el listado está en pantalla (P2): el fetch no debe
    // pisar inputs de otros pasos cuando resuelve tarde.
    function renderClientStepIfVisible() {
        if (token === activeExistingFlowToken && currentStep() === 'client') render();
    }

    async function loadClients() {
        state.clientsLoading = true;
        state.clientsError = '';
        renderClientStepIfVisible();
        try {
            const { data, error } = await supabase
                .from('agro_buyers')
                .select('id,display_name,phone,whatsapp,notes,linked_user_id,status')
                .order('updated_at', { ascending: false });
            if (error) throw error;
            if (token !== activeExistingFlowToken) return;
            state.clients = (Array.isArray(data) ? data : [])
                .map((row) => ({
                    id: String(row?.id || '').trim(),
                    displayName: String(row?.display_name || '').trim() || 'Cliente',
                    contact: buyerContactText(row),
                    farmContext: extractFarmContextFromNotes(row?.notes),
                    linked: buyerIsLinked(row)
                }))
                .filter((row) => row.id && String(row?.status || 'active').trim().toLowerCase() !== 'archived');
            // F5 / deep-link: preselección del cliente que viaja en el hash.
            if (state.pendingBuyerId && !state.buyerId) {
                const found = state.clients.find((row) => row.id === state.pendingBuyerId);
                if (found) {
                    state.buyerId = found.id;
                    state.buyerName = found.displayName;
                }
                state.pendingBuyerId = '';
            }
        } catch (err) {
            if (token !== activeExistingFlowToken) return;
            state.clientsError = err?.message || 'No se pudo cargar la lista de clientes.';
        } finally {
            if (token === activeExistingFlowToken) {
                state.clientsLoading = false;
                renderClientStepIfVisible();
            }
        }
    }

    function visibleClients() {
        if (state.accountChoice === 'account') return state.clients.filter((row) => row.linked);
        if (state.accountChoice === 'none') return state.clients.filter((row) => !row.linked);
        return state.clients;
    }

    function matchesClientSearch(row, query) {
        const tokenText = normalizeHistorySearchToken(String(query || '').trim());
        if (!tokenText) return true;
        const haystack = normalizeHistorySearchToken([row.displayName, row.farmContext, row.contact].filter(Boolean).join(' '));
        return haystack.includes(tokenText);
    }

    // ---------- Render de pasos ----------

    function guideText(step) {
        switch (step) {
            case 'account': return 'Primero lo básico: ¿tu cliente ya usa YavlGold?';
            case 'client': return 'Elige de tu libro el cliente de este registro.';
            case 'farm': return '¿En qué finca se hace este registro?';
            case 'crop': return state.cropId
                ? 'Cultivo seleccionado. Puedes cambiarlo si quieres.'
                : '¿Pertenece a un cultivo de esa finca?';
            case 'type': return '¿Qué tipo de registro quieres hacer?';
            case 'category': return 'Revisa la categoría y cómo se entregó o recibió.';
            case 'form': return 'Moneda, monto y concepto del registro.';
            case 'summary': return 'Revisa que todo esté correcto antes de confirmar.';
            default: return '';
        }
    }

    function optionCard({ value, label, hint, icon, selected = false, extraClass = '' }) {
        return `
            <button type="button" class="fcflow-card${selected ? ' is-selected' : ''}${extraClass ? ` ${extraClass}` : ''}" data-option-value="${escapeHtml(value)}">
                <i class="${icon}" aria-hidden="true"></i>
                <span class="fcflow-card__body">
                    <span class="fcflow-card__label">${escapeHtml(label)}</span>
                    ${hint ? `<span class="fcflow-card__hint">${escapeHtml(hint)}</span>` : ''}
                </span>
            </button>
        `;
    }

    // P1 — mismo par de tiles que subview=nuevo; aquí filtra el listado real.
    function renderStepAccount() {
        return `
            <div class="fcflow-grid fcflow-grid--2">
                ${optionCard({ value: 'account', label: 'Con cuenta YavlGold', hint: 'Solo clientes con vinculación verificada.', icon: 'fa-solid fa-link', selected: state.accountChoice === 'account' })}
                ${optionCard({ value: 'no-account', label: 'Sin cuenta', hint: 'Registro normal, sin vínculo.', icon: 'fa-solid fa-user', selected: state.accountChoice === 'none' })}
            </div>
        `;
    }

    // P2 — búsqueda humana sobre clientes existentes reales.
    function renderStepClient() {
        const searchField = `
            <div class="fcflow-field">
                <label class="fcflow-label" for="fcx-client-search">Buscar cliente</label>
                <input class="fcflow-input" type="search" id="fcx-client-search" placeholder="Nombre, finca o contacto" value="${escapeHtml(state.clientSearch)}" autocomplete="off">
            </div>
        `;
        if (state.clientsLoading) {
            return `
                ${searchField}
                <div class="fcflow-note fcflow-note--info" style="margin-top:0.75rem;">
                    <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                    <span>Buscando clientes de tu libro…</span>
                </div>
            `;
        }
        if (state.clientsError) {
            return `
                ${searchField}
                <div class="fcflow-note fcflow-note--warning" style="margin-top:0.75rem;">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <span>${escapeHtml(state.clientsError)}</span>
                </div>
            `;
        }
        const rows = visibleClients().filter((row) => matchesClientSearch(row, state.clientSearch));
        if (!rows.length) {
            return `
                ${searchField}
                <div class="fcflow-note fcflow-note--warning" style="margin-top:0.75rem;">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <span>No encontramos clientes con ese filtro. Prueba con otro nombre, finca o contacto.</span>
                </div>
            `;
        }
        const cards = rows.map((row) => `
            <button type="button" class="fcflow-card${state.buyerId === row.id ? ' is-selected' : ''}" data-option-value="${escapeHtml(row.id)}">
                <i class="fa-solid fa-address-card" aria-hidden="true"></i>
                <span class="fcflow-card__body">
                    <span class="fcflow-card__label">${buyerNameNode(row.displayName)}</span>
                    <span class="fcflow-card__hint">${escapeHtml([row.farmContext, row.contact].filter(Boolean).join(' · ') || 'Sin datos de contacto')}</span>
                </span>
            </button>
        `).join('');
        return `
            ${searchField}
            <div class="fcflow-grid" style="margin-top:0.75rem;" data-flow-group="client">${cards}</div>
        `;
    }

    // P3 — chips con las fincas reales del agricultor.
    function renderStepFarm() {
        const farms = getFarms();
        if (!farms.length) {
            return `
                <div class="fcflow-note fcflow-note--info">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    <span>No tienes fincas registradas. El registro quedará sin finca y podrás continuar sin cultivo.</span>
                </div>
            `;
        }
        const farmCards = farms.map((farm) => optionCard({
            value: String(farm.id),
            label: String(farm.name || 'Finca'),
            hint: String(farm.location_text || ''),
            icon: 'fa-solid fa-house-chimney',
            selected: String(state.farmId) === String(farm.id)
        })).join('');
        return `<div class="fcflow-grid" data-flow-group="farm">${farmCards}</div>`;
    }

    // P4 — cultivos de la finca elegida con status produccion/finalizado (D4)
    // + chip honesto "Sin cultivo". Regla estricta: nunca cultivos de otra finca.
    function renderStepCrop() {
        const crops = getAvailableCrops().filter((crop) =>
            isEligibleFlowCrop(crop) && String(crop?.farm_id || '') === String(state.farmId));
        const cropCards = [
            optionCard({ value: '__general__', label: 'Sin cultivo', hint: 'No asociado a cultivo', icon: 'fa-solid fa-table-cells-large', selected: !state.cropId })
        ].concat(crops.map((crop) => optionCard({
            value: String(crop.id),
            label: cropDisplayLabel(crop),
            hint: [crop.variety, resolveFlowCropStatus(crop) === 'finalizado' ? 'Finalizado' : 'En producción'].filter(Boolean).join(' · '),
            icon: 'fa-solid fa-seedling',
            selected: String(state.cropId) === String(crop.id)
        }))).join('');
        const emptyNote = !crops.length && state.farmId
            ? `
                <div class="fcflow-note fcflow-note--info" style="margin-bottom:0.75rem;">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    <span>Esta finca no tiene cultivos en producción ni finalizados. Puedes continuar sin cultivo.</span>
                </div>
            `
            : '';
        return `
            ${emptyNote}
            <div class="fcflow-grid" data-flow-group="crop">${cropCards}</div>
        `;
    }

    // P5 — solo Fiado y Pagado (D3).
    function renderStepType() {
        const cards = Object.entries(EXISTING_RECORD_TYPES)
            .map(([value, meta]) => optionCard({ value, label: meta.label, hint: meta.hint, icon: meta.icon, selected: state.recordType === value }))
            .join('');
        return `<div class="fcflow-grid">${cards}</div>`;
    }

    function unitQtyLabel() {
        switch (state.unitType) {
            case 'kg': return 'Cantidad (kilogramos)';
            case 'cesta': return 'Cantidad (cestas)';
            default: return 'Cantidad (sacos)';
        }
    }

    // P6 — categoría honesta (réplica de la asignación automática de
    // subview=nuevo) + presentación/cantidad (réplica exacta de su P5).
    function renderStepCategory() {
        const categoryBlock = state.recordType === 'ingresos'
            ? `
                <p class="fcflow-label">Categoría</p>
                <div class="fcflow-grid fcflow-grid--2">
                    <div class="fcflow-card fcflow-card--static">
                        <i class="fa-solid fa-tag" aria-hidden="true"></i>
                        <span class="fcflow-card__body">
                            <span class="fcflow-card__label">${escapeHtml(resolvedCategoryLabel('ingresos', state.cropId))}</span>
                            <span class="fcflow-card__hint">Se asigna automáticamente según el cultivo.</span>
                        </span>
                    </div>
                </div>
                <div class="fcflow-note fcflow-note--info" style="margin-top:0.75rem;">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    <span>${state.cropId ? 'Con cultivo elegido, el pago se registra en la categoría Ventas.' : 'Sin cultivo, el pago se registra en la categoría General.'}</span>
                </div>
            `
            : `
                <p class="fcflow-label">Categoría</p>
                <div class="fcflow-note fcflow-note--info">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    <span>No aplica categoría para los fiados.</span>
                </div>
            `;

        const unitCards = UNIT_OPTIONS.map((unit) => optionCard({
            value: unit.value,
            label: unit.label,
            icon: unit.icon,
            selected: state.unitType === unit.value
        })).join('');
        const qty = Number(state.unitQty) > 0 ? Number(state.unitQty) : 1;
        return `
            ${categoryBlock}
            <p class="fcflow-label" style="margin-top:0.9rem;">Presentación</p>
            <div class="fcflow-grid fcflow-grid--2" data-flow-group="unit">${unitCards}</div>
            <div class="fcflow-field" style="margin-top:0.75rem;">
                <label class="fcflow-label" for="fcflow-qty">${escapeHtml(unitQtyLabel())}</label>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <button type="button" class="fcflow-manage__btn" data-action="qty-dec" aria-label="Restar">−1</button>
                    <input class="fcflow-input" type="number" id="fcflow-qty" min="0.01" step="0.01" inputmode="decimal" value="${escapeHtml(String(qty))}" style="max-width:130px; text-align:center;">
                    <button type="button" class="fcflow-manage__btn" data-action="qty-inc" aria-label="Sumar">+1</button>
                </div>
            </div>
        `;
    }

    // P7 — réplica exacta del P6 de subview=nuevo (moneda, monto, tasa de
    // mercado solo lectura, guardrail USD, fecha y concepto).
    function effectiveRate() {
        if (state.currency === 'USD') return 1;
        return getRate(state.currency, exchangeRates) || 0;
    }

    function marketRateText() {
        const rate = effectiveRate();
        return rate > 0 ? `${rate}` : 'sin tasa disponible ahora';
    }

    function usdEquivalent() {
        const monto = Number(state.monto) || 0;
        const rate = effectiveRate();
        return rate > 0 ? (monto / rate).toFixed(2) : '—';
    }

    function detectInflatedUsd() {
        if (state.currency !== 'USD') return false;
        const amount = Number(state.monto) || 0;
        if (amount < USD_GUARDRAIL_MIN) return false;
        const usdNum = Number(convertToUSD(amount, 'USD', 1));
        const delta = Math.abs(usdNum - amount);
        return delta <= Math.max(0.01, amount * 0.0001);
    }

    function renderStepForm() {
        const currencyCards = Object.entries(SUPPORTED_CURRENCIES).map(([code]) => optionCard({
            value: code,
            label: code === 'VES' ? 'Bs (VES)' : code,
            icon: 'fa-solid fa-coins',
            selected: state.currency === code
        })).join('');

        const rateBlock = state.currency !== 'USD'
            ? `
                <div class="fcflow-field" style="margin-top:0.75rem;">
                    <span class="fcflow-label">Tasa ${escapeHtml(state.currency)}/USD (mercado, solo lectura)</span>
                    <span class="fcflow-card__hint" id="fcflow-rate-read">${marketRateText()} · ${moneyNode(`≈ $${usdEquivalent()} USD`)}</span>
                </div>
            `
            : '';

        const inflatedUsd = detectInflatedUsd();
        const guardrail = inflatedUsd && !state.usdConfirmed
            ? `
                <div class="fcflow-note fcflow-note--warning" style="margin-top:0.75rem;">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <span>Monto alto en USD. Si el monto real está en COP/VES, cambia la moneda antes de confirmar.</span>
                </div>
                <label class="fcflow-checkline" style="margin-top:0.6rem;">
                    <input type="checkbox" id="fcflow-usd-confirm" ${state.usdConfirmed ? 'checked' : ''}>
                    <span>Confirmo que el monto está realmente en USD.</span>
                </label>
            `
            : '';

        return `
            <p class="fcflow-label">Moneda</p>
            <div class="fcflow-grid fcflow-grid--2" data-flow-group="currency">${currencyCards}</div>
            <div class="fcflow-field" style="margin-top:0.75rem;">
                <label class="fcflow-label" for="fcflow-monto">Monto *</label>
                <input class="fcflow-input" type="number" id="fcflow-monto" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" value="${escapeHtml(state.monto)}" style="font-size:1.15rem; font-weight:700; text-align:center;">
            </div>
            ${rateBlock}
            ${guardrail}
            <div class="fcflow-field" style="margin-top:0.75rem;">
                <label class="fcflow-label" for="fcflow-date">Fecha</label>
                <input class="fcflow-input" type="date" id="fcflow-date" max="${todayISO()}" value="${escapeHtml(state.fecha)}">
            </div>
            <div class="fcflow-field" style="margin-top:0.75rem;">
                <label class="fcflow-label" for="fcflow-concepto">Concepto *</label>
                <input class="fcflow-input" type="text" id="fcflow-concepto" placeholder="${escapeHtml(conceptPlaceholder())}" value="${escapeHtml(state.concepto)}" autocomplete="off">
            </div>
        `;
    }

    function conceptPlaceholder() {
        if (state.recordType === 'pendientes') return 'Ej: fiado o deuda';
        if (state.recordType === 'ingresos') return 'Ej: Venta de cosecha';
        return 'Concepto';
    }

    // P8 — resumen + Confirmar.
    function summaryRows() {
        const typeMeta = EXISTING_RECORD_TYPES[state.recordType];
        const crop = getAvailableCrops().find((item) => String(item.id) === String(state.cropId));
        const farm = getFarms().find((item) => String(item.id) === String(state.farmId));
        const selectedClient = state.clients.find((row) => row.id === state.buyerId);
        const cantidad = state.unitType === 'kg'
            ? `${state.unitQty} kg`
            : `${state.unitQty} ${state.unitType}${Number(state.unitQty) === 1 ? '' : 's'}`;
        const rows = [
            ['Cliente', state.buyerName],
            ['Vínculo', selectedClient?.linked ? 'Cuenta YavlGold vinculada' : 'Sin cuenta'],
            ['Tipo', typeMeta?.label || ''],
            ['Finca', farm ? String(farm.name || 'Finca') : '—'],
            ['Cultivo', crop ? cropDisplayLabel(crop) : 'Sin cultivo'],
            ['Categoría', state.recordType === 'ingresos' ? resolvedCategoryLabel('ingresos', state.cropId) : 'No aplica'],
            ['Cantidad', cantidad],
            ['Fecha', state.fecha],
            ['Concepto', buildConceptWithWho(state.recordType, state.concepto, state.buyerName)],
            ['Moneda', state.currency]
        ];
        if (state.currency !== 'USD') {
            rows.push(['Tasa', marketRateText()]);
            rows.push(['Equivalente', `≈ $${usdEquivalent()} USD`]);
        }
        return rows;
    }

    function renderStepSummary() {
        return `
            <dl class="fcflow-summary">
                ${summaryRows().map(([label, value]) => `
                    <div class="fcflow-summary__row">
                        <dt>${escapeHtml(label)}</dt>
                        <dd>${label === 'Cliente' ? buyerNameNode(value) : escapeHtml(value || '—')}</dd>
                    </div>
                `).join('')}
                <div class="fcflow-summary__row">
                    <dt>Monto</dt>
                    <dd><strong>${moneyNode(formatMoney(state.monto, state.currency))}</strong></dd>
                </div>
            </dl>
        `;
    }

    // Pantalla de éxito (terminal): trazabilidad + enlace al detalle del cliente.
    function renderDone() {
        const typeMeta = EXISTING_RECORD_TYPES[state.recordType];
        return `
            <div class="fcflow-done">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                <p class="fcflow-done__title">${escapeHtml(typeMeta?.successTitle || 'Registro guardado.')}</p>
                <p class="fcflow-done__desc">Cliente: ${buyerNameNode(state.buyerName)}</p>
                <div class="fcflow-done__actions">
                    <button type="button" class="btn-gold" data-action="go-detail">
                        Ir a ver el registro
                    </button>
                    <button type="button" class="btn-outline-gold" data-action="go-records">
                        Ir al facturero de clientes
                    </button>
                </div>
            </div>
        `;
    }

    function showStepError(message) {
        let node = root.querySelector('[data-flow-error]');
        if (!node) {
            node = document.createElement('div');
            node.setAttribute('data-flow-error', '');
            root.querySelector('.fcflow__body')?.prepend(node);
        }
        node.innerHTML = `
            <div class="fcflow-note fcflow-note--warning" style="margin-top:0.5rem;">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <span>${escapeHtml(message)}</span>
            </div>`;
    }

    function setSaving(isSaving) {
        state.saving = !!isSaving;
        const submitBtn = root.querySelector('[data-flow-submit]');
        if (submitBtn) {
            submitBtn.disabled = isSaving;
            submitBtn.innerHTML = isSaving
                ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Guardando…'
                : (currentStep() === 'summary' ? 'Confirmar' : 'Siguiente');
        }
    }

    function readUnitInputs() {
        const qtyEl = root.querySelector('#fcflow-qty');
        if (qtyEl) {
            const parsed = Number.parseFloat(qtyEl.value);
            state.unitQty = Number.isFinite(parsed) && parsed > 0 ? Math.min(999, parsed) : 1;
        }
    }

    function readFormInputsSilent() {
        const montoEl = root.querySelector('#fcflow-monto');
        if (montoEl) state.monto = montoEl.value;
        const conceptEl = root.querySelector('#fcflow-concepto');
        if (conceptEl) state.concepto = conceptEl.value.trim();
        const dateEl = root.querySelector('#fcflow-date');
        if (dateEl && dateEl.value) state.fecha = dateEl.value;
        const usdCheck = root.querySelector('#fcflow-usd-confirm');
        if (usdCheck) state.usdConfirmed = usdCheck.checked;
    }

    function formValid() {
        readFormInputsSilent();
        if (!(Number(state.monto) > 0)) return false;
        if (!state.concepto) return false;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(state.fecha || '')) return false;
        if (detectInflatedUsd() && !state.usdConfirmed) return false;
        return true;
    }

    function footerButton() {
        if (done) return '';
        const step = currentStep();
        const disabledAttrs = step === 'form' && !formValid() ? 'disabled' : '';
        const label = step === 'summary' ? 'Confirmar' : 'Siguiente';
        const backBtn = stepIndex > 0
            ? `<button type="button" class="btn-outline-gold" data-flow-stepback>Atrás</button>`
            : '';
        return `
            ${backBtn}
            <button type="button" class="btn-gold" data-flow-submit ${disabledAttrs}>
                ${label}
            </button>
        `;
    }

    // Siguiente es el único avance (canon de la familia).
    async function handleSubmit() {
        const step = currentStep();
        if (state.saving) return;
        if (step === 'account') {
            if (!state.accountChoice) {
                showStepError('Elige una opción para continuar.');
                return;
            }
            goNext();
            return;
        }
        if (step === 'client') {
            if (!state.buyerId || !state.clients.some((row) => row.id === state.buyerId)) {
                showStepError('Selecciona un cliente de tu libro.');
                return;
            }
            goNext();
            return;
        }
        if (step === 'farm') {
            if (getFarms().length && !state.farmId) {
                showStepError('Selecciona la finca de este registro.');
                return;
            }
            goNext();
            return;
        }
        if (step === 'crop') {
            goNext();
            return;
        }
        if (step === 'type') {
            if (!EXISTING_RECORD_TYPES[state.recordType]) {
                showStepError('Selecciona el tipo de registro.');
                return;
            }
            goNext();
            return;
        }
        if (step === 'category') {
            readUnitInputs();
            if (!(Number(state.unitQty) > 0)) {
                showStepError('Ingresa una cantidad mayor a cero.');
                return;
            }
            goNext();
            return;
        }
        if (step === 'form') {
            if (!formValid()) {
                showStepError(detectInflatedUsd() && !state.usdConfirmed
                    ? 'Confirma que el monto está realmente en USD (o cambia la moneda).'
                    : 'Completa monto, fecha y concepto.');
                return;
            }
            goNext();
            return;
        }
        if (step === 'summary') {
            readFormInputsSilent();
            if (!formValid()) {
                showStepError('Faltan datos del registro. Vuelve atrás y complétalos.');
                return;
            }
            await insertMovement();
        }
    }

    // Escritura exacta del primer registro de subview=nuevo (V3), reutilizando
    // sus helpers exportados. Solo rama pendientes/ingresos (D3).
    async function insertMovement() {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Sesión expirada.');

            const tabName = state.recordType;
            const crop = getAvailableCrops().find((item) => String(item.id) === String(state.cropId));
            const resolvedFarmId = state.farmId || (crop?.farm_id ? String(crop.farm_id) : '');
            const montoNum = parseFloat(state.monto) || 0;
            const rate = effectiveRate();
            const montoUsd = state.currency === 'USD'
                ? montoNum
                : (rate > 0 ? convertToUSD(montoNum, state.currency, rate) : null);

            const insertData = {
                user_id: user.id,
                crop_id: state.cropId || null,
                farm_id: resolvedFarmId || null,
                fecha: state.fecha,
                concepto: buildConceptWithWho(tabName, state.concepto, state.buyerName),
                monto: montoNum,
                currency: state.currency,
                exchange_rate: rate || null,
                monto_usd: montoUsd
            };

            if (tabName === 'pendientes') insertData.cliente = state.buyerName || 'Cliente general';
            if (tabName === 'ingresos') {
                insertData.categoria = insertData.crop_id ? 'ventas' : 'general';
                // Movimiento creado desde el cliente: se cuenta como pago de deuda.
                insertData.origin_table = 'agro_pending';
                insertData.transfer_state = 'active';
            }

            if (isBuyerIdentityRelevantTab(tabName)) {
                const buyerLink = await ensureBuyerIdentityLink({
                    supabase,
                    userId: user.id,
                    tabName,
                    concept: insertData.concepto,
                    whoValue: state.buyerName,
                    buyerHint: state.buyerName,
                    cause: insertData.causa,
                    originTable: insertData.origin_table
                });
                if (buyerLink.buyer_id !== undefined) insertData.buyer_id = buyerLink.buyer_id;
                if (buyerLink.buyer_group_key !== undefined) insertData.buyer_group_key = buyerLink.buyer_group_key;
                if (buyerLink.buyer_match_status !== undefined) insertData.buyer_match_status = buyerLink.buyer_match_status;
            }

            // Regla canónica del flow: saco/cesta → unit_qty con su unidad, SIN
            // quantity_kg · kg → SOLO quantity_kg (columnas nullable).
            const qty = Number(state.unitQty) || 1;
            if (state.unitType === 'kg') {
                insertData.quantity_kg = Math.round(qty * 1000) / 1000;
            } else {
                insertData.unit_type = state.unitType;
                insertData.unit_qty = qty;
            }

            const optionalFieldsByTab = {
                ingresos: ['origin_table', 'transfer_state', 'quantity_kg', 'monto_usd', 'exchange_rate', 'buyer_id', 'buyer_group_key', 'buyer_match_status', 'categoria'],
                pendientes: ['origin_table', 'quantity_kg', 'monto_usd', 'exchange_rate', 'buyer_id', 'buyer_group_key', 'buyer_match_status', 'cliente']
            };

            const { error } = await insertRowWithColumnFallback(
                { pendientes: 'agro_pending', ingresos: 'agro_income' }[tabName],
                insertData,
                optionalFieldsByTab[tabName] || []
            );
            if (error) throw error;

            emitRefreshEvents(tabName);
            options.onCreated?.({ table: tabName, buyerId: state.buyerId });
            done = true;
            syncHash();
            render();
        } catch (err) {
            showStepError(err?.message || 'No se pudo guardar el registro.');
        } finally {
            setSaving(false);
        }
    }

    function emitRefreshEvents(tabName) {
        const eventByTab = {
            pendientes: 'agro:pending:refreshed',
            ingresos: 'agro:income:changed'
        };
        if (eventByTab[tabName]) document.dispatchEvent(new CustomEvent(eventByTab[tabName]));
        document.dispatchEvent(new CustomEvent('agro:crops:refresh', { detail: { source: 'facturero-existing-flow', tab: tabName } }));
    }

    function bindEvents() {
        // Topbar: "Volver" retrocede un paso; desde P1 sale a la puerta.
        root.querySelectorAll('[data-flow-exit]').forEach((btn) => btn.addEventListener('click', goBack));
        root.querySelectorAll('[data-flow-home]').forEach((btn) => btn.addEventListener('click', () => { void goToStart(); }));
        root.querySelectorAll('[data-flow-stepback]').forEach((btn) => btn.addEventListener('click', goBack));

        root.querySelectorAll('.fcflow-card[data-option-value]').forEach((card) => {
            card.addEventListener('click', () => {
                const value = card.dataset.optionValue || '';
                const group = card.closest('[data-flow-group]')?.dataset.flowGroup || '';
                if (group === 'client') {
                    const found = state.clients.find((row) => row.id === value);
                    if (found) {
                        state.buyerId = found.id;
                        state.buyerName = found.displayName;
                        render();
                    }
                    return;
                }
                if (group === 'farm') {
                    state.farmId = value;
                    // Regla estricta de no mezcla: al cambiar de finca, el cultivo
                    // se limpia para nunca arrastrar uno de otra finca.
                    state.cropId = '';
                    render();
                    return;
                }
                if (group === 'crop') {
                    state.cropId = value === '__general__' ? '' : value;
                    render();
                    return;
                }
                if (group === 'unit') {
                    state.unitType = value;
                    render();
                    return;
                }
                if (group === 'currency') {
                    state.currency = value;
                    render();
                    return;
                }
                // Grupos sin contenedor (account/type): selección sin avance.
                if (value === 'account' || value === 'no-account') {
                    state.accountChoice = value === 'account' ? 'account' : 'none';
                    render();
                    return;
                }
                if (EXISTING_RECORD_TYPES[value]) {
                    state.recordType = value;
                    render();
                }
            });
        });

        root.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', (event) => {
                const action = btn.dataset.action;
                if (action === 'qty-inc' || action === 'qty-dec') {
                    readUnitInputs();
                    const delta = action === 'qty-inc' ? 1 : -1;
                    state.unitQty = Math.max(0.1, Math.min(999, +(Number(state.unitQty || 1) + delta).toFixed(2)));
                    render();
                    return;
                }
                if (action === 'go-detail') {
                    options.onGoToDetail?.(state.buyerId);
                    return;
                }
                if (action === 'go-records') {
                    options.onGoToRecords?.();
                }
            });
        });

        const searchInput = root.querySelector('#fcx-client-search');
        searchInput?.addEventListener('input', () => {
            state.clientSearch = searchInput.value;
            const body = root.querySelector('[data-flow-group="client"]');
            if (body) {
                const rows = visibleClients().filter((row) => matchesClientSearch(row, state.clientSearch));
                body.innerHTML = rows.length
                    ? rows.map((row) => `
                        <button type="button" class="fcflow-card${state.buyerId === row.id ? ' is-selected' : ''}" data-option-value="${escapeHtml(row.id)}">
                            <i class="fa-solid fa-address-card" aria-hidden="true"></i>
                            <span class="fcflow-card__body">
                                <span class="fcflow-card__label">${buyerNameNode(row.displayName)}</span>
                                <span class="fcflow-card__hint">${escapeHtml([row.farmContext, row.contact].filter(Boolean).join(' · ') || 'Sin datos de contacto')}</span>
                            </span>
                        </button>
                    `).join('')
                    : `
                        <div class="fcflow-note fcflow-note--warning" style="margin-top:0.75rem;">
                            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                            <span>No encontramos clientes con ese filtro. Prueba con otro nombre, finca o contacto.</span>
                        </div>
                    `;
                body.querySelectorAll('.fcflow-card[data-option-value]').forEach((card) => {
                    card.addEventListener('click', () => {
                        const found = state.clients.find((row) => row.id === card.dataset.optionValue);
                        if (found) {
                            state.buyerId = found.id;
                            state.buyerName = found.displayName;
                            render();
                        }
                    });
                });
            }
        });

        const qtyInput = root.querySelector('#fcflow-qty');
        qtyInput?.addEventListener('input', () => { readUnitInputs(); });

        ['#fcflow-monto', '#fcflow-date', '#fcflow-concepto', '#fcflow-usd-confirm'].forEach((selector) => {
            const input = root.querySelector(selector);
            input?.addEventListener('input', () => {
                if (selector === '#fcflow-monto') state.monto = input.value;
                if (selector === '#fcflow-date') state.fecha = input.value;
                if (selector === '#fcflow-concepto') state.concepto = input.value.trim();
                if (selector === '#fcflow-usd-confirm') state.usdConfirmed = input.checked;
                const submitBtn = root.querySelector('[data-flow-submit]');
                if (submitBtn && currentStep() === 'form') submitBtn.disabled = !formValid();
                const rateRead = root.querySelector('#fcflow-rate-read');
                if (rateRead && selector === '#fcflow-monto' && state.currency !== 'USD') {
                    rateRead.textContent = `${marketRateText()} · ≈ $${usdEquivalent()} USD`;
                }
            });
        });

        root.querySelector('[data-flow-submit]')?.addEventListener('click', () => void handleSubmit());
    }

    function render() {
        if (token !== activeExistingFlowToken) return;
        const step = currentStep();
        const bodyHtml = done ? renderDone()
            : step === 'account' ? renderStepAccount()
            : step === 'client' ? renderStepClient()
            : step === 'farm' ? renderStepFarm()
            : step === 'crop' ? renderStepCrop()
            : step === 'type' ? renderStepType()
            : step === 'category' ? renderStepCategory()
            : step === 'form' ? renderStepForm()
            : renderStepSummary();

        root.innerHTML = `
            <div class="${EXISTING_FLOW_CLASS}">
                ${!done ? `
                    <div class="fcflow__topbar">
                        <button type="button" class="fcflow__back" data-flow-exit>
                            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                            Volver
                        </button>
                        ${stepIndex > 0 ? `
                        <button type="button" class="fcflow__home" data-flow-home aria-label="Ir al inicio del wizard">
                            <i class="fa-solid fa-house" aria-hidden="true"></i>
                            <span class="fcflow__home-label">Ir a inicio</span>
                        </button>` : ''}
                        <span class="fcflow__subtitle">${escapeHtml(EXISTING_SUBTITLE)}</span>
                        <span class="fcflow__step">Paso ${stepNumber()} de ${TOTAL_STEPS}</span>
                    </div>
                ` : ''}
                ${guideText(step) && !done ? `<p class="fcflow__guide">${escapeHtml(guideText(step))}</p>` : ''}
                <div class="fcflow__body">${bodyHtml}</div>
                <div class="fcflow__footer">${footerButton()}</div>
            </div>
        `;
        bindEvents();
    }

    syncHash();
    render();
    void loadClients();

    return () => {
        if (token === activeExistingFlowToken) activeExistingFlowToken += 1;
    };
}
