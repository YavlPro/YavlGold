-- YavlGold Agro Operational RLS indexes
-- Purpose: improve owner-scoped RLS performance without changing policy behavior.

create index if not exists agro_operational_cycles_user_id_idx
  on public.agro_operational_cycles using btree (user_id);

create index if not exists agro_operational_movements_user_id_idx
  on public.agro_operational_movements using btree (user_id);
