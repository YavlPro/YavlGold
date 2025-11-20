-- =============================================
-- ELIMINAR USUARIOS DE PRUEBA CON PERFILES
-- (Orden correcto: primero profiles, luego users)
-- =============================================

-- Opción 1: ELIMINAR USUARIO ESPECÍFICO POR EMAIL
-- =============================================

-- Paso 1: Obtener IDs de usuarios con ese email
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'yeriksonpro301@gmail.com';

-- Paso 2: Eliminar perfiles primero (si existen)
DELETE FROM public.profiles 
WHERE email = 'yeriksonpro301@gmail.com';

-- Paso 3: Eliminar usuarios de auth.users
DELETE FROM auth.users 
WHERE email = 'yeriksonpro301@gmail.com';


-- Opción 2: ELIMINAR USUARIO ESPECÍFICO POR ID
-- =============================================

-- Si conoces el ID:
DELETE FROM public.profiles WHERE id = '87fef4b8-8d20-468a-a4e8-2acca6e541dd';
DELETE FROM auth.users WHERE id = '87fef4b8-8d20-468a-a4e8-2acca6e541dd';

-- Otro ID:
DELETE FROM public.profiles WHERE id = 'adeda623-eb57-4667-829b-7db4c78c922c';
DELETE FROM auth.users WHERE id = 'adeda623-eb57-4667-829b-7db4c78c922c';

DELETE FROM public.profiles WHERE id = 'efd7b13b-b28d-45d1-8ed6-9c8bf3b3285e';
DELETE FROM auth.users WHERE id = 'efd7b13b-b28d-45d1-8ed6-9c8bf3b3285e';


-- Opción 3: ELIMINAR TODOS LOS USUARIOS DE PRUEBA
-- =============================================

-- Eliminar perfiles de prueba (emails con @example.com)
DELETE FROM public.profiles 
WHERE email LIKE '%@example.com';

-- Eliminar usuarios de prueba
DELETE FROM auth.users 
WHERE email LIKE '%@example.com';

-- También eliminar tu email de prueba
DELETE FROM public.profiles WHERE email = 'yeriksonpro301@gmail.com';
DELETE FROM auth.users WHERE email = 'yeriksonpro301@gmail.com';


-- Opción 4: ELIMINAR CON CASCADE (MEJOR SOLUCIÓN)
-- =============================================

-- Primero, modificar la foreign key para que elimine en cascada:
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Ahora puedes eliminar usuarios directamente (eliminará perfil automáticamente):
DELETE FROM auth.users WHERE email = 'yeriksonpro301@gmail.com';
DELETE FROM auth.users WHERE email LIKE '%@example.com';


-- Verificación: Ver usuarios restantes
-- =============================================

SELECT 
  u.id,
  u.email,
  u.created_at,
  CASE WHEN p.id IS NOT NULL THEN '✅' ELSE '❌' END as has_profile
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 20;


-- =============================================
-- EXPLICACIÓN
-- =============================================

/*
PROBLEMA:
Foreign key constraint "profiles_id_fkey" impide eliminar usuarios
si tienen perfil asociado.

CAUSA:
La constraint está configurada sin ON DELETE CASCADE.

SOLUCIÓN RÁPIDA:
Eliminar profiles primero, luego users.

SOLUCIÓN PERMANENTE:
Modificar constraint para usar ON DELETE CASCADE.
Así al eliminar user, el perfil se elimina automáticamente.

ORDEN CORRECTO SIN CASCADE:
1. DELETE FROM public.profiles WHERE ...
2. DELETE FROM auth.users WHERE ...

CON CASCADE (después de modificar constraint):
1. DELETE FROM auth.users WHERE ...
   (perfil se elimina automáticamente)
*/
