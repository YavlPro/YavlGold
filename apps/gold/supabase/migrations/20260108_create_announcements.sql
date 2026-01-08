-- =====================================================
-- YAVLGOLD V9.4 - GLOBAL ANNOUNCEMENTS TABLE
-- Migration: 20260108_create_announcements
-- =====================================================

-- 1. Tabla Announcements (Avisos Masivos)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'danger', 'success')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.announcements IS 'Global announcements/alerts for all users';

-- 2. Seguridad RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 3. Política: Usuarios autenticados pueden LEER avisos activos
CREATE POLICY "Authenticated users can read announcements" ON public.announcements
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- 4. Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);
