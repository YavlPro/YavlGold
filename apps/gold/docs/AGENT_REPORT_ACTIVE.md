# AGENT_REPORT_ACTIVE

Resumen operativo actual de `apps/gold`.

## Producto vigente

- `Agro` es el único módulo liberado.
- `Academia`, `Social`, `Tecnología` y `Crypto` son módulos oficiales pero no disponibles.
- `Herramientas` y `Suite` solo sobreviven como alias legacy.

## Auth y entrada

- Landing auth por hash: `/index.html#login`
- Hero CTA:
  - sin sesión -> `/index.html#login`
  - con sesión -> `/agro/`
- Áreas protegidas globales:
  - `/dashboard`
  - `/agro`

## Estado del catálogo

- Landing y dashboard ya respetan la misma release policy.
- Rutas directas de módulos no liberados muestran placeholder oficial uniforme.

## Deuda visible pendiente

- `dashboard/music.html` sigue como utilidad legacy fuera del catálogo.
- La carpeta `archive/legacy-html/` ya concentra los HTML históricos fuera de la superficie activa.
- `AGENT_REPORT.md` sigue siendo el histórico completo y ya requiere partición definitiva.

## Documentos de apoyo

- Histórico completo: `docs/AGENT_REPORT.md`
- Inventario de legado: `docs/LEGACY_SURFACES.md`
