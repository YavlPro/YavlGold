import { applyBuyerPrivacy, applyMoneyPrivacy } from './agro-privacy.js';
import { normalizeBuyerGroupKey } from './agro-cartera-viva.js';
import { openPublicFarmerProfile } from './agropublico.js';

const BUYER_MODAL_ID = 'modal-agro-buyer';
const BUYER_FORM_ID = 'agro-buyer-form';
const BUYER_STATUS_ID = 'agro-buyer-status';
const BUYER_TITLE_ID = 'agro-buyer-title';
const BUYER_EYEBROW_ID = 'agro-buyer-eyebrow';
const BUYER_SAVE_BUTTON_ID = 'btn-save-agro-buyer';
const BUYER_OPEN_PUBLIC_BUTTON_ID = 'btn-open-buyer-public-profile';
const BUYER_ARCHIVE_BUTTON_ID = 'btn-archive-agro-buyer';
const BUYER_DELETE_BUTTON_ID = 'btn-delete-agro-buyer';
const BUYER_DELETE_CONFIRM_MODAL_ID = 'modal-agro-buyer-delete-confirm';
const BUYER_DELETE_CONFIRM_TITLE_ID = 'agro-buyer-delete-title';
const BUYER_DELETE_CONFIRM_COPY_ID = 'agro-buyer-delete-copy';
const BUYER_DELETE_CONFIRM_IMPACT_ID = 'agro-buyer-delete-impact';
const BUYER_DELETE_CONFIRM_BUTTON_ID = 'btn-confirm-agro-buyer-delete';
const BUYER_DUPLICATE_CREATE_MESSAGE = 'Este cliente ya existe y no se puede crear de nuevo.';
const BUYER_DUPLICATE_EDIT_MESSAGE = 'Ya existe otro cliente con ese nombre canónico y no se puede guardar.';

const BUYER_SELECT = [
    'id',
    'user_id',
    'display_name',
    'group_key',
    'canonical_name',
    'status',
    'phone',
    'whatsapp',
    'instagram',
    'facebook',
    'notes',
    'linked_user_id',
    'created_at',
    'updated_at'
].join(',');

const BUYER_FIELD_IDS = [
    'display_name',
    'phone',
    'whatsapp',
    'instagram',
    'facebook',
    'notes',
    'linked_user_id'
];

const BUYER_MOVEMENT_TABLES = Object.freeze([
    'agro_pending',
    'agro_income',
    'agro_losses'
]);

const state = {
    initialized: false,
    supabase: null,
    currentUser: null,
    currentBuyerId: '',
    currentGroupKey: '',
    currentCanonicalName: '',
    currentDisplayName: '',
    currentLinkedUserId: '',
    currentStatus: 'active',
    currentHistoryCount: 0,
    mode: 'edit',
    pendingDeleteResolver: null
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
    button.textContent = isBusy ? 'Guardando...' : 'Guardar cliente';
}

function normalizeUuid(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeClientStatus(value) {
    return String(value || '').trim().toLowerCase() === 'archived' ? 'archived' : 'active';
}

function isValidUuid(value) {
    const token = normalizeUuid(value);
    if (!token) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token);
}

function getBuyerModal() {
    return document.getElementById(BUYER_MODAL_ID);
}

function getBuyerDeleteConfirmModal() {
    return document.getElementById(BUYER_DELETE_CONFIRM_MODAL_ID);
}

function isBuyerDeleteConfirmOpen() {
    const modal = getBuyerDeleteConfirmModal();
    return !!modal && modal.classList.contains('is-open');
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
    if (state.pendingDeleteResolver) {
        const resolve = state.pendingDeleteResolver;
        state.pendingDeleteResolver = null;
        resolve(false);
    }

    const confirmModal = getBuyerDeleteConfirmModal();
    if (confirmModal) {
        confirmModal.classList.remove('is-open');
        confirmModal.setAttribute('aria-hidden', 'true');
    }

    const modal = getBuyerModal();
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('agro-buyer-open');
}

function openBuyerDeleteConfirmModal() {
    const modal = getBuyerDeleteConfirmModal();
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    const panel = modal.querySelector('.agro-buyer-confirm-panel');
    if (panel && typeof panel.focus === 'function') {
        requestAnimationFrame(() => {
            panel.focus({ preventScroll: true });
        });
    }
}

function closeBuyerDeleteConfirmModal() {
    const modal = getBuyerDeleteConfirmModal();
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
}

function settleBuyerDeleteConfirmation(confirmed = false) {
    const resolve = state.pendingDeleteResolver;
    state.pendingDeleteResolver = null;
    closeBuyerDeleteConfirmModal();
    if (typeof resolve === 'function') {
        resolve(confirmed === true);
    }
}

function focusBuyerNameField(selectText = false) {
    const input = document.getElementById('agro-buyer-display_name');
    if (!input || typeof input.focus !== 'function') return;
    requestAnimationFrame(() => {
        input.focus({ preventScroll: false });
        if (selectText && typeof input.select === 'function') {
            input.select();
        }
    });
}

function getBuyerDuplicateMessage() {
    return state.mode === 'create'
        ? BUYER_DUPLICATE_CREATE_MESSAGE
        : BUYER_DUPLICATE_EDIT_MESSAGE;
}

function showBuyerDuplicateStatus() {
    setBuyerStatus(getBuyerDuplicateMessage(), 'warn');
    focusBuyerNameField(true);
}

function setBuyerDeleteConfirmContent({ title = 'Eliminar cliente', copy = '¿Deseas eliminar este cliente?', impactLines = [] } = {}) {
    const titleNode = document.getElementById(BUYER_DELETE_CONFIRM_TITLE_ID);
    const copyNode = document.getElementById(BUYER_DELETE_CONFIRM_COPY_ID);
    const impactNode = document.getElementById(BUYER_DELETE_CONFIRM_IMPACT_ID);
    const confirmButton = document.getElementById(BUYER_DELETE_CONFIRM_BUTTON_ID);

    if (titleNode) titleNode.textContent = title;
    if (copyNode) copyNode.textContent = copy;
    if (confirmButton) confirmButton.textContent = 'Sí, eliminar';

    if (impactNode) {
        const safeLines = Array.isArray(impactLines) ? impactLines.filter(Boolean) : [];
        impactNode.innerHTML = safeLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
        impactNode.hidden = safeLines.length <= 0;
    }
}

function requestBuyerDeleteConfirmation(config = {}) {
    const modal = getBuyerDeleteConfirmModal();
    const title = String(config?.title || 'Eliminar cliente').trim() || 'Eliminar cliente';
    const copy = String(config?.copy || '¿Deseas eliminar este cliente?').trim() || '¿Deseas eliminar este cliente?';
    const impactLines = Array.isArray(config?.impactLines) ? config.impactLines : [];

    if (!modal) {
        if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
            const promptBody = [copy].concat(impactLines).join('\n\n');
            return Promise.resolve(window.confirm(promptBody));
        }
        return Promise.resolve(false);
    }

    if (state.pendingDeleteResolver) {
        settleBuyerDeleteConfirmation(false);
    }

    setBuyerDeleteConfirmContent({ title, copy, impactLines });
    openBuyerDeleteConfirmModal();

    return new Promise((resolve) => {
        state.pendingDeleteResolver = resolve;
    });
}

function focusBuyerLifecycleAction(action = '') {
    const actionId = String(action || '').trim().toLowerCase() === 'delete'
        ? BUYER_DELETE_BUTTON_ID
        : BUYER_ARCHIVE_BUTTON_ID;
    const button = document.getElementById(actionId);
    if (!button || typeof button.focus !== 'function') return;
    requestAnimationFrame(() => {
        button.focus({ preventScroll: false });
    });
}

function emitClientChanged(detail = {}) {
    document.dispatchEvent(new CustomEvent('agro:client:changed', {
        detail: {
            clientId: String(detail.clientId || '').trim(),
            groupKey: normalizeBuyerGroupKey(detail.groupKey || ''),
            openDetail: detail.openDetail === true,
            duplicate: detail.duplicate === true,
            deleted: detail.deleted === true,
            created: detail.created === true
        }
    }));
}

function syncOpenPublicButton() {
    const button = document.getElementById(BUYER_OPEN_PUBLIC_BUTTON_ID);
    if (!button) return;
    const linked = normalizeUuid(state.currentLinkedUserId);
    const hasLinked = !!linked;
    button.disabled = !hasLinked;
    button.title = hasLinked
        ? 'Abrir perfil público vinculado'
        : 'Cliente no vinculado a un user_id público';
}

function syncLifecycleButtons() {
    const archiveButton = document.getElementById(BUYER_ARCHIVE_BUTTON_ID);
    const deleteButton = document.getElementById(BUYER_DELETE_BUTTON_ID);
    const hasBuyer = !!state.currentBuyerId;
    const hasHistory = Number(state.currentHistoryCount || 0) > 0;
    const isArchived = state.currentStatus === 'archived';

    if (archiveButton) {
        archiveButton.disabled = !hasBuyer || (!hasHistory && !isArchived);
        archiveButton.textContent = isArchived ? 'Reactivar cliente' : 'Archivar cliente';
        archiveButton.title = !hasBuyer
            ? 'Guarda el cliente primero'
            : (!hasHistory && !isArchived
                ? 'Solo archivamos clientes con historial'
                : (isArchived ? 'Volver a activar este cliente' : 'Mantener este cliente fuera del flujo activo'));
    }

    if (deleteButton) {
        deleteButton.disabled = !hasBuyer;
        deleteButton.textContent = hasHistory ? 'Eliminar cliente + cartera' : 'Eliminar cliente';
        deleteButton.title = !hasBuyer
            ? 'Guarda el cliente primero'
            : (hasHistory
                ? 'Eliminar cliente y su cartera relacionada con cascada segura'
                : 'Eliminar cliente sin historial');
    }
}

function syncBuyerHeading() {
    const eyebrow = document.getElementById(BUYER_EYEBROW_ID);
    const title = document.getElementById(BUYER_TITLE_ID);
    const displayName = String(state.currentDisplayName || '').trim() || 'Cliente';
    const hasHistory = Number(state.currentHistoryCount || 0) > 0;

    if (eyebrow) {
        if (state.mode === 'create') {
            eyebrow.textContent = 'Cliente nuevo';
        } else if (state.currentStatus === 'archived') {
            eyebrow.textContent = 'Cliente archivado';
        } else if (hasHistory) {
            eyebrow.textContent = 'Cliente con historial';
        } else {
            eyebrow.textContent = 'Cliente listo para registrar';
        }
    }

    if (title) {
        title.textContent = state.mode === 'create'
            ? 'Nuevo cliente'
            : `Ficha del Cliente: ${displayName}`;
        title.dataset.buyerName = '1';
        title.dataset.rawName = displayName;
    }
}

async function resolveSessionUser() {
    if (state.currentUser?.id) return state.currentUser;
    const { data, error } = await state.supabase.auth.getUser();
    if (error) throw error;
    state.currentUser = data?.user || null;
    return state.currentUser;
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

function fillBuyerForm(buyer = {}) {
    BUYER_FIELD_IDS.forEach((fieldName) => {
        const input = document.getElementById(`agro-buyer-${fieldName}`);
        if (!input) return;
        input.value = String(buyer?.[fieldName] || '').trim();
    });

    state.currentBuyerId = String(buyer?.id || state.currentBuyerId || '').trim();
    state.currentDisplayName = String(buyer?.display_name || state.currentDisplayName || '').trim();
    state.currentGroupKey = String(buyer?.group_key || state.currentGroupKey || normalizeBuyerGroupKey(state.currentDisplayName)).trim();
    state.currentCanonicalName = String(buyer?.canonical_name || state.currentCanonicalName || state.currentGroupKey).trim();
    state.currentStatus = normalizeClientStatus(buyer?.status || state.currentStatus);
    state.currentLinkedUserId = normalizeUuid(buyer?.linked_user_id || state.currentLinkedUserId || '');

    const linkedInput = document.getElementById('agro-buyer-linked_user_id');
    if (linkedInput) {
        linkedInput.value = state.currentLinkedUserId;
    }

    syncBuyerHeading();
    syncOpenPublicButton();
    syncLifecycleButtons();
}

async function loadBuyerByGroupKey(userId, groupKey) {
    const { data, error } = await state.supabase
        .from('agro_buyers')
        .select(BUYER_SELECT)
        .eq('user_id', userId)
        .eq('group_key', groupKey)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

async function loadBuyerById(userId, buyerId) {
    const { data, error } = await state.supabase
        .from('agro_buyers')
        .select(BUYER_SELECT)
        .eq('user_id', userId)
        .eq('id', buyerId)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

async function loadBuyerByCanonicalName(userId, canonicalName) {
    const { data, error } = await state.supabase
        .from('agro_buyers')
        .select(BUYER_SELECT)
        .eq('user_id', userId)
        .eq('canonical_name', canonicalName)
        .maybeSingle();

    if (error) {
        const fallback = await state.supabase
            .from('agro_buyers')
            .select(BUYER_SELECT)
            .eq('user_id', userId)
            .eq('group_key', canonicalName)
            .maybeSingle();

        if (fallback.error) throw fallback.error;
        return fallback.data || null;
    }

    return data || null;
}

async function findBuyerDuplicateByNormalizedName(userId, rawName, excludeBuyerId = '') {
    const targetCanonical = normalizeBuyerGroupKey(rawName);
    if (!targetCanonical) return null;

    const { data, error } = await state.supabase
        .from('agro_buyers')
        .select(BUYER_SELECT)
        .eq('user_id', userId);

    if (error) throw error;

    const safeExcludeId = String(excludeBuyerId || '').trim();
    const buyers = Array.isArray(data) ? data : [];

    return buyers.find((buyer) => {
        if (safeExcludeId && String(buyer?.id || '').trim() === safeExcludeId) return false;
        const candidateTokens = [
            buyer?.canonical_name,
            buyer?.group_key,
            buyer?.display_name
        ]
            .map((value) => normalizeBuyerGroupKey(value))
            .filter(Boolean);

        return candidateTokens.includes(targetCanonical);
    }) || null;
}

function isBuyerCanonicalConflictError(error) {
    const message = String(error?.message || error || '').trim().toLowerCase();
    const details = String(error?.details || '').trim().toLowerCase();
    return message.includes('duplicate key value violates unique constraint')
        || message.includes('agro_buyers_user_group_key_uidx')
        || message.includes('agro_buyers_user_canonical_name_uidx')
        || details.includes('agro_buyers_user_group_key_uidx')
        || details.includes('agro_buyers_user_canonical_name_uidx');
}

async function fetchHistoryCountForTable(tableName, userId, buyerId, groupKey) {
    const idQuery = state.supabase
        .from(tableName)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null)
        .eq('buyer_id', buyerId);

    const groupQuery = groupKey
        ? state.supabase
            .from(tableName)
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('deleted_at', null)
            .is('buyer_id', null)
            .eq('buyer_group_key', groupKey)
        : Promise.resolve({ count: 0, error: null });

    const [idResult, groupResult] = await Promise.all([idQuery, groupQuery]);
    if (idResult?.error) throw idResult.error;
    if (groupResult?.error) throw groupResult.error;
    return Number(idResult?.count || 0) + Number(groupResult?.count || 0);
}

async function fetchBuyerDeleteScopeSummary(userId, buyerId, groupKey) {
    const movementCounts = {};

    await Promise.all(BUYER_MOVEMENT_TABLES.map(async (tableName) => {
        movementCounts[tableName] = await fetchHistoryCountForTable(tableName, userId, buyerId, groupKey);
    }));

    let socialThreadCount = 0;
    if (groupKey) {
        const threadResult = await state.supabase
            .from('agro_social_threads')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('buyer_group_key', groupKey);

        if (threadResult.error) throw threadResult.error;
        socialThreadCount = Number(threadResult.count || 0);
    }

    const historyCount = BUYER_MOVEMENT_TABLES.reduce(
        (total, tableName) => total + Number(movementCounts[tableName] || 0),
        0
    );

    return {
        movementCounts,
        historyCount,
        socialThreadCount
    };
}

async function refreshHistoryCount() {
    if (!state.currentBuyerId || !state.currentUser?.id) {
        state.currentHistoryCount = 0;
        syncBuyerHeading();
        syncLifecycleButtons();
        return 0;
    }

    const counts = await Promise.all(
        BUYER_MOVEMENT_TABLES.map((tableName) =>
            fetchHistoryCountForTable(tableName, state.currentUser.id, state.currentBuyerId, state.currentGroupKey)
        )
    );

    state.currentHistoryCount = counts.reduce((total, value) => total + Number(value || 0), 0);
    syncBuyerHeading();
    syncLifecycleButtons();
    return state.currentHistoryCount;
}

function isMissingBuyerDeleteCascadeRpc(error) {
    const code = String(error?.code || '').trim().toUpperCase();
    const message = String(error?.message || '').trim().toLowerCase();
    return code === 'PGRST202'
        || code === '42883'
        || message.includes('agro_delete_buyer_cascade_v1');
}

async function deleteBuyerWithoutHistory(userId) {
    const threadResult = await state.supabase
        .from('agro_social_threads')
        .delete()
        .eq('user_id', userId)
        .eq('buyer_group_key', state.currentGroupKey);

    if (threadResult.error) throw threadResult.error;

    const deleteResult = await state.supabase
        .from('agro_buyers')
        .delete()
        .eq('id', state.currentBuyerId)
        .eq('user_id', userId);

    if (deleteResult.error) throw deleteResult.error;
}

async function deleteBuyerWithCascade() {
    const rpcResult = await state.supabase.rpc('agro_delete_buyer_cascade_v1', {
        p_buyer_id: state.currentBuyerId
    });

    if (rpcResult.error) throw rpcResult.error;
    return rpcResult.data || null;
}

async function updateMovementLinks(userId, buyerId, oldGroupKey, nextGroupKey) {
    const safeBuyerId = String(buyerId || '').trim();
    const safeOldGroupKey = String(oldGroupKey || '').trim();
    const safeNextGroupKey = String(nextGroupKey || '').trim();
    if (!safeBuyerId || !safeNextGroupKey) return;

    await Promise.all(BUYER_MOVEMENT_TABLES.map(async (tableName) => {
        const linkedResult = await state.supabase
            .from(tableName)
            .update({
                buyer_group_key: safeNextGroupKey,
                buyer_match_status: 'matched'
            })
            .eq('user_id', userId)
            .eq('buyer_id', safeBuyerId);

        if (linkedResult.error) throw linkedResult.error;

        if (!safeOldGroupKey) return;

        const legacyResult = await state.supabase
            .from(tableName)
            .update({
                buyer_id: safeBuyerId,
                buyer_group_key: safeNextGroupKey,
                buyer_match_status: 'matched'
            })
            .eq('user_id', userId)
            .is('buyer_id', null)
            .eq('buyer_group_key', safeOldGroupKey);

        if (legacyResult.error) throw legacyResult.error;
    }));

    if (safeOldGroupKey && safeOldGroupKey !== safeNextGroupKey) {
        const threadResult = await state.supabase
            .from('agro_social_threads')
            .update({ buyer_group_key: safeNextGroupKey })
            .eq('user_id', userId)
            .eq('buyer_group_key', safeOldGroupKey);

        if (threadResult.error) throw threadResult.error;
    }
}

async function handleBuyerSave(event) {
    event?.preventDefault();

    setSaveBusy(true);
    setBuyerStatus('Guardando cliente...', 'muted');

    try {
        const user = await resolveSessionUser();
        if (!user?.id) {
            throw new Error('Sesión no disponible.');
        }

        const formData = readBuyerForm();
        const displayName = String(formData?.display_name || '').trim();
        const canonicalName = normalizeBuyerGroupKey(displayName);
        const isCreateMode = !state.currentBuyerId;
        if (!displayName || !canonicalName) {
            throw new Error('Ingresa un nombre válido para este cliente.');
        }

        const duplicate = await findBuyerDuplicateByNormalizedName(user.id, displayName, state.currentBuyerId);
        if (duplicate?.id && String(duplicate.id) !== String(state.currentBuyerId || '')) {
            showBuyerDuplicateStatus();
            return;
        }

        const rawLinkedUserId = String(formData?.linked_user_id || '').trim();
        let linkedUserId = normalizeUuid(state.currentLinkedUserId);
        if (rawLinkedUserId) {
            if (!isValidUuid(rawLinkedUserId)) {
                throw new Error('El user_id vinculado no tiene formato UUID válido.');
            }
            linkedUserId = normalizeUuid(rawLinkedUserId);
        }

        const payload = {
            display_name: displayName,
            group_key: canonicalName,
            canonical_name: canonicalName,
            status: normalizeClientStatus(state.currentStatus),
            phone: String(formData?.phone || '').trim() || null,
            whatsapp: String(formData?.whatsapp || '').trim() || null,
            instagram: String(formData?.instagram || '').trim() || null,
            facebook: String(formData?.facebook || '').trim() || null,
            notes: String(formData?.notes || '').trim() || null,
            linked_user_id: linkedUserId || null,
            updated_at: new Date().toISOString()
        };

        const previousGroupKey = state.currentGroupKey;
        let saved;
        if (state.currentBuyerId) {
            const { data, error } = await state.supabase
                .from('agro_buyers')
                .update(payload)
                .eq('id', state.currentBuyerId)
                .eq('user_id', user.id)
                .select(BUYER_SELECT)
                .maybeSingle();

            if (error) throw error;
            saved = data || null;
        } else {
            const { data, error } = await state.supabase
                .from('agro_buyers')
                .insert([{
                    user_id: user.id,
                    ...payload
                }])
                .select(BUYER_SELECT)
                .single();

            if (error) throw error;
            saved = data || null;
        }

        if (!saved?.id) {
            throw new Error('No se pudo guardar el cliente.');
        }

        await updateMovementLinks(user.id, saved.id, previousGroupKey, saved.group_key || canonicalName);

        fillBuyerForm(saved);
        await refreshHistoryCount();

        const shouldOpenDetail = state.mode === 'create';
        emitClientChanged({
            clientId: saved.id,
            groupKey: saved.group_key || saved.canonical_name || canonicalName,
            openDetail: shouldOpenDetail,
            created: isCreateMode
        });

        if (shouldOpenDetail) {
            closeBuyerModal();
            return;
        }

        setBuyerStatus('Cliente guardado correctamente.', 'ok');
    } catch (error) {
        console.error('[AGRO_CLIENTS] save error:', error);
        if (isBuyerCanonicalConflictError(error)) {
            showBuyerDuplicateStatus();
            return;
        }
        const message = String(error?.message || '').trim();
        if (message.toLowerCase().includes('uuid')) {
            setBuyerStatus(message, 'warn');
        } else {
            setBuyerStatus(message || 'No se pudo guardar el cliente.', 'error');
        }
    } finally {
        setSaveBusy(false);
    }
}

async function handleBuyerArchive(event) {
    event?.preventDefault();

    if (!state.currentBuyerId) {
        setBuyerStatus('Guarda el cliente antes de archivarlo.', 'warn');
        return;
    }

    try {
        const user = await resolveSessionUser();
        const historyCount = await refreshHistoryCount();
        const nextStatus = state.currentStatus === 'archived' ? 'active' : 'archived';

        if (nextStatus === 'archived' && historyCount <= 0) {
            setBuyerStatus('Este cliente no tiene historial. Puedes eliminarlo directamente.', 'warn');
            return;
        }

        const { data, error } = await state.supabase
            .from('agro_buyers')
            .update({
                status: nextStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', state.currentBuyerId)
            .eq('user_id', user.id)
            .select(BUYER_SELECT)
            .maybeSingle();

        if (error) throw error;

        fillBuyerForm(data || { status: nextStatus });
        emitClientChanged({
            clientId: state.currentBuyerId,
            openDetail: false
        });
        setBuyerStatus(
            nextStatus === 'archived'
                ? 'Cliente archivado. Su historial se conserva intacto.'
                : 'Cliente reactivado.',
            'ok'
        );
    } catch (error) {
        console.error('[AGRO_CLIENTS] archive error:', error);
        setBuyerStatus('No se pudo actualizar el estado del cliente.', 'error');
    }
}

async function handleBuyerDelete(event) {
    event?.preventDefault();

    if (!state.currentBuyerId) {
        setBuyerStatus('Guarda el cliente antes de eliminarlo.', 'warn');
        return;
    }

    try {
        const user = await resolveSessionUser();
        await refreshHistoryCount();
        const deleteScope = await fetchBuyerDeleteScopeSummary(user.id, state.currentBuyerId, state.currentGroupKey);
        const historyCount = Number(deleteScope.historyCount || 0);
        const requiresCascade = historyCount > 0;
        const fiadosCount = Number(deleteScope.movementCounts?.agro_pending || 0);
        const cobrosCount = Number(deleteScope.movementCounts?.agro_income || 0);
        const perdidasCount = Number(deleteScope.movementCounts?.agro_losses || 0);
        const threadCount = Number(deleteScope.socialThreadCount || 0);
        const confirmationKey = String(state.currentCanonicalName || state.currentGroupKey || state.currentDisplayName || '').trim();
        const impactLines = [
            `Cliente: ${state.currentDisplayName || confirmationKey}`,
            `Fiados afectados: ${fiadosCount}`,
            `Cobros afectados: ${cobrosCount}`,
            `Pérdidas afectadas: ${perdidasCount}`
        ];

        if (threadCount > 0) {
            impactLines.push(`Conversaciones sociales afectadas: ${threadCount}`);
        }

        const confirmed = await requestBuyerDeleteConfirmation({
            title: 'Eliminar cliente',
            copy: requiresCascade
                ? '¿Deseas eliminar este cliente? Esta acción también eliminará su cartera relacionada.'
                : '¿Deseas eliminar este cliente?',
            impactLines: requiresCascade
                ? impactLines.concat(['Esta acción no se puede deshacer.'])
                : [
                    `Cliente: ${state.currentDisplayName || confirmationKey || 'Cliente'}`,
                    'Sin historial relacionado.',
                    'Esta acción no se puede deshacer.'
                ]
        });
        if (!confirmed) {
            setBuyerStatus('Eliminación cancelada.', 'muted');
            return;
        }

        if (requiresCascade) {
            try {
                await deleteBuyerWithCascade();
            } catch (error) {
                if (isMissingBuyerDeleteCascadeRpc(error)) {
                    setBuyerStatus('Falta la migración de borrado seguro. Ejecuta las migraciones antes de eliminar clientes con historial.', 'error');
                    return;
                }
                throw error;
            }
        } else {
            await deleteBuyerWithoutHistory(user.id);
        }

        emitClientChanged({
            clientId: state.currentBuyerId,
            deleted: true
        });
        closeBuyerModal();
    } catch (error) {
        console.error('[AGRO_CLIENTS] delete error:', error);
        setBuyerStatus('No se pudo eliminar el cliente.', 'error');
    }
}

async function handleOpenBuyerPublicProfile(event) {
    event?.preventDefault();
    const linkedUserId = normalizeUuid(state.currentLinkedUserId);
    if (!linkedUserId) {
        setBuyerStatus('Cliente no vinculado a usuario público.', 'warn');
        return;
    }

    try {
        await openPublicFarmerProfile(linkedUserId);
    } catch (error) {
        console.error('[AGRO_CLIENTS] open public profile error:', error);
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
        if (event.key === 'Escape' && isBuyerDeleteConfirmOpen()) {
            event.preventDefault();
            settleBuyerDeleteConfirmation(false);
            return;
        }

        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeBuyerModal();
        }
    });

    const form = document.getElementById(BUYER_FORM_ID);
    if (form) {
        form.addEventListener('submit', handleBuyerSave);
    }

    document.getElementById(BUYER_OPEN_PUBLIC_BUTTON_ID)?.addEventListener('click', handleOpenBuyerPublicProfile);
    document.getElementById(BUYER_ARCHIVE_BUTTON_ID)?.addEventListener('click', handleBuyerArchive);
    document.getElementById(BUYER_DELETE_BUTTON_ID)?.addEventListener('click', handleBuyerDelete);

    const linkedInput = document.getElementById('agro-buyer-linked_user_id');
    if (linkedInput) {
        linkedInput.addEventListener('input', () => {
            const raw = String(linkedInput.value || '').trim();
            state.currentLinkedUserId = raw ? normalizeUuid(raw) : '';
            syncOpenPublicButton();
        });
    }
}

function bindBuyerDeleteConfirmEvents() {
    const modal = getBuyerDeleteConfirmModal();
    if (!modal || modal.dataset.bound === '1') return;
    modal.dataset.bound = '1';

    modal.querySelectorAll('[data-agro-buyer-delete-close]').forEach((node) => {
        node.addEventListener('click', (event) => {
            event.preventDefault();
            settleBuyerDeleteConfirmation(false);
        });
    });

    document.getElementById(BUYER_DELETE_CONFIRM_BUTTON_ID)?.addEventListener('click', (event) => {
        event.preventDefault();
        settleBuyerDeleteConfirmation(true);
    });
}

async function openBuyerProfileInternal({ buyerId = '', displayName = '', groupKey = '', mode = 'edit', focusAction = '' } = {}) {
    const user = await resolveSessionUser();
    if (!user?.id) {
        throw new Error('Sesión no disponible.');
    }

    state.mode = mode === 'create' ? 'create' : 'edit';
    state.currentBuyerId = String(buyerId || '').trim();
    state.currentDisplayName = String(displayName || '').trim();
    state.currentGroupKey = String(groupKey || normalizeBuyerGroupKey(displayName)).trim();
    state.currentCanonicalName = state.currentGroupKey;
    state.currentLinkedUserId = '';
    state.currentStatus = 'active';
    state.currentHistoryCount = 0;

    fillBuyerForm({ display_name: state.currentDisplayName });
    setBuyerStatus(
        state.mode === 'create'
            ? 'Define el cliente y guárdalo para abrir su detalle.'
            : 'Cargando cliente...',
        'muted'
    );
    openBuyerModal();

    let buyer = null;
    if (state.currentBuyerId) {
        buyer = await loadBuyerById(user.id, state.currentBuyerId);
    } else if (state.currentGroupKey) {
        buyer = await loadBuyerByGroupKey(user.id, state.currentGroupKey);
    }

    if (buyer) {
        state.mode = 'edit';
        fillBuyerForm(buyer);
        await refreshHistoryCount();
        setBuyerStatus('Cliente cargado.', 'ok');
    } else {
        fillBuyerForm({
            display_name: state.currentDisplayName,
            group_key: state.currentGroupKey,
            canonical_name: state.currentGroupKey,
            status: 'active'
        });
        syncBuyerHeading();
        syncLifecycleButtons();
        setBuyerStatus('Cliente nuevo. Guarda la ficha para activarlo en Cartera Viva.', 'warn');
    }

    const modal = getBuyerModal();
    if (modal) {
        applyBuyerPrivacy(modal);
        applyMoneyPrivacy(modal);
    }

    syncOpenPublicButton();

    if (focusAction) {
        focusBuyerLifecycleAction(focusAction);
    }
}

export async function openBuyerProfileByName(displayName, options = {}) {
    const safeName = String(displayName || '').trim();
    const groupKey = normalizeBuyerGroupKey(safeName);
    if (!safeName || !groupKey) return false;
    await openBuyerProfileInternal({
        displayName: safeName,
        groupKey,
        mode: 'edit',
        focusAction: options?.focusAction || ''
    });
    return true;
}

export async function openBuyerProfileById(buyerId, fallbackDisplayName = '', options = {}) {
    const safeBuyerId = String(buyerId || '').trim();
    if (!safeBuyerId) return false;
    await openBuyerProfileInternal({
        buyerId: safeBuyerId,
        displayName: String(fallbackDisplayName || '').trim(),
        mode: 'edit',
        focusAction: options?.focusAction || ''
    });
    return true;
}

export async function openNewBuyerProfile(initialDisplayName = '', options = {}) {
    await openBuyerProfileInternal({
        displayName: String(initialDisplayName || '').trim(),
        mode: 'create',
        focusAction: options?.focusAction || ''
    });
    return true;
}

export function initAgroCompradores({ supabase } = {}) {
    if (state.initialized) return;
    if (!supabase) {
        console.warn('[AGRO_CLIENTS] Supabase client missing, módulo no inicializado.');
        return;
    }

    const modal = getBuyerModal();
    if (!modal) {
        console.warn('[AGRO_CLIENTS] modal-agro-buyer no encontrado.');
        return;
    }

    state.supabase = supabase;
    state.initialized = true;

    bindBuyerModalEvents();
    bindBuyerDeleteConfirmEvents();
    syncBuyerHeading();
    syncOpenPublicButton();
    syncLifecycleButtons();
    setBuyerStatus('Abre una ficha o crea un cliente nuevo desde Cartera Viva.', 'muted');
}

export { normalizeBuyerGroupKey as normalizeGroupKey };
