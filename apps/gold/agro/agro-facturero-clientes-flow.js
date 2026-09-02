/**
 * Facturero de Clientes — Wizard por páginas profundas (sin modales).
 * Reemplaza la entrada modal SOLO dentro de Facturero de Clientes.
 * El modal de 4 pasos (agro-wizard.js) sigue vivo para el facturero general.
 *
 * Rutas hash: #view=facturero-clientes&subview=nuevo&paso=N&id=...
 * ADN V12: tokens, FA 6.5, sin emojis funcionales, sin modales.
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
    normalizeBuyerGroupKey
} from './agro-facturero-clientes.js';

const FLOW_ROOT_CLASS = 'fcflow';

// Mapa canónico de 8 pasos (P1..P8). RECORD es la subsecuencia P3..P8
// (cliente ya existente): la numeración global se mantiene sobre el mapa full.
const STEP_ORDER_NEW = ['link', 'data', 'type', 'crop', 'unit', 'details', 'summary', 'done'];
const STEP_ORDER_RECORD = ['type', 'crop', 'unit', 'details', 'summary', 'done'];
const TOTAL_STEPS = 8;

const RECORD_TYPES = Object.freeze({
    pendientes: Object.freeze({
        label: 'Fiado',
        hint: 'Te entregaron producto y te van a pagar.',
        icon: 'fa-solid fa-file-invoice-dollar',
        successTitle: 'Fiado registrado correctamente.'
    }),
    ingresos: Object.freeze({
        label: 'Pagado',
        hint: 'Cobraste un fiado o una venta al contado.',
        icon: 'fa-solid fa-hand-holding-dollar',
        successTitle: 'Pago registrado correctamente.'
    }),
    perdidas: Object.freeze({
        label: 'Pérdida',
        hint: 'Producto o dinero que se pierde y se cierra.',
        icon: 'fa-solid fa-arrow-trend-down',
        successTitle: 'Pérdida registrada correctamente.'
    }),
    transferencias: Object.freeze({
        label: 'Donación',
        hint: 'Producción regalada a alguien sin cobro.',
        icon: 'fa-solid fa-gift',
        successTitle: 'Donación registrada correctamente.'
    })
});

const UNIT_OPTIONS = [
    { value: 'saco', label: 'Saco', icon: 'fa-solid fa-box' },
    { value: 'cesta', label: 'Cesta', icon: 'fa-solid fa-basket-shopping' },
    { value: 'kg', label: 'Kg', icon: 'fa-solid fa-weight-scale' }
];

// Restricción del diseño aprobado (P4): solo producción o finalizados.
const FLOW_ALLOWED_CROP_STATUSES = new Set(['produccion', 'finalizado']);

const USD_GUARDRAIL_MIN = 1000;

let activeFlowToken = 0;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================================
// Hash routing (subview/paso/id) — compartido con la vista
// ============================================================

export function readFactureroHashRoute() {
    try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const view = String(hash.get('view') || '').trim().toLowerCase();
        if (view !== 'facturero-clientes' && view !== 'cartera-viva') return null;
        return {
            subview: String(hash.get('subview') || '').trim().toLowerCase(),
            paso: Number.parseInt(hash.get('paso') || '', 10) || null,
            id: String(hash.get('id') || '').trim()
        };
    } catch (_err) {
        return null;
    }
}

export function writeFactureroHashRoute({ subview = '', paso = null, id = '' } = {}) {
    try {
        const url = new URL(window.location.href);
        const params = new URLSearchParams();
        params.set('view', 'facturero-clientes');
        if (subview) params.set('subview', subview);
        if ((subview === 'nuevo' || subview === 'ver-clientes') && Number.isFinite(paso) && paso > 0) params.set('paso', String(paso));
        if (id) params.set('id', id);
        url.hash = `#${params.toString()}`;
        history.replaceState(null, '', url);
    } catch (_err) {
        // Ignore routing failures.
    }
}

function getAvailableCrops() {
    if (typeof window === 'undefined') return [];
    const snapshot = window.__AGRO_CROPS_STATE;
    return Array.isArray(snapshot?.crops) ? snapshot.crops : [];
}

function getFarms() {
    if (typeof window === 'undefined' || typeof window._agroFarms?.getFarms !== 'function') return [];
    const farms = window._agroFarms.getFarms();
    return Array.isArray(farms) ? farms : [];
}

function normalizeCropStatus(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, '_');
}

function resolveCropStatus(crop) {
    if (normalizeCropStatus(crop?.lost_at)) return 'lost';
    if (normalizeCropStatus(crop?.actual_harvest_date) || normalizeCropStatus(crop?.closed_at)) return 'finalizado';

    const stored = normalizeCropStatus(crop?.status);
    if (stored === 'finalizado' || stored === 'lost') return stored;
    const override = normalizeCropStatus(crop?.status_override);
    if (override === 'produccion' || override === 'finalizado' || override === 'lost') return override;
    if (String(crop?.status_mode || '').trim().toLowerCase() !== 'auto') return stored;

    const startKey = String(crop?.start_date || '').slice(0, 10);
    const harvestKey = String(crop?.expected_harvest_date || '').slice(0, 10);
    const startDate = new Date(`${startKey}T00:00:00`);
    const endDate = new Date(`${harvestKey}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return stored;
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000);
    if (totalDays <= 0) return stored;
    const elapsed = Math.floor((Date.now() - startDate.getTime()) / 86400000);
    const percent = Math.round((Math.min(Math.max(elapsed, 0), totalDays) / totalDays) * 100);
    if (percent >= 100) return 'finalizado';
    if (percent >= 25) return 'produccion';
    return normalizeCropStatus(crop?.status) || stored;
}

function isEligibleFlowCrop(crop) {
    if (!crop?.id) return false;
    return FLOW_ALLOWED_CROP_STATUSES.has(resolveCropStatus(crop));
}

function cropDisplayLabel(crop) {
    const rawName = String(crop?.name || '').trim().replace(/^[^\p{L}\p{N}]+/u, '').trim();
    return rawName || 'Cultivo';
}

function buildConceptWithWho(tabName, concept, whoValue) {
    const safeConcept = String(concept || '').trim();
    const who = String(whoValue || '').trim();
    if (!who) return safeConcept;
    if (tabName === 'ingresos') return `Venta a ${who} - ${safeConcept}`;
    if (tabName === 'pendientes') return `${safeConcept} - Cliente: ${who}`;
    if (tabName === 'transferencias') return `${safeConcept} - Beneficiario: ${who}`;
    if (tabName === 'perdidas') return `${safeConcept} - Causa: ${who}`;
    return safeConcept;
}

function formatMoney(value, currency) {
    const amount = Number(value) || 0;
    const cfg = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
    if (currency === 'USD') return `$${amount.toFixed(2)}`;
    return cfg.decimals === 0
        ? `${cfg.symbol} ${Math.round(amount).toLocaleString()}`
        : `${cfg.symbol} ${amount.toFixed(cfg.decimals)}`;
}

function todayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Copia fiel del fallback defensivo del wizard modal (agro-wizard.js:114-186):
// elimina columnas opcionales ausentes en bases legacy sin romper el insert.
const flowMissingColumnsCache = new Map();

function isMissingColumnError(error, column) {
    if (!error || !column) return false;
    const text = `${String(error.message || '').toLowerCase()} ${String(error.details || '').toLowerCase()}`;
    const col = String(column || '').toLowerCase();
    const hasMissingPhrase = text.includes('does not exist') || text.includes('could not find') || text.includes('not found');
    const mentionsColumn = text.includes(col) || text.includes(`"${col}"`) || text.includes(`'${col}'`);
    if (error.code === '42703' || error.code === 'PGRST204') return hasMissingPhrase && mentionsColumn;
    return hasMissingPhrase && text.includes('column') && mentionsColumn;
}

async function insertRowWithColumnFallback(tableName, payload, optionalFields = []) {
    let workingPayload = { ...(payload || {}) };
    const knownMissing = flowMissingColumnsCache.get(tableName);
    if (knownMissing instanceof Set) {
        optionalFields.forEach((field) => { if (knownMissing.has(field)) delete workingPayload[field]; });
    }
    let lastError = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
        const { error } = await supabase.from(tableName).insert(workingPayload).select('*').single();
        if (!error) return { data: workingPayload, error: null };
        lastError = error;
        let removedAny = false;
        const nextPayload = { ...workingPayload };
        optionalFields.forEach((field) => {
            if (!(field in nextPayload)) return;
            if (!isMissingColumnError(error, field)) return;
            delete nextPayload[field];
            removedAny = true;
        });
        if (!removedAny) return { data: null, error };
        workingPayload = nextPayload;
    }
    return { data: null, error: lastError || new Error(`No se pudo insertar en ${tableName}`) };
}

// ============================================================
// P0 — Puerta de entrada
// ============================================================

export function renderFactureroClientEntryGate(root, handlers = {}) {
    if (!root) return;
    root.innerHTML = `
        <div class="${FLOW_ROOT_CLASS}">
            <p class="fcflow__title">Facturero de Clientes</p>
            <p class="fcflow__guide">¿Qué quieres hacer hoy?</p>
            <div class="fcflow-doors">
                <button type="button" class="fcflow-door" data-flow-door="new">
                    <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
                    <span class="fcflow-door__title">Nuevo cliente</span>
                    <span class="fcflow-door__desc">Registra a alguien nuevo y su primer movimiento, paso a paso.</span>
                </button>
                <button type="button" class="fcflow-door" data-flow-door="registros">
                    <i class="fa-solid fa-address-book" aria-hidden="true"></i>
                    <span class="fcflow-door__title">Ver registros de clientes</span>
                    <span class="fcflow-door__desc">Consulta fiados, pagos y pérdidas de cada cliente.</span>
                </button>
            </div>
        </div>
    `;
    root.querySelector('[data-flow-door="new"]')?.addEventListener('click', () => handlers.onNewClient?.());
    root.querySelector('[data-flow-door="registros"]')?.addEventListener('click', () => handlers.onViewRecords?.());
}

// ============================================================
// Motor del wizard por páginas
// ============================================================

/**
 * options: {
 *   mode: 'new' | 'record',
 *   buyer: { id, name } | null,
 *   recordType: 'pendientes'|'ingresos'|'perdidas'|'transferencias' | null,
 *   cropId: string | null,
 *   startStep: index number within the mode's step order,
 *   onExit(): called when the user goes back past the first step,
 *   onCreated(movement): called after successful insert,
 *   onGoToDetail(buyerId), onGoToRecords(), onExitToEntry()
 * }
 */
export function openFactureroClientFlow(root, options = {}) {
    if (!root) return () => {};
    const token = ++activeFlowToken;
    const mode = options.mode === 'record' ? 'record' : 'new';
    const steps = mode === 'record' ? STEP_ORDER_RECORD : STEP_ORDER_NEW;
    let stepIndex = Math.min(Math.max(Number(options.startStep) || 0, 0), steps.length - 1);

    const state = {
        linkChoice: '',
        linkedEmail: '',
        linkedUserId: '',
        displayName: '',
        farmContext: '',
        phone: '',
        notes: '',
        buyerId: String(options.buyer?.id || '').trim(),
        buyerName: String(options.buyer?.name || '').trim(),
        recordType: RECORD_TYPES[options.recordType] ? options.recordType : '',
        farmId: '',
        cropId: String(options.cropId || '').trim(),
        unitType: 'saco',
        unitQty: 1,
        monto: '',
        currency: 'COP',
        fecha: todayISO(),
        concepto: '',
        usdConfirmed: false,
        saving: false,
        createdMovementTable: ''
    };

    let exchangeRates = { USD: 1, COP: null, VES: null };
    // Non-blocking: no re-render al llegar las tasas para no pisar inputs en curso.
    initExchangeRates().then((rates) => { if (rates && token === activeFlowToken) exchangeRates = rates; }).catch(() => {});

    function currentStep() { return steps[stepIndex]; }
    // Numeración global sobre el mapa completo de 8 pasos (P1..P8).
    function stepNumber() {
        return Math.min(STEP_ORDER_NEW.indexOf(currentStep()) + 1, TOTAL_STEPS);
    }
    function totalSteps() { return TOTAL_STEPS; }

    function syncHash() {
        writeFactureroHashRoute({
            subview: 'nuevo',
            paso: stepNumber(),
            id: state.buyerId || (mode === 'record' ? options.buyer?.id || '' : '')
        });
    }

    function goNext() {
        if (stepIndex < steps.length - 1) {
            stepIndex += 1;
            syncHash();
            render();
        }
    }

    // Volver de paso: retrocede exactamente un paso (nunca sale del wizard).
    function goBack() {
        if (stepIndex > 0) {
            stepIndex -= 1;
            syncHash();
            render();
            return;
        }
        options.onExit?.();
    }

    // Flecha superior: sale siempre a la entrada del Facturero de Clientes.
    function exitToEntry() {
        options.onExit?.();
    }

    function guideText(step) {
        switch (step) {
            case 'link': return 'Primero lo básico: ¿tu cliente ya usa YavlGold?';
            case 'data': return 'Cuéntanos quién es tu cliente.';
            case 'type': return 'Listo, es hora de crear el nuevo registro de tu cliente.';
            case 'crop': return state.cropId
                ? 'Cultivo seleccionado. Puedes cambiarlo si quieres.'
                : (state.farmId ? 'Ahora debes seleccionar tu cultivo.' : 'Ahora selecciona tu finca.');
            case 'unit': return state.unitType === 'kg'
                ? '¿Cuántos kilogramos movió?'
                : '¿Cómo se entregó o recibió, y cuánto?';
            case 'details': return 'Moneda, monto y concepto del registro.';
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

    function renderStepLink() {
        const withAccountForm = state.linkChoice === 'account'
            ? `
                <div class="fcflow-field" style="margin-top:0.75rem;">
                    <label class="fcflow-label" for="fcflow-email">Correo de su cuenta YavlGold</label>
                    <input class="fcflow-input" type="email" id="fcflow-email" placeholder="cliente@correo.com" value="${escapeHtml(state.linkedEmail)}" autocomplete="off">
                </div>
                <div id="fcflow-link-status"></div>
                <button type="button" class="btn-outline-gold" style="margin-top:0.75rem;" data-action="verify-account">
                    Verificar cuenta
                </button>
            `
            : '';
        return `
            <div class="fcflow-grid fcflow-grid--2">
                ${optionCard({ value: 'account', label: 'Con cuenta YavlGold', hint: 'Se vincula tras verificar su correo.', icon: 'fa-solid fa-link', selected: state.linkChoice === 'account' })}
                ${optionCard({ value: 'no-account', label: 'Sin cuenta', hint: 'Registro normal, sin vínculo.', icon: 'fa-solid fa-user', selected: state.linkChoice === 'none' })}
            </div>
            ${withAccountForm}
            ${state.linkedUserId ? `
                <div class="fcflow-note fcflow-note--success" style="margin-top:0.75rem;">
                    <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                    <span>Cuenta verificada: ${escapeHtml(state.linkedEmail)}. Se vinculará al cliente.</span>
                </div>
            ` : ''}
        `;
    }

    async function verifyAccount() {
        const statusNode = root.querySelector('#fcflow-link-status');
        const emailInput = root.querySelector('#fcflow-email');
        const email = String(emailInput?.value || '').trim().toLowerCase();
        state.linkedEmail = email;
        state.linkedUserId = '';
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (statusNode) statusNode.innerHTML = `
                <div class="fcflow-note fcflow-note--warning" style="margin-top:0.75rem;">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <span>Escribe un correo válido para poder verificar.</span>
                </div>`;
            return;
        }
        if (statusNode) {
            statusNode.innerHTML = `
                <div class="fcflow-note fcflow-note--info" style="margin-top:0.75rem;">
                    <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                    <span>Verificando cuenta…</span>
                </div>`;
        }
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id,email')
                .ilike('email', email)
                .maybeSingle();
            if (error) throw error;
            if (data?.id) {
                state.linkedUserId = String(data.id);
                if (statusNode) statusNode.innerHTML = `
                    <div class="fcflow-note fcflow-note--success" style="margin-top:0.75rem;">
                        <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                        <span>Cuenta verificada. Continúa para crear el cliente.</span>
                    </div>`;
            } else if (statusNode) {
                statusNode.innerHTML = `
                    <div class="fcflow-note fcflow-note--warning" style="margin-top:0.75rem;">
                        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                        <span>No encontramos una cuenta YavlGold con ese correo. Puedes registrarlo sin cuenta.</span>
                    </div>`;
            }
        } catch (_err) {
            if (statusNode) statusNode.innerHTML = `
                <div class="fcflow-note fcflow-note--warning" style="margin-top:0.75rem;">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <span>No pudimos verificar ahora. Puedes continuar sin cuenta.</span>
                </div>`;
        }
    }

    async function saveBuyerFromDataStep() {
        const nameInput = root.querySelector('#fcflow-name');
        const farmInput = root.querySelector('#fcflow-farm-context');
        const phoneInput = root.querySelector('#fcflow-phone');
        const notesInput = root.querySelector('#fcflow-notes');
        const displayName = String(nameInput?.value || '').trim();
        if (!displayName) {
            showStepError('Ingresa el nombre del cliente.');
            return false;
        }
        const canonicalName = normalizeBuyerGroupKey(displayName);
        if (!canonicalName) {
            showStepError('Ingresa un nombre válido para este cliente.');
            return false;
        }
        if (state.buyerId) {
            state.buyerName = displayName;
            return true;
        }

        const farmContext = String(farmInput?.value || '').trim();
        const phone = String(phoneInput?.value || '').trim();
        const notesRaw = String(notesInput?.value || '').trim();
        const notesParts = [notesRaw];
        if (farmContext) notesParts.push(`Finca: ${farmContext}`);
        const notes = notesParts.filter(Boolean).join('\n') || null;

        setSaving(true);
        try {
            const { data: existing } = await supabase
                .from('agro_buyers')
                .select('id,display_name')
                .eq('user_id', (await supabase.auth.getUser()).data.user.id)
                .eq('canonical_name', canonicalName)
                .maybeSingle();

            if (existing?.id) {
                state.buyerId = String(existing.id);
                state.buyerName = String(existing.display_name || displayName);
                showStepError(`Ya existe un cliente llamado "${state.buyerName}". Seguiremos con ese cliente.`);
                setSaving(false);
                window.setTimeout(() => { if (token === activeFlowToken) goNext(); }, 900);
                return true;
            }

            const payload = {
                display_name: displayName,
                group_key: canonicalName,
                canonical_name: canonicalName,
                status: 'active',
                phone: phone || null,
                whatsapp: phone || null,
                notes
            };
            if (state.linkedUserId) payload.linked_user_id = state.linkedUserId;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Sesión expirada.');

            const { data, error } = await supabase
                .from('agro_buyers')
                .insert([{ user_id: user.id, ...payload }])
                .select('id,display_name')
                .single();
            if (error) throw error;

            state.buyerId = String(data.id);
            state.buyerName = String(data.display_name || displayName);
            document.dispatchEvent(new CustomEvent('agro:client:changed', {
                detail: { clientId: state.buyerId, groupKey: canonicalName, created: true, openDetail: false }
            }));
            setSaving(false);
            return true;
        } catch (err) {
            setSaving(false);
            showStepError(err?.message || 'No se pudo guardar el cliente.');
            return false;
        }
    }

    function renderStepData() {
        return `
            <div class="fcflow-grid">
                <div class="fcflow-field">
                    <label class="fcflow-label" for="fcflow-name">Nombre del cliente *</label>
                    <input class="fcflow-input" type="text" id="fcflow-name" placeholder="Ej: Jesús, Marino…" value="${escapeHtml(state.displayName)}" autocomplete="off">
                </div>
                <div class="fcflow-field">
                    <label class="fcflow-label" for="fcflow-farm-context">Finca (contexto)</label>
                    <input class="fcflow-input" type="text" id="fcflow-farm-context" placeholder="Ej: Finca La Esperanza" value="${escapeHtml(state.farmContext)}" autocomplete="off">
                </div>
                <div class="fcflow-field">
                    <label class="fcflow-label" for="fcflow-phone">Contacto (teléfono / WhatsApp)</label>
                    <input class="fcflow-input" type="tel" id="fcflow-phone" placeholder="Ej: 0414-1234567" value="${escapeHtml(state.phone)}" autocomplete="off">
                </div>
                <div class="fcflow-field">
                    <label class="fcflow-label" for="fcflow-notes">Nota (opcional)</label>
                    <input class="fcflow-input" type="text" id="fcflow-notes" placeholder="Algo que quieras recordar" value="${escapeHtml(state.notes)}" autocomplete="off">
                </div>
            </div>
        `;
    }

    function renderStepType() {
        const cards = Object.entries(RECORD_TYPES)
            .map(([value, meta]) => optionCard({ value, label: meta.label, hint: meta.hint, icon: meta.icon, selected: state.recordType === value }))
            .join('');
        return `<div class="fcflow-grid">${cards}</div>`;
    }

    function eligibleCropsForFarm(farmId) {
        const crops = getAvailableCrops().filter((crop) => isEligibleFlowCrop(crop));
        if (!farmId) return crops;
        return crops.filter((crop) => String(crop?.farm_id || '') === String(farmId));
    }

    function renderStepCrop() {
        const farms = getFarms();
        const farmCards = [
            optionCard({ value: '__none__', label: 'Sin finca específica', hint: 'Movimiento general', icon: 'fa-solid fa-map', selected: !state.farmId })
        ].concat(farms.map((farm) => optionCard({
            value: String(farm.id),
            label: String(farm.name || 'Finca'),
            hint: String(farm.location_text || ''),
            icon: 'fa-solid fa-house-chimney',
            selected: String(state.farmId) === String(farm.id)
        }))).join('');

        const crops = eligibleCropsForFarm(state.farmId);
        const cropCards = [
            optionCard({ value: '__general__', label: 'General / Sin cultivo', hint: 'No asociado a cultivo', icon: 'fa-solid fa-table-cells-large', selected: !state.cropId })
        ].concat(crops.map((crop) => optionCard({
            value: String(crop.id),
            label: cropDisplayLabel(crop),
            hint: [crop.variety, resolveCropStatus(crop) === 'finalizado' ? 'Finalizado' : 'En producción'].filter(Boolean).join(' · '),
            icon: 'fa-solid fa-seedling',
            selected: String(state.cropId) === String(crop.id)
        }))).join('');

        return `
            <p class="fcflow-label">Finca</p>
            <div class="fcflow-grid" data-flow-group="farm">${farmCards}</div>
            <p class="fcflow-label" style="margin-top:0.9rem;">Cultivo</p>
            <div class="fcflow-grid" data-flow-group="crop">${cropCards}</div>
        `;
    }

    function unitQtyLabel() {
        switch (state.unitType) {
            case 'kg': return 'Cantidad (kilogramos)';
            case 'cesta': return 'Cantidad (cestas)';
            default: return 'Cantidad (sacos)';
        }
    }

    function renderStepUnit() {
        const unitCards = UNIT_OPTIONS.map((unit) => optionCard({
            value: unit.value,
            label: unit.label,
            icon: unit.icon,
            selected: state.unitType === unit.value
        })).join('');
        const qty = Number(state.unitQty) > 0 ? Number(state.unitQty) : 1;
        return `
            <p class="fcflow-label">Presentación</p>
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

    function renderCurrencyAmountSection() {
        const currencyCards = Object.entries(SUPPORTED_CURRENCIES).map(([code, cfg]) => optionCard({
            value: code,
            label: code === 'VES' ? 'Bs (VES)' : code,
            icon: 'fa-solid fa-coins',
            selected: state.currency === code
        })).join('');

        const rateBlock = state.currency !== 'USD'
            ? `
                <div class="fcflow-field" style="margin-top:0.75rem;">
                    <span class="fcflow-label">Tasa ${escapeHtml(state.currency)}/USD (mercado, solo lectura)</span>
                    <span class="fcflow-card__hint" id="fcflow-rate-read">${marketRateText()} · ≈ $${usdEquivalent()} USD</span>
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
        `;
    }

    // Tasa SIEMPRE de mercado (solo lectura): sin override manual en este flow.
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

    function readUnitInputs() {
        const qtyEl = root.querySelector('#fcflow-qty');
        if (qtyEl) {
            const parsed = Number.parseFloat(qtyEl.value);
            state.unitQty = Number.isFinite(parsed) && parsed > 0 ? Math.min(999, parsed) : 1;
        }
    }

    function readDetailsInputs() {
        const montoEl = root.querySelector('#fcflow-monto');
        if (montoEl) state.monto = montoEl.value;
        const dateEl = root.querySelector('#fcflow-date');
        if (dateEl) state.fecha = dateEl.value || todayISO();
        const conceptEl = root.querySelector('#fcflow-concepto');
        if (conceptEl) state.concepto = conceptEl.value.trim();
        const usdCheck = root.querySelector('#fcflow-usd-confirm');
        if (usdCheck) state.usdConfirmed = usdCheck.checked;
    }

    function detailsValid() {
        readDetailsInputsSilent();
        if (!(Number(state.monto) > 0)) return false;
        if (!state.concepto) return false;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(state.fecha || '')) return false;
        if (detectInflatedUsd() && !state.usdConfirmed) return false;
        return true;
    }

    function readDetailsInputsSilent() {
        const montoEl = root.querySelector('#fcflow-monto');
        if (montoEl) state.monto = montoEl.value;
        const conceptEl = root.querySelector('#fcflow-concepto');
        if (conceptEl) state.concepto = conceptEl.value.trim();
        const dateEl = root.querySelector('#fcflow-date');
        if (dateEl && dateEl.value) state.fecha = dateEl.value;
        const usdCheck = root.querySelector('#fcflow-usd-confirm');
        if (usdCheck) state.usdConfirmed = usdCheck.checked;
    }

    function summaryRows() {
        const typeMeta = RECORD_TYPES[state.recordType];
        const crop = getAvailableCrops().find((item) => String(item.id) === String(state.cropId));
        const farm = getFarms().find((item) => String(item.id) === String(state.farmId));
        const cantidad = state.unitType === 'kg'
            ? `${state.unitQty} kg`
            : `${state.unitQty} ${state.unitType}${Number(state.unitQty) === 1 ? '' : 's'}`;
        const rows = [
            ['Cliente', state.buyerName],
            ['Vínculo', state.linkedUserId ? `Cuenta YavlGold (${state.linkedEmail})` : 'Sin cuenta'],
            ['Tipo', typeMeta?.label || ''],
            ['Cultivo', crop ? cropDisplayLabel(crop) : 'General'],
            ['Finca', farm ? String(farm.name || 'Finca') : '—'],
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

    // P7 — resumen completo + Confirmar
    function renderStepSummary() {
        return `
            <dl class="fcflow-summary">
                ${summaryRows().map(([label, value]) => `
                    <div class="fcflow-summary__row">
                        <dt>${escapeHtml(label)}</dt>
                        <dd>${escapeHtml(value || '—')}</dd>
                    </div>
                `).join('')}
                <div class="fcflow-summary__row">
                    <dt>Monto</dt>
                    <dd><strong>${escapeHtml(formatMoney(state.monto, state.currency))}</strong></dd>
                </div>
            </dl>
        `;
    }

    // P6 — moneda + monto + tasa (mercado, solo lectura) + concepto + fecha
    function renderStepDetails() {
        return `
            ${renderCurrencyAmountSection()}
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
        switch (state.recordType) {
            case 'pendientes': return 'Ej: fiado o deuda';
            case 'ingresos': return 'Ej: Venta de cosecha';
            case 'perdidas': return 'Ej: Plaga, Inundación';
            case 'transferencias': return 'Ej: Donación de producción';
            default: return 'Concepto';
        }
    }

    function renderStepDone() {
        const typeMeta = RECORD_TYPES[state.recordType];
        return `
            <div class="fcflow-done">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                <p class="fcflow-done__title">${escapeHtml(typeMeta?.successTitle || 'Registro guardado.')}</p>
                <p class="fcflow-done__desc">Cliente: ${escapeHtml(state.buyerName || '—')}</p>
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

    function clearStepError() {
        root.querySelector('[data-flow-error]')?.remove();
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

    function footerButton() {
        const step = currentStep();
        if (step === 'done') return '';
        const disabledAttrs = step === 'details' && !detailsValid() ? 'disabled' : '';
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

    async function handleSubmit() {
        const step = currentStep();
        if (state.saving) return;
        if (step === 'link') {
            if (!state.linkChoice) {
                showStepError('Elige una opción para continuar.');
                return;
            }
            goNext();
            return;
        }
        if (step === 'data') {
            const ok = await saveBuyerFromDataStep();
            if (ok) goNext();
            return;
        }
        if (step === 'type') {
            if (!RECORD_TYPES[state.recordType]) {
                showStepError('Selecciona el tipo de registro.');
                return;
            }
            goNext();
            return;
        }
        if (step === 'crop') {
            goNext();
            return;
        }
        if (step === 'unit') {
            readUnitInputs();
            if (!(Number(state.unitQty) > 0)) {
                showStepError('Ingresa una cantidad mayor a cero.');
                return;
            }
            goNext();
            return;
        }
        if (step === 'details') {
            if (!detailsValid()) {
                showStepError(detectInflatedUsd() && !state.usdConfirmed
                    ? 'Confirma que el monto está realmente en USD (o cambia la moneda).'
                    : 'Completa monto, fecha y concepto.');
                return;
            }
            goNext();
            return;
        }
        if (step === 'summary') {
            readDetailsInputsSilent();
            if (!detailsValid()) {
                showStepError('Faltan datos del registro. Vuelve atrás y complétalos.');
                return;
            }
            await insertMovement();
        }
    }

    async function insertMovement() {
        setSaving(true);
        clearStepError();
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
                [tabName === 'gastos' ? 'date' : 'fecha']: state.fecha,
                [tabName === 'gastos' ? 'concept' : 'concepto']: buildConceptWithWho(tabName, state.concepto, state.buyerName),
                [tabName === 'gastos' ? 'amount' : 'monto']: montoNum,
                currency: state.currency,
                exchange_rate: rate || null,
                monto_usd: montoUsd
            };

            if (tabName === 'pendientes') insertData.cliente = state.buyerName || 'Cliente general';
            if (tabName === 'perdidas') insertData.causa = state.buyerName || 'Sin causa especificada';
            if (tabName === 'transferencias') insertData.destino = state.buyerName || 'Beneficiario general';
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
                    concept: insertData[tabName === 'gastos' ? 'concept' : 'concepto'],
                    whoValue: state.buyerName,
                    buyerHint: state.buyerName,
                    cause: insertData.causa,
                    originTable: insertData.origin_table
                });
                if (buyerLink.buyer_id !== undefined) insertData.buyer_id = buyerLink.buyer_id;
                if (buyerLink.buyer_group_key !== undefined) insertData.buyer_group_key = buyerLink.buyer_group_key;
                if (buyerLink.buyer_match_status !== undefined) insertData.buyer_match_status = buyerLink.buyer_match_status;
            }

            // Regla canónica del flow: saco/cesta → unit_qty con su unidad,
            // SIN quantity_kg · kg → SOLO quantity_kg (columnas nullable:
            // 20260327001000_agro_facturero_base_order_repair.sql:39-41).
            const qty = Number(state.unitQty) || 1;
            if (state.unitType === 'kg') {
                insertData.quantity_kg = Math.round(qty * 1000) / 1000;
            } else {
                insertData.unit_type = state.unitType;
                insertData.unit_qty = qty;
            }

            const optionalFieldsByTab = {
                ingresos: ['origin_table', 'transfer_state', 'quantity_kg', 'monto_usd', 'exchange_rate', 'buyer_id', 'buyer_group_key', 'buyer_match_status', 'categoria'],
                pendientes: ['origin_table', 'quantity_kg', 'monto_usd', 'exchange_rate', 'buyer_id', 'buyer_group_key', 'buyer_match_status', 'cliente'],
                perdidas: ['origin_table', 'quantity_kg', 'monto_usd', 'exchange_rate', 'buyer_id', 'buyer_group_key', 'buyer_match_status'],
                transferencias: ['quantity_kg', 'monto_usd', 'exchange_rate']
            };

            const { error } = await insertRowWithColumnFallback(
                { pendientes: 'agro_pending', ingresos: 'agro_income', perdidas: 'agro_losses', transferencias: 'agro_transfers' }[tabName],
                insertData,
                optionalFieldsByTab[tabName] || []
            );
            if (error) throw error;

            state.createdMovementTable = tabName;
            emitRefreshEvents(tabName);
            options.onCreated?.({ table: tabName, buyerId: state.buyerId });
            stepIndex = steps.indexOf('done');
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
            ingresos: 'agro:income:changed',
            perdidas: 'agro:losses:changed',
            transferencias: 'agro:transfers:refreshed'
        };
        if (eventByTab[tabName]) document.dispatchEvent(new CustomEvent(eventByTab[tabName]));
        document.dispatchEvent(new CustomEvent('agro:crops:refresh', { detail: { source: 'facturero-flow', tab: tabName } }));
    }

    function bindEvents() {
        // Flecha superior: salida a la entrada del facturero (nunca retrocede paso).
        root.querySelectorAll('[data-flow-exit]').forEach((btn) => btn.addEventListener('click', exitToEntry));
        // Volver de paso: retrocede exactamente un paso.
        root.querySelectorAll('[data-flow-stepback]').forEach((btn) => btn.addEventListener('click', goBack));

        root.querySelectorAll('.fcflow-card[data-option-value]').forEach((card) => {
            card.addEventListener('click', () => {
                const value = card.dataset.optionValue || '';
                const group = card.closest('[data-flow-group]')?.dataset.flowGroup || '';
                if (group === 'farm') {
                    state.farmId = value === '__none__' ? '' : value;
                    state.cropId = '';
                    render();
                    return;
                }
                if (group === 'crop') {
                    state.cropId = value === '__general__' ? '' : value;
                    const crop = getAvailableCrops().find((item) => String(item.id) === String(state.cropId));
                    if (crop?.farm_id) state.farmId = String(crop.farm_id);
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
                // Grupos sin contenedor (link/type)
                if (value === 'account' || value === 'no-account') {
                    state.linkChoice = value === 'account' ? 'account' : 'none';
                    if (state.linkChoice === 'none') {
                        state.linkedUserId = '';
                        state.linkedEmail = '';
                        goNext();
                        return;
                    }
                    render();
                    return;
                }
                if (RECORD_TYPES[value]) {
                    state.recordType = value;
                    goNext();
                }
            });
        });

        root.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', async (event) => {
                const action = btn.dataset.action;
                if (action === 'verify-account') {
                    event.preventDefault();
                    await verifyAccount();
                    return;
                }
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

        ['#fcflow-email'].forEach((selector) => {
            const input = root.querySelector(selector);
            input?.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    void verifyAccount();
                }
            });
        });

        ['#fcflow-name', '#fcflow-farm-context', '#fcflow-phone', '#fcflow-notes'].forEach((selector) => {
            const input = root.querySelector(selector);
            input?.addEventListener('input', () => {
                if (selector === '#fcflow-name') state.displayName = input.value;
                if (selector === '#fcflow-farm-context') state.farmContext = input.value;
                if (selector === '#fcflow-phone') state.phone = input.value;
                if (selector === '#fcflow-notes') state.notes = input.value;
            });
        });

        ['#fcflow-monto', '#fcflow-date', '#fcflow-concepto', '#fcflow-usd-confirm'].forEach((selector) => {
            const input = root.querySelector(selector);
            input?.addEventListener('input', () => {
                if (selector === '#fcflow-monto') state.monto = input.value;
                if (selector === '#fcflow-date') state.fecha = input.value;
                if (selector === '#fcflow-concepto') state.concepto = input.value.trim();
                if (selector === '#fcflow-usd-confirm') state.usdConfirmed = input.checked;
                const submitBtn = root.querySelector('[data-flow-submit]');
                if (submitBtn && currentStep() === 'details') submitBtn.disabled = !detailsValid();
                const rateRead = root.querySelector('#fcflow-rate-read');
                if (rateRead && selector === '#fcflow-monto' && state.currency !== 'USD') {
                    rateRead.textContent = `${marketRateText()} · ≈ $${usdEquivalent()} USD`;
                }
            });
        });

        root.querySelector('[data-flow-submit]')?.addEventListener('click', () => void handleSubmit());
    }

    function render() {
        if (token !== activeFlowToken) return;
        const step = currentStep();
        const bodyHtml = step === 'link' ? renderStepLink()
            : step === 'data' ? renderStepData()
            : step === 'type' ? renderStepType()
            : step === 'crop' ? renderStepCrop()
            : step === 'unit' ? renderStepUnit()
            : step === 'details' ? renderStepDetails()
            : step === 'summary' ? renderStepSummary()
            : renderStepDone();

        root.innerHTML = `
            <div class="${FLOW_ROOT_CLASS}">
                ${step !== 'done' ? `
                    <div class="fcflow__topbar">
                        <button type="button" class="fcflow__back" data-flow-exit>
                            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                            Entrada
                        </button>
                        <span class="fcflow__subtitle">Creación de nuevo cliente y registro</span>
                        <span class="fcflow__step">Paso ${stepNumber()} de ${totalSteps()}</span>
                    </div>
                ` : ''}
                ${guideText(step) ? `<p class="fcflow__guide">${escapeHtml(guideText(step))}</p>` : ''}
                <div class="fcflow__body">${bodyHtml}</div>
                <div class="fcflow__footer">${footerButton()}</div>
            </div>
        `;
        bindEvents();
    }

    syncHash();
    render();

    return () => {
        if (token === activeFlowToken) activeFlowToken += 1;
    };
}
