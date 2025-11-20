-- ============================================
-- FIX: Si profiles está en schema diferente
-- ============================================

-- OPCIÓN A: Si profiles está en schema 'public'
DROP POLICY IF EXISTS "Allow delete for authors and admins" ON public.announcements;

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

-- OPCIÓN B: Si profiles está en schema 'auth'
DROP POLICY IF EXISTS "Allow delete for authors and admins" ON public.announcements;

CREATE POLICY "Allow delete for authors and admins"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    (author_id = (SELECT auth.uid()))
    OR 
    EXISTS (
      SELECT 1 FROM auth.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

-- OPCIÓN C: Política más permisiva (solo para testing)
-- USAR SOLO TEMPORALMENTE PARA PROBAR
DROP POLICY IF EXISTS "Allow delete for authors and admins" ON public.announcements;

CREATE POLICY "Allow delete for authors and admins"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (true);  -- ⚠️ PERMITE A TODOS - SOLO PARA TESTING
