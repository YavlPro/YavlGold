-- =============================================
-- VERIFICAR POLÍTICAS RLS DE ANNOUNCEMENTS
-- =============================================
-- Este script te ayuda a ver el estado actual
-- de las políticas de seguridad en tu tabla

-- 1. Ver todas las políticas de la tabla announcements
SELECT 
  schemaname AS "Schema",
  tablename AS "Tabla",
  policyname AS "Nombre Política",
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️ SELECT (Leer)'
    WHEN cmd = 'INSERT' THEN '➕ INSERT (Crear)'
    WHEN cmd = 'UPDATE' THEN '✏️ UPDATE (Editar)'
    WHEN cmd = 'DELETE' THEN '🗑️ DELETE (Eliminar)'
    ELSE cmd
  END AS "Operación",
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅ Permite'
    ELSE '🚫 Restringe'
  END AS "Tipo",
  roles AS "Roles",
  qual AS "Condición USING",
  with_check AS "Condición WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'announcements'
ORDER BY cmd, policyname;

-- 2. Ver específicamente las políticas DELETE
SELECT 
  policyname AS "Política DELETE",
  qual AS "Condición"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'announcements' 
AND cmd = 'DELETE';

-- 3. Verificar si RLS está habilitado
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS Habilitado'
    ELSE '🔓 RLS Deshabilitado'
  END AS "Estado RLS"
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'announcements';

-- 4. Ver información de la tabla announcements
SELECT 
  column_name AS "Columna",
  data_type AS "Tipo",
  is_nullable AS "Nullable"
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'announcements'
ORDER BY ordinal_position;

-- 5. Verificar foreign key a profiles
SELECT
  tc.constraint_name AS "Constraint",
  kcu.column_name AS "Columna",
  ccu.table_name AS "Tabla Referenciada",
  ccu.column_name AS "Columna Referenciada"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'announcements'
  AND tc.constraint_type = 'FOREIGN KEY';
