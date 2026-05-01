# AGENT CONTEXT INDEX

Mapa central de navegación documental de YavlGold.
Este archivo es el punto de entrada para cualquier agente que necesite entender el sistema.
Actualizado: 2026-04-17.

---

## Sistema Wiki — Capas documentales

| Capa | Documento | Ubicacion | Qué hace |
|---|---|---|---|
| **Schema / Ley** | AGENTS.md | raiz | Instrucciones canónicas para agentes |
| **Ley visual** | ADN-VISUAL-V11.0.md | docs/ | Sistema de diseño canónico activo (V11). V10 es referencia histórica fundacional |
| **Verdad semantica** | MANIFIESTO_AGRO.md | docs/ | Qué es cada superficie de Agro |
| **Estructura** | FICHA_TECNICA.md | raiz | Ficha técnica del proyecto |
| **Wiki viva** | AGENT_REPORT_ACTIVE.md | docs/ | Estado operativo acumulativo |
| **Bitácora mensual** | daily-log-YYYY-MM-DD.md | docs/ops/ | Handoff operativo temporal entre agentes |
| **Mapa central** | AGENT_CONTEXT_INDEX.md | docs/ | Este archivo |
| **Resumen operativo** | llms.txt | public/ | Contexto para LLMs (servido en prod) |

---

## Nucleo obligatorio

- [AGENTS.md](../../AGENTS.md) — Ley operativa, schema maestro del proyecto
- [AGENT_REPORT_ACTIVE.md](./AGENT_REPORT_ACTIVE.md) — Wiki viva actual
- [MANIFIESTO_AGRO.md](./MANIFIESTO_AGRO.md) — Verdad semántica de Agro
- [ADN-VISUAL-V11.0.md](./ADN-VISUAL-V11.0.md) — Sistema de diseño canónico activo (V11)
- [ADN-VISUAL-V10.0.md](./ADN-VISUAL-V10.0.md) — Referencia histórica fundacional (V10, ya no rige)
- [yavlgold-context.md](./yavlgold-context.md) — Contexto consolidado (8K lineas)
- [FICHA_TECNICA.md](../../FICHA_TECNICA.md) — Ficha técnica estructural

---

## Operaciones wiki

### Ingest (nueva información entra)
1. Agente termina sesión → escribe en AGENT_REPORT_ACTIVE.md
2. Formato obligatorio: fecha, objetivo, diagnóstico, cambios, build, QA, NO se hizo
3. Si supera 4,000 líneas → rotación canónica (§4.1)
4. AGENT_CONTEXT_INDEX.md se actualiza si hay nuevos documentos

### Query (consulta de la wiki)
1. Leer AGENTS.md primero
2. Consultar este archivo para ubicar el documento correcto
3. IR al documento según tipo de pregunta:
   - Reglas de agentes → AGENTS.md
   - Diseño visual → ADN-VISUAL-V11.0.md
   - Agro → MANIFIESTO_AGRO.md
   - Estado operativo → AGENT_REPORT_ACTIVE.md
   - Bitácora del mes actual → docs/ops/daily-log-YYYY-MM-DD.md
   - Estructura técnica → FICHA_TECNICA.md
   - Contexto rápido → llms.txt

### Lint (mantenimiento de calidad)
1. Al cerrar sesión: verificar formato de AGENT_REPORT_ACTIVE.md
2. Agregar vínculo en este archivo si hay documento nuevo
3. Ejecutar rotación si se superó umbral de 4,000 líneas
4. Build gate obligatorio antes de cerrar

---

## Historico Supabase cerrado

- [archive/supabase/](./archive/supabase/) — Carpeta de archivo
  - [CIERRE_SUPABASE_16-18_ABRIL_2026.md](./archive/supabase/CIERRE_SUPABASE_16-18_ABRIL_2026.md) — Resumen de cierre (unico documento de referencia)
  - [INFORME_CODEX_16_ABRIL__CERRADO.md](./archive/supabase/INFORME_CODEX_16_ABRIL__CERRADO.md) — Solo consulta
  - [INFORME_SUPABASE_APPS_GOLD_16_ABRIL__CERRADO.md](./archive/supabase/INFORME_SUPABASE_APPS_GOLD_16_ABRIL__CERRADO.md) — Solo consulta
  - [MATRIZ_RECONCILIACION_SUPABASE_16_ABRIL__CERRADO.md](./archive/supabase/MATRIZ_RECONCILIACION_SUPABASE_16_ABRIL__CERRADO.md) — Solo consulta
  - [PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL__CERRADO.md](./archive/supabase/PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL__CERRADO.md) — Solo consulta
  - [PLAN_CONSOLIDACION_SUPABASE_16_ABRIL__CERRADO.md](./archive/supabase/PLAN_CONSOLIDACION_SUPABASE_16_ABRIL__CERRADO.md) — Solo consulta

## Contexto historico

- [AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md](./AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md) — Wiki viva anterior (17,610 líneas archivadas)
- [AGENT_REPORT.md](./AGENT_REPORT.md) — Histórico diagnostics (solo consulta)
- [AGRO_V1_BASELINE.md](./AGRO_V1_BASELINE.md) — Baseline V1 de Agro
- [AGRO-VISUAL-AUDIT-V1.md](./AGRO-VISUAL-AUDIT-V1.md) — Auditoría visual legacy
- [LEGACY_SURFACES.md](./LEGACY_SURFACES.md) — Clasificación de superficies orphan
- [LOCAL_FIRST.md](./LOCAL_FIRST.md) — Estrategia offline
- chronicles/
  - [2026-01.md](./chronicles/2026-01.md) — Crónica mensual
  - [2026-03.md](./chronicles/2026-03.md) — Crónica mensual
  - [libro del samurai especial edicion.md](./chronicles/libro%20del%20samurai%20especial%20edicion.md) — Crónica especial

---

## Criterios de inclusión

Un documento pertenece a este índice si:
- Es operativo y refleja decisiones, cambios o estado del proyecto
- Tiene utilidad para agentes futuros o para el usuario
- NO es redundante con otro documento existente

## Criterios de exclusión

Un documento debe archivarse como legacy si:
- Su información ya está cubierta por otro documento más actualizado
- Es un snapshot histórico de un proceso ya cerrado
- Está duplicado en otro lugar del repo

---

## Regla canónica

**El repo es la fuente de verdad. Obsidian es la capa de navegación.**
Si existe conflicto entre repo y vault, manda el repo.