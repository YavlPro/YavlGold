/**
 * agro-precultivo.js — Pre-cultivos y cadena unidireccional de fases
 * ANEXO 28 S1 (2026-09-18).
 *
 * Responsabilidad:
 * - Guard de escritura assertForwardTransition(from, to): cadena forward-only
 *   D-1 (precultivo→sembrado→creciendo→produccion→finalizado), lost como salida
 *   lateral D-2, finalizado solo desde produccion (B1), nunca salir de
 *   lost/finalizado. Lo invoca window.saveCrop (index.html) antes de escribir.
 * - Conversión convertPreCropToSowed: UN solo update a agro_crops
 *   (status/status_mode/status_override/start_date/seed_kg/expected_harvest_date).
 *   Cero touches a movimientos: el ledger vive por crop_id
 *   (agro-ledger-reader.js) y hereda el ciclo automáticamente.
 * - Mini-modal "Registrar siembra" (3 campos) invocado desde el botón
 *   .btn-sow-crop de las cards pre-cultivo (agrociclos.js buildActions).
 * - syncCropFormForStatus(): muestra/oculta los campos de siembra del modal de
 *   cultivo (index.html) según el estado seleccionado.
 *
 * Contrato de dependencias (§3.3, sin circulares):
 * - Importa supabase-config directamente (patrón de módulos del repo).
 * - Lee el monolito SOLO vía puentes globales: window.__AGRO_CROPS_STATE,
 *   window.loadCrops(). Se expone como window._agroPrecultivo.
 */

import { supabase } from '../assets/js/config/supabase-config.js';

const PRE_CULTIVO = 'precultivo';
const MODAL_ID = 'modal-precultivo-sowing';

// D-1: cadena estrictamente hacia adelante. lost no tiene rango: es salida
// lateral (D-2). 'auto' nunca llega al guard como destino: saveCrop resuelve
// el status efectivo antes de llamarlo.
const CROP_PHASE_RANK = Object.freeze({
    precultivo: 0,
    sembrado: 1,
    creciendo: 2,
    produccion: 3,
    finalizado: 4
});

function normalizeStatusToken(value) {
    const raw = String(value || '').trim().toLowerCase();
    const plain = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return plain || raw;
}

/**
 * Guard unidireccional de fases (D-1/D-2/B1).
 * Devuelve { ok: true } o { ok: false, reason }.
 * Tokens desconocidos (legacy) no se bloquean: el guard protege el vocabulario
 * canónico, no reimprime el historial.
 */
export function assertForwardTransition(fromStatus, toStatus) {
    const from = normalizeStatusToken(fromStatus);
    const to = normalizeStatusToken(toStatus);

    if (!to) return { ok: true };
    if (!from) return { ok: true, note: 'create' };

    const fromKnown = from === 'lost' || Object.prototype.hasOwnProperty.call(CROP_PHASE_RANK, from);
    const toKnown = to === 'lost' || Object.prototype.hasOwnProperty.call(CROP_PHASE_RANK, to);
    if (!fromKnown || !toKnown) return { ok: true, note: 'legacy-token' };

    if (from === to) return { ok: true, note: 'data-correction' };

    // Terminales: nunca se sale de lost ni de finalizado (D-1).
    if (from === 'lost') {
        return { ok: false, reason: 'Un cultivo perdido no vuelve a una fase activa. Registra un nuevo cultivo si vuelves a sembrar.' };
    }
    if (from === 'finalizado') {
        return { ok: false, reason: 'Un cultivo finalizado no cambia de fase. Puedes corregir fechas y datos sin tocar la fase.' };
    }

    // lost: salida lateral desde cualquier fase no terminal (D-2).
    if (to === 'lost') return { ok: true, note: 'lateral-exit' };

    // finalizado: solo desde produccion (B1, adyacencia).
    if (to === 'finalizado' && from !== 'produccion') {
        return { ok: false, reason: 'Un cultivo solo se finaliza desde Producción.' };
    }

    // Cadena: nunca hacia atrás (D-1). precultivo es rango 0: solo se entra
    // en la creación, jamás por edición.
    if (CROP_PHASE_RANK[to] < CROP_PHASE_RANK[from]) {
        if (to === PRE_CULTIVO) {
            return { ok: false, reason: 'La fase no retrocede: un cultivo sembrado no vuelve a ser pre-cultivo.' };
        }
        return { ok: false, reason: 'La fase del cultivo nunca retrocede. Puedes corregir fechas y datos sin cambiar la fase.' };
    }
    return { ok: true, note: 'forward' };
}

function getTodayKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Conversión pre-cultivo → sembrado. UN write a agro_crops.
 * Valida antes de escribir: siembra obligatoria y no futura, cosecha ≥ siembra
 * (mismas reglas vivas del modal de cultivo, index.html saveCrop).
 */
export async function convertPreCropToSowed(cropId, input = {}) {
    const id = String(cropId || '').trim();
    if (!id) throw new Error('Falta el cultivo a convertir.');

    const fechaSiembra = String(input.fechaSiembra || '').trim();
    const seedKgRaw = input.seedKg;
    const cosechaEsperada = String(input.cosechaEsperada || '').trim();

    if (!fechaSiembra) throw new Error('La fecha de siembra es obligatoria.');
    const todayKey = getTodayKey();
    if (fechaSiembra > todayKey) throw new Error('La fecha de siembra no puede ser futura.');
    if (cosechaEsperada && cosechaEsperada < fechaSiembra) {
        throw new Error('La cosecha estimada no puede ser anterior a la siembra.');
    }
    const seedKg = Number.isFinite(Number(seedKgRaw)) && Number(seedKgRaw) > 0
        ? Number(Number(seedKgRaw).toFixed(6))
        : null;

    // Guard contra UI desactualizada: leer el estado real antes de escribir.
    const { data: current, error: fetchError } = await supabase
        .from('agro_crops')
        .select('id, name, status, status_mode, status_override')
        .eq('id', id)
        .maybeSingle();
    if (fetchError) throw fetchError;
    if (!current?.id) throw new Error('No se encontró el pre-cultivo. Refresca e intenta de nuevo.');

    const fromStatus = current.status_override || current.status || '';
    const guard = assertForwardTransition(fromStatus, 'sembrado');
    if (!guard.ok) throw new Error(guard.reason);

    const { data: updated, error: updateError } = await supabase
        .from('agro_crops')
        .update({
            status: 'sembrado',
            status_mode: 'manual',
            status_override: 'sembrado',
            start_date: fechaSiembra,
            seed_kg: seedKg,
            expected_harvest_date: cosechaEsperada || null
        })
        .eq('id', id)
        .select('id, name, status, start_date, seed_kg, expected_harvest_date')
        .maybeSingle();
    if (updateError) throw updateError;
    if (!updated?.id) throw new Error('La conversión no devolvió la fila actualizada.');

    return updated;
}

// ============================================================
// Modal de cultivo (index.html): campos según estado
// ============================================================

function ensurePrecultivoNote() {
    let note = document.getElementById('crop-precultivo-note');
    if (note) return note;
    const statusBlock = document.getElementById('crop-status')?.closest('.input-group');
    if (!statusBlock) return null;
    note = document.createElement('p');
    note.id = 'crop-precultivo-note';
    note.className = 'agro-new-crop-modal__meta';
    note.style.display = 'none';
    note.textContent = 'Al pasar a Sembrado se registran fecha de siembra, semilla y cosecha; el pre-cultivo evoluciona a ciclo de cultivo y su nomenclatura desaparece.';
    statusBlock.parentNode.insertBefore(note, statusBlock.nextSibling);
    return note;
}

function setRowEnabled(row, enabled) {
    if (!row) return;
    row.style.display = enabled ? '' : 'none';
    row.querySelectorAll('input, select').forEach((field) => {
        field.disabled = !enabled;
    });
}

/**
 * Ajusta el modal de cultivo al estado seleccionado:
 * en pre-cultivo se ocultan (y deshabilitan) semilla, siembra y cosecha
 * esperada; la fecha de siembra se normaliza a hoy para que start_date
 * guarde la fecha de registro del plan (D-4).
 */
// S3-b: al desbloquear pre→Sembrado en edición, la fecha de registro del plan
// NO es la siembra real — se limpia para forzar entrada consciente (required
// vivo de saveCrop). Si el usuario vuelve a pre-cultivo, se restaura la fecha
// guardada del cultivo desde el estado runtime.
let lastSyncPreState = null;

export function syncCropFormForStatus() {
    const statusSelect = document.getElementById('crop-status');
    if (!statusSelect) return;
    const status = normalizeStatusToken(statusSelect.value);
    const isPre = status === PRE_CULTIVO;
    const isLost = status === 'lost';
    const editId = String(document.getElementById('crop-edit-id')?.value || '').trim();

    const seedRow = document.getElementById('crop-seed-kg')?.closest('.input-row');
    const sowRow = document.getElementById('crop-start-date')?.closest('.input-row');
    setRowEnabled(seedRow, !isPre);
    setRowEnabled(sowRow, !isPre);

    // Matriz de fechas (QA-fix): pre oculta todo el bloque de cierre;
    // activos muestran cosecha real pero no pérdida; perdido muestra todo.
    // Al ocultar, los inputs se deshabilitan (sin required nativo no bloquean
    // el guard) y CONSERVAN su valor guardado: al volver a mostrarse, el valor
    // original reaparece sin inventar fechas.
    const closureFields = document.getElementById('crop-closure-fields');
    const lostGroup = document.getElementById('crop-lost-date')?.closest('.input-group');
    const lostInput = document.getElementById('crop-lost-date');
    const actualHarvestInput = document.getElementById('crop-actual-harvest-date');
    if (closureFields) {
        closureFields.style.display = isPre ? 'none' : '';
        if (lostGroup) lostGroup.style.display = (!isPre && isLost) ? '' : 'none';
    }
    if (actualHarvestInput) actualHarvestInput.disabled = isPre;
    if (lostInput) lostInput.disabled = !isLost;
    // En creación no hay valor guardado que preservar: una fecha tipeada y
    // luego oculta sería residual en el payload. En edición se conserva
    // (restauración natural al volver a mostrar la fila).
    if (!editId && actualHarvestInput && isPre) actualHarvestInput.value = '';
    if (!editId && lostInput && !isLost) lostInput.value = '';

    const startInput = document.getElementById('crop-start-date');
    // Solo en creación se normaliza a hoy (fecha de registro del plan, D-4):
    // en edición se conserva la fecha ya guardada.
    if (isPre && startInput && !editId) startInput.value = getTodayKey();
    if (isPre && startInput && editId && !startInput.value) {
        const crops = Array.isArray(window.__AGRO_CROPS_STATE?.crops) ? window.__AGRO_CROPS_STATE.crops : [];
        const cropRow = crops.find((item) => String(item?.id || '').trim() === editId);
        const savedDate = String(cropRow?.start_date || '').slice(0, 10);
        if (savedDate) startInput.value = savedDate;
    }
    const harvestInput = document.getElementById('crop-harvest-date');
    if (isPre && harvestInput) harvestInput.value = '';
    const cropForm = document.getElementById('form-new-crop');
    const initialStatus = normalizeStatusToken(cropForm?.dataset?.initialStatus || '');
    if (!isPre && lastSyncPreState === true && editId && initialStatus === PRE_CULTIVO && startInput) {
        startInput.value = '';
    }
    lastSyncPreState = isPre;

    const note = ensurePrecultivoNote();
    if (note) note.style.display = isPre ? '' : 'none';
}

// ============================================================
// Máquina unidireccional del select de estado (ANEXO 28 S3, D-1/D-1b/B1)
// ============================================================

function ensureStatusMachineNote() {
    let note = document.getElementById('crop-status-machine-note');
    if (note) return note;
    const statusBlock = document.getElementById('crop-status')?.closest('.input-group');
    if (!statusBlock) return null;
    note = document.createElement('p');
    note.id = 'crop-status-machine-note';
    note.className = 'agro-new-crop-modal__meta';
    note.style.display = 'none';
    note.textContent = 'La fase del cultivo solo avanza (Perdido es salida lateral). Fechas y datos se corrigen libremente.';
    statusBlock.parentNode.insertBefore(note, statusBlock.nextSibling);
    return note;
}

// Réplica de computeAutoStatus de window.saveCrop (index.html): el candidato
// 'auto' se evalúa con el mismo guard antes de habilitar la opción.
function computeAutoCandidateStatus() {
    const sowDate = document.getElementById('crop-start-date')?.value || '';
    const harvestDate = document.getElementById('crop-harvest-date')?.value || '';
    if (!sowDate || !harvestDate) return 'creciendo';
    const start = new Date(sowDate);
    const end = new Date(harvestDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'creciendo';
    const totalMs = end.getTime() - start.getTime();
    if (totalMs <= 0) return 'creciendo';
    const now = new Date();
    const elapsedMs = Math.min(Math.max(now.getTime() - start.getTime(), 0), totalMs);
    const percent = Math.round((elapsedMs / totalMs) * 100);
    if (percent >= 100) return 'finalizado';
    if (percent >= 70) return 'produccion';
    if (percent >= 25) return 'creciendo';
    return 'sembrado';
}

/**
 * Habilita/deshabilita las <option> del select de estado según la fase
 * inicial del cultivo en edición. En creación (sin initialStatus) restaura
 * todas las opciones. La opción actualmente seleccionada nunca se bloquea.
 */
export function applyStatusSelectMachine() {
    const form = document.getElementById('form-new-crop');
    const select = document.getElementById('crop-status');
    if (!form || !select) return;
    const initial = normalizeStatusToken(form.dataset?.initialStatus || '');
    const currentValue = normalizeStatusToken(select.value);
    let anyDisabled = false;

    Array.from(select.options).forEach((option) => {
        const value = normalizeStatusToken(option.value);
        if (!initial) {
            option.disabled = false;
            option.title = '';
            return;
        }
        // Fase seleccionada (la vigente) siempre habilitada.
        if (value === initial || value === currentValue) {
            option.disabled = false;
            option.title = '';
            return;
        }
        if (initial === PRE_CULTIVO && value !== 'lost' && value !== 'sembrado') {
            // S3-b: desde pre-cultivo solo adelante (Sembrado, registrando la
            // siembra aquí mismo) o lateral (Perdido). Saltos largos, no.
            option.disabled = true;
            option.title = 'Desde pre-cultivo la fase pasa a Sembrado registrando la siembra (fecha, semilla y cosecha).';
            anyDisabled = true;
            return;
        }
        const candidate = option.value === 'auto'
            ? computeAutoCandidateStatus()
            : option.value;
        const guard = assertForwardTransition(initial, candidate);
        option.disabled = !guard.ok;
        option.title = guard.ok ? '' : (guard.reason || '');
        if (!guard.ok) anyDisabled = true;
    });

    const note = ensureStatusMachineNote();
    if (note) note.style.display = (initial && anyDisabled) ? '' : 'none';
}

/**
 * Punto único de wiring para los openers del modal de cultivo (agro.js):
 * campos según estado (S1) + máquina unidireccional del select (S3).
 */
export function syncCropModal() {
    syncCropFormForStatus();
    applyStatusSelectMachine();
}

// ============================================================
// Mini-modal "Registrar siembra"
// ============================================================

function cropNameFromState(cropId) {
    const id = String(cropId || '').trim();
    const crops = Array.isArray(window.__AGRO_CROPS_STATE?.crops)
        ? window.__AGRO_CROPS_STATE.crops
        : [];
    const crop = crops.find((item) => String(item?.id || '').trim() === id);
    const raw = String(crop?.name || '').trim() || 'el pre-cultivo';
    return raw.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '') || 'el pre-cultivo';
}

function buildSowingModal() {
    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className = 'modal-overlay hidden agro-modal-canon';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'precultivo-sowing-title');
    overlay.innerHTML = `
        <div class="modal-container agro-modal-canon__dialog" style="max-width:420px;">
            <div class="modal-header agro-modal-canon__header">
                <h3 id="precultivo-sowing-title" class="modal-title">Registrar siembra</h3>
                <button type="button" class="modal-close agro-new-crop-modal__close" data-precultivo-sowing-close aria-label="Cerrar">&times;</button>
            </div>
            <form id="precultivo-sowing-form" class="modal-body agro-modal-canon__body" novalidate>
                <p class="agro-new-crop-modal__meta" data-precultivo-sowing-name></p>
                <div class="input-group agro-modal-field-block">
                    <label class="input-label" for="precultivo-sowing-date">Fecha de siembra *</label>
                    <input type="date" id="precultivo-sowing-date" class="styled-input agro-modal-input--compact" required>
                </div>
                <div class="input-row">
                    <div class="input-group">
                        <label class="input-label" for="precultivo-sowing-seed">Semilla usada (kg)</label>
                        <input type="number" id="precultivo-sowing-seed" class="styled-input agro-modal-input--compact" placeholder="Ej: 12.5" step="any" min="0">
                    </div>
                    <div class="input-group">
                        <label class="input-label" for="precultivo-sowing-harvest">Cosecha esperada</label>
                        <input type="date" id="precultivo-sowing-harvest" class="styled-input agro-modal-input--compact">
                    </div>
                </div>
                <p class="agro-new-crop-modal__meta">Al sembrar, el pre-cultivo evoluciona a Sembrado: sus gastos y pérdidas ya pertenecen al ciclo.</p>
                <p id="precultivo-sowing-error" class="agro-new-crop-modal__meta" style="display:none;color:var(--color-error,#c0392b);"></p>
                <div class="modal-footer agro-modal-canon__footer">
                    <button type="button" class="btn-cancel agro-modal-canon__button agro-modal-canon__button--secondary" data-precultivo-sowing-close>Cancelar</button>
                    <button type="submit" class="btn-save agro-modal-canon__button agro-modal-canon__button--primary">Registrar siembra</button>
                </div>
            </form>
        </div>
    `;
    return overlay;
}

function closeSowingModal() {
    const overlay = document.getElementById(MODAL_ID);
    if (overlay) overlay.classList.add('hidden');
}

function showSowingError(message) {
    const node = document.getElementById('precultivo-sowing-error');
    if (!node) return;
    node.textContent = message || 'No se pudo registrar la siembra.';
    node.style.display = '';
}

export function openSowingModal(cropId) {
    const id = String(cropId || '').trim();
    if (!id) return;
    let overlay = document.getElementById(MODAL_ID);
    if (!overlay) {
        overlay = buildSowingModal();
        document.body.appendChild(overlay);
        overlay.querySelector('#precultivo-sowing-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitBtn = overlay.querySelector('button[type="submit"]');
            const cropIdAttr = String(overlay.dataset.cropId || '').trim();
            if (!cropIdAttr) return;
            showSowingError('');
            if (submitBtn) submitBtn.disabled = true;
            try {
                await convertPreCropToSowed(cropIdAttr, {
                    fechaSiembra: document.getElementById('precultivo-sowing-date')?.value || '',
                    seedKg: Number(document.getElementById('precultivo-sowing-seed')?.value),
                    cosechaEsperada: document.getElementById('precultivo-sowing-harvest')?.value || ''
                });
                closeSowingModal();
                if (window.YGUXMessages?.popup) {
                    window.YGUXMessages.popup({ type: 'success', title: 'Siembra registrada: el pre-cultivo ya es un cultivo sembrado.' });
                } else if (window.showToast) {
                    window.showToast('Siembra registrada: el pre-cultivo ya es un cultivo sembrado.', 'success');
                }
                await window.loadCrops?.();
            } catch (err) {
                showSowingError(err?.message || 'No se pudo registrar la siembra.');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
        overlay.querySelectorAll('[data-precultivo-sowing-close]').forEach((btn) => {
            btn.addEventListener('click', closeSowingModal);
        });
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeSowingModal();
        });
    }
    overlay.dataset.cropId = id;
    overlay.querySelector('[data-precultivo-sowing-name]').textContent = `Cultivo: ${cropNameFromState(id)}`;
    const dateInput = document.getElementById('precultivo-sowing-date');
    if (dateInput) dateInput.value = getTodayKey();
    const seedInput = document.getElementById('precultivo-sowing-seed');
    if (seedInput) seedInput.value = '';
    const harvestInput = document.getElementById('precultivo-sowing-harvest');
    if (harvestInput) harvestInput.value = '';
    showSowingError('');
    overlay.classList.remove('hidden');
    setTimeout(() => dateInput?.focus(), 100);
}

// ============================================================
// Init
// ============================================================

let initialized = false;

export function initAgroPrecultivo() {
    if (initialized) return;
    initialized = true;

    const statusSelect = document.getElementById('crop-status');
    if (statusSelect) {
        statusSelect.addEventListener('change', syncCropFormForStatus);
    }

    document.addEventListener('click', (event) => {
        const sowBtn = event.target?.closest?.('.btn-sow-crop');
        if (!sowBtn) return;
        event.preventDefault();
        event.stopPropagation();
        openSowingModal(sowBtn.dataset?.id || '');
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const overlay = document.getElementById(MODAL_ID);
        if (overlay && !overlay.classList.contains('hidden')) closeSowingModal();
    });

    if (typeof window !== 'undefined') {
        window._agroPrecultivo = {
            assertForwardTransition,
            convertPreCropToSowed,
            openSowingModal,
            syncCropFormForStatus,
            applyStatusSelectMachine,
            syncCropModal
        };
    }
}
