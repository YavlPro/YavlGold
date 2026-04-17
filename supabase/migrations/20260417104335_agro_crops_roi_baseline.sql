-- =====================================================
-- YavlGold V1 - Baseline canonico Agro crops + ROI
-- Fecha: 2026-04-17
--
-- Esta migracion NO recrea historia antigua.
-- Representa en el canon raiz el estado remoto observado para:
-- - public.agro_crops
-- - public.agro_roi_calculations
--
-- Es forward-only e idempotente para proyectos donde las tablas
-- ya existen. Por timestamp actual, no corrige por si sola el orden
-- historico de migraciones antiguas que ya hacen ALTER sobre
-- public.agro_crops antes de este archivo.
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- public.agro_crops
-- =====================================================

create table if not exists public.agro_crops (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    variety text,
    icon text default '🌱',
    status text not null default 'growing',
    progress integer not null default 0,
    area_size numeric(10,2) not null default 0,
    investment numeric(12,2) not null default 0,
    start_date date not null default current_date,
    expected_harvest_date date,
    actual_harvest_date date,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    revenue_projected numeric default 0,
    deleted_at timestamptz,
    status_mode text,
    status_override text,
    constraint agro_crops_progress_check
        check (progress >= 0 and progress <= 100),
    constraint agro_crops_status_check
        check (status in ('sembrado', 'creciendo', 'produccion', 'finalizado', 'lost'))
);

alter table public.agro_crops
    add column if not exists revenue_projected numeric default 0,
    add column if not exists deleted_at timestamptz,
    add column if not exists status_mode text,
    add column if not exists status_override text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace nsp on nsp.oid = rel.relnamespace
        where nsp.nspname = 'public'
          and rel.relname = 'agro_crops'
          and con.conname = 'agro_crops_progress_check'
    ) then
        alter table public.agro_crops
            add constraint agro_crops_progress_check
            check (progress >= 0 and progress <= 100)
            not valid;

        if not exists (
            select 1 from public.agro_crops
            where progress < 0 or progress > 100
        ) then
            alter table public.agro_crops validate constraint agro_crops_progress_check;
        end if;
    end if;

    if not exists (
        select 1
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace nsp on nsp.oid = rel.relnamespace
        where nsp.nspname = 'public'
          and rel.relname = 'agro_crops'
          and con.conname = 'agro_crops_status_check'
    ) then
        alter table public.agro_crops
            add constraint agro_crops_status_check
            check (status in ('sembrado', 'creciendo', 'produccion', 'finalizado', 'lost'))
            not valid;

        if not exists (
            select 1 from public.agro_crops
            where status not in ('sembrado', 'creciendo', 'produccion', 'finalizado', 'lost')
        ) then
            alter table public.agro_crops validate constraint agro_crops_status_check;
        end if;
    end if;
end $$;

create index if not exists idx_agro_crops_user_id
    on public.agro_crops (user_id);

create index if not exists idx_agro_crops_status
    on public.agro_crops (status);

create index if not exists idx_agro_crops_deleted_at
    on public.agro_crops (deleted_at)
    where deleted_at is null;

create or replace function public.update_agro_crops_timestamp()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_agro_crops_updated
    on public.agro_crops;

create trigger trigger_agro_crops_updated
    before update on public.agro_crops
    for each row
    execute function public.update_agro_crops_timestamp();

alter table public.agro_crops enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_crops'
          and policyname = 'Users can view own crops'
    ) then
        execute $policy$
            create policy "Users can view own crops"
            on public.agro_crops
            for select
            using (auth.uid() = user_id)
        $policy$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_crops'
          and policyname = 'Users can insert own crops'
    ) then
        execute $policy$
            create policy "Users can insert own crops"
            on public.agro_crops
            for insert
            with check (auth.uid() = user_id)
        $policy$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_crops'
          and policyname = 'Users can update own crops'
    ) then
        execute $policy$
            create policy "Users can update own crops"
            on public.agro_crops
            for update
            using (auth.uid() = user_id)
            with check (auth.uid() = user_id)
        $policy$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_crops'
          and policyname = 'Users can delete own crops'
    ) then
        execute $policy$
            create policy "Users can delete own crops"
            on public.agro_crops
            for delete
            using (auth.uid() = user_id)
        $policy$;
    end if;
end $$;

comment on table public.agro_crops is
    'Cultivos activos e historicos de cada agricultor en YavlGold Agro';

comment on column public.agro_crops.status is
    'Crop status: sembrado (planted), creciendo (growing), produccion (producing), finalizado (finished)';

-- =====================================================
-- public.agro_roi_calculations
-- =====================================================

create table if not exists public.agro_roi_calculations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    investment_amount numeric(12,2) not null,
    projected_revenue numeric(12,2) not null,
    quantity_kg numeric(12,2),
    calculated_profit numeric(12,2) not null,
    roi_percentage numeric(8,2) not null,
    crop_id uuid references public.agro_crops(id) on delete set null,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_agro_roi_user_id
    on public.agro_roi_calculations (user_id);

create index if not exists idx_agro_roi_created_at
    on public.agro_roi_calculations (created_at desc);

alter table public.agro_roi_calculations enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_roi_calculations'
          and policyname = 'Users can view own ROI calculations'
    ) then
        execute $policy$
            create policy "Users can view own ROI calculations"
            on public.agro_roi_calculations
            for select
            using (auth.uid() = user_id)
        $policy$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_roi_calculations'
          and policyname = 'Users can insert own ROI calculations'
    ) then
        execute $policy$
            create policy "Users can insert own ROI calculations"
            on public.agro_roi_calculations
            for insert
            with check (auth.uid() = user_id)
        $policy$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_roi_calculations'
          and policyname = 'Users can delete own ROI calculations'
    ) then
        execute $policy$
            create policy "Users can delete own ROI calculations"
            on public.agro_roi_calculations
            for delete
            using (auth.uid() = user_id)
        $policy$;
    end if;
end $$;

comment on table public.agro_roi_calculations is
    'Historial de calculos ROI realizados en la calculadora Agro';

comment on column public.agro_roi_calculations.roi_percentage is
    'ROI calculado como (profit/investment)*100';
