import { normalizeBuyerGroupKey } from './agro-cartera-viva.js';

const EDIT_HOST_ID = 'edit-client-assignment';
const RELEVANT_TABS = new Set(['pendientes', 'ingresos', 'perdidas', 'transferencias']);
const BUYER_IDENTITY_TABS = new Set(['pendientes', 'ingresos', 'perdidas']);

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function getHost() {
    return document.getElementById(EDIT_HOST_ID);
}

function normalizeTabName(tabName) {
    return String(tabName || '').trim().toLowerCase();
}

function normalizeName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function resolveBuyerOption(buyer) {
    const displayName = normalizeName(buyer?.display_name) || 'Cliente sin nombre';
    const groupKey = normalizeBuyerGroupKey(buyer?.group_key || buyer?.canonical_name || displayName);
    return {
        id: String(buyer?.id || '').trim(),
        displayName,
        groupKey
    };
}

function pickCurrentBuyerId(item, buyers, currentName) {
    const directId = String(item?.buyer_id || '').trim();
    if (directId && buyers.some((buyer) => String(buyer?.id || '').trim() === directId)) return directId;

    const currentGroup = normalizeBuyerGroupKey(
        item?.buyer_group_key
        || item?.group_key
        || item?.canonical_name
        || currentName
    );
    if (!currentGroup) return '';

    const match = buyers.find((buyer) => {
        const option = resolveBuyerOption(buyer);
        return option.groupKey === currentGroup;
    });
    return String(match?.id || '').trim();
}

function renderEditor({ tabName, currentName, buyers = [], loading = false, selectedBuyerId = '' }) {
    const safeCurrentName = normalizeName(currentName);
    const safeTab = normalizeTabName(tabName);
    const buyerOptions = buyers
        .map(resolveBuyerOption)
        .filter((buyer) => buyer.id);
    const selectedId = selectedBuyerId || '';
    const existingPanel = loading
        ? '<p class="client-assignment-editor__hint">Cargando clientes...</p>'
        : (buyerOptions.length
            ? `<select class="styled-input" data-client-assignment-existing>
                    ${buyerOptions.map((buyer) => `
                        <option
                            value="${escapeAttr(buyer.id)}"
                            data-display-name="${escapeAttr(buyer.displayName)}"
                            data-group-key="${escapeAttr(buyer.groupKey)}"
                            ${buyer.id === selectedId ? 'selected' : ''}>
                            ${escapeHtml(buyer.displayName)}
                        </option>
                    `).join('')}
                </select>`
            : '<p class="client-assignment-editor__hint">No hay clientes existentes disponibles</p>');

    return `
        <fieldset
            class="client-assignment-editor"
            data-client-assignment-editor
            data-client-assignment-tab="${escapeAttr(safeTab)}"
            data-client-assignment-mode="new"
            data-client-assignment-current="${escapeAttr(safeCurrentName)}"
            data-client-assignment-touched="0">
            <legend>Cliente</legend>
            <div class="client-assignment-editor__tabs" role="group" aria-label="Cliente del movimiento">
                <button type="button" class="client-assignment-editor__tab" data-client-assignment-mode-button="existing">
                    Cliente existente
                </button>
                <button type="button" class="client-assignment-editor__tab is-active" data-client-assignment-mode-button="new">
                    Nuevo cliente
                </button>
            </div>
            <div class="client-assignment-editor__panel" data-client-assignment-panel="existing" hidden>
                ${existingPanel}
            </div>
            <div class="client-assignment-editor__panel" data-client-assignment-panel="new">
                <input
                    type="text"
                    class="styled-input"
                    data-client-assignment-new
                    maxlength="120"
                    value="${escapeAttr(safeCurrentName)}"
                    placeholder="Nombre del cliente">
                <p class="client-assignment-editor__hint">Cuenta YavlGold vinculada solo con verificación segura futura. Puedes guardar sin vincular.</p>
            </div>
        </fieldset>
    `;
}

function syncMode(host, mode) {
    const editor = host.querySelector('[data-client-assignment-editor]');
    if (!editor) return;

    const safeMode = mode === 'existing' ? 'existing' : 'new';
    editor.dataset.clientAssignmentMode = safeMode;
    editor.dataset.clientAssignmentTouched = '1';

    host.querySelectorAll('[data-client-assignment-mode-button]').forEach((button) => {
        const active = button.getAttribute('data-client-assignment-mode-button') === safeMode;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    host.querySelectorAll('[data-client-assignment-panel]').forEach((panel) => {
        panel.hidden = panel.getAttribute('data-client-assignment-panel') !== safeMode;
    });
}

function bindHostEvents(host) {
    if (host.dataset.clientAssignmentBound === '1') return;
    host.dataset.clientAssignmentBound = '1';

    host.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest('[data-client-assignment-mode-button]');
        if (!button || !host.contains(button)) return;
        syncMode(host, button.getAttribute('data-client-assignment-mode-button'));
    });

    host.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (!target.matches('[data-client-assignment-new]')) return;
        const editor = host.querySelector('[data-client-assignment-editor]');
        if (editor) editor.dataset.clientAssignmentTouched = '1';
    });
}

async function loadBuyers({ supabase, userId }) {
    if (!supabase || !userId) return [];
    const { data, error } = await supabase
        .from('agro_buyers')
        .select('id,display_name,group_key,canonical_name,status')
        .eq('user_id', userId)
        .neq('status', 'archived')
        .order('display_name', { ascending: true });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

export async function setupClientAssignmentEditor({
    supabase,
    userId,
    tabName,
    item,
    currentName
} = {}) {
    const host = getHost();
    const safeTab = normalizeTabName(tabName);
    if (!host) return;

    host.replaceChildren();
    host.hidden = true;

    if (!RELEVANT_TABS.has(safeTab)) return;

    const safeCurrentName = normalizeName(currentName);
    const sessionKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    host.dataset.clientAssignmentSession = sessionKey;
    host.hidden = false;
    host.innerHTML = renderEditor({
        tabName: safeTab,
        currentName: safeCurrentName,
        loading: true
    });
    bindHostEvents(host);

    try {
        const buyers = await loadBuyers({ supabase, userId });
        if (host.dataset.clientAssignmentSession !== sessionKey) return;
        const selectedBuyerId = pickCurrentBuyerId(item, buyers, safeCurrentName);
        host.innerHTML = renderEditor({
            tabName: safeTab,
            currentName: safeCurrentName,
            buyers,
            selectedBuyerId
        });
    } catch (error) {
        if (host.dataset.clientAssignmentSession !== sessionKey) return;
        console.warn('[AGRO][CLIENT_ASSIGNMENT] buyer list unavailable:', error?.message || error);
        host.innerHTML = renderEditor({
            tabName: safeTab,
            currentName: safeCurrentName,
            buyers: []
        });
    }
}

export async function resolveClientAssignmentEditor({
    tabName,
    currentName
} = {}) {
    const host = getHost();
    const safeTab = normalizeTabName(tabName);
    const fallbackName = normalizeName(currentName);
    const editor = host?.querySelector('[data-client-assignment-editor]');

    if (!host || !editor || host.hidden || !RELEVANT_TABS.has(safeTab)) {
        return {
            whoValue: fallbackName,
            buyerPayload: null,
            changed: false
        };
    }

    const touched = editor.dataset.clientAssignmentTouched === '1';
    const mode = editor.dataset.clientAssignmentMode === 'existing' ? 'existing' : 'new';

    if (!touched) {
        return {
            whoValue: fallbackName,
            buyerPayload: null,
            changed: false
        };
    }

    if (mode === 'existing') {
        const select = host.querySelector('[data-client-assignment-existing]');
        const option = select instanceof HTMLSelectElement
            ? select.options[select.selectedIndex]
            : null;
        const buyerId = normalizeName(select?.value);
        const displayName = normalizeName(option?.dataset?.displayName || option?.textContent || '');
        const groupKey = normalizeBuyerGroupKey(option?.dataset?.groupKey || displayName);
        if (!buyerId || !displayName || !groupKey) {
            throw new Error('Selecciona un cliente existente.');
        }
        return {
            whoValue: displayName,
            buyerPayload: BUYER_IDENTITY_TABS.has(safeTab)
                ? {
                    buyer_id: buyerId,
                    buyer_group_key: groupKey,
                    buyer_match_status: 'matched'
                }
                : null,
            changed: displayName !== fallbackName
        };
    }

    const input = host.querySelector('[data-client-assignment-new]');
    const nextName = normalizeName(input?.value);
    if (!nextName) {
        throw new Error('Ingresa el nombre del cliente.');
    }

    return {
        whoValue: nextName,
        buyerPayload: null,
        changed: nextName !== fallbackName
    };
}
