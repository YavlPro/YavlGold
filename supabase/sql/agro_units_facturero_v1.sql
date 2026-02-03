-- Agro facturero units for pending/loss/transfer (run in Supabase SQL editor if columns are missing)
ALTER TABLE agro_pending
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS unit_qty numeric,
  ADD COLUMN IF NOT EXISTS quantity_kg numeric;

ALTER TABLE agro_losses
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS unit_qty numeric,
  ADD COLUMN IF NOT EXISTS quantity_kg numeric;

ALTER TABLE agro_transfers
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS unit_qty numeric,
  ADD COLUMN IF NOT EXISTS quantity_kg numeric;
