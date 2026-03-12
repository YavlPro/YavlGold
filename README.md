AI coding agents: read AGENTS.md first and follow it strictly.

# YavlGold V1

> V1 - Producción en Vercel

## Estado actual

- Versión visible: YavlGold V1
- Fase: Producción en Vercel
- Estado: V1 (MPA + Supabase) — Agro liberado y documentación activa alineada con el release vigente.

## Modulo Agro (release activo)

- Gestion de gastos segura: eliminacion por UUID con Supabase para integridad de datos.
- Calculadora ROI con boton LIMPIAR para reinicio rapido.
- Interfaz refinada: footer reubicado via JS al final absoluto y sanitizacion XSS en formularios.
- Identidad: nombre y avatar sincronizados con Supabase Auth.
- DOM injection estricta para proteger HTML/CSS congelado.

## Tecnologia

- Frontend: Vanilla JS + Vite (DOM injection estricta).
- Backend: Supabase (Auth, DB, Storage).
- Monorepo: Turborepo + pnpm.
- Deploy: Vercel (build `pnpm build:gold`).

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
    gold/              # App principal
      agro/            # Modulo Agro (V1 activo)
      dashboard/       # Dashboard principal
      academia/        # Modulo oficial no disponible
      herramientas/    # Alias legacy
      social/          # Modulo oficial no disponible
      tecnologia/      # Modulo oficial no disponible
      crypto/          # Modulo oficial no disponible
      assets/          # Recursos compartidos
  packages/            # Paquetes compartidos
  turbo.json
  package.json
```

## Licencia

MIT License. Ver `LICENSE`.
