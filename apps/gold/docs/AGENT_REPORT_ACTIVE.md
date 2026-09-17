# AGENT_REPORT_ACTIVE.md — YavlGold

Estado: ACTIVO
Fecha de apertura: 2026-09-17
Archivo anterior archivado: `AGENT_LEGACY_CONTEXT__2026-08-01__2026-09-17.md`

> **Constancia de rotación (2026-09-17)**: Se archivó el reporte activo previo (4,006 líneas, 2026-08-01 → 2026-09-17) al superar el umbral de 4,000 líneas de la ley canónica §4.1. Este archivo es la única fuente activa de reportes de sesión. El archivo archivado conserva íntegro el contexto agosto-septiembre 2026 (incluye la saga completa de los factureros ANEXOS 1-23-b).

---

## Estado vivo del proyecto

- Release visible activa: `V1`. Owner: Yerikson (QA online EXCLUSIVO suyo, ley §5; agentes sin QA ni git sin su palabra).
- Canon operativo: `AGENTS.md` · Canon visual: `ADN-VISUAL-V12.0.md` · Canon semántico Agro: `MANIFIESTO_AGRO.md` · Estructura: `FICHA_TECNICA.md`.
- Supabase canónico: `supabase/` en raíz (apps/gold/supabase NO es canónico).
- Factureros Finca/Cultivo/Personal: wizards vivos con reader único `agro-ledger-reader.js` (ANEXOS 1-22 QA GREEN, commiteados hasta `e37c9bd1` + `956b388e`).

## Frente abierto (activo)

- **ANEXO 23-b — pivote nativo en totales del ciclo**: fix completo en working tree (build verde), **QA owner pendiente**. Causa raíz del residual: `normalizeCycleDisplayCurrency()` sin argumento siempre devuelve 'USD' (normalizador puro, no getter) → el guard nativo del ANEXO 23 jamás activaba y las 6 líneas de la card seguían en camino USD (200.110/200.106 vs 200.000 reales). Fix: `getCycleDisplayCurrency()` real en los 3 guards de `agrociclos.js`; moneda null del movimiento hereda la del ciclo (`agroOperationalCycles.js`); bridge expone `window._agroMergedOperationalNativeByCrop`. Detalle completo y tabla de verdad: final del archivo archivado (sesión 2026-09-17 II). **Git NO ejecutado** — bloque sugerido ahí mismo.

## Decisiones canónicas vigentes (resumen)

- Particiones factureros: Finca (farm_id ✓, crop_id ✗) · Cultivo (crop_id ✓) · Personal (ambos null).
- Dedup lectura ledger↔operacionales: llave fecha|monto|concepto, **ledger prima** (wizard y, desde ANEXO 23, también los totales de las cards y Bloque 4 vía bridge).
- Totales del ciclo monomoneda: métricas en moneda nativa (identidad del pivote, sin roundtrip FX); mezcla de monedas → pivote USD.
- `costos_totales` NO es columna: todo se calcula en lectura (§4.3 del MANIFIESTO intacta).
- Hash > storage para estado de UI de wizards; FA 6.5 Free únicamente; `Number(null)===0` se valida explícito.

## Deuda técnica viva

- Extracción Rankings a `agro-rankings.js`; split `agro-facturero-finca.css` (>3,400L); `agroOperationalCycles.js` >4,200L (extracción pendiente); polling duplicado Binance (§11.5); hex hardcodeados en CSS legacy.
- Rankings/estadísticas leen el map operacional CRUDO (sin dedup) — superficie distinta a la card, documentado en ANEXO 23.
- Bloque "Global" del desglose de cultivo sigue en pivote USD; unión de ingresos operacionales no alimenta `incomeTotal` (preexistente).
- Comentario stale del header de `agro-ledger-reader.js` ("Finca conserva su lectura local histórica" — falso desde S7).

## Últimos cambios relevantes aún vivos

- `956b388e` (owner): ANEXO 23 completo — nativos por moneda, dedup en totales, F1 ÷ tasa + refreshSilent, bridge USD Bloque 4.
- Working tree 17-sep (sin commit): ANEXO 23-b (3 archivos, +33/−9) — ver bloque git sugerido en el archivado.
- Crónica activa del año: `chronicles/CRONICA-YAVLGOLD-2026-ACTIVA.md`; diarios en `ops/daily-log-*.md` (se purgan al cierre mensual).

---

## Sesión 2026-09-17 (II) — ANEXO 23-b + rotación de reporte

Agente: GLM (ZCode). QA owner 17-sep 18:45 NO VERDE → diagnóstico del residual completado y fix aplicado. El detalle COMPLETO de la sesión (diagnóstico (a)-(d) con archivo:línea, tabla de verdad 200.000, matriz F1, plan de QA, límites declarados) vive al final de `AGENT_LEGACY_CONTEXT__2026-08-01__2026-09-17.md` — se traslada aquí solo lo operativo:

- **Fix**: `agrociclos.js` `currentDisplayCurrencyCode()` (= `getCycleDisplayCurrency()`) reemplaza los 3 guards que usaban `normalizeCycleDisplayCurrency()` sin argumento (siempre 'USD'); `agroOperationalCycles.js` moneda null/vacía hereda la del ciclo; `agro.js` bridge publica `_agroMergedOperationalNativeByCrop`.
- **Réplica estática fiel** (semántica real de las funciones): las 6 líneas de Maíz 190826 → **COP 200.000 exactos**; F1 edita/elimina/restaura → 210.000/165.000/200.000; mixto → camino USD intacto.
- **Build**: `pnpm build:gold` ✅ verde (3 archivos, +33/−9).
- **QA owner pendiente**: desglose 6 líneas en 200.000 cuadrando con el wizard (y demás cultivos monomoneda); toggle intacto; F1 mueve totales; consola limpia.
- **NO se hizo**: git (bloque sugerido en el archivado), MANIFIESTO, reader, wizards, semántica USD de reportes.
- **Rotación §4.1**: este archivo arranca nuevo tras archivar el previo (4,006 líneas).
