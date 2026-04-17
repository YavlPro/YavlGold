-- REPAIR MIGRATION - YavlGold Agro facturero/Cartera Viva baseline order
-- Created on: 2026-04-17
-- Versioned before: 20260327001037_agro_buyer_foundation_v4.sql
--
-- Purpose:
-- Establish the base facturero/Cartera Viva movement tables before the buyer
-- foundation patch runs.
--
-- Reason:
-- A clean bootstrap/reset from canonical root supabase/ failed because
-- 20260327001037 creates indexes and reads public.agro_pending,
-- public.agro_income and public.agro_losses before any root migration creates
-- those tables.
--
-- This file is intentionally ordered before 20260327001037 as a sequence
-- repair. It does not claim to have been created on 2026-03-27.
--
-- Scope:
-- Create the canonical root baseline for the facturero movement tables that
-- earlier root migrations already tried to patch defensively:
-- agro_pending, agro_income, agro_losses, agro_expenses and agro_transfers.
-- apps/gold/supabase/ remains non-canonical and is not used as source here.

begin;

create extension if not exists pgcrypto;

create table if not exists public.agro_pending (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    crop_id uuid references public.agro_crops(id) on delete set null,
    fecha date not null default current_date,
    concepto text not null default '',
    cliente text,
    monto numeric not null default 0,
    monto_usd numeric,
    currency text default 'USD',
    exchange_rate numeric default 1,
    unit_type text,
    unit_qty numeric,
    quantity_kg numeric,
    evidence_url text,
    buyer_id uuid references public.agro_buyers(id) on delete set null,
    buyer_group_key text,
    buyer_match_status text,
    transferred_at timestamptz,
    transferred_income_id text,
    transferred_by uuid,
    transferred_to text,
    transfer_state text default 'active',
    split_from_id uuid,
    split_meta jsonb,
    reverted_at timestamptz,
    reverted_reason text,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint agro_pending_currency_check
        check (currency is null or currency in ('USD', 'COP', 'VES'))
);

create table if not exists public.agro_income (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    crop_id uuid references public.agro_crops(id) on delete set null,
    fecha date not null default current_date,
    concepto text not null default '',
    categoria text not null default 'general',
    monto numeric not null default 0,
    monto_usd numeric,
    currency text default 'USD',
    exchange_rate numeric default 1,
    unit_type text,
    unit_qty numeric,
    quantity_kg numeric,
    soporte_url text,
    buyer_id uuid references public.agro_buyers(id) on delete set null,
    buyer_group_key text,
    buyer_match_status text,
    origin_table text,
    origin_id uuid,
    transfer_state text default 'active',
    split_from_id uuid,
    split_meta jsonb,
    reverted_at timestamptz,
    reverted_reason text,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint agro_income_currency_check
        check (currency is null or currency in ('USD', 'COP', 'VES'))
);

create table if not exists public.agro_losses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    crop_id uuid references public.agro_crops(id) on delete set null,
    fecha date not null default current_date,
    concepto text not null default '',
    causa text,
    monto numeric not null default 0,
    monto_usd numeric,
    currency text default 'USD',
    exchange_rate numeric default 1,
    unit_type text,
    unit_qty numeric,
    quantity_kg numeric,
    evidence_url text,
    buyer_id uuid references public.agro_buyers(id) on delete set null,
    buyer_group_key text,
    buyer_match_status text,
    origin_table text,
    origin_id uuid,
    transfer_state text default 'active',
    split_from_id uuid,
    split_meta jsonb,
    reverted_at timestamptz,
    reverted_reason text,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint agro_losses_currency_check
        check (currency is null or currency in ('USD', 'COP', 'VES'))
);

create table if not exists public.agro_expenses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    crop_id uuid references public.agro_crops(id) on delete set null,
    date date not null default current_date,
    concept text not null default '',
    amount numeric not null default 0,
    category text not null default 'general',
    monto_usd numeric,
    currency text default 'USD',
    exchange_rate numeric default 1,
    unit_type text,
    unit_qty numeric,
    quantity_kg numeric,
    split_from_id uuid,
    split_meta jsonb,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint agro_expenses_currency_check
        check (currency is null or currency in ('USD', 'COP', 'VES'))
);

create table if not exists public.agro_transfers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    crop_id uuid references public.agro_crops(id) on delete set null,
    fecha date not null default current_date,
    concepto text not null default '',
    destino text,
    monto numeric not null default 0,
    monto_usd numeric,
    currency text default 'USD',
    exchange_rate numeric default 1,
    unit_type text,
    unit_qty numeric,
    quantity_kg numeric,
    split_from_id uuid,
    split_meta jsonb,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint agro_transfers_currency_check
        check (currency is null or currency in ('USD', 'COP', 'VES'))
);

create index if not exists agro_pending_user_id_idx on public.agro_pending (user_id);
create index if not exists agro_pending_user_crop_id_idx on public.agro_pending (user_id, crop_id);
create index if not exists agro_income_user_id_idx on public.agro_income (user_id);
create index if not exists agro_income_user_crop_id_idx on public.agro_income (user_id, crop_id);
create index if not exists agro_losses_user_id_idx on public.agro_losses (user_id);
create index if not exists agro_losses_user_crop_id_idx on public.agro_losses (user_id, crop_id);
create index if not exists agro_expenses_user_id_idx on public.agro_expenses (user_id);
create index if not exists agro_expenses_user_crop_id_idx on public.agro_expenses (user_id, crop_id);
create index if not exists agro_transfers_user_id_idx on public.agro_transfers (user_id);
create index if not exists agro_transfers_user_crop_id_idx on public.agro_transfers (user_id, crop_id);

do $$
declare
    v_table text;
    v_policy text;
begin
    foreach v_table in array array[
        'agro_pending',
        'agro_income',
        'agro_losses',
        'agro_expenses',
        'agro_transfers'
    ]
    loop
        execute format('alter table public.%I enable row level security', v_table);

        v_policy := v_table || '_select_own';
        if not exists (
            select 1 from pg_policies
            where schemaname = 'public'
              and tablename = v_table
              and policyname = v_policy
        ) then
            execute format(
                'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
                v_policy,
                v_table
            );
        end if;

        v_policy := v_table || '_insert_own';
        if not exists (
            select 1 from pg_policies
            where schemaname = 'public'
              and tablename = v_table
              and policyname = v_policy
        ) then
            execute format(
                'create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)',
                v_policy,
                v_table
            );
        end if;

        v_policy := v_table || '_update_own';
        if not exists (
            select 1 from pg_policies
            where schemaname = 'public'
              and tablename = v_table
              and policyname = v_policy
        ) then
            execute format(
                'create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
                v_policy,
                v_table
            );
        end if;

        v_policy := v_table || '_delete_own';
        if not exists (
            select 1 from pg_policies
            where schemaname = 'public'
              and tablename = v_table
              and policyname = v_policy
        ) then
            execute format(
                'create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)',
                v_policy,
                v_table
            );
        end if;
    end loop;
end $$;

comment on table public.agro_pending is
'Facturero Agro: cartera pendiente/fiados del agricultor. Repair migration created on 2026-04-17 to restore canonical root bootstrap order.';
comment on table public.agro_income is
'Facturero Agro: ingresos registrados. Repair migration created on 2026-04-17 to restore canonical root bootstrap order.';
comment on table public.agro_losses is
'Facturero Agro: perdidas registradas. Repair migration created on 2026-04-17 to restore canonical root bootstrap order.';
comment on table public.agro_expenses is
'Facturero Agro: gastos registrados. Repair migration created on 2026-04-17 to restore canonical root bootstrap order.';
comment on table public.agro_transfers is
'Facturero Agro: transferencias/donaciones registradas. Repair migration created on 2026-04-17 to restore canonical root bootstrap order.';

notify pgrst, 'reload schema';

commit;
