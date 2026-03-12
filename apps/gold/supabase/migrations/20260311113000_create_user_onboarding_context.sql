-- =====================================================
-- YAVLGOLD V9.8 - USER ONBOARDING CONTEXT
-- Migration: 20260311_create_user_onboarding_context
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_onboarding_context (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 80),
    agro_relation TEXT NOT NULL CHECK (agro_relation IN ('producer', 'supporting', 'exploring')),
    farm_name TEXT CHECK (
        farm_name IS NULL
        OR char_length(trim(farm_name)) BETWEEN 2 AND 120
    ),
    main_activity TEXT CHECK (
        main_activity IS NULL
        OR main_activity IN ('cultivation', 'sales', 'planning', 'learning', 'other')
    ),
    entry_preference TEXT NOT NULL CHECK (
        entry_preference IN ('agro_dashboard', 'agro_operations', 'agro_reports', 'learning_path')
    ),
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_onboarding_context IS
    'Minimal onboarding context for first authenticated access in YavlGold Agro.';

COMMENT ON COLUMN public.user_onboarding_context.display_name IS
    'Friendly display name chosen during onboarding. Does not replace profiles.username constraints.';

COMMENT ON COLUMN public.user_onboarding_context.agro_relation IS
    'How the user relates to Agro during first setup.';

COMMENT ON COLUMN public.user_onboarding_context.entry_preference IS
    'Initial preferred landing intent inside the Agro experience.';

CREATE OR REPLACE FUNCTION public.set_user_onboarding_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_onboarding_context_updated_at
    ON public.user_onboarding_context;

CREATE TRIGGER trg_user_onboarding_context_updated_at
    BEFORE UPDATE ON public.user_onboarding_context
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_onboarding_context_updated_at();

ALTER TABLE public.user_onboarding_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding context"
    ON public.user_onboarding_context
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding context"
    ON public.user_onboarding_context
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding context"
    ON public.user_onboarding_context
    FOR UPDATE
    USING (auth.uid() = user_id);

