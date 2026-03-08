// ============================================================
// AGROREPO ULTIMATE ENGINE v2.0.0
// Local-First, Feature-Complete, Premium UX
// Extracted from agro.js monolith → standalone lazy module
// ============================================================
'use strict';

// ─── LOCAL UTILITY (self-contained, no external deps) ────────
function randomBase36(length = 6) {
    const size = Math.max(1, Number(length) || 6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(size);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
    }
    return (Date.now().toString(36) + '000000000000').slice(-size);
}

// FEATURE FLAG
const AGROREPO_ENABLED = true;

// Constants
const APP_KEY = 'agrorepo_ultimate_v2';
const CROP_ICONS = {
    maiz: '🌽', caraota: '🫘', tomate: '🍅', papa: '🥔',
    cafe: '☕', lechuga: '🥬', cebolla: '🧅', ajo: '🧄', otro: '🌾'
};
const TAG_CONFIG = {
    riego: { icon: '💧', label: 'Riego' },
    abono: { icon: '🧪', label: 'Abono' },
    plaga: { icon: '🐛', label: 'Plaga' },
    cosecha: { icon: '🌽', label: 'Cosecha' },
    siembra: { icon: '🌱', label: 'Siembra' },
    clima: { icon: '🌦️', label: 'Clima' },
    general: { icon: '📋', label: 'General' }
};

// State
const state = {
    bitacoras: [],
    activeBitacoraId: null,
    selectedTags: [],
    lastSaved: null
};

// DOM refs
let root = null;
let widgetInitialized = false;
let _deleteCallback = null;

// ─── UTILITIES ─────────────────────────────────────────
const $ = id => root?.querySelector(`#${id}`) || document.getElementById(id);
const generateId = () => `arw_${Date.now().toString(36)}_${randomBase36(6)}`;
const generateHash = () => randomBase36(6).toUpperCase();

function formatDate(iso) {
    try {
        return new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
}

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    return `Hace ${Math.floor(hrs / 24)}d`;
}

function getCropIcon(name) {
    const lower = name.toLowerCase();
    for (const [key, icon] of Object.entries(CROP_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return '🌾';
}

function getStorageSize() {
    const data = localStorage.getItem(APP_KEY) || '';
    const bytes = new Blob([data]).size;
    return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
}

function renderMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^- (.+)/gm, '<span style="color:var(--arw-text-muted);margin-right:6px">▸</span>$1');
}

function getTagLabel(tag) {
    return TAG_CONFIG[tag] ? `${TAG_CONFIG[tag].icon} ${TAG_CONFIG[tag].label}` : tag;
}

// ─── PERSISTENCE ─────────────────────────────────────────
function persist() {
    try {
        localStorage.setItem(APP_KEY, JSON.stringify({
            bitacoras: state.bitacoras,
            activeBitacoraId: state.activeBitacoraId,
            lastSaved: state.lastSaved
        }));
        updateStats();
    } catch (e) {
        console.error('[AgroRepo] Persist error:', e);
        showToast('❌ Error al guardar', 'error');
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(APP_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            state.bitacoras = parsed.bitacoras || [];
            state.activeBitacoraId = parsed.activeBitacoraId || null;
            state.lastSaved = parsed.lastSaved || null;
        }
    } catch (e) {
        console.error('[AgroRepo] Load error:', e);
        state.bitacoras = [];
    }
}

// ─── TOAST ────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = $('arw-toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'arw-toast';
    const icon = document.createElement('span');
    icon.style.fontSize = '1.1rem';
    icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
    const text = document.createElement('span');
    text.style.cssText = 'font-size:0.82rem;color:var(--arw-text-primary)';
    text.textContent = String(message || '');
    toast.append(icon, text);
    toast.style.borderColor = type === 'success' ? 'var(--arw-success)' : type === 'error' ? 'var(--arw-danger)' : type === 'warning' ? 'var(--arw-warning)' : 'var(--arw-border-gold)';
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ─── DELETE MODAL ─────────────────────────────────────
function showDeleteModal(text, callback) {
    const modal = $('arw-deleteModal');
    const modalText = $('arw-deleteModalText');
    if (modal && modalText) {
        modalText.textContent = text;
        modal.classList.add('active');
        _deleteCallback = callback;
    }
}

function closeDeleteModal() {
    const modal = $('arw-deleteModal');
    if (modal) modal.classList.remove('active');
    _deleteCallback = null;
}

// ─── BITÁCORA CRUD ────────────────────────────────────
function createBitacora() {
    const input = $('arw-newBitacoraInput');
    const name = input?.value?.trim();
    if (!name) {
        showToast('⚠️ Escribe el nombre del cultivo', 'warning');
        input?.focus();
        return;
    }
    if (state.bitacoras.some(b => b.name.toLowerCase() === name.toLowerCase())) {
        showToast('⚠️ Ya existe una bitácora con ese nombre', 'warning');
        return;
    }
    const bitacora = {
        id: generateId(),
        name,
        icon: getCropIcon(name),
        createdAt: new Date().toISOString(),
        reports: []
    };
    state.bitacoras.unshift(bitacora);
    if (input) input.value = '';
    persist();
    renderBitacoraList();
    selectBitacora(bitacora.id);
    showToast(`✅ Bitácora "${String(name || '')}" creada`, 'success');
}

function deleteBitacora(id) {
    const b = state.bitacoras.find(x => x.id === id);
    if (!b) return;
    showDeleteModal(`¿Eliminar "${b.name}" y sus ${b.reports.length} reportes? No se puede deshacer.`, () => {
        state.bitacoras = state.bitacoras.filter(x => x.id !== id);
        if (state.activeBitacoraId === id) {
            state.activeBitacoraId = null;
            showWelcome();
        }
        persist();
        renderBitacoraList();
        showToast(`🗑️ Bitácora "${String(b?.name || '')}" eliminada`);
    });
}

function selectBitacora(id) {
    state.activeBitacoraId = id;
    persist();
    renderBitacoraList();
    showEditor();
    closeSidebar();
}

// ─── REPORTS ──────────────────────────────────────────
function commitReport() {
    const textarea = $('arw-reportContent');
    const text = textarea?.value?.trim();
    if (!state.activeBitacoraId) {
        showToast('⚠️ Selecciona una bitácora primero', 'warning');
        return;
    }
    if (!text) {
        showToast('⚠️ Escribe algo en el reporte', 'warning');
        textarea?.focus();
        return;
    }
    const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
    if (!bitacora) return;
    const report = {
        id: generateId(),
        hash: generateHash(),
        content: text,
        tags: [...state.selectedTags],
        createdAt: new Date().toISOString()
    };
    if (report.tags.length === 0) report.tags.push('general');
    bitacora.reports.unshift(report);
    if (textarea) textarea.value = '';
    state.selectedTags = [];
    root?.querySelectorAll('.arw-tag-btn.selected')?.forEach(b => b.classList.remove('selected'));
    persist();
    renderTimeline();
    renderPreview();
    renderBitacoraList();
    showToast(`✅ Reporte registrado · <strong style="font-family:monospace;color:var(--arw-gold-muted)">#${report.hash}</strong>`, 'success');
}

function deleteReport(reportId) {
    const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
    if (!bitacora) return;
    showDeleteModal('¿Eliminar este reporte? No se puede deshacer.', () => {
        bitacora.reports = bitacora.reports.filter(r => r.id !== reportId);
        persist();
        renderTimeline();
        renderPreview();
        renderBitacoraList();
        showToast('🗑️ Reporte eliminado');
    });
}

function copyReport(reportId) {
    const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
    if (!bitacora) return;
    const r = bitacora.reports.find(x => x.id === reportId);
    if (!r) return;
    const text = `[#${r.hash}] ${formatDate(r.createdAt)}\nTags: ${r.tags.join(', ')}\n\n${r.content}`;
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Reporte copiado al portapapeles', 'success');
    }).catch(() => {
        showToast('❌ No se pudo copiar', 'error');
    });
}

// ─── TAG SYSTEM ───────────────────────────────────────
function toggleTag(btn) {
    const tag = btn.dataset.tag;
    btn.classList.toggle('selected');
    if (state.selectedTags.includes(tag)) {
        state.selectedTags = state.selectedTags.filter(t => t !== tag);
    } else {
        state.selectedTags.push(tag);
    }
    // Update visual state
    if (btn.classList.contains('selected')) {
        btn.style.background = 'rgba(212,175,55,0.2)';
        btn.style.borderColor = 'var(--arw-gold-primary)';
        btn.style.color = 'var(--arw-gold-bright)';
    } else {
        btn.style.background = 'var(--arw-bg-tertiary)';
        btn.style.borderColor = 'var(--arw-border-subtle)';
        btn.style.color = 'var(--arw-text-secondary)';
    }
}

// ─── RENDERING ───────────────────────────────────────
function renderBitacoraList() {
    const list = $('arw-bitacoraList');
    if (!list) return;
    if (state.bitacoras.length === 0) {
        list.replaceChildren();
        const emptyItem = document.createElement('li');
        emptyItem.style.cssText = 'padding:24px 20px;text-align:center;color:var(--arw-text-muted);font-size:0.82rem;white-space:pre-line;';
        emptyItem.textContent = 'No hay bitácoras aún.\n¡Crea la primera arriba!';
        list.appendChild(emptyItem);
        return;
    }
    list.replaceChildren();
    const fragment = document.createDocumentFragment();
    state.bitacoras.forEach((b) => {
        const item = document.createElement('li');
        item.className = `arw-bitacora-item ${b.id === state.activeBitacoraId ? 'active' : ''}`;
        item.dataset.id = b.id;

        const icon = document.createElement('span');
        icon.className = 'arw-bitacora-icon';
        icon.textContent = String(b.icon || '');

        const info = document.createElement('div');
        info.className = 'arw-bitacora-info';

        const name = document.createElement('div');
        name.className = 'arw-bitacora-name';
        name.textContent = String(b.name || '');

        const meta = document.createElement('div');
        meta.className = 'arw-bitacora-meta';
        meta.textContent = `${b.reports.length} reporte${b.reports.length !== 1 ? 's' : ''} · ${timeAgo(b.createdAt)}`;

        info.append(name, meta);

        const del = document.createElement('button');
        del.className = 'arw-bitacora-delete';
        del.dataset.del = b.id;
        del.title = 'Eliminar';
        del.style.cssText = 'background:none;border:none;color:var(--arw-text-muted);cursor:pointer;padding:4px 8px;font-size:14px;opacity:0;transition:opacity 0.2s;';
        del.textContent = '✕';

        item.append(icon, info, del);
        fragment.appendChild(item);
    });
    list.appendChild(fragment);
    // Bind clicks
    list.querySelectorAll('.arw-bitacora-item').forEach(item => {
        item.addEventListener('click', e => {
            if (e.target.closest('.arw-bitacora-delete')) return;
            selectBitacora(item.dataset.id);
        });
        item.addEventListener('mouseenter', () => {
            item.querySelector('.arw-bitacora-delete').style.opacity = '1';
        });
        item.addEventListener('mouseleave', () => {
            item.querySelector('.arw-bitacora-delete').style.opacity = '0';
        });
    });
    list.querySelectorAll('.arw-bitacora-delete').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            deleteBitacora(btn.dataset.del);
        });
    });
}

function showWelcome() {
    const welcome = $('arw-welcomeScreen');
    const editor = $('arw-editorPanel');
    const preview = $('arw-previewPanel');
    const breadcrumb = $('arw-breadcrumb');
    if (welcome) welcome.style.display = 'flex';
    if (editor) editor.style.display = 'none';
    if (preview) preview.style.display = 'none';
    if (breadcrumb) {
        breadcrumb.replaceChildren();
        const rootEl = document.createElement('span');
        rootEl.className = 'arw-breadcrumb-item';
        rootEl.textContent = 'AgroRepo';
        breadcrumb.appendChild(rootEl);
    }
}

function showEditor() {
    const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
    if (!bitacora) { showWelcome(); return; }
    const welcome = $('arw-welcomeScreen');
    const editor = $('arw-editorPanel');
    const preview = $('arw-previewPanel');
    const breadcrumb = $('arw-breadcrumb');
    if (welcome) welcome.style.display = 'none';
    if (editor) editor.style.display = 'flex';
    if (preview) preview.style.display = 'block';
    if (breadcrumb) {
        breadcrumb.replaceChildren();
        const rootEl = document.createElement('span');
        rootEl.className = 'arw-breadcrumb-item';
        rootEl.textContent = 'AgroRepo';
        const sep = document.createElement('span');
        sep.style.cssText = 'color:var(--arw-text-muted);margin:0 8px;';
        sep.textContent = '›';
        const current = document.createElement('span');
        current.className = 'arw-breadcrumb-current';
        current.style.color = 'var(--arw-gold-primary)';
        current.textContent = `${bitacora.icon} ${bitacora.name}`;
        breadcrumb.append(rootEl, sep, current);
    }
    renderTimeline();
    renderPreview();
}

function renderTimeline() {
    const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
    const container = $('arw-commitsTimeline');
    const countEl = $('arw-commitsCount');
    if (!container || !bitacora) return;
    if (countEl) countEl.textContent = bitacora.reports.length;
    if (bitacora.reports.length === 0) {
        container.replaceChildren();
        const emptyState = document.createElement('div');
        emptyState.className = 'arw-empty-state';

        const icon = document.createElement('div');
        icon.className = 'arw-empty-state-icon';
        icon.textContent = '📋';
        const title = document.createElement('div');
        title.className = 'arw-empty-state-title';
        title.textContent = 'Sin reportes aún';
        const text = document.createElement('div');
        text.className = 'arw-empty-state-text';
        text.textContent = 'Escribe tu primer reporte de campo arriba';

        emptyState.append(icon, title, text);
        container.appendChild(emptyState);
        return;
    }
    container.replaceChildren();
    const timeline = document.createElement('div');
    timeline.className = 'arw-commit-timeline';
    timeline.style.cssText = 'position:relative;padding-left:20px;';

    bitacora.reports.forEach((r) => {
        const entry = document.createElement('div');
        entry.className = 'arw-commit-entry';
        entry.style.cssText = 'position:relative;padding:14px;background:var(--arw-bg-tertiary);border-radius:var(--arw-radius-md);margin-bottom:12px;border:1px solid var(--arw-border-subtle);';

        const dot = document.createElement('div');
        dot.style.cssText = 'position:absolute;left:-26px;top:18px;width:12px;height:12px;background:var(--arw-gold-primary);border-radius:50%;border:2px solid var(--arw-bg-primary);';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';

        const hash = document.createElement('span');
        hash.style.cssText = 'font-family:monospace;font-size:11px;color:var(--arw-gold-muted);background:var(--arw-bg-elevated);padding:2px 8px;border-radius:4px;';
        hash.textContent = `#${r.hash}`;

        const createdAt = document.createElement('span');
        createdAt.style.cssText = 'font-size:10px;color:var(--arw-text-muted);';
        createdAt.textContent = formatDate(r.createdAt);
        header.append(hash, createdAt);

        const content = document.createElement('div');
        content.style.cssText = 'font-size:13px;color:var(--arw-text-primary);line-height:1.6;margin-bottom:10px;white-space:pre-wrap;';
        content.textContent = String(r.content || '');

        entry.append(dot, header, content);

        if (Array.isArray(r.tags) && r.tags.length > 0) {
            const tagsWrap = document.createElement('div');
            tagsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
            r.tags.forEach((t) => {
                const tag = document.createElement('span');
                tag.style.cssText = 'font-size:10px;padding:3px 8px;background:rgba(212,175,55,0.1);border:1px solid var(--arw-border-gold);border-radius:12px;color:var(--arw-gold-muted);';
                tag.textContent = getTagLabel(t);
                tagsWrap.appendChild(tag);
            });
            entry.appendChild(tagsWrap);
        }

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'arw-action-copy';
        copyBtn.dataset.copy = r.id;
        copyBtn.style.cssText = 'background:none;border:1px solid var(--arw-border-subtle);color:var(--arw-text-secondary);padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;';
        copyBtn.textContent = '📋 Copiar';

        const delBtn = document.createElement('button');
        delBtn.className = 'arw-action-del';
        delBtn.dataset.del = r.id;
        delBtn.style.cssText = 'background:none;border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;';
        delBtn.textContent = '🗑️ Eliminar';

        actions.append(copyBtn, delBtn);
        entry.appendChild(actions);
        timeline.appendChild(entry);
    });

    container.appendChild(timeline);
    container.querySelectorAll('.arw-action-copy').forEach(btn => {
        btn.addEventListener('click', () => copyReport(btn.dataset.copy));
    });
    container.querySelectorAll('.arw-action-del').forEach(btn => {
        btn.addEventListener('click', () => deleteReport(btn.dataset.del));
    });
}

function renderPreview() {
    const bitacora = state.bitacoras.find(b => b.id === state.activeBitacoraId);
    if (!bitacora) return;
    const pvStatTotal = $('arw-pvStatTotal');
    const pvStatDays = $('arw-pvStatDays');
    const pvInfoName = $('arw-pvInfoName');
    const pvInfoCreated = $('arw-pvInfoCreated');
    const pvInfoLast = $('arw-pvInfoLast');
    const pvTagStats = $('arw-pvTagStats');
    if (pvStatTotal) pvStatTotal.textContent = bitacora.reports.length;
    const uniqueDays = new Set(bitacora.reports.map(r => new Date(r.createdAt).toDateString()));
    if (pvStatDays) pvStatDays.textContent = uniqueDays.size;
    if (pvInfoName) pvInfoName.textContent = bitacora.name;
    if (pvInfoCreated) pvInfoCreated.textContent = formatDate(bitacora.createdAt);
    const lastR = bitacora.reports[0];
    if (pvInfoLast) pvInfoLast.textContent = lastR ? timeAgo(lastR.createdAt) : 'Sin reportes';
    // Tag distribution
    const tagCount = {};
    bitacora.reports.forEach(r => {
        (r.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
    });
    if (pvTagStats) {
        const entries = Object.entries(tagCount).sort((a, b) => b[1] - a[1]);
        pvTagStats.replaceChildren();
        if (entries.length === 0) {
            const empty = document.createElement('p');
            empty.style.cssText = 'font-size:0.78rem;color:var(--arw-text-muted);';
            empty.textContent = 'Sin datos aún';
            pvTagStats.appendChild(empty);
        } else {
            const fragment = document.createDocumentFragment();
            entries.forEach(([tag, count]) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--arw-border-subtle);font-size:12px;';

                const tagLabel = document.createElement('span');
                tagLabel.style.color = 'var(--arw-text-secondary)';
                tagLabel.textContent = getTagLabel(tag);

                const countLabel = document.createElement('span');
                countLabel.style.cssText = 'color:var(--arw-gold-primary);font-weight:600;';
                countLabel.textContent = String(count);

                row.append(tagLabel, countLabel);
                fragment.appendChild(row);
            });
            pvTagStats.appendChild(fragment);
        }
    }
}

function updateStats() {
    const total = state.bitacoras.reduce((s, b) => s + b.reports.length, 0);
    const statBitacoras = $('arw-statBitacoras');
    const statReportes = $('arw-statReportes');
    const storageStatus = $('arw-storageStatus');
    if (statBitacoras) statBitacoras.textContent = state.bitacoras.length;
    if (statReportes) statReportes.textContent = total;
    if (storageStatus) storageStatus.textContent = `LocalStorage · ${getStorageSize()} · 100% Offline`;
}

// ─── EXPORT/IMPORT ────────────────────────────────────
async function saveToFile() {
    const data = JSON.stringify({ bitacoras: state.bitacoras, exportedAt: new Date().toISOString(), version: '2.0.0' }, null, 2);
    const fileName = `agrorepo_backup_${new Date().toISOString().slice(0, 10)}.json`;
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: 'AgroRepo Data', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(data);
            await writable.close();
            state.lastSaved = new Date().toISOString();
            persist();
            showToast('💾 Datos guardados en disco', 'success');
            return;
        } catch (e) { if (e.name === 'AbortError') return; }
    }
    downloadBlob(data, fileName, 'application/json');
    showToast('💾 Archivo JSON descargado', 'success');
}

async function exportJSON() {
    if (state.bitacoras.length === 0) {
        showToast('⚠️ No hay datos para exportar', 'warning');
        return;
    }
    const data = JSON.stringify({
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        system: 'AgroRepo Ultimate | YavlGold',
        bitacoras: state.bitacoras
    }, null, 2);
    const fileName = `agrorepo_backup_${new Date().toISOString().slice(0, 10)}.json`;
    downloadBlob(data, fileName, 'application/json');
    showToast('📦 Backup JSON descargado', 'success');
}

async function exportMarkdown() {
    if (state.bitacoras.length === 0) {
        showToast('⚠️ No hay datos para exportar', 'warning');
        return;
    }
    let md = `# 🌾 AgroRepo Ultimate — Exportación Completa\n`;
    md += `**Fecha:** ${new Date().toLocaleString('es-VE')}\n`;
    md += `**Bitácoras:** ${state.bitacoras.length}\n\n---\n\n`;
    state.bitacoras.forEach(b => {
        md += `## ${b.icon} ${b.name}\n`;
        md += `*Creada: ${formatDate(b.createdAt)} · ${b.reports.length} reportes*\n\n`;
        b.reports.forEach(r => {
            md += `### \`#${r.hash}\` — ${formatDate(r.createdAt)}\n`;
            if (r.tags?.length) md += `**Tags:** ${r.tags.join(', ')}\n\n`;
            md += `${r.content}\n\n---\n\n`;
        });
    });
    const fileName = `agrorepo_export_${new Date().toISOString().slice(0, 10)}.md`;
    downloadBlob(md, fileName, 'text/markdown');
    showToast('📝 Exportación Markdown descargada', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const imported = JSON.parse(ev.target.result);
                const bitacoras = imported.bitacoras;
                if (!bitacoras || !Array.isArray(bitacoras)) throw new Error('Formato inválido');
                let added = 0;
                bitacoras.forEach(ib => {
                    if (!state.bitacoras.some(b => b.id === ib.id)) {
                        state.bitacoras.push(ib);
                        added++;
                    }
                });
                persist();
                renderBitacoraList();
                showToast(`📂 Importadas ${added} bitácora${added !== 1 ? 's' : ''} nueva${added !== 1 ? 's' : ''}`, 'success');
            } catch (err) {
                showToast('❌ Archivo no tiene formato AgroRepo válido', 'error');
                console.error('[AgroRepo] Import error:', err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── MOBILE SIDEBAR ──────────────────────────────────
function toggleSidebar() {
    const sidebar = $('arw-sidebar');
    const backdrop = $('arw-sidebarBackdrop');
    sidebar?.classList.toggle('open');
    backdrop?.classList.toggle('show');
}

function closeSidebar() {
    const sidebar = $('arw-sidebar');
    const backdrop = $('arw-sidebarBackdrop');
    sidebar?.classList.remove('open');
    backdrop?.classList.remove('show');
}

// ─── EVENT BINDING ──────────────────────────────────
function bindEvents() {
    // Create bitacora
    $('arw-btnCreateBitacora')?.addEventListener('click', createBitacora);
    $('arw-newBitacoraInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); createBitacora(); }
    });
    // Tags
    root?.querySelectorAll('.arw-tag-btn')?.forEach(btn => {
        btn.addEventListener('click', () => toggleTag(btn));
    });
    // Submit report
    $('arw-submitBtn')?.addEventListener('click', commitReport);
    // Mobile menu
    $('arw-menuToggle')?.addEventListener('click', toggleSidebar);
    $('arw-sidebarBackdrop')?.addEventListener('click', closeSidebar);
    // Header actions
    $('arw-btnOpenFile')?.addEventListener('click', importData);
    $('arw-btnExportJSON')?.addEventListener('click', exportJSON);
    $('arw-btnExportMD')?.addEventListener('click', exportMarkdown);
    $('arw-btnSaveFile')?.addEventListener('click', saveToFile);
    // Delete modal
    $('arw-deleteModalConfirm')?.addEventListener('click', () => {
        if (_deleteCallback) _deleteCallback();
        closeDeleteModal();
    });
    $('arw-deleteModalCancel')?.addEventListener('click', closeDeleteModal);
    $('arw-deleteModalClose')?.addEventListener('click', closeDeleteModal);
    $('arw-deleteModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDeleteModal();
    });
    // Keyboard shortcuts
    root?.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveToFile(); }
        if (e.ctrlKey && e.key === 'e') { e.preventDefault(); exportJSON(); }
        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); commitReport(); }
        if (e.key === 'Escape') { closeDeleteModal(); closeSidebar(); }
    });
}

// ─── INIT ────────────────────────────────────────────
function initWidget() {
    if (widgetInitialized) return;
    root = document.getElementById('agro-widget-root');
    if (!root) { console.error('[AgroRepo] Root not found'); return; }
    if (root.dataset.loaded === '1') { console.log('[AgroRepo] Already loaded'); return; }
    widgetInitialized = true;
    root.dataset.loaded = '1';
    console.log('[AgroRepo] 🌾 Initializing Ultimate Engine v2.0...');
    const template = document.getElementById('agro-repo-template');
    if (!template) { console.error('[AgroRepo] Template not found'); return; }
    root.replaceChildren();
    root.appendChild(template.content.cloneNode(true));
    loadState();
    bindEvents();
    renderBitacoraList();
    updateStats();
    if (state.activeBitacoraId) {
        const exists = state.bitacoras.find(b => b.id === state.activeBitacoraId);
        if (exists) showEditor();
        else { state.activeBitacoraId = null; persist(); }
    }
    console.log('[AgroRepo] ✅ Widget initialized with', state.bitacoras.length, 'bitácoras');
}

// ─── ACCORDION LISTENER ──────────────────────────────
function setupAccordionListener() {
    const accordion = document.getElementById('yg-acc-agrorepo');
    if (!accordion) { console.warn('[AgroRepo] Accordion not found'); return; }
    if (accordion.dataset.listenerBound === '1') return;
    accordion.dataset.listenerBound = '1';
    accordion.addEventListener('toggle', () => {
        if (accordion.open && !widgetInitialized) initWidget();
    });
    if (accordion.open) initWidget();
}

/**
 * Main entry point — called from agro.js via dynamic import.
 * Sets up the accordion listener that lazy-inits the widget on first open.
 */
export function initAgroRepo() {
    if (!AGROREPO_ENABLED) {
        console.log('[AgroRepo] ⛔ Widget disabled');
        const section = document.getElementById('agro-repo-section');
        if (section) section.style.display = 'none';
        return;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAccordionListener);
    } else {
        setupAccordionListener();
    }

    console.log('[AgroRepo] 📦 Ultimate Engine v2.0 loaded (lazy init on accordion open)');
}
