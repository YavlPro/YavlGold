# 🛡️ CUENTA ADMIN - YavlGold

## 👤 INFORMACIÓN DEL ADMINISTRADOR

**Rol:** Admin Principal  
**Estado:** Activo  
**User ID:** `68a4963b-2b86-4382-a04f-1f38f1873d1c`  
**Flag:** `is_admin = true` en `public.profiles`

---

## 🔐 ACCESO AL SISTEMA

### Login:
1. Ve a: https://yavlpro.github.io/YavlGold/
2. Click en "Iniciar Sesión"
3. Ingresa tus credenciales configuradas en Supabase
4. El sistema te reconocerá automáticamente como Admin

### Badge Visible:
Después de login, verás en el navbar:
```
👤 TuUsername 🛡️ ADMIN
```

---

## ✨ PRIVILEGIOS DE ADMIN

### 1. **Gestión de Usuarios**
- Ver todos los perfiles en `public.profiles`
- Modificar `is_admin` de otros usuarios
- Eliminar usuarios si es necesario

### 2. **Gestión de Anuncios**
- Crear anuncios en `public.announcements`
- Editar/eliminar cualquier anuncio (no solo los propios)
- Moderar contenido

### 3. **Acceso a Datos**
- Consultar métricas de usuarios
- Ver XP points y levels de todos
- Acceso a analytics

### 4. **Configuración del Sistema**
- Modificar parámetros en Supabase
- Actualizar políticas RLS si es necesario
- Gestionar roles

---

## 🗄️ CONSULTAS SQL ÚTILES

### Ver todos los usuarios:
```sql
SELECT 
  p.id,
  p.username,
  p.email,
  p.is_admin,
  p.xp_points,
  p.current_level,
  p.created_at,
  u.last_sign_in_at,
  u.email_confirmed_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;
```

### Ver todos los admins:
```sql
SELECT 
  username,
  email,
  created_at
FROM public.profiles
WHERE is_admin = true;
```

### Promover usuario a admin:
```sql
-- ⚠️ CUIDADO: Solo ejecutar si estás seguro
UPDATE public.profiles
SET is_admin = true, updated_at = now()
WHERE email = 'usuario@example.com';
```

### Degradar admin a usuario:
```sql
UPDATE public.profiles
SET is_admin = false, updated_at = now()
WHERE email = 'usuario@example.com';
```

### Ver anuncios recientes:
```sql
SELECT 
  a.id,
  a.title,
  a.content,
  p.username as author,
  a.created_at
FROM public.announcements a
LEFT JOIN public.profiles p ON a.author_id = p.id
ORDER BY a.created_at DESC
LIMIT 10;
```

### Estadísticas generales:
```sql
-- Total de usuarios
SELECT COUNT(*) as total_users FROM public.profiles;

-- Total de admins
SELECT COUNT(*) as total_admins FROM public.profiles WHERE is_admin = true;

-- Usuarios registrados hoy
SELECT COUNT(*) as new_today 
FROM public.profiles 
WHERE created_at::date = CURRENT_DATE;

-- Top 10 usuarios por XP
SELECT username, xp_points, current_level
FROM public.profiles
ORDER BY xp_points DESC
LIMIT 10;
```

---

## 🔧 TAREAS DE ADMINISTRACIÓN

### Crear nuevo admin:
1. El usuario debe registrarse normalmente
2. Ve a Supabase Dashboard > Table Editor > profiles
3. Encuentra al usuario por email
4. Cambia `is_admin` de `false` a `true`
5. El usuario verá el badge 🛡️ ADMIN en su próximo login

### Resetear password de usuario:
```sql
-- En Supabase, ir a Authentication > Users
-- Click en usuario > Send password reset email
-- O usar la API:
```

### Eliminar usuario:
```sql
-- ⚠️ ACCIÓN IRREVERSIBLE
-- 1. Eliminar de auth.users (elimina también el perfil por CASCADE)
DELETE FROM auth.users WHERE email = 'usuario@example.com';

-- 2. O hacerlo desde Dashboard:
-- Authentication > Users > Click usuario > Delete User
```

### Moderar anuncios:
```sql
-- Ver anuncios de un usuario específico
SELECT * FROM public.announcements 
WHERE author_id = '68a4963b-2b86-4382-a04f-1f38f1873d1c';

-- Eliminar anuncio
DELETE FROM public.announcements WHERE id = 'uuid-del-anuncio';

-- Editar anuncio
UPDATE public.announcements
SET content = 'Nuevo contenido', updated_at = now()
WHERE id = 'uuid-del-anuncio';
```

---

## 📊 DASHBOARD ADMIN (Futuro)

En versiones futuras, se puede crear una interfaz admin en:
```
/dashboard/admin/
```

Con secciones:
- 📈 Analytics y métricas
- 👥 Gestión de usuarios
- 📢 Gestión de anuncios
- ⚙️ Configuración del sistema
- 📝 Logs de actividad
- 🛡️ Seguridad y permisos

---

## 🔐 POLÍTICAS RLS PARA ADMIN

### Actualizar políticas para admins:

```sql
-- Permitir a admins ver todos los perfiles
CREATE POLICY "admins_select_all_profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- Permitir a admins editar cualquier perfil
CREATE POLICY "admins_update_all_profiles" ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- Permitir a admins editar cualquier anuncio
CREATE POLICY "admins_update_all_announcements" ON public.announcements
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- Permitir a admins eliminar cualquier anuncio
CREATE POLICY "admins_delete_all_announcements" ON public.announcements
FOR DELETE
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);
```

---

## 🧪 VERIFICAR ESTADO ADMIN

### En Console del Navegador:
```javascript
// Después de hacer login, ejecuta en consola:
const user = await getCurrentUser();
console.log('Admin?', user.isAdmin);
console.log('User ID:', user.id);
console.log('Username:', user.username);
```

### En Supabase SQL Editor:
```sql
-- Verificar tu perfil
SELECT * FROM public.profiles 
WHERE id = '68a4963b-2b86-4382-a04f-1f38f1873d1c';

-- Debe mostrar:
-- is_admin: true
-- username: tu_username
-- email: tu_email
```

---

## 🚨 SEGURIDAD

### Mejores Prácticas:
1. ✅ Nunca compartas tus credenciales de admin
2. ✅ Usa password fuerte (12+ caracteres, mixto)
3. ✅ Habilita 2FA en Supabase Dashboard
4. ✅ Revisa logs regularmente
5. ✅ Limita número de admins (solo los necesarios)
6. ✅ Documenta cambios importantes

### Revocar acceso admin:
```sql
-- Si necesitas quitar admin temporalmente
UPDATE public.profiles
SET is_admin = false, updated_at = now()
WHERE id = '68a4963b-2b86-4382-a04f-1f38f1873d1c';
```

---

## 📞 CONTACTO DE EMERGENCIA

Si pierdes acceso a tu cuenta admin:
1. Acceder a Supabase Dashboard directamente
2. Table Editor > profiles > buscar por email
3. Verificar/cambiar `is_admin` a `true`
4. O crear nuevo usuario admin desde SQL Editor

---

## 🎯 PRÓXIMOS PASOS

1. ✅ Login con tus credenciales
2. ✅ Verificar badge 🛡️ ADMIN en navbar
3. ✅ Revisar consola para ver datos de perfil
4. 📝 Crear primer anuncio de prueba
5. 👥 Invitar otros usuarios
6. 🛠️ Configurar políticas adicionales si es necesario

---

**Tu User ID:**
```
68a4963b-2b86-4382-a04f-1f38f1873d1c
```

**Rol en BD:**
```sql
is_admin = true
```

**Estado:** ✅ ACTIVO  
**Última actualización:** 19 de Octubre, 2025
