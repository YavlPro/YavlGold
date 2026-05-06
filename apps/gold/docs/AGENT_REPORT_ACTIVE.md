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
