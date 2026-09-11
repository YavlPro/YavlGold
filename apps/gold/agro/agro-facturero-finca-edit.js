/**
 * Facturero de la Finca — Edición y eliminación de filas ledger (Fase 7, ANEXO 18).
 * Modal compacto invocado desde el Paso 5 (VER) del wizard + borrado directo.
 *
 * Alcance canónico (7 límites del ANEXO 18):
 * 1. Solo filas ledger (origen === 'ledger'); las operacionales viven en ciclos
 *    de Operaciones de la Finca y son intocables desde aquí.
 * 2. Eliminar = soft-delete (deleted_at = now, patrón §6). Sin papelera ni
 *    restore en esta superficie (FICHA §4.2: papelera solo de cultivos).
 *    Confirmación siempre por showAgroConfirmDialog, nunca popup (§4.12.5).
 * 3. Filas derivadas (origin_table NOT NULL = cobros de fiados; split_from_id
 *    NOT NULL = partes de cobro parcial) son solo lectura: el wizard no les
 *    renderiza botones y estas funciones revalidan antes de tocar la base.
 * 4. Editar no mueve la partición: farm_id/crop_id intocables (§4.5).
 *    Editables: concepto, monto, moneda, fecha, categoría canónica.
 * 5. Privacidad: con montos ocultos, monto y moneda quedan bloqueados y no se
 *    envían en el update (el modal no filtra montos a la vista de terceros).
 * 6. RLS primero: las políticas update/delete del ledger viven en el esquema
 *    remoto (pre-repo); aquí no se crea DDL. Evidencia operativa: el
 *    soft-delete de agro.js (deleteFactureroItem) ya actualiza estas tablas
 *    en producción con scope user_id.
 * 7. Este módulo NO importa del wizard: el wizard lo importa dinámicamente y
 *    importar de vuelta sería dependencia circular (§3.3). Los vocabularios
 *    compartidos (categorías/monedas) se duplican a propósito, en pequeño.
 *
 * ADN V12: tokens, FA 6.5 con aria-hidden, transiciones 120–220ms,
 * prefers-reduced-motion respetado. Cleanup de listeners al cerrar (§11.2).
 */

import { supabase } from '../assets/js/config/supabase-config.js';
import { initExchangeRates, getRate, convertToUSD } from './agro-exchange.js';
import { readMoneyValuesHidden } from './agro-privacy.js';

const MODAL_ID = 'fcwz-edit-modal';

// Mapa de columnas editables por tabla (trazado 2026-09-03 del wizard):
// agro_expenses usa date/concept/amount (+category); el resto fecha/concepto/monto.
// pending/losses/transfers no tienen columna de categoría (categoryId '').
const TABLE_FIELDS = Object.freeze({
    agro_expenses: { concepto: 'concept', monto: 'amount', fecha: 'date', categoria: 'category' },
    agro_income: { concepto: 'concepto', monto: 'monto', fecha: 'fecha', categoria: 'categoria' },
    agro_pending: { concepto: 'concepto', monto: 'monto', fecha: 'fecha', categoria: '' },
    agro_losses: { concepto: 'concepto', monto: 'monto', fecha: 'fecha', categoria: '' },
    agro_transfers: { concepto: 'concepto', monto: 'monto', fecha: 'fecha', categoria: '' }
});

const TABLE_LABELS = Object.freeze({
    agro_expenses: 'gasto',
    agro_income: 'ingreso',
    agro_pending: 'fiado',
    agro_losses: 'pérdida',
    agro_transfers: 'donación'
});

// Eventos de refresco por tabla — espejo del eventByTipo de confirmCreate
// (el wizard escucha/refresca las mismas superficies vivas).
const TABLE_REFRESH_EVENT = Object.freeze({
    agro_expenses: 'data-refresh',
    agro_income: 'agro:income:changed',
    agro_transfers: 'agro:transfers:refreshed',
    agro_losses: 'agro:losses:changed',
    agro_pending: 'data-refresh'
});

// CAT-1 del wizard (copia local — ver límite 7 del encabezado).
const FARM_CATEGORIES = Object.freeze([
    { id: 'insumos', label: 'Insumos' },
    { id: 'herramientas', label: 'Herramientas' },
    { id: 'mano_obra', label: 'Mano de obra' },
    { id: 'mantenimiento', label: 'Mantenimiento' },
    { id: 'transporte', label: 'Transporte' },
    { id: 'otros', label: 'Otros' }
]);

const CURRENCY_OPTIONS = ['COP', 'USD', 'VES'];

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeCurrency(raw) {
    const value = String(raw || '').trim().toUpperCase();
    return CURRENCY_OPTIONS.includes(value) ? value : 'USD';
}

function categoryLabel(id) {
    const category = FARM_CATEGORIES.find((entry) => entry.id === id);
    return category ? category.label : 'Sin categoría';
}

function todayLocalIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Límite 3: triple filtro — ledger, sin origen de cobro, sin parte de split.
function isEditableLedgerRow(table, row) {
    if (!TABLE_FIELDS[table] || !row?.id) return false;
    if (row.origen !== 'ledger') return false;
    if (row.origin_table || row.split_from_id) return false;
    return true;
}

function notifyChanged(table) {
    document.dispatchEvent(new CustomEvent(TABLE_REFRESH_EVENT[table] || 'data-refresh'));
}

async function requireUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Sesión expirada. Recarga la página.');
    return user;
}

// ---------- Borrado directo (soft-delete, límite 2) ----------

export async function deleteFincaLedgerRow({ table, row, onChanged } = {}) {
    if (!isEditableLedgerRow(table, row)) return;

    const concepto = String(row.concepto || 'Sin concepto').trim();
    const fecha = String(row.fecha || '').slice(0, 10) || 'Sin fecha';
    const confirmed = typeof window.showAgroConfirmDialog === 'function'
        ? await window.showAgroConfirmDialog({
            title: 'Eliminar registro',
            message: '¿Eliminar este registro? Se aplica borrado lógico: desaparece de listas, tiles y exportes, y queda marcado con fecha de eliminación en la base.',
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
            .from(table)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', row.id)
            .eq('user_id', user.id);
        if (error) throw error;
        notifyChanged(table);
        if (typeof onChanged === 'function') onChanged();
    } catch (err) {
        console.error('[FincaEdit] delete failed:', err?.message || err);
        throw err;
    }
}

// ---------- Modal compacto de edición ----------

export async function openFincaLedgerEditor({ table, row, onChanged } = {}) {
    if (!isEditableLedgerRow(table, row)) return;

    document.getElementById(MODAL_ID)?.remove();

    const fields = TABLE_FIELDS[table];
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const titleId = 'fcwz-edit-title';

    // Límite 5 (privacidad): con montos ocultos, monto y moneda no se muestran
    // ni se envían; concepto/fecha/categoría siguen editables.
    const amountsLocked = readMoneyValuesHidden();

    const rawMonto = row?.monto;
    const state = {
        concepto: String(row.concepto ?? ''),
        monto: (rawMonto === null || rawMonto === undefined || String(rawMonto).trim() === '')
            ? ''
            : String(rawMonto),
        moneda: normalizeCurrency(row.currency),
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(row.fecha || '').slice(0, 10))
            ? String(row.fecha).slice(0, 10)
            : todayLocalIso(),
        categoria: String(row.categoria || '').trim(),
        saving: false
    };

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className = 'fcwz-edit';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', titleId);

    const conceptoId = 'fcwz-edit-concepto';
    const montoId = 'fcwz-edit-monto';
    const fechaId = 'fcwz-edit-fecha';

    overlay.innerHTML = `
        <div class="fcwz-edit__backdrop"></div>
        <div class="fcwz-edit__panel">
            <header class="fcwz-edit__header">
                <div class="fcwz-edit__titlewrap">
                    <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                    <h3 class="fcwz-edit__title" id="${titleId}">Editar ${escapeHtml(TABLE_LABELS[table] || 'registro')}</h3>
                </div>
                <button type="button" class="fcwz-edit__close" aria-label="Cerrar editor">×</button>
            </header>
            <div class="fcwz-edit__body">
                <p class="fcwz-edit__meta">
                    <span>${escapeHtml(String(row.fecha || '').slice(0, 10) || 'Sin fecha')}</span>
                    ${row.categoria ? `<span class="fcwz-movements__tag">${escapeHtml(categoryLabel(state.categoria))}</span>` : ''}
                </p>
                <div class="fcflow-field">
                    <label class="fcflow-label" for="${conceptoId}">Concepto *</label>
                    <input class="fcflow-input" type="text" id="${conceptoId}" value="${escapeHtml(state.concepto)}" placeholder="Ej: Bomba de riego" autocomplete="off">
                </div>
                <div class="fcflow-field">
                    <span class="fcflow-label">Moneda</span>
                    <div class="fcwz-edit__chips" role="group" aria-label="Moneda">
                        ${CURRENCY_OPTIONS.map((option) => `
                            <button type="button" class="fcvw-chip${state.moneda === option ? ' is-active' : ''}" data-fcwz-edit-moneda="${option}" ${amountsLocked ? 'disabled' : ''}>${option === 'VES' ? 'Bs (VES)' : option}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="fcflow-field">
                    <label class="fcflow-label" for="${montoId}">Monto *</label>
                    <input class="fcflow-input" type="number" id="${montoId}" min="0.01" step="0.01" inputmode="decimal" value="${escapeHtml(state.monto)}" placeholder="0.00" ${amountsLocked ? 'disabled' : ''}>
                    ${amountsLocked
                        ? '<p class="fcwz-edit__note">Montos ocultos: desactiva «Ocultar montos» en la lista para editar monto y moneda.</p>'
                        : ''}
                </div>
                <div class="fcflow-field">
                    <label class="fcflow-label" for="${fechaId}">Fecha *</label>
                    <input class="fcflow-input" type="date" id="${fechaId}" max="${todayLocalIso()}" value="${escapeHtml(state.fecha)}">
                </div>
                ${fields.categoria ? `
                <div class="fcflow-field">
                    <span class="fcflow-label">Categoría</span>
                    <div class="fcwz-edit__chips" role="group" aria-label="Categoría">
                        ${FARM_CATEGORIES.map((category) => `
                            <button type="button" class="fcvw-chip${state.categoria === category.id ? ' is-active' : ''}" data-fcwz-edit-cat="${escapeHtml(category.id)}">${escapeHtml(category.label)}</button>
                        `).join('')}
                        <button type="button" class="fcvw-chip${!state.categoria ? ' is-active' : ''}" data-fcwz-edit-cat="">Sin categoría</button>
                    </div>
                </div>
                ` : ''}
                <div class="fcwz-edit__error" data-fcwz-edit-error hidden></div>
            </div>
            <footer class="fcwz-edit__footer">
                <button type="button" class="btn-outline-gold" data-fcwz-edit-cancel>Cancelar</button>
                <button type="button" class="btn-gold" data-fcwz-edit-save>Guardar</button>
            </footer>
        </div>
    `;
    document.body.appendChild(overlay);

    const backdrop = overlay.querySelector('.fcwz-edit__backdrop');
    const conceptoInput = overlay.querySelector(`#${conceptoId}`);
    const montoInput = overlay.querySelector(`#${montoId}`);
    const fechaInput = overlay.querySelector(`#${fechaId}`);
    const saveButton = overlay.querySelector('[data-fcwz-edit-save]');
    const cancelButton = overlay.querySelector('[data-fcwz-edit-cancel]');
    const errorBox = overlay.querySelector('[data-fcwz-edit-error]');

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

            // Límite 4: solo columnas editables; farm_id/crop_id jamás viajan.
            const payload = {
                [fields.concepto]: state.concepto.trim(),
                [fields.fecha]: state.fecha
            };
            if (fields.categoria) payload[fields.categoria] = state.categoria || 'general';

            if (!amountsLocked) {
                payload[fields.monto] = amount;
                payload.currency = state.moneda;

                // Equivalencia USD solo se recalcula si monto/moneda cambiaron:
                // no pisamos la tasa histórica de una fila solo editada de concepto.
                const originalAmount = (rawMonto === null || rawMonto === undefined || String(rawMonto).trim() === '')
                    ? null
                    : Number(rawMonto);
                const amountChanged = originalAmount === null || amount !== originalAmount;
                const currencyChanged = state.moneda !== normalizeCurrency(row.currency);
                if (amountChanged || currencyChanged) {
                    if (state.moneda === 'USD') {
                        payload.exchange_rate = 1;
                        payload.monto_usd = amount;
                    } else {
                        const rates = await initExchangeRates();
                        const rate = getRate(state.moneda, rates) || 0;
                        payload.exchange_rate = rate;
                        payload.monto_usd = rate > 0 ? convertToUSD(amount, state.moneda, rate) : null;
                    }
                }
            }

            const { error } = await supabase
                .from(table)
                .update(payload)
                .eq('id', row.id)
                .eq('user_id', user.id);
            if (error) throw error;

            notifyChanged(table);
            finish();
            if (typeof onChanged === 'function') onChanged();
        } catch (err) {
            console.error('[FincaEdit] save failed:', err?.message || err);
            showError(err?.message || 'No se pudo guardar el registro.');
            setBusy(false);
        }
    }

    conceptoInput?.addEventListener('input', () => { state.concepto = conceptoInput.value; });
    montoInput?.addEventListener('input', () => { state.monto = montoInput.value; });
    fechaInput?.addEventListener('input', () => { state.fecha = fechaInput.value || todayLocalIso(); });

    overlay.querySelectorAll('[data-fcwz-edit-moneda]').forEach((button) => {
        button.addEventListener('click', () => {
            if (amountsLocked) return;
            state.moneda = String(button.getAttribute('data-fcwz-edit-moneda') || 'USD');
            overlay.querySelectorAll('[data-fcwz-edit-moneda]').forEach((entry) => {
                entry.classList.toggle('is-active', entry === button);
            });
        });
    });
    overlay.querySelectorAll('[data-fcwz-edit-cat]').forEach((button) => {
        button.addEventListener('click', () => {
            state.categoria = String(button.getAttribute('data-fcwz-edit-cat') || '').trim();
            overlay.querySelectorAll('[data-fcwz-edit-cat]').forEach((entry) => {
                const isActive = entry === button;
                entry.classList.toggle('is-active', isActive);
                entry.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        });
    });

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
