# 🧪 Testing Guide - Protección de Rutas (5 minutos)

## ⚡ Testing Rápido desde LiveServer

### Pre-requisitos
- ✅ LiveServer corriendo en `http://localhost:5500` (o puerto configurado)
- ✅ Navegador en **modo incógnito** o localStorage limpio
- ✅ Consola de DevTools abierta (F12)

---

## 📋 Checklist de Testing - Sin Login

| # | Módulo | Acción | Resultado Esperado | Status |
|---|--------|--------|-------------------|--------|
| 1 | **YavlCrypto** | Click en card homepage | Redirect a `/#login` + log console `[YavlCrypto] ⛔` | ⬜ |
| 2 | **YavlAcademy** | Click en card homepage | Redirect a `/#login` + log console `[YavlAcademy] ⛔` | ⬜ |
| 3 | **YavlSocial** | Click en card homepage | Redirect a `/#login` + log console `[YavlSocial] ⛔` | ⬜ |
| 4 | **YavlSuite** | Click en card homepage | Redirect a `/#login` + log console `[YavlSuite] ⛔` | ⬜ |
| 5 | **YavlAgro** | Click en card homepage | Redirect a `/#login` + log console `[YavlAgro] ⛔` | ⬜ |
| 6 | **YavlTrading** | Click en card homepage | Redirect a `/#login` + log console `[YavlTrading] ⛔` | ⬜ |
| 7 | **YavlChess** | Click en card homepage | Redirect a `/#login` + log console `[YavlChess] ⛔` | ⬜ |
| 8 | **Dashboard** | URL directo `/dashboard/` | Redirect a `/#login` + log console `[Dashboard] ⛔` | ⬜ |

---

## 🔍 Detalles de Cada Test

### Test 1: YavlCrypto (Herramientas)
```bash
1. Navegar a: http://localhost:5500
2. Scroll a sección "Ecosistema YAVL"
3. Click en card "YavlCrypto" (el destacado con ⚡ ALTA PRIORIDAD)
4. Verificar:
   ✅ URL cambia a: http://localhost:5500/#login
   ✅ Console muestra: [Herramientas] ⛔ No hay sesión, redirigiendo...
   ✅ Pantalla de login visible
```

### Test 2: YavlAcademy
```bash
1. Navegar a: http://localhost:5500
2. Click en card "YavlAcademy" (badge verde "40% COMPLETO")
3. Verificar:
   ✅ URL cambia a: http://localhost:5500/#login
   ✅ Console muestra: [YavlAcademy] ⛔ No hay sesión, redirigiendo...
   ✅ Sin alert() - redirect silencioso
```

### Test 3: YavlSocial
```bash
1. Navegar a: http://localhost:5500
2. Click en card "YavlSocial" (badge "PRÓXIMAMENTE")
3. Verificar:
   ✅ URL cambia a: http://localhost:5500/#login
   ✅ Console muestra: [YavlSocial] ⛔ No hay sesión, redirigiendo...
   ✅ NO da error de página no encontrada
```

### Test 4: YavlSuite
```bash
1. Navegar a: http://localhost:5500
2. Click en card "YavlSuite" (DJ + karaoke + editor)
3. Verificar:
   ✅ URL cambia a: http://localhost:5500/#login
   ✅ Console muestra: [YavlSuite] ⛔ No hay sesión, redirigiendo...
   ✅ NO da error de página no encontrada
```

### Test 5: YavlAgro (CRÍTICO - antes daba error)
```bash
1. Navegar a: http://localhost:5500
2. Click en card "YavlAgro" (ícono seedling 🌱)
3. Verificar:
   ✅ URL cambia a: http://localhost:5500/#login
   ✅ Console muestra: [YavlAgro] ⛔ No hay sesión, redirigiendo...
   ✅ NO da error "Cannot GET /apps/agro/"
   ✅ NO aparece página blanca
```

### Test 6: YavlTrading
```bash
1. Navegar a: http://localhost:5500
2. Click en card "YavlTrading" (badge rojo "MUY IMPORTANTE")
3. Verificar:
   ✅ URL cambia a: http://localhost:5500/#login
   ✅ Console muestra: [YavlTrading] ⛔ No hay sesión, redirigiendo...
   ✅ Link ya NO dice "En desarrollo" con candado
```

### Test 7: YavlChess
```bash
1. Navegar a: http://localhost:5500
2. Click en card "YavlChess" (badge gris "FUTURO")
3. Verificar:
   ✅ URL cambia a: http://localhost:5500/#login
   ✅ Console muestra: [YavlChess] ⛔ No hay sesión, redirigiendo...
   ✅ Link ya NO dice "Próximamente" con candado
```

### Test 8: Dashboard (URL directo)
```bash
1. Navegar directamente a: http://localhost:5500/dashboard/
2. Verificar:
   ✅ Redirect automático inmediato
   ✅ URL cambia a: http://localhost:5500/#login
   ✅ Console muestra: [Dashboard] ⛔ No hay sesión activa, redirigiendo...
```

---

## ✅ Testing Con Login

### Setup
```bash
1. Navegar a: http://localhost:5500/#login
2. Login con credenciales válidas
3. Verificar que auth-token existe en localStorage
```

### Checklist Post-Login

| # | Módulo | Acción | Resultado Esperado | Status |
|---|--------|--------|-------------------|--------|
| 1 | **YavlCrypto** | Click en card | Acceso permitido + log `✅ Sesión encontrada` | ⬜ |
| 2 | **YavlAcademy** | Click en card | Acceso permitido + log `✅ Sesión encontrada` | ⬜ |
| 3 | **YavlSocial** | Click en card | Acceso permitido + log `✅ Sesión encontrada` | ⬜ |
| 4 | **YavlSuite** | Click en card | Acceso permitido + log `✅ Sesión encontrada` | ⬜ |
| 5 | **YavlAgro** | Click en card | Acceso permitido + log `✅ Sesión encontrada` | ⬜ |
| 6 | **YavlTrading** | Click en card | Acceso permitido + log `✅ Sesión encontrada` | ⬜ |
| 7 | **YavlChess** | Click en card | Acceso permitido + log `✅ Sesión encontrada` | ⬜ |
| 8 | **Dashboard** | URL directo | Acceso permitido + dashboard visible | ⬜ |

---

## 🐛 Casos de Error Comunes

### Error 1: "Cannot GET /apps/social/"
**Causa:** LiveServer no está sirviendo el archivo correctamente  
**Solución:** Verificar que `/apps/social/index.html` existe

### Error 2: Loop infinito de redirects
**Causa:** Script de protección en página de login  
**Solución:** Verificar que `index.html` (homepage) NO tiene script de protección

### Error 3: Página blanca sin redirect
**Causa:** Error de JavaScript en script de protección  
**Solución:** Abrir console y verificar errores

### Error 4: Redirect a página incorrecta
**Causa:** Path incorrecto en `window.location.replace()`  
**Solución:** 
- Raíz (`/herramientas/`): usar `/#login`
- Apps (`/apps/social/`): usar `/../../#login`
- Dashboard (`/dashboard/`): usar `../#login`

---

## 📊 Console Logs Esperados

### Sin Sesión (Cualquier Módulo)
```javascript
[YavlSocial] ⛔ No hay sesión, redirigiendo...
// Redirect automático a /#login
```

### Con Sesión Válida
```javascript
[YavlSocial] ✅ Sesión encontrada
[YavlSocial] ✅ Sesión válida, permitiendo acceso
// Página del módulo se carga normalmente
```

### Con Sesión Inválida/Expirada
```javascript
[YavlSocial] Error verificando sesión: SyntaxError...
[YavlSocial] ⛔ No hay sesión, redirigiendo...
// Redirect a /#login
```

---

## 🎯 Criterios de Éxito

### ✅ PASA si:
- [x] 8/8 módulos redirigen a `/#login` sin sesión
- [x] 8/8 módulos permiten acceso con sesión válida
- [x] Console logs aparecen correctamente
- [x] NO hay alerts molestos
- [x] NO hay errores 404
- [x] NO hay páginas blancas
- [x] YavlAgro ya NO da error

### ❌ FALLA si:
- [ ] Cualquier módulo permite acceso sin login
- [ ] Cualquier módulo da error 404
- [ ] Aparecen alerts/confirmations
- [ ] Redirect va a página incorrecta
- [ ] Console muestra errores de JavaScript

---

## 🚀 Testing Adicional (Opcional)

### Test de Performance
```bash
1. Abrir Network tab en DevTools
2. Navegar a homepage
3. Click en cada módulo sin login
4. Verificar:
   ✅ Redirect es INMEDIATO (<100ms)
   ✅ NO se cargan assets del módulo antes del redirect
   ✅ Script de protección se ejecuta ANTES del DOM
```

### Test de Navegación Back/Forward
```bash
1. Click en módulo → Redirect a login
2. Click botón "Atrás" del navegador
3. Verificar:
   ✅ Regresa a homepage (NO a módulo)
   ✅ window.location.replace() previene historial
```

### Test de URL Directo
```bash
1. Copiar URL de módulo (ej: http://localhost:5500/apps/social/)
2. Pegar en nueva ventana incógnito
3. Presionar Enter
4. Verificar:
   ✅ Redirect automático a /#login
   ✅ Sin cargar contenido del módulo
```

---

## 📝 Reporte de Bugs

Si encuentras algún problema, repórtalo con:

```markdown
**Módulo:** YavlXXX
**URL Probado:** http://localhost:5500/...
**Resultado Esperado:** Redirect a /#login
**Resultado Obtenido:** [describir]
**Console Logs:** [copiar logs]
**Navegador:** Chrome/Firefox/Safari versión X
**Sesión:** Con login / Sin login
```

---

## ⏱️ Tiempo Estimado

- **Testing Sin Login:** 2 minutos (8 clicks)
- **Testing Con Login:** 2 minutos (login + 8 clicks)
- **Testing Adicional:** 1 minuto (opcional)

**TOTAL:** ~5 minutos para validación completa

---

## ✨ Próximo Paso

Una vez completado este testing:

1. ✅ Marcar todos los checkboxes
2. 📸 Tomar screenshot de console con logs
3. 📋 Proceder con CHECKLIST-TESTEO-PRE-FASE-2.md completo
4. 🚀 Iniciar Fase 2 - Font Awesome Optimization

---

**Última actualización:** 2025-01-XX  
**Versión:** 1.0.0  
**Estado:** 🟢 READY FOR TESTING
