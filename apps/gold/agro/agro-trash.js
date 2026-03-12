// ============================================================
// agro-trash.js — Papelera de registros eliminados
// Módulo nuevo (AGENTS.md §3.1: features nuevas fuera de agro.js)
// Depende de window._agroTrash expuesto por agro.js
// ============================================================

import { supabase } from '../assets/js/config/supabase-config.js';

const TAB_LABELS = Object.freeze({
    gastos: 'Gastos',
    ingresos: 'Pagados',
    pendientes: 'Fiados',
    perdidas: 'Pérdidas',
    transferencias: 'Donaciones'
});

const TRASH_TABS = Object.keys(TAB_LABELS);

let trashOverlay = null;

function getApi() {
    return window._agroTrash || null;
}

function formatDeletedDate(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'hace un momento';
        if (diffMin < 60) return `hace ${diffMin} min`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `hace ${diffH}h`;
        const diffD = Math.floor(diffH / 24);
        if (diffD === 1) return 'ayer';
        if (diffD < 30) return `hace ${diffD} días`;
        return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    } catch {
        return '';
    }
}

function formatAmount(val) {
    const n = Number(val);
    if (!n && n !== 0) return '';
    return n.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
    return String(str ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

async function fetchAllDeletedItems() {
    const api = getApi();
    if (!api) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const results = await Promise.all(
        TRASH_TABS.map(tab => api.fetchDeletedFactureroItems(tab, user.id, 30))
    );

    const all = results.flat();
    all.sort((a, b) => {
        const da = a.deleted_at || '';
        const db = b.deleted_at || '';
        return db.localeCompare(da);
    });
    return all;
}

function renderTrashItem(item) {
    const api = getApi();
    const row = document.createElement('div');
    row.className = 'agro-trash-item';

    const tabName = item._tab || '';
    const config = api?.FACTURERO_CONFIG?.[tabName];
    const conceptField = config?.conceptField || 'concepto';
    const amountField = config?.amountField || 'monto';

    const concept = String(item[conceptField] || item.concepto || item.concept || 'Sin concepto');
    const amount = item[amountField] ?? item.monto ?? item.amount ?? 0;

    const info = document.createElement('div');
    info.className = 'agro-trash-item-info';

    const conceptEl = document.createElement('div');
    conceptEl.className = 'agro-trash-item-concept';
    conceptEl.textContent = concept;

    const meta = document.createElement('div');
    meta.className = 'agro-trash-item-meta';

    const tabBadge = document.createElement('span');
    tabBadge.className = 'agro-trash-item-tab';
    tabBadge.textContent = TAB_LABELS[tabName] || tabName;

    const amountEl = document.createElement('span');
    amountEl.textContent = `$${formatAmount(amount)}`;

    const dateEl = document.createElement('span');
    dateEl.textContent = formatDeletedDate(item.deleted_at);

    meta.append(tabBadge, amountEl, dateEl);
    info.append(conceptEl, meta);

    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.className = 'agro-trash-restore-btn';
    restoreBtn.textContent = 'Restaurar';

    restoreBtn.addEventListener('click', async () => {
        if (restoreBtn.disabled) return;
        restoreBtn.disabled = true;
        restoreBtn.textContent = '...';

        const ok = await api.restoreFactureroItem(tabName, item.id);
        if (ok) {
            row.style.opacity = '0.3';
            row.style.transition = 'opacity 0.3s ease';
            restoreBtn.textContent = 'Listo';
            await api.refreshFactureroAfterChange(tabName);
            document.dispatchEvent(new CustomEvent('data-refresh'));
            setTimeout(() => row.remove(), 600);

            // Check if body is now empty
            setTimeout(() => {
                const body = trashOverlay?.querySelector('.agro-trash-body');
                if (body && body.children.length === 0) {
                    body.innerHTML = '<div class="agro-trash-empty">No hay registros eliminados en los últimos 30 días.</div>';
                }
            }, 700);
        } else {
            restoreBtn.disabled = false;
            restoreBtn.textContent = 'Error';
            setTimeout(() => { restoreBtn.textContent = 'Restaurar'; }, 1500);
        }
    });

    row.append(info, restoreBtn);
    return row;
}

function closeTrashModal() {
    if (!trashOverlay) return;
    trashOverlay.style.opacity = '0';
    trashOverlay.style.transition = 'opacity 0.2s ease';
    setTimeout(() => {
        trashOverlay?.remove();
        trashOverlay = null;
    }, 200);
}

export async function openTrashModal() {
    if (trashOverlay) {
        closeTrashModal();
        return;
    }

    trashOverlay = document.createElement('div');
    trashOverlay.className = 'agro-trash-overlay';

    const modal = document.createElement('div');
    modal.className = 'agro-trash-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'agro-trash-header';

    const title = document.createElement('h3');
    title.textContent = 'Papelera';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'agro-trash-close';
    closeBtn.innerHTML = '<i class="fa fa-xmark"></i>';
    closeBtn.addEventListener('click', closeTrashModal);

    header.append(title, closeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'agro-trash-body';

    const loadingEl = document.createElement('div');
    loadingEl.className = 'agro-trash-empty';
    loadingEl.textContent = 'Cargando...';
    body.appendChild(loadingEl);

    modal.append(header, body);
    trashOverlay.appendChild(modal);

    // Close on overlay click
    trashOverlay.addEventListener('click', (e) => {
        if (e.target === trashOverlay) closeTrashModal();
    });

    // Close on Escape
    const handleKey = (e) => {
        if (e.key === 'Escape') {
            closeTrashModal();
            document.removeEventListener('keydown', handleKey);
        }
    };
    document.addEventListener('keydown', handleKey);

    document.body.appendChild(trashOverlay);

    // Fetch data
    try {
        const items = await fetchAllDeletedItems();
        body.textContent = '';

        if (items.length === 0) {
            body.innerHTML = '<div class="agro-trash-empty">No hay registros eliminados en los últimos 30 días.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            fragment.appendChild(renderTrashItem(item));
        });
        body.appendChild(fragment);
    } catch (err) {
        console.error('[AGRO-TRASH] Error loading deleted items:', err);
        body.textContent = '';
        body.innerHTML = '<div class="agro-trash-empty">Error al cargar la papelera.</div>';
    }
}

// Expose for inline scripts
window.openAgroTrashModal = openTrashModal;

export default { openTrashModal };
