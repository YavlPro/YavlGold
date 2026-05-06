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
