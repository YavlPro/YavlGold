-- ============================================================
-- YavlGold V9.4 - Módulo Agro - Schema SQL
-- Archivo: supabase/agro_schema.sql
-- Fecha: 2026-01-10
-- ============================================================
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu dashboard de Supabase
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta (Ctrl+Enter o botón "Run")
-- ============================================================

-- ============================================================
-- TABLA: agro_crops (Cultivos del agricultor)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agro_crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Información del cultivo
    name TEXT NOT NULL,                           -- Ej: "Papa", "Zanahoria", "Cebolla"
    variety TEXT,                                 -- Ej: "Granola", "Chantenay Royal"
    icon TEXT DEFAULT '🌱',                       -- Emoji para UI

    -- Estado y progreso
    status TEXT NOT NULL DEFAULT 'growing'        -- 'growing', 'ready', 'attention', 'harvested'
        CHECK (status IN ('growing', 'ready', 'attention', 'harvested')),
    progress INTEGER NOT NULL DEFAULT 0           -- 0-100 (porcentaje del ciclo)
        CHECK (progress >= 0 AND progress <= 100),

    -- Datos de producción
    area_size NUMERIC(10,2) NOT NULL DEFAULT 0,   -- Hectáreas
    investment NUMERIC(12,2) NOT NULL DEFAULT 0,  -- Inversión en USD

    -- Fechas
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_harvest_date DATE,
    actual_harvest_date DATE,

    -- Metadatos
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultas por usuario
CREATE INDEX IF NOT EXISTS idx_agro_crops_user_id ON public.agro_crops(user_id);
CREATE INDEX IF NOT EXISTS idx_agro_crops_status ON public.agro_crops(status);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_agro_crops_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agro_crops_updated ON public.agro_crops;
CREATE TRIGGER trigger_agro_crops_updated
    BEFORE UPDATE ON public.agro_crops
    FOR EACH ROW
    EXECUTE FUNCTION update_agro_crops_timestamp();


-- ============================================================
-- TABLA: agro_roi_calculations (Historial de cálculos ROI)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agro_roi_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Datos del cálculo
    investment_amount NUMERIC(12,2) NOT NULL,     -- Inversión ingresada
    projected_revenue NUMERIC(12,2) NOT NULL,     -- Ingresos proyectados
    quantity_kg NUMERIC(12,2),                    -- Cantidad en kg (opcional)

    -- Resultados calculados
    calculated_profit NUMERIC(12,2) NOT NULL,     -- Ganancia = revenue - investment
    roi_percentage NUMERIC(8,2) NOT NULL,         -- (profit/investment) * 100

    -- Metadatos
    crop_id UUID REFERENCES public.agro_crops(id) ON DELETE SET NULL,  -- Opcional: vincular a cultivo
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_agro_roi_user_id ON public.agro_roi_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_agro_roi_created_at ON public.agro_roi_calculations(created_at DESC);


-- ============================================================
-- SEGURIDAD: RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS en ambas tablas
ALTER TABLE public.agro_crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_roi_calculations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS: agro_crops
-- ============================================================

-- SELECT: Usuarios solo pueden ver sus propios cultivos
DROP POLICY IF EXISTS "Users can view own crops" ON public.agro_crops;
CREATE POLICY "Users can view own crops"
    ON public.agro_crops
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: Usuarios solo pueden crear cultivos para sí mismos
DROP POLICY IF EXISTS "Users can insert own crops" ON public.agro_crops;
CREATE POLICY "Users can insert own crops"
    ON public.agro_crops
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuarios solo pueden actualizar sus propios cultivos
DROP POLICY IF EXISTS "Users can update own crops" ON public.agro_crops;
CREATE POLICY "Users can update own crops"
    ON public.agro_crops
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Usuarios solo pueden eliminar sus propios cultivos
DROP POLICY IF EXISTS "Users can delete own crops" ON public.agro_crops;
CREATE POLICY "Users can delete own crops"
    ON public.agro_crops
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- POLÍTICAS: agro_roi_calculations
-- ============================================================

-- SELECT: Usuarios solo pueden ver sus propios cálculos
DROP POLICY IF EXISTS "Users can view own ROI calculations" ON public.agro_roi_calculations;
CREATE POLICY "Users can view own ROI calculations"
    ON public.agro_roi_calculations
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: Usuarios solo pueden crear cálculos para sí mismos
DROP POLICY IF EXISTS "Users can insert own ROI calculations" ON public.agro_roi_calculations;
CREATE POLICY "Users can insert own ROI calculations"
    ON public.agro_roi_calculations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Usuarios pueden eliminar su historial de cálculos
DROP POLICY IF EXISTS "Users can delete own ROI calculations" ON public.agro_roi_calculations;
CREATE POLICY "Users can delete own ROI calculations"
    ON public.agro_roi_calculations
    FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================
COMMENT ON TABLE public.agro_crops IS 'Cultivos activos y históricos de cada agricultor en YavlGold Agro';
COMMENT ON TABLE public.agro_roi_calculations IS 'Historial de cálculos ROI realizados en la calculadora Agro';

COMMENT ON COLUMN public.agro_crops.status IS 'Estado: growing (en crecimiento), ready (listo para cosechar), attention (requiere atención), harvested (cosechado)';
COMMENT ON COLUMN public.agro_crops.progress IS 'Porcentaje de avance del ciclo de cultivo (0-100)';
COMMENT ON COLUMN public.agro_roi_calculations.roi_percentage IS 'ROI calculado como (profit/investment)*100';


-- ============================================================
-- DATOS DE EJEMPLO (Opcional - Comentar en producción)
-- ============================================================
-- Descomenta estas líneas después de ejecutar el migration
-- y reemplaza 'YOUR_USER_ID' con un UUID real de auth.users
/*
INSERT INTO public.agro_crops (user_id, name, variety, icon, status, progress, area_size, investment, start_date, expected_harvest_date)
VALUES
    ('YOUR_USER_ID', 'Papa', 'Granola', '🥔', 'growing', 65, 2.5, 4200.00, '2024-10-15', '2025-01-28'),
    ('YOUR_USER_ID', 'Zanahoria', 'Chantenay Royal', '🥕', 'ready', 100, 1.8, 2800.00, '2024-09-01', '2025-01-10'),
    ('YOUR_USER_ID', 'Cebolla', 'Roja Criolla', '🧅', 'attention', 35, 1.2, 1950.00, '2024-11-20', '2025-03-15');
*/


-- ============================================================
-- ✅ MIGRACIÓN COMPLETADA
-- ============================================================
-- Tablas creadas: agro_crops, agro_roi_calculations
-- RLS habilitado: SÍ
-- Políticas: SELECT, INSERT, UPDATE, DELETE por usuario
-- ============================================================
