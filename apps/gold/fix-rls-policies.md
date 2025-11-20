# 🔒 Fix RLS Policies para Announcements

## Problema Identificado
Los anuncios NO se eliminan de la base de datos porque las políticas RLS están bloqueando las operaciones DELETE.

**Síntomas:**
- ✅ `deleteAnnouncement()` retorna `success: true`
- ❌ Pero el anuncio NO se elimina de la BD
- ✅ UPDATE funciona correctamente (editar y guardar)
- ❌ DELETE está siendo bloqueado silenciosamente

## Solución: Actualizar Políticas RLS en Supabase

### 1. Ir a Supabase Dashboard
```
https://supabase.com/dashboard/project/gerzlzprkarikblqxpjt
```

### 2. Ir a Authentication > Policies
- Navega a: Table Editor > announcements
- Click en "Policies" (candado)

### 3. Crear/Actualizar Política de DELETE

**Opción A: Eliminar política antigua y crear nueva**

```sql
-- 1. Eliminar política antigua de DELETE (si existe)
DROP POLICY IF EXISTS "Users can delete own announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can delete any announcement" ON announcements;
DROP POLICY IF EXISTS "Allow delete for admins or authors" ON announcements;

-- 2. Crear nueva política de DELETE para autores
CREATE POLICY "Authors can delete own announcements"
ON announcements
FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- 3. Crear nueva política de DELETE para admins
CREATE POLICY "Admins can delete any announcement"
ON announcements
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);
```

**Opción B: Política combinada (MÁS SIMPLE - RECOMENDADO)**

```sql
-- Eliminar todas las políticas DELETE antiguas
DROP POLICY IF EXISTS "Users can delete own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete any announcement" ON public.announcements;
DROP POLICY IF EXISTS "Allow delete for admins or authors" ON public.announcements;
DROP POLICY IF EXISTS "Authors can delete own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow delete for authors and admins" ON public.announcements;

-- Crear UNA SOLA política que permita a autores Y admins
CREATE POLICY "Allow delete for authors and admins"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    (author_id = (SELECT auth.uid()))
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );
```

### 4. Verificar Políticas Actuales

Para ver qué políticas existen actualmente:

```sql
-- Ver todas las políticas de la tabla announcements
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'announcements';
```

### 5. Habilitar RLS (si no está habilitado)

```sql
-- Asegurarse que RLS está habilitado
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
```

## Cómo Aplicar (Paso a Paso)

### Método 1: Via Supabase Dashboard (Más Fácil)

1. Ve a: https://supabase.com/dashboard/project/gerzlzprkarikblqxpjt/editor
2. Click en tabla `announcements`
3. Click en pestaña "Policies" (arriba)
4. Busca políticas de tipo "DELETE"
5. Elimina las existentes
6. Click en "New Policy"
7. Selecciona "DELETE" operation
8. Policy name: `Allow delete for authors and admins`
9. Target roles: `authenticated`
10. USING expression:
    ```sql
    auth.uid() = author_id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
    ```
11. Click "Save"

### Método 2: Via SQL Editor

1. Ve a: SQL Editor en Supabase
2. Copia y pega la "Opción B" completa
3. Click "Run"
4. Verifica que no haya errores

## Verificar que Funciona

Después de aplicar las políticas, prueba:

```javascript
// En la consola del navegador
const result = await AnnouncementsManager.deleteAnnouncement('ID_DEL_ANUNCIO');
console.log(result);
```

Luego recarga y verifica que el anuncio YA NO aparezca.

## Políticas Completas Recomendadas para `announcements`

```sql
-- 1. SELECT: Todos los autenticados pueden leer
CREATE POLICY "Anyone can read announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT: Solo admins pueden crear
CREATE POLICY "Only admins can create announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

-- 3. UPDATE: Autores y admins pueden editar
CREATE POLICY "Allow update for authors and admins"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    (author_id = (SELECT auth.uid()))
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

-- 4. DELETE: Autores y admins pueden eliminar
CREATE POLICY "Allow delete for authors and admins"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    (author_id = (SELECT auth.uid()))
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );
```

## Notas Importantes

- ✅ UPDATE funciona = La política UPDATE está bien configurada
- ❌ DELETE no funciona = La política DELETE está mal o no existe
- 🔍 El código JavaScript está correcto
- 🔒 El problema es 100% en las políticas RLS de Supabase

