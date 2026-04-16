# INFORME CODEX — Diagnóstico de ubicación de supabase/

## 1. Resumen ejecutivo

Diagnóstico solicitado: evaluar si conviene mover `supabase/` desde la raíz del repo hacia `apps/gold/supabase/`.

Veredicto técnico: **NO conviene mover `supabase/` ahora**.

La carpeta `supabase/` de raíz no es un residuo cosmético. En el estado actual contiene el proyecto Supabase más completo y operativo: `config.toml` con `project_id = "YavlGold"`, vínculo remoto en `.temp/project-ref`, 25 migraciones, SQL auxiliar y la Edge Function `agro-assistant`.

También existe `apps/gold/supabase/`, pero no es equivalente: tiene `project_id = "gold"`, no tiene `.temp/project-ref`, no tiene `functions/`, contiene solo 8 migraciones y su `config.toml` no incluye la configuración `[functions.agro-assistant] verify_jwt = false`.

Mover la carpeta raíz hacia `apps/gold/supabase/` sin una consolidación previa rompería o confundiría flujos de CLI, deploy de Edge Functions, migraciones remotas, documentación y trazabilidad histórica. La mejora sería principalmente visual, pero el riesgo operativo es real.

Recomendación explícita: **conviene dejar `supabase/` en raíz y reforzar el canon/documentación.** En una fase posterior sí conviene resolver la duplicación histórica de `apps/gold/supabase/`, pero como tarea separada y controlada.

## 2. Estado actual

### Estructura Supabase detectada

En raíz:

```text
supabase/
├── .branches/
├── .temp/
├── functions/
│   └── agro-assistant/
│       └── index.ts
├── migrations/
├── sql/
├── supabase/
├── .env
├── .env.local
├── .gitignore
├── config.toml
└── config.toml.old
```

Dentro de producto:

```text
apps/gold/supabase/
├── .branches/
├── .temp/
├── migrations/
├── snippets/
├── .gitignore
├── agro_schema.sql
└── config.toml
```

### Diferencias operativas relevantes

| Punto | `supabase/` raíz | `apps/gold/supabase/` |
|---|---:|---:|
| `config.toml` | Sí | Sí |
| `project_id` | `YavlGold` | `gold` |
| `.temp/project-ref` | Sí | No |
| Migraciones | 25 | 8 |
| Edge Functions | 1 (`agro-assistant`) | No existe `functions/` |
| Config de función | `[functions.agro-assistant] verify_jwt = false` | No existe |
| SQL auxiliar | Sí (`supabase/sql/`) | No equivalente completo |

El CLI instalado localmente es `supabase 2.72.7`. El propio CLI indica que existe una versión más nueva (`2.90.0`), por lo que cualquier migración estructural debería hacerse después de revisar compatibilidad con la versión efectiva que use el equipo.

## 3. Dependencias detectadas

### Supabase CLI

Evidencia local:

```text
supabase --help
--workdir string    path to a Supabase project directory
```

`supabase status --workdir .` intenta inspeccionar contenedores con nombre asociado a `supabase/config.toml` de raíz:

```text
supabase_db_YavlGold
```

`supabase status --workdir .\apps\gold` intenta inspeccionar contenedores asociados a `apps/gold/supabase/config.toml`:

```text
supabase_db_gold
```

Ambos comandos fallaron porque Docker Desktop no estaba disponible, pero el fallo confirmó que el CLI distingue ambos proyectos por `workdir` y `project_id`.

Evidencia oficial de Supabase:

- La referencia `supabase init` indica que crea `supabase/config.toml` en el directorio de trabajo actual.
- La misma referencia permite sobrescribir el directorio con `SUPABASE_WORKDIR` o `--workdir`.
- La documentación de configuración indica que `config.toml` vive dentro del directorio `supabase` del proyecto.
- La documentación de Edge Functions recomienda la estructura `supabase/functions`, `supabase/migrations` y `supabase/config.toml`.

Fuentes consultadas:

- <https://supabase.com/docs/reference/cli/supabase-init>
- <https://supabase.com/docs/guides/local-development/managing-config>
- <https://supabase.com/docs/guides/functions/development-tips>

### `config.toml`

Dependencias de ruta detectadas:

- `db.migrations.schema_paths = []`, con comentario de Supabase indicando que los patrones son relativos al directorio `supabase`.
- `db.seed.sql_paths = ["./seed.sql"]`, relativo al directorio del proyecto Supabase.
- Comentarios de plantillas de email con rutas como `./supabase/templates/invite.html` o `./templates/password_changed_notification.html`.
- En raíz existe `[functions.agro-assistant] verify_jwt = false`, relevante para CORS/OPTIONS y despliegue de la Edge Function.

Riesgo principal: mover sin revisar rutas relativas cambia el punto de referencia efectivo para seeds, templates, funciones, import maps y cualquier path futuro.

### Migraciones

Ruta actual de migraciones vinculadas más completas:

```text
supabase/migrations/
```

Estado comparado:

- `supabase/migrations/`: 25 archivos.
- `apps/gold/supabase/migrations/`: 8 archivos.
- Solo hay coincidencia parcial.
- `apps/gold/supabase/migrations/` conserva migraciones antiguas o de producto que no equivalen al historial root.
- El reporte activo ya documenta incidentes donde una migración existía en `apps/gold/supabase/migrations/` pero no en `supabase/migrations/`, y por eso no había sido aplicada al remoto hasta copiarla al directorio raíz vinculado.

Riesgo principal: mover o consolidar sin plan puede repetir exactamente la clase de error ya vivida: migración escrita en el árbol equivocado, no aplicada al remoto, y sistema visual esperando una tabla/RPC que no existe.

### Edge Functions

Ubicación actual:

```text
supabase/functions/agro-assistant/index.ts
```

`apps/gold/supabase/` no contiene `functions/`.

Además, `supabase/config.toml` raíz contiene:

```toml
[functions.agro-assistant]
verify_jwt = false
```

Riesgo principal: mover solo carpetas o usar la copia de `apps/gold/supabase/` dejaría fuera la Edge Function y su configuración. Esto puede romper `supabase functions deploy agro-assistant`, `supabase functions serve`, CORS/OPTIONS o el comportamiento de autenticación ya documentado en sesiones previas.

### Scripts del repo

`package.json` raíz contiene:

```json
"sb:init": "cd apps/gold && supabase init",
"sb:up": "cd apps/gold && supabase start -x studio,imgproxy,vector,logflare,edge-runtime,supavisor,postgres-meta,mailpit",
"sb:up:ui": "cd apps/gold && supabase start -x imgproxy,vector,logflare,edge-runtime,supavisor,mailpit",
"sb:down": "cd apps/gold && supabase stop",
"sb:status": "cd apps/gold && supabase status",
"dev:offline": "pnpm sb:up && pnpm -C apps/gold dev -- --mode offline"
```

Esto significa que los comandos locales `sb:*` operan contra `apps/gold/supabase/`, no contra `supabase/` raíz.

Pero la documentación activa y el historial de incidentes indican que `supabase/` raíz es el proyecto vinculado al remoto para migraciones reales.

Conclusión: el repo ya tiene una desalineación operativa. Mover `supabase/` no la arregla por sí solo; puede empeorarla si no se define primero cuál árbol es canónico para local, remoto, migraciones y funciones.

### Documentación canónica

Documentos que asumen `supabase/` en raíz:

- `AGENTS.md`: “El directorio `supabase/` en raíz es infraestructura del repo y NO debe moverse sin diagnóstico serio previo”.
- `FICHA_TECNICA.md`: lista `supabase/` como infraestructura del repo.
- `README.md`: lista `supabase/` como infraestructura Supabase.
- `apps/gold/public/llms.txt`: confirma que `supabase/` root es infraestructura y no debe moverse sin diagnóstico.

Documentos que asumen o mencionan `apps/gold/supabase/`:

- `apps/gold/docs/LOCAL_FIRST.md`: orienta el flujo local/offline a `apps/gold/supabase/config.toml`.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`: contiene historial mixto, incluyendo incidentes donde migraciones nacieron en `apps/gold/supabase/` y tuvieron que copiarse a `supabase/migrations/`.

Conclusión documental: el canon reciente protege `supabase/` raíz, pero persiste documentación operativa anterior o paralela que empuja scripts locales hacia `apps/gold/supabase/`.

## 4. Riesgos de mover la carpeta

1. **Ruptura de vínculo remoto**
   - `supabase/.temp/project-ref` existe en raíz y no existe en `apps/gold/supabase/`.
   - Mover sin preservar correctamente `.temp`, vínculo y contexto puede dejar el CLI apuntando al proyecto equivocado o sin vínculo.

2. **Pérdida o desalineación de migraciones**
   - La raíz tiene 25 migraciones; `apps/gold/supabase/` tiene 8.
   - El historial ya muestra errores por migraciones creadas en el árbol equivocado.

3. **Ruptura de Edge Function**
   - La Edge Function real vive solo en `supabase/functions/agro-assistant/index.ts`.
   - La configuración `[functions.agro-assistant] verify_jwt = false` está solo en `supabase/config.toml`.

4. **Cambio implícito de rutas relativas**
   - `config.toml` usa rutas relativas para seed/templates y puede usar import maps o entrypoints de funciones.
   - Mover cambia la base mental y operativa desde donde se ejecutan comandos.

5. **Confusión entre producto e infraestructura**
   - `apps/gold/` es producto visible y operativo.
   - `supabase/` es infraestructura de repo: DB, migrations, Edge Functions, link remoto.
   - Meterlo dentro del producto puede parecer más local, pero mezcla responsabilidades.

6. **Riesgo de automatizaciones futuras**
   - Deploy, CI, scripts manuales y agentes tienden a asumir convenciones.
   - Supabase documenta la estructura `supabase/` como directorio de proyecto; moverlo requiere `--workdir` o scripts explícitos en todas partes.

7. **Riesgo de falsa limpieza**
   - El movimiento no elimina la duplicación; solo cambia dónde está.
   - La mejora visual no compensa la pérdida de claridad operativa.

## 5. Beneficios potenciales si se moviera

Beneficios reales pero limitados:

1. Mayor cumplimiento estricto del principio de localidad si se considerara Supabase parte del producto.
2. Menos carpetas visibles en raíz.
3. Posible alineación con los scripts actuales `sb:*`, que ya hacen `cd apps/gold`.
4. Menor fricción para agentes que buscan todo lo de YavlGold dentro de `apps/gold/`.

Estos beneficios no son suficientes en el estado actual porque `supabase/` no es solo producto visible: es infraestructura operativa con vínculo remoto, migraciones y Edge Functions.

## 6. Coste operativo real del movimiento

Mover correctamente implicaría, como mínimo:

1. Congelar cambios de DB y Edge Functions durante la migración.
2. Elegir un único canon: raíz o `apps/gold/supabase/`.
3. Comparar y reconciliar migraciones archivo por archivo.
4. Preservar o regenerar vínculo remoto (`project-ref`) con cuidado.
5. Migrar `functions/agro-assistant/`.
6. Migrar configuración `[functions.agro-assistant]`.
7. Revisar rutas relativas de `config.toml`.
8. Actualizar `package.json`, docs, scripts y reportes.
9. Ejecutar comandos Supabase con `--workdir apps/gold` o desde `apps/gold`.
10. Probar `supabase db push`, `supabase functions deploy`, `supabase functions serve`, `supabase status`, `pnpm dev:offline` y `pnpm build:gold`.
11. Confirmar que la Edge Function sigue respondiendo desde el frontend.
12. Limpiar o archivar la carpeta duplicada sin perder historia.

Ese coste es alto para una mejora principalmente organizativa. No debería ejecutarse como fase de limpieza.

## 7. Recomendación explícita

**Conviene dejar `supabase/` en raíz y reforzar documentación/canon.**

Postura firme:

- `supabase/` raíz debe seguir siendo la infraestructura Supabase canónica del repo.
- `apps/gold/supabase/` debe tratarse como duplicación histórica/parcial hasta que se haga una tarea separada de consolidación.
- No conviene mover `supabase/` hacia `apps/gold/supabase/` en esta fase.
- Sí conviene abrir una fase posterior para decidir qué hacer con `apps/gold/supabase/`: archivar, eliminar, sincronizar o convertir en sandbox local explícito. Esa decisión requiere otro diagnóstico porque hoy contiene migraciones/documentación que han sido usadas por agentes.

La razón central: la carpeta raíz tiene valor operativo real; moverla ahora resolvería una incomodidad visual pero agregaría riesgo sobre CLI, remoto, migraciones y Edge Functions.

## 8. Si se moviera: plan paso a paso (solo hipotético, no ejecutar)

No ejecutar este plan sin aprobación explícita.

1. Crear una rama dedicada.
2. Congelar cambios de base de datos, Edge Functions y scripts Supabase.
3. Hacer backup del árbol completo `supabase/` y listar checksums de migraciones.
4. Comparar `supabase/migrations/` vs `apps/gold/supabase/migrations/`.
5. Definir cuál migración vive, cuál es draft y cuál ya fue aplicada.
6. Consolidar en una sola carpeta temporal.
7. Mover `supabase/functions/agro-assistant/` al destino.
8. Migrar `[functions.agro-assistant] verify_jwt = false`.
9. Verificar rutas relativas de seeds, templates, import maps y entrypoints.
10. Rehacer vínculo con `supabase link` o preservar `.temp/project-ref` según el flujo aprobado.
11. Actualizar scripts `sb:*` para usar `--workdir apps/gold` de forma explícita.
12. Actualizar `AGENTS.md`, `FICHA_TECNICA.md`, `README.md`, `llms.txt` y `LOCAL_FIRST.md`.
13. Ejecutar `supabase status`, `supabase db push --dry-run` si aplica, `supabase migration list`, `supabase functions serve` y deploy controlado de `agro-assistant`.
14. Ejecutar `pnpm build:gold`.
15. Documentar la migración en `AGENT_REPORT_ACTIVE.md`.

Este plan confirma que el movimiento no es una acción simple de filesystem. Es una migración de infraestructura.

## 9. Veredicto final

**No mover `supabase/` desde raíz hacia `apps/gold/supabase/` ahora.**

La decisión técnica correcta es:

1. Mantener `supabase/` en raíz como infraestructura canónica del repo.
2. Documentar que no es deuda visual ni zombie.
3. Reconocer que `apps/gold/supabase/` es una duplicación parcial que requiere saneamiento posterior.
4. Corregir en otra fase la desalineación entre scripts `sb:*`, `LOCAL_FIRST.md` y el canon de infraestructura raíz.

Veredicto: **conviene dejarlo en raíz y reforzar documentación/canon.**

No se ejecutó ningún movimiento estructural.
