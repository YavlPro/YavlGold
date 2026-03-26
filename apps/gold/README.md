# YavlGold

YavlGold hoy es Agro: una herramienta agricola digital construida como MPA con Vite, Vanilla JS y Supabase.
Release visible activo: `V1`.

## Estado actual

- `Agro` es la unica superficie operativa real del producto.
- Landing y dashboard ya estan alineados para presentar YavlGold como Agro.
- Las demas superficies no activas quedan fuera del discurso publico y se tratan como legado o placeholders de compatibilidad.

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

El repo todavia conserva superficies antiguas y placeholders por compatibilidad. Los HTML huerfanos ya fueron movidos a `archive/legacy-html/`, el bridge auth historico a `archive/legacy-js/` y `music` sigue como utilidad interna del dashboard. El inventario vivo esta en `apps/gold/docs/LEGACY_SURFACES.md`.
