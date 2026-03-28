import { applyBuyerPrivacy, applyMoneyPrivacy } from './agro-privacy.js';
import { normalizeBuyerGroupKey } from './agro-cartera-viva.js';
import { openPublicFarmerProfile } from './agropublico.js';

const BUYER_MODAL_ID = 'modal-agro-buyer';
const BUYER_FORM_ID = 'agro-buyer-form';
const BUYER_STATUS_ID = 'agro-buyer-status';
const BUYER_TITLE_ID = 'agro-buyer-title';
const BUYER_SAVE_BUTTON_ID = 'btn-save-agro-buyer';
const BUYER_OPEN_PUBLIC_BUTTON_ID = 'btn-open-buyer-public-profile';

const BUYER_FIELD_IDS = [
    'display_name',
    'phone',
    'whatsapp',
    'instagram',
    'facebook',
    'notes',
    'linked_user_id'
];

const state = {
    initialized: false,
    supabase: null,
    currentUser: null,
    currentGroupKey: '',
    currentDisplayName: '',
    currentLinkedUserId: ''
};

function setBuyerStatus(message = '', level = 'muted') {
    const node = document.getElementById(BUYER_STATUS_ID);
    if (!node) return;
    node.textContent = String(message || '');
    node.dataset.level = String(level || 'muted');
}

function setSaveBusy(isBusy) {
    const button = document.getElementById(BUYER_SAVE_BUTTON_ID);
    if (!button) return;
    button.disabled = !!isBusy;
    button.textContent = isBusy ? 'Guardando...' : 'Guardar ficha';
}

function normalizeUuid(value) {
    return String(value || '').trim().toLowerCase();
}

function isValidUuid(value) {
    const token = normalizeUuid(value);
    if (!token) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token);
}

function syncOpenPublicButton() {
    const button = document.getElementById(BUYER_OPEN_PUBLIC_BUTTON_ID);
    if (!button) return;
    const linked = normalizeUuid(state.currentLinkedUserId);
    const hasLinked = !!linked;
    button.disabled = !hasLinked;
    button.title = hasLinked
        ? 'Abrir perfil público vinculado'
        : 'Comprador no vinculado a un user_id público';
}

async function resolveSessionUser() {
    if (state.currentUser?.id) return state.currentUser;
    const { data, error } = await state.supabase.auth.getUser();
    if (error) throw error;
    state.currentUser = data?.user || null;
    return state.currentUser;
}

function getBuyerModal() {
    return document.getElementById(BUYER_MODAL_ID);
}

function openBuyerModal() {
    const modal = getBuyerModal();
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('agro-buyer-open');

    const panel = modal.querySelector('.agro-buyer-panel');
    if (panel && typeof panel.focus === 'function') {
        requestAnimationFrame(() => {
            panel.focus({ preventScroll: true });
        });
    }
}

function closeBuyerModal() {
    const modal = getBuyerModal();
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('agro-buyer-open');
}

function fillBuyerForm(buyer = {}) {
    BUYER_FIELD_IDS.forEach((fieldName) => {
        const input = document.getElementById(`agro-buyer-${fieldName}`);
        if (!input) return;
        input.value = String(buyer?.[fieldName] || '').trim();
    });

    state.currentLinkedUserId = normalizeUuid(buyer?.linked_user_id || state.currentLinkedUserId || '');
    const linkedInput = document.getElementById('agro-buyer-linked_user_id');
    if (linkedInput) {
        linkedInput.value = state.currentLinkedUserId;
    }

    const title = document.getElementById(BUYER_TITLE_ID);
    if (title) {
        const displayName = String(
            buyer?.display_name
            || state.currentDisplayName
            || 'Comprador'
        ).trim() || 'Comprador';
        title.textContent = `Ficha del Comprador: ${displayName}`;
        title.dataset.buyerName = '1';
        title.dataset.rawName = displayName;
    }

    syncOpenPublicButton();
}

function readBuyerForm() {
    const payload = {};
    BUYER_FIELD_IDS.forEach((fieldName) => {
        const input = document.getElementById(`agro-buyer-${fieldName}`);
        if (!input) return;
        payload[fieldName] = String(input.value || '').trim();
    });
    return payload;
}

async function loadBuyer(userId, groupKey) {
    const { data, error } = await state.supabase
        .from('agro_buyers')
        .select('id,user_id,display_name,group_key,phone,whatsapp,instagram,facebook,notes,linked_user_id,created_at,updated_at')
        .eq('user_id', userId)
        .eq('group_key', groupKey)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

async function upsertBuyer(userId, groupKey, buyerData) {
    const rawLinkedUserId = String(buyerData?.linked_user_id || '').trim();
    let linkedUserId = normalizeUuid(state.currentLinkedUserId);
    if (rawLinkedUserId) {
        if (!isValidUuid(rawLinkedUserId)) {
            throw new Error('El user_id vinculado no tiene formato UUID válido.');
        }
        linkedUserId = normalizeUuid(rawLinkedUserId);
    }

    const payload = {
        user_id: userId,
        group_key: groupKey,
        display_name: String(buyerData?.display_name || state.currentDisplayName || '').trim() || state.currentDisplayName || 'Comprador',
        phone: String(buyerData?.phone || '').trim() || null,
        whatsapp: String(buyerData?.whatsapp || '').trim() || null,
        instagram: String(buyerData?.instagram || '').trim() || null,
        facebook: String(buyerData?.facebook || '').trim() || null,
        notes: String(buyerData?.notes || '').trim() || null,
        linked_user_id: linkedUserId || null,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await state.supabase
        .from('agro_buyers')
        .upsert(payload, { onConflict: 'user_id,group_key' })
        .select('id,user_id,display_name,group_key,phone,whatsapp,instagram,facebook,notes,linked_user_id,created_at,updated_at')
        .maybeSingle();

    if (error) throw error;
    return data || payload;
}

async function handleBuyerSave(event) {
    event?.preventDefault();

    if (!state.currentGroupKey) {
        setBuyerStatus('No se detectó comprador para guardar.', 'error');
        return;
    }

    setSaveBusy(true);
    setBuyerStatus('Guardando ficha...', 'muted');

    try {
        const user = await resolveSessionUser();
        if (!user?.id) {
            throw new Error('Sesión no disponible.');
        }

        const formData = readBuyerForm();
        const saved = await upsertBuyer(user.id, state.currentGroupKey, formData);
        state.currentDisplayName = String(saved?.display_name || state.currentDisplayName || '').trim() || state.currentDisplayName;
        state.currentLinkedUserId = normalizeUuid(saved?.linked_user_id || state.currentLinkedUserId || '');
        fillBuyerForm(saved);
        setBuyerStatus('Ficha guardada correctamente.', 'ok');

        const modal = getBuyerModal();
        if (modal) {
            applyBuyerPrivacy(modal);
            applyMoneyPrivacy(modal);
        }
    } catch (error) {
        console.error('[AGRO_BUYERS] save error:', error);
        const message = String(error?.message || '').trim();
        if (message.toLowerCase().includes('uuid')) {
            setBuyerStatus(message, 'warn');
        } else {
            setBuyerStatus('No se pudo guardar la ficha.', 'error');
        }
    } finally {
        setSaveBusy(false);
    }
}

async function handleOpenBuyerPublicProfile(event) {
    event?.preventDefault();
    const linkedUserId = normalizeUuid(state.currentLinkedUserId);
    if (!linkedUserId) {
        setBuyerStatus('Comprador no vinculado a usuario público.', 'warn');
        return;
    }

    try {
        await openPublicFarmerProfile(linkedUserId);
    } catch (error) {
        console.error('[AGRO_BUYERS] open public profile error:', error);
        setBuyerStatus('No se pudo abrir el perfil público vinculado.', 'error');
    }
}

function bindBuyerModalEvents() {
    const modal = getBuyerModal();
    if (!modal) return;

    modal.querySelectorAll('[data-agro-buyer-close]').forEach((node) => {
        node.addEventListener('click', (event) => {
            event.preventDefault();
            closeBuyerModal();
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeBuyerModal();
        }
    });

    const form = document.getElementById(BUYER_FORM_ID);
    if (form) {
        form.addEventListener('submit', handleBuyerSave);
    }

    const openPublicButton = document.getElementById(BUYER_OPEN_PUBLIC_BUTTON_ID);
    if (openPublicButton) {
        openPublicButton.addEventListener('click', handleOpenBuyerPublicProfile);
    }

    const linkedInput = document.getElementById('agro-buyer-linked_user_id');
    if (linkedInput) {
        linkedInput.addEventListener('input', () => {
            const raw = String(linkedInput.value || '').trim();
            if (!raw) {
                state.currentLinkedUserId = '';
                syncOpenPublicButton();
                return;
            }
            state.currentLinkedUserId = normalizeUuid(raw);
            syncOpenPublicButton();
        });
    }
}

export async function openBuyerProfileByName(displayName) {
    const safeName = String(displayName || '').trim();
    const groupKey = normalizeBuyerGroupKey(safeName);
    if (!safeName || !groupKey) return false;

    state.currentDisplayName = safeName;
    state.currentGroupKey = groupKey;
    state.currentLinkedUserId = '';
    openBuyerModal();
    setBuyerStatus('Cargando ficha del comprador...', 'muted');

    try {
        const user = await resolveSessionUser();
        if (!user?.id) {
            throw new Error('Sesión no disponible.');
        }

        const buyer = await loadBuyer(user.id, groupKey);
        if (buyer) {
            fillBuyerForm(buyer);
            setBuyerStatus('Ficha cargada.', 'ok');
        } else {
            fillBuyerForm({ display_name: safeName });
            setBuyerStatus('Comprador nuevo. Completa los datos y guarda.', 'warn');
        }

        const modal = getBuyerModal();
        if (modal) {
            applyBuyerPrivacy(modal);
            applyMoneyPrivacy(modal);
        }
    } catch (error) {
        console.error('[AGRO_BUYERS] open error:', error);
        setBuyerStatus('No se pudo cargar la ficha.', 'error');
    }

    return true;
}

export function initAgroCompradores({ supabase } = {}) {
    if (state.initialized) return;
    if (!supabase) {
        console.warn('[AGRO_BUYERS] Supabase client missing, módulo no inicializado.');
        return;
    }

    const modal = getBuyerModal();
    if (!modal) {
        console.warn('[AGRO_BUYERS] modal-agro-buyer no encontrado.');
        return;
    }

    state.supabase = supabase;
    state.initialized = true;

    bindBuyerModalEvents();
    syncOpenPublicButton();
    setBuyerStatus('Haz clic en un comprador del historial o rankings.', 'muted');
}

export { normalizeBuyerGroupKey as normalizeGroupKey };
