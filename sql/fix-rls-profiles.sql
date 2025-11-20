-- =============================================
-- FIX RLS POLICIES PARA PROFILES
-- Problema: "new row violates row-level security policy"
-- =============================================

-- PASO 1: Eliminar políticas existentes que puedan causar conflicto
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- PASO 2: Crear políticas correctas
-- Importante: auth.uid() retorna el ID del usuario autenticado

-- Permitir INSERT para el propio usuario (durante registro)
CREATE POLICY "Users can insert own profile during signup"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Permitir SELECT de cualquier perfil (público)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- Permitir UPDATE solo del propio perfil
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Permitir DELETE solo del propio perfil (opcional, por si acaso)
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);

-- PASO 3: Verificar que RLS esté habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- VERIFICACIÓN
-- =============================================

-- Ver todas las políticas de la tabla profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- =============================================
-- EXPLICACIÓN
-- =============================================

/*
PROBLEMA DETECTADO:
- Usuario registrado exitosamente en auth.users ✅
- Trigger ensure_profile_exists() NO se ejecutó ❌
- Intento manual de INSERT bloqueado por RLS ❌

CAUSA:
Las políticas RLS existentes probablemente:
1. No permiten INSERT durante el registro
2. Tienen condiciones muy restrictivas
3. No usan auth.uid() correctamente

SOLUCIÓN:
1. Política "Users can insert own profile during signup"
   → Permite INSERT si auth.uid() = id
   → Se ejecuta DESPUÉS del signUp (usuario ya autenticado)

2. Política "Profiles are viewable by everyone"
   → Permite SELECT sin restricciones
   → Perfiles públicos visibles para todos

3. Política "Users can update own profile"
   → Solo el dueño puede editar su perfil
   → Usa USING y WITH CHECK para doble validación

4. Política "Users can delete own profile"
   → Solo el dueño puede eliminar su perfil (opcional)

IMPORTANTE:
- auth.uid() retorna NULL si usuario no autenticado
- Durante signUp, Supabase autentica automáticamente al usuario
- Por eso auth.uid() = id funciona durante el registro

ALTERNATIVA SI EL TRIGGER NO FUNCIONA:
El código frontend tiene fallback manual que ahora funcionará
porque las políticas RLS lo permiten.
*/

-- =============================================
-- TESTING
-- =============================================

-- Después de ejecutar este SQL, prueba:
-- 1. Registrar nuevo usuario desde test-registro-rapido.html
-- 2. Verificar que el perfil se cree automáticamente
-- 3. Si el trigger falla, el fallback manual debería funcionar

-- =============================================
