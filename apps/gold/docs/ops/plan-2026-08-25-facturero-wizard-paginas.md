# PLAN — Facturero de Clientes: wizard por páginas (sin modales)

**Estado:** EJECUCIÓN — FASE 0 (diagnóstico) cerrada con autorización expresa del usuario el 2026-08-25.
**Fecha:** 2026-08-25 · **Solicitante:** usuario · **Ejecutor:** ox alpha
**Gobernanza:** AGENTS.md §8.1/§8.2 (planificación + diagnóstico), §10 (obediencia de scope), §3.1/§11.1 (no crecer `agro.js`), §4.2 (archivo al cierre), ADN V12, FICHA §7 (git sugerido, no automático).

---

## FASE 0 — DIAGNÓSTICO OBLIGATORIO (antes de tocar código) — CERRADA

Diagnóstico citado entregado en sesión (2026-08-25). Decisiones adoptadas tras autorización:

1. **Retiro parcial del modal** (`agro-wizard.js`): solo se retiran las rutas *desde* Facturero de Clientes (`openClientRecordWizard`, `openRecordFromCarteraContext`, quick actions del detalle). El modal permanece vivo para el facturero general (`injectWizardInvokers`, `agro.js:5870`) — fuera de scope.
2. **Criterio de cultivos P4**: solo `produccion` y `finalizado` (regla nueva del flow). No se toca el guard existente de la lista (`CARTERA_VIVA_ALLOWED_CROP_STATUSES` incluye `lost` para otros flujos).
3. **Hash profundo**: `VIEW_SUBNAV_CONFIG` del shell gana entrada para `facturero-clientes` (subview persistente estándar); `paso`/`id` los gestiona el flow con `history.replaceState` (patrón `period-cycles`, `agro-shell.js:1441-1447`).
4. **P2 finca**: `agro_buyers` no tiene columna de finca (`20260227000500_agro_profiles.sql:6-18`) → contexto de finca se guarda en `notes`; la finca operativa vive en P4 (`farm_id` del movimiento).
5. **P1 verificación real**: lookup real contra `public.profiles` (select público, `001_setup_profiles_trigger.sql:16`; columna email, `20260608214500:173`).

---

## 1 — Objetivo

Reemplazar la entrada actual y el wizard modal de 4 pasos por un **wizard por páginas profundas** con una tarea por pantalla, microcopy guía de una línea y "Siguiente" fijo abajo. Reducir carga cognitiva del agricultor sin eliminar ninguna función.

## 2 — Diseño aprobado (no reinterpretar)

```
P0 ENTRADA — [Nuevo cliente] · [Ver registros de clientes] (cada una con descripción corta)
├─ A) NUEVO CLIENTE
│  P1 · Vínculo: con cuenta YavlGold / sin cuenta (regla honesta: cuenta solo si verificación real)
│  P2 · Datos del cliente (nombre, finca, contacto)
│  P3 · Grid de registro: Fiado · Pagado · Pérdida · Donación
│       ("Listo, es hora de crear el nuevo registro de tu cliente")
│  P4 · Finca → Cultivo (SOLO cultivos en producción o finalizados)
│       microcopy: "ahora selecciona tu finca" / "ahora debes seleccionar tu cultivo"
│  P5 · Datos del registro (cantidad kg-aware, monto, moneda, fecha, concepto) → Confirmar
│  P6 · Listo → [Ir a ver el registro] (btn-gold) + [Ir al facturero de clientes] (btn-outline-gold)
└─ B) VER REGISTROS DE CLIENTES
   B1 · Lista (buscar + tabs Sin registro/Fiados/Pagados/Pérdidas)
   B2 · Detalle del cliente → historial + "Nuevo registro" (entra a P3 con cliente fijado)
   · Categoría GESTIÓN DE CLIENTES (menú dentro de B): Unificar · Actualizar · Exportar lista
   · Detalle, abajo, minimalista: "Te puede interesar" → [Ver registro de clientes] [Asistente IA]
```

Reglas de experiencia: una línea guía por página; topbar `Volver + Paso X de N`; sin modales en todo el flujo; "Te puede interesar" = máximo 2 sugerencias, peso secundario (`--text-muted` + chips outline), al final de la página.

## 3 — Rutas y persistencia

Hash profundo por paso, persistente en F5: `#view=facturero-clientes&subview=nuevo|registros|detalle&paso=N&id=...`. `Volver` regresa al paso/superficie correcta. Mobile ≤480 usable (§5 QA).

## 4 — Construcción

- Módulo nuevo `agro-facturero-clientes-flow.js` + `agro-facturero-clientes-flow.css`. `agro.js` NO crece (solo wiring quirúrgico justificado si es inevitable).
- Reutilizar primitivas del punto 0.5 y módulos del punto 0.4. Retirar el modal de 4 pasos solo tras confirmar llamadores (0.2/0.9).
- ADN V12: tokens, `btn-gold`/`btn-outline-gold`, FA 6.5 con `aria-hidden`, focus visible, `prefers-reduced-motion`, touch ≥44px, sin glow/shimmer nuevos.

## 5 — Scope (lo que NO se hace)

No tocar otros factureros ni Dashboard. No reescribir lógica contable. No eliminar Unificar/Actualizar/Exportar (viven en Gestión de clientes). No emojis como iconos funcionales. No tocar `MANIFIESTO_AGRO.md` ni `ADN-VISUAL-V12.0.md` sin autorización expresa (la nota §4.5.1 del punto 8 requiere sí explícito). No universalizar el patrón "Te puede interesar" a otros módulos todavía.

## 6 — DoD

- P0–P6 y B1/B2 + Gestión de clientes operando como páginas con rutas persistentes.
- Restricción de cultivos producción/finalizados aplicada en P4.
- Crear fiado/pagado/pérdida/donación con contabilidad correcta (parcialidad y reversión intactas).
- Doble salida en P6; "Te puede interesar" con 2 sugerencias en detalle.
- Modal de 4 pasos retirado sin romper llamadores; cero modales en el flujo.
- Build `pnpm build:gold` verde; QA online del operador verde (blur de "10" conserva "10", prístino "(DE 10 KG)").

## 7 — Cierre documental

Asiento en `AGENT_REPORT_ACTIVE.md`; daily-log local (sin commit); commits atómicos; push solo con autorización; al validar, mover este plan a `apps/gold/docs/archive/ux/`.

## 8 — Propuesta de nota MANIFIESTO §4.5.1 (sujeta a aprobación)

"La entrada de Facturero de Clientes ofrece dos puertas (Nuevo cliente / Ver registros de clientes). La creación opera como wizard por páginas con una tarea por paso; las herramientas de mantenimiento (Unificar, Actualizar, Exportar lista) viven en la categoría Gestión de clientes dentro de Ver registros. Los cultivos ofrecidos para registrar fiados se limitan a producción o finalizados."
