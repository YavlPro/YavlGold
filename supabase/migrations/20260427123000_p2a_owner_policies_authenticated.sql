-- P2-A RLS hardening: explicit authenticated role + initPlan auth.uid()
-- Purpose: preserve owner-based access while improving policy clarity/performance.

begin;

-- public.agro_period_cycles
drop policy if exists "user_own_period_cycles_select" on public.agro_period_cycles;
create policy "user_own_period_cycles_select"
on public.agro_period_cycles
for select
to authenticated
using (((select auth.uid()) = user_id));

drop policy if exists "user_own_period_cycles_insert" on public.agro_period_cycles;
create policy "user_own_period_cycles_insert"
on public.agro_period_cycles
for insert
to authenticated
with check (((select auth.uid()) = user_id));

drop policy if exists "user_own_period_cycles_update" on public.agro_period_cycles;
create policy "user_own_period_cycles_update"
on public.agro_period_cycles
for update
to authenticated
using (((select auth.uid()) = user_id))
with check (((select auth.uid()) = user_id));

drop policy if exists "user_own_period_cycles_delete" on public.agro_period_cycles;
create policy "user_own_period_cycles_delete"
on public.agro_period_cycles
for delete
to authenticated
using (((select auth.uid()) = user_id));

-- public.agro_crops
drop policy if exists "Users can view own crops" on public.agro_crops;
create policy "Users can view own crops"
on public.agro_crops
for select
to authenticated
using (((select auth.uid()) = user_id));

drop policy if exists "Users can insert own crops" on public.agro_crops;
create policy "Users can insert own crops"
on public.agro_crops
for insert
to authenticated
with check (((select auth.uid()) = user_id));

drop policy if exists "Users can update own crops" on public.agro_crops;
create policy "Users can update own crops"
on public.agro_crops
for update
to authenticated
using (((select auth.uid()) = user_id))
with check (((select auth.uid()) = user_id));

drop policy if exists "Users can delete own crops" on public.agro_crops;
create policy "Users can delete own crops"
on public.agro_crops
for delete
to authenticated
using (((select auth.uid()) = user_id));

-- public.agro_roi_calculations
drop policy if exists "Users can view own ROI calculations" on public.agro_roi_calculations;
create policy "Users can view own ROI calculations"
on public.agro_roi_calculations
for select
to authenticated
using (((select auth.uid()) = user_id));

drop policy if exists "Users can insert own ROI calculations" on public.agro_roi_calculations;
create policy "Users can insert own ROI calculations"
on public.agro_roi_calculations
for insert
to authenticated
with check (((select auth.uid()) = user_id));

drop policy if exists "Users can delete own ROI calculations" on public.agro_roi_calculations;
create policy "Users can delete own ROI calculations"
on public.agro_roi_calculations
for delete
to authenticated
using (((select auth.uid()) = user_id));

notify pgrst, 'reload schema';

commit;
