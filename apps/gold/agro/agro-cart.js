/**
 * YavlGold V1 — Agro Cart (Carrito de Compras Agrícola)
 * Lista de compras con presupuesto, vinculada a cultivos.
 * Los items se planifican aquí y se registran en Operación Comercial al ejecutarse.
 *
 * Lazy-loaded: only initialized when the Carrito tab is first activated.
 */

import { SUPPORTED_CURRENCIES, initExchangeRates, getRate, convertToUSD, formatCurrencyDisplay } from './agro-exchange.js';
import { openAgroCalculadora } from './agrocalculadora.js';
import { getAgroRuntimeUserId, readBestAgroCrops } from '../assets/js/utils/agroCropsCache.js';

// ============================================================
// STATE
// ============================================================
let _supabase = null;
let _cropsCache = [];
let _exchangeRates = { USD: 1, COP: null, VES: null };
let _initialized = false;
let _carts = [];
let _activeCartId = null;
let _activeCartItems = [];
let _cartListenerAC = null;
let _cartPlanningSnapshot = {
    loading: true,
    todayItems: [],
    upcomingItems: [],
    overdueCount: 0,
    focusCrop: 'Plan general'
};
let _cartPlanningSnapshotPromise = null;
let _cartShellSyncBound = false;
let _pendingCartSubviewFocus = '';
let _cartInlineCalculator = {
    investment: '',
    revenue: '',
    quantity: '',
    result: null
};
const CROP_EMOJI_TOKEN_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
const CROP_TEXT_TOKEN_RE = /[\p{L}\p{N}]/u;
const CART_SUBVIEW_ALLOWED = new Set(['summary', 'planning', 'calculator']);
const INACTIVE_CART_CROP_STATUSES = new Set(['finalizado', 'cancelado', 'harvested', 'cancelled', 'cosechado']);
const CART_OPERATION_REGISTRATION_OPTIONS = Object.freeze([
    Object.freeze({
        value: 'paid',
        label: '✅ Pagado',
        helper: 'Se registra como gasto cerrado.',
        economicType: 'expense',
        status: 'closed',
        successLabel: 'Pagado'
    }),
    Object.freeze({
        value: 'credit',
        label: '💳 Fiado',
        helper: 'Se registra como deuda pendiente.',
        economicType: 'expense',
        status: 'open',
        successLabel: 'Fiado'
    }),
    Object.freeze({
        value: 'donation',
        label: '🎁 Donación',
        helper: 'Se registra como salida sin retorno.',
        economicType: 'donation',
        status: 'closed',
        successLabel: 'Donación'
    }),
    Object.freeze({
        value: 'loss',
        label: '❌ Pérdida',
        helper: 'Se registra como merma o daño.',
        economicType: 'loss',
        status: 'lost',
        successLabel: 'Pérdida'
    })
]);
const CART_OPERATIONAL_CATEGORY = 'supplies';
const CART_OPERATIONAL_UNIT_ALIASES = Object.freeze({
    unidad: 'unidad',
    unidades: 'unidad',
    unit: 'unidad',
    units: 'unidad',
    saco: 'saco',
    sacos: 'saco',
    bag: 'saco',
    bags: 'saco',
    cesta: 'cesta',
    cestas: 'cesta',
    basket: 'cesta',
    baskets: 'cesta',
    kg: 'kg',
    kilo: 'kg',
    kilos: 'kg',
    kilogramo: 'kg',
    kilogramos: 'kg',
    kilogram: 'kg',
    kilograms: 'kg'
});

function isCropEmojiToken(token) {
    const value = String(token || '').trim();
    if (!value) return false;
    return CROP_EMOJI_TOKEN_RE.test(value) && !CROP_TEXT_TOKEN_RE.test(value);
}

function getCropDisplayLabel(crop, fallbackIcon = '🌱', fallbackName = 'Cultivo') {
    const rawName = String(crop?.name || '').trim();
    const tokens = rawName ? rawName.split(/\s+/).filter(Boolean) : [];
    const leadingIcons = [];
    let cursor = 0;

    while (cursor < tokens.length && isCropEmojiToken(tokens[cursor])) {
        leadingIcons.push(tokens[cursor]);
        cursor += 1;
    }

    const iconFromName = leadingIcons.length ? leadingIcons[leadingIcons.length - 1] : '';
    const iconCandidate = iconFromName || String(crop?.icon || '').trim();
    const icon = isCropEmojiToken(iconCandidate) ? iconCandidate : fallbackIcon;
    const cleanName = tokens.slice(cursor).join(' ').trim() || fallbackName;
    return `${icon} ${cleanName}`;
}

// ============================================================
// INIT
// ============================================================

/**
 * @param {object} deps - { supabase, cropsCache }
 */
export async function initAgroCart(deps) {
    if (_initialized) {
        renderCartTab();
        return;
    }
    _supabase = deps.supabase;
    _cropsCache = deps.cropsCache || [];

    // Fetch exchange rates (non-blocking)
    initExchangeRates().then(r => { if (r) _exchangeRates = r; }).catch(() => { });

    _initialized = true;
    bindCartShellSync();
    await loadCarts();
    await refreshCartPlanningSnapshot();
    _pendingCartSubviewFocus = readRequestedCartSubview();
    renderCartTab();
}

/** Update cropsCache externally (when crops reload) */
export function updateCartCrops(crops) {
    _cropsCache = Array.isArray(crops) ? crops : [];
}

function getFallbackCrops() {
    return readBestAgroCrops(getAgroRuntimeUserId());
}

function getAvailableCrops() {
    if (Array.isArray(_cropsCache) && _cropsCache.length) return _cropsCache;
    const fallback = getFallbackCrops();
    if (fallback.length) {
        _cropsCache = fallback;
        return fallback;
    }
    return [];
}

function normalizeCartCropStatus(value) {
    return String(value || '').trim().toLowerCase();
}

function isActiveCartCrop(crop) {
    if (!crop || !crop.id) return false;
    if (crop.actual_harvest_date) return false;
    const override = normalizeCartCropStatus(crop.status_override);
    if (override && INACTIVE_CART_CROP_STATUSES.has(override)) return false;
    const status = normalizeCartCropStatus(crop.status);
    if (status && INACTIVE_CART_CROP_STATUSES.has(status)) return false;
    return true;
}

function getActiveAvailableCrops() {
    return getAvailableCrops().filter(isActiveCartCrop);
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
        const { error } = await _supabase.from('agro_cart').delete().eq('id', cartId);
        if (error) throw error;
        _carts = _carts.filter(c => c.id !== cartId);
        if (_activeCartId === cartId) {
            _activeCartId = _carts.length > 0 ? _carts[0].id : null;
            if (_activeCartId) await loadCartItems(_activeCartId);
            else _activeCartItems = [];
        }
        renderCartTab();
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
        _activeCartItems = Array.isArray(data) ? data.map((item) => normalizeCartItem(item)) : [];
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
        _activeCartItems.push(normalizeCartItem(data));
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
        if (idx !== -1) {
            _activeCartItems[idx] = normalizeCartItem({ ..._activeCartItems[idx], ...updates });
        }
        renderCartTab();
    } catch (err) {
        console.error('[AgroCart] updateItem error:', err.message);
        alert('Error al actualizar: ' + err.message);
    }
}

async function deleteItem(itemId) {
    if (!confirm('¿Eliminar este item?')) return;
    try {
        const { error } = await _supabase.from('agro_cart_items').delete().eq('id', itemId);
        if (error) throw error;
        _activeCartItems = _activeCartItems.filter(i => i.id !== itemId);
        renderCartTab();
    } catch (err) {
        console.error('[AgroCart] deleteItem error:', err.message);
        alert('Error al eliminar: ' + err.message);
    }
}

async function handleRegisterPurchase(itemId, option) {
    const item = _activeCartItems.find(i => i.id === itemId);
    if (!item) return;
    if (isProcessedItem(item)) {
        notifyCart('Este item ya fue procesado en Operación Comercial.', 'warning');
        return;
    }

    const cart = _carts.find(c => c.id === _activeCartId);

    try {
        const bridge = await ensureOperationalBridge();
        const payload = buildOperationalPayloadFromCart(cart, item, option);
        const result = await bridge.createFromPayload(payload);
        const processedAt = new Date().toISOString();
        const operationId = String(result?.cycleId || '').trim() || null;
        const { error } = await _supabase
            .from('agro_cart_items')
            .update({
                purchased: true,
                purchased_at: processedAt,
                expense_id: operationId
            })
            .eq('id', itemId);
        if (error) throw error;
        syncCartItemState(item, {
            processed: true,
            processed_at: processedAt,
            operation_id: operationId
        });
        renderCartTab();
        notifyCart(`Item registrado en Operación Comercial como ${option.successLabel}.`, 'success');
    } catch (err) {
        console.error('[AgroCart] handleRegisterPurchase error:', err.message);
        notifyCart(`Error al registrar compra: ${err.message}`, 'error');
    }
}

// ============================================================
// SUMMARY
// ============================================================

function computeSummary(items) {
    let totalUsd = 0;
    let processedUsd = 0;
    const byCurrency = {};

    for (const item of items) {
        const cur = item.currency || 'USD';
        const monto = getCartItemTotalAmount(item);
        const usd = getCartItemTotalUsd(item);
        if (!byCurrency[cur]) byCurrency[cur] = { total: 0, processed: 0 };
        byCurrency[cur].total += monto;
        if (isProcessedItem(item)) byCurrency[cur].processed += monto;
        totalUsd += usd;
        if (isProcessedItem(item)) processedUsd += usd;
    }
    return {
        totalUsd,
        processedUsd,
        remainingUsd: totalUsd - processedUsd,
        progress: totalUsd > 0 ? (processedUsd / totalUsd) * 100 : 0,
        byCurrency,
        totalItems: items.length,
        processedItems: items.filter((item) => isProcessedItem(item)).length
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
        const check = isProcessedItem(item) ? '☑ Procesado' : '☐ Pendiente';
        const price = formatCurrencyDisplay(getCartItemTotalAmount(item), item.currency, getCartItemTotalUsd(item));
        md += `| ${i + 1} | ${check} | ${item.name} | ${item.quantity} | ${item.unit} | ${price} | $${getCartItemTotalUsd(item).toFixed(2)} |\n`;
    });

    md += `\n## Resumen\n\n`;
    md += `- **Total:** $${summary.totalUsd.toFixed(2)} USD\n`;
    md += `- **Procesado:** $${summary.processedUsd.toFixed(2)} USD (${summary.processedItems}/${summary.totalItems})\n`;
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
    return crop ? getCropDisplayLabel(crop) : 'Cultivo';
}

function todayLocalIso() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function normalizeCartSubview(value) {
    const token = String(value || '').trim().toLowerCase();
    return CART_SUBVIEW_ALLOWED.has(token) ? token : 'summary';
}

function readRequestedCartSubview() {
    return normalizeCartSubview(document.body?.dataset?.agroSubview || 'summary');
}

function formatCartAgendaDateLabel(dateStr) {
    const safeDate = String(dateStr || '').trim();
    if (!safeDate) return 'Sin fecha';
    const today = todayLocalIso();
    if (safeDate === today) return 'Hoy';

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);
    if (safeDate === tomorrowIso) return 'Mañana';

    const [year, month, day] = safeDate.split('-').map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return safeDate;
    }

    const date = new Date(year, month - 1, day);
    const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${weekdayNames[date.getDay()]} ${day} ${monthNames[month - 1] || ''}`.trim();
}

function normalizeCartItem(item = {}) {
    const processed = Boolean(item?.processed ?? item?.purchased);
    const processedAt = item?.processed_at || item?.purchased_at || null;
    const operationId = item?.operation_id || item?.expense_id || null;
    return {
        ...item,
        processed,
        processed_at: processedAt,
        operation_id: operationId,
        purchased: processed,
        purchased_at: processedAt,
        expense_id: operationId
    };
}

function isProcessedItem(item) {
    return Boolean(item?.processed || item?.purchased);
}

function syncCartItemState(item, updates = {}) {
    if (!item) return null;
    Object.assign(item, normalizeCartItem({ ...item, ...updates }));
    return item;
}

function getCartItemQuantity(item) {
    const quantity = Number(item?.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function getCartItemUnitAmount(item) {
    return Number(item?.monto) || 0;
}

function getCartItemUnitUsd(item) {
    return Number(item?.monto_usd) || 0;
}

function getCartItemTotalAmount(item) {
    return getCartItemUnitAmount(item) * getCartItemQuantity(item);
}

function getCartItemTotalUsd(item) {
    return getCartItemUnitUsd(item) * getCartItemQuantity(item);
}

function normalizeOperationalUnit(unit) {
    const token = String(unit || '').trim().toLowerCase();
    return CART_OPERATIONAL_UNIT_ALIASES[token] || null;
}

function formatProcessedDate(value) {
    if (!value) return 'Procesado';
    try {
        return `Procesado ${new Date(value).toLocaleDateString()}`;
    } catch {
        return 'Procesado';
    }
}

function notifyCart(message, type = 'info') {
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    alert(message);
}

async function ensureOperationalBridge() {
    if (typeof window !== 'undefined' && typeof window.YGAgroOperationalCycles?.createFromPayload === 'function') {
        return window.YGAgroOperationalCycles;
    }

    const mod = await import('./agroOperationalCycles.js');
    if (typeof mod.initAgroOperationalCycles === 'function') {
        await mod.initAgroOperationalCycles({ initialUserId: getAgroRuntimeUserId() || undefined });
    }

    if (typeof window !== 'undefined' && typeof window.YGAgroOperationalCycles?.createFromPayload === 'function') {
        return window.YGAgroOperationalCycles;
    }

    throw new Error('Operación Comercial no está disponible en este momento.');
}

function buildOperationalPayloadFromCart(cart, item, option) {
    const quantity = getCartItemQuantity(item);
    const unitType = normalizeOperationalUnit(item?.unit);
    const lineAmount = getCartItemTotalAmount(item);
    const descriptionParts = [
        `Registrado desde Mi Carrito: ${cart?.name || 'Carrito'}`,
        cart?.notes ? `Notas del carrito: ${cart.notes}` : '',
        quantity > 0 && item?.unit ? `Cantidad planeada: ${quantity} ${item.unit}` : ''
    ].filter(Boolean);

    return {
        name: String(item?.name || '').trim(),
        description: descriptionParts.join(' · '),
        economicType: option.economicType,
        category: CART_OPERATIONAL_CATEGORY,
        cropId: cart?.crop_id || null,
        amount: lineAmount > 0 ? Number(lineAmount.toFixed(2)) : null,
        currency: String(item?.currency || 'COP').trim().toUpperCase(),
        movementDate: todayLocalIso(),
        quantity: unitType ? quantity : null,
        unitType,
        status: option.status
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
}

function fmtCur(monto, currency, montoUsd) {
    return formatCurrencyDisplay(monto, currency, montoUsd);
}

async function refreshCartPlanningSnapshot() {
    if (!_supabase) return _cartPlanningSnapshot;
    if (_cartPlanningSnapshotPromise) return _cartPlanningSnapshotPromise;

    _cartPlanningSnapshotPromise = (async () => {
        try {
            const { data: { user } } = await _supabase.auth.getUser();
            if (!user) {
                _cartPlanningSnapshot = {
                    loading: false,
                    todayItems: [],
                    upcomingItems: [],
                    overdueCount: 0,
                    focusCrop: 'Plan general'
                };
                return _cartPlanningSnapshot;
            }

            const today = todayLocalIso();
            const [agendaRes, overdueRes] = await Promise.all([
                _supabase
                    .from('agro_agenda')
                    .select('id, title, scheduled_date, scheduled_time, crop_id, notes, completed')
                    .eq('user_id', user.id)
                    .eq('completed', false)
                    .gte('scheduled_date', today)
                    .order('scheduled_date', { ascending: true })
                    .order('scheduled_time', { ascending: true })
                    .limit(6),
                _supabase
                    .from('agro_agenda')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('completed', false)
                    .lt('scheduled_date', today)
            ]);

            if (agendaRes.error) throw agendaRes.error;
            if (overdueRes.error) throw overdueRes.error;

            const upcomingSource = Array.isArray(agendaRes.data) ? agendaRes.data : [];
            const todayItems = upcomingSource.filter((item) => String(item?.scheduled_date || '') === today).slice(0, 3);
            const upcomingItems = upcomingSource.filter((item) => String(item?.scheduled_date || '') > today).slice(0, 3);
            const focusItem = [...todayItems, ...upcomingItems].find((item) => String(item?.crop_id || '').trim());

            _cartPlanningSnapshot = {
                loading: false,
                todayItems,
                upcomingItems,
                overdueCount: Number(overdueRes.count) || 0,
                focusCrop: focusItem ? getCropName(focusItem.crop_id) : 'Plan general'
            };
        } catch (err) {
            console.warn('[AgroCart] planning snapshot error:', err?.message || err);
            _cartPlanningSnapshot = {
                loading: false,
                todayItems: [],
                upcomingItems: [],
                overdueCount: 0,
                focusCrop: 'Plan general'
            };
        } finally {
            _cartPlanningSnapshotPromise = null;
        }

        return _cartPlanningSnapshot;
    })();

    return _cartPlanningSnapshotPromise;
}

function bindCartShellSync() {
    if (_cartShellSyncBound) return;
    _cartShellSyncBound = true;

    window.addEventListener('agro:shell:view-changed', (event) => {
        if (event.detail?.view !== 'carrito') return;
        _pendingCartSubviewFocus = normalizeCartSubview(event.detail?.subview || readRequestedCartSubview());
        refreshCartPlanningSnapshot().then(() => {
            if (_initialized) renderCartTab();
        }).catch(() => {
            if (_initialized) renderCartTab();
        });
    });
}

function focusPendingCartSubview() {
    if (!_pendingCartSubviewFocus) return;
    const subview = normalizeCartSubview(_pendingCartSubviewFocus);
    _pendingCartSubviewFocus = '';
    if (subview === 'summary') return;

    const panelId = subview === 'planning'
        ? 'agro-cart-planning-panel'
        : 'agro-cart-calculator-panel';
    const panel = document.getElementById(panelId);
    if (!panel) return;

    document.querySelectorAll('.agro-cart-mini.is-focus-target').forEach((node) => {
        node.classList.remove('is-focus-target');
    });
    panel.classList.add('is-focus-target');

    panel.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
        inline: 'nearest'
    });

    const focusable = panel.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable && typeof focusable.focus === 'function') {
        requestAnimationFrame(() => {
            focusable.focus({ preventScroll: true });
        });
    }

    window.setTimeout(() => {
        panel.classList.remove('is-focus-target');
    }, 1400);
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
    requestAnimationFrame(() => {
        focusPendingCartSubview();
    });
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
    const pendingItems = items.filter((item) => !isProcessedItem(item));
    const processedItems = items.filter((item) => isProcessedItem(item));
    const itemsHtml = `
        ${renderCartItemsSection({
            title: 'Pendientes por ejecutar',
            helper: 'Planificados en carrito, aún sin registro contable.',
            items: pendingItems,
            emptyCopy: processedItems.length
                ? 'Todo lo pendiente de este carrito ya fue registrado.'
                : 'Sin items aún. Agrega uno abajo.'
        })}
        ${processedItems.length ? renderCartItemsSection({
            title: 'Procesados',
            helper: 'Trazabilidad de lo ya registrado en Operación Comercial.',
            items: processedItems,
            variant: 'processed'
        }) : ''}
    `;

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
                        <span class="agro-cart-summary-label">Procesado</span>
                        <span class="agro-cart-summary-value" style="color: #4ade80;">$${summary.processedUsd.toFixed(2)}</span>
                    </div>
                    <div class="agro-cart-summary-item">
                        <span class="agro-cart-summary-label">Falta</span>
                        <span class="agro-cart-summary-value" style="color: #f59e0b;">$${summary.remainingUsd.toFixed(2)}</span>
                    </div>
                </div>
                <div style="text-align: center; font-size: 0.7rem; color: rgba(255,255,255,0.35); margin-top: 0.25rem;">
                    ${summary.processedItems}/${summary.totalItems} items procesados
                </div>
            </div>

            ${renderCartWorkspacePanels()}

            <!-- Items -->
            <div class="agro-cart-items">
                ${itemsHtml || '<div style="text-align: center; color: rgba(255,255,255,0.4); padding: 1.5rem; font-size: 0.85rem;">Sin items aún. Agrega uno abajo.</div>'}
            </div>

            <!-- Add item form -->
            ${cart.status === 'activo' ? renderAddItemForm() : ''}
        </div>
    `;
}

function renderCartItemsSection({ title, helper, items, emptyCopy, variant = '' }) {
    const body = items.length
        ? items.map((item) => renderCartItem(item)).join('')
        : `<div class="agro-cart-items-empty">${escapeHtml(emptyCopy || 'Sin items en esta sección.')}</div>`;
    const variantClass = variant ? ` agro-cart-items-section--${variant}` : '';
    return `
        <section class="agro-cart-items-section${variantClass}">
            <div class="agro-cart-items-section__head">
                <div>
                    <strong class="agro-cart-items-section__title">${escapeHtml(title)}</strong>
                    <p class="agro-cart-items-section__copy">${escapeHtml(helper || '')}</p>
                </div>
                <span class="agro-cart-items-section__count">${items.length}</span>
            </div>
            <div class="agro-cart-items-section__body">${body}</div>
        </section>
    `;
}

function renderCartItem(item) {
    const processed = isProcessedItem(item);
    const lineThrough = processed ? 'text-decoration: line-through; opacity: 0.6;' : '';
    const quantity = getCartItemQuantity(item);
    const unitPrice = fmtCur(getCartItemUnitAmount(item), item.currency, getCartItemUnitUsd(item));
    const totalPrice = fmtCur(getCartItemTotalAmount(item), item.currency, getCartItemTotalUsd(item));
    const statusNode = processed
        ? `<span class="agro-cart-item-pill agro-cart-item-pill--processed">Procesado</span>`
        : `<button type="button" class="agro-cart-register-btn" data-action="register-purchase" data-item-id="${item.id}"><i class="fa-solid fa-receipt" aria-hidden="true"></i><span>Registrar compra</span></button>`;
    const supportMeta = processed
        ? `<div class="agro-cart-item-meta agro-cart-item-meta--processed">${escapeHtml(formatProcessedDate(item.processed_at))}</div>`
        : (quantity > 1 ? `<div class="agro-cart-item-meta agro-cart-item-meta--secondary">Unitario ${escapeHtml(unitPrice)}</div>` : '');

    return `
        <div class="agro-cart-item ${processed ? 'is-processed' : ''}" data-item-id="${item.id}">
            <div class="agro-cart-item-info" style="${lineThrough}">
                <div class="agro-cart-item-name">${escapeHtml(item.name)}</div>
                <div class="agro-cart-item-meta">${quantity} ${escapeHtml(item.unit || 'unidad')}</div>
                ${supportMeta}
            </div>
            <div class="agro-cart-item-price">${escapeHtml(totalPrice)}</div>
            <div class="agro-cart-item-actions">
                ${statusNode}
                ${processed ? '' : '<button type="button" class="agro-cart-item-btn" data-action="edit-item" data-item-id="' + item.id + '" title="Editar"><i class="fa fa-pen"></i></button>'}
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

function renderCartWorkspacePanels() {
    return `
        <section class="agro-cart-workspace" aria-label="Accesos rápidos de agenda y cálculo dentro de Mi Carrito">
            ${renderCartPlanningPanel()}
            ${renderCartCalculatorPanel()}
        </section>
    `;
}

function renderCartPlanningPanel() {
    const snapshot = _cartPlanningSnapshot || {};
    const todayItems = Array.isArray(snapshot.todayItems) ? snapshot.todayItems : [];
    const upcomingItems = Array.isArray(snapshot.upcomingItems) ? snapshot.upcomingItems : [];
    const previewItems = todayItems.length ? todayItems : upcomingItems;
    const statusCopy = snapshot.loading
        ? 'Leyendo planificación activa...'
        : `Hoy ${todayItems.length} · Próximas ${upcomingItems.length} · Atrasos ${Number(snapshot.overdueCount) || 0}`;
    const helperCopy = snapshot.loading
        ? 'Sincronizando agenda operativa para no sacar esta lectura del carrito.'
        : `Contexto actual: ${escapeHtml(snapshot.focusCrop || 'Plan general')}.`;
    const listBody = previewItems.length
        ? previewItems.map((item) => {
            const cropName = getCropName(item.crop_id);
            const time = item?.scheduled_time ? ` · ${String(item.scheduled_time).slice(0, 5)}` : '';
            return `
                <li class="agro-cart-mini-list__item">
                    <span class="agro-cart-mini-list__date">${escapeHtml(formatCartAgendaDateLabel(item.scheduled_date))}</span>
                    <div class="agro-cart-mini-list__content">
                        <strong>${escapeHtml(item.title || 'Actividad')}</strong>
                        <span>${escapeHtml(cropName)}${escapeHtml(time)}</span>
                    </div>
                </li>
            `;
        }).join('')
        : `<div class="agro-cart-mini-state">${snapshot.loading
            ? 'Cargando resumen de agenda...'
            : 'Sin actividades inmediatas. La planificación queda despejada por ahora.'}</div>`;

    return `
        <article class="agro-cart-mini agro-cart-mini--planning" id="agro-cart-planning-panel" tabindex="-1">
            <div class="agro-cart-mini__head">
                <div class="agro-cart-mini__copywrap">
                    <p class="agro-cart-mini__eyebrow">Planificación</p>
                    <h4 class="agro-cart-mini__title">Agenda operativa</h4>
                    <p class="agro-cart-mini__copy">${helperCopy}</p>
                </div>
                <div class="agro-cart-mini__actions">
                    <button type="button" class="agro-cart-mini-btn" data-action="open-agenda-view" id="agro-cart-planning-open-btn">
                        <i class="fa-solid fa-calendar-days" aria-hidden="true"></i><span>Agenda completa</span>
                    </button>
                </div>
            </div>
            <div class="agro-cart-mini-stats">
                <span class="agro-cart-mini-stat"><strong>Hoy</strong>${todayItems.length}</span>
                <span class="agro-cart-mini-stat"><strong>Próximas</strong>${upcomingItems.length}</span>
                <span class="agro-cart-mini-stat"><strong>Atrasos</strong>${Number(snapshot.overdueCount) || 0}</span>
            </div>
            <p class="agro-cart-mini__status">${statusCopy}</p>
            <div class="agro-cart-mini-list">
                <ul class="agro-cart-mini-list__wrap">${listBody.includes('<li') ? listBody : ''}</ul>
                ${listBody.includes('<li') ? '' : listBody}
            </div>
        </article>
    `;
}

function computeInlineCartRoiResult() {
    const investment = Number(_cartInlineCalculator.investment) || 0;
    const revenue = Number(_cartInlineCalculator.revenue) || 0;
    const quantity = Number(_cartInlineCalculator.quantity) || 0;
    if (investment <= 0 && revenue <= 0) return null;

    const profit = revenue - investment;
    const roi = investment > 0 ? (profit / investment) * 100 : 0;
    const marginPerUnit = quantity > 0 ? profit / quantity : null;

    return {
        investment,
        revenue,
        quantity,
        profit,
        roi,
        marginPerUnit
    };
}

function renderCartCalculatorPanel() {
    const result = _cartInlineCalculator.result;
    const valueInvestment = escapeHtml(_cartInlineCalculator.investment || '');
    const valueRevenue = escapeHtml(_cartInlineCalculator.revenue || '');
    const valueQuantity = escapeHtml(_cartInlineCalculator.quantity || '');
    const resultBody = result
        ? `
            <div class="agro-cart-inline-roi__result-grid">
                <div class="agro-cart-inline-roi__result-item">
                    <span>ROI</span>
                    <strong class="${result.roi >= 0 ? 'is-positive' : 'is-negative'}">${result.roi.toFixed(1)}%</strong>
                </div>
                <div class="agro-cart-inline-roi__result-item">
                    <span>Ganancia</span>
                    <strong class="${result.profit >= 0 ? 'is-positive' : 'is-negative'}">$${result.profit.toFixed(2)}</strong>
                </div>
                <div class="agro-cart-inline-roi__result-item">
                    <span>$/kg</span>
                    <strong>${result.marginPerUnit != null ? `$${result.marginPerUnit.toFixed(2)}` : '—'}</strong>
                </div>
            </div>
        `
        : `<div class="agro-cart-mini-state">Carga inversión y venta para leer rentabilidad sin salir del carrito.</div>`;

    return `
        <article class="agro-cart-mini agro-cart-mini--calculator" id="agro-cart-calculator-panel" tabindex="-1">
            <div class="agro-cart-mini__head">
                <div class="agro-cart-mini__copywrap">
                    <p class="agro-cart-mini__eyebrow">Cálculo rápido</p>
                    <h4 class="agro-cart-mini__title">Calculadora</h4>
                    <p class="agro-cart-mini__copy">Lectura compacta para validar margen antes de registrar o comprar.</p>
                </div>
                <div class="agro-cart-mini__actions">
                    <button type="button" class="agro-cart-mini-btn agro-cart-mini-btn--ghost" data-action="open-calculator-modal">
                        <i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i><span>Modal completa</span>
                    </button>
                </div>
            </div>
            <div class="agro-cart-inline-roi">
                <div class="agro-cart-inline-roi__fields">
                    <label class="agro-cart-inline-roi__field">
                        <span>Inversión</span>
                        <input type="number" id="agro-cart-roi-investment" class="agro-cart-input" min="0" step="0.01" inputmode="decimal" value="${valueInvestment}" placeholder="0.00">
                    </label>
                    <label class="agro-cart-inline-roi__field">
                        <span>Venta</span>
                        <input type="number" id="agro-cart-roi-revenue" class="agro-cart-input" min="0" step="0.01" inputmode="decimal" value="${valueRevenue}" placeholder="0.00">
                    </label>
                    <label class="agro-cart-inline-roi__field">
                        <span>Cantidad kg</span>
                        <input type="number" id="agro-cart-roi-quantity" class="agro-cart-input" min="0" step="0.01" inputmode="decimal" value="${valueQuantity}" placeholder="0">
                    </label>
                </div>
                <div class="agro-cart-inline-roi__actions">
                    <button type="button" class="agro-cart-mini-btn agro-cart-mini-btn--primary" data-action="calculate-inline-roi">
                        <i class="fa-solid fa-bolt" aria-hidden="true"></i><span>Calcular</span>
                    </button>
                    <button type="button" class="agro-cart-mini-btn" data-action="clear-inline-roi">
                        <i class="fa-solid fa-rotate-left" aria-hidden="true"></i><span>Limpiar</span>
                    </button>
                </div>
                ${resultBody}
            </div>
        </article>
    `;
}

function renderNewCartModal() {
    const overlay = document.createElement('div');
    overlay.className = 'agro-cart-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'agro-cart-modal';

    const title = document.createElement('h3');
    title.style.cssText = 'color: #fff; margin: 0 0 1rem;';
    title.textContent = '🛒 Nuevo Carrito';
    modal.appendChild(title);

    const nameRow = document.createElement('div');
    nameRow.className = 'agro-cart-add-row';
    const nameLabel = document.createElement('label');
    nameLabel.style.cssText = 'color: rgba(255,255,255,0.6); font-size: 0.8rem;';
    nameLabel.textContent = 'Nombre *';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'agro-cart-input';
    nameInput.id = 'new-cart-name';
    nameInput.placeholder = 'Ej: Siembra de Pepino';
    nameInput.autocomplete = 'off';
    nameRow.append(nameLabel, nameInput);
    modal.appendChild(nameRow);

    const cropRow = document.createElement('div');
    cropRow.className = 'agro-cart-add-row';
    const cropLabel = document.createElement('label');
    cropLabel.style.cssText = 'color: rgba(255,255,255,0.6); font-size: 0.8rem;';
    cropLabel.textContent = 'Cultivo';
    const cropSelect = document.createElement('select');
    cropSelect.className = 'agro-cart-input';
    cropSelect.id = 'new-cart-crop';
    const generalOpt = document.createElement('option');
    generalOpt.value = '';
    generalOpt.textContent = 'Sin cultivo / General';
    cropSelect.appendChild(generalOpt);

    getActiveAvailableCrops().forEach((c) => {
        const opt = document.createElement('option');
        opt.value = String(c?.id || '');
        const cropName = String(c?.name || 'Cultivo');
        const cropVariety = String(c?.variety || '').trim();
        const cropIcon = String(c?.icon || '🌱');
        opt.textContent = `${cropIcon} ${cropName}${cropVariety ? ` (${cropVariety})` : ''}`;
        cropSelect.appendChild(opt);
    });
    cropRow.append(cropLabel, cropSelect);
    modal.appendChild(cropRow);

    const notesRow = document.createElement('div');
    notesRow.className = 'agro-cart-add-row';
    const notesLabel = document.createElement('label');
    notesLabel.style.cssText = 'color: rgba(255,255,255,0.6); font-size: 0.8rem;';
    notesLabel.textContent = 'Notas (opcional)';
    const notesInput = document.createElement('input');
    notesInput.type = 'text';
    notesInput.className = 'agro-cart-input';
    notesInput.id = 'new-cart-notes';
    notesInput.placeholder = 'Ej: Para la próxima cosecha';
    notesInput.autocomplete = 'off';
    notesRow.append(notesLabel, notesInput);
    modal.appendChild(notesRow);

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 1rem;';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'agro-cart-btn-secondary';
    cancelBtn.dataset.action = 'cancel-modal';
    cancelBtn.style.flex = '1';
    cancelBtn.textContent = 'Cancelar';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'agro-cart-btn-primary';
    confirmBtn.dataset.action = 'confirm-create';
    confirmBtn.style.flex = '1';
    confirmBtn.textContent = 'Crear carrito';

    actions.append(cancelBtn, confirmBtn);
    modal.appendChild(actions);
    overlay.appendChild(modal);

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
    const overlay = document.createElement('div');
    overlay.className = 'agro-cart-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'agro-cart-modal';

    const title = document.createElement('h3');
    title.style.cssText = 'color: #fff; margin: 0 0 1rem;';
    title.textContent = '✏️ Editar Item';
    modal.appendChild(title);

    const makeLabel = (text) => {
        const label = document.createElement('label');
        label.style.cssText = 'color: rgba(255,255,255,0.6); font-size: 0.8rem;';
        label.textContent = text;
        return label;
    };

    const nameRow = document.createElement('div');
    nameRow.className = 'agro-cart-add-row';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'agro-cart-input';
    nameInput.id = 'edit-item-name';
    nameInput.value = String(item?.name || '');
    nameInput.autocomplete = 'off';
    nameRow.append(makeLabel('Nombre'), nameInput);
    modal.appendChild(nameRow);

    const splitRow = document.createElement('div');
    splitRow.className = 'agro-cart-add-row agro-cart-add-row-split';

    const qtyWrap = document.createElement('div');
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'agro-cart-input';
    qtyInput.id = 'edit-item-qty';
    qtyInput.value = String(item?.quantity ?? 1);
    qtyInput.min = '0.1';
    qtyInput.step = '0.1';
    qtyInput.inputMode = 'decimal';
    qtyWrap.append(makeLabel('Cantidad'), qtyInput);

    const unitWrap = document.createElement('div');
    const unitInput = document.createElement('input');
    unitInput.type = 'text';
    unitInput.className = 'agro-cart-input';
    unitInput.id = 'edit-item-unit';
    unitInput.value = String(item?.unit || '');
    unitInput.autocomplete = 'off';
    unitWrap.append(makeLabel('Unidad'), unitInput);

    splitRow.append(qtyWrap, unitWrap);
    modal.appendChild(splitRow);

    const priceRow = document.createElement('div');
    priceRow.className = 'agro-cart-add-row';
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'agro-cart-input';
    priceInput.id = 'edit-item-price';
    priceInput.value = String(item?.monto ?? 0);
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.inputMode = 'decimal';
    priceRow.append(makeLabel('Precio'), priceInput);
    modal.appendChild(priceRow);

    const currencyRow = document.createElement('div');
    currencyRow.className = 'agro-cart-add-row';
    const currencyGroup = document.createElement('div');
    currencyGroup.className = 'agro-cart-cur-group';
    currencyGroup.id = 'edit-item-cur-group';

    Object.entries(SUPPORTED_CURRENCIES).forEach(([code, cfg]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `agro-cart-cur-btn${code === (item.currency || 'USD') ? ' is-active' : ''}`;
        btn.dataset.currency = code;
        btn.textContent = `${cfg.flag} ${code}`;
        currencyGroup.appendChild(btn);
    });
    currencyRow.append(makeLabel('Moneda'), currencyGroup);
    modal.appendChild(currencyRow);

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 1rem;';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'agro-cart-btn-secondary';
    cancelBtn.dataset.action = 'cancel-modal';
    cancelBtn.style.flex = '1';
    cancelBtn.textContent = 'Cancelar';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'agro-cart-btn-primary';
    saveBtn.dataset.action = 'confirm-edit';
    saveBtn.style.flex = '1';
    saveBtn.textContent = 'Guardar';
    actions.append(cancelBtn, saveBtn);
    modal.appendChild(actions);

    overlay.appendChild(modal);

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

function renderPurchaseStateModal(item) {
    const overlay = document.createElement('div');
    overlay.className = 'agro-cart-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'agro-cart-modal agro-cart-modal--purchase-state';
    modal.innerHTML = `
        <p class="agro-cart-modal__eyebrow">Operación Comercial</p>
        <h3 class="agro-cart-modal__title">¿Cómo se registró esta compra?</h3>
        <p class="agro-cart-modal__copy">
            <strong>${escapeHtml(item?.name || 'Item')}</strong><br>
            Selecciona el estado real para enviar este item desde Mi Carrito hacia Operación Comercial.
        </p>
        <div class="agro-cart-modal__options">
            ${CART_OPERATION_REGISTRATION_OPTIONS.map((option) => `
                <button type="button" class="agro-cart-modal__option" data-registration-option="${option.value}">
                    <strong>${escapeHtml(option.label)}</strong>
                    <span>${escapeHtml(option.helper)}</span>
                </button>
            `).join('')}
        </div>
        <div class="agro-cart-modal__actions">
            <button type="button" class="agro-cart-btn-secondary" data-action="cancel-modal">Cancelar</button>
        </div>
    `;

    overlay.appendChild(modal);
    overlay.addEventListener('click', async (event) => {
        if (event.target === overlay || event.target.closest('[data-action="cancel-modal"]')) {
            overlay.remove();
            return;
        }

        const optionButton = event.target.closest('[data-registration-option]');
        if (!optionButton) return;

        const option = CART_OPERATION_REGISTRATION_OPTIONS.find((entry) => entry.value === optionButton.dataset.registrationOption);
        if (!option) return;

        overlay.remove();
        await handleRegisterPurchase(item.id, option);
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

        if (action === 'open-agenda-view') {
            window.dispatchEvent(new CustomEvent('agro:shell:set-view', {
                detail: { view: 'agenda', scroll: true }
            }));
            return;
        }

        if (action === 'open-calculator-modal') {
            openAgroCalculadora(actionEl);
            return;
        }

        if (action === 'calculate-inline-roi') {
            _cartInlineCalculator.result = computeInlineCartRoiResult();
            _pendingCartSubviewFocus = 'calculator';
            renderCartTab();
            return;
        }

        if (action === 'clear-inline-roi') {
            _cartInlineCalculator = {
                investment: '',
                revenue: '',
                quantity: '',
                result: null
            };
            _pendingCartSubviewFocus = 'calculator';
            renderCartTab();
            return;
        }

        if (action === 'new-cart') { renderNewCartModal(); return; }
        if (action === 'delete-cart') { deleteCart(_activeCartId); return; }
        if (action === 'export-cart') { exportCartMD(_activeCartId); return; }
        if (action === 'complete-cart') { updateCartStatus(_activeCartId, 'completado'); return; }

        if (action === 'register-purchase') {
            const itemId = actionEl.dataset.itemId;
            const item = _activeCartItems.find(i => i.id === itemId);
            if (item) renderPurchaseStateModal(item);
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
            if (!item) return;
            if (isProcessedItem(item)) {
                notifyCart('Este item ya fue procesado. Edita la operación desde Operación Comercial.', 'warning');
                return;
            }
            renderEditItemModal(item);
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

    container.addEventListener('input', (e) => {
        const field = e.target;
        if (!(field instanceof HTMLInputElement)) return;
        if (field.id === 'agro-cart-roi-investment') {
            _cartInlineCalculator.investment = field.value;
            return;
        }
        if (field.id === 'agro-cart-roi-revenue') {
            _cartInlineCalculator.revenue = field.value;
            return;
        }
        if (field.id === 'agro-cart-roi-quantity') {
            _cartInlineCalculator.quantity = field.value;
        }
    }, { signal });
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
            border: 1px solid var(--v10-border-gold, rgba(200,167,82,0.25));
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
            border-color: var(--v10-gold-4, #C8A752);
            color: var(--v10-gold-4, #C8A752);
            font-weight: 600;
        }
        .agro-cart-chip.is-done { opacity: 0.5; }
        .agro-cart-chip-new {
            border-style: dashed;
            color: var(--v10-gold-4, #C8A752);
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
            border: 1px solid var(--v10-border-gold, rgba(200,167,82,0.25));
            background: transparent;
            color: var(--v10-gold-4, #C8A752);
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
            border: 1px solid var(--v10-border-prestige, rgba(229,213,160,0.18));
            border-radius: var(--radius-md, 12px);
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
            background: var(--v10-metallic-btn, linear-gradient(135deg, #6b5a3e, #C8A752, #E8D48B, #C8A752, #6b5a3e));
            background-size: 200% 100%;
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

        .agro-cart-workspace {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.75rem;
            margin-bottom: 0.9rem;
        }
        .agro-cart-mini {
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 14px;
            background:
                linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)),
                var(--bg-3, #111113);
            padding: 0.95rem;
            transition: box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease;
        }
        .agro-cart-mini.is-focus-target {
            border-color: var(--v10-gold-4, #C8A752);
            box-shadow: 0 0 0 1px rgba(200,167,82,0.22), 0 10px 24px rgba(200,167,82,0.12);
        }
        .agro-cart-mini--planning {
            border-color: rgba(200,167,82,0.18);
        }
        .agro-cart-mini__head {
            display: flex;
            justify-content: space-between;
            gap: 0.75rem;
            align-items: flex-start;
            margin-bottom: 0.8rem;
        }
        .agro-cart-mini__copywrap {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 0.18rem;
        }
        .agro-cart-mini__eyebrow {
            margin: 0;
            color: var(--v10-gold-4, #C8A752);
            font-family: 'Orbitron', sans-serif;
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .agro-cart-mini__title {
            margin: 0;
            color: #fff;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.95rem;
            line-height: 1.25;
        }
        .agro-cart-mini__copy,
        .agro-cart-mini__status {
            margin: 0;
            color: rgba(255,255,255,0.62);
            font-size: 0.78rem;
            line-height: 1.45;
        }
        .agro-cart-mini__actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.4rem;
            flex-shrink: 0;
        }
        .agro-cart-mini-btn {
            min-height: 38px;
            border-radius: 10px;
            border: 1px solid rgba(200,167,82,0.22);
            background: rgba(200,167,82,0.06);
            color: var(--v10-gold-4, #C8A752);
            padding: 0.45rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 700;
            font-family: inherit;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            cursor: pointer;
            transition: background 180ms ease, border-color 180ms ease, transform 180ms ease, color 180ms ease;
        }
        .agro-cart-mini-btn:hover {
            background: rgba(200,167,82,0.12);
            border-color: rgba(200,167,82,0.36);
            transform: translateY(-1px);
        }
        .agro-cart-mini-btn--primary {
            background: var(--v10-metallic-btn, linear-gradient(135deg, #6b5a3e, #C8A752, #E8D48B, #C8A752, #6b5a3e));
            color: var(--bg-1, #0a0a0a);
            border-color: transparent;
        }
        .agro-cart-mini-btn--ghost {
            background: transparent;
        }
        .agro-cart-mini-stats {
            display: flex;
            flex-wrap: wrap;
            gap: 0.45rem;
            margin-bottom: 0.6rem;
        }
        .agro-cart-mini-stat {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            min-height: 30px;
            padding: 0.25rem 0.6rem;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.03);
            color: rgba(255,255,255,0.72);
            font-size: 0.72rem;
        }
        .agro-cart-mini-stat strong {
            color: var(--v10-gold-4, #C8A752);
            font-size: 0.68rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .agro-cart-mini-list {
            margin-top: 0.75rem;
        }
        .agro-cart-mini-list__wrap {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .agro-cart-mini-list__item {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 0.65rem;
            align-items: flex-start;
            padding: 0.6rem 0.7rem;
            border-radius: 10px;
            background: rgba(255,255,255,0.025);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .agro-cart-mini-list__date {
            color: var(--v10-gold-4, #C8A752);
            font-size: 0.72rem;
            font-weight: 700;
            white-space: nowrap;
        }
        .agro-cart-mini-list__content {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 0.15rem;
        }
        .agro-cart-mini-list__content strong {
            color: #fff;
            font-size: 0.8rem;
            line-height: 1.35;
        }
        .agro-cart-mini-list__content span {
            color: rgba(255,255,255,0.55);
            font-size: 0.72rem;
            line-height: 1.35;
        }
        .agro-cart-mini-state {
            padding: 0.8rem;
            border-radius: 10px;
            border: 1px dashed rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.02);
            color: rgba(255,255,255,0.58);
            font-size: 0.78rem;
            line-height: 1.45;
        }
        .agro-cart-inline-roi {
            display: flex;
            flex-direction: column;
            gap: 0.7rem;
        }
        .agro-cart-inline-roi__fields {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.55rem;
        }
        .agro-cart-inline-roi__field {
            display: flex;
            flex-direction: column;
            gap: 0.28rem;
        }
        .agro-cart-inline-roi__field span {
            color: rgba(255,255,255,0.5);
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .agro-cart-inline-roi__actions {
            display: flex;
            gap: 0.45rem;
            flex-wrap: wrap;
        }
        .agro-cart-inline-roi__result-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.5rem;
        }
        .agro-cart-inline-roi__result-item {
            padding: 0.7rem;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.06);
            background: rgba(255,255,255,0.025);
        }
        .agro-cart-inline-roi__result-item span {
            display: block;
            color: rgba(255,255,255,0.45);
            font-size: 0.68rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .agro-cart-inline-roi__result-item strong {
            display: block;
            margin-top: 0.22rem;
            color: #fff;
            font-size: 0.92rem;
            line-height: 1.2;
        }
        .agro-cart-inline-roi__result-item strong.is-positive {
            color: #86efac;
        }
        .agro-cart-inline-roi__result-item strong.is-negative {
            color: #fca5a5;
        }

        /* Items */
        .agro-cart-items { margin-bottom: 0.75rem; }
        .agro-cart-items-section {
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 12px;
            background: rgba(255,255,255,0.02);
            overflow: hidden;
        }
        .agro-cart-items-section + .agro-cart-items-section { margin-top: 0.75rem; }
        .agro-cart-items-section--processed {
            background: rgba(200,167,82,0.05);
            border-color: rgba(200,167,82,0.14);
        }
        .agro-cart-items-section__head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.75rem;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            background: rgba(0,0,0,0.16);
        }
        .agro-cart-items-section__title {
            display: block;
            color: #fff;
            font-size: 0.82rem;
        }
        .agro-cart-items-section__copy {
            margin: 0.2rem 0 0;
            color: rgba(255,255,255,0.45);
            font-size: 0.72rem;
        }
        .agro-cart-items-section__count {
            min-width: 28px;
            height: 28px;
            padding: 0 0.55rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            border: 1px solid rgba(200,167,82,0.22);
            color: var(--v10-gold-4, #C8A752);
            font-size: 0.78rem;
            font-weight: 700;
        }
        .agro-cart-items-empty {
            padding: 1rem 0.9rem;
            color: rgba(255,255,255,0.45);
            font-size: 0.82rem;
        }

        .agro-cart-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.6rem 0.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            transition: opacity 0.15s;
        }
        .agro-cart-item:last-child { border-bottom: none; }
        .agro-cart-item.is-processed {
            background: rgba(200,167,82,0.04);
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
        .agro-cart-item-meta--secondary,
        .agro-cart-item-meta--processed {
            margin-top: 0.18rem;
        }
        .agro-cart-item-meta--processed {
            color: var(--v10-gold-4, #C8A752);
        }
        .agro-cart-item-price {
            color: var(--v10-gold-4, #C8A752);
            font-size: 0.8rem;
            font-weight: 600;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .agro-cart-item-actions {
            display: flex;
            gap: 0.25rem;
            flex-shrink: 0;
            align-items: center;
            flex-wrap: wrap;
            justify-content: flex-end;
        }
        .agro-cart-register-btn,
        .agro-cart-item-pill {
            min-height: 30px;
            padding: 0.35rem 0.65rem;
            border-radius: 999px;
            border: 1px solid rgba(200,167,82,0.22);
            font-size: 0.7rem;
            font-weight: 700;
            font-family: inherit;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
        }
        .agro-cart-register-btn {
            background: rgba(200,167,82,0.12);
            color: var(--v10-gold-4, #C8A752);
            cursor: pointer;
            transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }
        .agro-cart-register-btn:hover {
            background: rgba(200,167,82,0.18);
            border-color: rgba(200,167,82,0.38);
            transform: translateY(-1px);
        }
        .agro-cart-item-pill {
            background: rgba(74,222,128,0.08);
            color: #86efac;
            border-color: rgba(74,222,128,0.24);
        }
        .agro-cart-item-btn {
            width: 28px; height: 28px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.16);
            background: transparent;
            color: rgba(255,255,255,0.72);
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.65rem;
            transition: all 0.15s;
        }
        .agro-cart-item-btn:hover {
            background: rgba(200,167,82,0.12);
            border-color: rgba(200,167,82,0.3);
            color: var(--v10-gold-4, #C8A752);
        }
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
            border-color: var(--v10-gold-4, #C8A752);
            color: var(--v10-gold-4, #C8A752);
        }

        .agro-cart-btn-primary {
            padding: 0.6rem 1.2rem;
            border-radius: 10px;
            border: none;
            background: var(--v10-metallic-btn, linear-gradient(135deg, #6b5a3e, #C8A752, #E8D48B, #C8A752, #6b5a3e));
            color: var(--v10-bg-1, #0a0a0a);
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
        .agro-cart-modal--purchase-state { max-width: 460px; }
        .agro-cart-modal__eyebrow {
            margin: 0 0 0.4rem;
            color: var(--v10-gold-4, #C8A752);
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .agro-cart-modal__title {
            margin: 0 0 0.5rem;
            color: #fff;
            font-size: 1.2rem;
        }
        .agro-cart-modal__copy {
            margin: 0 0 1rem;
            color: rgba(255,255,255,0.62);
            font-size: 0.84rem;
            line-height: 1.5;
        }
        .agro-cart-modal__options {
            display: grid;
            gap: 0.6rem;
        }
        .agro-cart-modal__option {
            width: 100%;
            padding: 0.8rem 0.9rem;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.03);
            color: #fff;
            text-align: left;
            cursor: pointer;
            font-family: inherit;
            transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
        }
        .agro-cart-modal__option strong {
            display: block;
            font-size: 0.9rem;
        }
        .agro-cart-modal__option span {
            display: block;
            margin-top: 0.3rem;
            color: rgba(255,255,255,0.52);
            font-size: 0.78rem;
        }
        .agro-cart-modal__option:hover {
            border-color: rgba(200,167,82,0.34);
            background: rgba(200,167,82,0.08);
            transform: translateY(-1px);
        }
        .agro-cart-modal__actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 1rem;
        }

        @media (max-width: 480px) {
            .agro-cart-workspace,
            .agro-cart-inline-roi__fields,
            .agro-cart-inline-roi__result-grid {
                grid-template-columns: 1fr;
            }
            .agro-cart-mini__head {
                flex-direction: column;
            }
            .agro-cart-mini__actions,
            .agro-cart-inline-roi__actions {
                width: 100%;
            }
            .agro-cart-mini-btn {
                width: 100%;
            }
            .agro-cart-summary-value { font-size: 0.85rem; }
            .agro-cart-item-price { font-size: 0.7rem; }
            .agro-cart-item {
                align-items: flex-start;
                flex-wrap: wrap;
            }
            .agro-cart-item-price {
                width: 100%;
                margin-left: auto;
                text-align: right;
            }
            .agro-cart-item-actions {
                width: 100%;
            }
        }
        @media (max-width: 820px) {
            .agro-cart-workspace {
                grid-template-columns: 1fr;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            .agro-cart-mini,
            .agro-cart-mini-btn {
                transition: none !important;
            }
            .agro-cart-mini-btn:hover {
                transform: none !important;
            }
        }
    `;
    document.head.appendChild(style);
}
