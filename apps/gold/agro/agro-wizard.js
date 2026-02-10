/**
 * AgroWizard — Registro guiado por carrusel
 * Archivo separado para mantener agro.js limpio.
 * Exporta openAgroWizard(tabName, deps) como función principal.
 */

// ============================================================
// TAB METADATA
// ============================================================
const WIZARD_TAB_META = {
    pendientes: {
        title: 'Registrar Pendiente',
        icon: '⏳',
        conceptPlaceholder: 'Ej: Venta a crédito',
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
        title: 'Registrar Transferencia',
        icon: '🔄',
        conceptPlaceholder: 'Ej: Envío a mercado',
        whoLabel: 'Destino',
        whoPlaceholder: 'Ej: Mercado central...',
        hasWho: true,
        hasUnits: true,
        table: 'agro_transfers',
        successMsg: '✅ Transferencia registrada'
    }
};

const UNIT_OPTIONS = [
    { value: 'saco', label: 'Saco', icon: '🥡', singular: 'saco', plural: 'sacos' },
    { value: 'medio_saco', label: 'Medio saco', icon: '🎒', singular: 'medio saco', plural: 'medios sacos' },
    { value: 'cesta', label: 'Cesta', icon: '🧺', singular: 'cesta', plural: 'cestas' }
];

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
            width: 48px; height: 48px;
            border-radius: 50%;
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
 * @param {object} deps - { supabase, cropsCache, selectedCropId, refreshFactureroHistory, loadIncomes, getTodayLocalISO, buildConceptWithWho }
 */
export async function openAgroWizard(tabName, deps) {
    const meta = WIZARD_TAB_META[tabName];
    if (!meta) return;

    const { supabase, cropsCache, selectedCropId, refreshFactureroHistory, loadIncomes, getTodayLocalISO, buildConceptWithWho } = deps;

    injectWizardStyles();

    // Wizard state
    const state = {
        step: 1,
        cropId: selectedCropId || null,
        cropName: '',
        concepto: '',
        who: '',
        fecha: (typeof getTodayLocalISO === 'function' ? getTodayLocalISO() : new Date().toISOString().split('T')[0]),
        unitType: '',
        unitQty: 1,
        quantityKg: '',
        monto: ''
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

        overlay.innerHTML = `
            <div class="agro-wizard-card">
                <div class="agro-wizard-progress">
                    <div class="agro-wizard-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="agro-wizard-header">
                    <h3>${meta.icon} ${meta.title}</h3>
                    <p class="wiz-subtitle">${getStepSubtitle(state.step)}</p>
                </div>
                <div class="agro-wizard-body">
                    ${renderStep()}
                </div>
                <div class="agro-wizard-footer">
                    ${renderFooter()}
                </div>
            </div>
        `;
        attachStepListeners();
    }

    function renderStep() {
        switch (state.step) {
            case 1: return renderStepCrop();
            case 2: return renderStepDetails();
            case 3: return renderStepQuantity();
            case 4: return renderStepSummary();
            default: return '';
        }
    }

    // ============ STEP 1: CROP ============
    function renderStepCrop() {
        const crops = Array.isArray(cropsCache) ? cropsCache : [];
        let cardsHtml = `
            <button type="button" class="wiz-crop-btn ${!state.cropId ? 'selected' : ''}" data-crop-id="">
                <span class="wiz-crop-icon">🏢</span>
                <span class="wiz-crop-name">General</span>
                <span class="wiz-crop-variety">Sin asociar</span>
            </button>
        `;
        for (const crop of crops) {
            const id = String(crop.id);
            const sel = state.cropId === id ? 'selected' : '';
            cardsHtml += `
                <button type="button" class="wiz-crop-btn ${sel}" data-crop-id="${id}">
                    <span class="wiz-crop-icon">${crop.icon || '🌱'}</span>
                    <span class="wiz-crop-name">${escapeHtml(crop.name || 'Cultivo')}</span>
                    <span class="wiz-crop-variety">${escapeHtml(crop.variety || '')}</span>
                </button>
            `;
        }
        return `
            <p class="wiz-question">¿A qué cultivo va este registro?</p>
            <div class="wiz-crops-grid">${cardsHtml}</div>
        `;
    }

    // ============ STEP 2: DETAILS ============
    function renderStepDetails() {
        const whoHtml = meta.hasWho ? `
            <div class="wiz-field">
                <label class="wiz-label">${meta.whoLabel}</label>
                <input type="text" class="wiz-input" id="wiz-who" placeholder="${meta.whoPlaceholder}" value="${escapeHtml(state.who)}" autocomplete="off">
            </div>
        ` : '';

        return `
            <p class="wiz-question">¿Cuáles son los detalles?</p>
            <div class="wiz-field">
                <label class="wiz-label">Concepto *</label>
                <input type="text" class="wiz-input" id="wiz-concepto" placeholder="${meta.conceptPlaceholder}" value="${escapeHtml(state.concepto)}" autocomplete="off" required>
            </div>
            ${whoHtml}
            <div class="wiz-field">
                <label class="wiz-label">Fecha</label>
                <input type="date" class="wiz-input" id="wiz-fecha" value="${state.fecha}" max="${typeof getTodayLocalISO === 'function' ? getTodayLocalISO() : ''}">
            </div>
        `;
    }

    // ============ STEP 3: QUANTITY & AMOUNT ============
    function renderStepQuantity() {
        const unitsHtml = meta.hasUnits ? `
            <p class="wiz-question">¿Presentación?</p>
            <div class="wiz-unit-grid">
                ${UNIT_OPTIONS.map(u => `
                    <button type="button" class="wiz-unit-btn ${state.unitType === u.value ? 'selected' : ''}" data-unit="${u.value}">
                        <span class="wiz-unit-icon">${u.icon}</span>
                        <span class="wiz-unit-label">${u.label}</span>
                    </button>
                `).join('')}
            </div>
            <div class="wiz-stepper">
                <button type="button" class="wiz-stepper-btn" data-action="dec">−</button>
                <span class="wiz-stepper-value" id="wiz-qty-display">${state.unitQty}</span>
                <button type="button" class="wiz-stepper-btn" data-action="inc">+</button>
            </div>
            <div class="wiz-field">
                <label class="wiz-label">Kilogramos (opcional)</label>
                <input type="number" class="wiz-input" id="wiz-kg" placeholder="Ej: 50" value="${state.quantityKg}" min="0" step="0.01" inputmode="decimal">
            </div>
        ` : '';

        return `
            ${unitsHtml}
            <p class="wiz-question">💵 ¿Monto?</p>
            <div class="wiz-field" style="text-align: center;">
                <div style="color: rgba(255,255,255,0.4); font-size: 0.85rem; margin-bottom: 0.3rem;">$</div>
                <input type="number" class="wiz-input wiz-input-amount" id="wiz-monto" placeholder="0.00" value="${state.monto}" min="0.01" step="0.01" inputmode="decimal" required>
            </div>
        `;
    }

    // ============ STEP 4: SUMMARY ============
    function renderStepSummary() {
        const unitLabel = UNIT_OPTIONS.find(u => u.value === state.unitType);
        const qtyText = unitLabel ? `${state.unitQty} ${state.unitQty === 1 ? unitLabel.singular : unitLabel.plural}` : '';
        const kgText = state.quantityKg ? `${state.quantityKg} kg` : '';
        const cantidadParts = [qtyText, kgText].filter(Boolean);
        const cantidadDisplay = cantidadParts.length > 0 ? cantidadParts.join(' · ') : '-';

        let rows = `
            <div class="wiz-ticket-row">
                <span class="wiz-ticket-label">🌱 Cultivo</span>
                <span class="wiz-ticket-value">${escapeHtml(state.cropName || 'General')}</span>
            </div>
            <div class="wiz-ticket-row">
                <span class="wiz-ticket-label">📝 Concepto</span>
                <span class="wiz-ticket-value">${escapeHtml(state.concepto)}</span>
            </div>
        `;
        if (meta.hasWho && state.who) {
            rows += `
                <div class="wiz-ticket-row">
                    <span class="wiz-ticket-label">${meta.whoLabel}</span>
                    <span class="wiz-ticket-value">${escapeHtml(state.who)}</span>
                </div>
            `;
        }
        if (meta.hasUnits && cantidadDisplay !== '-') {
            rows += `
                <div class="wiz-ticket-row">
                    <span class="wiz-ticket-label">📦 Cantidad</span>
                    <span class="wiz-ticket-value">${escapeHtml(cantidadDisplay)}</span>
                </div>
            `;
        }
        rows += `
            <div class="wiz-ticket-row">
                <span class="wiz-ticket-label">📅 Fecha</span>
                <span class="wiz-ticket-value">${state.fecha}</span>
            </div>
            <div class="wiz-ticket-row">
                <span class="wiz-ticket-label">💰 Monto</span>
                <span class="wiz-ticket-value wiz-ticket-total">$${Number(state.monto || 0).toFixed(2)}</span>
            </div>
        `;

        return `
            <p class="wiz-question">¿Todo correcto?</p>
            <div class="wiz-ticket">${rows}</div>
        `;
    }

    // ============ FOOTER ============
    function renderFooter() {
        if (state.step === 1) {
            return `
                <button type="button" class="wiz-btn wiz-btn-back" data-action="close">Cancelar</button>
                <button type="button" class="wiz-btn wiz-btn-next" data-action="next" ${state.cropId !== null ? '' : ''}>Siguiente →</button>
            `;
        }
        if (state.step === totalSteps) {
            const canSubmit = state.concepto && Number(state.monto) > 0 && state.fecha;
            return `
                <button type="button" class="wiz-btn wiz-btn-back" data-action="prev">← Atrás</button>
                <button type="button" class="wiz-btn wiz-btn-submit" data-action="submit" ${canSubmit ? '' : 'disabled'}>✅ REGISTRAR</button>
            `;
        }
        const canNext = state.step === 2 ? !!state.concepto : (Number(state.monto) > 0);
        return `
            <button type="button" class="wiz-btn wiz-btn-back" data-action="prev">← Atrás</button>
            <button type="button" class="wiz-btn wiz-btn-next" data-action="next" ${canNext ? '' : 'disabled'}>Siguiente →</button>
        `;
    }

    // ============ EVENT LISTENERS ============
    function attachStepListeners() {
        // Crop selection (step 1)
        overlay.querySelectorAll('.wiz-crop-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.cropId || null;
                state.cropId = id || null;
                const crops = Array.isArray(cropsCache) ? cropsCache : [];
                const match = id ? crops.find(c => String(c.id) === id) : null;
                state.cropName = match ? (match.name || 'Cultivo') : 'General';
                // Auto-advance
                state.step = 2;
                render();
            });
        });

        // Unit buttons (step 3)
        overlay.querySelectorAll('.wiz-unit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.unitType = btn.dataset.unit;
                render();
            });
        });

        // Stepper +/- (step 3)
        overlay.querySelectorAll('.wiz-stepper-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.action === 'inc') {
                    state.unitQty = Math.min(999, state.unitQty + 1);
                } else {
                    state.unitQty = Math.max(1, state.unitQty - 1);
                }
                const display = overlay.querySelector('#wiz-qty-display');
                if (display) display.textContent = state.unitQty;
            });
        });

        // Input sync
        const conceptoEl = overlay.querySelector('#wiz-concepto');
        if (conceptoEl) {
            conceptoEl.addEventListener('input', () => { state.concepto = conceptoEl.value.trim(); });
            setTimeout(() => { conceptoEl.focus(); scrollIntoViewSafe(conceptoEl); }, 100);
        }

        const whoEl = overlay.querySelector('#wiz-who');
        if (whoEl) {
            whoEl.addEventListener('input', () => { state.who = whoEl.value.trim(); });
        }

        const fechaEl = overlay.querySelector('#wiz-fecha');
        if (fechaEl) {
            fechaEl.addEventListener('change', () => { state.fecha = fechaEl.value; });
        }

        const kgEl = overlay.querySelector('#wiz-kg');
        if (kgEl) {
            kgEl.addEventListener('input', () => { state.quantityKg = kgEl.value; });
        }

        const montoEl = overlay.querySelector('#wiz-monto');
        if (montoEl) {
            montoEl.addEventListener('input', () => { state.monto = montoEl.value; });
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
        const fechaEl = overlay.querySelector('#wiz-fecha');
        if (fechaEl) state.fecha = fechaEl.value;
        const kgEl = overlay.querySelector('#wiz-kg');
        if (kgEl) state.quantityKg = kgEl.value;
        const montoEl = overlay.querySelector('#wiz-monto');
        if (montoEl) state.monto = montoEl.value;
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
        btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Guardando...';

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sesión expirada.');

            // Build concepto with who (for tabs that embed who in concepto)
            let finalConcepto = state.concepto;
            if (meta.hasWho && state.who && typeof buildConceptWithWho === 'function') {
                finalConcepto = buildConceptWithWho(tabName, state.concepto, state.who);
            }

            const insertData = {
                user_id: user.id,
                crop_id: state.cropId || null,
                [tabName === 'gastos' ? 'date' : 'fecha']: state.fecha,
                [tabName === 'gastos' ? 'concept' : 'concepto']: finalConcepto,
                [tabName === 'gastos' ? 'amount' : 'monto']: parseFloat(state.monto) || 0
            };

            // Tab-specific WHO field (DB column)
            if (tabName === 'pendientes' && state.who) insertData.cliente = state.who;
            if (tabName === 'perdidas' && state.who) insertData.causa = state.who;
            if (tabName === 'transferencias' && state.who) insertData.destino = state.who;
            // ingresos: who is embedded in concepto via buildConceptWithWho
            // gastos: has category field but wizard uses simple concept

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

            const { error } = await supabase.from(meta.table).insert(insertData);
            if (error) throw error;

            // Show success
            const body = overlay.querySelector('.agro-wizard-body');
            const footer = overlay.querySelector('.agro-wizard-footer');
            if (body) body.innerHTML = `
                <div class="wiz-success">
                    <div class="wiz-success-icon">✅</div>
                    <div class="wiz-success-text">${meta.successMsg}</div>
                </div>
            `;
            if (footer) footer.style.display = 'none';

            // Auto-close after 1.5s and refresh
            setTimeout(() => {
                close();
                // Refresh history
                if (tabName === 'ingresos' && typeof loadIncomes === 'function') {
                    loadIncomes();
                }
                if (typeof refreshFactureroHistory === 'function') {
                    refreshFactureroHistory(tabName);
                }
            }, 1500);

        } catch (err) {
            console.error('[AgroWizard] Submit error:', err);
            // Re-enable button — user doesn't lose data
            btn.disabled = false;
            btn.innerHTML = '✅ REGISTRAR';
            const body = overlay.querySelector('.agro-wizard-body');
            if (body) {
                const errDiv = body.querySelector('.wiz-error');
                if (errDiv) errDiv.remove();
                body.insertAdjacentHTML('beforeend', `
                    <div class="wiz-error" style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; padding: 0.75rem; margin-top: 1rem; color: #ef4444; font-size: 0.85rem; text-align: center;">
                        ⚠️ ${escapeHtml(err.message || 'Error al guardar')}
                    </div>
                `);
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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text || '');
        return div.innerHTML;
    }

    // Mount
    document.body.appendChild(overlay);
    render();
}
