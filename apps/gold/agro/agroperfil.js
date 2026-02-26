import { formatUsd, getGlobalStats } from './agroestadistica.js';
import {
    applyBuyerPrivacy,
    applyMoneyPrivacy,
    readBuyerNamesHidden,
    readMoneyValuesHidden
} from './agro-privacy.js';

const PROFILE_MODAL_ID = 'modal-agro-profile';
const PROFILE_FORM_ID = 'agro-profile-form';
const PROFILE_STATUS_ID = 'agro-profile-status';
const PROFILE_UPDATED_ID = 'agro-profile-stats-updated';
const PROFILE_EXPORT_BUTTON_ID = 'btn-export-agro-profile-md';
const PROFILE_SAVE_BUTTON_ID = 'btn-save-agro-profile';

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
    stats: null,
    user: null,
    supabase: null,
    openButtons: [],
    lastFocusedTrigger: null
};

function setProfileStatus(message = '', level = 'muted') {
    const statusEl = document.getElementById(PROFILE_STATUS_ID);
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

function openProfileModal() {
    const modal = getProfileModal();
    if (!modal) return;
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
}

function fillProfileForm(profile = {}, user = null) {
    const displayNameFallback = resolveDisplayName(profile, user);

    PROFILE_FIELD_IDS.forEach((fieldName) => {
        const input = document.getElementById(`agro-profile-${fieldName}`);
        if (!input) return;
        const nextValue = profile?.[fieldName];
        if (fieldName === 'display_name') {
            input.value = String(nextValue || displayNameFallback || '').trim();
            return;
        }
        input.value = String(nextValue || '').trim();
    });
}

function readProfileForm() {
    const payload = {};
    PROFILE_FIELD_IDS.forEach((fieldName) => {
        const input = document.getElementById(`agro-profile-${fieldName}`);
        if (!input) return;
        payload[fieldName] = String(input.value || '').trim();
    });
    return payload;
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
            .select('user_id,display_name,farm_name,location_text,phone,whatsapp,instagram,facebook,notes,created_at,updated_at')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;

        state.profile = data || null;
        fillProfileForm(data || {}, user);
        updateProfileHeaderName(data || {}, user);
        setProfileStatus('Perfil listo.', 'ok');
    } catch (error) {
        console.error('[AGRO_PROFILE] load profile error:', error);
        setProfileStatus('No se pudo cargar el perfil.', 'error');
    } finally {
        state.loadingProfile = false;
    }
}

async function saveFarmerProfile(event) {
    event?.preventDefault();
    if (state.loadingProfile) return;

    state.loadingProfile = true;
    setSaveButtonBusy(true);
    setProfileStatus('Guardando perfil...', 'muted');

    try {
        const user = await resolveSessionUser();
        if (!user?.id) {
            throw new Error('Sesión no disponible.');
        }

        const formData = readProfileForm();
        const payload = {
            user_id: user.id,
            ...formData,
            updated_at: new Date().toISOString()
        };

        const { error } = await state.supabase
            .from('agro_farmer_profile')
            .upsert(payload, { onConflict: 'user_id' });

        if (error) throw error;

        state.profile = payload;
        updateProfileHeaderName(payload, user);
        setProfileStatus('Perfil guardado correctamente.', 'ok');
    } catch (error) {
        console.error('[AGRO_PROFILE] save profile error:', error);
        setProfileStatus('No se pudo guardar el perfil.', 'error');
    } finally {
        state.loadingProfile = false;
        setSaveButtonBusy(false);
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

async function loadGlobalStats() {
    state.loadingStats = true;
    setProfileStatus('Actualizando resumen global...', 'muted');

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
            setProfileStatus(`Perfil listo con avisos: ${stats.warnings[0]}`, 'warn');
        } else {
            setProfileStatus('Perfil listo.', 'ok');
        }

        const modal = getProfileModal();
        if (modal) {
            applyBuyerPrivacy(modal);
            applyMoneyPrivacy(modal);
        }
    } catch (error) {
        console.error('[AGRO_PROFILE] load stats error:', error);
        setProfileStatus('No se pudo cargar el resumen global.', 'error');
    } finally {
        state.loadingStats = false;
    }
}

function buildProfileMarkdown() {
    const profileData = state.profile || {};
    const stats = state.stats || {};
    const cropStats = stats.crops || {};
    const moneyStats = stats.money || {};
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

    const lines = [
        '# Perfil Agricultor · Informe Global',
        '',
        `Generado: ${formatDateTime(new Date().toISOString())}`,
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
        '## Resumen Financiero (USD)',
        `- Ingresos cobrados: ${safeMoney(moneyStats.incomeUsd)}`,
        `- Gastos: ${safeMoney(moneyStats.expenseUsd)}`,
        `- Fiados: ${safeMoney(moneyStats.pendingUsd)}`,
        `- Pérdidas: ${safeMoney(moneyStats.lossesUsd)}`,
        `- Donaciones: ${safeMoney(moneyStats.transfersUsd)}`,
        `- Inversión base: ${safeMoney(moneyStats.investmentUsd)}`,
        `- Costos totales: ${safeMoney(moneyStats.costUsd)}`,
        `- Rentabilidad: ${safeMoney(moneyStats.profitUsd)}`,
        '',
        '## Top Compradores (Pagados)',
    ];

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

    if (Array.isArray(stats.warnings) && stats.warnings.length) {
        lines.push('', '## Avisos');
        stats.warnings.forEach((warning) => {
            lines.push(`- ${warning}`);
        });
    }

    return `${lines.join('\n')}\n`;
}

function downloadMarkdown(content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
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
        const md = buildProfileMarkdown();
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
    await Promise.all([
        loadFarmerProfile(),
        loadGlobalStats()
    ]);
}

function bindOpenButtons() {
    const profileButton = document.getElementById('agro-profile-button');
    const profileCta = document.getElementById('btn-open-agro-profile');
    state.openButtons = [profileButton, profileCta].filter(Boolean);
    state.openButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            openAndRefreshProfile(event.currentTarget).catch((error) => {
                console.error('[AGRO_PROFILE] open profile error:', error);
                setProfileStatus('No se pudo abrir el perfil.', 'error');
            });
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

    bindOpenButtons();
    bindCloseHandlers();
    bindFormHandlers();

    setButtonsExpanded(false);
    setStatsUpdatedAt(null);
    setProfileStatus('Abre tu perfil para cargar datos globales.', 'muted');
}
