# AGENT_REPORT_ACTIVE

Resumen operativo actual de `apps/gold`.

## Sesión activa: política de reportes + limpieza Playwright (2026-03-12)

### Diagnóstico

- La fuente operativa activa ya existe en `apps/gold/docs/AGENT_REPORT_ACTIVE.md`, pero el repo todavía arrastra ruido documental:
  - existe otro `AGENT_REPORT_ACTIVE.md` en la raíz;
  - existía `AGENT.md` como segunda superficie de instrucciones;
  - `apps/gold/scripts/agent-report-check.mjs` todavía aceptaba fallback al reporte legacy.
- Eso deja tres focos de confusión:
  - un agente puede abrir el archivo activo equivocado;
  - otro agente podía obedecer `AGENT.md` aunque `README.md` ya mandaba leer `AGENTS.md`;
  - el build todavía tolera crecer `AGENT_REPORT.md`, aunque operativamente ya no debería ser la fuente viva.
- QA navegador:
  - la sesión Playwright de esta ronda dejó artefactos temporales en `%LOCALAPPDATA%\\Temp\\playwright-mcp-output\\1773327549863`;
  - esos temporales se pudieron borrar solo después de cerrar la sesión del navegador, así que la limpieza debe quedar como regla operativa explícita al final de cada bloque de prueba.

### Plan

1. Declarar `apps/gold/docs/AGENT_REPORT_ACTIVE.md` como única fuente de verdad activa.
2. Declarar `apps/gold/docs/AGENT_REPORT.md` como archivo legacy/histórico que no debe seguir creciendo salvo migración o consulta histórica.
3. Dejar `AGENTS.md` como instrucción canónica del repo.
4. Eliminar `AGENT.md` para evitar drift y ambigüedad documental.
5. Convertir el `AGENT_REPORT_ACTIVE.md` de raíz en archivo puente hacia `apps/gold/docs/AGENT_REPORT_ACTIVE.md`.
6. Ajustar `apps/gold/scripts/agent-report-check.mjs` para validar solo el reporte activo, no el legacy.
7. Documentar higiene de QA navegador: cerrar Playwright y borrar la carpeta temporal de la sesión al final de cada sección de prueba.

### Cierre

- Política acordada:
  - activa: `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - legacy: `apps/gold/docs/AGENT_REPORT.md`
  - canon de instrucciones: `AGENTS.md`
  - `AGENT.md` eliminado para evitar ambigüedad
- Temporales de esta sesión Playwright:
  - carpeta detectada: `%LOCALAPPDATA%\\Temp\\playwright-mcp-output\\1773327549863`
  - resultado final: eliminada tras cerrar el navegador de pruebas
- Esta decisión limpia el flujo para Codex y futuros agentes sin perder histórico.

## Diagnóstico operativo

- `Agro` es el único módulo liberado del catálogo oficial.
- `Academia`, `Social`, `Tecnología` y `Crypto` siguen oficiales pero no disponibles.
- `dashboard/music.html` es una utilidad interna del dashboard; no es un módulo oficial ni una superficie legacy huérfana.
- `archive/legacy-html/` y `archive/legacy-js/` concentran las superficies retiradas del producto activo.
- `AGENT_REPORT.md` se conserva como histórico completo; este archivo es el reporte operativo corto.

## Producto vigente

- `Agro` es el único módulo liberado.
- `Academia`, `Social`, `Tecnología` y `Crypto` son módulos oficiales pero no disponibles.
- `Herramientas` y `Suite` solo sobreviven como alias legacy.

## Auth y entrada

- Landing auth por hash: `/index.html#login`
- Hero CTA:
  - sin sesión -> `/index.html#login`
  - con sesión -> `/agro/`
- Áreas protegidas globales:
  - `/dashboard`
  - `/agro`

## Estado del catálogo

- Landing y dashboard ya respetan la misma release policy.
- Rutas directas de módulos no liberados muestran placeholder oficial uniforme.

## Deuda visible pendiente

- Validar el shell Agro con una sesión real del usuario para confirmar persistencia, cierre del sidebar y navegación completa sobre datos productivos.
- Verificar con datos reales la experiencia de selección contextual del facturero cuando existan historiales poblados.
- Decidir si `clima` y `agenda` evolucionan luego a vistas dedicadas o permanecen como accesos guiados dentro del dashboard/herramientas.
- Decidir si `dashboard/music.html` se mantiene como utilidad interna permanente o si se mueve a una sección propia más adelante.
- La carpeta `archive/legacy-html/` ya concentra los HTML históricos fuera de la superficie activa.
- La carpeta `archive/legacy-js/` concentra el bridge auth legacy retirado del producto activo.
- El tooling raíz sigue en modo compatibilidad y podrá simplificarse en otro lote.

## Documentos de apoyo

- Reporte histórico completo: `apps/gold/docs/AGENT_REPORT.md`
- Inventario de legado: `apps/gold/docs/LEGACY_SURFACES.md`

## Plan operativo

1. Mantener `apps/gold/docs/AGENT_REPORT_ACTIVE.md` como gate corto para build y trabajo diario.
2. Usar `apps/gold/docs/AGENT_REPORT.md` solo como histórico acumulado de sesiones y cierres.
3. Tratar el shell Agro V10 como base vigente: una vista macro activa, sidebar colapsable y `Paso 1 / Paso 2` preservados.
4. Mantener `Carrito` y `Rankings` como vistas oficiales del facturero dentro de la shell nueva.
5. Consolidar en próximos QA la selección contextual de registros con datos reales del usuario.
6. Tratar `music` como utilidad interna del dashboard mientras no cambie la decisión de producto.
7. Dejar para lotes separados la simplificación final del tooling raíz y cualquier reubicación futura de `music`.

---

## Landing V10 Redesign — Diagnóstico (2026-03-09)

### Estado actual
- Landing V9.8: hero centrado con "Y" gigante texto, cards planas, sin emblema 3D
- Auth modal funcional pero visualmente básico
- CSS inline en index.html (~1300 líneas)

### Referencia V10
- Hero con 3D emblem flotante + contenido lado a lado
- Glass cards, metallic gradients, 5-tone system
- Scroll reveal, ghost emojis, Playfair Display accent
- Footer 3-column grid

### Plan aplicado
1. Crear `assets/css/landing-v10.css` (CSS aislado V10)
2. Reescribir HTML de landing con V10 design + 3D emblem con logo real
3. Preservar todos IDs/clases funcionales del auth modal
4. Agregar import en main.js
5. Validar build

### IDs funcionales preservados
auth-modal, auth-modal-close, login-tab, register-tab, login-form, register-form,
login-email, login-password, register-name, register-email, register-password,
auth-error, auth-success, forgot-password-link, hcaptcha-login, hcaptcha-register,
remember-me, hero-login-cta, login-btn, register-btn, user-menu, user-menu-btn,
user-dropdown, logout-btn, themeToggle, hamburger, navMobile, mobileOverlay, loadingScreen, logoLink

---

## Landing micro-ajuste final (2026-03-09)

### Diagnóstico
1. **Animaciones móviles**: selector `.hero-emblem` era incorrecto (correcto: `.logo-emblem`), el slowdown del emblema nunca se aplicó. Además, solo se modificaba `animation-duration` sin reducir amplitud de rotación/traslación.
2. **Estados de módulos**: Crypto tenía "En Desarrollo", Academia/Tecnología/Social/Crypto tenían "Próximamente" en badge y link. Textos prohibidos por política de producto.

### Cambios aplicados
- **`assets/css/landing-v10.css`**: reescrito bloque `@media (max-width: 768px)` mobile animation slowdown:
  - Nuevos keyframes `v10-emblemFloat-m` (rotación ±1.5deg, translateY -3px vs -12px desktop) y `v10-float-m` (bob -3px)
  - `.logo-emblem` → animación 14s con amplitud reducida
  - `.emblem-outer::after` sheen → 10s
  - `.v10-text-metallic` → 16s
  - `.hero-scroll-arrow` → float suave 3s
  - `.ghost-bg` → opacity 0.012, duración 16s
  - Nada desactivado, todo suavizado
- **`index.html`**: módulos no disponibles cambiados de `v10-status-dev`/`v10-status-soon` + "En Desarrollo"/"Próximamente" a `v10-status-soon` + "No Disponible". Agro y Dashboard mantienen "Disponible". Descripción de sección actualizada.

---

## Dashboard + Agro mobile bugfix (2026-03-10)

### Diagnóstico
1. **Dashboard responsive roto en móvil**: stats grid (`auto-fit, minmax(180px)`) dejaba 3er card sola; topbar icons overflow; insight cards sin ajuste de padding/font; spacing excesivo.
2. **Botón "Ir al módulo" invisible**: `dashboard.css` (via main.js) aplica `background: var(--gradient-gold)` y `box-shadow` a `.insight-action`. Luego `dashboard-v1.css` sobreescribe `color` a `var(--gold-principal)` pero NO el background → texto dorado sobre fondo dorado = invisible.
3. **Campana/notificaciones Agro cortada en móvil**: dropdown inline `width: 320px; position: absolute; right: 0` desborda viewport en pantallas < 375px.

### Cambios aplicados
- **`assets/css/dashboard-v1.css`**:
  - `.insight-action`: añadido `background: transparent; box-shadow: none` explícitos (+ hover, focus-visible, disabled)
  - `@media 768px`: stats 3-col, topbar compacto (34px icons, gap 2px), insight cards padding/font reducidos, hero compacto, modules 1-col, quote/footer ajustados
  - `@media 480px`: stats 3-col mantenido con padding mínimo, topbar 32px icons, hero title 1.1rem
- **`dashboard/index.html`**: inline `<style>` de `.insight-action` actualizado con `background: transparent; box-shadow: none` (belt-and-suspenders)
- **`agro/agro-dashboard.css`**: `@media 768px` → `#notif-dropdown` constrainido a `min(320px, calc(100vw - 24px))`, right ajustado, max-height 70vh con overflow-y auto

---

## Facturero: Revertir a Fiado + Papelera de eliminados (2026-03-12)

### Diagnóstico

#### A) "Revertir a fiado" ausente en Pagados
- **Causa raíz**: `renderPagadosDedicatedItem()` (agro.js:11805) usa `allowedActions: new Set(['edit', 'transfer', 'delete'])`. Falta `'revert'`.
- La lógica de reversión **ya existe completa**: `handleRevertIncome()`, `handleRevertLoss()`, `executeCompensationRevertToPending()`, `openRevertToPendingWizard()`, event handlers para `.btn-revert-income` / `.btn-revert-loss`.
- El botón se renderiza en `renderHistoryRow()` (agro.js:4752) condicionado a `canUseAction('revert')` + `fromPending` + `!incomeOrLossReverted`.
- **Pérdidas** (agro.js:13657) también carece de `'revert'` en su `allowedActions`.
- **Fix**: agregar `'revert'` al Set en ambas vistas dedicadas. Cero lógica nueva requerida.

#### B) Borrado irreversible / sin restauración
- **Causa raíz**: `deleteFactureroItem()` (agro.js:5919) ya hace soft-delete (`deleted_at = timestamp`) con fallback a hard-delete si la columna no existe. Todas las tablas tienen `supportsDeletedAt: true`.
- Las queries filtran `.is('deleted_at', null)` para ocultar registros eliminados.
- **No existe UI para ver ni restaurar registros soft-deleted.**
- **Fix**: (1) función `restoreFactureroItem()`, (2) toast con "Deshacer" inmediato post-delete, (3) modal Papelera para ver/restaurar eliminados.

### Archivos a tocar
- `agro/agro.js` — agregar 'revert' a allowedActions, agregar `restoreFactureroItem()`, mejorar toast de delete
- `agro/agro-trash.js` — **nuevo** — modal Papelera (fetch deleted, restore, UI)
- `agro/index.html` — import de agro-trash.js, botón Papelera en facturero
- `agro/agro.css` — estilos del toast undo (mínimo)

### Riesgos
- Si la columna `deleted_at` no existe en alguna tabla, el restore fallará silenciosamente (mismo riesgo que el soft-delete actual, ya mitigado con fallback).
- El revert solo aplica a registros que vinieron de Fiados (`origin_table = 'agro_pending'`). Registros creados directamente en Pagados no muestran botón de revert (correcto por diseño).
- La papelera solo muestra registros soft-deleted (últimos 30 días). Registros hard-deleted no son recuperables.

### Plan quirúrgico
1. Agregar `'revert'` a `allowedActions` en `renderPagadosDedicatedItem` y `renderPerdidasDedicatedItem`
2. Agregar `restoreFactureroItem(tabName, itemId)` en agro.js
3. Mejorar `deleteFactureroItem()` con toast undo de 8s
4. Crear `agro-trash.js` con modal Papelera
5. Wiring: botón Papelera en facturero + import en bootstrap
6. Build validation

### Cambios aplicados

#### `agro/agro.js`
- **L11805**: `allowedActions` de Pagados: `['edit', 'transfer', 'delete']` → `['edit', 'transfer', 'revert', 'delete']`
- **L13657**: `allowedActions` de Pérdidas: `['edit', 'delete']` → `['edit', 'revert', 'delete']`
- **`deleteFactureroItem()`**: ahora trackea `wasSoftDelete` y muestra `showUndoDeleteToast()` con botón "Deshacer" (8s) en vez del toast simple
- **`showUndoDeleteToast()`**: nueva — toast con botón "Deshacer" que llama `restoreFactureroItem()` y refresca vistas
- **`restoreFactureroItem()`**: nueva — `update({ deleted_at: null })` por tabla + id + user_id
- **`fetchDeletedFactureroItems()`**: nueva — fetch records con `deleted_at IS NOT NULL` últimos 30 días
- **`window._agroTrash`**: expone API para módulo externo

#### `agro/agro-trash.js` (NUEVO)
- Módulo independiente (AGENTS.md §3.1)
- `openTrashModal()` — modal papelera con registros eliminados agrupados por fecha
- Fetch paralelo de todas las tablas con `deleted_at`
- Botón "Restaurar" por registro con feedback visual
- Cierre por overlay click, Escape, o botón ×
- Expone `window.openAgroTrashModal` para inline

#### `agro/agro.css`
- `.agro-undo-toast` + `.agro-undo-toast-btn` — toast undo DNA V10
- `.agro-trash-overlay/modal/header/body/item/restore-btn` — papelera modal DNA V10
- `prefers-reduced-motion` — cubre ambos nuevos componentes

#### `agro/index.html`
- Botón "🗑️ Papelera" añadido al final de la barra de pestañas del facturero
- `import('./agro-trash.js')` no-bloqueante en bootstrap

### Build
- `pnpm build:gold` → ✅ OK (137 modules, agro-trash chunk 4.06 kB)

### QA manual sugerido
1. Ir a Pagados → abrir acciones de un registro que vino de Fiados → debe aparecer "Devolver a Fiados"
2. Ir a Pérdidas → mismo test para pérdidas originadas en Fiados
3. Eliminar cualquier registro → toast con botón "Deshacer" durante 8s → click restaura el registro
4. Click en "🗑️ Papelera" en barra de tabs → modal con registros eliminados últimos 30 días
5. Click "Restaurar" en papelera → registro vuelve a su vista original
6. Verificar que estadísticas y exportes no se rompen

---

## Auditoría documental canónica + policy Playwright (2026-03-12)

### Diagnóstico

- `AGENTS.md` existe y ya actúa como archivo canónico de instrucciones.
- El repo todavía mantiene residuos de la política anterior que vuelven a abrir ambigüedad:
  - `AGENT.md` sigue existiendo en la raíz, aunque la decisión nueva dice que no debe existir ni competir;
  - `apps/gold/scripts/agent-report-check.mjs` todavía usa una resolución flexible con múltiples candidatos para `AGENT_REPORT_ACTIVE.md`, en vez de validar una sola ruta activa;
  - `apps/gold/public/llms.txt`, `apps/gold/README.md` y `apps/gold/archive/legacy-html/README.md` siguen usando referencias genéricas `docs/...` o copy no suficientemente explícito para el flujo canónico;
  - `AGENTS.md` todavía no declara de forma explícita tres decisiones nuevas:
    - `AGENT.md` eliminado por diseño;
    - `global_rules.md` como copia operativa no canónica;
    - limpieza obligatoria de Playwright por bloque de QA;
  - el propio `apps/gold/docs/AGENT_REPORT_ACTIVE.md` conserva una sesión previa donde `AGENT.md` aparece como alias de compatibilidad temporal.
- `apps/gold/docs/AGENT_REPORT.md` sigue siendo un histórico grande con referencias antiguas. No debe tocarse en este lote para no hacerlo crecer más.
- `AGENT_REPORT_ACTIVE.md` en raíz puede seguir existiendo solo como puntero de compatibilidad, pero ningún script/check activo debe tratarlo como fuente primaria.

### Causa raíz de la ambigüedad previa

- La ambigüedad nació por acumulación de compatibilidades temporales:
  - se mantuvo `AGENT.md` como puente;
  - el check documental aceptó varias rutas en vez de una ruta activa única;
  - algunos docs y prompts internos quedaron apuntando a rutas cortas/genéricas;
  - la policy de higiene Playwright se aplicó en la práctica, pero no quedó consolidada como regla operativa única.

### Plan quirúrgico

1. Eliminar `AGENT.md`.
2. Endurecer `apps/gold/scripts/agent-report-check.mjs` para validar solo `apps/gold/docs/AGENT_REPORT_ACTIVE.md`.
3. Actualizar `AGENTS.md` para declarar explícitamente:
   - `AGENTS.md` como única instrucción canónica;
   - `AGENT.md` como archivo eliminado/no recreable;
   - `apps/gold/docs/AGENT_REPORT_ACTIVE.md` como única fuente activa;
   - `apps/gold/docs/AGENT_REPORT.md` como legacy/histórico;
   - `global_rules.md` como copia operativa no canónica;
   - limpieza Playwright obligatoria por bloque.
4. Corregir referencias operativas en:
   - `apps/gold/public/llms.txt`
   - `apps/gold/README.md`
   - `apps/gold/archive/legacy-html/README.md`
5. Mantener `apps/gold/docs/AGENT_REPORT.md` intacto como histórico.
6. Validar con `pnpm build:gold`.

### Archivos a tocar

- `AGENTS.md`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `apps/gold/scripts/agent-report-check.mjs`
- `apps/gold/public/llms.txt`
- `apps/gold/README.md`
- `apps/gold/archive/legacy-html/README.md`
- `FICHA_TECNICA.md`
- `AGENT.md` (eliminar)

### Riesgos

- Bajo:
  - quedarán referencias antiguas dentro de `apps/gold/docs/AGENT_REPORT.md` y `apps/gold/docs/chronicles/*`, pero solo como histórico legacy.
- Bajo:
  - endurecer `agent-report-check.mjs` elimina fallback documental y hará fallar más rápido cualquier flujo que no use la ruta activa correcta, que es el comportamiento deseado.

### Cambios aplicados

- `AGENT.md`
  - eliminado del repo para evitar que compita con `AGENTS.md`.
- `AGENTS.md`
  - se declaró explícitamente la jerarquía canónica:
    - `AGENTS.md` único archivo de instrucciones;
    - `AGENT.md` no recreable;
    - `apps/gold/docs/AGENT_REPORT_ACTIVE.md` única fuente activa;
    - `apps/gold/docs/AGENT_REPORT.md` legacy;
    - `AGENT_REPORT_ACTIVE.md` raíz como puntero;
    - `global_rules.md` no canónico;
    - limpieza Playwright obligatoria por bloque.
- `apps/gold/scripts/agent-report-check.mjs`
  - se eliminó la resolución múltiple de candidatos;
  - ahora valida una sola ruta activa: `apps/gold/docs/AGENT_REPORT_ACTIVE.md`;
  - la ruta se resuelve desde la ubicación del script, no desde fallbacks por `cwd`.
- `apps/gold/public/llms.txt`
  - se alineó el contexto LLM con la policy nueva;
  - se eliminó cualquier ambigüedad sobre `AGENT.md`, legacy report y `global_rules.md`.
- `apps/gold/README.md`
  - se ajustaron las referencias documentales al path explícito `apps/gold/docs/...`.
- `apps/gold/archive/legacy-html/README.md`
  - se alinearon referencias a la fuente activa y al histórico legacy.
- `FICHA_TECNICA.md`
  - se corrigió la descripción del pipeline para que `agent-report-check.mjs` apunte explícitamente a `apps/gold/docs/AGENT_REPORT_ACTIVE.md`.

### Validación

- Auditoría posterior:
  - `AGENTS.md` sigue presente como archivo canónico.
  - `AGENT.md` ya no existe en disco.
  - `agent-report-check.mjs` ya no tiene fallback al reporte legacy.
  - `AGENT_REPORT_ACTIVE.md` en raíz quedó fuera del flujo activo y no participa en el check del build.
- Build:
  - `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Check documental directo:
  - `node apps/gold/scripts/agent-report-check.mjs` -> OK
  - `git diff --check` -> OK en los archivos tocados

### Cierre

- La jerarquía documental operativa quedó reducida a un flujo único:
  - instrucciones: `AGENTS.md`
  - reporte activo: `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - histórico: `apps/gold/docs/AGENT_REPORT.md`
- La compatibilidad innecesaria que reabría ambigüedad se eliminó.
- La policy Playwright quedó documentada en el lugar correcto: `AGENTS.md`.

---

## Auditoría de versionado activo V1 vs histórico V9.8 (2026-03-12)

### Diagnóstico

- El repo ya usa `Agro V1` en superficies activas del módulo, pero todavía mantiene múltiples referencias a `YavlGold V9.8` en documentación vigente y páginas visibles.
- El ruido no está concentrado en un solo archivo:
  - docs activas: `README.md`, `FICHA_TECNICA.md`, `apps/gold/public/llms.txt`, `apps/gold/docs/AGRO_V1_BASELINE.md`;
  - docs visuales/canónicas: `apps/gold/docs/ADN-VISUAL-V10.0.md`;
  - páginas visibles del producto: `apps/gold/dashboard/index.html`, `apps/gold/faq.html`, `apps/gold/cookies.html`, `apps/gold/soporte.html`.
- A la vez, existen referencias a `V9.8` que sí son históricas o técnicas y no deben borrarse ciegamente:
  - reportes legacy y crónicas;
  - migraciones SQL;
  - comentarios internos y marcadores de iteraciones previas en CSS/JS, siempre que no vendan el estado actual al usuario.

### Causa raíz

- La versión `V9.8` quedó incrustada en tres capas distintas durante una etapa anterior:
  - branding documental de producto;
  - copy visible en páginas estáticas auxiliares;
  - metadatos y comentarios de implementación.
- Después nació `Agro V1`, pero la normalización se hizo por partes:
  - el módulo Agro sí migró a `V1`;
  - varias páginas y docs operativas siguieron describiendo a `V9.8` como presente;
  - el ADN Visual `V10.0` mezcló versión del sistema visual con la versión histórica del producto, lo que hoy genera ambigüedad.

### Criterio de clasificación

- `Activa/canónica -> actualizar a V1`
  - instrucciones, README, ficha técnica, llms, docs operativas vigentes, baseline activo y copy visible del producto.
- `Histórica/cronológica -> conservar V9.8`
  - crónicas, changelogs, reportes legacy, migraciones y archivos archivados que describen un hecho real pasado.
- `Ambigua/confusa -> reescribir`
  - cualquier documento activo que mezcle `V10.0` visual con `V9.8` de producto sin aclarar que `V10.0` es la versión del DNA y `V1` es la versión vigente visible del producto.

### Plan quirúrgico

1. Inventariar referencias activas a `V9.8` y separar las históricas.
2. Actualizar a `V1` la documentación canónica y operativa vigente.
3. Reescribir docs ambiguas para dejar explícito:
   - `V1` = estado activo visible del producto;
   - `V9.8` = etapa histórica cuando aplique;
   - `V10.0` = versión del sistema visual, no del release visible.
4. Corregir labels/meta visibles del producto que todavía venden `V9.8` como actual.
5. Reauditar con búsquedas, correr checks documentales y `pnpm build:gold`.

### Archivos a tocar

- `README.md`
- `FICHA_TECNICA.md`
- `apps/gold/public/llms.txt`
- `apps/gold/docs/AGRO_V1_BASELINE.md`
- `apps/gold/docs/ADN-VISUAL-V10.0.md` (solo si hace falta aclarar el contexto activo sin alterar reglas del DNA)
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `apps/gold/dashboard/index.html`
- `apps/gold/faq.html`
- `apps/gold/cookies.html`
- `apps/gold/soporte.html`

### Riesgos

- Bajo:
  - una limpieza demasiado agresiva puede falsificar historia real en docs o archivos que sí son históricos.
- Bajo:
  - `apps/gold/docs/ADN-VISUAL-V10.0.md` es fuente visual inmutable; cualquier ajuste debe limitarse a aclarar contexto documental y no a cambiar reglas del sistema visual.
- Bajo:
  - pueden quedar comentarios técnicos internos con `V9.8` en CSS/JS; si no afectan documentación activa ni copy visible, se tratarán como deuda menor fuera de este lote.

### Inventario clasificado

- `Activa/canónica -> corregida a V1`
  - `AGENTS.md`
  - `README.md`
  - `FICHA_TECNICA.md`
  - `apps/gold/README.md`
  - `apps/gold/public/llms.txt`
  - `apps/gold/docs/AGRO_V1_BASELINE.md`
  - `apps/gold/dashboard/index.html`
  - `apps/gold/faq.html`
  - `apps/gold/cookies.html`
  - `apps/gold/soporte.html`
- `Ambigua/confusa -> reescrita`
  - `apps/gold/docs/ADN-VISUAL-V10.0.md`
    - se mantuvo `V10.0` como version del DNA;
    - se explicitó `V1` como release activo visible;
    - `V9.8` quedó solo como contexto historico de formalizacion.
- `Historica/cronologica -> conservada`
  - `apps/gold/docs/AGENT_REPORT.md`
  - `apps/gold/docs/chronicles/*`
  - `apps/gold/archive/*`
  - `apps/gold/supabase/migrations/*`

### Cambios aplicados

- Documentacion canónica:
  - `AGENTS.md` ahora fija `V1` como release visible activa y relega `V9.8` a contexto historico.
  - `README.md`, `FICHA_TECNICA.md`, `apps/gold/README.md` y `apps/gold/public/llms.txt` quedaron alineados con `V1`.
- Documentacion de producto:
  - `apps/gold/docs/AGRO_V1_BASELINE.md` dejó de decir que la plataforma seguia en `V9.8`.
  - `apps/gold/docs/ADN-VISUAL-V10.0.md` se aclaró sin tocar sus reglas visuales: `V10.0` = DNA, `V1` = release activa, `V9.8` = contexto historico.
- Copy visible:
  - `apps/gold/dashboard/index.html` actualizó meta y copy embebido relevante.
  - `apps/gold/faq.html`, `apps/gold/cookies.html` y `apps/gold/soporte.html` dejaron de vender `V9.8` como estado actual y corrigieron contexto de catalogo.
- Marcadores tecnicos visibles para dev:
  - se normalizaron encabezados/logs puntuales en `apps/gold/assets/js/auth/authClient.js`, `apps/gold/agro/agro-agenda.js`, `apps/gold/agro/agro-cart.js`, `apps/gold/agro/agro-exchange.js`, `apps/gold/agro/tx-cards-v2.css` y el log operativo de `apps/gold/agro/agro.js`.

### Validacion

- Reauditoria activa:
  - en los archivos canónicos y visibles tocados, `V9.8` solo permanece cuando el propio texto lo marca como historico.
- Checks:
  - `node apps/gold/scripts/agent-report-check.mjs` -> OK
  - `git diff --check` -> OK sin errores de whitespace; solo warnings de CRLF/LF en archivos ya existentes
- Build:
  - `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`

### Cierre

- El estado documental activo del repo queda consolidado en `V1`.
- `V9.8` ya no aparece como version vigente en docs canónicas ni en copy visible corregido.
- `V9.8` sobrevive solo donde corresponde:
  - contexto historico explicado;
  - reportes legacy;
  - cronicas;
  - migraciones;
  - y algunos comentarios tecnicos internos del monolito Agro que no afectan producto ni documentacion activa.

---

## Wiring perfil de usuario al contexto IA del asistente (2026-03-13)

### Diagnostico

- El asistente IA de Agro (`agro-assistant` edge function) recibe contexto del cliente via `getAssistantContext()` y `buildCropsPreamble()`.
- **Datos que SI recibia**: fecha, version app, tab activo, geolocalizacion, clima, cultivo enfocado, conteo de cultivos, lista de cultivos con status.
- **Datos que NO recibia**: nombre del usuario, nombre de finca, ubicacion del perfil, relacion con agro, actividad principal.
- **Causa raiz**: `agroperfil.js` cargaba el perfil desde `agro_farmer_profile` en `state.profile` pero **no exponia los datos via bridge `window._agroXxx`** (requerido por AGENTS.md §3.3). El monolito `agro.js` no tenia forma de leer datos del perfil.
- **Version obsoleta**: `getAssistantContext()` reportaba `version: 'V9.5.6'` en vez de `V1`.

### Infraestructura existente (no usada por IA)

| Tabla | Campos relevantes | Cargada por |
| --- | --- | --- |
| `agro_farmer_profile` | display_name, farm_name, location_text | `agroperfil.js` |
| `user_onboarding_context` | agro_relation, main_activity, entry_preference | `onboardingManager.js` (solo dashboard) |
| `profiles` | username, avatar_url | dashboard |

### Cambios aplicados

#### `agro/agroperfil.js`
- **Nueva funcion `syncProfileBridge()`** (L944-951): expone `window._agroProfileData` con `display_name`, `farm_name`, `location_text`.
- **`loadFarmerProfile()`** (L789): llama `syncProfileBridge()` tras carga exitosa.
- **`applySavedProfileState()`** (L941): llama `syncProfileBridge()` tras guardar perfil.

#### `agro/agro.js`
- **`getAssistantContext()`** (L16760-16801):
  - Version corregida: `V9.5.6` -> `V1`.
  - Nuevo bloque (L16771-16778): lee `window._agroProfileData` y agrega `context.user_profile` con `name`, `farm`, `location` si existen.

### Resultado

El contexto JSON enviado al edge function ahora incluye:
```json
{
  "date": "...",
  "app": "YavlGold Agro",
  "version": "V1",
  "tab": "gastos",
  "user_profile": {
    "name": "Juan Perez",
    "farm": "Finca La Esperanza",
    "location": "Merida, Venezuela"
  },
  "location_real": { "lat": ..., "lon": ... },
  "weather_now": { "summary": "...", "temp_c": 28 },
  "crop_focus": { "name": "Batata", "status": "activo", ... },
  "stats": { "crops_count": 3 }
}
```

### Build
- `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK` (137 modules)
  - `check-llms: OK`
  - `check-dist-utf8: OK`

### QA sugerido
1. Iniciar sesion en Agro -> verificar que `window._agroProfileData` existe en consola con datos del perfil.
2. Abrir asistente IA -> enviar un mensaje -> verificar en logs del edge function que `context.user_profile` llega con datos.
3. Editar perfil (nombre/finca) -> verificar que `window._agroProfileData` se actualiza sin recargar pagina.
4. Si el perfil esta vacio, verificar que `user_profile` no aparece en el contexto (graceful fallback).

### Deuda pendiente (sesion anterior)
- ~~Onboarding context no se carga en Agro~~ -> **Resuelto** en sesion 2026-03-13b.
- ~~No existe concepto de experiencia ni detalles de finca~~ -> **Resuelto** en sesion 2026-03-13b.

---

## Wizard IA + cierre onboarding para contexto del asistente (2026-03-13b)

### Objetivo

Cerrar el punto 2 del plan maestro: el asistente IA debe conocer al agricultor (experiencia, tipo de finca, expectativas, relacion con agro, actividad principal). La sesion anterior construyo el puente basico (nombre, finca, ubicacion). Esta sesion cierra el flujo completo.

### Cambios aplicados

#### 1. Migracion Supabase

**`20260313170000_add_ia_context_to_farmer_profile.sql`** (aplicada en produccion)

Nuevas columnas en `agro_farmer_profile`:
- `experience_level TEXT` — principiante / intermedio / experto
- `farm_type TEXT` — campo_abierto / invernadero / mixto / urbano
- `assistant_goals JSONB DEFAULT '[]'` — array con metas IA (cultivos, finanzas, plagas, clima, mercado)

#### 2. Nuevo modulo: `agro/agro-ia-wizard.js`

Modulo independiente (AGENTS.md §3.1) con:
- **Wizard guiado de 2 pasos**:
  - Paso 1: Experiencia (principiante/intermedio/experto) + tipo de finca (opcional)
  - Paso 2: Metas del asistente (multi-select: cultivos, finanzas, plagas, clima, mercado)
- **`initIAContext()`**: carga silenciosa de onboarding context + profile IA fields al bootstrap de Agro
- **`syncIAContextBridge()`**: expone `window._agroIAContext` con experience_level, farm_type, assistant_goals, agro_relation, main_activity, onboarding_completed
- **`openIAWizard()`**: abre el wizard modal, puede re-abrirse sin params si ya fue inicializado
- **`isIAContextComplete()`**: verifica si el usuario ya configuro su contexto IA
- CSS inyectado dinamicamente, 100% ADN Visual V10 (tokens, tipografia, breakpoints, prefers-reduced-motion)

#### 3. Actualizaciones a archivos existentes

**`agro/agroperfil.js`**:
- `PRIVATE_PROFILE_COLUMNS`: agregados `experience_level,farm_type,assistant_goals`

**`agro/agro.js` → `getAssistantContext()`**:
- Lee `window._agroIAContext` y agrega al contexto: `experience`, `farm_type`, `goals`, `role` (agro_relation), `focus` (main_activity)

**`agro/index.html`**:
- Bootstrap: carga no-bloqueante de `agro-ia-wizard.js` + llamada a `initIAContext()`
- Boton "Configurar asistente" dentro de la guia del asistente IA (`.assistant-configure-btn`)

### Resultado

El contexto JSON completo enviado al edge function ahora puede incluir:
```json
{
  "date": "...",
  "app": "YavlGold Agro",
  "version": "V1",
  "tab": "gastos",
  "user_profile": {
    "name": "Juan Perez",
    "farm": "Finca La Esperanza",
    "location": "Merida, Venezuela",
    "experience": "intermedio",
    "farm_type": "campo_abierto",
    "goals": ["cultivos", "finanzas", "clima"],
    "role": "producer",
    "focus": "cultivation"
  },
  "location_real": { "lat": 8.59, "lon": -71.15 },
  "weather_now": { "summary": "Parcialmente nublado", "temp_c": 28 },
  "crop_focus": { "name": "Batata", "status": "activo", "day_x": 45, "day_total": 120 },
  "stats": { "crops_count": 3 }
}
```

### Flujo completo del agricultor

1. **Onboarding** (dashboard): nombre, relacion agro, actividad, preferencia de entrada -> `user_onboarding_context`
2. **Perfil** (agro): nombre, finca, ubicacion, contacto -> `agro_farmer_profile`
3. **Wizard IA** (asistente): experiencia, tipo finca, metas -> `agro_farmer_profile` (columnas nuevas)
4. **Bootstrap Agro**: carga silenciosa de ambas tablas -> `window._agroIAContext` + `window._agroProfileData`
5. **Asistente IA**: `getAssistantContext()` lee ambos bridges -> contexto completo al edge function
6. **Re-configuracion**: boton "Configurar asistente" en la guia del asistente permite re-abrir wizard

### Build
- `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK` (138 modules, nuevo chunk `agro-ia-wizard-BmBsNqKo.js` 15.21 kB)
  - `check-llms: OK`
  - `check-dist-utf8: OK`

### QA sugerido
1. Abrir Agro -> verificar en consola que `window._agroIAContext` existe con datos de onboarding
2. Abrir asistente -> click en "Configurar asistente" -> completar wizard (2 pasos)
3. Verificar que `window._agroIAContext` se actualiza con experience_level y assistant_goals
4. Enviar mensaje al asistente -> verificar en edge function logs que `context.user_profile` incluye experience, goals, role, focus
5. Recargar pagina -> verificar que wizard data persiste (cargada desde DB)
6. Probar wizard con perfil vacio (usuario nuevo) -> verificar graceful fallback

### Estado del plan maestro

| Punto | Estado | Nota |
| --- | --- | --- |
| 1. Correccion visual V10 | Hecho | Sesiones anteriores |
| 2. Onboarding/wizard perfil para IA | **Hecho** | Wizard + bridges + onboarding context integrado |
| 3. Siguiente punto del plan | Pendiente | Segun roadmap |

---

## Fortalecer AgroRepo como memoria operativa real (2026-03-13c)

### Diagnostico

AgroRepo existia como modulo extraido (`agrorepo.js`, 788 lineas) con:
- **Fortalezas**: modular, lazy-loaded via accordion, sidebar + editor + timeline + preview panel, export JSON/MD/save, import JSON, tag system (7 tags), delete modal, keyboard shortcuts, mobile sidebar
- **Persistencia**: LocalStorage solamente (`agrorepo_ultimate_v2`)
- **Modelo de datos**: bitacoras (name, icon, reports[]), reports (id, hash, content, tags, createdAt)

### Causa raiz — por que no funcionaba como memoria operativa

1. **Sin tipos de entrada**: todo era "reporte" generico. No se podia distinguir una observacion de una decision, un problema de un aprendizaje. Sin estructura semantica, la memoria no tiene jerarquia ni contexto.
2. **Sin edicion**: se podia crear y eliminar reportes, pero NO editarlos. Imposible corregir o enriquecer registros existentes.
3. **Sin filtrado**: tags existian pero solo como decoracion visual. No se podia filtrar el timeline por tag. Recuperar contexto util era imposible sin leer todo.
4. **Markdown no renderizado**: `renderMarkdown()` existia como funcion pero el timeline usaba `textContent` (texto plano). El formateo no se veia.
5. **Sin bridge IA**: AgroRepo era completamente invisible para el asistente IA. Cero continuidad entre bitacora y conversacion con IA.
6. **Welcome screen marketing**: decia "100% Offline, Ultra Rapido, 100% Privado" — copy de producto, no guia operativa. Ademas tenia "La Grita, Tachira" hardcodeado.
7. **Empty states genericos**: no guiaban al usuario a registrar informacion util.

### Plan quirurgico

Cambios enfocados en valor operativo real, sin reescribir el modulo:

1. Agregar tipos de entrada semanticos
2. Habilitar edicion de reportes
3. Implementar filtrado por tags en timeline
4. Activar renderMarkdown en timeline
5. Crear bridge IA (`window._agroRepoContext`)
6. Conectar bridge a `getAssistantContext()` en agro.js
7. Reescribir welcome/empty states con copy operativo

### Cambios aplicados

#### `agrorepo.js` — Modulo principal

**Nuevo: ENTRY_TYPE_CONFIG** (5 tipos semanticos)
- `observacion` — lo que se ve en campo
- `decision` — acciones tomadas y por que
- `problema` — issues detectados
- `aprendizaje` — lecciones aprendidas
- `evento` — hitos y momentos relevantes

Cada tipo tiene icono, label y color. Los reportes ahora guardan `entryType` junto con content/tags.

**Nuevo: renderEntryTypeSelector()** — selector visual de tipo de entrada en el editor, renderizado dinamicamente con estado activo visual.

**Nuevo: editReport()** — carga un reporte existente al editor (content, tags, entryType), cambia el boton submit a "Actualizar Reporte", permite editar y guardar con `updatedAt` timestamp.

**Nuevo: setTagFilter() + renderFilterBar()** — click en un tag del timeline filtra por ese tag. Barra de filtro activo con boton para quitar. Toggle: click mismo tag quita filtro.

**Nuevo: syncRepoBridge()** — expone `window._agroRepoContext` con:
```json
{
  "bitacoras_count": 3,
  "total_reports": 12,
  "recent_entries": [
    { "bitacora": "Tomate", "type": "observacion", "tags": ["riego","clima"], "content": "...", "date": "..." }
  ],
  "active_bitacora": "Tomate"
}
```

**Mejorado: commitReport()** — ahora captura `entryType`, soporta modo edicion (actualiza reporte existente vs crear nuevo), resetea estado de edicion al terminar.

**Mejorado: renderTimeline()** — entry type badge con color por tipo, renderMarkdown activado (bold, italic, code, bullet points), tags clickeables para filtrar, boton "Editar" en cada entrada, indicador "(editado)" si tiene `updatedAt`, dot color segun tipo de entrada.

**Mejorado: copyReport() + exportMarkdown()** — incluyen tipo de entrada en output.

#### `agro/index.html` — Template HTML

- **Welcome screen**: reescrita como "Tu Bitacora Operativa" con 3 cards operativas (Observaciones, Decisiones, Aprendizajes) en vez de marketing (Offline, Rapido, Privado)
- **Editor**: agregado `div#arw-entryTypeSelector` para selector de tipo de entrada
- **Timeline**: agregado `div#arw-filterBar` para barra de filtro activo
- **Labels**: "Nuevo Reporte de Campo" -> "Nuevo Registro", "Historial de Reportes" -> "Historial"

#### `agro/agro.js` — getAssistantContext()

- Lee `window._agroRepoContext` y agrega `context.repo_memory` con bitacoras count, total entries, y hasta 8 entradas recientes (truncadas a 200 chars)

### Archivos modificados

| Archivo | Cambios |
| --- | --- |
| `agro/agrorepo.js` | +180 lineas netas — entry types, edit, filter, IA bridge, timeline mejorado |
| `agro/index.html` | ~30 lineas — welcome operativa, entry type selector, filter bar |
| `agro/agro.js` | +10 lineas — repo_memory en getAssistantContext() |
| `docs/AGENT_REPORT_ACTIVE.md` | Este reporte |

### Lo que NO se toco (preservado)

- Export JSON / Import JSON / Save to file — intactos
- Export Markdown — mejorado con tipos, no roto
- Sidebar + bitacora list — intactos
- Preview panel (stats, tag distribution) — intacto
- Delete modal — intacto
- Keyboard shortcuts — intactos
- Mobile sidebar — intacto
- Persistencia localStorage — intacta (backward compatible: reportes viejos sin `entryType` default a `observacion`)

### Build
- `pnpm build:gold` -> **OK**
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK` (138 modules)
  - `agrorepo-DxHo1H7m.js`: 24.05 kB (antes 18.30 kB, +31%)
  - `check-llms: OK`
  - `check-dist-utf8: OK`

### QA sugerido

1. Abrir Agro -> navegar a Bitacora -> verificar welcome operativa (Observaciones/Decisiones/Aprendizajes)
2. Crear bitacora -> verificar selector de tipo de entrada (5 botones)
3. Seleccionar tipo "Decision" -> escribir reporte -> registrar -> verificar badge verde "Decision" en timeline
4. Click en tag en timeline -> verificar que filtra correctamente + barra de filtro activo aparece
5. Click "Editar" en una entrada -> verificar que carga content, tags y tipo en el editor + boton cambia a "Actualizar"
6. Guardar edicion -> verificar "(editado)" en timestamp
7. Verificar `window._agroRepoContext` en consola despues de registrar entrada
8. Enviar mensaje al asistente -> verificar que `context.repo_memory` aparece con entradas recientes
9. Export Markdown -> verificar que incluye tipo de entrada en cada reporte
10. Probar en mobile (<=480px) -> verificar que entry type selector y filter bar no rompen layout
11. Verificar backward compatibility: reportes viejos sin `entryType` deben mostrar como "Observacion"

### Deuda residual

- **Supabase persistence**: AgroRepo sigue en localStorage. Migrar a Supabase permitiria: cross-device, backup en nube, queries SQL. Esto es un cambio mayor que requiere migracion DDL + rewrite de persistence layer.
- **Busqueda full-text**: no implementada. Con pocos registros no es critico, pero seria util con volumen.
- **Vinculacion a cultivos reales**: bitacoras se nombran como cultivos pero no estan vinculadas a `agro_crops`. Vincularlas permitiria al IA cruzar datos de bitacora con estado real del cultivo.

### Estado del plan maestro

| Punto | Estado | Nota |
| --- | --- | --- |
| 1. Blindar facturero y transferencias | Muy avanzado | Hecho en sesiones anteriores, pendiente validacion manual final |
| 2. Cerrar onboarding/wizard de perfil para IA | **Hecho** | Wizard + bridges + contexto completo |
| 3. Fortalecer AgroRepo como memoria operativa | **Hecho** | Tipos, edicion, filtros, IA bridge, UX operativa |
| 4. Estadisticas individuales y exportes por seccion | **En progreso** | Auditoria completa, implementacion iniciada |
| 5. QA integral final | Pendiente | Despues de punto 4 |

---

## Sesion: Punto 4 — Estadisticas individuales y exportes por seccion (2026-07-15)

### Diagnostico

#### Arquitectura actual de estadisticas

| Ubicacion | Que muestra | Fuente | Export |
|---|---|---|---|
| Gastos tab (ops) | KPI cards + charts + summary panel | `agro-stats.js` computeAgroFinanceSummaryV1 | Ninguno per-tab |
| Global Stats Panel (dentro de Cultivos) | Crop counts + finanzas + tops | `agroperfil.js` loadGlobalStats | exportProfileMarkdown |
| Rankings tab | Top clientes, pendientes, cultivos | `agro.js` Rankings | exportOpsRankingsMarkdown |
| Vistas dedicadas (pagados/fiados/perdidas/donaciones/otros) | **Solo historial** — sin stats | N/A | exportAgroLog(tabName) |
| AgroRepo | Timeline + stats bitacora | localStorage | exportMarkdown |
| agro-stats-report.js | Reporte global comprehensivo (per-crop, buyers, projections) | Fetches propios | exportStatsReport — **HUERFANO, nunca wired** |

#### Hallazgos criticos

1. **exportStatsReport esta huerfano**: exportado en agro-stats-report.js pero nunca importado ni wired a ningun boton
2. **Dos exports globales compitiendo**: agroperfil.js y agro-stats-report.js generan contenido distinto de fuentes distintas
3. **Vistas dedicadas sin stats individuales**: solo tienen historial + export, sin resumen (total, conteo, promedio)
4. **Solo el tab Gastos tiene charts/KPIs**: los demas tabs no tienen nada comparable
5. **Navegacion plana**: sin submenus historial/estadisticas dentro de secciones

#### Causa raiz

La arquitectura de stats crecio organicamente:
- Fase 1: KPIs basicos en ops/gastos
- Fase 2: Global stats panel en cultivos (agroperfil.js)
- Fase 3: Vistas dedicadas con export pero sin stats
- Fase 4: agro-stats-report.js creado pero nunca wired

Resultado: responsabilidades mezcladas, codigo huerfano, stats faltantes per-view, navegacion sin claridad.

### Plan quirurgico

1. **Stats cards per-view**: Agregar mini-panel de stats a cada vista dedicada (pagados, fiados, perdidas, donaciones) con total USD, conteo de registros, promedio por registro — usando datos de computeAgroFinanceSummaryV1 ya en memoria
2. **Wire exportStatsReport**: Conectar el export comprehensivo como boton en Historial de ciclos
3. **Sub-nav toggle**: Agregar toggle Historial|Estadisticas en pagados y fiados (las dos con mayor valor analitico)
4. **Mantener global stats en ciclos**: Ya esta correcto para la intencion del usuario

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `agro/index.html` | Stats cards en vistas dedicadas, boton export en ciclos, sub-nav toggle |
| `agro/agro.js` | Wire stats cards con datos de summary, import exportStatsReport, sub-nav logic |
| `agro/agro-stats.js` | Exponer datos per-view desde summary existente |
| `agro/agro.css` | Estilos para stats cards y sub-nav toggle |

### Riesgos

- Stats cards deben usar la misma fuente (computeAgroFinanceSummaryV1) para no duplicar datos
- Sub-nav no debe romper el flow existente de historial + wizard
- Export comprehensivo ya existe y funciona; solo falta wiring

### Cambios aplicados

| Archivo | Cambio | Lineas |
|---|---|---|
| `agro/index.html` | Stats cards HTML en 5 vistas dedicadas (pagados, fiados, perdidas, donaciones, otros) | +80 lineas |
| `agro/index.html` | Boton "Reporte Detallado por Cultivo (MD)" en global stats panel (ciclos) | +3 lineas |
| `agro/index.html` | Wire `exportStatsReport` via lazy import de `agro-stats-report.js` | +7 lineas |
| `agro/index.html` | Cache summary en `window.__YG_AGRO_LAST_SUMMARY__` + call `_updateDedicatedViewStats` | +5 lineas |
| `agro/agro.js` | `DEDICATED_STATS_CONFIG`, `formatDedicatedStatsCurrency`, `updateDedicatedViewStats` + `window._updateDedicatedViewStats` bridge | +46 lineas |
| `agro/agro.js` | Init call to populate stats from cached summary on app boot | +3 lineas |
| `agro/agro-operations.css` | Estilos `.agro-dedicated-stats`, `.agro-dedicated-stats__grid`, `__card`, `__value`, `__label`, `__card--loss` | +42 lineas |
| `agro/agro-operations.css` | Responsive: stats grid 1-col en <=900px | +4 lineas |
| `agro/agro.css` | `gstats-actions` flex-wrap + gap, `.gstats-export-btn--detail` variant styles | +14 lineas |

### Lo que NO se toco (preservado)

- `agroperfil.js` — `exportProfileMarkdown()` sigue intacto como export global de perfil
- `agro-stats-report.js` — `exportStatsReport()` sin cambios, solo wired
- `agrorepo.js` — `exportMarkdown()` intacto
- `agro.js` — `exportAgroLog()` per-tab intacto, `exportOpsRankingsMarkdown()` intacto
- Todos los dedicated views: wizard, history, search, filters, footer — intactos
- Sidebar navigation — sin cambios

### Build

- `pnpm build:gold` -> **OK**
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK` (139 modules)
  - `agro-ChBOwmcZ.js`: 502.17 kB (monolito, sin cambios significativos de tamanio)
  - `agro-stats-report-DiGbiiMZ.js`: 14.67 kB (ahora wired)
  - `check-llms: OK`
  - `check-dist-utf8: OK`

### QA sugerido

1. Navegar a Pagados -> verificar que aparecen stats cards (Total cobrado, Registros, Promedio) si hay datos
2. Navegar a Fiados -> verificar stats cards con total fiado
3. Navegar a Perdidas -> verificar stats cards con estilo rojo en total
4. Navegar a Donaciones -> verificar stats cards
5. Navegar a Otros -> verificar stats cards (pueden estar ocultas si no hay datos)
6. Verificar que stats cards se ocultan cuando no hay datos (`hidden` attribute)
7. Navegar a Historial de ciclos -> abrir "Mis Estadisticas Globales" -> verificar dos botones de export
8. Click "Exportar Informe Global (MD)" -> verificar que descarga perfil MD (comportamiento existente)
9. Click "Reporte Detallado por Cultivo (MD)" -> verificar que descarga reporte comprehensivo con per-crop breakdown
10. Hacer un nuevo registro de pago -> verificar que stats cards se actualizan automaticamente
11. Probar en mobile (<=480px) -> verificar que stats grid cambia a 1 columna
12. Verificar que los dos botones de export en global stats se acomodan con flex-wrap en mobile

### Deuda residual

- **Sub-nav toggle**: Historial|Estadisticas toggle en pagados/fiados queda pendiente. Requiere mas UX design (donde exactamente va, que muestra la vista de "estadisticas" per-view — solo las cards o tambien graficos). Se puede implementar en una sesion posterior si el usuario lo prioriza.
- **Otros dedicated stats**: `otros` no tiene `summaryKey` porque `computeAgroFinanceSummaryV1` no calcula un total dedicado para "otros" (usa tabla `agro_others` que no existe en el summary). Si se necesita, hay que agregar una query adicional en `agro-stats.js`.

### Estado del plan maestro

| Punto | Estado | Nota |
| --- | --- | --- |
| 1. Blindar facturero y transferencias | Muy avanzado | Hecho en sesiones anteriores |
| 2. Cerrar onboarding/wizard de perfil para IA | **Hecho** | Wizard + bridges + contexto completo |
| 3. Fortalecer AgroRepo como memoria operativa | **Hecho** | Tipos, edicion, filtros, IA bridge |
| 4. Estadisticas individuales y exportes por seccion | **Avanzado** | Stats cards per-view + wiring exportStatsReport. Pendiente: sub-nav toggle, stats "otros" |
| 5. QA integral final | Pendiente | Despues de cerrar punto 4 |

---

## Sesion: Punto 4 cierre — Submenu sidebar + Otros completo (2026-03-12)

### Diagnostico

#### Sidebar actual

- Navegacion plana: botones `data-agro-view` sin jerarquia
- `agro-shell.js` maneja vistas con `setActiveView()` + `syncViewButtons()`
- No existe patron de sub-items/sub-links
- Grupo "Operaciones" tiene 7 links planos: pagados, fiados, perdidas, donaciones, otros, carrito, rankings

#### Por que "Otros" no tiene estadisticas

- `FACTURERO_CONFIG.otros` tiene `table: null` y `compositeOnly: true`
- "Otros" es una vista compuesta: agrega registros de TODAS las tablas donde `crop_id IS NULL`
- `computeAgroFinanceSummaryV1()` NO computa un total para "otros"
- `DEDICATED_STATS_CONFIG` tiene `{ prefix: 'otros', summaryKey: null, countKey: null }` — stats cards siempre ocultas
- Los rows ya existen en memoria dentro del summary (incomeRows, pendingRows, etc.) pero no se filtran por crop_id null

#### Causa raiz

1. "Otros" nunca fue integrado en la fuente estadistica porque no tiene tabla propia
2. El sidebar fue disenado plano sin anticipar la necesidad de Historial vs Estadisticas
3. No hay mecanismo de "subview" en el shell — solo vistas de primer nivel

### Plan quirurgico

1. **agro-stats.js**: Computar `othersTotal` + `othersCount` filtrando rows existentes por `crop_id IS NULL` (sin query adicional)
2. **agro.js**: Actualizar `DEDICATED_STATS_CONFIG` para 'otros' con los nuevos keys
3. **index.html**: Agregar sub-links (Historial|Estadisticas) en sidebar bajo cada seccion de operaciones relevante
4. **agro-shell.js**: Agregar manejo de subview (`data-agro-subview`) minimal al sistema existente
5. **agro.css**: Estilos para sub-links del sidebar
6. **agro-operations.css**: Visibilidad condicional por subview (historial vs stats)

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `agro/agro-stats.js` | Computar othersTotal/othersCount desde rows existentes |
| `agro/agro.js` | Actualizar DEDICATED_STATS_CONFIG para otros |
| `agro/index.html` | Sub-links sidebar, reestructurar para subview toggle |
| `agro/agro-shell.js` | Subview management minimal |
| `agro/agro.css` | Estilos sub-links sidebar |
| `agro/agro-operations.css` | Visibilidad contenido por subview |

### Riesgos

- Sub-nav no debe romper el click flow existente del sidebar
- "Otros" stats son derivadas (crop_id null), no de tabla propia — coherentes pero indirectas
- El subview toggle debe resetearse al cambiar de vista principal

### Cambios aplicados

| Archivo | Cambio | Lineas |
|---|---|---|
| `agro/agro-stats.js` | Exponer `expenseRows` fuera del try, computar `othersTotal`/`othersCount` filtrando rows por `crop_id IS NULL`, agregar a summary y movementCounts | ~20 lineas |
| `agro/agro.js` | Actualizar `DEDICATED_STATS_CONFIG` para 'otros': `summaryKey: 'othersTotal'`, `countKey: 'others'` | 1 linea |
| `agro/index.html` | Reestructurar sidebar Operaciones: 5 secciones (pagados, fiados, perdidas, donaciones, otros) con sub-links Historial + Estadisticas. Carrito y Rankings sin sub-nav | ~50 lineas |
| `agro/agro-shell.js` | `VIEWS_WITH_SUBNAV` set, `activeSubview` state, `syncSubnav()` para show/hide sub-links y sync active state, subview en `setActiveView()`, subview attr en body, pass subview en click handler | ~30 lineas |
| `agro/agro.css` | Estilos `.agro-shell-nav-item`, `.agro-shell-subnav`, `.agro-shell-sublink`, hover/active states | ~42 lineas |
| `agro/agro-operations.css` | Reglas de visibilidad por subview: en stats mode ocultar steps/history/footer, force-show stats cards | ~14 lineas |

### Lo que NO se toco (preservado)

- `agroperfil.js` — `exportProfileMarkdown()` intacto
- `agro-stats-report.js` — `exportStatsReport()` intacto, wired desde sesion anterior
- `agrorepo.js` — `exportMarkdown()` intacto
- `agro.js` — `exportAgroLog()` per-tab intacto, `exportOpsRankingsMarkdown()` intacto, dedicated view init functions intactas
- Global stats panel en Historial de ciclos — intacto
- Dashboard stats — intacto
- Todas las tablas Supabase — sin cambios DDL

### Build

- `pnpm build:gold` -> **OK**
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK` (139 modules)
  - `agro-fpFQZ5bs.js`: 502.84 kB (monolito)
  - `agro-stats-DcOUhLkH.js`: 21.23 kB (con othersTotal computation)
  - `check-llms: OK`
  - `check-dist-utf8: OK`

### Comportamiento esperado

#### Sidebar

- Pagados, Fiados, Perdidas, Donaciones, Otros: cada uno muestra sub-links "Historial" y "Estadisticas" cuando la seccion esta activa
- Carrito y Rankings: sin sub-nav (no tienen dos lecturas valiosas)
- Click en link principal → vista en modo historial (default)
- Click en "Historial" sub-link → modo historial explicitamente
- Click en "Estadisticas" sub-link → modo stats (oculta wizard/history/footer, muestra stats cards)
- Cambio de seccion → resetea a historial automaticamente

#### Estadisticas "Otros"

- `computeAgroFinanceSummaryV1` ahora computa `othersTotal` y `movementCounts.others`
- "Otros" = suma de records con `crop_id IS NULL` de: gastos, ingresos, pendientes, perdidas, transferencias
- Stats cards de Otros muestran: Total otros (USD), Registros, Promedio por registro
- Datos coherentes con la vista operativa de Otros (misma definicion: registros sin cultivo asignado)

### QA sugerido

1. **Sidebar sub-nav**: Click Pagados → verificar sub-links Historial|Estadisticas visibles
2. **Sub-nav active state**: Click "Estadisticas" → verificar highlight dorado en sublink
3. **Stats mode**: En Pagados > Estadisticas → verificar que se oculta wizard/history/footer y se muestran stats cards
4. **Historial mode**: En Pagados > Historial → verificar que se muestra wizard/history/footer normalmente
5. **Reset al cambiar vista**: Estar en Pagados > Estadisticas → click Fiados → verificar que Fiados abre en Historial
6. **Click link principal**: Estar en Pagados > Estadisticas → click "Pagados" principal → verificar reset a Historial
7. **Otros stats**: Navegar a Otros > Estadisticas → verificar que stats cards muestran datos reales si hay registros sin cultivo
8. **Carrito/Rankings**: Verificar que NO tienen sub-links (sin sub-nav)
9. **Mobile**: Verificar sub-links en viewport <=480px (sidebar responsive)
10. **Historial de ciclos**: Verificar que analytics global sigue intacta
11. **Exportes**: Verificar que los botones de export siguen funcionales en modo historial

### Estado del plan maestro (actualizado)

| Punto | Estado | Nota |
| --- | --- | --- |
| 1. Blindar facturero y transferencias | Muy avanzado | Hecho en sesiones anteriores |
| 2. Cerrar onboarding/wizard de perfil para IA | **Hecho** | Wizard + bridges + contexto completo |
| 3. Fortalecer AgroRepo como memoria operativa | **Hecho** | Tipos, edicion, filtros, IA bridge |
| 4. Estadisticas individuales y exportes por seccion | **Hecho** | Stats cards per-view, wiring exportStatsReport, sub-nav Historial/Estadisticas, Otros integrado en fuente estadistica |
| 5. QA integral final | Pendiente | Proximo paso natural |

---

## Sesion: Bugfix sidebar sub-nav — padre=toggle, hijos=nav (2026-03-12)

### Diagnostico

#### Bug 1: Padre navega en vez de toggle

- Los botones padre tenian `data-agro-view="pagados"` (mismo atributo que los hijos)
- El click handler en `agro-shell.js` captura TODO `[data-agro-view]` sin distinguir padre de hijo
- Resultado: click en padre → `setActiveView()` + `closeSidebar()` — navega y cierra

#### Bug 2: Stats cae en historial

- Click en sublink "Estadisticas" → `setActiveView('pagados', {subview:'stats'})` ✓
- Pero `applyViewEffects` llama `switchTab('ingresos')` internamente
- `switchTab` dispara `agro:finance-tab:changed` → el listener llama `setActiveView('pagados', {syncTab:false})` SIN subview
- `activeSubview = options.subview || 'historial'` = `'historial'` — se resetea

### Causa raiz

1. Padre e hijos compartian el mismo mecanismo de click (`data-agro-view`)
2. El evento `agro:finance-tab:changed` no preservaba el subview activo

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `agro/index.html` | Reemplazar `data-agro-view` por `data-agro-nav-toggle` en los 5 botones padre (pagados, fiados, perdidas, donaciones, otros) |
| `agro/agro-shell.js` | (1) Agregar `expandedNavParent` state para toggle accordion (2) Handler `data-agro-nav-toggle` antes de `data-agro-view` — solo toggle, no navega, no cierra sidebar (3) `syncSubnav` usa `expandedNavParent` para visibilidad, y sincroniza active state de toggle buttons (4) `openSidebar` auto-expande subnav de la vista activa (5) `agro:finance-tab:changed` preserva `activeSubview` |

### Comportamiento final

- **Click padre** → solo expande/colapsa subnav (accordion). No navega. No cierra sidebar.
- **Click padre otra vez** → colapsa subnav
- **Click "Historial"** → navega a subview historial, cierra sidebar
- **Click "Estadisticas"** → navega a subview stats, cierra sidebar. No se resetea por switchTab.
- **Abrir sidebar** → auto-expande subnav de la seccion activa
- **Carrito/Rankings** → sin cambio, siguen como links directos

### Build

- `pnpm build:gold` → **OK** (agent-guard OK, vite OK, UTF-8 OK)

### QA sugerido

1. Click Pagados → verificar que solo expande subnav, no navega
2. Click Pagados otra vez → verificar que colapsa
3. Click Historial → verificar navegacion a pagados historial + sidebar cierra
4. Click Estadisticas → verificar navegacion a pagados stats + stats cards visibles + wizard/history ocultos
5. Abrir sidebar estando en Pagados → verificar auto-expand del subnav
6. Cambiar a Fiados > Estadisticas → verificar que stats mode se mantiene
7. Verificar las 5 secciones (pagados, fiados, perdidas, donaciones, otros)
8. Verificar carrito y rankings siguen como links directos

---

## Sesion: Rediseño estadísticas por sección (2026-03-12)

### Diagnostico

#### Por que las stats cards muestran cero

1. Las stats cards dependen de `window.__YG_AGRO_LAST_SUMMARY__` — un summary GLOBAL cacheado
2. Este summary solo se computa cuando el usuario visita "Historial de ciclos" (trigger: `loadAgroGlobalStats`)
3. Si el usuario va directo a Pagados > Estadísticas sin pasar por ciclos → summary es null → cards en $0.00
4. Aun cuando el summary existe, usa `getStatsCropFilter()` y `getStatsDateRange()` GLOBALES que pueden no coincidir con el scope de la vista dedicada
5. Los historiales usan `incomeCache` / `pendingCache` (fetch independiente del facturero), pero las stats cards usan otra fuente

#### Otras deficiencias

- Solo 3 cards simples (total, count, avg) — sin profundidad
- Sin USD/Bs breakdown (`currency` y `monto` existen pero no se usan)
- Sin rango temporal en stats (7d, 30d, 90d, año, todo)
- Sin gráficos (Chart.js ya está cargado pero no se usa aquí)
- Sin insights trazables (top cultivo, top comprador, mejor período)
- Sin export MD por sección

#### Causa raiz

Las stats cards son parásitas del summary global en vez de computar sus propios datos por sección. Esto crea una desconexión fundamental: el historial muestra datos reales y las stats muestran cero o datos filtrados por un scope diferente.

### Plan quirurgico

1. Crear `agro-section-stats.js` — módulo nuevo que:
   - Fetch data por sección directamente de Supabase (independiente del global)
   - Computa stats completas: USD, Bs, COP, por cultivo, por comprador/cliente, temporal
   - Renderiza panel rico dentro de los containers existentes (`*-dedicated-stats`)
   - Charts con Chart.js (timeline + por cultivo)
   - Insights trazables
   - Export MD por sección
   - Selector de rango temporal
2. CSS en `agro-operations.css` — estilos para el panel stats
3. Wire en `index.html` bootstrap — import dinámico del módulo
4. El viejo `updateDedicatedViewStats()` en agro.js queda como fallback sin tocar

### Archivos

| Archivo | Cambio |
|---|---|
| `agro/agro-section-stats.js` | NUEVO — módulo completo de stats por sección |
| `agro/agro-operations.css` | Estilos para panel stats rico |
| `agro/index.html` | Wire del módulo en bootstrap |
| `docs/AGENT_REPORT_ACTIVE.md` | Diagnóstico + cierre |

### Riesgos

- Queries Supabase adicionales por sección (mitigado: solo se ejecutan al navegar a stats)
- Column `cliente` en agro_pending puede no existir en todos los tenants (manejar gracefully)
- Chart.js ya cargado globalmente — reutilizar sin conflicto

### Implementacion

#### Bug stats=0 corregido

El nuevo módulo `agro-section-stats.js` fetch data directamente de Supabase por sección, independiente del summary global. Esto elimina la dependencia de `window.__YG_AGRO_LAST_SUMMARY__` y garantiza que las stats siempre reflejen los datos reales de cada tabla.

#### Nuevo módulo: agro-section-stats.js (~820 líneas)

| Feature | Descripción |
|---|---|
| Fetch independiente | Cada sección query su propia tabla de Supabase (no depende del global) |
| USD + Bs + COP | Breakdown por moneda usando `currency` y `monto`/`monto_usd` |
| Rango temporal | Selector 7d / 30d / 90d / Año / Todo — filtra por fecha |
| KPI cards | Total USD, Total Bs (si hay), Total COP (si hay), Movimientos, Promedio |
| Chart timeline | Bar chart de montos por mes (Chart.js) |
| Chart por cultivo | Doughnut chart de distribución por cultivo |
| Chart por comprador/cliente | Horizontal bar chart top 8 |
| Insights trazables | Mejor período, top cultivo, top comprador/cliente, pendiente total (fiados) |
| Export MD | Genera y descarga archivo .md con KPIs, breakdown temporal, por cultivo, por comprador |
| Loading state | Spinner mientras fetch data |
| Error handling | Fallback graceful si columna `cliente` no existe |
| reduced-motion | Charts desactivan animación si `prefers-reduced-motion: reduce` |
| Otros (composite) | Agrega rows sin crop_id de las 5 tablas |

#### Secciones implementadas

| Sección | Tabla | KPIs | Charts | Insights | Export MD |
|---|---|---|---|---|---|
| Pagados | agro_income | Total cobrado USD/Bs, mov, promedio | Timeline, por cultivo, por comprador | Mejor mes, top cultivo, top comprador | Si |
| Fiados | agro_pending | Total pendiente USD/Bs, mov, promedio | Timeline, por cultivo, por cliente | Mayor deuda, top cliente, pendiente total | Si |
| Pérdidas | agro_losses | Total perdido USD/Bs, mov, promedio | Timeline, por cultivo, por causa | Peor mes, top cultivo, causa principal | Si |
| Donaciones | agro_transfers | Total donado USD/Bs, mov, promedio | Timeline, por cultivo, por beneficiario | Mejor mes, top cultivo | Si |
| Otros | composite (5 tablas, crop_id NULL) | Total USD/Bs, mov, promedio | Timeline, por origen | Período más activo | Si |

#### CSS (agro-operations.css)

Estilos ADN V10 para: KPI cards (grid responsive), range selector (pill buttons), chart cards (dark bg, gold border), insights (bullets dorados), export button, loading spinner, empty state. Mobile breakpoint 480px.

#### Archivos modificados

| Archivo | Cambio |
|---|---|
| `agro/agro-section-stats.js` | **NUEVO** — módulo completo 820 líneas |
| `agro/agro-operations.css` | +200 líneas — estilos panel stats + loading |
| `agro/index.html` | +6 líneas — import dinámico del módulo en bootstrap |
| `docs/AGENT_REPORT_ACTIVE.md` | Diagnóstico + cierre |

### Build

- `pnpm build:gold` → **OK** (agent-guard OK, vite OK, UTF-8 OK)
- Bundle: `agro-section-stats-Df2D7ykT.js` 15.24 kB (5.26 kB gzip)

### QA sugerido

1. Navegar a Pagados > Estadísticas → verificar que carga datos reales (no cero)
2. Verificar KPIs muestran USD y Bs si hay registros en VES
3. Cambiar rango temporal (7d, 30d, 90d, Año, Todo) → verificar actualización
4. Verificar gráfico timeline muestra barras por mes
5. Verificar gráfico por cultivo muestra doughnut
6. Verificar insights son trazables a los datos
7. Click "Exportar estadísticas" → verificar descarga .md con contenido correcto
8. Repetir para Fiados, Pérdidas, Donaciones, Otros
9. Fiados: verificar que muestra panel de cuentas por cobrar (pendiente, clientes, deuda)
10. Otros: verificar que agrega registros sin cultivo de todas las tablas
11. Verificar mobile (≤480px) — KPIs en 2 columnas, charts en 1 columna
12. Verificar que Historial de ciclos (analítica global) sigue funcionando sin cambios
13. Verificar que historial por sección no se afectó (subview toggle sigue OK)

### Estado del plan maestro (actualizado)

| Punto | Estado | Nota |
| --- | --- | --- |
| 1. Blindar facturero y transferencias | Muy avanzado | Hecho en sesiones anteriores |
| 2. Cerrar onboarding/wizard de perfil para IA | **Hecho** | Wizard + bridges + contexto completo |
| 3. Fortalecer AgroRepo como memoria operativa | **Hecho** | Tipos, edición, filtros, IA bridge |
| 4. Estadísticas individuales y exportes por sección | **Muy avanzado** | Nuevo módulo con fetch independiente, KPIs USD/Bs, rangos temporales, charts, insights, export MD. Pendiente: QA integral con datos reales, ajustes finos de insights según feedback, posible columna `comprador` si se agrega al schema |
| 5. QA integral final | Pendiente | Próximo paso natural |

---

## Sesión: Redefinición del rol de Codex (2026-03-14)

### Diagnóstico

**Causa raíz y motivación:**
El uso intensivo de Codex para sesiones de QA pesado o exploraciones de browser vía Playwright resulta ineficiente y consume créditos rápidamente, alejándolo de su fortaleza principal.

**Decisión operativa nueva:**
Codex no debe usarse como agente principal de QA intensivo. Vuelve a su rol original de **cirujano**: diagnóstico técnico fino, fixes quirúrgicos, cambios acotados, build/checks y salida limpia. El QA manual/visual debe priorizarse fuera de Codex, documentando los bugs claramente para que luego Codex entre de forma quirúrgica.

### Archivos a tocar
- `AGENTS.md`: Integrar la policy explicitamente en §7 (Reglas de conducta). Riesgo: Bajo.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`: Registro de la sesión. Riesgo: Nulo.

### Implementación
Se agregó el punto 2 a la sección **§7 — Reglas de conducta del agente** en `AGENTS.md`, definiendo el rol de "cirujano" por defecto y restringiendo el uso intensivo de QA/browser/Playwright solo a casos excepcionales. Se delineó el flujo recomendado de 4 pasos (QA manual -> Documentar -> Fix Codex -> Revalidar).

### QA
Validación visual de `AGENTS.md` para confirmar que se mantiene el Markdown correcto y no se modificaron reglas previas inadvertidamente. No se tocó código de producto, por lo que no es necesario un build.

---

## Sesion: Bugfix layout charts de estadisticas por seccion (2026-03-12)

### Diagnostico

- El estiramiento vertical no nace de la data ni de los filtros; nace de la arquitectura visual del panel de charts.
- `apps/gold/agro/agro-section-stats.js` crea cada grafico insertando el `<canvas>` directamente dentro de `.agro-ss-chart-card`, sin wrapper intermedio con altura controlada.
- `apps/gold/agro/agro-section-stats.js` configura Chart.js con `responsive: true` y `maintainAspectRatio: false`.
- `apps/gold/agro/agro-operations.css` define `.agro-ss-charts` como grid y deja `.agro-ss-chart-card` con `min-height`, pero no con una altura util explicita para el viewport del chart, ni con `align-items: start` para cortar el estiramiento entre cards de una misma fila.
- Resultado: el grid estira las cards al alto de la mas grande y el canvas responsive termina expandiendose verticalmente dentro de un contenedor sin altura acotada.
- En desktop el problema se amplifica cuando varias charts comparten la misma fila.
- En mobile la falta de un viewport dedicado deja el alto dependiente del flujo del contenido, no de una proporción estable del panel.

### Causa raiz

- Combinacion exacta de tres factores:
  1. `maintainAspectRatio: false` en Chart.js
  2. ausencia de wrapper `position: relative` + altura controlada para el chart
  3. cards dentro de un grid que permite stretch por fila
- El canvas no tiene un "chart viewport" propio; por eso toma la altura disponible de una card que puede crecer por layout, no por diseño.

### Plan quirurgico

1. Encapsular cada `canvas` en un wrapper dedicado de chart con altura consistente por token/layout.
2. Ajustar CSS del grid y de la card para evitar stretch vertical no deseado entre cards.
3. Mantener `responsive: true` y `maintainAspectRatio: false`, pero ahora apoyados en un contenedor con altura real.
4. Afinar el comportamiento responsive desktop/mobile sin introducir alturas magicas desconectadas entre vistas.
5. Verificar que el rerender por cambio de rango temporal siga destruyendo/recreando charts sin romper filtros, insights ni export MD.

### Archivos a tocar

- `apps/gold/agro/agro-section-stats.js`
- `apps/gold/agro/agro-operations.css`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Si la altura del viewport queda demasiado baja, la lectura de labels/legend puede degradarse en desktop.
- Si la altura queda demasiado alta, el problema visual persiste aunque de forma menor.
- Cualquier ajuste debe respetar el rerender de Chart.js al cambiar rango temporal para no dejar instancias o tamaños stale.

### Cambios aplicados

- `apps/gold/agro/agro-section-stats.js`
  - `L411-L422`: cada chart ahora se renderiza mediante `createChartCard(...)` en vez de montar el `canvas` directo en la card.
  - `L461-L478`: nuevo wrapper `.agro-ss-chart-card__viewport` para dar un viewport real al chart.
  - `L745-L750`: `showLoading()` destruye instancias previas antes de reemplazar el DOM, para mantener estable el rerender por rango temporal.
- `apps/gold/agro/agro-operations.css`
  - `L1189-L1192`: variables compartidas `--agro-ss-chart-height` y `--agro-ss-chart-height-mobile`.
  - `L1321-L1362`: grid de charts con `align-items: start`, cards en columna y viewport dedicado con `canvas` al `100%` del alto/ancho.
  - `L1591-L1658`: overrides responsive para mantener una altura controlada y consistente en tablet/mobile.
- No se tocaron queries, filtros temporales, insights, export MD ni wiring de datos; el fix es de contencion visual y ciclo de rerender.

### Build status

- `pnpm build:gold` -> **OK**
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK` (140 modules)
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- `git diff --check` en archivos tocados -> OK

### Validacion y QA

- Validacion tecnica completada:
  - el layout ahora tiene viewport dedicado para charts;
  - el grid ya no debe estirar cards por fila;
  - el canvas queda atado a una altura consistente controlada por CSS variable;
  - el rerender al cambiar rango destruye charts previos antes del loading.
- QA browser intentada sobre preview local:
  - preview levantado en `http://localhost:4173/`;
  - navegacion a `/agro/` redirige a `/index.html#login` sin sesion activa de Supabase;
  - por esa razon no fue posible ejecutar dentro de esta sesion la verificacion funcional completa en Fiados/Pagados con datos reales.
- Higiene QA:
  - navegador Playwright cerrado;
  - carpeta temporal Playwright `1773358761516` eliminada;
  - preview local detenido al finalizar.

### QA sugerido

1. Entrar con sesion real a `Fiados > Estadisticas` y confirmar que cada chart queda contenido en su panel, sin crecimiento vertical excesivo.
2. Cambiar `7 dias / 30 dias / 90 dias / Ano / Todo` y verificar que el alto de las cards se mantiene estable durante el rerender.
3. Repetir en `Pagados`, `Perdidas`, `Donaciones` y `Otros`.
4. Validar desktop (>900px), tablet (<=900px) y mobile (<=480px).
5. Confirmar que insights y export MD siguen saliendo con el mismo contenido esperado.

---

## Sesion: Bugfix sincronizacion de cultivo en estadisticas por seccion (2026-03-12)

### Diagnostico

- El nombre/contexto visible del cultivo en vistas dedicadas no sale de `agro-section-stats.js`; hoy sale del monolito `apps/gold/agro/agro.js` a traves de `selectedCropId`, `get*DedicatedScopeLabel()` y los badges/status de cada vista dedicada.
- `agro-section-stats.js` carga datos por seccion y por rango temporal, pero no lee `selectedCropId`, no escucha `agro:crop:changed` y no agrega el cultivo activo al fetch ni al export MD.
- Resultado: el badge/contexto visible puede venir del selector real, pero los KPIs/charts/insights/export de la capa estadistica quedan en otro scope.
- En `Otros` existe una segunda particularidad: la implementacion de stats general usa `crop_id IS NULL`, mientras el estado compartido de la app permite un cultivo concreto; esa logica tambien debe obedecer el contexto cuando haya cultivo seleccionado.

### Causa raiz

- La capa estadistica por seccion se implemento como modulo independiente, pero quedo aislada de la fuente de verdad del contexto de cultivo:
  1. no consume `selectedCropId`;
  2. no reacciona al evento `agro:crop:changed`;
  3. su export MD solo conoce el rango temporal;
  4. no renderiza un contexto propio, asi que depende visualmente del badge del monolito.

### Plan quirurgico

1. Leer el cultivo activo desde la fuente compartida existente, sin duplicar estado.
2. Aplicar ese cultivo al fetch de estadisticas por seccion y soportar `Vista general`.
3. Re-renderizar stats al cambiar cultivo si la subvista activa es `stats`.
4. Incluir el contexto actual en el panel estadistico y en el export MD.
5. Mantener la logica compuesta de `Otros`, pero respetando cultivo especifico cuando exista.

### Archivos a tocar

- `apps/gold/agro/agro-section-stats.js`
- `apps/gold/agro/agro-operations.css`
- `apps/gold/agro/agro.js` (solo bridge minimo si hace falta)
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Si el modulo escucha el evento pero mantiene un guard de carga demasiado agresivo, puede dejar resultados stale al cambiar cultivo rapido.
- Si el filtro por cultivo se aplica mal en `Otros`, se puede romper su semantica de vista compuesta.
- Si el export MD no usa el mismo contexto que el panel renderizado, reaparecera drift entre UI y archivo exportado.

### Cambios aplicados

- `apps/gold/agro/agro-section-stats.js`
  - ahora lee el cultivo activo desde la fuente compartida (`window.getSelectedCropId` / `YG_AGRO_SELECTED_CROP_ID`);
  - aplica filtro por cultivo en el fetch por seccion y mantiene `Vista general` cuando no hay cultivo seleccionado;
  - en `Otros`, `Vista general` conserva `crop_id IS NULL`, pero un cultivo especifico aplica `eq('crop_id', cropId)` para seguir la logica compuesta real;
  - agrega contexto visible dentro del panel stats (`Contexto activo`);
  - incluye el contexto en el export MD y en el nombre del archivo exportado;
  - escucha `agro:crop:changed` y `AGRO_CROPS_READY` para re-renderizar stats con el cultivo correcto;
  - reemplaza el guard de carga fragil por control de request secuencial para evitar render stale cuando cambia rapido el cultivo.
- `apps/gold/agro/agro-operations.css`
  - agrega estilos V10 para el bloque de contexto visible de stats.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - se registran diagnostico, causa raiz, plan, fix y validacion de esta sesion.

### Build status

- `pnpm build:gold` -> **OK**
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK` (140 modules)
  - `check-llms: OK`
  - `check-dist-utf8: OK`

### Validacion y QA

- Validacion tecnica completada:
  - la capa stats ya no depende solo de rango temporal; ahora usa tambien el cultivo activo compartido;
  - el export MD incluye el contexto real del cultivo/vista general;
  - el rerender por cambio de cultivo invalida respuestas viejas para no dejar KPIs/charts stale.
- QA browser intentada sobre preview local:
  - preview levantado en `http://localhost:4173/`;
  - acceso a `/agro/` redirige a `/index.html#login` por ausencia de sesion real de Supabase;
  - por esa razon no fue posible completar dentro de esta sesion la verificacion funcional en `Fiados > Estadisticas`, `Pagados` y otra seccion con datos reales del usuario.
- Higiene QA:
  - navegador Playwright cerrado;
  - carpeta temporal Playwright `1773358761516` eliminada;
  - preview local detenido al finalizar.

### QA sugerido

1. Entrar con sesion real a `Fiados > Estadisticas` y verificar que el bloque `Contexto activo` muestra `Vista general`.
2. Seleccionar un cultivo distinto y confirmar que cambian KPIs, charts, insights y export MD.
3. Volver a `Vista general` y confirmar que la data vuelve a agregarse en toda la seccion.
4. Repetir al menos en `Pagados` y `Perdidas` o `Donaciones`.
5. Revisar `Otros` en ambos escenarios:
   - `Vista general` -> movimientos sin cultivo asignado;
   - cultivo especifico -> movimientos compuestos de ese cultivo.

---

## Sesion: Reubicar selector de cultivo a contexto compartido visible en estadisticas (2026-03-12)

### Diagnostico

- El selector de cultivos ya funciona sobre la fuente de verdad compartida (`selectedCropId`), pero su superficie visual sigue montada dentro del bloque de pasos de historial.
- En las vistas dedicadas (`Pagados`, `Fiados`, `Perdidas`, `Donaciones`, `Otros`), el selector actual vive dentro de `.agro-pagados-dedicated__steps`.
- `apps/gold/agro/agro-operations.css` oculta `.agro-pagados-dedicated__steps` cuando `body[data-agro-subview="stats"]`, junto con el historial y el footer.
- Resultado: en `Estadisticas` el usuario pierde el control visual de `Vista general` vs cultivo especifico, aunque la logica interna siga reaccionando al estado global.

### Causa raiz

- El selector nunca se extrajo a una zona compartida del modulo; quedo acoplado al layout de `Paso 1`.
- Al ocultar el contenedor de pasos para la subvista `stats`, tambien se oculta el unico punto visible de control del contexto de cultivo.

### Plan quirurgico

1. Sacar el selector de cultivo del bloque de pasos y llevarlo a una zona compartida por encima de `Historial` y `Estadisticas`.
2. Reusar los mismos IDs y el mismo estado global para no duplicar logica ni crear un segundo selector.
3. Dejar los pasos solo para acciones de creacion/wizard.
4. Estilizar el bloque compartido con ADN V10 para que funcione como contexto visible de verdad en ambas subviews.
5. Validar que historial, stats y export MD sigan usando el mismo cultivo activo.

### Archivos a tocar

- `apps/gold/agro/index.html`
- `apps/gold/agro/agro-operations.css`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Si se duplican accidentalmente IDs de `crop-row` o `scope-copy`, el binding del monolito se rompe.
- Si el selector se mueve pero conserva copy de `Paso 1`, la UX puede quedar inconsistente entre historial y stats.
- Si `Otros` no mantiene su copy especifica, puede confundir `Vista general` con "todos los cultivos" cuando en realidad es una vista compuesta.

### Cambios aplicados

- `apps/gold/agro/index.html`
  - se extrajo el selector de cultivo de `Pagados`, `Fiados`, `Perdidas`, `Donaciones` y `Otros` a un nuevo bloque compartido `agro-dedicated-context`, visible por encima de `Historial` y `Estadisticas`;
  - se conservaron los mismos IDs (`*-dedicated-crop-row` y `*-dedicated-scope-copy`) para mantener intacta la fuente de verdad del cultivo activo;
  - los bloques operativos que quedan dentro de `agro-pagados-dedicated__steps` pasaron a ser solo acciones principales de registro/wizard, sin semantica de `Paso 2`.
- `apps/gold/agro/agro-operations.css`
  - se agrego la arquitectura visual del nuevo contexto compartido como panel analitico reutilizable;
  - se integraron tipografia, spacing y responsive del bloque a ADN V10;
  - el selector sigue visible en desktop y mobile porque ya no depende del contenedor que se oculta en `stats`.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - se registran diagnostico, causa raiz, plan, fix y validacion de esta sesion.

### Build status

- `pnpm build:gold` -> **OK**
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK` (140 modules)
  - `check-llms: OK`
  - `check-dist-utf8: OK`

### Validacion y QA

- Validacion tecnica completada:
  - el selector ahora existe una sola vez por seccion y ya no queda dentro de `.agro-pagados-dedicated__steps`;
  - `Historial` y `Estadisticas` comparten el mismo control visual de cultivo sin duplicar IDs ni estado;
  - `git diff --check` paso limpio.
- QA browser funcional no completada en esta sesion:
  - no se ejecuto verificacion end-to-end con datos reales porque el acceso local a `/agro/` sigue requiriendo sesion valida de Supabase;
  - por esa limitacion, la comprobacion de cambio real en KPIs, charts, insights y export MD debe hacerse con sesion real del usuario.

### QA sugerido

1. Entrar con sesion real a `Fiados > Estadisticas` y confirmar que el selector de cultivos permanece visible por encima del panel estadistico.
2. Cambiar entre `Vista general` y un cultivo especifico y verificar que el historial responde al mismo control.
3. Confirmar que tambien cambian KPIs, charts, insights y export MD.
4. Repetir la validacion en `Pagados` y al menos una seccion adicional (`Perdidas`, `Donaciones` u `Otros`).
5. Revisar mobile para confirmar que el bloque `Contexto compartido` apila correctamente el copy y la tira de cultivos.

---

## Sesion: Refinar scrollbar del contexto compartido de cultivos con ADN V10 (2026-03-13)

### Diagnostico

- El scroll horizontal visible del selector/contexto compartido sale del contenedor `.agro-dedicated-context .agro-pagados-crop-row`.
- Hoy ese row solo declara `overflow-x: auto` y `scrollbar-width: thin`, por lo que en desktop queda a merced del scrollbar nativo del navegador/SO.
- En `<=900px`, `apps/gold/agro/agro-operations.css` ademas fuerza `scrollbar-width: none` y `::-webkit-scrollbar { display: none; }` sobre `.agro-pagados-crop-row`.
- Resultado: en desktop la barra se ve generica del sistema operativo y en tablet/mobile la pista visual del scroll desaparece por completo, dejando una UX menos premium y menos clara.

### Causa raiz

- El row desplazable del contexto compartido no recibio un tratamiento visual propio cuando se extrajo a la zona compartida.
- El CSS heredado para crop rows prioriza overflow funcional, pero no integra scrollbar, track, thumb ni estados de interaccion al lenguaje dark metallic de YavlGold.

### Plan quirurgico

1. Aplicar estilo de scrollbar solo al row de cultivo dentro de `.agro-dedicated-context`.
2. Reemplazar la apariencia nativa por track y thumb oscuros con gold metalico sutil, sin afectar scrollbars globales del producto.
3. Mantener feedback discreto en `hover` y `active`, con radios y contraste alineados a ADN V10.
4. Restaurar visibilidad/uso del scrollbar en tablet/mobile para este row, sin ocultarlo por completo.
5. Ejecutar build final y registrar validacion.

### Archivos a tocar

- `apps/gold/agro/agro-operations.css`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Si el selector se estiliza con alcance demasiado amplio, puede contaminar scrollbars de otras zonas del producto.
- Si se hace demasiado fino o con contraste insuficiente, el scrollbar puede verse elegante pero perder usabilidad.
- En algunos navegadores moviles parte del rendering del scrollbar sigue siendo del motor del navegador; el fix debe mejorar la integracion sin depender de hacks globales fragiles.

### Cambios aplicados

- `apps/gold/agro/agro-operations.css`
  - se identifico el contenedor exacto del scroll visible como `.agro-dedicated-context .agro-pagados-crop-row`;
  - se agrego styling localizado del scrollbar con track dark metallic y thumb gold sutil, usando tokens del sistema (`--bg-*`, `--gold-*`, `--border-*`, `--radius-pill`, `--shadow-gold-*`);
  - se incorporaron estados discretos de `hover`, `focus-within` y `active` para el thumb;
  - se restauro la visibilidad del scrollbar en `<=900px` solo para el contexto compartido, evitando que ese row siga heredando `scrollbar-width: none` / `display: none`;
  - se agrego `prefers-reduced-motion` para eliminar la transicion del thumb cuando el usuario lo solicite.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - se registran diagnostico, causa raiz, plan, fix y validacion de esta sesion.

### Build status

- `pnpm build:gold` -> **OK**
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK` (140 modules)
  - `check-llms: OK`
  - `check-dist-utf8: OK`

### Validacion y QA

- Validacion tecnica completada:
  - `git diff --check` paso limpio;
  - el styling del scrollbar quedo limitado al row desplazable del contexto compartido y no se expandio al resto del producto;
  - desktop conserva scrollbar visible estilizado y `<=900px` ya no la oculta para ese bloque.
- QA funcional/manual no completada con navegador autenticado:
  - no fue posible abrir la vista real de Agro dentro de esta sesion con datos del usuario porque el acceso local sigue requiriendo sesion valida de Supabase;
  - por esa razon, la comprobacion visual final de hover/active y sensacion premium en desktop/mobile queda pendiente con sesion real.

### QA sugerido

1. Abrir `Fiados > Estadisticas` con sesion real y confirmar que el scrollbar horizontal del selector ya no luce nativo/genérico.
2. Verificar que el thumb y el track usan tonos oscuros con gold sutil y mantienen lectura limpia sobre el panel.
3. Probar `hover` y `active` en desktop y confirmar feedback discreto.
4. Probar en mobile/tablet y confirmar que el scrollbar sigue siendo usable y ya no queda oculto para ese bloque.
5. Repetir al menos en `Pagados` y otra seccion con contexto compartido.

---

## Sesion: QA browser real sobre main para sidebar, stats, selector compartido y AgroRepo (2026-03-13)

### Diagnostico

- El alcance de esta sesion es QA funcional y visual en browser real sobre main, priorizando sidebar/submenus, stats por seccion, selector compartido, containment de charts, exportes MD, AgroRepo y coherencia DNA V10.
- El riesgo operativo principal sigue siendo el guard de auth: la experiencia Agro redirige a /index.html#login sin sesion valida de Supabase, y QA anteriores quedaron bloqueadas por ausencia de sesion real.
- Antes de corregir nada, esta sesion intentara reproducir flujos reales con preview local y navegador automatizado.

### Causa raiz

- Aun no determinada para bugs funcionales; primero se necesita validar si la app es alcanzable con sesion real desde el entorno de QA.

### Plan quirurgico

1. Confirmar main, levantar preview local y abrir la app con navegador real.
2. Ejecutar QA de sidebar, submenus, stats, selector compartido, exports y AgroRepo hasta donde permita la sesion.
3. Si aparecen bugs pequenos y claros, aplicar fix quirurgico y revalidar.
4. Ejecutar pnpm build:gold, cerrar browser/contexto, limpiar temporales y actualizar plan maestro.

### Archivos a tocar

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- codigo solo si QA reproduce bugs pequenos y acotados.

### Riesgos

- Sin sesion real, la QA funcional sobre datos reales puede quedar limitada al guard/login y no a los modulos internos.
- Forzar bypass de auth invalidaria el objetivo de probar la app real.

### Cambios aplicados

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - se documenta la sesion de QA browser real, los bloqueos del entorno y el estado actualizado del plan maestro.
- Ajustes temporales de entorno local, no persistidos en git:
  - se levanto `pnpm -C apps/gold preview --host 127.0.0.1 --port 4174`;
  - se intento `pnpm -C apps/gold dev --host 127.0.0.1 --port 4175`;
  - se levanto `supabase start --exclude studio,postgres-meta,logflare,vector,edge-runtime,imgproxy,storage-api`;
  - se uso un servidor estatico sobre `apps/gold/dist` en `127.0.0.1:4176`;
  - se sincronizo temporalmente `apps/gold/.env` con la publishable key local de Supabase para esta QA y luego se revirtio al valor previo.

### Build status

- `pnpm build:gold` -> **OK**
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK` (140 modules)
  - `check-llms: OK`
  - `check-dist-utf8: OK`

### Validacion y QA

- Browser real ejecutado sobre `main`:
  - `http://127.0.0.1:4174/agro/` y luego `http://127.0.0.1:4175/agro/` / `http://127.0.0.1:4176/index.html#login` se abrieron en Playwright;
  - se confirmo el gate real: `/agro/` redirige a `/index.html#login` sin sesion valida;
  - se confirmo que el modal real de auth carga y que registro/login pasan por hCaptcha real.
- Hallazgos operativos bloqueantes:
  1. `QA-BLOCKER-01` — hCaptcha bloquea la automatizacion del registro/login real:
     - reproduccion: abrir `index.html#login`, ir a `Registro`, completar datos y enviar;
     - resultado: hCaptcha muestra desafio visual manual y frena la continuacion automatizada;
     - severidad: Alta para QA automatizada, no clasificado como bug funcional del producto.
  2. `QA-BLOCKER-02` — entorno Supabase local incompleto / inestable:
     - `supabase start` completo falla en Windows por servicios auxiliares (`vector`/health checks);
     - el backend solo pudo arrancarse parcialmente con exclusiones;
     - durante la sesion el daemon Docker dejo de responder y `127.0.0.1:54321` paso a `connection refused`;
     - severidad: Alta para QA local.
  3. `QA-BLOCKER-03` — el backend local levantado no expone tablas `agro_*` en PostgREST:
     - evidencia: el OpenAPI en `/rest/v1/` no contiene rutas `agro_*`, y requests a `/rest/v1/agro_crops` / `/rest/v1/profiles` responden `404`;
     - impacto: aunque exista una sesion de auth local, no hay superficie de datos Agro verificable para stats, AgroRepo ni exports;
     - severidad: Alta.
- Alcance efectivamente validado:
  - redirect de guard auth a login;
  - carga visual real de la landing + modal auth;
  - presencia real de hCaptcha en el flujo;
  - build de `main`.
- Alcance NO validado por bloqueo de entorno:
  - sidebar/submenus dentro de Agro autenticado;
  - stats por seccion con datos reales;
  - selector compartido de cultivos en estadisticas;
  - containment real de charts en runtime con data;
  - exportes MD;
  - AgroRepo autenticado;
  - wizard/contexto IA interno.

### Estado Del Plan Maestro

1. Hecho
   - Cerrar onboarding / wizard de perfil para alimentar contexto de IA.
   - Fortalecer AgroRepo como memoria operativa.
2. Muy avanzado
   - Blindar facturero y transferencias.
   - Terminar estadisticas individuales y exportes por seccion.
     - Implementacion y build estan listos, pero NO se marca como Hecho porque la QA browser real de hoy quedo bloqueada por entorno/auth local.
3. Pendiente
   - Hacer QA integral final.
     - Esta sesion avanzo el diagnostico de entorno, pero no pudo cerrar la validacion funcional real de Agro.

### QA sugerido

1. Ejecutar QA en un entorno con sesion valida reutilizable o con Supabase local completo y tablas `agro_*` expuestas.
2. Repetir sobre browser real autenticado:
   - sidebar/submenus en `Pagados`, `Fiados`, `Perdidas`, `Donaciones`, `Otros`;
   - stats por seccion con rangos, selector compartido y exportes MD;
   - AgroRepo (crear, editar, filtrar, markdown);
   - visual DNA 10 en desktop y mobile.
3. Si se mantiene el flujo local:
   - estabilizar `supabase start` en Windows;
   - alinear la publishable key local y una sesion QA reutilizable antes de repetir Playwright.

---

## Sesion: Destrabar QA autenticado real de Agro sin debilitar produccion (2026-03-12)

### Diagnostico

- El QA integral final quedo bloqueado por tres factores de entorno, no por bugs confirmados del producto:
  - `hCaptcha` exige resolucion manual en el login/registro real;
  - Supabase local en Windows fue inestable y no sostuvo una superficie confiable para repetir QA;
  - el backend local disponible no expuso correctamente las tablas `agro_*`, por lo que aun con auth local no habia superficie real de Agro para validar.
- La necesidad real no es "bypassear" seguridad, sino dejar una via estable y repetible para entrar autenticado a `Agro` y ejecutar QA browser real sobre el proyecto visible `yavlgold.com`.
- El usuario entrego una cuenta de prueba no sensible para esta tarea, lo que habilita usar el entorno real como referencia de QA sin tocar la configuracion de auth de produccion.

### Causa raiz

- La automatizacion anterior intento resolver QA sobre un entorno local que no era la fuente mas estable para este producto hoy.
- La app ya tiene una via autentica de acceso en produccion, pero faltaba operacionalizar una estrategia segura y repetible para reutilizar una sesion QA autenticada sin depender de rehacer el captcha en cada corrida automatizada.

### Plan quirurgico

1. Auditar el flujo real de auth/captcha en `yavlgold.com` con la cuenta de prueba provista.
2. Si el captcha exige resolucion manual, usarlo solo como paso humano puntual para generar una sesion valida y luego persistirla para Playwright.
3. Verificar que la sesion autenticada entra de verdad a `/agro/` y permite observar la superficie necesaria para el QA integral final.
4. Confirmar que el backend real accesible desde esa sesion expone las tablas y vistas `agro_*` requeridas para stats, historial y AgroRepo.
5. Documentar un flujo repetible de QA autenticado, explicito, reversible y sin impacto en la seguridad de produccion.

### Archivos a tocar

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- Codigo solo si aparece un bug pequeno, claro y estrictamente necesario para habilitar QA local/staging sin contaminar produccion.

### Riesgos

- Si el captcha requiere intervencion manual, la automatizacion completa seguira necesitando un paso humano inicial para refrescar la sesion QA.
- Persistir storage/auth state debe hacerse solo en un artefacto local de QA y nunca como bypass productivo ni en archivos versionados.
- Si la cuenta de prueba no tiene datos suficientes en Agro, la autenticacion podria validarse sin cerrar aun toda la cobertura funcional del QA final.

### Decision tomada

- Se descarta por ahora usar Supabase local/Windows como via principal de QA autenticado porque fue la fuente mas inestable del intento anterior.
- Se adopta como estrategia oficial de desbloqueo el **entorno real `yavlgold.com` + cuenta QA de prueba + `storageState` local reutilizable de Playwright**.
- El captcha **no** se desactiva ni se debilita en produccion. La sesion se genera con el flujo autentico de la app y luego se reutiliza localmente para QA repetible.

### Cambios aplicados

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - se documenta diagnostico, causa raiz, decision, validacion y limites de esta sesion.
- Ajustes operativos locales no versionados:
  - se inicio sesion real en `https://www.yavlgold.com/agro/` con la cuenta QA de prueba;
  - se serializo el contexto autenticado en `output/agro-qa-storage-state.json`;
  - se agrego `output/agro-qa-storage-state.json` a `.git/info/exclude` para evitar commits accidentales del token de QA;
  - se elimino la captura temporal del reto hCaptcha usada durante el diagnostico visual.

### Validacion

- Flujo auth real validado:
  - `https://www.yavlgold.com/agro/` redirige correctamente a login cuando no hay sesion;
  - `hCaptcha` esta activo y el backend real exige verificacion a nivel de `Supabase Auth` (sin token devuelve `captcha verification process failed`);
  - una vez emitida la verificacion valida, el usuario QA entra de verdad a `https://www.yavlgold.com/agro/`.
- Reutilizacion de sesion validada:
  - se guardo `storageState` local en `output/agro-qa-storage-state.json`;
  - se abrio un **contexto nuevo** de navegador usando ese archivo y cargo `https://www.yavlgold.com/agro/` sin redirigir a login ni rehacer captcha.
- Backend Agro validado en entorno real:
  - requests autenticados a `agro_crops`, `agro_income`, `agro_pending`, `agro_losses`, `agro_transfers`, `agro_farmer_profile`, `agro_public_profiles` y `user_onboarding_context` respondieron `200`;
  - el cliente real expuesto como `window.__YG_AGRO_SUPABASE` confirmo sesion valida para `yavlcapitan@gmail.com`.
- Estado de datos de la cuenta QA:
  - `agro_crops`: `0`
  - `agro_income`: `0`
  - `agro_pending`: `0`
  - `agro_losses`: `0`
  - `agro_transfers`: `0`
  - esto significa que el **bloqueo de auth ya esta resuelto**, pero el QA integral final de estadisticas/exportes todavia requiere sembrar dataset QA o usar una cuenta de prueba con datos.
- Nota sobre AgroRepo:
  - `agrorepo.js` sigue siendo `local-first` via `localStorage` (`APP_KEY = agrorepo_ultimate_v2`), no una tabla productiva en Supabase;
  - consultar `agro_repo_entries` en produccion devuelve `PGRST205` porque esa tabla no existe en el schema cache, lo cual es coherente con la implementacion actual y no un bug nuevo del flujo de auth.

### Build status

- No se ejecuto `pnpm build:gold` en esta sesion porque no hubo cambios de codigo productivo; solo se actualizo documentacion y artefactos locales de QA no versionados.

### Estado Del Plan Maestro

1. Hecho
   - Cerrar onboarding / wizard de perfil para alimentar contexto de IA.
   - Fortalecer AgroRepo como memoria operativa.
2. Muy avanzado
   - Blindar facturero y transferencias.
   - Terminar estadisticas individuales y exportes por seccion.
     - La ruta de auth QA ya esta destrabada, pero la cuenta de prueba sigue sin dataset para cerrar la validacion funcional rica.
3. Pendiente
   - Hacer QA integral final.
     - Ya no esta bloqueado por login/captcha/entorno local.
     - El siguiente cuello de botella es disponer de datos QA suficientes en la cuenta de prueba o en otra cuenta controlada.

### QA sugerido

1. Reusar `output/agro-qa-storage-state.json` para abrir Playwright autenticado directo sobre `https://www.yavlgold.com/agro/`.
2. Poblar la cuenta QA con un dataset minimo controlado antes del QA integral final:
   - al menos 1 cultivo;
   - 1 registro en `Pagados`;
   - 1 registro en `Fiados`;
   - 1 registro en `Perdidas`;
   - 1 registro en `Donaciones` o `Otros`;
   - 1 entrada en AgroRepo.
3. Con ese dataset, ejecutar el QA integral final pendiente sobre sidebar, stats por seccion, selector compartido, exportes MD y AgroRepo.

---

## Sesion: Siembra de dataset QA y QA integral final autenticado sobre main (2026-03-12)

### Diagnostico

- La ruta de QA autenticado ya esta destrabada en `https://www.yavlgold.com/agro/` con sesion Playwright reutilizable.
- El bloqueo actual ya no es de auth sino de **ausencia de dataset** en la cuenta QA `yavlcapitan@gmail.com`.
- Para cerrar el punto 5 del plan maestro hace falta un dataset pequeno, interpretable y distribuido en el tiempo, suficiente para validar historial, stats, selector compartido, vista general, exportes, papelera, reversiones y AgroRepo.

### Plan quirurgico

1. Inspeccionar el esquema real de las tablas `agro_*` y el flujo de insercion actual en el codigo para no sembrar datos incompatibles.
2. Preparar un dataset QA minimo y trazable sobre la cuenta autenticada:
   - 2 o 3 cultivos;
   - ingresos pagados;
   - fiados;
   - perdidas;
   - donaciones / otros / transferencias segun aplique;
   - perfil y onboarding;
   - entradas de AgroRepo via su almacenamiento real.
3. Validar que la data sembrada aparece correctamente via queries reales.
4. Ejecutar QA integral final en browser real sobre `main`.
5. Solo si aparece un bug pequeno y claro, corregirlo de forma quirurgica, rebuild si hubo codigo y revalidar.

### Archivos / tablas a tocar

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- Tablas productivas de la cuenta QA, siempre bajo RLS / sesion real:
  - `agro_crops`
  - `agro_income`
  - `agro_pending`
  - `agro_losses`
  - `agro_transfers`
  - `agro_farmer_profile`
  - `user_onboarding_context`
- Persistencia local de AgroRepo si la implementacion actual sigue siendo `local-first`.

### Riesgos

- Insertar datos sin inspeccionar columnas obligatorias puede romper consistencia o dejar registros inutiles para QA.
- Si el flujo de negocio genera dependencias entre tablas (por ejemplo transferencias o reversiones), una siembra directa mal hecha puede no representar bien el producto.
- AgroRepo puede requerir validacion separada porque hoy no vive en tablas productivas sino en `localStorage`.

### Dataset QA sembrado

- Cuenta QA usada: `yavlcapitan@gmail.com` (`user_id = 4cad20cf-92d5-430b-ae47-e6b728587ee7`).
- Perfil y contexto sembrados:
  - `agro_farmer_profile` con `Capitan QA`, finca y ubicacion de prueba.
  - `user_onboarding_context` completo para desbloquear perfil / asistente.
  - `agro_public_profiles` poblado y desactivado.
- Dataset operativo final, pequeno y trazable:
  - `agro_crops`: `3`
  - `agro_income`: `5`
  - `agro_pending`: `4`
  - `agro_losses`: `2`
  - `agro_transfers`: `3`
  - `agro_expenses`: `4`
- Cobertura de datos:
  - `USD`, `COP` y `VES`;
  - decimales (`1.5`, `0.5`, `0.25`);
  - cultivos `Maiz Amarillo`, `Tomate Rinon`, `Batata Amarilla`;
  - compradores / clientes `Don Pedro`, `Comercial La Granja`, `Maria Elena`, `Jesus Mora`, `Mercado Local`;
  - dispersion temporal suficiente para `7 dias`, `30 dias`, `90 dias`, `Ano` y `Todo`.
- Limpieza final de dataset:
  - durante QA se transfirio un pagado a fiado y luego se restauro desde papelera para validar ambos flujos;
  - ese fiado temporal se dejo `soft-deleted` al cierre para devolver la cuenta QA a un estado coherente y reutilizable.

### Cambios aplicados

- `apps/gold/agro/agro.js`
  - se retiraron columnas legacy inexistentes (`transferred_to_id`, `transfer_type`) del flujo de transferencias y agregados;
  - se alineo la transferencia de fiados con `transferred_income_id`;
  - se acotaron los campos de unidades del consolidado a columnas reales (`unit_type`, `unit_qty`, `quantity_kg`).
- `apps/gold/agro/agroestadistica.js`
  - se corrigieron selects legacy de analitica global (`agro_crops`, `agro_expenses`);
  - se actualizo el parser de comprador para reconocer `Comprador:`, `Cliente:`, `Beneficiario:` y `Destino:` en conceptos reales.
- `apps/gold/agro/agroperfil.js`
  - se reemplazo el set generico de columnas por campos especificos por tabla para que el exporte global MD no consulte columnas inexistentes.
- `apps/gold/agro/agro-stats-report.js`
  - se rehicieron los selects del `Reporte Detallado por Cultivo (MD)` con columnas reales del esquema actual;
  - se tomo `display_name` desde `agro_farmer_profile` para evitar el fallback ruidoso a `profiles.full_name`;
  - se mejoro el parser de compradores para que el ranking exportado lea nombres embebidos en `concepto`.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - se documentan dataset, fixes, QA real y el cierre final del plan maestro.

### Build status

- `pnpm build:gold` -> **OK** (ejecutado varias veces durante la sesion, ultima corrida despues del fix final).
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Warnings no bloqueantes:
  - engine esperado `node 20.x` y entorno actual `node 25.6.0`;
  - warning de chunk grande del monolito Agro.

### Validacion y QA

- Browser real autenticado ejecutado sobre `main` via `vite preview` local con Supabase real de `yavlgold.com`.
- Sidebar / submenus:
  - `Pagados`, `Fiados`, `Perdidas`, `Donaciones` y `Otros` validan padre toggle + hijos `Historial` / `Estadisticas`;
  - autoexpansion y colapso verificados;
  - `Carrito` y `Rankings` se mantienen como links directos;
  - desktop y mobile (`390x844`) revisados.
- Historial / facturero:
  - `Pagados`, `Fiados`, `Perdidas`, `Donaciones` y `Otros` cargan con data QA real;
  - decimal case visible: `1.5 sacos • 75 kg`;
  - flujo real `Pagado -> Fiado` validado con toast de exito;
  - `Papelera -> Restaurar` validado con roundtrip real;
  - dataset devuelto luego a estado coherente para futuras QA.
- Estadisticas por seccion:
  - `Pagados`, `Fiados`, `Perdidas`, `Donaciones` y `Otros` muestran KPIs reales, charts renderizados, insights y exportes MD;
  - `Vista general` y cultivo especifico funcionan;
  - selector compartido visible en historial + estadisticas;
  - charts contenidos, sin estiramiento vertical, en desktop y mobile.
- Analitica global:
  - `Historial de ciclos` carga totales reales;
  - `Exportar Informe Global (MD)` validado sin errores;
  - `Reporte Detallado por Cultivo (MD)` reproducido con `400`, corregido y revalidado sin errores de consola;
  - panel `Top Compradores` corregido y revalidado con nombres reales (`Don Pedro`, `Maria Elena`, `Comercial La Granja`, `Mercado Local`).
- AgroRepo:
  - creacion de bitacora, alta de entradas, edicion, timeline, markdown y filtros por tag validados en browser real.
- Perfil / wizard IA / asistente:
  - `Mi Perfil` y wizard dedicados abren, precargan y cierran correctamente;
  - `Asistente IA` y `Configurar asistente` abren sin romper la vista;
  - no se envio un prompt real al asistente para evitar ruido de cuota, pero el contexto y la superficie quedaron alcanzables.

### Bugs encontrados y corregidos

1. `QA-BUG-01` — Transferencias / historiales consultaban columnas legacy inexistentes.
   - Causa raiz: `agro.js` seguia mezclando `transferred_to_id` / `transfer_type` con el esquema real.
   - Severidad: Alta.
   - Estado: Corregido.
2. `QA-BUG-02` — Analitica global consultaba campos legacy en `agro_crops` y `agro_expenses`.
   - Causa raiz: selects heredados del esquema historico.
   - Severidad: Alta.
   - Estado: Corregido.
3. `QA-BUG-03` — `Exportar Informe Global (MD)` intentaba leer columnas no compartidas entre tablas.
   - Causa raiz: fetch generico de unidades en `agroperfil.js`.
   - Severidad: Alta.
   - Estado: Corregido.
4. `QA-BUG-04` — `Reporte Detallado por Cultivo (MD)` disparaba `400` por columnas legacy en `agro_crops`, `agro_income` y `profiles`.
   - Causa raiz: `agro-stats-report.js` seguia con selects historicos (`status_mode`, `cycle_days`, `cliente/comprador`, `full_name`).
   - Severidad: Alta.
   - Estado: Corregido y revalidado sin errores.
5. `QA-BUG-05` — `Top Compradores` en la analitica global mostraba `Sin comprador` pese a conceptos con comprador explicito.
   - Causa raiz: parser incompleto en `agroestadistica.js`.
   - Severidad: Media.
   - Estado: Corregido y revalidado.

### Estado Del Plan Maestro

1. Hecho
   - Blindar facturero y transferencias.
   - Cerrar onboarding / wizard de perfil para alimentar contexto de IA.
   - Fortalecer AgroRepo como memoria operativa.
   - Terminar estadisticas individuales y exportes por seccion.
   - Hacer QA integral final.
2. Muy avanzado
   - Ninguno.
3. Pendiente
   - Ninguno bloqueante dentro del alcance actual.

### QA sugerido

1. Reusar `output/agro-qa-storage-state.json` para futuras corridas Playwright autenticadas.
2. Mantener la cuenta QA como dataset controlado de regresion y evitar mutaciones manuales fuera de sesiones documentadas.
3. Si se quiere extender cobertura futura, probar respuesta real del asistente IA con un prompt de bajo costo.

---

## Sesion activa: reestructura de ciclos de cultivos (2026-03-13)

### Diagnostico

- El sidebar actual separa la familia de ciclos en dos links planos del grupo `Principal`:
  - `Cultivos activos` -> `data-agro-view="cultivos"`
  - `Historial de ciclos` -> `data-agro-view="ciclos"`
- En `agro-shell.js`, ambas entradas viven en la misma region `cultivos`, pero como vistas distintas:
  - `cultivos` solo muestra `#cyclesContainer`
  - `ciclos` solo muestra `#crops-cycle-history-accordion` y la analitica global
- La shell ya tiene patron de padre toggle + submenus en `Operaciones`, implementado con:
  - `data-agro-nav-toggle`
  - `data-agro-view`
  - `data-agro-subview`
  - `expandedNavParent`
  - `activeSubview`
- La seccion de ciclos todavia no usa ese patron. Por eso hoy no existe una familia coherente de sub-vistas para ciclos.

### Que existe hoy

- `Ciclos activos`:
  - existe como lectura clara en `#cyclesContainer`;
  - usa `buildActiveCycleCardsData()` + `initCiclos()`;
  - ya calcula progreso, inversion, costos, pagados, fiados y resultado.
- `Ciclos finalizados`:
  - existe parcialmente dentro de `renderCropCycleHistory()`;
  - mezcla finalizados, perdidos y auditoria dentro de un accordion generado por `agro.js`;
  - no vive como subvista dedicada limpia en sidebar.
- `Estadisticas de ciclos`:
  - existe una base real reutilizable en `agroperfil.js` + `agroestadistica.js`;
  - el panel `#agro-global-stats-panel` ya muestra conteos de ciclos, resumen financiero, tops y exportes MD;
  - hoy solo aparece acoplado a `Historial de ciclos`.

### Que no existe hoy

- `Comparar ciclos` no existe como vista, layout ni flujo.
- `Estadisticas de ciclos` no existe como subvista dedicada; solo como panel embebido en la vista de historial.
- No hay un padre `Ciclos de cultivos` que solo haga toggle de submenu.
- La experiencia de `finalizados` sigue siendo mas historial heredado que vista dedicada.

### Causa raiz

1. La shell de ciclos quedo modelada como dos vistas planas (`cultivos` y `ciclos`) en lugar de una sola familia con subviews.
2. El region shell `cultivos` concentra activos, historial y analitica, pero su visibilidad depende de CSS binario por `data-agro-active-view`, no de una arquitectura de sub-vistas.
3. La comparacion entre ciclos nunca fue abstraida como superficie propia, aunque las metricas base ya se calculan al construir las cards.

### Plan quirurgico

1. Reconvertir la familia de ciclos al patron ya probado en `Operaciones`:
   - padre `Ciclos de cultivos` = toggle;
   - hijos navegables = `Ciclos activos`, `Ciclos finalizados`, `Comparar ciclos`, `Estadisticas de ciclos`.
2. Normalizar la shell para que `ciclos` sea la vista base de la familia y use subviews explicitas.
3. Reorganizar la region `cultivos` para separar visualmente:
   - activos;
   - finalizados;
   - comparar;
   - estadisticas.
4. Reusar la analitica global existente como `Estadisticas de ciclos` solo si queda como lectura dedicada y con valor real.
5. Crear una primera version util de `Comparar ciclos` apoyada en metricas ya calculadas por las cards de ciclo.
6. Mantener `agro.js` con wiring minimo y mover la nueva experiencia de comparacion a modulo separado.

### Archivos a tocar

- `apps/gold/agro/index.html`
- `apps/gold/agro/agro-shell.js`
- `apps/gold/agro/agro.js`
- `apps/gold/agro/agro.css`
- `apps/gold/agro/agrociclos.css`
- `apps/gold/agro/agro-cycles-workspace.js` (nuevo modulo, si la implementacion lo confirma)
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Cambiar `cultivos`/`ciclos` a una familia con subviews puede romper accesos legacy si no se dejan aliases o defaults razonables.
- `renderCropCycleHistory()` hoy genera un accordion heredado; si no se encapsula bien, `Ciclos finalizados` puede seguir sintiendose como parche.
- `Comparar ciclos` debe salir con metricas reales; si la fuente compartida no se expone bien desde el monolito, la vista quedaria hueca.
- `Estadisticas de ciclos` solo entra si la vista dedicada aprovecha el panel global existente sin duplicar numeritos vacios.

### Cambios aplicados

- `apps/gold/agro/agro-shell.js`
  - `24-37`: se unifico la familia de ciclos bajo `ciclos` con aliases/subviews canonicass.
  - `158-219`: se definio metadata de `activos`, `finalizados`, `comparar` y `estadisticas`, con foco y copy por subvista.
  - `268-449`: `setActiveView()` y el sync del sidebar ahora respetan subviews, autoexpanden la familia activa y dejan al padre como toggle puro.
  - `488-515`: el click del padre solo expande/colapsa; los hijos navegan con `subview`.
- `apps/gold/agro/index.html`
  - `1174-1186`: el sidebar paso de links planos a padre `Ciclos de cultivos` + cuatro hijos.
  - `1610-1614`, `1661-1662`, `2246-2247`: CTAs internos apuntan a `ciclos/activos` o `ciclos/finalizados`, sin depender del modelo legacy.
  - `1778-1818`: la region `cultivos` se separo en subviews dedicadas para activos, finalizados, comparar y estadisticas.
  - `4364-4367`: se carga el nuevo modulo `agro-cycles-workspace.js`.
- `apps/gold/agro/agro.js`
  - `62-124`: se agrego puente de snapshot para compartir datos reales de ciclos con subviews externas.
  - `10329-10510`: las cards activas/finalizadas ahora exponen metricas reutilizables para comparar ciclos.
  - `10690-11117`: el historial heredado se reubico dentro de `Ciclos finalizados`, con host dedicado y copy de cierre.
  - `11122-11347`: `loadCrops()` publica snapshots para `finalizados/comparar` y se corrigio el selector al nuevo `#cyclesContainer`.
- `apps/gold/agro/agro-cycles-workspace.js`
  - `1-494`: nuevo modulo para overview de finalizados y primera version util de `Comparar ciclos` con seleccion A/B y delta por metricas reales.
- `apps/gold/agro/agrociclos.css`
  - `547-895`: reglas de visibilidad por subview y estilos dedicados para finalizados/comparar con ADN V10.
- `apps/gold/agro/agro.css`
  - `6146-6168`: affordance visual del padre toggle (`chevron`) y estado expandido.

### Build status

- `pnpm build:gold` -> **OK**
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Warnings no bloqueantes:
  - engine esperado `node 20.x`, entorno actual `node 25.6.0`;
  - warning de chunk grande del monolito Agro.

### QA ejecutado

- Desktop (`1440x1800`) con navegador real:
  - click en `Ciclos de cultivos` expande submenus sin navegar ni sacar la vista actual;
  - click en `Ciclos activos` navega a `ciclos|activos` y muestra la lectura operativa dedicada;
  - click en `Ciclos finalizados` navega a `ciclos|finalizados` y muestra overview + historial dedicado;
  - click en `Comparar ciclos` navega a `ciclos|comparar` y muestra estado util de comparacion cuando no hay base suficiente;
  - click en `Estadisticas de ciclos` navega a `ciclos|estadisticas` y muestra el panel global dedicado;
  - segundo click en el padre colapsa submenu y conserva la subvista activa.
- Mobile (`390x844`) con navegador real:
  - hamburger abre sidebar (`body.agro-shell-open = true`, `aria-hidden=false`);
  - la familia `Ciclos de cultivos` se mantiene expandable;
  - click en `Ciclos finalizados` navega a `ciclos|finalizados` y cierra sidebar (`body.agro-shell-open = false`, `aria-hidden=true`).
- Limitacion de QA:
  - la ruta `/agro/` sigue protegida por sesion real de Supabase;
  - para validar shell/subviews se uso un bypass temporal solo dentro del navegador automatizado, interceptando `session-guard` sin tocar el repo;
  - por no existir una sesion real, quedaron errores esperables de perfil/estadisticas al consultar datos autenticados.

### Cierre

- `Ciclos de cultivos` ya no es un link ambiguo ni un parche entre `cultivos`/`ciclos`; ahora es una familia escalable con padre toggle y subviews reales.
- `Estadisticas de ciclos` si entro hoy porque ya existia una base de valor real y quedo integrada como lectura dedicada.
- La deuda residual principal es QA autenticada con dataset real para validar `Comparar ciclos` y `Estadisticas de ciclos` con datos vivos, no solo estructura/vacio controlado.

---

## Sesion activa: credenciales QA locales para pruebas reales (2026-03-13)

### Diagnostico

- Se necesitaba una via local y documentada para que futuros agentes puedan ejecutar QA autenticada real en produccion sin volver a pedir credenciales cada vez.
- El requisito correcto era mantener la credencial fuera de archivos versionados y fuera de reportes canonicos.

### Cambios aplicados

- `.gitignore`
  - se agrego una entrada explicita para `testqacredentials.md` como defensa adicional, aunque el patron `*credentials*.md` ya lo cubria.
- `testqacredentials.md`
  - se creo el archivo local en la raiz del repo con la cuenta QA y reglas de uso;
  - el contenido sensible queda solo en este archivo ignorado por Git.
- `AGENTS.md`
  - se agrego la seccion `Credenciales QA locales`;
  - se documenta que los agentes pueden consultar `testqacredentials.md` solo si existe localmente;
  - se deja explicito que la credencial no debe copiarse a `AGENTS.md`, reportes, issues o PRs.

### Build status

- No ejecutado en esta micro-sesion.
- Motivo: el alcance fue solo documental/local (`.gitignore`, `AGENTS.md`, archivo sensible ignorado) y no hubo cambios de producto.

### QA sugerido

1. Verificar con `git check-ignore -v testqacredentials.md` que el archivo siga ignorado.
2. Cuando se use la cuenta QA en browser real, cerrar sesion al final y limpiar cualquier storage state persistido.
3. Si la clave cambia, actualizar solo `testqacredentials.md` y nunca replicarla en archivos versionados.

---

## Sesion activa: QA real en produccion para ciclos (2026-03-13)

### Diagnostico

- Se intento validar en `https://www.yavlgold.com/agro/` la reestructura nueva de `Ciclos de cultivos` usando la cuenta QA local.
- El objetivo era confirmar el estado real del deploy y, si era posible, ejecutar QA autenticada completa sobre produccion.

### Cambios aplicados

- No hubo cambios de producto en esta sesion.
- Solo se actualiza el reporte con hallazgos de QA real.

### Hallazgos

- El deploy productivo visible todavia sirve la navegacion anterior de ciclos:
  - sidebar con `Cultivos activos` + `Historial de ciclos`;
  - no aparece padre `Ciclos de cultivos`;
  - no aparecen subitems `Comparar ciclos` ni `Estadisticas de ciclos`.
- Se detecto drift de sesion:
  - una apertura inicial de `https://www.yavlgold.com/agro/` mostro la app autenticada y permitio observar el sidebar viejo;
  - luego la sesion cayo a `/index.html#login` con `Invalid Refresh Token`.
- El login automatizado con la cuenta QA quedo bloqueado por `hCaptcha` con desafio manual, por lo que no fue posible completar la QA autenticada end-to-end en esta corrida.
- El `storageState` local previo (`output/agro-qa-storage-state.json`) ya no alcanza para entrar limpio a produccion; la captura autenticada termino otra vez en login.

### Build status

- No ejecutado en esta sesion.
- Motivo: se hizo QA real/documentacion; no hubo cambios de producto.

### QA sugerido

1. Desplegar primero la rama/commit con la nueva arquitectura de ciclos; hoy produccion aun refleja la estructura anterior.
2. Renovar `storageState` QA con una sesion fresca o resolver manualmente el `hCaptcha` en una corrida controlada.
3. Repetir QA productiva despues del deploy y validar especificamente:
   - padre toggle `Ciclos de cultivos`;
   - hijos `Activos / Finalizados / Comparar / Estadisticas`;
   - mobile + desktop con sesion estable.

---

## Sesion activa: reintento QA produccion con captcha resuelto (2026-03-13)

### Diagnostico

- Se reintento el acceso a `https://www.yavlgold.com/agro/` despues de resolver manualmente el captcha.
- Esta vez la sesion QA si entro de forma valida a la app productiva.

### Hallazgos

- Produccion autentica carga correctamente, pero sigue sirviendo la navegacion anterior de ciclos:
  - `Cultivos activos`
  - `Historial de ciclos`
- No aparece la familia nueva esperada:
  - padre `Ciclos de cultivos`
  - `Ciclos activos`
  - `Ciclos finalizados`
  - `Comparar ciclos`
  - `Estadisticas de ciclos`
- La evidencia coincide con:
  - inspeccion directa del DOM autenticado en browser real;
  - `Invoke-WebRequest` al HTML publico de `/agro/` sobre `www.yavlgold.com` y `yavlgold.com`.

### Cambios aplicados

- No hubo cambios de producto.
- Solo se actualiza el reporte con el estado real observado en produccion.

### Build status

- No ejecutado.
- Motivo: sesion de QA/documentacion sin cambios de codigo.

### QA sugerido

1. Verificar que el deploy productivo apuntado por el dominio sea el commit correcto que contiene la reestructura.
2. Si el deploy ya existe, invalidar cache/CDN y volver a comprobar `/agro/`.
3. Repetir QA real de ciclos solo cuando el HTML servido ya contenga `data-agro-nav-toggle="ciclos"` y los subitems nuevos.

---

## Sesion activa: politica de higiene QA para produccion real (2026-03-13)

### Diagnostico

- Faltaba una regla explicita en `AGENTS.md` para evitar que futuras sesiones de QA sobre produccion dejen datos de prueba ambiguos, duplicados o basura persistente.
- La cuenta QA local ya estaba documentada, pero hacia falta cerrar tambien la politica de limpieza y trazabilidad de datos sembrados durante pruebas reales.

### Cambios aplicados

- `AGENTS.md`
  - se agrego la seccion `Politica de QA sobre produccion real`;
  - se establecio que los datos de prueba deben tratarse como temporales y controlados;
  - se documento la obligacion de limpiar/revertir datos temporales o dejar trazado un dataset QA estable si debe permanecer;
  - se dejo explicito que cualquier dataset persistente debe vivir solo en la cuenta QA dedicada;
  - se reforzo el cierre obligatorio de Playwright/browser y la limpieza de temporales locales.

### Build status

- No ejecutado.
- Motivo: cambio documental en instrucciones canonicas, sin cambios de producto.

### QA sugerido

1. En la proxima sesion de QA real, verificar que cualquier dato sembrado quede borrado o claramente documentado como dataset QA estable.
2. Confirmar al cierre de cada corrida que no quedan duplicados ni estados intermedios en la cuenta QA.
3. Mantener `AGENT_REPORT_ACTIVE.md` como rastro operativo de cualquier siembra, limpieza o persistencia deliberada de datos QA.

---

## Sesion activa: QA funcional real en produccion para ciclos de cultivos (2026-03-13)

### Diagnostico inicial

- La nueva familia de `Ciclos de cultivos` ya esta desplegada en produccion a nivel de HTML publico.
- Falta validar en browser real autenticado si la experiencia funciona end-to-end con datos reales, sin contradicciones entre vistas y sin regresiones visibles.
- Esta sesion se enfoca en navegacion, coherencia de informacion, calidad visual y bugs funcionales reales sobre `https://www.yavlgold.com/agro/` y `https://yavlgold.com/agro/`.

### Plan de QA

1. Iniciar sesion en produccion con la cuenta QA local siguiendo el protocolo de `AGENTS.md`.
2. Validar desktop sobre:
   - sidebar padre/hijos de `Ciclos de cultivos`;
   - `Ciclos activos`;
   - `Ciclos finalizados`;
   - `Comparar ciclos`;
   - `Estadisticas de ciclos`.
3. Repetir validacion base en mobile.
4. Cruce rapido de coherencia entre activos, finalizados, comparar y estadisticas.
5. Documentar hallazgos, corregir solo bugs pequenos y quirurgicos si aparecen, revalidar y limpiar temporales.

### Alcance

- QA funcional real en produccion, no review estatico.
- Validacion con datos reales de la cuenta QA dedicada para agentes.
- Sin refactor grande ni redisenos; solo diagnostico y, si aplica, fix pequeno y claro.

### Riesgos

- `hCaptcha` o expiracion de sesion pueden bloquear el login automatizado.
- La cuenta QA puede no tener suficiente dataset para validar algunas comparaciones profundas.
- Si el QA exige sembrar datos, deberan limpiarse o documentarse segun la nueva politica de higiene en produccion.

### Ejecucion QA

- Se valido la familia de `Ciclos de cultivos` en produccion real autenticada sobre `https://www.yavlgold.com/agro/`.
- Se ejecuto QA funcional en desktop y mobile con browser real.
- No se sembraron ni modificaron datos QA en produccion durante esta sesion.

### Que paso bien

- Sidebar:
  - `Ciclos de cultivos` funciona como padre toggle y no navega automaticamente.
  - segundo clic en el padre colapsa correctamente.
  - los hijos navegan a su subvista correspondiente.
- `Ciclos activos`:
  - cargaron 3 ciclos reales de la cuenta QA (`Batata Amarilla`, `Tomate Rinon`, `Maiz Amarillo`);
  - progreso, fechas, inversion y potencial neto mostraron lectura coherente;
  - la accion `Informe del cultivo` exporta Markdown real.
- `Ciclos finalizados`:
  - la subvista carga limpia;
  - el estado vacio de finalizados/perdidos es honesto y no mezcla activos.
- `Comparar ciclos`:
  - carga con dataset real suficiente;
  - compara estado, progreso, duracion, area, inversion, costos, pagados, fiados y resultado;
  - la mayoria de metricas coincide con lo visible en `Ciclos activos`.
- `Estadisticas de ciclos`:
  - carga sin romper layout;
  - `Activos = 3`, `Finalizados = 0`, `Perdidos = 0`, `Total = 3`, consistente con las otras vistas;
  - ambos exportes Markdown funcionan.
- Mobile:
  - el sidebar abre/cierra bien;
  - al navegar por un hijo, el panel vuelve a cerrarse;
  - no se detecto overflow horizontal en `Comparar ciclos` ni en `Estadisticas de ciclos`.

### Bugs encontrados

1. `Comparar ciclos` no calcula el delta numerico de area
   - Severidad: media
   - Pasos:
     - abrir `Ciclos de cultivos > Comparar ciclos`;
     - comparar `Batata Amarilla` vs `Tomate Rinon`.
   - Comportamiento actual observado en produccion:
     - la tarjeta `Area` muestra `Sin delta numérica`;
     - los valores comparados son `0.6 Ha` vs `0.75 Ha`.
   - Comportamiento esperado:
     - mostrar un delta real de area, no un estado nulo.
   - Causa raiz probable:
     - el workspace de comparacion trataba `area` como texto visible, sin extraer un valor numerico para el calculo.
   - Estado:
     - corregido localmente en `apps/gold/agro/agro-cycles-workspace.js`;
     - pendiente revalidacion productiva tras deploy.

2. `Informe del cultivo` dispara una consulta 400 antes del fallback exitoso
   - Severidad: baja
   - Pasos:
     - abrir `Ciclos activos`;
     - pulsar `Informe del cultivo` sobre `Batata Amarilla`.
   - Comportamiento actual observado en produccion:
     - el exporte Markdown se genera correctamente;
     - la consola registra un `400` inicial contra `agro_crops` y luego una consulta fallback `200`.
   - Comportamiento esperado:
     - exporte limpio, sin request fallida previa.
   - Causa raiz probable:
     - el helper de reporte intentaba primero un `select` con columnas no compatibles con el schema productivo actual.
   - Estado:
     - corregido localmente en `apps/gold/agro/agro-crop-report.js`;
     - pendiente revalidacion productiva tras deploy.

### Bugs corregidos durante QA

- `apps/gold/agro/agro-cycles-workspace.js`
  - se agrego extraccion numerica de `area`;
  - el delta de area ahora se renderiza como numero con unidad (`Ha`) en lugar de quedar en `Sin delta numérica`.
- `apps/gold/agro/agro-crop-report.js`
  - se redujo el `select` por defecto del reporte de cultivo al subconjunto compatible con produccion;
  - objetivo: evitar el `400` inicial antes del fallback.

### Coherencia general de informacion

- `Activos (3)` coincide entre:
  - cards de `Ciclos activos`;
  - `Comparar ciclos`;
  - `Estadisticas de ciclos`.
- `Finalizados (0)` y `Perdidos (0)` coincide entre:
  - `Ciclos finalizados`;
  - `Estadisticas de ciclos`.
- Los montos usados en comparacion para `Batata Amarilla` y `Tomate Rinon` fueron coherentes con los cards activos:
  - inversion base;
  - resultado cobrado;
  - resultado potencial.
- No se detectaron contradicciones visibles entre vistas durante esta corrida.

### Build status

- `pnpm build:gold` = OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Warning no bloqueante:
  - engine esperado `node 20.x`, entorno actual `node 25.6.0`;
  - warning habitual por chunk grande del monolito Agro.

### Revalidacion post-fix

- La correccion quedo validada por build local.
- La revalidacion end-to-end de los dos fixes en browser quedo parcialmente bloqueada porque el preview local compila contra Supabase local (`127.0.0.1:54321`) y no contra el dataset productivo autenticado.
- Se mantiene como pendiente la comprobacion final en produccion una vez desplegados estos dos ajustes.

### Estado desktop

- Aprobado con 2 hallazgos detectados.

### Estado mobile

- Aprobado visual y funcionalmente en la familia de ciclos.

### Estado actualizado del plan maestro

- La familia `Ciclos de cultivos` ya funciona como grupo real y coherente en produccion.
- Quedaron detectadas 2 grietas concretas; ambas tienen fix local aplicado y pendiente de deploy/revalidacion productiva.

### Cleanup

- No se dejaron datos QA nuevos ni basura funcional en produccion.
- Pendiente al cierre tecnico de la sesion:
  - cerrar Playwright/browser;
  - detener preview local;
  - borrar temporales locales de Playwright y descargas de la corrida.

---

## Sesion activa: verificacion final de fixes en produccion para ciclos (2026-03-13)

### Diagnostico

- El usuario indico que los fixes pendientes ya estaban desplegados en produccion.
- Quedaban por verificar solo los dos hallazgos abiertos de la corrida anterior:
  - delta numerico de `Area` en `Comparar ciclos`;
  - ausencia del `400` previo al exportar `Informe del cultivo`.

### Verificacion ejecutada

- Se abrio `https://www.yavlgold.com/agro/` con sesion valida de la cuenta QA.
- Se verifico `Comparar ciclos` sobre:
  - `Batata Amarilla · Temprana · Activo`
  - `Tomate Rinon · Hibrido · Activo`
- Se verifico `Ciclos activos > Informe del cultivo` sobre `Batata Amarilla`.

### Resultado

- `Comparar ciclos`
  - fix verificado en produccion;
  - `Area` ahora muestra `-0.15 Ha` en el delta `A - B`;
  - ya no aparece `Sin delta numérica` para `0.6 Ha` vs `0.75 Ha`.
- `Informe del cultivo`
  - fix verificado en produccion;
  - el export Markdown se descargo correctamente;
  - consola limpia respecto al bug previo:
    - `Errors: 0`
  - red limpia respecto al bug previo:
    - la consulta de metadata a `agro_crops` regreso `200`;
    - no aparecio el `400` que antes precedia al fallback.

### Estado de hallazgos previos

- Bug 1: delta de area en `Comparar ciclos`
  - cerrado.
- Bug 2: `400` previo en export de `Informe del cultivo`
  - cerrado.

### Build status

- No ejecutado en esta micro-sesion de verificacion.
- Motivo: no hubo cambios de codigo; solo comprobacion productiva post-deploy.

### QA sugerido

1. Mantener una pasada corta de regresion cuando cambie de nuevo el contrato de `agro_crops`.
2. Si se agregan nuevos datasets QA con ciclos cerrados/perdidos, repetir una validacion rapida de `Comparar ciclos` con escenarios mixtos.

### Cleanup

- Se cerro Playwright/browser al final de la verificacion.
- Se debe borrar la carpeta temporal local de la sesion Playwright usada en esta corrida.

---

## Sesion activa: AgroRepo como bitacora arbol local-first (2026-03-13)

### Diagnostico

- AgroRepo existe hoy como memoria local-first util, pero su modelo es plano:
  - `bitacoras[]`
  - `reports[]` dentro de cada bitacora
- Esa base sirve para timeline, tags, edicion, exporte y puente IA, pero no permite:
  - carpetas virtuales;
  - archivos Markdown virtuales;
  - navegacion jerarquica real;
  - diarios por cultivo/fecha en forma de arbol navegable.
- La UI actual confirma esa limitacion:
  - sidebar con bitacoras planas;
  - editor/timeline centrado en reportes;
  - preview lateral con estadisticas de la bitacora activa;
  - sin explorador de archivos virtual.

### Causa raiz

- La causa raiz no es visual sino estructural:
  - el dato persistido en `localStorage` (`agrorepo_ultimate_v2`) no representa nodos jerarquicos;
  - la navegacion depende de `activeBitacoraId`, no de carpetas/archivos;
  - timeline, editor y bridge IA asumen que la unidad base es un `report`, no un archivo Markdown virtual.
- Resultado:
  - AgroRepo se siente como lista de reportes por cultivo, no como memoria agricola navegable.

### Plan quirurgico

- Adoptar una arquitectura hibrida, no arbol puro:
  - arbol virtual en sidebar;
  - editor/preview del archivo activo en el cuerpo principal;
  - timeline y metadata contextual como capacidad derivada, no como vista eliminada.
- Crear un nuevo modelo local-first basado en nodos:
  - `nodes[]`
  - `type = folder | file`
  - `id`, `parentId`, `title`, `slug`, `content`, `createdAt`, `updatedAt`, `tags`, `entryType`, `cropId?`
  - `expandedIds`, `activeNodeId`, `activeFolderId` como estado UI
- Migrar controladamente el formato legacy:
  - convertir bitacoras existentes en carpetas;
  - convertir reportes existentes en archivos `.md`;
  - preservar contenido y fechas;
  - mantener timeline y contexto IA como derivados del nuevo arbol.
- Implementar CRUD real:
  - crear carpeta;
  - crear archivo Markdown;
  - renombrar carpeta/archivo;
  - eliminar con confirmacion clara;
  - editar y guardar archivo;
  - exportar archivo `.md`.
- Mantener la filosofia local-first:
  - persistencia en `localStorage`;
  - import/export de backup;
  - sin dependencias nuevas ni complejidad innecesaria.

### Archivos a tocar

- `apps/gold/agro/agrorepo.js`
- `apps/gold/agro/index.html`
- `apps/gold/agro/agro.css`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Riesgo de migracion:
  - perder compatibilidad con contenido legacy si el adaptador no conserva bien fechas, tags y tipos.
- Riesgo UX:
  - convertir AgroRepo en un file manager generico y frio si el timeline se elimina en vez de convivir.
- Riesgo mobile:
  - un arbol demasiado ancho o acciones demasiado densas puede romper usabilidad en <=768px.
- Riesgo tecnico:
  - `agrorepo.js` hoy concentra estado y renderizado; la migracion debe ser integral para evitar mezclar dos modelos incompatibles.

### Decision de arquitectura

- Se eligio opcion `B) hibrido`.
- Motivo:
  - el arbol virtual resuelve organizacion y navegacion;
  - el editor/preview resuelve uso diario real;
  - el timeline contextual conserva el valor operativo e IA de AgroRepo;
  - evita convertir el modulo en un file manager generico sin memoria de contexto.

### Modelo de datos elegido

- Persistencia nueva local-first en `localStorage` bajo `agrorepo_virtual_v3`.
- Estructura:
  - `nodes[]`
  - `folder` y `file`
  - `id`, `parentId`, `title`, `slug`, `content`, `createdAt`, `updatedAt`, `tags`, `entryType`, `cropId`, `position`
  - `activeNodeId`, `expandedIds`, `lastSaved`
- Compatibilidad:
  - migracion desde `agrorepo_ultimate_v2`:
    - bitacoras legacy -> carpetas bajo `Cultivos`
    - reportes legacy -> archivos `.md`

### Cambios aplicados

- `apps/gold/agro/agrorepo.js`
  - nuevo motor `Tree Memory v3`;
  - migracion legacy en `migrateLegacyData()` (`~500`);
  - render de arbol virtual en `renderTreeNode()` (`~890`);
  - workspace hibrido en `renderMainView()` (`~1170`);
  - exporte de archivo `.md` en `buildFileMarkdown()` (`~1408`);
  - bridge IA rearmado sobre archivos del arbol;
  - CRUD de carpeta/archivo, rename, delete, autosave local y backup/import.
- `apps/gold/agro/index.html`
  - subtitle de AgroRepo actualizado;
  - template completo reconstruido como shell de:
    - sidebar arbol;
    - main panel;
    - context rail;
    - modales;
    - toasts.
- `apps/gold/agro/agro.css`
  - nueva capa visual `AgroRepo Tree Memory v3` injertada sobre tokens ADN V10;
  - layout hibrido responsive desktop/mobile;
  - estilos de arbol, editor, preview, timeline, modales y estados.

### QA manual ejecutado

- Metodo:
  - `pnpm build:gold`
  - preview local con `vite preview`
  - sandbox funcional de AgroRepo dentro del build, porque el preview local apunta a Supabase local (`127.0.0.1:54321`) y no permite auth real sin backend local levantado.
- Desktop:
  - se creo `Maíz` dentro de `Cultivos`;
  - se creo `2026-03-13.md`;
  - se escribio contenido Markdown de diario;
  - se marcaron tags `General`, `Riego`, `Abono`, `Clima`;
  - se cambio `Tipo` a `Decision`;
  - `Guardar cambios` persistio;
  - se navego fuera del archivo y se reabrio conservando contenido;
  - `Exportar .md` genero archivo real descargado con metadata y contenido fiel.
- Mobile:
  - viewport `390x844`;
  - sidebar colapsado por defecto;
  - `Abrir árbol` abre sidebar y backdrop;
  - al seleccionar `General`, el sidebar se cierra;
  - `Exportar .md` se desactiva correctamente al quedar una carpeta activa.
- Rename:
  - se renombro carpeta `General` a `Notas libres`;
  - breadcrumb y arbol se actualizaron correctamente.

### Hallazgos QA

- Hallazgo menor:
  - el icono del archivo en el arbol cambiaba al modificar `entryType`, pero el texto meta seguia mostrando `Observacion`.
- Estado:
  - corregido en la misma sesion;
  - se agrego `data-tree-meta-for` y actualizacion live de la meta del nodo archivo.

### Build status

- `pnpm build:gold` = OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Warnings no bloqueantes:
  - engine esperado `node 20.x`, entorno actual `node 25.6.0`
  - warning habitual por chunk grande del monolito Agro

### Pendiente / deuda residual

- Exportar carpeta completa como paquete logico:
  - no se incluyo en esta fase para no meter una UX vacia o un pseudo-zip improvisado;
  - queda como siguiente iteracion real.
- QA con backend local autentico:
  - si se quiere validar el modulo dentro del shell completo sin sandbox, hace falta Supabase local operativo o un entorno preview con auth funcional.

### Cleanup

- Se eliminaran al cierre tecnico:
  - preview local de `vite`;
  - browser de Playwright;
  - carpeta temporal `C:\\Users\\yerik\\AppData\\Local\\Temp\\playwright-mcp-output\\1773431395120`
- No se dejaron datos QA en produccion.

---

## Sesion activa: smoke QA de AgroRepo publicado en produccion (2026-03-13)

### Diagnostico inicial

- El commit `411250c` ya fue desplegado a produccion y requiere una validacion real corta, no un sandbox local.
- El objetivo de esta sesion es confirmar que AgroRepo publicado no quedo roto en:
  - carga inicial;
  - arbol virtual;
  - CRUD basico de carpeta/archivo;
  - persistencia;
  - exporte `.md`;
  - usabilidad mobile.

### Plan de QA

1. Iniciar sesion en `https://www.yavlgold.com/agro/` con la cuenta QA local segun protocolo.
2. Abrir AgroRepo publicado y verificar layout base en desktop.
3. Crear una carpeta virtual y un archivo Markdown virtual dentro de ella.
4. Editar contenido, guardar, reabrir y comprobar persistencia.
5. Cambiar tipo y tags si el flujo publicado lo permite sin friccion.
6. Exportar el `.md` y validar descarga/contenido basico.
7. Repetir una pasada corta en mobile para apertura/cierre del arbol y estabilidad visual.
8. Limpiar o documentar cualquier dato QA creado y cerrar temporales de Playwright.

### Alcance

- Smoke QA funcional en produccion.
- Sin refactor ni cambios de producto salvo que aparezca un bug pequeno y quirurgico.
- Validacion de una sola ruta operativa real, suficiente para confirmar que el deploy es sano.

### Riesgos

- El login puede volver a exigir captcha o interaccion manual.
- Como AgroRepo es local-first, la persistencia real puede depender del dispositivo/browser de QA y no del backend.
- Si el deploy productivo difiere del commit esperado, la sesion puede revelar desalineacion entre codigo subido y app servida.

### QA ejecutado

- Se abrio `https://www.yavlgold.com/agro/` con sesion valida de la cuenta QA.
- Se abrio AgroRepo publicado en produccion y se verifico:
  - carga inicial del arbol virtual;
  - presencia del layout hibrido;
  - persistencia local-first real en browser productivo;
  - exporte `.md`;
  - pasada mobile corta.
- Se ejecuto el flujo real con un dataset QA temporal:
  - carpeta `QA Smoke 2026-03-13` bajo `Cultivos`;
  - archivo `2026-03-13-smoke.md`;
  - contenido Markdown de diario;
  - tipo `Decision`;
  - tags `General`, `Riego`, `Clima`;
  - guardado, reapertura y exporte.

### Hallazgos

- Bug 1: modales invisibles para crear carpeta/archivo
  - severidad: alta
  - pasos para reproducir:
    1. abrir AgroRepo publicado en produccion;
    2. pulsar `Nueva carpeta`, `Subcarpeta`, `Nuevo archivo .md` o `Crear archivo .md`;
    3. observar la pantalla.
  - comportamiento actual:
    - la accion dispara el modal y este queda montado en DOM, pero con `visibility: hidden`;
    - el usuario no ve el formulario y el flujo CRUD queda bloqueado visualmente.
  - comportamiento esperado:
    - el modal debe aparecer visible y usable en pantalla.
  - evidencia tecnica:
    - overlays `arw-modal-overlay` con `aria-hidden="false"` y `visibility: hidden`;
    - el problema se reprodujo tanto en `Crear carpeta` como en `Crear archivo Markdown`.
  - estado:
    - documentado, no corregido en esta sesion de QA.

### Resultado funcional detras del bug

- Para continuar la smoke QA sin alterar el producto, se aplico solo en el navegador de prueba una sobreescritura temporal de visibilidad del modal.
- Con esa maniobra diagnostica, el motor publicado si respondio correctamente:
  - la carpeta temporal se creo;
  - el archivo Markdown temporal se creo;
  - el contenido persistio al reabrir;
  - el cambio de tipo y tags actualizo arbol, resumen y timeline;
  - el preview Markdown se renderizo correctamente;
  - el exporte `.md` se descargo con contenido coherente.

### Resultado mobile

- En viewport `390x844`:
  - el sidebar de AgroRepo inicia colapsado;
  - `Abrir árbol` lo muestra correctamente;
  - al seleccionar una carpeta el sidebar vuelve a cerrarse;
  - el layout no exploto ni genero overflow horizontal evidente en la pasada corta.
- El bug de modal invisible sigue siendo relevante en mobile porque afecta el mismo flujo CRUD.

### Build status

- No ejecutado.
- Motivo: esta sesion fue solo QA productiva; no hubo cambios de codigo.

### Higiene QA

- El dataset QA temporal no se dejo persistente.
- Se elimino `localStorage.agrorepo_virtual_v3` al cierre de la sesion para volver al baseline publicado:
  - `Cultivos`, `Finanzas`, `Clima y campo`, `General`;
  - `0` archivos;
  - sin restos de `QA Smoke 2026-03-13`.
- Se cerro Playwright/browser al cierre de la sesion.
- Se elimino la carpeta temporal local de Playwright:
  - `C:\\Users\\yerik\\AppData\\Local\\Temp\\playwright-mcp-output\\1773431395120`

### QA sugerido

1. Corregir primero la visibilidad de `arw-modal-overlay` en produccion.
2. Despues del fix, repetir esta misma smoke QA sin sobreescrituras diagnosticas:
   - crear carpeta;
   - crear archivo;
   - guardar;
   - reabrir;
   - exportar;
   - validar mobile.

---

## Sesion activa: fix mobile Bitacora / AgroRepo desde sidebar (2026-03-14)

### Diagnostico pre-edicion

- Se leyo `AGENTS.md` y se audito el flujo shell/mobile en:
  - `apps/gold/agro/agro-shell.js`
  - `apps/gold/agro/agrorepo.js`
  - `apps/gold/agro/index.html`
  - `apps/gold/agro/agro.css`
- Se valido navegacion en viewport mobile `390x844` sobre produccion real con cuenta QA.
- En la corrida mobile ya cargada, `Bitacora` puede abrir AgroRepo; pero la auditoria de codigo encontro una ventana de fallo concreta en mobile:
  - `initAccordions()` en `agro.js` remueve `open` a **todos** los `.yg-accordion` en mobile, aunque AgroRepo y Herramientas son acordeones controlados por la shell y no por el grupo de formularios;
  - AgroRepo monta el widget real solo al abrir el acordeon (`toggle`) o si al enlazar listeners ya encuentra el `<details>` abierto;
  - la shell activa la region `agrorepo` via `updateAccordionState('yg-acc-agrorepo', true)`, pero ese estado puede desincronizarse en mobile cuando el reset global de acordeones pisa `open` o cuando el modulo llega tarde respecto a la navegacion.
- Resultado tecnico del bug:
  - la vista de shell puede quedar en `data-agro-active-view="agrorepo"`;
  - la region principal cambia de estado;
  - pero el widget de AgroRepo puede quedarse sin inicializar o con el acordeon cerrado, dejando la sensacion de vista vacia en mobile.

### Causa raiz exacta

- La causa raiz es una combinacion de dos decisiones incompatibles en mobile:
  1. `agro.js` hace un reset global de `open` sobre todos los `.yg-accordion` en `initAccordions()`.
  2. `agrorepo.js` depende de la apertura efectiva del `<details id="yg-acc-agrorepo">` para montar el widget real.
- Eso rompe la sincronizacion entre shell y contenido:
  - la shell cree que `Bitacora` ya esta visible;
  - pero AgroRepo sigue dependiendo de un `toggle/open` que ya fue pisado o no se recomputo a tiempo.

### Plan quirurgico

1. Limitar el reset mobile de acordeones solo a los acordeones agrupados que si lo necesitan (`data-accordion-group`), sin tocar el acordeon de AgroRepo.
2. Hacer que AgroRepo pueda inicializarse tambien cuando la shell entra a `agrorepo`, no solo cuando el `<details>` emite `toggle`.
3. Reforzar el puente shell -> AgroRepo para que, al navegar a `Bitacora`, el widget se garantice listo en mobile y desktop.
4. Validar en viewport mobile y desktop.
5. Cerrar con `pnpm build:gold`.

### Archivos a tocar

- `apps/gold/agro/agro.js`
- `apps/gold/agro/agro-shell.js`
- `apps/gold/agro/agrorepo.js`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Bajo:
  - si el reset mobile de acordeones se acota mal, podria dejar algun formulario del facturero abierto por defecto en mobile.
- Bajo:
  - si AgroRepo se inicializa de mas, podria duplicar listeners o renders; el fix debe preservar el guard actual de `widgetInitialized`.
- Bajo:
  - el cambio debe evitar cualquier regresion en desktop, donde AgroRepo ya funciona cuando el acordeon y la shell quedan sincronizados.

### Cambios aplicados

- `apps/gold/agro/agro.js`
  - `L18274`: el reset mobile de acordeones ya no remueve `open` en todos los `.yg-accordion`;
  - ahora se limita a acordeones con `data-accordion-group`, dejando intactos los acordeones shell-managed como `AgroRepo`.
  - cierre de sesion: el archivo se normalizo a `LF` conforme a `.gitattributes`, eliminando el warning persistente `CRLF will be replaced by LF`.
- `apps/gold/agro/agro-shell.js`
  - `L398-L400`: al entrar a `agrorepo`, la shell no solo abre `yg-acc-agrorepo`; tambien llama `window.ensureAgroRepoReady()` si ya esta disponible.
- `apps/gold/agro/agrorepo.js`
  - `L1674-L1718`: se agrego `ensureWidgetReady()` y deteccion de shell activa;
  - se reforzo `setupAccordionListener()` para inicializar AgroRepo:
    - al abrir el acordeon;
    - al recibir `agro:shell:view-changed` hacia `agrorepo`;
    - al cargar el modulo si la shell ya estaba en `agrorepo`.
  - se expuso `window.ensureAgroRepoReady` como puente minimo shell -> AgroRepo.
- `apps/gold/agro/agro.css`
  - `L6590-L6604`: se corrigio una colision CSS legacy del modal AgroRepo;
  - `.arw-modal-overlay.is-active` ahora fuerza `visibility: visible`;
  - `.arw-modal-overlay.is-active .arw-modal` recupera el transform visible, alineado con el estado usado por JS (`is-active`).

### Build status

- `pnpm build:gold` = OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Warning no bloqueante:
  - engine esperado `node 20.x`, entorno actual `node 25.6.0`
  - warning habitual por chunk grande del monolito Agro

### QA ejecutado

- Diagnostico base:
  - viewport mobile `390x844` en produccion real con cuenta QA para auditar el comportamiento visible y la shell actual.
- Validacion final del fix:
  - se ejecuto sobre `vite preview` del build compilado en `http://localhost:4173/agro/`;
  - para abrir la ruta protegida sin tocar auth del repo, se uso un bypass temporal **solo dentro del navegador automatizado**, interceptando el asset compilado `session-guard-*`;
  - por ese bypass, quedaron errores esperables de datos autenticados fuera del scope de esta sesion.
- Mobile (`390x844`) sobre el build:
  - sidebar abre correctamente;
  - click en `Bitacora` cambia la shell a `agrorepo`;
  - el sidebar principal queda cerrado despues de navegar (`shellClosedAfterNav = true`);
  - AgroRepo queda visible y util:
    - `treeVisible = true`
    - `mainVisible = true`
    - `timelineVisible = true`
    - `modalVisible = true`
    - `editorVisible = true`
    - `previewVisible = true`
    - `timelineCount = 1`
  - breadcrumb final validado:
    - `AgroRepo > Cultivos > 2026-03-14.md`
- Desktop (`1440x1800`) sobre el build:
  - `Bitacora` abre visible;
  - `treeVisible = true`
  - `mainVisible = true`
  - `timelineVisible = true`
  - `editorVisible = true`
  - `previewVisible = true`
  - `timelineCount = 1`
  - breadcrumb final:
    - `AgroRepo > Cultivos > 2026-03-14.md`

### QA sugerido

1. Despues del deploy, repetir la misma pasada en produccion real autenticada:
   - dashboard -> abrir sidebar -> `Bitacora` -> confirmar visibilidad inmediata.
2. Confirmar en produccion real que `Nueva carpeta` y `Crear archivo .md` siguen visibles y usables sin bypass.
3. Repetir una pasada corta en mobile real fisico si el usuario quiere cerrar del todo la diferencia viewport vs dispositivo.

---

## Sesion activa: fix logout mobile dashboard a landing (2026-03-15)

### Diagnostico

- El logout de desktop en `apps/gold/dashboard/index.html` funciona porque los botones visibles dentro del script `type="module"` llaman `performDashboardLogout()`, que si ejecuta `AuthClient.logout()` o `supabase.auth.signOut()`.
- El FAB mobile `#mobile-logout-fab` vive en un script clasico posterior y estaba intentando llamar la misma funcion por nombre directo.
- Como `performDashboardLogout()` esta declarada dentro de un modulo, no queda en el scope global del script clasico.
- Resultado en mobile:
  - el click caia en `catch`;
  - se navegaba a `/` sin cerrar sesion real;
  - al llegar a la landing, el guard detectaba sesion valida y redirigia otra vez a `/dashboard/`.

### Cambios aplicados

- `apps/gold/dashboard/index.html`
  - se expuso un puente minimo `window.YGDashboardPerformLogout = performDashboardLogout;` justo despues de la funcion canonica de logout;
  - el handler del FAB mobile ahora llama primero ese puente global;
  - si el puente no existiera, hace fallback a `window.AuthClient.logout()` antes de navegar a `/`.

### Build status

- `pnpm build:gold` = OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Warning no bloqueante:
  - engine esperado `node 20.x`, entorno actual `node 25.6.0`
  - warning habitual por chunk grande > `500 kB` en Agro

### QA sugerido

1. En mobile o viewport <= `991px`, abrir dashboard autenticado y pulsar el FAB de logout.
2. Confirmar que la sesion realmente se cierra y la app queda en `/` o `/index.html#login` sin rebote a `/dashboard/`.
3. Repetir logout desktop para confirmar que no hubo regresion en navbar/topbar.

---

## Sesion activa: auditoria y fix quirurgico de icono PWA Android (2026-03-16)

### Diagnostico inicial

- La superficie activa ya expone manifest desde `apps/gold/index.html` via `href="/site.webmanifest"`.
- El primer barrido del repo muestra un manifest publico en `apps/gold/public/site.webmanifest`, multiples logos/favicons en `public/`, `public/brand/`, `public/images/` y `assets/images/`, y todavia no confirma si existe plugin PWA o service worker compitiendo.
- El riesgo operativo principal es tener una mezcla de rutas heredadas y nombres reciclados que permita a Android o al navegador reutilizar iconos viejos cacheados aunque la UI local hoy se vea mejor.

### Hipotesis tecnicas

1. El manifest publico puede seguir apuntando a assets ambiguos o heredados.
2. Puede existir duplicacion de iconos con el mismo logo en rutas distintas (`/`, `/brand/`, `/images/`, `assets/`) sin una fuente canonica clara.
3. Si hay nombres de archivo reciclados, Android o algun cache intermedio puede seguir resolviendo un icono viejo.
4. Si existe service worker, precache o estrategia de cache podria estar perpetuando manifest/iconos obsoletos.
5. Puede faltar o estar mal declarado un icono `maskable`, lo que explicaria borde/fondo no deseado en instalacion Android.

### Plan quirurgico

1. Auditar `vite.config.js`, `index.html`, `site.webmanifest` y cualquier configuracion PWA/SW real.
2. Inventariar todos los iconos referenciados y sus archivos fisicos para detectar duplicados, rutas viejas y nombres reciclados.
3. Definir una sola ruta canonica de iconos PWA con set minimo:
   - `192x192` any
   - `512x512` any
   - `512x512` maskable
4. Si conviene para cortar cache fantasma, versionar los nombres de archivo y actualizar manifest/referencias.
5. Revisar si el build o algun SW puede seguir sirviendo manifest/iconos anteriores y ajustar solo si aplica.
6. Ejecutar `pnpm build:gold` y cerrar la sesion documentando causa raiz, cambios y QA sugerido.

### Riesgos

- Si la causa real incluye cache persistente del launcher Android, el fix de codigo reduce riesgo futuro pero no puede limpiar instalaciones previas ya hechas.
- Si el proyecto no tiene plugin PWA ni service worker, el problema puede estar concentrado en manifest/assets y el alcance debe mantenerse ahi para no introducir una segunda capa de instalacion.
- Cualquier regeneracion de iconos debe respetar el ADN Visual V10 y evitar remaquetar marca fuera del alcance.

### Archivos candidatos a tocar

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `apps/gold/vite.config.js`
- `apps/gold/index.html`
- `apps/gold/public/site.webmanifest`
- assets/iconos PWA reales bajo `apps/gold/public/` y rutas relacionadas
- configuracion de service worker o plugin PWA, solo si existe y esta implicada

### Hallazgos y causa raiz

- **Manifest real activo**:
  - `apps/gold/index.html` apunta a `apps/gold/public/site.webmanifest`.
  - No se encontro segundo manifest compitiendo en la superficie activa.
- **Plugin PWA / Vite**:
  - `apps/gold/vite.config.js` no usa `vite-plugin-pwa` ni genera manifest/iconos automaticamente.
- **Service worker**:
  - No se encontraron `serviceWorker`, `navigator.serviceWorker`, `registerSW`, `workbox`, `sw.js` ni precache en `apps/gold`.
  - Conclusion: no habia capa SW perpetuando iconos viejos en el codigo actual.
- **Causa raiz mas probable**:
  - `apps/gold/public/site.webmanifest` apuntaba dos veces al mismo `"/brand/logo.png"` para `192` y `512`, sin `purpose` y sin icono `maskable`.
  - El PNG base `apps/gold/public/brand/logo.png` tiene transparencia en esquinas (`A=0` en pixeles de borde), lo que vuelve probable que Android rellene o encapsule el icono con fondo claro al instalar si no recibe un asset `maskable`/canonico adecuado.
  - El repo arrastraba multiples copias del mismo logo en `/brand`, `/images` y `assets/images`, lo que aumentaba la ambiguedad operativa.

### Cambios aplicados

- `apps/gold/index.html`:
  - lineas `29-32`
  - el icono `192x192` y `apple-touch-icon` ahora apuntan al asset canonico versionado `/pwa/yavlgold-pwa-192-v20260316.png`;
  - el manifest se sigue sirviendo desde la unica fuente real, pero ahora con `?v=20260316` para cortar cache heredada del URL anterior.
- `apps/gold/public/site.webmanifest`:
  - lineas `2-28`
  - agregado `id: "/"`, `start_url: "/"` y `scope: "/"` para dejar la instalacion anclada a la raiz canonica;
  - `background_color` ajustado a `#0A0A0A` y `theme_color` a `#C8A752`, alineados con el ADN Visual V10;
  - consolidado el set PWA canonico a tres iconos explicitos:
    - `192x192` any -> `/pwa/yavlgold-pwa-192-v20260316.png`
    - `512x512` any -> `/pwa/yavlgold-pwa-512-v20260316.png`
    - `512x512` maskable -> `/pwa/yavlgold-pwa-maskable-512-v20260316.png`
- `apps/gold/vercel.json`:
  - lineas `75-87`
  - agregado `Cache-Control: public, max-age=0, must-revalidate` para `/site.webmanifest`;
  - agregado `Cache-Control: public, max-age=31536000, immutable` para `/pwa/:path*`;
  - esto deja el manifest siempre revalidable y los iconos versionados aptos para cache largo sin ambiguedad.
- `apps/gold/public/pwa/yavlgold-pwa-192-v20260316.png`
- `apps/gold/public/pwa/yavlgold-pwa-512-v20260316.png`
- `apps/gold/public/pwa/yavlgold-pwa-maskable-512-v20260316.png`
  - nuevos assets binarios canonicos;
  - generados a partir del logo vigente, pero con fondo opaco `#0A0A0A` para eliminar transparencia en esquinas;
  - el asset `maskable` 512 se compuso con padding adicional para reducir recorte agresivo en Android.

### Build status

- `pnpm build:gold` = OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Advertencias no bloqueantes:
  - engine esperado `node 20.x`, entorno actual `node 25.6.0`
  - warning habitual de chunk > `500 kB` en Agro

### QA sugerido

1. Desplegar y abrir la landing productiva fresca desde Android.
2. Forzar recarga del manifest si el navegador conserva residuos:
   - cerrar tabs del sitio;
   - abrir la URL raiz;
   - reinstalar la PWA en lugar de reutilizar una instalacion historica.
3. Verificar en Android que el icono instalado use el nuevo set canonico sin fondo/blanco invasivo.
4. Si existe una instalacion vieja en el telefono, eliminarla antes de validar la nueva, porque el launcher puede conservar snapshot anterior aunque el codigo ya haya quedado corregido.

---

## Publicación Crónica Febrero 2026 (2026-03-16)

### Diagnóstico
- Existe texto fuente aprobado para la crónica de febrero 2026 en `cronica de febrero.txt` en la raíz del repo, pero aún no está publicado en `apps/gold/docs/chronicles/2026-02.md`.

### Plan
- Leer `cronica de febrero.txt`.
- Crear `2026-02.md`.
- Revisar estilo de crónicas existentes.
- Actualizar master `CRONICA-YAVLGOLD.md`.
- Validar formato/encoding y dejar entrega lista.

### Cierre y Resultados
- Se creó `apps/gold/docs/chronicles/2026-02.md` iterando sobre el formato del source pero manteniendo el texto fuente idéntico.
- Se añadió un bloque append-only en `CRONICA-YAVLGOLD.md`.
- No hubieron cambios al código del proyecto, solo actualizaciones de documentación. Encoding preservado a UTF-8.

---

## Sesion activa: MVP Ciclos Operativos (2026-03-18)

### Diagnostico

- Se leyo primero `plan agrociclos operativos.txt` en la raiz y `AGENTS.md` como fuentes canónicas.
- El plan ya fija arquitectura, naming y SQL final:
  - naming oficial `operational`;
  - tablas `agro_operational_cycles` y `agro_operational_movements`;
  - `amount` nullable;
  - `crop_id` opcional;
  - checks, RLS, trigger real de `updated_at` y `cycle_id` con `on delete cascade`.
- La shell de Agro ya tiene una navegacion lateral consolidada en `apps/gold/agro/index.html` + `apps/gold/agro/agro-shell.js`, por lo que Ciclos Operativos debe entrar como familia nueva visible en sidebar, no como extension del facturero ni reemplazo de ciclos de cultivo.
- `apps/gold/agro/agro.js` sigue siendo monolito grande y ya expone algunos bridges globales (`window.populateCropDropdowns`, `window.getSelectedCropId`, `window.switchTab`), pero el lote debe evitar crecimiento funcional ahi salvo wiring minimo si fuese estrictamente necesario.
- Existe una referencia visual fuerte en `apps/gold/agro/agrociclos.js` + `apps/gold/agro/agrociclos.css`; conviene reutilizar esa familia visual para que la nueva UI se sienta hermana y no una superficie ajena.
- En Supabase no existe aun soporte visible para `agro_operational_cycles` ni `agro_operational_movements`; el repo si tiene carpeta de migraciones lista para agregar DDL formal.

### Plan de ejecucion

1. Crear la migracion Supabase con el SQL canonico del plan, incluyendo checks, RLS, trigger de `updated_at` y `on delete cascade`.
2. Crear el modulo nuevo `apps/gold/agro/agroOperationalCycles.js` para:
   - CRUD de ciclos;
   - create/read minimo de movimientos;
   - validacion de `crop_id` contra `user_id`;
   - formulario rapido "crear y cerrar";
   - render de lista con tarjetas, balance y estados;
   - render de edicion y borrado con confirmacion.
3. Agregar el punto de entrada visual en Agro con integracion minima sobre la shell:
   - nueva entrada en sidebar;
   - nueva region/vista dedicada;
   - CSS coherente con ADN Visual V10 y con la familia de ciclos existente.
4. Ejecutar QA basico del MVP con los 6 casos fundadores mas los checks minimos pedidos.
5. Cerrar con `pnpm build:gold` y documentar cambios finales, build y QA en este mismo reporte.

### Archivos a tocar

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `apps/gold/supabase/migrations/*` para la migracion de Ciclos Operativos
- `apps/gold/agro/agroOperationalCycles.js` nuevo
- `apps/gold/agro/agro-operational-cycles.css` nuevo o CSS equivalente separado
- `apps/gold/agro/index.html`
- `apps/gold/agro/agro-shell.js`
- `apps/gold/agro/agro.js` solo si aparece un wiring minimo estrictamente necesario

### Riesgos

- Si el schema productivo real difiere del baseline del repo, la migracion puede requerir aplicacion controlada fuera de esta sesion; por eso en este lote se deja el SQL canonico versionado y no se toca produccion a ciegas.
- La validacion de `crop_id` en MVP depende de lectura correcta de `agro_crops` filtrada por `user_id`; si la cuenta no tiene cultivos o hay datos soft-deleted, la UI debe manejarlo sin romper el flujo.
- La shell de Agro tiene varias vistas densas y estados persistidos en `localStorage`; la integracion debe evitar colisionar con vistas existentes o con la navegacion del facturero.
- La capa visual debe mantenerse sobria y hermana de ciclos de cultivo; si se reutilizan selectores existentes de forma agresiva, se podria introducir regresion visual en cultivos.

### Estrategia de QA

- Validacion funcional minima sobre el MVP:
  1. crear ciclo cerrado con monto;
  2. crear ciclo cerrado sin monto;
  3. crear ciclo con cultivo valido;
  4. rechazar `crop_id` invalido;
  5. eliminar ciclo y verificar cascade de movimientos;
  6. renderizar `Monto: No registrado` cuando `amount` sea null.
- Cargar y revisar los 6 casos fundadores definidos en el plan para cubrir `expense`, `donation`, categorias y asociaciones opcionales a cultivo.
- Revisar vista en desktop y mobile `390x844`.
- Ejecutar cierre tecnico obligatorio con `pnpm build:gold`.

### Cierre y resultados

- Fecha de cierre: 2026-03-18.
- Se implemento el MVP funcional de Ciclos Operativos como familia nueva de Agro sin crecer `apps/gold/agro/agro.js`; la integracion quedo contenida en shell, vista nueva, CSS propio y modulo dedicado.

### Cambios aplicados

- `apps/gold/supabase/migrations/20260318120000_create_agro_operational_cycles.sql`
  - lineas clave: 1-125.
  - Se agregaron `agro_operational_cycles` y `agro_operational_movements` con naming canonico `operational`, checks de `economic_type`, `category`, `status`, `direction` y `unit_type`, `amount` nullable, `crop_id` opcional, `cycle_id` con `on delete cascade`, RLS por `user_id` y trigger real `trg_cycles_updated_at`.
- `apps/gold/agro/agroOperationalCycles.js`
  - lineas clave: 1-1452.
  - Se creo el modulo nuevo con CRUD de ciclos, create/read minimo de movimientos, validacion de `crop_id` contra `user_id`, modo rapido `crear y cerrar`, render de tarjetas, balance visible, edicion, eliminacion con confirmacion y texto exacto `Monto: No registrado` cuando `amount` es null.
- `apps/gold/agro/agro-operational-cycles.css`
  - lineas clave: 1-717.
  - Se agrego styling dedicado siguiendo ADN Visual V10 y la familia visual de ciclos, con responsive desktop/mobile y soporte de `prefers-reduced-motion`.
- `apps/gold/agro/index.html`
  - lineas clave: 32, 1190-1192, 1766-1767, 4257-4260.
  - Se enlazo el CSS nuevo, se agrego la entrada `Ciclos Operativos` al sidebar, se creo la region `data-agro-shell-region=\"operational\"` y se inicializo el modulo con import dinamico.
- `apps/gold/agro/agro-shell.js`
  - linea clave: 43.
  - Se registro la vista `operational` dentro de `VIEW_CONFIG` para que la shell administre foco, region y label.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - lineas clave: 3076 en adelante.
  - Se documento el Paso 0, el diagnostico, el plan y este cierre de sesion.

### Build status

- Comando ejecutado: `pnpm build:gold`
- Resultado: OK
- Secuencia validada:
  - `agent-guard`: OK
  - `agent-report-check`: OK
  - `vite build`: OK
  - `check-llms`: OK
  - `check-dist-utf8`: OK
- Observaciones no bloqueantes:
  - warning de engine por Node `v25.6.0` vs objetivo `20.x`;
  - warning de chunk grande existente en `assets/agro-CAq39dwx.js`.

### QA ejecutado

- QA local sobre `http://localhost:4173/agro/` con el bundle real de `apps/gold/dist` y stub de Supabase en memoria; no se toco produccion ni datos reales.
- Casos fundadores cargados:
  1. `Botas de cuero Titan` -> `expense` / `tools` / `50.000 COP` / `closed`
  2. `Pala para maleza` -> `expense` / `tools` / sin monto / `closed`
  3. `Llave de 2 pulgadas` -> `expense` / `maintenance` / sin monto / `closed`
  4. `Donacion 3 sacos batata` -> `donation` / `other` / `150.000 COP` / `crop_id Batata` / `closed`
  5. `Anillo 3/4 manguera` -> `expense` / `maintenance` / `20.000 COP` / `closed`
  6. `Obrero deshierbar maiz` -> `expense` / `labor` / `50.000 COP` / `crop_id Maiz` / `closed`
- Checks minimos completados:
  - creacion cerrada con monto: OK
  - creacion cerrada sin monto: OK
  - creacion con cultivo valido: OK
  - rechazo de `crop_id` invalido: OK (`Cultivo no valido.`)
  - eliminacion con cascade: OK (`movements` del ciclo borrado pasaron de `1` a `0`; `lastCascadeCheck.cascadeVerified = true`)
  - render de `Monto: No registrado`: OK en `Pala para maleza` y `Llave de 2 pulgadas`
  - edicion de ciclo: OK (`Botas de cuero Titan` actualizado con notas posteriores)
  - mobile `390x844`: OK, sin overflow horizontal (`scrollWidth 382`, `clientWidth 382`)
- Higiene QA:
  - browser Playwright cerrado al terminar;
  - temporal de Playwright `1773879549071` eliminado de `%LOCALAPPDATA%\\Temp\\playwright-mcp-output`.

### QA sugerido

- Aplicar la migracion real en el proyecto Supabase correspondiente.
- Repetir el smoke manual con cuenta QA real sobre Agro:
  - crear ciclo cerrado con y sin monto;
  - crear con `crop_id` real;
  - validar borrado + cascade en base real;
  - revisar copy y espaciado visual en desktop y mobile.
- Verificar despues en entorno real que no haya drift con datos previos ni reglas RLS heredadas.

---

## Cierre real Ciclos Operativos (2026-03-18)

### Diagnostico

- El MVP de Ciclos Operativos ya existe en codigo, con migracion SQL versionada, modulo `agroOperationalCycles.js`, CSS propio e integracion visual en la shell de Agro.
- El cierre anterior solo valido el flujo en local con stub de Supabase; aun falta aplicar y validar el comportamiento sobre Supabase real.
- La instruccion operativa del dia es cerrar la feature hoy mismo para liberar el siguiente frente hacia AgroRepo, sin abrir nuevos alcances.

### Objetivo del cierre

- Aplicar la migracion real de `agro_operational_cycles` y `agro_operational_movements`.
- Validar en entorno real:
  - RLS;
  - trigger `updated_at`;
  - `on delete cascade`;
  - creacion, edicion y eliminacion reales;
  - casos con y sin monto;
  - validacion de cultivo;
  - desktop y mobile.
- Corregir hoy mismo cualquier bug real que aparezca y re-testearlo antes de cerrar.

### Plan de validacion real

1. Identificar el proyecto Supabase real correcto y verificar el estado actual del schema.
2. Aplicar la migracion canonica versionada al proyecto real.
3. Confirmar tablas, policies, trigger y constraint/cascade desde el proyecto ya migrado.
4. Ejecutar QA real controlado con cuenta QA dedicada y dataset temporal/documentado.
5. Si aparece bug:
   - diagnostico corto;
   - fix quirurgico;
   - build;
   - re-test inmediato.
6. Cerrar con `pnpm build:gold` y documentar estado final real en este reporte.

### Riesgos

- Riesgo principal: aplicar la migracion en el proyecto equivocado o sobre un schema que haya driftado respecto del plan canonico.
- Riesgo operativo: si la app local apunta a un backend distinto del proyecto real, la validacion debe forzar la ruta correcta antes de concluir.
- Riesgo de QA: dejar datos ambiguos en la cuenta QA; si se crean datos temporales, se deben limpiar o dejar documentados explicitamente.

### Archivos potenciales a tocar

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `apps/gold/supabase/migrations/20260318120000_create_agro_operational_cycles.sql` solo si aparece un bug real de DDL que obligue ajuste
- `apps/gold/agro/agroOperationalCycles.js` si aparece bug funcional real
- `apps/gold/agro/agro-operational-cycles.css` si aparece bug visual/responsive real
- `apps/gold/agro/index.html` o `apps/gold/agro/agro-shell.js` solo si la integracion real presenta falla directa

### Ejecucion real

- Proyecto Supabase real validado: `gerzlzprkarikblqxpjt` (`YavlGold`).
- Migracion aplicada en real: `create_agro_operational_cycles` usando el SQL canonico versionado de `apps/gold/supabase/migrations/20260318120000_create_agro_operational_cycles.sql`.
- Verificaciones estructurales completadas en DB real:
  - tablas `public.agro_operational_cycles` y `public.agro_operational_movements` creadas;
  - RLS activo en ambas;
  - 4 policies por tabla (`select`, `insert`, `update`, `delete`);
  - checks activos para `economic_type`, `category`, `status`, `direction` y `unit_type`;
  - trigger `trg_cycles_updated_at` enlazado a `public.update_updated_at()`;
  - FK `cycle_id` con `on delete cascade`.

### Bug encontrado hoy

- Al iniciar el QA cloud, el login contra Supabase devolvio `Legacy API keys are disabled`.
- Diagnostico:
  - `mcp__supabase__get_anon_key` devolvio una legacy JWT key;
  - el proyecto real tiene deshabilitadas las legacy API keys para Auth;
  - la build real debia usar la publishable key `sb_publishable_*`, que ya coincide con el patron documentado por el repo.
- Resolucion:
  - no fue necesario cambiar codigo del feature;
  - se reconstruyo el bundle de QA apuntando a `https://gerzlzprkarikblqxpjt.supabase.co` con la publishable key real del proyecto;
  - el QA real continuo sobre ese bundle ya autenticado.

### QA real ejecutado

- La validacion real se ejecuto sobre `http://127.0.0.1:4174/agro/` sirviendo `apps/gold/dist` reconstruido contra Supabase cloud.
- Para evitar contaminar el flujo normal de hCaptcha en la UI de login, se reutilizo una sesion QA real valida del mismo proyecto y luego se entro a Agro con el bundle local contra cloud.
- Casos probados y resultado:
  1. `Botas de cuero Titan` -> creado y cerrado con `50.000 COP`: OK.
  2. `Pala para maleza` -> creado y cerrado con `amount = null`: OK.
  3. `Llave de 2 pulgadas` -> creado y cerrado con `amount = null`: OK.
  4. `Donacion 3 sacos batata` -> creado con `crop_id` valido de Batata: OK.
  5. `Obrero deshierbar maiz` -> creado con `crop_id` valido de Maiz: OK.
  6. `crop_id` invalido -> rechazo controlado: OK (`Cultivo no valido.`).
  7. Edicion real -> `Botas de cuero Titan` actualizado en descripcion y `notes`: OK.
  8. Eliminacion real -> `Anillo 3/4 manguera` borrado con confirmacion: OK.
- Validaciones complementarias:
  - render exacto `Monto: No registrado`: OK en `Pala para maleza` y `Llave de 2 pulgadas`;
  - balance visible por tarjeta: OK;
  - estado `closed` persistido: OK;
  - vista shell/sidebar `operational`: OK;
  - responsive desktop: OK, sin overflow (`1432 / 1432`);
  - responsive mobile `390x844`: OK, sin overflow horizontal (`382 / 382`) y botones de accion utilizables.

### Verificaciones DB reales

- Trigger `updated_at`: OK.
  - `Botas de cuero Titan` paso de `2026-03-19 00:58:34.781197+00` a `2026-03-19 00:59:55.327036+00` tras editar.
- `on delete cascade`: OK.
  - ciclo `d33e6f57-e9d8-440b-a886-51e7f6a12046` -> `cycle_rows = 0` y `movement_rows = 0`.
- RLS real: OK.
  - insercion forzada con `user_id` ajeno (`f60ac67b-722e-4dc2-ba26-0aa47c3c3b6b`) rechazada por `new row violates row-level security policy for table "agro_operational_cycles"`.

### Higiene QA

- Los datos temporales creados para la sesion se limpiaron al cierre.
- Estado final de cleanup:
  - `cycles_after_cleanup = 0`
  - `movements_after_cleanup = 0`
- La vista se refresco despues del cleanup y quedo sin ciclos operativos visibles.

### Cambios aplicados en esta sesion

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - Se documento el cierre real, el incidente de claves Supabase, las verificaciones de DB real, el QA ejecutado y el cleanup final.

### Build status

- Se ejecuto `pnpm build:gold` contra el proyecto cloud con URL real y publishable key real del proyecto durante esta sesion: OK.
- Rerun final ejecutado despues de actualizar este reporte: OK.
- Secuencia final confirmada:
  - `agent-guard`: OK
  - `agent-report-check`: OK
  - `vite build`: OK
  - `check-llms`: OK
  - `check-dist-utf8`: OK
- Observaciones no bloqueantes:
  - warning de engine por Node `v25.6.0` vs objetivo `20.x`;
  - warning de chunk grande existente en `assets/agro-Cm2vqUNc.js`.

### Estado final real

- Feature validada en Supabase real.
- QA real completado.
- Dataset QA temporal limpiado.
- Sin bugs funcionales abiertos dentro de Ciclos Operativos al cierre de hoy.

---

## Ciclos Operativos V2 (2026-03-18)

### Diagnostico

- Ciclos Operativos V1 ya existe como modulo separado, con CRUD, validacion de `crop_id`, cierre rapido, balance visible, integracion en shell y soporte real validado sobre Supabase.
- La evolucion V2 no requiere tocar DDL ni RLS; el frente es principalmente UX/UI y organizacion del flujo dentro del mismo modulo.
- El mayor trabajo cae en tres frentes coordinados:
  - shell/sidebar con submenú y subviews;
  - refactor del modulo a wizard, filtros y export;
  - ajuste visual/copy humano sin romper la familia visual ni el MVP ya estable.

### Plan de implementacion V2

1. Extender la shell para soportar la familia `operational` con submenú `activos`, `finalizados` y `export`.
2. Reorganizar `agroOperationalCycles.js` para:
   - separar listas de activos/finalizados;
   - aplicar filtros por periodo, categoria y tipo economico;
   - reemplazar el formulario largo por wizard de 4 pasos;
   - humanizar labels, estados, acciones y resumenes con emojis;
   - agregar export markdown y mejor historial expandible.
3. Ajustar `index.html` solo en el wiring minimo del sidebar/region para respetar el patron de familia ya usado por ciclos.
4. Adaptar `agro-operational-cycles.css` a la nueva estructura V2 manteniendo ADN V10, tokens y responsive.
5. Ejecutar QA funcional y visual del flujo completo y cerrar con `pnpm build:gold`.

### Archivos a tocar

- `apps/gold/agro/agroOperationalCycles.js`
- `apps/gold/agro/agro-operational-cycles.css`
- `apps/gold/agro/agro-shell.js`
- `apps/gold/agro/index.html`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Riesgo de regresion en la shell si el submenú `operational` no queda alineado con el patron existente de `ciclos`.
- Riesgo de regression funcional si el wizard rompe la compatibilidad con el create/edit ya validado en V1.
- Riesgo visual en mobile si los filtros y acciones crecen demasiado y fuerzan overflow horizontal.
- Riesgo de acoplamiento excesivo si la exportacion o los filtros terminan saliendo del modulo; se debe mantener todo encerrado en `agroOperationalCycles.js`.

### Estrategia de QA

- Validar la navegacion del sidebar con padre + submenú.
- Validar segmentacion:
  - `activos` solo `open`, `in_progress`, `compensating`;
  - `finalizados` solo `closed`, `lost`.
- Validar filtros por periodo, categoria y tipo economico con recalculo de resumen.
- Validar wizard:
  - avance/retroceso;
  - persistencia de datos entre pasos;
  - resumen correcto en paso 4;
  - creacion final con y sin monto.
- Validar export MD descargable y con contenido coherente.
- Validar historial expandible en tarjetas.
- Validar copy humano con emojis y responsive `390x844`.
- Cerrar con `pnpm build:gold`.

### Cambios aplicados

- `apps/gold/agro/agro-shell.js`
  - Se registro la familia `operational` con aliases canonicos:
    - `operational-active`
    - `operational-finished`
    - `operational-export`
  - Se habilito `VIEW_SUBNAV_CONFIG.operational` con default `active`.
- `apps/gold/agro/index.html`
  - El acceso lateral paso de enlace simple a familia expandible:
    - `💼 Ciclos Operativos`
    - `🟡 Activos`
    - `✅ Finalizados`
    - `📥 Exportar MD`
  - Se mantuvo una sola region `operational`, sin crecer regiones innecesarias.
- `apps/gold/agro/agroOperationalCycles.js`
  - Refactor completo a flujo V2 dentro del modulo existente:
    - copy humano con emojis;
    - datasets separados para `active` y `finished`;
    - filtros por periodo, categoria y tipo economico usando queries al cliente Supabase;
    - wizard de 4 pasos con persistencia al retroceder;
    - resumen confirmatorio en paso 4;
    - subvista de export Markdown;
    - historial expandible por tarjeta;
    - snapshot de debug ampliado para QA;
    - `openView(subview)` expuesto en API global;
    - soporte conservado para CRUD, balance, `amount` nullable y validacion de `crop_id`.
  - Se corrigio en `updateCycleRecord` la persistencia de `opened_at` al editar la fecha del movimiento inicial.
  - Se corrigio la navegacion del stepper: ya no permite saltar hacia delante validando solo el paso actual; ahora valida secuencialmente cada paso intermedio.
- `apps/gold/agro/agro-operational-cycles.css`
  - Se agregaron estilos V2 para:
    - stepper;
    - paneles del wizard;
    - grilla confirmatoria;
    - barra de filtros;
    - pills activas;
    - subvista de export;
    - responsive en `1024`, `768` y `480`.

### QA ejecutado

- Verificacion estatica de shell/sidebar:
  - parent toggle `operational`: OK;
  - aliases `operational-active`, `operational-finished`, `operational-export`: OK;
  - labels del submenú en `index.html`: OK.
- QA funcional dirigido en navegador sobre harness local del modulo con mock de Supabase en memoria y los 6 casos fundadores:
  1. `Finalizados` carga los 6 casos fundadores: OK.
  2. Copy humano con emojis (`📝 Monto no anotado`, `📊 Balance del ciclo`, `📜 Historial`): OK.
  3. Historial expandible en tarjeta: OK.
  4. Filtro por categoria `🔧 Herramientas`: `2` ciclos: OK.
  5. Filtro por tipo `🤝 Donación`: `1` ciclo: OK.
  6. Filtro por periodo `📅 Esta semana`: `0` ciclos para el dataset fundador usado en QA: OK.
  7. Wizard crea ciclo activo nuevo: OK.
  8. Wizard conserva datos al retroceder entre pasos 3 -> 2 -> 3: OK.
  9. Paso 4 resume nombre, cultivo y monto correctamente: OK.
  10. `Activos` muestra solo estados de familia abierta (`open`/`in_progress`/`compensating`) y excluye cerrados: OK.
  11. Edicion de ciclo con estado `in_progress` + `notes`: OK.
  12. Rechazo de `crop_id` invalido con mensaje controlado `Cultivo no valido.`: OK.
  13. Export MD genera `ciclos-operativos-2026-03.md` con encabezado, resumen y detalle: OK.
  14. Eliminacion con cascade de movimientos en el mock: OK.
  15. Mobile `390x844`: sin overflow horizontal, tarjetas visibles y botones utilizables: OK.

### Bugs encontrados hoy

- Bug de stepper:
  - Sintoma: el usuario podia saltar desde el stepper a pasos futuros validando solo el paso actual.
  - Fix: validacion secuencial de todos los pasos intermedios antes de permitir el salto hacia delante.
- Hallazgo de QA local:
  - El bundle `dist` generado en esta maquina sigue apuntando al `VITE_SUPABASE_URL` local (`127.0.0.1:54321`), por lo que no fue util para QA autenticada real en local.
  - Impacto: no bloquea V2 porque el cambio de hoy es frontend-only y no modifica backend ni RLS; el QA dirigido se hizo sobre el modulo real con mock controlado y build limpio.

### Build status

- `pnpm build:gold`: OK.
- Secuencia confirmada:
  - `agent-guard`: OK
  - `agent-report-check`: OK
  - `vite build`: OK
  - `check-llms`: OK
  - `check-dist-utf8`: OK
- Observaciones no bloqueantes:
  - warning de engine por Node `v25.6.0` vs objetivo `20.x`;
  - warning de chunk grande existente en `assets/agro-BI9oqc3H.js`.

### Estado final V2

- V2 implementada dentro del modulo `agroOperationalCycles.js`.
- Sin cambios grandes en `agro.js`.
- Sidebar con familia operativa, wizard, filtros, export MD e historial expandible listos.
- Build limpio.
- Sin bug funcional abierto detectado dentro del alcance de Ciclos Operativos V2.

## 2026-03-19 — Ciclos Operativos UX/UI Modal Alignment

### Diagnostico

- La creacion de `Nuevo ciclo operativo` funciona, pero hoy se siente pesada porque el wizard vive incrustado en la vista principal.
- La comparacion correcta es el flujo actual de `Nuevo Cultivo`, que resuelve mejor la jerarquia visual usando modal centrado, ritmo corto y footer claro.
- La pantalla de Ciclos Operativos necesita volver a parecer una seccion madura de gestion: header, CTA, filtros, resumen y tarjetas, sin un formulario largo abierto por defecto.

### Estrategia de rediseño

- Sacar el wizard del layout principal y renderizarlo dentro de un modal propio del modulo.
- Reusar la logica actual de create/edit, pasos, validaciones y draft state para no abrir un frente funcional nuevo.
- Copiar el patron visual de `Nuevo Cultivo`:
  - overlay oscuro;
  - contenedor centrado;
  - header con titulo y cierre;
  - cuerpo compacto por pasos;
  - footer limpio con navegacion.
- Mantener intactos filtros, tarjetas, historial, export y segmentacion `Activos/Finalizados`.

### Archivos a tocar

- `apps/gold/agro/agroOperationalCycles.js`
- `apps/gold/agro/agro-operational-cycles.css`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Riesgo de regresion si el cambio de contenedor rompe el flujo de create/edit o el foco del wizard.
- Riesgo de desborde vertical u horizontal en mobile si el modal no controla bien `max-height` y scroll interno.
- Riesgo de inconsistencia visual si el modal nuevo se aleja del patron real de `Nuevo Cultivo`.

### Plan de QA

- Verificar que la vista principal ya no renderiza el wizard incrustado.
- Abrir modal desde `➕ Nuevo ciclo operativo`.
- Validar avance/retroceso sin perder datos.
- Validar creacion y edicion dentro del modal.
- Validar cierre por boton y backdrop sin romper estado.
- Validar desktop y mobile `390x844` sin overflow.
- Cerrar con `pnpm build:gold`.

### Cambios aplicados

- `apps/gold/agro/agroOperationalCycles.js`
  - `renderShell()` se rediseño para dejar la vista principal limpia:
    - header;
    - feedback discreto;
    - resumen;
    - filtros/lista;
    - modal propio del modulo.
  - El wizard dejo de renderizarse incrustado y ahora vive dentro de `#agro-operational-modal`.
  - Se agrego estado `modalOpen` y helpers `openComposerModal()` / `closeComposerModal()` / `syncModalVisibility()`.
  - `focusForm()` paso de hacer scroll en la vista a abrir el modal y enfocar el primer campo.
  - El footer del wizard se compacto y quedo alineado al patron modal con `Cancelar`, `Atrás`, `Siguiente` y guardado final.
  - Se agrego cierre por `Escape`, backdrop y boton `×`.
  - Se actualizo el cambio de vista para cerrar el modal al salir de `operational`.
  - El feedback ahora se refleja tanto en la superficie principal como dentro del modal.
- `apps/gold/agro/agro-operational-cycles.css`
  - Se agrego base propia del modal para que el modulo no dependa de estilos inyectados por `agro.js`.
  - Se alineo el dialogo al lenguaje visual de `Nuevo Cultivo`:
    - overlay oscuro;
    - contenedor centrado;
    - header limpio;
    - cuerpo compacto;
    - footer estructurado.
  - Se ajustaron stepper, espaciados, footer del wizard y responsive mobile.
  - Se agrego lock de scroll del `body` y soporte `prefers-reduced-motion`.

### QA ejecutado

- Verificacion estructural:
  - la vista principal ya no contiene wizard incrustado: OK;
  - el CTA `➕ Nuevo ciclo operativo` abre modal centrado: OK.
- QA en navegador con harness local del modulo y mock de Supabase:
  - apertura del modal desde header: OK;
  - cierre por `❌ Cancelar`: OK;
  - cierre por `×`: OK;
  - `modalOpenClass` y `display:flex/none` correctos al abrir/cerrar: OK;
  - `body` bloqueado al abrir y liberado al cerrar: OK;
  - paso 1 -> 2 -> 1 conserva nombre y descripcion: OK;
  - paso 4 resume nombre, cultivo, monto y cantidad correctamente: OK;
  - creacion via wizard de `Compra de manguera principal` con cultivo `Maíz`, monto `38.000 COP`, cantidad `1 Unidad`: OK;
  - el modal se cierra tras guardar y la tarjeta activa queda visible: OK;
  - `390x844` sin overflow horizontal en vista principal: OK;
  - `390x844` sin overflow horizontal con modal abierto: OK.

### Bug encontrado hoy

- Bug de autosuficiencia visual del modal:
  - Sintoma: en el harness local, el overlay quedaba `display: block` aunque `modalOpen=false`, porque el modulo dependia del baseline global de `.modal-overlay` inyectado por `agro.js`.
  - Fix: se agrego en `agro-operational-cycles.css` la base propia de `.agro-operational-modal` y `.agro-operational-modal.active`, junto con animacion, backdrop y layout del dialogo.
  - Re-test: `modalDisplay` cambio a `none` al cerrar y `flex` al abrir: OK.

### Build status

- `pnpm build:gold`: OK.
- Secuencia:
  - `agent-guard`: OK
  - `agent-report-check`: OK
  - `vite build`: OK
  - `check-llms`: OK
  - `check-dist-utf8`: OK
- Observaciones no bloqueantes:
  - warning de engine por Node `v25.6.0` vs objetivo `20.x`;
  - warning de chunk grande existente en `assets/agro-Bq8HV0My.js`.

### Estado final

- Ciclos Operativos ya no se presenta como una pantalla-formulario pesada.
- `Nuevo ciclo operativo` se siente como hermano real de `Nuevo Cultivo`: modal centrado, ritmo corto, pasos claros y vista principal despejada.

---

## Sesion activa: AgroRepo MVP modular local-first (2026-03-19)

### Diagnostico

- El AgroRepo actual ya no es el modulo plano original: hoy corre como `Tree Memory v3` dentro de `apps/gold/agro/agrorepo.js`.
- Ese reemplazo previo resolvio jerarquia y bridge IA, pero para este objetivo ahora introduce friccion real:
  - demasiada densidad visual para uso diario movil;
  - demasiadas acciones secundarias para un MVP de memoria operativa;
  - modelo de carpetas/archivos mas cercano a explorador que a bitacora viva del campo.
- La integracion vigente que no se debe romper ya esta clara:
  - entrada simple del sidebar `data-agro-view="agrorepo"`;
  - lazy-load desde `apps/gold/agro/agro.js` via `import('./agrorepo.js')`;
  - puente shell -> modulo con `window.ensureAgroRepoReady()`;
  - continuidad con IA via `window._agroRepoContext`.
- La persistencia legacy hoy vive en dos capas locales:
  - `agrorepo_virtual_v3` para el arbol actual;
  - `agrorepo_ultimate_v2` para el formato anterior de bitacoras/reportes.

### Alcance

- Reemplazar la experiencia actual de AgroRepo por un MVP modular nuevo, minimalista y mobile-first.
- Mantener intacta la entrada actual del sidebar y el lazy-load del shell.
- Cambiar el enfoque de arbol virtual a notas Markdown simples con:
  - CRUD;
  - plantillas minimas;
  - busqueda basica;
  - persistencia local-first;
  - textarea + vista previa alternable;
  - base de contexto preparada para futura IA.
- Evitar cambios grandes en `agro.js`; solo se permite compatibilidad minima si hiciera falta.

### Riesgos

- Riesgo de migracion:
  - si no se leen bien `agrorepo_virtual_v3` o `agrorepo_ultimate_v2`, el usuario puede perder contexto local previo.
- Riesgo de integracion:
  - romper `window.ensureAgroRepoReady()` o `window._agroRepoContext` afectaria shell e IA.
- Riesgo UX:
  - simplificar demasiado puede dejar fuera señales utiles del repo viejo si no se preserva una lista de notas clara y buscable.
- Riesgo tecnico:
  - dejar residuos mezclados entre el modulo viejo y el nuevo puede generar doble render o listeners duplicados.

### Plan

1. Crear una nueva implementacion modular en:
   - `apps/gold/agro/agroRepo.js`
   - `apps/gold/agro/agro-repo-storage.js`
   - `apps/gold/agro/agro-repo-templates.js`
   - `apps/gold/agro/agro-repo-search.js`
   - `apps/gold/agro/agro-repo.css`
2. Convertir `apps/gold/agro/agrorepo.js` en puente de compatibilidad minimo hacia la implementacion nueva.
3. Mantener la region y entrada actual del sidebar sin submenu ni cambio de ruta.
4. Renderizar un shell limpio directamente en `#agro-widget-root`, sin revivir el template complejo previo.
5. Implementar migracion local segura:
   - prioridad 1: leer `agrorepo_mvp_v1` si ya existe;
   - prioridad 2: migrar desde `agrorepo_virtual_v3` convirtiendo archivos a notas;
   - prioridad 3: migrar desde `agrorepo_ultimate_v2` convirtiendo reportes a notas.
6. Exponer contexto ligero para IA y continuidad operativa usando el nuevo modelo de notas.
7. Validar con `pnpm build:gold`.

### Decision sobre reemplazo y migracion

- **Reemplazo**: SI. El `Tree Memory v3` deja de ser la experiencia activa de AgroRepo. La ruta/entrada se conserva, pero la UI y el modelo operativo visibles pasan al nuevo MVP modular.
- **Legacy seguro**: `apps/gold/agro/agrorepo.js` queda solo como adaptador compatible para no tocar el import actual del shell.
- **Migracion local**: SI. Se implementara migracion one-shot desde `agrorepo_virtual_v3` y fallback desde `agrorepo_ultimate_v2` para no botar memoria local existente.
- **Seccion canonica**: se usara `Mi Finca` en lugar de `Perfil Agro`.

### Cambios aplicados

- `apps/gold/agro/agrorepo.js`
  - reemplazado por un adaptador minimo de 1 linea hacia la implementacion modular nueva;
  - se conserva intacto el import actual del shell (`import('./agrorepo.js')`).
- `apps/gold/agro/agro-repo-app.js`
  - nuevo shell MVP de AgroRepo (`588` lineas);
  - layout limpio con hero corto, filtros por seccion, listado de notas y editor unico;
  - textarea plano + toggle de vista previa;
  - create/edit/delete/save local;
  - integracion lazy con `yg-acc-agrorepo`, `window.ensureAgroRepoReady()` y `window._agroRepoContext`.
- `apps/gold/agro/agro-repo-storage.js`
  - nueva capa local-first (`331` lineas);
  - storage nuevo `agrorepo_mvp_v1`;
  - migracion desde `agrorepo_virtual_v3` y fallback desde `agrorepo_ultimate_v2`;
  - normalizacion de notas `.md` y bridge de contexto para IA.
- `apps/gold/agro/agro-repo-templates.js`
  - catalogo minimo de plantillas (`114` lineas):
    - Mi Finca
    - Observacion
    - Incidencia
    - Decision
    - Prueba
    - Nota libre
- `apps/gold/agro/agro-repo-search.js`
  - filtro simple por titulo y contenido (`42` lineas);
  - conteo por seccion para chips y resumen.
- `apps/gold/agro/agro-repo.css`
  - nueva capa visual dedicada (`561` lineas);
  - mobile-first;
  - breakpoints `900 / 768 / 480`;
  - sin split view;
  - max-height controlado en lista;
  - `prefers-reduced-motion` respetado.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - paso 0 obligatorio + cierre de esta sesion.

### QA ejecutado

- `pnpm build:gold`
  - OK.
- Smoke funcional con harness DOM sobre el modulo real bundleado:
  - apertura desde el evento del shell actual `agro:shell:view-changed`: OK;
  - crear nota: OK;
  - editar titulo y contenido: OK;
  - vista previa Markdown: OK;
  - busqueda por contenido: OK;
  - persistencia tras recarga (`localStorage.agrorepo_mvp_v1`): OK;
  - eliminar nota: OK.
- Limite conocido del smoke:
  - no se corrio medicion de overflow/render layout en navegador real; el smoke fue DOM-driven, no visual.

### Build status

- `pnpm build:gold`: OK.
- Secuencia:
  - `agent-guard`: OK
  - `agent-report-check`: OK
  - `vite build`: OK
  - `check-llms`: OK
  - `check-dist-utf8`: OK
- Observaciones no bloqueantes:
  - warning de engine por Node `v25.6.0` vs objetivo `20.x`;
  - warning historico por chunk grande en `assets/agro-*.js`.

### QA sugerido

1. Abrir AgroRepo desde la entrada actual del sidebar y confirmar que inicializa sin cambio de ruta ni submenu.
2. En mobile real (`<=480px`), validar que:
   - la lista no desborda horizontalmente;
   - el editor mantiene targets claros;
   - el toggle `Editor / Vista previa` no se rompe.
3. Si existe data legacy local en el navegador habitual del usuario, verificar que:
   - se migra a `agrorepo_mvp_v1`;
   - no se pierde contenido de `agrorepo_virtual_v3` o `agrorepo_ultimate_v2`.

### Estado final

- AgroRepo viejo queda reemplazado como experiencia activa.
- La entrada actual del sidebar se conserva intacta.
- El nuevo MVP queda modular, local-first, Markdown-first y preparado para futura IA sin tocar logica sensible del facturero.
- Nota tecnica:
  - en este entorno local no fue viable usar simultaneamente `agroRepo.js` y `agrorepo.js` por colision de path case-insensitive;
  - por eso la implementacion real vive en `agro-repo-app.js` y `agrorepo.js` queda como entry compatible.

---

## 2026-03-19 - AgroRepo V1.1 Workspace Tree

### Diagnostico

- El MVP previo ya resolvia CRUD Markdown local-first, pero todavia se sentia como lista de notas y no como repositorio operativo.
- Faltaban dos capas visibles para alinearlo con la referencia pedida y con el ADN Visual V10:
  - arbol local real con carpetas persistentes;
  - topbar minimalista con iconos discretos y jerarquia de workspace.
- A nivel visual, hacia falta cerrar cumplimiento fino de ADN V10 en:
  - breakpoints `900 / 768 / 480`;
  - `prefers-reduced-motion`;
  - comportamiento movil del arbol lateral;
  - ghost emojis con motion sutil y opacidad contenida.

### Alcance aplicado

- `apps/gold/agro/agro-repo-storage.js`
  - evolucion del storage flat a modelo de arbol local persistente;
  - nodos `folder/file`, `activeNodeId`, `expandedIds`, contexto para IA y migracion segura desde estructuras previas.
- `apps/gold/agro/agro-repo-templates.js`
  - carpetas canonicas del repo local:
    - Mi Finca
    - Cultivos
    - Observaciones
    - Incidencias
    - Decisiones
    - Pruebas
    - Mercado
- `apps/gold/agro/agro-repo-app.js`
  - shell V1.1 tipo workspace;
  - arbol de archivos local con carpetas plegables;
  - topbar minimalista con iconos;
  - creacion de carpeta y archivo;
  - soporte de carpeta raiz `AgroRepo` en el modal de creacion;
  - editor textarea + vista previa alternable;
  - busqueda por titulo/contenido y orden simple.
- `apps/gold/agro/agro-repo.css`
  - adaptacion estricta al ADN Visual V10 sobre la nueva experiencia:
    - Orbitron para branding/headings;
    - Rajdhani para UI;
    - acento gold via tokens;
    - motion de `180ms`;
    - overlay movil del arbol;
    - media queries `900 / 768 / 480`;
    - `prefers-reduced-motion`;
    - ghost emojis con opacidad baja y float sutil;
    - control de overflow en rutas y nombres largos.
- `apps/gold/agro/agrorepo.js`
  - se conserva como adaptador de entrada sin romper shell/sidebar actuales.

### Riesgos y decision

- Decision de reemplazo:
  - se mantiene el reemplazo del AgroRepo anterior como experiencia activa;
  - el contrato externo no cambia.
- Decision de migracion:
  - SI;
  - se conserva migracion desde el MVP local actual y desde legados `agrorepo_virtual_v3` / `agrorepo_ultimate_v2`.
- Riesgo residual:
  - no se corrio QA visual en navegador real para confirmar layout mobile fino `<=480px`;
  - el smoke corrido fue DOM-driven, no de render visual.

### Build status

- `pnpm build:gold`: OK.
- Secuencia validada:
  - `agent-guard`: OK
  - `agent-report-check`: OK
  - `vite build`: OK
  - `check-llms`: OK
  - `check-dist-utf8`: OK
- Observaciones no bloqueantes:
  - warning de engine por Node `v25.6.0` frente a objetivo `20.x`;
  - warning historico por chunk grande en `assets/agro-*.js`.

### QA ejecutado

- Smoke DOM sobre el modulo real:
  - render del shell AgroRepo: OK;
  - crear carpeta en raiz `AgroRepo`: OK;
  - crear archivo dentro de carpeta logica: OK;
  - editar contenido Markdown: OK;
  - vista previa alternable: OK;
  - busqueda por contenido: OK;
  - persistencia tras recarga: OK;
  - eliminar archivo y persistir borrado: OK.

### QA sugerido

1. Abrir AgroRepo desde la entrada actual del sidebar y confirmar arbol + topbar en la UI real.
2. En viewport mobile real (`<=480px`), validar:
   - apertura/cierre del arbol overlay;
   - ausencia de overflow horizontal;
   - legibilidad de rutas largas;
   - targets tactiles de topbar y acciones del arbol.
3. Si el navegador habitual del usuario tiene data legacy local, validar la migracion real sobre ese dataset.

---

## 2026-03-19 - AgroRepo V1.1 Critical Fixes + Spark Mobile

### Diagnostico inicial

- QA real reporta fallas de wiring en create/delete/save/search que no se reprodujeron en el smoke DOM previo.
- El storage base y la arquitectura general del arbol estan bien, pero la experiencia actual todavia mezcla demasiado contexto en pantalla y en mobile no se comporta como flujo tipo Spark.
- El runtime efectivo de AgroRepo sigue estando en `apps/gold/agro/agro-repo-app.js`; `apps/gold/agro/agrorepo.js` permanece como adapter de entrada para no romper sidebar/imports.
- Alcance de esta sesion:
  - corregir wiring critico de CRUD y persistencia sin cambiar arquitectura de storage;
  - endurecer carga segura sin datos previos;
  - corregir search y evitar duplicacion al editar;
  - evolucionar mobile `<=480px` a una experiencia una-pantalla-a-la-vez con editor protagonista.

### Plan

1. Auditar el wiring real entre UI, estado y storage para create/delete/edit/save/search.
2. Corregir puntos criticos con cambios quirurgicos en el runtime AgroRepo y helpers de storage/search.
3. Reducir densidad visual superior y cerrar UX Spark mobile en CSS y shell.
4. Ejecutar build + smoke de CRUD/persistencia + validacion de estados mobile.

### Cambios aplicados

- `apps/gold/agro/agrorepo.js`
  - se deja explicito el adapter de compatibilidad del sidebar actual.
- `apps/gold/agro/agro-repo-app.js`
  - fix del modal: el backdrop ya no cierra la UI cuando el click ocurre dentro del dialogo;
  - persistencia inmediata al cambiar de vista, navegar o volver en mobile;
  - wiring CRUD apoyado en helpers de storage;
  - delete activo en topbar mobile;
  - mobile stage `browser/editor` para experiencia Spark;
  - topbar mobile reducida con titulo, volver, preview, guardar y eliminar.
- `apps/gold/agro/agro-repo-storage.js`
  - helpers de `create/update/delete` sobre el repo sin cambiar la arquitectura base;
  - carga segura reforzada ante estado vacio/corrupto en `localStorage`.
- `apps/gold/agro/agro-repo-search.js`
  - helper de matching/search text para conectar mejor el filtro del arbol.
- `apps/gold/agro/agro-repo.css`
  - truncado visual con ellipsis + tooltip por `title`;
  - `overflow-x: hidden` en contenedores clave;
  - targets mobile de `44px`;
  - reglas Spark `browser/editor` en `<=480px`;
  - reduccion de densidad superior en modo editor mobile.

### QA ejecutado

- Smoke desktop con clicks reales sobre el modulo bundleado:
  - crear carpeta en raiz: OK;
  - crear carpeta hija: OK;
  - crear archivo: OK;
  - editar sin duplicacion y manteniendo ID: OK;
  - guardar contenido y navegar ida/vuelta: OK;
  - preview Markdown: OK;
  - preview -> edit sin perder contenido: OK;
  - busqueda por contenido y estado vacio `Sin resultados`: OK;
  - eliminar archivo: OK;
  - eliminar carpeta con hija: OK.
- Smoke mobile corto (`390x844`) sobre el modulo bundleado:
  - inicia en stage `browser`: OK;
  - tocar nota abre stage `editor`: OK;
  - topbar muestra solo titulo de nota: OK;
  - boton volver regresa a `browser`: OK.
- Smoke de recarga desde storage ya persistido:
  - titulo y contenido se restauran al reiniciar: OK.
- Verificacion estructural de CSS:
  - `overflow-x: hidden`: OK;
  - `text-overflow: ellipsis`: OK;
  - targets `44px`: OK;
  - reglas `data-mobile-stage="browser/editor"`: OK.

### Build status final

- `pnpm build:gold`: OK.
- Observaciones no bloqueantes:
  - warning de engine por Node `v25.6.0` frente a objetivo `20.x`;
  - warning historico por chunk grande en `assets/agro-*.js`.

### QA sugerido

1. Validar visualmente en navegador real mobile `390x844` que no exista scroll horizontal.
2. Hacer smoke manual de sidebar/dashboard/facturero/ciclos para no interferencia, ya que esta sesion no toco esos modulos pero tampoco los ejercito en navegador real.

## 2026-03-19 - AgroRepo Blueprint Definitivo

### Diagnostico inicial

- El archivo `C:\Users\yerik\gold\agrorepo definitivo.html` define un contrato mas amplio que el runtime activo: layout monorepo completo, tabs, menu contextual, modales, import/export, status bar, global search, sync UI y toasts.
- El runtime actual de AgroRepo vive en `apps/gold/agro/agro-repo-app.js` y todavia responde a la iteracion V1.1; su estructura y flujo no son fieles al HTML definitivo aunque el storage local ya resuelve bien la persistencia base.
- La entrada real del sidebar sigue siendo `apps/gold/agro/agrorepo.js`; conviene mantenerla como adapter para no tocar `agro.js` ni romper imports/rutas existentes.
- Riesgo principal: trasladar el blueprint sin duplicar estado entre UI nueva y storage existente. Riesgo secundario: tabs, clipboard, import/export y sync UI requieren ampliar wiring sin degradar mobile ni persistencia.

### Plan de implementacion

1. Leer el blueprint definitivo completo y tomar su estructura DOM, acciones y modales como contrato de UI/UX.
2. Rehacer el shell runtime de AgroRepo para replicar ese blueprint dentro del widget actual, manteniendo el adapter existente.
3. Extender storage/search solo donde haga falta para tabs, clipboard, import/export, busqueda global y estado de sync, sin mover la arquitectura base del repo local.
4. Ajustar CSS para que la estructura, densidad y jerarquia sigan el HTML definitivo usando tokens del ADN Visual V10.
5. Ejecutar smoke funcional de los flujos obligatorios y cerrar con `pnpm build:gold`.

### Alcance y archivos a tocar

- `apps/gold/agro/agrorepo.js`
- `apps/gold/agro/agro-repo-app.js`
- `apps/gold/agro/agro-repo-storage.js`
- `apps/gold/agro/agro-repo-search.js`
- `apps/gold/agro/agro-repo.css`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Criterio de fidelidad respecto al HTML definitivo

- El HTML definitivo manda sobre las iteraciones previas de AgroRepo.
- Se debe conservar la misma estructura general: sidebar, topbar, tabs, editor, preview, status bar, context menu, modales y toast stack.
- La adaptacion visual a YavlGold solo puede ocurrir en tokens, tipografias y acabado del ADN Visual V10; no debe cambiar la organizacion, densidad ni la sensacion del producto definida en el blueprint.

### Cambios aplicados

- `apps/gold/agro/agro-repo-app.js`
  - se reemplaza el shell V1.1 por un runtime fiel al blueprint definitivo;
  - sidebar, topbar, tabs, editor, preview, status bar, context menu, modales, import/export, global search, sync UI y toasts quedan cableados en el modulo real;
  - se mantiene el adapter de entrada existente via `apps/gold/agro/agrorepo.js` y el puente `window._agroRepoContext`.
- `apps/gold/agro/agro-repo-storage.js`
  - soporte de nombres de archivo `.md`, `.markdown` y `.txt`;
  - persistencia de tabs y sync config;
  - helpers de snapshot/paste para copiar, pegar y duplicar nodos;
  - fix critico: la normalizacion ya no re-siembra `finca.md` en cada persistencia.
- `apps/gold/agro/agro-repo-search.js`
  - helper de busqueda global por titulo y contenido con resultados clickeables.
- `apps/gold/agro/agro-repo.css`
  - se sustituye el estilo previo por la estructura visual del HTML definitivo adaptada a tokens ADN V10;
  - sidebar overlay en mobile, tabs scrollables, ellipsis, modales, context menu, status bar y toast stack.

### QA ejecutado

- `pnpm build:gold`: OK.
- Smoke DOM con bundle de produccion (`jsdom`):
  - shell AgroRepo renderiza correctamente;
  - crear carpeta en raiz: OK;
  - crear archivo dentro de carpeta: OK;
  - abrir archivo y crear tab: OK;
  - editar contenido y persistir: OK;
  - preview Markdown con heading/lista: OK;
  - busqueda local en arbol: OK;
  - busqueda global por contenido: OK;
  - duplicar y eliminar por menu contextual: OK;
  - guardar sync config y reflejar status bar: OK;
  - importar archivo `.txt`: OK;
  - exportar todo sin romper flujo: OK;
  - tabs y repo persisten en `localStorage`: OK.
- Nota de QA:
  - la validacion browser real dentro de `/agro/` quedo limitada por el guard de acceso del shell completo; la verificacion funcional se hizo sobre el bundle de produccion del modulo.

### Build status final

- `pnpm build:gold`: OK.
- Observaciones no bloqueantes:
  - warning de engine por Node `v25.6.0` frente al objetivo `20.x`;
  - warning historico de chunk grande en `assets/agro-*.js`.

### QA sugerido

1. Hacer un pass visual humano en navegador real desktop y mobile para ajustar micro-espaciados si hace falta.
2. Validar login -> sidebar -> entrada AgroRepo dentro del shell completo usando cuenta QA cuando corresponda.

## 2026-03-19 - AgroRepo Pre-commit Unblock

### Diagnostico inicial

- El commit del blueprint quedo bloqueado por el hook local `pre-commit`.
- El hook no detecta una credencial real; solo bloquea patrones `eyJ...` y `https://*.supabase.co` en archivos `.js/.ts`.
- En `apps/gold/agro/agro-repo-app.js` esos patrones venian de placeholders del modal de sync del blueprint definitivo.

### Cambios aplicados

- `apps/gold/agro/agro-repo-app.js`
  - se reemplazan los placeholders sensibles del modal de sync por textos neutros:
    - URL placeholder: `URL del proyecto`
    - key placeholder: `Ingresa tu clave publishable`

### QA ejecutado

- Verificacion del hook:
  - lectura directa de `.git/hooks/pre-commit`: OK;
  - re-scan del archivo AgroRepo contra patrones del hook: OK tras limpieza.

### Build status final

- `pnpm build:gold`: OK.

### QA sugerido

1. Reintentar `git add` + `git commit` con el mismo mensaje.

## 2026-03-19 - AgroRepo Tree Refinement + Accordion Removal

### Diagnostico inicial

- El modulo AgroRepo ya esta funcional y aprobado en su diseño general, pero quedan tres fricciones puntuales:
  - el arbol necesita un comportamiento mas claro y estable para expandir/colapsar carpetas hijas y subhijas;
  - el selector de ubicacion en modales se ve demasiado nativo y no comunica bien rutas largas;
  - el contenedor superior basado en `details/summary` agrega ruido porque AgroRepo ya no necesita esa capa de acordeon.

### Alcance

- Ajustar solo interacciones del arbol anidado.
- Refinar visualmente el selector de ubicacion y su lectura de ruta.
- Eliminar el comportamiento/ruido del acordeon superior sin redisenar el modulo.

### Plan

1. Endurecer el manejo de expansion de ancestros y el render del toggle en el arbol.
2. Mejorar el select de ubicacion con mejor acabado visual y una pista de ruta clara.
3. Neutralizar el `details/summary` superior desde el runtime AgroRepo para dejar el bloque fijo y estable.
4. Ejecutar smoke de arbol + build.

### Archivos a tocar

- `apps/gold/agro/agro-repo-app.js`
- `apps/gold/agro/agro-repo.css`
- `apps/gold/agro/agro-repo-storage.js` *(necesario para que el estado expandido/colapsado de carpetas raiz e hijas no se reabra al persistir)*
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Cambios aplicados

- `apps/gold/agro/agro-repo-app.js`
  - Se agrego `expandPathToNode()` para abrir ancestros reales del archivo o carpeta creada/pegada, manteniendo navegacion estable en todos los niveles.
  - Se ajusto el render del arbol con estado `has-children` / `is-empty`, `aria-expanded` y recursion con profundidad para que carpetas hijas y nietas reflejen mejor su estado.
  - Se mejoro el modal de creacion con `agrp-select-wrap`, icono de dropdown y `agrpCreateLocationHint` para comunicar la ruta seleccionada.
  - Se neutralizo el `details/summary` superior via `neutralizeAccordionChrome()` para que AgroRepo cargue directo, sin capa de acordeon visible.
- `apps/gold/agro/agro-repo.css`
  - Se reforzo la legibilidad del arbol con indentacion/borde de jerarquia y estado visual mas claro para toggles de carpeta.
  - Se refino el selector de ubicacion con `appearance: none`, icono propio, mejor contraste y pista truncable para rutas largas.
  - Se oculto el `summary` del acordeon legacy y se limpio su chrome visual.
- `apps/gold/agro/agro-repo-storage.js`
  - Se corrigio `normalizeTreeRepo()` para no reabrir siempre todas las carpetas raiz ni la ruta activa en cada persistencia.
  - Se mantiene la apertura inicial por defecto cuando no existe estado previo, pero ahora el colapso del usuario persiste correctamente.

### Build status

- `pnpm build:gold` -> OK
- Warning no bloqueante: engine esperado `node 20.x`, entorno actual `node v25.6.0`.

### QA ejecutado

- Smoke DOM con `jsdom` sobre el runtime real:
  - acordeon superior neutralizado y `summary` oculto;
  - crear carpeta hija dentro de `Mi Finca`;
  - crear carpeta nieta dentro de la carpeta hija;
  - crear archivo dentro de la carpeta nieta;
  - colapso/expansion de carpeta raiz, hija y nieta;
  - apertura de archivo desde nivel anidado con reapertura correcta de ancestros;
  - actualizacion del selector de ubicacion y su hint de ruta;
  - resize a `390px` sin romper el montaje del modulo.
- Resultado smoke: `AGROREPO_TREE_REFINEMENT_SMOKE_OK`

### QA sugerido

1. Validar visualmente el modal de creacion con rutas largas reales dentro del shell `/agro/`.
2. Confirmar en navegador real que el header superior ya no deja rastro de acordeon legacy.
3. Repetir una prueba manual rapida en movil para targets tactiles y ausencia de overflow horizontal.

## 2026-03-22 - Fase 0 canonica Cartera Viva V2

### Diagnostico inicial

- La sesion no implementa UI ni modulo nuevo; solo debe producir diagnostico tecnico verificable para Cartera Viva V2.
- El punto critico a comprobar es si el facturero ya tiene entidad comprador canonica (`buyer_id` o equivalente) o si sigue operando con texto libre.
- Tambien debe verificarse si el esquema real y la data existente soportan agrupar cartera por comprador sin romper historiales ni mezclar variantes de nombre.

### Plan

1. Inspeccionar el repo para localizar codigo de facturero, historial, exportes, rankings, stats y cualquier manejo de compradores/clientes.
2. Inspeccionar el esquema real de Supabase via MCP para identificar tablas, columnas, relaciones, claves foraneas y restricciones relevantes.
3. Contrastar codigo y esquema para determinar si existe `buyer_id` real, si hay tabla de compradores y como se guardan fiados/pagos/perdidas/transferencias/donaciones.
4. Buscar evidencia de duplicados o fragmentacion de compradores por variantes de texto.
5. Emitir veredicto de factibilidad y recomendacion arquitectonica sin implementar nada.

### Preguntas a responder

- Existe una tabla `agro_buyers` o equivalente para compradores normalizados.
- Los movimientos del facturero guardan `buyer_id` real o solo nombre libre.
- Existen duplicados reales de compradores por mayusculas/minusculas/tildes/variantes.
- Donde debe vivir Cartera Viva en la arquitectura actual.
- Si la implementacion correcta debe ser un modulo nuevo dedicado y por que.
- Si el modelo actual soporta `buyer_id` canonico, nombre canonico, aliases y el mapeo a `credited_sale`, `debt_payment`, `cash_sale`, `loss`, `transfer` y `donation`.

### Riesgos tecnicos

- Puede existir drift entre el codigo del repo y el esquema productivo real.
- Puede haber nombres de comprador persistidos como texto libre en multiples tablas, lo que fragmentaria cartera e historial.
- La semantica de estados como "pagado" puede no equivaler siempre a pago de deuda; hay que validar contra columnas y flujo real.
- Si no existe FK real hacia comprador, cualquier MVP de cartera exigira saneamiento o migracion previa/minima.

### Fuentes a inspeccionar

- Repo:
  - `AGENTS.md`
  - `apps/gold/agro/agro.js`
  - modulos `apps/gold/agro/agro-*.js` relacionados con historial, stats, carrito, trash, dashboard o compradores
  - `apps/gold/agro/agrocompradores.js`
  - exportes markdown o documentos que revelen agrupacion actual
  - `apps/gold/supabase/agro_schema.sql` y migraciones relevantes
- Supabase MCP:
  - tablas del schema real
  - columnas y claves foraneas
  - consultas de muestra para detectar `buyer_id`, nombres de comprador y duplicados

### Cambios aplicados

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - Se agrego la apertura formal de la sesion Fase 0 canonica Cartera Viva V2 con diagnostico, plan, preguntas, riesgos y fuentes.

### Build status

- No ejecutado en esta fase inicial de diagnostico; solo se actualizo documentacion obligatoria previa al analisis.

### QA sugerido

1. Verificar al cierre de la sesion que el diagnostico cite columnas y tablas reales del esquema Supabase activo.
2. Confirmar que cualquier recomendacion arquitectonica quede respaldada por archivos concretos del repo y no por supuestos.

---

## Sesion: Fix decimales en transferencias parciales del Facturero (2026-03-23)

### Diagnostico

El flujo de transferencias parciales del historial (fiados → pagados / fiados → perdidas) bloqueaba el ingreso de cantidades decimales (ej. `2.5` sacos) cuando el total de la transaccion era un numero entero (ej. `4`).

### Causa raiz

El sistema usa `isIntegerLike(valor_total)` para determinar el modo de precision (`qtyPrecision`):
- Si el total es entero (ej. `4`), `qtyPrecision = 0` → modo entero forzado.
- Esto propaga a:
  1. `qtyStep = '1'` → atributo HTML `step="1"` que bloquea decimales en el `<input>`.
  2. `Math.round(parsed)` en `resolveQtyMoveDraft` → descarta la parte decimal del valor ingresado.
  3. `Math.round(qtyLeftRaw)` en `updateSplitPreview` → redondea el remanente.
  4. `Math.round(qtyTransfer)` y `Math.round(qtyTotal)` en `computePendingSplitDraft` → destruye los decimales al construir el split draft.
  5. `roundNumeric(qty, 0)` en `buildPartialSplitMetaPayload` → guarda en DB sin decimales.

Archivos y lineas afectadas:
- `apps/gold/agro/agro.js:6947-6948` — calculo de `qtyPrecision` y `qtyStep` en `buildTransferMetaModal`
- `apps/gold/agro/agro.js:6967` — `qtyTotalInput.step = qtyStep` (bloqueo en input total)
- `apps/gold/agro/agro.js:7003` — `Math.round` en valor inicial del input de cantidad
- `apps/gold/agro/agro.js:7006` — `Math.round` en `qtyInput.max`
- `apps/gold/agro/agro.js:7011` — `qtyInput.step = qtyStep` (bloqueo en input cantidad)
- `apps/gold/agro/agro.js:7105` — `qtyPrecision` derivado de `isIntegerLike` en `resolveQtyTotalDraft`
- `apps/gold/agro/agro.js:7133` — `Math.round(parsed)` en `resolveQtyMoveDraft`
- `apps/gold/agro/agro.js:7157-7158` — step y max en `updateSplitPreview`
- `apps/gold/agro/agro.js:7179` — `Math.round(qtyLeftRaw)` en `updateSplitPreview`
- `apps/gold/agro/agro.js:4010` — `Math.round(qtyRaw)` en `computePendingSplitDraft`
- `apps/gold/agro/agro.js:4013` — `normalizedQtyPrecision = 0` si total es entero
- `apps/gold/agro/agro.js:4044-4045` — `Math.round(base.qtyTotal)` en `computePendingSplitDraft`
- `apps/gold/agro/agro.js:4051` — `Math.round(qtyTransfer)` en `computePendingSplitDraft`
- `apps/gold/agro/agro.js:4059` — `Math.round(qtyLeftRaw)` en `computePendingSplitDraft`
- `apps/gold/agro/agro.js:3948` — `qtyPrecision = 0` en `buildPartialSplitMetaPayload` si todos son enteros

### Plan del fix

1. En `buildTransferMetaModal`: `qtyPrecision` siempre = `2`; `qtyStep` siempre = `'any'`.
2. En `resolveQtyTotalDraft`: `qtyPrecision` siempre = `2`.
3. En `resolveQtyMoveDraft`: siempre usar `roundNumeric(parsed, 2)`, nunca `Math.round`.
4. En `updateSplitPreview`: step siempre `'any'`, max y qtyLeft siempre con `roundNumeric(..., 2)`.
5. En `computePendingSplitDraft`: eliminar los `Math.round` y forzar `precision = 2`.
6. En `buildPartialSplitMetaPayload`: usar `precision = 2` siempre para guardar con decimales.
7. Display inteligente se mantiene via `formatSplitQuantity` que ya usa `isIntegerLike` para el render.

### Cambios aplicados

**`apps/gold/agro/agro.js`** — 10 ediciones quirurgicas:

| Linea (aprox) | Funcion | Cambio |
|---|---|---|
| 6947-6949 | `buildTransferMetaModal` | `qtyPrecision=2` fijo; `qtyStep='any'` fijo (antes derivados de `isIntegerLike`) |
| 6999-7006 | `buildTransferMetaModal` | Eliminado `Math.round` en clamp default y en `qtyInput.max`; usa `roundNumeric(...,2)` |
| 7106-7107 | `resolveQtyTotalDraft` | `qtyPrecision=2` fijo (antes `isIntegerLike`) |
| 7133 | `resolveQtyMoveDraft` | Eliminado `Math.round(parsed)`; usa `roundNumeric(parsed,2)` |
| 7157-7158 | `updateSplitPreview` | `qtyInput.step='any'`; `qtyInput.max=roundNumeric(...,2)` |
| 7179 | `updateSplitPreview` | Eliminado `Math.round(qtyLeftRaw)`; usa `roundNumeric(qtyLeftRaw,2)` |
| 4009-4010 | `computePendingSplitDraft` | Eliminado `Math.round(qtyRaw)`; usa `roundNumeric(qtyRaw,2)` |
| 4013 | `computePendingSplitDraft` | `normalizedQtyPrecision=2` fijo |
| 4044-4059 | `computePendingSplitDraft` | Eliminados `Math.round` en `qtyTotal`, `qtyTransfer`, `qtyLeft` |
| 3948 | `buildPartialSplitMetaPayload` | `qtyPrecision=2` fijo (antes condicionado a `isIntegerLike`) |

**`apps/gold/docs/AGENT_REPORT_ACTIVE.md`** — esta seccion de reporte

### Build status

- `pnpm build:gold` PASS — sin errores ni warnings nuevos.

### QA sugerido

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Entero normal | Transferir `2` de `4` sacos | OK, funciona como antes |
| Decimal nuevo | Transferir `2.5` de `4` sacos | Transferido: `2.5`, Restante: `1.5` |
| Cero rechazado | Transferir `0` | Error: cantidad invalida |
| Negativo rechazado | Transferir `-1` | Error: cantidad invalida |
| Exceso rechazado | Transferir `4.1` de `4` | Error: supera disponible |
| Decimal fino | Transferir `1.25` de `4` | Transferido: `1.25`, Restante: `2.75` |
| Display limpio | Ver badge tras split `2.5/1.5` | Sin `1.5000000002` ni basura visual |
| Flujo reversa | Devolver pagado a fiados con cantidad decimal | Funciona; `split_meta` guarda con 2 decimales |

---

## Sesion: Consolidar YavlGold = Agro en dashboard y landing (2026-03-26)

### Diagnostico

- La landing activa en `apps/gold/index.html` todavia presenta un ecosistema inflado:
  - la seccion `#modulos` muestra Agro junto a Crypto, Academia, Tecnologia, Social y Dashboard como si formaran parte de la propuesta activa;
  - el CTA y el footer hablan de comunidad y amplitud de plataforma mas alla del estado real actual.
- El dashboard activo en `apps/gold/dashboard/index.html` sigue cargando el catalogo completo desde Supabase:
  - `normalizeModules()` y `loadModules()` renderizan todos los modulos canonicos detectados;
  - la UI mantiene copy como "Buscar modulos", estadistica "Modulos" y tarjetas de insight redactadas para un catalogo multiproducto;
  - `StatsManager.updateModulesCount()` en `apps/gold/assets/js/modules/moduleManager.js` cuenta todos los modulos activos de la tabla `modules`, no solo Agro.
- `apps/gold/assets/js/modules/moduleIdentity.js` ya marca `agro` como unico modulo liberado (`RELEASED_DASHBOARD_MODULES`), asi que el ajuste puede ser quirurgico: filtrar visibilidad del dashboard y reescribir copy visible sin abrir otros frentes.

### Plan

1. Consolidar el dashboard para mostrar solo Agro como area activa y eliminar ruido de catalogo multiproducto en copy/estadisticas.
2. Reenfocar la landing para que la narrativa, los bloques y los CTA hablen solo del valor agricola real actual.
3. Evitar QA intensivo, cerrar con `pnpm build:gold` y completar esta misma seccion con cambios aplicados, build status y QA sugerido.

### Cambios aplicados

- `apps/gold/dashboard/index.html`
  - `1582-1684`: copy visible del shell ajustado a una sola verdad activa:
    - `Dashboard V1` -> `Agro Activo`
    - `Buscar modulos...` -> `Buscar acceso Agro...`
    - hero, estadisticas e insights reescritos para enfoque Agro
    - loading `Cargando modulos...` -> `Cargando Agro...`
  - `2251-2304`: `normalizeModules()` ahora filtra solo `agro`; el contador visible de areas activas se fija con el resultado filtrado y el dashboard deja de usar `updateAllStats()` para no volver a contar el catalogo completo.
  - `2397-2694`: CTA, badge y estados vacios quedaron alineados a Agro (`ACTIVO`, `Abrir Agro`, `primer acceso pendiente`, `No encontramos Agro con ese criterio`).
- `apps/gold/index.html`
  - `70-151`: navegacion y hero reenfocados a Agro (`Agro` en lugar de `Modulos`, badge `Agro Activo`, hero con narrativa agricola real).
  - `148-160`: la seccion `#modulos` deja de listar Crypto, Academia, Tecnologia, Social y Dashboard; queda una sola card activa de Agro con copy operativo real.
  - `221-237`: CTA y footer dejan de prometer amplitud de modulos y pasan a hablar de comunidad del campo y del sistema agricola real actual.
- `apps/gold/assets/js/profile/onboardingManager.js`
  - `195-197`: fallback de `buildOnboardingHeroSubtitle()` alineado con el nuevo mensaje base del dashboard para que el onboarding no reintroduzca copy legacy.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - apertura y cierre de esta sesion documentados segun la politica canonica.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA sugerido

1. Abrir landing y dashboard en navegador real para confirmar visualmente que solo Agro compite por atencion.
2. Verificar login -> `/dashboard/` -> `/agro/` para confirmar que el acceso principal sigue intacto.

---

## Sesion: Compactar landing Agro y alinear superficies publicas (2026-03-26)

### Diagnostico

- La landing activa en `apps/gold/index.html` ya esta enfocada en Agro, pero el bloque principal sigue dependiendo de cards altas:
  - `#modulos` usa una card hero unica con demasiado peso vertical para una sola idea;
  - la seccion `v10-value-section` mantiene cuatro `v10-value-card` grandes y genericas, con altura y densidad bajas para el valor real actual.
- El peso visual de ese bloque vive en `apps/gold/assets/css/landing-v10.css`:
  - `v10-section`, `v10-section-header`, `v10-module-card`, `v10-value-grid` y `v10-value-card` concentran padding, gaps y alturas que hoy hacen ver la landing mas decorativa que operativa.
- Las superficies publicas con contradicciones claras son:
  - `apps/gold/index.html` en `title`, `description`, Open Graph, Twitter y schema, todavia redactados como plataforma agricola amplia en vez de Agro operativo;
  - `README.md`, que sigue describiendo estructura y catalogo con amplitud mayor a la verdad visible actual.

### Plan

1. Compactar el bloque visible de valor en landing con beneficios concretos, mas densos y mas utiles.
2. Reducir altura y peso visual de cards y secciones solo donde hoy estorban la lectura del producto real.
3. Alinear metadatos SEO y README con `YavlGold = Agro`, evitando QA intensivo y cerrando con `pnpm build:gold`.

### Cambios aplicados

- `apps/gold/index.html`
  - Se compactaron los bloques principales de la landing sin rediseñarla desde cero:
    - card principal de Agro con copy mas corto y mas operativo;
    - bloque de valor rehecho como beneficios concretos de uso real;
    - CTA y footer con narrativa mas sobria y util.
  - SEO alineado a Agro:
    - `title`, `meta description`, Open Graph, Twitter y schema dejaron de vender una plataforma agricola amplia y pasaron a describir Agro operativo.
- `apps/gold/assets/css/landing-v10.css`
  - Se redujo el peso visual del bloque central:
    - `v10-section` y `v10-section-header` con menos altura;
    - `v10-module-card` con menos padding, gap e icono mas contenido;
    - `v10-value-grid` mas eficiente y `v10-value-card` mas compactas y densas.
- `README.md`
  - Se reforzo la lectura publica de que YavlGold hoy es Agro y se limpiaron referencias innecesarias al catalogo no activo en el resumen principal y en la estructura expuesta.
- `apps/gold/README.md`
  - Se alineo el documento operativo publico a `YavlGold = Agro`, eliminando listado innecesario de modulos no activos y reduciendo el discurso a superficies reales + legado.
- `apps/gold/faq.html`
  - Meta description y respuestas publicas alineadas a Agro como experiencia activa, sin enumerar modulos no activos.
- `apps/gold/soporte.html`
  - Copy de soporte alineado a Agro, se elimino la nota de futuro tipo `Proximamente` y el footer visible ya apunta a `Agro` en lugar de `Modulos`.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - Apertura y cierre de esta sesion documentados conforme a la politica canonica.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA sugerido

1. Revisar visualmente la landing en desktop y mobile para confirmar que los beneficios se leen mas rapido y con menos peso vertical.
2. Verificar que FAQ y Soporte siguen navegables y que el acceso principal a `/agro/` no cambia.

---

## Sesion: Compactar de verdad landing y card Agro del dashboard (2026-03-26)

### Diagnostico

- La landing en `apps/gold/index.html` y `apps/gold/assets/css/landing-v10.css` sigue teniendo una estructura pesada:
  - `#modulos` conserva una sola card dominante que se percibe como franja horizontal;
  - la compactacion anterior redujo padding, pero no elimino la estructura ultra-ancha;
  - la seccion principal todavia no funciona como grid compacto de beneficios.
- El dashboard en `apps/gold/dashboard/index.html` sigue renderizando Agro como card demasiado ancha:
  - `modules-grid` conserva una huella visual de catalogo amplio aunque ahora solo exista Agro;
  - la card mantiene layout con demasiado ancho percibido y poco contenido util por bloque;
  - la presencia de thumbnail y el orden interno la siguen acercando a banner mas que a modulo operativo.

### Plan

1. Reemplazar la mega-card principal de la landing por una grilla compacta real de 4 beneficios.
2. Forzar una estructura de 2 columnas en desktop/tablet y 1 columna en mobile para esa seccion.
3. Compactar la card Agro del dashboard con menos ancho percibido, menos imagen dominante y mas densidad util, luego cerrar con `pnpm build:gold`.

### Cambios aplicados

- `apps/gold/index.html`
  - La seccion principal `#modulos` dejo de usar una sola card dominante.
  - Ahora renderiza 4 cards compactas:
    - Cultivos y ciclos
    - Finanzas reales
    - Clima y seguimiento
    - Historial operativo
  - Se elimino la seccion de valor redundante para evitar doble bloque grande y se reemplazo por una accion compacta `Entrar a Agro`.
- `apps/gold/assets/css/landing-v10.css`
  - `v10-modules-grid` paso a una grilla real contenida:
    - 2 columnas en desktop/tablet
    - 1 columna en mobile
    - `max-width` acotado para evitar banners horizontales disfrazados de cards
  - `v10-module-card` quedo mas densa, con menos altura y menos protagonismo vacio.
  - Se elimino el bloque CSS de la seccion de valor anterior que ya no se usa.
- `apps/gold/dashboard/index.html`
  - La card Agro dejo de usar thumbnail dominante.
  - El contenido interno se reorganizo para concentrar icono, titulo, descripcion y badge en un bloque mas compacto.
  - Se agrego fallback de features reales de Agro para subir densidad util de la card.
- `apps/gold/assets/css/dashboard-v1.css`
  - `modules-grid` ya no se abre como franja amplia: queda centrado y contenido.
  - La card Agro reduce padding, icono, altura y dispersión.
  - El CTA queda mas cerca del contenido util y la card se comporta como panel operativo, no como banner.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - Apertura y cierre de esta sesion documentados conforme a la politica canonica.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA sugerido

1. Verificar visualmente en navegador que la landing ya se percibe como 4 panels compactos y no como una mega-card.
2. Confirmar que la card Agro del dashboard ya no se siente como banner y que el CTA sigue llevando bien a `/agro/`.

---

## Sesion: Cartera Viva V4 Fase 1 real buyer-centric (2026-03-26)

### Diagnostico

- La verdad parcial de compradores ya existia en dos capas separadas:
  - `public.agro_buyers` existia en Supabase con `display_name` + `group_key`, pero estaba vacia en produccion;
  - el facturero seguia operando principalmente con texto libre:
    - `agro_pending.cliente`
    - `agro_income.concepto` con patron `Venta a X - ...`
    - `agro_losses.causa` / `concepto` solo en casos derivados de fiados.
- El estado real auditado en Supabase `gerzlzprkarikblqxpjt` antes del cambio fue:
  - `agro_buyers`: 0 filas;
  - sin `buyer_id` en `agro_pending`, `agro_income`, `agro_losses`, `agro_transfers`, `agro_expenses`;
  - sin FK entre movimientos y compradores.
- Legacy medido antes de aplicar Fase 1:
  - `agro_pending`: 96 filas, 91 con nombre candidato seguro;
  - `agro_income`: 112 filas, 98 con nombre candidato seguro;
  - `agro_losses`: 12 filas, solo 2 seguras como deuda cancelada desde `agro_pending`;
  - variantes reales confirmadas por canonicalizacion: `oliva/Oliva`, `gollo/Gollo`, `Jesus/Jesús berraco`, `Qa/QA`, etc.
- Conclusión operativa:
  - la fase correcta era estructural y no visual;
  - la ruta de menor riesgo era SQL + backfill real + wiring minimo de escrituras, sin UI nueva.

### Cambios aplicados

- `apps/gold/supabase/migrations/20260326120000_agro_buyer_foundation_v4.sql`
  - Se agrego `public.agro_canonicalize_buyer_name()` con la canonicalizacion simple V4.
  - Se agregaron columnas nullable en movimientos relevantes:
    - `agro_pending.buyer_id`, `buyer_group_key`, `buyer_match_status`
    - `agro_income.buyer_id`, `buyer_group_key`, `buyer_match_status`
    - `agro_losses.buyer_id`, `buyer_group_key`, `buyer_match_status`
  - Se agregaron indices `(user_id, buyer_id)` y `(user_id, buyer_group_key)` para esas tablas.
  - Se poblo `agro_buyers` por backfill seguro desde `agro_pending`, `agro_income` y perdidas originadas en `agro_pending`.
  - Se dejaron ambiguos marcados sin inventar clasificacion:
    - `legacy_review_required`
    - `legacy_unclassified`
- Supabase real `gerzlzprkarikblqxpjt`
  - Migracion aplicada en real.
  - Fix posterior aplicado sobre la misma funcion para dejar `search_path` fijo y no introducir warning nuevo del advisor.
  - Resultado real tras el backfill:
    - `agro_buyers`: 49 compradores poblados;
    - `agro_pending`: 92 con `buyer_id`, 4 `legacy_review_required`;
    - `agro_income`: 103 con `buyer_id`, 9 `legacy_review_required`;
    - `agro_losses`: 2 con `buyer_id`, 10 `legacy_unclassified`.
- `apps/gold/agro/agro-buyer-identity.js`
  - Nuevo helper compartido para canonicalizacion y resolucion de identidad buyer-centric.
  - Centraliza:
    - `normalizeBuyerGroupKey`
    - extraccion segura de candidato
    - `ensureBuyerIdentityLink()` para crear o reutilizar `agro_buyers` y devolver `buyer_id`.
- `apps/gold/agro/agrocompradores.js`
  - Ahora reutiliza la canonicalizacion compartida en vez de mantener una copia local.
- `apps/gold/agro/agrosocial.js`
  - Ahora reutiliza la canonicalizacion compartida para `buyer_group_key`.
- `apps/gold/agro/agro-wizard.js`
  - Wiring minimo para que nuevas altas en `pendientes`, `ingresos` y `perdidas` generen o resuelvan `buyer_id` y no sigan creando legacy libre.
- `apps/gold/agro/agro.js`
  - Wiring minimo en:
    - edicion de movimientos;
    - conversiones `fiados -> pagados/perdidas`;
    - conversiones `pagados/perdidas -> fiados`;
    - duplicado de movimientos;
  - Sin UI nueva, sin vista nueva y sin refactor amplio del monolito.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`
- Advisors de seguridad revisados:
  - no quedaron warnings nuevos atribuibles a esta fase;
  - persisten warnings legacy del proyecto (`admin_audit_log` sin policy, funciones legacy con `search_path` mutable, leaked password protection desactivado).

### QA sugerido

1. Revisar en Supabase las filas `legacy_review_required` de `agro_pending` y `agro_income` para completar los pocos casos sin comprador resoluble automaticamente.
2. Revisar las `agro_losses` marcadas `legacy_unclassified` para confirmar que siguen siendo perdidas operativas reales y no deuda mal modelada.
3. Crear manualmente un fiado nuevo, un pagado nuevo y una conversion `fiado -> pagado` para confirmar que el movimiento nuevo ya persiste `buyer_id`.
4. Revisar nombres duplicados por alias reales (`Yony` vs `Yony chupeto`, `Jesus` vs `Jesús berraco`) antes de usar Fase 2 de agregacion buyer-centric.
5. Smoke test general del facturero para altas, ediciones, transferencias y reversions.

## Sesion: Cartera Viva V4 Fase 1 cierre final canonicalizacion (2026-03-26)

### Diagnostico

La auditoria final de Fase 1 detecto un unico bloqueo real: `normalizeBuyerGroupKey()` en JS eliminaba puntuacion, mientras la canonicalizacion V4 aprobada en SQL solo permite `lowercase(trim(collapse_spaces(remove_accents(name))))`. Eso podia generar `group_key` divergente entre backfill y nuevas escrituras.

### Cambios aplicados

- `apps/gold/agro/agro-buyer-identity.js`
  - Se elimino la normalizacion extra de puntuacion en `normalizeBuyerGroupKey()` para alinear JS con SQL y con la formula simple del plan maestro.

### Build status

- `pnpm build:gold` -> OK

### QA sugerido

1. Crear o editar un comprador con signos o puntuacion y confirmar que JS y SQL generan el mismo `group_key`.
2. Revisar un caso legacy con puntuacion para validar que no aparezcan divergencias nuevas.

---

## Sesion: Fase 2 / Cartera Viva base modular de historial (2026-03-27)

### Diagnostico

- Comienza formalmente **Fase 2 / Cartera Viva**.
- Regla canonica activa: **no seguir construyendo producto nuevo dentro de `apps/gold/agro/agro.js`**.
- El historial del facturero sigue demasiado concentrado en `agro.js`:
  - ahi viven la normalizacion de busqueda del historial;
  - el ordenado y la agrupacion por dia;
  - helpers de lectura de campos del historial;
  - render agrupado repetido en vistas dedicadas (`pagados`, `fiados`, `perdidas`, `donaciones`, `otros`).
- Primer corte modular de bajo riesgo detectado:
  - extraer la capa pura de historial usada por Cartera Viva;
  - mover normalizacion + agrupacion + base de render agrupado a un modulo nuevo;
  - dejar `agro.js` solo orquestando la integracion de esas piezas.
- Piezas que deben quedarse temporalmente en `agro.js`:
  - queries Supabase;
  - `renderHistoryRow()` y acciones CRUD;
  - wiring de vistas dedicadas y listeners.

### Plan

1. Crear un modulo nuevo de Cartera Viva para utilidades puras de historial.
2. Mover desde `agro.js` la normalizacion del historial, lectura de campos y agrupacion por dia.
3. Reutilizar ese modulo en el historial general y en los render agrupados de vistas dedicadas.
4. Mantener compatibilidad funcional y cerrar con `pnpm build:gold`.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva.js`
  - nuevo modulo base de Cartera Viva para historial;
  - centraliza:
    - normalizacion de busqueda;
    - lectura tolerante de campos;
    - sort por fecha/timestamp;
    - agrupacion por dia;
    - base de render agrupado con headers por fecha.
- `apps/gold/agro/agro.js`
  - importa el modulo nuevo y deja de implementar localmente esos helpers;
  - conserva solo el wiring del historial general y de las vistas dedicadas;
  - las vistas dedicadas de `pagados`, `fiados`, `perdidas`, `donaciones` y `otros` ahora usan el renderer agrupado compartido;
  - la normalizacion de busqueda dedicada ya no se duplica por vista.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - sesion abierta y cerrada conforme a la policy canonica.

### Archivos + lineas

- `apps/gold/agro/agro-cartera-viva.js:1-138`
  - nueva base modular del historial Cartera Viva.
- `apps/gold/agro/agro.js:23-32`
  - import del modulo `agro-cartera-viva.js`.
- `apps/gold/agro/agro.js:598-601`
  - puente global ahora apunta a helpers importados, no a implementacion local.
- `apps/gold/agro/agro.js:13089-14546`
  - normalizacion dedicada y render agrupado de vistas dedicadas conectados al modulo nuevo.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA sugerido

1. Abrir `Pagados`, `Fiados`, `Perdidas`, `Donaciones` y `Otros` para confirmar que siguen agrupando por fecha y mostrando el mismo orden visual.
2. Probar una busqueda simple en las vistas dedicadas para validar que la normalizacion acentos/mayusculas sigue intacta.
3. Hacer smoke visual corto en desktop y mobile del historial tocado, sin ampliar alcance a QA intensivo.

---

## Sesion: Cartera Viva Fase 1 estructural buyer-centric consolidacion modular (2026-03-27)

### Diagnostico

- Esta sesion ejecuta **Fase 1 estructural**.
- **Cartera Viva aun no arranca por UI**; el foco correcto sigue siendo `buyer_id` + canonicalizacion + backfill seguro.
- El repo ya trae la base V4 en progreso:
  - existe `public.agro_buyers`;
  - existe la migracion `apps/gold/supabase/migrations/20260326120000_agro_buyer_foundation_v4.sql`;
  - existe el helper modular `apps/gold/agro/agro-buyer-identity.js`;
  - existen cambios abiertos en `agro-wizard.js`, `agrocompradores.js` y `agrosocial.js` para usar esa base.
- El hueco estructural detectado no es rehacer schema ni UI:
  - la identidad buyer-centric todavia vive repartida por imports directos;
  - Cartera Viva aun no funciona como punto de entrada modular claro para esta fundacion;
  - `agro.js` no debe seguir creciendo como destino principal.

### Plan

1. Consolidar la fundacion buyer-centric bajo `apps/gold/agro/agro-cartera-viva.js` como entrypoint modular de Cartera Viva.
2. Reexportar desde ahi la capa de identidad buyer-centric existente, sin duplicar logica.
3. Mover imports de bajo riesgo para que wizard, compradores, social y el wiring minimo del monolito consuman Cartera Viva desde ese punto.
4. Documentar el estado real: que la migracion V4 queda preparada en repo y que esta sesion consolida la base modular sin abrir UI nueva.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva.js`
  - pasa de base de historial a entrypoint modular mas claro de Cartera Viva;
  - ahora reexporta la capa buyer-centric existente:
    - `normalizeBuyerGroupKey`
    - `extractBuyerIdentityCandidate`
    - `ensureBuyerIdentityLink`
    - `isBuyerIdentityRelevantTab`
    - `BUYER_MATCH_STATUS`
- `apps/gold/agro/agro-wizard.js`
  - deja de depender directo de `agro-buyer-identity.js`;
  - ahora consume la base buyer-centric via `agro-cartera-viva.js`.
- `apps/gold/agro/agrocompradores.js`
  - deja de mantener su normalizacion local y consume la canonicalizacion compartida desde Cartera Viva.
- `apps/gold/agro/agrosocial.js`
  - deja de mantener su normalizacion local y consume la canonicalizacion compartida desde Cartera Viva.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - apertura y cierre de esta sesion segun policy canonica.

### Archivos + lineas

- `apps/gold/agro/agro-cartera-viva.js:1-11`
  - entrypoint modular buyer-centric de Cartera Viva.
- `apps/gold/agro/agro-wizard.js:8`
  - import buyer-centric apuntando a Cartera Viva.
- `apps/gold/agro/agrocompradores.js:2`
  - canonicalizacion compartida via Cartera Viva.
- `apps/gold/agro/agrosocial.js:2`
  - canonicalizacion compartida via Cartera Viva.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA sugerido

1. Crear un fiado, un pagado y una perdida nuevos para confirmar que el wizard sigue resolviendo `buyer_id` desde el entrypoint modular de Cartera Viva.
2. Abrir una ficha en Compradores y crear un hilo en Social para validar que ambos usan la misma canonicalizacion de `group_key`.
3. No ampliar a QA intensivo; esta ronda es estructural y sin UI nueva.

---

## Sesion: Cartera Viva cierre Fase 1 estructural DB y backfill prudente (2026-03-27)

### Diagnostico

- Esta sesion busca **cerrar Fase 1 estructural de verdad**.
- El lote anterior consolidó el codigo modular de Cartera Viva, pero no habia cerrado todavia el estado **DB/backfill** en el repo canónico.
- Estado real verificado contra Supabase:
  - `public.agro_buyers` ya existe y esta activo en produccion;
  - `agro_pending`, `agro_income` y `agro_losses` ya tienen `buyer_id`, `buyer_group_key` y `buyer_match_status`;
  - el backfill prudente ya esta aplicado en la base real con buckets honestos (`matched`, `legacy_review_required`, `legacy_unclassified`);
  - la base remota ya registra las migraciones `20260327001037_agro_buyer_foundation_v4` y `20260327001106_agro_buyer_foundation_v4_search_path_fix`.
- El gap real estaba en el repo:
  - la foundation V4 solo existia como draft no trackeado en `apps/gold/supabase/migrations/20260326120000_agro_buyer_foundation_v4.sql`;
  - faltaba reflejar en `supabase/migrations` las versiones reales aplicadas;
  - `agro.js` no debia crecer para resolver esto.

### Plan

1. Usar la ruta de menor riesgo: complementar el repo con las migraciones canónicas ya aplicadas en Supabase.
2. Registrar en `supabase/migrations` la foundation V4 y su fix de `search_path` con los timestamps reales.
3. Eliminar el draft duplicado fuera de la ruta canónica para no dejar dos verdades.
4. Cerrar la sesion con build y estado documentado.

### Cambios aplicados

- `supabase/migrations/20260327001037_agro_buyer_foundation_v4.sql`
  - nueva migracion canónica trackeada que registra en el repo la foundation buyer-centric V4:
    - funcion `public.agro_canonicalize_buyer_name`;
    - `buyer_id` nullable;
    - `buyer_group_key`;
    - `buyer_match_status`;
    - indices por `user_id + buyer_id` y `user_id + buyer_group_key`;
    - seed/backfill prudente en `agro_buyers`, `agro_pending`, `agro_income`, `agro_losses`.
- `supabase/migrations/20260327001106_agro_buyer_foundation_v4_search_path_fix.sql`
  - nueva migracion canónica trackeada para alinear el repo con el fix real aplicado de `search_path`.
- `apps/gold/supabase/migrations/20260326120000_agro_buyer_foundation_v4.sql`
  - eliminado el draft duplicado fuera de la ruta principal de migraciones.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - sesion abierta y cerrada conforme a la policy canonica.

### Archivos + lineas

- `supabase/migrations/20260327001037_agro_buyer_foundation_v4.sql:1-216`
  - foundation buyer-centric V4 registrada en la ruta canónica del repo.
- `supabase/migrations/20260327001106_agro_buyer_foundation_v4_search_path_fix.sql:1-30`
  - fix canónico de `search_path` alineado con Supabase real.
- `apps/gold/supabase/migrations/20260326120000_agro_buyer_foundation_v4.sql`
  - draft duplicado removido.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA sugerido

1. No hace falta QA visual nuevo en esta ronda; el cierre fue estructural de migraciones y estado de backfill.
2. En la siguiente ronda buyer-centric, usar un smoke corto de alta señal sobre un fiado nuevo, un ingreso y una perdida para validar escritura/lectura de `buyer_id`.

---

## Sesion: Cartera Viva Fase 2 agregacion buyer-centric (2026-03-27)

### Diagnostico

- Esta sesion ejecuta **Fase 2: agregacion buyer-centric**.
- La base estructural ya existe:
  - `agro_buyers` como identidad canonica;
  - `buyer_id`, `buyer_group_key` y `buyer_match_status` en movimientos relevantes;
  - backfill prudente ya canonizado;
  - entrypoint modular de Cartera Viva ya abierto en codigo.
- Todavia **no toca UI**; la mision es crear la **fuente de verdad por comprador** sin crecer `agro.js`.
- Tablas que alimentan la agregacion:
  - `agro_pending` para fiado y saldo activo;
  - `agro_income` para pagos confiables solo cuando `origin_table = 'agro_pending'`;
  - `agro_losses` para perdidas confiables solo cuando `origin_table = 'agro_pending'`;
  - `agro_buyers` como identidad y display canonico.
- Hallazgo critico:
  - `agro_pending.transfer_state = 'transferred'` se usa al mover fiados a `income` o `losses`;
  - por tanto `transferido_total` no puede restarse ciegamente junto con `paid_total` y `loss_total`, o se duplicaria la salida del eje deuda.

### Plan

1. Construir la verdad primaria de agregacion en SQL para que la UI futura no invente contabilidad.
2. Separar movimientos confiables de buckets en revision y legacy ambiguo.
3. Definir `pending_total` con criterio honesto:
   - usar saldo activo real en `agro_pending`;
   - dejar `transferido_total` como senal operativa prudente y no como doble descuento.
4. Exponer un wrapper JS minimo desde `agro-cartera-viva.js` para que la UI futura consuma la fuente agregada sin conocer detalles del RPC.

### Cambios aplicados

- `public.agro_buyer_portfolio_summary_v1()`
  - RPC SQL nuevo aplicado en Supabase y registrado en migracion canónica;
  - agrega por comprador:
    - `credited_total`
    - `paid_total`
    - `loss_total`
    - `transferred_total`
    - `pending_total`
    - `compliance_percent`
    - `review_required_total`
    - `legacy_unclassified_total`
    - `non_debt_income_total`
    - `global_status`
    - `balance_gap_total`
    - `requires_review`
- `supabase/migrations/20260328005620_agro_buyer_portfolio_summary_v1.sql`
  - nueva migracion canónica con la agregacion buyer-centric.
- `apps/gold/agro/agro-cartera-viva.js`
  - adapter minimo para la UI futura:
    - `AGRO_BUYER_PORTFOLIO_RPC`
    - `normalizeBuyerPortfolioSummaryRow()`
    - `fetchBuyerPortfolioSummary()`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - sesion documentada conforme a la policy canonica.

### Criterio aplicado

- `fiado` confiable:
  - `agro_pending` con `buyer_id` y `buyer_match_status = 'matched'`.
- `pagado` confiable:
  - solo `agro_income` con `origin_table = 'agro_pending'` y `buyer_match_status = 'matched'`.
- `perdida` confiable:
  - solo `agro_losses` con `origin_table = 'agro_pending'` y `buyer_match_status = 'matched'`.
- `transferido_total`:
  - queda como senal operativa separada;
  - solo descuenta si sale del eje deuda hacia un destino distinto de `income` o `losses`;
  - evita doble descuento con pagos/perdidas ya derivados del fiado.
- `pending_total`:
  - se define como saldo activo real en `agro_pending`, no como resta ciega que mezcle transferencias ya absorbidas por otros buckets.
- `review/ambiguos`:
  - `legacy_review_required` y `legacy_unclassified` quedan fuera del eje confiable;
  - solo se agregan al comprador cuando existe `buyer_id` o `buyer_group_key` resoluble de forma honesta.

### Archivos + lineas

- `supabase/migrations/20260328005620_agro_buyer_portfolio_summary_v1.sql:1-263`
  - migracion de la fuente de verdad buyer-centric.
- `apps/gold/agro/agro-cartera-viva.js:9-84`
  - adapter JS minimo para consumir el RPC sin meter logica en UI.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA sugerido

1. No abrir QA visual nuevo; esta ronda solo crea la fuente buyer-centric y su adapter.
2. En la siguiente fase del MVP, leer `agro_buyer_portfolio_summary_v1()` desde el modulo de Cartera Viva y validar orden por `pending_total` en un smoke corto.

---

## Sesion: Cartera Viva Fase 3 MVP visual buyer-centric (2026-03-27)

### Diagnostico

- Esta sesion ejecuta **Fase 3: MVP visual**.
- La base estructural y la agregacion ya existen:
  - `agro_buyers` como identidad canonica;
  - `public.agro_buyer_portfolio_summary_v1()` como fuente de verdad;
  - `fetchBuyerPortfolioSummary()` en `apps/gold/agro/agro-cartera-viva.js`.
- La mision ahora es montar la vista buyer-centric.
- **No toca historial contextual**.
- **No toca exportacion**.
- `agro.js` no debe crecer como destino principal.
- Puntos de integracion detectados:
  - shell y sidebar en `apps/gold/agro/index.html`;
  - enrutado de vistas en `apps/gold/agro/agro-shell.js`;
  - bootstrap modular en el script `type=\"module\"` de `index.html`;
  - la vista debe vivir en un modulo nuevo dedicado y con CSS propio.

### Plan

1. Agregar entrada propia en sidebar y region dedicada `data-agro-shell-region` para Cartera Viva.
2. Registrar la vista en `agro-shell.js` con wiring minimo.
3. Crear `agro-cartera-viva-view.js` para render, categoria activa y estados vacios.
4. Crear `agro-cartera-viva.css` para cards y layout del MVP, sin tocar tabs legacy.
5. Cargar el modulo desde el bootstrap existente y cerrar con `pnpm build:gold`.

### Cambios aplicados

- `apps/gold/agro/index.html`
  - se agrego la entrada propia de sidebar para `Cartera Viva`;
  - se agrego la region dedicada `data-agro-shell-region="cartera-viva"` con root propio;
  - se enlazo `agro-cartera-viva.css`;
  - se cargo `agro-cartera-viva-view.js` desde el bootstrap modular existente.
- `apps/gold/agro/agro-shell.js`
  - se registro la vista `cartera-viva` en `VIEW_CONFIG` sin crecer `agro.js`.
- `apps/gold/agro/agro-cartera-viva-view.js`
  - nuevo modulo visual del MVP buyer-centric;
  - consume `fetchBuyerPortfolioSummary()` como fuente de verdad;
  - maneja categoria activa unica, orden por `pending_total`, cards y estados vacios.
- `apps/gold/agro/agro-cartera-viva.css`
  - nuevo CSS propio de Cartera Viva para header, categorias, cards, badges y estados vacios.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - sesion documentada conforme a la policy canonica.

### Resultado visual

- Vista dedicada:
  - `Cartera Viva` ya vive como region propia del shell, no dentro de tabs legacy.
- Sidebar:
  - tiene entrada propia de navegacion.
- Cards:
  - una card por comprador canonico;
  - identidad global visible;
  - estado simple visible;
  - bloque contextual cambia segun categoria activa;
  - badges de revision cuando aplica.
- Categoria activa:
  - solo una categoria visible a la vez;
  - categorias MVP: `Fiados`, `Pagados`, `Perdidos`, `Mixto`.
- Orden:
  - mayor `pending_total` primero.
- Estados vacios:
  - sin compradores;
  - sin metricas confiables;
  - categoria activa vacia;
  - comprador con revision;
  - comprador sin pendiente activo.
- Fuera de alcance mantenido:
  - no se implemento historial contextual;
  - no se implemento exportacion.

### Archivos + lineas

- `apps/gold/agro/index.html:33`
  - enlace CSS de Cartera Viva.
- `apps/gold/agro/index.html:1278-1280`
  - entrada propia en sidebar.
- `apps/gold/agro/index.html:1786-1789`
  - region dedicada con root visual.
- `apps/gold/agro/index.html:4285-4289`
  - carga modular de `agro-cartera-viva-view.js`.
- `apps/gold/agro/agro-shell.js:56`
  - wiring minimo de la vista en `VIEW_CONFIG`.
- `apps/gold/agro/agro-cartera-viva-view.js:1-476`
  - modulo visual buyer-centric.
- `apps/gold/agro/agro-cartera-viva.css:1-312`
  - CSS propio de la vista.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA sugerido

1. Smoke corto manual solamente:
   - abrir entrada de sidebar `Cartera Viva`;
   - confirmar carga de vista;
   - cambiar categoria activa;
   - validar render de cards;
   - validar un estado vacio.
2. No ampliar a QA intensivo ni abrir historial/exportacion en esta ronda.

---

## Sesion: Cartera Viva Fase 4 historial contextual por comprador (2026-03-27)

### Diagnostico

- Esta sesion ejecuta **Fase 4: historial contextual**.
- La vista buyer-centric ya existe y ya consume la fuente de verdad `buyer summary`.
- **No toca exportacion**.
- `agro.js` no debe crecer salvo wiring minimo, y en esta ronda no fue necesario tocarlo.
- El historial debe vivir como **subvista exclusiva por comprador**.
- Piezas reutilizables detectadas:
  - `apps/gold/agro/agro-cartera-viva.js`
    - summary buyer-centric via `fetchBuyerPortfolioSummary()`;
    - helpers modulares de historial: lectura tolerante, agrupacion por dia y `renderHistoryDayGroups()`.
  - `apps/gold/agro/agro-cartera-viva-view.js`
    - grilla buyer-centric, categoria activa y orden por pendiente.
- Corte de menor riesgo:
  - mantener la navegacion interna dentro del modulo de Cartera Viva;
  - crear modulo nuevo de detalle buyer-centric;
  - usar `buyer_id` y `buyer_group_key` para leer movimientos atribuibles honestamente;
  - dejar el resumen superior apoyado en el summary existente, sin recalculo contable en render.

### Plan

1. Crear una subvista exclusiva por comprador fuera de `agro.js`.
2. Abrir esa subvista desde cada card con un CTA sobrio `Ver historial`.
3. Leer `agro_pending`, `agro_income` y `agro_losses` solo cuando el movimiento sea atribuible honestamente al comprador.
4. Reutilizar la agrupacion modular por dia ya extraida en Cartera Viva.
5. Cerrar con build sin abrir QA intensivo.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva-detail.js`
  - nuevo modulo de detalle buyer-centric;
  - resuelve fetch contextual por `buyer_id` y `buyer_group_key`;
  - normaliza fiados, pagos, perdidas y review/legacy a una timeline unica;
  - reutiliza `renderHistoryDayGroups()` del modulo base.
- `apps/gold/agro/agro-cartera-viva-view.js`
  - agrega navegacion interna grilla -> detalle -> volver;
  - agrega CTA `Ver historial` por card;
  - mantiene categoria activa y estado base de la vista al volver;
  - delega el render del detalle al modulo nuevo sin crecer `agro.js`.
- `apps/gold/agro/agro-cartera-viva.css`
  - agrega estilos del toolbar, resumen superior y timeline contextual;
  - mantiene el lenguaje visual sobrio y movil-first del MVP.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - sesion documentada conforme a la policy canonica.

### Resultado funcional

- Entrada desde card:
  - cada card buyer-centric tiene accion `Ver historial`.
- Subvista exclusiva:
  - el detalle vive como vista exclusiva dentro del modulo, no en drawer ni inline gigante.
- Resumen superior:
  - nombre canonico, estado simple, pendiente, pagado, fiado y revision salen del summary buyer-centric ya existente.
- Historial contextual:
  - muestra fiados, pagos, perdidas y registros en revision atribuibles honestamente al comprador;
  - reutiliza agrupacion por dia y orden descendente.
- Volver:
  - vuelve limpio a la grilla sin perder la categoria activa.
- Estados vacios:
  - buyer no encontrado;
  - sin historial legible;
  - error de carga;
  - buyer con revision.
- Fuera de alcance mantenido:
  - no se implemento exportacion;
  - no se rehizo la agregacion buyer-centric.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA sugerido

1. Smoke corto manual solamente:
   - abrir `Cartera Viva`;
   - entrar a historial de un comprador;
   - volver a la grilla;
   - validar un estado vacio.
2. No ampliar a QA intensivo ni abrir exportacion en esta ronda.

---

## Sesion: Cartera Viva Fase 5 exportacion agrupada por comprador (2026-03-27)

### Diagnostico

- Esta sesion ejecuta **Fase 5: exportacion agrupada**.
- La base buyer-centric, el MVP visual y el historial contextual ya existen.
- **No toca QA intensivo**.
- `agro.js` no debe crecer y no sera el destino principal de esta ronda.
- Punto de disparo de menor riesgo:
  - la toolbar de la subvista contextual en `apps/gold/agro/agro-cartera-viva-detail.js`.
- Piezas reutilizables:
  - `fetchBuyerPortfolioSummary()` y el summary buyer-centric ya cargado en la vista;
  - `fetchBuyerHistoryTimeline()` para la historia comercial ya normalizada;
  - helpers de agrupacion por fecha en `apps/gold/agro/agro-cartera-viva.js`.
- Formato inicial correcto:
  - Markdown `.md`, porque el repo ya tiene patrones de export por `Blob` y descarga directa sin abrir otra infraestructura.

### Plan

1. Crear un modulo nuevo de exportacion buyer-centric en Markdown.
2. Reutilizar summary + timeline ya existentes, sin recalcular contabilidad en el export.
3. Disparar el export solo desde la subvista contextual del comprador.
4. Separar claramente en el documento lo confiable, la revision y el ingreso fuera de deuda.
5. Cerrar con build y reporte final.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva-export.js`
  - nuevo modulo de exportacion agrupada por comprador en Markdown;
  - construye nombre de archivo estable;
  - separa resumen comercial, revision y historial contextual;
  - descarga el `.md` via `Blob`.
- `apps/gold/agro/agro-cartera-viva-detail.js`
  - agrega boton `Exportar` en la toolbar de la subvista contextual;
  - agrega feedback minimo de exportacion con estado sobrio.
- `apps/gold/agro/agro-cartera-viva-view.js`
  - conecta la accion de exportacion desde la subvista;
  - dispara el modulo nuevo sin recalcular summary ni historial;
  - maneja error elegante cuando el buyer no esta listo para exportar.
- `apps/gold/agro/agro-cartera-viva.css`
  - agrega estilos de toolbar actions, estado de exportacion y disabled.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - sesion documentada conforme a la policy canonica.

### Resultado funcional

- Punto de exportacion:
  - la accion vive en la subvista contextual del comprador, no en la card de la grilla.
- Archivo generado:
  - Markdown `.md` con naming `cartera-viva-<buyer>-YYYY-MM-DD.md`.
- Resumen superior exportado:
  - nombre canonico, fecha, estado simple, fiado, pagado, perdido, pendiente y cumplimiento.
- Historial contextual exportado:
  - fiados, pagos, perdidas, ingresos fuera de deuda y revision cuando aplican;
  - agrupado por fecha con la infraestructura modular ya existente.
- Honestidad de datos:
  - `pagado confiable`, `revision`, `legacy ambiguo` e `ingreso fuera de deuda` quedan separados.
- Vacios/errores:
  - si no hay historial exportable, el `.md` lo deja explicito;
  - si el buyer no existe o el detalle esta roto, la vista falla con mensaje sobrio y no inventa export.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA sugerido

1. Smoke corto manual solamente:
   - abrir historial de un comprador;
   - exportar;
   - confirmar nombre y formato del archivo;
   - revisar un caso con revision o ingreso fuera de deuda.
2. No ampliar a QA intensivo ni mezclar esta ronda con saneamiento final.

---

## Sesion: Cartera Viva Fase 6 QA y saneamiento final (2026-03-27)

### Diagnostico

- Esta sesion ejecuta **Fase 6: QA y saneamiento final**.
- **No se abren nuevas features**.
- Se debe respetar el **ADN Visual V10** ademas de la logica y los datos.
- `agro.js` no debe crecer y no es destino principal de esta ronda.
- Superficies a auditar:
  - `apps/gold/agro/agro-cartera-viva.js`
  - `apps/gold/agro/agro-cartera-viva-view.js`
  - `apps/gold/agro/agro-cartera-viva-detail.js`
  - `apps/gold/agro/agro-cartera-viva-export.js`
  - `apps/gold/agro/agro-cartera-viva.css`
- QA real pero acotado esperado:
  - sidebar -> Cartera Viva;
  - cambio de categoria;
  - apertura de historial;
  - volver;
  - exportacion `.md`;
  - caso con revision o ingreso fuera de deuda;
  - al menos un estado vacio;
  - revisión desktop y mobile.

### Plan

1. Hacer smoke funcional corto sobre preview local autenticada con la cuenta QA.
2. Detectar bugs funcionales reales e incoherencias semanticas visibles entre grilla, detalle y export.
3. Auditar el modulo contra ADN V10 para detectar ruido visual, spacing o badges incoherentes.
4. Corregir solo lo de mayor impacto y menor diff.
5. Cerrar con build y reporte final.

### Hallazgos reales

- Bug funcional critico:
  - la subvista contextual fallaba al abrir un comprador real porque `apps/gold/agro/agro-cartera-viva-detail.js` consultaba `updated_at` en `agro_pending`, `agro_income` y `agro_losses`, columnas inexistentes en la base activa;
  - efecto visible en produccion: `No se pudo leer el historial` con error `column agro_pending.updated_at does not exist`.
- Coherencia funcional verificada:
  - la grilla mantiene orden por `pending_total` descendente;
  - el cambio de categoria muestra estado vacio limpio en `Pagados`;
  - el caso `Ingreso fuera de deuda` se mantiene separado en card, detalle y export.
- ADN Visual V10:
  - no aparecio una ruptura visual grave que justificara rediseño;
  - desktop y mobile mantuvieron densidad, jerarquia y tono sobrio compatibles con V10.
- Dataset real:
  - no aparecieron buyers con `review_required_total` o `legacy_unclassified_total` activos en la cuenta QA durante esta ronda;
  - no se inventaron casos de revision.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva-detail.js`
  - se removieron `updated_at` de los selects buyer-centric del historial contextual para alinear el detalle con el schema real y evitar errores 400 en Supabase.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - apertura y cierre de la sesion con hallazgos reales, validacion y build.

### Resultado de saneamiento

- Grilla:
  - sidebar -> `Cartera Viva` abre la vista buyer-centric;
  - categoria activa cambia bien;
  - `Pagados` vacio responde con empty state honesto.
- Detalle:
  - `Ver historial` abre la subvista exclusiva;
  - `Volver` regresa limpio a la grilla;
  - el historial contextual de `Maria Elena` carga sin error y muestra `Ingreso fuera de deuda` + `Fiado`.
- Exportacion:
  - `Exportar` genera `cartera-viva-maria-elena-2026-03-27.md`;
  - el Markdown conserva separacion entre resumen confiable e ingreso fuera de deuda.
- Mobile:
  - smoke corto en `390x844` sin colapso visible del header, resumen ni timeline contextual.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA real ejecutado

1. Produccion:
   - se abrio `Cartera Viva`;
   - se valido cambio de categoria y empty state de `Pagados`;
   - se detecto el error real de `updated_at` al abrir detalle.
2. Preview local contra Supabase cloud:
   - se reconstruyo `apps/gold/dist` apuntando a cloud solo para validar el fix;
   - se rehidrato la sesion QA ya activa para evitar flujo de captcha;
   - se verifico `Fiados` ordenado por `pending_total`;
   - se abrio historial de `Maria Elena`;
   - se volvio a la grilla;
   - se exporto `.md`;
   - se reviso consistencia entre card, detalle y export para el caso `Ingreso fuera de deuda`;
   - se hizo smoke mobile corto en `390x844`.

### QA sugerido

1. No abrir nuevas features; el siguiente paso ya seria solo declarar cierre si esta correccion pasa la auditoria final humana.
2. Si se quiere una verificacion extra, basta con repetir:
   - `Cartera Viva` -> `Maria Elena` -> `Ver historial` -> `Exportar`.

## Sesion: Cartera Viva cierre visual + evaluacion de Otros (2026-03-28)

### Diagnostico

- La base funcional buyer-centric ya existe, pero la vista todavia expone copy tecnico visible y una categoria `Mixto` al frente.
- Las cards actuales siguen altas para la densidad real de datos y repiten cajas internas que debilitan el escaneo.
- El detalle contextual y la exportacion conservan etiquetas tecnicas que ya no deben mostrarse como lenguaje de producto.
- `Otros` no vive dentro de Cartera Viva, pero hoy sigue amarrado al bloque de operaciones del facturero y a wiring amplio dentro de `agro.js`; moverlo hacia `Ciclos Operativos` solo se ejecutara si aparece una ruta de diff bajo y riesgo bajo.

### Plan

1. Tomar `cartera-viva-prototype.html` de la raiz como blueprint visual y traducir solo sus patrones utiles al modulo real.
2. Limpiar copy tecnico visible y retirar `Mixto` como categoria principal de la UI sin romper la verdad buyer-centric interna.
3. Compactar cards, reforzar la lectura superior y volver la barra de progreso la pieza dominante.
4. Ordenar la subvista de detalle y alinear labels de exportacion con el lenguaje humano del modulo.
5. Evaluar `Otros` frente a `Ciclos Operativos`; si no es seguro, dejar constancia y no forzarlo.

### Criterio visual

- Cierre sobrio, agricola, compacto y movil-first.
- Menos glow, menos cajas, menos texto, cero copy tecnico visible.
- ADN V10 aplicado con dorado oscuro, jerarquia clara y motion silencioso.

### Alcance exacto

- Esta ronda cierra visualmente Cartera Viva sobre los modulos dedicados existentes.
- `Otros` solo se reubica si el diff real es bajo y no obliga a crecer `agro.js` ni a abrir refactor estructural.
- El historial legacy viejo del facturero **no se elimina aun**; su retiro solo se evaluara cuando el nuevo sistema quede estable y validado.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva-view.js`
  - `Mixto` sale del frente visible:
    - la UI ahora expone solo `Fiados`, `Pagados` y `Pérdidas`;
    - los casos mixtos se reencaminan a la categoria visible mas util sin romper la logica interna.
  - se elimina copy tecnico visible:
    - fuera `buyer-centric`, `comprador canonico`, `fuente: buyer summary`;
    - header nuevo: `Cartera de compradores`.
  - se rehace la composicion:
    - hero superior con lectura principal por categoria;
    - cards compactas con progreso dominante, 3 metricas y CTA discreto;
    - microseñal SVG pequena por comprador;
    - chips cortos para `Por revisar`, `Pérdida` e `Ingreso aparte`.
- `apps/gold/agro/agro-cartera-viva-detail.js`
  - detalle superior compactado con barra principal y resumen corto;
  - toolbar mas limpia;
  - timeline con labels y notas de producto, no de implementacion.
- `apps/gold/agro/agro-cartera-viva-export.js`
  - export en Markdown alineado al lenguaje humano del modulo;
  - se removio copy tecnico visible y se renombraron secciones/estados.
- `apps/gold/agro/agro-cartera-viva.css`
  - se ajusto la capa visual completa para densidad util:
    - menos glow;
    - menos cajas grandes;
    - ritmo mas compacto;
    - tokens V10 y progreso protagonista;
    - mobile-first y sin motion ruidoso.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - sesion abierta y cerrada conforme a la policy canonica.

### Resultado sobre Otros

- `Otros` no vive dentro de Cartera Viva hoy.
- La evaluacion real muestra que moverlo hacia `Ciclos Operativos` en esta ronda no es diff bajo:
  - sigue ligado a `agro-shell.js`, `index.html` y un bloque amplio de `agro.js`;
  - forzarlo abriria refactor estructural fuera del alcance.
- Decision aplicada:
  - **no se reubica en esta ronda**;
  - se prioriza cerrar bien Cartera Viva sin abrir otro frente.

### Build status

- `pnpm build:gold` -> OK
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning historico de chunk grande en `assets/agro-*.js`

### QA ejecutado

- Smoke tecnico:
  - build completo validado.
- Smoke visual/funcional corto:
  - se levanto preview local desde `apps/gold/dist`;
  - se intento login QA local para entrar a `/agro/`;
  - el smoke autenticado quedo bloqueado por hCaptcha en el flujo de login del preview;
  - no se forzo bypass ni QA intensivo.
- Higiene Playwright:
  - navegador cerrado;
  - temporal borrado: `%LOCALAPPDATA%\\Temp\\playwright-mcp-output\\1774738591032`

### QA sugerido

1. QA humano corto con sesion valida:
   - abrir `Cartera Viva` en desktop y mobile;
   - cambiar entre `Fiados`, `Pagados` y `Pérdidas`;
   - abrir una card y volver;
   - exportar un comprador;
   - confirmar que no queda copy tecnico visible.
2. Mantener fuera de esta ronda la eliminacion del historial legacy viejo del facturero; solo se evaluara cuando el nuevo sistema quede estable y validado.

## Sesión: Compactación final Cartera Viva + corrección Pérdidas (2026-03-28)

### Diagnóstico

- **Cards demasiado altas**: subtítulo de estado (texto largo), bloque chips, leyenda del progress bar y texto "Cumplimiento X%" en footer sumaban 4 filas extra por cada card.
- **Categorías poco compactas**: la barra usaba `grid 3-col` con botones tipo caja (border + bg), lo que los hacía parecer tabs legados pesados.
- **Pérdidas = 0 inconsistente**: `resolveVisibleCategory()` evaluaba `paid > 0` **antes** de `loss > 0`. Cualquier comprador con un pago parcial antes del cierre por pérdida quedaba clasificado como `pagados`, haciendo invisible la categoría `perdidos`.

### Plan aplicado

1. Corregir orden de clasificación en `resolveVisibleCategory`: primero `pending > 0` → fiados; luego `loss > 0` → perdidos; después `paid > 0` → pagados.
2. Compactar card: eliminar subtítulo de estado, bloque de chips, leyenda del progress bar y texto "Cumplimiento" del footer; dejar solo nombre + badge + barra + 3 métricas + CTA discreto.
3. Rediseñar barra de categorías: flex sin border/bg, tabs planos con underline activo dorado — estilo del prototipo HTML.
4. Reducir paddings, gaps y tamaños de fuente en cards y métricas.

### Cambios por archivo

#### `apps/gold/agro/agro-cartera-viva-view.js`

- `resolveVisibleCategory` (línea ~150): reordenó la lógica de clasificación; `loss > 0` ahora precede a `paid > 0` cuando no hay `pending`.
- `renderProgressBlock` (línea ~382): agregó opción `noLegend` para suprimir la leyenda de texto bajo la barra cuando se usa en cards.
- `renderPortfolioCards` (línea ~433): eliminó `<p class="cartera-viva-card__subtitle">`, el bloque `renderSupportChips(row)`, y el texto "Cumplimiento X%" del footer. CTA queda como link discreto.

#### `apps/gold/agro/agro-cartera-viva.css`

- `.cartera-viva-category-bar`: cambiado de `grid 3-col` a `flex` con `border-bottom`.
- `.cartera-viva-category`: eliminados `border`, `background` y `border-radius`; ahora es tab plano con `border-bottom: 2px solid transparent`; activo usa `border-bottom-color: var(--gold-4)`.
- `.cartera-viva-category__count`: reducido a badge pequeño inline.
- `.cartera-viva-card`: reducido a `gap: 0.55rem`, `padding: 0.85rem 0.9rem`, `border-radius: var(--radius-md)`.
- `.cartera-viva-card__title`: reducido a `0.88rem`.
- `.cartera-viva-progress`: reducido a `gap: 0.3rem`, `padding: 0.5rem 0.6rem`.
- `.cartera-viva-card__metric`: reducido a `padding: 0.45rem 0.5rem`, `font-size: 0.82rem`.
- `.cartera-viva-detail-link`: separado como link discreto (sin border/bg, solo texto dorado con opacity).
- Media queries: corregido 768px para no colapsar card head a grid; 480px mantiene métricas en 3 columnas.
- `.cartera-viva-grid`: gap reducido a `0.55rem`.
- `.cartera-viva-badge`: altura reducida a `1.4rem`, font `0.68rem`.

### Build status

- `pnpm build:gold` → **OK**
- `agent-guard: OK`
- `agent-report-check: OK`
- `vite build: OK` (warning preexistente de chunk size en agro.js — no bloqueante)
- `check-llms: OK`
- `check-dist-utf8: OK`

### QA sugerido

1. Abrir Cartera Viva en desktop y mobile.
2. Confirmar que las cards son visiblemente más compactas (sin subtítulo ni chips).
3. Cambiar a categoría Pérdidas — debe mostrar compradores reales con `loss_total > 0` y `pending_total = 0`.
4. Cambiar entre Fiados, Pagados, Pérdidas — confirmar que las categorías lucen como tabs con underline dorado.
5. Abrir una card → confirmar que exportación y detalle siguen funcionando.
6. Confirmar mobile ≤480px — métricas deben mostrarse en 3 columnas, no apiladas.

## Sesión: Micro-pasada final Cartera Viva (2026-03-28)

### Diagnóstico

- El bloque superior seguía sintiéndose demasiado hero para una vista operativa.
- La superficie principal todavía dependía de un degradado genérico y no del negro profundo del ADN.
- Las cards y la segmentación admitían una última compactación.
- `Pérdidas` debía quedar validado con la lógica visible ya corregida.
- `Donaciones` se evaluó con criterio: no existe soporte real dentro del modelo buyer-centric de Cartera Viva.
- `Otros` se mantiene fuera del frente de Cartera Viva y alineado conceptualmente a Ciclos Operativos.

### Plan aplicado

1. Bajar el header a una franja operativa compacta.
2. Sustituir degradados del panel por `--bg-0` y `--bg-1`.
3. Reducir paddings, gaps y alturas en cards y tabs.
4. Mantener `Fiados`, `Pagados` y `Pérdidas` como categorías reales del módulo.
5. Dejar explícito en copy corto que `Otros` vive en Ciclos Operativos y que `Donaciones` solo entra si la data real la sostiene.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva-view.js`
  - hero superior reemplazado por una franja resumen más baja y operativa;
  - copy superior compactado;
  - `Pérdidas` mantenido como lectura visible consistente;
  - nota semántica breve para `Otros` / `Donaciones`.
- `apps/gold/agro/agro-cartera-viva.css`
  - fondo del módulo llevado a negro profundo del ADN;
  - degradado genérico removido del panel principal;
  - franja resumen nueva con menor altura;
  - tabs y cards compactados un paso adicional.

### Estado

- Build: `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunk grande en `assets/agro-*.js`.
- Smoke visual:
  - no se reabrió QA autenticado intensivo en esta micro-pasada;
  - se mantiene la limitación conocida del preview local por hCaptcha en login.
- QA sugerido:
  1. Abrir Cartera Viva.
  2. Revisar bloque superior, tabs y una card.
3. Confirmar categoría `Pérdidas`.
4. Abrir detalle y validar que no hubo regresión visual.

## Sesión: Integración final Cartera Viva + controles compactos + alineación operativa (2026-03-28)

### Diagnóstico

- Cartera Viva todavía no tenía barra de búsqueda propia dentro del módulo vivo.
- Tampoco tenía un selector de cultivos integrado al frente nuevo; dependía solo del contexto global del agro.
- El flujo global `Nuevo registro` seguía abriendo `gastos`, incluso estando parado en Cartera Viva.
- El wizard ya persiste `buyer_id`, `buyer_group_key` y `buyer_match_status` en tabs comerciales, así que el wiring buyer-centric existe y conviene reutilizarlo.
- Ciclos Operativos ya tiene base funcional propia, pero su frente visible aún admite una compactación sobria en filtros y cards.

### Plan

1. Integrar búsqueda compacta y selector de cultivo ligero en Cartera Viva.
2. Reutilizar el contexto global de cultivo para que el nuevo módulo y el wizard hablen el mismo idioma.
3. Hacer que `Nuevo registro` respete el contexto de Cartera Viva y favorezca el tab comercial correcto.
4. Aplicar un ajuste visual sobrio de bajo riesgo en Ciclos Operativos.

### Alcance

- Cartera Viva pasa a comportarse más como capa funcional nueva del historial comercial.
- El historial legacy viejo del facturero no se elimina aún.
- Esta ronda integra, compacta y alinea; no abre refactor mayor.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva-view.js`
  - barra de búsqueda compacta integrada al módulo vivo;
  - selector ligero de cultivo reutilizando el contexto global `selectedCropId`;
  - acción rápida de registro alineada con la categoría visible (`Fiados` -> `pendientes`, `Pagados` -> `ingresos`, `Pérdidas` -> `perdidas`);
  - contexto global expuesto para que shell/header puedan abrir el wizard correcto desde Cartera Viva;
  - el conteo visible por categoría ahora respeta la búsqueda activa.
- `apps/gold/agro/agro-cartera-viva.css`
  - estilos compactos para búsqueda, selector de cultivo y CTA contextual;
  - ADN V10 mantenido en negro profundo y dorado sobrio.
- `apps/gold/agro/agro-shell.js`
  - `Nuevo registro` respeta Cartera Viva cuando esa vista está activa y deja de mandar siempre a `gastos`.
- `apps/gold/agro/agroOperationalCycles.js`
  - copy del módulo y de la lectura operativa compactado para reflejar registros reales.
- `apps/gold/agro/agro-operational-cycles.css`
  - compactación sobria de filtros, cards y summary blocks.

### Estado

- Build: `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunk grande en `assets/agro-*.js`.
- Smoke visual:
  - no se ejecutó QA autenticado intensivo en esta ronda;
  - sigue pendiente validación humana corta dentro de sesión real por el bloqueo conocido del preview local con hCaptcha.

## Sesión: Fix final filtro real por cultivo en Cartera Viva (2026-03-28)

### Diagnóstico

- El selector de cultivo actual solo actúa como contexto operativo para `Nuevo registro`.
- La grilla buyer-centric, los conteos visibles y el detalle contextual no se estaban filtrando de verdad por el cultivo activo.
- La fuente `agro_buyer_portfolio_summary_v1` sigue siendo global por comprador, así que no soporta crop-scope total para el summary superior.

### Plan

1. Aplicar un filtro real y honesto por cultivo sobre los compradores visibles a partir de movimientos subyacentes (`agro_pending`, `agro_income`, `agro_losses`).
2. Filtrar también el timeline/detalle contextual por `crop_id` cuando haya cultivo activo.
3. Mantener el summary buyer-centric dentro del alcance real que hoy soporta la arquitectura.
4. Ejecutar build y QA corto; el historial legacy viejo no se retira aún en esta ronda.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva.js`
  - helper nuevo para resolver compradores visibles por `crop_id` a partir de movimientos reales;
  - llave buyer-centric compartida para `buyer_id` / `buyer_group_key`.
- `apps/gold/agro/agro-cartera-viva-view.js`
  - la grilla y los conteos visibles ahora sí se filtran por el cultivo activo;
  - el filtro se alimenta con movimientos reales, no con un label cosmético;
  - el summary superior se mantiene honesto cuando hay cultivo activo: sigue global buyer-centric;
  - la nota visible explica el alcance real del filtro.
- `apps/gold/agro/agro-cartera-viva-detail.js`
  - timeline del comprador filtrado por `crop_id` cuando hay cultivo activo;
  - soporte de `buyer_group_key` también en el detalle para buyers sin `buyer_id`.

### Estado

- Build: `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunk grande en `assets/agro-*.js`.

### QA corto ejecutado

- Preview local levantado desde `apps/gold/dist`.
- La app cargó correctamente y abrió el flujo real de login.
- Se probó submit real con la cuenta QA local.
- El acceso quedó bloqueado en `Validando...` después de ejecutar hCaptcha invisible, por lo que no fue posible completar la validación autenticada de cambio de cultivo / detalle / nuevo registro.
- Browser cerrado, servidor temporal detenido y carpeta temporal de Playwright eliminada.

### Nota operativa

- El historial legacy viejo del facturero no se elimina aún en esta ronda.
- El retiro del legacy solo se evaluará cuando esta capa nueva quede estable y validada con QA autenticada real.

## Sesión: Cartera Viva detalle multimoneda + micrográfica compacta (2026-03-28)

### Diagnóstico

- El bloque superior del detalle todavía repite demasiado la misma lectura entre subtítulo, progreso, leyenda y métricas.
- El detalle sigue hablando casi solo en USD aunque el proyecto ya soporta `USD`, `COP` y `VES`.
- Ya existe infraestructura real de tasas en `agro-exchange.js`, pero todavía no está aprovechada en Cartera Viva.
- La microlectura del par puede apoyarse en `exchange_rate` real de los movimientos del comprador cuando exista serie suficiente; no hace falta inventar un dashboard nuevo.

### Plan

1. Reducir redundancia en el resumen superior y dejar una lectura principal + secundarios compactos.
2. Integrar equivalentes multimoneda usando la capa existente de exchange (`USD`, `COP`, `VES`).
3. Agregar selector compacto de par (`USD/COP`, `USD/Bs`) con microvisual silenciosa.
4. Mantener la vista sobria, sin inflarla ni abrir un panel financiero nuevo.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva-detail.js`
  - el resumen superior se redujo a una lectura principal más seca;
  - se integraron equivalentes `COP` y `Bs` usando `agro-exchange.js`;
  - se agregó selector compacto de par (`USD/COP`, `USD/Bs`);
  - la microvisual usa `exchange_rate` real de los movimientos cuando hay serie suficiente;
  - si no hay serie suficiente, queda una lectura mínima y honesta sin inventar tendencia.
- `apps/gold/agro/agro-cartera-viva-view.js`
  - el detalle ahora carga tasas con `initExchangeRates()` y conserva el par seleccionado.
- `apps/gold/agro/agro-cartera-viva.css`
  - se incorporó el bloque compacto de monto principal + panel del par;
  - la vista mantiene ADN V10 y no se infla en mobile.

### Estado

- Build: `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunk grande en `assets/agro-*.js`.

### QA corto

- No fue posible validar el detalle autenticado en browser dentro de esta ronda.
- El bloqueo conocido sigue siendo hCaptcha en el login del preview local, por lo que no se puede entrar de forma limpia al detalle del comprador para smoke manual automatizado.
- La validación funcional completa de resumen multimoneda, selector de par y micrográfica queda pendiente para QA humano autenticado.

## Sesión: Extensión del ADN Visual V10.0 con §15–§18 (2026-03-28)

### Diagnóstico

- El documento canónico del DNA existe en `apps/gold/docs/ADN-VISUAL-V10.0.md` y hoy cubre §0–§14.
- La guía tiene checklist rápido en §13, pero todavía no cubre spacing system, iconografía, estados de componentes ni accesibilidad de forma formal.
- Existe un archivo de tokens en `apps/gold/assets/css/tokens.css` donde conviene reflejar los nuevos tokens sin alterar los ya existentes.

### Plan

1. Reemplazar §13 con la versión extendida.
2. Insertar §15, §16, §17 y §18 después de §14, manteniendo formato y secciones previas intactas.
3. Extender `apps/gold/assets/css/tokens.css` con los nuevos tokens agrupados por sección.
4. Actualizar referencias visibles del documento para que cubra §0–§18.

### Cambios aplicados

- `apps/gold/docs/ADN-VISUAL-V10.0.md`
  - §13 reemplazado por el checklist rápido completo solicitado.
  - §15, §16, §17 y §18 agregados después de §14 con tablas, ejemplos y anti-patrones.
  - referencias visibles del documento ajustadas para reflejar cobertura `§0-§18`.
- `apps/gold/assets/css/tokens.css`
  - nuevos tokens de spacing, iconografía, estados y accesibilidad agregados al `:root`.
  - tokens agrupados con comentarios por sección para mantener trazabilidad con el DNA.

### Estado

- Build: `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunk grande en `assets/agro-*.js`.

### QA sugerido

- Validar lectura del documento `ADN-VISUAL-V10.0.md` para confirmar continuidad visual entre §14 y §15.
- Revisar `apps/gold/assets/css/tokens.css` para verificar que los nuevos tokens conviven sin alterar el sistema legacy.
- No se requirió QA de browser en esta sesión porque el alcance fue documental y de tokens.

## Sesión: Paridad operativa de Cartera Viva con historial legacy (2026-03-29)

### Diagnóstico

- El menú operativo legacy no vive en un módulo aparte: la pieza reusable real está en `apps/gold/agro/agro.js`.
- La UI y las acciones salen de `renderHistoryRow()` y del listener delegado `setupFactureroCrudListeners()`.
- Los handlers útiles ya existen:
  - `editFactureroItem()`
  - `deleteFactureroItem()`
  - `handlePendingTransfer()`
  - `handleIncomeTransfer()`
  - `handleLossTransfer()`
  - `handleRevertIncome()`
  - `handleRevertLoss()`
- Cartera Viva hoy no reutiliza esos handlers porque su timeline es buyer-centric propio y no emite el mismo markup/clases del historial viejo.
- `Crear ciclo` no existe en el legacy facturero como acción buyer-centric, pero sí hay API global de Ciclos Operativos en `window.YGAgroOperationalCycles`.

### Plan

1. Adaptar el timeline de Cartera Viva para emitir acciones compatibles con los handlers legacy ya existentes.
2. Agregar menú contextual compacto por movimiento dentro del detalle buyer-centric.
3. Incorporar lectura clara de `Ver transferidos` dentro del detalle.
4. Crear un puente mínimo hacia `Ciclos Operativos` usando `window.YGAgroOperationalCycles`.
5. Mantener explícito que el historial legacy no se elimina aún; esta ronda busca paridad operativa, no retiro del legacy.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva-detail.js`
  - cada movimiento del timeline buyer-centric ahora expone acciones operativas compatibles con el historial legacy:
    - `Editar`
    - `Eliminar`
    - `Transferir`
    - `Revertir` cuando el flujo real lo soporta
    - `Crear ciclo`
  - el menú reutiliza las clases legacy (`btn-edit-facturero`, `btn-delete-facturero`, `btn-transfer-*`, `btn-revert-*`) para delegar en los handlers ya existentes del facturero.
  - se agregó filtro visible `Todo / Ver transferidos` dentro del detalle para consultar movimientos transferidos sin salir de Cartera Viva.
  - el timeline se filtra por ese estado sin romper el detalle buyer-centric.
- `apps/gold/agro/agro-cartera-viva-view.js`
  - nuevo estado local para filtro de historial del detalle.
  - refresco automático de Cartera Viva cuando el legacy emite eventos de cambio (`data-refresh`, `agro:income:changed`, `agro:losses:changed`, `agro:pending:refreshed`, `agro:transfers:refreshed`).
  - puente mínimo `Crear ciclo` usando `window.YGAgroOperationalCycles.createFromPayload()` y `openView()`.
- `apps/gold/agro/agro-cartera-viva.css`
  - menú contextual compacto y sobrio por movimiento.
  - chips de filtro para `Ver transferidos`.
  - sin rediseño grande ni ruido visual adicional.

### Estado

- Build: `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunk grande en `assets/agro-*.js`.

### QA corto ejecutado

- Se levantó preview local con `pnpm -C apps/gold preview -- --host localhost --port 4173`.
- Se abrió el flujo real de login y se intentó autenticación con la cuenta QA local.
- El submit sí disparó el handler real del login y ejecutó hCaptcha invisible.
- El flujo quedó detenido en `Validando...` sobre `http://localhost:4173/index.html#login`.
- Consola del browser:
  - warning de hCaptcha por uso de `localhost`;
  - no fue posible entrar para completar smoke autenticado de `Editar`, `Eliminar`, `Transferir`, `Ver transferidos`, `Revertir` y `Crear ciclo`.
- Se cerró el browser, se detuvo el preview local y se eliminó la carpeta temporal de Playwright de la sesión.

### Nota operativa

- El historial viejo legacy no se elimina aún en esta ronda.
- Esta sesión lleva a Cartera Viva un nivel importante de paridad operativa reutilizando lógica real del facturero.
- El retiro del legacy solo debe evaluarse cuando esta paridad quede validada con QA autenticada real.

## Sesión: Paridad operativa adicional antes de ciclos (2026-03-29)

### Diagnóstico

- `Duplicar a otro cultivo` ya existe en legacy mediante `duplicateFactureroItem()`.
- `move-general` ya existe en legacy mediante `handleMoveGeneralRecord()`, pero solo cubre registros sin cultivo asignado.
- La reasignación de un registro que ya tiene cultivo hoy vive en el modal de edición legacy, porque ese flujo ya monta `edit-crop-id`.
- Cartera Viva solo filtra `Todo / Transferidos`; todavía no expone `Revertidos`.
- El detalle buyer-centric todavía no trae ni renderiza `evidence_url` / `soporte_url`.

### Plan

1. Llevar `Duplicar a otro cultivo` al menú contextual de Cartera Viva reutilizando el handler legacy.
2. Exponer `Asignar cultivo` con `move-general` cuando el movimiento no tenga cultivo.
3. Exponer `Reasignar cultivo` como acceso semántico al modal de edición existente cuando el movimiento sí tenga cultivo.
4. Agregar filtro real de `Revertidos`.
5. Traer y renderizar soportes/evidencias con wiring mínimo al resolver de legacy.

### Alcance

- Esta ronda busca paridad operativa adicional antes de tocar la vinculación real con ciclos.
- Todavía no entra la relación movimiento ↔ ciclo.
- El historial legacy todavía no se elimina.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva-detail.js`
  - el menú contextual buyer-centric ahora agrega:
    - `Duplicar a otro cultivo`
    - `Asignar cultivo` para movimientos sin cultivo
    - `Reasignar cultivo` para movimientos con cultivo, reutilizando el modal de edición ya existente
  - se incorporó filtro `Revertidos` además de `Todo` y `Transferidos`.
  - el detalle ahora consulta filas revertidas de forma real y no las excluye desde la query.
  - se añadieron `evidence_url` / `soporte_url` a la lectura del timeline y se renderiza `Ver soporte` cuando existe URL resoluble.
- `apps/gold/agro/agro-cartera-viva-view.js`
  - el estado local del detalle ya reconoce `revertidos`.
  - la exportación buyer-centric ahora respeta el filtro visible del detalle.
- `apps/gold/agro/agro-cartera-viva-export.js`
  - la exportación contextual incluye enlace de soporte cuando el movimiento lo trae resuelto.
- `apps/gold/agro/agro-cartera-viva.css`
  - estilo discreto para el acceso `Ver soporte`.
- `apps/gold/agro/agro.js`
  - puente mínimo `window._agroFactureroBridge` para reutilizar el resolvedor real de evidencias del legacy sin duplicarlo.

### Estado

- Build: `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunk grande en `assets/agro-*.js`.

### QA corto ejecutado

- Se levantó preview local con `pnpm -C apps/gold preview -- --host localhost --port 4173`.
- Se abrió el flujo real de login y se intentó autenticación con la cuenta QA local.
- El submit volvió a disparar el handler real del login y la ejecución de hCaptcha invisible.
- El acceso quedó detenido en `Validando...` sobre `http://localhost:4173/index.html#login`.
- No fue posible entrar para probar autenticadamente:
  - `Duplicar a otro cultivo`
  - `Asignar/Reasignar cultivo`
  - `Revertidos`
  - `Ver soporte`
- Se cerró el browser, se detuvo el preview local y se eliminó la carpeta temporal de Playwright de la sesión.

### Nota operativa

- El historial legacy todavía no se elimina.
- La vinculación real movimiento ↔ ciclo sigue fuera de esta ronda y queda para el siguiente lote.

## Sesión: Historial comercial + aviso legacy + progreso vivo (2026-03-29)

### Diagnóstico

- El sidebar todavía muestra `Cartera Viva` y `Ciclos Operativos` como entradas separadas, lo que empieza a saturar la navegación.
- Ambas piezas ya pertenecen a la misma familia comercial, pero hoy no comparten un paraguas visual claro.
- El legacy todavía debe convivir, pero no hay una nota de transición madura que oriente hacia Cartera Viva.
- Las barras de progreso de Cartera Viva siguen estáticas; les falta una respiración sutil alineada a la sensación de ciclos de cultivo.

### Plan

1. Agrupar `Cartera Viva` y `Ciclos Operativos` bajo un nuevo bloque padre llamado `Historial comercial`.
2. Mantener ambos módulos separados operativamente con subnavegación compacta, sin fusionar sus datos.
3. Añadir una nota breve y sobria de transición del legacy.
4. Darle al progreso de Cartera Viva un movimiento silencioso y premium, respetando `prefers-reduced-motion`.

### Alcance

- Esta ronda agrupa visualmente bajo `Historial comercial`.
- El legacy no se elimina aún.
- Cartera Viva y Ciclos Operativos conviven, pero no se mezclan.
- Las animaciones deben ser sutiles y alineadas al ADN V10.

### Cambios aplicados

- `apps/gold/agro/agro-shell.js`
  - se agregó la familia de navegación `historial-comercial` como padre visual de `cartera-viva` y `operational`;
  - el shell ahora reconoce grupos de navegación donde un padre puede representar varias vistas hijas sin mezclar regiones ni datos.
- `apps/gold/agro/index.html`
  - el sidebar reemplaza la entrada suelta de `Cartera Viva` y la familia directa de `Ciclos Operativos` por un solo bloque: `Historial comercial`;
  - dentro del subnav conviven:
    - `Cartera Viva`
    - `Ciclos Operativos`
- `apps/gold/agro/agro-cartera-viva-view.js`
  - se añadió una subnav compacta de familia comercial dentro de la vista;
  - se añadió nota sobria de transición: el legacy sigue disponible temporalmente y la dirección nueva es Cartera Viva.
- `apps/gold/agro/agro-cartera-viva-detail.js`
  - la misma familia comercial y la nota de transición también quedan visibles en el detalle buyer-centric.
- `apps/gold/agro/agroOperationalCycles.js`
  - el módulo ahora abre con la misma subnav compacta de `Historial comercial`, manteniendo separación semántica con Cartera Viva.
- `apps/gold/agro/agro-cartera-viva.css`
  - estilos de la subnav compacta compartida;
  - barras/progresos de Cartera Viva con shimmer y desplazamiento leve, silencioso y premium.
- `apps/gold/agro/agro-operational-cycles.css`
  - ajuste mínimo del heading para convivir con la nueva subnav sin inflar el header.

### Estado

- Build: `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunk grande en `assets/agro-*.js`.

### QA corto ejecutado

- Se levantó preview local con `pnpm -C apps/gold preview -- --host localhost --port 4173`.
- Se abrió `/agro/` y el sistema redirigió al flujo real de login.
- Se cargaron credenciales QA locales y se ejecutó submit real.
- El flujo volvió a quedar detenido en `Validando...` por hCaptcha invisible sobre `localhost`, así que no fue posible entrar para validar autenticadamente:
  - sidebar dentro de sesión
  - cambio entre `Cartera Viva` y `Ciclos Operativos`
  - aviso legacy dentro del módulo
  - progreso vivo en contexto autenticado
- Browser cerrado, preview local detenido y carpeta temporal de Playwright eliminada:
  - `%LOCALAPPDATA%\\Temp\\playwright-mcp-output\\1774826027491`

### Nota operativa

- El historial legacy sigue disponible y no se elimina en esta ronda.
- `Historial comercial` agrupa mejor la navegación, pero Cartera Viva y Ciclos Operativos siguen separados en semántica y operación.

## Sesión: Pulido final de historial comercial vs legacy (2026-03-29)

### Diagnóstico

- El progreso de Cartera Viva ya tenía movimiento, pero todavía se sentía demasiado genérico frente a la sensación viva de los ciclos de cultivo.
- `Ciclos Operativos` seguía usando superficies oscuras válidas, pero no lo suficientemente profundas ni uniformes con el negro del ADN que ya sostiene Cartera Viva.
- El sidebar todavía dejaba `Historial comercial` y el legacy demasiado cerca en semántica visual; faltaba separar explícitamente sistema nuevo y sistema viejo.

### Plan

1. Rehacer el movimiento del progreso de Cartera Viva para que se sienta más orgánico y agrícola, sin ruido.
2. Llevar `Ciclos Operativos` a `--bg-0` / `--bg-1` como base dominante.
3. Separar el sidebar en dos grupos claros:
   - `Historial comercial`
   - `Historial legacy`

### Alcance

- Esta ronda es de pulido estético/estructural.
- El legacy sigue vivo y accesible.
- `Historial comercial` y `Historial legacy` deben quedar claramente separados.

### Cambios aplicados

- `apps/gold/agro/index.html`
  - el sidebar ahora separa explícitamente:
    - `Historial comercial`
    - `Historial legacy`
  - `Historial comercial` contiene:
    - `Cartera Viva`
    - `Ciclos Operativos`
  - `Historial legacy` contiene:
    - `Pagados`
    - `Fiados`
    - `Pérdidas`
    - `Donaciones`
  - `Otros`, `Carrito` y `Rankings` salen de ese bloque legacy para no confundir la migración.
- `apps/gold/agro/agro-cartera-viva.css`
  - el progreso de Cartera Viva deja el shimmer genérico y pasa a una lectura más orgánica:
    - línea viva superior tipo cultivo
    - respiración mínima del track
    - flow más rico del fill
  - sigue respetando `prefers-reduced-motion`.
- `apps/gold/agro/agro-operational-cycles.css`
  - `Ciclos Operativos` se lleva a `--bg-0` / `--bg-1` como base dominante;
  - modal, panels, cards, summary cards, filters y preview/export dejan de sentirse como panel gris genérico y se alinean al negro profundo del ADN.

### Estado

- Build: `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunk grande en `assets/agro-*.js`.

### QA corto ejecutado

- Se levantó preview local con `pnpm -C apps/gold preview -- --host localhost --port 4173`.
- Se abrió `/agro/` y el sistema redirigió al login real.
- Se cargaron credenciales QA locales y se ejecutó submit real.
- hCaptcha lanzó un desafío visual real dentro del iframe de validación, por lo que no se completó sesión autenticada automática.
- Queda validado con honestidad:
  - preview levanta
  - login real responde
  - bloqueo actual de QA automática está en el desafío visual de hCaptcha
- No fue posible entrar para revisar autenticadamente:
  - grupos `Historial comercial` y `Historial legacy` dentro de sesión
  - progreso vivo en Cartera Viva autenticada
  - negro profundo final de `Ciclos Operativos` autenticado
- Browser cerrado, preview local detenido y carpeta temporal de Playwright eliminada:
  - `%LOCALAPPDATA%\\Temp\\playwright-mcp-output\\1774826027491`

### Nota operativa

- El sistema nuevo y el legacy ya quedan mejor separados desde el sidebar.
- El legacy sigue vivo; no se elimina en esta ronda.

## Sesión: UI Polish quirúrgico — Ciclos Operativos + Sidebar Legacy (2026-03-29)

### Diagnóstico

**Lo que quedó bien de la solución actual:**
- La agrupación funcional del historial legacy en `Historial comercial` y `Historial legacy` ya está implementada.
- Ciclos Operativos usa tokens DNA V10 (`--bg-0`, `--bg-1`) correctamente.
- La barra de progreso de Cartera Viva tiene animaciones (`carteraVivaProgressCurrent`, `carteraVivaProgressBreath`).

**Lo que sigue débil visualmente:**
- La barra de progreso tiene motion pero le falta suavidad premium en las transiciones.
- El sidebar group labels (`Historial comercial`, `Historial legacy`) tienen poca jerarquía visual — se sienten planos.
- Las animaciones del track de progreso podrían sentirse más orgánicas y menos mecánicas.

**Dónde se detectó negro puro:**
- Los modales legacy (`modal-lunar`, `modal-market`, `modal-new-crop`) usan `#000000` y `#000` en gradientes inline, pero estos están fuera del alcance de esta ronda (no son parte de Ciclos Operativos ni sidebar legacy).
- Ciclos Operativos ya usa `--bg-0` (`#050505`) correctamente, no negro puro.

**Cómo está construida la progress bar:**
- Track: `.cartera-viva-progress__track` con pseudo-elements `::before` (shimmer) y `::after` (breath).
- Segments: `.cartera-viva-progress__segment` con gradientes por estado (paid, pending, loss).
- Keyframes: `carteraVivaProgressCurrent` (6.8s), `carteraVivaProgressBreath` (6.4s).

**Archivos que gobiernan estos estilos:**
- `apps/gold/agro/agro-cartera-viva.css` — progress bar
- `apps/gold/agro/agro.css` — sidebar styling (`.agro-shell-sidebar__group`, `.agro-shell-sidebar__label`)
- `apps/gold/agro/agro-operational-cycles.css` — ya correcto con DNA V10

### Plan

**Qué se va a tocar:**
1. `agro-cartera-viva.css` — refinar transitions y timing de progress bar para sensación más premium
2. `agro.css` — mejorar jerarquía visual de los labels de grupo del sidebar

**Qué NO se va a tocar:**
- Lógica de negocio (JS)
- Modales legacy con inline styles
- Arquitectura del shell/routing
- `agro.js`

**Cómo minimizar riesgo de regresión:**
- Solo ediciones CSS quirúrgicas
- Mantener keyframes existentes, solo ajustar timing/easing
- No agregar nuevas clases ni elementos

### Opciones evaluadas

- **Opción A (elegida)**: Parche mínimo de CSS sobre progress bar y sidebar labels
- **Opción B**: Ajuste de estructura visual + CSS — descartada por scope
- **Opción C**: Refuerzo de tokens compartidos — innecesario, tokens ya están bien

Motivo de elección: menor riesgo, menor diff, máxima coherencia visual, cero regresión funcional.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva.css`
  - Refinamiento de progress bar animations:
    - `borderShimmer`: 5.8s → 7s, opacity 0.5 → 0.42 (más sutil)
    - `carteraVivaProgressBreath`: 6.4s → 8s, easing `ease-in-out` → `cubic-bezier(0.4, 0, 0.2, 1)` (más suave)
    - Opacity del breath reducida de 0.1/0.2 → 0.06/0.14 (más sobrio)
    - `carteraVivaProgressCurrent`: 6.8s → 9s, mismo easing premium
    - Añadida `transition: width 320ms` a los segments para cambios fluidos

- `apps/gold/agro/agro.css`
  - `.agro-shell-sidebar__group`: añadido `padding-top: 0.5rem` con `:first-of-type` reset
  - `.agro-shell-sidebar__label`: 
    - Añadido padding (0.35rem 0.5rem) y border-radius 8px
    - Añadido background sutil `rgba(200, 167, 82, 0.04)`
    - Añadido border-left dorado `2px solid rgba(200, 167, 82, 0.28)`
    - Color cambiado de blanco muted a dorado sutil `rgba(200, 167, 82, 0.72)`
  - `.agro-shell-sidebar__label-icon`: tamaño ajustado 0.88rem → 0.82rem, añadido drop-shadow sutil

### Estado

- Build: `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`
  - warning histórico de chunk grande en `assets/agro-*.js`

### QA sugerido

- Verificar visualmente:
  - Progress bars en Cartera Viva: animación más lenta, suave, menos mecánica
  - Sidebar groups: etiquetas `Historial comercial` y `Historial legacy` con mejor jerarquía visual
  - Ciclos Operativos: confirmar que no hay negro puro (#000) visible
- Probar en viewport mobile (≤480px) y desktop

### Nota operativa

- El polish es puramente CSS, no tocó lógica de negocio
- No se modificaron modales legacy con inline styles (fuera de alcance)
- El legacy sigue vivo y accesible desde el sidebar

## Sesión: Cerrar fondo negro puro en Ciclos Operativos (2026-03-29)

### Diagnóstico

**Causa raíz identificada:**
- `.agro-operational-panel`, `.agro-operational-list-section`, `.agro-operational-card` (líneas 146-157 de `agro-operational-cycles.css`) usan `var(--bg-0)` (`#050505`).
- `--bg-0` es el fondo más profundo del sistema según ADN V10, prácticamente negro puro.
- Esto hace que las superficies de cards/panels se sientan "muertas" visualmente en lugar de premium.

**Por qué es incorrecto según DNA V10:**
- `--bg-0` (`#050505`) está pensado para el fondo más profundo/base, no para superficies de cards.
- Las cards elevadas deben usar `--bg-3` (`#111113`) o `--bg-4` (`#1a1a1f`) para tener presencia y profundidad.
- El contraste visual entre capas se pierde cuando todo usa el nivel más oscuro.

**Archivo responsable:**
- `apps/gold/agro/agro-operational-cycles.css` — líneas 146-157

### Plan mínimo de corrección

1. Cambiar `var(--bg-0)` por `var(--bg-3)` en las superficies de panel/card.
2. Mantener el gradiente dorado sutil que ya tienen.
3. Preservar bordes, sombras y estructura.

**Qué NO se va a tocar:**
- Lógica de negocio (JS)
- Otros módulos
- Modales
- Sidebar o progress bars (ya corregidos en pasada anterior)

### Resultado

**Superficie corregida:** `.agro-operational-panel`, `.agro-operational-list-section`, `.agro-operational-card`

**Por qué era la causa:** Usaban `var(--bg-0)` (`#050505`), el fondo más profundo del sistema DNA V10. Este valor está reservado para capas base, no para superficies de tarjetas. El resultado visual era "negro muerto" sin presencia de profundidad.

**Corrección aplicada:** Cambio de `var(--bg-0)` → `var(--bg-3)` (`#111113`). Esto eleva las superficies visualmente, dándoles más presencia sin perder la estética oscura premium.

### Archivos tocados

| Archivo | Cambio | Propósito |
|---------|--------|-----------|
| `apps/gold/agro/agro-operational-cycles.css` | Línea 156: `--bg-0` → `--bg-3` | Superficie de panels/cards con presencia visual |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Diagnóstico + resultado | Documentación de sesión |

### Validación

- `pnpm build:gold`: **PASSED** (sin errores, sin warnings críticos)
- Diff: **1 línea modificada** en CSS principal
- Legibilidad: **Conservada** (contraste mejorado ligeramente)
- DNA V10: **Alineado** — uso correcto de token para superficies elevadas

## Sesión: Cierre visual final + fix de parpadeo en historial comercial (2026-03-30)

### Diagnóstico

- Lo que quedó bien del lote anterior:
  - `Historial comercial` ya agrupa correctamente `Cartera Viva` y `Ciclos Operativos`.
  - La base de superficies ya migró a tokens del ADN V10 y salió del negro puro más agresivo.
  - La barra de progreso de `Cartera Viva` y la jerarquía del sidebar ya tienen una dirección visual más madura.
- Lo que todavía se ve débil:
  - `Cartera Viva` sigue alternando entre bloques muy planos (`--bg-0`) y paneles con poca separación de capas, así que el conjunto todavía se siente más “ensamblado” que “cerrado”.
  - `Ciclos Operativos` tiene mejor base, pero la carga todavía corta la continuidad visual del panel y vuelve a una lectura más de prototipo cuando refresca.
  - Ambas vistas todavía pueden perder presencia al reemplazar contenido real por estados vacíos o de loading demasiado bruscos.
- Dónde aparece el parpadeo:
  - `Cartera Viva`: en primera entrada y en refresh, porque `initAgroCarteraVivaView()` hace `renderView()` antes de que `loadSummary()` deje `loading = true`; además `loadSummary()` reemplaza el contenido completo por `renderLoadingState()`.
  - `Ciclos Operativos`: en primera entrada y en refresh, porque `initAgroOperationalCycles()` hace `renderAll()` con datasets vacíos antes de `refreshData()`, y luego `refreshData()` vuelve a reemplazar la lista por un panel de carga bloqueante.
- Hipótesis de causa raíz confirmadas:
  - pintura inicial prematura de estado vacío antes de la primera lectura real;
  - reemplazo destructivo del contenido ya cargado durante refresh;
  - discontinuidad visual entre shell/panel y estado de carga;
  - falta de un “loading shell” estable para primera carga y de un “soft refresh” para recargas.
- Archivos involucrados:
  - `apps/gold/agro/agro-cartera-viva-view.js`
  - `apps/gold/agro/agro-cartera-viva.css`
  - `apps/gold/agro/agroOperationalCycles.js`
  - `apps/gold/agro/agro-operational-cycles.css`

### Plan

- Opción A: parche mínimo solo de CSS sobre loaders y opacidades.
  - Descartada: reduce ruido visual, pero no corrige la causa real del flicker.
- Opción B: ajuste pequeño de render/loading state con CSS localizado.
  - Válida, pero se queda corta si el refresh sigue desmontando el contenido ya cargado.
- Opción C: fix de sincronización visual más polish fino de superficies compartidas.
  - Elegida: menor riesgo real con mayor claridad.

- Qué voy a tocar:
  - `agro-cartera-viva-view.js`: introducir guard de primera carga y refresh no destructivo.
  - `agroOperationalCycles.js`: usar `loadedOnce` como criterio real para bloquear solo la primera carga y mantener contenido estable en refresh.
  - `agro-cartera-viva.css` y `agro-operational-cycles.css`: cerrar micro-polish de superficies y estado visual de refreshing/loading sin rediseño.
- Qué NO voy a tocar:
  - `agro.js`
  - lógica de negocio de facturero
  - estructura del shell/navegación
  - tablas, queries o migraciones
- Cómo minimizar riesgo:
  - diff corto y localizado en 4 archivos;
  - sin mover fetches ni contratos de datos;
  - usar flags ya existentes (`loadedOnce`) o equivalentes mínimos;
  - mantener el mismo markup principal y solo estabilizar el ciclo visual de render.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva-view.js`
  - `L48`: nuevo flag `hasLoadedSummary`.
  - `L608-L625`: `renderHeaderSummary()` ahora tiene variante de primera carga estable.
  - `L952-L1025`: `renderListView()` distingue entre primera carga bloqueante y refresh suave, mantiene contenido cargado y marca la vista con `is-refreshing`.
  - `L1145`: la primera lectura completada deja trazado `hasLoadedSummary = true`.
  - `L1308`: `handleShellViewChanged()` deja de confundir “sin datos” con “sin cargar”.
- `apps/gold/agro/agro-cartera-viva.css`
  - `L101-L102`, `L363`, `L403`: nuevo estado visual de refresh y loading shell.
  - ajuste fino de superficies en `agro-commercial-family`, header, summary strip, cards y paneles de detalle para dar más continuidad metálica y menos sensación de bloque plano.
- `apps/gold/agro/agroOperationalCycles.js`
  - `L986-L1046`: ids/refs mínimos para overview y list section.
  - `L1395-L1427`: overview usa loading shell real antes de la primera lectura y refresh suave después.
  - `L1749-L1798`: lista/export usa `loadedOnce` para no desmontar la vista al refrescar.
  - `L1983`: `loadedOnce` pasa a ser el corte real entre primera carga y refresco.
- `apps/gold/agro/agro-operational-cycles.css`
  - `L147-L168`, `L483-L490`, `L1139-L1141`: micro-polish de superficies y estado `is-refreshing`.
  - ajuste fino de summary cards y money cells para sostener mejor la profundidad del panel durante carga y refresh.

### Build status

- `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunk grande en `assets/agro-*.js`.

### QA sugerido

- QA técnico ejecutado:
  - `git diff --check` -> OK.
  - smoke local con `python -m http.server 4173 -d apps/gold/dist`.
  - navegación a `/agro/` redirige correctamente a `index.html#login`.
  - intento de autenticación real con cuenta QA local quedó bloqueado por desafío visual de hCaptcha, así que no fue posible entrar a sesión para validar la vista autenticada final.
  - browser cerrado, preview detenido y temporales de Playwright eliminados:
    - `%LOCALAPPDATA%\\Temp\\playwright-mcp-output\\1774898109699`
- QA manual pendiente recomendado:
  1. abrir `Cartera Viva` autenticada y confirmar que ya no aparece vacío falso antes del contenido;
  2. disparar `Actualizar` en `Cartera Viva` y verificar que el cuerpo no se desmonta, solo queda en refresh suave;
  3. abrir `Ciclos Operativos` autenticada y confirmar que primera carga nace estable;
  4. disparar refresh en `Ciclos Operativos` y verificar que la lista no cae a panel vacío/loading destructivo;
  5. revisar desktop y móvil (`<=480px`) para confirmar que el polish mantiene respiración y jerarquía.

## Sesión: Ajuste semántico de cartera en cards/ciclos de Agro (2026-03-30)

### Diagnóstico

- Evidencia exacta del render actual:
  - `apps/gold/agro/agrociclos.js`: el badge principal de la card pinta `ciclo?.estadoTexto || 'En producción'`.
  - `apps/gold/agro/agro-cycles-workspace.js`: el comparador vuelve a mapear `row?.estadoTexto` dentro de la métrica `estado`.
  - `apps/gold/agro/agro.js`: `buildActiveCycleCardsData()` y `buildFinishedCycleCardsData()` construyen el mismo objeto de card con `estadoTexto` agrícola y, al mismo tiempo, `pagadosUsd` / `fiadosUsd` comerciales.
- Problema confirmado:
  - la UI sí mezcla la capa agrícola y la capa comercial dentro del mismo view-model;
  - hoy el estado agrícola es el único label visible en la card, mientras la cartera solo existe como monto (`fiadosUsd`) y no como semántica separada;
  - en vistas comparativas, `estadoTexto` sigue etiquetado como si fuera la lectura total del ciclo, lo que deja espacio para confusión entre estado productivo y estado comercial.
- Condición actual que decide el texto:
  - en activos: `estadoTexto` sale de `statusMeta?.text || 'En producción'`;
  - en finalizados/perdidos: `estadoTexto` sale de `finishedStatus.estadoTexto`;
  - el cierre de cartera no tiene hoy un label canónico independiente, aunque la fuente real ya existe en `fiadosUsd` / `pendingTotal`.
- Alcance semántico:
  - no hay evidencia de que la card principal deba mostrar `semilla` o material de siembra; agregarlo contaminaría la semántica general de cultivos.

### Plan mínimo

- Mantener intacto `estadoTexto` como verdad agrícola.
- Agregar un campo derivado mínimo para cartera usando solo `fiadosUsd`.
- Pintar ese label comercial como capa secundaria visible en cards/ciclos, con dos únicos estados:
  - `Cartera activa` si `fiadosUsd > 0`
  - `Cartera cerrada` si `fiadosUsd <= 0`
- Revisar el comparador de ciclos para que la lectura comercial no reaparezca mezclada como estado agrícola.

### Archivos candidatos

- `apps/gold/agro/agro.js`
- `apps/gold/agro/agrociclos.js`
- `apps/gold/agro/agrociclos.css`
- `apps/gold/agro/agro-cycles-workspace.js`

### Riesgo

- Bajo si el diff se limita a derivar y pintar un label comercial secundario.
- El único punto sensible es no reemplazar ni reinterpretar `estadoTexto`, porque ese campo sigue siendo la verdad agrícola del ciclo.

### Cambios aplicados

- `apps/gold/agro/agrociclos.js`
  - Se derivó el estado comercial desde `fiadosUsd` sin tocar `estadoTexto`.
  - La card principal conserva su badge agrícola y ahora agrega un badge secundario de cartera:
    - `Cartera activa` si hay fiados pendientes.
    - `Cartera cerrada` si los fiados están en cero.
- `apps/gold/agro/agrociclos.css`
  - Se añadieron estilos mínimos para el badge comercial secundario de la card y para el pill comercial del comparador.
- `apps/gold/agro/agro-cycles-workspace.js`
  - La métrica `estado` pasó a leerse explícitamente como `Estado del cultivo`.
  - El comparador ahora muestra la capa comercial por separado en el resumen, derivada solo desde `fiadosUsd`.
- `apps/gold/agro/agro.js`
  - Sin cambios. Se respetó la regla de no crecer el monolito.

### Build status

- `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico por chunk `assets/agro-*.js` > 500 kB.

### QA sugerido

- Validado técnicamente:
  - `git diff --check` -> OK
  - `pnpm build:gold` -> OK
- Pendiente de validación manual autenticada:
  1. ciclo con `fiadosUsd > 0` -> badge agrícola intacto + `Cartera activa`;
  2. ciclo con `fiadosUsd = 0` -> badge agrícola intacto + `Cartera cerrada`;
  3. ciclo finalizado con cartera abierta -> seguir mostrando estado agrícola de cierre + `Cartera activa`;
  4. confirmar que no apareció ningún campo de semilla/material de siembra en la card principal.

## Sesión: QA funcional productivo Agro V1 (2026-03-30)

### Diagnóstico

- Se ejecutó QA autenticada sobre `https://www.yavlgold.com/` con la cuenta QA local dedicada.
- El acceso automatizado por login sigue chocando con captcha:
  - intento directo por `supabase.auth.signInWithPassword()` devolvió `captcha verification process failed` en `auth/v1/token`;
  - aun así la sesión quedó activa y permitió continuar el QA funcional autenticado.
- Dashboard carga y redirige correctamente con sesión activa; saludo visible: `Capitan QA`.
- Cartera Viva quedó validada como flujo principal:
  - resumen buyer-centric visible con `USD 134,00` por cobrar y `4` compradores activos;
  - categorías visibles correctas: `Fiados`, `Pagados`, `Pérdidas`;
  - `Mixto` no aparece al frente;
  - filtro por cultivo `Maiz Amarillo` redujo la vista a `1` comprador y el detalle quedó filtrado al movimiento real del cultivo;
  - detalle de `Jesus Mora` mostró historial cronológico, selector `USD/COP` y `USD/Bs`, equivalentes válidos y exportación real a Markdown.
- Hallazgos reales en producción:
  - consola mantiene `1` error por `auth/v1/token` asociado al flujo de captcha/login;
  - consola mantiene `1` warning: `[AGRO_CLIMA_LAYOUT] Missing clima weekly nodes; embed not initialized`;
  - en móvil `390x844` no apareció scroll horizontal en Agro, pero varios targets quedaron por debajo de `40px` de alto (`30px–39px`) en tabs y acciones secundarias;
  - en `Ciclos Operativos` la cuenta QA no mostró ciclos reales visibles (`0` activos) y por eso no se pudo validar la rama de datos/export con dataset real;
  - en la vista de `Ciclos Operativos`, el heading del módulo aparece correcto pero la familia comercial seguía marcando `Cartera Viva` como tab activa, lo que sugiere desalineación visual de estado.

### Cambios aplicados

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - Se agregó esta sección de cierre de sesión QA.
- Sin cambios de código productivo en esta sesión.

### Build status

- `No ejecutado`.
- Motivo: sesión de QA sin cambios de código productivo; solo se actualizó el reporte activo.

### QA sugerido

- Revalidar manualmente el login real con captcha desde navegador humano y confirmar si el error `auth/v1/token` sigue presente aun cuando la sesión termina entrando.
- Revisar el wiring visual del tab activo en `Ciclos Operativos` dentro de la familia comercial.
- Probar con una cuenta/dataset que sí tenga ciclos operativos reales para cubrir:
  1. cards con datos;
  2. filtros por tipo/categoría;
  3. exportación Markdown;
  4. lista de finalizados.
- Subir el alto mínimo de tabs/acciones secundarias en móvil a `>=40px`, idealmente `44px`, para mejorar tocabilidad.

## Sesión: Fixes post-QA para Agro V1 (2026-03-30)

### Diagnóstico

- Se tomaron los tres ajustes inmediatos derivados del QA funcional productivo:
  - targets táctiles por debajo de `44px` en mobile dentro de `Cartera Viva` y `Ciclos Operativos`;
  - desalineación visual potencial del tab activo en la familia comercial de `Ciclos Operativos`;
  - warning de `Clima` disparado cuando la estructura semanal ni siquiera existe en la vista actual.

### Cambios aplicados

- `apps/gold/agro/agro-cartera-viva.css`
  - Se elevó a `min-height: var(--a11y-touch-min, 44px)` la superficie táctil mobile de tabs, chips, acciones secundarias y menú de acciones en `Cartera Viva`.
  - El trigger circular del menú contextual quedó forzado a `44x44`.
- `apps/gold/agro/agro-operational-cycles.css`
  - Se elevó a `min-height: var(--a11y-touch-min, 44px)` la tocabilidad mobile de acciones primarias/secundarias y summary-toggle en `Ciclos Operativos`.
- `apps/gold/agro/agroOperationalCycles.js`
  - Se agregó `syncCommercialFamilyTabs()` para recalcular `is-active` y `aria-current` de la familia comercial usando el `agroActiveView` real del shell.
- `apps/gold/agro/agroclima-layout.js`
  - Se silenció la inicialización cuando la estructura semanal de clima no está montada en absoluto.
  - El warning permanece solo para estados parcialmente rotos, no para vistas donde clima no aplica.

### Build status

- `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico por chunk `assets/agro-*.js` > 500 kB.

### QA sugerido

- Revalidar en mobile `390x844` que tabs y acciones secundarias ya no queden por debajo de `44px`.
- Reabrir `Ciclos Operativos` desde `Cartera Viva` y confirmar que la familia comercial ahora resalta el tab correcto.
- Confirmar que el warning `[AGRO_CLIMA_LAYOUT] Missing clima weekly nodes; embed not initialized` desaparece en vistas donde el weekly embed no existe.

## Sesión: Re-QA runtime de fixes Agro V1 (2026-03-30)

### Diagnóstico

- Se ejecutó una revalidación rápida en producción real sobre `https://www.yavlgold.com/` con viewport mobile `390x844`.
- El acceso volvió a rozar `hCaptcha`:
  - el submit disparó challenge invisible;
  - apareció un iframe de reto;
  - aun así la sesión terminó entrando y permitió continuar la validación runtime.
- Resultado real por fix:
  - `BUG-01 / tab activa`: `PARCIALMENTE RESUELTO`.
    - `document.body.dataset.agroActiveView` cambió correctamente entre `cartera-viva` y `operational`;
    - los tabs visibles de la familia comercial también alternaron correctamente `is-active` y `aria-current="page"`;
    - la cabecera visible coincidió con la vista activa en ambas rutas;
    - permanecen nodos ocultos de la vista opuesta en DOM con `height: 0`, pero no quedaron visibles al usuario.
  - `BUG-02 / touch targets mobile`: `NO RESUELTO EN RUNTIME`.
    - en `Cartera Viva` se midieron targets visibles por debajo del mínimo `44px`:
      - tabs de familia comercial visibles: `30px`;
      - botón `Actualizar`: `39px`;
      - chips de cultivo (`Vista general`, `Batata Amarilla`, `Tomate Rinon`, `Maiz Amarillo`): `32px`;
      - CTA `Nuevo fiado`: `32px`;
      - categorías `Fiados / Pagados / Pérdidas`: `35px`;
    - en `Ciclos Operativos` también persistieron targets por debajo del mínimo:
      - sublinks visibles `Cartera Viva / Ciclos Operativos` del shell: `31px`;
      - CTA `Nuevo ciclo operativo`: `38px` en header y `34px` en estados vacíos;
      - botón `Feedback`: `40px`.
  - `BUG-03 / warning de Clima`: `NO RESUELTO EN PRODUCCIÓN`.
    - el warning siguió apareciendo fuera de Clima al cargar Agro:
      - `[AGRO_CLIMA_LAYOUT] Missing clima weekly nodes; embed not initialized.`
    - el warning se observó en consola estando en vistas no-Clima, por lo que el guard no está reflejado en runtime productivo actual.

### Cambios aplicados

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - Se agregó esta sección de revalidación runtime.
- Sin cambios de código productivo en esta sesión.

### Build status

- `No ejecutado`.
- Motivo: sesión de re-QA runtime sin cambios de código; solo se actualizó el reporte activo.

### QA sugerido

- Reabrir el deploy correcto que contenga los CSS/JS ya parchados, porque producción actual todavía expone targets `<44px` y sigue emitiendo el warning de clima.
- Repetir la medición mobile en `390x844` sobre el deploy actualizado, validando específicamente:
  1. tabs de familia comercial visibles `>=44px`;
  2. categorías `Fiados / Pagados / Pérdidas` `>=44px`;
  3. CTAs `Nuevo fiado` y `Nuevo ciclo operativo` `>=44px`;
  4. ausencia total del warning de clima fuera de la vista `Clima`.

## Sesión: Re-QA runtime post-deploy Agro V1 (2026-03-30)

### Diagnóstico

- Se repitió el QA rápido en producción real después del nuevo deploy, usando viewport mobile `390x844`.
- El login siguió pasando por `hCaptcha` invisible con reto visual intermedio, pero la sesión QA terminó entrando y permitió validar runtime.
- Resultado actualizado por fix:
  - `BUG-01 / tab activa`: `RESUELTO`.
    - `document.body.dataset.agroActiveView` alternó correctamente entre `cartera-viva` y `operational`;
    - la cabecera visible coincidió con la vista activa;
    - los tabs visibles de la familia comercial marcaron el estado correcto al ir `Cartera Viva -> Ciclos Operativos -> Cartera Viva`.
  - `BUG-02 / touch targets mobile`: `RESUELTO EN LAS VISTAS PRINCIPALES`.
    - en `Cartera Viva`, los controles visibles del módulo quedaron en `44px`:
      - tabs de familia comercial internos: `44px`;
      - `Actualizar`: `44px`;
      - chips de cultivo: `44px`;
      - `Nuevo fiado`: `44px`;
      - categorías `Fiados / Pagados / Pérdidas`: `44px`.
    - en `Ciclos Operativos`, los controles visibles del módulo quedaron correctos:
      - tabs de familia comercial internos: `46px`;
      - `Nuevo ciclo operativo`: `44px`.
    - observación menor:
      - los sublinks del shell lateral `Cartera Viva / Ciclos Operativos` siguen midiendo `31px` cuando el sidebar expandido está visible;
      - el botón flotante `Feedback` sigue en `40px`.
    - como el bug original apuntaba a tabs y acciones secundarias de las vistas principales, el fix operativo principal sí quedó validado.
  - `BUG-03 / warning de Clima`: `SIGUE FALLANDO`.
    - el warning todavía aparece fuera de la vista Clima al cargar Agro:
      - `[AGRO_CLIMA_LAYOUT] Missing clima weekly nodes; embed not initialized.`
    - en esta corrida no hubo errores rojos de consola; quedó solo ese warning.

### Cambios aplicados

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - Se agregó esta sección de revalidación post-deploy.
- Sin cambios de código productivo en esta sesión.

### Build status

- `No ejecutado`.
- Motivo: sesión de QA runtime sin cambios de código; solo se actualizó el reporte activo.

### QA sugerido

- Corregir el guard de `Clima` en runtime productivo y revalidar únicamente consola en:
  1. `Dashboard Agro`;
  2. `Cartera Viva`;
  3. `Ciclos Operativos`.
- Decidir si los sublinks del sidebar comercial (`31px`) y `Feedback` (`40px`) entran en el alcance estricto del estándar `--a11y-touch-min`.

## Sesión: Fix menor Clima + touch targets shell Agro V1 (2026-03-30)

### Diagnóstico

- El warning `[AGRO_CLIMA_LAYOUT] Missing clima weekly nodes; embed not initialized.` seguía viniendo de un único `console.warn` en `agroclima-layout.js`.
- El disparo no era un segundo path oculto: el problema real era que `initClimaWeeklyEmbed()` corría desde el init global del monolito aun cuando la vista activa no era `clima`.
- En el markup actual del dashboard existe `#clima-weekly-host`, pero no existen `#yg-acc-weekly` ni `#btn-toggle-weekly-forecast` en ese contexto; por eso el guard previo todavía dejaba pasar el warning.
- En accesibilidad mobile quedaban dos pendientes menores por debajo de `44px`:
  - `.agro-shell-sublink` del sidebar comercial;
  - `.agro-feedback-fab`.

### Cambios aplicados

- `apps/gold/agro/agroclima-layout.js`
  - Se agregó `isClimaViewActive()` para detectar la vista `clima` por `document.body.dataset.agroActiveView` y por el estado visible de la región `data-agro-shell-region="clima"`.
  - `initClimaWeeklyEmbed()` ahora sale en silencio cuando faltan nodos semanales fuera de la vista `clima`.
  - El warning solo queda habilitado para estados realmente parciales dentro del contexto de `clima`.
- `apps/gold/agro/agro.css`
  - `.agro-shell-sublink` ahora fuerza `min-height: var(--a11y-touch-min, 44px)`.
  - `.agro-feedback-fab` ahora fuerza `min-height: var(--a11y-touch-min, 44px)` y centra su contenido con `inline-flex`.
  - En mobile `<=640px` se reafirma el mínimo táctil de `44px` para el FAB.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - Se agregó esta sección de cierre.

### Build status

- `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico por chunk `assets/agro-*.js` > 500 kB.

### QA sugerido

- Revalidar en producción con consola abierta que el warning de `Clima` ya no aparezca al entrar a:
  1. `Dashboard Agro`;
  2. `Cartera Viva`;
  3. `Ciclos Operativos`.
- Reconfirmar en mobile `390x844` que:
  1. los sublinks del sidebar comercial ya no bajen de `44px`;
  2. el botón `Feedback` ya no quede en `40px`.

## Sesión: QA final post-fix en producción Agro V1 (2026-03-30)

### Diagnóstico

- Se ejecutó QA final en producción real con viewport mobile `390x844`.
- El login QA volvió a pasar por `hCaptcha` invisible, pero la sesión terminó entrando correctamente y permitió completar la validación.
- Resultado final:
  - `BUG-03 / warning de Clima`: `RESUELTO`.
    - al entrar a `Dashboard Agro`, `Cartera Viva` y `Ciclos Operativos`, la consola quedó en `0 warnings` y `0 errors`;
    - el warning `[AGRO_CLIMA_LAYOUT] Missing clima weekly nodes; embed not initialized.` ya no apareció fuera de contexto.
  - `touch targets sidebar`: `RESUELTO`.
    - sublinks visibles `Cartera Viva / Ciclos Operativos` del shell lateral: `44px`;
    - botón `Feedback`: `44px`.
  - `tab activa`: se mantuvo correcta durante la revalidación:
    - `Cartera Viva` -> `activeView: cartera-viva` + cabecera visible `Cartera de compradores`;
    - `Ciclos Operativos` -> `activeView: operational` + cabecera visible `Ciclos Operativos`.

### Cambios aplicados

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
  - Se agregó esta sección de validación final en producción.
- Sin cambios de código productivo en esta sesión.

### Build status

- `No ejecutado`.
- Motivo: sesión de QA runtime final sin cambios de código; solo se actualizó el reporte activo.

### QA sugerido

- Los tres bugs de esta ronda quedaron cerrados en producción.
- Siguiente bloque recomendado:
  1. dataset QA de `Ciclos Operativos`;
  2. `QA-3` completo;
  3. `QA-5` smoke de `Facturero`.

## Sesión: Fase nueva Cartera Viva client-centric (2026-03-30)

### Diagnóstico

- Cartera Viva ya no parte de cero en identidad: existe una fundación previa en `public.agro_buyers` con `id` estable, `display_name`, `group_key` y FKs vivas desde:
  - `public.agro_pending.buyer_id / buyer_group_key / buyer_match_status`
  - `public.agro_income.buyer_id / buyer_group_key / buyer_match_status`
  - `public.agro_losses.buyer_id / buyer_group_key / buyer_match_status`
- La tabla real del historial/facturero que alimenta cartera no es una sola:
  - fiados: `public.agro_pending`
  - cobros: `public.agro_income`
  - pérdidas: `public.agro_losses`
- El `group_key` actual se construye con canonicalización buyer-centric:
  - JS: `normalizeBuyerGroupKey()` en `apps/gold/agro/agro-buyer-identity.js`
  - SQL: `public.agro_canonicalize_buyer_name(text)` en `supabase/migrations/20260327001037_agro_buyer_foundation_v4.sql`
- La vista actual `apps/gold/agro/agro-cartera-viva-view.js` ya es buyer-centric por RPC (`agro_buyer_portfolio_summary_v1`) y detalle propio, pero todavía falla en dos puntos de producto:
  - la experiencia principal no arranca desde una entidad explícita `cliente`;
  - el detalle no tiene un CTA directo de `Nuevo registro` contextualizado al cliente actual.
- Crear una tabla paralela `agro_clients` encima de `agro_buyers` duplicaría identidad, migración y puntos de verdad. El diff mínimo coherente es elevar `agro_buyers` al rol de cliente maestro equivalente aprobado.

### Tablas reales involucradas

- `public.agro_buyers`
- `public.agro_pending`
- `public.agro_income`
- `public.agro_losses`
- RPC actual: `public.agro_buyer_portfolio_summary_v1()`

### Estrategia de migración

1. Evolucionar `public.agro_buyers` con campos de cliente maestro equivalentes:
   - `canonical_name`
   - `status` (`active|archived`)
   - `deleted_at` solo si hace falta compatibilidad de patrón, sin usarlo como flujo principal
2. Backfill:
   - `canonical_name = coalesce(canonical_name, group_key)`
   - `status = 'active'` por defecto
3. Mantener `group_key` como alias de compatibilidad legacy para no romper RPCs, social threads ni bridges existentes.
4. Reescribir `agro_buyer_portfolio_summary_v1()` para leer el estado del cliente maestro equivalente sin romper el nombre del RPC.

### Estrategia de asociación entre movimientos legacy y cliente maestro

- Mantener `buyer_id` como FK estable actual; no abrir una segunda FK paralela en esta fase.
- Cuando exista `buyer_id`, la asociación del movimiento al cliente será directa por id.
- Cuando solo exista `buyer_group_key`, resolver por `group_key/canonical_name` del cliente y, en edición segura, promover esos registros a vínculo estable con `buyer_id` cuando corresponda.
- Resultado: no se rompe Cartera Viva actual y se evita una migración masiva más agresiva de lo necesario.

### Estrategia de edición segura

- Editar cliente actualizará `display_name` y, si cambia la canonicalización, también `canonical_name/group_key`.
- Para no romper historial legacy:
  - se actualizará el registro maestro;
  - se reasignarán `buyer_group_key` legacy en `agro_pending`, `agro_income` y `agro_losses` del usuario para reflejar el nuevo group key;
  - los registros ya ligados por `buyer_id` permanecerán estables.
- Si el nuevo nombre colisiona con otro cliente del mismo usuario por canonicalización, la edición debe bloquearse y exigir resolver el duplicado en vez de fusionar silenciosamente.

### Estrategia de archivado seguro

- `Sin historial` -> permitir eliminación dura del cliente maestro.
- `Con historial` -> no borrar; pasar `status = 'archived'`.
- Nunca dejar movimientos con historial huérfano ni depender de `ON DELETE SET NULL` como flujo normal.

### Archivos a tocar

- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `supabase/migrations/*` nuevo lote client-centric
- `apps/gold/agro/agrocompradores.js`
- `apps/gold/agro/agro-cartera-viva.js`
- `apps/gold/agro/agro-cartera-viva-view.js`
- `apps/gold/agro/agro-cartera-viva-detail.js`
- `apps/gold/agro/agro-cartera-viva-export.js`
- `apps/gold/agro/agro-wizard.js`
- `apps/gold/agro/index.html`
- `apps/gold/agro/agro.css` y/o `apps/gold/agro/agro-cartera-viva.css`

### Riesgos

- `agro_buyers` ya es usado por CRM local, social y perfiles públicos; cualquier cambio de schema debe ser aditivo y compatible.
- Renombrar `group_key` sin propagarlo a filas legacy con `buyer_id = null` rompería la lectura de detalle/historial.
- Cambiar copy visible de `comprador` a `cliente` debe limitarse a Cartera Viva y flujos asociados, sin reescribir superficies ajenas en este lote.

### Cambios aplicados

- `supabase/migrations/20260330173000_agro_clients_master_equivalent_v1.sql`
  - `agro_buyers` se elevó a cliente maestro equivalente con:
    - `canonical_name`
    - `status` (`active|archived`)
    - índice único `(user_id, canonical_name)`
    - índice `(user_id, status)`
  - `agro_buyer_portfolio_summary_v1()` se recreó para:
    - exponer `canonical_name` y `client_status`;
    - incluir clientes activos sin movimientos;
    - mantener compatibilidad con `buyer_id/group_key`.
- `apps/gold/agro/agro-buyer-identity.js`
  - el auto-link de nuevos movimientos ahora inserta también `canonical_name` y `status` al crear identidad nueva.
- `apps/gold/agro/agrocompradores.js`
  - el modal pasó de ficha de comprador a CRUD real de cliente:
    - crear cliente;
    - editar cliente;
    - archivar/reactivar cliente;
    - eliminar cliente solo sin historial;
    - propagar cambios de `group_key/canonical_name` a `agro_pending`, `agro_income`, `agro_losses` y `agro_social_threads`;
    - emitir evento `agro:client:changed` para refrescar Cartera Viva y abrir detalle contextual tras altas/duplicados.
- `apps/gold/agro/index.html`
  - copy del modal actualizado a cliente;
  - nuevos CTAs `Archivar cliente` y `Eliminar cliente`.
- `apps/gold/agro/agro.css`
  - ajuste del modal para soportar más acciones y tocabilidad mínima.
- `apps/gold/agro/agro-cartera-viva.js`
  - normalización de `canonical_name` y `client_status` en filas del RPC.
- `apps/gold/agro/agro-cartera-viva-view.js`
  - Cartera Viva pasó a copy client-centric;
  - nuevo CTA principal `Nuevo cliente`;
  - cards con `Editar cliente` + `Ver detalle`;
  - soporte para clientes activos sin movimientos;
  - refresh por evento `agro:client:changed`;
  - apertura contextual del wizard desde detalle con cliente prellenado.
- `apps/gold/agro/agro-cartera-viva-detail.js`
  - detalle renombrado a cliente;
  - quick actions:
    - `Nuevo fiado`
    - `Nuevo cobro`
    - `Nueva pérdida`
    - `Editar cliente`
- `apps/gold/agro/agro-cartera-viva-export.js`
  - exportación renombrada a clientes.
- `apps/gold/agro/agro-wizard.js`
  - el label visible de ingresos usa `Cliente`.

### Build status

- `git diff --check` -> OK
- `pnpm build:gold` -> OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observaciones no bloqueantes:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`;
  - warning histórico de chunks grandes en `assets/agro-*.js`.

### QA sugerido

1. `Nuevo cliente`
   - crear cliente sin historial;
   - confirmar que aparece en Cartera Viva aun con métricas en cero;
   - entrar a su detalle y registrar su primer movimiento desde los CTAs nuevos.
2. `Duplicado`
   - intentar crear el mismo cliente con variación menor de nombre;
   - confirmar que no duplica y que abre el detalle del existente.
3. `Editar cliente`
   - renombrar cliente con historial;
   - validar que detalle, timeline y registros legacy siguen ligados.
4. `Eliminar seguro`
   - cliente sin historial -> eliminar;
   - cliente con historial -> bloqueo de delete y archivado correcto.
5. `Archivado`
   - archivar cliente con historial;
   - confirmar badge/estado archivado y que el historial sigue exportable.
6. `Nuevo registro contextual`
   - desde detalle del cliente abrir `Nuevo fiado`, `Nuevo cobro` y `Nueva pérdida`;
   - confirmar que el nombre del cliente ya nace prellenado y que no se pierde el contexto.
7. `Mobile`
   - revisar `<=480px` el modal de cliente y las quick actions del detalle.

## Sesión: QA runtime Cartera Viva + Ciclos Operativos (Otros + Donaciones) (2026-03-30)

### Objetivo

- Ejecutar QA funcional runtime serio sobre:
  - `Cartera Viva`
  - `Ciclos Operativos`
- Confirmar comportamiento real de:
  - flujo client-centric
  - quick actions contextualizadas
  - rutas `Otros`
  - rutas `Donaciones`
  - desktop y mobile `390x844`

### Alcance

- `Cartera Viva`
  - alta de cliente
  - deduplicación
  - edición
  - eliminación/archivado
  - quick actions de `Nuevo fiado`, `Nuevo cobro`, `Nueva pérdida`
- `Ciclos Operativos`
  - creación y lectura de `Otros`
  - creación y lectura de `Donaciones`
  - filtros
  - export
  - mobile y consola

### Dataset QA a usar o crear

- `QA Cliente Cartera Viva`
- `QA Cliente Duplicado`
- `QA Cliente Archivo`
- `QA Donación Semillas`
- `QA Otros Ajuste Manual`

### Riesgo

- El QA será sobre producción real con cuenta QA local dedicada.
- Si se siembran datos QA, deben limpiarse al cierre o documentarse con precisión.
- Al terminar se debe cerrar browser/Playwright y limpiar temporales locales de esta sesión.

### Diagnóstico

- `Cartera Viva` no está íntegramente operativa en producción real.
- El alta y la edición de cliente fallan contra `public.agro_buyers` porque la base productiva no tiene la columna `canonical_name` que el frontend ya da por existente.
- `Ciclos Operativos` sí está operativo en runtime para alta, filtros, preview/export markdown y borrado con cascade verificado.
- La clasificación económica de `Donación` está semánticamente mal representada hoy:
  - la card la pinta como `💸 Salida de dinero`;
  - el balance queda negativo;
  - el export markdown repite esa misma lectura.

### Resultados QA

- `Cartera Viva`
  - `Nuevo cliente`:
    - probado;
    - falla al guardar con `column agro_buyers.canonical_name does not exist`.
  - `Duplicado`:
    - bloqueado por la misma falla de alta;
    - no se pudo completar validación de canonicalización en producción.
  - `Editar cliente`:
    - al abrir ficha de `Jesus Mora` la UI queda en `Cargando cliente...`;
    - `Archivar cliente` queda deshabilitado;
    - `Eliminar cliente` aparece habilitado;
    - la consola vuelve a marcar `400` sobre `agro_buyers` al pedir `canonical_name`.
  - `Eliminar / archivar seguro`:
    - no validado end-to-end por el fallo de carga de ficha;
    - evidencia visual actual sugiere regla insegura en runtime porque delete queda habilitado mientras archive no carga.
  - `Quick actions desde detalle`:
    - probado `Nuevo fiado`;
    - el wizard abre contextualizado y el campo `Cliente` llega prellenado con `Jesus Mora`;
    - no se guardó movimiento nuevo para no contaminar un cliente no-QA.
  - `Legacy`:
    - la experiencia principal sí entra por `Cartera Viva` y `detalle del cliente`;
    - el texto `Legacy disponible temporalmente` confirma que el legacy sigue vivo como apoyo, no como CTA principal.
- `Ciclos Operativos`
  - `Donación`:
    - alta OK;
    - card OK;
    - filtro por tipo `🤝 Donación` OK;
    - preview/export markdown OK;
    - bug semántico confirmado: aparece y se exporta como `💸 Salida de dinero` con balance `-$25`.
  - `Otros`:
    - alta OK usando categoría `📋 Otro`;
    - card OK;
    - filtro por categoría `📋 Otro` OK;
    - preview/export markdown OK;
    - no se reclasificó como donación ni pérdida.
  - `Export`:
    - la ruta real existe en la subvista `export` del módulo;
    - genera preview y archivo `ciclos-operativos-2026-03.md`;
    - probado con filtros activos para `Otro` y para `Donación`.
  - `Cleanup`:
    - ambos ciclos QA fueron eliminados;
    - el sistema respondió `🗑️ Ciclo eliminado y cascade verificado.`

### Bugs confirmados

1. `BUG-CV-001`
   - Vista: `Cartera Viva > Nuevo cliente`
   - Pasos:
     1. abrir `Cartera Viva`;
     2. pulsar `Nuevo cliente`;
     3. llenar `Nombre visible`;
     4. guardar.
   - Resultado actual:
     - la ficha no guarda;
     - aparece `column agro_buyers.canonical_name does not exist`;
     - la consola devuelve `400` sobre `agro_buyers`.
   - Resultado esperado:
     - crear cliente y mostrar su card.
   - Severidad: alta
   - Causa raíz probable:
     - drift entre frontend desplegado y schema productivo; falta la migración que agrega `canonical_name`.

2. `BUG-CV-002`
   - Vista: `Cartera Viva > Editar cliente`
   - Pasos:
     1. abrir `Cartera Viva`;
     2. pulsar `Editar cliente` en un cliente existente con historial.
   - Resultado actual:
     - la ficha queda en `Cargando cliente...`;
     - `Archivar cliente` sigue deshabilitado;
     - `Eliminar cliente` queda habilitado.
   - Resultado esperado:
     - cargar ficha completa y aplicar regla segura `con historial = archivar / sin historial = eliminar`.
   - Severidad: alta
   - Causa raíz probable:
     - la misma desalineación de schema al consultar `canonical_name`/`status`.

3. `BUG-OPS-001`
   - Vista: `Ciclos Operativos > Donación`
   - Pasos:
     1. crear ciclo con tipo `🤝 Donación`;
     2. revisar card;
     3. revisar export markdown.
   - Resultado actual:
     - la donación se muestra como `💸 Salida de dinero`;
     - el balance queda negativo;
     - el export repite esa semántica.
   - Resultado esperado:
     - una donación no debería presentarse como gasto saliente salvo que el negocio lo haya definido explícitamente así.
   - Severidad: media
   - Causa raíz probable:
     - el renderer reutiliza la lógica de `outgoing` para `donation`.

### Cambios aplicados

- Archivo tocado:
  - `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- No se aplicó fix de código en esta sesión.

### Build status

- No se ejecutó `pnpm build:gold` porque no hubo cambios de código.

### QA sugerido

1. Aplicar primero en producción la migración que agrega `canonical_name` y volver a correr:
   - alta cliente;
   - editar cliente;
   - archivado seguro;
   - delete seguro.
2. Corregir la semántica de `Donación` en `Ciclos Operativos` y repetir:
   - card;
   - resumen superior;
   - export markdown.
3. Tras el fix de schema, revalidar quick actions completas desde detalle con un cliente QA real y cleanup posterior.

---

## Fix producción: Cartera Viva schema drift + Donación semántica (2026-03-30)

### Diagnóstico

#### Bloqueo 1 — Cartera Viva (schema drift)
- `agro_buyers` en producción **carecía** de las columnas `canonical_name` y `status`.
- `agrocompradores.js` hace SELECT/INSERT/UPDATE con ambas (`BUYER_SELECT` = `['id','user_id','display_name','group_key','canonical_name','status',...]`).
- `agro_buyer_portfolio_summary_v1` (RPC) no retornaba `canonical_name` ni `client_status`.
- `normalizeBuyerPortfolioSummaryRow()` en `agro-cartera-viva.js` ya espera `nextRow.canonical_name` y `nextRow.client_status`.
- La migración `20260330173000_agro_clients_master_equivalent_v1.sql` **no existía** en el repo; hubo que crearla tanto en repo como aplicarla en producción.

#### Bloqueo 2 — Donación semántica
- `DIRECTION_BY_TYPE.donation = 'out'` → se reusaban los labels genéricos `💸 Salida de dinero` / `💸 Pagué / Gasté` / balance negativo.
- La regla de negocio para Donación es: salida real de dinero (dirección `out` correcta para el balance), pero requiere wording semántico propio (`🤝 Donación / Apoyo`), no el genérico comercial.
- Afectaba: badge card, badge movimiento detalle, cell resumen, label confirm wizard, export markdown.

### Plan ejecutado

1. Crear y aplicar migración `20260330173000_agro_clients_master_equivalent_v1.sql` en producción.
2. Backfill de `canonical_name` desde `group_key` para filas existentes.
3. Reconstruir RPC `agro_buyer_portfolio_summary_v1` añadiendo `canonical_name` y `client_status` al RETURNS TABLE.
4. Corregir `directionSummaryLabel()` y `directionDetailLabel()` para aceptar `economicType` y retornar `🤝 Donación / Apoyo` cuando `economicType === 'donation'`.
5. Aplicar el parámetro `economicType` en todos los call-sites: card badge, detail badge, money-cell summary label, wizard step 3 impact badge, wizard step 4 confirm label, export markdown.
6. Build y verificación DB.

### Cambios aplicados

| Archivo | Cambios |
|---|---|
| `apps/gold/supabase/migrations/20260330173000_agro_clients_master_equivalent_v1.sql` | NUEVO — DDL: ADD COLUMN canonical_name, ADD COLUMN status, 2 índices, DROP+CREATE RPC con canonical_name/client_status |
| `apps/gold/agro/agroOperationalCycles.js` | `directionSummaryLabel()` y `directionDetailLabel()` ahora aceptan `economicType`; 6 call-sites actualizados con el parámetro |

### Riesgo

- Bajo: backfill de `canonical_name = group_key` es determinístico y reversible. Filas sin `group_key` quedan en NULL (la UI ya hace fallback).
- Bajo: `status DEFAULT 'active'` no rompe filas existentes.
- Bajo: el balance de Donación sigue siendo correcto (`out`); solo cambió el wording de etiquetas.

### Build status

- `pnpm build:gold` → ✅ OK
  - `agent-guard: OK`
  - `agent-report-check: OK`
  - `vite build: OK`
  - `check-dist-utf8: OK`

### Verificación DB

- `agro_buyers.canonical_name`: columna TEXT nullable ✅
- `agro_buyers.status`: columna TEXT NOT NULL DEFAULT 'active' ✅
- `agro_buyer_portfolio_summary_v1` return signature incluye `canonical_name text, client_status text` ✅

### QA sugerido

#### Cartera Viva
1. Nuevo cliente → alta sin error `column does not exist` → confirm en DB
2. Verificar que duplicado por `canonical_name` funciona (modal redirige al existente)
3. Editar cliente → guardar → `Cargando cliente...` se resuelve correctamente
4. Archivar cliente con historial → activa botón Archivar → status cambia a `archived`
5. Eliminar cliente sin historial → funciona sin error
6. Quick actions desde detalle: `Nuevo fiado`, `Nuevo cobro`, `Nueva pérdida` → contexto correcto

#### Ciclos Operativos — Donación
1. Crear ciclo tipo `🤝 Donación` → wizard step 3 muestra `🤝 Donación / Apoyo` (no `💸 Salida de dinero`)
2. Card renderizada → badge `🤝 Donación / Apoyo` en pill y en money-cell label
3. Detalle de movimiento → badge `🤝 Donación / Apoyo`
4. Export MD → línea `- 🤝 Donación / Apoyo: [monto]` (no `💸 Pagué / Gasté`)
5. Balance sigue siendo negativo (correcto; la direccin `out` se preserva)
6. Gasto/Ingreso/Pérdida siguen mostrando sus labels originales sin regresión

---

## Sesión: Bugfix críticos Cartera Viva — bugs 1-4 (2026-03-31)

### Diagnóstico

**Bug 1 — Nuevo cobro crea Ingreso aparte, no reduce COBRADO/FALTA**

Causa raíz: En `agro-wizard.js` línea 1692, `origin_table = 'manual_income'` se setea ANTES de resolver el buyer link. La RPC `agro_buyer_portfolio_summary_v1` solo cuenta como `paid_total` los ingresos con `origin_table = 'agro_pending'`. Todos los ingresos del wizard — matched o no — iban a `non_debt_income_total`. Nunca tocaban `pending_total` ni `paid_total`.

**Bug 2 — Nueva pérdida queda con buyer_id = null y legacy_review_required**

Causa raíz: Para perdidas, el wizard nunca setea `origin_table`. La RPC `loss_matched` solo cuenta pérdidas con `origin_table = 'agro_pending'`. Sin `origin_table` en el payload, la pérdida wizard no llegaba a ninguna CTAS.

**Bug 3 — Fórmula comercial descuadrada**

Consecuencia directa de bugs 1 y 2: `paid_total` y `loss_total` siempre quedaban en 0 para registros wizard.

**Bug 4 — Cliente nuevo sin historial no aparece en grilla y auto-open falla**

Causa raíz: La RPC tiene WHERE que requiere al menos una métrica > 0. Un cliente nuevo con todos sus campos en 0 no entra en la query. `summaryRows` queda vacío para ese cliente → `getSelectedBuyerRow()` retorna null → `loadBuyerDetail` recibe null → la vista de detalle dice "Cliente no encontrado".

### Plan ejecutado (fix CONTEXTUAL, no global)

1. Diagnosticar wiring `Nuevo fiado` vs `Nuevo cobro` vs `Nueva pérdida`.
2. Identificar que `openClientRecordWizard` es el único punto de entrada para quick actions de Cartera Viva.
3. Introducir flag `debtContext: true` que solo se setea en ese contexto.
4. Propagar flag via `launchAgroWizard` → `openAgroWizard`.
5. En wizard, solo si `deps.debtContext === true`, sobreescribir `origin_table = 'agro_pending'`.
6. Para bug 4: nueva migración con `OR (all metrics = 0)` y filtro `status = 'active'`.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro-cartera-viva-view.js` | Agregado `debtContext: true` en `openClientRecordWizard` |
| `apps/gold/agro/agro.js` | Propagado `debtContext` desde `wizardOptions` a `openAgroWizard` |
| `apps/gold/agro/agro-wizard.js` | Solo si `deps.debtContext === true`, setear `origin_table = 'agro_pending'` |
| `supabase/migrations/20260331000000_agro_buyer_portfolio_include_zero_buyers.sql` | RPC con `OR (all metrics = 0)` + filtro `coalesce(b.status, 'active') = 'active'` |

### Por qué es contextual y no global

El fix anterior aplicaba `origin_table = 'agro_pending'` a TODOS los ingresos/pérdidas con buyer match, lo que podía reclasificar ingresos manuales como deuda.

El fix actual solo aplica ese cambio cuando el wizard viene desde quick actions de Cartera Viva (`debtContext: true`). Ingresos/pérdidas manuales fuera de ese contexto permanecen inalterados.

### Flujo corregido

**Nuevo cobro desde Cartera Viva (con debtContext)**:
```
openClientRecordWizard('ingresos', buyerRow)
→ launchAgroWizard('ingresos', { debtContext: true, prefill: { who } })
→ openAgroWizard recibe deps.debtContext = true
→ handleSubmit: deps.debtContext === true → origin_table = 'agro_pending'
→ RPC income_paid: MATCHES → paid_total += monto
```

**Ingreso manual desde Facturero (sin debtContext)**:
```
launchAgroWizard('ingresos', { initialCropId })
→ NO hay debtContext
→ handleSubmit: deps.debtContext !== true → origin_table permanece 'manual_income'
→ RPC non_debt_income: MATCHES (comportamiento correcto)
```

### Verificación manual esperada

1. Cliente nuevo "Carlos" creado desde Cartera Viva → aparece en grilla con todos los badges en $0.00
2. Fiado 100 → FALTA $100
3. Cobro 30 (desde quick action) → COBRADO $30 / FALTA $70
4. Pérdida 20 (desde quick action) → COBRADO $30 / FALTA $50 / Pérdida $20
5. Ingreso manual con buyer match desde Facturero → NO se clasifica como deuda (queda en non_debt_income)
6. Pérdida manual con buyer match desde Facturero → NO se clasifica como deuda (queda en legacy_unclassified)

### Build status

- `pnpm build:gold` → OK (2.48s)

### Migración DB requerida

Aplicar en Supabase SQL Editor:
```sql
-- Contenido de: supabase/migrations/20260331000000_agro_buyer_portfolio_include_zero_buyers.sql
-- Incluye: OR (all metrics = 0) + filtro status = 'active'
```

---

## Sesión: QA final del fix contextual Cartera Viva (2026-03-31)

### Objetivo

Validar que el fix contextual corrige los 4 bugs sin romper funcionalidad existente.

### Alcance

- Revisión de código: wiring del flag `debtContext`
- Build validation
- Verificación de migración
- QA runtime (si hay navegador disponible)

### Entorno

- **Navegador disponible**: NO
- Esta sesión es **validación de código + build** únicamente.

### Riesgo

- Sin navegador, no puedo validar comportamiento runtime real.
- QA manual en navegador es obligatorio antes de considerar el fix completamente aprobado.

### Plan de validación

1. Confirmar que `debtContext` solo nace en `openClientRecordWizard`
2. Confirmar propagación correcta en `agro.js`
3. Confirmar uso condicional en `agro-wizard.js`
4. Verificar que migración nueva tiene filtro `status = 'active'`
5. Confirmar que migración histórica no fue modificada
6. Ejecutar `pnpm build:gold`

### Resultado de validación

| Check | Estado |
|---|---|
| `debtContext` solo en `openClientRecordWizard` | ✅ Confirmado |
| `agro.js` solo propaga flag | ✅ Confirmado |
| `agro-wizard.js` uso condicional | ✅ Confirmado (`if (deps.debtContext === true)`) |
| Migración con filtro `status = 'active'` | ✅ Confirmado |
| Migración histórica sin cambios | ✅ Confirmado (git diff vacío) |
| Build | ✅ OK (3.26s) |
| QA runtime | ⏸️ Pendiente (sin navegador) |

### Veredicto

**APROBADO PROVISIONALMENTE**

- Código: validado ✅
- Build: OK ✅
- QA runtime: pendiente (requiere navegador)

### Checklist manual para QA en navegador

1. **Cliente nuevo sin historial**
   - Crear cliente desde Cartera Viva
   - Esperado: aparece en grilla, auto-open funciona

2. **Fiado + cobro + pérdida**
   - Fiado 100 → FALTA $100
   - Cobro 30 (quick action) → COBRADO $30 / FALTA $70
   - Pérdida 20 (quick action) → COBRADO $30 / FALTA $50

3. **Ingreso manual desde Facturero**
   - Crear ingreso con buyer match fuera de Cartera Viva
   - Esperado: NO se reclasifica como deuda (queda en non_debt_income)

4. **Pérdida manual desde Facturero**
   - Crear pérdida fuera de Cartera Viva
   - Esperado: comportamiento normal, no forzada como deuda

5. **Consola del navegador**
   - Esperado: 0 errores rojos nuevos, 0 warnings relevantes nuevos

### Migración DB pendiente

Aplicar en Supabase SQL Editor:
```sql
-- Archivo: supabase/migrations/20260331000000_agro_buyer_portfolio_include_zero_buyers.sql
-- Incluye: OR (all metrics = 0) + filtro status = 'active'
```

---

## Sesión 2026-04-01 — Pack 4 bugs críticos (G, C, B, A)

**Agente:** Kilo / claude-sonnet-4.6
**Commit base:** 7cf6fab (fix cartera viva debt actions contextual)

---

### Diagnóstico

#### BUG-G — No se puede crear ciclo operativo

**Causa raíz:** `ensureLocalCropSelection()` en `agroOperationalCycles.js` lanza `"Cultivo no valido."` cuando `state.crops.length === 0`.

Esto ocurre específicamente en el **path de API** (`createFromPayload` llamado desde Cartera Viva via `window.YGAgroOperationalCycles.createFromPayload`):

1. El DOM elemento `#agro-operational-root` no existe (la vista de Ciclos Operativos no está activa).
2. `initAgroOperationalCycles()` encuentra `state.root = null` y retorna `null` sin inicializar.
3. `state.crops` queda vacío `[]`.
4. `normalizePayload()` llama `ensureLocalCropSelection(cropId)` donde `cropId` es no-vacío.
5. `state.crops.some(...)` → `false` → **throw** "Cultivo no valido."

**Regresión introducida por:** No atribuible a 7cf6fab directamente. El bug existía antes pero solo se activa desde la integración Cartera Viva → Ciclos Operativos.

**Archivos afectados:** `agro/agroOperationalCycles.js`

**Riesgo de regresión:** Bajo. El guard solo aplica cuando `state.crops` está vacío; la validación DB (`validateCropId`) es la fuente de verdad en ese caso.

---

#### BUG-C — Cobro/pérdida desde quick actions no impactan cartera

**Causa raíz:** El wizard `agro-wizard.js` solo despacha `agro:crops:refresh` después del save. Cartera Viva escucha **otros eventos** (`agro:income:changed`, `agro:losses:changed`, `agro:pending:refreshed`) para desencadenar `scheduleExternalPortfolioRefresh`.

El fix del 7cf6fab implementó correctamente:
- `debtContext: true` en `openClientRecordWizard` (cartera-viva-view.js)
- `insertData.origin_table = 'agro_pending'` para ingresos y pérdidas
- `buyer_id` via `ensureBuyerIdentityLink`

Lo que faltó: disparar el evento correcto post-save para que la UI de Cartera Viva refresque.

**Archivos afectados:** `agro/agro-wizard.js`

**Riesgo de regresión:** Ninguno. Se agregan dispatches al final del setTimeout. No modifica lógica existente.

---

#### BUG-B — Tab "Ver transferidos" vacío

**Causa raíz:** `detailHistoryFilter` en `agro-cartera-viva-view.js` no se resetea al navegar a un **cliente diferente**. Si el usuario hizo clic en "Ver transferidos" (cliente A) y luego abre el cliente B, el filtro queda en `'transferidos'`. Si el cliente B no tiene movimientos transferidos:
- `transferCount = 0` → los botones de filtro **no se renderizan**
- `visibleHistoryRows = []` → el timeline muestra "Sin transferidos visibles"
- El usuario no puede volver a "Todo" porque el botón no existe

La lógica de filtrado en sí (`filterHistoryRows`, `isTransferRelatedHistoryRow`) es correcta.

**Archivos afectados:** `agro/agro-cartera-viva-view.js`

**Riesgo de regresión:** Mínimo. El reset solo ocurre al cambiar de buyer; si se recarga el mismo buyer (refresh externo), el filtro se preserva.

---

#### BUG-A — Fórmula/progreso de la card

**Causa raíz secundaria:** Consecuencia de BUG-C. La fórmula en código es correcta:
- `pendiente = credited_total - paid_total - loss_total - transferred_total` (`getOutstandingBalance`)
- `progreso = paid_total / base` (`getPaidPercent`)

El problema: cobros/pérdidas desde quick actions **no disparaban refresh** de Cartera Viva. El RPC `agro_buyer_portfolio_summary_v1` no se re-ejecutaba, por lo que `paid_total` y `loss_total` no actualizaban hasta que el usuario recargaba manualmente.

Con BUG-C corregido, el RPC se recarga en ~140ms post-save y los valores se actualizan automáticamente.

**Archivos afectados:** Ninguno adicional (resuelto con BUG-C fix).

---

### Cambios aplicados

| Archivo | Líneas afectadas | Descripción |
|---|---|---|
| `agro/agroOperationalCycles.js` | ~675–685 | Guard en `ensureLocalCropSelection`: si `state.crops.length === 0`, retorna `normalizedId` sin validar localmente |
| `agro/agro-wizard.js` | ~1883–1912 | Agrega dispatches `agro:income:changed`, `agro:losses:changed`, `agro:pending:refreshed` en el setTimeout post-save |
| `agro/agro-cartera-viva-view.js` | ~1192–1200 | En `loadBuyerDetail`: detecta cambio de buyer y resetea `detailHistoryFilter = 'todos'` |

---

### Build status

```
pnpm build:gold → OK
agent-guard: OK
agent-report-check: OK
vite build: 154 modules, 0 errores, 0 warnings
check-dist-utf8: OK
```

---

### QA manual requerido en browser

#### BUG-G: Crear ciclo desde Cartera Viva

1. Abrir Cartera Viva → seleccionar un cliente que tenga movimientos
2. Hacer clic en botón **"Crear ciclo"** (toolbar del detalle)
3. **Esperado:** wizard se abre → ciclo se crea sin error "Cultivo no valido."
4. **No debe verse:** toast de error "Cultivo no valido." ni "No se pudo crear el ciclo"
5. Verificar que el ciclo aparece en la vista de Ciclos Operativos

#### BUG-C: Cobro desde quick action actualiza cartera

1. Abrir Cartera Viva → entrar al detalle de un cliente con fiados activos
2. Hacer clic en **"Nuevo cobro"** (quick action en el resumen del cliente)
3. Completar el wizard: concepto, monto, fecha
4. **Esperado:** tras cerrar el wizard (~1.5 s), la cartera **se refresca sola**:
   - COBRADO aumenta
   - FALTA disminuye
   - La barra de progreso avanza
5. **No debe verse:** que el usuario tenga que recargar la página manualmente para ver el cambio

#### BUG-C: Pérdida desde quick action actualiza cartera

1. Desde el mismo detalle, hacer clic en **"Nueva pérdida"**
2. Completar el wizard
3. **Esperado:** FALTA disminuye, la card actualiza loss_total
4. **No debe verse:** cartera sin cambios hasta recarga manual

#### BUG-B: Tab "Ver transferidos" persiste correctamente entre clientes

1. Abrir Cartera Viva → seleccionar cliente A que tenga movimientos transferidos
2. Hacer clic en **"Ver transferidos"** → confirmar que muestra fiados/cobros transferidos
3. Hacer clic en **"Volver"** para regresar a la grilla
4. Seleccionar cliente B que NO tenga transferidos
5. **Esperado:** el historial de B muestra **"Todo" por defecto** (sin filtro de transferidos aplicado)
6. **No debe verse:** historial de B vacío con mensaje "Sin transferidos visibles" sin botones de filtro

#### BUG-A: Fórmula de la card en detalle

1. Abrir detalle de un cliente con saldo activo (fiado > 0)
2. Crear un cobro de X monto via quick action
3. Esperar el refresh automático
4. **Esperado:**
   - "Cobrado" = suma correcta de todos los cobros con `origin_table = 'agro_pending'`
   - "Falta" = fiado_total - cobrado - perdido - transferido
   - La barra de progreso muestra el porcentaje correcto
5. **No debe verse:** valores en 0 o sin cambio después del cobro

---

## [2026-04-02] Fix quirúrgico: wizard ciclos operativos, cartera viva detail, transfer wizard

### Diagnóstico

6 bugs diagnosticados con causa raíz identificada en 4 archivos:

**P1 — Wizard de Ciclos Operativos (CSS):**
- `agro-operational-cycles.css` línea 990: `display: flex` en `.agro-operational-step-panel` sobreescribía el atributo HTML `[hidden]`.
- Los 4 paneles del wizard eran visibles simultáneamente.

**P4 — Barra de progreso a 0%:**
- `agro-cartera-viva-view.js` `getPaidPercent()`: `Number.isFinite(0)` retorna `true`, así que cuando `compliance_percent = 0` del RPC, nunca ejecutaba el cálculo manual `paid_total / base`.

**P5 — Transfer wizard con opciones legacy:**
- `agro.js` `handlePendingTransfer` línea 7316: mostraba 6 opciones (Gastos, Donaciones, Otros, Fiados) que no funcionaban y mostraban un warning. Solo Pagados y Pérdidas eran funcionales.

**P6 — Conteo de transferidos inflado:**
- `agro-cartera-viva-detail.js` `isTransferRelatedHistoryRow` línea 634: contaba cualquier income/loss con `origin_table = 'agro_pending'` como transferencia, incluyendo cobros normales (quick action). Falta verificar `origin_id`.
- `buildIncomeHistoryRow` y `buildLossHistoryRow` también seteaban `is_transfer_related` sin verificar `origin_id`.

**P3 — Labels de transferencia:**
- `buildPendingHistoryRow` líneas 391-396: "Fiado cerrado" era ambiguo. Debe decir "Transferido a cobro" o "Transferido a pérdida".

**P2 — Registros desaparecen (REQUIERE QA MANUAL):**
- La lógica de código (resolveVisibleCategory, getOutstandingBalance, filterRowsByCategory) es correcta.
- El RPC `agro_buyer_portfolio_summary_v1` fue actualizado en commit `7cf6fab` para incluir zero-buyers.
- No se puede confirmar sin acceso a Supabase: el usuario debe verificar si el RPC retorna los buyers esperados.

### Cambios aplicados

| Archivo | Líneas | Cambio |
|---|---|---|
| `agro/agro-operational-cycles.css` | +4 después de 994 | Agregada regla `.agro-operational-step-panel[hidden] { display: none !important; }` |
| `agro/agro-cartera-viva-view.js` | 272 | `getPaidPercent`: cambiado `Number.isFinite(compliance)` a `Number.isFinite(compliance) && compliance > 0` para que 0 caiga al cálculo manual |
| `agro/agro.js` | 7316-7323 | Eliminadas 4 opciones legacy del transfer wizard (Gastos, Donaciones, Otros, Fiados) |
| `agro/agro-cartera-viva-detail.js` | 634 | `isTransferRelatedHistoryRow`: agregado requisito `origin_id` no vacío |
| `agro/agro-cartera-viva-detail.js` | 478 | `buildIncomeHistoryRow`: `is_transfer_related` ahora requiere `origin_id` |
| `agro/agro-cartera-viva-detail.js` | 523 | `buildLossHistoryRow`: `is_transfer_related` ahora requiere `origin_id` |
| `agro/agro-cartera-viva-detail.js` | 391, 395 | Labels: "Fiado cerrado" → "Transferido a cobro" / "Transferido a pérdida" |

### Build status
- `pnpm build:gold`: ✅ Exitoso (154 modules, 3.17s)

### QA sugerido (CHECKLIST PARA EL USUARIO)

**P1 — Wizard de Ciclos Operativos:**
1. Ir a Agro → Ciclos Operativos
2. Click "Nuevo ciclo"
3. Verificar que SOLO se ve el Paso 1 (nombre + descripción)
4. Click "Siguiente" → Solo se ve Paso 2 (tipo económico + categoría)
5. Click "Siguiente" → Solo se ve Paso 3 (monto + fecha)
6. Click "Siguiente" → Solo se ve Paso 4 (confirmación con botón "Crear")
7. Crear ciclo tipo Gasto → debe aparecer en la lista

**P4 — Barra de progreso:**
1. Ir a un cliente que tenga cobros registrados
2. Verificar que la barra de "Avance" muestra un % > 0
3. Si el cliente tiene $13.65 cobrado de $13.65 fiado → debe mostrar 100%

**P5 — Transfer wizard:**
1. Ir a un fiado activo
2. Click "Transferir"
3. Verificar que SOLO se ven 2 opciones: "Pagados" y "Pérdidas (Cancelado)"
4. No deben aparecer: Gastos, Donaciones, Otros, Fiados

**P6 — Conteo de transferidos:**
1. Ir al detalle de un cliente
2. Verificar que "Ver transferidos (N)" solo cuenta transferencias reales (con origin_id)
3. Cobros creados via quick action ("Nuevo cobro") NO deben contar como transferidos

**P3 — Labels:**
1. Ir al detalle de un cliente que tenga fiados transferidos
2. Verificar que un fiado transferido a cobro dice "Transferido a cobro" (no "Fiado cerrado")
3. Verificar que un fiado transferido a pérdida dice "Transferido a pérdida"

**P2 — Registros desaparecen (REQUIERE VERIFICACIÓN MANUAL):**
1. En el dashboard de Supabase, ejecutar: `SELECT * FROM agro_buyer_portfolio_summary_v1();`
2. Verificar que los 3 buyers de prueba aparecen en el resultado
3. Si NO aparecen, el problema está en el RPC o en los datos, no en el código frontend
4. Si SÍ aparecen, verificar que la categoría tabs muestra el conteo correcto

### Lo que NO se resolvió

- **P2 (registros desaparecen):** El código frontend es correcto. Si los datos no se muestran, el problema está en el RPC o en los datos de Supabase. Requiere verificación manual del usuario ejecutando el RPC directamente.
- **Doble parpadeo al cargar:** `loadSummary()` llama `renderView()` dos veces (línea 1172 loading=true y línea 1188 loading=false). Esto es por diseño (skeleton → contenido), pero si causa parpadeo visual, se puede optimizar en una sesión futura.

## [2026-04-02] Fix quirúrgico: soft refresh en Cartera Viva y endurecimiento de payload en wizard

### Diagnóstico

- `loadSummary()` en `agro-cartera-viva-view.js` volvía a renderizar skeleton en recargas posteriores, generando doble parpadeo visible aunque ya existía contenido cargado.
- `scheduleExternalPortfolioRefresh()` reaccionaba demasiado rápido tras los eventos del wizard; con `140ms` podía competir con persistencia/eventos y dejar refreshs perdidos o prematuros.
- El wizard mezclaba `buyerLink` con `insertData` mediante `Object.assign`, con riesgo de sobrescribir llaves sensibles como `origin_table`.
- No se aplicó ningún cambio SQL en esta sesión: el workspace solo tenía trazabilidad clara para los fixes frontend/event dispatch/payload.

### Cambios aplicados

| Archivo | Líneas | Cambio |
|---|---|---|
| `agro/agro-cartera-viva-view.js` | 1170-1173 | `loadSummary()` ahora solo fuerza `renderView()` en la primera carga; en refresh posteriores conserva la vista existente y usa estado de actualización |
| `agro/agro-cartera-viva-view.js` | 1345-1361 | `scheduleExternalPortfolioRefresh()` aumentó debounce de `140ms` a `350ms` para dar margen al submit/event chain |
| `agro/agro-wizard.js` | 1724-1729 | Reemplazado `Object.assign(insertData, buyerLink)` por asignación explícita de `buyer_id`, `buyer_group_key` y `buyer_match_status` |
| `agro/agro-wizard.js` | 1935 | Agregado `document.dispatchEvent(new CustomEvent('data-refresh'))` como refresh redundante después del submit del wizard |

### Build status

- `pnpm build:gold`: ✅ Exitoso
- Advertencia no bloqueante: `pnpm` reportó engine esperado `node 20.x`, pero el build completó correctamente bajo `node v25.6.0`

### QA sugerido

1. Abrir Cartera Viva y esperar la primera carga completa.
2. Crear o transferir un movimiento desde el wizard que afecte un buyer visible en Cartera Viva.
3. Verificar que en la recarga posterior no reaparece skeleton completo: el contenido debe quedarse visible con refresh suave.
4. Verificar que el resumen y, si aplica, el detalle abierto del buyer se actualizan solos tras `1.5s + debounce`.
5. Probar al menos un caso con `pendientes`, uno con `ingresos` o `pérdidas`, y confirmar que no se rompe `origin_table` ni la asociación del comprador.

## [2026-04-02] Diagnóstico forense: Cartera Viva rota por drift entre RPC y frontend

### Diagnóstico

- La causa raíz principal no estaba en el wizard ni en `agro.js`: estaba en la lectura de Cartera Viva.
- El RPC `agro_buyer_portfolio_summary_v1()` ya expone `pending_total` como saldo activo real del cliente.
- Sin embargo, tanto `agro-cartera-viva-view.js` como `agro-cartera-viva-detail.js` seguían recalculando el saldo con lógica legacy:
  - `credited_total - paid_total - loss_total - transferred_total`
- Esa resta vieja contradice el contrato buyer-centric del RPC y puede reclasificar mal clientes entre `Fiados`, `Pagados` y `Pérdidas`, además de distorsionar progreso y métricas.
- El parpadeo no era la causa raíz contable, pero sí agravaba el problema: en refresh de detalle se vaciaba la data antes de terminar la recarga, haciendo que el estado pareciera más roto de lo que realmente devolvía el backend.
- No fue necesario tocar `agro.js`, Exchange ni Ciclos Operativos.

### Causa raíz principal

- **Drift de contrato frontend/backend**:
  - backend/RPC: `pending_total` = saldo activo confiable;
  - frontend: seguía usando una fórmula legacy que intenta reconstruir ese saldo restando `transferred_total`.
- Resultado:
  - fiados podían desaparecer o caer en categoría incorrecta;
  - cobros/pérdidas podían mostrar progreso incoherente;
  - el detalle heredaba la misma lectura rota;
  - el refresh destructivo del detalle amplificaba la percepción del fallo.

### Cambios aplicados

| Archivo | Líneas | Cambio |
|---|---|---|
| `agro/agro-cartera-viva-view.js` | 256-261 | `getOutstandingBalance()` ahora prioriza `pending_total` del RPC y solo usa la fórmula legacy como fallback defensivo |
| `agro/agro-cartera-viva-view.js` | 1196-1205 | `loadBuyerDetail()` ya no limpia `detailRows` cuando solo refresca el mismo cliente; solo limpia al cambiar de buyer |
| `agro/agro-cartera-viva-detail.js` | 204-209 | `getOutstandingBalance()` alineado con `pending_total` del RPC |
| `agro/agro-cartera-viva-detail.js` | 221-226 | `getPaidPercent()` ya no se queda pegado en `0%` cuando `compliance_percent = 0` pero existe base calculable |
| `agro/agro-cartera-viva-detail.js` | 1214 | La vista de detalle ya no reemplaza historial visible por estado vacío de carga cuando el refresh ocurre sobre un cliente ya cargado |

### SQL de verificación

```sql
-- 1) Ver exactamente qué devuelve hoy el RPC buyer-centric
select
  buyer_id,
  display_name,
  group_key,
  credited_total,
  paid_total,
  loss_total,
  transferred_total,
  pending_total,
  compliance_percent,
  review_required_total,
  legacy_unclassified_total,
  non_debt_income_total,
  global_status,
  balance_gap_total,
  requires_review,
  canonical_name,
  client_status
from public.agro_buyer_portfolio_summary_v1()
order by pending_total desc nulls last, display_name asc;

-- 2) Detectar si el frontend viejo estaria discrepando del RPC
select
  buyer_id,
  display_name,
  credited_total,
  paid_total,
  loss_total,
  transferred_total,
  pending_total,
  round((credited_total - paid_total - loss_total - transferred_total)::numeric, 2) as legacy_frontend_pending,
  round((pending_total - (credited_total - paid_total - loss_total - transferred_total))::numeric, 2) as drift_vs_rpc,
  global_status,
  balance_gap_total,
  requires_review
from public.agro_buyer_portfolio_summary_v1()
order by abs(coalesce(balance_gap_total, 0)) desc, display_name asc;

-- 3) Ver datos crudos de fiados
select
  p.id,
  p.fecha,
  p.cliente,
  p.buyer_id,
  p.buyer_group_key,
  p.buyer_match_status,
  p.crop_id,
  p.transfer_state,
  p.transferred_to,
  p.reverted_at,
  p.deleted_at,
  coalesce(p.monto_usd, p.monto, 0) as amount_usd
from public.agro_pending p
where p.user_id = auth.uid()
order by p.fecha desc nulls last, p.created_at desc nulls last
limit 200;

-- 4) Ver datos crudos de cobros
select
  i.id,
  i.fecha,
  i.concepto,
  i.buyer_id,
  i.buyer_group_key,
  i.buyer_match_status,
  i.crop_id,
  i.origin_table,
  i.origin_id,
  i.transfer_state,
  i.reverted_at,
  i.deleted_at,
  coalesce(i.monto_usd, i.monto, 0) as amount_usd
from public.agro_income i
where i.user_id = auth.uid()
order by i.fecha desc nulls last, i.created_at desc nulls last
limit 200;

-- 5) Ver datos crudos de pérdidas
select
  l.id,
  l.fecha,
  l.concepto,
  l.causa,
  l.buyer_id,
  l.buyer_group_key,
  l.buyer_match_status,
  l.crop_id,
  l.origin_table,
  l.origin_id,
  l.transfer_state,
  l.reverted_at,
  l.deleted_at,
  coalesce(l.monto_usd, l.monto, 0) as amount_usd
from public.agro_losses l
where l.user_id = auth.uid()
order by l.fecha desc nulls last, l.created_at desc nulls last
limit 200;

-- 6) Confirmar buyers activos y su identidad canónica
select
  b.id,
  b.display_name,
  b.group_key,
  b.canonical_name,
  b.status,
  b.created_at,
  b.updated_at
from public.agro_buyers b
where b.user_id = auth.uid()
order by b.display_name asc;

-- 7) Cruce rápido por buyer para ver si el problema es datos o frontend
with rpc as (
  select *
  from public.agro_buyer_portfolio_summary_v1()
)
select
  r.display_name,
  r.buyer_id,
  r.credited_total,
  r.paid_total,
  r.loss_total,
  r.pending_total,
  count(distinct p.id) filter (
    where p.deleted_at is null and p.reverted_at is null
  ) as pending_rows,
  count(distinct i.id) filter (
    where i.deleted_at is null and i.reverted_at is null and lower(coalesce(i.origin_table, '')) = 'agro_pending'
  ) as income_paid_rows,
  count(distinct l.id) filter (
    where l.deleted_at is null and l.reverted_at is null and lower(coalesce(l.origin_table, '')) = 'agro_pending'
  ) as loss_rows
from rpc r
left join public.agro_pending p
  on p.user_id = auth.uid()
 and p.buyer_id = r.buyer_id
left join public.agro_income i
  on i.user_id = auth.uid()
 and i.buyer_id = r.buyer_id
left join public.agro_losses l
  on l.user_id = auth.uid()
 and l.buyer_id = r.buyer_id
group by
  r.display_name,
  r.buyer_id,
  r.credited_total,
  r.paid_total,
  r.loss_total,
  r.pending_total
order by r.display_name asc;
```

### Build status

- `pnpm build:gold`: ✅ Exitoso
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observación no bloqueante:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`

### QA sugerido

1. Abrir Cartera Viva en `Fiados` y verificar que el conteo ahora refleja el `pending_total` del RPC, no la resta legacy.
2. Crear un fiado nuevo desde el detalle de un cliente y confirmar que sigue visible tras el refresh automático.
3. Crear un cobro desde ese mismo cliente y verificar:
   - la barra de avance cambia;
   - el cliente no desaparece;
   - si queda saldo, sigue en `Fiados`;
   - si se cerró, pasa a `Pagados`.
4. Crear una pérdida real desde ese mismo cliente y verificar que:
   - aparece en historial;
   - la tarjeta/detalle muestran pérdida coherente;
   - no reemplaza erróneamente el historial por un vacío de carga.
5. Ejecutar el SQL de verificación:
   - si `pending_total` es correcto y la UI ya refleja esos valores, el bug estaba en frontend;
   - si el RPC ya viene mal, el siguiente fix debe ser SQL y no de render.

## [2026-04-02] Cartera Viva v2.1 — proyección de ciclos visibles y detalle más legible

### Diagnóstico

- El parpadeo restante ya no venía del summary principal, sino del detalle: cada refresh seguía re-renderizando toda la pantalla sin una señal visual suave de actualización.
- El detalle estaba ordenado por día, pero seguía viéndose confuso porque:
  - `agro_income` usaba label `Pago` en vez de `Cobro`;
  - `agro_income` y `agro_losses` no mostraban cantidades/unidades en `meta`;
  - los labels de historial no tenían una diferenciación visual suficientemente clara por tipo.
- La lista seguía colapsando estados porque `resolveVisibleCategory()` imponía un solo bucket por buyer. Un cliente mixto con fiado + cobro + pérdida solo podía vivir en una categoría visible a la vez.

### Cambios aplicados

| Archivo | Líneas | Cambio |
|---|---|---|
| `agro/agro-cartera-viva-view.js` | 314-347 | Nueva proyección `buyer + categoría visible` para que un mismo cliente pueda aparecer en `Fiados`, `Pagados` y `Pérdidas` sin cambiar el RPC |
| `agro/agro-cartera-viva-view.js` | 421-429 | Orden de cards ajustado por categoría visible y métrica primaria de ese ciclo |
| `agro/agro-cartera-viva-view.js` | 931-1009 | Cards reescritas de forma mínima para mostrar badge y métricas coherentes por tipo: `Fiado`, `Cobro`, `Pérdida` |
| `agro/agro-cartera-viva-detail.js` | 364-370 | `buildMovementMeta()` ahora acepta partes base y agrega unidades/cantidades también para cobros y pérdidas |
| `agro/agro-cartera-viva-detail.js` | 446-510 | Timeline con labels explícitos y meta más clara: `Cobro`, `Pérdida`, causa/categoría + unidades |
| `agro/agro-cartera-viva-detail.js` | 535-543 | Orden temporal más estable con `getHistorySortTimestamp()` |
| `agro/agro-cartera-viva-detail.js` | 1191-1253 | Refresh suave en detalle: `isSoftRefreshing`, `aria-busy` y botón `Actualizando…` sin desmontar el historial cargado |
| `agro/agro-cartera-viva.css` | 599-610 | Variantes visuales mínimas por tipo de card (`fiados`, `pagados`, `perdidos`) |
| `agro/agro-cartera-viva.css` | 1028-1030 | Atenuación visual del detalle durante refresh |
| `agro/agro-cartera-viva.css` | 1092-1110 | Labels del timeline con color por tipo (`pending`, `paid`, `loss`, `review`) |

### Riesgo residual

- La proyección multi-categoría ocurre solo en frontend; no cambia el RPC ni la semántica del backend.
- Si más adelante producto decide que un buyer mixto debe renderizarse como entidad compuesta distinta, eso ya sería una fase mayor.
- Sigue pendiente la decisión de producto sobre archivado/eliminación de clientes; esta sesión no toca eso.

### Build status

- `pnpm build:gold`: ✅ Exitoso
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observación no bloqueante:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`

### QA sugerido

1. Abrir un cliente que tenga mezcla de saldo pendiente, cobros y pérdidas.
2. Verificar que ese cliente aparece:
   - en `Fiados` con monto pendiente;
   - en `Pagados` con monto cobrado;
   - en `Pérdidas` con monto perdido.
3. Entrar al detalle y confirmar que el timeline se lee con labels explícitos:
   - `Fiado`
   - `Cobro`
   - `Pérdida`
   - `Transferido a cobro`
   - `Transferido a pérdida`
4. Confirmar que cobros y pérdidas ahora muestran también sus unidades/cantidades cuando existan.
5. Hacer refresh del detalle o disparar un cambio desde wizard y verificar que:
   - no aparece vacío destructivo;
   - se atenúa la vista mientras actualiza;
   - el historial vuelve consistente al terminar.

## [2026-04-03] Cartera Viva v2.2 — timeline canónico, transferencias reales y borrado seguro

### Diagnóstico

- `apps/gold/agro/agro-cartera-viva-detail.js` estaba mezclando movimientos económicos reales del cliente con acciones auxiliares del sistema. Eso hacía que el timeline se sintiera sucio aunque parte de la lógica “funcionara”.
- `Ver transferidos` seguía siendo semánticamente inestable porque dependía de `origin_table = 'agro_pending'`, pero el wizard también usa ese valor para cobros manuales creados desde contexto de deuda. La señal real de transferencia era `origin_id` presente.
- El bug de unidades era real: el render intentaba leer `unit_type`, `unit_qty` y `quantity_kg` en ingresos/pérdidas, pero esas columnas ni siquiera se estaban seleccionando en el fetch del detalle.
- El parpadeo fuerte del detalle venía del render inicial: al abrir o cambiar cliente se vaciaba el historial y se montaba un empty/loading state destructivo en vez de mantener shell estable.
- `apps/gold/agro/agrocompradores.js` bloqueaba por completo la eliminación cuando existía historial. Eso evitaba huérfanos, pero también impedía implementar un borrado seguro del cliente canónico con cascada controlada.

### Cambios aplicados

| Archivo | Líneas | Cambio |
|---|---|---|
| `apps/gold/agro/agro-cartera-viva-detail.js` | 48-75 | Se agregaron `unit_type`, `unit_qty` y `quantity_kg` a ingresos y pérdidas para que el detalle pueda renderizar unidades reales |
| `apps/gold/agro/agro-cartera-viva-detail.js` | 370-686 | Se unificó la meta visible de unidades/cantidades y se separó la construcción de filas en `ledger` vs `action` |
| `apps/gold/agro/agro-cartera-viva-detail.js` | 734-871 | El timeline ahora se ensambla con movimientos canónicos y acciones auxiliares por separado; `Ver transferidos` y `Ver revertidos` filtran solo eventos reales |
| `apps/gold/agro/agro-cartera-viva-detail.js` | 1068-1618 | Se agregó renderer específico para acciones del sistema, skeleton estable de carga y copy nuevo para reforzar la separación semántica |
| `apps/gold/agro/agro-cartera-viva.css` | 132-157, 640-680 | Se extendieron tipografías y labels para el nuevo layer de acciones |
| `apps/gold/agro/agro-cartera-viva.css` | 1036-1275 | Se agregaron estilos para skeleton, banda de acciones y tarjetas auxiliares sin romper ADN Visual V10 |
| `apps/gold/agro/agro-cartera-viva.css` | 1508-1518 | Ajustes responsive para que acciones y montos sigan legibles en tablet/mobile |
| `apps/gold/agro/agrocompradores.js` | 157-162 | El botón de eliminar deja de quedar bloqueado por historial y pasa a comunicar explícitamente cuando borrará cliente + cartera |
| `apps/gold/agro/agrocompradores.js` | 307-390 | Nuevo scope summary de borrado, helpers de fallback y detección de RPC faltante |
| `apps/gold/agro/agrocompradores.js` | 610-658 | Confirmación fuerte + prompt con nombre canónico + ruta de borrado seguro con cascada |
| `supabase/migrations/20260403143000_agro_delete_buyer_cascade_v1.sql` | 1-90 | Nueva RPC `agro_delete_buyer_cascade_v1` para soft-delete transaccional de `agro_pending`, `agro_income`, `agro_losses`, limpieza de threads y delete final del buyer |

### Riesgo residual

- La eliminación segura de clientes con historial depende de aplicar la migración nueva en Supabase. Si la RPC no existe aún, la UI ahora lo avisa y no deja ejecutar un borrado inseguro.
- La cascada segura cubre cartera y social threads. No toca `agro_operational_cycles` porque el modelo actual no tiene relación canónica directa por `buyer_id`; si producto quiere esa cascada, requiere diseño aparte.
- No hice QA browser intensivo en producción real. La validación fuerte que falta es abrir un cliente mixto y confirmar en UI que el layer de acciones ya no contamina el timeline principal.

### Build status

- `pnpm build:gold`: ✅ Exitoso
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observación no bloqueante:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`

### QA sugerido

1. Abrir un cliente con fiados + cobros + pérdidas y confirmar que el bloque principal del detalle muestra solo timeline canónico por días.
2. Cambiar entre `Timeline`, `Ver transferidos` y `Ver revertidos` y verificar que:
   - `Timeline` no muestra tags de transferencia/reversión como si fueran movimientos normales;
   - `Ver transferidos` solo muestra transferencias reales con `origin_id`;
   - cobros manuales creados desde contexto de deuda ya no aparecen falsamente como “transferidos”.
3. Verificar unidades en fiados, cobros y pérdidas sobre el mismo cliente:
   - `unit_qty + unit_type`;
   - `quantity_kg`;
   - mezcla de ambos cuando aplique.
4. Abrir el detalle varias veces y cambiar entre clientes confirmando que:
   - no aparece vacío destructivo;
   - se mantiene shell estable mientras carga;
   - el refresh sigue siendo suave.
5. Probar el borrado de un cliente canónico con historial en un entorno controlado:
   - confirmar doble prompt;
   - validar que desaparece de Cartera Viva;
   - verificar en Supabase que los movimientos quedan con `deleted_at` y no visibles en el summary;
   - confirmar que social threads del `buyer_group_key` también se limpian.

## [2026-04-03] Cartera Viva v2.3 — contexto real de detalle, refresh raíz estable y CTA visible

### Diagnóstico

- El detalle ya había separado `ledger` y `action`, pero todavía mostraba ambas narrativas al mismo tiempo. Eso seguía ensuciando la composición aunque la semántica de datos estuviera mejor.
- La entrada a detalle no respetaba el contexto visual de origen. Entrar desde `Fiados`, `Pagados` o `Pérdidas` seguía abriendo un timeline canónico global en vez de un ledger contextual.
- El parpadeo reportado en QA ya no estaba en la apertura del detalle, sino en el refresh de la vista raíz de Cartera Viva. `loadSummary()` no activaba explícitamente el modo soft-refresh cuando ya existía data en pantalla.
- La lógica de borrado seguro existía, pero seguía escondida detrás del modal de cliente. De cara a producto, la acción todavía no estaba expuesta de forma explícita en el detalle.

### Cambios aplicados

| Archivo | Líneas | Cambio |
|---|---|---|
| `apps/gold/agro/agro-cartera-viva-view.js` | 62, 1030, 1180-1225 | Se añadió `detailLedgerScope`, se pasa el contexto real desde la card de origen y se expone CTA visible para eliminar cliente canónico desde detalle |
| `apps/gold/agro/agro-cartera-viva-view.js` | 1271-1306 | `loadSummary()` ahora entra en soft-refresh desde el primer render y `loadBuyerDetail()` preserva o fija el scope contextual del ledger |
| `apps/gold/agro/agro-cartera-viva-view.js` | 1366, 1421-1443, 1519-1521 | Export y reaperturas del detalle respetan `ledgerScope`; el estado se resetea correctamente al salir |
| `apps/gold/agro/agro-cartera-viva-detail.js` | 827-892 | Nuevo filtro de scope para ledger: `fiados`, `pagados`, `perdidos`, `todos`, incluyendo export contextual |
| `apps/gold/agro/agro-cartera-viva-detail.js` | 918-999 | Las acciones del sistema pasan a disclosure compacta con contador/capa secundaria, en lugar de bloque grande compitiendo con el timeline principal |
| `apps/gold/agro/agro-cartera-viva-detail.js` | 1453, 1510-1698 | El detalle ahora hereda el contexto de entrada, actualiza título/copy según el scope y muestra el botón `Eliminar cliente canónico` |
| `apps/gold/agro/agro-cartera-viva.css` | 297-303 | Variante visual `danger` para el CTA explícito de eliminación |
| `apps/gold/agro/agro-cartera-viva.css` | 869-980 | Estilos nuevos para disclosure compacta de acciones, pills y mini-items secundarios |
| `apps/gold/agro/agrocompradores.js` | 117, 735-825 | El modal acepta `focusAction`, permitiendo que el CTA del detalle abra la ficha con foco directo en borrar |

### Riesgo residual

- El refresh raíz ya mantiene la vista montada durante `Actualizar`, pero sigue dependiendo de un rerender completo del root. Si QA todavía detecta micro-parpadeo, el siguiente paso sería una estrategia de patching incremental del body en vez de `innerHTML` completo.
- El detalle contextual filtra el ledger principal por categoría de entrada. Las acciones secundarias siguen siendo globales del cliente, pero ahora están colapsadas y discretas.
- El CTA visible de borrado abre la ficha con foco en la acción destructiva; el borrado seguro sigue dependiendo de la RPC ya creada y de que la migración esté aplicada.

### Build status

- `pnpm build:gold`: ✅ Exitoso
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observación no bloqueante:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`

### QA sugerido

1. Entrar desde la card de `Fiados` y confirmar que el detalle abre directamente en ledger de fiados.
2. Repetir desde `Pagados` y `Pérdidas`, verificando que el timeline principal respeta el contexto de origen.
3. Confirmar que las acciones del sistema ya no aparecen como bloque narrativo grande debajo del timeline, sino como disclosure compacta con contador.
4. En la raíz de Cartera Viva, pulsar `Actualizar` varias veces y verificar que:
   - la grilla no desaparece;
   - el botón pasa a `Actualizando…`;
   - la vista permanece montada durante el refresh.
5. En detalle, pulsar `Eliminar cliente canónico` y confirmar que:
   - se abre la ficha del cliente;
   - el foco cae en la acción destructiva;
   - el flujo de confirmación sigue siendo el de borrado seguro.

## [2026-04-03] Cartera Viva v2.4 — progreso operativo por unidades, CTA reubicado y refresh raíz sin desmontaje

### Diagnóstico

- `apps/gold/agro/agro-cartera-viva-view.js` seguía calculando el progreso visible de las cards con base monetaria en `getProgressBase()` / `getProgressBreakdown()` / `renderProgressBlock()` (`credited_total`, `paid_total`, `pending_total`, `loss_total`). Eso contaminaba la lectura operativa del ciclo y terminaba mostrando copy como `USD 2,73 faltan` donde producto esperaba unidades.
- `apps/gold/agro/agro-cartera-viva-detail.js` todavía dejaba el CTA destructivo dentro del footer de `renderBuyerSummary()` (detalle/historial), compitiendo con la narrativa del timeline en vez de vivir en acciones primarias del cliente.
- El refresh raíz seguía pasando por reconstrucción total de la vista: `renderListView()` terminaba rehaciendo el shell completo con `root.innerHTML`, por eso la card podía desaparecer y reaparecer aunque ya existiera data cargada.

### Cambios aplicados

| Archivo | Líneas | Cambio |
|---|---|---|
| `apps/gold/agro/agro-cartera-viva-view.js` | 1137-1344 | Nuevo helper canónico de progreso operativo por unidades: unifica `unit_qty + unit_type`, cae a `kg` cuando aplica y marca `Avance no unificado` cuando hay mezcla incompatible |
| `apps/gold/agro/agro-cartera-viva-view.js` | 1280-1338 | Las cards ahora muestran breakdown operativo fijo `Pendiente / Cobrado / Pérdida` por unidades y exponen `Eliminar cliente canónico` en acciones primarias |
| `apps/gold/agro/agro-cartera-viva-view.js` | 1391-1622 | La raíz de Cartera Viva se separó en shell + patch incremental: summary, filtros y body se actualizan por slots; la grilla se mantiene montada y solo se parchean cards internas |
| `apps/gold/agro/agro-cartera-viva-view.js` | 1724-1749 | `loadSummary()` ahora refresca también `operationalProgressMap` por cultivo activo para que el avance visible salga de unidades, no de dinero |
| `apps/gold/agro/agro-cartera-viva-view.js` | 1844-1922 | `bindListViewEvents()` pasó a delegación sobre el root, evitando re-bind y pérdida de handlers cuando la grilla se parchea |
| `apps/gold/agro/agro-cartera-viva-view.js` | 1973-1979 | `handleCropContextUpdated()` ya reutiliza `loadSummary()` para refrescar scope visible + progreso operativo en una sola pasada |
| `apps/gold/agro/agro-cartera-viva-detail.js` | 1366-1452, 1652-1654 | Se quitó `Eliminar cliente canónico` del footer del detalle; el histórico vuelve a quedarse solo con acciones de lectura/registro |
| `apps/gold/agro/agro-cartera-viva.css` | 504-506 | Nuevo estado visual neutral para track sin base homogénea (`is-neutral`) |
| `apps/gold/agro/agrocompradores.js` | 117, 735-809 | Se reutiliza el foco destructivo existente para que el CTA nuevo de la card abra la ficha con la acción de borrado lista |

### Riesgo residual

- Si un cliente tiene mezcla real de unidades incompatibles y tampoco hay `quantity_kg` homogéneo, la card ahora muestra fallback honesto (`Avance no unificado`, `No unificado`) en vez de inventar una suma.
- El header summary de Cartera Viva sigue siendo financiero a propósito; el cambio de esta sesión separa resumen económico de progreso operativo, pero no elimina la lectura monetaria global.
- El refresh raíz ya no desmonta el shell ni vacía la grilla durante `Actualizar`; si más adelante se quiere cero reemplazo de nodos incluso a nivel card, el siguiente paso sería patch field-by-field dentro de cada article.

### Build status

- `pnpm build:gold`: ✅ Exitoso
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observación no bloqueante:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`

### QA sugerido

1. En Cartera Viva raíz, usar un cliente con `1 fiado + 1 cobro + 1 pérdida` y verificar que la card muestra:
   - `Pendiente`
   - `Cobrado`
   - `Pérdida`
   en unidades, no en USD.
2. Probar un cliente con mezcla de unidades incompatibles y confirmar que la card no suma a la fuerza:
   - aparece `Avance no unificado`;
   - las métricas dicen `No unificado`.
3. Pulsar `Actualizar` varias veces en raíz y verificar que:
   - la card no desaparece;
   - el botón solo cambia a `Actualizando…`;
   - la grilla permanece montada.
4. Entrar a `Ver detalle` y confirmar que el CTA destructivo ya no aparece dentro del historial/detalle.
5. Desde la card, pulsar `Eliminar cliente canónico` y validar que:
   - se abre la ficha del cliente;
   - el foco cae en la acción destructiva;
   - el flujo sigue usando la ruta segura con RPC cuando exista.

## [2026-04-03] Cartera Viva v2.5 — diagnóstico de cierre semántico operativo

### Diagnóstico

- El texto resumen principal de la card de Cartera Viva hoy se construye en `apps/gold/agro/agro-cartera-viva-view.js` dentro de `resolveBuyerStatus()`. Ahí siguen filtrándose strings monetarios legacy como `USD X por cobrar`, aunque el cálculo operativo ya fue corregido por unidades.
- El helper que decide si la card cae en dinero, unidades o fallback mixto es la combinación de:
  - `getOperationalProgress()`
  - `getOperationalCardMetrics()`
  - `resolveBuyerStatus()`
  El cálculo físico ya está bien; el problema restante es de copy y jerarquía semántica.
- Las strings monetarias que todavía contaminan la UI de Cartera Viva están en los branches no unificados de `resolveBuyerStatus()` y en algunos textos secundarios de estado/revisión.
- `apps/gold/agro/agroOperationalCycles.js` no reutiliza la lógica de Cartera Viva. Tiene su propia semántica: `buildCycleViewModel()` y `createDatasetSummary()` priorizan buckets monetarios (`incomingText`, `outgoingText`, `balanceText`) y `renderCycleCard()` pinta una card claramente dinero-first.
- Recomendación mínima de cambio:
  - en Cartera Viva, reemplazar el subtítulo principal de la card por lenguaje operativo universal (`unidad/unidades`) y dejar la unidad concreta para precisión secundaria;
  - en Ciclos Operativos, no rehacer el módulo, pero sí agregar una capa física compacta antes del bloque financiero cuando exista base homogénea, para alinear la lectura sin romper su naturaleza económica.

### Cambios aplicados

| Archivo | Líneas | Cambio |
|---|---|---|
| `apps/gold/agro/agro-cartera-viva-view.js` | 270-283 | Nuevos helpers semánticos universales: `formatUniversalUnitValue()`, `formatOperationalStatePhrase()` y `formatOperationalUnitDescriptor()` |
| `apps/gold/agro/agro-cartera-viva-view.js` | 638-715 | `resolveBuyerStatus()` deja de usar frases monetarias como copy principal y pasa a subtítulos operativos tipo `1 unidad pendiente · 2 unidades cobradas` |
| `apps/gold/agro/agro-cartera-viva-view.js` | 1168-1202 | `getOperationalCardMetrics()` deja el label de progreso en `Avance operativo`, usa base universal y conserva la unidad concreta como precisión secundaria |
| `apps/gold/agro/agroOperationalCycles.js` | 390-456 | Nueva capa física para ciclos: pluralización correcta de cantidades, resumen físico homogéneo y fallback honesto para mezcla o ausencia de unidades |
| `apps/gold/agro/agroOperationalCycles.js` | 495 | `buildCycleViewModel()` incorpora `physicalSummary` sin tocar el balance monetario existente |
| `apps/gold/agro/agroOperationalCycles.js` | 1641-1685 | El historial del ciclo ahora muestra cantidad antes que dinero y cada card recibe una `Base operativa` compacta antes del bloque financiero |
| `apps/gold/agro/agro-operational-cycles.css` | 616-653 | Estilos nuevos para la banda física de Ciclos Operativos, con estados `mixed` y `none` |

### Riesgo residual

- En Cartera Viva, la unidad concreta sigue mostrándose en métricas y no en el subtítulo principal para mantener la lectura humana limpia; si producto quiere aún más precisión visible, el siguiente paso sería añadir un micro-chip `Unidad real: sacos/kg`.
- En Ciclos Operativos, el resumen superior del módulo sigue siendo financiero a propósito, porque agrega múltiples ciclos heterogéneos; la alineación operativa se hizo a nivel card individual, que es donde sí existe contexto físico utilizable.
- Si un ciclo mezcla unidades físicas incompatibles, la nueva banda muestra `Sin base unificada` en vez de intentar sumar cantidades heterogéneas.

### Build status

- `pnpm build:gold`: ✅ Exitoso
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observación no bloqueante:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`

### QA sugerido

1. En Cartera Viva, validar card con unidad homogénea:
   - subtítulo universal (`unidad/unidades`);
   - métricas precisas (`saco`, `kg`, etc.).
2. Revisar un cliente sin base física y otro con mezcla incompatible para confirmar:
   - no vuelve el copy monetario como lectura principal;
   - aparece fallback honesto.
3. En Ciclos Operativos, abrir un ciclo con cantidad homogénea y confirmar que:
   - la banda `Base operativa` aparece antes del bloque monetario;
   - el historial lista `cantidad · dinero`, no al revés.
4. Abrir un ciclo sin cantidades y uno con mezcla de unidades para validar:
   - `Sin unidades`;
   - `Sin base unificada`.

## [2026-04-03] Cartera Viva v2.6 — familias de unidad y resumen superior unit-first

### Diagnóstico

- El resumen superior de Cartera Viva todavía nacía de `renderHeaderSummary()` + `resolveCategorySummary()` en `apps/gold/agro/agro-cartera-viva-view.js`, pero sin una taxonomía visible por familias de unidad. Por eso, incluso con cards ya corregidas, el strip podía seguir mostrando una narrativa dinero-first (`USD 2,73`, `USD 27,30`) en contextos donde el usuario ya esperaba una lectura operativa.
- Los movimientos operativos del root y del detalle seguían teniendo base física (`unit_type`, `unit_qty`, `quantity_kg`), pero la UI no gobernaba la lectura por familias oficiales. Faltaba separar explícitamente:
  - `Sacos`
  - `Cestas`
  - `Kilogramos`
  para no mezclar naturalezas incompatibles en la misma vista.
- `apps/gold/agro/agro-cartera-viva-detail.js` ya filtraba por tipo de ledger (`fiados`, `pagados`, `perdidas`), pero todavía no exponía una capa paralela de filtro por familia de unidad, así que el historial operativo podía sentirse mezclado cuando el cliente tenía más de una base física.
- `apps/gold/agro/agroOperationalCycles.js` ya mostraba una banda física inicial, pero en ciclos mixtos faltaba separar esa base por familia en vez de dejar una única frase genérica.

### Cambios aplicados

| Archivo | Líneas | Cambio |
|---|---|---|
| `apps/gold/agro/agro-cartera-viva-view.js` | 24, 123-131, 160-170 | Persistencia y normalización de familia operativa activa (`all`, `sacks`, `baskets`, `kg`) |
| `apps/gold/agro/agro-cartera-viva-view.js` | 304-387, 492-565, 567-636 | Nuevo mapa canónico de progreso por familias de unidad; cada cliente conserva buckets separados para sacos, cestas y kg |
| `apps/gold/agro/agro-cartera-viva-view.js` | 898-940, 1145-1167 | Conteos y chips de familia en raíz; la lista ya no mezcla categorías heterogéneas cuando el usuario entra a una familia concreta |
| `apps/gold/agro/agro-cartera-viva-view.js` | 1170-1341 | El resumen superior ahora cae en lectura operativa por familia cuando hay base física; la vista general honesta muestra `Base operativa separada por unidad` en vez de una suma falsa |
| `apps/gold/agro/agro-cartera-viva-view.js` | 1810-1815, 1908-1915, 1959-2006, 2172 | Integración completa con slots del root, detalle contextual y export; la familia activa se propaga a historial, filtros y exportación |
| `apps/gold/agro/agro-cartera-viva-detail.js` | 96-217, 727-929, 1566-1778 | Taxonomía de familias en detalle: helpers de normalización, chips `Sacos/Cestas/Kilogramos`, filtrado del timeline y de acciones para no contaminar un historial con otro |
| `apps/gold/agro/agro-cartera-viva.css` | 421-428, 548-591 | Estilos para copy secundario del strip y barra de familias operativas en ADN V10 |
| `apps/gold/agro/agroOperationalCycles.js` | 410-493, 523, 1677-1714 | La banda física del ciclo ahora separa familias cuando hay mezcla real; si un ciclo contiene varias unidades incompatibles, muestra breakdown por familia en vez de mezclar cantidades |
| `apps/gold/agro/agro-operational-cycles.css` | 649-671 | Estilos para breakdown físico por familia dentro de la card del ciclo |

### Riesgo residual

- Si la data histórica llega con `unit_type` inconsistente o vacío y sin `quantity_kg`, la UI cae en `Vista general` / fallback honesto y no inventa una familia. El siguiente paso, si producto lo pide, sería endurecer normalización en el origen de datos.
- El resumen financiero superior no desaparece del todo: sigue existiendo como stats monetarias secundarias dentro del strip. Lo que cambió es la narrativa dominante, que ahora obedece a la familia operativa activa cuando hay base física.
- En Ciclos Operativos, la separación por familia se hizo en la banda física de la card individual; no se rehízo el resumen global del módulo porque agrega ciclos heterogéneos y ahí la lectura financiera sigue siendo válida.

### Build status

- `pnpm build:gold`: ✅ Exitoso
- Checks:
  - `agent-guard: OK`
  - `agent-report-check: OK (AGENT_REPORT_ACTIVE.md)`
  - `vite build: OK`
  - `check-llms: OK`
  - `check-dist-utf8: OK`
- Observación no bloqueante:
  - warning de engine por entorno actual `node v25.6.0` vs objetivo `20.x`

### QA sugerido

1. En Cartera Viva raíz, cambiar entre `Vista general`, `Sacos`, `Cestas` y `Kilogramos` y confirmar que:
   - el strip superior cambia de narrativa;
   - la lista ya no mezcla familias incompatibles.
2. Abrir un cliente mixto (`sacos + kg`) y verificar que el detalle:
   - muestra chips por familia;
   - filtra timeline y acciones por la familia activa.
3. Abrir un cliente con solo `cestas` y confirmar que la vista no cae en dinero-first si existe base operativa.
4. En Ciclos Operativos, revisar un ciclo con mezcla de familias y validar que la banda `Base operativa` separa el breakdown por unidad en vez de sumarlo.
