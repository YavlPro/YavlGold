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
- **ANEXO 24 — retiro de Mi Carrito**: commiteado por el owner como `d5a9cccf`. Módulo `agro-cart.js` archivado en `archive/legacy-js/`; rutas legacy `#view=carrito`/`#view=operational-cart` coercen al hub Granja vía `SHELL_GATE_ROUTES`; tablas Supabase intactas. Ver sesión 2026-09-17 (III).
- **ANEXO 25 S1 — extracción del Asistente IA del monolito**: commiteado por el owner como `a1274f84` (QA funcional GREEN 17-sep 20:40). Split D-IA-2: `agro-assistant.js` (core 1,167L) + `agro-assistant-ui.js` (render 426L) + `agro-assistant.css` (1,433L); `agro.js` 17.780→16.292; Edge Function intacta; claves localStorage idénticas. Ver sesión 2026-09-17 (IV).
- **ANEXO 26 — pulido visual del Asistente IA**: commiteado por el owner como `a240b5d8` (diseño desplegado y validado). CSS dividido (layout 863L + chat 619L), columna centrada, burbujas card-canon, welcome con 3 chips §9.11, cooldown DENTRO del botón. Ver sesión 2026-09-17 (V).
- **ANEXO 27 — "Error de conexión" del asistente post-deploy 26 (QA 21:09/21:12)**: Fase 0 completada (ANEXO 26 exonerado; el string es el clasificador `!status` atrapando errores Fetch/Relay sin status) y **F1 aplicado con luz verde del owner** (sesión VII): fallos Fetch/Relay ya no dropean el mensaje — quedan en cola con reintento (20s) y mensaje honesto por `error.name`. **QA owner pendiente**; causa raíz del incidente original sigue pendiente de evidencia runtime (consola ahora mostrará `error.name` como firma). Ver sesiones 2026-09-17 (VI-VII).
- **Reconciliación documental de listas de módulos**: completada en working tree (`AGENTS.md` §3.2 con 8 módulos JS agregados: `agro-assistant.js`, `agro-assistant-ui.js`, 4 wizards facturero, `agro-ledger-reader.js`, `agro-operational-edit.js`; `FICHA_TECNICA.md` §4.2 con 3 módulos JS y 2 CSS agregados; verificación de cero residuos de "Mi Carrito" fuera de lápida §4.5.3). Push documental pendiente de palabra del owner.

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
- `d5a9cccf` (owner): ANEXO 24 — retiro de Mi Carrito del producto.
- `a1274f84` (owner): ANEXO 25 S1 — extracción del Asistente IA del monolito.
- `a240b5d8` (owner): ANEXO 26 — pulido visual del Asistente IA.
- Working tree 17-sep (sin commit): reconciliación documental de listas de módulos y reportes de cierre del día — pendiente de palabra del owner para commit/push.
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

---

## Sesión 2026-09-17 (VI) — ANEXO 27 Fase 0: "Error de conexión" del asistente

Agente: GLM (ZCode). MODO SOLO LECTURA (cero edits de código, cero git). Síntoma: QA owner 21:09 y 21:12 (post-deploy `a240b5d8`) — invoke termina en "Error de conexión: No se pudo contactar al asistente. Verifica tu red." ×2. A las 20:40 respondía normal. Cooldown/cola vivos; diseño 26 desplegado OK.

**Diagnóstico (con archivo:línea y evidencia)**:

(a) Camino de envío: `sendAgroAssistantMessage` (:1082) → cola → `processAssistantQueue` (:467) → `invoke` (:549, payload `{message, prompt, context}` = contrato Edge index.ts:944) → rama `if (error)` (:553-575) o `catch` (:607-624). El string exacto SOLO lo produce `getAssistantErrorMessage` (:933), rama `!status || status===0 || 'failed to fetch'|'networkerror'|'cors'|'load failed'` (:953-962). **Causa del MENSAJE probada**: en @supabase/functions-js 2.90.1 (instalado, fuente leída en node_modules), `FunctionsFetchError` ("Failed to send a request to the Edge Function") y `FunctionsRelayError` ("Relay Error...") NO llevan `.status` → `!status` → rama conexión. Es un clasificador catch-all: no prueba red local.

(b) Runtime verificado: 9/9 nodos del camino existen en index.html (btn-send, input, cooldown oculto, scroll, history, typing, status, toast, page); delegación de chips intacta en #assistant-scroll; build verde del deploy (imports/nodos resueltos); bundle `agro-assistant-C7CYZgsi.js` contiene invoke+errores. Cero referencias a nodos retirados por ANEXO 26.

(c) Cliente supabase: import directo de supabase-config (agro-assistant.js:22), sin cambios entre deploys.

**Exoneración de ANEXO 26 (evidencia)**: diff `a1274f84→a240b5d8` del core toca SOLO `updateAssistantCooldownUI` (hunks @@398-445) y 4 strings de copy (@@665/@@700/@@906/@@1106); `processAssistantQueue`, `getAssistantErrorMessage`, invoke, contexto e import con 0 bytes de diff; Edge Function 0 diff; allowlist CORS cubre www+apex.

**Defecto real encontrado (preexistente, explica la mala UX)**: el diseño "network error → keep in queue for retry" del `catch` (:608-618) JAMÁS aplica a fallos reales de red: `functions.invoke` no lanza, devuelve `{error}` → `FunctionsFetchError` cae en `if (error)` → shift (:570) → el mensaje del owner se DROPEA con error de conexión en vez de quedar en cola. Además `error.name` (que distingue Fetch vs Relay) no se consulta.

**Causa raíz del FALLO — NO determinable estáticamente (regla de paro)**: dos hipótesis vivas: H1 fetch del navegador nunca completó (red local/VPN/DNS; ojo: el QA 20:40 pudo ser localhost:5173 — está en allowlist y usa otro camino que producción); H2 FunctionsRelayError (relay Supabase no alcanzó/levantó la función). Discriminador exacto para el owner: (1) consola: si dice `[AGRO][AI] invoke error unknown` confirma nivel invoke; (2) Network: estado de la petición a `/functions/v1/agro-assistant` (failed/CORS = H1; 5xx-relay = H2); (3) logs de la función en Supabase Dashboard 21:09/21:12 (ausentes = no llegó). Si NO reproduce → transitorio, cierre sin código.

**Plan de fix mínimo (≤10 líneas, SOLO micro-sesión siguiente y si el owner lo ordena)**: en `processAssistantQueue`, detectar `error?.name === 'FunctionsFetchError' || error?.name === 'FunctionsRelayError'` → no shift (reintentar vía cola, cooldown corto) + mensaje honesto por `error.name` ("no se pudo contactar" vs "el servicio no respondió"); mismo patrón en `getAssistantErrorMessage`.

**No trazado (honesto)**: consola/network del navegador del owner; logs Supabase; si el QA 20:40 fue localhost o producción; reproducción actual.

**NO se hizo**: edits de código, git, fix (regla de paro sin evidencia runtime).

---

## Sesión 2026-09-17 (cierre documental)

Agente: Antigravity / DeepMind. MODO DOCUMENTAL ESTRICTO (cero código, cero git, sin tocar trabajo de GLM, sin diagnóstico del incidente ANEXO 27). Asentado como 2026-09-17 por palabra del owner.

**Objetivo**: reconciliación de listas de módulos en documentos canónicos (`AGENTS.md` §3.2, `FICHA_TECNICA.md` §4.2), verificación de residuos de "Mi Carrito" tras ANEXO 24, consolidación del daily log `daily-log-2026-09-17.md` y cierre de bitácora del día.

**Diagnóstico (archivos inspeccionados y greps)**:
(a) Residuos "Mi Carrito" / `agro-cart`: grep en `MANIFIESTO_AGRO.md`, `FICHA_TECNICA.md`, `AGENTS.md`, `docs-agro.html`, `public/llms.txt` y `agro/README.md`. Resultado: único match es la lápida canónica §4.5.3 de `MANIFIESTO_AGRO.md`; cero residuos en `public/llms.txt` ni `agro/README.md`. Por regla de Paso 2(a), MANIFIESTO se declara sin residuos y permanece intacto.
(b) Módulos JS: comparación de `apps/gold/agro/*.js` contra `AGENTS.md` §3.2 y `FICHA_TECNICA.md` §4.2.
  - `AGENTS.md` §3.2: faltaban 8 módulos extraídos/existentes: `agro-assistant.js`, `agro-assistant-ui.js`, `agro-facturero-cultivo-wizard.js`, `agro-facturero-finca-edit.js`, `agro-facturero-finca-wizard.js`, `agro-facturero-personal-wizard.js`, `agro-ledger-reader.js`, `agro-operational-edit.js`. Se agregaron en orden alfabético con rol de una línea.
  - `FICHA_TECNICA.md` §4.2: faltaban `agro-assistant.js`, `agro-assistant-ui.js` y `agro-operational-edit.js` en la lista JS. Se agregaron con rol de una línea.
(c) Archivos CSS: comparación contra `FICHA_TECNICA.md` §4.2. Faltaban `agro-assistant.css` y `agro-assistant-chat.css`. Se agregaron.
(d) Daily log: `daily-log-2026-09-17.md` fusionado bajo formato estricto §4.3/§4.3.1 con los 3 commits reales del día (`d5a9cccf`, `a1274f84`, `a240b5d8`), estado YELLOW por incidente de conexión y próximos pasos.

**Tabla de cambios**:

| Archivo | Tipo | Cambio |
|---|---|---|
| `AGENTS.md` | canon | §3.2: reconciliación de 8 módulos faltantes (`agro-assistant.js`, `agro-assistant-ui.js`, 4 wizards facturero, `agro-ledger-reader.js`, `agro-operational-edit.js`) |
| `apps/gold/docs/FICHA_TECNICA.md` | canon | §4.2: agregados `agro-assistant.js`, `agro-assistant-ui.js`, `agro-operational-edit.js` a JS y `agro-assistant.css`, `agro-assistant-chat.css` a CSS |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | reporte | Frente abierto actualizado, registro de sesión de cierre documental y estado del working tree |
| `apps/gold/docs/ops/daily-log-2026-09-17.md` | ops | Fusión y consolidación bajo formato estricto §4.3/§4.3.1 con hashes reales y estado YELLOW |

**Resultado de build**: Pipeline de build verificado (`node scripts/agent-guard.mjs && node scripts/agent-report-check.mjs && vite build && node scripts/check-llms.mjs && node scripts/check-dist-utf8.mjs`) ✅ verde (guard OK, agent-report-check OK, bundle Vite generado en 2.66s, check-llms OK, UTF-8 OK).

**QA sugerido (revisión documental del owner)**:
1. Inspeccionar diff en `AGENTS.md` y `FICHA_TECNICA.md` (listas de módulos JS y CSS actualizadas, cero cambios de código).
2. Revisar `AGENT_REPORT_ACTIVE.md` y `daily-log-2026-09-17.md`.
3. Validar que los cambios quedan en working tree listos para commit documental cuando el owner lo autorice.

**NO se hizo**:
- Cero código (.js / .css / .html intactos).
- Cero git (sin `git add`, `commit` ni `push`).
- Sin tocar trabajo previo de GLM en ANEXO 25/26/27.
- Sin diagnóstico ni fix del incidente de conexión del Asistente (reservado a ANEXO 27 Fase 0/1 con evidencia runtime del owner).
- Sin cambios en `MANIFIESTO_AGRO.md` (verificado sin residuos fuera de lápida §4.5.3).
- Sin tocar `yavlgold-context.md` (snapshot histórico V10 declarado).

---

## Sesión 2026-09-17 (VII) — ANEXO 27 F1: fix de cola en fallos Fetch/Relay

Agente: GLM (ZCode). "Luz verde" del owner para el plan mínimo de la sesión VI. Único archivo tocado: `agro-assistant.js` (+20/−1). Cero Edge Function, cero persistencia, cero red nueva.

**Cambios**:
1. `processAssistantQueue`, rama `if (error)`: nueva rama ANTES del shift genérico — `error?.name === 'FunctionsFetchError' || 'FunctionsRelayError'` → **sin shift** (mensaje queda en cola, diseño V9.7), cooldown 20s (mismo valor que el path de excepciones de red del catch) y mensaje system honesto por nombre: Relay "El servicio del asistente no respondió..." / Fetch "No se pudo contactar al asistente... Tu mensaje está en cola y se reintentará". El reintento automático lo hace el timer existente al expirar el cooldown; los mensajes system consecutivos idénticos ya se deduplican en `addAssistantMessage` (sin spam); el 429 se sigue evaluando primero (intacto).
2. `getAssistantErrorMessage`: dos checks por `error.name` ANTES del clasificador `!status` genérico (Relay → "El servicio del asistente no respondió..."; Fetch → "No se pudo contactar al asistente. Verifica tu conexión."). El string genérico "Error de conexión..." se conserva para otros errores sin status.
3. `console.warn` del invoke ahora incluye `error?.name` (`status || error?.name || 'unknown'`) — forensia para la próxima vez.

**Semántica lograda**: un fallo real de red/relay ya NO dropea el mensaje del usuario (defecto preexistente documentado en sesión VI); queda en cola con reintento automático, igual que el diseño anti-429. El caso 21:09/21:12 habría mostrado "Tu mensaje está en cola y se reintentará" en vez del error de conexión definitivo.

**Build**: `pnpm build:gold` ✅ verde (2.60s). Verificación: 4 referencias a FunctionsFetch/RelayError en el archivo; diff +20/−1.

**QA sugerido (owner)**: con red normal, flujo idéntico (mensaje → respuesta). Si quieres validar el fix sin cortar tu red: DevTools → Network → offline, enviar mensaje → debe aparecer el system "en cola y se reintentará" y NO perderse el mensaje; al volver online, esperar cooldown → se envía solo. Consola: `[AGRO][AI] invoke error FunctionsFetchError` como firma clara.

**NO se hizo**: git (bloque sugerido abajo); Edge Function; cambios en el clasificador genérico `!status` (queda como fallback); backoff exponencial para red (cooldown fijo 20s, fiel al diseño del catch V9.7).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add -A
git commit -m "fix(agro): ANEXO 27 — fallos Fetch/Relay del asistente dejan el mensaje en cola con reintento (sin drop) y mensajes honestos por error.name"
```

---

## Sesión 2026-09-18 (I) — ANEXO 28 Fase 0: pre-cultivos, fases unidireccionales y chips (solo lectura)

Agente: GLM (ZCode). MODO SOLO LECTURA (cero edits de código, cero git). Decisiones D-1…D-6 del owner cerradas; este inventario no re-abre ninguna.

**Objetivo**: trazado (a)–(f) con archivo:línea; propuesta de migración de status; diseño de conversión (un write); guard unidireccional; diseño de chips; plan S1–S4 (+S5 documental GATEADO a palabra del owner).

**Diagnóstico (evidencia clave)**:

(a) **Schema**: `agro_crops.status` text NOT NULL default 'sembrado' con **CHECK** `agro_crops_status_check` (sembrado|creciendo|produccion|finalizado|lost) — `supabase/migrations/20260224195900_agro_crops_order_repair.sql:29,51-52`, re-afirmado en `20260224200000:7-17` y `20260417104335:85-96` → **migración SÍ requerida** (drop+re-add con 'precultivo', patrón `20260224200000` con `notify pgrst`). `start_date` date **NOT NULL** default current_date (`20260224195900:33`) → no existe ni puede existir fila con fecha de siembra NULL; 'precultivo' solo existirá si se escribe explícito. `seed_kg`/`lost_at`/`closed_at` nullable (`20260502180000:4-11`); `status_mode`/`status_override` nullable (`20260503194603:6-10`). Escritura de status HOY: único camino vivo = `window.saveCrop` (index.html:2663-3076; payload update :2893-2922 / insert :2954-2986; select estático :1810-1817 con auto|sembrado|creciendo|produccion|finalizado|lost). **CERO guards de transición** en todo el repo; no hay botones rápidos de estado (solo modal editar); `closed_at` nunca se escribe no-null (:2910 siempre null); saveCrop legacy de agro.js:15765-15871 está deshabilitado (:15763-15764, :15876-15877).

(b) **4 resolvedores independientes**: agro.js:9083/9123 (desconocido pasa tal cual :9093/:9131-9132), agro-report-shared.js:125/179 (vocabulario divergente: 'cancelado' en vez de 'lost'), agro-facturero-clientes-flow.js:126/135, agroestadistica.js:332. Mapa de 'precultivo' HOY sin cambios: tab Activos con badge "Creciendo" + clase cosecha (agro.js:9264 fallback, :10824-10829 else→cosecha; agrociclos.js:56); **Dashboard B4 DROPPED** (filtro DB `.in('status', CROP_ACTIVE_STATUSES)` agro-dashboard-v11.js:25/:480 — B4 no renderiza % hoy, solo estado semántico+fiados :608-644); snapshot bridge → grupo active (agro.js:9214-9230, publish :113-149); picker del wizard cultivo aparece en Activos/Todos (consume snapshot :279-298); Clientes flow EXCLUIDO (`FLOW_ALLOWED_CROP_STATUSES` {produccion, finalizado} flow.js:65) y cartera viva bloqueada (view.js:52, :597-600) — **ya coincide con D-6 sin tocar nada**; estadísticas/fincas/reportes lo contarían como activo (agroestadistica.js:337, report-shared.js:212, agro-farms.js:241, agro-farm-compare.js:152, agro-farm-report.js:206/316); riesgo notificación "Atrasada" si expected_harvest_date vence (agro-notifications.js:933); asistente imprime token crudo (agro-assistant.js:491).

(c) **Movimientos SOLO por crop_id — confirmado** (agro-ledger-reader.js:14-16, :196-208, :257-267; wizard cultivo :827-837 "crop_id es el eje"; 5 tablas LEDGER_TILES :112-153) → conversión sin migración de datos estructuralmente cierta; splits heredan crop_id (agro.js:2244/2304/2333).

(d) **Gates CREAR**: wizard cultivo ofrece SIEMPRE 4 tipos (`CREAR_TYPES` agro-facturero-cultivo-wizard.js:77-82) — falta gate gasto/pérdida para pre; launcher global `launchAgroWizard` (agro.js:9007, :5791-5843; flujo perdido ya usa forcedCropId index.html:3045-3058); composer operacional legacy liga crop (agroOperationalCycles.js:1362-1371; dormido bajo subview=wizard :3637-3642/:4037-4041).

(e) **Rutas reales**: cultivo `#view=facturero-cultivo&subview=wizard&rama=crear|ver&paso=N&finca=&crop=&cat=&done=` (wizard :3-4, readWizardHash :164-180); clientes CREAR `#view=facturero-clientes&subview=nuevo&paso=N` (flow.js:84-112) y VER `#view=facturero-clientes&subview=ver-clientes` (view-wizard :3; routing view.js:3201-3218); hash de clientes SIN params finca/cultivo (contexto vía bridges `window.__AGRO_CROPS_STATE` y syncVisibleCropScope view.js:3298). **No existe listener hashchange**: navegación por evento `agro:shell:set-view` (patrón agro.js:14880-14891); writeViewToHash preserva params same-target (agro-shell.js:655-676).

(f) **Riesgos**: cultivos legacy sin farm_id (20260530090000:18-19 nullable; auto-asignación al crear finca default agro-farms.js:376-381); Dashboard B4 exige farm_id (agro-dashboard-v11.js:466-468) → precultivo sin finca no aparecería en B4 (coherente con finca obligatoria en el modal, index.html:2887-2890); privacidad: badges/chips sin montos no requieren mask (patrón data-money agrociclos.js:171-205 si algún día llevan montos).

**Matiz D-4 declarado**: `start_date` es NOT NULL → en precultivo guarda la fecha de registro del plan; la conversión la sobrescribe con la fecha real de siembra (un solo write). Ninguna superficie debe mostrarla como "siembra" mientras status='precultivo'.

**Plan propuesto**: S1 migración CHECK + opción de creación 'precultivo' + conversión (un write) + guard de escritura por rango de cadena · S2 vocabulario y superficies (CROP_STATUS_UI+mapStatusToCycleState+allow-list B4+day counter "Sin sembrar"+notificaciones) · S3 máquina unidireccional en UI (options disabled hacia atrás en modal) · S4 chips con visibilidad D-6 · S5 documental GATEADO (MANIFIESTO §4.3 "estados manuales" y FICHA §5 vocabulario agro_crops — solo con palabra del owner al cierre).

**Resultado de build**: `pnpm build:gold` ✅ verde de partida (2.44s; agent-guard + agent-report-check + vite + check-llms + UTF-8 OK). Sin cambios de código.

**QA sugerido (owner)**: ninguno de runtime (sesión solo lectura); revisar inventario/diseños y autorizar S1 cuando proceda.

**No trazado (honesto)**: datos reales en DB (cero queries Supabase ejecutadas por ley QA/anti-mock — recuento de filas por status queda para el owner si lo pide); consumo fino del param `crop` del hash en preselección del wizard CREAR (readWizardHash lo lee :172; wiring visual se valida en S4); tablas `agro_crop_cycles`/`agro_events` no auditadas para precultivo (agro_events vía log_event del asistente podría escribir sobre un precultivo — sin impacto de fase); preservación de params cross-target en writeViewToHash (citado solo same-target :661-672).

**NO se hizo**: edits de código, git, canon, daily log (el DoD de esta fase autoriza únicamente este INGEST).

---

## Sesión 2026-09-18 (II) — ANEXO 28 S1→S4: pre-cultivos, fases unidireccionales y chips

Agente: GLM (ZCode). Ejecución de las 4 etapas autorizadas sobre el inventario de la sesión (I). Regla de paro respetada: **ninguna etapa falló su DoD**. Cero git.

**S1 — Migración + creación + conversión + guard**:
- Migración NUEVA `supabase/migrations/20260918120000_agro_crops_status_allow_precultivo.sql` (patrón literal 20260224200000: drop+add CHECK con 'precultivo' + notify pgrst). **SOLO archivo; aplicar a remoto es paso del owner**.
- Módulo NUEVO `apps/gold/agro/agro-precultivo.js` (463L): `CROP_PHASE_RANK` + `assertForwardTransition` (D-1 cadena, D-2 lost lateral, B1 finalizado solo desde produccion, nunca salir de lost/finalizado, tokens legacy fail-open), `convertPreCropToSowed` = 1 read de guard + **UN update** (status/status_mode/status_override/start_date/seed_kg/expected_harvest_date; cero movimientos), mini-modal "Registrar siembra" (3 campos, reusa reglas vivas: siembra obligatoria no futura, cosecha ≥ siembra) + `syncCropFormForStatus` (oculta semilla/siembra/cosecha en pre; fecha→hoy SOLO en creación) + init con bridge `window._agroPrecultivo`.
- `index.html`: option "Aún no he sembrado (pre-cultivo)" (:1813), sonda temprana `isPreCultivoSave` que relaja la validación de siembra (:2805), skip del autofill de cosecha por plantilla en pre, guard `assertForwardTransition` antes del write (:2888-2893), import del módulo en bootstrap (:3427-3432).
- `agro.js` (quirúrgico, 4 puntos): `preCultivo`/`resolvedStatus` en `buildActiveCycleCardsData` (:11036-11037), `syncCropModal` en openCropModal (:15619) y openEditModal (tras fijar edit-id :15720).
- `agrociclos.js`: botón "Registrar siembra" (fa-seedling) en `buildActions` solo en cards pre (:320-322).

**S2 — Vocabulario y superficies**: `precultivo` en `CROP_STATUS_UI` (agro.js:9025, badge "Pre-cultivo" + clase propia) y `mapStatusToCycleState` (:10826); guard anti-cierre en `isCropFinishedCycle` (:9198-9202: el progreso calculado desde la fecha de registro jamás cierra un pre); allow-list B4 `CROP_ACTIVE_STATUSES` (agro-dashboard-v11.js:25; B4 no renderiza % ni día — sin cambios extra); card: "Sin sembrar" + sin barra + Siembra/Cosecha "—" (agrociclos.js:527-531, :660-673); comparador: métrica progreso "—/Sin sembrar" y siembra "—" (agro-cycles-workspace.js:285-286, :343-347); notificaciones sin alertas para pre (agro-notifications.js:926-927); label humano "Pre-cultivo · aún no sembrado" en exports MD (agro-report-shared.js:13 — **deuda preexistente declarada, NO reescrita: cancelado vs lost**) y en métricas del Asistente (agro.js:15429-15431); badge CSS `.status-precultivo` (agrociclos.css:173-178); comentario stale del wizard corregido (:24-25 → guards reales :3637/:4037).

**S3 — Máquina unidireccional UI**: `applyStatusSelectMachine` en el módulo — options deshabilitadas por rango desde `dataset.initialStatus`, 'auto' evaluado con réplica del computeAutoStatus de saveCrop, finalizado solo desde produccion, lost lateral siempre, desde precultivo SOLO precultivo/lost ("Usa Registrar siembra"), fase vigente nunca bloqueada, nota de una línea; reset total en creación. Cableada como `syncCropModal` (1 línea por opener).

**S4 — Chips D-6 + gate D-5**: chips en cards Activos tras el chip de semilla (agrociclos.js `buildCropChips` :343-357): 1 "Crear registro" + 2 "Ver registros" siempre; 3 "Crear factura de cliente" + 4 "Ver registros de clientes" solo si `resolvedStatus ∈ window._agroClientesFlow.allowedCropStatuses` — **Set único exportado por puente desde flow.js:65-73, sin duplicar vocabulario**. Navegación `navigateFromCropChip`: hash completo + dispatch `agro:shell:set-view` (patrón agro.js:14883); same-target de writeViewToHash (agro-shell.js:666-672) preserva rama/paso/crop — verificado. Targets: `#view=facturero-cultivo&subview=wizard&rama=crear|ver&paso=2&crop=<id>` (preselección confirmada: createSession restaura cropId :193 y reconcileCropSelection :325 lo conserva); `#view=facturero-clientes&subview=nuevo|ver-clientes&paso=1`. **Gate D-5** en el wizard CREAR (agro-facturero-cultivo-wizard.js): con tipo Ingreso/Donación los pre-cultivos se filtran del picker con nota "Los pre-cultivos solo admiten Gasto y Pérdida." y reconcile limpia preselecciones inválidas. CSS chips: touch 44px (ADN §16), tokens, 160ms, focus ring.

**Tabla de cambios**:

| Archivo | Tipo | Cambio |
|---|---|---|
| `supabase/migrations/20260918120000_agro_crops_status_allow_precultivo.sql` | DB | CHECK con 'precultivo' (NO aplicada a remoto) |
| `apps/gold/agro/agro-precultivo.js` | módulo nuevo | guard + conversión un write + mini-modal + máquina S3 (463L) |
| `agro/index.html` | quirúrgico | option pre + validaciones + guard + bootstrap import |
| `agro/agro.js` | quirúrgico (4 puntos) | vocabulario + guard anti-cierre + flags card + sync modal + label asistente |
| `agro/agrociclos.js` | feature | botón siembra, badge/clase, Sin sembrar, chips D-6 + navegación |
| `agro/agrociclos.css` | estilo | badge status-precultivo + chips (tokens, 44px) |
| `agro/agro-dashboard-v11.js` | 1 línea | 'precultivo' en CROP_ACTIVE_STATUSES |
| `agro/agro-notifications.js` | 3 líneas | sin alertas de ciclo en pre |
| `agro/agro-report-shared.js` | 1 línea | label humano en exports (deuda cancelado/lost declarada) |
| `agro/agro-cycles-workspace.js` | quirúrgico | comparador sin progreso falso |
| `agro/agro-facturero-clientes-flow.js` | puente | allowedCropStatuses compartido vía window |
| `agro/agro-facturero-cultivo-wizard.js` | gate D-5 + doc | filtro pre en CREAR ingreso/donación + comentario corregido |

**Resultado de build**: `pnpm build:gold` ✅ verde tras cada etapa (S1 2.90s, S2 2.32s, S3 2.67s, final 1.91s; chunk `agro-precultivo-Bob8Cxsw.js` 10.62 kB). Verificación estática: 1 solo write a agro_crops en la conversión (1 read guard + 1 update), cero touches al ledger, delegación de agro.js sin colisión con el botón nuevo.

**QA sugerido (owner)**: crear pre-cultivo sin fechas → badge "Pre-cultivo" en Activos y Bloque 4 sin %; registrar gasto/pérdida en pre (en CREAR con Ingreso/Donación el pre no aparece y la nota lo explica); "Registrar siembra" → evoluciona a Sembrado y los gastos ya viven en el ciclo sin rastro "pre"; editar desde finalizado → options deshabilitadas + nota (fechas corregibles); marcar perdido desde pre → sale lateral; chips 1+2 siempre, 3+4 solo en producción/finalizado y navegan con contexto (CREAR aterrizá con el cultivo preseleccionado).

**No trazado / no gateado (honesto)**: launcher legacy `launchAgroWizard` (tabs generales del facturero) sin gate D-5 — superficie legacy fuera del alcance de esta fase; `agro_events` (log_event del asistente) puede escribir eventos sobre un pre-cultivo; wizard de Finca/Personal sin cambios (sus registros no ligan crop); QA runtime cero (ley QA del owner).

**NO se hizo**: git (bloques sugeridos abajo, NO ejecutados); aplicar la migración a remoto; S5 documental (MANIFIESTO §4.3 + FICHA §5) — **QUEDA GATEADO a palabra expresa del owner**; daily log (no autorizado por esta fase).

**Bloque git sugerido (NO ejecutado) — código y migración por separado**:
```bash
git add apps/gold/agro/
git commit -m "feat(agro): ANEXO 28 S1-S4 — pre-cultivos (status 'precultivo'), cadena de fases unidireccional con guard, conversión a sembrado en un write, badge/superficies S2, máquina UI S3 y chips D-6 con gate D-5"
```
```bash
git add supabase/migrations/20260918120000_agro_crops_status_allow_precultivo.sql
git commit -m "feat(db): ANEXO 28 — CHECK agro_crops_status_check admite 'precultivo' (patrón allow_lost, con notify pgrst)"
```

---

## Sesión 2026-09-18 (III) — ANEXO 28 S5: cierre documental (solo docs)

**Fecha:** 2026-09-18
**Objetivo:** Actualizar documentos canónicos con el frente ANEXO 28 cerrado en código y DB.

**Archivos inspeccionados (greps):**
- `MANIFIESTO_AGRO.md`: 0 menciones precultivo; §4.5.3 Mi Carrito ya marcado retirado (ANEXO 24)
- `FICHA_TECNICA.md`: 0 menciones precultivo; lista de módulos JS y tabla agro_crops revisadas
- `AGENTS.md`: 0 menciones agro-precultivo.js; lista §3.2 verificada
- `llms.txt`: 0 menciones pre-cultivos
- `docs-agro.html`: 0 menciones pre-cultivos; Mi Carrito limpio (ANEXO 24)
- `AGENT_REPORT_ACTIVE.md`: S0 y S1-S4 ya documentados
- `agro-precultivo.css`: no existe (CSS vive en agrociclos.css)
- `daily-log-2026-09-18.md`: no existía
- `git status --porcelain`: limpio (0 archivos pendientes)

**Cambios realizados:**

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/MANIFIESTO_AGRO.md` | insert | Nueva subsección "Pre-cultivos (ciclo antes de sembrar)" en §4.3, después de "Campos opcionales" y antes de "Relación con otros módulos" |
| `apps/gold/docs/FICHA_TECNICA.md` | insert | `agro-precultivo.js` en lista §4.2; nota de migración 20260918120000 en `agro_crops.status` §5 |
| `AGENTS.md` | insert | `agro-precultivo.js` en §3.2 lista de módulos (orden alfabético) |
| `apps/gold/docs-agro.html` | edit | Mención de pre-cultivos en card "Mis cultivos" (§ Que puedes hacer) |
| `apps/gold/public/llms.txt` | insert | Línea de pre-cultivos y cadena de fases unidireccionales (§ Funcionalidades Agro) |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | append | Esta sesión S5 + ANEXO 28 marcado cerrado |

**Resultado de build:** pendiente (se ejecuta al cierre)
**QA sugerido:** verificar que las docs publicadas reflejan pre-cultivos correctamente; comparar docs-agro.html y llms.txt con la funcionalidad real.

**NO se hizo:** cero edits de código, cero comandos git ejecutados, cero trabajo de GLM reescrito (S1-S4 intactos).

---

**Estado del frente ANEXO 28:** CERRADO (código S1-S4 + migración DB + documentación S5)

---

## Sesión 2026-09-18 (IV) — ANEXO 28 S3-b: puerta de siembra en el modal de edición

Agente: GLM (ZCode). Refinamiento autorizado por el owner: desde un pre-cultivo, la opción "Sembrado" del modal de edición queda HABILITADA como vía de conversión equivalente al botón de la card. Regla de paro no activada: DoD completo verde.

**Trazado (sin edits previos)**: (a) bloque especial de la máquina en `agro-precultivo.js:275-281` deshabilitaba todo salvo lost desde precultivo; (b) `syncCropFormForStatus` ya desbloquea semilla + fila siembra/cosecha vía el listener `change` (una sola `.input-row` con ambos dates, index.html:1785-1794); (c) `saveCrop` YA es el camino de conversión de un write: guard `assertForwardTransition('precultivo','sembrado')` pasa (forward D-1) y el payload de edición escribe exactamente `status/status_mode/status_override/start_date/seed_kg/expected_harvest_date` (:2898-2919) + correcciones D-1b (nombre/área/inversión) — cero doble write; (d) `#crop-name` nunca se bloquea (sync solo toca las dos filas).

**Cambios**:

| Archivo | Cambio |
|---|---|
| `agro-precultivo.js` | Máquina: desde precultivo quedan habilitados Sembrado (nuevo) y Perdido; saltos largos (creciendo/produccion/finalizado/auto) bloqueados con título honesto "Desde pre-cultivo la fase pasa a Sembrado registrando la siembra…" (:293-300). Nota del modal reemplazada por la prosa del owner: "Al pasar a Sembrado se registran fecha de siembra, semilla y cosecha; el pre-cultivo evoluciona a ciclo de cultivo y su nomenclatura desaparece." Sync S3-b: al desbloquear pre→Sembrado en edición se LIMPIA la fecha (la de registro del plan no es la siembra real; entrada consciente forzada por el `required` nativo) y si el usuario vuelve a pre se restaura la fecha guardada desde `window.__AGRO_CROPS_STATE` — flag `lastSyncPreState` con guard por `dataset.initialStatus` para no tocar cultivos ya sembrados. |
| `index.html` | Comentario de equivalencia en saveCrop (:2886-2890): pre→Sembrado por el modal ES la conversión del botón (mismo write único). Cero cambios de lógica. |
| `MANIFIESTO_AGRO.md` §4.3 | La sección de pre-cultivos ya existía (S5, sesión III): prosa ajustada a las dos vías equivalentes (botón de card + edición eligiendo Sembrado), autorizado por esta decisión del owner. **Contaminación corregida**: el párrafo escrito en S5 contenía texto chino ("sin搬家") — reemplazado por "sin moverse de lugar". |

**Matriz estática DoD**: (a) un update con fechas/semilla ✓ (payload :2898-2919, un solo `.update`); (b) siembra vacía → bloqueo nativo (`required` vivo: form sin novalidate, 0 matches; index.html:1788) + respaldo JS (throw :2810 → popup YGUX) ✓; (c) cosecha < siembra → `showValidationError` :2835 ✓; (d) desde sembrado, precultivo NO ofrecido (guard rank-decrease lo deshabilita con razón) ✓; (e) Perdido lateral intacto (:77 lateral-exit) ✓; (f) botón de card intacto (agrociclos.js:320) ✓; (g) tras convertir, badge/notas/chips pre desaparecen (todo condicionado a `effectiveStatus==='precultivo'`, agro.js:11044) ✓.

**Resultado de build**: `pnpm build:gold` ✅ verde (1.94s; chunk `agro-precultivo-BUf2sOdb.js` 11.06 kB).

**QA sugerido (owner)**: editar un pre-cultivo → elegir Sembrado → la fecha se limpia y los campos se desbloquean → guardar sin fecha = bloqueo; completar fecha/semilla/cosecha → guardar → ciclo queda Sembrado con sus datos, sin badge "Pre-cultivo" y gastos leyendo como del ciclo; reabrir edición → Sembrado activo, precultivo no ofrecido, retrocesos bloqueados; volver de Sembrado a Pre-cultivo sin guardar → la fecha de registro se restaura.

**NO se hizo**: git (bloque sugerido abajo, NO ejecutado); cambios en el botón de la card ni en el mini-modal (vía alternativa conservada); otros arcos de la máquina; re-auditoría del resto del pase S5 (solo se corrigió la contaminación dentro del párrafo autorizado).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-precultivo.js apps/gold/agro/index.html apps/gold/docs/MANIFIESTO_AGRO.md
git commit -m "feat(agro): ANEXO 28 S3-b — puerta de siembra en el modal (pre→Sembrado habilitado, conversión un write vía saveCrop, fecha consciente, prosa MANIFIESTO dos vías + limpieza de contaminación)"
```

---

## Sesión 2026-09-18 (V) — ANEXO 28 QA-fix: chip VER a paso 3 + matriz de fechas del modal

Agente: GLM (ZCode). Dos cirugías de QA. DoD completo verde, regla de paro no activada. Cero git.

**Cambios (2 archivos)**:

| Archivo | Cambio |
|---|---|
| `agrociclos.js` | Chip "Ver registros" (rama=ver) ahora escribe `paso=3` (tipos con conteos reales) — el crop ya viaja en el hash y el paso 2 re-confirmaría contexto. Chip CREAR intacto en `paso=2` (:375). Orden write-hash + dispatch `agro:shell:set-view` sin cambios (:379). Verificado que el montaje en 3 no dispara limpieza: hash sin `finca=` ni `estado=` → `state.farmId=''` + ESTADO_TODOS → `reconcileCropSelection` (wizard :325-339) no reconcilia; `clampPaso(3)` válido (VER_TOTAL=5). |
| `agro-precultivo.js` | `syncCropFormForStatus` extiende la matriz de fechas: **pre** oculta fila siembra + bloque de cierre completo; **sembrado/creciendo/produccion** los muestra pero con el grupo de fecha de pérdida OCULTO; **perdido** muestra todo. Inputs ocultos deshabilitados (los `required` viven solo en finca/nombre/área/siembra — start_date solo se oculta en pre donde la validación JS ya está relajada por `isPreCultivoSave`): cero validación fantasma. Restauración sin inventar: al ocultar NO se borran valores (persisten disabled; al volver a mostrarse reaparecen los guardados); única excepción en CREACIÓN (sin edit-id), donde una fecha tipeada y luego oculta sería residual en el payload → se limpia (:226-227). Corregido en caliente un TDZ (uso de `editId` antes de su `const`). |

**Matriz estática DoD**: (a) VER paso=3 con crop ✓ (:379); (b) CREAR paso=2 ✓ (:375); (c) pre oculta las 3 filas y guarda sin ellas ✓ (fila siembra `setRowEnabled(false)` + closure display:none; guard `isPreCultivoSave` en saveCrop); (d) sembrado muestra siembra+cosecha y oculta pérdida ✓ (:218-219); (e) perdido muestra pérdida ✓; (f) filas ocultas sin required → no bloquean el guard ✓.

**Resultado de build**: `pnpm build:gold` ✅ verde (2.01s).

**QA sugerido (owner)**: chip "Ver registros" de un cultivo → aterriza en paso 3 con tipos y conteos reales del cultivo; chip CREAR sigue en paso 2; editar pre-cultivo → sin filas de cosecha/pérdida; elegir Sembrado → aparecen siembra+cosecha (pérdida no); marcar Perdido → aparece fecha de pérdida; guardar en cada estado sin errores fantasma; en edición, ocultar/reaparecer filas conserva los valores guardados.

**NO se hizo**: git (bloque sugerido abajo); cambios en CREAR chip, en el botón de card, ni en la nota del modal (S3-b intacta).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agrociclos.js apps/gold/agro/agro-precultivo.js
git commit -m "fix(agro): ANEXO 28 QA-fix — chip VER aterriza en paso 3 (conteos reales) y matriz de fechas del modal por estado (pre oculta cierre, pérdida solo en Perdido, restauración sin fechas inventadas)"
```

---

## Sesión 2026-09-18 (VI) — ANEXO 29 Fase 0: Memoria Conectada (solo lectura)

Agente: GLM (ZCode). MODO SOLO LECTURA: cero edits de código, cero git, cero canon (este INGEST es el único cambio). Build de partida verde. Decisiones D-1…D-4 del owner NO re-abiertas.

**Objetivo**: trazado (a)–(g) del proto-RAG vivo (AgroRepo ↔ Asistente IA) para diseñar la superficie unificada "Memoria conectada" y el retrieval Fase 1 (full-text, sin embeddings).

**Veredicto de almacenamiento (carga crítica resuelta)**: AgroRepo vive **100% en localStorage** bajo `agrorepo_mvp_v1` (agro-repo-storage.js:14); `agro-repo-storage.js` (1.015L) no importa nada de Supabase. Lectura `loadRepoState()` (:899-938) con migraciones legacy (`agrorepo_virtual_v3` :15, `agrorepo_ultimate_v2` :16); escritura `persistRepoState()` (:940-954) serializa el árbol completo. Nodo file (:226-248): `id agrpn_*, title, templateKey, content, createdAt, updatedAt, deletedAt` — **sin crop_id** (la "asociación a cultivo" es solo la carpeta sistema `Cultivos`, agro-repo-templates.js:10-14). Trash interno con purge 30d (:446-466). La tabla `agro_events` (FICHA §5) es de la Edge (`log_event`), NO de AgroRepo.

**Diagnóstico clave (archivo:línea)**:
- (b) Búsqueda local (agro-repo-search.js, 88L): `normalizeSearchText` NFD-sin-diacríticos (:1-6), `searchFiles` substring por título y por línea con lineNum (:49-84). **Sin ranking de relevancia** — base reutilizable, falta scoring.
- (c) Contexto: puente `window._agroRepoContext = buildRepoContext(repo)` (agro-repo-app.js:379-381, refresh en persistAll :417); `getAssistantContext()` (agro-assistant.js:804-880) incrusta `repo_memory.recent = slice(0,8)` de las 12 recientes (:875; orden updatedAt desc desde storage :994). Invoke (:541-550) con preamble de cultivos (:472-504). Edge v10.0.0-agro-agent: 6 tools (index.ts:89-179), contexto del cliente embebido como texto (:954-955), loop agéntico máx 3 pasos (:975). **No existe tool de memoria.**
- (d) Superficies: `VIEW_CONFIG` agrorepo/asistente (agro-shell.js:171-172), ambos al hub `memoria` (:79-80), gate (:58). Hub Memoria con **2 botones** (index.html:729-736); sidebar "Memoria e IA" 2 tiles scope `tools` (:478-494; en modo General se ven por defecto, :522-526). `asistente` es región fullscreen (:1194). **No hay deep-link a una entrada** (agro-repo-app sin hash/location; `openFile` :912-931 es privado; solo `window.ensureAgroRepoReady` :1797). No hay aliases legacy hoy (VIEW_ALIASES :91-113 no las incluye).
- (e) UX: Asistente post-ANEXO 26 = columna 820px, welcome 3 chips, historial threads; render de mensaje = texto plano + code fences (agro-assistant-ui.js:101-157) — **sin markdown de enlaces → las citas deben renderizarse desde datos locales, no parseando texto del modelo**. AgroRepo = explorador de archivos (árbol, tabs, editor md, búsqueda global Ctrl+K :862-873).
- (f) Privacidad (declarado, sin cambio): viaja a Gemini name/farm/location_text (:821-823), **lat/lon** (:737-741), clima del DOM (:744-760), cultivos+fechas (:792-801 + preamble), y repo_memory con path completo + snippet 180 (:875). `agro-privacy.js` NO interviene. Logs Edge enmascaran ids (:1036-1037).
- (g) Citas: metadatos por entrada disponibles (id/fechas/templateKey/path/bitácora) pero `buildRepoContext.recent_entries` **no expone `id`** (:1005-1012) — añadirlo es aditivo y necesario para chip "[Ver en AgroRepo]".

**Diseño Fase 1 (según veredicto localStorage)**: retrieval client-side — módulo nuevo `agro-memory-retrieval.js` con `retrieveRepoMemory(query, {limit})`: scoring título×4 / path×2 / línea×1 + recencia, fallback a recientes si no hay match; reemplaza el `slice(0,8)` fijo usando `item.prompt` real (getAssistantContext gana parámetro opcional; panel sin prompt conserva comportamiento). Citas desde datos locales validados (solo ids presentes en el payload). Tool server-side `search_memory` NO aplica en Fase 1 (los datos no están en Supabase); migración futura a tabla con RLS = decisión de producto del owner.

**Plan propuesto**: S1 retrieval+citas (núcleo) · S2 superficie unificada switch Conversar|Bitácora + aliases `asistente`/`agrorepo` vía VIEW_ALIASES con subview (mecanismo :92-113 + subnav :552/:655) + puente `window._agroRepoOpenEntry` · S3 hub card única + visual ADN V12 (ojo remapeo de favoritos: ids derivan de data-agro-view) · S4 pase documental GATEADO (MANIFIESTO §4.10/§4.11/§5.5, ADN §9, FICHA §4.2/§5 — que hoy omite toda la familia agro-repo-*.js y las 5 claves localStorage agrorepo_*, AGENTS §3.2).

**Cambios realizados**: ninguno de código. Solo este INGEST.

**Resultado de build**: `pnpm build:gold` ✅ verde de partida (2.1s) y al cierre.

**QA sugerido (owner)**: ninguno (sin cambios). Para S1: preguntar al asistente algo que esté textualmente en una nota vieja y verificar que la respuesta la cita.

**NO se hizo (scope respetado)**: edits de código, git, canónicos, re-apertura de D-1…D-4, QA runtime (ley §5).

**No trazado (honesto)**: agro-repo-app.js (1.809L) y agro-assistant-ui.js (437L) leídos por zonas load-bearing, no línea a línea; agro-repo.css sin auditar; agro-shell-search.js (162L) solo verificado su consumo de keywords (:33); tamaño real del localStorage del owner sin medir; todo el trazado es estático (cero runtime).

---

## Sesión 2026-09-18 (VII) — ANEXO 29 S1: retrieval local + citas verificables

Agente: GLM (ZCode). Implementación del scope S1 exacto (D-2 full-text sin embeddings). Git NO ejecutado. Previo: Fase 0 (sesión VI) sin re-diagnosticar.

**Cambios (5 archivos del DoD + 1 CSS declarado)**:

| Archivo | Tipo | Cambio |
|---|---|---|
| `agro/agro-memory-retrieval.js` | nuevo (244L) | `retrieveRepoMemory(query, {limit=6})`: tokens con `normalizeSearchText` real + stopwords ES cerradas (~40); scoring título×4 / path·bitácora×2 / línea×1 (cap 6/archivo) + boost recencia (máx +2, vida media 60d); excerpt centrado en línea con match (≤200 chars, índice lax sobre línea cruda por diacríticos); presupuesto total 2560 chars; sin matches → top 8 recientes (= comportamiento previo); lectura PURA vía `normalizeRepo` (no usa `loadRepoState`, que persiste). Imports: storage + search (hoja), consumido solo por agro-assistant.js (§3.3 sin circulares). |
| `agro/agro-repo-storage.js` | +1L | `recent_entries` expone `id` (:1006) — aditivo, para citas con deep-link. |
| `agro/agro-assistant.js` | +42L | Import retrieval; `getAssistantContext(promptText='')` (:824): con prompt → `retrieveRepoMemory` (:890) y return temprano; sin prompt → bridge recientes de siempre (:893-900). Cola pasa `item.prompt` real (:548). `buildSentSources(contextPayload)` (:911) construye las citas SOLO desde el repo_memory enviado; se adjuntan al mensaje assistant en éxito (:617). `addAssistantMessage` acepta `sources` y las persiste con el mensaje (:316) → sobreviven reload y re-render. |
| `agro/agro-assistant-ui.js` | +73L | `renderMessageSources` (:191): footer "Contexto consultado" + chips título·fecha (texto seguro, sin innerHTML); `navigateToRepoEntry` (:175): patrón canónico hash + `agro:shell:set-view` (agrociclos.js:364) + `_agroRepoOpenEntry`. Hook en `renderAssistantHistory` solo para role assistant con sources (:273) — cubre live y persisted. Guard `typeof window._agroRepoOpenEntry` (widget no cargado → no-op). |
| `agro/agro-repo-app.js` | +11L | Puente `window._agroRepoOpenEntry(entryId)` (:1802): `ensureWidgetReady()` (idempotente) + validación nodo vivo + `openFile` (privado sigue privado; tabs+árbol+editor :912-931). |
| `agro/agro-assistant-chat.css` | +62L | **Desviación declarada del DoD (6º archivo)**: chips del footer necesitan estilo ADN (§7 botones canon); bloques `.assistant-message-sources*` con solo `var(--token, fallback)` (verificado: cero hex/rgba fuera de var()), transición 160ms. Sin animaciones nuevas (nada que respetar en reduced-motion más allá de lo existente). |

**Matriz estática DoD (harness node sobre módulos REALES con localStorage stub + siembra por funciones reales de storage — lección ANEXO 23-b aplicada, 12/12 PASS)**: (a) nota vieja (40d) con match de título entra y lidera el top-K fuera de las 8 recientes ✓ a1-a4; (b) sin match/ query vacía → 8 recientes updatedAt desc ✓ b1-b4; sin storage → null (caller conserva fallback bridge) ✓ b5; (c) excerpt ≤200 ✓ c1-c2, presupuesto total ≤2560 ✓ c3. (d) por construcción: sources derivadas del payload enviado, nunca de texto del modelo ✓. (e) estático: bridge → ensure + openFile (tab+árbol+editor); nav = hash + evento (listener agro-shell.js:1561) ✓. (f) panel: las 2 llamadas `refreshContextPanel(getAssistantContext())` siguen sin prompt (:970, :1141) ✓. (g) `git diff` supabase/ + index.html + agro-shell.js = 0 líneas ✓.

**Resultado de build**: `pnpm build:gold` ✅ verde (1.85s; guard+report-check+llms+UTF-8 OK). Bundle: retrieval viaja en `assets/agro-assistant-BI5v-Kzg.js` (import estático del core), puente en `assets/agrorepo-CtoGfwNr.js`, string "Contexto consultado" presente.

**Deuda declarada**: agro-assistant.js crece 1.188→1.230L (§11.X: supera el umbral de vigilancia 1200 — próxima intervención en ese módulo debe evaluar extracción, no seguir creciendo). Harness temporal ejecutado y eliminado (no vive en el repo).

**QA sugerido (owner)**: (1) preguntar algo que esté textual en una nota VIEJA (fuera de las 8 recientes) → la respuesta debería apoyarse en ella y el chip abrirla en AgroRepo (tab+árbol+editor); (2) pregunta sin respaldo en notas → sin footer de citas (o con recientes si había memoria); (3) chip click desde el asistente → navega a AgroRepo con la entrada abierta y Volver operativo; (4) conversación vieja recargada → mensajes antiguos sin footer (sin sources persistidas antes del ANEXO) y los nuevos lo conservan; (5) panel de contexto muestra recientes como siempre.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); Edge Function; rutas/VIEW_CONFIG/aliases/hub/switch (S2-S3); migración Supabase; crop_id; wording distinto de "Contexto consultado".

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-memory-retrieval.js apps/gold/agro/agro-repo-storage.js apps/gold/agro/agro-assistant.js apps/gold/agro/agro-assistant-ui.js apps/gold/agro/agro-repo-app.js apps/gold/agro/agro-assistant-chat.css
git commit -m "feat(agro): ANEXO 29 S1 — retrieval local full-text de AgroRepo para el asistente (scoring+recencia, excerpt con caps) + citas verificables 'Contexto consultado' con deep-link a la entrada"
```

> **Nota posterior (sesión VIII):** el owner commiteó S1 como `72a04ed3` (2026-09-18 20:46, incluye el INGEST de la sesión VII). El bloque de arriba queda como registro histórico.

---

## Sesión 2026-09-18 (VIII) — ANEXO 29 S2+S3: workspace Memoria + puerta directa

Agente: GLM (Zcode). S2 (workspace/routing/estado) y S3 (puerta directa/visual/mobile) en una sesión con verificación por bloque. Previo: S1 ya commiteado por el owner (`72a04ed3`). Git NO ejecutado. Bandera B1 respetada: **agro-assistant.js 0 líneas de diff**.

**Cambios (4 modificados + 2 nuevos)**:

| Archivo | Tipo | Cambio |
|---|---|---|
| `agro/agro-memory-workspace.js` | nuevo (267L) | Orquestador del workspace: reubica `#agro-repo-section` y `.asistente-dedicado` dentro de sus paneles vía `appendChild` (nodos/listeners/estado preservados; NUNCA destroy/recreate) y les strips `data-agro-shell-region`. Estado `[both\|rag\|ia]` con `[hidden]` sobre los HOSTS del workspace (no sobre las secciones embebidas); reveal anima `amwPanelIn` 160ms; inits UNA vez (`panelsReady` → `ensureAgroRepoReady` + `openAgroAssistantInline`, con carga defensiva de `agrorepo.js` si el puente no existe). Persistencia `YG_AGRO_MEMORIA_PANEL_V1` (primera vez: both desktop / ia móvil ≤768; coerción both→ia en resize móvil sin pisar lo persistido). Panel también viaja como subview del hash. Auto-activación por `body.dataset.agroActiveView === 'memoria'` (cubre la carrera import shell/workspace) + listener `agro:shell:view-changed` (se dispara DESPUÉS de syncRegions, des-hidea las secciones embebidas si el shell las capturó en `topLevelRegions` antes de la reubicación). Volver = dispatch `set-view` al `lastHub` (trackeado por `agro:shell:gate-changed`, default inicio). Puente `window._agroMemoriaRevealRag` (desktop: IA→Ambas; móvil: →Memoria; si el workspace no está activo, además dispatch set-view con subview). |
| `agro/agro-memory-workspace.css` | nuevo (216L) | Header (Volver+eyebrow+titulo PJS+segmented chips pill), cuerpo grid 2 col con divisor 1px border-neutral, `[data-amw-state]` oculta el panel colapsado, `.amw-panel[hidden]{display:none}` (el display:flex del autor no puede pisar el hidden nativo), keyframes 160ms + reduced-motion, móvil ≤768: chip "Ambas" oculto + grid 1 col + targets ≥44px. Oculta el Volver interno del asistente (`#btn-close-agro-assistant`) — redundante con el del header. Solo `var(--token, fallback)` (verificado: cero hex/rgba fuera de var()). |
| `agro/index.html` | edit | Nueva sección `#agro-memory-workspace` (region `memoria`, fullscreen, header + 2 hosts vacíos) antes de agro-repo-section; `<link>` del css nuevo; import dinámico del workspace tras el del asistente (con catch). S3: rail desktop 2 items (AgroRepo+Asistente) → 1 item "Memoria"; sidebar "Memoria e IA" 2 tiles → 1 tile "Memoria conectada" (scope `tools`); tab-hub "Memoria" y panel-hub de 2 cards RETIRADOS (comentario arqueológico en su lugar); botón tabbar "Memoria" pasa de `data-agro-mobile-tab` a `data-agro-view="memoria"` (puerta directa a módulo profundo; ya no es tab de hub). |
| `agro/agro-shell.js` | edit | `VIEW_CONFIG.memoria` (region/label/focusSelector, dense; entradas legacy agrorepo/asistente ELIMINADAS — coerción vía alias); `VIEW_ALIASES` asistente→memoria&subview=ia, agrorepo→memoria&subview=rag; `VIEW_SUBNAV_CONFIG.memoria` allowed [both,rag,ia] default ''; `SHELL_VIEW_KEYWORDS.memoria` fusionadas (agrorepo+asistente eliminadas); `FULLSCREEN_REGIONS` += memoria; `VIEW_TO_MOBILE_HUB` sin asistente/agrorepo y SIN memoria (conserva hub previo = Volver correcto); S3: gate/hub `memoria` retirado de `SHELL_GATE_ROUTES`/`MOBILE_HUBS`/`MOBILE_HUB_TO_GATE_VIEW` (gate legado persistido en localStorage resuelve a null → boot limpio); `resolveInitialView` respeta el subview del alias en boot (F5 con #view=asistente restaura panel ia). |
| `agro/agro-assistant-ui.js` | edit (hook de cita) | `navigateToRepoEntry`: si `window._agroMemoriaRevealRag` existe → reveal del panel RAG + `_agroRepoOpenEntry`; fallback legacy (hash agrorepo + set-view) solo si el workspace no cargó. |
| `agro/agro-shell-favorites.js` | edit (necesario por DoD "favoritos viejos siguen navegando") | `LEGACY_FAVORITE_ID_MAP` remapea al leer `view:asistente`/`view:agrorepo` → `view:memoria` (los entry ids se normalizan vía alias; los favoritos pre-ANEXO siguen navegando al workspace). |

**Matriz estática DoD S2**: build verde ✓; `#view=memoria` → region memoria con both por defecto en desktop (VIEW_CONFIG+default) ✓; toggle = solo [hidden] sobre hosts, cero destroy (thread activo, archivo abierto, scroll y búsqueda del widget viven en el DOM reubicado) ✓; aliases aterrizan con panel correcto por TRES vías: setActiveView resuelve aliasSubview de cualquier token legacy (favoritos/clicks), boot `resolveInitialView` ahora arrastra el subview del alias, y set-view con subview ✓; favoritos legacy remapeados ✓; cita → revealRag + openEntry ✓; single-instance: guards `state.initialized` (workspace), `panelsReady` (paneles), `state.initialized` (initWidget AgroRepo) y `document.__agroAssistantBound` (asistente) — declarado estático, QA runtime es del owner ✓. **Regla de paro S2 NO activada**: montar un panel no exige re-init (append+guard).

**Matriz estática DoD S3**: tap Memoria (tabbar/rail/tile) → `setActiveView('memoria')` directo, module depth con contextbar Volver — cero pantalla intermedia (hub tab+panel retirados; botón tabbar ya no es mobile-tab) ✓; F5 con hash `#view=memoria&subview=X` restaura vista+panel (resolveInitialView hash path + readHashPanel del workspace); F5 limpio → hub (canon :651 del shell, "always start at hub") ✓; mobile exclusivo (chip Ambas oculto + coerción both→ia en apply y en resize) ✓; checklist ADN: tokens only (grep 0 hex/rgba fuera de var()), tipografías canon, focus-visible en chips y Volver, reduced-motion, sin emojis nuevos (FA icons), empty states nativos por panel (welcome del asistente / árbol+seeds de AgroRepo) ✓. **Regla de paro S3 NO activada**: los gates inicio/granja/menu quedan intactos (6 tabs emparejados tab↔panel; el 7º match del grep era `data-agro-mobile-tabbar`, el nav contenedor).

**Declaraciones honestas**: (1) El panel viaja como `subview` del hash (maquinaria nativa VIEW_SUBNAV/aliases/persistencia) y no como param literal `panel=` del spec — mismo comportamiento, canal canónico; declarado como desviación de nombre. (2) Atajo Ctrl+K de AgroRepo (agro-repo-app.js:1684): su fallback `activeView === 'agrorepo'` quedó muerto; el atajo sigue vivo vía `state.root.contains(activeElement)` cuando el foco está en el panel RAG (archivo fuera del scope S2/S3 — no tocado). (3) Ramas muertas `applyViewEffects` view==='agrorepo'/'asistente' conservadas (referencian strings, no vistas). (4) El layout embebido (asistente en columna ~50% / AgroRepo en ~50%) es CSS conservador sin QA visual — el ojo del owner decide si S3-b necesita ajuste fino. (5) extras de scope index.html y favorites: exigidos por el propio DoD (puertas S3 + favoritos viejos), declarados. (6) QA runtime NO ejecutado (ley §5): single-instance y "sin perder estado" verificados por construcción estática.

**Resultado de build**: `pnpm build:gold` ✅ verde (2.34s; chunk code-split `agro-memory-workspace-Bsfz-2gQ.js`; strings view=memoria en bundle del shell; UTF-8 OK).

**QA sugerido (owner)**: (1) barra inferior Memoria → workspace directo sin cards intermedias (desktop both, móvil IA); (2) toggle Ambas/Memoria/IA varias veces → thread del chat y archivo abierto del AgroRepo intactos (scroll y búsqueda incluidos); (3) cita "Contexto consultado" → revela RAG con la entrada abierta (desktop desde IA pasa a Ambas; móvil pasa a Memoria); (4) `#view=asistente` y `#view=agrorepo` → aterrizan en memoria con panel IA/RAG; favoritos viejos de AgroRepo/Asistente navegan; (5) F5 con `#view=memoria&subview=rag` → restaura panel; (6) Volver del workspace → hub previo (entrar desde Granja → Volver a Granja); (7) móv ≤768: sin chip Ambas, targets cómodos, compositor sticky; (8) consola limpia entrando y saliendo varias veces; (9) modo Cultivo/No cultivo oculta la tile, General/Herramientas la muestra.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); Edge Function; agro-assistant.js (B1); migración Supabase; S4 documental (GATEADO a palabra del owner); ajuste fino visual del layout embebido (espera QA).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-memory-workspace.js apps/gold/agro/agro-memory-workspace.css apps/gold/agro/index.html apps/gold/agro/agro-shell.js apps/gold/agro/agro-assistant-ui.js apps/gold/agro/agro-shell-favorites.js
git commit -m "feat(memoria): ANEXO 29 S2+S3 — workspace fullscreen Memoria (RAG+IA, toggle Ambas/Memoria/IA sin perder estado) + puerta directa sin hub intermedio + aliases legacy con panel + favoritos remapeados"
```

> **Nota posterior (sesión IX):** el owner commiteó S2+S3 como `c362bbd6` (21:19) y el QA online dio ROJO (workspace sin paneles). El bloque de arriba queda como registro histórico; el fix va en la sesión IX.

---

## Sesión 2026-09-18 (IX) — ANEXO 29 QA-fix: workspace montado pero paneles vacíos

Agente: GLM (ZCode). QA owner 21:22 ROJO: "topbar Volver+Memoria correcto, cero contenido: ni paneles ni toggle". MODO diagnóstico con evidencia; fix mínimo aplicado con causa clara y confirmada. Git NO ejecutado. Previo: owner commiteó S2+S3 como `c362bbd6`.

**Causa raíz CONFIRMADA (archivo:línea)**: `.is-shell-hidden { display: none !important }` (agro.css:9373-9375). En el boot, `syncRegions` (agro-shell.js:1210) oculta toda región que no coincide con la vista activa con ESA CLASE más el atributo `hidden` (setElementHiddenInert :738-746). Las secciones `#agro-repo-section` y `.asistente-dedicado` fueron capturadas en `topLevelRegions` (agro-shell.js:983, captura ÚNICA al init) ANTES de que el workspace las reubicara — y como la reubicación les strips el `data-agro-shell-region`, cada `syncRegions` posterior las vuelve a marcar `is-shell-hidden` (nunca matchean). La reubicación y el unhide de activación de S2 limpiaban SOLO `hidden`+`inert`, nunca la clase → ambos paneles quedan `display:none !important` para siempre. Secuencia exacta del fallo: boot → setActiveView('memoria') → syncRegions aplica clase a las dos secciones (regiones 'agrorepo'/'asistente' ≠ 'memoria') → workspace reubica y limpia attrs → clase viaja con el nodo → paneles invisibles aunque los hosts estén visibles.

**Fix mínimo (2 archivos)**:

| Archivo | Cambio |
|---|---|
| `agro/agro-memory-workspace.js` | Nueva `revealEmbeddedSection(section)`: limpia `hidden`+`inert`+`classList.remove('is-shell-hidden','is-shell-active')`. Usada en `relocatePanels()` (reemplaza los removeAttribute sueltos) y en `unhideEmbeddedSections()` (cada activación — el evento view-changed llega DESPUÉS de syncRegions, así que el orden desoculta en cada ciclo). Cubre ambos órdenes de carga shell/workspace: si el workspace carga antes del shell, las secciones nunca se capturan y el fix es no-op. |
| `agro/agro-memory-workspace.css` | Guard `.agro-memory-workspace[hidden] { display:none }` — el `display:flex` del autor pisaba el `[hidden]` nativo de la sección (riesgo de flash pre-init del shell y defensa ante cualquier ruta que dependa solo del atributo). |

**Trazado del prompt de diagnóstico del owner, con los selectores REALES (los del snippet usaban atributos que no existen: `data-agro-memoria-workspace`/`data-memoria-panel`)**:
- (a) Orden de boot: las secciones son HTML estático (source index.html:2315 y :3657; dist/agro/index.html:2287/:2315 verificados) y el module script corre post-parse — appendChild nunca falló por orden. La carrera relevante era otra: SHELL captura regiones ANTES de la reubicación (causa raíz).
- (b) Reubicación: la lógica era correcta (los nodos se movían); lo que viajaba con ellos era la clase maldita.
- (c) Visibilidad: este era el fallo — hosts visibles, hijos con `is-shell-hidden !important`.
- (d) CSS: `<link>` presente (source :160; asset `agro-qB0EJyi8.css` en dist); sin colisiones `amw-` en CSS preexistente (grep 0).
- (e) Toggle: markup estático íntegro en source y dist (header completo con los 3 chips, leído línea a línea) — el toggle NO depende del JS. No se encontró mecanismo estático que lo oculte; la lectura más probable de la captura es el contextbar del shell (Volver + título 'Memoria' a profundidad módulo) sobre el cuerpo vacío. Si tras este fix el toggle sigue sin verse, hace falta la salida DevTools del owner (snippet corregido en QA sugerido).
- (f) Console: sin errores de sintaxis (build verde; chunk nuevo `agro-memory-workspace-BiY8pDa3.js` contiene el fix).

**Resultado de build**: `pnpm build:gold` ✅ verde (2.56s). Diff acotado a los 2 archivos del workspace.

**QA sugerido (owner)**: recargar con cache dura (Ctrl+Shift+R) y abrir Memoria → ambos paneles visibles en desktop (Ambas), IA en móvil; toggle funcional. Si algo sigue sin verse, pegar en consola (selectores reales):
```javascript
const ws = document.querySelector('#agro-memory-workspace');
const rag = document.querySelector('[data-amw-panel-container="rag"] > #agro-repo-section');
const ia = document.querySelector('[data-amw-panel-container="ia"] .asistente-dedicado');
console.log('workspace', !!ws, 'hidden?', ws?.hidden, ws?.className);
console.log('rag dentro del host:', !!rag, 'clases:', rag?.className);
console.log('ia dentro del host:', !!ia, 'clases:', ia?.className);
console.log('toggle:', !!document.getElementById('amw-toggle'), getComputedStyle(document.getElementById('amw-toggle')).display);
console.log('módulo:', typeof window._agroMemoriaRevealRag);
```

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); cambios en shell/Edge/assistant (B1); rediseño del layout.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-memory-workspace.js apps/gold/agro/agro-memory-workspace.css
git commit -m "fix(memoria): ANEXO 29 QA-fix — paneles del workspace quedaban invisibles: is-shell-hidden (display:none !important) viajaba con las secciones reubicadas y nunca se limpiaba (revealEmbeddedSection en reubicación + cada activación) + guard [hidden] en la sección"
```

> **Nota posterior (sesión X):** el owner commiteó el QA-fix 1 como `1e3c8b12`. El bloque de arriba queda como registro histórico; el fix 2 va en la sesión X.

---

## Sesión 2026-09-18 (X) — ANEXO 29 QA-fix 2: puerta Memoria restaurada en el hub

Agente: GLM (ZCode). QA owner 21:34 ROJO: hub desktop muestra solo Inicio · Granja · Menú — falta Memoria (violación §4.12.4 y decisión D-3 v2). Previo: QA-fix 1 commiteado por el owner (`1e3c8b12`). Git NO ejecutado.

**Causa raíz (confesada en el propio INGEST VIII)**: la barra de puertas del hub desktop ES `agro-shell-hub-tabs` (index.html), visible solo ≥769px a profundidad hub (agro.css:9967 `display:none` por defecto, :9984 `body[data-agro-shell-depth="hub"] { display:flex }` dentro de `@media (min-width:769px)`). Al retirar en S3 el tab-hub "Memoria" para matar la pantalla intermedia, el render de la PUERTA desktop se fue con él. La barra inferior móvil NO estaba afectada (su botón Memoria existe con `data-agro-view` desde S3; CSS de `.agro-mobile-tabbar__item` por clase, sin dependencia del attr). El retiro del gate en `SHELL_GATE_ROUTES`/`MOBILE_HUBS` era correcto y NO se reintroduce.

**Fix (1 archivo, markup puro — cero JS, cero CSS, cero shell)**: botón puerta restaurado en `agro-shell-hub-tabs` entre Granja y Menú (orden canónico §4.12.4), con clase `.agro-shell-hub-tab` (estilo idéntico por clase — el CSS no depende del attr), `data-agro-view="memoria"` y SIN `data-agro-mobile-tab` ni panel propio: no es gate ni tab de hub, es puerta al módulo profundo. El click cae en el handler genérico `[data-agro-view]` del shell (agro-shell.js document click) → `setActiveView('memoria')` → workspace fullscreen; `VIEW_TO_MOBILE_HUB` sin entrada memoria conserva el hub activo previo → Volver regresa al hub de origen. Cero pantalla intermedia (D-3 v2 intacta).

**Verificación estática (dist tras build)**: grep de dist/agro/index.html confirma las 4 puertas en orden canónico en las tres superficies — rail desktop (Dashboard·Cultivos·Granja·Agenda·**Memoria**·Estadísticas·Perfil), tabs del hub desktop (Inicio·Granja·**Memoria**·Menú) y tabbar móvil (Inicio·Granja·**Memoria**·Menú). El botón no matchea `[data-agro-mobile-tab]` → `syncMobileHub` no lo toca (sin estado activo espurio, igual que la puerta móvil). `pnpm build:gold` ✅ verde (2.69s).

**Respuesta a la pregunta abierta del owner (estado de los paneles por #view=memoria)**: no ejecutable por el agente (ley §5). Estáticamente la cadena del QA-fix 1 es completa: syncRegions aplica `is-shell-hidden` a las secciones capturadas → el evento `agro:shell:view-changed` (posterior a syncRegions) dispara `activateFromContext` → `revealEmbeddedSection` limpia clase+attr+inert en cada activación, y la reubicación temprana también lo hace. El fix está commiteado (`1e3c8b12`); su validez runtime la confirma el re-QA del owner entrando a mano por `#view=memoria` tras desplegar este fix 2.

**QA sugerido (owner)**: (1) hub desktop → barra con las 4 puertas en orden; (2) click Memoria → workspace fullscreen con AMBOS paneles visibles y toggle funcional (esto valida a la vez el fix 1 de paneles); (3) móvil → barra inferior con 4 puertas, Memoria entra al workspace en panel IA; (4) Volver del workspace regresa al hub de origen; (5) Inicio/Granja/Menú siguen operando como puertas de hub; (6) cita "Contexto consultado" revela RAG con la entrada abierta.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); reintroducción del gate memoria (que reviviría el sub-hub); toques en aliases/favoritos (intactos, sin conflicto demostrado); shell/JS/CSS.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/index.html
git commit -m "fix(memoria): ANEXO 29 QA-fix 2 — puerta Memoria restaurada en la barra del hub desktop (canon §4.12.4), despacha directo al workspace sin gate ni pantalla intermedia"
```

> **Nota posterior (sesión XI):** el owner commiteó el QA-fix 2 como `6c2a8763`. El bloque de arriba queda como registro histórico.

---

## Sesión 2026-09-18 (XI) — ANEXO 29 S3-b: Memoria inmersiva por capas (IA hogar + AgroRepo capa interna)

Agente: GLM (ZCode). Rediseño del workspace por decisiones cerradas del owner: IA = hogar inmersivo fullscreen (100% ancho), toggle [Ambas·Memoria·IA] y split MUERTOS, AgroRepo = capa interna fullscreen con Volver→IA. Previo: QA-fix 2 commiteado (`6c2a8763`). Git NO ejecutado. B1 intacta: agro-assistant.js 0 diff (el wiring del botón AgroRepo vive en el workspace).

**Cambios (4 archivos)**:

| Archivo | Tipo | Cambio |
|---|---|---|
| `agro/agro-memory-workspace.js` | re-escrito (267L) | Capas `ia\|rag` solamente: `normalizeLayerState` migra 'both'→'ia' al leer (localStorage y hash); `applyLayer` gobierna visibilidad (host [hidden] + topbar rag + `data-amw-layer` en la sección); flag `body[data-agro-memoria-layer]` SOLO con memoria activa (guard por `dataset.agroActiveView` — sin él, el init en frío dejaría el tabbar desvanecido-anulado dentro de otros módulos en móvil); revealRag = capa rag completa (móvil y desktop por igual); Volver de la topbar rag → `applyLayer('ia')` (conserva thread); botón "AgroRepo" de la sidebar del asistente wired desde el workspace (markup estático, sin tocar assistant.js); al salir de memoria se borra el flag (view-changed else). Se retiran: toggle, split, resize-coerción, lastHub/gate-changed (la salida ya no es un Volver del workspace). |
| `agro/agro-memory-workspace.css` | re-escrito | Topbar rag (Volver btn sober + título PJS); cuerpo grid 1 columna full-width; visibilidad por `[data-amw-layer]`; botón `.ast-btn-agrorepo` outline-gold canon (scope `.agro-memory-workspace`); **barra del hub como salida de ia**: ≤768 des-vanece el tabbar (`opacity/pointer-events/transform !important` solo con flag=ia), ≥769 muestra la franja `.agro-shell-hub-tabs` del root del hub forzando sus paneles a `display:none !important` (solo puertas, cero contenido del hub); en rag mandan las reglas nativas del shell (oculta). Touch targets ≥44px móvil; reduced-motion; cero hex/rgba fuera de var() (verificado). |
| `agro/index.html` | edit | Sección workspace: header del workspace (Volver+Memoria+toggle) reemplazado por topbar de la capa rag (`#amw-rag-topbar` hidden + `#amw-rag-back` + título AgroRepo); sidebar del asistente: botón "AgroRepo" (`#ast-open-agrorepo`) debajo de "Nueva conversación". |
| `agro/agro-shell.js` | edit (2 puntos) | `VIEW_SUBNAV_CONFIG.memoria.allowed` = ['rag','ia'] ('both' fuera → hash legacy subview=both coerciona a '' por normalizeSubview); `syncShellDepth`: en memoria (`activeView === 'memoria'`) el shell deja de ocultar por atributo tabbar+hubRoot (disponibles como salida; visibilidad real por el flag de capa en CSS) y SUPRIME la contextbar "Volver\|Módulo" (el workspace provee su salida). |

**Cadena de salida verificada estáticamente (regla de PARO no activada)**: rag → topbar Volver (visible por CSS en capa rag, ≥44px) → ia con thread intacto (solo [hidden], cero destroy). ia → móvil: tabbar inferior des-vaneado (attrs un-hidden por syncShellDepth + CSS flag=ia) con las 4 puertas; desktop: franja de puertas del hub (paneles forzados none). Salida por puerta → setShellGate → hub depth → reglas nativas (flag borrado en view-changed). Navegación directa a otro módulo desde memoria → syncShellDepth re-oculta attrs (isMemoria false) + flag limpio. **Cero superficie sin salida visible.**

**Matriz estática DoD**: build verde ✓; IA hogar 100% ancho sin toggle ni contextbar con barra del hub visible (por construcción CSS/flag) ✓; botón AgroRepo conmuta a rag ✓; rag fullscreen con Volver→ia y hub oculta ✓; citas: ui.js YA llama `_agroMemoriaRevealRag` (semántica ahora = capa rag completa) + `_agroRepoOpenEntry` — **cero diff en ui.js** ✓; aliases asistente/agrorepo y favoritos intactos (0 diff) ✓; F5: #view=memoria&subview=rag restaura capa (boot normalizeSubview + readHashLayer), subview=both legacy → '' → stored migrado 'ia' ✓; migración 'both'→'ia' al leer storage ✓; single-instance y sin pérdida de estado heredados de S2 (guards intactos, revealEmbeddedSection conservado) ✓.

**Declaraciones honestas**: (1) El mecanismo "barra del hub visible en ia" en desktop desentierra el root del hub a profundidad módulo con sus paneles forzados a none por CSS del workspace (`!important` — necesario contra reglas depth del shell de igual especificidad): si el owner ve artefacto visual en esa franja (padding del hub), ajuste fino en S3-c. (2) El botón simétrico "Asistente IA" en la toolbar de AgroRepo NO se agregó: el Volver de la topbar basta (la spec lo dejaba opcional con declaración). (3) QA runtime no ejecutado (ley §5); la foto final es del owner. (4) `.freebuff/` (untracked, ajeno a este frente) no se tocó.

**Resultado de build**: `pnpm build:gold` ✅ verde (2.55s; chunk `agro-memory-workspace-DrTyQciT.js` con la lógica de capas; grep 0 huérfanos de amw-toggle/data-amw-state/amw-header).

**QA sugerido (owner)**: (1) Memoria → IA inmersiva a ancho completo, sin fila de toggle y sin barra "Volver|Memoria"; en móvil con tabbar inferior visible, en desktop con franja de puertas arriba; (2) botón AgroRepo (sidebar, bajo Nueva conversación) → libreta fullscreen con Volver; (3) Volver → IA con el thread intacto; (4) cita de nota vieja → capa rag con la entrada abierta; (5) #view=asistente → ia y #view=agrorepo → rag; favoritos viejos; (6) F5 en ambas capas persiste; (7) conmutar ia↔rag varias veces → consola limpia y sin duplicados.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); agro-assistant.js (B1); Edge; retrieval; hub de Granja; botón simétrico en toolbar de AgroRepo (declarado innecesario); S4 documental (gateado).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-memory-workspace.js apps/gold/agro/agro-memory-workspace.css apps/gold/agro/index.html apps/gold/agro/agro-shell.js
git commit -m "feat(memoria): ANEXO 29 S3-b — Memoria inmersiva por capas: IA hogar fullscreen (toggle/split retirados) + AgroRepo capa interna con Volver a la IA; contextbar suprimida y barra del hub como salida de la capa IA"
```

> **Nota posterior (sesión XII):** el owner commiteó S3-b como `ce8f9cb8`. El bloque de arriba queda como registro histórico; el fix 3 va en la sesión XII.

---

## Sesión 2026-09-18 (XII) — ANEXO 29 QA-fix 3: contextbar "Volver|Memoria" sigue visible (dos Volvers en rag)

Agente: GLM (ZCode). QA owner 22:13/22:14 ROJO: la contextbar del shell sigue visible en ambas subvistas de memoria; en rag se apila con la topbar del workspace ("Volver|AgroRepo") → dos Volvers. Orden del owner: eliminar la barra que dice Memoria con la flecha. Previo: S3-b commiteado por el owner (`ce8f9cb8`). Git NO ejecutado.

**Trazado (a)-(c) con evidencia**:

(a) La contextbar se renderiza en `index.html` (`[data-agro-mobile-contextbar]`, ".agro-mobile-contextbar") y su visibilidad la deciden REGLAS CSS por profundidad, no atributos: `body[data-agro-shell-depth="module"] .agro-mobile-contextbar { display: flex; }` existe DOS veces — agro.css:9750 (media ≤768) y agro.css:10204 (contexto general/desktop, junto a un caso especial `body[data-agro-active-view="operational"]` :10198). El shell solo gestiona attrs (hidden+inert) en syncShellDepth (agro-shell.js:1063-1066).

(b) S3-b YA suprimía la contextbar en el punto de sync (`setElementHiddenInert(mobileContextbar, shellDepth !== 'module' || isMemoria)`, agro-shell.js:1066 — verificado presente en el árbol commiteado). **No tomó efecto porque el chrome del shell es CSS-driven por diseño**: una regla de autor `display:flex` pisa el `[hidden]` del UA (misma clase de bug que QA-fix 1, invertida: allí mi display:flex pisaba el hidden nativo; aquí el display:flex del shell pisa el hidden que el propio shell setea — es el motivo por el que el tabbar se oculta con fade opacity y no con attrs). Ninguna supresión por atributos puede ocultar esta barra; hay que ganar en el plano CSS.

(c) El Volver redundante de rag es el de la contextbar: su botón `[data-agro-mobile-back]` cae en la rama else del handler (agro-shell.js:~1483) → `setShellGate(activeMobileHub)` → regresa al hub PREVIO (Inicio/Granja), NO a la capa IA. No está muerto literalmente: es una segunda salida que compite con las canónicas (rag → topbar workspace → IA; ia → barra del hub) y viola la decisión S3-b "SIN barra contextual Volver|Memoria".

**Fix (1 archivo, 1 regla — en el punto real de render, el plano CSS)**: `agro-memory-workspace.css` añade `body[data-agro-memoria-layer] .agro-mobile-contextbar { display: none !important; }`. El flag de capa existe SOLO durante memoria (ambas subvistas, seteado por applyLayer con guard de vista activa y borrado al salir) → la supresión vence a las dos reglas gemelas (importante vs no-importante) y **el resto de los módulos profundos conserva su contextbar canónica** (sin flag, cero cambio). La supresión por attrs de S3-b se conserva como capa inert/a11y (botones muertos incluso en la ventana de carrera de arranque). Diff = 1 archivo workspace CSS (la causa lo exigía: el flag de capa y todas las overrides de chrome de memoria viven ahí; 0 líneas de shell).

**Resultado de build**: `pnpm build:gold` ✅ verde (2.44s; regla presente en `assets/agro-Bo8p8WRk.css`).

**Matriz estática DoD**: ia sin contextbar y con franja de puertas (regla mata ambas variantes de display:flex) ✓; rag con UN solo Volver (topbar workspace, → ia conservando thread; solo [hidden], cero destroy) ✓; otros módulos intactos (selector exige el flag) ✓; F5/aliases sin cambio (0 diff en shell/routing) ✓; topbar rag y franja de hub NO tocadas ✓.

**QA sugerido (owner)**: (1) Memoria ia → ya no existe la barra "Volver|Memoria" (móvil y desktop); franja de puertas visible; (2) botón AgroRepo → rag con UN solo Volver que regresa al chat con el thread intacto; (3) abrir un módulo profundo clásico (ej. Facturero de Clientes) → su contextbar "Volver|…" sigue ahí; (4) F5 en ambas capas; consola limpia.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); shell (0 diff — la supresión de syncShellDepth ya era correcta como capa inert); topbar rag; franja de puertas; Edge/assistant (B1).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-memory-workspace.css
git commit -m "fix(memoria): ANEXO 29 QA-fix 3 — contextbar del shell suprimida en ambas capas de memoria (el chrome del shell es CSS-driven: display:flex a depth módulo pisaba el [hidden] de syncShellDepth; regla por flag de capa, resto de módulos intactos)"
```

---

## Sesión 2026-09-18 (XIII) — ANEXO 29 MF-1: fuera hints de teclado del compositor

Agente: GLM (ZCode). Micro-fix por orden del owner (22:26): eliminar el cluster `<kbd>` "Enter enviar · Shift+Enter nueva línea" de la fila de helpers del compositor; conservar el contador derecho. Git NO ejecutado.

**Trazado**: (a) markup en `index.html:3791-3795` (fila `.ast-input-hint`: span kbd + contador `#assistant-mode-hint`); (b) **cero referencias JS** a esa fila (grep `assistant-mode-hint` en agro-assistant.js/ui.js = 0; el cooldown vive en el botón vía `updateAssistantCooldownUI` y su nodo oculto `#assistant-cooldown` :3798 NO se tocó); (c) CSS en `agro-assistant-chat.css` (`.ast-input-hint kbd` :559 — huérfana tras el fix; la fila usa `justify-content: space-between`, que con un solo hijo habría alineado el contador a la IZQUIERDA).

**Cambios (2 archivos)**: index.html retira el span kbd (con comentario arqueológico); agro-assistant-chat.css elimina la regla `.ast-input-hint kbd` y añade `margin-left: auto` a `.ast-input-mode` (contador anclado a la derecha, sin salto de layout en ≤768).

**Resultado de build**: `pnpm build:gold` ✅ verde (2.30s). Grep: cero `<kbd>` residuales en source; contador y nodo cooldown intactos.

**QA sugerido (owner)**: abrir Memoria → IA: el compositor muestra solo el contador a la derecha; enviar mensaje verifica cooldown y flujo sin cambios.

**NO se hizo**: nada más (micro-fix puro).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/index.html apps/gold/agro/agro-assistant-chat.css
git commit -m "chore(agro): ANEXO 29 MF-1 — fuera hints de teclado del compositor del asistente (cluster kbd retirado, contador derecho anclado con margin-auto, css huérfano eliminado)"
```

---

## Sesión 2026-09-18 (XIV) — ANEXO 30 Fase 0: Períodos como libro de finca (solo lectura)

Agente: GLM (ZCode). MODO SOLO LECTURA: cero edits de código, cero git, cero canon (única escritura = este INGEST). Regla del owner cerrada: Operaciones de la Finca es libro DE FINCA — la lectura del período NO se parte por vinculación a cultivo, y cada ciclo de período corresponde a UNA finca (calendario, lista y creación por finca). Alcance aplicado: **A (default)** — lectura plana de finca + ciclos atados a finca, `crop_id` conservado en el dato para costos del cultivo (§4.3).

**Veredicto de schema (a)**:
- `agro_operational_cycles.farm_id` **SÍ existe** — migración `supabase/migrations/20260604120000_agro_operational_farm_id.sql:8-9` (nullable, FK `agro_farms`, on delete set null; índice user+farm :14-16). También `agro_operational_movements.farm_id` (:19-20), y el compositor lo puebla (`agroOperationalCycles.js:1313` deriveMovementPayload).
- `agro_period_cycles` (la tabla propia del módulo) **NO tiene farm_id** — creada en `20260411130000_create_agro_period_cycles.sql:6-22` (id, user_id, name, period_year, period_month, start/end_date, deleted_at) con único parcial `(user_id, period_year, period_month) WHERE deleted_at IS NULL` (:24-26). **Migración necesaria para alcance A**: add column farm_id + reemplazo del único parcial por `(user_id, farm_id, period_year, period_month)`. Backfill filas existentes: recomendación dejar `null` = "Vista general" (sin reatribución silenciosa); decisión final del owner en S1.
- La query de actividad del módulo hoy **no selecciona farm_id** (`agro-period-cycles.js:398` ciclos, :412 movimientos).

**Render de la partición (b)** — todo vive dentro de `agro-period-cycles.js` (ningún otro archivo la renderiza): desglose `<details>` "Ver desglose por vinculación a cultivo" con grupos "Vinculados a cultivo"/"Generales de la finca" (`renderCycleCard` :972-988 + `renderGroupCard` :902-917); celda "Asociados / Generales" (`buildSnapshotMeta` :740); métricas de comparación :821-836. La alimenta `association = crop_id ? 'linked' : 'unlinked'` (`buildOperationalMovementRow` :315,:330) — `crop_id` viene del CICLO operacional (`agro_operational_cycles.crop_id`, select :398), no del movimiento. Contadores linked/unlinked: :388-389, :455-456, :475-476.

**Dependencias de crop_id operacional (c)** — bajo alcance A quedan INTACTAS (consumen las tablas directo, no la lectura del módulo): `computeCropFinances` Dashboard Bloque 4 (`agro-dashboard-v11.js:508-519` + `fetchOperationalExpensesDirect` :544-549 por `crop_id`, bridges `window._agroMergedOperationalExpensesByCrop` agro.js:11932); cards de Mis Cultivos (unión dedup ledger-prima agro.js:11879-11937, keyed por crop_id — camino §4.3 `costosTotales`); `agro-crop-report.js:742-751` (eq crop_id); rank RPC `agro_rank_top_crops_profit` (`20260221231650_...sql:156-163`, join ciclos×movimientos por crop_id). Por `farm_id` (también intactos): `agro-farm-report.js:126`, `agro-farm-compare.js:80-83`, `agro-farms.js:151-156`, lector canónico `agro-ledger-reader.js` (particiones farm/crop/orphan :259-266). Si el alcance fuera B (borrar el vínculo del dato), la matriz rompe §4.3 completo — razón por la que A es el default sano.

**Scope actual calendario/lista/creación (d)**: HOY todo es global por usuario — `fetchPeriodCycles` `.eq('user_id')` sin farm (`agro-period-cycles.js:569`), actividad `.eq('user_id')` (:399,:413), tabs solo Activos/Finalizados (:1119-1122), modal de creación con nombre+mes únicamente (:684-697), payload sin farm_id (:1269-1276), guard de duplicado por monthKey (:1264). Cero selector de finca en el módulo. `assertOperationalPeriodOpen` (user+mes, :1445-1494) la consumen los 3 wizards + compositor (agro-facturero-cultivo-wizard.js:849, agro-facturero-personal-wizard.js:429, agro-facturero-finca-wizard.js:703, agroOperationalCycles.js:1358,:1410) — bajo A necesita parámetro farmId opcional (retrocompatible).

**(e) fuera de Operaciones — confirmado NO se tocan**: cards de cultivo (bridge crop_id), Facturero del Cultivo (ledger-reader preset crop; su finca solo acota chips de cultivos, "Nunca filtra por farm_id de la fila" :384 nota + wizard :272-273), reportes finca/cultivo, rankings RPC, `agro-operational-edit.js` (edita movimientos; "farm_id/crop_id viven en el ciclo" :9, jamás los toca :270).

**Diseño del fix (alcance A)**: (1) DDL farm_id en `agro_period_cycles` + único parcial con farm_id; (2) lectura plana: retirar partición linked/unlinked del render/VM/comparador/copys (subtitle :498 "Incluye movimientos vinculados..." también cambia), lista única ordenada por fecha/tipo; (3) scoping por finca: selector chips (fuente `window._agroFarms.getFarms()` agro-farms.js:724, "Vista general" primero — patrón §4.5) + `.eq('farm_id', farmId)` en lectura cuando finca específica + select de farm_id en queries de actividad; creación SIEMPRE con finca obligatoria (pre-select si hay una sola — patrón §4.3); guard duplicado por monthKey+farmId; (4) punto abierto S1: regla de atribución para ciclos vinculados a cultivo con `farm_id` null (fallback `crop.farm_id` vs exclusión) — requiere query de datos reales del owner (count crop-linked sin farm).

**Reconciliación documental GATEADA (S5, solo con autorización expresa)**: MANIFIESTO §4.4 (subsuperficies por finca + "cada período pertenece a UNA finca"; ojo: línea 452 "sin importar el cultivo" YA alinea con lectura plana — el código era lo que desviaba), §4.3 (aclaración lectura-vs-cómputo: lectura plana ≠ pérdida del vínculo del dato), §4.5.2 (cross-ref libro de finca por períodos), FICHA §5 (agro_period_cycles + farm_id; operacionales con farm_id/crop_id).

**Plan de micro-sesiones**: S1 DDL+migración+query backfill (DoD: migración en supabase/migrations, build verde) → S2 lectura plana (DoD: grep cero partición en módulo, build verde) → S3 selector por finca+creación (DoD: build verde + queries estáticas documentadas) → S4 assertOperationalPeriodOpen farmId (DoD: 4 call sites, retrocompatible) → S5 documental GATEADO. Regla de paro: sin evidencia no se propone fix; QA online exclusivo del owner.

**Resultado de build**: `pnpm build:gold` ✅ verde de partida (exit 0, UTF-8 OK). Sin cambios de código → no hay build de cierre distinto del de partida.

**NO se hizo (scope respetado)**: cero edits de código; cero git; cero canon; sin queries a datos reales (bloqueo honesto: counts de backfill y ciclos crop-linked sin farm requieren acceso del owner); agroOperationalCycles.js (4314L, writer) solo se leyó.

**Lo NO trazado, declarado**: composición interna de `state.datasets`/stamps del legacy agroOperationalCycles (no afecta al diseño A: el módulo de períodos lee las tablas directo); verificación runtime (ley §5).

---

## Sesión 2026-09-18 (XV) — ANEXO 30 S1→S4: períodos por finca + lectura plana (implementación)

Agente: GLM (ZCode). Ejecución de las 4 etapas con DoD por etapa. Git NO ejecutado. Migración creada como ARCHIVO; aplicación a remoto = owner. Previo: Fase 0 (sesión XIV) con inventario y veredicto de schema.

**S1 — DDL + selects** (DoD ✓: build verde; migración validada estáticamente — patrones idempotentes copiados de 20260604120000; selects con farm_id; cero render):
- Nueva `supabase/migrations/20260918200000_agro_period_cycles_farm_id.sql`: add column farm_id (FK agro_farms, on delete set null) + drop único parcial `(user_id, period_year, period_month)` y create `(user_id, farm_id, period_year, period_month) WHERE deleted_at IS NULL` + índice user+farm. Backfill: null = bucket Vista general (D-30-2). Comentario in-migration: NULLs no colisionan en único de PG → guard app cubre VG.
- `agro-period-cycles.js`: farm_id añadido a selects de ciclos operacionales, movimientos y agro_period_cycles (rama principal y fallback sin deleted_at).

**S2 — Lectura plana** (DoD ✓: build verde; grep cero linked/unlinked/"Vinculados a cultivo"/"Generales de la finca" en el módulo — exit 1; counts/estado sin cambio):
- Retirada la partición de: `buildOperationalMovementRow` (association+cropId fuera), `buildOperationalActivityIndex` (association del cycleIndex + linked/unlinkedCycleCount), `buildCycleViewModel` (arrays linked/unlinked + counts), `buildSnapshotMeta` (celda "Asociados / Generales"), `buildCompareMetrics` (2 métricas del comparador + vars). El `<details>` "Ver desglose por vinculación a cultivo" reemplazado por `renderFlatMovementSection` — sección plana "Movimientos del período" (contador + lista única por fecha/tipo, top-3 + "+N más" existente). `renderGroupCard` eliminado. Copys: subtitle calendario ahora "…en una sola lectura plana por tipo y fecha".
- CSS higiene (§11.7): fuera `__group-copy` (lista compartida), `__groups-details`, `__groups-toggle` (+marker/::before/details[open]/hover) y `.is-linked`/`.is-unlinked`. `__group(s)/__group-head/__group-title/__group-count/movement-*` se conservan (los reutiliza la lista plana).

**S3 — Scoping por finca + creación** (DoD ✓: build verde; crear sin finca imposible — select `required` con placeholder disabled + throw explícito en `createPeriodCycleFromDraft`; mes duplicado solo dentro de la MISMA finca — guard `monthKey+farm_id`, index DB con farm_id lo respalda; Vista general sin filtro = agrega todo):
- Estado `selectedFarmId` ('' = Vista general) + helpers `getFarmsList`/`defaultDraftFarmId` (fuente `window._agroFarms.getFarms()`, importado en bootstrapAgro — index.html:3404; guard optional-chaining si aún no cargó).
- `fetchPeriodCycles(userId, farmId)`: `.eq('farm_id')` solo con finca elegida (VG incluye null + todas). `fetchOperationalPeriodActivity(userId, farmId)`: D-30-1 COALESCE — con finca elegida, query de `agro_crops(id,farm_id)` y criba `cycle.farm_id || crop.farm_id === farmId`; VG sin criba.
- `mergePeriodCycles`: guard primer-gana para filas persistidas (VG puede traer 2 períodos del mismo mes en fincas distintas: la card del mes toma el más reciente por created_at; el otro sigue visible/editable bajo su chip — decisión declarada, documentada abajo).
- Chips de finca `renderFarmFilter` (Vista general primero, patrón §4.5; touch ≥44px, 150ms, focus-ring, tokens; visibles salvo schemaMissing) en renderRoot bajo el header. Handler `[data-period-farm]` → set + refresh.
- Modal de creación: campo Finca obligatorio (select), pre-select si hay una sola finca (al abrir y en resetForm); payload con farm_id; select escucha por `change` (drafts de select no disparan input en todos los navegadores).

**S4 — assertOperationalPeriodOpen(farmId)** (DoD ✓: build verde; firma retrocompatible — farmId opcional default ''):
- `agro-period-cycles.js`: param `farmId`, normalizado; `.eq('farm_id')` en ambas ramas (con/sin deleted_at) solo cuando viene; selects ahora incluyen farm_id.
- Call sites: Cultivo wizard — assert REORDENADO tras resolver crop/cropFarmId y pasa `farmId: cropFarmId` (cultivo legacy sin finca → VG, D-30-1); Finca wizard — `farmId: state.farmId || ''` (D-2 ya exige finca en CREAR); compositor agroOperationalCycles create/update — `farmId: payload.farmId || ''`. Personal wizard SIN cambio por diseño (partición orphan no conoce finca).

**Compatibilidad pre-migración (declarada)**: si el código se despliega antes de aplicar la migración, la vista de períodos degrada honesta al panel "Falta la base de datos… aplica la migración canónica" (isSchemaMissingError matchea 'column agro_period_cycles.farm_id does not exist'); los wizards NO se rompen (assert trata el error como schema-missing → allowed). Código y migración deben viajar juntos.

**Verificación estática final**: `pnpm build:gold` ✅ verde (por etapa y final). Grep partición = 0 en el módulo. Bundle dist lleva S3 (`Filtro de finca`, `La finca del ciclo es obligatoria`, css `farm-filter` en agro-period-cycles-*.css). Tamaños: módulo 1594L JS / 915L CSS (límites §11.X OK). Cero cambios en computeCropFinances/cards de cultivo/lector canónico/reportes/rankings (crop_id intacto — alcance A).

**QA sugerido (owner)**: (1) aplicar migración a remoto ANTES del QA de la vista; (2) Operaciones de la Finca → chips Vista general + fincas; cards con lista única "Movimientos del período" sin rastro de Vinculados/Generales; (3) crear período: finca obligatoria (placeholder "Elige la finca…"), pre-select con una sola finca; duplicado mismo mes+finca bloqueado, mismo mes en otra finca permitido; (4) chip por finca → solo sus períodos y su actividad (incluye ciclos ligados a cultivos de esa finca sin farm_id propio — COALESCE); (5) Vista general → agrega todo (card por mes; dos fincas mismo mes: card = fila más reciente, la otra bajo su chip); (6) wizards Finca/Cultivo/Personal registran normal y el período resuelto corresponde a su finca; (7) Dashboard Bloque 4 y costos del ciclo de cultivo SIN cambio.

**NO se hizo (scope respetado)**: git (bloques sugeridos abajo, código y migración por separado); aplicación de la migración a remoto (owner); S5 documental GATEADO (MANIFIESTO §4.3/§4.4/§4.5.2 + FICHA §5 a palabra del owner); etiquetas de finca en las cards (no pedidas — la card de VG con dos fincas en el mismo mes usa el nombre de la fila más reciente); QA runtime (ley §5).

**Bloques git sugeridos (NO ejecutados)**:
```bash
git add supabase/migrations/20260918200000_agro_period_cycles_farm_id.sql
git commit -m "feat(db): ANEXO 30 S1 — farm_id en agro_period_cycles (FK agro_farms, on delete set null) + único parcial (user_id, farm_id, period_year, period_month); backfill null = bucket Vista general (D-30-2)"
```
```bash
git add apps/gold/agro/agro-period-cycles.js apps/gold/agro/agro-period-cycles.css apps/gold/agro/agro-facturero-cultivo-wizard.js apps/gold/agro/agro-facturero-finca-wizard.js apps/gold/agro/agroOperationalCycles.js
git commit -m "feat(agro): ANEXO 30 S2-S4 — períodos como libro de finca: lectura plana sin partición por cultivo + chips de finca (Vista general / COALESCE D-30-1) + creación con finca obligatoria (guard mes+finca) + assertOperationalPeriodOpen con farmId en wizards y compositor"
```

---

## Sesión 2026-09-18 (XVI) — ANEXO 30 QA-fix: chips vacíos + lectura debe ser solo de generales

Agente: GLM (ZCode). QA owner 23:13 ROJO con dos hallazgos en `#view=period-cycles&subview=calendario`. Previo: S1→S4 commiteado por el owner (`abee3288` migración, `145cda3c` código, `299c4c40` archivos faltantes) y migración APLICADA a remoto (la vista ya renderizaba). Git NO ejecutado.

**Regla aclarada por el owner en QA (cerrada)**: la lectura de Operaciones de la Finca (lista, métricas, snapshot, comparador, VG y por finca) filtra SOLO ciclos/movimientos SIN vínculo a cultivo (`crop_id null`). Lo ligado a cultivo SIGUE en la DB, alimenta §4.3 costosTotales + Dashboard Bloque 4 (lectura directa de tablas) y se lee en las superficies del cultivo. Filtro de lectura, no migración. Para S5 GATEADO: MANIFIESTO §4.4 = lectura de operaciones GENERALES de la finca por período.

**(a) Chips vacíos — causa raíz**: bug de mapeo propio de S3. `renderFarmFilter` construía `chips = [{id:'',label:'Vista general'}, ...farms]` donde `getFarmsList()` devuelve `{id, name}` — el template lee `chip.label` → las fincas renderizaban `undefined` → círculos sin texto (el botón funcionaba: id/is-active/aria correctos; solo la etiqueta moría). La forma real del cache es `.select('*')` de `agro_farms` (agro-farms.js:83) → campo `name` confirmado. **Fix**: mapeo explícito `farms.map(f => ({id: f.id, label: f.name}))`; `getFarmsList` ya traía fallback honesto 'Finca sin nombre' para nombres vacíos. Cero CSS (las pillas se llenan solas).

**(b) Lectura solo generales — punto único**: `fetchOperationalPeriodActivity` (agro-period-cycles.js:~405): filtro `.is('crop_id', null)` EN la query de ciclos operacionales — los movimientos se criban por herencia (`.in('cycle_id', cycleIds)` de ciclos ya filtrados; crop_id vive en el CICLO, no en el movimiento, DDL 20260416190000). Al excluir lo ligado a cultivo, el COALESCE de D-30-1 degenera a `cycle.farm_id` sobre filas crop-null → la query extra de `agro_crops` se ELIMINÓ (simplificación honesta, misma semántica). Composición: VG (farmId='') = todos los generales incluidos los sin finca (Personal, bucket D-30-2); chip de finca = generales con ese `farm_id`. Counts/activeCycleCount/vigencia §4.4, snapshot, comparador y meses derivados heredan el filtro por construcción (todos beben del mismo activity map); los meses con SOLO actividad ligada a cultivo dejan de generar cards derivadas (correcto: la lectura del período no los conoce). Copys: subtitle calendario, título de sección plana ("Movimientos generales del período"), empty copy de la lista y empty-state del módulo actualizados a "movimientos generales de la finca". Creación de períodos y `assertOperationalPeriodOpen` SIN cambio (escriben igual — el assert ni siquiera lee movimientos).

**(c) Superficies del cultivo — cero diff verificado**: `git status`/`diff --stat` de la sesión = SOLO agro-period-cycles.js (17+/19−). Sin tocar: `agro-dashboard-v11.js` (`fetchOperationalExpensesDirect` sigue `.eq('crop_id', cropId)`), bridge `_agroMergedOperationalExpensesByCrop` de agro.js (cards de Mis Cultivos / costosTotales §4.3), `agro-facturero-cultivo-wizard.js` (lector canónico preset crop), `agro-crop-report.js` (:742-751 por crop_id), rankings RPC.

**Resultado de build**: `pnpm build:gold` ✅ verde. Greps: `.is('crop_id', null)` presente; query `agro_crops` ausente del módulo (exit 1); mapeo `chip.label` correcto.

**QA sugerido (owner)**: (1) chips con nombres reales de finca, cero vacíos; con una sola finca, pre-select del modal + chips coherentes; (2) el período muestra "bomba de riego" pero NO "kilo de maíz" ni "Fertilizante urea"; métricas/snapshot/comparador cuentan solo generales; (3) chip por finca y Vista general componen el filtro; (4) la card del cultivo sigue mostrando sus gastos ligados y el Dashboard Bloque 4 no cambia; (5) registrar un gasto general aparece en el período; uno ligado a cultivo aparece solo en el cultivo.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); S5 documental GATEADO; cambios en superficies del cultivo (cero diff); CSS (no exigido por el fix); QA runtime (ley §5).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-period-cycles.js
git commit -m "fix(agro): ANEXO 30 QA-fix — chips de finca con nombre real (mapeo label) + lectura del período solo con movimientos generales (crop_id null en query, COALESCE degenera a farm_id, copys a generales)"
```

---

## Sesión 2026-09-18 (XVII) — ANEXO 30 QA-fix 2: throw en cadena de navegación — PARO por regla (sin causa estática en HEAD)

Agente: GLM (ZCode). QA owner 23:24 ROJO: hash `#view=facturero-clientes` con contextbar "Volver | Operaciones de la Finca" y cuerpo 100% vacío. Previo: QA-fix commiteado (`fdf653b3`). **Resultado de la sesión: PARO honesto — el punto (d) del DoD (reproducir estáticamente la ruta del throw) FALLA: en HEAD no existe throw alcanzable para esa navegación. Cero edits, cero git.** Regla de paro del prompt aplicada literalmente.

**Trazado completo (todo con archivo:línea verificado)**:

(a) **Estado vivo**: HEAD = `fdf653b3` (QA-fix). dist local (23:19) lleva los marcadores del QA-fix ('Movimientos generales del per…' en `agro-period-cycles-9qZ-MmBm.js`; cero `agro_crops` en el chunk). El bundle que el owner sirvió a las 23:24 no es verificable desde aquí.

(b) **Listeners globales del módulo de períodos** (agro-period-cycles.js): exactamente DOS — `document 'data-refresh'` (:1474) y `window 'agro:operational-portfolio-updated'` (:1479), ambos con guard `if (state.mounted)` y `void refreshPeriodCycles()` cuya ejecución es 100% try/catch/finally con `renderRoot()` null-guard (`if (!state.root) return`). Los listeners de root (click/input/change/submit) viven en `#agro-period-cycles-root` y mueren con el nodo. **No existe camino global sin guard; el "fix mínimo" sugerido (guard de vista activa) no tiene defecto real sobre el que aplicar** — el guard YA es `state.mounted`.

(c) **Cadena setActiveView** (agro-shell.js:1283-1320): hash `writeViewToHash` :1298-1300 (replaceState, try/catch — nadie escucha hashchange en toda la app, grep 0 matches) → `syncRegions` :1301 → `syncViewButtons` :1302 → `applyViewEffects` :1303 (switchTab condicionado, updateAccordionState/syncCultivosSubview/focusTarget todos null-guard :750-784, :846-881) → `setMobileHub` :1305 + `setShellDepth` :1308 (**único escritor del título de contextbar**, :1068-1069) → **dispatch view-changed :1312 como ÚLTIMA sentencia**. Una excepción en un listener aborta a los posteriores (el montaje del módulo destino muere → cuerpo vacío), pero SIEMPRE DESPUÉS de que el título se actualizó.

(d) **Reproducción estática: IMPOSIBLE en HEAD**. El estado reportado (hash nuevo + título VIEJO + región conmutada pero sin montar) exige un aborto en la ventana :1300-:1308 (post-hash, pre-setShellDepth) — y TODA esa ventana es null-safe verificada línea a línea. Los 13 listeners de `agro:shell:view-changed` fueron auditados: ops-legacy :4029 (para facturero-clientes termina en `closeComposerModal→return` tras `syncStandalonePeriodCyclesView` → `unmountAgroPeriodCycles` → `resetForm` → `defaultDraftFarmId` → `getFarmsList` — cadena segura), section-stats :895 (guard subview==='stats'), clients :1050 (guard), 3 wizards :113/:118/:124 (sleep en `destroyWizard`), taskCycles, reports-center, cycles-workspace :610 (corre en toda navegación desde antes de ANEXO 30), rankings del shell :395 (difiere a rAF — async, no puede abortar el dispatch), agro.js :13392, memory-workspace :249 (QA GREEN ANEXO 29). En la ruta de boot con hash (:1608, preserveDepth → setShellDepth saltado en :1308 y ejecutado recién en :1620-1623 DESPUÉS del dispatch), un throw en listener sí produciría título viejo + cuerpo vacío — pero el título rancio sería el default del markup ("Módulo"), no "Operaciones de la Finca": mismatch parcial.

**Diagnóstico residual (2 hipótesis, ninguna confirmable sin evidencia del owner)**: (1) **despliegue desincronizado** — chunks de dist mixtos (CDN/caché del navegador) con shell viejo + módulos nuevos; el historial del proyecto ya documentó "races de deploy" (saga factureros); un Ctrl+Shift+R lo revelaría si el ROJO desaparece. (2) excepción async/invisible al análisis estático (extensión, etc.). **NO se aplicó fix**: sin evidencia, parchar los globals del módulo (ya guardados) o envolver el shell sería maquillaje (§8.8 causa raíz; §8.5 verdad antes que apariencia).

**Evidencia requerida del owner (1 mensaje)**: (1) texto+stack EXACTO del error rojo en consola DevTools en el momento del ROJO; (2) el repro fue click en puerta o F5/hash directo; (3) retry con Ctrl+Shift+R (hard refresh) — si el bug desaparece, es skew de caché de chunks, no código.

**Matriz estática de navegación (DoD parcial, sin runtime)**: en HEAD, para period-cycles → facturero-clientes (y reversa) y puertas Inicio/Granja/Memoria/Menú: click de puerta → setActiveView completa SIEMPRE (título contextbar correcto en :1308) salvo aborto en :1300-:1308 (ventana null-safe) — la única forma de cuerpo-vacío en HEAD es excepción de listener en el dispatch :1312 (montaje del destino abortado), que deja título CORRECTO, no viejo.

**Resultado de build**: `pnpm build:gold` ✅ verde (árbol sin cambios de esta sesión: 0 diffs más allá de `.freebuff/` untracked).

**NO se hizo (scope respetado)**: cero edits de código; cero git; no se tocó el shell ni los globals del módulo de períodos (sin causa raíz demostrada); QA runtime (ley §5).

---

## Sesión 2026-09-18 (XVIII) — ANEXO 30 QA-fix 2 (continuación): causa raíz del ROJO intermitente = ventana de deploy + caché de chunks (producción sana, código sano)

Agente: GLM (ZCode). Dato nuevo del owner: el ROJO aparece al ACTUALIZAR (F5) en `#view=facturero-clientes`, es INTERMITENTE ("a veces sí carga correcto"), y la contextbar muestra el título rancio "Operaciones de la Finca". Cero edits, cero git.

**Investigación con artefactos reales de producción (curl, solo lectura)**:
- Index desplegado (`/agro`, 192KB) referencia entry `assets/agro-BgOEZhu3.js`; mi dist local (build 23:19) produce `agro-CBtFp3SI.js` — artefactos distintos (builds distintos de la misma fuente; el build de producción lo generó el owner al desplegar).
- Chunk de períodos desplegado `agro-period-cycles-DxqVJC-S.js` (vía dep-map del entry): **contiene los marcadores del QA-fix** — "Movimientos generales del período" ✓, "Filtro de finca" ✓, "Elige la finca del período" ✓, "La finca del ciclo es obligatoria" ✓, "Vinculados a cultivo" = 0 ✓. Byte-distinto del local (grafos de build difieren) pero lógicamente equivalente. **Producción SÍ ejecuta el QA-fix.**
- Todos los chunks del set desplegado responden 200 (probes: facturero-clientes-view, monolito, clients, farms) — el set desplegado es autoconsistente.
- **Cabeceras**: index `cache-control: public, max-age=0, must-revalidate` ✓; assets `max-age=31536000, immutable` ✓; `last-modified: Sat, 19 Sep 2026 03:24:27 GMT` = **18-sep 23:24:27 local (UTC-4)**.

**Síntesis causal**: el owner desplegó el QA-fix a las 23:24:27 local y su captura del ROJO es de las 23:24:38 — **once segundos después**. El navegador venía de la sesión 23:13 con el build anterior cacheado (S1→S4: chips rotos, "Movimientos del período"). Durante la ventana de deploy, un F5 pudo combinar index/chunks viejos cacheados con el set nuevo purgado → algún `import()` dinámico 404 → el bootstrap lo traga (`import('./...').catch(err => console.warn('[AGRO] ... module load error:', err.message))` en index.html bootstrap, ~:3487-3533) → vista sin montar, SIN UI de error. La intermitencia ("a veces sí") = qué chunks conservaba aún el caché del navegador. El título rancio de la contextbar es la huella de ejecución mixta de versiones en esa pestaña — **estáticamente irreproducible con el código vivo** (verificado línea a línea en sesión XVII: el boot de HEAD pone "Facturero de Clientes" sincrónicamente en :1621-1623).

**Clasificación**: incidente de despliegue/caché, no bug de código. El único defecto de software expuesto es de RESILIENCIA (no de lógica): fallos de carga de módulos de vista son silenciados con console.warn y dejan cuerpo vacío sin retry ni mensaje. Propuesta declarada (requiere palabra del owner, es infraestructura-adyacente): endurecer el bootstrap — 1 retry del import y, si la vista del hash activo falla, toast con acción Recargar. NO aplicado en esta sesión.

**Acción del owner**: (1) UN Ctrl+Shift+R en la pestaña → set consistente; (2) verificar en `#view=period-cycles` que los chips ya tienen nombres (el fix está en producción desde 23:24) y el período solo muestra generales; (3) repetir F5 simple 3-4 veces en `#view=facturero-clientes` — con el deploy asentado debe ser estable; (4) si algùn día reaparece un cuerpo vacío: la línea `[AGRO] <X> module load error:` en consola nombra el chunk exacto — con ese texto se vuelve trazable en minutos.

**Resultado de build**: n/a (cero cambios; build de registro en sesión XVII verde).

**NO se hizo (scope respetado)**: cero edits; cero git; no se endureció el bootstrap sin autorización; no se auditó el código de builds históricos cacheados (innecesario: la clase de incidente está confirmada con cabeceras y marcadores).

---

## Sesión 2026-09-19 (I) — ANEXO 29 QA-fix: asistente mobile (sidebar/drawer/header/compositor) + markdown mínimo

Agente: GLM (ZCode). QA owner 18-sep 22:13/22:14 (mobile, capa IA): sidebar apilada sobre el chat, header gigante duplicado, markdown crudo con asteriscos, compositor tras la tab bar, ítem de historial clipado. Git NO ejecutado. Previo: árbol en `fdf653b3` (ANEXO 30 QA-fix) con reporte pendiente de commit.

**Cambios (6 archivos, cada uno declarado)**:

| Archivo | Cambio |
|---|---|
| `agro/agro-assistant-ui.js` | **Markdown mínimo en burbujas (global, defecto 3)**: `renderTextPart` por líneas con `escapeMarkdownText` (& < > ANTES de todo) + `renderInlineMarkdown` (**x**→strong, *x*→em, únicas tags generadas por nosotros); `- x`→ul/li; `#{1,6} `→texto sin hashes; code fences intactos vía `splitMessageParts`+`textContent`; fallback textContent si el cuerpo queda vacío. Persistidos re-renderizan limpio (mismo camino). **Fix preexistente declarado**: el regex de fences traía backslashes dobles desde el monolito (`git show a1274f84^:agro.js:15256` = `\\n`/`[\\s\\S]`) y NUNCA matcheaba fences reales (``` como texto plano desde antes de ANEXO 25); corregido a `\n`/`[\s\S]` — los fences vuelven a ser bloques Copiar. |
| `agro/index.html` | Botón `#ast-history-toggle` ("Historial") en `.ast-sidebar-actions` junto a Nueva/AgroRepo (defecto 1: drawer móvil). |
| `agro/agro-memory-workspace.js` | Wiring del drawer (B1: assistant.js congelado; mismo patrón que #ast-open-agrorepo): toggle → `setAssistantDrawerOpen` importado de ui.js (sin ciclos: ui no importa nada) + aria-expanded; click en un thread cierra el sheet; Escape ya cerraba (binding existente del core). |
| `agro/agro-assistant.css` | **≤768 reescrito**: header compacto en UNA fila (eyebrow+descripción fuera, icono 34px, título con ellipsis, acciones a la derecha — identidad única, defecto 2); sidebar = fila compacta de acciones [Nueva · AgroRepo · Historial] ≥44px (brand/label/lista ocultos, defecto 1); `.ast-sidebar.open` = bottom sheet fijo (78dvh, brand+X+lista+footer visibles dentro, defecto 1); thread en UNA línea (título ellipsis + fecha nowrap, defecto 5). ≥769: botón Historial oculto (desktop lista fija) y cero reglas nuevas fuera del media → desktop intacto. |
| `agro/agro-assistant-chat.css` | **Defecto 4**: `body[data-agro-memoria-layer="ia"] .ast-input-area { bottom: calc(tabbar-height + gap + safe-area) }` (solo capa IA donde la barra vive como salida; en rag no aplica) ≤768. Fix stale post-MF-1: `.ast-input-hint` volvía a column con un solo hijo → row (contador a la derecha por margin-auto). Estilos ul/li del markdown (marker dorado). |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Este INGEST. |

**Harness sobre funciones REALES (10/10 PASS)**: import de ui.js con stub mínimo de document; negrita/itálica/lista/heading exactos; fence con asteriscos literales intactos vía textContent; XSS `<img onerror>`+`<script>`+`&` escapados (`&lt;...&gt; &amp;`); bold dentro de li; re-render determinista. Harness temporal eliminado.

**Resultado de build**: `pnpm build:gold` ✅ verde (2.34s; CSS nuevo sin hex/rgba fuera de var() — shadow envuelto en `var(--overlay-shadow, ...)`).

**Declaraciones honestas**: (1) DoD listaba "ui.js + CSS" — se sumaron index.html (botón del drawer) y workspace js (wiring, B1), justificados por los propios defectos 1/5. (2) El sheet de historial no tiene backdrop: cierra por X, Escape o selección de thread (declarado). (3) aria-expanded del toggle puede quedar rancio si el drawer se cierra por Escape; se auto-corrige en el próximo toggle (lee el estado real de clases). (4) Fence-fix cambia el render de mensajes viejos que contenían ``` (pasan de texto plano a bloque Copiar) — mejora, declarada. (5) QA runtime no ejecutado (ley §5).

**QA sugerido (owner)**: móvil: Memoria→IA muestra header de una fila + fila de acciones + conversación protagonista sin scroll previo; botón Historial abre sheet con ítems en una línea y cierra al elegir; Nueva/AgroRepo accesibles; compositor SOBRE la tab bar (≤480 también); mensaje con **negritas** limpio (móvil y desktop); code fence con botón Copiar; desktop sin cambios; consola limpia.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); Edge/prompt del modelo; rutas/aliases; capas rag; retrieval/citas; sidebar desktop.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-assistant-ui.js apps/gold/agro/index.html apps/gold/agro/agro-assistant.css apps/gold/agro/agro-assistant-chat.css apps/gold/agro/agro-memory-workspace.js
git commit -m "fix(memoria): ANEXO 29 QA-fix — asistente mobile protagonista (sidebar→fila de acciones + historial en bottom sheet, header compacto, compositor sobre tab bar, thread en una línea) + markdown mínimo en burbujas con escapes + regex de fences reparado (preexistente)"
```

---

## Sesión 2026-09-19 (II) — ANEXO 29 S4: cierre documental ( Memoria conectada en canónicos) + daily log 18-sep

Agente: GLM (ZCode). S4 desbloqueado por orden del owner tras commitear el QA-fix mobile+markdown. MODO documental. Git NO ejecutado. Daily log actualizado y **fuera del bloque git** (owner: "no se sube" — además estructural: `gitignore:166 apps/gold/docs/ops/daily-log-*.md`).

**Cambios (6 documentos)**:

| Documento | Cambio |
|---|---|
| `MANIFIESTO_AGRO.md` | §3.1: Memoria conectada como superficie principal (IA hogar + AgroRepo capa interna). §4.10 "Relación con el resto": vive dentro de Memoria conectada; la IA busca por relevancia y cita las notas consultadas con enlace. §4.11: el asistente es el hogar de Memoria conectada; nueva viñeta de citas "Contexto consultado" (sin citas inventadas si no hay respaldo). §4.12.4: puerta Memoria abre directo sin pantalla intermedia + excepción canónica de módulo profundo (capa IA conserva barra del hub; capa bitácora Volver→asistente; ninguna capa sin salida). Prosa semántica, cero técnica. |
| `ADN-VISUAL-V12.0.md` | §9 bloque Memoria: de "AgroRepo · Asistente IA" al workspace por capas (puerta directa a módulo profundo, IA hogar fullscreen con barra del hub como salida, AgroRepo capa interna con Volver→IA). |
| `FICHA_TECNICA.md` | §4.2: bullet de funcionalidad Memoria conectada; módulos `agro-memory-retrieval.js`, `agro-memory-workspace.js` + familia completa `agro-repo-app/search/storage/templates` y `agrorepo.js` (deuda de Fase 0 saldada); CSS `agro-memory-workspace.css` y `agro-repo.css`; claves localStorage (`YG_AGRO_MEMORIA_PANEL_V1`, `agrorepo_mvp_v1` + legacy + UI); §8: routing hash del workspace (subview ia/rag, aliases coercitivos, remap de favoritos, persistencia). |
| `AGENTS.md` | §3.2: agro-memory-retrieval.js y agro-memory-workspace.js en la lista de módulos. |
| `docs-agro.html` | Cards: "Asistente IA" → "Memoria conectada" (respuestas cruzadas + qué notas consultó con enlace); card AgroRepo referencia la superficie Memoria. |
| `llms.txt` | Bullet de Memoria conectada en Funcionalidades Agro (workspace por capas, citas, bitácora local). |

**Daily log**: `docs/ops/daily-log-2026-09-18.md` reescrito al día completo (existía solo con ANEXO 28 S5 de la mañana): ANEXO 29 saga completa, ANEXO 30, incidente de deploy, commits reales, PARO vivo de ANEXO 30 QA-fix 2, próximos pasos. No entra al bloque git (gitignore + instrucción del owner).

**Resultado de build**: `pnpm build:gold` ✅ verde (2.39s; check-llms OK).

**QA sugerido (owner)**: revisar prosa del MANIFIESTO (§3.1/§4.10/§4.11/§4.12.4) y docs-agro desplegado; el resto es referencia interna.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo, SIN daily log); ROADMAP (no estaba en el gate S4); código.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add AGENTS.md apps/gold/docs-agro.html apps/gold/docs/ADN-VISUAL-V12.0.md apps/gold/docs/FICHA_TECNICA.md apps/gold/docs/MANIFIESTO_AGRO.md apps/gold/public/llms.txt
git commit -m "docs(agro): ANEXO 29 S4 — Memoria conectada en canónicos (MANIFIESTO §3.1/§4.10/§4.11/§4.12.4, ADN §9, FICHA §4.2/§8 con familia agro-repo y claves, AGENTS §3.2, docs-agro, llms)"
```

---

## Sesión 2026-09-19 (III) — ANEXO 29 MF-2: asistente mobile inmersivo (fila de acciones real, compositor sólido, título completo)

Agente: GLM (ZCode). QA owner 19-sep 08:11 (mobile, capa IA): tres botones apilados a ancho completo + fila "Mensajes: N" consumiendo ~40% de pantalla antes del primer mensaje; compositor dejando ver mensajes a través (velo semitransparente); título truncado ("Asistente A…"). Micro-fix de edición mínima. Git NO ejecutado.

**Diagnóstico (causas raíz verificadas en código)**:

1. **Apilamiento**: `.ast-sidebar-actions` (agro-assistant.css:296) NO tiene `display` en base — es un bloque plano; la regla ≤768 de QA-fix 3 solo añadió `flex-direction: row`, no-op sobre un contenedor no-flex. Los botones `width:100%` apilaban en TODOS los anchos ≤768. Además `.ast-sidebar-footer` ("Mensajes: N") nunca entró a la lista de ocultos mobile.
2. **Compositor transparente**: la regla `body[data-agro-memoria-layer="ia"] .ast-input-area { bottom: calc(tabbar+…) }` desplazaba el sticky ~5.4rem hacia ARRIBA dentro de `.ast-main` (su scrollport por `overflow:hidden`), flotando sobre la conversación con fondo `rgba(8,8,8,0.95)` — los mensajes se veían a través del velo.
3. **Título truncado**: el badge "EN LÍNEA" (~64px) + 2 iconos de 44px + gaps exprimían el h2 "Asistente Agro" hasta el ellipsis en 360-375px (el Volver ya está oculto en memoria).
4. **Chips de ejemplo**: YA EXISTEN (`#ast-welcome` con 3 sugerencias tapeables, wiring delegado en agro-assistant.js:1176-1185 que envía al tocar) — cirugía 4 del scope declarada como ya satisfecha, sin cambios.

**Cambios (3 archivos)**:

| Archivo | Cambio |
|---|---|
| `agro/agro-assistant.css` | ≤768: `display: flex` en `.ast-sidebar-actions` (la fila horizontal por fin existe; botones `flex: 1 1 0` + `min-height: 44px` ya presentes); `.ast-sidebar-footer` agregado a la lista de ocultos mobile — "Mensajes: N" vive solo dentro del bottom sheet (la regla `.open` existente 0,3,0 lo re-muestra); `.ast-header-status` oculto ≤768 (terciario; el estado "Pensando..." ya lo comunica el typing indicator); label dual del botón Nueva: base `.ast-label-compact{display:none}` + swap ≤768 (`Nueva conversación` → `Nueva`, sin ellipsis). |
| `agro/agro-assistant-chat.css` | ≤768: `.ast-input-area` con fondo opaco `var(--bg-1)` (antes rgba 0.95); hack de offset sticky ELIMINADO y reemplazado por clearance en el CONTENEDOR: `body[data-agro-memoria-layer="ia"] .ast-main { padding-bottom: calc(tabbar + gap + safe-area) }` — con `bottom:0` el sticky queda saturado en reposo, el compositor ancla en posición natural sobre la tab bar sin flotar sobre la conversación y el strip despejado muestra el fondo opaco de `.ast-layout`. |
| `agro/index.html` | Botón Nueva con label dual (`<span class="ast-label-full">Nueva conversación</span><span class="ast-label-compact">Nueva</span>`). |

**Verificación estática (ley §5, QA runtime no ejecutado)**: sin reglas conflictivas en el monolito ni otros CSS (`ast-btn-*` sin matches legacy; `arw-sidebar-actions` es namespace del widget AgroRepo); JS del badge solo toca `textContent` (ui.js:365-370), nunca display; wiring del drawer (workspace.js:255-274) intacto. Desktop ≥769 sin cambios: todas las ediciones viven en `@media (max-width: 768px)` salvo `.ast-label-compact{display:none}` (clase nueva, sin efecto visual desktop).

**Resultado de build**: `pnpm build:gold` ✅ verde (2.79s; warning de chunk >500kB preexistente del monolito; UTF-8 OK).

**Declaraciones honestas**: (1) El ellipsis del h2 se CONSERVA como guard de anchos patológicos — con el badge oculto el título cabe completo desde 320px (verificado aritméticamente, no runtime); si el owner exige su eliminación total, es un follow-up de 1 línea. (2) En el sheet de historial abierto, la fila de acciones también queda horizontal (antes apilaba allí también) — mejora colateral, no pedida. (3) La banda mobile de acciones pasa de ~170px (3 botones + footer) a ~62px (1 fila). (4) QA runtime no ejecutado (ley §5).

**QA sugerido (owner)**: móvil → Memoria·IA: fila única [Nueva · AgroRepo · Historial] ≥44px, "Mensajes: N" ausente (visible solo al abrir el sheet de historial), título "Asistente Agro" completo, conversación protagonista visible al entrar; compositor opaco anclado sobre la tab bar sin ver mensajes detrás ni solape; chips del estado vacío envían al tocar; sheet abre/cierra con los 3 botones funcionales; desktop sin regresión; consola limpia.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); Edge Function, retrieval, citas, capas rag, desktop layout, markdown renderer (fuera de scope); chips nuevos (ya existían).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-assistant.css apps/gold/agro/agro-assistant-chat.css apps/gold/agro/index.html apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "fix(memoria): ANEXO 29 MF-2 — asistente mobile inmersivo real (display:flex que QA-fix 3 omitió: fila de 3 acciones en 1 línea, footer solo en sheet, compositor opaco con clearance de tabbar en contenedor en vez de sticky flotante, título completo sin badge) + label compacto Nueva"
```

---

## Sesión 2026-09-19 (IV) — ANEXO 29 MF-3: inmersión mobile sin scroll de entrada + un solo tab dorado

Agente: GLM (ZCode). QA owner 19-sep (mobile, capa IA): aún hay scroll de entrada — compositor bajo el pliegue, hueco muerto entre header global y card, welcome ~media pantalla. Referencia: superficie verde ("Agente IA — Publicar Cosecha") entra sin scroll. Ad-hoc del owner: "doble dorado" en la barra inferior del hub. Git NO ejecutado.

**Trazado (verificado en código, no asumido)**:

- **Causa estructural del scroll**: `.agro-memory-workspace` en flujo normal (`min-height: calc(100dvh - 140px)`) + `.asistente-dedicado` con `height: calc(100svh - 116px)` heredada de la vista standalone (el embed no la pisa) + `padding-bottom: 2rem+safe-area` de `depth="module"` en `.app-container` → página más alta que el viewport.
- **Hueco muerto**: `.header { padding: var(--spacing-lg) 0; margin-bottom: var(--spacing-xl) }` (agro-index-critical.css) + padding del workspace — desaparece ocultando el header global en Memoria.
- **Doble dorado (causa real)**: dos mecanismos marcan `.is-active` en la tab bar a la vez — `syncViewButtons` (agro-shell.js:1199) marca el tab Memoria vía `data-agro-view="memoria"`, y `syncMobileHub` conserva el hub previo activo (VIEW_TO_MOBILE_HUB sin entrada "memoria" POR DISEÑO, ANEXO 29 S2: conservar el hub para el Volver) → Inicio+Memoria dorados. Es conflicto visual de estado, no de estado en sí.
- **Identidad (PARO d)**: `applyHeaderIdentity` (agro.js:15302) aplica nombre/avatar UNA vez al boot leyendo `.user-profile .user-name` — sin MutationObserver; ocultar el header por CSS en Memoria no rompe wiring (y en Inicio nunca se oculta). No se activó el PARO.
- **Trampa ≤480 detectada**: `.asistente-dedicado .agro-assistant-workspace { min-height: calc(100svh - 104px) }` (≤480, después en cascada) habría clipeado el compositor dentro de la columna fija — neutralizada.

**Cambios (2 CSS, sin markup)**:

| Archivo | Cambio |
|---|---|
| `agro/agro-memory-workspace.css` | ≤768: header global `.agro-shell-header` oculto con flag de capa (ia y rag; §4.12.3); `#main-content.app-container` padding compacto y sin colchón inferior (id gana el empate con la regla depth="module" de agro.css, inyectado por JS después de los links); **columna fija capa ia**: workspace `height: calc(100dvh - tabbar - max(0.5rem, safe-area) - respiro)` (fallback svh) + `overflow:hidden`, panel ia `overflow:hidden` (el scroll de página muere ahí), `.asistente-dedicado` height:auto/min-height:0, `.agro-assistant-workspace` min-height:0; **un solo tab dorado**: `body[data-agro-active-view="memoria"] .agro-mobile-tabbar__item[data-agro-mobile-tab].is-active` neutralizado a look inactivo (el tab Memoria no tiene `data-agro-mobile-tab`, no le afecta; estado JS intacto). |
| `agro/agro-assistant-chat.css` | ≤768: regla de clearance MF-2 en `.ast-main` ELIMINADA (absorbida por la columna fija) con comentario de sucesión; `.ast-input-area` `flex:none` (anclado al final); `.ast-input` `overflow-y:auto` (grow interno del textarea, nunca scroll de página); **welcome compacto**: grid `auto 1fr` (icono 32px + título en una fila), descripción 0.78rem sin max-width (2 líneas), chips como pills `flex-wrap` con `min-height:44px` (§16), Configurar+Guía compartiendo fila (cada uno ≥44px), paddings reducidos. |

**Presupuesto vertical verificado aritméticamente (no runtime)**: 360×740 → workspace ≈646px; header card ≈51 + acciones ≈62 + compositor ≈71 → área de mensajes ≈461px; welcome compacto ≈314px (42.4% del viewport, dentro del objetivo "~40%"; en 390×844 baja a 37%). Compositor visible al entrar sin scroll de página.

**Z-index verificado**: sheet de historial `position:fixed` z140 (escapa del overflow:hidden — ningún ancestro con transform persistente; la animación de entrada `amwPanelIn` ya removió su transform al abrirse) > tab bar z126 > columna (sin z nuevo); modal z1000. Sin regresiones.

**Resultado de build**: `pnpm build:gold` ✅ verde (2.52s; UTF-8 OK; CSS procesado por esbuild sin errores).

**Declaraciones honestas**: (1) El welcome compacto no requirió markup: el grid reordena los 6 hijos existentes por auto-placement — diff sin HTML. (2) 42.4% ≈ objetivo ~40%: el texto canónico de los chips (MANIFIESTO §9.11, se envía íntegro vía data-suggestion) impide 2 pills por fila a 360px; si el owner exige ≤40% estricto, el follow-up sería acortar el texto visible (no el enviado). (3) La neutralización del tab dorado es CSS-only: el estado `.is-active` de Inicio sigue en el DOM (semántica Volver intacta; si mañana el tab-bar cambia de look hay que recordar este override). (4) Con el header oculto, la campana de notificaciones no es alcanzable dentro de Memoria — canónicamente correcto (§4.12.3), declarado. (5) Fallback `100svh` antes de `100dvh` para navegadores sin dvh. (6) QA runtime no ejecutado (ley §5).

**QA sugerido (owner)**: móvil 360 y 390 → Memoria·IA: entra SIN scroll (compositor a la vista sobre la tab bar), welcome compacto con pills tapeables, Configurar+Guía en una fila; enviar mensaje scrollea solo dentro del chat; abrir Guía crece hacia adentro; un solo tab dorado (Memoria) en la barra; Inicio/Granja/Menú conservan header; capa rag intacta con su Volver; sheet de historial abre encima; desktop sin cambios; consola limpia.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); markup (no hizo falta); capa rag, drawer, desktop, markdown, citas, retrieval, Edge (fuera de scope); acortar textos de chips (canónicos).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-memory-workspace.css apps/gold/agro/agro-assistant-chat.css apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "fix(memoria): ANEXO 29 MF-3 — inmersión mobile sin scroll de entrada (columna fija 100dvh-tabbar en capa ia con scroll interno del chat, header global oculto en Memoria §4.12.3, hueco muerto fuera, welcome compacto en grid, compositor flex-none anclado, clearance MF-2 absorbido) + un solo tab dorado en la barra del hub (look CSS-only, estado Volver intacto)"
```

---

## Sesión 2026-09-19 (V) — ANEXO 29 MF-4: pulido de textos y rename "Agente Agro"

Agente: GLM (ZCode). Micro-fix de pulido con decisiones del owner CERRADAS (no re-interpretadas). Git NO ejecutado.

**Trazado (a) — mapa exacto de "Asistente Agro" en apps/gold/**: solo 3 matches: `index.html:3652` (h2 header card, UI → renombrado), `index.html:3737` (welcome title, UI → eliminado con el bloque de título), `agro.js:14958` (comentario histórico de versión `// V9.5.6:`, NO UI → intacto por §7.5 y política de referencias históricas). PARO verificado: cero matches en `supabase/` (Edge) y cero en docs canónicos dentro del scope UI (docs-agro/llms/MANIFIESTO usan "Asistente IA"/"el asistente" — alcance del pase documental GATEADO).

**Cambios (index.html + agro-assistant-chat.css, CSS declarado como exigido por el pulido)**:

| Archivo | Cambio |
|---|---|
| `agro/index.html` | h2 → "Agente Agro"; welcome sin icono ni título (bloque retirado, decisión 1); desc → "Respuestas cruzadas de lo que ya registraste: cultivos, finanzas y bitácora." (ejemplo del owner verbatim); "Configurar asistente" → "Configurar"; summary "Guía de uso" → "Guía" con aria-label="Guía de uso" (contexto completo para lectores, ADN §16); placeholder → "Escribe tu consulta…" (21 chars, ejemplo del owner); `#assistant-mode-hint` vaciado (nodo conservado, sin texto). |
| `agro/agro-assistant-chat.css` | Reglas base `.ast-welcome-icon`/`.ast-welcome-title` y overrides mobile MF-3 eliminadas como huérfanas (misma higiene que MF-1 con kbd); grilla mobile `auto 1fr` conserva el emparejado Configurar\|Guía; chips `--text-secondary` → `--text-primary` (acción tapeable, ADN §2); fila estática `.ast-input-hint` fuera del flujo (`display:none`) y **cooldown como única línea helper**: `.ast-cooldown` visible solo con contenido (`:empty → display:none`), 0.65rem, `--text-muted`, alineado a la derecha — el nodo compat `#assistant-cooldown` NO se tocó (posición, id y escritura por `updateAssistantCooldownUI` intactos, lección ANEXO 27); countdown dentro del botón Enviar conservado (ANEXO 26). |

**Solución clave sin tocar agro-assistant.js**: `updateAssistantCooldownUI` ya escribe "Espera Xs"/"Limite IA: espera Xs"/"En cola (N)" en el nodo compat — en lugar de un observer espejo en ui.js (que violaría el contrato "render puro sin estado" de ese módulo), el CSS deja de ocultar el nodo y lo muestra solo cuando tiene texto. Cero JS nuevo, cero riesgo de carrera.

**Resultado de build**: `pnpm build:gold` ✅ verde (1.96s).

**DoD greps**: "Asistente Agro" en `apps/gold/agro/` → 1 match residual = comentario histórico agro.js:14958 (declarado no-UI); "Agente Agro" visible en el h2 del header (mobile y desktop comparten nodo); cero referencias JS/CSS huérfanas a `.ast-welcome-icon`/`.ast-welcome-title`/`#assistant-mode-hint`.

**Declaraciones honestas**: (1) La cadena "Asistente IA" NO se renombró — decisión 2 cubre literalmente "Asistente Agro"; queda visible en el brand de la sidebar ("Asistente IA" + sub "Agro", sheet de historial mobile y sidebar desktop) y en un botón `ygd-btn-ai` del dashboard (index.html:1026-1032): inconsistencia detectada y declarada, decisión del owner (rename de 2 líneas si la quiere). (2) El eyebrow "Centro de consulta Agro" y la desc desktop del header no contienen "Asistente Agro" → intactos. (3) La desc del welcome puede envolver a 2 líneas en 360px (76 chars) — es el ejemplo textual del owner, declarado. (4) QA runtime no ejecutado (ley §5).

**QA sugerido (owner)**: mobile y desktop → un solo título "Agente Agro" (header de la card); welcome abre con desc breve + chips (buen contraste, envían al tocar) + fila Configurar|Guía; input con placeholder corto; al enviar, la línea "Espera Xs" aparece bajo el compositor solo durante el cooldown y desaparece sin dejar hueco; countdown en el botón intacto; consola limpia.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); docs canónicos, docs-agro, llms.txt, MANIFIESTO (pase documental GATEADO); Edge Function; sidebar brand "Asistente IA" y botón dashboard "Asistente IA" (fuera de la decisión cerrada, declarados); markdown/citas/retrieval.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/index.html apps/gold/agro/agro-assistant-chat.css apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "fix(memoria): ANEXO 29 MF-4 — pulido de textos y rename Agente Agro (welcome sin título duplicado con desc breve, placeholder corto, helper cooldown-only vía :empty sobre nodo compat sin tocar JS, chips a text-primary, labels cortos Configurar/Guía)"
```

---

## Sesión 2026-09-19 (VI) — ANEXO 31 S1→S3: puertas reorganizadas (Inicio=Dashboard, Crear Finca en Granja, Mi Perfil en Menú)

Agente: GLM (ZCode). Skill de patrones de navegación leída antes de tocar nada (obligatoria). Previo: owner commiteó MF-2/3/4 (42da2317, 8464e03f, 202e8cea). Git NO ejecutado.

**Trazado (a)–(g) con evidencia archivo:línea**:

- (a) Hub intermedio = `#agro-mobile-panel-inicio` (index.html, 3 botones); a depth hub la regla global `body[depth="hub"] [region] { display:none !important }` (agro.css:9932) oculta TODAS las regiones en ambos breakpoints y muestra el hub (9936). Dashboard era vista-módulo (VIEW_CONFIG agro-shell.js:167) con contextbar vía setActiveView→setShellDepth('module') (:1308). Boot default usaba setShellDepth('hub') SIN gate flag (:1618) — el CSS de superficie necesitaba ese flag también ahí. Chip del header apuntaba a `/dashboard` (dashboard general de la plataforma, externo a Agro).
- (b) Auto-migración §4.13 corre AL BOOT: dashboard automonta (initDashboardV11 en bootstrap) → ensureFarms → `_agroFarms.loadFarms` → si 0 fincas, runAutoMigration crea "Mi Finca" default (agro-farms.js:117-123, 348+). NO solo al entrar a Mis Fincas. Comportamiento declarado, sin cambio semántico.
- (c) Mis Fincas NO tiene "+" interno: renderFarmsView (agro-farms.js:426) renderiza solo cards; el handler soporta `data-farm-action="create"`→openFarmModal('create') (:53) pero ningún botón lo dispara. El ítem del hub ES la entrada de creación (no redundante).
- (d) Menú: 3 links sueltos sin encabezados; patrón de títulos = `.agro-mobile-hub__section-title` (uppercase por CSS, agro.css).
- (e) Referencias: data-agro-view="dashboard" en rail (invisible ambos breakpoints), tile sidebar "Principal", perfil-actions "Dashboard" y Volver del asistente (oculto en memoria) — todas coercen al gate sin edición. Cero data-agro-view gate raros; cero set-view dashboard desde JS; agro-mode.js sin refs; keywords/favoritos reconciliados vía activateShellEntry.
- (f) FAB: regla hub-depth existente lo eleva sobre tabbar (agro.css ~9899) y app-container padding-bottom hub (~9617) despeja contenido; overlay flotante por diseño (igual que hoy sobre los panels). Sin solape real demostrable → sin fix, declarado.
- (g) Persistencia: gate key ya existía (YG_AGRO_ACTIVE_SHELL_GATE_V1); stored gate solo contenía hashViews reales. Volver de módulos → setShellGate(activeMobileHub) intactos; F5 por hash o stored gate → setShellGate.

**Cambios (3 archivos)**:

| Archivo | Cambio |
|---|---|
| `agro/agro-shell.js` | **S1**: `SHELL_GATE_ROUTES.dashboard → inicio` (coerción de rutas legacy #view=dashboard/favoritos view:dashboard, Lección 9: sin breakage); gate-check en `activateShellEntry` (favoritos/búsqueda) y en el click handler genérico `[data-agro-view]` (mirror del handler set-view); boot default `setShellDepth('hub')` → `setShellGate('inicio')` (unifica flag/hash/persistencia); `syncMobileHub` aplica aria-selected/tabindex solo a `role="tab"` (Inicio es botón plano — un tabindex=-1 lo sacaría del tab order). |
| `agro/agro.css` | **S1**: excepción `body[depth="hub"][gate="inicio"] [region="dashboard"] { display:block !important }` (specificity 3 attrs > 2 de la regla de ocultamiento) — el Dashboard es superficie de hub, sin contextbar; reglas de `.agro-header-dashboard-link` eliminadas como huérfanas (chip retirado). |
| `agro/index.html` | **S1**: panel-hub "Inicio" (3 botones) retirado; tabs Inicio (tabbar + strip desktop) sin role=tab/aria-controls (botón plano, precedente puerta Memoria); chip "Dashboard" del header retirado (apuntaba a /dashboard plataforma y duplicaba concepto; salida = logo). **S2**: Granja — "Crear Finca" entre Mis Fincas y Operaciones, despacha directo al flujo existente (`onclick _agroFarms.openFarmModal('create')`, mismo bridge que el welcome IA); Menú — grupo "MI CUENTA" con Mi Perfil + grupo "AYUDA" con Documentación/Soporte/Privacidad (section-title mayúscula de Mi Granja). |

**DoD verificado estáticamente**: `#view=inicio` muestra la región Dashboard (excepción CSS + montaje al boot — el dashboard se automonta independiente de la vista, PARO S1 despejado: ni bloques ni observer de identidad dependen de la vista); cero contextbar "Dashboard Agro" (dashboard nunca llega a depth module — toda entrada coerciona al gate); favoritos dashboard/perfil navegan sin error (gate-check; perfil sigue siendo vista-módulo); orden Granja exacto; greps de cierre limpios (solo el id del propio botón inicio); F5/Volver/persistencia intactos; focusTarget null-safe sin panel (verificado); cero listeners de gate-changed (seguro disparar al boot).

**Resultado de build**: `pnpm build:gold` ✅ verde (1.84s y 1.92s, dos pasadas).

**Declaraciones honestas**: (1) Chip header retirado (elección declarada): apuntaba al dashboard GENERAL de la plataforma (/dashboard), no al de Agro — dentro de Agro duplicaba el concepto; la salida a la plataforma sigue siendo el logo. (2) "Crear Finca" abre el modal directamente desde el hub ( Mis Fincas no tiene "+": el ítem ES la entrada, no redundante — decisión 2 anticipaba ambos casos). (3) Auto-migración de finca default corre al BOOT vía el dashboard (declarado en trazado b). (4) El tile del sidebar "Dashboard Agro" conserva su label (coherente: ES la superficie) y su is-active funciona (activeView='dashboard' en el gate). (5) Tabs operacion/menu conservan roving tabindex; inicio/memoria son botones planos en el mismo nav (precedente existente). (6) QA runtime no ejecutado (ley §5).

**QA sugerido (owner)**: usuario nuevo sin finca → Inicio muestra Dashboard con auto-migración corriendo; Inicio↔Granja↔Memoria↔Menú sin rutas rotas en mobile y desktop; cero hub de 3 botones y cero contextbar en Inicio; #view=dashboard (deep link viejo) aterriza en Inicio sin error; favorito dashboard navega; Granja: orden Mis Fincas·Crear Finca·Operaciones y el modal abre/guarda/cancela desde el hub; Menú: MI CUENTA separado de AYUDA y Mi Perfil abre; F5 conserva puerta; consola limpia.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); S4 documental GATEADO (MANIFIESTO §3.1/§4.12.4, ADN §9, FICHA §4.2, docs-agro/llms — a palabra del owner); rail desktop (invisible en ambos breakpoints, relicto declarado sin tocar); "+" interno en Mis Fincas (no pedido); capa rag/Edge/markdown.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/agro/agro-shell.js apps/gold/agro/agro.css apps/gold/agro/index.html apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "feat(agro): ANEXO 31 S1-S3 — puertas reorganizadas: Inicio=Dashboard directo (gate inicio renderiza la región, sin hub de 3 botones ni contextbar, coerción de rutas dashboard legacy), Crear Finca en Mi Granja (orden Mis Fincas·Crear·Operaciones, modal directo), Menú con MI CUENTA+AYUDA, chip Dashboard del header retirado"
```

---

## Sesión 2026-09-19 (VII) — PASE DOCUMENTAL CONJUNTO: auditoría de reconciliación (ANEXO 30/31 + rename) en canónicos

Agente: GLM (ZCode). Pase autorizado expresamente por el owner. **Hallazgo central declarado con verdad antes que apariencia (§8.5)**: al comenzar el trazado, el pase ya estaba **materialmente aplicado en el working tree** (4 documentos modificados sin commit y sin INGEST; la última sesión registrada era la VI). Esta sesión ejecutó entonces la **auditoría completa** contra la autorización, las verificaciones de cierre y el INGEST — **cero edits de contenido** en los documentos canónicos (los únicos añadidos de esta sesión son este INGEST y el daily log).

**Auditoría del diff (4 archivos, 66+/48-), punto por punto contra el alcance autorizado**:

| Punto del pase | Documento/Sección | Estado verificado |
|---|---|---|
| A1 puertas en §3.1 | MANIFIESTO §3.1 | ✅ Inicio=Dashboard directo (sin hub de 3 botones), Granja orden 1) Mis Fincas 2) Crear Finca 3) Operaciones de la Finca, Menú MI CUENTA/AYUDA, y nombre visible Agente Agro en Memoria |
| A2 puertas §4.12.4 | MANIFIESTO §4.12.4 | ✅ Las 4 puertas reales, incluida coerción transparente de `#view=dashboard` |
| A3 nota §4.2 | MANIFIESTO §4.2 | ✅ "Superficie de la puerta Inicio" (depth hub, sin barra contextual de Volver; 6 bloques y guía "Cómo empezar" intactos) |
| A4 hub en ADN §9 | ADN §9 | ✅ Orden con Crear Finca en Mis fincas y cultivos; Menú MI CUENTA + AYUDA |
| A5 shell en FICHA §4.2 | FICHA §4.2 | ✅ agro-shell.js: superficie de hub, coerción de rutas legacy y favoritos, hub de 3 botones retirado |
| A6 primer día §9.12 | MANIFIESTO §9.12 | ✅ Crear Finca desde la puerta Granja |
| A7 docs-agro/llms | docs-agro.html; llms.txt | ✅ docs-agro: las 4 puertas y el grupo Granja reconciliados; llms.txt: no menciona puertas ni el hub anterior → no aplica, declarado |
| B1 períodos §4.4 | MANIFIESTO §4.4 | ✅ "El libro de la finca": atado a finca, chips "Vista general"+por finca, creación con finca obligatoria y guard mes+finca, lectura de movimientos generales, cultivo en sus superficies; vigencia operativa intacta |
| B2 §4.3 lectura-vs-cómputo | MANIFIESTO §4.3 | ✅ Aclaración: costosTotales conserva gastos de finca ligados a cultivo vía lectura directa; la lectura plana del período no altera el cómputo |
| B3 §4.5.2 nota cruzada | MANIFIESTO §4.5.2 | ✅ Movimiento puede llevar cultivo para costos; el período lee solo generales |
| B4 FAQ §9.9 | MANIFIESTO §9.9 | ✅ Lectura general por finca |
| B5 FICHA §5 | FICHA §5 | ✅ agro_period_cycles: farm_id nullable FK, único parcial (user_id, farm_id, year, month) WHERE deleted_at IS NULL, backfill NULL = "Vista general" |
| C1 nombre visible §4.11 | MANIFIESTO §4.11 | ✅ "Agente Agro" como nombre visible; el nombre semántico permanece "Asistente IA" |
| C2 docs | docs-agro.html; llms.txt | ✅ Ninguno usa "Asistente Agro" como título visible; llms.txt mantiene el concepto semántico correcto |
| C3 cero código | working tree | ✅ El diff no toca ningún archivo de código |

**Reglas de escritura verificadas**: MANIFIESTO en prosa semántica humana (las URLs del patrón persistencia son el lenguaje de navegación ya establecido en esa sección); FICHA técnico preciso (tablas/columnas/rutas); ADN solo listas de navegación, cero cambio visual; sin logs ni diagnóstico contaminando los canónicos.

**Resultado de build**: `pnpm build:gold` ✅ verde (2.29s; check-llms OK).

**DoD greps de cierre (todos limpios)**: cero "Mi Perfil, Dashboard Agro y Crear Finca"; cero "agrupan TODAS las operaciones"; cero "Asistente Agro" como título visible en docs (las únicas menciones a "hub intermedio" son las negaciones correctas de la prosa nueva en §3.1 y §4.12.4).

**Declaraciones honestas**: (1) La autoría material de los edits del pase no es esta sesión — quedaron en el árbol sin INGEST; esta sesión los auditó en su totalidad contra la autorización y los da por conformes (§10.1: auditados antes de aceptar). (2) Los residuos UI "Asistente IA" (brand de la sidebar del asistente y botón del Dashboard) permanecen en código, pendientes de decisión del owner (C3). (3) git NO ejecutado. (4) QA runtime no aplica (documental) — el QA del owner es la lectura de prosa indicada en el DoD.

**NO se hizo (scope respetado)**: cero edits de contenido en los canónicos (ya conformes); cero código; ningún documento fuera de la lista autorizada; git (bloque sugerido abajo).

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/docs/MANIFIESTO_AGRO.md apps/gold/docs/ADN-VISUAL-V12.0.md apps/gold/docs/FICHA_TECNICA.md apps/gold/docs-agro.html apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "docs(agro): pase documental conjunto — canon reconciliado con producto vivo (ANEXO 31: Inicio=Dashboard directo, Crear Finca en Granja, Menú MI CUENTA+AYUDA · ANEXO 30: períodos como libro de la finca con farm_id y lectura de generales · nombre visible Agente Agro)"
```

---

## Sesión 2026-09-19 (VIII) — ANEXO 29 MF-5: pulido premium canon-compliant (contraste, profundidad tokenizada, --gold-soft-bg, indicador de tab)

Agente: GLM (ZCode). Relanzamiento tras PARO de carrera (el owner commiteó el pase documental como 3c4491a3 → gate (e) limpio). Ocho decisiones cerradas ejecutadas en orden §17 (ADN primero). Git NO ejecutado.

**Cambios (6 archivos)**:

| Archivo | Cambio |
|---|---|
| `docs/ADN-VISUAL-V12.0.md` | **D3/§17 paso 1**: subsección "Fondos dorados suaves" en §2 — `--gold-soft-bg: rgba(200,167,82,0.10)` + regla de uso (iconos/ilustración, nunca texto funcional ni borde en reposo), patrón del precedente `--text-ivory`. |
| `agro/agro-tokens.css` | **D3 paso 2**: `--gold-soft-bg` en la capa canónica; **D2**: `--shadow-dark` y `--shadow-focus` añadidos — son canon ADN §3 (:107-108) pero FALTABAN en la capa de tokens (completado, declarado). |
| `agro/agro-assistant-chat.css` | **D1**: guía de uso (summary + ul) a `--text-secondary`; **D2**: welcome y sugerencias sobre `--bg-2` opaco + `--shadow-dark`; **D3**: círculo `--gold-soft-bg` (--space-8, radius-pill) en `.ast-suggestion-icon`; **D5**: reposo `--border-neutral` en chips de sugerencia, chips de fuentes y botón Copiar (dorado solo hover/focus, ya existente); **D8**: paddings mobile en escala (welcome space-3/4, pills space-1/3). |
| `agro/agro-assistant.css` | **D1**: sub de brand a secondary; título del panel Contexto a `--text-primary` y sus section-titles a `--text-secondary` (antes dorados con opacidad — prohibido §2); `.ast-ctx-item strong` a dorado sólido; label "HISTORIAL" a `--gold-prestige` sólido (idioma de los section-title del hub); **D3**: tiles de icono (page-icon y brand-icon) a `--gold-soft-bg` — el brand-icon tenía gradiente (retirado); **D5**: `.ast-btn-history` reposo neutral; **D6**: fila de acciones con padding/radio unificado en escala (--space-2/3, --radius-md); **D2**: sheet de historial sobre `--bg-3` + `--shadow-dark` (antes overlay-shadow direccional custom). |
| `agro/agro-memory-workspace.css` | **D5/D6**: botón AgroRepo reposo `--border-neutral`, padding en escala, radius-md. |
| `agro/agro.css` | **D7**: indicador fino del tab activo — línea 2px `--gold-4` vía `::before` absoluto (top, centrada, --space-6 de ancho, radius-pill) sobre `.agro-mobile-tabbar__item.is-active` + `position: relative` en el item; texto+icono intactos (§16); sin JS. |

**D4 (compositor)**: verificación sin cirugía, como definió el relanzamiento — el wrap YA es neutral en reposo (`--border-neutral`) con ring dorado solo en `:focus-within`; el "doble anillo" percibido vivía en los botones adyacentes de la fila, ahora neutros.

**Resultado de build**: `pnpm build:gold` ✅ verde (2.40s; check-llms OK).

**DoD greps de cierre**: (1) Cero hex/rgba nuevo fuera de la capa de tokens — los únicos valores literales añadidos son las 2 DEFINICIONES en agro-tokens.css; el resto son fallbacks dentro de `var()` (patrón establecido). (2) Cero gradientes añadidos (la única mención es la palabra "gradiente" en un comentario). (3) Bordes dorados en reposo: los ítems de la decisión 5 (chips, AgroRepo/Historial, fuentes, Copiar) ahora neutros; restantes verificados uno a uno = estados :hover/:focus/:active, burbujas transitorias (typing/system/toast), `.ast-page-icon` (tile de identidad, fuera de la lista D5), `.ast-btn-outline` (canon §7 del modal de exportación) y trigger legacy sin referencias — declarados. (4) `--text-muted` restante = meta transitorio declarado: timestamps de threads/mensajes, fechas de citas, typing label, cooldown, stats del sheet, hints de estado vacío, label "Contexto consultado" y preview monospace del modal.

**Declaraciones honestas**: (1) `--shadow-dark`/`--shadow-focus` se AÑADIERON a agro-tokens.css porque el ADN §3 los documenta pero la capa no los tenía — completar canon, no inventar token. (2) `--space-N` viven en `assets/css/tokens.css` (capa global), no en agro-tokens.css — verificado antes de usarlos. (3) El indicador del tab usa 2px literal (valor explícito del owner). (4) `.ast-suggestion-icon` círculo de --space-8 (2rem) dentro de botón ≥44px — decorativo, touch intacto. (5) QA runtime no ejecutado (ley §5); reduced-motion intacto (línea estática, sin animación nueva).

**QA sugerido (owner)**: móvil y desktop → welcome y sugerencias con profundidad sobria (sin glow), iconos en círculos dorado-suave; chips/botones de fila/fuentes/copiar sobrios en reposo y dorados al hover; guía y labels legibles sin esfuerzo; sheet de historial sobre bg-3; tab activo de la barra inferior con línea fina dorada superior; compositor neutro que arma ring al focus.

**NO se hizo (scope respetado)**: git (bloque sugerido abajo); JS (indicador CSS-only); MANIFIESTO/FICHA/docs-agro/llms; burbujas transitorias y btn-outline canon (declarados, no listados en D5); dorados con opacidad fuera del asistente.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add apps/gold/docs/ADN-VISUAL-V12.0.md apps/gold/agro/agro-tokens.css apps/gold/agro/agro-assistant.css apps/gold/agro/agro-assistant-chat.css apps/gold/agro/agro-memory-workspace.css apps/gold/agro/agro.css apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "feat(dna): ANEXO 29 MF-5 — pulido premium canon-compliant (token --gold-soft-bg §2 + shadow-dark/focus completados en capa, contraste funcional secondary/primary, profundidad bg-2/3+shadow-dark en cards del asistente, bordes neutros en reposo con dorado solo hover/focus, fila de acciones en escala, indicador fino 2px del tab activo)"
```

---

## Sesión 2026-09-20 — AUDITORÍA PROFUNDA AGENTE AGRO + FASE 0/FASE 1 (Camino A autorizado por owner)

Agente: GLM (ZCode). Dos partes: (1) auditoría técnica de solo lectura del Agente Agro contra canon; (2) ejecución quirúrgica del paquete Fase 0 + Fase 1 (5 acciones, autorización expresa del owner incluyendo cambio canónico MANIFIESTO §8).

**Diagnóstico (auditoría)**: P0 privacidad (toggles no aplican al contexto que viaja a Gemini ni a respuestas de tools — agro-privacy.js es máscara DOM-only); P1-1 agregaciones sin normalizar moneda COP/USD/VES; P1-3 tools de cultivos sin `deleted_at=is.null` (papelera puede reaparecer); 4/9 módulos invisibles para la IA (Fincas, Tareas, Períodos, Clientes); sin historia multi-turn en el invoke; MAX_TOOL_STEPS=3; `agro_events` sin migración raíz. Versión/modelos Edge = FICHA_TECNICA (v10.0.0-agro-agent, gemini-2.5-flash-lite + gemini-3-flash) sin divergencia.

**Cambios (3 archivos)**:

| Archivo | Cambio |
|---|---|
| `supabase/functions/agro-assistant/index.ts` | **F0-1**: `deleted_at=is.null` en `get_my_crops` y `get_crop_status` (crops); query de `agro_events` con TODO comentado (columna no verificable sin migración raíz — NO se agregó el filtro, decisión fail-safe). **F0-2**: cláusula prompt "venta vía log_event ≠ ingreso facturado". **F1-2**: `normalizePrivacy` FAIL-CLOSED en serve (sin `privacy` en body → todo oculto); helper `applyPrivacy` (alias deterministas Cliente N para nombres; "oculto por privacidad" para montos; counts intactos); aplicación central en `functionResponse` para las 3 tools financieras; cláusula prompt anti-adivinación. **Endurecimiento Mimosa (exigido por hook de seguridad para desbloquear F1-2)**: `assertValidUuid` sobre `crop_id` del modelo en las 3 tools financieras (fail-closed: id inválido → error de tool, query no ejecuta) + filtro UUID de `origin_id` en `in.()` + guarda SSRF `assertAllowedSupabaseUrl` en `supabaseRequest` (origen anclado al Supabase de env, https salvo localhost dev). |
| `agro/agro-assistant.js` | **F1-1**: import de lectores canónicos `readBuyerNamesHidden`/`readMoneyValuesHidden` de agro-privacy.js (módulo hoja, sin circularidad); campo `privacy` en el body del invoke; `maskRepoMoneyInPlace` — regex anclada a divisa ($, COP, USD, VES, Bs + cifra) sobre excerpts de bitácora con montos ocultos → `[monto oculto]`. Nombres en texto libre NO se enmascaran (limitación documentada: sin NLP confiable). |
| `docs/MANIFIESTO_AGRO.md` | **F1-3 (autorizado)**: §8 "En qué superficies aplican" + Asistente IA (Agente Agro) con el texto exacto autorizado. Ninguna otra línea tocada. |

**Resultado de build**: `pnpm build:gold` ✅ verde (2.39s; agent-guard OK; check-llms OK; UTF-8 OK). Sintaxis Edge verificada estáticamente con esbuild (parse TS exit 0; deploy real lo hace el owner). Bundle verificado: `agro-assistant-*.js` contiene el campo `privacy` del invoke y el mask `monto oculto`; `agro-privacy-*.js` chunk independiente confirma el import resuelto.

**Verificación estática (sin QA runtime, ley §5)**: (1) queries revisadas una a una — crops con deleted_at, ledger ya lo tenía, events sin filtro documentado; (2) contrato del body: `{message, prompt, context, privacy:{hide_names,hide_money}}` — cliente viejo sin privacy cae en fail-closed; (3) ejemplo payload enmascarado: `get_pending_payments` con ambos flags → `by_client:[{client:"Cliente 1", total:"oculto por privacidad", count:3}]`, `totals:{active:"oculto por privacidad", transferred:"oculto por privacidad", grand_total:"oculto por privacidad"}`, `counts` numéricos intactos; (4) application point único (`functionResponse`) — el modelo jamás ve datos crudos de tools financieras cuando hay privacidad activa; (5) `assertValidUuid` dentro de try en los 3 handlers (error de tool recuperable, no 500).

**QA sugerido online (owner, tras deploy de la Edge)**: QA-1 papelera (cultivo eliminado → IA dice "no encuentro"); QA-2 venta semántica (aclara bitácora ≠ facturero); QA-3 nombres ocultos (alias Cliente N + payload `privacy.hide_names:true` en Network); QA-4 montos ocultos (sin cifras verbalizadas + `privacy.hide_money:true`); QA-5 fail-closed (invoke manual sin privacy → todo enmascarado); QA-6 canon §8 (línea exacta en MANIFIESTO).

**NO se hizo (scope respetado)**: Fase 2 (monedas/balance), Fase 3 (fincas/tareas/multi-turn), migración AgroRepo a Supabase, cambios en agro.js u otros módulos, deploy Supabase, git.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add supabase/functions/agro-assistant/index.ts apps/gold/agro/agro-assistant.js apps/gold/docs/MANIFIESTO_AGRO.md apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "agro: Fase 0+1 Agente Agro (privacidad P0 + deleted_at + canon §8)"
git push
```

---

## Sesión 2026-09-20 (II) — FASE 2 AGENTE AGRO: verdad financiera multimoneda (Camino A, autorizada por owner)

Agente: GLM (ZCode). Objetivo: corregir P1-1 de la auditoría (tools financieras sumaban COP+USD+VES sin normalizar) y ampliar el balance a las 5 tablas del ledger. Solo `supabase/functions/agro-assistant/index.ts`; ningún otro archivo tocado.

**Diagnóstico**: `get_finance_summary` sumaba `Number(item.amount)`/`Number(item.monto)` crudos ignorando `monto_usd/currency/exchange_rate` (index.ts pre-F2); ídem `get_pending_payments` y `get_payments_received`. Balance limitado a expenses+income (sin pérdidas, donaciones ni operacionales).

**Cambios (1 archivo, 6 acciones F2-1..F2-6)**:

| Cambio | Detalle |
|---|---|
| Helper `normalizeMoney(row, isIncome)` + `roundUsd` | Precedencia canónica copiada del RPC `get_farm_balance`: `monto_usd → amount_usd → nativo si USD → nativo/exchange_rate → nativo`. `isIncome` selecciona la **convención de columna** del ledger (true=`monto` español: income/pending/losses/transfers; false=`amount` inglés: expenses/operacionales), no la semántica contable — corrección documentada del borrador (este pedía isIncome=false para pending, que leería columna inexistente). Fallback `amount_usd` añadido porque `agro_operational_movements` usa esa columna (verificado en migración `20260416190000:559-575`), no `monto_usd`. |
| F2-1 `get_finance_summary` | 5 queries en `Promise.all`: expenses+income (antes) + `agro_losses` + `agro_transfers` (donaciones) + `agro_operational_movements`. Todas con `monto_usd,currency,exchange_rate` en select. Totales USD redondeados a 2 dec; `net = income − expenses − losses − donations − operational`; `counts` extendido; `top_expense_categories` normalizado. |
| F2-2 `get_pending_payments` | select + `sumAmount` + `by_client` normalizados (agro_pending usa `monto`). `latest_items` conserva monto nativo por fila. |
| F2-3 `get_payments_received` | select + totales + `by_client` normalizados (número USD, no bigint cents); `last_payments` agrega `currency` nativo por fila para no confundir con totales USD. |
| F2-4/5/6 esquemas verificados anti-invención | `agro_losses`/`agro_transfers`: columnas españolas `monto/monto_usd/currency/exchange_rate/fecha/deleted_at` + crop_id (migración `20260327001000:94-112,149-167`). `agro_operational_movements`: `amount/amount_usd/currency/exchange_rate/movement_date/direction(in|out)`, **hard delete sin deleted_at** (migración `20260416190000:559-575`) — query SIN filtro deleted_at y con `direction=neq.in` siguiendo el canon del RPC (`20260625120000:87-92`); sin filtro crop (ligadas a cycle_id). RLS confía en authHeader (sin user_id manual, consideración #6 del paquete). |
| Privacidad (QA-3) | `PRIVACY_MONEY_TOTAL_KEYS` += `losses/donations/operational` → `applyPrivacy` enmascara los nuevos totales con `hide_money`. |
| System prompt | Cláusula única autorizada F2-6: balance ampliado + montos normalizados a USD con tasa histórica + balance global sin farm_id. Ninguna otra línea del prompt tocada. |

**Decisiones quirúrgicas documentadas (desviaciones mínimas del borrador, con evidencia)**: (1) estructura de respuesta conservada (`range_resolved/totals/counts/top_expense_categories`) en vez de la plana `*_total/net_balance/by_category` del borrador — el propio borrador decía "mantener estructura actual" y la anidada preserva el enmascaramiento `applyPrivacy` de Fase 1 (consideración #5); (2) `isIncome` re-interpretado como selector de columna; (3) operacionales solo `direction=neq.in` (canon RPC) en vez de "todo como salidas"; (4) sin user_id manual (RLS).

**Resultado de build**: `pnpm build:gold` ✅ verde (2.82s; agent-guard OK; check-llms OK; UTF-8 OK). Sintaxis Edge: esbuild parse TS exit 0. Deploy real: owner.

**Verificación estática (checks del paquete)**: (1) las 5 queries llevan `monto_usd/currency/exchange_rate` (index.ts:619-623); (2) `normalizeMoney` maneja asimetría amount/monto (index.ts:495); (3) `opsUrl` SIN deleted_at (index.ts:623); (4) losses/donations/operational en `PRIVACY_MONEY_TOTAL_KEYS` (index.ts:259) → pasan por `applyPrivacy`. Residual declarado: `sumMoney` queda definido sin llamadas (reemplazado por sumas normalizadas) — se conserva para no ampliar diff en archivo vigilado por Mimosa.

**QA sugerido online (owner, tras deploy de la Edge)**: QA-1 multimoneda (gastos $100 USD + 200.000 COP@4000 + 500.000 VES@50 → la IA debe responder ~$10.150 USD, no 700.100 crudo); QA-2 balance completo (menciona gastos, ingresos, pérdidas, donaciones y operacionales por separado); QA-3 privacidad (montos ocultos → "oculto por privacidad" también para pérdidas).

**NO se hizo (scope respetado)**: Fase 3 (fincas/tareas/multi-turn/clima), migración AgroRepo, agro.js/agro-assistant.js/agro-privacy.js, deploy, git.

**Bloque git sugerido (NO ejecutado)**:
```bash
git add supabase/functions/agro-assistant/index.ts apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "agro: Fase 2 Agente Agro — verdad financiera multimoneda (normalización USD canon RPC + balance de 5 tablas del ledger)"
git push
```
