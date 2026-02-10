/**
 * YavlGold V9.4 - Módulo Agro - Supabase Integration
 * Conecta la UI con las tablas agro_crops y agro_roi_calculations
 */
import supabase from '../assets/js/config/supabase-config.js';
import { updateStats } from './agro-stats.js';
import { syncFactureroNotifications } from './agro-notifications.js';
import './agro.css';
import { openAgroWizard } from './agro-wizard.js';

// ============================================================
// ESTADO DEL MÓDULO
// ============================================================
let currentEditId = null; // ID del cultivo en edición (null = nuevo)
let cropsCache = [];      // Cache local de cultivos para edición
let cropsStatus = 'idle';
let cropsLoadSeq = 0;
let cropsLoadInFlight = false;
let cropsLoadQueued = false;
let cropsLastCount = 0;

const CROPS_LOADING_ID = 'agro-crops-loading';
const CROPS_EMPTY_ID = 'agro-crops-empty';
const AGRO_CROPS_READY_EVENT = 'AGRO_CROPS_READY';
const AGRO_CROPS_STATE_KEY = '__AGRO_CROPS_STATE';
const AGRO_SELECTED_CROP_KEY = 'YG_AGRO_SELECTED_CROP_V1';
const AGRO_DEBUG = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('debug') === '1';
const AGRO_PENDING_TRANSFER_COLUMNS = 'id,user_id,concepto,monto,fecha,crop_id,unit_type,unit_qty,quantity_kg,transfer_state,transferred_to,transferred_to_id,transferred_income_id';
const AGRO_INCOME_TRANSFER_COLUMNS = 'id,user_id,concepto,monto,fecha,categoria,comprador,crop_id,unit_type,unit_qty,quantity_kg,origin_table,origin_id,transfer_state';
const AGRO_LOSS_TRANSFER_COLUMNS = 'id,user_id,concepto,monto,fecha,causa,crop_id,unit_type,unit_qty,quantity_kg,origin_table,origin_id,transfer_state';
const AGRO_INCOME_LIST_COLUMNS = 'id,user_id,concepto,monto,fecha,categoria,comprador,crop_id,unit_type,unit_qty,quantity_kg,soporte_url,origin_table,origin_id,transfer_state,deleted_at,created_at';

let selectedCropId = null;

function normalizeCropId(value) {
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    return str ? str : null;
}

function readSelectedCropId() {
    try {
        return normalizeCropId(localStorage.getItem(AGRO_SELECTED_CROP_KEY));
    } catch (e) {
        return null;
    }
}

function writeSelectedCropId(value) {
    try {
        if (!value) {
            localStorage.removeItem(AGRO_SELECTED_CROP_KEY);
        } else {
            localStorage.setItem(AGRO_SELECTED_CROP_KEY, String(value));
        }
    } catch (e) {
        // Ignore storage errors
    }
}

function applySelectedCropUI() {
    const cards = document.querySelectorAll('.crop-card');
    if (!cards.length) return;
    cards.forEach((card) => {
        const cardId = normalizeCropId(card.dataset.cropId);
        const isSelected = !!(selectedCropId && cardId && cardId === selectedCropId);
        card.classList.toggle('is-selected', isSelected);
        card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
}

function dispatchCropChanged() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('agro:crop:changed', {
        detail: { cropId: selectedCropId }
    }));
}

function setSelectedCropId(nextId, options = {}) {
    const normalized = normalizeCropId(nextId);
    if (normalized === selectedCropId) return false;
    selectedCropId = normalized;
    writeSelectedCropId(selectedCropId);
    applySelectedCropUI();
    if (typeof window !== 'undefined') {
        window.YG_AGRO_SELECTED_CROP_ID = selectedCropId;
    }
    if (!options.silent) {
        dispatchCropChanged();
    }
    return true;
}

function syncSelectedCropFromList(crops, options = {}) {
    const list = Array.isArray(crops) ? crops : [];
    const stored = normalizeCropId(readSelectedCropId());
    const hasStored = stored && list.some((crop) => normalizeCropId(crop?.id) === stored);
    let nextId = stored;
    if (!hasStored) {
        nextId = list.length ? normalizeCropId(list[0]?.id) : null;
    }
    const changed = setSelectedCropId(nextId, { silent: options.silent });
    if (!changed) {
        applySelectedCropUI();
    }
    return selectedCropId;
}

selectedCropId = readSelectedCropId();

// ============================================================
// DATE VALIDATION HELPERS (V9.6.6)
// Block future dates and invalid dates like 2026-02-30
// ============================================================

/**
 * Get today's date in YYYY-MM-DD format using LOCAL timezone (not UTC).
 * Critical: toISOString() returns UTC date which can be wrong after 8pm local.
 */
function getTodayLocalISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Validate that a string is a valid YYYY-MM-DD date that actually exists.
 * Detects invalid dates like 2026-02-30 or 2026-13-01.
 */
function isValidISODate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;

    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    // Create date in local timezone
    const dateObj = new Date(yyyy, mm - 1, dd);
    // Round-trip check: if 2026-02-30 is passed, Date will auto-correct to 2026-03-02
    return dateObj.getFullYear() === yyyy &&
        dateObj.getMonth() === mm - 1 &&
        dateObj.getDate() === dd;
}

/**
 * Assert that a date is not in the future (local timezone).
 * Returns { valid: boolean, error: string|null }
 */
function assertDateNotFuture(dateStr, fieldLabel = 'Fecha') {
    if (!dateStr) {
        return { valid: false, error: `${fieldLabel} es requerida.` };
    }
    if (!isValidISODate(dateStr)) {
        return { valid: false, error: `${fieldLabel} inválida (ej: día no existe).` };
    }
    const todayLocal = getTodayLocalISO();
    if (dateStr > todayLocal) {
        return { valid: false, error: `No se permiten fechas futuras.` };
    }
    return { valid: true, error: null };
}

// Expose globally for index.html inline scripts
window.getTodayLocalISO = getTodayLocalISO;
window.isValidISODate = isValidISODate;
window.assertDateNotFuture = assertDateNotFuture;

// ============================================================
// HISTORY ORDERING & DAY GROUPING HELPERS (V9.6.7)
// Sort by timestamp DESC and group visually by day
// ============================================================

/**
 * Get timestamp (ms) for sorting a facturero row.
 * Priority: created_at > updated_at > fecha/date field (noon local).
 */
function getRowTimestamp(row, dateFieldName = 'fecha') {
    // Priority 1: event date (YYYY-MM-DD) -> use noon local to avoid timezone edge cases
    const dateStr = row[dateFieldName] || row.fecha || row.date;
    if (dateStr && typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const datePart = dateStr.slice(0, 10);
        const [yyyy, mm, dd] = datePart.split('-').map(Number);
        const d = new Date(yyyy, mm - 1, dd, 12, 0, 0);
        return d.getTime();
    }
    // Priority 2: created_at (full ISO timestamp)
    if (row.created_at) {
        const ts = Date.parse(row.created_at);
        if (!isNaN(ts)) return ts;
    }
    // Priority 3: updated_at
    if (row.updated_at) {
        const ts = Date.parse(row.updated_at);
        if (!isNaN(ts)) return ts;
    }
    // Fallback: epoch 0 (will sort to end)
    return 0;
}

/**
 * Get day key (YYYY-MM-DD) from row for grouping.
 */
function getDayKey(row, dateFieldName = 'fecha') {
    // Try event date field first
    const dateStr = row[dateFieldName] || row.fecha || row.date;
    if (dateStr && typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.slice(0, 10);
    }
    // Fallback: created_at (local day)
    if (row.created_at) {
        const d = new Date(row.created_at);
        if (!isNaN(d.getTime())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
    }
    return 'unknown';
}

/**
 * Group rows by day, sorted DESC (newest day first).
 * Returns: [{ dayKey, label, rows: [...] }, ...]
 */
function groupRowsByDay(rows, dateFieldName = 'fecha') {
    // Sort rows by timestamp DESC
    const sorted = [...rows].sort((a, b) => getRowTimestamp(b, dateFieldName) - getRowTimestamp(a, dateFieldName));

    // Group into Map
    const groups = new Map();
    for (const row of sorted) {
        const dayKey = getDayKey(row, dateFieldName);
        if (!groups.has(dayKey)) {
            groups.set(dayKey, []);
        }
        groups.get(dayKey).push(row);
    }

    // Convert to array with formatted labels
    const result = [];
    const dayKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a)); // DESC
    for (const dayKey of dayKeys) {
        result.push({
            dayKey,
            label: formatDayHeader(dayKey),
            rows: groups.get(dayKey)
        });
    }
    return result;
}

/**
 * Format day key into human-readable Spanish label.
 * Example: "2026-02-01" => "1 Feb 2026"
 */
function formatDayHeader(dayKey) {
    if (dayKey === 'unknown') return 'Sin fecha';
    const [yyyy, mm, dd] = dayKey.split('-').map(Number);
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const today = new Date();
    const isToday = today.getFullYear() === yyyy && (today.getMonth() + 1) === mm && today.getDate() === dd;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.getFullYear() === yyyy && (yesterday.getMonth() + 1) === mm && yesterday.getDate() === dd;

    if (isToday) return 'Hoy';
    if (isYesterday) return 'Ayer';
    return `${dd} ${monthNames[mm - 1]} ${yyyy}`;
}

// Expose globally
window.getRowTimestamp = getRowTimestamp;
window.getDayKey = getDayKey;
window.groupRowsByDay = groupRowsByDay;
window.formatDayHeader = formatDayHeader;

// ============================================================
// V9.6: PLANTILLAS LOCALES (TACHIRA)
// ============================================================
const CROP_TEMPLATES_ENDPOINTS = ['/agro/crops_data.json', './crops_data.json'];
let cropTemplates = [];
let cropTemplatesByKey = {};
let cropTemplatesPromise = null;
const CROP_TEMPLATE_MAP_KEY = 'YG_AGRO_CROP_TEMPLATES_V1';

function normalizeCropTemplates(list) {
    const rows = Array.isArray(list) ? list : [];
    return rows
        .filter(item => item && typeof item.key === 'string' && typeof item.name === 'string')
        .map(item => ({
            key: item.key.trim(),
            name: item.name.trim(),
            region: item.region || '',
            duration_days: Number(item.duration_days),
            notes: item.notes || ''
        }))
        .filter(item => item.key && item.name && Number.isFinite(item.duration_days) && item.duration_days > 0);
}

async function loadCropTemplates() {
    if (cropTemplatesPromise) return cropTemplatesPromise;

    cropTemplatesPromise = (async () => {
        let templates = [];
        for (const url of CROP_TEMPLATES_ENDPOINTS) {
            try {
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) continue;
                const payload = await res.json();
                templates = normalizeCropTemplates(payload);
                if (templates.length) break;
            } catch (err) {
                // Silent fallback to next endpoint
            }
        }

        cropTemplates = templates;
        cropTemplatesByKey = {};
        cropTemplates.forEach(item => {
            cropTemplatesByKey[item.key] = item;
        });

        console.info(`[AGRO] V9.6: templates loaded (${cropTemplates.length})`);
        return cropTemplates;
    })();

    return cropTemplatesPromise;
}

function readCropTemplateMap() {
    try {
        const raw = localStorage.getItem(CROP_TEMPLATE_MAP_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function writeCropTemplateMap(map) {
    try {
        localStorage.setItem(CROP_TEMPLATE_MAP_KEY, JSON.stringify(map));
    } catch (e) {
        // Ignore storage errors
    }
}

function storeCropTemplateMapping(cropId, durationDays) {
    if (!cropId || !Number.isFinite(durationDays)) return;
    const map = readCropTemplateMap();
    map[String(cropId)] = Math.round(durationDays);
    writeCropTemplateMap(map);
}

function getStoredTemplateDuration(cropId) {
    if (!cropId) return null;
    const map = readCropTemplateMap();
    const duration = Number(map[String(cropId)]);
    return Number.isFinite(duration) ? duration : null;
}

function getTemplateDurationByKey(key) {
    if (!key) return null;
    const template = cropTemplatesByKey[key];
    if (!template) return null;
    const days = Number(template.duration_days);
    return Number.isFinite(days) ? days : null;
}

function populateCropTemplateSelect() {
    const select = document.getElementById('crop-template');
    if (!select) return 0;

    // Preserve current value
    const currentValue = select.value;

    // Keep first option (manual) and clear the rest
    while (select.options.length > 1) {
        select.remove(1);
    }

    cropTemplates.forEach((template) => {
        const option = document.createElement('option');
        option.value = template.key;
        option.textContent = template.region
            ? `${template.name} (${template.region})`
            : template.name;
        option.dataset.duration = String(template.duration_days);
        select.appendChild(option);
    });

    if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
    }

    return cropTemplates.length;
}

function formatDateKey(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateKey(dateStr) {
    if (!dateStr) return null;
    const parts = String(dateStr).split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return { year: parts[0], month: parts[1], day: parts[2] };
}

function addDaysToDateKey(dateStr, days) {
    const parsed = parseDateKey(dateStr);
    if (!parsed || !Number.isFinite(days)) return '';
    // Use UTC to avoid timezone offset issues
    const utcMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
    const futureMs = utcMs + (Math.round(days) * 24 * 60 * 60 * 1000);
    const futureDate = new Date(futureMs);
    const y = futureDate.getUTCFullYear();
    const m = String(futureDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(futureDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function toUtcDate(dateStr) {
    const parsed = parseDateKey(dateStr);
    if (!parsed) return null;
    return Date.UTC(parsed.year, parsed.month - 1, parsed.day);
}

function diffDays(endStr, startStr) {
    const endUtc = toUtcDate(endStr);
    const startUtc = toUtcDate(startStr);
    if (endUtc === null || startUtc === null) return null;
    return Math.floor((endUtc - startUtc) / 86400000);
}

function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getTodayKey() {
    return formatDateKey(new Date());
}

function getSelectedTemplateDuration() {
    const select = document.getElementById('crop-template');
    const option = select?.selectedOptions?.[0];
    if (!option?.dataset?.duration) return null;
    const duration = Number(option.dataset.duration);
    return Number.isFinite(duration) ? duration : null;
}

function updateTemplateCycleDisplay(durationDays) {
    const cycleInput = document.getElementById('crop-template-cycle');
    if (!cycleInput) return;
    if (Number.isFinite(durationDays) && durationDays > 0) {
        cycleInput.value = `${Math.round(durationDays)} dias`;
    } else {
        cycleInput.value = '--';
    }
}

function maybeAutoFillHarvestDate() {
    const startInput = document.getElementById('crop-start-date');
    const harvestInput = document.getElementById('crop-harvest-date');
    if (!startInput || !harvestInput) return;
    if (harvestInput.value) return;

    const durationDays = getSelectedTemplateDuration();
    if (!Number.isFinite(durationDays) || durationDays <= 0) return;

    const computed = addDaysToDateKey(startInput.value, durationDays);
    if (computed) {
        harvestInput.value = computed;
    }
}

function initCropTemplateControls() {
    if (document.__agroTemplateControlsBound) return;
    document.__agroTemplateControlsBound = true;

    const select = document.getElementById('crop-template');
    const startInput = document.getElementById('crop-start-date');
    const form = document.getElementById('form-new-crop');

    if (select) {
        select.addEventListener('change', () => {
            updateTemplateCycleDisplay(getSelectedTemplateDuration());
            maybeAutoFillHarvestDate();
        });
    }

    if (startInput) {
        startInput.addEventListener('change', () => {
            maybeAutoFillHarvestDate();
        });
    }

    if (form) {
        form.addEventListener('reset', () => {
            updateTemplateCycleDisplay(null);
        });
    }
}

function getTemplateDurationForCrop(crop) {
    if (crop?.id) {
        const stored = getStoredTemplateDuration(crop.id);
        if (Number.isFinite(stored)) return stored;
    }
    if (crop?.template_key) {
        const duration = getTemplateDurationByKey(crop.template_key);
        if (Number.isFinite(duration)) return duration;
    }
    if (Number.isFinite(crop?.template_duration_days)) {
        return crop.template_duration_days;
    }
    return null;
}

function computeCropProgress(crop, templateDurationDays) {
    const startDate = crop?.start_date;
    if (!startDate) {
        return { ok: false, label: 'N/A', percent: null, dayIndex: 0, totalDays: 0 };
    }

    let totalDays = null;
    let endDate = null;
    const templateDays = Number.isFinite(templateDurationDays) ? Math.round(templateDurationDays) : null;

    if (templateDays && templateDays > 0) {
        totalDays = Math.max(1, templateDays);
        endDate = addDaysToDateKey(startDate, totalDays);
    } else if (crop?.expected_harvest_date) {
        const diff = diffDays(crop.expected_harvest_date, startDate);
        if (diff !== null) {
            totalDays = Math.max(1, diff);
            endDate = crop.expected_harvest_date;
        }
    }

    if (!totalDays || !endDate) {
        return { ok: false, label: 'N/A', percent: null, dayIndex: 0, totalDays: 0 };
    }

    const todayKey = getTodayKey();
    const dayDiff = diffDays(todayKey, startDate);
    const dayIndex = clampNumber((dayDiff === null ? 0 : dayDiff) + 1, 0, totalDays);
    const percent = clampNumber((dayIndex / totalDays) * 100, 0, 100);

    return {
        ok: true,
        label: `Dia ${dayIndex} de ${totalDays}`,
        percent,
        dayIndex,
        totalDays
    };
}

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
        extraFields: ['categoria', 'unit_type', 'unit_qty', 'quantity_kg'],
        supportsDeletedAt: true
    },
    'pendientes': {
        table: 'agro_pending',
        containerId: 'pending-history-container',
        listId: 'pending-history-list',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        extraFields: ['cliente', 'unit_type', 'unit_qty', 'quantity_kg'],
        supportsDeletedAt: true
    },
    'perdidas': {
        table: 'agro_losses',
        containerId: 'loss-history-container',
        listId: 'loss-history-list',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        extraFields: ['causa', 'unit_type', 'unit_qty', 'quantity_kg'],
        supportsDeletedAt: true
    },
    'transferencias': {
        table: 'agro_transfers',
        containerId: 'transfer-history-container',
        listId: 'transfer-history-list',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        extraFields: ['destino', 'unit_type', 'unit_qty', 'quantity_kg'],
        supportsDeletedAt: true
    }
};

const FACTURERO_OPTIONAL_FIELDS = {
    pendientes: ['transferred_at', 'transferred_income_id', 'transferred_by', 'transferred_to', 'transfer_state', 'reverted_at', 'reverted_reason'],
    ingresos: ['origin_table', 'origin_id', 'transfer_state', 'reverted_at', 'reverted_reason'],
    perdidas: ['origin_table', 'origin_id', 'transfer_state', 'reverted_at', 'reverted_reason']
};

const FACTURERO_OPTIONAL_FIELDS_SUPPORT = {
    pendientes: null,
    ingresos: null,
    perdidas: null
};

const PENDING_TRANSFER_FILTER_KEY = 'YG_PENDING_SHOW_TRANSFERRED_V1';

const FACTURERO_EVIDENCE_FIELDS = {
    gastos: ['evidence_url'],
    ingresos: ['soporte_url'], // agro_income does NOT have evidence_url column
    pendientes: ['evidence_url'], // soporte_url not in DB
    perdidas: ['evidence_url'],   // soporte_url not in DB
    transferencias: ['evidence_url'] // soporte_url not in DB
};

const EVIDENCE_LINK_STYLE = 'color: var(--gold-primary); text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;';
const EVIDENCE_LINK_LABEL = 'Ver recibo';
const evidenceSignedUrlCache = new Map();
let pendingCache = [];

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

// ============================================================
// V9.6: FACTURERO "A QUIEN" (DISPLAY + PARSE + FALLBACK)
// ============================================================
const WHO_FIELD_META = {
    ingresos: { label: 'Comprador', icon: '👤', field: null },
    pendientes: { label: 'Cliente', icon: '👤', field: 'cliente' },
    transferencias: { label: 'Destino', icon: '📌', field: 'destino' },
    perdidas: { label: 'Causa/Responsable', icon: '⚠️', field: 'causa' }
};

const INCOME_UNIT_OPTIONS = [
    { value: '', label: 'Seleccionar...' },
    { value: 'saco', label: 'Saco', singular: 'saco', plural: 'sacos' },
    { value: 'medio_saco', label: 'Medio saco', singular: 'medio saco', plural: 'medios sacos' },
    { value: 'cesta', label: 'Cesta', singular: 'cesta', plural: 'cestas' }
];

const FACTURERO_EXTRA_FIELD_META = {
    unit_type: {
        label: 'Presentacion',
        type: 'select',
        options: INCOME_UNIT_OPTIONS
    },
    unit_qty: {
        label: 'Cantidad (unidad)',
        type: 'number',
        min: '0',
        step: '0.01',
        placeholder: 'Ej: 2'
    },
    quantity_kg: {
        label: 'Kilogramos',
        type: 'number',
        min: '0',
        step: '0.01',
        placeholder: 'Ej: 50'
    }
};

const FACTURERO_NUMERIC_FIELDS = new Set(['unit_qty', 'quantity_kg']);

function formatUnitQty(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return '';
    return num % 1 === 0 ? String(num) : String(parseFloat(num.toFixed(2)));
}

function formatUnitSummary(unitType, unitQty) {
    const unitKey = String(unitType || '').toLowerCase();
    if (!unitKey) return '';
    const option = INCOME_UNIT_OPTIONS.find((opt) => opt.value === unitKey);
    if (!option) return '';
    const qtyText = formatUnitQty(unitQty);
    if (!qtyText) return '';
    const label = Number(qtyText) === 1 ? option.singular : option.plural;
    return `${qtyText} ${label}`;
}

function formatKgSummary(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return '';
    const text = num % 1 === 0 ? String(num) : num.toFixed(2);
    return `${text} kg`;
}

function populateUnitSelect(select) {
    if (!select) return;
    select.textContent = '';
    INCOME_UNIT_OPTIONS.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
    });
}

function readUnitFields(form, prefix) {
    if (!form || !prefix) return { unit_type: null, unit_qty: null, quantity_kg: null };
    const typeEl = form.querySelector(`#${prefix}-unit-type`);
    const qtyEl = form.querySelector(`#${prefix}-unit-qty`);
    const kgEl = form.querySelector(`#${prefix}-quantity-kg`);
    const unitType = typeEl?.value || '';
    const unitQtyRaw = qtyEl?.value;
    const kgRaw = kgEl?.value;
    const unitQtyValue = Number.isFinite(parseFloat(unitQtyRaw)) && parseFloat(unitQtyRaw) > 0
        ? parseFloat(unitQtyRaw)
        : null;
    const kgValue = Number.isFinite(parseFloat(kgRaw)) && parseFloat(kgRaw) > 0
        ? parseFloat(kgRaw)
        : null;
    const result = {
        unit_type: unitType || null,
        unit_qty: unitQtyValue,
        quantity_kg: kgValue
    };
    // console.log(`[AGRO] V9.6.5 readUnitFields(${prefix}):`, result, { typeEl: !!typeEl, qtyEl: !!qtyEl, kgEl: !!kgEl });
    return result;
}

function parseWhoFromConcept(tabName, concept) {
    const text = String(concept || '').trim();
    if (!text) return { concept: '', who: '' };

    if (tabName === 'ingresos') {
        const match = text.match(/^Venta a\s+(.+?)\s+-\s+(.+)$/i);
        if (match) {
            return { who: match[1].trim(), concept: match[2].trim() };
        }
    }

    if (tabName === 'pendientes') {
        const match = text.match(/^(.*?)\s+-\s+Cliente:\s*(.+)$/i);
        if (match) {
            return { who: match[2].trim(), concept: match[1].trim() };
        }
    }

    if (tabName === 'transferencias') {
        const match = text.match(/^(.*?)\s+-\s+Destino:\s*(.+)$/i);
        if (match) {
            return { who: match[2].trim(), concept: match[1].trim() };
        }
    }

    if (tabName === 'perdidas') {
        const match = text.match(/^(.*?)\s+-\s+Causa(?:\/Responsable)?:\s*(.+)$/i);
        if (match) {
            return { who: match[2].trim(), concept: match[1].trim() };
        }
    }

    return { concept: text, who: '' };
}

function buildConceptWithWho(tabName, concept, whoValue) {
    const safeConcept = String(concept || '').trim();
    const who = String(whoValue || '').trim();
    if (!who) return safeConcept;

    if (tabName === 'ingresos') {
        return `Venta a ${who} - ${safeConcept}`;
    }
    if (tabName === 'pendientes') {
        return `${safeConcept} - Cliente: ${who}`;
    }
    if (tabName === 'transferencias') {
        return `${safeConcept} - Destino: ${who}`;
    }
    if (tabName === 'perdidas') {
        return `${safeConcept} - Causa: ${who}`;
    }
    return safeConcept;
}

function getWhoData(tabName, item, concept) {
    const meta = WHO_FIELD_META[tabName] || null;
    const parsed = parseWhoFromConcept(tabName, concept);
    const fieldValue = meta?.field && item ? item[meta.field] : '';
    const who = fieldValue || parsed.who || '';
    return {
        who: String(who || '').trim(),
        concept: parsed.concept || concept || ''
    };
}

function formatWhoDisplay(tabName, whoValue) {
    const meta = WHO_FIELD_META[tabName];
    if (!meta || !whoValue) return '';
    const label = meta.label || 'Detalle';
    const icon = meta.icon || '•';
    return `${icon} ${label}: ${escapeHtml(whoValue)}`;
}

function isMissingColumnError(error, column) {
    if (!error || !column) return false;
    const code = (error.code || '').toString();
    const msg = (error.message || '').toLowerCase();
    const details = (error.details || '').toLowerCase();
    const text = `${msg} ${details}`;
    const col = column.toLowerCase();
    const hasMissingPhrase = text.includes('does not exist') || text.includes('could not find') || text.includes('not found');
    if (code === '42703') return true;
    if (!hasMissingPhrase) return false;
    return text.includes('column') && text.includes(col);
}

function isPendingTransferred(item) {
    if (!item) return false;
    // V9.7: Use transfer_state for accurate detection
    if (item.transfer_state === 'transferred') return true;
    // Legacy fallback for data without transfer_state
    return !!(item.transferred_at || item.transferred_income_id);
}

// V9.7: Check if a pending item was transferred but then reverted (back to active)
function isPendingReverted(item) {
    if (!item) return false;
    return item.transfer_state === 'reverted';
}

// V9.7: Check if income/loss originated from a pending transfer
function isFromPendingTransfer(item) {
    if (!item) return false;
    return item.origin_table === 'agro_pending' && !!item.origin_id;
}

// V9.7: Check if income/loss was reverted back to pending
function isIncomeOrLossReverted(item) {
    if (!item) return false;
    return item.transfer_state === 'reverted';
}

function readPendingTransferFilter() {
    try {
        return localStorage.getItem(PENDING_TRANSFER_FILTER_KEY) === '1';
    } catch (e) {
        return false;
    }
}

function writePendingTransferFilter(value) {
    try {
        localStorage.setItem(PENDING_TRANSFER_FILTER_KEY, value ? '1' : '0');
    } catch (e) {
        // Ignore storage errors
    }
}

function formatTransferMeta(item) {
    if (!item) return 'Transferido';

    // V9.7: Show destination and status
    const dest = item.transferred_to;
    let destLabel = '';
    if (dest === 'income') {
        destLabel = 'Ingresos (Pagado)';
    } else if (dest === 'losses') {
        destLabel = 'Pérdidas (Cancelado)';
    } else {
        destLabel = 'Ingresos'; // Legacy fallback
    }

    // Check if reverted
    if (item.transfer_state === 'reverted') {
        const revertDate = item.reverted_at ? new Date(item.reverted_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
        return `Revertido${revertDate ? ` (${revertDate})` : ''} — antes: → ${destLabel}`;
    }

    // Active transfer
    if (!item.transferred_at) return `Transferido → ${destLabel}`;
    try {
        const date = new Date(item.transferred_at);
        if (Number.isNaN(date.getTime())) return `Transferido → ${destLabel}`;
        const stamp = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        return `Transferido → ${destLabel} (${stamp})`;
    } catch (e) {
        return `Transferido → ${destLabel}`;
    }
}

// V9.7: Format origin badge for income/losses from pending
function formatOriginBadge(item, tabName) {
    if (!isFromPendingTransfer(item)) return '';

    const isReverted = isIncomeOrLossReverted(item);
    if (isReverted) {
        return '<span class="transfer-badge transfer-badge-reverted">Revertido</span>';
    }

    const statusLabel = tabName === 'perdidas' ? 'Cancelado' : 'Pagado';
    return `<span class="transfer-badge transfer-badge-origin">Transferido desde Pendientes • ${statusLabel}</span>`;
}

// ============================================================
// V9.7: TRANSFER FUNCTIONS (Pending <-> Income/Losses)
// ============================================================

/**
 * Transfer a pending item to income (mark as paid)
 * @param {string} pendingId - ID of the pending item
 * @returns {Promise<{success: boolean, incomeId?: string, error?: string}>}
 */
async function transferPendingToIncome(pendingId) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return { success: false, error: 'No autenticado' };
    const userId = userData.user.id;

    // 1. Fetch pending item
    const { data: pending, error: fetchError } = await supabase
        .from('agro_pending')
        .select(AGRO_PENDING_TRANSFER_COLUMNS)
        .eq('id', pendingId)
        .eq('user_id', userId)
        .single();

    if (fetchError || !pending) {
        return { success: false, error: fetchError?.message || 'Pendiente no encontrado' };
    }

    // 2. Check idempotency - already transferred and not reverted?
    if (pending.transfer_state === 'transferred') {
        console.info('[V9.7] Pending already transferred, idempotent return');
        return { success: true, incomeId: pending.transferred_income_id, message: 'Ya transferido' };
    }

    // 3. Create income record
    const incomeData = {
        user_id: userId,
        concepto: pending.concepto,
        monto: pending.monto,
        fecha: pending.fecha,
        categoria: 'venta',
        crop_id: pending.crop_id,
        unit_type: pending.unit_type,
        unit_qty: pending.unit_qty,
        quantity_kg: pending.quantity_kg,
        // V9.7: Transfer origin tracking
        origin_table: 'agro_pending',
        origin_id: pending.id,
        transfer_state: 'active'
    };

    const { data: income, error: insertError } = await supabase
        .from('agro_income')
        .insert([incomeData])
        .select('id')
        .single();

    if (insertError || !income) {
        return { success: false, error: insertError?.message || 'Error creando ingreso' };
    }

    // 4. Update pending with transfer metadata
    const { error: updateError } = await supabase
        .from('agro_pending')
        .update({
            transferred_to: 'income',
            transferred_to_id: income.id,
            transfer_state: 'transferred',
            transferred_at: new Date().toISOString(),
            transferred_by: userId
        })
        .eq('id', pendingId)
        .eq('user_id', userId);

    if (updateError) {
        console.error('[V9.7] Error updating pending after transfer:', updateError);
    }

    console.info('[V9.7] Transferred pending to income:', { pendingId, incomeId: income.id });
    return { success: true, incomeId: income.id };
}

/**
 * Transfer a pending item to losses (mark as cancelled/lost)
 * @param {string} pendingId - ID of the pending item
 * @returns {Promise<{success: boolean, lossId?: string, error?: string}>}
 */
async function transferPendingToLoss(pendingId) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return { success: false, error: 'No autenticado' };
    const userId = userData.user.id;

    // 1. Fetch pending item
    const { data: pending, error: fetchError } = await supabase
        .from('agro_pending')
        .select(AGRO_PENDING_TRANSFER_COLUMNS)
        .eq('id', pendingId)
        .eq('user_id', userId)
        .single();

    if (fetchError || !pending) {
        return { success: false, error: fetchError?.message || 'Pendiente no encontrado' };
    }

    // 2. Check idempotency
    if (pending.transfer_state === 'transferred' && pending.transferred_to === 'losses') {
        console.info('[V9.7] Pending already transferred to losses, idempotent return');
        return { success: true, lossId: pending.transferred_to_id, message: 'Ya transferido' };
    }

    // 3. Create loss record
    const lossData = {
        user_id: userId,
        concepto: pending.concepto,
        monto: pending.monto,
        fecha: pending.fecha,
        causa: 'Pendiente cancelado',
        crop_id: pending.crop_id,
        unit_type: pending.unit_type,
        unit_qty: pending.unit_qty,
        quantity_kg: pending.quantity_kg,
        // V9.7: Transfer origin tracking
        origin_table: 'agro_pending',
        origin_id: pending.id,
        transfer_state: 'active'
    };

    const { data: loss, error: insertError } = await supabase
        .from('agro_losses')
        .insert([lossData])
        .select('id')
        .single();

    if (insertError || !loss) {
        return { success: false, error: insertError?.message || 'Error creando pérdida' };
    }

    // 4. Update pending with transfer metadata
    const { error: updateError } = await supabase
        .from('agro_pending')
        .update({
            transferred_to: 'losses',
            transferred_to_id: loss.id,
            transfer_state: 'transferred',
            transferred_at: new Date().toISOString(),
            transferred_by: userId
        })
        .eq('id', pendingId)
        .eq('user_id', userId);

    if (updateError) {
        console.error('[V9.7] Error updating pending after transfer to loss:', updateError);
    }

    console.info('[V9.7] Transferred pending to loss:', { pendingId, lossId: loss.id });
    return { success: true, lossId: loss.id };
}

/**
 * Revert an income back to pending (mark income as reverted, reactivate pending)
 * @param {string} incomeId - ID of the income item
 * @param {string} reason - Optional reason for reverting
 * @returns {Promise<{success: boolean, pendingId?: string, error?: string}>}
 */
async function revertIncomeToPending(incomeId, reason = '') {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return { success: false, error: 'No autenticado' };
    const userId = userData.user.id;

    // 1. Fetch income with origin info
    const { data: income, error: fetchError } = await supabase
        .from('agro_income')
        .select(AGRO_INCOME_TRANSFER_COLUMNS)
        .eq('id', incomeId)
        .eq('user_id', userId)
        .single();

    if (fetchError || !income) {
        return { success: false, error: fetchError?.message || 'Ingreso no encontrado' };
    }

    // 2. Validate origin
    if (income.origin_table !== 'agro_pending' || !income.origin_id) {
        return { success: false, error: 'Este ingreso no proviene de un pendiente' };
    }

    // 3. Check idempotency
    if (income.transfer_state === 'reverted') {
        console.info('[V9.7] Income already reverted, idempotent return');
        return { success: true, pendingId: income.origin_id, message: 'Ya revertido' };
    }

    // 4. Mark income as reverted
    const { error: incomeUpdateError } = await supabase
        .from('agro_income')
        .update({
            transfer_state: 'reverted',
            reverted_at: new Date().toISOString(),
            reverted_reason: reason || 'Devuelto a pendientes'
        })
        .eq('id', incomeId)
        .eq('user_id', userId);

    if (incomeUpdateError) {
        return { success: false, error: incomeUpdateError.message };
    }

    // 5. Reactivate pending
    const { error: pendingUpdateError } = await supabase
        .from('agro_pending')
        .update({
            transfer_state: 'reverted',
            reverted_at: new Date().toISOString(),
            reverted_reason: reason || 'Devuelto desde ingreso'
        })
        .eq('id', income.origin_id)
        .eq('user_id', userId);

    if (pendingUpdateError) {
        console.error('[V9.7] Error reactivating pending:', pendingUpdateError);
    }

    console.info('[V9.7] Reverted income to pending:', { incomeId, pendingId: income.origin_id });
    return { success: true, pendingId: income.origin_id };
}

/**
 * Revert a loss back to pending (mark loss as reverted, reactivate pending)
 * @param {string} lossId - ID of the loss item
 * @param {string} reason - Optional reason for reverting
 * @returns {Promise<{success: boolean, pendingId?: string, error?: string}>}
 */
async function revertLossToPending(lossId, reason = '') {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return { success: false, error: 'No autenticado' };
    const userId = userData.user.id;

    // 1. Fetch loss with origin info
    const { data: loss, error: fetchError } = await supabase
        .from('agro_losses')
        .select(AGRO_LOSS_TRANSFER_COLUMNS)
        .eq('id', lossId)
        .eq('user_id', userId)
        .single();

    if (fetchError || !loss) {
        return { success: false, error: fetchError?.message || 'Pérdida no encontrada' };
    }

    // 2. Validate origin
    if (loss.origin_table !== 'agro_pending' || !loss.origin_id) {
        return { success: false, error: 'Esta pérdida no proviene de un pendiente' };
    }

    // 3. Check idempotency
    if (loss.transfer_state === 'reverted') {
        console.info('[V9.7] Loss already reverted, idempotent return');
        return { success: true, pendingId: loss.origin_id, message: 'Ya revertido' };
    }

    // 4. Mark loss as reverted
    const { error: lossUpdateError } = await supabase
        .from('agro_losses')
        .update({
            transfer_state: 'reverted',
            reverted_at: new Date().toISOString(),
            reverted_reason: reason || 'Devuelto a pendientes'
        })
        .eq('id', lossId)
        .eq('user_id', userId);

    if (lossUpdateError) {
        return { success: false, error: lossUpdateError.message };
    }

    // 5. Reactivate pending
    const { error: pendingUpdateError } = await supabase
        .from('agro_pending')
        .update({
            transfer_state: 'reverted',
            reverted_at: new Date().toISOString(),
            reverted_reason: reason || 'Devuelto desde pérdida'
        })
        .eq('id', loss.origin_id)
        .eq('user_id', userId);

    if (pendingUpdateError) {
        console.error('[V9.7] Error reactivating pending from loss:', pendingUpdateError);
    }

    console.info('[V9.7] Reverted loss to pending:', { lossId, pendingId: loss.origin_id });
    return { success: true, pendingId: loss.origin_id };
}

/**
 * Handle revert from income to pending
 * @param {string} incomeId - ID of the income item
 */
async function handleRevertIncome(incomeId) {
    if (!confirm('¿Devolver este ingreso a Pendientes? El ingreso quedará marcado como revertido.')) {
        return;
    }

    const result = await revertIncomeToPending(incomeId);

    if (result.success) {
        await refreshFactureroHistory('ingresos');
        await refreshFactureroHistory('pendientes');
        await updateStats();
    } else {
        alert('Error: ' + (result.error || 'No se pudo revertir'));
    }
}

/**
 * Handle revert from loss to pending
 * @param {string} lossId - ID of the loss item
 */
async function handleRevertLoss(lossId) {
    if (!confirm('¿Devolver esta pérdida a Pendientes? La pérdida quedará marcada como revertida.')) {
        return;
    }

    const result = await revertLossToPending(lossId);

    if (result.success) {
        await refreshFactureroHistory('perdidas');
        await refreshFactureroHistory('pendientes');
        await updateStats();
    } else {
        alert('Error: ' + (result.error || 'No se pudo revertir'));
    }
}

/**
 * Show modal to choose transfer destination (income or losses)
 * @returns {Promise<'income'|'losses'|null>}
 */
function showTransferChoiceModal(options = {}) {
    return new Promise((resolve) => {
        const title = options.title || '\u00bfA d\u00f3nde transferir?';
        const choices = Array.isArray(options.choices) && options.choices.length
            ? options.choices
            : [
                { value: 'income', label: 'Ingresos (Pagado)' },
                { value: 'losses', label: 'P\u00e9rdidas (Cancelado)' }
            ];

        const styleMap = {
            income: {
                className: 'transfer-to-income',
                color: '#4ade80',
                border: 'rgba(74, 222, 128, 0.5)',
                bg: 'rgba(74, 222, 128, 0.15)',
                icon: 'fa-arrow-right'
            },
            losses: {
                className: 'transfer-to-losses',
                color: '#ef4444',
                border: 'rgba(239, 68, 68, 0.5)',
                bg: 'rgba(239, 68, 68, 0.15)',
                icon: 'fa-times'
            },
            pendientes: {
                className: 'transfer-to-pendientes',
                color: '#C8A752',
                border: 'rgba(200, 167, 82, 0.5)',
                bg: 'rgba(200, 167, 82, 0.15)',
                icon: 'fa-clock'
            }
        };

        const buttonsHtml = choices.map((choice) => {
            const key = choice.value;
            const style = styleMap[key] || styleMap.pendientes;
            const icon = choice.icon || style.icon;
            return `
                <button type="button" class="transfer-choice-btn ${style.className}" data-choice="${key}"
                    style="background: ${style.bg}; border: 1px solid ${style.border}; color: ${style.color}; padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
                    <i class="fa ${icon}"></i> ${choice.label}
                </button>
            `;
        }).join('');

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'transfer-modal-overlay';
        overlay.innerHTML = `
            <div class="transfer-modal">
                <h3 style="color: #fff; margin: 0 0 1rem 0; font-size: 1rem;">${title}</h3>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${buttonsHtml}
                    <button type="button" class="transfer-cancel-btn" data-choice="__cancel__"
                        style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.6); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; margin-top: 0.5rem;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const cleanup = () => {
            if (overlay.parentNode) {
                document.body.removeChild(overlay);
            }
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(null);
                return;
            }
            const btn = e.target.closest('[data-choice]');
            if (!btn) return;
            const choice = btn.dataset.choice;
            cleanup();
            if (!choice || choice === '__cancel__') {
                resolve(null);
            } else {
                resolve(choice);
            }
        });
    });
}

// ============================================================

function ensurePendingTransferFilterUI(parent, items) {
    if (!parent) return;
    let wrapper = parent.querySelector('#pending-transfer-filter');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'pending-transfer-filter';
        wrapper.className = 'pending-transfer-filter';
        const label = document.createElement('label');
        label.className = 'pending-transfer-label';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'pending-transfer-toggle';
        checkbox.checked = readPendingTransferFilter();
        const text = document.createElement('span');
        text.className = 'pending-transfer-text';
        label.append(checkbox, text);
        wrapper.appendChild(label);
        parent.prepend(wrapper);

        checkbox.addEventListener('change', () => {
            writePendingTransferFilter(checkbox.checked);
            refreshFactureroHistory('pendientes');
        });
    }

    const transferredCount = Array.isArray(items)
        ? items.filter((item) => isPendingTransferred(item)).length
        : 0;
    const text = wrapper.querySelector('.pending-transfer-text');
    if (text) {
        text.textContent = transferredCount > 0
            ? `Ver transferidos (${transferredCount})`
            : 'Ver transferidos';
    }
}

function applyPendingTransferFilter(items) {
    if (!Array.isArray(items)) return [];
    const showTransferred = readPendingTransferFilter();
    if (showTransferred) return items;
    return items.filter((item) => !isPendingTransferred(item));
}

function renderHistoryRow(tabName, item, config) {
    const rawConcept = item[config.conceptField] || 'Sin concepto';
    const amount = Number(item[config.amountField] || 0);
    const date = item[config.dateField];
    const cropName = item.crop_name || '';
    const evidenceUrl = item.evidence_url_resolved || '';
    const evidenceHtml = evidenceUrl ? `<span>${buildEvidenceLinkHtml(evidenceUrl)}</span>` : '';
    const whoData = getWhoData(tabName, item, rawConcept);
    const whoLine = whoData.who
        ? `<div style="color: rgba(255,255,255,0.6); font-size: 0.75rem; margin-top: 2px;">• ${formatWhoDisplay(tabName, whoData.who)}</div>`
        : '';
    const displayConcept = whoData.concept || rawConcept;
    const unitSummary = formatUnitSummary(item.unit_type, item.unit_qty);
    const kgSummary = formatKgSummary(item.quantity_kg);
    const unitMetaParts = [];
    if (unitSummary) unitMetaParts.push(escapeHtml(unitSummary));
    if (kgSummary) unitMetaParts.push(escapeHtml(kgSummary));
    const unitHtml = unitMetaParts.length ? `<div class="facturero-meta">${unitMetaParts.join(' &bull; ')}</div>` : '';

    const isPending = tabName === 'pendientes';
    const isIncome = tabName === 'ingresos';
    const isLoss = tabName === 'perdidas';

    // V9.7: Transfer state tracking
    const transferred = isPending && isPendingTransferred(item);
    const pendingReverted = isPending && isPendingReverted(item);
    const fromPending = (isIncome || isLoss) && isFromPendingTransfer(item);
    const incomeOrLossReverted = (isIncome || isLoss) && isIncomeOrLossReverted(item);

    // Transfer meta for pending items
    let transferHtml = '';
    if (transferred) {
        transferHtml = `<div class="facturero-meta facturero-transfer-meta">${formatTransferMeta(item)}</div>`;
    } else if (pendingReverted) {
        transferHtml = `<div class="facturero-meta facturero-transfer-meta facturero-reverted-meta">${formatTransferMeta(item)}</div>`;
    }

    // V9.7: Origin badge for income/losses from pending
    let originBadgeHtml = '';
    if (fromPending) {
        originBadgeHtml = `<div class="facturero-origin-badge">${formatOriginBadge(item, tabName)}</div>`;
    }

    // Transfer button for pending items (not already transferred or reverted-back)
    const showTransferBtn = isPending && !transferred;
    const transferDisabled = FACTURERO_OPTIONAL_FIELDS_SUPPORT.pendientes === false;
    const transferTitle = transferDisabled
        ? 'Transferencia no disponible (faltan columnas)'
        : 'Transferir a ingresos o pérdidas';
    const transferBtn = showTransferBtn
        ? `
                <button type="button" class="btn-transfer-pending" data-tab="${tabName}" data-id="${item.id}" title="${transferTitle}" ${transferDisabled ? 'disabled' : ''} style="background: transparent; border: 1px solid rgba(200,167,82,0.5); color: #C8A752; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: ${transferDisabled ? 'not-allowed' : 'pointer'}; font-size: 0.7rem; opacity: ${transferDisabled ? '0.4' : '1'};">
                    <i class="fa fa-arrow-right-long"></i>
                </button>
            `
        : '';

    const incomeTransferBtn = isIncome
        ? `
                <button type="button" class="btn-transfer-income" data-tab="${tabName}" data-id="${item.id}" title="Transferir ingreso" style="background: transparent; border: 1px solid rgba(200,167,82,0.5); color: #C8A752; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem;">
                    <i class="fa fa-arrow-right-long"></i>
                </button>
            `
        : '';

    const lossTransferBtn = isLoss
        ? `
                <button type="button" class="btn-transfer-loss" data-tab="${tabName}" data-id="${item.id}" title="Transferir pérdida" style="background: transparent; border: 1px solid rgba(200,167,82,0.5); color: #C8A752; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem;">
                    <i class="fa fa-arrow-right-long"></i>
                </button>
            `
        : '';

    // V9.7: Revert button for income/losses from pending (only if not already reverted)
    let revertBtn = '';
    if (fromPending && !incomeOrLossReverted) {
        const revertClass = isIncome ? 'btn-revert-income' : 'btn-revert-loss';
        revertBtn = `
            <button type="button" class="${revertClass}" data-tab="${tabName}" data-id="${item.id}" title="Devolver a Pendientes" style="background: transparent; border: 1px solid rgba(251,191,36,0.5); color: #fbbf24; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem;">
                <i class="fa fa-undo"></i>
            </button>
        `;
    }

    // V9.7: Row styling for reverted items
    const revertedStyle = incomeOrLossReverted ? 'opacity: 0.5;' : '';
    const itemStyle = `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; ${revertedStyle}`;

    return `
        <div class="facturero-item" data-id="${item.id}" data-tab="${tabName}" style="${itemStyle}">
            <div style="flex: 1; min-width: 0;">
                <div style="color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(displayConcept)}</div>
                ${whoLine}
                ${unitHtml}
                ${transferHtml}
                ${originBadgeHtml}
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
                ${transferBtn}
                ${incomeTransferBtn}
                ${lossTransferBtn}
                ${revertBtn}
                <button type="button" class="btn-delete-facturero" data-tab="${tabName}" data-id="${item.id}" title="Eliminar" style="background: transparent; border: 1px solid rgba(239,68,68,0.3); color: #ef4444; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem;">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function buildFactureroSelectFields(tabName, config) {
    const fields = new Set();
    const add = (value) => {
        if (value) fields.add(value);
    };
    add('id');
    add(config?.conceptField);
    add(config?.amountField);
    add(config?.dateField);
    add('created_at');
    add('crop_id');
    (config?.extraFields || []).forEach(add);
    const optional = getFactureroOptionalFields(tabName);
    (optional || []).forEach(add);
    (FACTURERO_EVIDENCE_FIELDS[tabName] || []).forEach(add);
    return Array.from(fields);
}

function buildFactureroSelectClause(fields) {
    const safeFields = Array.isArray(fields) ? fields.filter(Boolean) : [];
    if (safeFields.length === 0) return '*, agro_crops(name)';
    return `${safeFields.join(', ')}, agro_crops(name)`;
}

function getFactureroOptionalFields(tabName) {
    if (!tabName) return [];
    const optional = FACTURERO_OPTIONAL_FIELDS[tabName] || [];
    const support = FACTURERO_OPTIONAL_FIELDS_SUPPORT[tabName];
    if (support === false) return [];
    return optional;
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

function filterFactureroBySelectedCrop(items) {
    if (!Array.isArray(items)) return [];
    if (!selectedCropId) return items;
    return items.filter((item) => normalizeCropId(item?.crop_id) === selectedCropId);
}

/**
 * V9.5.1: Refreshes facturero history for a specific tab with CRUD buttons
 * @param {string} tabName - 'gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias'
 * @param {object} options - { showActions: true }
 */

let AGRO_LOSSES_SUPPORTS_SOFT_DELETE = null; // null | true | false

function _looksLikeMissingColumn(err) {
    const msg = String(err?.message || '').toLowerCase();
    const det = String(err?.details || '').toLowerCase();
    const hint = String(err?.hint || '').toLowerCase();
    const code = String(err?.code || '').toLowerCase();
    const blob = `${msg} ${det} ${hint} ${code}`;
    return (
        blob.includes('deleted_at') ||
        blob.includes('column') ||
        blob.includes('pgrst') ||
        blob.includes('unknown') ||
        blob.includes('does not exist')
    );
}

const LS_LOSSES_SOFT_DELETE = 'YG_LOSSES_HAS_DELETED_AT_V1';

async function fetchAgroLosses(supabase, userId) {
    // Check localStorage cache first (Fix B)
    if (AGRO_LOSSES_SUPPORTS_SOFT_DELETE === null) {
        const cached = localStorage.getItem(LS_LOSSES_SOFT_DELETE);
        if (cached === '1') AGRO_LOSSES_SUPPORTS_SOFT_DELETE = true;
        if (cached === '0') AGRO_LOSSES_SUPPORTS_SOFT_DELETE = false;
    }

    const base = () =>
        (() => {
            let q = supabase
                .from('agro_losses')
                .select('*, agro_crops(name)')
                .eq('user_id', userId)
                .order('fecha', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(20);
            if (selectedCropId) {
                q = q.eq('crop_id', selectedCropId);
            }
            return q;
        })();

    // si ya sabemos que NO hay soft-delete, no hacemos intento 1
    if (AGRO_LOSSES_SUPPORTS_SOFT_DELETE === false) {
        const res = await base();
        if (res.error) {
            console.warn('[AGRO][losses] fetch failed (no-soft-delete):', res.error);
            return [];
        }
        return Array.isArray(res.data) ? res.data : [];
    }

    // intento 1 (soft-delete)
    let res = await base().is('deleted_at', null);

    if (!res.error) {
        AGRO_LOSSES_SUPPORTS_SOFT_DELETE = true;
        localStorage.setItem(LS_LOSSES_SOFT_DELETE, '1');
        return Array.isArray(res.data) ? res.data : [];
    }

    // retry si parece columna/filtro inválido
    if (_looksLikeMissingColumn(res.error)) {
        AGRO_LOSSES_SUPPORTS_SOFT_DELETE = false;
        localStorage.setItem(LS_LOSSES_SOFT_DELETE, '0');
        res = await base();
        if (res.error) {
            console.warn('[AGRO][losses] fetch failed (retry no-soft-delete):', res.error);
            return [];
        }
        return Array.isArray(res.data) ? res.data : [];
    }

    // error real no relacionado
    console.warn('[AGRO][losses] fetch failed:', res.error);
    return [];
}

async function refreshFactureroHistory(tabName, options = {}) {
    const config = FACTURERO_CONFIG[tabName];
    if (!config) {
        console.log('[AGRO] V9.5.1: No config for tab:', tabName);
        return;
    }

    const { showActions = true } = options;
    const debugEnabled = typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('debug') === '1';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let items = [];

        // V9.6: Use smart retry for losses to avoid 400 on missing deleted_at
        if (tabName === 'perdidas') {
            items = await fetchAgroLosses(supabase, user.id);
        } else {
            // Standard fetch for other tabs
            const selectFields = buildFactureroSelectFields(tabName, config);
            const selectClause = buildFactureroSelectClause(selectFields);

            const buildQuery = (clause) => {
                const orderField = config.dateField || 'fecha';
                let q = supabase
                    .from(config.table)
                    .select(clause)
                    .eq('user_id', user.id);
                if (selectedCropId) {
                    q = q.eq('crop_id', selectedCropId);
                }
                q = q
                    .order(orderField, { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(20);
                if (config.supportsDeletedAt) {
                    q = q.is('deleted_at', null);
                }
                return q;
            };

            const { data, error } = await buildQuery(selectClause);

            if (error) {
                const optionalFields = FACTURERO_OPTIONAL_FIELDS[tabName] || [];
                const hasMissingOptional = optionalFields.some((field) => isMissingColumnError(error, field));
                if (hasMissingOptional) {
                    FACTURERO_OPTIONAL_FIELDS_SUPPORT[tabName] = false;
                    const retryFields = buildFactureroSelectFields(tabName, config);
                    const retryClause = buildFactureroSelectClause(retryFields);
                    const retry = await buildQuery(retryClause);
                    if (retry.error) {
                        console.error(`[AGRO] V9.5.1: Error fetching ${tabName} (retry):`, retry.error.message);
                        return;
                    }
                    items = retry.data || [];
                } else if (error.message && error.message.toLowerCase().includes('deleted_at')) {
                    // Legacy fallback logic for other tables
                    config.supportsDeletedAt = false;
                    console.warn(`[AGRO] V9.5.1: ${tabName} table lacks deleted_at, using hard delete`);
                    const fallback = await buildQuery(selectClause);
                    if (fallback.error) {
                        console.error(`[AGRO] V9.5.1: Error fetching ${tabName}:`, fallback.error.message);
                        return;
                    }
                    items = fallback.data || [];
                } else {
                    console.error(`[AGRO] V9.5.1: Error fetching ${tabName}:`, error.message);
                    return;
                }
            } else {
                items = data || [];
                if (FACTURERO_OPTIONAL_FIELDS_SUPPORT[tabName] === null) {
                    FACTURERO_OPTIONAL_FIELDS_SUPPORT[tabName] = true;
                }
            }
        }

        if (debugEnabled) {
            console.log(`[AGRO] ${tabName} row sample`, items?.[0]);
        }

        const enrichedItems = await enrichFactureroItems(tabName, items || []);
        const filteredItems = filterFactureroBySelectedCrop(enrichedItems);
        if (tabName === 'pendientes') {
            pendingCache = filteredItems;
        }
        renderHistoryList(tabName, config, filteredItems, showActions);
        if (tabName === 'pendientes' || tabName === 'perdidas' || tabName === 'transferencias' || tabName === 'gastos' || tabName === 'ingresos') {
            syncFactureroNotifications(tabName, filteredItems);
        }

    } catch (err) {
        console.error(`[AGRO] V9.5.1: Exception in refreshFactureroHistory(${tabName}):`, err.message);
    }
}

function renderHistoryList(tabName, config, items, showActions) {
    // Find or create list container
    let container = document.getElementById(config.listId);
    const parent = document.getElementById(config.containerId);

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
    const isPendingTab = tabName === 'pendientes';
    if (isPendingTab && parent) {
        ensurePendingTransferFilterUI(parent, itemsWithCropNames);
    }

    const filteredItems = isPendingTab
        ? applyPendingTransferFilter(itemsWithCropNames)
        : itemsWithCropNames;

    // V9.6.3: Ensure parent container is visible when items exist
    if (parent) {
        parent.style.display = filteredItems.length > 0 ? 'block' : 'none';
    }

    if (filteredItems.length === 0) {
        if (isPendingTab && itemsWithCropNames.length > 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">No hay pendientes visibles. Activa "Ver transferidos" para mostrarlos.</p>`;
        } else {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">Sin registros recientes.</p>`;
        }
    } else {
        // V9.6.7: Group by day and render with headers
        const dateField = config.dateField || 'fecha';
        const dayGroups = groupRowsByDay(filteredItems, dateField);

        let html = '';
        // V9.6.3: Export + Wizard buttons
        html += `<div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-bottom: 0.5rem;">`;
        html += `<button type="button" onclick="launchAgroWizard('${tabName}')" style="background: linear-gradient(135deg, rgba(200,167,82,0.15), rgba(200,167,82,0.05)); border: 1px solid rgba(200,167,82,0.5); color: #C8A752; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 4px;" title="Registro guiado"><i class="fa fa-plus"></i> Nuevo</button>`;
        html += `<button type="button" onclick="exportAgroLog('${tabName}')" style="background: transparent; border: 1px solid rgba(200,167,82,0.6); color: #C8A752; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 4px;" title="Exportar historial Markdown"><i class="fa fa-file-arrow-down"></i> Exportar MD</button>`;
        html += `</div>`;
        for (const group of dayGroups) {
            // Day header
            html += `<div class="facturero-day-header">${group.label}</div>`;
            // Items for this day
            html += group.rows.map(item => renderHistoryRow(tabName, item, config)).join('');
        }
        container.innerHTML = html;
    }

    console.info(`[AGRO] V9.6.7: Refreshed ${tabName} with ${filteredItems.length} items grouped by day`);
}

// ============================================================
// V9.6.3: AGROLOG EXPORT — Markdown history download
// ============================================================

const AGROLOG_TAB_LABELS = {
    gastos: 'Gastos',
    ingresos: 'Ingresos',
    pendientes: 'Pendientes',
    perdidas: 'Pérdidas',
    transferencias: 'Transferencias'
};

async function exportAgroLog(tabName) {
    const config = FACTURERO_CONFIG[tabName];
    if (!config) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert('Sesión no válida.'); return; }

        // Get crop name
        let cropLabel = 'Vista General — Todos los cultivos';
        let cropStatus = '';
        let filenameCrop = 'General';
        if (selectedCropId) {
            const { data: cropData } = await supabase
                .from('agro_crops')
                .select('name, status')
                .eq('id', selectedCropId)
                .single();
            if (cropData) {
                cropLabel = cropData.name || 'Cultivo';
                cropStatus = cropData.status || '';
                filenameCrop = cropLabel.replace(/[^\w\sáéíóúñ-]/gi, '').trim().replace(/\s+/g, '-');
            }
        }

        // Fetch ALL records (no limit)
        const selectFields = buildFactureroSelectFields(tabName, config);
        const selectClause = buildFactureroSelectClause(selectFields);
        let q = supabase
            .from(config.table)
            .select(selectClause)
            .eq('user_id', user.id)
            .order(config.dateField || 'fecha', { ascending: false })
            .order('created_at', { ascending: false });
        if (selectedCropId) q = q.eq('crop_id', selectedCropId);
        if (config.supportsDeletedAt) q = q.is('deleted_at', null);
        // V9.6.3: Pendientes export = solo deudas activas (excluir transferidos)
        if (tabName === 'pendientes') q = q.neq('transfer_state', 'transferred');

        const { data, error } = await q;
        if (error) { console.error('[AgroLog] fetch error:', error); alert('Error cargando datos.'); return; }
        const items = Array.isArray(data) ? data : [];
        if (items.length === 0) { alert('No hay registros para exportar.'); return; }

        // Build Markdown
        const tabLabel = AGROLOG_TAB_LABELS[tabName] || tabName;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
        const statusSuffix = cropStatus ? ` (${cropStatus})` : '';

        let md = `# 🌾 AgroLog: ${cropLabel}\n`;
        md += `> **Reporte:** ${tabLabel}\n`;
        md += `> **Cultivo:** ${cropLabel}${statusSuffix}\n`;
        md += `> **Fecha:** ${dateStr} ${timeStr}\n`;
        md += `> **Sistema:** YavlGold\n\n`;

        // Summary
        const totalMonto = items.reduce((s, it) => s + (Number(it[config.amountField]) || 0), 0);
        md += `## 📊 Resumen\n`;
        md += `- **Total Registros:** ${items.length}\n`;
        md += `- **Monto Total:** $${totalMonto.toFixed(2)}\n\n`;
        md += `---\n\n`;

        // Table header — build dynamic columns
        const whoMeta = WHO_FIELD_META[tabName];
        const whoLabel = whoMeta ? whoMeta.label : null;
        const hasUnits = (config.extraFields || []).includes('unit_type');

        let header = '| ✓ | Fecha | Concepto';
        let separator = '|:-:|-------|--------';
        if (whoLabel) { header += ` | ${whoLabel}`; separator += '|--------'; }
        if (hasUnits) { header += ' | Cantidad'; separator += '|---------'; }
        header += ' | Monto | Evidencia |';
        separator += '|------:|-----------|';
        md += `## 📝 Detalle\n`;
        md += `_Marca con una \`x\` los items verificados \`[x]\`_\n\n`;
        md += header + '\n' + separator + '\n';

        // Table rows
        for (const item of items) {
            const fecha = item[config.dateField || 'fecha'] || 'S/F';
            const rawConcept = item[config.conceptField] || 'Sin concepto';
            const whoData = getWhoData(tabName, item, rawConcept);
            const concept = (whoData.concept || rawConcept).replace(/\|/g, '·');
            const who = (whoData.who || '').replace(/\|/g, '·');
            const amount = Number(item[config.amountField] || 0).toFixed(2);

            // Units
            let unitText = '';
            if (hasUnits) {
                const parts = [];
                const uSummary = formatUnitSummary(item.unit_type, item.unit_qty);
                const kSummary = formatKgSummary(item.quantity_kg);
                if (uSummary) parts.push(uSummary);
                if (kSummary) parts.push(kSummary);
                unitText = parts.join(' · ') || '-';
            }

            // Evidence
            const evidenceRaw = getFactureroEvidenceValue(tabName, item);
            const evidenceText = evidenceRaw ? `[📎 Ver](${evidenceRaw})` : '-';

            let row = `| [ ] | ${fecha} | ${concept}`;
            if (whoLabel) row += ` | ${who || '-'}`;
            if (hasUnits) row += ` | ${unitText}`;
            row += ` | $${amount} | ${evidenceText} |`;
            md += row + '\n';
        }

        // Footer
        md += `\n---\n\n`;
        md += `> ⚠️ Documento confidencial — datos financieros personales\n`;
        md += `> Generado por YavlGold · yavlgold.com\n`;

        // Download with UTF-8 BOM
        const blob = new Blob(['\ufeff' + md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `AgroLog_${filenameCrop}_${tabLabel}_${dateStr}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.info(`[AgroLog] Exported ${items.length} ${tabName} items for ${cropLabel}`);
    } catch (err) {
        console.error('[AgroLog] Export error:', err);
        alert('Error al exportar: ' + (err.message || err));
    }
}

// V9.6.3: AgroWizard launcher — passes deps from module scope
function launchAgroWizard(tabName) {
    openAgroWizard(tabName, {
        supabase,
        cropsCache,
        selectedCropId,
        refreshFactureroHistory,
        loadIncomes: typeof loadIncomes === 'function' ? loadIncomes : null,
        getTodayLocalISO: typeof getTodayLocalISO === 'function' ? getTodayLocalISO : null,
        buildConceptWithWho
    });
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
    const rawConcept = item[config.conceptField] || '';
    const whoData = getWhoData(tabName, item, rawConcept);
    document.getElementById('edit-concepto').value = whoData.concept || rawConcept;
    document.getElementById('edit-monto').value = item[config.amountField] || '';
    document.getElementById('edit-fecha').value = item[config.dateField] || '';

    const whoGroup = document.getElementById('edit-who-group');
    const whoLabel = document.getElementById('edit-who-label');
    const whoInput = document.getElementById('edit-who-input');
    const whoMeta = WHO_FIELD_META[tabName];
    if (whoGroup && whoLabel && whoInput && whoMeta) {
        whoGroup.style.display = 'block';
        whoLabel.textContent = whoMeta.label;
        whoInput.value = whoData.who || '';
    } else if (whoGroup && whoInput) {
        whoGroup.style.display = 'none';
        whoInput.value = '';
    }

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
        const extraFields = (config.extraFields || []).filter(field => field !== whoMeta?.field);
        extraFields.forEach(field => {
            const meta = FACTURERO_EXTRA_FIELD_META[field];
            const value = item[field] ?? '';
            const labelText = meta?.label || (field.charAt(0).toUpperCase() + field.slice(1));

            const group = document.createElement('div');
            group.className = 'input-group';
            group.style.marginTop = '1rem';

            const label = document.createElement('label');
            label.className = 'input-label';
            label.textContent = labelText;

            let inputEl;
            if (meta?.type === 'select') {
                inputEl = document.createElement('select');
                (meta.options || []).forEach((opt) => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    inputEl.appendChild(option);
                });
            } else {
                inputEl = document.createElement('input');
                inputEl.type = meta?.type || 'text';
                if (meta?.min) inputEl.min = meta.min;
                if (meta?.step) inputEl.step = meta.step;
                if (meta?.placeholder) inputEl.placeholder = meta.placeholder;
            }

            inputEl.id = `edit-${field}`;
            inputEl.className = 'styled-input';
            if (meta?.type === 'select') {
                inputEl.value = value || '';
            } else {
                inputEl.value = value;
            }

            group.append(label, inputEl);
            extraContainer.appendChild(group);
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

        const conceptValue = document.getElementById('edit-concepto')?.value?.trim() || '';
        const whoValue = document.getElementById('edit-who-input')?.value?.trim() || '';
        const whoMeta = WHO_FIELD_META[tabName];

        let conceptForSave = conceptValue;
        if (tabName === 'ingresos') {
            conceptForSave = buildConceptWithWho(tabName, conceptValue, whoValue);
        }

        // V9.6.6: Validate date before update
        const editDateValue = document.getElementById('edit-fecha')?.value;
        const dateCheck = assertDateNotFuture(editDateValue, 'Fecha');
        if (!dateCheck.valid) {
            alert(dateCheck.error);
            return;
        }

        const updateData = {
            [config.conceptField]: conceptForSave,
            [config.amountField]: parseFloat(document.getElementById('edit-monto')?.value) || 0,
            [config.dateField]: editDateValue,
            crop_id: document.getElementById('edit-crop-id')?.value || null
        };

        if (whoMeta?.field) {
            updateData[whoMeta.field] = whoValue || null;
        }

        // Add extra fields
        (config.extraFields || [])
            .filter(field => field !== whoMeta?.field)
            .forEach(field => {
                const el = document.getElementById(`edit-${field}`);
                // console.log(`[AGRO] V9.6.5 extraField: ${field}, el:`, el, 'value:', el?.value);
                if (!el) return;
                if (field === 'unit_type') {
                    updateData[field] = el.value || null;
                    return;
                }
                if (FACTURERO_NUMERIC_FIELDS.has(field)) {
                    const num = Number(el.value);
                    updateData[field] = Number.isFinite(num) && num > 0 ? num : null;
                    return;
                }
                updateData[field] = el.value?.trim() || null;
            });

        // console.log('[AGRO] V9.6.5 updateData:', { table: config.table, itemId, updateData });

        let { error } = await supabase
            .from(config.table)
            .update(updateData)
            .eq('id', itemId)
            .eq('user_id', user.id);

        if (error) {
            const dropWho = whoMeta?.field && isMissingColumnError(error, whoMeta.field);
            const dropUnits = isMissingColumnError(error, 'unit_type')
                || isMissingColumnError(error, 'unit_qty')
                || isMissingColumnError(error, 'quantity_kg');

            if (dropWho || dropUnits) {
                const fallbackData = { ...updateData };
                if (dropWho) {
                    delete fallbackData[whoMeta.field];
                    fallbackData[config.conceptField] = buildConceptWithWho(tabName, conceptValue, whoValue);
                }
                if (dropUnits) {
                    delete fallbackData.unit_type;
                    delete fallbackData.unit_qty;
                    delete fallbackData.quantity_kg;
                    if (typeof showEvidenceToast === 'function') {
                        showEvidenceToast('Aviso: columnas de presentacion/kg no disponibles, se guardo sin ellas.', 'warning');
                    } else {
                        alert('Aviso: columnas de presentacion/kg no disponibles, se guardo sin ellas.');
                    }
                }
                const retry = await supabase
                    .from(config.table)
                    .update(fallbackData)
                    .eq('id', itemId)
                    .eq('user_id', user.id);
                error = retry.error;
            }
        }

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

function notifyFacturero(message, type = 'info') {
    if (typeof showEvidenceToast === 'function') {
        showEvidenceToast(message, type);
    } else {
        alert(message);
    }
}

function buildTransferMetaModal(options = {}) {
    const existing = document.getElementById('pending-transfer-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'pending-transfer-modal';
    modal.className = 'pending-transfer-modal';

    const backdrop = document.createElement('div');
    backdrop.className = 'pending-transfer-backdrop';
    backdrop.dataset.close = 'true';

    const card = document.createElement('div');
    card.className = 'pending-transfer-card';

    const header = document.createElement('div');
    header.className = 'pending-transfer-header';
    const title = document.createElement('h3');
    title.textContent = options.title || 'Transferir';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pending-transfer-close';
    closeBtn.dataset.close = 'true';
    closeBtn.innerHTML = '&times;';
    header.append(title, closeBtn);

    const body = document.createElement('div');
    body.className = 'pending-transfer-body';

    const detailRows = Array.isArray(options.rows) ? options.rows : [];
    detailRows.forEach((row) => {
        const line = document.createElement('div');
        line.className = 'pending-transfer-row';
        const label = document.createElement('span');
        label.textContent = row.label || '';
        const value = document.createElement('strong');
        value.textContent = row.value || '-';
        line.append(label, value);
        body.appendChild(line);
    });

    const showCategory = options.showCategory !== false;
    const showDate = options.showDate !== false;
    const today = getTodayLocalISO();

    if (showCategory) {
        const categoryGroup = document.createElement('div');
        categoryGroup.className = 'input-group';
        const categoryLabel = document.createElement('label');
        categoryLabel.className = 'input-label';
        categoryLabel.textContent = options.categoryLabel || 'Categoria ingreso';
        categoryLabel.setAttribute('for', 'pending-transfer-category');
        const categorySelect = document.createElement('select');
        categorySelect.id = 'pending-transfer-category';
        categorySelect.className = 'styled-input';
        categorySelect.style.paddingLeft = '1rem';
        const categories = [
            { value: 'ventas', label: 'Ventas' },
            { value: 'servicios', label: 'Servicios' },
            { value: 'subsidios', label: 'Subsidios' },
            { value: 'otros', label: 'Otros' }
        ];
        categories.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            categorySelect.appendChild(option);
        });
        categorySelect.value = options.defaultCategory || 'ventas';
        categoryGroup.append(categoryLabel, categorySelect);
        body.appendChild(categoryGroup);
    }

    if (showDate) {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'input-group';
        const dateLabel = document.createElement('label');
        dateLabel.className = 'input-label';
        dateLabel.textContent = options.dateLabel || 'Fecha';
        dateLabel.setAttribute('for', 'pending-transfer-date');
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.id = 'pending-transfer-date';
        dateInput.className = 'styled-input';
        dateInput.style.paddingLeft = '1rem';
        const defaultDate = options.defaultDate || today;
        dateInput.value = defaultDate;
        dateInput.max = today;
        dateGroup.append(dateLabel, dateInput);
        body.appendChild(dateGroup);
    }

    const actions = document.createElement('div');
    actions.className = 'pending-transfer-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-cancel';
    cancelBtn.dataset.close = 'true';
    cancelBtn.textContent = 'Cancelar';
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.id = 'pending-transfer-confirm';
    confirmBtn.textContent = options.confirmText || 'Transferir';
    actions.append(cancelBtn, confirmBtn);

    card.append(header, body, actions);
    modal.append(backdrop, card);
    document.body.appendChild(modal);

    return modal;
}

function openTransferMetaModal(options = {}) {
    return new Promise((resolve) => {
        const modal = buildTransferMetaModal(options);
        if (!modal) {
            resolve({ confirmed: false });
            return;
        }

        const close = () => {
            modal.remove();
            resolve({ confirmed: false });
        };

        modal.querySelectorAll('[data-close]').forEach((el) => {
            el.addEventListener('click', close);
        });

        const confirmBtn = modal.querySelector('#pending-transfer-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const category = modal.querySelector('#pending-transfer-category')?.value || null;
                const date = modal.querySelector('#pending-transfer-date')?.value || null;
                modal.remove();
                resolve({ confirmed: true, category, date });
            });
        }

        document.addEventListener('keydown', function onKey(e) {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', onKey);
                close();
            }
        });
    });
}

async function handlePendingTransfer(itemId) {
    const pending = pendingCache.find((item) => String(item.id) === String(itemId));
    if (!pending) {
        notifyFacturero('No se encontró el pendiente seleccionado.', 'warning');
        return;
    }

    if (isPendingTransferred(pending)) {
        notifyFacturero('Este pendiente ya fue transferido.', 'warning');
        return;
    }

    if (FACTURERO_OPTIONAL_FIELDS_SUPPORT.pendientes === false) {
        notifyFacturero('Transferencia no disponible. Ejecuta el patch SQL de columnas de transferencia.', 'warning');
        return;
    }

    // V9.7: First show choice modal (income vs losses)
    const destination = await showTransferChoiceModal({
        title: 'Transferir pendiente',
        choices: [
            { value: 'income', label: 'Ingresos (Pagado)' },
            { value: 'losses', label: 'Pérdidas (Cancelado)' }
        ]
    });
    if (!destination) return; // User cancelled

    // Then show meta modal for date/category
    const decision = await openTransferMetaModal({
        title: destination === 'income' ? 'Transferir a Ingresos' : 'Transferir a Pérdidas',
        rows: [
            { label: 'Concepto', value: pending.concepto || 'Sin concepto' },
            { label: 'Cliente', value: pending.cliente || 'N/A' },
            { label: 'Monto', value: `$${Number(pending.monto || 0).toFixed(2)}` },
            { label: 'Fecha pendiente', value: pending.fecha || 'N/A' }
        ],
        showCategory: destination === 'income',
        showDate: true,
        defaultCategory: 'ventas',
        dateLabel: destination === 'income' ? 'Fecha de ingreso' : 'Fecha de pérdida',
        defaultDate: getTodayLocalISO()
    });
    if (!decision?.confirmed) return;
    const decisionDate = decision.date || getTodayLocalISO();
    const dateCheck = assertDateNotFuture(decisionDate, 'Fecha');
    if (!dateCheck.valid) {
        notifyFacturero(`⚠️ ${dateCheck.error}`, 'warning');
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión para transferir.');

        if (destination === 'income') {
            // Transfer to Income
            const incomeId = crypto?.randomUUID ? crypto.randomUUID() : `inc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
            const concept = pending.concepto || 'Ingreso';
            const buyer = pending.cliente || '';
            const conceptFinal = buyer ? buildConceptWithWho('ingresos', concept, buyer) : concept;

            const incomePayload = {
                id: incomeId,
                user_id: user.id,
                concepto: conceptFinal,
                monto: Number(pending.monto || 0),
                fecha: decisionDate,
                categoria: decision.category || 'ventas',
                soporte_url: pending.evidence_url || null,
                crop_id: pending.crop_id || null,
                unit_type: pending.unit_type || null,
                unit_qty: Number.isFinite(Number(pending.unit_qty)) ? Number(pending.unit_qty) : null,
                quantity_kg: Number.isFinite(Number(pending.quantity_kg)) ? Number(pending.quantity_kg) : null,
                // V9.7: Origin tracking
                origin_table: 'agro_pending',
                origin_id: pending.id,
                transfer_state: 'active'
            };

            let { error: insertError } = await supabase.from('agro_income').insert(incomePayload);
            if (insertError && (isMissingColumnError(insertError, 'unit_type') || isMissingColumnError(insertError, 'unit_qty') || isMissingColumnError(insertError, 'quantity_kg') || isMissingColumnError(insertError, 'origin_table'))) {
                const fallbackPayload = { ...incomePayload };
                delete fallbackPayload.unit_type;
                delete fallbackPayload.unit_qty;
                delete fallbackPayload.quantity_kg;
                delete fallbackPayload.origin_table;
                delete fallbackPayload.origin_id;
                delete fallbackPayload.transfer_state;
                const retry = await supabase.from('agro_income').insert(fallbackPayload);
                insertError = retry.error;
            }
            if (insertError) throw insertError;

            const transferMeta = {
                transferred_at: new Date().toISOString(),
                transferred_income_id: incomeId,
                transferred_by: user.id,
                transferred_to: 'income',
                transfer_state: 'transferred'
            };

            let { error: updateError } = await supabase
                .from('agro_pending')
                .update(transferMeta)
                .eq('id', pending.id)
                .eq('user_id', user.id);

            if (updateError && (isMissingColumnError(updateError, 'transferred_at') || isMissingColumnError(updateError, 'transferred_to'))) {
                FACTURERO_OPTIONAL_FIELDS_SUPPORT.pendientes = false;
                await supabase.from('agro_income').delete().eq('id', incomeId).eq('user_id', user.id);
                notifyFacturero('Faltan columnas de transferencia. Ejecuta el patch SQL.', 'warning');
                return;
            } else if (updateError) {
                await supabase.from('agro_income').delete().eq('id', incomeId).eq('user_id', user.id);
                throw updateError;
            }

            notifyFacturero('✅ Pendiente transferido a Ingresos (Pagado).', 'success');
            await refreshFactureroHistory('pendientes');
            await refreshFactureroHistory('ingresos');
            document.dispatchEvent(new CustomEvent('agro:income:changed'));

        } else if (destination === 'losses') {
            // Transfer to Losses
            const lossId = crypto?.randomUUID ? crypto.randomUUID() : `loss_${Date.now()}_${Math.random().toString(16).slice(2)}`;
            const concept = pending.concepto || 'Pérdida';
            const buyer = pending.cliente || '';
            const conceptFinal = buyer ? `${concept} — ${buyer}` : concept;

            const lossPayload = {
                id: lossId,
                user_id: user.id,
                description: conceptFinal,
                amount: Number(pending.monto || 0),
                date: decisionDate,
                category: decision.category || 'cancelacion',
                crop_id: pending.crop_id || null,
                unit_type: pending.unit_type || null,
                unit_qty: Number.isFinite(Number(pending.unit_qty)) ? Number(pending.unit_qty) : null,
                quantity_kg: Number.isFinite(Number(pending.quantity_kg)) ? Number(pending.quantity_kg) : null,
                // V9.7: Origin tracking
                origin_table: 'agro_pending',
                origin_id: pending.id,
                transfer_state: 'active'
            };

            let { error: insertError } = await supabase.from('agro_losses').insert(lossPayload);
            if (insertError && (isMissingColumnError(insertError, 'unit_type') || isMissingColumnError(insertError, 'origin_table'))) {
                const fallbackPayload = { ...lossPayload };
                delete fallbackPayload.unit_type;
                delete fallbackPayload.unit_qty;
                delete fallbackPayload.quantity_kg;
                delete fallbackPayload.origin_table;
                delete fallbackPayload.origin_id;
                delete fallbackPayload.transfer_state;
                const retry = await supabase.from('agro_losses').insert(fallbackPayload);
                insertError = retry.error;
            }
            if (insertError) throw insertError;

            const transferMeta = {
                transferred_at: new Date().toISOString(),
                transferred_income_id: lossId, // reusing field for loss ID
                transferred_by: user.id,
                transferred_to: 'losses',
                transfer_state: 'transferred'
            };

            let { error: updateError } = await supabase
                .from('agro_pending')
                .update(transferMeta)
                .eq('id', pending.id)
                .eq('user_id', user.id);

            if (updateError && isMissingColumnError(updateError, 'transferred_to')) {
                await supabase.from('agro_losses').delete().eq('id', lossId).eq('user_id', user.id);
                notifyFacturero('Faltan columnas de transferencia. Ejecuta el patch SQL.', 'warning');
                return;
            } else if (updateError) {
                await supabase.from('agro_losses').delete().eq('id', lossId).eq('user_id', user.id);
                throw updateError;
            }

            notifyFacturero('✅ Pendiente transferido a Pérdidas (Cancelado).', 'success');
            await refreshFactureroHistory('pendientes');
            await refreshFactureroHistory('perdidas');
            document.dispatchEvent(new CustomEvent('agro:losses:changed'));
        }

        await updateStats();
    } catch (err) {
        console.error('[AGRO] Pending transfer error:', err.message);
        notifyFacturero(`Error al transferir: ${err.message}`, 'warning');
    }
}

async function insertFactureroRow(table, payload, optionalFields = []) {
    let { error } = await supabase.from(table).insert(payload);
    if (!error) return { error: null };
    const hasMissingOptional = optionalFields.some((field) => isMissingColumnError(error, field));
    if (!hasMissingOptional) return { error };

    const fallbackPayload = { ...payload };
    optionalFields.forEach((field) => {
        delete fallbackPayload[field];
    });
    const retry = await supabase.from(table).insert(fallbackPayload);
    return { error: retry.error };
}

async function softDeleteFactureroRow(table, rowId, userId) {
    if (!rowId) return { success: false, error: 'ID no disponible' };
    const { error: softError } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', rowId)
        .eq('user_id', userId);

    if (!softError) return { success: true };
    if (String(softError.message || '').toLowerCase().includes('deleted_at')) {
        const { error: hardError } = await supabase
            .from(table)
            .delete()
            .eq('id', rowId)
            .eq('user_id', userId);
        return hardError ? { success: false, error: hardError } : { success: true };
    }
    return { success: false, error: softError };
}

function isOriginMetaMissingColumns(error) {
    return isMissingColumnError(error, 'origin_table')
        || isMissingColumnError(error, 'origin_id')
        || isMissingColumnError(error, 'transfer_state');
}

async function rollbackInsertedRow({ table, userId, insertedId, originMeta }) {
    // 1) Prefer rollback by ID (soft-delete fallback included)
    if (insertedId) {
        const byId = await softDeleteFactureroRow(table, insertedId, userId);
        if (byId.success) return { ok: true, method: 'by_id' };
    }

    // 2) Fallback rollback by origin meta if available
    if (originMeta?.origin_table && originMeta?.origin_id) {
        try {
            let q = supabase
                .from(table)
                .delete()
                .eq('user_id', userId)
                .eq('origin_table', originMeta.origin_table)
                .eq('origin_id', originMeta.origin_id);
            if (originMeta.transfer_state) {
                q = q.eq('transfer_state', originMeta.transfer_state);
            }
            const { error } = await q;
            if (error) {
                if (isOriginMetaMissingColumns(error)) {
                    return { ok: false, method: 'origin_missing_cols', error };
                }
                return { ok: false, method: 'origin_delete_failed', error };
            }
            return { ok: true, method: 'by_origin' };
        } catch (err) {
            return { ok: false, method: 'origin_exception', error: err };
        }
    }

    return { ok: false, method: 'no_rollback_path' };
}

function buildTransferId(prefix) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function handleIncomeTransfer(itemId) {
    let income = incomeCache.find((item) => String(item.id) === String(itemId));
    if (!income) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sesión expirada.');
            const { data, error } = await supabase
                .from('agro_income')
                .select(AGRO_INCOME_TRANSFER_COLUMNS)
                .eq('id', itemId)
                .eq('user_id', user.id)
                .single();
            if (error) throw error;
            income = data;
        } catch (err) {
            notifyFacturero('No se encontró el ingreso seleccionado.', 'warning');
            return;
        }
    }

    const destination = await showTransferChoiceModal({
        title: 'Transferir ingreso',
        choices: [
            { value: 'pendientes', label: 'Pendientes (Deuda)' },
            { value: 'losses', label: 'Pérdidas (Cancelado)' }
        ]
    });
    if (!destination) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión para transferir.');

        if (destination === 'pendientes') {
            if (income.origin_table === 'agro_pending' && income.origin_id) {
                await handleRevertIncome(income.id);
                return;
            }

            const whoData = getWhoData('ingresos', income, income.concepto || '');
            const pendingId = buildTransferId('pending');
            const pendingPayload = {
                id: pendingId,
                user_id: user.id,
                concepto: whoData.concept || income.concepto || 'Pendiente',
                monto: Number(income.monto || 0),
                fecha: income.fecha || getTodayLocalISO(),
                cliente: whoData.who || null,
                evidence_url: getFactureroEvidenceValue('ingresos', income) || null,
                crop_id: income.crop_id || null,
                unit_type: income.unit_type || null,
                unit_qty: Number.isFinite(Number(income.unit_qty)) ? Number(income.unit_qty) : null,
                quantity_kg: Number.isFinite(Number(income.quantity_kg)) ? Number(income.quantity_kg) : null
            };

            const insertResult = await insertFactureroRow('agro_pending', pendingPayload, [
                'unit_type',
                'unit_qty',
                'quantity_kg'
            ]);
            if (insertResult.error) throw insertResult.error;

            const deleteResult = await softDeleteFactureroRow('agro_income', income.id, user.id);
            if (!deleteResult.success) {
                const rollback = await rollbackInsertedRow({
                    table: 'agro_pending',
                    userId: user.id,
                    insertedId: pendingId
                });
                if (!rollback.ok) {
                    throw new Error('Transferencia cancelada: no se pudo borrar el registro original ni revertir el destino (permisos/RLS).');
                }
                throw new Error('Transferencia cancelada: no se pudo borrar el registro original (permisos/RLS).');
            }

            notifyFacturero('✅ Ingreso transferido a Pendientes.', 'success');
            await refreshFactureroHistory('pendientes');
            document.dispatchEvent(new CustomEvent('agro:income:changed'));
        }

        if (destination === 'losses') {
            const whoData = getWhoData('ingresos', income, income.concepto || '');
            const buyerLabel = whoData.who ? `Comprador: ${whoData.who}` : '';
            const lossCause = buyerLabel ? `Transferido desde ingresos • ${buyerLabel}` : 'Transferido desde ingresos';
            const lossId = buildTransferId('loss');
            const lossPayload = {
                id: lossId,
                user_id: user.id,
                concepto: whoData.concept || income.concepto || 'Pérdida',
                monto: Number(income.monto || 0),
                fecha: income.fecha || getTodayLocalISO(),
                causa: lossCause,
                evidence_url: getFactureroEvidenceValue('ingresos', income) || null,
                crop_id: income.crop_id || null,
                unit_type: income.unit_type || null,
                unit_qty: Number.isFinite(Number(income.unit_qty)) ? Number(income.unit_qty) : null,
                quantity_kg: Number.isFinite(Number(income.quantity_kg)) ? Number(income.quantity_kg) : null,
                origin_table: 'agro_income',
                origin_id: income.id,
                transfer_state: 'active'
            };

            const insertResult = await insertFactureroRow('agro_losses', lossPayload, [
                'unit_type',
                'unit_qty',
                'quantity_kg',
                'origin_table',
                'origin_id',
                'transfer_state'
            ]);
            if (insertResult.error) throw insertResult.error;

            const deleteResult = await softDeleteFactureroRow('agro_income', income.id, user.id);
            if (!deleteResult.success) {
                const rollback = await rollbackInsertedRow({
                    table: 'agro_losses',
                    userId: user.id,
                    insertedId: lossId,
                    originMeta: {
                        origin_table: 'agro_income',
                        origin_id: income.id,
                        transfer_state: 'active'
                    }
                });
                if (!rollback.ok) {
                    throw new Error('Transferencia cancelada: no se pudo borrar el registro original ni revertir el destino (permisos/RLS).');
                }
                throw new Error('Transferencia cancelada: no se pudo borrar el registro original (permisos/RLS).');
            }

            notifyFacturero('✅ Ingreso transferido a Pérdidas.', 'success');
            await refreshFactureroHistory('perdidas');
            document.dispatchEvent(new CustomEvent('agro:income:changed'));
        }

        await updateStats();
    } catch (err) {
        console.error('[AGRO] Income transfer error:', err.message);
        notifyFacturero(`Error al transferir: ${err.message}`, 'warning');
    }
}

async function handleLossTransfer(itemId) {
    let loss = null;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Sesión expirada.');
        const { data, error } = await supabase
            .from('agro_losses')
            .select(AGRO_LOSS_TRANSFER_COLUMNS)
            .eq('id', itemId)
            .eq('user_id', user.id)
            .single();
        if (error) throw error;
        loss = data;
    } catch (err) {
        notifyFacturero('No se encontró la pérdida seleccionada.', 'warning');
        return;
    }

    const destination = await showTransferChoiceModal({
        title: 'Transferir pérdida',
        choices: [
            { value: 'pendientes', label: 'Pendientes (Reactivar)' },
            { value: 'income', label: 'Ingresos (Recuperado)' }
        ]
    });
    if (!destination) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión para transferir.');

        if (destination === 'pendientes') {
            if (loss.origin_table === 'agro_pending' && loss.origin_id) {
                await handleRevertLoss(loss.id);
                return;
            }

            const pendingId = buildTransferId('pending');
            const baseConcept = loss.concepto || 'Pendiente';
            const causeMeta = loss.causa ? `Causa: ${loss.causa}` : '';
            const pendingConcept = causeMeta ? `${baseConcept} — ${causeMeta}` : baseConcept;
            const pendingNotes = loss.causa ? `Causa: ${loss.causa}` : null;
            const pendingPayload = {
                id: pendingId,
                user_id: user.id,
                concepto: pendingConcept,
                monto: Number(loss.monto || 0),
                fecha: loss.fecha || getTodayLocalISO(),
                cliente: null,
                notas: pendingNotes,
                evidence_url: getFactureroEvidenceValue('perdidas', loss) || null,
                crop_id: loss.crop_id || null,
                unit_type: loss.unit_type || null,
                unit_qty: Number.isFinite(Number(loss.unit_qty)) ? Number(loss.unit_qty) : null,
                quantity_kg: Number.isFinite(Number(loss.quantity_kg)) ? Number(loss.quantity_kg) : null
            };

            const insertResult = await insertFactureroRow('agro_pending', pendingPayload, [
                'unit_type',
                'unit_qty',
                'quantity_kg',
                'notas'
            ]);
            if (insertResult.error) throw insertResult.error;

            const deleteResult = await softDeleteFactureroRow('agro_losses', loss.id, user.id);
            if (!deleteResult.success) {
                const rollback = await rollbackInsertedRow({
                    table: 'agro_pending',
                    userId: user.id,
                    insertedId: pendingId
                });
                if (!rollback.ok) {
                    throw new Error('Transferencia cancelada: no se pudo borrar el registro original ni revertir el destino (permisos/RLS).');
                }
                throw new Error('Transferencia cancelada: no se pudo borrar el registro original (permisos/RLS).');
            }

            notifyFacturero('✅ Pérdida transferida a Pendientes.', 'success');
            await refreshFactureroHistory('pendientes');
            await refreshFactureroHistory('perdidas');
        }

        if (destination === 'income') {
            const decision = await openTransferMetaModal({
                title: 'Transferir a Ingresos',
                rows: [
                    { label: 'Concepto', value: loss.concepto || 'Sin concepto' },
                    { label: 'Monto', value: `$${Number(loss.monto || 0).toFixed(2)}` },
                    { label: 'Fecha pérdida', value: loss.fecha || 'N/A' }
                ],
                showCategory: true,
                showDate: true,
                defaultCategory: 'otros',
                dateLabel: 'Fecha de ingreso',
                defaultDate: loss.fecha || getTodayLocalISO()
            });
            if (!decision?.confirmed) return;
            const decisionDate = decision.date || getTodayLocalISO();
            const dateCheck = assertDateNotFuture(decisionDate, 'Fecha');
            if (!dateCheck.valid) {
                notifyFacturero(`⚠️ ${dateCheck.error}`, 'warning');
                return;
            }

            const baseConcept = loss.concepto || 'Ingreso';
            const causeMeta = loss.causa ? `Causa: ${loss.causa}` : '';
            const conceptFinal = causeMeta ? `${baseConcept} — ${causeMeta}` : baseConcept;
            const incomeId = buildTransferId('income');
            const incomePayload = {
                id: incomeId,
                user_id: user.id,
                concepto: conceptFinal,
                monto: Number(loss.monto || 0),
                fecha: decisionDate,
                categoria: decision.category || 'otros',
                soporte_url: getFactureroEvidenceValue('perdidas', loss) || null,
                crop_id: loss.crop_id || null,
                unit_type: loss.unit_type || null,
                unit_qty: Number.isFinite(Number(loss.unit_qty)) ? Number(loss.unit_qty) : null,
                quantity_kg: Number.isFinite(Number(loss.quantity_kg)) ? Number(loss.quantity_kg) : null,
                origin_table: 'agro_losses',
                origin_id: loss.id,
                transfer_state: 'active'
            };

            const insertResult = await insertFactureroRow('agro_income', incomePayload, [
                'unit_type',
                'unit_qty',
                'quantity_kg',
                'origin_table',
                'origin_id',
                'transfer_state'
            ]);
            if (insertResult.error) throw insertResult.error;

            const deleteResult = await softDeleteFactureroRow('agro_losses', loss.id, user.id);
            if (!deleteResult.success) {
                const rollback = await rollbackInsertedRow({
                    table: 'agro_income',
                    userId: user.id,
                    insertedId: incomeId,
                    originMeta: {
                        origin_table: 'agro_losses',
                        origin_id: loss.id,
                        transfer_state: 'active'
                    }
                });
                if (!rollback.ok) {
                    throw new Error('Transferencia cancelada: no se pudo borrar el registro original ni revertir el destino (permisos/RLS).');
                }
                throw new Error('Transferencia cancelada: no se pudo borrar el registro original (permisos/RLS).');
            }

            notifyFacturero('✅ Pérdida transferida a Ingresos.', 'success');
            await refreshFactureroHistory('perdidas');
            document.dispatchEvent(new CustomEvent('agro:income:changed'));
        }

        await updateStats();
    } catch (err) {
        console.error('[AGRO] Loss transfer error:', err.message);
        notifyFacturero(`Error al transferir: ${err.message}`, 'warning');
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
            return;
        }

        const cropCard = e.target.closest('.crop-card');
        if (cropCard) {
            const cropId = cropCard.dataset.cropId;
            if (cropId) {
                setSelectedCropId(cropId);
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.classList.contains('crop-card')) return;
        const cropId = target.dataset.cropId;
        if (!cropId) return;
        e.preventDefault();
        setSelectedCropId(cropId);
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
            return;
        }

        const transferBtn = e.target.closest('.btn-transfer-pending');
        if (transferBtn) {
            e.preventDefault();
            e.stopPropagation();
            const tabName = transferBtn.dataset.tab;
            const itemId = transferBtn.dataset.id;
            console.info('[AGRO] Facturero transfer click', { tabName, itemId });
            if (tabName === 'pendientes' && itemId) {
                await handlePendingTransfer(itemId);
            } else {
                console.warn('[AGRO] Pending transfer missing data', { tabName, itemId });
            }
            return;
        }

        const transferIncomeBtn = e.target.closest('.btn-transfer-income');
        if (transferIncomeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const itemId = transferIncomeBtn.dataset.id;
            console.info('[AGRO] Income transfer click', { itemId });
            if (itemId) {
                await handleIncomeTransfer(itemId);
            }
            return;
        }

        const transferLossBtn = e.target.closest('.btn-transfer-loss');
        if (transferLossBtn) {
            e.preventDefault();
            e.stopPropagation();
            const itemId = transferLossBtn.dataset.id;
            console.info('[AGRO] Loss transfer click', { itemId });
            if (itemId) {
                await handleLossTransfer(itemId);
            }
            return;
        }

        // V9.7: Revert income to pending
        const revertIncomeBtn = e.target.closest('.btn-revert-income');
        if (revertIncomeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const itemId = revertIncomeBtn.dataset.id;
            console.info('[AGRO] Revert income click', { itemId });
            if (itemId) {
                await handleRevertIncome(itemId);
            }
            return;
        }

        // V9.7: Revert loss to pending
        const revertLossBtn = e.target.closest('.btn-revert-loss');
        if (revertLossBtn) {
            e.preventDefault();
            e.stopPropagation();
            const itemId = revertLossBtn.dataset.id;
            console.info('[AGRO] Revert loss click', { itemId });
            if (itemId) {
                await handleRevertLoss(itemId);
            }
            return;
        }
    });

    console.info('[AGRO] V9.5.1: CRUD event listeners initialized');
}

// V9.5.1: Refresh all facturero histories on init
async function initFactureroHistories() {
    const tabs = ['gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias'];
    for (const tab of tabs) {
        await refreshFactureroHistory(tab);
    }
    console.info('[AGRO] V9.6.3: All facturero histories initialized (including gastos+ingresos)');
}

function refreshFactureroForSelectedCrop() {
    refreshFactureroHistory('gastos');
    refreshFactureroHistory('ingresos');
    refreshFactureroHistory('pendientes');
    refreshFactureroHistory('perdidas');
    refreshFactureroHistory('transferencias');
    if (typeof loadIncomes === 'function') {
        loadIncomes();
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('agro:crop:changed', () => {
        refreshFactureroForSelectedCrop();
    });
}

// Expose globally
window.populateCropDropdowns = populateCropDropdowns;
window.refreshFactureroHistory = refreshFactureroHistory;
window.exportAgroLog = exportAgroLog;
window.launchAgroWizard = launchAgroWizard;
window.closeEditModal = closeEditModal;
window.saveEditModal = saveEditModal;
window.getSelectedCropId = () => selectedCropId;
window.setSelectedCropId = setSelectedCropId;
if (typeof window !== 'undefined') {
    window.YGAgroTemplates = Object.assign(window.YGAgroTemplates || {}, {
        storeCropTemplateMapping,
        getStoredTemplateDuration,
        addDaysToDateKey
    });
}

// ============================================================
// UTILIDADES
// ============================================================

const CROP_STATUS_UI = {
    sembrado: { class: 'status-attention', text: 'Sembrado' },
    creciendo: { class: 'status-growing', text: 'Creciendo' },
    produccion: { class: 'status-ready', text: 'En produccion' },
    finalizado: { class: 'status-finished', text: 'Finalizado' }
};

const CROP_STATUS_LEGACY_MAP = {
    growing: 'creciendo',
    ready: 'produccion',
    attention: 'sembrado',
    harvested: 'finalizado'
};

const CROP_STATUS_THRESHOLDS = {
    sembrado: 0,
    creciendo: 25,
    produccion: 70,
    finalizado: 100
};

function normalizeCropStatus(status) {
    const value = String(status || '').toLowerCase().trim();
    if (!value) return 'creciendo';
    if (CROP_STATUS_UI[value]) return value;
    if (CROP_STATUS_LEGACY_MAP[value]) return CROP_STATUS_LEGACY_MAP[value];
    return value;
}

function computeAutoCropStatus(crop, progress) {
    if (crop?.actual_harvest_date) return 'finalizado';
    if (!progress?.ok) {
        const fallback = normalizeCropStatus(crop?.status);
        return fallback || 'creciendo';
    }
    const percent = Number.isFinite(progress.percent) ? progress.percent : 0;
    if (percent >= CROP_STATUS_THRESHOLDS.finalizado) return 'finalizado';
    if (percent >= CROP_STATUS_THRESHOLDS.produccion) return 'produccion';
    if (percent >= CROP_STATUS_THRESHOLDS.creciendo) return 'creciendo';
    return 'sembrado';
}

function resolveCropStatus(crop, progress) {
    const override = String(crop?.status_override || '').trim();
    if (override) return normalizeCropStatus(override);
    const mode = String(crop?.status_mode || '').toLowerCase().trim();
    if (mode === 'auto') return computeAutoCropStatus(crop, progress);
    if (crop?.status) return normalizeCropStatus(crop.status);
    return computeAutoCropStatus(crop, progress);
}

function getCropStatusMeta(status) {
    const normalized = normalizeCropStatus(status);
    if (CROP_STATUS_UI[normalized]) return CROP_STATUS_UI[normalized];
    const legacy = {
        growing: { class: 'status-growing', text: 'Creciendo' },
        ready: { class: 'status-ready', text: 'Lista!' },
        attention: { class: 'status-attention', text: 'Atencion' },
        harvested: { class: 'status-finished', text: 'Cosechado' }
    };
    const value = String(status || '').toLowerCase().trim();
    return legacy[value] || CROP_STATUS_UI.creciendo;
}

/**
 * Renderiza el estado del cultivo como badge
 */
function createStatusBadge(status) {
    const s = getCropStatusMeta(status);
    const badge = document.createElement('span');
    badge.className = `crop-status ${s.class}`;
    badge.textContent = s.text;
    return badge;
}

/**
 * Formatea fecha a texto legible
 */

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function getCalendarDay(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    return parts.length === 3 ? parseInt(parts[2], 10) : '';
}

function getCalendarMonth(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return '';
    const monthIndex = parseInt(parts[1], 10) - 1;
    return MONTH_NAMES_SHORT[monthIndex] || '';
}

function getCalendarYear(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    return parts.length === 3 ? parseInt(parts[0], 10) : '';
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const day = getCalendarDay(dateStr);
        const month = getCalendarMonth(dateStr);
        const year = getCalendarYear(dateStr);
        if (!day || !month || !year) return dateStr;
        return `${day} ${month} ${year}`;
    } catch (e) {
        return dateStr;
    }
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
    const cropId = crop?.id !== undefined && crop?.id !== null ? String(crop.id) : null;
    if (cropId) {
        card.dataset.cropId = cropId;
    }
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    const isSelected = !!(selectedCropId && cropId && cropId === selectedCropId);
    card.classList.toggle('is-selected', isSelected);
    card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

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

    const templateDuration = getTemplateDurationForCrop(crop);
    const progress = computeCropProgress(crop, templateDuration);
    const effectiveStatus = resolveCropStatus(crop, progress);
    header.append(cropInfo, createStatusBadge(effectiveStatus));

    const progressSection = document.createElement('div');
    progressSection.className = 'progress-section';

    const progressHeader = document.createElement('div');
    progressHeader.className = 'progress-header';

    const progressLabel = document.createElement('span');
    progressLabel.className = 'progress-label';
    progressLabel.textContent = 'Progreso';

    const progressValue = document.createElement('span');
    progressValue.className = 'progress-value';
    const progressLabelText = progress.ok ? progress.label : 'Progreso: N/A';
    progressValue.textContent = progressLabelText;

    progressHeader.append(progressLabel, progressValue);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'progress-track';

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = progress.ok ? `${progress.percent}%` : '0%';
    if (!progress.ok) {
        progressFill.style.opacity = '0.35';
    }

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

function logAgroDebug(...args) {
    if (AGRO_DEBUG) {
        console.log(...args);
    }
}

function getCropsSnapshot() {
    if (typeof window === 'undefined') return null;
    return window[AGRO_CROPS_STATE_KEY] || null;
}

function setCropsStatus(nextStatus, meta = {}) {
    cropsStatus = nextStatus;
    if (Number.isFinite(meta.count)) {
        cropsLastCount = meta.count;
    }

    const prevSnapshot = getCropsSnapshot();
    const snapshotCount = Number.isFinite(meta.count)
        ? meta.count
        : (Number.isFinite(prevSnapshot?.count) ? prevSnapshot.count : cropsLastCount);
    const snapshotCrops = Array.isArray(meta.crops)
        ? meta.crops.slice()
        : (Array.isArray(prevSnapshot?.crops) ? prevSnapshot.crops : []);
    const snapshotSeq = Number.isFinite(meta.requestId)
        ? meta.requestId
        : (Number.isFinite(prevSnapshot?.seq) ? prevSnapshot.seq : 0);
    const snapshot = {
        status: cropsStatus,
        count: Number.isFinite(snapshotCount) ? snapshotCount : 0,
        crops: snapshotCrops,
        ts: Date.now(),
        seq: snapshotSeq
    };

    if (typeof window !== 'undefined') {
        window[AGRO_CROPS_STATE_KEY] = snapshot;
        window.YG_AGRO_CROPS_STATUS = cropsStatus;
        if (Number.isFinite(snapshot.count)) {
            window.YG_AGRO_CROPS_COUNT = snapshot.count;
        }
        window.YG_AGRO_CROPS_UPDATED_AT = new Date(snapshot.ts).toISOString();
    }

    logAgroDebug('[AGRO] crops status', {
        status: cropsStatus,
        count: Number.isFinite(cropsLastCount) ? cropsLastCount : null,
        seq: meta.requestId || null
    });

    return snapshot;
}

function dispatchCropsReady(snapshot) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    const detail = snapshot && typeof snapshot === 'object'
        ? snapshot
        : {
            status: 'ready',
            count: Number.isFinite(snapshot) ? snapshot : 0,
            crops: [],
            ts: Date.now(),
            seq: cropsLoadSeq
        };
    window.dispatchEvent(new CustomEvent(AGRO_CROPS_READY_EVENT, { detail }));
}

function buildCropsStatusCard({ id, icon, title, subtitle, titleColor, titleWeight }) {
    const card = document.createElement('div');
    if (id) card.id = id;
    card.className = 'card animate-in';
    card.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 3rem;';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'kpi-icon-wrapper';
    iconWrap.style.cssText = 'margin: 0 auto 1rem;';
    iconWrap.textContent = icon || '';

    const titleEl = document.createElement('p');
    if (titleColor) titleEl.style.color = titleColor;
    if (titleWeight) titleEl.style.fontWeight = titleWeight;
    titleEl.textContent = title || '';

    card.append(iconWrap, titleEl);

    if (subtitle) {
        const subtitleEl = document.createElement('p');
        subtitleEl.style.color = 'var(--text-muted)';
        subtitleEl.style.fontSize = '0.9rem';
        subtitleEl.style.marginTop = '0.5rem';
        subtitleEl.textContent = subtitle;
        card.appendChild(subtitleEl);
    }

    return card;
}

function showCropsLoading(cropsGrid) {
    if (!cropsGrid) return;
    const hasCards = !!cropsGrid.querySelector('.crop-card');
    if (hasCards) return;

    const emptyCard = cropsGrid.querySelector(`#${CROPS_EMPTY_ID}`);
    if (emptyCard) emptyCard.remove();

    let loadingCard = cropsGrid.querySelector(`#${CROPS_LOADING_ID}`);
    if (!loadingCard) {
        loadingCard = buildCropsStatusCard({
            id: CROPS_LOADING_ID,
            icon: '🔄',
            title: 'Cargando cultivos...',
            titleColor: 'var(--text-muted)'
        });
        cropsGrid.appendChild(loadingCard);
    }
}

function clearCropsLoading(cropsGrid) {
    if (!cropsGrid) return;
    const loadingCard = cropsGrid.querySelector(`#${CROPS_LOADING_ID}`);
    if (loadingCard) loadingCard.remove();
}

function renderEmptyCropsState(cropsGrid) {
    if (!cropsGrid) return;
    cropsGrid.textContent = '';
    const emptyCard = buildCropsStatusCard({
        id: CROPS_EMPTY_ID,
        icon: '🌱',
        title: 'No tienes cultivos activos aún',
        subtitle: 'Haz clic en "+ Nuevo Cultivo" para agregar tu primer cultivo',
        titleColor: 'var(--gold-primary)',
        titleWeight: '600'
    });
    cropsGrid.appendChild(emptyCard);
}

/**
 * Carga cultivos del usuario (Supabase + LocalStorage fallback)
 */
export async function loadCrops() {
    const cropsGrid = document.querySelector('.crops-grid');
    if (!cropsGrid) return;

    const requestId = ++cropsLoadSeq;
    if (cropsLoadInFlight) {
        cropsLoadQueued = true;
        logAgroDebug('[AGRO] loadCrops queued', { ts: new Date().toISOString(), seq: requestId });
        return;
    }

    cropsLoadInFlight = true;
    setCropsStatus('loading', { requestId });
    showCropsLoading(cropsGrid);
    logAgroDebug('[AGRO] loadCrops START', { ts: new Date().toISOString(), seq: requestId });

    try {
        try {
            await loadCropTemplates();
        } catch (e) {
            // Template load failures should not block crops rendering
        }

        let crops = [];
        let error = null;
        let source = 'supabase';

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
                source = 'local';
                console.log('[Agro] Usuario no autenticado, usando LocalStorage');
                crops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
            }

        } catch (err) {
            console.warn('[Agro] Error Supabase, intentando LocalStorage:', err);
            // Fallback en caso de error de conexión
            source = 'local';
            crops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
            error = err;
        }

        const isLatest = requestId === cropsLoadSeq;
        logAgroDebug('[AGRO] loadCrops END', {
            ts: new Date().toISOString(),
            seq: requestId,
            count: crops.length,
            source,
            stale: !isLatest,
            error: !!error
        });

        if (!isLatest) return;

        // Actualizar Estadísticas siempre (aunque esté vacío)
        updateStats(crops);
        clearCropsLoading(cropsGrid);

        if (crops.length === 0) {
            cropsCache = [];
            logAgroDebug('[AGRO] renderCrops START', { ts: new Date().toISOString(), seq: requestId, count: 0 });
            renderEmptyCropsState(cropsGrid);
            logAgroDebug('[AGRO] renderCrops END', { ts: new Date().toISOString(), seq: requestId, count: 0 });
            const hadSelection = !!selectedCropId;
            setSelectedCropId(null, { silent: true });
            if (hadSelection) {
                dispatchCropChanged();
            }
            const snapshot = setCropsStatus('ready', { count: 0, requestId, crops: [] });
            dispatchCropsReady(snapshot);
            return;
        }

        // Guardar en cache para edición
        cropsCache = crops;

        // Renderizar cultivos
        logAgroDebug('[AGRO] renderCrops START', { ts: new Date().toISOString(), seq: requestId, count: crops.length });
        cropsGrid.textContent = '';
        const fragment = document.createDocumentFragment();
        crops.forEach((crop, i) => {
            fragment.appendChild(createCropCardElement(crop, i));
        });
        cropsGrid.appendChild(fragment);
        const prevSelected = selectedCropId;
        syncSelectedCropFromList(crops, { silent: true });
        if (prevSelected !== selectedCropId) {
            dispatchCropChanged();
        }
        logAgroDebug('[AGRO] renderCrops END', { ts: new Date().toISOString(), seq: requestId, count: crops.length });
        const snapshot = setCropsStatus('ready', { count: crops.length, requestId, crops });
        dispatchCropsReady(snapshot);

        console.info(`[AGRO] V9.6: progress computed for crops (${crops.length})`);

        // Animar progress bars
        setTimeout(() => {
            document.querySelectorAll('.crops-grid .progress-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => { bar.style.width = width; }, 100);
            });
        }, 300);

        console.log(`[Agro] ✅ ${crops.length} cultivos cargados`);
    } finally {
        cropsLoadInFlight = false;
        if (cropsLoadQueued) {
            cropsLoadQueued = false;
            loadCrops();
        }
    }
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
    try {
        syncFactureroNotifications('gastos', expenseCache);
    } catch (e) {
        // Silent: notifications are best-effort
    }
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

        const buyerGroup = document.createElement('div');
        buyerGroup.className = 'input-group field-dynamic';
        const buyerLabel = document.createElement('label');
        buyerLabel.className = 'input-label';
        buyerLabel.setAttribute('for', 'income-buyer');
        buyerLabel.textContent = 'Comprador';
        const buyerInput = document.createElement('input');
        buyerInput.type = 'text';
        buyerInput.id = 'income-buyer';
        buyerInput.className = 'styled-input';
        buyerInput.placeholder = 'Ej: Perez';
        buyerInput.style.paddingLeft = '1rem';
        buyerGroup.append(buyerLabel, buyerInput);

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

        const unitTypeGroup = document.createElement('div');
        unitTypeGroup.className = 'input-group field-unit';
        const unitTypeLabel = document.createElement('label');
        unitTypeLabel.className = 'input-label';
        unitTypeLabel.setAttribute('for', 'income-unit-type');
        unitTypeLabel.textContent = 'Presentacion';
        const unitTypeSelect = document.createElement('select');
        unitTypeSelect.id = 'income-unit-type';
        unitTypeSelect.className = 'styled-input';
        unitTypeSelect.style.paddingLeft = '1rem';
        unitTypeSelect.style.cursor = 'pointer';
        populateUnitSelect(unitTypeSelect);
        unitTypeGroup.append(unitTypeLabel, unitTypeSelect);

        const unitQtyGroup = document.createElement('div');
        unitQtyGroup.className = 'input-group field-unit-qty';
        const unitQtyLabel = document.createElement('label');
        unitQtyLabel.className = 'input-label';
        unitQtyLabel.setAttribute('for', 'income-unit-qty');
        unitQtyLabel.textContent = 'Cantidad (unidad)';
        const unitQtyInput = document.createElement('input');
        unitQtyInput.type = 'number';
        unitQtyInput.id = 'income-unit-qty';
        unitQtyInput.className = 'styled-input';
        unitQtyInput.placeholder = 'Ej: 2';
        unitQtyInput.step = '0.01';
        unitQtyInput.min = '0';
        unitQtyInput.style.paddingLeft = '1rem';
        unitQtyGroup.append(unitQtyLabel, unitQtyInput);

        const kgGroup = document.createElement('div');
        kgGroup.className = 'input-group field-kg';
        const kgLabel = document.createElement('label');
        kgLabel.className = 'input-label';
        kgLabel.setAttribute('for', 'income-quantity-kg');
        kgLabel.textContent = 'Kilogramos';
        const kgInput = document.createElement('input');
        kgInput.type = 'number';
        kgInput.id = 'income-quantity-kg';
        kgInput.className = 'styled-input';
        kgInput.placeholder = 'Ej: 50';
        kgInput.step = '0.01';
        kgInput.min = '0';
        kgInput.style.paddingLeft = '1rem';
        kgGroup.append(kgLabel, kgInput);

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

        grid.append(conceptGroup, buyerGroup, amountGroup, dateGroup, categoryGroup, unitTypeGroup, unitQtyGroup, kgGroup, cropGroup, actions);

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
        list.className = 'facturero-history-list';
        list.style.cssText = 'display: flex; flex-direction: column; gap: 0.8rem; max-height: 350px; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;';
        listContainer.append(listTitle, list);
    }

    const formAccordion = document.createElement('details');
    formAccordion.className = 'yg-accordion facturero-accordion';
    formAccordion.dataset.accordionGroup = 'facturero';
    formAccordion.open = true;

    const formSummary = document.createElement('summary');
    formSummary.className = 'yg-accordion-summary';
    formSummary.setAttribute('aria-controls', 'facturero-ingresos-form');
    formSummary.setAttribute('aria-expanded', 'true');

    const formIcon = document.createElement('span');
    formIcon.className = 'yg-accordion-icon';
    formIcon.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i>';

    const formTitle = document.createElement('span');
    formTitle.className = 'yg-accordion-title';
    formTitle.textContent = 'Registrar ingreso';

    const formChevron = document.createElement('span');
    formChevron.className = 'yg-accordion-chevron';
    formChevron.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';

    formSummary.append(formIcon, formTitle, formChevron);

    const formContent = document.createElement('div');
    formContent.className = 'yg-accordion-content';
    formContent.id = 'facturero-ingresos-form';
    if (form) formContent.appendChild(form);
    if (note) formContent.appendChild(note);
    formAccordion.append(formSummary, formContent);

    const historyAccordion = document.createElement('details');
    historyAccordion.className = 'yg-accordion facturero-accordion';
    historyAccordion.dataset.accordionGroup = 'facturero';
    historyAccordion.open = true;

    const historySummary = document.createElement('summary');
    historySummary.className = 'yg-accordion-summary';
    historySummary.setAttribute('aria-controls', 'facturero-ingresos-history');
    historySummary.setAttribute('aria-expanded', 'true');

    const historyIcon = document.createElement('span');
    historyIcon.className = 'yg-accordion-icon';
    historyIcon.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i>';

    const historyTitle = document.createElement('span');
    historyTitle.className = 'yg-accordion-title';
    historyTitle.textContent = 'Historial';

    const historyChevron = document.createElement('span');
    historyChevron.className = 'yg-accordion-chevron';
    historyChevron.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';

    historySummary.append(historyIcon, historyTitle, historyChevron);

    const historyContent = document.createElement('div');
    historyContent.className = 'yg-accordion-content';
    historyContent.id = 'facturero-ingresos-history';
    if (listContainer) historyContent.appendChild(listContainer);
    historyAccordion.append(historySummary, historyContent);

    wrapper.append(formAccordion, historyAccordion);
    targetContainer.appendChild(wrapper);

    if (typeof window !== 'undefined' && typeof window.initAgroAccordions === 'function') {
        window.initAgroAccordions();
    }

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
    const buyerInput = document.getElementById('income-buyer');
    const amountInput = document.getElementById('income-amount');
    const dateInput = document.getElementById('income-date');
    const categoryInput = document.getElementById('income-category');
    const unitTypeInput = document.getElementById('income-unit-type');
    const unitQtyInput = document.getElementById('income-unit-qty');
    const kgInput = document.getElementById('income-quantity-kg');
    const fileInput = document.getElementById('income-receipt');
    const dropzone = document.getElementById('income-dropzone');
    const btnSave = document.getElementById('income-save-btn');

    if (conceptInput) conceptInput.value = '';
    if (buyerInput) buyerInput.value = '';
    if (amountInput) amountInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if (categoryInput) categoryInput.selectedIndex = 0;
    if (unitTypeInput) unitTypeInput.selectedIndex = 0;
    if (unitQtyInput) unitQtyInput.value = '';
    if (kgInput) kgInput.value = '';
    if (fileInput) fileInput.value = '';
    resetIncomeDropzone(dropzone);

    incomeEditId = null;
    incomeEditSupportPath = null;
    if (btnSave) btnSave.textContent = 'Registrar Ingreso';
}

function enterIncomeEditMode(income) {
    if (!income) return;
    const conceptInput = document.getElementById('income-concept');
    const buyerInput = document.getElementById('income-buyer');
    const amountInput = document.getElementById('income-amount');
    const dateInput = document.getElementById('income-date');
    const categoryInput = document.getElementById('income-category');
    const unitTypeInput = document.getElementById('income-unit-type');
    const unitQtyInput = document.getElementById('income-unit-qty');
    const kgInput = document.getElementById('income-quantity-kg');
    const cropInput = document.getElementById('income-crop-id');
    const btnSave = document.getElementById('income-save-btn');
    const form = document.getElementById('income-form');

    incomeEditId = income.id || null;
    incomeEditSupportPath = income.soporte_url || income.evidence_url || null;

    const whoData = getWhoData('ingresos', income, income.concepto || '');
    if (conceptInput) conceptInput.value = whoData.concept || income.concepto || '';
    if (buyerInput) buyerInput.value = whoData.who || '';
    if (amountInput) amountInput.value = income.monto ?? '';
    if (dateInput) dateInput.value = income.fecha || new Date().toISOString().split('T')[0];
    if (categoryInput) categoryInput.value = income.categoria || '';
    if (unitTypeInput) unitTypeInput.value = income.unit_type || '';
    if (unitQtyInput) unitQtyInput.value = income.unit_qty ?? '';
    if (kgInput) kgInput.value = income.quantity_kg ?? '';
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

    const whoData = getWhoData('ingresos', income, income.concepto || '');
    const concept = document.createElement('div');
    concept.style.cssText = 'color: #fff; font-weight: 600; font-size: 0.95rem;';
    concept.textContent = whoData.concept || income.concepto || 'Ingreso';

    let whoLine = null;
    if (whoData.who) {
        whoLine = document.createElement('div');
        whoLine.style.cssText = 'color: rgba(255,255,255,0.65); font-size: 0.75rem; margin-top: 2px;';
        const whoMeta = WHO_FIELD_META.ingresos;
        const whoLabel = whoMeta?.label || 'Comprador';
        const whoIcon = whoMeta?.icon || '👤';
        whoLine.textContent = `• ${whoIcon} ${whoLabel}: ${whoData.who}`;
    }

    const meta = document.createElement('div');
    meta.style.cssText = 'color: rgba(255,255,255,0.5); font-size: 0.8rem; display: flex; flex-wrap: wrap; gap: 0.5rem;';
    const category = document.createElement('span');
    category.textContent = String(income.categoria || 'otros').replace(/-/g, ' ').toUpperCase();
    const dateStr = document.createElement('span');
    dateStr.textContent = formatDate(income.fecha);
    meta.append(category, dateStr);

    const unitSummary = formatUnitSummary(income.unit_type, income.unit_qty);
    if (unitSummary) {
        const unitEl = document.createElement('span');
        unitEl.textContent = unitSummary;
        meta.appendChild(unitEl);
    }

    const kgSummary = formatKgSummary(income.quantity_kg);
    if (kgSummary) {
        const kgEl = document.createElement('span');
        kgEl.textContent = kgSummary;
        meta.appendChild(kgEl);
    }

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

    if (whoLine) {
        details.append(concept, whoLine, meta);
    } else {
        details.append(concept, meta);
    }
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

    const transferBtn = document.createElement('button');
    transferBtn.type = 'button';
    transferBtn.className = 'btn-transfer-income';
    transferBtn.dataset.tab = 'ingresos';
    transferBtn.dataset.id = income.id ? String(income.id) : '';
    transferBtn.title = 'Transferir ingreso';
    transferBtn.style.cssText = 'background: transparent; border: 1px solid rgba(200, 167, 82, 0.45); color: #C8A752; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;';

    const transferIcon = document.createElement('i');
    transferIcon.className = 'fa-solid fa-arrow-right-long';
    transferIcon.style.fontSize = '0.8rem';
    transferBtn.appendChild(transferIcon);

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

    actions.append(amount, editBtn, duplicateBtn, transferBtn, deleteBtn);
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
            .select(AGRO_INCOME_LIST_COLUMNS)
            .eq('user_id', user.id)
            .order('fecha', { ascending: false });
        if (selectedCropId) {
            query = query.eq('crop_id', selectedCropId);
        }

        if (incomeDeletedAtSupported !== false) {
            query = query.is('deleted_at', null);
        }

        let { data, error } = await query;
        if (error && error.message && error.message.toLowerCase().includes('deleted_at')) {
            incomeDeletedAtSupported = false;
            let fallbackQuery = supabase
                .from('agro_income')
                .select(AGRO_INCOME_LIST_COLUMNS)
                .eq('user_id', user.id)
                .order('fecha', { ascending: false });
            if (selectedCropId) {
                fallbackQuery = fallbackQuery.eq('crop_id', selectedCropId);
            }
            const fallback = await fallbackQuery;
            data = fallback.data;
            error = fallback.error;
        } else if (!error) {
            incomeDeletedAtSupported = true;
        }

        if (error) throw error;

        incomeCache = Array.isArray(data) ? data : [];
        try {
            syncFactureroNotifications('ingresos', incomeCache);
        } catch (e) {
            // Silent: notifications are best-effort
        }

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
    const buyerInput = document.getElementById('income-buyer');
    const amountInput = document.getElementById('income-amount');
    const dateInput = document.getElementById('income-date');
    const categoryInput = document.getElementById('income-category');
    const unitTypeInput = document.getElementById('income-unit-type');
    const unitQtyInput = document.getElementById('income-unit-qty');
    const kgInput = document.getElementById('income-quantity-kg');
    const fileInput = document.getElementById('income-receipt');
    const btnSave = document.getElementById('income-save-btn');

    const concept = conceptInput?.value?.trim() || '';
    const buyer = buyerInput?.value?.trim() || '';
    const amount = amountInput?.value?.trim() || '';
    const category = categoryInput?.value || '';
    const dateVal = dateInput?.value || new Date().toISOString().split('T')[0];
    const unitType = unitTypeInput?.value || '';
    const unitQtyRaw = unitQtyInput?.value;
    const kgRaw = kgInput?.value;
    const unitQtyValue = Number.isFinite(parseFloat(unitQtyRaw)) && parseFloat(unitQtyRaw) > 0 ? parseFloat(unitQtyRaw) : null;
    const kgValue = Number.isFinite(parseFloat(kgRaw)) && parseFloat(kgRaw) > 0 ? parseFloat(kgRaw) : null;
    const file = fileInput?.files?.[0] || null;
    const conceptFinal = buyer ? buildConceptWithWho('ingresos', concept, buyer) : concept;

    if (!concept || !amount || !category) {
        alert('Por favor completa Concepto, Monto y Categoria.');
        return;
    }

    // V9.6.6: Block future dates and invalid dates
    const dateCheck = assertDateNotFuture(dateVal, 'Fecha');
    if (!dateCheck.valid) {
        alert('⚠️ ' + dateCheck.error);
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
                concepto: conceptFinal,
                monto: parseFloat(amount),
                fecha: dateVal,
                categoria: category,
                unit_type: unitType || null,
                unit_qty: unitQtyValue,
                quantity_kg: kgValue
            };
            if (soportePath) {
                payload.soporte_url = soportePath;
            }

            let { error: updateError } = await supabase
                .from('agro_income')
                .update(payload)
                .eq('id', incomeId)
                .eq('user_id', user.id);

            if (updateError && (isMissingColumnError(updateError, 'unit_type') || isMissingColumnError(updateError, 'unit_qty') || isMissingColumnError(updateError, 'quantity_kg'))) {
                const fallbackPayload = { ...payload };
                delete fallbackPayload.unit_type;
                delete fallbackPayload.unit_qty;
                delete fallbackPayload.quantity_kg;
                const retry = await supabase
                    .from('agro_income')
                    .update(fallbackPayload)
                    .eq('id', incomeId)
                    .eq('user_id', user.id);
                updateError = retry.error;
            }

            if (updateError) throw updateError;
            alert('Ingreso actualizado.');
        } else {
            // V9.5: Get crop_id from dropdown
            const incomeCropSelect = document.getElementById('income-crop-id');
            const incomeCropId = incomeCropSelect?.value || null;

            let { error: insertError } = await supabase
                .from('agro_income')
                .insert({
                    id: incomeId,
                    user_id: user.id,
                    concepto: conceptFinal,
                    monto: parseFloat(amount),
                    fecha: dateVal,
                    categoria: category,
                    soporte_url: soportePath,
                    crop_id: incomeCropId || null, // V9.5
                    unit_type: unitType || null,
                    unit_qty: unitQtyValue,
                    quantity_kg: kgValue
                });

            if (insertError && (isMissingColumnError(insertError, 'unit_type') || isMissingColumnError(insertError, 'unit_qty') || isMissingColumnError(insertError, 'quantity_kg'))) {
                const fallbackInsert = {
                    id: incomeId,
                    user_id: user.id,
                    concepto: conceptFinal,
                    monto: parseFloat(amount),
                    fecha: dateVal,
                    categoria: category,
                    soporte_url: soportePath,
                    crop_id: incomeCropId || null
                };
                const retry = await supabase
                    .from('agro_income')
                    .insert(fallbackInsert);
                insertError = retry.error;
            }

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

function ensureFactureroHighlightStyles() {
    if (document.getElementById('yg-facturero-highlight-styles')) return;
    const style = document.createElement('style');
    style.id = 'yg-facturero-highlight-styles';
    style.textContent = `
        .yg-facturero-highlight {
            outline: 1px solid rgba(200, 167, 82, 0.7);
            box-shadow: 0 0 20px rgba(200, 167, 82, 0.25);
            background: rgba(200, 167, 82, 0.08);
            transition: box-shadow 0.2s ease, background 0.2s ease, outline 0.2s ease;
        }
    `;
    document.head.appendChild(style);
}

function highlightFactureroItem(el) {
    if (!el) return;
    ensureFactureroHighlightStyles();
    el.classList.add('yg-facturero-highlight');
    setTimeout(() => {
        el.classList.remove('yg-facturero-highlight');
    }, 1500);
}

function resolveFactureroAccordion(tab, accordionKey) {
    if (!tab) return null;
    const rawKey = accordionKey ? String(accordionKey) : 'history';
    const contentId = rawKey.startsWith('facturero-') ? rawKey : `facturero-${tab}-${rawKey}`;
    const content = document.getElementById(contentId);
    if (content) {
        return content.closest('details') || content;
    }
    const summary = document.querySelector(`.yg-accordion-summary[aria-controls="${contentId}"]`);
    return summary?.closest('details') || null;
}

function resolveFactureroItem(tab, itemId) {
    if (!tab || !itemId) return null;
    const safeId = String(itemId);
    if (tab === 'gastos') {
        return document.querySelector(`.expense-item[data-expense-id="${safeId}"]`);
    }
    if (tab === 'ingresos') {
        return document.querySelector(`.income-item[data-income-id="${safeId}"]`);
    }
    return document.querySelector(`.facturero-item[data-tab="${tab}"][data-id="${safeId}"]`);
}

function openFactureroDeepLink(payload = {}) {
    const targetTab = FIN_TAB_NAMES.has(payload.tab) ? payload.tab : 'pendientes';
    const maxAttempts = 10;
    let attempt = 0;

    const run = () => {
        attempt += 1;
        const panel = document.querySelector(`.finances-section .tab-panel[data-tab="${targetTab}"]`)
            || document.getElementById(`tab-panel-${targetTab}`);
        if (!panel) {
            if (attempt < maxAttempts) setTimeout(run, 120);
            return;
        }

        switchTab(targetTab, { focus: false });
        if (typeof window.initAgroAccordions === 'function') {
            window.initAgroAccordions();
        }

        const accordion = resolveFactureroAccordion(targetTab, payload.accordionKey);
        if (accordion && accordion.tagName === 'DETAILS') {
            accordion.open = true;
            const summary = accordion.querySelector('summary');
            if (summary) summary.setAttribute('aria-expanded', 'true');
        }

        const itemEl = resolveFactureroItem(targetTab, payload.itemId);
        const scrollTarget = itemEl || accordion || panel;
        if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (itemEl) {
            highlightFactureroItem(itemEl);
        } else if (attempt < maxAttempts) {
            setTimeout(run, 160);
        }
    };

    run();
}

if (typeof window !== 'undefined') {
    window.YG_AGRO_NAV = Object.assign(window.YG_AGRO_NAV || {}, {
        openFacturero: openFactureroDeepLink
    });
}

function initFinanceFormHandlers() {
    const formConfigs = [
        {
            id: 'pending-form',
            table: 'agro_pending',
            label: 'Pendiente',
            tabName: 'pendientes',
            fileInputId: 'pending-receipt',
            dropzoneId: 'pending-dropzone',
            storagePath: 'pending',
            buildStoragePath: buildPendingStoragePath,
            cropSelectId: 'pending-crop-id', // V9.5
            unitPrefix: 'pending',
            getFormData: (form) => ({
                concepto: form.querySelector('#input-concepto-pendiente')?.value?.trim(),
                monto: parseFloat(form.querySelector('#input-monto-pendiente')?.value) || 0,
                fecha: form.querySelector('#input-fecha-pendiente')?.value,
                cliente: form.querySelector('#input-cliente-pendiente')?.value?.trim() || null,
                notas: form.querySelector('#input-notas-pendiente')?.value?.trim() || null,
                ...readUnitFields(form, 'pending')
            })
        },
        {
            id: 'loss-form',
            table: 'agro_losses',
            label: 'Pérdida',
            tabName: 'perdidas',
            fileInputId: 'loss-receipt',
            dropzoneId: 'loss-dropzone',
            storagePath: 'loss',
            buildStoragePath: buildLossStoragePath,
            cropSelectId: 'loss-crop-id', // V9.5
            unitPrefix: 'loss',
            getFormData: (form) => ({
                concepto: form.querySelector('#input-concepto-perdida')?.value?.trim(),
                monto: parseFloat(form.querySelector('#input-monto-perdida')?.value) || 0,
                fecha: form.querySelector('#input-fecha-perdida')?.value,
                causa: form.querySelector('#input-causa-perdida')?.value?.trim() || null,
                notas: form.querySelector('#input-notas-perdida')?.value?.trim() || null,
                ...readUnitFields(form, 'loss')
            })
        },
        {
            id: 'transfer-form',
            table: 'agro_transfers',
            label: 'Transferencia',
            tabName: 'transferencias',
            fileInputId: 'transfer-receipt',
            dropzoneId: 'transfer-dropzone',
            storagePath: 'transfer',
            buildStoragePath: buildTransferStoragePath,
            cropSelectId: 'transfer-crop-id', // V9.5
            unitPrefix: 'transfer',
            getFormData: (form) => ({
                concepto: form.querySelector('#input-concepto-transferencia')?.value?.trim(),
                monto: parseFloat(form.querySelector('#input-monto-transferencia')?.value) || 0,
                fecha: form.querySelector('#input-fecha-transferencia')?.value,
                destino: form.querySelector('#input-destino-transferencia')?.value?.trim() || null,
                notas: form.querySelector('#input-notas-transferencia')?.value?.trim() || null,
                ...readUnitFields(form, 'transfer')
            })
        }
    ];

    // V9.6.6: Use local timezone to get today's date (not UTC)
    const today = getTodayLocalISO();

    formConfigs.forEach((config) => {
        const form = document.getElementById(config.id);
        if (!form || form.dataset.bound === 'true') return;
        form.dataset.bound = 'true';

        // Set default date and max
        const dateInput = form.querySelector('input[type="date"]');
        if (dateInput) {
            if (!dateInput.value) dateInput.value = today;
            dateInput.max = today; // V9.6.6: Block future dates
        }

        if (config.unitPrefix) {
            const unitSelect = form.querySelector(`#${config.unitPrefix}-unit-type`);
            populateUnitSelect(unitSelect);
            // console.log(`[AGRO] V9.6.5 Unit select populated: #${config.unitPrefix}-unit-type, options:`, unitSelect?.options?.length);
        }

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

                // V9.6.6: Block future dates and invalid dates
                const dateCheck = assertDateNotFuture(formData.fecha, 'Fecha');
                if (!dateCheck.valid) {
                    throw new Error(dateCheck.error);
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
                // console.log('[AGRO] V9.6.5 insertData:', { table: config.table, insertData });

                const tabName = config.tabName;
                const whoMeta = WHO_FIELD_META[tabName];
                const whoFieldKey = whoMeta?.field || null;
                const whoValue = whoFieldKey ? formData?.[whoFieldKey] : '';

                let { error } = await supabase.from(config.table).insert(insertData);
                if (error) {
                    const dropWho = whoFieldKey && isMissingColumnError(error, whoFieldKey);
                    const dropUnits = isMissingColumnError(error, 'unit_type')
                        || isMissingColumnError(error, 'unit_qty')
                        || isMissingColumnError(error, 'quantity_kg');
                    if (dropWho || dropUnits) {
                        const fallbackData = { ...insertData };
                        if (dropWho) {
                            delete fallbackData[whoFieldKey];
                            fallbackData.concepto = buildConceptWithWho(tabName, formData.concepto, whoValue);
                        }
                        if (dropUnits) {
                            delete fallbackData.unit_type;
                            delete fallbackData.unit_qty;
                            delete fallbackData.quantity_kg;
                            if (typeof showEvidenceToast === 'function') {
                                showEvidenceToast('Aviso: columnas de presentacion/kg no disponibles, se guardo sin ellas.', 'warning');
                            } else {
                                alert('Aviso: columnas de presentacion/kg no disponibles, se guardo sin ellas.');
                            }
                        }
                        const retry = await supabase.from(config.table).insert(fallbackData);
                        error = retry.error;
                    }
                }
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
                if (typeof window.refreshFactureroHistory === 'function') {
                    await window.refreshFactureroHistory(config.tabName);
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

// ============================================================
// V9.5.6: Asistente Agro (IA real)
// ============================================================

const AGRO_ASSISTANT_HISTORY_KEY = 'YG_AGRO_ASSISTANT_HISTORY_V1';
const AGRO_ASSISTANT_THREADS_KEY = 'YG_AGRO_ASSISTANT_THREADS_V1';
const AGRO_ASSISTANT_ACTIVE_THREAD_KEY = 'YG_AGRO_ASSISTANT_ACTIVE_THREAD_V1';
const AGRO_ASSISTANT_MESSAGES_PREFIX = 'YG_AGRO_ASSISTANT_MESSAGES_V1_';
const AGRO_ASSISTANT_COOLDOWN_KEY = 'YG_AGRO_ASSISTANT_COOLDOWN_V1';
const AGRO_ASSISTANT_MIN_INTERVAL_MS = 10000;  // 10s default cooldown
const AGRO_ASSISTANT_RATE_LIMIT_MS = 60000;    // 60s initial backoff on 429
const AGRO_ASSISTANT_RATE_LIMIT_MAX_MS = 300000; // 5 min cap
const AGRO_ASSISTANT_MAX_HISTORY = 20;
const AGRO_ASSISTANT_DEFAULT_TITLE = 'Nueva conversacion';

let assistantCooldownTimer = null;
let assistantButtonTimer = null;

// V9.7: Runtime state for queue-based anti-429 protection
const assistantRuntime = {
    inFlight: false,
    queue: [],
    cooldownUntil: 0,
    backoffSeconds: 0,
    last429At: 0
};

const assistantState = {
    threads: [],
    activeThreadId: null,
    messagesByThreadId: {}
};

function safeJsonParse(raw, fallback) {
    try {
        const parsed = raw ? JSON.parse(raw) : fallback;
        return parsed ?? fallback;
    } catch (e) {
        return fallback;
    }
}

function createThreadId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeThread(thread) {
    if (!thread || !thread.id) return null;
    const createdAt = Number(thread.createdAt) || Date.now();
    const lastMessageAt = Number(thread.lastMessageAt) || null;
    return {
        id: String(thread.id),
        title: String(thread.title || AGRO_ASSISTANT_DEFAULT_TITLE).trim() || AGRO_ASSISTANT_DEFAULT_TITLE,
        createdAt,
        updatedAt: Number(thread.updatedAt) || lastMessageAt || createdAt,
        lastMessageAt
    };
}

function readThreadsFromStorage() {
    const raw = localStorage.getItem(AGRO_ASSISTANT_THREADS_KEY);
    const data = safeJsonParse(raw, []);
    const threads = Array.isArray(data) ? data.map(normalizeThread).filter(Boolean) : [];
    return threads;
}

function saveThreadsToStorage(threads) {
    try {
        localStorage.setItem(AGRO_ASSISTANT_THREADS_KEY, JSON.stringify(threads));
    } catch (e) {
        // Ignore storage errors
    }
}

function getMessagesKey(threadId) {
    return `${AGRO_ASSISTANT_MESSAGES_PREFIX}${threadId}`;
}

function readMessagesFromStorage(threadId) {
    if (!threadId) return [];
    const raw = localStorage.getItem(getMessagesKey(threadId));
    const data = safeJsonParse(raw, []);
    return Array.isArray(data) ? data : [];
}

function saveMessagesToStorage(threadId, messages) {
    if (!threadId) return;
    try {
        localStorage.setItem(getMessagesKey(threadId), JSON.stringify(messages));
    } catch (e) {
        // Ignore storage errors
    }
}

function readActiveThreadId() {
    try {
        return localStorage.getItem(AGRO_ASSISTANT_ACTIVE_THREAD_KEY);
    } catch (e) {
        return null;
    }
}

function writeActiveThreadId(threadId) {
    try {
        if (threadId) {
            localStorage.setItem(AGRO_ASSISTANT_ACTIVE_THREAD_KEY, threadId);
        }
    } catch (e) {
        // Ignore storage errors
    }
}

function readLegacyHistory() {
    const raw = localStorage.getItem(AGRO_ASSISTANT_HISTORY_KEY);
    const data = safeJsonParse(raw, []);
    return Array.isArray(data) ? data : [];
}

function clearLegacyHistory() {
    try {
        localStorage.removeItem(AGRO_ASSISTANT_HISTORY_KEY);
    } catch (e) {
        // Ignore storage errors
    }
}

function migrateLegacyHistoryIfNeeded() {
    const existingThreads = readThreadsFromStorage();
    if (existingThreads.length) return existingThreads;
    const legacy = readLegacyHistory();
    if (!legacy.length) return existingThreads;
    const thread = createThread(AGRO_ASSISTANT_DEFAULT_TITLE);
    saveThreadsToStorage([thread]);
    const migrated = legacy.map((item) => ({
        role: item?.role || 'assistant',
        text: String(item?.text || ''),
        ts: Number(item?.ts) || Date.now()
    }));
    saveMessagesToStorage(thread.id, migrated);
    writeActiveThreadId(thread.id);
    clearLegacyHistory();
    return [thread];
}

function createThread(title) {
    const now = Date.now();
    return {
        id: createThreadId(),
        title: title || AGRO_ASSISTANT_DEFAULT_TITLE,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: null
    };
}

function hydrateAssistantState() {
    const threads = migrateLegacyHistoryIfNeeded();
    assistantState.threads = threads.length ? threads : readThreadsFromStorage();
    if (!assistantState.threads.length) {
        const thread = createThread(AGRO_ASSISTANT_DEFAULT_TITLE);
        assistantState.threads = [thread];
        saveThreadsToStorage(assistantState.threads);
        writeActiveThreadId(thread.id);
    }
    const activeId = readActiveThreadId();
    const candidate = assistantState.threads.find((t) => t.id === activeId);
    assistantState.activeThreadId = candidate ? candidate.id : assistantState.threads[0].id;
    writeActiveThreadId(assistantState.activeThreadId);
    preloadThreadMessages(assistantState.activeThreadId);
}

function preloadThreadMessages(threadId) {
    if (!threadId) return [];
    if (!assistantState.messagesByThreadId[threadId]) {
        assistantState.messagesByThreadId[threadId] = readMessagesFromStorage(threadId);
    }
    return assistantState.messagesByThreadId[threadId];
}

function getActiveThread() {
    return assistantState.threads.find((thread) => thread.id === assistantState.activeThreadId) || null;
}

function setActiveThread(threadId) {
    const target = assistantState.threads.find((thread) => thread.id === threadId);
    if (!target) return;
    assistantState.activeThreadId = target.id;
    writeActiveThreadId(target.id);
    preloadThreadMessages(target.id);
    renderThreadList();
    renderAssistantHistory();
    setAssistantDrawerOpen(false);
}

function createNewThreadAndActivate() {
    const thread = createThread(AGRO_ASSISTANT_DEFAULT_TITLE);
    assistantState.threads.unshift(thread);
    saveThreadsToStorage(assistantState.threads);
    setActiveThread(thread.id);
}

function updateThreadMetadata(threadId, data) {
    const thread = assistantState.threads.find((t) => t.id === threadId);
    if (!thread) return;
    if (data.title) {
        thread.title = data.title;
    }
    if (data.lastMessageAt) {
        thread.lastMessageAt = data.lastMessageAt;
        thread.updatedAt = data.lastMessageAt;
    } else if (data.updatedAt) {
        thread.updatedAt = data.updatedAt;
    }
    saveThreadsToStorage(assistantState.threads);
}

function formatThreadTitle(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return AGRO_ASSISTANT_DEFAULT_TITLE;
    if (trimmed.length <= 42) return trimmed;
    return `${trimmed.slice(0, 39)}...`;
}

function formatThreadTime(ts) {
    if (!Number.isFinite(ts)) return '';
    try {
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
        return '';
    }
}

function clearElement(el) {
    if (!el) return;
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

function renderThreadList() {
    const list = document.getElementById('assistant-thread-list');
    if (!list) return;
    clearElement(list);

    const threads = [...assistantState.threads].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!threads.length) {
        const empty = document.createElement('div');
        empty.className = 'assistant-thread assistant-empty';
        empty.textContent = 'Aun no hay conversaciones.';
        list.appendChild(empty);
        return;
    }

    threads.forEach((thread) => {
        const wrapper = document.createElement('div');
        wrapper.className = `assistant-thread-wrapper${thread.id === assistantState.activeThreadId ? ' is-active' : ''}`;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'assistant-thread';
        button.dataset.threadId = thread.id;

        const title = document.createElement('div');
        title.className = 'assistant-thread-title';
        title.textContent = thread.title || AGRO_ASSISTANT_DEFAULT_TITLE;

        const meta = document.createElement('div');
        meta.className = 'assistant-thread-meta';
        const time = formatThreadTime(thread.lastMessageAt || thread.updatedAt);
        meta.textContent = time ? `Actualizado ${time}` : 'Sin mensajes';

        button.append(title, meta);
        button.addEventListener('click', () => setActiveThread(thread.id));

        // V9.7: Delete button for each thread
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'assistant-thread-delete';
        deleteBtn.innerHTML = '&#128465;'; // 🗑️
        deleteBtn.title = 'Eliminar conversacion';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Eliminar esta conversacion?')) {
                deleteThreadById(thread.id);
            }
        });

        wrapper.append(button, deleteBtn);
        list.appendChild(wrapper);
    });
}

function splitMessageParts(text) {
    const parts = [];
    const input = String(text || '');
    const regex = /```([a-zA-Z0-9_-]+)?\\n([\\s\\S]*?)```/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(input)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', value: input.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'code', lang: match[1] || 'codigo', value: match[2] || '' });
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < input.length) {
        parts.push({ type: 'text', value: input.slice(lastIndex) });
    }
    return parts;
}

function renderMessageContent(container, text) {
    const body = document.createElement('div');
    body.className = 'assistant-message-body';
    const parts = splitMessageParts(text);
    parts.forEach((part) => {
        if (part.type === 'code') {
            const block = document.createElement('div');
            block.className = 'assistant-code';

            const header = document.createElement('div');
            header.className = 'assistant-code-header';
            const label = document.createElement('span');
            label.textContent = part.lang ? part.lang.toUpperCase() : 'CODIGO';
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'assistant-code-copy';
            copyBtn.textContent = 'Copiar';
            copyBtn.addEventListener('click', () => {
                const copyPromise = navigator.clipboard?.writeText(part.value || '');
                if (copyPromise && typeof copyPromise.then === 'function') {
                    copyPromise.then(() => {
                        showAssistantToast('Copiado');
                    }).catch(() => {
                        showAssistantToast('No se pudo copiar');
                    });
                } else {
                    showAssistantToast('No se pudo copiar');
                }
            });
            header.append(label, copyBtn);

            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = part.value || '';
            pre.appendChild(code);

            block.append(header, pre);
            body.appendChild(block);
            return;
        }

        if (part.value) {
            const paragraph = document.createElement('p');
            paragraph.textContent = part.value;
            body.appendChild(paragraph);
        }
    });

    if (!body.childNodes.length) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text || '';
        body.appendChild(paragraph);
    }

    container.appendChild(body);
}

function getAssistantScrollContainer() {
    return document.getElementById('assistant-scroll') || document.getElementById('assistant-history');
}

function renderAssistantHistory() {
    const container = document.getElementById('assistant-history');
    if (!container) return;
    const messages = preloadThreadMessages(assistantState.activeThreadId);
    clearElement(container);

    if (!messages.length) {
        const empty = document.createElement('div');
        empty.className = 'assistant-empty';
        empty.textContent = 'Inicia una conversacion para ver respuestas reales.';
        container.appendChild(empty);
        syncAssistantGuideLayout({ messagesCount: 0 });
        return;
    }

    messages.forEach((item) => {
        const message = document.createElement('div');
        const role = item?.role === 'user'
            ? 'user'
            : item?.role === 'error'
                ? 'error'
                : item?.role === 'system'
                    ? 'system'
                    : 'assistant';
        message.className = `assistant-message ${role}`;
        renderMessageContent(message, item?.text || '');
        container.appendChild(message);
    });
    syncAssistantGuideLayout({ messagesCount: messages.length });
    scrollAssistantToBottom(true);
}

function isNearBottom(container) {
    const threshold = 80;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
}

function scrollAssistantToBottom(force = false) {
    const container = getAssistantScrollContainer();
    if (!container) return;
    if (force || isNearBottom(container)) {
        container.scrollTop = container.scrollHeight;
    }
}

function setAssistantStatus(label) {
    const statusEl = document.getElementById('assistant-status');
    if (statusEl) {
        statusEl.textContent = label;
    }
}

function setAssistantLoading(isLoading) {
    const typingEl = document.getElementById('assistant-typing');
    if (typingEl) {
        typingEl.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
    }
    setAssistantStatus(isLoading ? 'Pensando...' : 'En linea');
    if (isLoading) {
        scrollAssistantToBottom(true);
    }
}

function setAssistantDrawerOpen(open) {
    const shell = document.getElementById('assistant-shell');
    const overlay = document.getElementById('assistant-drawer-overlay');
    if (!shell || !overlay) return;
    shell.classList.toggle('drawer-open', open);
    overlay.classList.toggle('is-visible', open);
}

function showAssistantToast(text) {
    const toast = document.getElementById('assistant-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-visible');
    setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 1600);
}

function addAssistantMessage({ role, text }) {
    const safeText = String(text || '').trim();
    if (!safeText) return;

    if (!assistantState.activeThreadId) {
        createNewThreadAndActivate();
    }

    const normalizedRole = role === 'user' || role === 'assistant' || role === 'error' || role === 'system'
        ? role
        : 'assistant';
    const threadId = assistantState.activeThreadId;
    const messages = preloadThreadMessages(threadId);

    const last = messages[messages.length - 1];
    if (last && last.role === normalizedRole && last.text === safeText) {
        renderAssistantHistory();
        return;
    }

    const message = {
        role: normalizedRole,
        text: safeText,
        ts: Date.now()
    };
    messages.push(message);

    const trimmed = messages.slice(-AGRO_ASSISTANT_MAX_HISTORY);
    assistantState.messagesByThreadId[threadId] = trimmed;
    saveMessagesToStorage(threadId, trimmed);

    if (normalizedRole === 'user') {
        const activeThread = getActiveThread();
        if (activeThread && activeThread.title === AGRO_ASSISTANT_DEFAULT_TITLE) {
            updateThreadMetadata(threadId, { title: formatThreadTitle(safeText) });
        }
    }

    updateThreadMetadata(threadId, { lastMessageAt: message.ts });
    renderThreadList();
    renderAssistantHistory();
    scrollAssistantToBottom();
}

function appendAssistantMessage(role, text) {
    addAssistantMessage({ role, text });
}

function readAssistantCooldown() {
    try {
        const raw = localStorage.getItem(AGRO_ASSISTANT_COOLDOWN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function writeAssistantCooldown(state) {
    try {
        localStorage.setItem(AGRO_ASSISTANT_COOLDOWN_KEY, JSON.stringify(state));
    } catch (e) {
        // Ignore storage errors
    }
}

function getCooldownRemainingMs() {
    const state = readAssistantCooldown();
    const now = Date.now();
    const until = Number(state?.until || 0);
    if (until > now) {
        return { remaining: until - now, mode: 'cooldown' };
    }
    const lockUntil = Number(state?.lockUntil || 0);
    if (lockUntil > now) {
        return { remaining: lockUntil - now, mode: 'lock' };
    }
    const lastSentAt = Number(state?.lastSentAt || 0);
    if (lastSentAt) {
        const wait = AGRO_ASSISTANT_MIN_INTERVAL_MS - (now - lastSentAt);
        if (wait > 0) return { remaining: wait, mode: 'cooldown' };
    }
    return { remaining: 0, mode: 'none' };
}

function setCooldownUntil(ms) {
    const state = readAssistantCooldown();
    state.until = Date.now() + ms;
    writeAssistantCooldown(state);
}

function isRateLimitError(error) {
    const status = error?.status || error?.statusCode;
    const detail = `${error?.message || ''} ${error?.context?.error?.message || ''} ${error?.context?.error || ''}`
        .toLowerCase();
    return status === 429 ||
        detail.includes('resource_exhausted') ||
        detail.includes('limit reached') ||
        detail.includes('rate limit');
}

function applyRateLimitBackoff() {
    const state = readAssistantCooldown();
    const current = Number(state?.rateLimitBackoffMs || 0);
    const next = current ? Math.min(current * 2, AGRO_ASSISTANT_RATE_LIMIT_MAX_MS) : AGRO_ASSISTANT_RATE_LIMIT_MS;
    state.rateLimitBackoffMs = next;
    state.lockUntil = Date.now() + next;
    state.lastErrorAt = Date.now();
    writeAssistantCooldown(state);
    return next;
}

function updateAssistantCooldownUI() {
    const sendBtn = document.getElementById('btn-assistant-send');
    const cooldownEl = document.getElementById('assistant-cooldown');
    if (!sendBtn || !cooldownEl) return 0;

    // V9.7: Enhanced UI states
    const now = Date.now();
    const queueLen = assistantRuntime.queue.length;

    // Priority 1: In-flight
    if (assistantRuntime.inFlight) {
        sendBtn.textContent = 'Enviando...';
        sendBtn.disabled = true;
        cooldownEl.textContent = queueLen > 0 ? `En cola (${queueLen})` : '';
        return 1;
    }

    // Priority 2: 429 Backoff (lockUntil from cooldown state)
    const { remaining, mode } = getCooldownRemainingMs();
    if (remaining > 0) {
        const seconds = Math.ceil(remaining / 1000);
        if (mode === 'lock') {
            sendBtn.textContent = `Espera ${seconds}s`;
            cooldownEl.textContent = `Limite AI Studio: espera ${seconds}s`;
        } else {
            sendBtn.textContent = `Espera ${seconds}s`;
            cooldownEl.textContent = `Espera ${seconds}s (modo eficiente)`;
        }
        sendBtn.disabled = true;
        if (queueLen > 0) {
            cooldownEl.textContent += ` • En cola (${queueLen})`;
        }
        return remaining;
    }

    // Priority 3: Queue pending but no cooldown
    if (queueLen > 0) {
        sendBtn.textContent = 'Enviar';
        sendBtn.disabled = false;
        cooldownEl.textContent = `En cola (${queueLen})`;
        return 0;
    }

    // Default: Ready
    sendBtn.textContent = 'Enviar';
    sendBtn.disabled = false;
    cooldownEl.textContent = '';
    return 0;
}

function startAssistantCooldownTimer() {
    if (assistantCooldownTimer) {
        clearInterval(assistantCooldownTimer);
    }
    assistantCooldownTimer = setInterval(() => {
        const remaining = updateAssistantCooldownUI();
        if (remaining <= 0 && !assistantRuntime.inFlight && assistantRuntime.queue.length === 0) {
            clearInterval(assistantCooldownTimer);
            assistantCooldownTimer = null;
        }
        // V9.7: Auto-process queue when cooldown expires
        if (remaining <= 0 && !assistantRuntime.inFlight && assistantRuntime.queue.length > 0) {
            processAssistantQueue();
        }
    }, 1000);
}

function stopAssistantTimers() {
    if (assistantCooldownTimer) {
        clearInterval(assistantCooldownTimer);
        assistantCooldownTimer = null;
    }
    if (assistantButtonTimer) {
        clearInterval(assistantButtonTimer);
        assistantButtonTimer = null;
    }
}

// V9.7: Build crops preamble for anti-hallucination
function buildCropsPreamble() {
    let crops = [];
    // Try cropsCache first, then localStorage
    if (Array.isArray(cropsCache) && cropsCache.length > 0) {
        crops = cropsCache;
    } else {
        try {
            crops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
        } catch (e) {
            crops = [];
        }
    }

    if (!Array.isArray(crops) || crops.length === 0) {
        return {
            hasCrops: false,
            preamble: 'IMPORTANTE: El usuario NO tiene cultivos registrados en el sistema. ' +
                'ANTES de dar cualquier recomendacion, PREGUNTA que cultivo tiene y en que etapa esta. ' +
                'NO asumas ni inventes cultivos. Si el usuario pregunta por un cultivo especifico (ej: tomates), ' +
                'responde: "No veo ese cultivo en tus registros. ¿Quieres que te ayude a agregarlo o me confirmas cual tienes?"'
        };
    }

    const cropList = crops
        .filter(c => c && c.name && !c.deleted_at)
        .map(c => {
            let desc = c.name;
            if (c.variety) desc += ` (${c.variety})`;
            const templateDuration = getTemplateDurationForCrop(c);
            const progress = computeCropProgress(c, templateDuration);
            const effectiveStatus = resolveCropStatus(c, progress);
            desc += ` - ${normalizeCropStatus(effectiveStatus) || 'activo'}`;
            return desc;
        })
        .slice(0, 10);

    return {
        hasCrops: true,
        preamble: `Cultivos REALES del usuario: ${cropList.join(', ')}. ` +
            'REGLA ESTRICTA: Solo menciona estos cultivos. NO inventes otros. ' +
            'Si el usuario pregunta por un cultivo que NO esta en la lista, responde: ' +
            '"No veo ese cultivo en tus registros. ¿Quieres que te ayude a agregarlo o me confirmas cual tienes?"'
    };
}

// V9.7: Queue processor with peek/shift-on-success pattern
async function processAssistantQueue() {
    // Guard: Already processing
    if (assistantRuntime.inFlight) {
        return;
    }

    // Guard: Cooldown active
    const { remaining } = getCooldownRemainingMs();
    if (remaining > 0) {
        updateAssistantCooldownUI();
        startAssistantCooldownTimer();
        return;
    }

    // Guard: Queue empty
    if (assistantRuntime.queue.length === 0) {
        updateAssistantCooldownUI();
        return;
    }

    // PEEK: Get item without removing (will shift on success only)
    const item = assistantRuntime.queue[0];
    if (!item || !item.prompt) {
        assistantRuntime.queue.shift(); // Remove invalid item
        processAssistantQueue(); // Try next
        return;
    }

    assistantRuntime.inFlight = true;
    updateAssistantCooldownUI();
    setAssistantLoading(true);

    try {
        // Build context with crops preamble
        const contextPayload = getAssistantContext();
        const cropsPreamble = buildCropsPreamble();

        // V9.7: Prefix prompt with preamble (NOT saved to UI history)
        const promptForModel = cropsPreamble.preamble + '\n\n---\nPregunta del usuario:\n' + item.prompt;

        // THE INVOKE CALL REMAINS UNCHANGED (as required)
        const { data, error } = await supabase.functions.invoke('agro-assistant', {
            body: { message: promptForModel, prompt: promptForModel, context: contextPayload }
        });

        if (error) {
            const status = error?.status || error?.statusCode;
            console.warn('[AGRO][AI] invoke error', status || 'unknown');

            if (isRateLimitError(error)) {
                // 429: Exponential backoff, DO NOT shift (keep item for retry)
                assistantRuntime.last429At = Date.now();
                const backoffMs = applyRateLimitBackoff();
                const backoffSec = Math.ceil(backoffMs / 1000);
                assistantRuntime.backoffSeconds = backoffSec;

                showAssistantToast(`Limite AI Studio. Espera ${backoffSec}s`);
                addAssistantMessage({
                    role: 'system',
                    text: `Limite de consultas alcanzado. Tu mensaje esta en cola y se enviara automaticamente en ${backoffSec}s.`
                });
            } else {
                // Other error: shift the item, apply short cooldown
                assistantRuntime.queue.shift();
                setCooldownUntil(AGRO_ASSISTANT_MIN_INTERVAL_MS);
                addAssistantMessage({ role: 'error', text: getAssistantErrorMessage(error) });
            }

            assistantRuntime.inFlight = false;
            setAssistantLoading(false);
            updateAssistantCooldownUI();
            startAssistantCooldownTimer();
            return;
        }

        // SUCCESS: Now shift the item
        assistantRuntime.queue.shift();

        const reply = [data?.reply, data?.message, data?.text]
            .find((value) => typeof value === 'string' && value.trim());

        if (typeof reply !== 'string' || !reply.trim()) {
            setAssistantLoading(false);
            addAssistantMessage({ role: 'error', text: 'No se pudo consultar IA. Intenta luego.' });
        } else {
            setAssistantLoading(false);
            addAssistantMessage({ role: 'assistant', text: reply.trim() });
        }

        // Reset backoff on success
        assistantRuntime.backoffSeconds = 0;
        const cooldownState = readAssistantCooldown();
        cooldownState.rateLimitBackoffMs = 0;
        cooldownState.lastSentAt = Date.now();
        writeAssistantCooldown(cooldownState);

        // Apply normal cooldown
        setCooldownUntil(AGRO_ASSISTANT_MIN_INTERVAL_MS);

    } catch (err) {
        console.warn('[AGRO][AI] request failed', err?.message || err || 'unknown');
        // Network error: keep item in queue for retry
        if (String(err?.message || '').toLowerCase().includes('fetch') ||
            String(err?.message || '').toLowerCase().includes('network')) {
            // Network error - keep in queue
            setCooldownUntil(AGRO_ASSISTANT_MIN_INTERVAL_MS * 2);
            addAssistantMessage({
                role: 'system',
                text: 'Error de conexion. Tu mensaje esta en cola y se reintentara.'
            });
        } else {
            // Other error - remove from queue
            assistantRuntime.queue.shift();
            addAssistantMessage({ role: 'error', text: getAssistantErrorMessage(err) });
        }
        setAssistantLoading(false);
    } finally {
        assistantRuntime.inFlight = false;
        updateAssistantCooldownUI();
        startAssistantCooldownTimer();

        // Process next in queue if any (respecting cooldown)
        if (assistantRuntime.queue.length > 0) {
            const nextRemaining = getCooldownRemainingMs().remaining;
            if (nextRemaining <= 0) {
                setTimeout(processAssistantQueue, 100);
            }
        }
    }
}

// V9.7: Delete active thread
function deleteActiveThread() {
    const threadId = assistantState.activeThreadId;
    if (!threadId) return false;

    // Remove thread from list
    assistantState.threads = assistantState.threads.filter(t => t.id !== threadId);

    // Clear messages from storage
    try {
        localStorage.removeItem(getMessagesKey(threadId));
    } catch (e) {
        // Ignore
    }

    // Clear from memory
    delete assistantState.messagesByThreadId[threadId];

    // Save updated threads
    saveThreadsToStorage(assistantState.threads);

    // Switch to another thread or create new
    if (assistantState.threads.length > 0) {
        setActiveThread(assistantState.threads[0].id);
    } else {
        createNewThreadAndActivate();
    }

    renderThreadList();
    renderAssistantHistory();
    showAssistantToast('Conversacion eliminada');
    return true;
}

// V9.7: Delete thread by ID (for sidebar delete buttons)
function deleteThreadById(threadId) {
    if (!threadId) return false;

    // Remove thread from list
    assistantState.threads = assistantState.threads.filter(t => t.id !== threadId);

    // Clear messages from storage
    try {
        localStorage.removeItem(getMessagesKey(threadId));
    } catch (e) {
        // Ignore
    }

    // Clear from memory
    delete assistantState.messagesByThreadId[threadId];

    // Save updated threads
    saveThreadsToStorage(assistantState.threads);

    // If deleted thread was active, switch to another
    if (assistantState.activeThreadId === threadId) {
        if (assistantState.threads.length > 0) {
            setActiveThread(assistantState.threads[0].id);
        } else {
            createNewThreadAndActivate();
        }
        renderAssistantHistory();
    }

    renderThreadList();
    showAssistantToast('Conversacion eliminada');
    return true;
}


function getAssistantLocationContext() {
    const Geo = window.YGGeolocation;
    if (!Geo) return null;
    let location = null;
    try {
        location = Geo.getManualLocation?.() || null;
        if (!location) {
            const pref = Geo.getLocationPreference?.() || 'gps';
            const mode = pref === 'ip' ? 'ip' : 'gps';
            location = Geo.getCachedCoords?.(mode) || null;
        }
    } catch (_e) {
        location = null;
    }

    const lat = Number(location?.lat);
    const lon = Number(location?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return {
        label: location?.label || null,
        lat,
        lon
    };
}

function getAssistantWeatherContext() {
    const descEl = document.getElementById('weather-desc');
    const tempEl = document.getElementById('weather-temp');
    const humEl = document.getElementById('weather-humidity');

    const summary = descEl?.textContent?.trim() || null;
    const temp = tempEl?.textContent ? Number(tempEl.textContent.replace(/[^\d.-]/g, '')) : null;
    const humidity = humEl?.textContent ? Number(humEl.textContent.replace(/[^\d.-]/g, '')) : null;

    if (!summary && !Number.isFinite(temp) && !Number.isFinite(humidity)) return null;

    return {
        summary,
        temp_c: Number.isFinite(temp) ? temp : null,
        humidity: Number.isFinite(humidity) ? humidity : null
    };
}

function getAssistantCropFocus(activeTab) {
    const crops = Array.isArray(cropsCache) && cropsCache.length
        ? cropsCache
        : (() => {
            try {
                const local = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
                return Array.isArray(local) ? local : [];
            } catch (_e) {
                return [];
            }
        })();

    let selectedCrop = null;
    if (activeTab) {
        const cropSelectMap = {
            gastos: 'expense-crop-id',
            ingresos: 'income-crop-id',
            pendientes: 'pending-crop-id',
            perdidas: 'loss-crop-id',
            transferencias: 'transfer-crop-id'
        };
        const cropSelectId = cropSelectMap[activeTab];
        const cropSelect = cropSelectId ? document.getElementById(cropSelectId) : null;
        const cropId = cropSelect?.value || null;
        if (cropId) {
            selectedCrop = crops.find((crop) => String(crop?.id) === String(cropId)) || null;
        }
    }

    if (!selectedCrop) {
        selectedCrop = crops[0] || null;
    }

    if (!selectedCrop) return null;

    const templateDuration = getTemplateDurationForCrop(selectedCrop);
    const progress = computeCropProgress(selectedCrop, templateDuration);
    const resolvedStatus = resolveCropStatus(selectedCrop, progress);

    return {
        id: selectedCrop?.id ?? null,
        name: selectedCrop?.name ?? null,
        variety: selectedCrop?.variety ?? null,
        status: normalizeCropStatus(resolvedStatus),
        day_x: progress.ok ? progress.dayIndex : null,
        day_total: progress.ok ? progress.totalDays : null,
        start_date: selectedCrop?.start_date ?? null,
        expected_harvest_date: selectedCrop?.expected_harvest_date ?? null
    };
}

function getAssistantContext() {
    const context = {
        date: new Date().toISOString(),
        app: 'YavlGold Agro',
        version: 'V9.5.6'
    };
    const activeTab = readStoredTab?.() || document.querySelector('.financial-tab-btn.is-active')?.dataset?.tab;
    if (activeTab) {
        context.tab = activeTab;
    }

    const location = getAssistantLocationContext();
    if (location) {
        context.location_real = location;
    }

    const weather = getAssistantWeatherContext();
    if (weather) {
        context.weather_now = weather;
    }

    const cropFocus = getAssistantCropFocus(activeTab);
    if (cropFocus) {
        context.crop_focus = cropFocus;
    }

    const cropsCount = Array.isArray(cropsCache) ? cropsCache.length : null;
    if (Number.isFinite(cropsCount)) {
        context.stats = { crops_count: cropsCount };
    }

    return context;
}

function isLikelyNonAgroQuestion(text) {
    const normalized = String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const agroKeywords = [
        'cultivo', 'siembra', 'cosecha', 'riego', 'plaga', 'fertiliz', 'suelo', 'hongo',
        'fungic', 'insect', 'malez', 'semilla', 'germin', 'hoja', 'raiz', 'tallo',
        'mancha', 'podred', 'clima', 'humedad', 'lluvia', 'temperatura', 'viento',
        'invernadero', 'nutrient', 'ph', 'abono', 'agro', 'fitosanit', 'pulgon', 'acaro',
        'roya', 'mildiu', 'oidio', 'botrytis', 'fusarium', 'bacteria', 'virus'
    ];

    const nonAgroKeywords = [
        'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'crypto', 'cripto', 'blockchain', 'trading',
        'forex', 'acciones', 'bolsa', 'nft', 'defi', 'wallet', 'binance', 'metamask',
        'capital de', 'poema', 'cuento', 'historia', 'codigo', 'programa', 'javascript', 'react',
        'vue', 'svelte', 'python', 'java', 'sql', 'docker', 'linux', 'windows', 'mac',
        'pelicula', 'serie', 'musica', 'futbol', 'nba', 'nfl', 'politica', 'presidente'
    ];

    const hasAgro = agroKeywords.some((kw) => normalized.includes(kw));
    const hasNonAgro = nonAgroKeywords.some((kw) => normalized.includes(kw));

    return hasNonAgro && !hasAgro;
}

function syncAssistantGuideLayout({ messagesCount = 0, forceCollapse = false } = {}) {
    const guide = document.getElementById('assistant-guide');
    const toggle = document.getElementById('assistant-guide-toggle');
    if (!guide || !toggle) return;

    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const shouldCollapse = (messagesCount > 0) || (forceCollapse && isMobile);
    guide.classList.toggle('is-collapsed', shouldCollapse);
    toggle.setAttribute('aria-expanded', shouldCollapse ? 'false' : 'true');
}

function openAgroAssistant() {
    const modal = document.getElementById('modal-agro-assistant');
    if (!modal) {
        console.warn('[AGRO] V9.5.7: assistant modal not found');
        return;
    }
    try {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        hydrateAssistantState();
        renderThreadList();
        renderAssistantHistory();
        setAssistantStatus('En linea');
        setAssistantLoading(false);
        setAssistantDrawerOpen(false);
        const initialMessages = preloadThreadMessages(assistantState.activeThreadId || '');
        syncAssistantGuideLayout({ messagesCount: initialMessages.length, forceCollapse: true });
        updateAssistantCooldownUI();
        startAssistantCooldownTimer();
        const input = document.getElementById('agro-assistant-input');
        requestAnimationFrame(() => input?.focus({ preventScroll: true }));
    } catch (err) {
        console.warn('[AGRO] V9.5.7: assistant open failed', err?.message || err);
        closeAgroAssistant();
    }
}

function closeAgroAssistant() {
    const modal = document.getElementById('modal-agro-assistant');
    if (modal) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('modal-open');
    setAssistantDrawerOpen(false);
    stopAssistantTimers(); // V9.7: Clean up timers on close
}

function getAssistantErrorMessage(error) {
    const status = error?.status || error?.statusCode;
    const rawMessage = typeof error?.message === 'string' ? error.message : '';
    const contextMessage = typeof error?.context?.error?.message === 'string' ? error.context.error.message : '';
    const contextError = typeof error?.context?.error === 'string' ? error.context.error : '';
    const detail = (contextMessage || contextError || rawMessage).toLowerCase();

    // Errores de Auth
    if (status === 401 || status === 403) {
        return 'Sesion expirada o sin permiso. Inicia sesion y vuelve a intentar.';
    }

    // Errores de Rate Limit
    if (status === 429) {
        return 'Límite de consultas alcanzado. Espera unos segundos.';
    }

    // Errores de Servidor (5xx)
    if (status >= 500) {
        return 'El asistente tiene problemas técnicos momentáneos. Intenta más tarde.';
    }

    // Errores de Red / CORS / Offline
    if (!status || status === 0 ||
        detail.includes('failed to fetch') ||
        detail.includes('networkerror') ||
        detail.includes('cors') ||
        detail.includes('load failed')) {
        return 'Error de conexión: No se pudo contactar al asistente. Verifica tu red.';
    }

    // Errores específicos reportados por backend
    if (detail.includes('empty_prompt')) return 'Por favor escribe tu consulta.';
    if (detail.includes('missing_gemini_key')) return 'Sistema en mantenimiento (API Key).';
    if (detail.includes('ai_error')) return 'La IA no pudo procesar tu solicitud. Intenta reformularla.';

    // Fallback genérico pero amigable
    if (detail && !/functionshttperror/i.test(detail)) {
        // Si hay un mensaje técnico legible, mostrarlo limpio si es corto, sino genérico
        return detail.length < 100 ? detail : 'Error inesperado en el asistente.';
    }

    return 'No se pudo consultar el asistente. Intenta nuevamente.';
}

// V9.7: Refactored to use queue system - ALWAYS enqueues first
async function sendAgroAssistantMessage() {
    const input = document.getElementById('agro-assistant-input');
    const prompt = input?.value?.trim() || '';
    if (!prompt) return;

    // Auth check first (before queuing)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        addAssistantMessage({ role: 'error', text: 'Debes iniciar sesion para usar el asistente.' });
        input?.focus();
        return;
    }

    // Non-agro filter (before queuing)
    if (isLikelyNonAgroQuestion(prompt)) {
        addAssistantMessage({
            role: 'system',
            text: 'Soy tu asistente de campo. Preguntame sobre cultivos, plagas, riego, clima o cosecha. Para otros temas usa Crypto u otro modulo.'
        });
        return;
    }

    // ALWAYS add user message to UI history immediately
    addAssistantMessage({ role: 'user', text: prompt });

    // Clear input immediately for UX
    input.value = '';
    input?.focus();

    // CRITICAL: ALWAYS enqueue BEFORE any return or check
    assistantRuntime.queue.push({
        prompt,
        timestamp: Date.now()
    });

    // Update UI to show queue state
    updateAssistantCooldownUI();

    // Show toast if in cooldown/queue mode
    const { remaining } = getCooldownRemainingMs();
    if (remaining > 0 || assistantRuntime.inFlight) {
        const seconds = Math.ceil(remaining / 1000);
        if (assistantRuntime.inFlight) {
            showAssistantToast('Mensaje en cola');
        } else if (remaining > 0) {
            showAssistantToast(`En cola. Se enviara en ${seconds}s`);
        }
        startAssistantCooldownTimer();
        // DO NOT RETURN - the queue will be processed when timer fires
    }

    // Try to process queue immediately if possible
    processAssistantQueue();
}


function initAgroAssistantModal() {
    if (document.__agroAssistantBound) return;
    document.__agroAssistantBound = true;

    const modal = document.getElementById('modal-agro-assistant');
    const openBtn = document.getElementById('btn-open-agro-assistant');
    const closeBtn = document.getElementById('btn-close-agro-assistant');
    const sendBtn = document.getElementById('btn-assistant-send');
    const templateBtn = document.getElementById('btn-assistant-template');
    const input = document.getElementById('agro-assistant-input');
    const newThreadBtn = document.getElementById('assistant-new-thread');
    const drawerToggle = document.getElementById('assistant-drawer-toggle');
    const drawerOverlay = document.getElementById('assistant-drawer-overlay');
    const guideToggle = document.getElementById('assistant-guide-toggle');

    if (!modal) return;

    openBtn?.addEventListener('click', openAgroAssistant);
    closeBtn?.addEventListener('click', closeAgroAssistant);
    newThreadBtn?.addEventListener('click', createNewThreadAndActivate);
    drawerToggle?.addEventListener('click', () => setAssistantDrawerOpen(true));
    drawerOverlay?.addEventListener('click', () => setAssistantDrawerOpen(false));

    guideToggle?.addEventListener('click', () => {
        const guide = document.getElementById('assistant-guide');
        if (!guide) return;
        const collapsed = guide.classList.toggle('is-collapsed');
        guideToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });

    modal.addEventListener('click', (event) => {
        if (event.target?.dataset?.close === 'true') {
            closeAgroAssistant();
        }
        if (event.target?.dataset?.drawerClose === 'true') {
            setAssistantDrawerOpen(false);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeAgroAssistant();
        }
    });

    sendBtn?.addEventListener('click', sendAgroAssistantMessage);

    templateBtn?.addEventListener('click', () => {
        const template = 'Cultivo: ... | Etapa: ... | Sintoma: ... | Ubicacion/clima: ... | Que intente: ... | Que necesito: ...';
        if (input) {
            input.value = template;
            input.focus();
        }
    });

    input?.addEventListener('input', () => {
        if (!assistantCooldownTimer) updateAssistantCooldownUI();
    });

    input?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendAgroAssistantMessage();
        }
    });

    // V9.7: Delete thread button
    const deleteThreadBtn = document.getElementById('btn-assistant-delete-thread');
    deleteThreadBtn?.addEventListener('click', () => {
        if (confirm('¿Eliminar esta conversacion?')) {
            deleteActiveThread();
        }
    });

    console.info('[AGRO] V9.7: assistant modal with queue/anti-429 wired');
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

    // Plantillas locales (Tachira) + controles de modal
    loadCropTemplates().then(() => {
        populateCropTemplateSelect();
        updateTemplateCycleDisplay(getSelectedTemplateDuration());
    }).catch(() => {
        updateTemplateCycleDisplay(null);
    });
    initCropTemplateControls();

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
    initAgroAssistantModal();
    populateCropDropdowns(); // V9.5: Poblar dropdowns de cultivo
    setupFactureroCrudListeners(); // V9.5.1: Event delegation para CRUD
    console.info('[AGRO] V9.6: facturero who-field enabled');
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
    const editInput = document.getElementById('crop-edit-id');
    if (editInput) editInput.value = '';
    const statusSelect = document.getElementById('crop-status');
    if (statusSelect) statusSelect.value = 'sembrado';

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
    const statusSelect = document.getElementById('crop-status');
    if (statusSelect) {
        const mode = String(crop.status_mode || '').toLowerCase().trim();
        if (mode === 'auto' && !crop.status_override) {
            statusSelect.value = 'auto';
        } else {
            statusSelect.value = normalizeCropStatus(crop.status_override || crop.status);
        }
    }
    const editInput = document.getElementById('crop-edit-id');
    if (editInput) editInput.value = String(crop.id || '');
    const templateSelect = document.getElementById('crop-template');
    if (templateSelect) {
        templateSelect.value = '';
        updateTemplateCycleDisplay(null);
    }

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
    const editInput = document.getElementById('crop-edit-id');
    if (editInput) editInput.value = '';
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
    const statusValue = document.getElementById('crop-status')?.value || 'sembrado';
    const statusMode = statusValue === 'auto' ? 'auto' : 'manual';
    const statusOverride = statusMode === 'manual' ? statusValue : null;
    const existingCrop = currentEditId
        ? cropsCache.find(c => String(c.id) === String(currentEditId))
        : null;
    const baseCropForStatus = {
        ...(existingCrop || {}),
        name,
        variety,
        start_date: startDate,
        expected_harvest_date: harvestDate,
        status: statusOverride || existingCrop?.status || 'creciendo'
    };
    const templateDuration = getTemplateDurationForCrop(baseCropForStatus);
    const progress = computeCropProgress(baseCropForStatus, templateDuration);
    const effectiveStatus = statusMode === 'auto'
        ? computeAutoCropStatus(baseCropForStatus, progress)
        : normalizeCropStatus(statusValue);

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
        expected_harvest_date: harvestDate,
        status: effectiveStatus,
        status_mode: statusMode,
        status_override: statusOverride
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
                        status: effectiveStatus,
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
                    status: effectiveStatus,
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


    // V9.6.2: Mobile Accordions
    function initAccordions() {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const accordions = Array.from(document.querySelectorAll('.yg-accordion'));

        accordions.forEach((el) => {
            const summary = el.querySelector('summary');
            const content = el.querySelector('.yg-accordion-content');
            if (summary && content) {
                if (!content.id) {
                    const fallbackId = el.id ? `${el.id}-content` : `yg-acc-${Math.random().toString(16).slice(2)}-content`;
                    content.id = fallbackId;
                }
                summary.setAttribute('role', 'button');
                summary.setAttribute('aria-controls', content.id);
                summary.setAttribute('aria-expanded', el.hasAttribute('open') ? 'true' : 'false');
            }
            if (isMobile) {
                el.removeAttribute('open');
            }
            if (el.dataset.accordionBound === 'true') return;
            el.dataset.accordionBound = 'true';
            el.addEventListener('toggle', () => {
                if (summary) summary.setAttribute('aria-expanded', el.open ? 'true' : 'false');
                if (isMobile && el.open && el.dataset.accordionGroup) {
                    const group = el.dataset.accordionGroup;
                    document.querySelectorAll(`.yg-accordion[data-accordion-group=\"${group}\"]`).forEach((other) => {
                        if (other !== el) other.removeAttribute('open');
                    });
                }
            });
        });
    }

    window.initAgroAccordions = initAccordions;

    // V9.6.2: Fix Facturero Edit Label (Pendientes -> Cliente)
    function initFactureroLabelFix() {
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-edit-facturero');
            if (btn) {
                const tab = btn.dataset.tab;
                if (tab === 'pendientes') {
                    // Esperar a que el modal se abra y pueble
                    setTimeout(() => {
                        const modal = document.querySelector('#modal-edit-facturero');
                        if (!modal) return;

                        // Buscar el label que suele decir "Comprador" (o el segundo label dynamic)
                        const dynamicLabel = modal.querySelector('.input-group.field-dynamic .input-label');
                        if (dynamicLabel) {
                            dynamicLabel.textContent = 'Cliente';
                            console.log('[AGRO] V9.6.2: Label corregido a Cliente');
                        }
                    }, 50);
                }
            }
        });
    }

    // Build marker (for production verification)
    function getAgroBuildHash() {
        const script = document.querySelector('script[type="module"][src*="agro-"]');
        const src = script?.getAttribute('src') || '';
        const match = src.match(/agro-([A-Za-z0-9_-]+)\.js/);
        return match ? match[1] : 'dev';
    }

    function getAgroBuildVersion(marker) {
        const dataVersion = marker?.dataset?.buildVersion;
        if (dataVersion) return dataVersion;
        if (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) {
            return `V${__APP_VERSION__}`;
        }
        return 'V9.6.2';
    }

    function getAgroBuildDate(marker) {
        const dataDate = marker?.dataset?.buildDate;
        if (dataDate) return dataDate;
        if (typeof __BUILD_DATE__ !== 'undefined' && __BUILD_DATE__) {
            return __BUILD_DATE__;
        }
        return new Date().toISOString().split('T')[0];
    }

    function initBuildMarker() {
        const marker = document.getElementById('agro-build-marker');
        if (!marker) return;

        const version = getAgroBuildVersion(marker);
        const hash = getAgroBuildHash();
        const date = getAgroBuildDate(marker);

        marker.textContent = `Agro Build: ${version} • ${hash} • ${date}`;
        marker.setAttribute('data-build-hash', hash);
        console.info(`[AGRO] Build marker: ${version} ${hash} ${date}`);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initAccordions();
        initFactureroLabelFix();
        initBuildMarker();
    });
})();

// ============================================================
// AGROREPO ULTIMATE ENGINE v2.0.0
// Local-First, Feature-Complete, Premium UX
// ============================================================
(function () {
    'use strict';

    // FEATURE FLAG
    const AGROREPO_ENABLED = true;

    if (!AGROREPO_ENABLED) {
        console.log('[AgroRepo] ⛔ Widget disabled');
        const section = document.getElementById('agro-repo-section');
        if (section) section.style.display = 'none';
        return;
    }

    // Constants
    const APP_KEY = 'agrorepo_ultimate_v2';
    const CROP_ICONS = {
        maiz: '🌽', caraota: '🫘', tomate: '🍅', papa: '🥔',
        cafe: '☕', lechuga: '🥬', cebolla: '🧅', ajo: '🧄', otro: '🌾'
    };
    const TAG_CONFIG = {
        riego: { icon: '💧', label: 'Riego' },
        abono: { icon: '🧪', label: 'Abono' },
        plaga: { icon: '🐛', label: 'Plaga' },
        cosecha: { icon: '🌽', label: 'Cosecha' },
        siembra: { icon: '🌱', label: 'Siembra' },
        clima: { icon: '🌦️', label: 'Clima' },
        general: { icon: '📋', label: 'General' }
    };

    // State
    const state = {
        bitacoras: [],
        activeBitacoraId: null,
        selectedTags: [],
        lastSaved: null
    };

    // DOM refs
    let root = null;
    let widgetInitialized = false;
    let _deleteCallback = null;

    // ─── UTILITIES ─────────────────────────────────────────
    const $ = id => root?.querySelector(`#${id}`) || document.getElementById(id);
    const generateId = () => 'arw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    const generateHash = () => Math.random().toString(36).slice(2, 8).toUpperCase();
    const escapeHtml = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };

    function formatDate(iso) {
        try {
            return new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return iso; }
    }

    function timeAgo(iso) {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ahora';
        if (mins < 60) return `Hace ${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `Hace ${hrs}h`;
        return `Hace ${Math.floor(hrs / 24)}d`;
    }

    function getCropIcon(name) {
        const lower = name.toLowerCase();
        for (const [key, icon] of Object.entries(CROP_ICONS)) {
            if (lower.includes(key)) return icon;
        }
        return '🌾';
    }

    function getStorageSize() {
        const data = localStorage.getItem(APP_KEY) || '';
        const bytes = new Blob([data]).size;
        return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
    }

    function renderMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^- (.+)/gm, '<span style="color:var(--arw-text-muted);margin-right:6px">▸</span>$1');
    }

    function getTagLabel(tag) {
        return TAG_CONFIG[tag] ? `${TAG_CONFIG[tag].icon} ${TAG_CONFIG[tag].label}` : tag;
    }

    // ─── PERSISTENCE ─────────────────────────────────────────
    function persist() {
        try {
            localStorage.setItem(APP_KEY, JSON.stringify({
                bitacoras: state.bitacoras,
                activeBitacoraId: state.activeBitacoraId,
                lastSaved: state.lastSaved
            }));
            updateStats();
        } catch (e) {
            console.error('[AgroRepo] Persist error:', e);
            showToast('❌ Error al guardar', 'error');
        }
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(APP_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                state.bitacoras = parsed.bitacoras || [];
                state.activeBitacoraId = parsed.activeBitacoraId || null;
                state.lastSaved = parsed.lastSaved || null;
            }
        } catch (e) {
            console.error('[AgroRepo] Load error:', e);
            state.bitacoras = [];
        }
    }

    // ─── TOAST ────────────────────────────────────────────
    function showToast(message, type = 'info') {
        const container = $('arw-toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'arw-toast';
        toast.innerHTML = `<span style="font-size:1.1rem">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
            <span style="font-size:0.82rem;color:var(--arw-text-primary)">${message}</span>`;
        toast.style.borderColor = type === 'success' ? 'var(--arw-success)' : type === 'error' ? 'var(--arw-danger)' : type === 'warning' ? 'var(--arw-warning)' : 'var(--arw-border-gold)';
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ─── DELETE MODAL ─────────────────────────────────────
    function showDeleteModal(text, callback) {
        const modal = $('arw-deleteModal');
        const modalText = $('arw-deleteModalText');
        if (modal && modalText) {
            modalText.textContent = text;
            modal.classList.add('active');
            _deleteCallback = callback;
        }
    }

    function closeDeleteModal() {
        const modal = $('arw-deleteModal');
        if (modal) modal.classList.remove('active');
        _deleteCallback = null;
    }

    // ─── BITÁCORA CRUD ────────────────────────────────────
    function createBitacora() {
        const input = $('arw-newBitacoraInput');
        const name = input?.value?.trim();
        if (!name) {
            showToast('⚠️ Escribe el nombre del cultivo', 'warning');
            input?.focus();
            return;
        }
        if (state.bitacoras.some(b => b.name.toLowerCase() === name.toLowerCase())) {
            showToast('⚠️ Ya existe una bitácora con ese nombre', 'warning');
            return;
        }
        const bitacora = {
            id: generateId(),
            name,
            icon: getCropIcon(name),
            createdAt: new Date().toISOString(),
            reports: []
        };
        state.bitacoras.unshift(bitacora);
        if (input) input.value = '';
        persist();
        renderBitacoraList();
        selectBitacora(bitacora.id);
        showToast(`✅ Bitácora "<strong>${escapeHtml(name)}</strong>" creada`, 'success');
    }

    function deleteBitacora(id) {
        const b = state.bitacoras.find(x => x.id === id);
        if (!b) return;
        showDeleteModal(`¿Eliminar "${b.name}" y sus ${b.reports.length} reportes? No se puede deshacer.`, () => {
            state.bitacoras = state.bitacoras.filter(x => x.id !== id);
            if (state.activeBitacoraId === id) {
                state.activeBitacoraId = null;
                showWelcome();
            }
            persist();
            renderBitacoraList();
            showToast(`🗑️ Bitácora "${escapeHtml(b.name)}" eliminada`);
        });
    }

    function selectBitacora(id) {
        state.activeBitacoraId = id;
        persist();
        renderBitacoraList();
        showEditor();
        closeSidebar();
    }

    // ─── REPORTS ──────────────────────────────────────────
    function commitReport() {
        const textarea = $('arw-reportContent');
        const text = textarea?.value?.trim();
        if (!state.activeBitacoraId) {
            showToast('⚠️ Selecciona una bitácora primero', 'warning');
            return;
        }
        if (!text) {
            showToast('⚠️ Escribe algo en el reporte', 'warning');
            textarea?.focus();
            return;
        }
        const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
        if (!bitacora) return;
        const report = {
            id: generateId(),
            hash: generateHash(),
            content: text,
            tags: [...state.selectedTags],
            createdAt: new Date().toISOString()
        };
        if (report.tags.length === 0) report.tags.push('general');
        bitacora.reports.unshift(report);
        if (textarea) textarea.value = '';
        state.selectedTags = [];
        root?.querySelectorAll('.arw-tag-btn.selected')?.forEach(b => b.classList.remove('selected'));
        persist();
        renderTimeline();
        renderPreview();
        renderBitacoraList();
        showToast(`✅ Reporte registrado · <strong style="font-family:monospace;color:var(--arw-gold-muted)">#${report.hash}</strong>`, 'success');
    }

    function deleteReport(reportId) {
        const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
        if (!bitacora) return;
        showDeleteModal('¿Eliminar este reporte? No se puede deshacer.', () => {
            bitacora.reports = bitacora.reports.filter(r => r.id !== reportId);
            persist();
            renderTimeline();
            renderPreview();
            renderBitacoraList();
            showToast('🗑️ Reporte eliminado');
        });
    }

    function copyReport(reportId) {
        const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
        if (!bitacora) return;
        const r = bitacora.reports.find(x => x.id === reportId);
        if (!r) return;
        const text = `[#${r.hash}] ${formatDate(r.createdAt)}\nTags: ${r.tags.join(', ')}\n\n${r.content}`;
        navigator.clipboard.writeText(text).then(() => {
            showToast('📋 Reporte copiado al portapapeles', 'success');
        }).catch(() => {
            showToast('❌ No se pudo copiar', 'error');
        });
    }

    // ─── TAG SYSTEM ───────────────────────────────────────
    function toggleTag(btn) {
        const tag = btn.dataset.tag;
        btn.classList.toggle('selected');
        if (state.selectedTags.includes(tag)) {
            state.selectedTags = state.selectedTags.filter(t => t !== tag);
        } else {
            state.selectedTags.push(tag);
        }
        // Update visual state
        if (btn.classList.contains('selected')) {
            btn.style.background = 'rgba(212,175,55,0.2)';
            btn.style.borderColor = 'var(--arw-gold-primary)';
            btn.style.color = 'var(--arw-gold-bright)';
        } else {
            btn.style.background = 'var(--arw-bg-tertiary)';
            btn.style.borderColor = 'var(--arw-border-subtle)';
            btn.style.color = 'var(--arw-text-secondary)';
        }
    }

    // ─── RENDERING ───────────────────────────────────────
    function renderBitacoraList() {
        const list = $('arw-bitacoraList');
        if (!list) return;
        if (state.bitacoras.length === 0) {
            list.innerHTML = `<li style="padding:24px 20px;text-align:center;color:var(--arw-text-muted);font-size:0.82rem;">No hay bitácoras aún.<br>¡Crea la primera arriba!</li>`;
            return;
        }
        list.innerHTML = state.bitacoras.map(b => `
            <li class="arw-bitacora-item ${b.id === state.activeBitacoraId ? 'active' : ''}" data-id="${b.id}">
                <span class="arw-bitacora-icon">${b.icon}</span>
                <div class="arw-bitacora-info">
                    <div class="arw-bitacora-name">${escapeHtml(b.name)}</div>
                    <div class="arw-bitacora-meta">${b.reports.length} reporte${b.reports.length !== 1 ? 's' : ''} · ${timeAgo(b.createdAt)}</div>
                </div>
                <button class="arw-bitacora-delete" data-del="${b.id}" title="Eliminar" style="background:none;border:none;color:var(--arw-text-muted);cursor:pointer;padding:4px 8px;font-size:14px;opacity:0;transition:opacity 0.2s;">✕</button>
            </li>
        `).join('');
        // Bind clicks
        list.querySelectorAll('.arw-bitacora-item').forEach(item => {
            item.addEventListener('click', e => {
                if (e.target.closest('.arw-bitacora-delete')) return;
                selectBitacora(item.dataset.id);
            });
            item.addEventListener('mouseenter', () => {
                item.querySelector('.arw-bitacora-delete').style.opacity = '1';
            });
            item.addEventListener('mouseleave', () => {
                item.querySelector('.arw-bitacora-delete').style.opacity = '0';
            });
        });
        list.querySelectorAll('.arw-bitacora-delete').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                deleteBitacora(btn.dataset.del);
            });
        });
    }

    function showWelcome() {
        const welcome = $('arw-welcomeScreen');
        const editor = $('arw-editorPanel');
        const preview = $('arw-previewPanel');
        const breadcrumb = $('arw-breadcrumb');
        if (welcome) welcome.style.display = 'flex';
        if (editor) editor.style.display = 'none';
        if (preview) preview.style.display = 'none';
        if (breadcrumb) breadcrumb.innerHTML = '<span class="arw-breadcrumb-item">AgroRepo</span>';
    }

    function showEditor() {
        const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
        if (!bitacora) { showWelcome(); return; }
        const welcome = $('arw-welcomeScreen');
        const editor = $('arw-editorPanel');
        const preview = $('arw-previewPanel');
        const breadcrumb = $('arw-breadcrumb');
        if (welcome) welcome.style.display = 'none';
        if (editor) editor.style.display = 'flex';
        if (preview) preview.style.display = 'block';
        if (breadcrumb) {
            breadcrumb.innerHTML = `<span class="arw-breadcrumb-item">AgroRepo</span>
                <span style="color:var(--arw-text-muted);margin:0 8px;">›</span>
                <span class="arw-breadcrumb-current" style="color:var(--arw-gold-primary);">${bitacora.icon} ${escapeHtml(bitacora.name)}</span>`;
        }
        renderTimeline();
        renderPreview();
    }

    function renderTimeline() {
        const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
        const container = $('arw-commitsTimeline');
        const countEl = $('arw-commitsCount');
        if (!container || !bitacora) return;
        if (countEl) countEl.textContent = bitacora.reports.length;
        if (bitacora.reports.length === 0) {
            container.innerHTML = `<div class="arw-empty-state">
                <div class="arw-empty-state-icon">📋</div>
                <div class="arw-empty-state-title">Sin reportes aún</div>
                <div class="arw-empty-state-text">Escribe tu primer reporte de campo arriba</div>
            </div>`;
            return;
        }
        container.innerHTML = `<div class="arw-commit-timeline" style="position:relative;padding-left:20px;">
            ${bitacora.reports.map(r => `
                <div class="arw-commit-entry" style="position:relative;padding:14px;background:var(--arw-bg-tertiary);border-radius:var(--arw-radius-md);margin-bottom:12px;border:1px solid var(--arw-border-subtle);">
                    <div style="position:absolute;left:-26px;top:18px;width:12px;height:12px;background:var(--arw-gold-primary);border-radius:50%;border:2px solid var(--arw-bg-primary);"></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-family:monospace;font-size:11px;color:var(--arw-gold-muted);background:var(--arw-bg-elevated);padding:2px 8px;border-radius:4px;">#${r.hash}</span>
                        <span style="font-size:10px;color:var(--arw-text-muted);">${formatDate(r.createdAt)}</span>
                    </div>
                    <div style="font-size:13px;color:var(--arw-text-primary);line-height:1.6;margin-bottom:10px;">${renderMarkdown(escapeHtml(r.content))}</div>
                    ${r.tags?.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
                        ${r.tags.map(t => `<span style="font-size:10px;padding:3px 8px;background:rgba(212,175,55,0.1);border:1px solid var(--arw-border-gold);border-radius:12px;color:var(--arw-gold-muted);">${getTagLabel(t)}</span>`).join('')}
                    </div>` : ''}
                    <div style="display:flex;gap:8px;">
                        <button class="arw-action-copy" data-copy="${r.id}" style="background:none;border:1px solid var(--arw-border-subtle);color:var(--arw-text-secondary);padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;">📋 Copiar</button>
                        <button class="arw-action-del" data-del="${r.id}" style="background:none;border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;">🗑️ Eliminar</button>
                    </div>
                </div>
            `).join('')}
        </div>`;
        container.querySelectorAll('.arw-action-copy').forEach(btn => {
            btn.addEventListener('click', () => copyReport(btn.dataset.copy));
        });
        container.querySelectorAll('.arw-action-del').forEach(btn => {
            btn.addEventListener('click', () => deleteReport(btn.dataset.del));
        });
    }

    function renderPreview() {
        const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
        if (!bitacora) return;
        const pvStatTotal = $('arw-pvStatTotal');
        const pvStatDays = $('arw-pvStatDays');
        const pvInfoName = $('arw-pvInfoName');
        const pvInfoCreated = $('arw-pvInfoCreated');
        const pvInfoLast = $('arw-pvInfoLast');
        const pvTagStats = $('arw-pvTagStats');
        if (pvStatTotal) pvStatTotal.textContent = bitacora.reports.length;
        const uniqueDays = new Set(bitacora.reports.map(r => new Date(r.createdAt).toDateString()));
        if (pvStatDays) pvStatDays.textContent = uniqueDays.size;
        if (pvInfoName) pvInfoName.textContent = bitacora.name;
        if (pvInfoCreated) pvInfoCreated.textContent = formatDate(bitacora.createdAt);
        const lastR = bitacora.reports[0];
        if (pvInfoLast) pvInfoLast.textContent = lastR ? timeAgo(lastR.createdAt) : 'Sin reportes';
        // Tag distribution
        const tagCount = {};
        bitacora.reports.forEach(r => {
            (r.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
        });
        if (pvTagStats) {
            const entries = Object.entries(tagCount).sort((a, b) => b[1] - a[1]);
            if (entries.length === 0) {
                pvTagStats.innerHTML = '<p style="font-size:0.78rem;color:var(--arw-text-muted);">Sin datos aún</p>';
            } else {
                pvTagStats.innerHTML = entries.map(([tag, count]) => `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--arw-border-subtle);font-size:12px;">
                        <span style="color:var(--arw-text-secondary);">${getTagLabel(tag)}</span>
                        <span style="color:var(--arw-gold-primary);font-weight:600;">${count}</span>
                    </div>
                `).join('');
            }
        }
    }

    function updateStats() {
        const total = state.bitacoras.reduce((s, b) => s + b.reports.length, 0);
        const statBitacoras = $('arw-statBitacoras');
        const statReportes = $('arw-statReportes');
        const storageStatus = $('arw-storageStatus');
        if (statBitacoras) statBitacoras.textContent = state.bitacoras.length;
        if (statReportes) statReportes.textContent = total;
        if (storageStatus) storageStatus.textContent = `LocalStorage · ${getStorageSize()} · 100% Offline`;
    }

    // ─── EXPORT/IMPORT ────────────────────────────────────
    async function saveToFile() {
        const data = JSON.stringify({ bitacoras: state.bitacoras, exportedAt: new Date().toISOString(), version: '2.0.0' }, null, 2);
        const fileName = `agrorepo_backup_${new Date().toISOString().slice(0, 10)}.json`;
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{ description: 'AgroRepo Data', accept: { 'application/json': ['.json'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(data);
                await writable.close();
                state.lastSaved = new Date().toISOString();
                persist();
                showToast('💾 Datos guardados en disco', 'success');
                return;
            } catch (e) { if (e.name === 'AbortError') return; }
        }
        downloadBlob(data, fileName, 'application/json');
        showToast('💾 Archivo JSON descargado', 'success');
    }

    async function exportJSON() {
        if (state.bitacoras.length === 0) {
            showToast('⚠️ No hay datos para exportar', 'warning');
            return;
        }
        const data = JSON.stringify({
            exportedAt: new Date().toISOString(),
            version: '2.0.0',
            system: 'AgroRepo Ultimate | YavlGold',
            bitacoras: state.bitacoras
        }, null, 2);
        const fileName = `agrorepo_backup_${new Date().toISOString().slice(0, 10)}.json`;
        downloadBlob(data, fileName, 'application/json');
        showToast('📦 Backup JSON descargado', 'success');
    }

    async function exportMarkdown() {
        if (state.bitacoras.length === 0) {
            showToast('⚠️ No hay datos para exportar', 'warning');
            return;
        }
        let md = `# 🌾 AgroRepo Ultimate — Exportación Completa\n`;
        md += `**Fecha:** ${new Date().toLocaleString('es-VE')}\n`;
        md += `**Bitácoras:** ${state.bitacoras.length}\n\n---\n\n`;
        state.bitacoras.forEach(b => {
            md += `## ${b.icon} ${b.name}\n`;
            md += `*Creada: ${formatDate(b.createdAt)} · ${b.reports.length} reportes*\n\n`;
            b.reports.forEach(r => {
                md += `### \`#${r.hash}\` — ${formatDate(r.createdAt)}\n`;
                if (r.tags?.length) md += `**Tags:** ${r.tags.join(', ')}\n\n`;
                md += `${r.content}\n\n---\n\n`;
            });
        });
        const fileName = `agrorepo_export_${new Date().toISOString().slice(0, 10)}.md`;
        downloadBlob(md, fileName, 'text/markdown');
        showToast('📝 Exportación Markdown descargada', 'success');
    }

    function importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    const bitacoras = imported.bitacoras;
                    if (!bitacoras || !Array.isArray(bitacoras)) throw new Error('Formato inválido');
                    let added = 0;
                    bitacoras.forEach(ib => {
                        if (!state.bitacoras.some(b => b.id === ib.id)) {
                            state.bitacoras.push(ib);
                            added++;
                        }
                    });
                    persist();
                    renderBitacoraList();
                    showToast(`📂 Importadas ${added} bitácora${added !== 1 ? 's' : ''} nueva${added !== 1 ? 's' : ''}`, 'success');
                } catch (err) {
                    showToast('❌ Archivo no tiene formato AgroRepo válido', 'error');
                    console.error('[AgroRepo] Import error:', err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function downloadBlob(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ─── MOBILE SIDEBAR ──────────────────────────────────
    function toggleSidebar() {
        const sidebar = $('arw-sidebar');
        const backdrop = $('arw-sidebarBackdrop');
        sidebar?.classList.toggle('open');
        backdrop?.classList.toggle('show');
    }

    function closeSidebar() {
        const sidebar = $('arw-sidebar');
        const backdrop = $('arw-sidebarBackdrop');
        sidebar?.classList.remove('open');
        backdrop?.classList.remove('show');
    }

    // ─── EVENT BINDING ──────────────────────────────────
    function bindEvents() {
        // Create bitacora
        $('arw-btnCreateBitacora')?.addEventListener('click', createBitacora);
        $('arw-newBitacoraInput')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); createBitacora(); }
        });
        // Tags
        root?.querySelectorAll('.arw-tag-btn')?.forEach(btn => {
            btn.addEventListener('click', () => toggleTag(btn));
        });
        // Submit report
        $('arw-submitBtn')?.addEventListener('click', commitReport);
        // Mobile menu
        $('arw-menuToggle')?.addEventListener('click', toggleSidebar);
        $('arw-sidebarBackdrop')?.addEventListener('click', closeSidebar);
        // Header actions
        $('arw-btnOpenFile')?.addEventListener('click', importData);
        $('arw-btnExportJSON')?.addEventListener('click', exportJSON);
        $('arw-btnExportMD')?.addEventListener('click', exportMarkdown);
        $('arw-btnSaveFile')?.addEventListener('click', saveToFile);
        // Delete modal
        $('arw-deleteModalConfirm')?.addEventListener('click', () => {
            if (_deleteCallback) _deleteCallback();
            closeDeleteModal();
        });
        $('arw-deleteModalCancel')?.addEventListener('click', closeDeleteModal);
        $('arw-deleteModalClose')?.addEventListener('click', closeDeleteModal);
        $('arw-deleteModal')?.addEventListener('click', e => {
            if (e.target === e.currentTarget) closeDeleteModal();
        });
        // Keyboard shortcuts
        root?.addEventListener('keydown', e => {
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveToFile(); }
            if (e.ctrlKey && e.key === 'e') { e.preventDefault(); exportJSON(); }
            if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); commitReport(); }
            if (e.key === 'Escape') { closeDeleteModal(); closeSidebar(); }
        });
    }

    // ─── INIT ────────────────────────────────────────────
    function initWidget() {
        if (widgetInitialized) return;
        root = document.getElementById('agro-widget-root');
        if (!root) { console.error('[AgroRepo] Root not found'); return; }
        if (root.dataset.loaded === '1') { console.log('[AgroRepo] Already loaded'); return; }
        widgetInitialized = true;
        root.dataset.loaded = '1';
        console.log('[AgroRepo] 🌾 Initializing Ultimate Engine v2.0...');
        const template = document.getElementById('agro-repo-template');
        if (!template) { console.error('[AgroRepo] Template not found'); return; }
        root.innerHTML = '';
        root.appendChild(template.content.cloneNode(true));
        loadState();
        bindEvents();
        renderBitacoraList();
        updateStats();
        if (state.activeBitacoraId) {
            const exists = state.bitacoras.find(b => b.id === state.activeBitacoraId);
            if (exists) showEditor();
            else { state.activeBitacoraId = null; persist(); }
        }
        console.log('[AgroRepo] ✅ Widget initialized with', state.bitacoras.length, 'bitácoras');
    }

    // ─── ACCORDION LISTENER ──────────────────────────────
    function setupAccordionListener() {
        const accordion = document.getElementById('yg-acc-agrorepo');
        if (!accordion) { console.warn('[AgroRepo] Accordion not found'); return; }
        if (accordion.dataset.listenerBound === '1') return;
        accordion.dataset.listenerBound = '1';
        accordion.addEventListener('toggle', () => {
            if (accordion.open && !widgetInitialized) initWidget();
        });
        if (accordion.open) initWidget();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAccordionListener);
    } else {
        setupAccordionListener();
    }

    console.log('[AgroRepo] 📦 Ultimate Engine v2.0 loaded (lazy init on accordion open)');
})();





