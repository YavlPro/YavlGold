-- ================================================================
-- FIX TEMPORAL: Permitir lectura anónima de profiles para testing
-- ================================================================
-- 
-- PROBLEMA: Los tests usan sesiones mock que Supabase no reconoce
-- SOLUCIÓN: Permitir que el rol 'anon' pueda leer profiles
-- 
-- ⚠️ IMPORTANTE: Esto es SOLO para desarrollo/testing
-- En producción, revertir esto y usar autenticación real
-- ================================================================

-- OPCIÓN 1: Agregar rol 'anon' a la política existente
-- (Si la política actual es "Authenticated users can view basic profile info")

DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON profiles;

CREATE POLICY "Users can view profiles (includes anon for testing)"
ON profiles FOR SELECT
TO authenticated, anon  -- ← Agregamos 'anon' aquí
USING (true);

-- ================================================================
-- VERIFICACIÓN: Ejecuta esto para confirmar que funcionó
-- ================================================================

SELECT 
  policyname, 
  roles,
  CASE 
    WHEN roles = '{authenticated,anon}' THEN '✅ CORRECTO: Permite anon'
    WHEN roles = '{authenticated}' THEN '❌ PROBLEMA: Solo authenticated'
    ELSE '⚠️ REVISAR: ' || roles::text
  END AS status
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'SELECT';

-- ================================================================
-- REVERTIR (Para producción - ejecutar después de testing)
-- ================================================================

-- DROP POLICY IF EXISTS "Users can view profiles (includes anon for testing)" ON profiles;
-- 
-- CREATE POLICY "Authenticated users can view basic profile info"
-- ON profiles FOR SELECT
-- TO authenticated
-- USING (true);
