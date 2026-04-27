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
