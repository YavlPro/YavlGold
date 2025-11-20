-- 🔍 VERIFICACIÓN RÁPIDA DEL USUARIO REGISTRADO
-- Ejecuta esto en Supabase SQL Editor

-- 1. Ver usuario completo con estado
SELECT 
  u.id,
  u.email,
  u.created_at as registrado_en,
  u.email_confirmed_at as confirmado_en,
  u.last_sign_in_at as ultimo_login,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN '🟡 Pendiente confirmación email'
    WHEN u.last_sign_in_at IS NULL THEN '🟢 Confirmado, nunca hizo login'
    ELSE '✅ Confirmado y activo'
  END as estado,
  u.raw_user_meta_data as metadata
FROM auth.users u
WHERE u.email = 'yeriksonpro301@gmail.com';


-- 2. Ver perfil asociado
SELECT 
  p.id,
  p.username,
  p.email,
  p.full_name,
  p.avatar_url,
  p.xp,
  p.level,
  p.is_admin,
  p.created_at
FROM public.profiles p
WHERE p.email = 'yeriksonpro301@gmail.com';


-- 3. Ver usuario + perfil en una query (JOIN)
SELECT 
  '✅ Usuario' as tipo,
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  '→→→→→' as separador,
  '✅ Perfil' as tipo_perfil,
  p.username,
  p.full_name,
  p.xp,
  p.level
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'yeriksonpro301@gmail.com';


-- 4. Validar integridad
SELECT 
  u.id = p.id as "IDs_coinciden",
  u.email = p.email as "Emails_coinciden",
  p.username IS NOT NULL as "Username_generado",
  p.avatar_url IS NOT NULL as "Avatar_generado",
  u.created_at::date = p.created_at::date as "Fechas_coinciden",
  CASE 
    WHEN u.id = p.id 
     AND u.email = p.email 
     AND p.username IS NOT NULL 
     AND p.avatar_url IS NOT NULL 
    THEN '✅ REGISTRO CORRECTO'
    ELSE '❌ HAY PROBLEMAS'
  END as resultado_final
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'yeriksonpro301@gmail.com';


-- 5. Si quieres confirmar el email manualmente (SOLO PARA TESTING)
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW()
-- WHERE email = 'yeriksonpro301@gmail.com';


-- 6. Ver todos los usuarios registrados hoy
SELECT 
  u.email,
  p.username,
  u.created_at,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN '🟡 Pendiente'
    ELSE '✅ Confirmado'
  END as estado
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.created_at::date = CURRENT_DATE
ORDER BY u.created_at DESC;


-- 7. Estadísticas generales
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(email_confirmed_at) as confirmados,
  COUNT(*) - COUNT(email_confirmed_at) as pendientes,
  COUNT(CASE WHEN last_sign_in_at IS NOT NULL THEN 1 END) as han_hecho_login
FROM auth.users;
