-- =====================================================
-- YavlGold V1 - Consolidacion canonica de objetos legacy
-- Fecha: 2026-04-16
--
-- Esta migracion NO recrea historia antigua.
-- Representa en el canon raiz objetos vivos que nacieron en
-- apps/gold/supabase/ y/o ya existen en remoto por otra via.
-- Debe ser forward-only e idempotente.
-- =====================================================

-- =====================================================
-- Global announcements + app admins
-- =====================================================

create table if not exists public.announcements (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    message text not null,
    type text default 'info'
        check (type in ('info', 'warning', 'danger', 'success')),
    is_active boolean default true,
    created_at timestamptz default now()
);

comment on table public.announcements is
    'Global announcements/alerts for authenticated users.';

create index if not exists idx_announcements_active
    on public.announcements (is_active)
    where is_active = true;

create index if not exists idx_announcements_created
    on public.announcements (created_at desc);

alter table public.announcements enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'announcements'
          and policyname = 'Users view active announcements'
    ) then
        execute $policy$
            create policy "Users view active announcements"
            on public.announcements
            for select
            to authenticated
            using (is_active = true)
        $policy$;
    end if;
end $$;

create table if not exists public.app_admins (
    user_id uuid primary key references auth.users(id),
    role text default 'superadmin'
        check (role is null or role in ('superadmin', 'moderator', 'support')),
    notes text,
    created_at timestamptz default now()
);

comment on table public.app_admins is
    'Application administrators with elevated permissions.';

alter table public.app_admins enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace nsp on nsp.oid = rel.relnamespace
        where nsp.nspname = 'public'
          and rel.relname = 'app_admins'
          and con.conname = 'app_admins_role_check'
    ) then
        alter table public.app_admins
            add constraint app_admins_role_check
            check (role is null or role in ('superadmin', 'moderator', 'support'))
            not valid;

        if not exists (
            select 1 from public.app_admins
            where role is not null
              and role not in ('superadmin', 'moderator', 'support')
        ) then
            alter table public.app_admins validate constraint app_admins_role_check;
        end if;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'app_admins'
          and policyname = 'Users can check own admin status'
    ) then
        execute $policy$
            create policy "Users can check own admin status"
            on public.app_admins
            for select
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'announcements'
          and policyname = 'Admins manage announcements'
    ) then
        execute $policy$
            create policy "Admins manage announcements"
            on public.announcements
            for all
            to authenticated
            using (
                exists (
                    select 1 from public.app_admins
                    where app_admins.user_id = auth.uid()
                )
            )
            with check (
                exists (
                    select 1 from public.app_admins
                    where app_admins.user_id = auth.uid()
                )
            )
        $policy$;
    end if;
end $$;

-- =====================================================
-- Dashboard notifications + general feedback
-- =====================================================

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    message text,
    type text default 'info'
        check (type in ('info', 'success', 'warning', 'alert')),
    is_read boolean default false,
    created_at timestamptz default now()
);

comment on table public.notifications is
    'User notifications for dashboard alerts.';

create index if not exists idx_notifications_user
    on public.notifications (user_id);

create index if not exists idx_notifications_unread
    on public.notifications (user_id, is_read)
    where is_read = false;

alter table public.notifications enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'notifications'
          and policyname = 'Users can see their own notifications'
    ) then
        execute $policy$
            create policy "Users can see their own notifications"
            on public.notifications
            for select
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'notifications'
          and policyname = 'Users can mark own as read'
    ) then
        execute $policy$
            create policy "Users can mark own as read"
            on public.notifications
            for update
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;
end $$;

create table if not exists public.feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    type text default 'other'
        check (type in ('bug', 'idea', 'question', 'other')),
    message text not null,
    page_url text,
    user_agent text,
    created_at timestamptz default now()
);

comment on table public.feedback is
    'User feedback and bug reports.';

create index if not exists idx_feedback_user
    on public.feedback (user_id);

create index if not exists idx_feedback_type
    on public.feedback (type);

alter table public.feedback enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'feedback'
          and policyname = 'Users can insert feedback'
    ) then
        execute $policy$
            create policy "Users can insert feedback"
            on public.feedback
            for insert
            to authenticated
            with check (auth.uid() = user_id)
        $policy$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'feedback'
          and policyname = 'Users can view own feedback'
    ) then
        execute $policy$
            create policy "Users can view own feedback"
            on public.feedback
            for select
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;
end $$;

-- =====================================================
-- User favorites
-- =====================================================

create table if not exists public.user_favorites (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    module_key text not null,
    created_at timestamptz default now(),
    unique (user_id, module_key)
);

comment on table public.user_favorites is
    'Stores user favorite modules for quick access.';

do $$
begin
    if not exists (
        select 1
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace nsp on nsp.oid = rel.relnamespace
        where nsp.nspname = 'public'
          and rel.relname = 'user_favorites'
          and con.conname = 'user_favorites_user_id_module_key_key'
    )
    and not exists (
        select 1
        from (
            select user_id, module_key
            from public.user_favorites
            group by user_id, module_key
            having count(*) > 1
        ) duplicates
    ) then
        alter table public.user_favorites
            add constraint user_favorites_user_id_module_key_key
            unique (user_id, module_key);
    end if;
end $$;

create index if not exists idx_favorites_user
    on public.user_favorites (user_id);

create index if not exists idx_favorites_module
    on public.user_favorites (module_key);

alter table public.user_favorites enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'user_favorites'
          and policyname = 'Users manage their own favorites'
    ) then
        execute $policy$
            create policy "Users manage their own favorites"
            on public.user_favorites
            for all
            to authenticated
            using (auth.uid() = user_id)
            with check (auth.uid() = user_id)
        $policy$;
    end if;
end $$;

-- =====================================================
-- User onboarding context
-- =====================================================

create table if not exists public.user_onboarding_context (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null
        check (char_length(trim(display_name)) between 2 and 80),
    agro_relation text not null
        check (agro_relation in ('producer', 'supporting', 'exploring')),
    farm_name text
        check (
            farm_name is null
            or char_length(trim(farm_name)) between 2 and 120
        ),
    main_activity text
        check (
            main_activity is null
            or main_activity in ('cultivation', 'sales', 'planning', 'learning', 'other')
        ),
    entry_preference text not null
        check (
            entry_preference in (
                'agro_dashboard',
                'agro_operations',
                'agro_reports',
                'learning_path'
            )
        ),
    onboarding_completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.user_onboarding_context is
    'Minimal onboarding context for first authenticated access in YavlGold Agro.';

create or replace function public.set_user_onboarding_context_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_onboarding_context_updated_at
    on public.user_onboarding_context;

create trigger trg_user_onboarding_context_updated_at
    before update on public.user_onboarding_context
    for each row
    execute function public.set_user_onboarding_context_updated_at();

alter table public.user_onboarding_context enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'user_onboarding_context'
          and policyname = 'Users can view own onboarding context'
    ) then
        execute $policy$
            create policy "Users can view own onboarding context"
            on public.user_onboarding_context
            for select
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'user_onboarding_context'
          and policyname = 'Users can insert own onboarding context'
    ) then
        execute $policy$
            create policy "Users can insert own onboarding context"
            on public.user_onboarding_context
            for insert
            to authenticated
            with check (auth.uid() = user_id)
        $policy$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'user_onboarding_context'
          and policyname = 'Users can update own onboarding context'
    ) then
        execute $policy$
            create policy "Users can update own onboarding context"
            on public.user_onboarding_context
            for update
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;
end $$;

-- =====================================================
-- IA context fields for farmer profile
-- =====================================================

do $$
begin
    if to_regclass('public.agro_farmer_profile') is not null then
        alter table public.agro_farmer_profile
            add column if not exists experience_level text;

        alter table public.agro_farmer_profile
            add column if not exists farm_type text;

        alter table public.agro_farmer_profile
            add column if not exists assistant_goals jsonb default '[]'::jsonb;

        if not exists (
            select 1
            from pg_constraint con
            join pg_class rel on rel.oid = con.conrelid
            join pg_namespace nsp on nsp.oid = rel.relnamespace
            where nsp.nspname = 'public'
              and rel.relname = 'agro_farmer_profile'
              and con.conname = 'agro_farmer_profile_experience_level_check'
        ) then
            alter table public.agro_farmer_profile
                add constraint agro_farmer_profile_experience_level_check
                check (
                    experience_level is null
                    or experience_level in ('principiante', 'intermedio', 'experto')
                )
                not valid;

            if not exists (
                select 1 from public.agro_farmer_profile
                where experience_level is not null
                  and experience_level not in ('principiante', 'intermedio', 'experto')
            ) then
                alter table public.agro_farmer_profile
                    validate constraint agro_farmer_profile_experience_level_check;
            end if;
        end if;

        if not exists (
            select 1
            from pg_constraint con
            join pg_class rel on rel.oid = con.conrelid
            join pg_namespace nsp on nsp.oid = rel.relnamespace
            where nsp.nspname = 'public'
              and rel.relname = 'agro_farmer_profile'
              and con.conname = 'agro_farmer_profile_farm_type_check'
        ) then
            alter table public.agro_farmer_profile
                add constraint agro_farmer_profile_farm_type_check
                check (
                    farm_type is null
                    or farm_type in ('campo_abierto', 'invernadero', 'mixto', 'urbano')
                )
                not valid;

            if not exists (
                select 1 from public.agro_farmer_profile
                where farm_type is not null
                  and farm_type not in ('campo_abierto', 'invernadero', 'mixto', 'urbano')
            ) then
                alter table public.agro_farmer_profile
                    validate constraint agro_farmer_profile_farm_type_check;
            end if;
        end if;

        comment on column public.agro_farmer_profile.experience_level is
            'Self-reported farming experience level for IA context personalization.';
        comment on column public.agro_farmer_profile.farm_type is
            'Type of farm operation for IA context.';
        comment on column public.agro_farmer_profile.assistant_goals is
            'Array of strings indicating what the user expects from the IA assistant.';
    end if;
end $$;

-- =====================================================
-- Agro operational cycles
-- =====================================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

do $$
begin
    if to_regclass('public.agro_crops') is not null then
        execute $ddl$
            create table if not exists public.agro_operational_cycles (
                id uuid primary key default gen_random_uuid(),
                user_id uuid not null references auth.users(id),
                name text not null,
                description text,
                economic_type text not null
                    check (economic_type in ('expense', 'income', 'donation', 'loss')),
                category text not null default 'other'
                    check (category in ('tools', 'maintenance', 'labor', 'transport', 'supplies', 'other')),
                crop_id uuid references public.agro_crops(id),
                status text not null default 'open'
                    check (status in ('open', 'in_progress', 'compensating', 'closed', 'lost')),
                opened_at date not null default current_date,
                closed_at date,
                notes text,
                created_at timestamptz default now(),
                updated_at timestamptz default now()
            )
        $ddl$;

        execute $ddl$
            alter table public.agro_operational_cycles enable row level security
        $ddl$;

        execute $ddl$
            drop trigger if exists trg_cycles_updated_at
            on public.agro_operational_cycles
        $ddl$;

        execute $ddl$
            create trigger trg_cycles_updated_at
                before update on public.agro_operational_cycles
                for each row
                execute function public.update_updated_at()
        $ddl$;

        execute $ddl$
            create table if not exists public.agro_operational_movements (
                id uuid primary key default gen_random_uuid(),
                user_id uuid not null references auth.users(id),
                cycle_id uuid not null references public.agro_operational_cycles(id) on delete cascade,
                direction text not null
                    check (direction in ('out', 'in')),
                amount numeric,
                currency text default 'COP',
                amount_usd numeric,
                exchange_rate numeric,
                concept text,
                movement_date date not null default current_date,
                quantity numeric,
                unit_type text
                    check (unit_type is null or unit_type in ('unidad', 'saco', 'kg')),
                created_at timestamptz default now()
            )
        $ddl$;

        execute $ddl$
            alter table public.agro_operational_movements enable row level security
        $ddl$;
    end if;
end $$;

do $$
begin
    if to_regclass('public.agro_operational_cycles') is not null
    and not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_operational_cycles'
          and policyname = 'user_own_cycles_select'
    ) then
        execute $policy$
            create policy "user_own_cycles_select"
            on public.agro_operational_cycles
            for select
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;

    if to_regclass('public.agro_operational_cycles') is not null
    and not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_operational_cycles'
          and policyname = 'user_own_cycles_insert'
    ) then
        execute $policy$
            create policy "user_own_cycles_insert"
            on public.agro_operational_cycles
            for insert
            to authenticated
            with check (auth.uid() = user_id)
        $policy$;
    end if;

    if to_regclass('public.agro_operational_cycles') is not null
    and not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_operational_cycles'
          and policyname = 'user_own_cycles_update'
    ) then
        execute $policy$
            create policy "user_own_cycles_update"
            on public.agro_operational_cycles
            for update
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;

    if to_regclass('public.agro_operational_cycles') is not null
    and not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_operational_cycles'
          and policyname = 'user_own_cycles_delete'
    ) then
        execute $policy$
            create policy "user_own_cycles_delete"
            on public.agro_operational_cycles
            for delete
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;
end $$;

do $$
begin
    if to_regclass('public.agro_operational_movements') is not null
    and not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_operational_movements'
          and policyname = 'user_own_movements_select'
    ) then
        execute $policy$
            create policy "user_own_movements_select"
            on public.agro_operational_movements
            for select
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;

    if to_regclass('public.agro_operational_movements') is not null
    and not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_operational_movements'
          and policyname = 'user_own_movements_insert'
    ) then
        execute $policy$
            create policy "user_own_movements_insert"
            on public.agro_operational_movements
            for insert
            to authenticated
            with check (auth.uid() = user_id)
        $policy$;
    end if;

    if to_regclass('public.agro_operational_movements') is not null
    and not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_operational_movements'
          and policyname = 'user_own_movements_update'
    ) then
        execute $policy$
            create policy "user_own_movements_update"
            on public.agro_operational_movements
            for update
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;

    if to_regclass('public.agro_operational_movements') is not null
    and not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'agro_operational_movements'
          and policyname = 'user_own_movements_delete'
    ) then
        execute $policy$
            create policy "user_own_movements_delete"
            on public.agro_operational_movements
            for delete
            to authenticated
            using (auth.uid() = user_id)
        $policy$;
    end if;
end $$;
