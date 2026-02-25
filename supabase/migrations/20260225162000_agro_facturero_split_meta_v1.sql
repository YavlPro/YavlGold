-- V1: Trazabilidad de transferencias parciales por unidades en Facturero
-- Agrega metadatos de split sin crear tablas nuevas.

alter table if exists public.agro_expenses
    add column if not exists split_from_id uuid,
    add column if not exists split_meta jsonb;

alter table if exists public.agro_income
    add column if not exists split_from_id uuid,
    add column if not exists split_meta jsonb;

alter table if exists public.agro_pending
    add column if not exists split_from_id uuid,
    add column if not exists split_meta jsonb;

alter table if exists public.agro_losses
    add column if not exists split_from_id uuid,
    add column if not exists split_meta jsonb;

alter table if exists public.agro_transfers
    add column if not exists split_from_id uuid,
    add column if not exists split_meta jsonb;
