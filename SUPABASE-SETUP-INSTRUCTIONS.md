# 🚀 INSTRUCCIONES DE SETUP DE SUPABASE

## ⚠️ IMPORTANTE - EJECUTAR UNA SOLA VEZ

Para que el sistema de autenticación funcione completamente con perfiles automáticos, necesitas ejecutar las migraciones SQL en tu proyecto de Supabase.

---

## 📋 PASO 1: Acceder al Dashboard de Supabase

1. Ve a: https://supabase.com/dashboard
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto: **gerzlzprkarikblqxpjt**

---

## 🔧 PASO 2: Abrir el SQL Editor

1. En el menú lateral izquierdo, haz clic en **"SQL Editor"**
2. Haz clic en el botón **"New query"** (+ New Query)

---

## 📝 PASO 3: Ejecutar el SQL

1. Abre el archivo: `/supabase/migrations/001_setup_profiles_trigger.sql`
2. **Copia TODO el contenido** del archivo
3. **Pega** el contenido en el SQL Editor de Supabase
4. Haz clic en el botón **"Run"** (▶️) o presiona `Ctrl+Enter`

### ✅ Resultado esperado:

Deberías ver el mensaje:
```
Success. No rows returned
```

O similar, indicando que la query se ejecutó correctamente.

---

## 🔍 PASO 4: Verificar la Configuración

### Verificar Trigger:

1. Ve a: **Database** → **Functions** (en el menú lateral)
2. Busca la función: `ensure_profile_exists`
3. Debe aparecer con estado **Active**

### Verificar Políticas RLS:

1. Ve a: **Authentication** → **Policies**
2. Busca las tablas: `profiles` y `announcements`
3. Deberías ver 4-5 políticas para cada tabla

### Verificar Tablas:

1. Ve a: **Table Editor**
2. Verifica que existan:
   - `auth.users` (tabla del sistema)
   - `public.profiles` (tu tabla personalizada)
   - `public.announcements` (tu tabla personalizada)

---

## 🧪 PASO 5: Probar el Sistema

### Test de Registro:

1. Ve a tu sitio: https://yavlpro.github.io/YavlGold/
2. Haz clic en **"Registrarse"**
3. Completa el formulario:
   - **Nombre**: Tu Nombre
   - **Email**: tu@email.com
   - **Contraseña**: mínimo 6 caracteres
4. Haz clic en **"Crear Cuenta"**

### ✅ Verificar en Supabase:

1. Ve a: **Table Editor** → **profiles**
2. Deberías ver una nueva fila con:
   - `id` (UUID que coincide con auth.users)
   - `email` (tu email)
   - `username` (generado automáticamente)
   - `created_at` y `updated_at` (timestamps)

### Test de Login:

1. Revisa tu email y confirma la cuenta (link de Supabase)
2. Vuelve al sitio y haz clic en **"Iniciar Sesión"**
3. Ingresa tus credenciales
4. Deberías ser redirigido a: `/dashboard/`

---

## 📊 LO QUE SE CONFIGURÓ

### 1. **Trigger Automático**
```sql
CREATE TRIGGER create_profile_after_user_insert
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION ensure_profile_exists();
```
- ✅ Cada vez que se crea un usuario en `auth.users`
- ✅ Automáticamente se crea un perfil en `public.profiles`
- ✅ Se sincroniza el email y username

### 2. **Políticas RLS en `profiles`**
- `profiles_select_own`: Solo puedes ver tu propio perfil
- `profiles_update_own`: Solo puedes editar tu propio perfil
- `profiles_insert_self`: Solo puedes crear tu propio perfil
- `profiles_delete_own`: Solo puedes eliminar tu propio perfil
- `profiles_select_public`: Todos pueden ver todos los perfiles (opcional)

### 3. **Políticas RLS en `announcements`**
- `announcements_select_all`: Todos pueden leer anuncios
- `announcements_insert_auth`: Solo usuarios autenticados pueden crear
- `announcements_update_author`: Solo el autor puede editar
- `announcements_delete_author`: Solo el autor puede eliminar

### 4. **Índices Optimizados**
- `idx_profiles_id`: Optimiza búsquedas por ID
- `idx_profiles_email`: Optimiza búsquedas por email
- `idx_profiles_username`: Optimiza búsquedas por username
- `idx_announcements_author_id`: Optimiza relación con autores

---

## 🔐 SEGURIDAD

### ✅ Implementado:
- RLS (Row Level Security) habilitado en todas las tablas
- Usuarios solo pueden ver/editar sus propios datos
- Passwords encriptados por Supabase (no en localStorage)
- JWT tokens con refresh automático
- Email confirmation requerido

### ⚠️ Nunca expongas:
- `SERVICE_ROLE_KEY` en el cliente
- Tokens de usuarios en consola
- Passwords en logs

---

## 🐛 TROUBLESHOOTING

### ❌ Error: "relation 'profiles' does not exist"
**Solución**: La tabla `profiles` no existe. Verifica que ejecutaste el SQL correctamente.

### ❌ Error: "new row violates row-level security policy"
**Solución**: Las políticas RLS están muy restrictivas. Verifica las políticas con:
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### ❌ Perfil no se crea automáticamente
**Solución**: Verifica el trigger con:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'create_profile_after_user_insert';
```

### ❌ Error: "duplicate key value violates unique constraint"
**Solución**: El usuario ya existe. Usa un email diferente o elimina el usuario anterior.

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa la consola del navegador (F12)
2. Revisa los logs de Supabase: **Logs** → **API Logs**
3. Verifica que las políticas RLS estén correctamente configuradas
4. Contacta al equipo de desarrollo

---

## ✨ RESULTADO FINAL

Después de completar estos pasos:

✅ Sistema de registro funcional con Supabase
✅ Login con email + password
✅ Perfiles automáticos en `public.profiles`
✅ RLS configurado para seguridad
✅ Email confirmation habilitado
✅ Dashboard protegido con autenticación real

**¡Tu aplicación está lista para producción!** 🎉
