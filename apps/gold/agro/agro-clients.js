const ROOT_ID = 'agro-clients-root';
const VIEW_NAME = 'clients';
const VIEW_CHANGED_EVENT = 'agro:shell:view-changed';
const CLIENTS_CHANGED_EVENT = 'agro:clients:changed';
const CLIENTS_TABLE = 'agro_clients';
const BUYERS_TABLE = 'agro_buyers';
const CLIENTS_SCHEMA_MISSING_COPY = 'Aplica la migración de Mis Clientes para habilitar esta libreta.';

const BUYER_CLIENT_SELECT = [
    'id',
    'display_name',
    'phone',
    'whatsapp',
    'notes',
    'linked_user_id'
].join(',');

const CLIENT_SELECT = [
    'id',
    'user_id',
    'client_type',
    'linked_profile_id',
    'display_name',
    'phone',
    'whatsapp',
    'email',
    'location',
    'notes',
    'tags',
    'created_at',
    'updated_at',
    'deleted_at'
].join(',');

const FILTER_OPTIONS = Object.freeze([
    { value: 'all', label: 'Todos' },
    { value: 'registered', label: 'Con cuenta YavlGold' },
    { value: 'external', label: 'No registrados' }
]);

const SORT_OPTIONS = Object.freeze([
    { value: 'az', label: 'A-Z' },
    { value: 'za', label: 'Z-A' },
    { value: 'recent', label: 'Recientes' }
]);

const TYPE_META = Object.freeze({
    registered: Object.freeze({
        label: 'Con cuenta YavlGold',
        badgeClass: 'agro-clients-badge--registered'
    }),
    external: Object.freeze({
        label: 'No registrado en YavlGold',
        badgeClass: 'agro-clients-badge--external'
    }),
    'external-cartera': Object.freeze({
        label: 'No registrado en YavlGold',
        badgeClass: 'agro-clients-badge--external',
        sourceLabel: 'Cartera Viva'
    })
});

const collator = new Intl.Collator('es', {
    numeric: true,
    sensitivity: 'base'
});

const state = {
    root: null,
    refs: null,
    initialized: false,
    currentView: '',
    userId: '',
    initialUserId: '',
    clients: [],
    loading: false,
    loadedOnce: false,
    saving: false,
    schemaMissing: false,
    modalOpen: false,
    modalMode: 'create',
    editId: '',
    filter: 'all',
    sort: 'az',
    search: '',
    pageFeedback: { message: '', tone: 'info' },
    modalFeedback: { message: '', tone: 'info' },
    form: createFormState()
};

function createFormState(overrides = {}) {
    return {
        displayName: '',
        clientType: 'external',
        phone: '',
        whatsapp: '',
        email: '',
        location: '',
        tags: '',
        notes: '',
        ...overrides
    };
}

function normalizeId(value) {
    return String(value || '').trim();
}

function normalizeToken(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function normalizeClientType(value) {
    const token = normalizeToken(value);
    if (token === 'registered') return 'registered';
    if (token === 'external-cartera') return 'external-cartera';
    return 'external';
}

function normalizeFilter(value) {
    const type = normalizeClientType(value);
    return normalizeToken(value) === 'all' ? 'all' : type;
}

function filterGroupForType(clientType) {
    const t = normalizeClientType(clientType);
    if (t === 'registered') return 'registered';
    return 'external';
}

function normalizeSort(value) {
    const token = normalizeToken(value);
    return SORT_OPTIONS.some((option) => option.value === token) ? token : 'az';
}

export function canonicalizeClientName(value) {
    return normalizeToken(value).replace(/\s+/g, ' ');
}

export function parseClientTags(value) {
    const source = Array.isArray(value) ? value.join(',') : String(value || '');
    const seen = new Set();
    return source
        .split(/[,;|]+/)
        .map((tag) => tag.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
        .filter((tag) => {
            const key = normalizeToken(tag);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 8);
}

function formatTagsInput(tags) {
    return parseClientTags(tags).join(', ');
}

function buildBuyerDerivedKey(buyer) {
    const name = canonicalizeClientName(buyer?.display_name || '');
    const phone = normalizeToken(buyer?.phone || '');
    const whatsapp = normalizeToken(buyer?.whatsapp || '');
    return [name, phone, whatsapp].filter(Boolean).join('|');
}

function mapBuyerToDerivedClient(buyer) {
    const hasLinkedAccount = Boolean(buyer?.linked_user_id);
    return {
        id: `buyer:${normalizeId(buyer.id)}`,
        _source: 'cartera-viva',
        _buyerId: normalizeId(buyer.id),
        client_type: hasLinkedAccount ? 'registered' : 'external-cartera',
        display_name: buyer.display_name || '',
        phone: buyer.phone || '',
        whatsapp: buyer.whatsapp || '',
        email: '',
        location: '',
        notes: buyer.notes || '',
        tags: [],
        created_at: buyer.created_at || '',
        updated_at: buyer.updated_at || '',
        deleted_at: null
    };
}

function mergeClientsWithBuyers(clients, buyers) {
    const seenKeys = new Set();
    const seenIds = new Set();
    const merged = [];
    const clientTypeOrder = { registered: 0, 'external-cartera': 1, external: 1 };

    for (const client of clients) {
        if (client?.deleted_at) continue;
        const id = normalizeId(client.id);
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        const key = canonicalizeClientName(client.display_name || '');
        if (key) seenKeys.add(key);
        merged.push(client);
    }

    for (const buyer of buyers) {
        const derived = mapBuyerToDerivedClient(buyer);
        const buyerId = derived.id;
        if (seenIds.has(buyerId)) continue;
        const key = canonicalizeClientName(derived.display_name || '');
        if (key && seenKeys.has(key)) continue;
        seenIds.add(buyerId);
        if (key) seenKeys.add(key);
        merged.push(derived);
    }

    merged.sort((a, b) => {
        const typeA = clientTypeOrder[normalizeClientType(a.client_type)] ?? 1;
        const typeB = clientTypeOrder[normalizeClientType(b.client_type)] ?? 1;
        if (typeA !== typeB) return typeA - typeB;
        return collator.compare(a.display_name || '', b.display_name || '');
    });

    return merged;
}

async function fetchBuyersAsClients(userId) {
    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from(BUYERS_TABLE)
            .select(BUYER_CLIENT_SELECT)
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('display_name', { ascending: true });

        if (error) {
            console.warn('[AgroClients] buyer fetch failed, continuing without Cartera Viva data:', error?.message || error);
            return [];
        }
        return Array.isArray(data) ? data : [];
    } catch (_err) {
        return [];
    }
}

function toNullableText(value) {
    const text = String(value || '').trim();
    return text || null;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value).replaceAll('`', '&#96;');
}

function isSchemaMissingError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes(CLIENTS_TABLE)
        || message.includes('does not exist')
        || message.includes('could not find')
        || String(error?.code || '') === '42P01';
}

async function getSupabaseClient() {
    if (globalThis.__YG_AGRO_SUPABASE) return globalThis.__YG_AGRO_SUPABASE;
    const mod = await import('../assets/js/config/supabase-config.js');
    const client = mod.default || mod.supabase;
    if (client && !globalThis.__YG_AGRO_SUPABASE) {
        globalThis.__YG_AGRO_SUPABASE = client;
    }
    return client;
}

async function ensureUserId(explicitUserId = '') {
    const direct = normalizeId(explicitUserId || state.userId || state.initialUserId);
    if (direct) {
        state.userId = direct;
        return direct;
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const userId = normalizeId(data?.user?.id);
    if (!userId) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
    state.userId = userId;
    return userId;
}

function setPageFeedback(message = '', tone = 'info') {
    state.pageFeedback = {
        message: String(message || ''),
        tone: String(tone || 'info')
    };
    renderPageFeedback();
}

function setModalFeedback(message = '', tone = 'info') {
    state.modalFeedback = {
        message: String(message || ''),
        tone: String(tone || 'info')
    };
    renderModalFeedback();
}

function renderPageFeedback() {
    const node = state.refs?.feedback;
    if (!node) return;
    const message = String(state.pageFeedback.message || '').trim();
    node.textContent = message;
    node.dataset.tone = state.pageFeedback.tone || 'info';
    node.hidden = !message;
}

function renderModalFeedback() {
    const node = state.refs?.modalFeedback;
    if (!node) return;
    const message = String(state.modalFeedback.message || '').trim();
    node.textContent = message;
    node.dataset.tone = state.modalFeedback.tone || 'info';
    node.hidden = !message;
}

function getTypeMeta(clientType) {
    return TYPE_META[normalizeClientType(clientType)] || TYPE_META.external;
}

function buildSelectOptions(options, selectedValue) {
    return options.map((option) => {
        const isSelected = String(option.value) === String(selectedValue);
        return `<option value="${escapeAttr(option.value)}"${isSelected ? ' selected' : ''}>${escapeHtml(option.label)}</option>`;
    }).join('');
}

function clientMatchesSearch(client, query) {
    const token = normalizeToken(query);
    if (!token) return true;
    const fields = [
        client.display_name,
        client.phone,
        client.whatsapp,
        client.email,
        client.location,
        ...(Array.isArray(client.tags) ? client.tags : [])
    ];
    return fields.some((field) => normalizeToken(field).includes(token));
}

function compareClientsByName(a, b) {
    const nameA = String(a?.display_name || '').trim();
    const nameB = String(b?.display_name || '').trim();
    return collator.compare(nameA, nameB);
}

export function filterAndSortClients(clients = [], options = {}) {
    const filter = normalizeFilter(options.filter || 'all');
    const sort = normalizeSort(options.sort || 'az');
    const search = String(options.search || '');
    const visible = (Array.isArray(clients) ? clients : [])
        .filter((client) => !client?.deleted_at)
        .filter((client) => {
            if (filter === 'all') return true;
            return filterGroupForType(client.client_type) === filter;
        })
        .filter((client) => clientMatchesSearch(client, search));

    visible.sort((a, b) => {
        if (sort === 'recent') {
            return String(b?.created_at || '').localeCompare(String(a?.created_at || ''));
        }
        const byName = compareClientsByName(a, b);
        return sort === 'za' ? byName * -1 : byName;
    });

    return visible;
}

function getVisibleClients() {
    return filterAndSortClients(state.clients, {
        filter: state.filter,
        sort: state.sort,
        search: state.search
    });
}

function hasDuplicateName(displayName, ignoredId = '') {
    const wanted = canonicalizeClientName(displayName);
    if (!wanted) return false;
    const ignored = normalizeId(ignoredId);
    return state.clients.some((client) => (
        normalizeId(client.id) !== ignored
        && canonicalizeClientName(client.display_name) === wanted
    ));
}

function cacheRefs() {
    const root = state.root;
    state.refs = {
        feedback: root.querySelector('[data-clients-feedback]'),
        filters: root.querySelector('[data-clients-filters]'),
        search: root.querySelector('[data-clients-search]'),
        sort: root.querySelector('[data-clients-sort]'),
        listStatus: root.querySelector('[data-clients-list-status]'),
        list: root.querySelector('[data-clients-list]'),
        modal: root.querySelector('[data-clients-modal]'),
        modalTitle: root.querySelector('[data-clients-modal-title]'),
        modalCopy: root.querySelector('[data-clients-modal-copy]'),
        modalFeedback: root.querySelector('[data-clients-modal-feedback]'),
        formHost: root.querySelector('[data-clients-form-host]')
    };
}

function renderFilterButtons() {
    const host = state.refs?.filters;
    if (!host) return;
    host.innerHTML = FILTER_OPTIONS.map((option) => {
        const isActive = normalizeFilter(option.value) === state.filter;
        return `
            <button type="button" class="agro-clients-filter${isActive ? ' is-active' : ''}" data-client-action="filter" data-filter="${escapeAttr(option.value)}" aria-pressed="${isActive ? 'true' : 'false'}">
                ${escapeHtml(option.label)}
            </button>
        `;
    }).join('');
}

function renderContactLine(client) {
    const parts = [
        client.whatsapp ? `<span><i class="fa-brands fa-whatsapp" aria-hidden="true"></i>${escapeHtml(client.whatsapp)}</span>` : '',
        client.phone ? `<span><i class="fa-solid fa-phone" aria-hidden="true"></i>${escapeHtml(client.phone)}</span>` : '',
        client.email ? `<span><i class="fa-solid fa-envelope" aria-hidden="true"></i>${escapeHtml(client.email)}</span>` : '',
        client.location ? `<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${escapeHtml(client.location)}</span>` : ''
    ].filter(Boolean);

    if (!parts.length) {
        return '<p class="agro-clients-card__muted">Sin datos de contacto todavía.</p>';
    }

    return `<div class="agro-clients-card__contact">${parts.join('')}</div>`;
}

function renderTags(tags) {
    const safeTags = parseClientTags(tags);
    if (!safeTags.length) return '';
    return `
        <div class="agro-clients-tags" aria-label="Tags del cliente">
            ${safeTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
        </div>
    `;
}

function renderClientCard(client) {
    const typeMeta = getTypeMeta(client.client_type);
    const isDerived = client._source === 'cartera-viva';
    const sourceBadge = typeMeta.sourceLabel
        ? `<span class="agro-clients-badge agro-clients-badge--source">${escapeHtml(typeMeta.sourceLabel)}</span>`
        : '';
    const actionsHtml = isDerived
        ? ''
        : `<div class="agro-clients-card__actions">
                    <button type="button" class="agro-clients-icon-btn" data-client-action="edit" data-client-id="${escapeAttr(client.id)}" title="Editar cliente" aria-label="Editar ${escapeAttr(client.display_name)}">
                        <i class="fa-solid fa-pen" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="agro-clients-icon-btn agro-clients-icon-btn--danger" data-client-action="delete" data-client-id="${escapeAttr(client.id)}" title="Eliminar cliente" aria-label="Eliminar ${escapeAttr(client.display_name)}">
                        <i class="fa-solid fa-trash" aria-hidden="true"></i>
                    </button>
                </div>`;
    return `
        <article class="agro-clients-card${isDerived ? ' agro-clients-card--derived' : ''}" data-client-id="${escapeAttr(client.id)}">
            <div class="agro-clients-card__head">
                <div class="agro-clients-card__identity">
                    <h3 class="agro-clients-card__name">${escapeHtml(client.display_name || 'Cliente sin nombre')}</h3>
                    <div class="agro-clients-card__badges">
                        <span class="agro-clients-badge ${escapeAttr(typeMeta.badgeClass)}">${escapeHtml(typeMeta.label)}</span>
                        ${sourceBadge}
                    </div>
                </div>
                ${actionsHtml}
            </div>
            ${renderContactLine(client)}
            ${renderTags(client.tags)}
            ${client.notes ? `<p class="agro-clients-card__notes">${escapeHtml(client.notes)}</p>` : ''}
        </article>
    `;
}

function renderList() {
    if (!state.refs?.list || !state.refs?.listStatus) return;

    if (state.schemaMissing) {
        state.refs.listStatus.textContent = CLIENTS_SCHEMA_MISSING_COPY;
        state.refs.list.innerHTML = `
            <div class="agro-clients-empty agro-clients-empty--warn">
                <h3>Migración pendiente</h3>
                <p>${escapeHtml(CLIENTS_SCHEMA_MISSING_COPY)}</p>
            </div>
        `;
        return;
    }

    if (!state.loadedOnce && state.loading) {
        state.refs.listStatus.textContent = 'Cargando clientes...';
        state.refs.list.innerHTML = `
            <div class="agro-clients-loading">
                <article class="agro-clients-card agro-clients-card--loading"></article>
                <article class="agro-clients-card agro-clients-card--loading"></article>
                <article class="agro-clients-card agro-clients-card--loading"></article>
            </div>
        `;
        return;
    }

    const visibleClients = getVisibleClients();
    const totalClients = state.clients.length;

    if (visibleClients.length === 0 && totalClients === 0) {
        state.refs.listStatus.textContent = 'Todavía no hay clientes guardados.';
        state.refs.list.innerHTML = `
            <div class="agro-clients-empty">
                <h3>Guarda tu primer cliente</h3>
                <p>Esta vista funciona como libreta simple de contactos de tu finca.</p>
                <button type="button" class="btn btn-primary" data-client-action="new">Nuevo cliente</button>
            </div>
        `;
        return;
    }

    if (visibleClients.length === 0) {
        state.refs.listStatus.textContent = 'No hay clientes para el filtro actual.';
        state.refs.list.innerHTML = `
            <div class="agro-clients-empty">
                <h3>Sin resultados visibles</h3>
                <p>Ajusta búsqueda, categoría u orden para volver a ver clientes.</p>
            </div>
        `;
        return;
    }

    state.refs.listStatus.textContent = `${visibleClients.length} cliente${visibleClients.length === 1 ? '' : 's'} visible${visibleClients.length === 1 ? '' : 's'} de ${totalClients}.`;
    state.refs.list.innerHTML = visibleClients.map((client) => renderClientCard(client)).join('');
}

function buildFormMarkup() {
    const values = state.form;
    const isEdit = state.modalMode === 'edit';
    return `
        <form class="agro-clients-form" data-clients-form novalidate>
            <label class="agro-clients-field agro-clients-field--full">
                <span>Nombre del cliente *</span>
                <input type="text" class="styled-input" data-client-draft="displayName" maxlength="140" value="${escapeAttr(values.displayName)}" placeholder="Ej: Cliente Prueba Externo" required>
            </label>

            <label class="agro-clients-field">
                <span>Tipo de cliente</span>
                <select class="styled-input" data-client-draft="clientType">
                    ${buildSelectOptions([
                        { value: 'external', label: 'No registrado en YavlGold' },
                        { value: 'registered', label: 'Con cuenta YavlGold' }
                    ], normalizeClientType(values.clientType))}
                </select>
            </label>

            <label class="agro-clients-field">
                <span>Teléfono</span>
                <input type="tel" class="styled-input" data-client-draft="phone" maxlength="60" value="${escapeAttr(values.phone)}" placeholder="Teléfono">
            </label>

            <label class="agro-clients-field">
                <span>WhatsApp</span>
                <input type="tel" class="styled-input" data-client-draft="whatsapp" maxlength="60" value="${escapeAttr(values.whatsapp)}" placeholder="WhatsApp">
            </label>

            <label class="agro-clients-field">
                <span>Correo de contacto</span>
                <input type="email" class="styled-input" data-client-draft="email" maxlength="180" value="${escapeAttr(values.email)}" placeholder="correo@ejemplo.com">
            </label>

            <label class="agro-clients-field agro-clients-field--full">
                <span>Ubicación</span>
                <input type="text" class="styled-input" data-client-draft="location" maxlength="180" value="${escapeAttr(values.location)}" placeholder="Vereda, ciudad o punto de entrega">
            </label>

            <label class="agro-clients-field agro-clients-field--full">
                <span>Tags</span>
                <input type="text" class="styled-input" data-client-draft="tags" maxlength="220" value="${escapeAttr(values.tags)}" placeholder="Ej: mayorista, feria, vecino">
            </label>

            <label class="agro-clients-field agro-clients-field--full">
                <span>Notas</span>
                <textarea class="styled-input" data-client-draft="notes" rows="4" maxlength="700" placeholder="Notas simples del cliente">${escapeHtml(values.notes)}</textarea>
            </label>

            <div class="agro-clients-form__actions">
                <button type="button" class="btn agro-modal-canon__button agro-modal-canon__button--secondary" data-client-action="close-modal">Cancelar</button>
                <button type="submit" class="btn btn-primary agro-modal-canon__button agro-modal-canon__button--primary"${state.saving ? ' disabled' : ''}>
                    ${state.saving ? 'Guardando...' : (isEdit ? 'Actualizar cliente' : 'Guardar cliente')}
                </button>
            </div>
        </form>
    `;
}

function syncBodyLock() {
    document.body.classList.toggle('agro-clients-modal-open', state.modalOpen);
}

function renderModal() {
    const modal = state.refs?.modal;
    const formHost = state.refs?.formHost;
    if (!modal || !formHost) return;

    const isEdit = state.modalMode === 'edit';
    modal.classList.toggle('is-open', state.modalOpen);
    modal.setAttribute('aria-hidden', state.modalOpen ? 'false' : 'true');
    syncBodyLock();

    if (!state.modalOpen) {
        formHost.innerHTML = '';
        return;
    }

    if (state.refs.modalTitle) {
        state.refs.modalTitle.textContent = isEdit ? 'Editar cliente' : 'Nuevo cliente';
    }
    if (state.refs.modalCopy) {
        state.refs.modalCopy.textContent = isEdit
            ? 'Actualiza los datos de contacto sin conectar esta vista con cartera o deuda.'
            : 'Guarda un contacto simple de tu finca.';
    }

    formHost.innerHTML = buildFormMarkup();
    renderModalFeedback();

    const firstInput = formHost.querySelector('[data-client-draft="displayName"]');
    if (firstInput && typeof firstInput.focus === 'function') {
        requestAnimationFrame(() => firstInput.focus({ preventScroll: true }));
    }
}

function renderModule() {
    if (!state.root) return;
    state.root.innerHTML = `
        <section class="agro-clients-shell" aria-label="Mis Clientes">
            <header class="agro-clients-header">
                <div class="agro-clients-header__titleblock">
                    <p class="agro-clients-header__copy">Base de datos de clientes de tu finca.</p>
                </div>
                <div class="agro-clients-header__actions">
                    <button type="button" class="agro-clients-refresh" data-client-action="refresh" title="Actualizar clientes" aria-label="Actualizar clientes">
                        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="btn btn-gold" data-client-action="new">
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        <span>Nuevo cliente</span>
                    </button>
                </div>
            </header>

            <p class="agro-clients-feedback" data-clients-feedback hidden></p>

            <section class="agro-clients-panel" aria-label="Filtros de clientes">
                <div class="agro-clients-toolbar">
                    <div class="agro-clients-filter-row" data-clients-filters role="group" aria-label="Filtrar clientes"></div>
                    <label class="agro-clients-search">
                        <span>Buscar</span>
                        <input type="search" class="styled-input" data-clients-search value="${escapeAttr(state.search)}" placeholder="Nombre, teléfono, tag">
                    </label>
                    <label class="agro-clients-sort">
                        <span>Orden</span>
                        <select class="styled-input" data-clients-sort>
                            ${buildSelectOptions(SORT_OPTIONS, state.sort)}
                        </select>
                    </label>
                </div>
            </section>

            <section class="agro-clients-panel agro-clients-panel--list${state.loading && state.loadedOnce ? ' is-refreshing' : ''}" aria-label="Lista de clientes">
                <p class="agro-clients-list-status" data-clients-list-status></p>
                <div class="agro-clients-list" data-clients-list></div>
            </section>

            <div class="agro-clients-modal" data-clients-modal aria-hidden="true">
                <div class="agro-clients-modal__backdrop" data-client-action="close-modal"></div>
                <div class="agro-clients-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="agro-clients-modal-title" tabindex="-1">
                    <header class="agro-clients-modal__head">
                        <div>
                            <p class="agro-clients-modal__eyebrow">Mis Clientes</p>
                            <h3 id="agro-clients-modal-title" data-clients-modal-title>Nuevo cliente</h3>
                            <p data-clients-modal-copy>Guarda un contacto simple de tu finca.</p>
                        </div>
                        <button type="button" class="agro-clients-close" data-client-action="close-modal" aria-label="Cerrar modal">
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </header>
                    <p class="agro-clients-feedback" data-clients-modal-feedback hidden></p>
                    <div data-clients-form-host></div>
                </div>
            </div>
        </section>
    `;
    cacheRefs();
    renderPageFeedback();
    renderFilterButtons();
    renderList();
    renderModal();
}

async function fetchClients(userId) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from(CLIENTS_TABLE)
        .select(CLIENT_SELECT)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('display_name', { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

async function refreshData(options = {}) {
    if (state.loading) return;
    if (options.initialUserId) {
        state.initialUserId = normalizeId(options.initialUserId);
    }

    state.loading = true;
    renderList();

    try {
        const userId = await ensureUserId(options.initialUserId);
        state.schemaMissing = false;
        const [clients, buyers] = await Promise.all([
            fetchClients(userId),
            fetchBuyersAsClients(userId)
        ]);
        state.clients = mergeClientsWithBuyers(clients, buyers);
        state.loadedOnce = true;
        setPageFeedback('', 'info');
        renderFilterButtons();
        renderList();
    } catch (error) {
        if (isSchemaMissingError(error)) {
            state.schemaMissing = true;
            state.clients = [];
            state.loadedOnce = true;
            setPageFeedback(CLIENTS_SCHEMA_MISSING_COPY, 'warn');
            renderList();
            return;
        }
        console.error('[AgroClients] refresh failed:', error);
        state.loadedOnce = true;
        setPageFeedback(error?.message || 'No se pudieron cargar los clientes.', 'warn');
        renderList();
    } finally {
        state.loading = false;
        renderList();
    }
}

function ensureFormPayload() {
    const displayName = String(state.form.displayName || '').trim().replace(/\s+/g, ' ');
    if (!displayName) {
        throw new Error('El nombre del cliente es obligatorio.');
    }
    if (hasDuplicateName(displayName, state.editId)) {
        throw new Error('Ya existe un cliente con ese nombre.');
    }

    return {
        display_name: displayName,
        client_type: normalizeClientType(state.form.clientType),
        linked_profile_id: null,
        phone: toNullableText(state.form.phone),
        whatsapp: toNullableText(state.form.whatsapp),
        email: toNullableText(state.form.email),
        location: toNullableText(state.form.location),
        notes: toNullableText(state.form.notes),
        tags: parseClientTags(state.form.tags)
    };
}

async function createClientRecord(payload) {
    const userId = await ensureUserId();
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from(CLIENTS_TABLE)
        .insert({ ...payload, user_id: userId })
        .select(CLIENT_SELECT)
        .single();

    if (error) throw error;
    return data;
}

async function updateClientRecord(clientId, payload) {
    const userId = await ensureUserId();
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from(CLIENTS_TABLE)
        .update(payload)
        .eq('id', normalizeId(clientId))
        .eq('user_id', userId)
        .is('deleted_at', null)
        .select(CLIENT_SELECT)
        .maybeSingle();

    if (error) throw error;
    if (!data?.id) throw new Error('No se pudo actualizar el cliente.');
    return data;
}

async function softDeleteClientRecord(clientId) {
    const userId = await ensureUserId();
    const supabase = await getSupabaseClient();
    const { error } = await supabase
        .from(CLIENTS_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', normalizeId(clientId))
        .eq('user_id', userId)
        .is('deleted_at', null);

    if (error) throw error;
}

function publishClientsChanged(action, client = null) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(CLIENTS_CHANGED_EVENT, {
        detail: {
            action,
            clientId: normalizeId(client?.id),
            clientType: normalizeClientType(client?.client_type)
        }
    }));
}

function closeModal() {
    state.modalOpen = false;
    state.modalMode = 'create';
    state.editId = '';
    state.form = createFormState();
    setModalFeedback('', 'info');
    renderModal();
}

function openCreateModal() {
    if (state.schemaMissing) {
        setPageFeedback(CLIENTS_SCHEMA_MISSING_COPY, 'warn');
        return;
    }
    state.modalMode = 'create';
    state.editId = '';
    state.form = createFormState();
    state.modalOpen = true;
    setModalFeedback('', 'info');
    renderModal();
}

function openEditModal(clientId) {
    const id = normalizeId(clientId);
    const client = state.clients.find((item) => normalizeId(item.id) === id);
    if (!client) {
        setPageFeedback('No se encontró el cliente para editar.', 'warn');
        return;
    }
    state.modalMode = 'edit';
    state.editId = id;
    state.form = createFormState({
        displayName: client.display_name || '',
        clientType: normalizeClientType(client.client_type),
        phone: client.phone || '',
        whatsapp: client.whatsapp || '',
        email: client.email || '',
        location: client.location || '',
        tags: formatTagsInput(client.tags),
        notes: client.notes || ''
    });
    state.modalOpen = true;
    setModalFeedback('', 'info');
    renderModal();
}

async function handleFormSubmit(event) {
    event.preventDefault();
    if (state.saving || state.schemaMissing) return;

    try {
        state.saving = true;
        setModalFeedback('', 'info');
        renderModal();

        const isEdit = state.modalMode === 'edit';
        const payload = ensureFormPayload();
        const saved = isEdit
            ? await updateClientRecord(state.editId, payload)
            : await createClientRecord(payload);

        closeModal();
        publishClientsChanged(isEdit ? 'updated' : 'created', saved);
        await refreshData();
        setPageFeedback(isEdit ? 'Cliente actualizado.' : 'Cliente guardado.', 'success');
    } catch (error) {
        console.error('[AgroClients] save failed:', error);
        setModalFeedback(error?.message || 'No se pudo guardar el cliente.', 'warn');
        renderModal();
    } finally {
        state.saving = false;
        renderModal();
    }
}

async function handleDelete(clientId) {
    const id = normalizeId(clientId);
    const client = state.clients.find((item) => normalizeId(item.id) === id);
    if (!client) {
        setPageFeedback('No se encontró el cliente para eliminar.', 'warn');
        return;
    }

    const confirmed = window.confirm(`¿Eliminar "${client.display_name}" de Mis Clientes?`);
    if (!confirmed) return;

    try {
        state.saving = true;
        await softDeleteClientRecord(id);
        state.clients = state.clients.filter((item) => normalizeId(item.id) !== id);
        setPageFeedback('Cliente eliminado de la lista visible.', 'success');
        publishClientsChanged('deleted', client);
        renderFilterButtons();
        renderList();
    } catch (error) {
        console.error('[AgroClients] delete failed:', error);
        setPageFeedback(error?.message || 'No se pudo eliminar el cliente.', 'warn');
    } finally {
        state.saving = false;
    }
}

function updateDraft(field, value) {
    if (!Object.prototype.hasOwnProperty.call(state.form, field)) return;
    state.form[field] = field === 'clientType'
        ? normalizeClientType(value)
        : String(value || '');
}

function isDerivedClient(clientOrId) {
    const id = typeof clientOrId === 'string' ? clientOrId : clientOrId?.id;
    return String(id || '').startsWith('buyer:');
}

async function handleRootClick(event) {
    const button = event.target.closest('[data-client-action]');
    if (!button || !state.root?.contains(button)) return;

    const action = normalizeToken(button.dataset.clientAction);
    if (action === 'new') {
        openCreateModal();
        return;
    }
    if (action === 'refresh') {
        await refreshData();
        return;
    }
    if (action === 'filter') {
        state.filter = normalizeFilter(button.dataset.filter);
        renderFilterButtons();
        renderList();
        return;
    }
    if (action === 'edit') {
        if (isDerivedClient(button.dataset.clientId)) {
            setPageFeedback('Este contacto viene de Cartera Viva. Edítalo desde allí.', 'info');
            return;
        }
        openEditModal(button.dataset.clientId);
        return;
    }
    if (action === 'delete') {
        if (isDerivedClient(button.dataset.clientId)) {
            setPageFeedback('Este contacto viene de Cartera Viva. Elimínalo desde allí.', 'info');
            return;
        }
        await handleDelete(button.dataset.clientId);
        return;
    }
    if (action === 'close-modal') {
        closeModal();
    }
}

function handleRootInput(event) {
    const target = event.target;
    if (target.matches('[data-clients-search]')) {
        state.search = String(target.value || '');
        renderList();
        return;
    }
    const draftField = target.dataset?.clientDraft;
    if (draftField) {
        updateDraft(draftField, target.value);
    }
}

function handleRootChange(event) {
    const target = event.target;
    if (target.matches('[data-clients-sort]')) {
        state.sort = normalizeSort(target.value);
        renderList();
        return;
    }
    const draftField = target.dataset?.clientDraft;
    if (draftField) {
        updateDraft(draftField, target.value);
    }
}

function handleRootSubmit(event) {
    if (!event.target.matches('[data-clients-form]')) return;
    void handleFormSubmit(event);
}

function handleKeydown(event) {
    if (event.key === 'Escape' && state.modalOpen) {
        closeModal();
    }
}

function bindEvents() {
    if (!state.root || state.initialized) return;
    state.root.addEventListener('click', (event) => {
        void handleRootClick(event);
    });
    state.root.addEventListener('input', handleRootInput);
    state.root.addEventListener('change', handleRootChange);
    state.root.addEventListener('submit', handleRootSubmit);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener(VIEW_CHANGED_EVENT, (event) => {
        state.currentView = normalizeToken(event.detail?.view);
        if (state.currentView === VIEW_NAME) {
            if (!state.loadedOnce && !state.loading) {
                void refreshData({ initialUserId: state.initialUserId });
            } else {
                renderList();
            }
        }
    });
    state.initialized = true;
}

export function initAgroClients(options = {}) {
    state.root = document.getElementById(ROOT_ID);
    state.initialUserId = normalizeId(options.initialUserId || state.initialUserId);
    if (!state.root) return null;

    renderModule();
    bindEvents();

    state.currentView = normalizeToken(document.body?.dataset?.agroActiveView || '');
    if (state.currentView === VIEW_NAME) {
        void refreshData({ initialUserId: state.initialUserId });
    }

    return {
        refresh: () => refreshData(),
        getClients: () => [...state.clients]
    };
}

export const __test = {
    canonicalizeClientName,
    filterAndSortClients,
    normalizeClientType,
    filterGroupForType,
    mergeClientsWithBuyers,
    mapBuyerToDerivedClient,
    parseClientTags
};
