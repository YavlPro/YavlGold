-- =============================================
-- VERIFICAR Y RECREAR TRIGGER: ensure_profile_exists
-- Problema: Trigger no se ejecuta después de signUp
-- =============================================

-- PASO 1: VERIFICAR SI EL TRIGGER EXISTE
-- =============================================

SELECT 
    tgname as trigger_name,
    tgenabled as is_enabled,
    proname as function_name,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname = 'create_profile_after_user_insert'
   OR tgname LIKE '%profile%';

-- Si no ves el trigger, continúa con PASO 2


-- PASO 2: VERIFICAR SI LA FUNCIÓN EXISTE
-- =============================================

SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc
WHERE proname = 'ensure_profile_exists'
   OR proname LIKE '%profile%';

-- Si no ves la función, continúa con PASO 3


-- PASO 3: ELIMINAR TRIGGER Y FUNCIÓN SI EXISTEN (LIMPIEZA)
-- =============================================

DROP TRIGGER IF EXISTS create_profile_after_user_insert ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.ensure_profile_exists() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;


-- PASO 4: CREAR FUNCIÓN DEL TRIGGER (NUEVA VERSIÓN MEJORADA)
-- =============================================

CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
BEGIN
  -- Generar username desde metadata o email
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '_'))
  );
  
  -- Insertar perfil
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

-- Dar permisos a la función
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists() TO service_role;


-- PASO 5: CREAR TRIGGER
-- =============================================

CREATE TRIGGER create_profile_after_user_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_exists();


-- PASO 6: VERIFICAR QUE SE CREÓ CORRECTAMENTE
-- =============================================

-- Ver trigger
SELECT 
    tgname,
    tgenabled,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger 
WHERE tgname = 'create_profile_after_user_insert';

-- Ver función
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'ensure_profile_exists';


-- =============================================
-- TESTING DEL TRIGGER
-- =============================================

-- Opción 1: Crear usuario de prueba directamente
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test_trigger@example.com',
  crypt('test123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Trigger User","username":"test_trigger"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Verificar que se creó el perfil automáticamente
SELECT * FROM public.profiles 
WHERE email = 'test_trigger@example.com';

-- Limpiar usuario de prueba
DELETE FROM auth.users WHERE email = 'test_trigger@example.com';


-- =============================================
-- TROUBLESHOOTING
-- =============================================

-- Si el trigger sigue sin funcionar, verifica:

-- 1. Permisos de la tabla profiles
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2. RLS debe permitir INSERT desde trigger
-- El trigger usa SECURITY DEFINER, así que bypassa RLS
-- Pero por si acaso, verifica las políticas:
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 3. Verificar que el schema auth existe y tiene permisos
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth';

-- =============================================
-- ALTERNATIVA: FUNCIÓN EN auth schema
-- =============================================

-- Si el trigger en public no funciona, intenta en auth:
CREATE OR REPLACE FUNCTION auth.ensure_profile_exists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_profile_after_user_insert ON auth.users;

CREATE TRIGGER create_profile_after_user_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.ensure_profile_exists();

-- =============================================
-- RESULTADO ESPERADO
-- =============================================
/*
Después de ejecutar este SQL:

✅ Función ensure_profile_exists() creada
✅ Trigger create_profile_after_user_insert creado
✅ Permisos configurados
✅ Cada nuevo usuario en auth.users automáticamente crea perfil en public.profiles

TESTING:
1. Registra nuevo usuario desde test-registro-rapido.html
2. El perfil debe crearse automáticamente
3. No debería aparecer "⚠️ Perfil no encontrado por trigger"
4. Logs deben mostrar "✅ Perfil encontrado en public.profiles"
*/
