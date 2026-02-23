/**
 * AgroWizard — Registro guiado por carrusel
 * Archivo separado para mantener agro.js limpio.
 * Exporta openAgroWizard(tabName, deps) como función principal.
 */

import { SUPPORTED_CURRENCIES, initExchangeRates, getRate, convertToUSD, hasOverride, clearOverride } from './agro-exchange.js';

// ============================================================
// TAB METADATA
// ============================================================
const WIZARD_TAB_META = {
    pendientes: {
        title: 'Registrar Pendiente',
        icon: '⏳',
        conceptPlaceholder: 'Ej: pendiente o deuda',
        whoLabel: 'Cliente',
        whoPlaceholder: 'Ej: Jesús, Marino...',
        hasWho: true,
        hasUnits: true,
        table: 'agro_pending',
        successMsg: '✅ Pendiente registrado'
    },
    ingresos: {
        title: 'Registrar Ingreso',
        icon: '💰',
        conceptPlaceholder: 'Ej: Venta de cosecha',
        whoLabel: 'Comprador',
        whoPlaceholder: 'Ej: Jesús, Pedro...',
        hasWho: true,
        hasUnits: true,
        table: 'agro_income',
        successMsg: '✅ Ingreso registrado'
    },
    gastos: {
        title: 'Registrar Gasto',
        icon: '💸',
        conceptPlaceholder: 'Ej: Abono, Flete, Obrero',
        whoLabel: null,
        whoPlaceholder: '',
        hasWho: false,
        hasUnits: false,
        table: 'agro_expenses',
        successMsg: '✅ Gasto registrado'
    },
    perdidas: {
        title: 'Registrar Pérdida',
        icon: '📉',
        conceptPlaceholder: 'Ej: Plaga, Inundación',
        whoLabel: 'Causa/Responsable',
        whoPlaceholder: 'Ej: Lluvia, Plaga...',
        hasWho: true,
        hasUnits: true,
        table: 'agro_losses',
        successMsg: '✅ Pérdida registrada'
    },
    transferencias: {
        title: 'Registrar Donación',
        icon: '🎁',
        conceptPlaceholder: 'Ej: Donación de producción',
        whoLabel: 'Beneficiario',
        whoPlaceholder: 'Ej: Vecino, iglesia...',
        hasWho: true,
        hasUnits: true,
        table: 'agro_transfers',
        successMsg: '✅ Donación registrada'
    }
};

const UNIT_OPTIONS = [
    { value: 'saco', label: 'Saco', icon: '🥡', singular: 'saco', plural: 'sacos' },
    { value: 'cesta', label: 'Cesta', icon: '🧺', singular: 'cesta', plural: 'cestas' },
    { value: 'kg', label: 'Kg', icon: '⚖️', singular: 'kg', plural: 'kg' }
];

function normalizeWizardCropId(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text || null;
}

const CROP_EMOJI_TOKEN_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
const CROP_TEXT_TOKEN_RE = /[\p{L}\p{N}]/u;

function isCropEmojiToken(token) {
    const value = String(token || '').trim();
    if (!value) return false;
    return CROP_EMOJI_TOKEN_RE.test(value) && !CROP_TEXT_TOKEN_RE.test(value);
}

function getCropDisplayParts(crop, options = {}) {
    const fallbackIcon = String(options.fallbackIcon || '🌱').trim() || '🌱';
    const fallbackName = String(options.fallbackName || 'Cultivo').trim() || 'Cultivo';
    const rawName = String(crop?.name || '').trim();
    const tokens = rawName ? rawName.split(/\s+/).filter(Boolean) : [];
    const leadingIcons = [];
    let cursor = 0;

    while (cursor < tokens.length && isCropEmojiToken(tokens[cursor])) {
        leadingIcons.push(tokens[cursor]);
        cursor += 1;
    }

    const iconFromName = leadingIcons.length ? leadingIcons[leadingIcons.length - 1] : '';
    const iconCandidate = iconFromName || String(crop?.icon || '').trim();
    const icon = isCropEmojiToken(iconCandidate) ? iconCandidate : fallbackIcon;
    const name = tokens.slice(cursor).join(' ').trim() || fallbackName;

    return { icon, name };
}

const INACTIVE_WIZARD_CROP_STATUSES = new Set([
    'finalizado',
    'cancelado',
    'harvested',
    'cancelled',
    'cosechado'
]);

function normalizeWizardCropStatus(value) {
    return String(value || '').trim().toLowerCase();
}

function isActiveWizardCrop(crop) {
    if (!crop || !crop.id) return false;
    if (crop.actual_harvest_date) return false;
    const override = normalizeWizardCropStatus(crop.status_override);
    if (override && INACTIVE_WIZARD_CROP_STATUSES.has(override)) return false;
    const status = normalizeWizardCropStatus(crop.status);
    if (status && INACTIVE_WIZARD_CROP_STATUSES.has(status)) return false;
    return true;
}

function getWizardActiveCrops(crops, includeCropId = null) {
    const list = Array.isArray(crops) ? crops : [];
    const active = list.filter(isActiveWizardCrop);
    const includeId = normalizeWizardCropId(includeCropId);
    if (!includeId) return active;
    if (active.some((crop) => String(crop.id) === String(includeId))) return active;
    const fallback = list.find((crop) => String(crop.id) === String(includeId));
    return fallback ? [fallback, ...active] : active;
}

// ============================================================
// CSS INJECTION
// ============================================================
function injectWizardStyles() {
    if (document.getElementById('agro-wizard-styles')) return;
    const style = document.createElement('style');
    style.id = 'agro-wizard-styles';
    style.textContent = `
        .agro-wizard-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.92);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0;
            animation: wizFadeIn 0.3s ease;
        }
        @keyframes wizFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .agro-wizard-card {
            background: #0d0d0d;
            border: 1px solid rgba(200,167,82,0.3);
            border-radius: 20px;
            width: 100%;
            max-width: 480px;
            max-height: 95vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 0 60px rgba(200,167,82,0.08);
        }

        /* Progress bar */
        .agro-wizard-progress {
            height: 4px;
            background: rgba(255,255,255,0.08);
            border-radius: 4px 4px 0 0;
            overflow: hidden;
            flex-shrink: 0;
        }
        .agro-wizard-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #C8A752, #e6c566);
            transition: width 0.4s ease;
            border-radius: 4px;
        }

        /* Header */
        .agro-wizard-header {
            padding: 1.25rem 1.5rem 0.75rem;
            text-align: center;
            flex-shrink: 0;
        }
        .agro-wizard-header h3 {
            color: #C8A752;
            font-family: 'Orbitron', sans-serif;
            font-size: 1rem;
            margin: 0 0 0.25rem;
            font-weight: 600;
        }
        .agro-wizard-header .wiz-subtitle {
            color: rgba(255,255,255,0.5);
            font-size: 0.8rem;
            margin: 0;
        }

        /* Step container */
        .agro-wizard-body {
            flex: 1;
            overflow-y: auto;
            padding: 1rem 1.5rem;
            -webkit-overflow-scrolling: touch;
        }

        /* Step transitions */
        .agro-wizard-step {
            display: none;
            animation: wizSlideIn 0.3s ease;
        }
        .agro-wizard-step.active { display: block; }
        @keyframes wizSlideIn {
            from { opacity: 0; transform: translateX(30px); }
            to { opacity: 1; transform: translateX(0); }
        }

        /* Step question */
        .wiz-question {
            color: #fff;
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 1rem;
            text-align: center;
        }

        /* Crop cards grid */
        .wiz-crops-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
        }
        .wiz-crop-btn {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(200,167,82,0.2);
            border-radius: 12px;
            padding: 1rem 0.75rem;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s ease;
            min-height: 70px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
        }
        .wiz-crop-btn:hover, .wiz-crop-btn:focus {
            background: rgba(200,167,82,0.12);
            border-color: #C8A752;
            transform: scale(1.03);
        }
        .wiz-crop-btn.selected {
            background: rgba(200,167,82,0.18);
            border-color: #C8A752;
            box-shadow: 0 0 20px rgba(200,167,82,0.15);
        }
        .wiz-crop-btn .wiz-crop-icon { font-size: 1.6rem; }
        .wiz-crop-btn .wiz-crop-name {
            color: #fff;
            font-size: 0.85rem;
            font-weight: 500;
        }
        .wiz-crop-btn .wiz-crop-variety {
            color: rgba(255,255,255,0.4);
            font-size: 0.7rem;
        }

        /* Form fields */
        .wiz-field {
            margin-bottom: 1rem;
        }
        .wiz-label {
            display: block;
            color: rgba(255,255,255,0.6);
            font-size: 0.8rem;
            margin-bottom: 0.4rem;
            font-weight: 500;
        }
        .wiz-input {
            width: 100%;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(200,167,82,0.25);
            border-radius: 10px;
            color: #fff;
            padding: 0.75rem 1rem;
            font-size: 1rem;
            font-family: inherit;
            outline: none;
            transition: border-color 0.2s;
            box-sizing: border-box;
        }
        .wiz-input:focus {
            border-color: #C8A752;
            box-shadow: 0 0 12px rgba(200,167,82,0.15);
        }
        .wiz-input-amount {
            font-size: 1.5rem !important;
            text-align: center;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .wiz-switch-row {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            color: #fff;
            font-size: 0.9rem;
            cursor: pointer;
            user-select: none;
        }
        .wiz-switch-row input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: #C8A752;
            cursor: pointer;
            flex-shrink: 0;
        }
        .wiz-switch-help {
            margin: 0.4rem 0 0;
            color: rgba(255,255,255,0.5);
            font-size: 0.75rem;
            line-height: 1.35;
        }

        /* Unit selector buttons */
        .wiz-unit-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.6rem;
            margin-bottom: 1rem;
        }
        .wiz-unit-btn {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(200,167,82,0.2);
            border-radius: 10px;
            padding: 0.6rem;
            min-height: 52px;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.2rem;
        }
        .wiz-unit-btn:hover { border-color: rgba(200,167,82,0.5); }
        .wiz-unit-btn.selected {
            background: rgba(200,167,82,0.15);
            border-color: #C8A752;
        }
        .wiz-unit-btn .wiz-unit-icon { font-size: 1.2rem; }
        .wiz-unit-btn .wiz-unit-label {
            color: #fff;
            font-size: 0.75rem;
        }

        /* Quantity stepper */
        .wiz-stepper {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .wiz-stepper-btn {
            min-width: 42px; height: 42px;
            padding: 0 8px;
            border-radius: 21px;
            background: rgba(200,167,82,0.12);
            border: 1px solid rgba(200,167,82,0.4);
            color: #C8A752;
            font-size: 1.4rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
        }
        .wiz-stepper-btn:active { transform: scale(0.92); }
        .wiz-stepper-value {
            color: #fff;
            font-size: 2rem;
            font-weight: 700;
            min-width: 60px;
            text-align: center;
            font-family: 'Orbitron', monospace;
        }

        /* Summary ticket */
        .wiz-ticket {
            background: rgba(200,167,82,0.06);
            border: 1px solid rgba(200,167,82,0.2);
            border-radius: 14px;
            padding: 1.25rem;
        }
        .wiz-ticket-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .wiz-ticket-row:last-child { border-bottom: none; }
        .wiz-ticket-label {
            color: rgba(255,255,255,0.5);
            font-size: 0.82rem;
        }
        .wiz-ticket-value {
            color: #fff;
            font-size: 0.9rem;
            font-weight: 500;
            text-align: right;
            max-width: 60%;
            word-break: break-word;
        }
        .wiz-ticket-total {
            color: #C8A752;
            font-size: 1.4rem;
            font-weight: 700;
            font-family: 'Orbitron', monospace;
        }

        /* Footer buttons */
        .agro-wizard-footer {
            display: flex;
            gap: 0.75rem;
            padding: 1rem 1.5rem 1.25rem;
            border-top: 1px solid rgba(255,255,255,0.06);
            flex-shrink: 0;
        }
        .wiz-btn {
            flex: 1;
            padding: 0.85rem;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
            min-height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
        }
        .wiz-btn-back {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.15);
            color: rgba(255,255,255,0.6);
        }
        .wiz-btn-back:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
        .wiz-btn-next {
            background: linear-gradient(135deg, #C8A752, #a8893f);
            border: none;
            color: #000;
        }
        .wiz-btn-next:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .wiz-btn-next:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
            filter: none;
        }
        .wiz-btn-submit {
            background: linear-gradient(135deg, #C8A752, #e6c566);
            border: none;
            color: #000;
            font-size: 1rem;
        }
        .wiz-btn-submit:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        /* Success overlay */
        .wiz-success {
            text-align: center;
            padding: 2rem 1rem;
        }
        .wiz-success-icon { font-size: 3rem; margin-bottom: 0.75rem; }
        .wiz-success-text {
            color: #C8A752;
            font-size: 1.1rem;
            font-weight: 600;
        }

        /* Mobile responsive */
        @media (max-width: 600px) {
            .agro-wizard-card {
                max-width: 100%;
                max-height: 100vh;
                height: 100vh;
                border-radius: 0;
                border: none;
            }
            .agro-wizard-body { padding: 1rem; }
            .agro-wizard-header { padding: 1rem 1rem 0.5rem; }
            .agro-wizard-footer {
                padding: 0.75rem 1rem 1rem;
                position: sticky;
                bottom: 0;
                background: #0d0d0d;
            }
            .wiz-input-amount { font-size: 1.5rem !important; }
            .wiz-crops-grid { grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * @param {string} tabName - 'pendientes' | 'ingresos' | 'gastos' | 'perdidas' | 'transferencias'
 * @param {object} deps - { supabase, cropsCache, selectedCropId, refreshFactureroHistory, loadIncomes, getTodayLocalISO, buildConceptWithWho, forcedCropId, lockCropSelection, refreshAlsoTabs }
 */
export async function openAgroWizard(tabName, deps) {
    const meta = WIZARD_TAB_META[tabName];
    if (!meta) return;

    const {
        supabase,
        cropsCache,
        selectedCropId,
        refreshFactureroHistory,
        loadIncomes,
        getTodayLocalISO,
        buildConceptWithWho
    } = deps;
    const hasForcedCropProp = Object.prototype.hasOwnProperty.call(deps || {}, 'forcedCropId');
    // Treat crop as "forced" only when caller explicitly locks crop selection.
    const lockCropSelection = hasForcedCropProp && deps?.lockCropSelection === true;
    const forcedCropId = lockCropSelection ? normalizeWizardCropId(deps.forcedCropId) : null;
    const normalizedSelectedCropId = lockCropSelection ? null : normalizeWizardCropId(selectedCropId);
    const hasSelectedCropInCache = !!(normalizedSelectedCropId && Array.isArray(cropsCache)
        && cropsCache.some((crop) => String(crop.id) === String(normalizedSelectedCropId)));
    const initialCropId = lockCropSelection
        ? forcedCropId
        : (hasSelectedCropInCache ? normalizedSelectedCropId : null);
    const refreshAlsoTabs = Array.isArray(deps?.refreshAlsoTabs)
        ? deps.refreshAlsoTabs.filter(Boolean).map((tab) => String(tab))
        : [];

    injectWizardStyles();

    // Fetch exchange rates (non-blocking)
    let exchangeRates = { USD: 1, COP: null, VES: null };
    initExchangeRates().then(r => { if (r) exchangeRates = r; }).catch(() => { });

    // Wizard state
    const state = {
        step: 1,
        cropId: initialCropId,
        cropName: 'General / Sin cultivo',
        concepto: '',
        who: '',
        fecha: (typeof getTodayLocalISO === 'function' ? getTodayLocalISO() : new Date().toISOString().split('T')[0]),
        unitType: '',
        unitQty: 1,
        quantityKg: '',
        monto: '',
        currency: 'USD',
        exchangeRate: 1,
        montoUsd: 0,
        countAsOperatingExpense: false
    };

    // Pre-fill crop name
    if (state.cropId && Array.isArray(cropsCache)) {
        const match = cropsCache.find(c => String(c.id) === String(state.cropId));
        if (match) state.cropName = match.name || '';
    }

    // Total steps: 4 (crop, details, quantity, summary)
    const totalSteps = 4;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'agro-wizard-overlay';

    function getStepSubtitle(step) {
        const labels = ['', 'Cultivo', 'Detalles', 'Cantidad y Monto', 'Confirmar'];
        return `Paso ${step} de ${totalSteps} — ${labels[step] || ''}`;
    }

    function render() {
        const progress = (state.step / totalSteps) * 100;

        const card = document.createElement('div');
        card.className = 'agro-wizard-card';

        const progressWrap = document.createElement('div');
        progressWrap.className = 'agro-wizard-progress';
        const progressFill = document.createElement('div');
        progressFill.className = 'agro-wizard-progress-fill';
        progressFill.style.width = `${progress}%`;
        progressWrap.appendChild(progressFill);

        const header = document.createElement('div');
        header.className = 'agro-wizard-header';
        const h3 = document.createElement('h3');
        h3.textContent = `${meta.icon} ${meta.title}`;
        const subtitle = document.createElement('p');
        subtitle.className = 'wiz-subtitle';
        subtitle.textContent = getStepSubtitle(state.step);
        header.append(h3, subtitle);

        const body = document.createElement('div');
        body.className = 'agro-wizard-body';
        body.appendChild(renderStep());

        const footer = document.createElement('div');
        footer.className = 'agro-wizard-footer';
        footer.appendChild(renderFooter());

        card.append(progressWrap, header, body, footer);
        overlay.replaceChildren(card);
        attachStepListeners();
    }

    function renderStep() {
        switch (state.step) {
            case 1: return renderStepCrop();
            case 2: return renderStepDetails();
            case 3: return renderStepQuantity();
            case 4: return renderStepSummary();
            default: return document.createDocumentFragment();
        }
    }

    // ============ STEP 1: CROP ============
    function renderStepCrop() {
        const fragment = document.createDocumentFragment();
        const crops = getWizardActiveCrops(cropsCache, state.cropId);

        const question = document.createElement('p');
        question.className = 'wiz-question';
        fragment.appendChild(question);

        const grid = document.createElement('div');
        grid.className = 'wiz-crops-grid';

        if (lockCropSelection) {
            const forcedCrop = forcedCropId
                ? crops.find((crop) => String(crop.id) === String(forcedCropId))
                : null;
            const forcedDisplay = forcedCrop
                ? getCropDisplayParts(forcedCrop, { fallbackIcon: '🌱', fallbackName: 'Cultivo' })
                : null;
            const cropName = forcedDisplay?.name || 'General / Sin cultivo';
            const cropVariety = forcedCrop
                ? (forcedCrop.variety || 'Cultivo fijo para este registro')
                : 'No asociado a cultivo';
            const cropIcon = forcedDisplay?.icon || (forcedCrop ? '🌱' : '📋');

            question.textContent = 'Contexto de cultivo';
            const card = document.createElement('div');
            card.className = 'wiz-crop-btn selected wiz-crop-fixed';

            const iconSpan = document.createElement('span');
            iconSpan.className = 'wiz-crop-icon';
            iconSpan.textContent = cropIcon;
            const nameSpan = document.createElement('span');
            nameSpan.className = 'wiz-crop-name';
            nameSpan.textContent = cropName;
            const varietySpan = document.createElement('span');
            varietySpan.className = 'wiz-crop-variety';
            varietySpan.textContent = cropVariety;

            card.append(iconSpan, nameSpan, varietySpan);
            grid.appendChild(card);
            fragment.appendChild(grid);
            return fragment;
        }

        question.textContent = '¿A qué cultivo va este registro?';

        const generalBtn = document.createElement('button');
        generalBtn.type = 'button';
        generalBtn.className = `wiz-crop-btn${!state.cropId ? ' selected' : ''}`;
        generalBtn.dataset.cropId = '';

        const generalIcon = document.createElement('span');
        generalIcon.className = 'wiz-crop-icon';
        generalIcon.textContent = '📋';
        const generalName = document.createElement('span');
        generalName.className = 'wiz-crop-name';
        generalName.textContent = 'General / Sin cultivo';
        const generalVariety = document.createElement('span');
        generalVariety.className = 'wiz-crop-variety';
        generalVariety.textContent = 'No asociado a cultivo';
        generalBtn.append(generalIcon, generalName, generalVariety);
        grid.appendChild(generalBtn);

        for (const crop of crops) {
            const id = String(crop.id);
            const displayCrop = getCropDisplayParts(crop, { fallbackIcon: '🌱', fallbackName: 'Cultivo' });

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `wiz-crop-btn${state.cropId === id ? ' selected' : ''}`;
            btn.dataset.cropId = id;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'wiz-crop-icon';
            iconSpan.textContent = displayCrop.icon;
            const nameSpan = document.createElement('span');
            nameSpan.className = 'wiz-crop-name';
            nameSpan.textContent = displayCrop.name;
            const varietySpan = document.createElement('span');
            varietySpan.className = 'wiz-crop-variety';
            varietySpan.textContent = crop.variety || '';

            btn.append(iconSpan, nameSpan, varietySpan);
            grid.appendChild(btn);
        }

        fragment.appendChild(grid);
        return fragment;
    }

    // ============ STEP 2: DETAILS ============
    function renderStepDetails() {
        const fragment = document.createDocumentFragment();
        const question = document.createElement('p');
        question.className = 'wiz-question';
        question.textContent = '¿Cuáles son los detalles?';
        fragment.appendChild(question);
        const activeCrops = getWizardActiveCrops(cropsCache, state.cropId);

        if (tabName === 'gastos' && !lockCropSelection) {
            const field = document.createElement('div');
            field.className = 'wiz-field';
            const label = document.createElement('label');
            label.className = 'wiz-label';
            label.textContent = 'Cultivo (gasto asociado)';
            const select = document.createElement('select');
            select.className = 'wiz-input';
            select.id = 'wiz-gasto-crop-id';

            const generalOpt = document.createElement('option');
            generalOpt.value = '';
            generalOpt.textContent = 'General / Sin cultivo';
            if (!state.cropId) generalOpt.selected = true;
            select.appendChild(generalOpt);

            activeCrops.forEach((crop) => {
                const cropId = String(crop.id);
                const displayCrop = getCropDisplayParts(crop, { fallbackIcon: '🌱', fallbackName: 'Cultivo' });
                const option = document.createElement('option');
                option.value = cropId;
                option.selected = String(state.cropId || '') === cropId;
                const variety = crop.variety ? ` (${crop.variety})` : '';
                option.textContent = `${displayCrop.icon} ${displayCrop.name}${variety}`;
                select.appendChild(option);
            });

            field.append(label, select);
            fragment.appendChild(field);
        }

        const conceptField = document.createElement('div');
        conceptField.className = 'wiz-field';
        const conceptLabel = document.createElement('label');
        conceptLabel.className = 'wiz-label';
        conceptLabel.textContent = 'Concepto *';
        const conceptInput = document.createElement('input');
        conceptInput.type = 'text';
        conceptInput.className = 'wiz-input';
        conceptInput.id = 'wiz-concepto';
        conceptInput.placeholder = meta.conceptPlaceholder;
        conceptInput.value = state.concepto || '';
        conceptInput.autocomplete = 'off';
        conceptInput.required = true;
        conceptField.append(conceptLabel, conceptInput);
        fragment.appendChild(conceptField);

        if (meta.hasWho) {
            const whoField = document.createElement('div');
            whoField.className = 'wiz-field';
            const whoLabel = document.createElement('label');
            whoLabel.className = 'wiz-label';
            whoLabel.textContent = meta.whoLabel || 'Responsable';
            const whoInput = document.createElement('input');
            whoInput.type = 'text';
            whoInput.className = 'wiz-input';
            whoInput.id = 'wiz-who';
            whoInput.placeholder = meta.whoPlaceholder || '';
            whoInput.value = state.who || '';
            whoInput.autocomplete = 'off';
            whoField.append(whoLabel, whoInput);
            fragment.appendChild(whoField);
        }

        const dateField = document.createElement('div');
        dateField.className = 'wiz-field';
        const dateLabel = document.createElement('label');
        dateLabel.className = 'wiz-label';
        dateLabel.textContent = 'Fecha';
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'wiz-input';
        dateInput.id = 'wiz-fecha';
        dateInput.value = state.fecha || '';
        if (typeof getTodayLocalISO === 'function') dateInput.max = getTodayLocalISO();
        dateField.append(dateLabel, dateInput);
        fragment.appendChild(dateField);

        if (tabName === 'transferencias') {
            const donationField = document.createElement('div');
            donationField.className = 'wiz-field';
            const donationLabel = document.createElement('label');
            donationLabel.className = 'wiz-label';
            donationLabel.textContent = 'Contabilidad de donación';

            const switchLabel = document.createElement('label');
            switchLabel.className = 'wiz-switch-row';
            switchLabel.htmlFor = 'wiz-transfer-operating-expense';

            const check = document.createElement('input');
            check.type = 'checkbox';
            check.id = 'wiz-transfer-operating-expense';
            check.checked = !!state.countAsOperatingExpense;
            const checkText = document.createElement('span');
            checkText.textContent = 'Contabilizar como gasto operativo';
            switchLabel.append(check, checkText);

            const help = document.createElement('p');
            help.className = 'wiz-switch-help';
            help.textContent = 'Si activas este toggle, además de la donación se registrará un gasto operativo en el cultivo seleccionado.';
            donationField.append(donationLabel, switchLabel, help);
            fragment.appendChild(donationField);
        }

        return fragment;
    }

    // ============ STEP 3: QUANTITY & AMOUNT ============
    function renderStepQuantity() {
        const fragment = document.createDocumentFragment();
        const addQuestion = (text) => {
            const p = document.createElement('p');
            p.className = 'wiz-question';
            p.textContent = text;
            fragment.appendChild(p);
        };

        if (meta.hasUnits) {
            addQuestion('¿Presentación?');

            const unitGrid = document.createElement('div');
            unitGrid.className = 'wiz-unit-grid';
            UNIT_OPTIONS.forEach((u) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `wiz-unit-btn${state.unitType === u.value ? ' selected' : ''}`;
                btn.dataset.unit = u.value;

                const icon = document.createElement('span');
                icon.className = 'wiz-unit-icon';
                icon.textContent = u.icon;
                const label = document.createElement('span');
                label.className = 'wiz-unit-label';
                label.textContent = u.label;
                btn.append(icon, label);
                unitGrid.appendChild(btn);
            });
            fragment.appendChild(unitGrid);

            const stepper = document.createElement('div');
            stepper.className = 'wiz-stepper';
            const mkStepBtn = (action, text) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'wiz-stepper-btn';
                btn.dataset.action = action;
                btn.textContent = text;
                return btn;
            };
            const qtyDisplay = document.createElement('span');
            qtyDisplay.className = 'wiz-stepper-value';
            qtyDisplay.id = 'wiz-qty-display';
            qtyDisplay.textContent = String(state.unitQty);
            stepper.append(
                mkStepBtn('dec1', '−1'),
                mkStepBtn('dec05', '−.5'),
                qtyDisplay,
                mkStepBtn('inc05', '+.5'),
                mkStepBtn('inc1', '+1')
            );
            fragment.appendChild(stepper);

            const kgField = document.createElement('div');
            kgField.className = 'wiz-field';
            const kgLabel = document.createElement('label');
            kgLabel.className = 'wiz-label';
            kgLabel.textContent = 'Kilogramos (opcional)';
            const kgInput = document.createElement('input');
            kgInput.type = 'number';
            kgInput.className = 'wiz-input';
            kgInput.id = 'wiz-kg';
            kgInput.placeholder = 'Ej: 50';
            kgInput.value = state.quantityKg || '';
            kgInput.min = '0';
            kgInput.step = '0.01';
            kgInput.inputMode = 'decimal';
            kgField.append(kgLabel, kgInput);
            fragment.appendChild(kgField);
        }

        const currSymbol = SUPPORTED_CURRENCIES[state.currency]?.symbol || '$';
        addQuestion('💱 Moneda');

        const currencyGrid = document.createElement('div');
        currencyGrid.className = 'wiz-unit-grid';
        currencyGrid.style.cssText = 'grid-template-columns: repeat(3, 1fr); margin-bottom: 1rem;';
        Object.entries(SUPPORTED_CURRENCIES).forEach(([code, cfg]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `wiz-unit-btn wiz-currency-btn${state.currency === code ? ' selected' : ''}`;
            btn.dataset.currency = code;
            btn.style.minHeight = '48px';

            const icon = document.createElement('span');
            icon.className = 'wiz-unit-icon';
            icon.textContent = cfg.flag;
            const label = document.createElement('span');
            label.className = 'wiz-unit-label';
            label.textContent = code === 'VES' ? 'Bs' : code;
            btn.append(icon, label);
            currencyGrid.appendChild(btn);
        });
        fragment.appendChild(currencyGrid);

        addQuestion('💵 ¿Monto?');

        const amountField = document.createElement('div');
        amountField.className = 'wiz-field';
        amountField.style.textAlign = 'center';
        const symbol = document.createElement('div');
        symbol.style.cssText = 'color: rgba(255,255,255,0.4); font-size: 0.85rem; margin-bottom: 0.3rem;';
        symbol.textContent = currSymbol;
        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.className = 'wiz-input wiz-input-amount';
        amountInput.id = 'wiz-monto';
        amountInput.placeholder = '0.00';
        amountInput.value = state.monto || '';
        amountInput.min = '0.01';
        amountInput.step = '0.01';
        amountInput.inputMode = 'decimal';
        amountInput.required = true;
        amountField.append(symbol, amountInput);
        fragment.appendChild(amountField);

        if (state.currency !== 'USD') {
            const effectiveRate = state.exchangeRate || getRate(state.currency, exchangeRates) || 0;
            const monto = Number(state.monto) || 0;
            const usdEquiv = effectiveRate > 0 ? (monto / effectiveRate).toFixed(2) : '—';
            const overrideActive = hasOverride(state.currency);

            const preview = document.createElement('div');
            preview.id = 'wiz-conversion-preview';
            preview.style.cssText = 'text-align:center;margin-top:0.5rem;';
            const previewTop = document.createElement('div');
            previewTop.style.cssText = 'color:#C8A752;font-size:0.9rem;';
            previewTop.textContent = `≈ $${usdEquiv} USD`;
            const previewBottom = document.createElement('div');
            previewBottom.style.cssText = 'color:rgba(255,255,255,0.4);font-size:0.75rem;';
            previewBottom.textContent = `tasa: 1 USD = ${effectiveRate ? Number(effectiveRate).toLocaleString() : '—'} ${state.currency}`;
            preview.append(previewTop, previewBottom);
            fragment.appendChild(preview);

            const rateField = document.createElement('div');
            rateField.className = 'wiz-field';
            rateField.style.marginTop = '0.5rem';
            const rateLabel = document.createElement('label');
            rateLabel.className = 'wiz-label';
            rateLabel.textContent = `Tasa ${state.currency}/USD ${overrideActive ? '(manual)' : '(mercado)'}`;
            const rateInput = document.createElement('input');
            rateInput.type = 'number';
            rateInput.className = 'wiz-input';
            rateInput.id = 'wiz-exchange-rate';
            rateInput.placeholder = 'Ej: 4100';
            rateInput.value = effectiveRate || '';
            rateInput.min = '0.0001';
            rateInput.step = 'any';
            rateInput.inputMode = 'decimal';
            rateField.append(rateLabel, rateInput);

            if (overrideActive) {
                const clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.id = 'wiz-clear-override';
                clearBtn.style.cssText = 'background:transparent;border:none;color:#C8A752;font-size:0.75rem;cursor:pointer;margin-top:4px;';
                clearBtn.textContent = '↻ Usar tasa del mercado';
                rateField.appendChild(clearBtn);
            }

            fragment.appendChild(rateField);
        }

        return fragment;
    }

    // ============ STEP 4: SUMMARY ============
    function renderStepSummary() {
        const fragment = document.createDocumentFragment();
        const unitLabel = UNIT_OPTIONS.find(u => u.value === state.unitType);
        const qtyText = unitLabel ? `${state.unitQty} ${state.unitQty === 1 ? unitLabel.singular : unitLabel.plural}` : '';
        const kgText = state.quantityKg ? `${state.quantityKg} kg` : '';
        const cantidadParts = [qtyText, kgText].filter(Boolean);
        const cantidadDisplay = cantidadParts.length > 0 ? cantidadParts.join(' · ') : '-';

        const question = document.createElement('p');
        question.className = 'wiz-question';
        question.textContent = '¿Todo correcto?';
        fragment.appendChild(question);

        const ticket = document.createElement('div');
        ticket.className = 'wiz-ticket';
        const addRow = (labelText, valueText, valueClass = 'wiz-ticket-value') => {
            const row = document.createElement('div');
            row.className = 'wiz-ticket-row';
            const label = document.createElement('span');
            label.className = 'wiz-ticket-label';
            label.textContent = labelText;
            const value = document.createElement('span');
            value.className = valueClass;
            value.textContent = valueText;
            row.append(label, value);
            ticket.appendChild(row);
        };

        addRow('🌱 Cultivo', state.cropName || 'General');
        addRow('📝 Concepto', state.concepto || '');
        if (meta.hasWho && state.who) addRow(meta.whoLabel || 'Responsable', state.who);
        if (meta.hasUnits && cantidadDisplay !== '-') addRow('📦 Cantidad', cantidadDisplay);
        if (tabName === 'transferencias') addRow('🧾 Gasto operativo', state.countAsOperatingExpense ? 'Sí' : 'No');
        addRow('📅 Fecha', state.fecha || '');
        addRow('💰 Monto', formatWizardMonto(), 'wiz-ticket-value wiz-ticket-total');

        fragment.appendChild(ticket);
        return fragment;
    }

    // ============ FOOTER ============
    function renderFooter() {
        const fragment = document.createDocumentFragment();
        const mkBtn = (classes, action, text, disabled = false) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = classes;
            btn.dataset.action = action;
            btn.textContent = text;
            btn.disabled = !!disabled;
            return btn;
        };

        if (state.step === 1) {
            fragment.append(
                mkBtn('wiz-btn wiz-btn-back', 'close', 'Cancelar'),
                mkBtn('wiz-btn wiz-btn-next', 'next', 'Siguiente →')
            );
            return fragment;
        }
        if (state.step === totalSteps) {
            const canSubmit = state.concepto && Number(state.monto) > 0 && state.fecha;
            fragment.append(
                mkBtn('wiz-btn wiz-btn-back', 'prev', '← Atrás'),
                mkBtn('wiz-btn wiz-btn-submit', 'submit', '✅ REGISTRAR', !canSubmit)
            );
            return fragment;
        }
        const canNext = state.step === 2 ? !!state.concepto : (Number(state.monto) > 0);
        fragment.append(
            mkBtn('wiz-btn wiz-btn-back', 'prev', '← Atrás'),
            mkBtn('wiz-btn wiz-btn-next', 'next', 'Siguiente →', !canNext)
        );
        return fragment;
    }

    // ============ EVENT LISTENERS ============
    function attachStepListeners() {
        // Crop selection (step 1)
        overlay.querySelectorAll('.wiz-crop-btn[data-crop-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.cropId || null;
                if (lockCropSelection) return;
                state.cropId = id || null;
                const crops = Array.isArray(cropsCache) ? cropsCache : [];
                const match = id ? crops.find(c => String(c.id) === id) : null;
                state.cropName = match ? (match.name || 'Cultivo') : 'General / Sin cultivo';
                // Auto-advance
                state.step = 2;
                render();
            });
        });

        // Crop select (gastos)
        const gastoCropEl = overlay.querySelector('#wiz-gasto-crop-id');
        if (gastoCropEl) {
            gastoCropEl.addEventListener('change', () => {
                const cropId = normalizeWizardCropId(gastoCropEl.value);
                state.cropId = cropId;
                const rows = Array.isArray(cropsCache) ? cropsCache : [];
                const match = cropId ? rows.find((crop) => String(crop.id) === String(cropId)) : null;
                state.cropName = match ? (match.name || 'Cultivo') : 'General / Sin cultivo';
            });
        }

        // Unit buttons (step 3)
        overlay.querySelectorAll('.wiz-unit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!btn.dataset.unit) return;
                state.unitType = btn.dataset.unit;
                render();
            });
        });

        // Stepper +/- (step 3) — 4 buttons with decimal support
        overlay.querySelectorAll('.wiz-stepper-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const a = btn.dataset.action;
                let delta = 0;
                if (a === 'inc1') delta = 1;
                else if (a === 'inc05') delta = 0.5;
                else if (a === 'dec05') delta = -0.5;
                else if (a === 'dec1') delta = -1;
                state.unitQty = Math.max(0.1, Math.min(999, +(state.unitQty + delta).toFixed(1)));
                const display = overlay.querySelector('#wiz-qty-display');
                if (display) display.textContent = state.unitQty;
            });
        });

        // Currency buttons (step 3)
        overlay.querySelectorAll('.wiz-currency-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.currency;
                if (code && SUPPORTED_CURRENCIES[code]) {
                    state.currency = code;
                    if (code === 'USD') {
                        state.exchangeRate = 1;
                    } else {
                        state.exchangeRate = getRate(code, exchangeRates) || state.exchangeRate || 0;
                    }
                    recalcMontoUsd();
                    render();
                }
            });
        });

        // Exchange rate input (step 3)
        const rateEl = overlay.querySelector('#wiz-exchange-rate');
        if (rateEl) {
            rateEl.addEventListener('input', () => {
                state.exchangeRate = Number(rateEl.value) || 0;
                recalcMontoUsd();
                updateConversionPreview();
                updateFooterState();
            });
        }

        // Clear override button
        const clearBtn = overlay.querySelector('#wiz-clear-override');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                clearOverride(state.currency);
                state.exchangeRate = getRate(state.currency, exchangeRates) || 0;
                recalcMontoUsd();
                render();
            });
        }

        // Input sync
        const conceptoEl = overlay.querySelector('#wiz-concepto');
        if (conceptoEl) {
            conceptoEl.addEventListener('input', () => {
                state.concepto = conceptoEl.value.trim();
                updateFooterState();
            });
            setTimeout(() => { conceptoEl.focus(); scrollIntoViewSafe(conceptoEl); }, 100);
        }

        const whoEl = overlay.querySelector('#wiz-who');
        if (whoEl) {
            whoEl.addEventListener('input', () => {
                state.who = whoEl.value.trim();
                // who is optional, but good to know
            });
        }

        const fechaEl = overlay.querySelector('#wiz-fecha');
        if (fechaEl) {
            fechaEl.addEventListener('change', () => {
                state.fecha = fechaEl.value;
                updateFooterState();
            });
        }

        const donationExpenseToggle = overlay.querySelector('#wiz-transfer-operating-expense');
        if (donationExpenseToggle) {
            donationExpenseToggle.addEventListener('change', () => {
                state.countAsOperatingExpense = donationExpenseToggle.checked;
            });
        }

        const kgEl = overlay.querySelector('#wiz-kg');
        if (kgEl) {
            kgEl.addEventListener('input', () => { state.quantityKg = kgEl.value; });
        }

        const montoEl = overlay.querySelector('#wiz-monto');
        if (montoEl) {
            montoEl.addEventListener('input', () => {
                state.monto = montoEl.value;
                recalcMontoUsd();
                updateConversionPreview();
                updateFooterState();
            });
            if (state.step === 3) {
                setTimeout(() => { montoEl.focus(); scrollIntoViewSafe(montoEl); }, 100);
            }
        }

        // Footer actions
        overlay.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.action;
                if (action === 'close') {
                    close();
                } else if (action === 'prev') {
                    saveCurrentInputs();
                    state.step = Math.max(1, state.step - 1);
                    render();
                } else if (action === 'next') {
                    saveCurrentInputs();
                    state.step = Math.min(totalSteps, state.step + 1);
                    render();
                } else if (action === 'submit') {
                    await handleSubmit(btn);
                }
            });
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        // ESC to close
        overlay._escHandler = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', overlay._escHandler);
    }

    function saveCurrentInputs() {
        const conceptoEl = overlay.querySelector('#wiz-concepto');
        if (conceptoEl) state.concepto = conceptoEl.value.trim();
        const whoEl = overlay.querySelector('#wiz-who');
        if (whoEl) state.who = whoEl.value.trim();
        const gastoCropEl = overlay.querySelector('#wiz-gasto-crop-id');
        if (gastoCropEl) {
            state.cropId = normalizeWizardCropId(gastoCropEl.value);
            const rows = Array.isArray(cropsCache) ? cropsCache : [];
            const match = state.cropId ? rows.find((crop) => String(crop.id) === String(state.cropId)) : null;
            state.cropName = match ? (match.name || 'Cultivo') : 'General / Sin cultivo';
        }
        const fechaEl = overlay.querySelector('#wiz-fecha');
        if (fechaEl) state.fecha = fechaEl.value;
        const kgEl = overlay.querySelector('#wiz-kg');
        if (kgEl) state.quantityKg = kgEl.value;
        const montoEl = overlay.querySelector('#wiz-monto');
        if (montoEl) state.monto = montoEl.value;
        const rateEl = overlay.querySelector('#wiz-exchange-rate');
        if (rateEl) state.exchangeRate = Number(rateEl.value) || 0;
        const donationExpenseToggle = overlay.querySelector('#wiz-transfer-operating-expense');
        if (donationExpenseToggle) state.countAsOperatingExpense = donationExpenseToggle.checked;
    }

    function recalcMontoUsd() {
        const monto = Number(state.monto) || 0;
        if (state.currency === 'USD') {
            state.montoUsd = monto;
        } else {
            state.montoUsd = convertToUSD(monto, state.currency, state.exchangeRate);
        }
    }

    function updateConversionPreview() {
        const preview = overlay.querySelector('#wiz-conversion-preview');
        if (!preview || state.currency === 'USD') return;
        const monto = Number(state.monto) || 0;
        const rate = state.exchangeRate || 0;
        const usd = rate > 0 ? (monto / rate).toFixed(2) : '—';
        preview.replaceChildren();
        const main = document.createElement('div');
        main.style.cssText = 'color:#C8A752;font-size:0.9rem;';
        main.textContent = `≈ $${usd} USD`;
        const sub = document.createElement('div');
        sub.style.cssText = 'color:rgba(255,255,255,0.4);font-size:0.75rem;';
        sub.textContent = `tasa: 1 USD = ${rate ? Number(rate).toLocaleString() : '—'} ${state.currency}`;
        preview.append(main, sub);
    }

    function formatWizardMonto() {
        const monto = Number(state.monto || 0);
        if (state.currency === 'USD') return `$${monto.toFixed(2)}`;
        const cfg = SUPPORTED_CURRENCIES[state.currency] || SUPPORTED_CURRENCIES.USD;
        const localStr = cfg.decimals === 0
            ? `${cfg.symbol} ${Math.round(monto).toLocaleString()}`
            : `${cfg.symbol} ${monto.toFixed(cfg.decimals)}`;
        const usdStr = `$${Number(state.montoUsd || 0).toFixed(2)}`;
        return `${localStr} (≈ ${usdStr} USD · tasa: ${Number(state.exchangeRate || 0).toLocaleString()})`;
    }

    function updateFooterState() {
        const nextBtn = overlay.querySelector('[data-action="next"]');
        const submitBtn = overlay.querySelector('[data-action="submit"]');

        if (state.step === 2 && nextBtn) {
            // Step 2 needs Concepto
            nextBtn.disabled = !state.concepto;
        } else if (state.step === 3 && nextBtn) {
            // Step 3 needs Amount > 0
            nextBtn.disabled = !(Number(state.monto) > 0);
        } else if (state.step === 4 && submitBtn) {
            // Final step needs everything
            const canSubmit = state.concepto && Number(state.monto) > 0 && state.fecha;
            submitBtn.disabled = !canSubmit;
        }
    }

    function scrollIntoViewSafe(el) {
        if (el && typeof el.scrollIntoView === 'function') {
            setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
        }
    }

    // ============ SUBMIT ============
    async function handleSubmit(btn) {
        // Anti double-click
        btn.disabled = true;
        btn.replaceChildren();
        const spinner = document.createElement('i');
        spinner.className = 'fa fa-spinner fa-spin';
        btn.append(spinner, document.createTextNode(' Guardando...'));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sesión expirada.');

            // Build concepto with who (for tabs that embed who in concepto)
            let finalConcepto = state.concepto;
            if (meta.hasWho && state.who && typeof buildConceptWithWho === 'function') {
                finalConcepto = buildConceptWithWho(tabName, state.concepto, state.who);
            }

            // Recalc monto_usd before submit
            recalcMontoUsd();
            const montoNum = parseFloat(state.monto) || 0;

            const insertData = {
                user_id: user.id,
                crop_id: lockCropSelection ? forcedCropId : (state.cropId || null),
                [tabName === 'gastos' ? 'date' : 'fecha']: state.fecha,
                [tabName === 'gastos' ? 'concept' : 'concepto']: finalConcepto,
                [tabName === 'gastos' ? 'amount' : 'monto']: montoNum,
                currency: state.currency || 'USD',
                exchange_rate: state.exchangeRate || 1,
                monto_usd: state.currency === 'USD' ? montoNum : (state.montoUsd || montoNum)
            };

            // Tab-specific WHO field (DB column)
            if (tabName === 'pendientes' && state.who) insertData.cliente = state.who;
            if (tabName === 'perdidas' && state.who) insertData.causa = state.who;
            if (tabName === 'transferencias' && state.who) insertData.destino = state.who;
            // ingresos: who is embedded in concepto via buildConceptWithWho
            // Defensive defaults for NOT NULL constraints per tab.
            if (tabName === 'ingresos') {
                insertData.categoria = insertData.categoria || (insertData.crop_id ? 'ventas' : 'general');
            }
            if (tabName === 'gastos') {
                insertData.category = insertData.category || (insertData.crop_id ? 'insumos' : 'general');
            }
            if (tabName === 'pendientes') {
                insertData.cliente = insertData.cliente || 'Cliente general';
            }
            if (tabName === 'perdidas') {
                insertData.causa = insertData.causa || 'Sin causa especificada';
            }
            if (tabName === 'transferencias') {
                insertData.destino = insertData.destino || 'Beneficiario general';
            }

            // Units (if applicable)
            if (meta.hasUnits && state.unitType) {
                insertData.unit_type = state.unitType;
                insertData.unit_qty = state.unitQty || null;
            }
            if (meta.hasUnits && state.quantityKg) {
                insertData.quantity_kg = parseFloat(state.quantityKg) || null;
            }

            // Gastos uses different field names
            if (tabName === 'gastos') {
                insertData.date = state.fecha;
                insertData.concept = state.concepto;
                insertData.amount = parseFloat(state.monto) || 0;
                // Remove duplicated keys
                delete insertData.fecha;
                delete insertData.concepto;
                delete insertData.monto;
            }

            let successMessage = meta.successMsg;
            let createdOperatingExpense = false;

            if (tabName === 'transferencias' && state.countAsOperatingExpense) {
                const transferInsert = await supabase
                    .from('agro_transfers')
                    .insert(insertData)
                    .select('id')
                    .single();
                if (transferInsert.error) throw transferInsert.error;

                const transferId = transferInsert.data?.id;
                const conceptBase = String(state.concepto || 'Donación').trim();
                const linkedCropId = state.cropId || insertData.crop_id || null;
                const transferUnitType = state.unitType || insertData.unit_type || null;
                const transferUnitQtyRaw = state.unitQty ?? insertData.unit_qty;
                const transferUnitQtyParsed = Number.parseFloat(transferUnitQtyRaw);
                const transferUnitQty = transferUnitType && Number.isFinite(transferUnitQtyParsed) && transferUnitQtyParsed > 0
                    ? transferUnitQtyParsed
                    : null;
                const transferUnitOption = UNIT_OPTIONS.find((opt) => opt.value === transferUnitType);
                const transferUnitLabel = transferUnitOption
                    ? (transferUnitQty === 1 ? transferUnitOption.singular : transferUnitOption.plural)
                    : transferUnitType;
                const unitLabel = transferUnitQty && transferUnitLabel
                    ? ` · ${transferUnitQty} ${transferUnitLabel}`
                    : '';
                const operatingConcept = state.who
                    ? `Donación operativa a ${state.who}: ${conceptBase}${unitLabel}`
                    : `Donación operativa: ${conceptBase}${unitLabel}`;
                const expenseData = {
                    user_id: user.id,
                    crop_id: linkedCropId,
                    date: state.fecha,
                    concept: operatingConcept,
                    amount: montoNum,
                    category: linkedCropId ? 'operativo' : 'general',
                    currency: insertData.currency || 'USD',
                    exchange_rate: insertData.exchange_rate || 1,
                    monto_usd: insertData.monto_usd ?? montoNum
                };

                const expenseInsert = await supabase
                    .from('agro_expenses')
                    .insert(expenseData)
                    .select('id')
                    .single();

                if (expenseInsert.error) {
                    if (transferId) {
                        const rollback = await supabase
                            .from('agro_transfers')
                            .delete()
                            .eq('id', transferId)
                            .eq('user_id', user.id);
                        if (rollback.error) {
                            throw new Error(`Error creando gasto operativo y no se pudo revertir la donación: ${expenseInsert.error.message}`);
                        }
                    }
                    throw expenseInsert.error;
                }

                createdOperatingExpense = true;
                successMessage = '✅ Donación y gasto operativo registrados';
            } else {
                const { error } = await supabase.from(meta.table).insert(insertData);
                if (error) throw error;
            }

            // Show success
            const body = overlay.querySelector('.agro-wizard-body');
            const footer = overlay.querySelector('.agro-wizard-footer');
            if (body) {
                body.replaceChildren();
                const success = document.createElement('div');
                success.className = 'wiz-success';
                const successIcon = document.createElement('div');
                successIcon.className = 'wiz-success-icon';
                successIcon.textContent = '✅';
                const successText = document.createElement('div');
                successText.className = 'wiz-success-text';
                successText.textContent = successMessage;
                success.append(successIcon, successText);
                body.appendChild(success);
            }
            if (footer) footer.style.display = 'none';

            // Auto-close after 1.5s and refresh
            setTimeout(() => {
                close();
                // Refresh history
                if (tabName === 'ingresos' && typeof loadIncomes === 'function') {
                    loadIncomes();
                }
                if (typeof refreshFactureroHistory === 'function') {
                    const tabsToRefresh = new Set([tabName, ...refreshAlsoTabs]);
                    if (createdOperatingExpense) {
                        tabsToRefresh.add('gastos');
                    }
                    tabsToRefresh.forEach((tab) => {
                        refreshFactureroHistory(tab);
                    });
                }
                const impactsCropCards = tabName === 'gastos'
                    || tabName === 'ingresos'
                    || tabName === 'pendientes'
                    || tabName === 'perdidas'
                    || createdOperatingExpense;
                if (impactsCropCards) {
                    document.dispatchEvent(new CustomEvent('agro:crops:refresh', {
                        detail: {
                            source: 'wizard',
                            tab: tabName,
                            operatingExpense: createdOperatingExpense
                        }
                    }));
                }
            }, 1500);

        } catch (err) {
            console.error('[AgroWizard] Submit error:', err);
            // Re-enable button — user doesn't lose data
            btn.disabled = false;
            btn.textContent = '✅ REGISTRAR';
            const body = overlay.querySelector('.agro-wizard-body');
            if (body) {
                const errDiv = body.querySelector('.wiz-error');
                if (errDiv) errDiv.remove();
                const errorBox = document.createElement('div');
                errorBox.className = 'wiz-error';
                errorBox.style.cssText = 'background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; padding: 0.75rem; margin-top: 1rem; color: #ef4444; font-size: 0.85rem; text-align: center;';
                errorBox.textContent = `⚠️ ${err.message || 'Error al guardar'}`;
                body.appendChild(errorBox);
            }
        }
    }

    function close() {
        if (overlay._escHandler) {
            document.removeEventListener('keydown', overlay._escHandler);
        }
        if (overlay.parentNode) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s';
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 200);
        }
    }

    // Mount
    document.body.appendChild(overlay);
    render();
}
