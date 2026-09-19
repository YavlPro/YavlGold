/**
 * agro-assistant.js — Núcleo del Asistente IA
 * ANEXO 25 S1 (2026-09-17): extraído del monolito agro.js (bloque 14952-16465).
 *
 * Responsabilidad: estado + persistencia (threads/mensajes/cooldown + migración
 * legacy), cola anti-429 con backoff, invoke a la Edge Function 'agro-assistant',
 * construcción de contexto, mapeo de errores, timers y wiring de la superficie.
 *
 * Contrato de dependencias (§3.3, sin circulares):
 * - Importa supabase-config directamente (patrón de módulos del repo).
 * - Importa la capa de render agro-assistant-ui.js (dirección única core -> ui).
 * - Lee el monolito SOLO vía window._agroAssistantDeps (lectura perezosa):
 *   { getCrops(), getCropMetrics(crop), readActiveTab() } — expuesto por agro.js.
 * - Lee los puentes de contexto existentes como antes: window._agroProfileData,
 *   window._agroIAContext, window._agroRepoContext, window.YGGeolocation.
 * - Edge Function y Edge contract intactos (ANEXO 25 S1 tabla de no-cambio).
 */

import { supabase } from '../assets/js/config/supabase-config.js';
import { readBuyerNamesHidden, readMoneyValuesHidden } from './agro-privacy.js';
import { retrieveRepoMemory } from './agro-memory-retrieval.js';
import {
    autoResizeInput,
    closeAssistantExportModal,
    downloadAssistantExport,
    refreshContextPanel,
    renderAssistantHistory,
    renderThreadList,
    scrollAssistantToBottom,
    setAssistantDrawerOpen,
    setAssistantLoading,
    setAssistantStatus,
    showAssistantExportModal,
    showAssistantToast,
    syncAssistantGuideLayout,
    updateAssistantStats
} from './agro-assistant-ui.js';

const AGRO_ASSISTANT_HISTORY_KEY = 'YG_AGRO_ASSISTANT_HISTORY_V1';
const AGRO_ASSISTANT_THREADS_KEY = 'YG_AGRO_ASSISTANT_THREADS_V1';
const AGRO_ASSISTANT_ACTIVE_THREAD_KEY = 'YG_AGRO_ASSISTANT_ACTIVE_THREAD_V1';
const AGRO_ASSISTANT_MESSAGES_PREFIX = 'YG_AGRO_ASSISTANT_MESSAGES_V1_';
const AGRO_ASSISTANT_COOLDOWN_KEY = 'YG_AGRO_ASSISTANT_COOLDOWN_V1';
const AGRO_ASSISTANT_MIN_INTERVAL_MS = 10000;  // 10s default cooldown
const AGRO_ASSISTANT_RATE_LIMIT_MS = 60000;    // 60s initial backoff on 429
const AGRO_ASSISTANT_RATE_LIMIT_MAX_MS = 300000; // 5 min cap
const AGRO_ASSISTANT_MAX_HISTORY = 20;
const AGRO_ASSISTANT_DEFAULT_TITLE = 'Nueva conversacion';

let assistantCooldownTimer = null;

// V9.7: Runtime state for queue-based anti-429 protection
const assistantRuntime = {
    inFlight: false,
    queue: [],
    cooldownUntil: 0,
    backoffSeconds: 0,
    last429At: 0
};

const assistantState = {
    threads: [],
    activeThreadId: null,
    messagesByThreadId: {}
};

// ANEXO 25 S1: puente de deps del monolito (lectura perezosa en cada uso)
function readAssistantDeps() {
    return (typeof window !== 'undefined' && window._agroAssistantDeps) || {};
}

function readAssistantCrops() {
    const deps = readAssistantDeps();
    const crops = typeof deps.getCrops === 'function' ? deps.getCrops() : [];
    return Array.isArray(crops) ? crops : [];
}

function safeJsonParse(raw, fallback) {
    try {
        const parsed = raw ? JSON.parse(raw) : fallback;
        return parsed ?? fallback;
    } catch (e) {
        return fallback;
    }
}

function randomBase36(length = 6) {
    const size = Math.max(1, Number(length) || 6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(size);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
    }
    return (Date.now().toString(36) + '000000000000').slice(-size);
}

function createThreadId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `t_${Date.now()}_${randomBase36(6)}`;
}

function normalizeThread(thread) {
    if (!thread || !thread.id) return null;
    const createdAt = Number(thread.createdAt) || Date.now();
    const lastMessageAt = Number(thread.lastMessageAt) || null;
    return {
        id: String(thread.id),
        title: String(thread.title || AGRO_ASSISTANT_DEFAULT_TITLE).trim() || AGRO_ASSISTANT_DEFAULT_TITLE,
        createdAt,
        updatedAt: Number(thread.updatedAt) || lastMessageAt || createdAt,
        lastMessageAt
    };
}

function readThreadsFromStorage() {
    const raw = localStorage.getItem(AGRO_ASSISTANT_THREADS_KEY);
    const data = safeJsonParse(raw, []);
    const threads = Array.isArray(data) ? data.map(normalizeThread).filter(Boolean) : [];
    return threads;
}

function saveThreadsToStorage(threads) {
    try {
        localStorage.setItem(AGRO_ASSISTANT_THREADS_KEY, JSON.stringify(threads));
    } catch (e) {
        // Ignore storage errors
    }
}

function getMessagesKey(threadId) {
    return `${AGRO_ASSISTANT_MESSAGES_PREFIX}${threadId}`;
}

function readMessagesFromStorage(threadId) {
    if (!threadId) return [];
    const raw = localStorage.getItem(getMessagesKey(threadId));
    const data = safeJsonParse(raw, []);
    return Array.isArray(data) ? data : [];
}

function saveMessagesToStorage(threadId, messages) {
    if (!threadId) return;
    try {
        localStorage.setItem(getMessagesKey(threadId), JSON.stringify(messages));
    } catch (e) {
        // Ignore storage errors
    }
}

function readActiveThreadId() {
    try {
        return localStorage.getItem(AGRO_ASSISTANT_ACTIVE_THREAD_KEY);
    } catch (e) {
        return null;
    }
}

function writeActiveThreadId(threadId) {
    try {
        if (threadId) {
            localStorage.setItem(AGRO_ASSISTANT_ACTIVE_THREAD_KEY, threadId);
        }
    } catch (e) {
        // Ignore storage errors
    }
}

function readLegacyHistory() {
    const raw = localStorage.getItem(AGRO_ASSISTANT_HISTORY_KEY);
    const data = safeJsonParse(raw, []);
    return Array.isArray(data) ? data : [];
}

function clearLegacyHistory() {
    try {
        localStorage.removeItem(AGRO_ASSISTANT_HISTORY_KEY);
    } catch (e) {
        // Ignore storage errors
    }
}

function migrateLegacyHistoryIfNeeded() {
    const existingThreads = readThreadsFromStorage();
    if (existingThreads.length) return existingThreads;
    const legacy = readLegacyHistory();
    if (!legacy.length) return existingThreads;
    const thread = createThread(AGRO_ASSISTANT_DEFAULT_TITLE);
    saveThreadsToStorage([thread]);
    const migrated = legacy.map((item) => ({
        role: item?.role || 'assistant',
        text: String(item?.text || ''),
        ts: Number(item?.ts) || Date.now()
    }));
    saveMessagesToStorage(thread.id, migrated);
    writeActiveThreadId(thread.id);
    clearLegacyHistory();
    return [thread];
}

function createThread(title) {
    const now = Date.now();
    return {
        id: createThreadId(),
        title: title || AGRO_ASSISTANT_DEFAULT_TITLE,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: null
    };
}

function hydrateAssistantState() {
    const threads = migrateLegacyHistoryIfNeeded();
    assistantState.threads = threads.length ? threads : readThreadsFromStorage();
    if (!assistantState.threads.length) {
        const thread = createThread(AGRO_ASSISTANT_DEFAULT_TITLE);
        assistantState.threads = [thread];
        saveThreadsToStorage(assistantState.threads);
        writeActiveThreadId(thread.id);
    }
    const activeId = readActiveThreadId();
    const candidate = assistantState.threads.find((t) => t.id === activeId);
    assistantState.activeThreadId = candidate ? candidate.id : assistantState.threads[0].id;
    writeActiveThreadId(assistantState.activeThreadId);
    preloadThreadMessages(assistantState.activeThreadId);
}

function preloadThreadMessages(threadId) {
    if (!threadId) return [];
    if (!assistantState.messagesByThreadId[threadId]) {
        assistantState.messagesByThreadId[threadId] = readMessagesFromStorage(threadId);
    }
    return assistantState.messagesByThreadId[threadId];
}

function getActiveThread() {
    return assistantState.threads.find((thread) => thread.id === assistantState.activeThreadId) || null;
}

function renderThreads() {
    renderThreadList({
        threads: assistantState.threads,
        activeThreadId: assistantState.activeThreadId,
        onSelectThread: setActiveThread,
        onDeleteThread: deleteThreadById
    });
}

function setActiveThread(threadId) {
    const target = assistantState.threads.find((thread) => thread.id === threadId);
    if (!target) return;
    assistantState.activeThreadId = target.id;
    writeActiveThreadId(target.id);
    preloadThreadMessages(target.id);
    renderThreads();
    renderAssistantHistory(preloadThreadMessages(target.id));
    setAssistantDrawerOpen(false);
}

function createNewThreadAndActivate() {
    const thread = createThread(AGRO_ASSISTANT_DEFAULT_TITLE);
    assistantState.threads.unshift(thread);
    saveThreadsToStorage(assistantState.threads);
    setActiveThread(thread.id);
}

function updateThreadMetadata(threadId, data) {
    const thread = assistantState.threads.find((t) => t.id === threadId);
    if (!thread) return;
    if (data.title) {
        thread.title = data.title;
    }
    if (data.lastMessageAt) {
        thread.lastMessageAt = data.lastMessageAt;
        thread.updatedAt = data.lastMessageAt;
    } else if (data.updatedAt) {
        thread.updatedAt = data.updatedAt;
    }
    saveThreadsToStorage(assistantState.threads);
}

function formatThreadTitle(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return AGRO_ASSISTANT_DEFAULT_TITLE;
    if (trimmed.length <= 42) return trimmed;
    return `${trimmed.slice(0, 39)}...`;
}

function addAssistantMessage({ role, text, sources }) {
    const safeText = String(text || '').trim();
    if (!safeText) return;

    if (!assistantState.activeThreadId) {
        createNewThreadAndActivate();
    }

    const normalizedRole = role === 'user' || role === 'assistant' || role === 'error' || role === 'system'
        ? role
        : 'assistant';
    const threadId = assistantState.activeThreadId;
    const messages = preloadThreadMessages(threadId);

    const last = messages[messages.length - 1];
    if (last && last.role === normalizedRole && last.text === safeText) {
        renderAssistantHistory(messages);
        return;
    }

    const message = {
        role: normalizedRole,
        text: safeText,
        ts: Date.now()
    };
    // ANEXO 29 S1: las citas viajan con el mensaje (persisten por thread).
    if (normalizedRole === 'assistant' && Array.isArray(sources) && sources.length) {
        message.sources = sources;
    }
    messages.push(message);

    const trimmed = messages.slice(-AGRO_ASSISTANT_MAX_HISTORY);
    assistantState.messagesByThreadId[threadId] = trimmed;
    saveMessagesToStorage(threadId, trimmed);

    if (normalizedRole === 'user') {
        const activeThread = getActiveThread();
        if (activeThread && activeThread.title === AGRO_ASSISTANT_DEFAULT_TITLE) {
            updateThreadMetadata(threadId, { title: formatThreadTitle(safeText) });
        }
    }

    updateThreadMetadata(threadId, { lastMessageAt: message.ts });
    renderThreads();
    renderAssistantHistory(assistantState.messagesByThreadId[threadId]);
    scrollAssistantToBottom();
    updateAssistantStats(assistantState.messagesByThreadId);
}

function readAssistantCooldown() {
    try {
        const raw = localStorage.getItem(AGRO_ASSISTANT_COOLDOWN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function writeAssistantCooldown(state) {
    try {
        localStorage.setItem(AGRO_ASSISTANT_COOLDOWN_KEY, JSON.stringify(state));
    } catch (e) {
        // Ignore storage errors
    }
}

function getCooldownRemainingMs() {
    const state = readAssistantCooldown();
    const now = Date.now();
    const until = Number(state?.until || 0);
    if (until > now) {
        return { remaining: until - now, mode: 'cooldown' };
    }
    const lockUntil = Number(state?.lockUntil || 0);
    if (lockUntil > now) {
        return { remaining: lockUntil - now, mode: 'lock' };
    }
    const lastSentAt = Number(state?.lastSentAt || 0);
    if (lastSentAt) {
        const wait = AGRO_ASSISTANT_MIN_INTERVAL_MS - (now - lastSentAt);
        if (wait > 0) return { remaining: wait, mode: 'cooldown' };
    }
    return { remaining: 0, mode: 'none' };
}

function setCooldownUntil(ms) {
    const state = readAssistantCooldown();
    state.until = Date.now() + ms;
    writeAssistantCooldown(state);
}

function isRateLimitError(error) {
    const status = error?.status || error?.statusCode;
    const detail = `${error?.message || ''} ${error?.context?.error?.message || ''} ${error?.context?.error || ''}`
        .toLowerCase();
    return status === 429 ||
        detail.includes('resource_exhausted') ||
        detail.includes('limit reached') ||
        detail.includes('rate limit');
}

function applyRateLimitBackoff() {
    const state = readAssistantCooldown();
    const current = Number(state?.rateLimitBackoffMs || 0);
    const next = current ? Math.min(current * 2, AGRO_ASSISTANT_RATE_LIMIT_MAX_MS) : AGRO_ASSISTANT_RATE_LIMIT_MS;
    state.rateLimitBackoffMs = next;
    state.lockUntil = Date.now() + next;
    state.lastErrorAt = Date.now();
    writeAssistantCooldown(state);
    return next;
}

function updateAssistantCooldownUI() {
    const sendBtn = document.getElementById('btn-assistant-send');
    const cooldownEl = document.getElementById('assistant-cooldown');
    if (!sendBtn || !cooldownEl) return 0;

    const queueLen = assistantRuntime.queue.length;

    // ANEXO 26: el countdown vive DENTRO del botón de envío; el nodo
    // #assistant-cooldown se conserva para compatibilidad (oculto por CSS).

    // Priority 1: In-flight
    if (assistantRuntime.inFlight) {
        sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Enviando</span>';
        sendBtn.disabled = true;
        cooldownEl.textContent = queueLen > 0 ? `En cola (${queueLen})` : '';
        return 1;
    }

    // Priority 2: 429 Backoff
    const { remaining, mode } = getCooldownRemainingMs();
    if (remaining > 0) {
        const seconds = Math.ceil(remaining / 1000);
        if (mode === 'lock') {
            sendBtn.innerHTML = `<i class="fa-solid fa-lock" aria-hidden="true"></i><span>IA en ${seconds}s</span>`;
            cooldownEl.textContent = `Limite IA: espera ${seconds}s`;
        } else {
            sendBtn.innerHTML = `<i class="fa-solid fa-clock" aria-hidden="true"></i><span>Enviar en ${seconds}s</span>`;
            cooldownEl.textContent = `Espera ${seconds}s`;
        }
        sendBtn.disabled = true;
        if (queueLen > 0) {
            cooldownEl.textContent += ` · En cola (${queueLen})`;
        }
        return remaining;
    }

    // Priority 3: Queue pending
    if (queueLen > 0) {
        sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i><span>En cola</span>';
        sendBtn.disabled = false;
        cooldownEl.textContent = `En cola (${queueLen})`;
        return 0;
    }

    // Default: Ready
    sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i><span>Enviar</span>';
    sendBtn.disabled = false;
    cooldownEl.textContent = '';
    return 0;
}

function startAssistantCooldownTimer() {
    if (assistantCooldownTimer) {
        clearInterval(assistantCooldownTimer);
    }
    assistantCooldownTimer = setInterval(() => {
        const remaining = updateAssistantCooldownUI();
        if (remaining <= 0 && !assistantRuntime.inFlight && assistantRuntime.queue.length === 0) {
            clearInterval(assistantCooldownTimer);
            assistantCooldownTimer = null;
        }
        // V9.7: Auto-process queue when cooldown expires
        if (remaining <= 0 && !assistantRuntime.inFlight && assistantRuntime.queue.length > 0) {
            processAssistantQueue();
        }
    }, 1000);
}

function stopAssistantTimers() {
    if (assistantCooldownTimer) {
        clearInterval(assistantCooldownTimer);
        assistantCooldownTimer = null;
    }
}

// V9.7: Build crops preamble for anti-hallucination
function buildCropsPreamble() {
    const crops = readAssistantCrops();

    if (!Array.isArray(crops) || crops.length === 0) {
        return {
            hasCrops: false,
            preamble: 'IMPORTANTE: El usuario NO tiene cultivos registrados en el sistema. ' +
                'ANTES de dar cualquier recomendacion, PREGUNTA que cultivo tiene y en que etapa esta. ' +
                'NO asumas ni inventes cultivos. Si el usuario pregunta por un cultivo especifico (ej: tomates), ' +
                'responde: "No veo ese cultivo en tus registros. ¿Quieres que te ayude a agregarlo o me confirmas cual tienes?"'
        };
    }

    const deps = readAssistantDeps();
    const cropList = crops
        .filter(c => c && c.name && !c.deleted_at)
        .map(c => {
            let desc = c.name;
            if (c.variety) desc += ` (${c.variety})`;
            const metrics = typeof deps.getCropMetrics === 'function' ? deps.getCropMetrics(c) : null;
            desc += ` - ${metrics?.status || 'activo'}`;
            return desc;
        })
        .slice(0, 10);

    return {
        hasCrops: true,
        preamble: `Cultivos REALES del usuario: ${cropList.join(', ')}. ` +
            'REGLA ESTRICTA: Solo menciona estos cultivos. NO inventes otros. ' +
            'Si el usuario pregunta por un cultivo que NO esta en la lista, responde: ' +
            '"No veo ese cultivo en tus registros. ¿Quieres que te ayude a agregarlo o me confirmas cual tienes?"'
    };
}

// V9.7: Queue processor with peek/shift-on-success pattern
async function processAssistantQueue() {
    // Guard: Already processing
    if (assistantRuntime.inFlight) {
        return;
    }

    // Guard: Cooldown active
    const { remaining } = getCooldownRemainingMs();
    if (remaining > 0) {
        updateAssistantCooldownUI();
        startAssistantCooldownTimer();
        return;
    }

    // Guard: Queue empty
    if (assistantRuntime.queue.length === 0) {
        updateAssistantCooldownUI();
        return;
    }

    // PEEK: Get item without removing (will shift on success only)
    const item = assistantRuntime.queue[0];
    if (!item || !item.prompt) {
        assistantRuntime.queue.shift(); // Remove invalid item
        processAssistantQueue(); // Try next
        return;
    }

    assistantRuntime.inFlight = true;
    updateAssistantCooldownUI();
    setAssistantLoading(true);

    try {
        // Build context with crops preamble
        // ANEXO 29 S1: el prompt real de la consulta alimenta el retrieval de
        // memoria (repo_memory por relevancia en lugar de recientes fijas).
        const contextPayload = getAssistantContext(item.prompt);
        const cropsPreamble = buildCropsPreamble();

        // V9.7: Prefix prompt with preamble (NOT saved to UI history)
        const promptForModel = cropsPreamble.preamble + '\n\n---\nPregunta del usuario:\n' + item.prompt;

        // THE INVOKE CALL REMAINS UNCHANGED (as required)
        // F1-1: la privacidad activa viaja en el invoke; la Edge es fail-closed
        // (sin este campo asume ocultamiento total).
        const { data, error } = await supabase.functions.invoke('agro-assistant', {
            body: {
                message: promptForModel,
                prompt: promptForModel,
                context: contextPayload,
                privacy: {
                    hide_names: readBuyerNamesHidden(),
                    hide_money: readMoneyValuesHidden()
                }
            }
        });

        if (error) {
            const status = error?.status || error?.statusCode;
            console.warn('[AGRO][AI] invoke error', status || error?.name || 'unknown');

            if (isRateLimitError(error)) {
                // 429: Exponential backoff, DO NOT shift (keep item for retry)
                assistantRuntime.last429At = Date.now();
                const backoffMs = applyRateLimitBackoff();
                const backoffSec = Math.ceil(backoffMs / 1000);
                assistantRuntime.backoffSeconds = backoffSec;

                showAssistantToast(`Limite IA. Espera ${backoffSec}s`);
                addAssistantMessage({
                    role: 'system',
                    text: `Limite de consultas alcanzado. Tu mensaje esta en cola y se enviara automaticamente en ${backoffSec}s.`
                });
            } else if (error?.name === 'FunctionsFetchError' || error?.name === 'FunctionsRelayError') {
                // ANEXO 27: invoke no lanza en fallos de red/relay — llegan como {error}
                // sin status. El mensaje queda en cola (diseño V9.7) y se reintenta al
                // expirar el cooldown, igual que el path de excepciones de red del catch.
                setCooldownUntil(AGRO_ASSISTANT_MIN_INTERVAL_MS * 2);
                addAssistantMessage({
                    role: 'system',
                    text: error?.name === 'FunctionsRelayError'
                        ? 'El servicio del asistente no respondió. Tu mensaje está en cola y se reintentará.'
                        : 'No se pudo contactar al asistente. Tu mensaje está en cola y se reintentará.'
                });
            } else {
                // Other error: shift the item, apply short cooldown
                assistantRuntime.queue.shift();
                setCooldownUntil(AGRO_ASSISTANT_MIN_INTERVAL_MS);
                addAssistantMessage({ role: 'error', text: getAssistantErrorMessage(error) });
            }

            assistantRuntime.inFlight = false;
            setAssistantLoading(false);
            updateAssistantCooldownUI();
            startAssistantCooldownTimer();
            return;
        }

        // SUCCESS: Now shift the item
        assistantRuntime.queue.shift();

        const reply = [data?.reply, data?.message, data?.text]
            .find((value) => typeof value === 'string' && value.trim());

        if (typeof reply !== 'string' || !reply.trim()) {
            setAssistantLoading(false);
            addAssistantMessage({ role: 'error', text: 'No se pudo consultar IA. Intenta luego.' });
        } else {
            setAssistantLoading(false);
            addAssistantMessage({
                role: 'assistant',
                text: reply.trim(),
                // ANEXO 29 S1: citas verificables — solo ids que estuvieron en
                // el contexto enviado de verdad (se construyen desde
                // contextPayload, nunca desde texto libre del modelo).
                sources: buildSentSources(contextPayload)
            });
        }

        // Reset backoff on success
        assistantRuntime.backoffSeconds = 0;
        const cooldownState = readAssistantCooldown();
        cooldownState.rateLimitBackoffMs = 0;
        cooldownState.lastSentAt = Date.now();
        writeAssistantCooldown(cooldownState);

        // Apply normal cooldown
        setCooldownUntil(AGRO_ASSISTANT_MIN_INTERVAL_MS);

    } catch (err) {
        console.warn('[AGRO][AI] request failed', err?.message || err || 'unknown');
        // Network error: keep item in queue for retry
        if (String(err?.message || '').toLowerCase().includes('fetch') ||
            String(err?.message || '').toLowerCase().includes('network')) {
            // Network error - keep in queue
            setCooldownUntil(AGRO_ASSISTANT_MIN_INTERVAL_MS * 2);
            addAssistantMessage({
                role: 'system',
                text: 'Error de conexion. Tu mensaje esta en cola y se reintentara.'
            });
        } else {
            // Other error - remove from queue
            assistantRuntime.queue.shift();
            addAssistantMessage({ role: 'error', text: getAssistantErrorMessage(err) });
        }
        setAssistantLoading(false);
    } finally {
        assistantRuntime.inFlight = false;
        updateAssistantCooldownUI();
        startAssistantCooldownTimer();

        // Process next in queue if any (respecting cooldown)
        if (assistantRuntime.queue.length > 0) {
            const nextRemaining = getCooldownRemainingMs().remaining;
            if (nextRemaining <= 0) {
                setTimeout(processAssistantQueue, 100);
            }
        }
    }
}

// V9.7: Delete active thread
function deleteActiveThread() {
    const threadId = assistantState.activeThreadId;
    if (!threadId) return false;

    // Remove thread from list
    assistantState.threads = assistantState.threads.filter(t => t.id !== threadId);

    // Clear messages from storage
    try {
        localStorage.removeItem(getMessagesKey(threadId));
    } catch (e) {
        // Ignore
    }

    // Clear from memory
    delete assistantState.messagesByThreadId[threadId];

    // Save updated threads
    saveThreadsToStorage(assistantState.threads);

    // Switch to another thread or create new
    if (assistantState.threads.length > 0) {
        setActiveThread(assistantState.threads[0].id);
    } else {
        createNewThreadAndActivate();
    }

    renderThreads();
    renderAssistantHistory(preloadThreadMessages(assistantState.activeThreadId));
    showAssistantToast('Conversación eliminada');
    return true;
}

// V9.7: Delete thread by ID (for sidebar delete buttons)
function deleteThreadById(threadId) {
    if (!threadId) return false;

    // Remove thread from list
    assistantState.threads = assistantState.threads.filter(t => t.id !== threadId);

    // Clear messages from storage
    try {
        localStorage.removeItem(getMessagesKey(threadId));
    } catch (e) {
        // Ignore
    }

    // Clear from memory
    delete assistantState.messagesByThreadId[threadId];

    // Save updated threads
    saveThreadsToStorage(assistantState.threads);

    // If deleted thread was active, switch to another
    if (assistantState.activeThreadId === threadId) {
        if (assistantState.threads.length > 0) {
            setActiveThread(assistantState.threads[0].id);
        } else {
            createNewThreadAndActivate();
        }
        renderAssistantHistory(preloadThreadMessages(assistantState.activeThreadId));
    }

    renderThreads();
    showAssistantToast('Conversación eliminada');
    return true;
}

function getAssistantLocationContext() {
    const Geo = window.YGGeolocation;
    if (!Geo) return null;
    let location = null;
    try {
        location = Geo.getManualLocation?.() || null;
        if (!location) {
            const pref = Geo.getLocationPreference?.() || 'gps';
            const mode = pref === 'ip' ? 'ip' : 'gps';
            location = Geo.getCachedCoords?.(mode) || null;
        }
    } catch (_e) {
        location = null;
    }

    const lat = Number(location?.lat);
    const lon = Number(location?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return {
        label: location?.label || null,
        lat,
        lon
    };
}

function getAssistantWeatherContext() {
    const descEl = document.getElementById('weather-desc');
    const tempEl = document.getElementById('weather-temp');
    const humEl = document.getElementById('weather-humidity');

    const summary = descEl?.textContent?.trim() || null;
    const temp = tempEl?.textContent ? Number(tempEl.textContent.replace(/[^\d.-]/g, '')) : null;
    const humidity = humEl?.textContent ? Number(humEl.textContent.replace(/[^\d.-]/g, '')) : null;

    if (!summary && !Number.isFinite(temp) && !Number.isFinite(humidity)) return null;

    return {
        summary,
        temp_c: Number.isFinite(temp) ? temp : null,
        humidity: Number.isFinite(humidity) ? humidity : null
    };
}

function getAssistantCropFocus(activeTab) {
    const crops = readAssistantCrops();

    let selectedCrop = null;
    if (activeTab) {
        const cropSelectMap = {
            gastos: 'expense-crop-id',
            ingresos: 'income-crop-id',
            pendientes: 'pending-crop-id',
            perdidas: 'loss-crop-id',
            transferencias: 'transfer-crop-id'
        };
        const cropSelectId = cropSelectMap[activeTab];
        const cropSelect = cropSelectId ? document.getElementById(cropSelectId) : null;
        const cropId = cropSelect?.value || null;
        if (cropId) {
            selectedCrop = crops.find((crop) => String(crop?.id) === String(cropId)) || null;
        }
    }

    if (!selectedCrop) {
        selectedCrop = crops[0] || null;
    }

    if (!selectedCrop) return null;

    const deps = readAssistantDeps();
    const metrics = typeof deps.getCropMetrics === 'function' ? deps.getCropMetrics(selectedCrop) : null;
    const progress = metrics?.progress || { ok: false };

    return {
        id: selectedCrop?.id ?? null,
        name: selectedCrop?.name ?? null,
        variety: selectedCrop?.variety ?? null,
        status: metrics?.status ?? null,
        day_x: progress.ok ? progress.dayIndex : null,
        day_total: progress.ok ? progress.totalDays : null,
        start_date: selectedCrop?.start_date ?? null,
        expected_harvest_date: selectedCrop?.expected_harvest_date ?? null
    };
}

// F1-1: con montos ocultos, los excerpts de bitacora viajan enmascarados al
// modelo. Solo patrones anclados a divisa ($, COP, USD, VES, Bs + cifra
// formateada); no se intenta enmascarar nombres en texto libre de bitacora
// (sin NLP confiable — limitacion documentada como decision).
const REPO_MONEY_PATTERN = /(\$\s?\d[\d.,]*|\b(?:cop|usd|ves|bs)\.?\s?\d[\d.,]*|\b\d[\d.,]*\s?(?:cop|usd|ves|bs\.?)\b)/gi;

function maskRepoMoneyInPlace(repoMemory) {
    if (!repoMemory || !Array.isArray(repoMemory.recent)) return;
    repoMemory.recent.forEach((entry) => {
        if (entry && typeof entry.content === 'string' && entry.content) {
            entry.content = entry.content.replace(REPO_MONEY_PATTERN, '[monto oculto]');
        }
    });
}

function getAssistantContext(promptText = '') {
    const context = {
        date: new Date().toISOString(),
        app: 'YavlGold Agro',
        version: 'V1'
    };
    const deps = readAssistantDeps();
    const activeTab = (typeof deps.readActiveTab === 'function' && deps.readActiveTab())
        || document.querySelector('.financial-tab-btn.is-active')?.dataset?.tab;
    if (activeTab) {
        context.tab = activeTab;
    }

    // User profile from agroperfil.js bridge
    const profile = window._agroProfileData;
    if (profile && (profile.display_name || profile.farm_name || profile.location_text)) {
        context.user_profile = {};
        if (profile.display_name) context.user_profile.name = profile.display_name;
        if (profile.farm_name) context.user_profile.farm = profile.farm_name;
        if (profile.location_text) context.user_profile.location = profile.location_text;
    }

    // IA context from agro-ia-wizard.js bridge (experience, goals, onboarding)
    const ia = window._agroIAContext;
    if (ia) {
        if (ia.experience_level) {
            context.user_profile = context.user_profile || {};
            context.user_profile.experience = ia.experience_level;
        }
        if (ia.farm_type) {
            context.user_profile = context.user_profile || {};
            context.user_profile.farm_type = ia.farm_type;
        }
        if (Array.isArray(ia.assistant_goals) && ia.assistant_goals.length > 0) {
            context.user_profile = context.user_profile || {};
            context.user_profile.goals = ia.assistant_goals;
        }
        if (ia.agro_relation) {
            context.user_profile = context.user_profile || {};
            context.user_profile.role = ia.agro_relation;
        }
        if (ia.main_activity) {
            context.user_profile = context.user_profile || {};
            context.user_profile.focus = ia.main_activity;
        }
    }

    const location = getAssistantLocationContext();
    if (location) {
        context.location_real = location;
    }

    const weather = getAssistantWeatherContext();
    if (weather) {
        context.weather_now = weather;
    }

    const cropFocus = getAssistantCropFocus(activeTab);
    if (cropFocus) {
        context.crop_focus = cropFocus;
    }

    const crops = readAssistantCrops();
    context.stats = { crops_count: crops.length };

    // AgroRepo memory bridge (bitacora entries for IA continuity)
    // ANEXO 29 S1: con el prompt real de la consulta se usa retrieval local
    // full-text (agro-memory-retrieval.js) en lugar del cap fijo de 8
    // recientes. Sin prompt (panel de contexto) el comportamiento es el de
    // siempre: recientes del bridge window._agroRepoContext.
    const repoQuery = typeof promptText === 'string' ? promptText.trim() : '';
    if (repoQuery) {
        const retrieved = retrieveRepoMemory(repoQuery);
        if (retrieved) {
            context.repo_memory = retrieved;
            if (readMoneyValuesHidden()) maskRepoMoneyInPlace(context.repo_memory);
            return context;
        }
    }
    const repo = window._agroRepoContext;
    if (repo && repo.total_reports > 0) {
        context.repo_memory = {
            bitacoras: repo.bitacoras_count,
            total_entries: repo.total_reports,
            recent: (repo.recent_entries || []).slice(0, 8)
        };
        if (readMoneyValuesHidden()) maskRepoMoneyInPlace(context.repo_memory);
    }

    return context;
}

// ANEXO 29 S1: fuentes del footer "Contexto consultado" — derivadas
// exclusivamente del repo_memory enviado en el invoke (validación cliente
// por construcción). Solo roles 'assistant' las reciben.
function buildSentSources(contextPayload) {
    const recent = contextPayload?.repo_memory?.recent;
    if (!Array.isArray(recent) || !recent.length) return undefined;
    const sources = recent
        .filter((entry) => entry?.id)
        .map((entry) => ({
            id: String(entry.id),
            title: String(entry.path || '').split(' / ').pop() || entry.bitacora || 'Nota',
            date: entry.date || null
        }));
    return sources.length ? sources : undefined;
}

function isLikelyNonAgroQuestion(text) {
    const normalized = String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const agroKeywords = [
        'cultivo', 'siembra', 'cosecha', 'riego', 'plaga', 'fertiliz', 'suelo', 'hongo',
        'fungic', 'insect', 'malez', 'semilla', 'germin', 'hoja', 'raiz', 'tallo',
        'mancha', 'podred', 'clima', 'humedad', 'lluvia', 'temperatura', 'viento',
        'invernadero', 'nutrient', 'ph', 'abono', 'agro', 'fitosanit', 'pulgon', 'acaro',
        'roya', 'mildiu', 'oidio', 'botrytis', 'fusarium', 'bacteria', 'virus'
    ];

    const nonAgroKeywords = [
        'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'crypto', 'cripto', 'blockchain', 'trading',
        'forex', 'acciones', 'bolsa', 'nft', 'defi', 'wallet', 'binance', 'metamask',
        'capital de', 'poema', 'cuento', 'historia', 'codigo', 'programa', 'javascript', 'react',
        'vue', 'svelte', 'python', 'java', 'sql', 'docker', 'linux', 'windows', 'mac',
        'pelicula', 'serie', 'musica', 'futbol', 'nba', 'nfl', 'politica', 'presidente'
    ];

    const hasAgro = agroKeywords.some((kw) => normalized.includes(kw));
    const hasNonAgro = nonAgroKeywords.some((kw) => normalized.includes(kw));

    return hasNonAgro && !hasAgro;
}

function openAgroAssistant() {
    const page = document.getElementById('agro-assistant-page');
    if (!page) {
        console.warn('[AGRO] assistant page not found');
        return;
    }
    try {
        hydrateAssistantState();
        renderThreads();
        renderAssistantHistory(preloadThreadMessages(assistantState.activeThreadId || ''));
        setAssistantStatus('En línea');
        setAssistantLoading(false);
        setAssistantDrawerOpen(false);
        const initialMessages = preloadThreadMessages(assistantState.activeThreadId || '');
        syncAssistantGuideLayout({ messagesCount: initialMessages.length, forceCollapse: true });
        updateAssistantCooldownUI();
        startAssistantCooldownTimer();
        updateAssistantStats(assistantState.messagesByThreadId);
        refreshContextPanel(getAssistantContext());
        const input = document.getElementById('agro-assistant-input');
        requestAnimationFrame(() => input?.focus({ preventScroll: true }));
    } catch (err) {
        console.warn('[AGRO] assistant open failed', err?.message || err);
    }
}

function closeAgroAssistant() {
    setAssistantDrawerOpen(false);
    stopAssistantTimers();
    window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
        detail: { view: 'dashboard', scroll: true }
    }));
}

function getAssistantErrorMessage(error) {
    const status = error?.status || error?.statusCode;
    const rawMessage = typeof error?.message === 'string' ? error.message : '';
    const contextMessage = typeof error?.context?.error?.message === 'string' ? error.context.error.message : '';
    const contextError = typeof error?.context?.error === 'string' ? error.context.error : '';
    const detail = (contextMessage || contextError || rawMessage).toLowerCase();

    // Errores de Auth
    if (status === 401 || status === 403) {
        return 'Sesion expirada o sin permiso. Inicia sesion y vuelve a intentar.';
    }

    // Errores de Rate Limit
    if (status === 429) {
        return 'Límite de consultas alcanzado. Espera unos segundos.';
    }

    // Errores de Servidor (5xx)
    if (status >= 500) {
        return 'El asistente tiene problemas técnicos momentáneos. Intenta más tarde.';
    }

    // Errores de red/relay de functions.invoke (sin status; ver ANEXO 27)
    if (error?.name === 'FunctionsRelayError') {
        return 'El servicio del asistente no respondió. Intenta nuevamente en unos momentos.';
    }
    if (error?.name === 'FunctionsFetchError') {
        return 'No se pudo contactar al asistente. Verifica tu conexión.';
    }

    // Errores de Red / CORS / Offline
    if (!status || status === 0 ||
        detail.includes('failed to fetch') ||
        detail.includes('networkerror') ||
        detail.includes('cors') ||
        detail.includes('load failed')) {
        return 'Error de conexión: No se pudo contactar al asistente. Verifica tu red.';
    }

    // Errores específicos reportados por backend
    if (detail.includes('empty_prompt')) return 'Por favor escribe tu consulta.';
    if (detail.includes('missing_gemini_key')) return 'Sistema en mantenimiento.';
    if (detail.includes('ai_error')) return 'La IA no pudo procesar tu solicitud. Intenta reformularla.';

    // Fallback genérico pero amigable
    if (detail && !/functionshttperror/i.test(detail)) {
        // Si hay un mensaje técnico legible, mostrarlo limpio si es corto, sino genérico
        return detail.length < 100 ? detail : 'Error inesperado en el asistente.';
    }

    return 'No se pudo consultar el asistente. Intenta nuevamente.';
}

// V9.7: Refactored to use queue system - ALWAYS enqueues first
async function sendAgroAssistantMessage() {
    const input = document.getElementById('agro-assistant-input');
    const prompt = input?.value?.trim() || '';
    if (!prompt) return;

    // Auth check first (before queuing)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        addAssistantMessage({ role: 'error', text: 'Debes iniciar sesion para usar el asistente.' });
        input?.focus();
        return;
    }

    // Non-agro filter (before queuing)
    if (isLikelyNonAgroQuestion(prompt)) {
        addAssistantMessage({
            role: 'system',
            text: 'Soy tu asistente de campo. Preguntame sobre cultivos, plagas, riego, clima o cosecha. Para otros temas usa Crypto u otro modulo.'
        });
        return;
    }

    // ALWAYS add user message to UI history immediately
    addAssistantMessage({ role: 'user', text: prompt });

    // Clear input immediately for UX
    input.value = '';
    input?.focus();

    // CRITICAL: ALWAYS enqueue BEFORE any return or check
    assistantRuntime.queue.push({
        prompt,
        timestamp: Date.now()
    });

    // Update UI to show queue state
    updateAssistantCooldownUI();

    // Show toast if in cooldown/queue mode
    const { remaining } = getCooldownRemainingMs();
    if (remaining > 0 || assistantRuntime.inFlight) {
        const seconds = Math.ceil(remaining / 1000);
        if (assistantRuntime.inFlight) {
            showAssistantToast('Mensaje en cola');
        } else if (remaining > 0) {
            showAssistantToast(`En cola. Se enviara en ${seconds}s`);
        }
        startAssistantCooldownTimer();
        // DO NOT RETURN - the queue will be processed when timer fires
    }

    // Try to process queue immediately if possible
    processAssistantQueue();
}

function initAgroAssistantSurface() {
    if (document.__agroAssistantBound) return;
    document.__agroAssistantBound = true;

    const page = document.getElementById('agro-assistant-page');
    const closeBtn = document.getElementById('btn-close-agro-assistant');
    const sendBtn = document.getElementById('btn-assistant-send');
    const templateBtn = document.getElementById('btn-assistant-template');
    const input = document.getElementById('agro-assistant-input');
    const newThreadBtn = document.getElementById('assistant-new-thread');
    const mobileSidebarClose = document.getElementById('ast-mobile-sidebar-close');

    if (!page) return;

    closeBtn?.addEventListener('click', closeAgroAssistant);
    newThreadBtn?.addEventListener('click', createNewThreadAndActivate);
    mobileSidebarClose?.addEventListener('click', () => setAssistantDrawerOpen(false));

    // Template button (hidden but wired for compat)
    templateBtn?.addEventListener('click', () => {
        const template = 'Cultivo: ... | Etapa: ... | Sintoma: ... | Ubicacion/clima: ... | Que intente: ... | Que necesito: ...';
        if (input) {
            input.value = template;
            input.focus();
        }
    });

    page.addEventListener('click', (event) => {
        if (event.target?.dataset?.close === 'true') {
            closeAgroAssistant();
        }
        if (event.target?.dataset?.drawerClose === 'true') {
            setAssistantDrawerOpen(false);
        }
    });

    // Context panel toggle
    const toggleContextBtn = document.getElementById('ast-toggle-context');
    const closeContextBtn = document.getElementById('ast-close-context');
    const contextPanel = document.getElementById('ast-context-panel');

    function toggleContextPanel() {
        if (!contextPanel) return;
        contextPanel.classList.toggle('collapsed');
        toggleContextBtn?.classList.toggle('active', !contextPanel.classList.contains('collapsed'));
        if (!contextPanel.classList.contains('collapsed')) {
            refreshContextPanel(getAssistantContext());
        }
    }

    toggleContextBtn?.addEventListener('click', toggleContextPanel);
    closeContextBtn?.addEventListener('click', toggleContextPanel);

    // Export modal
    const exportBtn = document.getElementById('ast-export-chat');
    const exportModal = document.getElementById('ast-export-modal');
    const closeExportBtn = document.getElementById('ast-close-export');
    const cancelExportBtn = document.getElementById('ast-cancel-export');
    const confirmExportBtn = document.getElementById('ast-confirm-export');

    exportBtn?.addEventListener('click', () => {
        const thread = getActiveThread();
        if (!thread) return;
        showAssistantExportModal({ title: thread.title, messages: preloadThreadMessages(thread.id) });
    });
    closeExportBtn?.addEventListener('click', closeAssistantExportModal);
    cancelExportBtn?.addEventListener('click', closeAssistantExportModal);
    confirmExportBtn?.addEventListener('click', downloadAssistantExport);
    exportModal?.addEventListener('click', (e) => {
        if (e.target === exportModal) closeAssistantExportModal();
    });

    // Delete thread button (in sidebar footer)
    const deleteThreadBtn = document.getElementById('btn-assistant-delete-thread');
    deleteThreadBtn?.addEventListener('click', () => {
        if (confirm('Eliminar esta conversación?')) {
            deleteActiveThread();
        }
    });

    // Suggestions
    const messagesContainer = document.getElementById('assistant-scroll');
    messagesContainer?.addEventListener('click', (e) => {
        const suggestion = e.target.closest('[data-suggestion]');
        if (suggestion && input) {
            input.value = suggestion.dataset.suggestion;
            sendBtn && (sendBtn.disabled = false);
            autoResizeInput();
            sendAgroAssistantMessage();
        }
    });

    // Send + input
    sendBtn?.addEventListener('click', sendAgroAssistantMessage);

    input?.addEventListener('input', () => {
        autoResizeInput();
        if (input.value.trim().length > 0) {
            sendBtn && (sendBtn.disabled = false);
        } else {
            sendBtn && (sendBtn.disabled = true);
        }
        if (!assistantCooldownTimer) updateAssistantCooldownUI();
    });

    input?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendAgroAssistantMessage();
        }
    });

    // Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setAssistantDrawerOpen(false);
            if (contextPanel && !contextPanel.classList.contains('collapsed')) {
                contextPanel.classList.add('collapsed');
                toggleContextBtn?.classList.remove('active');
            }
            if (exportModal && !exportModal.classList.contains('hidden')) {
                closeAssistantExportModal();
            }
        }
    });

    window.openAgroAssistantInline = openAgroAssistant;

    console.info('[AGRO] assistant dedicated surface wired');
}

export { initAgroAssistantSurface, openAgroAssistant, sendAgroAssistantMessage };

// ANEXO 25 S1: puente para que el monolito (o el bootstrap de index.html)
// pueda inicializar la superficie; idempotente via document.__agroAssistantBound.
window.initAgroAssistantSurface = initAgroAssistantSurface;
