/**
 * YavlGold V9.8 — Agro Cart (Carrito de Compras Agrícola)
 * Lista de compras con presupuesto, vinculada a cultivos.
 * Items comprados se convierten en gastos del facturero.
 *
 * Lazy-loaded: only initialized when the Carrito tab is first activated.
 */

import { SUPPORTED_CURRENCIES, initExchangeRates, getRate, convertToUSD, formatCurrencyDisplay } from './agro-exchange.js';

// ============================================================
// STATE
// ============================================================
let _supabase = null;
let _cropsCache = [];
let _refreshExpenses = null;
let _exchangeRates = { USD: 1, COP: null, VES: null };
let _initialized = false;
let _carts = [];
let _activeCartId = null;
let _activeCartItems = [];
let _cartListenerAC = null;

// ============================================================
// INIT
// ============================================================

/**
 * @param {object} deps - { supabase, cropsCache, refreshFactureroHistory }
 */
export async function initAgroCart(deps) {
    if (_initialized) {
        renderCartTab();
        return;
    }
    _supabase = deps.supabase;
    _cropsCache = deps.cropsCache || [];
    _refreshExpenses = deps.refreshFactureroHistory || null;

    // Fetch exchange rates (non-blocking)
    initExchangeRates().then(r => { if (r) _exchangeRates = r; }).catch(() => { });

    _initialized = true;
    await loadCarts();
    renderCartTab();
}

/** Update cropsCache externally (when crops reload) */
export function updateCartCrops(crops) {
    _cropsCache = Array.isArray(crops) ? crops : [];
}

// ============================================================
// DATA: CARTS
// ============================================================

async function loadCarts() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await _supabase
            .from('agro_cart')
            .select('id, name, crop_id, status, notes, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        _carts = data || [];
    } catch (err) {
        console.error('[AgroCart] loadCarts error:', err.message);
        _carts = [];
    }
}

async function createCart(name, cropId, notes) {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Sesión expirada.');
        const { data, error } = await _supabase
            .from('agro_cart')
            .insert({ user_id: user.id, name, crop_id: cropId || null, notes: notes || null })
            .select('id, name, crop_id, status, notes, created_at')
            .single();
        if (error) throw error;
        _carts.unshift(data);
        _activeCartId = data.id;
        await loadCartItems(data.id);
        renderCartTab();
    } catch (err) {
        console.error('[AgroCart] createCart error:', err.message);
        alert('Error al crear carrito: ' + err.message);
    }
}

async function deleteCart(cartId) {
    if (!confirm('¿Eliminar este carrito y todos sus items?')) return;
    try {
        // First delete linked expenses for purchased items
        const items = _activeCartId === cartId ? _activeCartItems : [];
        for (const item of items) {
            if (item.purchased && item.expense_id) {
                await _supabase.from('agro_expenses').delete().eq('id', item.expense_id);
            }
        }
        const { error } = await _supabase.from('agro_cart').delete().eq('id', cartId);
        if (error) throw error;
        _carts = _carts.filter(c => c.id !== cartId);
        if (_activeCartId === cartId) {
            _activeCartId = _carts.length > 0 ? _carts[0].id : null;
            if (_activeCartId) await loadCartItems(_activeCartId);
            else _activeCartItems = [];
        }
        renderCartTab();
        if (_refreshExpenses) _refreshExpenses('gastos');
    } catch (err) {
        console.error('[AgroCart] deleteCart error:', err.message);
        alert('Error al eliminar: ' + err.message);
    }
}

async function updateCartStatus(cartId, status) {
    try {
        const { error } = await _supabase.from('agro_cart').update({ status }).eq('id', cartId);
        if (error) throw error;
        const cart = _carts.find(c => c.id === cartId);
        if (cart) cart.status = status;
        renderCartTab();
    } catch (err) {
        console.error('[AgroCart] updateCartStatus error:', err.message);
    }
}

// ============================================================
// DATA: ITEMS
// ============================================================

async function loadCartItems(cartId) {
    try {
        const { data, error } = await _supabase
            .from('agro_cart_items')
            .select('id, name, quantity, unit, monto, currency, exchange_rate, monto_usd, purchased, purchased_at, expense_id, sort_order')
            .eq('cart_id', cartId)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });
        if (error) throw error;
        _activeCartItems = data || [];
    } catch (err) {
        console.error('[AgroCart] loadCartItems error:', err.message);
        _activeCartItems = [];
    }
}

async function addItem(cartId, itemData) {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Sesión expirada.');
        const rate = itemData.currency === 'USD' ? 1 : (getRate(itemData.currency, _exchangeRates) || itemData.exchange_rate || 1);
        const montoNum = Number(itemData.monto) || 0;
        const montoUsd = itemData.currency === 'USD' ? montoNum : convertToUSD(montoNum, itemData.currency, rate);
        const { data, error } = await _supabase
            .from('agro_cart_items')
            .insert({
                cart_id: cartId,
                user_id: user.id,
                name: itemData.name,
                quantity: Number(itemData.quantity) || 1,
                unit: itemData.unit || 'unidad',
                monto: montoNum,
                currency: itemData.currency || 'USD',
                exchange_rate: rate,
                monto_usd: parseFloat(montoUsd.toFixed(2)),
                sort_order: _activeCartItems.length
            })
            .select()
            .single();
        if (error) throw error;
        _activeCartItems.push(data);
        renderCartTab();
    } catch (err) {
        console.error('[AgroCart] addItem error:', err.message);
        alert('Error al agregar item: ' + err.message);
    }
}

async function updateItem(itemId, updates) {
    try {
        if (updates.monto !== undefined || updates.currency !== undefined || updates.exchange_rate !== undefined) {
            const existing = _activeCartItems.find(i => i.id === itemId);
            const currency = updates.currency || existing?.currency || 'USD';
            const monto = Number(updates.monto ?? existing?.monto) || 0;
            const rate = currency === 'USD' ? 1 : (updates.exchange_rate || getRate(currency, _exchangeRates) || existing?.exchange_rate || 1);
            updates.monto_usd = parseFloat(convertToUSD(monto, currency, rate).toFixed(2));
            updates.exchange_rate = rate;
        }
        const { error } = await _supabase.from('agro_cart_items').update(updates).eq('id', itemId);
        if (error) throw error;
        const idx = _activeCartItems.findIndex(i => i.id === itemId);
        if (idx !== -1) Object.assign(_activeCartItems[idx], updates);
        renderCartTab();
    } catch (err) {
        console.error('[AgroCart] updateItem error:', err.message);
        alert('Error al actualizar: ' + err.message);
    }
}

async function deleteItem(itemId) {
    if (!confirm('¿Eliminar este item?')) return;
    try {
        const item = _activeCartItems.find(i => i.id === itemId);
        if (item?.purchased && item.expense_id) {
            await _supabase.from('agro_expenses').delete().eq('id', item.expense_id);
        }
        const { error } = await _supabase.from('agro_cart_items').delete().eq('id', itemId);
        if (error) throw error;
        _activeCartItems = _activeCartItems.filter(i => i.id !== itemId);
        renderCartTab();
        if (item?.purchased && _refreshExpenses) _refreshExpenses('gastos');
    } catch (err) {
        console.error('[AgroCart] deleteItem error:', err.message);
        alert('Error al eliminar: ' + err.message);
    }
}

async function togglePurchased(itemId) {
    const item = _activeCartItems.find(i => i.id === itemId);
    if (!item) return;

    const cart = _carts.find(c => c.id === _activeCartId);

    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Sesión expirada.');

        if (!item.purchased) {
            // MARK AS PURCHASED → create expense
            const today = new Date().toISOString().split('T')[0];
            const { data: expense, error: expErr } = await _supabase
                .from('agro_expenses')
                .insert({
                    user_id: user.id,
                    concept: `Compra: ${item.name}`,
                    amount: Number(item.monto) || 0,
                    category: 'insumos',
                    date: today,
                    crop_id: cart?.crop_id || null,
                    currency: item.currency || 'USD',
                    exchange_rate: item.exchange_rate || 1,
                    monto_usd: item.monto_usd || Number(item.monto) || 0
                })
                .select('id')
                .single();
            if (expErr) throw expErr;

            const { error } = await _supabase
                .from('agro_cart_items')
                .update({ purchased: true, purchased_at: new Date().toISOString(), expense_id: expense.id })
                .eq('id', itemId);
            if (error) throw error;
            item.purchased = true;
            item.purchased_at = new Date().toISOString();
            item.expense_id = expense.id;
        } else {
            // UNMARK → delete expense
            if (item.expense_id) {
                await _supabase.from('agro_expenses').delete().eq('id', item.expense_id);
            }
            const { error } = await _supabase
                .from('agro_cart_items')
                .update({ purchased: false, purchased_at: null, expense_id: null })
                .eq('id', itemId);
            if (error) throw error;
            item.purchased = false;
            item.purchased_at = null;
            item.expense_id = null;
        }
        renderCartTab();
        if (_refreshExpenses) _refreshExpenses('gastos');
    } catch (err) {
        console.error('[AgroCart] togglePurchased error:', err.message);
        alert('Error: ' + err.message);
    }
}

// ============================================================
// SUMMARY
// ============================================================

function computeSummary(items) {
    let totalUsd = 0, purchasedUsd = 0;
    const byCurrency = {};

    for (const item of items) {
        const cur = item.currency || 'USD';
        const monto = Number(item.monto) || 0;
        const usd = Number(item.monto_usd) || 0;
        if (!byCurrency[cur]) byCurrency[cur] = { total: 0, purchased: 0 };
        byCurrency[cur].total += monto;
        if (item.purchased) byCurrency[cur].purchased += monto;
        totalUsd += usd;
        if (item.purchased) purchasedUsd += usd;
    }
    return {
        totalUsd,
        purchasedUsd,
        remainingUsd: totalUsd - purchasedUsd,
        progress: totalUsd > 0 ? (purchasedUsd / totalUsd) * 100 : 0,
        byCurrency,
        totalItems: items.length,
        purchasedItems: items.filter(i => i.purchased).length
    };
}

// ============================================================
// EXPORT MD
// ============================================================

function exportCartMD(cartId) {
    const cart = _carts.find(c => c.id === cartId);
    if (!cart) return;
    const items = _activeCartId === cartId ? _activeCartItems : [];
    const summary = computeSummary(items);
    const cropName = getCropName(cart.crop_id);

    let md = `# 🛒 ${cart.name}\n`;
    md += `**Cultivo:** ${cropName}\n`;
    md += `**Estado:** ${cart.status}\n`;
    if (cart.notes) md += `**Notas:** ${cart.notes}\n`;
    md += `**Fecha:** ${new Date(cart.created_at).toLocaleDateString()}\n\n`;
    md += `## Items\n\n`;
    md += `| # | Estado | Item | Cant | Unidad | Precio | USD |\n`;
    md += `|---|--------|------|------|--------|--------|-----|\n`;

    items.forEach((item, i) => {
        const check = item.purchased ? '☑' : '☐';
        const price = formatCurrencyDisplay(item.monto, item.currency, item.monto_usd);
        md += `| ${i + 1} | ${check} | ${item.name} | ${item.quantity} | ${item.unit} | ${price} | $${Number(item.monto_usd || 0).toFixed(2)} |\n`;
    });

    md += `\n## Resumen\n\n`;
    md += `- **Total:** $${summary.totalUsd.toFixed(2)} USD\n`;
    md += `- **Comprado:** $${summary.purchasedUsd.toFixed(2)} USD (${summary.purchasedItems}/${summary.totalItems})\n`;
    md += `- **Falta:** $${summary.remainingUsd.toFixed(2)} USD\n`;
    md += `- **Progreso:** ${summary.progress.toFixed(0)}%\n`;
    md += `\n---\n*Generado por YavlGold Agro*\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Carrito-${sanitize(cart.name)}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

function sanitize(str) {
    return String(str || '').replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/gi, '').trim().replace(/\s+/g, '-');
}

// ============================================================
// HELPERS
// ============================================================

function getCropName(cropId) {
    if (!cropId) return 'General';
    const crop = (_cropsCache || []).find(c => String(c.id) === String(cropId));
    return crop ? `${crop.icon || '🌱'} ${crop.name}` : 'Cultivo';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
}

function fmtCur(monto, currency, montoUsd) {
    return formatCurrencyDisplay(monto, currency, montoUsd);
}

// ============================================================
// RENDER
// ============================================================

function renderCartTab() {
    const container = document.getElementById('agro-cart-root');
    if (!container) return;

    if (_carts.length === 0 && !_activeCartId) {
        container.innerHTML = renderEmptyState();
        attachCartListeners(container);
        return;
    }

    const activeCart = _carts.find(c => c.id === _activeCartId);

    let html = `<div class="agro-cart-header">
        <div class="agro-cart-tabs-row">
            ${_carts.map(c => `
                <button type="button" class="agro-cart-chip ${c.id === _activeCartId ? 'is-active' : ''} ${c.status !== 'activo' ? 'is-done' : ''}"
                    data-cart-id="${c.id}" title="${escapeHtml(c.name)}">
                    ${c.status === 'completado' ? '✅' : c.status === 'cancelado' ? '❌' : '📋'} ${escapeHtml(c.name)}
                </button>
            `).join('')}
            <button type="button" class="agro-cart-chip agro-cart-chip-new" data-action="new-cart">+ Nuevo</button>
        </div>
    </div>`;

    if (activeCart) {
        const summary = computeSummary(_activeCartItems);
        html += renderActiveCart(activeCart, _activeCartItems, summary);
    }

    container.innerHTML = html;
    attachCartListeners(container);
}

function renderEmptyState() {
    return `
        <div style="text-align: center; padding: 2rem 1rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🛒</div>
            <h3 style="color: #fff; margin: 0 0 0.5rem;">Tu carrito está vacío</h3>
            <p style="color: rgba(255,255,255,0.5); margin: 0 0 1.5rem; font-size: 0.85rem;">
                Crea una lista de compras para planificar tus insumos agrícolas.
            </p>
            <button type="button" class="agro-cart-btn-primary" data-action="new-cart">
                + Nuevo Carrito
            </button>
        </div>
    `;
}

function renderActiveCart(cart, items, summary) {
    const cropName = getCropName(cart.crop_id);
    const progressPct = Math.min(100, summary.progress);

    let itemsHtml = '';
    for (const item of items) {
        itemsHtml += renderCartItem(item);
    }

    return `
        <div class="agro-cart-detail">
            <div class="agro-cart-detail-header">
                <div>
                    <span style="font-size: 0.75rem; color: rgba(255,255,255,0.4);">${escapeHtml(cropName)}</span>
                    ${cart.notes ? `<span style="font-size: 0.7rem; color: rgba(255,255,255,0.3); margin-left: 0.5rem;">${escapeHtml(cart.notes)}</span>` : ''}
                </div>
                <div class="agro-cart-actions">
                    ${cart.status === 'activo' ? `<button type="button" class="agro-cart-icon-btn" data-action="complete-cart" title="Marcar completado"><i class="fa fa-check"></i></button>` : ''}
                    <button type="button" class="agro-cart-icon-btn" data-action="export-cart" title="Exportar MD"><i class="fa fa-file-export"></i></button>
                    <button type="button" class="agro-cart-icon-btn agro-cart-icon-btn-danger" data-action="delete-cart" title="Eliminar carrito"><i class="fa fa-trash"></i></button>
                </div>
            </div>

            <!-- Summary -->
            <div class="agro-cart-summary">
                <div class="agro-cart-progress-bar">
                    <div class="agro-cart-progress-fill" style="width: ${progressPct}%"></div>
                </div>
                <div class="agro-cart-summary-grid">
                    <div class="agro-cart-summary-item">
                        <span class="agro-cart-summary-label">Total</span>
                        <span class="agro-cart-summary-value">$${summary.totalUsd.toFixed(2)}</span>
                    </div>
                    <div class="agro-cart-summary-item">
                        <span class="agro-cart-summary-label">Comprado</span>
                        <span class="agro-cart-summary-value" style="color: #4ade80;">$${summary.purchasedUsd.toFixed(2)}</span>
                    </div>
                    <div class="agro-cart-summary-item">
                        <span class="agro-cart-summary-label">Falta</span>
                        <span class="agro-cart-summary-value" style="color: #f59e0b;">$${summary.remainingUsd.toFixed(2)}</span>
                    </div>
                </div>
                <div style="text-align: center; font-size: 0.7rem; color: rgba(255,255,255,0.35); margin-top: 0.25rem;">
                    ${summary.purchasedItems}/${summary.totalItems} items comprados
                </div>
            </div>

            <!-- Items -->
            <div class="agro-cart-items">
                ${itemsHtml || '<div style="text-align: center; color: rgba(255,255,255,0.4); padding: 1.5rem; font-size: 0.85rem;">Sin items aún. Agrega uno abajo.</div>'}
            </div>

            <!-- Add item form -->
            ${cart.status === 'activo' ? renderAddItemForm() : ''}
        </div>
    `;
}

function renderCartItem(item) {
    const checked = item.purchased ? 'checked' : '';
    const lineThrough = item.purchased ? 'text-decoration: line-through; opacity: 0.6;' : '';
    const price = fmtCur(item.monto, item.currency, item.monto_usd);

    return `
        <div class="agro-cart-item ${item.purchased ? 'is-purchased' : ''}" data-item-id="${item.id}">
            <label class="agro-cart-checkbox-label">
                <input type="checkbox" class="agro-cart-checkbox" data-action="toggle-purchased" data-item-id="${item.id}" ${checked}>
                <span class="agro-cart-checkbox-custom"></span>
            </label>
            <div class="agro-cart-item-info" style="${lineThrough}">
                <div class="agro-cart-item-name">${escapeHtml(item.name)}</div>
                <div class="agro-cart-item-meta">${item.quantity} ${escapeHtml(item.unit)}</div>
            </div>
            <div class="agro-cart-item-price">${price}</div>
            <div class="agro-cart-item-actions">
                <button type="button" class="agro-cart-item-btn" data-action="edit-item" data-item-id="${item.id}" title="Editar"><i class="fa fa-pen"></i></button>
                <button type="button" class="agro-cart-item-btn agro-cart-item-btn-danger" data-action="delete-item" data-item-id="${item.id}" title="Eliminar"><i class="fa fa-trash"></i></button>
            </div>
        </div>
    `;
}

function renderAddItemForm() {
    const currencyBtns = Object.entries(SUPPORTED_CURRENCIES).map(([code, cfg]) =>
        `<button type="button" class="agro-cart-cur-btn ${code === 'COP' ? 'is-active' : ''}" data-currency="${code}">${cfg.flag} ${code}</button>`
    ).join('');

    return `
        <div class="agro-cart-add-form" id="agro-cart-add-form">
            <div class="agro-cart-add-title">Agregar item</div>
            <div class="agro-cart-add-row">
                <input type="text" class="agro-cart-input" id="cart-item-name" placeholder="Ej: Semilla de pepino" autocomplete="off">
            </div>
            <div class="agro-cart-add-row agro-cart-add-row-split">
                <input type="number" class="agro-cart-input agro-cart-input-sm" id="cart-item-qty" placeholder="Cant" value="1" min="0.1" step="0.1" inputmode="decimal">
                <input type="text" class="agro-cart-input agro-cart-input-sm" id="cart-item-unit" placeholder="unidad" value="unidad" autocomplete="off">
            </div>
            <div class="agro-cart-add-row agro-cart-add-row-split">
                <input type="number" class="agro-cart-input" id="cart-item-price" placeholder="Precio" min="0" step="0.01" inputmode="decimal">
                <div class="agro-cart-cur-group">${currencyBtns}</div>
            </div>
            <div id="cart-item-usd-preview" style="text-align: right; font-size: 0.75rem; color: #C8A752; min-height: 1.2em;"></div>
            <button type="button" class="agro-cart-btn-primary" data-action="add-item" style="width: 100%; margin-top: 0.5rem;">
                ✅ Agregar
            </button>
        </div>
    `;
}

function renderNewCartModal() {
    const cropOptions = (_cropsCache || []).map(c =>
        `<option value="${c.id}">${c.icon || '🌱'} ${escapeHtml(c.name || 'Cultivo')}${c.variety ? ' (' + escapeHtml(c.variety) + ')' : ''}</option>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'agro-cart-modal-overlay';
    overlay.innerHTML = `
        <div class="agro-cart-modal">
            <h3 style="color: #fff; margin: 0 0 1rem;">🛒 Nuevo Carrito</h3>
            <div class="agro-cart-add-row">
                <label style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Nombre *</label>
                <input type="text" class="agro-cart-input" id="new-cart-name" placeholder="Ej: Siembra de Pepino" autocomplete="off">
            </div>
            <div class="agro-cart-add-row">
                <label style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Cultivo</label>
                <select class="agro-cart-input" id="new-cart-crop">
                    <option value="">General (sin asociar)</option>
                    ${cropOptions}
                </select>
            </div>
            <div class="agro-cart-add-row">
                <label style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Notas (opcional)</label>
                <input type="text" class="agro-cart-input" id="new-cart-notes" placeholder="Ej: Para la próxima cosecha" autocomplete="off">
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                <button type="button" class="agro-cart-btn-secondary" data-action="cancel-modal" style="flex: 1;">Cancelar</button>
                <button type="button" class="agro-cart-btn-primary" data-action="confirm-create" style="flex: 1;">Crear carrito</button>
            </div>
        </div>
    `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
        if (e.target.closest('[data-action="cancel-modal"]')) overlay.remove();
        if (e.target.closest('[data-action="confirm-create"]')) {
            const name = document.getElementById('new-cart-name')?.value?.trim();
            const cropId = document.getElementById('new-cart-crop')?.value || null;
            const notes = document.getElementById('new-cart-notes')?.value?.trim() || null;
            if (!name) { alert('El nombre es obligatorio.'); return; }
            overlay.remove();
            createCart(name, cropId, notes);
        }
    });

    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('new-cart-name')?.focus(), 100);
}

function renderEditItemModal(item) {
    const currencyBtns = Object.entries(SUPPORTED_CURRENCIES).map(([code, cfg]) =>
        `<button type="button" class="agro-cart-cur-btn ${code === (item.currency || 'USD') ? 'is-active' : ''}" data-currency="${code}">${cfg.flag} ${code}</button>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'agro-cart-modal-overlay';
    overlay.innerHTML = `
        <div class="agro-cart-modal">
            <h3 style="color: #fff; margin: 0 0 1rem;">✏️ Editar Item</h3>
            <div class="agro-cart-add-row">
                <label style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Nombre</label>
                <input type="text" class="agro-cart-input" id="edit-item-name" value="${escapeHtml(item.name)}" autocomplete="off">
            </div>
            <div class="agro-cart-add-row agro-cart-add-row-split">
                <div>
                    <label style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Cantidad</label>
                    <input type="number" class="agro-cart-input" id="edit-item-qty" value="${item.quantity}" min="0.1" step="0.1" inputmode="decimal">
                </div>
                <div>
                    <label style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Unidad</label>
                    <input type="text" class="agro-cart-input" id="edit-item-unit" value="${escapeHtml(item.unit)}" autocomplete="off">
                </div>
            </div>
            <div class="agro-cart-add-row">
                <label style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Precio</label>
                <input type="number" class="agro-cart-input" id="edit-item-price" value="${item.monto}" min="0" step="0.01" inputmode="decimal">
            </div>
            <div class="agro-cart-add-row">
                <label style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Moneda</label>
                <div class="agro-cart-cur-group" id="edit-item-cur-group">${currencyBtns}</div>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                <button type="button" class="agro-cart-btn-secondary" data-action="cancel-modal" style="flex: 1;">Cancelar</button>
                <button type="button" class="agro-cart-btn-primary" data-action="confirm-edit" style="flex: 1;">Guardar</button>
            </div>
        </div>
    `;

    let editCurrency = item.currency || 'USD';

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
        if (e.target.closest('[data-action="cancel-modal"]')) overlay.remove();

        const curBtn = e.target.closest('.agro-cart-cur-btn');
        if (curBtn) {
            overlay.querySelectorAll('.agro-cart-cur-btn').forEach(b => b.classList.remove('is-active'));
            curBtn.classList.add('is-active');
            editCurrency = curBtn.dataset.currency;
        }

        if (e.target.closest('[data-action="confirm-edit"]')) {
            const name = document.getElementById('edit-item-name')?.value?.trim();
            const qty = Number(document.getElementById('edit-item-qty')?.value) || 1;
            const unit = document.getElementById('edit-item-unit')?.value?.trim() || 'unidad';
            const price = Number(document.getElementById('edit-item-price')?.value) || 0;
            if (!name) { alert('El nombre es obligatorio.'); return; }
            overlay.remove();
            updateItem(item.id, { name, quantity: qty, unit, monto: price, currency: editCurrency });
        }
    });

    document.body.appendChild(overlay);
}

// ============================================================
// EVENT DELEGATION
// ============================================================

function attachCartListeners(container) {
    if (_cartListenerAC) _cartListenerAC.abort();
    _cartListenerAC = new AbortController();
    const signal = _cartListenerAC.signal;
    let addCurrency = 'COP';

    container.addEventListener('click', async (e) => {
        const target = e.target;
        const actionEl = target.closest('[data-action]');
        if (!actionEl) return;
        const action = actionEl.dataset.action;

        if (action === 'new-cart') { renderNewCartModal(); return; }
        if (action === 'delete-cart') { deleteCart(_activeCartId); return; }
        if (action === 'export-cart') { exportCartMD(_activeCartId); return; }
        if (action === 'complete-cart') { updateCartStatus(_activeCartId, 'completado'); return; }

        if (action === 'toggle-purchased') {
            const itemId = actionEl.dataset.itemId;
            if (itemId) togglePurchased(itemId);
            return;
        }

        if (action === 'delete-item') {
            const itemId = actionEl.dataset.itemId;
            if (itemId) deleteItem(itemId);
            return;
        }

        if (action === 'edit-item') {
            const itemId = actionEl.dataset.itemId;
            const item = _activeCartItems.find(i => i.id === itemId);
            if (item) renderEditItemModal(item);
            return;
        }

        if (action === 'add-item') {
            const name = document.getElementById('cart-item-name')?.value?.trim();
            const qty = Number(document.getElementById('cart-item-qty')?.value) || 1;
            const unit = document.getElementById('cart-item-unit')?.value?.trim() || 'unidad';
            const price = Number(document.getElementById('cart-item-price')?.value) || 0;
            if (!name) { alert('Nombre del item es obligatorio.'); return; }
            if (price <= 0) { alert('El precio debe ser mayor a 0.'); return; }
            await addItem(_activeCartId, { name, quantity: qty, unit, monto: price, currency: addCurrency });
            // Clear form
            const nameEl = document.getElementById('cart-item-name');
            const priceEl = document.getElementById('cart-item-price');
            if (nameEl) nameEl.value = '';
            if (priceEl) priceEl.value = '';
            return;
        }
    }, { signal });

    // Cart chip selection
    container.addEventListener('click', async (e) => {
        const chip = e.target.closest('.agro-cart-chip:not(.agro-cart-chip-new)');
        if (!chip) return;
        const cartId = chip.dataset.cartId;
        if (cartId && cartId !== _activeCartId) {
            _activeCartId = cartId;
            await loadCartItems(cartId);
            renderCartTab();
        }
    }, { signal });

    // Currency toggle in add form
    container.addEventListener('click', (e) => {
        const curBtn = e.target.closest('#agro-cart-add-form .agro-cart-cur-btn');
        if (!curBtn) return;
        container.querySelectorAll('#agro-cart-add-form .agro-cart-cur-btn').forEach(b => b.classList.remove('is-active'));
        curBtn.classList.add('is-active');
        addCurrency = curBtn.dataset.currency;
        updateAddPreview(addCurrency);
    }, { signal });

    // USD preview on price input
    const priceInput = container.querySelector('#cart-item-price');
    if (priceInput) {
        priceInput.addEventListener('input', () => updateAddPreview(addCurrency), { signal });
    }
}

function updateAddPreview(currency) {
    const preview = document.getElementById('cart-item-usd-preview');
    const priceEl = document.getElementById('cart-item-price');
    if (!preview || !priceEl) return;
    if (currency === 'USD') { preview.textContent = ''; return; }
    const monto = Number(priceEl.value) || 0;
    const rate = getRate(currency, _exchangeRates) || 0;
    if (monto > 0 && rate > 0) {
        preview.textContent = `≈ $${(monto / rate).toFixed(2)} USD`;
    } else {
        preview.textContent = '';
    }
}

// ============================================================
// CSS
// ============================================================

export function injectCartStyles() {
    if (document.getElementById('agro-cart-styles')) return;
    const style = document.createElement('style');
    style.id = 'agro-cart-styles';
    style.textContent = `
        .agro-cart-header { margin-bottom: 0.75rem; }

        .agro-cart-tabs-row {
            display: flex;
            gap: 0.4rem;
            overflow-x: auto;
            padding-bottom: 0.5rem;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
        }
        .agro-cart-tabs-row::-webkit-scrollbar { display: none; }

        .agro-cart-chip {
            flex: 0 0 auto;
            padding: 0.4rem 0.75rem;
            border-radius: 20px;
            border: 1px solid rgba(200,167,82,0.3);
            background: rgba(200,167,82,0.08);
            color: rgba(255,255,255,0.7);
            font-size: 0.75rem;
            font-family: inherit;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s;
        }
        .agro-cart-chip:hover { border-color: rgba(200,167,82,0.5); }
        .agro-cart-chip.is-active {
            background: linear-gradient(135deg, rgba(200,167,82,0.25), rgba(200,167,82,0.12));
            border-color: #C8A752;
            color: #C8A752;
            font-weight: 600;
        }
        .agro-cart-chip.is-done { opacity: 0.5; }
        .agro-cart-chip-new {
            border-style: dashed;
            color: #C8A752;
        }

        .agro-cart-detail { }

        .agro-cart-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
        }
        .agro-cart-actions { display: flex; gap: 0.4rem; }

        .agro-cart-icon-btn {
            width: 32px; height: 32px;
            border-radius: 50%;
            border: 1px solid rgba(200,167,82,0.3);
            background: transparent;
            color: #C8A752;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            transition: all 0.15s;
        }
        .agro-cart-icon-btn:hover { background: rgba(200,167,82,0.12); }
        .agro-cart-icon-btn-danger { border-color: rgba(239,68,68,0.3); color: #ef4444; }
        .agro-cart-icon-btn-danger:hover { background: rgba(239,68,68,0.12); }

        /* Summary */
        .agro-cart-summary {
            background: rgba(200,167,82,0.06);
            border: 1px solid rgba(200,167,82,0.15);
            border-radius: 12px;
            padding: 0.75rem;
            margin-bottom: 0.75rem;
        }
        .agro-cart-progress-bar {
            height: 6px;
            background: rgba(255,255,255,0.08);
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 0.6rem;
        }
        .agro-cart-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #C8A752, #e0c068);
            border-radius: 3px;
            transition: width 0.3s ease;
        }
        .agro-cart-summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 0.5rem;
            text-align: center;
        }
        .agro-cart-summary-label {
            display: block;
            font-size: 0.65rem;
            color: rgba(255,255,255,0.4);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .agro-cart-summary-value {
            display: block;
            font-size: 1rem;
            font-weight: 700;
            color: #fff;
        }

        /* Items */
        .agro-cart-items { margin-bottom: 0.75rem; }

        .agro-cart-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.6rem 0.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            transition: opacity 0.15s;
        }
        .agro-cart-item.is-purchased { opacity: 0.55; }

        /* Custom checkbox 48px touch */
        .agro-cart-checkbox-label {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px; height: 48px;
            flex-shrink: 0;
            cursor: pointer;
        }
        .agro-cart-checkbox { display: none; }
        .agro-cart-checkbox-custom {
            width: 24px; height: 24px;
            border: 2px solid rgba(200,167,82,0.5);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
        }
        .agro-cart-checkbox:checked + .agro-cart-checkbox-custom {
            background: #C8A752;
            border-color: #C8A752;
        }
        .agro-cart-checkbox:checked + .agro-cart-checkbox-custom::after {
            content: '✓';
            color: #0a0a0a;
            font-size: 0.85rem;
            font-weight: 700;
        }

        .agro-cart-item-info { flex: 1; min-width: 0; }
        .agro-cart-item-name {
            color: #fff;
            font-size: 0.85rem;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .agro-cart-item-meta {
            color: rgba(255,255,255,0.4);
            font-size: 0.7rem;
        }
        .agro-cart-item-price {
            color: #C8A752;
            font-size: 0.8rem;
            font-weight: 600;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .agro-cart-item-actions {
            display: flex;
            gap: 0.25rem;
            flex-shrink: 0;
        }
        .agro-cart-item-btn {
            width: 28px; height: 28px;
            border-radius: 50%;
            border: 1px solid rgba(96,165,250,0.3);
            background: transparent;
            color: #60a5fa;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.65rem;
            transition: all 0.15s;
        }
        .agro-cart-item-btn:hover { background: rgba(96,165,250,0.1); }
        .agro-cart-item-btn-danger { border-color: rgba(239,68,68,0.3); color: #ef4444; }
        .agro-cart-item-btn-danger:hover { background: rgba(239,68,68,0.1); }

        /* Add form */
        .agro-cart-add-form {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 0.75rem;
        }
        .agro-cart-add-title {
            color: rgba(255,255,255,0.5);
            font-size: 0.75rem;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .agro-cart-add-row { margin-bottom: 0.5rem; }
        .agro-cart-add-row-split { display: flex; gap: 0.5rem; }

        .agro-cart-input {
            width: 100%;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 8px;
            padding: 0.6rem 0.75rem;
            color: #fff;
            font-size: 0.85rem;
            font-family: inherit;
            box-sizing: border-box;
            transition: border-color 0.15s;
        }
        .agro-cart-input:focus {
            outline: none;
            border-color: rgba(200,167,82,0.5);
        }
        .agro-cart-input-sm { flex: 1; }
        .agro-cart-input option { background: #1a1a1a; color: #fff; }

        .agro-cart-cur-group { display: flex; gap: 0.3rem; }
        .agro-cart-cur-btn {
            padding: 0.4rem 0.6rem;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.12);
            background: transparent;
            color: rgba(255,255,255,0.6);
            font-size: 0.7rem;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.15s;
        }
        .agro-cart-cur-btn.is-active {
            background: rgba(200,167,82,0.15);
            border-color: #C8A752;
            color: #C8A752;
        }

        .agro-cart-btn-primary {
            padding: 0.6rem 1.2rem;
            border-radius: 10px;
            border: none;
            background: linear-gradient(135deg, #C8A752, #a08a3a);
            color: #0a0a0a;
            font-weight: 700;
            font-size: 0.85rem;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.15s;
        }
        .agro-cart-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }

        .agro-cart-btn-secondary {
            padding: 0.6rem 1.2rem;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.15);
            background: transparent;
            color: rgba(255,255,255,0.7);
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.15s;
        }

        /* Modal overlay */
        .agro-cart-modal-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 10001;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 1rem;
            animation: cartFadeIn 0.2s ease;
        }
        @keyframes cartFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .agro-cart-modal {
            background: #141414;
            border: 1px solid rgba(200,167,82,0.2);
            border-radius: 16px;
            padding: 1.5rem;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }

        @media (max-width: 480px) {
            .agro-cart-summary-value { font-size: 0.85rem; }
            .agro-cart-item-price { font-size: 0.7rem; }
        }
    `;
    document.head.appendChild(style);
}
