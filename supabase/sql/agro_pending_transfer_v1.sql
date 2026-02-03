-- Agro pending transfer metadata (run in Supabase SQL editor if columns are missing)
ALTER TABLE agro_pending
  ADD COLUMN IF NOT EXISTS transferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS transferred_income_id text,
  ADD COLUMN IF NOT EXISTS transferred_by uuid;
