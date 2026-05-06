import { normalizeBuyerGroupKey } from './agro-cartera-viva.js';

const MODAL_ID = 'modal-client-merge';
const MERGE_TABLES = ['agro_pending', 'agro_income', 'agro_losses'];

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

async function loadBuyers(supabase, userId) {
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

function renderBuyerOption(buyer) {
    return {
        id: String(buyer.id || '').trim(),
        displayName: String(buyer.display_name || '').trim() || 'Cliente sin nombre',
        groupKey: normalizeBuyerGroupKey(buyer.group_key || buyer.canonical_name || buyer.display_name)
    };
}

function getOrCreateModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'cartera-viva-merge-overlay';
    modal.hidden = true;
    document.body.appendChild(modal);
    return modal;
}

function renderDestinationCombobox(buyers, selectedId) {
    const selected = selectedId ? buyers.find((b) => b.id === selectedId) : null;
    const triggerLabel = selected ? selected.displayName : 'Selecciona el cliente destino';
    const optionsHtml = buyers.map((b) => {
        const sel = b.id === selectedId ? ' is-selected' : '';
        return `<button type="button" role="option" class="cartera-viva-merge__combo-option${sel}" data-merge-dest-option data-value="${escapeAttr(b.id)}" data-display-name="${escapeAttr(b.displayName)}" data-group-key="${escapeAttr(b.groupKey)}">${escapeHtml(b.displayName)}</button>`;
    }).join('');
    return `<div class="cartera-viva-merge__combobox" data-merge-dest-combobox data-merge-selected-id="${escapeAttr(selectedId || '')}" data-merge-selected-display-name="${escapeAttr(selected?.display_name || '')}" data-merge-selected-group-key="${escapeAttr(selected?.groupKey || '')}"><button type="button" class="cartera-viva-merge__combo-trigger" data-merge-dest-trigger>${escapeHtml(triggerLabel)}</button><div class="cartera-viva-merge__combo-list" role="listbox" data-merge-dest-list hidden>${optionsHtml}</div></div>`;
}

function renderOriginChips(buyers, selectedIds) {
    const idSet = new Set(selectedIds);
    const chipsHtml = buyers.map((b) => {
        const selected = idSet.has(b.id) ? ' is-selected' : '';
        return `<button type="button" class="cartera-viva-merge__origin-chip${selected}" data-merge-origin-chip data-merge-origin-id="${escapeAttr(b.id)}" data-merge-origin-display-name="${escapeAttr(b.displayName)}" aria-pressed="${idSet.has(b.id)}">${escapeHtml(b.displayName)}</button>`;
    }).join('');
    return chipsHtml;
}

function renderModalContent({ buyers = [], destBuyerId = '', originBuyerIds = [], step = 'select', summary = null, merging = false, error = '' }) {
    const filteredBuyers = buyers.map(renderBuyerOption);
    const destCombobox = renderDestinationCombobox(filteredBuyers, destBuyerId);
    const originChips = renderOriginChips(filteredBuyers, originBuyerIds);

    const destLabel = destBuyerId ? (filteredBuyers.find((b) => b.id === destBuyerId)?.displayName || '') : '';
    const originBuyers = filteredBuyers.filter((b) => originBuyerIds.includes(b.id));

    if (step === 'confirm' && summary) {
        return renderConfirmStep({ summary, destLabel, originBuyers, merging, error });
    }

    return `
        <div class="cartera-viva-merge__dialog" role="dialog" aria-labelledby="merge-title" aria-modal="true">
            <div class="cartera-viva-merge__header">
                <h3 id="merge-title" class="cartera-viva-merge__title">Unificar clientes</h3>
                <button type="button" class="cartera-viva-merge__close" data-merge-close aria-label="Cerrar">&times;</button>
            </div>
            <p class="cartera-viva-merge__description">Une clientes duplicados sin borrar historial. Los movimientos quedaran bajo el cliente destino.</p>
            ${error ? `<p class="cartera-viva-merge__error">${escapeHtml(error)}</p>` : ''}
            <div class="cartera-viva-merge__section">
                <label class="cartera-viva-merge__label">Cliente destino</label>
                ${destCombobox}
            </div>
            <div class="cartera-viva-merge__section">
                <label class="cartera-viva-merge__label">Clientes duplicados</label>
                <p class="cartera-viva-merge__hint">Selecciona los clientes que son el mismo que el destino.</p>
                ${filteredBuyers.length > 0 ? `<div class="cartera-viva-merge__origin-chips" data-merge-origin-chips>${originChips}</div>` : '<p class="cartera-viva-merge__hint">No hay clientes disponibles.</p>'}
            </div>
            <div class="cartera-viva-merge__actions">
                <button type="button" class="cartera-viva-merge__btn cartera-viva-merge__btn--secondary" data-merge-cancel>Cancelar</button>
                <button type="button" class="cartera-viva-merge__btn cartera-viva-merge__btn--primary" data-merge-next ${(!destBuyerId || originBuyerIds.length === 0) ? 'disabled' : ''}>Revisar</button>
            </div>
        </div>
    `;
}

function renderConfirmStep({ summary, destLabel, originBuyers, merging, error }) {
    const originItemsHtml = originBuyers.map((b) => `<li>${escapeHtml(b.displayName)}</li>`).join('');
    return `
        <div class="cartera-viva-merge__dialog" role="dialog" aria-labelledby="merge-title" aria-modal="true">
            <div class="cartera-viva-merge__header">
                <h3 id="merge-title" class="cartera-viva-merge__title">Confirmar unificacion</h3>
                <button type="button" class="cartera-viva-merge__close" data-merge-close aria-label="Cerrar">&times;</button>
            </div>
            <div class="cartera-viva-merge__summary">
                <div class="cartera-viva-merge__summary-row">
                    <span class="cartera-viva-merge__summary-label">Cliente destino:</span>
                    <span class="cartera-viva-merge__summary-value">${escapeHtml(destLabel)}</span>
                </div>
                <div class="cartera-viva-merge__summary-row">
                    <span class="cartera-viva-merge__summary-label">Clientes a unificar:</span>
                    <ul class="cartera-viva-merge__summary-list">${originItemsHtml}</ul>
                </div>
                <div class="cartera-viva-merge__summary-row">
                    <span class="cartera-viva-merge__summary-label">Movimientos aproximados:</span>
                    <span class="cartera-viva-merge__summary-value">${summary?.totalRecords ?? 0}</span>
                </div>
            </div>
            <p class="cartera-viva-merge__warning">No se borrara historial. Solo se movera bajo el cliente destino.</p>
            ${error ? `<p class="cartera-viva-merge__error">${escapeHtml(error)}</p>` : ''}
            <div class="cartera-viva-merge__actions">
                <button type="button" class="cartera-viva-merge__btn cartera-viva-merge__btn--secondary" data-merge-back ${merging ? 'disabled' : ''}>Volver</button>
                <button type="button" class="cartera-viva-merge__btn cartera-viva-merge__btn--primary" data-merge-confirm ${merging ? 'disabled' : ''}>${merging ? 'Unificando...' : 'Unificar clientes'}</button>
            </div>
        </div>
    `;
}

async function countRecords(supabase, userId, originBuyerIds) {
    if (!originBuyerIds.length) return 0;
    let total = 0;
    for (const table of MERGE_TABLES) {
        for (const buyerId of originBuyerIds) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('buyer_id', buyerId)
                .is('deleted_at', null);
            if (!error && count) total += count;
        }
    }
    return total;
}

async function executeMerge(supabase, userId, destBuyerId, destGroupKey, originBuyerIds) {
    const errors = [];
    for (const table of MERGE_TABLES) {
        for (const originId of originBuyerIds) {
            const { error } = await supabase
                .from(table)
                .update({ buyer_id: destBuyerId, buyer_group_key: destGroupKey })
                .eq('user_id', userId)
                .eq('buyer_id', originId)
                .is('deleted_at', null);
            if (error) {
                errors.push({ table, originId, message: error.message });
            }
        }
    }
    for (const originId of originBuyerIds) {
        const { error } = await supabase
            .from('agro_buyers')
            .update({ status: 'archived' })
            .eq('id', originId)
            .eq('user_id', userId);
        if (error) {
            errors.push({ table: 'agro_buyers', originId, message: error.message });
        }
    }
    if (errors.length) {
        console.warn('[AGRO][CLIENT_MERGE] partial errors:', errors);
    }
    return errors;
}

let mergeState = {
    buyers: [],
    destBuyerId: '',
    originBuyerIds: [],
    step: 'select',
    summary: null,
    merging: false,
    error: ''
};

function resetMergeState() {
    mergeState = {
        buyers: [],
        destBuyerId: '',
        originBuyerIds: [],
        step: 'select',
        summary: null,
        merging: false,
        error: ''
    };
}

function renderCurrentState() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.innerHTML = renderModalContent(mergeState);
}

let _modalClickHandler = null;
let _modalKeydownHandler = null;

function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.hidden = true;
    modal.innerHTML = '';
    resetMergeState();
    document.removeEventListener('keydown', handleEscKey);
    if (_modalClickHandler) {
        modal.removeEventListener('click', _modalClickHandler);
        _modalClickHandler = null;
    }
    if (_modalKeydownHandler) {
        modal.removeEventListener('keydown', _modalKeydownHandler);
        _modalKeydownHandler = null;
    }
}

function handleEscKey(event) {
    if (!document.getElementById(MODAL_ID)?.hidden === false) return;
    if (event.key === 'Escape') closeModal();
}

function handleModalClick(modal, supabase, userId, event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-merge-close]') || target.classList.contains('cartera-viva-merge-overlay')) {
        closeModal();
        return;
    }

    if (target.closest('[data-merge-cancel]')) {
        closeModal();
        return;
    }

    if (target.closest('[data-merge-back]')) {
        mergeState.step = 'select';
        mergeState.error = '';
        renderCurrentState();
        return;
    }

    const destTrigger = target.closest('[data-merge-dest-trigger]');
    if (destTrigger) {
        const combobox = destTrigger.closest('[data-merge-dest-combobox]');
        const list = combobox?.querySelector('[data-merge-dest-list]');
        if (list) {
            modal.querySelectorAll('[data-merge-dest-list]').forEach((l) => {
                if (l !== list) l.hidden = true;
            });
            list.hidden = !list.hidden;
        }
        return;
    }

    const destOption = target.closest('[data-merge-dest-option]');
    if (destOption) {
        const combobox = destOption.closest('[data-merge-dest-combobox]');
        if (!combobox) return;
        combobox.querySelectorAll('[data-merge-dest-option]').forEach((opt) => {
            opt.classList.toggle('is-selected', opt === destOption);
        });
        const value = destOption.dataset.value || '';
        const displayName = destOption.dataset.displayName || '';
        const groupKey = destOption.dataset.groupKey || '';
        combobox.dataset.mergeSelectedId = value;
        combobox.dataset.mergeSelectedDisplayName = displayName;
        combobox.dataset.mergeSelectedGroupKey = groupKey;
        const trig = combobox.querySelector('[data-merge-dest-trigger]');
        if (trig) trig.textContent = displayName;
        const lst = combobox.querySelector('[data-merge-dest-list]');
        if (lst) lst.hidden = true;
        mergeState.destBuyerId = value;
        mergeState.error = '';
        mergeState.originBuyerIds = mergeState.originBuyerIds.filter((id) => id !== value);
        renderCurrentState();
        return;
    }

    const originChip = target.closest('[data-merge-origin-chip]');
    if (originChip) {
        const chipId = originChip.dataset.mergeOriginId;
        if (!chipId) return;
        if (chipId === mergeState.destBuyerId) return;
        const idx = mergeState.originBuyerIds.indexOf(chipId);
        if (idx >= 0) {
            mergeState.originBuyerIds.splice(idx, 1);
        } else {
            mergeState.originBuyerIds.push(chipId);
        }
        mergeState.error = '';
        renderCurrentState();
        return;
    }

    if (target.closest('[data-merge-next]')) {
        if (!mergeState.destBuyerId || mergeState.originBuyerIds.length === 0) {
            mergeState.error = 'Selecciona un cliente destino y al menos un duplicado.';
            renderCurrentState();
            return;
        }
        void proceedToConfirm(modal, supabase, userId);
        return;
    }

    if (target.closest('[data-merge-confirm]')) {
        void proceedWithMerge(modal, supabase, userId);
        return;
    }

    const openList = modal.querySelector('[data-merge-dest-list]:not([hidden])');
    if (openList && !openList.contains(target)) {
        openList.hidden = true;
    }
}

function bindModalEvents(modal, supabase, userId) {
    if (_modalClickHandler) modal.removeEventListener('click', _modalClickHandler);
    _modalClickHandler = (event) => handleModalClick(modal, supabase, userId, event);
    modal.addEventListener('click', _modalClickHandler);

    modal.removeEventListener('keydown', handleEscKey);
    modal.addEventListener('keydown', handleEscKey);
    _modalKeydownHandler = handleEscKey;
}

async function proceedToConfirm(modal, supabase, userId) {
    const destBuyer = mergeState.buyers.find((b) => b.id === mergeState.destBuyerId);
    if (!destBuyer) {
        mergeState.error = 'Cliente destino no encontrado.';
        renderCurrentState();
        return;
    }

    try {
        const totalRecords = await countRecords(supabase, userId, mergeState.originBuyerIds);
        mergeState.summary = { totalRecords };
        mergeState.step = 'confirm';
        mergeState.error = '';
        renderCurrentState();
    } catch (err) {
        mergeState.error = 'Error al contar movimientos: ' + (err?.message || err);
        renderCurrentState();
    }
}

async function proceedWithMerge(modal, supabase, userId) {
    const destBuyer = mergeState.buyers.find((b) => b.id === mergeState.destBuyerId);
    if (!destBuyer) {
        mergeState.error = 'Cliente destino no encontrado.';
        renderCurrentState();
        return;
    }

    const destGroupKey = destBuyer.group_key || destBuyer.canonical_name || normalizeBuyerGroupKey(destBuyer.display_name);

    mergeState.merging = true;
    renderCurrentState();

    try {
        const errors = await executeMerge(supabase, userId, mergeState.destBuyerId, destGroupKey, mergeState.originBuyerIds);
        if (errors.length) {
            mergeState.merging = false;
            mergeState.error = `Algunos movimientos no se pudieron actualizar. Intenta de nuevo.`;
            renderCurrentState();
            return;
        }

        document.dispatchEvent(new CustomEvent('agro:client:changed', {
            detail: {
                clientId: mergeState.destBuyerId,
                groupKey: destGroupKey,
                openDetail: true
            }
        }));

        closeModal();
    } catch (err) {
        mergeState.merging = false;
        mergeState.error = 'Error al unificar: ' + (err?.message || err);
        renderCurrentState();
    }
}

export async function openCarteraVivaClientMergeModal({ supabase, userId } = {}) {
    if (!supabase || !userId) {
        console.warn('[AGRO][CLIENT_MERGE] supabase and userId required');
        return;
    }

    resetMergeState();
    const modal = getOrCreateModal();
    modal.innerHTML = '<div class="cartera-viva-merge__dialog"><p class="cartera-viva-merge__hint">Cargando clientes...</p></div>';
    modal.hidden = false;

    document.addEventListener('keydown', handleEscKey);

    try {
        const rawBuyers = await loadBuyers(supabase, userId);
        mergeState.buyers = rawBuyers.map((b) => ({
            id: String(b.id || '').trim(),
            display_name: String(b.display_name || '').trim() || 'Cliente sin nombre',
            group_key: normalizeBuyerGroupKey(b.group_key || b.canonical_name || b.display_name),
            canonical_name: normalizeBuyerGroupKey(b.canonical_name || b.group_key || b.display_name)
        }));
        mergeState.step = 'select';
        renderCurrentState();
    } catch (err) {
        mergeState.error = 'No se pudieron cargar los clientes.';
        renderCurrentState();
    }

    bindModalEvents(modal, supabase, userId);
}

export function initCarteraVivaClientMerge() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
        modal.hidden = true;
        modal.innerHTML = '';
    }
}