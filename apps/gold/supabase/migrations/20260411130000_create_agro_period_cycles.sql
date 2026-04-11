-- =====================================================
-- YAVLGOLD AGRO V1 - CICLOS DE PERIODO MVP
-- Migration: 20260411_create_agro_period_cycles
-- =====================================================

CREATE TABLE IF NOT EXISTS public.agro_period_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    period_year INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,
    CHECK (EXTRACT(YEAR FROM start_date) = period_year),
    CHECK (EXTRACT(MONTH FROM start_date) = period_month),
    CHECK (EXTRACT(YEAR FROM end_date) = period_year),
    CHECK (EXTRACT(MONTH FROM end_date) = period_month),
    CHECK (start_date <= end_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS agro_period_cycles_user_period_unique
    ON public.agro_period_cycles (user_id, period_year, period_month)
    WHERE deleted_at IS NULL;

ALTER TABLE public.agro_period_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_period_cycles_select" ON public.agro_period_cycles;
CREATE POLICY "user_own_period_cycles_select" ON public.agro_period_cycles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_period_cycles_insert" ON public.agro_period_cycles;
CREATE POLICY "user_own_period_cycles_insert" ON public.agro_period_cycles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_period_cycles_update" ON public.agro_period_cycles;
CREATE POLICY "user_own_period_cycles_update" ON public.agro_period_cycles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_period_cycles_delete" ON public.agro_period_cycles;
CREATE POLICY "user_own_period_cycles_delete" ON public.agro_period_cycles
    FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agro_period_cycles_updated_at ON public.agro_period_cycles;
CREATE TRIGGER trg_agro_period_cycles_updated_at
    BEFORE UPDATE ON public.agro_period_cycles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
