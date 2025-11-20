# 🚀 GUÍA RÁPIDA DE INICIO - Admin YavlGold

**Para:** Yerikson Varela (Admin Principal)  
**Fecha:** 19 de Octubre, 2025  

---

## ⚡ ACCESO INMEDIATO

### 1️⃣ Login en YavlGold (30 segundos)
```
🌐 URL:      https://yavlpro.github.io/YavlGold/
📧 Email:    yeriksonvarela@gmail.com
🔑 Password: (ver archivo .admin-credentials.md)
```

1. Click "Iniciar Sesión"
2. Ingresar credenciales
3. Resolver captcha
4. ✅ Ver badge **🛡️ ADMIN** en navbar

---

## 🗄️ ACCESO A BASE DE DATOS

### Supabase Dashboard:
```
🌐 URL: https://supabase.com/dashboard/project/gerzlzprkarikblqxpjt
📊 Project ID: gerzlzprkarikblqxpjt
```

**Menú útil:**
- **Table Editor** → Ver/editar datos
- **SQL Editor** → Ejecutar consultas
- **Authentication** → Gestionar usuarios
- **Logs** → Ver actividad

---

## 📊 CONSULTAS SQL BÁSICAS

### Ver tu perfil:
```sql
SELECT * FROM public.profiles 
WHERE username = 'yeriksonvarela';
```

### Ver todos los usuarios:
```sql
SELECT 
  username,
  email,
  is_admin,
  xp_points,
  current_level,
  created_at
FROM public.profiles
ORDER BY created_at DESC;
```

### Promover usuario a admin:
```sql
UPDATE public.profiles
SET is_admin = true, updated_at = now()
WHERE email = 'usuario@example.com';
```

### Estadísticas rápidas:
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_admin = true) as admins,
  COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as new_today
FROM public.profiles;
```

---

## 🧪 VERIFICACIONES RÁPIDAS

### Test 1: Badge de Admin
- Login en sitio web
- Navbar debe mostrar: **👤 yeriksonvarela 🛡️ ADMIN**

### Test 2: Console Logs (F12)
```javascript
// Debe mostrar:
[Auth] ✅ Login exitoso: yeriksonvarela@gmail.com
[Auth] 👤 Perfil cargado: { role: "🛡️ ADMIN" ... }
```

### Test 3: Datos en Supabase
```sql
-- Debe retornar 1 fila con is_admin = true
SELECT * FROM public.profiles WHERE username = 'yeriksonvarela';
```

---

## 📁 ARCHIVOS IMPORTANTES

| Archivo | Propósito | Ubicación |
|---------|-----------|-----------|
| `.admin-credentials.md` | **Credenciales** (NO COMPARTIR) | Raíz del proyecto |
| `QUICK-REFERENCE-SUPABASE.md` | Referencia rápida Supabase | Raíz |
| `docs/ADMIN-ACCOUNT-INFO.md` | Info completa admin | /docs/ |
| `SUPABASE-SETUP-INSTRUCTIONS.md` | Guía de setup | Raíz |
| `supabase/migrations/001_*.sql` | SQL de configuración | /supabase/migrations/ |

---

## 🔧 TAREAS COMUNES

### Crear nuevo admin:
1. Usuario se registra normalmente
2. Supabase Dashboard → Table Editor → profiles
3. Buscar por email
4. Cambiar `is_admin` a `true`
5. Usuario verá badge en próximo login

### Ver anuncios:
```sql
SELECT 
  a.title,
  p.username as author,
  a.created_at
FROM public.announcements a
JOIN public.profiles p ON a.author_id = p.id
ORDER BY a.created_at DESC
LIMIT 10;
```

### Eliminar usuario:
```sql
-- ⚠️ CUIDADO: Acción irreversible
DELETE FROM auth.users WHERE email = 'usuario@example.com';
-- El perfil se elimina automáticamente por CASCADE
```

---

## 🚨 EN CASO DE PROBLEMAS

### ❌ No puedo hacer login:
1. Verificar email/password en `.admin-credentials.md`
2. Revisar consola del navegador (F12)
3. Verificar en Supabase que usuario existe
4. Usar "¿Olvidaste tu contraseña?" si es necesario

### ❌ No veo el badge de admin:
1. Verificar en Supabase: `SELECT is_admin FROM profiles WHERE username = 'yeriksonvarela'`
2. Debe ser `true`
3. Hacer logout y volver a login
4. Limpiar caché del navegador

### ❌ Error en base de datos:
1. Supabase Dashboard → Logs → API Logs
2. Revisar errores recientes
3. Verificar políticas RLS activas
4. Consultar `SUPABASE-SETUP-INSTRUCTIONS.md`

---

## 📚 DOCUMENTACIÓN COMPLETA

1. **`.admin-credentials.md`** ← **START HERE** (credenciales)
2. `QUICK-REFERENCE-SUPABASE.md` (referencia rápida)
3. `docs/ADMIN-ACCOUNT-INFO.md` (info admin detallada)
4. `SUPABASE-SETUP-INSTRUCTIONS.md` (setup completo)
5. `docs/IMPLEMENTACION-SUPABASE-AUTH-COMPLETA.md` (docs técnicas)

---

## 🎯 CHECKLIST INICIAL

- [ ] Login en https://yavlpro.github.io/YavlGold/
- [ ] Verificar badge 🛡️ ADMIN en navbar
- [ ] Abrir Supabase Dashboard
- [ ] Ejecutar consulta SQL de prueba
- [ ] Ver tu perfil en Table Editor
- [ ] Revisar logs de autenticación
- [ ] Leer `.admin-credentials.md` completo
- [ ] Crear usuario de prueba (opcional)
- [ ] Crear anuncio de prueba (opcional)

---

## ✨ PRÓXIMOS DESARROLLOS

### Futuras funcionalidades admin:
- Dashboard admin dedicado (`/dashboard/admin/`)
- Panel de analytics con gráficos
- Gestión visual de usuarios
- Moderación de contenido
- Sistema de notificaciones
- Logs de auditoría
- Reportes automatizados

---

## 📞 CONTACTO

**Admin Principal:** Yerikson Varela  
**Email:** yeriksonvarela@gmail.com  
**GitHub:** YavlPro/YavlGold  
**Supabase Project:** gerzlzprkarikblqxpjt  

---

**Estado del sistema:** ✅ **FUNCIONAL Y LISTO PARA PRODUCCIÓN**

**Commits importantes:**
- `295aebf` - Integración Supabase Auth
- `8110964` - Setup perfiles automáticos
- `98369b7` - Herramienta de verificación
- `c2e85d3` - Documentación completa
- `818c4bd` - Quick Reference
- `dc3857e` - Badge de Admin

---

**¡Bienvenido al sistema, Admin!** 🎉
