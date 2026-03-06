# Legacy JS Archive

Este directorio conserva JavaScript histórico que ya no forma parte de la superficie activa del producto.

## Propósito

- preservar compatibilidad antigua solo como referencia
- facilitar rollback puntual si apareciera una dependencia manual no detectada
- separar claramente el bridge auth viejo del stack auth vigente

## Contenido actual

- `auth.js`
- `auth/authGuard.js`

## Regla

Nada dentro de este árbol debe considerarse parte del producto activo mientras no se reactive de forma explícita en un lote nuevo.
