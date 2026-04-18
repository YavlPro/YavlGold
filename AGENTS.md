# AGENTS.md — Instrucciones Canónicas para Agentes IA

Fuente única de verdad para cualquier agente (Cascade, Codex, Copilot, etc.) que trabaje en este repo.
Release visible activa del producto: `V1`.
Las referencias a `V9.8` solo se conservan cuando están marcadas como históricas o cronológicas.

---

## §1 — Stack tecnológico obligatorio

| Capa | Definición | Prohibido |
| --- | --- | --- |
| Frontend | Vanilla JS (ES6+ Modules) | React, Vue, Svelte, Angular, Next, Nuxt, Astro |
| Build | Vite MPA | Webpack, Turbopack, migración a SPA |
| Backend | Supabase (Auth, DB, Storage, Edge Functions) | Firebase, otro BaaS sin aprobación |
| Estilo | CSS Custom Properties + clases utilitarias ligeras | Tailwind, CSS-in-JS, Styled Components |
| Tipografía | Google Fonts: Orbitron, Rajdhani, Playfair Display | Cambiar familias sin aprobación |
| Iconos | Font Awesome 6.5 | Otras librerías de iconos sin aprobación |

El script `agent-guard.mjs` bloquea React, Vue, Svelte, Angular, Next, Nuxt y Astro en el build. Si un agente instala alguno, el build fallará.

---

## §2 — ADN Visual V10.0 (referencia inmutable)

El sistema de diseño completo vive en `apps/gold/docs/ADN-VISUAL-V10.0.md`. Es **inmutable y obligatorio**.

### Reglas clave que NUNCA se violan

1. **Paleta**: 5-Tone Metallic System. Brand primary = `#C8A752` (`--gold-4`).
2. **Fondos**: Dark por defecto (`--bg-1: #0a0a0a`). Light mode por override de tokens.
3. **Tipografía**: Orbitron (headings), Rajdhani (body/UI), Playfair Display (quotes).
4. **Tokens antes de hardcode**: siempre `var(--token)`, nunca hex directo sin justificación.
5. **Sin acento azul/morado como brand**: azul solo para estado semántico `info`.
6. **Interacciones UI**: 120ms–220ms. Usar `opacity` y `transform`.
7. **`prefers-reduced-motion`**: siempre respetado.
8. **Ghost emojis**: opacity `0.02–0.05`, `pointer-events: none`.
9. **Breakpoints**: Desktop >900px, Tablet ≤900px, Mobile ≤768px, Small ≤480px.

### Anti-patrones prohibidos (§11 del ADN)

- Usar acento morado/azul como brand principal.
- Duplicar paletas por módulo.
- Romper jerarquía tipográfica sin motivo funcional.
- Usar componentes React/TSX.
- Introducir dependencias visuales pesadas.
- Hardcodear colores fuera de tokens.

### Separación semántica de superficies (§20 del ADN)

- Cada vista debe tener una función primaria clara.
- No mezclar historial + dashboard + KPIs + formulario en una misma superficie.
- La capa protagonista es la tarea principal; todo lo demás es secundario.
- Las estadísticas grandes no deben vivir en vistas de historial/detalle como protagonista.
- El botón Volver debe ser siempre visible y accesible.
- Antes de agregar un bloque nuevo, el agente debe verificar que pertenece semánticamente a esa vista.

---

## §3 — Arquitectura y organización de código

### 3.1 — Monolito Agro

- `apps/gold/agro/agro.js` es el monolito principal (~18k líneas). **No agregar features nuevas aquí**; crear módulos separados (`agro-*.js`) e importarlos dinámicamente.
- Ediciones quirúrgicas al monolito (bugfixes, 1–5 líneas de wiring) SÍ están permitidas.

### 3.2 — Módulos Agro existentes

```
agro.js              — monolito principal (facturero, CRUD, historial)
agro-feedback.js     — feedback y encuestas
agro-market.js       — inteligencia de mercado
agro-planning.js     — planificación
agro-interactions.js — interacciones
agro-stats.js        — estadísticas financieras
agro-notifications.js — notificaciones
agro-trash.js        — papelera de eliminados
agro-cart.js         — carrito
```

### 3.3 — Regla de imports

- Los módulos se importan dinámicamente en `agro/index.html` bootstrap.
- Para compartir funciones del monolito con módulos externos, usar `window._agroXxx` como puente.
- Imports deben ser siempre al inicio del archivo.

### 3.4 — CSS

- Estilos en archivos CSS separados (`agro.css`, `agro-dashboard.css`, etc.).
- Usar tokens del ADN Visual V10 (`--gold-4`, `--bg-1`, `--v10-*`, etc.).
- No inline styles masivos; preferir clases CSS.

---

## §4 — Documentación y reportes

| Archivo | Rol | Crece? |
| --- | --- | --- |
| `AGENTS.md` (este archivo) | Instrucciones canónicas para agentes | Solo con aprobación |
| `apps/gold/docs/MANIFIESTO_AGRO.md` | Verdad semántica canónica del módulo Agro | Solo con autorización expresa |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Reporte operativo activo | Sí — cada sesión agrega sección |
| `apps/gold/docs/AGENT_REPORT.md` | Histórico legacy | No — solo consulta |
| `apps/gold/docs/ADN-VISUAL-V10.0.md` | Sistema de diseño inmutable | Solo con versionamiento formal |

### Jerarquía canónica obligatoria

- `AGENTS.md` es el único archivo canónico de instrucciones del repo.
- `AGENT.md` no debe existir ni recrearse.
- `apps/gold/docs/MANIFIESTO_AGRO.md` es la verdad semántica canónica del módulo Agro. Ningún agente puede modificarlo sin autorización expresa del usuario o autorización explícita en sesión activa. Toda mejora funcional real de Agro que cambie la comprensión del sistema debe reflejarse ahí.
- No debe confundirse con `AGENT_REPORT_ACTIVE.md` (bitácora operativa), fichas técnicas, reportes de sesión ni notas de diagnóstico.
- Debe mantenerse humano, semántico, claro y libre de contaminación técnica innecesaria.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md` es la única fuente activa de reportes de sesión.
- `apps/gold/docs/AGENT_REPORT.md` es solo histórico legacy.
- `AGENT_REPORT_ACTIVE.md` en la raíz, si existe, es solo un puntero de compatibilidad y no compite con la ruta activa.
- `global_rules.md` de Windsurf, si aparece, es solo copia operativa condensada y no fuente de verdad.

### 4.1 — Rotación canónica de `AGENT_REPORT_ACTIVE.md`

Para evitar que `apps/gold/docs/AGENT_REPORT_ACTIVE.md` se convierta en un monolito documental difícil de leer, difícil de mantener y costoso para agentes, se establece la siguiente ley canónica de rotación:

#### Regla de umbral

- Cuando `apps/gold/docs/AGENT_REPORT_ACTIVE.md` alcance o supere **4000 líneas**, el agente debe tratarlo como candidato obligatorio a rotación.
- No se debe seguir creciendo indefinidamente un reporte activo por comodidad.

#### Acción obligatoria al superar el umbral

Cuando el archivo supere el umbral:

1. **Archivar el documento activo actual** como contexto histórico.
2. **Renombrarlo** con formato explícito de rango temporal:

   `AGENT_LEGACY_CONTEXT__<fecha-inicio>__<fecha-cierre>.md`

   Ejemplo:

   `AGENT_LEGACY_CONTEXT__2026-03-12__2026-04-17.md`

3. El documento archivado debe conservar:
   - fecha de inicio;
   - fecha de cierre;
   - contenido íntegro;
   - naturaleza histórica / solo consulta.

4. Luego, el agente debe **crear un nuevo**:

   `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

   dejando ese archivo como la única fuente activa vigente.

#### Regla semántica

- `AGENT_REPORT_ACTIVE.md` = **estado vivo / contexto operativo actual**
- `AGENT_LEGACY_CONTEXT__*.md` = **contexto histórico archivado**
- Las crónicas mensuales siguen siendo memoria histórica mayor y no se reemplazan.

#### Contenido mínimo del nuevo `AGENT_REPORT_ACTIVE.md`

El nuevo archivo activo debe arrancar limpio, pero no ciego.
Debe incluir al menos:

- estado actual del proyecto;
- frente(s) abiertos;
- decisiones canónicas vigentes;
- deuda técnica viva;
- últimos cambios importantes todavía relevantes;
- referencias a los archivos archivados si hacen falta.

#### Regla de no-confusión

- `AGENT_REPORT_ACTIVE.md` sigue siendo la única fuente activa de reportes de sesión.
- Ningún archivo legacy archivado compite con él.
- `AGENT_REPORT.md` no debe reactivarse como archivo activo.
- Si existe `AGENT_REPORT.md`, sigue tratándose como legacy / compatibilidad / solo consulta, salvo cambio canónico explícito.

#### Regla operativa para agentes

Si durante una sesión un agente detecta que `AGENT_REPORT_ACTIVE.md` ya superó 4000 líneas, debe:

1. diagnosticar si corresponde rotación;
2. archivar el activo actual con rango temporal;
3. crear el nuevo `AGENT_REPORT_ACTIVE.md`;
4. dejar constancia breve de la rotación en el nuevo activo;
5. seguir trabajando sobre el nuevo archivo, no sobre el archivado.

#### Principio rector

El reporte activo debe ser **útil para trabajar hoy**, no una acumulación infinita de pasado.
La memoria completa se conserva, pero el contexto vivo debe mantenerse ligero, claro y operacional.

### 4.2 — Ley de Archivo por Frente Cerrado

Cuando un frente de trabajo quede **cerrado y validado**, sus documentos de diagnóstico, matriz, plan, informe o cierre ya no deben competir con la documentación activa.

#### Regla obligatoria
- `AGENT_REPORT_ACTIVE.md` sigue siendo la única fuente activa de reportes de sesión.
- Los documentos de un frente cerrado deben:
  - archivarse por frente/categoría,
  - o marcarse como histórico / solo consulta,
  - pero no seguir aparentando estado activo.

#### Estructura de archivo
Los documentos cerrados deben moverse a una carpeta separada de las crónicas y de los documentos canónicos, por ejemplo:

`apps/gold/docs/archive/<frente>/`

Ejemplos:
- `apps/gold/docs/archive/supabase/`
- `apps/gold/docs/archive/frontend/`
- `apps/gold/docs/archive/backend/`
- `apps/gold/docs/archive/bugs/`
- `apps/gold/docs/archive/ux/`

#### Regla de no-confusión
- No mezclar documentos archivados con `chronicles/`.
- No mezclar documentos archivados con `AGENT_REPORT_ACTIVE.md`.
- No mezclar documentos archivados con documentos canónicos como:
  - `AGENTS.md`
  - `MANIFIESTO_AGRO.md`
  - `ADN-VISUAL-V10.0.md`
  - `FICHA_TECNICA.md`

#### Regla de conservación
- Si el documento conserva valor histórico, técnico o explicativo, NO debe borrarse.
- Si el documento es redundante puro y no aporta valor único, puede eliminarse.
- Si existe duda, preferir archivar antes que borrar.

#### Regla operativa
Al cerrar un frente, el agente debe:
1. clasificar los documentos del frente;
2. dejar activo solo lo que realmente siga vivo;
3. mover lo cerrado a `archive/<frente>/`;
4. documentar la limpieza en `AGENT_REPORT_ACTIVE.md`.

---

## §5 — Build y QA

### Build obligatorio

```bash
pnpm build:gold
```

Incluye: `agent-guard.mjs` (deps prohibidas) + `agent-report-check.mjs` (reporte activo) + `vite build` + `check-dist-utf8.mjs` (UTF-8).

### QA post-cambio

- Verificar que el build pasa sin errores.
- Para cambios de UI, probar en viewport desktop y mobile (≤480px).
- Para cambios de datos, verificar que estadísticas y exportes siguen correctos.
- Para cambios de auth/session, verificar login/logout flow.
- Si se usa Playwright para QA:
  - cerrar sesión/contexto/browser al terminar cada bloque de prueba;
  - borrar explícitamente la carpeta temporal usada por esa prueba en `%LOCALAPPDATA%\Temp\playwright-mcp-output\<session-id>`.

### Credenciales QA locales

- Para QA autenticada en produccion, los agentes pueden consultar `testqacredentials.md` en la raiz del repo **solo si existe localmente**.
- `testqacredentials.md` es un archivo local y sensible:
  - debe permanecer bajo `.gitignore`;
  - no debe copiarse a `AGENTS.md`, `AGENT_REPORT_ACTIVE.md`, issues, PRs ni otros archivos versionados;
  - se usa solo para pruebas reales de QA, nunca como credencial de desarrollo general.
- Si el archivo no existe o esta desactualizado, el agente debe pedir confirmacion al usuario antes de improvisar accesos o credenciales.

### Politica de QA sobre produccion real

- Cuando se use la cuenta QA dedicada para agentes sobre produccion real:
  - los datos creados para pruebas deben tratarse como temporales y controlados;
  - no se deben dejar datos QA ambiguos, basura de prueba o duplicados que contaminen la siguiente sesion;
  - al terminar cada bloque de QA, el agente debe:
    - limpiar o revertir datos temporales sembrados para la prueba, o
    - dejar explicitamente documentado que dataset QA estable permanece y por que;
  - cualquier dataset QA persistente debe vivir solo en la cuenta QA dedicada, no mezclado con la cuenta personal del usuario;
  - el cierre de sesion debe dejar produccion en un estado entendible y seguro para futuras pruebas;
  - ademas del cleanup de datos QA, el agente debe cerrar Playwright/browser y borrar temporales locales de esa sesion.

---

## §6 — Supabase

- Tablas usan soft-delete (`deleted_at` timestamp) como patrón estándar.
- Queries filtran `.is('deleted_at', null)` por defecto.
- RLS activo — siempre filtrar por `user_id`.
- Para cambios DDL, usar migraciones.
- Monedas soportadas: COP, USD, VES.

---

## §7 — Reglas de conducta del agente

1. **Leer antes de editar**: siempre leer el archivo antes de hacer cambios.
2. **Rol de cirugía (Policy operativa)**: Codex debe usarse prioritariamente como agente de cirugía técnica (diagnóstico fino, fix quirúrgico, build y cierre). No debe usarse por defecto como agente principal de QA intensivo, browser exploration larga o sesiones pesadas de Playwright, ya que consume créditos ineficientemente. El flujo recomendado es:
   - QA manual o validación humana/browser para detectar el bug.
   - Documentación clara del problema.
   - Codex entra a corregir de forma quirúrgica.
   - Revalidación posterior manual/humana.
   - *Nota: Solo en casos excepcionales y justificados se permite usar Codex para QA/browser intensivo.*
3. **Ediciones mínimas**: preferir cambios quirúrgicos. No reescribir funciones enteras para un bugfix.
4. **No crear archivos innecesarios**: no generar scripts temporales, tests sueltos, ni .md redundantes.
5. **No borrar comentarios existentes** salvo que el usuario lo pida.
6. **No agregar emojis al código** salvo que el usuario lo pida.
7. **Respetar el idioma**: UI en español. Código y logs en inglés o español según contexto existente.
8. **Build siempre al final**: cualquier sesión con cambios de código debe terminar con `pnpm build:gold`.

---

## §8 — Orquestación operativa del agente

Este bloque define cómo debe trabajar un agente dentro de YavlGold cuando la tarea tenga riesgo real, varios pasos, o impacto en partes sensibles del sistema.

Su propósito no es volver lento el trabajo.
Su propósito es reducir improvisación, proteger el producto y aumentar la calidad de ejecución.

### 8.1 — Planificación por defecto en tareas no triviales

Entrar en modo planificación cuando ocurra al menos una de estas condiciones:

- la tarea tenga más de 3 pasos relevantes;
- toque arquitectura, wiring, imports, contratos de datos o persistencia;
- afecte UX + lógica + estado + datos;
- exista ambigüedad real sobre la causa raíz;
- haya riesgo de romper una zona estable del sistema.

En esos casos, el agente debe:

1. diagnosticar primero;
2. escribir un plan breve y verificable;
3. definir DoD claro;
4. recién después editar.

**Excepción:**
Si el cambio es pequeño, obvio y de bajo riesgo, se permite ejecución directa sin burocracia innecesaria.

---

### 8.2 — Diagnóstico antes de tocar código

Antes de modificar archivos, el agente debe dejar claro:

- cuál es el problema exacto;
- dónde vive;
- cuál es la causa raíz probable;
- qué archivo(s) son realmente responsables;
- cuál es la opción de arreglo más segura.

No basta con decir "parece ser".
Hay que señalar funciones, flujos, condiciones, estilos, wiring o contratos concretos.

En YavlGold, el diagnóstico vale más que la prisa.

---

### 8.3 — Subagentes con criterio, no por moda

Los subagentes pueden usarse para:

- exploración;
- lectura paralela;
- comparación de opciones;
- auditoría visual o estructural;
- verificación independiente.

Pero no deben fragmentar sin control el corazón del sistema.

Reglas:

- una responsabilidad clara por subagente;
- no duplicar análisis del mismo punto sin propósito;
- no repartir en paralelo la misma zona crítica;
- la decisión final siempre pertenece al agente principal.

Los subagentes ayudan a limpiar contexto.
No sustituyen criterio técnico.

---

### 8.4 — Lecciones reutilizables

Después de una corrección importante, el agente debe preguntarse:

- ¿qué error se repitió?
- ¿qué señal se ignoró?
- ¿qué regla concreta habría evitado este fallo?

Solo si la lección es reutilizable y de valor real, debe registrarse en la documentación operativa correspondiente.

**No convertir esto en ritual vacío.**
No documentar obviedades ni ruido.

---

### 8.5 — Verificación antes de declarar "completado"

Ninguna tarea se marca como cerrada sin demostrar funcionamiento.

El agente debe, según el caso:

- ejecutar `pnpm build:gold`;
- revisar errores, logs o warnings relevantes;
- validar el flujo tocado;
- comparar antes vs después cuando haga falta;
- explicar qué quedó corregido y cómo se comprobó.

Pregunta obligatoria antes de cerrar:

> "¿Yo mismo confiaría en este cambio para dejarlo vivo en el proyecto sin sentir que estoy improvisando?"

Si la respuesta no es claramente sí, la tarea no está cerrada.

---

### 8.6 — Elegancia con equilibrio

Para cambios no triviales, el agente debe hacer una pausa mental y preguntarse:

> "¿Existe una solución más limpia, más pequeña o más robusta?"

Pero esta búsqueda de elegancia **no** debe convertirse en sobreingeniería.

Regla práctica:

- si el problema requiere cirugía fina, hacer cirugía fina;
- si el sistema pide refactor estructural, justificarlo con evidencia;
- si un parche resuelve hoy pero empeora mañana, detenerse y rediseñar;
- si el refactor agrega riesgo innecesario, elegir el menor diff posible.

En YavlGold, elegancia real = claridad + mínimo impacto + respeto por el sistema vivo.

---

### 8.7 — Corrección autónoma de errores

Cuando el usuario reporte un bug, el agente no debe pedir guía paso a paso si ya existe suficiente contexto para investigar.

Debe:

1. identificar la zona afectada;
2. localizar evidencia en código, flujo o logs;
3. proponer la corrección más segura;
4. ejecutarla con el menor alcance posible;
5. verificar.

Autonomía no significa adivinar.
Significa investigar sin trasladar al usuario trabajo técnico que el agente puede resolver por sí mismo.

---

### 8.8 — Principios de ejecución

#### Simplicidad primero
Cada cambio debe ser lo más simple posible.

#### Causa raíz primero
No maquillar síntomas. Buscar la fuente real del problema.

#### Impacto mínimo
Tocar lo menos posible para corregir lo necesario.

#### Verdad antes que apariencia
No declarar "listo" algo que no fue probado.

#### Respeto por el sistema existente
No romper ADN Visual V10.
No introducir React, Tailwind ni SPA.
No crecer `agro.js` salvo integración mínima o bugfix quirúrgico justificado.

---

### 8.9 — Regla final

El mejor agente no es el que más escribe.
Es el que:

- entiende bien;
- toca poco;
- corrige de verdad;
- demuestra el resultado;
- y deja el proyecto más claro que antes.

---

## §10 — Gobernanza Operativa y Confiabilidad

### §10.1 — Regla de Confiabilidad Operativa y Desacato

La confiabilidad de un agente no se define únicamente por su capacidad técnica, velocidad de producción o apariencia de utilidad.

La confiabilidad operativa se define, ante todo, por su obediencia estricta al alcance, a las restricciones y a las instrucciones explícitas de la sesión.

#### Principio rector

Un agente que produce contenido útil pero desobedece el scope sigue siendo un riesgo operativo.

El valor parcial del resultado no compensa la ruptura de disciplina.

En este proyecto, el desacato no se interpreta como un detalle menor, sino como una falla de gobernanza.

#### Regla formal

Si un agente:

- ejecuta acciones no autorizadas;
- modifica archivos fuera del alcance definido;
- toca git, documentación canónica o zonas sensibles sin permiso;
- expande la tarea más allá de lo solicitado;
- ignora restricciones explícitas de lectura, diagnóstico o no intervención;

entonces ese agente debe considerarse **operativamente no confiable** para trabajo sensible, aunque parte de su salida parezca correcta o aprovechable.

#### Criterio de evaluación

La obediencia al alcance tiene prioridad sobre la brillantez aparente.

En YavlGold:
- un agente limitado pero disciplinado es preferible a un agente capaz pero invasivo;
- un agente que requiere contención constante degrada el flujo de trabajo;
- un agente que desacata en patrón no debe recibir control libre sobre zonas críticas.

#### Política derivada

Cuando se confirme un patrón de desacato, el agente:

1. no debe recibir tareas con acceso libre a git;
2. no debe tocar documentación canónica sin supervisión explícita;
3. no debe operar sobre infraestructura, autenticación, migraciones o capas sensibles;
4. no debe ejecutar acciones de escritura cuando la instrucción haya sido diagnóstico, lectura o auditoría;
5. debe tratarse como herramienta de bajo nivel de confianza, incluso si ocasionalmente produce material útil.

#### Regla de protección del repo

El repo no se contamina solo con código malo.
También se contamina con acciones útiles ejecutadas fuera de control.

Por tanto, cualquier cambio producido en desacato:
- debe auditarse antes de aceptarse;
- no debe presumirse válido por el solo hecho de compilar;
- no corrige la falta de obediencia del agente que lo produjo.

#### Criterio final

La disciplina operativa no es opcional.

En YavlGold, obedecer el alcance forma parte de la calidad.
Un agente que no respeta límites no es un colaborador confiable del sistema vivo.

#### Origen

Lección consolidada a partir de patrones reales de desacato observados en sesiones operativas.

### §10.2 — Nota de gobernanza — utilidad en desacato

Se reconoce que un agente puede, en ocasiones, producir un cambio técnicamente útil mientras actúa fuera del alcance autorizado.

Esa utilidad parcial no modifica la lectura operativa del hecho.

Cuando una acción se ejecuta en desacato:
- la conducta se considera inaceptable;
- el cambio no se presume legítimo por su utilidad;
- la confianza del agente no aumenta, sino que disminuye;
- toda salida debe revisarse como material potencialmente contaminado por falta de obediencia.

Regla práctica:
un resultado correcto obtenido fuera del scope no se celebra como acierto pleno;
se trata como excepción riesgosa dentro de una conducta operativamente defectuosa.

---

## §11 — Deuda Técnica Documentada y Política de Mejora Continua

### 11.1 Monolito `agro.js`
- **Estado actual:** ~16,500 líneas. Núcleo funcional pero denso.
- **Regla:** NO agregar features nuevas. NUEVAS funcionalidades SIEMPRE en `agro-*.js` separado.
- **Migración gradual:** `window.XXX` (104+ asignaciones) se irá migrando a imports ES6 solo cuando se toquen esos bloques por otros motivos.

### 11.2 Gestión de Memoria y Eventos
- Todo `setInterval` DEBE tener su `clearInterval` en cleanup (`beforeunload` o destrucción de vista).
- Todo `addEventListener` debe contemplar `removeEventListener` o usarse con `{ once: true }`/delegación cuando aplique.
- **Verificación obligatoria** en cada PR que toque módulos con temporizadores o listeners.

### 11.3 CSS Inline vs Tokens ADN V10
- `index.html` contiene ~1,144L de CSS inline con hex hardcodeados (deuda heredada).
- **Política:** No refactorizar de golpe. Migrar progresivamente a archivos `.css` usando tokens `--gold-*`, `--bg-*`, `--space-*`, etc.
- **Nuevos estilos:** SIEMPRE en archivos CSS separados, NUNCA inline masivo.

### 11.4 Naming y Convenciones
- Nuevos archivos JS: `agro-kebab-case.js` (estándar del proyecto).
- NO renombrar archivos legacy existentes salvo que se refactorice el módulo completo y se validen imports.

### 11.5 Market Ticker (Binance)
- `agro-market.js` y `agro-interactions.js` hacen polling duplicado.
- **Plan:** Consolidar en un único singleton centralizado cuando se toque esa área de negocio.

### 11.6 Filosofía de Ejecución
- ✅ NO pánico por tamaño. 79K líneas funcionando > 10K líneas rotas.
- ✅ NO reescrituras masivas. Mejora quirúrgica y acumulativa.
- ✅ CADA commit debe dejar el código ligeramente más limpio que como lo encontró (Regla del Boy Scout).
- ✅ Build gate obligatorio: `pnpm build:gold` tras cualquier intervención.

### 11.7 Principios de Localidad e Higiene del Repo

#### Principio de Localidad del Producto
- Todo archivo, asset, módulo o recurso del producto visible u operativo debe vivir dentro de `apps/gold/`
- Fuera de `apps/gold/` solo debe quedar infraestructura real del repo o excepción técnica justificada
- `apps/gold/` es el único directorio que contiene código, assets y documentación del producto YavlGold

#### Higiene del Contexto para Agentes
- Archivos legacy visibles, zombies y duplicados dentro del árbol activo contaminan la lectura de los agentes aunque no participen en runtime
- Limpiar contexto no es estética: es defensa operativa del canon
- Los agentes deben identificar y eliminar archivos zombies/muertos/duplicados como parte del trabajo cotidiano

#### Archivos en raíz del repo
- NO crear más archivos en raíz salvo necesidad real y justificada
- El directorio `supabase/` en raíz es infraestructura del repo y NO debe moverse sin diagnóstico serio previo

#### Regla canónica de Supabase (obligatoria)

- La única carpeta **Supabase canónica** del repo es:

  `supabase/` (en la raíz del repositorio)

- Esa carpeta es la única fuente de verdad para:
  - migraciones canónicas;
  - vínculo remoto;
  - Edge Functions;
  - configuración principal de Supabase;
  - operaciones de infraestructura reales del proyecto.
- `apps/gold/supabase/` **NO es canónica** y fue retirada del árbol activo el 2026-04-18 tras validación controlada de `supabase start --workdir .` y `supabase db reset --workdir . --local --no-seed`.
- Si `apps/gold/supabase/` reaparece, debe tratarse como regresión operativa o contexto legacy accidental, no como segundo proyecto Supabase válido.
- Ningún agente debe recrear migraciones, funciones ni configuración Supabase en `apps/gold/supabase/`.
- Ningún agente debe asumir que existen dos árboles Supabase válidos.
- Evitar duplicaciones Supabase es una regla estricta del repo.

##### Política operativa derivada

- Toda operación Supabase real debe partir del canon de raíz o referenciarlo explícitamente.
- Si un script, documento vivo o flujo local vuelve a apuntar a `apps/gold/supabase/`, eso debe tratarse como deuda operativa a corregir, no como segundo canon.
- Las referencias históricas en informes de diagnóstico no reactivan el árbol secundario ni autorizan su uso operativo.
- Antes de crear, mover o fusionar cualquier árbol Supabase secundario, debe existir diagnóstico, reconciliación y validación explícita.

### 11.X — Ley Anti-Monolito General

El repo debe evitar crecimiento monolítico innecesario en código, vistas, estilos y documentación operativa.

#### Principio
Separación modular por partes.
Cada archivo debe mantener una responsabilidad clara y un tamaño razonable para humanos y agentes.

#### JS
- Ideal: < 800 líneas
- Vigilancia: 800–1200
- Si supera 1200: evaluar extracción modular
- Si supera 2000: no crecer con nuevas features; solo cirugía o extracción

#### HTML
- Ideal: < 600 líneas
- Vigilancia: 600–900
- Si supera 900: evaluar separación por bloques o parciales
- Si supera 1200: no seguir creciendo sin plan de división

#### CSS
- Ideal: < 900 líneas
- Vigilancia: 900–1400
- Si supera 1400: evaluar split por superficie o módulo
- Si supera 1800: no seguir creciendo sin plan de separación

#### Documentación operativa
- Planes cerrados, matrices, informes y diagnósticos no deben quedarse mezclados en el árbol activo si ya fueron ejecutados.
- Deben archivarse por frente conforme a la ley de archivo por frente cerrado.

#### Excepción canónica
Los documentos canónicos:
- `AGENTS.md`
- `MANIFIESTO_AGRO.md`
- `ADN-VISUAL-V10.0.md`
- `FICHA_TECNICA.md`

no se gobiernan por un límite bruto de líneas, sino por:
- claridad estructural,
- secciones estables,
- índice útil,
- semántica limpia,
- y ausencia de contaminación operativa.

---

## §12 — Obsidian + Agent Skills (Policy canónica)

### Propósito
Obsidian se usa como **capa de memoria documental y navegación visual** de YavlGold.
No es la fuente de verdad del código ni debe contaminar el repo del producto.

### Regla de oro
**El repo de YavlGold es canónico. El vault de Obsidian refleja, navega y relaciona.**
Si existe conflicto entre lo que está en el repo y lo que está en el vault, **manda el repo**.

### Arquitectura activa
YavlGold usa un modelo **híbrido**:

- **Repo canónico**: código, documentación oficial, reportes, crónicas, índices y contexto técnico.
- **Vault Obsidian**: lectura, grafo, wikilinks, canvas, memoria viva y navegación documental.
- **Agent Skills**: viven en las rutas del agente, no dentro del código del producto.

### Rutas activas conocidas
- **Repo YavlGold**: `C:\Users\yerik\gold`
- **Vault Obsidian**: **no asumir una ruta fija por defecto. Verificar siempre con el usuario cuál es el vault activo.** Cuando el vault activo sea el documental del repo, usar: `C:\Users\yerik\gold\apps\gold\docs\`
- **Codex CLI skills**: `C:\Users\yerik\.codex\skills\`
- **OpenCode skills**: `C:\Users\yerik\.opencode\skills\obsidian-skills\`

> **Nota operativa:** No asumir OneDrive como vault activo por defecto. La ruta histórica puede variar según la sesión. Para pruebas documentales en el vault del repo, usar exclusivamente: `C:\Users\yerik\gold\apps\gold\docs\test\`

### Skills prioritarias
Las skills prioritarias de Obsidian para agentes son:
- `obsidian-markdown`
- `json-canvas`
- `obsidian-cli`
- `wiki-query` (lectura de wiki, bajo riesgo)

Skills secundarias/opcionales:
- `obsidian-bases`
- `defuddle`
- `wikiforge` (escritura en vault, requiere restricciones — solo con vaults externos al repo)

### Prohibiciones
Los agentes NO deben:
- instalar tooling de Obsidian dentro de `apps/gold`
- meter skills dentro del repo del producto sin instrucción explícita
- duplicar docs masivamente entre repo y vault sin justificación
- tratar el vault como fuente canónica del proyecto
- modificar `.obsidian` del repo sin razón fuerte y documentada
- reorganizar el vault o el repo de forma invasiva

### Flujo correcto de trabajo
Cuando un agente trabaje con documentación de YavlGold:

1. **Leer primero desde el repo canónico**
2. Editar docs canónicos en el repo cuando corresponda
3. Reflejar/sincronizar al vault solo si aporta valor de navegación, memoria o grafo
4. Mantener `AGENT_CONTEXT_INDEX` como mapa central del vault
5. Mantener la jerarquía documental clara:

- **Ley operativa** → `AGENTS.md`
- **Ley visual** → ADN Visual V10
- **Mapa central** → `AGENT_CONTEXT_INDEX.md`
- **Estado vivo** → `AGENT_REPORT_ACTIVE.md`
- **Memoria histórica** → `CRONICA-YAVLGOLD.md` y crónicas mensuales

### Regla de sincronización
Si un documento existe tanto en repo como en vault:
- el **repo** es la fuente de verdad
- el **vault** es una copia de lectura / organización / visualización
- si hay desincronización, debe corregirse tomando como referencia el repo

### Claude Code / Codex / OpenCode
- **Codex CLI** debe usar las skills en su ruta estándar local
- **OpenCode** debe usar el repo completo de `obsidian-skills` en su ruta de skills
- **Claude Code** solo debe configurarse si realmente se va a usar con el vault; no instalar por instalar

### Mantenimiento
Si en el futuro se automatiza la sincronización repo → vault, esa automatización debe:
- vivir fuera del código del producto
- ser simple y reversible
- quedar documentada en este archivo y/o en la documentación operativa correspondiente

### Criterio de éxito
La integración Obsidian ↔ YavlGold es correcta cuando:
- el repo sigue limpio
- el vault sigue útil
- el grafo/documentación ganan claridad
- los agentes entienden rápido el sistema
- no aparece un carnaval de duplicados, rutas raras o tooling fuera de lugar

### §12.X — Patron LLM Wiki de YavlGold (formalizacion)

#### Diagnostico

YavlGold ya opera con el patron LLM Wiki de forma organica. Este proyecto tiene:

- **Schema**: AGENTS.md, ADN-VISUAL-V10.0.md, MANIFIESTO_AGRO.md, FICHA_TECNICA.md
- **Wiki viva**: AGENT_REPORT_ACTIVE.md (crece por sesion, se rota cada 4000+ lineas)
- **Mapa central**: AGENT_CONTEXT_INDEX.md (indice de documentos y su rol)
- **Resumen operativo**: llms.txt (servido en produccion)
- **Memoria historica**: cronicas mensuales, AGENT_LEGACY_CONTEXT__*.md, AGENT_REPORT.md

No se necesita un documento "LLM_WIKI_SCHEMA" nuevo. AGENTS.md ya es el schema maestro.

#### Regla de oro

**Repo canónico primero. Obsidian como capa de navegación y memoria. Los agentes mantienen la wiki viva, pero no reemplazan la verdad del repo.**

#### Capas del sistema documental

| Capa | Rol | Documento canonico |
|---|---|---|
| **Schema / Ley** | Define qué es legal y cómo opera el sistema | AGENTS.md (ley operativa), ADN-VISUAL-V10.0.md (ley visual), MANIFIESTO_AGRO.md (verdad semantica) |
| **Estructura** | Ficha tecnica del proyecto | FICHA_TECNICA.md |
| **Wiki viva** | Memoria operativa acumulativa de sesiones de agentes | AGENT_REPORT_ACTIVE.md |
| **Mapa central** | Indice y navegacion de la wiki | AGENT_CONTEXT_INDEX.md |
| **Resumen operativo** | Contexto rapido para LLMs y produccion | apps/gold/public/llms.txt |
| **Memoria historica** | Versiones anteriores de wiki viva y cronicas | AGENT_LEGACY_CONTEXT__*.md, chronicles/ |
| **Vault Obsidian** | Capa de lectura, grafo y navegacion visual | vault del usuario (no es canon) |

#### Operaciones del sistema wiki

**INGEST (como nueva informacion entra a la wiki):**
1. Un agente termina una sesion de trabajo en YavlGold
2. Ese agente escribe en AGENT_REPORT_ACTIVE.md al final del archivo
3. Formato obligatorio por sesion:
   - Fecha
   - Objetivo de la sesion
   - Diagnostico (archivos inspeccionados, evidencia)
   - Cambios realizados (tabla: archivo, tipo, cambio)
   - Resultado de build
   - QA sugerido o realizado
   - NO se hizo (scope respetado)
4. Si AGENT_REPORT_ACTIVE.md supera 4000 lineas → ejecutar rotacion (canonica §4.1)
5. AGENT_CONTEXT_INDEX.md se actualiza cuando hay nuevos documentos canonicos o cambios de estructura

**QUERY (como un agente consulta la wiki):**
1. Leer AGENTS.md primero (schema de todo)
2. Consultar AGENT_CONTEXT_INDEX.md para ubicar el documento correcto
3. Ir al documento correspondiente segun el tipo de pregunta:
   - Pregunta sobre reglas de agentes → AGENTS.md
   - Pregunta sobre diseño visual → ADN-VISUAL-V10.0.md
   - Pregunta sobre Agro → MANIFIESTO_AGRO.md
   - Pregunta sobre estado operativo actual → AGENT_REPORT_ACTIVE.md
   - Pregunta sobre estructura tecnica → FICHA_TECNICA.md
   - Pregunta sobre contexto general rapido → llms.txt

**LINT (como se mantiene la calidad de la wiki):**
1. Al cerrar sesion, verificar que AGENT_REPORT_ACTIVE.md tiene el formato correcto (fecha, diagnostico, cambios, build, QA)
2. Si se creo un documento nuevo, agregar el vinculo en AGENT_CONTEXT_INDEX.md con la seccion adecuada
3. Si se cumplio el umbral de 4000 lineas, ejecutar rotacion (canonica §4.1)
4. No dejar sesiones sin documentar o con formato incompleto
5. Build gate obligatorio (`pnpm build:gold`) antes de cerrar sesion

#### Criterios de inclusion de documentos en la wiki

Un documento pertenece a la wiki de YavlGold si:
- Es un documento operativo que refleja decisiones, cambios o estado del proyecto
- Tiene vida util para agentes futuros o para el usuario
- NO es redundante con otro documento existente (ej: yavlgold-context.md vs FICHA_TECNICA.md)

#### Criterios de exclusion de documentos

Un documento debe marcarse como legacy u archivarse si:
- Su informacion ya esta cubierta por otro documento mas actualizado
- Es un snapshot historico de un proceso ya cerrado
- Esta duplicado en otro lugar del repo

#### Qué NO es este sistema

- **No es un sistema de knowledge management empresarial**: YavlGold es un proyecto agricola digital, no una corporacion
- **No requiere automatizacion pesada**: el build gate + disciplina de sesion son suficientes
- **No requiere un "LLM Wiki schema" nuevo**: AGENTS.md ya es el schema maestro
- **No requiere Obsidian como fuente de verdad**: el repo es siempre la fuente canonica

#### Criterio de exito de Fase 1

La fase queda completa cuando:
- AGENTS.md tiene la subseccion §12.X formalizando el patron
- AGENT_CONTEXT_INDEX.md tiene metadata y operaciones
- Futuros agentes pueden llegar al repo y entender en 5 minutos como funciona el sistema de memoria documental
- El sistema esta documentado para que MiniMax/Codex/OpenCode/Claude lo mantengan

---

## §13 — Pruebas documentales con Obsidian

### Estado operativo validado
En sesiones de prueba con Obsidian, el agente **no debe asumir automáticamente** que el vault activo es OneDrive u otra ruta histórica. Antes de crear notas de prueba, debe verificar cuál vault está realmente abierto por el usuario.

#### Carpeta canónica de pruebas
Cuando el usuario esté trabajando sobre el vault documental del repo, las pruebas de escritura deben hacerse en:

`C:\Users\yerik\gold\apps\gold\docs\test\`

Reglas:
- **no escribir pruebas en la raíz del vault**
- **no escribir pruebas fuera de `docs/test/`**
- **no tocar código del producto**
- **no modificar documentos canónicos para una prueba simple**

#### Regla de visibilidad en grafo
Una nota de prueba puede no aparecer en el grafo si queda huérfana.
Por eso, toda nota de prueba **debe incluir wikilinks reales a nodos existentes** del sistema documental.

#### Validación comprobada
Quedó validado que:
- los agentes pueden escribir `.md` en el vault correcto
- las notas aparecen en `docs/test/`
- el grafo reconoce la nota cuando tiene wikilinks reales
- no debe concluirse fallo de integración sin verificar antes ruta, carpeta, enlaces y filtros del grafo

---

© 2026 YavlGold · AGENTS.md — Instrucciones Canónicas
