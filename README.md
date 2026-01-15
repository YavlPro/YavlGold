# YavlGold V9.4 (Agro-Stable)

> V9.4 Stable - Produccion en Vercel

## Estado actual

- Version: YavlGold V9.4 (Agro-Stable)
- Fase: Produccion en Vercel
- Enfoque: estabilidad, integridad de datos y UX consistente

## Modulo Agro (mejoras recientes)

- Gestion de gastos segura: eliminacion por UUID con Supabase para integridad de datos.
- Calculadora ROI con boton LIMPIAR para reinicio rapido.
- Interfaz refinada: footer reubicado via JS al final absoluto y sanitizacion XSS en formularios.
- Identidad: nombre y avatar sincronizados con Supabase Auth.
- DOM injection estricta para proteger HTML/CSS congelado.

## Tecnologia

- Frontend: Vanilla JS + Vite (DOM injection estricta).
- Backend: Supabase (Auth, DB, Storage).
- Monorepo: Turborepo + pnpm.
- Deploy: Vercel (build `pnpm build:v9`).

## Desarrollo rapido

```bash
pnpm install
cp .env.example .env
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
pnpm dev
```

## Build de produccion

```bash
pnpm build:v9
```

## Estructura del repositorio

```
gold/
  apps/
    gold/              # App principal
      agro/            # Modulo Agro (V9.4 Stable)
      dashboard/       # Dashboard principal
      academia/        # Modulo Academia (en desarrollo)
      herramientas/    # Modulo Herramientas (en desarrollo)
      social/          # Modulo Social (planificado)
      assets/          # Recursos compartidos
  packages/            # Paquetes compartidos
  turbo.json
  package.json
```

## Licencia

MIT License. Ver `LICENSE`.
