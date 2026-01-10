/**
 * YavlGold V9.4 - Módulo Agro - Supabase Integration
 * Conecta la UI con las tablas agro_crops y agro_roi_calculations
 */
import supabase from '../assets/js/config/supabase-config.js';

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Renderiza el estado del cultivo como badge HTML
 */
function getStatusBadge(status) {
    const statusMap = {
        'growing': { class: 'status-growing', text: 'Creciendo' },
        'ready': { class: 'status-ready', text: '¡Lista!' },
        'attention': { class: 'status-attention', text: 'Atención' },
        'harvested': { class: 'status-harvested', text: 'Cosechado' }
    };
    const s = statusMap[status] || statusMap['growing'];
    return `<span class="crop-status ${s.class}">${s.text}</span>`;
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
 * Genera HTML de una tarjeta de cultivo
 */
function renderCropCard(crop, index) {
    const delay = 4 + index; // Para animaciones escalonadas
    return `
        <div class="card crop-card animate-in delay-${delay}" data-crop-id="${crop.id}">
            <div class="crop-card-header">
                <div class="crop-info">
                    <div class="crop-icon">${crop.icon || '🌱'}</div>
                    <div class="crop-details-header">
                        <span class="crop-name">${crop.name}</span>
                        <span class="crop-variety">${crop.variety || 'Sin variedad'}</span>
                    </div>
                </div>
                ${getStatusBadge(crop.status)}
            </div>
            <div class="progress-section">
                <div class="progress-header">
                    <span class="progress-label">Ciclo de Cosecha</span>
                    <span class="progress-value">${crop.progress}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${crop.progress}%;"></div>
                </div>
            </div>
            <div class="crop-meta-grid">
                <div class="crop-meta-item">
                    <span class="meta-label">Siembra</span>
                    <span class="meta-value">${formatDate(crop.start_date)}</span>
                </div>
                <div class="crop-meta-item">
                    <span class="meta-label">Cosecha Est.</span>
                    <span class="meta-value">${formatDate(crop.expected_harvest_date)}</span>
                </div>
                <div class="crop-meta-item">
                    <span class="meta-label">Área</span>
                    <span class="meta-value">${crop.area_size} Ha</span>
                </div>
                <div class="crop-meta-item">
                    <span class="meta-label">Inversión</span>
                    <span class="meta-value gold">${formatCurrency(crop.investment)}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Carga cultivos del usuario desde Supabase y los renderiza
 */
export async function loadCrops() {
    const cropsGrid = document.querySelector('.crops-grid');
    if (!cropsGrid) {
        console.warn('[Agro] No se encontró .crops-grid en el DOM');
        return;
    }

    // Mostrar loading
    cropsGrid.innerHTML = `
        <div class="card animate-in" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
            <div class="kpi-icon-wrapper" style="margin: 0 auto 1rem;">🔄</div>
            <p style="color: var(--text-muted);">Cargando cultivos...</p>
        </div>
    `;

    try {
        const { data: crops, error } = await supabase
            .from('agro_crops')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Agro] Error cargando cultivos:', error);
            cropsGrid.innerHTML = `
                <div class="card animate-in" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <div class="kpi-icon-wrapper" style="margin: 0 auto 1rem;">⚠️</div>
                    <p style="color: var(--danger);">Error al cargar cultivos</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">${error.message}</p>
                </div>
            `;
            return;
        }

        if (!crops || crops.length === 0) {
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

        // Renderizar cultivos
        cropsGrid.innerHTML = crops.map((crop, i) => renderCropCard(crop, i)).join('');

        // Animar progress bars
        setTimeout(() => {
            document.querySelectorAll('.crops-grid .progress-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => { bar.style.width = width; }, 100);
            });
        }, 300);

        console.log(`[Agro] ✅ ${crops.length} cultivos cargados`);

    } catch (err) {
        console.error('[Agro] Error inesperado:', err);
    }
}

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

// ============================================================
// INICIALIZACIÓN
// ============================================================

/**
 * Inicializa el módulo Agro cuando el DOM esté listo
 */
export function initAgro() {
    console.log('[Agro] 🌾 Inicializando módulo...');

    // Cargar cultivos
    loadCrops();

    // Vincular botón de cálculo ROI
    const calcBtn = document.querySelector('.btn-primary[onclick*="calculateROI"]');
    if (calcBtn) {
        calcBtn.removeAttribute('onclick');
        calcBtn.addEventListener('click', calculateROI);
    }

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
 * Abre el modal de nuevo cultivo
 */
export function openCropModal() {
    injectModalStyles();
    const modal = document.getElementById('modal-new-crop');
    if (modal) {
        modal.classList.add('active');
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('crop-start-date');
        if (startDateInput && !startDateInput.value) {
            startDateInput.value = today;
        }
        // Focus first input
        setTimeout(() => {
            document.getElementById('crop-name')?.focus();
        }, 100);
    }
}

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

    // Obtener usuario
    try {
        const { data: userData, error: authError } = await supabase.auth.getUser();

        if (authError || !userData?.user?.id) {
            alert('Debes iniciar sesión para guardar cultivos');
            console.error('[Agro] Error de autenticación:', authError);
            return;
        }

        // Insertar en Supabase
        const { data, error } = await supabase
            .from('agro_crops')
            .insert([{
                user_id: userData.user.id,
                name: name,
                variety: variety,
                icon: icon,
                status: 'growing',
                progress: 0,
                area_size: area,
                investment: investment,
                start_date: startDate,
                expected_harvest_date: harvestDate
            }])
            .select();

        if (error) {
            console.error('[Agro] Error guardando cultivo:', error);
            alert(`Error al guardar: ${error.message}`);
            return;
        }

        console.log('[Agro] ✅ Cultivo guardado:', data);

        // Limpiar formulario
        document.getElementById('form-new-crop')?.reset();

        // Cerrar modal
        closeCropModal();

        // Recargar lista de cultivos
        await loadCrops();

        // Feedback visual
        console.log('[Agro] 🌱 Cultivo agregado exitosamente');

    } catch (err) {
        console.error('[Agro] Error inesperado:', err);
        alert('Error inesperado al guardar el cultivo');
    }
}

// Exponer funciones al scope global para onclick handlers
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;
window.saveCrop = saveCrop;

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
