-- =====================================================
-- YAVLGOLD V9.4 - USER FAVORITES TABLE
-- Migration: 20260108_create_user_favorites
-- =====================================================

-- 1. Tabla de Favoritos
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    module_key TEXT NOT NULL, -- Relación por Key (ej: 'agro', 'social')
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, module_key)
);

-- 2. Comentario descriptivo
COMMENT ON TABLE public.user_favorites IS 'Stores user favorite modules for quick access';

-- 3. Seguridad RLS (Blindaje)
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- 4. Política: Usuarios solo ven/manejan sus propios favoritos
CREATE POLICY "Users manage their own favorites" ON public.user_favorites
    FOR ALL USING (auth.uid() = user_id);

-- 5. Índices para velocidad
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_module ON public.user_favorites(module_key);
