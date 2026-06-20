-- YavlGold Agro — Add p_farm_id filter to agro_rank_pending_clients
-- and fix stale GRANT/REVOKE signatures for agro_rank_top_clients (now 5 args).
--
-- Context: yesterday's work added p_farm_id to agro_rank_top_clients but the
-- GRANT/REVOKE statements at the bottom of agro_rankings_rpc_v1.sql still
-- referenced the old 4-arg signature, which errors on re-apply. This migration
-- recreates agro_rank_pending_clients with the farm filter (so "Fiados por
-- Cliente" respects the finca chip like the other two rankings cards) and
-- re-issues the privileges with correct signatures.
--
-- Depends on: agro_pending.farm_id column (added by 20260603120000_agro_farm_movements.sql).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Recreate agro_rank_pending_clients with p_farm_id + farm_id filter
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.agro_rank_pending_clients(
    p_from date DEFAULT NULL,
    p_to date DEFAULT NULL,
    p_limit integer DEFAULT 5,
    p_crop_id uuid DEFAULT NULL,
    p_farm_id uuid DEFAULT NULL
)
RETURNS TABLE (
    client_name text,
    total_pending numeric,
    pending_count bigint,
    next_due_date date
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
    v_table_name text;
    v_amount_expr text := 'COALESCE(monto, 0)';
    v_date_field text := 'fecha';
    v_due_field text := 'fecha';
    v_client_expr text := '''Sin nombre''';
    v_has_farm_id boolean := false;
    v_sql text;
BEGIN
    IF v_uid IS NULL THEN
        RETURN;
    END IF;

    IF to_regclass('public.agro_pending') IS NOT NULL THEN
        v_table_name := 'agro_pending';
    ELSIF to_regclass('public.agro_pendings') IS NOT NULL THEN
        v_table_name := 'agro_pendings';
    ELSE
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'farm_id'
    ) INTO v_has_farm_id;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'monto_pendiente'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'monto'
        ) THEN
            v_amount_expr := 'COALESCE(monto_pendiente, monto, 0)';
        ELSE
            v_amount_expr := 'COALESCE(monto_pendiente, 0)';
        END IF;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'amount'
    ) THEN
        v_amount_expr := 'COALESCE(amount, 0)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'date'
    ) THEN
        v_date_field := 'date';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'created_at'
    ) THEN
        v_date_field := 'created_at';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'fecha_vencimiento'
    ) THEN
        v_due_field := 'fecha_vencimiento';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'due_date'
    ) THEN
        v_due_field := 'due_date';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'cliente'
    ) THEN
        v_client_expr := 'COALESCE(NULLIF(TRIM(cliente), ''''), ''Sin nombre'')';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'client_name'
    ) THEN
        v_client_expr := 'COALESCE(NULLIF(TRIM(client_name), ''''), ''Sin nombre'')';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'comprador'
    ) THEN
        v_client_expr := 'COALESCE(NULLIF(TRIM(comprador), ''''), ''Sin nombre'')';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'buyer_name'
    ) THEN
        v_client_expr := 'COALESCE(NULLIF(TRIM(buyer_name), ''''), ''Sin nombre'')';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'buyer'
    ) THEN
        v_client_expr := 'COALESCE(NULLIF(TRIM(buyer), ''''), ''Sin nombre'')';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'customer_name'
    ) THEN
        v_client_expr := 'COALESCE(NULLIF(TRIM(customer_name), ''''), ''Sin nombre'')';
    END IF;

    v_sql := format('
        SELECT
            %1$s AS client_name,
            SUM(%2$s)::numeric AS total_pending,
            COUNT(*)::bigint AS pending_count,
            MIN(%3$I)::date AS next_due_date
        FROM public.%4$I
        WHERE user_id = $1
          AND ($2::date IS NULL OR %5$I >= $2::date)
          AND ($3::date IS NULL OR %5$I <= $3::date)
    ', v_client_expr, v_amount_expr, v_due_field, v_table_name, v_date_field);

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'deleted_at'
    ) THEN
        v_sql := v_sql || ' AND deleted_at IS NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'reverted_at'
    ) THEN
        v_sql := v_sql || ' AND reverted_at IS NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'paid_at'
    ) THEN
        v_sql := v_sql || ' AND paid_at IS NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'settled_at'
    ) THEN
        v_sql := v_sql || ' AND settled_at IS NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'resolved_at'
    ) THEN
        v_sql := v_sql || ' AND resolved_at IS NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'transfer_state'
    ) THEN
        v_sql := v_sql || ' AND COALESCE(transfer_state, '''') <> ''transferred''';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'crop_id'
    ) THEN
        v_sql := v_sql || ' AND ($4::uuid IS NULL OR crop_id = $4::uuid)';
    END IF;

    -- Farm filter: only applied when the pending table actually has farm_id.
    IF v_has_farm_id THEN
        v_sql := v_sql || ' AND ($5::uuid IS NULL OR farm_id = $5::uuid)';
    END IF;

    v_sql := v_sql || '
        GROUP BY 1
        ORDER BY total_pending DESC NULLS LAST, pending_count DESC NULLS LAST
        LIMIT ' || v_limit;

    RETURN QUERY EXECUTE v_sql USING v_uid, p_from, p_to, p_crop_id, p_farm_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix stale GRANT/REVOKE signatures (top_clients + pending now have 5 args)
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop old privileges (both signatures, old and new, to be safe/idempotent).
REVOKE ALL ON FUNCTION public.agro_rank_top_clients(date, date, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agro_rank_top_clients(date, date, integer, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agro_rank_pending_clients(date, date, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agro_rank_pending_clients(date, date, integer, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agro_rank_top_crops_profit(date, date, integer, uuid) FROM PUBLIC;

-- Re-grant with the correct (current) signatures.
GRANT EXECUTE ON FUNCTION public.agro_rank_top_clients(date, date, integer, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agro_rank_pending_clients(date, date, integer, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agro_rank_top_crops_profit(date, date, integer, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.agro_rank_top_clients(date, date, integer, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.agro_rank_pending_clients(date, date, integer, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.agro_rank_top_crops_profit(date, date, integer, uuid) TO service_role;
