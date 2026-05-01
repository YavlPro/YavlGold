AI coding agents: read AGENTS.md first and follow it strictly.

# YavlGold V1

> YavlGold hoy es Agro: herramienta agricola digital en produccion en Vercel.

## Estado actual

- Release: V1 (MPA + Supabase).
- Modulo activo: **Agro** (unico modulo liberado).
- Las demas superficies del repo son placeholders de compatibilidad o legado archivado.

## Que hace Agro

- Facturero financiero: gastos, ingresos, fiados, perdidas, donaciones y otros.
- Gestion de cultivos con ciclos productivos.
- Clima en tiempo real integrado en el flujo agricola.
- Rankings, estadisticas financieras y cartera viva.
- Tasas de cambio multi-moneda (COP, USD, VES).
- Notificaciones, feedback, planificacion y papelera con restore.

## Stack

- Frontend: Vanilla JS + Vite (DOM injection estricta).
- Backend: Supabase (Auth, DB, Storage).
- Monorepo: Turborepo + pnpm.
- Deploy: Vercel (build `pnpm build:gold`).

## Requisitos

- Node.js 20.x.
- pnpm 9.1.0 recomendado; `package.json` mantiene `pnpm@9.1.0` como package manager.
- Supabase CLI para operaciones locales o staging de base de datos.
- Docker Desktop solo es necesario para `supabase start` local.

## Desarrollo rapido

```bash
pnpm install
cp .env.example .env
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
pnpm dev
```

## Build de produccion

```bash
pnpm build:gold
```

## Estructura del repositorio

```
gold/
  apps/
    gold/              # App principal (producto YavlGold)
      index.html       # Landing publica enfocada en Agro
      dashboard/       # Entrada del usuario hacia Agro
      agro/            # Modulo Agro (V1 activo)
      public/          # Assets públicos (canónico vivo)
      assets/          # Recursos compartidos
      archive/         # Legado archivado (no activo)
  supabase/            # Infraestrutura Supabase
  turbo.json
  package.json
```

## Documentacion operativa

- Instrucciones para agentes: `AGENTS.md`
- Reporte activo: `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- Sistema de diseño: `apps/gold/docs/ADN-VISUAL-V11.0.md` (canon activo), `apps/gold/docs/ADN-VISUAL-V10.0.md` (histórico)
- Seguridad y reportes privados: `SECURITY.md`
- Guia de contribucion: `CONTRIBUTING.md`
- Release notes: `CHANGELOG.md`

## Licencia

MIT License. Ver `LICENSE`.

## Open Source y confianza

- Repositorio publico: `https://github.com/YavlPro/YavlGold`
- Pagina Open Source: `apps/gold/open-source.html`
- Politica de seguridad: `SECURITY.md` y `apps/gold/security.html`
- Aviso anti-suplantacion/no inversiones: `apps/gold/anti-suplantacion.html`
- YavlGold no vende oro, no administra inversiones y no solicita dinero por canales no oficiales.
