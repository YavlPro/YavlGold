/**
 * YavlGold V1 — Agro Agenda (Centro de Agenda Agrícola)
 * Fusiona: Calendario Lunar + Clima + Actividades programadas
 * Reemplaza el calendario lunar antiguo como vista principal.
 *
 * Lazy-loaded: initialized when the Luna KPI button is clicked.
 * Uses: agro_agenda (Supabase), agro_events (completions), dashboard.js weather data.
 */

// ============================================================
// CONSTANTS
// ============================================================
const BASE_NEW_MOON = new Date('2026-01-19T00:00:00');
const LUNAR_CYCLE = 29.53058867;

const TYPE_CONFIG = {
    riego: { icon: '💧', label: 'Riego' },
    abono: { icon: '🧪', label: 'Abono' },
    fumigacion: { icon: '🌿', label: 'Fumigación' },
    poda: { icon: '✂️', label: 'Poda' },
    siembra: { icon: '🌱', label: 'Siembra' },
    cosecha: { icon: '🌾', label: 'Cosecha' },
    compra: { icon: '🛒', label: 'Compra' },
    observacion: { icon: '👁️', label: 'Observación' },
    otro: { icon: '📝', label: 'Otro' }
};

const MOON_RECOMMENDATIONS = {
    nueva: '🌑 Luna nueva: buen día para raíces y tubérculos',
    creciente: '🌓 Luna creciente: buen momento para sembrar',
    llena: '🌕 Luna llena: evitar siembra, bueno para cosecha',
    menguante: '🌗 Luna menguante: buen momento para podar y abonar'
};

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

// ============================================================
// STATE
// ============================================================
let _supabase = null;
let _cropsCache = [];
let _initialized = false;
let _currentMonth = new Date().getMonth();
let _currentYear = new Date().getFullYear();
let _selectedDate = new Date().toISOString().split('T')[0];
let _agendaItems = []; // items for current month view
let _listenerAC = null;
let _inlineMode = false;
let _activeContainer = null;
let _activeInline = false;
const CROP_EMOJI_TOKEN_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
const CROP_TEXT_TOKEN_RE = /[\p{L}\p{N}]/u;

function isCropEmojiToken(token) {
    const value = String(token || '').trim();
    if (!value) return false;
    return CROP_EMOJI_TOKEN_RE.test(value) && !CROP_TEXT_TOKEN_RE.test(value);
}

function getCropDisplayLabel(crop, fallbackIcon = '🌱', fallbackName = 'Cultivo') {
    const rawName = String(crop?.name || '').trim();
    const tokens = rawName ? rawName.split(/\s+/).filter(Boolean) : [];
    const leadingIcons = [];
    let cursor = 0;

    while (cursor < tokens.length && isCropEmojiToken(tokens[cursor])) {
        leadingIcons.push(tokens[cursor]);
        cursor += 1;
    }

    const iconFromName = leadingIcons.length ? leadingIcons[leadingIcons.length - 1] : '';
    const iconCandidate = iconFromName || String(crop?.icon || '').trim();
    const icon = isCropEmojiToken(iconCandidate) ? iconCandidate : fallbackIcon;
    const cleanName = tokens.slice(cursor).join(' ').trim() || fallbackName;
    return `${icon} ${cleanName}`;
}

// ============================================================
// INIT
// ============================================================

/**
 * @param {object} deps - { supabase, cropsCache }
 */
export async function initAgroAgenda(deps) {
    const inline = deps?.inline === true;
    if (_initialized) {
        _inlineMode = inline;
        openAgendaModal();
        return;
    }
    _supabase = deps.supabase;
    _cropsCache = deps.cropsCache || [];
    _initialized = true;
    _inlineMode = inline;

    injectAgendaStyles();
    await loadMonthItems(_currentYear, _currentMonth);
    openAgendaModal();
}

export function updateAgendaCrops(crops) {
    _cropsCache = Array.isArray(crops) ? crops : [];
}

// ============================================================
// DATA
// ============================================================

async function loadMonthItems(year, month) {
    if (!_supabase) return;
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return;
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDay = new Date(year, month + 1, 0).getDate();
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

        const { data, error } = await _supabase
            .from('agro_agenda')
            .select('id, crop_id, title, type, scheduled_date, scheduled_time, completed, completed_at, notes, recurring')
            .eq('user_id', user.id)
            .gte('scheduled_date', startDate)
            .lte('scheduled_date', endDate)
            .order('scheduled_date', { ascending: true })
            .order('scheduled_time', { ascending: true, nullsFirst: false });
        if (error) throw error;
        _agendaItems = data || [];
    } catch (err) {
        console.error('[AgroAgenda] loadMonthItems error:', err.message);
        _agendaItems = [];
    }
}

async function createAgendaItem(itemData) {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Sesión expirada.');

        const baseItem = {
            user_id: user.id,
            crop_id: itemData.crop_id || null,
            title: itemData.title,
            type: itemData.type,
            scheduled_date: itemData.scheduled_date,
            scheduled_time: itemData.scheduled_time || null,
            notes: itemData.notes || null,
            recurring: itemData.recurring || null
        };

        // If recurring, generate next 4 weeks of occurrences
        const items = [baseItem];
        if (itemData.recurring && itemData.recurring !== '') {
            const intervals = { diario: 1, semanal: 7, quincenal: 14, mensual: 30 };
            const interval = intervals[itemData.recurring] || 7;
            const baseDate = new Date(itemData.scheduled_date);
            for (let i = 1; i <= Math.floor(28 / interval); i++) {
                const nextDate = new Date(baseDate);
                nextDate.setDate(nextDate.getDate() + (interval * i));
                items.push({
                    ...baseItem,
                    scheduled_date: nextDate.toISOString().split('T')[0]
                });
            }
        }

        const { data, error } = await _supabase
            .from('agro_agenda')
            .insert(items)
            .select('id, crop_id, title, type, scheduled_date, scheduled_time, completed, completed_at, notes, recurring');
        if (error) throw error;

        // Merge into current month items
        if (data) {
            for (const item of data) {
                const itemMonth = new Date(item.scheduled_date + 'T00:00:00').getMonth();
                const itemYear = new Date(item.scheduled_date + 'T00:00:00').getFullYear();
                if (itemMonth === _currentMonth && itemYear === _currentYear) {
                    _agendaItems.push(item);
                }
            }
        }
        renderAgendaContent();
        return { success: true, count: data?.length || 0 };
    } catch (err) {
        console.error('[AgroAgenda] createItem error:', err.message);
        alert('Error al crear actividad: ' + err.message);
        return { success: false };
    }
}

async function toggleAgendaComplete(itemId) {
    const item = _agendaItems.find(i => i.id === itemId);
    if (!item) return;

    try {
        const nowCompleted = !item.completed;
        const updates = {
            completed: nowCompleted,
            completed_at: nowCompleted ? new Date().toISOString() : null
        };

        const { error } = await _supabase
            .from('agro_agenda')
            .update(updates)
            .eq('id', itemId);
        if (error) throw error;

        Object.assign(item, updates);

        // If completing → also insert into agro_events for traceability
        if (nowCompleted) {
            try {
                const { data: { user } } = await _supabase.auth.getUser();
                if (user) {
                    const eventType = mapAgendaTypeToEventType(item.type);
                    await _supabase.from('agro_events').insert({
                        user_id: user.id,
                        crop_id: item.crop_id || null,
                        type: eventType,
                        note: `[Agenda] ${item.title}${item.notes ? ' — ' + item.notes : ''}`,
                        occurred_at: new Date().toISOString()
                    });
                }
            } catch (evtErr) {
                console.warn('[AgroAgenda] Event log failed (non-critical):', evtErr.message);
            }
        }

        renderAgendaContent();
    } catch (err) {
        console.error('[AgroAgenda] toggleComplete error:', err.message);
    }
}

async function deleteAgendaItem(itemId) {
    if (!confirm('¿Eliminar esta actividad?')) return;
    try {
        const { error } = await _supabase.from('agro_agenda').delete().eq('id', itemId);
        if (error) throw error;
        _agendaItems = _agendaItems.filter(i => i.id !== itemId);
        renderAgendaContent();
    } catch (err) {
        console.error('[AgroAgenda] deleteItem error:', err.message);
        alert('Error al eliminar: ' + err.message);
    }
}

function mapAgendaTypeToEventType(agendaType) {
    const map = {
        riego: 'riego', abono: 'abono', fumigacion: 'fumigacion',
        poda: 'otro', siembra: 'observacion', cosecha: 'cosecha',
        compra: 'otro', observacion: 'observacion', otro: 'otro'
    };
    return map[agendaType] || 'otro';
}

// ============================================================
// MOON PHASE CALCULATION
// ============================================================

function getMoonPhase(date) {
    const diffTime = date.getTime() - BASE_NEW_MOON.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    const cycles = diffDays / LUNAR_CYCLE;
    return cycles - Math.floor(cycles);
}

function getPhaseInfo(phase) {
    if (phase < 0.03 || phase > 0.97) return { icon: '🌑', name: 'Luna Nueva', key: 'nueva', pct: 0 };
    if (phase < 0.22) return { icon: '🌒', name: 'Creciente', key: 'creciente', pct: Math.round(phase / 0.5 * 100) };
    if (phase < 0.28) return { icon: '🌓', name: 'Cuarto Creciente', key: 'creciente', pct: Math.round(phase / 0.5 * 100) };
    if (phase < 0.47) return { icon: '🌔', name: 'Gibosa Creciente', key: 'creciente', pct: Math.round(phase / 0.5 * 100) };
    if (phase < 0.53) return { icon: '🌕', name: 'Luna Llena', key: 'llena', pct: 100 };
    if (phase < 0.72) return { icon: '🌖', name: 'Gibosa Menguante', key: 'menguante', pct: Math.round((1 - phase) / 0.5 * 100) };
    if (phase < 0.78) return { icon: '🌗', name: 'Cuarto Menguante', key: 'menguante', pct: Math.round((1 - phase) / 0.5 * 100) };
    return { icon: '🌘', name: 'Menguante', key: 'menguante', pct: Math.round((1 - phase) / 0.5 * 100) };
}

function getMoonPhaseForDay(year, month, day) {
    return getPhaseInfo(getMoonPhase(new Date(year, month, day)));
}

// ============================================================
// WEATHER DATA (read from dashboard.js via DOM)
// ============================================================

function getWeatherFromDOM() {
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const humEl = document.getElementById('weather-humidity');
    return {
        temp: tempEl?.textContent || '--',
        desc: descEl?.textContent || '',
        humidity: humEl?.textContent || ''
    };
}

function sortAgendaItems(items) {
    return (Array.isArray(items) ? items.slice() : []).sort((left, right) => {
        const leftDate = String(left?.scheduled_date || '');
        const rightDate = String(right?.scheduled_date || '');
        if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);

        const leftTime = String(left?.scheduled_time || '99:99');
        const rightTime = String(right?.scheduled_time || '99:99');
        if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);

        return String(left?.title || '').localeCompare(String(right?.title || ''), 'es');
    });
}

function getTomorrowString(baseDate = new Date()) {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 1);
    return next.toISOString().split('T')[0];
}

function formatAgendaDateLabel(dateStr) {
    const safeDate = String(dateStr || '').trim();
    if (!safeDate) return 'Sin fecha';

    const todayStr = new Date().toISOString().split('T')[0];
    if (safeDate === todayStr) return 'Hoy';
    if (safeDate === getTomorrowString()) return 'Mañana';

    const [year, month, day] = safeDate.split('-').map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return safeDate;
    }

    const date = new Date(year, month - 1, day);
    const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthLabel = MONTHS_ES[month - 1] ? MONTHS_ES[month - 1].slice(0, 3) : '';
    return `${weekdayNames[date.getDay()]} ${day} ${monthLabel}`.trim();
}

function getAgendaPlanningSnapshot(todayStr) {
    const pending = sortAgendaItems(_agendaItems.filter((item) => !item.completed));
    const todayItems = pending.filter((item) => String(item?.scheduled_date || '') === todayStr);
    const upcomingItems = pending.filter((item) => String(item?.scheduled_date || '') > todayStr).slice(0, 4);
    const overdueItems = pending.filter((item) => String(item?.scheduled_date || '') < todayStr).slice(0, 4);
    const pendingCropIds = new Set(
        pending
            .map((item) => String(item?.crop_id || '').trim())
            .filter(Boolean)
    );

    return {
        pending,
        todayItems,
        upcomingItems,
        overdueItems,
        pendingCount: pending.length,
        cropCount: pendingCropIds.size
    };
}

function resolvePlanningCropFocus(planning) {
    const focusItem = [...(planning?.todayItems || []), ...(planning?.upcomingItems || [])]
        .find((item) => String(item?.crop_id || '').trim());
    return focusItem ? getCropName(focusItem.crop_id) : 'Plan general';
}

function createAgendaMetricCard({ label, value, copy = '', tone = 'default' }) {
    const card = document.createElement('article');
    card.className = `aga-metric-card${tone ? ` aga-metric-card--${tone}` : ''}`;

    const labelEl = document.createElement('span');
    labelEl.className = 'aga-metric-card__label';
    labelEl.textContent = label;

    const valueEl = document.createElement('strong');
    valueEl.className = 'aga-metric-card__value';
    valueEl.textContent = String(value || '0');

    card.append(labelEl, valueEl);

    if (copy) {
        const copyEl = document.createElement('span');
        copyEl.className = 'aga-metric-card__copy';
        copyEl.textContent = copy;
        card.appendChild(copyEl);
    }

    return card;
}

function createAgendaStateMessage(copy, variant = 'muted') {
    const state = document.createElement('div');
    state.className = `aga-state-message${variant ? ` aga-state-message--${variant}` : ''}`;
    state.textContent = copy;
    return state;
}

function createAgendaActivityNode(item, options = {}) {
    const tc = TYPE_CONFIG[item?.type] || TYPE_CONFIG.otro;
    const cropName = getCropName(item?.crop_id);
    const timeStr = item?.scheduled_time ? String(item.scheduled_time).substring(0, 5) : '';
    const showDate = options.showDate === true;
    const compact = options.compact === true;

    const activity = document.createElement('div');
    activity.className = `aga-activity${item?.completed ? ' aga-completed' : ''}${compact ? ' aga-activity--compact' : ''}`.trim();
    activity.dataset.itemId = String(item?.id || '');

    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'aga-check';
    checkBtn.dataset.action = 'toggle-complete';
    checkBtn.dataset.itemId = String(item?.id || '');
    checkBtn.textContent = item?.completed ? '☑' : '☐';

    const info = document.createElement('div');
    info.className = 'aga-activity-info';

    const activityTitle = document.createElement('div');
    activityTitle.className = 'aga-activity-title';
    activityTitle.textContent = `${tc.icon} ${String(item?.title || '')}`;

    const activityMeta = document.createElement('div');
    activityMeta.className = 'aga-activity-meta';

    if (showDate) {
        const dateSpan = document.createElement('span');
        dateSpan.textContent = formatAgendaDateLabel(item?.scheduled_date);
        activityMeta.appendChild(dateSpan);
    }

    if (cropName !== 'General') {
        const cropSpan = document.createElement('span');
        cropSpan.textContent = cropName;
        activityMeta.appendChild(cropSpan);
    }

    if (timeStr) {
        const timeSpan = document.createElement('span');
        timeSpan.textContent = `Hora ${timeStr}`;
        activityMeta.appendChild(timeSpan);
    }

    if (item?.notes && compact) {
        const noteSpan = document.createElement('span');
        noteSpan.textContent = 'Con nota';
        activityMeta.appendChild(noteSpan);
    }

    info.append(activityTitle, activityMeta);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'aga-delete-btn';
    deleteBtn.dataset.action = 'delete-item';
    deleteBtn.dataset.itemId = String(item?.id || '');
    deleteBtn.title = 'Eliminar';
    const deleteIcon = document.createElement('i');
    deleteIcon.className = 'fa fa-trash';
    deleteBtn.appendChild(deleteIcon);

    activity.append(checkBtn, info, deleteBtn);
    return activity;
}

function createAgendaActivityList(items, options = {}) {
    const list = document.createElement('div');
    list.className = options.listClassName || 'aga-activities-list';

    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) {
        list.appendChild(createAgendaStateMessage(
            options.emptyCopy || 'No hay actividades en esta lectura.',
            options.emptyVariant || 'muted'
        ));
        return list;
    }

    safeItems.forEach((item) => {
        list.appendChild(createAgendaActivityNode(item, options));
    });

    return list;
}

// ============================================================
// RENDER: MODAL
// ============================================================

function openAgendaModal() {
    if (_inlineMode) {
        const inlineRoot = document.getElementById('agro-agenda-inline-root');
        if (inlineRoot) {
            _activeContainer = inlineRoot;
            _activeInline = true;
            renderAgendaContent(inlineRoot, true);
            attachAgendaListeners(inlineRoot, true);
            return;
        }
    }
    let modal = document.getElementById('modal-agro-agenda');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-agro-agenda';
        modal.className = 'agro-agenda-overlay';
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    _activeContainer = modal;
    _activeInline = false;
    renderAgendaContent(modal, false);
    attachAgendaListeners(modal, false);
}

function closeAgendaModal() {
    const modal = document.getElementById('modal-agro-agenda');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function renderAgendaContent(container, isInline) {
    const modal = container || _activeContainer || document.getElementById('modal-agro-agenda');
    if (!modal) return;
    const inlineLayout = isInline != null ? isInline === true : _activeInline;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weather = getWeatherFromDOM();
    const todayPhase = getPhaseInfo(getMoonPhase(today));
    const moonRec = MOON_RECOMMENDATIONS[todayPhase.key] || '';

    const firstDay = new Date(_currentYear, _currentMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(_currentYear, _currentMonth + 1, 0).getDate();

    const itemsByDate = {};
    for (const item of _agendaItems) {
        const d = item.scheduled_date;
        if (!itemsByDate[d]) itemsByDate[d] = [];
        itemsByDate[d].push(item);
    }

    const selectedItems = itemsByDate[_selectedDate] || [];
    const planning = getAgendaPlanningSnapshot(todayStr);
    const planningCropFocus = resolvePlanningCropFocus(planning);
    const todayOpenItems = sortAgendaItems(planning.todayItems);
    const futureOpenItems = planning.pending.filter((item) => String(item?.scheduled_date || '') > todayStr);

    const selDate = new Date(_selectedDate + 'T12:00:00');
    const selMoon = getPhaseInfo(getMoonPhase(selDate));
    const selMoonRec = MOON_RECOMMENDATIONS[selMoon.key] || '';

    const selDay = selDate.getDate();
    const selMonthName = MONTHS_ES[selDate.getMonth()];

    modal.replaceChildren();

    const card = document.createElement('div');
    card.className = inlineLayout ? 'aga-modal aga-inline' : 'aga-modal';

    const header = document.createElement('div');
    header.className = 'aga-header';

    const headerTop = document.createElement('div');
    headerTop.className = 'aga-header-top';

    const headerCopy = document.createElement('div');
    headerCopy.className = 'aga-header-copy';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'aga-eyebrow';
    eyebrow.textContent = 'Mi Carrito / Planificación';

    const title = document.createElement('h3');
    title.className = 'aga-title';
    title.textContent = 'Planificación operativa';

    const subtitle = document.createElement('p');
    subtitle.className = 'aga-subtitle';
    subtitle.textContent = 'Qué toca hoy, próximas actividades y contexto lunar en una lectura de trabajo. El calendario mensual queda como referencia secundaria.';

    const headerRight = document.createElement('div');
    headerRight.className = 'aga-header-right';

    const monthLabel = document.createElement('span');
    monthLabel.className = 'aga-month-label';
    monthLabel.textContent = `${MONTHS_ES[_currentMonth]} ${_currentYear}`;

    if (!inlineLayout) {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'aga-close-btn';
        closeBtn.dataset.action = 'close-agenda';
        const closeIcon = document.createElement('i');
        closeIcon.className = 'fa-solid fa-xmark';
        closeBtn.appendChild(closeIcon);
        headerRight.append(monthLabel, closeBtn);
    } else {
        headerRight.append(monthLabel);
    }
    headerCopy.append(eyebrow, title, subtitle);
    headerTop.append(headerCopy, headerRight);
    header.appendChild(headerTop);

    const weatherBar = document.createElement('div');
    weatherBar.className = 'aga-weather-bar';
    const weatherTemp = document.createElement('span');
    weatherTemp.textContent = weather.temp ? weather.temp : '--';
    const weatherDesc = document.createElement('span');
    weatherDesc.textContent = String(weather.desc || '');
    const weatherHumidity = document.createElement('span');
    weatherHumidity.textContent = String(weather.humidity || '');
    const moonToday = document.createElement('span');
    moonToday.textContent = `${todayPhase.icon} ${todayPhase.name} (${todayPhase.pct}%)`;
    weatherBar.append(weatherTemp, weatherDesc, weatherHumidity, moonToday);
    header.appendChild(weatherBar);

    if (moonRec) {
        const moonRecEl = document.createElement('div');
        moonRecEl.className = 'aga-moon-rec';
        moonRecEl.textContent = moonRec;
        header.appendChild(moonRecEl);
    }

    const contextGrid = document.createElement('div');
    contextGrid.className = 'aga-context-grid';
    contextGrid.append(
        createAgendaMetricCard({
            label: 'Hoy',
            value: planning.todayItems.length,
            copy: planning.todayItems.length === 1 ? 'actividad operativa' : 'actividades operativas',
            tone: 'gold'
        }),
        createAgendaMetricCard({
            label: 'Próximas',
            value: futureOpenItems.length,
            copy: 'pendientes del mes visible'
        }),
        createAgendaMetricCard({
            label: 'Pendientes',
            value: planning.pendingCount,
            copy: planning.overdueItems.length > 0
                ? `${planning.overdueItems.length} con atraso`
                : 'sin atrasos críticos',
            tone: planning.overdueItems.length > 0 ? 'warning' : 'default'
        }),
        createAgendaMetricCard({
            label: 'Contexto',
            value: todayPhase.name,
            copy: planningCropFocus,
            tone: 'context'
        })
    );
    header.appendChild(contextGrid);

    const body = document.createElement('div');
    body.className = 'aga-body';

    const plannerMain = document.createElement('div');
    plannerMain.className = 'aga-planner-main';

    const todaySection = document.createElement('section');
    todaySection.className = 'aga-planner-section aga-planner-section--primary';

    const todayHead = document.createElement('div');
    todayHead.className = 'aga-planner-section__head';

    const todayCopy = document.createElement('div');
    todayCopy.className = 'aga-planner-section__copy';
    const todayLabel = document.createElement('span');
    todayLabel.className = 'aga-planner-section__eyebrow';
    todayLabel.textContent = 'Qué toca hoy';
    const todayTitle = document.createElement('h4');
    todayTitle.className = 'aga-planner-section__title';
    todayTitle.textContent = formatAgendaDateLabel(todayStr);
    const todayMeta = document.createElement('p');
    todayMeta.className = 'aga-planner-section__meta';
    todayMeta.textContent = planning.todayItems.length > 0
        ? `${planning.todayItems.length} actividad${planning.todayItems.length === 1 ? '' : 'es'} programada${planning.todayItems.length === 1 ? '' : 's'} para hoy.`
        : 'No hay tareas cargadas para hoy. Usa esta vista para planificar lo inmediato.';
    todayCopy.append(todayLabel, todayTitle, todayMeta);

    const plannerActions = document.createElement('div');
    plannerActions.className = 'aga-planner-actions';

    const cartLink = document.createElement('button');
    cartLink.type = 'button';
    cartLink.className = 'aga-inline-link';
    cartLink.dataset.action = 'open-cart-view';
    cartLink.textContent = 'Abrir Mi Carrito';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'aga-add-btn';
    addBtn.dataset.action = 'open-create';
    addBtn.textContent = 'Agregar actividad';

    plannerActions.append(cartLink, addBtn);
    todayHead.append(todayCopy, plannerActions);
    todaySection.appendChild(todayHead);
    todaySection.appendChild(createAgendaActivityList(todayOpenItems, {
        emptyCopy: 'Día libre. Si algo debe moverse hoy, agrégalo aquí y úsalo como foco operativo.'
    }));
    plannerMain.appendChild(todaySection);

    const upcomingSection = document.createElement('section');
    upcomingSection.className = 'aga-planner-section';
    const upcomingHead = document.createElement('div');
    upcomingHead.className = 'aga-planner-section__head';
    const upcomingCopy = document.createElement('div');
    upcomingCopy.className = 'aga-planner-section__copy';
    const upcomingLabel = document.createElement('span');
    upcomingLabel.className = 'aga-planner-section__eyebrow';
    upcomingLabel.textContent = 'Próximas actividades';
    const upcomingTitle = document.createElement('h4');
    upcomingTitle.className = 'aga-planner-section__title';
    upcomingTitle.textContent = 'Lo siguiente en la agenda';
    const upcomingMeta = document.createElement('p');
    upcomingMeta.className = 'aga-planner-section__meta';
    upcomingMeta.textContent = futureOpenItems.length > 0
        ? 'Lectura rápida de lo siguiente para no trabajar a ciegas.'
        : 'No hay nuevas actividades programadas más adelante en este mes.';
    upcomingCopy.append(upcomingLabel, upcomingTitle, upcomingMeta);
    upcomingHead.appendChild(upcomingCopy);
    upcomingSection.append(upcomingHead, createAgendaActivityList(planning.upcomingItems, {
        emptyCopy: 'Sin próximas actividades. La agenda del mes está despejada por ahora.',
        showDate: true,
        compact: true,
        listClassName: 'aga-activities-list aga-activities-list--compact'
    }));
    plannerMain.appendChild(upcomingSection);

    const pendingSection = document.createElement('section');
    pendingSection.className = 'aga-planner-section';
    const pendingHead = document.createElement('div');
    pendingHead.className = 'aga-planner-section__head';
    const pendingCopy = document.createElement('div');
    pendingCopy.className = 'aga-planner-section__copy';
    const pendingLabel = document.createElement('span');
    pendingLabel.className = 'aga-planner-section__eyebrow';
    pendingLabel.textContent = planning.overdueItems.length > 0 ? 'Pendientes y atrasos' : 'Pendientes abiertos';
    const pendingTitle = document.createElement('h4');
    pendingTitle.className = 'aga-planner-section__title';
    pendingTitle.textContent = planning.overdueItems.length > 0 ? 'Lo que requiere atención' : 'Panel limpio';
    const pendingMeta = document.createElement('p');
    pendingMeta.className = 'aga-planner-section__meta';
    pendingMeta.textContent = planning.overdueItems.length > 0
        ? 'Estas actividades quedaron por detrás de la fecha y conviene resolverlas primero.'
        : 'No hay atrasos en el periodo visible. Mantén el ritmo desde la planificación.';
    pendingCopy.append(pendingLabel, pendingTitle, pendingMeta);
    pendingHead.appendChild(pendingCopy);
    pendingSection.append(
        pendingHead,
        createAgendaActivityList(planning.overdueItems, {
            emptyCopy: 'Todo al día. No hay actividades vencidas en la agenda visible.',
            emptyVariant: 'success',
            showDate: true,
            compact: true,
            listClassName: 'aga-activities-list aga-activities-list--compact'
        })
    );
    plannerMain.appendChild(pendingSection);

    body.appendChild(plannerMain);

    const calendarDisclosure = document.createElement('details');
    calendarDisclosure.className = 'aga-calendar-disclosure';

    const calendarSummary = document.createElement('summary');
    calendarSummary.className = 'aga-calendar-summary';

    const calendarSummaryCopy = document.createElement('div');
    calendarSummaryCopy.className = 'aga-calendar-summary__copy';
    const calendarSummaryEyebrow = document.createElement('span');
    calendarSummaryEyebrow.className = 'aga-calendar-summary__eyebrow';
    calendarSummaryEyebrow.textContent = 'Calendario mensual';
    const calendarSummaryTitle = document.createElement('strong');
    calendarSummaryTitle.className = 'aga-calendar-summary__title';
    calendarSummaryTitle.textContent = 'Vista secundaria por fecha';
    const calendarSummaryMeta = document.createElement('span');
    calendarSummaryMeta.className = 'aga-calendar-summary__meta';
    calendarSummaryMeta.textContent = `${MONTHS_ES[_currentMonth]} ${_currentYear} · Foco ${formatAgendaDateLabel(_selectedDate)}`;
    calendarSummaryCopy.append(calendarSummaryEyebrow, calendarSummaryTitle, calendarSummaryMeta);

    const calendarSummaryIcon = document.createElement('span');
    calendarSummaryIcon.className = 'aga-calendar-summary__icon';
    calendarSummaryIcon.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';

    calendarSummary.append(calendarSummaryCopy, calendarSummaryIcon);
    calendarDisclosure.appendChild(calendarSummary);

    const calendarShell = document.createElement('div');
    calendarShell.className = 'aga-calendar-shell';

    const calendarSection = document.createElement('div');
    calendarSection.className = 'aga-calendar-section';

    const nav = document.createElement('div');
    nav.className = 'aga-nav';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'aga-nav-btn';
    prevBtn.dataset.action = 'prev-month';
    prevBtn.textContent = '◀';

    const navLabel = document.createElement('span');
    navLabel.className = 'aga-nav-label';
    navLabel.textContent = `${MONTHS_ES[_currentMonth]} ${_currentYear}`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'aga-nav-btn';
    nextBtn.dataset.action = 'next-month';
    nextBtn.textContent = '▶';

    nav.append(prevBtn, navLabel, nextBtn);
    calendarSection.appendChild(nav);

    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'aga-calendar-grid';

    DAYS_SHORT.forEach((dayLabel) => {
        const headerCell = document.createElement('div');
        headerCell.className = 'aga-day-header';
        headerCell.textContent = dayLabel;
        calendarGrid.appendChild(headerCell);
    });

    for (let i = 0; i < offset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'aga-day-cell aga-empty';
        calendarGrid.appendChild(emptyCell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${_currentYear}-${String(_currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === _selectedDate;
        const hasItems = itemsByDate[dateStr] && itemsByDate[dateStr].length > 0;
        const moonInfo = getMoonPhaseForDay(_currentYear, _currentMonth, d);
        const showMoonIcon = moonInfo.icon === '🌑' || moonInfo.icon === '🌓' || moonInfo.icon === '🌕' || moonInfo.icon === '🌗';

        const dayCell = document.createElement('div');
        let cls = 'aga-day-cell';
        if (isToday) cls += ' aga-today';
        if (isSelected) cls += ' aga-selected';
        if (hasItems) cls += ' aga-has-items';
        dayCell.className = cls;
        dayCell.dataset.date = dateStr;

        const dayNum = document.createElement('span');
        dayNum.className = 'aga-day-num';
        dayNum.textContent = String(d);
        dayCell.appendChild(dayNum);

        if (showMoonIcon) {
            const moonIcon = document.createElement('span');
            moonIcon.className = 'aga-moon-icon';
            moonIcon.textContent = moonInfo.icon;
            dayCell.appendChild(moonIcon);
        }

        if (hasItems) {
            const dot = document.createElement('span');
            dot.className = 'aga-dot';
            dayCell.appendChild(dot);
        }

        calendarGrid.appendChild(dayCell);
    }

    calendarSection.appendChild(calendarGrid);
    calendarShell.appendChild(calendarSection);

    const dayDetail = document.createElement('div');
    dayDetail.className = 'aga-day-detail';

    const dayDetailHeader = document.createElement('div');
    dayDetailHeader.className = 'aga-day-detail-header';
    const dayCopy = document.createElement('div');
    dayCopy.className = 'aga-day-detail-copy';
    const dayEyebrow = document.createElement('span');
    dayEyebrow.className = 'aga-planner-section__eyebrow';
    dayEyebrow.textContent = 'Fecha en foco';
    const dayTitle = document.createElement('h4');
    dayTitle.className = 'aga-day-title';
    dayTitle.textContent = `${selDay} ${selMonthName}`;
    dayCopy.append(dayEyebrow, dayTitle);
    const dayMoon = document.createElement('span');
    dayMoon.className = 'aga-day-moon';
    dayMoon.textContent = `${selMoon.icon} ${selMoon.name}`;
    dayDetailHeader.append(dayCopy, dayMoon);
    dayDetail.appendChild(dayDetailHeader);

    if (selMoonRec) {
        const dayMoonRec = document.createElement('div');
        dayMoonRec.className = 'aga-day-moon-rec';
        dayMoonRec.textContent = selMoonRec;
        dayDetail.appendChild(dayMoonRec);
    }

    dayDetail.appendChild(createAgendaActivityList(sortAgendaItems(selectedItems), {
        emptyCopy: 'Sin actividades en esta fecha. Selecciona otro día o usa el botón principal para programar.',
        listClassName: 'aga-activities-list aga-activities-list--compact'
    }));
    calendarShell.appendChild(dayDetail);

    calendarDisclosure.appendChild(calendarShell);
    body.appendChild(calendarDisclosure);

    card.append(header, body);
    modal.appendChild(card);
}

// ============================================================
// RENDER: CREATE MODAL
// ============================================================

function openCreateModal() {
    if (document.getElementById('aga-create-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'aga-create-overlay';
    overlay.className = 'aga-create-overlay';
    const modal = document.createElement('div');
    modal.className = 'aga-create-modal';

    const title = document.createElement('h3');
    title.className = 'aga-create-title';
    title.textContent = '+ Nueva Actividad';
    modal.appendChild(title);

    const typeLabel = document.createElement('label');
    typeLabel.className = 'aga-label';
    typeLabel.textContent = '¿Qué vas a hacer?';
    modal.appendChild(typeLabel);

    const typeGrid = document.createElement('div');
    typeGrid.className = 'aga-type-grid';
    typeGrid.id = 'aga-type-grid';
    Object.entries(TYPE_CONFIG).forEach(([key, cfg]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'aga-type-pill';
        btn.dataset.type = key;
        btn.textContent = `${cfg.icon} ${cfg.label}`;
        typeGrid.appendChild(btn);
    });
    modal.appendChild(typeGrid);

    const titleLabel = document.createElement('label');
    titleLabel.className = 'aga-label';
    titleLabel.textContent = 'Título';
    modal.appendChild(titleLabel);

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'aga-input';
    titleInput.id = 'aga-create-title';
    titleInput.placeholder = 'Ej: Regar el maíz';
    titleInput.autocomplete = 'off';
    modal.appendChild(titleInput);

    const cropLabel = document.createElement('label');
    cropLabel.className = 'aga-label';
    cropLabel.textContent = 'Cultivo';
    modal.appendChild(cropLabel);

    const cropSelect = document.createElement('select');
    cropSelect.className = 'aga-input';
    cropSelect.id = 'aga-create-crop';
    const generalOpt = document.createElement('option');
    generalOpt.value = '';
    generalOpt.textContent = 'General (sin asociar)';
    cropSelect.appendChild(generalOpt);
    (_cropsCache || []).forEach((crop) => {
        const option = document.createElement('option');
        option.value = String(crop?.id || '');
        const icon = String(crop?.icon || '🌱');
        const name = String(crop?.name || 'Cultivo');
        const variety = String(crop?.variety || '').trim();
        option.textContent = `${icon} ${name}${variety ? ` (${variety})` : ''}`;
        cropSelect.appendChild(option);
    });
    modal.appendChild(cropSelect);

    const dateRow = document.createElement('div');
    dateRow.className = 'aga-create-row';

    const dateWrap = document.createElement('div');
    const dateLabel = document.createElement('label');
    dateLabel.className = 'aga-label';
    dateLabel.textContent = 'Fecha';
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'aga-input';
    dateInput.id = 'aga-create-date';
    dateInput.value = _selectedDate;
    dateWrap.append(dateLabel, dateInput);

    const timeWrap = document.createElement('div');
    const timeLabel = document.createElement('label');
    timeLabel.className = 'aga-label';
    timeLabel.textContent = 'Hora (opcional)';
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'aga-input';
    timeInput.id = 'aga-create-time';
    timeWrap.append(timeLabel, timeInput);

    dateRow.append(dateWrap, timeWrap);
    modal.appendChild(dateRow);

    const notesLabel = document.createElement('label');
    notesLabel.className = 'aga-label';
    notesLabel.textContent = 'Notas (opcional)';
    modal.appendChild(notesLabel);

    const notesInput = document.createElement('input');
    notesInput.type = 'text';
    notesInput.className = 'aga-input';
    notesInput.id = 'aga-create-notes';
    notesInput.placeholder = 'Detalles adicionales...';
    notesInput.autocomplete = 'off';
    modal.appendChild(notesInput);

    const recurLabel = document.createElement('label');
    recurLabel.className = 'aga-label';
    recurLabel.textContent = 'Repetir';
    modal.appendChild(recurLabel);

    const recurGrid = document.createElement('div');
    recurGrid.className = 'aga-recur-grid';
    recurGrid.id = 'aga-recur-grid';
    const recurOptions = [
        { value: '', label: 'No', active: true },
        { value: 'diario', label: 'Diario' },
        { value: 'semanal', label: 'Semanal' },
        { value: 'quincenal', label: 'Quincenal' },
        { value: 'mensual', label: 'Mensual' }
    ];
    recurOptions.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `aga-recur-pill${opt.active ? ' is-active' : ''}`;
        btn.dataset.recur = opt.value;
        btn.textContent = opt.label;
        recurGrid.appendChild(btn);
    });
    modal.appendChild(recurGrid);

    const actions = document.createElement('div');
    actions.className = 'aga-create-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'aga-btn-secondary';
    cancelBtn.dataset.action = 'cancel-create';
    cancelBtn.textContent = 'Cancelar';
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'aga-btn-primary';
    confirmBtn.dataset.action = 'confirm-create';
    confirmBtn.textContent = '✅ Programar';
    actions.append(cancelBtn, confirmBtn);
    modal.appendChild(actions);

    overlay.appendChild(modal);

    // State for the create form
    let selectedType = '';
    let selectedRecur = '';

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { overlay.remove(); return; }
        if (e.target.closest('[data-action="cancel-create"]')) { overlay.remove(); return; }

        // Type selection
        const typePill = e.target.closest('.aga-type-pill');
        if (typePill) {
            overlay.querySelectorAll('.aga-type-pill').forEach(b => b.classList.remove('is-active'));
            typePill.classList.add('is-active');
            selectedType = typePill.dataset.type;
            // Auto-fill title if empty
            const titleInput = document.getElementById('aga-create-title');
            if (titleInput && !titleInput.value.trim()) {
                titleInput.value = TYPE_CONFIG[selectedType]?.label || '';
            }
            return;
        }

        // Recurrence selection
        const recurPill = e.target.closest('.aga-recur-pill');
        if (recurPill) {
            overlay.querySelectorAll('.aga-recur-pill').forEach(b => b.classList.remove('is-active'));
            recurPill.classList.add('is-active');
            selectedRecur = recurPill.dataset.recur;
            return;
        }

        // Confirm create
        if (e.target.closest('[data-action="confirm-create"]')) {
            const title = document.getElementById('aga-create-title')?.value?.trim();
            const cropId = document.getElementById('aga-create-crop')?.value || null;
            const date = document.getElementById('aga-create-date')?.value;
            const time = document.getElementById('aga-create-time')?.value || null;
            const notes = document.getElementById('aga-create-notes')?.value?.trim() || null;

            if (!selectedType) { alert('Selecciona un tipo de actividad.'); return; }
            if (!title) { alert('El título es obligatorio.'); return; }
            if (!date) { alert('La fecha es obligatoria.'); return; }

            overlay.remove();
            createAgendaItem({
                title,
                type: selectedType,
                crop_id: cropId,
                scheduled_date: date,
                scheduled_time: time,
                notes,
                recurring: selectedRecur || null
            });
        }
    });

    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('aga-create-title')?.focus(), 100);
}

// ============================================================
// EVENT DELEGATION
// ============================================================

function attachAgendaListeners(container, isInline) {
    if (_listenerAC) _listenerAC.abort();
    _listenerAC = new AbortController();
    const signal = _listenerAC.signal;
    const modal = container;
    const inlineCtx = isInline === true;

    modal.addEventListener('click', async (e) => {
        // Close on overlay click (modal only)
        if (!inlineCtx && e.target === modal) { closeAgendaModal(); return; }

        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) {
            // Day cell click
            const dayCell = e.target.closest('.aga-day-cell:not(.aga-empty)');
            if (dayCell && dayCell.dataset.date) {
                _selectedDate = dayCell.dataset.date;
                renderAgendaContent(modal, inlineCtx);
                attachAgendaListeners(modal, inlineCtx);
            }
            return;
        }

        const action = actionEl.dataset.action;

        if (action === 'close-agenda') { closeAgendaModal(); return; }

        if (action === 'prev-month') {
            _currentMonth--;
            if (_currentMonth < 0) { _currentMonth = 11; _currentYear--; }
            await loadMonthItems(_currentYear, _currentMonth);
            _selectedDate = `${_currentYear}-${String(_currentMonth + 1).padStart(2, '0')}-01`;
            renderAgendaContent(modal, inlineCtx);
            attachAgendaListeners(modal, inlineCtx);
            return;
        }

        if (action === 'next-month') {
            _currentMonth++;
            if (_currentMonth > 11) { _currentMonth = 0; _currentYear++; }
            await loadMonthItems(_currentYear, _currentMonth);
            _selectedDate = `${_currentYear}-${String(_currentMonth + 1).padStart(2, '0')}-01`;
            renderAgendaContent(modal, inlineCtx);
            attachAgendaListeners(modal, inlineCtx);
            return;
        }

        if (action === 'open-create') { openCreateModal(); return; }

        if (action === 'open-cart-view') {
            window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
                detail: { view: 'carrito', scroll: true }
            }));
            if (!inlineCtx) closeAgendaModal();
            return;
        }

        if (action === 'toggle-complete') {
            const itemId = actionEl.dataset.itemId;
            if (itemId) await toggleAgendaComplete(itemId);
            attachAgendaListeners(modal, inlineCtx);
            return;
        }

        if (action === 'delete-item') {
            const itemId = actionEl.dataset.itemId;
            if (itemId) await deleteAgendaItem(itemId);
            attachAgendaListeners(modal, inlineCtx);
            return;
        }
    }, { signal });
}

// ============================================================
// HELPERS
// ============================================================

function getCropName(cropId) {
    if (!cropId) return 'General';
    const crop = (_cropsCache || []).find(c => String(c.id) === String(cropId));
    return crop ? getCropDisplayLabel(crop) : 'Cultivo';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
}

// ============================================================
// STYLES (DNA Visual V9.4: negro puro + dorado + alto contraste)
// ============================================================

function injectAgendaStyles() {
    if (document.getElementById('agro-agenda-styles')) return;
    const style = document.createElement('style');
    style.id = 'agro-agenda-styles';
    style.textContent = `
        .agro-agenda-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.92);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px;
            animation: agaFadeIn 0.2s ease;
        }
        .agro-agenda-overlay.hidden { display: none; }
        @keyframes agaFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .aga-modal {
            background: var(--v10-bg-2, #0B0C0F);
            border: 1px solid var(--v10-border-gold, rgba(200,167,82,0.25));
            border-radius: var(--radius-xl, 24px);
            width: 100%;
            max-width: 680px;
            max-height: 92vh;
            overflow-y: auto;
            box-shadow: var(--v10-shadow-gold-lg, 0 10px 40px rgba(200,167,82,0.35));
        }

        /* Header */
        .aga-header {
            padding: 16px 20px 12px;
            border-bottom: 1px solid var(--v10-border-gold, rgba(200,167,82,0.25));
            background: linear-gradient(180deg, rgba(200,167,82,0.05) 0%, transparent 100%);
        }
        .aga-header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .aga-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.1rem;
            font-weight: 700;
            color: #fff;
            margin: 0;
            letter-spacing: 0.5px;
        }
        .aga-header-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .aga-month-label {
            font-family: 'Orbitron', sans-serif;
            font-size: 0.7rem;
            color: var(--v10-gold-4, #C8A752);
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .aga-close-btn {
            width: 32px; height: 32px;
            border-radius: 50%;
            background: rgba(200,167,82,0.1);
            border: 1px solid var(--v10-border-gold, rgba(200,167,82,0.25));
            color: var(--v10-gold-4, #C8A752);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            transition: all 0.15s;
        }
        .aga-close-btn:hover {
            background: rgba(200,167,82,0.25);
            border-color: var(--v10-gold-4, #C8A752);
        }

        /* Weather bar */
        .aga-weather-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 0.8rem;
            color: rgba(255,255,255,0.7);
            padding: 8px 0 4px;
        }
        .aga-weather-bar span {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .aga-moon-rec {
            font-size: 0.75rem;
            color: var(--v10-gold-4, #C8A752);
            padding: 6px 10px;
            background: rgba(200,167,82,0.08);
            border-radius: var(--radius-sm, 8px);
            margin-top: 6px;
        }

        /* Body layout */
        .aga-body {
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        @media (min-width: 600px) {
            .aga-body {
                flex-direction: row;
            }
            .aga-calendar-section {
                flex: 1;
                border-right: 1px solid var(--v10-border-neutral, rgba(255,255,255,0.08));
            }
            .aga-day-detail {
                width: 260px;
                flex-shrink: 0;
            }
        }

        /* Calendar nav */
        .aga-nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px 8px;
        }
        .aga-nav-btn {
            width: 36px; height: 36px;
            border-radius: 50%;
            border: 1px solid var(--v10-border-gold, rgba(200,167,82,0.25));
            background: transparent;
            color: var(--v10-gold-4, #C8A752);
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.15s;
        }
        .aga-nav-btn:hover {
            background: rgba(200,167,82,0.15);
        }
        .aga-nav-label {
            font-family: 'Orbitron', sans-serif;
            font-size: 0.85rem;
            color: #fff;
            font-weight: 700;
        }

        /* Calendar grid */
        .aga-calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
            padding: 8px 12px 16px;
        }
        .aga-day-header {
            text-align: center;
            font-size: 0.65rem;
            font-weight: 700;
            color: rgba(200,167,82,0.6);
            text-transform: uppercase;
            padding: 4px 0;
            letter-spacing: 0.5px;
        }
        .aga-day-cell {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 44px;
            min-width: 44px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.12s;
            gap: 1px;
        }
        .aga-day-cell.aga-empty {
            cursor: default;
        }
        .aga-day-cell:not(.aga-empty):hover {
            background: rgba(200,167,82,0.1);
        }
        .aga-day-num {
            font-family: 'Rajdhani', sans-serif;
            font-size: 0.9rem;
            font-weight: 600;
            color: rgba(255,255,255,0.85);
            line-height: 1;
        }
        .aga-moon-icon {
            font-size: 0.55rem;
            line-height: 1;
            opacity: 0.6;
        }
        .aga-dot {
            width: 5px; height: 5px;
            border-radius: 50%;
            background: var(--v10-gold-4, #C8A752);
            position: absolute;
            bottom: 3px;
        }

        /* Today */
        .aga-day-cell.aga-today {
            background: var(--v10-metallic-btn, linear-gradient(135deg, #6b5a3e, #C8A752, #E8D48B, #C8A752, #6b5a3e));
            box-shadow: var(--v10-shadow-gold-sm, 0 2px 10px rgba(200,167,82,0.15));
        }
        .aga-day-cell.aga-today .aga-day-num {
            color: var(--v10-bg-1, #0a0a0a);
            font-weight: 800;
        }
        .aga-day-cell.aga-today .aga-moon-icon { opacity: 0.8; }
        .aga-day-cell.aga-today .aga-dot { background: var(--v10-bg-1, #0a0a0a); }

        /* Selected */
        .aga-day-cell.aga-selected:not(.aga-today) {
            background: rgba(200,167,82,0.2);
            border: 1px solid rgba(200,167,82,0.5);
        }

        /* Day detail panel */
        .aga-day-detail {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .aga-day-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .aga-day-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            color: #fff;
            margin: 0;
        }
        .aga-day-moon {
            font-size: 0.7rem;
            color: rgba(255,255,255,0.5);
        }
        .aga-day-moon-rec {
            font-size: 0.7rem;
            color: rgba(200,167,82,0.7);
            padding: 4px 8px;
            background: rgba(200,167,82,0.06);
            border-radius: 6px;
        }

        /* Activities list */
        .aga-activities-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-height: 280px;
            overflow-y: auto;
        }
        .aga-empty-day {
            text-align: center;
            color: rgba(255,255,255,0.3);
            font-size: 0.85rem;
            padding: 24px 8px;
        }

        .aga-activity {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 10px;
            transition: all 0.12s;
        }
        .aga-activity.aga-completed {
            opacity: 0.5;
        }
        .aga-activity.aga-completed .aga-activity-title {
            text-decoration: line-through;
        }
        .aga-check {
            width: 36px; height: 36px;
            border: none;
            background: transparent;
            color: var(--v10-gold-4, #C8A752);
            font-size: 1.2rem;
            cursor: pointer;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.12s;
        }
        .aga-check:hover { transform: scale(1.15); }
        .aga-activity-info { flex: 1; min-width: 0; }
        .aga-activity-title {
            font-size: 0.82rem;
            font-weight: 600;
            color: #fff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .aga-activity-meta {
            display: flex;
            gap: 8px;
            font-size: 0.7rem;
            color: rgba(255,255,255,0.4);
        }
        .aga-delete-btn {
            width: 28px; height: 28px;
            border-radius: 50%;
            border: 1px solid rgba(239,68,68,0.3);
            background: transparent;
            color: #ef4444;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.6rem;
            transition: all 0.12s;
            flex-shrink: 0;
        }
        .aga-delete-btn:hover { background: rgba(239,68,68,0.12); }

        /* Add button */
        .aga-add-btn {
            width: 100%;
            padding: 10px;
            border-radius: 10px;
            border: 1px dashed var(--v10-border-gold, rgba(200,167,82,0.25));
            background: transparent;
            color: var(--v10-gold-4, #C8A752);
            font-size: 0.82rem;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.15s;
        }
        .aga-add-btn:hover {
            background: rgba(200,167,82,0.08);
            border-color: var(--v10-gold-4, #C8A752);
        }

        /* Create overlay */
        .aga-create-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.88);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 10002;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            animation: agaFadeIn 0.15s ease;
        }
        .aga-create-modal {
            background: var(--v10-bg-2, #0B0C0F);
            border: 1px solid var(--v10-border-gold, rgba(200,167,82,0.25));
            border-radius: var(--radius-xl, 24px);
            padding: 20px;
            width: 100%;
            max-width: 420px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .aga-create-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 0.95rem;
            color: #fff;
            margin: 0 0 16px;
        }
        .aga-label {
            display: block;
            font-size: 0.72rem;
            color: rgba(255,255,255,0.5);
            margin-bottom: 4px;
            margin-top: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .aga-input {
            width: 100%;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 8px;
            padding: 10px 12px;
            color: #fff;
            font-size: 0.85rem;
            font-family: inherit;
            box-sizing: border-box;
            transition: border-color 0.15s;
        }
        .aga-input:focus {
            outline: none;
            border-color: rgba(200,167,82,0.5);
        }
        .aga-input option { background: #1a1a1a; color: #fff; }

        /* Type pills */
        .aga-type-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 4px;
        }
        .aga-type-pill {
            padding: 8px 12px;
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,0.12);
            background: transparent;
            color: rgba(255,255,255,0.6);
            font-size: 0.75rem;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.12s;
            min-height: 44px;
        }
        .aga-type-pill:hover {
            border-color: var(--v10-border-gold, rgba(200,167,82,0.25));
            color: var(--v10-gold-4, #C8A752);
        }
        .aga-type-pill.is-active {
            background: rgba(200,167,82,0.15);
            border-color: var(--v10-gold-4, #C8A752);
            color: var(--v10-gold-4, #C8A752);
            font-weight: 600;
        }

        /* Recurrence pills */
        .aga-recur-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .aga-recur-pill {
            padding: 6px 12px;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.12);
            background: transparent;
            color: rgba(255,255,255,0.5);
            font-size: 0.72rem;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.12s;
            min-height: 36px;
        }
        .aga-recur-pill.is-active {
            background: rgba(200,167,82,0.12);
            border-color: var(--v10-gold-4, #C8A752);
            color: var(--v10-gold-4, #C8A752);
        }

        /* Create row */
        .aga-create-row {
            display: flex;
            gap: 10px;
        }
        .aga-create-row > div { flex: 1; }

        /* Actions */
        .aga-create-actions {
            display: flex;
            gap: 8px;
            margin-top: 16px;
        }
        .aga-btn-primary {
            flex: 1;
            padding: 10px 16px;
            border-radius: 10px;
            border: none;
            background: var(--v10-metallic-btn, linear-gradient(135deg, #6b5a3e, #C8A752, #E8D48B, #C8A752, #6b5a3e));
            color: var(--v10-bg-1, #0a0a0a);
            font-weight: 700;
            font-size: 0.85rem;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.12s;
        }
        .aga-btn-primary:hover { filter: brightness(1.1); }
        .aga-btn-secondary {
            flex: 1;
            padding: 10px 16px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.15);
            background: transparent;
            color: rgba(255,255,255,0.7);
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
            font-family: inherit;
        }

        /* Inline layout (dedicated view region) */
        .aga-inline {
            max-width: 100%;
            max-height: none;
            border: none;
            border-radius: 0;
            box-shadow: none;
            background: transparent;
        }
        .aga-inline .aga-header {
            padding: 1.2rem 0.5rem 1rem;
            border-bottom: 1px solid rgba(200,167,82,0.12);
            border-radius: 18px 18px 0 0;
            background:
                linear-gradient(180deg, rgba(200,167,82,0.06) 0%, transparent 100%),
                rgba(8,8,8,0.92);
            border: 1px solid rgba(200,167,82,0.15);
            border-bottom: none;
        }
        .aga-inline .aga-title {
            font-size: 1.2rem;
        }
        .aga-inline .aga-month-label {
            font-size: 0.8rem;
        }
        .aga-inline .aga-body {
            border: 1px solid rgba(200,167,82,0.12);
            border-top: none;
            border-radius: 0 0 18px 18px;
            background: rgba(8,8,8,0.92);
            min-height: 400px;
        }
        @media (min-width: 700px) {
            .aga-inline .aga-body {
                flex-direction: row;
            }
            .aga-inline .aga-calendar-section {
                flex: 1.3;
            }
            .aga-inline .aga-day-detail {
                width: 320px;
                flex-shrink: 0;
            }
        }
        .aga-inline .aga-day-cell {
            min-height: 52px;
            min-width: 52px;
        }
        .aga-inline .aga-day-num {
            font-size: 1rem;
        }
        .aga-inline .aga-nav-label {
            font-size: 1rem;
        }
        .aga-inline .aga-day-detail {
            padding: 20px;
        }
        .aga-inline .aga-day-title {
            font-size: 1rem;
        }
        .aga-inline .aga-activities-list {
            max-height: 400px;
        }

        .agro-agenda-inline-root {
            margin-top: 2rem;
        }

        /* Mobile responsive */
        .aga-header-copy {
            display: flex;
            flex-direction: column;
            gap: var(--space-1, 0.25rem);
            min-width: 0;
        }
        .aga-eyebrow,
        .aga-planner-section__eyebrow,
        .aga-calendar-summary__eyebrow {
            margin: 0;
            font-family: 'Orbitron', sans-serif;
            font-size: var(--text-xs, 0.7rem);
            font-weight: 700;
            line-height: 1.2;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--gold-4, #C8A752);
        }
        .aga-subtitle,
        .aga-planner-section__meta,
        .aga-calendar-summary__meta {
            margin: 0;
            font-family: 'Rajdhani', sans-serif;
            font-size: var(--text-sm, 0.8rem);
            line-height: 1.45;
            color: var(--text-secondary, #cccccc);
        }
        .aga-title {
            font-size: clamp(1.18rem, 2vw, 1.5rem);
            letter-spacing: 0.04em;
        }
        .aga-inline .aga-title {
            font-size: clamp(1.3rem, 2.4vw, 1.7rem);
        }
        .aga-weather-bar {
            gap: var(--space-3, 0.75rem);
            color: var(--text-muted, #94A3B8);
        }
        .aga-weather-bar span {
            padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
            border-radius: var(--radius-pill, 9999px);
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .aga-moon-rec {
            margin-top: var(--space-3, 0.75rem);
            padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
            border-radius: var(--radius-md, 12px);
            border: 1px solid var(--border-gold, rgba(200,167,82,0.25));
            background: linear-gradient(135deg, rgba(200,167,82,0.1), rgba(200,167,82,0.03));
            color: var(--gold-5, #E8D48B);
        }
        .aga-context-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: var(--space-3, 0.75rem);
            margin-top: var(--space-4, 1rem);
        }
        .aga-metric-card {
            display: flex;
            flex-direction: column;
            gap: var(--space-1, 0.25rem);
            min-height: 96px;
            padding: var(--space-4, 1rem);
            border-radius: var(--radius-md, 12px);
            border: 1px solid var(--border-neutral, rgba(255,255,255,0.08));
            background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015));
        }
        .aga-metric-card--gold {
            border-color: var(--border-gold, rgba(200,167,82,0.25));
            box-shadow: 0 8px 20px rgba(200,167,82,0.08);
        }
        .aga-metric-card--warning {
            border-color: rgba(245,158,11,0.35);
            background: linear-gradient(180deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03));
        }
        .aga-metric-card--context {
            border-color: rgba(229,213,160,0.18);
        }
        .aga-metric-card__label {
            font-family: 'Orbitron', sans-serif;
            font-size: var(--text-xs, 0.7rem);
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--text-muted, #94A3B8);
        }
        .aga-metric-card__value {
            font-family: 'Orbitron', sans-serif;
            font-size: var(--text-xl, 1.3rem);
            font-weight: 700;
            color: var(--text-primary, #ffffff);
            line-height: 1.15;
        }
        .aga-metric-card--gold .aga-metric-card__value,
        .aga-metric-card--context .aga-metric-card__value {
            color: var(--gold-4, #C8A752);
        }
        .aga-metric-card--warning .aga-metric-card__value {
            color: var(--color-warning, #F59E0B);
        }
        .aga-metric-card__copy {
            font-size: var(--text-sm, 0.8rem);
            color: var(--text-secondary, #cccccc);
        }
        .aga-body {
            gap: var(--space-5, 1.25rem);
            padding: var(--space-5, 1.25rem);
        }
        .aga-inline .aga-body {
            min-height: auto;
            padding: var(--space-6, 1.5rem);
            gap: var(--space-6, 1.5rem);
        }
        .aga-planner-main {
            display: flex;
            flex-direction: column;
            gap: var(--space-4, 1rem);
            min-width: 0;
        }
        .aga-planner-section,
        .aga-calendar-disclosure {
            border-radius: var(--radius-lg, 16px);
            border: 1px solid var(--border-neutral, rgba(255,255,255,0.08));
            background:
                linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)),
                var(--bg-3, #111113);
            overflow: hidden;
        }
        .aga-planner-section--primary {
            border-color: var(--border-gold, rgba(200,167,82,0.25));
            background:
                linear-gradient(180deg, rgba(200,167,82,0.08), rgba(200,167,82,0.02)),
                var(--bg-3, #111113);
            box-shadow: var(--shadow-gold-xs, 0 1px 6px rgba(200,167,82,0.1));
        }
        .aga-planner-section__head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: var(--space-4, 1rem);
            padding: var(--space-5, 1.25rem) var(--space-5, 1.25rem) 0;
        }
        .aga-planner-section__copy {
            display: flex;
            flex-direction: column;
            gap: var(--space-1, 0.25rem);
            min-width: 0;
        }
        .aga-planner-section__title {
            margin: 0;
            font-family: 'Orbitron', sans-serif;
            font-size: clamp(0.95rem, 1.6vw, 1.12rem);
            line-height: 1.25;
            color: var(--text-primary, #ffffff);
            letter-spacing: 0.02em;
        }
        .aga-planner-actions {
            display: inline-flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: var(--space-2, 0.5rem);
            flex-shrink: 0;
        }
        .aga-inline-link,
        .aga-planner-actions .aga-add-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: var(--a11y-touch-min, 44px);
            padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
            border-radius: var(--radius-sm, 8px);
            font-family: 'Rajdhani', sans-serif;
            font-size: var(--text-sm, 0.8rem);
            font-weight: 700;
            transition: transform 180ms ease, border-color 180ms ease, background-color 180ms ease, color 180ms ease, box-shadow 180ms ease;
        }
        .aga-inline-link {
            border: 1px solid var(--border-gold, rgba(200,167,82,0.25));
            background: transparent;
            color: var(--gold-4, #C8A752);
            cursor: pointer;
        }
        .aga-inline-link:hover,
        .aga-inline-link:focus-visible {
            background: var(--state-hover-overlay, rgba(200,167,82,0.08));
            color: var(--gold-5, #E8D48B);
            box-shadow: var(--a11y-focus-ring, 0 0 0 2px var(--bg-1, #0a0a0a), 0 0 0 4px var(--gold-4, #C8A752));
            outline: none;
        }
        .aga-inline-link:active {
            transform: scale(0.98);
        }
        .aga-planner-actions .aga-add-btn {
            width: auto;
            border-style: solid;
            background: rgba(200,167,82,0.08);
        }
        .aga-planner-actions .aga-add-btn:hover,
        .aga-add-btn:focus-visible {
            box-shadow: var(--a11y-focus-ring, 0 0 0 2px var(--bg-1, #0a0a0a), 0 0 0 4px var(--gold-4, #C8A752));
            outline: none;
        }
        .aga-activities-list {
            gap: var(--space-3, 0.75rem);
            padding: var(--space-4, 1rem) var(--space-5, 1.25rem) var(--space-5, 1.25rem);
            max-height: none;
            overflow: visible;
        }
        .aga-activities-list--compact {
            gap: var(--space-2, 0.5rem);
        }
        .aga-activity {
            align-items: flex-start;
            gap: var(--space-3, 0.75rem);
            padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
            border-radius: var(--radius-md, 12px);
            border-color: rgba(255,255,255,0.05);
            background: rgba(255,255,255,0.025);
        }
        .aga-activity:hover {
            border-color: var(--border-gold, rgba(200,167,82,0.25));
            transform: translateY(-1px);
        }
        .aga-activity--compact {
            padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
        }
        .aga-activity--compact .aga-check {
            width: 32px;
            height: 32px;
            font-size: 1rem;
        }
        .aga-activity-title {
            white-space: normal;
            overflow: visible;
            text-overflow: unset;
            line-height: 1.35;
        }
        .aga-activity-meta {
            flex-wrap: wrap;
            gap: var(--space-2, 0.5rem);
            margin-top: var(--space-1, 0.25rem);
            color: var(--text-muted, #94A3B8);
        }
        .aga-state-message {
            padding: var(--space-4, 1rem);
            border-radius: var(--radius-md, 12px);
            border: 1px dashed rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.02);
            color: var(--text-secondary, #cccccc);
            font-size: var(--text-sm, 0.8rem);
            line-height: 1.45;
        }
        .aga-state-message--success {
            border-color: rgba(16,185,129,0.3);
            background: rgba(16,185,129,0.08);
            color: var(--color-success, #10B981);
        }
        .aga-calendar-disclosure {
            align-self: stretch;
        }
        .aga-calendar-disclosure summary {
            list-style: none;
        }
        .aga-calendar-disclosure summary::-webkit-details-marker {
            display: none;
        }
        .aga-calendar-summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--space-4, 1rem);
            padding: var(--space-4, 1rem) var(--space-5, 1.25rem);
            cursor: pointer;
            transition: background-color 180ms ease;
        }
        .aga-calendar-summary:hover {
            background: rgba(255,255,255,0.02);
        }
        .aga-calendar-summary:focus-visible {
            outline: none;
            box-shadow: var(--a11y-focus-ring, 0 0 0 2px var(--bg-1, #0a0a0a), 0 0 0 4px var(--gold-4, #C8A752));
        }
        .aga-calendar-summary__copy {
            display: flex;
            flex-direction: column;
            gap: var(--space-1, 0.25rem);
            min-width: 0;
        }
        .aga-calendar-summary__title {
            font-family: 'Orbitron', sans-serif;
            font-size: var(--text-sm, 0.8rem);
            color: var(--text-primary, #ffffff);
            letter-spacing: 0.03em;
        }
        .aga-calendar-summary__icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--border-gold, rgba(200,167,82,0.25));
            color: var(--gold-4, #C8A752);
            transition: transform 180ms ease;
            flex-shrink: 0;
        }
        .aga-calendar-disclosure[open] .aga-calendar-summary__icon {
            transform: rotate(180deg);
        }
        .aga-calendar-shell {
            display: flex;
            flex-direction: column;
            gap: var(--space-4, 1rem);
            padding: 0 var(--space-5, 1.25rem) var(--space-5, 1.25rem);
        }
        .aga-calendar-section,
        .aga-day-detail {
            border-radius: var(--radius-md, 12px);
            border: 1px solid rgba(255,255,255,0.06);
            background: rgba(5,5,5,0.45);
        }
        .aga-day-detail {
            gap: var(--space-3, 0.75rem);
        }
        .aga-day-detail-copy {
            display: flex;
            flex-direction: column;
            gap: var(--space-1, 0.25rem);
            min-width: 0;
        }
        .aga-day-title {
            font-size: 0.95rem;
        }
        .aga-day-moon {
            color: var(--gold-5, #E8D48B);
        }
        .aga-day-moon-rec {
            border: 1px solid rgba(200,167,82,0.18);
            background: rgba(200,167,82,0.04);
            color: var(--text-secondary, #cccccc);
        }
        @media (min-width: 820px) {
            .aga-calendar-shell {
                display: grid;
                grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
                align-items: start;
            }
        }
        @media (max-width: 700px) {
            .aga-header-top,
            .aga-planner-section__head {
                flex-direction: column;
                align-items: stretch;
            }
            .aga-header-right,
            .aga-planner-actions {
                justify-content: flex-start;
            }
            .aga-inline-link,
            .aga-planner-actions .aga-add-btn {
                width: 100%;
                justify-content: center;
            }
        }
        @media (max-width: 599px) {
            .aga-modal:not(.aga-inline) { max-height: 95vh; border-radius: 12px; }
            .aga-body,
            .aga-inline .aga-body {
                padding: var(--space-4, 1rem);
                gap: var(--space-4, 1rem);
            }
            .aga-context-grid {
                grid-template-columns: 1fr 1fr;
            }
            .aga-day-cell { min-height: 40px; min-width: 40px; }
            .aga-day-num { font-size: 0.8rem; }
            .aga-calendar-summary,
            .aga-calendar-shell,
            .aga-activities-list,
            .aga-planner-section__head {
                padding-left: var(--space-4, 1rem);
                padding-right: var(--space-4, 1rem);
            }
            .aga-calendar-shell {
                padding-bottom: var(--space-4, 1rem);
            }
            .aga-day-detail { border-top: 1px solid rgba(200,167,82,0.1); }
        }
        @media (max-width: 420px) {
            .aga-context-grid {
                grid-template-columns: 1fr;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            .aga-activity,
            .aga-inline-link,
            .aga-planner-actions .aga-add-btn,
            .aga-calendar-summary,
            .aga-calendar-summary__icon {
                transition: none !important;
            }
            .aga-activity:hover,
            .aga-inline-link:active,
            .aga-calendar-disclosure[open] .aga-calendar-summary__icon {
                transform: none !important;
            }
        }
    `;
    document.head.appendChild(style);
}
