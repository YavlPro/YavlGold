/**
 * agro-assistant-ui.js — Capa de render del Asistente IA
 * ANEXO 25 S1 (2026-09-17): extraído del monolito agro.js (bloque 14952-16465).
 *
 * Reglas del split (decisión D-IA-2 del owner):
 * - Este módulo es render puro: no mantiene estado, no persiste, no invoca red.
 * - NO importa nada de agro.js ni de agro-assistant.js (dependencia unidireccional core -> ui).
 * - Los datos y handlers llegan por parámetro desde el core.
 */

const AGRO_ASSISTANT_DEFAULT_TITLE = 'Nueva conversacion';

function formatThreadTime(ts) {
    if (!Number.isFinite(ts)) return '';
    try {
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
        return '';
    }
}

function clearElement(el) {
    if (!el) return;
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

function renderThreadList({ threads = [], activeThreadId = null, onSelectThread, onDeleteThread } = {}) {
    const list = document.getElementById('assistant-thread-list');
    if (!list) return;
    clearElement(list);

    const sorted = [...threads].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!sorted.length) {
        const empty = document.createElement('div');
        empty.className = 'assistant-thread assistant-empty';
        empty.textContent = 'Aún no hay conversaciones.';
        list.appendChild(empty);
        return;
    }

    sorted.forEach((thread) => {
        const wrapper = document.createElement('div');
        wrapper.className = `assistant-thread-wrapper${thread.id === activeThreadId ? ' is-active' : ''}`;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'assistant-thread';
        button.dataset.threadId = thread.id;

        const title = document.createElement('div');
        title.className = 'assistant-thread-title';
        title.textContent = thread.title || AGRO_ASSISTANT_DEFAULT_TITLE;

        const meta = document.createElement('div');
        meta.className = 'assistant-thread-meta';
        const time = formatThreadTime(thread.lastMessageAt || thread.updatedAt);
        meta.textContent = time ? `Actualizado ${time}` : 'Sin mensajes';

        button.append(title, meta);
        button.addEventListener('click', () => onSelectThread?.(thread.id));

        // V9.7: Delete button for each thread
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'assistant-thread-delete';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Eliminar conversación';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Eliminar esta conversación?')) {
                onDeleteThread?.(thread.id);
            }
        });

        wrapper.append(button, deleteBtn);
        list.appendChild(wrapper);
    });
}

function splitMessageParts(text) {
    const parts = [];
    const input = String(text || '');
    // QA-fix ANEXO 29: el regex traía backslashes DOBLES desde el monolito
    // (agro.js:15256, pre-ANEXO 25) y nunca matcheaba fences reales — los
    // ``` se renderizaban como texto plano. Con \n y [\s\S] reales, los
    // code fences vuelven por el camino de textContent (sin markdown).
    const regex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(input)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', value: input.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'code', lang: match[1] || 'codigo', value: match[2] || '' });
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < input.length) {
        parts.push({ type: 'text', value: input.slice(lastIndex) });
    }
    return parts;
}

// ANEXO 29 QA-fix (18-sep): markdown mínimo en burbujas, SIN parser completo
// y SIN inyección de HTML ajeno. Se escapa & < > ANTES de insertar las
// únicas etiquetas que generamos nosotros (<strong>/<em>). Code fences
// siguen intactos (splitMessageParts + textContent). Los mensajes
// persistidos re-renderizan limpio por pasar por este mismo camino.
function escapeMarkdownText(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderInlineMarkdown(escaped) {
    return escaped
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
}

function appendMarkdownBlock(container, tagName, inlineHtml) {
    const block = document.createElement(tagName);
    // innerHtml seguro: inlineHtml solo contiene texto escapado + nuestras
    // etiquetas strong/em (ningún atributo, ninguna tag de usuario).
    block.innerHTML = inlineHtml;
    container.appendChild(block);
}

function renderTextPart(body, rawText) {
    const lines = String(rawText || '').split(/\r?\n/);
    let listItems = null;

    const flushList = () => {
        if (!listItems) return;
        const ul = document.createElement('ul');
        listItems.forEach((itemHtml) => {
            const li = document.createElement('li');
            li.innerHTML = itemHtml;
            ul.appendChild(li);
        });
        body.appendChild(ul);
        listItems = null;
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            return;
        }

        const listItem = trimmed.match(/^[-*]\s+(.*)$/);
        if (listItem) {
            listItems = listItems || [];
            listItems.push(renderInlineMarkdown(escapeMarkdownText(listItem[1])));
            return;
        }

        flushList();
        const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
        const content = heading ? heading[1] : trimmed;
        appendMarkdownBlock(body, 'p', renderInlineMarkdown(escapeMarkdownText(content)));
    });

    flushList();
}

function renderMessageContent(container, text) {
    const body = document.createElement('div');
    body.className = 'assistant-message-body';
    const parts = splitMessageParts(text);
    parts.forEach((part) => {
        if (part.type === 'code') {
            const block = document.createElement('div');
            block.className = 'assistant-code';

            const header = document.createElement('div');
            header.className = 'assistant-code-header';
            const label = document.createElement('span');
            label.textContent = part.lang ? part.lang.toUpperCase() : 'CODIGO';
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'assistant-code-copy';
            copyBtn.textContent = 'Copiar';
            copyBtn.addEventListener('click', () => {
                const copyPromise = navigator.clipboard?.writeText(part.value || '');
                if (copyPromise && typeof copyPromise.then === 'function') {
                    copyPromise.then(() => {
                        showAssistantToast('Copiado');
                    }).catch(() => {
                        showAssistantToast('No se pudo copiar');
                    });
                } else {
                    showAssistantToast('No se pudo copiar');
                }
            });
            header.append(label, copyBtn);

            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = part.value || '';
            pre.appendChild(code);

            block.append(header, pre);

            body.appendChild(block);
            return;
        }

        if (part.value) {
            renderTextPart(body, part.value);
        }
    });

    if (!body.childNodes.length) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text || '';
        body.appendChild(paragraph);
    }

    container.appendChild(body);
}

function getAssistantScrollContainer() {
    return document.getElementById('assistant-scroll') || document.getElementById('assistant-history');
}

// ANEXO 29 S1 — footer de citas "Contexto consultado". Los sources llegan por
// mensaje desde el core (construidos desde el contexto realmente enviado);
// este módulo nunca parsea texto del modelo para fabricar citas.
function formatSourceDate(value) {
    const ts = Date.parse(value);
    if (!Number.isFinite(ts)) return '';
    try {
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (_e) {
        return '';
    }
}

function navigateToRepoEntry(entryId) {
    if (!entryId || typeof window._agroRepoOpenEntry !== 'function') return;
    // ANEXO 29 S2: dentro del workspace Memoria la cita revela el panel RAG
    // (desktop: IA→Ambas; móvil: →Memoria) y abre la entrada. El fallback
    // legacy (navegación a la vista agrorepo, hoy alias de memoria) cubre
    // un workspace no cargado.
    if (typeof window._agroMemoriaRevealRag === 'function') {
        window._agroMemoriaRevealRag();
    } else {
        try {
            const url = new URL(window.location.href);
            url.hash = 'view=agrorepo';
            history.replaceState(null, '', url);
        } catch (_err) { /* ignore */ }
        window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
            detail: { view: 'agrorepo', scroll: true }
        }));
    }
    window._agroRepoOpenEntry(entryId);
}

function renderMessageSources(container, sources) {
    const footer = document.createElement('div');
    footer.className = 'assistant-message-sources';

    const label = document.createElement('span');
    label.className = 'assistant-message-sources-label';
    label.textContent = 'Contexto consultado';
    footer.appendChild(label);

    const chips = document.createElement('div');
    chips.className = 'assistant-message-sources-chips';

    sources.forEach((source) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'assistant-message-source-chip';
        chip.dataset.agroSourceId = String(source?.id || '');
        chip.title = source?.path || source?.title || 'Ver en AgroRepo';

        const chipTitle = document.createElement('span');
        chipTitle.textContent = String(source?.title || 'Nota');
        chip.appendChild(chipTitle);

        const dateLabel = formatSourceDate(source?.date);
        if (dateLabel) {
            const chipDate = document.createElement('span');
            chipDate.className = 'assistant-message-source-chip-date';
            chipDate.textContent = dateLabel;
            chip.appendChild(chipDate);
        }

        chip.addEventListener('click', () => {
            navigateToRepoEntry(chip.dataset.agroSourceId);
        });
        chips.appendChild(chip);
    });

    footer.appendChild(chips);
    container.appendChild(footer);
}

function isNearBottom(container) {
    const threshold = 80;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
}

function scrollAssistantToBottom(force = false) {
    const container = getAssistantScrollContainer();
    if (!container) return;
    if (force || isNearBottom(container)) {
        container.scrollTop = container.scrollHeight;
    }
}

function renderAssistantHistory(messages = []) {
    const container = document.getElementById('assistant-history');
    if (!container) return;
    clearElement(container);

    // Toggle welcome visibility
    const welcome = document.getElementById('ast-welcome');
    if (welcome) {
        welcome.style.display = messages.length === 0 ? '' : 'none';
    }

    if (!messages.length) {
        syncAssistantGuideLayout({ messagesCount: 0 });
        return;
    }

    messages.forEach((item) => {
        const message = document.createElement('div');
        const role = item?.role === 'user'
            ? 'user'
            : item?.role === 'error'
                ? 'error'
                : item?.role === 'system'
                    ? 'system'
                    : 'assistant';
        message.className = `assistant-message ${role}`;
        renderMessageContent(message, item?.text || '');
        if (role === 'assistant' && Array.isArray(item?.sources) && item?.sources.length) {
            renderMessageSources(message, item.sources);
        }
        const ts = Number(item?.ts);
        if (Number.isFinite(ts) && ts > 0) {
            const meta = document.createElement('div');
            meta.className = 'assistant-message-meta';
            try {
                meta.textContent = new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            } catch (_e) {
                meta.textContent = '';
            }
            if (meta.textContent) message.appendChild(meta);
        }
        container.appendChild(message);
    });
    syncAssistantGuideLayout({ messagesCount: messages.length });
    scrollAssistantToBottom(true);
}

function setAssistantStatus(label) {
    const statusEl = document.getElementById('assistant-status');
    if (statusEl) {
        statusEl.textContent = label;
    }
}

function setAssistantLoading(isLoading) {
    const typingEl = document.getElementById('assistant-typing');
    if (typingEl) {
        typingEl.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
    }
    setAssistantStatus(isLoading ? 'Pensando...' : 'En línea');
    if (isLoading) {
        scrollAssistantToBottom(true);
    }
}

function setAssistantDrawerOpen(open) {
    const shell = document.getElementById('assistant-shell');
    const sidebar = document.getElementById('assistant-sidebar');
    if (!shell) return;
    shell.classList.toggle('drawer-open', open);
    sidebar?.classList.toggle('open', open);
}

function showAssistantToast(text) {
    const toast = document.getElementById('assistant-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-visible');
    setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 1600);
}

function syncAssistantGuideLayout({ messagesCount = 0, forceCollapse = false } = {}) {
    const guide = document.getElementById('assistant-guide');
    if (!guide) return;
    // Guide is now a <details> element — close it when messages exist
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const shouldCollapse = (messagesCount > 0) || (forceCollapse && isMobile);
    if (shouldCollapse) {
        guide.removeAttribute('open');
    }
}

// V2: Auto-resize textarea
function autoResizeInput() {
    const input = document.getElementById('agro-assistant-input');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 110) + 'px';
}

// V2: Update stats counter in sidebar
function updateAssistantStats(messagesByThreadId = {}) {
    const statEl = document.getElementById('ast-stat-messages');
    if (!statEl) return;
    let total = 0;
    Object.values(messagesByThreadId).forEach(msgs => {
        if (Array.isArray(msgs)) total += msgs.length;
    });
    statEl.textContent = total;
}

function appendContextItem(container, key, value) {
    const item = document.createElement('div');
    item.className = 'ast-ctx-item';

    const keyNode = document.createElement('strong');
    keyNode.textContent = `${key ?? ''}:`;

    const valueNode = document.createTextNode(` ${value ?? ''}`);
    item.append(keyNode, valueNode);

    container.appendChild(item);
}

// V2: Refresh context panel with real data
function refreshContextPanel(ctx) {
    if (!ctx) return;

    // Profile section
    const profileItems = document.getElementById('ast-ctx-profile-items');
    const profileEmpty = document.getElementById('ast-ctx-profile-empty');
    if (profileItems) {
        clearElement(profileItems);
        const profile = ctx.user_profile;
        if (profile && (profile.name || profile.farm || profile.experience)) {
            profileEmpty && (profileEmpty.style.display = 'none');
            if (profile.name) appendContextItem(profileItems, 'Nombre', profile.name);
            if (profile.farm) appendContextItem(profileItems, 'Finca', profile.farm);
            if (profile.experience) appendContextItem(profileItems, 'Experiencia', profile.experience);
            if (profile.farm_type) appendContextItem(profileItems, 'Tipo', profile.farm_type);
            if (profile.location) appendContextItem(profileItems, 'Ubicacion', profile.location);
        } else {
            profileEmpty && (profileEmpty.style.display = '');
        }
    }

    // Crops section
    const cropsItems = document.getElementById('ast-ctx-crops-items');
    const cropsEmpty = document.getElementById('ast-ctx-crops-empty');
    if (cropsItems) {
        clearElement(cropsItems);
        const cropCtx = ctx.crop_focus;
        if (cropCtx && cropCtx.name) {
            cropsEmpty && (cropsEmpty.style.display = 'none');
            appendContextItem(cropsItems, 'Cultivo activo', `${cropCtx.name}${cropCtx.variety ? ' (' + cropCtx.variety + ')' : ''}`);
            if (cropCtx.status) appendContextItem(cropsItems, 'Estado', cropCtx.status);
            if (cropCtx.day_x && cropCtx.day_total) appendContextItem(cropsItems, 'Progreso', `Dia ${cropCtx.day_x}/${cropCtx.day_total}`);
        }
        const cropsCount = ctx.stats?.crops_count;
        if (cropsCount) {
            appendContextItem(cropsItems, 'Total cultivos', String(cropsCount));
            cropsEmpty && (cropsEmpty.style.display = 'none');
        }
        if (!cropCtx?.name && !cropsCount) {
            cropsEmpty && (cropsEmpty.style.display = '');
        }
    }

    // Weather section
    const weatherItems = document.getElementById('ast-ctx-weather-items');
    const weatherEmpty = document.getElementById('ast-ctx-weather-empty');
    if (weatherItems) {
        clearElement(weatherItems);
        const weather = ctx.weather_now;
        if (weather && (weather.summary || weather.temp_c)) {
            weatherEmpty && (weatherEmpty.style.display = 'none');
            if (weather.summary) appendContextItem(weatherItems, 'Condicion', weather.summary);
            if (weather.temp_c) appendContextItem(weatherItems, 'Temperatura', `${weather.temp_c}°C`);
            if (weather.humidity) appendContextItem(weatherItems, 'Humedad', `${weather.humidity}%`);
        } else {
            weatherEmpty && (weatherEmpty.style.display = '');
        }
    }

    // Location section
    const locationItems = document.getElementById('ast-ctx-location-items');
    const locationEmpty = document.getElementById('ast-ctx-location-empty');
    if (locationItems) {
        clearElement(locationItems);
        const loc = ctx.location_real;
        if (loc && (loc.label || (loc.lat && loc.lon))) {
            locationEmpty && (locationEmpty.style.display = 'none');
            if (loc.label) appendContextItem(locationItems, 'Lugar', loc.label);
            if (loc.lat && loc.lon) appendContextItem(locationItems, 'Coords', `${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`);
        } else {
            locationEmpty && (locationEmpty.style.display = '');
        }
    }
}

function showAssistantExportModal({ title, messages = [] } = {}) {
    const exportModal = document.getElementById('ast-export-modal');
    if (!exportModal) return;
    const exportData = {
        proyecto: 'YavlGold Agro',
        exportado: new Date().toISOString(),
        conversacion: {
            titulo: title,
            mensajes: messages.map(m => ({
                rol: m.role,
                contenido: m.text,
                fecha: new Date(m.ts).toISOString()
            }))
        }
    };
    const preview = document.getElementById('ast-export-preview');
    if (preview) preview.textContent = JSON.stringify(exportData, null, 2);
    exportModal.classList.remove('hidden');
}

function closeAssistantExportModal() {
    const exportModal = document.getElementById('ast-export-modal');
    exportModal?.classList.add('hidden');
}

function downloadAssistantExport() {
    const preview = document.getElementById('ast-export-preview');
    if (!preview?.textContent) return;
    const blob = new Blob([preview.textContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yavlgold-agro-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeAssistantExportModal();
    showAssistantToast('Exportacion descargada');
}

export {
    autoResizeInput,
    clearElement,
    closeAssistantExportModal,
    downloadAssistantExport,
    formatThreadTime,
    getAssistantScrollContainer,
    isNearBottom,
    refreshContextPanel,
    renderAssistantHistory,
    renderMessageContent,
    renderThreadList,
    scrollAssistantToBottom,
    setAssistantDrawerOpen,
    setAssistantLoading,
    setAssistantStatus,
    showAssistantExportModal,
    showAssistantToast,
    splitMessageParts,
    syncAssistantGuideLayout,
    updateAssistantStats
};
