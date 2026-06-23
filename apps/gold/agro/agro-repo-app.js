import './agro-repo.css';

import { AGRO_REPO_ROOT_FOLDERS, getRootFolder, getTemplate } from './agro-repo-templates.js';
import { escapeSearchRegExp, nodeMatchesQuery, normalizeSearchText, searchFiles } from './agro-repo-search.js';
import {
  buildRepoContext,
  collectDescendantIds,
  createFileInRepo,
  createFolderInRepo,
  getAllFiles,
  getChildren,
  getNode,
  getPathNodes,
  getRootFolders,
  getTrashedNodes,
  loadRepoState,
  loadTabState,
  pasteNodeSnapshotIntoRepo,
  persistRepoState,
  persistTabState,
  purgeExpiredTrash,
  purgeNodeFromTrash,
  restoreNodeFromTrash,
  snapshotNodeTree,
  softDeleteNodeInRepo,
  updateNodeInRepo
} from './agro-repo-storage.js';

const AGROREPO_ENABLED = true;

const state = {
  root: null,
  repo: null,
  initialized: false,
  openTabs: [],
  activeFileId: null,
  treeQuery: '',
  preview: false,
  sidebarVisible: true,
  clipboard: null,
  contextTargetId: null,
  modal: null,
  dragNodeId: null,
  view: 'tree',
  saveTimer: null,
  viewportBound: false,
  documentBound: false
};

const qs = (selector, scope = state.root) => scope?.querySelector(selector) || null;
const qsa = (selector, scope = state.root) => Array.from(scope?.querySelectorAll(selector) || []);

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

function nowIso() {
  return new Date().toISOString();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBrandDate() {
  const label = new Intl.DateTimeFormat('es-ES', {
    month: 'short',
    year: 'numeric'
  }).format(new Date()).replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getActiveFile() {
  const node = getNode(state.repo?.nodes, state.activeFileId);
  return node?.type === 'file' && !node.deletedAt ? node : null;
}

function getNodePath(nodeId) {
  const parts = getPathNodes(state.repo?.nodes || [], nodeId).map((node) => node.title);
  return parts.join('/');
}

function getTargetParentId(nodeId) {
  const node = nodeId ? getNode(state.repo?.nodes, nodeId) : null;
  if (!node) return null;
  return node.type === 'folder' ? node.id : (node.parentId || null);
}

function getFolderLocationLabel(folderId = null) {
  if (!folderId) return 'AgroRepo / raíz';
  const path = getPathNodes(state.repo?.nodes || [], folderId)
    .filter((node) => node?.type === 'folder')
    .map((node) => node.title);
  return path.length ? `AgroRepo / ${path.join(' / ')}` : 'AgroRepo / raíz';
}

function expandPathToNode(nodeId, { includeSelf = false } = {}) {
  if (!nodeId || !state.repo) return false;
  const nextExpanded = [...(state.repo.expandedIds || [])];
  let changed = false;

  getPathNodes(state.repo.nodes, nodeId).forEach((node) => {
    if (node?.type !== 'folder') return;
    if (!includeSelf && node.id === nodeId) return;
    if (!nextExpanded.includes(node.id)) {
      nextExpanded.push(node.id);
      changed = true;
    }
  });

  if (changed) state.repo.expandedIds = nextExpanded;
  return changed;
}

function getTemplateKeyForParent(parentId) {
  const rootFolder = getPathNodes(state.repo?.nodes || [], parentId)
    .find((node) => node?.type === 'folder' && node?.parentId === null);

  switch (rootFolder?.folderKey) {
    case 'mi-finca':
      return 'mi-finca';
    case 'observaciones':
      return 'observacion';
    case 'incidencias':
      return 'incidencia';
    case 'decisiones':
      return 'decision';
    case 'pruebas':
      return 'prueba';
    default:
      return 'nota-libre';
  }
}

function getNodeIconClass(node) {
  if (!node) return 'fa-regular fa-circle';
  if (node.type === 'folder') {
    return node.parentId === null
      ? getRootFolder(node.folderKey || 'mi-finca').iconClass
      : 'fa-regular fa-folder-open';
  }
  // All .md files share the same icon regardless of templateKey/origin so the
  // tree stays visually uniform. Folders keep their per-type icon above.
  return 'fa-regular fa-file-lines';
}

function compareByTitle(left, right) {
  return String(left?.title || '').localeCompare(String(right?.title || ''), 'es', {
    sensitivity: 'base',
    numeric: true
  });
}

function getSortedChildren(parentId) {
  const children = getChildren(state.repo?.nodes || [], parentId).filter((node) => !node.deletedAt);
  const folders = children.filter((node) => node.type === 'folder').sort(compareByTitle);
  const files = children.filter((node) => node.type === 'file').sort(compareByTitle);

  if (parentId === null) {
    const system = [];
    AGRO_REPO_ROOT_FOLDERS.forEach((definition) => {
      const node = folders.find((entry) => entry.system && entry.folderKey === definition.key);
      if (node) system.push(node);
    });
    const extras = folders.filter((entry) => !entry.system);
    return [...system, ...extras, ...files];
  }

  return [...folders, ...files];
}

function getVisibleNodeIds() {
  const query = normalizeSearchText(state.treeQuery);
  // Active (non-trashed) nodes only — the trash bin is rendered separately.
  if (!query) return new Set((state.repo?.nodes || []).filter((node) => !node.deletedAt).map((node) => node.id));

  const visible = new Set();

  function mark(node) {
    if (!node || node.deletedAt) return false;
    const directMatch = nodeMatchesQuery(node, query, (entry) => getTemplate(entry.templateKey).label);
    const childMatch = getChildren(state.repo.nodes, node.id).some((child) => mark(child));

    if (directMatch || childMatch) {
      visible.add(node.id);
      getPathNodes(state.repo.nodes, node.id).forEach((entry) => !entry.deletedAt && visible.add(entry.id));
      return true;
    }
    return false;
  }

  getSortedChildren(null).forEach((node) => mark(node));
  return visible;
}

function highlightMatch(text, query) {
  const safeText = escapeHtml(text);
  if (!query) return safeText;
  return safeText.replace(new RegExp(`(${escapeSearchRegExp(query)})`, 'gi'), '<mark>$1</mark>');
}

function renderInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function parseTable(lines, startIndex) {
  const head = lines[startIndex];
  const divider = lines[startIndex + 1];
  if (!head || !divider) return null;
  if (!head.includes('|')) return null;
  if (!/^\s*\|?[-:\s|]+\|?\s*$/.test(divider)) return null;

  const parseRow = (row) => row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  const headers = parseRow(head);
  const bodyRows = [];
  let cursor = startIndex + 2;
  while (cursor < lines.length && lines[cursor].includes('|') && lines[cursor].trim()) {
    bodyRows.push(parseRow(lines[cursor]));
    cursor += 1;
  }

  return {
    nextIndex: cursor,
    html: `
      <table>
        <thead>
          <tr>${headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `
  };
}

function renderMarkdown(content) {
  const lines = String(content || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let listItems = [];
  let listType = '';
  let inCode = false;
  let codeLines = [];

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(`<${listType}>${listItems.join('')}</${listType}>`);
    listItems = [];
    listType = '';
  };

  const flushCode = () => {
    if (!inCode) return;
    blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
    inCode = false;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      flushList();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      flushList();
      blocks.push(table.html);
      index = table.nextIndex - 1;
      continue;
    }

    if (!trimmed) {
      flushList();
      blocks.push('');
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushList();
      blocks.push('<hr>');
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      blocks.push(`<h${heading[1].length}>${renderInlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const quote = trimmed.match(/^>\s+(.+)$/);
    if (quote) {
      flushList();
      blocks.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    const check = trimmed.match(/^[-*]\s+\[( |x)\]\s+(.+)$/i);
    if (check) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(`<li class="agrp-task-item">${check[1].toLowerCase() === 'x' ? '☑' : '☐'} ${renderInlineMarkdown(check[2])}</li>`);
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(`<li>${renderInlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    flushList();
    blocks.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  }

  flushList();
  flushCode();

  return blocks.filter(Boolean).join('') || '<p>Sin contenido todavía.</p>';
}

function updateCounts(text) {
  const charCount = qs('#agrpCharCount');
  const lineCount = qs('#agrpLineCount');
  const safe = String(text || '');

  if (!safe) {
    if (charCount) charCount.textContent = '';
    if (lineCount) lineCount.textContent = '';
    return;
  }

  if (charCount) charCount.textContent = `${safe.length} chars`;
  if (lineCount) lineCount.textContent = `${safe.split('\n').length} líneas`;
}

function syncRepoBridge() {
  window._agroRepoContext = buildRepoContext(state.repo);
}

function persistUiState() {
  persistTabState(state.openTabs, state.activeFileId);
}

function syncActiveFileDraft() {
  const file = getActiveFile();
  const editor = qs('#agrpEditor');
  if (!file || !editor) return false;

  // Defense: only flush the draft if the <textarea> is actually bound to the
  // active file. This protects against windows where activeFileId has just
  // changed but renderEditor() hasn't repainted yet (prevents cross-file
  // content bleed like the confirmCreate bug).
  const boundId = editor.dataset.fileId;
  if (boundId && boundId !== file.id) return false;

  const nextContent = editor.value;
  if (nextContent === file.content) return false;

  file.content = nextContent;
  file.updatedAt = nowIso();
  return true;
}

function persistAll(showToast = false) {
  if (state.saveTimer) {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
  }

  syncActiveFileDraft();
  state.repo.activeNodeId = state.activeFileId || null;
  state.repo = persistRepoState(state.repo);
  persistUiState();
  syncRepoBridge();
  updateHeader();
  updateStatusBar();
  if (showToast) pushToast('Guardado local', 'success');
}

function schedulePersist() {
  if (state.saveTimer) clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => {
    persistAll(false);
  }, 180);
}

function sanitizeOpenTabs() {
  // A trashed file shouldn't stay open as a tab — it lives in the trash bin now.
  const isLiveFile = (id) => {
    const node = getNode(state.repo.nodes, id);
    return node?.type === 'file' && !node.deletedAt;
  };
  state.openTabs = state.openTabs.filter(isLiveFile);
  if (state.activeFileId && !isLiveFile(state.activeFileId)) {
    state.activeFileId = state.openTabs[state.openTabs.length - 1] || null;
  }
  if (!state.activeFileId && state.openTabs.length) {
    state.activeFileId = state.openTabs[state.openTabs.length - 1];
  }
  if (state.activeFileId && !state.openTabs.includes(state.activeFileId)) {
    state.openTabs.push(state.activeFileId);
  }
  state.repo.activeNodeId = state.activeFileId || null;
}

function updateSidebarVisibility() {
  const sidebar = qs('#agrpSidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('hidden', !state.sidebarVisible);
}

function updateHeader() {
  const title = qs('#agrpHeaderTitle');
  const previewBtn = qs('#agrpPreviewToggle');
  const saveBtn = qs('#agrpSaveBtn');
  const file = getActiveFile();

  if (!title || !previewBtn) return;

  if (!file) {
    title.innerHTML = '<span>AgroRepo</span> — Selecciona un archivo';
    previewBtn.hidden = true;
    previewBtn.classList.remove('is-active');
    if (saveBtn) saveBtn.hidden = true;
    return;
  }

  title.innerHTML = `<span>${escapeHtml(file.title)}</span> — ${escapeHtml(getNodePath(file.id))}`;
  previewBtn.hidden = false;
  previewBtn.classList.toggle('is-active', state.preview);
  if (saveBtn) saveBtn.hidden = false;
}

function updateStatusBar() {
  const file = getActiveFile();
  const editor = qs('#agrpEditor');
  const text = editor && !editor.hidden && editor.dataset.fileId === file?.id ? editor.value : (file?.content || '');

  updateCounts(text);
}

function renderTreeNode(node, visibleIds, depth = 0) {
  if (visibleIds && !visibleIds.has(node.id)) return '';
  // System roots stay pinned to the root level: they act as drop targets but
  // cannot be dragged out of the root. All other nodes are fully draggable.
  const isSystemRoot = node.type === 'folder' && node.system === true;

  if (node.type === 'folder') {
    const children = getSortedChildren(node.id).filter((child) => !visibleIds || visibleIds.has(child.id));
    const hasChildren = children.length > 0;
    const isOpen = state.treeQuery ? hasChildren : state.repo.expandedIds.includes(node.id);
    return `
      <div class="agrp-tree-node" data-depth="${depth}">
        <div class="agrp-tree-item folder ${isOpen ? 'open' : ''} ${hasChildren ? 'has-children' : 'is-empty'}" data-node-id="${node.id}" data-node-type="folder" data-draggable="${isSystemRoot ? 'false' : 'true'}" ${isSystemRoot ? '' : 'draggable="true"'} title="${escapeHtml(node.title)}" aria-expanded="${hasChildren ? String(isOpen) : 'false'}" role="button">
          <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          <span class="agrp-tree-icon"><i class="${getNodeIconClass(node)}" aria-hidden="true"></i></span>
          <span class="label" title="${escapeHtml(node.title)}">${escapeHtml(node.title)}</span>
        </div>
        <div class="agrp-tree-children ${isOpen ? '' : 'collapsed'}">
          ${children.map((child) => renderTreeNode(child, visibleIds, depth + 1)).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="agrp-tree-node" data-depth="${depth}">
      <div class="agrp-tree-item ${node.id === state.activeFileId ? 'active' : ''}" data-node-id="${node.id}" data-node-type="file" data-draggable="true" draggable="true" title="${escapeHtml(node.title)}" role="button">
        <span class="agrp-tree-spacer"></span>
        <span class="agrp-tree-icon"><i class="${getNodeIconClass(node)}" aria-hidden="true"></i></span>
        <span class="label" title="${escapeHtml(node.title)}">${escapeHtml(node.title)}</span>
      </div>
    </div>
  `;
}

function renderTree() {
  // When the trash view is active, delegate to the trash renderer so all the
  // existing call sites (create/delete/restore/drag) refresh the right surface.
  if (state.view === 'trash') {
    renderTrash();
    return;
  }

  const container = qs('#agrpTreeContainer');
  if (!container) return;

  const visibleIds = getVisibleNodeIds();
  const roots = getSortedChildren(null).filter((node) => visibleIds.has(node.id));

  if (!roots.length) {
    container.innerHTML = '<div class="agrp-tree-empty">Sin resultados</div>';
    return;
  }

  container.innerHTML = roots.map((node) => renderTreeNode(node, visibleIds)).join('');
}

// Relative date for trash entries — mirrors the agro-trash.js style ("hace N días").
function formatTrashDate(iso) {
  const ts = Date.parse(iso);
  if (!iso || Number.isNaN(ts)) return '';
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function updateTrashBadge() {
  const badge = qs('#agrpTrashBadge');
  if (!badge) return;
  const count = getTrashedNodes(state.repo?.nodes || []).length;
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

function renderTrash() {
  const container = qs('#agrpTreeContainer');
  if (!container) return;

  const items = getTrashedNodes(state.repo.nodes);

  const headerHtml = `
    <div class="agrp-trash-header">
      <div class="agrp-trash-title"><i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Papelera</span></div>
      <div class="agrp-trash-actions">
        ${items.length ? `<button type="button" class="agrp-btn agrp-btn-ghost agrp-trash-empty-btn" data-action="purge-expired" title="Eliminar permanentemente lo expirado (>30 días)">Vaciar</button>` : ''}
        <button type="button" class="agrp-btn-icon" title="Volver" data-action="close-trash"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>
      </div>
    </div>
  `;

  if (!items.length) {
    container.innerHTML = `${headerHtml}<div class="agrp-tree-empty">La papelera está vacía</div>`;
    return;
  }

  const itemsHtml = items.map((node) => {
    const isFolder = node.type === 'folder';
    const iconClass = isFolder ? 'fa-solid fa-folder' : 'fa-regular fa-file-lines';
    const typeLabel = isFolder ? 'Carpeta' : 'Archivo';
    const descendants = isFolder ? collectDescendantIds(state.repo.nodes, node.id) : [node.id];
    const extra = isFolder && descendants.length > 1 ? ` · ${descendants.length - 1} elemento(s)` : '';
    return `
      <div class="agrp-trash-item">
        <div class="agrp-trash-item-info">
          <span class="agrp-trash-item-icon"><i class="${iconClass}" aria-hidden="true"></i></span>
          <div class="agrp-trash-item-text">
            <span class="agrp-trash-item-name">${escapeHtml(node.title)}</span>
            <span class="agrp-trash-item-meta">${typeLabel}${extra} · ${escapeHtml(formatTrashDate(node.deletedAt))}</span>
          </div>
        </div>
        <div class="agrp-trash-item-actions">
          <button type="button" class="agrp-btn agrp-btn-ghost agrp-trash-restore-btn" data-action="restore-node" data-node-id="${node.id}">Restaurar</button>
          <button type="button" class="agrp-btn-icon" title="Eliminar permanente" data-action="purge-node" data-node-id="${node.id}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = headerHtml + itemsHtml;
}

function renderTabs() {
  const container = qs('#agrpEditorTabs');
  if (!container) return;
  sanitizeOpenTabs();

  if (!state.openTabs.length) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.innerHTML = state.openTabs.map((id) => {
    const file = getNode(state.repo.nodes, id);
    if (!file || file.type !== 'file') return '';
    return `
      <div class="agrp-tab ${id === state.activeFileId ? 'active' : ''}" data-tab-id="${id}" title="${escapeHtml(file.title)}">
        <span class="agrp-tab-label">${escapeHtml(file.title)}</span>
        <button type="button" class="close" data-action="close-tab" data-tab-id="${id}" aria-label="Cerrar pestaña">&times;</button>
      </div>
    `;
  }).join('');
}

function renderEditor() {
  const editorWrap = qs('#agrpEditorWrap');
  const preview = qs('#agrpPreviewContent');
  const empty = qs('#agrpEmptyState');
  const editor = qs('#agrpEditor');
  const file = getActiveFile();

  if (!editorWrap || !preview || !empty || !editor) return;

  if (!file) {
    editorWrap.hidden = true;
    preview.hidden = true;
    empty.hidden = false;
    state.preview = false;
    updateHeader();
    updateStatusBar();
    return;
  }

  empty.hidden = true;
  editor.dataset.fileId = file.id;
  if (editor.value !== file.content) editor.value = file.content || '';
  preview.innerHTML = renderMarkdown(file.content || '');

  if (state.preview) {
    preview.hidden = false;
    editorWrap.hidden = true;
  } else {
    preview.hidden = true;
    editorWrap.hidden = false;
  }

  updateHeader();
  updateStatusBar();
}

function renderSearchResults(query) {
  const container = qs('#agrpSearchResults');
  if (!container) return;

  const results = searchFiles(getAllFiles(state.repo.nodes), query, (file) => getNodePath(file.id));
  if (!query || query.length < 2) {
    container.innerHTML = '';
    return;
  }

  if (!results.length) {
    container.innerHTML = '<div class="agrp-search-empty">Sin resultados</div>';
    return;
  }

  container.innerHTML = results.slice(0, 30).map((result) => `
    <button type="button" class="agrp-search-result" data-action="open-search-result" data-file-id="${result.file.id}">
      <div class="sr-path">${highlightMatch(result.path, query)}</div>
      <div class="sr-line">${result.type === 'content'
        ? `L${result.lineNum}: ${highlightMatch(result.line || result.file.title, query)}`
        : highlightMatch(result.file.title || result.path, query)}</div>
    </button>
  `).join('');
}

function updateContextMenuState() {
  const menu = qs('#agrpCtxMenu');
  if (!menu) return;

  const node = state.contextTargetId ? getNode(state.repo.nodes, state.contextTargetId) : null;
  const isRoot = !node;
  const isFile = node?.type === 'file';

  qsa('[data-ctx-action]', menu).forEach((item) => {
    const action = item.dataset.ctxAction;
    let disabled = false;

    // System roots are now fully manageable (rename/delete) per user request;
    // the only hard block is interacting with the empty background (isRoot).
    if ((action === 'rename' || action === 'copy' || action === 'duplicate' || action === 'delete') && !node) {
      disabled = true;
    }
    if (action === 'paste' && !state.clipboard) disabled = true;
    if (action === 'export' && !isFile) disabled = true;
    if (isRoot && (action === 'rename' || action === 'copy' || action === 'duplicate' || action === 'export' || action === 'delete')) {
      disabled = true;
    }

    item.classList.toggle('is-disabled', disabled);
    item.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  });
}

function hideContextMenu() {
  const menu = qs('#agrpCtxMenu');
  if (!menu) return;
  menu.classList.remove('show');
}

function showContextMenu(clientX, clientY, nodeId = null) {
  const menu = qs('#agrpCtxMenu');
  if (!menu) return;

  state.contextTargetId = nodeId;
  updateContextMenuState();
  menu.classList.add('show');

  const width = 220;
  const height = Math.max(menu.offsetHeight, 280);
  menu.style.left = `${Math.min(clientX, window.innerWidth - width - 12)}px`;
  menu.style.top = `${Math.min(clientY, window.innerHeight - height - 12)}px`;
}

function setModalVisible(selector, visible) {
  qs(selector)?.classList.toggle('show', visible);
}

function closeModal() {
  state.modal = null;
  qsa('.agrp-modal-overlay').forEach((overlay) => overlay.classList.remove('show'));
}

function getFolderOptions(selectedId = null) {
  const rootLabel = 'AgroRepo / raíz';
  const options = [`<option value="__root__" ${selectedId ? '' : 'selected'} title="${rootLabel}">${rootLabel}</option>`];

  function walk(parentId, segments = ['AgroRepo']) {
    getSortedChildren(parentId)
      .filter((node) => node.type === 'folder')
      .forEach((folder) => {
        const pathSegments = [...segments, folder.title];
        const pathLabel = pathSegments.join(' / ');
        options.push(`<option value="${folder.id}" ${folder.id === selectedId ? 'selected' : ''} title="${escapeHtml(pathLabel)}">${escapeHtml(pathLabel)}</option>`);
        walk(folder.id, pathSegments);
      });
  }

  walk(null);
  return options.join('');
}

function updateCreateLocationHint() {
  const select = qs('#agrpCreateParent');
  const hint = qs('#agrpCreateLocationHint');
  if (!select || !hint) return;

  const label = select.selectedOptions?.[0]?.textContent?.trim() || getFolderLocationLabel(null);
  select.title = label;
  hint.textContent = `Se alojará en ${label}`;
  hint.title = label;
}

function getDefaultParentId(type = 'file') {
  const file = getActiveFile();
  if (file?.parentId) return file.parentId;
  return type === 'file' ? (getRootFolders(state.repo.nodes)[0]?.id || null) : null;
}

function openCreateModal(type, parentId = null) {
  persistAll(false);
  state.modal = {
    id: 'create',
    createType: type,
    parentId: typeof parentId === 'undefined' || parentId === null ? getDefaultParentId(type) : parentId
  };

  qs('#agrpCreateModalTitle').textContent = type === 'file' ? 'Nuevo archivo' : 'Nueva carpeta';
  const input = qs('#agrpCreateName');
  const select = qs('#agrpCreateParent');
  if (input) {
    input.value = type === 'file' ? '.md' : '';
    input.placeholder = type === 'file' ? 'nombre.md' : 'mi-carpeta';
  }
  if (select) {
    select.innerHTML = getFolderOptions(state.modal.parentId);
    select.value = state.modal.parentId || '__root__';
  }
  updateCreateLocationHint();

  setModalVisible('#agrpCreateModal', true);
  window.setTimeout(() => {
    input?.focus();
    if (type === 'file') input?.setSelectionRange(0, 0);
  }, 30);
}

function openRenameModal(nodeId) {
  const node = getNode(state.repo.nodes, nodeId);
  if (!node) return;

  persistAll(false);
  state.modal = {
    id: 'rename',
    nodeId
  };
  const input = qs('#agrpRenameName');
  if (input) {
    input.value = node.title;
  }
  setModalVisible('#agrpRenameModal', true);
  window.setTimeout(() => {
    input?.focus();
    const dotIndex = node.title.lastIndexOf('.');
    input?.setSelectionRange(0, dotIndex > 0 ? dotIndex : node.title.length);
  }, 30);
}

function openDeleteModal(nodeId) {
  const node = getNode(state.repo.nodes, nodeId);
  if (!node) return;

  persistAll(false);
  state.modal = {
    id: 'delete',
    nodeId
  };

  const descendants = collectDescendantIds(state.repo.nodes, node.id);
  const count = Math.max(0, descendants.length - 1);
  const message = node.type === 'folder'
    ? `¿Eliminar la carpeta <strong>${escapeHtml(node.title)}</strong> y ${count} elemento(s) interno(s)?`
    : `¿Eliminar <strong>${escapeHtml(node.title)}</strong>?`;
  const copy = qs('#agrpDeleteMsg');
  if (copy) copy.innerHTML = message;
  setModalVisible('#agrpDeleteModal', true);
}

function openSearchModal() {
  persistAll(false);
  state.modal = {
    id: 'search'
  };
  const input = qs('#agrpGlobalSearchInput');
  const results = qs('#agrpSearchResults');
  if (input) input.value = '';
  if (results) results.innerHTML = '';
  setModalVisible('#agrpSearchModal', true);
  window.setTimeout(() => input?.focus(), 30);
}

function pushToast(message, type = 'info') {
  const container = qs('#agrpToastContainer');
  if (!container) return;

  const icons = {
    success: 'fa-solid fa-check',
    error: 'fa-solid fa-xmark',
    info: 'fa-solid fa-circle-info'
  };

  const toast = document.createElement('div');
  toast.className = `agrp-toast ${type}`;
  toast.innerHTML = `
    <span class="agrp-toast-icon"><i class="${icons[type] || icons.info}" aria-hidden="true"></i></span>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function toggleFolder(nodeId) {
  const folder = getNode(state.repo.nodes, nodeId);
  if (!folder || folder.type !== 'folder') return;
  if (state.repo.expandedIds.includes(nodeId)) {
    state.repo.expandedIds = state.repo.expandedIds.filter((id) => id !== nodeId);
  } else {
    state.repo.expandedIds.push(nodeId);
  }
  state.repo = persistRepoState(state.repo);
  syncRepoBridge();
  renderTree();
}

function openFile(fileId, { skipSave = false } = {}) {
  if (!skipSave) persistAll(false);

  const file = getNode(state.repo.nodes, fileId);
  if (!file || file.type !== 'file') return;

  expandPathToNode(file.id);
  if (!state.openTabs.includes(file.id)) state.openTabs.push(file.id);
  state.activeFileId = file.id;
  state.repo.activeNodeId = file.id;
  if (isMobileViewport()) state.sidebarVisible = false;

  persistUiState();
  state.repo = persistRepoState(state.repo);
  syncRepoBridge();
  updateSidebarVisibility();
  renderTree();
  renderTabs();
  renderEditor();
}

function closeTab(fileId) {
  persistAll(false);
  state.openTabs = state.openTabs.filter((id) => id !== fileId);
  if (state.activeFileId === fileId) {
    state.activeFileId = state.openTabs[state.openTabs.length - 1] || null;
  }
  state.repo.activeNodeId = state.activeFileId || null;
  persistAll(false);
  renderTabs();
  renderTree();
  renderEditor();
}

function togglePreview() {
  if (!getActiveFile()) return;
  persistAll(false);
  state.preview = !state.preview;
  renderEditor();
}

function toggleSidebar() {
  state.sidebarVisible = !state.sidebarVisible;
  updateSidebarVisibility();
}

function confirmCreate() {
  if (state.modal?.id !== 'create') return;

  const nameInput = qs('#agrpCreateName');
  const parentSelect = qs('#agrpCreateParent');
  let name = String(nameInput?.value || '').trim();
  const parentId = parentSelect?.value === '__root__' ? null : (parentSelect?.value || null);

  if (!name) {
    pushToast('Nombre requerido', 'error');
    return;
  }

  if (state.modal.createType === 'file' && !/\.[a-z0-9]+$/i.test(name)) {
    name += '.md';
  }

  if (state.modal.createType === 'folder') {
    const result = createFolderInRepo(state.repo, { title: name, parentId });
    state.repo = result.repo;
    expandPathToNode(result.node.id, { includeSelf: true });
    state.repo.activeNodeId = state.activeFileId || null;
    persistAll(false);
    renderTree();
    closeModal();
    pushToast('Carpeta creada', 'success');
    return;
  }

  const templateKey = getTemplateKeyForParent(parentId);
  const result = createFileInRepo(state.repo, {
    title: name,
    parentId,
    templateKey
  });
  state.repo = result.repo;
  expandPathToNode(result.node.id);
  if (!state.openTabs.includes(result.node.id)) state.openTabs.push(result.node.id);
  state.activeFileId = result.node.id;
  state.preview = false;
  if (isMobileViewport()) state.sidebarVisible = false;
  closeModal();
  renderTree();
  renderTabs();
  // IMPORTANT: render the editor BEFORE persisting so the <textarea> syncs with
  // the freshly created file's seed content. Otherwise syncActiveFileDraft()
  // (called by persistAll) would read the stale text from the previously active
  // file and overwrite the new file's content with it.
  renderEditor();
  persistAll(false);
  updateSidebarVisibility();
  pushToast('Archivo creado', 'success');
}

function confirmRename() {
  if (state.modal?.id !== 'rename') return;
  const node = getNode(state.repo.nodes, state.modal.nodeId);
  const name = String(qs('#agrpRenameName')?.value || '').trim();
  if (!node || !name) {
    pushToast('Nombre requerido', 'error');
    return;
  }

  state.repo = updateNodeInRepo(state.repo, node.id, { title: name }).repo;
  persistAll(false);
  closeModal();
  renderTree();
  renderTabs();
  renderEditor();
  pushToast('Renombrado', 'success');
}

function confirmDelete() {
  if (state.modal?.id !== 'delete') return;
  const nodeId = state.modal.nodeId;
  const node = getNode(state.repo.nodes, nodeId);
  if (!node) {
    closeModal();
    return;
  }

  // Soft-delete: the node and its subtree move to the trash, keeping their
  // original location so they can be restored. Tabs/active file are released.
  const trashedIds = collectDescendantIds(state.repo.nodes, node.id);
  state.openTabs = state.openTabs.filter((id) => !trashedIds.includes(id));
  if (trashedIds.includes(state.activeFileId)) {
    state.activeFileId = state.openTabs[state.openTabs.length - 1] || null;
    state.preview = false;
  }

  state.repo = softDeleteNodeInRepo(state.repo, node.id).repo;
  state.repo.activeNodeId = state.activeFileId || null;
  persistAll(false);
  closeModal();
  renderTree();
  renderTabs();
  renderEditor();
  updateTrashBadge();
  pushToast('Movido a la papelera', 'success');
}

// ---------------------------------------------------------------------------
// Trash view — list, restore, purge.
// ---------------------------------------------------------------------------

function openTrash() {
  state.view = 'trash';
  state.treeQuery = '';
  const search = qs('#agrpSearchInput');
  if (search) search.value = '';
  renderTree();
}

function closeTrash() {
  state.view = 'tree';
  renderTree();
}

function restoreNodeFromTrashById(nodeId) {
  if (!nodeId) return;
  const result = restoreNodeFromTrash(state.repo, nodeId);
  state.repo = result.repo;
  // Bring the user back to the tree so they see the restored node in place.
  state.view = 'tree';
  if (result.restored) expandPathToNode(nodeId);
  persistAll(false);
  renderTree();
  updateTrashBadge();
  pushToast(result.restored ? 'Restaurado' : 'No se pudo restaurar', result.restored ? 'success' : 'error');
}

function purgeNodeFromTrashById(nodeId) {
  if (!nodeId) return;
  const node = getNode(state.repo.nodes, nodeId);
  const result = purgeNodeFromTrash(state.repo, nodeId);
  state.repo = result.repo;
  state.repo.activeNodeId = state.activeFileId || null;
  persistAll(false);
  renderTree();
  updateTrashBadge();
  pushToast(node ? `'${node.title}' eliminado permanentemente` : 'Eliminado permanentemente', 'success');
}

function emptyTrash() {
  const before = getTrashedNodes(state.repo.nodes).length;
  state.repo = purgeExpiredTrash(state.repo, 30).repo;
  persistAll(false);
  renderTree();
  updateTrashBadge();
  const after = getTrashedNodes(state.repo.nodes).length;
  const removed = Math.max(0, before - after);
  pushToast(removed > 0 ? `${removed} elemento(s) eliminado(s) permanentemente` : 'No había elementos expirados', 'success');
}

function resolveClipboardPasteParent(node) {
  if (!node) return null;
  return node.type === 'folder' ? node.id : (node.parentId || null);
}

// ---------------------------------------------------------------------------
// Drag & Drop: move files and folders between parents.
// System roots are valid drop targets but cannot be dragged out of the root.
// ---------------------------------------------------------------------------

function moveNodeToParent(nodeId, targetId) {
  const node = getNode(state.repo.nodes, nodeId);
  if (!node) return false;
  const target = targetId ? getNode(state.repo.nodes, targetId) : null;
  // Resolve the destination parentId: drop on a folder → into it; drop on a
  // file → next to it (its parent); drop on empty area → root (null).
  const nextParentId = !targetId ? null : (target.type === 'folder' ? target.id : (target.parentId || null));

  if (nextParentId === (node.parentId || null)) return false;
  // Cycle guard: cannot drop a node into itself or one of its descendants.
  if (nextParentId && (nextParentId === nodeId || collectDescendantIds(state.repo.nodes, nodeId).includes(nextParentId))) {
    pushToast('No se puede mover dentro de sí mismo', 'error');
    return false;
  }
  const beforeParent = node.parentId || null;
  state.repo = updateNodeInRepo(state.repo, nodeId, { parentId: nextParentId }).repo;
  persistAll(false);
  renderTree();
  renderTabs();
  renderEditor();
  pushToast(nextParentId === null && beforeParent !== null ? 'Movido a la raíz' : 'Movido', 'success');
  return true;
}

function clearDragState() {
  qsa('.is-dragging, .is-drop-target, .is-drop-denied').forEach((el) => {
    el.classList.remove('is-dragging', 'is-drop-target', 'is-drop-denied');
  });
}

function handleDragStart(event) {
  const item = event.target.closest('.agrp-tree-item');
  if (!item || item.dataset.draggable !== 'true') {
    event.preventDefault();
    return;
  }
  const nodeId = item.dataset.nodeId;
  state.dragNodeId = nodeId;
  item.classList.add('is-dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', nodeId);
}

function handleDragOver(event) {
  if (!state.dragNodeId) return;
  const item = event.target.closest('.agrp-tree-item');
  if (!item) return;
  const targetId = item.dataset.nodeId;
  // Deny dropping a node onto itself or into one of its descendants.
  const wouldCycle = targetId === state.dragNodeId
    || collectDescendantIds(state.repo.nodes, state.dragNodeId).includes(targetId);
  event.preventDefault();
  event.dataTransfer.dropEffect = wouldCycle ? 'none' : 'move';
  qsa('.is-drop-target, .is-drop-denied').forEach((el) => {
    if (el !== item) el.classList.remove('is-drop-target', 'is-drop-denied');
  });
  item.classList.toggle('is-drop-target', !wouldCycle);
  item.classList.toggle('is-drop-denied', wouldCycle);
}

function handleDragLeave(event) {
  const item = event.target.closest('.agrp-tree-item');
  if (!item) return;
  // Only clear if the pointer truly left the item (not entering a child element).
  if (!item.contains(event.relatedTarget)) {
    item.classList.remove('is-drop-target', 'is-drop-denied');
  }
}

function handleDrop(event) {
  if (!state.dragNodeId) return;
  event.preventDefault();
  const item = event.target.closest('.agrp-tree-item');
  const targetId = item?.dataset.nodeId || null;
  const dragId = state.dragNodeId;
  state.dragNodeId = null;
  clearDragState();
  moveNodeToParent(dragId, targetId);
}

function handleDragEnd() {
  state.dragNodeId = null;
  clearDragState();
}

function handleContextAction(action) {
  const node = state.contextTargetId ? getNode(state.repo.nodes, state.contextTargetId) : null;
  hideContextMenu();

  switch (action) {
    case 'newFile':
      openCreateModal('file', getTargetParentId(state.contextTargetId));
      break;
    case 'newFolder':
      openCreateModal('folder', getTargetParentId(state.contextTargetId));
      break;
    case 'rename':
      if (node) openRenameModal(node.id);
      break;
    case 'copy':
      if (node) {
        state.clipboard = snapshotNodeTree(state.repo.nodes, node.id);
        pushToast('Copiado al portapapeles', 'info');
      }
      break;
    case 'paste':
      if (state.clipboard) {
        const result = pasteNodeSnapshotIntoRepo(state.repo, state.clipboard, resolveClipboardPasteParent(node));
        state.repo = result.repo;
        if (result.node?.id) expandPathToNode(result.node.id, { includeSelf: result.node.type === 'folder' });
        if (result.node?.type === 'file') {
          if (!state.openTabs.includes(result.node.id)) state.openTabs.push(result.node.id);
          state.activeFileId = result.node.id;
        }
        persistAll(false);
        renderTree();
        renderTabs();
        renderEditor();
        pushToast('Pegado correctamente', 'success');
      }
      break;
    case 'duplicate':
      if (node) {
        const snapshot = snapshotNodeTree(state.repo.nodes, node.id);
        // skipUniqueness: the duplicate keeps the exact same name as the original
        // (per user request). The two nodes are distinguished by id, not by title.
        const result = pasteNodeSnapshotIntoRepo(state.repo, snapshot, node.parentId || null, { skipUniqueness: true });
        state.repo = result.repo;
        if (result.node?.id) expandPathToNode(result.node.id, { includeSelf: result.node.type === 'folder' });
        if (result.node?.type === 'file') {
          if (!state.openTabs.includes(result.node.id)) state.openTabs.push(result.node.id);
          state.activeFileId = result.node.id;
        }
        persistAll(false);
        renderTree();
        renderTabs();
        renderEditor();
        pushToast('Duplicado', 'success');
      }
      break;
    case 'export':
      if (node?.type === 'file') exportFile(node);
      break;
    case 'delete':
      if (node) openDeleteModal(node.id);
      break;
    default:
      break;
  }
}

function exportFile(node) {
  const blob = new Blob([node.content || ''], { type: 'text/markdown;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = node.title;
  link.click();
  URL.revokeObjectURL(link.href);
  pushToast(`Exportado: ${node.title}`, 'success');
}

function exportAll() {
  const files = getAllFiles(state.repo.nodes);
  if (!files.length) {
    pushToast('No hay archivos para exportar', 'error');
    return;
  }

  files.forEach((file, index) => {
    window.setTimeout(() => exportFile(file), index * 120);
  });
  pushToast(`Exportando ${files.length} archivo(s)`, 'info');
}

function importFiles() {
  qs('#agrpFileImport')?.click();
}

async function handleImport(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  // Land imported files into a dedicated "Importados" root folder so they don't
  // get mixed into "Mi Finca" (which is where parentId:null falls back to during
  // normalizeRepo). Reuse the folder if it already exists from a previous import.
  let importedFolderId = null;
  const existing = getRootFolders(state.repo.nodes).find(
    (folder) => folder.title.toLowerCase() === 'importados'
  );
  if (existing) {
    importedFolderId = existing.id;
  } else {
    const folderResult = createFolderInRepo(state.repo, { title: 'Importados', parentId: null });
    state.repo = folderResult.repo;
    importedFolderId = folderResult.node.id;
  }

  let lastImportedId = null;
  for (const file of files) {
    const content = await file.text();
    const result = createFileInRepo(state.repo, {
      parentId: importedFolderId,
      title: file.name,
      content,
      templateKey: 'nota-libre'
    });
    state.repo = result.repo;
    expandPathToNode(result.node.id);
    lastImportedId = result.node.id;
  }

  if (lastImportedId) {
    if (!state.openTabs.includes(lastImportedId)) state.openTabs.push(lastImportedId);
    state.activeFileId = lastImportedId;
  }
  persistAll(false);
  renderTree();
  renderTabs();
  renderEditor();
  qs('#agrpFileImport').value = '';
  pushToast(`${files.length} archivo(s) importado(s)`, 'success');
}

function renderFrame() {
  state.root.innerHTML = `
    <div class="agrp-app">
      <div class="agrp-bg-diamond" aria-hidden="true">
        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M200 20L380 160L320 370H80L20 160L200 20Z" stroke="url(#agrpDiamondGradient)" stroke-width="1.5"/>
          <path d="M200 20L20 160H380L200 20Z" stroke="url(#agrpDiamondGradient)" stroke-width="1"/>
          <path d="M20 160L200 370L380 160" stroke="url(#agrpDiamondGradient)" stroke-width="1"/>
          <line x1="200" y1="20" x2="200" y2="370" stroke="url(#agrpDiamondGradient)" stroke-width=".8"/>
          <line x1="80" y1="370" x2="200" y2="20" stroke="url(#agrpDiamondGradient)" stroke-width=".5" opacity=".5"/>
          <line x1="320" y1="370" x2="200" y2="20" stroke="url(#agrpDiamondGradient)" stroke-width=".5" opacity=".5"/>
          <defs>
            <linearGradient id="agrpDiamondGradient" x1="0" y1="0" x2="400" y2="400">
              <stop stop-color="var(--gold-4, #c8a752)"/>
              <stop offset="1" stop-color="var(--gold-5, #e8d48b)"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <aside class="agrp-sidebar" id="agrpSidebar">
        <div class="agrp-brand">
          <div class="agrp-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg>
          </div>
          <h1>Agro<em>Repo</em></h1>
          <span class="brand-date">${escapeHtml(formatBrandDate())}</span>
        </div>

        <div class="agrp-search-box">
          <span class="search-icon"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span>
          <input type="search" id="agrpSearchInput" placeholder="Buscar archivos o contenido..." autocomplete="off">
        </div>

        <div class="agrp-tree-container" id="agrpTreeContainer"></div>

        <div class="agrp-sidebar-footer">
          <button type="button" class="agrp-btn-icon" title="Nuevo archivo" data-action="open-create-file"><i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i></button>
          <button type="button" class="agrp-btn-icon" title="Nueva carpeta" data-action="open-create-folder"><i class="fa-solid fa-folder-plus" aria-hidden="true"></i></button>
          <button type="button" class="agrp-btn-icon" title="Importar .md" data-action="import-files"><i class="fa-solid fa-file-import" aria-hidden="true"></i></button>
          <button type="button" class="agrp-btn-icon" title="Exportar todo" data-action="export-all"><i class="fa-solid fa-file-export" aria-hidden="true"></i></button>
          <button type="button" class="agrp-btn-icon agrp-trash-btn" title="Papelera" data-action="open-trash"><i class="fa-solid fa-trash-can" aria-hidden="true"></i><span class="agrp-trash-badge" id="agrpTrashBadge" hidden>0</span></button>
        </div>
      </aside>

      <main class="agrp-main">
        <div class="agrp-header">
          <button type="button" class="agrp-btn-icon" id="agrpHamburger" title="Menú" data-action="toggle-sidebar"><i class="fa-solid fa-bars" aria-hidden="true"></i></button>
          <div class="agrp-header-title" id="agrpHeaderTitle"><span>AgroRepo</span> — Selecciona un archivo</div>
          <button type="button" class="agrp-btn-icon" id="agrpSaveBtn" title="Guardar (Ctrl+S)" data-action="save-file" hidden><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i></button>
          <button type="button" class="agrp-btn-icon" id="agrpPreviewToggle" title="Vista previa" data-action="toggle-preview" hidden><i class="fa-regular fa-eye" aria-hidden="true"></i></button>
          <button type="button" class="agrp-btn-icon" id="agrpSearchGlobal" title="Buscar global (Ctrl+K)" data-action="open-search-modal"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></button>
        </div>

        <div class="agrp-editor-tabs" id="agrpEditorTabs" hidden></div>

        <div class="agrp-editor-area">
          <div class="agrp-editor-wrap" id="agrpEditorWrap">
            <textarea id="agrpEditor" placeholder="Escribe en Markdown..."></textarea>
          </div>
          <div class="agrp-preview-content" id="agrpPreviewContent" hidden></div>
          <div class="agrp-empty-state" id="agrpEmptyState">
            <i class="fa-regular fa-note-sticky" aria-hidden="true"></i>
            <p>Crea o abre un archivo para comenzar</p>
          </div>
        </div>

        <div class="agrp-statusbar">
          <span class="agrp-status-spacer" id="agrpCharCount"></span>
          <span id="agrpLineCount"></span>
        </div>
      </main>
    </div>

    <div class="agrp-ctx-menu" id="agrpCtxMenu">
      <button type="button" class="agrp-ctx-item" data-ctx-action="newFile"><i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i>Nuevo archivo <span class="shortcut">N</span></button>
      <button type="button" class="agrp-ctx-item" data-ctx-action="newFolder"><i class="fa-solid fa-folder-plus" aria-hidden="true"></i>Nueva carpeta <span class="shortcut">F</span></button>
      <div class="agrp-ctx-sep"></div>
      <button type="button" class="agrp-ctx-item" data-ctx-action="rename"><i class="fa-solid fa-pen" aria-hidden="true"></i>Renombrar <span class="shortcut">R</span></button>
      <button type="button" class="agrp-ctx-item" data-ctx-action="copy"><i class="fa-regular fa-copy" aria-hidden="true"></i>Copiar <span class="shortcut">C</span></button>
      <button type="button" class="agrp-ctx-item" data-ctx-action="paste"><i class="fa-regular fa-paste" aria-hidden="true"></i>Pegar <span class="shortcut">V</span></button>
      <button type="button" class="agrp-ctx-item" data-ctx-action="duplicate"><i class="fa-regular fa-clone" aria-hidden="true"></i>Duplicar <span class="shortcut">D</span></button>
      <div class="agrp-ctx-sep"></div>
      <button type="button" class="agrp-ctx-item" data-ctx-action="export"><i class="fa-solid fa-file-export" aria-hidden="true"></i>Exportar .md</button>
      <div class="agrp-ctx-sep"></div>
      <button type="button" class="agrp-ctx-item danger" data-ctx-action="delete"><i class="fa-regular fa-trash-can" aria-hidden="true"></i>Eliminar <span class="shortcut">⌫</span></button>
    </div>

    <div class="agrp-modal-overlay" id="agrpCreateModal">
      <div class="agrp-modal">
        <form id="agrpCreateForm">
          <h2><i class="fa-solid fa-circle-plus" aria-hidden="true"></i><span id="agrpCreateModalTitle">Nuevo archivo</span></h2>
          <label for="agrpCreateName">Nombre</label>
          <input type="text" id="agrpCreateName" placeholder="mi-archivo.md">
          <label for="agrpCreateParent">Ubicación</label>
          <div class="agrp-select-wrap">
            <select id="agrpCreateParent"></select>
            <span class="agrp-select-icon" aria-hidden="true"><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span>
          </div>
          <div class="agrp-location-hint" id="agrpCreateLocationHint">Se alojará en AgroRepo / raíz</div>
          <div class="agrp-modal-actions">
            <button type="button" class="agrp-btn agrp-btn-ghost" data-action="close-modal">Cancelar</button>
            <button type="submit" class="agrp-btn agrp-btn-primary">Crear</button>
          </div>
        </form>
      </div>
    </div>

    <div class="agrp-modal-overlay" id="agrpRenameModal">
      <div class="agrp-modal">
        <form id="agrpRenameForm">
          <h2><i class="fa-solid fa-pen" aria-hidden="true"></i>Renombrar</h2>
          <label for="agrpRenameName">Nuevo nombre</label>
          <input type="text" id="agrpRenameName">
          <div class="agrp-modal-actions">
            <button type="button" class="agrp-btn agrp-btn-ghost" data-action="close-modal">Cancelar</button>
            <button type="submit" class="agrp-btn agrp-btn-primary">Renombrar</button>
          </div>
        </form>
      </div>
    </div>

    <div class="agrp-modal-overlay" id="agrpDeleteModal">
      <div class="agrp-modal">
        <h2><i class="fa-regular fa-trash-can" aria-hidden="true"></i>Eliminar</h2>
        <p class="agrp-delete-copy" id="agrpDeleteMsg">¿Eliminar este elemento?</p>
        <div class="agrp-modal-actions">
          <button type="button" class="agrp-btn agrp-btn-ghost" data-action="close-modal">Cancelar</button>
          <button type="button" class="agrp-btn agrp-btn-danger" data-action="confirm-delete">Eliminar</button>
        </div>
      </div>
    </div>

    <div class="agrp-modal-overlay" id="agrpSearchModal">
      <div class="agrp-modal search">
        <div>
          <h2><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>Búsqueda global</h2>
          <input type="text" id="agrpGlobalSearchInput" placeholder="Buscar en todos los archivos...">
          <div class="agrp-search-results" id="agrpSearchResults"></div>
        </div>
        <div class="agrp-modal-actions">
          <button type="button" class="agrp-btn agrp-btn-ghost" data-action="close-modal">Cerrar</button>
        </div>
      </div>
    </div>

    <div class="agrp-toast-container" id="agrpToastContainer"></div>
    <input type="file" id="agrpFileImport" accept=".md,.markdown,.txt" multiple hidden>
  `;
}

function renderAll() {
  updateSidebarVisibility();
  renderTree();
  renderTabs();
  renderEditor();
  updateHeader();
  updateStatusBar();
  updateContextMenuState();
  updateTrashBadge();
}

function handleAction(action, target) {
  switch (action) {
    case 'toggle-sidebar':
      toggleSidebar();
      break;
    case 'toggle-preview':
      togglePreview();
      break;
    case 'save-file':
      persistAll(true);
      break;
    case 'open-create-file':
      openCreateModal('file', getDefaultParentId('file'));
      break;
    case 'open-create-folder':
      openCreateModal('folder', getDefaultParentId('folder'));
      break;
    case 'import-files':
      importFiles();
      break;
    case 'export-all':
      exportAll();
      break;
    case 'open-trash':
      openTrash();
      break;
    case 'close-trash':
      closeTrash();
      break;
    case 'restore-node':
      restoreNodeFromTrashById(target.dataset.nodeId);
      break;
    case 'purge-node':
      purgeNodeFromTrashById(target.dataset.nodeId);
      break;
    case 'purge-expired':
      emptyTrash();
      break;
    case 'open-search-modal':
      openSearchModal();
      break;
    case 'close-modal':
      closeModal();
      break;
    case 'confirm-delete':
      confirmDelete();
      break;
    case 'close-tab':
      closeTab(target.dataset.tabId);
      break;
    case 'open-search-result':
      closeModal();
      openFile(target.dataset.fileId);
      break;
    default:
      break;
  }
}

function handleClick(event) {
  const overlay = event.target.classList.contains('agrp-modal-overlay') ? event.target : null;
  if (overlay && event.target === overlay) {
    closeModal();
    return;
  }

  const treeItem = event.target.closest('.agrp-tree-item');
  if (treeItem) {
    const nodeId = treeItem.dataset.nodeId;
    const node = getNode(state.repo.nodes, nodeId);
    hideContextMenu();
    if (node?.type === 'folder') {
      toggleFolder(nodeId);
    } else if (node?.type === 'file') {
      openFile(nodeId);
    }
    return;
  }

  const tab = event.target.closest('.agrp-tab');
  if (tab && !event.target.closest('[data-action="close-tab"]')) {
    openFile(tab.dataset.tabId);
    return;
  }

  const ctxItem = event.target.closest('[data-ctx-action]');
  if (ctxItem) {
    if (ctxItem.classList.contains('is-disabled')) return;
    handleContextAction(ctxItem.dataset.ctxAction);
    return;
  }

  const actionTarget = event.target.closest('[data-action]');
  if (actionTarget) {
    handleAction(actionTarget.dataset.action, actionTarget);
  }
}

function handleInput(event) {
  if (event.target.id === 'agrpSearchInput') {
    state.treeQuery = event.target.value || '';
    // Searching implies leaving the trash view — searches run against the live tree.
    if (state.view === 'trash') state.view = 'tree';
    renderTree();
    return;
  }

  if (event.target.id === 'agrpGlobalSearchInput') {
    renderSearchResults(event.target.value || '');
    return;
  }

  if (event.target.id === 'agrpEditor') {
    const file = getActiveFile();
    if (!file) return;
    file.content = event.target.value || '';
    file.updatedAt = nowIso();
    updateCounts(file.content);
    schedulePersist();
  }
}

function handleSubmit(event) {
  if (event.target.id === 'agrpCreateForm') {
    event.preventDefault();
    confirmCreate();
  }

  if (event.target.id === 'agrpRenameForm') {
    event.preventDefault();
    confirmRename();
  }
}

function handleChange(event) {
  if (event.target.id === 'agrpCreateParent') {
    if (state.modal?.id === 'create') {
      state.modal.parentId = event.target.value === '__root__' ? null : (event.target.value || null);
    }
    updateCreateLocationHint();
    return;
  }

  if (event.target.id === 'agrpFileImport') {
    handleImport(event.target.files);
  }
}

function handleFocusOut(event) {
  if (event.target.id === 'agrpEditor') {
    persistAll(false);
  }
}

function handleContextMenu(event) {
  const treeItem = event.target.closest('.agrp-tree-item');
  const treeContainer = event.target.closest('#agrpTreeContainer');
  if (!treeItem && !treeContainer) return;

  event.preventDefault();
  showContextMenu(event.clientX, event.clientY, treeItem?.dataset.nodeId || null);
}

function handleDocumentClick(event) {
  const insideMenu = event.target.closest('#agrpCtxMenu');
  if (!insideMenu) hideContextMenu();
}

function handleKeydown(event) {
  const insideAgroRepo = state.root?.contains(document.activeElement) || document.body?.dataset?.agroActiveView === 'agrorepo';
  if (!insideAgroRepo && !state.modal) return;

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearchModal();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    persistAll(true);
    return;
  }

  if (event.key === 'Escape') {
    if (state.modal) {
      closeModal();
      return;
    }
    hideContextMenu();
    if (isMobileViewport() && state.sidebarVisible) {
      state.sidebarVisible = false;
      updateSidebarVisibility();
    }
  }
}

function handleResize() {
  state.sidebarVisible = !isMobileViewport();
  updateSidebarVisibility();
}

function bindEvents() {
  state.root.addEventListener('click', handleClick);
  state.root.addEventListener('input', handleInput);
  state.root.addEventListener('submit', handleSubmit);
  state.root.addEventListener('change', handleChange);
  state.root.addEventListener('focusout', handleFocusOut);
  state.root.addEventListener('contextmenu', handleContextMenu);

  // Drag & Drop — move nodes between folders. Delegated on the tree container
  // so dynamically re-rendered items keep working without rebinding.
  state.root.addEventListener('dragstart', handleDragStart);
  state.root.addEventListener('dragover', handleDragOver);
  state.root.addEventListener('dragleave', handleDragLeave);
  state.root.addEventListener('drop', handleDrop);
  state.root.addEventListener('dragend', handleDragEnd);

  if (!state.documentBound) {
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeydown);
    state.documentBound = true;
  }

  if (!state.viewportBound) {
    window.addEventListener('resize', handleResize);
    state.viewportBound = true;
  }
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
  // Silently purge trash entries older than 30 days (hard delete) before the
  // first render, so expired items never surface in the trash view.
  state.repo = purgeExpiredTrash(state.repo, 30).repo;

  const tabs = loadTabState(repo);
  state.openTabs = tabs.openTabs;
  state.activeFileId = tabs.activeFileId;
  if (!state.activeFileId && getNode(repo.nodes, repo.activeNodeId)?.type === 'file') {
    state.activeFileId = repo.activeNodeId;
  }
  if (state.activeFileId && !state.openTabs.includes(state.activeFileId)) {
    state.openTabs.push(state.activeFileId);
  }
  state.sidebarVisible = !isMobileViewport();

  renderFrame();
  bindEvents();
  sanitizeOpenTabs();
  renderAll();
  syncRepoBridge();
  state.initialized = true;
  root.dataset.loaded = '1';

  if (notice) pushToast(notice, 'success');
}

function ensureWidgetReady() {
  initWidget();
}

function isAgroRepoShellActive() {
  return document.body?.dataset?.agroActiveView === 'agrorepo';
}

export function initAgroRepo() {
  if (!AGROREPO_ENABLED) {
    const section = document.getElementById('agro-repo-section');
    if (section) section.style.display = 'none';
    return;
  }

  window.ensureAgroRepoReady = ensureWidgetReady;

  // The module now renders as a flat dedicated view (no accordion wrapper).
  // Initialize as soon as the DOM is ready, or immediately if it already is.
  const bootstrap = () => {
    if (isAgroRepoShellActive()) ensureWidgetReady();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    return;
  }
  bootstrap();
}
