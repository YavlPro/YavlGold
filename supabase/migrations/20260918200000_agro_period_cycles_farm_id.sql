-- Migración: Agregar farm_id a ciclos de período (ANEXO 30 S1)
-- Fecha: 2026-09-18
-- Propósito: Atar cada ciclo de período a una finca específica (alcance A).
-- Backfill: las filas existentes quedan con farm_id NULL = bucket "Vista
-- general" (decisión D-30-2). Aplicación a remoto: exclusiva del owner.

begin;

alter table public.agro_period_cycles
  add column if not exists farm_id uuid null references public.agro_farms(id) on delete set null;

comment on column public.agro_period_cycles.farm_id is
  'Finca asociada al ciclo de período. Nullable: null = período histórico del bucket Vista general (D-30-2); set = período de una finca específica.';

-- Único parcial: un período vivo por (usuario, finca, año, mes).
-- Nota: en índices únicos de PostgreSQL los NULL no colisionan entre sí, así
-- que el guard de duplicado del bucket Vista general (NULL) queda a cargo de
-- la aplicación (agro-period-cycles.js), igual que el guard por mes+finca.
drop index if exists agro_period_cycles_user_period_unique;
create unique index if not exists agro_period_cycles_user_farm_period_unique
  on public.agro_period_cycles (user_id, farm_id, period_year, period_month)
  where deleted_at is null;

create index if not exists agro_period_cycles_user_farm_idx
  on public.agro_period_cycles (user_id, farm_id)
  where farm_id is not null;

-- Notify postgrest to reload the schema cache
notify pgrst, 'reload schema';

commit;
