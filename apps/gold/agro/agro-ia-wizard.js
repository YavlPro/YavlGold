/**
 * agro-ia-wizard.js — Wizard de contexto IA para el asistente Agro
 * Modulo independiente (AGENTS.md §3.1)
 *
 * Flujo guiado corto (2 pasos) que captura:
 *   1. Experiencia y tipo de finca
 *   2. Expectativas del asistente IA
 *
 * Persiste en agro_farmer_profile (experience_level, farm_type, assistant_goals).
 * Carga onboarding context de user_onboarding_context.
 * Expone todo via window._agroIAContext para getAssistantContext().
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIZARD_OVERLAY_ID = 'agro-ia-wizard-overlay';
const IA_CONTEXT_BRIDGE_KEY = '_agroIAContext';
const PROFILE_TABLE = 'agro_farmer_profile';
const ONBOARDING_TABLE = 'user_onboarding_context';

const EXPERIENCE_OPTIONS = [
    { value: 'principiante', label: 'Principiante', icon: 'fa-seedling', desc: 'Estoy empezando en el campo o soy nuevo en herramientas digitales.' },
    { value: 'intermedio', label: 'Intermedio', icon: 'fa-leaf', desc: 'Tengo experiencia practica y quiero optimizar mi operacion.' },
    { value: 'experto', label: 'Experto', icon: 'fa-tree', desc: 'Llevo anos en agro y busco datos avanzados y eficiencia.' }
];

const FARM_TYPE_OPTIONS = [
    { value: 'campo_abierto', label: 'Campo abierto' },
    { value: 'invernadero', label: 'Invernadero' },
    { value: 'mixto', label: 'Mixto' },
    { value: 'urbano', label: 'Urbano / patio' }
];

const GOAL_OPTIONS = [
    { value: 'cultivos', label: 'Seguimiento de cultivos', icon: 'fa-seedling' },
    { value: 'finanzas', label: 'Control financiero', icon: 'fa-coins' },
    { value: 'plagas', label: 'Plagas y enfermedades', icon: 'fa-bug' },
    { value: 'clima', label: 'Clima y planificacion', icon: 'fa-cloud-sun' },
    { value: 'mercado', label: 'Mercado y precios', icon: 'fa-chart-line' }
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let wizardState = {
    supabase: null,
    userId: null,
    step: 1,
    data: {
        experience_level: '',
        farm_type: '',
        assistant_goals: []
    },
    onboarding: null,
    profile: null,
    loaded: false,
    saving: false
};

// ---------------------------------------------------------------------------
// Data layer
// ---------------------------------------------------------------------------

async function loadIAContextData(sb, userId) {
    const results = { profile: null, onboarding: null };

    try {
        const [profileRes, onboardingRes] = await Promise.all([
            sb.from(PROFILE_TABLE)
                .select('experience_level,farm_type,assistant_goals,display_name,farm_name,location_text')
                .eq('user_id', userId)
                .maybeSingle(),
            sb.from(ONBOARDING_TABLE)
                .select('agro_relation,main_activity,entry_preference,display_name,farm_name,onboarding_completed')
                .eq('user_id', userId)
                .maybeSingle()
        ]);

        if (profileRes.data) results.profile = profileRes.data;
        if (onboardingRes.data) results.onboarding = onboardingRes.data;
    } catch (err) {
        console.warn('[AGRO-IA-WIZARD] load error:', err?.message || err);
    }

    return results;
}

async function saveIAFields(sb, userId, fields) {
    const payload = {
        user_id: userId,
        experience_level: fields.experience_level || null,
        farm_type: fields.farm_type || null,
        assistant_goals: Array.isArray(fields.assistant_goals) ? fields.assistant_goals : [],
        updated_at: new Date().toISOString()
    };

    const { error } = await sb
        .from(PROFILE_TABLE)
        .upsert(payload, { onConflict: 'user_id' })
        .select('user_id')
        .maybeSingle();

    if (error) throw error;
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

function syncIAContextBridge() {
    const p = wizardState.profile || {};
    const o = wizardState.onboarding || {};
    const d = wizardState.data || {};

    window[IA_CONTEXT_BRIDGE_KEY] = {
        experience_level: d.experience_level || p.experience_level || null,
        farm_type: d.farm_type || p.farm_type || null,
        assistant_goals: d.assistant_goals?.length ? d.assistant_goals : (p.assistant_goals || []),
        agro_relation: o.agro_relation || null,
        main_activity: o.main_activity || null,
        onboarding_completed: Boolean(o.onboarding_completed)
    };
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function renderStep1() {
    const current = wizardState.data;

    const expCards = EXPERIENCE_OPTIONS.map(opt => {
        const selected = current.experience_level === opt.value;
        return `<button type="button" class="aiw-option-card ${selected ? 'aiw-option-card--selected' : ''}"
                    data-field="experience_level" data-value="${opt.value}">
                    <i class="fa-solid ${opt.icon} aiw-option-icon"></i>
                    <span class="aiw-option-label">${opt.label}</span>
                    <span class="aiw-option-desc">${opt.desc}</span>
                </button>`;
    }).join('');

    const farmChips = FARM_TYPE_OPTIONS.map(opt => {
        const selected = current.farm_type === opt.value;
        return `<button type="button" class="aiw-chip ${selected ? 'aiw-chip--selected' : ''}"
                    data-field="farm_type" data-value="${opt.value}">${opt.label}</button>`;
    }).join('');

    return `
        <div class="aiw-step" data-step="1">
            <h3 class="aiw-step-title">Tu experiencia</h3>
            <p class="aiw-step-subtitle">Esto ayuda al asistente a calibrar sus recomendaciones.</p>
            <div class="aiw-options-grid">${expCards}</div>
            <div class="aiw-field-group">
                <label class="aiw-field-label">Tipo de finca <span class="aiw-optional">(opcional)</span></label>
                <div class="aiw-chips-row">${farmChips}</div>
            </div>
        </div>`;
}

function renderStep2() {
    const current = wizardState.data.assistant_goals || [];

    const goalCards = GOAL_OPTIONS.map(opt => {
        const selected = current.includes(opt.value);
        return `<button type="button" class="aiw-goal-chip ${selected ? 'aiw-goal-chip--selected' : ''}"
                    data-goal="${opt.value}">
                    <i class="fa-solid ${opt.icon} aiw-goal-icon"></i>
                    <span>${opt.label}</span>
                </button>`;
    }).join('');

    return `
        <div class="aiw-step" data-step="2">
            <h3 class="aiw-step-title">Tu asistente de campo</h3>
            <p class="aiw-step-subtitle">Selecciona en que quieres que te ayude mas. Puedes elegir varias.</p>
            <div class="aiw-goals-grid">${goalCards}</div>
        </div>`;
}

function renderWizardHTML() {
    return `
    <div class="aiw-overlay" id="${WIZARD_OVERLAY_ID}">
        <div class="aiw-modal">
            <div class="aiw-header">
                <div class="aiw-header-left">
                    <i class="fa-solid fa-wand-magic-sparkles aiw-header-icon"></i>
                    <span class="aiw-header-title">Configura tu asistente</span>
                </div>
                <button type="button" class="aiw-close" id="aiw-close" aria-label="Cerrar">&times;</button>
            </div>
            <div class="aiw-progress">
                <div class="aiw-progress-bar" id="aiw-progress-bar" style="width: 50%"></div>
            </div>
            <div class="aiw-body" id="aiw-body">
                ${renderStep1()}
            </div>
            <div class="aiw-footer">
                <button type="button" class="aiw-btn aiw-btn--secondary" id="aiw-back" style="display:none">Atras</button>
                <div class="aiw-footer-spacer"></div>
                <button type="button" class="aiw-btn aiw-btn--skip" id="aiw-skip">Omitir</button>
                <button type="button" class="aiw-btn aiw-btn--primary" id="aiw-next">Siguiente</button>
            </div>
        </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

function updateStepUI() {
    const body = document.getElementById('aiw-body');
    const bar = document.getElementById('aiw-progress-bar');
    const backBtn = document.getElementById('aiw-back');
    const nextBtn = document.getElementById('aiw-next');

    if (!body) return;

    body.innerHTML = wizardState.step === 1 ? renderStep1() : renderStep2();
    if (bar) bar.style.width = wizardState.step === 1 ? '50%' : '100%';
    if (backBtn) backBtn.style.display = wizardState.step === 1 ? 'none' : '';
    if (nextBtn) nextBtn.textContent = wizardState.step === 2 ? 'Guardar' : 'Siguiente';

    bindStepInteractions();
}

function bindStepInteractions() {
    // Experience / farm type single-select
    document.querySelectorAll('[data-field]').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.field;
            const value = btn.dataset.value;
            wizardState.data[field] = wizardState.data[field] === value ? '' : value;
            updateStepUI();
        });
    });

    // Goals multi-select
    document.querySelectorAll('[data-goal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const goal = btn.dataset.goal;
            const goals = wizardState.data.assistant_goals;
            const idx = goals.indexOf(goal);
            if (idx >= 0) {
                goals.splice(idx, 1);
            } else {
                goals.push(goal);
            }
            updateStepUI();
        });
    });
}

function handleNext() {
    if (wizardState.step === 1) {
        wizardState.step = 2;
        updateStepUI();
    } else {
        saveAndClose();
    }
}

function handleBack() {
    if (wizardState.step > 1) {
        wizardState.step = 1;
        updateStepUI();
    }
}

async function saveAndClose() {
    if (wizardState.saving) return;
    wizardState.saving = true;

    const nextBtn = document.getElementById('aiw-next');
    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.textContent = 'Guardando...';
    }

    try {
        await saveIAFields(wizardState.supabase, wizardState.userId, wizardState.data);
        wizardState.profile = {
            ...wizardState.profile,
            experience_level: wizardState.data.experience_level,
            farm_type: wizardState.data.farm_type,
            assistant_goals: wizardState.data.assistant_goals
        };
        syncIAContextBridge();
        closeWizard();
    } catch (err) {
        console.error('[AGRO-IA-WIZARD] save error:', err?.message || err);
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.textContent = 'Reintentar';
        }
    } finally {
        wizardState.saving = false;
    }
}

function closeWizard() {
    const overlay = document.getElementById(WIZARD_OVERLAY_ID);
    if (overlay) {
        overlay.classList.add('aiw-overlay--closing');
        setTimeout(() => overlay.remove(), 200);
    }
}

// ---------------------------------------------------------------------------
// CSS (injected once, ADN Visual V10 tokens)
// ---------------------------------------------------------------------------

function injectStyles() {
    if (document.getElementById('agro-ia-wizard-styles')) return;

    const style = document.createElement('style');
    style.id = 'agro-ia-wizard-styles';
    style.textContent = `
/* agro-ia-wizard — ADN Visual V10 */
.aiw-overlay {
    position: fixed; inset: 0;
    z-index: 9999;
    background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center;
    opacity: 1;
    transition: opacity 180ms ease;
}
.aiw-overlay--closing { opacity: 0; }
.aiw-modal {
    background: var(--bg-2, #141414);
    border: 1px solid var(--gold-4, #C8A752);
    border-radius: 12px;
    width: min(460px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    display: flex; flex-direction: column;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.aiw-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--border-1, #2a2a2a);
}
.aiw-header-left { display: flex; align-items: center; gap: 10px; }
.aiw-header-icon { color: var(--gold-4, #C8A752); font-size: 1.1rem; }
.aiw-header-title {
    font-family: var(--font-heading, 'Orbitron', sans-serif);
    font-size: 0.95rem; font-weight: 600;
    color: var(--text-1, #f5f5f5);
}
.aiw-close {
    background: none; border: none; color: var(--text-3, #888);
    font-size: 1.4rem; cursor: pointer; padding: 4px 8px; line-height: 1;
    transition: color 150ms ease;
}
.aiw-close:hover { color: var(--text-1, #f5f5f5); }
.aiw-progress {
    height: 3px; background: var(--bg-3, #1e1e1e);
}
.aiw-progress-bar {
    height: 100%; background: var(--gold-4, #C8A752);
    transition: width 220ms ease;
}
.aiw-body { padding: 20px; }
.aiw-step-title {
    font-family: var(--font-heading, 'Orbitron', sans-serif);
    font-size: 1rem; font-weight: 600;
    color: var(--text-1, #f5f5f5);
    margin: 0 0 4px;
}
.aiw-step-subtitle {
    font-family: var(--font-body, 'Rajdhani', sans-serif);
    font-size: 0.85rem; color: var(--text-3, #888);
    margin: 0 0 16px;
}
.aiw-options-grid {
    display: flex; flex-direction: column; gap: 10px;
    margin-bottom: 18px;
}
.aiw-option-card {
    display: flex; align-items: flex-start; gap: 12px;
    background: var(--bg-3, #1e1e1e);
    border: 1px solid var(--border-1, #2a2a2a);
    border-radius: 8px;
    padding: 12px 14px;
    cursor: pointer;
    text-align: left;
    transition: border-color 150ms ease, background 150ms ease;
    color: var(--text-2, #ccc);
    font-family: var(--font-body, 'Rajdhani', sans-serif);
}
.aiw-option-card:hover {
    border-color: var(--gold-5, #A68A3E);
    background: var(--bg-2, #141414);
}
.aiw-option-card--selected {
    border-color: var(--gold-4, #C8A752);
    background: rgba(200, 167, 82, 0.08);
}
.aiw-option-icon {
    color: var(--gold-4, #C8A752);
    font-size: 1rem;
    margin-top: 2px;
    min-width: 18px;
    text-align: center;
}
.aiw-option-label {
    font-weight: 600; font-size: 0.9rem;
    color: var(--text-1, #f5f5f5);
    display: block;
}
.aiw-option-desc {
    font-size: 0.78rem; color: var(--text-3, #888);
    display: block; margin-top: 2px;
}
.aiw-field-group { margin-bottom: 8px; }
.aiw-field-label {
    font-family: var(--font-body, 'Rajdhani', sans-serif);
    font-size: 0.82rem; color: var(--text-2, #ccc);
    display: block; margin-bottom: 8px;
}
.aiw-optional { color: var(--text-3, #888); font-size: 0.75rem; }
.aiw-chips-row { display: flex; flex-wrap: wrap; gap: 8px; }
.aiw-chip {
    background: var(--bg-3, #1e1e1e);
    border: 1px solid var(--border-1, #2a2a2a);
    border-radius: 20px;
    padding: 6px 14px;
    font-family: var(--font-body, 'Rajdhani', sans-serif);
    font-size: 0.82rem;
    color: var(--text-2, #ccc);
    cursor: pointer;
    transition: border-color 150ms ease, background 150ms ease;
}
.aiw-chip:hover { border-color: var(--gold-5, #A68A3E); }
.aiw-chip--selected {
    border-color: var(--gold-4, #C8A752);
    background: rgba(200, 167, 82, 0.12);
    color: var(--gold-4, #C8A752);
}
.aiw-goals-grid {
    display: flex; flex-wrap: wrap; gap: 10px;
}
.aiw-goal-chip {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg-3, #1e1e1e);
    border: 1px solid var(--border-1, #2a2a2a);
    border-radius: 8px;
    padding: 10px 14px;
    font-family: var(--font-body, 'Rajdhani', sans-serif);
    font-size: 0.85rem;
    color: var(--text-2, #ccc);
    cursor: pointer;
    transition: border-color 150ms ease, background 150ms ease;
}
.aiw-goal-chip:hover { border-color: var(--gold-5, #A68A3E); }
.aiw-goal-chip--selected {
    border-color: var(--gold-4, #C8A752);
    background: rgba(200, 167, 82, 0.10);
    color: var(--gold-4, #C8A752);
}
.aiw-goal-icon { font-size: 0.9rem; }
.aiw-footer {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 20px 16px;
    border-top: 1px solid var(--border-1, #2a2a2a);
}
.aiw-footer-spacer { flex: 1; }
.aiw-btn {
    font-family: var(--font-body, 'Rajdhani', sans-serif);
    font-size: 0.85rem; font-weight: 600;
    border-radius: 6px;
    padding: 8px 18px;
    cursor: pointer;
    transition: opacity 150ms ease, background 150ms ease;
    border: none;
}
.aiw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.aiw-btn--primary {
    background: var(--gold-4, #C8A752);
    color: var(--bg-1, #0a0a0a);
}
.aiw-btn--primary:hover:not(:disabled) { opacity: 0.9; }
.aiw-btn--secondary {
    background: var(--bg-3, #1e1e1e);
    color: var(--text-2, #ccc);
    border: 1px solid var(--border-1, #2a2a2a);
}
.aiw-btn--secondary:hover { border-color: var(--gold-5, #A68A3E); }
.aiw-btn--skip {
    background: none; color: var(--text-3, #888);
    padding: 8px 12px;
}
.aiw-btn--skip:hover { color: var(--text-2, #ccc); }

@media (max-width: 480px) {
    .aiw-modal { border-radius: 8px; }
    .aiw-body { padding: 16px; }
    .aiw-options-grid { gap: 8px; }
    .aiw-option-card { padding: 10px 12px; }
}

@media (prefers-reduced-motion: reduce) {
    .aiw-overlay, .aiw-progress-bar, .aiw-option-card, .aiw-chip,
    .aiw-goal-chip, .aiw-btn, .aiw-close { transition: none; }
}

/* Trigger button inside assistant guide */
.assistant-configure-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--bg-3, #1e1e1e);
    border: 1px solid var(--border-1, #2a2a2a);
    border-radius: 6px;
    padding: 6px 12px;
    margin-top: 10px;
    font-family: var(--font-body, 'Rajdhani', sans-serif);
    font-size: 0.78rem;
    color: var(--gold-4, #C8A752);
    cursor: pointer;
    transition: border-color 150ms ease, background 150ms ease;
}
.assistant-configure-btn:hover {
    border-color: var(--gold-4, #C8A752);
    background: rgba(200, 167, 82, 0.08);
}
`;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open the IA wizard modal.
 * @param {{ supabase: object, userId: string }} opts
 */
export async function openIAWizard({ supabase, userId } = {}) {
    const sb = supabase || wizardState.supabase;
    const uid = userId || wizardState.userId;
    if (!sb || !uid) {
        console.warn('[AGRO-IA-WIZARD] Missing supabase or userId');
        return;
    }

    // Prevent double open
    if (document.getElementById(WIZARD_OVERLAY_ID)) return;

    injectStyles();

    wizardState.supabase = sb;
    wizardState.userId = uid;
    wizardState.step = 1;
    wizardState.saving = false;

    // Load existing data
    const existing = await loadIAContextData(sb, uid);
    wizardState.profile = existing.profile;
    wizardState.onboarding = existing.onboarding;

    // Pre-fill from existing profile
    wizardState.data.experience_level = existing.profile?.experience_level || '';
    wizardState.data.farm_type = existing.profile?.farm_type || '';
    wizardState.data.assistant_goals = Array.isArray(existing.profile?.assistant_goals)
        ? [...existing.profile.assistant_goals]
        : [];

    // Inject HTML
    const container = document.createElement('div');
    container.innerHTML = renderWizardHTML();
    document.body.appendChild(container.firstElementChild);

    // Bind navigation
    document.getElementById('aiw-close')?.addEventListener('click', closeWizard);
    document.getElementById('aiw-next')?.addEventListener('click', handleNext);
    document.getElementById('aiw-back')?.addEventListener('click', handleBack);
    document.getElementById('aiw-skip')?.addEventListener('click', closeWizard);

    // Close on overlay click
    document.getElementById(WIZARD_OVERLAY_ID)?.addEventListener('click', (e) => {
        if (e.target.id === WIZARD_OVERLAY_ID) closeWizard();
    });

    // Close on Escape
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeWizard();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    bindStepInteractions();
}

/**
 * Initialize IA context bridge (load data silently, no wizard).
 * Called during Agro bootstrap to ensure context is available for the assistant.
 * @param {{ supabase: object, userId: string }} opts
 */
export async function initIAContext({ supabase, userId } = {}) {
    if (!supabase || !userId) return;

    wizardState.supabase = supabase;
    wizardState.userId = userId;

    try {
        const existing = await loadIAContextData(supabase, userId);
        wizardState.profile = existing.profile;
        wizardState.onboarding = existing.onboarding;
        wizardState.data.experience_level = existing.profile?.experience_level || '';
        wizardState.data.farm_type = existing.profile?.farm_type || '';
        wizardState.data.assistant_goals = Array.isArray(existing.profile?.assistant_goals)
            ? [...existing.profile.assistant_goals]
            : [];
        wizardState.loaded = true;
    } catch (err) {
        console.warn('[AGRO-IA-WIZARD] init context error:', err?.message || err);
    }

    syncIAContextBridge();
}

/**
 * Check if the IA context wizard has been completed (has experience_level set).
 */
export function isIAContextComplete() {
    const ctx = window[IA_CONTEXT_BRIDGE_KEY];
    return Boolean(ctx?.experience_level && ctx?.assistant_goals?.length > 0);
}

// Expose for inline scripts and monolito wiring
window.openAgroIAWizard = openIAWizard;
window.initAgroIAContext = initIAContext;
window.isAgroIAContextComplete = isIAContextComplete;
