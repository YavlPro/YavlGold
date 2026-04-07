import { supabase } from '../assets/js/config/supabase-config.js';
import uxMessages from '../assets/js/ui/uxMessages.js';

const FEEDBACK_VERSION = 'V1';
const FEEDBACK_QUEUE_KEY = 'YG_AGRO_FEEDBACK_QUEUE_V1';
const FEEDBACK_QUEUE_LIMIT = 30;
const FEEDBACK_HISTORY_LIMIT = 20;
let feedbackFabButton = null;
let feedbackInitialized = false;

function safeTrim(value) {
  return String(value ?? '').trim();
}

function isAgroFeedbackUnavailableError(error) {
  const code = safeTrim(error?.code).toUpperCase();
  const message = safeTrim(error?.message).toLowerCase();
  const details = safeTrim(error?.details).toLowerCase();
  const combined = `${message} ${details}`;

  if (code === 'PGRST205' || code === '42P01') return true;
  if (!combined.includes('agro_feedback')) return false;
  return combined.includes('schema cache')
    || combined.includes('could not find')
    || combined.includes('relation')
    || combined.includes('does not exist');
}

function readQueue() {
  try {
    const raw = localStorage.getItem(FEEDBACK_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

function writeQueue(items) {
  try {
    localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(items || []));
  } catch (_err) {
    // Ignore storage errors.
  }
}

function getQueueCount() {
  return readQueue().length;
}

function formatQueueCount(count) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  return count > 99 ? '99+' : String(count);
}

function formatFeedbackDate(value) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  } catch (_err) {
    return '';
  }
}

function getFeedbackCategoryLabel(categoria) {
  const normalized = safeTrim(categoria).toLowerCase();
  if (normalized === 'bug') return '🐛 Bug';
  if (normalized === 'sugerencia') return '💡 Sugerencia';
  if (normalized === 'pregunta') return '❓ Pregunta';
  return '📝 General';
}

function safeLocalStorageGet(key) {
  if (!key) return '';
  try {
    return safeTrim(localStorage.getItem(key));
  } catch (_err) {
    return '';
  }
}

function normalizeCropId(value) {
  const clean = safeTrim(value);
  if (!clean) return '';
  if (clean === '__general__') return '';
  return clean;
}

function parseCropLabelFromStatus(value) {
  const text = safeTrim(value);
  if (!text) return '';
  const match = text.match(/cultivo:\s*(.+)$/i);
  return safeTrim(match?.[1]);
}

function getVisibleAgroSectionKey() {
  const sections = Array.from(document.querySelectorAll('[data-agro-section]'));
  if (sections.length <= 0) return '';

  const viewportHeight = Math.max(
    Number(window.innerHeight) || 0,
    Number(document.documentElement?.clientHeight) || 0
  );
  if (viewportHeight <= 0) return safeTrim(sections[0]?.dataset?.agroSection);

  let bestKey = '';
  let bestScore = Number.POSITIVE_INFINITY;

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const isVisible = rect.bottom >= 0 && rect.top <= viewportHeight;
    if (!isVisible) return;
    const score = Math.abs(rect.top);
    if (score < bestScore) {
      bestScore = score;
      bestKey = safeTrim(section?.dataset?.agroSection);
    }
  });

  return bestKey;
}

function mapSectionLabel(sectionKey, activeTab) {
  if (activeTab === 'rankings') return 'Rankings';
  if (activeTab) return 'Facturero';

  const key = safeTrim(sectionKey);
  if (key === 'activeCrops') return 'Cards';
  if (key === 'agroRepo') return 'AgroRepo';
  if (key === 'agenda') return 'Agenda';
  if (key === 'markets') return 'Mercados';
  if (key === 'lunar') return 'Fase lunar';
  if (key === 'stats') return 'Stats';
  if (key === 'roi') return 'ROI';
  if (key === 'assistant') return 'Asistente';
  if (key === 'ops') return 'Facturero';
  return key || 'Agro';
}

function collectAgroContext() {
  const activeTabButton = document.querySelector('.financial-tab-btn.is-active');
  const activeTab = safeTrim(activeTabButton?.dataset?.tab).toLowerCase();
  const activeTabLabel = safeTrim(activeTabButton?.textContent);

  const rangeButton = document.querySelector('.ops-rankings-range-btn.is-active');
  const rankingsRange = safeTrim(rangeButton?.dataset?.range).toLowerCase();
  const rankingsRangeLabel = safeTrim(rangeButton?.textContent);

  const activeCropChip = document.querySelector('.ops-cultivo-chip.is-active');
  const cropLabelFromChip = safeTrim(
    activeCropChip?.querySelector('.ops-cultivo-chip-name')?.textContent
  );
  const cropIdFromChip = normalizeCropId(activeCropChip?.dataset?.cropId);
  const cropIdFromStorage = normalizeCropId(
    safeLocalStorageGet('YG_AGRO_SELECTED_CROP_V1') || safeLocalStorageGet('selectedCropId')
  );

  const rankingsStatus = document.getElementById('ops-rankings-status');
  const cropLabelFromStatus = parseCropLabelFromStatus(rankingsStatus?.textContent);
  const cropLabel = cropLabelFromChip || cropLabelFromStatus || (cropIdFromStorage ? '🌱 Cultivo seleccionado' : '📋 Vista General');

  const sectionKey = activeTab ? 'ops' : getVisibleAgroSectionKey();
  const sectionLabel = mapSectionLabel(sectionKey, activeTab);

  const buildMarker = document.getElementById('agro-build-marker');
  const buildText = safeTrim(buildMarker?.textContent);
  const buildVersion = safeTrim(buildMarker?.dataset?.buildVersion);
  const buildDate = safeTrim(buildMarker?.dataset?.buildDate);

  const path = safeTrim(window.location.pathname) || '/agro/';
  const query = safeTrim(window.location.search);

  return {
    module: 'agro',
    section_key: sectionKey || 'ops',
    section_label: sectionLabel,
    active_tab: activeTab || '',
    active_tab_label: activeTabLabel,
    rankings_range: rankingsRange || '',
    rankings_range_label: rankingsRangeLabel,
    crop_label: cropLabel,
    crop_id: cropIdFromChip || cropIdFromStorage || '',
    online: navigator.onLine !== false,
    build_version: buildVersion,
    build_date: buildDate,
    build_text: buildText,
    path,
    query,
    debug: query.includes('debug=1')
  };
}

async function fetchRecentFeedback(userId, limit = FEEDBACK_HISTORY_LIMIT) {
  const { data, error } = await supabase
    .from('agro_feedback')
    .select('id,categoria,mensaje,created_at,page,version')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

function renderFeedbackRows(container, rows) {
  container.innerHTML = '';

  if (!Array.isArray(rows) || rows.length <= 0) {
    const empty = document.createElement('div');
    empty.className = 'agro-feedback-history-empty';
    empty.textContent = 'Aún no hay feedback enviado.';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'agro-feedback-history-list';

  rows.forEach((row) => {
    const item = document.createElement('div');
    item.className = 'agro-feedback-history-item';

    const head = document.createElement('div');
    head.className = 'agro-feedback-history-head';

    const category = document.createElement('span');
    category.className = 'agro-feedback-history-cat';
    category.textContent = getFeedbackCategoryLabel(row?.categoria);

    const date = document.createElement('span');
    date.className = 'agro-feedback-history-date';
    date.textContent = formatFeedbackDate(row?.created_at);

    const message = document.createElement('div');
    message.className = 'agro-feedback-history-msg';
    message.textContent = safeTrim(row?.mensaje);

    head.append(category, date);
    item.append(head, message);
    list.appendChild(item);
  });

  container.appendChild(list);
}

function updateFabQueueState() {
  if (!feedbackFabButton) return;
  const queueCount = getQueueCount();
  feedbackFabButton.textContent = queueCount > 0
    ? `💬 Feedback (${formatQueueCount(queueCount)})`
    : '💬 Feedback';
  feedbackFabButton.classList.toggle('has-queue', queueCount > 0);
}

function enqueueFeedback(payload) {
  const queue = readQueue();
  queue.push({
    ...payload,
    queued_at: Date.now()
  });
  while (queue.length > FEEDBACK_QUEUE_LIMIT) {
    queue.shift();
  }
  writeQueue(queue);
}

async function getCurrentUserId() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id || null;
  } catch (_err) {
    return null;
  }
}

async function insertFeedback(userId, payload) {
  return supabase
    .from('agro_feedback')
    .insert({
      user_id: userId,
      ...payload
    });
}

async function flushQueue(userId) {
  if (!userId) return 0;

  const queue = readQueue();
  if (!queue.length) return 0;

  const pending = [];
  let sentCount = 0;

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    const { error } = await insertFeedback(userId, {
      categoria: item.categoria,
      mensaje: item.mensaje,
      page: item.page,
      version: item.version,
      meta: item.meta
    });

    if (error) {
      if (isAgroFeedbackUnavailableError(error)) {
        pending.push(...queue.slice(index));
        break;
      }
      pending.push(item);
      continue;
    }

    sentCount += 1;
  }

  writeQueue(pending);
  return sentCount;
}

function createFabButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'agro-feedback-fab';
  button.setAttribute('aria-label', 'Enviar feedback');
  button.textContent = '💬 Feedback';
  return button;
}

function createModal() {
  const overlay = document.createElement('div');
  overlay.className = 'agro-feedback-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'agro-feedback-card';

  const title = document.createElement('h3');
  title.className = 'agro-feedback-title';
  title.textContent = 'Feedback del Agricultor';

  const hint = document.createElement('p');
  hint.className = 'agro-feedback-hint';
  hint.textContent = 'Reporta un bug o sugiere una mejora. Llega directo al equipo.';

  const categoryLabel = document.createElement('label');
  categoryLabel.className = 'agro-feedback-field-label';
  categoryLabel.setAttribute('for', 'agro-feedback-category');
  categoryLabel.textContent = 'Categoría';

  const category = document.createElement('select');
  category.id = 'agro-feedback-category';
  category.className = 'agro-feedback-input';

  const options = [
    { value: 'bug', text: '🐛 Bug' },
    { value: 'sugerencia', text: '💡 Sugerencia' },
    { value: 'pregunta', text: '❓ Pregunta' }
  ];

  for (const optionData of options) {
    const option = document.createElement('option');
    option.value = optionData.value;
    option.textContent = optionData.text;
    category.appendChild(option);
  }

  const messageLabel = document.createElement('label');
  messageLabel.className = 'agro-feedback-field-label';
  messageLabel.setAttribute('for', 'agro-feedback-message');
  messageLabel.textContent = 'Mensaje';

  const message = document.createElement('textarea');
  message.id = 'agro-feedback-message';
  message.className = 'agro-feedback-textarea';
  message.rows = 6;
  message.maxLength = 1000;
  message.placeholder = 'Ej: En Rankings pasa X... / En Pendientes falta Y...';

  const status = document.createElement('div');
  status.className = 'agro-feedback-status';
  status.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'agro-feedback-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'agro-feedback-btn agro-feedback-btn-ghost';
  cancelBtn.textContent = 'Cancelar';

  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.className = 'agro-feedback-btn agro-feedback-btn-primary';
  sendBtn.textContent = 'Enviar';

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'agro-feedback-btn agro-feedback-btn-secondary';
  retryBtn.textContent = 'Reintentar ahora';

  function refreshRetryButton() {
    const pendingCount = getQueueCount();
    retryBtn.disabled = pendingCount <= 0;
    retryBtn.textContent = pendingCount > 0
      ? `Reintentar ahora (${formatQueueCount(pendingCount)})`
      : 'Reintentar ahora';
  }

  const historyDetails = document.createElement('details');
  historyDetails.className = 'agro-feedback-history';

  const historySummary = document.createElement('summary');
  historySummary.className = 'agro-feedback-history-summary';
  historySummary.textContent = '📥 Mis feedback enviados';

  const historyBody = document.createElement('div');
  historyBody.className = 'agro-feedback-history-body';

  const historyTop = document.createElement('div');
  historyTop.className = 'agro-feedback-history-top';

  const historyHint = document.createElement('div');
  historyHint.className = 'agro-feedback-history-hint';
  historyHint.textContent = `Últimos ${FEEDBACK_HISTORY_LIMIT} mensajes (solo tú los ves).`;

  const historyRefreshBtn = document.createElement('button');
  historyRefreshBtn.type = 'button';
  historyRefreshBtn.className = 'agro-feedback-btn agro-feedback-btn-secondary';
  historyRefreshBtn.textContent = 'Actualizar';

  const historyStatus = document.createElement('div');
  historyStatus.className = 'agro-feedback-history-status';

  const historyListHost = document.createElement('div');
  historyListHost.className = 'agro-feedback-history-host';

  historyTop.append(historyHint, historyRefreshBtn);
  historyBody.append(historyTop, historyStatus, historyListHost);
  historyDetails.append(historySummary, historyBody);

  async function loadHistory() {
    historyStatus.textContent = 'Cargando...';
    historyRefreshBtn.disabled = true;

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        historyStatus.textContent = 'Inicia sesión para ver tus envíos.';
        historyListHost.innerHTML = '';
        return;
      }

      const rows = await fetchRecentFeedback(userId);
      historyStatus.textContent = '';
      renderFeedbackRows(historyListHost, rows);
    } catch (err) {
      historyStatus.textContent = isAgroFeedbackUnavailableError(err)
        ? 'Feedback no disponible (migración pendiente).'
        : 'No se pudo cargar el historial.';
      historyListHost.innerHTML = '';
    } finally {
      historyRefreshBtn.disabled = false;
    }
  }

  actions.append(retryBtn, cancelBtn, sendBtn);
  card.append(title, hint, categoryLabel, category, messageLabel, message, status, historyDetails, actions);
  overlay.appendChild(card);

  function closeModal() {
    overlay.remove();
  }

  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
  });

  historyRefreshBtn.addEventListener('click', () => {
    void loadHistory();
  });

  historyDetails.addEventListener('toggle', () => {
    if (historyDetails.open) {
      void loadHistory();
    }
  });

  retryBtn.addEventListener('click', async () => {
    const pendingBefore = getQueueCount();
    if (pendingBefore <= 0) {
      status.textContent = 'No hay mensajes en cola.';
      refreshRetryButton();
      return;
    }

    retryBtn.disabled = true;
    sendBtn.disabled = true;
    cancelBtn.disabled = true;
    status.textContent = 'Reintentando cola...';

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        status.textContent = 'Inicia sesión para reenviar la cola.';
        return;
      }

      const sentCount = await flushQueue(userId);
      const remaining = getQueueCount();
      updateFabQueueState();

      if (remaining <= 0) {
        status.textContent = sentCount > 0
          ? 'La cola se envió correctamente.'
          : 'No había elementos pendientes.';
        if (sentCount > 0) {
          uxMessages.success(uxMessages.copy.feedbackSent());
        }
      } else {
        status.textContent = `Se reenviaron ${sentCount}. Pendientes: ${remaining}.`;
        uxMessages.info({
          title: 'Parte de la cola ya salió.',
          message: `Quedan ${remaining} mensaje(s) pendientes por enviar.`
        });
      }

      if (historyDetails.open) {
        await loadHistory();
      }
    } finally {
      sendBtn.disabled = false;
      cancelBtn.disabled = false;
      refreshRetryButton();
    }
  });

  sendBtn.addEventListener('click', async () => {
    const categoria = safeTrim(category.value) || 'bug';
    const mensaje = safeTrim(message.value);

    if (mensaje.length < 3) {
      status.textContent = 'Escribe un mensaje más claro para enviarlo.';
      return;
    }

    sendBtn.disabled = true;
    cancelBtn.disabled = true;
    status.textContent = 'Enviando...';

    const payload = {
      categoria,
      mensaje,
      page: window.location.pathname || '/agro/',
      version: FEEDBACK_VERSION,
      meta: {
        ts: Date.now(),
        ua: navigator.userAgent || '',
        path: window.location.pathname || '/agro/',
        query: window.location.search || '',
        context: collectAgroContext()
      }
    };

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        enqueueFeedback(payload);
        updateFabQueueState();
        refreshRetryButton();
        status.textContent = 'Guardado en cola. Inicia sesión para enviarlo.';
        uxMessages.info(uxMessages.copy.feedbackQueued());
        sendBtn.disabled = false;
        cancelBtn.disabled = false;
        return;
      }

      await flushQueue(userId);
      updateFabQueueState();
      refreshRetryButton();
      const { error } = await insertFeedback(userId, payload);
      if (error) throw error;

      status.textContent = 'Mensaje enviado correctamente. Gracias por compartirlo.';
      uxMessages.success(uxMessages.copy.feedbackSent());
      message.value = '';

      if (historyDetails.open) {
        await loadHistory();
      }
      setTimeout(closeModal, 700);
    } catch (err) {
      enqueueFeedback(payload);
      updateFabQueueState();
      refreshRetryButton();
      status.textContent = isAgroFeedbackUnavailableError(err)
        ? 'Feedback no disponible (migración pendiente). Guardado en cola local.'
        : 'Guardado en cola por red/error. Se enviará después.';
      uxMessages.info(uxMessages.copy.feedbackQueued());
      sendBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });

  refreshRetryButton();
  return overlay;
}

export function initAgroFeedback() {
  if (feedbackInitialized || document.querySelector('.agro-feedback-fab')) return;
  feedbackInitialized = true;

  const button = createFabButton();
  feedbackFabButton = button;
  document.body.appendChild(button);
  updateFabQueueState();

  button.addEventListener('click', () => {
    const modal = createModal();
    document.body.appendChild(modal);
    const messageInput = modal.querySelector('#agro-feedback-message');
    if (messageInput) messageInput.focus();
  });

  const tryFlushQueue = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await flushQueue(userId);
    updateFabQueueState();
  };

  tryFlushQueue();
  window.addEventListener('online', tryFlushQueue);
  supabase.auth.onAuthStateChange((event, session) => {
    if (event !== 'SIGNED_IN') return;
    const userId = session?.user?.id;
    if (!userId) return;
    void flushQueue(userId).then(() => {
      updateFabQueueState();
    });
  });
}
