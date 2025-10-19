# 🧪 TEST DE REGISTRO - Guía Rápida

**Fecha**: 19 de Octubre 2025  
**Estado**: ✅ Test listo para ejecutar  

---

## 🚀 SERVIDOR INICIADO

```
✅ Servidor HTTP corriendo en puerto 8080
✅ Página de test creada: test-registro-rapido.html
✅ Navegador abierto con la URL del test
```

---

## 📱 URL DEL TEST

```
https://upgraded-dollop-7wrwwjgrj6xcpq59-8080.app.github.dev/test-registro-rapido.html
```

**Otras URLs disponibles:**
- Test completo: `/tests/test-signup.html`
- Página principal: `/index.html`

---

## 🎯 CÓMO USAR EL TEST

### Paso 1: Auto-rellenar (Recomendado)
Click en el botón **"⚡ Auto-rellenar con datos de prueba"**

Esto generará automáticamente:
- Nombre: `Test User {random}`
- Email: `test{timestamp}@yavlgold.test`
- Password: `password123`

### Paso 2: Crear Cuenta
Click en **"🚀 Crear Cuenta de Prueba"**

### Paso 3: Observar Logs
El sistema mostrará en tiempo real:
- ✅ Inicialización de Supabase
- 📝 Datos del registro
- 🏷️ Username generado
- 🔄 Llamada a API
- ✅ Usuario creado en auth.users
- 🔍 Verificación del perfil
- ✅ Perfil encontrado/creado en public.profiles
- 📧 Email de confirmación enviado

---

## 📊 QUÉ ESPERAR

### ✅ REGISTRO EXITOSO

```
[23:45:12] ✅ Supabase inicializado correctamente
[23:45:15] 📝 Iniciando registro de usuario...
[23:45:15] 👤 Nombre: Test User 123
[23:45:15] 📧 Email: test1729382712345@yavlgold.test
[23:45:15] 🏷️ Username generado: test_user_123
[23:45:15] 🔄 Llamando a supabase.auth.signUp()...
[23:45:16] ✅ Usuario creado en auth.users
[23:45:16] 🆔 User ID: a1b2c3d4-5678-90ab-cdef-1234567890ab
[23:45:16] 📧 Email: test1729382712345@yavlgold.test
[23:45:16] 📅 Creado: 19/10/2025, 23:45:16
[23:45:16] ⏳ Esperando trigger ensure_profile_exists() (1 segundo)...
[23:45:17] 🔍 Verificando perfil en public.profiles...
[23:45:17] ✅ Perfil encontrado en public.profiles
[23:45:17] 🏷️ Username: test_user_123
[23:45:17] 🎨 Avatar: NULL
[23:45:17] 📝 Bio: NULL
[23:45:17] 👑 Admin: No
[23:45:17] ⭐ XP: 0
[23:45:17] 🎯 Nivel: 1
[23:45:17] 📧 Email de confirmación enviado por Supabase
[23:45:17] ⚠️ Usuario debe confirmar email antes de login
[23:45:17] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[23:45:17] ✅ REGISTRO EXITOSO
[23:45:17] ✅ Usuario creado en auth.users
[23:45:17] ✅ Perfil creado en public.profiles
[23:45:17] ✅ Email de confirmación enviado
[23:45:17] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### ❌ EMAIL YA REGISTRADO

```
[23:45:12] ✅ Supabase inicializado correctamente
[23:45:15] 📝 Iniciando registro de usuario...
[23:45:15] 👤 Nombre: Test User 123
[23:45:15] 📧 Email: test@example.com
[23:45:15] 🏷️ Username generado: test_user_123
[23:45:15] 🔄 Llamando a supabase.auth.signUp()...
[23:45:16] ❌ ERROR: User already registered
[23:45:16] 💡 El email ya está registrado. Intenta con otro email.
```

---

## 🔍 VERIFICAR EN SUPABASE DASHBOARD

Después de un registro exitoso, verifica en:

### 1. Authentication → Users
1. Ve a: https://supabase.com/dashboard/project/gerzlzprkarikblqxpjt/auth/users
2. Busca el email que usaste
3. Deberías ver:
   - Email: `test{timestamp}@yavlgold.test`
   - Created: hace unos segundos
   - Confirmed: ❌ (hasta que se confirme el email)

### 2. Table Editor → profiles
1. Ve a: https://supabase.com/dashboard/project/gerzlzprkarikblqxpjt/editor
2. Selecciona tabla `profiles`
3. Busca el registro con el mismo UUID
4. Deberías ver:
   - id: (mismo UUID que auth.users)
   - email: `test{timestamp}@yavlgold.test`
   - username: `test_user_123`
   - xp_points: 0
   - current_level: 1
   - created_at: timestamp actual

---

## 🎨 CARACTERÍSTICAS DEL TEST

### UI Moderna
- ✅ Diseño glassmorphism
- ✅ Gradientes dorados (YavlGold theme)
- ✅ Animaciones suaves
- ✅ Responsive design

### Funcionalidad
- ✅ Auto-rellenar con datos de prueba
- ✅ Validación de formulario
- ✅ Logs en tiempo real
- ✅ Códigos de color (success/error/warning/info)
- ✅ Timestamps en cada log
- ✅ Scroll automático
- ✅ Estados de loading

### Testing
- ✅ Verifica inicialización de Supabase
- ✅ Prueba signUp() completo
- ✅ Valida creación de usuario
- ✅ Verifica trigger de perfil
- ✅ Fallback manual si trigger falla
- ✅ Detecta errores comunes

---

## 🐛 TROUBLESHOOTING

### "Error al inicializar Supabase"
- Verifica que el SUPABASE_URL y SUPABASE_ANON_KEY sean correctos
- Check browser console (F12) para detalles

### "User already registered"
- Click en "Auto-rellenar" para generar nuevo email único
- O usa email diferente manualmente

### "Perfil no encontrado por trigger"
- Normal: el código tiene fallback automático
- Creará perfil manualmente
- No es un error crítico

### Trigger no se ejecuta
- Verifica en Supabase SQL Editor que el trigger existe:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'create_profile_after_user_insert';
  ```
- Si no existe, ejecuta el SQL de SUPABASE-SETUP-INSTRUCTIONS.md

---

## 📝 NOTAS

1. **Emails únicos**: Cada test usa email con timestamp para evitar conflictos
2. **Sin CAPTCHA**: Test simplificado sin hCaptcha para rapidez
3. **Confirmación email**: Usuario debe confirmar email antes de login real
4. **Datos de prueba**: Usa dominio `.test` para distinguir de usuarios reales
5. **Auto-cleanup**: Puedes eliminar usuarios de prueba desde Supabase Dashboard

---

## 🚀 PRÓXIMOS PASOS

Después de validar que funciona:

1. **Probar en producción**: https://yavlpro.github.io/YavlGold/
2. **Test con CAPTCHA**: Usar página principal con hCaptcha habilitado
3. **Confirmar email**: Click en link del email de confirmación
4. **Test de login**: Intentar login con cuenta confirmada
5. **Dashboard**: Verificar acceso al dashboard después de login

---

**Preparado por:** GitHub Copilot  
**Test creado:** 19 de Octubre 2025, 23:50 UTC  
**Estado:** ✅ LISTO PARA EJECUTAR
