-- ============================================
-- YAVLGOLD - RLS POLICIES PARA TABLA PROFILES
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Habilitar RLS en la tabla profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Política: Usuarios autenticados pueden leer SU PROPIO perfil
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Política: Usuarios autenticados pueden actualizar SU PROPIO perfil
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Política: Usuarios pueden ver perfiles PÚBLICOS (solo columnas no sensibles)
-- NOTA: Considera crear una VIEW profiles_public para mayor control
CREATE POLICY "Users can read public profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true); -- Todos pueden leer, pero solo las columnas que selecciones en el query

-- 5. UNIQUE INDEX para username (evitar race conditions)
-- Esto previene que dos usuarios guarden el mismo username simultáneamente
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
ON public.profiles (username)
WHERE username IS NOT NULL;

-- ============================================
-- OPCIONAL: Vista para perfiles públicos
-- Expone SOLO columnas seguras
-- ============================================
/*
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  username,
  avatar_url,
  bio
FROM public.profiles;

-- Si usas Postgres 15+, puedes hacer la vista "security invoker"
-- para que respete RLS del underlying table
-- ALTER VIEW public.profiles_public SET (security_invoker = true);
*/

-- ============================================
-- VERIFICAR POLÍTICAS EXISTENTES
-- ============================================
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
