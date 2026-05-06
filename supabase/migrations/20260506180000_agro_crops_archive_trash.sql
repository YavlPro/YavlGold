alter table public.agro_crops
add column if not exists archived_at timestamptz null;

create index if not exists idx_agro_crops_user_archive_trash
on public.agro_crops (user_id, archived_at, deleted_at);

comment on column public.agro_crops.archived_at is
'Fecha en que el cultivo se archivo para ocultarlo de Mis cultivos sin borrar su historia comercial.';
