# Legacy JS Archive

Este directorio conserva JavaScript histórico que ya no forma parte de la superficie activa del producto.

## Propósito

- preservar compatibilidad antigua solo como referencia
- facilitar rollback puntual si apareciera una dependencia manual no detectada
- separar claramente el bridge auth viejo del stack auth vigente

## Contenido actual

- `auth.js`
- `auth/authGuard.js`
- `agro-cart.js` — Mi Carrito, retirado del producto por decisión del owner el 2026-09-17 (ANEXO 24): era intención de compra sin uso real y nunca registró gasto.

## Regla

Nada dentro de este árbol debe considerarse parte del producto activo mientras no se reactive de forma explícita en un lote nuevo.
