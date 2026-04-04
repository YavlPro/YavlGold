begin;

alter table public.agro_task_cycles
  add column if not exists task_status text;

update public.agro_task_cycles
set task_status = 'completed'
where task_status is null;

alter table public.agro_task_cycles
  alter column task_status set default 'completed';

alter table public.agro_task_cycles
  alter column task_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agro_task_cycles_task_status_check'
  ) then
    alter table public.agro_task_cycles
      add constraint agro_task_cycles_task_status_check
      check (task_status in ('pending', 'active', 'completed', 'not_executed'));
  end if;
end;
$$;

create index if not exists agro_task_cycles_user_status_idx
  on public.agro_task_cycles (user_id, task_status, task_date desc, created_at desc);

notify pgrst, 'reload schema';

commit;
