-- ==========================================================================
-- YavlGold Agro — Add farm_id to movement tables
-- Permits registering general farm movements (not tied to a specific crop).
-- Follows the pattern established in 20260530090000_agro_farms_resources.sql.
-- ==========================================================================

begin;

-- agro_expenses
alter table public.agro_expenses
  add column if not exists farm_id uuid null references public.agro_farms(id) on delete set null;

-- agro_income
alter table public.agro_income
  add column if not exists farm_id uuid null references public.agro_farms(id) on delete set null;

-- agro_pending (fiados)
alter table public.agro_pending
  add column if not exists farm_id uuid null references public.agro_farms(id) on delete set null;

-- agro_losses
alter table public.agro_losses
  add column if not exists farm_id uuid null references public.agro_farms(id) on delete set null;

-- agro_transfers (donaciones)
alter table public.agro_transfers
  add column if not exists farm_id uuid null references public.agro_farms(id) on delete set null;

-- Partial indexes for farm-scoped queries (same pattern as agro_crops)
create index if not exists agro_expenses_user_farm_idx
  on public.agro_expenses (user_id, farm_id)
  where deleted_at is null and farm_id is not null;

create index if not exists agro_income_user_farm_idx
  on public.agro_income (user_id, farm_id)
  where deleted_at is null and farm_id is not null;

create index if not exists agro_pending_user_farm_idx
  on public.agro_pending (user_id, farm_id)
  where deleted_at is null and farm_id is not null;

create index if not exists agro_losses_user_farm_idx
  on public.agro_losses (user_id, farm_id)
  where deleted_at is null and farm_id is not null;

create index if not exists agro_transfers_user_farm_idx
  on public.agro_transfers (user_id, farm_id)
  where deleted_at is null and farm_id is not null;

-- Column documentation
comment on column public.agro_expenses.farm_id is
  'Finca asociada al gasto. Nullable: null = gasto de cultivo o legacy; set = gasto general de finca.';
comment on column public.agro_income.farm_id is
  'Finca asociada al ingreso. Nullable: null = ingreso de cultivo o legacy; set = ingreso general de finca.';
comment on column public.agro_pending.farm_id is
  'Finca asociada al fiado. Nullable: null = fiado de cultivo o legacy; set = fiado general de finca.';
comment on column public.agro_losses.farm_id is
  'Finca asociada a la pérdida. Nullable: null = pérdida de cultivo o legacy; set = pérdida general de finca.';
comment on column public.agro_transfers.farm_id is
  'Finca asociada a la donación. Nullable: null = donación de cultivo o legacy; set = donación general de finca.';

notify pgrst, 'reload schema';

commit;
