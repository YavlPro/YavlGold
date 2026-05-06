import { normalizeBuyerGroupKey } from './agro-cartera-viva.js';

const EDIT_HOST_ID = 'edit-client-assignment';
const BUYER_TABLE = 'agro_buyers';
const BUYER_SELECT = 'id,display_name,group_key,canonical_name,phone,whatsapp,status,created_at,updated_at';
const CLIENT_EDIT_TABS = new Set(['pendientes', 'ingresos', 'perdidas', 'transferencias']);

function normalizeText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function getHost() {
    return document.getElementById(EDIT_HOST_ID);
}

function normalizeBuyerId(value) {
    return String(value || '').trim();
}

function normalizeMode(value, buyers = []) {
    const token = String(value || '').trim().toLowerCase();
    if (token === 'new') return 'new';
    if (token === 'existing' && buyers.length > 0) return 'existing';
    return buyers.length > 0 ? 'existing' : 'new';
}

function normalizeStoredMode(value) {
    return String(value || '').trim().toLowerCase() === 'existing' ? 'existing' : 'new';
}

function getBuyerDisplayName(buyer) {
    return normalizeText(buyer?.display_name || buyer?.canonical_name || buyer?.group_key || 'Cliente');
}

function getBuyerGroupKey(buyer) {
    return normalizeBuyerGroupKey(buyer?.group_key || buyer?.canonical_name || buyer?.display_name || '');
}

function buyerMatchesCurrent(buyer, item = {}, currentName = '') {
    const buyerId = normalizeBuyerId(buyer?.id);
    const itemBuyerId = normalizeBuyerId(item?.buyer_id);
    if (buyerId && itemBuyerId && buyerId === itemBuyerId) return true;

    const buyerKey = getBuyerGroupKey(buyer);
    const itemKey = normalizeBuyerGroupKey(item?.buyer_group_key || currentName || '');
    return Boolean(buyerKey && itemKey && buyerKey === itemKey);
}

async function fetchActiveBuyers(supabase, userId) {
    const { data, error } = await supabase
        .from(BUYER_TABLE)
        .select(BUYER_SELECT)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('display_name', { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

function renderBuyerOptions(buyers, selectedBuyerId = '') {
    if (!buyers.length) {
        return '<option value="">No hay clientes disponibles</option>';
    }

    return buyers.map((buyer) => {
        const id = normalizeBuyerId(buyer?.id);
        const displayName = getBuyerDisplayName(buyer);
        const contact = normalizeText(buyer?.whatsapp || buyer?.phone || '');
        const label = contact ? `${displayName} · ${contact}` : displayName;
        return `<option value="${escapeAttr(id)}"${id === selectedBuyerId ? ' selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('');
}

function renderAssignment(state) {
    const host = getHost();
    if (!host) return;

    const mode = normalizeMode(state.mode, state.buyers);
    const currentName = normalizeText(state.currentName);
    const selectedBuyerId = normalizeBuyerId(state.selectedBuyerId);
    const hasBuyers = state.buyers.length > 0;

    host.hidden = false;
    host.innerHTML = `
        <fieldset class="client-assignment-block">
            <legend>Cliente</legend>
            <p class="client-assignment-block__copy">Cambia el cliente del movimiento sin modificar monto, estado ni fecha.</p>

            <div class="client-assignment-tabs" role="group" aria-label="Modo de cliente">
                <button type="button" class="client-assignment-tab${mode === 'existing' ? ' is-active' : ''}" data-client-assignment-mode="existing"${hasBuyers ? '' : ' disabled'}>
                    Cliente existente
                </button>
                <button type="button" class="client-assignment-tab${mode === 'new' ? ' is-active' : ''}" data-client-assignment-mode="new">
                    Nuevo cliente
                </button>
            </div>

            <div class="client-assignment-panel" data-client-assignment-panel="existing"${mode === 'existing' ? '' : ' hidden'}>
                <label class="input-group">
                    <span class="input-label">Buscar/seleccionar cliente</span>
                    <select class="styled-input" data-client-assignment-existing ${hasBuyers ? '' : 'disabled'}>
                        ${renderBuyerOptions(state.buyers, selectedBuyerId)}
                    </select>
                </label>
            </div>

            <div class="client-assignment-panel" data-client-assignment-panel="new"${mode === 'new' ? '' : ' hidden'}>
                <label class="input-group">
                    <span class="input-label">Nombre del cliente *</span>
                    <input type="text" class="styled-input" data-client-assignment-new-name maxlength="120" value="${escapeAttr(state.newName || currentName)}" placeholder="Ej: Yony chupeto">
                </label>
                <div class="client-assignment-inline">
                    <label class="input-group">
                        <span class="input-label">Contacto opcional</span>
                        <input type="text" class="styled-input" data-client-assignment-new-contact maxlength="60" value="${escapeAttr(state.newContact)}" placeholder="Teléfono o WhatsApp">
                    </label>
                    <label class="input-group">
                        <span class="input-label">Finca/alias opcional</span>
                        <input type="text" class="styled-input" data-client-assignment-new-note maxlength="160" value="${escapeAttr(state.newNote)}" placeholder="Alias, finca o referencia">
                    </label>
                </div>
                <p class="client-assignment-block__hint">El correo de cuenta YavlGold no se vincula aquí sin verificación segura.</p>
            </div>
        </fieldset>
    `;

    host.dataset.clientAssignmentReady = '1';
    host.dataset.clientAssignmentMode = mode;
    host.dataset.clientAssignmentSupported = '1';
}

function readHostState() {
    const host = getHost();
    if (!host || host.dataset.clientAssignmentSupported !== '1') return null;

    return {
        mode: normalizeStoredMode(host.dataset.clientAssignmentMode),
        selectedBuyerId: normalizeBuyerId(host.querySelector('[data-client-assignment-existing]')?.value),
        newName: normalizeText(host.querySelector('[data-client-assignment-new-name]')?.value),
        newContact: normalizeText(host.querySelector('[data-client-assignment-new-contact]')?.value),
        newNote: normalizeText(host.querySelector('[data-client-assignment-new-note]')?.value)
    };
}

function bindHostEvents(state) {
    const host = getHost();
    if (!host) return;

    host.onclick = (event) => {
        const button = event.target.closest('[data-client-assignment-mode]');
        if (!button || !host.contains(button)) return;
        const nextMode = normalizeMode(button.dataset.clientAssignmentMode, state.buyers);
        state.mode = nextMode;
        host.dataset.clientAssignmentMode = nextMode;
        renderAssignment(state);
        bindHostEvents(state);
    };

    host.onchange = (event) => {
        const target = event.target;
        if (target.matches('[data-client-assignment-existing]')) {
            state.selectedBuyerId = normalizeBuyerId(target.value);
        }
    };

    host.oninput = (event) => {
        const target = event.target;
        if (target.matches('[data-client-assignment-new-name]')) state.newName = normalizeText(target.value);
        if (target.matches('[data-client-assignment-new-contact]')) state.newContact = normalizeText(target.value);
        if (target.matches('[data-client-assignment-new-note]')) state.newNote = normalizeText(target.value);
    };
}

async function ensureBuyer(supabase, userId, draft) {
    const displayName = normalizeText(draft.displayName);
    const groupKey = normalizeBuyerGroupKey(displayName);
    if (!displayName || !groupKey) {
        throw new Error('El nombre del cliente es obligatorio.');
    }

    const existing = await supabase
        .from(BUYER_TABLE)
        .select(BUYER_SELECT)
        .eq('user_id', userId)
        .eq('group_key', groupKey)
        .maybeSingle();

    if (existing.error) throw existing.error;
    if (existing.data?.id) return existing.data;

    const contact = normalizeText(draft.contact);
    const note = normalizeText(draft.note);
    const payload = {
        user_id: userId,
        display_name: displayName,
        group_key: groupKey,
        canonical_name: groupKey,
        status: 'active',
        phone: contact || null,
        whatsapp: contact || null,
        notes: note || null,
        linked_user_id: null
    };

    const { data, error } = await supabase
        .from(BUYER_TABLE)
        .insert([payload])
        .select(BUYER_SELECT)
        .single();

    if (error) throw error;
    if (!data?.id) throw new Error('No se pudo crear el cliente.');
    return data;
}

export async function setupFactureroClientAssignment({
    supabase,
    userId,
    tabName,
    item = {},
    currentName = ''
} = {}) {
    const host = getHost();
    if (!host) return;

    host.replaceChildren();
    host.hidden = true;
    host.dataset.clientAssignmentSupported = '0';
    host.dataset.clientAssignmentReady = '0';
    host.onclick = null;
    host.onchange = null;
    host.oninput = null;

    const safeTab = String(tabName || '').trim().toLowerCase();
    if (!CLIENT_EDIT_TABS.has(safeTab) || !supabase || !userId) return;

    host.hidden = false;
    host.innerHTML = `
        <fieldset class="client-assignment-block">
            <legend>Cliente</legend>
            <p class="client-assignment-block__copy">Cargando clientes...</p>
        </fieldset>
    `;

    const buyers = await fetchActiveBuyers(supabase, userId);
    const selected = buyers.find((buyer) => buyerMatchesCurrent(buyer, item, currentName)) || null;
    const state = {
        buyers,
        selectedBuyerId: normalizeBuyerId(selected?.id),
        currentName: normalizeText(currentName),
        newName: normalizeText(currentName),
        newContact: '',
        newNote: '',
        mode: selected ? 'existing' : 'new'
    };

    renderAssignment(state);
    bindHostEvents(state);
}

export async function resolveFactureroClientAssignment({
    supabase,
    userId,
    tabName,
    currentWhoValue = ''
} = {}) {
    const safeTab = String(tabName || '').trim().toLowerCase();
    if (!CLIENT_EDIT_TABS.has(safeTab)) return null;

    const draft = readHostState();
    if (!draft || !supabase || !userId) return null;

    let buyer = null;
    if (draft.mode === 'existing') {
        if (!draft.selectedBuyerId) {
            throw new Error('Selecciona un cliente existente.');
        }
        const { data, error } = await supabase
            .from(BUYER_TABLE)
            .select(BUYER_SELECT)
            .eq('user_id', userId)
            .eq('id', draft.selectedBuyerId)
            .maybeSingle();

        if (error) throw error;
        if (!data?.id) throw new Error('No se encontró el cliente seleccionado.');
        buyer = data;
    } else {
        buyer = await ensureBuyer(supabase, userId, {
            displayName: draft.newName || currentWhoValue,
            contact: draft.newContact,
            note: draft.newNote
        });
    }

    const displayName = getBuyerDisplayName(buyer);
    const groupKey = getBuyerGroupKey(buyer);
    if (!displayName || !groupKey || !buyer?.id) {
        throw new Error('No se pudo resolver el cliente del movimiento.');
    }

    return {
        whoValue: displayName,
        buyerPayload: safeTab === 'transferencias' ? null : {
            buyer_id: buyer.id,
            buyer_group_key: groupKey,
            buyer_match_status: 'matched'
        }
    };
}

export async function mergeCarteraVivaBuyers({
    supabase,
    userId,
    selectedRows = [],
    targetBuyerId = '',
    finalName = ''
} = {}) {
    const rows = Array.isArray(selectedRows) ? selectedRows : [];
    const safeUserId = normalizeBuyerId(userId);
    const safeTargetId = normalizeBuyerId(targetBuyerId);
    if (!supabase || !safeUserId) throw new Error('Sesión no disponible.');
    if (rows.length < 2) throw new Error('Selecciona al menos dos clientes.');
    if (!safeTargetId) throw new Error('Elige el cliente destino.');

    const targetRow = rows.find((row) => normalizeBuyerId(row?.buyer_id) === safeTargetId) || null;
    const sourceRows = rows.filter((row) => normalizeBuyerId(row?.buyer_id) && normalizeBuyerId(row?.buyer_id) !== safeTargetId);
    if (!targetRow || sourceRows.length < 1) throw new Error('La fusión necesita un destino y al menos un origen.');

    const targetName = normalizeText(finalName || targetRow.display_name || 'Cliente');
    const targetGroupKey = normalizeBuyerGroupKey(targetName);
    if (!targetName || !targetGroupKey) throw new Error('El nombre final del cliente es obligatorio.');

    const sourceBuyerIds = sourceRows.map((row) => normalizeBuyerId(row?.buyer_id)).filter(Boolean);
    const sourceGroupKeys = sourceRows
        .map((row) => normalizeBuyerGroupKey(row?.buyer_group_key || row?.group_key || row?.canonical_name || row?.display_name || ''))
        .filter(Boolean);

    const archivedAt = Date.now().toString(36);
    await Promise.all(sourceRows.map((row) => {
        const sourceId = normalizeBuyerId(row?.buyer_id);
        if (!sourceId) return Promise.resolve();
        const oldKey = normalizeBuyerGroupKey(row?.buyer_group_key || row?.group_key || row?.canonical_name || row?.display_name || sourceId);
        const archiveKey = `${oldKey || 'cliente'}-fusionado-${sourceId.slice(0, 8)}-${archivedAt}`;
        return supabase
            .from(BUYER_TABLE)
            .update({
                status: 'archived',
                group_key: archiveKey,
                canonical_name: archiveKey,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', safeUserId)
            .eq('id', sourceId)
            .then((result) => {
                if (result.error) throw result.error;
            });
    }));

    const targetUpdate = await supabase
        .from(BUYER_TABLE)
        .update({
            display_name: targetName,
            group_key: targetGroupKey,
            canonical_name: targetGroupKey,
            status: 'active',
            updated_at: new Date().toISOString()
        })
        .eq('user_id', safeUserId)
        .eq('id', safeTargetId);
    if (targetUpdate.error) throw targetUpdate.error;

    const movementTables = ['agro_pending', 'agro_income', 'agro_losses'];
    await Promise.all(movementTables.flatMap((tableName) => {
        const updates = [];
        if (sourceBuyerIds.length) {
            updates.push(
                supabase
                    .from(tableName)
                    .update({
                        buyer_id: safeTargetId,
                        buyer_group_key: targetGroupKey,
                        buyer_match_status: 'matched'
                    })
                    .eq('user_id', safeUserId)
                    .in('buyer_id', sourceBuyerIds)
                    .then((result) => {
                        if (result.error) throw result.error;
                    })
            );
        }
        if (sourceGroupKeys.length) {
            updates.push(
                supabase
                    .from(tableName)
                    .update({
                        buyer_id: safeTargetId,
                        buyer_group_key: targetGroupKey,
                        buyer_match_status: 'matched'
                    })
                    .eq('user_id', safeUserId)
                    .is('buyer_id', null)
                    .in('buyer_group_key', sourceGroupKeys)
                    .then((result) => {
                        if (result.error) throw result.error;
                    })
            );
        }
        return updates;
    }));

    if (sourceGroupKeys.length) {
        const threads = await supabase
            .from('agro_social_threads')
            .update({ buyer_group_key: targetGroupKey })
            .eq('user_id', safeUserId)
            .in('buyer_group_key', sourceGroupKeys);
        if (threads.error) {
            console.warn('[CarteraViva] social thread merge skipped:', threads.error?.message || threads.error);
        }
    }

    return {
        targetBuyerId: safeTargetId,
        targetName,
        targetGroupKey,
        mergedCount: sourceRows.length + 1
    };
}
