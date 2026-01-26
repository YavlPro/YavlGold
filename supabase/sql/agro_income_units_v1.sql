-- Agro facturero units (run in Supabase SQL editor if columns are missing)
ALTER TABLE agro_income
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS unit_qty numeric,
  ADD COLUMN IF NOT EXISTS quantity_kg numeric;
