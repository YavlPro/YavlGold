const STORAGE_KEY = 'YG_AGRO_SHELL_FAVORITES_V1';
const MAX_VISIBLE_FAVORITES = 5;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function readFavoriteIds() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
    } catch (_err) {
        return [];
    }
}

function writeFavoriteIds(ids) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (_err) {
        // Ignore storage failures; favorites remain runtime-only in that case.
    }
}

function iconMarkup(entry) {
    const iconClass = String(entry.iconClass || '').trim();
    if (!iconClass) {
        return '<i class="fa-solid fa-location-dot" aria-hidden="true"></i>';
    }
    return `<i class="${escapeHtml(iconClass)}" aria-hidden="true"></i>`;
}

function normalizeFavoriteIds(ids, entriesById) {
    const seen = new Set();
    return ids.filter((id) => {
        if (!entriesById.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

function setToggleState(toggle, entry, isFavorite) {
    if (!toggle) return;
    toggle.classList.toggle('is-active', isFavorite);
    toggle.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
    toggle.setAttribute(
        'aria-label',
        `${isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}: ${entry.label}`
    );
    toggle.title = isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito';
    toggle.innerHTML = `<i class="${isFavorite ? 'fa-solid' : 'fa-regular'} fa-star" aria-hidden="true"></i>`;
}

function ensureFavoriteRow(entry, favoriteIds, onToggle) {
    if (!entry?.element || entry.element.closest('.agro-shell-fav-row')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'agro-shell-fav-row';
    wrapper.dataset.agroShellEntryId = entry.id;
    if (entry.modeScope) {
        wrapper.dataset.agroModeScope = entry.modeScope;
    }

    entry.element.parentNode.insertBefore(wrapper, entry.element);
    wrapper.appendChild(entry.element);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'agro-shell-favorite-toggle';
    toggle.dataset.agroShellFavoriteToggle = entry.id;
    toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle(entry.id);
    });

    wrapper.appendChild(toggle);
    entry.favoriteToggle = toggle;
    entry.wrapper = wrapper;
    setToggleState(toggle, entry, favoriteIds.includes(entry.id));
}

function renderFavoriteBlock(root, favoriteIds, entriesById, onActivate) {
    if (!root) return;

    const favoriteEntries = favoriteIds
        .map((id) => entriesById.get(id))
        .filter(Boolean)
        .slice(0, MAX_VISIBLE_FAVORITES);

    root.hidden = favoriteEntries.length === 0;
    root.innerHTML = '';

    if (favoriteEntries.length === 0) return;

    const title = document.createElement('div');
    title.className = 'agro-shell-favorites__head';
    title.innerHTML = `
        <span class="agro-shell-favorites__title">
            <i class="fa-solid fa-star" aria-hidden="true"></i>
            <span>Favoritos</span>
        </span>
        <span class="agro-shell-favorites__meta">${favoriteEntries.length}/${MAX_VISIBLE_FAVORITES}</span>
    `;

    const list = document.createElement('div');
    list.className = 'agro-shell-favorites__list';
    favoriteEntries.forEach((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'agro-shell-favorite-link';
        button.innerHTML = `
            <span class="agro-shell-favorite-link__icon">${iconMarkup(entry)}</span>
            <span class="agro-shell-favorite-link__label">${escapeHtml(entry.label)}</span>
        `;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            onActivate(entry);
        });
        list.appendChild(button);
    });

    root.append(title, list);
}

export function initAgroShellFavorites({ root, entries, onActivate } = {}) {
    if (!Array.isArray(entries) || typeof onActivate !== 'function') return null;

    const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
    let favoriteIds = normalizeFavoriteIds(readFavoriteIds(), entriesById);
    writeFavoriteIds(favoriteIds);

    const sync = () => {
        entries.forEach((entry) => {
            setToggleState(entry.favoriteToggle, entry, favoriteIds.includes(entry.id));
        });
        renderFavoriteBlock(root, favoriteIds, entriesById, onActivate);
    };

    const toggleFavorite = (id) => {
        const isFavorite = favoriteIds.includes(id);
        favoriteIds = isFavorite
            ? favoriteIds.filter((entryId) => entryId !== id)
            : [id, ...favoriteIds.filter((entryId) => entryId !== id)];
        writeFavoriteIds(favoriteIds);
        sync();
    };

    entries.forEach((entry) => ensureFavoriteRow(entry, favoriteIds, toggleFavorite));
    sync();

    return {
        getFavorites: () => [...favoriteIds],
        clearFavorites: () => {
            favoriteIds = [];
            writeFavoriteIds(favoriteIds);
            sync();
        }
    };
}
