# CIERRE SUPABASE — 16 al 18 de Abril de 2026

## Estado

**CERRADO / SOLO CONSULTA**

Este documento consolida el frente de trabajo de Supabase del 16 al 18 de abril de 2026. El frente quedó resuelto y validado. Los documentos individuales del proceso fueron archivados.

---

## Resumen del cierre

El trabajo se desarrolló en tres fases:

**Fase 1 — Diagnóstico (2026-04-16)**
Se identificó que `supabase/` en raíz era el canon operativo correcto. `apps/gold/supabase/` era un árbol secundario parcial que no debía usarse como referencia canónica. Se evaluaron los riesgos de mover o eliminar el árbol secundario.

**Fase 2 — Reconciliación y planificación (2026-04-16)**
Se creó una matriz de reconciliación comparando el árbol secundario, la raíz y el remoto real. Se identificaron 7 migraciones exclusivas del árbol secundario que correspondían a tablas vivas en remoto. Se diseñó un plan de consolidación.

**Fase 3 — Consolidación y validación (2026-04-18)**
Se ejecutó la migración de consolidación `20260416190000_consolidate_legacy_app_supabase_objects.sql` en raíz. Se resolvieron los bloqueos de migración del RPC `agro_buyer_portfolio_summary_v1` con dos migraciones de repair. Se validó con `supabase start --workdir .` y `supabase db reset --workdir . --local --no-seed`. El árbol secundario `apps/gold/supabase/` fue retirado.

---

## Decisión canónica vigente

`supabase/` en raíz es la única carpeta Supabase canónica del repo. `apps/gold/supabase/` fue retirada y no debe recrearse.

---

## Documentos del proceso

Los siguientes documentos del proceso fueron archivados en `archive/supabase/`:

| Documento archivado | Rol |
|---|---|
| `INFORME_CODEX_16_ABRIL__CERRADO.md` | Diagnóstico de ubicación de `supabase/` — veredicto: dejar en raíz |
| `INFORME_SUPABASE_APPS_GOLD_16_ABRIL__CERRADO.md` | Diagnóstico completo de `apps/gold/supabase/` — riesgos y opciones de saneamiento |
| `MATRIZ_RECONCILIACION_SUPABASE_16_ABRIL__CERRADO.md` | Matriz comparativa entre raíz, secundario y remoto |
| `PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL__CERRADO.md` | Plan de baseline para `agro_crops` y `agro_roi_calculations` (pendiente como deuda técnica) |
| `PLAN_CONSOLIDACION_SUPABASE_16_ABRIL__CERRADO.md` | Plan de consolidación ejecutada en raíz |

---

## Deuda técnica superviviente

**Baseline de `agro_crops` y `agro_roi_calculations` en raíz**
Las migraciones raíz ALTERAN `agro_crops` pero ninguna la CREA desde cero. Un `db reset` completo desde raíz fallaría sin una base canónica. Esta tarea quedó pendiente y fue registrada en `AGENT_REPORT_ACTIVE.md` como frente abierto.

---

## Referencias

- Validación local: `supabase start --workdir .` + `supabase db reset --workdir . --local --no-seed` (2026-04-18)
- Migración de consolidación: `supabase/migrations/20260416190000_consolidate_legacy_app_supabase_objects.sql`
- Migraciones de repair RPC: `20260330235959_agro_buyer_portfolio_contract_order_repair.sql` + `20260418120000_agro_buyer_portfolio_contract_restore.sql`
- Decisión canónica: `AGENTS.md` §11.7 Regla canónica de Supabase

---

*Documento generado: 2026-04-18*
*Frente Supabase cerrado y validado*
*Este documento es histórico — solo consulta*