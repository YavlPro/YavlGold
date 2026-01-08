-- =====================================================
-- YAVLGOLD V9.4 - SUPER ADMIN SYSTEM
-- Migration: 20260108_create_app_admins
-- =====================================================

-- 1. Tabla de Administradores
CREATE TABLE IF NOT EXISTS public.app_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'moderator', 'support')),
    created_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

COMMENT ON TABLE public.app_admins IS 'Application administrators with elevated privileges';

-- 2. Seguridad RLS para app_admins
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

-- 3. Política: Usuarios autenticados pueden verificar si son admins (solo su propio registro)
CREATE POLICY "Users can check own admin status" ON public.app_admins
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- ACTUALIZAR PERMISOS DE ANNOUNCEMENTS
-- =====================================================

-- 4. Política: Admins pueden gestionar TODOS los anuncios
CREATE POLICY "Admins manage all announcements" ON public.announcements
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.app_admins
            WHERE app_admins.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.app_admins
            WHERE app_admins.user_id = auth.uid()
        )
    );

-- =====================================================
-- INSERTAR TU USUARIO COMO ADMIN (AJUSTAR UUID)
-- Ejecutar DESPUÉS de identificar tu user_id en auth.users
-- =====================================================
-- INSERT INTO public.app_admins (user_id, role, notes)
-- VALUES ('TU-USER-ID-AQUI', 'superadmin', 'Owner');
