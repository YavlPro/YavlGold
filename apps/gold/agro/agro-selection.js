const ROW_SELECTOR = '.tx-card[data-row-selectable="1"]';
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, summary, [role="button"], [contenteditable="true"]';
const PAGADOS_VIEW_RENDERED_EVENT = 'agro:pagados:view-rendered';

function getSelectionStatusNode() {
    if (typeof document !== 'undefined' && document.body?.dataset?.agroActiveView === 'pagados') {
        return document.getElementById('pagados-dedicated-selection-status')
            || document.getElementById('ops-selection-status');
    }
    return document.getElementById('ops-selection-status');
}

function getRowLabel(row) {
    if (!row) return '';
    const explicit = String(row.dataset.rowLabel || '').trim();
    if (explicit) return explicit;
    const title = row.querySelector('.tx-client')?.textContent || '';
    return String(title).trim();
}

function updateSelectionStatus(row) {
    const statusNode = getSelectionStatusNode();
    if (!statusNode) return;
    const isPagadosDedicated = statusNode.id === 'pagados-dedicated-selection-status';
    if (!row) {
        statusNode.textContent = isPagadosDedicated
            ? 'Selecciona un pagado para ver Editar, Transferir o Eliminar.'
            : 'Selecciona un movimiento del historial para ver sus acciones rápidas.';
        return;
    }

    const label = getRowLabel(row) || 'Registro';
    statusNode.textContent = isPagadosDedicated
        ? `${label} seleccionado. Toca ⋮ para Editar, Transferir o Eliminar.`
        : `${label} seleccionado. Acciones disponibles en esta tarjeta.`;
}

function markRowSelected(row, selected) {
    if (!row) return;
    row.classList.toggle('is-selected', selected);
    row.setAttribute('aria-pressed', selected ? 'true' : 'false');
}

export function initFactureroSelection() {
    let selectedRow = null;

    const clearSelection = () => {
        if (selectedRow) {
            markRowSelected(selectedRow, false);
        }
        selectedRow = null;
        updateSelectionStatus(null);
    };

    const selectRow = (row) => {
        if (!row || !row.matches(ROW_SELECTOR)) return;
        if (selectedRow === row && row.classList.contains('is-selected')) {
            updateSelectionStatus(row);
            return;
        }
        if (selectedRow && selectedRow !== row) {
            markRowSelected(selectedRow, false);
        }
        selectedRow = row;
        markRowSelected(selectedRow, true);
        updateSelectionStatus(selectedRow);
    };

    document.addEventListener('click', (event) => {
        const row = event.target.closest(ROW_SELECTOR);
        if (!row) {
            if (!event.target.closest('.tx-actions-btns')) {
                clearSelection();
            }
            return;
        }

        selectRow(row);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            clearSelection();
            return;
        }

        const row = event.target.closest(ROW_SELECTOR);
        if (!row) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.target.closest(INTERACTIVE_SELECTOR) && event.target !== row) return;
        event.preventDefault();
        selectRow(row);
    });

    window.addEventListener('agro:finance-tab:changed', clearSelection);
    window.addEventListener('agro:crop:changed', clearSelection);
    document.addEventListener('data-refresh', clearSelection);
    document.addEventListener(PAGADOS_VIEW_RENDERED_EVENT, clearSelection);

    updateSelectionStatus(null);

    return {
        clearSelection,
        getSelectedRow: () => selectedRow
    };
}
