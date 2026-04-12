import supabase from '../assets/js/config/supabase-config.js';
import './agro-period-cycles.css';

const PERIOD_CYCLE_TABLE = 'agro_period_cycles';
const PERIOD_CYCLES_UPDATED_EVENT = 'agro:period-cycles:updated';
const OPERATIONAL_PORTFOLIO_UPDATED_EVENT = 'agro:operational-portfolio-updated';
const ACTIVE_OPERATIONAL_STATUS_VALUES = new Set(['open', 'in_progress', 'compensating']);
const PERIOD_SUBVIEW_OPTIONS = Object.freeze(['activos', 'finalizados', 'comparar', 'estadisticas']);

const state = {
    root: null,
    userId: '',
    boundRoot: null,
    globalEventsBound: false,
    loading: false,
    creating: false,
    schemaMissing: false,
    mounted: false,
    formOpen: false,
    editingCycleId: null,
    editingName: '',
    deletingCycleId: null,
    currentSubview: 'activos',
    cycles: [],
    summary: createEmptySummary(),
    values: createDraftValues()
};

function createDraftValues() {
    return {
        name: '',
        periodMonth: currentMonthKey()
    };
}

function createEmptySummary() {
    return {
        total: 0,
        active: 0,
        finalized: 0,
        open: 0,
        closed: 0,
        currentMonthLabel: formatMonthLabel(currentMonthKey())
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

function normalizePeriodSubview(value) {
    const token = normalizeToken(value);
    return PERIOD_SUBVIEW_OPTIONS.includes(token) ? token : 'activos';
}

function todayLocalIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function currentMonthKey() {
    return todayLocalIso().slice(0, 7);
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

function isMissingColumnError(error, columnName) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes(String(columnName || '').toLowerCase());
}

function isSchemaMissingError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes(PERIOD_CYCLE_TABLE)
        || message.includes('does not exist')
        || message.includes('could not find')
        || String(error?.code || '') === '42P01';
}

function notify(message, type = 'info') {
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    if (type === 'error') {
        console.error('[agro-period-cycles]', message);
        return;
    }
    console.info('[agro-period-cycles]', message);
}

function monthKeyFromParts(year, month) {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

function capitalizeFirst(value) {
    const safeValue = String(value || '').trim();
    if (!safeValue) return '';
    return safeValue.charAt(0).toUpperCase() + safeValue.slice(1);
}

function formatDerivedPeriodName(monthKey) {
    return capitalizeFirst(formatMonthLabel(monthKey).replace(/\s+de\s+/i, ' '));
}

function formatDateIso(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseMonthInput(value) {
    const raw = String(value || '').trim();
    if (!/^\d{4}-\d{2}$/.test(raw)) {
        throw new Error('Selecciona un mes válido.');
    }

    const [yearRaw, monthRaw] = raw.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('Selecciona un mes válido.');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return {
        year,
        month,
        monthKey: monthKeyFromParts(year, month),
        startDate: formatDateIso(startDate),
        endDate: formatDateIso(endDate)
    };
}

function formatMonthLabel(value) {
    const parsed = /^\d{4}-\d{2}$/.test(String(value || '').trim())
        ? parseMonthInput(value)
        : null;
    if (!parsed) return 'Mes no disponible';
    return new Intl.DateTimeFormat('es-ES', {
        month: 'long',
        year: 'numeric'
    }).format(new Date(parsed.year, parsed.month - 1, 1));
}

function formatDateLabel(value) {
    const safeValue = String(value || '').trim();
    if (!safeValue) return 'Sin fecha';
    const date = new Date(`${safeValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return safeValue;
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function formatAmountLabel(amount, currency) {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount)) return 'Sin monto';
    const safeCurrency = String(currency || 'COP').trim().toUpperCase() || 'COP';
    const formatted = new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: parsedAmount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    }).format(parsedAmount);
    return `${safeCurrency} ${formatted}`;
}

function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function diffDaysInclusive(startIso, endIso) {
    const start = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T00:00:00`);
    const ms = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(ms / 86400000) + 1);
}

function deriveCalendarStatus(cycle) {
    const today = todayLocalIso();
    return String(cycle?.end_date || '').trim() && String(cycle.end_date).trim() < today
        ? 'finalized'
        : 'active';
}

function deriveProgress(cycle) {
    const year = Number(cycle?.period_year || 0);
    const month = Number(cycle?.period_month || 0);
    const totalDays = getDaysInMonth(year, month);
    const today = todayLocalIso();
    const startDate = String(cycle?.start_date || '').trim();
    const endDate = String(cycle?.end_date || '').trim();

    let elapsedDays = 0;
    if (today < startDate) {
        elapsedDays = 0;
    } else if (today > endDate) {
        elapsedDays = totalDays;
    } else {
        elapsedDays = diffDaysInclusive(startDate, today);
    }

    const percent = totalDays > 0
        ? Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)))
        : 0;

    return {
        elapsedDays,
        totalDays,
        percent,
        text: today > endDate
            ? `Mes completo (${totalDays}/${totalDays})`
            : `Día ${elapsedDays}/${totalDays} (${percent}%)`
    };
}

function createMovementTypeMeta(economicType) {
    const type = normalizeToken(economicType);
    if (type === 'income') {
        return { label: 'Ingreso', tone: 'income' };
    }
    if (type === 'loss') {
        return { label: 'Pérdida', tone: 'loss' };
    }
    if (type === 'donation') {
        return { label: 'Donación', tone: 'donation' };
    }
    return { label: 'Gasto', tone: 'expense' };
}

function compareDatesDescending(left, right) {
    const leftKey = `${String(left?.date || '').trim()} ${String(left?.created_at || '').trim()}`;
    const rightKey = `${String(right?.date || '').trim()} ${String(right?.created_at || '').trim()}`;
    return rightKey.localeCompare(leftKey);
}

function buildDerivedCycle(monthKey, userId = '', overrides = {}) {
    const parsed = parseMonthInput(monthKey);
    return {
        id: `derived-${monthKey}`,
        user_id: userId,
        name: formatDerivedPeriodName(monthKey),
        period_year: parsed.year,
        period_month: parsed.month,
        start_date: parsed.startDate,
        end_date: parsed.endDate,
        created_at: '',
        updated_at: '',
        derived: true,
        ...overrides
    };
}

function normalizePersistedCycle(row) {
    const monthKey = monthKeyFromParts(row?.period_year, row?.period_month);
    return buildDerivedCycle(monthKey, normalizeId(row?.user_id), {
        ...row,
        id: normalizeId(row?.id),
        derived: false
    });
}

function createFallbackOperationalMovement(cycle) {
    return {
        id: `fallback-${normalizeId(cycle?.id)}`,
        cycle_id: normalizeId(cycle?.id),
        amount: null,
        currency: 'USD',
        amount_usd: null,
        concept: String(cycle?.name || '').trim(),
        movement_date: String(cycle?.opened_at || '').trim(),
        created_at: String(cycle?.created_at || '').trim()
    };
}

function buildOperationalMovementRow(cycle, movement) {
    const cropId = normalizeId(cycle?.crop_id);
    const economicType = normalizeToken(cycle?.economic_type);
    const typeMeta = createMovementTypeMeta(economicType);
    const amount = movement?.amount_usd != null ? movement.amount_usd : movement?.amount;
    const currency = movement?.amount_usd != null ? 'USD' : (movement?.currency || 'COP');
    const concept = String(movement?.concept || cycle?.name || 'Movimiento operativo').trim() || 'Movimiento operativo';

    return {
        id: normalizeId(movement?.id),
        cycleId: normalizeId(cycle?.id),
        kind: economicType || 'expense',
        concept,
        date: String(movement?.movement_date || cycle?.opened_at || '').trim(),
        created_at: String(movement?.created_at || cycle?.created_at || '').trim(),
        cropId,
        association: cropId ? 'linked' : 'unlinked',
        amountLabel: formatAmountLabel(amount, currency),
        typeLabel: typeMeta.label,
        typeTone: typeMeta.tone,
        operationalStatus: normalizeToken(cycle?.status || 'open')
    };
}

function buildOperationalActivityIndex(cycles, movements) {
    const movementsByCycle = new Map();
    (Array.isArray(movements) ? movements : []).forEach((movement) => {
        const cycleId = normalizeId(movement?.cycle_id);
        if (!cycleId) return;
        if (!movementsByCycle.has(cycleId)) {
            movementsByCycle.set(cycleId, []);
        }
        movementsByCycle.get(cycleId).push(movement);
    });

    const months = new Map();
    const ensureMonth = (monthKey) => {
        if (!months.has(monthKey)) {
            months.set(monthKey, {
                movements: [],
                cycleIndex: new Map()
            });
        }
        return months.get(monthKey);
    };

    (Array.isArray(cycles) ? cycles : []).forEach((cycle) => {
        const cycleId = normalizeId(cycle?.id);
        if (!cycleId) return;
        const cycleMovements = Array.isArray(movementsByCycle.get(cycleId)) && movementsByCycle.get(cycleId).length > 0
            ? movementsByCycle.get(cycleId)
            : [createFallbackOperationalMovement(cycle)];

        cycleMovements.forEach((movement) => {
            const monthKey = String(movement?.movement_date || cycle?.opened_at || '').trim().slice(0, 7);
            if (!/^\d{4}-\d{2}$/.test(monthKey)) return;
            const bucket = ensureMonth(monthKey);
            const row = buildOperationalMovementRow(cycle, movement);
            bucket.movements.push(row);
            if (!bucket.cycleIndex.has(cycleId)) {
                bucket.cycleIndex.set(cycleId, {
                    id: cycleId,
                    status: normalizeToken(cycle?.status || 'open'),
                    association: row.association
                });
            }
        });
    });

    months.forEach((bucket) => {
        bucket.movements.sort(compareDatesDescending);
        const cycleEntries = Array.from(bucket.cycleIndex.values());
        bucket.cycleCount = cycleEntries.length;
        bucket.activeCycleCount = cycleEntries.filter((entry) => ACTIVE_OPERATIONAL_STATUS_VALUES.has(entry.status)).length;
        bucket.linkedCycleCount = cycleEntries.filter((entry) => entry.association === 'linked').length;
        bucket.unlinkedCycleCount = cycleEntries.filter((entry) => entry.association !== 'linked').length;
    });

    return months;
}

async function fetchOperationalPeriodActivity(userId) {
    const { data: cycles, error: cyclesError } = await supabase
        .from('agro_operational_cycles')
        .select('id,user_id,name,economic_type,category,crop_id,status,opened_at,closed_at,created_at')
        .eq('user_id', userId)
        .order('opened_at', { ascending: false })
        .order('created_at', { ascending: false });

    if (cyclesError) throw cyclesError;

    const cycleIds = (cycles || []).map((cycle) => normalizeId(cycle?.id)).filter(Boolean);
    if (cycleIds.length === 0) {
        return new Map();
    }

    const { data: movements, error: movementsError } = await supabase
        .from('agro_operational_movements')
        .select('id,cycle_id,amount,currency,amount_usd,concept,movement_date,created_at')
        .eq('user_id', userId)
        .in('cycle_id', cycleIds)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false });

    if (movementsError) throw movementsError;
    return buildOperationalActivityIndex(cycles || [], movements || []);
}

function mergePeriodCycles(rows, activityMap, userId) {
    const merged = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const normalized = normalizePersistedCycle(row);
        merged.set(monthKeyFromParts(normalized.period_year, normalized.period_month), normalized);
    });

    if (activityMap instanceof Map) {
        activityMap.forEach((_, monthKey) => {
            if (!merged.has(monthKey)) {
                merged.set(monthKey, buildDerivedCycle(monthKey, userId));
            }
        });
    }

    return Array.from(merged.values()).sort((left, right) => {
        const leftStart = String(left?.start_date || '').trim();
        const rightStart = String(right?.start_date || '').trim();
        const byDate = rightStart.localeCompare(leftStart);
        if (byDate !== 0) return byDate;
        const leftCreated = String(left?.created_at || '').trim();
        const rightCreated = String(right?.created_at || '').trim();
        return rightCreated.localeCompare(leftCreated);
    });
}

function buildCycleViewModel(cycle, activityMap) {
    const monthKey = monthKeyFromParts(cycle.period_year, cycle.period_month);
    const activity = activityMap instanceof Map ? activityMap.get(monthKey) : null;
    const movements = Array.isArray(activity?.movements)
        ? [...activity.movements]
        : [];
    const linked = movements.filter((movement) => movement.association === 'linked');
    const unlinked = movements.filter((movement) => movement.association !== 'linked');
    const status = deriveCalendarStatus(cycle);
    const progress = deriveProgress(cycle);
    const activeCycleCount = Number(activity?.activeCycleCount || 0);
    const portfolioStatus = activeCycleCount > 0 ? 'open' : 'closed';

    return {
        ...cycle,
        monthKey,
        monthLabel: formatMonthLabel(monthKey),
        rangeLabel: `${formatDateLabel(cycle.start_date)} - ${formatDateLabel(cycle.end_date)}`,
        status,
        progress,
        movements,
        linked,
        unlinked,
        movementCount: movements.length,
        cycleCount: Number(activity?.cycleCount || 0),
        activeCycleCount,
        linkedCycleCount: Number(activity?.linkedCycleCount || 0),
        unlinkedCycleCount: Number(activity?.unlinkedCycleCount || 0),
        portfolioStatus,
        incomeCount: movements.filter((movement) => movement.kind === 'income').length,
        lossCount: movements.filter((movement) => movement.kind === 'loss').length
    };
}

function buildSummary(cycles) {
    return (Array.isArray(cycles) ? cycles : []).reduce((summary, cycle) => {
        summary.total += 1;
        if (cycle.status === 'finalized') summary.finalized += 1;
        else summary.active += 1;

        if (cycle.portfolioStatus === 'open') summary.open += 1;
        else summary.closed += 1;
        return summary;
    }, createEmptySummary());
}

const PERIOD_SUBVIEW_META = Object.freeze({
    activos: Object.freeze({
        title: 'Períodos activos',
        subtitle: 'Meses calendario todavía en curso',
        overviewEyebrow: 'Lectura mensual activa',
        overviewTitle: 'Períodos en curso',
        overviewCopy: 'Meses que siguen corriendo en calendario y conservan lectura viva de la operativa mensual.',
        emptyTitle: 'No hay períodos activos visibles.',
        emptyCopy: 'Cuando un mes esté en curso o tenga operativa mensual abierta, aparecerá aquí.',
        regionId: 'agro-period-cycles-active-view'
    }),
    finalizados: Object.freeze({
        title: 'Períodos finalizados',
        subtitle: 'Meses calendario ya cerrados',
        overviewEyebrow: 'Historial mensual',
        overviewTitle: 'Períodos finalizados',
        overviewCopy: 'Meses ya cerrados por calendario, conservados como lectura histórica de la operativa.',
        emptyTitle: 'Todavía no hay períodos finalizados visibles.',
        emptyCopy: 'Los meses cerrados aparecerán aquí como historial mensual consolidado.',
        regionId: 'agro-period-cycles-finalized-view'
    }),
    comparar: Object.freeze({
        title: 'Comparar períodos',
        subtitle: 'Base preparada para contraste entre meses',
        overviewEyebrow: 'Comparación mensual',
        overviewTitle: 'Comparar períodos',
        overviewCopy: 'Esta subvista queda preparada para contrastar meses sin mezclar la familia mensual con cultivos ni con operación comercial.',
        regionId: 'agro-period-cycles-compare-view'
    }),
    estadisticas: Object.freeze({
        title: 'Estadísticas de períodos',
        subtitle: 'Resumen estructural de la familia mensual',
        overviewEyebrow: 'Lectura resumida',
        overviewTitle: 'Estadísticas de períodos',
        overviewCopy: 'Vista base de indicadores mensuales, lista para crecer en una pasada posterior sin cambiar la arquitectura del shell.',
        regionId: 'agro-period-cycles-stats-view'
    })
});

function getCurrentSubviewMeta() {
    return PERIOD_SUBVIEW_META[state.currentSubview] || PERIOD_SUBVIEW_META.activos;
}

async function ensureUserId(initialUserId = '') {
    const preferredId = normalizeId(initialUserId || state.userId);
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

async function fetchPeriodCycles(userId) {
    let query = supabase
        .from(PERIOD_CYCLE_TABLE)
        .select('id,user_id,name,period_year,period_month,start_date,end_date,created_at,updated_at,deleted_at')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false });

    query = query.is('deleted_at', null);

    const { data, error } = await query;
    if (error) {
        if (isMissingColumnError(error, 'deleted_at')) {
            const fallback = await supabase
                .from(PERIOD_CYCLE_TABLE)
                .select('id,user_id,name,period_year,period_month,start_date,end_date,created_at,updated_at')
                .eq('user_id', userId)
                .order('start_date', { ascending: false })
                .order('created_at', { ascending: false });
            if (fallback.error) throw fallback.error;
            return fallback.data || [];
        }
        throw error;
    }

    return data || [];
}

function pluralize(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function renderModuleHeader() {
    const meta = getCurrentSubviewMeta();
    return `
        <header class="module-header animate-in delay-3">
            <div class="module-title-group">
                <div class="module-icon">🗓️</div>
                <div class="module-heading">
                    <p class="ops-module-eyebrow">Familia mensual</p>
                    <h2 class="module-title">${escapeHtml(meta.title)}</h2>
                    <p class="module-subtitle">${escapeHtml(meta.subtitle)} dentro de la familia Ciclos de período.</p>
                </div>
            </div>
            <div class="header-actions">
                <button type="button" class="btn btn-primary" data-period-action="toggle-form">${state.formOpen ? 'Cerrar creación' : 'Crear ciclo del mes'}</button>
            </div>
        </header>
    `;
}

function renderOverviewSection() {
    const summary = state.summary || createEmptySummary();
    const meta = getCurrentSubviewMeta();
    return `
        <section class="agro-period-family__overview" aria-label="Resumen de ciclos de período">
            <div class="agro-period-family__overview-copy">
                <p class="agro-period-family__overview-eyebrow">${escapeHtml(meta.overviewEyebrow)}</p>
                <h3 class="agro-period-family__overview-title">${escapeHtml(meta.overviewTitle)}</h3>
                <p class="agro-period-family__overview-subtitle">${escapeHtml(meta.overviewCopy)}</p>
            </div>
            <div class="agro-period-family__overview-grid">
                <article class="agro-period-family__overview-card">
                    <span class="agro-period-family__overview-label">Períodos</span>
                    <strong class="agro-period-family__overview-value">${summary.total}</strong>
                </article>
                <article class="agro-period-family__overview-card">
                    <span class="agro-period-family__overview-label">Active / Final.</span>
                    <strong class="agro-period-family__overview-value">${summary.active} / ${summary.finalized}</strong>
                </article>
                <article class="agro-period-family__overview-card">
                    <span class="agro-period-family__overview-label">Open / Closed</span>
                    <strong class="agro-period-family__overview-value">${summary.open} / ${summary.closed}</strong>
                </article>
            </div>
        </section>
    `;
}

function renderCreateModal() {
    if (!state.formOpen) return '';
    const values = state.values || createDraftValues();
    return `
        <div class="agro-period-cycles__modal" data-period-overlay>
            <div class="agro-period-cycles__dialog" role="dialog" aria-modal="true" aria-labelledby="agro-period-cycle-form-title">
                <div class="agro-period-cycles__dialog-head">
                    <div>
                        <p class="agro-period-cycles__dialog-eyebrow">Nuevo período</p>
                        <h3 class="agro-period-cycles__dialog-title" id="agro-period-cycle-form-title">Crear ciclo de período</h3>
                        <p class="agro-period-cycles__dialog-copy">Define el nombre visible y el mes calendario. La lectura operativa seguirá viniendo de la actividad real del período.</p>
                    </div>
                    <button type="button" class="agro-period-cycles__dialog-close" data-period-action="cancel-form" aria-label="Cerrar modal">&times;</button>
                </div>
                <form class="agro-period-cycles__form" id="agro-period-cycle-form">
                    <label class="agro-period-cycles__field">
                        <span class="agro-period-cycles__field-label">Nombre del ciclo</span>
                        <input type="text" class="styled-input" name="name" data-period-draft="name" value="${escapeAttr(values.name)}" placeholder="Ej. Abril Operativo 2026" maxlength="80" required>
                    </label>
                    <label class="agro-period-cycles__field">
                        <span class="agro-period-cycles__field-label">Mes calendario</span>
                        <input type="month" class="styled-input" name="periodMonth" data-period-draft="periodMonth" value="${escapeAttr(values.periodMonth)}" required>
                    </label>
                    <div class="agro-period-cycles__form-actions">
                        <button type="button" class="btn" data-period-action="cancel-form">Cancelar</button>
                        <button type="submit" class="btn btn-primary"${state.creating ? ' disabled' : ''}>${state.creating ? 'Guardando...' : 'Guardar ciclo'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderMovementList(rows, emptyCopy) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return `<p class="agro-period-cycle-card__empty-copy">${escapeHtml(emptyCopy)}</p>`;
    }

    const visibleRows = rows.slice(0, 3);
    const remainingCount = Math.max(0, rows.length - visibleRows.length);

    return `
        <ul class="agro-period-cycle-card__movement-list">
            ${visibleRows.map((movement) => `
                <li class="agro-period-cycle-card__movement-item">
                    <div class="agro-period-cycle-card__movement-head">
                        <span class="agro-period-cycle-card__movement-badge is-${escapeAttr(movement.typeTone)}">${escapeHtml(movement.typeLabel)}</span>
                        <span class="agro-period-cycle-card__movement-date">${escapeHtml(formatDateLabel(movement.date))}</span>
                    </div>
                    <p class="agro-period-cycle-card__movement-title">${escapeHtml(movement.concept)}</p>
                    <p class="agro-period-cycle-card__movement-meta">${escapeHtml(movement.amountLabel)}</p>
                </li>
            `).join('')}
        </ul>
        ${remainingCount > 0 ? `<p class="agro-period-cycle-card__more">+${remainingCount} movimiento${remainingCount === 1 ? '' : 's'} más en este grupo.</p>` : ''}
    `;
}

function buildOperationalSnapshot(cycle) {
    const openText = cycle.activeCycleCount > 0
        ? `${pluralize(cycle.activeCycleCount, 'cartera abierta', 'carteras abiertas')}`
        : 'operativa cerrada en el mes';
    return `${capitalizeFirst(pluralize(cycle.movementCount, 'movimiento'))}, ${pluralize(cycle.cycleCount, 'ciclo operativo', 'ciclos operativos')} y ${openText}.`;
}

function buildSnapshotMeta(cycle) {
    return [
        { label: 'Movimientos', value: String(cycle.movementCount || 0) },
        { label: 'Ciclos del mes', value: String(cycle.cycleCount || 0) },
        { label: 'Open', value: String(cycle.activeCycleCount || 0) },
        { label: 'Asoc. / generales', value: `${cycle.linked.length} / ${cycle.unlinked.length}` }
    ];
}

function renderGroupCard(title, copy, rows, tone) {
    return `
        <section class="agro-period-cycle-card__group is-${escapeAttr(tone)}">
            <div class="agro-period-cycle-card__group-head">
                <div>
                    <p class="agro-period-cycle-card__group-title">${escapeHtml(title)}</p>
                    <p class="agro-period-cycle-card__group-copy">${escapeHtml(copy)}</p>
                </div>
                <span class="agro-period-cycle-card__group-count">${rows.length}</span>
            </div>
            ${renderMovementList(rows, tone === 'linked'
        ? 'Sin movimientos asociados al cultivo en este período.'
        : 'Sin movimientos generales en este período.')}
        </section>
    `;
}

function renderCycleCard(cycle) {
    return `
        <article class="agro-period-cycle-card" data-period-cycle-id="${escapeAttr(cycle.id)}">
            <header class="agro-period-cycle-card__head">
                <div class="agro-period-cycle-card__crop-info">
                    <span class="agro-period-cycle-card__icon">🗓️</span>
                    <div class="agro-period-cycle-card__heading">
                        <h4 class="agro-period-cycle-card__title">${escapeHtml(cycle.name)}</h4>
                        <p class="agro-period-cycle-card__range">${escapeHtml(cycle.rangeLabel)}</p>
                    </div>
                </div>
                <div class="agro-period-cycle-card__head-right">
                    <div class="agro-period-cycle-card__badges">
                        <span class="agro-period-cycle-card__status is-${escapeAttr(cycle.status)}">${cycle.status === 'finalized' ? 'Finalizado' : 'Activo'}</span>
                        <span class="agro-period-cycle-card__portfolio is-${escapeAttr(cycle.portfolioStatus)}">${cycle.portfolioStatus === 'open' ? 'Abierto' : 'Cerrado'}</span>
                    </div>
                    <div class="agro-period-cycle-card__actions">
                        <button type="button" class="agro-period-cycle-card__action-btn" data-period-action="edit-cycle" data-cycle-id="${escapeAttr(cycle.id)}" title="Editar nombre" aria-label="Editar ciclo">
                            <i class="fa-solid fa-pen" aria-hidden="true"></i>
                        </button>
                        <button type="button" class="agro-period-cycle-card__action-btn agro-period-cycle-card__action-btn--danger" data-period-action="delete-cycle" data-cycle-id="${escapeAttr(cycle.id)}" title="Eliminar ciclo" aria-label="Eliminar ciclo">
                            <i class="fa-solid fa-trash" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </header>

            <section class="agro-period-cycle-card__progress">
                <div class="agro-period-cycle-card__progress-meta">
                    <span class="agro-period-cycle-card__progress-label">Progreso</span>
                    <span class="agro-period-cycle-card__progress-value">${escapeHtml(cycle.progress.text)}</span>
                </div>
                <div class="agro-period-cycle-card__progress-track${cycle.status === 'finalized' ? ' is-complete' : ''}">
                    <div class="agro-period-cycle-card__progress-fill" style="width:${cycle.progress.percent}%">
                        <span class="agro-period-cycle-card__progress-dot"></span>
                    </div>
                </div>
            </section>

            <section class="agro-period-cycle-card__data-grid">
                ${buildSnapshotMeta(cycle).map((item) => `
                    <div class="agro-period-cycle-card__data-cell">
                        <span class="agro-period-cycle-card__summary-label">${escapeHtml(item.label)}</span>
                        <strong class="agro-period-cycle-card__summary-value">${escapeHtml(item.value)}</strong>
                    </div>
                `).join('')}
            </section>

            <section class="agro-period-cycle-card__profit-row">
                <span class="agro-period-cycle-card__profit-label">Resumen operativo</span>
                <span class="agro-period-cycle-card__profit-value">${escapeHtml(buildOperationalSnapshot(cycle))}</span>
            </section>

            <details class="agro-period-cycle-card__groups-details">
                <summary class="agro-period-cycle-card__groups-toggle">Ver desglose por asociación</summary>
                <div class="agro-period-cycle-card__groups">
                    ${renderGroupCard(
        'Asociados al cultivo',
        'Conservan crop_id y siguen siendo lectura oficial de la operativa del mes.',
        cycle.linked,
        'linked'
    )}
                    ${renderGroupCard(
        'No asociados al cultivo',
        'Operativa general del período, separada de la lectura del cultivo.',
        cycle.unlinked,
        'unlinked'
    )}
                </div>
            </details>
        </article>
    `;
}

function getCyclesForCurrentSubview() {
    if (state.currentSubview === 'finalizados') {
        return state.cycles.filter((cycle) => cycle.status === 'finalized');
    }
    if (state.currentSubview === 'activos') {
        return state.cycles.filter((cycle) => cycle.status !== 'finalized');
    }
    return state.cycles;
}

function renderSubviewPlaceholder(title, copy, id) {
    return `
        <section class="agro-period-cycles__empty" id="${escapeAttr(id)}">
            <p class="agro-period-cycles__empty-title">${escapeHtml(title)}</p>
            <p class="agro-period-cycles__empty-copy">${escapeHtml(copy)}</p>
        </section>
    `;
}

function renderStatsSubview(meta) {
    const summary = state.summary || createEmptySummary();
    const latestCycles = state.cycles.slice(0, 3);
    return `
        <section class="agro-period-cycles__stats" id="${escapeAttr(meta.regionId)}">
            <div class="agro-period-cycle-card__summary agro-period-cycles__stats-grid">
                <div class="agro-period-cycle-card__summary-cell">
                    <span class="agro-period-cycle-card__summary-label">Períodos visibles</span>
                    <strong class="agro-period-cycle-card__summary-value">${summary.total}</strong>
                </div>
                <div class="agro-period-cycle-card__summary-cell">
                    <span class="agro-period-cycle-card__summary-label">Activos</span>
                    <strong class="agro-period-cycle-card__summary-value">${summary.active}</strong>
                </div>
                <div class="agro-period-cycle-card__summary-cell">
                    <span class="agro-period-cycle-card__summary-label">Finalizados</span>
                    <strong class="agro-period-cycle-card__summary-value">${summary.finalized}</strong>
                </div>
                <div class="agro-period-cycle-card__summary-cell">
                    <span class="agro-period-cycle-card__summary-label">Open / Closed</span>
                    <strong class="agro-period-cycle-card__summary-value">${summary.open} / ${summary.closed}</strong>
                </div>
            </div>
            ${latestCycles.length
            ? `
                    <div class="agro-period-cycles__stub-list">
                        ${latestCycles.map((cycle) => `
                            <article class="agro-period-cycles__stub-item">
                                <strong>${escapeHtml(cycle.name)}</strong>
                                <span>${escapeHtml(cycle.monthLabel)}</span>
                            </article>
                        `).join('')}
                    </div>
                `
            : renderSubviewPlaceholder('Todavía no hay datos mensuales para resumir.', 'Cuando existan períodos visibles, esta subvista podrá crecer sin reordenar la navegación.', `${meta.regionId}-empty`)}
        </section>
    `;
}

function renderCompareSubview(meta) {
    const latestCycles = state.cycles.slice(0, 2);
    if (!latestCycles.length) {
        return renderSubviewPlaceholder(
            'Comparar períodos quedará disponible aquí.',
            'La estructura de navegación ya quedó lista. En una pasada posterior se puede montar la comparación real sin mover el sidebar.',
            meta.regionId
        );
    }

    return `
        <section class="agro-period-cycles__stub-list" id="${escapeAttr(meta.regionId)}">
            <article class="agro-period-cycles__stub-item">
                <strong>Base de comparación preparada</strong>
                <span>${escapeHtml(latestCycles.map((cycle) => cycle.monthLabel).join(' vs '))}</span>
            </article>
            <article class="agro-period-cycles__stub-item">
                <strong>Próxima pasada</strong>
                <span>Seleccionar períodos, contrastar progreso y leer cierres mensuales lado a lado.</span>
            </article>
        </section>
    `;
}

function renderSubviewContent() {
    const meta = getCurrentSubviewMeta();

    if (state.currentSubview === 'comparar') {
        return renderCompareSubview(meta);
    }

    if (state.currentSubview === 'estadisticas') {
        return renderStatsSubview(meta);
    }

    const cycles = getCyclesForCurrentSubview();
    if (!cycles.length) {
        return renderSubviewPlaceholder(meta.emptyTitle, meta.emptyCopy, meta.regionId);
    }

    return `<div class="agro-period-cycles__grid" id="${escapeAttr(meta.regionId)}">${cycles.map((cycle) => renderCycleCard(cycle)).join('')}</div>`;
}

function renderEmptyState() {
    const meta = getCurrentSubviewMeta();
    return `
        <div class="agro-period-cycles__empty" id="${escapeAttr(meta.regionId)}">
            <p class="agro-period-cycles__empty-title">Todavía no hay períodos operativos visibles.</p>
            <p class="agro-period-cycles__empty-copy">Crea un ciclo del mes o registra operativa real para que esta familia empiece a poblarse.</p>
            <button type="button" class="btn btn-primary" data-period-action="toggle-form">Crear ciclo del mes</button>
        </div>
    `;
}

function renderSchemaMissing() {
    return `
        <div class="agro-period-cycles__empty">
            <p class="agro-period-cycles__empty-title">Falta la base de datos de Ciclos de Período.</p>
            <p class="agro-period-cycles__empty-copy">Aplica la migración canónica para habilitar <code>${escapeHtml(PERIOD_CYCLE_TABLE)}</code>.</p>
        </div>
    `;
}

function renderLoading() {
    return `
        <div class="agro-period-cycles__loading">
            <span class="agro-period-cycles__spinner" aria-hidden="true"></span>
            <span>Consultando períodos y movimientos operativos...</span>
        </div>
    `;
}

function emitUpdated() {
    const detail = { summary: getAgroPeriodCyclesSummary(), count: state.cycles.length };
    window.dispatchEvent(new CustomEvent(PERIOD_CYCLES_UPDATED_EVENT, { detail }));
}

function renderRoot() {
    if (!state.root) return;

    const bodyMarkup = state.loading
        ? renderLoading()
        : state.schemaMissing
            ? renderSchemaMissing()
            : state.cycles.length === 0
                ? renderEmptyState()
                : renderSubviewContent();

    state.root.innerHTML = `
        <div class="agro-period-cycles agro-ops-v10">
            ${renderModuleHeader()}
            ${renderOverviewSection()}
            ${bodyMarkup}
            ${renderCreateModal()}
        </div>
    `;
}

async function refreshPeriodCycles(options = {}) {
    if (state.loading) return;
    state.loading = true;
    state.schemaMissing = false;
    renderRoot();

    try {
        const userId = await ensureUserId(options.initialUserId);
        const rows = await fetchPeriodCycles(userId);
        const activityMap = await fetchOperationalPeriodActivity(userId);
        const mergedCycles = mergePeriodCycles(rows, activityMap, userId);
        state.cycles = mergedCycles.map((row) => buildCycleViewModel(row, activityMap));
        state.summary = buildSummary(state.cycles);
    } catch (error) {
        state.cycles = [];
        state.summary = createEmptySummary();
        state.schemaMissing = isSchemaMissingError(error);
        if (!state.schemaMissing) {
            notify(error?.message || 'No se pudieron cargar los ciclos de período.', 'error');
        }
    } finally {
        state.loading = false;
        renderRoot();
        emitUpdated();
    }
}

async function softDeletePeriodCycle(cycleId) {
    const userId = await ensureUserId();
    const { error } = await supabase
        .from(PERIOD_CYCLE_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', cycleId)
        .eq('user_id', userId);
    if (error) throw error;
}

async function renamePeriodCycle(cycleId, newName) {
    const userId = await ensureUserId();
    const trimmed = String(newName || '').trim();
    if (!trimmed) throw new Error('El nombre no puede estar vac\u00edo.');
    const { error } = await supabase
        .from(PERIOD_CYCLE_TABLE)
        .update({ name: trimmed })
        .eq('id', cycleId)
        .eq('user_id', userId);
    if (error) throw error;
}

async function createPeriodCycleFromDraft() {
    const userId = await ensureUserId();
    const name = String(state.values?.name || '').trim();
    if (!name) {
        throw new Error('El nombre del ciclo es obligatorio.');
    }

    const parsed = parseMonthInput(state.values?.periodMonth);
    const duplicate = state.cycles.find((cycle) => cycle.monthKey === parsed.monthKey && cycle.derived !== true);
    if (duplicate) {
        throw new Error(`Ya existe un ciclo para ${duplicate.monthLabel}.`);
    }

    const payload = {
        user_id: userId,
        name,
        period_year: parsed.year,
        period_month: parsed.month,
        start_date: parsed.startDate,
        end_date: parsed.endDate
    };

    const { error } = await supabase.from(PERIOD_CYCLE_TABLE).insert(payload);
    if (error) throw error;
}

function setDraftValue(field, value) {
    state.values[field] = value;
}

function resetForm(keepMonth = true) {
    const monthValue = keepMonth ? (state.values?.periodMonth || currentMonthKey()) : currentMonthKey();
    state.formOpen = false;
    state.creating = false;
    state.values = {
        name: '',
        periodMonth: monthValue
    };
}

function bindRootEvents() {
    if (state.root && state.boundRoot !== state.root) {
        state.root.addEventListener('click', async (event) => {
            if (event.target?.matches?.('[data-period-overlay]')) {
                resetForm();
                renderRoot();
                return;
            }

            const button = event.target.closest('[data-period-action]');
            if (!button) return;

            const action = button.dataset.periodAction;
            if (action === 'toggle-form') {
                state.formOpen = !state.formOpen;
                renderRoot();
                return;
            }

            if (action === 'cancel-form') {
                resetForm();
                renderRoot();
                return;
            }

            if (action === 'edit-cycle') {
                const cycleId = button.dataset.cycleId;
                const cycle = state.cycles.find((c) => c.id === cycleId);
                if (!cycle) return;
                const newName = prompt('Nuevo nombre del ciclo:', cycle.name);
                if (newName === null || newName.trim() === '' || newName.trim() === cycle.name) return;
                try {
                    await renamePeriodCycle(cycleId, newName);
                    notify('Nombre actualizado.', 'success');
                    await refreshPeriodCycles();
                } catch (err) {
                    notify(err?.message || 'No se pudo renombrar.', 'error');
                }
                return;
            }

            if (action === 'delete-cycle') {
                const cycleId = button.dataset.cycleId;
                const cycle = state.cycles.find((c) => c.id === cycleId);
                if (!cycle) return;
                const confirmed = confirm(`\u00bfEliminar el ciclo "${cycle.name}"? Esta acci\u00f3n es reversible desde la base de datos.`);
                if (!confirmed) return;
                try {
                    await softDeletePeriodCycle(cycleId);
                    notify('Ciclo eliminado.', 'success');
                    await refreshPeriodCycles();
                } catch (err) {
                    notify(err?.message || 'No se pudo eliminar.', 'error');
                }
                return;
            }
        });

        state.root.addEventListener('input', (event) => {
            const field = event.target?.dataset?.periodDraft;
            if (!field) return;
            setDraftValue(field, event.target.value);
        });

        state.root.addEventListener('submit', async (event) => {
            if (event.target?.id !== 'agro-period-cycle-form') return;
            event.preventDefault();
            if (state.creating) return;

            state.creating = true;
            renderRoot();

            try {
                await createPeriodCycleFromDraft();
                notify('Ciclo de período creado correctamente.', 'success');
                resetForm(false);
                await refreshPeriodCycles();
            } catch (error) {
                state.creating = false;
                renderRoot();
                notify(error?.message || 'No se pudo crear el ciclo de período.', 'error');
            }
        });

        state.boundRoot = state.root;
    }

    if (state.globalEventsBound) return;

    document.addEventListener('data-refresh', () => {
        if (state.mounted) {
            void refreshPeriodCycles();
        }
    });
    window.addEventListener(OPERATIONAL_PORTFOLIO_UPDATED_EVENT, () => {
        if (state.mounted) {
            void refreshPeriodCycles();
        }
    });

    state.globalEventsBound = true;
}

export function getAgroPeriodCyclesSummary() {
    return {
        ...(state.summary || createEmptySummary()),
        currentSubview: state.currentSubview,
        schemaMissing: state.schemaMissing,
        loading: state.loading
    };
}

export async function assertOperationalPeriodOpen({ movementDate, userId = '' } = {}) {
    const safeDate = String(movementDate || '').trim();
    if (!safeDate || !/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) return { allowed: true, cycle: null };

    const monthKey = safeDate.slice(0, 7);
    const resolvedUserId = await ensureUserId(userId);
    const derivedCycle = buildDerivedCycle(monthKey, resolvedUserId);
    const year = Number(derivedCycle.period_year || 0);
    const month = Number(derivedCycle.period_month || 0);

    let cycle = derivedCycle;

    let result = await supabase
        .from(PERIOD_CYCLE_TABLE)
        .select('id,name,period_year,period_month,start_date,end_date,deleted_at,user_id')
        .eq('user_id', resolvedUserId)
        .eq('period_year', year)
        .eq('period_month', month)
        .is('deleted_at', null)
        .maybeSingle();

    if (result.error && isMissingColumnError(result.error, 'deleted_at')) {
        result = await supabase
            .from(PERIOD_CYCLE_TABLE)
            .select('id,name,period_year,period_month,start_date,end_date,user_id')
            .eq('user_id', resolvedUserId)
            .eq('period_year', year)
            .eq('period_month', month)
            .maybeSingle();
    }

    if (result.error) {
        if (isSchemaMissingError(result.error)) {
            return { allowed: true, cycle: null };
        }
        throw result.error;
    }

    if (result.data) {
        cycle = normalizePersistedCycle(result.data);
    }

    if (deriveCalendarStatus(cycle) === 'finalized') {
        throw new Error(`El período ${formatMonthLabel(monthKey)} ya está finalizado. No se permiten nuevos movimientos en ese mes.`);
    }

    return { allowed: true, cycle };
}

export async function mountAgroPeriodCycles(root, options = {}) {
    if (state.root === root && state.mounted && root) {
        if (options.initialUserId) {
            state.userId = normalizeId(options.initialUserId);
        }
        state.currentSubview = normalizePeriodSubview(options.initialSubview || state.currentSubview);
        renderRoot();
        await refreshPeriodCycles(options);
        return {
            refresh: () => refreshPeriodCycles(options)
        };
    }

    state.root = root || null;
    state.mounted = !!root;
    if (!state.root) return null;

    if (options.initialUserId) {
        state.userId = normalizeId(options.initialUserId);
    }
    state.currentSubview = normalizePeriodSubview(options.initialSubview || state.currentSubview);

    bindRootEvents();
    renderRoot();
    await refreshPeriodCycles(options);
    return {
        refresh: () => refreshPeriodCycles(options)
    };
}

export function unmountAgroPeriodCycles() {
    state.mounted = false;
    resetForm();
    if (state.root) {
        state.root.innerHTML = '';
    }
    state.root = null;
}
