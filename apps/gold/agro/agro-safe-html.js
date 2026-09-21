/**
 * Render seguro compartido para los wizards del facturero.
 *
 * Problema cerrado (CodeQL #74-76, "DOM text reinterpreted as HTML"): el
 * flujo `input.value (DOM text) -> state -> escapeHtml() -> template ->
 * innerHTML` queda marcado porque CodeQL no modela funciones de escape
 * definidas por el proyecto como sanitizadores (verificado en sesiones
 * 2026-09-20 VI/VII: ni closure ni scope de módulo cambian el veredicto).
 *
 * Solución: DOMPurify.sanitize() SÍ es un sanitizador modelado por CodeQL,
 * así que el sink renderInto() corta la cadena taint de forma determinista.
 * Además neutraliza en runtime cualquier interpolación que llegue sin
 * escapar (defensa en profundidad: recupera la vigilancia que el analizador
 * pierde al no haber sink de string).
 *
 * Markup permitido por defecto: data-* (ALLOW_DATA_ATTR), aria-*, inputs de
 * formulario, style inline simple — suficiente para el chrome fcflow/fcvw.
 */

import DOMPurify from 'dompurify';

// Escape canónico (misma definición que agro.js:962). Se mantiene por
// corrección de render (los valores deben verse literales), NO como barrera
// del analizador.
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Único sink de render de shells de wizard: sanitiza (DOMPurify), parsea en
// un documento inerte y adopta los nodos. bindEvents() de cada wizard se
// re-enlaza sobre los nodos recién insertados, igual que con innerHTML.
export function renderInto(target, html) {
    const clean = DOMPurify.sanitize(html);
    const parsed = new DOMParser().parseFromString(clean, 'text/html');
    target.replaceChildren(...parsed.body.childNodes);
}
