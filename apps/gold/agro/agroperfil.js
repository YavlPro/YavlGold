import { formatUsd, getGlobalStats } from './agroestadistica.js';
import {
    applyBuyerPrivacy,
    applyMoneyPrivacy,
    readBuyerNamesHidden,
    readMoneyValuesHidden
} from './agro-privacy.js';
import { initAgroPublico, openPublicFarmerProfile } from './agropublico.js';
import { openProfileEditWizard } from '../assets/js/profile/profileEditWizard.js';
import uxMessages from '../assets/js/ui/uxMessages.js';
import {
    computeUnitTotalsByCropFromRows,
    mergeUnitTotalsMaps,
    mergeUnitTotalsPreferHigher,
    sumUnitTotalsFromMap,
    getPendingTransferToken,
    formatUnitTotalsMarkdown,
    createUnitTotalsAccumulator
} from './agro-unit-totals.js';

const PROFILE_MODAL_ID = 'modal-agro-profile';
const PROFILE_FORM_ID = 'agro-profile-form';
const PROFILE_STATUS_ID = 'agro-profile-status';
const PROFILE_UPDATED_ID = 'agro-profile-stats-updated';
const PROFILE_EXPORT_BUTTON_ID = 'btn-export-agro-profile-md';
const GLOBAL_STATS_STATUS_ID = 'agro-global-stats-status';
const PROFILE_SAVE_BUTTON_ID = 'btn-save-agro-profile';
const PROFILE_WIZARD_TRIGGER_ID = 'btn-open-profile-edit-wizard';
const PROFILE_AVATAR_PREVIEW_ID = 'agro-profile-avatar-preview';
const PROFILE_AVATAR_URL_ID = 'agro-profile-avatar_url';
const PROFILE_AVATAR_FILE_ID = 'agro-profile-avatar-file';
const PROFILE_AVATAR_CLEAR_ID = 'agro-profile-avatar-clear';
const PROFILE_PUBLIC_PREVIEW_BUTTON_ID = 'btn-open-agro-public-profile';
const LOCAL_AVATAR_KEY_PREFIX = 'YG_AGRO_PROFILE_AVATAR_V1_';
const MAX_LOCAL_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const DEFAULT_AVATAR_EMOJI = '👨‍🌾';
const SAFE_DATA_IMAGE_RE = /^data:(image\/(?:png|jpeg|jpg|webp|gif|avif));base64,([a-z0-9+/=\s]+)$/i;
const PROFILE_UNIT_FETCH_FIELDS = [
    'crop_id',
    'unit_type',
    'unit_qty',
    'quantity_kg',
    'split_meta',
    'concepto',
    'concept',
    'transfer_state',
    'transfer_type',
    'transferred_at',
    'transferred_income_id',
    'transferred_to',
    'transferred_to_id',
    'reverted_at',
    'reverted_reason',
    'deleted_at'
];

const PROFILE_FIELD_IDS = [
    'display_name',
    'farm_name',
    'location_text',
    'phone',
    'whatsapp',
    'instagram',
    'facebook',
    'notes'
];

const PRIVATE_PROFILE_COLUMNS = 'user_id,display_name,farm_name,location_text,phone,whatsapp,instagram,facebook,notes,created_at,updated_at';
const PUBLIC_PROFILE_COLUMNS = 'user_id,public_enabled,display_name,avatar_url,bio,location_text,whatsapp,instagram,created_at,updated_at';

const PUBLIC_PROFILE_FIELD_IDS = [
    'display_name',
    'avatar_url',
    'bio',
    'location_text',
    'whatsapp',
    'instagram'
];

const CROP_STATS_IDS = {
    active: 'agro-profile-crops-active',
    finalized: 'agro-profile-crops-finalized',
    lost: 'agro-profile-crops-lost',
    total: 'agro-profile-crops-total'
};

const MONEY_STATS_IDS = {
    incomeUsd: 'agro-profile-money-income',
    expenseUsd: 'agro-profile-money-expenses',
    pendingUsd: 'agro-profile-money-pending',
    lossesUsd: 'agro-profile-money-losses',
    transfersUsd: 'agro-profile-money-transfers',
    investmentUsd: 'agro-profile-money-investment',
    costUsd: 'agro-profile-money-cost',
    profitUsd: 'agro-profile-money-profit'
};

const state = {
    initialized: false,
    loadingProfile: false,
    loadingStats: false,
    profile: null,
    publicProfile: null,
    stats: null,
    user: null,
    supabase: null,
    openButtons: [],
    lastFocusedTrigger: null,
    avatarDraftMode: 'none',
    avatarDraftValue: '',
    currentAvatarUrl: ''
};

function setProfileStatus(message = '', level = 'muted') {
    const statusEl = document.getElementById(PROFILE_STATUS_ID);
    if (!statusEl) return;
    statusEl.textContent = String(message || '');
    statusEl.dataset.level = String(level || 'muted');
}

function setGlobalStatsStatus(message = '', level = 'muted') {
    const statusEl = document.getElementById(GLOBAL_STATS_STATUS_ID);
    if (!statusEl) return;
    statusEl.textContent = String(message || '');
    statusEl.dataset.level = String(level || 'muted');
}

function setSaveButtonBusy(isBusy) {
    const saveBtn = document.getElementById(PROFILE_SAVE_BUTTON_ID);
    if (!saveBtn) return;
    saveBtn.disabled = !!isBusy;
    saveBtn.textContent = isBusy ? 'Guardando...' : 'Guardar Perfil';
}

function setExportButtonBusy(isBusy) {
    const exportBtn = document.getElementById(PROFILE_EXPORT_BUTTON_ID);
    if (!exportBtn) return;
    exportBtn.disabled = !!isBusy;
    exportBtn.textContent = isBusy ? 'Exportando...' : '📄 Exportar Informe Global (MD)';
}

function escapeMarkdownCell(value) {
    return String(value ?? '')
        .replace(/\r?\n/g, ' ')
        .replace(/\|/g, '\\|')
        .trim();
}

function normalizeMarkdownForExport(content) {
    const text = String(content || '');
    return text
        .replace(/\uFEFF/g, '')
        .replace(/\u00A0/g, ' ')
        .replace(/[\u200B-\u200D]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n/g, '\r\n');
}

const profileUnitMissingColumnsByTable = new Map();

function getProfileUnitMissingColumns(tableName) {
    const key = String(tableName || '').trim().toLowerCase();
    if (!key) return new Set();
    if (!profileUnitMissingColumnsByTable.has(key)) {
        profileUnitMissingColumnsByTable.set(key, new Set());
    }
    return profileUnitMissingColumnsByTable.get(key);
}

function rememberProfileUnitMissingColumn(tableName, column) {
    const tableKey = String(tableName || '').trim().toLowerCase();
    const columnKey = String(column || '').trim();
    if (!tableKey || !columnKey) return;
    const bucket = getProfileUnitMissingColumns(tableKey);
    bucket.add(columnKey);
}

function isProfileUnitMissingColumnError(error, column) {
    if (!error || !column) return false;
    const code = String(error.code || '').toUpperCase();
    const text = `${String(error.message || '').toLowerCase()} ${String(error.details || '').toLowerCase()}`;
    const col = String(column || '').toLowerCase();
    const hasMissingPhrase = text.includes('does not exist') || text.includes('not found') || text.includes('could not find');
    const mentionsColumn = text.includes(col) || text.includes(`"${col}"`) || text.includes(`'${col}'`);
    if (code === '42703' || code === 'PGRST204') return hasMissingPhrase && mentionsColumn;
    return hasMissingPhrase && mentionsColumn;
}

function isProfileUnitMissingTableError(error, tableName) {
    if (!error) return false;
    const code = String(error.code || '').toUpperCase();
    const text = `${String(error.message || '').toLowerCase()} ${String(error.details || '').toLowerCase()}`;
    const table = String(tableName || '').toLowerCase();
    const hasMissingPhrase = text.includes('does not exist') || text.includes('not found') || text.includes('could not find');
    const mentionsTable = !table || text.includes(table) || text.includes(`"${table}"`) || text.includes(`'${table}'`);
    if (code === '42P01' || code === 'PGRST205' || code === 'PGRST204') return hasMissingPhrase && mentionsTable;
    return hasMissingPhrase && mentionsTable;
}

async function fetchProfileUnitRows(tableName, userId, options = {}) {
    const normalizedTable = String(tableName || '').trim();
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedTable || !normalizedUserId || !state.supabase) return [];

    const missingColumns = getProfileUnitMissingColumns(normalizedTable);
    let selectFields = PROFILE_UNIT_FETCH_FIELDS.filter((field) => !missingColumns.has(field));
    let nullFilters = ['deleted_at'];
    if (options.excludeReverted) {
        nullFilters.push('reverted_at');
    }
    nullFilters = nullFilters.filter((field) => selectFields.includes(field));

    for (let attempt = 0; attempt < 16; attempt += 1) {
        if (!selectFields.includes('crop_id')) return [];

        let query = state.supabase
            .from(normalizedTable)
            .select(selectFields.join(', '))
            .eq('user_id', normalizedUserId);

        nullFilters.forEach((field) => {
            if (selectFields.includes(field)) {
                query = query.is(field, null);
            }
        });

        const { data, error } = await query;
        if (!error) {
            return Array.isArray(data) ? data : [];
        }

        if (isProfileUnitMissingTableError(error, normalizedTable)) {
            return [];
        }

        let removedAny = false;
        selectFields = selectFields.filter((field) => {
            if (isProfileUnitMissingColumnError(error, field)) {
                rememberProfileUnitMissingColumn(normalizedTable, field);
                removedAny = true;
                return false;
            }
            return true;
        });
        if (removedAny) {
            nullFilters = nullFilters.filter((field) => selectFields.includes(field));
            continue;
        }

        console.warn(`[AGRO_PROFILE] unit rows fetch error (${normalizedTable}):`, error?.message || error);
        return [];
    }

    return [];
}

async function computeProfileGlobalUnitTotals() {
    const user = await resolveSessionUser();
    if (!user?.id) return createUnitTotalsAccumulator();

    const [incomeRows, expenseRows, pendingRows, lossRows, transferRows] = await Promise.all([
        fetchProfileUnitRows('agro_income', user.id, { excludeReverted: true }),
        fetchProfileUnitRows('agro_expenses', user.id),
        fetchProfileUnitRows('agro_pending', user.id),
        fetchProfileUnitRows('agro_losses', user.id, { excludeReverted: true }),
        fetchProfileUnitRows('agro_transfers', user.id)
    ]);

    const pendingNotTransferred = pendingRows.filter((row) => getPendingTransferToken(row) !== 'transferred');
    const pendingTransferred = pendingRows.filter((row) => getPendingTransferToken(row) === 'transferred');

    const baseTotalsByCrop = mergeUnitTotalsMaps([
        computeUnitTotalsByCropFromRows(incomeRows),
        computeUnitTotalsByCropFromRows(expenseRows),
        computeUnitTotalsByCropFromRows(lossRows),
        computeUnitTotalsByCropFromRows(transferRows),
        computeUnitTotalsByCropFromRows(pendingNotTransferred)
    ]);
    const mergedTotalsByCrop = mergeUnitTotalsPreferHigher(
        baseTotalsByCrop,
        computeUnitTotalsByCropFromRows(pendingTransferred)
    );

    return sumUnitTotalsFromMap(mergedTotalsByCrop);
}

function markMoneyNode(node, rawText) {
    if (!node) return;
    const safeText = String(rawText || node.textContent || '').trim();
    if (!safeText) return;
    node.dataset.money = '1';
    node.dataset.rawMoney = safeText;
}

function markBuyerNameNode(node, rawText) {
    if (!node) return;
    const safeText = String(rawText || node.textContent || '').trim();
    if (!safeText) return;
    node.dataset.buyerName = '1';
    node.dataset.rawName = safeText;
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

function getProfileModal() {
    return document.getElementById(PROFILE_MODAL_ID);
}

function isProfileOpen() {
    const modal = getProfileModal();
    return !!(modal && modal.classList.contains('is-open'));
}

function setButtonsExpanded(expanded) {
    state.openButtons.forEach((button) => {
        button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
}

function isPerfilViewInline() {
    return document.body.dataset.agroActiveView === 'perfil';
}

function openProfileModal() {
    const modal = getProfileModal();
    if (!modal) return;

    if (modal.closest('.perfil-dedicado')) {
        modal.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('agro-profile-open');
    setButtonsExpanded(true);

    const panel = modal.querySelector('.agro-profile-panel');
    if (panel && typeof panel.focus === 'function') {
        requestAnimationFrame(() => {
            panel.focus({ preventScroll: true });
        });
    }
}

function closeProfileModal() {
    const modal = getProfileModal();
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('agro-profile-open');
    setButtonsExpanded(false);

    if (state.lastFocusedTrigger && typeof state.lastFocusedTrigger.focus === 'function') {
        state.lastFocusedTrigger.focus({ preventScroll: true });
    }
}

async function resolveSessionUser() {
    if (state.user?.id) return state.user;
    const { data, error } = await state.supabase.auth.getUser();
    if (error) throw error;
    state.user = data?.user || null;
    return state.user;
}

function resolveDisplayName(profile = {}, user = null) {
    const fromProfile = String(profile?.display_name || '').trim();
    if (fromProfile) return fromProfile;

    const fallback = String(
        user?.user_metadata?.full_name
        || user?.email
        || 'Agricultor'
    ).trim();

    return fallback || 'Agricultor';
}

function getLocalAvatarStorageKey(userId) {
    return `${LOCAL_AVATAR_KEY_PREFIX}${String(userId || '').trim()}`;
}

function readLocalAvatar(userId) {
    const key = getLocalAvatarStorageKey(userId);
    if (!key || key === LOCAL_AVATAR_KEY_PREFIX) return '';
    try {
        return String(localStorage.getItem(key) || '').trim();
    } catch (_error) {
        return '';
    }
}

function writeLocalAvatar(userId, value) {
    const key = getLocalAvatarStorageKey(userId);
    if (!key || key === LOCAL_AVATAR_KEY_PREFIX) return;
    try {
        localStorage.setItem(key, String(value || '').trim());
    } catch (_error) {
        // Ignore storage errors
    }
}

function clearLocalAvatar(userId) {
    const key = getLocalAvatarStorageKey(userId);
    if (!key || key === LOCAL_AVATAR_KEY_PREFIX) return;
    try {
        localStorage.removeItem(key);
    } catch (_error) {
        // Ignore storage errors
    }
}

function normalizeDataImageUrl(value) {
    const raw = String(value || '').trim();
    const match = raw.match(SAFE_DATA_IMAGE_RE);
    if (!match) return '';

    const mime = String(match[1] || '').toLowerCase();
    const payload = String(match[2] || '').replace(/\s+/g, '');
    if (!mime || !payload) return '';

    return `data:${mime};base64,${payload}`;
}

function normalizeAvatarUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('data:image/')) {
        return normalizeDataImageUrl(raw);
    }

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

function dataImageToObjectUrl(dataUrl) {
    const match = String(dataUrl || '').match(SAFE_DATA_IMAGE_RE);
    if (!match) return '';

    const mime = String(match[1] || '').toLowerCase();
    const payload = String(match[2] || '').replace(/\s+/g, '');
    if (!mime || !payload) return '';

    try {
        const binary = atob(payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mime });
        return URL.createObjectURL(blob);
    } catch (_error) {
        return '';
    }
}

function releaseAvatarObjectUrl(container) {
    if (!container) return;
    const previousObjectUrl = String(container.dataset.avatarObjectUrl || '').trim();
    if (previousObjectUrl && previousObjectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousObjectUrl);
    }
    delete container.dataset.avatarObjectUrl;
}

function resolveAvatarSrcForRender(container, safeUrl) {
    const normalized = String(safeUrl || '').trim();
    if (!normalized) {
        releaseAvatarObjectUrl(container);
        return '';
    }

    if (normalized.startsWith('data:image/')) {
        const objectUrl = dataImageToObjectUrl(normalized);
        if (!objectUrl) {
            releaseAvatarObjectUrl(container);
            return '';
        }
        releaseAvatarObjectUrl(container);
        container.dataset.avatarObjectUrl = objectUrl;
        return objectUrl;
    }

    releaseAvatarObjectUrl(container);
    return normalized;
}

function renderAvatarNode(container, avatarUrl, altText) {
    if (!container) return;
    const safeUrl = normalizeAvatarUrl(avatarUrl);
    const renderSrc = resolveAvatarSrcForRender(container, safeUrl);
    if (!renderSrc) {
        container.textContent = DEFAULT_AVATAR_EMOJI;
        container.style.overflow = '';
        return;
    }

    let img = container.querySelector('img');
    if (!img) {
        container.textContent = '';
        img = document.createElement('img');
        img.alt = altText || 'Avatar';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        container.appendChild(img);
    }
    img.alt = altText || 'Avatar';
    img.src = renderSrc;
    container.style.overflow = 'hidden';
}

function resolveEffectiveAvatarUrl(user = null) {
    const userId = user?.id;
    const localAvatar = normalizeAvatarUrl(readLocalAvatar(userId));
    if (localAvatar) return localAvatar;

    const metadataAvatar = normalizeAvatarUrl(user?.user_metadata?.avatar_url);
    return metadataAvatar || '';
}

function updateProfileAvatarPreview(avatarUrl, profile = {}, user = null) {
    const displayName = resolveDisplayName(profile, user);
    const previewEl = document.getElementById(PROFILE_AVATAR_PREVIEW_ID);
    renderAvatarNode(previewEl, avatarUrl, displayName);
}

function updateProfileHeaderAvatar(avatarUrl, profile = {}, user = null) {
    const displayName = resolveDisplayName(profile, user);
    const headerAvatarEl = document.querySelector('#agro-profile-button .user-avatar');
    renderAvatarNode(headerAvatarEl, avatarUrl, displayName);
}

function syncAvatarFormFromUser(user = null, profile = {}) {
    const avatarInput = document.getElementById(PROFILE_AVATAR_URL_ID);
    const metadataAvatar = normalizeAvatarUrl(user?.user_metadata?.avatar_url);
    if (avatarInput) {
        avatarInput.value = metadataAvatar || '';
    }

    state.avatarDraftMode = 'none';
    state.avatarDraftValue = '';
    state.currentAvatarUrl = resolveEffectiveAvatarUrl(user);

    updateProfileAvatarPreview(state.currentAvatarUrl, profile, user);
    updateProfileHeaderAvatar(state.currentAvatarUrl, profile, user);
}

function updateProfileHeaderName(profile = {}, user = null) {
    const displayName = resolveDisplayName(profile, user);

    const titleEl = document.getElementById('agro-profile-title');
    if (titleEl) {
        titleEl.textContent = `Bienvenido, ${displayName}`;
    }

    const chipNameEl = document.querySelector('#agro-profile-button .user-name');
    if (chipNameEl) {
        chipNameEl.textContent = displayName;
    }

    const avatarUrl = state.currentAvatarUrl || resolveEffectiveAvatarUrl(user);
    updateProfileAvatarPreview(avatarUrl, profile, user);
    updateProfileHeaderAvatar(avatarUrl, profile, user);
}

function readProfileLikeField(source = {}, ...keys) {
    for (const key of keys) {
        if (source?.[key] !== undefined && source?.[key] !== null) {
            return String(source[key]).trim();
        }
    }
    return '';
}

function buildPrivateProfilePrefill(profile = {}, user = null) {
    return {
        userId: String(user?.id || '').trim(),
        email: String(user?.email || '').trim(),
        displayName: resolveDisplayName(profile, user),
        farmName: readProfileLikeField(profile, 'farm_name', 'farmName'),
        locationText: readProfileLikeField(profile, 'location_text', 'locationText'),
        phone: readProfileLikeField(profile, 'phone'),
        whatsapp: readProfileLikeField(profile, 'whatsapp'),
        instagram: readProfileLikeField(profile, 'instagram'),
        facebook: readProfileLikeField(profile, 'facebook'),
        notes: readProfileLikeField(profile, 'notes'),
        avatarUrl: state.currentAvatarUrl || resolveEffectiveAvatarUrl(user)
    };
}

function buildPrivateProfilePayload(source = {}) {
    return {
        display_name: readProfileLikeField(source, 'display_name', 'displayName'),
        farm_name: readProfileLikeField(source, 'farm_name', 'farmName'),
        location_text: readProfileLikeField(source, 'location_text', 'locationText'),
        phone: readProfileLikeField(source, 'phone'),
        whatsapp: readProfileLikeField(source, 'whatsapp'),
        instagram: readProfileLikeField(source, 'instagram'),
        facebook: readProfileLikeField(source, 'facebook'),
        notes: readProfileLikeField(source, 'notes')
    };
}

function fillProfileForm(profile = {}, user = null) {
    const prefill = buildPrivateProfilePrefill(profile, user);
    const valueMap = {
        display_name: prefill.displayName,
        farm_name: prefill.farmName,
        location_text: prefill.locationText,
        phone: prefill.phone,
        whatsapp: prefill.whatsapp,
        instagram: prefill.instagram,
        facebook: prefill.facebook,
        notes: prefill.notes
    };

    PROFILE_FIELD_IDS.forEach((fieldName) => {
        const input = document.getElementById(`agro-profile-${fieldName}`);
        if (!input) return;
        input.value = valueMap[fieldName] || '';
    });
}

function readProfileForm() {
    const rawData = {};
    PROFILE_FIELD_IDS.forEach((fieldName) => {
        const input = document.getElementById(`agro-profile-${fieldName}`);
        if (!input) return;
        rawData[fieldName] = String(input.value || '').trim();
    });
    return buildPrivateProfilePayload(rawData);
}

function fillPublicProfileForm(publicProfile = {}, privateProfile = {}, user = null) {
    const enabledInput = document.getElementById('agro-profile-public_enabled');
    if (enabledInput) {
        enabledInput.checked = !!publicProfile?.public_enabled;
    }

    const privateName = resolveDisplayName(privateProfile, user);
    const privateLocation = String(privateProfile?.location_text || '').trim();
    const privateWhatsapp = String(privateProfile?.whatsapp || '').trim();
    const privateInstagram = String(privateProfile?.instagram || '').trim();

    const fallbackMap = {
        display_name: privateName,
        avatar_url: '',
        bio: '',
        location_text: privateLocation,
        whatsapp: privateWhatsapp,
        instagram: privateInstagram
    };

    PUBLIC_PROFILE_FIELD_IDS.forEach((fieldName) => {
        const input = document.getElementById(`agro-profile-public-${fieldName}`);
        if (!input) return;

        const rawValue = publicProfile?.[fieldName];
        const fallback = fallbackMap[fieldName] || '';
        input.value = String((rawValue ?? fallback) || '').trim();
    });
}

function readPublicProfileForm(privateProfileData = {}, user = null) {
    const enabledInput = document.getElementById('agro-profile-public_enabled');
    const payload = {
        public_enabled: !!enabledInput?.checked
    };

    PUBLIC_PROFILE_FIELD_IDS.forEach((fieldName) => {
        const input = document.getElementById(`agro-profile-public-${fieldName}`);
        const raw = String(input?.value || '').trim();
        if (fieldName === 'avatar_url') {
            payload[fieldName] = normalizeAvatarUrl(raw) || null;
            return;
        }
        payload[fieldName] = raw || null;
    });

    if (!payload.display_name) {
        payload.display_name = resolveDisplayName(privateProfileData, user);
    }

    return payload;
}

function syncProfileEditEntrySummary(profile = {}, user = null) {
    const summary = buildPrivateProfilePrefill(profile, user);
    const summaryMap = {
        'agro-profile-edit-summary-name': summary.displayName,
        'agro-profile-edit-summary-farm': summary.farmName,
        'agro-profile-edit-summary-location': summary.locationText,
        'agro-profile-edit-summary-contact': summary.whatsapp || summary.phone
    };

    Object.entries(summaryMap).forEach(([id, value]) => {
        const node = document.getElementById(id);
        if (!node) return;
        node.textContent = String(value || '').trim() || 'Sin definir';
        node.classList.toggle('is-empty', !String(value || '').trim());
    });
}

function isMissingPublicProfileTableError(error) {
    const code = String(error?.code || '').toUpperCase();
    const text = `${String(error?.message || '')} ${String(error?.details || '')}`.toLowerCase();
    const mentionsTable = text.includes('agro_public_profiles');

    return (
        code === '42P01' ||
        code === 'PGRST205' ||
        (mentionsTable && text.includes('does not exist')) ||
        (mentionsTable && text.includes('could not find'))
    );
}

async function loadPublicProfile() {
    try {
        const user = await resolveSessionUser();
        if (!user?.id) {
            throw new Error('Sesion no disponible.');
        }

        const { data, error } = await state.supabase
            .from('agro_public_profiles')
            .select(PUBLIC_PROFILE_COLUMNS)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;

        state.publicProfile = data || null;
        fillPublicProfileForm(data || {}, state.profile || {}, user);
    } catch (error) {
        console.error('[AGRO_PROFILE] load public profile error:', error);
        fillPublicProfileForm({}, state.profile || {}, state.user);
        setProfileStatus('Perfil listo con aviso: no se pudo cargar el bloque publico.', 'warn');
    }
}

async function loadFarmerProfile() {
    state.loadingProfile = true;
    setProfileStatus('Cargando perfil...', 'muted');

    try {
        const user = await resolveSessionUser();
        if (!user?.id) {
            throw new Error('Sesión no disponible.');
        }

        const { data, error } = await state.supabase
            .from('agro_farmer_profile')
            .select(PRIVATE_PROFILE_COLUMNS)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;

        state.profile = data || null;
        fillProfileForm(data || {}, user);
        syncAvatarFormFromUser(user, data || {});
        updateProfileHeaderName(data || {}, user);
        syncProfileEditEntrySummary(data || {}, user);
        syncPerfilDedicatedView();
        fillPublicProfileForm(state.publicProfile || {}, data || {}, user);
        setProfileStatus('Perfil listo.', 'ok');
    } catch (error) {
        console.error('[AGRO_PROFILE] load profile error:', error);
        setProfileStatus('No se pudo cargar el perfil.', 'error');
    } finally {
        state.loadingProfile = false;
    }
}

async function savePrivateFarmerProfile(userId, profilePayload) {
    const payload = {
        user_id: userId,
        ...buildPrivateProfilePayload(profilePayload),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await state.supabase
        .from('agro_farmer_profile')
        .upsert(payload, { onConflict: 'user_id' })
        .select(PRIVATE_PROFILE_COLUMNS)
        .maybeSingle();

    if (error) throw error;
    return data || payload;
}

async function savePublicFarmerProfile(userId, publicProfileData = {}, privateProfileData = {}, user = null) {
    const publicPayload = {
        user_id: userId,
        public_enabled: !!publicProfileData.public_enabled,
        display_name: String(publicProfileData.display_name || '').trim() || null,
        avatar_url: normalizeAvatarUrl(publicProfileData.avatar_url) || null,
        bio: String(publicProfileData.bio || '').trim() || null,
        location_text: String(publicProfileData.location_text || '').trim() || null,
        whatsapp: String(publicProfileData.whatsapp || '').trim() || null,
        instagram: String(publicProfileData.instagram || '').trim() || null,
        updated_at: new Date().toISOString()
    };

    if (!publicPayload.display_name) {
        publicPayload.display_name = resolveDisplayName(privateProfileData, user);
    }

    const { data, error } = await state.supabase
        .from('agro_public_profiles')
        .upsert(publicPayload, { onConflict: 'user_id' })
        .select(PUBLIC_PROFILE_COLUMNS)
        .maybeSingle();

    if (error) {
        if (isMissingPublicProfileTableError(error)) {
            return {
                skipped: true,
                data: publicPayload
            };
        }
        throw error;
    }

    return {
        skipped: false,
        data: data || publicPayload
    };
}

function readLegacyAvatarState() {
    const avatarInput = document.getElementById(PROFILE_AVATAR_URL_ID);
    return {
        mode: state.avatarDraftMode || 'none',
        value: state.avatarDraftMode === 'none'
            ? normalizeAvatarUrl(avatarInput?.value) || ''
            : state.avatarDraftValue || ''
    };
}

async function syncProfileAuthMetadata(user, privateProfileData = {}, avatarState = {}) {
    const nextUserId = String(user?.id || '').trim();
    const currentMetadataAvatar = normalizeAvatarUrl(user?.user_metadata?.avatar_url);
    const metadataPatch = {};
    let metadataSyncFailed = false;
    let nextUser = user || null;

    const nextDisplayName = resolveDisplayName(privateProfileData, user);
    const currentDisplayName = String(user?.user_metadata?.full_name || '').trim();
    if (nextDisplayName !== currentDisplayName) {
        metadataPatch.full_name = nextDisplayName;
    }

    const normalizedAvatarMode = String(avatarState?.mode || 'none').trim() || 'none';
    const normalizedAvatarValue = normalizeAvatarUrl(avatarState?.value) || '';
    let nextAvatarUrl = state.currentAvatarUrl || resolveEffectiveAvatarUrl(user);

    if (normalizedAvatarMode === 'local') {
        nextAvatarUrl = normalizedAvatarValue;
        if (normalizedAvatarValue) {
            writeLocalAvatar(nextUserId, normalizedAvatarValue);
        }
        if (currentMetadataAvatar) {
            metadataPatch.avatar_url = null;
        }
    } else if (normalizedAvatarMode === 'clear') {
        nextAvatarUrl = '';
        clearLocalAvatar(nextUserId);
        if (currentMetadataAvatar) {
            metadataPatch.avatar_url = null;
        }
    } else if (normalizedAvatarMode === 'url') {
        nextAvatarUrl = normalizedAvatarValue;
        if (normalizedAvatarValue) {
            writeLocalAvatar(nextUserId, normalizedAvatarValue);
        } else {
            clearLocalAvatar(nextUserId);
        }
        if (normalizedAvatarValue !== currentMetadataAvatar) {
            metadataPatch.avatar_url = normalizedAvatarValue || null;
        }
    }

    if (Object.keys(metadataPatch).length > 0) {
        const { data: authData, error: authError } = await state.supabase.auth.updateUser({
            data: metadataPatch
        });

        if (authError) {
            metadataSyncFailed = true;
            console.warn('[AGRO_PROFILE] auth metadata sync warning:', authError);
        } else if (authData?.user) {
            nextUser = authData.user;
        }
    }

    return {
        user: nextUser,
        avatarUrl: nextAvatarUrl,
        metadataSyncFailed
    };
}

function applySavedProfileState({ privateProfile, publicProfile = state.publicProfile, user = null, avatarUrl = '' } = {}) {
    state.profile = privateProfile || null;
    state.publicProfile = publicProfile || null;
    state.user = user || state.user;
    state.avatarDraftMode = 'none';
    state.avatarDraftValue = '';
    state.currentAvatarUrl = avatarUrl || resolveEffectiveAvatarUrl(state.user);

    fillProfileForm(state.profile || {}, state.user);
    syncAvatarFormFromUser(state.user, state.profile || {});
    updateProfileHeaderName(state.profile || {}, state.user);
    syncProfileEditEntrySummary(state.profile || {}, state.user);
    syncPerfilDedicatedView();
    fillPublicProfileForm(state.publicProfile || {}, state.profile || {}, state.user);
}

async function saveProfileEditFlow(wizardData = {}, options = {}) {
    if (state.loadingProfile) {
        throw new Error('Ya estamos guardando tu perfil. Espera un momento.');
    }

    const { persistPublicProfile = false, publicProfileData = null } = options;
    const hadPersistedProfile = !!state.profile?.user_id;

    state.loadingProfile = true;
    setSaveButtonBusy(true);
    setProfileStatus('Guardando perfil...', 'muted');

    try {
        const user = await resolveSessionUser();
        if (!user?.id) {
            throw new Error('Sesión no disponible.');
        }

        const privatePayload = buildPrivateProfilePayload(wizardData);
        const privateProfile = await savePrivateFarmerProfile(user.id, privatePayload);

        let publicProfileResult = {
            skipped: false,
            data: state.publicProfile
        };

        if (persistPublicProfile && publicProfileData) {
            publicProfileResult = await savePublicFarmerProfile(user.id, publicProfileData, privateProfile, user);
        }

        const avatarState = wizardData?.avatarState || readLegacyAvatarState();
        const metadataResult = await syncProfileAuthMetadata(user, privateProfile, avatarState);

        applySavedProfileState({
            privateProfile,
            publicProfile: publicProfileResult.data,
            user: metadataResult.user,
            avatarUrl: metadataResult.avatarUrl
        });

        if (publicProfileResult.skipped) {
            setProfileStatus('Perfil privado guardado. Falta migracion para perfil publico.', 'warn');
        } else if (metadataResult.metadataSyncFailed) {
            setProfileStatus('Perfil guardado. Aviso: no se pudo sincronizar metadata global.', 'warn');
        } else {
            setProfileStatus('Perfil guardado.', 'ok');
        }

        uxMessages.success(uxMessages.copy.profileSaved({ created: !hadPersistedProfile }));

        return {
            privateProfile,
            publicProfile: publicProfileResult.data,
            user: metadataResult.user,
            avatarUrl: metadataResult.avatarUrl,
            metadataSyncFailed: metadataResult.metadataSyncFailed,
            publicProfileSkipped: publicProfileResult.skipped
        };
    } catch (error) {
        console.error('[AGRO_PROFILE] save profile error:', error);
        setProfileStatus('No se pudo guardar el perfil.', 'error');
        uxMessages.error({
            title: 'No pudimos guardar tu perfil.',
            message: error.message || 'Intenta de nuevo en un momento.'
        });
        throw error;
    } finally {
        state.loadingProfile = false;
        setSaveButtonBusy(false);
    }
}

async function saveFarmerProfile(event) {
    event?.preventDefault();

    const legacyProfileData = readProfileForm();
    const legacyPublicData = readPublicProfileForm(legacyProfileData, state.user);

    try {
        await saveProfileEditFlow({
            ...legacyProfileData,
            avatarState: readLegacyAvatarState()
        }, {
            persistPublicProfile: true,
            publicProfileData: legacyPublicData
        });
    } catch (_) {
        // saveProfileEditFlow ya publica estado + toast
    }
}

function setStatsUpdatedAt(value) {
    const updatedEl = document.getElementById(PROFILE_UPDATED_ID);
    if (!updatedEl) return;
    updatedEl.textContent = `Actualizado: ${formatDateTime(value)}`;
}

function renderCropStats(stats) {
    Object.entries(CROP_STATS_IDS).forEach(([key, elementId]) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        const nextValue = Number(stats?.[key] || 0);
        element.textContent = `${nextValue}`;
    });
}

function renderMoneyStats(stats) {
    Object.entries(MONEY_STATS_IDS).forEach(([key, elementId]) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        const nextText = formatUsd(stats?.[key] || 0);
        element.textContent = nextText;
        markMoneyNode(element, nextText);
    });
}

function createTopRow(name, totalUsd, movementCount = 0, { markName = true } = {}) {
    const item = document.createElement('li');
    item.className = 'agro-profile-top-item';

    const nameEl = document.createElement('span');
    nameEl.className = 'agro-profile-top-name';
    nameEl.textContent = name;
    if (markName) {
        markBuyerNameNode(nameEl, name);
    }

    const valueWrap = document.createElement('span');
    valueWrap.className = 'agro-profile-top-value-wrap';

    const valueEl = document.createElement('span');
    valueEl.className = 'agro-profile-top-value';
    const moneyText = formatUsd(totalUsd);
    valueEl.textContent = moneyText;
    markMoneyNode(valueEl, moneyText);

    const countEl = document.createElement('span');
    countEl.className = 'agro-profile-top-count';
    countEl.textContent = `${movementCount} mov.`;

    valueWrap.append(valueEl, countEl);
    item.append(nameEl, valueWrap);
    return item;
}

function renderTopList(listId, items, fallbackLabel, options = {}) {
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    listEl.replaceChildren();
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) {
        const empty = document.createElement('li');
        empty.className = 'agro-profile-top-empty';
        empty.textContent = fallbackLabel;
        listEl.appendChild(empty);
        return;
    }

    safeItems.forEach((row) => {
        const rowName = String(
            row?.name
            || row?.cropName
            || row?.label
            || 'Sin dato'
        ).trim() || 'Sin dato';

        const rowTotal = Number(row?.totalUsd || 0);
        const rowCount = Number(row?.count || 0);
        listEl.appendChild(createTopRow(rowName, rowTotal, rowCount, options));
    });
}

function bindGlobalStatsToggle() {
    const toggleBtn = document.getElementById('btn-toggle-global-stats');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const panel = document.getElementById('agro-global-stats-panel');
        const body = document.getElementById('agro-global-stats-body');
        if (!panel || !body) return;

        const isExpanded = panel.classList.contains('is-expanded');
        if (isExpanded) {
            panel.classList.remove('is-expanded');
            body.hidden = true;
        } else {
            panel.classList.add('is-expanded');
            body.hidden = false;
        }
    });
}

async function loadGlobalStats() {
    state.loadingStats = true;
    setGlobalStatsStatus('Actualizando resumen global...', 'muted');

    try {
        const user = await resolveSessionUser();
        if (!user?.id) {
            throw new Error('Sesión no disponible.');
        }

        const stats = await getGlobalStats({
            supabase: state.supabase,
            userId: user.id
        });

        state.stats = stats;
        renderCropStats(stats.crops);
        renderMoneyStats(stats.money);
        renderTopList('agro-profile-top-buyers', stats.topBuyers, 'Sin compradores con cobros registrados.');
        renderTopList('agro-profile-top-crops', stats.topCrops, 'Sin cultivos con cobros registrados.', { markName: true });
        setStatsUpdatedAt(stats.updatedAt);

        if (Array.isArray(stats.warnings) && stats.warnings.length) {
            setGlobalStatsStatus(`Resumen listo con avisos: ${stats.warnings[0]}`, 'warn');
        } else {
            setGlobalStatsStatus('Resumen actualizado.', 'ok');
        }

        const statsPanel = document.getElementById('agro-global-stats-panel');
        if (statsPanel) {
            applyBuyerPrivacy(statsPanel);
            applyMoneyPrivacy(statsPanel);
        }
    } catch (error) {
        console.error('[AGRO_PROFILE] load stats error:', error);
        setGlobalStatsStatus('No se pudo cargar el resumen global.', 'error');
    } finally {
        state.loadingStats = false;
    }
}

function buildProfileMarkdown(options = {}) {
    const profileData = state.profile || {};
    const stats = state.stats || {};
    const cropStats = stats.crops || {};
    const moneyStats = stats.money || {};
    const usdAudit = stats.usdAudit || {};
    const unitTotals = options?.unitTotals || createUnitTotalsAccumulator();
    const namesHidden = readBuyerNamesHidden();
    const moneyHidden = readMoneyValuesHidden();

    const safeName = (value) => {
        if (namesHidden) return '••••';
        return String(value || 'Sin dato');
    };

    const safeMoney = (value) => {
        if (moneyHidden) return '••••';
        return formatUsd(value || 0);
    };

    const safePercent = (value) => {
        if (moneyHidden) return '••••';
        const amount = Number(value);
        if (!Number.isFinite(amount)) return 'N/D';
        return `${amount.toLocaleString('es-VE', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        })}%`;
    };

    const safePlainMoney = (value) => {
        if (moneyHidden) return '••••';
        const amount = Number(value);
        if (!Number.isFinite(amount)) return 'N/D';
        return amount.toLocaleString('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const incomeUsd = Number(moneyStats.incomeUsd || 0);
    const pendingUsd = Number(moneyStats.pendingUsd || 0);
    const currentResultUsd = Number(moneyStats.profitUsd || 0);
    const potentialResultUsd = currentResultUsd + pendingUsd;
    const totalExpectedCollection = incomeUsd + pendingUsd;
    const collectionRate = totalExpectedCollection > 0
        ? (incomeUsd / totalExpectedCollection) * 100
        : null;

    const lines = [
        '# Perfil Agricultor · Informe Global',
        '',
        `Generado: ${formatDateTime(new Date().toISOString())}`,
        '- Alcance: Informe global histórico de todo el Facturero y todos los cultivos.',
        '- Período: Desde el primer registro hasta hoy.',
        '- Monedas: USD · COP · Bs (VES).',
        '- Totales en USD: solo incluyen USD verificado (y conversiones confiables). Registros dudosos se excluyen y se muestran al final.',
        '',
        '## Cómo leer este informe',
        '- Este consolidado mezcla todos los cultivos y todos los movimientos del Facturero.',
        '- Fiados son montos por cobrar (no pérdidas directas).',
        '- Si un registro legacy está marcado como USD sin verificación, se excluye del total para evitar inflación.',
        '',
        '## Datos del Agricultor',
        `- Nombre: ${profileData.display_name || 'Sin definir'}`,
        `- Finca: ${profileData.farm_name || 'Sin definir'}`,
        `- Ubicación: ${profileData.location_text || 'Sin definir'}`,
        `- Teléfono: ${profileData.phone || 'Sin definir'}`,
        `- WhatsApp: ${profileData.whatsapp || 'Sin definir'}`,
        `- Instagram: ${profileData.instagram || 'Sin definir'}`,
        `- Facebook: ${profileData.facebook || 'Sin definir'}`,
        `- Biografía: ${profileData.notes || 'Sin notas'}`,
        '',
        '## Estado de Cultivos',
        `- Activos: ${Number(cropStats.active || 0)}`,
        `- Finalizados: ${Number(cropStats.finalized || 0)}`,
        `- Perdidos: ${Number(cropStats.lost || 0)}`,
        `- Total: ${Number(cropStats.total || 0)}`,
        '',
        '## Resumen en USD (verificado)',
        '- Nota: bloque unificado para comparar en una sola moneda usando solo datos confiables.',
        `- Ingresos cobrados: ${safeMoney(moneyStats.incomeUsd)}`,
        `- Gastos: ${safeMoney(moneyStats.expenseUsd)}`,
        `- Fiados: ${safeMoney(moneyStats.pendingUsd)}`,
        `- Pérdidas: ${safeMoney(moneyStats.lossesUsd)}`,
        `- Donaciones: ${safeMoney(moneyStats.transfersUsd)}`,
        `- Inversión base: ${safeMoney(moneyStats.investmentUsd)}`,
        `- Costos totales: ${safeMoney(moneyStats.costUsd)}`,
        `- Resultado actual (solo cobrados): ${safeMoney(currentResultUsd)}`,
        `- Resultado potencial (si cobras todos los fiados): ${safeMoney(potentialResultUsd)}`,
        `- Tasa de cobro: ${safePercent(collectionRate)}`,
    ];

    const unitsMd = formatUnitTotalsMarkdown(unitTotals, { heading: '## 📦 Unidades (Global)' }).trim();
    if (unitsMd) {
        lines.push('', unitsMd);
    }

    lines.push('', '## Top Compradores (Pagados)');

    const topBuyers = Array.isArray(stats.topBuyers) ? stats.topBuyers : [];
    if (!topBuyers.length) {
        lines.push('- Sin datos');
    } else {
        topBuyers.forEach((row, index) => {
            lines.push(`${index + 1}. ${safeName(row.name)} · ${safeMoney(row.totalUsd)} · ${row.count || 0} mov.`);
        });
    }

    lines.push('', '## Top Cultivos (Pagados)');
    const topCrops = Array.isArray(stats.topCrops) ? stats.topCrops : [];
    if (!topCrops.length) {
        lines.push('- Sin datos');
    } else {
        topCrops.forEach((row, index) => {
            lines.push(`${index + 1}. ${safeName(row.cropName)} · ${safeMoney(row.totalUsd)} · ${row.count || 0} mov.`);
        });
    }

    const unverifiedRows = Array.isArray(usdAudit.unverifiedRows) ? usdAudit.unverifiedRows : [];
    const unverifiedCount = Number(usdAudit.unverifiedCount || unverifiedRows.length || 0);
    if (unverifiedCount > 0) {
        lines.push('', '## ⚠ Registros legacy marcados como USD (NO confirmados, excluidos)');
        lines.push('- Estos registros tienen moneda marcada como "USD" en legacy, pero sin `monto_usd` confiable.');
        lines.push('- Para evitar totales inflados, no se suman. Revisa la moneda o completa el campo USD.');
        lines.push('- **No son USD confirmados.**');
        lines.push(`- Registros excluidos del total USD: ${unverifiedCount}`);
        lines.push('- Impacto en totales: 0 (excluidos)');
        lines.push('', '| Módulo | Cliente | Fecha | Concepto | Monto registrado (legacy) | Moneda registrada (legacy) | Estado | Qué hacer |');
        lines.push('| --- | --- | --- | --- | ---: | --- | --- | --- |');

        unverifiedRows.forEach((entry) => {
            const bucket = escapeMarkdownCell(entry?.bucket || 'General');
            const cliente = escapeMarkdownCell(namesHidden ? '••••' : (entry?.cliente || 'Sin cliente'));
            const fecha = escapeMarkdownCell(entry?.fecha || 'N/D');
            const concepto = escapeMarkdownCell(entry?.concepto || 'Sin concepto');
            const monto = escapeMarkdownCell(safePlainMoney(entry?.monto));
            const currencyRaw = escapeMarkdownCell(entry?.currency || 'N/D');
            const currency = escapeMarkdownCell(`${currencyRaw} (no verificado)`);
            const status = 'EXCLUIDO';
            const nextAction = 'Cambiar moneda (si no era USD) o completar monto_usd';
            lines.push(`| ${bucket} | ${cliente} | ${fecha} | ${concepto} | ${monto} | ${currency} | ${status} | ${nextAction} |`);
        });

        if (unverifiedRows.length < unverifiedCount) {
            lines.push(`| ... | ... | ... | ... | ... | ... | ... | +${unverifiedCount - unverifiedRows.length} registro(s) adicional(es) |`);
        }
    }

    if (Array.isArray(stats.warnings) && stats.warnings.length) {
        lines.push('', '## Avisos');
        if (unverifiedCount > 0) {
            lines.push(`- Hay ${unverifiedCount} registro(s) legacy excluido(s) (ver sección).`);
        }

        const nonUsdWarnings = stats.warnings.filter((warning) => {
            const text = String(warning || '').toLowerCase();
            return !text.includes('usd no verificado');
        });
        if (nonUsdWarnings.length) {
            lines.push(`- ${nonUsdWarnings[0]}`);
        } else if (unverifiedCount === 0) {
            lines.push(`- ${stats.warnings[0]}`);
        }
    }

    return `${lines.join('\n')}\n`;
}

function downloadMarkdown(content) {
    const normalized = normalizeMarkdownForExport(content);
    const blob = new Blob([`\ufeff${normalized}`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `agro_perfil_global_${stamp}.md`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function exportProfileMarkdown() {
    setExportButtonBusy(true);
    try {
        if (!state.stats) {
            await loadGlobalStats();
        }
        const unitTotals = await computeProfileGlobalUnitTotals();
        const md = buildProfileMarkdown({ unitTotals });
        downloadMarkdown(md);
        setProfileStatus('Informe exportado en Markdown.', 'ok');
    } catch (error) {
        console.error('[AGRO_PROFILE] export markdown error:', error);
        setProfileStatus('No se pudo exportar el informe.', 'error');
    } finally {
        setExportButtonBusy(false);
    }
}

async function openAndRefreshProfile(triggerElement = null) {
    if (triggerElement instanceof HTMLElement) {
        state.lastFocusedTrigger = triggerElement;
    }
    openProfileModal();
    await loadFarmerProfile();
    await loadPublicProfile();
}

async function openProfileEditFlow(triggerElement = null) {
    if (triggerElement instanceof HTMLElement) {
        state.lastFocusedTrigger = triggerElement;
    }

    try {
        const user = await resolveSessionUser();
        if (!state.profile && !state.loadingProfile) {
            await loadFarmerProfile();
        }

        const initialData = buildPrivateProfilePrefill(state.profile || {}, user);
        await openProfileEditWizard({
            initialData,
            onSave: async (wizardData) => {
                return await saveProfileEditFlow(wizardData);
            }
        });
    } catch (error) {
        console.error('[AGRO_PROFILE] open profile wizard error:', error);
        setProfileStatus('No se pudo abrir el editor guiado.', 'error');
        uxMessages.error({
            title: 'No pudimos abrir el editor guiado.',
            message: error.message || 'Intenta de nuevo en un momento.'
        });
    }
}

function bindOpenButtons() {
    const profileButton = document.getElementById('agro-profile-button');
    state.openButtons = [profileButton].filter(Boolean);
    state.openButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
                detail: { view: 'perfil', scroll: true }
            }));
        });
    });
}

function bindCloseHandlers() {
    const modal = getProfileModal();
    if (!modal) return;

    modal.querySelectorAll('[data-agro-profile-close]').forEach((node) => {
        node.addEventListener('click', (event) => {
            event.preventDefault();
            closeProfileModal();
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isProfileOpen()) {
            closeProfileModal();
        }
    });
}

function bindFormHandlers() {
    const form = document.getElementById(PROFILE_FORM_ID);
    if (form) {
        form.addEventListener('submit', saveFarmerProfile);
    }

    const exportBtn = document.getElementById(PROFILE_EXPORT_BUTTON_ID);
    if (exportBtn) {
        exportBtn.addEventListener('click', (event) => {
            event.preventDefault();
            exportProfileMarkdown();
        });
    }

    const avatarUrlInput = document.getElementById(PROFILE_AVATAR_URL_ID);
    if (avatarUrlInput) {
        avatarUrlInput.addEventListener('input', () => {
            const typedAvatar = normalizeAvatarUrl(avatarUrlInput.value);
            state.avatarDraftMode = 'url';
            state.avatarDraftValue = typedAvatar;
            const effective = typedAvatar || resolveEffectiveAvatarUrl(state.user);
            state.currentAvatarUrl = effective;
            updateProfileAvatarPreview(effective, state.profile || {}, state.user);
            updateProfileHeaderAvatar(effective, state.profile || {}, state.user);
        });
    }

    const avatarFileInput = document.getElementById(PROFILE_AVATAR_FILE_ID);
    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', () => {
            const file = avatarFileInput.files?.[0];
            if (!file) return;
            if (!String(file.type || '').startsWith('image/')) {
                setProfileStatus('Selecciona un archivo de imagen válido.', 'warn');
                avatarFileInput.value = '';
                return;
            }
            if (file.size > MAX_LOCAL_AVATAR_SIZE_BYTES) {
                setProfileStatus('La imagen es muy grande. Máximo permitido: 2MB.', 'warn');
                avatarFileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = normalizeAvatarUrl(reader.result);
                if (!dataUrl) {
                    setProfileStatus('No se pudo procesar la imagen.', 'error');
                    return;
                }
                state.avatarDraftMode = 'local';
                state.avatarDraftValue = dataUrl;
                state.currentAvatarUrl = dataUrl;
                if (avatarUrlInput) avatarUrlInput.value = '';
                updateProfileAvatarPreview(dataUrl, state.profile || {}, state.user);
                updateProfileHeaderAvatar(dataUrl, state.profile || {}, state.user);
                setProfileStatus('Foto local cargada. Guarda para aplicar el cambio.', 'ok');
                uxMessages.info(uxMessages.copy.profilePhotoReady());
            };
            reader.onerror = () => {
                setProfileStatus('No se pudo leer la imagen seleccionada.', 'error');
            };
            reader.readAsDataURL(file);
        });
    }

    const avatarClearBtn = document.getElementById(PROFILE_AVATAR_CLEAR_ID);
    if (avatarClearBtn) {
        avatarClearBtn.addEventListener('click', () => {
            state.avatarDraftMode = 'clear';
            state.avatarDraftValue = '';
            state.currentAvatarUrl = '';

            if (avatarUrlInput) avatarUrlInput.value = '';
            if (avatarFileInput) avatarFileInput.value = '';

            updateProfileAvatarPreview('', state.profile || {}, state.user);
            updateProfileHeaderAvatar('', state.profile || {}, state.user);
            setProfileStatus('Avatar limpiado. Guarda para confirmar.', 'warn');
        });
    }

    const openPublicProfileBtn = document.getElementById(PROFILE_PUBLIC_PREVIEW_BUTTON_ID);
    if (openPublicProfileBtn) {
        openPublicProfileBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const user = await resolveSessionUser();
                if (!user?.id) {
                    setProfileStatus('Sesion no disponible para abrir perfil publico.', 'warn');
                    return;
                }
                await openPublicFarmerProfile(user.id);
            } catch (error) {
                console.error('[AGRO_PROFILE] open public preview error:', error);
                setProfileStatus('No se pudo abrir la vista publica.', 'error');
            }
        });
    }
}

export function initAgroPerfil({ supabase } = {}) {
    if (state.initialized) return;
    if (!supabase) {
        console.warn('[AGRO_PROFILE] Supabase client missing, perfil no inicializado.');
        return;
    }

    const modal = getProfileModal();
    if (!modal) {
        console.warn('[AGRO_PROFILE] modal-agro-profile no encontrado.');
        return;
    }

    state.supabase = supabase;
    state.initialized = true;

    initAgroPublico({ supabase });
    bindOpenButtons();
    bindCloseHandlers();
    bindFormHandlers();

    setButtonsExpanded(false);
    setStatsUpdatedAt(null);
    setProfileStatus('', 'muted');

    bindGlobalStatsToggle();
    bindPerfilEditButton();

    loadFarmerProfile().then(() => {
        loadPublicProfile().catch(() => { });
    }).catch((err) => {
        console.warn('[AGRO_PROFILE] early profile load:', err);
    });

    window.loadAgroGlobalStats = function () {
        return loadGlobalStats().catch((err) => {
            console.error('[AGRO_PROFILE] loadGlobalStats via window error:', err);
        });
    };
    window.exportAgroGlobalMd = function () {
        return exportProfileMarkdown();
    };
    window.syncPerfilViewFromProfile = function () {
        syncPerfilDedicatedView();
        syncProfileEditEntrySummary(state.profile || {}, state.user);
    };
}

function bindPerfilEditButton() {
    document.querySelectorAll('[data-profile-edit-trigger]').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            openProfileEditFlow(button);
        });
    });
}

function syncPerfilDedicatedView() {
    const profile = state.profile || {};
    const user = state.user || null;

    const fieldMap = {
        'perfil-view-farm': profile.farm_name,
        'perfil-view-location': profile.location_text,
        'perfil-view-phone': profile.phone,
        'perfil-view-whatsapp': profile.whatsapp,
        'perfil-view-instagram': profile.instagram,
        'perfil-view-facebook': profile.facebook
    };

    Object.entries(fieldMap).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const safe = String(value || '').trim();
        el.textContent = safe || 'Sin definir';
        el.classList.toggle('perfil-card__value--empty', !safe);
    });

    const bioSection = document.getElementById('perfil-view-bio-section');
    const bioText = document.getElementById('perfil-view-bio');
    const bio = String(profile.notes || '').trim();
    if (bioSection) {
        bioSection.hidden = !bio;
    }
    if (bioText) {
        bioText.textContent = bio;
    }

    const displayName = resolveDisplayName(profile, user);
    const nameEl = document.getElementById('perfil-view-name');
    if (nameEl) nameEl.textContent = displayName || 'Agricultor';

    const greetingEl = document.getElementById('perfil-view-greeting');
    if (greetingEl) greetingEl.textContent = `Bienvenido, ${displayName || 'Agricultor'}`;

    const emailEl = document.getElementById('perfil-view-email');
    if (emailEl) emailEl.textContent = user?.email || '';
}
