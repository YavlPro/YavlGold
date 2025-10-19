# 🔧 FIX URGENTE - RLS Policies para Profiles

**Fecha**: 19 de Octubre 2025  
**Problema**: `new row violates row-level security policy for table "profiles"`  
**Severidad**: 🔴 CRÍTICO  
**Estado**: ⏳ PENDIENTE DE APLICAR  

---

## 🐛 PROBLEMA DETECTADO

### Test Realizado:
```
Usuario: GlobalGold
Email: yeriksonpro301@gmail.com
```

### Resultado:
```
✅ Usuario creado en auth.users
🆔 User ID: adeda623-eb57-4667-829b-7db4c78c922c
⏳ Esperando trigger ensure_profile_exists()...
⚠️ Perfil no encontrado por trigger
🔧 Creando perfil manualmente...
❌ ERROR: new row violates row-level security policy for table "profiles"
```

### Análisis:
1. ✅ **Usuario creado exitosamente** en `auth.users`
2. ❌ **Trigger NO se ejecutó** (perfil no creado automáticamente)
3. ❌ **Fallback manual bloqueado** por políticas RLS

---

## 🔍 CAUSA RAÍZ

Las políticas RLS (Row Level Security) en la tabla `profiles` están:

1. **Bloqueando INSERT** durante el registro
2. **Condiciones muy restrictivas** que no permiten auto-creación
3. **No usan `auth.uid()` correctamente** para usuarios recién registrados

---

## ✅ SOLUCIÓN

### Paso 1: Ejecutar SQL en Supabase

Ve a: **Supabase Dashboard** → **SQL Editor** → **New Query**

Pega y ejecuta el contenido de: `/sql/fix-rls-profiles.sql`

O copia este SQL:

```sql
-- Eliminar políticas conflictivas
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- Crear políticas correctas
CREATE POLICY "Users can insert own profile during signup"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);

-- Asegurar que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### Paso 2: Verificar Políticas

Ejecuta esta query para ver las políticas:

```sql
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';
```

**Resultado esperado:**
```
policyname                              | cmd    | qual              | with_check
----------------------------------------|--------|-------------------|------------------
Users can insert own profile during...  | INSERT | NULL              | (auth.uid() = id)
Profiles are viewable by everyone       | SELECT | true              | NULL
Users can update own profile            | UPDATE | (auth.uid() = id) | (auth.uid() = id)
Users can delete own profile            | DELETE | (auth.uid() = id) | NULL
```

---

## 🧪 TESTING

### Opción 1: Página de Test
1. Ve a: https://yavlpro.github.io/YavlGold/test-registro-rapido.html
2. Click en "Auto-rellenar"
3. Click en "Crear Cuenta"

**Resultado esperado:**
```
✅ Usuario creado en auth.users
✅ Perfil creado en public.profiles (por trigger o fallback)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ REGISTRO EXITOSO
```

### Opción 2: SQL Manual
```sql
-- Simular registro (como usuario autenticado)
INSERT INTO public.profiles (
  id,
  email,
  username,
  created_at,
  updated_at
) VALUES (
  'adeda623-eb57-4667-829b-7db4c78c922c', -- ID del usuario de prueba
  'yeriksonpro301@gmail.com',
  'globalgold',
  NOW(),
  NOW()
);
```

Si esto funciona, las políticas RLS están correctas.

---

## 📊 POLÍTICAS RLS EXPLICADAS

### 1. INSERT Policy
```sql
CREATE POLICY "Users can insert own profile during signup"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
```

**Qué hace:**
- Permite INSERT solo si `auth.uid()` (usuario autenticado) = `id` (ID del perfil)
- Durante `signUp()`, Supabase autentica automáticamente al usuario
- Por eso `auth.uid()` retorna el ID correcto durante el registro

### 2. SELECT Policy
```sql
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);
```

**Qué hace:**
- Perfiles públicos visibles para todos (incluso anónimos)
- Necesario para mostrar perfiles en la app
- `USING (true)` = sin restricciones

### 3. UPDATE Policy
```sql
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

**Qué hace:**
- Solo el dueño puede editar su perfil
- `USING` = condición para seleccionar filas a actualizar
- `WITH CHECK` = validación después del UPDATE

### 4. DELETE Policy (opcional)
```sql
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);
```

**Qué hace:**
- Solo el dueño puede eliminar su perfil
- Opcional pero recomendado para consistencia

---

## 🔐 SEGURIDAD

### ✅ Qué PERMITE:
- Usuario puede crear SU PROPIO perfil durante registro
- Usuario puede ver TODOS los perfiles (público)
- Usuario puede editar SOLO SU perfil
- Usuario puede eliminar SOLO SU perfil

### ❌ Qué BLOQUEA:
- Usuario A no puede crear perfil para Usuario B
- Usuario A no puede editar perfil de Usuario B
- Usuario A no puede eliminar perfil de Usuario B
- Usuarios anónimos no pueden crear/editar/eliminar

---

## 🚨 TRIGGER: ensure_profile_exists()

### ¿Por qué no se ejecutó?

Posibles causas:

1. **Trigger no existe**
   ```sql
   -- Verificar
   SELECT * FROM pg_trigger 
   WHERE tgname = 'create_profile_after_user_insert';
   ```

2. **Función no existe**
   ```sql
   -- Verificar
   SELECT * FROM pg_proc 
   WHERE proname = 'ensure_profile_exists';
   ```

3. **Trigger deshabilitado**
   ```sql
   -- Verificar estado
   SELECT tgenabled FROM pg_trigger 
   WHERE tgname = 'create_profile_after_user_insert';
   ```

### Solución: Recrear Trigger

Si el trigger no existe, ejecuta:

```sql
-- Función del trigger
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER create_profile_after_user_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_exists();
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de aplicar el fix:

- [ ] SQL ejecutado en Supabase SQL Editor
- [ ] Verificar políticas con query de verificación
- [ ] Probar registro desde test-registro-rapido.html
- [ ] Ver usuario creado en Authentication → Users
- [ ] Ver perfil creado en Table Editor → profiles
- [ ] Verificar que trigger funciona (o fallback manual)
- [ ] Eliminar usuario de prueba (yeriksonpro301@gmail.com)
- [ ] Probar con nuevo usuario

---

## 📝 USUARIO DE PRUEBA ACTUAL

**IMPORTANTE:** Eliminar este usuario de Supabase después del fix:

```
Email: yeriksonpro301@gmail.com
User ID: adeda623-eb57-4667-829b-7db4c78c922c
Estado: Usuario creado, perfil NO creado
```

**Cómo eliminar:**

1. **Supabase Dashboard** → **Authentication** → **Users**
2. Buscar: `yeriksonpro301@gmail.com`
3. Click en los 3 puntos → **Delete user**
4. Confirmar eliminación

O por SQL:
```sql
-- Eliminar de auth.users (cascade eliminará de profiles si existe)
DELETE FROM auth.users 
WHERE email = 'yeriksonpro301@gmail.com';
```

---

## 🎯 PRÓXIMOS PASOS

1. **URGENTE:** Aplicar fix de RLS policies
2. Verificar que trigger existe y funciona
3. Probar registro completo nuevamente
4. Limpiar usuarios de prueba
5. Documentar políticas RLS en SECURITY.md
6. Continuar con Fase 2 (Font Awesome optimization)

---

**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 5-10 minutos  
**Requiere:** Acceso a Supabase SQL Editor  

---

**Preparado por:** GitHub Copilot  
**Para:** YavlGold Dev Team  
**Última actualización:** 19 de Octubre 2025, 19:55 UTC
