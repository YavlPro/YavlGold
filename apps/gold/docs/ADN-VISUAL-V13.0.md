# ADN Visual V13.0 — YavlGold

**Estado:** PROPUESTA — pendiente de ratificación
**Version:** V13.0
**Base anterior:** ADN Visual V12.0 (pasa a referencia histórica al ratificar este documento)
**Fecha de redacción:** 2026-09-26
**Autoría:** síntesis de dos auditorías independientes + auditoría de código sobre el repo real.

**Cambio de tesis V12 → V13:**
V12 consolidó una identidad. V13 la vuelve **sistema**: dos capas de tokens,
un tema de alto contraste para trabajo bajo sol, una paleta cálida coherente,
canon de visualización de datos, presupuesto de movimiento y un canon que el CI
hace cumplir solo.

> **Una frase:** de *"dark/gold con excepciones brillantes"* a *"dorado sobrio, verificable y legible bajo el sol, con una sola fuente de verdad."*

---

## §0 — Misión

V13 no busca más brillo ni más premium. Busca **verdad visual verificable**.

- El dorado guía; no grita.
- El fondo sostiene; no compite.
- La animación acompaña; no distrae.
- El componente informa; no decora por decorar.
- **El token manda; el documento solo explica.** ← nuevo en V13
- **Si la regla no se puede verificar en CI, no es una regla: es una intención.** ← nuevo en V13

---

## §1 — Diagnóstico: por qué V13 existe

V13 no nace de aburrimiento estético. Nace de ocho defectos **medidos** en el código
y en el propio documento V12. Cada uno tiene su corrección en este canon.

| # | Defecto detectado | Evidencia verificada | Se corrige en |
|---|---|---|---|
| 1 | **Paleta semántica = Tailwind literal**, en un canon que prohíbe Tailwind | `V12 §2:90-93` → `#10B981` emerald-500, `#F59E0B` amber-500, `#EF4444` red-500, `#3B82F6` blue-500; `--text-muted: #94A3B8` slate-400 | §4 |
| 2 | **El azul está prohibido como marca pero es el color del texto secundario** | `--text-muted: #94A3B8` es un gris **azulado** usado en toda la UI | §4 |
| 3 | **El token canónico más nuevo viola la regla de tokens** | `V12 §19.5:762` — `--metallic-border` contiene 5 hex crudos | §4, §12 |
| 4 | **Fuente de verdad fragmentada** | `--gold-4` está **definido 6 veces**: `agro-tokens.css:16`, `tokens.css:14`, `landing-v10.css:11`, `dashboard-v1.css:13`, `docs-agro.css:11` y en línea en `public/agro/landing.html:73`. Lo consumen **36 de las 37 hojas de producción** | §3, §12 |
| 5 | **Dos escalas tipográficas incompatibles conviviendo** | `agro-tokens.css:82` → `--text-xs: 0.70rem` / `--text-base: 0.92rem`, pero `tokens.css:106` → `0.75rem` / `1rem`. El mismo token vale distinto según qué hoja gane la cascada | §5 |
| 6 | **Ya existe un modo claro, sin documentar y con contraste roto** | `landing-v10.css:85` y `dashboard-v1.css:90` definen `[data-theme="light"]` con `--gold-4: #B8972E` → **2.59:1 sobre `#f8f6f0`**. Ilegible. Hay hasta un `.theme-toggle` funcional (`landing-v10.css:151`) | §6 |
| 7 | **Animación infinita declarada prohibida y autorizada a la vez** | `V12 §4` la prohíbe; `§19.1/19.2/19.5/19.7` autorizan 4 excepciones infinitas, y `borderShimmer` corre en **cada** `.block-head::after` del Dashboard | §7 |
| 8 | **Deriva documento ↔ código en el velocímetro** | `V12 §20` tabula `NEUTRAL: cobrado < inversión, sin fiados`, pero `agro-dashboard-v11.js:386-390` evalúa `cobrado >= inversion && inversion > 0` **primero** → una finca con cartera pendiente se muestra "Ganando". La condición `inversion > 0` no está en el documento | §10 |

**Deuda medida en CSS de producción** (excluyendo `archive/`): 962 hex sueltos ·
402 `!important` · 66 `transition: all` · 21 `100vh` frente a 10 `dvh` · 2 `color-scheme`.

**Higiene documental de V12**, corregida aquí: contiene `"V11 reduce"` (§3),
`"Stack V11 = stack V1"` (§13.11), `"NO es V11"` (§19), fechas de ratificación
posteriores a la canonización sin subir versión (2026-08-23, 2026-09-19 vs. 2026-06-24)
y un typo en chino: `"hover例外"` (§4:150).

---

## §2 — No negociables

1. **Stack visual**: Vanilla JS + Vite MPA + CSS Custom Properties. Prohibido: React, Vue, Svelte, Angular, Next, Nuxt, Astro, Tailwind.
2. **Identidad dark/gold**: acento dorado `#C8A752` (`--gold-400`). Sin azul/morado como marca — **tampoco en grises**.
3. **Dos capas de tokens**: los componentes consumen **solo** tokens semánticos. Nunca primitivos, nunca hex.
4. **Dos temas de primera clase**: Noche (default) y Sol. Ningún componente conoce el tema.
5. **Tipografía**: Plus Jakarta Sans + Inter. Orbitron y Rajdhani: **eliminadas**, no "deprecadas".
6. **Accesibilidad**: `prefers-reduced-motion` obligatorio, focus visible siempre, contraste mínimo verificado, target ≥44px (≥48px en Modo Sol).
7. **Todo lo anterior es verificable en CI.** Ver §17.

---

## §3 — Arquitectura de tokens: dos capas

Este es el cambio estructural de V13. Hoy los componentes consumen primitivos
(`--gold-4`, `--bg-2`), lo que hace imposible el theming sin find-and-replace y
provoca el defecto #4. V13 separa **qué color es** de **para qué sirve**.

```
tokens.json  ──build──▶  tokens.css  ──▶  componentes
 (verdad)                (generado)       (solo semánticos)
```

### Capa 1 — Primitivos (prohibidos en componentes)

```css
:root {
  /* Dorados */
  --gold-100: #E8D48B;
  --gold-200: #C9B77A;
  --gold-400: #C8A752;   /* brand primary — inmutable */
  --gold-600: #735A12;   /* gold ink: dorado legible sobre claro */
  --gold-800: #6b5a3e;
  --gold-900: #3a3228;
  --gold-950: #2a2218;

  /* Neutros cálidos (sin azul) */
  --neutral-0:   #FFFFFF;
  --neutral-50:  #F5F1E8;   /* marfil */
  --neutral-100: #EDE8DC;
  --neutral-300: #C9C4B8;
  --neutral-500: #9C978C;   /* gris cálido — reemplaza slate-400 */
  --neutral-700: #5C5445;
  --neutral-800: #1A1610;
  --neutral-850: #111113;
  --neutral-900: #0B0C0F;
  --neutral-950: #0a0a0a;
  --neutral-1000:#050505;

  /* Capa agrícola (solo datos, ver §4.3) */
  --leaf-400:  #7C8F5A;
  --leaf-700:  #4C5A33;
  --soil-400:  #7A5C3E;
  --soil-700:  #5A4227;
  --straw-400: #C9B77A;
  --straw-700: #6B5A2E;
}
```

### Capa 2 — Semánticos (lo único que tocan los componentes)

```css
:root, [data-theme="noche"] {
  color-scheme: dark;

  /* Superficies */
  --surface-base:    var(--neutral-950);
  --surface-sunken:  var(--neutral-1000);
  --surface-panel:   var(--neutral-900);
  --surface-raised:  var(--neutral-850);
  --surface-overlay: rgba(0,0,0,0.85);

  /* Contenido */
  --content-strong:  var(--neutral-0);
  --content-default: #cccccc;
  --content-subtle:  var(--neutral-500);
  --content-data:    var(--neutral-50);   /* tabular-nums */

  /* Acción */
  --accent:          var(--gold-400);
  --accent-hover:    var(--gold-100);
  --accent-on:       var(--neutral-950);  /* texto sobre relleno dorado */
  --accent-soft:     rgba(200,167,82,0.10);

  /* Bordes y foco */
  --border-subtle:   rgba(255,255,255,0.08);
  --border-accent:   rgba(200,167,82,0.25);
  --focus-ring:      var(--gold-400);
}
```

### Reglas de la capa

1. Un componente que escriba `var(--gold-400)` o un hex es un **error de CI**, no una preferencia.
2. Ningún token semántico se define dos veces. **`tokens.css` es el único archivo que declara tokens.** Todas las demás hojas los consumen.
3. Crear token nuevo = editar `tokens.json` + documentar aquí. Nunca al revés.
4. Prohibido crear alias nuevos. Los existentes (`--gg-*`, `--v10-*`, `--sombra-dorada`) entran en el calendario de retiro de §18.

---

## §4 — Paleta

### 4.1 Estados semánticos cálidos

Se retiran los hex de Tailwind. Los sustitutos están templados hacia la paleta
dorada y **verificados contra `--surface-base` (`#0a0a0a`)**:

```css
/* Tema Noche */
--status-success: #5E9E6E;   /* verde hoja      — 6.21:1  ✅ AA */
--status-warning: #D9A441;   /* ámbar dorado    — 8.80:1  ✅ AAA */
--status-danger:  #D2695A;   /* terracota       — 5.57:1  ✅ AA */
--status-info:    var(--gold-100);  /* 13.41:1 ✅ — el azul desaparece del sistema */
```

**`--status-info` deja de ser azul.** Era la última contradicción con la regla
"sin azul como marca": un color de marca no puede estar prohibido y usarse para
informar al usuario. Info = dorado claro. Si un estado necesita distinguirse de
otro, lo hace por **glifo + texto**, no por matiz (§16).

### 4.2 Nota de contraste de los colores retirados

Los de Tailwind no eran inaccesibles (emerald 7.8:1, amber 9.22:1, red 5.26:1,
blue 5.38:1). Se retiran por **coherencia de marca**, no por accesibilidad: un
sistema que se describe como "agrícola, sobrio, dorado" no puede tener la paleta
de estados de cualquier dashboard SaaS.

### 4.3 Capa agrícola — datos, nunca chrome

Sin esto, YavlGold es un fintech dark/gold al que se le quitaron los emojis.
Esta capa es lo único que hace que el sistema **se vea de finca**:

```css
--data-leaf:  var(--leaf-400);   /* cultivo activo / vegetativo — 5.59:1 */
--data-soil:  var(--soil-400);   /* inversión / tierra          — 3.23:1 ⚠ */
--data-straw: var(--straw-400);  /* cosecha / finalizado        — 9.93:1 */
```

**Reglas duras:**
- Permitido: chips de estado de cultivo, leyendas y series de gráficos, arcos del indicador financiero.
- **Prohibido**: botones, fondos de página, navegación, bordes de card, texto de prosa.
- `--data-soil` (3.23:1) **no es apto para texto**. Solo relleno de gráfico o borde (≥3:1 cumple el mínimo de componentes gráficos, no el de texto).
- Máximo 3 colores agrícolas visibles por vista.

### 4.4 Gris cálido

`--content-subtle` pasa de `#94A3B8` (slate-400, azulado) a `#9C978C`
(6.81:1 sobre base). Ratio equivalente, coherencia recuperada.

---

## §5 — Tipografía

### 5.1 Escala única y unificada

Se resuelve el defecto #5: **existía una sola escala documentada y dos
implementadas**. V13 canoniza la mayor, porque el producto se usa en exteriores
y a `0.92rem` el cuerpo queda por debajo de lo cómodo en móvil bajo sol.

```css
--text-xs:   0.75rem;   /* 12px — solo metadata no esencial */
--text-sm:   0.875rem;  /* 14px */
--text-base: 1rem;      /* 16px — cuerpo */
--text-md:   1.0625rem; /* 17px */
--text-lg:   1.1875rem; /* 19px */
--text-xl:   1.375rem;  /* 22px */
--text-2xl:  1.75rem;   /* 28px */
--text-3xl:  2.25rem;   /* 36px */
```

**Migración obligatoria y atómica:** la escala vive **solo** en `tokens.css`.
Las definiciones duplicadas de `agro-tokens.css:82-89`, `landing-v10.css:80`
y `dashboard-v1.css:60-67` se eliminan en el mismo commit. No se migra "por módulo":
dos escalas simultáneas es peor que cualquiera de las dos.

### 5.2 Familias — **sin cambios**

**Plus Jakarta Sans** (500/600/700) — títulos, eyebrows, labels, chips.
**Inter** (400/500/600) — cuerpo, UI, datos numéricos.
**Playfair Display** — citas editoriales.

> **Decisión explícita y razonada:** se evaluó reducir a una sola familia variable.
> **Se rechaza.** La migración tipográfica a Plus Jakarta + Inter se completó el
> 2026-06-28 y aún arrastra deuda documentada (`DEUDA_TIPOGRAFIA_JS.md`: 59 refs
> en 11 archivos JS). Abrir una segunda migración tipográfica antes de cerrar la
> primera es cambiar de opinión, no evolucionar. V13 **cierra** la migración de
> V12; V14 podrá discutir la familia única.

### 5.3 Self-hosting obligatorio

Lo que sí cambia, y es la mejora de rendimiento real:

- Las tres familias se **auto-alojan** (subset latino, `woff2`, `font-display: swap`).
- Se elimina la dependencia de `fonts.googleapis.com`.
- **Razón de producto**: la landing promete *"manos grandes, guantes, sol directo y conexión intermitente"* (`index.html:560`). Un producto que promete conexión intermitente no puede depender de tres CDN externos para renderizar texto.

### 5.4 Reglas

- Títulos de módulo: `--text-xl` / `--text-2xl`. Nunca `--text-3xl` en Agro.
- Body: `--text-base`. Labels/chips: `--text-sm`.
- Uppercase + `letter-spacing` ≥0.12em: **solo** en eyebrows de ≤4 palabras. Prohibido en frases.
- Todo dato numérico: `font-variant-numeric: tabular-nums`.

---

## §6 — Modo Sol (tema de alto contraste para campo)

El diferenciador visual honesto del producto. **No es un "light mode" cosmético**:
es el modo en que la app se usa al mediodía, en una finca, con el brillo al máximo.

### 6.1 El problema real

Ya existe un `[data-theme="light"]` en `landing-v10.css:85` y `dashboard-v1.css:90`
que **nadie documentó y que está roto**: su dorado `#B8972E` sobre `#f8f6f0` da
**2.59:1**, muy por debajo del 4.5:1 exigible. V13 no inventa el modo claro:
lo rescata, lo arregla y lo canoniza.

### 6.2 Tokens del tema

```css
[data-theme="sol"] {
  color-scheme: light;

  --surface-base:    #F5F1E8;   /* marfil, no blanco puro: menos deslumbre */
  --surface-sunken:  #EDE8DC;
  --surface-panel:   #FFFFFF;
  --surface-raised:  #FFFFFF;
  --surface-overlay: rgba(26,22,16,0.55);

  --content-strong:  #1A1610;   /* 15.98:1 ✅ AAA */
  --content-default: #3A342A;
  --content-subtle:  #5C5445;   /*  6.63:1 ✅ AA  */
  --content-data:    #1A1610;

  --accent:          var(--gold-600);  /* #735A12 — 5.82:1 ✅ AA */
  --accent-hover:    #5E4A0E;          /*          7.57:1 ✅ AAA */
  --accent-on:       #FFFFFF;          /* blanco sobre #735A12 = 6.56:1 ✅ */
  --accent-soft:     rgba(115,90,18,0.10);

  --border-subtle:   rgba(26,22,16,0.14);
  --border-accent:   rgba(115,90,18,0.35);
  --focus-ring:      var(--gold-600);

  /* Estados recalculados para fondo claro */
  --status-success:  #1F6F4A;   /* 5.43:1 ✅ */
  --status-warning:  #8A5A12;   /* 5.25:1 ✅ */
  --status-danger:   #9A3324;   /* 6.48:1 ✅ */
  --status-info:     var(--gold-600);

  /* Capa agrícola oscurecida */
  --data-leaf:  var(--leaf-700);   /* 6.61:1 */
  --data-soil:  var(--soil-700);   /* 8.30:1 */
  --data-straw: var(--straw-700);  /* 5.96:1 */
}
```

> **Nota técnica clave:** el dorado **baja de luminosidad** en Modo Sol. Es la única
> forma de que siga siendo dorado y siga siendo legible. `#C8A752` sobre marfil da
> 2.48:1 — inservible. `#735A12` da 5.82:1 y mantiene el matiz.

### 6.3 Comportamiento

- **Toggle sol/luna** en topbar, siempre accesible, `aria-pressed`, target 48px.
- Persistencia en `localStorage` bajo `yavl.theme`, valores `noche | sol | auto`.
- `auto` sigue a `prefers-color-scheme`, y `prefers-contrast: more` fuerza Sol.
- **Sin sombras decorativas** en Modo Sol: solo bordes. Las sombras sobre claro ensucian.
- Targets mínimos ≥48px; acciones primarias 52px.
- `metallicShift` y `borderShimmer` quedan **desactivados** en Modo Sol: un shimmer dorado sobre marfil no se ve, solo emborrona.

### 6.4 La regla que lo hace sostenible

> **Ningún componente puede contener una regla específica de tema.**
> Si un componente necesita un `[data-theme="sol"] .mi-clase { }`, el token semántico
> está mal diseñado. Se arregla el token, no el componente.

---

## §7 — Movimiento: presupuesto en vez de lista de excepciones

`V12 §19` creció de 3 a 5 excepciones en tres meses. Una lista que crece no es un
canon, es un historial de concesiones. V13 la sustituye por una regla contable.

### 7.1 Tokens de motion

```css
--dur-instant: 0ms;
--dur-1: 150ms;   /* estado: hover, focus, active, color */
--dur-2: 240ms;   /* layout: abrir, cerrar, expandir, reordenar */
--dur-3: 600ms;   /* datos: una vez, al entrar el valor */

--ease-out:      cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);  /* exclusivo: aguja financiera */
```

### 7.2 Las tres categorías (resuelve la contradicción de V12)

V12 prohibía `animation-duration > 220ms` en §13.14 y a la vez canonizaba una aguja
de 750ms en §20. No era una violación: eran **categorías distintas sin nombrar**.

| Categoría | Duración | Repetición | Ejemplos |
|---|---|---|---|
| **Estado** | 120–180ms (`--dur-1`) | por interacción | hover, focus, active, check |
| **Layout** | 200–280ms (`--dur-2`) | por interacción | sheet, modal, acordeón, tab |
| **Datos** | 400–750ms (`--dur-3`) | **una sola vez** por carga | aguja financiera, barra de cobertura, conteo |
| **Continua** | — | infinita | **solo** loader/spinner y sincronización activa |

### 7.3 Presupuesto de animación infinita

> **Máximo UNA animación infinita decorativa visible por viewport.**
> Si hay ticker, no hay `borderShimmer`. Si hay `borderShimmer` en el header, no hay `ghostFloat`.
> Los loaders y los indicadores de sincronización **no cuentan**: comunican trabajo real.

**Aplicación inmediata:** `borderShimmer` se conserva **solo** en el header de módulo
(1 por vista). **Sale de `.ygd-block-head::after`** del Dashboard Agro
(`agro-dashboard-v11.css:56`): seis separadores brillando en bucle es exactamente lo
que §0 dice no querer ser.

### 7.4 Excepciones de identidad que sobreviven

| Excepción | Estado V13 | Ámbito |
|---|---|---|
| `metallicShift` | ✅ conservada | logo y hero de landing. ≥30s. Nunca en producto autenticado. |
| `borderShimmer` | ⚠️ restringida | 1 header de módulo por vista. Fuera del Dashboard. |
| `ghostFloat` | ⚠️ reemplazada | muere con los ghost emojis (§8). Aplica a las ilustraciones SVG, ±3px, 8–10s, una por vista. |
| `btnShimmer` | ❌ eliminada | ver 7.5 |
| Ticker marquee | ❌ eliminado | ver §11 |

### 7.5 `btnShimmer` — eliminada

Es un efecto exclusivo de hover, y **el hover no existe en el dispositivo donde
YavlGold más se usa**. Paga complejidad y un `background-size` animado a cambio de
cero identidad en móvil. Sustituto canónico:

```css
.btn-primary {
  background: var(--accent);
  color: var(--accent-on);
  transition: background var(--dur-1) var(--ease-out),
              transform var(--dur-1) var(--ease-out);
}
.btn-primary:hover  { background: var(--accent-hover); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }

@media (prefers-reduced-motion: reduce) {
  .btn-primary { transition: background var(--dur-1) linear; }
  .btn-primary:hover, .btn-primary:active { transform: none; }
}
```

### 7.6 Prohibiciones de rendimiento

- **`transition: all` prohibido.** V12 lo recomendaba como default en §4 (`all 150ms ease`); hay 66 en producción. Se declara transición por propiedad, siempre.
- Solo se animan `opacity` y `transform`. Nunca `width`, `height`, `top`, `left`, `margin`.
- `prefers-reduced-motion: reduce` → categorías Estado y Layout pasan a `--dur-instant`; categoría Datos se aplica sin transición; continuas, `animation: none`.

---

## §8 — Iconografía e ilustración

### 8.1 Los ghost emojis se retiran

Un emoji se renderiza distinto en iOS, Android, Windows y Linux: la "identidad
visual" del producto cambia según el teléfono del usuario. No es un sistema de
diseño, es una lotería tipográfica.

**Sustituto:** set propio de **8–10 ilustraciones SVG monocromas** (line-art:
cultivo, finca, factura, cliente, cosecha, lluvia, balanza, bitácora), trazo
1.5px, color `--gold-950`/`--gold-900` en Noche y `--neutral-100` en Sol.

- Opacidad: 0.03–0.06.
- `pointer-events: none`, `user-select: none`, `aria-hidden="true"`.
- Una por vista. Nunca detrás de contenido interactivo.
- Es la mejora visual más visible y más barata de todo V13.

**Los emojis sí se conservan** como glifos semánticos dentro de contenido (nombres
de cultivo, entradas de bitácora escritas por el usuario). Lo que se retira es el
emoji como **chrome decorativo**.

### 8.2 Font Awesome sale del CDN

```html
<!-- PROHIBIDO en V13 -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
```

Presente hoy en `agro/index.html:141` y al menos 3 páginas más, y con **versiones
distintas** entre páginas (6.5.1 y 6.4.0 en `dashboard/configuracion.html:18`) —
el mismo icono puede verse diferente según la vista.

**Sustituto:** sprite SVG local (`assets/icons/sprite.svg`) con los iconos
realmente usados, vía `<use href="#icon-x">`. Elimina una petición externa
bloqueante, un webfont completo para unas decenas de glifos, y la deriva de versiones.
Coherente con "conexión intermitente".

### 8.3 Escala

```css
--icon-xs: 0.75rem;  --icon-sm: 0.875rem; --icon-base: 1rem;
--icon-md: 1.25rem;  --icon-lg: 1.5rem;   --icon-xl: 2rem;
```

Decorativos: `aria-hidden="true"`. Portadores de significado: `<title>` o `aria-label`.

---

## §9 — Canon de visualización de datos *(nuevo en V13)*

V12 documenta seis componentes y **cero reglas de gráficos**, teniendo
"Estadísticas de períodos", "Comparar cultivos", "Comparar fincas" y "Rankings".
Sin canon, cada módulo inventará su paleta — que es justo lo que §13.2 prohíbe.

### 9.1 Series

- **Serie primaria**: `--accent`. **Serie comparativa**: `--content-subtle`. Nunca dos dorados compitiendo.
- **Categóricas (máx. 5, en este orden)**: `--accent` → `--data-leaf` → `--data-soil` → `--data-straw` → `--content-subtle`.
- **Secuencial** (intensidad): `--gold-950` → `--gold-800` → `--gold-400` → `--gold-100`.
- **Divergente** (pérdida ↔ ganancia): `--status-danger` → `--content-subtle` → `--status-success`.

### 9.2 Chrome del gráfico

- Ejes y grid: `--border-subtle`. Sin fondo de plot. Sin bordes de contenedor.
- Etiquetas de eje: `--text-xs`, `--content-subtle`.
- Cifras: `tabular-nums` siempre, formato `es-CO` / `es-VE` según la finca.
- Tooltip: mismo estilo que `.card-canon`, `--surface-raised`, sin sombra dorada.
- Entrada de datos: `--dur-3`, una sola vez. Nunca al hacer hover, nunca al re-render.

### 9.3 Reglas duras

- Un gráfico sin eje etiquetado o sin unidad es un error, no un estilo.
- Prohibidas las áreas apiladas con más de 4 series.
- Prohibidos los donuts para más de 3 categorías.
- Prohibido el eje Y truncado en gráficos financieros: exagera diferencias y este producto existe para mostrar la realidad, no para dramatizarla.
- Estado vacío: ilustración SVG (§8.1) + texto explícito. Nunca un gráfico de ceros.

---

## §10 — Indicador de Salud Financiera *(reemplaza el velocímetro de V12 §20)*

### 10.1 Por qué cambia

El velocímetro de tres posiciones ocupa un bloque entero para comunicar una de tres
palabras, y su lógica **oculta información**:

```js
// agro-dashboard-v11.js:386-390 — implementación actual
function computeBalanceEstado(cobrado, inversion, fiados) {
    if (cobrado >= inversion && inversion > 0) return 'success';
    if (fiados > 0) return 'warning';
    return 'muted';
}
```

Tres problemas reales:
1. Una finca con `cobrado >= inversion` **y** `fiados = $430.000` muestra **"Ganando"**: la cartera pendiente desaparece de la vista.
2. `inversion > 0` es una condición que **no está en la tabla de V12 §20** — deriva documento/código.
3. "NEUTRAL" no informa: mezcla "sin datos" con "invirtiendo".

### 10.2 Componente: Riel de Cobertura Financiera

Tres lecturas **independientes**, nunca colapsadas en una palabra:

```text
SALUD FINANCIERA · Finca La Esperanza

Resultado cobrado           +$1.240.000
Capital recuperado                  82%
Pendiente por cobrar          $430.000

[████████████████░░░░░] 82%
                  ▲ punto de equilibrio
```

| Lectura | Definición | Token |
|---|---|---|
| Resultado realizado | `cobrado − inversión` | `--status-success` / `--status-danger` |
| Cobertura | `cobrado / inversión` (0–100%+) | `--accent` |
| Cartera pendiente | `fiados` — **siempre visible, nunca fusionada** | `--status-warning` |

**Estados textuales** (sustituyen a NEUTRAL/RECUPERANDO/GANANDO):

| Estado | Condición | Texto al usuario |
|---|---|---|
| Sin datos | `inversion == 0 && cobrado == 0` | "Sin movimientos registrados en este período." |
| En inversión | `cobrado < inversion * 0.5` | "En inversión: has recuperado el 31% del capital." |
| Recuperando | `0.5 ≤ cobrado/inversion < 1` | "Recuperando: 82% del capital recuperado." |
| Equilibrio | `cobrado ≈ inversion` (±2%) | "Punto de equilibrio alcanzado." |
| Resultado positivo | `cobrado > inversion` | "Resultado positivo: +$1.240.000 cobrados." |

Y **con independencia del estado**, si `fiados > 0`:
> "Además tienes $430.000 por cobrar."

### 10.3 Reglas

- Barra horizontal, altura 8px, `--radius-pill`, marca de equilibrio al 100%.
- Animación de llenado: `--dur-3`, **una vez** por carga.
- El SVG del velocímetro **puede conservarse** como visualización secundaria por identidad, nunca como fuente principal de verdad.
- Máximo uno por vista. Exclusivo del Dashboard Agro.
- `prefers-reduced-motion`: valor final sin transición.

---

## §11 — Referencias económicas *(reemplaza el ticker de V12 §19.7)*

### 11.1 Qué se retira

El marquee infinito de 50s, la copia duplicada del DOM, y **BTC/ETH/SOL/USDT como
contenido por defecto** (`V12 §19.7.5`). Un producto agrícola que declara no
administrar inversiones no debería abrir con una cinta de criptomonedas: asocia la
marca con trading y compite en atención con el trabajo real del usuario.

### 11.2 Sustituto

Franja estática, desplazable manualmente, con divisas primero:

```text
REFERENCIAS ECONÓMICAS

USD/COP   4.125,20  ▲      USD/VES   38,42  •
Actualizado hace 12 min · Fuente: BCV / TRM
```

- Sin movimiento automático. Sin porcentajes inventados.
- **Se conserva íntegra la mejor regla de V12** (§19.7.4): la dirección vive en el glifo **y** en el color — ▲ `--status-success`, ▼ `--status-danger`, • `--accent`. **Nunca flecha falsa**: sin delta confirmado entre polls, punto dorado.
- Marfil (`--content-data`) y `tabular-nums` para las cifras.
- **Antigüedad del dato siempre visible.** Un número sin hora no es información.
- Cripto: **opt-in** del usuario, nunca por defecto.

---

## §12 — Componentes

Se conservan de V12 sin cambio estructural: `.btn-gold` (renombrado `.btn-primary`,
§7.5), `.btn-outline-gold`, `.card-canon`, `.input-canon`, el canon de modales (§13)
y el header de bienvenida dorado.

### 12.1 Nuevos componentes canónicos

| Componente | Por qué |
|---|---|
| **Entity Row** | Patrón único para cultivos, clientes, movimientos, tareas y fincas. Hoy cada módulo inventa su card. Altura mín. 56px, título + meta + valor a la derecha + acción. |
| **Data Table** | El facturero la necesita: filas 44px, cifras a la derecha con `tabular-nums`, cabecera sticky, **sin zebra**, hover `--border-accent`. |
| **KPI Card** | Eyebrow + cifra grande tabular + delta con glifo ▲▼•, reutilizando la semántica direccional de §11. |
| **Adaptive Sheet** | Ver §13. Un patrón para crear movimiento, añadir tarea, filtrar. |
| **Save State** | Ver §14. Crítico dado el almacenamiento local. |
| **Attention Row** | Fila compacta para lo que requiere revisión. Sin card, sin glow, sin animación. |
| **Status Chip** | Estados de cultivo del Manifiesto §4.3 mapeados a la capa `--data-*`. |
| **Toast / Skeleton / Empty State** | Ya existen de facto en el código sin especificación. |

### 12.2 Tres niveles de contenedor (fin de "una card para todo")

1. **Superficie de página** — sin fondo propio.
2. **Sección funcional** — título + contenido, separador `--border-subtle`, **sin caja**.
3. **Fila operativa** — Entity Row.

La **card** se reserva a entidades que son objetos independientes y accionables
(una finca, un cultivo, un cliente en su grid). No es un contenedor genérico:
rankings, movimientos, tareas y referencias económicas usan secciones y filas.

### 12.3 `--metallic-border` corregido

```css
/* V12 §19.5 — 5 hex crudos dentro del token más nuevo del canon */
--metallic-border: linear-gradient(90deg, transparent, #6b5a3e, #C8A752, #E8D48B, #C8A752, #6b5a3e, transparent);

/* V13 */
--metallic-border: linear-gradient(90deg,
  transparent, var(--gold-800), var(--gold-400),
  var(--gold-100), var(--gold-400), var(--gold-800), transparent);
```

---

## §13 — Modales y hojas adaptativas

El modal centrado se mantiene en desktop. En móvil se sustituye: el pulgar no llega
al centro de la pantalla, y la X arriba a la derecha es el punto más difícil de
alcanzar de todo el dispositivo.

| Contexto | Patrón |
|---|---|
| Desktop >900px | Dialog centrado, máx. 480px |
| Tablet ≤900px | Dialog ancho, máx. 600px |
| Mobile ≤768px | **Bottom sheet**, acciones abajo, arrastre para cerrar |
| Formulario largo (móvil) | **Fullscreen**, topbar con Volver + Guardar |
| Confirmación breve | Dialog compacto en cualquier tamaño |

```css
--z-base: 1; --z-dropdown: 100; --z-sticky: 200;
--z-overlay: 900; --z-modal: 1000; --z-toast: 9999;
```

**Reglas:**
- `z-index: var(--z-modal)` — **sin fallback**. `var(--z-modal, 1000)` está prohibido: si el token puede faltar, la capa de tokens no se está cargando, y un fallback silencioso oculta ese bug.
- Altura: `100dvh`, nunca `100vh` (hay 21 usos de `100vh` en producción; en móvil la barra del navegador los corta).
- Cierre: Escape, botón, y tap fuera. El foco vuelve al disparador.
- Focus trap obligatorio. `aria-modal="true"` + `role="dialog"` + `aria-labelledby`.
- Prohibido: halos dorados, gradientes metálicos, animaciones de entrada dramáticas.

---

## §14 — Estado de guardado *(nuevo en V13)*

`LOCAL_FIRST.md` documenta que parte de AgroRepo vive en almacenamiento local y que
esos datos **se pueden perder** al limpiar el navegador o cambiar de dispositivo.
Hoy la interfaz no distingue entre "guardado en la nube" y "guardado en este teléfono".
Para un producto cuyo valor es la memoria agrícola del usuario, eso no es un detalle
visual: es el riesgo más alto del producto.

```text
● Sincronizado              --status-success
● Guardando…                --accent        (pulso, cuenta como loader)
● Solo en este dispositivo  --status-warning
● Sin conexión              --content-subtle
● Error al guardar          --status-danger
```

**Reglas:**
- La palabra **"Guardado" a secas queda prohibida** si el dato solo está en el dispositivo.
- Estado visible en toda superficie que escriba datos.
- Cambios anunciados por `aria-live="polite"`; los errores, `assertive`.
- "Solo en este dispositivo" ofrece siempre la acción "Exportar".

---

## §15 — Lenguaje de estados

El principio, tomado de la propia comunicación del producto: **hecho antes que
recomendación**.

| Prohibido | Sustituto |
|---|---|
| NEUTRAL | "Sin movimientos registrados en este período." |
| Normal | El dato concreto. |
| Activo (sin explicar) | "Último registro hace 12 días." |
| Recomendado (sin por qué) | "Recomendado porque X." o nada. |
| Decisión operativa | "Datos registrados del período." |

Regla: si una etiqueta no puede acompañarse de la cifra que la justifica, la etiqueta
sobra.

---

## §16 — Accesibilidad

- **Contraste**: texto normal ≥4.5:1, texto grande ≥3:1, componentes gráficos ≥3:1. **Cada token de color de este documento lleva su ratio calculado.** Un token nuevo sin ratio documentado no entra.
- **Focus** — pasa de `box-shadow` a `outline`, más resistente a temas, `overflow` y recortes:

```css
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
  border-radius: inherit;
}
```

- El foco **nunca** puede quedar oculto tras barras sticky (`scroll-margin-block`).
- **Targets**: ≥44px general, ≥48px en Modo Sol, 52px en acción primaria. WCAG 2.2 exige 24×24px como mínimo AA; este producto se usa con guantes y se mantiene deliberadamente muy por encima.
- Nunca comunicar solo con color: siempre color **+** glifo **+** texto.
- Errores de formulario asociados por `aria-describedby`.
- `@media (forced-colors: active)`: soporte obligatorio; bordes en `ButtonBorder`, texto en `CanvasText`.
- `color-scheme` declarado en ambos temas (hoy solo hay 2 usos en todo el CSS): sin él, los controles nativos y las barras de scroll se renderizan en claro sobre fondo negro.
- `tabindex` nunca > 0. Navegación completa por teclado. Skip link a contenido principal.

---

## §17 — Gobernanza: que el canon se haga cumplir solo

Sin esto, V13 se degrada exactamente igual que V12: ratificando excepciones cada dos
meses sin subir de versión.

### 17.1 La fuente de verdad deja de ser este documento

```
tokens.json  →  build (Vite)  →  tokens.css
```

`tokens.json` en formato W3C Design Tokens. **Este documento explica; el JSON manda.**
Ningún token existe si no está en el JSON.

```json
{
  "color": {
    "gold": {
      "400": { "$value": "#C8A752", "$type": "color",
               "$description": "Brand primary. Inmutable.",
               "$extensions": { "yavl.contrast": { "on-surface-base": 8.58 } } },
      "600": { "$value": "#735A12", "$type": "color",
               "$description": "Gold ink: dorado legible sobre superficies claras.",
               "$extensions": { "yavl.contrast": { "on-sol-base": 5.82 } } }
    }
  }
}
```

### 17.2 Reglas de CI (bloquean el merge)

| Regla | Herramienta | Qué bloquea |
|---|---|---|
| `color-no-hex` fuera de `tokens.css` | Stylelint | los 962 hex sueltos actuales |
| `font-family` con `Orbitron\|Rajdhani` | Stylelint | reintroducción de fuentes muertas |
| `transition: all` | Stylelint | los 66 casos actuales |
| `animation: ... infinite` fuera de allowlist | Stylelint custom | crecimiento de excepciones |
| `100vh` en contenedores full-height | Stylelint | corte por barra del navegador móvil |
| `var(--token, fallback)` | Stylelint custom | fallbacks que ocultan tokens no cargados |
| Token definido en 2+ archivos | script `check-tokens.mjs` | el defecto #4 (`--gold-4` ×5) |
| Contraste de cada par token/superficie | script `check-contrast.mjs` | regresiones de accesibilidad |
| Referencia a "V11"/"V12" en canon activo | script `check-canon.mjs` | deriva documental |

```json
{
  "rules": {
    "color-no-hex": true,
    "declaration-property-value-disallowed-list": {
      "font-family": ["/Orbitron/", "/Rajdhani/"],
      "transition": ["/\\ball\\b/"]
    }
  },
  "overrides": [
    { "files": ["**/tokens.css"], "rules": { "color-no-hex": null } }
  ]
}
```

### 17.3 Versionado semántico del canon

| Cambio | Versión |
|---|---|
| Nuevo token, nueva excepción, nuevo componente | **minor** (V13.1) con fecha |
| Cambio de valor de token existente | **minor** |
| Cambio de familia tipográfica, de paleta base o de arquitectura de tokens | **major** (V14.0) |

**Prohibido** ratificar cambios dentro de un documento sin subir versión. Fue lo que
convirtió V12.0 en un documento con tres fechas distintas dentro.

### 17.4 Ficha obligatoria de deprecación

Ningún elemento se marca "deprecado" sin las cinco líneas:

```text
Elemento:
Sustituto:
Fecha de deprecación:
Versión de eliminación:
Archivos pendientes:
```

### 17.5 Estructura documental

```text
ADN-VISUAL-V13.0.md      Principios y decisiones (este archivo)
tokens.json              Fuente de verdad de tokens
components-v13.md        Anatomía, estados y ejemplos de cada componente
patterns-v13.md          Dashboard, navegación, formularios, vacíos y errores
migration-v12-v13.md     Calendario de retiro y compatibilidad
```

---

## §18 — Retiros y calendario

| Elemento | Sustituto | Elimina en |
|---|---|---|
| Orbitron / Rajdhani (59 refs JS + `module-unavailable.css` + `academia/index.html:17`) | Plus Jakarta Sans | V13.0 |
| Alias `--gg-*`, `--v10-*`, `--sombra-dorada` (78 refs) | Capa semántica §3 | V13.1 |
| `--shadow-gold-md/lg/xl`, `--shadow-metallic` | `--shadow-dark` | V13.0 |
| `btnShimmer` | Hover canónico §7.5 | V13.0 |
| `borderShimmer` en `.ygd-block-head::after` | Separador estático `--border-accent` | V13.0 |
| Ticker marquee cripto | Referencias económicas §11 | V13.0 |
| Ghost emojis | Ilustraciones SVG §8.1 | V13.1 |
| Font Awesome CDN (2 versiones distintas) | Sprite SVG local | V13.1 |
| Google Fonts CDN | Fuentes self-hosted | V13.0 |
| `--color-info` azul `#3B82F6` | `--status-info` dorado | V13.0 |
| `--text-muted` slate `#94A3B8` | `--content-subtle` `#9C978C` | V13.0 |
| `transition: all` (66) | Transición por propiedad | V13.1 |
| `100vh` (21) | `100dvh` | V13.1 |
| Escalas tipográficas duplicadas | Escala única `tokens.css` | V13.0, atómico |
| Referencias a V11, typo `hover例外`, fechas sueltas | Este documento | V13.0 |

---

## §19 — Plan de migración

**Fase 1 — Cimientos (sin cambio visible).** `tokens.json` + build. `tokens.css`
como único declarante. Mapear tokens semánticos a los primitivos actuales. Eliminar
definiciones duplicadas. *Resultado esperado: cero diferencia en pantalla, una sola
fuente de verdad.*

**Fase 2 — Higiene.** Migrar componentes a tokens semánticos módulo por módulo.
Activar Stylelint en modo warning. Escala tipográfica unificada (atómica). Retirar
Orbitron/Rajdhani. Self-hosting de fuentes.

**Fase 3 — Modo Sol.** Bloque `[data-theme="sol"]`, toggle, persistencia. Debe
funcionar **sin tocar ningún componente**; si hace falta tocar alguno, su token está
mal y se corrige en la Fase 1–2.

**Fase 4 — Movimiento y datos.** Presupuesto de animación. Retirar shimmer del
Dashboard. Riel de Cobertura. Referencias económicas. Canon de gráficos.

**Fase 5 — Componentes nuevos.** Entity Row, Data Table, Adaptive Sheet, Save State,
Status Chip. Stylelint pasa a modo error y bloquea merges.

**Fase 6 — Ilustración.** Set SVG propio, sprite de iconos, retiro de ghost emojis
y de Font Awesome CDN.

**Regla de oro:** ninguna fase empieza sin que la anterior esté cerrada. La
fragmentación de tokens de V12 nació exactamente de migrar "gradualmente por módulo"
sin cerrar nunca.

---

## §20 — Lo que NO cambia

V13 es un salto de sistema, no un cambio de cara. Se conserva deliberadamente:

- Identidad **dark/gold** como default. Es lo que hace reconocible a YavlGold.
- `#C8A752` como dorado de marca. Inmutable.
- Stack Vanilla JS + Vite MPA + Custom Properties. Todo lo anterior se implementa sin un solo framework.
- Plus Jakarta Sans + Inter + Playfair (§5.2).
- **Separación semántica de superficies** (V12 §10). Está bien escrita; el problema nunca fue esa regla, fue que el resto del documento no la cumplía.
- Escala de spacing, radii y z-index.
- Sobriedad de modales: sin halos, sin gradientes metálicos.
- Separación entre factureros (Clientes / Finca / Cultivo / Personal).
- `metallicShift` en logo y hero de landing.
- La regla de dirección del ticker: **nunca flecha falsa**.
- El header de bienvenida dorado.
- Propiedad y exportabilidad de los datos del usuario.
- El tono del producto: **mostrar la realidad registrada, no prometer magia**.

---

## §21 — Anti-patrones prohibidos

1. Hardcodear hex en componentes. Color → `tokens.json` → semántico → componente.
2. Consumir tokens primitivos desde un componente.
3. Definir un token en más de un archivo.
4. Crear paletas por módulo.
5. Usar azul o morado como marca — **incluidos los grises azulados**.
6. `transition: all`.
7. `var(--token, fallback)` en tokens obligatorios.
8. Animar propiedades que provocan layout (`width`, `height`, `top`, `left`).
9. Más de una animación infinita decorativa por viewport.
10. Reglas `[data-theme="..."]` dentro de un componente.
11. Glow para "hacer premium".
12. Tailwind, React, SPA.
13. `animation-duration` fuera de las categorías de §7.2.
14. Mezclar historial + dashboard + KPIs + formulario en una superficie.
15. Reabrir `agro.js` para styling.
16. Emoji como chrome decorativo.
17. Etiqueta de estado sin la cifra que la sustenta.
18. Decir "Guardado" cuando el dato solo está en el dispositivo.
19. Token de color nuevo sin ratio de contraste documentado.
20. Ratificar un cambio sin subir la versión del canon.

---

## §22 — Las cinco prioridades

Si V13 solo pudiera hacer cinco cosas:

1. **Una sola fuente de verdad de tokens** (`tokens.json` → `tokens.css`), en dos capas. Sin esto, nada de lo demás es sostenible.
2. **Modo Sol** con contraste verificado — arreglando el `[data-theme="light"]` roto que ya existe.
3. **Paleta cálida coherente**: fuera Tailwind, fuera el azul, dentro la capa agrícola en datos.
4. **Presupuesto de movimiento**: una animación infinita por viewport, fuera el shimmer del Dashboard, fuera el marquee cripto.
5. **CI que rechaza el hex antes que el revisor.**

Lo que notaría el usuario el primer día: la app se lee bajo el sol, el dashboard no
parpadea en seis sitios, sabe si sus datos están en la nube o solo en su teléfono, y
las cifras dicen cuánto falta por cobrar en vez de la palabra "NEUTRAL".

Lo que notaría el equipo: cambiar la paleta toca **un archivo**.

---

## §23 — Nota histórica

V10 fue la base fundacional metálica. V11 redujo el exceso de brillo. V12 migró la
tipografía, consolidó la sobriedad y canonizó los primeros componentes propios
(velocímetro, header dorado) — pero lo hizo acumulando excepciones dentro de un
documento que nunca subió de versión, y dejando la implementación de tokens repartida
en cinco archivos.

V13 no contradice a V12: **termina lo que V12 empezó** y le pone los frenos que le
faltaban. La diferencia es que V13 es la primera versión del ADN Visual que un
script puede verificar.

---

## Apéndice A — Ratios de contraste verificados

Calculados sobre `--surface-base` de cada tema (WCAG 2.x, sRGB).

**Tema Noche** (fondo `#0a0a0a`)

| Token | Hex | Ratio | Uso |
|---|---|---|---|
| `--accent` | `#C8A752` | 8.58:1 | ✅ texto y relleno |
| `--accent-hover` | `#E8D48B` | 13.41:1 | ✅ AAA |
| `--content-strong` | `#FFFFFF` | 19.80:1 | ✅ AAA |
| `--content-default` | `#cccccc` | 12.33:1 | ✅ AAA |
| `--content-subtle` | `#9C978C` | 6.81:1 | ✅ AA |
| `--content-data` | `#F5F1E8` | 17.56:1 | ✅ AAA |
| `--status-success` | `#5E9E6E` | 6.21:1 | ✅ AA |
| `--status-warning` | `#D9A441` | 8.80:1 | ✅ AAA |
| `--status-danger` | `#D2695A` | 5.57:1 | ✅ AA |
| `--status-info` | `#E8D48B` | 13.41:1 | ✅ AAA |
| `--data-leaf` | `#7C8F5A` | 5.59:1 | ✅ AA |
| `--data-straw` | `#C9B77A` | 9.93:1 | ✅ AAA |
| `--data-soil` | `#7A5C3E` | 3.23:1 | ⚠️ solo gráfico |
| `--gold-800` | `#6b5a3e` | 2.98:1 | ⛔ nunca texto |

**Tema Sol** (fondo `#F5F1E8`)

| Token | Hex | Ratio | Uso |
|---|---|---|---|
| `--content-strong` | `#1A1610` | 15.98:1 | ✅ AAA |
| `--content-subtle` | `#5C5445` | 6.63:1 | ✅ AA |
| `--accent` | `#735A12` | 5.82:1 | ✅ AA |
| `--accent-hover` | `#5E4A0E` | 7.57:1 | ✅ AAA |
| `--accent-on` sobre accent | `#FFFFFF` | 6.56:1 | ✅ AA |
| `--status-success` | `#1F6F4A` | 5.43:1 | ✅ AA |
| `--status-warning` | `#8A5A12` | 5.25:1 | ✅ AA |
| `--status-danger` | `#9A3324` | 6.48:1 | ✅ AA |
| `--data-leaf` | `#4C5A33` | 6.61:1 | ✅ AA |
| `--data-soil` | `#5A4227` | 8.30:1 | ✅ AAA |
| `--data-straw` | `#6B5A2E` | 5.96:1 | ✅ AA |
| *(retirado)* `#B8972E` | `#B8972E` | **2.48:1** | ⛔ el dorado del light mode actual |

---

## Apéndice B — Origen de las decisiones

Trazabilidad para revisión. Este canon sintetiza dos auditorías independientes y una
auditoría de código.

**De la auditoría A (enfoque producto/UX):** Modo Campo como modo operacional y no
como tema claro · jerarquía por atención en el Dashboard · categorías de movimiento
que resuelven la contradicción 220ms vs. 750ms · Save State (§14) · lenguaje de
estados (§15) · accesibilidad WCAG 2.2 con `outline` sobre `box-shadow` (§16) ·
tres niveles de contenedor frente a "una card para todo" (§12.2) · modal adaptativo
(§13) · prudencia tipográfica: no reabrir la migración de V12 (§5.2) · estructura
documental en cinco piezas (§17.5) · ficha de deprecación (§17.4).

**De la auditoría B (enfoque sistema/canon):** diagnóstico de las contradicciones
internas de V12, incluida la paleta Tailwind y el typo `hover例外` (§1) · arquitectura
de dos capas de tokens (§3) · paleta cálida y capa agrícola acotada a datos (§4) ·
valores concretos del tema claro (§6) · presupuesto de animación infinita (§7.3) ·
canon de visualización de datos (§9) · `--metallic-border` tokenizado (§12.3) ·
ilustración SVG sobre emojis y sprite de iconos (§8) · `tokens.json` + Stylelint en
CI + versionado semántico (§17).

**De la auditoría de código sobre el repo (hallazgos no presentes en A ni en B):**
`--gold-4` definido seis veces (cinco hojas CSS + un `<style>` en línea) y consumido por 36 de las 37 hojas de producción (§1.4) · dos escalas
tipográficas incompatibles conviviendo, 0.70/0.92 vs. 0.75/1rem (§1.5, §5.1) ·
el `[data-theme="light"]` con `.theme-toggle` que **ya existe** sin documentar y con
un dorado de 2.48:1 (§1.6, §6.1) · la deriva documento↔código del velocímetro con
el código exacto que oculta la cartera pendiente (§1.8, §10.1) · deuda medida:
962 hex, 402 `!important`, 66 `transition: all`, 21 `100vh` frente a 10 `dvh`,
2 `color-scheme` · Font Awesome cargado desde CDN en **dos versiones distintas**
según la página (§8.2) · el canon V12 recomendaba `transition: all` como default,
siendo a la vez la causa de su propia deuda (§7.6) · `100vh` vs `100dvh` en
modales móviles (§13) · `--shadow-focus` dependía de `--bg-1`, lo que rompía el
anillo de foco en cualquier tema claro — resuelto al pasar a `outline` con
`--focus-ring` (§16).

**Correcciones aplicadas a las propuestas originales:** el dorado claro propuesto en
B (`#8A6D1F`) se declaraba conforme a 4.5:1 pero mide **4.34:1** sobre marfil; se
sustituye por `#735A12` (5.82:1). El `--gold-ink` de A quedaba sin valor; aquí se
define. La eliminación de Inter propuesta por B se rechaza con motivo (§5.2). El
`--motion-data: 600ms` de A se integra como categoría formal en lugar de excepción
(§7.2).

---

© 2026 YavlGold · ADN Visual V13.0 — propuesta
