# YavlGold

Plataforma digital construida como MPA con Vite, Vanilla JS y Supabase.
Release visible activo: `V1`.

## Estado actual del catálogo

- `Agro`: único módulo liberado y operativo.
- `Academia`: no disponible.
- `Social`: no disponible.
- `Tecnología`: no disponible.
- `Crypto`: no disponible.

`Herramientas` y `Suite` ya no cuentan como módulos oficiales. Se tratan como alias legacy hacia `Tecnología` y `Crypto`.

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
|- academia/
|- social/
|- tecnologia/
|- crypto/
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
- `/agro/` -> módulo liberado
- `/academia/`, `/social/`, `/tecnologia/`, `/crypto/` -> placeholder oficial `No disponible`

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

El repo todavía conserva archivos históricos de `academia`, `herramientas`, `suite` y otras superficies antiguas. Los HTML huérfanos ya fueron movidos a `archive/legacy-html/` y el bridge auth histórico a `archive/legacy-js/`. `music` sigue vivo como utilidad interna del dashboard, separada del catálogo oficial de módulos. El inventario vivo está en `apps/gold/docs/LEGACY_SURFACES.md`.
