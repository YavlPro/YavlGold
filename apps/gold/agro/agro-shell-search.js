const MAX_RESULTS = 7;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function iconMarkup(entry) {
    const iconClass = String(entry.iconClass || '').trim();
    if (!iconClass) {
        return '<i class="fa-solid fa-location-dot" aria-hidden="true"></i>';
    }
    return `<i class="${escapeHtml(iconClass)}" aria-hidden="true"></i>`;
}

function entrySearchText(entry) {
    return normalizeText([
        entry.label,
        entry.groupLabel,
        entry.contextLabel,
        entry.modeScope,
        ...(entry.keywords || [])
    ].join(' '));
}

function scoreEntry(entry, query) {
    const label = normalizeText(entry.label);
    const text = entrySearchText(entry);
    const terms = query.split(/\s+/).filter(Boolean);

    if (!terms.length) return 0;
    if (label === query) return 120;
    if (label.startsWith(query)) return 100;
    if (text.split(/\s+/).some((word) => word.startsWith(query))) return 82;
    if (text.includes(query)) return 70;
    if (terms.every((term) => text.includes(term))) return 55;
    return 0;
}

function searchEntries(entries, query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    return entries
        .map((entry) => ({ entry, score: scoreEntry(entry, normalizedQuery) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
        .slice(0, MAX_RESULTS)
        .map((item) => item.entry);
}

function setExpanded(input, expanded) {
    input?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function renderResults({ input, panel, entries, query, onActivate }) {
    const value = String(query || '');
    const results = searchEntries(entries, value);

    panel.innerHTML = '';
    panel.hidden = false;
    setExpanded(input, true);

    if (!normalizeText(value)) {
        panel.hidden = true;
        setExpanded(input, false);
        return;
    }

    if (!results.length) {
        const empty = document.createElement('p');
        empty.className = 'agro-shell-search__empty';
        empty.textContent = 'Sin coincidencias en el shell';
        panel.appendChild(empty);
        return;
    }

    results.forEach((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'agro-shell-search__result';
        button.innerHTML = `
            <span class="agro-shell-search__result-icon">${iconMarkup(entry)}</span>
            <span class="agro-shell-search__result-body">
                <strong>${escapeHtml(entry.label)}</strong>
                <small>${escapeHtml(entry.contextLabel || entry.groupLabel || 'Shell Agro')}</small>
            </span>
        `;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            onActivate(entry);
            panel.hidden = true;
            setExpanded(input, false);
        });
        panel.appendChild(button);
    });
}

export function initAgroShellSearch({ root, entries, onActivate } = {}) {
    if (!root || !Array.isArray(entries) || typeof onActivate !== 'function') return null;

    const input = root.querySelector('[data-agro-shell-search-input]');
    const panel = root.querySelector('[data-agro-shell-search-panel]');
    const clearButton = root.querySelector('[data-agro-shell-search-clear]');
    if (!input || !panel) return null;

    const refresh = () => {
        const hasValue = normalizeText(input.value).length > 0;
        clearButton?.toggleAttribute('hidden', !hasValue);
        renderResults({ input, panel, entries, query: input.value, onActivate });
    };

    input.addEventListener('input', refresh);
    input.addEventListener('focus', () => {
        if (normalizeText(input.value)) refresh();
    });
    input.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        panel.hidden = true;
        setExpanded(input, false);
    });

    clearButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        input.value = '';
        panel.hidden = true;
        setExpanded(input, false);
        clearButton.hidden = true;
        input.focus();
    });

    document.addEventListener('click', (event) => {
        if (root.contains(event.target)) return;
        panel.hidden = true;
        setExpanded(input, false);
    });

    panel.hidden = true;
    setExpanded(input, false);

    return {
        search: (query) => searchEntries(entries, query),
        clear: () => {
            input.value = '';
            panel.hidden = true;
            setExpanded(input, false);
            clearButton?.setAttribute('hidden', '');
        }
    };
}
