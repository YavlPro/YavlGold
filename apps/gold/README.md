# YavlGold

YavlGold hoy es Agro: herramienta agricola digital construida como MPA con Vite, Vanilla JS y Supabase.
Release visible activo: `V1`.

## Estado actual

- `Agro` es la unica superficie operativa real del producto.
- Las demas superficies del repo (academia, social, tecnologia, crypto) son placeholders de compatibilidad que muestran "no disponible". No son productos activos ni deben presentarse como tal.
- El legado historico esta archivado en `archive/`. No forma parte del discurso publico.

## Stack

- Vanilla JavaScript con módulos ES
- Vite en modo MPA
- Supabase para auth y datos
- Vercel para deploy y clean URLs

## Estructura útil

```text
apps/gold/
|- index.html
|- dashboard/
|- agro/
|- assets/
|  |- css/
|  \- js/
|- docs/
|  |- AGENT_REPORT.md
|  |- AGENT_REPORT_ACTIVE.md
|  \- LEGACY_SURFACES.md
|- archive/
|  |- legacy-html/
|  \- legacy-js/
|- vite.config.js
\- vercel.json
```

## Routing oficial

- `/` -> landing principal
- `/dashboard/` -> panel del usuario
- `/agro/` -> superficie operativa vigente

## Build

```bash
pnpm build:gold
```

Equivale a:

```bash
pnpm -C apps/gold build
```

## Documentación operativa

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`: fuente de verdad activa y reporte operativo vigente.
- `apps/gold/docs/AGENT_REPORT.md`: archivo legacy/histórico; no debe seguir creciendo salvo migración o consulta histórica.
- `apps/gold/docs/LEGACY_SURFACES.md`: inventario de superficies legacy, huérfanas o candidatas a archivo.

## Política de desarrollo

- Diagnosticar primero, editar después.
- Mantener MPA + Vanilla JS; no convertir a SPA.
- Evitar dependencias pesadas.
- No exponer secretos ni mover lógica sensible al frontend.
- Validar siempre con `pnpm build:gold`.

## Nota sobre legado

El repo conserva superficies antiguas y placeholders por compatibilidad de routing. Ninguno es producto activo:
- HTML huerfanos archivados en `archive/legacy-html/`.
- Bridge auth historico en `archive/legacy-js/`.
- `music` como utilidad interna del dashboard (no modulo oficial).
- `herramientas/` como directorio residual sin contenido activo.
- El inventario vivo esta en `apps/gold/docs/LEGACY_SURFACES.md`.
