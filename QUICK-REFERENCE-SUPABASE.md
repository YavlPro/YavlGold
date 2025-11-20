# ⚡ QUICK REFERENCE - Supabase Auth Setup

## 🚨 ÚNICO PASO PENDIENTE

### 1️⃣ Ejecutar SQL en Supabase (5 minutos)

```bash
# 1. Ve a:
https://supabase.com/dashboard/project/gerzlzprkarikblqxpjt

# 2. Click: SQL Editor > New Query

# 3. Copia y pega el contenido de:
/supabase/migrations/001_setup_profiles_trigger.sql

# 4. Click: Run (▶️) o Ctrl+Enter

# 5. Verifica: "Success. No rows returned"
```

---

## ✅ VERIFICACIÓN RÁPIDA

```bash
# Abrir en navegador:
tests/verify-supabase.html

# Debe mostrar:
🎉 ¡Sistema Listo! - 100% de verificaciones exitosas
```

---

## 🧪 TEST RÁPIDO

### Registro:
1. Ir a: https://yavlpro.github.io/YavlGold/
2. Click "Registrarse"
3. Llenar formulario + captcha
4. Confirmar email recibido

### Login:
1. Ir a: https://yavlpro.github.io/YavlGold/
2. Click "Iniciar Sesión"
3. Ingresar credenciales + captcha
4. Debe redirigir a `/dashboard/`

---

## � Reset Password (DEV y Cloud)

### Flujo general
1. Click "Entrar" → Modal Premium → "¿Olvidaste tu contraseña?"
2. Ingresa tu email y envía
3. Abre el correo y haz clic en el enlace
4. En `reset-password.html`, define una contraseña fuerte (≥8, mayúscula, número, sin espacios)
5. Inicia sesión con la nueva contraseña

### Emails en entorno local (supabase start)
- Cuando ejecutas `supabase start`, los emails se interceptan en **Inbucket** (no llegan a Gmail).
- Abre Inbucket: `http://localhost:54324` y selecciona tu buzón (email usado en el paso 2).
- Localiza el correo de reseteo de Supabase y haz clic en el enlace.

### Cloud (Proyecto hospedado en Supabase)
- Revisa tu bandeja de entrada real o verifícalo desde Supabase Dashboard > Auth > Users (últimos emails).

---

## �📁 ARCHIVOS CLAVE

| Archivo | Propósito |
|---------|-----------|
| `supabase/migrations/001_setup_profiles_trigger.sql` | SQL a ejecutar (UNA VEZ) |
| `SUPABASE-SETUP-INSTRUCTIONS.md` | Guía detallada paso a paso |
| `tests/verify-supabase.html` | Herramienta de diagnóstico |
| `docs/IMPLEMENTACION-SUPABASE-AUTH-COMPLETA.md` | Documentación técnica completa |
| `index.html` (líneas 2600-2900) | Código de autenticación |

---

## 🔑 CONFIGURACIÓN ACTUAL

```javascript
// Cliente Supabase (línea ~2613 de index.html)
const SUPABASE_URL = 'https://gerzlzprkarikblqxpjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## 🎨 CAPTURAS DE ESTADO

### ✅ ANTES DE EJECUTAR SQL:
```
❌ Tabla profiles no existe
❌ Trigger ensure_profile_exists no encontrado
⚠️ Sistema requiere configuración
```

### ✅ DESPUÉS DE EJECUTAR SQL:
```
✅ Tabla profiles existe y es accesible
✅ Trigger ensure_profile_exists activo
✅ Políticas RLS configuradas (4 en profiles, 4 en announcements)
✅ Índices optimizados
🎉 ¡Sistema Listo!
```

---

## 🔍 VERIFICAR EN SUPABASE DASHBOARD

### Después de ejecutar SQL:

**1. Database > Functions:**
- Función: `ensure_profile_exists` (debe existir)

**2. Authentication > Policies:**
- Tabla `profiles`: 5 políticas
- Tabla `announcements`: 4 políticas

**3. Table Editor > profiles:**
- Columnas: id, username, email, avatar_url, bio, is_admin, created_at, updated_at, xp_points, current_level

**4. Database > Triggers:**
- Trigger: `create_profile_after_user_insert` (debe estar activo)

---

## 📊 FLUJO DE DATOS

```
REGISTRO:
Usuario → Frontend → supabase.auth.signUp()
                        ↓
                  auth.users (Supabase)
                        ↓
                  TRIGGER: ensure_profile_exists()
                        ↓
                  public.profiles (nuevo perfil)
                        ↓
                  Frontend verifica perfil
                        ↓
                  Email de confirmación

LOGIN:
Usuario → Frontend → supabase.auth.signInWithPassword()
                        ↓
                  Validar en auth.users
                        ↓
                  Obtener sesión JWT
                        ↓
                  Consultar public.profiles
                        ↓
                  Cargar datos completos (username, avatar, xp, etc.)
                        ↓
                  Redirigir a /dashboard/
```

---

## 🐛 TROUBLESHOOTING EXPRESS

| Error | Solución |
|-------|----------|
| `relation 'profiles' does not exist` | Ejecutar SQL en Supabase |
| `new row violates row-level security policy` | Verificar políticas RLS |
| `duplicate key value` | Usuario ya existe, usar otro email |
| Email no llega | Revisar spam, verificar email en Supabase Dashboard |
| Perfil no se crea | Trigger no ejecutado, verificar en Database > Triggers |

---

## 💡 COMANDOS ÚTILES

### Ver usuarios registrados:
```sql
-- En Supabase SQL Editor:
SELECT * FROM auth.users;
```

### Ver perfiles creados:
```sql
SELECT * FROM public.profiles;
```

### Verificar trigger:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'create_profile_after_user_insert';
```

### Ver políticas RLS:
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Eliminar usuario de prueba:
```sql
-- Solo si necesitas limpiar
DELETE FROM auth.users WHERE email = 'test@example.com';
-- El perfil se elimina automáticamente por CASCADE
```

---

## 📞 CONTACTO DE EMERGENCIA

Si algo sale mal:
1. Revisar consola del navegador (F12)
2. Revisar Supabase Dashboard > Logs > API Logs
3. Abrir `tests/verify-supabase.html` para diagnóstico
4. Consultar `SUPABASE-SETUP-INSTRUCTIONS.md` para detalles

---

## ✨ RESULTADO ESPERADO

Después de ejecutar el SQL:

```
🎉 SISTEMA COMPLETAMENTE FUNCIONAL

✅ Registro de usuarios con Supabase
✅ Login con credenciales reales
✅ Perfiles automáticos en public.profiles
✅ Seguridad RLS activa
✅ Confirmación de email
✅ Dashboard protegido
✅ Sesiones persistentes
✅ Logout funcional

Tiempo total: 5 minutos
Estado: PRODUCCIÓN 🚀
```

---

## 🎯 LO QUE ESTÁ LISTO

- ✅ Código frontend (index.html)
- ✅ Cliente Supabase inicializado
- ✅ Funciones de auth implementadas
- ✅ SQL preparado para ejecutar
- ✅ Documentación completa
- ✅ Herramienta de verificación
- ✅ Tests preparados

## 🔴 LO QUE FALTA

- ⚠️ Ejecutar SQL en Supabase Dashboard (1 vez, 2 minutos)

---

**ÚLTIMA ACTUALIZACIÓN:** 19 Oct 2025, 22:35 UTC  
**COMMITS:** 295aebf, 8110964, 98369b7, c2e85d3  
**ESTADO:** ✅ LISTO PARA ACTIVACIÓN
