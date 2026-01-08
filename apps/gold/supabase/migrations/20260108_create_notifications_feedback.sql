-- =====================================================
-- YAVLGOLD V9.4 - NOTIFICATIONS & FEEDBACK TABLES
-- Migration: 20260108_create_notifications_feedback
-- =====================================================

-- 1. Tabla Notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'alert')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'User notifications for dashboard alerts';

-- 2. Seguridad RLS Notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own as read" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. Índices Notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- =====================================================

-- 4. Tabla Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'other' CHECK (type IN ('bug', 'idea', 'question', 'other')),
    message TEXT NOT NULL,
    page_url TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.feedback IS 'User feedback and bug reports';

-- 5. Seguridad RLS Feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert feedback" ON public.feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);

-- 6. Índice Feedback
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
