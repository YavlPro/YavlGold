-- Agro crops manual status override (run in Supabase SQL editor if columns are missing)
ALTER TABLE agro_crops
  ADD COLUMN IF NOT EXISTS status_mode text,
  ADD COLUMN IF NOT EXISTS status_override text;
