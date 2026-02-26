const BUYER_PRIVACY_STORAGE_KEY = 'YG_HIDE_BUYER_NAMES';
const BUYER_PRIVACY_LEGACY_KEY = 'YG_AGRO_RANKINGS_PRIVACY_V1';
const BUYER_PRIVACY_CHANGE_EVENT = 'agro:buyer-privacy:changed';
const BUYER_PRIVACY_MASK = '••••';

const boundControls = new WeakSet();
let buyerPrivacyObserver = null;
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

export function readBuyerNamesHidden() {
    try {
        const raw = localStorage.getItem(BUYER_PRIVACY_STORAGE_KEY);
        if (raw === '0') return false;
        if (raw === '1') return true;

        // Legacy compatibility: migrate rankings-only privacy to global key once.
        const legacy = localStorage.getItem(BUYER_PRIVACY_LEGACY_KEY);
        if (legacy === '0' || legacy === '1') {
            const hidden = legacy === '1';
            localStorage.setItem(BUYER_PRIVACY_STORAGE_KEY, hidden ? '1' : '0');
            return hidden;
        }
        return false;
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

function collectBuyerNameNodes(rootEl) {
    const nodes = [];
    if (!rootEl) return nodes;

    if (rootEl instanceof Element && rootEl.matches('[data-buyer-name="1"]')) {
        nodes.push(rootEl);
    }

    rootEl.querySelectorAll('[data-buyer-name="1"]').forEach((node) => {
        nodes.push(node);
    });

    return nodes;
}

function applyBuyerPrivacyToNode(node, hidden) {
    if (!node) return;

    const currentText = String(node.textContent || '');
    if (!node.dataset.rawName || !node.dataset.rawName.trim()) {
        node.dataset.rawName = currentText;
    }

    const rawName = String(node.dataset.rawName || '').trim();
    if (!rawName) return;

    if (hidden) {
        if (currentText !== BUYER_PRIVACY_MASK) {
            node.textContent = BUYER_PRIVACY_MASK;
        }
        node.classList.add('buyer-name-masked');
        node.setAttribute('aria-label', 'Nombre oculto');
        return;
    }

    if (currentText !== rawName) {
        node.textContent = rawName;
    }
    node.classList.remove('buyer-name-masked');
    node.removeAttribute('aria-label');
}

function syncBuyerPrivacyControl(control, hidden) {
    if (!(control instanceof Element)) return;

    const controlType = String(control.dataset.buyerPrivacyControl || '').toLowerCase().trim();
    if (controlType === 'checkbox' && control instanceof HTMLInputElement) {
        control.checked = !!hidden;
        control.setAttribute('aria-checked', hidden ? 'true' : 'false');
        return;
    }

    control.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    control.textContent = hidden ? '👁 Mostrar nombres' : '👁 Ocultar nombres';
}

export function syncBuyerPrivacyControls(rootEl = document, hidden = readBuyerNamesHidden()) {
    const root = resolveRoot(rootEl);
    root.querySelectorAll('[data-buyer-privacy-control]').forEach((control) => {
        syncBuyerPrivacyControl(control, hidden);
    });
}

function emitBuyerPrivacyChanged(hidden) {
    if (typeof document === 'undefined') return;
    document.dispatchEvent(new CustomEvent(BUYER_PRIVACY_CHANGE_EVENT, {
        detail: { hidden: !!hidden }
    }));
}

export function applyBuyerPrivacy(rootEl = document, hidden = readBuyerNamesHidden()) {
    const root = resolveRoot(rootEl);
    const nodes = collectBuyerNameNodes(root);
    nodes.forEach((node) => applyBuyerPrivacyToNode(node, hidden));
    return hidden;
}

export function setBuyerNamesHidden(hidden, options = {}) {
    const root = resolveRoot(options.rootEl || document);
    const shouldEmit = options.emit !== false;
    const safeHidden = writeBuyerNamesHidden(hidden);

    syncBuyerPrivacyControls(root, safeHidden);
    applyBuyerPrivacy(root, safeHidden);

    if (shouldEmit) {
        emitBuyerPrivacyChanged(safeHidden);
    }

    return safeHidden;
}

export function toggleBuyerNamesHidden(options = {}) {
    const current = readBuyerNamesHidden();
    return setBuyerNamesHidden(!current, options);
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

function bindBuyerPrivacyControls(rootEl) {
    const root = resolveRoot(rootEl);
    root.querySelectorAll('[data-buyer-privacy-control]').forEach((control) => {
        bindBuyerPrivacyControl(control, root);
    });
}

function scheduleObserverSync(rootEl) {
    if (observerRaf) {
        cancelAnimationFrame(observerRaf);
    }

    observerRaf = requestAnimationFrame(() => {
        observerRaf = null;
        const hidden = readBuyerNamesHidden();
        bindBuyerPrivacyControls(rootEl);
        syncBuyerPrivacyControls(rootEl, hidden);
        applyBuyerPrivacy(rootEl, hidden);
    });
}

export function initBuyerPrivacy(rootEl = document) {
    const root = resolveRoot(rootEl);
    const hidden = readBuyerNamesHidden();

    bindBuyerPrivacyControls(root);
    syncBuyerPrivacyControls(root, hidden);
    applyBuyerPrivacy(root, hidden);

    const observerTarget = resolveObserverTarget(root);
    if (!buyerPrivacyObserver && observerTarget) {
        buyerPrivacyObserver = new MutationObserver(() => {
            scheduleObserverSync(root);
        });
        buyerPrivacyObserver.observe(observerTarget, {
            childList: true,
            subtree: true
        });
    }

    if (!storageListenerBound && typeof window !== 'undefined') {
        storageListenerBound = true;
        window.addEventListener('storage', (event) => {
            if (event.key !== BUYER_PRIVACY_STORAGE_KEY) return;
            const nextHidden = readBuyerNamesHidden();
            syncBuyerPrivacyControls(document, nextHidden);
            applyBuyerPrivacy(document, nextHidden);
            emitBuyerPrivacyChanged(nextHidden);
        });
    }

    return hidden;
}

export {
    BUYER_PRIVACY_CHANGE_EVENT,
    BUYER_PRIVACY_MASK,
    BUYER_PRIVACY_STORAGE_KEY
};
