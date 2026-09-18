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
