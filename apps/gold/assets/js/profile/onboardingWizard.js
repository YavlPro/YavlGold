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

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* ── DNA V10 Tokens (local fallbacks) ── */
    .yg-onboarding-layer {
      --ob-gold-1: var(--v10-gold-1, #2a2218);
      --ob-gold-2: var(--v10-gold-2, #3a3228);
      --ob-gold-3: var(--v10-gold-3, #6b5a3e);
      --ob-gold-4: var(--v10-gold-4, #C8A752);
      --ob-gold-5: var(--v10-gold-5, #E8D48B);
      --ob-gold-prestige: var(--v10-gold-prestige, #E5D5A0);
      --ob-bg-0: var(--v10-bg-0, #050505);
      --ob-bg-1: var(--v10-bg-1, #0a0a0a);
      --ob-bg-2: var(--v10-bg-2, #0B0C0F);
      --ob-bg-3: var(--v10-bg-3, #111113);
      --ob-bg-4: var(--v10-bg-4, #1a1a1f);
      --ob-text-primary: var(--v10-text-primary, #ffffff);
      --ob-text-secondary: var(--v10-text-secondary, #cccccc);
      --ob-text-muted: var(--v10-text-muted, #94A3B8);
      --ob-border-neutral: var(--v10-border-neutral, rgba(255,255,255,0.08));
      --ob-border-gold: var(--v10-border-gold, rgba(200,167,82,0.25));
      --ob-border-prestige: var(--v10-border-prestige, rgba(229,213,160,0.18));
      --ob-shadow-gold-sm: var(--v10-shadow-gold-sm, 0 2px 10px rgba(200,167,82,0.15));
      --ob-shadow-gold-md: var(--v10-shadow-gold-md, 0 5px 20px rgba(200,167,82,0.25));
      --ob-shadow-gold-lg: var(--v10-shadow-gold-lg, 0 10px 40px rgba(200,167,82,0.35));
      --ob-shadow-metallic: var(--v10-shadow-metallic, 0 4px 20px rgba(200,167,82,0.30), 0 0 40px rgba(200,167,82,0.08));
      --ob-glass-bg: var(--v10-glass-bg, rgba(17, 17, 17, 0.85));
      --ob-metallic-linear: linear-gradient(135deg, var(--ob-gold-2), var(--ob-gold-4), var(--ob-gold-5), var(--ob-gold-4));
      --ob-metallic-text: linear-gradient(135deg, var(--ob-gold-5), var(--ob-gold-4), var(--ob-gold-3), var(--ob-gold-4), var(--ob-gold-5));
      --ob-metallic-btn: linear-gradient(135deg, var(--ob-gold-3), var(--ob-gold-4) 40%, var(--ob-gold-5) 60%, var(--ob-gold-4));
      --ob-metallic-border: linear-gradient(90deg, transparent, var(--ob-gold-4), transparent);
      --ob-metallic-conic: conic-gradient(from 0deg, var(--ob-gold-2), var(--ob-gold-3), var(--ob-gold-4), var(--ob-gold-5), var(--ob-gold-4), var(--ob-gold-3), var(--ob-gold-2));
    }

    /* ── DNA V10 Keyframes ── */
    @keyframes yg-onb-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes yg-onb-slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes yg-onb-scaleIn {
      from { opacity: 0; transform: scale(0.96); }
      to   { opacity: 1; transform: scale(1); }
    }

    @keyframes yg-onb-metallicShift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    @keyframes yg-onb-borderShimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes yg-onb-pulseGlow {
      0%, 100% { box-shadow: 0 0 8px rgba(200,167,82,0.08); }
      50%      { box-shadow: 0 0 22px rgba(200,167,82,0.22); }
    }

    /* ── Lock ── */
    .yg-onboarding-lock {
      overflow: hidden;
    }

    /* ── Layer (backdrop) ── */
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
        radial-gradient(circle at 15% 10%, rgba(200,167,82,0.12), transparent 32%),
        radial-gradient(circle at 85% 90%, rgba(200,167,82,0.08), transparent 28%),
        var(--ob-bg-0);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      animation: yg-onb-fadeIn 220ms ease both;
    }

    /* ── Shell ── */
    .yg-onboarding-shell {
      width: min(1080px, 100%);
      min-height: min(740px, calc(100vh - 40px));
      display: grid;
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
      gap: 18px;
      align-items: stretch;
      animation: yg-onb-scaleIn 220ms ease both;
    }

    /* ── Panels (side + card) ── */
    .yg-onboarding-side,
    .yg-onboarding-card {
      border: 1px solid var(--ob-border-gold);
      border-radius: var(--radius-xl, 24px);
      background: var(--ob-glass-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: var(--ob-shadow-gold-md);
      position: relative;
      overflow: hidden;
    }

    .yg-onboarding-side::before,
    .yg-onboarding-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--ob-metallic-border);
      background-size: 200% 100%;
      animation: yg-onb-borderShimmer 3s linear infinite;
    }

    /* ── Side panel ── */
    .yg-onboarding-side {
      padding: 28px 26px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      animation: yg-onb-slideUp 220ms ease both;
      animation-delay: 60ms;
    }

    .yg-onboarding-side::after {
      content: '';
      position: absolute;
      inset: auto -50px -50px auto;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(200,167,82,0.14), transparent 65%);
      pointer-events: none;
    }

    /* ── Eyebrow badge ── */
    .yg-onboarding-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: var(--radius-pill, 9999px);
      background: rgba(200,167,82,0.10);
      border: 1px solid var(--ob-border-prestige);
      color: var(--ob-gold-prestige);
      font: 700 0.84rem/1 'Rajdhani', sans-serif;
      letter-spacing: 0.10em;
      text-transform: uppercase;
      width: fit-content;
    }

    /* ── Side heading (metallic text §3) ── */
    .yg-onboarding-side h2 {
      margin: 18px 0 10px;
      font: 900 clamp(1.8rem, 3.8vw, 2.5rem)/1.06 'Orbitron', sans-serif;
      text-wrap: balance;
      background: var(--ob-metallic-text);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: yg-onb-metallicShift 6s ease-in-out infinite;
    }

    .yg-onboarding-side p {
      margin: 0;
      color: var(--ob-text-secondary);
      font: 500 1rem/1.55 'Rajdhani', sans-serif;
    }

    /* ── Progress ── */
    .yg-onboarding-progress-wrap {
      margin-top: 26px;
    }

    .yg-onboarding-progress-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      color: var(--ob-text-secondary);
      font: 600 0.92rem/1 'Rajdhani', sans-serif;
    }

    .yg-onboarding-progress-track {
      width: 100%;
      height: 10px;
      border-radius: var(--radius-pill, 9999px);
      background: rgba(255,255,255,0.06);
      overflow: hidden;
    }

    .yg-onboarding-progress-bar {
      height: 100%;
      border-radius: inherit;
      background: var(--ob-metallic-linear);
      background-size: 200% 100%;
      transition: width 200ms ease;
      animation: yg-onb-metallicShift 3s ease-in-out infinite;
    }

    /* ── Step list ── */
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
      border-radius: var(--radius-lg, 16px);
      background: rgba(255,255,255,0.02);
      border: 1px solid transparent;
      transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
    }

    .yg-onboarding-step-item.is-active {
      border-color: var(--ob-border-gold);
      background: rgba(200,167,82,0.08);
      transform: translateY(-1px);
      box-shadow: var(--ob-shadow-gold-sm);
    }

    .yg-onboarding-step-item.is-complete {
      border-color: var(--ob-border-prestige);
    }

    .yg-onboarding-step-index {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--ob-bg-4);
      border: 1px solid var(--ob-border-neutral);
      color: var(--ob-text-muted);
      font: 700 0.94rem/1 'Orbitron', sans-serif;
      transition: background 180ms ease, color 180ms ease, border-color 180ms ease;
    }

    .yg-onboarding-step-item.is-active .yg-onboarding-step-index,
    .yg-onboarding-step-item.is-complete .yg-onboarding-step-index {
      background: var(--ob-metallic-conic);
      border-color: var(--ob-gold-4);
      color: var(--ob-bg-2);
    }

    .yg-onboarding-step-title {
      display: block;
      margin-bottom: 3px;
      color: var(--ob-gold-prestige);
      font: 700 1rem/1.12 'Rajdhani', sans-serif;
    }

    .yg-onboarding-step-desc {
      color: var(--ob-text-muted);
      font: 500 0.93rem/1.35 'Rajdhani', sans-serif;
    }

    /* ── Card (main content) ── */
    .yg-onboarding-card {
      padding: 30px;
      display: flex;
      flex-direction: column;
      min-height: 0;
      animation: yg-onb-slideUp 220ms ease both;
      animation-delay: 100ms;
    }

    .yg-onboarding-card header {
      margin-bottom: 20px;
    }

    .yg-onboarding-kicker {
      margin: 0 0 8px;
      color: var(--ob-gold-4);
      font: 700 0.88rem/1 'Rajdhani', sans-serif;
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }

    .yg-onboarding-card h3 {
      margin: 0 0 8px;
      font: 900 clamp(1.5rem, 2.8vw, 2.1rem)/1.08 'Orbitron', sans-serif;
      text-wrap: balance;
      background: var(--ob-metallic-text);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: yg-onb-metallicShift 6s ease-in-out infinite;
    }

    .yg-onboarding-card p {
      margin: 0;
      color: var(--ob-text-secondary);
      font: 500 1rem/1.55 'Rajdhani', sans-serif;
    }

    /* ── Form structure ── */
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
      animation: yg-onb-slideUp 200ms ease both;
    }

    .yg-onboarding-stack {
      display: grid;
      gap: 18px;
    }

    .yg-onboarding-stack--compact {
      gap: 12px;
    }

    .yg-onboarding-field {
      display: grid;
      gap: 10px;
    }

    .yg-onboarding-stack--compact .yg-onboarding-field {
      gap: 6px;
    }

    .yg-onboarding-field label,
    .yg-onboarding-label {
      color: var(--ob-text-primary);
      font: 700 0.96rem/1.1 'Rajdhani', sans-serif;
    }

    /* ── Input ── */
    .yg-onboarding-input {
      width: 100%;
      padding: 16px 18px;
      border-radius: var(--radius-lg, 16px);
      border: 1px solid var(--ob-border-neutral);
      background: var(--ob-bg-4);
      color: var(--ob-text-primary);
      font: 600 1rem/1.2 'Rajdhani', sans-serif;
      transition: border-color 180ms ease, transform 160ms ease, background 180ms ease, box-shadow 180ms ease;
    }

    .yg-onboarding-input--compact {
      padding: 12px 14px;
      font-size: 0.95rem;
    }

    .yg-onboarding-input:focus {
      outline: none;
      border-color: var(--ob-gold-4);
      background: var(--ob-bg-3);
      transform: translateY(-1px);
      box-shadow: 0 0 0 3px rgba(200,167,82,0.12), var(--ob-shadow-gold-sm);
    }

    .yg-onboarding-stack--compact .yg-onboarding-option-grid {
      gap: 10px;
    }

    .yg-onboarding-stack--compact .yg-onboarding-option {
      padding: 12px 14px;
      border-radius: var(--radius-lg, 16px);
    }

    .yg-onboarding-stack--compact .yg-onboarding-option-title {
      margin-bottom: 2px;
      font-size: 0.95rem;
    }

    .yg-onboarding-stack--compact .yg-onboarding-option-desc {
      font-size: 0.85rem;
      line-height: 1.3;
    }

    /* ── Help box ── */
    .yg-onboarding-help {
      padding: 14px 18px;
      border-radius: var(--radius-lg, 16px);
      border: 1px solid var(--ob-border-prestige);
      background: rgba(200,167,82,0.05);
      color: var(--ob-gold-prestige);
      font: 600 0.96rem/1.48 'Rajdhani', sans-serif;
    }

    /* ── Option grid ── */
    .yg-onboarding-option-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .yg-onboarding-option {
      width: 100%;
      text-align: left;
      padding: 18px;
      border-radius: var(--radius-xl, 24px);
      border: 1px solid var(--ob-border-neutral);
      background: var(--ob-bg-4);
      color: var(--ob-text-primary);
      cursor: pointer;
      transition: transform 160ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
    }

    .yg-onboarding-option:hover,
    .yg-onboarding-option:focus-visible {
      outline: none;
      transform: translateY(-2px);
      border-color: var(--ob-border-gold);
      background: rgba(200,167,82,0.04);
      box-shadow: var(--ob-shadow-gold-sm);
    }

    .yg-onboarding-option.is-selected {
      border-color: var(--ob-gold-4);
      background: linear-gradient(180deg, rgba(200,167,82,0.12), var(--ob-bg-4));
      box-shadow: var(--ob-shadow-gold-md);
    }

    .yg-onboarding-option-title {
      display: block;
      margin-bottom: 6px;
      color: var(--ob-gold-prestige);
      font: 700 1.02rem/1.12 'Rajdhani', sans-serif;
    }

    .yg-onboarding-option-desc {
      display: block;
      color: var(--ob-text-muted);
      font: 500 0.94rem/1.38 'Rajdhani', sans-serif;
    }

    /* ── Summary ── */
    .yg-onboarding-summary {
      display: grid;
      gap: 12px;
    }

    .yg-onboarding-summary-row {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      padding: 14px 18px;
      border-radius: var(--radius-md, 12px);
      border: 1px solid var(--ob-border-neutral);
      background: var(--ob-bg-4);
      transition: border-color 160ms ease, background 160ms ease;
    }

    .yg-onboarding-summary-row:hover {
      border-color: var(--ob-border-prestige);
      background: rgba(200,167,82,0.04);
    }

    .yg-onboarding-summary-label {
      color: var(--ob-text-muted);
      font: 700 0.92rem/1.2 'Rajdhani', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .yg-onboarding-summary-value {
      color: var(--ob-gold-prestige);
      font: 700 1rem/1.2 'Rajdhani', sans-serif;
      text-align: right;
    }

    /* ── Footer ── */
    .yg-onboarding-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-top: 20px;
      margin-top: 20px;
      border-top: 1px solid var(--ob-border-neutral);
    }

    .yg-onboarding-status {
      min-height: 24px;
      color: var(--ob-text-secondary);
      font: 700 0.96rem/1.2 'Rajdhani', sans-serif;
    }

    .yg-onboarding-status.is-error {
      color: var(--color-error, #EF4444);
    }

    .yg-onboarding-status.is-loading {
      color: var(--ob-gold-5);
    }

    .yg-onboarding-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    /* ── Buttons ── */
    .yg-onboarding-btn {
      border: 0;
      border-radius: var(--radius-pill, 9999px);
      padding: 13px 22px;
      cursor: pointer;
      font: 700 0.96rem/1 'Rajdhani', sans-serif;
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
      background: var(--ob-bg-4);
      color: var(--ob-text-primary);
      border: 1px solid var(--ob-border-neutral);
    }

    .yg-onboarding-btn-secondary:hover,
    .yg-onboarding-btn-secondary:focus-visible {
      border-color: var(--ob-border-prestige);
      background: rgba(255,255,255,0.06);
    }

    .yg-onboarding-btn-ghost {
      background: transparent;
      color: var(--ob-text-secondary);
      border: 1px solid var(--ob-border-neutral);
    }

    .yg-onboarding-btn-ghost:hover,
    .yg-onboarding-btn-ghost:focus-visible {
      border-color: var(--ob-border-gold);
      color: var(--ob-gold-5);
      background: rgba(200,167,82,0.04);
    }

    .yg-onboarding-btn-primary {
      background: var(--ob-metallic-btn);
      background-size: 200% 100%;
      color: var(--ob-bg-2);
      font-weight: 900;
      box-shadow: var(--ob-shadow-gold-sm);
      animation: yg-onb-metallicShift 5s ease-in-out infinite;
    }

    .yg-onboarding-btn-primary:hover,
    .yg-onboarding-btn-primary:focus-visible {
      box-shadow: var(--ob-shadow-gold-md);
    }

    /* ── Responsive ── */
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
        border-radius: var(--radius-xl, 24px);
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
        border-radius: var(--radius-xl, 24px);
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
        border-radius: var(--radius-lg, 16px);
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

      .yg-onboarding-progress-bar,
      .yg-onboarding-side h2,
      .yg-onboarding-card h3,
      .yg-onboarding-btn-primary {
        animation: none !important;
      }

      .yg-onboarding-side::before,
      .yg-onboarding-card::before {
        animation: none !important;
      }

      .yg-onboarding-option,
      .yg-onboarding-step-item,
      .yg-onboarding-btn,
      .yg-onboarding-input,
      .yg-onboarding-summary-row,
      .yg-onboarding-step-index,
      .yg-onboarding-progress-bar {
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

  // mainActivity is optional — users can skip step 2 entirely

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

function appendOptionGrid(parent, group, options, selectedValue) {
  const grid = document.createElement('div');
  grid.className = 'yg-onboarding-option-grid';
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `yg-onboarding-option${selectedValue === option.value ? ' is-selected' : ''}`;
    button.setAttribute('data-select-group', group);
    button.setAttribute('data-select-value', String(option.value));
    const titleSpan = document.createElement('span');
    titleSpan.className = 'yg-onboarding-option-title';
    titleSpan.textContent = option.label;
    const descSpan = document.createElement('span');
    descSpan.className = 'yg-onboarding-option-desc';
    descSpan.textContent = option.description;
    button.append(titleSpan, descSpan);
    grid.appendChild(button);
  }
  parent.appendChild(grid);
}

function appendSummary(parent, state) {
  const rows = [
    ['Nombre visible', state.displayName || 'Sin definir'],
    ['Relación con Agro', getOnboardingLabel('relation', state.agroRelation) || 'Sin definir'],
    ['Actividad principal', getOnboardingLabel('activity', state.mainActivity) || 'Sin definir'],
    ['Proyecto o finca', state.farmName || 'Lo definiremos después'],
    ['Entrada inicial', getOnboardingLabel('entry', state.entryPreference) || 'Sin definir']
  ];

  const wrap = document.createElement('div');
  wrap.className = 'yg-onboarding-summary';
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'yg-onboarding-summary-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'yg-onboarding-summary-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'yg-onboarding-summary-value';
    valueEl.textContent = value;
    row.append(labelEl, valueEl);
    wrap.appendChild(row);
  }
  const help = document.createElement('div');
  help.className = 'yg-onboarding-help';
  help.textContent =
    'Guardaremos este contexto para que el dashboard y tus próximas entradas se sientan más claras desde ya.';
  wrap.appendChild(help);
  parent.appendChild(wrap);
}

function appendStepBody(parent, state) {
  parent.replaceChildren();

  if (state.step === 0) {
    const stack = document.createElement('div');
    stack.className = 'yg-onboarding-stack';
    const field = document.createElement('div');
    field.className = 'yg-onboarding-field';
    const label = document.createElement('label');
    label.setAttribute('for', 'yg-onboarding-display-name');
    label.textContent = 'Nombre visible';
    const input = document.createElement('input');
    input.id = 'yg-onboarding-display-name';
    input.className = 'yg-onboarding-input';
    input.name = 'displayName';
    input.maxLength = 80;
    input.placeholder = 'Ej. Yerik, Don Julio, La Finca El Sol';
    input.value = state.displayName;
    input.autocomplete = 'given-name';
    field.append(label, input);
    const help = document.createElement('div');
    help.className = 'yg-onboarding-help';
    help.textContent =
      'Este nombre se usa para saludarte mejor en el dashboard. No tiene que coincidir con un username único.';
    stack.append(field, help);
    parent.appendChild(stack);
    return;
  }

  if (state.step === 1) {
    appendOptionGrid(parent, 'agroRelation', ONBOARDING_RELATION_OPTIONS, state.agroRelation);
    return;
  }

  if (state.step === 2) {
    const farmLabel =
      state.agroRelation === 'exploring'
        ? 'Proyecto o referencia (opcional)'
        : 'Nombre de la finca o proyecto (opcional)';
    const farmPlaceholder =
      state.agroRelation === 'exploring'
        ? 'Ej. Estoy evaluando mi primera finca'
        : 'Ej. Finca El Progreso';

    const stack = document.createElement('div');
    stack.className = 'yg-onboarding-stack yg-onboarding-stack--compact';
    const farmField = document.createElement('div');
    farmField.className = 'yg-onboarding-field';
    const farmLabelEl = document.createElement('label');
    farmLabelEl.setAttribute('for', 'yg-onboarding-farm-name');
    farmLabelEl.textContent = farmLabel;
    const farmInput = document.createElement('input');
    farmInput.id = 'yg-onboarding-farm-name';
    farmInput.className = 'yg-onboarding-input yg-onboarding-input--compact';
    farmInput.name = 'farmName';
    farmInput.maxLength = 120;
    farmInput.placeholder = farmPlaceholder;
    farmInput.value = state.farmName;
    farmInput.autocomplete = 'organization';
    farmField.append(farmLabelEl, farmInput);

    const activityField = document.createElement('div');
    activityField.className = 'yg-onboarding-field';
    const activityLabel = document.createElement('span');
    activityLabel.className = 'yg-onboarding-label';
    activityLabel.textContent = 'Actividad principal (opcional)';
    activityField.appendChild(activityLabel);
    appendOptionGrid(activityField, 'mainActivity', ONBOARDING_ACTIVITY_OPTIONS, state.mainActivity);

    stack.append(farmField, activityField);
    parent.appendChild(stack);
    return;
  }

  if (state.step === 3) {
    appendOptionGrid(parent, 'entryPreference', ONBOARDING_ENTRY_OPTIONS, state.entryPreference);
    return;
  }

  appendSummary(parent, state);
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
      state = { ...state, displayName: normalizeText(event.target.value, 80), error: '' };
      persistDraft();
    });

    root.querySelector('[name="farmName"]')?.addEventListener('input', (event) => {
      state = { ...state, farmName: normalizeText(event.target.value, 120), error: '' };
      persistDraft();
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

    const shell = document.createElement('div');
    shell.className = 'yg-onboarding-shell';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-labelledby', 'yg-onboarding-title');

    const aside = document.createElement('aside');
    aside.className = 'yg-onboarding-side';
    const asideInner = document.createElement('div');
    const eyebrow = document.createElement('span');
    eyebrow.className = 'yg-onboarding-eyebrow';
    eyebrow.textContent = 'Primer acceso guiado';
    const asideTitle = document.createElement('h2');
    asideTitle.textContent = 'Vamos a dejar Agro listo para ti.';
    const asideIntro = document.createElement('p');
    asideIntro.textContent =
      'Queremos que el primer acceso se sienta claro, útil y humano. Por eso te pedimos decisiones pequeñas en vez de una pantalla fría.';

    const progressWrap = document.createElement('div');
    progressWrap.className = 'yg-onboarding-progress-wrap';
    const progressMeta = document.createElement('div');
    progressMeta.className = 'yg-onboarding-progress-meta';
    const stepCountSpan = document.createElement('span');
    stepCountSpan.textContent = `Paso ${state.step + 1} de ${STEP_COUNT}`;
    const nameSpan = document.createElement('span');
    nameSpan.textContent = state.displayName ? state.displayName : 'Configuración inicial';
    progressMeta.append(stepCountSpan, nameSpan);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'yg-onboarding-progress-track';
    const progressBar = document.createElement('div');
    progressBar.className = 'yg-onboarding-progress-bar';
    progressBar.style.width = progress;
    progressTrack.appendChild(progressBar);
    progressWrap.append(progressMeta, progressTrack);

    const stepUl = document.createElement('ul');
    stepUl.className = 'yg-onboarding-step-list';
    stepList.forEach((stepItem, index) => {
      const li = document.createElement('li');
      li.className = `yg-onboarding-step-item${
        index === state.step ? ' is-active' : index < state.step ? ' is-complete' : ''
      }`;
      const idx = document.createElement('span');
      idx.className = 'yg-onboarding-step-index';
      idx.textContent = String(index + 1);
      const textWrap = document.createElement('div');
      const titleS = document.createElement('span');
      titleS.className = 'yg-onboarding-step-title';
      titleS.textContent = stepItem.title;
      const descS = document.createElement('span');
      descS.className = 'yg-onboarding-step-desc';
      descS.textContent = stepItem.description;
      textWrap.append(titleS, descS);
      li.append(idx, textWrap);
      stepUl.appendChild(li);
    });

    asideInner.append(eyebrow, asideTitle, asideIntro, progressWrap, stepUl);
    const helperP = document.createElement('p');
    helperP.textContent = stepMeta.helper;
    aside.append(asideInner, helperP);

    const section = document.createElement('section');
    section.className = 'yg-onboarding-card';
    const header = document.createElement('header');
    const kicker = document.createElement('p');
    kicker.className = 'yg-onboarding-kicker';
    kicker.textContent = stepMeta.kicker;
    const titleH = document.createElement('h3');
    titleH.id = 'yg-onboarding-title';
    titleH.textContent = stepMeta.title;
    const descP = document.createElement('p');
    descP.textContent = stepMeta.description;
    header.append(kicker, titleH, descP);

    const form = document.createElement('form');
    form.className = 'yg-onboarding-form';
    form.setAttribute('data-onboarding-form', '');
    const bodyEl = document.createElement('div');
    bodyEl.className = 'yg-onboarding-body';
    appendStepBody(bodyEl, state);

    const footer = document.createElement('div');
    footer.className = 'yg-onboarding-footer';
    const statusEl = document.createElement('div');
    statusEl.className = statusClass;
    statusEl.setAttribute('aria-live', 'polite');
    statusEl.textContent = statusText;
    const actions = document.createElement('div');
    actions.className = 'yg-onboarding-actions';

    if (state.step > 0) {
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'yg-onboarding-btn yg-onboarding-btn-ghost';
      backBtn.setAttribute('data-action', 'back');
      backBtn.textContent = 'Atrás';
      backBtn.disabled = Boolean(state.isSubmitting);
      actions.appendChild(backBtn);
    }

    if (typeof onRequestLogout === 'function') {
      const logoutBtn = document.createElement('button');
      logoutBtn.type = 'button';
      logoutBtn.className = 'yg-onboarding-btn yg-onboarding-btn-secondary';
      logoutBtn.setAttribute('data-action', 'logout');
      logoutBtn.textContent = 'Cerrar sesión';
      logoutBtn.disabled = Boolean(state.isSubmitting);
      actions.appendChild(logoutBtn);
    }

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'yg-onboarding-btn yg-onboarding-btn-primary';
    submitBtn.textContent = primaryLabel;
    submitBtn.disabled = Boolean(state.isSubmitting);
    actions.appendChild(submitBtn);

    footer.append(statusEl, actions);
    form.append(bodyEl, footer);
    section.append(header, form);
    shell.append(aside, section);
    root.replaceChildren(shell);

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
