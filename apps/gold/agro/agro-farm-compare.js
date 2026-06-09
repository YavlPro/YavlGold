/* ==========================================================================
   YAVLGOLD AGRO - COMPARACION DE FINCAS (VANILLA JS ES6 MODULE)
   ========================================================================== */

import { supabase } from '../assets/js/config/supabase-config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUsd(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function resolveRecordUsd(row) {
  if (row.monto_usd !== undefined && row.monto_usd !== null) return Number(row.monto_usd);
  if (row.amount_usd !== undefined && row.amount_usd !== null) return Number(row.amount_usd);
  const amount = Number(row.amount || row.monto || 0);
  const currency = String(row.currency || 'USD').toUpperCase();
  if (currency === 'USD') return amount;
  const rate = Number(row.exchange_rate || 1);
  return rate > 0 ? amount / rate : amount;
}

// ---------------------------------------------------------------------------
// Cálculo de estadísticas (misma lógica que loadFarms en agro-farms.js)
// ---------------------------------------------------------------------------

async function computeFarmStats(userId) {
  // 1. Fincas
  const { data: farms, error: farmsError } = await supabase
    .from('agro_farms')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });
  if (farmsError) throw farmsError;

  // 2. Cultivos
  const { data: crops, error: cropsError } = await supabase
    .from('agro_crops')
    .select('id, farm_id, status, investment')
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (cropsError) throw cropsError;

  // 3. Gastos e ingresos por crop_id
  const { data: expenses, error: expError } = await supabase
    .from('agro_expenses')
    .select('crop_id, amount, currency, exchange_rate, monto_usd')
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (expError) throw expError;

  const { data: incomes, error: incError } = await supabase
    .from('agro_income')
    .select('crop_id, monto, currency, exchange_rate, monto_usd')
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (incError) throw incError;

  // 4. Ciclos operativos (hard delete — sin deleted_at)
  const { data: opCycles, error: opCyclesError } = await supabase
    .from('agro_operational_cycles')
    .select('id, farm_id')
    .eq('user_id', userId)
    .not('farm_id', 'is', null);
  if (opCyclesError) throw opCyclesError;

  // 5. Movimientos de ciclos operativos
  const cycleIds = (opCycles || []).map(c => c.id);
  let opMovements = [];
  if (cycleIds.length > 0) {
    const { data: movementsData, error: movementsError } = await supabase
      .from('agro_operational_movements')
      .select('cycle_id, direction, amount, currency, amount_usd, exchange_rate')
      .eq('user_id', userId)
      .in('cycle_id', cycleIds);
    if (movementsError) throw movementsError;
    opMovements = movementsData || [];
  }

  // 6. Gastos generales de finca (sin crop_id)
  const { data: farmExpenses, error: farmExpError } = await supabase
    .from('agro_expenses')
    .select('farm_id, amount, currency, exchange_rate, monto_usd')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .is('crop_id', null)
    .not('farm_id', 'is', null);
  if (farmExpError) throw farmExpError;

  // 7. Ingresos generales de finca (sin crop_id)
  const { data: farmIncomes, error: farmIncError } = await supabase
    .from('agro_income')
    .select('farm_id, monto, currency, exchange_rate, monto_usd')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .is('crop_id', null)
    .not('farm_id', 'is', null);
  if (farmIncError) throw farmIncError;

  // 8. Mapear gastos/ingresos por crop_id
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

  // 9. Inicializar statsMap
  const statsMap = new Map();
  (farms || []).forEach(f => {
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

  // 10. Cultivos
  (crops || []).forEach(c => {
    if (!c.farm_id || !statsMap.has(c.farm_id)) return;
    const s = statsMap.get(c.farm_id);
    s.totalCrops++;
    const isActive = c.status !== 'finalizado' && c.status !== 'lost';
    if (isActive) s.activeCrops++;
    s.totalExpenses += (expMap.get(c.id) || 0) + (Number(c.investment) || 0);
    s.totalIncome += incMap.get(c.id) || 0;
    s.balance = s.totalIncome - s.totalExpenses;
  });

  // 11. Ciclos operativos → movimientos
  const cycleFarmMap = new Map();
  (opCycles || []).forEach(c => cycleFarmMap.set(c.id, c.farm_id));

  (opMovements || []).forEach(mov => {
    const farmId = cycleFarmMap.get(mov.cycle_id);
    if (!farmId || !statsMap.has(farmId)) return;
    const s = statsMap.get(farmId);
    const amount = resolveRecordUsd(mov);
    if (mov.direction === 'in') {
      s.totalIncome += amount;
      s.generalIncomes += amount;
    } else {
      s.totalExpenses += amount;
      s.generalExpenses += amount;
    }
    s.balance = s.totalIncome - s.totalExpenses;
  });

  (opCycles || []).forEach(c => {
    if (!statsMap.has(c.farm_id)) return;
    statsMap.get(c.farm_id).operationalCycles++;
  });

  // 12. Gastos generales de finca
  (farmExpenses || []).forEach(expense => {
    if (!expense.farm_id || !statsMap.has(expense.farm_id)) return;
    const s = statsMap.get(expense.farm_id);
    const amount = resolveRecordUsd(expense);
    s.totalExpenses += amount;
    s.generalExpenses += amount;
    s.balance = s.totalIncome - s.totalExpenses;
  });

  // 13. Ingresos generales de finca
  (farmIncomes || []).forEach(income => {
    if (!income.farm_id || !statsMap.has(income.farm_id)) return;
    const s = statsMap.get(income.farm_id);
    const amount = resolveRecordUsd(income);
    s.totalIncome += amount;
    s.generalIncomes += amount;
    s.balance = s.totalIncome - s.totalExpenses;
  });

  return { farms: farms || [], statsMap };
}

// ---------------------------------------------------------------------------
// Generación de lectura humana
// ---------------------------------------------------------------------------

function generateInsight(s1, s2, name1, name2) {
  const parts = [];

  // Ingresos
  if (s1.totalIncome > s2.totalIncome * 1.5) {
    parts.push(`${name1} generó significativamente más ingresos (${formatUsd(s1.totalIncome)}) que ${name2} (${formatUsd(s2.totalIncome)}).`);
  } else if (s2.totalIncome > s1.totalIncome * 1.5) {
    parts.push(`${name2} generó significativamente más ingresos (${formatUsd(s2.totalIncome)}) que ${name1} (${formatUsd(s1.totalIncome)}).`);
  } else if (s1.totalIncome > 0 || s2.totalIncome > 0) {
    parts.push(`Ambas fincas tienen ingresos similares.`);
  }

  // Balance
  if (s1.balance !== s2.balance) {
    const winner = s1.balance > s2.balance ? name1 : name2;
    const winVal = s1.balance > s2.balance ? s1.balance : s2.balance;
    const loseVal = s1.balance > s2.balance ? s2.balance : s1.balance;
    parts.push(`${winner} tiene mejor balance neto (${formatUsd(winVal)} vs ${formatUsd(loseVal)}).`);
  }

  // Ciclos operativos
  if (s1.operationalCycles > 0 || s2.operationalCycles > 0) {
    parts.push(`${name1} tiene ${s1.operationalCycles} ciclo(s) operativo(s), ${name2} tiene ${s2.operationalCycles}.`);
  }

  // Cultivos
  if (s1.totalCrops !== s2.totalCrops) {
    const more = s1.totalCrops > s2.totalCrops ? name1 : name2;
    parts.push(`${more} tiene más cultivos registrados (${Math.max(s1.totalCrops, s2.totalCrops)} vs ${Math.min(s1.totalCrops, s2.totalCrops)}).`);
  }

  // Eficiencia (gasto vs ingreso)
  if (s1.totalExpenses > 0 && s2.totalExpenses > 0) {
    const roi1 = s1.totalIncome / s1.totalExpenses;
    const roi2 = s2.totalIncome / s2.totalExpenses;
    if (roi1 > roi2 * 1.2) {
      parts.push(`${name1} muestra mejor retorno sobre inversión (${(roi1 * 100).toFixed(0)}% vs ${(roi2 * 100).toFixed(0)}%).`);
    } else if (roi2 > roi1 * 1.2) {
      parts.push(`${name2} muestra mejor retorno sobre inversión (${(roi2 * 100).toFixed(0)}% vs ${(roi1 * 100).toFixed(0)}%).`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : 'Ambas fincas tienen métricas similares en este momento.';
}

// ---------------------------------------------------------------------------
// Renderizado
// ---------------------------------------------------------------------------

function renderCompareTable(stats1, stats2, name1, name2) {
  const metrics = [
    { label: 'Cultivos totales', key: 'totalCrops', format: v => v },
    { label: 'Cultivos activos', key: 'activeCrops', format: v => v },
    { label: 'Ciclos operativos', key: 'operationalCycles', format: v => v },
    { label: 'Inversión total', key: 'totalExpenses', format: formatUsd, higherIs: 'worse' },
    { label: 'Ingresos totales', key: 'totalIncome', format: formatUsd, higherIs: 'better' },
    { label: 'Gastos generales', key: 'generalExpenses', format: formatUsd, higherIs: 'worse' },
    { label: 'Ingresos generales', key: 'generalIncomes', format: formatUsd, higherIs: 'better' },
    { label: 'Balance neto', key: 'balance', format: formatUsd, higherIs: 'better' }
  ];

  let rows = '';
  metrics.forEach(m => {
    const v1 = stats1[m.key];
    const v2 = stats2[m.key];
    const num1 = typeof v1 === 'number' ? v1 : 0;
    const num2 = typeof v2 === 'number' ? v2 : 0;

    let cls1 = '';
    let cls2 = '';
    if (num1 !== num2 && m.higherIs) {
      const better = m.higherIs === 'better' ? Math.max(num1, num2) : Math.min(num1, num2);
      if (num1 === better) cls1 = 'farm-compare-winner';
      else cls2 = 'farm-compare-winner';
      // Marcar el peor como loser solo para métricas financieras claras
      if (m.key === 'balance' || m.key === 'totalIncome') {
        if (num1 !== better) cls1 = 'farm-compare-loser';
        else cls2 = 'farm-compare-loser';
      }
    }

    rows += `
      <tr>
        <td>${m.label}</td>
        <td class="${cls1}">${m.format(v1)}</td>
        <td class="${cls2}">${m.format(v2)}</td>
      </tr>`;
  });

  const insight = generateInsight(stats1, stats2, name1, name2);

  return `
    <table class="farm-compare-table">
      <thead>
        <tr>
          <th>Métrica</th>
          <th>${escapeHtml(name1)}</th>
          <th>${escapeHtml(name2)}</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="farm-compare-insight">
      <p class="farm-compare-insight__title">
        <i class="fa-solid fa-lightbulb" aria-hidden="true"></i> Lectura comparativa
      </p>
      <p>${escapeHtml(insight)}</p>
    </div>`;
}

// ---------------------------------------------------------------------------
// Vista principal
// ---------------------------------------------------------------------------

export async function renderFarmCompareView() {
  const root = document.getElementById('agro-farms-root');
  if (!root) return;

  root.innerHTML = `
    <div class="farm-compare-loading">
      <i class="fa-solid fa-spinner fa-spin fa-2x" aria-hidden="true"></i>
    </div>`;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No se pudo obtener el usuario de la sesión.');

    const { farms, statsMap } = await computeFarmStats(user.id);

    if (farms.length < 2) {
      root.innerHTML = `
        <div class="farm-compare-empty">
          <div class="farm-compare-empty__icon"><i class="fa-solid fa-scale-balanced" aria-hidden="true"></i></div>
          <p class="farm-compare-empty__title">Necesitas al menos 2 fincas</p>
          <p class="farm-compare-empty__copy">Crea otra finca para habilitar la comparación lado a lado.</p>
        </div>`;
      appendBackButton(root);
      return;
    }

    // Renderizar selectores + contenedor de resultados
    let optionsHtml = '';
    farms.forEach((f, i) => {
      const label = escapeHtml(f.name) + (f.is_default ? ' (Principal)' : '');
      optionsHtml += `<option value="${escapeHtml(f.id)}">${label}</option>`;
    });

    // Pre-seleccionar las primeras 2 fincas distintas
    const defaultId1 = farms[0]?.id || '';
    const defaultId2 = farms[1]?.id || '';

    root.innerHTML = `
      <div class="farm-compare-selectors">
        <div class="farm-compare-select-wrapper">
          <label class="farm-compare-select-label" for="farm-compare-sel-1">Finca A</label>
          <select class="farm-compare-select" id="farm-compare-sel-1">
            ${optionsHtml}
          </select>
        </div>
        <span class="farm-compare-vs">vs</span>
        <div class="farm-compare-select-wrapper">
          <label class="farm-compare-select-label" for="farm-compare-sel-2">Finca B</label>
          <select class="farm-compare-select" id="farm-compare-sel-2">
            ${optionsHtml}
          </select>
        </div>
      </div>

      <div id="farm-compare-results"></div>`;

    // Pre-seleccionar
    const sel1 = document.getElementById('farm-compare-sel-1');
    const sel2 = document.getElementById('farm-compare-sel-2');
    sel1.value = defaultId1;
    sel2.value = defaultId2;

    // Actualizar contextbar
    const contextTitle = document.querySelector('[data-agro-mobile-context-title]');
    if (contextTitle) contextTitle.textContent = 'Comparar Fincas';

    // Función de renderizado al cambiar selectores
    const renderResults = () => {
      const id1 = sel1.value;
      const id2 = sel2.value;
      const container = document.getElementById('farm-compare-results');
      if (!container) return;

      if (!id1 || !id2) {
        container.innerHTML = `
          <div class="farm-compare-empty">
            <div class="farm-compare-empty__icon"><i class="fa-solid fa-hand-pointer" aria-hidden="true"></i></div>
            <p class="farm-compare-empty__title">Selecciona dos fincas</p>
            <p class="farm-compare-empty__copy">Elige una finca en cada selector para comparar.</p>
          </div>`;
        return;
      }

      if (id1 === id2) {
        container.innerHTML = `
          <div class="farm-compare-empty">
            <div class="farm-compare-empty__icon"><i class="fa-solid fa-clone" aria-hidden="true"></i></div>
            <p class="farm-compare-empty__title">Selecciona fincas diferentes</p>
            <p class="farm-compare-empty__copy">Elige dos fincas distintas para comparar sus métricas.</p>
          </div>`;
        return;
      }

      const farm1 = farms.find(f => f.id === id1);
      const farm2 = farms.find(f => f.id === id2);
      const stats1 = statsMap.get(id1);
      const stats2 = statsMap.get(id2);

      if (!farm1 || !farm2 || !stats1 || !stats2) {
        container.innerHTML = '<p style="color:var(--text-secondary)">Error: no se encontraron datos de las fincas seleccionadas.</p>';
        return;
      }

      container.innerHTML = renderCompareTable(stats1, stats2, farm1.name, farm2.name);
    };

    sel1.addEventListener('change', renderResults);
    sel2.addEventListener('change', renderResults);

    // Renderizar con la selección inicial
    renderResults();

  } catch (err) {
    console.error('[AGRO_FARM_COMPARE] Error:', err);
    const safeMessage = escapeHtml(err.message || 'No se pudieron cargar los datos.');
    root.innerHTML = `
      <div class="farm-compare-empty" style="border-color: color-mix(in srgb, var(--color-error) 45%, var(--border-neutral));">
        <div class="farm-compare-empty__icon" style="color:var(--color-error)"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></div>
        <p class="farm-compare-empty__title" style="color:var(--color-error)">Error de Carga</p>
        <p class="farm-compare-empty__copy">${safeMessage}</p>
      </div>`;
    appendBackButton(root);
  }
}

function appendBackButton(root) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'farm-compare-back';
  btn.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Volver a Mis Fincas';
  btn.style.marginTop = '1rem';
  btn.addEventListener('click', () => {
    if (window._agroFarms && typeof window._agroFarms.loadFarms === 'function') {
      window._agroFarms.loadFarms();
    }
  });
  root.appendChild(btn);
}
