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
