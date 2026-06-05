/* ==========================================================================
   YAVLGOLD AGRO - GESTION DE FINCAS (VANILLA JS ES6 MODULE)
   ========================================================================== */

import { supabase } from '../assets/js/config/supabase-config.js';

let farmsCache = [];
let isMigrationRunning = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper para notificaciones.
function notify(type, title, message = '') {
  if (window.YGUXMessages && typeof window.YGUXMessages.popup === 'function') {
    window.YGUXMessages.popup({ type, title, message });
  } else if (window.YGUXMessages && typeof window.YGUXMessages[type] === 'function') {
    window.YGUXMessages[type](title);
  } else if (typeof window.showToast === 'function') {
    window.showToast(`${title} ${message}`, type);
  } else {
    alert(`${title}\n${message}`);
  }
}

// Formateador de USD local
function formatUsd(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function getSelectedFarmId() {
  const select = document.getElementById('agro-farm-filter-select');
  return select ? String(select.value || '').trim() : '';
}

function bindFarmsViewActions(container) {
  container.querySelectorAll('[data-farm-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.farmAction;
      const farmId = button.dataset.farmId || '';
      if (action === 'create') openFarmModal('create');
      if (action === 'view') viewFarmCrops(farmId);
      if (action === 'edit') openFarmModal('edit', farmId);
      if (action === 'delete') deleteFarm(farmId);
      if (action === 'compare') {
        import('./agro-farm-compare.js').then(mod => mod.renderFarmCompareView()).catch(err => {
          console.error('[AGRO_FARMS] Error cargando comparador:', err);
        });
      }
    });
  });
}

/**
 * Carga las fincas y sus estadísticas
 */
async function loadFarms() {
  const root = document.getElementById('agro-farms-root');
  if (!root) return;

  root.innerHTML = `
    <div class="farm-loading-state">
      <i class="fa-solid fa-spinner fa-spin fa-2x" aria-hidden="true"></i>
    </div>
  `;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No se pudo obtener el usuario de la sesión.");

    // 1. Obtener fincas
    const { data: farms, error } = await supabase
      .from('agro_farms')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    farmsCache = farms || [];

    // 2. Si no hay fincas, correr auto-migración
    if (farmsCache.length === 0 && !isMigrationRunning) {
      isMigrationRunning = true;
      await runAutoMigration(user);
      isMigrationRunning = false;
      return; // runAutoMigration volverá a llamar a loadFarms() al completarse
    }

    // 3. Obtener cultivos para estadísticas
    const { data: crops, error: cropsError } = await supabase
      .from('agro_crops')
      .select('id, farm_id, status, investment')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (cropsError) throw cropsError;

    // 4. Obtener ingresos y gastos totales agrupados por crop_id
    const { data: expenses, error: expError } = await supabase
      .from('agro_expenses')
      .select('crop_id, amount, currency, exchange_rate, monto_usd')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    const { data: incomes, error: incError } = await supabase
      .from('agro_income')
      .select('crop_id, monto, currency, exchange_rate, monto_usd')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (expError) throw expError;
    if (incError) throw incError;

    // 5. Obtener ciclos operativos vinculados a fincas (para mapear cycle_id → farm_id)
    //    Nota: agro_operational_cycles usa hard delete, NO tiene deleted_at
    const { data: opCycles, error: opCyclesError } = await supabase
      .from('agro_operational_cycles')
      .select('id, farm_id')
      .eq('user_id', user.id)
      .not('farm_id', 'is', null);

    if (opCyclesError) throw opCyclesError;

    // 6. Obtener movimientos de ciclos operativos (donde están los montos reales)
    const cycleIds = (opCycles || []).map(c => c.id);
    let opMovements = [];
    if (cycleIds.length > 0) {
      const { data: movementsData, error: movementsError } = await supabase
        .from('agro_operational_movements')
        .select('cycle_id, direction, amount, currency, amount_usd, exchange_rate')
        .eq('user_id', user.id)
        .in('cycle_id', cycleIds);
      if (movementsError) throw movementsError;
      opMovements = movementsData || [];
    }

    // 7. Obtener gastos generales de finca (sin crop_id pero con farm_id)
    const { data: farmExpenses, error: farmExpError } = await supabase
      .from('agro_expenses')
      .select('farm_id, amount, currency, exchange_rate, monto_usd')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .is('crop_id', null)
      .not('farm_id', 'is', null);

    if (farmExpError) throw farmExpError;

    // 8. Obtener ingresos generales de finca (sin crop_id pero con farm_id)
    const { data: farmIncomes, error: farmIncError } = await supabase
      .from('agro_income')
      .select('farm_id, monto, currency, exchange_rate, monto_usd')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .is('crop_id', null)
      .not('farm_id', 'is', null);

    if (farmIncError) throw farmIncError;

    // Calcular montos convertidos a USD por crop_id
    const resolveRecordUsd = (row) => {
      if (row.monto_usd !== undefined && row.monto_usd !== null) return Number(row.monto_usd);
      if (row.amount_usd !== undefined && row.amount_usd !== null) return Number(row.amount_usd);
      const amount = Number(row.amount || row.monto || 0);
      const currency = String(row.currency || 'USD').toUpperCase();
      if (currency === 'USD') return amount;
      const rate = Number(row.exchange_rate || 1);
      return rate > 0 ? amount / rate : amount;
    };

    const expMap = new Map();
    (expenses || []).forEach(e => {
      if (!e.crop_id) return;
      expMap.set(e.crop_id, (expMap.get(e.crop_id) || 0) + resolveRecordUsd(e));
    });

    const incMap = new Map();
    (incomes || []).forEach(i => {
      if (!i.crop_id) return;
      incMap.set(i.crop_id, (incMap.get(i.crop_id) || 0) + resolveRecordUsd(i));
    });

    // 9. Agrupar estadísticas por farm_id (AMPLIADO con ciclos operativos)
    const statsMap = new Map();
    farmsCache.forEach(f => {
      statsMap.set(f.id, {
        totalCrops: 0,
        activeCrops: 0,
        totalExpenses: 0,
        totalIncome: 0,
        balance: 0,
        operationalCycles: 0,
        generalExpenses: 0,
        generalIncomes: 0
      });
    });

    (crops || []).forEach(c => {
      if (!c.farm_id || !statsMap.has(c.farm_id)) return;
      const fStats = statsMap.get(c.farm_id);

      // Contar todos los cultivos (activos, finalizados y perdidos)
      fStats.totalCrops++;

      // Cultivo activo si no está finalizado ni perdido
      const isActive = c.status !== 'finalizado' && c.status !== 'lost';
      if (isActive) fStats.activeCrops++;

      // Sumar inversión base del cultivo + gastos operativos e ingresos asociados
      const cropInvestment = Number(c.investment) || 0;
      const cExp = expMap.get(c.id) || 0;
      const cInc = incMap.get(c.id) || 0;

      fStats.totalExpenses += cExp + cropInvestment;
      fStats.totalIncome += cInc;
      fStats.balance = fStats.totalIncome - fStats.totalExpenses;
    });

    // 10. Sumar ciclos operativos por finca (movimientos → cycle_id → farm_id)
    const cycleFarmMap = new Map();
    (opCycles || []).forEach(c => cycleFarmMap.set(c.id, c.farm_id));

    (opMovements || []).forEach(mov => {
      const farmId = cycleFarmMap.get(mov.cycle_id);
      if (!farmId || !statsMap.has(farmId)) return;
      const fStats = statsMap.get(farmId);
      const amount = resolveRecordUsd(mov);
      if (mov.direction === 'in') {
        fStats.totalIncome += amount;
        fStats.generalIncomes += amount;
      } else {
        fStats.totalExpenses += amount;
        fStats.generalExpenses += amount;
      }
      fStats.balance = fStats.totalIncome - fStats.totalExpenses;
    });

    // Contar ciclos operativos por finca
    (opCycles || []).forEach(c => {
      if (!statsMap.has(c.farm_id)) return;
      statsMap.get(c.farm_id).operationalCycles++;
    });

    // 11. Sumar gastos generales de finca (sin crop_id)
    (farmExpenses || []).forEach(expense => {
      if (!expense.farm_id || !statsMap.has(expense.farm_id)) return;
      const fStats = statsMap.get(expense.farm_id);
      const amount = resolveRecordUsd(expense);
      fStats.totalExpenses += amount;
      fStats.generalExpenses += amount;
      fStats.balance = fStats.totalIncome - fStats.totalExpenses;
    });

    // 12. Sumar ingresos generales de finca (sin crop_id)
    (farmIncomes || []).forEach(income => {
      if (!income.farm_id || !statsMap.has(income.farm_id)) return;
      const fStats = statsMap.get(income.farm_id);
      const amount = resolveRecordUsd(income);
      fStats.totalIncome += amount;
      fStats.generalIncomes += amount;
      fStats.balance = fStats.totalIncome - fStats.totalExpenses;
    });

    // 13. Actualizar dropdown de filtros en Mis Cultivos
    populateFilterSelector();

    // 14. Renderizar vista de Fincas
    renderFarmsView(root, statsMap);

  } catch (err) {
    console.error('[AGRO_FARMS] Error al cargar fincas:', err);
    const safeMessage = escapeHtml(err.message || 'No se pudieron recuperar los datos de fincas.');
    root.innerHTML = `
      <div class="farm-empty-state farm-empty-state--danger">
        <div class="farm-empty-icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></div>
        <p class="farm-empty-title">Error de Carga</p>
        <p class="farm-empty-copy">${safeMessage}</p>
        <button class="btn btn-gold" type="button" data-farm-action="reload">Reintentar</button>
      </div>
    `;
    root.querySelector('[data-farm-action="reload"]')?.addEventListener('click', () => loadFarms());
  }
}

/**
 * Corre el proceso de auto-migración cuando no hay fincas
 */
async function runAutoMigration(user) {
  try {
    // 1. Obtener farm_name del perfil
    const { data: profile } = await supabase
      .from('agro_farmer_profile')
      .select('farm_name, location_text')
      .eq('user_id', user.id)
      .maybeSingle();

    const defaultName = profile?.farm_name || 'Mi Finca';
    const defaultLocation = profile?.location_text || '';

    // 2. Crear finca por defecto
    const { data: newFarm, error: createError } = await supabase
      .from('agro_farms')
      .insert({
        user_id: user.id,
        name: defaultName,
        location_text: defaultLocation,
        is_default: true
      })
      .select()
      .single();

    if (createError) throw createError;

    // 3. Vincular cultivos existentes sin farm_id
    const { error: updateError } = await supabase
      .from('agro_crops')
      .update({ farm_id: newFarm.id })
      .eq('user_id', user.id)
      .is('farm_id', null);

    if (updateError) throw updateError;

    notify('success', 'Finca Inicial Creada', `Se creó "${defaultName}" como tu finca principal y se asociaron tus cultivos.`);
    
    // Recargar
    await loadFarms();

  } catch (err) {
    console.error('[AGRO_FARMS] Error en auto-migración:', err);
    notify('error', 'Error de Migración', 'No pudimos crear tu finca inicial. Intenta refrescar.');
  }
}

/**
 * Popula el select del filtro de fincas en Mis Cultivos
 */
function populateFilterSelector() {
  const select = document.getElementById('agro-farm-filter-select');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">Todas las fincas</option>';

  farmsCache.forEach(farm => {
    const option = document.createElement('option');
    option.value = farm.id;
    option.textContent = farm.name + (farm.is_default ? ' (Principal)' : '');
    select.appendChild(option);
  });

  // Intentar conservar selección previa
  if (currentVal && farmsCache.some(f => f.id === currentVal)) {
    select.value = currentVal;
  }
}

/**
 * Renderiza la interfaz de tarjetas de finca
 */
function renderFarmsView(container, statsMap) {
  let html = `
    <div class="agro-farms-header-bar">
      <div class="agro-farms-title-group">
        <h3><i class="fa-solid fa-mountain-sun" aria-hidden="true"></i> Mis Fincas</h3>
        <p>Gestiona las propiedades donde siembras tus cultivos</p>
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="btn btn-gold" type="button" data-farm-action="create">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nueva Finca
        </button>
        ${farmsCache.length >= 2 ? `
        <button class="btn btn-gold" type="button" data-farm-action="compare" style="background:color-mix(in srgb, var(--gold-4) 15%, transparent);border-color:color-mix(in srgb, var(--gold-4) 40%, transparent);">
          <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i> Comparar fincas
        </button>` : ''}
      </div>
    </div>
    <div class="farm-grid">
  `;

  farmsCache.forEach(farm => {
    const stats = statsMap.get(farm.id) || { totalCrops: 0, activeCrops: 0, totalExpenses: 0, totalIncome: 0, balance: 0, operationalCycles: 0, generalExpenses: 0, generalIncomes: 0 };
    const safeName = escapeHtml(farm.name);
    const safeLocation = escapeHtml(farm.location_text || '');
    html += `
      <div class="farm-card" data-farm-id="${escapeHtml(farm.id)}">
        <div class="farm-card__header">
          <div class="farm-card__title-area">
            <h4 class="farm-card__title">
              <i class="fa-solid fa-mountain-sun farm-card__title-icon" aria-hidden="true"></i> ${safeName}
            </h4>
            ${farm.location_text ? `<p class="farm-card__location"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${safeLocation}</p>` : ''}
          </div>
          ${farm.is_default ? `<span class="farm-card__default-badge">Principal</span>` : ''}
        </div>
        <div class="farm-card__body">
          <div class="farm-stats-grid">
            <div class="farm-stat-item">
              <span class="farm-stat-label">Cultivos Totales</span>
              <span class="farm-stat-value gold">${stats.totalCrops}</span>
              ${stats.activeCrops < stats.totalCrops ? `<span class="farm-stat-hint">${stats.activeCrops} activos</span>` : ''}
            </div>
            ${stats.operationalCycles > 0 ? `
            <div class="farm-stat-item">
              <span class="farm-stat-label">Ciclos Operativos</span>
              <span class="farm-stat-value gold">${stats.operationalCycles}</span>
            </div>` : ''}
            <div class="farm-stat-item">
              <span class="farm-stat-label">Gastos (Inversión)</span>
              <span class="farm-stat-value expense">${formatUsd(stats.totalExpenses)}</span>
              ${stats.generalExpenses > 0 ? `<span class="farm-stat-hint">${formatUsd(stats.generalExpenses)} generales</span>` : ''}
            </div>
            <div class="farm-stat-item">
              <span class="farm-stat-label">Ingresos</span>
              <span class="farm-stat-value income">${formatUsd(stats.totalIncome)}</span>
              ${stats.generalIncomes > 0 ? `<span class="farm-stat-hint">${formatUsd(stats.generalIncomes)} generales</span>` : ''}
            </div>
            <div class="farm-stat-item">
              <span class="farm-stat-label">Balance</span>
              <span class="farm-stat-value ${stats.balance >= 0 ? 'income' : 'expense'}">${formatUsd(stats.balance)}</span>
            </div>
          </div>
        </div>
        <div class="farm-card__actions">
          <button class="btn-view-crops" type="button" data-farm-action="view" data-farm-id="${escapeHtml(farm.id)}">
            <i class="fa-solid fa-seedling"></i> Ver cultivos
          </button>
          <button class="btn-edit-farm" type="button" data-farm-action="edit" data-farm-id="${escapeHtml(farm.id)}">
            <i class="fa-solid fa-pen"></i> Editar
          </button>
          <button class="btn-delete-farm" type="button" data-farm-action="delete" data-farm-id="${escapeHtml(farm.id)}">
            <i class="fa-solid fa-trash"></i> Eliminar
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
  bindFarmsViewActions(container);
}

/**
 * Renderiza el selector de fincas en el modal de cultivo
 */
function renderFarmSelector(selectEl, selectedId = null) {
  if (!selectEl) return;

  selectEl.innerHTML = '';
  
  if (farmsCache.length === 0) {
    selectEl.innerHTML = '<option value="">No hay fincas disponibles</option>';
    return;
  }

  farmsCache.forEach(farm => {
    const opt = document.createElement('option');
    opt.value = farm.id;
    opt.textContent = farm.name + (farm.is_default ? ' (Principal)' : '');
    selectEl.appendChild(opt);
  });

  // Pre-selección: si hay ID seleccionado, usarlo; si no, buscar la finca por defecto
  if (selectedId && farmsCache.some(f => f.id === selectedId)) {
    selectEl.value = selectedId;
  } else {
    const defaultFarm = farmsCache.find(f => f.is_default);
    if (defaultFarm) {
      selectEl.value = defaultFarm.id;
    } else if (farmsCache[0]) {
      selectEl.value = farmsCache[0].id;
    }
  }
}

/**
 * Abre el modal de finca
 */
function openFarmModal(mode, farmId = null) {
  const modal = document.getElementById('modal-farm');
  const title = document.getElementById('farm-modal-title');
  const form = document.getElementById('form-new-farm');

  if (!modal || !form) return;

  form.reset();
  document.getElementById('farm-edit-id').value = '';

  if (mode === 'edit' && farmId) {
    title.textContent = 'Editar Finca';
    const farm = farmsCache.find(f => f.id === farmId);
    if (farm) {
      document.getElementById('farm-edit-id').value = farm.id;
      document.getElementById('farm-name').value = farm.name || '';
      document.getElementById('farm-location').value = farm.location_text || '';
      document.getElementById('farm-notes').value = farm.notes || '';
      document.getElementById('farm-is-default').checked = !!farm.is_default;
    }
  } else {
    title.textContent = 'Nueva Finca';
    document.getElementById('farm-is-default').checked = farmsCache.length === 0;
  }

  modal.classList.add('active');
  setTimeout(() => document.getElementById('farm-name')?.focus(), 120);
}

/**
 * Cierra el modal de finca
 */
function closeFarmModal() {
  const modal = document.getElementById('modal-farm');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Guarda o actualiza una finca
 */
async function saveFarm() {
  const saveBtn = document.getElementById('btn-save-farm');
  if (saveBtn) saveBtn.disabled = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Debes iniciar sesión.");

    const id = document.getElementById('farm-edit-id').value;
    const name = document.getElementById('farm-name').value.trim();
    const locationText = document.getElementById('farm-location').value.trim();
    const notes = document.getElementById('farm-notes').value.trim();
    const isDefault = document.getElementById('farm-is-default').checked;

    if (!name) throw new Error("El nombre de la finca es requerido.");

    // Si establecemos como default, quitar default a todas las demás
    if (isDefault) {
      await supabase
        .from('agro_farms')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .is('deleted_at', null);
    }

    const payload = {
      user_id: user.id,
      name,
      location_text: locationText || null,
      notes: notes || null,
      is_default: isDefault
    };

    let resultError = null;

    if (id) {
      const { error } = await supabase
        .from('agro_farms')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);
      resultError = error;
    } else {
      const { error } = await supabase
        .from('agro_farms')
        .insert(payload);
      resultError = error;
    }

    if (resultError) throw resultError;

    notify('success', id ? 'Finca Actualizada' : 'Finca Creada', `Se guardó "${name}" exitosamente.`);
    closeFarmModal();
    
    // Recargar fincas y cultivos
    await loadFarms();
    if (typeof window.loadCrops === 'function') {
      await window.loadCrops();
    }

  } catch (err) {
    console.error('[AGRO_FARMS] Error al guardar finca:', err);
    notify('error', 'Error al Guardar', err.message || 'No se pudo guardar la finca.');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

/**
 * Elimina una finca (soft-delete)
 */
async function deleteFarm(id) {
  const farm = farmsCache.find(f => f.id === id);
  if (!farm) return;

  if (farm.is_default) {
    notify('error', 'Acción no permitida', 'No puedes eliminar la finca por defecto. Establece otra como principal primero.');
    return;
  }

  const confirmMsg = `¿Estás seguro de que deseas eliminar la finca "${farm.name}"?\nLos cultivos asociados seguirán existiendo pero dejarán de pertenecer a esta finca.`;
  if (!confirm(confirmMsg)) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Debes iniciar sesión.");

    // Soft-delete
    const { error } = await supabase
      .from('agro_farms')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    // Desvincular cultivos de la finca eliminada
    const { error: unlinkError } = await supabase
      .from('agro_crops')
      .update({ farm_id: null })
      .eq('user_id', user.id)
      .eq('farm_id', id);

    if (unlinkError) throw unlinkError;

    notify('success', 'Finca Eliminada', `Finca "${farm.name}" eliminada.`);
    
    // Recargar fincas y cultivos
    await loadFarms();
    if (typeof window.loadCrops === 'function') {
      await window.loadCrops();
    }

  } catch (err) {
    console.error('[AGRO_FARMS] Error al eliminar finca:', err);
    notify('error', 'Error al Eliminar', err.message || 'No se pudo eliminar la finca.');
  }
}

/**
 * Direcciona a la vista de Mis Cultivos filtrando por esta finca
 */
function viewFarmCrops(farmId) {
  const select = document.getElementById('agro-farm-filter-select');
  if (select) {
    select.value = farmId;
    // Disparar evento change para que agro.js filtre y recargue los cultivos en memoria
    select.dispatchEvent(new Event('change'));
  }

  // Navegar a la subvista de mis-cultivos
  const sublink = document.querySelector('.agro-shell-sublink[data-agro-view="ciclos"][data-agro-subview="mis-cultivos"]')
    || document.querySelector('.agro-mobile-hub__item[data-agro-view="ciclos"][data-agro-subview="mis-cultivos"]');
  if (sublink) {
    sublink.click();
  }
}

// Exponer las funciones a nivel global en window._agroFarms
if (typeof window !== 'undefined') {
  window._agroFarms = {
    loadFarms,
    openFarmModal,
    closeFarmModal,
    saveFarm,
    deleteFarm,
    viewFarmCrops,
    renderFarmSelector,
    getSelectedFarmId,
    getFarms: () => [...farmsCache]
  };

  // También exponer wrappers globales simples para eventos inline
  window.closeFarmModal = closeFarmModal;
  window.saveFarm = saveFarm;
}
