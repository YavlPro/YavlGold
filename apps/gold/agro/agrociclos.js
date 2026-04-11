// agrociclos.js — Componente Ciclos de Cultivo V10
// Responsabilidad: renderizar tarjetas de ciclos activos.

import supabase from '../assets/js/config/supabase-config.js';

const OPERATIONAL_PORTFOLIO_UPDATED_EVENT = 'agro:operational-portfolio-updated';
const BUYER_PORTFOLIO_STATE_UPDATED_EVENT = 'agro:buyer-portfolio-state-updated';
let isOperationalPortfolioSyncBound = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function statusClassFor(state) {
  const token = normalizeToken(state);
  if (token === 'produccion') return 'status-produccion';
  if (token === 'siembra') return 'status-siembra';
  if (token === 'cosecha') return 'status-cosecha';
  if (token === 'finalizado' || token === 'cosechado' || token === 'completado') return 'status-finalizado';
  if (token === 'perdido' || token === 'fallido') return 'status-perdido';
  return 'status-produccion';
}

function resolveCarteraVivaStatus(fiadosUsd) {
  const globalState = readBuyerPortfolioState();
  if (globalState?.known === true) {
    return globalState.hasActivePending
      ? { label: 'Cartera viva abierta', tone: 'active' }
      : { label: 'Cartera viva cerrada', tone: 'closed' };
  }

  const pending = Number(fiadosUsd);
  if (!Number.isFinite(pending)) return null;
  return pending > 0
    ? { label: 'Cartera viva abierta', tone: 'active' }
    : { label: 'Cartera viva cerrada', tone: 'closed' };
}

function readBuyerPortfolioState() {
  if (typeof window === 'undefined') return null;

  try {
    const api = window._agroBuyerPortfolioState;
    if (typeof api?.getState !== 'function') return null;
    const snapshot = api.getState();
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
  } catch (error) {
    console.warn('[agrociclos] No se pudo leer estado global de Cartera Viva:', error);
    return null;
  }
}

function resolveAllPortfolioBadges(ciclo) {
  const carteraViva = resolveCarteraVivaStatus(ciclo?.fiadosUsd);
  return { carteraViva };
}

function syncOperationalPortfolioBadges(root = document) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll('.crop-card[data-crop-id]').forEach((card) => {
    const statusGroup = card.querySelector('.card-status-group');
    if (!statusGroup) return;

    const carteraViva = resolveCarteraVivaStatus(card.dataset.fiadosUsd);

    syncSingleBadge(statusGroup, 'portfolio-badge--cv', carteraViva);
  });
}

function syncSingleBadge(container, marker, status) {
  const existing = container.querySelector(`.${marker}`);
  if (!status) {
    existing?.remove();
    return;
  }
  const badge = existing || document.createElement('span');
  badge.className = `portfolio-badge portfolio-badge--${escapeAttr(status.tone)} ${marker}`;
  badge.textContent = status.label;
  if (!existing) {
    container.appendChild(badge);
  }
}

function bindOperationalPortfolioSync() {
  if (isOperationalPortfolioSyncBound || typeof window === 'undefined') return;
  isOperationalPortfolioSyncBound = true;
  window.addEventListener(OPERATIONAL_PORTFOLIO_UPDATED_EVENT, () => {
    syncOperationalPortfolioBadges(document);
  });
  window.addEventListener(BUYER_PORTFOLIO_STATE_UPDATED_EVENT, () => {
    syncOperationalPortfolioBadges(document);
  });
}

function formatUsdCompact(value) {
  const amount = Math.abs(toNumber(value, 0));
  return amount.toLocaleString('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatSignedUsd(value) {
  const number = toNumber(value, 0);
  const sign = number >= 0 ? '+' : '-';
  return `${sign}${formatUsdCompact(number)}`;
}

function resolveProgress(ciclo) {
  if (Number.isFinite(Number(ciclo?.porcentaje))) {
    return clamp(Math.round(Number(ciclo.porcentaje)), 0, 100);
  }
  const actual = toNumber(ciclo?.diaActual, 0);
  const total = toNumber(ciclo?.diasTotales, 0);
  if (!total) return 0;
  return clamp(Math.round((actual / total) * 100), 0, 100);
}

function buildActions(ciclo) {
  const id = String(ciclo?.id || '').trim();
  if (!id) return '';
  const isAudit = ciclo?.isAuditCard === true;
  const orphanAttr = ciclo?.isAuditCard ? ' data-crop-orphan="1"' : '';
  const disabledAttr = isAudit ? ' disabled' : '';
  const disabledClass = isAudit ? ' crop-action-disabled' : '';
  const disabledTitle = ' title="No disponible para ciclos huérfanos"';

  return `
    <div class="cycle-actions">
      <button type="button" class="cycle-action btn-report-crop" data-id="${escapeAttr(id)}"${orphanAttr} title="Informe del Cultivo" aria-label="Informe del cultivo">
        <i class="fa-solid fa-chart-bar" aria-hidden="true"></i>
      </button>
      <button type="button" class="cycle-action btn-edit-crop${disabledClass}" data-id="${escapeAttr(id)}"${disabledAttr}${isAudit ? disabledTitle : ' title="Editar Cultivo"'} aria-label="Editar cultivo">
        <i class="fa-solid fa-pen" aria-hidden="true"></i>
      </button>
      <button type="button" class="cycle-action btn-delete-crop${disabledClass}" data-id="${escapeAttr(id)}"${disabledAttr}${isAudit ? disabledTitle : ' title="Eliminar Cultivo"'} aria-label="Eliminar cultivo">
        <i class="fa-solid fa-trash" aria-hidden="true"></i>
      </button>
    </div>
  `;
}

function renderGlobalUnitChips(globalBreakdown) {
  const chips = Array.isArray(globalBreakdown?.unitChips) ? globalBreakdown.unitChips : [];
  if (!chips.length) return '';
  return `
    <div class="desglose-global-units">
      ${chips.map((chipText) => `<span class="desglose-unit-chip">${escapeHtml(chipText)}</span>`).join('')}
    </div>
  `;
}

function renderGlobalBreakdown(ciclo) {
  const globalBreakdown = ciclo?.globalBreakdown;
  const cycleCount = Number(globalBreakdown?.cycleCount || 0);
  if (!globalBreakdown || cycleCount <= 0) return '';

  const cycleLabel = cycleCount === 1 ? 'ciclo' : 'ciclos';
  const cropTypeLabel = String(globalBreakdown?.typeLabel || ciclo?.nombre || 'Cultivo');
  const titleText = `Global — ${cropTypeLabel} (${cycleCount} ${cycleLabel})`;
  const baseText = String(globalBreakdown?.base || 'N/D');
  const gastosText = String(globalBreakdown?.gastos || 'N/D');
  const pagadosText = String(globalBreakdown?.pagados || 'N/D');
  const costosText = String(globalBreakdown?.costos || 'N/D');
  const fiadosText = String(globalBreakdown?.fiados || 'N/D');

  return `
    <section class="desglose-global" data-global-breakdown="1">
      <div class="desglose-global-title">${escapeHtml(titleText)}</div>
      ${renderGlobalUnitChips(globalBreakdown)}
      <div class="desglose-row">
        <span>Base inversión multimoneda</span>
        <span data-money="1" data-raw-money="${escapeAttr(baseText)}">${escapeHtml(baseText)}</span>
      </div>
      <div class="desglose-row">
        <span>Gastos acumulados</span>
        <span data-money="1" data-raw-money="${escapeAttr(gastosText)}">${escapeHtml(gastosText)}</span>
      </div>
      <div class="desglose-row">
        <span>Pagados</span>
        <span data-money="1" data-raw-money="${escapeAttr(pagadosText)}">${escapeHtml(pagadosText)}</span>
      </div>
      <div class="desglose-row">
        <span>Costos</span>
        <span data-money="1" data-raw-money="${escapeAttr(costosText)}">${escapeHtml(costosText)}</span>
      </div>
      <div class="desglose-row">
        <span>Fiados</span>
        <span data-money="1" data-raw-money="${escapeAttr(fiadosText)}">${escapeHtml(fiadosText)}</span>
      </div>
    </section>
  `;
}

function renderBreakdownMoneyRow(label, rawValue) {
  const safeValue = String(rawValue || 'N/D');
  return `
    <div class="desglose-row">
      <span>${escapeHtml(label)}</span>
      <span data-money="1" data-raw-money="${escapeAttr(safeValue)}">${escapeHtml(safeValue)}</span>
    </div>
  `;
}

function renderBreakdownSectionSummary(items = []) {
  const rows = (Array.isArray(items) ? items : []).filter((item) => item && item.label && item.value);
  if (!rows.length) return '';
  return `
    <div class="desglose-section-meta">
      ${rows.map((item) => `
        <span class="desglose-section-chip">
          <span class="desglose-section-chip__label">${escapeHtml(item.label)}</span>
          <span class="desglose-section-chip__value" data-money="1" data-raw-money="${escapeAttr(item.value)}">${escapeHtml(item.value)}</span>
        </span>
      `).join('')}
    </div>
  `;
}

function renderBreakdownSection(options = {}) {
  const title = String(options.title || '').trim();
  const subtitle = String(options.subtitle || '').trim();
  const bodyMarkup = String(options.bodyMarkup || '').trim();
  if (!title || !bodyMarkup) return '';

  const defaultOpen = options.defaultOpen !== false;
  const openAttr = defaultOpen ? ' open' : '';
  const summaryMarkup = renderBreakdownSectionSummary(options.summaryItems);
  const modifierClass = String(options.modifierClass || '').trim();

  return `
    <details class="desglose-section${modifierClass ? ` ${modifierClass}` : ''}"${openAttr}>
      <summary class="desglose-section-toggle">
        <span class="desglose-section-heading">
          <span class="desglose-section-title">${escapeHtml(title)}</span>
          ${subtitle ? `<span class="desglose-section-subtitle">${escapeHtml(subtitle)}</span>` : ''}
        </span>
        ${summaryMarkup}
        <svg class="desglose-section-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </summary>
      <div class="desglose-section-shell">
        <div class="desglose-section-body">
          ${bodyMarkup}
        </div>
      </div>
    </details>
  `;
}

function renderCard(ciclo, index = 0) {
  const mode = String(ciclo?.mode || 'active').trim().toLowerCase() === 'finished'
    ? 'finished'
    : 'active';
  const porcentaje = mode === 'finished' ? 100 : resolveProgress(ciclo);
  const esPositivo = toNumber(ciclo?.rentabilidad, 0) >= 0;
  const netoPositivo = toNumber(ciclo?.potencialNeto, 0) >= 0;
  const statusClass = statusClassFor(ciclo?.estado);
  const rentabilidadText = formatSignedUsd(ciclo?.rentabilidad);
  const potencialText = formatSignedUsd(ciclo?.potencialNeto);
  const inversionText = formatUsdCompact(ciclo?.inversionUSD);
  const trendIcon = esPositivo ? '↗' : '↘';
  const profitLabel = mode === 'finished' ? 'Rentabilidad Final' : 'Potencial Neto';
  const badges = resolveAllPortfolioBadges(ciclo);
  const progressText = mode === 'finished'
    ? 'Completado'
    : `Día ${toNumber(ciclo?.diaActual, 0)}/${toNumber(ciclo?.diasTotales, 0)} (${porcentaje}%)`;
  const progressClass = mode === 'finished' ? 'progress-track progress-complete' : 'progress-track';
  const dataId = String(ciclo?.id || '').trim();
  const orphanData = ciclo?.isAuditCard ? ' data-crop-orphan="1"' : '';

  const desglose = ciclo?.desglose || {};
  const desgloseBase = String(desglose.base || 'N/D');
  const desgloseGastos = String(desglose.gastos || 'N/D');
  const desgloseGastosDirectos = String(desglose.gastosDirectos || 'N/D');
  const desglosePagados = String(desglose.pagados || 'N/D');
  const desgloseCostos = String(desglose.costos || 'N/D');
  const desgloseFiados = String(desglose.fiados || 'N/D');
  const desglosePerdidasCarteraViva = String(desglose.perdidasCarteraViva || 'N/D');
  const desgloseCotizacion = String(desglose.cotizacion || 'N/D');
  const globalBreakdownMarkup = renderGlobalBreakdown(ciclo);
  const baseInvestmentUsd = toNumber(ciclo?.baseInvestmentUsd, 0);
  const directGastosUsd = toNumber(ciclo?.directGastosUsd, 0);
  const pagadosUsd = toNumber(ciclo?.pagadosUsd, 0);
  const fiadosUsd = toNumber(ciclo?.fiadosUsd, 0);
  const perdidasUsd = toNumber(ciclo?.perdidasUsd, 0);
  const carteraVivaTotal = baseInvestmentUsd + directGastosUsd + perdidasUsd;
  const carteraVivaRows = [
    renderBreakdownMoneyRow('Base inversión multimoneda', desgloseBase),
    renderBreakdownMoneyRow('Gastos directos del cultivo', desgloseGastosDirectos),
    renderBreakdownMoneyRow('Pagados cartera viva', desglosePagados),
    renderBreakdownMoneyRow('Fiados cartera viva', desgloseFiados),
    renderBreakdownMoneyRow('Pérdidas cartera viva', desglosePerdidasCarteraViva)
  ];
  if (globalBreakdownMarkup) {
    carteraVivaRows.push(globalBreakdownMarkup);
  }
  carteraVivaRows.push(`
    <div class="desglose-row cotizacion">
      <span>${escapeHtml(desgloseCotizacion)}</span>
    </div>
  `);
  const carteraVivaIsShort = carteraVivaRows.length <= 5;
  const breakdownSectionsMarkup = `
    <div class="desglose-summary">
      ${renderBreakdownMoneyRow('Gastos totales del cultivo', desgloseGastos)}
      ${renderBreakdownMoneyRow('Costos combinados del ciclo', desgloseCostos)}
    </div>
    ${renderBreakdownSection({
      title: 'Cartera Viva',
      subtitle: 'Facturación histórica del ciclo',
      modifierClass: 'is-viva',
      defaultOpen: carteraVivaIsShort,
      summaryItems: [
        { label: 'Total', value: formatUsdCompact(carteraVivaTotal) },
        { label: 'Pagado', value: formatUsdCompact(pagadosUsd) },
        { label: 'Fiado', value: formatUsdCompact(fiadosUsd) }
      ],
      bodyMarkup: carteraVivaRows.join('')
    })}
  `;

  return `
    <article class="cycle-card crop-card" data-crop-id="${escapeAttr(dataId)}" data-fiados-usd="${escapeAttr(ciclo?.fiadosUsd ?? '')}"${orphanData} style="animation-delay:${index * 70}ms;">
      <header class="card-header">
        <div class="crop-info">
          <div class="crop-icon">${escapeHtml(ciclo?.icono || '🌱')}</div>
          <div class="crop-text">
            <h3 class="crop-name">${escapeHtml(ciclo?.nombre || 'Cultivo')}</h3>
            <span class="crop-variety">${escapeHtml(ciclo?.variedad || 'Sin variedad')} · ${escapeHtml(ciclo?.area || 'N/A')}</span>
          </div>
        </div>

        <div class="card-header-side">
          <div class="card-status-group">
            <span class="status-badge ${statusClass}">${escapeHtml(ciclo?.estadoTexto || 'En producción')}</span>
            ${badges.carteraViva ? `<span class="portfolio-badge portfolio-badge--${escapeAttr(badges.carteraViva.tone)} portfolio-badge--cv">${escapeHtml(badges.carteraViva.label)}</span>` : ''}
          </div>
          ${buildActions(ciclo)}
        </div>
      </header>

      <div class="progress-section">
        <div class="progress-meta">
          <span class="progress-label">Progreso</span>
          <span class="progress-days">${escapeHtml(progressText)}</span>
        </div>
        <div class="${progressClass}">
          <div class="progress-fill" style="width:${porcentaje}%">
            <span class="progress-dot"></span>
          </div>
        </div>
      </div>

      <div class="data-grid">
        <div class="data-cell">
          <span class="data-label">Siembra</span>
          <span class="data-value">${escapeHtml(ciclo?.siembra || 'N/A')}</span>
        </div>
        <div class="data-cell">
          <span class="data-label">Cosecha Est.</span>
          <span class="data-value">${escapeHtml(ciclo?.cosechaEst || 'N/A')}</span>
        </div>
        <div class="data-cell">
          <span class="data-label">Inversión USD</span>
          <span class="data-value gold" data-money="1" data-raw-money="${escapeAttr(inversionText)}">${escapeHtml(inversionText)}</span>
        </div>
        <div class="data-cell">
          <span class="data-label">Rentabilidad</span>
          <span class="data-value ${esPositivo ? 'success' : 'error'}" data-money="1" data-raw-money="${escapeAttr(rentabilidadText)}">${trendIcon} ${escapeHtml(rentabilidadText)}</span>
        </div>
      </div>

      <div class="profit-row">
        <span class="profit-label">${profitLabel}</span>
        <span class="profit-value ${netoPositivo ? 'success' : 'error'}" data-money="1" data-raw-money="${escapeAttr(potencialText)}">${escapeHtml(potencialText)}</span>
      </div>

      <details class="desglose">
        <summary class="desglose-toggle">
          <span>Ver desglose financiero</span>
          <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </summary>
        <div class="desglose-body">
          ${breakdownSectionsMarkup}
        </div>
      </details>
    </article>
  `;
}

function renderEmpty(text = 'No hay ciclos activos') {
  return `
    <div class="cycles-empty">
      <span class="cycles-empty-icon">🌱</span>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

export function renderCycleCards(container, cycles = [], options = {}) {
  if (!container) return;
  bindOperationalPortfolioSync();
  const modeFromOptions = options.mode == null
    ? ''
    : String(options.mode).trim().toLowerCase();
  const mode = modeFromOptions === 'finished'
    ? 'finished'
    : (modeFromOptions === 'active' ? 'active' : '');
  const rows = (Array.isArray(cycles) ? cycles : [])
    .filter(Boolean)
    .map((cycle) => ({
      ...cycle,
      mode: mode || String(cycle?.mode || 'active').trim().toLowerCase()
    }));
  const emptyText = options.emptyStateText || 'No hay ciclos activos';
  container.classList.add('agro-cycles');
  container.classList.toggle('agro-cycles--finished', mode === 'finished');

  if (rows.length === 0) {
    container.innerHTML = renderEmpty(emptyText);
    return;
  }

  container.innerHTML = `
    <div class="cycles-list">
      ${rows.map((ciclo, index) => renderCard(ciclo, index)).join('')}
    </div>
  `;
  syncOperationalPortfolioBadges(container);
}

export function renderFinishedCycles(container, cycles, options = {}) {
  return renderCycleCards(container, cycles, {
    ...options,
    mode: 'finished',
    emptyStateText: options.emptyStateText || 'No hay ciclos finalizados'
  });
}

function mapDbRowToCycle(row) {
  const areaValue = Number(row?.area_size);
  const areaText = Number.isFinite(areaValue) ? `${areaValue} Ha` : 'N/A';
  return {
    id: row?.id || '',
    nombre: row?.name || 'Cultivo',
    variedad: row?.variety || 'Sin variedad',
    icono: row?.icon || '🌱',
    estado: 'produccion',
    estadoTexto: row?.status || 'En producción',
    area: areaText,
    siembra: row?.start_date || 'N/A',
    cosechaEst: row?.expected_harvest_date || 'N/A',
    diaActual: 0,
    diasTotales: Number(row?.cycle_days) || 0,
    porcentaje: 0,
    inversionUSD: Number(row?.investment_usd_equiv ?? row?.investment ?? 0) || 0,
    rentabilidad: 0,
    potencialNeto: 0,
    desglose: {
      base: 'N/D',
      gastos: 'N/D',
      pagados: 'N/D',
      costos: 'N/D',
      fiados: 'N/D',
      cotizacion: 'Cotización no disponible'
    }
  };
}

export async function cargarCiclos(container, options = {}) {
  if (!container) return;

  const emptyStateText = options.emptyStateText || 'No hay ciclos activos';
  const mapRow = typeof options.mapRow === 'function' ? options.mapRow : mapDbRowToCycle;
  const fallbackTable = options.fallbackTable || 'ciclos_cultivo';
  const primaryTable = options.table || 'agro_crops';
  const primarySelect = options.select || 'id,name,variety,icon,status,area_size,start_date,expected_harvest_date,cycle_days,investment,investment_usd_equiv,deleted_at,created_at';

  try {
    let rows = [];
    let queryError = null;

    const primaryRes = await supabase
      .from(primaryTable)
      .select(primarySelect)
      .is('deleted_at', null)
      .order('start_date', { ascending: false });

    if (primaryRes.error) {
      queryError = primaryRes.error;
      const fallbackRes = await supabase
        .from(fallbackTable)
        .select('*')
        .eq('activo', true)
        .order('fecha_siembra', { ascending: false });

      if (fallbackRes.error) {
        throw fallbackRes.error;
      }
      rows = fallbackRes.data || [];
    } else {
      rows = primaryRes.data || [];
    }

    const cycles = rows.map(mapRow).filter(Boolean);
    renderCycleCards(container, cycles, { emptyStateText });

    if (queryError) {
      console.warn('[agrociclos] primary query fallback used:', queryError.message);
    }
  } catch (err) {
    console.error('Error cargando ciclos:', err);
    container.innerHTML = renderEmpty(emptyStateText);
  }
}

export async function initCiclos(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.classList.add('agro-cycles');

  if (Array.isArray(options.cycles)) {
    renderCycleCards(container, options.cycles, {
      emptyStateText: options.emptyStateText
    });
    return;
  }

  await cargarCiclos(container, options);
}
