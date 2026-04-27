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
