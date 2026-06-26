-- ==========================================================================
-- YavlGold Agro — RPC get_farm_balance
-- --------------------------------------------------------------------------
-- Balance consolidado de una finca en una sola llamada server-side.
-- Replica FIELMENTE la lógica de computeFarmStats() de agro-farm-compare.js
-- (que a su vez replica loadFarms() de agro-farms.js = "Mis Fincas") para
-- garantizar consistencia exacta de cifras.
--
-- Atribución crop-céntrica (no suma directa por farm_id):
--   * agro_expenses/ingresos por cultivo se atribuyen vía crop_id → crops.farm_id
--     (los movimientos legacy tienen farm_id = NULL).
--   * Se suma agro_crops.investment (inversión base del cultivo).
--   * Movimientos operativos vía operational_cycles(crop_id/farm_id) → movements(cycle_id).
--   * Gastos/ingresos generales de finca (crop_id IS NULL, farm_id = p_farm_id).
--   * Fiados: agro_pending (crop_id de la finca O farm_id directo) con reverted_at IS NULL.
--
-- Filtros: deleted_at IS NULL en todas las tablas de movimientos + agro_crops.
--          operational_cycles/operational_movements usan hard-delete (sin deleted_at).
-- ==========================================================================

-- Precedencia de monto USD (igual a resolveRecordUsd):
--   monto_usd → amount_usd → (amount|monto) convertido por currency/exchange_rate
-- Para agro_expenses/agro_income/agro_pending: monto_usd / monto.
-- Para agro_operational_movements: amount_usd / amount.

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
        when coalesce(e.currency, 'USD') = 'USD' then coalesce(e.amount, 0)
        when coalesce(e.exchange_rate, 0) > 0 then coalesce(e.amount, 0) / e.exchange_rate
        else coalesce(e.amount, 0)
      end
    ), 0
  ), 0)
  into v_inversion
  from public.agro_expenses e
  inner join public.agro_crops c on c.id = e.crop_id
  where e.user_id = p_user_id
    and e.deleted_at is null
    and c.farm_id = p_farm_id;

  -- (b) Inversión base de cada cultivo (agro_crops.investment)
  v_inversion := v_inversion + coalesce((
    select sum(coalesce(c2.investment, 0))
    from public.agro_crops c2
    where c2.user_id = p_user_id
      and c2.deleted_at is null
      and c2.farm_id = p_farm_id
  ), 0);

  -- (c) Movimientos operativos salientes (direction != 'in') vía cycle_id → cycle.farm_id
  v_inversion := v_inversion + coalesce((
    select sum(
      coalesce(om.amount_usd,
        case
          when coalesce(om.currency, 'USD') = 'USD' then coalesce(om.amount, 0)
          when coalesce(om.exchange_rate, 0) > 0 then coalesce(om.amount, 0) / om.exchange_rate
          else coalesce(om.amount, 0)
        end
      )
    )
    from public.agro_operational_movements om
    inner join public.agro_operational_cycles oc on oc.id = om.cycle_id
    where om.user_id = p_user_id
      and oc.farm_id = p_farm_id
      and om.direction is distinct from 'in'
  ), 0);

  -- (d) Gastos generales de finca (crop_id IS NULL, farm_id = p_farm_id)
  v_inversion := v_inversion + coalesce((
    select sum(
      coalesce(ge.monto_usd,
        case
          when coalesce(ge.currency, 'USD') = 'USD' then coalesce(ge.amount, 0)
          when coalesce(ge.exchange_rate, 0) > 0 then coalesce(ge.amount, 0) / ge.exchange_rate
          else coalesce(ge.amount, 0)
        end
      )
    )
    from public.agro_expenses ge
    where ge.user_id = p_user_id
      and ge.deleted_at is null
      and ge.crop_id is null
      and ge.farm_id = p_farm_id
  ), 0);

  -- ------------------------------------------------------------------
  -- COBRADO REAL (ingresos) = 3 componentes
  -- ------------------------------------------------------------------

  -- (a) agro_income por cultivos de la finca (crop_id → crops.farm_id)
  select coalesce(sum(
    coalesce(i.monto_usd,
      case
        when coalesce(i.currency, 'USD') = 'USD' then coalesce(i.monto, 0)
        when coalesce(i.exchange_rate, 0) > 0 then coalesce(i.monto, 0) / i.exchange_rate
        else coalesce(i.monto, 0)
      end
    ), 0
  ), 0)
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
          when coalesce(om.currency, 'USD') = 'USD' then coalesce(om.amount, 0)
          when coalesce(om.exchange_rate, 0) > 0 then coalesce(om.amount, 0) / om.exchange_rate
          else coalesce(om.amount, 0)
        end
      )
    )
    from public.agro_operational_movements om
    inner join public.agro_operational_cycles oc on oc.id = om.cycle_id
    where om.user_id = p_user_id
      and oc.farm_id = p_farm_id
      and om.direction = 'in'
  ), 0);

  -- (c) Ingresos generales de finca (crop_id IS NULL, farm_id = p_farm_id)
  v_cobrado := v_cobrado + coalesce((
    select sum(
      coalesce(gi.monto_usd,
        case
          when coalesce(gi.currency, 'USD') = 'USD' then coalesce(gi.monto, 0)
          when coalesce(gi.exchange_rate, 0) > 0 then coalesce(gi.monto, 0) / gi.exchange_rate
          else coalesce(gi.monto, 0)
        end
      )
    )
    from public.agro_income gi
    where gi.user_id = p_user_id
      and gi.deleted_at is null
      and gi.crop_id is null
      and gi.farm_id = p_farm_id
  ), 0);

  -- ------------------------------------------------------------------
  -- FIADOS PENDIENTES (agro_pending)
  -- Por crop_id de la finca O generales de finca (farm_id = p_farm_id).
  -- reverted_at IS NULL + deleted_at IS NULL.
  -- ------------------------------------------------------------------
  select coalesce(sum(
    coalesce(p.monto_usd,
      case
        when coalesce(p.currency, 'USD') = 'USD' then coalesce(p.monto, 0)
        when coalesce(p.exchange_rate, 0) > 0 then coalesce(p.monto, 0) / p.exchange_rate
        else coalesce(p.monto, 0)
      end
    ), 0
  ), 0)
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

-- Permisos: solo usuarios autenticados pueden ejecutar el RPC.
revoke all on function public.get_farm_balance(uuid, uuid) from public;
grant execute on function public.get_farm_balance(uuid, uuid) to authenticated;
