/**
 * YavlGold V9.4 - Módulo Agro - Supabase Integration
 * Conecta la UI con las tablas agro_crops y agro_roi_calculations
 */
import supabase from '../assets/js/config/supabase-config.js';
import { updateStats } from './agro-stats.js';
import './agro.css';

// ============================================================
// ESTADO DEL MÓDULO
// ============================================================
let currentEditId = null; // ID del cultivo en edición (null = nuevo)
let cropsCache = [];      // Cache local de cultivos para edición

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Renderiza el estado del cultivo como badge
 */
function createStatusBadge(status) {
    const statusMap = {
        'growing': { class: 'status-growing', text: 'Creciendo' },
        'ready': { class: 'status-ready', text: 'Lista!' },
        'attention': { class: 'status-attention', text: 'Atencion' },
        'harvested': { class: 'status-harvested', text: 'Cosechado' }
    };
    const s = statusMap[status] || statusMap['growing'];
    const badge = document.createElement('span');
    badge.className = `crop-status ${s.class}`;
    badge.textContent = s.text;
    return badge;
}

/**
 * Formatea fecha a texto legible
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Formatea moneda USD
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value || 0);
}

// ============================================================
// CARGAR CULTIVOS DESDE SUPABASE
// ============================================================

/**
 * Genera tarjeta de cultivo segura
 */
function createMetaItem(labelText, valueText, valueClass = '') {
    const item = document.createElement('div');
    item.className = 'crop-meta-item';

    const label = document.createElement('span');
    label.className = 'meta-label';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = valueClass ? `meta-value ${valueClass}` : 'meta-value';
    value.textContent = valueText;

    item.append(label, value);
    return item;
}

function normalizeProgress(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
}

function createCropCardElement(crop, index) {
    const delay = 4 + index; // Para animaciones escalonadas
    const card = document.createElement('div');
    card.className = `card crop-card animate-in delay-${delay}`;
    if (crop?.id !== undefined && crop?.id !== null) {
        card.dataset.cropId = String(crop.id);
    }

    const actions = document.createElement('div');
    actions.className = 'crop-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit-crop';
    editBtn.type = 'button';
    editBtn.title = 'Editar Cultivo';
    editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    editBtn.addEventListener('click', () => window.openEditModal?.(String(crop.id)));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete-crop';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Eliminar Cultivo';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.addEventListener('click', () => window.deleteCrop?.(String(crop.id)));

    actions.append(editBtn, deleteBtn);

    const header = document.createElement('div');
    header.className = 'crop-card-header';

    const cropInfo = document.createElement('div');
    cropInfo.className = 'crop-info';

    const cropIcon = document.createElement('div');
    cropIcon.className = 'crop-icon';
    cropIcon.textContent = crop.icon || 'Seed';

    const details = document.createElement('div');
    details.className = 'crop-details-header';

    const name = document.createElement('span');
    name.className = 'crop-name';
    name.textContent = crop.name || '';

    const variety = document.createElement('span');
    variety.className = 'crop-variety';
    variety.textContent = crop.variety || 'Sin variedad';

    details.append(name, variety);
    cropInfo.append(cropIcon, details);

    header.append(cropInfo, createStatusBadge(crop.status));

    const progressSection = document.createElement('div');
    progressSection.className = 'progress-section';

    const progressHeader = document.createElement('div');
    progressHeader.className = 'progress-header';

    const progressLabel = document.createElement('span');
    progressLabel.className = 'progress-label';
    progressLabel.textContent = 'Ciclo de Cosecha';

    const progressValue = document.createElement('span');
    progressValue.className = 'progress-value';
    const progress = normalizeProgress(crop.progress);
    progressValue.textContent = `${progress}%`;

    progressHeader.append(progressLabel, progressValue);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'progress-track';

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = `${progress}%`;

    progressTrack.appendChild(progressFill);
    progressSection.append(progressHeader, progressTrack);

    const metaGrid = document.createElement('div');
    metaGrid.className = 'crop-meta-grid';
    metaGrid.append(
        createMetaItem('Siembra', formatDate(crop.start_date)),
        createMetaItem('Cosecha Est.', formatDate(crop.expected_harvest_date)),
        createMetaItem('Area', `${crop.area_size} Ha`),
        createMetaItem('Inversion', formatCurrency(crop.investment), 'gold')
    );

    card.append(actions, header, progressSection, metaGrid);
    return card;
}

/**
 * Carga cultivos del usuario (Supabase + LocalStorage fallback)
 */
export async function loadCrops() {
    const cropsGrid = document.querySelector('.crops-grid');
    if (!cropsGrid) return;

    // Mostrar loading
    cropsGrid.innerHTML = `
        <div class="card animate-in" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
            <div class="kpi-icon-wrapper" style="margin: 0 auto 1rem;">🔄</div>
            <p style="color: var(--text-muted);">Cargando cultivos...</p>
        </div>
    `;

    let crops = [];
    let error = null;

    try {
        // 1. Intentar cargar desde Supabase
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
            const { data, error: sbError } = await supabase
                .from('agro_crops')
                .select('*')
                .order('created_at', { ascending: false });

            if (sbError) throw sbError;
            crops = data || [];
        } else {
            // 2. Fallback: LocalStorage
            console.log('[Agro] Usuario no autenticado, usando LocalStorage');
            crops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
        }

    } catch (err) {
        console.warn('[Agro] Error Supabase, intentando LocalStorage:', err);
        // Fallback en caso de error de conexión
        crops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
        error = err;
    }

    // Actualizar Estadísticas siempre (aunque esté vacío)
    updateStats(crops);

    if (crops.length === 0) {
        cropsCache = [];
        cropsGrid.innerHTML = `
            <div class="card animate-in" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <div class="kpi-icon-wrapper" style="margin: 0 auto 1rem;">🌱</div>
                <p style="color: var(--gold-primary); font-weight: 600;">No tienes cultivos activos aún</p>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem;">
                    Haz clic en "+ Nuevo Cultivo" para agregar tu primer cultivo
                </p>
            </div>
        `;
        return;
    }

    // Guardar en cache para edición
    cropsCache = crops;

    // Renderizar cultivos
    cropsGrid.textContent = '';
    const fragment = document.createDocumentFragment();
    crops.forEach((crop, i) => {
        fragment.appendChild(createCropCardElement(crop, i));
    });
    cropsGrid.appendChild(fragment);

    // Animar progress bars
    setTimeout(() => {
        document.querySelectorAll('.crops-grid .progress-fill').forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => { bar.style.width = width; }, 100);
        });
    }, 300);

    console.log(`[Agro] ✅ ${crops.length} cultivos cargados`);
}

// Expose loadCrops globally for data-refresh event in index.html
window.loadCrops = loadCrops;

// ============================================================
// CALCULADORA ROI CON GUARDADO EN SUPABASE
// ============================================================

/**
 * Calcula ROI y guarda en Supabase
 */
export async function calculateROI() {
    const investment = parseFloat(document.getElementById('investment')?.value) || 0;
    const revenue = parseFloat(document.getElementById('revenue')?.value) || 0;
    const quantity = parseFloat(document.getElementById('quantity')?.value) || 0;

    const profit = revenue - investment;
    const roi = investment > 0 ? ((profit / investment) * 100) : 0;

    // Actualizar DOM
    document.getElementById('resultInvestment').textContent = formatCurrency(investment);
    document.getElementById('resultRevenue').textContent = formatCurrency(revenue);

    const profitEl = document.getElementById('resultProfit');
    profitEl.textContent = formatCurrency(profit);
    profitEl.className = `roi-value ${profit >= 0 ? 'profit' : 'loss'}`;

    const roiEl = document.getElementById('resultROI');
    roiEl.textContent = `${roi.toFixed(1)}%`;
    roiEl.className = `roi-value ${roi >= 0 ? 'profit' : 'loss'}`;

    // Mostrar resultados con animación
    const resultDiv = document.getElementById('roiResult');
    resultDiv.classList.remove('visible');
    void resultDiv.offsetWidth; // Force reflow
    resultDiv.classList.add('visible');

    // Guardar en Supabase (solo si hay datos válidos)
    if (investment > 0 || revenue > 0) {
        try {
            const { data: userData } = await supabase.auth.getUser();

            if (userData?.user?.id) {
                const { error } = await supabase
                    .from('agro_roi_calculations')
                    .insert([{
                        user_id: userData.user.id,
                        investment_amount: investment,
                        projected_revenue: revenue,
                        quantity_kg: quantity || null,
                        calculated_profit: profit,
                        roi_percentage: roi
                    }]);

                if (error) {
                    console.warn('[Agro] Error guardando cálculo ROI:', error.message);
                } else {
                    console.log('[Agro] ✅ Cálculo ROI guardado');
                }
            } else {
                console.log('[Agro] Usuario no autenticado, cálculo no guardado');
            }
        } catch (err) {
            console.warn('[Agro] Error al guardar ROI:', err);
        }
    }
}

function resetRoiResults() {
    const resultDiv = document.getElementById('roiResult');
    if (resultDiv) resultDiv.classList.remove('visible');

    const defaults = [
        ['resultInvestment', '$0'],
        ['resultRevenue', '$0'],
        ['resultProfit', '$0'],
        ['resultROI', '0%']
    ];

    defaults.forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function clearRoiInputs() {
    const investment = document.getElementById('investment');
    const revenue = document.getElementById('revenue');
    const quantity = document.getElementById('quantity');

    if (investment) investment.value = '';
    if (revenue) revenue.value = '';
    if (quantity) quantity.value = '';

    resetRoiResults();
}

function injectRoiClearButton(calcBtn) {
    if (!calcBtn || document.getElementById('roi-clear-btn')) return;

    const clearBtn = document.createElement('button');
    clearBtn.id = 'roi-clear-btn';
    clearBtn.type = 'button';
    clearBtn.className = 'btn';
    clearBtn.textContent = 'LIMPIAR';
    clearBtn.style.cssText = "margin-left: 0.75rem; background: transparent; border: 1px solid rgba(200, 167, 82, 0.4); color: #C8A752; padding: 0.75rem 1.5rem; border-radius: 50px; font-family: 'Rajdhani', sans-serif; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.3s ease;";

    clearBtn.addEventListener('mouseenter', () => {
        clearBtn.style.background = 'rgba(200, 167, 82, 0.12)';
        clearBtn.style.borderColor = '#C8A752';
    });
    clearBtn.addEventListener('mouseleave', () => {
        clearBtn.style.background = 'transparent';
        clearBtn.style.borderColor = 'rgba(200, 167, 82, 0.4)';
    });
    clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearRoiInputs();
    });

    calcBtn.insertAdjacentElement('afterend', clearBtn);
}

let expenseSyncTimer = null;
let expenseSyncInFlight = false;
let expenseCache = [];
let expenseDeletedAtSupported = null;
let expenseDeletedAtRefreshDone = false;
const expenseSignedUrlCache = new Map();
let agroStoragePatched = false;

function setExpenseCache(data) {
    const rows = Array.isArray(data) ? data : [];
    expenseCache = rows.filter((row) => !row?.deleted_at);
    scheduleExpenseSync();
}

function patchExpenseSelect() {
    if (supabase.__agroExpenseSelectPatched) return;
    supabase.__agroExpenseSelectPatched = true;

    const originalFrom = supabase.from.bind(supabase);
    supabase.from = (table) => {
        const builder = originalFrom(table);
        if (table !== 'agro_expenses' || !builder || typeof builder.select !== 'function') {
            return builder;
        }

        const originalSelect = builder.select.bind(builder);
        builder.select = (...args) => {
            const query = originalSelect(...args);
            if (expenseDeletedAtSupported === true && typeof query?.is === 'function') {
                query.is('deleted_at', null);
            }
            if (query && typeof query.then === 'function') {
                const originalThen = query.then.bind(query);
                query.then = (onFulfilled, onRejected) => originalThen(
                    (res) => {
                        if (res?.data && Array.isArray(res.data)) {
                            setExpenseCache(res.data);
                        }
                        return onFulfilled ? onFulfilled(res) : res;
                    },
                    onRejected
                );
            }
            return query;
        };
        return builder;
    };
}

function normalizeAgroEvidencePath(path) {
    if (typeof path !== 'string' || !path) return path;
    const legacyExpenseRoot = `${AGRO_EXPENSE_STORAGE_ROOT}s`;
    if (path.includes(`/${AGRO_INCOME_STORAGE_ROOT}/`)
        || path.includes(`/${AGRO_EXPENSE_STORAGE_ROOT}/`)
        || path.includes(`/${legacyExpenseRoot}/`)) {
        return path;
    }
    const parts = path.split('/');
    if (parts.length < 2) return path;
    const userId = parts.shift();
    const rest = parts.join('/');
    return `${userId}/${AGRO_EXPENSE_STORAGE_ROOT}/${rest}`;
}

function extractStoragePathFromUrl(rawUrl) {
    if (!rawUrl) return null;
    const value = String(rawUrl).trim();
    if (!value || value.startsWith('blob:') || value.startsWith('data:')) return null;

    const publicPrefix = `/storage/v1/object/public/${AGRO_STORAGE_BUCKET_ID}/`;
    const signedPrefix = `/storage/v1/object/sign/${AGRO_STORAGE_BUCKET_ID}/`;

    const publicIndex = value.indexOf(publicPrefix);
    if (publicIndex >= 0) {
        return decodeURIComponent(value.slice(publicIndex + publicPrefix.length).split('?')[0]);
    }

    const signedIndex = value.indexOf(signedPrefix);
    if (signedIndex >= 0) {
        return decodeURIComponent(value.slice(signedIndex + signedPrefix.length).split('?')[0]);
    }

    if (value.startsWith('http')) return null;
    return value.split('?')[0];
}

function patchAgroEvidenceStorage() {
    if (agroStoragePatched) return;
    agroStoragePatched = true;

    const originalFrom = supabase.storage.from.bind(supabase.storage);
    supabase.storage.from = (bucketId) => {
        const bucket = originalFrom(bucketId);
        if (bucketId !== AGRO_STORAGE_BUCKET_ID || !bucket) return bucket;
        if (bucket.__agroEvidencePatched) return bucket;
        bucket.__agroEvidencePatched = true;

        const originalUpload = bucket.upload?.bind(bucket);
        if (typeof originalUpload === 'function') {
            bucket.upload = (path, file, options) => {
                const normalizedPath = normalizeAgroEvidencePath(path);
                return originalUpload(normalizedPath, file, options);
            };
        }

        const originalGetPublicUrl = bucket.getPublicUrl?.bind(bucket);
        if (typeof originalGetPublicUrl === 'function') {
            bucket.getPublicUrl = (path) => {
                const normalizedPath = normalizeAgroEvidencePath(path);
                return { data: { publicUrl: normalizedPath } };
            };
        }

        return bucket;
    };
}

async function detectExpenseDeletedAtSupport() {
    if (expenseDeletedAtSupported !== null) return expenseDeletedAtSupported;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        const { error } = await supabase
            .from('agro_expenses')
            .select('deleted_at')
            .limit(1);
        if (error && error.message && error.message.toLowerCase().includes('deleted_at')) {
            expenseDeletedAtSupported = false;
        } else if (!error) {
            expenseDeletedAtSupported = true;
        } else {
            expenseDeletedAtSupported = false;
        }
    } catch (err) {
        expenseDeletedAtSupported = false;
    }

    if (expenseDeletedAtSupported && !expenseDeletedAtRefreshDone) {
        expenseDeletedAtRefreshDone = true;
        document.dispatchEvent(new CustomEvent('data-refresh'));
    }

    return expenseDeletedAtSupported;
}

async function getExpenseSignedUrl(path) {
    if (!path) return null;
    if (expenseSignedUrlCache.has(path)) return expenseSignedUrlCache.get(path);

    const { data, error } = await supabase.storage
        .from(AGRO_STORAGE_BUCKET_ID)
        .createSignedUrl(path, 3600);

    if (error) {
        console.warn('[Agro] Expense signed URL error:', error.message);
        return null;
    }

    const signedUrl = data?.signedUrl || null;
    if (signedUrl) expenseSignedUrlCache.set(path, signedUrl);
    return signedUrl;
}

async function updateExpenseEvidenceLinks(item) {
    if (!item) return;
    const link = item.querySelector('a[href]');
    if (!link || link.dataset.signed === 'true') return;

    const rawHref = link.getAttribute('href');
    const storagePath = extractStoragePathFromUrl(rawHref);
    if (!storagePath) return;

    const normalizedPath = normalizeAgroEvidencePath(storagePath);
    let signedUrl = await getExpenseSignedUrl(normalizedPath);
    let resolvedPath = normalizedPath;
    if (!signedUrl && normalizedPath !== storagePath) {
        signedUrl = await getExpenseSignedUrl(storagePath);
        resolvedPath = storagePath;
    }
    if (!signedUrl) return;

    link.href = signedUrl;
    link.rel = 'noopener noreferrer';
    link.dataset.signed = 'true';
    link.dataset.storagePath = resolvedPath;
}

function scheduleExpenseSync() {
    if (expenseSyncTimer) clearTimeout(expenseSyncTimer);
    expenseSyncTimer = setTimeout(() => {
        syncExpenseDeleteButtons().catch((err) => console.warn('[Agro] Expense sync error:', err));
    }, 120);
}

async function syncExpenseDeleteButtons() {
    if (expenseSyncInFlight) return;
    expenseSyncInFlight = true;

    try {
        const expensesList = document.getElementById('expenses-list');
        if (!expensesList) return;

        const items = Array.from(expensesList.querySelectorAll('.expense-item'));
        if (items.length === 0) return;

        items.forEach((item, index) => {
            const expense = expenseCache[index];
            const expenseId = expense?.id;
            if (expenseId) {
                item.dataset.expenseId = String(expenseId);
            }
            attachExpenseDeleteButton(item, expenseId);
            void updateExpenseEvidenceLinks(item);
        });
    } finally {
        expenseSyncInFlight = false;
    }
}

function attachExpenseDeleteButton(item, expenseId) {
    if (!item) return;

    const existingBtn = item.querySelector('.expense-delete-btn');
    if (existingBtn) {
        if (expenseId && !existingBtn.dataset.id) {
            existingBtn.dataset.id = String(expenseId);
        }
        return;
    }

    if (!expenseId) return;

    let amountEl = item.lastElementChild;
    if (!amountEl) return;

    let actions = amountEl.parentElement;
    if (!actions || !actions.classList.contains('expense-actions')) {
        actions = document.createElement('div');
        actions.className = 'expense-actions';
        actions.style.cssText = 'display: flex; align-items: center; gap: 0.6rem;';
        amountEl.replaceWith(actions);
        actions.appendChild(amountEl);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'expense-delete-btn';
    deleteBtn.title = 'Eliminar';
    deleteBtn.dataset.id = String(expenseId);
    deleteBtn.style.cssText = 'background: transparent; border: 1px solid rgba(239, 68, 68, 0.35); color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;';

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-trash';
    icon.style.fontSize = '0.85rem';
    deleteBtn.appendChild(icon);

    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = 'rgba(239, 68, 68, 0.15)';
        deleteBtn.style.borderColor = '#ef4444';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.borderColor = 'rgba(239, 68, 68, 0.35)';
    });
    deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!window.confirm('\u00bfEliminar?')) return;
        const targetId = deleteBtn.dataset.id || item.dataset.expenseId;
        if (!targetId) {
            alert('No se pudo identificar el gasto.');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesion para eliminar gastos.');
            return;
        }

        // Get expense data for cascade delete of evidence
        const expense = expenseCache.find(e => e && String(e.id) === targetId);
        const evidencePath = expense?.evidence_url || null;

        // Try soft delete first
        let deleteSuccess = false;
        const { error: softError } = await supabase
            .from('agro_expenses')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', targetId)
            .eq('user_id', user.id);

        if (!softError) {
            deleteSuccess = true;
        } else if (softError.message && softError.message.toLowerCase().includes('deleted_at')) {
            // Fallback to hard delete if soft delete not supported
            console.warn('[Agro] Soft delete not available, falling back to hard delete');
            const { error: hardError } = await supabase
                .from('agro_expenses')
                .delete()
                .eq('id', targetId)
                .eq('user_id', user.id);

            if (!hardError) {
                deleteSuccess = true;
            } else {
                showEvidenceToast('Error al eliminar gasto.', 'warning');
                console.error('[Agro] Hard delete failed:', hardError.message);
            }
        } else {
            showEvidenceToast('Error al eliminar gasto.', 'warning');
            console.error('[Agro] Delete failed:', softError.message);
        }

        // Cascade delete evidence from Storage (best-effort)
        if (deleteSuccess && evidencePath) {
            await deleteEvidenceFile(evidencePath);
        }

        if (deleteSuccess) {
            document.dispatchEvent(new CustomEvent('data-refresh'));
        }
    });

    actions.appendChild(deleteBtn);
}

function setupExpenseDeleteButtons() {
    const expensesList = document.getElementById('expenses-list');
    if (!expensesList) return;

    patchAgroEvidenceStorage();
    patchExpenseSelect();
    void detectExpenseDeletedAtSupport();

    const observer = new MutationObserver(() => scheduleExpenseSync());
    observer.observe(expensesList, { childList: true });

    document.addEventListener('data-refresh', scheduleExpenseSync);
    scheduleExpenseSync();
}

const AGRO_STORAGE_BUCKET_ID = 'agro-evidence';
const AGRO_INCOME_STORAGE_ROOT = 'agro/income';
const AGRO_EXPENSE_STORAGE_ROOT = 'agro/expense';
const AGRO_PENDING_STORAGE_ROOT = 'agro/pending';
const AGRO_LOSS_STORAGE_ROOT = 'agro/loss';
const AGRO_TRANSFER_STORAGE_ROOT = 'agro/transfer';
const AGRO_GAINS_STORAGE_ROOT = null;
const INCOME_SECTION_ID = 'agro-income-section';
const FIN_TAB_STORAGE_KEY = 'YG_AGRO_FIN_TAB_V1';
const FIN_TAB_NAMES = new Set(['gastos', 'ingresos', 'pendientes', 'perdidas', 'transferencias']);

// SECURITY: Strict allowlist - NO doc/docx/txt
const ALLOWED_EVIDENCE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
const ALLOWED_EVIDENCE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const EVIDENCE_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Legacy aliases (kept for backward compatibility in existing code)
const INCOME_DOC_EXTENSIONS = ['pdf']; // REMOVED: doc, docx, txt
const INCOME_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const INCOME_MAX_FILE_SIZE = EVIDENCE_MAX_FILE_SIZE;

let incomeCache = [];
let incomeModuleInitialized = false;
let incomeDeletedAtSupported = null;
let incomeEditId = null;
let incomeEditSupportPath = null;

// Patch early to catch initial expense load and storage paths.
patchAgroEvidenceStorage();
patchExpenseSelect();
void detectExpenseDeletedAtSupport();

/**
 * SECURITY: Validate evidence file with magic bytes anti-spoof check
 * @param {File} file - File to validate
 * @returns {Promise<{valid: boolean, error?: string, file?: File}>}
 */
async function validateEvidenceFile(file) {
    if (!file) return { valid: true, file: null };

    // 1. Size check
    if (file.size > EVIDENCE_MAX_FILE_SIZE) {
        return { valid: false, error: 'Archivo muy grande. Maximo 5MB.' };
    }

    // 2. Extension check
    const ext = getFileExtension(file.name);
    if (!ALLOWED_EVIDENCE_EXTENSIONS.includes(ext)) {
        return { valid: false, error: 'Tipo no permitido. Solo JPG, PNG, WebP o PDF.' };
    }

    // 3. MIME check (browser-reported, can be spoofed)
    if (!ALLOWED_EVIDENCE_MIMES.includes(file.type)) {
        return { valid: false, error: 'Tipo no permitido. Solo JPG, PNG, WebP o PDF.' };
    }

    // 4. Magic bytes check (anti-spoof)
    try {
        const magicValid = await checkMagicBytes(file);
        if (!magicValid) {
            console.warn('[Agro] Magic bytes mismatch for:', file.name);
            return { valid: false, error: 'Archivo no valido. Contenido no coincide con extension.' };
        }
    } catch (err) {
        console.warn('[Agro] Magic bytes check failed:', err.message);
        // Fail closed: if we can't verify, reject
        return { valid: false, error: 'No se pudo verificar el archivo.' };
    }

    return { valid: true, file };
}

/**
 * SECURITY: Check file magic bytes to prevent spoofed extensions
 * @param {File} file - File to check
 * @returns {Promise<boolean>} - true if magic bytes match expected type
 */
async function checkMagicBytes(file) {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const ext = getFileExtension(file.name);

    // PDF: starts with %PDF (25 50 44 46)
    if (ext === 'pdf') {
        return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (ext === 'png') {
        return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
            bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A;
    }

    // JPEG: FF D8 FF
    if (ext === 'jpg' || ext === 'jpeg') {
        return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    }

    // WebP: RIFF (52 49 46 46) + WEBP at pos 8-11 (57 45 42 50)
    if (ext === 'webp') {
        return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
            bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    }

    return false;
}

/**
 * Build storage path for new movement types
 */
function buildPendingStoragePath(userId, fileName) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${userId}/${AGRO_PENDING_STORAGE_ROOT}/${Date.now()}_${cleanName}`;
}

function buildLossStoragePath(userId, fileName) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${userId}/${AGRO_LOSS_STORAGE_ROOT}/${Date.now()}_${cleanName}`;
}

function buildTransferStoragePath(userId, fileName) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${userId}/${AGRO_TRANSFER_STORAGE_ROOT}/${Date.now()}_${cleanName}`;
}

/**
 * Delete evidence file from Storage (cascade delete helper)
 */
async function deleteEvidenceFile(path) {
    if (!path) return;
    try {
        const { error } = await supabase.storage
            .from(AGRO_STORAGE_BUCKET_ID)
            .remove([path]);
        if (error) {
            console.warn('[Agro] Failed to delete evidence:', error.message);
        } else {
            console.log('[Agro] Evidence deleted:', path);
        }
    } catch (err) {
        console.warn('[Agro] Evidence delete error:', err.message);
    }
}

/**
 * Upload evidence file with proper contentType
 * @param {File} file - Validated file to upload
 * @param {string} storagePath - Full path in bucket (uid/agro/type/filename)
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
async function uploadEvidence(file, storagePath) {
    if (!file || !storagePath) {
        return { success: false, error: 'Archivo o ruta no validos' };
    }

    try {
        const { error } = await supabase.storage
            .from(AGRO_STORAGE_BUCKET_ID)
            .upload(storagePath, file, {
                contentType: file.type, // Set correct MIME for preview/download
                upsert: false
            });

        if (error) {
            console.warn('[Agro] Upload error:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true, path: storagePath };
    } catch (err) {
        console.warn('[Agro] Upload exception:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Get signed URL for private evidence viewing (1 hour validity)
 * @param {string} path - Storage path
 * @returns {Promise<string|null>} Signed URL or null
 */
async function getSignedEvidenceUrl(path) {
    if (!path) return null;

    try {
        const { data, error } = await supabase.storage
            .from(AGRO_STORAGE_BUCKET_ID)
            .createSignedUrl(path, 3600); // 1 hour

        if (error) {
            console.warn('[Agro] Signed URL error:', error.message);
            return null;
        }

        return data?.signedUrl || null;
    } catch (err) {
        console.warn('[Agro] Signed URL exception:', err.message);
        return null;
    }
}

/**
 * Show toast notification (Visual DNA compliant - no red for errors)
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'warning', 'info'
 */
function showEvidenceToast(message, type = 'info') {
    // Try to use existing toast system if available
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }

    // Fallback: create simple toast
    const toast = document.createElement('div');
    toast.className = 'agro-evidence-toast';
    toast.textContent = message;

    const colors = {
        success: { bg: 'rgba(74, 222, 128, 0.15)', border: 'rgba(74, 222, 128, 0.4)', color: '#4ade80' },
        warning: { bg: 'rgba(200, 167, 82, 0.15)', border: 'rgba(200, 167, 82, 0.4)', color: '#C8A752' },
        info: { bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)', color: '#fff' }
    };
    const c = colors[type] || colors.info;

    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${c.bg};
        border: 1px solid ${c.border};
        color: ${c.color};
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        backdrop-filter: blur(10px);
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Generic dropzone file handler for new tabs
 */
async function handleGenericFileUpload(inputId, dropzoneId) {
    const input = document.getElementById(inputId);
    const dropzone = document.getElementById(dropzoneId);
    if (!input || !dropzone) return;

    const file = input.files?.[0];
    if (!file) return;

    const validation = await validateEvidenceFile(file);
    if (!validation.valid) {
        showEvidenceToast(validation.error, 'warning');
        input.value = '';
        resetGenericDropzone(dropzoneId);
        return;
    }

    // Show file selected state
    dropzone.innerHTML = '';
    const container = document.createElement('div');
    container.style.pointerEvents = 'none';

    const icon = document.createElement('i');
    const ext = getFileExtension(file.name);
    icon.className = ext === 'pdf' ? 'fa-solid fa-file-pdf' : 'fa-solid fa-image';
    icon.style.cssText = 'font-size: 2.5rem; color: #4ade80; margin-bottom: 0.5rem;';

    const title = document.createElement('h4');
    title.style.cssText = 'color: #fff; margin: 0.5rem 0;';
    title.textContent = 'Archivo Seleccionado';

    const pill = document.createElement('div');
    pill.style.cssText = 'background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); padding: 0.5rem 1rem; border-radius: 50px; display: inline-flex; align-items: center; gap: 0.5rem;';

    const fileName = document.createElement('span');
    fileName.style.cssText = 'color: #4ade80; font-weight: 600; font-size: 0.9rem;';
    // Sanitize filename display (no raw HTML injection)
    fileName.textContent = file.name.length > 30 ? file.name.slice(0, 27) + '...' : file.name;

    const check = document.createElement('i');
    check.className = 'fa-solid fa-check-circle';
    check.style.color = '#4ade80';

    pill.append(fileName, check);

    const hint = document.createElement('p');
    hint.style.cssText = 'color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.5rem;';
    hint.textContent = 'Clic para cambiar archivo';

    container.append(icon, title, pill, hint);
    dropzone.appendChild(container);
    dropzone.style.borderColor = '#4ade80';
    dropzone.style.background = 'rgba(74, 222, 128, 0.05)';
}

/**
 * Reset a generic dropzone to default state
 */
function resetGenericDropzone(dropzoneId) {
    const dropzone = document.getElementById(dropzoneId);
    if (!dropzone) return;

    dropzone.innerHTML = '';

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-cloud-arrow-up';
    icon.style.cssText = 'font-size: 2.5rem; color: var(--gold-primary, #C8A752); margin-bottom: 1rem; opacity: 0.7;';

    const text = document.createElement('p');
    text.style.cssText = 'color: var(--text-secondary); font-size: 0.95rem; margin: 0;';
    const highlight = document.createElement('span');
    highlight.style.cssText = 'color: var(--gold-primary, #C8A752); font-weight: 600;';
    highlight.textContent = 'haz clic para subir';
    text.append('Arrastra tu comprobante aqui o ', highlight);

    const hint = document.createElement('p');
    hint.style.cssText = 'color: var(--text-muted); font-size: 0.8rem; margin-top: 0.5rem;';
    hint.textContent = 'JPG, PNG, WebP o PDF (Max. 5MB)';

    dropzone.append(icon, text, hint);
    dropzone.style.borderColor = 'rgba(200, 167, 82, 0.3)';
    dropzone.style.background = 'rgba(200, 167, 82, 0.03)';
}

/**
 * Initialize dropzone handlers for new tabs (Pendientes/Perdidas/Transferencias)
 */
function initNewTabDropzones() {
    const tabs = [
        { input: 'pending-receipt', dropzone: 'pending-dropzone' },
        { input: 'loss-receipt', dropzone: 'loss-dropzone' },
        { input: 'transfer-receipt', dropzone: 'transfer-dropzone' }
    ];

    tabs.forEach(({ input, dropzone }) => {
        const inputEl = document.getElementById(input);
        const dropzoneEl = document.getElementById(dropzone);

        if (inputEl && dropzoneEl) {
            inputEl.addEventListener('change', () => handleGenericFileUpload(input, dropzone));

            // Drag and drop support
            dropzoneEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzoneEl.style.borderColor = '#C8A752';
                dropzoneEl.style.background = 'rgba(200, 167, 82, 0.1)';
            });
            dropzoneEl.addEventListener('dragleave', () => {
                dropzoneEl.style.borderColor = 'rgba(200, 167, 82, 0.3)';
                dropzoneEl.style.background = 'rgba(200, 167, 82, 0.03)';
            });
            dropzoneEl.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropzoneEl.style.borderColor = 'rgba(200, 167, 82, 0.3)';
                dropzoneEl.style.background = 'rgba(200, 167, 82, 0.03)';

                const file = e.dataTransfer?.files?.[0];
                if (file) {
                    // Create DataTransfer to set files properly
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    inputEl.files = dt.files;
                    await handleGenericFileUpload(input, dropzone);
                }
            });
        }
    });
}

// Initialize new tab dropzones when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewTabDropzones);
} else {
    initNewTabDropzones();
}

// Expose validation functions globally for use by inline handlers (e.g. Gastos)
window.validateEvidenceFile = validateEvidenceFile;
window.showEvidenceToast = showEvidenceToast;
window.getFileExtension = getFileExtension;
window.resetGenericDropzone = resetGenericDropzone;

function formatShortCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '$0';
    if (Math.abs(number) >= 1000) {
        return `$${(number / 1000).toFixed(1)}k`;
    }
    return `$${number.toFixed(0)}`;
}

function buildIncomeStoragePrefix(userId, incomeId) {
    return `${userId}/${AGRO_INCOME_STORAGE_ROOT}/${incomeId}/`;
}

function buildIncomeStoragePath(userId, incomeId, fileName) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${buildIncomeStoragePrefix(userId, incomeId)}${Date.now()}_${cleanName}`;
}

function buildExpenseStoragePrefix(userId) {
    return `${userId}/${AGRO_EXPENSE_STORAGE_ROOT}/`;
}

function buildExpenseStoragePath(userId, fileName) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${buildExpenseStoragePrefix(userId)}${Date.now()}_${cleanName}`;
}

function getFileExtension(fileName) {
    if (!fileName) return '';
    const clean = String(fileName).split('?')[0].split('#')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function isIncomeDocExtension(ext) {
    return INCOME_DOC_EXTENSIONS.includes(ext);
}

function isIncomeImageExtension(ext) {
    return INCOME_IMAGE_EXTENSIONS.includes(ext);
}

function ensureIncomeSection(targetContainer) {
    const existing = document.getElementById(INCOME_SECTION_ID);
    if (existing) {
        if (targetContainer && existing.parentElement !== targetContainer) {
            targetContainer.appendChild(existing);
        }
        return existing;
    }
    if (!targetContainer) return null;

    const wrapper = document.createElement('div');
    wrapper.id = INCOME_SECTION_ID;
    const existingForm = document.getElementById('income-form');
    const existingNote = document.querySelector('[data-income-note="true"]');
    const existingListContainer = document.getElementById('income-recent-container');

    let form = existingForm;
    let note = existingNote;
    let listContainer = existingListContainer;

    if (!form) {
        form = document.createElement('form');
        form.id = 'income-form';
        form.className = 'income-form';

        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;';

        const conceptGroup = document.createElement('div');
        conceptGroup.className = 'input-group';
        const conceptLabel = document.createElement('label');
        conceptLabel.className = 'input-label';
        conceptLabel.setAttribute('for', 'income-concept');
        conceptLabel.textContent = 'Concepto *';
        const conceptInput = document.createElement('input');
        conceptInput.type = 'text';
        conceptInput.id = 'income-concept';
        conceptInput.className = 'styled-input';
        conceptInput.required = true;
        conceptInput.placeholder = 'Ej: Venta de tomate';
        conceptInput.style.paddingLeft = '1rem';
        conceptGroup.append(conceptLabel, conceptInput);

        const amountGroup = document.createElement('div');
        amountGroup.className = 'input-group';
        const amountLabel = document.createElement('label');
        amountLabel.className = 'input-label';
        amountLabel.setAttribute('for', 'income-amount');
        amountLabel.textContent = 'Monto *';
        const amountWrapper = document.createElement('div');
        amountWrapper.className = 'input-wrapper';
        const amountPrefix = document.createElement('span');
        amountPrefix.className = 'input-prefix';
        amountPrefix.textContent = '$';
        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.id = 'income-amount';
        amountInput.className = 'styled-input';
        amountInput.required = true;
        amountInput.placeholder = '0.00';
        amountInput.step = '0.01';
        amountInput.min = '0';
        amountWrapper.append(amountPrefix, amountInput);
        amountGroup.append(amountLabel, amountWrapper);

        const dateGroup = document.createElement('div');
        dateGroup.className = 'input-group';
        const dateLabel = document.createElement('label');
        dateLabel.className = 'input-label';
        dateLabel.setAttribute('for', 'income-date');
        dateLabel.textContent = 'Fecha *';
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.id = 'income-date';
        dateInput.className = 'styled-input';
        dateInput.required = true;
        dateInput.style.paddingLeft = '1rem';
        dateGroup.append(dateLabel, dateInput);

        const categoryGroup = document.createElement('div');
        categoryGroup.className = 'input-group';
        const categoryLabel = document.createElement('label');
        categoryLabel.className = 'input-label';
        categoryLabel.setAttribute('for', 'income-category');
        categoryLabel.textContent = 'Categoria *';
        const categorySelect = document.createElement('select');
        categorySelect.id = 'income-category';
        categorySelect.className = 'styled-input';
        categorySelect.required = true;
        categorySelect.style.paddingLeft = '1rem';
        categorySelect.style.cursor = 'pointer';
        const categoryOptions = [
            { value: '', label: 'Seleccionar...' },
            { value: 'ventas', label: 'Ventas' },
            { value: 'servicios', label: 'Servicios' },
            { value: 'subsidios', label: 'Subsidios' },
            { value: 'otros', label: 'Otros' }
        ];
        categoryOptions.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            categorySelect.appendChild(option);
        });
        categoryGroup.append(categoryLabel, categorySelect);

        grid.append(conceptGroup, amountGroup, dateGroup, categoryGroup);

        const fileGroup = document.createElement('div');
        fileGroup.className = 'input-group';
        fileGroup.style.marginTop = '1.5rem';
        const fileLabel = document.createElement('label');
        fileLabel.className = 'input-label';
        fileLabel.textContent = 'Evidencia (opcional)';

        const dropzone = document.createElement('div');
        dropzone.id = 'income-dropzone';
        dropzone.className = 'upload-dropzone';
        dropzone.style.cssText = 'border: 2px dashed rgba(200, 167, 82, 0.3); border-radius: var(--radius-md); padding: 2rem; text-align: center; cursor: pointer; transition: all 0.3s ease; background: rgba(200, 167, 82, 0.03);';

        const dropIcon = document.createElement('i');
        dropIcon.className = 'fa-solid fa-cloud-arrow-up';
        dropIcon.style.cssText = 'font-size: 2.5rem; color: var(--gold-primary, #C8A752); margin-bottom: 1rem; opacity: 0.7;';
        const dropText = document.createElement('p');
        dropText.style.cssText = 'color: var(--text-secondary); font-size: 0.95rem; margin: 0;';
        const dropSpan = document.createElement('span');
        dropSpan.style.cssText = 'color: var(--gold-primary, #C8A752); font-weight: 600;';
        dropSpan.textContent = 'haz clic para subir';
        dropText.append('Arrastra tu soporte aqui o ', dropSpan);

        const dropHint = document.createElement('p');
        dropHint.style.cssText = 'color: var(--text-muted); font-size: 0.8rem; margin-top: 0.5rem;';
        dropHint.textContent = 'JPG, PNG, WebP o PDF (Max. 5MB)';

        dropzone.append(dropIcon, dropText, dropHint);

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'income-receipt';
        fileInput.accept = 'image/jpeg,image/png,image/webp,application/pdf';
        fileInput.style.display = 'none';

        fileGroup.append(fileLabel, dropzone, fileInput);

        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-subtle);';

        const btnClean = document.createElement('button');
        btnClean.type = 'button';
        btnClean.id = 'income-clean-btn';
        btnClean.className = 'btn';
        btnClean.textContent = 'Limpiar';
        btnClean.style.cssText = 'background: transparent; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); padding: 12px 24px; border-radius: var(--radius-pill); cursor: pointer; transition: all 0.3s;';
        btnClean.addEventListener('mouseenter', () => {
            btnClean.style.borderColor = 'rgba(255,255,255,0.4)';
            btnClean.style.color = '#fff';
        });
        btnClean.addEventListener('mouseleave', () => {
            btnClean.style.borderColor = 'rgba(255,255,255,0.2)';
            btnClean.style.color = 'rgba(255,255,255,0.7)';
        });

        const btnSave = document.createElement('button');
        btnSave.type = 'submit';
        btnSave.id = 'income-save-btn';
        btnSave.className = 'btn btn-primary';
        btnSave.textContent = 'Registrar Ingreso';
        btnSave.style.cssText = 'background: linear-gradient(135deg, var(--gold-primary, #C8A752), var(--gold-dark, #9a7f3c)); color: #000; padding: 12px 32px; border: none; border-radius: var(--radius-pill); cursor: pointer; font-weight: 700; transition: all 0.3s;';
        btnSave.addEventListener('mouseenter', () => {
            btnSave.style.boxShadow = '0 0 25px rgba(200, 167, 82, 0.5)';
            btnSave.style.transform = 'translateY(-2px)';
        });
        btnSave.addEventListener('mouseleave', () => {
            btnSave.style.boxShadow = 'none';
            btnSave.style.transform = 'translateY(0)';
        });

        actions.append(btnClean, btnSave);

        form.append(grid, fileGroup, actions);
    }

    if (!note) {
        note = document.createElement('div');
        note.style.cssText = 'margin-top: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-sm);';
        note.dataset.incomeNote = 'true';
        const noteText = document.createElement('p');
        noteText.style.cssText = 'color: #60a5fa; font-size: 0.8rem; margin: 0; display: flex; align-items: center; gap: 0.5rem;';
        const noteIcon = document.createElement('i');
        noteIcon.className = 'fa-solid fa-cloud-check';
        const noteSpan = document.createElement('span');
        noteSpan.textContent = 'Ingresos sincronizados en YavlGold Cloud en tiempo real.';
        noteText.append(noteIcon, noteSpan);
        note.appendChild(noteText);
    }

    if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.id = 'income-recent-container';
        listContainer.style.cssText = 'margin-top: 2rem; display: none;';
        const listTitle = document.createElement('h3');
        listTitle.style.cssText = 'color: #fff; font-size: 1.1rem; margin-bottom: 1rem; border-left: 3px solid var(--gold-primary); padding-left: 0.8rem;';
        listTitle.textContent = 'Ultimos Ingresos (Sesion Actual)';
        const list = document.createElement('div');
        list.id = 'income-list';
        list.style.cssText = 'display: flex; flex-direction: column; gap: 0.8rem;';
        listContainer.append(listTitle, list);
    }

    if (form) wrapper.appendChild(form);
    if (note) wrapper.appendChild(note);
    if (listContainer) wrapper.appendChild(listContainer);

    targetContainer.appendChild(wrapper);

    return wrapper;
}

function resetIncomeDropzone(dropzone) {
    if (!dropzone) return;
    dropzone.textContent = '';

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-cloud-arrow-up';
    icon.style.cssText = 'font-size: 2.5rem; color: var(--gold-primary, #C8A752); margin-bottom: 1rem; opacity: 0.7;';

    const text = document.createElement('p');
    text.style.cssText = 'color: var(--text-secondary); font-size: 0.95rem; margin: 0;';
    const highlight = document.createElement('span');
    highlight.style.cssText = 'color: var(--gold-primary, #C8A752); font-weight: 600;';
    highlight.textContent = 'haz clic para subir';
    text.append('Arrastra tu evidencia aqui o ', highlight);

    const hint = document.createElement('p');
    hint.style.cssText = 'color: var(--text-muted); font-size: 0.8rem; margin-top: 0.5rem;';
    hint.textContent = 'JPG, PNG, WebP o PDF (Max. 5MB)';

    dropzone.append(icon, text, hint);
    dropzone.style.borderColor = 'rgba(200, 167, 82, 0.3)';
    dropzone.style.background = 'rgba(200, 167, 82, 0.03)';
}

async function handleIncomeFileUpload(input, dropzone) {
    if (!input || !dropzone) return;
    const file = input.files?.[0];
    if (!file) return;

    // Use hardened validation with magic bytes
    const validation = await validateEvidenceFile(file);
    if (!validation.valid) {
        // Show neutral message (no red per Visual DNA)
        showEvidenceToast(validation.error, 'warning');
        input.value = '';
        resetIncomeDropzone(dropzone);
        return;
    }

    const ext = getFileExtension(file.name);
    const isDoc = isIncomeDocExtension(ext);
    const isImage = isIncomeImageExtension(ext) || file.type.startsWith('image/');

    if (!isDoc && !isImage) {
        alert('Tipo de archivo no permitido.');
        input.value = '';
        resetIncomeDropzone(dropzone);
        return;
    }

    dropzone.textContent = '';
    const container = document.createElement('div');
    container.style.pointerEvents = 'none';

    const icon = document.createElement('i');
    icon.className = isDoc ? 'fa-solid fa-file-lines' : 'fa-solid fa-image';
    icon.style.cssText = 'font-size: 2.5rem; color: #4ade80; margin-bottom: 0.5rem;';

    const title = document.createElement('h4');
    title.style.cssText = 'color: #fff; margin: 0.5rem 0;';
    title.textContent = 'Archivo Seleccionado';

    const pill = document.createElement('div');
    pill.style.cssText = 'background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); padding: 0.5rem 1rem; border-radius: 50px; display: inline-flex; align-items: center; gap: 0.5rem;';

    const fileName = document.createElement('span');
    fileName.style.cssText = 'color: #4ade80; font-weight: 600; font-size: 0.9rem;';
    fileName.textContent = file.name;

    const check = document.createElement('i');
    check.className = 'fa-solid fa-check-circle';
    check.style.cssText = 'color: #4ade80;';

    pill.append(fileName, check);

    const hint = document.createElement('p');
    hint.style.cssText = 'color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.5rem;';
    hint.textContent = 'Clic para cambiar archivo';

    container.append(icon, title, pill, hint);
    dropzone.appendChild(container);
    dropzone.style.borderColor = '#4ade80';
    dropzone.style.background = 'rgba(74, 222, 128, 0.05)';
}

function clearIncomeForm() {
    const conceptInput = document.getElementById('income-concept');
    const amountInput = document.getElementById('income-amount');
    const dateInput = document.getElementById('income-date');
    const categoryInput = document.getElementById('income-category');
    const fileInput = document.getElementById('income-receipt');
    const dropzone = document.getElementById('income-dropzone');
    const btnSave = document.getElementById('income-save-btn');

    if (conceptInput) conceptInput.value = '';
    if (amountInput) amountInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if (categoryInput) categoryInput.selectedIndex = 0;
    if (fileInput) fileInput.value = '';
    resetIncomeDropzone(dropzone);

    incomeEditId = null;
    incomeEditSupportPath = null;
    if (btnSave) btnSave.textContent = 'Registrar Ingreso';
}

function enterIncomeEditMode(income) {
    if (!income) return;
    const conceptInput = document.getElementById('income-concept');
    const amountInput = document.getElementById('income-amount');
    const dateInput = document.getElementById('income-date');
    const categoryInput = document.getElementById('income-category');
    const btnSave = document.getElementById('income-save-btn');

    incomeEditId = income.id || null;
    incomeEditSupportPath = income.soporte_url || null;

    if (conceptInput) conceptInput.value = income.concepto || '';
    if (amountInput) amountInput.value = income.monto ?? '';
    if (dateInput) dateInput.value = income.fecha || new Date().toISOString().split('T')[0];
    if (categoryInput) categoryInput.value = income.categoria || '';
    if (btnSave) btnSave.textContent = 'Actualizar Ingreso';
}

async function resolveIncomeSupportUrl(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const { data, error } = await supabase.storage
        .from(AGRO_STORAGE_BUCKET_ID)
        .createSignedUrl(path, 3600);
    if (error) {
        console.warn('[Agro] Income signed URL error:', error.message);
        return null;
    }
    return data?.signedUrl || null;
}

async function buildIncomeSignedUrlMap(incomes) {
    const map = new Map();
    const rows = Array.isArray(incomes) ? incomes : [];
    await Promise.all(rows.map(async (row) => {
        if (!row?.soporte_url) return;
        const url = await resolveIncomeSupportUrl(row.soporte_url);
        if (url) map.set(row.id, url);
    }));
    return map;
}

function renderIncomeItem(listEl, income, signedUrl) {
    if (!listEl || !income) return;

    const item = document.createElement('div');
    item.className = 'income-item animate-in';
    item.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;';
    item.dataset.incomeId = income.id ? String(income.id) : '';

    const left = document.createElement('div');
    left.style.cssText = 'display: flex; align-items: center; gap: 1rem;';

    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; background: rgba(74, 222, 128, 0.12); display: flex; align-items: center; justify-content: center; color: #4ade80;';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-circle-dollar-to-slot';
    iconWrap.appendChild(icon);

    const details = document.createElement('div');

    const concept = document.createElement('div');
    concept.style.cssText = 'color: #fff; font-weight: 600; font-size: 0.95rem;';
    concept.textContent = income.concepto || 'Ingreso';

    const meta = document.createElement('div');
    meta.style.cssText = 'color: rgba(255,255,255,0.5); font-size: 0.8rem; display: flex; flex-wrap: wrap; gap: 0.5rem;';
    const category = document.createElement('span');
    category.textContent = String(income.categoria || 'otros').replace(/-/g, ' ').toUpperCase();
    const dateStr = document.createElement('span');
    dateStr.textContent = formatDate(income.fecha);
    meta.append(category, dateStr);

    if (signedUrl) {
        const supportWrap = document.createElement('span');
        supportWrap.style.display = 'inline-flex';
        supportWrap.style.alignItems = 'center';
        supportWrap.style.gap = '4px';

        const ext = getFileExtension(income.soporte_url || '');
        const isDoc = isIncomeDocExtension(ext);
        const supportIcon = document.createElement('i');
        supportIcon.className = isDoc ? 'fa-solid fa-file-lines' : 'fa-solid fa-paperclip';
        supportIcon.style.color = isDoc ? '#60a5fa' : '#C8A752';

        const link = document.createElement('a');
        link.href = signedUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.cssText = 'color: var(--gold-primary, #C8A752); text-decoration: none; font-weight: 600;';
        link.textContent = isDoc ? 'Descargar soporte' : 'Ver soporte';

        supportWrap.append(supportIcon, link);

        if (!isDoc && isIncomeImageExtension(ext)) {
            const img = document.createElement('img');
            img.src = signedUrl;
            img.alt = 'Soporte';
            img.style.cssText = 'width: 36px; height: 36px; border-radius: 6px; object-fit: cover; margin-left: 6px; border: 1px solid rgba(255,255,255,0.1);';
            supportWrap.appendChild(img);
        }

        meta.appendChild(supportWrap);
    }

    details.append(concept, meta);
    left.append(iconWrap, details);

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; align-items: center; gap: 0.6rem;';

    const amount = document.createElement('div');
    amount.style.cssText = 'color: #4ade80; font-weight: 700; font-size: 1rem;';
    amount.textContent = formatCurrency(income.monto);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'income-edit-btn';
    editBtn.title = 'Editar';
    editBtn.style.cssText = 'background: transparent; border: 1px solid rgba(96, 165, 250, 0.35); color: #60a5fa; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;';

    const editIcon = document.createElement('i');
    editIcon.className = 'fa-solid fa-pen';
    editIcon.style.fontSize = '0.8rem';
    editBtn.appendChild(editIcon);

    editBtn.addEventListener('mouseenter', () => {
        editBtn.style.background = 'rgba(96, 165, 250, 0.15)';
        editBtn.style.borderColor = '#60a5fa';
    });
    editBtn.addEventListener('mouseleave', () => {
        editBtn.style.background = 'transparent';
        editBtn.style.borderColor = 'rgba(96, 165, 250, 0.35)';
    });
    editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        enterIncomeEditMode(income);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'income-delete-btn';
    deleteBtn.title = 'Eliminar';
    deleteBtn.dataset.id = income.id ? String(income.id) : '';
    deleteBtn.style.cssText = 'background: transparent; border: 1px solid rgba(239, 68, 68, 0.35); color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;';

    const deleteIcon = document.createElement('i');
    deleteIcon.className = 'fa-solid fa-trash';
    deleteIcon.style.fontSize = '0.85rem';
    deleteBtn.appendChild(deleteIcon);

    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = 'rgba(239, 68, 68, 0.15)';
        deleteBtn.style.borderColor = '#ef4444';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.borderColor = 'rgba(239, 68, 68, 0.35)';
    });
    deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!window.confirm('\u00bfEliminar ingreso?')) return;
        const targetId = deleteBtn.dataset.id;
        if (!targetId) {
            alert('No se pudo identificar el ingreso.');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesion para eliminar ingresos.');
            return;
        }

        // Get income data for cascade delete of evidence
        const incomeData = incomeCache.find(i => i && String(i.id) === targetId);
        const evidencePath = incomeData?.soporte_url || null;

        // Try soft delete first
        let deleteSuccess = false;
        const { error: softError } = await supabase
            .from('agro_income')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', targetId)
            .eq('user_id', user.id);

        if (!softError) {
            deleteSuccess = true;
        } else if (softError.message && softError.message.toLowerCase().includes('deleted_at')) {
            // Fallback to hard delete if soft delete not supported
            console.warn('[Agro] Soft delete not available for income, falling back to hard delete');
            const { error: hardError } = await supabase
                .from('agro_income')
                .delete()
                .eq('id', targetId)
                .eq('user_id', user.id);

            if (!hardError) {
                deleteSuccess = true;
            } else {
                showEvidenceToast('Error al eliminar ingreso.', 'warning');
                console.error('[Agro] Income hard delete failed:', hardError.message);
            }
        } else {
            showEvidenceToast('Error al eliminar ingreso.', 'warning');
            console.error('[Agro] Income delete failed:', softError.message);
        }

        // Cascade delete evidence from Storage (best-effort)
        if (deleteSuccess && evidencePath) {
            await deleteEvidenceFile(evidencePath);
        }

        if (deleteSuccess) {
            document.dispatchEvent(new CustomEvent('agro:income:changed'));
        }
    });

    actions.append(amount, editBtn, deleteBtn);
    item.append(left, actions);
    listEl.appendChild(item);
}

async function loadIncomes() {
    const listEl = document.getElementById('income-list');
    const container = document.getElementById('income-recent-container');
    if (!listEl || !container) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
            .from('agro_income')
            .select('*')
            .eq('user_id', user.id)
            .order('fecha', { ascending: false });

        if (incomeDeletedAtSupported !== false) {
            query = query.is('deleted_at', null);
        }

        let { data, error } = await query;
        if (error && error.message && error.message.toLowerCase().includes('deleted_at')) {
            incomeDeletedAtSupported = false;
            const fallback = await supabase
                .from('agro_income')
                .select('*')
                .eq('user_id', user.id)
                .order('fecha', { ascending: false });
            data = fallback.data;
            error = fallback.error;
        } else if (!error) {
            incomeDeletedAtSupported = true;
        }

        if (error) throw error;

        incomeCache = Array.isArray(data) ? data : [];

        listEl.textContent = '';
        container.style.display = incomeCache.length ? 'block' : 'none';

        const signedUrlMap = await buildIncomeSignedUrlMap(incomeCache);
        incomeCache.forEach((income) => {
            const signedUrl = signedUrlMap.get(income.id);
            renderIncomeItem(listEl, income, signedUrl);
        });
    } catch (err) {
        console.error('[Agro] Error cargando ingresos:', err);
    }
}

async function saveIncome() {
    const conceptInput = document.getElementById('income-concept');
    const amountInput = document.getElementById('income-amount');
    const dateInput = document.getElementById('income-date');
    const categoryInput = document.getElementById('income-category');
    const fileInput = document.getElementById('income-receipt');
    const btnSave = document.getElementById('income-save-btn');

    const concept = conceptInput?.value?.trim() || '';
    const amount = amountInput?.value?.trim() || '';
    const category = categoryInput?.value || '';
    const dateVal = dateInput?.value || new Date().toISOString().split('T')[0];
    const file = fileInput?.files?.[0] || null;

    if (!concept || !amount || !category) {
        alert('Por favor completa Concepto, Monto y Categoria.');
        return;
    }

    const originalText = btnSave?.textContent || '';
    if (btnSave) {
        btnSave.textContent = 'Guardando...';
        btnSave.disabled = true;
        btnSave.style.opacity = '0.7';
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesion para guardar ingresos.');

        const isEditing = !!incomeEditId;
        const incomeId = isEditing
            ? incomeEditId
            : (crypto?.randomUUID ? crypto.randomUUID() : `inc_${Date.now()}_${Math.random().toString(16).slice(2)}`);
        let soportePath = null;

        if (file) {
            const ext = getFileExtension(file.name);
            const isDoc = isIncomeDocExtension(ext);
            const isImage = isIncomeImageExtension(ext) || file.type.startsWith('image/');
            if (!isDoc && !isImage) {
                throw new Error('Tipo de archivo no permitido.');
            }

            soportePath = buildIncomeStoragePath(user.id, incomeId, file.name);

            const { error: uploadError } = await supabase.storage
                .from(AGRO_STORAGE_BUCKET_ID)
                .upload(soportePath, file);

            if (uploadError) throw uploadError;
        }

        if (isEditing) {
            const payload = {
                concepto: concept,
                monto: parseFloat(amount),
                fecha: dateVal,
                categoria: category
            };
            if (soportePath) {
                payload.soporte_url = soportePath;
            }

            const { error: updateError } = await supabase
                .from('agro_income')
                .update(payload)
                .eq('id', incomeId)
                .eq('user_id', user.id);

            if (updateError) throw updateError;
            alert('Ingreso actualizado.');
        } else {
            const { error: insertError } = await supabase
                .from('agro_income')
                .insert({
                    id: incomeId,
                    user_id: user.id,
                    concepto: concept,
                    monto: parseFloat(amount),
                    fecha: dateVal,
                    categoria: category,
                    soporte_url: soportePath
                });

            if (insertError) throw insertError;
            alert('Ingreso guardado.');
        }

        clearIncomeForm();
        document.dispatchEvent(new CustomEvent('agro:income:changed'));
    } catch (err) {
        console.error('[Agro] Error guardando ingreso:', err);
        alert(`Error al guardar: ${err.message || err}`);
    } finally {
        if (btnSave) {
            btnSave.textContent = originalText || 'Registrar Ingreso';
            btnSave.disabled = false;
            btnSave.style.opacity = '1';
        }
    }
}

function initIncomeModule() {
    if (incomeModuleInitialized) return;

    const financesSection = document.querySelector('.finances-section');
    if (!financesSection) return;

    const incomePanel = document.getElementById('tab-panel-ingresos') || financesSection;
    const section = ensureIncomeSection(incomePanel);
    if (!section) return;

    incomeModuleInitialized = true;

    const form = document.getElementById('income-form');
    const dateInput = document.getElementById('income-date');
    const fileInput = document.getElementById('income-receipt');
    const dropzone = document.getElementById('income-dropzone');
    const btnClean = document.getElementById('income-clean-btn');

    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => handleIncomeFileUpload(fileInput, dropzone));
        resetIncomeDropzone(dropzone);
    }

    if (btnClean) {
        btnClean.addEventListener('click', (e) => {
            e.preventDefault();
            clearIncomeForm();
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveIncome();
        });
    }

    document.addEventListener('data-refresh', () => {
        loadIncomes();
        updateBalanceAndTopCategory();
    });
    document.addEventListener('agro:income:changed', () => {
        loadIncomes();
        updateBalanceAndTopCategory();
    });

    loadIncomes();
}

function readStoredTab() {
    try {
        const value = localStorage.getItem(FIN_TAB_STORAGE_KEY);
        return FIN_TAB_NAMES.has(value) ? value : null;
    } catch (e) {
        return null;
    }
}

function writeStoredTab(tabName) {
    try {
        localStorage.setItem(FIN_TAB_STORAGE_KEY, tabName);
    } catch (e) {
        // Ignore storage errors
    }
}

function isElementInView(el) {
    if (!el) return true;
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
}

function focusPanel(panel) {
    if (!panel) return;
    const focusable = panel.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
    const target = focusable || panel;

    if (target === panel && !panel.hasAttribute('tabindex')) {
        panel.setAttribute('tabindex', '-1');
    }

    try {
        target.focus({ preventScroll: true });
    } catch (e) {
        target.focus();
    }

    if (!isElementInView(target)) {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
}

function checkCriticalFormUniqueness() {
    const checks = ['expense-form', 'income-form'];
    checks.forEach((id) => {
        const count = document.querySelectorAll(`#${id}`).length;
        if (count !== 1) {
            console.warn(`[Agro] Duplicated form check: #${id} count=${count}`);
        }
    });
}

function syncFinanceAria(tabButtons, panels) {
    const tabList = document.querySelector('.financial-tabs');
    if (tabList) tabList.setAttribute('role', 'tablist');

    tabButtons.forEach((btn) => {
        const tabName = btn.dataset.tab;
        if (!tabName) return;
        const panelId = `tab-panel-${tabName}`;
        const panel = panels.find((item) => item.dataset.tab === tabName) || document.getElementById(panelId);

        if (!btn.id) {
            btn.id = `tab-${tabName}`;
        }
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-controls', panel?.id || panelId);

        if (panel) {
            if (!panel.id) panel.id = panelId;
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', btn.id);
        }
    });
}

function switchTab(tabName, options = {}) {
    const tabButtons = Array.from(document.querySelectorAll('.financial-tab-btn'));
    const panels = Array.from(document.querySelectorAll('.finances-section .tab-panel'));
    if (!tabName || tabButtons.length === 0 || panels.length === 0) return;

    if (!FIN_TAB_NAMES.has(tabName)) return;
    const hasPanel = panels.some((panel) => panel.dataset.tab === tabName);
    if (!hasPanel) return;

    const shouldFocus = options.focus !== false;

    tabButtons.forEach((btn) => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
        const isActive = panel.dataset.tab === tabName;
        panel.classList.toggle('is-hidden', !isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        if (isActive && shouldFocus) focusPanel(panel);
    });

    writeStoredTab(tabName);
}

function initFinanceTabs() {
    const tabButtons = Array.from(document.querySelectorAll('.financial-tab-btn'));
    const panels = Array.from(document.querySelectorAll('.finances-section .tab-panel'));
    if (tabButtons.length === 0 || panels.length === 0) return;

    syncFinanceAria(tabButtons, panels);

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            if (tabName) switchTab(tabName);
        });
    });

    const storedTab = readStoredTab();
    const initialTab = storedTab
        || tabButtons.find((btn) => btn.classList.contains('is-active'))?.dataset.tab
        || tabButtons[0].dataset.tab;
    if (initialTab) switchTab(initialTab, { focus: false });
}

function initFinanceFormHandlers() {
    const formConfigs = [
        {
            id: 'pending-form',
            table: 'agro_pending',
            label: 'Pendiente',
            fileInputId: 'pending-receipt',
            storagePath: 'pending',
            getFormData: (form) => ({
                concepto: form.querySelector('#input-concepto-pendiente')?.value?.trim(),
                monto: parseFloat(form.querySelector('#input-monto-pendiente')?.value) || 0,
                fecha: form.querySelector('#input-fecha-pendiente')?.value,
                cliente: form.querySelector('#input-cliente-pendiente')?.value?.trim() || null,
                notas: form.querySelector('#input-notas-pendiente')?.value?.trim() || null
            })
        },
        {
            id: 'loss-form',
            table: 'agro_losses',
            label: 'Pérdida',
            fileInputId: 'loss-receipt',
            storagePath: 'loss',
            getFormData: (form) => ({
                concepto: form.querySelector('#input-concepto-perdida')?.value?.trim(),
                monto: parseFloat(form.querySelector('#input-monto-perdida')?.value) || 0,
                fecha: form.querySelector('#input-fecha-perdida')?.value,
                causa: form.querySelector('#input-causa-perdida')?.value?.trim() || null,
                notas: form.querySelector('#input-notas-perdida')?.value?.trim() || null
            })
        },
        {
            id: 'transfer-form',
            table: 'agro_transfers',
            label: 'Transferencia',
            fileInputId: 'transfer-receipt',
            storagePath: 'transfer',
            getFormData: (form) => ({
                concepto: form.querySelector('#input-concepto-transferencia')?.value?.trim(),
                monto: parseFloat(form.querySelector('#input-monto-transferencia')?.value) || 0,
                fecha: form.querySelector('#input-fecha-transferencia')?.value,
                destino: form.querySelector('#input-destino-transferencia')?.value?.trim() || null,
                notas: form.querySelector('#input-notas-transferencia')?.value?.trim() || null
            })
        }
    ];

    const today = new Date().toISOString().split('T')[0];

    formConfigs.forEach((config) => {
        const form = document.getElementById(config.id);
        if (!form || form.dataset.bound === 'true') return;
        form.dataset.bound = 'true';

        // Set default date
        const dateInput = form.querySelector('input[type="date"]');
        if (dateInput && !dateInput.value) dateInput.value = today;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn?.innerHTML;
            if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = 'Guardando...'; }

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Sesión expirada. Recarga la página.');

                const formData = config.getFormData(form);
                if (!formData.concepto || formData.monto <= 0 || !formData.fecha) {
                    throw new Error('Completa Concepto, Monto y Fecha.');
                }

                // Evidence (optional)
                let evidenceUrl = null;
                const fileInput = document.getElementById(config.fileInputId);
                const file = fileInput?.files?.[0];
                if (file) {
                    // Reuse existing validation (magic bytes + MIME + extension)
                    if (typeof window.validateEvidenceFile === 'function') {
                        const validation = await window.validateEvidenceFile(file);
                        if (!validation.valid) {
                            throw new Error(validation.reason || 'Archivo no válido.');
                        }
                    }
                    // Upload to Storage
                    const storagePath = `${user.id}/agro/${config.storagePath}/${Date.now()}_${file.name}`;
                    const uploadResult = await uploadEvidence(file, storagePath);
                    if (!uploadResult.success) {
                        throw new Error(uploadResult.error || 'Error subiendo evidencia.');
                    }
                    evidenceUrl = uploadResult.path;
                }

                // Insert into DB
                const insertData = {
                    user_id: user.id,
                    ...formData,
                    evidence_url: evidenceUrl
                };

                const { error } = await supabase.from(config.table).insert(insertData);
                if (error) throw error;

                alert(`✅ ${config.label} registrado`);
                form.reset();
                if (dateInput) dateInput.value = today; // Reset date to today
                if (fileInput) fileInput.value = '';
                // Refresh UI
                document.dispatchEvent(new CustomEvent('data-refresh'));

            } catch (e) {
                alert(`⚠️ ${e.message}`);
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
            }
        });
    });
}

if (typeof window !== 'undefined') {
    window.switchTab = switchTab;
}

let topIncomeCategoryCache = null;

function sumAmounts(rows, field) {
    if (!Array.isArray(rows)) return 0;
    return rows.reduce((total, row) => {
        if (row?.deleted_at) return total;
        const value = Number(row?.[field]);
        return total + (Number.isFinite(value) ? value : 0);
    }, 0);
}

function updateBalanceSummary(expenseTotal, incomeTotal) {
    const revenueEl = document.getElementById('summary-revenue');
    const costEl = document.getElementById('summary-cost');
    const profitEl = document.getElementById('summary-profit');
    const marginEl = document.getElementById('summary-margin');

    if (revenueEl) revenueEl.textContent = formatShortCurrency(incomeTotal);
    if (costEl) costEl.textContent = formatShortCurrency(expenseTotal);

    const profit = incomeTotal - expenseTotal;
    if (profitEl) {
        profitEl.textContent = formatShortCurrency(profit);
        profitEl.style.color = profit >= 0 ? '#C8A752' : '#f87171';
    }

    const margin = incomeTotal > 0 ? (profit / incomeTotal) * 100 : 0;
    if (marginEl) {
        marginEl.textContent = `${margin.toFixed(1)}%`;
        marginEl.style.color = margin >= 0 ? '#C8A752' : '#f87171';
    }
}

function getTopIncomeCategoryFromCache(days = 365) {
    if (!Array.isArray(incomeCache) || incomeCache.length === 0) return null;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const totals = {};
    incomeCache.forEach((row) => {
        if (row?.deleted_at) return;
        const date = new Date(row?.fecha);
        if (Number.isNaN(date.getTime()) || date < cutoff) return;
        const category = String(row?.categoria || 'otros');
        const amount = Number(row?.monto);
        if (!Number.isFinite(amount)) return;
        totals[category] = (totals[category] || 0) + amount;
    });

    let topCategory = null;
    let topTotal = 0;
    Object.entries(totals).forEach(([category, total]) => {
        if (total > topTotal) {
            topTotal = total;
            topCategory = category;
        }
    });

    if (!topCategory) return null;
    return { category: topCategory, total: topTotal };
}

async function fetchTopIncomeCategory(days = 365) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffDate = cutoff.toISOString().split('T')[0];

        let query = supabase
            .from('agro_income')
            .select('categoria, monto, fecha, deleted_at')
            .eq('user_id', user.id)
            .gte('fecha', cutoffDate);

        if (incomeDeletedAtSupported !== false) {
            query = query.is('deleted_at', null);
        }

        let { data, error } = await query;
        if (error && error.message && error.message.toLowerCase().includes('deleted_at')) {
            incomeDeletedAtSupported = false;
            const fallback = await supabase
                .from('agro_income')
                .select('categoria, monto, fecha')
                .eq('user_id', user.id)
                .gte('fecha', cutoffDate);
            data = fallback.data;
            error = fallback.error;
        }

        if (error) throw error;

        incomeCache = Array.isArray(data) ? data : incomeCache;
        return getTopIncomeCategoryFromCache(days);
    } catch (err) {
        console.warn('[Agro] Top income category error:', err);
        return null;
    }
}

async function updateBalanceAndTopCategory() {
    const expenseTotal = sumAmounts(expenseCache, 'amount');
    const incomeTotal = sumAmounts(incomeCache, 'monto');

    updateBalanceSummary(expenseTotal, incomeTotal);

    let topCategory = getTopIncomeCategoryFromCache(365);
    if (!topCategory) {
        topCategory = await fetchTopIncomeCategory(365);
    }

    if (topCategory) {
        topIncomeCategoryCache = topCategory;
        document.dispatchEvent(new CustomEvent('agro:income:top-category', { detail: topCategory }));
    }
}

const AUTH_CACHE_TTL = 30000;
let cachedAuthUser = null;
let cachedAuthUserAt = 0;

function cacheAuthUser(user) {
    if (!user) return;
    cachedAuthUser = user;
    cachedAuthUserAt = Date.now();
}

function waitForAuthClient(attempt = 0) {
    if (window.AuthClient?.getSession) return Promise.resolve(window.AuthClient);
    if (attempt >= 20) return Promise.resolve(null);
    return new Promise((resolve) => {
        setTimeout(() => resolve(waitForAuthClient(attempt + 1)), 200);
    });
}

async function resolveAuthUser(authClient) {
    if (!authClient) return null;

    const now = Date.now();
    if (cachedAuthUser && (now - cachedAuthUserAt) < AUTH_CACHE_TTL) {
        return cachedAuthUser;
    }

    let session = null;
    if (typeof authClient.getSession === 'function') {
        const sessionValue = authClient.getSession();
        session = sessionValue && typeof sessionValue.then === 'function'
            ? await sessionValue
            : sessionValue;
    } else {
        session = authClient.currentSession;
    }

    const sessionUser = session?.user;
    if (sessionUser) {
        cacheAuthUser(sessionUser);
        if (sessionUser.user_metadata) return sessionUser;
    }

    if (authClient.supabase?.auth?.getUser) {
        try {
            const { data } = await authClient.supabase.auth.getUser();
            if (data?.user) {
                cacheAuthUser(data.user);
                return data.user;
            }
        } catch (err) {
            console.warn('[Agro] Auth user lookup failed:', err);
        }
    }

    return sessionUser || null;
}

async function applyHeaderIdentity() {
    const nameEl = document.querySelector('.user-profile .user-name');
    const avatarEl = document.querySelector('.user-profile .user-avatar');
    if (!nameEl && !avatarEl) return;

    const authClient = await waitForAuthClient();
    if (!authClient) return;

    const user = await resolveAuthUser(authClient);
    if (!user) return;

    const displayName = user.user_metadata?.full_name || user.email || 'Agricultor';
    if (nameEl) {
        nameEl.textContent = displayName;
    }

    const avatarUrl = user.user_metadata?.avatar_url;
    if (avatarUrl && avatarEl) {
        let img = avatarEl.querySelector('img');
        if (!img) {
            avatarEl.textContent = '';
            img = document.createElement('img');
            img.alt = displayName || 'Usuario';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            avatarEl.style.overflow = 'hidden';
            avatarEl.appendChild(img);
        }
        img.src = avatarUrl;
    }
}

function setupHeaderIdentity() {
    applyHeaderIdentity();
    window.addEventListener('auth:signed_in', applyHeaderIdentity);
    window.addEventListener('auth:initial_session', applyHeaderIdentity);
    window.addEventListener('auth:ui:updated', applyHeaderIdentity);
}

function moveFooterToEnd() {
    const footer = document.querySelector('footer, .footer, #footer');
    if (!footer) return;

    const container = document.querySelector('#app') || document.body;
    container.appendChild(footer);
    footer.style.marginTop = 'auto';
}

function injectAgroMobilePatches() {
    if (document.getElementById('agro-mobile-patches')) return;

    const style = document.createElement('style');
    style.id = 'agro-mobile-patches';
    style.textContent = `
        @media (max-width: 768px) {
            .finances-section input[type="date"],
            #expense-date,
            #income-date,
            #crop-start-date,
            #crop-harvest-date {
                font-size: 0.85rem;
                padding: 0.6rem 0.75rem;
                height: 42px;
                color: #fff;
                background: rgba(10, 10, 10, 0.85);
                border-color: rgba(200, 167, 82, 0.5);
            }

            .finances-section input[type="date"]::-webkit-calendar-picker-indicator,
            #expense-date::-webkit-calendar-picker-indicator,
            #income-date::-webkit-calendar-picker-indicator,
            #crop-start-date::-webkit-calendar-picker-indicator,
            #crop-harvest-date::-webkit-calendar-picker-indicator {
                filter: invert(1) brightness(1.2);
                opacity: 0.85;
            }

            #market-ticker-track.animate-marquee {
                animation-duration: 40s !important;
            }
        }
    `;

    document.head.appendChild(style);
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

/**
 * Inicializa el módulo Agro cuando el DOM esté listo
 */
export function initAgro() {
    console.log('[Agro] 🌾 Inicializando módulo...');

    // Inyectar CSS del modal inmediatamente para ocultarlo
    injectModalStyles();

    // Cargar cultivos
    loadCrops();

    // Vincular botón de cálculo ROI
    const calcBtn = document.querySelector('.btn-primary[onclick*="calculateROI"]');
    if (calcBtn) {
        calcBtn.removeAttribute('onclick');
        calcBtn.addEventListener('click', calculateROI);
    }
    injectRoiClearButton(calcBtn);
    setupExpenseDeleteButtons();
    setupHeaderIdentity();
    initIncomeModule();
    initFinanceTabs();
    initFinanceFormHandlers();
    setTimeout(checkCriticalFormUniqueness, 0);
    injectAgroMobilePatches();
    updateBalanceAndTopCategory();
    setTimeout(() => {
        moveFooterToEnd();
    }, 100);

    // Habilitar Enter en inputs para calcular
    document.querySelectorAll('.styled-input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') calculateROI();
        });
    });

    console.log('[Agro] ✅ Módulo inicializado');
}

// Auto-inicializar si el DOM ya está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgro);
} else {
    initAgro();
}

// ============================================================
// MODAL: NUEVO CULTIVO
// ============================================================

/**
 * Inyecta CSS del modal dinámicamente
 */
function injectModalStyles() {
    if (document.getElementById('agro-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'agro-modal-styles';
    styles.textContent = `
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 9999;
            justify-content: center;
            align-items: center;
            padding: 1rem;
        }
        .modal-overlay.active {
            display: flex;
            animation: modalFadeIn 0.3s ease;
        }
        @keyframes modalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .modal-container {
            background: rgba(26, 26, 26, 0.98);
            border: 1px solid #2a2a2a;
            border-radius: 24px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            animation: modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(200, 167, 82, 0.1);
        }
        @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #2a2a2a;
        }
        .modal-title {
            font-family: 'Orbitron', sans-serif;
            font-weight: 700;
            font-size: 1.25rem;
            color: #C8A752;
        }
        .modal-close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.4);
            font-size: 2rem;
            cursor: pointer;
            line-height: 1;
            transition: color 0.3s ease;
        }
        .modal-close:hover { color: #f87171; }
        .modal-body { padding: 1.5rem; }
        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            padding: 1.5rem;
            border-top: 1px solid #2a2a2a;
        }
        .input-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        @media (max-width: 480px) {
            .input-row { grid-template-columns: 1fr; }
        }
        .btn-cancel {
            padding: 0.75rem 1.5rem;
            background: transparent;
            color: rgba(255,255,255,0.4);
            border: 1px solid #2a2a2a;
            border-radius: 50px;
            font-family: 'Orbitron', sans-serif;
            font-weight: 600;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .btn-cancel:hover {
            border-color: #f87171;
            color: #f87171;
        }
    `;
    document.head.appendChild(styles);
}

/**
 * Abre el modal para NUEVO cultivo (limpia todo)
 */
export function openCropModal() {
    injectModalStyles();

    // Reset estado de edición
    currentEditId = null;

    // Limpiar formulario
    document.getElementById('form-new-crop')?.reset();

    // Actualizar UI del modal para modo "Nuevo"
    const modalTitle = document.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = '🌱 Nuevo Cultivo';

    const saveBtn = document.querySelector('.modal-footer .btn-primary');
    if (saveBtn) saveBtn.textContent = '🌾 Guardar Siembra';

    const modal = document.getElementById('modal-new-crop');
    if (modal) {
        modal.classList.add('active');
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('crop-start-date');
        if (startDateInput) startDateInput.value = today;

        // Focus first input
        setTimeout(() => {
            document.getElementById('crop-name')?.focus();
        }, 100);
    }
}

/**
 * Abre el modal en modo EDICIÓN con datos del cultivo
 */
export function openEditModal(id) {
    injectModalStyles();

    // Buscar cultivo en cache
    const crop = cropsCache.find(c => c.id === id);
    if (!crop) {
        console.error('[Agro] Cultivo no encontrado:', id);
        alert('Error: No se encontró el cultivo');
        return;
    }

    // Guardar ID para edición
    currentEditId = id;

    // Llenar formulario con datos existentes
    document.getElementById('crop-name').value = crop.name || '';
    document.getElementById('crop-variety').value = crop.variety || '';
    document.getElementById('crop-icon').value = crop.icon || '';
    document.getElementById('crop-area').value = crop.area_size || '';
    document.getElementById('crop-investment').value = crop.investment || '';
    document.getElementById('crop-start-date').value = crop.start_date || '';
    document.getElementById('crop-harvest-date').value = crop.expected_harvest_date || '';

    // Actualizar UI del modal para modo "Editar"
    const modalTitle = document.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = '✏️ Editar Cultivo';

    const saveBtn = document.querySelector('.modal-footer .btn-primary');
    if (saveBtn) saveBtn.textContent = '💾 Actualizar';

    // Mostrar modal
    const modal = document.getElementById('modal-new-crop');
    if (modal) {
        modal.classList.add('active');
        setTimeout(() => {
            document.getElementById('crop-name')?.focus();
        }, 100);
    }

    console.log('[Agro] ✏️ Editando cultivo:', crop.name);
}

// Exponer openEditModal a window
window.openEditModal = openEditModal;


/**
 * Cierra el modal de nuevo cultivo
 */
export function closeCropModal() {
    const modal = document.getElementById('modal-new-crop');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Guarda el nuevo cultivo en Supabase
 */
export async function saveCrop() {
    // Recoger valores del formulario
    const name = document.getElementById('crop-name')?.value?.trim();
    const variety = document.getElementById('crop-variety')?.value?.trim() || null;
    const icon = document.getElementById('crop-icon')?.value?.trim() || '🌱';
    const area = parseFloat(document.getElementById('crop-area')?.value) || 0;
    const investment = parseFloat(document.getElementById('crop-investment')?.value) || 0;
    const startDate = document.getElementById('crop-start-date')?.value || null;
    const harvestDate = document.getElementById('crop-harvest-date')?.value || null;

    // Validación
    if (!name) {
        alert('Por favor ingresa el nombre del cultivo');
        document.getElementById('crop-name')?.focus();
        return;
    }
    if (area <= 0) {
        alert('Por favor ingresa el área en hectáreas');
        document.getElementById('crop-area')?.focus();
        return;
    }
    if (!startDate) {
        alert('Por favor selecciona la fecha de siembra');
        document.getElementById('crop-start-date')?.focus();
        return;
    }

    // Datos del cultivo
    const cropData = {
        name: name,
        variety: variety,
        icon: icon,
        area_size: area,
        investment: investment,
        start_date: startDate,
        expected_harvest_date: harvestDate
    };

    try {
        const { data: userData } = await supabase.auth.getUser();

        if (userData?.user?.id) {
            // --- MODO SUPABASE ---
            let result;
            if (currentEditId) {
                // UPDATE
                result = await supabase
                    .from('agro_crops')
                    .update(cropData)
                    .eq('id', currentEditId)
                    .select();
            } else {
                // INSERT
                result = await supabase
                    .from('agro_crops')
                    .insert([{
                        ...cropData,
                        user_id: userData.user.id,
                        status: 'growing',
                        progress: 0
                    }])
                    .select();
            }
            if (result.error) throw result.error;

        } else {
            // --- MODO LOCALSTORAGE ---
            console.log('[Agro] Guardando en LocalStorage...');
            let localCrops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');

            if (currentEditId) {
                // UPDATE
                const index = localCrops.findIndex(c => c.id === currentEditId);
                if (index !== -1) {
                    localCrops[index] = { ...localCrops[index], ...cropData };
                }
            } else {
                // INSERT
                const newCrop = {
                    id: crypto.randomUUID(),
                    ...cropData,
                    status: 'growing',
                    progress: 0,
                    created_at: new Date().toISOString()
                };
                localCrops.push(newCrop);
            }
            localStorage.setItem('yavlgold_agro_crops', JSON.stringify(localCrops));
        }

        // Éxito
        document.getElementById('form-new-crop')?.reset();
        currentEditId = null;
        closeCropModal();
        await loadCrops(); // Esto actualizará también las estadísticas
        console.log('[Agro] 🌱 Operación completada exitosamente');

    } catch (err) {
        console.error('[Agro] Error guardando cultivo:', err);
        alert('Error al guardar el cultivo: ' + (err.message || 'Error desconocido'));
    }
}

// Exponer funciones al scope global para onclick handlers
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;
// NOTE: saveCrop is now defined in index.html with DATE VALIDATION
// window.saveCrop = saveCrop; // DISABLED - use index.html version with date validation

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCropModal();
    }
});

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal-new-crop');
    if (e.target === modal) {
        closeCropModal();
    }
});

// ============================================================
// ELIMINAR CULTIVO
// ============================================================

/**
 * Elimina un cultivo de Supabase con confirmación
 */
async function deleteCrop(id) {
    if (!confirm('⚠️ ¿Estás seguro de que quieres eliminar este cultivo?\n\nEsta acción no se puede deshacer.')) {
        return;
    }

    try {
        const { data: userData } = await supabase.auth.getUser();

        if (userData?.user?.id) {
            // Eliminar de Supabase
            const { error } = await supabase.from('agro_crops').delete().eq('id', id);
            if (error) throw error;
        } else {
            // Eliminar de LocalStorage
            let localCrops = JSON.parse(localStorage.getItem('yavlgold_agro_crops') || '[]');
            localCrops = localCrops.filter(c => c.id !== id);
            localStorage.setItem('yavlgold_agro_crops', JSON.stringify(localCrops));
        }

        console.log('[Agro] 🗑️ Cultivo eliminado:', id);
        await loadCrops(); // Actualiza UI y gráficas

    } catch (err) {
        console.error('[Agro] Error eliminando cultivo:', err);
        alert('Error al eliminar: ' + (err.message || 'Error desconocido'));
    }
}

// Exponer deleteCrop al scope global
window.deleteCrop = deleteCrop;

// Inyectar CSS para botón de eliminar
(function injectDeleteButtonStyles() {
    if (document.getElementById('agro-delete-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'agro-delete-styles';
    styles.textContent = `
        .btn-delete-crop {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            width: 28px;
            height: 28px;
            background: rgba(248, 113, 113, 0.1);
            border: 1px solid rgba(248, 113, 113, 0.3);
            border-radius: 50%;
            color: #f87171;
            font-size: 1.25rem;
            line-height: 1;
            cursor: pointer;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 10;
        }
        .crop-card {
            position: relative;
        }
        .crop-card:hover .btn-delete-crop {
            opacity: 1;
        }
        .btn-delete-crop:hover {
            background: #f87171;
            color: #0a0a0a;
            transform: scale(1.1);
        }
        .crop-card-actions {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            display: flex;
            gap: 0.5rem;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 10;
        }
        .crop-card:hover .crop-card-actions {
            opacity: 1;
        }
        .btn-edit-crop {
            width: 28px;
            height: 28px;
            background: rgba(200, 167, 82, 0.1);
            border: 1px solid rgba(200, 167, 82, 0.3);
            border-radius: 50%;
            font-size: 0.9rem;
            line-height: 1;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .btn-edit-crop:hover {
            background: #C8A752;
            transform: scale(1.1);
        }
    `;
    document.head.appendChild(styles);
})();

