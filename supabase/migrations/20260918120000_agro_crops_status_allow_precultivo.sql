-- YavlGold Agro — ANEXO 28: allow pre-sowing cycles (pre-cultivo) in agro_crops.status
-- Pattern: 20260224200000_agro_crops_status_allow_lost.sql (drop + re-add + pgrst reload).
-- 'precultivo' = ciclo registrado antes de sembrar: sin fecha de siembra real,
-- sin semilla, sin cierre. La conversión a 'sembrado' la hace la app con un
-- solo update (status + start_date + seed_kg + expected_harvest_date).
begin;

alter table public.agro_crops
drop constraint if exists agro_crops_status_check;

alter table public.agro_crops
add constraint agro_crops_status_check
check (
  status in (
    'precultivo',
    'sembrado',
    'creciendo',
    'produccion',
    'finalizado',
    'lost'
  )
);

notify pgrst, 'reload schema';

commit;
