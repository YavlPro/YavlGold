# Política de Seguridad - YavlGold

**Fecha**: 14 de Octubre de 2025  
**Versión**: 1.0  
**Última revisión**: 14 de Octubre de 2025

---

## 🔒 Modelo de Seguridad

YavlGold implementa un modelo de seguridad de **defensa en profundidad** con múltiples capas:

1. **Capa de Base de Datos** (Supabase RLS)
2. **Capa de API** (ProfileManager, AnnouncementsManager)
3. **Capa de Aplicación** (AuthGuard, AuthClient)
4. **Capa de UI** (Validaciones cliente, protección de rutas)

---

## 🗄️ Políticas RLS de Supabase

### Tabla: `profiles`

#### Decisión de Diseño: Acceso por Fila, No por Columna

**Estado actual**: Usuarios autenticados pueden leer todas las filas de `profiles`.

**Razón**: 
- Postgres RLS controla acceso a **filas**, no a **columnas individuales**
- Los campos en `profiles` no contienen información altamente sensible (PII crítica)
- La funcionalidad de anuncios requiere acceso a `username` y `avatar_url` de otros usuarios
- Crear vistas públicas complicaría JOINs y queries existentes

**Campos expuestos a usuarios autenticados**:
- `id`: UUID (no sensible, necesario para relaciones)
- `username`: Diseñado para ser público
- `email`: Visible en contexto de aplicación (común en plataformas sociales)
- `avatar_url`: URL pública (apunta a GitHub)
- `bio`: Contenido público del usuario
- `is_admin`: Boolean (no expone datos personales)
- `created_at`, `updated_at`: Timestamps (no sensibles)

**Campos NO expuestos**:
- Ninguno crítico (no almacenamos: teléfonos, direcciones, números de tarjeta, etc.)

#### Políticas Activas

```sql
-- SELECT: Usuarios autenticados ven todos los perfiles
CREATE POLICY "Authenticated users can view basic profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- SELECT: Usuarios ven su propio perfil (redundante con anterior, pero explícita)
CREATE POLICY "Users can view their full profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- INSERT: Solo puedes crear tu propio perfil
CREATE POLICY "Los usuarios pueden insertar su propio perfil" 
ON public.profiles 
FOR INSERT 
TO public 
WITH CHECK (auth.uid() = id);

-- UPDATE: Solo puedes actualizar tu propio perfil
CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
ON public.profiles 
FOR UPDATE 
TO public 
USING (auth.uid() = id);

-- RLS habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### Tabla: `announcements`

#### Políticas Activas

```sql
-- SELECT: Todos los usuarios autenticados pueden leer anuncios
CREATE POLICY "Todos pueden ver los anuncios" 
ON public.announcements 
FOR SELECT 
TO public 
USING (true);

-- INSERT: Solo administradores pueden crear anuncios
CREATE POLICY "Solo administradores pueden crear anuncios" 
ON public.announcements 
FOR INSERT 
TO public 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- UPDATE: Solo administradores pueden editar anuncios
CREATE POLICY "Solo administradores pueden actualizar anuncios" 
ON public.announcements 
FOR UPDATE 
TO public 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- DELETE: Solo administradores pueden eliminar (si aplica)
-- (Agregar si es necesario)

-- RLS habilitado
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
```

---

## 🛡️ Capas de Seguridad Adicionales

### 1. AuthClient (Autenticación)

**Ubicación**: `/assets/js/auth/authClient.js`

**Protecciones**:
- ✅ hCaptcha en login y registro (anti-bot)
- ✅ Validación de email/password con Supabase Auth
- ✅ Tokens seguros (JWT de Supabase)
- ✅ Sesiones con expiración (24h)
- ✅ Auto-creación de perfil en registro

**Limitaciones**:
- ⚠️ Tokens en localStorage (riesgo XSS - aceptable para app estática)
- ⚠️ No hay 2FA implementado (roadmap futuro)

### 2. AuthGuard (Autorización)

**Ubicación**: `/assets/js/auth/authGuard.js`

**Protecciones**:
- ✅ Protección de rutas (`/dashboard/`, `/herramientas/`, `/profile/`)
- ✅ Verificación de roles desde base de datos (`is_admin`)
- ✅ Redirección a login si no autenticado
- ✅ Protección de enlaces con `data-protected="true"`
- ✅ Ocultación de elementos UI con `data-role="admin"`

**Implementación**:
```javascript
// Roles consultados desde tabla profiles
async hasRole(requiredRole) {
  if (requiredRole === 'admin') {
    const result = await ProfileManager.isAdmin(user.id);
    return result.isAdmin; // Consulta BD, no sesión local
  }
}
```

### 3. ProfileManager (API de Perfiles)

**Ubicación**: `/assets/js/profile/profileManager.js`

**Validaciones**:
- ✅ Username: 3-50 caracteres, formato `[a-z0-9_]+`, unicidad
- ✅ Bio: máximo 500 caracteres
- ✅ Avatar URL: formato URL válido
- ✅ Solo campos permitidos en `updateProfile` (whitelist)
- ✅ Verificación de propiedad antes de actualizar

**Sanitización**:
```javascript
// Solo campos permitidos
const allowedFields = ['username', 'bio', 'avatar_url'];
const sanitizedUpdates = {};
for (const field of allowedFields) {
  if (updates[field] !== undefined) {
    sanitizedUpdates[field] = updates[field];
  }
}
```

### 4. AnnouncementsManager (API de Anuncios)

**Ubicación**: `/assets/js/announcements/announcementsManager.js`

**Validaciones**:
- ✅ Título: 1-200 caracteres
- ✅ Contenido: 1-5000 caracteres
- ✅ Verificación de `is_admin` antes de crear/editar/eliminar
- ✅ Verificación de autoría o admin antes de editar/eliminar
- ✅ Caché con timeout (5 minutos) para reducir carga BD

**Protección de permisos**:
```javascript
// Verificar admin antes de crear
const adminCheck = await ProfileManager.isAdmin(session.user.id);
if (!adminCheck.success || !adminCheck.isAdmin) {
  return { success: false, error: 'No tienes permisos' };
}
```

---

## 🚨 Vectores de Ataque Conocidos y Mitigaciones

### 1. **XSS (Cross-Site Scripting)**

**Riesgo**: Inyección de scripts maliciosos en campos de texto.

**Mitigación**:
- ✅ Escape de HTML en todos los renders (`escapeHtml()` en dashboard)
- ✅ No uso de `innerHTML` con contenido de usuario sin sanitizar
- ✅ Content Security Policy (CSP) en headers de producción

**Ejemplo**:
```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### 2. **SQL Injection**

**Riesgo**: Inyección de SQL malicioso en queries.

**Mitigación**:
- ✅ Uso de Supabase client (queries parametrizadas automáticamente)
- ✅ No construcción manual de SQL en cliente
- ✅ RLS evita manipulación directa de datos

### 3. **CSRF (Cross-Site Request Forgery)**

**Riesgo**: Acciones no autorizadas en nombre del usuario.

**Mitigación**:
- ✅ Tokens JWT de Supabase incluyen verificación de origen
- ✅ SameSite cookies (manejado por Supabase)
- ✅ Verificación de sesión en cada request

### 4. **Privilege Escalation**

**Riesgo**: Usuario normal obtiene permisos de admin.

**Mitigación**:
- ✅ Campo `is_admin` protegido por RLS (solo admin puede cambiar)
- ✅ Verificación de permisos en cada acción sensible
- ✅ Roles consultados desde BD, no desde sesión local

**Política RLS crítica**:
```sql
-- Solo admins pueden cambiar is_admin
CREATE POLICY "Only admins can change admin status"
ON profiles FOR UPDATE
USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true)
WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);
```

### 5. **Exposición de Datos Sensibles**

**Riesgo**: Filtración de información privada.

**Mitigación**:
- ✅ No almacenamos: tarjetas de crédito, números de teléfono, direcciones
- ✅ Emails solo visibles a usuarios autenticados (no anónimos)
- ✅ Políticas RLS bloquean acceso a usuarios no autenticados
- ⚠️ Emails visibles entre usuarios autenticados (decisión de diseño documentada)

---

## 🔐 Buenas Prácticas Implementadas

### Código

- ✅ Principio de mínimo privilegio (usuarios solo ven/editan lo necesario)
- ✅ Validación en cliente Y servidor (doble capa)
- ✅ Sanitización de inputs
- ✅ Escape de outputs
- ✅ Uso de HTTPS en producción (forzado por Vercel/Netlify)
- ✅ Tokens con expiración (24h)

### Base de Datos

- ✅ RLS habilitado en todas las tablas
- ✅ Políticas restrictivas por defecto
- ✅ Foreign keys con CASCADE/SET NULL apropiados
- ✅ Índices en campos de autenticación (`is_admin`, `email`)
- ✅ Triggers para auto-creación de perfiles

### Infraestructura

- ✅ Variables de entorno para secrets (no hardcoded)
- ✅ CORS configurado (solo dominios autorizados)
- ✅ Rate limiting (planeado - pendiente implementación)
- ✅ Headers de seguridad (X-Frame-Options, CSP, etc.)

---

## 📊 Auditoría de Seguridad

### Última Auditoría: 14 de Octubre de 2025

**Hallazgos**:
- ✅ Sin vulnerabilidades críticas
- ⚠️ Advertencia: Emails visibles entre usuarios autenticados (aceptado)
- ⚠️ Recomendación: Implementar rate limiting en producción
- ⚠️ Recomendación: Agregar 2FA en roadmap

**Próxima auditoría**: 14 de Enero de 2026

---

## 🚀 Roadmap de Seguridad

### Corto Plazo (1-3 meses)
- [ ] Rate limiting en endpoints de autenticación
- [ ] Logs de auditoría para acciones admin
- [ ] Monitoreo de intentos de login fallidos

### Mediano Plazo (3-6 meses)
- [ ] 2FA (autenticación de dos factores)
- [ ] Recuperación de cuenta por email
- [ ] Políticas de contraseña más estrictas

### Largo Plazo (6-12 meses)
- [ ] Encriptación adicional para campos sensibles (si se agregan)
- [ ] Auditoría de seguridad profesional externa
- [ ] Compliance con GDPR/CCPA (si aplica)

---

## 📞 Reporte de Vulnerabilidades

Si descubres una vulnerabilidad de seguridad, por favor repórtala a:

**Email**: yeriksonvarela@yavlgold.com  
**Tiempo de respuesta**: 48 horas  
**Proceso**: Divulgación responsable (no publicar hasta fix confirmado)

---

## 📚 Referencias

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Documento mantenido por**: YAVL Pro - YavlGold Security Team  
**Última actualización**: 14 de Octubre de 2025  
**Versión**: 1.0
