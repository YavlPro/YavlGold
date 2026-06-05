/* ==========================================================================
   YAVLGOLD AGRO - INFORME MD DE FINCA (VANILLA JS ES6 MODULE)
   Fase 4 del plan estratégico — Cierre del plan de 4 fases.
   ========================================================================== */

import { supabase } from '../assets/js/config/supabase-config.js';
import { readMoneyValuesHidden } from './agro-privacy.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveRecordUsd(row) {
  if (row.monto_usd !== undefined && row.monto_usd !== null) return Number(row.monto_usd);
  if (row.amount_usd !== undefined && row.amount_usd !== null) return Number(row.amount_usd);
  const amount = Number(row.amount || row.monto || 0);
  const currency = String(row.currency || 'USD').toUpperCase();
  if (currency === 'USD') return amount;
  const rate = Number(row.exchange_rate || 1);
  return rate > 0 ? amount / rate : amount;
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

/** Formatea monto respetando privacidad */
function fmtAmount(amount) {
  if (readMoneyValuesHidden()) return '••••';
  return formatUsd(amount);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(text) {
  return String(text || 'finca')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function formatDate(iso) {
  if (!iso) return 'N/D';
  return iso.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Notificación
// ---------------------------------------------------------------------------

function notify(type, title, message = '') {
  if (window.YGUXMessages && typeof window.YGUXMessages.popup === 'function') {
    window.YGUXMessages.popup({ type, title, message });
  } else if (typeof window.showToast === 'function') {
    window.showToast(`${title} ${message}`, type);
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function fetchFarmReportData(userId, farmId) {
  // 1. Finca
  const { data: farm, error: farmError } = await supabase
    .from('agro_farms')
    .select('*')
    .eq('id', farmId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single();
  if (farmError) throw farmError;
  if (!farm) throw new Error('Finca no encontrada.');

  // 2. Cultivos (todos: activos, finalizados, perdidos)
  const { data: crops, error: cropsError } = await supabase
    .from('agro_crops')
    .select('id, name, variety, status, investment, created_at, finished_at')
    .eq('farm_id', farmId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (cropsError) throw cropsError;

  const cropIds = (crops || []).map(c => c.id);

  // 3. Gastos por cultivo
  let cropExpenses = [];
  if (cropIds.length > 0) {
    const { data, error } = await supabase
      .from('agro_expenses')
      .select('crop_id, amount, currency, exchange_rate, monto_usd, category, created_at')
      .eq('user_id', userId)
      .in('crop_id', cropIds)
      .is('deleted_at', null);
    if (error) throw error;
    cropExpenses = data || [];
  }

  // 4. Ingresos por cultivo
  let cropIncomes = [];
  if (cropIds.length > 0) {
    const { data, error } = await supabase
      .from('agro_income')
      .select('crop_id, monto, currency, exchange_rate, monto_usd, created_at')
      .eq('user_id', userId)
      .in('crop_id', cropIds)
      .is('deleted_at', null);
    if (error) throw error;
    cropIncomes = data || [];
  }

  // 5. Ciclos operativos (hard delete — SIN deleted_at)
  const { data: opCycles, error: opCyclesError } = await supabase
    .from('agro_operational_cycles')
    .select('id, name, status, created_at')
    .eq('farm_id', farmId)
    .eq('user_id', userId);
  if (opCyclesError) throw opCyclesError;

  const cycleIds = (opCycles || []).map(c => c.id);

  // 6. Movimientos de ciclos operativos (hard delete)
  let opMovements = [];
  if (cycleIds.length > 0) {
    const { data, error } = await supabase
      .from('agro_operational_movements')
      .select('cycle_id, amount, currency, exchange_rate, amount_usd, direction, concept, created_at')
      .eq('user_id', userId)
      .in('cycle_id', cycleIds);
    if (error) throw error;
    opMovements = data || [];
  }

  // 7. Gastos generales de finca (sin crop_id)
  const { data: farmExpenses, error: fExpError } = await supabase
    .from('agro_expenses')
    .select('amount, currency, exchange_rate, monto_usd, category, concept, created_at')
    .eq('farm_id', farmId)
    .eq('user_id', userId)
    .is('crop_id', null)
    .is('deleted_at', null);
  if (fExpError) throw fExpError;

  // 8. Ingresos generales de finca (sin crop_id)
  const { data: farmIncomes, error: fIncError } = await supabase
    .from('agro_income')
    .select('monto, currency, exchange_rate, monto_usd, concept, created_at')
    .eq('farm_id', farmId)
    .eq('user_id', userId)
    .is('crop_id', null)
    .is('deleted_at', null);
  if (fIncError) throw fIncError;

  return {
    farm,
    crops: crops || [],
    cropExpenses,
    cropIncomes,
    opCycles: opCycles || [],
    opMovements,
    farmExpenses: farmExpenses || [],
    farmIncomes: farmIncomes || []
  };
}

// ---------------------------------------------------------------------------
// Consolidación de estadísticas
// ---------------------------------------------------------------------------

function consolidateStats(data) {
  const { crops, cropExpenses, cropIncomes, opCycles, opMovements, farmExpenses, farmIncomes } = data;

  const stats = {
    totalCrops: crops.length,
    activeCrops: 0,
    finalizedCrops: 0,
    lostCrops: 0,
    totalExpenses: 0,
    totalIncome: 0,
    balance: 0,
    operationalCycles: opCycles.length,
    generalExpenses: 0,
    generalIncomes: 0,
    cropExpensesMap: new Map(),
    cropIncomeMap: new Map(),
    expenseByCategory: new Map()
  };

  // Contar por estado
  crops.forEach(c => {
    if (c.status === 'finalizado') stats.finalizedCrops++;
    else if (c.status === 'lost') stats.lostCrops++;
    else stats.activeCrops++;
  });

  // Gastos por cultivo
  cropExpenses.forEach(e => {
    const usd = resolveRecordUsd(e);
    stats.totalExpenses += usd;
    if (e.crop_id) {
      stats.cropExpensesMap.set(e.crop_id, (stats.cropExpensesMap.get(e.crop_id) || 0) + usd);
    }
    const cat = e.category || 'Sin categoría';
    stats.expenseByCategory.set(cat, (stats.expenseByCategory.get(cat) || 0) + usd);
  });

  // Ingresos por cultivo
  cropIncomes.forEach(i => {
    const usd = resolveRecordUsd(i);
    stats.totalIncome += usd;
    if (i.crop_id) {
      stats.cropIncomeMap.set(i.crop_id, (stats.cropIncomeMap.get(i.crop_id) || 0) + usd);
    }
  });

  // Inversión base de cultivos
  let cropInvestment = 0;
  crops.forEach(c => {
    cropInvestment += Number(c.investment) || 0;
  });
  stats.totalExpenses += cropInvestment;

  // Ciclos operativos → movimientos
  opMovements.forEach(mov => {
    const usd = resolveRecordUsd(mov);
    if (mov.direction === 'in') {
      stats.totalIncome += usd;
      stats.generalIncomes += usd;
    } else {
      stats.totalExpenses += usd;
      stats.generalExpenses += usd;
    }
  });

  // Gastos generales de finca
  farmExpenses.forEach(e => {
    const usd = resolveRecordUsd(e);
    stats.totalExpenses += usd;
    stats.generalExpenses += usd;
    const cat = e.category || 'Sin categoría';
    stats.expenseByCategory.set(cat, (stats.expenseByCategory.get(cat) || 0) + usd);
  });

  // Ingresos generales de finca
  farmIncomes.forEach(i => {
    const usd = resolveRecordUsd(i);
    stats.totalIncome += usd;
    stats.generalIncomes += usd;
  });

  stats.balance = stats.totalIncome - stats.totalExpenses;
  stats.roi = stats.totalExpenses > 0 ? ((stats.totalIncome / stats.totalExpenses) * 100).toFixed(1) : '0.0';

  return stats;
}

// ---------------------------------------------------------------------------
// Generación del Markdown
// ---------------------------------------------------------------------------

function generateMd(data, stats) {
  const { farm, crops, opCycles, opMovements, farmExpenses, farmIncomes } = data;
  const lines = [];

  // Header
  lines.push(`# Informe de Finca: ${farm.name}`);
  lines.push('');
  lines.push(`**Fecha de generación:** ${today()}`);
  if (farm.location_text) lines.push(`**Ubicación:** ${farm.location_text}`);
  lines.push(`**Notas:** ${farm.notes || 'Sin notas'}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Resumen Ejecutivo
  lines.push('## 📊 Resumen Ejecutivo');
  lines.push('');
  lines.push('| Métrica | Valor |');
  lines.push('|---------|-------|');
  lines.push(`| Cultivos totales | ${stats.totalCrops} (${stats.activeCrops} activos, ${stats.finalizedCrops} finalizados, ${stats.lostCrops} perdidos) |`);
  lines.push(`| Ciclos operativos | ${stats.operationalCycles} |`);
  lines.push(`| Inversión total histórica | ${fmtAmount(stats.totalExpenses)} |`);
  lines.push(`| Ingresos totales | ${fmtAmount(stats.totalIncome)} |`);
  lines.push(`| Gastos generales | ${fmtAmount(stats.generalExpenses)} |`);
  lines.push(`| Balance neto | ${fmtAmount(stats.balance)} |`);
  lines.push(`| ROI aproximado | ${readMoneyValuesHidden() ? '••••' : stats.roi + '%'} |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Historia Productiva — Cultivos
  lines.push('## 🌱 Historia Productiva');
  lines.push('');
  lines.push('### Cultivos');
  lines.push('');

  // Activos
  const active = crops.filter(c => c.status !== 'finalizado' && c.status !== 'lost');
  const finalized = crops.filter(c => c.status === 'finalizado');
  const lost = crops.filter(c => c.status === 'lost');

  lines.push(`#### Activos (${active.length})`);
  if (active.length === 0) {
    lines.push('_Sin cultivos activos._');
  } else {
    active.forEach(c => {
      const inv = Number(c.investment) || 0;
      const exp = stats.cropExpensesMap.get(c.id) || 0;
      const inc = stats.cropIncomeMap.get(c.id) || 0;
      const bal = inc - exp - inv;
      const variety = c.variety ? ` (${c.variety})` : '';
      lines.push(`- **${c.name || 'Sin nombre'}**${variety} — Inversión: ${fmtAmount(inv + exp)} — Balance: ${fmtAmount(bal)}`);
    });
  }
  lines.push('');

  // Finalizados
  lines.push(`#### Finalizados (${finalized.length})`);
  if (finalized.length === 0) {
    lines.push('_Sin cultivos finalizados._');
  } else {
    finalized.forEach(c => {
      const inv = Number(c.investment) || 0;
      const exp = stats.cropExpensesMap.get(c.id) || 0;
      const inc = stats.cropIncomeMap.get(c.id) || 0;
      const bal = inc - exp - inv;
      const variety = c.variety ? ` (${c.variety})` : '';
      const fecha = c.finished_at ? ` — Cierre: ${formatDate(c.finished_at)}` : '';
      lines.push(`- **${c.name || 'Sin nombre'}**${variety} — Inversión: ${fmtAmount(inv + exp)} — Ingresos: ${fmtAmount(inc)} — Balance: ${fmtAmount(bal)}${fecha}`);
    });
  }
  lines.push('');

  // Perdidos
  lines.push(`#### Perdidos (${lost.length})`);
  if (lost.length === 0) {
    lines.push('_Sin cultivos perdidos._');
  } else {
    lost.forEach(c => {
      const inv = Number(c.investment) || 0;
      const exp = stats.cropExpensesMap.get(c.id) || 0;
      const variety = c.variety ? ` (${c.variety})` : '';
      lines.push(`- **${c.name || 'Sin nombre'}**${variety} — Inversión perdida: ${fmtAmount(inv + exp)}`);
    });
  }
  lines.push('');

  // Ciclos Operativos
  lines.push(`### Ciclos Operativos (${opCycles.length})`);
  if (opCycles.length === 0) {
    lines.push('_Sin ciclos operativos registrados._');
  } else {
    opCycles.forEach(cycle => {
      const movs = opMovements.filter(m => m.cycle_id === cycle.id);
      let total = 0;
      movs.forEach(m => {
        const usd = resolveRecordUsd(m);
        total += m.direction === 'in' ? usd : -usd;
      });
      lines.push(`- **${cycle.name || 'Sin nombre'}** — ${cycle.status || 'N/D'} — ${fmtAmount(Math.abs(total))} ${total >= 0 ? '(ingreso)' : '(gasto)'} — ${formatDate(cycle.created_at)}`);
    });
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Movimientos Financieros
  lines.push('## 💰 Movimientos Financieros Detallados');
  lines.push('');

  // Gastos por categoría
  lines.push('### Gastos por Categoría');
  if (stats.expenseByCategory.size === 0) {
    lines.push('_Sin gastos registrados._');
  } else {
    lines.push('');
    lines.push('| Categoría | Total USD |');
    lines.push('|-----------|-----------|');
    const sorted = [...stats.expenseByCategory.entries()].sort((a, b) => b[1] - a[1]);
    sorted.forEach(([cat, total]) => {
      lines.push(`| ${cat} | ${fmtAmount(total)} |`);
    });
  }
  lines.push('');

  // Ingresos
  const cropIncomeTotal = stats.totalIncome - stats.generalIncomes;
  lines.push('### Ingresos por Fuente');
  lines.push(`- Total ingresos de cultivos: ${fmtAmount(cropIncomeTotal)}`);
  lines.push(`- Total ingresos generales: ${fmtAmount(stats.generalIncomes)}`);
  lines.push('');

  // Gastos generales de finca
  lines.push('### Gastos Generales de Finca');
  if (farmExpenses.length === 0 && stats.generalExpenses === 0) {
    lines.push('_Sin gastos generales registrados._');
  } else {
    lines.push('');
    lines.push('| Concepto | Monto | Fecha |');
    lines.push('|----------|-------|-------|');
    farmExpenses.forEach(e => {
      const concepto = e.concept || e.category || 'Sin concepto';
      const usd = resolveRecordUsd(e);
      lines.push(`| ${concepto} | ${fmtAmount(usd)} | ${formatDate(e.created_at)} |`);
    });
    // Incluir movimientos de ciclos operativos tipo gasto
    opMovements.filter(m => m.direction === 'out').forEach(m => {
      const usd = resolveRecordUsd(m);
      const concepto = m.concept || 'Ciclo operativo';
      lines.push(`| ${concepto} | ${fmtAmount(usd)} | ${formatDate(m.created_at)} |`);
    });
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Lectura del negocio
  lines.push('## 📈 Lectura del Negocio');
  lines.push('');
  const reading = generateBusinessReading(data, stats);
  lines.push(reading);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Info técnica
  lines.push('## ℹ️ Información Técnica');
  lines.push('');
  lines.push(`- **ID de finca:** ${farm.id}`);
  lines.push(`- **Fecha de creación:** ${formatDate(farm.created_at)}`);
  lines.push('- **Moneda base del informe:** USD');
  lines.push('- **Sistema:** YavlGold Agro V1');
  if (readMoneyValuesHidden()) {
    lines.push('- **Privacidad:** Montos ocultos por configuración del usuario');
  }
  lines.push('');
  lines.push(`*Generado por YavlGold Agro — ${today()}*`);
  lines.push('*Este informe refleja datos reales registrados por el agricultor.*');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Lectura automática del negocio
// ---------------------------------------------------------------------------

function generateBusinessReading(data, stats) {
  const { farm, crops } = data;
  const parts = [];

  // Balance general
  if (stats.balance > 0) {
    parts.push(`La finca **${farm.name}** presenta un balance positivo de ${fmtAmount(stats.balance)}, lo que indica que los ingresos superan la inversión.`);
  } else if (stats.balance < 0) {
    parts.push(`La finca **${farm.name}** muestra un balance negativo de ${fmtAmount(stats.balance)}. Esto puede indicar que está en fase de inversión o que los retornos aún no se han materializado.`);
  } else {
    parts.push(`La finca **${farm.name}** tiene un balance de $0.00. No se registran movimientos financieros hasta el momento.`);
  }

  // ROI
  if (stats.totalExpenses > 0) {
    const roiNum = parseFloat(stats.roi);
    if (roiNum > 100) {
      parts.push(`El retorno sobre inversión es del ${readMoneyValuesHidden() ? '••••' : stats.roi + '%'}, lo cual es positivo y sugiere una operación rentable.`);
    } else if (roiNum > 0) {
      parts.push(`El retorno sobre inversión es del ${readMoneyValuesHidden() ? '••••' : stats.roi + '%'}, aún por debajo del punto de equilibrio.`);
    } else {
      parts.push(`No se han generado ingresos frente a ${fmtAmount(stats.totalExpenses)} en gastos e inversión.`);
    }
  }

  // Cultivo más rentable
  let bestCrop = null;
  let bestBalance = -Infinity;
  let worstCrop = null;
  let worstBalance = Infinity;
  crops.forEach(c => {
    const inv = Number(c.investment) || 0;
    const exp = stats.cropExpensesMap.get(c.id) || 0;
    const inc = stats.cropIncomeMap.get(c.id) || 0;
    const bal = inc - exp - inv;
    if (bal > bestBalance) { bestBalance = bal; bestCrop = c; }
    if (bal < worstBalance) { worstBalance = bal; worstCrop = c; }
  });
  if (bestCrop && bestBalance > 0) {
    parts.push(`El cultivo con mejor rendimiento es **${bestCrop.name}** con un balance de ${fmtAmount(bestBalance)}.`);
  }
  if (worstCrop && worstBalance < 0 && worstCrop !== bestCrop) {
    parts.push(`El cultivo con mayor pérdida es **${worstCrop.name}** con ${fmtAmount(worstBalance)}.`);
  }

  // Ciclos operativos
  if (stats.operationalCycles > 0) {
    parts.push(`Se registran ${stats.operationalCycles} ciclo(s) operativo(s) asociados a esta finca.`);
  }

  // Recomendación
  if (stats.balance < 0 && stats.activeCrops > 0) {
    parts.push('Recomendación: Los cultivos activos aún pueden generar ingresos. Monitorear de cerca los gastos operativos.');
  } else if (stats.totalCrops === 0 && stats.operationalCycles === 0) {
    parts.push('Recomendación: Esta finca no tiene actividad registrada. Considerar agregar cultivos o ciclos operativos.');
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Descarga
// ---------------------------------------------------------------------------

function downloadMarkdown(filename, content) {
  const blob = new Blob(['﻿' + content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Export principal
// ---------------------------------------------------------------------------

export async function exportFarmReportMd(farmId) {
  if (!farmId) {
    notify('error', 'Error', 'No se especificó una finca.');
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No se pudo obtener el usuario de la sesión.');

    const data = await fetchFarmReportData(user.id, farmId);
    const stats = consolidateStats(data);
    const md = generateMd(data, stats);

    const filename = `informe-finca-${slugify(data.farm.name)}-${today()}.md`;
    downloadMarkdown(filename, md);

    notify('success', 'Informe exportado', `Se descargó ${filename}`);

  } catch (err) {
    console.error('[AGRO_FARM_REPORT] Error:', err);
    notify('error', 'Error al exportar', err.message || 'No se pudo generar el informe.');
  }
}
