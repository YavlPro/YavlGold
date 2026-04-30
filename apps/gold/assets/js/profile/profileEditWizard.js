const STYLE_ID = 'yg-profile-edit-wizard-styles';
const DEFAULT_DRAFT_KEY = 'YG_PROFILE_EDIT_DRAFT_V1';
const MAX_LOCAL_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const STEP_COUNT = 4;

let activeWizard = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
      /* ── DNA V10 Tokens (local fallbacks) ── */
      .yg-profile-edit-layer {
        --pe-gold-1: var(--v10-gold-1, #2a2218);
        --pe-gold-2: var(--v10-gold-2, #3a3228);
        --pe-gold-3: var(--v10-gold-3, #6b5a3e);
        --pe-gold-4: var(--v10-gold-4, #C8A752);
        --pe-gold-5: var(--v10-gold-5, #E8D48B);
        --pe-gold-prestige: var(--v10-gold-prestige, #E5D5A0);
        --pe-bg-0: var(--v10-bg-0, #050505);
        --pe-bg-1: var(--v10-bg-1, #0a0a0a);
        --pe-bg-2: var(--v10-bg-2, #0B0C0F);
        --pe-bg-3: var(--v10-bg-3, #111113);
        --pe-bg-4: var(--v10-bg-4, #1a1a1f);
        --pe-text-primary: var(--v10-text-primary, #ffffff);
        --pe-text-secondary: var(--v10-text-secondary, #cccccc);
        --pe-text-muted: var(--v10-text-muted, #94A3B8);
        --pe-border-neutral: var(--v10-border-neutral, rgba(255,255,255,0.08));
        --pe-border-gold: var(--v10-border-gold, rgba(200,167,82,0.25));
        --pe-border-prestige: var(--v10-border-prestige, rgba(229,213,160,0.18));
        --pe-shadow-gold-sm: var(--v10-shadow-gold-sm, 0 2px 10px rgba(0,0,0,0.18));
        --pe-shadow-gold-md: var(--v10-shadow-gold-md, 0 8px 32px rgba(0,0,0,0.5));
        --pe-shadow-gold-lg: var(--v10-shadow-gold-lg, 0 8px 32px rgba(0,0,0,0.5));
        --pe-shadow-modal: var(--v10-shadow-modal, 0 8px 32px rgba(0,0,0,0.5));
        --pe-glass-bg: var(--v10-glass-bg, var(--pe-bg-2));
        --pe-accent-line: var(--pe-gold-4);
        --pe-accent-text: var(--pe-text-primary);
        --pe-accent-btn: var(--pe-gold-4);
        --pe-accent-border: var(--pe-gold-4);
        --pe-accent-surface: var(--pe-bg-3);
      }

      /* ── Lock ── */
      .yg-profile-edit-lock {
        overflow: hidden;
      }

      /* ── Layer (backdrop) ── */
      .yg-profile-edit-layer {
        position: fixed;
        inset: 0;
        z-index: var(--z-modal, 1050);
        padding: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: none;
      }

      /* ── Shell ── */
      .yg-profile-edit-shell {
        width: min(1020px, 100%);
        min-height: min(760px, calc(100vh - 36px));
        display: grid;
        grid-template-columns: minmax(280px, 330px) minmax(0, 1fr);
        gap: 18px;
        margin: auto 0;
        animation: none;
      }

      /* ── Panels (side + card) ── */
      .yg-profile-edit-side,
      .yg-profile-edit-card {
        border: 1px solid var(--pe-border-gold);
        border-radius: var(--radius-md, 12px);
        background: var(--pe-bg-2);
        box-shadow: var(--pe-shadow-modal);
        position: relative;
        overflow: hidden;
      }

      .yg-profile-edit-side::before,
      .yg-profile-edit-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--pe-accent-border);
        animation: none;
      }

      /* ── Side panel ── */
      .yg-profile-edit-side {
        padding: 28px 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        animation: none;
      }

      .yg-profile-edit-side::after {
        content: '';
        position: absolute;
        inset: auto -50px -50px auto;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: transparent;
        pointer-events: none;
      }

      /* ── Eyebrow badge ── */
      .yg-profile-edit-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        padding: 8px 14px;
        border-radius: var(--radius-pill, 9999px);
        background: rgba(200,167,82,0.10);
        border: 1px solid var(--pe-border-prestige);
        color: var(--pe-gold-prestige);
        font: 700 0.84rem/1 'Rajdhani', sans-serif;
        letter-spacing: 0.10em;
        text-transform: uppercase;
      }

      /* ── Side heading ── */
      .yg-profile-edit-side h2 {
        margin: 0;
        font: 900 clamp(1.65rem, 3vw, 2.3rem)/1.08 'Orbitron', sans-serif;
        color: var(--pe-text-primary);
        background: none;
        animation: none;
      }

      .yg-profile-edit-side p {
        margin: 0;
        color: var(--pe-text-secondary);
        font: 600 1rem/1.55 'Rajdhani', sans-serif;
      }

      /* ── Progress ── */
      .yg-profile-edit-progress {
        display: grid;
        gap: 10px;
      }

      .yg-profile-edit-progress-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--pe-text-secondary);
        font: 700 0.9rem/1 'Rajdhani', sans-serif;
      }

      .yg-profile-edit-track {
        width: 100%;
        height: 10px;
        border-radius: var(--radius-pill, 9999px);
        background: rgba(255,255,255,0.06);
        overflow: hidden;
      }

      .yg-profile-edit-bar {
        height: 100%;
        border-radius: inherit;
        background: var(--pe-gold-4);
        transition: width 200ms ease;
        animation: none;
      }

      /* ── Step list ── */
      .yg-profile-edit-step-list {
        display: grid;
        gap: 10px;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .yg-profile-edit-step {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        padding: 13px 15px;
        border-radius: var(--radius-lg, 16px);
        border: 1px solid var(--pe-border-neutral);
        background: rgba(255,255,255,0.02);
        transition: border-color 180ms ease, background 180ms ease, color 180ms ease;
      }

      .yg-profile-edit-step.is-active {
        border-color: var(--pe-border-gold);
        background: rgba(200,167,82,0.08);
        box-shadow: none;
      }

      .yg-profile-edit-step.is-complete {
        border-color: var(--pe-border-prestige);
      }

      .yg-profile-edit-step-index {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--pe-bg-4);
        border: 1px solid var(--pe-border-neutral);
        color: var(--pe-text-muted);
        font: 700 0.94rem/1 'Orbitron', sans-serif;
        transition: background 180ms ease, color 180ms ease, border-color 180ms ease;
      }

      .yg-profile-edit-step.is-active .yg-profile-edit-step-index,
      .yg-profile-edit-step.is-complete .yg-profile-edit-step-index {
        background: var(--pe-gold-4);
        border-color: var(--pe-gold-4);
        color: var(--pe-bg-2);
      }

      .yg-profile-edit-step-title {
        display: block;
        margin-bottom: 3px;
        color: var(--pe-text-primary);
        font: 700 1rem/1.12 'Rajdhani', sans-serif;
      }

      .yg-profile-edit-step-desc {
        color: var(--pe-text-muted);
        font: 500 0.92rem/1.35 'Rajdhani', sans-serif;
      }

      /* ── Card (main content) ── */
      .yg-profile-edit-card {
        padding: 30px;
        display: flex;
        flex-direction: column;
        min-height: 0;
        animation: none;
      }

      .yg-profile-edit-card header {
        margin-bottom: 20px;
      }

      .yg-profile-edit-kicker {
        margin: 0 0 8px;
        color: var(--pe-gold-4);
        font: 700 0.84rem/1 'Rajdhani', sans-serif;
        letter-spacing: 0.10em;
        text-transform: uppercase;
      }

      .yg-profile-edit-card h3 {
        margin: 0 0 10px;
        font: 900 clamp(1.4rem, 2.8vw, 1.95rem)/1.08 'Orbitron', sans-serif;
        color: var(--pe-text-primary);
        background: none;
        animation: none;
      }

      .yg-profile-edit-card p {
        margin: 0;
        color: var(--pe-text-secondary);
        font: 600 1rem/1.55 'Rajdhani', sans-serif;
      }

      /* ── Form structure ── */
      .yg-profile-edit-form {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
      }

      .yg-profile-edit-body {
        flex: 1;
        min-height: 0;
        overflow: auto;
        padding-right: 4px;
        animation: none;
      }

      .yg-profile-edit-stack {
        display: grid;
        gap: 18px;
      }

      .yg-profile-edit-field {
        display: grid;
        gap: 10px;
      }

      .yg-profile-edit-field span,
      .yg-profile-edit-label {
        color: var(--pe-text-primary);
        font: 700 0.96rem/1.1 'Rajdhani', sans-serif;
      }

      /* ── Inputs ── */
      .yg-profile-edit-input,
      .yg-profile-edit-textarea {
        width: 100%;
        border-radius: var(--radius-sm, 8px);
        border: 1px solid var(--pe-border-neutral);
        background: var(--pe-bg-4);
        color: var(--pe-text-primary);
        font: 600 1rem/1.2 'Rajdhani', sans-serif;
        transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
      }

      .yg-profile-edit-input {
        padding: 16px 18px;
      }

      .yg-profile-edit-textarea {
        min-height: 140px;
        padding: 14px 18px;
        resize: vertical;
      }

      .yg-profile-edit-input:focus,
      .yg-profile-edit-textarea:focus {
        outline: none;
        border-color: var(--pe-gold-4);
        background: var(--pe-bg-3);
        box-shadow: 0 0 0 3px rgba(200,167,82,0.12);
      }

      /* ── Help box ── */
      .yg-profile-edit-help {
        padding: 14px 18px;
        border-radius: var(--radius-lg, 16px);
        border: 1px solid var(--pe-border-neutral);
        background: rgba(200,167,82,0.05);
        color: var(--pe-text-secondary);
        font: 700 0.94rem/1.48 'Rajdhani', sans-serif;
      }

      /* ── Inline fields ── */
      .yg-profile-edit-inline {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      /* ── Avatar ── */
      .yg-profile-edit-avatar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 16px;
        padding: 18px;
        border-radius: var(--radius-md, 12px);
        border: 1px solid var(--pe-border-neutral);
        background: rgba(200,167,82,0.04);
        transition: border-color 180ms ease, box-shadow 180ms ease;
      }

      .yg-profile-edit-avatar:hover {
        border-color: var(--pe-border-gold);
        box-shadow: none;
      }

      .yg-profile-edit-avatar-preview {
        width: 92px;
        height: 92px;
        border-radius: var(--radius-md, 12px);
        border: 1px solid var(--pe-border-gold);
        background: var(--pe-accent-surface);
        display: grid;
        place-items: center;
        color: var(--pe-gold-4);
        font: 700 1.8rem/1 'Orbitron', sans-serif;
        overflow: hidden;
        transition: border-color 180ms ease, box-shadow 180ms ease;
      }

      .yg-profile-edit-avatar-preview:hover {
        border-color: var(--pe-gold-4);
        box-shadow: none;
      }

      .yg-profile-edit-avatar-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .yg-profile-edit-avatar-meta {
        display: grid;
        gap: 12px;
      }

      .yg-profile-edit-avatar-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .yg-profile-edit-avatar-file {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
      }

      /* ── Summary ── */
      .yg-profile-edit-summary {
        display: grid;
        gap: 12px;
      }

      .yg-profile-edit-summary-row {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        padding: 14px 18px;
        border-radius: var(--radius-md, 12px);
        border: 1px solid var(--pe-border-neutral);
        background: var(--pe-bg-3);
        transition: border-color 160ms ease, background 160ms ease;
      }

      .yg-profile-edit-summary-row:hover {
        border-color: var(--pe-border-gold);
        background: rgba(200,167,82,0.04);
      }

      .yg-profile-edit-summary-label {
        color: var(--pe-text-muted);
        font: 700 0.88rem/1.2 'Rajdhani', sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .yg-profile-edit-summary-value {
        color: var(--pe-text-primary);
        text-align: right;
        font: 700 1rem/1.2 'Rajdhani', sans-serif;
      }

      /* ── Footer ── */
      .yg-profile-edit-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-top: 18px;
        margin-top: 18px;
        border-top: 1px solid var(--pe-border-neutral);
      }

      .yg-profile-edit-status {
        min-height: 24px;
        color: var(--pe-text-secondary);
        font: 700 0.96rem/1.2 'Rajdhani', sans-serif;
      }

      .yg-profile-edit-status.is-error {
        color: var(--color-error, #EF4444);
      }

      .yg-profile-edit-status.is-loading {
        color: var(--pe-gold-5);
      }

      .yg-profile-edit-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
      }

      /* ── Buttons ── */
      .yg-profile-edit-btn {
        border: 0;
        border-radius: var(--radius-sm, 8px);
        padding: 13px 22px;
        cursor: pointer;
        font: 700 0.96rem/1 'Rajdhani', sans-serif;
        letter-spacing: 0.03em;
        transition: opacity 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
      }

      .yg-profile-edit-btn:hover,
      .yg-profile-edit-btn:focus-visible {
        outline: none;
      }

      .yg-profile-edit-btn:active {
        opacity: 0.9;
      }

      .yg-profile-edit-btn:disabled {
        opacity: 0.55;
        cursor: wait;
      }

      .yg-profile-edit-btn-secondary {
        background: var(--pe-bg-4);
        color: var(--pe-text-primary);
        border: 1px solid var(--pe-border-neutral);
      }

      .yg-profile-edit-btn-secondary:hover,
      .yg-profile-edit-btn-secondary:focus-visible {
        border-color: var(--pe-border-prestige);
        background: rgba(255,255,255,0.06);
      }

      .yg-profile-edit-btn-ghost {
        background: transparent;
        color: var(--pe-text-secondary);
        border: 1px solid var(--pe-border-neutral);
      }

      .yg-profile-edit-btn-ghost:hover,
      .yg-profile-edit-btn-ghost:focus-visible {
        border-color: var(--pe-border-gold);
        color: var(--pe-gold-5);
        background: rgba(200,167,82,0.04);
      }

      .yg-profile-edit-btn-primary {
        background: var(--pe-accent-btn);
        color: var(--pe-bg-2);
        font-weight: 900;
        box-shadow: none;
        animation: none;
      }

      .yg-profile-edit-btn-primary:hover,
      .yg-profile-edit-btn-primary:focus-visible {
        opacity: 0.9;
        box-shadow: none;
      }

      /* ── Responsive ── */
      @media (max-width: 900px), (max-height: 820px) {
        .yg-profile-edit-layer {
          padding: 12px;
          align-items: center;
        }

        .yg-profile-edit-shell {
          min-height: auto;
          margin-block: auto;
        }
      }

      @media (max-width: 900px) {
        .yg-profile-edit-shell {
          grid-template-columns: 1fr;
        }

        .yg-profile-edit-side h2 {
          font-size: clamp(1.4rem, 5vw, 1.9rem);
        }

        .yg-profile-edit-card h3 {
          font-size: clamp(1.25rem, 4.5vw, 1.7rem);
        }
      }

      @media (max-width: 640px) {
        .yg-profile-edit-layer {
          padding: 8px;
        }

        .yg-profile-edit-side,
        .yg-profile-edit-card {
          padding: 20px 18px;
          border-radius: var(--radius-xl, 24px);
        }

        .yg-profile-edit-inline,
        .yg-profile-edit-avatar {
          grid-template-columns: 1fr;
        }

        .yg-profile-edit-avatar-preview {
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }

        .yg-profile-edit-input {
          padding: 14px 16px;
        }

        .yg-profile-edit-textarea {
          padding: 12px 16px;
          min-height: 120px;
        }

        .yg-profile-edit-summary-row,
        .yg-profile-edit-footer {
          flex-direction: column;
          align-items: stretch;
        }

        .yg-profile-edit-summary-value {
          text-align: left;
        }

        .yg-profile-edit-actions {
          justify-content: stretch;
        }

        .yg-profile-edit-btn {
          width: 100%;
          padding: 14px 20px;
          text-align: center;
        }

        .yg-profile-edit-step {
          padding: 11px 13px;
        }
      }

      @media (max-width: 400px) {
        .yg-profile-edit-layer {
          padding: 4px;
        }

        .yg-profile-edit-side,
        .yg-profile-edit-card {
          padding: 16px 14px;
          border-radius: var(--radius-lg, 16px);
        }

        .yg-profile-edit-side h2 {
          font-size: 1.3rem;
        }

        .yg-profile-edit-card h3 {
          font-size: 1.15rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .yg-profile-edit-layer,
        .yg-profile-edit-shell,
        .yg-profile-edit-side,
        .yg-profile-edit-card,
        .yg-profile-edit-body {
          animation: none !important;
        }

        .yg-profile-edit-bar,
        .yg-profile-edit-side h2,
        .yg-profile-edit-card h3,
        .yg-profile-edit-btn-primary {
          animation: none !important;
        }

        .yg-profile-edit-side::before,
        .yg-profile-edit-card::before {
          animation: none !important;
        }

        .yg-profile-edit-bar,
        .yg-profile-edit-btn,
        .yg-profile-edit-input,
        .yg-profile-edit-textarea,
        .yg-profile-edit-step,
        .yg-profile-edit-step-index,
        .yg-profile-edit-summary-row,
        .yg-profile-edit-avatar,
        .yg-profile-edit-avatar-preview {
          transition: none !important;
        }
      }
    `;

  document.head.append(style);
}

function getStorage() {
  try {
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

function readDraft(draftKey) {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(draftKey);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeDraft(draftKey, payload) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(draftKey, JSON.stringify(payload));
  } catch (_) {
    // ignore local draft failures
  }
}

function clearDraft(draftKey) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(draftKey);
  } catch (_) {
    // ignore local draft failures
  }
}

function normalizeText(value) {
  return String(value || '').trim();
}

function buildDraftKey(initialData = {}) {
  const userId = normalizeText(initialData.userId);
  return userId ? `${DEFAULT_DRAFT_KEY}:${userId}` : DEFAULT_DRAFT_KEY;
}

function buildInitialState(initialData = {}, draftData = null) {
  const initialAvatarUrl = normalizeText(initialData.avatarUrl);
  const hasLocalAvatar = initialAvatarUrl.startsWith('data:image/');
  const baseState = {
    step: 0,
    isSubmitting: false,
    status: '',
    statusLevel: 'muted',
    displayName: normalizeText(initialData.displayName || initialData.email || 'Agricultor'),
    farmName: normalizeText(initialData.farmName),
    locationText: normalizeText(initialData.locationText),
    notes: normalizeText(initialData.notes),
    phone: normalizeText(initialData.phone),
    whatsapp: normalizeText(initialData.whatsapp),
    instagram: normalizeText(initialData.instagram),
    facebook: normalizeText(initialData.facebook),
    avatarMode: 'none',
    avatarValue: initialAvatarUrl,
    avatarPreviewUrl: initialAvatarUrl,
    avatarUrlInput: hasLocalAvatar ? '' : initialAvatarUrl,
    email: normalizeText(initialData.email),
    userId: normalizeText(initialData.userId)
  };

  if (!draftData) return baseState;

  return {
    ...baseState,
    ...draftData,
    step: Number.isInteger(draftData.step) ? Math.max(0, Math.min(STEP_COUNT - 1, draftData.step)) : 0,
    isSubmitting: false,
    status: '',
    statusLevel: 'muted'
  };
}

function serializeDraft(state) {
  return {
    step: state.step,
    displayName: state.displayName,
    farmName: state.farmName,
    locationText: state.locationText,
    notes: state.notes,
    phone: state.phone,
    whatsapp: state.whatsapp,
    instagram: state.instagram,
    facebook: state.facebook,
    avatarMode: state.avatarMode,
    avatarValue: state.avatarValue,
    avatarPreviewUrl: state.avatarPreviewUrl,
    avatarUrlInput: state.avatarUrlInput
  };
}

function resolveAvatarMarkup(state) {
  const previewUrl = normalizeText(state.avatarPreviewUrl);
  if (!previewUrl) {
    const initials = normalizeText(state.displayName || state.email || 'AG')
      .split(/\s+/)
      .slice(0, 2)
      .map((chunk) => chunk.charAt(0))
      .join('')
      .toUpperCase() || 'AG';
    return `<span>${escapeHtml(initials)}</span>`;
  }
  return `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(state.displayName || 'Avatar')}">`;
}

function getStepMeta(step) {
  const steps = [
    { kicker: 'Paso 1', title: 'Tu identidad visible', description: 'Ajusta el nombre con el que te recibimos y la imagen que representa tu perfil.', helper: 'Empieza por cómo quieres verte dentro de Agro.', sidebarTitle: 'Identidad', sidebarDescription: 'Nombre visible y avatar.' },
    { kicker: 'Paso 2', title: 'Tu contexto base', description: 'Organiza la información que más ayuda a reconocer tu operación agrícola.', helper: 'Solo los datos que dan contexto real a tu perfil.', sidebarTitle: 'Contexto', sidebarDescription: 'Finca, ubicación y biografía corta.' },
    { kicker: 'Paso 3', title: 'Tu contacto operativo', description: 'Agrupa los medios por donde más te ubican dentro y fuera de tu operación.', helper: 'Todo por bloques, sin volver a la pantalla larga de antes.', sidebarTitle: 'Contacto', sidebarDescription: 'Teléfono y redes opcionales.' },
    { kicker: 'Paso 4', title: 'Revisión final', description: 'Confirma que el perfil quedó claro antes de guardarlo.', helper: 'Revisa y guarda cuando todo se sienta correcto.', sidebarTitle: 'Resumen', sidebarDescription: 'Revisión rápida antes de aplicar cambios.' }
  ];
  return steps[step] || steps[0];
}

function validateStep(state) {
  if (state.step === 0 && normalizeText(state.displayName).length < 2) {
    return 'Indica cómo quieres que te llamemos dentro de Agro.';
  }
  return '';
}

function buildSummaryRows(state) {
  const rows = [
    ['Nombre visible', state.displayName],
    ['Avatar', state.avatarPreviewUrl ? 'Configurado' : 'Sin foto'],
    ['Finca', state.farmName],
    ['Ubicación', state.locationText],
    ['Biografía', state.notes],
    ['Teléfono', state.phone],
    ['WhatsApp', state.whatsapp],
    ['Instagram', state.instagram],
    ['Facebook', state.facebook]
  ];

  return rows.map(([label, value]) => `
      <div class="yg-profile-edit-summary-row">
        <span class="yg-profile-edit-summary-label">${escapeHtml(label)}</span>
        <span class="yg-profile-edit-summary-value">${escapeHtml(normalizeText(value) || 'Sin definir')}</span>
      </div>
    `).join('');
}

function renderStepBody(state) {
  if (state.step === 0) {
    return `
          <div class="yg-profile-edit-stack">
            <div class="yg-profile-edit-avatar">
              <div class="yg-profile-edit-avatar-preview">${resolveAvatarMarkup(state)}</div>
              <div class="yg-profile-edit-avatar-meta">
                <label class="yg-profile-edit-field">
                  <span>Avatar por URL</span>
                  <input type="url" class="yg-profile-edit-input" data-field="avatarUrlInput" placeholder="https://.../avatar.jpg" value="${escapeHtml(state.avatarUrlInput)}">
                </label>
                <div class="yg-profile-edit-avatar-actions">
                  <label class="yg-profile-edit-btn yg-profile-edit-btn-secondary" for="yg-profile-edit-avatar-file">Subir foto</label>
                  <input id="yg-profile-edit-avatar-file" class="yg-profile-edit-avatar-file" type="file" accept="image/*" data-avatar-upload>
                  <button type="button" class="yg-profile-edit-btn yg-profile-edit-btn-ghost" data-action="clear-avatar">Quitar foto</button>
                </div>
                <div class="yg-profile-edit-help">Puedes usar una URL pública o una foto local de este dispositivo. Si la foto es local, se mantiene en este equipo.</div>
              </div>
            </div>
            <label class="yg-profile-edit-field">
              <span>Nombre visible</span>
              <input type="text" class="yg-profile-edit-input" data-field="displayName" maxlength="120" autocomplete="name" value="${escapeHtml(state.displayName)}" data-autofocus>
            </label>
          </div>
        `;
  }

  if (state.step === 1) {
    return `
          <div class="yg-profile-edit-stack">
            <label class="yg-profile-edit-field">
              <span>Finca</span>
              <input type="text" class="yg-profile-edit-input" data-field="farmName" maxlength="120" value="${escapeHtml(state.farmName)}" data-autofocus>
            </label>
            <label class="yg-profile-edit-field">
              <span>Ubicación</span>
              <input type="text" class="yg-profile-edit-input" data-field="locationText" maxlength="180" value="${escapeHtml(state.locationText)}">
            </label>
            <label class="yg-profile-edit-field">
              <span>Biografía o nota corta</span>
              <textarea class="yg-profile-edit-textarea" data-field="notes" maxlength="800" placeholder="Cuéntanos brevemente cómo trabajas tu operación.">${escapeHtml(state.notes)}</textarea>
            </label>
          </div>
        `;
  }

  if (state.step === 2) {
    return `
          <div class="yg-profile-edit-stack">
            <div class="yg-profile-edit-inline">
              <label class="yg-profile-edit-field">
                <span>Teléfono</span>
                <input type="text" class="yg-profile-edit-input" data-field="phone" maxlength="40" value="${escapeHtml(state.phone)}" data-autofocus>
              </label>
              <label class="yg-profile-edit-field">
                <span>WhatsApp</span>
                <input type="text" class="yg-profile-edit-input" data-field="whatsapp" maxlength="40" value="${escapeHtml(state.whatsapp)}">
              </label>
            </div>
            <div class="yg-profile-edit-inline">
              <label class="yg-profile-edit-field">
                <span>Instagram</span>
                <input type="text" class="yg-profile-edit-input" data-field="instagram" maxlength="80" value="${escapeHtml(state.instagram)}">
              </label>
              <label class="yg-profile-edit-field">
                <span>Facebook</span>
                <input type="text" class="yg-profile-edit-input" data-field="facebook" maxlength="80" value="${escapeHtml(state.facebook)}">
              </label>
            </div>
            <div class="yg-profile-edit-help">Todo este bloque es opcional. La idea es que puedas guardar por partes, no que vuelvas a completar una lista larga.</div>
          </div>
        `;
  }

  return `
      <div class="yg-profile-edit-stack">
        <div class="yg-profile-edit-help">Revisa este resumen antes de guardar. Si algo no te convence, puedes volver un paso y corregirlo sin perder cambios.</div>
        <div class="yg-profile-edit-summary">${buildSummaryRows(state)}</div>
      </div>
    `;
}

function render(root, state) {
  const stepMeta = getStepMeta(state.step);
  const progress = `${Math.round(((state.step + 1) / STEP_COUNT) * 100)}%`;
  const statusClass = ['yg-profile-edit-status', state.statusLevel === 'error' ? 'is-error' : '', state.statusLevel === 'loading' ? 'is-loading' : ''].filter(Boolean).join(' ');

  root.innerHTML = `
      <div class="yg-profile-edit-shell" role="dialog" aria-modal="true" aria-labelledby="yg-profile-edit-title">
        <aside class="yg-profile-edit-side">
          <div class="yg-profile-edit-eyebrow">Editor guiado</div>
          <div>
            <h2>Editar tu perfil sin volver al formulario largo.</h2>
            <p>Trabaja por bloques pequeños. Puedes revisar todo al final antes de guardar.</p>
          </div>
          <div class="yg-profile-edit-progress">
            <div class="yg-profile-edit-progress-meta">
              <span>Paso ${state.step + 1} de ${STEP_COUNT}</span>
              <span>${escapeHtml(state.displayName || state.email || 'Perfil Agro')}</span>
            </div>
            <div class="yg-profile-edit-track"><div class="yg-profile-edit-bar" style="width:${progress};"></div></div>
          </div>
          <ul class="yg-profile-edit-step-list">
            ${Array.from({ length: STEP_COUNT }).map((_, index) => {
    const itemMeta = getStepMeta(index);
    const stateClass = index === state.step ? 'is-active' : index < state.step ? 'is-complete' : '';
    return `
                  <li class="yg-profile-edit-step ${stateClass}">
                    <span class="yg-profile-edit-step-index">${index + 1}</span>
                    <div>
                      <span class="yg-profile-edit-step-title">${escapeHtml(itemMeta.sidebarTitle)}</span>
                      <span class="yg-profile-edit-step-desc">${escapeHtml(itemMeta.sidebarDescription)}</span>
                    </div>
                  </li>
                `;
  }).join('')}
          </ul>
          <p>${escapeHtml(stepMeta.helper)}</p>
        </aside>

        <section class="yg-profile-edit-card">
          <header>
            <p class="yg-profile-edit-kicker">${escapeHtml(stepMeta.kicker)}</p>
            <h3 id="yg-profile-edit-title">${escapeHtml(stepMeta.title)}</h3>
            <p>${escapeHtml(stepMeta.description)}</p>
          </header>

          <form class="yg-profile-edit-form" data-profile-edit-form>
            <div class="yg-profile-edit-body">${renderStepBody(state)}</div>
            <div class="yg-profile-edit-footer">
              <div class="${statusClass}" aria-live="polite">${escapeHtml(state.status || 'Tu perfil se guarda al final. Puedes revisar todo antes de aplicar cambios.')}</div>
              <div class="yg-profile-edit-actions">
                ${state.step > 0 ? `<button type="button" class="yg-profile-edit-btn yg-profile-edit-btn-ghost" data-action="back" ${state.isSubmitting ? 'disabled' : ''}>Atrás</button>` : ''}
                <button type="button" class="yg-profile-edit-btn yg-profile-edit-btn-secondary" data-action="close" ${state.isSubmitting ? 'disabled' : ''}>Cerrar</button>
                <button type="submit" class="yg-profile-edit-btn yg-profile-edit-btn-primary" ${state.isSubmitting ? 'disabled' : ''}>${state.step === STEP_COUNT - 1 ? (state.isSubmitting ? 'Guardando...' : 'Guardar perfil') : 'Continuar'}</button>
              </div>
            </div>
          </form>
        </section>
      </div>
    `;
}

function getFocusableControl(root) {
  return root.querySelector('[data-autofocus]') || root.querySelector('input, textarea, button');
}

export function openProfileEditWizard({ initialData = {}, onSave } = {}) {
  if (typeof onSave !== 'function') {
    throw new Error('openProfileEditWizard requiere onSave.');
  }

  if (activeWizard?.close) {
    activeWizard.close({ status: 'replaced' });
  }

  ensureStyles();

  const draftKey = buildDraftKey(initialData);
  const state = buildInitialState(initialData, readDraft(draftKey));
  let root = null;
  let resolvePromise = null;
  let previousBodyOverflow = '';

  const persistDraft = () => writeDraft(draftKey, serializeDraft(state));
  const rerender = () => {
    if (!root) return;
    render(root, state);
    const focusTarget = getFocusableControl(root);
    if (focusTarget && typeof focusTarget.focus === 'function') {
      requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
    }
  };
  const updateState = (partial = {}, { persist = true, rerenderUi = true } = {}) => {
    Object.assign(state, partial);
    if (persist) persistDraft();
    if (rerenderUi) rerender();
  };
  const cleanup = (payload = { status: 'cancelled' }) => {
    if (!root) return;
    root.remove();
    root = null;
    document.body.classList.remove('yg-profile-edit-lock');
    document.body.style.overflow = previousBodyOverflow;
    if (resolvePromise) resolvePromise(payload);
    activeWizard = null;
  };

  const handleAvatarUpload = (fileInput) => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      updateState({ status: 'Selecciona un archivo de imagen válido.', statusLevel: 'error' }, { persist: false });
      fileInput.value = '';
      return;
    }
    if (file.size > MAX_LOCAL_AVATAR_SIZE_BYTES) {
      updateState({ status: 'La imagen es muy grande. Máximo permitido: 2MB.', statusLevel: 'error' }, { persist: false });
      fileInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = normalizeText(reader.result);
      updateState({ avatarMode: 'local', avatarValue: dataUrl, avatarPreviewUrl: dataUrl, avatarUrlInput: '', status: 'Foto local lista. Se aplicará cuando guardes.', statusLevel: 'muted' });
    };
    reader.onerror = () => updateState({ status: 'No se pudo leer la imagen seleccionada.', statusLevel: 'error' }, { persist: false });
    reader.readAsDataURL(file);
  };

  root = document.createElement('div');
  root.className = 'yg-profile-edit-layer';
  previousBodyOverflow = document.body.style.overflow;
  document.body.classList.add('yg-profile-edit-lock');
  document.body.style.overflow = 'hidden';
  document.body.append(root);
  rerender();

  root.addEventListener('input', (event) => {
    const field = event.target?.dataset?.field;
    if (!field) return;
    if (field === 'avatarUrlInput') {
      const nextValue = normalizeText(event.target.value);
      updateState({ avatarMode: 'url', avatarValue: nextValue, avatarPreviewUrl: nextValue, avatarUrlInput: nextValue });
      return;
    }
    updateState({ [field]: event.target.value }, { rerenderUi: false });
  });

  root.addEventListener('change', (event) => {
    if (event.target?.matches('[data-avatar-upload]')) {
      handleAvatarUpload(event.target);
    }
  });

  root.addEventListener('click', (event) => {
    const action = event.target?.dataset?.action;
    if (!action) return;
    if (action === 'close') {
      cleanup({ status: 'cancelled' });
      return;
    }
    if (action === 'back') {
      updateState({ step: Math.max(0, state.step - 1), status: '', statusLevel: 'muted' });
      return;
    }
    if (action === 'clear-avatar') {
      updateState({ avatarMode: 'clear', avatarValue: '', avatarPreviewUrl: '', avatarUrlInput: '', status: 'Avatar limpiado. Puedes dejarlo así o cargar otra imagen.', statusLevel: 'muted' });
    }
  });

  root.addEventListener('submit', async (event) => {
    const form = root.querySelector('[data-profile-edit-form]');
    if (event.target !== form) return;
    event.preventDefault();

    const validationError = validateStep(state);
    if (validationError) {
      updateState({ status: validationError, statusLevel: 'error' }, { persist: false });
      return;
    }

    if (state.step < STEP_COUNT - 1) {
      updateState({ step: state.step + 1, status: '', statusLevel: 'muted' });
      return;
    }

    Object.assign(state, { isSubmitting: true, status: 'Guardando perfil...', statusLevel: 'loading' });
    rerender();

    try {
      const result = await onSave({
        displayName: normalizeText(state.displayName),
        farmName: normalizeText(state.farmName),
        locationText: normalizeText(state.locationText),
        notes: normalizeText(state.notes),
        phone: normalizeText(state.phone),
        whatsapp: normalizeText(state.whatsapp),
        instagram: normalizeText(state.instagram),
        facebook: normalizeText(state.facebook),
        avatarState: {
          mode: state.avatarMode,
          value: state.avatarMode === 'none' ? normalizeText(state.avatarPreviewUrl) : normalizeText(state.avatarValue)
        }
      });
      clearDraft(draftKey);
      cleanup({ status: 'saved', result });
    } catch (error) {
      Object.assign(state, { isSubmitting: false, status: error?.message || 'No se pudo guardar el perfil.', statusLevel: 'error' });
      rerender();
    }
  });

  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  activeWizard = { promise, close: cleanup };
  return promise;
}

window.ProfileEditWizard = {
  open: openProfileEditWizard
};

export default {
  openProfileEditWizard
};
