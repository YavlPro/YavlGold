-- Migración: Agregar farm_id a ciclos operativos y sus movimientos
-- Fecha: 2026-06-04
-- Propósito: Permitir asociar ciclos operativos a fincas específicas

begin;

-- agro_operational_cycles
alter table public.agro_operational_cycles
  add column if not exists farm_id uuid null references public.agro_farms(id) on delete set null;

comment on column public.agro_operational_cycles.farm_id is
  'Finca asociada al ciclo operativo. Nullable: null = sin finca asociada; set = ciclo operativo de finca específica.';

create index if not exists agro_operational_cycles_user_farm_idx
  on public.agro_operational_cycles (user_id, farm_id)
  where farm_id is not null;

-- agro_operational_movements
alter table public.agro_operational_movements
  add column if not exists farm_id uuid null references public.agro_farms(id) on delete set null;

comment on column public.agro_operational_movements.farm_id is
  'Finca asociada al movimiento de ciclo operativo. Nullable: null = sin finca asociada; set = movimiento de finca específica.';

create index if not exists agro_operational_movements_user_farm_idx
  on public.agro_operational_movements (user_id, farm_id)
  where farm_id is not null;

-- Notify postgrest to reload the schema cache
notify pgrst, 'reload schema';

commit;
