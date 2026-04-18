# INFORME CODEX — Diagnóstico de apps/gold/supabase

## 1. Resumen ejecutivo

Diagnóstico solicitado: entender qué representa hoy `apps/gold/supabase/`, qué riesgos trae mantenerlo dentro del producto y cuál sería la estrategia más segura para sanear esa duplicación histórica.

Veredicto técnico: **`apps/gold/supabase/` es una duplicación histórica parcialmente viva y operativamente ambigua.**

No es una carpeta muerta simple. Tampoco es el Supabase canónico. Tiene valor documental y contiene migraciones de tablas que el producto sí referencia, pero no tiene vínculo remoto, no tiene Edge Functions, no contiene el historial completo de migraciones y su `config.toml` difiere del proyecto Supabase canónico de raíz.

La carpeta canónica debe seguir siendo:

```text
supabase/
```

La carpeta diagnosticada:

```text
apps/gold/supabase/
```

debe tratarse como un árbol secundario, parcial y peligroso para agentes. La salida segura no es borrarla de golpe: primero hay que reconciliar su contenido contra el remoto y contra `supabase/` raíz; después conviene archivar o eliminar la carpeta secundaria y corregir scripts/documentación para que no vuelvan a escribir migraciones en el lugar equivocado.

Recomendación explícita: **archivar o eliminar `apps/gold/supabase/` solo después de validación y consolidación controlada.** En el estado actual, la opción más segura para una fase posterior es convertir temporalmente su contenido útil en una lista de reconciliación, migrar lo que falte al canon raíz, y luego retirar la carpeta secundaria del árbol activo del producto.

## 2. Qué contiene hoy

Se leyó completo el árbol `apps/gold/supabase/`.

Contenido detectado:

```text
apps/gold/supabase/
├── .branches/
│   └── _current_branch
├── .temp/
│   └── cli-latest
├── migrations/
│   ├── 20260108100000_create_announcements.sql
│   ├── 20260108100500_create_app_admins.sql
│   ├── 20260108101000_create_notifications_feedback.sql
│   ├── 20260108101500_create_user_favorites.sql
│   ├── 20260311113000_create_user_onboarding_context.sql
│   ├── 20260313170000_add_ia_context_to_farmer_profile.sql
│   ├── 20260318120000_create_agro_operational_cycles.sql
│   └── 20260411130000_create_agro_period_cycles.sql
├── snippets/
├── .gitignore
├── agro_schema.sql
└── config.toml
```

### Clasificación del contenido

| Pieza | Estado técnico | Lectura |
|---|---|---|
| `config.toml` | Vivo para scripts locales `sb:*`, pero no canónico remoto | Config local parcial con `project_id = "gold"` |
| `.branches/_current_branch` | Metadata local | Dice `main`; no aporta canon de backend |
| `.temp/cli-latest` | Metadata local | Dice `v2.84.2`; raíz dice `v2.90.0` |
| `.temp/project-ref` | Ausente | No hay vínculo remoto local en este árbol |
| `migrations/` | Parcialmente vivo / parcialmente ambiguo | 8 migraciones; 7 no existen por nombre en raíz, 1 sí coincide |
| `snippets/` | Vacío | Sin valor operativo detectado |
| `agro_schema.sql` | Legacy/manual | Schema V9.4 antiguo, no equivalente al estado real actual |
| `functions/` | Ausente | No contiene Edge Functions |

### Lectura semántica

`apps/gold/supabase/` hoy es una mezcla de:

- sandbox local antiguo o paralelo;
- fuente histórica de algunas migraciones creadas por agentes;
- duplicación parcial de backend;
- carpeta que scripts locales todavía usan;
- carpeta peligrosa porque parece canónica al estar dentro del producto.

No debe llamarse “muerta” sin matiz. Sí debe llamarse **ambigua**.

## 3. Diferencias contra supabase/ raíz

### Estructura

| Punto | `supabase/` raíz canónico | `apps/gold/supabase/` |
|---|---:|---:|
| `config.toml` | Sí | Sí |
| `project_id` | `YavlGold` | `gold` |
| `.temp/project-ref` | Sí: `gerzlzprkarikblqxpjt` | No existe |
| `.temp/cli-latest` | `v2.90.0` | `v2.84.2` |
| Migraciones locales | 25 | 8 |
| Edge Functions | Sí: `agro-assistant` | No |
| SQL auxiliar | Sí: `supabase/sql/` | No |
| `agro_schema.sql` | No | Sí, legacy/manual |
| `snippets/` | No | Sí, vacío |

### Configuración

Diferencias relevantes en `config.toml`:

- Raíz: `project_id = "YavlGold"`.
- Apps: `project_id = "gold"`.
- Raíz: contiene `[functions.agro-assistant] verify_jwt = false`.
- Apps: no contiene sección `[functions.agro-assistant]`.
- Apps: contiene bloques nuevos/extra como `health_timeout`, `storage.s3_protocol`, `storage.analytics` y `storage.vector`.
- Raíz: `minimum_password_length = 8`.
- Apps: `minimum_password_length = 6`.

Impacto: ambos configs pueden levantar entornos locales distintos y producir nombres de contenedor distintos (`supabase_db_YavlGold` vs `supabase_db_gold`). No son intercambiables.

### Migraciones

`apps/gold/supabase/migrations/` contiene 8 archivos.

Solo una migración está también en raíz y es idéntica por hash:

```text
20260411130000_create_agro_period_cycles.sql
```

Las otras 7 existen solo en `apps/gold/supabase/migrations/` por nombre:

```text
20260108100000_create_announcements.sql
20260108100500_create_app_admins.sql
20260108101000_create_notifications_feedback.sql
20260108101500_create_user_favorites.sql
20260311113000_create_user_onboarding_context.sql
20260313170000_add_ia_context_to_farmer_profile.sql
20260318120000_create_agro_operational_cycles.sql
```

El remoto sí tiene tablas relacionadas con esas migraciones (`announcements`, `app_admins`, `notifications`, `feedback`, `user_favorites`, `user_onboarding_context`, `agro_operational_cycles`, `agro_operational_movements`, `agro_farmer_profile`, `agro_period_cycles`, `agro_roi_calculations`), pero el historial remoto de migraciones no calza uno a uno con los nombres/versions de esta carpeta.

Lectura: varias piezas fueron aplicadas por otra vía, con otro timestamp, manualmente o desde otro flujo. Eso aumenta el riesgo de usar `apps/gold/supabase/migrations/` como fuente canónica sin reconciliación.

### Edge Functions

Raíz:

```text
supabase/functions/agro-assistant/index.ts
```

`apps/gold/supabase/`:

```text
No contiene functions/
```

La Edge Function remota `agro-assistant` está activa y su entrypoint reportado apunta al árbol raíz:

```text
C:\Users\yerik\gold\supabase\functions\agro-assistant\index.ts
```

Conclusión: `apps/gold/supabase/` no sirve hoy como proyecto Supabase completo para deploy de funciones.

## 4. Qué referencias vivas la usan

### Scripts

`package.json` raíz usa `apps/gold` como workdir para Supabase local:

```json
"sb:init": "cd apps/gold && supabase init",
"sb:up": "cd apps/gold && supabase start -x studio,imgproxy,vector,logflare,edge-runtime,supavisor,postgres-meta,mailpit",
"sb:up:ui": "cd apps/gold && supabase start -x imgproxy,vector,logflare,edge-runtime,supavisor,mailpit",
"sb:down": "cd apps/gold && supabase stop",
"sb:status": "cd apps/gold && supabase status",
"dev:offline": "pnpm sb:up && pnpm -C apps/gold dev -- --mode offline"
```

Esto significa que `apps/gold/supabase/` sí participa en flujo local/offline actual.

### Documentación viva

`apps/gold/docs/LOCAL_FIRST.md` indica:

- ejecutar `pnpm sb:init` solo si `apps/gold/supabase/config.toml` no existe;
- usar `pnpm sb:up`, `pnpm sb:up:ui` y `pnpm sb:status` para el flujo offline.

`apps/gold/docs/AGENT_REPORT_ACTIVE.md` contiene múltiples referencias históricas a `apps/gold/supabase/migrations/`, incluyendo incidentes donde migraciones nacieron en el árbol secundario y luego tuvieron que reflejarse o copiarse al árbol raíz.

### Código del producto que depende de tablas definidas en ese árbol

Hay código vivo que consulta tablas presentes en las migraciones de `apps/gold/supabase/`:

| Tabla | Referencias vivas detectadas |
|---|---|
| `announcements` | `assets/js/announcements/announcementsManager.js`, `assets/js/components/announcementManager.js`, `assets/js/admin/adminManager.js` |
| `app_admins` | `assets/js/admin/adminManager.js` |
| `notifications` | `assets/js/components/notifications.js`, `dashboard/index.html` |
| `feedback` | `assets/js/components/feedbackManager.js`, `assets/js/admin/adminManager.js` |
| `user_favorites` | `assets/js/modules/moduleManager.js` |
| `user_onboarding_context` | `assets/js/profile/onboardingManager.js`, `agro/agro-ia-wizard.js` |
| `agro_farmer_profile` | `agro/agroperfil.js`, `agro/agro-stats-report.js`, `agro/agro.js` |
| `agro_operational_cycles` | `agro/agroOperationalCycles.js`, `agro/agro-period-cycles.js` |
| `agro_period_cycles` | `agro/agro-period-cycles.js` |
| `agro_roi_calculations` | `agro/agro.js` |

Esto no significa que la carpeta sea canónica. Significa que su contenido no puede descartarse sin validar que el canon raíz y el remoto preservan esas estructuras.

## 5. Riesgos de mantenerla

### Tabla de severidad

| Hallazgo | Impacto | Probabilidad | Severidad | Acción recomendada después |
|---|---|---:|---:|---|
| Dos árboles Supabase visibles (`supabase/` y `apps/gold/supabase/`) | Agentes escriben migraciones en el lugar equivocado | Alta | Alta | Declarar raíz como único canon y sanear árbol secundario |
| Scripts `sb:*` apuntan a `apps/gold` | QA/offline usa config parcial, no raíz canónica | Alta | Alta | Rediseñar scripts con `--workdir` explícito al canon o sandbox declarado |
| `apps/gold/supabase/` no tiene `.temp/project-ref` | Comandos remotos pueden fallar o apuntar a proyecto no vinculado | Media | Alta | No usar para operaciones remotas |
| Migraciones parciales | DDL futuro puede omitirse del canon raíz o duplicarse | Alta | Alta | Reconciliar migración por migración |
| Edge Function ausente | Deploy/serve desde árbol secundario no representa backend completo | Media | Alta | Mantener funciones solo en raíz canónica |
| `config.toml` desalineado | Entornos locales divergentes y nombres de contenedor distintos | Media | Media | Unificar o retirar config secundaria |
| `agro_schema.sql` legacy/manual | Confunde a agentes sobre schema actual | Media | Media | Archivar como histórico o retirar tras validación |
| `snippets/` vacío | Ruido contextual | Alta | Baja | Eliminar o archivar en saneamiento |
| Documentación viva apunta al árbol secundario | Refuerza uso accidental del árbol incorrecto | Alta | Alta | Corregir docs en fase posterior |
| Tablas reales asociadas a migraciones secundarias | Borrado directo puede perder trazabilidad de DDL útil | Media | Alta | Validar remoto y raíz antes de retirar |

### Riesgo para agentes

La carpeta está dentro de `apps/gold/`, que el canon define como producto activo. Eso induce a los agentes a tratarla como más “propia” o más canónica que `supabase/` raíz. El riesgo no es estético: ya hay historial de migraciones creadas en `apps/gold/supabase/` que no estaban en raíz y por tanto no seguían el flujo operativo correcto.

### Riesgo para migraciones futuras

Un agente puede crear una migración en `apps/gold/supabase/migrations/` porque:

- los scripts `sb:*` entran a `apps/gold`;
- `LOCAL_FIRST.md` menciona `apps/gold/supabase/config.toml`;
- la carpeta existe y parece legítima;
- parte del código depende de tablas definidas allí.

Esto puede producir migraciones que nunca lleguen al remoto o que luego deban copiarse manualmente a raíz.

### Riesgo documental

El canon dice que `supabase/` raíz es infraestructura. Pero `LOCAL_FIRST.md` y reportes previos mantienen referencias al árbol secundario. Esa contradicción crea una fuente de verdad doble.

### Riesgo de deploy inconsistente

La Edge Function real está en raíz. Si alguien usa `apps/gold/supabase/` como proyecto completo, no encontrará `functions/agro-assistant`. El deploy de funciones y la configuración `verify_jwt = false` quedan fuera.

### Riesgo de QA/offline confuso

El flujo offline actual puede levantar `project_id = "gold"` desde `apps/gold`, mientras el canon raíz usa `project_id = "YavlGold"`. Eso crea dos perfiles locales distintos. Un bug puede reproducirse en uno y no en otro, o un agente puede validar contra un schema parcial.

## 6. Riesgo de sanearla mal

Sanear mal `apps/gold/supabase/` puede ser tan peligroso como dejarla ambigua.

Riesgos concretos:

1. **Borrado directo sin reconciliación**
   - Se perdería trazabilidad local de migraciones que sí definen tablas vivas.

2. **Fusionar migraciones por nombre sin revisar remoto**
   - Puede duplicar DDL ya aplicado bajo otros timestamps.

3. **Copiar todo a raíz**
   - Puede introducir migraciones antiguas o conflictivas en el canon raíz.

4. **Renombrar como sandbox sin cambiar scripts**
   - Mantendría el problema: comandos reales seguirían apuntando a un árbol secundario.

5. **Corregir docs pero no scripts**
   - El equipo leería una cosa y ejecutaría otra.

6. **Corregir scripts pero no migraciones**
   - La raíz seguiría sin registrar algunas piezas históricas o el remoto seguiría sin trazabilidad clara.

La regla segura: **no borrar ni fusionar hasta tener matriz de reconciliación por archivo, por tabla y por estado remoto.**

## 7. Opciones de saneamiento futuro

### Opción A — Archivar `apps/gold/supabase/`

Moverlo en una fase posterior a una zona claramente histórica, por ejemplo:

```text
apps/gold/archive/supabase-legacy/
```

Ventajas:

- preserva evidencia histórica;
- reduce riesgo de pérdida;
- deja claro que no es canon operativo.

Desventajas:

- si no se corrigen scripts/docs, el problema persiste;
- seguiría existiendo dentro de `apps/gold/`, aunque marcado como archive.

### Opción B — Eliminarlo tras validación

Eliminar la carpeta secundaria después de confirmar:

- qué migraciones ya existen o están aplicadas en remoto;
- qué DDL falta en `supabase/` raíz;
- qué scripts serán reorientados al canon raíz;
- qué docs se actualizarán.

Ventajas:

- elimina la fuente de confusión;
- respeta el canon de `supabase/` raíz.

Desventajas:

- requiere validación cuidadosa;
- no debe hacerse si quedan migraciones únicas sin registrar en raíz o sin respaldo.

### Opción C — Convertirlo en sandbox local explícito

Mantenerlo como sandbox, pero renombrado/documentado con claridad:

```text
apps/gold/supabase-local-sandbox/
```

Ventajas:

- preserva flujo offline separado si realmente se necesita;
- hace explícita la intención.

Desventajas:

- mantiene dos proyectos Supabase;
- exige scripts y docs muy claros;
- sigue siendo carga cognitiva para agentes.

### Opción D — Dejarlo vivo pero documentado

No recomendada. Documentar la ambigüedad sin resolverla reduce un poco el riesgo, pero deja intacta la posibilidad de escribir en el árbol equivocado.

## 8. Recomendación explícita

Recomendación: **eliminar o archivar `apps/gold/supabase/` en una fase posterior, pero solo después de reconciliación controlada.**

Postura concreta:

1. Mantener `supabase/` raíz como único canon de infraestructura Supabase.
2. No usar `apps/gold/supabase/` para operaciones remotas.
3. Tratar `apps/gold/supabase/` como duplicación histórica parcialmente viva.
4. Antes de sanear, crear una matriz de reconciliación:
   - archivo;
   - tabla/RPC afectada;
   - existe en remoto;
   - existe en raíz;
   - debe migrarse, archivarse o descartarse.
5. Reorientar scripts `sb:*` y `LOCAL_FIRST.md` al flujo canónico que se decida.
6. Retirar la carpeta secundaria del árbol activo solo después de validar que ninguna pieza útil queda únicamente allí.

La opción preferida es:

```text
Eliminar `apps/gold/supabase/` tras validación y consolidación,
o archivarlo temporalmente como `archive` si se necesita conservar evidencia.
```

No recomiendo convertirlo en sandbox permanente salvo que exista una necesidad real de mantener dos proyectos Supabase locales. Hoy parece más deuda operativa que una arquitectura intencional.

## 9. Veredicto final

`apps/gold/supabase/` representa hoy una **mezcla ambigua de sandbox local, duplicación histórica y fuente parcial de migraciones**.

No debe seguir indefinidamente dentro de `apps/gold/` con apariencia de infraestructura viva, porque:

- confunde a agentes;
- ya causó o acompañó desalineaciones de migraciones;
- participa en scripts locales;
- no representa el backend completo;
- no contiene Edge Functions;
- no tiene vínculo remoto;
- compite semánticamente con `supabase/` raíz.

Veredicto: **mantenerla tal como está es riesgo alto a mediano plazo.**

La salida más segura es una fase posterior de saneamiento controlado:

1. reconciliar contenido contra remoto y raíz;
2. preservar lo que falte en el canon;
3. corregir scripts y docs;
4. retirar o archivar `apps/gold/supabase/`;
5. dejar `supabase/` raíz como único punto operativo Supabase.

No se ejecutó saneamiento en esta sesión.
