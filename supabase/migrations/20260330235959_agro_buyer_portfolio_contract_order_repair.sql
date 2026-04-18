-- REPAIR MIGRATION - YavlGold Agro buyer portfolio RPC contract order
-- Created on: 2026-04-18
-- Versioned before: 20260331000000_agro_buyer_portfolio_include_zero_buyers.sql
--
-- Purpose:
-- Allow the legacy zero-buyer patch to recreate
-- public.agro_buyer_portfolio_summary_v1() with its short RETURNS TABLE shape.
--
-- Reason:
-- A clean bootstrap/reset from canonical root supabase/ failed because
-- 20260330173000 creates the RPC with extended OUT parameters:
-- canonical_name text, client_status text.
-- The following migration, 20260331000000, uses CREATE OR REPLACE FUNCTION with
-- the older short OUT parameter list. PostgreSQL rejects that because CREATE OR
-- REPLACE cannot change the row type defined by OUT parameters.
--
-- This file is intentionally ordered before 20260331000000 as a sequence
-- repair. It does not claim to have been created on 2026-03-30.
--
-- Scope:
-- Drop only the RPC before the incompatible legacy replacement runs. The final
-- current contract is restored later by
-- 20260418120000_agro_buyer_portfolio_contract_restore.sql.

begin;

drop function if exists public.agro_buyer_portfolio_summary_v1();

notify pgrst, 'reload schema';

commit;
