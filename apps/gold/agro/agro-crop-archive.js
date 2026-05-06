const ARCHIVE_TAB_ARCHIVED = 'archivados';
const ARCHIVE_TAB_DELETED = 'eliminados';

function normalizeCropId(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function formatDate(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
}

function getCropName(crop) {
    return String(crop?.name || crop?.nombre || 'Cultivo').trim() || 'Cultivo';
}

function getCropIcon(crop) {
    return String(crop?.icon || '').trim() || 'C';
}

function buildButton({ action, cropId, label, icon, variant = '' }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn crop-archive-action${variant ? ` ${variant}` : ''}`;
    button.dataset.cropArchiveAction = action;
    button.dataset.cropId = cropId;

    if (icon) {
        const iconEl = document.createElement('i');
        iconEl.className = icon;
        iconEl.setAttribute('aria-hidden', 'true');
        button.appendChild(iconEl);
    }

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    button.appendChild(labelEl);
    return button;
}

function buildCropCard(crop, mode) {
    const cropId = normalizeCropId(crop?.id);
    const card = document.createElement('article');
    card.className = 'card crop-card agro-crop-archive-card';
    if (cropId) card.dataset.cropId = cropId;

    const header = document.createElement('div');
    header.className = 'agro-crop-archive-card__header';

    const icon = document.createElement('div');
    icon.className = 'crop-icon';
    icon.textContent = getCropIcon(crop);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'agro-crop-archive-card__title';

    const title = document.createElement('h3');
    title.textContent = getCropName(crop);

    const badge = document.createElement('span');
    badge.className = `crop-status ${mode === ARCHIVE_TAB_DELETED ? 'status-lost' : 'status-finished'}`;
    badge.textContent = mode === ARCHIVE_TAB_DELETED ? 'En papelera' : 'Archivado';

    titleWrap.append(title, badge);
    header.append(icon, titleWrap);

    const meta = document.createElement('p');
    meta.className = 'crop-meta-subline is-muted';
    meta.textContent = mode === ARCHIVE_TAB_DELETED
        ? `Movido a papelera: ${formatDate(crop?.deleted_at)}`
        : `Archivado: ${formatDate(crop?.archived_at)}`;

    const actions = document.createElement('div');
    actions.className = 'agro-crop-archive-card__actions';

    actions.appendChild(buildButton({
        action: 'details',
        cropId,
        label: 'Ver detalles',
        icon: 'fa-solid fa-chart-bar'
    }));
    actions.appendChild(buildButton({
        action: 'restore',
        cropId,
        label: 'Restaurar',
        icon: 'fa-solid fa-rotate-left',
        variant: 'is-primary'
    }));

    if (mode === ARCHIVE_TAB_ARCHIVED) {
        actions.appendChild(buildButton({
            action: 'trash',
            cropId,
            label: 'Mover a papelera',
            icon: 'fa-solid fa-trash',
            variant: 'is-danger'
        }));
    }

    card.append(header, meta, actions);
    return card;
}

function buildEmptyState(text) {
    const empty = document.createElement('div');
    empty.className = 'agro-crop-archive-empty';
    const icon = document.createElement('i');
    icon.className = 'fa-regular fa-folder-open';
    icon.setAttribute('aria-hidden', 'true');
    const message = document.createElement('p');
    message.textContent = text;
    empty.append(icon, message);
    return empty;
}

function bindRoot(root) {
    if (root.__agroCropArchiveBound) return;
    root.__agroCropArchiveBound = true;
    root.addEventListener('click', (event) => {
        const tabButton = event.target.closest('[data-agro-crop-archive-tab]');
        if (tabButton && root.contains(tabButton)) {
            event.preventDefault();
            root.dataset.activeArchiveTab = tabButton.dataset.agroCropArchiveTab || ARCHIVE_TAB_ARCHIVED;
            renderCropArchiveTrash(root, root.__agroCropArchiveOptions || {});
            return;
        }

        const actionButton = event.target.closest('[data-crop-archive-action]');
        if (!actionButton || !root.contains(actionButton)) return;
        event.preventDefault();
        const cropId = normalizeCropId(actionButton.dataset.cropId);
        const action = actionButton.dataset.cropArchiveAction;
        const callbacks = root.__agroCropArchiveCallbacks || {};
        if (!cropId || typeof callbacks[action] !== 'function') return;
        callbacks[action](cropId);
    });
}

export function renderCropArchiveTrash(root, options = {}) {
    if (!root) return;
    const archivedCrops = Array.isArray(options.archivedCrops) ? options.archivedCrops : [];
    const deletedCrops = Array.isArray(options.deletedCrops) ? options.deletedCrops : [];
    root.__agroCropArchiveOptions = options;
    root.__agroCropArchiveCallbacks = options.callbacks || {};
    bindRoot(root);

    const activeTab = root.dataset.activeArchiveTab === ARCHIVE_TAB_DELETED
        ? ARCHIVE_TAB_DELETED
        : ARCHIVE_TAB_ARCHIVED;

    root.textContent = '';

    const tabs = document.createElement('div');
    tabs.className = 'agro-crop-archive-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Archivo y Papelera de cultivos');

    [
        { id: ARCHIVE_TAB_ARCHIVED, label: `Archivados (${archivedCrops.length})` },
        { id: ARCHIVE_TAB_DELETED, label: `Eliminados (${deletedCrops.length})` }
    ].forEach((tab) => {
        const button = document.createElement('button');
        const isActive = tab.id === activeTab;
        button.type = 'button';
        button.className = `agro-internal-tab${isActive ? ' is-active' : ''}`;
        button.dataset.agroCropArchiveTab = tab.id;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        button.textContent = tab.label;
        tabs.appendChild(button);
    });

    const grid = document.createElement('div');
    grid.className = 'crops-grid agro-crop-archive-grid';
    const rows = activeTab === ARCHIVE_TAB_DELETED ? deletedCrops : archivedCrops;
    const emptyText = activeTab === ARCHIVE_TAB_DELETED
        ? 'No tienes cultivos en papelera.'
        : 'No tienes cultivos archivados.';

    if (rows.length === 0) {
        grid.appendChild(buildEmptyState(emptyText));
    } else {
        rows.forEach((crop) => {
            grid.appendChild(buildCropCard(crop, activeTab));
        });
    }

    root.append(tabs, grid);
}
