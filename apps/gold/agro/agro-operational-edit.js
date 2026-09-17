/**
 * Edición y eliminación de movimientos operacionales históricos (ANEXO 20, F1).
 *
 * Alcance (Opción A del owner, 12-sep): las filas "histórico operacional" de
 * los TRES wizards (Finca/Cultivo/Personal) quedan sin puerta de gestión tras
 * la dormición del legacy. Este módulo la abre de forma acotada:
 * - Editar SOLO concepto/monto/fecha (movement_date) en
 *   agro_operational_movements. No toca el ciclo, ni su tipo económico, ni
 *   categorías derivadas, ni la partición (farm_id/crop_id viven en el ciclo).
 * - Eliminar = hard delete del MOVIMIENTO (canon §6: las operacionales no
 *   tienen soft-delete; FICHA §4.2: sin papelera). Confirmación siempre por
 *   showAgroConfirmDialog con aviso de que pertenece a un ciclo.
 * - Derivadas del ledger (origin_table/split_from_id) siguen intocables:
 *   este módulo solo acepta filas origen 'operacional' del lector.
 * - Privacidad: con montos ocultos, el monto queda bloqueado y no viaja.
 *
 * RLS vigente (trazado 2026-09-12, migración 20260416190000):
 * agro_operational_movements tiene policies select/insert/update/delete
 * "user_own_movements_*" con auth.uid() = user_id (:703-713 la de delete).
 * Evidence runtime: el legacy ya hace hard delete de ciclos/movimientos
 * (agroOperationalCycles.js:1324 rollback y :1414 deleteCycleRecord).
 *
 * Reutiliza las clases visuales del editor ledger (fcwz-edit, cargadas
 * globalmente por agro-facturero-finca-wizard.css) en modo lectura; este
 * módulo no define CSS propio. Anti-circular (§3.3): nadie lo importa
 * estáticamente — los wizards lo cargan con import() dinámico.
 */

import { supabase } from '../assets/js/config/supabase-config.js';
import { readMoneyValuesHidden } from './agro-privacy.js';

const MODAL_ID = 'fcwz-opedit-modal';

// Columnas editables del movimiento (esquema EN): concept/amount/movement_date.
const FIELDS = Object.freeze({ concepto: 'concept', monto: 'amount', fecha: 'movement_date' });

// Superficies del ciclo (period-cycles / legacy dormido / monolito) escuchan
// este evento para refrescar balances y listas de ciclos.
const PORTFOLIO_REFRESH_EVENT = 'agro:operational-portfolio-updated';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function todayLocalIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Solo filas operacionales del lector (origen + identidad del movimiento).
export function isOperationalRowEditable(row) {
    return Boolean(row)
        && row.origen === 'operacional'
        && Boolean(row.id)
        && Boolean(row.cycle_id);
}

function notifyChanged() {
    document.dispatchEvent(new CustomEvent(PORTFOLIO_REFRESH_EVENT));
    document.dispatchEvent(new CustomEvent('data-refresh'));
}

// ANEXO 23: tras escribir un movimiento, los totales del ciclo que leen las
// cards (maps de YGAgroOperationalCycles + loadCrops) deben refrescar. Con
// subview=wizard el refresh completo está bloqueado (pisaría al wizard), por
// eso se usa refreshSilent (solo datos, sin renders) y luego loadCrops.
async function refreshCycleTotalsAfterWrite() {
    try {
        const opsApi = window.YGAgroOperationalCycles;
        if (typeof opsApi?.refreshSilent === 'function') {
            await opsApi.refreshSilent();
        }
    } catch (err) {
        console.warn('[OpEdit] refresh silencioso de ciclos falló:', err?.message || err);
    }
    try {
        if (typeof window.loadCrops === 'function') {
            await window.loadCrops();
        }
    } catch (err) {
        console.warn('[OpEdit] recarga de cultivos falló:', err?.message || err);
    }
}

async function requireUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Sesión expirada. Recarga la página.');
    return user;
}

// ---------- Borrado directo (hard delete del movimiento, límite del fix) ----------

export async function deleteOperationalMovement({ row, onChanged } = {}) {
    if (!isOperationalRowEditable(row)) return;

    const concepto = String(row.concepto || 'Sin concepto').trim();
    const fecha = String(row.fecha || '').slice(0, 10) || 'Sin fecha';
    const confirmed = typeof window.showAgroConfirmDialog === 'function'
        ? await window.showAgroConfirmDialog({
            title: 'Eliminar movimiento del ciclo',
            message: 'Este registro pertenece a un ciclo de Operaciones de la Finca; eliminarlo lo saca del ciclo y de su balance.',
            detail: `${concepto} · ${fecha}`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            iconClass: 'fa-solid fa-trash-can'
        })
        : false;
    if (!confirmed) return;

    try {
        const user = await requireUser();
        const { error } = await supabase
            .from('agro_operational_movements')
            .delete()
            .eq('id', row.id)
            .eq('user_id', user.id);
        if (error) throw error;
        notifyChanged();
        await refreshCycleTotalsAfterWrite();
        if (typeof onChanged === 'function') onChanged();
    } catch (err) {
        console.error('[OpEdit] delete failed:', err?.message || err);
        throw err;
    }
}

// ---------- Modal compacto: SOLO concepto/monto/fecha ----------

export async function openOperationalMovementEditor({ row, onChanged } = {}) {
    if (!isOperationalRowEditable(row)) return;

    document.getElementById(MODAL_ID)?.remove();

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const titleId = 'fcwz-opedit-title';

    // Privacidad (espejo del editor ledger): con montos ocultos el monto no
    // se muestra editable ni se envía.
    const amountsLocked = readMoneyValuesHidden();

    const rawMonto = row?.monto;
    const state = {
        concepto: String(row.concepto ?? ''),
        monto: (rawMonto === null || rawMonto === undefined || String(rawMonto).trim() === '')
            ? ''
            : String(rawMonto),
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(row.fecha || '').slice(0, 10))
            ? String(row.fecha).slice(0, 10)
            : todayLocalIso(),
        saving: false
    };

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className = 'fcwz-edit';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', titleId);

    const conceptoId = 'fcwz-opedit-concepto';
    const montoId = 'fcwz-opedit-monto';
    const fechaId = 'fcwz-opedit-fecha';

    overlay.innerHTML = `
        <div class="fcwz-edit__backdrop"></div>
        <div class="fcwz-edit__panel">
            <header class="fcwz-edit__header">
                <div class="fcwz-edit__titlewrap">
                    <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                    <h3 class="fcwz-edit__title" id="${titleId}">Editar histórico operacional</h3>
                </div>
                <button type="button" class="fcwz-edit__close" aria-label="Cerrar editor">×</button>
            </header>
            <div class="fcwz-edit__body">
                <p class="fcwz-edit__meta">
                    <span>${escapeHtml(String(row.fecha || '').slice(0, 10) || 'Sin fecha')}</span>
                    <span class="fcwz-movements__tag">histórico operacional</span>
                </p>
                <p class="fcwz-edit__note">Este movimiento pertenece a un ciclo de Operaciones de la Finca. Se edita concepto, monto y fecha; el ciclo, su tipo y su categoría no cambian.</p>
                <div class="fcflow-field">
                    <label class="fcflow-label" for="${conceptoId}">Concepto *</label>
                    <input class="fcflow-input" type="text" id="${conceptoId}" value="${escapeHtml(state.concepto)}" placeholder="Ej: Fertilizante NPK" autocomplete="off">
                </div>
                <div class="fcflow-field">
                    <label class="fcflow-label" for="${montoId}">Monto *</label>
                    <input class="fcflow-input" type="number" id="${montoId}" min="0.01" step="0.01" inputmode="decimal" value="${escapeHtml(state.monto)}" placeholder="0.00" ${amountsLocked ? 'disabled' : ''}>
                    ${amountsLocked
                        ? '<p class="fcwz-edit__note">Montos ocultos: desactiva «Ocultar montos» en la lista para editar el monto.</p>'
                        : ''}
                </div>
                <div class="fcflow-field">
                    <label class="fcflow-label" for="${fechaId}">Fecha *</label>
                    <input class="fcflow-input" type="date" id="${fechaId}" max="${todayLocalIso()}" value="${escapeHtml(state.fecha)}">
                </div>
                <div class="fcwz-edit__error" data-fcwz-opedit-error hidden></div>
            </div>
            <footer class="fcwz-edit__footer">
                <button type="button" class="btn-outline-gold" data-fcwz-opedit-cancel>Cancelar</button>
                <button type="button" class="btn-gold" data-fcwz-opedit-save>Guardar</button>
            </footer>
        </div>
    `;
    document.body.appendChild(overlay);

    const backdrop = overlay.querySelector('.fcwz-edit__backdrop');
    const conceptoInput = overlay.querySelector(`#${conceptoId}`);
    const montoInput = overlay.querySelector(`#${montoId}`);
    const fechaInput = overlay.querySelector(`#${fechaId}`);
    const saveButton = overlay.querySelector('[data-fcwz-opedit-save]');
    const cancelButton = overlay.querySelector('[data-fcwz-opedit-cancel]');
    const errorBox = overlay.querySelector('[data-fcwz-opedit-error]');

    function showError(message) {
        errorBox.hidden = false;
        errorBox.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <span>${escapeHtml(message)}</span>`;
    }

    function setBusy(busy) {
        state.saving = busy;
        saveButton.disabled = busy;
        saveButton.textContent = busy ? 'Guardando…' : 'Guardar';
        cancelButton.disabled = busy;
    }

    function finish() {
        document.removeEventListener('keydown', handleKeydown);
        overlay.classList.remove('is-open');
        window.setTimeout(() => {
            overlay.remove();
            if (previousFocus && typeof previousFocus.focus === 'function' && document.contains(previousFocus)) {
                previousFocus.focus({ preventScroll: true });
            }
        }, 180);
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            if (!state.saving) finish();
        }
    }

    function formValid() {
        if (!state.concepto.trim()) return false;
        // Con montos ocultos el monto no se edita (ni se valida): no viaja.
        if (!amountsLocked && !(Number(state.monto) > 0)) return false;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(state.fecha)) return false;
        return true;
    }

    async function save() {
        if (state.saving) return;
        if (!formValid()) {
            showError('Completa concepto, monto y fecha antes de guardar.');
            return;
        }
        setBusy(true);
        try {
            const user = await requireUser();
            const amount = Number(state.monto);

            // Solo columnas editables del movimiento. El ciclo, su tipo
            // económico y su partición (farm_id/crop_id) jamás viajan.
            const payload = {
                [FIELDS.concepto]: state.concepto.trim(),
                [FIELDS.fecha]: state.fecha
            };

            if (!amountsLocked) {
                payload[FIELDS.monto] = amount;

                // La equivalencia USD se recalcula SOLO si el monto cambió,
                // con la tasa histórica del propio movimiento (no se pisa por
                // la tasa del día): respeta multimoneda del canon. OJO: la
                // tasa es COP/USD (o VES/USD) — el monto nativo se DIVIDE por
                // ella para obtener USD (ANEXO 23: antes multiplicaba).
                const originalAmount = (rawMonto === null || rawMonto === undefined || String(rawMonto).trim() === '')
                    ? null
                    : Number(rawMonto);
                const amountChanged = originalAmount === null || amount !== originalAmount;
                if (amountChanged) {
                    const historicRate = Number(row?.exchange_rate);
                    payload.amount_usd = Number.isFinite(historicRate) && historicRate > 0
                        ? Number((amount / historicRate).toFixed(2))
                        : null;
                }
            }

            const { error } = await supabase
                .from('agro_operational_movements')
                .update(payload)
                .eq('id', row.id)
                .eq('user_id', user.id);
            if (error) throw error;

            notifyChanged();
            await refreshCycleTotalsAfterWrite();
            finish();
            if (typeof onChanged === 'function') onChanged();
        } catch (err) {
            console.error('[OpEdit] save failed:', err?.message || err);
            showError(err?.message || 'No se pudo guardar el movimiento.');
            setBusy(false);
        }
    }

    conceptoInput?.addEventListener('input', () => { state.concepto = conceptoInput.value; });
    montoInput?.addEventListener('input', () => { state.monto = montoInput.value; });
    fechaInput?.addEventListener('input', () => { state.fecha = fechaInput.value || todayLocalIso(); });

    overlay.querySelector('.fcwz-edit__close')?.addEventListener('click', () => { if (!state.saving) finish(); });
    cancelButton?.addEventListener('click', () => { if (!state.saving) finish(); });
    saveButton?.addEventListener('click', () => { void save(); });
    overlay.addEventListener('click', (event) => {
        if ((event.target === overlay || event.target === backdrop) && !state.saving) {
            finish();
        }
    });
    document.addEventListener('keydown', handleKeydown);

    requestAnimationFrame(() => {
        overlay.classList.add('is-open');
        conceptoInput?.focus({ preventScroll: true });
    });
}
