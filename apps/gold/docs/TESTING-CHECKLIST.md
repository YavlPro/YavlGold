# ✅ Testing Checklist - YavlGold MVP

**Fecha:** 17 de Octubre 2025  
**Versión:** MVP v1.0  
**Último Commit:** 7226a12

---

## 🎯 Objetivo del Testing

Verificar que el flujo completo de gamificación funciona end-to-end:
- Homepage → Registro → Login → Dashboard → Lección → Quiz → Completar → XP actualizado

---

## 📋 Pre-requisitos

### ✅ Infraestructura Confirmada

- [x] **DNS IPv4:** 4 registros A configurados
- [x] **DNS IPv6:** 4 registros AAAA configurados  
- [x] **CNAME:** www → YavlPro.github.io
- [x] **SSL:** Certificado Let's Encrypt válido hasta Enero 2026
- [x] **Scripts:** Rutas absolutas corregidas (/assets/js)
- [x] **Responsive:** Media queries para móvil agregadas

### ✅ Código Base

- [x] **Database:** 10 tablas en Supabase con RLS
- [x] **Academia.js:** 632 líneas - Sistema de progreso
- [x] **Dashboard:** 762 líneas - Visualización de stats
- [x] **Lección 1:** 1,167 líneas - Quiz funcional con UUID real
- [x] **Commits:** 6 commits pusheados a main

---

## 🧪 FASE 1: Verificación de Botones

### 🖥️ Test en Laptop (Escritorio)

**Tiempo estimado:** 3 minutos

#### Pasos:

1. **Abrir navegador** (Chrome, Firefox o Edge)
2. **Visitar:** https://yavlgold.com
3. **Forzar recarga:** `Ctrl + Shift + R` (sin cache)
4. **Esperar carga completa** (2-3 segundos)

#### Verificaciones:

- [ ] **Header visible:** Logo YavlGold + Navegación + Botones
- [ ] **Botón "Iniciar Sesión":**
  - [ ] Estilo: Outline dorado transparente
  - [ ] Icono: 🔑 visible
  - [ ] Hover: Efecto de elevación
  - [ ] Click: Abre modal de login
- [ ] **Botón "Registrarse":**
  - [ ] Estilo: Fill dorado brillante (gradiente)
  - [ ] Icono: ➕ visible
  - [ ] Hover: Efecto de brillo
  - [ ] Click: Abre modal de registro

#### Consola (F12):

- [ ] **Sin errores rojos** en Console
- [ ] **Scripts cargados:** authClient.js, authUI.js, authGuard.js
- [ ] **`window.AuthUI` definido** (verificar en Console: `window.AuthUI`)

#### ❌ Si falla:

1. Abre consola: `F12` → `Console`
2. Busca errores relacionados con "AuthUI" o "404"
3. Screenshot de consola
4. Reportar error específico

---

### 📱 Test en Móvil

**Tiempo estimado:** 5 minutos

#### Preparación:

1. **Cerrar todas** las pestañas de yavlgold.com
2. **Borrar cache del navegador:**
   - Chrome: Configuración → Privacidad → Borrar datos
   - Safari: Configuración → Safari → Borrar historial
3. **Usar datos móviles** (no WiFi)
4. **Reiniciar navegador**

#### Pasos:

1. Abrir navegador móvil
2. Visitar: https://yavlgold.com
3. Esperar carga completa

#### Verificaciones:

- [ ] **Header compacto:** Logo más pequeño
- [ ] **Navegación oculta** (solo logo + botones visibles)
- [ ] **Botón "Iniciar Sesión":**
  - [ ] Texto visible
  - [ ] Icono 🔑 **OCULTO** (media query)
  - [ ] Tamaño reducido (padding 8px 12px)
  - [ ] Click: Abre modal responsive
- [ ] **Botón "Registrarse":**
  - [ ] Texto visible
  - [ ] Icono ➕ **OCULTO**
  - [ ] Tamaño reducido
  - [ ] Click: Abre modal responsive

#### Modal en móvil:

- [ ] **Ancho:** 95% de pantalla
- [ ] **Padding:** 20px
- [ ] **Formulario legible**
- [ ] **Botones accesibles**
- [ ] **Scroll funcional** si formulario largo

#### ❌ Si falla:

1. Screenshot del header
2. Screenshot del modal (si abre)
3. Intentar en WiFi (comparar)
4. Reportar diferencias

---

## 🚀 FASE 2: Test End-to-End Completo

**Prerequisito:** Fase 1 completada exitosamente (botones funcionan)

**Tiempo estimado:** 15-20 minutos

---

### PASO 1: Registro de Usuario

#### Acción:

1. Click en botón **"Registrarse"**
2. Completar formulario:
   - **Email:** test+[timestamp]@example.com (ej: test+20251017@example.com)
   - **Password:** Segura123! (mínimo 8 caracteres)
   - **Confirmar password:** Segura123!
3. Resolver hCaptcha (si aparece)
4. Click "Crear Cuenta"

#### Verificaciones:

- [ ] Modal se abre correctamente
- [ ] Formulario visible y funcional
- [ ] Validación de contraseña funciona
- [ ] Barra de fortaleza aparece
- [ ] hCaptcha carga (si está activado)
- [ ] Mensaje de éxito aparece
- [ ] Redirección automática al Dashboard

#### Resultados esperados:

```
✅ Cuenta creada exitosamente
✅ Email de verificación enviado (revisar inbox)
✅ Redirigido a /dashboard/
```

#### ❌ Si falla:

- Error: "Email already exists" → Usar otro email
- Error: "Password too weak" → Contraseña más fuerte
- Error: "Captcha failed" → Resolver captcha de nuevo
- Otro error → Screenshot + mensaje completo

---

### PASO 2: Login (Si no se redirigió automáticamente)

#### Acción:

1. Click en botón **"Iniciar Sesión"**
2. Ingresar credenciales:
   - **Email:** El usado en registro
   - **Password:** Segura123!
3. Click "Iniciar Sesión"

#### Verificaciones:

- [ ] Modal de login abre
- [ ] Campos email/password funcionales
- [ ] Botón "Mostrar/Ocultar contraseña" funciona
- [ ] Login exitoso
- [ ] Redirección al Dashboard

#### Resultados esperados:

```
✅ Login exitoso
✅ Session iniciada (cookie guardada)
✅ Redirigido a /dashboard/
```

---

### PASO 3: Verificar Dashboard - Estado Inicial

#### URL:

`https://yavlgold.com/dashboard/`

#### Verificaciones - Header:

- [ ] **Logo YavlGold** visible
- [ ] **Navegación:** Herramientas, Academia, Comunidad, Dashboard
- [ ] **Botones auth reemplazados por:**
  - [ ] Avatar del usuario (iniciales o imagen)
  - [ ] Nombre de usuario
  - [ ] Menú desplegable (click para abrir)

#### Verificaciones - Sección "Tu Progreso Académico":

- [ ] **Título:** "Tu Progreso Académico" visible
- [ ] **Stat Cards (4 tarjetas):**
  
  **Tarjeta 1: Puntos XP**
  - [ ] Icono: ⭐ o 🏆
  - [ ] Valor: **0 XP**
  - [ ] Texto: "Puntos Experiencia"
  
  **Tarjeta 2: Nivel Actual**
  - [ ] Icono: 👶 o 📊
  - [ ] Valor: **Novice**
  - [ ] Texto: "Tu Nivel"
  
  **Tarjeta 3: Racha de Estudio**
  - [ ] Icono: 🔥
  - [ ] Valor: **0 días**
  - [ ] Texto: "Racha de Estudio"
  
  **Tarjeta 4: Lecciones Completadas**
  - [ ] Icono: 📚
  - [ ] Valor: **0/10**
  - [ ] Texto: "Lecciones Completadas"

#### Verificaciones - Barra de Progreso XP:

- [ ] **Barra visible** con indicadores de nivel
- [ ] **Nivel actual:** Novice (0 XP)
- [ ] **Próximo nivel:** Adept (100 XP)
- [ ] **Progreso:** 0% completado
- [ ] **Indicadores visuales:** Novice, Adept, Expert, Master

#### Verificaciones - Sección "Cursos en Progreso":

- [ ] **Título:** "Cursos en Progreso"
- [ ] **Estado:** "No hay cursos en progreso" o vacío (normal al inicio)

#### Verificaciones - Sección "Badges Recientes":

- [ ] **Título:** "Badges Recientes"
- [ ] **Estado:** Sin badges (esperado, es nuevo usuario)

#### Verificaciones - Sección "Próxima Lección":

- [ ] **Card visible** con próxima lección sugerida
- [ ] **Botón:** "Continuar Aprendiendo" o "Empezar"
- [ ] Click redirige a Academia o primera lección

#### 📸 Screenshots recomendados:

- Dashboard completo (scroll full page)
- Sección de stats (4 tarjetas)
- Barra de progreso XP

---

### PASO 4: Navegar a Academia - Lección 1

#### Opción A: Desde Dashboard

1. Click en "Ver Academia Completa" o
2. Click en "Continuar Aprendiendo" (próxima lección)

#### Opción B: URL Directa

Visitar: `https://yavlgold.com/academia/lecciones/modulo-1/01-que-es-bitcoin.html`

#### Verificaciones - Header de Lección:

- [ ] **Breadcrumb visible:**
  - [ ] Homepage → Academia → Módulo 1 → Lección 1
  - [ ] Links funcionales (navegación)

- [ ] **Metadatos de lección:**
  - [ ] Módulo: "Módulo 1: Introducción a Bitcoin"
  - [ ] Lección: "Lección 1 de 5"
  - [ ] Duración: "15 minutos"
  - [ ] Recompensa: "+10 XP"

#### Verificaciones - Contenido:

- [ ] **Video YouTube embebido:**
  - [ ] Iframe visible (16:9)
  - [ ] Video carga correctamente
  - [ ] Controles funcionales (play, pause, volumen)

- [ ] **Secciones de contenido:**
  - [ ] ¿Qué es Bitcoin?
  - [ ] Historia de Bitcoin
  - [ ] ¿Por qué es Revolucionario?
  - [ ] ¿Cómo Funciona?
  - [ ] ¿Para qué se Usa?

- [ ] **Texto legible:** Sin errores de formato
- [ ] **Imágenes (si hay):** Cargan correctamente

---

### PASO 5: Completar Quiz

#### Scroll hasta la sección "🎯 Evalúa tu Conocimiento"

#### Verificaciones - Quiz UI:

- [ ] **Título del quiz** visible
- [ ] **5 preguntas** numeradas
- [ ] **Opciones múltiples** (A, B, C, D) por pregunta
- [ ] **Radio buttons** seleccionables
- [ ] **Botón "Enviar Respuestas"** visible

#### Acción - Responder Quiz (100% correcto):

**Pregunta 1:** ¿Quién creó Bitcoin?  
- [ ] Seleccionar: **B) Satoshi Nakamoto** ✅

**Pregunta 2:** ¿Cuántos bitcoins existirán como máximo?  
- [ ] Seleccionar: **C) 21 millones** ✅

**Pregunta 3:** ¿Qué tecnología usa Bitcoin para registrar transacciones?  
- [ ] Seleccionar: **B) Blockchain** ✅

**Pregunta 4:** ¿En qué año se creó Bitcoin?  
- [ ] Seleccionar: **B) 2009** ✅

**Pregunta 5:** ¿Cuál es la ventaja principal de Bitcoin?  
- [ ] Seleccionar: **B) Descentralización** ✅

#### Acción - Enviar:

1. Click en **"Enviar Respuestas"**
2. Esperar validación (1-2 segundos)

#### Verificaciones - Resultado del Quiz:

- [ ] **Resultado visible:** "5/5 preguntas correctas"
- [ ] **Porcentaje:** 100%
- [ ] **Icono:** 🏆 o 🎉
- [ ] **Mensaje:** "¡Perfecto! Dominaste esta lección"
- [ ] **XP ganados:** "+15 XP Ganados (¡Quiz Perfecto!)"
- [ ] **Botón aparece:** "Marcar Lección como Completada"

#### 📸 Screenshot:

- Resultado del quiz (5/5, +15 XP)

---

### PASO 6: Marcar Lección como Completada

#### Acción:

1. Scroll hasta el botón **"Marcar Lección como Completada"**
2. Click en el botón

#### Verificaciones - Proceso de guardado:

- [ ] **Botón cambia a:** "Guardando..." (spinner)
- [ ] **Espera:** 1-3 segundos
- [ ] **Llamada a academia.js:**
  ```javascript
  window.academiaProgress.markLessonComplete('6a0a26c4-d542-4ac1-bf26-ee357042c04d')
  ```
- [ ] **Botón cambia a:** "¡Lección Completada!" ✅
- [ ] **Alerta aparece:** "¡Felicitaciones! Lección completada. +10 XP ganados"
- [ ] **Botón "Siguiente Lección"** aparece (si hay)

#### Verificaciones - Base de Datos (Backend):

**Tabla `user_lesson_progress`:**
- [ ] Nuevo registro insertado
- [ ] `lesson_id`: 6a0a26c4-d542-4ac1-bf26-ee357042c04d
- [ ] `completed`: true
- [ ] `completed_at`: timestamp actual

**Tabla `profiles`:**
- [ ] Campo `xp_points` actualizado: **25** (15 quiz + 10 lección)
- [ ] Campo `current_level`: "Novice" (0-99 XP)

#### ❌ Si falla:

- Error "Debes iniciar sesión" → Verificar sesión activa
- Error "Ya completaste esta lección" → Normal si re-intentas
- Spinner no desaparece → Error de red, verificar consola (F12)
- No se guarda → Verificar UUID correcto en código

#### 📸 Screenshots:

- Botón "Guardando..."
- Botón "¡Lección Completada!"
- Alerta de felicitaciones

---

### PASO 7: Verificar Actualización de XP en Dashboard

#### Acción:

1. Navegar de regreso al Dashboard
2. Opción A: Click en logo "YavlGold"
3. Opción B: URL directa: `https://yavlgold.com/dashboard/`

#### Verificaciones - Stats Actualizados:

**Tarjeta 1: Puntos XP**
- [ ] Valor: **25 XP** (era 0)
  - [ ] +15 XP del quiz perfecto
  - [ ] +10 XP de lección completada
- [ ] Color/estilo actualizado

**Tarjeta 2: Nivel Actual**
- [ ] Valor: **Novice 👶** (sin cambio, necesitas 100 XP para Adept)
- [ ] Correcto (25 XP < 100 XP)

**Tarjeta 3: Racha de Estudio**
- [ ] Valor: **1 día** (si es tu primera actividad hoy)
- [ ] O **0 días** (si ya habías estudiado antes)

**Tarjeta 4: Lecciones Completadas**
- [ ] Valor: **1/10** (era 0/10)
- [ ] Progreso: 10% completado

#### Verificaciones - Barra de Progreso XP:

- [ ] **Barra rellena:** ~25% del primer segmento (Novice → Adept)
- [ ] **Texto:** "25 / 100 XP para Adept"
- [ ] **Animación:** Barra se llena suavemente (transition)

#### Verificaciones - Cursos en Progreso:

- [ ] **Card de Módulo 1** aparece:
  - [ ] Título: "Módulo 1: Introducción a Bitcoin"
  - [ ] Progreso: "1 de 5 lecciones (20%)"
  - [ ] Barra de progreso: 20% rellena
  - [ ] Botón: "Continuar" (va a lección 2)

#### Verificaciones - Badges:

- [ ] **Badge "Primer Paso" 🎯 desbloqueado** (opcional, depende de implementación)
  - [ ] Título: "Primer Paso"
  - [ ] Descripción: "Completaste tu primera lección"
  - [ ] Rareza: "Común" (gris o bronce)
  - [ ] Fecha de desbloqueo: Hoy

#### ❌ Si los datos NO se actualizan:

1. **Forzar recarga:** `Ctrl + Shift + R`
2. **Verificar en Supabase:**
   - Abrir Supabase Dashboard
   - Table Editor → `profiles`
   - Buscar tu email
   - Verificar `xp_points`: debe ser 25
3. **Verificar en Console (F12):**
   - `console.log(await window.academiaProgress.getProgressStats())`
   - Debería mostrar: `{ xp: 25, level: 'Novice', ... }`
4. **Si sigue en 0:**
   - Error en `markLessonComplete()`
   - Verificar RLS policies en Supabase
   - Verificar permisos de usuario

#### 📸 Screenshots CRÍTICOS:

- Dashboard completo con stats actualizados
- XP: 25 (destacado)
- Lecciones: 1/10
- Barra de progreso (25/100)
- Badge "Primer Paso" (si aparece)

---

## ✅ CRITERIOS DE ÉXITO

### 🎯 MVP Completamente Funcional si:

- [x] Botones de login/registro funcionan en laptop
- [x] Botones de login/registro funcionan en móvil
- [x] Registro de usuario exitoso
- [x] Login funcional
- [x] Dashboard carga con stats iniciales (XP: 0)
- [x] Lección 1 carga correctamente
- [x] Video de lección funciona
- [x] Quiz se puede completar
- [x] Quiz valida respuestas correctamente (5/5 = +15 XP)
- [x] Botón "Marcar como Completada" funciona
- [x] Lección se guarda en base de datos
- [x] Dashboard actualiza XP: 0 → 25
- [x] Dashboard actualiza lecciones: 0/10 → 1/10
- [x] Sistema de gamificación funciona end-to-end

### 📊 Métricas de Éxito:

```
✅ Flujo completo: 0 errores
✅ XP calculado correctamente: 25 (15+10)
✅ Persistencia de datos: Supabase actualizado
✅ UI responsive: Funciona en laptop + móvil
✅ Tiempo de respuesta: < 3 segundos por acción
```

---

## 🐛 Troubleshooting

### Problema 1: Botones no funcionan

**Síntomas:**
- Click en botón no hace nada
- No se abre modal

**Solución:**
1. Abrir consola (F12)
2. Verificar: `window.AuthUI` está definido
3. Si undefined: Scripts no cargaron
4. Verificar rutas en index.html: `/assets/js/auth/...`
5. Forzar recarga: `Ctrl + Shift + R`

---

### Problema 2: XP no se actualiza

**Síntomas:**
- Lección marcada como completada
- Dashboard sigue mostrando XP: 0

**Solución:**
1. Verificar en Supabase:
   - `profiles` → `xp_points` debe ser 25
2. Si está en 25 pero UI muestra 0:
   - Forzar recarga del dashboard
   - Verificar `loadAcademiaProgress()` en código
3. Si está en 0 en Supabase:
   - RLS policy bloquea UPDATE
   - Verificar permisos en Table Editor
   - Re-ejecutar `markLessonComplete()`

---

### Problema 3: Quiz no valida respuestas

**Síntomas:**
- Click en "Enviar Respuestas" no hace nada
- No aparece resultado

**Solución:**
1. Verificar que TODAS las preguntas estén respondidas
2. Console (F12): Buscar errores JavaScript
3. Verificar `correctAnswers` en código de lección
4. Refrescar página e intentar de nuevo

---

### Problema 4: SSL sigue mostrando error

**Síntomas:**
- "NET::ERR_CERT_AUTHORITY_INVALID"
- Navegador muestra advertencia

**Solución:**
1. Modo incógnito: `Ctrl + Shift + N`
2. Si funciona en incógnito: Limpiar cache normal
3. Si no funciona:
   - Verificar DNS propagado: https://dnschecker.org
   - Esperar 24h propagación completa
   - Verificar GitHub Pages: Settings > Pages
4. Alternativa temporal: Usar http://yavlpro.github.io/gold

---

## 📝 Reporte de Testing

Al completar el testing, reportar:

### ✅ Si todo funciona:

```markdown
## ✅ TEST EXITOSO - MVP FUNCIONAL

**Fecha:** [Fecha]
**Dispositivos probados:**
- Laptop: [Navegador] en [OS]
- Móvil: [Navegador] en [Modelo]

**Resultados:**
✅ Botones funcionan en ambos dispositivos
✅ Registro/Login exitoso
✅ Dashboard muestra stats correctamente
✅ Lección 1 carga y reproduce video
✅ Quiz validado correctamente (5/5, +15 XP)
✅ Lección marcada como completada (+10 XP)
✅ Dashboard actualizado (XP: 25, Lecciones: 1/10)
✅ Sistema de gamificación funcional

**Screenshots:** [Adjuntar]

**Conclusión:** MVP listo para producción 🚀
```

### ❌ Si hay errores:

```markdown
## ❌ TEST CON ERRORES

**Fecha:** [Fecha]
**Dispositivo:** [Laptop/Móvil]
**Navegador:** [Chrome/Firefox/Safari]

**Paso fallido:** [PASO X: Nombre]

**Error específico:**
[Descripción detallada]

**Screenshots:**
[Adjuntar consola (F12) + pantalla]

**Intentos de solución:**
- [X] Forzar recarga
- [X] Limpiar cache
- [ ] Modo incógnito
- [ ] Otro navegador

**Estado:** Pendiente de fix
```

---

## 📞 Soporte

Si encuentras errores no documentados aquí:

1. **Screenshot de:** Console (F12), pantalla del error, URL actual
2. **Información:** Navegador, OS, dispositivo, pasos para reproducir
3. **Logs de Supabase:** Si es error de base de datos
4. **Reportar a:** GitHub Issues o contacto directo

---

**Última actualización:** 17 de Octubre 2025  
**Versión del documento:** 1.0  
**Autor:** YavlGold Team
