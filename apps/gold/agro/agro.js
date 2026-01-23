/**
 * YavlGold V9.4 - Módulo Agro - Supabase Integration
 * Conecta la UI con las tablas agro_crops y agro_roi_calculations
 */
import supabase from '../assets/js/config/supabase-config.js';
import { updateStats } from './agro-stats.js';
import './agro.css';

// ============================================================
// ESTADO DEL MÓDULO
// ============================================================
let currentEditId = null; // ID del cultivo en edición (null = nuevo)
let cropsCache = [];      // Cache local de cultivos para edición

// ============================================================
// V9.5: CROP DROPDOWN POPULATION + HISTORY REFRESH
// ============================================================

/**
 * Populates all crop selector dropdowns with active crops
 * IDs: expense-crop-id, income-crop-id, pending-crop-id, loss-crop-id, transfer-crop-id
 */
async function populateCropDropdowns() {
    try {
        const { data: crops, error } = await supabase
            .from('agro_crops')
            .select('id, name, variety')
            .is('deleted_at', null)
            .order('name');

        if (error) {
            console.warn('[AGRO] Error fetching crops for dropdowns:', error.message);
            return;
        }

        const selectIds = [
            'expense-crop-id',
            'income-crop-id',
            'pending-crop-id',
            'loss-crop-id',
            'transfer-crop-id',
            'edit-crop-id'
        ];

        selectIds.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;

            // Preserve current selection
            const currentValue = select.value;

            // Clear existing options except first (General)
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add crop options
            (crops || []).forEach(crop => {
                const option = document.createElement('option');
                option.value = crop.id;
                option.textContent = crop.variety
                    ? `${crop.name} (${crop.variety})`
                    : crop.name;
                select.appendChild(option);
            });

            // Restore selection if still valid
            if (currentValue && [...select.options].some(o => o.value === currentValue)) {
                select.value = currentValue;
            }
        });

        console.log('[AGRO] V9.5: Crop dropdowns populated with', crops?.length || 0, 'crops');
    } catch (err) {
        console.warn('[AGRO] Error populating crop dropdowns:', err.message);
    }
}

// ============================================================
// V9.5.1: FACTURERO CRUD - CONFIG & HELPERS
// ============================================================

const FACTURERO_CONFIG = {
    'gastos': {
        table: 'agro_expenses',
        containerId: 'recent-transactions-container',
        listId: 'expenses-list',
        conceptField: 'concept',
        amountField: 'amount',
        dateField: 'date',
        extraFields: ['category'],
        supportsDeletedAt: true
    },
    'ingresos': {
        table: 'agro_income',
        containerId: 'income-recent-container',
        listId: 'income-list',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        extraFields: ['categoria'],
        supportsDeletedAt: true
    },
    'pendientes': {
        table: 'agro_pending',
        containerId: 'tab-panel-pendientes',
        listId: 'pending-history-list',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        extraFields: ['cliente'],
        supportsDeletedAt: true
    },
    'perdidas': {
        table: 'agro_losses',
        containerId: 'tab-panel-perdidas',
        listId: 'loss-history-list',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        extraFields: ['causa'],
        supportsDeletedAt: true
    },
    'transferencias': {
        table: 'agro_transfers',
        containerId: 'tab-panel-transferencias',
        listId: 'transfer-history-list',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        extraFields: ['destino'],
        supportsDeletedAt: true
    }
};

const FACTURERO_EVIDENCE_FIELDS = {
    gastos: ['evidence_url'],
    ingresos: ['soporte_url', 'evidence_url'],
    pendientes: ['evidence_url', 'soporte_url'],
    perdidas: ['evidence_url', 'soporte_url'],
    transferencias: ['evidence_url', 'soporte_url']
};

const EVIDENCE_LINK_STYLE = 'color: var(--gold-primary); text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;';
const EVIDENCE_LINK_LABEL = 'Ver recibo';
const evidenceSignedUrlCache = new Map();

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}

function getFactureroEvidenceValue(tabName, item) {
    const fields = FACTURERO_EVIDENCE_FIELDS[tabName] || ['evidence_url'];
    for (const field of fields) {
        if (item && item[field]) return item[field];
    }
    return null;
}

function isHttpUrl(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
}

async function resolveEvidenceUrl(rawValue) {
    if (!rawValue) return null;
    if (isHttpUrl(rawValue)) return rawValue;

    if (evidenceSignedUrlCache.has(rawValue)) {
        return evidenceSignedUrlCache.get(rawValue);
    }

    const signedUrl = await getSignedEvidenceUrl(rawValue, { quiet: true });
    if (signedUrl) {
        evidenceSignedUrlCache.set(rawValue, signedUrl);
        return signedUrl;
    }

    const legacyPath = getLegacyAgroEvidencePath(rawValue);
    if (legacyPath && legacyPath !== rawValue) {
        if (evidenceSignedUrlCache.has(legacyPath)) {
            const cachedUrl = evidenceSignedUrlCache.get(legacyPath);
            evidenceSignedUrlCache.set(rawValue, cachedUrl);
            return cachedUrl;
        }
        const legacySignedUrl = await getSignedEvidenceUrl(legacyPath, { quiet: true });
        if (legacySignedUrl) {
            evidenceSignedUrlCache.set(legacyPath, legacySignedUrl);
            evidenceSignedUrlCache.set(rawValue, legacySignedUrl);
            return legacySignedUrl;
        }
    }

    return null;
}

function buildEvidenceLinkHtml(url) {
    if (!url) return '';
    const safeUrl = escapeHtml(url);
    const label = EVIDENCE_LINK_LABEL;
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="${EVIDENCE_LINK_STYLE}" title="${label}"><i class="fa-solid fa-cloud"></i> ${label}</a>`;
}

function createEvidenceLinkElement(url) {
    if (!url) return null;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.cssText = EVIDENCE_LINK_STYLE;
    link.title = EVIDENCE_LINK_LABEL;

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-cloud';

    const text = document.createElement('span');
    text.textContent = EVIDENCE_LINK_LABEL;

    link.append(icon, text);
    return link;
}

function renderHistoryRow(tabName, item, config) {
    const concept = item[config.conceptField] || 'Sin concepto';
    const amount = Number(item[config.amountField] || 0);
    const date = item[config.dateField];
    const cropName = item.crop_name || '';
    const evidenceUrl = item.evidence_url_resolved || '';
    const evidenceHtml = evidenceUrl ? `<span>${buildEvidenceLinkHtml(evidenceUrl)}</span>` : '';

    return `
        <div class="facturero-item" data-id="${item.id}" data-tab="${tabName}" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
            <div style="flex: 1; min-width: 0;">
                <div style="color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(concept)}</div>
                <div style="color: var(--text-muted); font-size: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <span>${formatDate(date)}</span>
                    ${cropName ? `<span style="color: var(--gold-primary);">• ${escapeHtml(cropName)}</span>` : ''}
                    ${evidenceHtml}
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
                <span style="color: ${tabName === 'perdidas' ? '#ef4444' : '#4ade80'}; font-weight: 700; font-size: 0.9rem;">$${amount.toFixed(2)}</span>
                <button type="button" class="btn-edit-facturero" data-tab="${tabName}" data-id="${item.id}" title="Editar" style="background: transparent; border: 1px solid rgba(96,165,250,0.3); color: #60a5fa; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem;">
                    <i class="fa fa-pen"></i>
                </button>
                <button type="button" class="btn-duplicate-facturero" data-tab="${tabName}" data-id="${item.id}" title="Duplicar a otro cultivo" style="background: transparent; border: 1px solid rgba(200,167,82,0.35); color: #C8A752; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem;">
                    <i class="fa fa-copy"></i>
                </button>
                <button type="button" class="btn-delete-facturero" data-tab="${tabName}" data-id="${item.id}" title="Eliminar" style="background: transparent; border: 1px solid rgba(239,68,68,0.3); color: #ef4444; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem;">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

async function enrichFactureroItems(tabName, items) {
    const rows = Array.isArray(items) ? items : [];
    const mapped = rows.map(item => ({
        ...item,
        crop_name: item.agro_crops?.name || ''
    }));

    const enriched = await Promise.all(mapped.map(async (item) => {
        const evidenceValue = getFactureroEvidenceValue(tabName, item);
        const resolvedUrl = await resolveEvidenceUrl(evidenceValue);
        return {
            ...item,
            evidence_url_resolved: resolvedUrl
        };
    }));

    return enriched;
}

/**
 * V9.5.1: Refreshes facturero history for a specific tab with CRUD buttons
 * @param {string} tabName - 'gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias'
 * @param {object} options - { showActions: true }
 */
async function refreshFactureroHistory(tabName, options = {}) {
    const config = FACTURERO_CONFIG[tabName];
    if (!config) {
        console.log('[AGRO] V9.5.1: No config for tab:', tabName);
        return;
    }

    const { showActions = true } = options;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Build query
        let query = supabase
            .from(config.table)
            .select('*, agro_crops(name)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        // Filter deleted_at if supported
        if (config.supportsDeletedAt) {
            query = query.is('deleted_at', null);
        }

        const { data: items, error } = await query;

        if (error) {
            // If deleted_at column doesn't exist, retry without filter
            if (error.message && error.message.toLowerCase().includes('deleted_at')) {
                config.supportsDeletedAt = false;
                console.warn(`[AGRO] V9.5.1: ${tabName} table lacks deleted_at, using hard delete`);
                const fallback = await supabase
                    .from(config.table)
                    .select('*, agro_crops(name)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20);
                if (fallback.error) {
                    console.error(`[AGRO] V9.5.1: Error fetching ${tabName}:`, fallback.error.message);
                    return;
                }
                const enrichedFallback = await enrichFactureroItems(tabName, fallback.data || []);
                renderHistoryList(tabName, config, enrichedFallback, showActions);
                return;
            }
            console.error(`[AGRO] V9.5.1: Error fetching ${tabName}:`, error.message);
            return;
        }

        const enrichedItems = await enrichFactureroItems(tabName, items || []);
        renderHistoryList(tabName, config, enrichedItems, showActions);

    } catch (err) {
        console.error(`[AGRO] V9.5.1: Exception in refreshFactureroHistory(${tabName}):`, err.message);
    }
}

function renderHistoryList(tabName, config, items, showActions) {
    // Find or create list container
    let container = document.getElementById(config.listId);

    if (!container) {
        // Try to find parent container
        const parent = document.getElementById(config.containerId);
        if (parent) {
            container = document.createElement('div');
            container.id = config.listId;
            container.className = 'facturero-history-list';
            container.style.cssText = 'margin-top: 1rem; max-height: 350px; overflow-y: auto;';
            parent.appendChild(container);
        }
    }

    if (!container) {
        console.warn(`[AGRO] V9.5.1: Container not found for ${tabName}`);
        return;
    }

    // Map crop names for display
    const itemsWithCropNames = items.map(item => ({
        ...item,
        crop_name: item.agro_crops?.name || ''
    }));

    if (itemsWithCropNames.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">Sin registros recientes.</p>`;
    } else {
        container.innerHTML = itemsWithCropNames.map(item =>
            renderHistoryRow(tabName, item, config)
        ).join('');
    }

    console.info(`[AGRO] V9.5.1: Refreshed ${tabName} with ${itemsWithCropNames.length} items`);
}

async function refreshFactureroAfterChange(tabName) {
    if (tabName === 'ingresos') {
        document.dispatchEvent(new CustomEvent('agro:income:changed'));
        return;
    }
    if (tabName === 'gastos') {
        return;
    }
    await refreshFactureroHistory(tabName);
}

// ============================================================
// V9.5.1: FACTURERO CRUD HANDLERS
// ============================================================

async function deleteFactureroItem(tabName, itemId) {
    const config = FACTURERO_CONFIG[tabName];
    if (!config) return;

    if (!confirm('¿Eliminar este registro?')) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Sesión expirada. Recarga la página.');
            return;
        }

        let success = false;

        if (config.supportsDeletedAt) {
            // Soft delete
            const { error } = await supabase
                .from(config.table)
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', itemId)
                .eq('user_id', user.id);

            if (error) {
                if (error.message.toLowerCase().includes('deleted_at')) {
                    config.supportsDeletedAt = false;
                } else {
                    throw error;
                }
            } else {
                success = true;
            }
        }

        if (!success && !config.supportsDeletedAt) {
            // Hard delete fallback
            const { error } = await supabase
                .from(config.table)
                .delete()
                .eq('id', itemId)
                .eq('user_id', user.id);

            if (error) throw error;
            success = true;
        }

        if (success) {
            console.info(`[AGRO] V9.5.1: Deleted ${tabName} item ${itemId}`);
            await refreshFactureroAfterChange(tabName);
            document.dispatchEvent(new CustomEvent('data-refresh'));
        }

    } catch (err) {
        console.error(`[AGRO] V9.5.1: Delete error:`, err.message);
        alert(`Error al eliminar: ${err.message}`);
    }
}

async function editFactureroItem(tabName, itemId) {
    const config = FACTURERO_CONFIG[tabName];
    if (!config) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch item
        const { data: item, error } = await supabase
            .from(config.table)
            .select('*')
            .eq('id', itemId)
            .eq('user_id', user.id)
            .single();

        if (error || !item) {
            alert('No se encontró el registro.');
            return;
        }

        // Open edit modal
        openFactureroEditModal(tabName, item, config);

    } catch (err) {
        console.error(`[AGRO] V9.5.1: Edit fetch error:`, err.message);
        alert(`Error: ${err.message}`);
    }
}

function openFactureroEditModal(tabName, item, config) {
    const modal = document.getElementById('modal-edit-facturero');
    if (!modal) {
        console.warn('[AGRO] V9.5.1: Edit modal not found');
        alert('Modal de edición no disponible.');
        return;
    }

    // Populate fields
    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('edit-tab-name').value = tabName;
    document.getElementById('edit-concepto').value = item[config.conceptField] || '';
    document.getElementById('edit-monto').value = item[config.amountField] || '';
    document.getElementById('edit-fecha').value = item[config.dateField] || '';

    // Populate crop selector
    const cropSelect = document.getElementById('edit-crop-id');
    if (cropSelect && typeof populateCropDropdowns === 'function') {
        populateCropDropdowns().then(() => {
            cropSelect.value = item.crop_id || '';
        });
    }

    // Handle extra fields
    const extraContainer = document.getElementById('edit-extra-fields');
    if (extraContainer) {
        extraContainer.innerHTML = '';
        config.extraFields.forEach(field => {
            const value = item[field] || '';
            const label = field.charAt(0).toUpperCase() + field.slice(1);
            extraContainer.innerHTML += `
                <div class="input-group" style="margin-top: 1rem;">
                    <label class="input-label">${label}</label>
                    <input type="text" id="edit-${field}" class="styled-input" value="${escapeHtml(value)}">
                </div>
            `;
        });
    }

    // Update title
    const titles = {
        'gastos': 'Editar Gasto',
        'ingresos': 'Editar Ingreso',
        'pendientes': 'Editar Pendiente',
        'perdidas': 'Editar Pérdida',
        'transferencias': 'Editar Transferencia'
    };
    const titleEl = document.getElementById('edit-modal-title');
    if (titleEl) titleEl.textContent = titles[tabName] || 'Editar Registro';

    modal.style.display = 'flex';
}

async function saveEditModal() {
    const itemId = document.getElementById('edit-item-id')?.value;
    const tabName = document.getElementById('edit-tab-name')?.value;
    const config = FACTURERO_CONFIG[tabName];

    if (!itemId || !config) {
        alert('Error: datos incompletos.');
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Sesión expirada.');
            return;
        }

        const updateData = {
            [config.conceptField]: document.getElementById('edit-concepto')?.value?.trim(),
            [config.amountField]: parseFloat(document.getElementById('edit-monto')?.value) || 0,
            [config.dateField]: document.getElementById('edit-fecha')?.value,
            crop_id: document.getElementById('edit-crop-id')?.value || null
        };

        // Add extra fields
        config.extraFields.forEach(field => {
            const el = document.getElementById(`edit-${field}`);
            if (el) updateData[field] = el.value?.trim() || null;
        });

        const { error } = await supabase
            .from(config.table)
            .update(updateData)
            .eq('id', itemId)
            .eq('user_id', user.id);

        if (error) throw error;

        console.info(`[AGRO] V9.5.1: Updated ${tabName} item ${itemId}`);
        closeEditModal();
        await refreshFactureroAfterChange(tabName);
        document.dispatchEvent(new CustomEvent('data-refresh'));

    } catch (err) {
        console.error(`[AGRO] V9.5.1: Save error:`, err.message);
        alert(`Error al guardar: ${err.message}`);
    }
}

function closeEditModal() {
    const modal = document.getElementById('modal-edit-facturero');
    if (modal) modal.style.display = 'none';
}

async function duplicateFactureroItem(tabName, itemId) {
    const config = FACTURERO_CONFIG[tabName];
    if (!config) return;

    const cropHint = Array.isArray(cropsCache) && cropsCache.length
        ? `\nCultivos disponibles:\n${cropsCache.map(crop => `${crop.id}: ${crop.name}`).join('\n')}`
        : '';
    const newCropId = prompt(`ID del cultivo destino (dejar vacio para general):${cropHint}`);
    if (newCropId === null) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch original
        const { data: original, error: fetchError } = await supabase
            .from(config.table)
            .select('*')
            .eq('id', itemId)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !original) {
            alert('No se encontró el registro original.');
            return;
        }

        // Create copy without id and timestamps
        const copy = { ...original };
        delete copy.id;
        delete copy.created_at;
        delete copy.updated_at;
        delete copy.deleted_at;
        copy.crop_id = newCropId?.trim() || null;

        const originalAmount = original[config.amountField];
        const amountInput = prompt('Monto para la copia (opcional). Deja vacio para mantener.', originalAmount ?? '');
        if (amountInput !== null && String(amountInput).trim() !== '') {
            const parsedAmount = Number(String(amountInput).replace(',', '.'));
            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                alert('Monto invalido. Operacion cancelada.');
                return;
            }
            copy[config.amountField] = parsedAmount;
        }

        const { error: insertError } = await supabase
            .from(config.table)
            .insert(copy);

        if (insertError) throw insertError;

        console.info(`[AGRO] V9.5.1: Duplicated ${tabName} item ${itemId}`);
        await refreshFactureroAfterChange(tabName);
        document.dispatchEvent(new CustomEvent('data-refresh'));
        alert('✅ Registro duplicado');

    } catch (err) {
        console.error(`[AGRO] V9.5.1: Duplicate error:`, err.message);
        alert(`Error al duplicar: ${err.message}`);
    }
}

function setupCropActionListeners() {
    if (document.__agroCropActionsBound) return;
    document.__agroCropActionsBound = true;

    document.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-delete-crop');
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const cropId = deleteBtn.dataset.id || deleteBtn.closest('.crop-card')?.dataset.cropId;
            console.info('[AGRO] Crop delete click', { cropId });
            if (cropId) {
                window.deleteCrop?.(cropId);
            } else {
                console.warn('[AGRO] Crop delete missing id');
            }
            return;
        }

        const editBtn = e.target.closest('.btn-edit-crop');
        if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            const cropId = editBtn.dataset.id || editBtn.closest('.crop-card')?.dataset.cropId;
            console.info('[AGRO] Crop edit click', { cropId });
            if (cropId) {
                window.openEditModal?.(cropId);
            } else {
                console.warn('[AGRO] Crop edit missing id');
            }
        }
    });

    console.info('[AGRO] Crop action listeners initialized');
}

// V9.5.1: Event delegation for dynamic CRUD buttons
function setupFactureroCrudListeners() {
    if (document.__agroFactureroCrudBound) return;
    document.__agroFactureroCrudBound = true;

    document.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit-facturero');
        if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            const tabName = editBtn.dataset.tab;
            const itemId = editBtn.dataset.id;
            console.info('[AGRO] Facturero edit click', { tabName, itemId });
            if (tabName && itemId) {
                await editFactureroItem(tabName, itemId);
            } else {
                console.warn('[AGRO] Facturero edit missing data', { tabName, itemId });
            }
            return;
        }

        const deleteBtn = e.target.closest('.btn-delete-facturero');
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const tabName = deleteBtn.dataset.tab;
            const itemId = deleteBtn.dataset.id;
            console.info('[AGRO] Facturero delete click', { tabName, itemId });
            if (tabName && itemId) {
                await deleteFactureroItem(tabName, itemId);
            } else {
                console.warn('[AGRO] Facturero delete missing data', { tabName, itemId });
            }
            return;
        }

        const duplicateBtn = e.target.closest('.btn-duplicate-facturero');
        if (duplicateBtn) {
            e.preventDefault();
            e.stopPropagation();
            const tabName = duplicateBtn.dataset.tab;
            const itemId = duplicateBtn.dataset.id;
            console.info('[AGRO] Facturero duplicate click', { tabName, itemId });
            if (tabName && itemId) {
                await duplicateFactureroItem(tabName, itemId);
            } else {
                console.warn('[AGRO] Facturero duplicate missing data', { tabName, itemId });
            }
        }
    });

    console.info('[AGRO] V9.5.1: CRUD event listeners initialized');
}

// V9.5.1: Refresh all facturero histories on init
async function initFactureroHistories() {
    const tabs = ['pendientes', 'perdidas', 'transferencias'];
    for (const tab of tabs) {
        await refreshFactureroHistory(tab);
    }
    console.info('[AGRO] V9.5.1: All facturero histories initialized');
}

// Expose globally
window.populateCropDropdowns = populateCropDropdowns;
window.refreshFactureroHistory = refreshFactureroHistory;
window.closeEditModal = closeEditModal;
window.saveEditModal = saveEditModal;

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Renderiza el estado del cultivo como badge
 */
function createStatusBadge(status) {
    const statusMap = {
        'growing': { class: 'status-growing', text: 'Creciendo' },
        'ready': { class: 'status-ready', text: 'Lista!' },
        'attention': { class: 'status-attention', text: 'Atencion' },
        'harvested': { class: 'status-harvested', text: 'Cosechado' }
    };
    const s = statusMap[status] || statusMap['growing'];
    const badge = document.createElement('span');
    badge.className = `crop-status ${s.class}`;
    badge.textContent = s.text;
    return badge;
}

/**
 * Formatea fecha a texto legible
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Formatea moneda USD
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value || 0);
}

// ============================================================
// CARGAR CULTIVOS DESDE SUPABASE
// ============================================================

/**
 * Genera tarjeta de cultivo segura
 */
function createMetaItem(labelText, valueText, valueClass = '') {
    const item = document.createElement('div');
    item.className = 'crop-meta-item';

    const label = document.createElement('span');
    label.className = 'meta-label';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = valueClass ? `meta-value ${valueClass}` : 'meta-value';
    value.textContent = valueText;

    item.append(label, value);
    return item;
}

function normalizeProgress(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
}

function createCropCardElement(crop, index) {
    const delay = 4 + index; // Para animaciones escalonadas
    const card = document.createElement('div');
    card.className = `card crop-card animate-in delay-${delay}`;
    if (crop?.id !== undefined && crop?.id !== null) {
        card.dataset.cropId = String(crop.id);
    }

    const actions = document.createElement('div');
    actions.className = 'crop-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit-crop';
    editBtn.type = 'button';
    editBtn.title = 'Editar Cultivo';
    editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete-crop';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Eliminar Cultivo';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';

    if (crop?.id !== undefined && crop?.id !== null) {
        const cropId = String(crop.id);
        editBtn.dataset.id = cropId;
        deleteBtn.dataset.id = cropId;
    }

    actions.append(editBtn, deleteBtn);

    const header = document.createElement('div');
    header.className = 'crop-card-header';

    const cropInfo = document.createElement('div');
    cropInfo.className = 'crop-info';

    const cropIcon = document.createElement('div');
    cropIcon.className = 'crop-icon';
    cropIcon.textContent = crop.icon || 'Seed';

    const details = document.createElement('div');
    details.className = 'crop-details-header';

    const name = document.createElement('span');
    name.className = 'crop-name';
    name.textContent = crop.name || '';

    const variety = document.createElement('span');
    variety.className = 'crop-variety';
    variety.textContent = crop.variety || 'Sin variedad';

    details.append(name, variety);
    cropInfo.append(cropIcon, details);

    header.append(cropInfo, createStatusBadge(crop.status));

    const progressSection = document.createElement('div');
    progressSection.className = 'progress-section';

    const progressHeader = document.createElement('div');
    progressHeader.className = 'progress-header';

    const progressLabel = document.createElement('span');
    progressLabel.className = 'progress-label';
    progressLabel.textContent = 'Ciclo de Cosecha';

    const progressValue = document.createElement('span');
    progressValue.className = 'progress-value';
    const progress = normalizeProgress(crop.progress);
    progressValue.textContent = `${progress}%`;

    progressHeader.append(progressLabel, progressValue);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'progress-track';

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = `${progress}%`;

    progressTrack.appendChild(progressFill);
    progressSection.append(progressHeader, progressTrack);

    const metaGrid = document.createElement('div');
    metaGrid.className = 'crop-meta-grid';
    metaGrid.append(
        createMetaItem('Siembra', formatDate(crop.start_date)),
        createMetaItem('Cosecha Est.', formatDate(crop.expected_harvest_date)),
        createMetaItem('Area', `${crop.area_size} Ha`),
        createMetaItem('Inversion', formatCurrency(crop.investment), 'gold')
    );

    card.append(actions, header, progressSection, metaGrid);
    return card;
}

/**
 * Carga cultivos del usuario (Supabase + LocalStorage fallback)
 */
export async function loadCrops() {
    const cropsGrid = document.querySelector('.crops-grid');
    if (!cropsGrid) return;

    // Mostrar loading
    cropsGrid.innerHTML = `
        <div class="card animate-in" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
            <div class="kpi-icon-wrapper" style="margin: 0 auto 1rem;">🔄</div>
            <p style="color: var(--text-muted);">Cargando cultivos...</p>
        </div>
    `;

    let crops = [];
    let error = null;

    try {
        // 1. Intentar cargar desde Supabase
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
            const { data, error: sbError } = await supabase
                .from('agro_crops')
                .select('*')
                .order('created_at', { ascending: false });

            if (sbError) throw sbError;
            crops = data || [];
        } else {
            // 2. Fallback: LocalStorage
            console.log('[Agro] Usuario no autenticado, usando LocalStorage');
            crops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
        }

    } catch (err) {
        console.warn('[Agro] Error Supabase, intentando LocalStorage:', err);
        // Fallback en caso de error de conexión
        crops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
        error = err;
    }

    // Actualizar Estadísticas siempre (aunque esté vacío)
    updateStats(crops);

    if (crops.length === 0) {
        cropsCache = [];
        cropsGrid.innerHTML = `
            <div class="card animate-in" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <div class="kpi-icon-wrapper" style="margin: 0 auto 1rem;">🌱</div>
                <p style="color: var(--gold-primary); font-weight: 600;">No tienes cultivos activos aún</p>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem;">
                    Haz clic en "+ Nuevo Cultivo" para agregar tu primer cultivo
                </p>
            </div>
        `;
        return;
    }

    // Guardar en cache para edición
    cropsCache = crops;

    // Renderizar cultivos
    cropsGrid.textContent = '';
    const fragment = document.createDocumentFragment();
    crops.forEach((crop, i) => {
        fragment.appendChild(createCropCardElement(crop, i));
    });
    cropsGrid.appendChild(fragment);

    // Animar progress bars
    setTimeout(() => {
        document.querySelectorAll('.crops-grid .progress-fill').forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => { bar.style.width = width; }, 100);
        });
    }, 300);

    console.log(`[Agro] ✅ ${crops.length} cultivos cargados`);
}

// Expose loadCrops globally for data-refresh event in index.html
window.loadCrops = loadCrops;

// ============================================================
// CALCULADORA ROI CON GUARDADO EN SUPABASE
// ============================================================

/**
 * Calcula ROI y guarda en Supabase
 */
export async function calculateROI() {
    const investment = parseFloat(document.getElementById('investment')?.value) || 0;
    const revenue = parseFloat(document.getElementById('revenue')?.value) || 0;
    const quantity = parseFloat(document.getElementById('quantity')?.value) || 0;

    const profit = revenue - investment;
    const roi = investment > 0 ? ((profit / investment) * 100) : 0;

    // Actualizar DOM
    document.getElementById('resultInvestment').textContent = formatCurrency(investment);
    document.getElementById('resultRevenue').textContent = formatCurrency(revenue);

    const profitEl = document.getElementById('resultProfit');
    profitEl.textContent = formatCurrency(profit);
    profitEl.className = `roi-value ${profit >= 0 ? 'profit' : 'loss'}`;

    const roiEl = document.getElementById('resultROI');
    roiEl.textContent = `${roi.toFixed(1)}%`;
    roiEl.className = `roi-value ${roi >= 0 ? 'profit' : 'loss'}`;

    // Mostrar resultados con animación
    const resultDiv = document.getElementById('roiResult');
    resultDiv.classList.remove('visible');
    void resultDiv.offsetWidth; // Force reflow
    resultDiv.classList.add('visible');

    // Guardar en Supabase (solo si hay datos válidos)
    if (investment > 0 || revenue > 0) {
        try {
            const { data: userData } = await supabase.auth.getUser();

            if (userData?.user?.id) {
                const { error } = await supabase
                    .from('agro_roi_calculations')
                    .insert([{
                        user_id: userData.user.id,
                        investment_amount: investment,
                        projected_revenue: revenue,
                        quantity_kg: quantity || null,
                        calculated_profit: profit,
                        roi_percentage: roi
                    }]);

                if (error) {
                    console.warn('[Agro] Error guardando cálculo ROI:', error.message);
                } else {
                    console.log('[Agro] ✅ Cálculo ROI guardado');
                }
            } else {
                console.log('[Agro] Usuario no autenticado, cálculo no guardado');
            }
        } catch (err) {
            console.warn('[Agro] Error al guardar ROI:', err);
        }
    }
}

function resetRoiResults() {
    const resultDiv = document.getElementById('roiResult');
    if (resultDiv) resultDiv.classList.remove('visible');

    const defaults = [
        ['resultInvestment', '$0'],
        ['resultRevenue', '$0'],
        ['resultProfit', '$0'],
        ['resultROI', '0%']
    ];

    defaults.forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function clearRoiInputs() {
    const investment = document.getElementById('investment');
    const revenue = document.getElementById('revenue');
    const quantity = document.getElementById('quantity');

    if (investment) investment.value = '';
    if (revenue) revenue.value = '';
    if (quantity) quantity.value = '';

    resetRoiResults();
}

function injectRoiClearButton(calcBtn) {
    if (!calcBtn || document.getElementById('roi-clear-btn')) return;

    const clearBtn = document.createElement('button');
    clearBtn.id = 'roi-clear-btn';
    clearBtn.type = 'button';
    clearBtn.className = 'btn';
    clearBtn.textContent = 'LIMPIAR';
    clearBtn.style.cssText = "margin-left: 0.75rem; background: transparent; border: 1px solid rgba(200, 167, 82, 0.4); color: #C8A752; padding: 0.75rem 1.5rem; border-radius: 50px; font-family: 'Rajdhani', sans-serif; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.3s ease;";

    clearBtn.addEventListener('mouseenter', () => {
        clearBtn.style.background = 'rgba(200, 167, 82, 0.12)';
        clearBtn.style.borderColor = '#C8A752';
    });
    clearBtn.addEventListener('mouseleave', () => {
        clearBtn.style.background = 'transparent';
        clearBtn.style.borderColor = 'rgba(200, 167, 82, 0.4)';
    });
    clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearRoiInputs();
    });

    calcBtn.insertAdjacentElement('afterend', clearBtn);
}

let expenseSyncTimer = null;
let expenseSyncInFlight = false;
let expenseCache = [];
let expenseDeletedAtSupported = null;
let expenseDeletedAtRefreshDone = false;
const expenseSignedUrlCache = new Map();
let agroStoragePatched = false;

function setExpenseCache(data) {
    const rows = Array.isArray(data) ? data : [];
    expenseCache = rows.filter((row) => !row?.deleted_at);
    scheduleExpenseSync();
}

function patchExpenseSelect() {
    if (supabase.__agroExpenseSelectPatched) return;
    supabase.__agroExpenseSelectPatched = true;

    const originalFrom = supabase.from.bind(supabase);
    supabase.from = (table) => {
        const builder = originalFrom(table);
        if (table !== 'agro_expenses' || !builder || typeof builder.select !== 'function') {
            return builder;
        }

        const originalSelect = builder.select.bind(builder);
        builder.select = (...args) => {
            const query = originalSelect(...args);
            if (expenseDeletedAtSupported === true && typeof query?.is === 'function') {
                query.is('deleted_at', null);
            }
            if (query && typeof query.then === 'function') {
                const originalThen = query.then.bind(query);
                query.then = (onFulfilled, onRejected) => originalThen(
                    (res) => {
                        if (res?.data && Array.isArray(res.data)) {
                            setExpenseCache(res.data);
                        }
                        return onFulfilled ? onFulfilled(res) : res;
                    },
                    onRejected
                );
            }
            return query;
        };
        return builder;
    };
}

function getLegacyAgroEvidencePath(path) {
    if (typeof path !== 'string' || !path) return path;
    const legacyExpenseRoot = `${AGRO_EXPENSE_STORAGE_ROOT}s`;
    if (path.includes(`/${AGRO_INCOME_STORAGE_ROOT}/`)
        || path.includes(`/${AGRO_EXPENSE_STORAGE_ROOT}/`)
        || path.includes(`/${legacyExpenseRoot}/`)) {
        return path;
    }
    const parts = path.split('/');
    if (parts.length < 2) return path;
    const userId = parts.shift();
    const rest = parts.join('/');
    return `${userId}/${AGRO_EXPENSE_STORAGE_ROOT}/${rest}`;
}

function normalizeAgroEvidencePath(path) {
    if (typeof path !== 'string' || !path) return path;
    const legacyExpenseRoot = `${AGRO_EXPENSE_STORAGE_ROOT}s`;
    const allowedRoots = [
        AGRO_INCOME_STORAGE_ROOT,
        AGRO_EXPENSE_STORAGE_ROOT,
        AGRO_PENDING_STORAGE_ROOT,
        AGRO_LOSS_STORAGE_ROOT,
        AGRO_TRANSFER_STORAGE_ROOT,
        legacyExpenseRoot
    ].filter(Boolean);

    if (allowedRoots.some(root => path.includes(`/${root}/`))) {
        return path;
    }

    const parts = path.split('/');
    if (parts.length < 2) return path;
    const userId = parts.shift();
    const rest = parts.join('/');
    return `${userId}/${AGRO_EXPENSE_STORAGE_ROOT}/${rest}`;
}

function extractStoragePathFromUrl(rawUrl) {
    if (!rawUrl) return null;
    const value = String(rawUrl).trim();
    if (!value || value.startsWith('blob:') || value.startsWith('data:')) return null;

    const publicPrefix = `/storage/v1/object/public/${AGRO_STORAGE_BUCKET_ID}/`;
    const signedPrefix = `/storage/v1/object/sign/${AGRO_STORAGE_BUCKET_ID}/`;

    const publicIndex = value.indexOf(publicPrefix);
    if (publicIndex >= 0) {
        return decodeURIComponent(value.slice(publicIndex + publicPrefix.length).split('?')[0]);
    }

    const signedIndex = value.indexOf(signedPrefix);
    if (signedIndex >= 0) {
        return decodeURIComponent(value.slice(signedIndex + signedPrefix.length).split('?')[0]);
    }

    if (value.startsWith('http')) return null;
    return value.split('?')[0];
}

function patchAgroEvidenceStorage() {
    if (agroStoragePatched) return;
    agroStoragePatched = true;

    const originalFrom = supabase.storage.from.bind(supabase.storage);
    supabase.storage.from = (bucketId) => {
        const bucket = originalFrom(bucketId);
        if (bucketId !== AGRO_STORAGE_BUCKET_ID || !bucket) return bucket;
        if (bucket.__agroEvidencePatched) return bucket;
        bucket.__agroEvidencePatched = true;

        const originalUpload = bucket.upload?.bind(bucket);
        if (typeof originalUpload === 'function') {
            bucket.upload = (path, file, options) => {
                const normalizedPath = normalizeAgroEvidencePath(path);
                return originalUpload(normalizedPath, file, options);
            };
        }

        const originalGetPublicUrl = bucket.getPublicUrl?.bind(bucket);
        if (typeof originalGetPublicUrl === 'function') {
            bucket.getPublicUrl = (path) => {
                const normalizedPath = normalizeAgroEvidencePath(path);
                return { data: { publicUrl: normalizedPath } };
            };
        }

        return bucket;
    };
}

async function detectExpenseDeletedAtSupport() {
    if (expenseDeletedAtSupported !== null) return expenseDeletedAtSupported;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        const { error } = await supabase
            .from('agro_expenses')
            .select('deleted_at')
            .limit(1);
        if (error && error.message && error.message.toLowerCase().includes('deleted_at')) {
            expenseDeletedAtSupported = false;
        } else if (!error) {
            expenseDeletedAtSupported = true;
        } else {
            expenseDeletedAtSupported = false;
        }
    } catch (err) {
        expenseDeletedAtSupported = false;
    }

    if (expenseDeletedAtSupported && !expenseDeletedAtRefreshDone) {
        expenseDeletedAtRefreshDone = true;
        document.dispatchEvent(new CustomEvent('data-refresh'));
    }

    return expenseDeletedAtSupported;
}

async function getExpenseSignedUrl(path) {
    if (!path) return null;
    if (expenseSignedUrlCache.has(path)) return expenseSignedUrlCache.get(path);

    const { data, error } = await supabase.storage
        .from(AGRO_STORAGE_BUCKET_ID)
        .createSignedUrl(path, 3600);

    if (error) {
        console.warn('[Agro] Expense signed URL error:', error.message);
        return null;
    }

    const signedUrl = data?.signedUrl || null;
    if (signedUrl) expenseSignedUrlCache.set(path, signedUrl);
    return signedUrl;
}

async function updateExpenseEvidenceLinks(item) {
    if (!item) return;
    const link = item.querySelector('a[href]');
    if (!link || link.dataset.signed === 'true') return;

    const rawHref = link.getAttribute('href');
    const storagePath = extractStoragePathFromUrl(rawHref);
    if (!storagePath) return;

    const normalizedPath = normalizeAgroEvidencePath(storagePath);
    let signedUrl = await getExpenseSignedUrl(normalizedPath);
    let resolvedPath = normalizedPath;
    if (!signedUrl && normalizedPath !== storagePath) {
        signedUrl = await getExpenseSignedUrl(storagePath);
        resolvedPath = storagePath;
    }
    if (!signedUrl) return;

    link.href = signedUrl;
    link.rel = 'noopener noreferrer';
    link.dataset.signed = 'true';
    link.dataset.storagePath = resolvedPath;
}

function scheduleExpenseSync() {
    if (expenseSyncTimer) clearTimeout(expenseSyncTimer);
    expenseSyncTimer = setTimeout(() => {
        syncExpenseDeleteButtons().catch((err) => console.warn('[Agro] Expense sync error:', err));
    }, 120);
}

async function syncExpenseDeleteButtons() {
    if (expenseSyncInFlight) return;
    expenseSyncInFlight = true;

    try {
        const expensesList = document.getElementById('expenses-list');
        if (!expensesList) return;

        const items = Array.from(expensesList.querySelectorAll('.expense-item'));
        if (items.length === 0) return;

        items.forEach((item, index) => {
            const expense = expenseCache[index];
            const expenseId = expense?.id;
            if (expenseId) {
                item.dataset.expenseId = String(expenseId);
            }
            attachExpenseDeleteButton(item, expenseId);
            void updateExpenseEvidenceLinks(item);
        });
    } finally {
        expenseSyncInFlight = false;
    }
}

function attachExpenseDeleteButton(item, expenseId) {
    if (!item) return;
    if (item.querySelector('.btn-delete-facturero')) return;

    const existingBtn = item.querySelector('.expense-delete-btn');
    if (existingBtn) {
        if (expenseId && !existingBtn.dataset.id) {
            existingBtn.dataset.id = String(expenseId);
        }
        return;
    }

    if (!expenseId) return;

    let amountEl = item.lastElementChild;
    if (!amountEl) return;

    let actions = amountEl.parentElement;
    if (!actions || !actions.classList.contains('expense-actions')) {
        actions = document.createElement('div');
        actions.className = 'expense-actions';
        actions.style.cssText = 'display: flex; align-items: center; gap: 0.6rem;';
        amountEl.replaceWith(actions);
        actions.appendChild(amountEl);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'expense-delete-btn';
    deleteBtn.title = 'Eliminar';
    deleteBtn.dataset.id = String(expenseId);
    deleteBtn.style.cssText = 'background: transparent; border: 1px solid rgba(239, 68, 68, 0.35); color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;';

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-trash';
    icon.style.fontSize = '0.85rem';
    deleteBtn.appendChild(icon);

    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = 'rgba(239, 68, 68, 0.15)';
        deleteBtn.style.borderColor = '#ef4444';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.borderColor = 'rgba(239, 68, 68, 0.35)';
    });
    deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!window.confirm('\u00bfEliminar?')) return;
        const targetId = deleteBtn.dataset.id || item.dataset.expenseId;
        if (!targetId) {
            alert('No se pudo identificar el gasto.');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesion para eliminar gastos.');
            return;
        }

        // Get expense data for cascade delete of evidence
        const expense = expenseCache.find(e => e && String(e.id) === targetId);
        const evidencePath = expense?.evidence_url || null;

        // Try soft delete first
        let deleteSuccess = false;
        const { error: softError } = await supabase
            .from('agro_expenses')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', targetId)
            .eq('user_id', user.id);

        if (!softError) {
            deleteSuccess = true;
        } else if (softError.message && softError.message.toLowerCase().includes('deleted_at')) {
            // Fallback to hard delete if soft delete not supported
            console.warn('[Agro] Soft delete not available, falling back to hard delete');
            const { error: hardError } = await supabase
                .from('agro_expenses')
                .delete()
                .eq('id', targetId)
                .eq('user_id', user.id);

            if (!hardError) {
                deleteSuccess = true;
            } else {
                showEvidenceToast('Error al eliminar gasto.', 'warning');
                console.error('[Agro] Hard delete failed:', hardError.message);
            }
        } else {
            showEvidenceToast('Error al eliminar gasto.', 'warning');
            console.error('[Agro] Delete failed:', softError.message);
        }

        // Cascade delete evidence from Storage (best-effort)
        if (deleteSuccess && evidencePath) {
            await deleteEvidenceFile(evidencePath);
        }

        if (deleteSuccess) {
            document.dispatchEvent(new CustomEvent('data-refresh'));
        }
    });

    actions.appendChild(deleteBtn);
}

function setupExpenseDeleteButtons() {
    const expensesList = document.getElementById('expenses-list');
    if (!expensesList) return;

    patchAgroEvidenceStorage();
    patchExpenseSelect();
    void detectExpenseDeletedAtSupport();

    const observer = new MutationObserver(() => scheduleExpenseSync());
    observer.observe(expensesList, { childList: true });

    document.addEventListener('data-refresh', scheduleExpenseSync);
    scheduleExpenseSync();
}

const AGRO_STORAGE_BUCKET_ID = 'agro-evidence';
const AGRO_INCOME_STORAGE_ROOT = 'agro/income';
const AGRO_EXPENSE_STORAGE_ROOT = 'agro/expense';
const AGRO_PENDING_STORAGE_ROOT = 'agro/pending';
const AGRO_LOSS_STORAGE_ROOT = 'agro/loss';
const AGRO_TRANSFER_STORAGE_ROOT = 'agro/transfer';
const AGRO_GAINS_STORAGE_ROOT = null;
const INCOME_SECTION_ID = 'agro-income-section';
const FIN_TAB_STORAGE_KEY = 'YG_AGRO_FIN_TAB_V1';
const FIN_TAB_NAMES = new Set(['gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias']);

// SECURITY: Strict allowlist - NO doc/docx/txt
const ALLOWED_EVIDENCE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
const ALLOWED_EVIDENCE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const EVIDENCE_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Legacy aliases (kept for backward compatibility in existing code)
const INCOME_DOC_EXTENSIONS = ['pdf']; // REMOVED: doc, docx, txt
const INCOME_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const INCOME_MAX_FILE_SIZE = EVIDENCE_MAX_FILE_SIZE;

let incomeCache = [];
let incomeModuleInitialized = false;
let incomeDeletedAtSupported = null;
let incomeEditId = null;
let incomeEditSupportPath = null;

// Patch early to catch initial expense load and storage paths.
patchAgroEvidenceStorage();
patchExpenseSelect();
void detectExpenseDeletedAtSupport();

/**
 * SECURITY: Validate evidence file with magic bytes anti-spoof check
 * @param {File} file - File to validate
 * @returns {Promise<{valid: boolean, error?: string, file?: File}>}
 */
async function validateEvidenceFile(file) {
    if (!file) return { valid: true, file: null };

    // 1. Size check
    if (file.size > EVIDENCE_MAX_FILE_SIZE) {
        return { valid: false, error: 'Archivo muy grande. Maximo 5MB.' };
    }

    // 2. Extension check
    const ext = getFileExtension(file.name);
    if (!ALLOWED_EVIDENCE_EXTENSIONS.includes(ext)) {
        return { valid: false, error: 'Tipo no permitido. Solo JPG, PNG, WebP o PDF.' };
    }

    // 3. MIME check (browser-reported, can be spoofed)
    if (!ALLOWED_EVIDENCE_MIMES.includes(file.type)) {
        return { valid: false, error: 'Tipo no permitido. Solo JPG, PNG, WebP o PDF.' };
    }

    // 4. Magic bytes check (anti-spoof)
    try {
        const magicValid = await checkMagicBytes(file);
        if (!magicValid) {
            console.warn('[Agro] Magic bytes mismatch for:', file.name);
            return { valid: false, error: 'Archivo no valido. Contenido no coincide con extension.' };
        }
    } catch (err) {
        console.warn('[Agro] Magic bytes check failed:', err.message);
        // Fail closed: if we can't verify, reject
        return { valid: false, error: 'No se pudo verificar el archivo.' };
    }

    return { valid: true, file };
}

/**
 * SECURITY: Check file magic bytes to prevent spoofed extensions
 * @param {File} file - File to check
 * @returns {Promise<boolean>} - true if magic bytes match expected type
 */
async function checkMagicBytes(file) {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const ext = getFileExtension(file.name);

    // PDF: starts with %PDF (25 50 44 46)
    if (ext === 'pdf') {
        return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (ext === 'png') {
        return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
            bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A;
    }

    // JPEG: FF D8 FF
    if (ext === 'jpg' || ext === 'jpeg') {
        return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    }

    // WebP: RIFF (52 49 46 46) + WEBP at pos 8-11 (57 45 42 50)
    if (ext === 'webp') {
        return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
            bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    }

    return false;
}

/**
 * Build storage path for new movement types
 */
function buildPendingStoragePath(userId, fileName) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${userId}/${AGRO_PENDING_STORAGE_ROOT}/${Date.now()}_${cleanName}`;
}

function buildLossStoragePath(userId, fileName) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${userId}/${AGRO_LOSS_STORAGE_ROOT}/${Date.now()}_${cleanName}`;
}

function buildTransferStoragePath(userId, fileName) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${userId}/${AGRO_TRANSFER_STORAGE_ROOT}/${Date.now()}_${cleanName}`;
}

/**
 * Delete evidence file from Storage (cascade delete helper)
 */
async function deleteEvidenceFile(path) {
    if (!path) return;
    try {
        const { error } = await supabase.storage
            .from(AGRO_STORAGE_BUCKET_ID)
            .remove([path]);
        if (error) {
            console.warn('[Agro] Failed to delete evidence:', error.message);
        } else {
            console.log('[Agro] Evidence deleted:', path);
        }
    } catch (err) {
        console.warn('[Agro] Evidence delete error:', err.message);
    }
}

/**
 * Upload evidence file with proper contentType
 * @param {File} file - Validated file to upload
 * @param {string} storagePath - Full path in bucket (uid/agro/type/filename)
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
async function uploadEvidence(file, storagePath) {
    if (!file || !storagePath) {
        return { success: false, error: 'Archivo o ruta no validos' };
    }

    try {
        const { error } = await supabase.storage
            .from(AGRO_STORAGE_BUCKET_ID)
            .upload(storagePath, file, {
                contentType: file.type, // Set correct MIME for preview/download
                upsert: false
            });

        if (error) {
            console.warn('[Agro] Upload error:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true, path: storagePath };
    } catch (err) {
        console.warn('[Agro] Upload exception:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Get signed URL for private evidence viewing (1 hour validity)
 * @param {string} path - Storage path
 * @returns {Promise<string|null>} Signed URL or null
 */
async function getSignedEvidenceUrl(path, options = {}) {
    if (!path) return null;
    const quiet = options?.quiet === true;

    try {
        const { data, error } = await supabase.storage
            .from(AGRO_STORAGE_BUCKET_ID)
            .createSignedUrl(path, 3600); // 1 hour

        if (error) {
            if (!quiet) {
                console.warn('[Agro] Signed URL error:', error.message);
            }
            return null;
        }

        return data?.signedUrl || null;
    } catch (err) {
        if (!quiet) {
            console.warn('[Agro] Signed URL exception:', err.message);
        }
        return null;
    }
}

/**
 * Show toast notification (Visual DNA compliant - no red for errors)
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'warning', 'info'
 */
function showEvidenceToast(message, type = 'info') {
    // Try to use existing toast system if available
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }

    // Fallback: create simple toast
    const toast = document.createElement('div');
    toast.className = 'agro-evidence-toast';
    toast.textContent = message;

    const colors = {
        success: { bg: 'rgba(74, 222, 128, 0.15)', border: 'rgba(74, 222, 128, 0.4)', color: '#4ade80' },
        warning: { bg: 'rgba(200, 167, 82, 0.15)', border: 'rgba(200, 167, 82, 0.4)', color: '#C8A752' },
        info: { bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)', color: '#fff' }
    };
    const c = colors[type] || colors.info;

    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${c.bg};
        border: 1px solid ${c.border};
        color: ${c.color};
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        backdrop-filter: blur(10px);
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openAdvancedPanelFor(element) {
    if (!element || typeof element.closest !== 'function') return;
    const details = element.closest('details.advanced-panel');
    if (details && !details.open) {
        details.open = true;
    }
}

function closeAdvancedPanelFor(element) {
    if (!element || typeof element.closest !== 'function') return;
    const details = element.closest('details.advanced-panel');
    if (details && details.open) {
        details.open = false;
    }
}

function getEvidenceDisplayName(fileName) {
    const clean = String(fileName || '');
    if (!clean) return '';
    return clean.length > 36 ? `${clean.slice(0, 33)}...` : clean;
}

function revokeDropzonePreview(dropzone) {
    if (!dropzone || !dropzone.dataset) return;
    const prevUrl = dropzone.dataset.previewUrl;
    if (prevUrl) {
        try {
            URL.revokeObjectURL(prevUrl);
        } catch (e) {
            // Ignore revoke errors
        }
    }
    delete dropzone.dataset.previewUrl;
}

function resetCompactEvidenceDropzone(dropzone) {
    if (!dropzone) return;
    revokeDropzonePreview(dropzone);
    dropzone.classList.remove('has-file', 'is-dragover');

    const trigger = dropzone.querySelector('.evidence-trigger');
    const row = dropzone.querySelector('.evidence-row');
    const nameEl = dropzone.querySelector('.evidence-name');
    const hint = dropzone.querySelector('.evidence-hint');

    if (nameEl) nameEl.textContent = '';
    if (row) row.classList.add('is-hidden');
    if (trigger) trigger.classList.remove('is-hidden');
    if (hint) hint.classList.remove('is-hidden');

    updateAdvancedMetaForPanel(dropzone.closest('details.advanced-panel'));
}

function setCompactEvidenceDropzone(dropzone, file) {
    if (!dropzone) return;
    if (!file) {
        resetCompactEvidenceDropzone(dropzone);
        return;
    }

    const trigger = dropzone.querySelector('.evidence-trigger');
    const row = dropzone.querySelector('.evidence-row');
    const nameEl = dropzone.querySelector('.evidence-name');
    const hint = dropzone.querySelector('.evidence-hint');

    if (nameEl) nameEl.textContent = getEvidenceDisplayName(file.name);
    if (row) row.classList.remove('is-hidden');
    if (trigger) trigger.classList.add('is-hidden');
    if (hint) hint.classList.add('is-hidden');

    dropzone.classList.add('has-file');
    revokeDropzonePreview(dropzone);
    try {
        dropzone.dataset.previewUrl = URL.createObjectURL(file);
    } catch (e) {
        // Ignore preview errors
    }

    updateAdvancedMetaForPanel(dropzone.closest('details.advanced-panel'));
}

function bindCompactEvidenceControls(dropzone, input) {
    if (!dropzone || !input) return;
    if (dropzone.dataset?.evidenceBound === 'true') return;
    dropzone.dataset.evidenceBound = 'true';

    const trigger = dropzone.querySelector('.evidence-trigger');
    const changeBtn = dropzone.querySelector('.evidence-change');
    const viewBtn = dropzone.querySelector('.evidence-view');

    const openPicker = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        input.click();
    };

    if (trigger) trigger.addEventListener('click', openPicker);
    if (changeBtn) changeBtn.addEventListener('click', openPicker);
    if (viewBtn) {
        viewBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const url = dropzone.dataset?.previewUrl;
            if (url) window.open(url, '_blank');
        });
    }
}

const ADVANCED_STATE_PREFIX = 'agro.facturero.advanced.';

function getAdvancedStateKey(tabName) {
    return `${ADVANCED_STATE_PREFIX}${tabName}.open`;
}

function readAdvancedState(tabName) {
    if (!tabName) return null;
    try {
        const value = localStorage.getItem(getAdvancedStateKey(tabName));
        if (value === '1') return true;
        if (value === '0') return false;
        return null;
    } catch (e) {
        return null;
    }
}

function writeAdvancedState(tabName, isOpen) {
    if (!tabName) return;
    try {
        localStorage.setItem(getAdvancedStateKey(tabName), isOpen ? '1' : '0');
    } catch (e) {
        // Ignore storage errors
    }
}

function getAdvancedMetaText(panel) {
    if (!panel) return '';
    const fileInput = panel.querySelector('input[type="file"]');
    const dropzone = panel.querySelector('.upload-dropzone');
    const notes = panel.querySelector('textarea');
    const hasEvidence = !!(fileInput?.files?.length) || !!dropzone?.classList.contains('has-file');
    const hasNotes = !!notes?.value?.trim();
    const evidenceLabel = hasEvidence ? 'adjunta' : 'no';
    const notesLabel = hasNotes ? 'si' : 'no';
    return `Evidencia: ${evidenceLabel} | Notas: ${notesLabel}`;
}

function updateAdvancedMetaForPanel(panel, log = false) {
    if (!panel) return;
    const tabName = panel.dataset?.tab || panel.id || 'unknown';
    const meta = panel.querySelector('.advanced-meta') || document.getElementById(`advanced-meta-${tabName}`);
    if (!meta) return;
    meta.textContent = getAdvancedMetaText(panel);
    if (log) {
        console.log(`[AGRO] V9.5.6: meta updated ${tabName}`);
    }
}

function bindAdvancedPanel(panel) {
    if (!panel || panel.dataset?.advancedBound === 'true') return;
    panel.dataset.advancedBound = 'true';

    const tabName = panel.dataset?.tab || panel.id || 'unknown';
    const savedState = readAdvancedState(tabName);
    if (savedState !== null) {
        panel.open = savedState;
        console.log(`[AGRO] V9.5.6: advanced accordion state restored for ${tabName}`);
    }

    updateAdvancedMetaForPanel(panel);

    panel.addEventListener('toggle', () => {
        writeAdvancedState(tabName, panel.open);
        updateAdvancedMetaForPanel(panel);
    });

    const notesInput = panel.querySelector('textarea');
    if (notesInput) {
        let notesTimer;
        notesInput.addEventListener('input', () => {
            clearTimeout(notesTimer);
            notesTimer = setTimeout(() => updateAdvancedMetaForPanel(panel), 150);
        });
    }

    const fileInput = panel.querySelector('input[type="file"]');
    if (fileInput) {
        fileInput.addEventListener('change', () => updateAdvancedMetaForPanel(panel));
    }
}

function initAdvancedPanels() {
    document.querySelectorAll('details.advanced-panel').forEach((panel) => {
        bindAdvancedPanel(panel);
    });
}

if (typeof window !== 'undefined') {
    window.agroEvidenceUI = {
        openAdvancedPanelFor,
        closeAdvancedPanelFor,
        resetCompactEvidenceDropzone,
        setCompactEvidenceDropzone,
        bindCompactEvidenceControls,
        updateAdvancedMetaForPanel,
        initAdvancedPanels
    };
}

/**
 * Generic dropzone file handler for new tabs
 */
async function handleGenericFileUpload(inputId, dropzoneId) {
    const input = document.getElementById(inputId);
    const dropzone = document.getElementById(dropzoneId);
    if (!input || !dropzone) return;

    const file = input.files?.[0];
    if (!file) return;

    const validation = await validateEvidenceFile(file);
    if (!validation.valid) {
        showEvidenceToast(validation.error, 'warning');
        input.value = '';
        resetGenericDropzone(dropzoneId);
        return;
    }

    openAdvancedPanelFor(dropzone);
    setCompactEvidenceDropzone(dropzone, file);
}

/**
 * Reset a generic dropzone to default state
 */
function resetGenericDropzone(dropzoneId) {
    const dropzone = document.getElementById(dropzoneId);
    if (!dropzone) return;
    resetCompactEvidenceDropzone(dropzone);
}

/**
 * Initialize dropzone handlers for new tabs (Pendientes/Perdidas/Transferencias)
 */
function initNewTabDropzones() {
    const tabs = [
        { input: 'pending-receipt', dropzone: 'pending-dropzone' },
        { input: 'loss-receipt', dropzone: 'loss-dropzone' },
        { input: 'transfer-receipt', dropzone: 'transfer-dropzone' }
    ];

    tabs.forEach(({ input, dropzone }) => {
        const inputEl = document.getElementById(input);
        const dropzoneEl = document.getElementById(dropzone);

        if (inputEl && dropzoneEl) {
            bindCompactEvidenceControls(dropzoneEl, inputEl);
            inputEl.addEventListener('change', () => handleGenericFileUpload(input, dropzone));
            resetCompactEvidenceDropzone(dropzoneEl);

            // Drag and drop support
            dropzoneEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzoneEl.classList.add('is-dragover');
            });
            dropzoneEl.addEventListener('dragleave', () => {
                dropzoneEl.classList.remove('is-dragover');
            });
            dropzoneEl.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropzoneEl.classList.remove('is-dragover');

                const file = e.dataTransfer?.files?.[0];
                if (file) {
                    // Create DataTransfer to set files properly
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    inputEl.files = dt.files;
                    openAdvancedPanelFor(dropzoneEl);
                    await handleGenericFileUpload(input, dropzone);
                }
            });
        }
    });
}

// Initialize new tab dropzones when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewTabDropzones);
} else {
    initNewTabDropzones();
}

// Expose validation functions globally for use by inline handlers (e.g. Gastos)
window.validateEvidenceFile = validateEvidenceFile;
window.showEvidenceToast = showEvidenceToast;
window.getFileExtension = getFileExtension;
window.resetGenericDropzone = resetGenericDropzone;

function formatShortCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '$0';
    if (Math.abs(number) >= 1000) {
        return `$${(number / 1000).toFixed(1)}k`;
    }
    return `$${number.toFixed(0)}`;
}

function buildIncomeStoragePrefix(userId, incomeId) {
    return `${userId}/${AGRO_INCOME_STORAGE_ROOT}/${incomeId}/`;
}

function buildIncomeStoragePath(userId, incomeId, fileName) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${buildIncomeStoragePrefix(userId, incomeId)}${Date.now()}_${cleanName}`;
}

function buildExpenseStoragePrefix(userId) {
    return `${userId}/${AGRO_EXPENSE_STORAGE_ROOT}/`;
}

function buildExpenseStoragePath(userId, fileName) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${buildExpenseStoragePrefix(userId)}${Date.now()}_${cleanName}`;
}

function getFileExtension(fileName) {
    if (!fileName) return '';
    const clean = String(fileName).split('?')[0].split('#')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function isIncomeDocExtension(ext) {
    return INCOME_DOC_EXTENSIONS.includes(ext);
}

function isIncomeImageExtension(ext) {
    return INCOME_IMAGE_EXTENSIONS.includes(ext);
}

function ensureIncomeSection(targetContainer) {
    const existing = document.getElementById(INCOME_SECTION_ID);
    if (existing) {
        if (targetContainer && existing.parentElement !== targetContainer) {
            targetContainer.appendChild(existing);
        }
        return existing;
    }
    if (!targetContainer) return null;

    const wrapper = document.createElement('div');
    wrapper.id = INCOME_SECTION_ID;
    const existingForm = document.getElementById('income-form');
    const existingNote = document.querySelector('[data-income-note="true"]');
    const existingListContainer = document.getElementById('income-recent-container');

    let form = existingForm;
    let note = existingNote;
    let listContainer = existingListContainer;

    if (!form) {
        form = document.createElement('form');
        form.id = 'income-form';
        form.className = 'income-form';

        const grid = document.createElement('div');
        grid.className = 'facturero-grid';

        const conceptGroup = document.createElement('div');
        conceptGroup.className = 'input-group field-concept';
        const conceptLabel = document.createElement('label');
        conceptLabel.className = 'input-label';
        conceptLabel.setAttribute('for', 'income-concept');
        conceptLabel.textContent = 'Concepto *';
        const conceptInput = document.createElement('input');
        conceptInput.type = 'text';
        conceptInput.id = 'income-concept';
        conceptInput.className = 'styled-input';
        conceptInput.required = true;
        conceptInput.placeholder = 'Ej: Venta de tomate';
        conceptInput.style.paddingLeft = '1rem';
        conceptGroup.append(conceptLabel, conceptInput);

        const amountGroup = document.createElement('div');
        amountGroup.className = 'input-group field-amount';
        const amountLabel = document.createElement('label');
        amountLabel.className = 'input-label';
        amountLabel.setAttribute('for', 'income-amount');
        amountLabel.textContent = 'Monto *';
        const amountWrapper = document.createElement('div');
        amountWrapper.className = 'input-wrapper';
        const amountPrefix = document.createElement('span');
        amountPrefix.className = 'input-prefix';
        amountPrefix.textContent = '$';
        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.id = 'income-amount';
        amountInput.className = 'styled-input';
        amountInput.required = true;
        amountInput.placeholder = '0.00';
        amountInput.step = '0.01';
        amountInput.min = '0';
        amountWrapper.append(amountPrefix, amountInput);
        amountGroup.append(amountLabel, amountWrapper);

        const dateGroup = document.createElement('div');
        dateGroup.className = 'input-group field-date';
        const dateLabel = document.createElement('label');
        dateLabel.className = 'input-label';
        dateLabel.setAttribute('for', 'income-date');
        dateLabel.textContent = 'Fecha *';
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.id = 'income-date';
        dateInput.className = 'styled-input';
        dateInput.required = true;
        dateInput.style.paddingLeft = '1rem';
        dateGroup.append(dateLabel, dateInput);

        const categoryGroup = document.createElement('div');
        categoryGroup.className = 'input-group field-dynamic';
        const categoryLabel = document.createElement('label');
        categoryLabel.className = 'input-label';
        categoryLabel.setAttribute('for', 'income-category');
        categoryLabel.textContent = 'Categoria *';
        const categorySelect = document.createElement('select');
        categorySelect.id = 'income-category';
        categorySelect.className = 'styled-input';
        categorySelect.required = true;
        categorySelect.style.paddingLeft = '1rem';
        categorySelect.style.cursor = 'pointer';
        const categoryOptions = [
            { value: '', label: 'Seleccionar...' },
            { value: 'ventas', label: 'Ventas' },
            { value: 'servicios', label: 'Servicios' },
            { value: 'subsidios', label: 'Subsidios' },
            { value: 'otros', label: 'Otros' }
        ];
        categoryOptions.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            categorySelect.appendChild(option);
        });
        categoryGroup.append(categoryLabel, categorySelect);

        // V9.5: Asociar a Cultivo (opcional)
        const cropGroup = document.createElement('div');
        cropGroup.className = 'input-group field-crop';
        const cropLabel = document.createElement('label');
        cropLabel.className = 'input-label';
        cropLabel.setAttribute('for', 'income-crop-id');
        cropLabel.textContent = 'Asociar a Cultivo (opcional)';
        const cropSelect = document.createElement('select');
        cropSelect.id = 'income-crop-id';
        cropSelect.className = 'styled-input crop-selector';
        cropSelect.style.paddingLeft = '1rem';
        cropSelect.style.cursor = 'pointer';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'General (sin asociar)';
        cropSelect.appendChild(defaultOpt);
        cropGroup.append(cropLabel, cropSelect);

        const actions = document.createElement('div');
        actions.className = 'facturero-actions';

        const btnClean = document.createElement('button');
        btnClean.type = 'button';
        btnClean.id = 'income-clean-btn';
        btnClean.className = 'btn';
        btnClean.textContent = 'Limpiar';
        btnClean.style.cssText = 'background: transparent; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); padding: 12px 24px; border-radius: var(--radius-pill); cursor: pointer; transition: all 0.3s;';
        btnClean.addEventListener('mouseenter', () => {
            btnClean.style.borderColor = 'rgba(255,255,255,0.4)';
            btnClean.style.color = '#fff';
        });
        btnClean.addEventListener('mouseleave', () => {
            btnClean.style.borderColor = 'rgba(255,255,255,0.2)';
            btnClean.style.color = 'rgba(255,255,255,0.7)';
        });

        const btnSave = document.createElement('button');
        btnSave.type = 'submit';
        btnSave.id = 'income-save-btn';
        btnSave.className = 'btn btn-primary';
        btnSave.textContent = 'Registrar Ingreso';
        btnSave.style.cssText = 'background: linear-gradient(135deg, var(--gold-primary, #C8A752), var(--gold-dark, #9a7f3c)); color: #000; padding: 12px 32px; border: none; border-radius: var(--radius-pill); cursor: pointer; font-weight: 700; transition: all 0.3s;';
        btnSave.addEventListener('mouseenter', () => {
            btnSave.style.boxShadow = '0 0 25px rgba(200, 167, 82, 0.5)';
            btnSave.style.transform = 'translateY(-2px)';
        });
        btnSave.addEventListener('mouseleave', () => {
            btnSave.style.boxShadow = 'none';
            btnSave.style.transform = 'translateY(0)';
        });

        actions.append(btnClean, btnSave);

        grid.append(conceptGroup, amountGroup, dateGroup, categoryGroup, cropGroup, actions);

        const advancedPanel = document.createElement('details');
        advancedPanel.className = 'advanced-panel';
        advancedPanel.id = 'income-advanced';
        advancedPanel.dataset.tab = 'ingresos';

        const advancedSummary = document.createElement('summary');
        advancedSummary.className = 'advanced-summary';
        const summaryText = document.createElement('span');
        summaryText.textContent = 'Opciones avanzadas';
        const summaryMeta = document.createElement('span');
        summaryMeta.className = 'advanced-meta';
        summaryMeta.id = 'advanced-meta-ingresos';
        const summaryChev = document.createElement('span');
        summaryChev.className = 'chev';
        summaryChev.innerHTML = '&#9662;';
        advancedSummary.append(summaryText, summaryMeta, summaryChev);

        const advancedContent = document.createElement('div');
        advancedContent.className = 'advanced-content';

        const fileGroup = document.createElement('div');
        fileGroup.className = 'input-group';
        const fileLabel = document.createElement('label');
        fileLabel.className = 'input-label';
        fileLabel.textContent = 'Evidencia (opcional)';

        const dropzone = document.createElement('div');
        dropzone.id = 'income-dropzone';
        dropzone.className = 'upload-dropzone compact-dropzone';

        const triggerBtn = document.createElement('button');
        triggerBtn.type = 'button';
        triggerBtn.className = 'evidence-trigger';
        const triggerIcon = document.createElement('span');
        triggerIcon.className = 'evidence-icon';
        triggerIcon.innerHTML = '&#128206;';
        const triggerText = document.createElement('span');
        triggerText.textContent = 'Adjuntar evidencia';
        triggerBtn.append(triggerIcon, triggerText);

        const row = document.createElement('div');
        row.className = 'evidence-row is-hidden';
        const name = document.createElement('span');
        name.className = 'evidence-name';
        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = 'evidence-view';
        viewBtn.textContent = 'Ver';
        const changeBtn = document.createElement('button');
        changeBtn.type = 'button';
        changeBtn.className = 'evidence-change';
        changeBtn.textContent = 'Cambiar';
        row.append(name, viewBtn, changeBtn);

        const hint = document.createElement('p');
        hint.className = 'evidence-hint';
        hint.textContent = 'JPG, PNG, WebP o PDF (Max. 5MB)';

        dropzone.append(triggerBtn, row, hint);

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'income-receipt';
        fileInput.accept = 'image/jpeg,image/png,image/webp,application/pdf';
        fileInput.style.display = 'none';

        fileGroup.append(fileLabel, dropzone, fileInput);
        advancedContent.appendChild(fileGroup);
        advancedPanel.append(advancedSummary, advancedContent);

        form.append(grid, advancedPanel);
    }

    if (!note) {
        note = document.createElement('div');
        note.style.cssText = 'margin-top: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-sm);';
        note.dataset.incomeNote = 'true';
        const noteText = document.createElement('p');
        noteText.style.cssText = 'color: #60a5fa; font-size: 0.8rem; margin: 0; display: flex; align-items: center; gap: 0.5rem;';
        const noteIcon = document.createElement('i');
        noteIcon.className = 'fa-solid fa-cloud-check';
        const noteSpan = document.createElement('span');
        noteSpan.textContent = 'Ingresos sincronizados en YavlGold Cloud en tiempo real.';
        noteText.append(noteIcon, noteSpan);
        note.appendChild(noteText);
    }

    if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.id = 'income-recent-container';
        listContainer.style.cssText = 'margin-top: 2rem; display: none;';
        const listTitle = document.createElement('h3');
        listTitle.style.cssText = 'color: #fff; font-size: 1.1rem; margin-bottom: 1rem; border-left: 3px solid var(--gold-primary); padding-left: 0.8rem;';
        listTitle.textContent = 'Ultimos Ingresos (Sesion Actual)';
        const list = document.createElement('div');
        list.id = 'income-list';
        list.style.cssText = 'display: flex; flex-direction: column; gap: 0.8rem;';
        listContainer.append(listTitle, list);
    }

    if (form) wrapper.appendChild(form);
    if (note) wrapper.appendChild(note);
    if (listContainer) wrapper.appendChild(listContainer);

    targetContainer.appendChild(wrapper);

    return wrapper;
}

function resetIncomeDropzone(dropzone) {
    if (!dropzone) return;
    resetCompactEvidenceDropzone(dropzone);
}

async function handleIncomeFileUpload(input, dropzone) {
    if (!input || !dropzone) return;
    const file = input.files?.[0];
    if (!file) return;

    // Use hardened validation with magic bytes
    const validation = await validateEvidenceFile(file);
    if (!validation.valid) {
        // Show neutral message (no red per Visual DNA)
        showEvidenceToast(validation.error, 'warning');
        input.value = '';
        resetIncomeDropzone(dropzone);
        return;
    }

    const ext = getFileExtension(file.name);
    const isDoc = isIncomeDocExtension(ext);
    const isImage = isIncomeImageExtension(ext) || file.type.startsWith('image/');

    if (!isDoc && !isImage) {
        alert('Tipo de archivo no permitido.');
        input.value = '';
        resetIncomeDropzone(dropzone);
        return;
    }

    openAdvancedPanelFor(dropzone);
    setCompactEvidenceDropzone(dropzone, file);
}

function clearIncomeForm() {
    const conceptInput = document.getElementById('income-concept');
    const amountInput = document.getElementById('income-amount');
    const dateInput = document.getElementById('income-date');
    const categoryInput = document.getElementById('income-category');
    const fileInput = document.getElementById('income-receipt');
    const dropzone = document.getElementById('income-dropzone');
    const btnSave = document.getElementById('income-save-btn');

    if (conceptInput) conceptInput.value = '';
    if (amountInput) amountInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if (categoryInput) categoryInput.selectedIndex = 0;
    if (fileInput) fileInput.value = '';
    resetIncomeDropzone(dropzone);

    incomeEditId = null;
    incomeEditSupportPath = null;
    if (btnSave) btnSave.textContent = 'Registrar Ingreso';
}

function enterIncomeEditMode(income) {
    if (!income) return;
    const conceptInput = document.getElementById('income-concept');
    const amountInput = document.getElementById('income-amount');
    const dateInput = document.getElementById('income-date');
    const categoryInput = document.getElementById('income-category');
    const cropInput = document.getElementById('income-crop-id');
    const btnSave = document.getElementById('income-save-btn');
    const form = document.getElementById('income-form');

    incomeEditId = income.id || null;
    incomeEditSupportPath = income.soporte_url || income.evidence_url || null;

    if (conceptInput) conceptInput.value = income.concepto || '';
    if (amountInput) amountInput.value = income.monto ?? '';
    if (dateInput) dateInput.value = income.fecha || new Date().toISOString().split('T')[0];
    if (categoryInput) categoryInput.value = income.categoria || '';
    if (cropInput) cropInput.value = income.crop_id || '';
    if (btnSave) btnSave.textContent = 'Actualizar Ingreso';

    // V9.5.1: Scroll to form + visual feedback
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        form.style.boxShadow = '0 0 0 3px var(--gold-primary, #C8A752)';
        form.style.transition = 'box-shadow 0.3s ease';
        setTimeout(() => {
            form.style.boxShadow = '';
        }, 2500);
        // Focus on concept input
        if (conceptInput) {
            setTimeout(() => conceptInput.focus(), 400);
        }
    }

    console.info('[AGRO] V9.5.1: Entered income edit mode for', income.id);
}

async function resolveIncomeSupportUrl(path) {
    return await resolveEvidenceUrl(path);
}

async function buildIncomeSignedUrlMap(incomes) {
    const map = new Map();
    const rows = Array.isArray(incomes) ? incomes : [];
    await Promise.all(rows.map(async (row) => {
        const evidenceValue = getFactureroEvidenceValue('ingresos', row);
        if (!evidenceValue) return;
        const url = await resolveIncomeSupportUrl(evidenceValue);
        if (url) map.set(row.id, url);
    }));
    return map;
}

function renderIncomeItem(listEl, income, signedUrl) {
    if (!listEl || !income) return;

    const item = document.createElement('div');
    item.className = 'income-item animate-in';
    item.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;';
    item.dataset.incomeId = income.id ? String(income.id) : '';

    const left = document.createElement('div');
    left.style.cssText = 'display: flex; align-items: center; gap: 1rem;';

    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; background: rgba(74, 222, 128, 0.12); display: flex; align-items: center; justify-content: center; color: #4ade80;';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-circle-dollar-to-slot';
    iconWrap.appendChild(icon);

    const details = document.createElement('div');

    const concept = document.createElement('div');
    concept.style.cssText = 'color: #fff; font-weight: 600; font-size: 0.95rem;';
    concept.textContent = income.concepto || 'Ingreso';

    const meta = document.createElement('div');
    meta.style.cssText = 'color: rgba(255,255,255,0.5); font-size: 0.8rem; display: flex; flex-wrap: wrap; gap: 0.5rem;';
    const category = document.createElement('span');
    category.textContent = String(income.categoria || 'otros').replace(/-/g, ' ').toUpperCase();
    const dateStr = document.createElement('span');
    dateStr.textContent = formatDate(income.fecha);
    meta.append(category, dateStr);

    if (signedUrl) {
        const evidenceLink = createEvidenceLinkElement(signedUrl);
        if (evidenceLink) {
            const supportWrap = document.createElement('span');
            supportWrap.style.display = 'inline-flex';
            supportWrap.style.alignItems = 'center';
            supportWrap.appendChild(evidenceLink);
            meta.appendChild(supportWrap);
        }
    }

    details.append(concept, meta);
    left.append(iconWrap, details);

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; align-items: center; gap: 0.6rem;';

    const amount = document.createElement('div');
    amount.style.cssText = 'color: #4ade80; font-weight: 700; font-size: 1rem;';
    amount.textContent = formatCurrency(income.monto);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-edit-facturero income-edit-btn';
    editBtn.dataset.tab = 'ingresos';
    editBtn.dataset.id = income.id ? String(income.id) : '';
    editBtn.title = 'Editar';
    editBtn.style.cssText = 'background: transparent; border: 1px solid rgba(96, 165, 250, 0.35); color: #60a5fa; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;';

    const editIcon = document.createElement('i');
    editIcon.className = 'fa-solid fa-pen';
    editIcon.style.fontSize = '0.8rem';
    editBtn.appendChild(editIcon);

    editBtn.addEventListener('mouseenter', () => {
        editBtn.style.background = 'rgba(96, 165, 250, 0.15)';
        editBtn.style.borderColor = '#60a5fa';
    });
    editBtn.addEventListener('mouseleave', () => {
        editBtn.style.background = 'transparent';
        editBtn.style.borderColor = 'rgba(96, 165, 250, 0.35)';
    });

    const duplicateBtn = document.createElement('button');
    duplicateBtn.type = 'button';
    duplicateBtn.className = 'btn-duplicate-facturero income-duplicate-btn';
    duplicateBtn.dataset.tab = 'ingresos';
    duplicateBtn.dataset.id = income.id ? String(income.id) : '';
    duplicateBtn.title = 'Duplicar a otro cultivo';
    duplicateBtn.style.cssText = 'background: transparent; border: 1px solid rgba(200, 167, 82, 0.35); color: #C8A752; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;';

    const duplicateIcon = document.createElement('i');
    duplicateIcon.className = 'fa-solid fa-copy';
    duplicateIcon.style.fontSize = '0.8rem';
    duplicateBtn.appendChild(duplicateIcon);
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'income-delete-btn';
    deleteBtn.title = 'Eliminar';
    deleteBtn.dataset.id = income.id ? String(income.id) : '';
    deleteBtn.style.cssText = 'background: transparent; border: 1px solid rgba(239, 68, 68, 0.35); color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;';

    const deleteIcon = document.createElement('i');
    deleteIcon.className = 'fa-solid fa-trash';
    deleteIcon.style.fontSize = '0.85rem';
    deleteBtn.appendChild(deleteIcon);

    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = 'rgba(239, 68, 68, 0.15)';
        deleteBtn.style.borderColor = '#ef4444';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.borderColor = 'rgba(239, 68, 68, 0.35)';
    });
    deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!window.confirm('\u00bfEliminar ingreso?')) return;
        const targetId = deleteBtn.dataset.id;
        if (!targetId) {
            alert('No se pudo identificar el ingreso.');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesion para eliminar ingresos.');
            return;
        }

        // Get income data for cascade delete of evidence
        const incomeData = incomeCache.find(i => i && String(i.id) === targetId);
        const evidencePath = getFactureroEvidenceValue('ingresos', incomeData) || null;

        // Try soft delete first
        let deleteSuccess = false;
        const { error: softError } = await supabase
            .from('agro_income')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', targetId)
            .eq('user_id', user.id);

        if (!softError) {
            deleteSuccess = true;
        } else if (softError.message && softError.message.toLowerCase().includes('deleted_at')) {
            // Fallback to hard delete if soft delete not supported
            console.warn('[Agro] Soft delete not available for income, falling back to hard delete');
            const { error: hardError } = await supabase
                .from('agro_income')
                .delete()
                .eq('id', targetId)
                .eq('user_id', user.id);

            if (!hardError) {
                deleteSuccess = true;
            } else {
                showEvidenceToast('Error al eliminar ingreso.', 'warning');
                console.error('[Agro] Income hard delete failed:', hardError.message);
            }
        } else {
            showEvidenceToast('Error al eliminar ingreso.', 'warning');
            console.error('[Agro] Income delete failed:', softError.message);
        }

        // Cascade delete evidence from Storage (best-effort)
        if (deleteSuccess && evidencePath) {
            await deleteEvidenceFile(evidencePath);
        }

        if (deleteSuccess) {
            document.dispatchEvent(new CustomEvent('agro:income:changed'));
        }
    });

    actions.append(amount, editBtn, duplicateBtn, deleteBtn);
    item.append(left, actions);
    listEl.appendChild(item);
}

async function loadIncomes() {
    const listEl = document.getElementById('income-list');
    const container = document.getElementById('income-recent-container');
    if (!listEl || !container) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
            .from('agro_income')
            .select('*')
            .eq('user_id', user.id)
            .order('fecha', { ascending: false });

        if (incomeDeletedAtSupported !== false) {
            query = query.is('deleted_at', null);
        }

        let { data, error } = await query;
        if (error && error.message && error.message.toLowerCase().includes('deleted_at')) {
            incomeDeletedAtSupported = false;
            const fallback = await supabase
                .from('agro_income')
                .select('*')
                .eq('user_id', user.id)
                .order('fecha', { ascending: false });
            data = fallback.data;
            error = fallback.error;
        } else if (!error) {
            incomeDeletedAtSupported = true;
        }

        if (error) throw error;

        incomeCache = Array.isArray(data) ? data : [];

        listEl.textContent = '';
        container.style.display = incomeCache.length ? 'block' : 'none';

        const signedUrlMap = await buildIncomeSignedUrlMap(incomeCache);
        incomeCache.forEach((income) => {
            const signedUrl = signedUrlMap.get(income.id);
            renderIncomeItem(listEl, income, signedUrl);
        });
    } catch (err) {
        console.error('[Agro] Error cargando ingresos:', err);
    }
}

async function saveIncome() {
    const conceptInput = document.getElementById('income-concept');
    const amountInput = document.getElementById('income-amount');
    const dateInput = document.getElementById('income-date');
    const categoryInput = document.getElementById('income-category');
    const fileInput = document.getElementById('income-receipt');
    const btnSave = document.getElementById('income-save-btn');

    const concept = conceptInput?.value?.trim() || '';
    const amount = amountInput?.value?.trim() || '';
    const category = categoryInput?.value || '';
    const dateVal = dateInput?.value || new Date().toISOString().split('T')[0];
    const file = fileInput?.files?.[0] || null;

    if (!concept || !amount || !category) {
        alert('Por favor completa Concepto, Monto y Categoria.');
        return;
    }

    const originalText = btnSave?.textContent || '';
    if (btnSave) {
        btnSave.textContent = 'Guardando...';
        btnSave.disabled = true;
        btnSave.style.opacity = '0.7';
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesion para guardar ingresos.');

        const isEditing = !!incomeEditId;
        const incomeId = isEditing
            ? incomeEditId
            : (crypto?.randomUUID ? crypto.randomUUID() : `inc_${Date.now()}_${Math.random().toString(16).slice(2)}`);
        let soportePath = null;

        if (file) {
            const ext = getFileExtension(file.name);
            const isDoc = isIncomeDocExtension(ext);
            const isImage = isIncomeImageExtension(ext) || file.type.startsWith('image/');
            if (!isDoc && !isImage) {
                throw new Error('Tipo de archivo no permitido.');
            }

            soportePath = buildIncomeStoragePath(user.id, incomeId, file.name);

            const { error: uploadError } = await supabase.storage
                .from(AGRO_STORAGE_BUCKET_ID)
                .upload(soportePath, file);

            if (uploadError) throw uploadError;
        }

        if (isEditing) {
            const payload = {
                concepto: concept,
                monto: parseFloat(amount),
                fecha: dateVal,
                categoria: category
            };
            if (soportePath) {
                payload.soporte_url = soportePath;
            }

            const { error: updateError } = await supabase
                .from('agro_income')
                .update(payload)
                .eq('id', incomeId)
                .eq('user_id', user.id);

            if (updateError) throw updateError;
            alert('Ingreso actualizado.');
        } else {
            // V9.5: Get crop_id from dropdown
            const incomeCropSelect = document.getElementById('income-crop-id');
            const incomeCropId = incomeCropSelect?.value || null;

            const { error: insertError } = await supabase
                .from('agro_income')
                .insert({
                    id: incomeId,
                    user_id: user.id,
                    concepto: concept,
                    monto: parseFloat(amount),
                    fecha: dateVal,
                    categoria: category,
                    soporte_url: soportePath,
                    crop_id: incomeCropId || null // V9.5
                });

            if (insertError) throw insertError;
            alert('Ingreso guardado.');
        }

        clearIncomeForm();
        document.dispatchEvent(new CustomEvent('agro:income:changed'));
    } catch (err) {
        console.error('[Agro] Error guardando ingreso:', err);
        alert(`Error al guardar: ${err.message || err}`);
    } finally {
        if (btnSave) {
            btnSave.textContent = originalText || 'Registrar Ingreso';
            btnSave.disabled = false;
            btnSave.style.opacity = '1';
        }
    }
}

function initIncomeModule() {
    if (incomeModuleInitialized) return;

    const financesSection = document.querySelector('.finances-section');
    if (!financesSection) return;

    const incomePanel = document.getElementById('tab-panel-ingresos') || financesSection;
    const section = ensureIncomeSection(incomePanel);
    if (!section) return;

    incomeModuleInitialized = true;

    const form = document.getElementById('income-form');
    const dateInput = document.getElementById('income-date');
    const fileInput = document.getElementById('income-receipt');
    const dropzone = document.getElementById('income-dropzone');
    const btnClean = document.getElementById('income-clean-btn');

    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    if (dropzone && fileInput) {
        bindCompactEvidenceControls(dropzone, fileInput);
        fileInput.addEventListener('change', () => handleIncomeFileUpload(fileInput, dropzone));
        resetIncomeDropzone(dropzone);

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('is-dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('is-dragover');
        });
        dropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropzone.classList.remove('is-dragover');
            const file = e.dataTransfer?.files?.[0];
            if (!file) return;
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            openAdvancedPanelFor(dropzone);
            await handleIncomeFileUpload(fileInput, dropzone);
        });
    }

    if (btnClean) {
        btnClean.addEventListener('click', (e) => {
            e.preventDefault();
            clearIncomeForm();
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveIncome();
        });
    }

    document.addEventListener('data-refresh', () => {
        loadIncomes();
        updateBalanceAndTopCategory();
    });
    document.addEventListener('agro:income:changed', () => {
        loadIncomes();
        updateBalanceAndTopCategory();
    });

    loadIncomes();
}

function readStoredTab() {
    try {
        const value = localStorage.getItem(FIN_TAB_STORAGE_KEY);
        return FIN_TAB_NAMES.has(value) ? value : null;
    } catch (e) {
        return null;
    }
}

function writeStoredTab(tabName) {
    try {
        localStorage.setItem(FIN_TAB_STORAGE_KEY, tabName);
    } catch (e) {
        // Ignore storage errors
    }
}

function isElementInView(el) {
    if (!el) return true;
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
}

function focusPanel(panel) {
    if (!panel) return;
    const focusable = panel.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
    const target = focusable || panel;

    if (target === panel && !panel.hasAttribute('tabindex')) {
        panel.setAttribute('tabindex', '-1');
    }

    try {
        target.focus({ preventScroll: true });
    } catch (e) {
        target.focus();
    }

    if (!isElementInView(target)) {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
}

function checkCriticalFormUniqueness() {
    const checks = ['expense-form', 'income-form'];
    checks.forEach((id) => {
        const count = document.querySelectorAll(`#${id}`).length;
        if (count !== 1) {
            console.warn(`[Agro] Duplicated form check: #${id} count=${count}`);
        }
    });
}

function syncFinanceAria(tabButtons, panels) {
    const tabList = document.querySelector('.financial-tabs');
    if (tabList) tabList.setAttribute('role', 'tablist');

    tabButtons.forEach((btn) => {
        const tabName = btn.dataset.tab;
        if (!tabName) return;
        const panelId = `tab-panel-${tabName}`;
        const panel = panels.find((item) => item.dataset.tab === tabName) || document.getElementById(panelId);

        if (!btn.id) {
            btn.id = `tab-${tabName}`;
        }
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-controls', panel?.id || panelId);

        if (panel) {
            if (!panel.id) panel.id = panelId;
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', btn.id);
        }
    });
}

function switchTab(tabName, options = {}) {
    const tabButtons = Array.from(document.querySelectorAll('.financial-tab-btn'));
    const panels = Array.from(document.querySelectorAll('.finances-section .tab-panel'));
    if (!tabName || tabButtons.length === 0 || panels.length === 0) return;

    if (!FIN_TAB_NAMES.has(tabName)) return;
    const hasPanel = panels.some((panel) => panel.dataset.tab === tabName);
    if (!hasPanel) return;

    const shouldFocus = options.focus !== false;

    tabButtons.forEach((btn) => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
        const isActive = panel.dataset.tab === tabName;
        panel.classList.toggle('is-hidden', !isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        if (isActive && shouldFocus) focusPanel(panel);
    });

    writeStoredTab(tabName);
}

function initFinanceTabs() {
    const tabButtons = Array.from(document.querySelectorAll('.financial-tab-btn'));
    const panels = Array.from(document.querySelectorAll('.finances-section .tab-panel'));
    if (tabButtons.length === 0 || panels.length === 0) return;

    syncFinanceAria(tabButtons, panels);

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            if (tabName) switchTab(tabName);
        });
    });

    const storedTab = readStoredTab();
    const initialTab = storedTab
        || tabButtons.find((btn) => btn.classList.contains('is-active'))?.dataset.tab
        || tabButtons[0].dataset.tab;
    if (initialTab) switchTab(initialTab, { focus: false });
}

function initFinanceFormHandlers() {
    const formConfigs = [
        {
            id: 'pending-form',
            table: 'agro_pending',
            label: 'Pendiente',
            fileInputId: 'pending-receipt',
            dropzoneId: 'pending-dropzone',
            storagePath: 'pending',
            buildStoragePath: buildPendingStoragePath,
            cropSelectId: 'pending-crop-id', // V9.5
            getFormData: (form) => ({
                concepto: form.querySelector('#input-concepto-pendiente')?.value?.trim(),
                monto: parseFloat(form.querySelector('#input-monto-pendiente')?.value) || 0,
                fecha: form.querySelector('#input-fecha-pendiente')?.value,
                cliente: form.querySelector('#input-cliente-pendiente')?.value?.trim() || null,
                notas: form.querySelector('#input-notas-pendiente')?.value?.trim() || null
            })
        },
        {
            id: 'loss-form',
            table: 'agro_losses',
            label: 'Pérdida',
            fileInputId: 'loss-receipt',
            dropzoneId: 'loss-dropzone',
            storagePath: 'loss',
            buildStoragePath: buildLossStoragePath,
            cropSelectId: 'loss-crop-id', // V9.5
            getFormData: (form) => ({
                concepto: form.querySelector('#input-concepto-perdida')?.value?.trim(),
                monto: parseFloat(form.querySelector('#input-monto-perdida')?.value) || 0,
                fecha: form.querySelector('#input-fecha-perdida')?.value,
                causa: form.querySelector('#input-causa-perdida')?.value?.trim() || null,
                notas: form.querySelector('#input-notas-perdida')?.value?.trim() || null
            })
        },
        {
            id: 'transfer-form',
            table: 'agro_transfers',
            label: 'Transferencia',
            fileInputId: 'transfer-receipt',
            dropzoneId: 'transfer-dropzone',
            storagePath: 'transfer',
            buildStoragePath: buildTransferStoragePath,
            cropSelectId: 'transfer-crop-id', // V9.5
            getFormData: (form) => ({
                concepto: form.querySelector('#input-concepto-transferencia')?.value?.trim(),
                monto: parseFloat(form.querySelector('#input-monto-transferencia')?.value) || 0,
                fecha: form.querySelector('#input-fecha-transferencia')?.value,
                destino: form.querySelector('#input-destino-transferencia')?.value?.trim() || null,
                notas: form.querySelector('#input-notas-transferencia')?.value?.trim() || null
            })
        }
    ];

    const today = new Date().toISOString().split('T')[0];

    formConfigs.forEach((config) => {
        const form = document.getElementById(config.id);
        if (!form || form.dataset.bound === 'true') return;
        form.dataset.bound = 'true';

        // Set default date
        const dateInput = form.querySelector('input[type="date"]');
        if (dateInput && !dateInput.value) dateInput.value = today;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn?.innerHTML;
            if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = 'Guardando...'; }

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Sesión expirada. Recarga la página.');

                const formData = config.getFormData(form);
                if (!formData.concepto || formData.monto <= 0 || !formData.fecha) {
                    throw new Error('Completa Concepto, Monto y Fecha.');
                }

                // Evidence (optional)
                let evidenceUrl = null;
                const fileInput = document.getElementById(config.fileInputId);
                const file = fileInput?.files?.[0];
                if (file) {
                    // Reuse existing validation (magic bytes + MIME + extension)
                    if (typeof window.validateEvidenceFile === 'function') {
                        const validation = await window.validateEvidenceFile(file);
                        if (!validation.valid) {
                            throw new Error(validation.reason || 'Archivo no válido.');
                        }
                    }
                    // Upload to Storage
                    const storagePath = typeof config.buildStoragePath === 'function'
                        ? config.buildStoragePath(user.id, file.name)
                        : `${user.id}/agro/${config.storagePath}/${Date.now()}_${file.name}`;
                    const uploadResult = await uploadEvidence(file, storagePath);
                    if (!uploadResult.success) {
                        throw new Error(uploadResult.error || 'Error subiendo evidencia.');
                    }
                    evidenceUrl = uploadResult.path;
                }

                // V9.5: Get crop_id from dropdown
                const cropSelect = document.getElementById(config.cropSelectId);
                const cropId = cropSelect?.value || null;

                // Insert into DB
                const insertData = {
                    user_id: user.id,
                    ...formData,
                    evidence_url: evidenceUrl,
                    crop_id: cropId || null // V9.5: Associate with crop
                };

                const { error } = await supabase.from(config.table).insert(insertData);
                if (error) throw error;

                alert(`✅ ${config.label} registrado`);
                form.reset();
                if (dateInput) dateInput.value = today; // Reset date to today
                if (fileInput) fileInput.value = '';
                if (config.dropzoneId) {
                    resetGenericDropzone(config.dropzoneId);
                    const dz = document.getElementById(config.dropzoneId);
                    updateAdvancedMetaForPanel(dz?.closest('details.advanced-panel'));
                }

                // V9.5: Refresh history for this specific tab
                const tabName = config.id.replace('-form', 's').replace('loss', 'perdida').replace('pending', 'pendiente').replace('transfer', 'transferencia');
                const tabMapping = {
                    'pendientes': 'pendientes',
                    'losss': 'perdidas',
                    'transfers': 'transferencias'
                };
                const mappedTab = tabMapping[config.id.replace('-form', 's')] || tabName;
                if (typeof window.refreshFactureroHistory === 'function') {
                    await window.refreshFactureroHistory(mappedTab);
                }

                // Refresh UI
                document.dispatchEvent(new CustomEvent('data-refresh'));

            } catch (e) {
                alert(`⚠️ ${e.message}`);
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
            }
        });

        form.addEventListener('reset', () => {
            if (config.dropzoneId) {
                resetGenericDropzone(config.dropzoneId);
                const dz = document.getElementById(config.dropzoneId);
                updateAdvancedMetaForPanel(dz?.closest('details.advanced-panel'));
            }
            const resetFileInput = document.getElementById(config.fileInputId);
            if (resetFileInput) resetFileInput.value = '';
        });
    });
}

if (typeof window !== 'undefined') {
    window.switchTab = switchTab;
}

let topIncomeCategoryCache = null;

function sumAmounts(rows, field) {
    if (!Array.isArray(rows)) return 0;
    return rows.reduce((total, row) => {
        if (row?.deleted_at) return total;
        const value = Number(row?.[field]);
        return total + (Number.isFinite(value) ? value : 0);
    }, 0);
}

function updateBalanceSummary(expenseTotal, incomeTotal) {
    const revenueEl = document.getElementById('summary-revenue');
    const costEl = document.getElementById('summary-cost');
    const profitEl = document.getElementById('summary-profit');
    const marginEl = document.getElementById('summary-margin');

    if (revenueEl) revenueEl.textContent = formatShortCurrency(incomeTotal);
    if (costEl) costEl.textContent = formatShortCurrency(expenseTotal);

    const profit = incomeTotal - expenseTotal;
    if (profitEl) {
        profitEl.textContent = formatShortCurrency(profit);
        profitEl.style.color = profit >= 0 ? '#C8A752' : '#f87171';
    }

    if (marginEl) {
        if (incomeTotal <= 0) {
            marginEl.textContent = 'N/A';
            marginEl.style.color = '#9ca3af';
        } else {
            const margin = (profit / incomeTotal) * 100;
            marginEl.textContent = `${margin.toFixed(1)}%`;
            marginEl.style.color = margin >= 0 ? '#C8A752' : '#f87171';
        }
    }
}

// ============================================================
// V9.5.3: Centro Estadistico (modal)
// ============================================================

let statsCenterActiveTab = 'kpis';

function setStatsCenterTab(tabName) {
    const modal = document.getElementById('modal-stats-center');
    if (!modal) return;

    const targetTab = tabName || 'kpis';
    statsCenterActiveTab = targetTab;

    const tabs = modal.querySelectorAll('.stats-tab');
    const panels = modal.querySelectorAll('.stats-panel');

    tabs.forEach((btn) => {
        const active = btn.dataset.tab === targetTab;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    panels.forEach((panel) => {
        const active = panel.dataset.tab === targetTab;
        panel.classList.toggle('is-active', active);
        panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    if (targetTab === 'rentabilidad') {
        if (typeof window.refreshAgroStats === 'function') {
            Promise.resolve(window.refreshAgroStats()).catch((err) => {
                console.warn('[AGRO] Stats refresh failed:', err?.message || err);
            });
        }
        requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
        });
    }
}

function openStatsCenter() {
    const modal = document.getElementById('modal-stats-center');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('stats-center-open');
    setStatsCenterTab('kpis');

    if (typeof window.refreshAgroStats === 'function') {
        Promise.resolve(window.refreshAgroStats()).catch((err) => {
            console.warn('[AGRO] Stats refresh failed:', err?.message || err);
        });
    }

    const content = modal.querySelector('.stats-center');
    const scrollBody = modal.querySelector('.stats-center-body');
    if (scrollBody) {
        scrollBody.scrollTop = 0;
    }
    if (content) {
        content.focus({ preventScroll: true });
    }
}

function closeStatsCenter() {
    const modal = document.getElementById('modal-stats-center');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('stats-center-open');
}

function initStatsCenterModal() {
    if (document.__agroStatsCenterBound) return;
    document.__agroStatsCenterBound = true;

    const modal = document.getElementById('modal-stats-center');
    const openBtn = document.getElementById('btn-open-stats-center');
    const closeBtn = document.getElementById('btn-close-stats');
    const tabs = modal?.querySelectorAll('.stats-tab') || [];

    if (!modal) return;

    if (openBtn) {
        openBtn.addEventListener('click', openStatsCenter);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeStatsCenter);
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            setStatsCenterTab(tab.dataset.tab);
        });
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeStatsCenter();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'flex') {
            closeStatsCenter();
        }
    });

    window.openStatsCenter = openStatsCenter;
    window.closeStatsCenter = closeStatsCenter;
    window.setStatsCenterTab = setStatsCenterTab;
}

function getTopIncomeCategoryFromCache(days = 365) {
    if (!Array.isArray(incomeCache) || incomeCache.length === 0) return null;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const totals = {};
    incomeCache.forEach((row) => {
        if (row?.deleted_at) return;
        const date = new Date(row?.fecha);
        if (Number.isNaN(date.getTime()) || date < cutoff) return;
        const category = String(row?.categoria || 'otros');
        const amount = Number(row?.monto);
        if (!Number.isFinite(amount)) return;
        totals[category] = (totals[category] || 0) + amount;
    });

    let topCategory = null;
    let topTotal = 0;
    Object.entries(totals).forEach(([category, total]) => {
        if (total > topTotal) {
            topTotal = total;
            topCategory = category;
        }
    });

    if (!topCategory) return null;
    return { category: topCategory, total: topTotal };
}

async function fetchTopIncomeCategory(days = 365) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffDate = cutoff.toISOString().split('T')[0];

        let query = supabase
            .from('agro_income')
            .select('categoria, monto, fecha, deleted_at')
            .eq('user_id', user.id)
            .gte('fecha', cutoffDate);

        if (incomeDeletedAtSupported !== false) {
            query = query.is('deleted_at', null);
        }

        let { data, error } = await query;
        if (error && error.message && error.message.toLowerCase().includes('deleted_at')) {
            incomeDeletedAtSupported = false;
            const fallback = await supabase
                .from('agro_income')
                .select('categoria, monto, fecha')
                .eq('user_id', user.id)
                .gte('fecha', cutoffDate);
            data = fallback.data;
            error = fallback.error;
        }

        if (error) throw error;

        incomeCache = Array.isArray(data) ? data : incomeCache;
        return getTopIncomeCategoryFromCache(days);
    } catch (err) {
        console.warn('[Agro] Top income category error:', err);
        return null;
    }
}

async function updateBalanceAndTopCategory() {
    const expenseTotal = sumAmounts(expenseCache, 'amount');
    const incomeTotal = sumAmounts(incomeCache, 'monto');

    updateBalanceSummary(expenseTotal, incomeTotal);

    let topCategory = getTopIncomeCategoryFromCache(365);
    if (!topCategory) {
        topCategory = await fetchTopIncomeCategory(365);
    }

    if (topCategory) {
        topIncomeCategoryCache = topCategory;
        document.dispatchEvent(new CustomEvent('agro:income:top-category', { detail: topCategory }));
    }
}

const AUTH_CACHE_TTL = 30000;
let cachedAuthUser = null;
let cachedAuthUserAt = 0;

function cacheAuthUser(user) {
    if (!user) return;
    cachedAuthUser = user;
    cachedAuthUserAt = Date.now();
}

function waitForAuthClient(attempt = 0) {
    if (window.AuthClient?.getSession) return Promise.resolve(window.AuthClient);
    if (attempt >= 20) return Promise.resolve(null);
    return new Promise((resolve) => {
        setTimeout(() => resolve(waitForAuthClient(attempt + 1)), 200);
    });
}

async function resolveAuthUser(authClient) {
    if (!authClient) return null;

    const now = Date.now();
    if (cachedAuthUser && (now - cachedAuthUserAt) < AUTH_CACHE_TTL) {
        return cachedAuthUser;
    }

    let session = null;
    if (typeof authClient.getSession === 'function') {
        const sessionValue = authClient.getSession();
        session = sessionValue && typeof sessionValue.then === 'function'
            ? await sessionValue
            : sessionValue;
    } else {
        session = authClient.currentSession;
    }

    const sessionUser = session?.user;
    if (sessionUser) {
        cacheAuthUser(sessionUser);
        if (sessionUser.user_metadata) return sessionUser;
    }

    if (authClient.supabase?.auth?.getUser) {
        try {
            const { data } = await authClient.supabase.auth.getUser();
            if (data?.user) {
                cacheAuthUser(data.user);
                return data.user;
            }
        } catch (err) {
            console.warn('[Agro] Auth user lookup failed:', err);
        }
    }

    return sessionUser || null;
}

async function applyHeaderIdentity() {
    const nameEl = document.querySelector('.user-profile .user-name');
    const avatarEl = document.querySelector('.user-profile .user-avatar');
    if (!nameEl && !avatarEl) return;

    const authClient = await waitForAuthClient();
    if (!authClient) return;

    const user = await resolveAuthUser(authClient);
    if (!user) return;

    const displayName = user.user_metadata?.full_name || user.email || 'Agricultor';
    if (nameEl) {
        nameEl.textContent = displayName;
    }

    const avatarUrl = user.user_metadata?.avatar_url;
    if (avatarUrl && avatarEl) {
        let img = avatarEl.querySelector('img');
        if (!img) {
            avatarEl.textContent = '';
            img = document.createElement('img');
            img.alt = displayName || 'Usuario';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            avatarEl.style.overflow = 'hidden';
            avatarEl.appendChild(img);
        }
        img.src = avatarUrl;
    }
}

function setupHeaderIdentity() {
    applyHeaderIdentity();
    window.addEventListener('auth:signed_in', applyHeaderIdentity);
    window.addEventListener('auth:initial_session', applyHeaderIdentity);
    window.addEventListener('auth:ui:updated', applyHeaderIdentity);
}

function moveFooterToEnd() {
    const footer = document.querySelector('footer, .footer, #footer');
    if (!footer) return;

    const container = document.querySelector('#app') || document.body;
    container.appendChild(footer);
    footer.style.marginTop = 'auto';
}

function injectAgroMobilePatches() {
    if (document.getElementById('agro-mobile-patches')) return;

    const style = document.createElement('style');
    style.id = 'agro-mobile-patches';
    style.textContent = `
        @media (max-width: 768px) {
            .finances-section input[type="date"],
            #expense-date,
            #income-date,
            #crop-start-date,
            #crop-harvest-date {
                font-size: 0.85rem;
                padding: 0.6rem 0.75rem;
                height: 42px;
                color: #fff;
                background: rgba(10, 10, 10, 0.85);
                border-color: rgba(200, 167, 82, 0.5);
            }

            .finances-section input[type="date"]::-webkit-calendar-picker-indicator,
            #expense-date::-webkit-calendar-picker-indicator,
            #income-date::-webkit-calendar-picker-indicator,
            #crop-start-date::-webkit-calendar-picker-indicator,
            #crop-harvest-date::-webkit-calendar-picker-indicator {
                filter: invert(1) brightness(1.2);
                opacity: 0.85;
            }

            #market-ticker-track.animate-marquee {
                animation-duration: 40s !important;
            }
        }
    `;

    document.head.appendChild(style);
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

/**
 * Inicializa el módulo Agro cuando el DOM esté listo
 */
export function initAgro() {
    console.log('[Agro] 🌾 Inicializando módulo...');

    // Inyectar CSS del modal inmediatamente para ocultarlo
    injectModalStyles();

    // Cargar cultivos
    loadCrops();
    setupCropActionListeners();

    // Vincular botón de cálculo ROI
    const calcBtn = document.querySelector('.btn-primary[onclick*="calculateROI"]');
    if (calcBtn) {
        calcBtn.removeAttribute('onclick');
        calcBtn.addEventListener('click', calculateROI);
    }
    injectRoiClearButton(calcBtn);
    setupExpenseDeleteButtons();
    setupHeaderIdentity();
    initIncomeModule();
    initFinanceTabs();
    initFinanceFormHandlers();
    initAdvancedPanels();
    populateCropDropdowns(); // V9.5: Poblar dropdowns de cultivo
    setupFactureroCrudListeners(); // V9.5.1: Event delegation para CRUD
    initFactureroHistories(); // V9.5.1: Cargar historiales al init
    initStatsCenterModal(); // V9.5.3: Centro Estadistico
    setTimeout(checkCriticalFormUniqueness, 0);
    injectAgroMobilePatches();
    updateBalanceAndTopCategory();
    setTimeout(() => {
        moveFooterToEnd();
    }, 100);

    // Habilitar Enter en inputs para calcular
    document.querySelectorAll('.styled-input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') calculateROI();
        });
    });

    console.log('[Agro] ✅ Módulo V9.5.1 inicializado');
}

// Auto-inicializar si el DOM ya está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgro);
} else {
    initAgro();
}

// ============================================================
// MODAL: NUEVO CULTIVO
// ============================================================

/**
 * Inyecta CSS del modal dinámicamente
 */
function injectModalStyles() {
    if (document.getElementById('agro-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'agro-modal-styles';
    styles.textContent = `
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 9999;
            justify-content: center;
            align-items: center;
            padding: 1rem;
        }
        .modal-overlay.active {
            display: flex;
            animation: modalFadeIn 0.3s ease;
        }
        @keyframes modalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .modal-container {
            background: rgba(26, 26, 26, 0.98);
            border: 1px solid #2a2a2a;
            border-radius: 24px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            animation: modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(200, 167, 82, 0.1);
        }
        @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #2a2a2a;
        }
        .modal-title {
            font-family: 'Orbitron', sans-serif;
            font-weight: 700;
            font-size: 1.25rem;
            color: #C8A752;
        }
        .modal-close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.4);
            font-size: 2rem;
            cursor: pointer;
            line-height: 1;
            transition: color 0.3s ease;
        }
        .modal-close:hover { color: #f87171; }
        .modal-body { padding: 1.5rem; }
        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            padding: 1.5rem;
            border-top: 1px solid #2a2a2a;
        }
        .input-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        @media (max-width: 480px) {
            .input-row { grid-template-columns: 1fr; }
        }
        .btn-cancel {
            padding: 0.75rem 1.5rem;
            background: transparent;
            color: rgba(255,255,255,0.4);
            border: 1px solid #2a2a2a;
            border-radius: 50px;
            font-family: 'Orbitron', sans-serif;
            font-weight: 600;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .btn-cancel:hover {
            border-color: #f87171;
            color: #f87171;
        }
    `;
    document.head.appendChild(styles);
}

/**
 * Abre el modal para NUEVO cultivo (limpia todo)
 */
export function openCropModal() {
    injectModalStyles();

    // Reset estado de edición
    currentEditId = null;

    // Limpiar formulario
    document.getElementById('form-new-crop')?.reset();

    // Actualizar UI del modal para modo "Nuevo"
    const modalTitle = document.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = '🌱 Nuevo Cultivo';

    const saveBtn = document.querySelector('.modal-footer .btn-primary');
    if (saveBtn) saveBtn.textContent = '🌾 Guardar Siembra';

    const modal = document.getElementById('modal-new-crop');
    if (modal) {
        modal.classList.add('active');
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('crop-start-date');
        if (startDateInput) startDateInput.value = today;

        // Focus first input
        setTimeout(() => {
            document.getElementById('crop-name')?.focus();
        }, 100);
    }
}

/**
 * Abre el modal en modo EDICIÓN con datos del cultivo
 */
export function openEditModal(id) {
    injectModalStyles();

    // Buscar cultivo en cache
    const crop = cropsCache.find(c => c.id === id);
    if (!crop) {
        console.error('[Agro] Cultivo no encontrado:', id);
        alert('Error: No se encontró el cultivo');
        return;
    }

    // Guardar ID para edición
    currentEditId = id;

    // Llenar formulario con datos existentes
    document.getElementById('crop-name').value = crop.name || '';
    document.getElementById('crop-variety').value = crop.variety || '';
    document.getElementById('crop-icon').value = crop.icon || '';
    document.getElementById('crop-area').value = crop.area_size || '';
    document.getElementById('crop-investment').value = crop.investment || '';
    document.getElementById('crop-start-date').value = crop.start_date || '';
    document.getElementById('crop-harvest-date').value = crop.expected_harvest_date || '';

    // Actualizar UI del modal para modo "Editar"
    const modalTitle = document.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = '✏️ Editar Cultivo';

    const saveBtn = document.querySelector('.modal-footer .btn-primary');
    if (saveBtn) saveBtn.textContent = '💾 Actualizar';

    // Mostrar modal
    const modal = document.getElementById('modal-new-crop');
    if (modal) {
        modal.classList.add('active');
        setTimeout(() => {
            document.getElementById('crop-name')?.focus();
        }, 100);
    }

    console.log('[Agro] ✏️ Editando cultivo:', crop.name);
}

// Exponer openEditModal a window
window.openEditModal = openEditModal;


/**
 * Cierra el modal de nuevo cultivo
 */
export function closeCropModal() {
    const modal = document.getElementById('modal-new-crop');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Guarda el nuevo cultivo en Supabase
 */
export async function saveCrop() {
    // Recoger valores del formulario
    const name = document.getElementById('crop-name')?.value?.trim();
    const variety = document.getElementById('crop-variety')?.value?.trim() || null;
    const icon = document.getElementById('crop-icon')?.value?.trim() || '🌱';
    const area = parseFloat(document.getElementById('crop-area')?.value) || 0;
    const investment = parseFloat(document.getElementById('crop-investment')?.value) || 0;
    const startDate = document.getElementById('crop-start-date')?.value || null;
    const harvestDate = document.getElementById('crop-harvest-date')?.value || null;

    // Validación
    if (!name) {
        alert('Por favor ingresa el nombre del cultivo');
        document.getElementById('crop-name')?.focus();
        return;
    }
    if (area <= 0) {
        alert('Por favor ingresa el área en hectáreas');
        document.getElementById('crop-area')?.focus();
        return;
    }
    if (!startDate) {
        alert('Por favor selecciona la fecha de siembra');
        document.getElementById('crop-start-date')?.focus();
        return;
    }

    // Datos del cultivo
    const cropData = {
        name: name,
        variety: variety,
        icon: icon,
        area_size: area,
        investment: investment,
        start_date: startDate,
        expected_harvest_date: harvestDate
    };

    try {
        const { data: userData } = await supabase.auth.getUser();

        if (userData?.user?.id) {
            // --- MODO SUPABASE ---
            let result;
            if (currentEditId) {
                // UPDATE
                result = await supabase
                    .from('agro_crops')
                    .update(cropData)
                    .eq('id', currentEditId)
                    .select();
            } else {
                // INSERT
                result = await supabase
                    .from('agro_crops')
                    .insert([{
                        ...cropData,
                        user_id: userData.user.id,
                        status: 'growing',
                        progress: 0
                    }])
                    .select();
            }
            if (result.error) throw result.error;

        } else {
            // --- MODO LOCALSTORAGE ---
            console.log('[Agro] Guardando en LocalStorage...');
            let localCrops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');

            if (currentEditId) {
                // UPDATE
                const index = localCrops.findIndex(c => c.id === currentEditId);
                if (index !== -1) {
                    localCrops[index] = { ...localCrops[index], ...cropData };
                }
            } else {
                // INSERT
                const newCrop = {
                    id: crypto.randomUUID(),
                    ...cropData,
                    status: 'growing',
                    progress: 0,
                    created_at: new Date().toISOString()
                };
                localCrops.push(newCrop);
            }
            localStorage.setItem('yavlgold_agro_crops', JSON.stringify(localCrops));
        }

        // Éxito
        document.getElementById('form-new-crop')?.reset();
        currentEditId = null;
        closeCropModal();
        await loadCrops(); // Esto actualizará también las estadísticas
        console.log('[Agro] 🌱 Operación completada exitosamente');

    } catch (err) {
        console.error('[Agro] Error guardando cultivo:', err);
        alert('Error al guardar el cultivo: ' + (err.message || 'Error desconocido'));
    }
}

// Exponer funciones al scope global para onclick handlers
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;
// NOTE: saveCrop is now defined in index.html with DATE VALIDATION
// window.saveCrop = saveCrop; // DISABLED - use index.html version with date validation

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCropModal();
    }
});

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal-new-crop');
    if (e.target === modal) {
        closeCropModal();
    }
});

// ============================================================
// ELIMINAR CULTIVO
// ============================================================

/**
 * Elimina un cultivo de Supabase con confirmación
 */
async function deleteCrop(id) {
    if (!confirm('⚠️ ¿Estás seguro de que quieres eliminar este cultivo?\n\nEsta acción no se puede deshacer.')) {
        return;
    }

    try {
        const { data: userData } = await supabase.auth.getUser();

        if (userData?.user?.id) {
            // Eliminar de Supabase
            const { error } = await supabase.from('agro_crops').delete().eq('id', id);
            if (error) throw error;
        } else {
            // Eliminar de LocalStorage
            let localCrops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
            localCrops = localCrops.filter(c => c.id !== id);
            localStorage.setItem('yavlgold_agro_crops', JSON.stringify(localCrops));
        }

        console.log('[Agro] 🗑️ Cultivo eliminado:', id);
        await loadCrops(); // Actualiza UI y gráficas

    } catch (err) {
        console.error('[Agro] Error eliminando cultivo:', err);
        alert('Error al eliminar: ' + (err.message || 'Error desconocido'));
    }
}

// Exponer deleteCrop al scope global
window.deleteCrop = deleteCrop;

// Inyectar CSS para botón de eliminar
(function injectDeleteButtonStyles() {
    if (document.getElementById('agro-delete-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'agro-delete-styles';
    styles.textContent = `
        .btn-delete-crop {
            width: 32px;
            height: 32px;
            background: rgba(248, 113, 113, 0.1);
            border: 1px solid rgba(248, 113, 113, 0.3);
            border-radius: 50%;
            color: #f87171;
            font-size: 1rem;
            line-height: 1;
            cursor: pointer;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 10;
        }
        .crop-card {
            position: relative;
        }
        .crop-card:hover .btn-delete-crop {
            opacity: 1;
        }
        .btn-delete-crop:hover {
            background: #f87171;
            color: #0a0a0a;
            transform: scale(1.1);
        }
        .crop-card-actions {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            display: flex;
            gap: 0.5rem;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 10;
        }
        .crop-card:hover .crop-card-actions {
            opacity: 1;
        }
        .btn-edit-crop {
            width: 28px;
            height: 28px;
            background: rgba(200, 167, 82, 0.1);
            border: 1px solid rgba(200, 167, 82, 0.3);
            border-radius: 50%;
            font-size: 0.9rem;
            line-height: 1;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .btn-edit-crop:hover {
            background: #C8A752;
            transform: scale(1.1);
        }
    `;
    document.head.appendChild(styles);
})();
