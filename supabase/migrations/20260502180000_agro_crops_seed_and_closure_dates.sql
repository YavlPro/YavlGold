-- YavlGold Agro V1 — Crop seed quantity and real closure/loss dates
-- Adds seed_kg (optional), lost_at (optional), closed_at (optional) to agro_crops

alter table public.agro_crops
add column if not exists seed_kg numeric null;

alter table public.agro_crops
add column if not exists lost_at date null;

alter table public.agro_crops
add column if not exists closed_at date null;

comment on column public.agro_crops.seed_kg is 'Cantidad de semilla usada en kilogramos. Opcional.';
comment on column public.agro_crops.lost_at is 'Fecha real en que el cultivo se perdió. Usada para calcular duración de ciclos perdidos.';
comment on column public.agro_crops.closed_at is 'Fecha real de cierre del ciclo. Respaldo si actual_harvest_date no existe.';
