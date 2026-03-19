import './agro-repo.css';

import {
    AGRO_REPO_SECTIONS,
    AGRO_REPO_TEMPLATES,
    getTemplate,
    getTemplateLabel,
    normalizeTemplateKey
} from './agro-repo-templates.js';
import { buildNoteSnippet, countNotesBySection, filterNotes } from './agro-repo-search.js';
import { buildNote, buildRepoContext, loadRepoState, persistRepoState } from './agro-repo-storage.js';

const AGROREPO_ENABLED = true;

const state = {
    repo: null,
    root: null,
    initialized: false,
    query: '',
    section: 'all',
    viewMode: 'editor',
    autoSaveTimer: null
};

const qs = (selector, scope = state.root) => scope?.querySelector(selector) || null;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(text) {
    return escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
}

function renderMarkdown(text) {
    const lines = String(text || '').split(/\r?\n/);
    const blocks = [];
    let listItems = [];

    function flushList() {
        if (!listItems.length) return;
        blocks.push(`<ul class="agrp-md-list">${listItems.join('')}</ul>`);
        listItems = [];
    }

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            blocks.push('<div class="agrp-md-gap"></div>');
            return;
        }

        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
            flushList();
            const level = Math.min(heading[1].length + 1, 4);
            blocks.push(`<h${level} class="agrp-md-heading">${renderInlineMarkdown(heading[2])}</h${level}>`);
            return;
        }

        const checkbox = trimmed.match(/^[-*]\s+\[( |x)\]\s+(.+)$/i);
        if (checkbox) {
            listItems.push(`<li><span class="agrp-md-check">${checkbox[1].toLowerCase() === 'x' ? '&#10003;' : '&#9633;'}</span>${renderInlineMarkdown(checkbox[2])}</li>`);
            return;
        }

        const bullet = trimmed.match(/^[-*]\s+(.+)$/);
        if (bullet) {
            listItems.push(`<li>${renderInlineMarkdown(bullet[1])}</li>`);
            return;
        }

        const quote = trimmed.match(/^>\s+(.+)$/);
        if (quote) {
            flushList();
            blocks.push(`<blockquote class="agrp-md-quote">${renderInlineMarkdown(quote[1])}</blockquote>`);
            return;
        }

        flushList();
        blocks.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    });

    flushList();

    if (!blocks.length) {
        return '<p class="agrp-md-empty">Sin contenido todavia.</p>';
    }

    return blocks.join('');
}

function countWords(text) {
    const words = String(text || '').trim().match(/\S+/g);
    return words ? words.length : 0;
}

function formatRelativeTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return 'pendiente';

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin <= 1) return 'hace un momento';
    if (diffMin < 60) return `hace ${diffMin} min`;

    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `hace ${diffHours} h`;

    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return `hace ${diffDays} d`;

    return date.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: 'short'
    });
}

function formatFullDate(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return date.toLocaleString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function clearTimer() {
    if (state.autoSaveTimer) {
        clearTimeout(state.autoSaveTimer);
        state.autoSaveTimer = null;
    }
}

function getActiveNote() {
    return state.repo?.notes?.find((note) => note.id === state.repo.activeNoteId) || null;
}

function getFilteredNotes() {
    return filterNotes(state.repo?.notes || [], {
        query: state.query,
        section: state.section
    });
}

function syncRepoBridge() {
    window._agroRepoContext = buildRepoContext(state.repo);
}

function showToast(message, type = 'info') {
    const stack = qs('#agrp-toastStack');
    if (!stack) return;

    const toast = document.createElement('div');
    toast.className = `agrp-toast agrp-toast--${type}`;
    toast.innerHTML = `
        <span class="agrp-toast-dot" aria-hidden="true"></span>
        <span>${escapeHtml(message)}</span>
    `;

    stack.appendChild(toast);

    window.setTimeout(() => {
        toast.classList.add('is-leaving');
        window.setTimeout(() => toast.remove(), 180);
    }, 2200);
}

function updateOverview() {
    const notes = state.repo?.notes || [];
    const counts = countNotesBySection(notes);
    const sectionCount = Object.keys(counts).filter((key) => counts[key] > 0).length;

    const totalNotes = qs('#agrp-totalNotes');
    const totalSections = qs('#agrp-totalSections');
    const lastSaved = qs('#agrp-lastSaved');

    if (totalNotes) totalNotes.textContent = String(notes.length);
    if (totalSections) totalSections.textContent = String(sectionCount);
    if (lastSaved) lastSaved.textContent = state.repo?.lastSaved ? formatRelativeTime(state.repo.lastSaved) : 'pendiente';
}

function renderSectionFilters() {
    const mount = qs('#agrp-sectionFilters');
    if (!mount) return;

    const counts = countNotesBySection(state.repo?.notes || []);

    mount.innerHTML = AGRO_REPO_SECTIONS.map((section) => {
        const count = section.key === 'all'
            ? state.repo.notes.length
            : (counts[section.key] || 0);
        const active = state.section === section.key;

        return `
            <button
                type="button"
                class="agrp-filter-chip ${active ? 'is-active' : ''}"
                data-action="set-section"
                data-section="${section.key}"
            >
                <span>${escapeHtml(section.label)}</span>
                <strong>${count}</strong>
            </button>
        `;
    }).join('');
}

function renderNoteList() {
    const mount = qs('#agrp-noteList');
    const count = qs('#agrp-noteCount');
    const summary = qs('#agrp-filterSummary');

    if (!mount || !count || !summary) return;

    const filtered = getFilteredNotes();
    count.textContent = `${filtered.length} nota${filtered.length === 1 ? '' : 's'}`;
    summary.textContent = state.query
        ? `Buscando "${state.query.trim()}"`
        : state.section === 'all'
            ? 'Todo tu contexto local en Markdown.'
            : `${getTemplateLabel(state.section)} filtrada`;

    if (!filtered.length) {
        mount.innerHTML = `
            <div class="agrp-empty-list">
                <h4>Sin coincidencias</h4>
                <p>Ajusta la busqueda o crea una nota nueva desde la plantilla actual.</p>
            </div>
        `;
        return;
    }

    mount.innerHTML = filtered.map((note) => {
        const template = getTemplate(note.templateKey);
        const active = note.id === state.repo.activeNoteId;

        return `
            <button type="button" class="agrp-note-card ${active ? 'is-active' : ''}" data-action="select-note" data-note-id="${note.id}">
                <div class="agrp-note-card-head">
                    <span class="agrp-type-pill" style="--agrp-accent:${template.accentToken};">
                        <i class="${template.iconClass}" aria-hidden="true"></i>
                        <span>${escapeHtml(template.shortLabel)}</span>
                    </span>
                    <span class="agrp-note-date">${escapeHtml(formatRelativeTime(note.updatedAt || note.createdAt))}</span>
                </div>
                <strong class="agrp-note-title">${escapeHtml(note.title)}</strong>
                <p class="agrp-note-snippet">${escapeHtml(buildNoteSnippet(note.content))}</p>
                ${note.legacyPath ? `<span class="agrp-note-path">${escapeHtml(note.legacyPath)}</span>` : ''}
            </button>
        `;
    }).join('');
}

function renderTemplateOptions(selectedKey) {
    return AGRO_REPO_TEMPLATES.map((template) => `
        <option value="${template.key}" ${template.key === selectedKey ? 'selected' : ''}>${escapeHtml(template.label)}</option>
    `).join('');
}

function renderEditor() {
    const mount = qs('#agrp-editorPanel');
    if (!mount) return;

    const note = getActiveNote();
    if (!note) {
        mount.innerHTML = `
            <div class="agrp-empty-state">
                <div class="agrp-empty-icon"><i class="fa-regular fa-note-sticky" aria-hidden="true"></i></div>
                <h3>AgroRepo listo</h3>
                <p>Crea una nota para registrar observaciones, decisiones o incidencias sin convertir esto en otro dashboard.</p>
                <button type="button" class="agrp-btn agrp-btn--primary" data-action="create-note">Crear primera nota</button>
            </div>
        `;
        return;
    }

    const template = getTemplate(note.templateKey);
    const previewMode = state.viewMode === 'preview';
    const wordCount = countWords(note.content);

    mount.innerHTML = `
        <div class="agrp-editor-shell">
            <div class="agrp-editor-head">
                <div class="agrp-editor-title-block">
                    <span class="agrp-type-pill" style="--agrp-accent:${template.accentToken};">
                        <i class="${template.iconClass}" aria-hidden="true"></i>
                        <span>${escapeHtml(template.label)}</span>
                    </span>
                    <input
                        type="text"
                        id="agrp-noteTitle"
                        class="agrp-title-input"
                        maxlength="96"
                        value="${escapeHtml(note.title)}"
                        placeholder="nombre-de-la-nota.md"
                    />
                    <div class="agrp-editor-meta">
                        <span id="agrp-liveSaveState">Guardado local ${escapeHtml(state.repo.lastSaved ? formatRelativeTime(state.repo.lastSaved) : 'pendiente')}</span>
                        <span id="agrp-noteStats">${wordCount} palabras · ${note.content.length} caracteres</span>
                        <span>${escapeHtml(formatFullDate(note.updatedAt || note.createdAt))}</span>
                    </div>
                    ${note.legacyPath ? `<div class="agrp-legacy-path">Origen legacy: ${escapeHtml(note.legacyPath)}</div>` : ''}
                </div>
                <div class="agrp-editor-controls">
                    <label class="agrp-inline-field">
                        <span>Plantilla</span>
                        <select id="agrp-noteTemplate" class="agrp-select">
                            ${renderTemplateOptions(note.templateKey)}
                        </select>
                    </label>
                    <div class="agrp-mode-toggle" role="tablist" aria-label="Modo de nota">
                        <button type="button" class="agrp-mode-btn ${previewMode ? '' : 'is-active'}" data-action="set-mode" data-mode="editor">Editor</button>
                        <button type="button" class="agrp-mode-btn ${previewMode ? 'is-active' : ''}" data-action="set-mode" data-mode="preview">Vista previa</button>
                    </div>
                    <div class="agrp-editor-actions">
                        <button type="button" class="agrp-btn agrp-btn--secondary" data-action="save-note">Guardar</button>
                        <button type="button" class="agrp-btn agrp-btn--ghost" data-action="delete-note">Eliminar</button>
                    </div>
                </div>
            </div>

            <div class="agrp-editor-surface">
                <textarea
                    id="agrp-noteContent"
                    class="agrp-textarea"
                    placeholder="Escribe aqui en Markdown..."
                    ${previewMode ? 'hidden' : ''}
                >${escapeHtml(note.content)}</textarea>
                <div id="agrp-notePreview" class="agrp-preview" ${previewMode ? '' : 'hidden'}>
                    ${renderMarkdown(note.content)}
                </div>
            </div>
        </div>
    `;
}

function renderAll() {
    updateOverview();
    renderSectionFilters();
    renderNoteList();
    renderEditor();
}

function persistNow(showFeedback = false) {
    clearTimer();
    state.repo = persistRepoState(state.repo);
    syncRepoBridge();
    updateOverview();
    renderSectionFilters();
    renderNoteList();

    const saveState = qs('#agrp-liveSaveState');
    if (saveState) {
        saveState.textContent = `Guardado local ${state.repo.lastSaved ? formatRelativeTime(state.repo.lastSaved) : 'pendiente'}`;
    }

    if (showFeedback) {
        showToast('Nota guardada localmente.', 'success');
    }
}

function schedulePersist() {
    const saveState = qs('#agrp-liveSaveState');
    if (saveState) {
        saveState.textContent = 'Guardando local...';
    }

    clearTimer();
    state.autoSaveTimer = window.setTimeout(() => {
        persistNow(false);
    }, 220);
}

function focusTitle() {
    const input = qs('#agrp-noteTitle');
    if (!input) return;
    input.focus();
    input.select();
}

function createNoteFromToolbar() {
    const select = qs('#agrp-newTemplate');
    const templateKey = normalizeTemplateKey(select?.value || 'nota-libre');

    if (templateKey === 'mi-finca') {
        const existingMiFinca = state.repo.notes.find((note) => note.templateKey === 'mi-finca');
        if (existingMiFinca) {
            state.repo.activeNoteId = existingMiFinca.id;
            state.section = 'all';
            state.query = '';
            renderAll();
            showToast('Mi Finca ya existe. Se abrio la nota activa.', 'info');
            focusTitle();
            return;
        }
    }

    const note = buildNote(templateKey, state.repo.notes);
    state.repo.notes.unshift(note);
    state.repo.activeNoteId = note.id;
    state.section = 'all';
    state.query = '';
    state.viewMode = 'editor';
    persistNow(false);
    renderAll();
    showToast(`${getTemplateLabel(templateKey)} creada.`, 'success');
    window.setTimeout(focusTitle, 40);
}

function deleteActiveNote() {
    const note = getActiveNote();
    if (!note) return;

    const confirmed = window.confirm(`Eliminar "${note.title}" de AgroRepo local?`);
    if (!confirmed) return;

    state.repo.notes = state.repo.notes.filter((entry) => entry.id !== note.id);
    state.repo.activeNoteId = state.repo.notes[0]?.id || null;
    persistNow(false);
    renderAll();
    showToast('Nota eliminada del almacenamiento local.', 'info');
}

function handleClick(event) {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;

    if (action === 'create-note') {
        createNoteFromToolbar();
        return;
    }

    if (action === 'set-section') {
        state.section = actionTarget.dataset.section || 'all';
        renderSectionFilters();
        renderNoteList();
        return;
    }

    if (action === 'select-note') {
        state.repo.activeNoteId = actionTarget.dataset.noteId || null;
        state.viewMode = 'editor';
        renderNoteList();
        renderEditor();
        return;
    }

    if (action === 'set-mode') {
        state.viewMode = actionTarget.dataset.mode === 'preview' ? 'preview' : 'editor';
        renderEditor();
        return;
    }

    if (action === 'save-note') {
        persistNow(true);
        return;
    }

    if (action === 'delete-note') {
        deleteActiveNote();
    }
}

function handleInput(event) {
    const note = getActiveNote();
    if (event.target.id === 'agrp-searchInput') {
        state.query = event.target.value || '';
        renderNoteList();
        return;
    }

    if (!note) return;

    if (event.target.id === 'agrp-noteTitle') {
        note.title = event.target.value || '';
        note.updatedAt = new Date().toISOString();
        renderNoteList();
        schedulePersist();
        return;
    }

    if (event.target.id === 'agrp-noteContent') {
        note.content = event.target.value || '';
        note.updatedAt = new Date().toISOString();

        const stats = qs('#agrp-noteStats');
        if (stats) {
            stats.textContent = `${countWords(note.content)} palabras · ${note.content.length} caracteres`;
        }

        const preview = qs('#agrp-notePreview');
        if (preview) {
            preview.innerHTML = renderMarkdown(note.content);
        }

        schedulePersist();
    }
}

function handleChange(event) {
    const note = getActiveNote();
    if (!note) return;

    if (event.target.id === 'agrp-noteTemplate') {
        note.templateKey = normalizeTemplateKey(event.target.value);
        note.updatedAt = new Date().toISOString();
        schedulePersist();
        renderSectionFilters();
        renderNoteList();
        renderEditor();
    }
}

function handleBlur(event) {
    const note = getActiveNote();
    if (!note) return;

    if (event.target.id === 'agrp-noteTitle') {
        persistNow(false);
        const active = getActiveNote();
        if (active) {
            event.target.value = active.title;
        }
    }
}

function handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        persistNow(true);
    }
}

function bindEvents() {
    state.root?.addEventListener('click', handleClick);
    state.root?.addEventListener('input', handleInput);
    state.root?.addEventListener('change', handleChange);
    state.root?.addEventListener('focusout', handleBlur);
    state.root?.addEventListener('keydown', handleKeydown);
}

function renderShell() {
    return `
        <div class="agrp-shell">
            <section class="agrp-hero">
                <div class="agrp-hero-copy">
                    <span class="agrp-kicker">AgroRepo · memoria operativa</span>
                    <h2>Markdown simple para trabajo agricola real.</h2>
                    <p>Notas locales, respirables y utiles para campo: observaciones, incidencias, decisiones, pruebas y la ficha viva de Mi Finca.</p>
                </div>
                <div class="agrp-hero-stats">
                    <article class="agrp-stat-card">
                        <span>Notas</span>
                        <strong id="agrp-totalNotes">0</strong>
                    </article>
                    <article class="agrp-stat-card">
                        <span>Secciones</span>
                        <strong id="agrp-totalSections">0</strong>
                    </article>
                    <article class="agrp-stat-card">
                        <span>Guardado</span>
                        <strong id="agrp-lastSaved">pendiente</strong>
                    </article>
                </div>
            </section>

            <section class="agrp-toolbar">
                <label class="agrp-search" for="agrp-searchInput">
                    <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                    <input id="agrp-searchInput" type="search" placeholder="Buscar por titulo o contenido" autocomplete="off" />
                </label>
                <div class="agrp-toolbar-actions">
                    <label class="agrp-inline-field">
                        <span>Plantilla</span>
                        <select id="agrp-newTemplate" class="agrp-select">
                            ${renderTemplateOptions('observacion')}
                        </select>
                    </label>
                    <button type="button" class="agrp-btn agrp-btn--primary" data-action="create-note">Nueva nota</button>
                </div>
            </section>

            <div class="agrp-section-filters" id="agrp-sectionFilters"></div>

            <section class="agrp-workspace">
                <aside class="agrp-list-panel">
                    <div class="agrp-panel-head">
                        <div>
                            <span class="agrp-panel-kicker">Listado</span>
                            <h3 id="agrp-noteCount">0 notas</h3>
                        </div>
                        <p id="agrp-filterSummary">Todo tu contexto local en Markdown.</p>
                    </div>
                    <div class="agrp-note-list" id="agrp-noteList"></div>
                </aside>

                <article class="agrp-editor-panel" id="agrp-editorPanel"></article>
            </section>

            <div class="agrp-toast-stack" id="agrp-toastStack" aria-live="polite"></div>
        </div>
    `;
}

function initWidget() {
    if (state.initialized) return;

    const root = document.getElementById('agro-widget-root');
    if (!root) {
        console.error('[AgroRepo] Root not found');
        return;
    }

    state.root = root;
    const { repo, notice } = loadRepoState();
    state.repo = repo;
    state.initialized = true;

    root.dataset.loaded = '1';
    root.innerHTML = renderShell();

    bindEvents();
    syncRepoBridge();
    renderAll();

    if (notice) {
        showToast(notice, 'success');
    }
}

function ensureWidgetReady() {
    initWidget();
}

function isAgroRepoShellActive() {
    return document.body?.dataset?.agroActiveView === 'agrorepo';
}

function setupAccordionListener() {
    const accordion = document.getElementById('yg-acc-agrorepo');
    if (!accordion) {
        console.warn('[AgroRepo] Accordion not found');
        return;
    }

    if (accordion.dataset.listenerBound === '1') return;
    accordion.dataset.listenerBound = '1';

    accordion.addEventListener('toggle', () => {
        if (accordion.open) ensureWidgetReady();
    });

    window.addEventListener('agro:shell:view-changed', (event) => {
        if (event.detail?.view !== 'agrorepo') return;
        accordion.open = true;
        const summary = accordion.querySelector('summary');
        if (summary) {
            summary.setAttribute('aria-expanded', 'true');
        }
        ensureWidgetReady();
    });

    if (accordion.open || isAgroRepoShellActive()) {
        accordion.open = true;
        ensureWidgetReady();
    }
}

export function initAgroRepo() {
    if (!AGROREPO_ENABLED) {
        const section = document.getElementById('agro-repo-section');
        if (section) section.style.display = 'none';
        return;
    }

    window.ensureAgroRepoReady = ensureWidgetReady;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAccordionListener, { once: true });
        return;
    }

    setupAccordionListener();
}
