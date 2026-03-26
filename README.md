AI coding agents: read AGENTS.md first and follow it strictly.

# YavlGold V1

> V1 - Producción en Vercel

## Estado actual

- Versión visible: YavlGold V1
- Fase: Producción en Vercel
- Estado: V1 (MPA + Supabase) — YavlGold hoy es Agro y la documentación activa ya refleja esa verdad operativa.

## Modulo Agro (release activo)

- Registro de cultivos y ciclos productivos.
- Facturero real para ingresos, gastos, fiados, perdidas y transferencias.
- Clima y seguimiento operativo dentro del flujo agrícola.
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
      index.html       # Landing pública enfocada en Agro
      dashboard/       # Entrada del usuario hacia Agro
      agro/            # Modulo Agro (V1 activo)
      assets/          # Recursos compartidos
  packages/            # Paquetes compartidos
  turbo.json
  package.json
```

## Licencia

MIT License. Ver `LICENSE`.
