# AGENT_REPORT_ACTIVE.md — YavlGold

Estado: ACTIVO
Fecha de apertura: 2026-04-27
Archivo anterior archivado: `AGENT_LEGACY_CONTEXT__2026-04-17__2026-04-27.md`

---

## Propósito

Este archivo es la única fuente activa de reportes de sesión para agentes IA dentro de YavlGold.

El contexto histórico previo quedó archivado en:

`apps/gold/docs/AGENT_LEGACY_CONTEXT__2026-04-17__2026-04-27.md`

---

## Estado actual del proyecto

- Release visible: V1.
- Enfoque actual: YavlGold centrado en Agro.
- Stack: Vanilla JS + Vite MPA + Supabase.
- Prohibido: React, Tailwind, SPA.
- ADN Visual V10.0 activo e inmutable.
- Agro es el módulo principal y operativo.
- Supabase canónico vive en `supabase/` raíz.
- Build canónico: `pnpm build:gold`.

---

## Decisiones canónicas vigentes

- `AGENTS.md` es la ley operativa del repo.
- `MANIFIESTO_AGRO.md` es la verdad semántica del módulo Agro.
- `ADN-VISUAL-V10.0.md` es la ley visual.
- `FICHA_TECNICA.md` describe estructura técnica vigente.
- No crecer `apps/gold/agro/agro.js` con nuevas features.
- Nuevas features de Agro deben nacer modulares.
- `AGENT_REPORT_ACTIVE.md` es estado vivo, no archivo histórico infinito.
- Daily logs son temporales y sirven como insumo para crónica mensual.

---

## Últimos hitos relevantes antes de esta rotación

### 2026-04-26 — Cierre P1 auditoría + Agro Shell

- `/music` retirado de superficies activas.
- `agent-guard` reforzado contra HTML activo con CDNs prohibidos.
- Node 20 fijado para herramientas/CI.
- GitHub Actions `Gold Build` agregado.
- `supabase/seed.sql` mínimo y seguro creado.
- RLS/Storage staging documentado como PASS.
- PostCSS actualizado a versión segura.
- Workflows con permisos explícitos mínimos.
- Agro entra siempre en Dashboard Agro.
- Rail persistente implementado.
- Launcher expandido implementado.
- Feedback mobile corregido.
- Hamburguesa legacy del header eliminada.
- Navegación shell documentada en Manifiesto, Ficha Técnica y docs públicas.

### 2026-04-27 — Seguridad Supabase incremental

- Auditoría RLS estática: YELLOW sin P1 confirmado.
- Primer fix seguro aplicado:
  - índices `user_id` para `agro_operational_cycles`;
  - índices `user_id` para `agro_operational_movements`.
- No se cambiaron policies ni comportamiento RLS.

---

## Frentes abiertos

1. QA visual final de Agro Shell en mobile real.
2. Seguridad P2:
   - modernizar policies legacy a `to authenticated` + `(select auth.uid())`;
   - revisar grants RPC;
   - definir límites MIME/file size de `agro-evidence`;
   - decidir contrato de `avatars`;
   - inventario contra DB viva.
3. CSP/HSTS y headers de seguridad.
4. Reemplazo progresivo de diálogos nativos por modal canónico.
5. Limpieza documental de referencias legacy.
6. Crónica mensual de abril al cierre del mes.

---

## Deuda técnica viva

- `agro.js` sigue siendo monolito legacy.
- `agro.css` e `index.html` siguen siendo superficies grandes.
- Existen `alert`, `confirm`, `prompt` nativos pendientes.
- Existe volumen alto de `innerHTML`; requiere auditoría incremental.
- Market ticker tiene deuda de polling duplicado.
- Algunos docs legacy pueden conservar referencias stale.
- Daily logs de abril deben consolidarse y limpiarse tras crónica mensual.

---

## Reglas para próximas sesiones

- Diagnóstico primero.
- Diff mínimo.
- No tocar `agro.js` salvo cirugía justificada.
- No tocar Supabase sin migración controlada.
- No tocar documentos canónicos sin autorización expresa.
- Ejecutar `pnpm build:gold` al cerrar cambios.
- No usar `git add .`.
- Mantener daily logs fuera de Git si están definidos como temporales locales.

---

## 2026-04-27 — Formato activo post-rotación

**Objetivo:** Restaurar compatibilidad del reporte activo con el guard documental del build tras la rotación canónica.

### Diagnostico

El nuevo `AGENT_REPORT_ACTIVE.md` fue creado correctamente como reporte activo limpio tras archivar `AGENT_LEGACY_CONTEXT__2026-04-17__2026-04-27.md`, pero el build requiere que la fuente activa conserve las marcas `Diagnostico` y `Plan`.

### Plan

- Mantener la rotación canonica.
- Conservar el archivo legacy como historico integro.
- Anadir esta seccion minima al reporte activo para cumplir el guard documental.
- Validar con `pnpm build:gold`.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Se agrego seccion minima con `Diagnostico` y `Plan` para cumplir `agent-report-check.mjs`. |

### Validacion

- Pendiente ejecutar `pnpm build:gold`.

### NO se hizo

- No se revirtio la rotacion.
- No se toco codigo.
- No se toco Supabase.
- No se toco Vercel.

---

## 2026-04-27 — Rail mobile lateral + Feedback restaurado

**Objetivo:** Reemplazar el rail inferior mobile por un rail lateral compacto, evitar solapes con contenido Agro y restaurar Feedback visible en mobile.

### Diagnostico

El rail mobile era una barra horizontal fija en la parte inferior (`top: auto; bottom: ...; left: ...; right: ...`) que solapaba contenido del dashboard. El boton Feedback estaba oculto con `display: none` en `max-width: 768px`. El `padding-bottom: 5.4rem` compensaba la barra inferior pero no era suficiente.

### Plan

- Eliminar la barra inferior mobile del rail.
- Posicionar el rail como lateral izquierdo compacto en mobile (`width: 3.4rem`, centrado verticalmente).
- Restaurar Feedback FAB como pill flotante en esquina inferior derecha.
- Ajustar `padding-left` del contenedor principal para compensar el rail lateral.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro.css` | CSS mobile rail | Barra inferior eliminada; rail lateral izquierdo compacto con `width: 3.4rem`, centrado verticalmente, `flex-direction: column`, items reducidos a icono con `min-height: 2.6rem`. |
| `apps/gold/agro/agro.css` | CSS feedback | `.agro-feedback-fab` restaurado en mobile: `display: inline-flex`, posicionado abajo-derecha, `z-index: 110`, pill con sombra. |
| `apps/gold/agro/agro.css` | CSS layout | `app-container` en mobile: `padding-left: 4.2rem`, `padding-bottom: 0` (sin barra inferior). |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Sesion documentada. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).

### NO se hizo

- No se toco `agro.js`.
- No se toco `index.html` ni `agro-shell.js`.
- No se toco Supabase, Vercel, workflows ni credenciales.

---

## 2026-04-27 — Rail mobile colapsable con toggle lateral

**Objetivo:** Agregar control de visibilidad del rail lateral mobile para evitar solapes con contenido cuando el usuario necesita pantalla completa.

### Diagnostico

El rail lateral mobile anterior era siempre visible y en pantallas pequenas podia tapar contenido del borde izquierdo. No existia mecanismo para ocultarlo temporalmente. El Feedback FAB ya habia sido restaurado en la sesion previa.

### Plan

- Agregar boton toggle en el borde derecho del rail mobile (solo visible en `max-width: 768px`).
- Estado colapsado: rail se desplaza fuera de pantalla con `transform`, queda visible solo la pestaña del toggle.
- Estado expandido: rail visible con padding-left en el contenido.
- Persistir preferencia en localStorage (`YG_AGRO_MOBILE_RAIL_COLLAPSED_V1`).
- Respetar `prefers-reduced-motion`.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/index.html` | Markup | Boton `#agro-shell-rail-mobile-toggle` agregado dentro del `nav` del rail, con chevron izquierdo y aria-label. |
| `apps/gold/agro/agro.css` | CSS base | `.agro-shell-rail__mobile-toggle` oculto por defecto (`display: none`). Agregado a `prefers-reduced-motion`. |
| `apps/gold/agro/agro.css` | CSS mobile | En `max-width: 768px`: toggle visible como pestaña en borde derecho del rail; `body.agro-shell-rail-collapsed` desplaza rail con `transform` y elimina padding-left del contenido. |
| `apps/gold/agro/agro-shell.js` | JS | Nuevas funciones `readMobileRailCollapsed`/`writeMobileRailCollapsed` con localStorage seguro; listener en toggle que alterna body class, aria-expanded y label. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Sesion documentada. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).

### NO se hizo

- No se toco `agro.js`.
- No se toco Supabase, Vercel, workflows ni credenciales.

---

## 2026-04-27 — Toggle universal del rail + ocultamiento correcto

**Objetivo:** Corregir el toggle del rail para que funcione en desktop y mobile, y que al colapsar el rail desaparezca completamente dejando solo la pestaña.

### Diagnostico

El toggle anterior era mobile-only (`display: none` en base, `display: flex` solo en `max-width: 768px`). Al colapsar, `translateX(calc(-100% + 1.4rem))` dejaba parte del rail visible con iconos. En desktop no existia toggle.

### Plan

- Convertir el toggle en universal (visible en desktop y mobile).
- Corregir el translateX: rail se mueve `calc(-100% - 0.2rem)` y la pestaña se reposiciona con `translateX(calc(100% + 0.4rem))`.
- Override mobile: pestaña mas grande para touch target.
- Desktop breakpoint: padding-left reducido al colapsar.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro.css` | CSS universal | Toggle visible por defecto: pestaña discreta en borde derecho del rail (1.1rem x 1.8rem). Estado collapsed: rail `translateX(calc(-100% - 0.2rem))`, toggle reposicionado `translateX(calc(100% + 0.4rem))`. Padding del contenido eliminado. |
| `apps/gold/agro/agro.css` | CSS mobile | Override en `max-width: 768px`: pestaña mas grande (1.4rem x 2.2rem) para touch. Reglas duplicadas eliminadas. |
| `apps/gold/agro/agro.css` | CSS desktop | En `min-width: 961px`: `padding-left: var(--space-4)` cuando collapsed. |
| `apps/gold/agro/agro.css` | Reduced motion | Toggle e icono agregados a `prefers-reduced-motion`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Sesion documentada. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).

### NO se hizo

- No se toco `agro.js`.
- No se toco `index.html` ni `agro-shell.js` (el markup y JS del toggle ya estaban correctos de la sesion anterior).
- No se toco Supabase, Vercel, workflows ni credenciales.
- No se elimino el rail.
- No se rompio desktop.

---

## 2026-04-27 — Integracion visual del toggle como handle del rail

**Objetivo:** Corregir el aspecto visual del toggle del rail para que se perciba como un handle integrado al borde derecho del rail, no como un boton flotante desconectado.

### Diagnostico

El toggle usaba `right: -0.9rem` lo que dejaba un hueco visible entre el rail y la pestana. La pestana no compartia el estilo de borde ni el backdrop del rail, dando la impresion de un elemento flotante ajeno al rail.

### Plan

- Mover toggle a `right: 0` con `transform: translateX(100%)` para flush contra el borde.
- Emparejar borde con el rail usando `color-mix(in srgb, var(--gold-4) 18%, var(--border-neutral))` sin borde izquierdo.
- Agregar `box-shadow` lateral y `backdrop-filter: blur(14px)` coherentes con el rail.
- Simplificar transforms collapsed a `translateX(-100%)` / `translateX(100%)` limpios.
- Eliminar override mobile `right: -1.1rem` que recreaba el gap.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro.css` | CSS toggle base | `right: 0`, `transform: translateY(-50%) translateX(100%)`, borde coherente sin `border-left`, `box-shadow: 1px 0 6px rgba(0,0,0,0.2)`, `backdrop-filter: blur(14px)` igual al rail. |
| `apps/gold/agro/agro.css` | CSS collapsed | Rail: `translateX(-100%)` limpio. Toggle: `translateY(-50%) translateX(100%)` reposicionado al borde viewport. |
| `apps/gold/agro/agro.css` | CSS mobile | Eliminado `right: -1.1rem` que recreaba gap en mobile. Override conserva solo dimensiones touch. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Sesion documentada. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).

### NO se hizo

- No se toco `agro.js`, `index.html` ni `agro-shell.js`.
- No se toco Supabase, Vercel, workflows ni credenciales.
- No se cambio logica de collapse ni localStorage.

---

## 2026-04-27 — Diagnostico y plan P2 Supabase/RLS

**Objetivo:** abrir el frente Seguridad Supabase P2 solo como diagnostico/plan, sin fixes, sin migraciones y sin conexion a DB viva.

### Alcance ejecutado

- `git status --short`: sin salida al inicio; worktree limpio.
- Lectura estatica de `AGENTS.md`, `FICHA_TECNICA.md`, este reporte activo, docs `security/` y `ops/`, `supabase/config.toml`, `supabase/migrations/` y `tools/rls-smoke-test.js`.
- No se ejecuto `supabase db reset`.
- No se conecto a Supabase remoto ni staging.

### Veredicto

**YELLOW controlado.** No aparece P1 nuevo por auditoria estatica. El smoke staging RLS/Storage sigue documentado como PASS para `agro_pending` + `agro-evidence`. La deuda viva es P2/P3 de endurecimiento, inventario remoto y modernizacion gradual.

### Evidencia principal

| Area | Evidencia | Lectura |
|---|---|---|
| Storage `agro-evidence` | `supabase/migrations/20260420120000_security_trust_hardening_v1.sql` | Bucket privado y policies owner-folder con `(select auth.uid())`. |
| Smoke staging | `apps/gold/docs/security/RLS_STORAGE_VALIDATION_2026-04-23.md` | PASS en workflow manual sobre `main`; URL exacta del run sigue pendiente de pegar. |
| Config Supabase | `supabase/config.toml` | API expone `public` y `graphql_public`; Storage tiene limite global `50MiB`; no hay bucket config local con MIME types. |
| Indices operativos | `supabase/migrations/20260427120000_agro_operational_user_id_indexes.sql` | Primer fix seguro ya existe para `agro_operational_cycles` y `agro_operational_movements`. |
| Smoke script | `tools/rls-smoke-test.js` | Usa anon key + usuarios A/B; valida aislamiento DB y Storage; no usa `service_role`. |

### Hallazgos P2

1. **Policies owner-based antiguas sin modernizacion completa.**
   - `supabase/migrations/20260411130000_create_agro_period_cycles.sql` define policies sin `to authenticated` y con `auth.uid()` directo.
   - `supabase/migrations/20260417104335_agro_crops_roi_baseline.sql` hace lo mismo para `agro_crops` y `agro_roi_calculations`.
   - Riesgo: no es bypass confirmado, pero queda por debajo del patron moderno ya usado en `20260420120000_security_trust_hardening_v1.sql`.

2. **RPCs public con grants no explicitados en varias migraciones.**
   - `agro_rank_top_clients`, `agro_rank_pending_clients`, `agro_buyer_portfolio_summary_v1` y `agro_delete_buyer_cascade_v1` viven en esquema `public`.
   - Solo se vio `REVOKE/GRANT` explicito para `public.log_event` y `agro_rank_top_crops_profit`.
   - Riesgo: sin inventario vivo de `pg_proc`/grants no conviene cambiar aun; planificar REVOKE/GRANT explicito por funcion tras confirmar consumidores.

3. **Funciones `SECURITY DEFINER` a revisar por contrato.**
   - `public.handle_new_user()` es trigger de Auth esperado.
   - `public.log_event()` es wrapper `SECURITY DEFINER` con revoke/grant a `authenticated`.
   - `security.log_event()` esta en esquema no expuesto por API, pero hay `GRANT USAGE ON SCHEMA security TO authenticated`; conviene revisar si ese grant sigue siendo necesario.

4. **Storage contract incompleto para limites/MIME por bucket.**
   - `agro-evidence` tiene owner policies y bucket privado.
   - No se ve contrato explicito de `allowed_mime_types` ni `file_size_limit` por bucket en migraciones; solo limite global `50MiB`.
   - `avatars` sigue pendiente de decision: publico por diseno vs signed URLs/private.

### Hallazgos P3

1. **Uso directo de `auth.uid()` en policies ya owner-based.**
   - Aparece en tablas como `agro_feedback`, `agro_buyers`, `agro_farmer_profile`, `agro_public_profiles`, `agro_social_*`, `agro_task_cycles`, `announcements`, `notifications`, `feedback`, `user_favorites`, `user_onboarding_context` y objetos operativos.
   - Riesgo principal: rendimiento/consistencia, no bypass confirmado.

2. **`profiles` conserva semantica publica legacy.**
   - `001_setup_profiles_trigger.sql` tiene `select using (true)` y policies insert/update con `auth.uid()` directo.
   - No tocar sin decision de producto, porque cambiarlo podria modificar comportamiento publico esperado.

3. **Views.**
   - No se detectaron `CREATE VIEW` activos en migraciones raiz.
   - `apps/gold/docs/security/rls-profiles-policies.sql` conserva una propuesta documental de `profiles_public` con nota `security_invoker`, pero no es migracion activa.

### Plan por grupos pequenos

1. **P2-A / Policies owner-based de bajo riesgo.**
   - Tablas: `agro_period_cycles`, `agro_crops`, `agro_roi_calculations`.
   - Cambio futuro: migracion idempotente que dropee/recree solo esas policies con `to authenticated` y `((select auth.uid()) = user_id)`.
   - No tocar `profiles` en este grupo.

2. **P2-B / Inventario RPC y grants.**
   - Antes de migrar: consultar en DB autorizada `pg_proc`, `pg_namespace` y grants efectivos.
   - Luego: migracion explicita por RPC con `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE TO authenticated` donde corresponda.
   - Revisar especialmente `agro_buyer_portfolio_summary_v1` y `agro_delete_buyer_cascade_v1`.

3. **P2-C / Storage contract.**
   - Confirmar MIME reales usados por evidencias Agro antes de fijar `allowed_mime_types`.
   - Definir limite por bucket para `agro-evidence`.
   - Resolver decision `avatars` en documento/manifesto antes de tocar policies.

4. **P2-D / Profiles y superficie publica.**
   - Decidir si `profiles` sigue con lectura publica legacy o se migra a vista `profiles_public`.
   - Si se crea vista, exigir `security_invoker = true` en Postgres compatible.

5. **P3 / Limpieza y consistencia.**
   - Modernizar direct `auth.uid()` restante por tandas pequenas.
   - Solo limpiar policies duplicadas facturero si `pg_policies` vivo confirma duplicidad real.

### Primer fix recomendado posterior

Crear una unica migracion pequena para **P2-A**:

- `agro_period_cycles`: `select/insert/update/delete`.
- `agro_crops`: `select/insert/update/delete`.
- `agro_roi_calculations`: `select/insert/delete`.
- Patron: `for <cmd> to authenticated using ((select auth.uid()) = user_id)` y `with check ((select auth.uid()) = user_id)` cuando aplique.

### Validacion futura

- `git diff --check`.
- `pnpm build:gold`.
- Si el usuario autoriza DB viva: consultar `pg_policies`, `role_table_grants`, `pg_proc` y `storage.buckets`; no ejecutar resets destructivos.

### NO se hizo

- No se crearon migraciones.
- No se tocaron policies, RPCs, Storage ni Supabase config.
- No se toco Agro, `agro.js`, Edge Functions, Vercel, workflows ni credenciales.
- No se uso `git add`.

---

## 2026-04-27 — Plan de ejecucion P2-A policies owner-based

**Objetivo:** aplicar el primer fix P2-A recomendado: recrear solo las policies RLS owner-based antiguas de `agro_period_cycles`, `agro_crops` y `agro_roi_calculations` con rol explicito `to authenticated` y patron `((select auth.uid()) = user_id)`.

### Diagnostico

- `git status --short`: sin salida antes de editar.
- `agro_period_cycles` vive en `supabase/migrations/20260411130000_create_agro_period_cycles.sql`.
  - Policies: `user_own_period_cycles_select`, `user_own_period_cycles_insert`, `user_own_period_cycles_update`, `user_own_period_cycles_delete`.
  - Operaciones: select/insert/update/delete.
  - Condicion actual: `auth.uid() = user_id`.
  - Tiene `deleted_at`, pero la policy actual no filtra soft-delete; no se agregara condicion nueva.
- `agro_crops` vive en `supabase/migrations/20260417104335_agro_crops_roi_baseline.sql`.
  - Policies: `Users can view own crops`, `Users can insert own crops`, `Users can update own crops`, `Users can delete own crops`.
  - Operaciones: select/insert/update/delete.
  - Condicion actual: `auth.uid() = user_id`; update ya usa `using` + `with check`.
  - Tiene `deleted_at`, pero la policy actual no filtra soft-delete; no se agregara condicion nueva.
- `agro_roi_calculations` vive en `supabase/migrations/20260417104335_agro_crops_roi_baseline.sql`.
  - Policies: `Users can view own ROI calculations`, `Users can insert own ROI calculations`, `Users can delete own ROI calculations`.
  - Operaciones: select/insert/delete.
  - Condicion actual: `auth.uid() = user_id`.
  - No tiene `deleted_at`.

### Plan

- Crear una migracion nueva `supabase/migrations/20260427123000_p2a_owner_policies_authenticated.sql`.
- No tocar tablas, datos, RPC, grants, Storage, profiles ni config.
- Dropear y recrear solo las 11 policies listadas.
- Mantener semantica owner-based: `select/delete using`, `insert with check`, `update using + with check`.
- Ejecutar `git diff --check` y `pnpm build:gold`.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `supabase/migrations/20260427123000_p2a_owner_policies_authenticated.sql` | Migracion RLS | Recrea 11 policies owner-based con `to authenticated` y `((select auth.uid()) = user_id)`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs | Diagnostico, plan y cierre de la sesion P2-A. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).
- Nota: el build conserva el warning local de Node `v25.6.0` vs engine declarado `20.x`; no bloquea el build.

### NO se hizo

- No se tocaron tablas, datos, RPC/grants, Storage, `profiles`, Supabase config ni Edge Functions.
- No se toco Agro ni `agro.js`.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.
- No se uso `git add`.

---

## 2026-04-27 — Diagnostico P2-B RPC public/functions grants

**Objetivo:** auditar funciones/RPC en schema `public` y preparar plan seguro para endurecer grants sin aplicar migraciones ni cambiar comportamiento.

### Alcance ejecutado

- `git status --short`: sin salida antes de editar; worktree limpio.
- Lectura estatica de `AGENTS.md`, `FICHA_TECNICA.md`, `AGENT_REPORT_ACTIVE.md`, docs `security/` y `ops/`, migraciones Supabase y `tools/rls-smoke-test.js`.
- Busqueda de llamadas RPC en `apps/gold/agro/` con `rg`.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.

### Veredicto

**YELLOW controlado.** No aparece P1 confirmado por auditoria estatica. La superficie P2-B real es pequena: cuatro RPC activas de Agro no muestran `REVOKE/GRANT` explicito en migraciones, mientras `agro_rank_top_crops_profit` y `public.log_event` ya tienen grants explicitos.

### RPC usadas por Agro

| RPC | Uso frontend | Evidencia en migraciones | Lectura |
|---|---|---|---|
| `public.agro_rank_top_clients(date,date,integer,uuid)` | `apps/gold/agro/agro.js` usa `supabase.rpc('agro_rank_top_clients', params)` | Ultima definicion en `20260221231536_agro_rpc_date_filters_inclusive.sql`; no se encontro `REVOKE/GRANT` explicito para esta funcion. | P2: lectura owner-scoped por `auth.uid()`, pero executable grant queda implicito/default si no se confirma en DB viva. |
| `public.agro_rank_pending_clients(date,date,integer,uuid)` | `apps/gold/agro/agro.js` usa `supabase.rpc('agro_rank_pending_clients', params)` | Ultima definicion en `20260221231536_agro_rpc_date_filters_inclusive.sql`; no se encontro `REVOKE/GRANT` explicito para esta funcion. | P2: lectura owner-scoped por `auth.uid()`, pero falta contrato explicito de execution grants. |
| `public.agro_rank_top_crops_profit(date,date,integer,uuid)` | `apps/gold/agro/agro.js` usa `supabase.rpc('agro_rank_top_crops_profit', params)` | `20260221231650_agro_rank_top_crops_profit_order_repair.sql` define `SECURITY INVOKER`, `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO authenticated` y `service_role`. | Ya endurecida; no tocar en primer fix salvo inventario vivo contradiga. |
| `public.agro_buyer_portfolio_summary_v1()` | `apps/gold/agro/agro-cartera-viva.js` usa `supabaseClient.rpc(AGRO_BUYER_PORTFOLIO_RPC)` | Contrato final restaurado en `20260418120000_agro_buyer_portfolio_contract_restore.sql`; no se encontro `REVOKE/GRANT` explicito. | P2: RPC principal de Cartera Viva; lectura owner-scoped con `auth.uid()` en CTE. |
| `public.agro_delete_buyer_cascade_v1(uuid)` | `apps/gold/agro/agrocompradores.js` usa `state.supabase.rpc('agro_delete_buyer_cascade_v1', ...)` | `20260403143000_agro_delete_buyer_cascade_v1.sql` define `security invoker`, valida `auth.uid()` y ownership del comprador; no se encontro `REVOKE/GRANT` explicito. | P2 mas sensible: funcion destructiva, aunque owner-scoped. Debe ser el primer grant a cerrar. |

### Funciones public no clasificadas como primer fix

| Funcion | Tipo | Lectura |
|---|---|---|
| `public.log_event(text,jsonb)` | Wrapper `SECURITY DEFINER` | Ya tiene `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE TO authenticated` en `20260104130000_security_audit_log.sql`. No tocar en P2-B inicial. |
| `public.handle_new_user()` | Trigger de Auth | `RETURNS trigger`, `SECURITY DEFINER`, `set search_path = public`; no aparece como RPC de Agro. No tocar sin validar impacto de triggers. |
| `public.agro_canonicalize_buyer_name(text)` | Helper SQL immutable | No accede datos; usado en migraciones y equivalencias de compradores. Si se endurece, hacerlo como P3 separado tras verificar que no rompa inserts/updates que dependan del helper. |
| `public.agro_task_cycles_set_updated_at()`, `public.update_updated_at()`, `public.set_user_onboarding_context_updated_at()`, `public.update_agro_crops_timestamp()` | Trigger helpers | No son RPC de producto. No mezclar con P2-B frontend RPC grants. |

### Riesgos

- No se consulto `pg_proc`, `information_schema.routine_privileges` ni grants efectivos contra DB viva; por tanto, el diagnostico es estatico por migraciones.
- Revocar grants sin reotorgar `authenticated` romperia Agro.
- Tocar helpers/trigger functions junto con RPC activas aumentaria el riesgo sin necesidad.

### Plan seguro por grupos

1. **P2-B1 / RPC activas de Agro con grants faltantes.**
   - Crear una migracion pequena solo para:
     - `public.agro_delete_buyer_cascade_v1(uuid)`.
     - `public.agro_buyer_portfolio_summary_v1()`.
     - `public.agro_rank_top_clients(date,date,integer,uuid)`.
     - `public.agro_rank_pending_clients(date,date,integer,uuid)`.
   - Patron: `REVOKE ALL ON FUNCTION ... FROM PUBLIC;` y `GRANT EXECUTE ON FUNCTION ... TO authenticated;`.
   - No tocar `agro_rank_top_crops_profit`, porque ya tiene contrato explicito.

2. **P2-B2 / Validacion real previa o posterior si el usuario autoriza DB viva.**
   - Consultar `pg_proc`, `pg_namespace`, `pg_get_function_arguments`, `pg_get_userbyid(proowner)` y privileges efectivos.
   - Ejecutar smoke/manual en staging para:
     - rankings dashboard (`agro_rank_*`);
     - Cartera Viva (`agro_buyer_portfolio_summary_v1`);
     - borrado cascade de comprador con usuario autenticado QA.

3. **P3 / Helpers y trigger functions.**
   - Revisar `handle_new_user`, trigger helpers y `agro_canonicalize_buyer_name` en frente separado.
   - No aplicar revokes a helpers hasta confirmar que no afectan triggers, generated/default expressions o writes indirectos.

### Primer fix recomendado posterior

Migracion minima:

```sql
begin;

revoke all on function public.agro_delete_buyer_cascade_v1(uuid) from public;
grant execute on function public.agro_delete_buyer_cascade_v1(uuid) to authenticated;

revoke all on function public.agro_buyer_portfolio_summary_v1() from public;
grant execute on function public.agro_buyer_portfolio_summary_v1() to authenticated;

revoke all on function public.agro_rank_top_clients(date, date, integer, uuid) from public;
grant execute on function public.agro_rank_top_clients(date, date, integer, uuid) to authenticated;

revoke all on function public.agro_rank_pending_clients(date, date, integer, uuid) from public;
grant execute on function public.agro_rank_pending_clients(date, date, integer, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
```

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).
- Nota: el build conserva el warning local de Node `v25.6.0` vs engine declarado `20.x`; no bloquea el build.

### NO se hizo

- No se crearon migraciones.
- No se tocaron RPC/grants, policies, Storage, `profiles`, Supabase config ni Edge Functions.
- No se toco Agro ni `agro.js`.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.
- No se uso `git add`.

---

## 2026-04-27 — Plan de ejecucion P2-B1 RPC grants

**Objetivo:** aplicar el primer fix P2-B1 recomendado: endurecer execution grants de 4 RPC activas en `public` con `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE TO authenticated`.

### Diagnostico

- `git status --short`: sin salida antes de editar.
- `agro_rank_top_clients`:
  - Definicion vigente: `supabase/migrations/20260221231536_agro_rpc_date_filters_inclusive.sql`.
  - Firma exacta: `public.agro_rank_top_clients(date, date, integer, uuid)`.
  - No se encontro `REVOKE/GRANT` explicito para esta funcion en migraciones.
- `agro_rank_pending_clients`:
  - Definicion vigente: `supabase/migrations/20260221231536_agro_rpc_date_filters_inclusive.sql`.
  - Firma exacta: `public.agro_rank_pending_clients(date, date, integer, uuid)`.
  - No se encontro `REVOKE/GRANT` explicito para esta funcion en migraciones.
- `agro_buyer_portfolio_summary_v1`:
  - Contrato final: `supabase/migrations/20260418120000_agro_buyer_portfolio_contract_restore.sql`.
  - Firma exacta: `public.agro_buyer_portfolio_summary_v1()`.
  - No se encontro `REVOKE/GRANT` explicito para esta funcion en migraciones.
- `agro_delete_buyer_cascade_v1`:
  - Definicion: `supabase/migrations/20260403143000_agro_delete_buyer_cascade_v1.sql`.
  - Firma exacta: `public.agro_delete_buyer_cascade_v1(uuid)`.
  - Es `security invoker`, valida `auth.uid()` y ownership del comprador, pero no tiene `REVOKE/GRANT` explicito.
- Referencia endurecida:
  - `supabase/migrations/20260221231650_agro_rank_top_crops_profit_order_repair.sql` usa `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated`.
  - No se tocara `agro_rank_top_crops_profit`, porque ya esta endurecida.

### Plan

- Crear `supabase/migrations/20260427124500_p2b_rpc_grants_hardening.sql`.
- Aplicar solo `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE TO authenticated` sobre las 4 firmas confirmadas.
- No agregar grants a `service_role`, porque el objetivo de esta sesion autoriza explicitamente `authenticated` y las llamadas activas revisadas son de cliente autenticado.
- No tocar helpers/triggers (`handle_new_user`, `update_updated_at`, `agro_canonicalize_buyer_name`, `log_event`) ni RPC ya endurecidas.
- Ejecutar `git diff --check` y `pnpm build:gold`.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `supabase/migrations/20260427124500_p2b_rpc_grants_hardening.sql` | Migracion RPC grants | Aplica `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE TO authenticated` sobre las 4 RPC activas confirmadas. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs | Diagnostico, plan, cambios y cierre P2-B1. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).
- Nota: el build conserva el warning local de Node `v25.6.0` vs engine declarado `20.x`; no bloquea el build.

### NO se hizo

- No se tocaron helpers/triggers (`handle_new_user`, `update_updated_at`, `agro_canonicalize_buyer_name`, `log_event`).
- No se toco `agro_rank_top_crops_profit`.
- No se tocaron codigo Agro, `agro.js`, policies RLS, Storage, `profiles`, Supabase config, Edge Functions, Vercel, workflows ni credenciales.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.
- No se uso `git add`.

---

## 2026-04-27 — Cierre tecnico P2-A/P2-B1 Supabase

**Estado:** YELLOW CONTROLADO — fixes aplicados, QA funcional pendiente por usuario

**Objetivo:** Dejar documentado el cierre tecnico de los bloques P2-A y P2-B1 antes de QA manual.

### Diagnostico

Se aplicaron dos bloques de endurecimiento Supabase de bajo alcance:

- P2-A modernizo policies owner-based antiguas para `agro_period_cycles`, `agro_crops` y `agro_roi_calculations`, usando `to authenticated` y `((select auth.uid()) = user_id)`.
- P2-B1 endurecio grants de cuatro RPC activas en `public`, quitando ejecucion publica y permitiendo ejecucion solo a usuarios autenticados.

No se detecto P1 nuevo durante los diagnosticos previos. El estado sigue siendo YELLOW controlado hasta completar QA funcional.

### Plan

- No aplicar mas migraciones hasta validar P2-A/P2-B1.
- El usuario realizara QA manual con sesion autenticada.
- Si QA pasa, actualizar estado a GREEN.
- Si QA falla, documentar flujo roto y corregir con diff quirurgico.
- Proximo frente tras QA: P2-C Storage (`agro-evidence` MIME/file size + decision `avatars`).

### Cambios tecnicos ya aplicados

| Bloque | Archivo | Cambio |
|---|---|---|
| P2-A | `supabase/migrations/20260427123000_p2a_owner_policies_authenticated.sql` | Recreate policies owner-based con `to authenticated` + `(select auth.uid())`. |
| P2-B1 | `supabase/migrations/20260427124500_p2b_rpc_grants_hardening.sql` | `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated` para 4 RPC activas. |

### QA manual pendiente por usuario

- [ ] Confirmar que `/agro/` abre en Dashboard Agro.
- [ ] Confirmar que ciclos de cultivo cargan.
- [ ] Confirmar que ciclos de periodo cargan si existen.
- [ ] Confirmar que ROI/calculos no se rompen.
- [ ] Confirmar que rankings de clientes cargan.
- [ ] Confirmar que rankings de pendientes cargan.
- [ ] Confirmar que resumen de cartera/comprador carga.
- [ ] Probar `delete buyer cascade` solo con cliente QA temporal.
- [ ] Confirmar que usuario anonimo no accede a datos privados.
- [ ] Confirmar que Operacion Comercial / Cartera Viva no se rompen.

### Validacion tecnica previa

- `git diff --check`: PASS en las sesiones de implementacion.
- `pnpm build:gold`: PASS en las sesiones de implementacion.
- Nota local conocida: entorno con Node `v25.6.0`; repo/CI fijan Node `20.x`.

### NO se hizo

- No se aplico QA funcional en esta sesion.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.
- No se tocaron nuevas migraciones.
- No se toco codigo Agro.
- No se toco `agro.js`.
- No se tocaron RPC fuera de P2-B1.
- No se toco Storage.
- No se toco `profiles`.
- No se tocaron credenciales.

---

## 2026-04-27 — Diagnostico integral P2-C/P3: Storage, headers, dialogos nativos y XSS

**Estado:** YELLOW CONTROLADO — diagnostico integral, sin cambios tecnicos

**Objetivo:** Auditar cuatro frentes pendientes sin aplicar fixes masivos: Storage, CSP/headers, dialogos nativos y XSS/innerHTML.

### Diagnostico

No aparece P1 nuevo confirmado por auditoria estatica. El proyecto mantiene build verde y el frente Supabase/RLS previo queda en espera de QA funcional del usuario. Los cuatro frentes revisados quedan asi:

- Storage: `agro-evidence` ya es privado y owner-scoped, pero falta contrato explicito de MIME/file size por bucket y `avatars` sigue sin decision canonica documentada.
- CSP/headers: `vercel.json` ya tiene headers base (`nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy`), pero no define CSP ni HSTS. La CSP estricta no puede aplicarse de golpe por inline scripts/handlers activos.
- Dialogos nativos: quedan usos de `alert`, `confirm` y `prompt`, sobre todo en `agro.js`. Hay modal canonico para prompt, pero todavia existen fallbacks y confirmaciones nativas en flujos sensibles.
- XSS/innerHTML: hay volumen alto de sinks HTML. Muchos son templates internos escapados o iconos estaticos, pero hay riesgos reales puntuales con datos de usuario/Supabase y Markdown.

### Plan

- No aplicar fixes masivos.
- Separar por frentes.
- Priorizar cambios de bajo riesgo.
- Mantener build verde.
- Ejecutar cada fix futuro en commit separado.
- No endurecer Storage/CSP sin considerar scripts de smoke, inline handlers y dominios reales usados por Agro.

---

### Frente 3 — P2-C Storage

| Severidad | Elemento | Archivo/evidencia | Hallazgo | Recomendacion |
|---|---|---|---|---|
| P2 | `agro-evidence` | `supabase/migrations/20260420120000_security_trust_hardening_v1.sql:19-22` | Bucket privado por migracion. | Mantener private; no revertir a publico. |
| P2 | Policies owner-scoped | `supabase/migrations/20260420120000_security_trust_hardening_v1.sql:40-128` | Select/insert/update/delete usan `to authenticated` y folder de `auth.uid()`. | Estado base correcto; cualquier fix debe preservar owner folders. |
| P2 | MIME/file size por bucket | `supabase/config.toml:106`, `supabase/migrations/20260420120000_security_trust_hardening_v1.sql` | Solo se ve limite global `50MiB`; no hay `allowed_mime_types` ni `file_size_limit` especifico para `agro-evidence`. | Agregar migracion futura que actualice `storage.buckets` para `agro-evidence`. |
| P2 | Smoke test | `tools/rls-smoke-test.js:215-219` | El smoke sube `text/plain` a `agro-evidence`; si se restringe MIME a imagen/pdf sin ajustar el smoke, el workflow fallara. | En el fix futuro, decidir si se permite `text/plain` para smoke o se cambia el smoke a un MIME permitido. |
| P2 | Signed URLs evidencia | `apps/gold/agro/agro.js:960-981` | `resolveEvidenceUrl()` llama `getSignedEvidenceUrl(...)`; no se encontro definicion por busqueda estatica. Puede afectar lectura de evidencias privadas si el flujo se ejecuta. | Validar manualmente evidencia real antes de tocar limites; si falla, abrir fix separado de helper signed URL. |
| P3 | `avatars` | `apps/gold/assets/js/profile/profileManager.js:291-306` | Sube a bucket `avatars` y usa `getPublicUrl`; auditorias previas lo dejan pendiente de decision UX. | No cambiar a privado hasta decidir contrato producto: avatar publico por diseno vs signed URLs. |
| P3 | Avatar MIME/tamano cliente | `apps/gold/assets/js/profile/profileManager.js:271-280` | El cliente limita JPG/PNG/GIF/WebP y 2MB; no hay evidencia estatica de bucket/policy remoto. | Documentar contrato `avatars` antes de migrar. |

**Primer fix recomendado Storage:**
Crear una migracion P2-C pequena para `agro-evidence` que conserve `public=false`, agregue limite especifico y MIME permitidos. Propuesta inicial a validar: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`; revisar `tools/rls-smoke-test.js` antes de aplicar porque hoy usa `text/plain`.

**SQL conceptual futuro, NO aplicado:**

```sql
begin;

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
where id = 'agro-evidence';

commit;
```

**Prompt futuro Storage:**

```md
Crear migracion P2-C solo para `agro-evidence`: mantener `public=false`, fijar `file_size_limit` y `allowed_mime_types`, revisar impacto sobre `tools/rls-smoke-test.js`, ejecutar `pnpm build:gold`, sin tocar Agro ni Storage fuera de este bucket.
```

---

### Frente 4 — CSP / headers

| Severidad | Header/Fuente | Archivo/evidencia | Hallazgo | Recomendacion |
|---|---|---|---|---|
| P2 | CSP | `vercel.json:45-120` | No existe `Content-Security-Policy`. | Aplicar primero en modo conservador/report-only o con allowlist amplia; no intentar CSP estricta inicial. |
| P3 | HSTS | `vercel.json:45-120` | No existe `Strict-Transport-Security`. | Aplicar solo tras confirmar HTTPS estable en `yavlgold.com` y `yavlgold.gold`; empezar sin `preload`. |
| OK | `X-Content-Type-Options` | `vercel.json:50,61,72,83,94,105` | `nosniff` ya existe en rutas principales y health. | Mantener. |
| OK | Clickjacking base | `vercel.json:51,62,73,84,95` | `X-Frame-Options: DENY` ya existe. | CSP futura debe agregar `frame-ancestors 'none'` como defensa moderna. |
| OK | Referrer | `vercel.json:53,64,75,86,97` | `strict-origin-when-cross-origin` ya existe. | Mantener. |
| OK/P3 | Permissions | `vercel.json:54,65,76,87,98` | Global bloquea geoloc; Agro permite `geolocation=(self)`. | Mantener separacion Agro/no-Agro. |
| P3 | `X-XSS-Protection` | `vercel.json:52,63,74,85,96` | Header legacy/deprecated. | No priorizar; CSP y sinks DOM importan mas. |
| P2 | Fuentes/script CDN | `apps/gold/agro/index.html:19-27`, `apps/gold/index.html:33-41,886,894` | Google Fonts, Font Awesome/CDNJS, jsDelivr, hCaptcha y Chart.js requieren allowlist. | CSP debe incluirlos o mover a self-hosting en otro frente. |
| P2 | APIs externas | `apps/gold/agro/agro-clima.js:9-10`, `apps/gold/agro/agro-market.js:18`, `apps/gold/agro/agro-interactions.js:678` | Open-Meteo, Binance Vision, ER API e IP API se usan en `connect-src`. | Inventario debe entrar en CSP conservadora. |
| P2 | Inline scripts/handlers | `apps/gold/agro/index.html`, `apps/gold/index.html`, `apps/gold/assets/js/components/*` | Hay inline scripts y `onclick`, lo que rompe una CSP sin `'unsafe-inline'`. | Primer CSP no debe ser estricta; planear migracion gradual de inline handlers. |

**Inventario de fuentes reales detectadas:**

- `self`
- `https://fonts.googleapis.com`
- `https://fonts.gstatic.com`
- `https://cdnjs.cloudflare.com`
- `https://cdn.jsdelivr.net`
- `https://js.hcaptcha.com`
- `https://hcaptcha.com` / `https://*.hcaptcha.com`
- `https://*.supabase.co`
- `https://api.open-meteo.com`
- `https://geocoding-api.open-meteo.com`
- `https://ipapi.co`
- `https://data-api.binance.vision`
- `https://open.er-api.com`

**CSP conservadora propuesta:**

```txt
default-src 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'none';
img-src 'self' data: blob: https://*.supabase.co https://www.yavlgold.com;
font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.hcaptcha.com;
connect-src 'self' https://*.supabase.co https://api.open-meteo.com https://geocoding-api.open-meteo.com https://ipapi.co https://data-api.binance.vision https://open.er-api.com https://hcaptcha.com https://*.hcaptcha.com;
frame-src https://hcaptcha.com https://*.hcaptcha.com;
worker-src 'self' blob:;
manifest-src 'self';
form-action 'self';
upgrade-insecure-requests;
```

**Primer fix recomendado Headers:**
Agregar CSP conservadora en commit separado, preferiblemente como `Content-Security-Policy-Report-Only` si se quiere medir primero. Si se aplica en enforcement, aceptar temporalmente `'unsafe-inline'` por deuda existente y abrir luego un frente para eliminar inline handlers/scripts.

**Prompt futuro Headers:**

```md
Actualizar solo `vercel.json` con CSP conservadora compatible con Vite/Vanilla/Supabase/hCaptcha/fonts/APIs reales. No tocar Agro. No activar CSP estricta sin `'unsafe-inline'` todavia. Ejecutar `pnpm build:gold` y documentar dominios permitidos.
```

---

### Frente 5 — Dialogos nativos

| Severidad | Tipo | Archivo | Flujo | Hallazgo | Recomendacion |
|---|---|---|---|---|---|
| P2 | `confirm` | `apps/gold/agro/agro.js:5778` | Eliminar registro facturero | Confirm nativo en operacion frecuente y sensible. | Primer candidato a modal canonico de confirmacion. |
| P2 | `confirm` | `apps/gold/agro/agro.js:6375` | Devolucion parcial append-only | Confirm nativo en flujo complejo con impacto financiero. | Migrar tras el primer confirm simple. |
| P2 | `confirm` | `apps/gold/agro/agro.js:16344` | Eliminar cultivo | Dialogo nativo en flujo sensible; copy dice que no se puede deshacer. | Migrar a modal canonico con copy claro y consecuencias. |
| P2 | `confirm` | `apps/gold/agro/agroOperationalCycles.js:1338-1340` | Eliminar cartera operativa/ciclo | Puede borrar historial asociado. | Migrar a confirm modal compartido. |
| P2 | `confirm` | `apps/gold/agro/agro-cart.js:230,335` | Eliminar carrito/item | Flujo operativo frecuente. | Migrar despues de facturero/cultivo. |
| P2/P3 | `prompt` fallback | `apps/gold/agro/agro.js:6504-6537` | Duplicar registro | Ya usa `showPromptModal` cuando existe, pero conserva fallback nativo. | Confirmar carga del modulo y luego retirar fallback o dejarlo solo como degradacion documentada. |
| P3 | `prompt` fallback | `apps/gold/agro/agro-cartera-viva-view.js:1416-1420` | Nueva cartera operativa | Ya intenta modal canonico antes de fallback. | Puede esperar. |
| P3 | `alert` | `apps/gold/agro/index.html:1981-2310` | Guardado/validacion cultivo | Feedback nativo de UX, no seguridad directa. | Reemplazar por `YGUXMessages` progresivamente. |
| P3 | `alert` | `apps/gold/agro/agro-cart.js`, `apps/gold/agro/agro-agenda.js` | Errores y validaciones | Bloquea mobile y rompe canon modal/toast. | Migrar por modulo cuando se toque. |

**Conteo rapido:** `agro.js` concentra 47 apariciones; luego `agro-cart.js` 12, `agro-agenda.js` 6 e `index.html` 6.

**Primer dialogo recomendado para migrar:**
`deleteFactureroItem()` en `apps/gold/agro/agro.js:5774-5784`, porque toca borrado frecuente de movimientos financieros y hoy depende de `confirm` + `alert`.

**Prompt futuro Dialogos:**

```md
Migrar solo `deleteFactureroItem()` de `confirm/alert` nativos a modal canonico/UX messages. Tocar solo el minimo necesario, no redisenar Agro, no tocar Supabase, no crecer `agro.js` mas que wiring quirurgico, ejecutar `pnpm build:gold`.
```

---

### Frente 6 — XSS / innerHTML

| Severidad | Patron | Archivo | Fuente de datos | Hallazgo | Recomendacion |
|---|---|---|---|---|---|
| P2 | `innerHTML` con datos de usuario | `apps/gold/agro/agro.js:15452-15456` | Perfil/cultivos/clima/location desde estado/Supabase | `appendContextItem()` interpola `value` sin escape. | Primer fix XSS: construir nodos con `textContent`. |
| P2 | Markdown a HTML | `apps/gold/agro/agro-repo-app.js:203-209,249-356,569` | Contenido editable AgroRepo | Escapa texto base, pero convierte links/img a `href/src` sin allowlist de protocolo; `javascript:` en links queda posible al click. | Validar URLs y/o construir DOM; no instalar DOMPurify aun. |
| P2 | `innerHTML` con dato Supabase | `apps/gold/assets/js/admin/adminManager.js:334-340` | `ann.title` desde tabla `announcements` | Titulo se interpola sin `_escapeHtml`; superficie admin, pero dato de DB. | Escapar `ann.title` y `ann.type`/atributos o construir DOM. |
| P2 | `innerHTML` con error externo | `apps/gold/agro/agro-clima.js:300-302` | `err.message` desde fetch/geocoding | Mensaje de error se interpola como HTML. | Usar `textContent` para el mensaje. |
| P2/P3 | `innerHTML` + inline handlers | `apps/gold/agro/index.html`, `apps/gold/agro/agro-interactions.js:118,619` | Templates internos | No es XSS confirmado por si solo, pero bloquea CSP estricta. | Migrar gradualmente a listeners. |
| P3 | `insertAdjacentHTML` | `apps/gold/agro/agro-interactions.js:402-411` | Interno/calculado | Badge estatico con edad calculada; bajo riesgo. | Puede esperar. |
| P3 | Templates escapados | `apps/gold/agro/agro-cartera-viva-view.js:2440-2524` | Supabase owner rows | Usa `escapeHtml`/`escapeAttribute` en render principal. | Mantener bajo observacion, no priorizar. |
| P3 | Templates escapados | `apps/gold/agro/agroOperationalCycles.js` | Supabase owner rows | Alto volumen de `innerHTML`, pero evidencia de `escapeHtml` en campos dinamicos. | No migrar masivamente. |
| P3 | Iconos estaticos | multiples `innerHTML = '<i ...>'` | Interno | Falsos positivos comunes. | Dejar o migrar solo si se toca el componente. |

**Top riesgos reales:**

1. `appendContextItem()` en `apps/gold/agro/agro.js:15452-15456`: valor user/Supabase directo en HTML.
2. `renderInlineMarkdown()` en `apps/gold/agro/agro-repo-app.js:203-209`: links/img sin allowlist de protocolo.
3. `preview.innerHTML = renderMarkdown(...)` en `apps/gold/agro/agro-repo-app.js:569`: sink principal para contenido AgroRepo editable.
4. `adminManager.js:334-340`: `ann.title` sin escape en admin.
5. `agro-clima.js:302`: `err.message` interpolado en HTML.
6. Inline handlers en Agro/Assets: no son XSS confirmado, pero impiden CSP fuerte.
7. `agro-planning.js:272,275`: HTML rico interno; hoy bajo riesgo por fuentes estaticas.
8. `agro-interactions.js:455,630,712`: datos externos de mercado; revisar escape si se toca market hub.
9. `agro-cartera-viva-view.js` templates: bajo riesgo actual por escape consistente.
10. `agroOperationalCycles.js` templates: bajo riesgo actual por escape consistente, no migrar en bloque.

**Primer fix recomendado XSS:**
Reemplazar `appendContextItem()` por construccion DOM segura (`createElement`, `textContent`) en un commit pequeno. Es local, no cambia datos, y reduce riesgo real con minimo impacto.

**Prompt futuro XSS:**

```md
Tocar solo `apps/gold/agro/agro.js` para reemplazar `appendContextItem()` por DOM seguro con `textContent`. No cambiar flujo IA/contexto, no tocar Supabase ni otros sinks. Ejecutar `git diff --check` y `pnpm build:gold`.
```

---

### Orden recomendado de proximos commits

1. `fix(storage): enforce agro evidence upload limits` o equivalente.
2. `security(headers): add baseline conservative csp` o equivalente.
3. `refactor(agro): replace first native dialog with modal canon` o equivalente.
4. `security(agro): replace high-risk context innerHTML` o equivalente.

Nota: si QA manual detecta que evidencias privadas no abren por `getSignedEvidenceUrl()` no definido, adelantar un commit funcional pequeno antes del hardening MIME/file-size.

---

### No se hizo

- No se toco codigo.
- No se tocaron migraciones.
- No se toco Storage.
- No se toco `vercel.json`.
- No se tocaron dialogos.
- No se reemplazo `innerHTML`.
- No se instalaron dependencias.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.
- No se ejecuto Playwright ni QA browser.
- No se tocaron credenciales.

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

---

## 2026-04-27 — P2-C Storage agro-evidence limits

**Estado:** YELLOW CONTROLADO — fix P2-C aplicado, pendiente QA Supabase real

**Objetivo:** Endurecer el bucket `agro-evidence` con contrato explicito de MIME types y limite de tamano, preservando privacidad y policies owner-scoped.

### Diagnostico

- El bucket exacto es `agro-evidence`.
- `supabase/migrations/20260420120000_security_trust_hardening_v1.sql` crea/actualiza el bucket con `public = false`.
- Las policies `agro_evidence_select_own`, `agro_evidence_insert_own`, `agro_evidence_update_own` y `agro_evidence_delete_own` ya estan owner-scoped por carpeta de `auth.uid()`.
- No se encontro contrato explicito de `allowed_mime_types` ni `file_size_limit` por bucket; solo existe el limite global de Storage en `supabase/config.toml`.
- `tools/rls-smoke-test.js` sube actualmente un objeto `text/plain` con extension `.txt`, por lo que debe ajustarse si el bucket queda limitado a imagenes/PDF.
- `avatars` queda fuera de alcance y no debe tocarse en esta sesion.

### Plan

- Crear una migracion nueva que actualice solo `storage.buckets` para `id = 'agro-evidence'`.
- Definir MIME permitidos: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- Definir `file_size_limit = 10485760` bytes (10 MB).
- No modificar `public`, policies, RPC, grants, `profiles`, `avatars` ni codigo Agro.
- Cambiar el smoke test para subir un PNG minimo con `contentType: 'image/png'`.
- Validar con `git diff --check` y `pnpm build:gold`.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260427133000_p2c_agro_evidence_storage_limits.sql` | Agrega contrato explicito para `agro-evidence`: MIME permitidos y limite de 10 MB. |
| `tools/rls-smoke-test.js` | Cambia el upload de Storage del smoke de `text/plain`/`.txt` a PNG minimo `image/png`/`.png`. |

### Contrato aplicado

- MIME permitidos: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- Limite por archivo: `10485760` bytes (10 MB).
- Bucket: `agro-evidence`.
- Privacidad: se conserva el estado privado existente; esta migracion no cambia `public`.
- Policies: no se tocaron; se preservan las owner-scoped policies existentes.

### Validacion

- `node --check tools/rls-smoke-test.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.
- `supabase db reset`: NO ejecutado; no hubo autorizacion explicita para reset ni conexion a DB viva.

### NO se hizo

- No se toco Agro.
- No se toco `apps/gold/agro/agro.js`.
- No se tocaron policies RLS.
- No se tocaron RPC/grants.
- No se toco `profiles`.
- No se toco `avatars`.
- No se toco Supabase config.
- No se tocaron Edge Functions, Vercel ni workflows.
- No se tocaron credenciales.

---

## 2026-04-27 — P2 Headers baseline y CSP Report-Only

**Estado:** YELLOW CONTROLADO — baseline conservador aplicado, sin CSP bloqueante

**Objetivo:** Agregar una primera capa de headers de seguridad en `vercel.json` sin romper runtime ni rutas.

### Diagnostico

- `vercel.json` ya tiene bloque `headers`.
- Las rutas principales ya declaran `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.
- No se encontro `Strict-Transport-Security`.
- No se encontro `Content-Security-Policy` ni `Content-Security-Policy-Report-Only`.
- Hay inline scripts, inline styles y handlers `onclick` activos en superficies publicas y Agro; una CSP bloqueante sin `'unsafe-inline'` romperia runtime.
- Fuentes externas reales detectadas: Google Fonts, Font Awesome/CDNJS, jsDelivr, hCaptcha, Supabase, Open-Meteo, Binance Vision, ER API, Frankfurter API e IP API.

### Plan

- No tocar rewrites, redirects ni routing.
- No tocar codigo Agro ni Supabase.
- Agregar `Strict-Transport-Security: max-age=31536000` sin `preload` ni `includeSubDomains`.
- Agregar `Content-Security-Policy-Report-Only`, no `Content-Security-Policy`, con allowlist conservadora para recursos actuales.
- Mantener `'unsafe-inline'` temporalmente por deuda inline existente y documentar que el cierre estricto queda para un frente posterior.
- Completar `Permissions-Policy` existente con `payment=()` y `usb=()` sin duplicar headers.
- Validar JSON, `git diff --check` y `pnpm build:gold`.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `vercel.json` | Agrega bloque global `/(.*)` con `Strict-Transport-Security` y `Content-Security-Policy-Report-Only`. |
| `vercel.json` | Completa `Permissions-Policy` existente con `payment=()` y `usb=()`, manteniendo `geolocation=(self)` solo en Agro. |

### Headers agregados o completados

- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy-Report-Only: default-src 'self'; ...`
- `Permissions-Policy`: se agregan `payment=()` y `usb=()` a las reglas existentes.

### CSP Report-Only

La CSP queda como `Content-Security-Policy-Report-Only`, no bloqueante, porque el frontend mantiene inline scripts, inline styles y handlers activos. Se conserva `'unsafe-inline'` temporalmente para observar reportes sin romper landing, dashboard ni Agro.

Dominios permitidos en esta primera observacion: `self`, Google Fonts, CDNJS, jsDelivr, hCaptcha, Supabase, Open-Meteo, Binance Vision, ER API, Frankfurter API e IP API.

### Validacion

- `vercel.json` JSON parse + duplicados por bloque: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

### NO se hizo

- No se aplico `Content-Security-Policy` bloqueante.
- No se uso `preload` ni `includeSubDomains` en HSTS.
- No se tocaron redirects, rewrites ni routing.
- No se toco codigo Agro.
- No se toco Supabase.
- No se tocaron migraciones, Storage, RPC/grants, Vercel workflows ni credenciales.

---

## 2026-04-27 — Dialogo canonico para deleteFactureroItem

**Estado:** YELLOW CONTROLADO — confirm nativo reemplazado, QA manual pendiente

**Objetivo:** Reemplazar el `confirm()` nativo de `deleteFactureroItem()` por un modal canonico V10.1, sin cambiar la logica de borrado.

### Diagnostico

- `deleteFactureroItem(tabName, itemId)` vive en `apps/gold/agro/agro.js`.
- El `confirm()` objetivo esta al inicio del flujo, antes de consultar usuario y ejecutar soft-delete/hard-delete.
- Existen modales de confirmacion en otros modulos, pero estan acoplados a dominios concretos como comprador/tareas y no son un helper generico compartido.
- El modulo `agro-prompt-modal.js` reemplaza `prompt()`, pero no cubre confirmaciones booleanas.
- `agro.css` ya contiene estilos de modales; se agregara solo un bloque generico pequeno para este confirm canonico.
- No se migraran otros `alert`, `confirm` ni `prompt` en esta sesion.

### Plan

- Crear `showAgroConfirmDialog(options)` como helper local minimo en `agro.js`.
- Construir el modal con DOM APIs, no con HTML string.
- Cumplir §19: `role="dialog"`, `aria-modal`, `aria-labelledby`, cierre con Escape, click en overlay, boton cerrar, focus inicial y retorno de foco.
- Reemplazar solo `if (!confirm('¿Eliminar este registro?')) return;`.
- Mantener intactas las ramas de soft-delete, hard-delete, undo toast, refresh y errores.
- Validar con `git diff --check` y `pnpm build:gold`.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro.js` | Agrega helper local `showAgroConfirmDialog(options)` y reemplaza el `confirm()` nativo de `deleteFactureroItem()`. |
| `apps/gold/agro/agro.css` | Agrega estilos del modal canonico sobrio para `.agro-confirm-dialog`. |

### Modal/helper

- `showAgroConfirmDialog(options)` devuelve `Promise<boolean>`.
- Construye el modal con DOM APIs y `textContent`.
- Incluye `role="dialog"`, `aria-modal`, `aria-labelledby` y `aria-describedby`.
- Cierra con Escape, click en overlay/backdrop, boton X y boton cancelar.
- Enfoca `Cancelar` al abrir y devuelve foco al trigger si sigue en el DOM.

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

### NO se hizo

- No se migraron otros dialogos nativos.
- No se reemplazaron los `alert()` existentes de error/sesion en `deleteFactureroItem()`.
- No se cambio la logica de soft-delete, hard-delete, undo, restore, refresh ni payloads.
- No se toco Supabase, migraciones, Storage, RPC/grants, Vercel, workflows ni credenciales.

---

## 2026-04-27 — XSS appendContextItem con DOM seguro

**Estado:** YELLOW CONTROLADO — fix aplicado, QA manual pendiente

**Objetivo:** Reemplazar el render inseguro de `appendContextItem()` para que valores dinamicos de contexto no pasen por `innerHTML`.

### Diagnostico

- `appendContextItem(container, key, value)` vive en `apps/gold/agro/agro.js`.
- La funcion actual crea `.ast-ctx-item` y usa `item.innerHTML = \`<strong>${key}:</strong> ${value}\`;`.
- Sus llamadas reciben valores de perfil, finca, ubicacion, cultivo activo, clima y estadisticas de contexto.
- `profile.*`, `cropCtx.*`, `weather.*` y `loc.*` pueden provenir de usuario, Supabase o APIs/contexto externo.
- El riesgo concreto es DOM XSS por interpretar `key` o `value` como HTML.
- No se requiere cambio visual ni cambio de datos; basta construir `strong` y texto con DOM APIs.

### Plan

- Tocar solo `appendContextItem()` en `apps/gold/agro/agro.js`.
- Reemplazar `innerHTML` por `document.createElement('strong')`, `textContent` y nodos de texto.
- Preservar clase `.ast-ctx-item`, orden visual y formato `Etiqueta: valor`.
- No tocar otros `innerHTML`, renderizadores, Supabase, Vercel ni migraciones.
- Validar con `git diff --check` y `pnpm build:gold`.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro.js` | `appendContextItem()` deja de usar `innerHTML` y construye `strong` + texto con DOM APIs. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

### NO se hizo

- No se reemplazaron otros `innerHTML`.
- No se tocaron otros renderizadores.
- No se cambio la logica de perfil, cultivo, clima, ubicacion ni contexto.
- No se instalo DOMPurify ni ninguna dependencia.
- No se toco Supabase, migraciones, Storage, RPC/grants, Vercel, workflows ni credenciales.

---

## 2026-04-27 — QA seguridad P2 parcial

**Estado:** YELLOW CONTROLADO hasta validar con una segunda cuenta real.

**Objetivo:** Validar mediante QA empírico los cambios de seguridad implementados en la sesión (P2-A, P2-B1, P2-C, CSP headers, modal de delete y protección XSS en `appendContextItem()`).

### Resultado
- **XSS appendContextItem:** GREEN. El payload fue tratado como texto plano, sin ejecución.
- **Anon:** GREEN. Redirección forzosa al login verificada.
- **Usuario A:** GREEN. Ciclos/ROI visibles y sin romper.
- **Cleanup QA:** GREEN. Cultivo QA destruido de la base de datos.
- **P2-A RLS cross-user Usuario B:** PENDIENTE. Bloqueo por hCaptcha impidió crear cuenta secundaria. No se debe declarar GREEN global basándose solo en inferencia de policy SQL.

**Pendiente:** Validar aislamiento empírico con Usuario B. Continuar diálogos nativos restantes e innerHTML por prioridad.

---

## 2026-04-27 — QA RLS cross-user completado

**Estado:** GREEN

**Objetivo:** Completar la validación pendiente de aislamiento RLS entre usuarios reales.

### Diagnostico

El QA anterior había validado Usuario A, acceso anónimo, limpieza QA y XSS, pero faltaba la prueba empírica con Usuario B. Se realizó una validación manual usando dos navegadores separados para evitar compartir sesión, localStorage o cookies.

### Plan

- Usar Chrome con la cuenta oficial.
- Usar Edge con la cuenta Capitán QA.
- Confirmar que cada cuenta solo ve sus propios datos.
- Confirmar que ninguna cuenta ve datos ajenos.

### Resultado

- Chrome con cuenta oficial no pudo ver datos creados o pertenecientes a Capitán QA.
- Edge con cuenta Capitán QA no pudo ver datos creados o pertenecientes a la cuenta oficial.
- El aislamiento cross-user quedó validado empíricamente en ambas direcciones.
- El acceso anónimo ya estaba validado como bloqueado/redirigido a login.
- XSS en `appendContextItem()` ya estaba validado como seguro: el payload se renderiza como texto y no ejecuta script.

### Estado final

- P2-A RLS owner policies: GREEN.
- P2-B1 RPC grants: GREEN por QA funcional previo.
- P2-C Storage: GREEN por validación previa.
- CSP/headers baseline: GREEN por deploy/build y revisión funcional.
- Modal deleteFactureroItem: GREEN por QA previo.
- XSS appendContextItem: GREEN.

### Pendiente

- Continuar con diálogos nativos restantes por prioridad.
- Continuar con auditoría `innerHTML` por riesgo.
- Mantener CSP en Report-Only hasta acumular evidencia suficiente antes de endurecerla.

### NO se hizo

- No se tocaron migraciones.
- No se tocó código.
- No se tocó Supabase config.
- No se ejecutó `supabase db reset`.
- No se usaron credenciales en documentos versionados.

---

## 2026-04-27 — Diagnóstico V3 deuda operativa Agro

**Estado:** YELLOW CONTROLADO — diagnóstico, sin cambios técnicos

### Diagnostico

Se auditó deuda operativa en `apps/gold/agro/` y `apps/gold/assets/` bajo el Plan Maestro V3, sin aplicar fixes. El reporte activo tiene 864 líneas antes de esta sección, por debajo del umbral canónico de rotación de 4000 líneas.

Resumen cuantitativo:

- Temporizadores detectados: 143 líneas con `setInterval`, `setTimeout`, `clearInterval` o `clearTimeout`.
- Listeners detectados: 424 líneas con `addEventListener` o `removeEventListener`.
- Referencias `window.*`: 488 líneas, con 45 asignaciones directas en `agro.js`.
- Diálogos nativos residuales: 91 líneas con `alert`, `confirm`, `prompt` o variantes `window.*`.
- Tamaño actual de `apps/gold/agro/agro.js`: 14821 líneas. Sigue siendo el centro de la deuda, aunque shell, favoritos y búsqueda ya están mayormente estabilizados.

La deuda no apunta a un único bug crítico, sino a contratos operativos incompletos: modales no unificados, listeners globales sin ciclo de vida explícito, temporizadores con teardown parcial, puentes `window.*` heredados y bloques autocontenidos que siguen dentro de `agro.js`.

### Hallazgos

#### Temporizadores

| Severidad | Archivo | Línea | Hallazgo | Recomendación |
|---|---:|---:|---|---|
| ALTA | `apps/gold/assets/js/components/notifications.js` | 24 | `setInterval(() => this.checkUnread(), 120000)` no guarda id ni tiene `clearInterval`. | Guardar `_unreadTimer`, evitar doble init y limpiar en `destroy()`/`pagehide`. |
| MEDIA | `apps/gold/agro/agro-market.js` | 622, 630, 636 | Ticker tiene singleton y `stopTickerAutoRefresh()`, pero no está atado a ciclo de vida de página/shell. | Conectar stop a `pagehide` o teardown explícito; mantener un solo dueño del polling. |
| MEDIA | `apps/gold/agro/dashboard.js` | 890, 896 | Weather refresh tiene `stopDashboardWidgets()` expuesto en `window`, pero no se observa binding automático de cleanup. | Registrar cleanup en `pagehide` o al desactivar vista dashboard. |
| MEDIA | `apps/gold/agro/agro.js` | 14704, 14721 | Timers del asistente tienen `stopAssistantTimers()` y cierre local, pero no cleanup final de documento. | Añadir cleanup de seguridad en `pagehide`/`beforeunload` cuando se toque asistente. |
| BAJA | `apps/gold/agro/agro-cartera-viva-view.js` | 2911 | Debounce `externalRefreshTimer` se limpia al reprogramar, pero no tiene disposer de módulo. | Mantener como aceptable por ahora; agregar disposer cuando exista lifecycle modular. |

#### Listeners

| Severidad | Archivo | Línea | Hallazgo | Recomendación |
|---|---:|---:|---|---|
| ALTA | `apps/gold/agro/agro-selection.js` | 34, 59, 71, 85 | `initFactureroSelection()` agrega listeners globales sin guard idempotente ni remover. | Primer fix seguro: guard de inicialización + `AbortController`/disposer. |
| ALTA | `apps/gold/agro/agro-shell.js` | 535, 868, 874, 906, 915, 923 | `initAgroShell()` registra document/window listeners sin singleton explícito ni teardown. | Hacer init idempotente y retornar API estable con `destroy()` futuro. |
| MEDIA | `apps/gold/assets/js/auth/authUI.js` | 18, 112, 130, 133, 145, 150, 155, 676 | `AuthUI.init()` no muestra guard `_initialized`; si se invoca dos veces duplica listeners globales. | Agregar guard local antes de `attachEventListeners()`. |
| MEDIA | `apps/gold/agro/agro-cartera-viva-view.js` | 3036-3044 | Tiene `initialized` contra duplicación, pero no remueve listeners cuando el módulo deje de vivir. | Aceptable en MPA actual; agregar teardown si se modulariza lifecycle. |
| MEDIA | `apps/gold/agro/agro-repo-app.js` | 1555-1571 | Buenas banderas `documentBound`/`viewportBound`, sin `removeEventListener` futuro. | Usarlo como patrón intermedio y añadir `destroyAgroRepo()` si se vuelve desmontable. |
| BAJA | `apps/gold/agro/agro-cart.js` | 1398-1401 | Buen patrón: aborta listeners de render con `AbortController`. | Reutilizar este patrón en módulos pequeños antes de tocar `agro.js`. |

#### Window globals

| Severidad | Archivo | Símbolo | Hallazgo | Recomendación |
|---|---|---|---|---|
| ALTA | `apps/gold/agro/agro.js` | `window.populateCropDropdowns`, `window.refreshFactureroHistory`, `window.launchAgroWizard`, `window.switchTab` | Puentes necesarios hoy para HTML/módulos, pero mezclan API pública con deuda legacy. | Mantener mientras se extrae; documentar contrato y mover a objetos puente acotados. |
| ALTA | `apps/gold/agro/index.html` | `window.saveCrop` | Lógica operativa de cultivo vive en inline script HTML. | Mover a módulo de cultivo/modal antes de endurecer CSP. |
| MEDIA | `apps/gold/agro/agro.js` | `window.getTodayLocalISO`, `window.isValidISODate`, `window.assertDateNotFuture` | Helpers de fecha expuestos por dependencia inline. | Extraer `agro-date-utils.js` y consumir por import/puente mínimo. |
| MEDIA | `apps/gold/agro/agro-interactions.js` | `window.closeModal`, `window.selectDate`, `window.saveTask`, `window.deleteTask` | Globals legacy orientados a handlers inline/DOM. | Encapsular en namespace único o migrar listeners delegados. |
| MEDIA | `apps/gold/assets/js/main.js`, `apps/gold/assets/js/ui/uxMessages.js` | `window.showGoldToast` | Definición duplicada de toast global. | Centralizar en `YGUXMessages` y dejar alias único de compatibilidad. |
| BAJA | `apps/gold/agro/agro-market.js` | `window.__YG_MARKET_TICKER__` | Singleton global consciente para ticker. | Aceptable si queda con dueño único y cleanup explícito. |

#### Diálogos nativos

| Severidad | Archivo | Tipo | Flujo | Recomendación |
|---|---|---|---|---|
| ALTA | `apps/gold/agro/agro.js` | `confirm` | Guardrails USD, eliminar pagado, conversaciones IA, eliminar cultivo. | Migrar a modal base V10.1 por prioridad destructiva/financiera. |
| ALTA | `apps/gold/agro/agro-cart.js` | `alert`/`confirm` | Crear/eliminar carrito, eliminar item, validación de item, fallback `notifyCart`. | Primer frente real para `showAgroConfirm()` + `showAgroAlert()` fuera del monolito. |
| ALTA | `apps/gold/agro/agro-agenda.js` | `alert`/`confirm` | Eliminar actividad y validaciones del modal crear actividad. | Segundo frente de modales; reemplazar validación nativa por feedback inline/modal base. |
| MEDIA | `apps/gold/agro/agro-period-cycles.js` | `prompt`/`confirm` | Renombrar y eliminar ciclo de período. | Ya usa `showPromptModal` si existe; falta confirm base y retirar fallback nativo. |
| MEDIA | `apps/gold/agro/agro-cartera-viva-view.js` | `window.prompt` fallback | Nombre de cartera operativa. | Cuando `agro-prompt-modal.js` sea garantizado, eliminar fallback nativo. |
| MEDIA | `apps/gold/assets/js/auth/authUI.js`, `apps/gold/assets/js/admin/adminManager.js` | `confirm` | Logout y admin delete. | Tratar en frente site/global, no mezclar con modales Agro. |

### Candidatos a extracción de `agro.js`

| Prioridad | Bloque | Motivo | Riesgo | Primer paso |
|---|---|---|---|---|
| P0 | Date helpers, líneas 400-462 | Bajo acoplamiento y globales claros. | Bajo | Crear `agro-date-utils.js` y dejar alias `window.*` temporal. |
| P1 | ROI calculator, líneas 11659-11849 | Bloque UI/datos autocontenido, menor riesgo que facturero/ciclos. | Bajo-Medio | Extraer `calculateROI`, `initRoiCurrencySelector`, `injectRoiClearButton` con deps explícitas. |
| P1 | USD audit modal, líneas 3259-3580 | Modal y refresh debounce autocontenidos. | Medio | Mover a `agro-usd-audit.js`; exponer init/refresh con cleanup de timer. |
| P2 | Rankings operativos, líneas 12897-13758 | Bloque cohesivo de rankings, filtros y export. | Medio | Crear `agro-ops-rankings.js` y pasar deps (`supabase`, tab activo, privacy). |
| P2 | Asistente Agro, líneas 14075-15594 | Superficie completa con estado, timers, storage y UI. | Alto | Primero aislar listeners/timers; luego extraer a `agro-assistant.js`. |
| P3 | Ciclos/crop cards, líneas 8731-11656 | Bloque grande y semánticamente central. | Alto | No tocar como primera extracción; requiere contrato de datos/caché. |
| P3 | Facturero CRUD/historial, líneas 820-8724 | Núcleo crítico del sistema. | Muy alto | Solo cirugía puntual o wrappers; no extracción inicial. |

### Orden recomendado de ataques

1. Primer fix seguro: hacer idempotente `initFactureroSelection()` en `apps/gold/agro/agro-selection.js` y añadir cleanup técnico mínimo.
2. Segundo fix seguro: guardar y limpiar el intervalo de `NotificationsManager` en `apps/gold/assets/js/components/notifications.js`.
3. Primer frente de modales base: crear/usar un helper reusable de confirm/alert y aplicarlo en `apps/gold/agro/agro-cart.js`.
4. Segunda migración de modales: `apps/gold/agro/agro-agenda.js`, por confirm destructivo y validaciones nativas.
5. Primera extracción real: `agro-roi.js` desde el bloque ROI de `agro.js`; antes, una extracción P0 de date helpers puede servir como prueba de bajo riesgo.
6. Siguiente extracción de valor: `agro-ops-rankings.js`, solo después de estabilizar listeners y modales.

### No se hizo

- No se tocó código.
- No se aplicaron fixes.
- No se tocaron migraciones.
- No se tocó Supabase.
- No se tocó Vercel.
- No se tocaron workflows.
- No se tocaron credenciales.
- No se modificó `MANIFIESTO_AGRO.md`.
- No se modificó `ADN-VISUAL-V10.0.md`.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

---

## 2026-04-28 — MVP navegacion movil Hub/Modulo Agro

**Estado:** GREEN — implementado y validado con build

**Objetivo:** Implementar navegacion movil tipo hub/inmersiva con cuatro puertas: Inicio, Operacion, Memoria y Menu.

### Diagnostico

- `apps/gold/agro/index.html` ya tiene rail persistente, launcher expandido y regiones dedicadas con `data-agro-shell-region`.
- `apps/gold/agro/agro-shell.js` ya es el punto correcto para navegar: centraliza `data-agro-view`, `data-agro-action`, `syncRegions()`, `setActiveView()` y el evento `agro:shell:view-changed`.
- `apps/gold/agro/agro.css` actualmente convierte el rail a una navegacion lateral compacta tambien en mobile; no existe aun una barra inferior limitada al hub.
- La solucion segura es agregar una capa mobile nueva dentro del shell, sin tocar `agro.js`: estado `body[data-agro-shell-depth="hub|module"]`, hub mobile de agrupacion, tabbar inferior mobile y topbar contextual con Volver.
- El cambio no toca Supabase, datos, logica financiera, cultivos, cartera ni AgroRepo; solo orquestacion visual/navegacion del shell.
- `AGENT_REPORT_ACTIVE.md` tiene 942 lineas antes de esta seccion, por debajo del umbral canonico de rotacion de 4000.

### Plan

1. Agregar en `index.html` el hub mobile con paneles Inicio, Operacion, Memoria y Menu, mas topbar contextual y barra inferior mobile.
2. Mapear los accesos del hub a los `data-agro-view` / `data-agro-action` existentes para reutilizar el shell actual.
3. En `agro-shell.js`, mantener el tab activo de hub, manejar profundidad `hub/module`, boton Volver y titulo contextual del modulo.
4. En `agro.css`, ocultar el rail legacy en mobile, mostrar tabbar solo en `hub`, ocultarla en `module`, mostrar topbar solo en `module`, ajustar padding inferior y evitar solape con Feedback.
5. Validar con `git diff --check` y `pnpm build:gold`.

### DoD

- Mobile <=768px entra a `/agro/` en depth `hub` con barra inferior visible.
- Cambiar tabs muestra solo la agrupacion de ese hub.
- Entrar a AgroRepo cambia a depth `module`, oculta barra inferior y muestra Volver + titulo.
- Volver regresa a Memoria y reaparece la barra.
- Operacion y Menu funcionan como hubs.
- Desktop conserva rail/launcher actual.
- `agro.js`, Supabase, migraciones, Storage, RPC/grants, Vercel, workflows, credenciales y logica de datos quedan sin tocar.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/index.html` | Agrega `body[data-agro-shell-depth]`, tabbar movil, topbar contextual y hub movil con paneles Inicio, Operacion, Memoria y Menu. |
| `apps/gold/agro/agro.css` | Agrega estilos responsive <=768px para ocultar rail legacy, mostrar tabbar solo en hub, ocultarla en modulo, mostrar Volver contextual y evitar solape con Feedback. |
| `apps/gold/agro/agro-shell.js` | Agrega estado de hub/depth, manejo de Volver, mapeo view->hub, feedback mobile y titulo contextual; corrige `runAction()` para recibir la vista activa como parametro local. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Registra diagnostico, plan, cambios y validacion de la sesion. |

### Validacion

- `node --check apps/gold/agro/agro-shell.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

### QA manual recomendado

1. Mobile <=768px: entrar a `/agro/`, confirmar hub Inicio y barra inferior visible.
2. Cambiar a Operacion, Memoria y Menu; confirmar panel correcto y sin estadisticas protagonistas.
3. Desde Memoria abrir AgroRepo; confirmar barra oculta, topbar visible y boton Volver.
4. Volver; confirmar regreso a Memoria y barra visible.
5. Probar Operacion, Menu y Feedback; confirmar que Feedback no queda debajo de la barra.
6. Desktop: confirmar rail/launcher actual sin regresiones.

### NO se hizo

- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase, migraciones, RPC/grants, Storage, Vercel, workflows ni credenciales.
- No se cambio logica financiera, logica de cultivos, logica de cartera ni logica profunda de AgroRepo.

---

## 2026-04-28 — Desktop hub/module y separacion Operacion Agro

**Estado:** GREEN — implementado y validado con build

**Objetivo:** Extender a desktop el patron aprobado de navegacion `hub/module`, ocultar navegacion global dentro de modulos profundos, reforzar el topbar contextual y separar Cartera Viva / Cartera Operativa como entradas claras del hub Operacion.

### Diagnostico

- El MVP anterior agrego `body[data-agro-shell-depth="hub|module"]`, hub mobile, tabbar inferior y topbar contextual, pero su CSS operativo esta limitado a `@media (max-width: 768px)`.
- En desktop, el rail persistente y el launcher siguen visibles/operables aunque el usuario entre a vistas profundas como `cartera-viva`, `operational` o `agrorepo`.
- La estructura de `agro-shell.js` ya permite resolver la profundidad en un solo punto (`setActiveView()`, `setShellDepth()`, `setMobileHub()`), por lo que no hace falta tocar `agro.js`.
- El hub Operacion ya contiene accesos separados en mobile, pero desktop sigue dependiendo del rail/launcher; se necesita una superficie de hub visible tambien en desktop y no una mezcla de Cartera Viva + Cartera Operativa como una unica entrada ambigua.
- Los titulos actuales de algunas superficies usan blancos protagonistas o estilos locales; se puede alinear el shell nuevo con el tono de `docs-agro`: Orbitron sobrio, gold principal, subtitulo muted y jerarquia compacta.

### Plan de ejecucion

1. Convertir el hub actual en una superficie responsive compartida desktop/mobile, no solo mobile.
2. Agregar tabs de hub para desktop usando los mismos grupos: Inicio, Operacion, Memoria y Menu.
3. Ajustar CSS para que `hub` muestre navegacion global/hub y `module` oculte rail, launcher/tabbar global y muestre topbar contextual.
4. Mantener la tabbar inferior solo para mobile y usar navegacion de hub superior en desktop.
5. Reforzar visualmente titulos del hub/topbar con tokens V10 y lenguaje docs: gold, muted, Orbitron/Rajdhani, sin titulo blanco protagonista.
6. Asegurar que Operacion muestre `Cartera Viva` y `Cartera Operativa` como entradas independientes.
7. Validar con `git diff --check` y `pnpm build:gold`.

### Riesgos

- Ocultar el rail en desktop durante `module` puede afectar accesos rapidos si el boton Volver no queda siempre visible; mitigacion: topbar contextual sticky con Volver.
- `operaciones`, `cartera-viva` y `operational` comparten parte del legacy financiero; el cambio debe separar navegacion/superficie, no tocar logica comercial ni datos.
- El CSS de Agro es grande; el cambio debe quedarse acotado al bloque del shell/hub para evitar regresiones visuales no relacionadas.

### Archivos a tocar

- `apps/gold/agro/index.html`
- `apps/gold/agro/agro.css`
- `apps/gold/agro/agro-shell.js`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Resultado de implementacion

- `index.html`: se elimino la quicknav superior del header (`Dashboard Principal` y `Nuevo registro`). El logo conserva la salida principal y el hub conserva `Dashboard Agro` / `Nuevo registro` dentro de Inicio.
- `agro.css`: se oculto el rail legacy desktop y su toggle cuando `agro-shell-ready` esta activo; tambien se neutralizo el padding lateral residual del layout.
- `agro.css`: las tabs desktop `Inicio / Operacion / Memoria / Menu` se reordenan visualmente al fondo del hub, sobre el footer.
- `agro.css`: los titulos/eyebrow del hub mobile vuelven a centrarse para evitar la lectura desbalanceada de las capturas.
- `agro.css`: dentro de `Cartera Viva` y `Cartera Operativa` se oculta la navegacion hermana `.agro-commercial-family`, evitando que ambas superficies parezcan vivir mezcladas.
- `agro-shell.js`: auditado; no requirio cambios.

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning no bloqueante: engine local Node `v25.6.0` vs requerido `20.x`.

### Alcance respetado

- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase, migraciones, RLS, RPC/grants, Storage, Vercel, workflows ni credenciales.
- No se cambio logica financiera, logica de cultivos, logica de cartera ni logica profunda de AgroRepo.

### Resultado de implementacion

- `index.html`: el hub existente pasa a ser `Hub Agro` responsive y suma tabs desktop para Inicio, Operacion, Memoria y Menu reutilizando el contrato `data-agro-mobile-tab`.
- `agro.css`: se agrego una capa shell hub/module fuera del media query mobile. En `hub` se ocultan regiones profundas y se muestra hub; en `module` se ocultan rail/sidebar/quicknav y se muestra topbar contextual sticky.
- `agro.css`: se mantuvo la tabbar inferior solo para mobile; desktop usa tabs superiores del hub.
- `agro.css`: titulos principales de hub/topbar/modulo usan gold V10 y gradiente estatico estilo docs-agro, evitando blanco protagonista.
- `agro-shell.js`: el estado `hub/module` y el foco al volver ya no dependen de viewport; las acciones profundas tambien activan topbar contextual en desktop.
- `agro-shell.js`: `operaciones` queda rotulado como `Operacion Comercial`.
- Operacion muestra `Cartera Viva` y `Cartera Operativa` como entradas independientes del hub y cada una abre su vista dedicada.

### Validacion

- `node --check apps/gold/agro/agro-shell.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning no bloqueante: engine local Node `v25.6.0` vs requerido `20.x`.

### Alcance respetado

- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase, migraciones, RLS, RPC/grants, Storage, Vercel, workflows ni credenciales.
- No se cambio logica financiera, logica de cultivos, logica de cartera ni logica profunda de AgroRepo.

---

## 2026-04-28 — Shell hub/module V2 limpieza visual

**Estado:** GREEN — implementado y validado con build; QA browser omitida por instruccion del usuario

**Objetivo:** Segunda pasada quirurgica sobre el shell Agro para quitar duplicidades visuales, limpiar header, centrar mejor el hub mobile, eliminar el rail legacy en desktop y reforzar la separacion semantica entre Cartera Viva y Cartera Operativa.

### Diagnostico

- Mobile ya usa hub y tabbar inferior, pero el bloque de titulo del hub quedo alineado a la izquierda en el ultimo override y se percibe descentrado.
- El header superior conserva acciones de acceso rapido como `Nuevo registro`; duplican accesos del hub y agregan ruido visual.
- Desktop muestra simultaneamente el hub nuevo y el rail legacy izquierdo, generando dos sistemas globales de navegacion.
- La barra desktop `Inicio / Operacion / Memoria / Menu` se lee mejor como navegacion inferior del hub, cerca del footer, no como otro elemento protagonista sobre el contenido.
- Cartera Viva y Cartera Operativa ya tienen entradas separadas en Operacion, pero la subnavegacion legacy puede volver a presentarlas como hermanas dentro de la misma superficie.

### Plan

1. Auditar markup actual del header, rail, hub tabs y subnavegacion financiera.
2. Eliminar del header superior la accion `Nuevo registro`, conservando solo accesos estrictamente necesarios.
3. Centrar titulos/eyebrow del hub en mobile y desktop con tokens V10.
4. Ocultar el rail legacy en desktop cuando el shell hub/module esta activo y neutralizar padding lateral residual.
5. Reubicar tabs desktop del hub al fondo de la superficie, justo sobre el footer.
6. Ocultar o neutralizar la subnavegacion `Cartera Viva / Cartera Operativa` cuando ya se esta dentro de una de esas vistas, manteniendo separacion semantica.
7. Validar con `git diff --check` y `pnpm build:gold`.

### Riesgos

- Ocultar el rail desktop cambia un habito de navegacion legacy; mitigacion: hub visible en profundidad `hub` y topbar con `Volver` en profundidad `module`.
- La navegacion financiera legacy comparte componentes; el ajuste debe ocultar mezcla visual sin tocar logica financiera ni datos.

### Archivos a tocar

- `apps/gold/agro/index.html`
- `apps/gold/agro/agro.css`
- `apps/gold/agro/agro-shell.js`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

---

## 2026-04-28 — Documentacion canon hub/module Agro

**Estado:** GREEN — implementado y validado con build

### Diagnostico

El shell Agro cambio su navegacion principal hacia un patron hub/module. La documentacion canonica y publica debe reflejarlo para evitar que futuros agentes vuelvan a tratar el rail legacy como navegacion principal activa.

### Plan

- Actualizar Manifiesto Agro con la regla semantica hub/module.
- Actualizar Ficha Tecnica con la descripcion actual de `agro-shell.js`.
- Actualizar documentacion publica Agro si describe navegacion anterior.
- Revisar README/llms.txt y actualizar solo si mencionan navegacion/shell de Agro.
- No tocar ADN Visual V10 por ser inmutable.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/MANIFIESTO_AGRO.md` | docs | Seccion 4.11.3 reescrita con canon hub/module. Se agrego seccion 4.11.4 Navegacion Hub/Module con puertas, regla canonica y regla de modulos profundos. Se agrego regla de separacion visual para Cartera Viva / Cartera Operativa en 4.5.2. |
| `FICHA_TECNICA.md` | docs | Linea `agro-shell.js` actualizada: ahora describe navegacion hub/module, hub central desktop, barra inferior mobile, topbar contextual. |
| `apps/gold/docs-agro.html` | docs | Seccion "Como moverte dentro de Agro" reescrita para usuario final con las cuatro puertas (Inicio, Operacion, Memoria, Menu), patron hub/module y explicacion mobile/desktop. |
| `apps/gold/public/llms.txt` | docs | Agregada linea sobre navegacion hub/module en seccion 8. |

### No se toco

- `README.md` (raiz): no menciona navegacion Agro.
- `apps/gold/README.md`: no menciona navegacion Agro.
- `apps/gold/docs/ADN-VISUAL-V10.0.md`: inmutable, no se toco.
- Codigo: no se toco ningun archivo de codigo.
- Supabase, migraciones, Vercel, workflows, credenciales: no se tocaron.

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, 165 modules, check-llms OK, UTF-8 OK).

### Estado final

GREEN. Documentacion canonica actualizada sin tocar codigo ni ADN Visual.

---

## 2026-04-29 — Separacion Mi Carrito / Cartera Operativa

**Estado:** YELLOW EN CURSO — diagnostico y plan registrados antes de editar codigo

**Objetivo:** Corregir la mezcla visual entre `Mi Carrito` y `Cartera Operativa` dentro del nuevo shell hub/module Agro.

### Diagnostico

- `apps/gold/agro/index.html` muestra `Mi Carrito` como acceso hermano dentro del hub Operacion. Eso es correcto y debe conservarse.
- `apps/gold/agro/agro-shell.js` contiene el alias `carrito -> operational/cart`; por eso el acceso profundo `Mi Carrito` termina montando la superficie `operational` con topbar de carrito.
- `apps/gold/agro/agro-shell.js` tambien mapea el tab financiero legacy `carrito` hacia `operational`, reforzando la mezcla.
- `apps/gold/agro/agroOperationalCycles.js` define `SUBVIEW_CART` dentro de `SUBVIEW_OPTIONS`, lo usa como subvista inicial y lo renderiza como chip `Mi Carrito` en `renderSubviewSwitch()`.
- `apps/gold/agro/agroOperationalCycles.js` mueve `#agro-cart-root` hacia `#agro-operational-list` cuando la subvista es `cart`, haciendo que el carrito viva dentro de Cartera Operativa.
- `apps/gold/agro/agro-cart.js` ya conserva la funcion de convertir items del carrito en gasto/deuda/donacion/perdida real mediante `handleRegisterPurchase()` y `CART_OPERATION_REGISTRATION_OPTIONS`; no hace falta duplicar ni tocar esa logica.

### Plan

1. Cambiar el routing del shell para que `carrito` abra la vista dedicada existente y no `operational/cart`.
2. Quitar `cart` de las subviews internas de `Cartera Operativa` y dejar el default en `active`.
3. Retirar el chip `Mi Carrito` y la rama de render que monta carrito dentro de `agroOperationalCycles.js`.
4. Mantener el mount dedicado `#carrito-dedicated-root` para `Mi Carrito` y conservar la conversion de items a operaciones reales.
5. Ajustar CSS mobile para ocultar Feedback flotante en modulos profundos, reforzar padding inferior con safe-area y evitar solapes de header/contextbar en 360/390/430.
6. Validar con navegador en mobile y desktop, luego `pnpm build:gold`.

### Riesgos

- `agro.js` mantiene helpers legacy de reparent del carrito; el cambio debe ser minimo y compatible con ese patron existente.
- Si algun link historico usa `operational-cart`, debe redirigir a la vista dedicada de carrito, no recrear el subtab dentro de Cartera Operativa.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro-shell.js` | JS routing | `carrito` y `operational-cart` ahora resuelven a la vista dedicada `carrito`; `operational` queda con default `active` y sin subview `cart`. |
| `apps/gold/agro/agroOperationalCycles.js` | JS vista | Eliminada la subvista interna `cart`, el chip `Mi Carrito`, el resumen de carrito y el mount de `#agro-cart-root` dentro de Cartera Operativa. |
| `apps/gold/agro/agro.js` | JS wiring legacy | El reparent legacy del carrito ya no permite montar `#agro-cart-root` dentro de `operational/cart`; solo lo monta en `#carrito-dedicated-root` cuando la vista activa es `carrito`. |
| `apps/gold/agro/index.html` | Markup/copy | El acceso del launcher a Cartera Operativa deja de mencionar carrito; el header dedicado usa `Mi Carrito`. |
| `apps/gold/agro/agro.css` | CSS mobile | En modulos profundos mobile se oculta el FAB de Feedback, se refuerza padding inferior con `env(safe-area-inset-bottom)` y se ajusta header <=480/390 para evitar compresion. |

### Validacion

- `node --check apps/gold/agro/agro-shell.js`: PASS.
- `node --check apps/gold/agro/agroOperationalCycles.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning local no bloqueante: Node `v25.6.0` vs engine esperado `20.x`.

### QA

- QA browser/manual no ejecutada por instruccion expresa del usuario el 2026-04-29.
- Se detuvo el servidor Vite local abierto para el intento inicial de QA y se elimino la carpeta temporal `.playwright-mcp/`.

### NO se hizo

- No se leyo `testqacredentials.md`.
- No se hizo QA autenticada ni se tocaron datos reales.
- No se toco Supabase, migraciones, RLS, Storage, Vercel, workflows ni credenciales.
- No se hizo commit ni push.

---

## 2026-04-29 — V3.1 Bloque A: idempotencia facturero selection

**Estado:** COMPLETADO

### Diagnóstico

`initFactureroSelection()` registra listeners de selección del facturero. Se revisa si puede duplicarlos al reinicializar el módulo y se aplicará un guard idempotente/cleanup mínimo sin cambiar UX ni lógica de datos.

### Plan

- Revisar listeners actuales.
- Agregar guard idempotente o `AbortController`.
- Mantener comportamiento visual y funcional.
- No tocar `agro.js`.
- Validar con `git diff --check` y `pnpm build:gold`.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro-selection.js` | JS listeners | Se agrego `AbortController` de modulo y `cleanupFactureroSelection()`; `initFactureroSelection()` limpia listeners anteriores antes de registrar `click`, `keydown`, `agro:finance-tab:changed`, `agro:crop:changed` y `data-refresh` con `{ signal }`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Sesion V3.1 Bloque A documentada. |

### Validacion

- `node --check apps/gold/agro/agro-selection.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning local no bloqueante: Node `v25.6.0` vs engine esperado `20.x`.

### NO se hizo

- No se cambio UX.
- No se cambio logica de seleccion.
- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase, migraciones, RLS, RPC, Storage, Vercel, workflows ni credenciales.

---

## 2026-04-29 — Corrección semántica hub/module Agro

**Estado:** GREEN

### Diagnóstico

El nuevo hub simplificó la navegación, pero produjo una regresión semántica: `Operación Comercial` aparece como módulo cuando debe tratarse como familia conceptual/económica. Los módulos reales son Cartera Viva, Cartera Operativa y Mi Carrito. También deben restaurarse accesos importantes como Ciclos finalizados, Estadísticas de ciclos y el selector de cultivo en Rankings.

### Plan

- Eliminar `Operación Comercial` como card/módulo clickeable del hub.
- Reorganizar la puerta `Operación` con módulos reales.
- Restaurar Ciclos activos/finalizados/estadísticas de ciclos.
- Restaurar Ciclos de Período y subviews reales existentes.
- Revisar Rankings y confirmar selector de cultivo.
- Separar visualmente marca, usuario y notificaciones.
- No tocar `agro.js` ni datos.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/index.html` | Hub markup | La puerta `Operación` elimina `Operación Comercial` como card clickeable y restaura accesos por secciones: Producción, Períodos, Finanzas, Trabajo y lectura. |
| `apps/gold/agro/agro.css` | Shell CSS | Se agregan encabezados visuales sobrios para secciones del hub, se alinea el header para separar marca de usuario/notificaciones y se permite que Rankings muestre solo el selector de cultivo sin reabrir toda la superficie del facturero. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs | Diagnóstico, plan y cierre de la corrección semántica. |

### Validación

- `node --check apps/gold/agro/agro-shell.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning local no bloqueante: Node `v25.6.0` vs engine esperado `20.x`.

### NO se hizo

- No se tocó `apps/gold/agro/agro.js`.
- No se tocó Supabase, migraciones, RLS, RPC, Storage, Vercel, workflows ni credenciales.
- No se modificó lógica de datos, cartera, cultivos ni AgroRepo.

---

## 2026-04-29 — Corrección menú/rankings hub Agro

**Estado:** GREEN

### Diagnóstico

El hub quedó visualmente limpio, pero persisten errores semánticos: Rankings aparece con nombre ambiguo, el selector de ciclos finalizados navega en vez de seleccionar contexto, Menú/Ajustes duplica módulos existentes, Feedback está duplicado y Perfil está mejor ubicado en Inicio.

### Plan

- Renombrar Rankings según su función real.
- Corregir selección de ciclos finalizados en Rankings.
- Limpiar Menú/Ajustes para no duplicar módulos.
- Mantener Feedback solo como FAB flotante.
- Mover Perfil a Inicio.
- No tocar datos ni Supabase.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/index.html` | Hub/copy | `Mi Perfil` se movió a Inicio; Menú queda con Documentación, Soporte oficial y Privacidad; se retiró Feedback como card; Rankings pasa a `Rankings de Clientes`; Ayuda/soporte deja de duplicar Clima, Asistente, Social y AgroRepo. |
| `apps/gold/agro/agro.css` | CSS contextual | El bloque de ciclos cerrados permite chips de selección en Rankings y mantiene el enlace a historial como secundario. |
| `apps/gold/agro/agro-shell.js` | Shell JS | `perfil` vuelve al hub Inicio; `rankings` usa título `Rankings de Clientes`; se agrega picker de ciclos cerrados usando `window.__AGRO_CROPS_STATE` y `window.setSelectedCropId()` sin tocar `agro.js`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs | Diagnóstico, plan y cierre de la corrección menú/rankings. |

### Validación

- `node --check apps/gold/agro/agro-shell.js`: PASS.
- `node --check apps/gold/agro/agro-selection.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning local no bloqueante: Node `v25.6.0` vs engine esperado `20.x`.

### NO se hizo

- No se tocó `apps/gold/agro/agro.js`.
- No se tocó Supabase, migraciones, RLS, RPC, Storage, Vercel, workflows ni credenciales.
- No se cambió lógica financiera, cultivos, cartera ni AgroRepo.

---

## 2026-04-30 — Ajuste semántico del hub: Operación → Granja

**Estado:** COMPLETADO

### Diagnóstico

El hub funciona bien pero usa lenguaje operativo ("Operación", "Producción", "Finanzas"). Se ajustan las etiquetas visibles para hablar más cercano al concepto de finca/granja sin tocar estructura, lógica ni datos.

### Plan

- Renombrar tabs "Operación" → "Granja" (3 instancias en index.html).
- Cambiar título del hub a "Mi Granja".
- Renombrar secciones: "Producción" → "Ciclos de cultivos", "Períodos" → "Ciclos de períodos", "Finanzas" → "Mis finanzas".
- Actualizar label visible en agro-shell.js.
- No tocar claves internas JS ni datos.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/index.html` | Markup/copy | Tabs "Operación" → "Granja" (rail, hub tab, mobile tabbar). Título hub → "Mi Granja". Secciones → "Ciclos de cultivos", "Ciclos de períodos", "Mis finanzas". |
| `apps/gold/agro/agro-shell.js` | Label visible | `operaciones.label` → "Mi Granja" (topbar contextual). |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs | Sesión documentada. |

### Validación

- `node --check apps/gold/agro/agro-shell.js`: PASS
- `git diff --check`: PASS
- `pnpm build:gold`: PASS (165 modules, check-llms OK, UTF-8 OK)
