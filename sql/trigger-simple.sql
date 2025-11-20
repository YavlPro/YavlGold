-- =============================================
-- RECREAR TRIGGER: ensure_profile_exists
-- COPIA DESDE AQUÍ HASTA EL FINAL
-- =============================================

-- Paso 1: Eliminar trigger y función si existen
DROP TRIGGER IF EXISTS create_profile_after_user_insert ON auth.users;
DROP FUNCTION IF EXISTS public.ensure_profile_exists() CASCADE;

-- Paso 2: Crear función del trigger
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
BEGIN
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '_'))
  );
  
  INSERT INTO public.profiles (
    id,
    email,
    username,
    avatar_url,
    bio,
    is_admin,
    xp_points,
    current_level,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    generated_username,
    'https://ui-avatars.com/api/?name=' || COALESCE(NEW.raw_user_meta_data->>'name', 'User') || '&background=D4AF37&color=0B0C0F&bold=true',
    NULL,
    FALSE,
    0,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 3: Crear trigger
CREATE TRIGGER create_profile_after_user_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_exists();

-- Paso 4: Verificar que se creó
SELECT 
    tgname as trigger_name,
    tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'create_profile_after_user_insert';

-- Debe retornar: create_profile_after_user_insert | O
-- O = enabled (trigger activo)
