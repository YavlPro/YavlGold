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

## 2026-05-06 — Incidente online: revert de fusión/asignación en Cartera Viva

Estado: YELLOW — producción restaurada por revert; QA online pendiente

### Diagnóstico

- El usuario reportó que en online `/agro#view=cartera-viva` la vista cargaba, pero tags, filtros y botones no respondían después de `16ab27a feat(agro): add cartera viva client reassignment and merge tools`.
- La rama ya tenía además `8196185 fix(agro): wire client assignment into legacy facturero editor`, encima de `16ab27a`.
- No había un diff local pendiente que permitiera separar el fallo sin tocar producción; ambos commits estaban en `main`/`origin/main`.
- La investigación rápida no encontró una causa pequeña y demostrable en handlers o CSS antes de comprometer más cambios.

### Decisión

- Se priorizó recuperar Cartera Viva funcional sobre conservar la mejora rota.
- Se revirtió primero `8196185`, porque dependía del helper agregado por `16ab27a`.
- Luego se revirtió `16ab27a`, retirando temporalmente la fusión/asignación de clientes y el helper `agro-cartera-viva-client-tools.js`.

### Commits de recuperación

- `790d607 Revert "fix(agro): wire client assignment into legacy facturero editor"`
- `6b0d15e Revert "feat(agro): add cartera viva client reassignment and merge tools"`

### Validación esperada

- `pnpm build:gold`.
- Push a producción/preview.
- QA online: confirmar que tags, filtros, cards, detalle y botones de Cartera Viva vuelven a responder.

### Riesgo pendiente

- La mejora de fusión/asignación queda retirada. Para reintentar, debe reimplementarse en rama/commit nuevo con QA online posterior al push y rollback preparado.

---

## 2026-05-06 — Fase 1: reasignación de cliente en editor de movimiento

Estado: COMPLETADO EN CÓDIGO / QA ONLINE PENDIENTE POR USUARIO

### Diagnóstico

- El editor de movimientos del facturero se abre en `editFactureroItem()` y renderiza el modal en `openFactureroEditModal()`, dentro de `apps/gold/agro/agro.js`.
- El guardado vive en `saveEditModal()` y actualiza solo la fila actual por `id` + `user_id`.
- Cartera Viva se alimenta de `agro_pending`, `agro_income` y `agro_losses` mediante `buyer_id`, `buyer_group_key`, `buyer_match_status` y campos legibles heredados.
- `pendientes` usa `cliente` como campo visible de cliente.
- `ingresos` no tiene campo `cliente` dedicado en el editor; el cliente se deriva del concepto con `buildConceptWithWho()`.
- `perdidas` usa `causa`, y solo entra a identidad de comprador cuando corresponde al flujo de Cartera Viva.
- `transferencias` usa `destino`; no alimenta Cartera Viva ni debe crear identidad de comprador en esta fase.
- La función existente `enrichBuyerIdentityPayload()` ya crea/encuentra identidad en `agro_buyers` para `pendientes`, `ingresos` y `perdidas`; conviene reutilizarla en vez de duplicar semántica.

### Plan Fase 1

1. Crear `apps/gold/agro/agro-cartera-viva-client-assignment.js` como helper mínimo del modal.
2. Agregar `#edit-client-assignment` dentro del modal de edición en `index.html`.
3. Importar el helper en `agro.js`.
4. En apertura de modal, montar la UI solo dentro del contenedor del modal.
5. En guardado, resolver la selección antes de construir `conceptForSave` y `updateData`.
6. No tocar `agro-cartera-viva-view.js`, tags, filtros, cards, detalle ni listeners globales.

### Archivos a tocar

- `apps/gold/agro/agro-cartera-viva-client-assignment.js`
- `apps/gold/agro/agro.js`
- `apps/gold/agro/index.html`
- `apps/gold/agro/agro-cartera-viva.css` solo si hace falta estilo mínimo scoped al modal
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Reintroducir lógica fuera del modal y volver a bloquear clicks de Cartera Viva.
- Cambiar accidentalmente monto, fecha, tipo, estado o cultivo del movimiento.
- Crear vínculo YavlGold falso por correo. Esta fase no implementa verificación de cuenta.
- Romper tablas legacy sin columnas `buyer_id`; se mantiene fallback existente de columnas faltantes.

### QA online esperado

- En online, antes de abrir el modal, tags/filtros/cards/detalle siguen respondiendo.
- Editar movimiento permite elegir `Cliente existente` o `Nuevo cliente`.
- Guardar reasigna solo el movimiento editado.
- Monto, fecha, estado, tipo y cultivo se conservan salvo edición manual explícita del usuario.
- No aparece texto, atributos ni modo selección de fusión.

### Cambios realizados

- `apps/gold/agro/agro-cartera-viva-client-assignment.js`: helper mínimo del modal; monta UI local, lista `agro_buyers`, resuelve cliente existente o nombre nuevo y no agrega listeners globales.
- `apps/gold/agro/agro.js`: wiring quirúrgico del editor; pasa `user.id` al abrir, monta el helper y resuelve el cliente antes de construir `updateData`.
- `apps/gold/agro/index.html`: agregado el contenedor neutro `#edit-client-assignment` dentro del modal de edición.
- `apps/gold/agro/agro.css`: estilos scoped a `#modal-edit-facturero` para el bloque Cliente.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`: registrada Fase 1, riesgos, QA y cierre.

### Campos actualizados por tab

- `pendientes`: actualiza `cliente`; `enrichBuyerIdentityPayload()` mantiene/crea `buyer_id`, `buyer_group_key` y `buyer_match_status`.
- `ingresos`: actualiza el cliente embebido en `concepto` mediante `buildConceptWithWho()`; también mantiene/crea identidad de comprador.
- `perdidas`: actualiza `causa`; la identidad de comprador aplica solo bajo la regla existente de Cartera Viva.
- `transferencias`: actualiza `destino`; no crea identidad de comprador porque no alimenta Cartera Viva.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- Advertencia no bloqueante: engine esperado `node 20.x`; entorno actual `v25.6.0`.
- Búsqueda estática: no se reintrodujeron términos, atributos ni funciones de fusión en `apps/gold/agro`.
- `apps/gold/agro/agro-cartera-viva-view.js`: sin cambios.

### Fuera de alcance confirmado

- No se implementó fusión.
- No se agregó modo selección.
- No se agregaron checkboxes o botones nuevos en cards/lista.
- No se tocaron tags, filtros, cards ni handlers de la vista principal de Cartera Viva.

---

## 2026-05-06 — Polish client assignment editor (Fase 1.1)

### Objetivo

Corregir dos bugs visuales y de estado en el bloque "Cliente" del modal de edición de facturero:
1. Dropdown nativo `<select>` se abre con fondo blanco (pintado por el SO/navegador), rompiendo ADN Visual V11.
2. En modo "Nuevo cliente", el selector de cliente existente sigue visible porque `display: grid` sobreescribe el atributo `hidden`.

### Diagnóstico

- **Bug 1**: `<select>` nativo en Chrome/Windows renderiza el menú desplegado con estilos del sistema operativo (fondo blanco, sin control CSS).
- **Bug 2**: Regla CSS `.client-assignment-editor__panel { display: grid }` sobreescribe `hidden`, haciendo visible el panel de "Cliente existente" en modo "Nuevo cliente".

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `agro-cartera-viva-client-assignment.js` | JS | Reemplazado `<select>` nativo por combobox custom con `role="listbox"` y `role="option"` |
| `agro-cartera-viva-client-assignment.js` | JS | Agregada función `renderCombobox()` con trigger button, lista dropdown y data attributes |
| `agro-cartera-viva-client-assignment.js` | JS | `bindHostEvents`: click en trigger abre/cierra lista; click en option selecciona y cierra; click fuera cierra; ESC cierra |
| `agro-cartera-viva-client-assignment.js` | JS | `syncMode`: cierra lista desplegada al cambiar de modo |
| `agro-cartera-viva-client-assignment.js` | JS | `resolveClientAssignmentEditor`: lee selección del combobox vía `data-*` en vez de `<select>.options` |
| `agro.css` | CSS | Regla `.client-assignment-editor__panel[hidden] { display: none !important }` |
| `agro.css` | CSS | Estilos combobox: trigger, lista, opciones, hover, focus, selected — todo con tokens ADN V11 |

### Comportamiento corregido

- `Cliente existente`: combobox dark/gold, sin dropdown blanco nativo.
- `Nuevo cliente`: panel de existentes completamente oculto; solo input de nuevo nombre visible.
- Al cambiar de modo, se cierra cualquier lista desplegada.
- ESC cierra la lista.
- Guardar no cambia monto, fecha, estado, tipo ni cultivo.

### Validación

- `git diff --check`: PASS (sin errores).
- `pnpm build:gold`: PASS (4.90s, sin errores).
- No se tocó `agro-cartera-viva-view.js`.

### Fuera de alcance confirmado

- No se implementó fusión.
- No se agregó modo selección.
- No se reintrodujeron `Fusionar clientes`, `data-cartera-merge`, `mergeCarteraVivaBuyers`.
- No se tocaron tags, filtros, cards ni handlers de la vista principal.

### Commit sugerido

```
fix(agro): polish client reassignment editor states
```

---

## 2026-05-06 — Fase 2: Unificar clientes duplicados (plan)

### Objetivo

Implementar fusión/unificación de clientes duplicados en Cartera Viva vía modal dedicado, sin modo selección sobre cards.

### Diagnóstico

- Cartera Viva agrupa clientes por `buyer_group_key` / `canonical_name` (normalizados vía `normalizeBuyerGroupKey`).
- Tablas que alimentan la vista: `agro_pending`, `agro_income`, `agro_losses` — todas con campos `buyer_id` y `buyer_group_key`.
- `agro_buyers` es el directorio canónico: `id`, `user_id`, `display_name`, `group_key`, `canonical_name`, `status`.
- Soft-delete en buyers: `status = 'archived'` (`.neq('status', 'archived')`).
- Buyers duplicados = registros distintos en `agro_buyers` con nombres que el usuario identifica como el mismo cliente.
- La vista se refresca vía `loadSummary()` + `scheduleExternalPortfolioRefresh()` (debounce 350ms).
- También se puede emitir `agro:client:changed` para que `handleClientChanged` refresque.

### Plan Fase 2

1. **Crear módulo** `agro-cartera-viva-client-merge.js`:
   - Exporta `initCarteraVivaClientMerge()` y `openCarteraVivaClientMergeModal()`.
   - Modal propio con combobox destino + chips de origen múltiples.
   - Confirmación con resumen antes de ejecutar.
   - Al confirmar: actualiza `buyer_id` y `buyer_group_key` en `agro_pending`, `agro_income`, `agro_losses`; archiva buyers origen vía `status = 'archived'`.
   - Al terminar: emite `agro:client:changed` y dispara `data-refresh` para refrescar la vista.

2. **Wire en `agro-cartera-viva-view.js`**:
   - Agregar botón `Unificar clientes` en el action pair del header.
   - Agregar handler click para abrir modal.
   - No interceptar clicks de cards/tags/filtros.

3. **Import en `index.html`** junto al resto de módulos dinámicos.

4. **CSS en `agro.css`**: estilos del modal y chips con tokens ADN V11.

### Archivos a tocar

| Archivo | Cambio |
|---|---|
| `agro-cartera-viva-client-merge.js` | NUEVO — módulo completo |
| `agro-cartera-viva-view.js` | Wiring: botón + handler click |
| `agro.css` | Estilos del modal de fusión |
| `index.html` | Import dinámico del módulo |
| `AGENT_REPORT_ACTIVE.md` | Este reporte |

### Riesgos

- **Actualización masiva**: actualizar `buyer_id` y `buyer_group_key` en múltiples tablas requiere queries Supabase con filtro `buyer_id IN (origen_ids)`. Si la tabla grande, puede ser lento.
- **Archivar buyers**: safe vía `status = 'archived'` pero solo si los registros ya fueron reasignados.
- **No romper clicks de Cartera Viva**: el modal es overlay local; cerrado = cero interceptación. Sin listeners globales permanentes.

### QA online esperado

1. Tags/filtros funcionan antes y después de fusión.
2. Cards abren detalle antes y después.
3. Botón "Unificar clientes" abre modal.
4. Elegir destino y orígenes funciona sin crash.
5. Confirmar reasigna movimientos al destino.
6. Buyer origen se archiva.
7. Cancelar no cambia nada.
8. ESC cierra el modal.
9. No aparece modo selección en cards.

### Nota explícita

No se usará modo selección sobre cards. Todo dentro del modal.

---

## 2026-05-06 — Fase 2: Unificar clientes duplicados (implementación)

### Objetivo

Implementar fusión/unificación de clientes duplicados en Cartera Viva vía modal dedicado, sin modo selección sobre cards.

### Diagnóstico

- **Tablas afectadas**: `agro_pending`, `agro_income`, `agro_losses` (campos `buyer_id`, `buyer_group_key`), `agro_buyers` (campo `status` = `'archived'`).
- **Agrupamiento**: `normalizeBuyerGroupKey()` normaliza nombres (sin acentos, minúsculas, espacios colapsados).
- **Buyer destino**: se usa `buyer_id` y `group_key`/`canonical_name` del buyer seleccionado como destino.
- **Refresco**: se emite `agro:client:changed` con `openDetail: true` para que la vista refresque automáticamente.

### Archivos modificados

| Archivo | Tipo | Cambio |
|---|---|---|
| `agro-cartera-viva-client-merge.js` | NUEVO | Módulo completo de fusión: carga buyers, modal con combobox destino + chips origen, resumen, ejecución |
| `agro-cartera-viva-view.js` | Wiring | Import de `openCarteraVivaClientMergeModal`; botón `Unificar clientes` en action pair; handler click con `supabase.auth.getUser()` |
| `agro.css` | CSS | Estilos del modal de fusión: overlay, dialog, combobox, chips, summary, botones — todo con tokens ADN V11 |

### Cómo se montó la acción "Unificar clientes"

- Botón `data-cartera-unify-clients` dentro del `.cartera-viva-action-pair` existente.
- Handler en el click delegado de la vista: obtiene userId vía `supabase.auth.getUser()`, llama a `openCarteraVivaClientMergeModal({ supabase, userId })`.

### Qué tablas/campos actualiza

Al confirmar la fusión:

1. **`agro_pending`**: `buyer_id` → destino, `buyer_group_key` → destino — registros donde `buyer_id` IN (origen_ids) y `deleted_at IS NULL`.
2. **`agro_income`**: mismos campos, mismas condiciones.
3. **`agro_losses`**: mismos campos, mismas condiciones.
4. **`agro_buyers`**: `status` = `'archived'` para cada buyer origen — soft-delete.

Montos, monedas, fechas, estados, cultivos, notas — no se modifican.

### Cómo se evita romper clicks de Cartera Viva

- Modal es overlay propio con `z-index: 10001`.
- Modal cerrado = `hidden` + `display: none !important`.
- No hay overlay global permanente.
- No hay listeners sobre `document` que intercepten clicks de la vista.
- El listener de click es scoped al modal, no al documento.
- ESC cierra el modal vía `keydown`.
- Click fuera del dialog (en overlay) cierra el modal.

### Si se archivaron buyers duplicados

Sí. Al confirmar la fusión, cada buyer origen se archiva vía `status = 'archived'` en `agro_buyers`. Los buyers archivados desaparecen del selector de cliente existente (que filtra `.neq('status', 'archived')`).

### Validación

- `git diff --check`: PASS (sin errores).
- `pnpm build:gold`: PASS (5.91s, sin errores).
- No se tocó `agro-cartera-viva-view.js` más allá del wiring mínimo (import + botón + handler).
- No se tocó `agro.js`.
- No se tocó `agro-clients.js`.
- No se tocó `agrocompradores.js`.

### Fuera de alcance confirmado

- No se implementó modo selección sobre cards.
- No se agregaron checkboxes en cards.
- No se interceptaron clicks de tags/filtros.
- No se usó `stopPropagation`/`preventDefault` fuera del modal.
- No se agregó overlay global permanente.
- No se tocó edición de nombre final (declarado para fase 2.1 si se desea).

### Commit sugerido

```
feat(agro): add safe cartera viva client merge modal
```

---

## 2026-05-06 — Fix: client names invisible in merge modal combobox

### Problema

Los nombres de clientes no se veían dentro del dropdown/listbox del modal "Unificar clientes". La lista se abría pero el texto era invisible.

### Causa

Los botones/opciones del combobox usaban `font: inherit` que heredaba propiedades de tipografía ajustadas con efectos metálicos (`background-clip: text`, `-webkit-text-fill-color: transparent`) desde contenedores padres. Aunque esos efectos aplicaban a selectores específicos (`.agro-shell-sidebar__title`, etc.), la herencia de `font: inherit` en botones sin color explícito resultaba en texto invisible sobre fondo oscuro.

### Solución aplicada

Se agregaron propiedades defensivas a todos los elementos de texto del modal y del combobox:

1. `font-family: var(--font-body, 'Rajdhani', sans-serif)` explícito en vez de `font: inherit`
2. `font-weight: 600` explícito
3. `color: var(--text-primary, #ffffff)` en vez de `color: var(--text-secondary)` para opciones del combo
4. `-webkit-text-fill-color: currentColor` en combobox trigger, opciones y chips
5. `background: var(--bg-3, #111113)` en dialog (mejor contraste que `var(--card-bg)`)
6. Mismo fix preventivo aplicado al combobox de Phase 1.1 (`#modal-edit-facturero`)

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `agro.css` | `.cartera-viva-merge__dialog`: color, font-family, -webkit-text-fill-color |
| `agro.css` | `.cartera-viva-merge__combo-trigger`: color, font-family, font-weight, -webkit-text-fill-color |
| `agro.css` | `.cartera-viva-merge__combo-option`: color, font-family, font-weight, -webkit-text-fill-color |
| `agro.css` | `.cartera-viva-merge__origin-chip`: font-family, -webkit-text-fill-color |
| `agro.css` | `.cartera-viva-merge__close`: -webkit-text-fill-color |
| `agro.css` | `#modal-edit-facturero .client-assignment-combobox__trigger`: color, font-family, font-weight, -webkit-text-fill-color |
| `agro.css` | `#modal-edit-facturero .client-assignment-combobox__option`: color, font-family, font-weight, -webkit-text-fill-color |

### Validación

- `git diff --check`: PASS
- `pnpm build:gold`: PASS

---

## 2026-05-06 — Fix: texto invisible en selector de clientes del modal unificar

### Objetivo
Diagnosticar y corregir el bug visual donde las letras eran invisibles en el combobox de clientes y chips de duplicados del modal de unificar clientes en Cartera Viva.

### Diagnóstico
- **Causa raíz**: Incompatibilidad de nombres de propiedad JS.
- `renderBuyerOption()` (línea 32) retorna objetos con propiedades en **camelCase**: `{ id, displayName, groupKey }`.
- `renderDestinationCombobox()`, `renderOriginChips()` y `renderModalContent()` referenciaban **snake_case**: `b.display_name`, `selected.display_name`.
- Resultado: `escapeHtml(undefined)` → `""` → texto vacío en el DOM → letras invisibles.

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro-cartera-viva-client-merge.js` | bugfix | 5 reemplazos de `display_name` → `displayName` en plantillas de renderizado |

### Commit
- `9a13593` fix(agro): correct display_name→displayName property mismatch in merge modal

### Build
- `pnpm build:gold`: PASS

### QA sugerido
- Abrir Cartera Viva → selector de unificar clientes → verificar que los nombres se ven correctamente en el combobox destino, los chips de duplicados, y el paso de confirmación.
