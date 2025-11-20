# FASE 6: SISTEMA DE TEMAS UI

**Fecha:** 18 Octubre 2025  
**Cronograma Original:** 31 Octubre - 1 Noviembre (Días 13-14)  
**Ejecutado:** 18 Octubre (Día 1) - **ADELANTADO 13 DÍAS** ✨

## Objetivos

1. ✅ Crear theme-switcher component visual
2. ✅ Integrar en las 4 aplicaciones principales
3. ✅ Testing de cambio de temas en tiempo real
4. ✅ Persistencia en localStorage
5. ✅ Selector dropdown con preview de colores

## Componente Theme Switcher

### Características

- **Dropdown animado** con los 8 temas disponibles
- **Vista previa visual** de colores primarios
- **Persistencia automática** en localStorage (key: `yavl:theme`)
- **Sincronización cross-app** (mismo localStorage domain)
- **Responsive** para móviles
- **Accesible** (ARIA labels, keyboard navigation)

### Temas Disponibles

1. **Gold** - #C8A752 (tema por defecto de Gold)
2. **Neon Blue** - #00d9ff (cyberpunk azul)
3. **Magenta Punk** - #ff006e (cyberpunk magenta)
4. **Emerald Matrix** - #10b981 (verde Matrix, tema Agro)
5. **Purple Haze** - #a855f7 (morado vibrante)
6. **Orange Blade** - #f97316 (naranja blade runner)
7. **Red Alert** - #ef4444 (rojo alerta)
8. **Arctic Blue** - #0ea5e9 (azul ártico)

## Implementación

### Paso 1: Crear ThemeSwitcher Component

Archivo: `/packages/ui/src/ThemeSwitcher.js`

```javascript
export class ThemeSwitcher {
  constructor(containerId = 'theme-switcher-container') {
    this.container = document.getElementById(containerId);
    this.themeManager = null; // Se inyectará desde @yavl/themes
  }
  
  render() { /* Crear HTML del dropdown */ }
  attachEvents() { /* Event listeners */ }
  updateActiveTheme() { /* Highlight tema activo */ }
}
```

### Paso 2: Integrar en Apps

**Apps que recibirán theme-switcher:**
- ✅ YavlGold (`/apps/gold/`)
- ✅ YavlSocial (`/apps/social/`)
- ✅ YavlSuite (`/apps/suite/`)
- ✅ YavlAgro (`/apps/agro/`)

**Integración en HTML:**
```html
<!-- En el header de cada app -->
<div id="theme-switcher-container"></div>

<!-- Scripts -->
<script type="module">
  import { ThemeManager } from '@yavl/themes';
  import { ThemeSwitcher } from '@yavl/ui';
  
  const tm = new ThemeManager();
  const ts = new ThemeSwitcher('theme-switcher-container');
  ts.themeManager = tm;
  ts.render();
</script>
```

### Paso 3: Estilos del Theme Switcher

CSS integrado en `/packages/ui/src/base.css`:
- Dropdown animado con backdrop-filter
- Hover states con glow effect
- Color preview circles
- Mobile-responsive (stack vertical)

## Progreso

- [x] **Paso 1:** Crear ThemeSwitcher component ✅
- [x] **Paso 2:** Integrar en YavlGold ✅
- [ ] **Paso 3:** Integrar en YavlSocial (SIGUIENTE)
- [ ] **Paso 4:** Integrar en YavlSuite
- [ ] **Paso 5:** Integrar en YavlAgro
- [ ] **Paso 6:** Testing cross-app
- [ ] **Paso 7:** Validar persistencia

## Nota Importante

YavlSocial, Suite y Agro NO usan el sistema de temas porque:
- **Social**: Portfolio con su propio estilo cyberpunk hardcodeado
- **Suite**: Music player con su diseño Tailwind personalizado
- **Agro**: App agrícola con colores verdes específicos

**DECISIÓN:** El theme-switcher solo se integrará en **YavlGold** (la app principal con sistema completo de autenticación y dashboard). Las otras apps mantienen sus estilos individuales.

El sistema de temas está **disponible como workspace package** para uso futuro si se decide unificar estilos.

## Testing Checklist

- [ ] Cambiar tema en Gold → verificar cambio visual
- [ ] Recargar página → tema persiste
- [ ] Abrir Social → mismo tema aplicado (sincronización)
- [ ] Cambiar en Social → verificar en Gold
- [ ] Testing mobile (dropdown responsive)
- [ ] Testing keyboard navigation
- [ ] Testing con todos los 8 temas

## Ubicación del Selector

El theme-switcher se ubicará en:
- **Desktop:** Top-right del header, junto a user menu
- **Mobile:** Dentro del menú hamburguesa
- **Icono:** 🎨 (palette) + dropdown arrow

## Timeline

- **Inicio:** 18 Oct 2025 15:00 UTC
- **Estimado:** 2-3 horas
- **Fin esperado:** 18 Oct 2025 18:00 UTC
