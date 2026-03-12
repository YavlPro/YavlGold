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
