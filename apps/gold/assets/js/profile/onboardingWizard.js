import { logger } from '../utils/logger.js';
import {
  ONBOARDING_ACTIVITY_OPTIONS,
  ONBOARDING_ENTRY_OPTIONS,
  ONBOARDING_RELATION_OPTIONS,
  getOnboardingLabel
} from './onboardingManager.js';

const STYLE_ID = 'yg-onboarding-wizard-styles';
const DEFAULT_DRAFT_KEY = 'YG_ONBOARDING_DRAFT_V1';
const STEP_COUNT = 5;

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
    @keyframes yg-onb-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes yg-onb-slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes yg-onb-scaleIn {
      from { opacity: 0; transform: scale(0.97); }
      to   { opacity: 1; transform: scale(1); }
    }

    @keyframes yg-onb-barPulse {
      0%, 100% { box-shadow: 0 0 0 rgba(200, 167, 82, 0); }
      50%      { box-shadow: 0 0 10px rgba(200, 167, 82, 0.3); }
    }

    .yg-onboarding-lock {
      overflow: hidden;
    }

    .yg-onboarding-layer {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal, 1050);
      padding: 20px;
      display: flex;
      align-items: stretch;
      justify-content: center;
      overflow-y: auto;
      background:
        radial-gradient(circle at 15% 10%, rgba(200, 167, 82, 0.14), transparent 32%),
        radial-gradient(circle at 85% 90%, rgba(200, 167, 82, 0.10), transparent 28%),
        rgba(10, 10, 10, 0.94);
      backdrop-filter: blur(22px);
      -webkit-backdrop-filter: blur(22px);
      animation: yg-onb-fadeIn 200ms ease both;
    }

    .yg-onboarding-shell {
      width: min(1080px, 100%);
      min-height: min(740px, calc(100vh - 40px));
      display: grid;
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
      gap: 18px;
      align-items: stretch;
      animation: yg-onb-scaleIn 200ms ease both;
    }

    .yg-onboarding-side,
    .yg-onboarding-card {
      border: 1px solid rgba(200, 167, 82, 0.16);
      border-radius: 28px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
        var(--bg-primary, #0a0a0a);
      box-shadow:
        0 24px 64px rgba(0, 0, 0, 0.36),
        0 0 0 1px rgba(200, 167, 82, 0.06);
    }

    .yg-onboarding-side {
      padding: 28px 26px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
      animation: yg-onb-slideUp 200ms ease both;
      animation-delay: 60ms;
    }

    .yg-onboarding-side::after {
      content: '';
      position: absolute;
      inset: auto -50px -50px auto;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(200, 167, 82, 0.20), transparent 65%);
      pointer-events: none;
    }

    .yg-onboarding-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(200, 167, 82, 0.10);
      color: var(--primary-light, #E5C158);
      font: 600 0.84rem/1 var(--font-heading, 'Rajdhani'), sans-serif;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      width: fit-content;
    }

    .yg-onboarding-side h2 {
      margin: 18px 0 10px;
      color: #fff4dc;
      font: 700 clamp(1.8rem, 3.8vw, 2.5rem)/1.06 var(--font-display, 'Orbitron'), sans-serif;
      text-wrap: balance;
    }

    .yg-onboarding-side p {
      margin: 0;
      color: rgba(255, 255, 255, 0.72);
      font: 500 1rem/1.55 var(--font-heading, 'Rajdhani'), sans-serif;
    }

    .yg-onboarding-progress-wrap {
      margin-top: 26px;
    }

    .yg-onboarding-progress-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      color: rgba(255, 255, 255, 0.8);
      font: 600 0.92rem/1 var(--font-heading, 'Rajdhani'), sans-serif;
    }

    .yg-onboarding-progress-track {
      width: 100%;
      height: 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.07);
      overflow: hidden;
    }

    .yg-onboarding-progress-bar {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--primary-dark, #8e7433), var(--primary, #c8a752) 55%, #f5deb3);
      transition: width 180ms ease;
      animation: yg-onb-barPulse 2.4s ease-in-out infinite;
    }

    .yg-onboarding-step-list {
      display: grid;
      gap: 10px;
      padding: 0;
      margin: 24px 0 0;
      list-style: none;
    }

    .yg-onboarding-step-item {
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr);
      gap: 12px;
      align-items: center;
      padding: 13px 15px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid transparent;
      transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
    }

    .yg-onboarding-step-item.is-active {
      border-color: rgba(200, 167, 82, 0.5);
      background: rgba(200, 167, 82, 0.10);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(200, 167, 82, 0.08);
    }

    .yg-onboarding-step-item.is-complete {
      border-color: rgba(200, 167, 82, 0.24);
    }

    .yg-onboarding-step-index {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.07);
      color: #ffffff;
      font: 700 0.94rem/1 var(--font-display, 'Orbitron'), sans-serif;
      transition: background 180ms ease, color 180ms ease;
    }

    .yg-onboarding-step-item.is-active .yg-onboarding-step-index,
    .yg-onboarding-step-item.is-complete .yg-onboarding-step-index {
      background: linear-gradient(135deg, var(--primary-dark, #8e7433), var(--primary, #c8a752));
      color: #111;
    }

    .yg-onboarding-step-title {
      display: block;
      margin-bottom: 3px;
      color: #f7f4ec;
      font: 700 1rem/1.12 var(--font-heading, 'Rajdhani'), sans-serif;
    }

    .yg-onboarding-step-desc {
      color: rgba(255, 255, 255, 0.62);
      font: 500 0.93rem/1.35 var(--font-heading, 'Rajdhani'), sans-serif;
    }

    .yg-onboarding-card {
      padding: 30px;
      display: flex;
      flex-direction: column;
      min-height: 0;
      animation: yg-onb-slideUp 200ms ease both;
      animation-delay: 100ms;
    }

    .yg-onboarding-card header {
      margin-bottom: 20px;
    }

    .yg-onboarding-kicker {
      margin: 0 0 8px;
      color: var(--primary, #c8a752);
      font: 600 0.88rem/1 var(--font-heading, 'Rajdhani'), sans-serif;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .yg-onboarding-card h3 {
      margin: 0 0 8px;
      color: #fffaf0;
      font: 700 clamp(1.5rem, 2.8vw, 2.1rem)/1.08 var(--font-display, 'Orbitron'), sans-serif;
      text-wrap: balance;
    }

    .yg-onboarding-card p {
      margin: 0;
      color: rgba(255, 255, 255, 0.70);
      font: 500 1rem/1.55 var(--font-heading, 'Rajdhani'), sans-serif;
    }

    .yg-onboarding-form {
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1;
    }

    .yg-onboarding-body {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding-right: 4px;
      animation: yg-onb-slideUp 180ms ease both;
    }

    .yg-onboarding-stack {
      display: grid;
      gap: 18px;
    }

    .yg-onboarding-field {
      display: grid;
      gap: 10px;
    }

    .yg-onboarding-field label,
    .yg-onboarding-label {
      color: rgba(255, 255, 255, 0.9);
      font: 700 0.96rem/1.1 var(--font-heading, 'Rajdhani'), sans-serif;
    }

    .yg-onboarding-input {
      width: 100%;
      padding: 16px 18px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.09);
      background: rgba(255, 255, 255, 0.03);
      color: #fff;
      font: 600 1rem/1.2 var(--font-heading, 'Rajdhani'), sans-serif;
      transition: border-color 180ms ease, transform 160ms ease, background 180ms ease, box-shadow 180ms ease;
    }

    .yg-onboarding-input:focus {
      outline: none;
      border-color: rgba(200, 167, 82, 0.72);
      background: rgba(255, 255, 255, 0.045);
      transform: translateY(-1px);
      box-shadow: 0 0 0 3px rgba(200, 167, 82, 0.10);
    }

    .yg-onboarding-help {
      padding: 14px 18px;
      border-radius: 18px;
      background: rgba(200, 167, 82, 0.06);
      border: 1px solid rgba(200, 167, 82, 0.13);
      color: #f3e4ba;
      font: 600 0.96rem/1.48 var(--font-heading, 'Rajdhani'), sans-serif;
    }

    .yg-onboarding-option-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .yg-onboarding-option {
      width: 100%;
      text-align: left;
      padding: 18px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.07);
      background: rgba(255, 255, 255, 0.025);
      color: #fff;
      cursor: pointer;
      transition: transform 160ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
    }

    .yg-onboarding-option:hover,
    .yg-onboarding-option:focus-visible {
      outline: none;
      transform: translateY(-2px);
      border-color: rgba(200, 167, 82, 0.50);
      background: rgba(200, 167, 82, 0.04);
      box-shadow:
        0 14px 28px rgba(0, 0, 0, 0.22),
        0 0 18px rgba(200, 167, 82, 0.06);
    }

    .yg-onboarding-option.is-selected {
      border-color: rgba(200, 167, 82, 0.72);
      background: linear-gradient(180deg, rgba(200, 167, 82, 0.14), rgba(255, 255, 255, 0.03));
      box-shadow:
        0 16px 30px rgba(0, 0, 0, 0.24),
        0 0 24px rgba(200, 167, 82, 0.10);
    }

    .yg-onboarding-option-title {
      display: block;
      margin-bottom: 6px;
      color: #fffaf0;
      font: 700 1.02rem/1.12 var(--font-heading, 'Rajdhani'), sans-serif;
    }

    .yg-onboarding-option-desc {
      display: block;
      color: rgba(255, 255, 255, 0.65);
      font: 500 0.94rem/1.38 var(--font-heading, 'Rajdhani'), sans-serif;
    }

    .yg-onboarding-summary {
      display: grid;
      gap: 12px;
    }

    .yg-onboarding-summary-row {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      padding: 14px 18px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: border-color 160ms ease, background 160ms ease;
    }

    .yg-onboarding-summary-row:hover {
      border-color: rgba(200, 167, 82, 0.16);
      background: rgba(255, 255, 255, 0.035);
    }

    .yg-onboarding-summary-label {
      color: rgba(255, 255, 255, 0.62);
      font: 600 0.92rem/1.2 var(--font-heading, 'Rajdhani'), sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .yg-onboarding-summary-value {
      color: #fff;
      font: 700 1rem/1.2 var(--font-heading, 'Rajdhani'), sans-serif;
      text-align: right;
    }

    .yg-onboarding-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-top: 20px;
      margin-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
    }

    .yg-onboarding-status {
      min-height: 24px;
      color: rgba(255, 255, 255, 0.70);
      font: 600 0.96rem/1.2 var(--font-heading, 'Rajdhani'), sans-serif;
    }

    .yg-onboarding-status.is-error {
      color: var(--danger, #ffb59f);
    }

    .yg-onboarding-status.is-loading {
      color: #f5deb3;
    }

    .yg-onboarding-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    .yg-onboarding-btn {
      border: 0;
      border-radius: 999px;
      padding: 13px 22px;
      cursor: pointer;
      font: 700 0.96rem/1 var(--font-heading, 'Rajdhani'), sans-serif;
      letter-spacing: 0.03em;
      transition: transform 160ms ease, opacity 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }

    .yg-onboarding-btn:hover,
    .yg-onboarding-btn:focus-visible {
      outline: none;
      transform: translateY(-1px);
    }

    .yg-onboarding-btn:active {
      transform: translateY(0);
    }

    .yg-onboarding-btn:disabled {
      opacity: 0.55;
      cursor: wait;
      transform: none;
    }

    .yg-onboarding-btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .yg-onboarding-btn-secondary:hover,
    .yg-onboarding-btn-secondary:focus-visible {
      background: rgba(255, 255, 255, 0.13);
    }

    .yg-onboarding-btn-ghost {
      background: transparent;
      color: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.10);
    }

    .yg-onboarding-btn-ghost:hover,
    .yg-onboarding-btn-ghost:focus-visible {
      border-color: rgba(255, 255, 255, 0.20);
      background: rgba(255, 255, 255, 0.04);
    }

    .yg-onboarding-btn-primary {
      background: linear-gradient(90deg, var(--primary-dark, #8e7433), var(--primary, #c8a752) 52%, #f4ddb1);
      color: #121212;
      box-shadow: 0 12px 24px rgba(200, 167, 82, 0.18);
    }

    .yg-onboarding-btn-primary:hover,
    .yg-onboarding-btn-primary:focus-visible {
      box-shadow:
        0 16px 32px rgba(200, 167, 82, 0.24),
        0 0 20px rgba(200, 167, 82, 0.12);
    }

    @media (max-width: 900px), (max-height: 820px) {
      .yg-onboarding-layer {
        padding: 12px;
        align-items: center;
      }

      .yg-onboarding-shell {
        min-height: auto;
        margin-block: auto;
      }
    }

    @media (max-width: 900px) {
      .yg-onboarding-shell {
        grid-template-columns: 1fr;
      }

      .yg-onboarding-side,
      .yg-onboarding-card {
        border-radius: 24px;
      }

      .yg-onboarding-side h2 {
        font-size: clamp(1.5rem, 5vw, 2rem);
      }

      .yg-onboarding-card h3 {
        font-size: clamp(1.3rem, 4.5vw, 1.8rem);
      }
    }

    @media (max-width: 640px) {
      .yg-onboarding-layer {
        padding: 8px;
      }

      .yg-onboarding-side,
      .yg-onboarding-card {
        padding: 20px 18px;
        border-radius: 22px;
      }

      .yg-onboarding-option-grid {
        grid-template-columns: 1fr;
      }

      .yg-onboarding-option {
        padding: 16px;
      }

      .yg-onboarding-input {
        padding: 14px 16px;
      }

      .yg-onboarding-summary-row,
      .yg-onboarding-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .yg-onboarding-summary-value {
        text-align: left;
      }

      .yg-onboarding-actions {
        justify-content: stretch;
      }

      .yg-onboarding-btn {
        width: 100%;
        padding: 14px 20px;
        text-align: center;
      }

      .yg-onboarding-step-item {
        padding: 11px 13px;
      }
    }

    @media (max-width: 400px) {
      .yg-onboarding-layer {
        padding: 4px;
      }

      .yg-onboarding-side,
      .yg-onboarding-card {
        padding: 16px 14px;
        border-radius: 18px;
      }

      .yg-onboarding-side h2 {
        font-size: 1.35rem;
      }

      .yg-onboarding-card h3 {
        font-size: 1.2rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .yg-onboarding-layer,
      .yg-onboarding-shell,
      .yg-onboarding-side,
      .yg-onboarding-card,
      .yg-onboarding-body {
        animation: none !important;
      }

      .yg-onboarding-progress-bar {
        animation: none !important;
        transition: none !important;
      }

      .yg-onboarding-option,
      .yg-onboarding-step-item,
      .yg-onboarding-btn,
      .yg-onboarding-input,
      .yg-onboarding-summary-row,
      .yg-onboarding-step-index {
        transition: none !important;
      }
    }
  `;

  document.head.append(style);
}

function getStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    logger.warn('[OnboardingWizard] localStorage no disponible:', error.message);
    return null;
  }
}

function readDraft(draftKey) {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(draftKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn('[OnboardingWizard] No se pudo leer draft:', error.message);
    return null;
  }
}

function writeDraft(draftKey, payload) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(draftKey, JSON.stringify(payload));
  } catch (error) {
    logger.warn('[OnboardingWizard] No se pudo guardar draft:', error.message);
  }
}

function clearDraft(draftKey) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(draftKey);
  } catch (error) {
    logger.warn('[OnboardingWizard] No se pudo limpiar draft:', error.message);
  }
}

function normalizeText(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function buildInitialState(initialData = {}) {
  return {
    step: 0,
    displayName: normalizeText(initialData.displayName, 80),
    agroRelation: initialData.agroRelation || '',
    farmName: normalizeText(initialData.farmName, 120),
    mainActivity: initialData.mainActivity || '',
    entryPreference: initialData.entryPreference || '',
    isSubmitting: false,
    error: ''
  };
}

function mergeDraft(baseState, draft) {
  if (!draft || typeof draft !== 'object') return baseState;

  return {
    ...baseState,
    displayName: normalizeText(draft.displayName || baseState.displayName, 80),
    agroRelation: draft.agroRelation || baseState.agroRelation,
    farmName: normalizeText(draft.farmName || baseState.farmName, 120),
    mainActivity: draft.mainActivity || baseState.mainActivity,
    entryPreference: draft.entryPreference || baseState.entryPreference,
    step: Number.isInteger(draft.step) ? Math.min(Math.max(draft.step, 0), STEP_COUNT - 1) : baseState.step
  };
}

function getStepList() {
  return [
    {
      title: 'Tu nombre visible',
      description: 'Cómo quieres que te llamemos dentro de Agro.'
    },
    {
      title: 'Tu relación con Agro',
      description: 'Para ajustar el tono y la prioridad inicial.'
    },
    {
      title: 'Tu contexto base',
      description: 'Finca o actividad principal, según tu caso.'
    },
    {
      title: 'Tu primer enfoque',
      description: 'Qué quieres resolver antes al entrar.'
    },
    {
      title: 'Confirmación',
      description: 'Revisamos el contexto antes de guardarlo.'
    }
  ];
}

function getStepMeta(step, state) {
  const displayName = state.displayName || 'tu experiencia';
  const relationName = getOnboardingLabel('relation', state.agroRelation) || 'tu punto de partida';

  const meta = [
    {
      kicker: 'Paso 1',
      title: '¿Cómo quieres que te llamemos?',
      description: 'Usaremos este nombre para que el dashboard se sienta cercano desde el primer acceso.',
      helper: displayName
        ? `Perfecto. Así podremos saludarte como ${displayName}.`
        : 'No buscamos un alias frío, sino la forma natural de dirigimos a ti.'
    },
    {
      kicker: 'Paso 2',
      title: '¿Cómo llegas hoy a Agro?',
      description: 'Esta decisión define el tono del dashboard y qué tipo de ayuda priorizamos al principio.',
      helper: displayName
        ? `${displayName}, elige la opción que más se parezca a tu momento real.`
        : 'Elige la opción que mejor describa tu momento actual.'
    },
    {
      kicker: 'Paso 3',
      title: state.agroRelation === 'exploring'
        ? '¿Qué parte te interesa más explorar?'
        : 'Cuéntanos tu contexto base',
      description: state.agroRelation === 'exploring'
        ? 'Con una referencia corta basta. Lo importante es guiarte mejor sin llenar todo de campos.'
        : 'Solo necesitamos una referencia ligera para ordenar mejor tu entrada a la plataforma.',
      helper: relationName
        ? `Tomaremos ${relationName.toLowerCase()} como base para personalizar tu arranque.`
        : 'Esto nos ayuda a reducir fricción desde el primer día.'
    },
    {
      kicker: 'Paso 4',
      title: '¿Qué quieres hacer primero?',
      description: 'Elegimos la intención inicial para que el dashboard te muestre una entrada más útil.',
      helper: 'Podrás cambiar este contexto más adelante sin rehacer todo el onboarding.'
    },
    {
      kicker: 'Paso 5',
      title: 'Revisemos tu configuración inicial',
      description: 'Si esto se parece a tu realidad actual, guardamos y te dejamos entrar con contexto.',
      helper: 'Nada de esto te bloquea después: solo nos ayuda a no recibirte con una pantalla fría.'
    }
  ];

  return meta[step] || meta[0];
}

function validateStep(state, step) {
  if (step === 0 && normalizeText(state.displayName, 80).length < 2) {
    return 'Escribe un nombre visible de al menos 2 caracteres.';
  }

  if (step === 1 && !state.agroRelation) {
    return 'Selecciona cómo te relacionas con Agro.';
  }

  if (step === 2 && !state.mainActivity) {
    return 'Selecciona la actividad que más te interesa por ahora.';
  }

  if (step === 3 && !state.entryPreference) {
    return 'Elige cómo quieres arrancar cuando entres al dashboard.';
  }

  return '';
}

function buildPayload(state) {
  return {
    displayName: normalizeText(state.displayName, 80),
    agroRelation: state.agroRelation || '',
    farmName: normalizeText(state.farmName, 120),
    mainActivity: state.mainActivity || '',
    entryPreference: state.entryPreference || '',
    onboardingCompleted: true
  };
}

function renderOptionGrid(group, options, selectedValue) {
  return `
    <div class="yg-onboarding-option-grid">
      ${options.map((option) => `
        <button
          type="button"
          class="yg-onboarding-option ${selectedValue === option.value ? 'is-selected' : ''}"
          data-select-group="${group}"
          data-select-value="${escapeHtml(option.value)}"
        >
          <span class="yg-onboarding-option-title">${escapeHtml(option.label)}</span>
          <span class="yg-onboarding-option-desc">${escapeHtml(option.description)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderSummary(state) {
  const rows = [
    ['Nombre visible', state.displayName || 'Sin definir'],
    ['Relación con Agro', getOnboardingLabel('relation', state.agroRelation) || 'Sin definir'],
    ['Actividad principal', getOnboardingLabel('activity', state.mainActivity) || 'Sin definir'],
    ['Proyecto o finca', state.farmName || 'Lo definiremos después'],
    ['Entrada inicial', getOnboardingLabel('entry', state.entryPreference) || 'Sin definir']
  ];

  return `
    <div class="yg-onboarding-summary">
      ${rows.map(([label, value]) => `
        <div class="yg-onboarding-summary-row">
          <span class="yg-onboarding-summary-label">${escapeHtml(label)}</span>
          <span class="yg-onboarding-summary-value">${escapeHtml(value)}</span>
        </div>
      `).join('')}
      <div class="yg-onboarding-help">
        Guardaremos este contexto para que el dashboard y tus próximas entradas se sientan más claras desde ya.
      </div>
    </div>
  `;
}

function renderStepBody(state) {
  if (state.step === 0) {
    return `
      <div class="yg-onboarding-stack">
        <div class="yg-onboarding-field">
          <label for="yg-onboarding-display-name">Nombre visible</label>
          <input
            id="yg-onboarding-display-name"
            class="yg-onboarding-input"
            name="displayName"
            maxlength="80"
            placeholder="Ej. Yerik, Don Julio, La Finca El Sol"
            value="${escapeHtml(state.displayName)}"
            autocomplete="given-name"
          >
        </div>
        <div class="yg-onboarding-help">
          Este nombre se usa para saludarte mejor en el dashboard. No tiene que coincidir con un username único.
        </div>
      </div>
    `;
  }

  if (state.step === 1) {
    return renderOptionGrid('agroRelation', ONBOARDING_RELATION_OPTIONS, state.agroRelation);
  }

  if (state.step === 2) {
    const farmLabel = state.agroRelation === 'exploring'
      ? 'Proyecto o referencia (opcional)'
      : 'Nombre de la finca o proyecto (opcional)';
    const farmPlaceholder = state.agroRelation === 'exploring'
      ? 'Ej. Estoy evaluando mi primera finca'
      : 'Ej. Finca El Progreso';

    return `
      <div class="yg-onboarding-stack">
        <div class="yg-onboarding-field">
          <label for="yg-onboarding-farm-name">${escapeHtml(farmLabel)}</label>
          <input
            id="yg-onboarding-farm-name"
            class="yg-onboarding-input"
            name="farmName"
            maxlength="120"
            placeholder="${escapeHtml(farmPlaceholder)}"
            value="${escapeHtml(state.farmName)}"
            autocomplete="organization"
          >
        </div>
        <div class="yg-onboarding-field">
          <span class="yg-onboarding-label">Actividad principal</span>
          ${renderOptionGrid('mainActivity', ONBOARDING_ACTIVITY_OPTIONS, state.mainActivity)}
        </div>
      </div>
    `;
  }

  if (state.step === 3) {
    return renderOptionGrid('entryPreference', ONBOARDING_ENTRY_OPTIONS, state.entryPreference);
  }

  return renderSummary(state);
}

function getFocusSelector(step) {
  if (step === 0) return '#yg-onboarding-display-name';
  if (step === 2) return '#yg-onboarding-farm-name';
  return '[data-select-group]';
}

export function openOnboardingWizard({
  initialData = {},
  draftKey = DEFAULT_DRAFT_KEY,
  onSubmit,
  onRequestLogout
} = {}) {
  if (activeWizard?.promise) {
    return activeWizard.promise;
  }

  ensureStyles();

  let state = mergeDraft(buildInitialState(initialData), readDraft(draftKey));
  let root = null;
  let resolvePromise = null;
  let previousBodyOverflow = '';

  const persistDraft = () => {
    writeDraft(draftKey, {
      step: state.step,
      displayName: state.displayName,
      agroRelation: state.agroRelation,
      farmName: state.farmName,
      mainActivity: state.mainActivity,
      entryPreference: state.entryPreference
    });
  };

  const cleanup = () => {
    if (root?.parentNode) {
      root.parentNode.removeChild(root);
    }
    document.body.classList.remove('yg-onboarding-lock');
    document.body.style.overflow = previousBodyOverflow;
    activeWizard = null;
  };

  const focusCurrentControl = () => {
    const selector = getFocusSelector(state.step);
    if (!selector) return;

    requestAnimationFrame(() => {
      const target = root?.querySelector(selector);
      target?.focus?.();
    });
  };

  const setState = (partial) => {
    state = {
      ...state,
      ...partial
    };
    persistDraft();
    render();
  };

  const submitWizard = async () => {
    const stepError = validateStep(state, state.step);
    if (stepError) {
      setState({ error: stepError });
      return;
    }

    if (typeof onSubmit !== 'function') {
      logger.error('[OnboardingWizard] onSubmit no fue provisto');
      setState({ error: 'No se pudo conectar el guardado del onboarding.' });
      return;
    }

    state = { ...state, isSubmitting: true, error: '' };
    render();

    try {
      const result = await onSubmit(buildPayload(state));
      if (!result?.success) {
        setState({
          isSubmitting: false,
          error: result?.error || 'No pudimos guardar tu configuración inicial.'
        });
        return;
      }

      clearDraft(draftKey);
      cleanup();
      resolvePromise(result);
    } catch (error) {
      logger.error('[OnboardingWizard] Error guardando onboarding:', error.message);
      setState({
        isSubmitting: false,
        error: error.message || 'No pudimos guardar tu configuración inicial.'
      });
    }
  };

  const handlePrimaryAction = async () => {
    const stepError = validateStep(state, state.step);
    if (stepError) {
      setState({ error: stepError });
      return;
    }

    if (state.step === STEP_COUNT - 1) {
      await submitWizard();
      return;
    }

    setState({
      step: Math.min(state.step + 1, STEP_COUNT - 1),
      error: ''
    });
  };

  const handleBack = () => {
    if (state.step === 0) return;
    setState({
      step: Math.max(state.step - 1, 0),
      error: ''
    });
  };

  const attachEvents = () => {
    const form = root.querySelector('[data-onboarding-form]');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await handlePrimaryAction();
    });

    root.querySelector('[name="displayName"]')?.addEventListener('input', (event) => {
      setState({
        displayName: normalizeText(event.target.value, 80),
        error: ''
      });
    });

    root.querySelector('[name="farmName"]')?.addEventListener('input', (event) => {
      setState({
        farmName: normalizeText(event.target.value, 120),
        error: ''
      });
    });

    root.querySelectorAll('[data-select-group]').forEach((button) => {
      button.addEventListener('click', () => {
        const group = button.getAttribute('data-select-group');
        const value = button.getAttribute('data-select-value') || '';
        if (!group) return;

        setState({
          [group]: value,
          error: ''
        });
      });
    });

    root.querySelector('[data-action="back"]')?.addEventListener('click', handleBack);
    root.querySelector('[data-action="logout"]')?.addEventListener('click', async () => {
      if (state.isSubmitting || typeof onRequestLogout !== 'function') return;
      await onRequestLogout();
    });
  };

  const render = () => {
    const stepMeta = getStepMeta(state.step, state);
    const stepList = getStepList();
    const progress = `${((state.step + 1) / STEP_COUNT) * 100}%`;
    const statusClass = state.error
      ? 'yg-onboarding-status is-error'
      : state.isSubmitting
        ? 'yg-onboarding-status is-loading'
        : 'yg-onboarding-status';
    const statusText = state.error || (state.isSubmitting ? 'Guardando tu contexto...' : 'Paso a paso. Sin ruido ni campos de más.');
    const primaryLabel = state.step === STEP_COUNT - 1
      ? (state.isSubmitting ? 'Guardando...' : 'Guardar y entrar')
      : 'Continuar';

    root.innerHTML = `
      <div class="yg-onboarding-shell" role="dialog" aria-modal="true" aria-labelledby="yg-onboarding-title">
        <aside class="yg-onboarding-side">
          <div>
            <span class="yg-onboarding-eyebrow">Primer acceso guiado</span>
            <h2>Vamos a dejar Agro listo para ti.</h2>
            <p>
              Queremos que el primer acceso se sienta claro, útil y humano.
              Por eso te pedimos decisiones pequeñas en vez de una pantalla fría.
            </p>
            <div class="yg-onboarding-progress-wrap">
              <div class="yg-onboarding-progress-meta">
                <span>Paso ${state.step + 1} de ${STEP_COUNT}</span>
                <span>${state.displayName ? escapeHtml(state.displayName) : 'Configuración inicial'}</span>
              </div>
              <div class="yg-onboarding-progress-track">
                <div class="yg-onboarding-progress-bar" style="width: ${progress};"></div>
              </div>
            </div>
            <ul class="yg-onboarding-step-list">
              ${stepList.map((stepItem, index) => {
      const stateClass = index === state.step
        ? 'is-active'
        : index < state.step
          ? 'is-complete'
          : '';

      return `
                  <li class="yg-onboarding-step-item ${stateClass}">
                    <span class="yg-onboarding-step-index">${index + 1}</span>
                    <div>
                      <span class="yg-onboarding-step-title">${escapeHtml(stepItem.title)}</span>
                      <span class="yg-onboarding-step-desc">${escapeHtml(stepItem.description)}</span>
                    </div>
                  </li>
                `;
    }).join('')}
            </ul>
          </div>
          <p>
            ${escapeHtml(stepMeta.helper)}
          </p>
        </aside>

        <section class="yg-onboarding-card">
          <header>
            <p class="yg-onboarding-kicker">${escapeHtml(stepMeta.kicker)}</p>
            <h3 id="yg-onboarding-title">${escapeHtml(stepMeta.title)}</h3>
            <p>${escapeHtml(stepMeta.description)}</p>
          </header>

          <form class="yg-onboarding-form" data-onboarding-form>
            <div class="yg-onboarding-body">
              ${renderStepBody(state)}
            </div>

            <div class="yg-onboarding-footer">
              <div class="${statusClass}" aria-live="polite">${escapeHtml(statusText)}</div>
              <div class="yg-onboarding-actions">
                ${state.step > 0 ? `
                  <button type="button" class="yg-onboarding-btn yg-onboarding-btn-ghost" data-action="back" ${state.isSubmitting ? 'disabled' : ''}>
                    Atrás
                  </button>
                ` : ''}
                ${typeof onRequestLogout === 'function' ? `
                  <button type="button" class="yg-onboarding-btn yg-onboarding-btn-secondary" data-action="logout" ${state.isSubmitting ? 'disabled' : ''}>
                    Cerrar sesión
                  </button>
                ` : ''}
                <button type="submit" class="yg-onboarding-btn yg-onboarding-btn-primary" ${state.isSubmitting ? 'disabled' : ''}>
                  ${escapeHtml(primaryLabel)}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    `;

    attachEvents();
    focusCurrentControl();
  };

  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  root = document.createElement('div');
  root.className = 'yg-onboarding-layer';
  previousBodyOverflow = document.body.style.overflow;
  document.body.classList.add('yg-onboarding-lock');
  document.body.style.overflow = 'hidden';
  document.body.append(root);
  render();

  activeWizard = {
    promise,
    close: cleanup
  };

  return promise;
}

window.OnboardingWizard = {
  open: openOnboardingWizard
};

export default {
  openOnboardingWizard
};
