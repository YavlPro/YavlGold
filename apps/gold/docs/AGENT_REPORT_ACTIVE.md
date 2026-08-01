# AGENT_REPORT_ACTIVE.md — YavlGold

Estado: ACTIVO
Fecha de apertura: 2026-08-01
Archivo anterior archivado: `AGENT_LEGACY_CONTEXT__2026-06-03__2026-07-31.md`

> **Constancia de rotación (2026-08-01)**: Se archivó el reporte activo previo (3,884 líneas, 2026-06-03 → 2026-07-31) al superar el umbral de 4,000 líneas de la ley canónica §4.1. Este archivo es la única fuente activa de reportes de sesión. El archivo archivado conserva íntegro el contexto de junio-julio 2026.

---

## Estado vivo del proyecto

- Release visible activa: `V1`.
- Canon operativo superior: `AGENTS.md`.
- Canon visual activo: `apps/gold/docs/ADN-VISUAL-V12.0.md`.
- Canon semántico Agro: `apps/gold/docs/MANIFIESTO_AGRO.md` (solo con autorización expresa).
- Ficha técnica disponible en: `apps/gold/docs/FICHA_TECNICA.md`.
- Supabase canónico: `supabase/` en raíz.
- Crónicas mensuales vigentes: mayo, junio y julio 2026 consolidadas y anexadas en `CRONICA-YAVLGOLD.md`.
- Estado del mes: agosto 2026 en curso (día 1).

## Frentes abiertos

- **Agro V1**: mantener separación semántica entre Facturero de Clientes, Facturero de la Finca y Mis Clientes.
- **AgroRepo**: QA pendiente de sistema roots (renombrar/eliminar), drag&drop con ciclo-guard y duplicar con mismo nombre.
- **Dashboard Agro v11**: QA visual pendiente del Product Owner en producción (balance real, mercados, velocímetro, selector finca).
- **Onboarding**: QA pendiente con cuenta nueva (verificar que wizard no se auto-abre).
- **Deuda técnica viva de junio**: extracción Rankings a `agro-rankings.js`, split `agro-facturero-finca.css` (>3,400L), extracción `agroOperationalCycles.js` (>4,000L), polling duplicado Binance (§11.5), `agro-planning.js` posible zombie, `agro.css` hex hardcodeados.
- **Documentación**: registrar sesiones en este archivo; rotar de nuevo al alcanzar 4,000 líneas.

## Decisiones canónicas vigentes

- No agregar features nuevas en `apps/gold/agro/agro.js`; solo wiring quirúrgico si es inevitable (§3.1).
- Nuevas piezas Agro deben vivir como módulos `agro-*.js` o CSS dedicado.
- Mis Clientes es libreta de contactos; Facturero de Clientes es seguimiento de créditos/deudas.
- Agro siempre arranca en el Hub/Dashboard, nunca restaura la última vista (`resolveInitialView()` sin storedView).
- `inversionUSD = baseInvestment + expenseInvestment` — el campo visible de inversión suma inversión base + gastos operativos reales.
- ADN Visual V12.0 es canon visual activo; V11 solo referencia histórica.
- Build gate obligatorio tras cambios de código: `pnpm build:gold`.

## Deuda técnica viva

- `agro.js` sigue siendo monolito legacy; evitar crecimiento.
- `agro-facturero-finca.css` > 3,400L — requiere split por superficie/módulo.
- `agroOperationalCycles.js` > 4,000L — requiere extracción modular.
- Rankings vive en `agro.js` — extracción a `agro-rankings.js` pendiente.
- Polling duplicado Binance en `agro-market.js` y `agro-interactions.js` — singleton centralizado pendiente (§11.5).
- `agro-planning.js` posible zombie — verificar import dinámico en `agro/index.html`.
- `agro.css` con 310 hex hardcodeados — migración progresiva a tokens.
- Dashboard Agro balance finca: solución client-side temporal (`computeFarmStats`) — requiere RPC definitiva.
- `agro.js` aún tiene `formatCurrency`/`formatMoneyByCode` delegando a `es-VE` — migrar a `agro-format.js`.

## Últimos cambios importantes todavía relevantes

- **2026-08-01**: Consolidación de crónicas de junio y julio 2026 (`chronicles/2026-06.md`, `chronicles/2026-07.md`) con addendums en `CRONICA-YAVLGOLD.md`. Purga de daily logs de ambos meses (23 archivos: 22 junio + 1 julio). Rotación de `AGENT_REPORT_ACTIVE.md` a 3,884L → archivado como `AGENT_LEGACY_CONTEXT__2026-06-03__2026-07-31.md`.
- **2026-07-31**: Reincorporación tras pausa por hardware. 7 commits: botón eliminar repo móvil, scroll IA mobile, inversión USD real (base + gastos), responsive ciclos/headers, hub al entrar, 3 CVEs cerradas (brace-expansion, postcss), plan de 14 prioridades documental.
- **2026-07-07**: Sincronización canónica V12 (`llms.txt`, `AGENTS.md`, `FICHA_TECNICA.md`).
- **2026-06-28**: Migración tipográfica V12 COMPLETADA en toda la plataforma — Orbitron/Rajdhani erradicadas.
- **2026-06-27**: Factureros Fase 1 CERRADO — 6 bugs corregidos, QA producción GREEN.
- **2026-06-24**: Dashboard Agro v11 (6 bloques, ES6 module).
- **2026-06-10**: Skill Universal creada `SKILLS/2026-06-11-PATRONES-ERROR-YAVLGOLD.md`.
- **2026-06-05**: Plan estratégico de 4 fases de Fincas completado (Movimientos Generales, Dashboard, Comparación, Informes MD).

## Referencias a archivos archivados relevantes

- `AGENT_LEGACY_CONTEXT__2026-06-03__2026-07-31.md` — contexto activo previo (junio-julio 2026)
- `AGENT_LEGACY_CONTEXT__2026-05-05__2026-06-03.md`
- `AGENT_LEGACY_CONTEXT__2026-04-17__2026-04-27.md`
- `apps/gold/docs/chronicles/2026-06.md` — Crónica de junio 2026
- `apps/gold/docs/chronicles/2026-07.md` — Crónica de julio 2026
- `apps/gold/docs/AGENT_REPORT.md` — histórico legacy (solo consulta)
- `apps/gold/docs/ops/` — daily logs de junio/julio purgados tras consolidación de crónicas

---

## Sesión 2026-08-01 — Consolidación de crónicas junio/julio y rotación del reporte activo

### Objetivo
Verificar la existencia de las crónicas de mayo/junio/julio 2026, crear las que faltaban y ejecutar la rotación canónica de `AGENT_REPORT_ACTIVE.md`.

### Diagnóstico
- Mayo 2026: crónica existente y anexada en `CRONICA-YAVLGOLD.md` (verificado).
- Junio 2026: crónica NO existente; 22 daily logs en `docs/ops/` (21 canónicos + 1 no canónico `DAILY_LOG_2026-06-03.md`).
- Julio 2026: crónica NO existente; 1 daily log canónico + sesiones del 7 y 31 de julio en el reporte activo previo.
- `AGENT_REPORT_ACTIVE.md`: 3,884 líneas — candidato a rotación.

### Cambios realizados
| Archivo | Tipo | Cambio |
|---------|------|--------|
| `apps/gold/docs/chronicles/2026-06.md` | CREADO | Crónica completa de junio (hitos, decisiones, módulos, deuda técnica). |
| `apps/gold/docs/chronicles/2026-07.md` | CREADO | Crónica completa de julio (pausa por hardware + reincorporación 31). |
| `apps/gold/docs/chronicles/CRONICA-YAVLGOLD.md` | EDITADO | Addendums Anexo J (junio) y Anexo K (julio) agregados. |
| `apps/gold/docs/ops/` | PURGADO | 23 daily logs de junio/julio eliminados (incluido 1 no canónico). |
| `apps/gold/docs/AGENT_LEGACY_CONTEXT__2026-06-03__2026-07-31.md` | CREADO | Reporte activo previo archivado íntegro. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | REEMPLAZADO | Nuevo reporte activo limpio con contexto vivo + sesión actual. |

### Resultado de build
`pnpm build:gold` → ✅ GREEN (agent-guard OK, agent-report-check OK, 187 módulos, 4.72s, check-llms OK, check-dist-utf8 OK).

### QA sugerido
- Verificar que `CRONICA-YAVLGOLD.md` mantiene addendums consecutivos Ene→Jul 2026.
- Verificar que `AGENT_LEGACY_CONTEXT__2026-06-03__2026-07-31.md` conserva las 3,884 líneas íntegras.
- Confirmar que el puntero de raíz `AGENT_REPORT_ACTIVE.md` sigue apuntando al activo.

### NO se hizo
- No se crearon las crónicas de agosto 2026 (mes en curso, no corresponde).
- No se tocó código del producto.
- No se modificó `AGENT_LEGACY_CONTEXT` previo ni documentos canónicos superiores.
