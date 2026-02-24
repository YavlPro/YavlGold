import { supabase } from '../assets/js/config/supabase-config.js';

const FEEDBACK_VERSION = 'V9.8';
const FEEDBACK_QUEUE_KEY = 'YG_AGRO_FEEDBACK_QUEUE_V1';
const FEEDBACK_QUEUE_LIMIT = 30;
let feedbackFabButton = null;

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

  actions.append(retryBtn, cancelBtn, sendBtn);
  card.append(title, hint, categoryLabel, category, messageLabel, message, status, actions);
  overlay.appendChild(card);

  function closeModal() {
    overlay.remove();
  }

  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
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
          ? '✅ Cola reenviada.'
          : 'No había elementos pendientes.';
      } else {
        status.textContent = `Se reenviaron ${sentCount}. Pendientes: ${remaining}.`;
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
      page: '/agro/',
      version: FEEDBACK_VERSION,
      meta: {
        ts: Date.now(),
        ua: navigator.userAgent || '',
        path: window.location.pathname || '/agro/'
      }
    };

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        enqueueFeedback(payload);
        updateFabQueueState();
        refreshRetryButton();
        status.textContent = 'Guardado en cola. Inicia sesión para enviarlo.';
        sendBtn.disabled = false;
        cancelBtn.disabled = false;
        return;
      }

      await flushQueue(userId);
      updateFabQueueState();
      refreshRetryButton();
      const { error } = await insertFeedback(userId, payload);
      if (error) throw error;

      status.textContent = '✅ Enviado. Gracias.';
      message.value = '';
      setTimeout(closeModal, 700);
    } catch (err) {
      enqueueFeedback(payload);
      updateFabQueueState();
      refreshRetryButton();
      status.textContent = isAgroFeedbackUnavailableError(err)
        ? 'Feedback no disponible (migración pendiente). Guardado en cola local.'
        : 'Guardado en cola por red/error. Se enviará después.';
      sendBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });

  refreshRetryButton();
  return overlay;
}

function initAgroFeedback() {
  if (document.querySelector('.agro-feedback-fab')) return;

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAgroFeedback, { once: true });
} else {
  initAgroFeedback();
}
