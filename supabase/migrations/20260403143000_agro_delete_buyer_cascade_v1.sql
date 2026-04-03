begin;

create or replace function public.agro_delete_buyer_cascade_v1(p_buyer_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_buyer public.agro_buyers%rowtype;
  v_pending_deleted integer := 0;
  v_income_deleted integer := 0;
  v_loss_deleted integer := 0;
  v_threads_deleted integer := 0;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Auth requerida para eliminar clientes.';
  end if;

  select *
    into v_buyer
  from public.agro_buyers
  where id = p_buyer_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Cliente no encontrado o sin permisos.';
  end if;

  update public.agro_pending as p
  set deleted_at = v_now
  where p.user_id = v_user_id
    and p.deleted_at is null
    and (
      p.buyer_id = v_buyer.id
      or (
        p.buyer_id is null
        and v_buyer.group_key is not null
        and p.buyer_group_key = v_buyer.group_key
      )
    );
  get diagnostics v_pending_deleted = row_count;

  update public.agro_income as i
  set deleted_at = v_now
  where i.user_id = v_user_id
    and i.deleted_at is null
    and (
      i.buyer_id = v_buyer.id
      or (
        i.buyer_id is null
        and v_buyer.group_key is not null
        and i.buyer_group_key = v_buyer.group_key
      )
    );
  get diagnostics v_income_deleted = row_count;

  update public.agro_losses as l
  set deleted_at = v_now
  where l.user_id = v_user_id
    and l.deleted_at is null
    and (
      l.buyer_id = v_buyer.id
      or (
        l.buyer_id is null
        and v_buyer.group_key is not null
        and l.buyer_group_key = v_buyer.group_key
      )
    );
  get diagnostics v_loss_deleted = row_count;

  delete from public.agro_social_threads as t
  where t.user_id = v_user_id
    and t.buyer_group_key = v_buyer.group_key;
  get diagnostics v_threads_deleted = row_count;

  delete from public.agro_buyers as b
  where b.id = v_buyer.id
    and b.user_id = v_user_id;

  return jsonb_build_object(
    'buyer_id', v_buyer.id,
    'buyer_display_name', v_buyer.display_name,
    'buyer_group_key', v_buyer.group_key,
    'pending_deleted', v_pending_deleted,
    'income_deleted', v_income_deleted,
    'loss_deleted', v_loss_deleted,
    'threads_deleted', v_threads_deleted
  );
end;
$$;

comment on function public.agro_delete_buyer_cascade_v1(uuid)
  is 'Elimina un cliente canónico y archiva con soft-delete su cartera relacionada sin dejar historial visible huérfano.';

notify pgrst, 'reload schema';

commit;
