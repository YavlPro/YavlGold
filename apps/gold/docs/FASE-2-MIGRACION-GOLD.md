# FASE 2: MIGRACIÓN DE YAVLGOLD A /apps/gold/

**Fecha:** 18 de Octubre 2025  
**Duración estimada:** 2-3 horas  
**Estado:** 🔄 EN PROGRESO

---

## 🎯 OBJETIVOS DE LA FASE 2

1. ✅ Mover todo el contenido actual de YavlGold a `/apps/gold/`
2. ✅ Extraer código de autenticación a `/packages/auth/src/`
3. ✅ Actualizar imports en todos los archivos HTML/JS
4. ✅ Configurar package.json en /apps/gold/
5. ✅ Testing completo de funcionalidad

---

## 📋 PLAN DE EJECUCIÓN

### PASO 1: Crear package.json en /apps/gold/
- Definir dependencias (@yavl/auth, @yavl/ui, @yavl/themes, @yavl/utils)
- Configurar scripts básicos

### PASO 2: Mover contenido actual
- Mover todos los archivos excepto packages/, apps/, node_modules/, .git/
- Usar rsync para preservar estructura

### PASO 3: Extraer autenticación a /packages/auth/
- Copiar authClient.js → /packages/auth/src/authClient.js
- Copiar authGuard.js → /packages/auth/src/authGuard.js
- Copiar authUI.js → /packages/auth/src/authUI.js
- Implementar funcionalidad completa

### PASO 4: Actualizar imports
- Cambiar rutas relativas por imports de packages
- Actualizar referencias en HTML
- Actualizar referencias en JS

### PASO 5: Testing
- Verificar login/register funciona
- Verificar user menu funciona
- Verificar navegación funciona
- Verificar dashboard funciona

---

## 🔧 COMANDOS PRINCIPALES

```bash
# Crear package.json en /apps/gold/
cd /home/codespace/gold/apps/gold
cat > package.json

# Mover contenido
rsync -av --exclude='apps' --exclude='packages' --exclude='node_modules' --exclude='.git' --exclude='pnpm-*' --exclude='package.json' /home/codespace/gold/ /home/codespace/gold/apps/gold/
```

---

## ⚠️ ARCHIVOS CRÍTICOS A MIGRAR

### Autenticación (→ /packages/auth/)
- `/assets/js/auth/authClient.js`
- `/assets/js/auth/authGuard.js`
- `/assets/js/auth/authUI.js`

### Contenido de Gold (→ /apps/gold/)
- `/index.html`
- `/dashboard/`
- `/academia/`
- `/herramientas/`
- `/assets/` (CSS, images, JS)
- `/docs/`
- Todo lo demás

---

## 📊 PROGRESO

- [ ] Paso 1: package.json creado
- [ ] Paso 2: Contenido movido
- [ ] Paso 3: Auth extraído
- [ ] Paso 4: Imports actualizados
- [ ] Paso 5: Testing completado

---

**Inicio:** 18 Oct 2025  
**Estimado fin:** 18 Oct 2025 (mismo día)
