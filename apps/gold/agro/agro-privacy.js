const BUYER_PRIVACY_STORAGE_KEY = 'YG_HIDE_BUYER_NAMES';
const BUYER_PRIVACY_LEGACY_KEY = 'YG_AGRO_RANKINGS_PRIVACY_V1';
const MONEY_PRIVACY_STORAGE_KEY = 'YG_HIDE_MONEY_VALUES';

const BUYER_PRIVACY_CHANGE_EVENT = 'agro:buyer-privacy:changed';
const MONEY_PRIVACY_CHANGE_EVENT = 'agro:money-privacy:changed';

const BUYER_PRIVACY_MASK = '••••';
const MONEY_PRIVACY_MASK = '••••';

const boundControls = new WeakSet();
let privacyObserver = null;
let observerRaf = null;
let storageListenerBound = false;

function resolveRoot(rootEl) {
    if (rootEl && typeof rootEl.querySelectorAll === 'function') return rootEl;
    return document;
}

function resolveObserverTarget(rootEl) {
    if (rootEl === document) return document.body || document.documentElement;
    return rootEl;
}

function normalizeHiddenValue(raw, fallback = false) {
    if (raw === '1') return true;
    if (raw === '0') return false;
    return fallback;
}

export function readBuyerNamesHidden() {
    try {
        const raw = localStorage.getItem(BUYER_PRIVACY_STORAGE_KEY);
        if (raw === '0' || raw === '1') return normalizeHiddenValue(raw, false);

        // Legacy compatibility: migrate rankings-only privacy to global key once.
        const legacy = localStorage.getItem(BUYER_PRIVACY_LEGACY_KEY);
        if (legacy === '0' || legacy === '1') {
            const hidden = normalizeHiddenValue(legacy, false);
            localStorage.setItem(BUYER_PRIVACY_STORAGE_KEY, hidden ? '1' : '0');
            return hidden;
        }

        return false;
    } catch (_e) {
        return false;
    }
}

export function readMoneyValuesHidden() {
    try {
        const raw = localStorage.getItem(MONEY_PRIVACY_STORAGE_KEY);
        return normalizeHiddenValue(raw, false);
    } catch (_e) {
        return false;
    }
}

function writeBuyerNamesHidden(hidden) {
    const safeHidden = !!hidden;
    try {
        localStorage.setItem(BUYER_PRIVACY_STORAGE_KEY, safeHidden ? '1' : '0');
        localStorage.removeItem(BUYER_PRIVACY_LEGACY_KEY);
    } catch (_e) {
        // Ignore storage failures (private mode / blocked storage)
    }
    return safeHidden;
}

function writeMoneyValuesHidden(hidden) {
    const safeHidden = !!hidden;
    try {
        localStorage.setItem(MONEY_PRIVACY_STORAGE_KEY, safeHidden ? '1' : '0');
    } catch (_e) {
        // Ignore storage failures (private mode / blocked storage)
    }
    return safeHidden;
}

function collectNodes(rootEl, selector) {
    const nodes = [];
    if (!rootEl || !selector) return nodes;

    if (rootEl instanceof Element && rootEl.matches(selector)) {
        nodes.push(rootEl);
    }

    rootEl.querySelectorAll(selector).forEach((node) => {
        nodes.push(node);
    });

    return nodes;
}

function applyPrivacyToNode(node, { hidden, datasetRawKey, maskClass, maskText, ariaLabel }) {
    if (!node) return;

    const currentText = String(node.textContent || '');
    const currentTrimmed = currentText.trim();

    if (!hidden && currentTrimmed && currentText !== maskText) {
        node.dataset[datasetRawKey] = currentText;
    } else if (!node.dataset[datasetRawKey] || !node.dataset[datasetRawKey].trim()) {
        node.dataset[datasetRawKey] = currentText;
    }

    const rawText = String(node.dataset[datasetRawKey] || '').trim();
    if (!rawText) return;

    if (hidden) {
        if (currentText !== maskText) {
            node.textContent = maskText;
        }
        node.classList.add(maskClass);
        node.setAttribute('aria-label', ariaLabel);
        return;
    }

    if (currentText !== rawText) {
        node.textContent = rawText;
    }
    node.classList.remove(maskClass);
    node.removeAttribute('aria-label');
}

function syncPrivacyControl(control, hidden, type) {
    if (!(control instanceof Element)) return;
    if (type === 'buyer') {
        const controlType = String(control.dataset.buyerPrivacyControl || '').toLowerCase().trim();
        if (controlType === 'checkbox' && control instanceof HTMLInputElement) {
            control.checked = !!hidden;
            control.setAttribute('aria-checked', hidden ? 'true' : 'false');
            return;
        }
        control.setAttribute('aria-pressed', hidden ? 'true' : 'false');
        control.textContent = hidden ? '👁 Mostrar nombres' : '👁 Ocultar nombres';
        return;
    }

    const controlType = String(control.dataset.moneyPrivacyControl || '').toLowerCase().trim();
    if (controlType === 'checkbox' && control instanceof HTMLInputElement) {
        control.checked = !!hidden;
        control.setAttribute('aria-checked', hidden ? 'true' : 'false');
        return;
    }
    control.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    control.textContent = hidden ? '💰 Mostrar montos' : '💰 Ocultar montos';
}

export function syncBuyerPrivacyControls(rootEl = document, hidden = readBuyerNamesHidden()) {
    const root = resolveRoot(rootEl);
    root.querySelectorAll('[data-buyer-privacy-control]').forEach((control) => {
        syncPrivacyControl(control, hidden, 'buyer');
    });
}

export function syncMoneyPrivacyControls(rootEl = document, hidden = readMoneyValuesHidden()) {
    const root = resolveRoot(rootEl);
    root.querySelectorAll('[data-money-privacy-control]').forEach((control) => {
        syncPrivacyControl(control, hidden, 'money');
    });
}

function emitPrivacyChanged(eventName, hidden) {
    if (typeof document === 'undefined') return;
    document.dispatchEvent(new CustomEvent(eventName, {
        detail: { hidden: !!hidden }
    }));
}

export function applyBuyerPrivacy(rootEl = document, hidden = readBuyerNamesHidden()) {
    const root = resolveRoot(rootEl);
    const nodes = collectNodes(root, '[data-buyer-name="1"]');
    nodes.forEach((node) => applyPrivacyToNode(node, {
        hidden,
        datasetRawKey: 'rawName',
        maskClass: 'buyer-name-masked',
        maskText: BUYER_PRIVACY_MASK,
        ariaLabel: 'Nombre oculto'
    }));
    return hidden;
}

export function applyMoneyPrivacy(rootEl = document, hidden = readMoneyValuesHidden()) {
    const root = resolveRoot(rootEl);
    const nodes = collectNodes(root, '[data-money="1"]');
    nodes.forEach((node) => applyPrivacyToNode(node, {
        hidden,
        datasetRawKey: 'rawMoney',
        maskClass: 'money-masked',
        maskText: MONEY_PRIVACY_MASK,
        ariaLabel: 'Monto oculto'
    }));
    return hidden;
}

export function setBuyerNamesHidden(hidden, options = {}) {
    const root = resolveRoot(options.rootEl || document);
    const shouldEmit = options.emit !== false;
    const safeHidden = writeBuyerNamesHidden(hidden);

    syncBuyerPrivacyControls(root, safeHidden);
    applyBuyerPrivacy(root, safeHidden);

    if (shouldEmit) {
        emitPrivacyChanged(BUYER_PRIVACY_CHANGE_EVENT, safeHidden);
    }

    return safeHidden;
}

export function setMoneyValuesHidden(hidden, options = {}) {
    const root = resolveRoot(options.rootEl || document);
    const shouldEmit = options.emit !== false;
    const safeHidden = writeMoneyValuesHidden(hidden);

    syncMoneyPrivacyControls(root, safeHidden);
    applyMoneyPrivacy(root, safeHidden);

    if (shouldEmit) {
        emitPrivacyChanged(MONEY_PRIVACY_CHANGE_EVENT, safeHidden);
    }

    return safeHidden;
}

export function toggleBuyerNamesHidden(options = {}) {
    const current = readBuyerNamesHidden();
    return setBuyerNamesHidden(!current, options);
}

export function toggleMoneyValuesHidden(options = {}) {
    const current = readMoneyValuesHidden();
    return setMoneyValuesHidden(!current, options);
}

function bindBuyerPrivacyControl(control, rootEl) {
    if (!(control instanceof Element)) return;
    if (boundControls.has(control)) return;
    boundControls.add(control);

    const controlType = String(control.dataset.buyerPrivacyControl || '').toLowerCase().trim();
    if (controlType === 'checkbox' && control instanceof HTMLInputElement) {
        control.addEventListener('change', () => {
            setBuyerNamesHidden(!!control.checked, { rootEl });
        });
        return;
    }

    control.addEventListener('click', () => {
        toggleBuyerNamesHidden({ rootEl });
    });
}

function bindMoneyPrivacyControl(control, rootEl) {
    if (!(control instanceof Element)) return;
    if (boundControls.has(control)) return;
    boundControls.add(control);

    const controlType = String(control.dataset.moneyPrivacyControl || '').toLowerCase().trim();
    if (controlType === 'checkbox' && control instanceof HTMLInputElement) {
        control.addEventListener('change', () => {
            setMoneyValuesHidden(!!control.checked, { rootEl });
        });
        return;
    }

    control.addEventListener('click', () => {
        toggleMoneyValuesHidden({ rootEl });
    });
}

function bindPrivacyControls(rootEl) {
    const root = resolveRoot(rootEl);
    root.querySelectorAll('[data-buyer-privacy-control]').forEach((control) => {
        bindBuyerPrivacyControl(control, root);
    });
    root.querySelectorAll('[data-money-privacy-control]').forEach((control) => {
        bindMoneyPrivacyControl(control, root);
    });
}

function scheduleObserverSync(rootEl) {
    if (observerRaf) {
        cancelAnimationFrame(observerRaf);
    }

    observerRaf = requestAnimationFrame(() => {
        observerRaf = null;
        const namesHidden = readBuyerNamesHidden();
        const moneyHidden = readMoneyValuesHidden();
        bindPrivacyControls(rootEl);
        syncBuyerPrivacyControls(rootEl, namesHidden);
        syncMoneyPrivacyControls(rootEl, moneyHidden);
        applyBuyerPrivacy(rootEl, namesHidden);
        applyMoneyPrivacy(rootEl, moneyHidden);
    });
}

export function initBuyerPrivacy(rootEl = document) {
    const root = resolveRoot(rootEl);
    const namesHidden = readBuyerNamesHidden();
    const moneyHidden = readMoneyValuesHidden();

    bindPrivacyControls(root);
    syncBuyerPrivacyControls(root, namesHidden);
    syncMoneyPrivacyControls(root, moneyHidden);
    applyBuyerPrivacy(root, namesHidden);
    applyMoneyPrivacy(root, moneyHidden);

    const observerTarget = resolveObserverTarget(root);
    if (!privacyObserver && observerTarget) {
        privacyObserver = new MutationObserver(() => {
            scheduleObserverSync(root);
        });
        privacyObserver.observe(observerTarget, {
            childList: true,
            subtree: true
        });
    }

    if (!storageListenerBound && typeof window !== 'undefined') {
        storageListenerBound = true;
        window.addEventListener('storage', (event) => {
            if (event.key !== BUYER_PRIVACY_STORAGE_KEY && event.key !== MONEY_PRIVACY_STORAGE_KEY) return;
            const nextNamesHidden = readBuyerNamesHidden();
            const nextMoneyHidden = readMoneyValuesHidden();
            syncBuyerPrivacyControls(document, nextNamesHidden);
            syncMoneyPrivacyControls(document, nextMoneyHidden);
            applyBuyerPrivacy(document, nextNamesHidden);
            applyMoneyPrivacy(document, nextMoneyHidden);
            emitPrivacyChanged(BUYER_PRIVACY_CHANGE_EVENT, nextNamesHidden);
            emitPrivacyChanged(MONEY_PRIVACY_CHANGE_EVENT, nextMoneyHidden);
        });
    }

    return namesHidden;
}

export {
    BUYER_PRIVACY_CHANGE_EVENT,
    BUYER_PRIVACY_MASK,
    BUYER_PRIVACY_STORAGE_KEY,
    MONEY_PRIVACY_CHANGE_EVENT,
    MONEY_PRIVACY_MASK,
    MONEY_PRIVACY_STORAGE_KEY
};
