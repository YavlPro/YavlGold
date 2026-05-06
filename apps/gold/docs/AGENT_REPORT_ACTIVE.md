# AGENT_REPORT_ACTIVE.md — YavlGold

Estado: ACTIVO
Fecha de apertura: 2026-05-05
Archivo anterior archivado: `AGENT_LEGACY_CONTEXT__2026-04-27__2026-05-05.md`

---

## Estado vivo del proyecto

- Release visible activa: `V1`.
- Canon operativo superior: `AGENTS.md`.
- Canon visual activo: `apps/gold/docs/ADN-VISUAL-V11.0.md`.
- Canon semántico Agro: `apps/gold/docs/MANIFIESTO_AGRO.md` (solo con autorización expresa).
- Ficha técnica disponible en raíz: `FICHA_TECNICA.md`.
- Supabase canónico: `supabase/` en raíz.

## Frentes abiertos

- Agro V1: mantener separación semántica entre Cartera Viva, Cartera Operativa y Mis Clientes.
- Cartera Viva: corregir UX de creación/vinculación de clientes sin mezclar intención del usuario.
- Documentación viva: registrar sesiones en este archivo; rotar de nuevo al alcanzar 4000 líneas.

## Decisiones canónicas vigentes

- No agregar features nuevas en `apps/gold/agro/agro.js`; solo wiring quirúrgico si es inevitable.
- Nuevas piezas Agro deben vivir como módulos `agro-*.js` o CSS dedicado.
- Mis Clientes es libreta de contactos; Cartera Viva es seguimiento de créditos/deudas.
- No exponer lenguaje de base de datos en UI cuando exista una formulación humana equivalente.
- Build gate obligatorio tras cambios de código: `pnpm build:gold`.

## Deuda técnica viva

- `agro.js` sigue siendo monolito legacy; evitar crecimiento.
- `agrocompradores.js` contiene el wizard/ficha de compradores de Cartera Viva y requiere cirugía localizada.
- `index.html` conserva markup legacy del modal de buyer; cualquier copy visible ahí debe seguir humano aunque el wizard lo reemplace dinámicamente.
- `linked_user_id` existe como campo interno opcional; no se debe guardar correo/nombre/finca en una columna UUID.

---

## 2026-05-05 — Diagnóstico y plan: separar flujos de cliente en Cartera Viva

**Estado:** COMPLETADO EN CÓDIGO / QA MANUAL PENDIENTE POR USUARIO

### Diagnóstico

- `apps/gold/agro/agro-cartera-viva-view.js` renderiza el CTA visible `Nuevo cliente` en tres zonas (`renderToolbarControls`, empty state y header de la vista).
- El click en `[data-cartera-new-client]` llama `openNewBuyerProfile('')`, que entra en modo `create` dentro de `apps/gold/agro/agrocompradores.js`.
- En `agrocompradores.js`, `openBuyerProfileInternal({ mode: 'create' })` siempre inicializa el wizard con `wizardIdentityMode = 'new'`, pero el Paso 1 sigue mostrando un selector interno `Cliente nuevo / Cliente existente`.
- La causa raíz UX es que una única entrada visible (`Nuevo cliente`) abre un wizard mixto con dos intenciones distintas.
- El copy técnico visible vive en `agrocompradores.js` Paso 3: `Vincular user_id público (opcional)` y placeholder `UUID del usuario para abrir su perfil público`.
- `index.html` conserva el markup base del modal con el mismo copy técnico en versión sin acentos. Aunque el wizard reemplaza el form, debe humanizarse para evitar regresión en modo edición/base.
- La persistencia actual valida `linked_user_id` como UUID antes de guardar. No existe lookup seguro por correo/nombre/finca en este diagnóstico, así que no se debe guardar texto humano en `linked_user_id`.

### Plan quirúrgico

1. Agregar un segundo CTA visible `Cliente existente` junto a `Nuevo cliente` en Cartera Viva.
2. Pasar modo inicial explícito al wizard mediante `openNewBuyerProfile('', { mode: 'new' | 'existing' })` o equivalente.
3. En modo `new`, mostrar copy de creación desde cero y ocultar el toggle mixto.
4. En modo `existing`, mostrar copy de selección de cliente existente y ocultar campos de creación obligatoria inicial.
5. Humanizar el copy del vínculo público y validar que solo se persista UUID si el dato ingresado ya es UUID válido; si no, mostrar `Cliente registrado no encontrado`.
6. Actualizar copy base en `index.html` para no exponer `user_id`/`UUID`.
7. Ejecutar `pnpm build:gold`.

### DoD esperado

- Vista principal muestra `Nuevo cliente` y `Cliente existente`.
- `Nuevo cliente` abre wizard en modo creación.
- `Cliente existente` abre wizard en modo selección.
- No aparece `UUID` ni `user_id público` en UI visible.
- No se guarda correo/nombre/finca en `linked_user_id`.
- Build pasa.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro-cartera-viva-view.js` | Agregados CTAs separados `Nuevo cliente` y `Cliente existente`; cada botón abre `openNewBuyerProfile()` con modo explícito. |
| `apps/gold/agro/agro-cartera-viva.css` | Estilos sobrios para el grupo de acciones y botón secundario, con responsive mobile. |
| `apps/gold/agro/agrocompradores.js` | Wizard acepta modo inicial `new`/`existing`; el Paso 1 ya no muestra toggle mixto; modo existente permite buscar/seleccionar buyer activo por nombre/contacto; copy técnico del vínculo público fue humanizado. |
| `apps/gold/agro/agro.css` | Estilo mínimo para help text del campo de vínculo público. |
| `apps/gold/agro/index.html` | Copy base del modal humanizado para no exponer `user_id`/`UUID`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Rotación + diagnóstico + cierre de sesión. |

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- Verificación estática del bundle: no quedan textos `Vincular user_id`, `user_id público` ni `UUID del usuario` en el bundle de `agrocompradores`/Cartera Viva.

### QA manual

- No ejecutada por instrucción del usuario.
- Pendiente para el usuario: revisar `/agro#view=cartera-viva` en desktop/mobile y confirmar los dos flujos.

### Notas de alcance

- No se tocó Supabase ni migraciones.
- No se tocó `apps/gold/agro/agro.js`.
- No se modificó `MANIFIESTO_AGRO.md`.
- No se guarda correo/nombre/finca en `linked_user_id`; si el valor no es UUID válido, se muestra `Cliente registrado no encontrado`.

---

## 2026-05-05 — Limpieza visual: acciones de cliente en Cartera Viva

**Estado:** COMPLETADO EN CÓDIGO / QA MANUAL PENDIENTE POR USUARIO

### Diagnóstico

- La separación previa dejó dos grupos visibles `Nuevo cliente` / `Cliente existente`.
- El grupo superior vive en `renderListViewMarkup()` junto a `Actualizar`.
- El grupo duplicado inferior vivía en `renderToolbarControls()`, antes de la franja de privacidad.
- El copy `Eliminar cliente canónico` vivía en el botón de borrado de cada card dentro de `renderPortfolioCard()`.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro-cartera-viva-view.js` | Eliminado el grupo inferior duplicado de acciones; retirado el CTA latente del empty state; cambiado `Eliminar cliente canónico` por `Eliminar cliente`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Registrada esta limpieza. |

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- QA visual/manual queda para el usuario por instrucción expresa.

---

## 2026-05-05 — Diagnóstico y plan: Centro de Reportes

**Estado:** COMPLETADO EN CÓDIGO / QA MANUAL PENDIENTE POR USUARIO

### Diagnóstico

- `apps/gold/agro/agro-shell.js` registra vistas profundas mediante `VIEW_CONFIG`, alias, keywords y asignación de hub móvil. El nuevo módulo debe entrar como vista `reportes` con región propia.
- El hub Mi Granja vive en `apps/gold/agro/index.html`; la sección desktop relevante aparece como `Trabajo diario` y el hub móvil ya usa el título `Trabajo y lectura`.
- Hay exportadores Markdown reales y reutilizables para `agro-crop-report.js` (`exportCropReport(cropId)`) y `agro-stats-report.js` (`exportStatsReport()`).
- `agro.js` expone `window.exportAgroLog`, pero no se tocará para este módulo. El Centro puede invocarlo si ya existe.
- `agroOperationalCycles.js` expone `window.YGAgroOperationalCycles.downloadMarkdown`, pero depende del estado interno del módulo. Se puede conectar como wrapper pequeño sin duplicar lógica.
- `agro-cart.js` tiene `exportCartMD(cartId)` privado; no hay API pública segura para exportar desde el centro sin tocar su contrato, por lo que Mi Carrito queda pendiente de conectar en este MVP.
- Cartera Viva, Mis Clientes, Rankings y AgroRepo tienen exportes o datos en flujos locales, pero no una API central estable para exportación general desde un índice. No se inventará persistencia ni datos.

### Plan quirúrgico

1. Crear `apps/gold/agro/agro-reports-center.js` como módulo independiente con catálogo de reportes por categoría.
2. Crear `apps/gold/agro/agro-reports-center.css` con estilos ADN V11 sobrios, responsive y accesibles.
3. Registrar vista `reportes` en `agro-shell.js` sin tocar `agro.js`.
4. Añadir la tarjeta `Centro de Reportes` en Mi Granja / Trabajo y lectura dentro de `index.html`, más entrada móvil y región dedicada.
5. Importar e inicializar el módulo desde el bootstrap de `index.html`.
6. Conectar solo exportes seguros: cultivo seleccionado, estadísticas globales, informe global de Agro y Cartera Operativa si su API global está disponible.
7. Dejar el resto como `Pendiente de conectar` o `Próximamente`, con botón deshabilitado.
8. Agregar sección breve en `MANIFIESTO_AGRO.md` porque el usuario autorizó documentar este módulo real.
9. Ejecutar `git diff --check` y `pnpm build:gold`. QA manual/browser queda pendiente para el usuario.

### DoD esperado

- `Centro de Reportes` aparece en el hub.
- `/agro#view=reportes` abre una vista dedicada con botón `Volver`.
- Las categorías mínimas aparecen ordenadas.
- Los reportes no conectados no prometen exportación falsa.
- No se eliminan ni mueven reportes existentes.
- No se toca Supabase, migraciones ni `agro.js`.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro-reports-center.js` | Nuevo módulo del Centro de Reportes con catálogo por categorías, estados y wrappers de exportación seguros. |
| `apps/gold/agro/agro-reports-center.css` | Estilos dedicados ADN V11 para vista, cards, estados, botones y responsive mobile. |
| `apps/gold/agro/agro-shell.js` | Registrada la vista `reportes`, alias, keywords y hub móvil. |
| `apps/gold/agro/index.html` | Agregada tarjeta en `Trabajo y lectura`, entrada móvil, región dedicada, stylesheet y bootstrap del módulo. |
| `apps/gold/docs/MANIFIESTO_AGRO.md` | Añadida sección humana sobre qué es, qué no es y cómo se conecta Centro de Reportes. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Registrado diagnóstico, plan y cierre de la sesión. |

### Reportes conectados

- Reporte de cultivo seleccionado: reutiliza `exportCropReport(cropId)`.
- Informe estadístico global: reutiliza `exportStatsReport()`.
- Informe global de Agro: reutiliza `window.exportAgroGlobalMd` si está cargado.
- Reporte de Cartera Operativa: reutiliza `window.YGAgroOperationalCycles.downloadMarkdown` si está cargado.

### Reportes pendientes

- Cartera Viva: requiere API central para exportar sin estar dentro del detalle de cliente.
- Mi Carrito: el exporte existe dentro del módulo, pero la función actual es privada.
- Mis Clientes: todavía no expone exportación Markdown propia.
- Rankings de Clientes: conserva su exporte actual, pero no hay wrapper público central.
- Trabajo Diario, AgroRepo y estadísticas de períodos: pendientes de exportador público estable.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- Nota: build mostró advertencia no bloqueante de engine (`node` esperado 20.x; entorno actual `v25.6.0`).

### QA manual

- No ejecutada por instrucción previa del usuario.
- Pendiente para el usuario: abrir `/agro#view=reportes`, revisar desktop/mobile y probar exportes conectados.

### Notas de alcance

- No se eliminó ni movió ningún reporte existente.
- No se tocó Supabase ni migraciones.
- No se tocó `apps/gold/agro/agro.js`.

---

## 2026-05-05 — Diagnóstico y plan: pulir Centro de Reportes

**Estado:** COMPLETADO EN CÓDIGO / QA MANUAL PENDIENTE POR USUARIO

### Diagnóstico

- El bloque redundante vive en `apps/gold/agro/agro-reports-center.js`, dentro de `render()`, como header local `.agro-reports-hero`.
- La barra contextual superior del shell ya muestra `Volver` + `Centro de Reportes`; por eso el botón local `Volver`, el eyebrow `Trabajo y lectura`, el H1 y el subtítulo duplican jerarquía.
- La lista de reportes está definida en `REPORT_CATEGORIES`; los estados `pending` y `soon` deshabilitan acciones y producen botones `No disponible`.
- Hay fuentes accesibles por bridge/API para algunos reportes: `_agroCyclesWorkspace`, `_agroBuyerPortfolioState`, `YGAgroOperationalCycles`, `YGAgroTaskCycles`, `_agroRepoContext`, `window.refreshAgroStats`, `exportCropReport()` y `exportStatsReport()`.
- Algunas fuentes siguen sin API completa desde el centro (`Mi Carrito`, Rankings sin tocar `agro.js`, parte de AgroRepo si no se abrió). Esos reportes pueden exportar un `.md` honesto con estado y próximo dato necesario.

### Plan quirúrgico

1. Eliminar el header local redundante y dejar solo una franja compacta de resumen bajo la topbar contextual.
2. Convertir todos los reportes en acciones exportables `Exportar MD`.
3. Agregar helpers internos para descargar `.md`, formatear fecha, normalizar texto y construir tablas Markdown.
4. Reutilizar exportadores existentes cuando estén disponibles.
5. Para fuentes sin datos o sin bridge disponible, exportar Markdown honesto con `Sin datos cargados` o `Fuente no disponible en esta sesión`.
6. Ajustar CSS para spacing superior limpio, cards accesibles y mobile sin overflow.
7. Ejecutar `git diff --check` y `pnpm build:gold`; QA visual/manual queda pendiente para el usuario.

### DoD esperado

- No aparece el bloque local con `Trabajo y lectura`, H1 duplicado, subtítulo ni segundo `Volver`.
- Todas las cards muestran acción `Exportar MD`.
- Cada click genera una salida Markdown real u honesta.
- No se toca `apps/gold/agro/agro.js`, Supabase ni migraciones.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro-reports-center.js` | Eliminado el header local duplicado; agregados helpers Markdown; convertidos todos los reportes a acciones `Exportar MD`; conectadas fuentes reales cuando existen y fallbacks honestos cuando no hay datos expuestos. |
| `apps/gold/agro/agro-reports-center.css` | Retirados estilos del hero/botón local duplicado; agregado resumen compacto y spacing limpio bajo la barra contextual del shell. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Registrado diagnóstico, plan y cierre de esta limpieza. |

### Reportes habilitados

- Cultivos y ciclos: cultivo seleccionado, ciclo finalizado/perdido y comparativo de ciclos.
- Operación Comercial: Cartera Viva, Cartera Operativa y Mi Carrito.
- Clientes: Mis Clientes y rankings de clientes.
- Trabajo y memoria: Trabajo Diario y AgroRepo.
- Estadísticas: estadísticas globales, informe global, períodos y financiero detallado.

### Exportación honesta sin datos

- Mi Carrito queda con Markdown honesto cuando no exista entrada central estable desde el centro.
- Rankings exporta lo visible si el panel está cargado; si no, descarga estado honesto.
- AgroRepo exporta índice cuando la memoria local está cargada; si no, descarga estado honesto.
- Cualquier fuente no cargada descarga `.md` con estado, observaciones y próximo dato necesario, sin datos inventados.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- Nota: build mostró advertencia no bloqueante de engine (`node` esperado 20.x; entorno actual `v25.6.0`).

### QA manual

- No ejecutada por instrucción expresa del usuario.
- Pendiente para el usuario: abrir `/agro#view=reportes`, validar limpieza visual y probar descargas `.md`.

### Notas de alcance

- No se tocó `apps/gold/agro/agro.js`.
- No se tocó Supabase.
- No se tocaron migraciones.

---

## 2026-05-05 — Documentación: alinear manifiesto, ficha técnica y contexto con los cinco commits del día

**Estado:** COMPLETADO

### Diagnóstico

- Se aplicaron cinco commits sobre Cartera Viva (separación de flujos, limpieza de acciones), Centro de Reportes (nuevo módulo, pulido de exportes) y persistencia del shell (rutas canónicas de puertas).
- La documentación canónica (`MANIFIESTO_AGRO.md`, `FICHA_TECNICA.md`, `llms.txt`) debía alinearse con el comportamiento real ya implementado en código.
- `MANIFIESTO_AGRO.md` tenía una sección inicial de Centro de Reportes sin numeración canónica ni regla de honestidad documental. Cartera Viva no documentaba la separación de flujos ni la regla de lenguaje humano. La persistencia de navegación no mencionaba las rutas canónicas por hash.
- `FICHA_TECNICA.md` no listaba `agro-cartera-viva-view.js`, `agro-reports-center.js` ni sus CSS correspondientes. La descripción de `agro-shell.js` no mencionaba la persistencia por hash.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/docs/MANIFIESTO_AGRO.md` | §4.5.1: actualizado flujo de uso con CTAs separados Nuevo cliente / Cliente existente; agregada Regla de lenguaje humano. §4.8.1: numerado, expandido con regla de honestidad documental y reportes conectados. §4.11.3: actualizada persistencia de navegación con rutas canónicas por hash. |
| `FICHA_TECNICA.md` | Agregados `agro-cartera-viva-view.js`, `agro-reports-center.js` y CSS correspondientes en listas de módulos. Agregado Centro de Reportes en funcionalidades. Actualizada descripción de `agro-shell.js`. |
| `apps/gold/public/llms.txt` | Agregadas menciones de Centro de Reportes, separación de flujos en Cartera Viva, y persistencia de puertas del shell con rutas canónicas. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Registrada esta sesión documental. |

### Documentos revisados sin cambios

- `ADN-VISUAL-V11.0.md` — no aplica; sin regla visual nueva.
- `AGENTS.md` — no aplica; sin regla operativa canónica nueva.
- `docs-agro.html` — no existe en el árbol activo.
- `AGENT_CONTEXT_INDEX.md` — revisado; estructura de capa documental sigue vigente sin cambios necesarios.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- Búsqueda de `UUID`, `user_id público` y `cliente canónico` en documentos editados: cero ocurrencias como instrucción de UI para usuario final.
- `Centro de Reportes` aparece en manifiesto, ficha técnica y llms.txt.

### Notas de alcance

- No se tocó `apps/gold/agro/agro.js`.
- No se tocó Supabase ni migraciones.
- No se modificó `ADN-VISUAL-V11.0.md` ni `AGENTS.md`.
- Cambios exclusivamente documentales.

**Estado:** COMPLETADO EN CÓDIGO / QA MANUAL PENDIENTE POR USUARIO

### Diagnóstico

- `apps/gold/agro/agro-shell.js` ya sincroniza módulos profundos con URL mediante `setActiveView()` y `writeViewToHash()`.
- Las puertas principales del hub (`Inicio`, `Granja`, `Memoria`, `Menú`) usan `data-agro-mobile-tab` y solo ejecutan `setMobileHub()` + `setShellDepth('hub')`.
- Ese flujo cambia la UI visible, pero no reemplaza el hash anterior. Por eso puede quedar `#view=reportes` mientras el usuario está visualmente en `Mi Granja`.
- Al refrescar, `resolveInitialView()` prioriza el hash y restaura el módulo profundo anterior.
- El fix seguro vive en el shell: crear rutas canónicas de hub y usarlas solo en clicks de puertas y botón `Volver` al hub.

### Plan quirúrgico

1. Definir rutas canónicas para puertas: `#view=inicio`, `#view=granja`, `#view=memoria`, `#view=menu`.
2. Hacer que `resolveInitialView()` reconozca esas rutas como estado de hub, sin tratarlas como módulos profundos.
3. Agregar un helper de navegación de puerta que actualice hub activo, profundidad, hash y persistencia.
4. Usar ese helper en clicks de puertas principales y en el botón `Volver` desde módulo a hub.
5. Mantener intactas rutas profundas existentes como `#view=reportes`, `#view=cartera-viva` y `#view=ciclos&subview=mis-cultivos`.
6. Ejecutar `git diff --check` y `pnpm build:gold`; QA manual queda pendiente para el usuario.

### DoD esperado

- El estado visual del hub coincide con la URL.
- Volver desde un módulo profundo a Granja deja de conservar el hash profundo anterior.
- No se toca `apps/gold/agro/agro.js`, Supabase ni migraciones.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro-shell.js` | Agregadas rutas canónicas de puertas (`inicio`, `granja`, `memoria`, `menu`), persistencia de puerta en localStorage, lectura de hash de hub al cargar y helper `setShellGate()` para sincronizar UI + URL. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Registrado diagnóstico, plan y cierre de la corrección. |

### Rutas preservadas

- `#view=reportes` sigue entrando al Centro de Reportes como módulo profundo.
- `#view=cartera-viva` sigue entrando a Cartera Viva.
- `#view=ciclos&subview=mis-cultivos` sigue respetando subvista de ciclos.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- Nota: build mostró advertencia no bloqueante de engine (`node` esperado 20.x; entorno actual `v25.6.0`).

### QA manual

- No ejecutada por instrucción previa del usuario.
- Pendiente para el usuario: probar refresh en `Inicio`, `Granja`, `Memoria`, `Menú` y una ruta profunda.

### Notas de alcance

- No se tocó `apps/gold/agro/agro.js`.
- No se tocó Supabase.
- No se tocaron migraciones.

---

## 2026-05-06 — Roadmap Vision YavlGold

Estado: GREEN

### Diagnóstico

YavlGold V1 debe quedar documentado como Agro activo actual, sin confundir la visión futura de una capa personal/universal con una feature existente. El repo ya tiene `AGENTS.md` como ley operativa, `MANIFIESTO_AGRO.md` como verdad semántica de Agro, `FICHA_TECNICA.md` como estructura técnica y `ADN-VISUAL-V11.0.md` como canon visual. Falta un documento estratégico específico que conecte Agro como vertical fundacional con primitives reutilizables futuras sin autorizar rutas, módulos ni UI nuevas.

### Plan

1. Crear `apps/gold/docs/ROADMAP_VISION_YAVLGOLD.md` como documento canónico estratégico.
2. Registrar el documento en `AGENTS.md` con una línea mínima de descubribilidad.
3. Registrar el documento en `apps/gold/docs/AGENT_CONTEXT_INDEX.md` como capa de visión estratégica.
4. Mantener `MANIFIESTO_AGRO.md`, `FICHA_TECNICA.md`, `ADN-VISUAL-V11.0.md`, runtime Agro, Supabase y navegación sin cambios.
5. Ejecutar `pnpm build:gold` y cerrar esta sección con resultado.

### Archivos que se tocarán

- `apps/gold/docs/ROADMAP_VISION_YAVLGOLD.md`
- `AGENTS.md`
- `apps/gold/docs/AGENT_CONTEXT_INDEX.md`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Confundir visión futura con estado implementado.
- Convertir el documento en lista de features.
- Duplicar o contradecir el manifiesto semántico de Agro.
- Abrir alcance hacia UI, rutas, módulos o Supabase.

### Validación prevista

- Revisión estática del contenido para asegurar que no promete módulo personal implementado.
- `pnpm build:gold`.

### Cambios por archivo

- `apps/gold/docs/ROADMAP_VISION_YAVLGOLD.md`: creado como documento canónico estratégico para fijar Agro V1 como producto activo, explicar Agro como wedge fundacional, definir primitives reutilizables futuras y prohibir implementación prematura de un módulo personal.
- `AGENTS.md`: agregada referencia mínima al nuevo roadmap en la tabla documental y en la jerarquía canónica, aclarando que no autoriza módulos, rutas ni UI.
- `apps/gold/docs/AGENT_CONTEXT_INDEX.md`: registrado el roadmap como capa de visión estratégica y punto de consulta para agentes.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`: registrada la sesión con diagnóstico, plan, riesgos, cambios y validación.
- `apps/gold/docs/ops/daily-log-2026-05-06.md`: creado log diario operativo mínimo conforme al sistema de bitácora diaria.

### Documentos revisados sin cambios

- `apps/gold/docs/MANIFIESTO_AGRO.md`: no se modificó porque no hubo cambio funcional real en Agro.
- `FICHA_TECNICA.md`: no se modificó porque el cambio no altera estructura técnica, módulos ni stack.
- `apps/gold/docs/ADN-VISUAL-V11.0.md`: no se modificó porque no hubo cambio visual.

### Validación

- Revisión estática: el roadmap declara `Módulo personal: Visión futura, no implementado`, indica que la capa no existe todavía, prohíbe implementarla ahora y prohíbe rutas como `/personal`, `/yavl-personal` o `/estado-actual`.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- Nota: build mostró advertencia no bloqueante de engine (`node` esperado 20.x; entorno actual `v25.6.0`).

### Próximo paso recomendado

Usar `ROADMAP_VISION_YAVLGOLD.md` como filtro antes de proponer superficies grandes o refactors semánticos de Agro; no construir YavlGold Personal sin autorización expresa.

---

## 2026-05-06 — Diagnóstico y plan: reorganización de clientes en Cartera Viva

Estado: EN CURSO

### Diagnóstico

- Cartera Viva agrupa clientes desde `public.agro_buyers` y desde las columnas `buyer_id`, `buyer_group_key` y `buyer_match_status` presentes en los movimientos.
- Los movimientos que alimentan Cartera Viva son:
  - `agro_pending` para fiados;
  - `agro_income` para pagados/cobros;
  - `agro_losses` para pérdidas.
- `apps/gold/agro/agro-cartera-viva-view.js` renderiza la lista, el detalle y los botones de cliente. El detalle usa `apps/gold/agro/agro-cartera-viva-detail.js`.
- El modal actual de edición de registros vive como markup en `apps/gold/agro/index.html` (`#modal-edit-facturero`) y se abre/guarda desde `apps/gold/agro/agro.js` (`openFactureroEditModal()` y `saveEditModal()`).
- Ya existe identidad canónica por buyer (`agro_buyers.id`) pero también hay fallback por nombre normalizado (`buyer_group_key`) para registros legacy.
- Mis Clientes (`agro-clients.js`) es libreta de contactos separada. Lee `agro_clients` y buyers derivados de Cartera Viva, pero no debe volverse fuente de deuda.
- La vinculación real por correo a cuenta YavlGold no puede verificarse de forma segura desde el frontend actual: `auth.users.email` no está disponible por RLS/cliente anon y no existe RPC/Edge Function local para resolver email -> user id. Por tanto, no se debe guardar correo escrito en `linked_user_id`.

### Plan

1. Crear helper modular para el selector de cliente del modal de edición, sin crecer `agro.js` más allá de wiring.
2. Insertar en el modal un bloque `Cliente` con switch `Cliente existente` / `Nuevo cliente`.
3. Al guardar:
   - si es cliente existente, reasignar el movimiento al buyer elegido;
   - si es cliente nuevo, crear/reutilizar buyer por nombre y reasignar el movimiento;
   - conservar monto, estado, fecha, tipo y demás datos financieros.
4. Agregar modo selección en Cartera Viva para fusionar 2+ clientes.
5. Implementar modal `Fusionar clientes` con nombre destino, resumen de registros y advertencia de no borrado.
6. Al confirmar fusión, actualizar `agro_pending`, `agro_income` y `agro_losses` para apuntar al buyer destino y archivar los buyers origen sin borrar movimientos.
7. Hacer estricta la vinculación de cuenta YavlGold: separar copy de contacto vs cuenta vinculada y bloquear falsa vinculación por email hasta que exista RPC/Edge Function.
8. Ejecutar `pnpm build:gold`.

### Archivos a tocar

- `apps/gold/agro/agro-cartera-viva-client-tools.js` (nuevo helper modular)
- `apps/gold/agro/agro.js` (wiring mínimo del modal de edición)
- `apps/gold/agro/index.html` (contenedor del bloque Cliente y copy de vinculación)
- `apps/gold/agro/agro-cartera-viva-view.js` (modo selección/fusión)
- `apps/gold/agro/agro-cartera-viva.css` (estilos sobrios)
- `apps/gold/agro/agrocompradores.js` (vinculación estricta sin falso email)
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `apps/gold/docs/ops/daily-log-2026-05-06.md`

### Riesgos

- Reasignar solo nombre sin `buyer_id` dejaría duplicados en Cartera Viva; por eso se actualiza identidad (`buyer_id` + `buyer_group_key`).
- Renombrar/fusionar buyers puede chocar con índices únicos por `group_key`/`canonical_name`; la fusión debe neutralizar los buyers origen antes de renombrar destino si hace falta.
- La verificación de correo no debe improvisarse consultando datos no disponibles. Si no hay backend seguro, se deja bloqueado y documentado.
- No se debe tocar `MANIFIESTO_AGRO.md` sin autorización expresa, aunque el cambio sea semánticamente relevante.

### QA manual esperado

1. Editar un fiado y moverlo a cliente existente.
2. Editar un fiado y moverlo a cliente nuevo.
3. Confirmar que el cliente anterior deja de agrupar ese registro.
4. Confirmar que el cliente destino muestra el registro.
5. Fusionar clientes duplicados, por ejemplo `Yony` + `Yony chupeto`.
6. Confirmar que montos, estados y fechas no cambian.
7. Intentar vincular correo inexistente y confirmar que no se guarda como cuenta YavlGold.
8. Guardar cliente sin vinculación.
9. Revisar mobile 360-480px.
10. Ejecutar `pnpm build:gold`.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro-cartera-viva-client-tools.js` | Nuevo helper modular para resolver cliente en edición de movimientos y fusionar buyers sin borrar movimientos. |
| `apps/gold/agro/agro.js` | Wiring mínimo: el modal de edición carga el bloque Cliente y al guardar aplica `buyer_id`, `buyer_group_key` y `buyer_match_status` resueltos por el helper. |
| `apps/gold/agro/index.html` | Agregado contenedor `#edit-client-assignment`; copy de cuenta vinculada cambiado para no aceptar correo falso como vínculo real. |
| `apps/gold/agro/agro-cartera-viva-view.js` | Agregado modo selección, modal `Fusionar clientes`, confirmación y refresco de Cartera Viva. |
| `apps/gold/agro/agro-cartera-viva.css` | Estilos ADN V11 sobrios para selector de cliente, selección de cards y modal de fusión. |
| `apps/gold/agro/agrocompradores.js` | La vinculación de cuenta YavlGold queda estricta: conserva vínculo verificado existente, pero no pide ni guarda correo no verificado. |
| `apps/gold/agro/agro-clients.js` | `Email` se renombró a `Correo de contacto` en Mis Clientes para separar contacto manual de cuenta vinculada. |
| `apps/gold/docs/ops/daily-log-2026-05-06.md` | Actualizado log diario operativo. |

### Decisiones técnicas

- Reasignar cliente en edición de movimiento actualiza identidad de Cartera Viva (`buyer_id` + `buyer_group_key`) y el nombre humano del movimiento. No altera monto, fecha, moneda, estado ni tipo.
- En `transferencias`/donación el editor permite cambiar destinatario, pero no fuerza `buyer_id` porque esa tabla no alimenta Cartera Viva en el contrato actual.
- Fusionar clientes reasigna registros de `agro_pending`, `agro_income` y `agro_losses` al buyer destino. Los buyers origen se archivan y se neutraliza su `group_key`/`canonical_name` para evitar conflictos de índices únicos. No se borran movimientos.
- La vinculación por correo queda bloqueada sin falsa persistencia porque no existe lookup seguro frontend para `auth.users.email`. Si se requiere, debe implementarse RPC/Edge Function owner-safe antes de habilitar el campo.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- `agent-guard`: OK.
- `agent-report-check`: OK.
- `vite build`: OK (172 módulos).
- `check-llms`: OK.
- `check-dist-utf8`: OK.
- Warning no bloqueante: engine mismatch por Node `v25.6.0` vs `20.x`.

### QA manual pendiente

- No se ejecutó browser QA intensivo desde Codex por política operativa de créditos.
- Pendiente probar con cuenta QA o usuario real:
  1. editar fiado a cliente existente;
  2. editar fiado a cliente nuevo;
  3. fusionar duplicados reales;
  4. verificar que montos/fechas/estados no cambian;
  5. revisar mobile 360-480px.
