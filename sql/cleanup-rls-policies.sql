-- =============================================
-- LIMPIEZA COMPLETA DE POLÍTICAS RLS DUPLICADAS
-- Total actual: 10 políticas (muchas duplicadas)
-- Objetivo: 4 políticas limpias
-- =============================================

-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- (Incluye duplicados y políticas antiguas)

DROP POLICY IF EXISTS "profiles_owner_full" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_select_basic" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their full profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;

-- También eliminar cualquier otra política que pueda existir
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- PASO 2: CREAR SOLO LAS 4 POLÍTICAS NECESARIAS (EN INGLÉS)

-- 1. INSERT: Usuario puede crear SU PROPIO perfil durante registro
CREATE POLICY "users_insert_own_profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2. SELECT: Perfiles públicos (cualquiera puede ver)
CREATE POLICY "profiles_public_read"
ON public.profiles
FOR SELECT
TO public
USING (true);

-- 3. UPDATE: Solo el dueño puede editar su perfil
CREATE POLICY "users_update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. DELETE: Solo el dueño puede eliminar su perfil
CREATE POLICY "users_delete_own_profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- PASO 3: ASEGURAR QUE RLS ESTÁ HABILITADO
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- VERIFICACIÓN
-- =============================================

-- Ejecuta esto después para verificar que solo hay 4 políticas:
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd;

-- =============================================
-- RESULTADO ESPERADO: 4 POLÍTICAS
-- =============================================
/*
policyname                    | cmd    | roles           | qual            | with_check
------------------------------|--------|-----------------|-----------------|------------------
users_delete_own_profile      | DELETE | {authenticated} | auth.uid()=id   | NULL
users_insert_own_profile      | INSERT | {authenticated} | NULL            | auth.uid()=id
profiles_public_read          | SELECT | {public}        | true            | NULL
users_update_own_profile      | UPDATE | {authenticated} | auth.uid()=id   | auth.uid()=id
*/

-- =============================================
-- EXPLICACIÓN DE LOS CAMBIOS
-- =============================================
/*
PROBLEMAS ANTERIORES:
1. 10 políticas duplicadas (confusión)
2. Políticas en español e inglés mezcladas
3. Múltiples políticas SELECT (conflicto potencial)
4. Política "ALL" muy permisiva (profiles_owner_full)

SOLUCIÓN:
1. Eliminar TODAS las políticas antiguas
2. Crear solo 4 políticas limpias
3. Nombres descriptivos en snake_case
4. Especificar roles (authenticated/public)
5. Una política por operación (INSERT/SELECT/UPDATE/DELETE)

ROLES:
- authenticated: Solo usuarios autenticados
- public: Cualquiera (incluso anónimos)

BENEFICIOS:
✅ Código más limpio y mantenible
✅ No hay conflictos entre políticas
✅ Fácil de entender qué hace cada una
✅ Mejor performance (menos políticas a evaluar)
*/
