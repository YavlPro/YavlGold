-- =====================================================
-- YAVLGOLD AGRO V1 - CICLOS OPERATIVOS MVP
-- Migration: 20260318_create_agro_operational_cycles
-- =====================================================

CREATE TABLE IF NOT EXISTS public.agro_operational_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,

    -- Identidad
    name TEXT NOT NULL,
    description TEXT,

    -- Clasificación
    economic_type TEXT NOT NULL
        CHECK (economic_type IN (
            'expense', 'income', 'donation', 'loss'
        )),
    category TEXT NOT NULL DEFAULT 'other'
        CHECK (category IN (
            'tools', 'maintenance', 'labor',
            'transport', 'supplies', 'other'
        )),

    -- Asociación opcional a cultivo
    crop_id UUID REFERENCES public.agro_crops(id) NULL,

    -- Estado
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN (
            'open', 'in_progress', 'compensating',
            'closed', 'lost'
        )),

    -- Fechas
    opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
    closed_at DATE NULL,

    -- Notas
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agro_operational_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_cycles_select" ON public.agro_operational_cycles;
CREATE POLICY "user_own_cycles_select" ON public.agro_operational_cycles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_cycles_insert" ON public.agro_operational_cycles;
CREATE POLICY "user_own_cycles_insert" ON public.agro_operational_cycles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_cycles_update" ON public.agro_operational_cycles;
CREATE POLICY "user_own_cycles_update" ON public.agro_operational_cycles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_cycles_delete" ON public.agro_operational_cycles;
CREATE POLICY "user_own_cycles_delete" ON public.agro_operational_cycles
    FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cycles_updated_at ON public.agro_operational_cycles;
CREATE TRIGGER trg_cycles_updated_at
    BEFORE UPDATE ON public.agro_operational_cycles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.agro_operational_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    cycle_id UUID REFERENCES public.agro_operational_cycles(id)
        ON DELETE CASCADE NOT NULL,

    -- Dirección
    direction TEXT NOT NULL
        CHECK (direction IN ('out', 'in')),

    -- Valores monetarios
    amount NUMERIC NULL,
    currency TEXT DEFAULT 'COP',
    amount_usd NUMERIC,
    exchange_rate NUMERIC,

    -- Detalle
    concept TEXT,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Cantidad física
    quantity NUMERIC,
    unit_type TEXT
        CHECK (unit_type IS NULL OR unit_type IN (
            'unidad', 'saco', 'kg'
        )),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agro_operational_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_movements_select" ON public.agro_operational_movements;
CREATE POLICY "user_own_movements_select" ON public.agro_operational_movements
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_movements_insert" ON public.agro_operational_movements;
CREATE POLICY "user_own_movements_insert" ON public.agro_operational_movements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_movements_update" ON public.agro_operational_movements;
CREATE POLICY "user_own_movements_update" ON public.agro_operational_movements
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_movements_delete" ON public.agro_operational_movements;
CREATE POLICY "user_own_movements_delete" ON public.agro_operational_movements
    FOR DELETE USING (auth.uid() = user_id);
