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
- **ANEXO 25 S1 — extracción del Asistente IA del monolito**: commiteado por el owner como `a1274f84` (QA funcional GREEN 17-sep 20:40). Split D-IA-2: `agro-assistant.js` (core 1,167L) + `agro-assistant-ui.js` (render 426L) + `agro-assistant.css` (1,433L); `agro.js` 17.780→16.292; Edge Function intacta; claves localStorage idénticas. Ver sesión 2026-09-17 (IV).
- **ANEXO 26 — pulido visual del Asistente IA**: ejecutado completo en working tree (build verde), **QA owner pendiente**. CSS dividido (layout 863L + chat 619L), columna de conversación centrada con burbujas con aire, welcome con 3 chips §9.11 que envían al click, cooldown DENTRO del botón ("Enviar en Xs"), ortografía y aria corregidas. Cero cambio de datos/red/persistencia. Ver sesión 2026-09-17 (V).

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
- `a1274f84` (owner): ANEXO 25 S1 — extracción del Asistente IA (d5a9cccf = ANEXO 24).
- Working tree 17-sep (sin commit): ANEXO 26 pulido visual del Asistente (sesión V) — único pendiente de commit.
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

---

## Sesión 2026-09-17 (IV) — ANEXO 25 S1: extracción del Asistente IA

Agente: GLM (ZCode). Fase 0 (trazado A–H, solo lectura) + S1 (extracción con split D-IA-2 del owner). Git NO ejecutado.

**Objetivo**: extraer el bloque IA de `agro.js:14952–16465` (1.514L) a módulos propios sin cambio de comportamiento, sin tocar Edge Function ni shell.

**Diagnóstico base**: el trazado A–H completo está en la conversación de Fase 0 (verificado por el owner en este ANEXO). Puntos clave ejecutados: `randomBase36` tenía 1 uso fuera del bloque (initAccordions) → monolito conserva copia; keyframes `breathe`/`metallicShift` compartidas con otras superficies (agro.css:3707/8647) → se quedan en agro.css; `.assistant-trigger` es CSS muerto (0 referencias) → movido verbatim, declarado; región CSS 10819–12224 pura (solo asistente).

**Cambios realizados**:

| Archivo | Tipo | Cambio |
|---|---|---|
| `agro/agro-assistant.js` | nuevo (1.167L) | Núcleo: constantes, estado, persistencia+migración legacy, cola anti-429/backoff/cooldown, invoke, contexto (4 puentes + deps), errores, timers, init con guard. Importa supabase-config + ui (dirección única) |
| `agro/agro-assistant-ui.js` | nuevo (426L) | Render puro sin estado ni imports: thread list, mensajes+code-fences+Copiar, history+empty, panel contexto, modal export JSON, toast, autoResizeInput (0 usos fuera → viajó) |
| `agro/agro-assistant.css` | nuevo (1.433L) | Región 10819–12224 + trigger legacy 1349–1374, verbatim. `fadeInUp`/`borderShimmer`/`typingPulse` viajan; `breathe`/`metallicShift` se quedan en agro.css (compartidas, con comentario) |
| `agro/agro.css` | −1.437L | Región del asistente retirada; 13.485→12.068 |
| `agro/agro.js` | −1.524/+38L | Bloque 14952–16465 borrado (17.780→16.292). Quedan: banner explicativo, copia de `randomBase36`, `window._agroAssistantDeps = { getCrops, getCropMetrics, readActiveTab }` (lectura perezosa) y `window.initAgroAssistantSurface?.()` en initAgro |
| `agro/index.html` | +10L | `<link>` de agro-assistant.css + import dinámico de agro-assistant.js con init idempotente (guard `document.__agroAssistantBound`) |

**Tabla de no-cambio (confirmada una por una)**:
1. Edge Function `supabase/functions/agro-assistant`: `git diff supabase/` = 0 líneas ✓ (contrato, tools, versión v10.0.0-agro-agent y header intactos).
2. Claves localStorage idénticas (grep: las 5 incluida legacy `_HISTORY_V1`); `migrateLegacyHistoryIfNeeded` trasladada verbatim → threads del owner sobreviven ✓.
3. MANIFIESTO §4.11 sin tocar (cero docs en S1); `getAssistantContext` verbatim (mismos 4 puentes, mismo payload) → privacidad sin cambio de comportamiento ✓.
4. Ruta `#view=asistente` y sus 4 entradas intactas: shell sin cambios, sección HTML 3599–3823 intacta, solo se agregó link+import ✓.
5. Cola anti-429/backoff/cooldown: trasladada verbatim (peek/shift-on-success, 60s→300s, cooldown 10s, network-keep-in-queue) ✓.
6. ADN: CSS movido verbatim (mismos tokens, bloque `prefers-reduced-motion` conservado, cero lenguaje visual nuevo) ✓.
7. Sin circulares: ui.js sin imports; assistant.js importa solo supabase-config+ui. `window` nuevos: `_agroAssistantDeps` (puente de deps previsto) e `initAgroAssistantSurface` (bridge de init previsto); `openAgroAssistantInline` preexistente ✓.

**Resultado de build**: `pnpm build:gold` ✅ verde (2.31s; chunk nuevo `agro-assistant-BLrcVRmT.js` code-splitted; guard+report-check+llms+UTF-8 OK).

**Verificación estática**: grep de lógica assistant en agro.js → solo banner+deps+init (líneas 14950-14952, 15416-15429); listeners singleton con guard único; timers con `stopAssistantTimers` al cerrar vía botón (comportamiento previo conservado: salida por navegación del shell deja que el interval se auto-limpie al quedar idle, como antes de la extracción).

**Declaraciones honestas (lo NO trazado / divergencias menores)**:
- QA NO ejecutado (ley §5): verificación 100% estática.
- `context.stats.crops_count` ahora siempre presente (0 si el puente de deps aún no existe) vs antes omitido si cropsCache no era array — en práctica idéntico (cropsCache siempre array; deps se exponen en initAgro antes de cualquier uso real).
- `assistantButtonTimer` (variable muerta detectada en Fase 0) quedó fuera del módulo, como ordenó el ANEXO.
- `.assistant-trigger` (CSS muerto, 0 referencias HTML/JS) movido verbatim — candidato a limpieza futura con palabra del owner.
- Diferimiento del init: los bindings ahora se conectan al resolverse el import dinámico (microsegundos después de initAgro) en vez de sincrónicamente; irrelevante para el usuario (elementos estáticos en DOM).

**QA sugerido (owner)**: abrir desde Bloque 0 del Dashboard y desde hub Memoria (desktop y mobile); threads viejos visibles tras migración; enviar mensaje real (cooldown 10s visible en el botón); panel de contexto con datos; modal export JSON descarga; Escape cierra drawer/modales; consola limpia; `#view=asistente` directo funciona.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); Edge Function; shell; MANIFIESTO/canons; cambios de comportamiento de privacidad (D-IA-1 default); eliminación del CSS muerto `.assistant-trigger`.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add -A
git commit -m "refactor(agro): ANEXO 25 S1 — extraccion del Asistente IA del monolito a agro-assistant.js + ui + css (17.780->16.292, sin cambio de comportamiento)"
```

---

## Sesión 2026-09-17 (V) — ANEXO 26: pulido visual del Asistente IA

Agente: GLM (ZCode). Front SOLO visual/UX de #view=asistente; cero cambio de comportamiento de datos/red/persistencia. Git NO ejecutado. Previo: owner commiteó `d5a9cccf` (ANEXO 24) y `a1274f84` (ANEXO 25 S1, QA funcional GREEN 20:40).

**Objetivo**: resolver la queja del owner ("se ve aplastado, no es una experiencia agradable") bajo canon ADN V12, con split del CSS (§11.X).

**Cambios realizados**:

| Archivo | Tipo | Cambio |
|---|---|---|
| `agro-assistant.css` | re-escrito (1.433→863L) | Layout/sidebar/header/contexto/modal. Header con separador borderShimmer (§19.5, 3s, reduced-motion estático); "+ Nueva conversación" como btn-gold canon (sin gradiente/metallicShift); thread cards Inter 500 + fecha --text-muted + borde dorado en activo; focus rings §16 |
| `agro-assistant-chat.css` | nuevo (619L) | Columna de conversación 820px centrada; gap space-4; burbujas 78%/radius-md/space-4 (user: tinte --gold-2 + --border-gold; asistente: card-canon §7); meta hora --text-xs --text-muted por mensaje; pre con --bg-1 + Copiar como chip; welcome card centrada; cooldown chip oculto; toast; reduced-motion |
| `agro-assistant-ui.js` | render | Empty "Aún no hay conversaciones."; confirm/title con tilde; hora de cada mensaje (dato ts existente, render-only); "En línea" |
| `agro-assistant.js` | **declarado** (12+/10−) | Solo `updateAssistantCooldownUI`: countdown DENTRO del botón ("Enviar en Xs" / "IA en Xs" / "En cola" / "Enviando" / "Enviar"); #assistant-cooldown se conserva oculto (compat JS). + 4 strings de copy con tilde ('En línea', 'Conversación eliminada' ×2, confirm). Cero lógica de datos/red tocada |
| `index.html` | copy/aria | 3 chips de sugerencia = preguntas canónicas literales de MANIFIESTO §9.11 (envían al click vía delegación existente); aria-label/title humano en los 3 iconos ("Panel de contexto", "Exportar conversación", "Volver"); ortografía con tildes (badge, botones, guía, empties, modal); hint "espera 10s" (= cooldown real); `<link>` de agro-assistant-chat.css |

**Cumplimiento de la especificación (1-8)**: 1) columna 820px + burbujas especificadas ✓; 2) welcome card + 3 chips §9.11 click-to-send (respetan cooldown; sin datos mock) ✓; 3) btn-gold mediano 40px, historial con scroll propio, empty honesto, footer discreto ✓; 4) input-canon (borde neutral reposo, ring dorado solo focus), cooldown integrado en botón, "Espera Xs" huérfano eliminado (nodo oculto por compat) ✓; 5) header PJS + borderShimmer §19.5, badge EN LÍNEA, 3 iconos con aria+title ✓; 6) fadeInUp una vez, transiciones 120-180ms, fallbacks reduced-motion en ambos CSS ✓; 7) ≤768 sidebar tira superior + compositor sticky + burbujas 92%; ≤480 chips en columna; touch ≥44px ✓; 8) split 863L+619L (bajo umbrales §11.X), cero hex puro (verificado por grep; solo var(--token, fallback) del idioma del repo), cero inline styles nuevos ✓.

**Declaraciones honestas**:
- Selectores muertos retirados en el re-diseño: familia `.ast-header`/`.ast-header-agent`/`.ast-header-avatar`/`.ast-header-info`/`.ast-header-left`/`.ast-header-right` (header antiguo inexistente en HTML; solo `.ast-header-icon`/`.ast-header-status` están vivos y se conservaron) y el bloque `@supports` con metallicShift del título (animación retirada del canon §4).
- Animaciones `breathe` (welcome-icon) y `metallicShift` (btn-new/send-btn) eliminadas de ESTA superficie (retiradas del canon §4; eran gradientes animados). `borderShimmer` se conserva como excepción §19.5 en el header.
- Clave `conversacion` del JSON exportado SIN tilde (contrato de datos del export; cambiarla rompería el formato).
- `AGRO_ASSISTANT_DEFAULT_TITLE` ('Nueva conversacion') intacto en core: es el título persistido por defecto de threads nuevos (dato, no copy visible permanente); los títulos se auto-actualizan con el primer mensaje.
- QA NO ejecutado (ley §5).

**Resultado de build**: `pnpm build:gold` ✅ verde (2.42s; guard+report-check+llms+UTF-8 OK). Verificación estática: 0 hex puros, reduced-motion en ambos CSS, 3 aria-labels correctos, ortografía sin residuos visibles.

**QA sugerido (owner)**: desktop y mobile; thread vacío muestra bienvenida con 3 chips que envían al click; cooldown visible dentro del botón ("Enviar en 10s"); burbujas con aire (columna centrada, meta hora); historial scrolleable; export JSON; panel de contexto; Escape; consola limpia; reduced-motion sin animaciones.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); Edge Function; shell; cambios de comportamiento (threads, migración legacy, cola anti-429, cooldown 10s, export, ruta); MANIFIESTO/canons; `.assistant-trigger` legacy (sigue preservado).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add -A
git commit -m "style(agro): ANEXO 26 — pulido visual del Asistente IA (split css layout+chat, burbujas card-canon, chips §9.11, cooldown en botón, aria+ortografía)"
```
