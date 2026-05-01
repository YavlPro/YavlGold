# ADN Visual V11.0 — YavlGold

**Estado:** ACTIVO — Canon visual actual
**Version:** V11.0
**Base anterior:** ADN Visual V10.0 (metálico fundacional, archivado como referencia histórica)
**Fecha de canonización:** 2026-05-01

---

## §0 — Misión

ADN Visual V11 no busca más brillo, sino más verdad visual.

El sistema debe sentirse agrícola, serio, sobrio, oscuro, dorado y útil.

- El dorado guía; no grita.
- El fondo sostiene; no compite.
- La animación acompaña; no distrae.
- El componente informa; no decora por decorar.

---

## §1 — No negociables

1. **Stack visual**: Vanilla JS + Vite MPA + CSS Custom Properties. Prohibido: React, Vue, Svelte, Angular, Next, Nuxt, Astro, Tailwind.
2. **Identidad dark/gold**: Fondo oscuro, acento dorado `#C8A752` (`--gold-4`). Sin azul/morado como marca.
3. **Tokens antes que hardcodes**: Siempre `var(--token)`, nunca hex directo en componentes.
4. **Tipografía**: Orbitron (títulos), Rajdhani (cuerpo/UI), Playfair Display (citas).
5. **Iconos**: Font Awesome 6.5 Free. Siempre `aria-hidden="true"` en decorativos.
6. **Accesibilidad**: `prefers-reduced-motion` obligatorio. Focus rings visibles.

---

## §2 — Paleta canónica V11

### Color core

```css
--gold-1: #2a2218;
--gold-2: #3a3228;
--gold-3: #6b5a3e;
--gold-4: #C8A752;
--gold-5: #E8D48B;
```

### Fondos

```css
--bg-0: #050505;
--bg-1: #0a0a0a;
--bg-2: #0B0C0F;
--bg-3: #111113;
--bg-4: #1a1a1f;
```

### Texto

```css
--text-primary: #ffffff;
--text-secondary: #cccccc;
--text-muted: #94A3B8;
```

### Bordes

```css
--border-neutral: rgba(255,255,255,0.08);
--border-gold: rgba(200,167,82,0.25);
```

### Estados semánticos

```css
--color-success: #10B981;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;
```

### Regla

Los hex anteriores viven dentro de tokens CSS. No se reparten por componentes. Si un componente necesita un color, primero revisa si existe un token. Si no existe, créalo en la capa de tokens antes de usarlo.

### Alias de compatibilidad

Los alias legacy (`--gg-*`, `--v10-*`, `--sombra-dorada`, etc.) se mantienen mientras existan referencias activas en CSS, pero no se crean nuevos alias legacy.

---

## §3 — Sombras V11

V10 definía sombras doradas agresivas (`--shadow-gold-xl`, `--shadow-metallic`). V11 reduce:

```css
--shadow-gold-xs: 0 1px 6px rgba(200,167,82,0.10);
--shadow-gold-sm: 0 2px 10px rgba(200,167,82,0.12);
--shadow-dark: 0 4px 24px rgba(0,0,0,0.5);
--shadow-focus: 0 0 0 2px var(--bg-1), 0 0 0 4px var(--gold-4);
```

### Reglas de sombra

- **Cards y superficies**: `--shadow-dark` o ninguna. Sombra oscura, no glow dorado.
- **Hover sutil**: `--shadow-gold-xs` o `--shadow-gold-sm` máximo. Nada de `md`, `lg`, `xl`.
- **Focus**: `--shadow-focus` siempre.
- **Modales**: `--shadow-dark`. Prohibido glow dorado en shell de modal.
- **Prohibido**: `--shadow-gold-md`, `--shadow-gold-lg`, `--shadow-gold-xl`, `--shadow-metallic`. Estos tokens se retiran del canon activo.

---

## §4 — Motion V11

### Canon

- **Interacciones UI**: 120–180ms. `all 150ms ease` como default.
- **Transiciones**: solo para orientación espacial (mostrar/ocultar, expandir/colapsar).
- **Animaciones infinitas**: prohibidas salvo loader/spinner controlado.
- **`prefers-reduced-motion`**: siempre respetado. Toda animación debe tener fallback `animation: none`.

### Animaciones permitidas

- `fadeInUp` (entrada de vistas, 0.3s ease, una sola vez).
- Transiciones de opacity/transform en hover/focus.
- Spinners de carga.

### Animaciones retiradas del canon activo

Las siguientes animaciones de V10 ya no se usan como patrón recomendado:

- `metallicShift`, `metallicRotate`, `logoSheen`, `badgeSheen` — exceso de brillo metálico.
- `textGlow`, `pulseGlow` — glows pulsantes.
- `borderShimmer`, `btnShimmer` — shimmer decorativo.
- `breathe`, `float` — movimiento decorativo constante.

Si alguna existe en CSS legacy, no se elimina sin migración, pero no se promueve ni replica.

---

## §5 — Tipografía

### Escala

```css
--text-xs: 0.70rem;
--text-sm: 0.80rem;
--text-base: 0.92rem;
--text-md: 1.00rem;
--text-lg: 1.10rem;
--text-xl: 1.30rem;
--text-2xl: 1.60rem;
--text-3xl: 2.20rem;
```

### Reglas

- Títulos de módulo: `--text-xl` o `--text-2xl`. Nunca `--text-4xl` en Agro.
- Subtítulos: `--text-md` o `--text-lg` con `--text-secondary`.
- Body: `--text-base`.
- Labels/chips: `--text-sm`.

---

## §6 — Radii

```css
--radius-xs: 4px;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-pill: 9999px;
```

### Reglas

- Cards: `--radius-md`.
- Botones: `--radius-sm` o `--radius-md`.
- Modales: `--radius-lg`.
- Chips/tabs: `--radius-md`.
- Avatares: `--radius-pill` o `50%`.

---

## §7 — Componentes V11

### Botones

```css
/* Primary gold */
.btn-gold {
  background: var(--gold-4);
  color: var(--bg-1);
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-6);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 150ms ease;
}
.btn-gold:hover { opacity: 0.9; }
.btn-gold:disabled { opacity: var(--state-disabled-opacity); cursor: not-allowed; }

/* Outline gold */
.btn-outline-gold {
  background: transparent;
  color: var(--gold-4);
  border: 1px solid var(--border-gold);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-6);
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;
}
.btn-outline-gold:hover {
  background: rgba(200,167,82,0.08);
  border-color: var(--gold-4);
}
```

### Reglas de botón

- Sin glow. Sin gradiente. Sin shimmer.
- Hover = cambio de opacidad o fondo sutil.
- Focus = ring dorado visible.
- Flat, sobrio, funcional.

### Cards

```css
.card-canon {
  background: var(--bg-2);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-md);
  padding: var(--space-6);
}
.card-canon:hover {
  border-color: var(--border-gold);
}
```

- Sin glow dorado de fondo.
- Sin gradiente metálico de borde.
- Hover = borde dorado sutil.

### Inputs

```css
.input-canon {
  background: var(--bg-1);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  font-family: Rajdhani, sans-serif;
  font-size: var(--text-base);
  transition: border-color 150ms ease;
}
.input-canon:focus {
  outline: none;
  border-color: var(--gold-4);
  box-shadow: var(--shadow-focus);
}
```

---

## §8 — Canon de modales V11

El estándar es el modal "Configura tu asistente IA".

### Estructura

```html
<div class="modal-overlay">
  <div class="modal-dialog" role="dialog" aria-modal="true">
    <div class="modal-header">
      <div>
        <p class="modal-eyebrow">Contexto</p>
        <h3 class="modal-title">Título del modal</h3>
        <p class="modal-copy">Descripción breve del propósito.</p>
      </div>
      <button class="modal-close" aria-label="Cerrar">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Contenido -->
    </div>
  </div>
</div>
```

### Estilo

```css
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal-dialog {
  background: var(--bg-2);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-lg);
  max-width: 480px;
  width: calc(100% - var(--space-8));
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-dark);
}
.modal-title {
  color: var(--gold-4);
  font-size: var(--text-lg);
  font-weight: 600;
}
.modal-eyebrow {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
.modal-close {
  background: none; border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
}
```

### Reglas de modal

- Overlay oscuro (`rgba(0,0,0,0.85)`).
- Panel sobrio sin glow dorado.
- Borde neutral fino, no borde dorado grueso.
- Sombra oscura, no shadow-gold.
- Título en `--gold-4` o `--text-secondary`, nunca blanco gigante.
- Botones flat dark/gold.
- Inputs sobrios alineados al canon.
- Cierre con Escape + botón X.
- Mobile centrado y usable.

### Prohibido en modales

- Halos dorados fuertes.
- Gradientes metálicos.
- Títulos blancos enormes.
- Botones con brillo exagerado.
- Animaciones de entrada dramáticas (scale, slide).
- Emojis como decoración de chrome funcional.

---

## §9 — Hub y navegación V11

### Navegación principal

```
Inicio · Granja · Memoria · Menú
```

### Hub Mi Granja

Contiene cuatro grupos:

```
Ciclos de cultivos
  Mis cultivos (Activos · Finalizados · Perdidos)
  Estadísticas de ciclos
  Comparar ciclos

Ciclos de períodos
  Calendario operativo (Activos · Finalizados)
  Estadísticas de períodos
  Comparar períodos

Mis finanzas
  Cartera Viva
  Cartera Operativa
  Mi Carrito

Trabajo y lectura
  Trabajo Diario
  Rankings de Clientes
  Clima Agro
```

### Reglas de navegación

- Barra inferior mobile: visible en hub, oculta en módulos profundos.
- Topbar contextual: `Volver + título` en módulos profundos.
- Botón Dashboard: chip sobrio, no botón gigante.
- Tabs internas (Mis cultivos, Calendario operativo): chips tipo tabbar mobile, dark/gold, sin glow.
- Desktop: hub central con sidebar. Módulos profundos ocultan sidebar.

### Memoria

```
AgroRepo · Asistente IA
```

### Menú

```
Documentación · Soporte oficial · Privacidad
```

---

## §10 — Separación semántica de superficies

1. Cada vista tiene una función primaria clara.
2. No mezclar historial + dashboard + KPIs + formulario en una misma superficie.
3. La capa protagonista es la tarea principal; todo lo demás es secundario.
4. Las estadísticas grandes no deben vivir en vistas de historial/detalle como protagonista.
5. El botón Volver debe ser siempre visible y accesible.
6. Antes de agregar un bloque nuevo, verificar que pertenece semánticamente a esa vista.

---

## §11 — Ghost emojis

Los ghost emojis (emojis de fondo con opacidad 0.02–0.05 y `pointer-events: none`) son un recurso decorativo sutil, no un sistema visual protagonista.

### Reglas

- Opacidad máxima: `0.05`.
- `pointer-events: none` obligatorio.
- `user-select: none` obligatorio.
- No interferir con contenido interactivo.
- `prefers-reduced-motion`: detener cualquier animación de ghost.

---

## §12 — Responsive

| Breakpoint | Clase | Uso |
|---|---|---|
| >900px | Desktop | Sidebar completa, hub central |
| ≤900px | Tablet | Sidebar colapsable |
| ≤768px | Mobile | Barra inferior, hub panels |
| ≤480px | Small | Full-width, touch optimizado |

---

## §13 — Anti-patrones prohibidos V11

1. **No hardcodear hex en componentes.** Color → token → componente.
2. **No crear paletas por módulo.** Una sola paleta canónica.
3. **No meter glow para "hacer premium".** El dorado no necesita brillar para ser valioso.
4. **No usar `box-shadow` dorado fuerte en modales.** Sombra oscura.
5. **No usar títulos blancos gigantes en modales.** Título en gold o text-secondary.
6. **No usar gradientes animados como textura base.** Gradientes solo excepcionales.
7. **No duplicar botones/entradas.** Un patrón, un componente.
8. **No crear módulos visuales falsos.** Cada superficie debe tener función real.
9. **No mezclar Cartera Viva con Cartera Operativa en una vista profunda.** Separación semántica.
10. **No reabrir `agro.js` para styling.** Estilos en CSS, lógica en JS.
11. **No usar Tailwind, React, SPA.** Stack V11 = stack V1.
12. **No animaciones infinitas decorativas.** Solo loaders controlados.
13. **No shimmer/metallic como patrón general.** Solo excepciones justificadas.
14. **No `animation-duration` > 220ms en interacciones de estado.**

---

## §14 — Spacing

```css
--space-0: 0;
--space-px: 1px;
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.25rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-10: 2.5rem;
--space-12: 3rem;
--space-16: 4rem;
--space-20: 5rem;
--space-24: 6rem;
```

### Anti-patrones de spacing

- No usar valores arbitrarios (`margin: 13px`).
- No mezclar px y rem sin token intermedio.
- No `margin-top` en primer hijo de sección — usar `gap` o padding del padre.

---

## §15 — Iconografía

```css
--icon-xs: 0.75rem;
--icon-sm: 0.875rem;
--icon-base: 1rem;
--icon-md: 1.25rem;
--icon-lg: 1.5rem;
--icon-xl: 2rem;
```

### Reglas

- Solo Font Awesome 6.5 Free.
- `aria-hidden="true"` en decorativos.
- No animar con propiedades que causen reflow.
- No usar tamaños fuera de la escala.

---

## §16 — Accesibilidad

- Focus ring: `box-shadow: 0 0 0 2px var(--bg-1), 0 0 0 4px var(--gold-4)`.
- Touch target mínimo: `44px`.
- No usar `outline: none` sin reemplazo visual.
- No comunicar solo con color.
- `tabindex` nunca > 0.
- ARIA roles en componentes custom.

---

## §17 — Gobernanza

### Jerarquía

1. Este documento (`ADN-VISUAL-V11.0.md`) es el canon visual activo.
2. `ADN-VISUAL-V10.0.md` es referencia histórica fundacional. No se elimina, pero ya no rige.
3. Todo cambio visual pasa por aquí primero.

### Criterio de cambio

- Cambios de token → editar aquí → implementar después.
- Nuevos componentes → seguir canon → documentar aquí.
- Excepciones → justificar y registrar.

### Flujo obligatorio

1. Definir en ADN Visual V11.
2. Versionar si es cambio mayor.
3. Implementar después de documento.

---

## §18 — Nota histórica

ADN Visual V10.0 fue la base fundacional metálica del proyecto. Definió la identidad dark/gold, la paleta 5-tone, la tipografía, los tokens y la arquitectura visual completa. Sin V10 no existiría V11.

ADN Visual V11.0 consolida lo que ya quedó vivo en el producto: superficies más sobrias, menos brillo decorativo, mejor separación semántica, modales alineados al canon del asistente IA, y una identidad visual agrícola real que prioriza claridad sobre espectáculo.

---

© 2026 YavlGold · ADN Visual V11.0
