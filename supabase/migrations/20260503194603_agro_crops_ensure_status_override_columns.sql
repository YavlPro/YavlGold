-- YavlGold Agro V1 — Ensure status_mode and status_override columns exist
-- Diagnostic: Supabase REST returns 400 when frontend sends these columns.
-- This migration is idempotent and safe to run even if columns already exist.
-- Includes NOTIFY to refresh PostgREST schema cache.

alter table public.agro_crops
    add column if not exists status_mode text null;

alter table public.agro_crops
    add column if not exists status_override text null;

comment on column public.agro_crops.status_mode is 'Modo de estado del cultivo: manual o auto cuando aplica.';
comment on column public.agro_crops.status_override is 'Estado manual explícito elegido por el usuario cuando aplica.';

notify pgrst, 'reload schema';