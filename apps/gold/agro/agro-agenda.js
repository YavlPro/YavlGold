/**
 * YavlGold V9.8 — Agro Agenda (Centro de Agenda Agrícola)
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
    riego:       { icon: '💧', label: 'Riego' },
    abono:       { icon: '🧪', label: 'Abono' },
    fumigacion:  { icon: '🌿', label: 'Fumigación' },
    poda:        { icon: '✂️', label: 'Poda' },
    siembra:     { icon: '🌱', label: 'Siembra' },
    cosecha:     { icon: '🌾', label: 'Cosecha' },
    compra:      { icon: '🛒', label: 'Compra' },
    observacion: { icon: '👁️', label: 'Observación' },
    otro:        { icon: '📝', label: 'Otro' }
};

const MOON_RECOMMENDATIONS = {
    nueva:     '🌑 Luna nueva: buen día para raíces y tubérculos',
    creciente: '🌓 Luna creciente: buen momento para sembrar',
    llena:     '🌕 Luna llena: evitar siembra, bueno para cosecha',
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

// ============================================================
// INIT
// ============================================================

/**
 * @param {object} deps - { supabase, cropsCache }
 */
export async function initAgroAgenda(deps) {
    if (_initialized) {
        openAgendaModal();
        return;
    }
    _supabase = deps.supabase;
    _cropsCache = deps.cropsCache || [];
    _initialized = true;

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

// ============================================================
// RENDER: MODAL
// ============================================================

function openAgendaModal() {
    let modal = document.getElementById('modal-agro-agenda');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-agro-agenda';
        modal.className = 'agro-agenda-overlay';
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    renderAgendaContent();
    attachAgendaListeners(modal);
}

function closeAgendaModal() {
    const modal = document.getElementById('modal-agro-agenda');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function renderAgendaContent() {
    const modal = document.getElementById('modal-agro-agenda');
    if (!modal) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weather = getWeatherFromDOM();
    const todayPhase = getPhaseInfo(getMoonPhase(today));
    const moonRec = MOON_RECOMMENDATIONS[todayPhase.key] || '';

    // Calendar grid
    const firstDay = new Date(_currentYear, _currentMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(_currentYear, _currentMonth + 1, 0).getDate();

    // Items by date for dot indicators
    const itemsByDate = {};
    for (const item of _agendaItems) {
        const d = item.scheduled_date;
        if (!itemsByDate[d]) itemsByDate[d] = [];
        itemsByDate[d].push(item);
    }

    // Selected day items
    const selectedItems = itemsByDate[_selectedDate] || [];

    // Calendar days HTML
    let daysHtml = DAYS_SHORT.map(d => `<div class="aga-day-header">${d}</div>`).join('');
    for (let i = 0; i < offset; i++) {
        daysHtml += '<div class="aga-day-cell aga-empty"></div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${_currentYear}-${String(_currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === _selectedDate;
        const hasItems = itemsByDate[dateStr] && itemsByDate[dateStr].length > 0;
        const moonInfo = getMoonPhaseForDay(_currentYear, _currentMonth, d);
        const showMoonIcon = moonInfo.icon === '🌑' || moonInfo.icon === '🌓' || moonInfo.icon === '🌕' || moonInfo.icon === '🌗';

        let cls = 'aga-day-cell';
        if (isToday) cls += ' aga-today';
        if (isSelected) cls += ' aga-selected';
        if (hasItems) cls += ' aga-has-items';

        daysHtml += `
            <div class="${cls}" data-date="${dateStr}">
                <span class="aga-day-num">${d}</span>
                ${showMoonIcon ? `<span class="aga-moon-icon">${moonInfo.icon}</span>` : ''}
                ${hasItems ? '<span class="aga-dot"></span>' : ''}
            </div>`;
    }

    // Selected day activities
    let activitiesHtml = '';
    if (selectedItems.length === 0) {
        activitiesHtml = '<div class="aga-empty-day">Día libre 🌤️</div>';
    } else {
        for (const item of selectedItems) {
            const tc = TYPE_CONFIG[item.type] || TYPE_CONFIG.otro;
            const cropName = getCropName(item.crop_id);
            const timeStr = item.scheduled_time ? item.scheduled_time.substring(0, 5) : '';
            activitiesHtml += `
                <div class="aga-activity ${item.completed ? 'aga-completed' : ''}" data-item-id="${item.id}">
                    <button type="button" class="aga-check" data-action="toggle-complete" data-item-id="${item.id}">
                        ${item.completed ? '☑' : '☐'}
                    </button>
                    <div class="aga-activity-info">
                        <div class="aga-activity-title">${tc.icon} ${escapeHtml(item.title)}</div>
                        <div class="aga-activity-meta">
                            ${cropName !== 'General' ? `<span>${cropName}</span>` : ''}
                            ${timeStr ? `<span>🕐 ${timeStr}</span>` : ''}
                        </div>
                    </div>
                    <button type="button" class="aga-delete-btn" data-action="delete-item" data-item-id="${item.id}" title="Eliminar">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>`;
        }
    }

    // Selected date moon info
    const selDate = new Date(_selectedDate + 'T12:00:00');
    const selMoon = getPhaseInfo(getMoonPhase(selDate));
    const selMoonRec = MOON_RECOMMENDATIONS[selMoon.key] || '';

    // Format selected date
    const selDay = selDate.getDate();
    const selMonthName = MONTHS_ES[selDate.getMonth()];

    modal.innerHTML = `
        <div class="aga-modal" onclick="event.stopPropagation()">
            <!-- Header with weather -->
            <div class="aga-header">
                <div class="aga-header-top">
                    <h3 class="aga-title">🌾 Agenda Agrícola</h3>
                    <div class="aga-header-right">
                        <span class="aga-month-label">${MONTHS_ES[_currentMonth]} ${_currentYear}</span>
                        <button type="button" class="aga-close-btn" data-action="close-agenda">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
                <div class="aga-weather-bar">
                    <span>${weather.temp ? weather.temp : '--'}</span>
                    <span>${weather.desc}</span>
                    <span>${weather.humidity}</span>
                    <span>${todayPhase.icon} ${todayPhase.name} (${todayPhase.pct}%)</span>
                </div>
                ${moonRec ? `<div class="aga-moon-rec">${moonRec}</div>` : ''}
            </div>

            <!-- Calendar -->
            <div class="aga-body">
                <div class="aga-calendar-section">
                    <div class="aga-nav">
                        <button type="button" class="aga-nav-btn" data-action="prev-month">◀</button>
                        <span class="aga-nav-label">${MONTHS_ES[_currentMonth]} ${_currentYear}</span>
                        <button type="button" class="aga-nav-btn" data-action="next-month">▶</button>
                    </div>
                    <div class="aga-calendar-grid">
                        ${daysHtml}
                    </div>
                </div>

                <!-- Day detail -->
                <div class="aga-day-detail">
                    <div class="aga-day-detail-header">
                        <h4 class="aga-day-title">${selDay} ${selMonthName}</h4>
                        <span class="aga-day-moon">${selMoon.icon} ${selMoon.name}</span>
                    </div>
                    ${selMoonRec ? `<div class="aga-day-moon-rec">${selMoonRec}</div>` : ''}

                    <div class="aga-activities-list">
                        ${activitiesHtml}
                    </div>

                    <button type="button" class="aga-add-btn" data-action="open-create">
                        + Agregar actividad
                    </button>
                </div>
            </div>
        </div>`;
}

// ============================================================
// RENDER: CREATE MODAL
// ============================================================

function openCreateModal() {
    if (document.getElementById('aga-create-overlay')) return;

    const cropOptions = (_cropsCache || []).map(c =>
        `<option value="${c.id}">${c.icon || '🌱'} ${escapeHtml(c.name || 'Cultivo')}${c.variety ? ' (' + escapeHtml(c.variety) + ')' : ''}</option>`
    ).join('');

    const typeButtons = Object.entries(TYPE_CONFIG).map(([key, cfg]) =>
        `<button type="button" class="aga-type-pill" data-type="${key}">${cfg.icon} ${cfg.label}</button>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.id = 'aga-create-overlay';
    overlay.className = 'aga-create-overlay';
    overlay.innerHTML = `
        <div class="aga-create-modal" onclick="event.stopPropagation()">
            <h3 class="aga-create-title">+ Nueva Actividad</h3>

            <label class="aga-label">¿Qué vas a hacer?</label>
            <div class="aga-type-grid" id="aga-type-grid">
                ${typeButtons}
            </div>

            <label class="aga-label">Título</label>
            <input type="text" class="aga-input" id="aga-create-title" placeholder="Ej: Regar el maíz" autocomplete="off">

            <label class="aga-label">Cultivo</label>
            <select class="aga-input" id="aga-create-crop">
                <option value="">General (sin asociar)</option>
                ${cropOptions}
            </select>

            <div class="aga-create-row">
                <div>
                    <label class="aga-label">Fecha</label>
                    <input type="date" class="aga-input" id="aga-create-date" value="${_selectedDate}">
                </div>
                <div>
                    <label class="aga-label">Hora (opcional)</label>
                    <input type="time" class="aga-input" id="aga-create-time">
                </div>
            </div>

            <label class="aga-label">Notas (opcional)</label>
            <input type="text" class="aga-input" id="aga-create-notes" placeholder="Detalles adicionales..." autocomplete="off">

            <label class="aga-label">Repetir</label>
            <div class="aga-recur-grid" id="aga-recur-grid">
                <button type="button" class="aga-recur-pill is-active" data-recur="">No</button>
                <button type="button" class="aga-recur-pill" data-recur="diario">Diario</button>
                <button type="button" class="aga-recur-pill" data-recur="semanal">Semanal</button>
                <button type="button" class="aga-recur-pill" data-recur="quincenal">Quincenal</button>
                <button type="button" class="aga-recur-pill" data-recur="mensual">Mensual</button>
            </div>

            <div class="aga-create-actions">
                <button type="button" class="aga-btn-secondary" data-action="cancel-create">Cancelar</button>
                <button type="button" class="aga-btn-primary" data-action="confirm-create">✅ Programar</button>
            </div>
        </div>`;

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

function attachAgendaListeners(modal) {
    if (_listenerAC) _listenerAC.abort();
    _listenerAC = new AbortController();
    const signal = _listenerAC.signal;

    modal.addEventListener('click', async (e) => {
        // Close on overlay click
        if (e.target === modal) { closeAgendaModal(); return; }

        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) {
            // Day cell click
            const dayCell = e.target.closest('.aga-day-cell:not(.aga-empty)');
            if (dayCell && dayCell.dataset.date) {
                _selectedDate = dayCell.dataset.date;
                renderAgendaContent();
                attachAgendaListeners(modal);
            }
            return;
        }

        const action = actionEl.dataset.action;

        if (action === 'close-agenda') { closeAgendaModal(); return; }

        if (action === 'prev-month') {
            _currentMonth--;
            if (_currentMonth < 0) { _currentMonth = 11; _currentYear--; }
            await loadMonthItems(_currentYear, _currentMonth);
            // Select first day of new month
            _selectedDate = `${_currentYear}-${String(_currentMonth + 1).padStart(2, '0')}-01`;
            renderAgendaContent();
            attachAgendaListeners(modal);
            return;
        }

        if (action === 'next-month') {
            _currentMonth++;
            if (_currentMonth > 11) { _currentMonth = 0; _currentYear++; }
            await loadMonthItems(_currentYear, _currentMonth);
            _selectedDate = `${_currentYear}-${String(_currentMonth + 1).padStart(2, '0')}-01`;
            renderAgendaContent();
            attachAgendaListeners(modal);
            return;
        }

        if (action === 'open-create') { openCreateModal(); return; }

        if (action === 'toggle-complete') {
            const itemId = actionEl.dataset.itemId;
            if (itemId) await toggleAgendaComplete(itemId);
            attachAgendaListeners(modal);
            return;
        }

        if (action === 'delete-item') {
            const itemId = actionEl.dataset.itemId;
            if (itemId) await deleteAgendaItem(itemId);
            attachAgendaListeners(modal);
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
    return crop ? `${crop.icon || '🌱'} ${crop.name}` : 'Cultivo';
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
            background: #0a0a0a;
            border: 1px solid rgba(200,167,82,0.3);
            border-radius: 16px;
            width: 100%;
            max-width: 680px;
            max-height: 92vh;
            overflow-y: auto;
            box-shadow: 0 20px 80px rgba(0,0,0,0.6), 0 0 40px rgba(200,167,82,0.1);
        }

        /* Header */
        .aga-header {
            padding: 16px 20px 12px;
            border-bottom: 1px solid rgba(200,167,82,0.15);
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
            color: #C8A752;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .aga-close-btn {
            width: 32px; height: 32px;
            border-radius: 50%;
            background: rgba(200,167,82,0.1);
            border: 1px solid rgba(200,167,82,0.3);
            color: #C8A752;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            transition: all 0.15s;
        }
        .aga-close-btn:hover {
            background: rgba(200,167,82,0.25);
            border-color: #C8A752;
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
            color: #C8A752;
            padding: 6px 10px;
            background: rgba(200,167,82,0.08);
            border-radius: 8px;
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
                border-right: 1px solid rgba(200,167,82,0.1);
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
            border: 1px solid rgba(200,167,82,0.3);
            background: transparent;
            color: #C8A752;
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
            background: #C8A752;
            position: absolute;
            bottom: 3px;
        }

        /* Today */
        .aga-day-cell.aga-today {
            background: linear-gradient(135deg, #C8A752, #a08a3a);
            box-shadow: 0 0 12px rgba(200,167,82,0.3);
        }
        .aga-day-cell.aga-today .aga-day-num {
            color: #0a0a0a;
            font-weight: 800;
        }
        .aga-day-cell.aga-today .aga-moon-icon { opacity: 0.8; }
        .aga-day-cell.aga-today .aga-dot { background: #0a0a0a; }

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
            color: #C8A752;
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
            border: 1px dashed rgba(200,167,82,0.4);
            background: transparent;
            color: #C8A752;
            font-size: 0.82rem;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.15s;
        }
        .aga-add-btn:hover {
            background: rgba(200,167,82,0.08);
            border-color: #C8A752;
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
            background: #111;
            border: 1px solid rgba(200,167,82,0.25);
            border-radius: 16px;
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
            border-color: rgba(200,167,82,0.4);
            color: #C8A752;
        }
        .aga-type-pill.is-active {
            background: rgba(200,167,82,0.15);
            border-color: #C8A752;
            color: #C8A752;
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
            border-color: #C8A752;
            color: #C8A752;
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
            background: linear-gradient(135deg, #C8A752, #a08a3a);
            color: #0a0a0a;
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

        /* Mobile responsive */
        @media (max-width: 599px) {
            .aga-modal { max-height: 95vh; border-radius: 12px; }
            .aga-day-cell { min-height: 40px; min-width: 40px; }
            .aga-day-num { font-size: 0.8rem; }
            .aga-day-detail { border-top: 1px solid rgba(200,167,82,0.1); }
        }
    `;
    document.head.appendChild(style);
}
