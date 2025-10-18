# 🧪 Guía de Testing - YavlAgro Integration

## Cómo usar el sistema de tests

### 1. Abrir el Test en el Navegador

**Opción A - Servidor Local:**
```bash
cd /home/codespace/gold
python3 -m http.server 8000
```
Luego visita: `http://localhost:8000/test-yavlagro-integration.html`

**Opción B - Producción:**
Visita: `https://yavlgold.com/test-yavlagro-integration.html`

### 2. Ejecutar los Tests

El test se ejecuta automáticamente al cargar la página, pero también puedes:
- Click en **"▶ Ejecutar Todos los Tests"** para volver a ejecutar
- Click en **"🔄 Recargar"** para refrescar la página

### 3. Interpretar los Resultados

#### ✅ PASS (Verde)
- Todo funciona correctamente
- No se requiere acción

#### ❌ FAIL (Rojo)
- **PROBLEMA CRÍTICO** que debe ser corregido
- Lee el mensaje de error y los detalles
- Sigue las sugerencias de corrección

#### ⚠️ WARN (Naranja)
- Advertencia o problema menor
- Puede funcionar pero no es óptimo
- Revisar cuando sea posible

### 4. Tests Incluidos

#### Test 1: Archivos YavlAgro
- ✓ `/apps/agro/index.html` existe
- ✓ `/apps/agro/YavlAgro.html` existe
- ✓ Supabase SDK incluido
- ✓ ThemeManager incluido
- ✓ AuthGuard implementado
- ✓ Redirección configurada

#### Test 2: Enlaces en Dashboard
- ✓ NO hay enlaces antiguos de GitHub Pages
- ✓ Enlace correcto a `/apps/agro/`
- ✓ Enlace correcto a `/apps/suite/`

#### Test 3: AuthGuard y Protección
- ✓ `/assets/js/supabase.js` existe
- ✓ `/assets/js/auth.js` existe
- ⚠️ Redirección a login es comportamiento esperado

#### Test 4: Sistema de Temas
- ✓ `/assets/js/themeManager.js` existe
- ✓ ThemeManager tiene funciones (init, toggle)
- ✓ Tema actual aplicado
- ✓ Tema guardado en localStorage

#### Test 5: Calculadora
- ✓ `/herramientas/calculadora.html` existe
- ✓ Enlaces en dashboard correctos
- ✓ Protección `data-protected="true"` aplicada

#### Test 6: Metadatos y SEO
- ✓ Canonical URL correcto (yavlgold.com)
- ✓ Open Graph URL correcto
- ✓ JSON-LD con URL correcto

## 📊 Resumen Visual

Al final del test verás un resumen como:

```
📊 Resumen de Tests
✓ 15 PASS  ✗ 2 FAIL  ⚠ 3 WARN
```

## 🔧 Acciones Según Resultados

### Si TODO está en PASS ✅
1. ✨ ¡Excelente! Todo funciona
2. Hacer commit y push
3. Desplegar a producción
4. Limpiar caché (ver clear-cache.html)

### Si hay FAILS ❌
1. 📝 Anotar todos los FAILS
2. 🔍 Leer los detalles de cada error
3. 🛠️ Corregir uno por uno
4. 🔄 Re-ejecutar el test
5. Repetir hasta que todo esté en PASS

### Si solo hay WARNS ⚠️
1. Revisar si son críticos para tu caso de uso
2. Corregir si es posible
3. Documentar si decides no corregir

## 🎯 Problemas Comunes y Soluciones

### FAIL: "Supabase SDK NO encontrado"
**Solución:**
Agregar en el `<head>` del archivo:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### FAIL: "ThemeManager NO encontrado"
**Solución:**
Agregar antes del cierre de `</head>`:
```html
<script src="/assets/js/themeManager.js"></script>
```

### FAIL: "AuthGuard NO encontrado"
**Solución:**
Agregar antes del cierre de `</body>`:
```html
<script type="module">
  import { supabase } from '/assets/js/supabase.js';
  
  async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      window.location.href = '/login.html';
      return;
    }
  }
  
  checkAuth();
</script>
```

### FAIL: "Enlaces a GitHub Pages encontrados"
**Solución:**
Buscar y reemplazar en todos los archivos:
```
Buscar: https://yavlpro.github.io/LaGritaAgricultora/
Reemplazar: /apps/agro/
```

### FAIL: "data-protected no encontrado"
**Solución:**
En los enlaces que necesitan protección:
```html
<!-- Antes -->
<a href="/herramientas/calculadora.html">Calculadora</a>

<!-- Después -->
<a href="/herramientas/calculadora.html" data-protected="true">Calculadora</a>
```

### FAIL: "Canonical URL incorrecto"
**Solución:**
En el `<head>`:
```html
<link rel="canonical" href="https://yavlgold.com/apps/agro/YavlAgro.html">
```

## 🚀 Workflow Recomendado

1. **Ejecutar Test Inicial**
   ```bash
   # Abrir test-yavlagro-integration.html
   ```

2. **Anotar todos los FAILS**
   ```
   - Supabase SDK faltante en index.html
   - ThemeManager no encontrado
   - Enlaces antiguos en dashboard
   ```

3. **Corregir uno por uno**
   ```bash
   # Editar archivo → Guardar → Re-ejecutar test
   ```

4. **Verificar PASS completo**
   ```
   ✓ Todos los tests en verde
   ```

5. **Commit y Deploy**
   ```bash
   git add .
   git commit -m "fix: corregir problemas de integración YavlAgro"
   git push
   ```

6. **Limpiar Caché**
   ```
   Visitar: /clear-cache.html
   ```

## 📝 Notas Importantes

### Sobre la Redirección a Login
⚠️ **ESTO ES NORMAL Y CORRECTO:**
- Si no estás autenticado, YavlAgro te redirige a `/login.html`
- Esto es el AuthGuard funcionando como debe
- NO es un error

### Sobre el Caché
🔄 **Problema común:**
- Los navegadores guardan versiones antiguas
- Siempre probar en modo incógnito primero
- Usar Ctrl+Shift+R para forzar recarga
- Usar /clear-cache.html después de cambios

### Sobre los Temas
🎨 **Si los temas no se aplican:**
1. Verificar que themeManager.js existe
2. Verificar que está incluido en el HTML
3. Verificar que se llama `ThemeManager.init()`
4. Revisar la consola del navegador (F12)

## 🆘 Si los Tests Siguen Fallando

1. **Revisar la Consola del Navegador**
   - F12 → Console
   - Buscar errores en rojo
   - Copiar el error completo

2. **Verificar Network Tab**
   - F12 → Network
   - Recargar página
   - Ver qué archivos dan 404

3. **Revisar Archivos Manualmente**
   ```bash
   # Verificar que existen
   ls -la /home/codespace/gold/apps/agro/
   ls -la /home/codespace/gold/assets/js/
   ```

4. **Ejecutar grep para encontrar problemas**
   ```bash
   # Buscar enlaces antiguos
   grep -r "yavlpro.github.io" *.html
   
   # Buscar data-protected
   grep -r "data-protected" *.html
   ```

## ✅ Checklist Final

Antes de dar por terminado:

- [ ] Ejecutar test y obtener 0 FAILS
- [ ] Revisar WARNS y decidir si corregir
- [ ] Probar en modo incógnito
- [ ] Verificar login flow completo
- [ ] Probar cambio de temas
- [ ] Verificar enlaces del dashboard
- [ ] Probar calculadora
- [ ] Hacer commit de cambios
- [ ] Limpiar caché producción
- [ ] Verificar en producción

---

**💡 Tip Pro:** Guarda el link del test en tus favoritos y ejecútalo después de cada cambio importante.

**🎯 Objetivo:** Todos los tests en ✅ PASS antes de desplegar a producción.
