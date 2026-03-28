import { applyBuyerPrivacy, applyMoneyPrivacy } from './agro-privacy.js';
import { normalizeBuyerGroupKey } from './agro-cartera-viva.js';
import { openPublicFarmerProfile } from './agropublico.js';

const SOCIAL_MODAL_ID = 'modal-agro-social';
const SOCIAL_STATUS_ID = 'agro-social-status';
const SOCIAL_FEED_LIST_ID = 'agro-social-feed-list';
const SOCIAL_THREADS_LIST_ID = 'agro-social-threads-list';
const SOCIAL_MESSAGES_ID = 'agro-social-messages';
const SOCIAL_THREAD_TITLE_ID = 'agro-social-thread-title';
const SOCIAL_NEW_THREAD_ID = 'agro-social-new-thread';
const SOCIAL_THREAD_INPUT_ID = 'agro-social-thread-title-input';
const SOCIAL_BUYER_KEY_INPUT_ID = 'agro-social-thread-buyer-key';
const SOCIAL_COMPOSER_FORM_ID = 'agro-social-composer-form';
const SOCIAL_COMPOSER_INPUT_ID = 'agro-social-composer';
const SOCIAL_SEND_BUTTON_ID = 'agro-social-send';

const state = {
    initialized: false,
    supabase: null,
    currentUser: null,
    currentThreadId: '',
    threads: [],
    lastFocusedTrigger: null,
    loadingFeed: false,
    loadingThreads: false,
    loadingMessages: false
};

function getModal() {
    return document.getElementById(SOCIAL_MODAL_ID);
}

function isOpen() {
    const modal = getModal();
    return !!(modal && modal.classList.contains('is-open'));
}

function setStatus(message = '', level = 'muted') {
    const status = document.getElementById(SOCIAL_STATUS_ID);
    if (!status) return;
    status.textContent = String(message || '');
    status.dataset.level = String(level || 'muted');
}

function setButtonBusy(id, busy, idleText) {
    const button = document.getElementById(id);
    if (!button) return;
    button.disabled = !!busy;
    button.textContent = busy ? 'Cargando...' : idleText;
}

function markBuyerNameNode(node, rawText) {
    if (!node) return;
    const value = String(rawText || node.textContent || '').trim();
    if (!value) return;
    node.dataset.buyerName = '1';
    node.dataset.rawName = value;
}

function applySocialPrivacy() {
    const modal = getModal();
    if (!modal) return;
    applyBuyerPrivacy(modal);
    applyMoneyPrivacy(modal);
}

function formatDateTime(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'N/D';
    return date.toLocaleString('es-VE', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
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

function resolveDisplayName(row) {
    const displayName = String(row?.display_name || '').trim();
    if (displayName) return displayName;
    return 'Agricultor';
}

function isMissingTableError(error, tableName) {
    const code = String(error?.code || '').toUpperCase();
    const text = `${String(error?.message || '')} ${String(error?.details || '')}`.toLowerCase();
    const table = String(tableName || '').toLowerCase();
    const mentionsTable = table ? text.includes(table) : true;

    return (
        code === '42P01' ||
        code === 'PGRST205' ||
        (mentionsTable && text.includes('does not exist')) ||
        (mentionsTable && text.includes('could not find'))
    );
}

async function resolveSessionUser() {
    if (state.currentUser?.id) return state.currentUser;
    const { data, error } = await state.supabase.auth.getUser();
    if (error) throw error;
    state.currentUser = data?.user || null;
    return state.currentUser;
}

function openModal(triggerElement = null) {
    const modal = getModal();
    if (!modal) return;

    if (triggerElement instanceof HTMLElement) {
        state.lastFocusedTrigger = triggerElement;
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('agro-social-open');

    const panel = modal.querySelector('.agro-social-panel');
    if (panel && typeof panel.focus === 'function') {
        requestAnimationFrame(() => {
            panel.focus({ preventScroll: true });
        });
    }
}

function closeModal() {
    const modal = getModal();
    if (!modal) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('agro-social-open');

    if (state.lastFocusedTrigger && typeof state.lastFocusedTrigger.focus === 'function') {
        state.lastFocusedTrigger.focus({ preventScroll: true });
    }
}

async function fetchPublicProfilesFeed() {
    state.loadingFeed = true;
    try {
        const { data, error } = await state.supabase
            .from('agro_public_profiles')
            .select('user_id,display_name,avatar_url,bio,location_text,instagram,whatsapp,updated_at')
            .eq('public_enabled', true)
            .order('updated_at', { ascending: false })
            .limit(30);

        if (error) throw error;
        return Array.isArray(data) ? data : [];
    } finally {
        state.loadingFeed = false;
    }
}

function createFeedItem(row) {
    const item = document.createElement('li');
    item.className = 'agro-social-feed-item';

    const head = document.createElement('div');
    head.className = 'agro-social-feed-head';

    const avatar = document.createElement('div');
    avatar.className = 'agro-social-feed-avatar';
    const avatarUrl = normalizeAvatarUrl(row?.avatar_url);
    if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = `Avatar de ${resolveDisplayName(row)}`;
        avatar.appendChild(img);
    } else {
        avatar.textContent = '👨‍🌾';
    }

    const identity = document.createElement('div');
    identity.className = 'agro-social-feed-identity';

    const nameEl = document.createElement('strong');
    nameEl.textContent = resolveDisplayName(row);
    markBuyerNameNode(nameEl, nameEl.textContent);

    const updatedEl = document.createElement('span');
    updatedEl.textContent = `Actualizado: ${formatDateTime(row?.updated_at)}`;

    identity.append(nameEl, updatedEl);

    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'agro-social-view-profile-btn';
    viewBtn.textContent = 'Ver perfil';
    viewBtn.addEventListener('click', () => {
        const userId = String(row?.user_id || '').trim();
        if (!userId) return;
        openPublicFarmerProfile(userId).catch((error) => {
            console.error('[AGRO_SOCIAL] open public profile error:', error);
            setStatus('No se pudo abrir el perfil publico seleccionado.', 'error');
        });
    });

    head.append(avatar, identity, viewBtn);

    const body = document.createElement('div');
    body.className = 'agro-social-feed-body';

    const location = document.createElement('p');
    location.className = 'agro-social-feed-meta';
    location.textContent = `Ubicacion: ${String(row?.location_text || 'Sin definir').trim() || 'Sin definir'}`;

    const contact = document.createElement('p');
    contact.className = 'agro-social-feed-meta';
    const ig = String(row?.instagram || '').trim();
    const wa = String(row?.whatsapp || '').trim();
    const contactParts = [];
    if (ig) contactParts.push(`IG: ${ig}`);
    if (wa) contactParts.push(`WA: ${wa}`);
    contact.textContent = contactParts.length ? contactParts.join(' · ') : 'Contacto: Sin definir';

    const bio = document.createElement('p');
    bio.className = 'agro-social-feed-bio';
    bio.textContent = String(row?.bio || 'Sin bio pública').trim() || 'Sin bio pública';

    body.append(location, contact, bio);
    item.append(head, body);
    return item;
}

function renderFeed(rows) {
    const list = document.getElementById(SOCIAL_FEED_LIST_ID);
    if (!list) return;

    list.replaceChildren();
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) {
        const empty = document.createElement('li');
        empty.className = 'agro-social-empty';
        empty.textContent = 'No hay perfiles públicos activos por ahora.';
        list.appendChild(empty);
        applySocialPrivacy();
        return;
    }

    const fragment = document.createDocumentFragment();
    safeRows.forEach((row) => {
        fragment.appendChild(createFeedItem(row));
    });
    list.appendChild(fragment);
    applySocialPrivacy();
}

async function fetchThreads(userId) {
    state.loadingThreads = true;
    try {
        const { data, error } = await state.supabase
            .from('agro_social_threads')
            .select('id,user_id,title,buyer_group_key,created_at,updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(150);

        if (error) throw error;
        return Array.isArray(data) ? data : [];
    } finally {
        state.loadingThreads = false;
    }
}

function renderThreadTitle(thread) {
    const token = String(thread?.title || '').trim();
    if (token) return token;
    return 'Hilo sin titulo';
}

function renderThreads(rows) {
    const list = document.getElementById(SOCIAL_THREADS_LIST_ID);
    if (!list) return;

    list.replaceChildren();
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) {
        const empty = document.createElement('li');
        empty.className = 'agro-social-empty';
        empty.textContent = 'No tienes hilos creados.';
        list.appendChild(empty);

        const title = document.getElementById(SOCIAL_THREAD_TITLE_ID);
        if (title) title.textContent = 'Selecciona un hilo';
        applySocialPrivacy();
        return;
    }

    const fragment = document.createDocumentFragment();

    safeRows.forEach((thread) => {
        const item = document.createElement('li');
        item.className = 'agro-social-thread-item';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'agro-social-thread-btn';
        button.dataset.threadId = String(thread.id || '');
        if (state.currentThreadId && state.currentThreadId === thread.id) {
            button.classList.add('is-active');
        }

        const title = document.createElement('strong');
        const titleText = renderThreadTitle(thread);
        title.textContent = titleText;
        markBuyerNameNode(title, titleText);

        const meta = document.createElement('span');
        const buyerKey = String(thread?.buyer_group_key || '').trim();
        if (buyerKey) {
            meta.textContent = `buyer_key: ${buyerKey} · ${formatDateTime(thread?.updated_at)}`;
        } else {
            meta.textContent = formatDateTime(thread?.updated_at);
        }

        button.append(title, meta);
        item.appendChild(button);
        fragment.appendChild(item);
    });

    list.appendChild(fragment);
    applySocialPrivacy();
}

async function fetchMessages(userId, threadId) {
    state.loadingMessages = true;
    try {
        const { data, error } = await state.supabase
            .from('agro_social_messages')
            .select('id,thread_id,user_id,role,body,created_at')
            .eq('user_id', userId)
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true })
            .limit(500);

        if (error) throw error;
        return Array.isArray(data) ? data : [];
    } finally {
        state.loadingMessages = false;
    }
}

function renderMessages(rows) {
    const list = document.getElementById(SOCIAL_MESSAGES_ID);
    if (!list) return;

    list.replaceChildren();
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) {
        const empty = document.createElement('div');
        empty.className = 'agro-social-empty';
        empty.textContent = 'Sin mensajes en este hilo.';
        list.appendChild(empty);
        applySocialPrivacy();
        return;
    }

    const fragment = document.createDocumentFragment();

    safeRows.forEach((message) => {
        const item = document.createElement('article');
        item.className = 'agro-social-message';
        if (String(message?.role || '').trim() === 'note') {
            item.classList.add('is-note');
        }

        const head = document.createElement('header');
        head.className = 'agro-social-message-head';

        const role = document.createElement('strong');
        role.textContent = String(message?.role || 'farmer').trim() === 'note' ? 'Nota privada' : 'Agricultor';

        const at = document.createElement('span');
        at.textContent = formatDateTime(message?.created_at);

        head.append(role, at);

        const body = document.createElement('p');
        body.className = 'agro-social-message-body';
        body.textContent = String(message?.body || '').trim() || '(sin contenido)';

        item.append(head, body);
        fragment.appendChild(item);
    });

    list.appendChild(fragment);
    list.scrollTop = list.scrollHeight;
    applySocialPrivacy();
}

function resolveActiveThreadTitle() {
    const thread = state.threads.find((row) => String(row?.id || '') === String(state.currentThreadId || ''));
    if (!thread) return 'Selecciona un hilo';
    return renderThreadTitle(thread);
}

function updateActiveThreadTitle() {
    const title = document.getElementById(SOCIAL_THREAD_TITLE_ID);
    if (!title) return;
    const text = resolveActiveThreadTitle();
    title.textContent = text;
    if (text && text !== 'Selecciona un hilo') {
        markBuyerNameNode(title, text);
    } else {
        delete title.dataset.buyerName;
        delete title.dataset.rawName;
    }
}

async function loadThreadMessages(threadId) {
    const user = await resolveSessionUser();
    if (!user?.id || !threadId) {
        renderMessages([]);
        return;
    }

    try {
        const rows = await fetchMessages(user.id, threadId);
        renderMessages(rows);
    } catch (error) {
        if (isMissingTableError(error, 'agro_social_messages')) {
            setStatus('Falta migracion social v1 (agro_social_messages).', 'warn');
            renderMessages([]);
            return;
        }
        console.error('[AGRO_SOCIAL] load messages error:', error);
        setStatus('No se pudieron cargar los mensajes del hilo.', 'error');
    }
}

async function refreshThreads() {
    const user = await resolveSessionUser();
    if (!user?.id) {
        state.threads = [];
        state.currentThreadId = '';
        renderThreads([]);
        renderMessages([]);
        return;
    }

    try {
        const rows = await fetchThreads(user.id);
        state.threads = rows;

        const hasCurrent = rows.some((row) => String(row?.id || '') === String(state.currentThreadId || ''));
        if (!hasCurrent) {
            state.currentThreadId = rows.length ? String(rows[0].id) : '';
        }

        renderThreads(rows);
        updateActiveThreadTitle();

        if (state.currentThreadId) {
            await loadThreadMessages(state.currentThreadId);
        } else {
            renderMessages([]);
        }
    } catch (error) {
        if (isMissingTableError(error, 'agro_social_threads')) {
            setStatus('Falta migracion social v1 (agro_social_threads).', 'warn');
            state.threads = [];
            state.currentThreadId = '';
            renderThreads([]);
            renderMessages([]);
            return;
        }
        console.error('[AGRO_SOCIAL] refresh threads error:', error);
        setStatus('No se pudieron cargar los hilos privados.', 'error');
    }
}

async function createThread() {
    const user = await resolveSessionUser();
    if (!user?.id) {
        setStatus('Sesion no disponible para crear hilos.', 'warn');
        return;
    }

    const titleInput = document.getElementById(SOCIAL_THREAD_INPUT_ID);
    const buyerKeyInput = document.getElementById(SOCIAL_BUYER_KEY_INPUT_ID);

    const rawTitle = String(titleInput?.value || '').trim();
    const rawBuyerKey = String(buyerKeyInput?.value || '').trim();

    const defaultTitle = `Hilo ${new Date().toLocaleDateString('es-VE')} ${new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
    const payload = {
        user_id: user.id,
        title: rawTitle || defaultTitle,
        buyer_group_key: normalizeBuyerGroupKey(rawBuyerKey) || null,
        updated_at: new Date().toISOString()
    };

    setButtonBusy(SOCIAL_NEW_THREAD_ID, true, '+ Nuevo hilo');
    try {
        const { data, error } = await state.supabase
            .from('agro_social_threads')
            .insert(payload)
            .select('id,user_id,title,buyer_group_key,created_at,updated_at')
            .maybeSingle();

        if (error) throw error;

        if (titleInput) titleInput.value = '';
        if (buyerKeyInput) buyerKeyInput.value = '';

        state.currentThreadId = String(data?.id || '');
        await refreshThreads();
        setStatus('Hilo creado correctamente.', 'ok');
    } catch (error) {
        if (isMissingTableError(error, 'agro_social_threads')) {
            setStatus('Falta migracion social v1 (agro_social_threads).', 'warn');
        } else {
            console.error('[AGRO_SOCIAL] create thread error:', error);
            setStatus('No se pudo crear el hilo.', 'error');
        }
    } finally {
        setButtonBusy(SOCIAL_NEW_THREAD_ID, false, '+ Nuevo hilo');
    }
}

async function sendMessage() {
    const user = await resolveSessionUser();
    if (!user?.id) {
        setStatus('Sesion no disponible para enviar mensaje.', 'warn');
        return;
    }
    if (!state.currentThreadId) {
        setStatus('Primero crea o selecciona un hilo.', 'warn');
        return;
    }

    const composer = document.getElementById(SOCIAL_COMPOSER_INPUT_ID);
    const body = String(composer?.value || '').trim();
    if (!body) {
        setStatus('Escribe un mensaje antes de enviar.', 'warn');
        return;
    }

    setButtonBusy(SOCIAL_SEND_BUTTON_ID, true, 'Enviar');
    try {
        const payload = {
            thread_id: state.currentThreadId,
            user_id: user.id,
            role: 'farmer',
            body
        };

        const { error } = await state.supabase
            .from('agro_social_messages')
            .insert(payload);

        if (error) throw error;

        await state.supabase
            .from('agro_social_threads')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', state.currentThreadId)
            .eq('user_id', user.id);

        if (composer) composer.value = '';
        await refreshThreads();
        setStatus('Mensaje guardado en bitacora privada.', 'ok');
    } catch (error) {
        if (isMissingTableError(error, 'agro_social_messages')) {
            setStatus('Falta migracion social v1 (agro_social_messages).', 'warn');
        } else {
            console.error('[AGRO_SOCIAL] send message error:', error);
            setStatus('No se pudo enviar el mensaje.', 'error');
        }
    } finally {
        setButtonBusy(SOCIAL_SEND_BUTTON_ID, false, 'Enviar');
    }
}

async function refreshSocialPanel() {
    setStatus('Cargando panel social...', 'muted');

    try {
        const feedRows = await fetchPublicProfilesFeed();
        renderFeed(feedRows);
    } catch (error) {
        console.error('[AGRO_SOCIAL] feed error:', error);
        renderFeed([]);
        setStatus('No se pudieron cargar perfiles publicos.', 'error');
    }

    await refreshThreads();

    if (!state.loadingFeed && !state.loadingThreads && !state.loadingMessages) {
        setStatus('Panel social listo.', 'ok');
    }
}

function bindEvents() {
    const modal = getModal();
    if (!modal) return;

    modal.querySelectorAll('[data-agro-social-close]').forEach((node) => {
        node.addEventListener('click', (event) => {
            event.preventDefault();
            closeModal();
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen()) {
            closeModal();
        }
    });

    const newThreadButton = document.getElementById(SOCIAL_NEW_THREAD_ID);
    if (newThreadButton) {
        newThreadButton.addEventListener('click', (event) => {
            event.preventDefault();
            createThread().catch((error) => {
                console.error('[AGRO_SOCIAL] create thread uncaught:', error);
                setStatus('No se pudo crear el hilo.', 'error');
            });
        });
    }

    const threadsList = document.getElementById(SOCIAL_THREADS_LIST_ID);
    if (threadsList) {
        threadsList.addEventListener('click', (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;

            const button = target.closest('.agro-social-thread-btn');
            if (!button) return;

            const threadId = String(button.dataset.threadId || '').trim();
            if (!threadId) return;

            state.currentThreadId = threadId;
            renderThreads(state.threads);
            updateActiveThreadTitle();
            loadThreadMessages(threadId).catch((error) => {
                console.error('[AGRO_SOCIAL] thread messages error:', error);
                setStatus('No se pudieron cargar mensajes del hilo.', 'error');
            });
        });
    }

    const composerForm = document.getElementById(SOCIAL_COMPOSER_FORM_ID);
    if (composerForm) {
        composerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            sendMessage().catch((error) => {
                console.error('[AGRO_SOCIAL] send message uncaught:', error);
                setStatus('No se pudo enviar el mensaje.', 'error');
            });
        });
    }
}

export async function openSocialPanel(triggerElement = null) {
    if (!state.initialized) return false;
    openModal(triggerElement);
    await refreshSocialPanel();
    return true;
}

export function initAgroSocial({ supabase } = {}) {
    if (state.initialized) return;
    if (!supabase) {
        console.warn('[AGRO_SOCIAL] Supabase client missing, modulo no inicializado.');
        return;
    }

    const modal = getModal();
    if (!modal) {
        console.warn('[AGRO_SOCIAL] modal-agro-social no encontrado.');
        return;
    }

    state.supabase = supabase;
    state.initialized = true;

    bindEvents();
    setStatus('Abre Social para cargar perfiles publicos y tus hilos privados.', 'muted');
}
