const ROOT_ID = 'agro-operational-root';
const VIEW_NAME = 'operational';
const CROPS_READY_EVENT = 'AGRO_CROPS_READY';
const VIEW_CHANGED_EVENT = 'agro:shell:view-changed';

const ECONOMIC_TYPE_OPTIONS = Object.freeze([
    { value: 'expense', label: 'Gasto' },
    { value: 'income', label: 'Ingreso' },
    { value: 'donation', label: 'Donacion' },
    { value: 'loss', label: 'Perdida' }
]);

const CATEGORY_OPTIONS = Object.freeze([
    { value: 'tools', label: 'Herramientas' },
    { value: 'maintenance', label: 'Mantenimiento' },
    { value: 'labor', label: 'Mano de obra' },
    { value: 'transport', label: 'Transporte' },
    { value: 'supplies', label: 'Suministros' },
    { value: 'other', label: 'Otro' }
]);

const STATUS_OPTIONS = Object.freeze([
    { value: 'open', label: 'Abierto' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'compensating', label: 'Compensando' },
    { value: 'closed', label: 'Cerrado' },
    { value: 'lost', label: 'Perdido' }
]);

const UNIT_TYPE_OPTIONS = Object.freeze([
    { value: 'unidad', label: 'Unidad' },
    { value: 'saco', label: 'Saco' },
    { value: 'kg', label: 'Kg' }
]);

const CURRENCY_OPTIONS = Object.freeze(['COP', 'USD', 'VES']);

const DIRECTION_BY_TYPE = Object.freeze({
    expense: 'out',
    income: 'in',
    donation: 'out',
    loss: 'out'
});

const STATUS_CLASS_BY_VALUE = Object.freeze({
    open: 'is-open',
    in_progress: 'is-in-progress',
    compensating: 'is-compensating',
    closed: 'is-closed',
    lost: 'is-lost'
});

const state = {
    root: null,
    refs: null,
    supabase: null,
    userId: '',
    crops: [],
    cycles: [],
    initialized: false,
    loading: false,
    saving: false,
    editId: '',
    currentView: '',
    schemaMissing: false,
    cropDeletedAtSupported: true,
    lastCascadeCheck: null
};

function normalizeToken(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeId(value) {
    return String(value || '').trim();
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

function todayLocalIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isMissingColumnError(error, columnName) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes(String(columnName || '').toLowerCase());
}

function isSchemaMissingError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('agro_operational_cycles')
        || message.includes('agro_operational_movements')
        || message.includes('does not exist')
        || message.includes('could not find')
        || String(error?.code || '') === '42P01';
}

function readLabel(options, value, fallback = 'Sin definir') {
    const token = normalizeToken(value);
    const match = options.find((option) => option.value === token);
    return match?.label || fallback;
}

function createOptionsMarkup(options, selectedValue = '', includeBlank = null) {
    const parts = [];
    if (includeBlank) {
        parts.push(`<option value="">${escapeHtml(includeBlank)}</option>`);
    }
    options.forEach((option) => {
        const selected = option.value === selectedValue ? ' selected' : '';
        parts.push(`<option value="${escapeAttr(option.value)}"${selected}>${escapeHtml(option.label)}</option>`);
    });
    return parts.join('');
}

function formatDateLabel(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'Sin fecha';
    const date = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('es-VE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function formatCurrencyValue(value, currency = 'COP') {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'Sin monto';
    const code = CURRENCY_OPTIONS.includes(String(currency || '').toUpperCase())
        ? String(currency).toUpperCase()
        : 'COP';
    const locale = code === 'USD' ? 'en-US' : (code === 'VES' ? 'es-VE' : 'es-CO');
    const fractionDigits = Number.isInteger(amount) ? 0 : 2;
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatSignedCurrencyValue(value, currency = 'COP') {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'Sin balance monetario';
    const sign = amount > 0 ? '+' : (amount < 0 ? '-' : '');
    return `${sign}${formatCurrencyValue(Math.abs(amount), currency)}`;
}

function toNullableNumber(value, label) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`${label} no es valido.`);
    }
    return parsed;
}

function toNullableText(value) {
    const text = String(value ?? '').trim();
    return text ? text : null;
}

function ensureAllowedValue(value, allowedValues, message) {
    const token = normalizeToken(value);
    if (allowedValues.includes(token)) return token;
    throw new Error(message);
}

function derivePrimaryConcept(name, description) {
    return String(description || name || '').trim() || 'Movimiento inicial';
}

function createMoneyBucket() {
    return new Map();
}

function addMoneyAmount(bucket, currency, amount) {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) return;
    const code = CURRENCY_OPTIONS.includes(String(currency || '').toUpperCase())
        ? String(currency).toUpperCase()
        : 'COP';
    bucket.set(code, (bucket.get(code) || 0) + numeric);
}

function mergeMoneyBuckets(target, source) {
    source.forEach((value, key) => {
        target.set(key, (target.get(key) || 0) + value);
    });
    return target;
}

function subtractMoneyBuckets(incoming, outgoing) {
    const bucket = createMoneyBucket();
    mergeMoneyBuckets(bucket, incoming);
    outgoing.forEach((value, key) => {
        bucket.set(key, (bucket.get(key) || 0) - value);
    });
    return bucket;
}

function formatMoneyBucket(bucket, options = {}) {
    const map = bucket instanceof Map ? bucket : createMoneyBucket();
    if (map.size === 0) {
        return options.emptyText || 'Sin monto';
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, value]) => (
            options.signed
                ? formatSignedCurrencyValue(value, currency)
                : formatCurrencyValue(value, currency)
        ))
        .join(' · ');
}

function resolveBalanceTone(balanceBucket) {
    const entries = Array.from((balanceBucket instanceof Map ? balanceBucket : createMoneyBucket()).values());
    if (entries.length !== 1) return 'gold';
    const value = entries[0];
    if (value > 0) return 'success';
    if (value < 0) return 'danger';
    return 'gold';
}

function summarizeMovements(movements = []) {
    const incoming = createMoneyBucket();
    const outgoing = createMoneyBucket();

    movements.forEach((movement) => {
        if (movement?.amount == null) return;
        if (movement.direction === 'in') {
            addMoneyAmount(incoming, movement.currency, movement.amount);
            return;
        }
        addMoneyAmount(outgoing, movement.currency, movement.amount);
    });

    return {
        incoming,
        outgoing,
        balance: subtractMoneyBuckets(incoming, outgoing)
    };
}

function buildCropDisplay(crop) {
    const icon = String(crop?.icon || '🌱').trim() || '🌱';
    const name = String(crop?.name || 'Cultivo').trim() || 'Cultivo';
    const variety = String(crop?.variety || '').trim();
    return {
        id: normalizeId(crop?.id),
        icon,
        name,
        variety,
        label: variety ? `${icon} ${name} (${variety})` : `${icon} ${name}`
    };
}

function sortMovementsAscending(left, right) {
    const leftKey = `${left?.movement_date || ''} ${left?.created_at || ''}`;
    const rightKey = `${right?.movement_date || ''} ${right?.created_at || ''}`;
    return leftKey.localeCompare(rightKey);
}

function buildCycleViewModel(cycle, movementsByCycle, cropMap) {
    const cycleId = normalizeId(cycle?.id);
    const movements = Array.isArray(movementsByCycle.get(cycleId))
        ? [...movementsByCycle.get(cycleId)]
        : [];
    movements.sort(sortMovementsAscending);

    const summary = summarizeMovements(movements);
    const primaryMovement = movements[0] || null;
    const crop = cycle?.crop_id ? cropMap.get(normalizeId(cycle.crop_id)) || null : null;
    const movementCount = movements.length;

    return {
        id: cycleId,
        name: String(cycle?.name || 'Ciclo operativo').trim() || 'Ciclo operativo',
        description: toNullableText(cycle?.description),
        economic_type: normalizeToken(cycle?.economic_type),
        category: normalizeToken(cycle?.category),
        crop_id: normalizeId(cycle?.crop_id),
        crop,
        status: normalizeToken(cycle?.status || 'open'),
        opened_at: String(cycle?.opened_at || '').trim(),
        closed_at: String(cycle?.closed_at || '').trim(),
        notes: toNullableText(cycle?.notes),
        created_at: String(cycle?.created_at || '').trim(),
        updated_at: String(cycle?.updated_at || '').trim(),
        movements,
        primaryMovement,
        movementCount,
        incomingText: formatMoneyBucket(summary.incoming),
        outgoingText: formatMoneyBucket(summary.outgoing),
        balanceText: formatMoneyBucket(summary.balance, { signed: true, emptyText: 'Sin balance monetario' }),
        balanceTone: resolveBalanceTone(summary.balance),
        summary
    };
}

function normalizeOperationalError(error) {
    if (error instanceof Error && error.message) {
        if (isSchemaMissingError(error)) {
            return 'Falta aplicar la migracion de Ciclos Operativos en Supabase.';
        }
        return error.message;
    }
    return 'No se pudo completar la operacion.';
}

function notify(message, type = 'info') {
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    if (type === 'error') {
        console.error('[agroOperationalCycles]', message);
        return;
    }
    console.info('[agroOperationalCycles]', message);
}

function setFeedback(message = '', tone = 'info') {
    const feedback = state.refs?.feedback;
    if (!feedback) return;
    const text = String(message || '').trim();
    feedback.textContent = text;
    feedback.dataset.tone = tone;
    feedback.classList.toggle('is-visible', !!text);
}

function clearFeedback() {
    setFeedback('', 'info');
}

async function getSupabaseClient() {
    if (state.supabase) return state.supabase;
    if (typeof globalThis !== 'undefined' && globalThis.__YG_AGRO_SUPABASE) {
        state.supabase = globalThis.__YG_AGRO_SUPABASE;
        return state.supabase;
    }
    const mod = await import('../assets/js/config/supabase-config.js');
    state.supabase = mod.default || mod.supabase;
    return state.supabase;
}

async function ensureUserId(initialUserId = '') {
    const preferredId = normalizeId(initialUserId || state.userId || globalThis?.YG_AGRO_CROPS_USER_ID);
    if (preferredId) {
        state.userId = preferredId;
        return preferredId;
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    const userId = normalizeId(data?.user?.id);
    if (!userId) {
        throw new Error('No se pudo resolver la sesion activa de Agro.');
    }

    state.userId = userId;
    return userId;
}

async function fetchCrops(supabase, userId) {
    let query = supabase
        .from('agro_crops')
        .select(state.cropDeletedAtSupported ? 'id,name,variety,icon,deleted_at' : 'id,name,variety,icon')
        .eq('user_id', userId)
        .order('name');

    if (state.cropDeletedAtSupported) {
        query = query.is('deleted_at', null);
    }

    const { data, error } = await query;
    if (error && state.cropDeletedAtSupported && isMissingColumnError(error, 'deleted_at')) {
        state.cropDeletedAtSupported = false;
        return fetchCrops(supabase, userId);
    }
    if (error) throw error;

    return (data || []).filter((crop) => !crop?.deleted_at);
}

async function fetchCycles(supabase, userId) {
    const { data, error } = await supabase
        .from('agro_operational_cycles')
        .select('id,user_id,name,description,economic_type,category,crop_id,status,opened_at,closed_at,notes,created_at,updated_at')
        .eq('user_id', userId)
        .order('opened_at', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

async function fetchMovements(supabase, userId, cycleIds = []) {
    if (!Array.isArray(cycleIds) || cycleIds.length === 0) return [];

    const { data, error } = await supabase
        .from('agro_operational_movements')
        .select('id,user_id,cycle_id,direction,amount,currency,amount_usd,exchange_rate,concept,movement_date,quantity,unit_type,created_at')
        .eq('user_id', userId)
        .in('cycle_id', cycleIds)
        .order('movement_date', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

async function validateCropId(supabase, userId, cropId) {
    const normalizedId = normalizeId(cropId);
    if (!normalizedId) return null;

    let query = supabase
        .from('agro_crops')
        .select(state.cropDeletedAtSupported ? 'id,deleted_at' : 'id')
        .eq('id', normalizedId)
        .eq('user_id', userId);

    if (state.cropDeletedAtSupported) {
        query = query.is('deleted_at', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error && state.cropDeletedAtSupported && isMissingColumnError(error, 'deleted_at')) {
        state.cropDeletedAtSupported = false;
        return validateCropId(supabase, userId, normalizedId);
    }
    if (error) throw error;
    if (!data?.id) {
        throw new Error('Cultivo no valido.');
    }
    return normalizedId;
}

function normalizePayload(source = {}, options = {}) {
    const mode = options.mode === 'edit' ? 'edit' : 'create';
    const existingCycle = options.existingCycle || null;
    const name = String(source.name || '').trim();
    if (!name) {
        throw new Error('El nombre del ciclo es obligatorio.');
    }

    const description = toNullableText(source.description);
    const economicType = ensureAllowedValue(
        source.economicType || source.economic_type,
        ECONOMIC_TYPE_OPTIONS.map((option) => option.value),
        'Tipo economico no valido.'
    );
    const category = ensureAllowedValue(
        source.category,
        CATEGORY_OPTIONS.map((option) => option.value),
        'Categoria no valida.'
    );

    const movementDate = String(source.movementDate || source.movement_date || source.openedAt || source.opened_at || todayLocalIso()).trim();
    if (!movementDate) {
        throw new Error('La fecha del movimiento es obligatoria.');
    }

    const amount = toNullableNumber(source.amount, 'El monto');
    const quantity = toNullableNumber(source.quantity, 'La cantidad');
    const unitTypeRaw = toNullableText(source.unitType || source.unit_type);
    const unitType = unitTypeRaw
        ? ensureAllowedValue(
            unitTypeRaw,
            UNIT_TYPE_OPTIONS.map((option) => option.value),
            'Unidad no valida.'
        )
        : null;

    if ((quantity == null) !== (unitType == null)) {
        throw new Error('Cantidad y unidad deben viajar juntas.');
    }

    const currencyRaw = String(source.currency || 'COP').trim().toUpperCase();
    const currency = CURRENCY_OPTIONS.includes(currencyRaw) ? currencyRaw : 'COP';

    let status = mode === 'edit'
        ? ensureAllowedValue(
            source.status || existingCycle?.status || 'open',
            STATUS_OPTIONS.map((option) => option.value),
            'Estado no valido.'
        )
        : 'open';

    const requestedStatus = normalizeToken(source.status);
    if (mode === 'create' && STATUS_OPTIONS.some((option) => option.value === requestedStatus)) {
        status = requestedStatus;
    }
    if (source.closeOnSave === true) {
        status = 'closed';
    }

    return {
        name,
        description,
        economicType,
        category,
        cropId: normalizeId(source.cropId || source.crop_id),
        amount,
        currency,
        movementDate,
        quantity,
        unitType,
        status,
        notes: mode === 'edit' ? toNullableText(source.notes) : null
    };
}

function deriveMovementPayload(userId, cycleId, payload) {
    return {
        user_id: userId,
        cycle_id: cycleId,
        direction: deriveMovementDirection(payload.economicType),
        amount: payload.amount,
        currency: payload.currency,
        amount_usd: null,
        exchange_rate: null,
        concept: derivePrimaryConcept(payload.name, payload.description),
        movement_date: payload.movementDate,
        quantity: payload.quantity,
        unit_type: payload.unitType
    };
}

export function deriveMovementDirection(economicType) {
    return DIRECTION_BY_TYPE[normalizeToken(economicType)] || 'out';
}

async function upsertInitialMovement(supabase, userId, cycleId, movementId, payload) {
    const movementPayload = deriveMovementPayload(userId, cycleId, payload);
    if (movementId) {
        const { error } = await supabase
            .from('agro_operational_movements')
            .update(movementPayload)
            .eq('id', movementId)
            .eq('user_id', userId);

        if (error) throw error;
        return movementId;
    }

    const { data, error } = await supabase
        .from('agro_operational_movements')
        .insert(movementPayload)
        .select('id')
        .single();

    if (error) throw error;
    return normalizeId(data?.id);
}

async function verifyCascadeDelete(supabase, userId, cycleId) {
    const { count, error } = await supabase
        .from('agro_operational_movements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('cycle_id', cycleId);

    if (error) return null;
    return Number(count || 0) === 0;
}

async function createCycleRecord(payload) {
    const supabase = await getSupabaseClient();
    const userId = await ensureUserId();
    const cropId = await validateCropId(supabase, userId, payload.cropId);
    const closedAt = payload.status === 'closed' ? todayLocalIso() : null;

    const cyclePayload = {
        user_id: userId,
        name: payload.name,
        description: payload.description,
        economic_type: payload.economicType,
        category: payload.category,
        crop_id: cropId,
        status: payload.status,
        opened_at: payload.movementDate,
        closed_at: closedAt,
        notes: null
    };

    const { data, error } = await supabase
        .from('agro_operational_cycles')
        .insert(cyclePayload)
        .select('id,name')
        .single();

    if (error) throw error;

    const cycleId = normalizeId(data?.id);
    try {
        await upsertInitialMovement(supabase, userId, cycleId, '', payload);
    } catch (movementError) {
        await supabase
            .from('agro_operational_cycles')
            .delete()
            .eq('id', cycleId)
            .eq('user_id', userId);
        throw movementError;
    }

    return {
        cycleId,
        message: payload.status === 'closed'
            ? 'Ciclo operativo creado y cerrado.'
            : 'Ciclo operativo creado.'
    };
}

async function updateCycleRecord(cycleId, payload) {
    const supabase = await getSupabaseClient();
    const userId = await ensureUserId();
    const existingCycle = state.cycles.find((cycle) => cycle.id === cycleId);
    if (!existingCycle) {
        throw new Error('No se encontro el ciclo operativo a editar.');
    }

    const cropId = await validateCropId(supabase, userId, payload.cropId);
    const closedAt = payload.status === 'closed'
        ? (existingCycle.closed_at || todayLocalIso())
        : null;

    const cyclePayload = {
        name: payload.name,
        description: payload.description,
        economic_type: payload.economicType,
        category: payload.category,
        crop_id: cropId,
        status: payload.status,
        closed_at: closedAt,
        notes: payload.notes
    };

    const { error } = await supabase
        .from('agro_operational_cycles')
        .update(cyclePayload)
        .eq('id', cycleId)
        .eq('user_id', userId);

    if (error) throw error;

    await upsertInitialMovement(
        supabase,
        userId,
        cycleId,
        normalizeId(existingCycle.primaryMovement?.id),
        payload
    );

    return {
        cycleId,
        message: 'Ciclo operativo actualizado.'
    };
}

async function deleteCycleRecord(cycleId, options = {}) {
    const supabase = await getSupabaseClient();
    const userId = await ensureUserId();
    const existingCycle = state.cycles.find((cycle) => cycle.id === cycleId);
    if (!existingCycle) {
        throw new Error('No se encontro el ciclo operativo a eliminar.');
    }

    if (!options.skipConfirm) {
        const confirmed = typeof window.confirm === 'function'
            ? window.confirm(`¿Eliminar "${existingCycle.name}"? Esta accion tambien borrara sus movimientos asociados.`)
            : true;
        if (!confirmed) {
            return {
                cycleId,
                skipped: true,
                cascadeVerified: null,
                message: 'Eliminacion cancelada.'
            };
        }
    }

    const { error } = await supabase
        .from('agro_operational_cycles')
        .delete()
        .eq('id', cycleId)
        .eq('user_id', userId);

    if (error) throw error;

    const cascadeVerified = await verifyCascadeDelete(supabase, userId, cycleId);
    state.lastCascadeCheck = {
        cycleId,
        cascadeVerified
    };

    return {
        cycleId,
        cascadeVerified,
        message: cascadeVerified === true
            ? 'Ciclo eliminado y cascade verificado en movimientos.'
            : 'Ciclo eliminado.'
    };
}

function renderShell() {
    if (!state.root) return;

    state.root.innerHTML = `
        <div class="agro-operational-shell agro-ops-v10">
            <header class="module-header animate-in delay-3">
                <div class="module-title-group">
                    <div class="module-icon"><i class="fa-solid fa-arrows-spin" aria-hidden="true"></i></div>
                    <div class="module-heading">
                        <p class="ops-module-eyebrow">Familia nueva</p>
                        <h2 class="module-title">Ciclos Operativos</h2>
                        <p class="module-subtitle">Gastos, ingresos, donaciones y perdidas con balance visible, cierre rapido y asociacion opcional a cultivo.</p>
                    </div>
                </div>
                <div class="header-actions">
                    <button type="button" class="btn btn-primary" id="agro-operational-new-btn">Nuevo ciclo</button>
                    <button type="button" class="agro-operational-refresh-btn" id="agro-operational-refresh-btn" aria-label="Actualizar Ciclos Operativos" title="Actualizar">
                        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    </button>
                </div>
            </header>

            <div class="agro-operational-layout">
                <section class="agro-operational-panel" id="agro-operational-form-panel">
                    <div class="agro-operational-panel__head">
                        <div>
                            <p class="agro-operational-panel__eyebrow" id="agro-operational-form-eyebrow">Modo rapido</p>
                            <h3 class="agro-operational-panel__title" id="agro-operational-form-title">Crear ciclo operativo</h3>
                            <p class="agro-operational-panel__copy" id="agro-operational-form-copy">Crea el ciclo, registra el movimiento inicial y cierralo en un solo paso si ya quedo resuelto.</p>
                        </div>
                    </div>

                    <div class="agro-operational-feedback" id="agro-operational-feedback" data-tone="info"></div>

                    <form id="agro-operational-form" class="agro-operational-form" novalidate>
                        <div class="agro-operational-form-grid">
                            <div class="input-group">
                                <label class="input-label" for="agro-operational-name">Nombre del ciclo</label>
                                <input type="text" id="agro-operational-name" class="styled-input" maxlength="140" placeholder="Ej: Botas de cuero Titan" required>
                            </div>

                            <div class="input-group">
                                <label class="input-label" for="agro-operational-crop">Cultivo asociado</label>
                                <select id="agro-operational-crop" class="styled-input">
                                    <option value="">General (sin asociar)</option>
                                </select>
                            </div>

                            <div class="input-group input-group--full">
                                <label class="input-label" for="agro-operational-description">Descripcion principal</label>
                                <textarea id="agro-operational-description" class="styled-input" placeholder="Describe el movimiento principal o el contexto del ciclo."></textarea>
                            </div>

                            <div class="input-group">
                                <label class="input-label" for="agro-operational-economic-type">Tipo economico</label>
                                <select id="agro-operational-economic-type" class="styled-input">
                                    ${createOptionsMarkup(ECONOMIC_TYPE_OPTIONS, 'expense')}
                                </select>
                            </div>

                            <div class="input-group">
                                <label class="input-label" for="agro-operational-category">Categoria</label>
                                <select id="agro-operational-category" class="styled-input">
                                    ${createOptionsMarkup(CATEGORY_OPTIONS, 'other')}
                                </select>
                            </div>

                            <div class="input-group">
                                <label class="input-label" for="agro-operational-amount">Monto</label>
                                <input type="number" id="agro-operational-amount" class="styled-input" min="0" step="0.01" placeholder="Opcional">
                            </div>

                            <div class="input-group">
                                <label class="input-label" for="agro-operational-currency">Moneda</label>
                                <select id="agro-operational-currency" class="styled-input">
                                    ${CURRENCY_OPTIONS.map((currency) => `<option value="${currency}"${currency === 'COP' ? ' selected' : ''}>${currency}</option>`).join('')}
                                </select>
                            </div>

                            <div class="input-group">
                                <label class="input-label" for="agro-operational-date">Fecha</label>
                                <input type="date" id="agro-operational-date" class="styled-input" value="${todayLocalIso()}">
                            </div>

                            <div class="input-group">
                                <label class="input-label" for="agro-operational-quantity">Cantidad fisica</label>
                                <input type="number" id="agro-operational-quantity" class="styled-input" min="0" step="0.01" placeholder="Opcional">
                            </div>

                            <div class="input-group">
                                <label class="input-label" for="agro-operational-unit-type">Unidad</label>
                                <select id="agro-operational-unit-type" class="styled-input">
                                    ${createOptionsMarkup(UNIT_TYPE_OPTIONS, '', 'Sin unidad')}
                                </select>
                            </div>

                            <div class="agro-operational-edit-row agro-operational-form-grid input-group--full" id="agro-operational-edit-row">
                                <div class="input-group">
                                    <label class="input-label" for="agro-operational-status">Estado</label>
                                    <select id="agro-operational-status" class="styled-input">
                                        ${createOptionsMarkup(STATUS_OPTIONS, 'open')}
                                    </select>
                                </div>
                                <div class="input-group input-group--full">
                                    <label class="input-label" for="agro-operational-notes">Observaciones posteriores</label>
                                    <textarea id="agro-operational-notes" class="styled-input" placeholder="Notas internas posteriores al crear el ciclo."></textarea>
                                </div>
                            </div>
                        </div>

                        <div class="agro-operational-inline-meta">
                            <div class="agro-operational-impact" id="agro-operational-impact">
                                <span>Impacto inicial</span>
                                <span class="agro-operational-impact__badge is-out" id="agro-operational-impact-badge">Salida</span>
                            </div>
                            <label class="agro-operational-close-toggle" id="agro-operational-close-toggle">
                                <input type="checkbox" id="agro-operational-close-on-save">
                                <span>Cerrar al guardar</span>
                            </label>
                        </div>

                        <div class="agro-operational-form-actions">
                            <button type="button" class="btn" id="agro-operational-cancel-btn" hidden>Cancelar edicion</button>
                            <button type="submit" class="btn btn-primary" id="agro-operational-submit-btn">Crear ciclo operativo</button>
                        </div>
                    </form>
                </section>

                <aside class="agro-operational-panel">
                    <div class="agro-operational-panel__head">
                        <div>
                            <p class="agro-operational-panel__eyebrow">Resumen base</p>
                            <h3 class="agro-operational-panel__title">Lectura rapida del MVP</h3>
                            <p class="agro-operational-panel__copy">El balance agrega entradas y salidas registradas por moneda. Si un monto falta, no se fuerza ni se inventa.</p>
                        </div>
                    </div>

                    <div class="agro-operational-summary-grid">
                        <article class="agro-operational-summary-card">
                            <span class="agro-operational-summary-card__label">Total ciclos</span>
                            <strong class="agro-operational-summary-card__value" id="agro-operational-summary-total">0</strong>
                            <p class="agro-operational-summary-card__hint">Ciclos operativos visibles para este usuario.</p>
                        </article>
                        <article class="agro-operational-summary-card">
                            <span class="agro-operational-summary-card__label">Cerrados</span>
                            <strong class="agro-operational-summary-card__value" id="agro-operational-summary-closed">0</strong>
                            <p class="agro-operational-summary-card__hint">Ciclos que terminaron en estado cerrado.</p>
                        </article>
                        <article class="agro-operational-summary-card">
                            <span class="agro-operational-summary-card__label">Con cultivo</span>
                            <strong class="agro-operational-summary-card__value" id="agro-operational-summary-linked">0</strong>
                            <p class="agro-operational-summary-card__hint">Ciclos amarrados a un cultivo valido del usuario.</p>
                        </article>
                        <article class="agro-operational-summary-card">
                            <span class="agro-operational-summary-card__label">Balance neto</span>
                            <strong class="agro-operational-summary-card__value" id="agro-operational-summary-balance">Sin balance monetario</strong>
                            <p class="agro-operational-summary-card__hint" id="agro-operational-summary-breakdown">Entradas: Sin monto · Salidas: Sin monto</p>
                        </article>
                    </div>
                </aside>
            </div>

            <section class="agro-operational-list-section">
                <div class="agro-operational-list-head">
                    <div>
                        <p class="agro-operational-list-eyebrow">Lista visible</p>
                        <h3 class="agro-operational-list-title">Tarjetas de ciclos</h3>
                        <p class="agro-operational-list-copy">Cada tarjeta muestra tipo economico, categoria, monto base, balance y acciones principales.</p>
                    </div>
                    <button type="button" class="btn" id="agro-operational-scroll-form-btn">Volver al formulario</button>
                </div>
                <p class="agro-operational-list-section__status" id="agro-operational-list-status">Cargando ciclos operativos...</p>
                <div class="agro-operational-list" id="agro-operational-list"></div>
            </section>
        </div>
    `;

    state.refs = {
        form: document.getElementById('agro-operational-form'),
        formPanel: document.getElementById('agro-operational-form-panel'),
        formEyebrow: document.getElementById('agro-operational-form-eyebrow'),
        formTitle: document.getElementById('agro-operational-form-title'),
        formCopy: document.getElementById('agro-operational-form-copy'),
        feedback: document.getElementById('agro-operational-feedback'),
        newButton: document.getElementById('agro-operational-new-btn'),
        refreshButton: document.getElementById('agro-operational-refresh-btn'),
        scrollFormButton: document.getElementById('agro-operational-scroll-form-btn'),
        list: document.getElementById('agro-operational-list'),
        listStatus: document.getElementById('agro-operational-list-status'),
        totalValue: document.getElementById('agro-operational-summary-total'),
        closedValue: document.getElementById('agro-operational-summary-closed'),
        linkedValue: document.getElementById('agro-operational-summary-linked'),
        balanceValue: document.getElementById('agro-operational-summary-balance'),
        balanceBreakdown: document.getElementById('agro-operational-summary-breakdown'),
        name: document.getElementById('agro-operational-name'),
        crop: document.getElementById('agro-operational-crop'),
        description: document.getElementById('agro-operational-description'),
        economicType: document.getElementById('agro-operational-economic-type'),
        category: document.getElementById('agro-operational-category'),
        amount: document.getElementById('agro-operational-amount'),
        currency: document.getElementById('agro-operational-currency'),
        date: document.getElementById('agro-operational-date'),
        quantity: document.getElementById('agro-operational-quantity'),
        unitType: document.getElementById('agro-operational-unit-type'),
        editRow: document.getElementById('agro-operational-edit-row'),
        status: document.getElementById('agro-operational-status'),
        notes: document.getElementById('agro-operational-notes'),
        impactBadge: document.getElementById('agro-operational-impact-badge'),
        closeToggle: document.getElementById('agro-operational-close-toggle'),
        closeOnSave: document.getElementById('agro-operational-close-on-save'),
        cancelButton: document.getElementById('agro-operational-cancel-btn'),
        submitButton: document.getElementById('agro-operational-submit-btn')
    };
}

function renderCropOptions(selectedValue = '') {
    const select = state.refs?.crop;
    if (!select) return;

    const selected = normalizeId(selectedValue);
    const options = ['<option value="">General (sin asociar)</option>'];
    state.crops.forEach((crop) => {
        const display = buildCropDisplay(crop);
        const isSelected = display.id === selected ? ' selected' : '';
        options.push(`<option value="${escapeAttr(display.id)}"${isSelected}>${escapeHtml(display.label)}</option>`);
    });
    select.innerHTML = options.join('');
}

function renderSummary() {
    const total = state.cycles.length;
    const closed = state.cycles.filter((cycle) => cycle.status === 'closed').length;
    const linked = state.cycles.filter((cycle) => !!cycle.crop_id).length;

    const incoming = createMoneyBucket();
    const outgoing = createMoneyBucket();
    state.cycles.forEach((cycle) => {
        mergeMoneyBuckets(incoming, cycle.summary.incoming);
        mergeMoneyBuckets(outgoing, cycle.summary.outgoing);
    });

    const balance = subtractMoneyBuckets(incoming, outgoing);

    if (state.refs?.totalValue) state.refs.totalValue.textContent = String(total);
    if (state.refs?.closedValue) state.refs.closedValue.textContent = String(closed);
    if (state.refs?.linkedValue) state.refs.linkedValue.textContent = String(linked);
    if (state.refs?.balanceValue) {
        state.refs.balanceValue.textContent = formatMoneyBucket(balance, { signed: true, emptyText: 'Sin balance monetario' });
    }
    if (state.refs?.balanceBreakdown) {
        state.refs.balanceBreakdown.textContent = `Entradas: ${formatMoneyBucket(incoming)} · Salidas: ${formatMoneyBucket(outgoing)}`;
    }
}

function buildStatusClass(status) {
    return STATUS_CLASS_BY_VALUE[normalizeToken(status)] || 'is-open';
}

function renderMovementRows(cycle) {
    if (!Array.isArray(cycle.movements) || cycle.movements.length === 0) {
        return `
            <div class="agro-operational-empty">
                <div class="agro-operational-empty__icon"><i class="fa-solid fa-file-circle-question" aria-hidden="true"></i></div>
                <p class="agro-operational-empty__title">Sin movimientos</p>
                <p class="agro-operational-empty__copy">Este ciclo todavia no tiene movimientos visibles.</p>
            </div>
        `;
    }

    return `
        <div class="agro-operational-detail-list">
            ${cycle.movements.map((movement) => {
                const direction = movement.direction === 'in' ? 'Entrada' : 'Salida';
                const amountText = movement.amount == null
                    ? 'Monto: No registrado'
                    : `Monto: ${formatCurrencyValue(movement.amount, movement.currency)}`;
                const quantityText = movement.quantity != null && movement.unit_type
                    ? ` · Cantidad: ${movement.quantity} ${movement.unit_type}`
                    : '';

                return `
                    <article class="agro-operational-detail-item">
                        <span class="agro-operational-movement-badge ${movement.direction === 'in' ? 'is-in' : 'is-out'}">${direction}</span>
                        <div>
                            <p class="agro-operational-detail-item__concept">${escapeHtml(movement.concept || cycle.name)}</p>
                            <p class="agro-operational-detail-item__meta">${escapeHtml(formatDateLabel(movement.movement_date))} · ${escapeHtml(amountText)}${escapeHtml(quantityText)}</p>
                        </div>
                    </article>
                `;
            }).join('')}
        </div>
    `;
}

function renderList() {
    const list = state.refs?.list;
    const listStatus = state.refs?.listStatus;
    if (!list || !listStatus) return;

    if (state.loading) {
        listStatus.textContent = 'Cargando ciclos operativos...';
        list.innerHTML = `
            <div class="agro-operational-panel">
                <div class="agro-operational-loading">
                    <span class="agro-operational-loading__spinner" aria-hidden="true"></span>
                    <span>Consultando ciclos y movimientos...</span>
                </div>
            </div>
        `;
        return;
    }

    if (state.schemaMissing) {
        listStatus.textContent = 'La vista quedo lista, pero la base de datos aun no tiene la migracion aplicada.';
        list.innerHTML = `
            <div class="agro-operational-empty">
                <div class="agro-operational-empty__icon"><i class="fa-solid fa-database" aria-hidden="true"></i></div>
                <p class="agro-operational-empty__title">Migracion pendiente</p>
                <p class="agro-operational-empty__copy">Aplica la migracion canónica de Supabase para habilitar <code>agro_operational_cycles</code> y <code>agro_operational_movements</code>.</p>
            </div>
        `;
        return;
    }

    if (state.cycles.length === 0) {
        listStatus.textContent = 'No hay ciclos operativos registrados todavia.';
        list.innerHTML = `
            <div class="agro-operational-empty">
                <div class="agro-operational-empty__icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></div>
                <p class="agro-operational-empty__title">Sin ciclos operativos</p>
                <p class="agro-operational-empty__copy">Crea el primer ciclo con el formulario rapido. Puedes cerrar el registro al guardar si ya fue resuelto.</p>
                <div class="agro-operational-empty__cta">
                    <button type="button" class="btn btn-primary" data-operational-action="focus-form">Crear primer ciclo</button>
                </div>
            </div>
        `;
        return;
    }

    listStatus.textContent = `${state.cycles.length} ciclo${state.cycles.length === 1 ? '' : 's'} visible${state.cycles.length === 1 ? '' : 's'}.`;
    list.innerHTML = state.cycles.map((cycle) => {
        const cropText = cycle.crop?.label || 'General';
        const primaryAmount = cycle.primaryMovement?.amount == null
            ? 'Monto: No registrado'
            : `Monto: ${formatCurrencyValue(cycle.primaryMovement.amount, cycle.primaryMovement.currency)}`;
        const dates = cycle.closed_at
            ? `${formatDateLabel(cycle.opened_at)} · Cierre: ${formatDateLabel(cycle.closed_at)}`
            : `${formatDateLabel(cycle.opened_at)} · Sin cierre`;

        return `
            <article class="agro-operational-card" data-cycle-id="${escapeAttr(cycle.id)}">
                <div class="agro-operational-card__head">
                    <div>
                        <p class="agro-operational-card__eyebrow">${escapeHtml(readLabel(ECONOMIC_TYPE_OPTIONS, cycle.economic_type, 'Operacion'))} · ${escapeHtml(readLabel(CATEGORY_OPTIONS, cycle.category, 'Categoria'))}</p>
                        <h3 class="agro-operational-card__title">${escapeHtml(cycle.name)}</h3>
                        <p class="agro-operational-card__meta">${escapeHtml(cropText)} · ${escapeHtml(dates)}</p>
                    </div>
                    <div class="agro-operational-card__badges">
                        <span class="agro-operational-status ${buildStatusClass(cycle.status)}">${escapeHtml(readLabel(STATUS_OPTIONS, cycle.status, 'Abierto'))}</span>
                        <span class="agro-operational-pill">${escapeHtml(cycle.primaryMovement?.direction === 'in' ? 'Entrada' : 'Salida')}</span>
                    </div>
                </div>

                ${cycle.description ? `<p class="agro-operational-card__description">${escapeHtml(cycle.description)}</p>` : ''}
                ${cycle.notes ? `<p class="agro-operational-card__notes"><strong>Notas:</strong> ${escapeHtml(cycle.notes)}</p>` : ''}

                <div class="agro-operational-money-grid">
                    <div class="agro-operational-money-cell" data-tone="gold">
                        <span class="agro-operational-money-cell__label">Monto base</span>
                        <strong class="agro-operational-money-cell__value">${escapeHtml(primaryAmount)}</strong>
                    </div>
                    <div class="agro-operational-money-cell">
                        <span class="agro-operational-money-cell__label">Entradas</span>
                        <strong class="agro-operational-money-cell__value">${escapeHtml(cycle.incomingText)}</strong>
                    </div>
                    <div class="agro-operational-money-cell">
                        <span class="agro-operational-money-cell__label">Salidas</span>
                        <strong class="agro-operational-money-cell__value">${escapeHtml(cycle.outgoingText)}</strong>
                    </div>
                    <div class="agro-operational-money-cell" data-tone="${escapeAttr(cycle.balanceTone)}">
                        <span class="agro-operational-money-cell__label">Balance</span>
                        <strong class="agro-operational-money-cell__value">${escapeHtml(cycle.balanceText)}</strong>
                    </div>
                </div>

                <div class="agro-operational-card__footer">
                    <div class="agro-operational-card__support">
                        <span class="agro-operational-card__support-item"><i class="fa-solid fa-list-check" aria-hidden="true"></i> ${cycle.movementCount} movimiento${cycle.movementCount === 1 ? '' : 's'}</span>
                        <span class="agro-operational-card__support-item"><i class="fa-solid fa-tag" aria-hidden="true"></i> ${escapeHtml(readLabel(CATEGORY_OPTIONS, cycle.category, 'Categoria'))}</span>
                    </div>
                    <div class="agro-operational-card__actions">
                        <button type="button" class="btn" data-operational-action="edit" data-cycle-id="${escapeAttr(cycle.id)}">Editar</button>
                        <button type="button" class="btn btn-primary" data-operational-action="delete" data-cycle-id="${escapeAttr(cycle.id)}">Eliminar</button>
                    </div>
                </div>

                <details class="agro-operational-card__details">
                    <summary>
                        <span>Historial del ciclo</span>
                        <span>${cycle.movementCount} registro${cycle.movementCount === 1 ? '' : 's'}</span>
                    </summary>
                    ${renderMovementRows(cycle)}
                </details>
            </article>
        `;
    }).join('');
}

function updateImpactPreview() {
    const badge = state.refs?.impactBadge;
    if (!badge) return;
    const direction = deriveMovementDirection(state.refs?.economicType?.value);
    badge.textContent = direction === 'in' ? 'Entrada' : 'Salida';
    badge.classList.toggle('is-in', direction === 'in');
    badge.classList.toggle('is-out', direction !== 'in');
}

function updateSubmitButtonLabel() {
    const submitButton = state.refs?.submitButton;
    if (!submitButton) return;

    if (state.editId) {
        submitButton.textContent = 'Guardar cambios';
        return;
    }

    submitButton.textContent = state.refs?.closeOnSave?.checked
        ? 'Crear y cerrar'
        : 'Crear ciclo operativo';
}

function fillForm(payload = {}) {
    if (!state.refs) return;
    state.refs.name.value = payload.name || '';
    state.refs.crop.value = normalizeId(payload.cropId || payload.crop_id);
    state.refs.description.value = payload.description || '';
    state.refs.economicType.value = payload.economicType || payload.economic_type || 'expense';
    state.refs.category.value = payload.category || 'other';
    state.refs.amount.value = payload.amount == null ? '' : String(payload.amount);
    state.refs.currency.value = payload.currency || 'COP';
    state.refs.date.value = payload.movementDate || payload.movement_date || payload.openedAt || payload.opened_at || todayLocalIso();
    state.refs.quantity.value = payload.quantity == null ? '' : String(payload.quantity);
    state.refs.unitType.value = payload.unitType || payload.unit_type || '';
    state.refs.status.value = payload.status || 'open';
    state.refs.notes.value = payload.notes || '';
    state.refs.closeOnSave.checked = payload.status === 'closed';
    updateImpactPreview();
    updateSubmitButtonLabel();
}

function setFormModeCreate() {
    state.editId = '';
    if (!state.refs) return;
    state.refs.formEyebrow.textContent = 'Modo rapido';
    state.refs.formTitle.textContent = 'Crear ciclo operativo';
    state.refs.formCopy.textContent = 'Crea el ciclo, registra el movimiento inicial y cierralo en un solo paso si ya quedo resuelto.';
    state.refs.closeToggle.hidden = false;
    state.refs.editRow.classList.remove('is-visible');
    state.refs.cancelButton.hidden = true;
    fillForm({
        economicType: state.refs.economicType?.value || 'expense',
        category: state.refs.category?.value || 'other',
        currency: state.refs.currency?.value || 'COP',
        movementDate: todayLocalIso()
    });
}

function setFormModeEdit(cycle) {
    state.editId = normalizeId(cycle?.id);
    if (!state.refs || !state.editId) return;
    state.refs.formEyebrow.textContent = 'Edicion';
    state.refs.formTitle.textContent = 'Editar ciclo operativo';
    state.refs.formCopy.textContent = 'Puedes ajustar clasificacion, cultivo, monto base, estado y observaciones posteriores.';
    state.refs.closeToggle.hidden = true;
    state.refs.editRow.classList.add('is-visible');
    state.refs.cancelButton.hidden = false;
    fillForm({
        name: cycle.name,
        cropId: cycle.crop_id,
        description: cycle.description,
        economicType: cycle.economic_type,
        category: cycle.category,
        amount: cycle.primaryMovement?.amount,
        currency: cycle.primaryMovement?.currency || 'COP',
        movementDate: cycle.primaryMovement?.movement_date || cycle.opened_at || todayLocalIso(),
        quantity: cycle.primaryMovement?.quantity,
        unitType: cycle.primaryMovement?.unit_type,
        status: cycle.status,
        notes: cycle.notes
    });
}

function resetForm() {
    clearFeedback();
    renderCropOptions('');
    setFormModeCreate();
}

function focusForm() {
    const target = state.refs?.formPanel;
    if (!target) return;
    target.scrollIntoView({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth',
        block: 'start'
    });
    window.requestAnimationFrame(() => {
        state.refs?.name?.focus();
    });
}

function setControlsDisabled(disabled) {
    const form = state.refs?.form;
    if (!form) return;
    form.querySelectorAll('input, select, textarea, button').forEach((element) => {
        element.disabled = !!disabled;
    });
}

function readFormPayload() {
    return normalizePayload({
        name: state.refs?.name?.value,
        cropId: state.refs?.crop?.value,
        description: state.refs?.description?.value,
        economicType: state.refs?.economicType?.value,
        category: state.refs?.category?.value,
        amount: state.refs?.amount?.value,
        currency: state.refs?.currency?.value,
        movementDate: state.refs?.date?.value,
        quantity: state.refs?.quantity?.value,
        unitType: state.refs?.unitType?.value,
        status: state.editId ? state.refs?.status?.value : undefined,
        notes: state.editId ? state.refs?.notes?.value : undefined,
        closeOnSave: !state.editId && !!state.refs?.closeOnSave?.checked
    }, {
        mode: state.editId ? 'edit' : 'create',
        existingCycle: state.cycles.find((cycle) => cycle.id === state.editId) || null
    });
}

async function refreshData(options = {}) {
    if (!state.root || state.loading) return;

    state.loading = true;
    state.schemaMissing = false;
    renderList();

    try {
        const supabase = await getSupabaseClient();
        const userId = await ensureUserId(options.initialUserId);
        const [crops, cycles] = await Promise.all([
            fetchCrops(supabase, userId),
            fetchCycles(supabase, userId)
        ]);

        const cycleIds = cycles.map((cycle) => normalizeId(cycle.id)).filter(Boolean);
        const movements = await fetchMovements(supabase, userId, cycleIds);
        const cropMap = new Map(crops.map((crop) => {
            const display = buildCropDisplay(crop);
            return [display.id, display];
        }));
        const movementMap = new Map();
        movements.forEach((movement) => {
            const cycleId = normalizeId(movement?.cycle_id);
            if (!movementMap.has(cycleId)) {
                movementMap.set(cycleId, []);
            }
            movementMap.get(cycleId).push(movement);
        });

        state.crops = crops;
        state.cycles = cycles.map((cycle) => buildCycleViewModel(cycle, movementMap, cropMap));

        renderCropOptions(state.refs?.crop?.value);
        renderSummary();
        renderList();

        if (state.editId) {
            const current = state.cycles.find((cycle) => cycle.id === state.editId);
            if (current) {
                setFormModeEdit(current);
            } else {
                resetForm();
            }
        }
    } catch (error) {
        state.schemaMissing = isSchemaMissingError(error);
        state.crops = [];
        state.cycles = [];
        renderCropOptions('');
        renderSummary();
        renderList();
        setFeedback(normalizeOperationalError(error), 'error');
    } finally {
        state.loading = false;
        setControlsDisabled(state.schemaMissing || state.saving);
        renderList();
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    if (state.saving) return;

    clearFeedback();
    state.saving = true;
    setControlsDisabled(true);

    try {
        const payload = readFormPayload();
        const result = state.editId
            ? await updateCycleRecord(state.editId, payload)
            : await createCycleRecord(payload);

        await refreshData();
        resetForm();
        setFeedback(result.message, 'success');
        notify(result.message, 'success');
    } catch (error) {
        const message = normalizeOperationalError(error);
        setFeedback(message, 'error');
        notify(message, 'error');
    } finally {
        state.saving = false;
        setControlsDisabled(state.schemaMissing || false);
    }
}

async function handleListClick(event) {
    const button = event.target.closest('[data-operational-action]');
    if (!button) return;

    const action = button.dataset.operationalAction;
    if (action === 'focus-form') {
        focusForm();
        return;
    }

    const cycleId = normalizeId(button.dataset.cycleId);
    if (!cycleId) return;

    if (action === 'edit') {
        const cycle = state.cycles.find((item) => item.id === cycleId);
        if (!cycle) return;
        clearFeedback();
        setFormModeEdit(cycle);
        focusForm();
        return;
    }

    if (action === 'delete') {
        clearFeedback();
        try {
            const result = await deleteCycleRecord(cycleId);
            if (result?.skipped) return;
            await refreshData();
            if (state.editId === cycleId) {
                resetForm();
            }
            setFeedback(result.message, result.cascadeVerified === false ? 'info' : 'success');
            notify(result.message, result.cascadeVerified === false ? 'warning' : 'success');
        } catch (error) {
            const message = normalizeOperationalError(error);
            setFeedback(message, 'error');
            notify(message, 'error');
        }
    }
}

function bindEvents() {
    if (!state.refs || state.root?.dataset.operationalBound === '1') return;

    state.refs.form?.addEventListener('submit', handleFormSubmit);
    state.refs.economicType?.addEventListener('change', updateImpactPreview);
    state.refs.closeOnSave?.addEventListener('change', updateSubmitButtonLabel);
    state.refs.cancelButton?.addEventListener('click', resetForm);
    state.refs.refreshButton?.addEventListener('click', () => refreshData());
    state.refs.newButton?.addEventListener('click', () => {
        resetForm();
        focusForm();
    });
    state.refs.scrollFormButton?.addEventListener('click', focusForm);
    state.refs.list?.addEventListener('click', handleListClick);

    window.addEventListener(VIEW_CHANGED_EVENT, (event) => {
        state.currentView = normalizeToken(event?.detail?.view);
        if (state.currentView === VIEW_NAME) {
            refreshData();
        }
    });

    window.addEventListener(CROPS_READY_EVENT, () => {
        if (state.currentView === VIEW_NAME) {
            refreshData();
        }
    });

    state.root.dataset.operationalBound = '1';
}

function buildDebugSnapshot() {
    return {
        userId: state.userId,
        currentView: state.currentView,
        schemaMissing: state.schemaMissing,
        loading: state.loading,
        saving: state.saving,
        editId: state.editId,
        lastCascadeCheck: state.lastCascadeCheck,
        crops: state.crops.map((crop) => buildCropDisplay(crop)),
        cycles: state.cycles.map((cycle) => ({
            id: cycle.id,
            name: cycle.name,
            economic_type: cycle.economic_type,
            category: cycle.category,
            crop_id: cycle.crop_id,
            crop_label: cycle.crop?.label || 'General',
            status: cycle.status,
            movementCount: cycle.movementCount,
            primaryAmount: cycle.primaryMovement?.amount ?? null,
            primaryCurrency: cycle.primaryMovement?.currency || 'COP',
            incomingText: cycle.incomingText,
            outgoingText: cycle.outgoingText,
            balanceText: cycle.balanceText
        }))
    };
}

async function ensureInitialized(options = {}) {
    if (!state.initialized) {
        await initAgroOperationalCycles(options);
        return;
    }
    if (options.initialUserId) {
        state.userId = normalizeId(options.initialUserId);
    }
}

async function createFromPayload(payload = {}) {
    await ensureInitialized();
    const normalized = normalizePayload(payload, { mode: 'create' });
    const result = await createCycleRecord(normalized);
    await refreshData();
    return result;
}

async function updateById(cycleId, payload = {}) {
    await ensureInitialized();
    const existingCycle = state.cycles.find((cycle) => cycle.id === normalizeId(cycleId));
    const normalized = normalizePayload(payload, {
        mode: 'edit',
        existingCycle
    });
    const result = await updateCycleRecord(normalizeId(cycleId), normalized);
    await refreshData();
    return result;
}

async function deleteById(cycleId, options = {}) {
    await ensureInitialized();
    const result = await deleteCycleRecord(normalizeId(cycleId), {
        skipConfirm: options.skipConfirm !== false
    });
    await refreshData();
    return result;
}

function exposeGlobalApi() {
    if (typeof window === 'undefined') return;
    window.YGAgroOperationalCycles = {
        init: initAgroOperationalCycles,
        refresh: () => refreshData(),
        getSnapshot: buildDebugSnapshot,
        createFromPayload,
        updateById,
        deleteById,
        openView: () => {
            window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
                detail: {
                    view: VIEW_NAME,
                    scroll: true
                }
            }));
        }
    };
}

export async function initAgroOperationalCycles(options = {}) {
    state.root = document.getElementById(ROOT_ID);
    if (!state.root) return null;

    if (!state.initialized) {
        renderShell();
        bindEvents();
        state.initialized = true;
    }

    if (options.initialUserId) {
        state.userId = normalizeId(options.initialUserId);
    }

    exposeGlobalApi();
    updateImpactPreview();
    updateSubmitButtonLabel();
    renderCropOptions(state.refs?.crop?.value);
    renderSummary();
    renderList();

    state.currentView = normalizeToken(document.body?.dataset?.agroActiveView || state.currentView);
    await refreshData({ initialUserId: options.initialUserId });

    return {
        refresh: () => refreshData(),
        getSnapshot: buildDebugSnapshot
    };
}
