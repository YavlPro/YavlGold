import { supabase } from '../assets/js/config/supabase-config.js';

const FEEDBACK_VERSION = 'V9.8';
const FEEDBACK_QUEUE_KEY = 'YG_AGRO_FEEDBACK_QUEUE_V1';
const FEEDBACK_QUEUE_LIMIT = 30;

function safeTrim(value) {
  return String(value ?? '').trim();
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

  for (const item of queue) {
    const { error } = await insertFeedback(userId, {
      categoria: item.categoria,
      mensaje: item.mensaje,
      page: item.page,
      version: item.version,
      meta: item.meta
    });

    if (error) {
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

  actions.append(cancelBtn, sendBtn);
  card.append(title, hint, categoryLabel, category, messageLabel, message, status, actions);
  overlay.appendChild(card);

  function closeModal() {
    overlay.remove();
  }

  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
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
        status.textContent = 'Guardado en cola. Inicia sesión para enviarlo.';
        sendBtn.disabled = false;
        cancelBtn.disabled = false;
        return;
      }

      await flushQueue(userId);
      const { error } = await insertFeedback(userId, payload);
      if (error) throw error;

      status.textContent = '✅ Enviado. Gracias.';
      message.value = '';
      setTimeout(closeModal, 700);
    } catch (_err) {
      enqueueFeedback(payload);
      status.textContent = 'Guardado en cola por red/error. Se enviará después.';
      sendBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });

  return overlay;
}

function initAgroFeedback() {
  if (document.querySelector('.agro-feedback-fab')) return;

  const button = createFabButton();
  document.body.appendChild(button);

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
  };

  tryFlushQueue();
  window.addEventListener('online', tryFlushQueue);
  supabase.auth.onAuthStateChange((event, session) => {
    if (event !== 'SIGNED_IN') return;
    const userId = session?.user?.id;
    if (!userId) return;
    void flushQueue(userId);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAgroFeedback, { once: true });
} else {
  initAgroFeedback();
}
