-- ==========================================================================
-- YavlGold Agro — FIX get_farm_balance: paréntesis mal anidados en sum()
-- --------------------------------------------------------------------------
-- El RPC original (20260625120000) tenía 3 consultas donde el anidamiento
-- `coalesce(sum(EXPR), 0)` quedó como `sum(EXPR, 0)` por un paréntesis mal
-- cerrado, produciendo error 42883: "function sum(numeric, integer) does
-- not exist". PL/pgSQL no valida el SQL interno hasta la ejecución, por lo
-- que db push no lo detectó.
--
-- Esta migración reemplaza la función con los paréntesis corregidos y
-- casts ::numeric explícitos por seguridad de tipos.
-- ==========================================================================

create or replace function public.get_farm_balance(p_farm_id uuid, p_user_id uuid)
returns table (
  inversion_total numeric,
  cobrado_real    numeric,
  fiados_pendientes numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inversion numeric := 0;
  v_cobrado   numeric := 0;
  v_fiados    numeric := 0;
begin
  if p_farm_id is null or p_user_id is null then
    return query select 0::numeric, 0::numeric, 0::numeric;
    return;
  end if;

  -- ------------------------------------------------------------------
  -- INVERSIÓN TOTAL (gastos) = 4 componentes
  -- ------------------------------------------------------------------

  -- (a) agro_expenses por cultivos de la finca (crop_id → crops.farm_id)
  select coalesce(sum(
    coalesce(e.monto_usd,
      case
        when coalesce(e.currency, 'USD') = 'USD' then coalesce(e.amount, 0)::numeric
        when coalesce(e.exchange_rate, 0) > 0 then (coalesce(e.amount, 0)::numeric / e.exchange_rate)
        else coalesce(e.amount, 0)::numeric
      end
    )
  ), 0::numeric)
  into v_inversion
  from public.agro_expenses e
  inner join public.agro_crops c on c.id = e.crop_id
  where e.user_id = p_user_id
    and e.deleted_at is null
    and c.farm_id = p_farm_id;

  -- (b) Inversión base de cada cultivo (agro_crops.investment)
  v_inversion := v_inversion + coalesce((
    select sum(coalesce(c2.investment, 0::numeric))
    from public.agro_crops c2
    where c2.user_id = p_user_id
      and c2.deleted_at is null
      and c2.farm_id = p_farm_id
  ), 0::numeric);

  -- (c) Movimientos operativos salientes (direction != 'in') vía cycle_id → cycle.farm_id
  v_inversion := v_inversion + coalesce((
    select sum(
      coalesce(om.amount_usd,
        case
          when coalesce(om.currency, 'USD') = 'USD' then coalesce(om.amount, 0)::numeric
          when coalesce(om.exchange_rate, 0) > 0 then (coalesce(om.amount, 0)::numeric / om.exchange_rate)
          else coalesce(om.amount, 0)::numeric
        end
      )
    )
    from public.agro_operational_movements om
    inner join public.agro_operational_cycles oc on oc.id = om.cycle_id
    where om.user_id = p_user_id
      and oc.farm_id = p_farm_id
      and om.direction is distinct from 'in'
  ), 0::numeric);

  -- (d) Gastos generales de finca (crop_id IS NULL, farm_id = p_farm_id)
  v_inversion := v_inversion + coalesce((
    select sum(
      coalesce(ge.monto_usd,
        case
          when coalesce(ge.currency, 'USD') = 'USD' then coalesce(ge.amount, 0)::numeric
          when coalesce(ge.exchange_rate, 0) > 0 then (coalesce(ge.amount, 0)::numeric / ge.exchange_rate)
          else coalesce(ge.amount, 0)::numeric
        end
      )
    )
    from public.agro_expenses ge
    where ge.user_id = p_user_id
      and ge.deleted_at is null
      and ge.crop_id is null
      and ge.farm_id = p_farm_id
  ), 0::numeric);

  -- ------------------------------------------------------------------
  -- COBRADO REAL (ingresos) = 3 componentes
  -- ------------------------------------------------------------------

  -- (a) agro_income por cultivos de la finca (crop_id → crops.farm_id)
  select coalesce(sum(
    coalesce(i.monto_usd,
      case
        when coalesce(i.currency, 'USD') = 'USD' then coalesce(i.monto, 0)::numeric
        when coalesce(i.exchange_rate, 0) > 0 then (coalesce(i.monto, 0)::numeric / i.exchange_rate)
        else coalesce(i.monto, 0)::numeric
      end
    )
  ), 0::numeric)
  into v_cobrado
  from public.agro_income i
  inner join public.agro_crops c on c.id = i.crop_id
  where i.user_id = p_user_id
    and i.deleted_at is null
    and c.farm_id = p_farm_id;

  -- (b) Movimientos operativos entrantes (direction = 'in') vía cycle_id → cycle.farm_id
  v_cobrado := v_cobrado + coalesce((
    select sum(
      coalesce(om.amount_usd,
        case
          when coalesce(om.currency, 'USD') = 'USD' then coalesce(om.amount, 0)::numeric
          when coalesce(om.exchange_rate, 0) > 0 then (coalesce(om.amount, 0)::numeric / om.exchange_rate)
          else coalesce(om.amount, 0)::numeric
        end
      )
    )
    from public.agro_operational_movements om
    inner join public.agro_operational_cycles oc on oc.id = om.cycle_id
    where om.user_id = p_user_id
      and oc.farm_id = p_farm_id
      and om.direction = 'in'
  ), 0::numeric);

  -- (c) Ingresos generales de finca (crop_id IS NULL, farm_id = p_farm_id)
  v_cobrado := v_cobrado + coalesce((
    select sum(
      coalesce(gi.monto_usd,
        case
          when coalesce(gi.currency, 'USD') = 'USD' then coalesce(gi.monto, 0)::numeric
          when coalesce(gi.exchange_rate, 0) > 0 then (coalesce(gi.monto, 0)::numeric / gi.exchange_rate)
          else coalesce(gi.monto, 0)::numeric
        end
      )
    )
    from public.agro_income gi
    where gi.user_id = p_user_id
      and gi.deleted_at is null
      and gi.crop_id is null
      and gi.farm_id = p_farm_id
  ), 0::numeric);

  -- ------------------------------------------------------------------
  -- FIADOS PENDIENTES (agro_pending)
  -- Por crop_id de la finca O generales de finca (farm_id = p_farm_id).
  -- reverted_at IS NULL + deleted_at IS NULL.
  -- ------------------------------------------------------------------
  select coalesce(sum(
    coalesce(p.monto_usd,
      case
        when coalesce(p.currency, 'USD') = 'USD' then coalesce(p.monto, 0)::numeric
        when coalesce(p.exchange_rate, 0) > 0 then (coalesce(p.monto, 0)::numeric / p.exchange_rate)
        else coalesce(p.monto, 0)::numeric
      end
    )
  ), 0::numeric)
  into v_fiados
  from public.agro_pending p
  left join public.agro_crops c on c.id = p.crop_id
  where p.user_id = p_user_id
    and p.deleted_at is null
    and p.reverted_at is null
    and (
      (p.crop_id is not null and c.farm_id = p_farm_id)
      or
      (p.crop_id is null and p.farm_id = p_farm_id)
    );

  return query select v_inversion, v_cobrado, v_fiados;
end;
$$;

comment on function public.get_farm_balance(uuid, uuid) is
  'Balance consolidado de una finca (inversión, cobrado real, fiados pendientes). Réplica server-side de computeFarmStats() para el Dashboard Agro V11.';

-- Permisos: mantener el patrón canónico (revoke public + grant authenticated).
revoke all on function public.get_farm_balance(uuid, uuid) from public;
grant execute on function public.get_farm_balance(uuid, uuid) to authenticated;
