import './agro-repo.css';

import {
  AGRO_REPO_ROOT_FOLDERS,
  AGRO_REPO_TEMPLATES,
  getRootFolder,
  getTemplate,
  getTemplateLabel,
  normalizeTemplateKey
} from './agro-repo-templates.js';
import { normalizeSearchText, sortByMode } from './agro-repo-search.js';
import {
  buildFileNode,
  buildFolderNode,
  buildRepoContext,
  ensureUniqueNodeTitle,
  getActiveFolderId,
  getAllFiles,
  getChildren,
  getNode,
  getPathNodes,
  getRootFolders,
  isSystemFolder,
  loadRepoState,
  persistRepoState
} from './agro-repo-storage.js';

const AGROREPO_ENABLED = true;
const state = {
  repo: null,
  root: null,
  initialized: false,
  query: '',
  viewMode: 'editor',
  sortMode: 'updated',
  treeOpen: false,
  modal: null,
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
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(`<ul class="agrp-md-list">${listItems.join('')}</ul>`);
    listItems = [];
  };

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
  return blocks.length ? blocks.join('') : '<p class="agrp-md-empty">Sin contenido todavia.</p>';
}

function countWords(text) {
  const words = String(text || '').trim().match(/\S+/g);
  return words ? words.length : 0;
}

function formatRelativeTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return 'pendiente';
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin <= 1) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays} d`;
  return date.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
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

function getActiveNode() {
  return getNode(state.repo?.nodes, state.repo?.activeNodeId);
}

function getActiveFile() {
  const active = getActiveNode();
  return active?.type === 'file' ? active : null;
}

function getCurrentFolderId() {
  return getActiveFolderId(state.repo) || getRootFolders(state.repo.nodes)[0]?.id || null;
}

function closeTreeOnMobile() {
  state.treeOpen = false;
  syncTreeShell();
}

function syncRepoBridge() {
  window._agroRepoContext = buildRepoContext(state.repo);
}

function showToast(message, type = 'info') {
  const stack = qs('#agrp-toastStack');
  if (!stack) return;
  const toast = document.createElement('div');
  toast.className = `agrp-toast agrp-toast--${type}`;
  toast.innerHTML = `<span class="agrp-toast-dot" aria-hidden="true"></span><span>${escapeHtml(message)}</span>`;
  stack.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 180);
  }, 2200);
}

function persistNow(showFeedback = false) {
  clearTimer();
  state.repo = persistRepoState(state.repo);
  syncRepoBridge();
  syncHeader();
  if (showFeedback) showToast('Cambios guardados localmente.', 'success');
}

function schedulePersist() {
  const saveLabel = qs('#agrp-saveState');
  if (saveLabel) saveLabel.textContent = 'Guardando local...';
  clearTimer();
  state.autoSaveTimer = window.setTimeout(() => persistNow(false), 220);
}

function ensureAncestorsExpanded(nodeId) {
  getPathNodes(state.repo.nodes, nodeId)
    .filter((node) => node.type === 'folder')
    .forEach((node) => {
      if (!state.repo.expandedIds.includes(node.id)) state.repo.expandedIds.push(node.id);
    });
}

function getNodePathLabel(nodeId) {
  const path = getPathNodes(state.repo.nodes, nodeId);
  return path.length ? ['AgroRepo', ...path.map((node) => node.title)].join(' / ') : 'AgroRepo';
}

function getNodeIconClass(node) {
  if (!node) return 'fa-regular fa-circle';
  if (node.type === 'folder') {
    return node.parentId === null ? getRootFolder(node.folderKey).iconClass : 'fa-regular fa-folder-open';
  }
  return getTemplate(node.templateKey).iconClass || 'fa-regular fa-file-lines';
}

function getVisibleNodeIds(query) {
  const safeQuery = normalizeSearchText(query);
  if (!safeQuery) return new Set(state.repo.nodes.map((node) => node.id));
  const visible = new Set();

  function matches(node) {
    const text = normalizeSearchText([
      node.title,
      node.legacyPath,
      node.type === 'file' ? node.content : '',
      node.type === 'file' ? getTemplateLabel(node.templateKey) : ''
    ].join(' '));
    return text.includes(safeQuery);
  }

  function mark(node) {
    if (!node) return false;
    const direct = matches(node);
    const childMatch = getChildren(state.repo.nodes, node.id).some((child) => mark(child));
    if (direct || childMatch) {
      visible.add(node.id);
      getPathNodes(state.repo.nodes, node.id).forEach((entry) => visible.add(entry.id));
      return true;
    }
    return false;
  }

  getRootFolders(state.repo.nodes).forEach((folder) => mark(folder));
  return visible;
}

function getSortedChildren(parentId) {
  const children = getChildren(state.repo.nodes, parentId);
  const folders = children.filter((node) => node.type === 'folder');
  const files = children.filter((node) => node.type === 'file');
  if (parentId === null) {
    const system = [];
    AGRO_REPO_ROOT_FOLDERS.forEach((folderDef) => {
      const folder = folders.find((node) => node.folderKey === folderDef.key);
      if (folder) system.push(folder);
    });
    const extras = folders.filter((node) => !node.system)
      .sort((left, right) => left.title.localeCompare(right.title, 'es', { sensitivity: 'base', numeric: true }));
    return [...system, ...extras, ...sortByMode(files, state.sortMode)];
  }
  const sortedFolders = folders.sort((left, right) => left.title.localeCompare(right.title, 'es', { sensitivity: 'base', numeric: true }));
  return [...sortedFolders, ...sortByMode(files, state.sortMode)];
}

function renderTreeNode(node, depth = 0, visibleIds = null) {
  if (visibleIds && !visibleIds.has(node.id)) return '';
  const isFolder = node.type === 'folder';
  const children = getSortedChildren(node.id).filter((child) => !visibleIds || visibleIds.has(child.id));
  const isOpen = isFolder && (state.query ? children.length > 0 : state.repo.expandedIds.includes(node.id));
  const isActive = node.id === state.repo.activeNodeId;
  const canManage = !isSystemFolder(node);
  const meta = isFolder ? `${children.length} item${children.length === 1 ? '' : 's'}` : formatRelativeTime(node.updatedAt || node.createdAt);

  return `
    <div class="agrp-tree-node ${isActive ? 'is-active' : ''}" data-tree-node="${node.id}">
      <div class="agrp-tree-row" style="--agrp-depth:${depth};">
        ${isFolder
          ? `<button type="button" class="agrp-tree-toggle ${isOpen ? 'is-open' : ''}" data-action="toggle-folder" data-node-id="${node.id}" aria-label="${isOpen ? 'Contraer carpeta' : 'Expandir carpeta'}"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>`
          : '<span class="agrp-tree-toggle agrp-tree-toggle--spacer"></span>'}
        <button type="button" class="agrp-tree-hit" data-action="select-node" data-node-id="${node.id}">
          <span class="agrp-tree-icon"><i class="${getNodeIconClass(node)}" aria-hidden="true"></i></span>
          <span class="agrp-tree-copy">
            <strong>${escapeHtml(node.title)}</strong>
            <small>${escapeHtml(meta)}</small>
          </span>
        </button>
        <div class="agrp-tree-actions">
          ${isFolder ? `<button type="button" class="agrp-tree-action" data-action="open-create-file" data-parent-id="${node.id}" title="Nuevo archivo"><i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i></button>` : ''}
          ${isFolder ? `<button type="button" class="agrp-tree-action" data-action="open-create-folder" data-parent-id="${node.id}" title="Nueva carpeta"><i class="fa-solid fa-folder-plus" aria-hidden="true"></i></button>` : ''}
          ${canManage ? `<button type="button" class="agrp-tree-action" data-action="open-rename" data-node-id="${node.id}" title="Renombrar"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>` : ''}
          ${canManage ? `<button type="button" class="agrp-tree-action agrp-tree-action--danger" data-action="delete-node" data-node-id="${node.id}" title="Eliminar"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>` : ''}
        </div>
      </div>
      ${isFolder && isOpen && children.length ? `<div class="agrp-tree-children">${children.map((child) => renderTreeNode(child, depth + 1, visibleIds)).join('')}</div>` : ''}
    </div>
  `;
}

function renderTree() {
  const body = qs('#agrp-treeBody');
  const summary = qs('#agrp-treeSummary');
  if (!body || !summary) return;
  const visibleIds = getVisibleNodeIds(state.query);
  const roots = getSortedChildren(null).filter((node) => visibleIds.has(node.id));
  const visibleFiles = getAllFiles(state.repo.nodes).filter((file) => visibleIds.has(file.id));

  summary.textContent = state.query
    ? `${visibleFiles.length} resultado${visibleFiles.length === 1 ? '' : 's'}`
    : `${getAllFiles(state.repo.nodes).length} archivos`;

  if (!roots.length) {
    body.innerHTML = '<div class="agrp-tree-empty"><h4>Sin coincidencias</h4><p>Prueba otra busqueda o limpia el filtro actual.</p></div>';
    return;
  }

  body.innerHTML = `
    <div class="agrp-tree-root-label">AgroRepo</div>
    <div class="agrp-tree-list">${roots.map((node) => renderTreeNode(node, 0, visibleIds)).join('')}</div>
  `;
}

function renderFolderCards(folder) {
  const children = getSortedChildren(folder.id);
  if (!children.length) {
    return '<div class="agrp-empty-state"><div class="agrp-empty-icon"><i class="fa-regular fa-folder-open" aria-hidden="true"></i></div><h3>Carpeta vacia</h3><p>Usa la topbar o las acciones del arbol para crear un archivo o una subcarpeta en esta ruta.</p></div>';
  }

  return `
    <div class="agrp-folder-grid">
      ${children.map((node) => `
        <button type="button" class="agrp-folder-card" data-action="select-node" data-node-id="${node.id}">
          <span class="agrp-folder-card-icon"><i class="${getNodeIconClass(node)}" aria-hidden="true"></i></span>
          <strong>${escapeHtml(node.title)}</strong>
          <small>${node.type === 'folder' ? 'Carpeta' : getTemplateLabel(node.templateKey)}</small>
        </button>
      `).join('')}
    </div>
  `;
}

function renderFolderView(folder) {
  const accent = folder.parentId === null ? getRootFolder(folder.folderKey || 'mi-finca').accentToken : 'var(--gold-3)';
  return `
    <section class="agrp-panel-block">
      <div class="agrp-panel-headline">
        <span class="agrp-section-eyebrow">Carpeta local</span>
        <div class="agrp-panel-title-row">
          <span class="agrp-type-pill" style="--agrp-accent:${accent};"><i class="${getNodeIconClass(folder)}" aria-hidden="true"></i><span>${escapeHtml(folder.title)}</span></span>
          <div class="agrp-inline-actions">
            <button type="button" class="agrp-btn agrp-btn--subtle" data-action="open-create-file" data-parent-id="${folder.id}"><i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i><span>Nuevo archivo</span></button>
            <button type="button" class="agrp-btn agrp-btn--subtle" data-action="open-create-folder" data-parent-id="${folder.id}"><i class="fa-solid fa-folder-plus" aria-hidden="true"></i><span>Nueva carpeta</span></button>
          </div>
        </div>
        <p>${escapeHtml(getNodePathLabel(folder.id))}</p>
      </div>
      ${renderFolderCards(folder)}
    </section>
  `;
}

function renderFileView(file) {
  const template = getTemplate(file.templateKey);
  const previewMode = state.viewMode === 'preview';
  return `
    <section class="agrp-panel-block agrp-panel-block--file">
      <div class="agrp-file-head">
        <div class="agrp-file-meta">
          <span class="agrp-type-pill" style="--agrp-accent:${template.accentToken};"><i class="${template.iconClass}" aria-hidden="true"></i><span>${escapeHtml(template.label)}</span></span>
          <span class="agrp-file-path">${escapeHtml(getNodePathLabel(file.id))}</span>
          <span class="agrp-file-dates">${escapeHtml(formatFullDate(file.updatedAt || file.createdAt))}</span>
        </div>
        <div class="agrp-file-actions">
          <button type="button" class="agrp-icon-btn agrp-icon-btn--soft" data-action="save-file" title="Guardar"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i></button>
          <button type="button" class="agrp-icon-btn agrp-icon-btn--soft" data-action="delete-node" data-node-id="${file.id}" title="Eliminar"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
        </div>
      </div>
      <div class="agrp-file-title-row">
        <input type="text" id="agrp-fileTitle" class="agrp-title-input" maxlength="96" value="${escapeHtml(file.title)}" placeholder="nombre-del-archivo.md" />
        <label class="agrp-inline-field">
          <span>Plantilla</span>
          <select id="agrp-fileTemplate" class="agrp-select">
            ${AGRO_REPO_TEMPLATES.map((entry) => `<option value="${entry.key}" ${entry.key === file.templateKey ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="agrp-file-status">
        <span id="agrp-saveState">Guardado local ${escapeHtml(state.repo.lastSaved ? formatRelativeTime(state.repo.lastSaved) : 'pendiente')}</span>
        <span id="agrp-fileStats">${countWords(file.content)} palabras · ${file.content.length} caracteres</span>
        ${file.legacyPath ? `<span class="agrp-file-legacy">Origen legacy: ${escapeHtml(file.legacyPath)}</span>` : ''}
      </div>
      <div class="agrp-editor-surface">
        <textarea id="agrp-fileContent" class="agrp-textarea" placeholder="Escribe aqui en Markdown..." ${previewMode ? 'hidden' : ''}>${escapeHtml(file.content)}</textarea>
        <div id="agrp-filePreview" class="agrp-preview" ${previewMode ? '' : 'hidden'}>${renderMarkdown(file.content)}</div>
      </div>
    </section>
  `;
}

function renderMain() {
  const panel = qs('#agrp-mainPanel');
  if (!panel) return;
  const active = getActiveNode();
  if (!active) {
    panel.innerHTML = '<div class="agrp-empty-state"><div class="agrp-empty-icon"><i class="fa-regular fa-note-sticky" aria-hidden="true"></i></div><h3>AgroRepo listo</h3><p>Crea un archivo nuevo o abre una carpeta del arbol para empezar a registrar memoria operativa real.</p></div>';
    return;
  }
  panel.innerHTML = active.type === 'folder' ? renderFolderView(active) : renderFileView(active);
}

function collectFolderOptions() {
  const items = [];
  function walk(parentId, depth) {
    getSortedChildren(parentId).filter((node) => node.type === 'folder').forEach((node) => {
      items.push({ node, depth });
      walk(node.id, depth + 1);
    });
  }
  walk(null, 0);
  return items;
}

function renderFolderOptions(selectedId = '', { includeRoot = false } = {}) {
  const options = [];
  if (includeRoot) {
    options.push(`<option value="__root__" ${selectedId === null ? 'selected' : ''}>AgroRepo</option>`);
  }
  options.push(
    ...collectFolderOptions().map(({ node, depth }) => `<option value="${node.id}" ${node.id === selectedId ? 'selected' : ''}>${`${'· '.repeat(depth)}${node.title}`}</option>`)
  );
  return options.join('');
}

function renderModal() {
  const host = qs('#agrp-modalRoot');
  if (!host) return;
  if (!state.modal?.kind) {
    host.innerHTML = '';
    return;
  }

  const node = state.modal.nodeId ? getNode(state.repo.nodes, state.modal.nodeId) : null;
  const isFolder = state.modal.kind === 'create-folder';
  const isFile = state.modal.kind === 'create-file';
  const isRename = state.modal.kind === 'rename';
  const selectedParentId = state.modal.parentId || getCurrentFolderId();
  const initialName = isRename ? node?.title || '' : '';
  const title = isFolder ? 'Nueva carpeta' : isFile ? 'Nuevo archivo' : node?.type === 'folder' ? 'Renombrar carpeta' : 'Renombrar archivo';

  host.innerHTML = `
    <div class="agrp-modal-backdrop ${state.modal.kind ? 'is-active' : ''}" data-action="close-modal">
      <div class="agrp-modal-card" role="dialog" aria-modal="true" aria-labelledby="agrp-modalTitle">
        <div class="agrp-modal-head">
          <h3 id="agrp-modalTitle">${escapeHtml(title)}</h3>
          <button type="button" class="agrp-icon-btn agrp-icon-btn--soft" data-action="close-modal" aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
        <form id="agrp-modalForm" class="agrp-modal-form">
          <label class="agrp-inline-field">
            <span>Nombre</span>
            <input type="text" id="agrp-modalName" class="agrp-input" maxlength="96" value="${escapeHtml(initialName)}" placeholder="${isFolder ? 'Nombre de carpeta' : 'nombre-del-archivo.md'}" />
          </label>
          ${isFile ? `
            <label class="agrp-inline-field">
              <span>Carpeta</span>
              <select id="agrp-modalParent" class="agrp-select">${renderFolderOptions(selectedParentId)}</select>
            </label>
            <label class="agrp-inline-field">
              <span>Plantilla</span>
              <select id="agrp-modalTemplate" class="agrp-select">
                ${AGRO_REPO_TEMPLATES.map((entry) => `<option value="${entry.key}" ${entry.key === (state.modal.templateKey || 'nota-libre') ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
              </select>
            </label>
          ` : ''}
          ${isFolder ? `
            <label class="agrp-inline-field">
              <span>Carpeta padre</span>
              <select id="agrp-modalParent" class="agrp-select">${renderFolderOptions(selectedParentId, { includeRoot: true })}</select>
            </label>
          ` : ''}
          <div class="agrp-modal-actions">
            <button type="button" class="agrp-btn agrp-btn--subtle" data-action="close-modal">Cancelar</button>
            <button type="submit" class="agrp-btn agrp-btn--primary">${escapeHtml(isRename ? 'Guardar' : 'Crear')}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  window.setTimeout(() => qs('#agrp-modalName')?.focus(), 30);
}

function syncHeader() {
  const path = qs('#agrp-currentPath');
  const fileCount = qs('#agrp-fileCount');
  const searchInput = qs('#agrp-searchInput');
  const editorBtn = qs('[data-role="mode-editor"]');
  const previewBtn = qs('[data-role="mode-preview"]');
  const sortBtn = qs('[data-role="sort-button"]');

  if (path) path.textContent = getNodePathLabel(state.repo.activeNodeId);
  if (fileCount) fileCount.textContent = `${getAllFiles(state.repo.nodes).length} archivos locales`;
  if (searchInput && searchInput.value !== state.query) searchInput.value = state.query;
  editorBtn?.classList.toggle('is-active', state.viewMode === 'editor');
  previewBtn?.classList.toggle('is-active', state.viewMode === 'preview');

  if (sortBtn) {
    sortBtn.classList.toggle('is-active', state.sortMode === 'name');
    sortBtn.title = state.sortMode === 'updated' ? 'Ordenar por nombre' : 'Ordenar por actividad';
  }

  const saveLabel = qs('#agrp-saveState');
  if (saveLabel) saveLabel.textContent = `Guardado local ${state.repo.lastSaved ? formatRelativeTime(state.repo.lastSaved) : 'pendiente'}`;
}

function syncTreeShell() {
  qs('#agrp-treePanel')?.classList.toggle('is-open', state.treeOpen);
  qs('#agrp-treeBackdrop')?.classList.toggle('is-visible', state.treeOpen);
}

function renderAll() {
  syncHeader();
  syncTreeShell();
  renderTree();
  renderMain();
  renderModal();
}

function updateActiveFileTitleMirror(title) {
  const activeNode = getActiveNode();
  if (!activeNode) return;
  const currentPath = qs('#agrp-currentPath');
  if (currentPath) currentPath.textContent = getNodePathLabel(activeNode.id);
  const activeTreeCopy = qs(`[data-tree-node="${activeNode.id}"] .agrp-tree-copy strong`);
  if (activeTreeCopy) activeTreeCopy.textContent = title;
}

function openModal(kind, payload = {}) {
  state.modal = {
    kind,
    nodeId: payload.nodeId || null,
    parentId: payload.parentId || getCurrentFolderId(),
    templateKey: payload.templateKey || 'nota-libre'
  };
  renderModal();
}

function closeModal() {
  state.modal = null;
  renderModal();
}

function toggleFolder(nodeId) {
  const folder = getNode(state.repo.nodes, nodeId);
  if (!folder || folder.type !== 'folder') return;
  if (state.repo.expandedIds.includes(nodeId)) {
    state.repo.expandedIds = state.repo.expandedIds.filter((id) => id !== nodeId);
  } else {
    state.repo.expandedIds.push(nodeId);
  }
  renderTree();
}

function selectNode(nodeId) {
  const node = getNode(state.repo.nodes, nodeId);
  if (!node) return;
  state.repo.activeNodeId = node.id;
  ensureAncestorsExpanded(node.id);
  renderAll();
  closeTreeOnMobile();
}

function removeNode(nodeId) {
  const node = getNode(state.repo.nodes, nodeId);
  if (!node || isSystemFolder(node)) return;
  const descendants = [];
  const queue = [nodeId];
  while (queue.length) {
    const currentId = queue.shift();
    descendants.push(currentId);
    getChildren(state.repo.nodes, currentId).forEach((child) => queue.push(child.id));
  }

  const confirmText = node.type === 'folder'
    ? `Eliminar "${node.title}" y ${Math.max(0, descendants.length - 1)} item(s) internos de AgroRepo local?`
    : `Eliminar "${node.title}" de AgroRepo local?`;
  if (!window.confirm(confirmText)) return;

  state.repo.nodes = state.repo.nodes.filter((entry) => !descendants.includes(entry.id));
  state.repo.expandedIds = state.repo.expandedIds.filter((id) => !descendants.includes(id));
  if (descendants.includes(state.repo.activeNodeId)) {
    state.repo.activeNodeId = getAllFiles(state.repo.nodes)[0]?.id || getRootFolders(state.repo.nodes)[0]?.id || null;
  }
  persistNow(false);
  renderAll();
  showToast('Elemento eliminado del repo local.', 'info');
}

function handleModalSubmit() {
  if (!state.modal?.kind) return;
  const name = qs('#agrp-modalName')?.value || '';
  const modalParentValue = qs('#agrp-modalParent')?.value;
  const parentId = modalParentValue === '__root__'
    ? null
    : (modalParentValue || state.modal.parentId || getCurrentFolderId());
  const templateKey = normalizeTemplateKey(qs('#agrp-modalTemplate')?.value || state.modal.templateKey || 'nota-libre');

  if (state.modal.kind === 'create-folder') {
    const folder = buildFolderNode(state.repo.nodes, { parentId, title: name || 'Nueva carpeta' });
    state.repo.nodes.push(folder);
    state.repo.activeNodeId = folder.id;
    ensureAncestorsExpanded(folder.id);
    persistNow(false);
    closeModal();
    renderAll();
    showToast('Carpeta creada.', 'success');
    return;
  }

  if (state.modal.kind === 'create-file') {
    const file = buildFileNode(state.repo.nodes, {
      parentId,
      templateKey,
      title: name || getTemplate(templateKey).defaultTitle
    });
    state.repo.nodes.push(file);
    state.repo.activeNodeId = file.id;
    state.viewMode = 'editor';
    ensureAncestorsExpanded(file.id);
    persistNow(false);
    closeModal();
    renderAll();
    window.setTimeout(() => qs('#agrp-fileTitle')?.focus(), 40);
    showToast('Archivo creado.', 'success');
    return;
  }

  if (state.modal.kind === 'rename') {
    const node = getNode(state.repo.nodes, state.modal.nodeId);
    if (!node || isSystemFolder(node)) {
      closeModal();
      return;
    }
    node.title = ensureUniqueNodeTitle(name || node.title, node.parentId || null, node.type, state.repo.nodes, node.id);
    node.updatedAt = new Date().toISOString();
    persistNow(false);
    closeModal();
    renderAll();
    showToast('Nombre actualizado.', 'success');
  }
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  if (action === 'toggle-tree') {
    state.treeOpen = !state.treeOpen;
    syncTreeShell();
    return;
  }
  if (action === 'toggle-folder') return void toggleFolder(target.dataset.nodeId);
  if (action === 'select-node') return void selectNode(target.dataset.nodeId);
  if (action === 'open-create-folder') return void openModal('create-folder', { parentId: target.dataset.parentId || getCurrentFolderId() });
  if (action === 'open-create-file') {
    const activeFile = getActiveFile();
    return void openModal('create-file', {
      parentId: target.dataset.parentId || getCurrentFolderId(),
      templateKey: activeFile?.templateKey || 'nota-libre'
    });
  }
  if (action === 'open-rename') return void openModal('rename', { nodeId: target.dataset.nodeId });
  if (action === 'delete-node') return void removeNode(target.dataset.nodeId || state.repo.activeNodeId);
  if (action === 'save-file') return void persistNow(true);
  if (action === 'set-mode') {
    state.viewMode = target.dataset.mode === 'preview' ? 'preview' : 'editor';
    syncHeader();
    renderMain();
    return;
  }
  if (action === 'toggle-sort') {
    state.sortMode = state.sortMode === 'updated' ? 'name' : 'updated';
    renderTree();
    syncHeader();
    return;
  }
  if (action === 'close-modal') closeModal();
}

function handleInput(event) {
  const activeFile = getActiveFile();
  if (event.target.id === 'agrp-searchInput') {
    state.query = event.target.value || '';
    renderTree();
    return;
  }
  if (!activeFile) return;

  if (event.target.id === 'agrp-fileTitle') {
    activeFile.title = event.target.value || '';
    activeFile.updatedAt = new Date().toISOString();
    updateActiveFileTitleMirror(activeFile.title);
    schedulePersist();
    return;
  }

  if (event.target.id === 'agrp-fileContent') {
    activeFile.content = event.target.value || '';
    activeFile.updatedAt = new Date().toISOString();
    const stats = qs('#agrp-fileStats');
    if (stats) stats.textContent = `${countWords(activeFile.content)} palabras · ${activeFile.content.length} caracteres`;
    const preview = qs('#agrp-filePreview');
    if (preview) preview.innerHTML = renderMarkdown(activeFile.content);
    schedulePersist();
  }
}

function handleChange(event) {
  const activeFile = getActiveFile();
  if (!activeFile) return;
  if (event.target.id === 'agrp-fileTemplate') {
    activeFile.templateKey = normalizeTemplateKey(event.target.value);
    activeFile.updatedAt = new Date().toISOString();
    persistNow(false);
    renderAll();
  }
}

function handleFocusOut(event) {
  const activeFile = getActiveFile();
  if (!activeFile) return;
  if (event.target.id === 'agrp-fileTitle') {
    activeFile.title = ensureUniqueNodeTitle(activeFile.title || 'nota.md', activeFile.parentId, 'file', state.repo.nodes, activeFile.id);
    persistNow(false);
    renderAll();
  }
}

function handleSubmit(event) {
  if (event.target.id !== 'agrp-modalForm') return;
  event.preventDefault();
  handleModalSubmit();
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    if (state.modal?.kind) return void closeModal();
    if (state.treeOpen) return void closeTreeOnMobile();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    persistNow(true);
  }
}

function bindEvents() {
  state.root?.addEventListener('click', handleClick);
  state.root?.addEventListener('input', handleInput);
  state.root?.addEventListener('change', handleChange);
  state.root?.addEventListener('focusout', handleFocusOut);
  state.root?.addEventListener('submit', handleSubmit);
  state.root?.addEventListener('keydown', handleKeydown);
}

function renderFrame() {
  state.root.innerHTML = `
    <div class="agrp-shell">
      <div class="agrp-ghost agrp-ghost--left" aria-hidden="true">🌾</div>
      <div class="agrp-ghost agrp-ghost--right" aria-hidden="true">📝</div>
      <aside class="agrp-tree-panel" id="agrp-treePanel">
        <div class="agrp-tree-head">
          <div class="agrp-tree-head-copy">
            <span class="agrp-tree-kicker">Repositorio local</span>
            <strong>AgroRepo</strong>
          </div>
          <span class="agrp-tree-summary" id="agrp-treeSummary">0 archivos</span>
        </div>
        <div id="agrp-treeBody" class="agrp-tree-body"></div>
      </aside>
      <div class="agrp-tree-backdrop" id="agrp-treeBackdrop" data-action="toggle-tree"></div>
      <main class="agrp-main-shell">
        <header class="agrp-topbar">
          <div class="agrp-topbar-left">
            <button type="button" class="agrp-icon-btn agrp-icon-btn--soft agrp-tree-toggle-mobile" data-action="toggle-tree" title="Abrir arbol"><i class="fa-solid fa-bars-staggered" aria-hidden="true"></i></button>
            <div class="agrp-topbar-brand">
              <span class="agrp-brand-name">AgroRepo</span>
              <span class="agrp-current-path" id="agrp-currentPath">AgroRepo</span>
            </div>
          </div>
          <label class="agrp-searchbar" for="agrp-searchInput">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input id="agrp-searchInput" type="search" placeholder="Buscar en titulos y contenido" autocomplete="off" />
          </label>
          <div class="agrp-topbar-actions">
            <button type="button" class="agrp-icon-btn" data-action="open-create-folder" title="Nueva carpeta"><i class="fa-solid fa-folder-plus" aria-hidden="true"></i></button>
            <button type="button" class="agrp-icon-btn" data-action="open-create-file" title="Nuevo archivo"><i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i></button>
            <button type="button" class="agrp-icon-btn" data-action="toggle-sort" data-role="sort-button" title="Ordenar por nombre"><i class="fa-solid fa-arrow-down-a-z" aria-hidden="true"></i></button>
            <button type="button" class="agrp-icon-btn" data-action="set-mode" data-mode="editor" data-role="mode-editor" title="Editor"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i></button>
            <button type="button" class="agrp-icon-btn" data-action="set-mode" data-mode="preview" data-role="mode-preview" title="Vista previa"><i class="fa-regular fa-eye" aria-hidden="true"></i></button>
          </div>
        </header>
        <div class="agrp-subbar">
          <span class="agrp-subbar-copy" id="agrp-fileCount">0 archivos locales</span>
          <span class="agrp-subbar-copy">Editor Markdown local-first</span>
        </div>
        <section id="agrp-mainPanel" class="agrp-main-panel"></section>
      </main>
      <div id="agrp-modalRoot"></div>
      <div id="agrp-toastStack" class="agrp-toast-stack" aria-live="polite"></div>
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

  renderFrame();
  bindEvents();
  syncRepoBridge();
  renderAll();
  if (notice) showToast(notice, 'success');
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
    accordion.querySelector('summary')?.setAttribute('aria-expanded', 'true');
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
