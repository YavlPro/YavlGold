-- =====================================================
-- YAVLGOLD V1 - IA CONTEXT FIELDS FOR FARMER PROFILE
-- Migration: 20260313_add_ia_context_to_farmer_profile
-- =====================================================

ALTER TABLE public.agro_farmer_profile
  ADD COLUMN IF NOT EXISTS experience_level TEXT
    CHECK (experience_level IS NULL OR experience_level IN ('principiante', 'intermedio', 'experto'));

ALTER TABLE public.agro_farmer_profile
  ADD COLUMN IF NOT EXISTS farm_type TEXT
    CHECK (farm_type IS NULL OR farm_type IN ('campo_abierto', 'invernadero', 'mixto', 'urbano'));

ALTER TABLE public.agro_farmer_profile
  ADD COLUMN IF NOT EXISTS assistant_goals JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.agro_farmer_profile.experience_level IS
  'Self-reported farming experience level for IA context personalization.';

COMMENT ON COLUMN public.agro_farmer_profile.farm_type IS
  'Type of farm operation for IA context.';

COMMENT ON COLUMN public.agro_farmer_profile.assistant_goals IS
  'Array of strings indicating what the user expects from the IA assistant. E.g. ["cultivos","finanzas","plagas","clima","mercado"]';
