-- REPAIR MIGRATION - YavlGold Agro rankings RPC
-- Created on: 2026-04-17
-- Versioned before: 20260221231722_agro_profit_date_filters_inclusive.sql
--
-- Purpose:
-- Establish public.agro_rank_top_crops_profit(date,date,integer,uuid)
-- before the inclusive date-filter patch that reads it with pg_get_functiondef.
--
-- Reason:
-- A clean bootstrap/reset from canonical root supabase/ failed because
-- 20260221231722 patches a function that was present only in
-- supabase/sql/agro_rankings_rpc_v1.sql, not in an earlier root migration.
--
-- This file is intentionally ordered before 20260221231722 as a sequence repair.
-- It does not claim to have been created on 2026-02-21.

CREATE OR REPLACE FUNCTION public.agro_rank_top_crops_profit(
    p_from date DEFAULT NULL,
    p_to date DEFAULT NULL,
    p_limit integer DEFAULT 5,
    p_crop_id uuid DEFAULT NULL
)
RETURNS TABLE (
    crop_id uuid,
    crop_name text,
    ingresos numeric,
    gastos numeric,
    profit numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
    v_income_amount_expr text := 'COALESCE(monto, 0)';
    v_operational_amount_expr text := 'COALESCE(m.amount, 0)';
    v_income_date_field text := 'fecha';
    v_operational_date_expr text := 'm.movement_date';
    v_inc_sql text;
    v_exp_sql text;
    v_sql text;
BEGIN
    IF v_uid IS NULL THEN
        RETURN;
    END IF;

    IF to_regclass('public.agro_income') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'monto_usd'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'monto'
        ) THEN
            v_income_amount_expr := 'COALESCE(monto_usd, monto, 0)';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'amount'
        ) THEN
            v_income_amount_expr := 'COALESCE(monto_usd, amount, 0)';
        ELSE
            v_income_amount_expr := 'COALESCE(monto_usd, 0)';
        END IF;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'monto'
    ) THEN
        v_income_amount_expr := 'COALESCE(monto, 0)';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'amount'
    ) THEN
        v_income_amount_expr := 'COALESCE(amount, 0)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'date'
    ) THEN
        v_income_date_field := 'date';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'created_at'
    ) THEN
        v_income_date_field := 'created_at';
    END IF;

    IF to_regclass('public.agro_operational_cycles') IS NOT NULL
       AND to_regclass('public.agro_operational_movements') IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agro_operational_movements' AND column_name = 'amount_usd'
        ) THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'agro_operational_movements' AND column_name = 'amount'
            ) THEN
                v_operational_amount_expr := 'COALESCE(m.amount_usd, m.amount, 0)';
            ELSE
                v_operational_amount_expr := 'COALESCE(m.amount_usd, 0)';
            END IF;
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agro_operational_movements' AND column_name = 'amount'
        ) THEN
            v_operational_amount_expr := 'COALESCE(m.amount, 0)';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agro_operational_movements' AND column_name = 'movement_date'
        ) THEN
            v_operational_date_expr := 'm.movement_date';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agro_operational_movements' AND column_name = 'created_at'
        ) THEN
            v_operational_date_expr := 'm.created_at';
        END IF;
    END IF;

    v_inc_sql := format('
        SELECT
            crop_id,
            SUM(%1$s)::numeric AS ingresos
        FROM public.agro_income
        WHERE user_id = $1
          AND crop_id IS NOT NULL
          AND ($2::date IS NULL OR %2$I >= $2::date)
          AND ($3::date IS NULL OR %2$I <= $3::date)
          AND ($4::uuid IS NULL OR crop_id = $4::uuid)
    ', v_income_amount_expr, v_income_date_field);

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'deleted_at'
    ) THEN
        v_inc_sql := v_inc_sql || ' AND deleted_at IS NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'reverted_at'
    ) THEN
        v_inc_sql := v_inc_sql || ' AND reverted_at IS NULL';
    END IF;

    v_inc_sql := v_inc_sql || ' GROUP BY crop_id';

    IF to_regclass('public.agro_operational_cycles') IS NOT NULL
       AND to_regclass('public.agro_operational_movements') IS NOT NULL THEN
        v_exp_sql := format('
            SELECT
                c.crop_id,
                SUM(%1$s)::numeric AS gastos
            FROM public.agro_operational_cycles c
            INNER JOIN public.agro_operational_movements m
                ON m.cycle_id = c.id
               AND m.user_id = c.user_id
            WHERE c.user_id = $1
              AND c.crop_id IS NOT NULL
              AND m.direction = ''out''
              AND (
                    c.economic_type = ''loss''
                    OR c.status IN (''closed'', ''lost'')
              )
              AND ($2::date IS NULL OR %2$s >= $2::date)
              AND ($3::date IS NULL OR %2$s <= $3::date)
              AND ($4::uuid IS NULL OR c.crop_id = $4::uuid)
        ', v_operational_amount_expr, v_operational_date_expr);

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agro_operational_cycles' AND column_name = 'deleted_at'
        ) THEN
            v_exp_sql := v_exp_sql || ' AND c.deleted_at IS NULL';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agro_operational_movements' AND column_name = 'deleted_at'
        ) THEN
            v_exp_sql := v_exp_sql || ' AND m.deleted_at IS NULL';
        END IF;

        v_exp_sql := v_exp_sql || ' GROUP BY c.crop_id';
    ELSE
        v_exp_sql := '
            SELECT
                NULL::uuid AS crop_id,
                NULL::numeric AS gastos
            WHERE FALSE
        ';
    END IF;

    v_sql := format('
        WITH inc AS (
            %1$s
        ),
        exp AS (
            %2$s
        )
        SELECT
            COALESCE(inc.crop_id, exp.crop_id) AS crop_id,
            COALESCE(NULLIF(TRIM(c.name), ''''), ''Cultivo'') AS crop_name,
            COALESCE(inc.ingresos, 0)::numeric AS ingresos,
            COALESCE(exp.gastos, 0)::numeric AS gastos,
            (COALESCE(inc.ingresos, 0) - COALESCE(exp.gastos, 0))::numeric AS profit
        FROM inc
        FULL JOIN exp USING (crop_id)
        LEFT JOIN public.agro_crops c ON c.id = COALESCE(inc.crop_id, exp.crop_id)
        ORDER BY profit DESC NULLS LAST
        LIMIT %3$s
    ', v_inc_sql, v_exp_sql, v_limit);

    RETURN QUERY EXECUTE v_sql USING v_uid, p_from, p_to, p_crop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.agro_rank_top_crops_profit(date, date, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agro_rank_top_crops_profit(date, date, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agro_rank_top_crops_profit(date, date, integer, uuid) TO service_role;
