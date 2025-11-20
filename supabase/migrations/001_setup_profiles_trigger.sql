-- ============================================
-- CONFIGURACIÓN COMPLETA DE PERFILES
-- ============================================

-- 1. Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si ya existe, actualiza email; si no, crea perfil nuevo
  INSERT INTO public.profiles (id, email, username, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    now(), 
    now()
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    email = COALESCE(NEW.email, public.profiles.email), 
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- 2. Trigger que ejecuta la función al crear usuario
DROP TRIGGER IF EXISTS create_profile_after_user_insert ON auth.users;
CREATE TRIGGER create_profile_after_user_insert
AFTER INSERT ON auth.users
FOR EACH ROW 
EXECUTE FUNCTION public.ensure_profile_exists();

-- 3. Habilitar RLS en profiles (si no está habilitado)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- 5. Políticas RLS para profiles
-- Permitir SELECT propio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Permitir UPDATE propio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Permitir INSERT propio perfil (por si trigger falla)
CREATE POLICY "profiles_insert_self" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Permitir DELETE propio perfil (opcional)
CREATE POLICY "profiles_delete_own" ON public.profiles
FOR DELETE
TO authenticated
USING (id = auth.uid());

-- 6. Políticas públicas adicionales (opcional - para ver perfiles de otros usuarios)
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles
FOR SELECT
TO public
USING (true); -- Todos pueden ver todos los perfiles (ajusta según necesites)

-- 7. Habilitar RLS en announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 8. Políticas para announcements
DROP POLICY IF EXISTS "announcements_select_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert_auth" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update_author" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete_author" ON public.announcements;

-- Todos pueden leer anuncios
CREATE POLICY "announcements_select_all" ON public.announcements
FOR SELECT
TO public
USING (true);

-- Solo usuarios autenticados pueden crear anuncios
CREATE POLICY "announcements_insert_auth" ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

-- Solo el autor puede actualizar sus anuncios
CREATE POLICY "announcements_update_author" ON public.announcements
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Solo el autor puede eliminar sus anuncios
CREATE POLICY "announcements_delete_author" ON public.announcements
FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- 9. Índices para optimizar RLS
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON public.announcements(author_id);

-- ============================================
-- RESULTADO ESPERADO:
-- ✅ Cada nuevo usuario en auth.users crea automáticamente perfil en public.profiles
-- ✅ RLS habilitado: usuarios solo ven/editan su propio perfil
-- ✅ Perfiles públicos visibles para todos (ajustable)
-- ✅ Anuncios con control de autor
-- ============================================
