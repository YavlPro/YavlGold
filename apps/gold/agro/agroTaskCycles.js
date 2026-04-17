import { supabase } from '../assets/js/config/supabase-config.js';

const ROOT_ID = 'agro-task-cycles-root';
const VIEW_NAME = 'task-cycles';
const VIEW_CHANGED_EVENT = 'agro:shell:view-changed';
const CROPS_READY_EVENT = 'AGRO_CROPS_READY';
const MODE_CHANGE_EVENT = 'agro:modechange';
const TASKS_TABLE = 'agro_task_cycles';
const TASK_SCHEMA_MISSING_COPY = 'Aplica la migración de Ciclos de Tareas para habilitar este módulo.';

const TASK_TYPE_OPTIONS = Object.freeze([
    { value: 'jornal', label: 'Jornal' },
    { value: 'fumigacion', label: 'Fumigación' },
    { value: 'riego', label: 'Riego' },
    { value: 'deshierbe', label: 'Deshierbe' },
    { value: 'cosecha', label: 'Cosecha' },
    { value: 'siembra', label: 'Siembra' },
    { value: 'compra_traslado', label: 'Compra / traslado' },
    { value: 'revision', label: 'Revisión' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'otra', label: 'Otra' }
]);

const CROP_DISPLAY_FALLBACK_ICON = '🌱';
const CROP_DISPLAY_FALLBACK_NAME = 'Cultivo';
const CROP_EMOJI_TOKEN_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
const CROP_TEXT_TOKEN_RE = /[\p{L}\p{N}]/u;

const ECONOMIC_EFFECT_OPTIONS = Object.freeze([
    { value: 'none', label: 'Sin impacto económico' },
    { value: 'expense', label: 'Gasto' },
    { value: 'income', label: 'Ingreso' },
    { value: 'loss', label: 'Pérdida' },
    { value: 'pending', label: 'Fiado' }
]);

const LIST_RANGE_OPTIONS = Object.freeze([
    { value: 'all', label: 'Todo' },
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' }
]);

const STATS_RANGE_OPTIONS = Object.freeze([
    { value: 'today', label: 'Diaria' },
    { value: 'week', label: 'Semanal' },
    { value: 'month', label: 'Mensual' },
    { value: 'year', label: 'Anual' }
]);

const MODULE_TAB_OPTIONS = Object.freeze([
    { value: 'tasks', label: 'Tareas' },
    { value: 'stats', label: 'Estadísticas' }
]);

const TASK_STATUS_OPTIONS = Object.freeze([
    { value: 'pending', label: 'Pendiente' },
    { value: 'active', label: 'Activa' },
    { value: 'completed', label: 'Finalizada' },
    { value: 'not_executed', label: 'No ejecutada' }
]);

const TASK_STATUS_FILTER_OPTIONS = Object.freeze([
    { value: 'pending', label: 'Pendientes' },
    { value: 'active', label: 'Activas' },
    { value: 'completed', label: 'Finalizadas' },
    { value: 'not_executed', label: 'No ejecutadas' },
    { value: 'all', label: 'Todas' }
]);

const DURATION_UNIT_OPTIONS = Object.freeze([
    { value: 'minutes', label: 'Minutos' },
    { value: 'hours', label: 'Horas' }
]);

const CURRENCY_OPTIONS = Object.freeze(['COP', 'USD', 'VES']);
const EFFECT_TONE_CLASS = Object.freeze({
    none: 'is-none',
    expense: 'is-expense',
    income: 'is-income',
    loss: 'is-loss',
    pending: 'is-pending'
});
const TASK_STATUS_TONE_CLASS = Object.freeze({
    pending: 'is-task-pending',
    active: 'is-task-active',
    completed: 'is-task-completed',
    not_executed: 'is-task-not-executed'
});

const state = {
    root: null,
    refs: null,
    initialized: false,
    currentView: '',
    userId: '',
    tasks: [],
    crops: [],
    cropDeletedAtSupported: true,
    loading: false,
    loadedOnce: false,
    saving: false,
    schemaMissing: false,
    modalOpen: false,
    deleteConfirmOpen: false,
    editId: '',
    deleteId: '',
    activeTab: 'tasks',
    statsRange: 'month',
    listFilters: createDefaultListFilters(),
    form: createFormState(),
    pageFeedback: { message: '', tone: 'info' },
    modalFeedback: { message: '', tone: 'info' }
};

function createDefaultListFilters() {
    return {
        status: 'all',
        search: '',
        range: 'all',
        taskType: 'all',
        effect: 'all',
        cropId: 'all'
    };
}

function createDraftValues(overrides = {}) {
    return {
        title: '',
        taskType: 'jornal',
        taskDate: todayLocalIso(),
        cropId: '',
        durationValue: '',
        durationUnit: 'minutes',
        taskStatus: 'completed',
        economicEffect: 'none',
        amount: '',
        currency: 'COP',
        notes: '',
        ...overrides
    };
}

function createFormState(overrides = {}) {
    return {
        mode: 'create',
        values: createDraftValues(),
        ...overrides
    };
}

function normalizeToken(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeId(value) {
    return String(value || '').trim();
}

function normalizeSearchToken(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

function normalizeTaskType(value) {
    const token = normalizeToken(value);
    return TASK_TYPE_OPTIONS.some((option) => option.value === token) ? token : 'otra';
}

function normalizeEconomicEffect(value) {
    const token = normalizeToken(value);
    return ECONOMIC_EFFECT_OPTIONS.some((option) => option.value === token) ? token : 'none';
}

function normalizeCurrency(value, fallback = 'COP') {
    const token = String(value || '').trim().toUpperCase();
    if (!token) return fallback === '' ? '' : 'COP';
    return CURRENCY_OPTIONS.includes(token) ? token : (fallback === '' ? '' : 'COP');
}

function normalizeListRange(value) {
    const token = normalizeToken(value);
    return LIST_RANGE_OPTIONS.some((option) => option.value === token) ? token : 'all';
}

function normalizeStatsRange(value) {
    const token = normalizeToken(value);
    return STATS_RANGE_OPTIONS.some((option) => option.value === token) ? token : 'month';
}

function normalizeModuleTab(value) {
    const token = normalizeToken(value);
    return MODULE_TAB_OPTIONS.some((option) => option.value === token) ? token : 'tasks';
}

function normalizeTaskStatus(value) {
    const token = normalizeToken(value);
    return TASK_STATUS_OPTIONS.some((option) => option.value === token) ? token : 'completed';
}

function normalizeDurationUnit(value) {
    const token = normalizeToken(value);
    return DURATION_UNIT_OPTIONS.some((option) => option.value === token) ? token : 'minutes';
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

function renderMoneyNode(value, { tag = 'span', className = '' } = {}) {
    const safeValue = String(value ?? '').trim();
    const classAttr = className ? ` class="${escapeAttr(className)}"` : '';
    if (!safeValue) return `<${tag}${classAttr}></${tag}>`;
    if (!/\d/.test(safeValue)) {
        return `<${tag}${classAttr}>${escapeHtml(safeValue)}</${tag}>`;
    }
    return `<${tag}${classAttr} data-money="1" data-raw-money="${escapeAttr(safeValue)}">${escapeHtml(safeValue)}</${tag}>`;
}

function toNullableText(value) {
    const raw = String(value ?? '').trim();
    return raw ? raw : null;
}

function ensureAllowedValue(value, allowedValues, errorMessage) {
    const token = String(value || '').trim();
    if (allowedValues.includes(token)) return token;
    throw new Error(errorMessage);
}

function toPositiveAmount(value, label) {
    const raw = String(value ?? '').trim();
    const parsed = Number(raw);
    if (!raw || !Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${label} debe ser mayor a cero.`);
    }
    return Number(parsed.toFixed(2));
}

function toOptionalNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function readLabel(options, value, fallback = 'Sin definir') {
    const token = String(value || '').trim();
    const match = options.find((option) => option.value === token);
    return match?.label || fallback;
}

function todayLocalIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

function formatDateGroupLabel(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'Sin fecha';
    if (raw === todayLocalIso()) return 'Hoy';
    const date = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('es-VE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).format(date);
}

function formatCurrencyValue(value, currency = 'COP') {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'Sin monto';
    const code = normalizeCurrency(currency, 'COP');
    const locale = code === 'USD' ? 'en-US' : (code === 'VES' ? 'es-VE' : 'es-CO');
    const fractionDigits = Number.isInteger(amount) ? 0 : 2;
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDurationMinutes(totalMinutes) {
    const minutes = Number(totalMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours <= 0) return `${mins} min`;
    if (mins <= 0) return `${hours} h`;
    return `${hours} h ${mins} min`;
}

function createDurationDraftFromMinutes(totalMinutes) {
    const minutes = Number(totalMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return {
            durationValue: '',
            durationUnit: 'minutes'
        };
    }
    if (minutes % 60 === 0) {
        return {
            durationValue: String(minutes / 60),
            durationUnit: 'hours'
        };
    }
    return {
        durationValue: String(minutes),
        durationUnit: 'minutes'
    };
}

function resolveDurationMinutes(value, unit) {
    const raw = String(value ?? '').trim();
    const parsed = Number(raw);
    if (!raw || !Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('La duración debe ser un número mayor a cero.');
    }

    const normalizedUnit = normalizeDurationUnit(unit);
    const durationMinutes = normalizedUnit === 'hours'
        ? Math.round(parsed * 60)
        : Math.round(parsed);

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        throw new Error('La duración debe ser un número mayor a cero.');
    }
    return durationMinutes;
}

function resolveDraftDurationText(values = {}) {
    try {
        const durationMinutes = resolveDurationMinutes(values.durationValue, values.durationUnit);
        return formatDurationMinutes(durationMinutes);
    } catch (_error) {
        return 'Sin tiempo';
    }
}

function buildRangeBounds(range) {
    const token = normalizeListRange(range);
    if (token === 'all') return null;

    const today = new Date();
    const end = todayLocalIso();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (token === 'week') {
        const weekday = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - weekday);
    } else if (token === 'month') {
        start.setDate(1);
    } else if (token === 'year') {
        start.setMonth(0, 1);
    }

    const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    return { start: startIso, end };
}

function isDateWithinRange(dateValue, range) {
    const raw = String(dateValue || '').trim();
    if (!raw) return false;
    const bounds = buildRangeBounds(range);
    if (!bounds) return true;
    return raw >= bounds.start && raw <= bounds.end;
}

function isMissingColumnError(error, columnName) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes(String(columnName || '').toLowerCase());
}

function isSchemaMissingError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes(TASKS_TABLE)
        || message.includes('does not exist')
        || message.includes('could not find')
        || isMissingColumnError(error, 'task_status')
        || String(error?.code || '') === '42P01';
}

function isCropEmojiToken(token) {
    const value = String(token || '').trim();
    if (!value) return false;
    return CROP_EMOJI_TOKEN_RE.test(value) && !CROP_TEXT_TOKEN_RE.test(value);
}

function normalizeCropIcon(icon, fallback = CROP_DISPLAY_FALLBACK_ICON) {
    const value = String(icon || '').trim();
    if (isCropEmojiToken(value)) return value;
    return String(fallback || CROP_DISPLAY_FALLBACK_ICON).trim() || CROP_DISPLAY_FALLBACK_ICON;
}

function buildCropDisplay(crop = {}) {
    const rawName = String(crop?.name || '').trim();
    const tokens = rawName ? rawName.split(/\s+/).filter(Boolean) : [];
    const leadingIcons = [];
    let cursor = 0;

    while (cursor < tokens.length && isCropEmojiToken(tokens[cursor])) {
        leadingIcons.push(tokens[cursor]);
        cursor += 1;
    }

    const cleanedName = tokens.slice(cursor).join(' ').trim();
    const iconFromName = leadingIcons.length ? leadingIcons[leadingIcons.length - 1] : '';
    const icon = normalizeCropIcon(iconFromName || crop?.icon);
    const name = cleanedName || (rawName && leadingIcons.length === 0 ? rawName : CROP_DISPLAY_FALLBACK_NAME);
    const variety = String(crop?.variety || '').trim();
    return {
        id: normalizeId(crop?.id),
        icon,
        name,
        variety,
        label: variety ? `${icon} ${name} (${variety})` : `${icon} ${name}`,
        shortLabel: name
    };
}

function resolveCropInfo(cropId) {
    const normalizedId = normalizeId(cropId);
    if (!normalizedId) {
        return {
            id: '',
            label: 'Sin cultivo asociado',
            shortLabel: 'Sin cultivo',
            missing: false
        };
    }
    const crop = state.crops.find((item) => buildCropDisplay(item).id === normalizedId);
    if (!crop) {
        return {
            id: normalizedId,
            label: 'Cultivo no disponible',
            shortLabel: 'No disponible',
            missing: true
        };
    }
    const display = buildCropDisplay(crop);
    return {
        id: display.id,
        label: display.label,
        shortLabel: display.shortLabel,
        missing: false
    };
}

function buildCropOptionsMarkup(selectedValue = '') {
    const selected = normalizeId(selectedValue);
    const options = ['<option value="">Sin cultivo asociado</option>'];
    state.crops.forEach((crop) => {
        const display = buildCropDisplay(crop);
        const isSelected = display.id === selected ? ' selected' : '';
        options.push(`<option value="${escapeAttr(display.id)}"${isSelected}>${escapeHtml(display.label)}</option>`);
    });
    return options.join('');
}

function buildSelectOptionsMarkup(options, selectedValue = '') {
    return options.map((option) => {
        const isSelected = option.value === selectedValue ? ' selected' : '';
        return `<option value="${escapeAttr(option.value)}"${isSelected}>${escapeHtml(option.label)}</option>`;
    }).join('');
}

function normalizeTaskRow(row = {}) {
    return {
        id: normalizeId(row.id),
        user_id: normalizeId(row.user_id),
        crop_id: normalizeId(row.crop_id),
        title: String(row.title || '').trim() || 'Tarea',
        task_type: normalizeTaskType(row.task_type),
        task_date: String(row.task_date || '').trim() || todayLocalIso(),
        duration_minutes: Math.max(0, Number(row.duration_minutes) || 0),
        duration_label: toNullableText(row.duration_label),
        task_status: normalizeTaskStatus(row.task_status),
        economic_effect: normalizeEconomicEffect(row.economic_effect),
        amount: toOptionalNumber(row.amount),
        currency: row.currency ? normalizeCurrency(row.currency, '') : '',
        notes: toNullableText(row.notes),
        created_at: String(row.created_at || '').trim(),
        updated_at: String(row.updated_at || '').trim(),
        deleted_at: String(row.deleted_at || '').trim()
    };
}

async function ensureUserId(initialUserId = '') {
    const preferredId = normalizeId(initialUserId || state.userId || globalThis?.YG_AGRO_CROPS_USER_ID);
    if (preferredId) {
        state.userId = preferredId;
        return preferredId;
    }

    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    const userId = normalizeId(data?.user?.id);
    if (!userId) {
        throw new Error('No se pudo resolver la sesión activa de Agro.');
    }

    state.userId = userId;
    return userId;
}

async function fetchCrops(userId) {
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
        return fetchCrops(userId);
    }
    if (error) throw error;

    return (data || []).filter((crop) => !crop?.deleted_at);
}

async function validateCropId(userId, cropId) {
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
        return validateCropId(userId, normalizedId);
    }
    if (error) throw error;
    if (!data?.id) {
        throw new Error('Cultivo no válido.');
    }
    return normalizedId;
}

async function fetchTasks(userId) {
    const { data, error } = await supabase
        .from(TASKS_TABLE)
        .select('id,user_id,crop_id,title,task_type,task_date,duration_minutes,duration_label,task_status,economic_effect,amount,currency,notes,created_at,updated_at,deleted_at')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('task_date', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data.map((row) => normalizeTaskRow(row)) : [];
}

function setPageFeedback(message = '', tone = 'info') {
    state.pageFeedback = {
        message: String(message || '').trim(),
        tone: String(tone || 'info')
    };
    renderPageFeedback();
}

function setModalFeedback(message = '', tone = 'info') {
    state.modalFeedback = {
        message: String(message || '').trim(),
        tone: String(tone || 'info')
    };
    renderModalFeedback();
}

function renderPageFeedback() {
    if (!state.refs?.pageFeedback) return;
    const { message, tone } = state.pageFeedback;
    state.refs.pageFeedback.textContent = message;
    state.refs.pageFeedback.dataset.tone = tone || 'info';
    state.refs.pageFeedback.hidden = !message;
}

function renderModalFeedback() {
    if (!state.refs?.modalFeedback) return;
    const { message, tone } = state.modalFeedback;
    state.refs.modalFeedback.textContent = message;
    state.refs.modalFeedback.dataset.tone = tone || 'info';
    state.refs.modalFeedback.hidden = !message;
}

function resetForm() {
    state.form = createFormState();
    state.editId = '';
    state.saving = false;
    setModalFeedback('', 'info');
}

function openCreateModal() {
    state.form = createFormState();
    state.editId = '';
    state.modalOpen = true;
    state.saving = false;
    setModalFeedback('', 'info');
    renderComposer();
    focusFormField('agro-task-title');
}

function openEditModal(taskId) {
    const task = state.tasks.find((item) => item.id === normalizeId(taskId));
    if (!task) {
        setPageFeedback('No se encontró la tarea a editar.', 'warn');
        return;
    }

    const durationDraft = createDurationDraftFromMinutes(task.duration_minutes);
    state.form = createFormState({
        mode: 'edit',
        values: createDraftValues({
            title: task.title,
            taskType: task.task_type,
            taskDate: task.task_date,
            cropId: task.crop_id,
            ...durationDraft,
            taskStatus: task.task_status,
            economicEffect: task.economic_effect,
            amount: task.amount != null ? String(task.amount) : '',
            currency: task.currency || 'COP',
            notes: task.notes || ''
        })
    });
    state.editId = task.id;
    state.modalOpen = true;
    state.saving = false;
    setModalFeedback('', 'info');
    renderComposer();
    focusFormField('agro-task-title');
}

function closeComposerModal() {
    state.modalOpen = false;
    state.saving = false;
    setModalFeedback('', 'info');
    renderComposer();
}

function openDeleteConfirm(taskId) {
    const task = state.tasks.find((item) => item.id === normalizeId(taskId));
    if (!task) {
        setPageFeedback('No se encontró la tarea a eliminar.', 'warn');
        return;
    }
    state.deleteId = task.id;
    state.deleteConfirmOpen = true;
    renderDeleteConfirm();
    focusFormField('agro-task-delete-confirm');
}

function closeDeleteConfirm() {
    state.deleteConfirmOpen = false;
    state.deleteId = '';
    renderDeleteConfirm();
}

function syncBodyLock() {
    document.body.classList.toggle('agro-task-cycles-modal-open', state.modalOpen || state.deleteConfirmOpen);
}

function focusFormField(id) {
    requestAnimationFrame(() => {
        const node = document.getElementById(id);
        if (!node || typeof node.focus !== 'function') return;
        node.focus({ preventScroll: false });
        if (typeof node.select === 'function' && node.tagName === 'INPUT') {
            node.select();
        }
    });
}

function updateDraftFromField(field, value) {
    if (!field) return;
    state.form.values[field] = value;
    if (field === 'economicEffect') {
        syncEconomicFieldsVisibility();
    }
}

function buildSearchHaystack(task) {
    const crop = resolveCropInfo(task.crop_id);
    return normalizeSearchToken([
        task.title,
        task.notes,
        readLabel(TASK_TYPE_OPTIONS, task.task_type, task.task_type),
        readLabel(TASK_STATUS_OPTIONS, task.task_status, task.task_status),
        crop.label,
        readLabel(ECONOMIC_EFFECT_OPTIONS, task.economic_effect, task.economic_effect)
    ].filter(Boolean).join(' '));
}

function filterTasks(tasks = state.tasks, filters = state.listFilters, options = {}) {
    const search = normalizeSearchToken(filters.search);
    const taskType = normalizeTaskType(filters.taskType === 'all' ? '' : filters.taskType) || 'all';
    const effect = normalizeEconomicEffect(filters.effect === 'all' ? '' : filters.effect) || 'all';
    const cropId = normalizeId(filters.cropId);

    return tasks.filter((task) => {
        if (!isDateWithinRange(task.task_date, filters.range)) return false;
        if (!options.ignoreStatus && filters.status !== 'all' && task.task_status !== normalizeTaskStatus(filters.status)) return false;
        if (filters.taskType !== 'all' && task.task_type !== taskType) return false;
        if (filters.effect !== 'all' && task.economic_effect !== effect) return false;
        if (cropId === 'cropped' && !task.crop_id) return false;
        if (cropId === 'uncropped' && task.crop_id) return false;
        if (cropId && cropId !== 'all' && cropId !== 'uncropped' && cropId !== 'cropped' && task.crop_id !== cropId) return false;
        if (search && !buildSearchHaystack(task).includes(search)) return false;
        return true;
    });
}

function getVisibleTasks() {
    return filterTasks(state.tasks, state.listFilters);
}

function buildTaskStatusCounts() {
    const scopedTasks = filterTasks(state.tasks, state.listFilters, { ignoreStatus: true });
    const counts = {
        all: scopedTasks.length,
        pending: 0,
        active: 0,
        completed: 0,
        not_executed: 0
    };
    scopedTasks.forEach((task) => {
        const key = normalizeTaskStatus(task.task_status);
        counts[key] = Number(counts[key] || 0) + 1;
    });
    return counts;
}

function groupTasksByDate(tasks) {
    const groups = new Map();
    tasks.forEach((task) => {
        const dateKey = String(task.task_date || '').trim() || 'sin-fecha';
        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }
        groups.get(dateKey).push(task);
    });
    return Array.from(groups.entries()).map(([date, items]) => ({
        date,
        label: formatDateGroupLabel(date),
        items
    }));
}

function buildCurrencyBreakdownLabel(currencyMap) {
    if (!(currencyMap instanceof Map) || currencyMap.size === 0) {
        return 'Sin monto';
    }
    return Array.from(currencyMap.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([currency, total]) => formatCurrencyValue(total, currency))
        .join(' · ');
}

function buildStatsSnapshot(range) {
    const scopedTasks = state.tasks.filter((task) => isDateWithinRange(task.task_date, range));
    const totalTasks = scopedTasks.length;
    const totalDurationMinutes = scopedTasks.reduce((sum, task) => sum + Number(task.duration_minutes || 0), 0);
    const averageDurationMinutes = totalTasks > 0 ? Math.round(totalDurationMinutes / totalTasks) : 0;

    const byType = new Map();
    const byCrop = new Map();
    const byEffect = new Map();
    const byStatus = new Map();

    ECONOMIC_EFFECT_OPTIONS.forEach((option) => {
        byEffect.set(option.value, {
            value: option.value,
            label: option.label,
            count: 0,
            totals: new Map()
        });
    });

    TASK_STATUS_OPTIONS.forEach((option) => {
        byStatus.set(option.value, {
            value: option.value,
            label: option.label,
            count: 0,
            durationMinutes: 0
        });
    });

    scopedTasks.forEach((task) => {
        const typeLabel = readLabel(TASK_TYPE_OPTIONS, task.task_type, task.task_type);
        const typeEntry = byType.get(task.task_type) || {
            value: task.task_type,
            label: typeLabel,
            count: 0,
            durationMinutes: 0
        };
        typeEntry.count += 1;
        typeEntry.durationMinutes += Number(task.duration_minutes || 0);
        byType.set(task.task_type, typeEntry);

        const crop = resolveCropInfo(task.crop_id);
        const cropKey = crop.id || 'uncropped';
        const cropEntry = byCrop.get(cropKey) || {
            value: cropKey,
            label: crop.shortLabel,
            count: 0,
            durationMinutes: 0
        };
        cropEntry.count += 1;
        cropEntry.durationMinutes += Number(task.duration_minutes || 0);
        byCrop.set(cropKey, cropEntry);

        const statusEntry = byStatus.get(task.task_status) || {
            value: task.task_status,
            label: readLabel(TASK_STATUS_OPTIONS, task.task_status, task.task_status),
            count: 0,
            durationMinutes: 0
        };
        statusEntry.count += 1;
        statusEntry.durationMinutes += Number(task.duration_minutes || 0);
        byStatus.set(task.task_status, statusEntry);

        const effectEntry = byEffect.get(task.economic_effect) || {
            value: task.economic_effect,
            label: readLabel(ECONOMIC_EFFECT_OPTIONS, task.economic_effect, task.economic_effect),
            count: 0,
            totals: new Map()
        };
        effectEntry.count += 1;
        if (task.economic_effect !== 'none' && task.amount != null) {
            const currency = normalizeCurrency(task.currency, 'COP');
            const previous = Number(effectEntry.totals.get(currency) || 0);
            effectEntry.totals.set(currency, previous + Number(task.amount || 0));
        }
        byEffect.set(task.economic_effect, effectEntry);
    });

    const withEconomicImpact = Array.from(byEffect.values())
        .filter((entry) => entry.value !== 'none')
        .reduce((sum, entry) => sum + entry.count, 0);

    return {
        totalTasks,
        totalDurationMinutes,
        averageDurationMinutes,
        withEconomicImpact,
        withoutEconomicImpact: totalTasks - withEconomicImpact,
        byType: Array.from(byType.values()).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
        byCrop: Array.from(byCrop.values()).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
        byStatus: Array.from(byStatus.values()).sort((left, right) => TASK_STATUS_OPTIONS.findIndex((option) => option.value === left.value) - TASK_STATUS_OPTIONS.findIndex((option) => option.value === right.value)),
        byEffect: Array.from(byEffect.values()).sort((left, right) => ECONOMIC_EFFECT_OPTIONS.findIndex((option) => option.value === left.value) - ECONOMIC_EFFECT_OPTIONS.findIndex((option) => option.value === right.value))
    };
}

function renderShell() {
    if (!state.root) return;

    state.root.innerHTML = `
        <div class="agro-task-shell agro-ops-v10">
            <header class="module-header agro-task-shell__header">
                <div class="module-title-group">
                    <div class="module-icon">🧑‍🌾</div>
                    <div class="module-heading">
                        <p class="agro-task-shell__eyebrow">Trabajo diario del campo</p>
                        <h2 class="module-title">Ciclos de Tareas</h2>
                        <p class="module-subtitle">Registra lo que se hizo, cuánto tomó, a qué cultivo estuvo ligado y si dejó impacto económico.</p>
                    </div>
                </div>
                <div class="header-actions agro-task-shell__actions">
                    <button type="button" class="btn btn-primary" data-task-action="new-task">➕ Nueva tarea</button>
                    <button type="button" class="agro-task-refresh-btn" data-task-action="refresh" aria-label="Actualizar Ciclos de Tareas" title="Actualizar">
                        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    </button>
                </div>
            </header>

            <div id="agro-task-page-feedback" class="agro-task-feedback agro-task-feedback--page" data-tone="info" hidden></div>
            <div class="agro-privacy-strip" aria-label="Controles de privacidad de Ciclos de Tareas">
                <span class="agro-privacy-strip__label">Privacidad</span>
                <button type="button" class="btn-privacy-toggle" data-money-privacy-control="toggle" aria-pressed="false">Ocultar montos</button>
            </div>

            <section class="agro-task-panel agro-task-shell__tabs">
                <div class="agro-task-panel__head agro-task-panel__head--compact">
                    <div>
                        <p class="agro-task-panel__eyebrow">Vista del módulo</p>
                        <h3 class="agro-task-panel__title">Tareas o estadísticas</h3>
                        <p class="agro-task-panel__copy">Trabaja el registro diario por separado del análisis para no mezclar operación con lectura histórica.</p>
                    </div>
                </div>
                <div id="agro-task-module-tabs" class="agro-task-range-pills agro-task-range-pills--module" role="tablist" aria-label="Secciones de Ciclos de Tareas"></div>
            </section>

            <section id="agro-task-list-section" class="agro-task-panel agro-task-list-section">
                <div class="agro-task-panel__head">
                    <div>
                        <p class="agro-task-panel__eyebrow">Tareas</p>
                        <h3 class="agro-task-panel__title">Trabajo registrado del día a día</h3>
                        <p class="agro-task-panel__copy">Ordena el trabajo por estado, rango, cultivo, tipo o impacto sin mezclarlo con Cartera Viva ni Cartera Operativa.</p>
                    </div>
                    <button type="button" class="btn" data-task-action="new-task">➕ Nueva tarea</button>
                </div>
                <div id="agro-task-list-filters"></div>
                <p id="agro-task-list-status" class="agro-task-list-status">Cargando tareas...</p>
                <div id="agro-task-list"></div>
            </section>

            <section id="agro-task-stats-section" class="agro-task-panel agro-task-stats-section">
                <div class="agro-task-panel__head">
                    <div>
                        <p class="agro-task-panel__eyebrow">Centro de estadísticas</p>
                        <h3 class="agro-task-panel__title">Productividad e impacto</h3>
                        <p class="agro-task-panel__copy">Lectura operativa y económica del trabajo registrado por rango temporal.</p>
                    </div>
                    <div id="agro-task-stats-range" class="agro-task-range-pills" role="group" aria-label="Rango de estadísticas"></div>
                </div>
                <div id="agro-task-stats-body"></div>
            </section>

            <div id="agro-task-modal" class="agro-task-modal" aria-hidden="true">
                <div class="agro-task-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="agro-task-modal-title">
                    <div class="agro-task-modal__header">
                        <div>
                            <p id="agro-task-modal-eyebrow" class="agro-task-modal__eyebrow">Nueva tarea</p>
                            <h3 id="agro-task-modal-title" class="agro-task-modal__title">Registrar tarea</h3>
                            <p id="agro-task-modal-copy" class="agro-task-modal__copy">Describe el trabajo real ejecutado hoy y deja su impacto económico solo si aplica.</p>
                        </div>
                        <button type="button" class="agro-task-modal__close" data-task-action="cancel-form" aria-label="Cerrar modal">&times;</button>
                    </div>
                    <div class="agro-task-modal__body">
                        <div id="agro-task-modal-feedback" class="agro-task-feedback agro-task-feedback--modal" data-tone="info" hidden></div>
                        <div id="agro-task-form-host"></div>
                    </div>
                </div>
            </div>

            <div id="agro-task-delete-modal" class="agro-task-modal agro-task-modal--confirm" aria-hidden="true">
                <div class="agro-task-modal__dialog agro-task-modal__dialog--confirm" role="dialog" aria-modal="true" aria-labelledby="agro-task-delete-title">
                    <div class="agro-task-modal__header">
                        <div>
                            <p class="agro-task-modal__eyebrow">Eliminar tarea</p>
                            <h3 id="agro-task-delete-title" class="agro-task-modal__title">¿Deseas eliminar esta tarea?</h3>
                            <p id="agro-task-delete-copy" class="agro-task-modal__copy">Esta acción ocultará la tarea del historial visible.</p>
                        </div>
                        <button type="button" class="agro-task-modal__close" data-task-action="cancel-delete" aria-label="Cerrar confirmación">&times;</button>
                    </div>
                    <div class="agro-task-modal__body">
                        <div id="agro-task-delete-host"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    state.refs = {
        pageFeedback: document.getElementById('agro-task-page-feedback'),
        moduleTabs: document.getElementById('agro-task-module-tabs'),
        statsSection: document.getElementById('agro-task-stats-section'),
        statsRange: document.getElementById('agro-task-stats-range'),
        statsBody: document.getElementById('agro-task-stats-body'),
        listSection: document.getElementById('agro-task-list-section'),
        listFilters: document.getElementById('agro-task-list-filters'),
        listStatus: document.getElementById('agro-task-list-status'),
        list: document.getElementById('agro-task-list'),
        modal: document.getElementById('agro-task-modal'),
        modalEyebrow: document.getElementById('agro-task-modal-eyebrow'),
        modalTitle: document.getElementById('agro-task-modal-title'),
        modalCopy: document.getElementById('agro-task-modal-copy'),
        modalFeedback: document.getElementById('agro-task-modal-feedback'),
        formHost: document.getElementById('agro-task-form-host'),
        deleteModal: document.getElementById('agro-task-delete-modal'),
        deleteHost: document.getElementById('agro-task-delete-host'),
        deleteCopy: document.getElementById('agro-task-delete-copy')
    };

    renderPageFeedback();
    renderModuleTabs();
    syncActiveTabPanels();
    renderStats();
    renderListFilters();
    renderList();
    renderComposer();
    renderDeleteConfirm();
}

function renderModuleTabs() {
    if (!state.refs?.moduleTabs) return;
    state.refs.moduleTabs.innerHTML = MODULE_TAB_OPTIONS.map((option) => `
        <button
            type="button"
            class="agro-task-range-pill agro-task-range-pill--module${state.activeTab === option.value ? ' is-active' : ''}"
            role="tab"
            aria-selected="${state.activeTab === option.value ? 'true' : 'false'}"
            data-task-action="module-tab"
            data-tab="${escapeAttr(option.value)}"
        >
            ${escapeHtml(option.label)}
        </button>
    `).join('');
}

function syncActiveTabPanels() {
    const showTasks = state.activeTab !== 'stats';
    if (state.refs?.listSection) {
        state.refs.listSection.hidden = !showTasks;
    }
    if (state.refs?.statsSection) {
        state.refs.statsSection.hidden = showTasks;
    }
}

function renderStatsRangeControls() {
    if (!state.refs?.statsRange) return;
    state.refs.statsRange.innerHTML = STATS_RANGE_OPTIONS.map((option) => `
        <button type="button" class="agro-task-range-pill${state.statsRange === option.value ? ' is-active' : ''}" data-task-action="stats-range" data-range="${escapeAttr(option.value)}">
            ${escapeHtml(option.label)}
        </button>
    `).join('');
}

function renderStatsBreakdownList(entries, emptyCopy) {
    if (!Array.isArray(entries) || entries.length === 0) {
        return `<p class="agro-task-breakdown-card__empty">${escapeHtml(emptyCopy)}</p>`;
    }
    return `
        <ul class="agro-task-breakdown-list">
            ${entries.map((entry) => `
                <li class="agro-task-breakdown-list__item">
                    <div>
                        <strong>${escapeHtml(entry.label)}</strong>
                        <small>${entry.count} tarea${entry.count === 1 ? '' : 's'} · ${escapeHtml(formatDurationMinutes(entry.durationMinutes))}</small>
                    </div>
                    <span>${entry.count}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function renderImpactCards(snapshot) {
    return snapshot.byEffect.map((entry) => `
        <article class="agro-task-impact-card">
            <p class="agro-task-impact-card__eyebrow">${escapeHtml(entry.label)}</p>
            <h4 class="agro-task-impact-card__value">${entry.count}</h4>
            <p class="agro-task-impact-card__copy">${entry.value === 'none' ? 'Sin monto asociado' : renderMoneyNode(buildCurrencyBreakdownLabel(entry.totals))}</p>
        </article>
    `).join('');
}

function renderStats() {
    if (!state.refs?.statsBody) return;

    renderStatsRangeControls();
    state.refs.statsSection?.classList.toggle('is-refreshing', state.loading && state.loadedOnce);

    if (state.schemaMissing) {
        state.refs.statsBody.innerHTML = `
            <div class="agro-task-empty agro-task-empty--warn">
                <h4>Falta la base de datos de Ciclos de Tareas</h4>
                <p>${escapeHtml(TASK_SCHEMA_MISSING_COPY)}</p>
            </div>
        `;
        return;
    }

    if (!state.loadedOnce && state.loading) {
        state.refs.statsBody.innerHTML = `
            <div class="agro-task-stats-grid agro-task-stats-grid--loading">
                <article class="agro-task-stat-card agro-task-stat-card--loading"></article>
                <article class="agro-task-stat-card agro-task-stat-card--loading"></article>
                <article class="agro-task-stat-card agro-task-stat-card--loading"></article>
                <article class="agro-task-stat-card agro-task-stat-card--loading"></article>
            </div>
        `;
        return;
    }

    const snapshot = buildStatsSnapshot(state.statsRange);
    const rangeLabel = readLabel(STATS_RANGE_OPTIONS, state.statsRange, 'Mensual');

    state.refs.statsBody.innerHTML = `
        <div class="agro-task-stats-grid">
            <article class="agro-task-stat-card">
                <p class="agro-task-stat-card__eyebrow">${escapeHtml(rangeLabel)}</p>
                <h4 class="agro-task-stat-card__value">${snapshot.totalTasks}</h4>
                <p class="agro-task-stat-card__copy">Tareas registradas</p>
            </article>
            <article class="agro-task-stat-card">
                <p class="agro-task-stat-card__eyebrow">${escapeHtml(rangeLabel)}</p>
                <h4 class="agro-task-stat-card__value">${escapeHtml(formatDurationMinutes(snapshot.totalDurationMinutes))}</h4>
                <p class="agro-task-stat-card__copy">Tiempo total invertido</p>
            </article>
            <article class="agro-task-stat-card">
                <p class="agro-task-stat-card__eyebrow">${escapeHtml(rangeLabel)}</p>
                <h4 class="agro-task-stat-card__value">${escapeHtml(formatDurationMinutes(snapshot.averageDurationMinutes))}</h4>
                <p class="agro-task-stat-card__copy">Promedio por tarea</p>
            </article>
            <article class="agro-task-stat-card">
                <p class="agro-task-stat-card__eyebrow">${escapeHtml(rangeLabel)}</p>
                <h4 class="agro-task-stat-card__value">${snapshot.withEconomicImpact}</h4>
                <p class="agro-task-stat-card__copy">Con impacto económico</p>
            </article>
        </div>

        <div class="agro-task-breakdown-grid">
            <article class="agro-task-breakdown-card">
                <div class="agro-task-breakdown-card__head">
                    <p class="agro-task-breakdown-card__eyebrow">Productividad</p>
                    <h4 class="agro-task-breakdown-card__title">Tareas por tipo</h4>
                </div>
                ${renderStatsBreakdownList(snapshot.byType, 'Todavía no hay tipos suficientes para comparar.')}
            </article>
            <article class="agro-task-breakdown-card">
                <div class="agro-task-breakdown-card__head">
                    <p class="agro-task-breakdown-card__eyebrow">Ejecución</p>
                    <h4 class="agro-task-breakdown-card__title">Tareas por estado</h4>
                </div>
                ${renderStatsBreakdownList(snapshot.byStatus, 'Los estados aparecerán cuando registres tareas pendientes, activas o cerradas.')}
            </article>
            <article class="agro-task-breakdown-card">
                <div class="agro-task-breakdown-card__head">
                    <p class="agro-task-breakdown-card__eyebrow">Cultivos</p>
                    <h4 class="agro-task-breakdown-card__title">Tareas por cultivo</h4>
                </div>
                ${renderStatsBreakdownList(snapshot.byCrop, 'Las tareas sin cultivo asociado aparecerán aquí cuando existan.')}
            </article>
            <article class="agro-task-breakdown-card">
                <div class="agro-task-breakdown-card__head">
                    <p class="agro-task-breakdown-card__eyebrow">Impacto económico</p>
                    <h4 class="agro-task-breakdown-card__title">Conteos y montos</h4>
                </div>
                <div class="agro-task-impact-grid">
                    ${renderImpactCards(snapshot)}
                </div>
            </article>
        </div>
    `;
}

function renderListFilters() {
    if (!state.refs?.listFilters) return;
    const statusCounts = buildTaskStatusCounts();
    const cropOptions = [
        '<option value="all">Todos los cultivos</option>',
        '<option value="uncropped">Sin cultivo</option>',
        ...state.crops.map((crop) => {
            const display = buildCropDisplay(crop);
            const selected = state.listFilters.cropId === display.id ? ' selected' : '';
            return `<option value="${escapeAttr(display.id)}"${selected}>${escapeHtml(display.label)}</option>`;
        })
    ];

    state.refs.listFilters.innerHTML = `
        <div class="agro-task-filter-stack">
            <div class="agro-task-filter-group">
                <div class="agro-task-filter-group__head">
                    <p class="agro-task-filter-group__eyebrow">Estado</p>
                    <p class="agro-task-filter-group__copy">Cuenta la historia natural del trabajo: pendiente, activo, finalizado o no ejecutado.</p>
                </div>
                <div class="agro-task-range-pills agro-task-range-pills--status" role="group" aria-label="Estados de tareas">
                    ${TASK_STATUS_FILTER_OPTIONS.map((option) => `
                        <button
                            type="button"
                            class="agro-task-range-pill agro-task-range-pill--status${state.listFilters.status === option.value ? ' is-active' : ''}"
                            data-task-action="filter-status"
                            data-status="${escapeAttr(option.value)}"
                        >
                            <span>${escapeHtml(option.label)}</span>
                            <strong>${Number(statusCounts[option.value] || 0)}</strong>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="agro-task-filters">
                <label class="agro-task-filter">
                    <span>Buscar</span>
                    <input type="search" class="styled-input" placeholder="Título, nota o cultivo" value="${escapeAttr(state.listFilters.search)}" data-task-filter="search">
                </label>
                <label class="agro-task-filter">
                    <span>Rango</span>
                    <select class="styled-input" data-task-filter="range">
                        ${buildSelectOptionsMarkup(LIST_RANGE_OPTIONS, state.listFilters.range)}
                    </select>
                </label>
                <label class="agro-task-filter">
                    <span>Tipo</span>
                    <select class="styled-input" data-task-filter="taskType">
                        <option value="all">Todos los tipos</option>
                        ${buildSelectOptionsMarkup(TASK_TYPE_OPTIONS, state.listFilters.taskType === 'all' ? '' : state.listFilters.taskType)}
                    </select>
                </label>
                <label class="agro-task-filter">
                    <span>Impacto</span>
                    <select class="styled-input" data-task-filter="effect">
                        <option value="all">Todos los impactos</option>
                        ${buildSelectOptionsMarkup(ECONOMIC_EFFECT_OPTIONS, state.listFilters.effect === 'all' ? '' : state.listFilters.effect)}
                    </select>
                </label>
                <label class="agro-task-filter">
                    <span>Cultivo</span>
                    <select class="styled-input" data-task-filter="cropId">
                        ${cropOptions.join('')}
                    </select>
                </label>
            </div>
        </div>
    `;
}

function renderTaskMeta(task) {
    const crop = resolveCropInfo(task.crop_id);
    const effectLabel = readLabel(ECONOMIC_EFFECT_OPTIONS, task.economic_effect, task.economic_effect);
    const amountText = task.economic_effect !== 'none' && task.amount != null
        ? formatCurrencyValue(task.amount, task.currency || 'COP')
        : 'Sin monto';
    const durationText = task.duration_label || formatDurationMinutes(task.duration_minutes);
    const typeLabel = readLabel(TASK_TYPE_OPTIONS, task.task_type, task.task_type);
    const statusLabel = readLabel(TASK_STATUS_OPTIONS, task.task_status, task.task_status);

    return `
        <div class="agro-task-card__meta">
            <span>${escapeHtml(typeLabel)}</span>
            <span>${escapeHtml(statusLabel)}</span>
            <span>${escapeHtml(durationText)}</span>
            <span>${escapeHtml(crop.shortLabel)}</span>
            <span>${escapeHtml(effectLabel)}${task.economic_effect !== 'none' ? ` · ${renderMoneyNode(amountText)}` : ''}</span>
        </div>
    `;
}

function renderTaskCard(task) {
    const crop = resolveCropInfo(task.crop_id);
    const effectLabel = readLabel(ECONOMIC_EFFECT_OPTIONS, task.economic_effect, task.economic_effect);
    const effectClass = EFFECT_TONE_CLASS[task.economic_effect] || EFFECT_TONE_CLASS.none;
    const statusLabel = readLabel(TASK_STATUS_OPTIONS, task.task_status, task.task_status);
    const statusClass = TASK_STATUS_TONE_CLASS[task.task_status] || TASK_STATUS_TONE_CLASS.completed;
    const amountText = task.economic_effect !== 'none' && task.amount != null
        ? formatCurrencyValue(task.amount, task.currency || 'COP')
        : 'Sin impacto económico';

    return `
        <article class="agro-task-card">
            <div class="agro-task-card__head">
                <div>
                    <p class="agro-task-card__eyebrow">${escapeHtml(formatDateLabel(task.task_date))}</p>
                    <h4 class="agro-task-card__title">${escapeHtml(task.title)}</h4>
                    ${renderTaskMeta(task)}
                </div>
                <div class="agro-task-card__actions">
                    <button type="button" class="btn btn-sm" data-task-action="edit-task" data-task-id="${escapeAttr(task.id)}">Editar</button>
                    <button type="button" class="btn btn-sm btn-danger" data-task-action="delete-task" data-task-id="${escapeAttr(task.id)}">Eliminar</button>
                </div>
            </div>
            <div class="agro-task-card__pills">
                <span class="agro-task-pill ${escapeAttr(statusClass)}">${escapeHtml(statusLabel)}</span>
                <span class="agro-task-pill">${escapeHtml(readLabel(TASK_TYPE_OPTIONS, task.task_type, task.task_type))}</span>
                <span class="agro-task-pill ${escapeAttr(effectClass)}">${escapeHtml(effectLabel)}</span>
                <span class="agro-task-pill ${crop.missing ? 'is-warn' : ''}">${escapeHtml(crop.label)}</span>
            </div>
            <div class="agro-task-card__body">
                <div class="agro-task-card__fact">
                    <small>Estado</small>
                    <strong class="${escapeAttr(statusClass)}">${escapeHtml(statusLabel)}</strong>
                </div>
                <div class="agro-task-card__fact">
                    <small>Duración</small>
                    <strong>${escapeHtml(task.duration_label || formatDurationMinutes(task.duration_minutes))}</strong>
                </div>
                <div class="agro-task-card__fact">
                    <small>Impacto</small>
                    <strong>${renderMoneyNode(amountText)}</strong>
                </div>
            </div>
            ${task.notes ? `<p class="agro-task-card__notes">${escapeHtml(task.notes)}</p>` : ''}
        </article>
    `;
}

function renderList() {
    if (!state.refs?.list || !state.refs?.listStatus) return;

    state.refs.listSection?.classList.toggle('is-refreshing', state.loading && state.loadedOnce);

    if (state.schemaMissing) {
        state.refs.listStatus.textContent = TASK_SCHEMA_MISSING_COPY;
        state.refs.list.innerHTML = `
            <div class="agro-task-empty agro-task-empty--warn">
                <h4>Módulo pendiente de migración</h4>
                <p>${escapeHtml(TASK_SCHEMA_MISSING_COPY)}</p>
            </div>
        `;
        return;
    }

    if (!state.loadedOnce && state.loading) {
        state.refs.listStatus.textContent = 'Cargando tareas...';
        state.refs.list.innerHTML = `
            <div class="agro-task-loading">
                <article class="agro-task-card agro-task-card--loading"></article>
                <article class="agro-task-card agro-task-card--loading"></article>
                <article class="agro-task-card agro-task-card--loading"></article>
            </div>
        `;
        return;
    }

    const visibleTasks = getVisibleTasks();
    const totalTasks = state.tasks.length;

    if (visibleTasks.length === 0 && totalTasks === 0) {
        state.refs.listStatus.textContent = 'Todavía no hay tareas registradas.';
        state.refs.list.innerHTML = `
            <div class="agro-task-empty">
                <h4>Registra la primera tarea del campo</h4>
                <p>Este módulo sirve para dejar historia del trabajo real: qué se hizo, cuánto tomó y si dejó impacto económico.</p>
                <button type="button" class="btn btn-primary" data-task-action="new-task">➕ Registrar primera tarea</button>
            </div>
        `;
        return;
    }

    if (visibleTasks.length === 0) {
        state.refs.listStatus.textContent = 'No hay tareas para los filtros actuales.';
        state.refs.list.innerHTML = `
            <div class="agro-task-empty">
                <h4>Sin resultados visibles</h4>
                <p>Ajusta estado, búsqueda, rango, cultivo o tipo para volver a ver tareas registradas.</p>
            </div>
        `;
        return;
    }

    state.refs.listStatus.textContent = `${visibleTasks.length} tarea${visibleTasks.length === 1 ? '' : 's'} visibles de ${totalTasks}.`;

    const groups = groupTasksByDate(visibleTasks);
    state.refs.list.innerHTML = groups.map((group) => `
        <section class="agro-task-day-group">
            <header class="agro-task-day-group__head">
                <div>
                    <p class="agro-task-day-group__eyebrow">${escapeHtml(group.label)}</p>
                    <h4 class="agro-task-day-group__title">${escapeHtml(formatDateLabel(group.date))}</h4>
                </div>
                <span class="agro-task-day-group__count">${group.items.length} tarea${group.items.length === 1 ? '' : 's'}</span>
            </header>
            <div class="agro-task-day-group__list">
                ${group.items.map((task) => renderTaskCard(task)).join('')}
            </div>
        </section>
    `).join('');
}

function buildFormMarkup() {
    const values = state.form.values;
    const isEdit = state.form.mode === 'edit';
    const durationPreview = resolveDraftDurationText(values);

    return `
        <form id="agro-task-form" class="agro-task-form" novalidate>
            <div class="agro-task-form__grid">
                <label class="input-group input-group--full">
                    <span class="input-label">Nombre de la tarea</span>
                    <input type="text" id="agro-task-title" class="styled-input" maxlength="140" placeholder="Ej: Fumigación del lote norte" data-task-draft="title" value="${escapeAttr(values.title)}" required>
                </label>

                <label class="input-group">
                    <span class="input-label">Tipo de tarea</span>
                    <select class="styled-input" data-task-draft="taskType">
                        ${buildSelectOptionsMarkup(TASK_TYPE_OPTIONS, values.taskType)}
                    </select>
                </label>

                <label class="input-group">
                    <span class="input-label">Fecha</span>
                    <input type="date" class="styled-input" data-task-draft="taskDate" value="${escapeAttr(values.taskDate)}" required>
                </label>

                <label class="input-group">
                    <span class="input-label">Estado</span>
                    <select class="styled-input" data-task-draft="taskStatus">
                        ${buildSelectOptionsMarkup(TASK_STATUS_OPTIONS, values.taskStatus)}
                    </select>
                </label>

                <label class="input-group">
                    <span class="input-label">Cultivo asociado</span>
                    <select class="styled-input" data-task-draft="cropId">
                        ${buildCropOptionsMarkup(values.cropId)}
                    </select>
                </label>

                <label class="input-group">
                    <span class="input-label">Duración</span>
                    <input type="number" min="0.25" step="0.25" class="styled-input" placeholder="Ej: 2" data-task-draft="durationValue" value="${escapeAttr(values.durationValue)}" required>
                </label>

                <label class="input-group">
                    <span class="input-label">Unidad</span>
                    <select class="styled-input" data-task-draft="durationUnit">
                        ${buildSelectOptionsMarkup(DURATION_UNIT_OPTIONS, normalizeDurationUnit(values.durationUnit))}
                    </select>
                </label>

                <label class="input-group">
                    <span class="input-label">Impacto económico</span>
                    <select id="agro-task-economic-effect" class="styled-input" data-task-draft="economicEffect">
                        ${buildSelectOptionsMarkup(ECONOMIC_EFFECT_OPTIONS, values.economicEffect)}
                    </select>
                </label>

                <div id="agro-task-economic-fields" class="agro-task-economic-fields${values.economicEffect === 'none' ? ' is-hidden' : ''}">
                    <label class="input-group">
                        <span class="input-label">Monto</span>
                        <input type="number" min="0" step="0.01" class="styled-input" placeholder="Ej: 25.50" data-task-draft="amount" value="${escapeAttr(values.amount)}">
                    </label>
                    <label class="input-group">
                        <span class="input-label">Moneda</span>
                        <select class="styled-input" data-task-draft="currency">
                            ${buildSelectOptionsMarkup(CURRENCY_OPTIONS.map((currency) => ({ value: currency, label: currency })), values.currency)}
                        </select>
                    </label>
                </div>

                <label class="input-group input-group--full">
                    <span class="input-label">Nota</span>
                    <textarea class="styled-input" rows="4" placeholder="Detalle libre del trabajo realizado" data-task-draft="notes">${escapeHtml(values.notes)}</textarea>
                </label>
            </div>

            <div class="agro-task-form__summary">
                <div class="agro-task-form__summary-card">
                    <small>Vista rápida</small>
                    <strong>${escapeHtml(values.title || (isEdit ? 'Editando tarea' : 'Nueva tarea'))}</strong>
                    <p>${escapeHtml(readLabel(TASK_TYPE_OPTIONS, values.taskType, 'Otra'))} · ${escapeHtml(readLabel(TASK_STATUS_OPTIONS, values.taskStatus, 'Finalizada'))} · ${escapeHtml(durationPreview)}</p>
                </div>
                <div class="agro-task-form__summary-card">
                    <small>Impacto</small>
                    <strong>${escapeHtml(readLabel(ECONOMIC_EFFECT_OPTIONS, values.economicEffect, 'Sin impacto económico'))}</strong>
                    <p>${values.economicEffect === 'none'
                        ? 'No registrara monto.'
                        : (values.amount
                            ? renderMoneyNode(formatCurrencyValue(values.amount, values.currency || 'COP'))
                            : 'Monta el valor si aplica.')}</p>
                </div>
            </div>

            <div class="agro-task-form__actions">
                <button type="button" class="btn" data-task-action="cancel-form">Cancelar</button>
                <button type="submit" class="btn btn-primary"${state.saving || state.schemaMissing ? ' disabled' : ''}>${state.saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear tarea')}</button>
            </div>
        </form>
    `;
}

function syncEconomicFieldsVisibility() {
    const wrapper = document.getElementById('agro-task-economic-fields');
    if (!wrapper) return;
    const isHidden = normalizeEconomicEffect(state.form.values.economicEffect) === 'none';
    wrapper.classList.toggle('is-hidden', isHidden);
}

function renderComposer() {
    if (!state.refs?.modal || !state.refs?.formHost) return;

    const isEdit = state.form.mode === 'edit';
    state.refs.modal.classList.toggle('is-open', state.modalOpen);
    state.refs.modal.setAttribute('aria-hidden', state.modalOpen ? 'false' : 'true');
    syncBodyLock();

    if (!state.modalOpen) {
        state.refs.formHost.innerHTML = '';
        return;
    }

    state.refs.modalEyebrow.textContent = isEdit ? 'Editar tarea' : 'Nueva tarea';
    state.refs.modalTitle.textContent = isEdit ? 'Actualizar tarea registrada' : 'Registrar tarea del campo';
    state.refs.modalCopy.textContent = isEdit
        ? 'Ajusta nombre, fecha, tiempo, cultivo o impacto sin perder el contexto del historial.'
        : 'Guarda el trabajo realizado hoy, el tiempo invertido y el impacto económico solo si realmente aplica.';
    state.refs.formHost.innerHTML = buildFormMarkup();
    renderModalFeedback();
    syncEconomicFieldsVisibility();
}

function renderDeleteConfirm() {
    if (!state.refs?.deleteModal || !state.refs?.deleteHost) return;

    state.refs.deleteModal.classList.toggle('is-open', state.deleteConfirmOpen);
    state.refs.deleteModal.setAttribute('aria-hidden', state.deleteConfirmOpen ? 'false' : 'true');
    syncBodyLock();

    if (!state.deleteConfirmOpen) {
        state.refs.deleteHost.innerHTML = '';
        if (state.refs.deleteCopy) {
            state.refs.deleteCopy.textContent = 'Esta acción ocultará la tarea del historial visible.';
        }
        return;
    }

    const task = state.tasks.find((item) => item.id === state.deleteId);
    if (state.refs.deleteCopy) {
        state.refs.deleteCopy.textContent = task
            ? `¿Deseas eliminar "${task.title}"? La tarea quedará fuera del historial visible.`
            : '¿Deseas eliminar esta tarea? La tarea quedará fuera del historial visible.';
    }

    state.refs.deleteHost.innerHTML = `
        <div class="agro-task-delete-card">
            <p class="agro-task-delete-card__note">La eliminación es segura: se aplica soft-delete y la tarea puede auditarse por base de datos si hiciera falta.</p>
            <div class="agro-task-delete-card__actions">
                <button type="button" class="btn" data-task-action="cancel-delete">No, cancelar</button>
                <button type="button" id="agro-task-delete-confirm" class="btn btn-danger" data-task-action="confirm-delete"${state.saving ? ' disabled' : ''}>${state.saving ? 'Eliminando...' : 'Sí, eliminar'}</button>
            </div>
        </div>
    `;
}

function ensureFormPayload() {
    const values = state.form.values;
    const title = String(values.title || '').trim();
    if (!title) {
        throw new Error('El nombre de la tarea es obligatorio.');
    }

    const taskDate = String(values.taskDate || '').trim();
    if (!taskDate) {
        throw new Error('La fecha de la tarea es obligatoria.');
    }

    const durationMinutes = resolveDurationMinutes(values.durationValue, values.durationUnit);
    return {
        title,
        taskType: ensureAllowedValue(values.taskType, TASK_TYPE_OPTIONS.map((option) => option.value), 'Tipo de tarea no válido.'),
        taskDate,
        cropId: normalizeId(values.cropId),
        durationMinutes,
        durationLabel: formatDurationMinutes(durationMinutes),
        taskStatus: ensureAllowedValue(values.taskStatus, TASK_STATUS_OPTIONS.map((option) => option.value), 'Estado de tarea no válido.'),
        economicEffect: ensureAllowedValue(values.economicEffect, ECONOMIC_EFFECT_OPTIONS.map((option) => option.value), 'Impacto económico no válido.'),
        amount: values.economicEffect === 'none' ? null : toPositiveAmount(values.amount, 'El monto'),
        currency: values.economicEffect === 'none' ? null : normalizeCurrency(values.currency, 'COP'),
        notes: toNullableText(values.notes)
    };
}

async function createTaskRecord(payload) {
    const userId = await ensureUserId();
    const cropId = await validateCropId(userId, payload.cropId);
    const insertPayload = {
        user_id: userId,
        crop_id: cropId,
        title: payload.title,
        task_type: payload.taskType,
        task_date: payload.taskDate,
        duration_minutes: payload.durationMinutes,
        duration_label: payload.durationLabel,
        task_status: payload.taskStatus,
        economic_effect: payload.economicEffect,
        amount: payload.amount,
        currency: payload.currency,
        notes: payload.notes
    };

    const { error } = await supabase
        .from(TASKS_TABLE)
        .insert(insertPayload);

    if (error) throw error;
    return '✅ Tarea registrada.';
}

async function updateTaskRecord(taskId, payload) {
    const userId = await ensureUserId();
    const cropId = await validateCropId(userId, payload.cropId);
    const updatePayload = {
        crop_id: cropId,
        title: payload.title,
        task_type: payload.taskType,
        task_date: payload.taskDate,
        duration_minutes: payload.durationMinutes,
        duration_label: payload.durationLabel,
        task_status: payload.taskStatus,
        economic_effect: payload.economicEffect,
        amount: payload.amount,
        currency: payload.currency,
        notes: payload.notes
    };

    const { error } = await supabase
        .from(TASKS_TABLE)
        .update(updatePayload)
        .eq('id', normalizeId(taskId))
        .eq('user_id', userId)
        .is('deleted_at', null);

    if (error) throw error;
    return '💾 Tarea actualizada.';
}

async function softDeleteTaskRecord(taskId) {
    const userId = await ensureUserId();
    const { error } = await supabase
        .from(TASKS_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', normalizeId(taskId))
        .eq('user_id', userId)
        .is('deleted_at', null);

    if (error) throw error;
    return '🗑️ Tarea eliminada.';
}

async function refreshData(options = {}) {
    if (state.loading) return;
    if (options.initialUserId) {
        state.userId = normalizeId(options.initialUserId);
    }

    state.loading = true;
    renderStats();
    renderList();

    try {
        const userId = await ensureUserId(options.initialUserId);
        state.schemaMissing = false;

        const [crops, tasks] = await Promise.all([
            fetchCrops(userId),
            fetchTasks(userId)
        ]);

        state.crops = crops;
        state.tasks = tasks;
        state.loadedOnce = true;
        renderListFilters();
        renderStats();
        renderList();
    } catch (error) {
        if (isSchemaMissingError(error)) {
            state.schemaMissing = true;
            state.tasks = [];
            state.loadedOnce = true;
            setPageFeedback(TASK_SCHEMA_MISSING_COPY, 'warn');
            renderStats();
            renderList();
            return;
        }
        console.error('[TaskCycles] refreshData failed:', error);
        setPageFeedback(error?.message || 'No se pudieron cargar las tareas.', 'warn');
        state.loadedOnce = true;
        renderStats();
        renderList();
    } finally {
        state.loading = false;
        renderStats();
        renderList();
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    if (state.saving || state.schemaMissing) return;

    try {
        setModalFeedback('', 'info');
        state.saving = true;
        renderComposer();

        const payload = ensureFormPayload();
        const message = state.form.mode === 'edit'
            ? await updateTaskRecord(state.editId, payload)
            : await createTaskRecord(payload);

        closeComposerModal();
        setPageFeedback(message, 'success');
        await refreshData();
    } catch (error) {
        console.error('[TaskCycles] save failed:', error);
        setModalFeedback(error?.message || 'No se pudo guardar la tarea.', 'warn');
        renderComposer();
    } finally {
        state.saving = false;
        renderComposer();
    }
}

async function handleDeleteConfirm() {
    if (!state.deleteId || state.saving) return;

    try {
        state.saving = true;
        renderDeleteConfirm();
        const message = await softDeleteTaskRecord(state.deleteId);
        closeDeleteConfirm();
        setPageFeedback(message, 'success');
        await refreshData();
    } catch (error) {
        console.error('[TaskCycles] delete failed:', error);
        setPageFeedback(error?.message || 'No se pudo eliminar la tarea.', 'warn');
        renderDeleteConfirm();
    } finally {
        state.saving = false;
        renderDeleteConfirm();
    }
}

function handleFilterChange(field, value) {
    if (!field) return;
    let shouldRerenderFilters = false;
    if (field === 'status') {
        state.listFilters.status = value === 'all' ? 'all' : normalizeTaskStatus(value);
        shouldRerenderFilters = true;
    } else if (field === 'search') {
        state.listFilters.search = String(value || '');
    } else if (field === 'range') {
        state.listFilters.range = normalizeListRange(value);
        shouldRerenderFilters = true;
    } else if (field === 'taskType') {
        state.listFilters.taskType = value === 'all' ? 'all' : normalizeTaskType(value);
        shouldRerenderFilters = true;
    } else if (field === 'effect') {
        state.listFilters.effect = value === 'all' ? 'all' : normalizeEconomicEffect(value);
        shouldRerenderFilters = true;
    } else if (field === 'cropId') {
        const normalizedCrop = normalizeId(value);
        state.listFilters.cropId = !normalizedCrop ? 'all' : normalizedCrop;
        shouldRerenderFilters = true;
    }
    if (shouldRerenderFilters) {
        renderListFilters();
    }
    renderList();
}

async function handleRootClick(event) {
    const button = event.target.closest('[data-task-action]');
    if (!button) return;

    const action = normalizeToken(button.dataset.taskAction);
    if (action === 'new-task') {
        if (state.schemaMissing) {
            setPageFeedback(TASK_SCHEMA_MISSING_COPY, 'warn');
            return;
        }
        state.activeTab = 'tasks';
        renderModuleTabs();
        syncActiveTabPanels();
        openCreateModal();
        return;
    }
    if (action === 'refresh') {
        await refreshData();
        return;
    }
    if (action === 'cancel-form') {
        closeComposerModal();
        return;
    }
    if (action === 'edit-task') {
        openEditModal(button.dataset.taskId);
        return;
    }
    if (action === 'delete-task') {
        openDeleteConfirm(button.dataset.taskId);
        return;
    }
    if (action === 'cancel-delete') {
        closeDeleteConfirm();
        return;
    }
    if (action === 'confirm-delete') {
        await handleDeleteConfirm();
        return;
    }
    if (action === 'module-tab') {
        state.activeTab = normalizeModuleTab(button.dataset.tab);
        renderModuleTabs();
        syncActiveTabPanels();
        return;
    }
    if (action === 'filter-status') {
        handleFilterChange('status', button.dataset.status);
        return;
    }
    if (action === 'stats-range') {
        state.statsRange = normalizeStatsRange(button.dataset.range);
        renderStats();
    }
}

function handleRootInput(event) {
    const filterField = event.target.dataset.taskFilter;
    if (filterField === 'search') {
        handleFilterChange(filterField, event.target.value);
        return;
    }

    const draftField = event.target.dataset.taskDraft;
    if (!draftField) return;
    updateDraftFromField(draftField, event.target.value);
}

function handleRootChange(event) {
    const filterField = event.target.dataset.taskFilter;
    if (filterField) {
        handleFilterChange(filterField, event.target.value);
        return;
    }

    const draftField = event.target.dataset.taskDraft;
    if (!draftField) return;
    updateDraftFromField(draftField, event.target.value);
}

function buildDebugSnapshot() {
    return {
        userId: state.userId,
        currentView: state.currentView,
        loading: state.loading,
        loadedOnce: state.loadedOnce,
        modalOpen: state.modalOpen,
        deleteConfirmOpen: state.deleteConfirmOpen,
        editId: state.editId,
        deleteId: state.deleteId,
        activeTab: state.activeTab,
        statsRange: state.statsRange,
        listFilters: { ...state.listFilters },
        form: {
            mode: state.form.mode,
            values: { ...state.form.values }
        },
        crops: state.crops.map((crop) => buildCropDisplay(crop)),
        tasks: state.tasks.map((task) => ({
            ...task,
            crop: resolveCropInfo(task.crop_id)
        }))
    };
}

function bindEvents() {
    if (!state.root || state.root.dataset.taskCyclesBound === '1') return;

    state.root.addEventListener('click', (event) => {
        void handleRootClick(event);
    });
    state.root.addEventListener('input', handleRootInput);
    state.root.addEventListener('change', handleRootChange);
    state.root.addEventListener('submit', (event) => {
        if (event.target?.id === 'agro-task-form') {
            void handleFormSubmit(event);
        }
    });

    window.addEventListener(VIEW_CHANGED_EVENT, (event) => {
        state.currentView = normalizeToken(event?.detail?.view);
        if (state.currentView !== VIEW_NAME) {
            closeComposerModal();
            closeDeleteConfirm();
            return;
        }
        void refreshData();
    });

    window.addEventListener(CROPS_READY_EVENT, () => {
        if (state.currentView === VIEW_NAME) {
            void refreshData();
        }
    });

    window.addEventListener(MODE_CHANGE_EVENT, (event) => {
        const mode = normalizeToken(event?.detail?.mode);
        if (mode === 'cultivo') state.listFilters.cropId = 'cropped';
        else if (mode === 'no-cultivo') state.listFilters.cropId = 'uncropped';
        else state.listFilters.cropId = 'all';
        if (state.currentView !== VIEW_NAME) return;
        renderListFilters();
        renderList();
    });

    window.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (state.deleteConfirmOpen) {
            closeDeleteConfirm();
            return;
        }
        if (state.modalOpen) {
            closeComposerModal();
        }
    });

    state.root.dataset.taskCyclesBound = '1';
}

function exposeGlobalApi() {
    if (typeof window === 'undefined') return;
    window.YGAgroTaskCycles = {
        init: initAgroTaskCycles,
        refresh: () => refreshData(),
        openView: () => {
            window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
                detail: {
                    view: VIEW_NAME,
                    scroll: true
                }
            }));
        },
        getSnapshot: buildDebugSnapshot
    };
}

export async function initAgroTaskCycles(options = {}) {
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
    state.currentView = normalizeToken(document.body?.dataset?.agroActiveView || state.currentView);

    const initialMode = normalizeToken(document.body?.dataset?.agroMode || 'general');
    if (initialMode === 'cultivo') state.listFilters.cropId = 'cropped';
    else if (initialMode === 'no-cultivo') state.listFilters.cropId = 'uncropped';
    else state.listFilters.cropId = 'all';

    renderStats();
    renderListFilters();
    renderList();
    await refreshData({ initialUserId: options.initialUserId });

    return {
        refresh: () => refreshData(),
        getSnapshot: buildDebugSnapshot
    };
}
