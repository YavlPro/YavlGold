-- REPAIR MIGRATION - YavlGold Agro crops baseline order
-- Created on: 2026-04-17
-- Versioned before: 20260224200000_agro_crops_status_allow_lost.sql
--
-- Purpose:
-- Establish public.agro_crops before the status "allow lost" patch runs.
--
-- Reason:
-- A clean bootstrap/reset from canonical root supabase/ failed because
-- 20260224200000 alters public.agro_crops before the existing root baseline
-- 20260417104335 creates it.
--
-- This file is intentionally ordered before 20260224200000 as a sequence repair.
-- It does not claim to have been created on 2026-02-24.
--
-- Scope:
-- Create only public.agro_crops here. public.agro_roi_calculations is not
-- needed before 20260224200000 and remains covered by the later canonical
-- baseline migration.

create extension if not exists pgcrypto;

create table if not exists public.agro_crops (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    variety text,
    icon text default '🌱',
    status text not null default 'sembrado',
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
    investment_amount numeric,
    investment_currency text,
    investment_usd_equiv numeric,
    investment_fx_usd_cop numeric,
    investment_fx_usd_ves numeric,
    investment_fx_at timestamptz,
    constraint agro_crops_progress_check
        check (progress >= 0 and progress <= 100),
    constraint agro_crops_status_check
        check (status in ('sembrado', 'creciendo', 'produccion', 'finalizado', 'lost'))
);
