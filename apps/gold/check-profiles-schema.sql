-- Verificar el schema de la tabla profiles
SELECT 
  table_schema AS "Schema",
  table_name AS "Tabla"
FROM information_schema.tables
WHERE table_name = 'profiles';

-- Verificar que el usuario actual existe en profiles
SELECT 
  id,
  username,
  email,
  is_admin,
  created_at
FROM profiles
WHERE id = auth.uid();

-- Verificar que auth.uid() funciona
SELECT auth.uid() AS "User ID actual";
