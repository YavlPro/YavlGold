# Staging Guardrails and Setup

Fecha: 2026-04-24

## Politica

`supabase db push` solo puede ejecutarse contra proyectos Supabase cuyo nombre visible contenga `staging` o `dev`.

No se permite asumir que `YavlGold` / `gerzlzprkarikblqxpjt` es staging. Si el nombre del proyecto no confirma staging/dev, se detiene la operacion.

## Confirmacion obligatoria

1. Iniciar sesion:

   ```bash
   supabase login
   ```

2. Listar proyectos:

   ```bash
   supabase projects list
   ```

3. Elegir solo un proyecto cuyo nombre visible contenga `staging` o `dev`.

4. Registrar localmente el ref en una variable de entorno o en un archivo no versionado. Ejemplo PowerShell:

   ```powershell
   $env:SUPABASE_PROJECT_REF_STAGING = "<staging-project-ref>"
   ```

   Ejemplo bash:

   ```bash
   export SUPABASE_PROJECT_REF_STAGING="<staging-project-ref>"
   ```

5. Verificar el guard:

   ```bash
   pnpm guard:staging
   ```

## Dry-run y apply con guardrail

Dry-run:

```bash
pnpm rls:staging:dryrun
```

Apply, solo si el dry-run muestra migraciones esperadas:

```bash
pnpm rls:staging:apply
```

Los scripts ejecutan el guard antes de `supabase link` y `supabase db push`.

## Stop the line

Detener la operacion si ocurre cualquiera de estos casos:

- No existe proyecto con nombre `staging` o `dev`.
- `SUPABASE_PROJECT_REF_STAGING` esta vacio.
- El ref no aparece en `supabase projects list`.
- El ref existe, pero el nombre no confirma staging/dev.
- El dry-run muestra migraciones inesperadas.
- Faltan usuarios QA A/B o variables locales para el smoke test.

## Archivo local opcional

Si se quiere dejar trazabilidad local adicional, crear un archivo no versionado como:

```text
.supabase-staging.local.json
```

Contenido sugerido:

```json
{
  "name": "<project-name-containing-staging-or-dev>",
  "ref": "<staging-project-ref>",
  "confirmed_at": "2026-04-24T00:00:00Z",
  "confirmed_by": "supabase projects list"
}
```

Este archivo no debe contener secrets.
