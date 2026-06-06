/**
 * YavlGold Agro — Shared Report Utilities
 *
 * Pure functions shared by agro-crop-report.js and agro-stats-report.js.
 * Cero DOM, cero queries, cero estado global.
 */

// ---------------------------------------------------------------------------
// Crop Status Constants
// ---------------------------------------------------------------------------

export const CROP_STATUS_UI = {
    sembrado: { emoji: '🌱', text: 'Sembrado' },
    creciendo: { emoji: '🌿', text: 'Creciendo' },
    produccion: { emoji: '🌾', text: 'Producción' },
    finalizado: { emoji: '✅', text: 'Finalizado' },
    cancelado: { emoji: '❌', text: 'Cancelado' }
};

export const CROP_STATUS_LEGACY_MAP = {
    growing: 'creciendo',
    ready: 'produccion',
    attention: 'sembrado',
    harvested: 'finalizado'
};

export const CROP_STATUS_THRESHOLDS = {
    sembrado: 0,
    creciendo: 25,
    produccion: 70,
    finalizado: 100
};

// ---------------------------------------------------------------------------
// Crop Display Constants
// ---------------------------------------------------------------------------

export const CROP_DISPLAY_FALLBACK_ICON = '🌱';
export const CROP_DISPLAY_FALLBACK_NAME = 'Cultivo';
export const CROP_EMOJI_TOKEN_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
export const CROP_TEXT_TOKEN_RE = /[\p{L}\p{N}]/u;

// ---------------------------------------------------------------------------
// Number / Date Helpers
// ---------------------------------------------------------------------------

export function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
}

export function getTodayKey() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function toUtcDate(dateStr) {
    const parts = String(dateStr || '').split('-').map((p) => Number(p));
    if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return null;
    const [year, month, day] = parts;
    return new Date(Date.UTC(year, month - 1, day));
}

export function diffDays(dateA, dateB) {
    const a = toUtcDate(dateA);
    const b = toUtcDate(dateB);
    if (!a || !b) return null;
    return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function addDaysToDateKey(dateStr, days) {
    const base = toUtcDate(dateStr);
    if (!base || !Number.isFinite(days)) return null;
    base.setUTCDate(base.getUTCDate() + Math.round(days));
    const yyyy = base.getUTCFullYear();
    const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(base.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Crop Icon / Display Label
// ---------------------------------------------------------------------------

export function isCropEmojiToken(token) {
    const value = String(token || '').trim();
    if (!value) return false;
    return CROP_EMOJI_TOKEN_RE.test(value) && !CROP_TEXT_TOKEN_RE.test(value);
}

export function normalizeCropIcon(icon, fallback = CROP_DISPLAY_FALLBACK_ICON) {
    const value = String(icon || '').trim();
    if (isCropEmojiToken(value)) return value;
    return String(fallback || CROP_DISPLAY_FALLBACK_ICON).trim() || CROP_DISPLAY_FALLBACK_ICON;
}

export function buildCropDisplayLabel(crop) {
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
    const label = `${icon} ${name}`;
    return variety ? `${label} (${variety})` : label;
}

// ---------------------------------------------------------------------------
// Crop Status Logic
// ---------------------------------------------------------------------------

export function normalizeCropStatus(status) {
    const value = String(status || '').toLowerCase().trim();
    if (!value) return 'creciendo';
    if (CROP_STATUS_UI[value]) return value;
    if (CROP_STATUS_LEGACY_MAP[value]) return CROP_STATUS_LEGACY_MAP[value];
    return value;
}

export function computeCropProgress(crop) {
    const startDate = crop?.start_date;
    if (!startDate) return { ok: false, percent: null, dayIndex: 0, totalDays: 0 };

    const cycleDays = Number(crop?.cycle_days ?? crop?.template_duration_days);
    let totalDays = Number.isFinite(cycleDays) && cycleDays > 0 ? Math.round(cycleDays) : null;
    let endDate = totalDays ? addDaysToDateKey(startDate, totalDays) : null;

    if (!totalDays && crop?.expected_harvest_date) {
        const byDates = diffDays(crop.expected_harvest_date, startDate);
        if (byDates !== null) {
            totalDays = Math.max(1, byDates);
            endDate = crop.expected_harvest_date;
        }
    }

    if (!totalDays || !endDate) {
        return { ok: false, percent: null, dayIndex: 0, totalDays: 0 };
    }

    const todayKey = getTodayKey();
    const dayDiff = diffDays(todayKey, startDate);
    const dayIndex = clampNumber((dayDiff === null ? 0 : dayDiff) + 1, 0, totalDays);
    const percent = clampNumber((dayIndex / totalDays) * 100, 0, 100);

    return {
        ok: true,
        percent,
        dayIndex,
        totalDays
    };
}

export function computeAutoCropStatus(crop, progress) {
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

export function resolveCropStatus(crop, progress) {
    const override = String(crop?.status_override || '').trim();
    if (override) return normalizeCropStatus(override);
    const mode = String(crop?.status_mode || '').toLowerCase().trim();
    if (mode === 'auto') return computeAutoCropStatus(crop, progress);
    if (crop?.status) return normalizeCropStatus(crop.status);
    return computeAutoCropStatus(crop, progress);
}

export function formatCropStatusLine(status) {
    const normalized = normalizeCropStatus(status);
    const meta = CROP_STATUS_UI[normalized];
    if (!meta) return status || 'N/A';
    return `${meta.emoji} ${meta.text}`;
}

export function formatCropProgressLine(progress) {
    if (!progress?.ok) return 'N/A';
    const pctRounded = Math.round(Number(progress.percent) || 0);
    return `${pctRounded}% (día ${progress.dayIndex} de ${progress.totalDays})`;
}

// ---------------------------------------------------------------------------
// Crop Utility
// ---------------------------------------------------------------------------

export function isUnassignedCropId(value) {
    return value === null || value === undefined || String(value).trim() === '';
}

export function isCropActive(crop) {
    const progress = computeCropProgress(crop);
    const status = resolveCropStatus(crop, progress);
    return status !== 'finalizado' && status !== 'cancelado';
}
