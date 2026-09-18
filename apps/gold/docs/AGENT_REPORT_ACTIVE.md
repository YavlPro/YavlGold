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

- **ANEXO 23-b — pivote nativo en totales del ciclo**: commiteado por el owner como `10347911` (HEAD al abrir esta sesión; tree limpio). Causa raíz del residual: `normalizeCycleDisplayCurrency()` sin argumento siempre devuelve 'USD' (normalizador puro, no getter) → el guard nativo del ANEXO 23 jamás activaba y las 6 líneas de la card seguían en camino USD (200.110/200.106 vs 200.000 reales). Fix: `getCycleDisplayCurrency()` real en los 3 guards de `agrociclos.js`; moneda null del movimiento hereda la del ciclo (`agroOperationalCycles.js`); bridge expone `window._agroMergedOperationalNativeByCrop`. Detalle completo y tabla de verdad: final del archivo archivado (sesión 2026-09-17 II).
- **ANEXO 24 — retiro de Mi Carrito**: ejecutado completo en working tree (build verde), **QA owner pendiente**. Módulo `agro-cart.js` archivado en `archive/legacy-js/`; rutas legacy `#view=carrito`/`#view=operational-cart` coercen al hub Granja vía `SHELL_GATE_ROUTES`; tablas Supabase `agro_cart`/`agro_cart_items` NO se tocaron (datos del owner intactos en remoto). Ver sesión 2026-09-17 (III).

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

- `10347911` (owner): ANEXO 23-b — getter real de moneda del ciclo, herencia de moneda, bridge nativo.
- Working tree 17-sep (sin commit): ANEXO 24 retiro de Mi Carrito (ver sesión 2026-09-17 III) — único pendiente de commit.
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

---

## Sesión 2026-09-17 (III) — ANEXO 24: retiro de Mi Carrito

Agente: GLM (ZCode). Autorización expresa del owner (chat nuevo): Mi Carrito se retira del producto por no uso; git NO ejecutado sin su palabra.

**Objetivo**: retirar Mi Carrito del árbol activo (código + docs canónicos), coercer rutas legacy al hub Granja sin ruido, archivar el módulo y cerrar documentalmente.

**Diagnóstico (Fase 0)**:
- Módulo `agro-cart.js` (2,300L): storage SOLO Supabase remoto (`agro_cart`, `agro_cart_items`; migraciones 20260608214500 y 20260825185053). Cero localStorage del carrito. CSS inyectado por JS (`injectCartStyles`) — no hay archivo CSS propio.
- Falso positivo documentado: `agro-cartera-viva` (Facturero de Clientes) contiene el prefijo `agro-cart` — NO es carrito.
- Consumidores: `agro.js` (dynamic import 14911, dedicated-view reparent, FIN_TAB_NAMES, syncCartCropsFn) y `agro-agenda.js` (link "Ir a Mi Carrito" + handler `open-cart-view`). Ningún otro módulo consume exports; sin puentes `window._agroCart`.
- Rutas legacy: `#view=carrito` y `#view=operational-cart` (VIEW_ALIASES). Favoritos: `normalizeFavoriteIds` (agro-shell-favorites.js) ya filtra ids sin entrada DOM y lo persiste → favorito huérfano se autolimpia, sin cambios de código.
- Hallazgo hub desktop: "Mi Planificación" contenía SOLO la card del carrito; Clima Agro vivía en "Sistema". Se movió la tile de Clima a "Mi Planificación" (espejo del mobile) para que la sección no quede vacía, según QA esperado del owner.

**Cambios realizados**:

| Archivo | Tipo | Cambio |
|---|---|---|
| `agro/agro-shell.js` | wiring | Retiro de 8 entradas (TAB_TO_VIEW, VIEW_TO_MOBILE_HUB, VIEW_ALIASES×2, VIEW_SUBNAV_CONFIG, VIEW_CONFIG, SHELL_VIEW_KEYWORDS, ternario 1561) + coerción legacy `carrito`/`operational-cart` → ruta granja en SHELL_GATE_ROUTES |
| `agro/index.html` | wiring | Cards hub desktop+mobile, header swap, helper PASO 2, botón tab, panel tab, sección dedicada retirados; tile Clima Agro movida a "Mi Planificación" (desktop) |
| `agro/agro.js` | wiring | syncCartCropsFn, bloque dedicated-view carrito, lazy-loader initCartTabLazy, FIN_TAB_NAMES 'carrito', initCarritoDedicatedView() retirados |
| `agro/agro-agenda.js` | wiring | Link "Ir a Mi Carrito" + handler open-cart-view retirados |
| `agro/agro-facturero-finca.css` | CSS | Bloques header swap y dedicated view de carrito retirados |
| `agro-cart.js` → `archive/legacy-js/agro-cart.js` | archivo | Movido (precedente Crypto); registrado en archive README y LEGACY_SURFACES.md |
| `MANIFIESTO_AGRO.md` | canon | §3.1, §4.9, §5.0, §5.3 sin mención; §4.5.3 = nota corta de retiro (sin renumerar) |
| `ADN-VISUAL-V12.0.md` | canon | §9: Mi Carrito fuera de la lista del hub |
| `AGENTS.md` | canon | §3.2: agro-cart.js fuera de la lista de módulos |
| `FICHA_TECNICA.md` | canon | §4.2: feature bullet, módulo y mención en agro-shell.js retirados |
| `ROADMAP_VISION_YAVLGOLD.md` | canon | §6 fila Recursos sin "carrito"; §8 ejemplo y §9 regla retirados (sujeto inexistente) |
| `docs-agro.html` | docs pública | Card caso de uso y mención en lista Granja retiradas |
| `public/llms.txt` | resumen | "carrito" fuera de la lista de features V1 |
| `agro/README.md` | readme | Bullet "Carrito de insumos" retirado |

**Resultado de build**: `pnpm build:gold` ✅ verde (agro-cart ya no genera chunk; guard+report-check+UTF-8 OK). Grep DoD sin filtro de extensión: solo archive, lápida §4.5.3, comentarios ANEXO 24 intencionales y docs históricos.

**QA sugerido (owner)**: hub Granja desktop/mobile sin card Mi Carrito y "Mi Planificación" con Clima Agro; marcador viejo `#view=carrito` aterriza en Granja sin error; tab financiera sin botón Carrito; favoritos sin errores (huérfano se autolimpia); agenda/planner sin link al carrito; consola limpia.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); drop/migración de tablas `agro_cart`/`agro_cart_items` (datos intactos en remoto; rescate de ítems solo con palabra del owner); `yavlgold-context.md` (snapshot histórico V10, detectado con 3 menciones — candidato a archivado en limpieza futura); resto del producto.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add -A
git commit -m "feat(agro): ANEXO 24 — retiro de Mi Carrito del producto (archivado modulo, coercion de rutas legacy a Granja, docs canonicas sin mencion)"
```
