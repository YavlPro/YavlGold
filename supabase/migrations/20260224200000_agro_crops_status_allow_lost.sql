-- Allow lost/damaged crop cycles in agro_crops.status
begin;

alter table public.agro_crops
drop constraint if exists agro_crops_status_check;

alter table public.agro_crops
add constraint agro_crops_status_check
check (
  status in (
    'sembrado',
    'creciendo',
    'produccion',
    'finalizado',
    'lost'
  )
);

notify pgrst, 'reload schema';

commit;
