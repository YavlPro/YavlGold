/**
 * YavlGold V9.4 - Módulo Agro - Supabase Integration
 * Conecta la UI con las tablas agro_crops y agro_roi_calculations
 */
import supabase from '../assets/js/config/supabase-config.js';
import { updateStats } from './agro-stats.js';
import { syncFactureroNotifications } from './agro-notifications.js';
import './agro.css';
import { openAgroWizard, ensureAgroWizardStyles } from './agro-wizard.js';
import { exportCropReport, resolveCropExistenceMap } from './agro-crop-report.js';
import { initAgroPerfil } from './agroperfil.js';
import { initAgroCompradores, openBuyerProfileByName } from './agrocompradores.js';
import { initAgroSocial, openSocialPanel } from './agrosocial.js';
import { initAgroCalculadora } from './agrocalculadora.js';
import { initClimaWeeklyEmbed } from './agroclima-layout.js';
import { formatCurrencyDisplay, SUPPORTED_CURRENCIES, initExchangeRates, getRate, convertToUSD, hasOverride, clearOverride } from './agro-exchange.js';
import { initCiclos } from './agrociclos.js';
import {
    BUYER_PRIVACY_CHANGE_EVENT,
    BUYER_PRIVACY_MASK,
    applyBuyerPrivacy,
    applyMoneyPrivacy,
    initBuyerPrivacy,
    readBuyerNamesHidden,
    readMoneyValuesHidden,
    setBuyerNamesHidden
} from './agro-privacy.js';

// ==============================
// CORE CRITICO — NO TOCAR
// Facturero / ciclos / historial
// (lógica + queries + UI deben permanecer idénticas)
// ==============================

// ==============================
// MODULARIZABLE (wrappers primero)
// stats, exports, perfiles, clima, calculadora, UI secundaria
// ==============================

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
let cropsRefreshThrottleTimer = null;
let cropsRefreshEventsBound = false;
const pendingTransferInFlightLocks = new Set();

const CROPS_LOADING_ID = 'agro-crops-loading';
const CROPS_EMPTY_ID = 'agro-crops-empty';
const AGRO_CROPS_READY_EVENT = 'AGRO_CROPS_READY';
const AGRO_CROPS_STATE_KEY = '__AGRO_CROPS_STATE';
const AGRO_SELECTED_CROP_KEY = 'YG_AGRO_SELECTED_CROP_V1';
const AGRO_FOCUS_MODE_KEY = 'YG_AGRO_FOCUS_MODE_V1';
const AGRO_FOCUS_TOGGLE_ID = 'agro-focus-toggle';
const AGRO_TOOLS_SECTION_ID = 'agro-tools-section';
const AGRO_TOOLS_ACCORDION_ID = 'yg-acc-tools';
const AGRO_TOOLS_BODY_SELECTOR = '[data-agro-tools-body]';
const AGRO_FOCUS_SNAPSHOT_TOOLS_KEY = '__agro_tools__';
const AGRO_GENERAL_VIEW_ID = '__general__';
const AGRO_GENERAL_LABEL = '📋 General';
const AGRO_GENERAL_SUBLABEL = 'Todos los movimientos';
const AGRO_CROPS_REFRESH_EVENT = 'agro:crops:refresh';
const AGRO_DEBUG = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('debug') === '1';
const AGRO_PENDING_TRANSFER_COLUMNS = 'id,user_id,concepto,monto,fecha,crop_id,unit_type,unit_qty,quantity_kg,transfer_state,transferred_to,transferred_to_id,transferred_income_id';
const AGRO_INCOME_TRANSFER_COLUMNS = 'id,user_id,concepto,monto,fecha,categoria,crop_id,unit_type,unit_qty,quantity_kg,origin_table,origin_id,transfer_state';
const AGRO_LOSS_TRANSFER_COLUMNS = 'id,user_id,concepto,monto,fecha,causa,crop_id,unit_type,unit_qty,quantity_kg,origin_table,origin_id,transfer_state';
const AGRO_INCOME_REVERT_COLUMNS = 'id,user_id,concepto,monto,fecha,categoria,crop_id,unit_type,unit_qty,quantity_kg,origin_table,origin_id,transfer_state,currency,exchange_rate,monto_usd,soporte_url,reverted_at,reverted_reason,split_meta';
const AGRO_LOSS_REVERT_COLUMNS = 'id,user_id,concepto,monto,fecha,causa,crop_id,unit_type,unit_qty,quantity_kg,origin_table,origin_id,transfer_state,currency,exchange_rate,monto_usd,evidence_url,reverted_at,reverted_reason,split_meta';
const AGRO_INCOME_LIST_COLUMNS = 'id,user_id,concepto,monto,fecha,categoria,crop_id,unit_type,unit_qty,quantity_kg,soporte_url,currency,exchange_rate,monto_usd,deleted_at,reverted_at,created_at';
const AGRO_FOCUS_PRIMARY_KEYS = ['agenda', 'activeCrops', 'ops'];
const AGRO_FOCUS_EXTRA_KEYS = ['lunar', 'markets', 'stats', 'roi', 'agroRepo'];
const AGRO_SOCIAL_OPEN_BUTTON_ID = 'btn-open-agro-social';
const BUYER_PROFILE_CLICKABLE_SCOPE_SELECTOR = [
    '#recent-transactions-container',
    '#income-recent-container',
    '#pending-history-container',
    '#loss-history-container',
    '#transfer-history-container',
    '#other-history-container',
    '#ops-rankings-panel'
].join(', ');
const CROP_DISPLAY_FALLBACK_ICON = '🌱';
const CROP_DISPLAY_FALLBACK_NAME = 'Cultivo';
const CROP_EMOJI_TOKEN_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
const CROP_TEXT_TOKEN_RE = /[\p{L}\p{N}]/u;

let selectedCropId = null;
let editExchangeRates = { USD: 1, COP: null, VES: null };
let syncAgendaCropsFn = null;
let syncCartCropsFn = null;
const agroFocusOriginalPositions = new Map();
let agroFocusModeBound = false;
let buyerProfileClickHandlersBound = false;
let agroSocialButtonBound = false;
const revertTransferInFlightLocks = new Set();

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

function getCropDisplayParts(crop, options = {}) {
    const fallbackIcon = normalizeCropIcon(options.fallbackIcon || CROP_DISPLAY_FALLBACK_ICON, CROP_DISPLAY_FALLBACK_ICON);
    const fallbackName = String(options.fallbackName || CROP_DISPLAY_FALLBACK_NAME).trim() || CROP_DISPLAY_FALLBACK_NAME;
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
    const icon = normalizeCropIcon(iconFromName || crop?.icon, fallbackIcon);
    const name = cleanedName || (rawName && leadingIcons.length === 0 ? rawName : fallbackName);

    return {
        icon,
        name,
        label: `${icon} ${name}`
    };
}

function syncLazyCropConsumers(nextCrops) {
    const safeCrops = Array.isArray(nextCrops) ? nextCrops : [];
    try {
        if (typeof syncAgendaCropsFn === 'function') {
            syncAgendaCropsFn(safeCrops);
        }
    } catch (err) {
        console.warn('[AGRO] Agenda crops sync error:', err?.message || err);
    }
    try {
        if (typeof syncCartCropsFn === 'function') {
            syncCartCropsFn(safeCrops);
        }
    } catch (err) {
        console.warn('[AGRO] Cart crops sync error:', err?.message || err);
    }
}

function setElementHiddenInert(element, shouldHide) {
    if (!element) return;
    element.hidden = !!shouldHide;
    if (shouldHide) {
        element.setAttribute('inert', '');
    } else {
        element.removeAttribute('inert');
    }
}

function getAgroFocusMode() {
    try {
        return localStorage.getItem(AGRO_FOCUS_MODE_KEY) === '1';
    } catch (err) {
        return false;
    }
}

function setAgroFocusMode(value) {
    try {
        localStorage.setItem(AGRO_FOCUS_MODE_KEY, value ? '1' : '0');
    } catch (err) {
        // Ignore storage errors
    }
}

function ensureAgroFocusModeDefault() {
    try {
        const current = localStorage.getItem(AGRO_FOCUS_MODE_KEY);
        if (current !== '1' && current !== '0') {
            localStorage.setItem(AGRO_FOCUS_MODE_KEY, '0');
        }
    } catch (err) {
        // Ignore storage errors
    }
}

function getAgroSectionElement(sectionKey) {
    return document.querySelector(`[data-agro-section="${sectionKey}"]`);
}

function rememberAgroOriginalPosition(sectionKey, element) {
    if (!sectionKey || !element || agroFocusOriginalPositions.has(sectionKey)) return;
    agroFocusOriginalPositions.set(sectionKey, {
        element,
        parent: element.parentNode,
        nextSibling: element.nextSibling
    });
}

function captureAgroFocusOriginalLayout() {
    if (agroFocusOriginalPositions.size > 0) return;

    const sectionNodes = Array.from(document.querySelectorAll('[data-agro-section]'));
    sectionNodes.forEach((node) => {
        const key = node?.dataset?.agroSection;
        if (!key) return;
        rememberAgroOriginalPosition(key, node);
    });

    const toolsSection = document.getElementById(AGRO_TOOLS_SECTION_ID);
    if (toolsSection) {
        rememberAgroOriginalPosition(AGRO_FOCUS_SNAPSHOT_TOOLS_KEY, toolsSection);
    }
}

function restoreAgroSection(sectionKey) {
    const snapshot = agroFocusOriginalPositions.get(sectionKey);
    if (!snapshot) return;

    const { element, parent, nextSibling } = snapshot;
    if (!element || !parent) return;

    if (nextSibling && nextSibling.parentNode === parent) {
        parent.insertBefore(element, nextSibling);
    } else {
        parent.appendChild(element);
    }

    setElementHiddenInert(element, false);
}

function getAgroToolsElements() {
    const toolsSection = document.getElementById(AGRO_TOOLS_SECTION_ID);
    if (!toolsSection) return null;
    const toolsBody = toolsSection.querySelector(AGRO_TOOLS_BODY_SELECTOR);
    if (!toolsBody) return null;
    const toolsAccordion = document.getElementById(AGRO_TOOLS_ACCORDION_ID) || toolsSection.querySelector('details.yg-accordion');
    return { toolsSection, toolsBody, toolsAccordion };
}

function updateAgroToolsTitle(toolsSection, toolsBody) {
    if (!toolsSection || !toolsBody) return;
    const titleEl = toolsSection.querySelector('.yg-accordion-title');
    if (!titleEl) return;
    const count = toolsBody.children.length;
    titleEl.textContent = `Herramientas (${count})`;
}

function updateAgroFocusToggleUI(isOn) {
    const toggle = document.getElementById(AGRO_FOCUS_TOGGLE_ID);
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    toggle.textContent = isOn ? '\uD83E\uDDE0 Modo Enfoque: ON' : '\uD83E\uDDE0 Modo Enfoque: OFF';
}

function reorderAgroPrimarySectionsForFocus() {
    const agenda = getAgroSectionElement('agenda');
    if (!agenda || !agenda.parentNode) return;

    const parent = agenda.parentNode;
    let anchor = agenda;

    AGRO_FOCUS_PRIMARY_KEYS
        .filter((key) => key !== 'agenda')
        .forEach((key) => {
            const section = getAgroSectionElement(key);
            if (!section) return;
            if (anchor.nextSibling === section && section.parentNode === parent) {
                anchor = section;
                return;
            }
            parent.insertBefore(section, anchor.nextSibling);
            anchor = section;
        });
}

function restoreAgroFullLayout() {
    for (const [sectionKey] of agroFocusOriginalPositions) {
        if (sectionKey === AGRO_FOCUS_SNAPSHOT_TOOLS_KEY) continue;
        restoreAgroSection(sectionKey);
    }
}

function applyAgroFocusMode(isOn) {
    captureAgroFocusOriginalLayout();
    updateAgroFocusToggleUI(isOn);

    const tools = getAgroToolsElements();
    if (!tools) return;

    const { toolsSection, toolsBody, toolsAccordion } = tools;

    if (isOn) {
        reorderAgroPrimarySectionsForFocus();

        AGRO_FOCUS_EXTRA_KEYS.forEach((sectionKey) => {
            const element = getAgroSectionElement(sectionKey);
            if (!element || element.parentNode === toolsBody) return;
            toolsBody.appendChild(element);
            setElementHiddenInert(element, false);
        });

        AGRO_FOCUS_PRIMARY_KEYS.forEach((sectionKey) => {
            setElementHiddenInert(getAgroSectionElement(sectionKey), false);
        });
        setElementHiddenInert(getAgroSectionElement('assistant'), false);

        const hasTools = toolsBody.children.length > 0;
        setElementHiddenInert(toolsSection, !hasTools);
        if (toolsAccordion && hasTools) toolsAccordion.open = false;
    } else {
        restoreAgroFullLayout();
        setElementHiddenInert(toolsSection, true);
        if (toolsAccordion) toolsAccordion.open = false;
    }

    updateAgroToolsTitle(toolsSection, toolsBody);
    console.info(`[AGRO] Focus mode ${isOn ? 'enabled' : 'disabled'}`);
}

function initAgroFocusMode() {
    if (agroFocusModeBound) return;

    captureAgroFocusOriginalLayout();
    ensureAgroFocusModeDefault();

    const toggle = document.getElementById(AGRO_FOCUS_TOGGLE_ID);
    if (!toggle) return;

    agroFocusModeBound = true;
    toggle.addEventListener('click', () => {
        const next = !getAgroFocusMode();
        setAgroFocusMode(next);
        applyAgroFocusMode(next);
    });

    applyAgroFocusMode(getAgroFocusMode());
}

function normalizeCropId(value) {
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    return str ? str : null;
}

function readSelectedCropId() {
    try {
        const primary = normalizeCropId(localStorage.getItem(AGRO_SELECTED_CROP_KEY));
        if (primary) return primary;
        return normalizeCropId(localStorage.getItem('selectedCropId'));
    } catch (e) {
        return null;
    }
}

function writeSelectedCropId(value) {
    try {
        if (!value) {
            localStorage.removeItem(AGRO_SELECTED_CROP_KEY);
            localStorage.removeItem('selectedCropId');
        } else {
            localStorage.setItem(AGRO_SELECTED_CROP_KEY, String(value));
            localStorage.setItem('selectedCropId', String(value));
        }
    } catch (e) {
        // Ignore storage errors
    }
}

function applySelectedCropUI() {
    const cards = document.querySelectorAll('.crop-card');
    if (!cards.length) return;
    cards.forEach((card) => {
        card.classList.remove('is-selected');
        card.removeAttribute('aria-pressed');
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
        nextId = null;
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
            .select('id, name, variety, icon')
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
                const displayCrop = getCropDisplayParts(crop);
                const option = document.createElement('option');
                option.value = crop.id;
                option.textContent = crop.variety
                    ? `${displayCrop.label} (${crop.variety})`
                    : displayCrop.label;
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
        extraFields: ['category', 'currency', 'exchange_rate', 'monto_usd', 'crop_id', 'evidence_url', 'type'],
        editUiFields: ['unit_type', 'unit_qty', 'quantity_kg'],
        hiddenEditFields: ['category', 'currency', 'exchange_rate', 'monto_usd', 'crop_id', 'type', 'evidence_url', 'user_id', 'created_at', 'deleted_at'],
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
    },
    'otros': {
        table: null,
        containerId: 'other-history-container',
        listId: 'other-history-list',
        conceptField: 'concepto',
        amountField: 'monto',
        dateField: 'fecha',
        extraFields: ['source_label'],
        supportsDeletedAt: false,
        compositeOnly: true
    }
};

const FACTURERO_OTHER_SOURCE_TABS = ['gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias'];
const FACTURERO_HISTORY_FETCH_LIMIT = 200;
const FACTURERO_OTHER_FETCH_LIMIT = FACTURERO_HISTORY_FETCH_LIMIT;
const FACTURERO_OTHER_RENDER_LIMIT = FACTURERO_HISTORY_FETCH_LIMIT;

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

const FACTURERO_OPTIONAL_FIELDS_DISABLED = {
    pendientes: new Set(),
    ingresos: new Set(),
    perdidas: new Set()
};

const FACTURERO_SPLIT_FIELDS = ['split_from_id', 'split_meta'];
const FACTURERO_SPLIT_FIELDS_SUPPORT = {
    gastos: null,
    ingresos: null,
    pendientes: null,
    perdidas: null,
    transferencias: null
};

const PENDING_TRANSFER_FILTER_KEY = 'YG_PENDING_SHOW_TRANSFERRED_V1';
const PENDING_REVERTED_FILTER_KEY = 'YG_PENDING_SHOW_REVERTED_V1';
const OTHER_TRANSFER_FILTER_KEY = 'YG_OTHER_SHOW_TRANSFERRED_V1';
const OTHER_REVERTED_FILTER_KEY = 'YG_OTHER_SHOW_REVERTED_V1';
const OTHER_TRANSFER_HISTORY_KEY = 'YG_OTHER_TRANSFER_HISTORY_V1';
const OTHER_TRANSFER_HISTORY_LIMIT = 200;

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
    transferencias: { label: 'Beneficiario', icon: '🎁', field: 'destino' },
    perdidas: { label: 'Causa/Responsable', icon: '⚠️', field: 'causa' }
};

const INCOME_UNIT_OPTIONS = [
    { value: '', label: 'Seleccionar...' },
    { value: 'saco', label: 'Saco', singular: 'saco', plural: 'sacos' },
    { value: 'cesta', label: 'Cesta', singular: 'cesta', plural: 'cestas' },
    { value: 'kg', label: 'Kg', singular: 'kg', plural: 'kg' }
];

const FACTURERO_EXTRA_FIELD_META = {
    evidence_url: {
        label: 'Evidencia (URL)',
        type: 'url',
        placeholder: 'https://...'
    },
    soporte_url: {
        label: 'Evidencia (URL)',
        type: 'url',
        placeholder: 'https://...'
    },
    categoria: {
        label: 'Categoria'
    },
    category: {
        label: 'Categoria'
    },
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
    const qtyText = formatUnitQty(unitQty);
    if (!qtyText) return '';
    if (!unitKey) {
        const qtyNum = Number(qtyText);
        const genericLabel = Number.isFinite(qtyNum) && Math.abs(qtyNum - 1) < 1e-9 ? 'unidad' : 'unidades';
        return `${qtyText} ${genericLabel}`;
    }
    const option = INCOME_UNIT_OPTIONS.find((opt) => opt.value === unitKey);
    // V9.8.1: fallback para unit_type legacy/desconocido — muestra qty + tipo raw
    if (!option) return `${qtyText} ${unitKey}`;
    const label = Number(qtyText) === 1 ? option.singular : option.plural;
    return `${qtyText} ${label}`;
}

function formatKgSummary(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return '';
    const text = num % 1 === 0 ? String(num) : num.toFixed(2);
    return `${text} kg`;
}

/**
 * V9.8.1: Helper para resolver cantidad (qty + unitType) de un pending con fallbacks.
 * Prioridad: unit_qty/unit_type del item > split_meta.qty_total/unit_type
 * @param {object} pending - Registro de agro_pending o agro_income
 * @param {object|null} splitMetaParsed - split_meta ya parseado (opcional)
 * @returns {{ qtyTotal: number|null, unitType: string, hasQty: boolean }}
 */
function resolvePendingQuantity(pending, splitMetaParsed) {
    try {
        const unitQty = toSafeLocaleNumber(pending?.unit_qty);
        const unitType = String(pending?.unit_type || '').trim().toLowerCase();
        if (unitQty !== null && unitQty > 0) {
            return { qtyTotal: unitQty, unitType, hasQty: true };
        }
        // Fallback: split_meta.qty_total
        const meta = splitMetaParsed || normalizeSplitMeta(pending?.split_meta);
        if (meta && meta.qty_total !== null && meta.qty_total > 0) {
            return {
                qtyTotal: meta.qty_total,
                unitType: meta.unit_type || unitType,
                hasQty: true
            };
        }
        // Fallback: quantity_kg
        const kgQty = toSafeLocaleNumber(pending?.quantity_kg);
        if (kgQty !== null && kgQty > 0) {
            return { qtyTotal: kgQty, unitType: 'kg', hasQty: true };
        }
        return { qtyTotal: null, unitType, hasQty: false };
    } catch (_e) {
        return { qtyTotal: null, unitType: '', hasQty: false };
    }
}

function parseExpenseConceptUnitMeta(concept) {
    const raw = String(concept || '').trim();
    if (!raw) {
        return { concept: '', unit_type: '', unit_qty: '', quantity_kg: '' };
    }

    const parts = raw.split('·').map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 1) {
        return { concept: raw, unit_type: '', unit_qty: '', quantity_kg: '' };
    }

    let baseConcept = parts[0];
    let unitType = '';
    let unitQty = '';
    let quantityKg = '';

    for (let i = 1; i < parts.length; i += 1) {
        const part = parts[i];
        const kgMatch = part.match(/^(-?\d+(?:[.,]\d+)?)\s*kg$/i);
        if (kgMatch) {
            const parsedKg = toSafeLocaleNumber(kgMatch[1]);
            if (parsedKg !== null && parsedKg > 0) {
                quantityKg = formatUnitQty(parsedKg);
                continue;
            }
        }

        const unitMatch = part.match(/^(-?\d+(?:[.,]\d+)?)\s+(.+)$/);
        if (unitMatch) {
            const parsedQty = toSafeLocaleNumber(unitMatch[1]);
            const labelRaw = String(unitMatch[2] || '').trim().toLowerCase();
            const option = INCOME_UNIT_OPTIONS.find((opt) => {
                if (!opt?.value) return false;
                const singular = String(opt.singular || '').trim().toLowerCase();
                const plural = String(opt.plural || '').trim().toLowerCase();
                return opt.value === labelRaw || singular === labelRaw || plural === labelRaw;
            });
            if (option && parsedQty !== null && parsedQty > 0) {
                unitType = option.value;
                unitQty = formatUnitQty(parsedQty);
                continue;
            }
        }

        baseConcept = `${baseConcept} · ${part}`.trim();
    }

    return {
        concept: baseConcept,
        unit_type: unitType,
        unit_qty: unitQty,
        quantity_kg: quantityKg
    };
}

function buildExpenseConceptWithUnitMeta(baseConcept, unitTypeRaw, unitQtyRaw, quantityKgRaw) {
    const cleanBase = String(baseConcept || '').trim();
    const parts = cleanBase ? [cleanBase] : [];

    const unitType = String(unitTypeRaw || '').trim().toLowerCase();
    const unitQty = toSafeLocaleNumber(unitQtyRaw);
    if (unitType && unitQty !== null && unitQty > 0) {
        const option = INCOME_UNIT_OPTIONS.find((opt) => opt?.value === unitType);
        const qtyText = formatUnitQty(unitQty);
        const label = option
            ? (unitQty === 1 ? option.singular : option.plural)
            : unitType;
        if (qtyText && label) {
            parts.push(`${qtyText} ${label}`);
        }
    }

    const kgValue = toSafeLocaleNumber(quantityKgRaw);
    if (kgValue !== null && kgValue > 0) {
        const kgText = formatKgSummary(kgValue);
        if (kgText) parts.push(kgText);
    }

    return parts.join(' · ').trim();
}

function getFactureroEditFields(config, whoField = null) {
    const sourceFields = Array.isArray(config?.editUiFields) ? config.editUiFields : (config?.extraFields || []);
    const hidden = new Set(Array.isArray(config?.hiddenEditFields) ? config.hiddenEditFields : []);
    return sourceFields
        .map((field) => String(field || '').trim())
        .filter((field) => !!field && field !== whoField && !hidden.has(field));
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
        const match = text.match(/^(.*?)\s+-\s+(?:Beneficiario|Destino):\s*(.+)$/i);
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
        return `${safeConcept} - Beneficiario: ${who}`;
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
    const incomeFallback = tabName === 'ingresos'
        ? (item?.comprador || item?.cliente || '')
        : '';
    const who = fieldValue || parsed.who || incomeFallback || '';
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

function markBuyerNameNode(node, buyerName) {
    if (!node) return;
    const raw = String(buyerName || '').trim();
    if (!raw) return;
    node.dataset.buyerName = '1';
    node.dataset.rawName = raw;
}

function markMoneyNode(node, rawMoneyText = '') {
    if (!node) return;
    const raw = String(rawMoneyText || node.textContent || '').trim();
    if (!raw) return;
    node.dataset.money = '1';
    node.dataset.rawMoney = raw;
}

function initBuyerProfileClickHandlers() {
    if (buyerProfileClickHandlersBound) return;
    buyerProfileClickHandlersBound = true;

    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;

        const nameNode = target.closest('[data-buyer-name="1"]');
        if (!nameNode) return;

        const scopedRoot = nameNode.closest(BUYER_PROFILE_CLICKABLE_SCOPE_SELECTOR);
        if (!scopedRoot) return;

        const rawName = String(nameNode.dataset.rawName || '').trim();
        if (!rawName || rawName === BUYER_PRIVACY_MASK) return;

        if (readBuyerNamesHidden()) {
            showEvidenceToast('Desactiva 👁 para abrir ficha del comprador.', 'warning');
            return;
        }

        event.preventDefault();
        openBuyerProfileByName(rawName).catch((error) => {
            console.error('[AGRO_BUYERS] open from click error:', error);
            showEvidenceToast('No se pudo abrir la ficha del comprador.', 'warning');
        });
    });
}

function bindAgroSocialOpenButton() {
    if (agroSocialButtonBound) return;
    const openButton = document.getElementById(AGRO_SOCIAL_OPEN_BUTTON_ID);
    if (!openButton) return;

    agroSocialButtonBound = true;
    openButton.addEventListener('click', (event) => {
        event.preventDefault();
        openSocialPanel(event.currentTarget).catch((error) => {
            console.error('[AGRO_SOCIAL] open panel error:', error);
            showEvidenceToast('No se pudo abrir el panel Social.', 'warning');
        });
    });
}

function isMissingColumnError(error, column) {
    if (!error || !column) return false;
    const code = (error.code || '').toString();
    const msg = (error.message || '').toLowerCase();
    const details = (error.details || '').toLowerCase();
    const text = `${msg} ${details}`;
    const col = column.toLowerCase();
    const hasMissingPhrase = text.includes('does not exist') || text.includes('could not find') || text.includes('not found');
    const mentionsColumn = text.includes(col)
        || text.includes(`"${col}"`)
        || text.includes(`'${col}'`)
        || text.includes(`.${col}`);
    if (code === '42703') return hasMissingPhrase && text.includes('column') && mentionsColumn;
    if (code === 'PGRST204') return hasMissingPhrase && text.includes('column') && mentionsColumn;
    if (!hasMissingPhrase) return false;
    return text.includes('column') && mentionsColumn;
}

async function insertRowWithMissingColumnFallback(tableName, payload, optionalFields = []) {
    const table = String(tableName || '').trim();
    if (!table) return { error: new Error('tableName requerido') };

    const optional = Array.isArray(optionalFields)
        ? optionalFields.map((field) => String(field || '').trim()).filter(Boolean)
        : [];
    const knownMissing = getTableMissingColumns(table);
    let workingPayload = { ...(payload || {}) };

    if (optional.length && knownMissing instanceof Set && knownMissing.size > 0) {
        optional.forEach((field) => {
            if (knownMissing.has(field)) {
                delete workingPayload[field];
            }
        });
    }

    let lastError = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const { error } = await supabase.from(table).insert(workingPayload);
        if (!error) return { error: null };
        lastError = error;

        let removedAny = false;
        const nextPayload = { ...workingPayload };

        optional.forEach((field) => {
            if (!Object.prototype.hasOwnProperty.call(nextPayload, field)) return;
            if (!isMissingColumnError(error, field)) return;
            delete nextPayload[field];
            rememberMissingColumn(table, field);
            removedAny = true;
        });

        if (!removedAny) return { error };
        workingPayload = nextPayload;
    }

    return { error: lastError || new Error(`No se pudo insertar en ${table}`) };
}

async function selectSingleWithMissingColumnFallback(tableName, fields, eqFilters = {}) {
    const table = String(tableName || '').trim();
    if (!table) return { data: null, error: new Error('tableName requerido') };

    const missingColumns = getTableMissingColumns(table);
    let selectFields = (Array.isArray(fields) ? fields : String(fields || '').split(','))
        .map((field) => String(field || '').trim())
        .filter((field) => field && !missingColumns.has(field));

    let lastError = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
        if (!selectFields.length) {
            return { data: null, error: new Error(`Sin columnas disponibles para consultar ${table}`) };
        }

        let query = supabase
            .from(table)
            .select(selectFields.join(','))
            .limit(1);

        Object.entries(eqFilters || {}).forEach(([key, value]) => {
            const field = String(key || '').trim();
            if (!field) return;
            query = query.eq(field, value);
        });

        const { data, error } = await query.single();
        if (!error) return { data, error: null };
        lastError = error;

        let removedAny = false;
        selectFields = selectFields.filter((field) => {
            if (!isMissingColumnError(error, field)) return true;
            rememberMissingColumn(table, field);
            removedAny = true;
            return false;
        });

        if (!removedAny) return { data: null, error };
    }

    return { data: null, error: lastError || new Error(`No se pudo consultar ${table}`) };
}

function isPendingTransferred(item) {
    if (!item) return false;
    if (item.transfer_state === 'reverted' || item.reverted_at) return false;
    // V9.7: Use transfer_state for accurate detection
    if (item.transfer_state === 'transferred') return true;
    // Legacy fallback for data without transfer_state
    return !!(item.transferred_at || item.transferred_income_id);
}

// V9.7: Check if a pending item was transferred but then reverted (back to active)
function isPendingReverted(item) {
    if (!item) return false;
    return item.transfer_state === 'reverted' || !!item.reverted_at || !!item.reverted_reason;
}

// V9.7: Check if income/loss originated from a pending transfer
function isFromPendingTransfer(item) {
    if (!item) return false;
    return item.origin_table === 'agro_pending' && !!item.origin_id;
}

// V9.7: Check if income/loss was reverted back to pending
function isIncomeOrLossReverted(item) {
    if (!item) return false;
    return item.transfer_state === 'reverted' || !!item.reverted_at || !!item.reverted_reason;
}

function readPendingTransferFilter() {
    try {
        return localStorage.getItem(PENDING_TRANSFER_FILTER_KEY) === '1';
    } catch (e) {
        return false;
    }
}

function readPendingRevertedFilter() {
    try {
        return localStorage.getItem(PENDING_REVERTED_FILTER_KEY) === '1';
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

function writePendingRevertedFilter(value) {
    try {
        localStorage.setItem(PENDING_REVERTED_FILTER_KEY, value ? '1' : '0');
    } catch (e) {
        // Ignore storage errors
    }
}

function readOtherTransferFilter() {
    try {
        return localStorage.getItem(OTHER_TRANSFER_FILTER_KEY) === '1';
    } catch (e) {
        return false;
    }
}

function readOtherRevertedFilter() {
    try {
        return localStorage.getItem(OTHER_REVERTED_FILTER_KEY) === '1';
    } catch (e) {
        return false;
    }
}

function writeOtherTransferFilter(value) {
    try {
        localStorage.setItem(OTHER_TRANSFER_FILTER_KEY, value ? '1' : '0');
    } catch (e) {
        // Ignore storage errors
    }
}

function writeOtherRevertedFilter(value) {
    try {
        localStorage.setItem(OTHER_REVERTED_FILTER_KEY, value ? '1' : '0');
    } catch (e) {
        // Ignore storage errors
    }
}

function readOtherTransferHistory() {
    try {
        const raw = localStorage.getItem(OTHER_TRANSFER_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((entry) => entry && entry.source_tab && entry.source_id);
    } catch (e) {
        return [];
    }
}

function writeOtherTransferHistory(entries) {
    try {
        const safe = Array.isArray(entries) ? entries.slice(0, OTHER_TRANSFER_HISTORY_LIMIT) : [];
        localStorage.setItem(OTHER_TRANSFER_HISTORY_KEY, JSON.stringify(safe));
    } catch (e) {
        // Ignore storage errors
    }
}

function getOtherTransferKey(sourceTab, sourceId) {
    return `${String(sourceTab || '').trim()}:${String(sourceId || '').trim()}`;
}

function upsertOtherTransferHistoryEntry(entry) {
    if (!entry?.source_tab || !entry?.source_id) return;
    const rows = readOtherTransferHistory();
    const key = getOtherTransferKey(entry.source_tab, entry.source_id);
    const next = [entry];
    for (const row of rows) {
        if (getOtherTransferKey(row.source_tab, row.source_id) === key) continue;
        next.push(row);
        if (next.length >= OTHER_TRANSFER_HISTORY_LIMIT) break;
    }
    writeOtherTransferHistory(next);
}

function getOtherTransferHistoryMap() {
    const map = new Map();
    const rows = readOtherTransferHistory();
    rows.forEach((entry) => {
        const key = getOtherTransferKey(entry.source_tab, entry.source_id);
        if (!map.has(key)) {
            map.set(key, entry);
        }
    });
    return map;
}

function isOtherTransferredRecord(item) {
    if (!item) return false;
    if (isOtherRevertedRecord(item)) return false;
    if (item.other_transfer_state === 'transferred') return true;
    if (item.source_tab === 'pendientes') return isPendingTransferred(item);
    return false;
}

function isOtherRevertedRecord(item) {
    if (!item) return false;
    if (item.source_tab === 'pendientes') return isPendingReverted(item);
    return item.transfer_state === 'reverted' || !!item.reverted_at || !!item.reverted_reason;
}

function formatOtherTransferMeta(item) {
    if (!isOtherTransferredRecord(item)) return '';
    const target = item?.other_transfer_target_name || item?.other_transfer_target_id || 'Cultivo';
    const movedAtRaw = item?.other_transfer_moved_at || '';
    if (!movedAtRaw) return `Transferido → ${target}`;
    try {
        const date = new Date(movedAtRaw);
        if (Number.isNaN(date.getTime())) return `Transferido → ${target}`;
        const stamp = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        return `Transferido → ${target} (${stamp})`;
    } catch (e) {
        return `Transferido → ${target}`;
    }
}

function formatTransferMeta(item) {
    if (!item) return 'Transferido';

    // V9.7: Show destination and status
    const dest = item.transferred_to;
    let destLabel = '';
    if (dest === 'income') {
        destLabel = 'Pagados';
    } else if (dest === 'losses') {
        destLabel = 'Pérdidas (Cancelado)';
    } else {
        destLabel = 'Pagados'; // Legacy fallback
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
    return `<span class="transfer-badge transfer-badge-origin">Transferido desde Fiados • ${statusLabel}</span>`;
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
        return { success: false, error: fetchError?.message || 'Fiado no encontrado' };
    }

    // 2. Check idempotency - already transferred and not reverted?
    if (pending.transfer_state === 'transferred') {
        console.info('[V9.7] Pending already transferred, idempotent return');
        return { success: true, incomeId: pending.transferred_income_id, message: 'Ya transferido' };
    }

    // 3. Create income record
    const incomeMoney = buildIncomeMonetaryFields(pending, pending.monto);
    const incomeData = {
        user_id: userId,
        concepto: pending.concepto,
        monto: incomeMoney.monto,
        fecha: pending.fecha,
        categoria: 'venta',
        crop_id: pending.crop_id,
        unit_type: pending.unit_type,
        unit_qty: pending.unit_qty,
        quantity_kg: pending.quantity_kg,
        currency: incomeMoney.currency,
        exchange_rate: incomeMoney.exchange_rate,
        monto_usd: incomeMoney.monto_usd,
        // V9.7: Transfer origin tracking
        origin_table: 'agro_pending',
        origin_id: pending.id,
        transfer_state: 'active'
    };

    let { data: income, error: insertError } = await supabase
        .from('agro_income')
        .insert([incomeData])
        .select('id')
        .single();

    if (insertError && (isMissingColumnError(insertError, 'currency') || isMissingColumnError(insertError, 'exchange_rate') || isMissingColumnError(insertError, 'monto_usd'))) {
        const fallbackIncomeData = { ...incomeData };
        delete fallbackIncomeData.currency;
        delete fallbackIncomeData.exchange_rate;
        delete fallbackIncomeData.monto_usd;
        const fallbackInsert = await supabase
            .from('agro_income')
            .insert([fallbackIncomeData])
            .select('id')
            .single();
        income = fallbackInsert.data;
        insertError = fallbackInsert.error;
    }

    if (insertError || !income) {
        return { success: false, error: insertError?.message || 'Error creando pagado' };
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
        return { success: false, error: fetchError?.message || 'Fiado no encontrado' };
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
        causa: 'Fiado cancelado',
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

function getRevertSourceLabel(sourceTab) {
    return sourceTab === 'ingresos' ? 'Pagados' : 'Pérdidas';
}

function getRevertFromState(sourceTab) {
    return sourceTab === 'ingresos' ? 'pagados' : 'perdidas';
}

async function fetchRevertSourceRecord(sourceTable, sourceId, userId, selectColumns) {
    const fields = String(selectColumns || '')
        .split(',')
        .map((field) => String(field || '').trim())
        .filter(Boolean);

    const { data, error } = await selectSingleWithMissingColumnFallback(sourceTable, fields, {
        id: sourceId,
        user_id: userId
    });
    if (error || !data) {
        return { data: null, error: error || new Error('Registro no encontrado') };
    }
    return { data, error: null };
}

async function openRevertToPendingWizard(sourceTab, sourceRow) {
    const sourceLabel = getRevertSourceLabel(sourceTab);
    const sourceAmount = toSafeLocaleNumber(sourceRow?.monto) ?? 0;
    if (!(sourceAmount > 0)) {
        notifyFacturero('⚠️ El monto del registro origen no es válido para revertir.', 'warning');
        return null;
    }

    const sourceCurrency = normalizeMoneyCurrency(sourceRow?.currency) || 'COP';
    const sourceQtyResolved = resolvePendingQuantity(sourceRow);
    const splitDraftBase = computePendingSplitDraft(sourceRow, 'income');
    const splitUnitType = String(splitDraftBase.unitType || sourceQtyResolved.unitType || sourceRow?.unit_type || 'unidad').trim().toLowerCase();
    const splitQtyTotal = toSafeLocaleNumber(splitDraftBase.qtyTotal ?? sourceQtyResolved.qtyTotal);
    const needsQtyTotalInput = !!splitUnitType && (splitQtyTotal === null || splitQtyTotal < 1);

    const whoData = getWhoData(sourceTab, sourceRow, sourceRow?.concepto || '');
    const detailRows = [
        { label: 'Concepto', value: sourceRow?.concepto || 'Sin concepto' },
        { label: `Total en ${sourceLabel}`, value: fmtMoneyUI(sourceAmount, sourceCurrency) },
        { label: 'Fecha original', value: sourceRow?.fecha || 'N/A' }
    ];
    if (whoData?.who) {
        detailRows.push({ label: 'Cliente', value: whoData.who });
    }

    const splitConfig = {
        enabled: true,
        qtyTotal: splitQtyTotal,
        defaultQty: splitQtyTotal || 1,
        requireQtyTotal: needsQtyTotalInput,
        forceQtyTotalInput: true,
        forceTransferQtyInput: true,
        unitType: splitUnitType,
        originLabel: sourceLabel,
        destinationLabel: 'Fiados',
        showTransferTotal: true,
        defaultTransferTotal: sourceAmount,
        transferTotalLabel: 'Monto total a devolver',
        currencyLabel: sourceCurrency,
        originalTransferTotal: sourceAmount,
        originalTransferTotalLabel: `Total en ${sourceLabel} (referencia)`,
        sourceAmount
    };

    const decision = await openTransferMetaModal({
        title: `Devolver ${sourceLabel} a Fiados`,
        stepIndex: 1,
        stepTotal: 2,
        stepLabel: 'Detalles',
        rows: detailRows,
        showConcept: true,
        conceptLabel: 'Motivo de devolución (opcional)',
        defaultConcept: '',
        showCategory: false,
        showDate: true,
        dateLabel: 'Fecha de devolución',
        defaultDate: getTodayLocalISO(),
        confirmText: 'Siguiente',
        confirmVariant: 'next',
        split: splitConfig
    });
    if (!decision?.confirmed) return null;

    const decisionDate = decision.date || getTodayLocalISO();
    const dateCheck = assertDateNotFuture(decisionDate, 'Fecha');
    if (!dateCheck.valid) {
        notifyFacturero(`⚠️ ${dateCheck.error}`, 'warning');
        return null;
    }

    const splitDraft = computePendingSplitDraft(sourceRow, 'income', decision);
    if (splitDraft.error) {
        notifyFacturero(`⚠️ ${splitDraft.error}`, 'warning');
        return null;
    }

    const movedQtyText = formatSplitQuantity(splitDraft.transferUnitQty ?? splitDraft.qtyTransfer, splitDraft.unitType || splitUnitType);
    const leftQtyText = formatSplitQuantity(splitDraft.remainingUnitQty ?? splitDraft.qtyLeft, splitDraft.unitType || splitUnitType);
    const summaryRows = [
        { label: 'Origen', value: sourceLabel },
        { label: 'Destino', value: 'Fiados' },
        { label: 'Fecha', value: decisionDate },
        {
            label: 'Devueltos',
            value: `${movedQtyText} -> Total: ${fmtMoneyUI(splitDraft.transferAmount || 0, sourceCurrency)}`
        }
    ];
    if (splitDraft.isPartial) {
        summaryRows.push({
            label: `Quedan en ${sourceLabel}`,
            value: `${leftQtyText} -> Total: ${fmtMoneyUI(splitDraft.remainingAmount || 0, sourceCurrency)}`
        });
    }
    if (decision?.concept) {
        summaryRows.push({ label: 'Motivo', value: String(decision.concept).trim() });
    }

    const confirmation = await openTransferMetaModal({
        title: 'Confirmar devolución',
        stepIndex: 2,
        stepTotal: 2,
        stepLabel: 'Confirmación',
        rows: summaryRows,
        showConcept: false,
        showCategory: false,
        showDate: false,
        confirmText: 'Confirmar devolución',
        confirmVariant: 'submit'
    });
    if (!confirmation?.confirmed) return null;

    return {
        splitDraft,
        reason: String(decision.concept || '').trim(),
        decisionDate
    };
}

async function executeCompensationRevertToPending({
    sourceTable,
    sourceTab,
    sourceRow,
    userId,
    splitDraft,
    reason = '',
    decisionDate
}) {
    const movedAt = new Date().toISOString();
    const sourceLabel = getRevertSourceLabel(sourceTab);
    const fromState = getRevertFromState(sourceTab);
    const transferAmount = toSafeLocaleNumber(splitDraft?.transferAmount) ?? 0;
    const remainingAmount = toSafeLocaleNumber(splitDraft?.remainingAmount) ?? 0;
    const unitType = String(splitDraft?.unitType || sourceRow?.unit_type || 'unidad').trim().toLowerCase() || 'unidad';
    const qtyTotal = toSafeLocaleNumber(splitDraft?.qtyTotal ?? resolvePendingQuantity(sourceRow).qtyTotal);
    const qtyMoved = toSafeLocaleNumber(splitDraft?.qtyTransfer ?? splitDraft?.transferUnitQty);
    const qtyLeft = toSafeLocaleNumber(splitDraft?.qtyLeft ?? splitDraft?.remainingUnitQty);
    const isPartial = !!(splitDraft?.isPartial && remainingAmount > 0 && qtyTotal !== null && qtyMoved !== null && qtyLeft !== null);
    const safeDecisionDate = decisionDate || getTodayLocalISO();
    const reasonText = String(reason || '').trim();

    const splitMetaPending = isPartial
        ? buildPartialSplitMetaPayload({
            role: 'destination',
            splitFromId: sourceRow.id,
            fromState,
            toState: 'fiados',
            unitType,
            qtyTotal,
            qtyMoved,
            qtyLeft,
            unitPriceOriginal: splitDraft?.unitPriceOriginal,
            unitPriceTransfer: splitDraft?.unitPriceTransfer,
            amountMoved: transferAmount,
            amountLeft: remainingAmount,
            movedAt
        })
        : null;
    const splitMetaRemainder = isPartial
        ? buildPartialSplitMetaPayload({
            role: 'origin',
            splitFromId: sourceRow.id,
            fromState,
            toState: 'fiados',
            unitType,
            qtyTotal,
            qtyMoved,
            qtyLeft,
            unitPriceOriginal: splitDraft?.unitPriceOriginal,
            unitPriceTransfer: splitDraft?.unitPriceTransfer,
            amountMoved: transferAmount,
            amountLeft: remainingAmount,
            movedAt
        })
        : null;

    const pendingId = buildTransferId('pending');
    const sourceWhoData = getWhoData(sourceTab, sourceRow, sourceRow?.concepto || '');
    const pendingConcept = sourceWhoData?.concept || sourceRow?.concepto || 'Fiado';
    const pendingMoney = buildIncomeMonetaryFields(sourceRow, transferAmount);
    const pendingPayload = {
        id: pendingId,
        user_id: userId,
        concepto: pendingConcept,
        monto: pendingMoney.monto,
        fecha: safeDecisionDate,
        cliente: sourceTab === 'ingresos' ? (sourceWhoData?.who || null) : null,
        notas: reasonText || null,
        evidence_url: getFactureroEvidenceValue(sourceTab, sourceRow) || null,
        crop_id: sourceRow?.crop_id || null,
        unit_type: unitType,
        unit_qty: Number.isFinite(Number(splitDraft?.transferUnitQty)) ? Number(splitDraft.transferUnitQty) : null,
        quantity_kg: Number.isFinite(Number(splitDraft?.transferKgQty)) ? Number(splitDraft.transferKgQty) : null,
        currency: pendingMoney.currency,
        exchange_rate: pendingMoney.exchange_rate,
        monto_usd: pendingMoney.monto_usd,
        transfer_state: 'active',
        split_from_id: isPartial ? sourceRow.id : null,
        split_meta: splitMetaPending
    };

    const pendingInsert = await insertRowWithMissingColumnFallback('agro_pending', pendingPayload, [
        'cliente',
        'notas',
        'unit_type',
        'unit_qty',
        'quantity_kg',
        'currency',
        'exchange_rate',
        'monto_usd',
        'transfer_state',
        'split_from_id',
        'split_meta'
    ]);
    if (pendingInsert.error) {
        return { success: false, error: pendingInsert.error?.message || 'No se pudo crear el movimiento compensatorio en Fiados.' };
    }

    let remainderId = null;
    if (isPartial && remainingAmount > 0) {
        const remainderMoney = buildIncomeMonetaryFields(sourceRow, remainingAmount);
        remainderId = buildTransferId(sourceTab === 'ingresos' ? 'inc' : 'loss');
        const remainderPayload = sourceTab === 'ingresos'
            ? {
                id: remainderId,
                user_id: userId,
                concepto: sourceRow?.concepto || 'Pagado',
                monto: remainderMoney.monto,
                fecha: sourceRow?.fecha || safeDecisionDate,
                categoria: sourceRow?.categoria || 'ventas',
                soporte_url: sourceRow?.soporte_url || null,
                crop_id: sourceRow?.crop_id || null,
                unit_type: unitType,
                unit_qty: Number.isFinite(Number(splitDraft?.remainingUnitQty)) ? Number(splitDraft.remainingUnitQty) : null,
                quantity_kg: Number.isFinite(Number(splitDraft?.remainingKgQty)) ? Number(splitDraft.remainingKgQty) : null,
                currency: remainderMoney.currency,
                exchange_rate: remainderMoney.exchange_rate,
                monto_usd: remainderMoney.monto_usd,
                origin_table: sourceRow?.origin_table || 'agro_pending',
                origin_id: sourceRow?.origin_id || null,
                transfer_state: 'active',
                split_from_id: sourceRow.id,
                split_meta: splitMetaRemainder
            }
            : {
                id: remainderId,
                user_id: userId,
                concepto: sourceRow?.concepto || 'Pérdida',
                monto: remainderMoney.monto,
                fecha: sourceRow?.fecha || safeDecisionDate,
                causa: sourceRow?.causa || 'Fiado cancelado',
                evidence_url: sourceRow?.evidence_url || null,
                crop_id: sourceRow?.crop_id || null,
                unit_type: unitType,
                unit_qty: Number.isFinite(Number(splitDraft?.remainingUnitQty)) ? Number(splitDraft.remainingUnitQty) : null,
                quantity_kg: Number.isFinite(Number(splitDraft?.remainingKgQty)) ? Number(splitDraft.remainingKgQty) : null,
                currency: remainderMoney.currency,
                exchange_rate: remainderMoney.exchange_rate,
                monto_usd: remainderMoney.monto_usd,
                origin_table: sourceRow?.origin_table || 'agro_pending',
                origin_id: sourceRow?.origin_id || null,
                transfer_state: 'active',
                split_from_id: sourceRow.id,
                split_meta: splitMetaRemainder
            };

        const remainderInsert = await insertRowWithMissingColumnFallback(sourceTable, remainderPayload, [
            'unit_type',
            'unit_qty',
            'quantity_kg',
            'currency',
            'exchange_rate',
            'monto_usd',
            'origin_table',
            'origin_id',
            'transfer_state',
            'split_from_id',
            'split_meta'
        ]);
        if (remainderInsert.error) {
            await softDeleteFactureroRow('agro_pending', pendingId, userId);
            return { success: false, error: remainderInsert.error?.message || 'No se pudo crear el remanente activo.' };
        }
    }

    const sourceUpdatePayload = {
        transfer_state: 'reverted',
        reverted_at: new Date().toISOString(),
        reverted_reason: reasonText || (isPartial ? 'Devuelto parcial a fiados' : 'Devuelto a fiados')
    };
    let { error: sourceUpdateError } = await supabase
        .from(sourceTable)
        .update(sourceUpdatePayload)
        .eq('id', sourceRow.id)
        .eq('user_id', userId);

    if (sourceUpdateError
        && (isMissingColumnError(sourceUpdateError, 'transfer_state')
            || isMissingColumnError(sourceUpdateError, 'reverted_at')
            || isMissingColumnError(sourceUpdateError, 'reverted_reason'))) {
        const fallbackDelete = await softDeleteFactureroRow(sourceTable, sourceRow.id, userId);
        if (fallbackDelete.success) {
            sourceUpdateError = null;
        }
    }

    if (sourceUpdateError) {
        await softDeleteFactureroRow('agro_pending', pendingId, userId);
        if (remainderId) {
            await softDeleteFactureroRow(sourceTable, remainderId, userId);
        }
        return { success: false, error: sourceUpdateError?.message || 'No se pudo marcar el origen como revertido.' };
    }

    const movedQtyLabel = formatSplitQuantity(splitDraft?.transferUnitQty ?? splitDraft?.qtyTransfer, unitType);
    const leftQtyLabel = formatSplitQuantity(splitDraft?.remainingUnitQty ?? splitDraft?.qtyLeft, unitType);
    console.info('[AGRO] Reversión compensatoria aplicada:', {
        sourceTable,
        sourceId: sourceRow.id,
        pendingId,
        remainderId,
        partial: isPartial
    });

    return {
        success: true,
        partial: isPartial,
        movedQtyLabel,
        leftQtyLabel,
        movedAmount: transferAmount,
        leftAmount: remainingAmount,
        sourceLabel
    };
}

async function revertIncomeToPending(incomeId, reason = '') {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return { success: false, error: 'No autenticado' };
    const userId = userData.user.id;

    const sourceResult = await fetchRevertSourceRecord('agro_income', incomeId, userId, AGRO_INCOME_REVERT_COLUMNS);
    if (sourceResult.error || !sourceResult.data) {
        return { success: false, error: sourceResult.error?.message || 'Pagado no encontrado' };
    }
    const income = sourceResult.data;
    if (income.origin_table !== 'agro_pending' || !income.origin_id) {
        return { success: false, error: 'Este pagado no proviene de un fiado' };
    }
    if (income.transfer_state === 'reverted' || income.reverted_at) {
        return { success: true, message: 'Ya revertido' };
    }

    const fullSplit = computePendingSplitDraft(income, 'income', {
        qtyTotal: resolvePendingQuantity(income).qtyTotal,
        quantity: resolvePendingQuantity(income).qtyTotal,
        transferTotal: toSafeLocaleNumber(income?.monto),
        unitType: income?.unit_type || 'unidad'
    });
    if (fullSplit.error) {
        return { success: false, error: fullSplit.error };
    }

    return executeCompensationRevertToPending({
        sourceTable: 'agro_income',
        sourceTab: 'ingresos',
        sourceRow: income,
        userId,
        splitDraft: fullSplit,
        reason,
        decisionDate: getTodayLocalISO()
    });
}

async function revertLossToPending(lossId, reason = '') {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return { success: false, error: 'No autenticado' };
    const userId = userData.user.id;

    const sourceResult = await fetchRevertSourceRecord('agro_losses', lossId, userId, AGRO_LOSS_REVERT_COLUMNS);
    if (sourceResult.error || !sourceResult.data) {
        return { success: false, error: sourceResult.error?.message || 'Pérdida no encontrada' };
    }
    const loss = sourceResult.data;
    if (loss.origin_table !== 'agro_pending' || !loss.origin_id) {
        return { success: false, error: 'Esta pérdida no proviene de un fiado' };
    }
    if (loss.transfer_state === 'reverted' || loss.reverted_at) {
        return { success: true, message: 'Ya revertido' };
    }

    const fullSplit = computePendingSplitDraft(loss, 'income', {
        qtyTotal: resolvePendingQuantity(loss).qtyTotal,
        quantity: resolvePendingQuantity(loss).qtyTotal,
        transferTotal: toSafeLocaleNumber(loss?.monto),
        unitType: loss?.unit_type || 'unidad'
    });
    if (fullSplit.error) {
        return { success: false, error: fullSplit.error };
    }

    return executeCompensationRevertToPending({
        sourceTable: 'agro_losses',
        sourceTab: 'perdidas',
        sourceRow: loss,
        userId,
        splitDraft: fullSplit,
        reason,
        decisionDate: getTodayLocalISO()
    });
}

async function handleRevertIncome(incomeId) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
        notifyFacturero('Sesión expirada. Recarga la página.', 'warning');
        return;
    }

    const lockKey = `income:${String(incomeId || '').trim()}`;
    if (revertTransferInFlightLocks.has(lockKey)) {
        notifyFacturero('⚠️ Esta devolución ya está en proceso.', 'warning');
        return;
    }

    const sourceResult = await fetchRevertSourceRecord('agro_income', incomeId, userId, AGRO_INCOME_REVERT_COLUMNS);
    if (sourceResult.error || !sourceResult.data) {
        notifyFacturero('No se encontró el pagado seleccionado.', 'warning');
        return;
    }
    const income = sourceResult.data;
    if (income.origin_table !== 'agro_pending' || !income.origin_id) {
        notifyFacturero('Este pagado no proviene de Fiados.', 'warning');
        return;
    }
    if (income.transfer_state === 'reverted' || income.reverted_at) {
        notifyFacturero('Este pagado ya fue revertido.', 'warning');
        return;
    }

    const wizard = await openRevertToPendingWizard('ingresos', income);
    if (!wizard) return;

    revertTransferInFlightLocks.add(lockKey);
    try {
        notifyFacturero('Actualizando historial...', 'info');
        const result = await executeCompensationRevertToPending({
            sourceTable: 'agro_income',
            sourceTab: 'ingresos',
            sourceRow: income,
            userId,
            splitDraft: wizard.splitDraft,
            reason: wizard.reason,
            decisionDate: wizard.decisionDate
        });
        if (!result.success) {
            notifyFacturero(`Error al devolver: ${result.error || 'No se pudo completar la operación.'}`, 'warning');
            return;
        }

        if (result.partial) {
            notifyFacturero(`✅ Devueltos ${result.movedQtyLabel} a Fiados. Quedan ${result.leftQtyLabel} en Pagados.`, 'success');
        } else {
            notifyFacturero('✅ Pagado devuelto a Fiados.', 'success');
        }

        await Promise.allSettled([
            refreshFactureroHistory('ingresos'),
            refreshFactureroHistory('pendientes'),
            refreshFactureroHistory('otros'),
            typeof loadIncomes === 'function' ? loadIncomes() : Promise.resolve()
        ]);
        document.dispatchEvent(new CustomEvent('agro:income:changed'));
        document.dispatchEvent(new CustomEvent(AGRO_CROPS_REFRESH_EVENT, {
            detail: { source: 'revert-income', cropId: income?.crop_id || null }
        }));
        refreshOpsRankingsIfVisible();
        scheduleOpsMovementSummaryRefresh();
        applyBuyerPrivacy(document, readBuyerNamesHidden());
        if (typeof readMoneyValuesHidden === 'function') {
            applyMoneyPrivacy(document, readMoneyValuesHidden());
        } else {
            applyMoneyPrivacy(document);
        }
        await updateStats();
    } finally {
        revertTransferInFlightLocks.delete(lockKey);
    }
}

async function handleRevertLoss(lossId) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
        notifyFacturero('Sesión expirada. Recarga la página.', 'warning');
        return;
    }

    const lockKey = `loss:${String(lossId || '').trim()}`;
    if (revertTransferInFlightLocks.has(lockKey)) {
        notifyFacturero('⚠️ Esta devolución ya está en proceso.', 'warning');
        return;
    }

    const sourceResult = await fetchRevertSourceRecord('agro_losses', lossId, userId, AGRO_LOSS_REVERT_COLUMNS);
    if (sourceResult.error || !sourceResult.data) {
        notifyFacturero('No se encontró la pérdida seleccionada.', 'warning');
        return;
    }
    const loss = sourceResult.data;
    if (loss.origin_table !== 'agro_pending' || !loss.origin_id) {
        notifyFacturero('Esta pérdida no proviene de Fiados.', 'warning');
        return;
    }
    if (loss.transfer_state === 'reverted' || loss.reverted_at) {
        notifyFacturero('Esta pérdida ya fue revertida.', 'warning');
        return;
    }

    const wizard = await openRevertToPendingWizard('perdidas', loss);
    if (!wizard) return;

    revertTransferInFlightLocks.add(lockKey);
    try {
        notifyFacturero('Actualizando historial...', 'info');
        const result = await executeCompensationRevertToPending({
            sourceTable: 'agro_losses',
            sourceTab: 'perdidas',
            sourceRow: loss,
            userId,
            splitDraft: wizard.splitDraft,
            reason: wizard.reason,
            decisionDate: wizard.decisionDate
        });
        if (!result.success) {
            notifyFacturero(`Error al devolver: ${result.error || 'No se pudo completar la operación.'}`, 'warning');
            return;
        }

        if (result.partial) {
            notifyFacturero(`✅ Devueltos ${result.movedQtyLabel} a Fiados. Quedan ${result.leftQtyLabel} en Pérdidas.`, 'success');
        } else {
            notifyFacturero('✅ Pérdida devuelta a Fiados.', 'success');
        }

        await Promise.allSettled([
            refreshFactureroHistory('perdidas'),
            refreshFactureroHistory('pendientes'),
            refreshFactureroHistory('otros')
        ]);
        document.dispatchEvent(new CustomEvent('agro:losses:changed'));
        document.dispatchEvent(new CustomEvent(AGRO_CROPS_REFRESH_EVENT, {
            detail: { source: 'revert-loss', cropId: loss?.crop_id || null }
        }));
        refreshOpsRankingsIfVisible();
        scheduleOpsMovementSummaryRefresh();
        applyBuyerPrivacy(document, readBuyerNamesHidden());
        if (typeof readMoneyValuesHidden === 'function') {
            applyMoneyPrivacy(document, readMoneyValuesHidden());
        } else {
            applyMoneyPrivacy(document);
        }
        await updateStats();
    } finally {
        revertTransferInFlightLocks.delete(lockKey);
    }
}

function buildTransferWizardSubtitle(stepIndex, stepTotal, stepLabel = '') {
    const step = Number(stepIndex);
    const total = Number(stepTotal);
    if (!Number.isFinite(step) || step < 1 || !Number.isFinite(total) || total < 1) return '';
    const safeTotal = Math.max(1, Math.round(total));
    const safeStep = Math.min(Math.max(1, Math.round(step)), safeTotal);
    const label = String(stepLabel || '').trim();
    return label
        ? `Paso ${safeStep} de ${safeTotal} — ${label}`
        : `Paso ${safeStep} de ${safeTotal}`;
}

function buildTransferWizardShell(options = {}) {
    if (typeof ensureAgroWizardStyles === 'function') {
        ensureAgroWizardStyles();
    }

    const overlay = document.createElement('div');
    if (options.id) overlay.id = options.id;
    overlay.className = 'agro-wizard-overlay';

    const card = document.createElement('div');
    card.className = 'agro-wizard-card';

    const progressWrap = document.createElement('div');
    progressWrap.className = 'agro-wizard-progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'agro-wizard-progress-fill';
    progressWrap.appendChild(progressFill);

    const header = document.createElement('div');
    header.className = 'agro-wizard-header';
    const titleEl = document.createElement('h3');
    titleEl.textContent = String(options.title || 'Transferir').trim() || 'Transferir';
    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'wiz-subtitle';

    const subtitle = buildTransferWizardSubtitle(options.stepIndex, options.stepTotal, options.stepLabel)
        || String(options.subtitle || '').trim();
    if (subtitle) {
        subtitleEl.textContent = subtitle;
    } else {
        subtitleEl.style.display = 'none';
    }
    const hasStep = subtitle.startsWith('Paso ');
    if (hasStep) {
        const pct = Math.round((Math.max(1, Number(options.stepIndex)) / Math.max(1, Number(options.stepTotal))) * 100);
        progressFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    } else {
        progressWrap.style.display = 'none';
    }
    header.append(titleEl, subtitleEl);

    const body = document.createElement('div');
    body.className = 'agro-wizard-body';
    const footer = document.createElement('div');
    footer.className = 'agro-wizard-footer';

    card.append(progressWrap, header, body, footer);
    overlay.appendChild(card);
    return { overlay, card, body, footer };
}

/**
 * Show modal to choose transfer destination
 * @returns {Promise<string|null>}
 */
function showTransferChoiceModal(options = {}) {
    return new Promise((resolve) => {
        const title = options.title || '\u00bfA d\u00f3nde transferir?';
        const choices = Array.isArray(options.choices) && options.choices.length
            ? options.choices
            : [
                { value: 'income', label: 'Pagados' },
                { value: 'losses', label: 'P\u00e9rdidas (Cancelado)' }
            ];

        const variantMap = {
            success: {
                className: 'transfer-to-income',
                color: '#4ade80',
                border: 'rgba(74, 222, 128, 0.5)',
                bg: 'rgba(74, 222, 128, 0.15)',
                icon: 'fa-arrow-right'
            },
            danger: {
                className: 'transfer-to-losses',
                color: '#ef4444',
                border: 'rgba(239, 68, 68, 0.5)',
                bg: 'rgba(239, 68, 68, 0.15)',
                icon: 'fa-times'
            },
            neutral: {
                className: 'transfer-to-pendientes',
                color: '#C8A752',
                border: 'rgba(200, 167, 82, 0.5)',
                bg: 'rgba(200, 167, 82, 0.15)',
                icon: 'fa-clock'
            }
        };

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

        const { overlay, body, footer } = buildTransferWizardShell({
            title,
            stepIndex: options.stepIndex,
            stepTotal: options.stepTotal,
            stepLabel: options.stepLabel || ''
        });

        const question = document.createElement('p');
        question.className = 'wiz-question';
        question.textContent = String(options.question || 'Selecciona el destino de esta transferencia');
        body.appendChild(question);

        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';

        choices.forEach((choice) => {
            const key = choice.value;
            const variant = String(choice?.variant || '').trim().toLowerCase();
            const style = styleMap[key] || variantMap[variant] || styleMap.pendientes;
            const icon = choice.icon || style.icon;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `transfer-choice-btn ${style.className}`;
            btn.dataset.choice = key;
            const isDisabled = choice?.disabled === true;
            btn.style.cssText = `background: ${style.bg}; border: 1px solid ${style.border}; color: ${style.color}; padding: 0.75rem 1rem; border-radius: 8px; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}; font-size: 0.9rem;`;
            if (isDisabled) {
                btn.disabled = true;
                btn.classList.add('is-disabled');
                btn.setAttribute('aria-disabled', 'true');
            }

            const iconEl = document.createElement('i');
            iconEl.className = `fa ${icon}`;
            btn.append(iconEl, document.createTextNode(` ${choice.label}`));
            actions.appendChild(btn);
        });
        body.appendChild(actions);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'wiz-btn wiz-btn-back';
        cancelBtn.dataset.choice = '__cancel__';
        cancelBtn.textContent = 'Cancelar';
        footer.appendChild(cancelBtn);

        document.body.appendChild(overlay);

        let done = false;
        const finalize = (value) => {
            if (done) return;
            done = true;
            document.removeEventListener('keydown', onKey);
            if (overlay.parentNode) overlay.remove();
            resolve(value);
        };
        const close = () => finalize(null);
        const onKey = (e) => {
            if (e.key === 'Escape') close();
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                close();
                return;
            }
            const btn = e.target.closest('[data-choice]');
            if (!btn) return;
            if (btn.disabled || btn.classList.contains('is-disabled')) return;
            const choice = btn.dataset.choice;
            if (!choice || choice === '__cancel__') {
                close();
            } else {
                finalize(choice);
            }
        });

        document.addEventListener('keydown', onKey);
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
        label.htmlFor = 'pending-transfer-toggle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'pending-transfer-toggle';
        checkbox.checked = readPendingTransferFilter();
        const text = document.createElement('span');
        text.className = 'pending-transfer-text';
        label.append(checkbox, text);
        wrapper.appendChild(label);
        parent.prepend(wrapper);
    }

    let labelTransferred = wrapper.querySelector('label[for="pending-transfer-toggle"]');
    if (!labelTransferred) {
        labelTransferred = document.createElement('label');
        labelTransferred.className = 'pending-transfer-label';
        labelTransferred.htmlFor = 'pending-transfer-toggle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'pending-transfer-toggle';
        checkbox.checked = readPendingTransferFilter();
        const text = document.createElement('span');
        text.className = 'pending-transfer-text';
        labelTransferred.append(checkbox, text);
        wrapper.appendChild(labelTransferred);
    }

    let labelReverted = wrapper.querySelector('label[for="pending-reverted-toggle"]');
    if (!labelReverted) {
        labelReverted = document.createElement('label');
        labelReverted.className = 'pending-transfer-label';
        labelReverted.htmlFor = 'pending-reverted-toggle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'pending-reverted-toggle';
        checkbox.checked = readPendingRevertedFilter();
        const text = document.createElement('span');
        text.className = 'pending-reverted-text';
        labelReverted.append(checkbox, text);
        wrapper.appendChild(labelReverted);
    }

    const transferToggle = wrapper.querySelector('#pending-transfer-toggle');
    if (transferToggle) {
        transferToggle.checked = readPendingTransferFilter();
        if (transferToggle.dataset.bound !== '1') {
            transferToggle.addEventListener('change', () => {
                writePendingTransferFilter(transferToggle.checked);
                refreshFactureroHistory('pendientes');
            });
            transferToggle.dataset.bound = '1';
        }
    }

    const revertedToggle = wrapper.querySelector('#pending-reverted-toggle');
    if (revertedToggle) {
        revertedToggle.checked = readPendingRevertedFilter();
        if (revertedToggle.dataset.bound !== '1') {
            revertedToggle.addEventListener('change', () => {
                writePendingRevertedFilter(revertedToggle.checked);
                refreshFactureroHistory('pendientes');
            });
            revertedToggle.dataset.bound = '1';
        }
    }

    const transferredCount = Array.isArray(items)
        ? items.filter((item) => isPendingTransferred(item)).length
        : 0;
    const revertedCount = Array.isArray(items)
        ? items.filter((item) => isPendingReverted(item)).length
        : 0;

    const transferredText = wrapper.querySelector('.pending-transfer-text');
    if (transferredText) {
        transferredText.textContent = transferredCount > 0
            ? `Ver transferidos (${transferredCount})`
            : 'Ver transferidos';
    }
    const revertedText = wrapper.querySelector('.pending-reverted-text');
    if (revertedText) {
        revertedText.textContent = revertedCount > 0
            ? `Ver revertidos (${revertedCount})`
            : 'Ver revertidos';
    }
}

function applyPendingTransferFilter(items) {
    if (!Array.isArray(items)) return [];
    const showTransferred = readPendingTransferFilter();
    const showReverted = readPendingRevertedFilter();
    return items.filter((item) => {
        if (isPendingReverted(item)) return showReverted;
        if (isPendingTransferred(item)) return showTransferred;
        return true;
    });
}

function ensureOtherTransferFilterUI(parent, items) {
    if (!parent) return;
    let wrapper = parent.querySelector('#other-transfer-filter');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'other-transfer-filter';
        wrapper.className = 'pending-transfer-filter';
        const label = document.createElement('label');
        label.className = 'pending-transfer-label';
        label.htmlFor = 'other-transfer-toggle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'other-transfer-toggle';
        checkbox.checked = readOtherTransferFilter();
        const text = document.createElement('span');
        text.className = 'pending-transfer-text';
        label.append(checkbox, text);
        wrapper.appendChild(label);
        parent.prepend(wrapper);
    }

    let labelTransferred = wrapper.querySelector('label[for="other-transfer-toggle"]');
    if (!labelTransferred) {
        labelTransferred = document.createElement('label');
        labelTransferred.className = 'pending-transfer-label';
        labelTransferred.htmlFor = 'other-transfer-toggle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'other-transfer-toggle';
        checkbox.checked = readOtherTransferFilter();
        const text = document.createElement('span');
        text.className = 'pending-transfer-text';
        labelTransferred.append(checkbox, text);
        wrapper.appendChild(labelTransferred);
    }

    let labelReverted = wrapper.querySelector('label[for="other-reverted-toggle"]');
    if (!labelReverted) {
        labelReverted = document.createElement('label');
        labelReverted.className = 'pending-transfer-label';
        labelReverted.htmlFor = 'other-reverted-toggle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'other-reverted-toggle';
        checkbox.checked = readOtherRevertedFilter();
        const text = document.createElement('span');
        text.className = 'pending-reverted-text';
        labelReverted.append(checkbox, text);
        wrapper.appendChild(labelReverted);
    }

    const transferToggle = wrapper.querySelector('#other-transfer-toggle');
    if (transferToggle) {
        transferToggle.checked = readOtherTransferFilter();
        if (transferToggle.dataset.bound !== '1') {
            transferToggle.addEventListener('change', () => {
                writeOtherTransferFilter(transferToggle.checked);
                refreshFactureroHistory('otros');
            });
            transferToggle.dataset.bound = '1';
        }
    }

    const revertedToggle = wrapper.querySelector('#other-reverted-toggle');
    if (revertedToggle) {
        revertedToggle.checked = readOtherRevertedFilter();
        if (revertedToggle.dataset.bound !== '1') {
            revertedToggle.addEventListener('change', () => {
                writeOtherRevertedFilter(revertedToggle.checked);
                refreshFactureroHistory('otros');
            });
            revertedToggle.dataset.bound = '1';
        }
    }

    const transferredCount = Array.isArray(items)
        ? items.filter((item) => isOtherTransferredRecord(item)).length
        : 0;
    const revertedCount = Array.isArray(items)
        ? items.filter((item) => isOtherRevertedRecord(item)).length
        : 0;
    const transferredText = wrapper.querySelector('.pending-transfer-text');
    if (transferredText) {
        transferredText.textContent = transferredCount > 0
            ? `Ver transferidos (${transferredCount})`
            : 'Ver transferidos';
    }
    const revertedText = wrapper.querySelector('.pending-reverted-text');
    if (revertedText) {
        revertedText.textContent = revertedCount > 0
            ? `Ver revertidos (${revertedCount})`
            : 'Ver revertidos';
    }
}

function applyOtherTransferFilter(items) {
    if (!Array.isArray(items)) return [];
    const showTransferred = readOtherTransferFilter();
    const showReverted = readOtherRevertedFilter();
    return items.filter((item) => {
        if (isOtherRevertedRecord(item)) return showReverted;
        if (isOtherTransferredRecord(item)) return showTransferred;
        return true;
    });
}

function toSafeLocaleNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const normalized = raw
        .replace(/\s/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(/,(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function roundNumeric(value, decimals = 2) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    const factor = 10 ** Math.max(0, Number(decimals) || 0);
    return Math.round((num + Number.EPSILON) * factor) / factor;
}

function isIntegerLike(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return false;
    return Math.abs(num - Math.round(num)) < 1e-9;
}

function formatQuantityValue(value, precision = 2) {
    const num = toSafeLocaleNumber(value);
    if (num === null) return '0';
    if (Math.abs(num) < 1e-9) return '0';
    const decimals = precision === 0 || isIntegerLike(num) ? 0 : 2;
    const fixed = roundNumeric(num, decimals).toFixed(decimals);
    const cleaned = fixed.replace(/\.?0+$/, '');
    return cleaned === '' ? '0' : cleaned;
}

function getUnitOptionByType(unitType) {
    const key = String(unitType || '').trim().toLowerCase();
    if (!key) return null;
    return INCOME_UNIT_OPTIONS.find((opt) => opt.value === key) || null;
}

function formatSplitQuantity(value, unitType) {
    const qty = toSafeLocaleNumber(value);
    if (qty === null || qty < 0) return '-';
    const qtyText = formatQuantityValue(qty, isIntegerLike(qty) ? 0 : 2);
    const unitOption = getUnitOptionByType(unitType);
    if (!unitOption) return qtyText;
    const singular = Math.abs(qty - 1) < 1e-9;
    return `${qtyText} ${singular ? unitOption.singular : unitOption.plural}`;
}

function fmtMoneyUI(amount, currency = 'COP') {
    const safeAmount = toSafeLocaleNumber(amount) ?? 0;
    const code = String(currency || 'COP').trim().toUpperCase();
    const cfg = SUPPORTED_CURRENCIES[code] || null;
    const label = cfg?.symbol || code || 'COP';
    const decimals = Number.isInteger(cfg?.decimals) ? cfg.decimals : 2;
    const formatted = Number(safeAmount).toLocaleString('es-VE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    return `${label} ${formatted}`;
}

const SPLIT_STATE_LABELS = {
    fiado: 'Fiados',
    fiados: 'Fiados',
    pendiente: 'Fiados',
    pendientes: 'Fiados',
    pagado: 'Pagados',
    pagados: 'Pagados',
    ingreso: 'Pagados',
    ingresos: 'Pagados',
    income: 'Pagados',
    perdida: 'Pérdidas',
    perdidas: 'Pérdidas',
    losses: 'Pérdidas',
    transferencias: 'Donaciones',
    donaciones: 'Donaciones',
    gastos: 'Gastos',
    otros: 'Otros'
};

function formatSplitStateLabel(value, fallback = 'Historial') {
    const key = String(value || '').trim().toLowerCase();
    return SPLIT_STATE_LABELS[key] || fallback;
}

function normalizeSplitMeta(raw) {
    if (!raw) return null;
    let parsed = raw;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch (_err) {
            return null;
        }
    }
    if (!parsed || typeof parsed !== 'object') return null;
    const type = String(parsed.type || '').trim().toLowerCase();
    if (type !== 'partial_transfer') return null;
    const qtyTotal = toSafeLocaleNumber(parsed.qty_total);
    const qtyMoved = toSafeLocaleNumber(parsed.qty_moved);
    const qtyLeft = toSafeLocaleNumber(parsed.qty_left);
    if (qtyTotal === null || qtyMoved === null || qtyLeft === null) return null;

    return {
        ...parsed,
        type: 'partial_transfer',
        role: String(parsed.role || '').trim().toLowerCase() === 'destination' ? 'destination' : 'origin',
        qty_total: qtyTotal,
        qty_moved: qtyMoved,
        qty_left: qtyLeft
    };
}

function buildPartialSplitMetaPayload(input = {}) {
    const qtyTotal = toSafeLocaleNumber(input.qtyTotal);
    const qtyMoved = toSafeLocaleNumber(input.qtyMoved);
    const qtyLeft = toSafeLocaleNumber(input.qtyLeft);
    if (qtyTotal === null || qtyMoved === null || qtyLeft === null) return null;
    if (qtyTotal <= 0 || qtyMoved <= 0 || qtyLeft < 0 || qtyMoved >= qtyTotal) return null;

    const unitPriceOriginal = toSafeLocaleNumber(input.unitPriceOriginal);
    const unitPriceTransfer = toSafeLocaleNumber(input.unitPriceTransfer);
    const amountMoved = toSafeLocaleNumber(input.amountMoved);
    const amountLeft = toSafeLocaleNumber(input.amountLeft);
    const movedAt = input.movedAt || new Date().toISOString();

    const qtyPrecision = isIntegerLike(qtyTotal) && isIntegerLike(qtyMoved) && isIntegerLike(qtyLeft) ? 0 : 2;

    return {
        type: 'partial_transfer',
        role: String(input.role || '').trim().toLowerCase() === 'destination' ? 'destination' : 'origin',
        split_from_id: input.splitFromId || null,
        from_state: String(input.fromState || 'fiados').trim().toLowerCase() || 'fiados',
        to_state: String(input.toState || '').trim().toLowerCase() || null,
        unit_type: String(input.unitType || '').trim().toLowerCase() || null,
        qty_total: roundNumeric(qtyTotal, qtyPrecision),
        qty_moved: roundNumeric(qtyMoved, qtyPrecision),
        qty_left: roundNumeric(qtyLeft, qtyPrecision),
        unit_price_original: unitPriceOriginal !== null ? roundNumeric(unitPriceOriginal, 6) : null,
        unit_price_transfer: unitPriceTransfer !== null ? roundNumeric(unitPriceTransfer, 6) : null,
        amount_moved: amountMoved !== null ? roundNumeric(amountMoved, 2) : null,
        amount_left: amountLeft !== null ? roundNumeric(amountLeft, 2) : null,
        moved_at: movedAt
    };
}

function formatSplitMetaSummary(item, tabName, options = {}) {
    const mode = options.mode === 'md' ? 'md' : 'ui';
    const meta = normalizeSplitMeta(item?.split_meta);
    if (!meta) return '';

    // V9.8.1: Usar moneda del item para mostrar montos correctamente
    const itemCurrency = String(item?.currency || meta.currency || 'COP').trim().toUpperCase();
    const currencyLabel = SUPPORTED_CURRENCIES?.[itemCurrency] ? itemCurrency : 'COP';

    const qtyMovedText = formatSplitQuantity(meta.qty_moved, meta.unit_type);
    const qtyLeftText = formatSplitQuantity(meta.qty_left, meta.unit_type);
    const qtyTotalText = formatSplitQuantity(meta.qty_total, meta.unit_type);
    const fromLabel = formatSplitStateLabel(meta.from_state, 'Fiados');
    const toLabel = formatSplitStateLabel(meta.to_state || tabName, 'Destino');
    const amountMoved = toSafeLocaleNumber(meta.amount_moved);
    const amountLeft = toSafeLocaleNumber(meta.amount_left);
    // V9.8.1: Mostrar monto con moneda del item, no hardcoded '$'
    const amountMovedText = amountMoved !== null ? fmtMoneyUI(roundNumeric(amountMoved, 2), currencyLabel) : null;
    const amountLeftText = amountLeft !== null ? fmtMoneyUI(roundNumeric(amountLeft, 2), currencyLabel) : null;

    if (mode === 'md') {
        const amountMovedPart = amountMovedText ? ` -> ${amountMovedText}` : '';
        const amountLeftPart = amountLeftText ? ` -> ${amountLeftText}` : '';
        if (meta.role === 'destination') {
            return `Transferido parcial: ${qtyMovedText} de ${qtyTotalText}${amountMovedPart}. Quedan ${qtyLeftText} en ${fromLabel}${amountLeftPart}.`;
        }
        return `Restante tras transferencia parcial: ${qtyLeftText} (de ${qtyTotalText})${amountLeftPart}. Se movieron ${qtyMovedText} a ${toLabel}${amountMovedPart}.`;
    }

    if (meta.role === 'destination') {
        return `Split parcial: movidos ${qtyMovedText}${amountMovedText ? ` (${amountMovedText})` : ''} • quedan ${qtyLeftText}${amountLeftText ? ` (${amountLeftText})` : ''} en ${fromLabel}`;
    }
    return `Restante split: quedan ${qtyLeftText}${amountLeftText ? ` (${amountLeftText})` : ''} • movidos ${qtyMovedText}${amountMovedText ? ` (${amountMovedText})` : ''} a ${toLabel}`;
}

function computePendingSplitDraft(pending, destination, decision = {}) {
    const splitMetaParsed = normalizeSplitMeta(pending?.split_meta);
    const resolvedQty = resolvePendingQuantity(pending, splitMetaParsed);
    const unitType = String(decision?.unitType || resolvedQty.unitType || '').trim().toLowerCase();
    let qtyRaw = toSafeLocaleNumber(decision?.qtyTotal);
    if (qtyRaw === null) qtyRaw = resolvedQty.qtyTotal;
    const normalizedQtyRaw = qtyRaw !== null
        ? (isIntegerLike(qtyRaw) ? Math.round(qtyRaw) : roundNumeric(qtyRaw, 2))
        : null;
    const sourceAmount = toSafeLocaleNumber(pending?.monto) ?? 0;
    // V9.8.1: qtyRaw >= 1 para incluir "1 saco" y mostrar cantidad siempre que exista
    const splitEnabled = !!unitType && normalizedQtyRaw !== null && normalizedQtyRaw >= 1;

    const base = {
        enabled: splitEnabled,
        unitType,
        qtyTotal: splitEnabled ? normalizedQtyRaw : null,
        qtyTransfer: splitEnabled ? normalizedQtyRaw : null,
        qtyLeft: 0,
        qtyPrecision: splitEnabled && isIntegerLike(normalizedQtyRaw) ? 0 : 2,
        unitPriceOriginal: splitEnabled && normalizedQtyRaw > 0 ? (sourceAmount / normalizedQtyRaw) : null,
        unitPriceTransfer: null,
        transferAmount: sourceAmount,
        remainingAmount: 0,
        transferUnitQty: splitEnabled
            ? normalizedQtyRaw
            : (toSafeLocaleNumber(pending?.unit_qty) ?? resolvedQty.qtyTotal ?? null),
        remainingUnitQty: 0,
        transferKgQty: toSafeLocaleNumber(pending?.quantity_kg),
        remainingKgQty: 0,
        isPartial: false,
        error: ''
    };

    if (!splitEnabled) {
        base.transferUnitQty = toSafeLocaleNumber(pending?.unit_qty) ?? resolvedQty.qtyTotal;
        base.transferKgQty = toSafeLocaleNumber(pending?.quantity_kg);
        return base;
    }

    const qtyTotal = base.qtyPrecision === 0
        ? Math.round(base.qtyTotal)
        : roundNumeric(base.qtyTotal, 2);

    let qtyTransfer = toSafeLocaleNumber(decision?.quantity);
    if (qtyTransfer === null) qtyTransfer = qtyTotal;
    qtyTransfer = base.qtyPrecision === 0 ? Math.round(qtyTransfer) : roundNumeric(qtyTransfer, 2);

    if (qtyTransfer < 1 || qtyTransfer > qtyTotal) {
        base.error = `La cantidad a transferir debe estar entre 1 y ${formatQuantityValue(qtyTotal, base.qtyPrecision)}.`;
        return base;
    }

    const qtyLeftRaw = Math.max(qtyTotal - qtyTransfer, 0);
    const qtyLeft = base.qtyPrecision === 0 ? Math.round(qtyLeftRaw) : roundNumeric(qtyLeftRaw, 2);

    const unitPriceOriginal = base.unitPriceOriginal;
    const transferTotalInput = toSafeLocaleNumber(decision?.transferTotal);
    const ratio = qtyTotal > 0 ? (qtyTransfer / qtyTotal) : 1;
    const defaultRatioAmount = roundNumeric(sourceAmount * ratio, 2);
    let transferAmount = sourceAmount;

    if (destination === 'income') {
        if (transferTotalInput !== null) {
            if (!(transferTotalInput > 0)) {
                base.error = 'El monto total transferido debe ser mayor a 0.';
                return base;
            }
            if (transferTotalInput - sourceAmount > 1e-9) {
                base.error = 'El monto total transferido no puede superar el total fiado.';
                return base;
            }
            // V9.8.1: transferTotalInput es el TOTAL transferido (no unitario)
            transferAmount = roundNumeric(transferTotalInput, 2);
        } else {
            // V9.8.1: Default por prorrateo (qty_transfer / qty_total * sourceAmount)
            transferAmount = defaultRatioAmount;
        }
        // V9.8.1: Blindaje Sr. Barriga — clamp final para nunca superar el total fiado
        if (transferAmount > sourceAmount + 1e-9) {
            transferAmount = sourceAmount;
        }
    } else if (unitPriceOriginal !== null) {
        transferAmount = roundNumeric(qtyTransfer * unitPriceOriginal, 2);
    } else if (qtyTotal > 0) {
        transferAmount = roundNumeric(sourceAmount * ratio, 2);
    }

    const remainingAmount = qtyLeft > 0
        ? (destination === 'income'
            ? roundNumeric(Math.max(sourceAmount - transferAmount, 0), 2)
            : unitPriceOriginal !== null
                ? roundNumeric(qtyLeft * unitPriceOriginal, 2)
                : roundNumeric(Math.max(sourceAmount - transferAmount, 0), 2))
        : 0;

    const unitPriceTransfer = qtyTransfer > 0
        ? roundNumeric(transferAmount / qtyTransfer, 6)
        : null;

    const kgTotal = toSafeLocaleNumber(pending?.quantity_kg);
    let transferKgQty = kgTotal;
    let remainingKgQty = 0;
    if (kgTotal !== null && kgTotal > 0 && qtyTotal > 0) {
        transferKgQty = roundNumeric(kgTotal * (qtyTransfer / qtyTotal), 3);
        remainingKgQty = qtyLeft > 0 ? roundNumeric(Math.max(kgTotal - transferKgQty, 0), 3) : 0;
    }

    return {
        ...base,
        qtyTotal,
        qtyTransfer,
        qtyLeft,
        unitPriceTransfer,
        transferAmount,
        remainingAmount,
        transferUnitQty: qtyTransfer,
        remainingUnitQty: qtyLeft,
        transferKgQty,
        remainingKgQty,
        isPartial: qtyLeft > 0
    };
}

function _fmtItemCurrency(item, config, amount) {
    const amountCandidates = [
        amount,
        item?.monto,
        item?.amount,
        item?.monto_usd
    ];
    let safeAmount = 0;
    for (const candidate of amountCandidates) {
        const parsed = toSafeLocaleNumber(candidate);
        if (parsed !== null) {
            safeAmount = parsed;
            break;
        }
    }

    const currency = normalizeMoneyCurrency(item?.currency) || 'USD';
    const montoUsdParsed = toSafeLocaleNumber(item?.monto_usd);
    const exchangeRateParsed = toSafeLocaleNumber(item?.exchange_rate);
    const montoUsd = montoUsdParsed !== null
        ? montoUsdParsed
        : (currency !== 'USD' && exchangeRateParsed !== null && exchangeRateParsed > 0)
            ? (safeAmount / exchangeRateParsed)
            : safeAmount;

    try {
        return formatCurrencyDisplay(safeAmount, currency, montoUsd);
    } catch (err) {
        console.warn('[AGRO] Currency display fallback:', err?.message || err);
        return `$${safeAmount.toFixed(2)}`;
    }
}

function createFactureroActionButton({
    className,
    tab,
    id,
    title,
    borderColor,
    color,
    iconClass,
    disabled = false,
    cursor = '',
    opacity = ''
}) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.dataset.tab = String(tab || '');
    btn.dataset.id = String(id || '');
    btn.title = title || '';
    if (disabled) btn.disabled = true;

    const effectiveCursor = cursor || (disabled ? 'not-allowed' : 'pointer');
    const effectiveOpacity = opacity || (disabled ? '0.4' : '1');
    btn.style.cssText = [
        'background: transparent',
        `border: 1px solid ${borderColor}`,
        `color: ${color}`,
        'width: 28px',
        'height: 28px',
        'border-radius: 50%',
        'display: inline-flex',
        'align-items: center',
        'justify-content: center',
        `cursor: ${effectiveCursor}`,
        'font-size: 0.7rem',
        `opacity: ${effectiveOpacity}`
    ].join('; ');

    const icon = document.createElement('i');
    icon.className = iconClass;
    btn.appendChild(icon);
    return btn;
}

function renderHistoryRow(tabName, item, config, options = {}) {
    const showActions = options.showActions !== false;
    const isOtrosView = tabName === 'otros';
    const sourceTab = tabName === 'otros' ? String(item?.source_tab || '').trim() : '';
    const effectiveTabName = (tabName === 'otros' && FACTURERO_CONFIG[sourceTab]) ? sourceTab : tabName;
    const rowConfig = FACTURERO_CONFIG[effectiveTabName] || config;
    const conceptField = rowConfig?.conceptField || config?.conceptField || 'concepto';
    const amountField = rowConfig?.amountField || config?.amountField || 'monto';
    const dateField = rowConfig?.dateField || config?.dateField || 'fecha';

    const rawConcept = item[conceptField] || item.concepto || 'Sin concepto';
    const amount = Number(item?.[amountField] ?? item?.monto ?? item?.amount ?? 0);
    const date = item[dateField] || item.fecha || item.date || item.created_at;
    const cropLabel = resolveRecordCropLabel(item);
    const evidenceUrl = item.evidence_url_resolved || '';
    const evidenceLink = createEvidenceLinkElement(evidenceUrl);
    const whoData = getWhoData(effectiveTabName, item, rawConcept);
    const displayConcept = whoData.concept || rawConcept;
    const sourceLabel = tabName === 'otros'
        ? String(item.source_label || AGROLOG_TAB_LABELS[effectiveTabName] || effectiveTabName || '')
        : '';
    const unitSummary = formatUnitSummary(item.unit_type, item.unit_qty);
    const kgSummary = formatKgSummary(item.quantity_kg);
    const unitMetaParts = [];
    if (unitSummary) unitMetaParts.push(escapeHtml(unitSummary));
    if (kgSummary) unitMetaParts.push(escapeHtml(kgSummary));
    const unitText = unitMetaParts.join(' • ');

    const isPending = effectiveTabName === 'pendientes';
    const isIncome = effectiveTabName === 'ingresos';
    const isLoss = effectiveTabName === 'perdidas';

    // V9.7: Transfer state tracking
    const transferred = isPending && isPendingTransferred(item);
    const pendingReverted = isPending && isPendingReverted(item);
    const fromPending = (isIncome || isLoss) && isFromPendingTransfer(item);
    const incomeOrLossReverted = (isIncome || isLoss) && isIncomeOrLossReverted(item);

    // Transfer meta for pending items
    // Transfer button for pending items (not already transferred or reverted-back)
    const showTransferBtn = showActions && !isOtrosView && isPending && !transferred;
    const transferDisabled = FACTURERO_OPTIONAL_FIELDS_SUPPORT.pendientes === false;
    const transferTitle = transferDisabled
        ? 'Transferencia no disponible (faltan columnas)'
        : 'Transferir a pagados o pérdidas';

    // V9.7: Row styling for reverted items
    const revertedStyle = incomeOrLossReverted ? 'opacity: 0.5;' : '';
    const itemStyle = `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; ${revertedStyle}`;
    const itemId = tabName === 'otros' ? (item.source_id || item.id) : item.id;
    const itemTab = tabName === 'otros' ? effectiveTabName : tabName;
    const canMoveFromGeneral = isOtrosView && !isOtherTransferredRecord(item) && !normalizeCropId(item?.crop_id);

    const row = document.createElement('div');
    row.className = 'facturero-item';
    row.dataset.id = String(itemId || '');
    row.dataset.tab = String(itemTab || '');
    row.style.cssText = itemStyle;

    const left = document.createElement('div');
    left.style.cssText = 'flex: 1; min-width: 0;';

    const conceptDiv = document.createElement('div');
    conceptDiv.style.cssText = 'color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
    conceptDiv.textContent = displayConcept;
    left.appendChild(conceptDiv);

    if (whoData.who) {
        const whoDiv = document.createElement('div');
        whoDiv.style.cssText = 'color: rgba(255,255,255,0.6); font-size: 0.75rem; margin-top: 2px;';

        const whoMeta = WHO_FIELD_META[effectiveTabName];
        const whoLabel = whoMeta?.label || 'Detalle';
        const whoIcon = whoMeta?.icon || '•';

        const whoPrefix = document.createElement('span');
        whoPrefix.textContent = `• ${whoIcon} ${whoLabel}: `;

        const whoName = document.createElement('span');
        whoName.textContent = whoData.who;
        markBuyerNameNode(whoName, whoData.who);

        whoDiv.append(whoPrefix, whoName);
        left.appendChild(whoDiv);
    }

    if (sourceLabel) {
        const sourceDiv = document.createElement('div');
        sourceDiv.className = 'facturero-meta';
        sourceDiv.textContent = `Tipo: ${sourceLabel}`;
        left.appendChild(sourceDiv);
    }

    if (unitText) {
        const unitDiv = document.createElement('div');
        unitDiv.className = 'facturero-meta';
        unitDiv.textContent = unitText;
        left.appendChild(unitDiv);
    }

    const splitSummaryText = formatSplitMetaSummary(item, effectiveTabName, { mode: 'ui' });
    if (splitSummaryText) {
        const splitDiv = document.createElement('div');
        splitDiv.className = 'facturero-meta facturero-transfer-meta facturero-split-meta';
        splitDiv.textContent = splitSummaryText;
        left.appendChild(splitDiv);
    }

    if (transferred || pendingReverted) {
        const transferDiv = document.createElement('div');
        transferDiv.className = pendingReverted
            ? 'facturero-meta facturero-transfer-meta facturero-reverted-meta'
            : 'facturero-meta facturero-transfer-meta';
        transferDiv.textContent = formatTransferMeta(item);
        left.appendChild(transferDiv);
    }

    if (isOtrosView && item?.other_transfer_state === 'transferred') {
        const otherTransferDiv = document.createElement('div');
        otherTransferDiv.className = 'facturero-meta facturero-transfer-meta';
        otherTransferDiv.textContent = formatOtherTransferMeta(item);
        left.appendChild(otherTransferDiv);
    }

    if (fromPending) {
        const originBadge = document.createElement('div');
        originBadge.className = 'facturero-origin-badge';
        const badge = document.createElement('span');
        if (incomeOrLossReverted) {
            badge.className = 'transfer-badge transfer-badge-reverted';
            badge.textContent = 'Revertido';
        } else {
            badge.className = 'transfer-badge transfer-badge-origin';
            badge.textContent = `Transferido desde Fiados • ${isLoss ? 'Cancelado' : 'Pagado'}`;
        }
        originBadge.appendChild(badge);
        left.appendChild(originBadge);
    } else if (effectiveTabName === 'ingresos') {
        const originBadge = document.createElement('div');
        originBadge.className = 'facturero-origin-badge';
        const meta = document.createElement('div');
        meta.className = 'facturero-meta facturero-transfer-meta facturero-origin-meta';
        meta.textContent = 'Contado • Pagado';
        originBadge.appendChild(meta);
        left.appendChild(originBadge);
    }

    const metaRow = document.createElement('div');
    metaRow.style.cssText = 'color: var(--text-muted); font-size: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;';

    const dateSpan = document.createElement('span');
    dateSpan.textContent = formatDate(date);
    metaRow.appendChild(dateSpan);

    const cropSpan = document.createElement('span');
    cropSpan.style.color = 'var(--gold-primary)';
    cropSpan.textContent = `• ${cropLabel}`;
    metaRow.appendChild(cropSpan);

    if (evidenceLink) {
        const evidenceSpan = document.createElement('span');
        evidenceSpan.appendChild(evidenceLink);
        metaRow.appendChild(evidenceSpan);
    }

    left.appendChild(metaRow);
    row.appendChild(left);

    const right = document.createElement('div');
    right.style.cssText = 'display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;';

    const amountSpan = document.createElement('span');
    amountSpan.style.cssText = `color: ${effectiveTabName === 'perdidas' ? '#ef4444' : '#4ade80'}; font-weight: 700; font-size: 0.9rem;`;
    amountSpan.textContent = _fmtItemCurrency(item, rowConfig, amount);
    markMoneyNode(amountSpan, amountSpan.textContent);
    right.appendChild(amountSpan);

    if (showActions) {
        right.appendChild(createFactureroActionButton({
            className: 'btn-edit-facturero',
            tab: itemTab,
            id: itemId,
            title: 'Editar',
            borderColor: 'rgba(96,165,250,0.3)',
            color: '#60a5fa',
            iconClass: 'fa fa-pen'
        }));

        right.appendChild(createFactureroActionButton({
            className: 'btn-duplicate-facturero',
            tab: itemTab,
            id: itemId,
            title: 'Duplicar a otro cultivo',
            borderColor: 'rgba(200,167,82,0.35)',
            color: '#C8A752',
            iconClass: 'fa fa-copy'
        }));

        if (canMoveFromGeneral) {
            right.appendChild(createFactureroActionButton({
                className: 'btn-move-general',
                tab: itemTab,
                id: itemId,
                title: 'Mover a cultivo',
                borderColor: 'rgba(200,167,82,0.5)',
                color: '#C8A752',
                iconClass: 'fa fa-arrow-right-long'
            }));
        }

        if (showTransferBtn) {
            right.appendChild(createFactureroActionButton({
                className: 'btn-transfer-pending',
                tab: effectiveTabName,
                id: item.id,
                title: transferTitle,
                borderColor: 'rgba(200,167,82,0.5)',
                color: '#C8A752',
                iconClass: 'fa fa-arrow-right-long',
                disabled: transferDisabled
            }));
        }

        if (!isOtrosView && isIncome) {
            right.appendChild(createFactureroActionButton({
                className: 'btn-transfer-income',
                tab: effectiveTabName,
                id: item.id,
                title: 'Transferir pagado',
                borderColor: 'rgba(200,167,82,0.5)',
                color: '#C8A752',
                iconClass: 'fa fa-arrow-right-long'
            }));
        }

        if (!isOtrosView && isLoss) {
            right.appendChild(createFactureroActionButton({
                className: 'btn-transfer-loss',
                tab: effectiveTabName,
                id: item.id,
                title: 'Transferir pérdida',
                borderColor: 'rgba(200,167,82,0.5)',
                color: '#C8A752',
                iconClass: 'fa fa-arrow-right-long'
            }));
        }

        if (!isOtrosView && fromPending && !incomeOrLossReverted) {
            right.appendChild(createFactureroActionButton({
                className: isIncome ? 'btn-revert-income' : 'btn-revert-loss',
                tab: effectiveTabName,
                id: item.id,
                title: 'Devolver a Fiados',
                borderColor: 'rgba(251,191,36,0.5)',
                color: '#fbbf24',
                iconClass: 'fa fa-undo'
            }));
        }

        right.appendChild(createFactureroActionButton({
            className: 'btn-delete-facturero',
            tab: itemTab,
            id: itemId,
            title: 'Eliminar',
            borderColor: 'rgba(239,68,68,0.3)',
            color: '#ef4444',
            iconClass: 'fa fa-trash'
        }));
    }

    row.appendChild(right);
    return row;
}

function renderHistoryRowFallback(item, config) {
    const conceptField = config?.conceptField || 'concepto';
    const amountField = config?.amountField || 'monto';
    const dateField = config?.dateField || 'fecha';
    const concept = item?.[conceptField] || item?.concepto || item?.concept || 'Sin concepto';
    const amountRaw = item?.[amountField] ?? item?.monto ?? item?.amount ?? 0;
    const amountNum = Number(amountRaw);
    const amount = Number.isFinite(amountNum) ? amountNum : 0;
    const date = item?.[dateField] || item?.fecha || item?.date || item?.created_at || '';

    const row = document.createElement('div');
    row.className = 'facturero-item';
    row.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;';

    const left = document.createElement('div');
    left.style.cssText = 'flex: 1; min-width: 0;';

    const conceptDiv = document.createElement('div');
    conceptDiv.style.cssText = 'color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
    conceptDiv.textContent = concept;
    left.appendChild(conceptDiv);

    const dateDiv = document.createElement('div');
    dateDiv.style.cssText = 'color: var(--text-muted); font-size: 0.75rem;';
    dateDiv.textContent = formatDate(date);
    left.appendChild(dateDiv);

    const amountSpan = document.createElement('span');
    amountSpan.style.cssText = 'color: #4ade80; font-weight: 700; font-size: 0.9rem;';
    amountSpan.textContent = `$${amount.toFixed(2)}`;
    markMoneyNode(amountSpan, amountSpan.textContent);

    row.append(left, amountSpan);
    return row;
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
    add('currency');
    add('exchange_rate');
    add('monto_usd');
    (config?.extraFields || []).forEach(add);
    const optional = getFactureroOptionalFields(tabName);
    (optional || []).forEach(add);
    (FACTURERO_EVIDENCE_FIELDS[tabName] || []).forEach(add);
    const splitSupport = FACTURERO_SPLIT_FIELDS_SUPPORT[tabName];
    if (config?.table && config?.compositeOnly !== true && splitSupport !== false) {
        FACTURERO_SPLIT_FIELDS.forEach(add);
    }
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
    const disabled = FACTURERO_OPTIONAL_FIELDS_DISABLED[tabName];
    if (!(disabled instanceof Set) || disabled.size === 0) return optional;
    return optional.filter((field) => !disabled.has(field));
}

function isFactureroOptionalFieldEnabled(tabName, fieldName) {
    if (!tabName || !fieldName) return false;
    const optional = FACTURERO_OPTIONAL_FIELDS[tabName] || [];
    if (!optional.includes(fieldName)) return false;
    if (FACTURERO_OPTIONAL_FIELDS_SUPPORT[tabName] === false) return false;
    const disabled = FACTURERO_OPTIONAL_FIELDS_DISABLED[tabName];
    return !(disabled instanceof Set && disabled.has(fieldName));
}

function disableMissingOptionalFields(tabName, error) {
    if (!tabName || !error) return false;
    if (FACTURERO_OPTIONAL_FIELDS_SUPPORT[tabName] === false) return false;
    const optional = FACTURERO_OPTIONAL_FIELDS[tabName] || [];
    if (!optional.length) return false;
    const disabled = FACTURERO_OPTIONAL_FIELDS_DISABLED[tabName];
    if (!(disabled instanceof Set)) return false;
    let changed = false;
    optional.forEach((field) => {
        if (isMissingColumnError(error, field) && !disabled.has(field)) {
            disabled.add(field);
            changed = true;
        }
    });
    return changed;
}

function hasMissingSplitColumns(error) {
    return FACTURERO_SPLIT_FIELDS.some((field) => isMissingColumnError(error, field));
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
    if (opsContextMode !== 'cultivos') return items;
    if (!selectedCropId) return items;
    return items.filter((item) => normalizeCropId(item?.crop_id) === selectedCropId);
}

/**
 * V9.5.1: Refreshes facturero history for a specific tab with CRUD buttons
 * @param {string} tabName - 'gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias', 'otros'
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

function applyFactureroCropMode(query, cropMode = 'selected') {
    if (!query) return query;
    if (cropMode === 'null') {
        return query.is('crop_id', null);
    }
    if (opsContextMode !== 'cultivos') {
        return query;
    }
    if (cropMode === 'selected' && selectedCropId) {
        return query.eq('crop_id', selectedCropId);
    }
    return query;
}

async function fetchAgroLosses(supabase, userId, options = {}) {
    const cropMode = options.cropMode || 'selected';
    const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : FACTURERO_HISTORY_FETCH_LIMIT;

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
                .limit(limit);
            q = applyFactureroCropMode(q, cropMode);
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

async function fetchFactureroRowsByTab(tabName, userId, options = {}) {
    const config = FACTURERO_CONFIG[tabName];
    if (!config || !config.table || config.compositeOnly) return [];

    const cropMode = options.cropMode || 'selected';
    const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : FACTURERO_HISTORY_FETCH_LIMIT;

    // V9.6: Use smart retry for losses to avoid 400 on missing deleted_at
    if (tabName === 'perdidas') {
        return fetchAgroLosses(supabase, userId, { cropMode, limit });
    }

    const selectFields = buildFactureroSelectFields(tabName, config);
    const selectClause = buildFactureroSelectClause(selectFields);

    const buildQuery = (clause) => {
        const orderField = config.dateField || 'fecha';
        let q = supabase
            .from(config.table)
            .select(clause)
            .eq('user_id', userId);
        q = applyFactureroCropMode(q, cropMode);
        q = q
            .order(orderField, { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);
        if (config.supportsDeletedAt) {
            q = q.is('deleted_at', null);
        }
        return q;
    };

    let data = null;
    let error = null;
    let retries = 0;

    do {
        const currentFields = buildFactureroSelectFields(tabName, config);
        const currentClause = buildFactureroSelectClause(currentFields);
        const result = await buildQuery(currentClause);
        data = result.data;
        error = result.error;
        if (!error) break;

        let shouldRetry = false;

        if (hasMissingSplitColumns(error) && FACTURERO_SPLIT_FIELDS_SUPPORT[tabName] !== false) {
            FACTURERO_SPLIT_FIELDS_SUPPORT[tabName] = false;
            shouldRetry = true;
        }

        if (!shouldRetry) {
            const hasMissingOptional = disableMissingOptionalFields(tabName, error);
            if (hasMissingOptional) {
                shouldRetry = true;
            }
        }

        if (!shouldRetry) break;
        retries += 1;
    } while (retries < 3);

    if (error) {
        if (error.message && error.message.toLowerCase().includes('deleted_at')) {
            // Legacy fallback logic for tables without soft-delete
            config.supportsDeletedAt = false;
            console.warn(`[AGRO] V9.5.1: ${tabName} table lacks deleted_at, using hard delete`);
            const fallbackFields = buildFactureroSelectFields(tabName, config);
            const fallbackClause = buildFactureroSelectClause(fallbackFields);
            const fallback = await buildQuery(fallbackClause);
            if (fallback.error) {
                console.error(`[AGRO] V9.5.1: Error fetching ${tabName}:`, fallback.error.message);
                return [];
            }
            return fallback.data || [];
        }

        console.error(`[AGRO] V9.5.1: Error fetching ${tabName}:`, error.message);
        return [];
    }

    if (FACTURERO_OPTIONAL_FIELDS_SUPPORT[tabName] === null) {
        FACTURERO_OPTIONAL_FIELDS_SUPPORT[tabName] = true;
    }
    if (FACTURERO_SPLIT_FIELDS_SUPPORT[tabName] === null) {
        FACTURERO_SPLIT_FIELDS_SUPPORT[tabName] = true;
    }
    return data || [];
}

function normalizeOtherHistoryRow(sourceTab, item, sourceConfig, transferMeta = null) {
    const cfg = sourceConfig || {};
    const conceptField = cfg.conceptField || 'concepto';
    const amountField = cfg.amountField || 'monto';
    const dateField = cfg.dateField || 'fecha';
    const sourceId = item?.id;
    const key = getOtherTransferKey(sourceTab, sourceId);
    const targetCropId = normalizeCropId(transferMeta?.target_crop_id);
    const targetCropName = String(transferMeta?.target_crop_name || '').trim();

    return {
        ...item,
        id: `${sourceTab}:${sourceId}`,
        source_id: sourceId,
        source_tab: sourceTab,
        other_key: key,
        source_label: AGROLOG_TAB_LABELS[sourceTab] || sourceTab,
        concepto: item[conceptField] || item.concepto || item.concept || 'Sin concepto',
        monto: Number(item[amountField] || item.monto || item.amount || 0),
        fecha: item[dateField] || item.fecha || item.date || item.created_at || '',
        other_transfer_state: transferMeta ? 'transferred' : 'active',
        other_transfer_moved_at: transferMeta?.moved_at || '',
        other_transfer_target_id: targetCropId || normalizeCropId(item?.crop_id),
        other_transfer_target_name: targetCropName || ''
    };
}

async function fetchOtherTransferredRows(userId, historyMap) {
    const historyEntries = Array.from(historyMap.values());
    if (historyEntries.length === 0) return [];

    const entriesByTab = new Map();
    historyEntries.forEach((entry) => {
        const sourceTab = String(entry?.source_tab || '').trim();
        const sourceId = String(entry?.source_id || '').trim();
        if (!sourceTab || !sourceId) return;
        if (!entriesByTab.has(sourceTab)) entriesByTab.set(sourceTab, []);
        entriesByTab.get(sourceTab).push(entry);
    });

    const groups = await Promise.all(Array.from(entriesByTab.entries()).map(async ([sourceTab, entries]) => {
        const sourceConfig = FACTURERO_CONFIG[sourceTab];
        if (!sourceConfig?.table) return [];

        const ids = entries
            .map((entry) => String(entry.source_id || '').trim())
            .filter(Boolean);
        if (ids.length === 0) return [];

        const selectFields = new Set([
            'id',
            'crop_id',
            'created_at',
            'currency',
            'monto_usd',
            sourceConfig.conceptField,
            sourceConfig.amountField,
            sourceConfig.dateField,
            ...(sourceConfig.extraFields || []),
            ...(FACTURERO_EVIDENCE_FIELDS[sourceTab] || [])
        ]);
        const selectClause = buildFactureroSelectClause(Array.from(selectFields));
        let query = supabase
            .from(sourceConfig.table)
            .select(selectClause)
            .eq('user_id', userId)
            .in('id', ids)
            .order(sourceConfig.dateField || 'fecha', { ascending: false })
            .order('created_at', { ascending: false });
        if (sourceConfig.supportsDeletedAt) {
            query = query.is('deleted_at', null);
        }

        const { data, error } = await query;
        if (error) {
            console.warn(`[AGRO] Failed to load transfer history for otros/${sourceTab}:`, error.message || error);
            return [];
        }

        const rows = Array.isArray(data) ? data : [];
        const enriched = await enrichFactureroItems(sourceTab, rows);
        return enriched
            .map((item) => {
                const key = getOtherTransferKey(sourceTab, item?.id);
                const transferMeta = historyMap.get(key) || null;
                if (!transferMeta) return null;
                return normalizeOtherHistoryRow(sourceTab, item, sourceConfig, transferMeta);
            })
            .filter(Boolean);
    }));

    return groups.flat();
}

async function fetchOtherGeneralRecords(userId) {
    const historyMap = getOtherTransferHistoryMap();
    const groupedRows = await Promise.all(FACTURERO_OTHER_SOURCE_TABS.map(async (sourceTab) => {
        const sourceConfig = FACTURERO_CONFIG[sourceTab];
        const baseRows = await fetchFactureroRowsByTab(sourceTab, userId, {
            cropMode: 'null',
            limit: FACTURERO_OTHER_FETCH_LIMIT
        });
        const rows = Array.isArray(baseRows) ? baseRows : [];
        const enriched = await enrichFactureroItems(sourceTab, rows);
        return enriched.map((item) => normalizeOtherHistoryRow(sourceTab, item, sourceConfig, null));
    }));

    const activeRows = groupedRows.flat();
    const transferredRows = await fetchOtherTransferredRows(userId, historyMap);
    const seen = new Set();
    const mergedRows = [];
    activeRows.forEach((row) => {
        const key = row?.other_key || getOtherTransferKey(row?.source_tab, row?.source_id);
        if (seen.has(key)) return;
        seen.add(key);
        mergedRows.push(row);
    });
    transferredRows.forEach((row) => {
        const key = row?.other_key || getOtherTransferKey(row?.source_tab, row?.source_id);
        if (seen.has(key)) return;
        seen.add(key);
        mergedRows.push(row);
    });

    return mergedRows
        .sort((a, b) => getRowTimestamp(b, 'fecha') - getRowTimestamp(a, 'fecha'))
        .slice(0, FACTURERO_OTHER_RENDER_LIMIT);
}

async function refreshFactureroHistory(tabName, options = {}) {
    const config = FACTURERO_CONFIG[tabName];
    if (!config) {
        console.log('[AGRO] V9.5.1: No config for tab:', tabName);
        return;
    }

    const isOthersTab = tabName === 'otros';
    const { showActions = true } = options;
    const debugEnabled = typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('debug') === '1';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (isOthersTab) {
            const otherItems = await fetchOtherGeneralRecords(user.id);
            if (debugEnabled) {
                console.log('[AGRO] otros row sample', otherItems?.[0]);
            }
            renderHistoryList(tabName, config, otherItems, showActions);
            injectHistorySearchInput(tabName, config);
            return;
        }

        const items = await fetchFactureroRowsByTab(tabName, user.id, {
            cropMode: 'selected',
            limit: FACTURERO_HISTORY_FETCH_LIMIT
        });

        if (debugEnabled) {
            console.log(`[AGRO] ${tabName} row sample`, items?.[0]);
        }

        const enrichedItems = await enrichFactureroItems(tabName, items || []);
        const filteredItems = filterFactureroBySelectedCrop(enrichedItems);
        if (tabName === 'pendientes') {
            pendingCache = filteredItems;
        }
        if (tabName === 'gastos') {
            expenseCache = filteredItems;
        }
        renderHistoryList(tabName, config, filteredItems, showActions);
        injectHistorySearchInput(tabName, config);
        if (tabName === 'pendientes' || tabName === 'perdidas' || tabName === 'transferencias' || tabName === 'gastos' || tabName === 'ingresos') {
            syncFactureroNotifications(tabName, filteredItems);
        }

    } catch (err) {
        console.error(`[AGRO] V9.5.1: Exception in refreshFactureroHistory(${tabName}):`, err.message);
    } finally {
        scheduleOpsMovementSummaryRefresh();
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
    const isOthersTab = tabName === 'otros';
    if (isPendingTab && parent) {
        ensurePendingTransferFilterUI(parent, itemsWithCropNames);
    }
    if (isOthersTab && parent) {
        ensureOtherTransferFilterUI(parent, itemsWithCropNames);
    }

    const filteredItems = isPendingTab
        ? applyPendingTransferFilter(itemsWithCropNames)
        : (isOthersTab ? applyOtherTransferFilter(itemsWithCropNames) : itemsWithCropNames);

    // V9.6.3: Ensure parent container is visible when items exist
    if (parent) {
        const keepVisibleForTransferFilter = (isPendingTab || isOthersTab) && itemsWithCropNames.length > 0;
        parent.style.display = (filteredItems.length > 0 || keepVisibleForTransferFilter) ? 'block' : 'none';
    }

    if (filteredItems.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.cssText = 'color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;';
        if (isPendingTab && itemsWithCropNames.length > 0) {
            emptyMsg.textContent = 'No hay fiados visibles. Activa "Ver transferidos" o "Ver revertidos" para mostrarlos.';
        } else if (isOthersTab && itemsWithCropNames.length > 0) {
            emptyMsg.textContent = 'No hay movimientos visibles. Activa "Ver transferidos" o "Ver revertidos" para mostrarlos.';
        } else {
            emptyMsg.textContent = 'Sin registros recientes.';
        }
        container.replaceChildren(emptyMsg);
    } else {
        // V9.6.7: Group by day and render with headers
        const dateField = config.dateField || 'fecha';
        const dayGroups = groupRowsByDay(filteredItems, dateField);

        const fragment = document.createDocumentFragment();
        const canExport = tabName !== 'otros';
        // V9.6.3: Export button (Wizard button moved to Form Header)
        if (canExport) {
            const exportWrap = document.createElement('div');
            exportWrap.style.cssText = 'text-align: right; margin-bottom: 0.5rem;';

            const exportBtn = document.createElement('button');
            exportBtn.type = 'button';
            exportBtn.title = 'Exportar historial Markdown';
            exportBtn.style.cssText = 'background: transparent; border: 1px solid rgba(200,167,82,0.6); color: #C8A752; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 4px;';
            exportBtn.addEventListener('click', () => exportAgroLog(tabName));

            const icon = document.createElement('i');
            icon.className = 'fa fa-file-arrow-down';
            const label = document.createElement('span');
            label.textContent = 'Exportar MD';
            exportBtn.append(icon, label);
            exportWrap.appendChild(exportBtn);
            fragment.appendChild(exportWrap);
        }

        for (const group of dayGroups) {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'facturero-day-header';
            dayHeader.textContent = String(group.label || '');
            fragment.appendChild(dayHeader);

            group.rows.forEach((item) => {
                try {
                    const rowEl = renderHistoryRow(tabName, item, config, { showActions });
                    if (rowEl) fragment.appendChild(rowEl);
                } catch (err) {
                    console.warn(`[AGRO] Failed to render ${tabName} row ${item?.id || 'n/a'}:`, err?.message || err);
                    const fallbackEl = renderHistoryRowFallback(item, config);
                    if (fallbackEl) fragment.appendChild(fallbackEl);
                }
            });
        }
        container.replaceChildren(fragment);
    }

    console.info(`[AGRO] V9.6.7: Refreshed ${tabName} with ${filteredItems.length} items grouped by day`);
}

// ============================================================
// V9.8: FACTURERO SEARCH FILTER (client-side)
// ============================================================

const _searchNormalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function injectHistorySearchInput(tabName, config) {
    const container = document.getElementById(config.listId);
    if (!container) return;
    const items = container.querySelectorAll('.facturero-item');
    if (items.length === 0) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'facturero-search-wrapper';
    wrapper.style.cssText = 'margin-bottom: 0.5rem;';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'facturero-search-input';
    input.placeholder = '\uD83D\uDD0D Buscar por nombre, cultivo o monto...';
    input.style.cssText = "width:100%;min-height:48px;background:#0B0C0F;border:1px solid #C8A752;border-radius:8px;padding:10px 14px;color:#fff;font-family:'Rajdhani',sans-serif;font-size:0.95rem;box-sizing:border-box;outline:none;";
    input.style.setProperty('--placeholder-color', '#888');
    input.addEventListener('focus', () => {
        input.style.boxShadow = '0 0 8px rgba(200,167,82,0.3)';
    });
    input.addEventListener('blur', () => {
        input.style.boxShadow = 'none';
    });
    wrapper.appendChild(input);

    const exportDiv = container.querySelector('div[style*="text-align: right"]');
    if (exportDiv) { exportDiv.after(wrapper); } else { container.prepend(wrapper); }

    input.addEventListener('input', () => {
        const query = _searchNormalize(input.value.trim());
        const allItems = container.querySelectorAll('.facturero-item');
        const dayHeaders = container.querySelectorAll('.facturero-day-header');
        let totalVisible = 0;

        allItems.forEach(item => {
            const match = !query || _searchNormalize(item.textContent || '').includes(query);
            item.style.display = match ? '' : 'none';
            if (match) totalVisible++;
        });

        dayHeaders.forEach(header => {
            let next = header.nextElementSibling;
            let hasVisible = false;
            while (next && !next.classList.contains('facturero-day-header') && !next.classList.contains('facturero-search-wrapper')) {
                if (next.classList.contains('facturero-item') && next.style.display !== 'none') hasVisible = true;
                next = next.nextElementSibling;
            }
            header.style.display = hasVisible ? '' : 'none';
        });

        let noRes = container.querySelector('.facturero-no-results');
        if (query && totalVisible === 0) {
            if (!noRes) {
                noRes = document.createElement('p');
                noRes.className = 'facturero-no-results';
                noRes.style.cssText = 'color:#888;font-size:0.85rem;text-align:center;padding:1rem;';
                wrapper.after(noRes);
            }
            noRes.textContent = `Sin resultados para "${input.value.trim()}"`;
            noRes.style.display = 'block';
        } else if (noRes) {
            noRes.style.display = 'none';
        }
    });
}

function resetHistorySearch() {
    document.querySelectorAll('.facturero-search-input').forEach(el => {
        if (el.value) { el.value = ''; el.dispatchEvent(new Event('input')); }
    });
}

// ============================================================
// V9.6.3: AGROLOG EXPORT — Markdown history download
// ============================================================

const AGROLOG_TAB_LABELS = {
    gastos: 'Gastos',
    ingresos: 'Pagados',
    pendientes: 'Fiados',
    perdidas: 'Pérdidas',
    transferencias: 'Donaciones',
    otros: 'Otros'
};

async function exportAgroLog(tabName) {
    const config = FACTURERO_CONFIG[tabName];
    if (!config) return;
    if (!config.table) {
        alert('La exportación no está disponible para esta vista.');
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert('Sesión no válida.'); return; }

        // Get crop name
        let cropLabel = 'Vista General — Todos los cultivos + sin cultivo';
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
        const runExportQuery = (clause) => {
            let query = supabase
                .from(config.table)
                .select(clause)
                .eq('user_id', user.id)
                .order(config.dateField || 'fecha', { ascending: false })
                .order('created_at', { ascending: false });
            if (selectedCropId) query = query.eq('crop_id', selectedCropId);
            if (config.supportsDeletedAt) query = query.is('deleted_at', null);
            if (tabName === 'pendientes' && isFactureroOptionalFieldEnabled('pendientes', 'transfer_state')) {
                query = query.neq('transfer_state', 'transferred');
            }
            return query;
        };

        let data = null;
        let error = null;
        let retries = 0;
        do {
            const currentFields = buildFactureroSelectFields(tabName, config);
            const currentClause = buildFactureroSelectClause(currentFields);
            const result = await runExportQuery(currentClause);
            data = result.data;
            error = result.error;
            if (!error) break;

            let shouldRetry = false;
            if (hasMissingSplitColumns(error) && FACTURERO_SPLIT_FIELDS_SUPPORT[tabName] !== false) {
                FACTURERO_SPLIT_FIELDS_SUPPORT[tabName] = false;
                shouldRetry = true;
            }

            if (!shouldRetry) {
                const hasMissingOptional = disableMissingOptionalFields(tabName, error);
                if (hasMissingOptional) {
                    shouldRetry = true;
                }
            }

            if (!shouldRetry) break;
            retries += 1;
        } while (retries < 3);

        if (error) { console.error('[AgroLog] fetch error:', error); alert('Error cargando datos.'); return; }
        const items = Array.isArray(data) ? data : [];
        if (items.length === 0) { alert('No hay registros para exportar.'); return; }
        const hasSplitInfo = items.some((item) => !!formatSplitMetaSummary(item, tabName, { mode: 'md' }));

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

        // Summary — always in USD
        const usdField = 'monto_usd';
        const totalMontoUsd = items.reduce((s, it) => s + (Number(it[usdField]) || Number(it[config.amountField]) || 0), 0);
        md += `## 📊 Resumen\n`;
        md += `- **Total Registros:** ${items.length}\n`;
        md += `- **Monto Total (USD):** $${totalMontoUsd.toFixed(2)}\n\n`;
        md += `---\n\n`;

        // Table header — build dynamic columns
        const whoMeta = WHO_FIELD_META[tabName];
        const whoLabel = whoMeta ? whoMeta.label : null;
        const hasUnits = (config.extraFields || []).includes('unit_type');

        let header = '| ✓ | Fecha | Concepto';
        let separator = '|:-:|-------|--------';
        if (whoLabel) { header += ` | ${whoLabel}`; separator += '|--------'; }
        if (hasUnits) { header += ' | Cantidad'; separator += '|---------'; }
        header += ' | Moneda | Monto | USD | Evidencia';
        separator += '|------:|------:|----:|-----------';
        if (hasSplitInfo) {
            header += ' | Split';
            separator += '|------';
        }
        header += ' |';
        separator += '|';
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
            const currency = item.currency || 'USD';
            const amtUsd = Number(item[usdField] || item[config.amountField] || 0).toFixed(2);

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
            const splitRaw = hasSplitInfo ? formatSplitMetaSummary(item, tabName, { mode: 'md' }) : '';
            const splitText = splitRaw ? splitRaw.replace(/\|/g, '·') : '-';

            let row = `| [ ] | ${fecha} | ${concept}`;
            if (whoLabel) row += ` | ${who || '-'}`;
            if (hasUnits) row += ` | ${unitText}`;
            row += ` | ${currency} | ${amount} | $${amtUsd} | ${evidenceText}`;
            if (hasSplitInfo) row += ` | ${splitText}`;
            row += ' |';
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
async function pickWizardTabForGeneral() {
    return showTransferChoiceModal({
        title: 'Registrar movimiento general',
        choices: [
            { value: 'gastos', label: 'Gasto general' },
            { value: 'ingresos', label: 'Pagado general' },
            { value: 'pendientes', label: 'Fiado general' },
            { value: 'perdidas', label: 'Pérdida general' },
            { value: 'transferencias', label: 'Donación general' }
        ]
    });
}

async function launchAgroWizard(tabName, options = {}) {
    const wizardOptions = options && typeof options === 'object' ? options : {};
    let targetTab = tabName;
    let forcedCropId;
    let lockCropSelection = false;
    const refreshAlsoTabs = [];

    if (tabName === 'otros') {
        const pickedTab = await pickWizardTabForGeneral();
        if (!pickedTab) return;
        targetTab = pickedTab;
        forcedCropId = null;
        lockCropSelection = true;
        refreshAlsoTabs.push('otros');
    }

    if (Object.prototype.hasOwnProperty.call(wizardOptions, 'forcedCropId')) {
        forcedCropId = normalizeCropId(wizardOptions.forcedCropId);
    }
    if (Object.prototype.hasOwnProperty.call(wizardOptions, 'lockCropSelection')) {
        lockCropSelection = wizardOptions.lockCropSelection === true;
    }
    if (Array.isArray(wizardOptions.refreshAlsoTabs)) {
        wizardOptions.refreshAlsoTabs
            .map((tab) => String(tab || '').trim())
            .filter(Boolean)
            .forEach((tab) => refreshAlsoTabs.push(tab));
    }
    const prefill = wizardOptions.prefill && typeof wizardOptions.prefill === 'object'
        ? wizardOptions.prefill
        : null;

    openAgroWizard(targetTab, {
        supabase,
        cropsCache,
        selectedCropId,
        refreshFactureroHistory,
        loadIncomes: typeof loadIncomes === 'function' ? loadIncomes : null,
        getTodayLocalISO: typeof getTodayLocalISO === 'function' ? getTodayLocalISO : null,
        buildConceptWithWho,
        forcedCropId,
        lockCropSelection,
        refreshAlsoTabs,
        prefill
    });
}

function createWizardButton(tabName) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wizard-trigger-btn';
    btn.replaceChildren();
    const plusIcon = document.createElement('i');
    plusIcon.className = 'fa fa-plus';
    btn.append(plusIcon, document.createTextNode(' Nuevo'));
    btn.title = 'Registro guiado';
    btn.style.cssText = `
        background: linear-gradient(135deg, rgba(200,167,82,0.2), rgba(200,167,82,0.1));
        border: 1px solid rgba(200,167,82,0.5);
        color: #C8A752;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        cursor: pointer;
        font-family: inherit;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        margin-right: 10px;
        font-weight: 600;
        transition: all 0.2s;
    `;
    btn.onmouseover = () => {
        btn.style.background = 'linear-gradient(135deg, rgba(200,167,82,0.3), rgba(200,167,82,0.15))';
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 2px 8px rgba(200,167,82,0.2)';
    };
    btn.onmouseout = () => {
        btn.style.background = 'linear-gradient(135deg, rgba(200,167,82,0.2), rgba(200,167,82,0.1))';
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
    };
    btn.onclick = (e) => {
        e.stopPropagation(); // Prevent accordion toggle
        e.preventDefault();
        launchAgroWizard(tabName);
    };
    return btn;
}

function injectWizardInvokers() {
    // Static tabs with Accordion Summaries
    const config = [
        { tab: 'gastos', selector: '#tab-panel-gastos .yg-accordion-summary' },
        { tab: 'ingresos', selector: '#tab-panel-ingresos .yg-accordion-summary' },
        { tab: 'pendientes', selector: '#tab-panel-pendientes .yg-accordion-summary' },
        { tab: 'perdidas', selector: '#tab-panel-perdidas .yg-accordion-summary' },
        { tab: 'transferencias', selector: '#tab-panel-transferencias .yg-accordion-summary' },
        { tab: 'otros', selector: '#tab-panel-otros .yg-accordion-summary' }
    ];

    config.forEach(({ tab, selector }) => {
        const summary = document.querySelector(selector);
        if (summary && !summary.querySelector('.wizard-trigger-btn')) {
            const btn = createWizardButton(tab);
            // Insert before the chevron (last child)
            const chevron = summary.querySelector('.yg-accordion-chevron');
            if (chevron) {
                summary.insertBefore(btn, chevron);
            } else {
                summary.appendChild(btn);
            }
        }
    });
}

async function refreshFactureroAfterChange(tabName) {
    const refreshPromises = [];
    if (tabName === 'ingresos') {
        refreshPromises.push(refreshFactureroHistory('ingresos'));
        document.dispatchEvent(new CustomEvent('agro:income:changed'));
    } else if (tabName) {
        refreshPromises.push(refreshFactureroHistory(tabName));
    }
    refreshPromises.push(refreshFactureroHistory('otros'));
    await Promise.all(refreshPromises);

    const impactsCropCards = tabName === 'gastos'
        || tabName === 'ingresos'
        || tabName === 'pendientes'
        || tabName === 'perdidas';
    if (impactsCropCards) {
        document.dispatchEvent(new CustomEvent(AGRO_CROPS_REFRESH_EVENT, {
            detail: { source: 'facturero', tab: tabName }
        }));
    }
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
    const expenseConceptMeta = tabName === 'gastos'
        ? parseExpenseConceptUnitMeta(rawConcept)
        : null;
    const whoData = getWhoData(tabName, item, rawConcept);
    document.getElementById('edit-concepto').value = expenseConceptMeta
        ? (expenseConceptMeta.concept || '')
        : (whoData.concept || rawConcept);
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

    // V9.8: Multi-currency edit — populate selector and wire listeners
    const itemCurrency = item.currency || 'USD';
    const itemRate = Number(item.exchange_rate) || 1;
    _setupEditCurrencySelector(itemCurrency, itemRate);

    // Handle extra fields
    const extraContainer = document.getElementById('edit-extra-fields');
    if (extraContainer) {
        extraContainer.replaceChildren();
        const extraFields = getFactureroEditFields(config, whoMeta?.field);
        extraFields.forEach(field => {
            const meta = FACTURERO_EXTRA_FIELD_META[field];
            const value = (expenseConceptMeta && Object.prototype.hasOwnProperty.call(expenseConceptMeta, field))
                ? (expenseConceptMeta[field] ?? '')
                : (item[field] ?? '');
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
        'ingresos': 'Editar Pagado',
        'pendientes': 'Editar Fiado',
        'perdidas': 'Editar Pérdida',
        'transferencias': 'Editar Donación'
    };
    const titleEl = document.getElementById('edit-modal-title');
    if (titleEl) titleEl.textContent = titles[tabName] || 'Editar Registro';

    modal.style.display = 'flex';
}

// V9.8: Multi-currency edit helpers
let _editCurrency = 'USD';
let _editExchangeRate = 1;

function _setupEditCurrencySelector(currency, rate) {
    _editCurrency = currency;
    _editExchangeRate = rate;

    const container = document.getElementById('edit-currency-selector');
    if (!container) return;
    container.replaceChildren();

    // Fetch rates in background (non-blocking)
    initExchangeRates().then(r => { if (r) editExchangeRates = r; }).catch(() => { });

    Object.entries(SUPPORTED_CURRENCIES).forEach(([code, cfg]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.currency = code;
        btn.style.cssText = `
            background: ${code === currency ? 'rgba(200,167,82,0.15)' : 'rgba(255,255,255,0.04)'};
            border: 1px solid ${code === currency ? '#C8A752' : 'rgba(200,167,82,0.2)'};
            border-radius: 10px;
            padding: 0.5rem;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s;
            min-height: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.15rem;
        `;
        const flag = document.createElement('span');
        flag.style.fontSize = '1.2rem';
        flag.textContent = cfg.flag;
        const label = document.createElement('span');
        label.style.cssText = 'color: #fff; font-size: 0.75rem;';
        label.textContent = code === 'VES' ? 'Bs' : code;
        btn.append(flag, label);

        btn.addEventListener('click', () => {
            _editCurrency = code;
            if (code === 'USD') {
                _editExchangeRate = 1;
            } else {
                _editExchangeRate = getRate(code, editExchangeRates) || _editExchangeRate || 0;
            }
            // Update button selection styles
            container.querySelectorAll('button').forEach(b => {
                const sel = b.dataset.currency === code;
                b.style.background = sel ? 'rgba(200,167,82,0.15)' : 'rgba(255,255,255,0.04)';
                b.style.borderColor = sel ? '#C8A752' : 'rgba(200,167,82,0.2)';
            });
            _updateEditRateUI();
        });
        container.appendChild(btn);
    });

    // Set initial rate input value
    const rateInput = document.getElementById('edit-exchange-rate');
    if (rateInput) {
        rateInput.value = currency !== 'USD' ? (rate || '') : '';
        rateInput.removeEventListener('input', _onEditRateInput);
        rateInput.addEventListener('input', _onEditRateInput);
    }

    // Monto input listener for live conversion
    const montoInput = document.getElementById('edit-monto');
    if (montoInput) {
        montoInput.removeEventListener('input', _onEditMontoInput);
        montoInput.addEventListener('input', _onEditMontoInput);
    }

    _updateEditRateUI();
}

function _onEditRateInput() {
    const rateInput = document.getElementById('edit-exchange-rate');
    if (rateInput) _editExchangeRate = Number(rateInput.value) || 0;
    _updateEditConversionPreview();
}

function _onEditMontoInput() {
    _updateEditConversionPreview();
}

function _updateEditRateUI() {
    const rateGroup = document.getElementById('edit-rate-group');
    const rateLabel = document.getElementById('edit-rate-label');
    const rateInput = document.getElementById('edit-exchange-rate');

    if (_editCurrency === 'USD') {
        if (rateGroup) rateGroup.style.display = 'none';
        _editExchangeRate = 1;
    } else {
        if (rateGroup) rateGroup.style.display = 'block';
        const overrideActive = hasOverride(_editCurrency);
        if (rateLabel) rateLabel.textContent = `Tasa ${_editCurrency}/USD ${overrideActive ? '(manual)' : '(mercado)'}`;
        if (rateInput) rateInput.value = _editExchangeRate || '';
    }
    _updateEditConversionPreview();
}

function _updateEditConversionPreview() {
    const preview = document.getElementById('edit-conversion-preview');
    if (!preview) return;
    if (_editCurrency === 'USD') {
        preview.textContent = '';
        return;
    }
    const monto = Number(document.getElementById('edit-monto')?.value) || 0;
    const rate = _editExchangeRate || 0;
    const usd = rate > 0 ? (monto / rate).toFixed(2) : '\u2014';
    preview.replaceChildren();
    const amount = document.createElement('span');
    amount.style.color = '#C8A752';
    amount.textContent = `\u2248 $${usd} USD`;
    const detail = document.createElement('span');
    detail.style.cssText = 'color:rgba(255,255,255,0.4);font-size:0.75rem;';
    detail.textContent = ` (tasa: 1 USD = ${rate ? Number(rate).toLocaleString() : '\u2014'} ${_editCurrency})`;
    preview.append(amount, detail);
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
        if (tabName === 'gastos') {
            const unitTypeUi = document.getElementById('edit-unit_type')?.value || '';
            const unitQtyUi = document.getElementById('edit-unit_qty')?.value || '';
            const quantityKgUi = document.getElementById('edit-quantity_kg')?.value || '';
            conceptForSave = buildExpenseConceptWithUnitMeta(conceptValue, unitTypeUi, unitQtyUi, quantityKgUi);
        }

        // V9.6.6: Validate date before update
        const editDateValue = document.getElementById('edit-fecha')?.value;
        const dateCheck = assertDateNotFuture(editDateValue, 'Fecha');
        if (!dateCheck.valid) {
            alert(dateCheck.error);
            return;
        }

        const editedMonto = parseFloat(document.getElementById('edit-monto')?.value) || 0;

        // V9.8: Compute monto_usd from currency state
        const editCurrency = _editCurrency || 'USD';
        const editRate = _editExchangeRate || 1;
        const editMontoUsd = editCurrency === 'USD' ? editedMonto : convertToUSD(editedMonto, editCurrency, editRate);

        const updateData = {
            [config.conceptField]: conceptForSave,
            [config.amountField]: editedMonto,
            [config.dateField]: editDateValue,
            crop_id: document.getElementById('edit-crop-id')?.value || null,
            currency: editCurrency,
            exchange_rate: editRate,
            monto_usd: editMontoUsd
        };

        // UX rule: category is internal and depends on crop linkage.
        if (tabName === 'gastos') {
            updateData.category = updateData.crop_id ? 'operativo' : 'general';
        }

        if (whoMeta?.field) {
            updateData[whoMeta.field] = whoValue || null;
        }

        // Add extra fields
        getFactureroEditFields(config, whoMeta?.field)
            .forEach(field => {
                if (tabName === 'gastos' && (field === 'unit_type' || field === 'unit_qty' || field === 'quantity_kg')) {
                    return;
                }
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

        // Lote 2: Si el movimiento viene de Fiados y el usuario reduce monto/cantidad en edición,
        // aplicar reversión parcial append-only en lugar de edición destructiva.
        if (tabName === 'ingresos' || tabName === 'perdidas') {
            const sourceTable = tabName === 'ingresos' ? 'agro_income' : 'agro_losses';
            const sourceColumns = tabName === 'ingresos' ? AGRO_INCOME_REVERT_COLUMNS : AGRO_LOSS_REVERT_COLUMNS;
            const sourceResult = await fetchRevertSourceRecord(sourceTable, itemId, user.id, sourceColumns);
            const sourceRow = sourceResult?.data;
            if (sourceRow && sourceRow.origin_table === 'agro_pending' && !sourceRow.reverted_at && sourceRow.transfer_state !== 'reverted') {
                const originalAmount = toSafeLocaleNumber(sourceRow?.monto) ?? 0;
                const nextAmount = toSafeLocaleNumber(updateData[config.amountField]) ?? originalAmount;
                const originalQty = resolvePendingQuantity(sourceRow);
                const nextQtyRaw = toSafeLocaleNumber(updateData.unit_qty);
                const nextQty = nextQtyRaw !== null ? nextQtyRaw : originalQty.qtyTotal;

                const amountReduced = nextAmount + 1e-9 < originalAmount;
                const qtyReduced = originalQty.qtyTotal !== null
                    && nextQty !== null
                    && nextQty + 1e-9 < originalQty.qtyTotal;

                if (amountReduced || qtyReduced) {
                    const movedAmount = roundNumeric(Math.max(originalAmount - nextAmount, 0), 2);
                    let movedQty = null;
                    const qtyTotalForAuto = originalQty.qtyTotal !== null ? originalQty.qtyTotal : 1;
                    if (originalQty.qtyTotal !== null) {
                        if (qtyReduced) {
                            const qtyPrecision = isIntegerLike(originalQty.qtyTotal) ? 0 : 2;
                            movedQty = roundNumeric(Math.max(originalQty.qtyTotal - nextQty, 0), qtyPrecision);
                        } else if (amountReduced && originalAmount > 0) {
                            const qtyPrecision = isIntegerLike(originalQty.qtyTotal) ? 0 : 2;
                            movedQty = roundNumeric(originalQty.qtyTotal * (movedAmount / originalAmount), qtyPrecision);
                        }
                    }

                    const autoSplit = computePendingSplitDraft(sourceRow, 'income', {
                        unitType: originalQty.unitType || sourceRow.unit_type || updateData.unit_type || 'unidad',
                        qtyTotal: qtyTotalForAuto,
                        quantity: movedQty !== null ? movedQty : qtyTotalForAuto,
                        transferTotal: movedAmount
                    });
                    if (autoSplit.error || !(toSafeLocaleNumber(autoSplit.transferAmount) > 0)) {
                        alert('No se pudo convertir la edición en devolución parcial. Usa el botón "Devolver a Fiados".');
                        return;
                    }

                    const sourceLabel = tabName === 'ingresos' ? 'Pagados' : 'Pérdidas';
                    const movedQtyLabel = formatSplitQuantity(autoSplit.transferUnitQty ?? autoSplit.qtyTransfer, autoSplit.unitType || sourceRow.unit_type || 'unidad');
                    const autoConfirm = confirm(`Detectamos reducción en ${sourceLabel}. Se aplicará devolución parcial append-only (${movedQtyLabel} / ${fmtMoneyUI(autoSplit.transferAmount, normalizeMoneyCurrency(sourceRow?.currency) || 'COP')}) hacia Fiados. ¿Continuar?`);
                    if (!autoConfirm) return;

                    const compensation = await executeCompensationRevertToPending({
                        sourceTable,
                        sourceTab: tabName,
                        sourceRow,
                        userId: user.id,
                        splitDraft: autoSplit,
                        reason: 'Ajuste automático desde edición',
                        decisionDate: editDateValue || getTodayLocalISO()
                    });
                    if (!compensation.success) {
                        throw new Error(compensation.error || 'No se pudo aplicar la devolución parcial automática.');
                    }

                    closeEditModal();
                    await Promise.allSettled([
                        refreshFactureroAfterChange(tabName),
                        refreshFactureroHistory('pendientes'),
                        refreshFactureroHistory('otros'),
                        typeof loadIncomes === 'function' ? loadIncomes() : Promise.resolve()
                    ]);
                    document.dispatchEvent(new CustomEvent('data-refresh'));
                    document.dispatchEvent(new CustomEvent(AGRO_CROPS_REFRESH_EVENT, {
                        detail: { source: 'edit-auto-revert', tab: tabName, id: itemId }
                    }));
                    refreshOpsRankingsIfVisible();
                    scheduleOpsMovementSummaryRefresh();
                    applyBuyerPrivacy(document, readBuyerNamesHidden());
                    if (typeof readMoneyValuesHidden === 'function') {
                        applyMoneyPrivacy(document, readMoneyValuesHidden());
                    } else {
                        applyMoneyPrivacy(document);
                    }
                    await updateStats();
                    notifyFacturero('✅ Ajuste aplicado como devolución parcial append-only.', 'success');
                    return;
                }
            }
        }

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
        ? `\nCultivos disponibles:\n${cropsCache.map((crop) => {
            const displayCrop = getCropDisplayParts(crop);
            return `${crop.id}: ${displayCrop.label}`;
        }).join('\n')}`
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

function promptDestinationCropForGeneralMove(sourceTab) {
    const crops = Array.isArray(cropsCache) ? cropsCache : [];
    if (!crops.length) {
        notifyFacturero('No hay cultivos disponibles para mover este registro.', 'warning');
        return null;
    }

    const cropHint = crops
        .map((crop) => {
            const displayCrop = getCropDisplayParts(crop);
            return `${crop.id}: ${displayCrop.label}`;
        })
        .join('\n');
    const raw = prompt(`ID del cultivo destino para mover este ${AGROLOG_TAB_LABELS[sourceTab] || sourceTab}:\n${cropHint}`);
    if (raw === null) return null;

    const targetId = normalizeCropId(raw);
    if (!targetId) {
        notifyFacturero('Debes indicar un cultivo destino válido.', 'warning');
        return null;
    }

    const match = crops.find((crop) => normalizeCropId(crop?.id) === targetId);
    if (!match) {
        notifyFacturero('El cultivo destino no existe en tu lista actual.', 'warning');
        return null;
    }

    return {
        id: targetId,
        name: String(match.name || 'Cultivo').trim() || 'Cultivo'
    };
}

async function handleMoveGeneralRecord(sourceTab, itemId) {
    const config = FACTURERO_CONFIG[sourceTab];
    if (!config?.table) {
        notifyFacturero('No se puede mover este tipo de registro.', 'warning');
        return;
    }

    const targetCrop = promptDestinationCropForGeneralMove(sourceTab);
    if (!targetCrop) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            notifyFacturero('Sesión expirada. Recarga la página.', 'warning');
            return;
        }

        const selectFields = new Set([
            'id',
            'crop_id',
            config.conceptField || 'concepto',
            config.amountField || 'monto',
            config.dateField || 'fecha'
        ]);
        const selectClause = Array.from(selectFields).join(', ');
        const { data: row, error: fetchError } = await supabase
            .from(config.table)
            .select(selectClause)
            .eq('id', itemId)
            .eq('user_id', user.id)
            .single();
        if (fetchError || !row) {
            throw new Error(fetchError?.message || 'Registro no encontrado.');
        }

        if (normalizeCropId(row.crop_id)) {
            notifyFacturero('Este registro ya no está en General.', 'warning');
            await refreshFactureroHistory('otros');
            return;
        }

        const { error: updateError } = await supabase
            .from(config.table)
            .update({ crop_id: targetCrop.id })
            .eq('id', itemId)
            .eq('user_id', user.id);
        if (updateError) throw updateError;

        upsertOtherTransferHistoryEntry({
            source_tab: sourceTab,
            source_id: itemId,
            target_crop_id: targetCrop.id,
            target_crop_name: targetCrop.name,
            moved_at: new Date().toISOString()
        });

        notifyFacturero(`✅ Registro movido a ${targetCrop.name}.`, 'success');
        await refreshFactureroHistory(sourceTab);
        await refreshFactureroHistory('otros');
        if (normalizeCropId(selectedCropId) === normalizeCropId(targetCrop.id)) {
            refreshFactureroForSelectedCrop();
        }
    } catch (err) {
        console.error('[AGRO] Move general record error:', err.message);
        notifyFacturero(`Error al mover: ${err.message}`, 'warning');
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
    const { overlay, body, footer } = buildTransferWizardShell({
        id: 'pending-transfer-modal',
        title: options.title || 'Transferir',
        stepIndex: options.stepIndex,
        stepTotal: options.stepTotal,
        stepLabel: options.stepLabel || ''
    });

    const content = document.createElement('div');
    content.className = 'pending-transfer-content';
    content.style.display = 'grid';
    content.style.gap = '0.75rem';
    body.appendChild(content);

    const detailRows = Array.isArray(options.rows) ? options.rows : [];
    detailRows.forEach((row) => {
        const line = document.createElement('div');
        line.className = 'pending-transfer-row';
        const label = document.createElement('span');
        label.textContent = row.label || '';
        const value = document.createElement('strong');
        value.textContent = row.value || '-';
        line.append(label, value);
        content.appendChild(line);
    });

    const showConcept = options.showConcept === true;
    const showCategory = options.showCategory !== false;
    const showDate = options.showDate !== false;
    const splitOptions = options.split && typeof options.split === 'object' ? options.split : null;
    const today = getTodayLocalISO();

    if (showConcept) {
        const conceptGroup = document.createElement('div');
        conceptGroup.className = 'input-group';
        const conceptLabel = document.createElement('label');
        conceptLabel.className = 'input-label';
        conceptLabel.textContent = options.conceptLabel || 'Concepto';
        conceptLabel.setAttribute('for', 'pending-transfer-concept');
        const conceptInput = document.createElement('input');
        conceptInput.type = 'text';
        conceptInput.id = 'pending-transfer-concept';
        conceptInput.className = 'styled-input';
        conceptInput.style.paddingLeft = '1rem';
        conceptInput.placeholder = options.conceptPlaceholder || 'Ej: Venta de batata - pagado';
        conceptInput.value = options.defaultConcept || '';
        conceptGroup.append(conceptLabel, conceptInput);
        content.appendChild(conceptGroup);
    }

    if (showCategory) {
        const categoryGroup = document.createElement('div');
        categoryGroup.className = 'input-group';
        const categoryLabel = document.createElement('label');
        categoryLabel.className = 'input-label';
        categoryLabel.textContent = options.categoryLabel || 'Categoría pagado';
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
        content.appendChild(categoryGroup);
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
        content.appendChild(dateGroup);
    }

    if (splitOptions?.enabled) {
        const configuredQtyTotal = toSafeLocaleNumber(splitOptions.qtyTotal);
        const forceQtyTotalInput = splitOptions.forceQtyTotalInput === true;
        const forceTransferQtyInput = splitOptions.forceTransferQtyInput === true;
        const needsQtyTotalInput = (splitOptions.requireQtyTotal === true && configuredQtyTotal === null) || forceQtyTotalInput;
        const qtyTotalInitial = configuredQtyTotal !== null && configuredQtyTotal >= 1 ? configuredQtyTotal : 1;
        const effectiveQtyTotal = configuredQtyTotal;
        const qtyPrecision = effectiveQtyTotal !== null && isIntegerLike(effectiveQtyTotal) ? 0 : 2;
        const qtyStep = qtyPrecision === 0 ? '1' : '0.01';
        const unitOption = getUnitOptionByType(splitOptions.unitType);
        const unitLabelPlural = unitOption?.plural || 'unidades';

        if (needsQtyTotalInput) {
            const qtyTotalGroup = document.createElement('div');
            qtyTotalGroup.className = 'input-group';
            const qtyTotalLabel = document.createElement('label');
            qtyTotalLabel.className = 'input-label';
            qtyTotalLabel.textContent = `Cantidad total fiada (${unitLabelPlural})`;
            qtyTotalLabel.setAttribute('for', 'pending-transfer-qty-total');
            const qtyTotalInput = document.createElement('input');
            qtyTotalInput.type = 'number';
            qtyTotalInput.id = 'pending-transfer-qty-total';
            qtyTotalInput.className = 'styled-input';
            qtyTotalInput.min = '1';
            qtyTotalInput.step = qtyStep;
            qtyTotalInput.style.paddingLeft = '1rem';
            qtyTotalInput.placeholder = 'Ej: 10';
            qtyTotalInput.value = formatQuantityValue(qtyTotalInitial, isIntegerLike(qtyTotalInitial) ? 0 : 2);
            qtyTotalGroup.append(qtyTotalLabel, qtyTotalInput);
            content.appendChild(qtyTotalGroup);
        }

        const canChooseQuantity = effectiveQtyTotal !== null && effectiveQtyTotal > 1;
        const shouldRenderQuantityInput = forceTransferQtyInput || canChooseQuantity || needsQtyTotalInput;
        if (shouldRenderQuantityInput) {
            let defaultQty = toSafeLocaleNumber(splitOptions.defaultQty);
            if (defaultQty === null) defaultQty = effectiveQtyTotal;

            const qtyGroup = document.createElement('div');
            qtyGroup.className = 'input-group';
            const qtyLabel = document.createElement('label');
            qtyLabel.className = 'input-label';
            qtyLabel.id = 'pending-transfer-qty-label';
            if (effectiveQtyTotal !== null) {
                const qtyTotalText = formatSplitQuantity(effectiveQtyTotal, splitOptions.unitType);
                qtyLabel.textContent = `${splitOptions.quantityLabel || 'Cantidad a transferir'} (de ${qtyTotalText})`;
            } else {
                qtyLabel.textContent = splitOptions.quantityLabel || 'Cantidad a transferir';
            }
            qtyLabel.setAttribute('for', 'pending-transfer-qty');
            const qtyInput = document.createElement('input');
            qtyInput.type = 'number';
            qtyInput.id = 'pending-transfer-qty';
            qtyInput.className = 'styled-input';
            qtyInput.min = '1';
            if (effectiveQtyTotal !== null) {
                const clampedDefaultQty = Math.max(
                    1,
                    Math.min(
                        effectiveQtyTotal,
                        qtyPrecision === 0 ? Math.round(defaultQty ?? effectiveQtyTotal) : roundNumeric(defaultQty ?? effectiveQtyTotal, 2)
                    )
                );
                qtyInput.max = String(qtyPrecision === 0 ? Math.round(effectiveQtyTotal) : roundNumeric(effectiveQtyTotal, 2));
                qtyInput.value = formatQuantityValue(clampedDefaultQty, qtyPrecision);
            } else if (defaultQty !== null && defaultQty > 0) {
                qtyInput.value = formatQuantityValue(defaultQty, isIntegerLike(defaultQty) ? 0 : 2);
            }
            qtyInput.step = qtyStep;
            qtyInput.style.paddingLeft = '1rem';
            qtyGroup.append(qtyLabel, qtyInput);
            content.appendChild(qtyGroup);
        }

        if (splitOptions.showTransferTotal) {
            const totalGroup = document.createElement('div');
            totalGroup.className = 'input-group';
            const totalLabel = document.createElement('label');
            totalLabel.className = 'input-label';
            totalLabel.textContent = splitOptions.transferTotalLabel || 'Monto total transferido';
            totalLabel.setAttribute('for', 'pending-transfer-total');
            const totalInput = document.createElement('input');
            totalInput.type = 'number';
            totalInput.id = 'pending-transfer-total';
            totalInput.className = 'styled-input';
            totalInput.min = '0';
            totalInput.step = '0.01';
            totalInput.style.paddingLeft = '1rem';
            const defaultTransferTotal = toSafeLocaleNumber(splitOptions.defaultTransferTotal);
            if (defaultTransferTotal !== null && defaultTransferTotal > 0) {
                totalInput.value = roundNumeric(defaultTransferTotal, 2).toFixed(2);
            }
            totalGroup.append(totalLabel, totalInput);

            const transferHint = document.createElement('div');
            transferHint.className = 'pending-transfer-unit-price-meta';
            transferHint.textContent = 'El unitario se calcula internamente: total / cantidad.';
            totalGroup.appendChild(transferHint);

            const originalTotal = toSafeLocaleNumber(splitOptions.originalTransferTotal);
            if (originalTotal !== null && originalTotal > 0) {
                const originalHint = document.createElement('div');
                originalHint.className = 'pending-transfer-unit-price-meta';
                const originalLabel = splitOptions.originalTransferTotalLabel || 'Total fiado (referencia)';
                const currencyLabel = splitOptions.currencyLabel || 'COP';
                originalHint.textContent = `${originalLabel}: ${fmtMoneyUI(originalTotal, currencyLabel)}`;
                totalGroup.appendChild(originalHint);
            }
            content.appendChild(totalGroup);
        }

        const preview = document.createElement('div');
        preview.className = 'pending-transfer-preview';
        const moveLine = document.createElement('div');
        moveLine.id = 'pending-transfer-preview-move';
        const leftLine = document.createElement('div');
        leftLine.id = 'pending-transfer-preview-left';
        preview.append(moveLine, leftLine);
        content.appendChild(preview);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'wiz-btn wiz-btn-back';
    cancelBtn.dataset.close = 'true';
    cancelBtn.textContent = 'Cancelar';
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    const confirmVariant = String(options.confirmVariant || '').trim().toLowerCase();
    const confirmClass = confirmVariant === 'submit' ? 'wiz-btn wiz-btn-submit' : 'wiz-btn wiz-btn-next';
    confirmBtn.className = confirmClass;
    confirmBtn.id = 'pending-transfer-confirm';
    confirmBtn.textContent = options.confirmText || 'Transferir';
    footer.append(cancelBtn, confirmBtn);

    document.body.appendChild(overlay);
    return overlay;
}

function openTransferMetaModal(options = {}) {
    return new Promise((resolve) => {
        const modal = buildTransferMetaModal(options);
        if (!modal) {
            resolve({ confirmed: false });
            return;
        }

        const splitOptions = options.split && typeof options.split === 'object' ? options.split : null;
        const qtyTotalInput = modal.querySelector('#pending-transfer-qty-total');
        const qtyLabel = modal.querySelector('#pending-transfer-qty-label');
        const qtyInput = modal.querySelector('#pending-transfer-qty');
        const transferTotalInput = modal.querySelector('#pending-transfer-total');
        const previewMove = modal.querySelector('#pending-transfer-preview-move');
        const previewLeft = modal.querySelector('#pending-transfer-preview-left');

        const updateSplitPreview = () => {
            if (!splitOptions?.enabled || !previewMove || !previewLeft) return;
            const qtyTotalFixed = toSafeLocaleNumber(splitOptions.qtyTotal);
            const qtyTotalDraft = toSafeLocaleNumber(qtyTotalInput?.value);
            const usesEditableQtyTotal = splitOptions.forceQtyTotalInput === true || splitOptions.requireQtyTotal === true;
            const qtyTotalRaw = usesEditableQtyTotal
                ? (qtyTotalDraft !== null ? qtyTotalDraft : qtyTotalFixed)
                : (qtyTotalFixed !== null ? qtyTotalFixed : qtyTotalDraft);
            if (qtyTotalRaw === null || qtyTotalRaw < 1) {
                previewMove.textContent = 'Define la cantidad total fiada para calcular la transferencia por cantidad.';
                previewLeft.textContent = '';
                return;
            }

            if (qtyLabel) {
                const qtyTotalText = formatSplitQuantity(qtyTotalRaw, splitOptions.unitType);
                qtyLabel.textContent = `${splitOptions.quantityLabel || 'Cantidad a transferir'} (de ${qtyTotalText})`;
            }

            const qtyPrecision = isIntegerLike(qtyTotalRaw) ? 0 : 2;
            if (qtyInput) {
                qtyInput.max = String(qtyPrecision === 0 ? Math.round(qtyTotalRaw) : roundNumeric(qtyTotalRaw, 2));
                qtyInput.step = qtyPrecision === 0 ? '1' : '0.01';
            }
            // V9.8.1: Si qtyTotal=1, no hay input de cantidad; asumir transfer total
            let qtyMove = qtyInput ? toSafeLocaleNumber(qtyInput.value) : qtyTotalRaw;
            if (qtyMove === null) qtyMove = qtyTotalRaw;
            qtyMove = qtyPrecision === 0 ? Math.round(qtyMove) : roundNumeric(qtyMove, 2);
            qtyMove = Math.max(1, Math.min(qtyTotalRaw, qtyMove));
            if (qtyInput) {
                qtyInput.value = formatQuantityValue(qtyMove, qtyPrecision);
            }

            const qtyLeftRaw = Math.max(qtyTotalRaw - qtyMove, 0);
            const qtyLeft = qtyPrecision === 0 ? Math.round(qtyLeftRaw) : roundNumeric(qtyLeftRaw, 2);
            const qtyMoveText = formatSplitQuantity(qtyMove, splitOptions.unitType);
            const qtyLeftText = formatSplitQuantity(qtyLeft, splitOptions.unitType);
            const destinationLabel = splitOptions.destinationLabel || 'Destino';
            const originLabel = splitOptions.originLabel || 'Fiados';
            const currencyLabel = splitOptions.currencyLabel || 'COP';
            const sourceAmount = toSafeLocaleNumber(splitOptions.sourceAmount);
            const ratioAmount = sourceAmount !== null && qtyTotalRaw > 0
                ? roundNumeric(sourceAmount * (qtyMove / qtyTotalRaw), 2)
                : null;

            if (transferTotalInput && transferTotalInput.dataset.auto !== '0' && ratioAmount !== null) {
                transferTotalInput.value = ratioAmount.toFixed(2);
            }

            let amountHint = '';
            let transferTotal = toSafeLocaleNumber(transferTotalInput?.value);
            if (transferTotal === null && ratioAmount !== null) {
                transferTotal = ratioAmount;
            }

            if (transferTotal !== null && transferTotal > 0) {
                amountHint = ` · Total: ${fmtMoneyUI(transferTotal, currencyLabel)}`;
            }

            previewMove.textContent = `Se moverán ${qtyMoveText} a ${destinationLabel}${amountHint}.`;

            let remainingHint = '';
            let remainingAmount = null;
            if (sourceAmount !== null && transferTotal !== null && transferTotal >= 0) {
                remainingAmount = roundNumeric(Math.max(sourceAmount - transferTotal, 0), 2);
                remainingHint = remainingAmount > 0 ? ` · Total: ${fmtMoneyUI(remainingAmount, currencyLabel)}` : '';
            }
            if (qtyLeft > 0) {
                previewLeft.textContent = `Quedarán ${qtyLeftText} en ${originLabel}${remainingHint}.`;
            } else if (remainingAmount !== null && remainingAmount > 0) {
                previewLeft.textContent = `Sin cantidad restante en ${originLabel}; diferencia de monto: ${fmtMoneyUI(remainingAmount, currencyLabel)}.`;
            } else {
                previewLeft.textContent = `Transferencia completa de ${qtyMoveText}.`;
            }
        };

        qtyTotalInput?.addEventListener('input', updateSplitPreview);
        qtyTotalInput?.addEventListener('blur', updateSplitPreview);
        qtyInput?.addEventListener('input', updateSplitPreview);
        qtyInput?.addEventListener('blur', updateSplitPreview);
        if (transferTotalInput && !transferTotalInput.dataset.auto) {
            transferTotalInput.dataset.auto = '1';
        }
        transferTotalInput?.addEventListener('input', () => {
            transferTotalInput.dataset.auto = '0';
            updateSplitPreview();
        });
        transferTotalInput?.addEventListener('blur', updateSplitPreview);
        updateSplitPreview();

        let done = false;
        const onKey = (e) => {
            if (e.key === 'Escape') {
                close();
            }
        };
        const finalize = (payload) => {
            if (done) return;
            done = true;
            document.removeEventListener('keydown', onKey);
            modal.remove();
            resolve(payload);
        };
        const close = () => finalize({ confirmed: false });

        modal.querySelectorAll('[data-close]').forEach((el) => {
            el.addEventListener('click', close);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });

        const confirmBtn = modal.querySelector('#pending-transfer-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const concept = modal.querySelector('#pending-transfer-concept')?.value?.trim() || '';
                const category = modal.querySelector('#pending-transfer-category')?.value || null;
                const date = modal.querySelector('#pending-transfer-date')?.value || null;
                const qtyTotal = modal.querySelector('#pending-transfer-qty-total')?.value || null;
                const quantity = modal.querySelector('#pending-transfer-qty')?.value || null;
                const transferTotal = modal.querySelector('#pending-transfer-total')?.value || null;
                if (splitOptions?.requireQtyTotal || splitOptions?.forceQtyTotalInput) {
                    const parsedQtyTotal = toSafeLocaleNumber(qtyTotal);
                    if (parsedQtyTotal === null || parsedQtyTotal < 1) {
                        notifyFacturero('⚠️ Ingresa la cantidad total fiada para continuar.', 'warning');
                        return;
                    }
                }
                finalize({
                    confirmed: true,
                    concept,
                    category,
                    date,
                    qtyTotal,
                    quantity,
                    transferTotal,
                    unitType: splitOptions?.unitType || null
                });
            });
        }

        document.addEventListener('keydown', onKey);
    });
}

async function handlePendingTransfer(itemId) {
    const pending = pendingCache.find((item) => String(item.id) === String(itemId));
    if (!pending) {
        notifyFacturero('No se encontró el fiado seleccionado.', 'warning');
        return;
    }

    if (isPendingTransferred(pending)) {
        notifyFacturero('Este fiado ya fue transferido.', 'warning');
        return;
    }

    if (FACTURERO_OPTIONAL_FIELDS_SUPPORT.pendientes === false) {
        notifyFacturero('Transferencia no disponible. Ejecuta el patch SQL de columnas de transferencia.', 'warning');
        return;
    }

    // Wizard step 1: destination selection
    const destination = await showTransferChoiceModal({
        title: 'Transferir fiado',
        stepIndex: 1,
        stepTotal: 3,
        stepLabel: 'Destino',
        question: '¿A qué historial deseas transferir?',
        choices: [
            { value: 'income', label: 'Pagados', variant: 'success' },
            { value: 'losses', label: 'Pérdidas (Cancelado)', variant: 'danger' },
            { value: 'gastos', label: 'Gastos', variant: 'neutral' },
            { value: 'transferencias', label: 'Donaciones', variant: 'neutral' },
            { value: 'otros', label: 'Otros', variant: 'neutral' },
            { value: 'pendientes', label: 'Fiados', variant: 'neutral', disabled: true }
        ]
    });
    if (!destination) return; // User cancelled
    if (destination !== 'income' && destination !== 'losses') {
        notifyFacturero('⚠️ Por ahora solo está habilitado: Fiados -> Pagados o Fiados -> Pérdidas. (Gastos/Donaciones/Otros: próximamente).', 'warning');
        return;
    }

    const pendingWhoData = getWhoData('pendientes', pending, pending.concepto || '');
    const defaultTransferConcept = pendingWhoData.concept || pending.concepto || (destination === 'income' ? 'Pagado' : 'Pérdida');
    const splitDraftBase = computePendingSplitDraft(pending, destination);
    const pendingQtyResolved = resolvePendingQuantity(pending);
    const pendingCurrencyLabel = (() => {
        const raw = String(pending?.currency || '').trim().toUpperCase();
        return SUPPORTED_CURRENCIES[raw] ? raw : 'COP';
    })();
    const splitUnitType = String(splitDraftBase.unitType || pendingQtyResolved.unitType || pending.unit_type || 'unidad').trim().toLowerCase();
    const splitQtyTotal = toSafeLocaleNumber(splitDraftBase.qtyTotal ?? pendingQtyResolved.qtyTotal);
    const needsQtyTotalInput = destination === 'income' && !!splitUnitType && (splitQtyTotal === null || splitQtyTotal < 1);
    let splitConfig = null;
    if (destination === 'income') {
        splitConfig = {
            enabled: true,
            qtyTotal: splitQtyTotal,
            defaultQty: splitQtyTotal,
            requireQtyTotal: needsQtyTotalInput,
            forceQtyTotalInput: true,
            forceTransferQtyInput: true,
            unitType: splitUnitType,
            originLabel: 'Fiados',
            destinationLabel: 'Pagados',
            showTransferTotal: true,
            defaultTransferTotal: splitDraftBase.transferAmount,
            quantityLabel: 'Cantidad a transferir',
            transferTotalLabel: 'Monto total transferido',
            currencyLabel: pendingCurrencyLabel,
            originalTransferTotal: toSafeLocaleNumber(pending?.monto),
            originalTransferTotalLabel: 'Total fiado (referencia)',
            sourceAmount: toSafeLocaleNumber(pending?.monto)
        };
    } else if (destination === 'losses') {
        const lossesNeedsQtyTotalInput = !!splitUnitType && (splitQtyTotal === null || splitQtyTotal < 1);
        splitConfig = {
            enabled: true,
            qtyTotal: splitQtyTotal,
            defaultQty: splitQtyTotal,
            requireQtyTotal: lossesNeedsQtyTotalInput,
            forceQtyTotalInput: lossesNeedsQtyTotalInput,
            forceTransferQtyInput: true,
            unitType: splitUnitType,
            originLabel: 'Fiados',
            destinationLabel: 'Pérdidas',
            quantityLabel: 'Cantidad a transferir',
            showTransferTotal: false,
            currencyLabel: pendingCurrencyLabel,
            sourceAmount: toSafeLocaleNumber(pending?.monto)
        };
    }

    // Then show meta modal for date/category
    const decision = await openTransferMetaModal({
        title: destination === 'income' ? 'Transferir a Pagados' : 'Transferir a Pérdidas',
        stepIndex: 2,
        stepTotal: 3,
        stepLabel: 'Detalles',
        rows: [
            { label: 'Concepto', value: pending.concepto || 'Sin concepto' },
            { label: 'Cliente', value: pending.cliente || 'N/A' },
            { label: 'Total fiado', value: fmtMoneyUI(Number(pending.monto || 0), pendingCurrencyLabel) },
            { label: 'Fecha fiado', value: pending.fecha || 'N/A' }
        ],
        showConcept: true,
        conceptLabel: destination === 'income' ? 'Concepto del pagado' : 'Concepto de la pérdida',
        defaultConcept: defaultTransferConcept,
        showCategory: destination === 'income',
        showDate: true,
        defaultCategory: 'ventas',
        dateLabel: destination === 'income' ? 'Fecha de pago' : 'Fecha de pérdida',
        defaultDate: getTodayLocalISO(),
        confirmText: 'Siguiente',
        confirmVariant: 'next',
        split: splitConfig
    });
    if (!decision?.confirmed) return;
    const decisionConcept = String(decision.concept || '').trim();
    if (!decisionConcept) {
        notifyFacturero('⚠️ El concepto es obligatorio para transferir.', 'warning');
        return;
    }
    const decisionDate = decision.date || getTodayLocalISO();
    const dateCheck = assertDateNotFuture(decisionDate, 'Fecha');
    if (!dateCheck.valid) {
        notifyFacturero(`⚠️ ${dateCheck.error}`, 'warning');
        return;
    }

    const splitDraft = computePendingSplitDraft(pending, destination, decision);
    if (splitDraft.error) {
        notifyFacturero(`⚠️ ${splitDraft.error}`, 'warning');
        return;
    }

    const summaryCurrencyLabel = splitConfig?.currencyLabel || pendingCurrencyLabel || 'COP';
    const destinationLabel = destination === 'income' ? 'Pagados' : 'Pérdidas';
    const summaryRows = [
        { label: 'Origen', value: 'Fiados' },
        { label: 'Destino', value: destinationLabel },
        { label: 'Concepto', value: decisionConcept },
        { label: 'Fecha', value: decisionDate }
    ];
    if (destination === 'income') {
        summaryRows.push({ label: 'Categoría', value: decision.category || 'ventas' });
    }
    if (splitDraft.enabled) {
        // V9.8.1: Siempre mostrar cantidad total fiada + cantidad transferida/restante
        const movedQtyText = formatSplitQuantity(splitDraft.qtyTransfer, splitDraft.unitType);
        const leftQtyText = formatSplitQuantity(splitDraft.qtyLeft, splitDraft.unitType);
        summaryRows.push({ label: 'Cantidad total fiada', value: formatSplitQuantity(splitDraft.qtyTotal, splitDraft.unitType) });
        const transferLabel = splitDraft.isPartial ? 'Transferidos' : 'Cantidad transferida';
        summaryRows.push({
            label: transferLabel,
            value: `${movedQtyText} -> Total: ${fmtMoneyUI(splitDraft.transferAmount || 0, summaryCurrencyLabel)}`
        });
        if (splitDraft.isPartial) {
            summaryRows.push({
                label: 'Quedan fiados',
                value: `${leftQtyText} -> Total: ${fmtMoneyUI(splitDraft.remainingAmount || 0, summaryCurrencyLabel)}`
            });
        }
    } else {
        // V9.8.1: Mostrar cantidad aunque splitEnabled=false (sin unit_type o qty < 1)
        const fallbackQty = resolvePendingQuantity(pending);
        if (fallbackQty.hasQty) {
            summaryRows.push({
                label: 'Cantidad',
                value: formatSplitQuantity(fallbackQty.qtyTotal, fallbackQty.unitType)
            });
        }
        summaryRows.push({
            label: 'Monto transferido',
            value: fmtMoneyUI(splitDraft.transferAmount || 0, summaryCurrencyLabel)
        });
    }

    const confirmation = await openTransferMetaModal({
        title: 'Confirmar transferencia',
        stepIndex: 3,
        stepTotal: 3,
        stepLabel: 'Confirmación',
        rows: summaryRows,
        showConcept: false,
        showCategory: false,
        showDate: false,
        confirmText: destination === 'income'
            ? 'Confirmar y transferir a Pagados'
            : 'Confirmar y transferir a Pérdidas',
        confirmVariant: 'submit'
    });
    if (!confirmation?.confirmed) return;

    const isPartialSplit = splitDraft.enabled && splitDraft.isPartial;
    const splitToState = destination === 'income' ? 'pagados' : 'perdidas';
    const splitMovedAt = isPartialSplit ? new Date().toISOString() : null;
    const splitMetaOrigin = isPartialSplit
        ? buildPartialSplitMetaPayload({
            role: 'origin',
            splitFromId: pending.id,
            fromState: 'fiados',
            toState: splitToState,
            unitType: splitDraft.unitType,
            qtyTotal: splitDraft.qtyTotal,
            qtyMoved: splitDraft.qtyTransfer,
            qtyLeft: splitDraft.qtyLeft,
            unitPriceOriginal: splitDraft.unitPriceOriginal,
            unitPriceTransfer: splitDraft.unitPriceTransfer,
            amountMoved: splitDraft.transferAmount,
            amountLeft: splitDraft.remainingAmount,
            movedAt: splitMovedAt
        })
        : null;
    const splitMovedLabel = isPartialSplit ? formatSplitQuantity(splitDraft.qtyTransfer, splitDraft.unitType) : '';
    const splitLeftLabel = isPartialSplit ? formatSplitQuantity(splitDraft.qtyLeft, splitDraft.unitType) : '';
    const transferLockKey = String(pending?.id || itemId || '').trim();
    if (transferLockKey && pendingTransferInFlightLocks.has(transferLockKey)) {
        notifyFacturero('⚠️ Esta transferencia ya está en proceso. Espera un momento.', 'warning');
        return;
    }
    if (transferLockKey) {
        pendingTransferInFlightLocks.add(transferLockKey);
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión para transferir.');

        if (destination === 'income') {
            // Transfer to Income
            const incomeId = buildTransferId('inc');
            const concept = decisionConcept;
            const buyer = pendingWhoData.who || pending.cliente || '';
            const conceptFinal = buyer ? buildConceptWithWho('ingresos', concept, buyer) : concept;
            const transferCurrencyRaw = String(splitConfig?.currencyLabel || pendingCurrencyLabel || 'COP').trim().toUpperCase();
            const transferCurrencyCode = SUPPORTED_CURRENCIES[transferCurrencyRaw] ? transferCurrencyRaw : 'COP';
            const moneySource = {
                ...pending,
                currency: transferCurrencyCode
            };
            const pendingRate = toSafeLocaleNumber(pending?.exchange_rate);
            if (transferCurrencyCode !== 'USD' && pendingRate !== null && pendingRate > 0) {
                moneySource.exchange_rate = pendingRate;
            }
            const incomeMoney = buildIncomeMonetaryFields(moneySource, splitDraft.transferAmount);
            incomeMoney.currency = transferCurrencyCode;
            const splitMetaDestination = isPartialSplit
                ? buildPartialSplitMetaPayload({
                    role: 'destination',
                    splitFromId: pending.id,
                    fromState: 'fiados',
                    toState: splitToState,
                    unitType: splitDraft.unitType,
                    qtyTotal: splitDraft.qtyTotal,
                    qtyMoved: splitDraft.qtyTransfer,
                    qtyLeft: splitDraft.qtyLeft,
                    unitPriceOriginal: splitDraft.unitPriceOriginal,
                    unitPriceTransfer: splitDraft.unitPriceTransfer,
                    amountMoved: splitDraft.transferAmount,
                    amountLeft: splitDraft.remainingAmount,
                    movedAt: splitMovedAt
                })
                : null;
            const transferUnitType = splitDraft.unitType || pending.unit_type || null;
            const transferQtyRaw = splitDraft.transferUnitQty ?? splitDraft.qtyTransfer ?? pending.unit_qty;
            const transferQty = toSafeLocaleNumber(transferQtyRaw);
            const safeTransferQty = (transferQty !== null && Number.isFinite(Number(transferQty)))
                ? Number(transferQty)
                : null;

            const incomePayload = {
                id: incomeId,
                user_id: user.id,
                concepto: conceptFinal,
                monto: incomeMoney.monto,
                fecha: decisionDate,
                categoria: decision.category || 'ventas',
                soporte_url: pending.evidence_url || null,
                crop_id: pending.crop_id || null,
                unit_type: transferUnitType,
                unit_qty: safeTransferQty,
                quantity_kg: Number.isFinite(Number(splitDraft.transferKgQty)) ? Number(splitDraft.transferKgQty) : null,
                currency: incomeMoney.currency,
                exchange_rate: incomeMoney.exchange_rate,
                monto_usd: incomeMoney.monto_usd,
                // V9.7: Origin tracking
                origin_table: 'agro_pending',
                origin_id: pending.id,
                transfer_state: 'active',
                split_from_id: isPartialSplit ? pending.id : null,
                split_meta: splitMetaDestination
            };

            const insertResult = await insertRowWithMissingColumnFallback('agro_income', incomePayload, [
                'unit_type',
                'unit_qty',
                'quantity_kg',
                'origin_table',
                'origin_id',
                'transfer_state',
                'currency',
                'exchange_rate',
                'monto_usd',
                'split_from_id',
                'split_meta'
            ]);
            const insertError = insertResult.error;
            if (insertError) throw insertError;

            const transferMeta = isPartialSplit
                ? {
                    monto: splitDraft.remainingAmount,
                    unit_qty: Number.isFinite(Number(splitDraft.remainingUnitQty)) ? Number(splitDraft.remainingUnitQty) : null,
                    quantity_kg: Number.isFinite(Number(splitDraft.remainingKgQty)) ? Number(splitDraft.remainingKgQty) : null,
                    split_meta: splitMetaOrigin,
                    transfer_state: pending.transfer_state === 'reverted' ? 'active' : (pending.transfer_state || 'active')
                }
                : {
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

            if (updateError && isPartialSplit) {
                const fallbackTransferMeta = { ...transferMeta };
                let retried = false;
                if (isMissingColumnError(updateError, 'split_meta')) {
                    delete fallbackTransferMeta.split_meta;
                    retried = true;
                }
                if (isMissingColumnError(updateError, 'unit_qty')) {
                    delete fallbackTransferMeta.unit_qty;
                    retried = true;
                }
                if (isMissingColumnError(updateError, 'quantity_kg')) {
                    delete fallbackTransferMeta.quantity_kg;
                    retried = true;
                }
                if (retried) {
                    const retryUpdate = await supabase
                        .from('agro_pending')
                        .update(fallbackTransferMeta)
                        .eq('id', pending.id)
                        .eq('user_id', user.id);
                    updateError = retryUpdate.error;
                }
            }

            if (!isPartialSplit && updateError && (isMissingColumnError(updateError, 'transferred_at') || isMissingColumnError(updateError, 'transferred_to'))) {
                FACTURERO_OPTIONAL_FIELDS_SUPPORT.pendientes = false;
                await supabase.from('agro_income').delete().eq('id', incomeId).eq('user_id', user.id);
                notifyFacturero('Faltan columnas de transferencia. Ejecuta el patch SQL.', 'warning');
                return;
            } else if (updateError) {
                await supabase.from('agro_income').delete().eq('id', incomeId).eq('user_id', user.id);
                throw updateError;
            }

            if (isPartialSplit) {
                notifyFacturero(`✅ Transferido parcial a Pagados: ${splitMovedLabel}. Quedan ${splitLeftLabel} en Fiados.`, 'success');
            } else {
                notifyFacturero('✅ Fiado transferido a Pagados.', 'success');
            }
            notifyFacturero('Actualizando historial...', 'info');
            const refreshResults = await Promise.allSettled([
                refreshFactureroHistory('pendientes'),
                refreshFactureroHistory('ingresos'),
                refreshFactureroHistory('otros'),
                typeof loadIncomes === 'function' ? loadIncomes() : Promise.resolve()
            ]);
            refreshResults.forEach((result) => {
                if (result.status === 'rejected') {
                    console.warn('[AGRO] Pending->Income refresh warning:', result.reason?.message || result.reason);
                }
            });
            document.dispatchEvent(new CustomEvent('agro:income:changed'));
            document.dispatchEvent(new CustomEvent(AGRO_CROPS_REFRESH_EVENT, {
                detail: { source: 'pending_transfer', tab: 'ingresos' }
            }));
            refreshOpsRankingsIfVisible();
            scheduleOpsMovementSummaryRefresh();
            applyBuyerPrivacy(document, readBuyerNamesHidden());
            if (typeof readMoneyValuesHidden === 'function') {
                applyMoneyPrivacy(document, readMoneyValuesHidden());
            } else {
                applyMoneyPrivacy(document);
            }

        } else if (destination === 'losses') {
            // Transfer to Losses
            const lossId = buildTransferId('loss');
            const concept = decisionConcept;
            const buyer = pendingWhoData.who || pending.cliente || '';
            const conceptFinal = buyer ? buildConceptWithWho('perdidas', concept, buyer) : concept;
            const lossCause = buyer ? `Fiado cancelado · Cliente: ${buyer}` : 'Fiado cancelado';
            const transferCurrencyRaw = String(splitConfig?.currencyLabel || pendingCurrencyLabel || 'COP').trim().toUpperCase();
            const transferCurrencyCode = SUPPORTED_CURRENCIES[transferCurrencyRaw] ? transferCurrencyRaw : 'COP';
            const moneySource = {
                ...pending,
                currency: transferCurrencyCode
            };
            const pendingRate = toSafeLocaleNumber(pending?.exchange_rate);
            if (transferCurrencyCode !== 'USD' && pendingRate !== null && pendingRate > 0) {
                moneySource.exchange_rate = pendingRate;
            }
            const lossMoney = buildIncomeMonetaryFields(moneySource, splitDraft.transferAmount);
            lossMoney.currency = transferCurrencyCode;
            const splitMetaDestination = isPartialSplit
                ? buildPartialSplitMetaPayload({
                    role: 'destination',
                    splitFromId: pending.id,
                    fromState: 'fiados',
                    toState: splitToState,
                    unitType: splitDraft.unitType,
                    qtyTotal: splitDraft.qtyTotal,
                    qtyMoved: splitDraft.qtyTransfer,
                    qtyLeft: splitDraft.qtyLeft,
                    unitPriceOriginal: splitDraft.unitPriceOriginal,
                    unitPriceTransfer: splitDraft.unitPriceTransfer,
                    amountMoved: splitDraft.transferAmount,
                    amountLeft: splitDraft.remainingAmount,
                    movedAt: splitMovedAt
                })
                : null;

            const lossPayload = {
                id: lossId,
                user_id: user.id,
                concepto: conceptFinal,
                monto: lossMoney.monto,
                fecha: decisionDate,
                causa: lossCause,
                crop_id: pending.crop_id || null,
                unit_type: pending.unit_type || null,
                unit_qty: Number.isFinite(Number(splitDraft.transferUnitQty)) ? Number(splitDraft.transferUnitQty) : null,
                quantity_kg: Number.isFinite(Number(splitDraft.transferKgQty)) ? Number(splitDraft.transferKgQty) : null,
                currency: lossMoney.currency,
                exchange_rate: lossMoney.exchange_rate,
                monto_usd: lossMoney.monto_usd,
                // V9.7: Origin tracking
                origin_table: 'agro_pending',
                origin_id: pending.id,
                transfer_state: 'active',
                split_from_id: isPartialSplit ? pending.id : null,
                split_meta: splitMetaDestination
            };

            const insertResult = await insertRowWithMissingColumnFallback('agro_losses', lossPayload, [
                'unit_type',
                'unit_qty',
                'quantity_kg',
                'currency',
                'exchange_rate',
                'monto_usd',
                'origin_table',
                'origin_id',
                'transfer_state',
                'split_from_id',
                'split_meta'
            ]);
            const insertError = insertResult.error;
            if (insertError) throw insertError;

            const transferMeta = isPartialSplit
                ? {
                    monto: splitDraft.remainingAmount,
                    unit_qty: Number.isFinite(Number(splitDraft.remainingUnitQty)) ? Number(splitDraft.remainingUnitQty) : null,
                    quantity_kg: Number.isFinite(Number(splitDraft.remainingKgQty)) ? Number(splitDraft.remainingKgQty) : null,
                    split_meta: splitMetaOrigin,
                    transfer_state: pending.transfer_state === 'reverted' ? 'active' : (pending.transfer_state || 'active')
                }
                : {
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

            if (updateError && isPartialSplit) {
                const fallbackTransferMeta = { ...transferMeta };
                let retried = false;
                if (isMissingColumnError(updateError, 'split_meta')) {
                    delete fallbackTransferMeta.split_meta;
                    retried = true;
                }
                if (isMissingColumnError(updateError, 'unit_qty')) {
                    delete fallbackTransferMeta.unit_qty;
                    retried = true;
                }
                if (isMissingColumnError(updateError, 'quantity_kg')) {
                    delete fallbackTransferMeta.quantity_kg;
                    retried = true;
                }
                if (retried) {
                    const retryUpdate = await supabase
                        .from('agro_pending')
                        .update(fallbackTransferMeta)
                        .eq('id', pending.id)
                        .eq('user_id', user.id);
                    updateError = retryUpdate.error;
                }
            }

            if (!isPartialSplit && updateError && isMissingColumnError(updateError, 'transferred_to')) {
                await supabase.from('agro_losses').delete().eq('id', lossId).eq('user_id', user.id);
                notifyFacturero('Faltan columnas de transferencia. Ejecuta el patch SQL.', 'warning');
                return;
            } else if (updateError) {
                await supabase.from('agro_losses').delete().eq('id', lossId).eq('user_id', user.id);
                throw updateError;
            }

            if (isPartialSplit) {
                notifyFacturero(`✅ Transferido parcial a Pérdidas: ${splitMovedLabel}. Quedan ${splitLeftLabel} en Fiados.`, 'success');
            } else {
                notifyFacturero('✅ Fiado transferido a Pérdidas (Cancelado).', 'success');
            }
            await refreshFactureroHistory('pendientes');
            await refreshFactureroHistory('perdidas');
            document.dispatchEvent(new CustomEvent('agro:losses:changed'));
        }

        await updateStats();
    } catch (err) {
        console.error('[AGRO] Pending transfer error:', err.message);
        notifyFacturero(`Error al transferir: ${err.message}`, 'warning');
    } finally {
        if (transferLockKey) {
            pendingTransferInFlightLocks.delete(transferLockKey);
        }
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

let _transferIdCounter = 0;

function buildTransferId(prefix) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${prefix}_${Date.now()}_${suffix}`;
    }
    _transferIdCounter = (_transferIdCounter + 1) % 0x1000000;
    const fallbackSuffix = `${Date.now().toString(16)}_${_transferIdCounter.toString(16).padStart(6, '0')}`;
    return `${prefix}_${Date.now()}_${fallbackSuffix}`;
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
            notifyFacturero('No se encontró el pagado seleccionado.', 'warning');
            return;
        }
    }

    const destination = await showTransferChoiceModal({
        title: 'Transferir pagado',
        choices: [
            { value: 'pendientes', label: 'Fiados (Deuda)' },
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
                concepto: whoData.concept || income.concepto || 'Fiado',
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

            notifyFacturero('✅ Pagado transferido a Fiados.', 'success');
            await refreshFactureroHistory('pendientes');
            document.dispatchEvent(new CustomEvent('agro:income:changed'));
        }

        if (destination === 'losses') {
            const whoData = getWhoData('ingresos', income, income.concepto || '');
            const buyerLabel = whoData.who ? `Comprador: ${whoData.who}` : '';
            const lossCause = buyerLabel ? `Transferido desde pagados • ${buyerLabel}` : 'Transferido desde pagados';
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

            notifyFacturero('✅ Pagado transferido a Pérdidas.', 'success');
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
            { value: 'pendientes', label: 'Fiados (Reactivar)' },
            { value: 'income', label: 'Pagados (Recuperado)' }
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
            const baseConcept = loss.concepto || 'Fiado';
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

            notifyFacturero('✅ Pérdida transferida a Fiados.', 'success');
            await refreshFactureroHistory('pendientes');
            await refreshFactureroHistory('perdidas');
        }

        if (destination === 'income') {
            const decision = await openTransferMetaModal({
                title: 'Transferir a Pagados',
                rows: [
                    { label: 'Concepto', value: loss.concepto || 'Sin concepto' },
                    { label: 'Monto', value: `$${Number(loss.monto || 0).toFixed(2)}` },
                    { label: 'Fecha pérdida', value: loss.fecha || 'N/A' }
                ],
                showCategory: true,
                showDate: true,
                defaultCategory: 'otros',
                dateLabel: 'Fecha de pago',
                defaultDate: loss.fecha || getTodayLocalISO()
            });
            if (!decision?.confirmed) return;
            const decisionDate = decision.date || getTodayLocalISO();
            const dateCheck = assertDateNotFuture(decisionDate, 'Fecha');
            if (!dateCheck.valid) {
                notifyFacturero(`⚠️ ${dateCheck.error}`, 'warning');
                return;
            }

            const baseConcept = loss.concepto || 'Pagado';
            const causeMeta = loss.causa ? `Causa: ${loss.causa}` : '';
            const conceptFinal = causeMeta ? `${baseConcept} — ${causeMeta}` : baseConcept;
            const incomeId = buildTransferId('income');
            const incomeMoney = buildIncomeMonetaryFields(loss, loss.monto);
            const incomePayload = {
                id: incomeId,
                user_id: user.id,
                concepto: conceptFinal,
                monto: incomeMoney.monto,
                fecha: decisionDate,
                categoria: decision.category || 'otros',
                soporte_url: getFactureroEvidenceValue('perdidas', loss) || null,
                crop_id: loss.crop_id || null,
                unit_type: loss.unit_type || null,
                unit_qty: Number.isFinite(Number(loss.unit_qty)) ? Number(loss.unit_qty) : null,
                quantity_kg: Number.isFinite(Number(loss.quantity_kg)) ? Number(loss.quantity_kg) : null,
                currency: incomeMoney.currency,
                exchange_rate: incomeMoney.exchange_rate,
                monto_usd: incomeMoney.monto_usd,
                origin_table: 'agro_losses',
                origin_id: loss.id,
                transfer_state: 'active'
            };

            const insertResult = await insertFactureroRow('agro_income', incomePayload, [
                'unit_type',
                'unit_qty',
                'quantity_kg',
                'currency',
                'exchange_rate',
                'monto_usd',
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

            notifyFacturero('✅ Pérdida transferida a Pagados.', 'success');
            await refreshFactureroHistory('perdidas');
            document.dispatchEvent(new CustomEvent('agro:income:changed'));
        }

        await updateStats();
    } catch (err) {
        console.error('[AGRO] Loss transfer error:', err.message);
        notifyFacturero(`Error al transferir: ${err.message}`, 'warning');
    }
}

async function handleOrphanCropReportExport(orphanCropId) {
    const normalizedOrphanId = normalizeCropId(orphanCropId);
    if (!normalizedOrphanId) {
        alert('No se pudo identificar el ciclo huérfano.');
        return;
    }

    const action = await showTransferChoiceModal({
        title: '🧪 Auditoría · Exportar ciclo huérfano',
        choices: [
            { value: 'export_history', label: 'Exportar histórico del ciclo', icon: 'fa-file-arrow-down' },
            { value: 'export_selected_active', label: 'Exportar cultivo activo seleccionado', icon: 'fa-seedling' }
        ]
    });
    if (!action) return;

    if (action === 'export_history') {
        await exportCropReport(normalizedOrphanId, { skipHistoryConfirmation: true });
        return;
    }

    if (action === 'export_selected_active') {
        const selectedActiveId = normalizeCropId(selectedCropId);
        if (!selectedActiveId || selectedActiveId === AGRO_GENERAL_VIEW_ID) {
            alert('Selecciona un cultivo activo antes de exportar.');
            return;
        }
        if (selectedActiveId === normalizedOrphanId) {
            alert('El cultivo seleccionado corresponde al ciclo huérfano. Selecciona un cultivo activo real.');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) {
                alert('Sesión no válida.');
                return;
            }
            const existsMap = await resolveCropExistenceMap(user.id, [selectedActiveId], { failOpen: false });
            if (existsMap[selectedActiveId] !== true) {
                alert('El cultivo activo seleccionado ya no existe en base de datos.');
                return;
            }
        } catch (err) {
            console.warn('[AGRO] Could not validate selected active crop before export:', err?.message || err);
            alert('No se pudo validar el cultivo activo seleccionado.');
            return;
        }

        await exportCropReport(selectedActiveId);
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

        const reportBtn = e.target.closest('.btn-report-crop');
        if (reportBtn) {
            e.preventDefault();
            e.stopPropagation();
            const cropId = reportBtn.dataset.id || reportBtn.closest('.crop-card')?.dataset.cropId;
            const isOrphanCard = reportBtn.dataset.cropOrphan === '1'
                || reportBtn.closest('.crop-card')?.dataset.cropOrphan === '1';
            console.info('[AGRO] Crop report click', { cropId, isOrphanCard });
            if (!cropId) return;
            if (isOrphanCard) {
                handleOrphanCropReportExport(cropId).catch((err) => {
                    console.error('[AGRO] Orphan crop export flow error:', err);
                    alert('No se pudo completar la exportación del ciclo huérfano.');
                });
            } else {
                exportCropReport(cropId);
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

        const moveGeneralBtn = e.target.closest('.btn-move-general');
        if (moveGeneralBtn) {
            e.preventDefault();
            e.stopPropagation();
            const tabName = moveGeneralBtn.dataset.tab;
            const itemId = moveGeneralBtn.dataset.id;
            console.info('[AGRO] Facturero move general click', { tabName, itemId });
            if (tabName && itemId) {
                await handleMoveGeneralRecord(tabName, itemId);
            } else {
                console.warn('[AGRO] Facturero move general missing data', { tabName, itemId });
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
    const tabs = ['gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias', 'otros'];
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
    refreshFactureroHistory('otros');
    if (typeof loadIncomes === 'function') {
        loadIncomes();
    }
    refreshOpsRankingsIfVisible();
}

function scheduleCropCardsRefresh(delayMs = 250) {
    const wait = Number.isFinite(Number(delayMs)) ? Math.max(0, Number(delayMs)) : 250;
    if (cropsRefreshThrottleTimer) {
        clearTimeout(cropsRefreshThrottleTimer);
    }
    cropsRefreshThrottleTimer = setTimeout(() => {
        cropsRefreshThrottleTimer = null;
        Promise.resolve(loadCrops()).catch((err) => {
            console.warn('[AGRO] crop cards refresh failed:', err?.message || err);
        });
    }, wait);
}

function bindCropRefreshEvents() {
    if (cropsRefreshEventsBound || typeof document === 'undefined') return;
    cropsRefreshEventsBound = true;
    const refreshHandler = () => scheduleCropCardsRefresh(250);
    document.addEventListener(AGRO_CROPS_REFRESH_EVENT, refreshHandler);
    document.addEventListener('agro:income:changed', refreshHandler);
    document.addEventListener('agro:losses:changed', refreshHandler);
}

if (typeof document !== 'undefined') {
    document.addEventListener('agro:crop:changed', () => {
        refreshFactureroForSelectedCrop();
        scheduleOpsMovementSummaryRefresh();
    });
}
if (typeof window !== 'undefined') {
    window.addEventListener('agro:crop:changed', () => {
        refreshFactureroForSelectedCrop();
        scheduleOpsMovementSummaryRefresh();
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
    finalizado: { class: 'status-finished', text: 'Finalizado' },
    lost: { class: 'status-lost', text: 'Perdido' }
};

const CROP_STATUS_LEGACY_MAP = {
    growing: 'creciendo',
    ready: 'produccion',
    attention: 'sembrado',
    harvested: 'finalizado',
    perdido: 'lost',
    perdida: 'lost',
    danado: 'lost',
    damaged: 'lost',
    loss: 'lost'
};

const CROP_STATUS_THRESHOLDS = {
    sembrado: 0,
    creciendo: 25,
    produccion: 70,
    finalizado: 100
};

const CROP_FINISHED_STATUS_TOKENS = new Set([
    'finalizado',
    'cosechado',
    'terminado',
    'harvested',
    'finished',
    'done',
    'closed',
    'completado',
    'completada',
    'lost',
    'perdido',
    'perdida',
    'danado',
    'damaged'
]);

const CROP_CYCLE_HISTORY_SECTION_ID = 'crops-cycle-history-accordion';
const CROP_CYCLE_HISTORY_TITLE_ID = 'crops-cycle-history-title';
const CROP_CYCLE_FINISHED_SECTION_ID = 'crops-cycle-finished-section';
const CROP_CYCLE_FINISHED_TITLE_ID = 'crops-cycle-finished-title';
const CROP_CYCLE_HISTORY_GRID_ID = 'crops-cycle-history-grid';
const CROP_CYCLE_LOST_SECTION_ID = 'crops-cycle-lost-section';
const CROP_CYCLE_LOST_TITLE_ID = 'crops-cycle-lost-title';
const CROP_CYCLE_LOST_GRID_ID = 'crops-cycle-lost-grid';
const CROP_CYCLE_AUDIT_SECTION_ID = 'crops-cycle-history-audit';
const CROP_CYCLE_AUDIT_TITLE_ID = 'crops-cycle-history-audit-title';
const CROP_CYCLE_AUDIT_GRID_ID = 'crops-cycle-history-audit-grid';

function normalizeCropStatus(status) {
    const raw = String(status || '').toLowerCase().trim();
    const value = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (!value) return 'creciendo';
    if (CROP_STATUS_UI[raw]) return raw;
    if (CROP_STATUS_UI[value]) return value;
    if (CROP_STATUS_LEGACY_MAP[raw]) return CROP_STATUS_LEGACY_MAP[raw];
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

function normalizeStatusToken(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function normalizeCycleDateKey(value) {
    if (!value) return '';
    const text = String(value).trim();
    if (!text) return '';
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return '';
    return `${match[1]}-${match[2]}-${match[3]}`;
}

function resolveCropEndDateKey(crop) {
    const fields = [
        'actual_harvest_date',
        'fecha_cosecha',
        'harvest_date',
        'end_date',
        'fecha_fin',
        'finish_date',
        'completed_at',
        'closed_at'
    ];
    for (const field of fields) {
        const key = normalizeCycleDateKey(crop?.[field]);
        if (key) return key;
    }
    return '';
}

function resolveCropProgressPercent(crop, progress) {
    const computedPercent = Number(progress?.percent);
    if (Number.isFinite(computedPercent)) {
        return clampNumber(computedPercent, 0, 100);
    }
    const storedPercent = Number(crop?.progress);
    if (Number.isFinite(storedPercent)) {
        return clampNumber(storedPercent, 0, 100);
    }
    return null;
}

function isCropFinishedCycle(crop, progress) {
    const resolvedStatus = resolveCropStatus(crop, progress);
    const normalizedResolved = normalizeCropStatus(resolvedStatus);
    const explicitStatus = normalizeStatusToken(crop?.status_override || crop?.status || resolvedStatus);
    const finishedByStatus = normalizedResolved === 'finalizado'
        || normalizedResolved === 'lost'
        || CROP_FINISHED_STATUS_TOKENS.has(explicitStatus);

    const endDateKey = resolveCropEndDateKey(crop);
    const finishedByDate = endDateKey ? (diffDays(getTodayKey(), endDateKey) >= 0) : false;

    const progressPercent = resolveCropProgressPercent(crop, progress);
    const finishedByProgress = Number.isFinite(progressPercent) && progressPercent >= 100;

    return finishedByStatus || finishedByDate || finishedByProgress;
}

function splitCropsByCycle(crops) {
    const rows = Array.isArray(crops) ? crops : [];
    const active = [];
    const finished = [];

    rows.forEach((crop) => {
        const templateDuration = getTemplateDurationForCrop(crop);
        const progress = computeCropProgress(crop, templateDuration);
        if (isCropFinishedCycle(crop, progress)) {
            finished.push(crop);
        } else {
            active.push(crop);
        }
    });

    return { active, finished };
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

function normalizeMoneyCurrency(value) {
    const raw = String(value || '').trim().toUpperCase();
    if (!raw) return null;
    const token = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z$]/g, '');
    if (!token) return null;

    if (token === '$' || token === 'USDT' || token.includes('USD') || token.includes('DOL')) return 'USD';
    if (
        token === 'BS'
        || token === 'BSS'
        || token === 'BOLIVAR'
        || token === 'BOLIVARES'
        || token === 'VES'
        || token === 'VEF'
    ) {
        return 'VES';
    }
    if (token === 'COP' || token === 'COL' || token === 'PESO' || token === 'PESOS') return 'COP';
    if (SUPPORTED_CURRENCIES[token]) return token;
    return null;
}

function resolveMoneyAmountFromRow(row, amountFields = []) {
    const fields = Array.isArray(amountFields) && amountFields.length
        ? amountFields
        : ['amount', 'monto', 'value', 'total'];
    for (const field of fields) {
        const parsed = toSafeLocaleNumber(row?.[field]);
        if (parsed !== null) return parsed;
    }
    return 0;
}

function resolveRowFxSnapshot(row) {
    const cop = toPositiveRate(row?.fx_usd_cop ?? row?.usd_cop ?? row?.investment_fx_usd_cop);
    const ves = toPositiveRate(
        row?.fx_usd_ves
        ?? row?.usd_ves
        ?? row?.investment_fx_usd_ves
        ?? row?.fx_usd_bs
        ?? row?.usd_bs
        ?? row?.investment_fx_usd_bs
    );
    const fxAtRaw = row?.fx_at ?? row?.investment_fx_at ?? null;
    const fxAt = fxAtRaw ? new Date(fxAtRaw) : null;
    return {
        usdCop: cop,
        usdVes: ves,
        fxAt: fxAt && !Number.isNaN(fxAt.getTime()) ? fxAt : null,
        hasSnapshot: !!(cop || ves)
    };
}

/**
 * Convierte un movimiento (ingreso/gasto/fiado) a USD equivalente.
 * - Normaliza currency legacy (bs/bolivares/vef/cop/usdt/etc.)
 * - Prioriza snapshot FX por fila (si existe)
 * - Hace fallback a tasas actuales del Facturero
 * - Si falta tasa para moneda no-USD => NaN (no suma y se marca warning)
 */
function toUsdEquivFromMoneyRow(row, fallbackRates, bumpMissingRate, amountFields = [], meta = null) {
    if (meta && typeof meta === 'object') {
        meta.missingRate = false;
        meta.missingCurrency = false;
    }

    const amount = resolveMoneyAmountFromRow(row, amountFields);
    const explicitUsd = toSafeLocaleNumber(row?.monto_usd ?? row?.amount_usd ?? row?.usd_amount);
    const currency = normalizeMoneyCurrency(row?.currency ?? row?.moneda ?? row?.currency_code);
    const fxSnapshot = resolveRowFxSnapshot(row);
    const rates = resolveEffectiveUsdRates(fxSnapshot);
    const usdCop = toPositiveRate(rates?.usdCop) || toPositiveRate(getRate('COP', fallbackRates));
    const usdVes = toPositiveRate(rates?.usdVes) || toPositiveRate(getRate('VES', fallbackRates));

    if (currency === 'USD') return explicitUsd !== null ? explicitUsd : amount;

    if (currency === 'COP' || currency === 'VES') {
        const rowRate = toPositiveRate(row?.exchange_rate ?? row?.usd_rate ?? row?.rate);
        const rate = rowRate || (currency === 'COP' ? usdCop : usdVes);
        if (!rate || rate <= 0) {
            if (meta && typeof meta === 'object') meta.missingRate = true;
            if (typeof bumpMissingRate === 'function') bumpMissingRate();
            return Number.NaN;
        }
        const converted = convertToUSD(amount, currency, rate);
        return Number.isFinite(converted) ? converted : (amount / rate);
    }

    if (explicitUsd !== null) return explicitUsd;

    if (meta && typeof meta === 'object') {
        meta.missingRate = true;
        meta.missingCurrency = true;
    }
    if (typeof bumpMissingRate === 'function') bumpMissingRate();
    return Number.NaN;
}

function buildIncomeMonetaryFields(sourceRow, amountCandidate) {
    const amountParsed = toSafeLocaleNumber(amountCandidate);
    const amount = amountParsed !== null ? amountParsed : 0;

    const currency = normalizeMoneyCurrency(sourceRow?.currency) || 'USD';
    const rawRate = toSafeLocaleNumber(sourceRow?.exchange_rate);
    const rate = currency === 'USD'
        ? 1
        : (rawRate !== null && rawRate > 0 ? rawRate : null);

    const sourceAmount = toSafeLocaleNumber(sourceRow?.monto);
    const explicitUsd = toSafeLocaleNumber(sourceRow?.monto_usd);
    let usdAmount = null;

    // Prioridad: reusar USD snapshot de origen con prorrateo para evitar conversión duplicada/invertida.
    if (explicitUsd !== null && sourceAmount !== null && sourceAmount > 0) {
        const ratio = amount / sourceAmount;
        if (Number.isFinite(ratio) && ratio >= 0) {
            usdAmount = roundNumeric(explicitUsd * ratio, 2);
        }
    } else if (explicitUsd !== null && sourceAmount !== null && Math.abs(sourceAmount - amount) < 1e-9) {
        usdAmount = explicitUsd;
    }

    if (usdAmount === null) {
        if (currency === 'USD') {
            usdAmount = amount;
        } else if (rate !== null && rate > 0) {
            const converted = convertToUSD(amount, currency, rate);
            usdAmount = Number.isFinite(converted) ? converted : (amount / rate);
        }
    }

    const safeUsd = toSafeLocaleNumber(usdAmount);
    return {
        monto: amount,
        currency,
        exchange_rate: currency === 'USD' ? 1 : rate,
        monto_usd: safeUsd !== null ? safeUsd : (currency === 'USD' ? amount : null)
    };
}

function resolveRecordAmountUsd(row, amountFields = [], meta = null, fallbackRates = null) {
    const bumpMissing = () => {
        if (meta && typeof meta === 'object') meta.missingRate = true;
    };
    const rates = fallbackRates && typeof fallbackRates === 'object'
        ? fallbackRates
        : editExchangeRates;
    return toUsdEquivFromMoneyRow(row, rates, bumpMissing, amountFields, meta);
}

function incrementCountMap(map, key, amount = 1) {
    if (!(map instanceof Map)) return;
    const normalizedKey = normalizeCropId(key);
    if (!normalizedKey) return;
    const step = Number.isFinite(amount) ? amount : 1;
    map.set(normalizedKey, (Number(map.get(normalizedKey)) || 0) + step);
}

function isMissingTableError(error, tableName) {
    if (!error) return false;
    const code = String(error.code || '').toUpperCase();
    if (code === '42P01') return true;
    const msg = String(error.message || '').toLowerCase();
    const details = String(error.details || '').toLowerCase();
    const text = `${msg} ${details}`;
    const table = String(tableName || '').toLowerCase();
    if (!table) return text.includes('does not exist') && text.includes('relation');
    return text.includes('relation') && text.includes(table) && text.includes('does not exist');
}

const LOSS_TABLE_CANDIDATES = ['agro_losses', 'agro_loss', 'agro_perdidas'];
const lossTableAvailabilityCache = new Map();
const tableMissingColumnsCache = new Map();

function getTableMissingColumns(tableName) {
    const key = String(tableName || '').trim();
    if (!key) return new Set();
    if (!tableMissingColumnsCache.has(key)) {
        tableMissingColumnsCache.set(key, new Set());
    }
    return tableMissingColumnsCache.get(key);
}

function rememberMissingColumn(tableName, column) {
    const key = String(tableName || '').trim();
    const col = String(column || '').trim();
    if (!key || !col) return;
    getTableMissingColumns(key).add(col);
}

async function isTableAvailable(tableName) {
    const normalized = String(tableName || '').trim();
    if (!normalized) return false;
    if (lossTableAvailabilityCache.has(normalized)) {
        return lossTableAvailabilityCache.get(normalized);
    }

    try {
        const { error } = await supabase
            .from(normalized)
            .select('id')
            .limit(1);
        if (isMissingTableError(error, normalized)) {
            lossTableAvailabilityCache.set(normalized, false);
            return false;
        }
        lossTableAvailabilityCache.set(normalized, true);
        return true;
    } catch (error) {
        const missing = isMissingTableError(error, normalized);
        lossTableAvailabilityCache.set(normalized, !missing);
        return !missing;
    }
}

async function fetchUsdTotalsByCropIds(tableName, userId, cropIds, options = {}) {
    const totals = new Map();
    const normalizedUserId = normalizeCropId(userId);
    const ids = Array.from(new Set((cropIds || [])
        .map((id) => normalizeCropId(id))
        .filter(Boolean)));
    if (!normalizedUserId || ids.length === 0) return totals;

    const missingColumns = getTableMissingColumns(tableName);
    const amountFields = (Array.isArray(options.amountFields) && options.amountFields.length
        ? options.amountFields
        : ['amount', 'monto'])
        .map((field) => String(field || '').trim())
        .filter((field) => field && !missingColumns.has(field));
    let selectFields = Array.from(new Set([
        'crop_id',
        ...amountFields,
        'currency',
        'exchange_rate',
        'monto_usd',
        ...(Array.isArray(options.optionalFields) ? options.optionalFields : [])
    ].map((field) => String(field || '').trim()).filter((field) => field && !missingColumns.has(field))));
    let nullFilters = Array.from(new Set((Array.isArray(options.nullFilters) ? options.nullFilters : [])
        .map((field) => String(field || '').trim())
        .filter((field) => field && !missingColumns.has(field))));
    const rowFilters = (Array.isArray(options.rowFilters) ? options.rowFilters : [])
        .filter((filterFn) => typeof filterFn === 'function');
    const missingRateCountsByCrop = options.missingRateCountsByCrop instanceof Map
        ? options.missingRateCountsByCrop
        : null;
    const fallbackRates = options.fallbackRates && typeof options.fallbackRates === 'object'
        ? options.fallbackRates
        : editExchangeRates;

    for (let attempt = 0; attempt < 8; attempt += 1) {
        if (!selectFields.includes('crop_id')) break;

        let query = supabase
            .from(tableName)
            .select(selectFields.join(', '))
            .eq('user_id', normalizedUserId)
            .in('crop_id', ids);
        nullFilters.forEach((field) => {
            if (selectFields.includes(field)) {
                query = query.is(field, null);
            }
        });

        const { data, error } = await query;
        if (!error) {
            const rows = Array.isArray(data) ? data : [];
            for (const row of rows) {
                let passesFilters = true;
                if (rowFilters.length > 0) {
                    for (const filterFn of rowFilters) {
                        try {
                            if (!filterFn(row)) {
                                passesFilters = false;
                                break;
                            }
                        } catch (_filterError) {
                            passesFilters = false;
                            break;
                        }
                    }
                }
                if (!passesFilters) continue;

                const cropId = normalizeCropId(row?.crop_id);
                if (!cropId) continue;

                const conversionMeta = {};
                const usd = resolveRecordAmountUsd(row, amountFields, conversionMeta, fallbackRates);
                if (conversionMeta.missingRate) {
                    incrementCountMap(missingRateCountsByCrop, cropId, 1);
                }
                if (!Number.isFinite(usd)) continue;

                totals.set(cropId, (totals.get(cropId) || 0) + usd);
            }
            return totals;
        }

        if (isMissingTableError(error, tableName)) {
            return totals;
        }

        let removedAny = false;
        selectFields = selectFields.filter((field) => {
            if (isMissingColumnError(error, field)) {
                rememberMissingColumn(tableName, field);
                removedAny = true;
                return false;
            }
            return true;
        });
        if (removedAny) {
            nullFilters = nullFilters.filter((field) => selectFields.includes(field));
            continue;
        }

        console.warn(`[Agro] No se pudo calcular totales por cultivo en ${tableName}:`, error?.message || error);
        return totals;
    }

    return totals;
}

async function fetchExpenseTotalsByCropIds(userId, cropIds, options = {}) {
    return fetchUsdTotalsByCropIds('agro_expenses', userId, cropIds, {
        ...options,
        amountFields: ['amount'],
        optionalFields: ['deleted_at'],
        nullFilters: ['deleted_at']
    });
}

async function fetchIncomeTotalsByCropIds(userId, cropIds, options = {}) {
    return fetchUsdTotalsByCropIds('agro_income', userId, cropIds, {
        ...options,
        amountFields: ['monto'],
        optionalFields: ['deleted_at', 'reverted_at'],
        nullFilters: ['deleted_at', 'reverted_at']
    });
}

async function fetchLossTotalsByCropIds(userId, cropIds, options = {}) {
    const queryOptions = {
        ...options,
        amountFields: ['monto'],
        optionalFields: ['deleted_at', 'reverted_at'],
        nullFilters: ['deleted_at', 'reverted_at']
    };
    for (const tableName of LOSS_TABLE_CANDIDATES) {
        const available = await isTableAvailable(tableName);
        if (!available) continue;
        return fetchUsdTotalsByCropIds(tableName, userId, cropIds, queryOptions);
    }
    return new Map();
}

async function fetchPendingTotalsByCropIds(userId, cropIds, options = {}) {
    const baseRowFilters = [
        (row) => String(row?.transfer_state || '').trim().toLowerCase() !== 'transferred'
    ];
    const extraRowFilters = Array.isArray(options.rowFilters)
        ? options.rowFilters.filter((filterFn) => typeof filterFn === 'function')
        : [];

    return fetchUsdTotalsByCropIds('agro_pending', userId, cropIds, {
        ...options,
        amountFields: ['monto'],
        optionalFields: ['deleted_at', 'transfer_state'],
        nullFilters: ['deleted_at'],
        rowFilters: [...baseRowFilters, ...extraRowFilters]
    });
}

const HARVEST_APPROX_TOOLTIP = 'Aprox.: La fecha estimada se calcula por duración promedio del cultivo. Puede variar según clima, manejo y condiciones reales.';

function toPositiveRate(value) {
    const parsed = toSafeLocaleNumber(value);
    return parsed !== null && parsed > 0 ? parsed : null;
}

function normalizeCropInvestmentCurrency(value) {
    const raw = String(value || '').trim().toUpperCase();
    return SUPPORTED_CURRENCIES[raw] ? raw : 'USD';
}

function resolveCropFxSnapshot(crop) {
    const cop = toPositiveRate(crop?.investment_fx_usd_cop ?? crop?.fx_usd_cop);
    const ves = toPositiveRate(crop?.investment_fx_usd_ves ?? crop?.fx_usd_ves ?? crop?.investment_fx_usd_bs ?? crop?.fx_usd_bs);
    const fxAtRaw = crop?.investment_fx_at ?? crop?.fx_at ?? null;
    const fxAt = fxAtRaw ? new Date(fxAtRaw) : null;
    return {
        usdCop: cop,
        usdVes: ves,
        fxAt: fxAt && !Number.isNaN(fxAt.getTime()) ? fxAt : null,
        hasSnapshot: !!(cop || ves)
    };
}

function resolveEffectiveUsdRates(fxSnapshot) {
    const marketCop = toPositiveRate(getRate('COP', editExchangeRates));
    const marketVes = toPositiveRate(getRate('VES', editExchangeRates));
    const usdCop = toPositiveRate(fxSnapshot?.usdCop) || marketCop;
    const usdVes = toPositiveRate(fxSnapshot?.usdVes) || marketVes;
    return { usdCop, usdVes };
}

function resolveCropInvestmentSnapshot(crop) {
    const currency = normalizeCropInvestmentCurrency(crop?.investment_currency);
    const legacyUsd = toSafeLocaleNumber(crop?.investment) ?? 0;
    const amountStored = toSafeLocaleNumber(crop?.investment_amount);
    const amount = amountStored !== null ? amountStored : legacyUsd;
    const fxSnapshot = resolveCropFxSnapshot(crop);
    const rates = resolveEffectiveUsdRates(fxSnapshot);

    let usdEquiv = toSafeLocaleNumber(crop?.investment_usd_equiv);
    if (usdEquiv === null) {
        if (currency === 'USD') {
            usdEquiv = amount;
        } else {
            const localRate = currency === 'COP' ? rates.usdCop : rates.usdVes;
            if (localRate && localRate > 0) {
                usdEquiv = convertToUSD(amount, currency, localRate);
            }
        }
    }

    if (!Number.isFinite(usdEquiv)) {
        usdEquiv = legacyUsd;
    }

    return {
        currency,
        amount: Number.isFinite(amount) ? amount : 0,
        usdEquiv: Number.isFinite(usdEquiv) ? usdEquiv : 0,
        fxSnapshot
    };
}

function formatMoneyByCode(value, code) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
        if (code === 'COP') return 'N/D COP';
        if (code === 'VES') return 'N/D Bs';
        return 'N/D';
    }

    if (code === 'USD') {
        return `$${amount.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        })}`;
    }
    if (code === 'COP') {
        return `${Math.round(amount).toLocaleString('es-CO')} COP`;
    }
    return `${amount.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} Bs`;
}

function formatInvestmentTriplet(usdAmount, rates) {
    const safeUsd = Number.isFinite(usdAmount) ? usdAmount : 0;
    const copAmount = Number.isFinite(rates?.usdCop) ? safeUsd * rates.usdCop : Number.NaN;
    const vesAmount = Number.isFinite(rates?.usdVes) ? safeUsd * rates.usdVes : Number.NaN;
    return `${formatMoneyByCode(safeUsd, 'USD')} · ${formatMoneyByCode(copAmount, 'COP')} · ${formatMoneyByCode(vesAmount, 'VES')}`;
}

function formatFxRateLabel(rate, code) {
    const safeRate = Number(rate);
    if (!Number.isFinite(safeRate) || safeRate <= 0) return 'N/D';
    if (code === 'COP') {
        return Math.round(safeRate).toLocaleString('es-CO');
    }
    return safeRate.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatFxTimestampLabel(fxDate) {
    if (!(fxDate instanceof Date) || Number.isNaN(fxDate.getTime())) {
        return 'sin fecha';
    }
    return fxDate.toLocaleString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function buildInvestmentFxLine(fxSnapshot, rates) {
    const copRate = Number.isFinite(rates?.usdCop) ? rates.usdCop : Number.NaN;
    const vesRate = Number.isFinite(rates?.usdVes) ? rates.usdVes : Number.NaN;
    if (!Number.isFinite(copRate) && !Number.isFinite(vesRate)) {
        return 'Cotización usada: no disponible (solo USD).';
    }
    const timestampLabel = fxSnapshot?.hasSnapshot
        ? formatFxTimestampLabel(fxSnapshot?.fxAt)
        : 'tasa actual';
    return `Cotización usada: 1 USD = ${formatFxRateLabel(copRate, 'COP')} COP · 1 USD = ${formatFxRateLabel(vesRate, 'VES')} Bs (${timestampLabel})`;
}

function createEstimatedHarvestMetaItem(expectedHarvestDate) {
    const item = createMetaItem('Cosecha Est.', formatDate(expectedHarvestDate));
    const valueEl = item.querySelector('.meta-value');
    if (valueEl) {
        const hint = document.createElement('span');
        hint.className = 'crop-meta-subline is-hint';
        hint.textContent = 'Aprox. ⓘ';
        hint.title = HARVEST_APPROX_TOOLTIP;
        hint.setAttribute('aria-label', HARVEST_APPROX_TOOLTIP);
        valueEl.appendChild(hint);
    }
    return item;
}

function createInvestmentMetaItem(baseInvestmentUsd, expenseInvestmentUsd, fxSnapshot, rates) {
    const base = Number.isFinite(baseInvestmentUsd) ? baseInvestmentUsd : 0;
    const expenses = Number.isFinite(expenseInvestmentUsd) ? expenseInvestmentUsd : 0;
    const total = base + expenses;
    const displayRates = rates || resolveEffectiveUsdRates(fxSnapshot);
    const totalText = formatInvestmentTriplet(total, displayRates);
    const item = createMetaItem('Inversión (Total)', totalText, 'gold');
    const valueEl = item.querySelector('.meta-value');
    markMoneyNode(valueEl, totalText);
    if (valueEl) {
        const breakdown = document.createElement('span');
        breakdown.className = 'crop-meta-subline';
        const baseLabel = document.createElement('span');
        baseLabel.textContent = 'Base: ';
        const baseValue = document.createElement('span');
        baseValue.textContent = formatInvestmentTriplet(base, displayRates);
        markMoneyNode(baseValue, baseValue.textContent);
        const plusLabel = document.createElement('span');
        plusLabel.textContent = ' + Gastos: ';
        const expenseValue = document.createElement('span');
        expenseValue.textContent = formatInvestmentTriplet(expenses, displayRates);
        markMoneyNode(expenseValue, expenseValue.textContent);
        breakdown.append(baseLabel, baseValue, plusLabel, expenseValue);
        const fxLine = document.createElement('span');
        fxLine.className = 'crop-meta-subline is-muted';
        fxLine.textContent = buildInvestmentFxLine(fxSnapshot, displayRates);
        valueEl.appendChild(breakdown);
        valueEl.appendChild(fxLine);
    }
    return item;
}

function createProfitMetaItem(incomeTotal, costTotal, pendingTotal = 0, missingRateCount = 0) {
    const income = Number.isFinite(incomeTotal) ? incomeTotal : 0;
    const costs = Number.isFinite(costTotal) ? costTotal : 0;
    const pending = Number.isFinite(pendingTotal) ? pendingTotal : 0;
    const missing = Number.isFinite(missingRateCount) ? Math.max(0, Math.floor(missingRateCount)) : 0;
    const net = income - costs;
    const potential = net + pending;
    const item = createMetaItem('Rentabilidad (cobrado)', formatCurrency(net));
    const valueEl = item.querySelector('.meta-value');
    markMoneyNode(valueEl, valueEl?.textContent || '');
    if (valueEl) {
        valueEl.style.color = net >= 0 ? 'var(--gold-light)' : 'var(--danger)';
        const breakdown = document.createElement('span');
        breakdown.style.cssText = 'display:block;font-size:0.64rem;font-weight:500;color:rgba(255,255,255,0.62);margin-top:2px;line-height:1.2;';
        const paidLabel = document.createElement('span');
        paidLabel.textContent = 'Pagados: ';
        const paidValue = document.createElement('span');
        paidValue.textContent = formatCurrency(income);
        markMoneyNode(paidValue, paidValue.textContent);
        const costLabel = document.createElement('span');
        costLabel.textContent = ' | Costos: ';
        const costValue = document.createElement('span');
        costValue.textContent = formatCurrency(costs);
        markMoneyNode(costValue, costValue.textContent);
        breakdown.append(paidLabel, paidValue, costLabel, costValue);
        const pendingLine = document.createElement('span');
        pendingLine.style.cssText = 'display:block;font-size:0.64rem;font-weight:600;margin-top:2px;line-height:1.2;';
        pendingLine.style.color = potential >= 0 ? 'var(--gold-light)' : 'var(--danger)';
        const pendingLabel = document.createElement('span');
        pendingLabel.textContent = 'Fiados: ';
        const pendingValue = document.createElement('span');
        pendingValue.textContent = formatCurrency(pending);
        markMoneyNode(pendingValue, pendingValue.textContent);
        const potentialLabel = document.createElement('span');
        potentialLabel.textContent = ' | Potencial: ';
        const potentialValue = document.createElement('span');
        potentialValue.textContent = formatCurrency(potential);
        markMoneyNode(potentialValue, potentialValue.textContent);
        pendingLine.append(pendingLabel, pendingValue, potentialLabel, potentialValue);
        valueEl.appendChild(breakdown);
        valueEl.appendChild(pendingLine);
        if (missing > 0) {
            const warningLine = document.createElement('span');
            warningLine.style.cssText = 'display:block;font-size:0.62rem;font-weight:600;color:var(--danger);margin-top:2px;line-height:1.2;';
            warningLine.textContent = `⚠️ ${missing} movimiento${missing === 1 ? '' : 's'} sin tasa/moneda (no incluidos)`;
            valueEl.appendChild(warningLine);
        }
    }
    return item;
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

function resolveCropNameFromCache(cropId) {
    const normalizedId = normalizeCropId(cropId);
    if (!normalizedId) return '';
    const match = Array.isArray(cropsCache)
        ? cropsCache.find((crop) => normalizeCropId(crop?.id) === normalizedId)
        : null;
    return String(match?.name || '').trim();
}

function resolveRecordCropLabel(item) {
    const normalizedId = normalizeCropId(item?.crop_id);
    if (!normalizedId) return AGRO_GENERAL_LABEL;
    const direct = String(item?.crop_name || '').trim();
    if (direct) return direct;
    const fromCache = resolveCropNameFromCache(normalizedId);
    return fromCache || 'Cultivo';
}

function createGeneralViewCardElement() {
    const card = document.createElement('div');
    card.className = 'card crop-card animate-in delay-4';
    card.dataset.cropId = AGRO_GENERAL_VIEW_ID;
    card.dataset.generalView = '1';

    const header = document.createElement('div');
    header.className = 'crop-card-header';

    const cropInfo = document.createElement('div');
    cropInfo.className = 'crop-info';

    const icon = document.createElement('div');
    icon.className = 'crop-icon';
    icon.textContent = '📋';

    const details = document.createElement('div');
    details.className = 'crop-details-header';

    const name = document.createElement('span');
    name.className = 'crop-name';
    name.textContent = 'Vista General';

    const variety = document.createElement('span');
    variety.className = 'crop-variety';
    variety.textContent = AGRO_GENERAL_SUBLABEL;

    details.append(name, variety);
    cropInfo.append(icon, details);
    header.appendChild(cropInfo);

    const metaSection = document.createElement('div');
    metaSection.className = 'crop-meta';
    metaSection.append(
        createMetaItem('Movimientos', 'Todos los movimientos', 'meta-value')
    );
    metaSection.append(
        createMetaItem(
            'Resumen',
            formatOpsMovementSummaryLine(getOpsMovementSummaryState(), 'global', OPS_ACTIVE_CROPS_SUMMARY_ORDER),
            'general-movement-summary'
        )
    );

    card.append(header, metaSection);
    return card;
}

function createCropCardElement(crop, index, options = {}) {
    const displayCrop = getCropDisplayParts(crop);
    const isAuditCard = !!options.isAuditCard;
    const expenseTotalsByCrop = options.expenseTotalsByCrop instanceof Map ? options.expenseTotalsByCrop : null;
    const incomeTotalsByCrop = options.incomeTotalsByCrop instanceof Map ? options.incomeTotalsByCrop : null;
    const lossTotalsByCrop = options.lossTotalsByCrop instanceof Map ? options.lossTotalsByCrop : null;
    const pendingTotalsByCrop = options.pendingTotalsByCrop instanceof Map ? options.pendingTotalsByCrop : null;
    const missingRateCountsByCrop = options.missingRateCountsByCrop instanceof Map ? options.missingRateCountsByCrop : null;
    const delay = 4 + index; // Para animaciones escalonadas
    const card = document.createElement('div');
    card.className = `card crop-card animate-in delay-${delay}`;
    if (isAuditCard) {
        card.classList.add('crop-card-audit');
        card.dataset.cropOrphan = '1';
    }
    const cropId = crop?.id !== undefined && crop?.id !== null ? String(crop.id) : null;
    if (cropId) {
        card.dataset.cropId = cropId;
    }

    const actions = document.createElement('div');
    actions.className = 'crop-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit-crop';
    editBtn.type = 'button';
    editBtn.title = 'Editar Cultivo';
    editBtn.replaceChildren();
    const editIcon = document.createElement('i');
    editIcon.className = 'fa-solid fa-pen';
    editBtn.appendChild(editIcon);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete-crop';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Eliminar Cultivo';
    deleteBtn.replaceChildren();
    const trashIcon = document.createElement('i');
    trashIcon.className = 'fa-solid fa-trash';
    deleteBtn.appendChild(trashIcon);

    if (crop?.id !== undefined && crop?.id !== null) {
        const cropId = String(crop.id);
        editBtn.dataset.id = cropId;
        deleteBtn.dataset.id = cropId;
    }

    const reportBtn = document.createElement('button');
    reportBtn.className = 'btn-report-crop';
    reportBtn.type = 'button';
    reportBtn.title = isAuditCard ? 'Informe del ciclo (auditoría)' : 'Informe del Cultivo';
    reportBtn.replaceChildren();
    const reportIcon = document.createElement('i');
    reportIcon.className = 'fa-solid fa-chart-bar';
    reportBtn.appendChild(reportIcon);
    if (crop?.id !== undefined && crop?.id !== null) {
        reportBtn.dataset.id = String(crop.id);
    }
    if (isAuditCard) {
        reportBtn.dataset.cropOrphan = '1';
    }

    actions.append(reportBtn, editBtn, deleteBtn);
    if (isAuditCard) {
        editBtn.disabled = true;
        deleteBtn.disabled = true;
        editBtn.title = 'No disponible para ciclos huérfanos';
        deleteBtn.title = 'No disponible para ciclos huérfanos';
        editBtn.classList.add('crop-action-disabled');
        deleteBtn.classList.add('crop-action-disabled');
    }

    const header = document.createElement('div');
    header.className = 'crop-card-header';

    const cropInfo = document.createElement('div');
    cropInfo.className = 'crop-info';

    const cropIcon = document.createElement('div');
    cropIcon.className = 'crop-icon';
    cropIcon.textContent = displayCrop.icon;

    const details = document.createElement('div');
    details.className = 'crop-details-header';

    const name = document.createElement('span');
    name.className = 'crop-name';
    name.textContent = displayCrop.name;
    markBuyerNameNode(name, displayCrop.name);

    const variety = document.createElement('span');
    variety.className = 'crop-variety';
    const varietyText = String(crop?.variety || '').trim();
    variety.textContent = varietyText || 'Sin variedad';
    if (varietyText) {
        markBuyerNameNode(variety, varietyText);
    }

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
    const normalizedCropId = normalizeCropId(crop?.id);
    const investmentSnapshot = resolveCropInvestmentSnapshot(crop);
    const baseInvestment = investmentSnapshot.usdEquiv;
    const fxSnapshot = investmentSnapshot.fxSnapshot;
    const effectiveRates = resolveEffectiveUsdRates(fxSnapshot);
    const expenseInvestment = normalizedCropId && expenseTotalsByCrop
        ? (Number(expenseTotalsByCrop.get(normalizedCropId)) || 0)
        : 0;
    const incomeTotal = normalizedCropId && incomeTotalsByCrop
        ? (Number(incomeTotalsByCrop.get(normalizedCropId)) || 0)
        : 0;
    const lossesTotal = normalizedCropId && lossTotalsByCrop
        ? (Number(lossTotalsByCrop.get(normalizedCropId)) || 0)
        : 0;
    const pendingTotal = normalizedCropId && pendingTotalsByCrop
        ? (Number(pendingTotalsByCrop.get(normalizedCropId)) || 0)
        : 0;
    const missingRateCount = normalizedCropId && missingRateCountsByCrop
        ? (Number(missingRateCountsByCrop.get(normalizedCropId)) || 0)
        : 0;
    const totalCosts = baseInvestment + expenseInvestment + lossesTotal;
    metaGrid.append(
        createMetaItem('Siembra', formatDate(crop.start_date)),
        createEstimatedHarvestMetaItem(crop.expected_harvest_date),
        createMetaItem('Area', `${crop.area_size} Ha`),
        createInvestmentMetaItem(baseInvestment, expenseInvestment, fxSnapshot, effectiveRates),
        createProfitMetaItem(incomeTotal, totalCosts, pendingTotal, missingRateCount)
    );

    card.append(actions, header, progressSection, metaGrid);
    return card;
}

function mapStatusToCycleState(status) {
    const normalized = normalizeCropStatus(status);
    if (normalized === 'produccion') return 'produccion';
    if (normalized === 'sembrado' || normalized === 'creciendo') return 'siembra';
    return 'cosecha';
}

function buildActiveCycleCardsData(crops, options = {}) {
    const expenseTotalsByCrop = options.expenseTotalsByCrop instanceof Map ? options.expenseTotalsByCrop : null;
    const incomeTotalsByCrop = options.incomeTotalsByCrop instanceof Map ? options.incomeTotalsByCrop : null;
    const lossTotalsByCrop = options.lossTotalsByCrop instanceof Map ? options.lossTotalsByCrop : null;
    const pendingTotalsByCrop = options.pendingTotalsByCrop instanceof Map ? options.pendingTotalsByCrop : null;
    const missingRateCountsByCrop = options.missingRateCountsByCrop instanceof Map ? options.missingRateCountsByCrop : null;
    const rows = Array.isArray(crops) ? crops : [];

    return rows.map((crop) => {
        const displayCrop = getCropDisplayParts(crop);
        const templateDuration = getTemplateDurationForCrop(crop);
        const progress = computeCropProgress(crop, templateDuration);
        const effectiveStatus = resolveCropStatus(crop, progress);
        const statusMeta = getCropStatusMeta(effectiveStatus);
        const cycleState = mapStatusToCycleState(effectiveStatus);
        const normalizedCropId = normalizeCropId(crop?.id);

        const investmentSnapshot = resolveCropInvestmentSnapshot(crop);
        const baseInvestment = investmentSnapshot.usdEquiv;
        const fxSnapshot = investmentSnapshot.fxSnapshot;
        const effectiveRates = resolveEffectiveUsdRates(fxSnapshot);

        const expenseInvestment = normalizedCropId && expenseTotalsByCrop
            ? (Number(expenseTotalsByCrop.get(normalizedCropId)) || 0)
            : 0;
        const incomeTotal = normalizedCropId && incomeTotalsByCrop
            ? (Number(incomeTotalsByCrop.get(normalizedCropId)) || 0)
            : 0;
        const lossesTotal = normalizedCropId && lossTotalsByCrop
            ? (Number(lossTotalsByCrop.get(normalizedCropId)) || 0)
            : 0;
        const pendingTotal = normalizedCropId && pendingTotalsByCrop
            ? (Number(pendingTotalsByCrop.get(normalizedCropId)) || 0)
            : 0;
        const missingRateCount = normalizedCropId && missingRateCountsByCrop
            ? (Number(missingRateCountsByCrop.get(normalizedCropId)) || 0)
            : 0;

        const totalCosts = baseInvestment + expenseInvestment + lossesTotal;
        const net = incomeTotal - totalCosts;
        const potential = net + pendingTotal;
        const areaSize = Number(crop?.area_size);
        const areaText = Number.isFinite(areaSize) ? `${areaSize} Ha` : 'N/A';
        const baseTriplet = formatInvestmentTriplet(baseInvestment, effectiveRates);
        const cotizacionBase = buildInvestmentFxLine(fxSnapshot, effectiveRates);
        const cotizacion = missingRateCount > 0
            ? `${cotizacionBase} · ${missingRateCount} movimiento${missingRateCount === 1 ? '' : 's'} sin tasa/moneda.`
            : cotizacionBase;

        return {
            id: crop?.id !== undefined && crop?.id !== null ? String(crop.id) : '',
            nombre: displayCrop.name || 'Cultivo',
            variedad: String(crop?.variety || '').trim() || 'Sin variedad',
            icono: displayCrop.icon || '🌱',
            estado: cycleState,
            estadoTexto: statusMeta?.text || 'En producción',
            area: areaText,
            siembra: formatDate(crop?.start_date),
            cosechaEst: formatDate(crop?.expected_harvest_date),
            diaActual: progress.ok ? Number(progress.dayIndex || 0) : 0,
            diasTotales: progress.ok ? Number(progress.totalDays || 0) : 0,
            porcentaje: progress.ok ? normalizeProgress(progress.percent) : 0,
            inversionUSD: baseInvestment,
            rentabilidad: net,
            potencialNeto: potential,
            desglose: {
                base: baseTriplet,
                gastos: formatCurrency(expenseInvestment),
                pagados: formatCurrency(incomeTotal),
                costos: formatCurrency(totalCosts),
                fiados: formatCurrency(pendingTotal),
                cotizacion
            }
        };
    });
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

function buildNoActiveCropsCard(finishedCount = 0) {
    return buildCropsStatusCard({
        id: `${CROPS_EMPTY_ID}-active`,
        icon: '📚',
        title: 'No tienes cultivos activos',
        subtitle: finishedCount > 0
            ? `Revisa Historial de ciclos (${finishedCount}) para ver cultivos terminados`
            : 'Crea un nuevo cultivo para iniciar un ciclo',
        titleColor: 'var(--gold-primary)',
        titleWeight: '600'
    });
}

function createCycleHistoryGroupSection(config = {}) {
    const section = document.createElement('section');
    section.id = String(config.sectionId || '').trim();
    section.className = 'crop-history-group';

    const title = document.createElement('p');
    title.id = String(config.titleId || '').trim();
    title.className = `crop-history-group-title${config.titleClass ? ` ${config.titleClass}` : ''}`;
    title.textContent = String(config.titleText || 'Historial de ciclos');

    const grid = document.createElement('div');
    grid.id = String(config.gridId || '').trim();
    grid.className = 'crops-grid';

    section.append(title, grid);
    return { section, title, grid };
}

function ensureCropCycleHistorySection() {
    const cropsSection = document.querySelector('.crops-section');
    if (!cropsSection) return null;

    let details = document.getElementById(CROP_CYCLE_HISTORY_SECTION_ID);
    if (!details) {
        details = document.createElement('details');
        details.id = CROP_CYCLE_HISTORY_SECTION_ID;
        details.className = 'yg-accordion animate-in delay-4';
        details.open = false;

        const summary = document.createElement('summary');
        summary.className = 'yg-accordion-summary';

        const icon = document.createElement('span');
        icon.className = 'yg-accordion-icon';
        icon.replaceChildren();
        const historyIcon = document.createElement('i');
        historyIcon.className = 'fa-solid fa-clock-rotate-left';
        icon.appendChild(historyIcon);

        const title = document.createElement('span');
        title.className = 'yg-accordion-title';
        title.id = CROP_CYCLE_HISTORY_TITLE_ID;
        title.textContent = 'Historial de ciclos (0)';

        const chevron = document.createElement('span');
        chevron.className = 'yg-accordion-chevron';
        chevron.replaceChildren();
        const historyChevronIcon = document.createElement('i');
        historyChevronIcon.className = 'fa-solid fa-chevron-down';
        chevron.appendChild(historyChevronIcon);

        summary.append(icon, title, chevron);

        const content = document.createElement('div');
        content.className = 'yg-accordion-content';
        content.id = `${CROP_CYCLE_HISTORY_SECTION_ID}-content`;

        const finishedGroup = createCycleHistoryGroupSection({
            sectionId: CROP_CYCLE_FINISHED_SECTION_ID,
            titleId: CROP_CYCLE_FINISHED_TITLE_ID,
            gridId: CROP_CYCLE_HISTORY_GRID_ID,
            titleText: 'Historial de ciclos finalizados (0)'
        });
        const lostGroup = createCycleHistoryGroupSection({
            sectionId: CROP_CYCLE_LOST_SECTION_ID,
            titleId: CROP_CYCLE_LOST_TITLE_ID,
            gridId: CROP_CYCLE_LOST_GRID_ID,
            titleText: 'Historial de ciclos perdidos (0)',
            titleClass: 'crop-history-group-title-lost'
        });

        const auditDetails = document.createElement('details');
        auditDetails.id = CROP_CYCLE_AUDIT_SECTION_ID;
        auditDetails.className = 'yg-accordion crop-history-audit';
        auditDetails.open = false;

        const auditSummary = document.createElement('summary');
        auditSummary.className = 'yg-accordion-summary';

        const auditIcon = document.createElement('span');
        auditIcon.className = 'yg-accordion-icon';
        auditIcon.replaceChildren();
        const auditFlaskIcon = document.createElement('i');
        auditFlaskIcon.className = 'fa-solid fa-flask-vial';
        auditIcon.appendChild(auditFlaskIcon);

        const auditTitle = document.createElement('span');
        auditTitle.className = 'yg-accordion-title';
        auditTitle.id = CROP_CYCLE_AUDIT_TITLE_ID;
        auditTitle.textContent = '🧪 Auditoría (0)';

        const auditChevron = document.createElement('span');
        auditChevron.className = 'yg-accordion-chevron';
        auditChevron.replaceChildren();
        const auditChevronIcon = document.createElement('i');
        auditChevronIcon.className = 'fa-solid fa-chevron-down';
        auditChevron.appendChild(auditChevronIcon);

        auditSummary.append(auditIcon, auditTitle, auditChevron);

        const auditContent = document.createElement('div');
        auditContent.className = 'yg-accordion-content';

        const auditNote = document.createElement('p');
        auditNote.className = 'crop-history-audit-note';
        auditNote.textContent = 'Ciclos huérfanos detectados para trazabilidad. Exporta solo si corresponde.';

        const auditGrid = document.createElement('div');
        auditGrid.id = CROP_CYCLE_AUDIT_GRID_ID;
        auditGrid.className = 'crops-grid';

        auditContent.append(auditNote, auditGrid);
        auditDetails.append(auditSummary, auditContent);

        content.append(finishedGroup.section, lostGroup.section, auditDetails);
        details.append(summary, content);
        cropsSection.appendChild(details);
    }

    let contentEl = details.querySelector(`#${CROP_CYCLE_HISTORY_SECTION_ID}-content`) || details.querySelector('.yg-accordion-content');
    if (!contentEl) {
        contentEl = document.createElement('div');
        contentEl.className = 'yg-accordion-content';
        contentEl.id = `${CROP_CYCLE_HISTORY_SECTION_ID}-content`;
        details.appendChild(contentEl);
    }

    let auditDetailsEl = document.getElementById(CROP_CYCLE_AUDIT_SECTION_ID);
    if (!auditDetailsEl) {
        auditDetailsEl = document.createElement('details');
        auditDetailsEl.id = CROP_CYCLE_AUDIT_SECTION_ID;
        auditDetailsEl.className = 'yg-accordion crop-history-audit';
        auditDetailsEl.open = false;

        const auditSummary = document.createElement('summary');
        auditSummary.className = 'yg-accordion-summary';

        const auditIcon = document.createElement('span');
        auditIcon.className = 'yg-accordion-icon';
        auditIcon.replaceChildren();
        const auditFlaskIcon = document.createElement('i');
        auditFlaskIcon.className = 'fa-solid fa-flask-vial';
        auditIcon.appendChild(auditFlaskIcon);

        const auditTitle = document.createElement('span');
        auditTitle.className = 'yg-accordion-title';
        auditTitle.id = CROP_CYCLE_AUDIT_TITLE_ID;
        auditTitle.textContent = '🧪 Auditoría (0)';

        const auditChevron = document.createElement('span');
        auditChevron.className = 'yg-accordion-chevron';
        auditChevron.replaceChildren();
        const auditChevronIcon = document.createElement('i');
        auditChevronIcon.className = 'fa-solid fa-chevron-down';
        auditChevron.appendChild(auditChevronIcon);

        auditSummary.append(auditIcon, auditTitle, auditChevron);

        const auditContent = document.createElement('div');
        auditContent.className = 'yg-accordion-content';

        const auditNote = document.createElement('p');
        auditNote.className = 'crop-history-audit-note';
        auditNote.textContent = 'Ciclos huérfanos detectados para trazabilidad. Exporta solo si corresponde.';

        const auditGrid = document.createElement('div');
        auditGrid.id = CROP_CYCLE_AUDIT_GRID_ID;
        auditGrid.className = 'crops-grid';

        auditContent.append(auditNote, auditGrid);
        auditDetailsEl.append(auditSummary, auditContent);
        contentEl.appendChild(auditDetailsEl);
    }

    let finishedSectionEl = document.getElementById(CROP_CYCLE_FINISHED_SECTION_ID);
    if (!finishedSectionEl) {
        const legacyFinishedGridEl = document.getElementById(CROP_CYCLE_HISTORY_GRID_ID);
        const group = createCycleHistoryGroupSection({
            sectionId: CROP_CYCLE_FINISHED_SECTION_ID,
            titleId: CROP_CYCLE_FINISHED_TITLE_ID,
            gridId: CROP_CYCLE_HISTORY_GRID_ID,
            titleText: 'Historial de ciclos finalizados (0)'
        });
        if (legacyFinishedGridEl
            && legacyFinishedGridEl !== group.grid
            && !legacyFinishedGridEl.closest(`#${CROP_CYCLE_FINISHED_SECTION_ID}`)) {
            group.section.replaceChild(legacyFinishedGridEl, group.grid);
        }
        contentEl.insertBefore(group.section, auditDetailsEl);
        finishedSectionEl = group.section;
    }

    let lostSectionEl = document.getElementById(CROP_CYCLE_LOST_SECTION_ID);
    if (!lostSectionEl) {
        const group = createCycleHistoryGroupSection({
            sectionId: CROP_CYCLE_LOST_SECTION_ID,
            titleId: CROP_CYCLE_LOST_TITLE_ID,
            gridId: CROP_CYCLE_LOST_GRID_ID,
            titleText: 'Historial de ciclos perdidos (0)',
            titleClass: 'crop-history-group-title-lost'
        });
        contentEl.insertBefore(group.section, auditDetailsEl);
        lostSectionEl = group.section;
    }

    const titleEl = document.getElementById(CROP_CYCLE_HISTORY_TITLE_ID);
    const finishedTitleEl = document.getElementById(CROP_CYCLE_FINISHED_TITLE_ID);
    const finishedGridEl = document.getElementById(CROP_CYCLE_HISTORY_GRID_ID);
    const lostTitleEl = document.getElementById(CROP_CYCLE_LOST_TITLE_ID);
    const lostGridEl = document.getElementById(CROP_CYCLE_LOST_GRID_ID);
    const auditTitleEl = document.getElementById(CROP_CYCLE_AUDIT_TITLE_ID);
    const auditGridEl = document.getElementById(CROP_CYCLE_AUDIT_GRID_ID);
    return {
        details,
        titleEl,
        finishedTitleEl,
        finishedGridEl,
        lostTitleEl,
        lostGridEl,
        auditDetailsEl,
        auditTitleEl,
        auditGridEl
    };
}

function hideCropCycleHistorySection() {
    const details = document.getElementById(CROP_CYCLE_HISTORY_SECTION_ID);
    if (details) {
        details.style.display = 'none';
    }
}

async function classifyCycleHistoryCrops(finishedCrops, options = {}) {
    const list = Array.isArray(finishedCrops) ? finishedCrops : [];
    if (!list.length) return { valid: [], orphan: [] };

    const source = String(options.source || '').toLowerCase();
    if (source === 'supabase') {
        return { valid: list.slice(), orphan: [] };
    }

    let userId = normalizeCropId(options.userId);
    if (!userId) {
        try {
            const { data: userData } = await supabase.auth.getUser();
            userId = normalizeCropId(userData?.user?.id);
        } catch (err) {
            userId = null;
        }
    }
    if (!userId) {
        return { valid: list.slice(), orphan: [] };
    }

    const ids = Array.from(
        new Set(
            list
                .map((crop) => normalizeCropId(crop?.id))
                .filter(Boolean)
        )
    );
    if (!ids.length) {
        return { valid: list.slice(), orphan: [] };
    }

    const existsMap = await resolveCropExistenceMap(userId, ids, { failOpen: true });
    const valid = [];
    const orphan = [];
    list.forEach((crop) => {
        const cropId = normalizeCropId(crop?.id);
        if (!cropId || existsMap[cropId] === false) {
            orphan.push(crop);
            return;
        }
        valid.push(crop);
    });
    return { valid, orphan };
}

function splitClosedCycleHistory(crops) {
    const list = Array.isArray(crops) ? crops : [];
    const finished = [];
    const lost = [];

    list.forEach((crop) => {
        const templateDuration = getTemplateDurationForCrop(crop);
        const progress = computeCropProgress(crop, templateDuration);
        const status = normalizeCropStatus(resolveCropStatus(crop, progress));
        if (status === 'lost') {
            lost.push(crop);
            return;
        }
        finished.push(crop);
    });

    return { finished, lost };
}

function renderCropCycleGroup(gridEl, crops, emptyText, options = {}) {
    if (!gridEl) return;
    const expenseTotalsByCrop = options.expenseTotalsByCrop instanceof Map ? options.expenseTotalsByCrop : null;
    const incomeTotalsByCrop = options.incomeTotalsByCrop instanceof Map ? options.incomeTotalsByCrop : null;
    const lossTotalsByCrop = options.lossTotalsByCrop instanceof Map ? options.lossTotalsByCrop : null;
    const pendingTotalsByCrop = options.pendingTotalsByCrop instanceof Map ? options.pendingTotalsByCrop : null;
    const missingRateCountsByCrop = options.missingRateCountsByCrop instanceof Map ? options.missingRateCountsByCrop : null;
    const rows = Array.isArray(crops) ? crops : [];

    gridEl.textContent = '';
    if (rows.length === 0) {
        const empty = document.createElement('p');
        empty.style.color = 'var(--text-muted)';
        empty.style.fontSize = '0.9rem';
        empty.style.textAlign = 'center';
        empty.style.padding = '1rem';
        empty.textContent = emptyText;
        gridEl.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    rows.forEach((crop, index) => {
        fragment.appendChild(createCropCardElement(crop, (index % 6) + 1, {
            expenseTotalsByCrop,
            incomeTotalsByCrop,
            lossTotalsByCrop,
            pendingTotalsByCrop,
            missingRateCountsByCrop
        }));
    });
    gridEl.appendChild(fragment);
}

function renderCropCycleHistory(crops, orphanCrops = [], options = {}) {
    const ui = ensureCropCycleHistorySection();
    if (!ui) return;
    const expenseTotalsByCrop = options.expenseTotalsByCrop instanceof Map ? options.expenseTotalsByCrop : null;
    const incomeTotalsByCrop = options.incomeTotalsByCrop instanceof Map ? options.incomeTotalsByCrop : null;
    const lossTotalsByCrop = options.lossTotalsByCrop instanceof Map ? options.lossTotalsByCrop : null;
    const pendingTotalsByCrop = options.pendingTotalsByCrop instanceof Map ? options.pendingTotalsByCrop : null;
    const missingRateCountsByCrop = options.missingRateCountsByCrop instanceof Map ? options.missingRateCountsByCrop : null;

    const closedCrops = Array.isArray(crops) ? crops : [];
    const { finished: finishedCrops, lost: lostCrops } = splitClosedCycleHistory(closedCrops);
    const auditCrops = Array.isArray(orphanCrops) ? orphanCrops : [];
    const {
        details,
        titleEl,
        finishedTitleEl,
        finishedGridEl,
        lostTitleEl,
        lostGridEl,
        auditDetailsEl,
        auditTitleEl,
        auditGridEl
    } = ui;
    details.style.display = 'block';

    if (titleEl) {
        titleEl.textContent = `Historial de ciclos (${closedCrops.length})`;
    }
    if (finishedTitleEl) {
        finishedTitleEl.textContent = `Historial de ciclos finalizados (${finishedCrops.length})`;
    }
    if (lostTitleEl) {
        lostTitleEl.textContent = `Historial de ciclos perdidos (${lostCrops.length})`;
    }
    if (!finishedGridEl || !lostGridEl) return;

    const hasAnyClosedCycle = (finishedCrops.length + lostCrops.length) > 0;
    const finishedEmptyText = hasAnyClosedCycle
        ? 'Sin ciclos finalizados por ahora.'
        : (auditCrops.length > 0
            ? 'Sin ciclos válidos por ahora. Revisa la sección 🧪 Auditoría.'
            : 'Sin ciclos cerrados por ahora.');

    renderCropCycleGroup(finishedGridEl, finishedCrops, finishedEmptyText, {
        expenseTotalsByCrop,
        incomeTotalsByCrop,
        lossTotalsByCrop,
        pendingTotalsByCrop,
        missingRateCountsByCrop
    });
    renderCropCycleGroup(lostGridEl, lostCrops, 'Sin ciclos perdidos por ahora.', {
        expenseTotalsByCrop,
        incomeTotalsByCrop,
        lossTotalsByCrop,
        pendingTotalsByCrop,
        missingRateCountsByCrop
    });

    if (auditTitleEl) {
        auditTitleEl.textContent = `🧪 Auditoría (${auditCrops.length})`;
    }
    if (!auditDetailsEl || !auditGridEl) return;

    if (auditCrops.length === 0) {
        auditDetailsEl.open = false;
        auditDetailsEl.style.display = 'none';
        auditGridEl.textContent = '';
        return;
    }

    auditDetailsEl.style.display = 'block';
    auditDetailsEl.open = false;
    auditGridEl.textContent = '';
    const auditFragment = document.createDocumentFragment();
    auditCrops.forEach((crop, index) => {
        auditFragment.appendChild(createCropCardElement(crop, (index % 6) + 1, {
            isAuditCard: true,
            expenseTotalsByCrop,
            incomeTotalsByCrop,
            lossTotalsByCrop,
            pendingTotalsByCrop,
            missingRateCountsByCrop
        }));
    });
    auditGridEl.appendChild(auditFragment);
}

/**
 * Carga cultivos del usuario (Supabase + LocalStorage fallback)
 */
export async function loadCrops() {
    const cropsGrid = document.querySelector('.crops-section > .crops-grid');
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
        try {
            const rates = await initExchangeRates();
            if (rates) {
                editExchangeRates = rates;
            }
        } catch (e) {
            // Non-blocking: cards fall back to USD if rates are unavailable.
        }

        let crops = [];
        let error = null;
        let source = 'supabase';
        let currentUserId = null;

        try {
            // 1. Intentar cargar desde Supabase
            const { data: userData } = await supabase.auth.getUser();
            currentUserId = normalizeCropId(userData?.user?.id);
            if (currentUserId) {
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

        let expenseTotalsByCrop = new Map();
        let incomeTotalsByCrop = new Map();
        let lossTotalsByCrop = new Map();
        let pendingTotalsByCrop = new Map();
        let missingRateCountsByCrop = new Map();
        if (source === 'supabase' && currentUserId && crops.length > 0) {
            const cropIds = crops.map((crop) => crop?.id);
            const totalsOptions = { missingRateCountsByCrop };
            const [expenseTotals, incomeTotals, lossTotals, pendingTotals] = await Promise.all([
                fetchExpenseTotalsByCropIds(currentUserId, cropIds, totalsOptions),
                fetchIncomeTotalsByCropIds(currentUserId, cropIds, totalsOptions),
                fetchLossTotalsByCropIds(currentUserId, cropIds, totalsOptions),
                fetchPendingTotalsByCropIds(currentUserId, cropIds, totalsOptions)
            ]);
            expenseTotalsByCrop = expenseTotals;
            incomeTotalsByCrop = incomeTotals;
            lossTotalsByCrop = lossTotals;
            pendingTotalsByCrop = pendingTotals;
            if (requestId !== cropsLoadSeq) return;
        }

        // Actualizar Estadísticas siempre (aunque esté vacío)
        updateStats(crops);
        clearCropsLoading(cropsGrid);

        if (crops.length === 0) {
            cropsCache = [];
            syncLazyCropConsumers(cropsCache);
            logAgroDebug('[AGRO] renderCrops START', { ts: new Date().toISOString(), seq: requestId, count: 0 });
            renderEmptyCropsState(cropsGrid);
            hideCropCycleHistorySection();
            logAgroDebug('[AGRO] renderCrops END', { ts: new Date().toISOString(), seq: requestId, count: 0 });
            const hadSelection = !!selectedCropId;
            setSelectedCropId(null, { silent: true });
            if (hadSelection) {
                dispatchCropChanged();
            }
            const snapshot = setCropsStatus('ready', { count: 0, requestId, crops: [] });
            dispatchCropsReady(snapshot);
            updateOpsMovementSummaryUI();
            scheduleOpsMovementSummaryRefresh();
            return;
        }

        // Guardar en cache para edición
        cropsCache = crops;
        syncLazyCropConsumers(cropsCache);
        const { active: activeCrops, finished: finishedCrops } = splitCropsByCycle(crops);
        const historyBuckets = await classifyCycleHistoryCrops(finishedCrops, { source });
        const visibleFinishedCrops = historyBuckets.valid;
        const orphanFinishedCrops = historyBuckets.orphan;
        if (requestId !== cropsLoadSeq) return;

        // Renderizar cultivos
        logAgroDebug('[AGRO] renderCrops START', { ts: new Date().toISOString(), seq: requestId, count: crops.length });
        cropsGrid.textContent = '';
        if (!cropsGrid.id) {
            cropsGrid.id = 'cyclesContainer';
        }
        const activeCycleCards = buildActiveCycleCardsData(activeCrops, {
            expenseTotalsByCrop,
            incomeTotalsByCrop,
            lossTotalsByCrop,
            pendingTotalsByCrop,
            missingRateCountsByCrop
        });
        const emptyActiveText = visibleFinishedCrops.length > 0
            ? 'No hay ciclos activos por ahora.'
            : 'No hay ciclos activos. Crea tu primer cultivo.';
        await initCiclos(cropsGrid.id, {
            cycles: activeCycleCards,
            emptyStateText: emptyActiveText
        });
        renderCropCycleHistory(visibleFinishedCrops, orphanFinishedCrops, {
            expenseTotalsByCrop,
            incomeTotalsByCrop,
            lossTotalsByCrop,
            pendingTotalsByCrop,
            missingRateCountsByCrop
        });
        const prevSelected = selectedCropId;
        syncSelectedCropFromList(crops, { silent: true });
        if (prevSelected !== selectedCropId) {
            dispatchCropChanged();
        }
        logAgroDebug('[AGRO] renderCrops END', {
            ts: new Date().toISOString(),
            seq: requestId,
            total: crops.length,
            active: activeCrops.length,
            finished: visibleFinishedCrops.length,
            auditOrphans: orphanFinishedCrops.length
        });
        const snapshot = setCropsStatus('ready', { count: crops.length, requestId, crops });
        dispatchCropsReady(snapshot);
        updateOpsMovementSummaryUI();
        scheduleOpsMovementSummaryRefresh();

        console.info(`[AGRO] V9.8: active cycles ${activeCrops.length}, finished cycles ${visibleFinishedCrops.length}, audit cycles ${orphanFinishedCrops.length} (total ${crops.length})`);

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

// V9.8: ROI multi-currency display state
let _roiDisplayCurrency = 'USD';
let _roiLastCalc = null; // { investment, revenue, profit, roi }

function initRoiCurrencySelector() {
    const container = document.getElementById('roi-currency-selector');
    if (!container) return;
    container.replaceChildren();

    Object.entries(SUPPORTED_CURRENCIES).forEach(([code, cfg]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.currency = code;
        btn.style.cssText = `
            background: ${code === 'USD' ? 'rgba(200,167,82,0.15)' : 'rgba(255,255,255,0.04)'};
            border: 1px solid ${code === 'USD' ? '#C8A752' : 'rgba(200,167,82,0.2)'};
            border-radius: 8px;
            padding: 0.35rem 0.75rem;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            min-height: 36px;
            font-size: 0.8rem;
            color: #fff;
        `;
        const flagSpan = document.createElement('span');
        flagSpan.style.fontSize = '1rem';
        flagSpan.textContent = String(cfg.flag || '');
        const codeSpan = document.createElement('span');
        codeSpan.textContent = code === 'VES' ? 'Bs' : code;
        btn.append(flagSpan, document.createTextNode(' '), codeSpan);
        btn.addEventListener('click', () => {
            _roiDisplayCurrency = code;
            container.querySelectorAll('button').forEach(b => {
                const sel = b.dataset.currency === code;
                b.style.background = sel ? 'rgba(200,167,82,0.15)' : 'rgba(255,255,255,0.04)';
                b.style.borderColor = sel ? '#C8A752' : 'rgba(200,167,82,0.2)';
            });
            if (_roiLastCalc) _updateRoiDisplay();
        });
        container.appendChild(btn);
    });
}

function _formatRoiAmount(usdValue) {
    if (_roiDisplayCurrency === 'USD') return formatCurrency(usdValue);
    const rate = getRate(_roiDisplayCurrency, editExchangeRates) || 1;
    const local = usdValue * rate;
    const cfg = SUPPORTED_CURRENCIES[_roiDisplayCurrency] || {};
    const decimals = cfg.decimals ?? 2;
    const sym = _roiDisplayCurrency === 'VES' ? 'Bs' : _roiDisplayCurrency;
    const localStr = decimals === 0
        ? `${sym} ${Math.round(local).toLocaleString()}`
        : `${sym} ${local.toFixed(decimals)}`;
    return `${localStr} (\u2248 ${formatCurrency(usdValue)})`;
}

function _updateRoiDisplay() {
    if (!_roiLastCalc) return;
    const { investment, revenue, profit, roi } = _roiLastCalc;

    document.getElementById('resultInvestment').textContent = _formatRoiAmount(investment);
    document.getElementById('resultRevenue').textContent = _formatRoiAmount(revenue);

    const profitEl = document.getElementById('resultProfit');
    profitEl.textContent = _formatRoiAmount(profit);
    profitEl.className = `roi-value ${profit >= 0 ? 'profit' : 'loss'}`;

    const roiEl = document.getElementById('resultROI');
    roiEl.textContent = `${roi.toFixed(1)}%`;
    roiEl.className = `roi-value ${roi >= 0 ? 'profit' : 'loss'}`;
}

/**
 * Calcula ROI y guarda en Supabase
 */
export async function calculateROI() {
    const investment = parseFloat(document.getElementById('investment')?.value) || 0;
    const revenue = parseFloat(document.getElementById('revenue')?.value) || 0;
    const quantity = parseFloat(document.getElementById('quantity')?.value) || 0;

    const profit = revenue - investment;
    const roi = investment > 0 ? ((profit / investment) * 100) : 0;

    // V9.8: Store last calc for currency switching
    _roiLastCalc = { investment, revenue, profit, roi };

    // Fetch rates if not loaded yet
    try { const r = await initExchangeRates(); if (r) editExchangeRates = r; } catch { }

    // Actualizar DOM with currency-aware display
    _updateRoiDisplay();

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

let expenseCache = [];
let expenseDeletedAtSupported = null;
let expenseDeletedAtRefreshDone = false;
let agroStoragePatched = false;
let incomeCache = [];
let incomeDeletedAtSupported = null;
let incomeRevertedAtSupported = null;

function setExpenseCache(data) {
    const rows = Array.isArray(data) ? data : [];
    expenseCache = rows.filter((row) => !row?.deleted_at);
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

const AGRO_STORAGE_BUCKET_ID = 'agro-evidence';
const AGRO_INCOME_STORAGE_ROOT = 'agro/income';
const AGRO_EXPENSE_STORAGE_ROOT = 'agro/expense';
const AGRO_PENDING_STORAGE_ROOT = 'agro/pending';
const AGRO_LOSS_STORAGE_ROOT = 'agro/loss';
const AGRO_TRANSFER_STORAGE_ROOT = 'agro/transfer';

async function resolveIncomeSupportUrl(path) {
    return await resolveEvidenceUrl(path);
}

async function buildIncomeSignedUrlMap(incomes) {
    // ...
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
    concept.textContent = whoData.concept || income.concepto || 'Pagado';

    let whoLine = null;
    if (whoData.who) {
        whoLine = document.createElement('div');
        whoLine.style.cssText = 'color: rgba(255,255,255,0.65); font-size: 0.75rem; margin-top: 2px;';
        const whoMeta = WHO_FIELD_META.ingresos;
        const whoLabel = whoMeta?.label || 'Comprador';
        const whoIcon = whoMeta?.icon || '👤';

        const whoPrefix = document.createElement('span');
        whoPrefix.textContent = `• ${whoIcon} ${whoLabel}: `;

        const whoName = document.createElement('span');
        whoName.textContent = whoData.who;
        markBuyerNameNode(whoName, whoData.who);

        whoLine.append(whoPrefix, whoName);
    }

    const meta = document.createElement('div');
    meta.style.cssText = 'color: rgba(255,255,255,0.5); font-size: 0.8rem; display: flex; flex-wrap: wrap; gap: 0.5rem;';
    const category = document.createElement('span');
    category.textContent = String(income.categoria || 'otros').replace(/-/g, ' ').toUpperCase();
    const dateStr = document.createElement('span');
    dateStr.textContent = formatDate(income.fecha);
    const cropLabel = document.createElement('span');
    cropLabel.style.color = 'var(--gold-primary)';
    cropLabel.textContent = resolveRecordCropLabel(income);
    meta.append(category, dateStr, cropLabel);

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
    amount.textContent = _fmtItemCurrency(income, FACTURERO_CONFIG.ingresos, Number(income?.monto ?? 0));
    markMoneyNode(amount, amount.textContent);

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
    transferBtn.title = 'Transferir pagado';
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

        if (!window.confirm('\u00bfEliminar pagado?')) return;
        const targetId = deleteBtn.dataset.id;
        if (!targetId) {
            alert('No se pudo identificar el pagado.');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesion para eliminar pagados.');
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
                showEvidenceToast('Error al eliminar pagado.', 'warning');
                console.error('[Agro] Income hard delete failed:', hardError.message);
            }
        } else {
            showEvidenceToast('Error al eliminar pagado.', 'warning');
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

        const missingColumns = getTableMissingColumns('agro_income');
        let selectFields = AGRO_INCOME_LIST_COLUMNS
            .split(',')
            .map((field) => String(field || '').trim())
            .filter((field) => field && !missingColumns.has(field));

        if (incomeDeletedAtSupported === false) {
            selectFields = selectFields.filter((field) => field !== 'deleted_at');
        }
        if (incomeRevertedAtSupported === false) {
            selectFields = selectFields.filter((field) => field !== 'reverted_at');
        }

        let data = [];
        let error = null;

        for (let attempt = 0; attempt < 8; attempt += 1) {
            if (!selectFields.length) break;

            let query = supabase
                .from('agro_income')
                .select(selectFields.join(', '))
                .eq('user_id', user.id)
                .order('fecha', { ascending: false });
            if (selectedCropId) {
                query = query.eq('crop_id', selectedCropId);
            }

            if (incomeDeletedAtSupported !== false && selectFields.includes('deleted_at')) {
                query = query.is('deleted_at', null);
            }
            if (incomeRevertedAtSupported !== false && selectFields.includes('reverted_at')) {
                query = query.is('reverted_at', null);
            }

            const result = await query;
            data = result.data;
            error = result.error;
            if (!error) {
                if (incomeDeletedAtSupported !== false && selectFields.includes('deleted_at')) {
                    incomeDeletedAtSupported = true;
                }
                if (incomeRevertedAtSupported !== false && selectFields.includes('reverted_at')) {
                    incomeRevertedAtSupported = true;
                }
                break;
            }

            if (incomeDeletedAtSupported !== false && isMissingColumnError(error, 'deleted_at')) {
                rememberMissingColumn('agro_income', 'deleted_at');
                incomeDeletedAtSupported = false;
                selectFields = selectFields.filter((field) => field !== 'deleted_at');
                continue;
            }
            if (incomeRevertedAtSupported !== false && isMissingColumnError(error, 'reverted_at')) {
                rememberMissingColumn('agro_income', 'reverted_at');
                incomeRevertedAtSupported = false;
                selectFields = selectFields.filter((field) => field !== 'reverted_at');
                continue;
            }

            let removedAny = false;
            selectFields = selectFields.filter((field) => {
                if (isMissingColumnError(error, field)) {
                    rememberMissingColumn('agro_income', field);
                    removedAny = true;
                    return false;
                }
                return true;
            });
            if (removedAny) continue;

            throw error;
        }

        if (error && !Array.isArray(data)) throw error;

        incomeCache = Array.isArray(data)
            ? data.filter((row) => !row?.reverted_at)
            : [];
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
const FIN_TAB_STORAGE_KEY = 'YG_AGRO_FIN_TAB_V1';
const FIN_TAB_STORAGE_LEGACY_KEY = 'lastTab';
const FIN_TAB_NAMES = new Set(['gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias', 'otros', 'carrito', 'rankings']);
const OPS_CULTIVOS_ALLOWED_TABS = new Set(['gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias', 'otros', 'rankings']);
const OPS_CONTEXT_STORAGE_KEY = 'paso1Context';
const OPS_LAST_CULTIVOS_TAB_KEY = 'YG_AGRO_OPS_LAST_CULTIVOS_TAB_V1';
const OPS_CONTEXT_MODES = new Set(['cultivos']);
const OPS_CONTEXT_TAB_MAP = Object.freeze({});
const OPS_MOVEMENT_SUMMARY_ORDER = ['pendientes', 'ingresos', 'gastos', 'perdidas', 'transferencias', 'otros'];
const OPS_ACTIVE_CROPS_SUMMARY_ORDER = ['pendientes', 'ingresos', 'gastos', 'perdidas'];
const OPS_MOVEMENT_SUMMARY_LABELS = Object.freeze({
    pendientes: 'Fiados',
    ingresos: 'Pagados',
    gastos: 'Gastos',
    perdidas: 'Pérdidas',
    transferencias: 'Donaciones',
    otros: 'Otros'
});
const OPS_MOVEMENT_COUNT_TABS = ['gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias'];

let opsContextMode = 'cultivos';
let opsLastCultivosTab = 'gastos';
let opsIsApplyingContext = false;
let opsCultivosPanelEventsBound = false;
let opsMovementSummaryState = null;
let opsMovementSummaryInFlight = null;
let opsMovementSummaryQueued = false;
let opsMovementSummaryTimer = null;
const OPS_RANKINGS_RANGE_KEY = 'YG_AGRO_RANKINGS_RANGE_V1';
const OPS_RANKINGS_DEFAULT_RANGE = '90d';
const OPS_RANKINGS_LIMIT = 5;
const OPS_RANKINGS_VALID_RANGES = new Set(['30d', '90d', '6m', '12m', 'all']);
const OPS_RANKINGS_RANGE_LABELS = Object.freeze({
    '30d': '30 días',
    '90d': '90 días',
    '6m': '6 meses',
    '12m': '12 meses',
    all: 'Todo'
});
const OPS_RANKINGS_BUYER_NAME_FIELDS = Object.freeze([
    'comprador',
    'buyer',
    'buyer_name',
    'buyer_display',
    'buyerName',
    'buyerDisplay',
    'customer_name',
    'customer',
    'customerName',
    'cliente',
    'client',
    'client_name',
    'clientName',
    'who',
    'who_name',
    'who_display',
    'whoName',
    'whoDisplay',
    'display_name',
    'displayName',
    'name',
    'label'
]);
const OPS_RANKINGS_MISSING_NAME_TOKENS = new Set(['', 'sin nombre', 'sin comprador']);

let opsRankingsState = {
    range: OPS_RANKINGS_DEFAULT_RANGE,
    hideNames: readBuyerNamesHidden(),
    loading: false,
    error: '',
    updatedAt: null,
    topClients: [],
    pendingClients: [],
    topCrops: []
};
let opsRankingsInitBound = false;
let opsRankingsInFlight = null;
let opsRankingsQueued = false;
let opsRankingsDebugSampleLogged = false;

function formatShortCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '$0';
    if (Math.abs(number) >= 1000) {
        return `$${(number / 1000).toFixed(1)}k`;
    }
    return `$${number.toFixed(0)}`;
}

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

async function getSignedEvidenceUrl(path, options = {}) {
    if (!path) return null;
    const quiet = options?.quiet === true;

    try {
        const { data, error } = await supabase.storage
            .from(AGRO_STORAGE_BUCKET_ID)
            .createSignedUrl(path, 3600);

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

function showEvidenceToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }

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

function initIncomeHistory() {
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
        const primary = localStorage.getItem(FIN_TAB_STORAGE_KEY);
        if (FIN_TAB_NAMES.has(primary)) return primary;
        const legacy = localStorage.getItem(FIN_TAB_STORAGE_LEGACY_KEY);
        return FIN_TAB_NAMES.has(legacy) ? legacy : null;
    } catch (e) {
        return null;
    }
}

function writeStoredTab(tabName) {
    if (!FIN_TAB_NAMES.has(tabName)) return;
    try {
        localStorage.setItem(FIN_TAB_STORAGE_KEY, tabName);
        localStorage.setItem(FIN_TAB_STORAGE_LEGACY_KEY, tabName);
    } catch (e) {
        // Ignore storage errors
    }
}

function normalizeOpsContextMode(value) {
    const token = String(value || '').toLowerCase().trim();
    return OPS_CONTEXT_MODES.has(token) ? token : 'cultivos';
}

function normalizeOpsCultivosTab(value) {
    const token = String(value || '').toLowerCase().trim();
    return OPS_CULTIVOS_ALLOWED_TABS.has(token) ? token : null;
}

function readOpsContextMode() {
    try {
        return normalizeOpsContextMode(localStorage.getItem(OPS_CONTEXT_STORAGE_KEY));
    } catch (_e) {
        return 'cultivos';
    }
}

function writeOpsContextMode(mode) {
    try {
        localStorage.setItem(OPS_CONTEXT_STORAGE_KEY, normalizeOpsContextMode(mode));
    } catch (_e) {
        // Ignore storage errors
    }
}

function readOpsLastCultivosTab() {
    try {
        return normalizeOpsCultivosTab(localStorage.getItem(OPS_LAST_CULTIVOS_TAB_KEY));
    } catch (_e) {
        return null;
    }
}

function writeOpsLastCultivosTab(tabName) {
    const safeTab = normalizeOpsCultivosTab(tabName);
    if (!safeTab) return;
    try {
        localStorage.setItem(OPS_LAST_CULTIVOS_TAB_KEY, safeTab);
    } catch (_e) {
        // Ignore storage errors
    }
}

function getOpsForcedTab(mode = opsContextMode) {
    const key = normalizeOpsContextMode(mode);
    return OPS_CONTEXT_TAB_MAP[key] || null;
}

function getOpsContextElements() {
    return {
        tags: Array.from(document.querySelectorAll('.ops-context-tag[data-context-mode]')),
        panel: document.getElementById('ops-cultivos-panel'),
        activeRow: document.getElementById('ops-cultivos-active-row'),
        finishedWrap: document.getElementById('ops-cultivos-finished'),
        finishedRow: document.getElementById('ops-cultivos-finished-row'),
        finishedCount: document.getElementById('ops-cultivos-finished-count')
    };
}

function syncOpsContextTagsUI() {
    const { tags } = getOpsContextElements();
    tags.forEach((tag) => {
        const mode = normalizeOpsContextMode(tag.dataset.contextMode);
        const isActive = mode === opsContextMode;
        tag.classList.toggle('is-active', isActive);
        tag.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function createEmptyOpsMovementSummary() {
    const globalByTab = {};
    const contextByTab = {};
    OPS_MOVEMENT_SUMMARY_ORDER.forEach((tabName) => {
        globalByTab[tabName] = 0;
        contextByTab[tabName] = 0;
    });
    return { globalTotal: 0, contextTotal: 0, globalByTab, contextByTab };
}

function getOpsMovementSummaryState() {
    if (!opsMovementSummaryState) {
        opsMovementSummaryState = createEmptyOpsMovementSummary();
    }
    return opsMovementSummaryState;
}

function formatOpsMovementSummaryLine(summaryState = getOpsMovementSummaryState(), scope = 'global', order = OPS_MOVEMENT_SUMMARY_ORDER) {
    const sourceByTab = scope === 'context'
        ? (summaryState?.contextByTab || {})
        : (summaryState?.globalByTab || {});

    const parts = (Array.isArray(order) ? order : OPS_MOVEMENT_SUMMARY_ORDER)
        .map((tabName) => {
            const count = Number(sourceByTab[tabName] || 0);
            if (count <= 0) return '';
            const label = OPS_MOVEMENT_SUMMARY_LABELS[tabName] || tabName;
            return `${label}: ${count}`;
        })
        .filter(Boolean);
    return parts.length ? parts.join(' • ') : 'Sin movimientos registrados.';
}

function updateOpsMovementSummaryUI() {
    const summaryState = getOpsMovementSummaryState();
    const summaryLine = formatOpsMovementSummaryLine(summaryState, 'global', OPS_ACTIVE_CROPS_SUMMARY_ORDER);
    const activeTab = String(getCurrentFinanceTab() || '').toLowerCase().trim();
    const hasActiveSummary = OPS_MOVEMENT_SUMMARY_ORDER.includes(activeTab);
    const total = hasActiveSummary
        ? Number(summaryState?.contextByTab?.[activeTab] || 0)
        : Number(summaryState.contextTotal || 0);

    document.querySelectorAll('.general-movement-summary').forEach((node) => {
        node.textContent = summaryLine;
    });

    const totalDisplay = document.getElementById('ops-total-display');
    if (totalDisplay) {
        totalDisplay.textContent = `Todos los movimientos (Total: ${total})`;
    }
}

function shouldUseSelectedCropForCounts(tabName) {
    if (opsContextMode !== 'cultivos') return false;
    if (!selectedCropId) return false;
    if (tabName === 'otros') return false;
    return true;
}

async function fetchFactureroCount(tabName, userId, options = {}) {
    const config = FACTURERO_CONFIG[tabName];
    if (!config?.table || !userId) return 0;

    let includeDeletedAt = config.supportsDeletedAt !== false;
    let includeRevertedAt = ['pendientes', 'ingresos', 'perdidas'].includes(tabName);
    let includeTransferState = tabName === 'pendientes' && options.excludeTransferred === true;

    for (let attempt = 0; attempt < 5; attempt += 1) {
        let query = supabase
            .from(config.table)
            // Avoid HEAD requests here to reduce cross-origin HEAD noise in some environments.
            .select('id', { count: 'exact' })
            .limit(1)
            .eq('user_id', userId);

        if (includeDeletedAt) query = query.is('deleted_at', null);

        if (options.cropMode === 'null') {
            query = query.is('crop_id', null);
        } else if (options.cropMode === 'selected' && shouldUseSelectedCropForCounts(tabName)) {
            query = query.eq('crop_id', selectedCropId);
        }

        if (includeTransferState) query = query.neq('transfer_state', 'transferred');
        if (includeRevertedAt) query = query.is('reverted_at', null);

        const { count, error } = await query;
        if (!error) {
            return Number.isFinite(count) ? count : 0;
        }

        if (includeRevertedAt && isMissingColumnError(error, 'reverted_at')) {
            includeRevertedAt = false;
            continue;
        }
        if (includeTransferState && isMissingColumnError(error, 'transfer_state')) {
            includeTransferState = false;
            continue;
        }
        if (includeDeletedAt && isMissingColumnError(error, 'deleted_at')) {
            includeDeletedAt = false;
            continue;
        }

        console.warn(`[AGRO] Count query failed for ${tabName}:`, error?.message || error);
        return 0;
    }

    return 0;
}

async function loadOpsMovementSummary() {
    const empty = createEmptyOpsMovementSummary();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return empty;

        const globalByTab = { ...empty.globalByTab };
        const contextByTab = { ...empty.contextByTab };
        const needsContextCropCounts = shouldUseSelectedCropForCounts('gastos');

        await Promise.all(OPS_MOVEMENT_COUNT_TABS.map(async (tabName) => {
            const baseOptions = { excludeTransferred: tabName === 'pendientes' };
            const globalPromise = fetchFactureroCount(tabName, user.id, {
                ...baseOptions,
                cropMode: 'all'
            });
            const contextPromise = needsContextCropCounts
                ? fetchFactureroCount(tabName, user.id, {
                    ...baseOptions,
                    cropMode: 'selected'
                })
                : globalPromise;

            const [globalCount, contextCount] = await Promise.all([globalPromise, contextPromise]);
            globalByTab[tabName] = globalCount;
            contextByTab[tabName] = contextCount;
        }));

        const otherCounts = await Promise.all(FACTURERO_OTHER_SOURCE_TABS.map((sourceTab) => (
            fetchFactureroCount(sourceTab, user.id, {
                cropMode: 'null',
                excludeTransferred: sourceTab === 'pendientes'
            })
        )));
        const otherTotal = otherCounts.reduce((sum, value) => sum + (Number(value) || 0), 0);
        globalByTab.otros = otherTotal;
        contextByTab.otros = otherTotal;

        const globalTotal = OPS_MOVEMENT_SUMMARY_ORDER
            .reduce((sum, tabName) => sum + (Number(globalByTab[tabName]) || 0), 0);
        const contextTotal = OPS_MOVEMENT_SUMMARY_ORDER
            .reduce((sum, tabName) => sum + (Number(contextByTab[tabName]) || 0), 0);

        return { globalTotal, contextTotal, globalByTab, contextByTab };
    } catch (err) {
        console.warn('[AGRO] Movement summary load failed:', err?.message || err);
        return empty;
    }
}

async function refreshOpsMovementSummary() {
    if (opsMovementSummaryInFlight) {
        opsMovementSummaryQueued = true;
        return opsMovementSummaryInFlight;
    }

    opsMovementSummaryInFlight = (async () => {
        const summary = await loadOpsMovementSummary();
        opsMovementSummaryState = summary;
        updateOpsMovementSummaryUI();
        return summary;
    })();

    try {
        return await opsMovementSummaryInFlight;
    } finally {
        opsMovementSummaryInFlight = null;
        if (opsMovementSummaryQueued) {
            opsMovementSummaryQueued = false;
            refreshOpsMovementSummary().catch((err) => {
                console.warn('[AGRO] Movement summary refresh retry failed:', err?.message || err);
            });
        }
    }
}

function scheduleOpsMovementSummaryRefresh() {
    if (opsMovementSummaryTimer) {
        clearTimeout(opsMovementSummaryTimer);
    }
    opsMovementSummaryTimer = setTimeout(() => {
        opsMovementSummaryTimer = null;
        refreshOpsMovementSummary().catch((err) => {
            console.warn('[AGRO] Movement summary refresh failed:', err?.message || err);
        });
    }, 90);
}

function buildOpsCultivoChip({ label, meta = '', cropId = null, selected = false, disabled = false }) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'ops-cultivo-chip';
    if (selected) {
        chip.classList.add('is-active');
    }
    if (disabled) {
        chip.disabled = true;
    }
    chip.dataset.cropId = normalizeCropId(cropId) || AGRO_GENERAL_VIEW_ID;
    chip.setAttribute('aria-pressed', selected ? 'true' : 'false');

    const labelEl = document.createElement('span');
    labelEl.className = 'ops-cultivo-chip-name';
    labelEl.textContent = label;

    const metaEl = document.createElement('span');
    metaEl.className = 'ops-cultivo-chip-meta';
    metaEl.textContent = meta;

    chip.append(labelEl, metaEl);
    return chip;
}

function buildOpsCultivosEmptyMessage(text) {
    const empty = document.createElement('p');
    empty.className = 'ops-cultivos-empty';
    empty.textContent = text;
    return empty;
}

function selectOpsCultivo(cropId) {
    const normalized = normalizeCropId(cropId);
    const changed = setSelectedCropId(normalized);
    if (!changed) {
        refreshFactureroForSelectedCrop();
        renderOpsCultivosPanel();
    }
}

function resolveOpsChipStatus(crop) {
    const templateDuration = getTemplateDurationForCrop(crop);
    const progress = computeCropProgress(crop, templateDuration);
    const status = resolveCropStatus(crop, progress);
    return getCropStatusMeta(status).text || 'Ciclo';
}

function renderOpsCultivosPanel() {
    const { panel, activeRow, finishedWrap, finishedRow, finishedCount } = getOpsContextElements();
    if (!panel || !activeRow || !finishedWrap || !finishedRow) return;
    if (opsContextMode !== 'cultivos') return;

    const rows = Array.isArray(cropsCache) ? cropsCache : [];
    const { active: activeCrops, finished: finishedCrops } = splitCropsByCycle(rows);
    const selectedId = normalizeCropId(selectedCropId);

    activeRow.textContent = '';

    activeCrops.forEach((crop) => {
        const cropId = normalizeCropId(crop?.id);
        if (!cropId) return;
        const displayCrop = getCropDisplayParts(crop, { fallbackIcon: '🌱' });
        activeRow.appendChild(buildOpsCultivoChip({
            label: displayCrop.label,
            meta: resolveOpsChipStatus(crop),
            cropId,
            selected: cropId === selectedId
        }));
    });

    if (activeCrops.length === 0) {
        activeRow.appendChild(buildOpsCultivosEmptyMessage('No hay ciclos activos.'));
    }

    finishedRow.textContent = '';
    if (finishedCount) {
        finishedCount.textContent = String(finishedCrops.length);
    }

    if (finishedCrops.length === 0) {
        finishedRow.appendChild(buildOpsCultivosEmptyMessage('Sin cultivos finalizados.'));
    } else {
        finishedCrops.forEach((crop) => {
            const cropId = normalizeCropId(crop?.id);
            if (!cropId) return;
            const displayCrop = getCropDisplayParts(crop, { fallbackIcon: '🌾' });
            finishedRow.appendChild(buildOpsCultivoChip({
                label: displayCrop.label,
                meta: resolveOpsChipStatus(crop),
                cropId,
                selected: cropId === selectedId
            }));
        });
    }
}

function bindOpsCultivosPanelEvents() {
    if (opsCultivosPanelEventsBound) return;
    const { panel, activeRow, finishedRow } = getOpsContextElements();
    if (!panel || !activeRow || !finishedRow) return;

    opsCultivosPanelEventsBound = true;
    const handleClick = (event) => {
        const chip = event.target.closest('.ops-cultivo-chip');
        if (!chip || chip.disabled) return;
        const cropId = chip.dataset.cropId === AGRO_GENERAL_VIEW_ID ? null : chip.dataset.cropId;
        selectOpsCultivo(cropId);
    };

    activeRow.addEventListener('click', handleClick);
    finishedRow.addEventListener('click', handleClick);
}

function syncOpsCultivosPanelVisibility() {
    const { panel, finishedWrap } = getOpsContextElements();
    if (!panel) return;
    const showPanel = opsContextMode === 'cultivos';
    setElementHiddenInert(panel, !showPanel);
    if (!showPanel && finishedWrap) {
        finishedWrap.open = false;
    }
}

function getCurrentFinanceTab() {
    return document.querySelector('.financial-tab-btn.is-active')?.dataset?.tab || null;
}

function rememberOpsCultivosState() {
    if (opsContextMode !== 'cultivos') return;
    const activeTab = getCurrentFinanceTab();
    const safeTab = normalizeOpsCultivosTab(activeTab);
    if (safeTab) {
        opsLastCultivosTab = safeTab;
        writeOpsLastCultivosTab(safeTab);
    }
}

function handleOpsTabChanged(tabName) {
    tabName = String(tabName || '').toLowerCase().trim();
    if (!FIN_TAB_NAMES.has(tabName)) return;
    if (opsIsApplyingContext) return;
    if (opsContextMode === 'cultivos') {
        const safeTab = normalizeOpsCultivosTab(tabName);
        if (!safeTab) return;
        opsLastCultivosTab = safeTab;
        writeOpsLastCultivosTab(safeTab);
    }
    updateOpsMovementSummaryUI();
    scheduleOpsMovementSummaryRefresh();
}

function applyOpsContextMode(nextMode, options = {}) {
    const mode = normalizeOpsContextMode(nextMode);
    const focus = options.focus === true;
    const shouldRefresh = options.refresh !== false;
    const previousMode = opsContextMode;

    if (previousMode === 'cultivos') {
        rememberOpsCultivosState();
    }

    opsContextMode = mode;
    writeOpsContextMode(mode);
    syncOpsContextTagsUI();
    syncOpsCultivosPanelVisibility();
    if (mode === 'cultivos') {
        renderOpsCultivosPanel();
    }

    if (mode === 'cultivos') {
        const restoreTab = readOpsLastCultivosTab() || normalizeOpsCultivosTab(readStoredTab()) || 'gastos';
        opsIsApplyingContext = true;
        const restored = switchTab(restoreTab, { focus });
        if (!restored) {
            switchTab('gastos', { focus });
        }
        opsIsApplyingContext = false;
        updateOpsMovementSummaryUI();

        if (shouldRefresh) {
            refreshFactureroForSelectedCrop();
        }
        return;
    }

    const forcedTab = getOpsForcedTab(mode);
    if (forcedTab) {
        opsIsApplyingContext = true;
        const switched = switchTab(forcedTab, { focus });
        let tabToRefresh = forcedTab;
        if (!switched) {
            switchTab('otros', { focus });
            tabToRefresh = 'otros';
        }
        opsIsApplyingContext = false;
        if (shouldRefresh) {
            refreshFactureroHistory(tabToRefresh);
        }
    }
}

function initOperationsContextSteps() {
    const { tags } = getOpsContextElements();

    tags.forEach((tag) => {
        if (tag.dataset.bound === '1') return;
        tag.dataset.bound = '1';
        tag.addEventListener('click', () => {
            const mode = normalizeOpsContextMode(tag.dataset.contextMode);
            applyOpsContextMode(mode, { refresh: true });
        });
    });

    bindOpsCultivosPanelEvents();
    if (typeof window !== 'undefined' && !window.__agroOpsCultivosPanelBound) {
        window.__agroOpsCultivosPanelBound = true;
        window.addEventListener('agro:crop:changed', renderOpsCultivosPanel);
        window.addEventListener(AGRO_CROPS_READY_EVENT, renderOpsCultivosPanel);
    }

    opsContextMode = readOpsContextMode();
    opsLastCultivosTab = readOpsLastCultivosTab() || normalizeOpsCultivosTab(readStoredTab()) || 'gastos';
    syncOpsContextTagsUI();
    syncOpsCultivosPanelVisibility();
    renderOpsCultivosPanel();
    applyOpsContextMode(opsContextMode, { refresh: false, focus: false });
    updateOpsMovementSummaryUI();
    scheduleOpsMovementSummaryRefresh();
}

function normalizeOpsRankingsRange(value) {
    const token = String(value || '').toLowerCase().trim();
    return OPS_RANKINGS_VALID_RANGES.has(token) ? token : OPS_RANKINGS_DEFAULT_RANGE;
}

function readOpsRankingsRange() {
    try {
        return normalizeOpsRankingsRange(localStorage.getItem(OPS_RANKINGS_RANGE_KEY));
    } catch (_e) {
        return OPS_RANKINGS_DEFAULT_RANGE;
    }
}

function writeOpsRankingsRange(value) {
    const safeValue = normalizeOpsRankingsRange(value);
    try {
        localStorage.setItem(OPS_RANKINGS_RANGE_KEY, safeValue);
    } catch (_e) {
        // Ignore storage errors
    }
}

function readOpsRankingsPrivacy() {
    return readBuyerNamesHidden();
}

function writeOpsRankingsPrivacy(hideNames) {
    setBuyerNamesHidden(!!hideNames, { rootEl: document });
}

function getOpsRankingsElements() {
    return {
        panel: document.getElementById('ops-rankings-panel'),
        rangeGroup: document.getElementById('ops-rankings-range'),
        hideNamesInput: document.getElementById('ops-rankings-hide-names'),
        privacyHint: document.getElementById('ops-rankings-privacy-hint'),
        status: document.getElementById('ops-rankings-status'),
        exportBtn: document.getElementById('ops-rankings-export-btn'),
        topClients: document.getElementById('ops-rankings-top-clients'),
        pendingClients: document.getElementById('ops-rankings-pending-clients'),
        topCrops: document.getElementById('ops-rankings-top-crops'),
        topCropsTitle: document.getElementById('ops-rankings-top-crops-title')
    };
}

function formatOpsRankingDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatOpsRankingTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('es-VE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatOpsRankingCurrency(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return '$0';

    const absolute = Math.abs(amount);
    const hasDecimals = Math.abs(absolute - Math.round(absolute)) > 0.000001;
    const formatter = new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: hasDecimals ? 2 : 0,
        maximumFractionDigits: hasDecimals ? 2 : 0
    });

    return `${amount < 0 ? '-' : ''}$${formatter.format(absolute)}`;
}

function formatOpsRankingCount(value, singular, plural) {
    const amount = Number(value);
    const count = Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0;
    return `${count} ${count === 1 ? singular : plural}`;
}

function sanitizeOpsRankingName(value) {
    const clean = String(value || '').trim();
    return clean || 'Sin nombre';
}

function maskOpsRankingName(_value) {
    return BUYER_PRIVACY_MASK;
}

function getOpsRankingDisplayName(value) {
    if (opsRankingsState.hideNames) {
        return maskOpsRankingName(value);
    }
    return sanitizeOpsRankingName(value);
}

function resolveOpsRankingsDateRange(range) {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const toIso = (dateObj) => {
        const d = new Date(dateObj);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    let from = null;
    const safeRange = normalizeOpsRankingsRange(range);
    if (safeRange === '30d') {
        from = new Date(now);
        from.setDate(from.getDate() - 29);
    } else if (safeRange === '90d') {
        from = new Date(now);
        from.setDate(from.getDate() - 89);
    } else if (safeRange === '6m') {
        from = new Date(now);
        from.setMonth(from.getMonth() - 6);
        from.setDate(from.getDate() + 1);
    } else if (safeRange === '12m') {
        from = new Date(now);
        from.setFullYear(from.getFullYear() - 1);
        from.setDate(from.getDate() + 1);
    }

    return {
        from: from ? toIso(from) : null,
        to: toIso(now),
        label: OPS_RANKINGS_RANGE_LABELS[safeRange] || OPS_RANKINGS_RANGE_LABELS[OPS_RANKINGS_DEFAULT_RANGE]
    };
}

function normalizeOpsRankingsRows(rows) {
    return Array.isArray(rows) ? rows : [];
}

function normalizeOpsRankingNameToken(value) {
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value).trim();
    }
    return '';
}

function isOpsRankingMissingBuyerName(value) {
    const token = normalizeOpsRankingNameToken(value).toLowerCase();
    return OPS_RANKINGS_MISSING_NAME_TOKENS.has(token);
}

function pickOpsBuyerNameFromValue(rawValue) {
    const direct = normalizeOpsRankingNameToken(rawValue);
    if (direct) return direct;
    if (!rawValue || typeof rawValue !== 'object') return '';

    const nestedKeys = [
        'name',
        'label',
        'display_name',
        'displayName',
        'who',
        'who_name',
        'whoName',
        'buyer_name',
        'buyerName',
        'customer_name',
        'customerName',
        'title',
        'value'
    ];
    for (const key of nestedKeys) {
        const nested = normalizeOpsRankingNameToken(rawValue?.[key]);
        if (nested) return nested;
    }
    return '';
}

function pickOpsBuyerName(row) {
    if (!row || typeof row !== 'object') return '';
    for (const field of OPS_RANKINGS_BUYER_NAME_FIELDS) {
        const candidate = pickOpsBuyerNameFromValue(row?.[field]);
        if (!candidate) continue;
        if (isOpsRankingMissingBuyerName(candidate)) continue;
        return candidate;
    }
    return '';
}

function resolveOpsRankingCropLabel(row) {
    const rawName = String(row?.crop_name || '').trim();
    const cropId = normalizeCropId(row?.crop_id);

    if (cropId && Array.isArray(cropsCache)) {
        const match = cropsCache.find((crop) => normalizeCropId(crop?.id) === cropId);
        if (match) {
            return getCropDisplayParts(match, { fallbackIcon: '🌱', fallbackName: 'Cultivo' }).label;
        }
    }

    if (rawName) {
        return getCropDisplayParts({ name: rawName, icon: '🌱' }, { fallbackIcon: '🌱', fallbackName: 'Cultivo' }).label;
    }

    return '🌱 Cultivo';
}

function getOpsSelectedCropLabel(selectedId) {
    const cropId = normalizeCropId(selectedId);
    if (!cropId) return '📋 Vista General';

    const rows = Array.isArray(cropsCache) ? cropsCache : [];
    const crop = rows.find((item) => normalizeCropId(item?.id) === cropId);
    if (!crop) return '🌱 Cultivo seleccionado';

    const display = getCropDisplayParts(crop, { fallbackIcon: '🌱', fallbackName: 'Cultivo' });
    const variety = String(crop?.variety || '').trim();
    const nameNormalized = String(display?.name || '').trim().toLowerCase();
    const varietyNormalized = variety.toLowerCase();
    const includeVariety = variety && nameNormalized !== varietyNormalized && !nameNormalized.includes(varietyNormalized);
    const suffix = includeVariety ? ` (${variety})` : '';

    return `${display.icon} ${display.name}${suffix}`.trim();
}

function renderOpsRankingList(listEl, rows, buildItem, options = {}) {
    if (!listEl) return;
    listEl.textContent = '';

    const safeRows = normalizeOpsRankingsRows(rows);
    if (safeRows.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'ops-ranking-empty';
        const emptyText = typeof options.emptyText === 'string' && options.emptyText.trim()
            ? options.emptyText
            : 'Sin datos en el rango seleccionado.';
        empty.textContent = emptyText;
        listEl.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    safeRows.forEach((row, index) => {
        const itemEl = buildItem(row, index);
        if (itemEl) fragment.appendChild(itemEl);
    });
    listEl.appendChild(fragment);
}

function createOpsRankingItem({ index, name, value, meta, valueColor = '', buyerName = '', maskMetaMoney = false }) {
    const li = document.createElement('li');
    li.className = 'ops-ranking-item';

    const row = document.createElement('div');
    row.className = 'ops-ranking-row';

    const positionEl = document.createElement('span');
    positionEl.className = 'ops-ranking-position';
    positionEl.textContent = `#${index + 1}`;

    const nameEl = document.createElement('span');
    nameEl.className = 'ops-ranking-name';
    nameEl.textContent = name;
    markBuyerNameNode(nameEl, buyerName);

    const valueEl = document.createElement('span');
    valueEl.className = 'ops-ranking-value';
    valueEl.textContent = value;
    markMoneyNode(valueEl, value);
    if (valueColor) valueEl.style.color = valueColor;

    const metaEl = document.createElement('div');
    metaEl.className = 'ops-ranking-meta';
    metaEl.textContent = meta;
    if (maskMetaMoney) {
        markMoneyNode(metaEl, meta);
    }

    row.append(positionEl, nameEl, valueEl);
    li.append(row, metaEl);
    return li;
}

function syncOpsRankingsControlsUI() {
    const { rangeGroup, hideNamesInput } = getOpsRankingsElements();
    if (rangeGroup) {
        rangeGroup.querySelectorAll('.ops-rankings-range-btn').forEach((btn) => {
            const active = normalizeOpsRankingsRange(btn.dataset.range) === opsRankingsState.range;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }
    if (hideNamesInput) {
        hideNamesInput.checked = !!opsRankingsState.hideNames;
    }
}

function renderOpsRankings() {
    const { panel, privacyHint, status, topClients, pendingClients, topCrops, topCropsTitle } = getOpsRankingsElements();
    if (!panel || !status || !topClients || !pendingClients || !topCrops) return;

    syncOpsRankingsControlsUI();

    if (privacyHint) {
        privacyHint.textContent = opsRankingsState.hideNames
            ? 'Privacidad activa: se ocultan nombres de compradores (••••).'
            : 'Privacidad desactivada: se muestran nombres completos.';
    }

    const rangeLabel = OPS_RANKINGS_RANGE_LABELS[opsRankingsState.range] || OPS_RANKINGS_RANGE_LABELS[OPS_RANKINGS_DEFAULT_RANGE];
    const cropLabel = getOpsSelectedCropLabel(selectedCropId);
    const cropFilter = ` · Cultivo: ${cropLabel}`;
    const hasSelectedCrop = !!selectedCropId;

    if (topCropsTitle) {
        topCropsTitle.textContent = hasSelectedCrop
            ? 'Pagados del cultivo'
            : 'Top Cultivos (Pagados)';
    }

    if (opsRankingsState.loading) {
        status.textContent = `Cargando rankings (${rangeLabel})${cropFilter}...`;
    } else if (opsRankingsState.error) {
        status.textContent = `Error: ${opsRankingsState.error}`;
    } else {
        const updated = opsRankingsState.updatedAt ? formatOpsRankingTime(opsRankingsState.updatedAt) : '-';
        status.textContent = `Actualizado: ${updated} · Rango: ${rangeLabel}${cropFilter}`;
    }

    const allTopClients = normalizeOpsRankingsRows(opsRankingsState.topClients);
    const missingTopClients = allTopClients.filter((row) => !pickOpsBuyerName(row));
    const namedTopClients = allTopClients.filter((row) => !!pickOpsBuyerName(row));
    const missingTopClientsSummary = missingTopClients.reduce((acc, row) => {
        acc.operations += Number(row?.operations || 0);
        acc.total += Number(row?.total || 0);
        return acc;
    }, { operations: 0, total: 0 });

    renderOpsRankingList(topClients, namedTopClients, (row, index) => {
        const buyerName = pickOpsBuyerName(row);
        const operationsLabel = formatOpsRankingCount(row?.operations, 'operación', 'operaciones');
        return createOpsRankingItem({
            index,
            name: getOpsRankingDisplayName(buyerName),
            buyerName,
            value: formatOpsRankingCurrency(row?.total),
            meta: `${operationsLabel} · Última: ${formatOpsRankingDate(row?.last_date)}`
        });
    });

    // Append unnamed note below the list (only if there are unnamed records)
    const topClientsCard = topClients?.closest('.ops-ranking-card');
    if (topClientsCard) {
        // Remove any previously injected note to keep idempotent on re-renders
        topClientsCard.querySelector('.ops-rankings-note')?.remove();
        if (missingTopClients.length > 0) {
            const unnamedOps = missingTopClientsSummary.operations;
            const unnamedTotal = missingTopClientsSummary.total;
            const noteEl = document.createElement('div');
            noteEl.className = 'ops-rankings-note';
            const notePrefix = document.createElement('span');
            notePrefix.textContent = `⚠️ ${formatOpsRankingCount(unnamedOps, 'registro', 'registros')} sin comprador: `;
            const noteAmount = document.createElement('span');
            noteAmount.textContent = formatOpsRankingCurrency(unnamedTotal);
            markMoneyNode(noteAmount, noteAmount.textContent);
            noteEl.append(notePrefix, noteAmount);
            topClientsCard.appendChild(noteEl);
        }
    }

    renderOpsRankingList(pendingClients, opsRankingsState.pendingClients, (row, index) => {
        const pendingLabel = formatOpsRankingCount(row?.pending_count, 'fiado', 'fiados');
        const buyerName = String(row?.client_name || '').trim();
        return createOpsRankingItem({
            index,
            name: getOpsRankingDisplayName(buyerName),
            buyerName,
            value: formatOpsRankingCurrency(row?.total_pending),
            meta: `${pendingLabel} · Próximo: ${formatOpsRankingDate(row?.next_due_date)}`
        });
    });

    renderOpsRankingList(topCrops, opsRankingsState.topCrops, (row, index) => {
        const profit = Number(row?.profit || 0);
        const profitColor = profit >= 0 ? '#4ade80' : '#f87171';
        return createOpsRankingItem({
            index,
            name: resolveOpsRankingCropLabel(row),
            value: formatOpsRankingCurrency(profit),
            meta: `Pagados: ${formatOpsRankingCurrency(row?.ingresos)} · Gastos vinculados: ${formatOpsRankingCurrency(row?.gastos)}`,
            valueColor: profitColor,
            maskMetaMoney: true
        });
    }, {
        emptyText: hasSelectedCrop
            ? 'Sin pagados registrados para este cultivo en el rango seleccionado.'
            : 'Sin pagados registrados en el rango seleccionado.'
    });

    applyBuyerPrivacy(panel, opsRankingsState.hideNames);
    applyMoneyPrivacy(panel);
}

function isMissingRankingsRpc(error) {
    const code = String(error?.code || '').toUpperCase();
    const text = `${String(error?.message || '')} ${String(error?.details || '')}`.toLowerCase();
    return (
        code === 'PGRST202' ||
        code === '42883' ||
        text.includes('function') && text.includes('not found') ||
        text.includes('could not find the function')
    );
}

function pickRankingsErrorMessage(errors) {
    if (!Array.isArray(errors) || errors.length === 0) return '';
    const missingRpc = errors.some(isMissingRankingsRpc);
    if (missingRpc) {
        return 'RPC de rankings no disponible. Ejecuta supabase/sql/agro_rankings_rpc_v1.sql.';
    }
    return errors.map((err) => err?.message || 'Error de consulta').join(' | ');
}

async function fetchOpsRankingsData() {
    const rangeDates = resolveOpsRankingsDateRange(opsRankingsState.range);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) {
        return {
            topClients: [],
            pendingClients: [],
            topCrops: [],
            error: 'Sesión no disponible.'
        };
    }

    const params = {
        p_from: rangeDates.from,
        p_to: rangeDates.to,
        p_limit: OPS_RANKINGS_LIMIT,
        p_crop_id: selectedCropId || null
    };

    const [topClientsRes, pendingRes, cropsRes] = await Promise.all([
        supabase.rpc('agro_rank_top_clients', params),
        supabase.rpc('agro_rank_pending_clients', params),
        supabase.rpc('agro_rank_top_crops_profit', params)
    ]);

    const topClientsRows = normalizeOpsRankingsRows(topClientsRes.data);
    if (!opsRankingsDebugSampleLogged && topClientsRows.length > 0) {
        let debugMode = false;
        if (typeof window !== 'undefined') {
            try {
                debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
            } catch (_e) {
                debugMode = false;
            }
        }
        if (debugMode) {
            opsRankingsDebugSampleLogged = true;
            const sample = topClientsRows[0] || {};
            console.info('[AGRO][Rankings] Top clientes sample:', {
                keys: Object.keys(sample),
                sample
            });
        }
    }

    const errors = [topClientsRes.error, pendingRes.error, cropsRes.error].filter(Boolean);
    return {
        topClients: topClientsRows,
        pendingClients: normalizeOpsRankingsRows(pendingRes.data),
        topCrops: normalizeOpsRankingsRows(cropsRes.data),
        error: pickRankingsErrorMessage(errors)
    };
}

async function refreshOpsRankings() {
    if (opsRankingsInFlight) {
        opsRankingsQueued = true;
        return opsRankingsInFlight;
    }

    opsRankingsState.loading = true;
    opsRankingsState.error = '';
    renderOpsRankings();

    opsRankingsInFlight = (async () => {
        try {
            const result = await fetchOpsRankingsData();
            opsRankingsState.topClients = result.topClients;
            opsRankingsState.pendingClients = result.pendingClients;
            opsRankingsState.topCrops = result.topCrops;
            opsRankingsState.error = result.error || '';
            opsRankingsState.updatedAt = new Date().toISOString();
        } catch (err) {
            opsRankingsState.topClients = [];
            opsRankingsState.pendingClients = [];
            opsRankingsState.topCrops = [];
            opsRankingsState.error = err?.message || 'No se pudo cargar Rankings.';
        } finally {
            opsRankingsState.loading = false;
            renderOpsRankings();
        }
    })();

    try {
        return await opsRankingsInFlight;
    } finally {
        opsRankingsInFlight = null;
        if (opsRankingsQueued) {
            opsRankingsQueued = false;
            refreshOpsRankings().catch((err) => {
                console.warn('[AGRO] Rankings refresh retry failed:', err?.message || err);
            });
        }
    }
}

function exportOpsRankingsMarkdown() {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10);
    const rangeLabel = OPS_RANKINGS_RANGE_LABELS[opsRankingsState.range] || OPS_RANKINGS_RANGE_LABELS[OPS_RANKINGS_DEFAULT_RANGE];
    const cropLabel = `Cultivo: ${getOpsSelectedCropLabel(selectedCropId)}`;
    const privacyLabel = opsRankingsState.hideNames ? 'Ocultar nombres: ON' : 'Ocultar nombres: OFF';

    let md = `# 🏆 Rankings Agro\n\n`;
    md += `- Fecha: ${now.toLocaleString('es-VE')}\n`;
    md += `- Rango: ${rangeLabel}\n`;
    md += `- ${cropLabel}\n`;
    md += `- ${privacyLabel}\n\n`;

    const appendSection = (title, rows, mapper) => {
        md += `## ${title}\n\n`;
        if (!Array.isArray(rows) || rows.length === 0) {
            md += `Sin datos.\n\n`;
            return;
        }
        rows.forEach((row, index) => {
            md += `${index + 1}. ${mapper(row)}\n`;
        });
        md += `\n`;
    };

    const allTopClientsMd = normalizeOpsRankingsRows(opsRankingsState.topClients);
    const missingTopClientsMd = allTopClientsMd.filter((row) => !pickOpsBuyerName(row));
    const namedTopClientsMd = allTopClientsMd.filter((row) => !!pickOpsBuyerName(row));
    const missingTopClientsMdSummary = missingTopClientsMd.reduce((acc, row) => {
        acc.operations += Number(row?.operations || 0);
        acc.total += Number(row?.total || 0);
        return acc;
    }, { operations: 0, total: 0 });

    appendSection('Top Clientes (Compras)', namedTopClientsMd, (row) => {
        const name = getOpsRankingDisplayName(pickOpsBuyerName(row));
        const operationsLabel = formatOpsRankingCount(row?.operations, 'operación', 'operaciones');
        return `${name} · ${formatOpsRankingCurrency(row?.total)} · ${operationsLabel} · última ${formatOpsRankingDate(row?.last_date)}`;
    });
    if (missingTopClientsMd.length > 0) {
        md += `> ⚠️ ${formatOpsRankingCount(missingTopClientsMdSummary.operations, 'registro', 'registros')} sin comprador: ${formatOpsRankingCurrency(missingTopClientsMdSummary.total)}\n\n`;
    }

    appendSection('Fiados por Cliente', opsRankingsState.pendingClients, (row) => {
        const name = getOpsRankingDisplayName(row?.client_name);
        const pendingLabel = formatOpsRankingCount(row?.pending_count, 'fiado', 'fiados');
        return `${name} · ${formatOpsRankingCurrency(row?.total_pending)} · ${pendingLabel} · próximo ${formatOpsRankingDate(row?.next_due_date)}`;
    });

    const topCropsTitle = selectedCropId ? 'Pagados del cultivo' : 'Top Cultivos (Pagados)';
    md += `## ${topCropsTitle}\n\n`;
    md += `> Nota: No incluye inversión base ni fiados. Ver card del cultivo para rentabilidad completa.\n\n`;
    if (!Array.isArray(opsRankingsState.topCrops) || opsRankingsState.topCrops.length === 0) {
        md += selectedCropId
            ? 'Sin pagados registrados para este cultivo en el rango seleccionado.\n\n'
            : 'Sin pagados registrados en el rango seleccionado.\n\n';
    } else {
        opsRankingsState.topCrops.forEach((row, index) => {
            const label = resolveOpsRankingCropLabel(row);
            md += `${index + 1}. ${label} · Neto cobrado (Pagados - Gastos) ${formatOpsRankingCurrency(row?.profit)} · Pagados: ${formatOpsRankingCurrency(row?.ingresos)} · Gastos vinculados: ${formatOpsRankingCurrency(row?.gastos)}\n`;
        });
        md += `\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AgroRankings_${dateStamp}.md`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

function initOpsRankingsPanel() {
    const { panel, rangeGroup, hideNamesInput, exportBtn } = getOpsRankingsElements();
    if (!panel) return;

    if (!opsRankingsInitBound) {
        opsRankingsInitBound = true;
        if (rangeGroup) {
            rangeGroup.addEventListener('click', (event) => {
                const button = event.target.closest('.ops-rankings-range-btn');
                if (!button) return;
                const nextRange = normalizeOpsRankingsRange(button.dataset.range);
                if (nextRange === opsRankingsState.range) return;
                opsRankingsState.range = nextRange;
                writeOpsRankingsRange(nextRange);
                renderOpsRankings();
                refreshOpsRankings().catch((err) => {
                    console.warn('[AGRO] Rankings range refresh failed:', err?.message || err);
                });
            });
        }

        if (hideNamesInput) {
            hideNamesInput.addEventListener('change', () => {
                opsRankingsState.hideNames = !!hideNamesInput.checked;
                writeOpsRankingsPrivacy(opsRankingsState.hideNames);
                renderOpsRankings();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', exportOpsRankingsMarkdown);
        }

        document.addEventListener(BUYER_PRIVACY_CHANGE_EVENT, (event) => {
            const hidden = !!event?.detail?.hidden;
            opsRankingsState.hideNames = hidden;
            renderOpsRankings();
        });

        document.addEventListener('data-refresh', refreshOpsRankingsIfVisible);
        document.addEventListener('agro:income:changed', refreshOpsRankingsIfVisible);
        document.addEventListener('agro:crop:changed', refreshOpsRankingsIfVisible);
    }

    opsRankingsState.range = readOpsRankingsRange();
    opsRankingsState.hideNames = readOpsRankingsPrivacy();
    renderOpsRankings();
}

function refreshOpsRankingsIfVisible() {
    const activeTab = getCurrentFinanceTab();
    if (activeTab !== 'rankings') return;
    refreshOpsRankings().catch((err) => {
        console.warn('[AGRO] Rankings refresh failed:', err?.message || err);
    });
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
    if (!tabName || tabButtons.length === 0 || panels.length === 0) return false;

    if (!FIN_TAB_NAMES.has(tabName)) return false;
    const hasPanel = panels.some((panel) => panel.dataset.tab === tabName);
    if (!hasPanel) return false;

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
    handleOpsTabChanged(tabName);
    resetHistorySearch();

    // Lazy-load Carrito module when tab is first activated
    if (tabName === 'carrito') {
        initCartTabLazy();
    }

    if (tabName === 'rankings') {
        initOpsRankingsPanel();
        refreshOpsRankings().catch((err) => {
            console.warn('[AGRO] Rankings refresh failed:', err?.message || err);
        });
    }

    return true;
}

// V9.8: Agro Agenda lazy-loader
let _agendaModuleLoaded = false;
window.openAgroAgenda = async function () {
    try {
        const { initAgroAgenda, updateAgendaCrops } = await import('./agro-agenda.js');
        syncAgendaCropsFn = typeof updateAgendaCrops === 'function' ? updateAgendaCrops : null;
        syncLazyCropConsumers(cropsCache);
        await initAgroAgenda({ supabase, cropsCache });
        _agendaModuleLoaded = true;
    } catch (err) {
        console.error('[AGRO] Failed to load agenda module:', err);
        alert('Error al cargar la agenda: ' + err.message);
    }
};

let _cartModuleLoaded = false;
async function initCartTabLazy() {
    if (_cartModuleLoaded) return;
    _cartModuleLoaded = true;
    try {
        const { initAgroCart, injectCartStyles, updateCartCrops } = await import('./agro-cart.js');
        syncCartCropsFn = typeof updateCartCrops === 'function' ? updateCartCrops : null;
        syncLazyCropConsumers(cropsCache);
        injectCartStyles();
        await initAgroCart({
            supabase,
            cropsCache,
            refreshFactureroHistory
        });
    } catch (err) {
        console.error('[AGRO] Failed to load cart module:', err);
        const root = document.getElementById('agro-cart-root');
        if (root) {
            root.replaceChildren();
            const errBox = document.createElement('div');
            errBox.style.cssText = 'color:#ef4444; padding:1rem; text-align:center;';
            errBox.textContent = 'Error al cargar el carrito.';
            root.appendChild(errBox);
        }
    }
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
        .facturero-search-input::placeholder { color: #888; }
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

if (typeof window !== 'undefined') {
    window.switchTab = switchTab;
}

let topIncomeCategoryCache = null;

function sumAmounts(rows, field, options = {}) {
    if (!Array.isArray(rows)) return 0;
    const skipReverted = options?.skipReverted === true;
    return rows.reduce((total, row) => {
        if (row?.deleted_at) return total;
        if (skipReverted && row?.reverted_at) return total;
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

function randomBase36(length = 6) {
    const size = Math.max(1, Number(length) || 6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(size);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
    }
    return (Date.now().toString(36) + '000000000000').slice(-size);
}

function createThreadId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `t_${Date.now()}_${randomBase36(6)}`;
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
        deleteBtn.textContent = '🗑️';
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
        if (row?.deleted_at || row?.reverted_at) return;
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

        let selectFields = ['categoria', 'monto', 'fecha', 'deleted_at', 'reverted_at'];
        if (incomeDeletedAtSupported === false) {
            selectFields = selectFields.filter((field) => field !== 'deleted_at');
        }
        if (incomeRevertedAtSupported === false) {
            selectFields = selectFields.filter((field) => field !== 'reverted_at');
        }

        let data = null;
        let error = null;
        for (let attempt = 0; attempt < 6; attempt += 1) {
            let query = supabase
                .from('agro_income')
                .select(selectFields.join(', '))
                .eq('user_id', user.id)
                .gte('fecha', cutoffDate);

            if (incomeDeletedAtSupported !== false && selectFields.includes('deleted_at')) {
                query = query.is('deleted_at', null);
            }
            if (incomeRevertedAtSupported !== false && selectFields.includes('reverted_at')) {
                query = query.is('reverted_at', null);
            }

            const result = await query;
            data = result.data;
            error = result.error;
            if (!error) {
                if (incomeDeletedAtSupported !== false && selectFields.includes('deleted_at')) {
                    incomeDeletedAtSupported = true;
                }
                if (incomeRevertedAtSupported !== false && selectFields.includes('reverted_at')) {
                    incomeRevertedAtSupported = true;
                }
                break;
            }

            let retried = false;
            if (incomeDeletedAtSupported !== false && isMissingColumnError(error, 'deleted_at')) {
                rememberMissingColumn('agro_income', 'deleted_at');
                incomeDeletedAtSupported = false;
                selectFields = selectFields.filter((field) => field !== 'deleted_at');
                retried = true;
            }
            if (incomeRevertedAtSupported !== false && isMissingColumnError(error, 'reverted_at')) {
                rememberMissingColumn('agro_income', 'reverted_at');
                incomeRevertedAtSupported = false;
                selectFields = selectFields.filter((field) => field !== 'reverted_at');
                retried = true;
            }
            if (!retried) break;
        }

        if (error) throw error;

        incomeCache = Array.isArray(data)
            ? data.filter((row) => !row?.reverted_at)
            : incomeCache;
        return getTopIncomeCategoryFromCache(days);
    } catch (err) {
        console.warn('[Agro] Top income category error:', err);
        return null;
    }
}

async function updateBalanceAndTopCategory() {
    const expenseTotal = sumAmounts(expenseCache, 'amount');
    const incomeTotal = sumAmounts(incomeCache, 'monto', { skipReverted: true });

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
    bindCropRefreshEvents();
    loadCrops();
    setupCropActionListeners();

    // Vincular botón de cálculo ROI
    const calcBtn = document.querySelector('.btn-primary[onclick*="calculateROI"]');
    if (calcBtn) {
        calcBtn.removeAttribute('onclick');
        calcBtn.addEventListener('click', calculateROI);
    }
    injectRoiClearButton(calcBtn);
    initRoiCurrencySelector(); // V9.8: ROI multi-currency display
    setupHeaderIdentity();
    initIncomeHistory();
    initFinanceTabs();
    initClimaWeeklyEmbed();
    initBuyerPrivacy(document);
    initAgroCompradores({ supabase });
    initAgroSocial({ supabase });
    initAgroCalculadora();
    initBuyerProfileClickHandlers();
    bindAgroSocialOpenButton();
    initAgroPerfil({ supabase });
    initOperationsContextSteps();
    initAgroAssistantModal();
    populateCropDropdowns(); // V9.5: Poblar dropdowns de cultivo
    setupFactureroCrudListeners(); // V9.5.1: Event delegation para CRUD
    console.info('[AGRO] V9.6: facturero who-field enabled');
    initFactureroHistories(); // V9.5.1: Cargar historiales al init
    initAgroFocusMode(); // V9.8: Modo Enfoque (UI only)
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
    injectWizardInvokers(); // V9.6.3: Wizard buttons
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
    const cropForm = document.getElementById('form-new-crop');
    cropForm?.reset();
    if (cropForm?.dataset) cropForm.dataset.initialStatus = '';
    const editInput = document.getElementById('crop-edit-id');
    if (editInput) editInput.value = '';
    const statusSelect = document.getElementById('crop-status');
    if (statusSelect) statusSelect.value = 'sembrado';
    const investmentInput = document.getElementById('crop-investment');
    if (investmentInput) investmentInput.value = '';
    const investmentCurrency = document.getElementById('crop-investment-currency');
    if (investmentCurrency) {
        investmentCurrency.value = 'USD';
        investmentCurrency.dispatchEvent(new Event('change'));
    }
    const investmentFxMeta = document.getElementById('crop-investment-fx-meta');
    if (investmentFxMeta) {
        investmentFxMeta.textContent = 'Cotización al guardar: se tomará la tasa vigente del Facturero.';
    }

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
    const editInvestment = resolveCropInvestmentSnapshot(crop);
    const investmentInput = document.getElementById('crop-investment');
    if (investmentInput) {
        const roundedAmount = Math.round((Number(editInvestment.amount) || 0) * 100) / 100;
        investmentInput.value = roundedAmount > 0 ? String(roundedAmount) : '';
    }
    const investmentCurrency = document.getElementById('crop-investment-currency');
    if (investmentCurrency) {
        investmentCurrency.value = editInvestment.currency;
        investmentCurrency.dispatchEvent(new Event('change'));
    }
    const investmentFxMeta = document.getElementById('crop-investment-fx-meta');
    if (investmentFxMeta) {
        const currentRates = resolveEffectiveUsdRates(editInvestment.fxSnapshot);
        investmentFxMeta.textContent = buildInvestmentFxLine(editInvestment.fxSnapshot, currentRates);
    }
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
    const cropForm = document.getElementById('form-new-crop');
    if (cropForm?.dataset) {
        cropForm.dataset.initialStatus = normalizeCropStatus(crop.status_override || crop.status);
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
    const cropForm = document.getElementById('form-new-crop');
    if (cropForm?.dataset) cropForm.dataset.initialStatus = '';
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
        .btn-report-crop {
            width: 28px;
            height: 28px;
            background: rgba(96, 165, 250, 0.1);
            border: 1px solid rgba(96, 165, 250, 0.3);
            color: #60a5fa;
            border-radius: 50%;
            font-size: 0.75rem;
            line-height: 1;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .btn-report-crop:hover {
            background: #60a5fa;
            color: #0a0a0a;
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
                    const fallbackId = el.id ? `${el.id}-content` : `yg-acc-${randomBase36(10)}-content`;
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

    // V9.6.2: Fix Facturero Edit Label (Fiados -> Cliente)
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
    const generateId = () => `arw_${Date.now().toString(36)}_${randomBase36(6)}`;
    const generateHash = () => randomBase36(6).toUpperCase();

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
        const icon = document.createElement('span');
        icon.style.fontSize = '1.1rem';
        icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
        const text = document.createElement('span');
        text.style.cssText = 'font-size:0.82rem;color:var(--arw-text-primary)';
        text.textContent = String(message || '');
        toast.append(icon, text);
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
        showToast(`✅ Bitácora "${String(name || '')}" creada`, 'success');
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
            showToast(`🗑️ Bitácora "${String(b?.name || '')}" eliminada`);
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
            list.replaceChildren();
            const emptyItem = document.createElement('li');
            emptyItem.style.cssText = 'padding:24px 20px;text-align:center;color:var(--arw-text-muted);font-size:0.82rem;white-space:pre-line;';
            emptyItem.textContent = 'No hay bitácoras aún.\n¡Crea la primera arriba!';
            list.appendChild(emptyItem);
            return;
        }
        list.replaceChildren();
        const fragment = document.createDocumentFragment();
        state.bitacoras.forEach((b) => {
            const item = document.createElement('li');
            item.className = `arw-bitacora-item ${b.id === state.activeBitacoraId ? 'active' : ''}`;
            item.dataset.id = b.id;

            const icon = document.createElement('span');
            icon.className = 'arw-bitacora-icon';
            icon.textContent = String(b.icon || '');

            const info = document.createElement('div');
            info.className = 'arw-bitacora-info';

            const name = document.createElement('div');
            name.className = 'arw-bitacora-name';
            name.textContent = String(b.name || '');

            const meta = document.createElement('div');
            meta.className = 'arw-bitacora-meta';
            meta.textContent = `${b.reports.length} reporte${b.reports.length !== 1 ? 's' : ''} · ${timeAgo(b.createdAt)}`;

            info.append(name, meta);

            const del = document.createElement('button');
            del.className = 'arw-bitacora-delete';
            del.dataset.del = b.id;
            del.title = 'Eliminar';
            del.style.cssText = 'background:none;border:none;color:var(--arw-text-muted);cursor:pointer;padding:4px 8px;font-size:14px;opacity:0;transition:opacity 0.2s;';
            del.textContent = '✕';

            item.append(icon, info, del);
            fragment.appendChild(item);
        });
        list.appendChild(fragment);
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
        if (breadcrumb) {
            breadcrumb.replaceChildren();
            const root = document.createElement('span');
            root.className = 'arw-breadcrumb-item';
            root.textContent = 'AgroRepo';
            breadcrumb.appendChild(root);
        }
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
            breadcrumb.replaceChildren();
            const root = document.createElement('span');
            root.className = 'arw-breadcrumb-item';
            root.textContent = 'AgroRepo';
            const sep = document.createElement('span');
            sep.style.cssText = 'color:var(--arw-text-muted);margin:0 8px;';
            sep.textContent = '›';
            const current = document.createElement('span');
            current.className = 'arw-breadcrumb-current';
            current.style.color = 'var(--arw-gold-primary)';
            current.textContent = `${bitacora.icon} ${bitacora.name}`;
            breadcrumb.append(root, sep, current);
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
            container.replaceChildren();
            const emptyState = document.createElement('div');
            emptyState.className = 'arw-empty-state';

            const icon = document.createElement('div');
            icon.className = 'arw-empty-state-icon';
            icon.textContent = '📋';
            const title = document.createElement('div');
            title.className = 'arw-empty-state-title';
            title.textContent = 'Sin reportes aún';
            const text = document.createElement('div');
            text.className = 'arw-empty-state-text';
            text.textContent = 'Escribe tu primer reporte de campo arriba';

            emptyState.append(icon, title, text);
            container.appendChild(emptyState);
            return;
        }
        container.replaceChildren();
        const timeline = document.createElement('div');
        timeline.className = 'arw-commit-timeline';
        timeline.style.cssText = 'position:relative;padding-left:20px;';

        bitacora.reports.forEach((r) => {
            const entry = document.createElement('div');
            entry.className = 'arw-commit-entry';
            entry.style.cssText = 'position:relative;padding:14px;background:var(--arw-bg-tertiary);border-radius:var(--arw-radius-md);margin-bottom:12px;border:1px solid var(--arw-border-subtle);';

            const dot = document.createElement('div');
            dot.style.cssText = 'position:absolute;left:-26px;top:18px;width:12px;height:12px;background:var(--arw-gold-primary);border-radius:50%;border:2px solid var(--arw-bg-primary);';

            const header = document.createElement('div');
            header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';

            const hash = document.createElement('span');
            hash.style.cssText = 'font-family:monospace;font-size:11px;color:var(--arw-gold-muted);background:var(--arw-bg-elevated);padding:2px 8px;border-radius:4px;';
            hash.textContent = `#${r.hash}`;

            const createdAt = document.createElement('span');
            createdAt.style.cssText = 'font-size:10px;color:var(--arw-text-muted);';
            createdAt.textContent = formatDate(r.createdAt);
            header.append(hash, createdAt);

            const content = document.createElement('div');
            content.style.cssText = 'font-size:13px;color:var(--arw-text-primary);line-height:1.6;margin-bottom:10px;white-space:pre-wrap;';
            content.textContent = String(r.content || '');

            entry.append(dot, header, content);

            if (Array.isArray(r.tags) && r.tags.length > 0) {
                const tagsWrap = document.createElement('div');
                tagsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
                r.tags.forEach((t) => {
                    const tag = document.createElement('span');
                    tag.style.cssText = 'font-size:10px;padding:3px 8px;background:rgba(212,175,55,0.1);border:1px solid var(--arw-border-gold);border-radius:12px;color:var(--arw-gold-muted);';
                    tag.textContent = getTagLabel(t);
                    tagsWrap.appendChild(tag);
                });
                entry.appendChild(tagsWrap);
            }

            const actions = document.createElement('div');
            actions.style.cssText = 'display:flex;gap:8px;';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'arw-action-copy';
            copyBtn.dataset.copy = r.id;
            copyBtn.style.cssText = 'background:none;border:1px solid var(--arw-border-subtle);color:var(--arw-text-secondary);padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;';
            copyBtn.textContent = '📋 Copiar';

            const delBtn = document.createElement('button');
            delBtn.className = 'arw-action-del';
            delBtn.dataset.del = r.id;
            delBtn.style.cssText = 'background:none;border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;';
            delBtn.textContent = '🗑️ Eliminar';

            actions.append(copyBtn, delBtn);
            entry.appendChild(actions);
            timeline.appendChild(entry);
        });

        container.appendChild(timeline);
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
            pvTagStats.replaceChildren();
            if (entries.length === 0) {
                const empty = document.createElement('p');
                empty.style.cssText = 'font-size:0.78rem;color:var(--arw-text-muted);';
                empty.textContent = 'Sin datos aún';
                pvTagStats.appendChild(empty);
            } else {
                const fragment = document.createDocumentFragment();
                entries.forEach(([tag, count]) => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--arw-border-subtle);font-size:12px;';

                    const tagLabel = document.createElement('span');
                    tagLabel.style.color = 'var(--arw-text-secondary)';
                    tagLabel.textContent = getTagLabel(tag);

                    const countLabel = document.createElement('span');
                    countLabel.style.cssText = 'color:var(--arw-gold-primary);font-weight:600;';
                    countLabel.textContent = String(count);

                    row.append(tagLabel, countLabel);
                    fragment.appendChild(row);
                });
                pvTagStats.appendChild(fragment);
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
        root.replaceChildren();
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
