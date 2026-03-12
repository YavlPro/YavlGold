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
      .yg-profile-edit-lock{overflow:hidden}
      .yg-profile-edit-layer{position:fixed;inset:0;z-index:10040;padding:18px;display:flex;align-items:center;justify-content:center;overflow-y:auto;background:radial-gradient(circle at top left,rgba(200,167,82,.18),transparent 26%),radial-gradient(circle at bottom right,rgba(200,167,82,.12),transparent 24%),rgba(10,10,10,.9);backdrop-filter:blur(18px)}
      .yg-profile-edit-shell{width:min(1020px,100%);min-height:min(760px,calc(100vh - 36px));display:grid;grid-template-columns:minmax(280px,330px) minmax(0,1fr);gap:18px;margin:auto 0}
      .yg-profile-edit-side,.yg-profile-edit-card{border:1px solid rgba(200,167,82,.18);border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02)),rgba(12,12,12,.96);box-shadow:0 24px 64px rgba(0,0,0,.3)}
      .yg-profile-edit-side{padding:24px;display:flex;flex-direction:column;gap:18px}
      .yg-profile-edit-eyebrow{display:inline-flex;align-items:center;gap:8px;width:fit-content;padding:8px 12px;border-radius:999px;background:rgba(200,167,82,.12);color:#f1ddb0;font:700 .84rem/1 'Rajdhani',sans-serif;letter-spacing:.08em;text-transform:uppercase}
      .yg-profile-edit-side h2{margin:0;color:#fff4dc;font:700 clamp(1.7rem,3vw,2.4rem)/1.08 'Orbitron',sans-serif}
      .yg-profile-edit-side p{margin:0;color:rgba(255,255,255,.74);font:600 1rem/1.55 'Rajdhani',sans-serif}
      .yg-profile-edit-progress{display:grid;gap:10px}
      .yg-profile-edit-progress-meta{display:flex;align-items:center;justify-content:space-between;color:rgba(255,255,255,.78);font:700 .9rem/1 'Rajdhani',sans-serif}
      .yg-profile-edit-track{width:100%;height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
      .yg-profile-edit-bar{height:100%;border-radius:inherit;background:linear-gradient(90deg,#8e7433,#c8a752 50%,#f5deb3);transition:width 180ms ease}
      .yg-profile-edit-step-list{display:grid;gap:10px;list-style:none;margin:0;padding:0}
      .yg-profile-edit-step{display:grid;grid-template-columns:36px minmax(0,1fr);gap:12px;padding:12px 14px;border-radius:18px;border:1px solid transparent;background:rgba(255,255,255,.03)}
      .yg-profile-edit-step.is-active{border-color:rgba(200,167,82,.44);background:rgba(200,167,82,.08)}
      .yg-profile-edit-step.is-complete{border-color:rgba(200,167,82,.2)}
      .yg-profile-edit-step-index{width:36px;height:36px;display:grid;place-items:center;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font:700 .94rem/1 'Orbitron',sans-serif}
      .yg-profile-edit-step.is-active .yg-profile-edit-step-index,.yg-profile-edit-step.is-complete .yg-profile-edit-step-index{background:linear-gradient(135deg,#8e7433,#c8a752);color:#111}
      .yg-profile-edit-step-title{display:block;margin-bottom:4px;color:#fff7e8;font:700 1rem/1.1 'Rajdhani',sans-serif}
      .yg-profile-edit-step-desc{color:rgba(255,255,255,.66);font:500 .92rem/1.35 'Rajdhani',sans-serif}
      .yg-profile-edit-card{padding:28px;display:flex;flex-direction:column;min-height:0}
      .yg-profile-edit-card header{margin-bottom:18px}
      .yg-profile-edit-kicker{margin:0 0 8px;color:#c8a752;font:700 .84rem/1 'Rajdhani',sans-serif;letter-spacing:.08em;text-transform:uppercase}
      .yg-profile-edit-card h3{margin:0 0 10px;color:#fff7e5;font:700 clamp(1.45rem,2.8vw,2rem)/1.08 'Orbitron',sans-serif}
      .yg-profile-edit-card p{margin:0;color:rgba(255,255,255,.72);font:600 1rem/1.55 'Rajdhani',sans-serif}
      .yg-profile-edit-form{display:flex;flex-direction:column;flex:1;min-height:0}
      .yg-profile-edit-body{flex:1;min-height:0;overflow:auto;padding-right:4px}
      .yg-profile-edit-stack{display:grid;gap:18px}
      .yg-profile-edit-field{display:grid;gap:10px}
      .yg-profile-edit-field span,.yg-profile-edit-label{color:rgba(255,255,255,.92);font:700 .96rem/1.1 'Rajdhani',sans-serif}
      .yg-profile-edit-input,.yg-profile-edit-textarea{width:100%;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#fff;font:600 1rem/1.2 'Rajdhani',sans-serif;transition:border-color 180ms ease,transform 180ms ease,background 180ms ease}
      .yg-profile-edit-input{padding:15px 16px}
      .yg-profile-edit-textarea{min-height:140px;padding:14px 16px;resize:vertical}
      .yg-profile-edit-input:focus,.yg-profile-edit-textarea:focus{outline:none;border-color:rgba(200,167,82,.72);background:rgba(255,255,255,.05);transform:translateY(-1px)}
      .yg-profile-edit-help{padding:14px 16px;border-radius:18px;border:1px solid rgba(200,167,82,.14);background:rgba(200,167,82,.07);color:#f3e4ba;font:700 .94rem/1.45 'Rajdhani',sans-serif}
      .yg-profile-edit-inline{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .yg-profile-edit-avatar{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;padding:16px;border-radius:22px;border:1px solid rgba(200,167,82,.16);background:rgba(200,167,82,.04)}
      .yg-profile-edit-avatar-preview{width:88px;height:88px;border-radius:24px;border:1px solid rgba(200,167,82,.3);background:rgba(200,167,82,.1);display:grid;place-items:center;color:#c8a752;font:700 1.8rem/1 'Orbitron',sans-serif;overflow:hidden}
      .yg-profile-edit-avatar-preview img{width:100%;height:100%;object-fit:cover;display:block}
      .yg-profile-edit-avatar-meta{display:grid;gap:12px}
      .yg-profile-edit-avatar-actions{display:flex;flex-wrap:wrap;gap:10px}
      .yg-profile-edit-avatar-file{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);border:0}
      .yg-profile-edit-summary{display:grid;gap:12px}
      .yg-profile-edit-summary-row{display:flex;justify-content:space-between;gap:18px;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03)}
      .yg-profile-edit-summary-label{color:rgba(255,255,255,.64);font:700 .88rem/1.2 'Rajdhani',sans-serif;letter-spacing:.06em;text-transform:uppercase}
      .yg-profile-edit-summary-value{color:#fff;text-align:right;font:700 1rem/1.2 'Rajdhani',sans-serif}
      .yg-profile-edit-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:18px;margin-top:18px;border-top:1px solid rgba(255,255,255,.08)}
      .yg-profile-edit-status{min-height:24px;color:rgba(255,255,255,.72);font:700 .96rem/1.2 'Rajdhani',sans-serif}
      .yg-profile-edit-status.is-error{color:#ffb59f}
      .yg-profile-edit-status.is-loading{color:#f5deb3}
      .yg-profile-edit-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px}
      .yg-profile-edit-btn{border:0;border-radius:999px;padding:12px 18px;cursor:pointer;transition:transform 160ms ease,opacity 160ms ease,box-shadow 160ms ease,background 160ms ease;font:700 .96rem/1 'Rajdhani',sans-serif;letter-spacing:.03em}
      .yg-profile-edit-btn:hover,.yg-profile-edit-btn:focus-visible{outline:none;transform:translateY(-1px)}
      .yg-profile-edit-btn:disabled{opacity:.6;cursor:wait;transform:none}
      .yg-profile-edit-btn-secondary{background:rgba(255,255,255,.08);color:#fff}
      .yg-profile-edit-btn-ghost{background:transparent;color:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.12)}
      .yg-profile-edit-btn-primary{background:linear-gradient(90deg,#8e7433,#c8a752 50%,#f4ddb1);color:#121212;box-shadow:0 16px 28px rgba(200,167,82,.18)}
      @media (max-width:900px),(max-height:820px){.yg-profile-edit-layer{padding:12px;align-items:center}.yg-profile-edit-shell{min-height:auto;margin-block:auto}}
      @media (max-width:900px){.yg-profile-edit-shell{grid-template-columns:1fr}}
      @media (max-width:640px){.yg-profile-edit-side,.yg-profile-edit-card{padding:20px;border-radius:24px}.yg-profile-edit-inline,.yg-profile-edit-avatar{grid-template-columns:1fr}.yg-profile-edit-summary-row,.yg-profile-edit-footer{flex-direction:column;align-items:stretch}.yg-profile-edit-summary-value{text-align:left}.yg-profile-edit-actions{justify-content:stretch}.yg-profile-edit-btn{width:100%}}
      @media (prefers-reduced-motion:reduce){.yg-profile-edit-bar,.yg-profile-edit-btn,.yg-profile-edit-input,.yg-profile-edit-textarea{transition:none!important}}
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
