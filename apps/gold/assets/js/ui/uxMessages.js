const UX_STYLE_ID = 'yg-ux-messages-style';
const UX_LAYER_ID = 'yg-ux-messages-layer';
const UX_POPUP_LAYER_ID = 'yg-ux-popup-layer';
const UX_FLASH_KEY = 'YG_UX_FLASH_V1';

let didConsumeFlash = false;
let activePopup = null;
let activePopupTimer = null;

const TYPE_META = {
  success: { accent: '#4ade80', label: 'Listo', duration: 3400, icon: 'fa-solid fa-circle-check' },
  info: { accent: '#C8A752', label: 'Información', duration: 3600, icon: 'fa-solid fa-circle-info' },
  warning: { accent: '#f59e0b', label: 'Aviso', duration: 4200, icon: 'fa-solid fa-triangle-exclamation' },
  error: { accent: '#ef4444', label: 'Atención', duration: 5000, icon: 'fa-solid fa-circle-xmark' },
  redirect: { accent: '#C8A752', label: 'Continuamos', duration: 3800, icon: 'fa-solid fa-circle-arrow-right' },
  welcome: { accent: '#C8A752', label: 'Bienvenido', duration: 3600, icon: 'fa-solid fa-hand-sparkles' },
  farewell: { accent: '#C8A752', label: 'Hasta pronto', duration: 3800, icon: 'fa-solid fa-hand' }
};

function normalizeType(type) {
  const key = String(type || 'info').trim().toLowerCase();
  return TYPE_META[key] ? key : 'info';
}

function stripLegacyPrefix(value) {
  return String(value || '')
    .replace(/^[\s\u2705\u26A0\u274C\u2139\u{1F389}\u{1F4AC}\u{1F6A7}\u{1F4A1}\u{1F4E1}\u{1F4E5}\u{1F4A5}\u{1F680}\u{1F44B}\u{1F33E}\u{1F511}\u{1F31F}\u{1F4BE}\u{1F6E0}\u{1F4CC}\u{1F9FE}]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickText(value) {
  const text = stripLegacyPrefix(value);
  return text || '';
}

function buildPayload(input, fallbackType = 'info') {
  if (typeof input === 'string') {
    return {
      type: normalizeType(fallbackType),
      title: pickText(input),
      message: '',
      duration: TYPE_META[normalizeType(fallbackType)].duration,
      popup: false
    };
  }

  const type = normalizeType(input?.type || fallbackType);
  const title = pickText(input?.title || input?.message || '');
  const message = input?.title && input?.message ? pickText(input.message) : '';
  const duration = Number.isFinite(Number(input?.duration))
    ? Number(input.duration)
    : TYPE_META[type].duration;

  return {
    type,
    title,
    message,
    duration,
    id: input?.id ? String(input.id) : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: pickText(input?.label || ''),
    persistent: input?.persistent === true,
    popup: input?.popup === true
  };
}

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(UX_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = UX_STYLE_ID;
  style.textContent = `
    #${UX_LAYER_ID} {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 12050;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
      pointer-events: none;
    }

    .yg-ux-toast {
      --yg-ux-accent: ${TYPE_META.info.accent};
      min-width: min(360px, calc(100vw - 40px));
      max-width: min(380px, calc(100vw - 40px));
      padding: 14px 16px 15px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-left: 3px solid var(--yg-ux-accent);
      background:
        linear-gradient(180deg, rgba(18, 18, 18, 0.98) 0%, rgba(10, 10, 10, 0.94) 100%);
      box-shadow:
        0 20px 50px rgba(0, 0, 0, 0.42),
        0 0 28px rgba(200, 167, 82, 0.08);
      color: var(--gg-text-main, #E2E8F0);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      pointer-events: auto;
      opacity: 0;
      transform: translate3d(0, -10px, 0) scale(0.98);
      transition:
        opacity 180ms ease,
        transform 180ms ease,
        box-shadow 180ms ease;
      font-family: var(--font-body, 'Rajdhani', sans-serif);
      position: relative;
      overflow: hidden;
    }

    .yg-ux-toast::after {
      content: '';
      position: absolute;
      inset: auto -30px -30px auto;
      width: 96px;
      height: 96px;
      border-radius: 999px;
      background: radial-gradient(circle, color-mix(in srgb, var(--yg-ux-accent) 22%, transparent) 0%, transparent 72%);
      pointer-events: none;
      opacity: 0.7;
    }

    .yg-ux-toast.is-visible {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }

    .yg-ux-toast.is-hiding {
      opacity: 0;
      transform: translate3d(0, -8px, 0) scale(0.98);
    }

    .yg-ux-toast__eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--yg-ux-accent);
      font-family: var(--font-heading, 'Orbitron', sans-serif);
      font-weight: 700;
    }

    .yg-ux-toast__dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--yg-ux-accent);
      box-shadow: 0 0 12px color-mix(in srgb, var(--yg-ux-accent) 50%, transparent);
      flex-shrink: 0;
    }

    .yg-ux-toast__title {
      margin: 0;
      font-size: 1.02rem;
      line-height: 1.2;
      color: var(--gg-text-title, #FFFFFF);
      font-weight: 700;
    }

    .yg-ux-toast__message {
      margin: 6px 0 0;
      color: color-mix(in srgb, var(--gg-text-main, #E2E8F0) 82%, transparent);
      font-size: 0.92rem;
      line-height: 1.35;
    }

    @media (max-width: 640px) {
      #${UX_LAYER_ID} {
        top: auto;
        right: 14px;
        left: 14px;
        bottom: 14px;
        align-items: stretch;
      }

      .yg-ux-toast {
        min-width: 100%;
        max-width: 100%;
        padding: 14px 14px 15px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .yg-ux-toast {
        transition: opacity 120ms ease;
        transform: none;
      }
      .yg-ux-toast.is-visible,
      .yg-ux-toast.is-hiding {
        transform: none;
      }
    }

    #${UX_POPUP_LAYER_ID} {
      position: fixed;
      inset: 0;
      z-index: 12060;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .yg-ux-popup {
      --yg-ux-accent: #C8A752;
      position: relative;
      min-width: min(320px, calc(100vw - 32px));
      max-width: min(380px, calc(100vw - 32px));
      padding: 20px 44px 20px 20px;
      border-radius: 14px;
      border: 1px solid rgba(200, 167, 82, 0.2);
      border-left: 3px solid var(--yg-ux-accent);
      background: linear-gradient(180deg, rgba(18, 18, 18, 0.98) 0%, rgba(10, 10, 10, 0.96) 100%);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(200, 167, 82, 0.06);
      color: var(--gg-text-main, #E2E8F0);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      pointer-events: auto;
      opacity: 0;
      transform: translate3d(0, 0, 0) scale(0.95);
      transition: opacity 160ms ease, transform 160ms ease;
      font-family: var(--font-body, 'Rajdhani', sans-serif);
    }

    .yg-ux-popup.is-visible {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }

    .yg-ux-popup.is-hiding {
      opacity: 0;
      transform: translate3d(0, 0, 0) scale(0.95);
    }

    .yg-ux-popup__close {
      position: absolute;
      top: 6px;
      right: 8px;
      background: none;
      border: none;
      color: rgba(226, 232, 240, 0.35);
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      transition: color 120ms ease, background 120ms ease;
    }

    .yg-ux-popup__close:hover {
      color: rgba(226, 232, 240, 0.8);
      background: rgba(255, 255, 255, 0.06);
    }

    .yg-ux-popup__close:focus-visible {
      outline: 2px solid var(--yg-ux-accent);
      outline-offset: 2px;
    }

    .yg-ux-popup__eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 4px;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--yg-ux-accent);
      font-family: var(--font-heading, 'Orbitron', sans-serif);
      font-weight: 700;
    }

    .yg-ux-popup__icon {
      font-size: 0.78rem;
      flex-shrink: 0;
    }

    .yg-ux-popup__title {
      margin: 0;
      font-size: 1rem;
      line-height: 1.3;
      color: var(--gg-text-title, #FFFFFF);
      font-weight: 700;
    }

    .yg-ux-popup__message {
      margin: 4px 0 0;
      color: rgba(226, 232, 240, 0.82);
      font-size: 0.88rem;
      line-height: 1.4;
    }

    @media (max-width: 640px) {
      .yg-ux-popup {
        min-width: calc(100vw - 32px);
        max-width: calc(100vw - 32px);
        padding: 16px 36px 16px 16px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .yg-ux-popup {
        transition: opacity 120ms ease;
        transform: none;
      }
      .yg-ux-popup.is-visible,
      .yg-ux-popup.is-hiding {
        transform: none;
      }
    }
  `;

  document.head.appendChild(style);
}

function ensureLayer() {
  if (typeof document === 'undefined') return null;
  let layer = document.getElementById(UX_LAYER_ID);
  if (layer) return layer;

  layer = document.createElement('div');
  layer.id = UX_LAYER_ID;
  document.body.appendChild(layer);
  return layer;
}

function removeToast(toast) {
  if (!toast) return;
  toast.classList.add('is-hiding');
  setTimeout(() => toast.remove(), 190);
}

function ensurePopupLayer() {
  if (typeof document === 'undefined') return null;
  let layer = document.getElementById(UX_POPUP_LAYER_ID);
  if (layer) return layer;

  layer = document.createElement('div');
  layer.id = UX_POPUP_LAYER_ID;
  layer.setAttribute('aria-live', 'polite');
  document.body.appendChild(layer);
  return layer;
}

function removePopup() {
  if (!activePopup) return;
  const el = activePopup;
  activePopup = null;
  if (activePopupTimer) { clearTimeout(activePopupTimer); activePopupTimer = null; }
  el.classList.add('is-hiding');
  setTimeout(() => el.remove(), 170);
}

function handlePopupKeydown(e) {
  if (e.key === 'Escape' && activePopup) {
    removePopup();
    document.removeEventListener('keydown', handlePopupKeydown);
  }
}

function renderPopup(payload) {
  if (typeof document === 'undefined') return null;
  ensureStyles();
  const layer = ensurePopupLayer();
  if (!layer) return null;

  if (activePopup) removePopup();

  const meta = TYPE_META[payload.type] || TYPE_META.info;
  const popup = document.createElement('div');
  popup.className = 'yg-ux-popup';
  popup.style.setProperty('--yg-ux-accent', meta.accent);
  popup.dataset.type = payload.type;
  popup.dataset.popupId = payload.id;
  popup.setAttribute('role', payload.type === 'error' ? 'alert' : 'status');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'yg-ux-popup__close';
  closeBtn.setAttribute('type', 'button');
  closeBtn.setAttribute('aria-label', 'Cerrar');
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', () => {
    removePopup();
    document.removeEventListener('keydown', handlePopupKeydown);
  });

  const eyebrow = document.createElement('div');
  eyebrow.className = 'yg-ux-popup__eyebrow';
  if (meta.icon) {
    const icon = document.createElement('i');
    icon.className = `yg-ux-popup__icon ${meta.icon}`;
    icon.setAttribute('aria-hidden', 'true');
    eyebrow.appendChild(icon);
  }
  eyebrow.appendChild(document.createTextNode(payload.label || meta.label));

  const title = document.createElement('p');
  title.className = 'yg-ux-popup__title';
  title.textContent = payload.title || meta.label;

  popup.appendChild(closeBtn);
  popup.appendChild(eyebrow);
  popup.appendChild(title);

  if (payload.message) {
    const message = document.createElement('p');
    message.className = 'yg-ux-popup__message';
    message.textContent = payload.message;
    popup.appendChild(message);
  }

  layer.appendChild(popup);
  requestAnimationFrame(() => popup.classList.add('is-visible'));

  document.addEventListener('keydown', handlePopupKeydown);

  activePopup = popup;
  if (!payload.persistent) {
    activePopupTimer = setTimeout(() => {
      removePopup();
      document.removeEventListener('keydown', handlePopupKeydown);
    }, payload.duration);
  }

  return popup;
}

function renderToast(payload) {
  if (typeof document === 'undefined') return null;
  ensureStyles();
  const layer = ensureLayer();
  if (!layer) return null;

  const meta = TYPE_META[payload.type] || TYPE_META.info;
  const toast = document.createElement('article');
  toast.className = 'yg-ux-toast';
  toast.style.setProperty('--yg-ux-accent', meta.accent);
  toast.dataset.type = payload.type;
  toast.dataset.toastId = payload.id;

  const eyebrow = document.createElement('div');
  eyebrow.className = 'yg-ux-toast__eyebrow';

  const dot = document.createElement('span');
  dot.className = 'yg-ux-toast__dot';
  eyebrow.appendChild(dot);
  eyebrow.appendChild(document.createTextNode(payload.label || meta.label));

  const title = document.createElement('p');
  title.className = 'yg-ux-toast__title';
  title.textContent = payload.title || meta.label;

  toast.appendChild(eyebrow);
  toast.appendChild(title);

  if (payload.message) {
    const message = document.createElement('p');
    message.className = 'yg-ux-toast__message';
    message.textContent = payload.message;
    toast.appendChild(message);
  }

  layer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));

  if (!payload.persistent) {
    setTimeout(() => removeToast(toast), payload.duration);
  }

  return toast;
}

function readFlash() {
  try {
    const raw = sessionStorage.getItem(UX_FLASH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_err) {
    return null;
  }
}

function clearFlash() {
  try {
    sessionStorage.removeItem(UX_FLASH_KEY);
  } catch (_err) {
    // ignore storage errors
  }
}

function queueFlash(input, fallbackType = 'info') {
  const payload = buildPayload(input, fallbackType);
  try {
    sessionStorage.setItem(UX_FLASH_KEY, JSON.stringify(payload));
  } catch (_err) {
    // ignore storage errors
  }
  return payload;
}

function consumeFlash() {
  if (didConsumeFlash) return;
  didConsumeFlash = true;
  const payload = readFlash();
  if (!payload) return;
  clearFlash();
  show(payload);
}

function show(input, fallbackType = 'info') {
  const payload = buildPayload(input, fallbackType);
  if (typeof document === 'undefined') return null;

  if (!document.body) {
    const render = payload.popup ? renderPopup : renderToast;
    window.addEventListener('DOMContentLoaded', () => render(payload), { once: true });
    return payload;
  }

  return payload.popup ? renderPopup(payload) : renderToast(payload);
}

const copy = {
  welcomeBack() {
    return {
      type: 'welcome',
      title: 'Bienvenido de vuelta.',
      message: 'Tu sesión quedó lista.'
    };
  },
  registerSuccess() {
    return {
      type: 'success',
      title: 'Cuenta registrada con éxito.',
      message: 'Revisa tu correo para confirmar el acceso.'
    };
  },
  logoutSuccess() {
    return {
      type: 'farewell',
      title: 'Sesión cerrada correctamente.',
      message: 'Hasta pronto.'
    };
  },
  resetLinkSent() {
    return {
      type: 'info',
      title: 'Enlace enviado correctamente.',
      message: 'Revisa tu correo para continuar.'
    };
  },
  passwordUpdated() {
    return {
      type: 'success',
      title: 'Contraseña actualizada correctamente.',
      message: 'Tu acceso quedó protegido con la nueva clave.'
    };
  },
  accountVerified() {
    return {
      type: 'redirect',
      title: 'Cuenta verificada con éxito.',
      message: 'Te llevamos a tu dashboard.'
    };
  },
  profileSaved({ created = false } = {}) {
    return created
      ? { type: 'success', title: 'Perfil creado correctamente.', message: 'Tu información ya quedó guardada.' }
      : { type: 'success', title: 'Perfil actualizado con éxito.', message: 'Tus cambios ya quedaron guardados.' };
  },
  profilePhotoReady() {
    return {
      type: 'info',
      title: 'Foto lista para guardar.',
      message: 'Confirma los cambios para aplicarla al perfil.'
    };
  },
  cropSaved({ created = false } = {}) {
    return created
      ? { type: 'success', title: 'Cultivo creado correctamente.', message: 'Ya quedó listo en tu tablero.' }
      : { type: 'success', title: 'Cambios guardados en el cultivo.', message: 'La información quedó actualizada.' };
  },
  cropDeleted() {
    return {
      type: 'success',
      title: 'Cultivo eliminado correctamente.',
      message: 'La lista ya fue actualizada.'
    };
  },
  movementCreated(kind = 'movimiento') {
    const label = String(kind || 'movimiento').trim().toLowerCase();
    const titles = {
      fiado: 'Fiado registrado correctamente.',
      ingreso: 'Ingreso registrado correctamente.',
      gasto: 'Gasto registrado correctamente.',
      'pérdida': 'Pérdida registrada correctamente.',
      perdida: 'Pérdida registrada correctamente.',
      donación: 'Donación registrada correctamente.',
      donacion: 'Donación registrada correctamente.',
      movimiento: 'Movimiento registrado correctamente.'
    };
    return {
      type: 'success',
      title: titles[label] || 'Movimiento registrado correctamente.',
      message: 'Ya puedes verlo reflejado en el historial.'
    };
  },
  movementUpdated() {
    return {
      type: 'success',
      title: 'Cambios guardados en el movimiento.',
      message: 'El historial ya quedó actualizado.'
    };
  },
  movementDeleted() {
    return {
      type: 'success',
      title: 'Registro eliminado correctamente.',
      message: 'La vista ya quedó actualizada.'
    };
  },
  movementDuplicated() {
    return {
      type: 'success',
      title: 'Registro duplicado correctamente.',
      message: 'La copia ya quedó disponible en el historial.'
    };
  },
  movementMoved(detail = '') {
    return {
      type: 'success',
      title: 'Movimiento reubicado correctamente.',
      message: pickText(detail)
    };
  },
  transferCompleted({ detail = '' } = {}) {
    return {
      type: 'success',
      title: 'Transferencia realizada con éxito.',
      message: pickText(detail)
    };
  },
  revertCompleted({ detail = '' } = {}) {
    return {
      type: 'success',
      title: 'Reversión completada con éxito.',
      message: pickText(detail)
    };
  },
  historyRefreshing() {
    return {
      type: 'info',
      title: 'Estamos actualizando el historial.',
      message: 'Verás los cambios en un momento.'
    };
  },
  feedbackSent() {
    return {
      type: 'success',
      title: 'Gracias por tu mensaje.',
      message: 'Lo recibimos correctamente.'
    };
  },
  feedbackQueued() {
    return {
      type: 'info',
      title: 'Tu feedback quedó guardado en cola.',
      message: 'Se enviará en cuanto haya sesión o conexión.'
    };
  },
  settingsSaved() {
    return {
      type: 'success',
      title: 'Preferencias guardadas correctamente.',
      message: 'Tus ajustes ya quedaron actualizados.'
    };
  }
};

const api = {
  init() {
    ensureStyles();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', consumeFlash, { once: true });
    } else {
      consumeFlash();
    }
    return api;
  },
  show,
  queueFlash,
  consumeFlash,
  success(input) { return show(typeof input === 'string' ? { type: 'success', title: input } : { ...input, type: 'success' }); },
  info(input) { return show(typeof input === 'string' ? { type: 'info', title: input } : { ...input, type: 'info' }); },
  warning(input) { return show(typeof input === 'string' ? { type: 'warning', title: input } : { ...input, type: 'warning' }); },
  error(input) { return show(typeof input === 'string' ? { type: 'error', title: input } : { ...input, type: 'error' }); },
  redirect(input) { return show(typeof input === 'string' ? { type: 'redirect', title: input } : { ...input, type: 'redirect' }); },
  welcome(input) { return show(typeof input === 'string' ? { type: 'welcome', title: input } : { ...input, type: 'welcome' }); },
  farewell(input) { return show(typeof input === 'string' ? { type: 'farewell', title: input } : { ...input, type: 'farewell' }); },
  popup(input) { const p = typeof input === 'string' ? { title: input } : { ...input }; p.popup = true; return show(p); },
  closePopup() { if (activePopup) { removePopup(); document.removeEventListener('keydown', handlePopupKeydown); } },
  copy
};

if (typeof window !== 'undefined') {
  window.YGUXMessages = api;
  window.showToast = (input, type = 'info') => api.show(input, type);
  window.showGoldToast = (message) => api.success({ title: pickText(message) });
  api.init();
}

export default api;
