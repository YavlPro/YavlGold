import { applyBuyerPrivacy, applyMoneyPrivacy } from './agro-privacy.js';

const PUBLIC_MODAL_ID = 'modal-agro-public-profile';
const PUBLIC_STATUS_ID = 'agro-public-status';
const PUBLIC_VISIBILITY_ID = 'agro-public-visibility';
const PUBLIC_TITLE_ID = 'agro-public-title';
const PUBLIC_AVATAR_ID = 'agro-public-avatar';

const DEFAULT_AVATAR_EMOJI = '👨‍🌾';
const PUBLIC_PLACEHOLDER = 'No disponible';

const state = {
    initialized: false,
    supabase: null,
    currentUser: null,
    lastOpenedUserId: ''
};

function getPublicModal() {
    return document.getElementById(PUBLIC_MODAL_ID);
}

function isModalOpen() {
    const modal = getPublicModal();
    return !!(modal && modal.classList.contains('is-open'));
}

function setPublicStatus(message = '', level = 'muted') {
    const status = document.getElementById(PUBLIC_STATUS_ID);
    if (!status) return;
    status.textContent = String(message || '');
    status.dataset.level = String(level || 'muted');
}

function setPublicVisibility(enabled, isOwner) {
    const badge = document.getElementById(PUBLIC_VISIBILITY_ID);
    if (!badge) return;

    if (enabled) {
        badge.textContent = 'PUBLICO';
        badge.dataset.state = 'public';
        return;
    }

    if (isOwner) {
        badge.textContent = 'PRIVADO (vista dueno)';
        badge.dataset.state = 'owner';
        return;
    }

    badge.textContent = 'PRIVADO';
    badge.dataset.state = 'private';
}

function normalizeAvatarUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
        const parsed = new URL(raw);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
            return parsed.toString();
        }
    } catch (_error) {
        return '';
    }
    return '';
}

function renderAvatarNode(container, avatarUrl, altText) {
    if (!container) return;
    const safeUrl = normalizeAvatarUrl(avatarUrl);

    if (!safeUrl) {
        container.textContent = DEFAULT_AVATAR_EMOJI;
        container.style.overflow = '';
        return;
    }

    let img = container.querySelector('img');
    if (!img) {
        container.textContent = '';
        img = document.createElement('img');
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        container.appendChild(img);
    }

    img.alt = altText || 'Avatar publico';
    img.src = safeUrl;
    container.style.overflow = 'hidden';
}

function setPublicFieldText(elementId, value, { markName = false } = {}) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const text = String(value || '').trim() || PUBLIC_PLACEHOLDER;
    el.textContent = text;

    if (markName && text !== PUBLIC_PLACEHOLDER) {
        el.dataset.buyerName = '1';
        el.dataset.rawName = text;
    } else {
        delete el.dataset.buyerName;
        delete el.dataset.rawName;
    }
}

function clearPublicFields() {
    setPublicFieldText('agro-public-display_name', PUBLIC_PLACEHOLDER);
    setPublicFieldText('agro-public-location_text', PUBLIC_PLACEHOLDER);
    setPublicFieldText('agro-public-whatsapp', PUBLIC_PLACEHOLDER);
    setPublicFieldText('agro-public-instagram', PUBLIC_PLACEHOLDER);
    setPublicFieldText('agro-public-bio', PUBLIC_PLACEHOLDER);

    const avatar = document.getElementById(PUBLIC_AVATAR_ID);
    if (avatar) {
        avatar.textContent = DEFAULT_AVATAR_EMOJI;
        avatar.style.overflow = '';
    }
}

function fillPublicFields(profile = {}, isOwner = false) {
    const enabled = !!profile?.public_enabled;
    const displayName = String(profile?.display_name || '').trim() || (isOwner ? 'Perfil sin nombre publico' : PUBLIC_PLACEHOLDER);

    const title = document.getElementById(PUBLIC_TITLE_ID);
    if (title) {
        title.textContent = `Perfil Publico de ${displayName === PUBLIC_PLACEHOLDER ? 'Agricultor' : displayName}`;
    }

    setPublicVisibility(enabled, isOwner);

    setPublicFieldText('agro-public-display_name', profile?.display_name, { markName: true });
    setPublicFieldText('agro-public-location_text', profile?.location_text, { markName: true });
    setPublicFieldText('agro-public-whatsapp', profile?.whatsapp, { markName: true });
    setPublicFieldText('agro-public-instagram', profile?.instagram, { markName: true });
    setPublicFieldText('agro-public-bio', profile?.bio, { markName: true });

    const avatar = document.getElementById(PUBLIC_AVATAR_ID);
    renderAvatarNode(avatar, profile?.avatar_url, displayName);
}

function openPublicModal() {
    const modal = getPublicModal();
    if (!modal) return;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('agro-public-open');

    const panel = modal.querySelector('.agro-public-panel');
    if (panel && typeof panel.focus === 'function') {
        requestAnimationFrame(() => {
            panel.focus({ preventScroll: true });
        });
    }
}

function closePublicModal() {
    const modal = getPublicModal();
    if (!modal) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('agro-public-open');
}

async function resolveSessionUser() {
    if (state.currentUser?.id) return state.currentUser;

    const { data, error } = await state.supabase.auth.getUser();
    if (error) throw error;

    state.currentUser = data?.user || null;
    return state.currentUser;
}

async function fetchPublicProfile(userId) {
    const { data, error } = await state.supabase
        .from('agro_public_profiles')
        .select('user_id,public_enabled,display_name,avatar_url,bio,location_text,whatsapp,instagram,created_at,updated_at')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

function bindModalEvents() {
    const modal = getPublicModal();
    if (!modal) return;

    modal.querySelectorAll('[data-agro-public-close]').forEach((node) => {
        node.addEventListener('click', (event) => {
            event.preventDefault();
            closePublicModal();
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isModalOpen()) {
            closePublicModal();
        }
    });
}

export async function openPublicFarmerProfile(userId) {
    const targetUserId = String(userId || '').trim();
    if (!targetUserId) return false;
    if (!state.supabase) return false;

    state.lastOpenedUserId = targetUserId;
    openPublicModal();
    clearPublicFields();
    setPublicStatus('Cargando perfil publico...', 'muted');

    try {
        const viewer = await resolveSessionUser();
        const isOwner = !!viewer?.id && viewer.id === targetUserId;

        const publicProfile = await fetchPublicProfile(targetUserId);
        if (!publicProfile) {
            setPublicVisibility(false, isOwner);
            if (isOwner) {
                setPublicStatus('Aun no has configurado tu perfil publico.', 'warn');
            } else {
                setPublicStatus('Perfil privado o no disponible.', 'warn');
            }
            return true;
        }

        if (!publicProfile.public_enabled && !isOwner) {
            setPublicVisibility(false, false);
            clearPublicFields();
            setPublicStatus('Perfil privado.', 'warn');
            return true;
        }

        fillPublicFields(publicProfile, isOwner);
        setPublicStatus(publicProfile.public_enabled ? 'Perfil publico disponible.' : 'Vista privada de propietario.', 'ok');

        const modal = getPublicModal();
        if (modal) {
            applyBuyerPrivacy(modal);
            applyMoneyPrivacy(modal);
        }
    } catch (error) {
        console.error('[AGRO_PUBLIC_PROFILE] open error:', error);
        setPublicStatus('No se pudo cargar el perfil publico.', 'error');
    }

    return true;
}

export function initAgroPublico({ supabase } = {}) {
    if (state.initialized) return;
    if (!supabase) {
        console.warn('[AGRO_PUBLIC_PROFILE] Supabase client missing, modulo no inicializado.');
        return;
    }

    const modal = getPublicModal();
    if (!modal) {
        console.warn('[AGRO_PUBLIC_PROFILE] modal-agro-public-profile no encontrado.');
        return;
    }

    state.supabase = supabase;
    state.initialized = true;

    bindModalEvents();
    clearPublicFields();
    setPublicVisibility(false, false);
    setPublicStatus('Selecciona un agricultor para ver su perfil publico.', 'muted');
}
