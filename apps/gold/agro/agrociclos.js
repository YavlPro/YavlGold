// agrociclos.js — Componente Ciclos de Cultivo V10
// Responsabilidad: renderizar tarjetas de ciclos activos.

import supabase from '../assets/js/config/supabase-config.js';
import {
  formatCycleDisplayMoneyFromUsd,
  formatSignedCycleDisplayMoneyFromUsd,
  getCycleDisplayCurrency,
  getCycleDisplayCurrencyLabel,
  getNextCycleDisplayCurrencyLabel,
  initCycleDisplayCurrency,
  rotateCycleDisplayCurrency
} from './agro-display-currency.js';

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
  if (token === 'precultivo') return 'status-precultivo';
  if (token === 'produccion') return 'status-produccion';
  if (token === 'siembra') return 'status-siembra';
  if (token === 'cosecha') return 'status-cosecha';
  if (token === 'finalizado' || token === 'cosechado' || token === 'completado') return 'status-finalizado';
  if (token === 'perdido' || token === 'fallido') return 'status-perdido';
  return 'status-produccion';
}

function resolveCarteraVivaStatus(estado, fiadosUsd) {
  const statusClass = statusClassFor(estado);
  const statusOk = statusClass === 'status-produccion' || statusClass === 'status-finalizado';
  const pending = Number(fiadosUsd);
  if (!statusOk || !Number.isFinite(pending) || pending <= 0) return null;
  return { label: 'Facturero de Clientes abierto', tone: 'active' };
}

function resolveAllPortfolioBadges(ciclo) {
  const carteraViva = resolveCarteraVivaStatus(ciclo?.estado, ciclo?.fiadosUsd);
  return { carteraViva };
}

function syncOperationalPortfolioBadges(root = document) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll('.crop-card[data-crop-id]').forEach((card) => {
    const statusGroup = card.querySelector('.card-status-group');
    if (!statusGroup) return;

    const carteraViva = resolveCarteraVivaStatus(card.dataset.cropStatus, card.dataset.fiadosUsd);

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
  return formatCycleDisplayMoneyFromUsd(value);
}

function formatSignedUsd(value) {
  return formatSignedCycleDisplayMoneyFromUsd(value);
}

// ANEXO 23: formato nativo (misma apariencia que agro-display-currency para
// cada moneda, pero sin pasar por el pivote USD).
function formatNativeAmount(value, currency) {
  const amount = Math.abs(Number(value) || 0);
  if (currency === 'COP') {
    return `COP ${Math.round(amount).toLocaleString('es-CO')}`;
  }
  if (currency === 'VES') {
    return `Bs ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatSignedNativeAmount(value, currency) {
  const sign = Number(value) >= 0 ? '+' : '-';
  return `${sign}${formatNativeAmount(value, currency)}`;
}

// ANEXO 23: cuando el ciclo es monomoneda y la moneda de display coincide,
// el número se toma del total nativo (reconcilia 1:1 con las filas de los
// wizards). Si no coincide, se conserva el camino USD existente.
// ANEXO 23-b: la moneda ACTIVA del toggle la devuelve getCycleDisplayCurrency().
// OJO: normalizeCycleDisplayCurrency() SIN argumento es un normalizador puro
// que siempre devuelve 'USD' (agro-display-currency.js:78-83) — usarlo como
// getter fue el bug residual del ANEXO 23: isNativeActive jamás activaba y
// las 6 líneas caían al camino USD con roundtrip de tasa.
function currentDisplayCurrencyCode() {
  return String(getCycleDisplayCurrency() || 'USD').trim().toUpperCase();
}

function isNativeActive(native) {
  if (!native || !native.currency) return false;
  // Number(null) === 0: validar el valor crudo antes de convertir (lección
  // de la saga factureros — null no es un total nativo válido).
  if (native.value === null || native.value === undefined || native.value === '') return false;
  const value = Number(native.value);
  return Number.isFinite(value) && currentDisplayCurrencyCode() === String(native.currency).toUpperCase();
}

function pickDisplayText(usdValue, native, { signed = false } = {}) {
  if (isNativeActive(native)) {
    return signed
      ? formatSignedNativeAmount(native.value, native.currency)
      : formatNativeAmount(native.value, native.currency);
  }
  return signed ? formatSignedUsd(usdValue) : formatUsdCompact(usdValue);
}

function buildCycleMoneyAttrs(value, displayValue, options = {}) {
  const parsed = Number(value);
  const rawAttr = Number.isFinite(parsed)
    ? ` data-cycle-money-usd="${escapeAttr(parsed)}"`
    : '';
  const signedAttr = options.signed ? ' data-cycle-money-signed="1"' : '';
  const trendAttr = options.trend
    ? ` data-cycle-money-trend="${escapeAttr(options.trend)}"`
    : '';
  const phraseAttr = options.phrase
    ? ` data-cycle-money-phrase="${escapeAttr(options.phrase)}"`
    : '';
  const rentRealAttr = Number.isFinite(Number(options.rentReal))
    ? ` data-cycle-money-rent-real="${escapeAttr(Number(options.rentReal))}"`
    : '';
  const fiadosAttr = Number.isFinite(Number(options.fiados))
    ? ` data-cycle-money-fiados="${escapeAttr(Number(options.fiados))}"`
    : '';
  // ANEXO 23: valor nativo + fiados nativos para el re-render del toggle.
  const native = options.native || null;
  const nativeHasValue = !!(native && native.currency
    && native.value !== null && native.value !== undefined && native.value !== ''
    && Number.isFinite(Number(native.value)));
  const nativeValue = nativeHasValue ? Number(native.value) : null;
  const nativeAttr = nativeHasValue
    ? ` data-cycle-money-native="${escapeAttr(nativeValue)}" data-cycle-money-native-cur="${escapeAttr(String(native.currency).toUpperCase())}"`
    : '';
  const nativeFiados = native && native.fiados !== null && native.fiados !== undefined
    ? Number(native.fiados)
    : null;
  const nativeFiadosAttr = Number.isFinite(nativeFiados)
    ? ` data-cycle-money-native-fiados="${escapeAttr(nativeFiados)}"`
    : '';
  return ` data-money="1" data-raw-money="${escapeAttr(displayValue)}"${rawAttr}${signedAttr}${trendAttr}${phraseAttr}${rentRealAttr}${fiadosAttr}${nativeAttr}${nativeFiadosAttr}`;
}

function buildCurrencyToggleMarkup() {
  const label = getCycleDisplayCurrencyLabel();
  const nextLabel = getNextCycleDisplayCurrencyLabel();
  return `
    <button type="button" class="cycle-currency-toggle" data-cycle-currency-toggle aria-label="Cambiar moneda visual. Actual: ${escapeAttr(label)}. Siguiente: ${escapeAttr(nextLabel)}" title="Cambiar moneda visual (${escapeAttr(label)} a ${escapeAttr(nextLabel)})">
      ${escapeHtml(label)}
    </button>
  `;
}

function refreshCurrencyToggle(toggle) {
  const label = getCycleDisplayCurrencyLabel();
  const nextLabel = getNextCycleDisplayCurrencyLabel();
  toggle.textContent = label;
  toggle.setAttribute('aria-label', `Cambiar moneda visual. Actual: ${label}. Siguiente: ${nextLabel}`);
  toggle.setAttribute('title', `Cambiar moneda visual (${label} a ${nextLabel})`);
}

function refreshCycleMoneyNode(node) {
  const rawValue = Number(node?.dataset?.cycleMoneyUsd);
  if (!Number.isFinite(rawValue)) return;

  const phrase = String(node.dataset.cycleMoneyPhrase || '').trim();

  // ANEXO 23: display nativo cuando la moneda del ciclo coincide con la
  // moneda de display (identidad del pivote, sin roundtrip de tasas).
  const nativeCurrency = String(node.dataset.cycleMoneyNativeCur || '').toUpperCase();
  const nativeValue = Number(node.dataset.cycleMoneyNative);
  if (nativeCurrency && Number.isFinite(nativeValue)
    && currentDisplayCurrencyCode() === nativeCurrency) {
    if (phrase === 'balance-actual') {
      const nativeFiados = Number(node.dataset.cycleMoneyNativeFiados);
      node.textContent = formatBalanceActualText(
        nativeValue,
        Number.isFinite(nativeFiados) ? nativeFiados : 0,
        (amount) => formatNativeAmount(amount, nativeCurrency)
      );
      node.dataset.rawMoney = node.textContent;
      return;
    }
    const signed = node.dataset.cycleMoneySigned === '1';
    const displayValue = signed ? formatSignedNativeAmount(nativeValue, nativeCurrency) : formatNativeAmount(nativeValue, nativeCurrency);
    const trend = String(node.dataset.cycleMoneyTrend || '').trim();
    const finalText = trend ? `${trend} ${displayValue}` : displayValue;
    node.textContent = finalText;
    node.dataset.rawMoney = displayValue;
    return;
  }

  if (phrase === 'balance-actual') {
    const fiados = Number(node.dataset.cycleMoneyFiados);
    node.textContent = formatBalanceActualText(rawValue, fiados);
    node.dataset.rawMoney = node.textContent;
    return;
  }

  const signed = node.dataset.cycleMoneySigned === '1';
  const displayValue = signed ? formatSignedUsd(rawValue) : formatUsdCompact(rawValue);
  const trend = String(node.dataset.cycleMoneyTrend || '').trim();
  const finalText = trend ? `${trend} ${displayValue}` : displayValue;
  node.textContent = finalText;
  node.dataset.rawMoney = displayValue;
}

function refreshCycleDisplayCurrency(root = document) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('[data-cycle-currency-toggle]').forEach(refreshCurrencyToggle);
  root.querySelectorAll('[data-cycle-money-usd]').forEach(refreshCycleMoneyNode);
}

function bindCycleCurrencyToggle(container) {
  if (!container || container.dataset.cycleCurrencyBound === '1') return;
  container.dataset.cycleCurrencyBound = '1';

  container.addEventListener('click', async (event) => {
    const trigger = event.target?.closest?.('[data-cycle-currency-toggle]');
    if (!trigger || !container.contains(trigger)) return;

    event.preventDefault();
    event.stopPropagation();
    trigger.disabled = true;

    try {
      await rotateCycleDisplayCurrency();
    } finally {
      trigger.disabled = false;
      refreshCycleDisplayCurrency(document);
    }
  });
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
      ${ciclo?.preCultivo ? `<button type="button" class="cycle-action btn-sow-crop" data-id="${escapeAttr(id)}" title="Registrar siembra" aria-label="Registrar siembra">
        <i class="fa-solid fa-seedling" aria-hidden="true"></i>
      </button>` : ''}
      <button type="button" class="cycle-action btn-report-crop" data-id="${escapeAttr(id)}"${orphanAttr} title="Informe del Cultivo" aria-label="Informe del cultivo">
        <i class="fa-solid fa-chart-bar" aria-hidden="true"></i>
      </button>
      <button type="button" class="cycle-action btn-edit-crop${disabledClass}" data-id="${escapeAttr(id)}"${disabledAttr}${isAudit ? disabledTitle : ' title="Editar Cultivo"'} aria-label="Editar cultivo">
        <i class="fa-solid fa-pen" aria-hidden="true"></i>
      </button>
      <button type="button" class="cycle-action btn-archive-crop${disabledClass}" data-id="${escapeAttr(id)}"${disabledAttr}${isAudit ? disabledTitle : ' title="Archivar cultivo"'} aria-label="Archivar cultivo">
        <i class="fa-solid fa-box-archive" aria-hidden="true"></i>
      </button>
      <button type="button" class="cycle-action btn-delete-crop${disabledClass}" data-id="${escapeAttr(id)}"${disabledAttr}${isAudit ? disabledTitle : ' title="Eliminar Cultivo"'} aria-label="Eliminar cultivo">
        <i class="fa-solid fa-trash" aria-hidden="true"></i>
      </button>
    </div>
  `;
}

// ANEXO 28 S4 (D-6): chips de acción de la card activa. Chips 1+2 siempre en
// cultivos visibles; chips 3+4 solo con fase habilitada por el Facturero de
// Clientes — misma lista vía puente window._agroClientesFlow (flow.js), sin
// duplicar vocabulario. Labels estáticos, cero datos inventados.
function buildCropChips(ciclo, mode) {
  const id = String(ciclo?.id || '').trim();
  if (!id || mode !== 'active' || ciclo?.isAuditCard === true) return '';
  const resolvedStatus = String(ciclo?.resolvedStatus || '').trim();
  const flowAllowed = window._agroClientesFlow?.allowedCropStatuses?.has?.(resolvedStatus) === true;
  return `
    <div class="crop-chip-row">
      <button type="button" class="crop-chip" data-crop-chip="cultivo-crear" data-crop-id="${escapeAttr(id)}">Crear registro</button>
      <button type="button" class="crop-chip" data-crop-chip="cultivo-ver" data-crop-id="${escapeAttr(id)}">Ver registros</button>
      ${flowAllowed ? `<button type="button" class="crop-chip" data-crop-chip="clientes-crear">Crear factura de cliente</button>
      <button type="button" class="crop-chip" data-crop-chip="clientes-ver">Ver registros de clientes</button>` : ''}
    </div>
  `;
}

// Navegación por hash completo + evento agro:shell:set-view (patrón
// openModernFactureroDestination, agro.js). writeViewToHash preserva los
// params profundos en same-target (agro-shell.js), y el wizard restaura
// rama/paso/crop desde el hash (readWizardHash).
function navigateFromCropChip(kind, cropId) {
  const id = String(cropId || '').trim();
  const navigate = (hash, view, subview) => {
    try {
      const url = new URL(window.location.href);
      url.hash = hash;
      history.replaceState(null, '', url);
    } catch (_err) { /* ignore */ }
    window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
      detail: { view, subview, scroll: true }
    }));
  };
  if (kind === 'cultivo-crear' && id) {
    navigate(`view=facturero-cultivo&subview=wizard&rama=crear&paso=2&crop=${encodeURIComponent(id)}`, 'facturero-cultivo', 'wizard');
    return;
  }
  if (kind === 'cultivo-ver' && id) {
    navigate(`view=facturero-cultivo&subview=wizard&rama=ver&paso=3&crop=${encodeURIComponent(id)}`, 'facturero-cultivo', 'wizard');
    return;
  }
  if (kind === 'clientes-crear') {
    navigate('view=facturero-clientes&subview=nuevo&paso=1', 'facturero-clientes', 'nuevo');
    return;
  }
  if (kind === 'clientes-ver') {
    navigate('view=facturero-clientes&subview=ver-clientes&paso=1', 'facturero-clientes', 'ver-clientes');
  }
}

function bindCropChipNavigation(container) {
  if (!container || container.dataset.cropChipBound === '1') return;
  container.dataset.cropChipBound = '1';
  container.addEventListener('click', (event) => {
    const chip = event.target?.closest?.('[data-crop-chip]');
    if (!chip || !container.contains(chip)) return;
    event.preventDefault();
    event.stopPropagation();
    navigateFromCropChip(chip.dataset?.cropChip || '', chip.dataset?.cropId || '');
  });
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

  return `
    <section class="desglose-global" data-global-breakdown="1">
      <div class="desglose-global-title">${escapeHtml(titleText)}</div>
      ${renderGlobalUnitChips(globalBreakdown)}
      ${renderBreakdownUsdRow('Base inversión multimoneda', globalBreakdown?.baseUsd, globalBreakdown?.base)}
      ${renderBreakdownUsdRow('Gastos acumulados', globalBreakdown?.gastosUsd, globalBreakdown?.gastos)}
      ${renderBreakdownUsdRow('Pagados', globalBreakdown?.pagadosUsd, globalBreakdown?.pagados)}
      ${renderBreakdownUsdRow('Costos', globalBreakdown?.costosUsd, globalBreakdown?.costos)}
      ${renderBreakdownUsdRow('Fiados', globalBreakdown?.fiadosUsd, globalBreakdown?.fiados)}
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

function renderBreakdownUsdRow(label, usdValue, fallbackValue = 'N/D', native = null) {
  const parsed = Number(usdValue);
  if (!Number.isFinite(parsed)) {
    return renderBreakdownMoneyRow(label, fallbackValue);
  }

  const displayValue = pickDisplayText(parsed, native);
  return `
    <div class="desglose-row">
      <span>${escapeHtml(label)}</span>
      <span${buildCycleMoneyAttrs(parsed, displayValue, { native })}>${escapeHtml(displayValue)}</span>
    </div>
  `;
}

function renderBreakdownSectionSummary(items = []) {
  const rows = (Array.isArray(items) ? items : []).filter((item) => {
    if (!item?.label) return false;
    if (item.usdValue !== undefined && Number.isFinite(Number(item.usdValue))) return true;
    return !!item.value;
  });
  if (!rows.length) return '';
  return `
    <div class="desglose-section-meta">
      ${rows.map((item) => {
        const parsed = Number(item.usdValue);
        const hasUsdValue = Number.isFinite(parsed);
        const native = item.native || null;
        const displayValue = hasUsdValue
          ? (isNativeActive(native)
            ? formatNativeAmount(native.value, native.currency)
            : formatUsdCompact(parsed))
          : String(item.value || 'N/D');
        return `
        <span class="desglose-section-chip">
          <span class="desglose-section-chip__label">${escapeHtml(item.label)}</span>
          <span class="desglose-section-chip__value"${hasUsdValue ? buildCycleMoneyAttrs(parsed, displayValue, { native }) : ` data-money="1" data-raw-money="${escapeAttr(displayValue)}"`}>${escapeHtml(displayValue)}</span>
        </span>
      `;
      }).join('')}
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

function hasFinancialExposure(pendingAmount, lossesAmount) {
  return toNumber(pendingAmount, 0) > 0 || toNumber(lossesAmount, 0) > 0;
}

function resolveRealProfitTone(realNet) {
  const net = toNumber(realNet, 0);
  if (net > 0) return 'success';
  if (net === 0) return 'neutral';
  return 'error';
}

function resolveBalanceActualTone(value, fiadosPendientes) {
  const balance = toNumber(value, 0);
  const fiados = toNumber(fiadosPendientes, 0);
  if (balance > 0) return 'success';
  if (balance < 0 && fiados > 0) return 'warning';
  if (balance < 0) return 'neutral';
  return 'neutral';
}

function formatBalanceActualText(value, fiadosPendientes, formatAmount = formatUsdCompact) {
  const balance = toNumber(value, 0);
  const fiados = toNumber(fiadosPendientes, 0);
  if (balance > 0) return `Ganado ${formatAmount(Math.abs(balance))}`;
  if (balance < 0 && fiados > 0) return `Recuperando ${formatAmount(fiados)}`;
  if (balance < 0) return `Invirtiendo ${formatAmount(Math.abs(balance))}`;
  return 'Equilibrio';
}

function renderCard(ciclo, index = 0) {
  const mode = String(ciclo?.mode || 'active').trim().toLowerCase() === 'finished'
    ? 'finished'
    : 'active';
  const porcentaje = mode === 'finished' ? 100 : resolveProgress(ciclo);
  const rentabilidadUsd = toNumber(ciclo?.rentabilidad, 0);
  const potencialNetoUsd = toNumber(ciclo?.potencialNeto, rentabilidadUsd);
  const fiadosUsd = toNumber(ciclo?.fiadosUsd, 0);
  const perdidasUsd = toNumber(ciclo?.perdidasUsd, 0);
  const hasFiadosPendientes = fiadosUsd > 0;
  const balanceActualUsd = rentabilidadUsd - fiadosUsd;
  // ANEXO 23: métricas nativas (monomoneda) — reconcilian con las filas de
  // los wizards sin roundtrip COP→USD(hist)→COP(hoy).
  const native = ciclo?.native && ciclo?.native?.currency ? ciclo.native : null;
  const nativeCur = native ? String(native.currency).toUpperCase() : '';
  const nativeActive = !!(native && currentDisplayCurrencyCode() === nativeCur);
  const rentabilidadDisplay = nativeActive ? toNumber(native.rentabilidad, 0) : rentabilidadUsd;
  const fiadosDisplay = nativeActive ? toNumber(native.fiados, 0) : fiadosUsd;
  const balanceActualDisplay = rentabilidadDisplay - fiadosDisplay;
  const balanceActualText = formatBalanceActualText(
    balanceActualDisplay,
    fiadosDisplay,
    nativeActive ? (amount) => formatNativeAmount(amount, nativeCur) : undefined
  );
  const rentabilidadTone = resolveRealProfitTone(rentabilidadDisplay);
  const balanceActualTone = resolveBalanceActualTone(balanceActualDisplay, fiadosDisplay);
  const statusClass = statusClassFor(ciclo?.estado);
  const rentabilidadText = pickDisplayText(ciclo?.rentabilidad, {
    value: native ? native.rentabilidad : null,
    currency: nativeCur
  }, { signed: true });
  const inversionText = pickDisplayText(ciclo?.inversionUSD, {
    value: native ? toNumber(native.base, 0) + toNumber(native.gastos, 0) : null,
    currency: nativeCur
  });
  const potentialIfCollectedText = pickDisplayText(potencialNetoUsd, {
    value: native ? native.potencialNeto : null,
    currency: nativeCur
  }, { signed: true });
  const trendIcon = rentabilidadTone === 'success' ? '↗' : rentabilidadTone === 'neutral' ? '→' : '↘';
  const profitLabel = 'Ahora mismo';
  const currencyToggleMarkup = buildCurrencyToggleMarkup();
  const badges = resolveAllPortfolioBadges(ciclo);
  const isLost = ciclo?.estado === 'perdido';
  // ANEXO 28: pre-cultivo no tiene siembra — sin "Día X/Y" ni barra (D-3).
  const isPreCultivo = ciclo?.preCultivo === true;
  const progressText = mode === 'finished'
    ? (Number.isFinite(ciclo?.durationDays) && ciclo?.durationDays > 0
        ? `Inicio a ${isLost ? 'pérdida' : 'fin'}: ${ciclo.durationDays} días`
        : (isLost ? 'Perdido' : 'Completado'))
    : (isPreCultivo ? 'Sin sembrar' : `Día ${toNumber(ciclo?.diaActual, 0)}/${toNumber(ciclo?.diasTotales, 0)} (${porcentaje}%)`);
  const progressClass = mode === 'finished' ? 'progress-track progress-complete' : 'progress-track';
  const dataId = String(ciclo?.id || '').trim();
  const orphanData = ciclo?.isAuditCard ? ' data-crop-orphan="1"' : '';

  const seedKg = Number(ciclo?.seedKg);
  const seedKgText = Number.isFinite(seedKg)
    ? (Number.isInteger(seedKg) ? String(seedKg) : String(Number(seedKg.toFixed(6))))
    : '';
  const seedMeta = Number.isFinite(seedKg) && seedKg > 0
    ? `<span class="crop-seed-meta">Semilla: ${seedKgText} kg</span>`
    : '';
  const cropChips = buildCropChips(ciclo, mode);

  const desglose = ciclo?.desglose || {};
  const desgloseBase = String(desglose.base || 'N/D');
  const desgloseGastos = String(desglose.gastos || 'N/D');
  const desgloseGastosDirectos = String(desglose.gastosDirectos || 'N/D');
  const desgloseGastosOperativos = String(desglose.gastosOperativos || 'N/D');
  const desglosePendientesOperativos = String(desglose.pendientesOperativos || 'N/D');
  const desglosePagados = String(desglose.pagados || 'N/D');
  const desgloseCostos = String(desglose.costos || 'N/D');
  const desgloseFiados = String(desglose.fiados || 'N/D');
  const desglosePerdidasCarteraViva = String(desglose.perdidasCarteraViva || 'N/D');
  const desgloseCotizacion = String(desglose.cotizacion || 'N/D');
  const globalBreakdownMarkup = renderGlobalBreakdown(ciclo);
  const baseInvestmentUsd = toNumber(ciclo?.baseInvestmentUsd, 0);
  const directGastosUsd = toNumber(ciclo?.directGastosUsd, 0);
  const gastosUsd = toNumber(ciclo?.gastosUsd, 0);
  const operationalGastosUsd = toNumber(ciclo?.operationalGastosUsd, 0);
  const operationalPendingUsd = toNumber(ciclo?.operationalPendingUsd, 0);
  const pagadosUsd = toNumber(ciclo?.pagadosUsd, 0);
  const costosUsd = toNumber(ciclo?.costosUsd, 0);
  const carteraVivaTotal = baseInvestmentUsd + directGastosUsd + perdidasUsd;
  const carteraVivaRows = [
    renderBreakdownUsdRow('Base inversión multimoneda', baseInvestmentUsd, desgloseBase),
    renderBreakdownUsdRow('Gastos directos del cultivo', directGastosUsd, desgloseGastosDirectos, {
      value: native ? native.directGastos : null,
      currency: nativeCur
    }),
    renderBreakdownUsdRow('Pagados Facturero de Clientes', pagadosUsd, desglosePagados, {
      value: native ? native.pagados : null,
      currency: nativeCur
    }),
    renderBreakdownUsdRow('Fiados Facturero de Clientes', fiadosUsd, desgloseFiados, {
      value: native ? native.fiados : null,
      currency: nativeCur
    }),
    hasFiadosPendientes ? renderBreakdownUsdRow('Si cobra todo', potencialNetoUsd, potentialIfCollectedText, {
      value: native ? native.potencialNeto : null,
      currency: nativeCur
    }) : '',
    renderBreakdownUsdRow('Pérdidas Facturero de Clientes', perdidasUsd, desglosePerdidasCarteraViva, {
      value: native ? native.perdidas : null,
      currency: nativeCur
    })
  ].filter(Boolean);
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
      ${renderBreakdownUsdRow('Gastos totales del cultivo', gastosUsd, desgloseGastos, {
        value: native ? native.gastos : null,
        currency: nativeCur
      })}
      ${renderBreakdownUsdRow('Costos combinados del ciclo', costosUsd, desgloseCostos, {
        value: native ? native.costos : null,
        currency: nativeCur
      })}
    </div>
    ${operationalGastosUsd > 0 || operationalPendingUsd > 0 ? renderBreakdownSection({
    title: 'Facturero de cultivos',
    subtitle: 'Factureros de cultivos asociados a este cultivo',
    modifierClass: 'is-operativa',
    defaultOpen: true,
    summaryItems: [
      { label: 'Pagado', usdValue: operationalGastosUsd, native: { value: native ? native.opsGastos : null, currency: nativeCur } },
      { label: 'Pendiente', usdValue: operationalPendingUsd }
    ],
    bodyMarkup: [
      operationalGastosUsd > 0 ? renderBreakdownUsdRow('Factureros de cultivos pagados', operationalGastosUsd, desgloseGastosOperativos, {
        value: native ? native.opsGastos : null,
        currency: nativeCur
      }) : '',
      operationalPendingUsd > 0 ? renderBreakdownUsdRow('Gastos operativos pendientes', operationalPendingUsd, desglosePendientesOperativos) : ''
    ].filter(Boolean).join('')
  }) : ''}
    ${renderBreakdownSection({
    title: 'Facturero de Clientes',
    subtitle: 'Facturación histórica del ciclo',
    modifierClass: 'is-viva',
    defaultOpen: carteraVivaIsShort,
    summaryItems: [
      { label: 'Total', usdValue: carteraVivaTotal, native: { value: native ? toNumber(native.base, 0) + toNumber(native.directGastos, 0) + toNumber(native.perdidas, 0) : null, currency: nativeCur } },
      { label: 'Pagado', usdValue: pagadosUsd, native: { value: native ? native.pagados : null, currency: nativeCur } },
      { label: 'Fiado', usdValue: fiadosUsd, native: { value: native ? native.fiados : null, currency: nativeCur } }
    ],
    bodyMarkup: carteraVivaRows.join('')
  })}
  `;

  return `
    <article class="cycle-card crop-card" data-crop-id="${escapeAttr(dataId)}" data-fiados-usd="${escapeAttr(ciclo?.fiadosUsd ?? '')}" data-crop-status="${escapeAttr(statusClass)}"${orphanData} style="animation-delay:${index * 70}ms;">
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
        ${isPreCultivo ? '' : `<div class="${progressClass}">
          <div class="progress-fill" style="width:${porcentaje}%">
            <span class="progress-dot"></span>
          </div>
        </div>`}
        ${seedMeta}
        ${cropChips}
      </div>

      <div class="data-grid">
        <div class="data-cell">
          <span class="data-label">Siembra</span>
          <span class="data-value">${escapeHtml(isPreCultivo ? '—' : (ciclo?.siembra || 'N/A'))}</span>
        </div>
        <div class="data-cell">
          <span class="data-label">Cosecha Est.</span>
          <span class="data-value">${escapeHtml(isPreCultivo ? '—' : (ciclo?.cosechaEst || 'N/A'))}</span>
        </div>
        <div class="data-cell">
          <span class="data-label data-label--with-currency">Inversión ${currencyToggleMarkup}</span>
          <span class="data-value gold"${buildCycleMoneyAttrs(ciclo?.inversionUSD, inversionText, {
            native: { value: native ? toNumber(native.base, 0) + toNumber(native.gastos, 0) : null, currency: nativeCur }
          })}>${escapeHtml(inversionText)}</span>
        </div>
        <div class="data-cell">
          <span class="data-label">Rentabilidad</span>
          <span class="data-value ${rentabilidadTone}"${buildCycleMoneyAttrs(ciclo?.rentabilidad, rentabilidadText, {
            signed: true,
            trend: trendIcon,
            native: { value: native ? native.rentabilidad : null, currency: nativeCur }
          })}>${trendIcon} ${escapeHtml(rentabilidadText)}</span>
        </div>
      </div>

      <div class="profit-row">
        <span class="profit-label">${profitLabel}</span>
        <span class="profit-value ${balanceActualTone}"${buildCycleMoneyAttrs(balanceActualUsd, balanceActualText, {
          phrase: 'balance-actual',
          fiados: fiadosUsd,
          native: {
            value: native ? native.balanceActual : null,
            currency: nativeCur,
            fiados: native ? native.fiados : null
          }
        })}>${escapeHtml(balanceActualText)}</span>
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
  bindCycleCurrencyToggle(container);
  bindCropChipNavigation(container);
  refreshCycleDisplayCurrency(container);
  initCycleDisplayCurrency().then(() => {
    refreshCycleDisplayCurrency(container);
  });
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
