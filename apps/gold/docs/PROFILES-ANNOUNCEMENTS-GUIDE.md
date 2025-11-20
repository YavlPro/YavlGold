# Guía de Perfiles y Anuncios - YavlGold

> **Fecha**: 14 de Octubre de 2025  
> **Versión**: 1.0  
> **Sistema**: Profiles & Announcements Integration

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura de Base de Datos](#arquitectura-de-base-de-datos)
3. [ProfileManager API](#profilemanager-api)
4. [AnnouncementsManager API](#announcementsmanager-api)
5. [Integración con AuthGuard](#integración-con-authguard)
6. [Políticas RLS de Supabase](#políticas-rls-de-supabase)
7. [Ejemplos de Uso](#ejemplos-de-uso)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Introducción

El sistema de perfiles y anuncios extiende la funcionalidad básica de autenticación con:

- **Perfiles extendidos** (`profiles`): Información adicional de usuarios (username, bio, avatar, roles)
- **Sistema de anuncios** (`announcements`): Comunicación oficial con usuarios registrados
- **Control de permisos**: Roles basados en base de datos (`is_admin`)
- **Gestión centralizada**: APIs unificadas para operaciones CRUD

### Beneficios Clave

✅ **Escalabilidad**: Datos separados de auth, fácil extensión  
✅ **Seguridad**: Roles en BD, no hardcodeados  
✅ **UX mejorada**: Perfiles personalizables, feed de noticias  
✅ **Admin friendly**: Panel de gestión integrado en dashboard

---

## 🗄️ Arquitectura de Base de Datos

### Tabla: `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin);
```

**Campos**:
- `id`: UUID vinculado a `auth.users.id` (CASCADE delete)
- `username`: Nombre de usuario único (3-50 chars, lowercase, números, guiones bajos)
- `email`: Correo (duplicado de auth por conveniencia)
- `avatar_url`: URL de imagen de perfil
- `bio`: Biografía (máx 500 caracteres)
- `is_admin`: Rol de administrador (BOOLEAN)
- `created_at`: Fecha de creación
- `updated_at`: Última modificación

### Tabla: `announcements`

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_announcements_author_id ON announcements(author_id);

-- Foreign key con profiles
ALTER TABLE announcements 
ADD CONSTRAINT announcements_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
```

**Campos**:
- `id`: UUID autogenerado
- `title`: Título del anuncio (máx 200 caracteres)
- `content`: Contenido completo (máx 5000 caracteres)
- `author_id`: UUID del autor (vinculado a `auth.users.id`)
- `created_at`: Fecha de publicación
- `updated_at`: Última edición

### Relaciones

```
auth.users (Supabase Auth)
    ↓
    1:1 → profiles (Perfil extendido)
    1:N → announcements (Anuncios creados)
```

---

## 👤 ProfileManager API

**Ubicación**: `/assets/js/profile/profileManager.js`

### Inicialización

```javascript
ProfileManager.init();
// Se auto-inicializa 100ms después del DOM load
```

### Métodos Principales

#### `getProfile(userId)`

Obtener perfil de un usuario específico.

```javascript
const result = await ProfileManager.getProfile('uuid-del-usuario');
if (result.success) {
  console.log(result.profile);
  // { id, username, email, avatar_url, bio, is_admin, created_at, updated_at }
}
```

#### `getCurrentProfile()`

Obtener perfil del usuario logueado.

```javascript
const result = await ProfileManager.getCurrentProfile();
if (result.success) {
  console.log('Username:', result.profile.username);
  console.log('Bio:', result.profile.bio);
}
```

#### `updateProfile(userId, updates)`

Actualizar campos del perfil.

```javascript
const result = await ProfileManager.updateProfile(userId, {
  username: 'nuevo_username',
  bio: 'Mi nueva biografía'
});

if (result.success) {
  console.log('Perfil actualizado:', result.profile);
} else {
  console.error('Error:', result.error);
}
```

**Validaciones**:
- `username`: 3-50 caracteres, solo lowercase/números/guiones bajos, único
- `bio`: máximo 500 caracteres
- `avatar_url`: URL válida

#### `updateAvatar(userId, avatarUrl)`

Cambiar imagen de perfil.

```javascript
const result = await ProfileManager.updateAvatar(
  userId, 
  'https://example.com/avatar.jpg'
);
```

#### `isAdmin(userId)`

Verificar si un usuario es administrador.

```javascript
const result = await ProfileManager.isAdmin(userId);
if (result.isAdmin) {
  console.log('Usuario es administrador');
}
```

#### `searchProfiles(searchTerm)`

Buscar perfiles por username.

```javascript
const result = await ProfileManager.searchProfiles('juan');
if (result.success) {
  result.profiles.forEach(profile => {
    console.log(profile.username, profile.email);
  });
}
```

---

## 📢 AnnouncementsManager API

**Ubicación**: `/assets/js/announcements/announcementsManager.js`

### Inicialización

```javascript
AnnouncementsManager.init();
// Auto-inicializa con caché de 5 minutos
```

### Métodos Principales

#### `getAnnouncements(options)`

Obtener lista de anuncios (con caché).

```javascript
const result = await AnnouncementsManager.getAnnouncements({
  limit: 10,
  offset: 0,
  forceRefresh: false
});

if (result.success) {
  result.announcements.forEach(announcement => {
    console.log(announcement.title);
    console.log('Autor:', announcement.author.username);
  });
  console.log('Desde caché:', result.fromCache);
}
```

**Opciones**:
- `limit`: Número de anuncios a obtener (default: 10)
- `offset`: Punto de inicio para paginación
- `forceRefresh`: Ignorar caché y consultar BD

#### `getAnnouncement(id)`

Obtener anuncio específico.

```javascript
const result = await AnnouncementsManager.getAnnouncement('uuid-del-anuncio');
if (result.success) {
  console.log(result.announcement.title);
  console.log(result.announcement.content);
}
```

#### `createAnnouncement(title, content)`

Crear nuevo anuncio (solo admins).

```javascript
const result = await AnnouncementsManager.createAnnouncement(
  'Nueva Actualización',
  'Contenido del anuncio...'
);

if (result.success) {
  console.log('Anuncio creado:', result.announcement.id);
} else {
  console.error('Error:', result.error);
  // Posibles errores:
  // - 'No hay sesión activa'
  // - 'No tienes permisos para crear anuncios'
  // - 'El título es obligatorio'
  // - 'El contenido no puede tener más de 5000 caracteres'
}
```

**Validaciones**:
- Usuario debe ser admin (`is_admin = true`)
- Título: 1-200 caracteres
- Contenido: 1-5000 caracteres

#### `updateAnnouncement(id, updates)`

Editar anuncio existente (solo autor o admin).

```javascript
const result = await AnnouncementsManager.updateAnnouncement(
  'uuid-del-anuncio',
  {
    title: 'Título actualizado',
    content: 'Nuevo contenido'
  }
);
```

**Permisos**:
- Autor original del anuncio
- Cualquier usuario con `is_admin = true`

#### `deleteAnnouncement(id)`

Eliminar anuncio (solo autor o admin).

```javascript
const result = await AnnouncementsManager.deleteAnnouncement('uuid-del-anuncio');
if (result.success) {
  console.log('Anuncio eliminado');
}
```

#### `searchAnnouncements(searchTerm)`

Buscar anuncios por título o contenido.

```javascript
const result = await AnnouncementsManager.searchAnnouncements('actualización');
if (result.success) {
  console.log(`${result.announcements.length} resultados encontrados`);
}
```

#### `clearCache()`

Limpiar caché de anuncios manualmente.

```javascript
AnnouncementsManager.clearCache();
// Próxima llamada a getAnnouncements consultará BD
```

---

## 🔐 Integración con AuthGuard

**Ubicación**: `/assets/js/auth/authGuard.js`

### Cambios Implementados

AuthGuard ahora consulta roles desde tabla `profiles` en lugar de usar roles hardcodeados.

#### `hasRole(requiredRole)` - Actualizado

```javascript
// Antes: consultaba session.user.role (hardcoded)
// Ahora: consulta is_admin desde tabla profiles

const hasPermission = await AuthGuard.hasRole('admin');
if (hasPermission) {
  // Usuario tiene permisos de admin
}
```

#### `protectByRole()` - Actualizado

```javascript
// Oculta/muestra elementos según rol real en BD
await AuthGuard.protectByRole();

// HTML:
<div data-role="admin">Solo visible para admins</div>
```

### Ejemplo de Protección

```html
<!-- Botón solo visible para admins -->
<button 
  id="create-announcement-btn" 
  data-role="admin" 
  style="display: none;">
  Crear Anuncio
</button>

<script>
// Al cargar página
await AuthGuard.protectByRole();
// Si user.is_admin = true, el botón se muestra automáticamente
</script>
```

---

## 🛡️ Políticas RLS de Supabase

**RLS** (Row Level Security) protege tus datos a nivel de base de datos.

### Políticas para `profiles`

#### 1. Lectura pública (Read)

```sql
-- Cualquier usuario autenticado puede leer perfiles
CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);
```

#### 2. Actualización restringida (Update)

```sql
-- Solo el dueño del perfil puede actualizarlo
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

#### 3. Solo admins pueden cambiar is_admin

```sql
-- Proteger campo is_admin
CREATE POLICY "Only admins can change admin status"
ON profiles FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
```

### Políticas para `announcements`

#### 1. Lectura pública

```sql
CREATE POLICY "Announcements are viewable by authenticated users"
ON announcements FOR SELECT
TO authenticated
USING (true);
```

#### 2. Creación solo admins

```sql
CREATE POLICY "Only admins can create announcements"
ON announcements FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
```

#### 3. Edición autor o admin

```sql
CREATE POLICY "Authors and admins can update announcements"
ON announcements FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid() OR 
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  author_id = auth.uid() OR 
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
```

#### 4. Eliminación autor o admin

```sql
CREATE POLICY "Authors and admins can delete announcements"
ON announcements FOR DELETE
TO authenticated
USING (
  author_id = auth.uid() OR 
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
```

### Aplicar RLS

```sql
-- Habilitar RLS en tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Página de Perfil Completa

```javascript
// /profile/index.html
document.addEventListener('DOMContentLoaded', async () => {
  // Obtener perfil actual
  const result = await ProfileManager.getCurrentProfile();
  
  if (result.success) {
    const profile = result.profile;
    
    // Rellenar formulario
    document.getElementById('username').value = profile.username;
    document.getElementById('bio').value = profile.bio;
    document.getElementById('avatar').src = profile.avatar_url;
    
    // Mostrar badge de admin
    if (profile.is_admin) {
      document.getElementById('admin-badge').style.display = 'block';
    }
  }
});

// Guardar cambios
async function saveProfile(event) {
  event.preventDefault();
  
  const session = AuthClient.getSession();
  const result = await ProfileManager.updateProfile(session.user.id, {
    username: document.getElementById('username').value,
    bio: document.getElementById('bio').value
  });
  
  if (result.success) {
    alert('Perfil actualizado exitosamente');
  } else {
    alert('Error: ' + result.error);
  }
}
```

### Ejemplo 2: Feed de Anuncios en Dashboard

```javascript
// /dashboard/index.html
async function loadAnnouncements() {
  const container = document.getElementById('announcements-container');
  
  const result = await AnnouncementsManager.getAnnouncements({
    limit: 5,
    offset: 0
  });
  
  if (result.success) {
    const html = result.announcements.map(ann => `
      <div class="announcement-card">
        <h4>${ann.title}</h4>
        <p>${ann.content}</p>
        <small>Por ${ann.author.username} - ${new Date(ann.created_at).toLocaleDateString()}</small>
      </div>
    `).join('');
    
    container.innerHTML = html;
  }
}

// Cargar al inicio
document.addEventListener('DOMContentLoaded', loadAnnouncements);
```

### Ejemplo 3: Panel Admin para Anuncios

```javascript
// Solo visible si user.is_admin = true
async function createAnnouncement() {
  const title = prompt('Título:');
  const content = prompt('Contenido:');
  
  const result = await AnnouncementsManager.createAnnouncement(title, content);
  
  if (result.success) {
    alert('Anuncio creado');
    loadAnnouncements(); // Recargar lista
  } else {
    alert('Error: ' + result.error);
  }
}

// Verificar si es admin
async function checkAdmin() {
  const session = AuthClient.getSession();
  const result = await ProfileManager.isAdmin(session.user.id);
  
  if (result.isAdmin) {
    document.getElementById('admin-panel').style.display = 'block';
  }
}
```

### Ejemplo 4: Búsqueda de Usuarios

```javascript
async function searchUsers(query) {
  const result = await ProfileManager.searchProfiles(query);
  
  if (result.success) {
    const users = result.profiles.map(p => ({
      username: p.username,
      avatar: p.avatar_url,
      isAdmin: p.is_admin
    }));
    
    displayUsers(users);
  }
}
```

---

## 🔧 Troubleshooting

### Error: "No se pudo crear perfil extendido"

**Causa**: Usuario registrado pero perfil no creado en tabla `profiles`.

**Solución**:
```javascript
// Crear perfil manualmente
const session = AuthClient.getSession();
await supabase.from('profiles').insert({
  id: session.user.id,
  username: session.user.name.toLowerCase().replace(/\s+/g, '_'),
  email: session.user.email,
  avatar_url: session.user.avatar,
  bio: '',
  is_admin: false
});
```

### Error: "No tienes permisos para crear anuncios"

**Causa**: Usuario no tiene `is_admin = true` en tabla `profiles`.

**Solución (como admin en Supabase Dashboard)**:
```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'tu-email@ejemplo.com';
```

### Error: "Este username ya está en uso"

**Causa**: Username duplicado en tabla `profiles`.

**Solución**: Elegir otro username o consultar username disponible:
```javascript
const result = await supabase
  .from('profiles')
  .select('username')
  .eq('username', 'username_deseado')
  .single();

if (!result.data) {
  console.log('Username disponible');
}
```

### Anuncios no se cargan

**Checklist**:
1. Verificar que usuario está autenticado
2. Revisar políticas RLS en Supabase Dashboard
3. Limpiar caché: `AnnouncementsManager.clearCache()`
4. Verificar en consola: `console.log(await AnnouncementsManager.getAnnouncements())`

### Perfil no se actualiza

**Checklist**:
1. Verificar validaciones (username formato correcto)
2. Confirmar que `userId` es correcto
3. Revisar política RLS: usuario debe ser dueño del perfil
4. Verificar en consola errores de Supabase

---

## 📚 Recursos Adicionales

- **Supabase Docs**: https://supabase.com/docs
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Código fuente**:
  - ProfileManager: `/assets/js/profile/profileManager.js`
  - AnnouncementsManager: `/assets/js/announcements/announcementsManager.js`
  - AuthGuard (actualizado): `/assets/js/auth/authGuard.js`
  - Página de perfil: `/profile/index.html`

---

**Última actualización**: 14 de Octubre de 2025  
**Mantenido por**: YAVL Pro - YavlGold Team
