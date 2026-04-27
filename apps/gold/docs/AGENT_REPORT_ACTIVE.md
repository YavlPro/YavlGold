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
