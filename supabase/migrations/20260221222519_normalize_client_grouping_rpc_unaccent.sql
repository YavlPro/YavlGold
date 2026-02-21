-- YavlGold — normalize_client_grouping_rpc_unaccent
-- Fecha: 2026-02-21
-- Propósito: Canonical grouping (case/space/diacritics) usando extensions.unaccent en name_key

create extension if not exists unaccent with schema extensions;

CREATE OR REPLACE FUNCTION public.agro_rank_top_clients(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_limit integer DEFAULT 5, p_crop_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(buyer_name text, total numeric, operations bigint, last_date date)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid uuid := auth.uid();
    v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
    v_amount_expr text := 'COALESCE(monto, 0)';
    v_date_field text := 'fecha';
    v_buyer_expr text := '''Sin nombre''';
    v_has_deleted_at boolean;
    v_has_reverted_at boolean;
    v_has_crop_id boolean;
    v_sql text;
BEGIN
    IF v_uid IS NULL THEN
        RETURN;
    END IF;

    IF to_regclass('public.agro_income') IS NULL THEN
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'deleted_at'
    ) INTO v_has_deleted_at;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'reverted_at'
    ) INTO v_has_reverted_at;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'crop_id'
    ) INTO v_has_crop_id;

    -- Amount expression
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'monto_usd'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'monto'
        ) THEN
            v_amount_expr := 'COALESCE(monto_usd, monto, 0)';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'amount'
        ) THEN
            v_amount_expr := 'COALESCE(monto_usd, amount, 0)';
        ELSE
            v_amount_expr := 'COALESCE(monto_usd, 0)';
        END IF;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'monto'
    ) THEN
        v_amount_expr := 'COALESCE(monto, 0)';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'amount'
    ) THEN
        v_amount_expr := 'COALESCE(amount, 0)';
    END IF;

    -- Date field
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'date'
    ) THEN
        v_date_field := 'date';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'created_at'
    ) THEN
        v_date_field := 'created_at';
    END IF;

    -- Buyer name expression (safe fallback: 'Sin nombre' if no col exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'comprador'
    ) THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(comprador), ''''), ''Sin nombre'')';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'cliente'
    ) THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(cliente), ''''), ''Sin nombre'')';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'client_name'
    ) THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(client_name), ''''), ''Sin nombre'')';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'buyer_name'
    ) THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(buyer_name), ''''), ''Sin nombre'')';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'buyer'
    ) THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(buyer), ''''), ''Sin nombre'')';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'customer_name'
    ) THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(customer_name), ''''), ''Sin nombre'')';
    END IF;

    v_sql := format('
        WITH raw AS (
            SELECT
                %1$s AS name_raw,
                (%2$s)::numeric AS amount_val,
                %3$I::date AS last_dt
            FROM public.agro_income
            WHERE user_id = $1
              AND ($2::date IS NULL OR %3$I >= $2::date)
              AND ($3::date IS NULL OR %3$I <= $3::date)
    ', v_buyer_expr, v_amount_expr, v_date_field);

    IF v_has_deleted_at THEN
        v_sql := v_sql || ' AND deleted_at IS NULL';
    END IF;
    IF v_has_reverted_at THEN
        v_sql := v_sql || ' AND reverted_at IS NULL';
    END IF;
    IF v_has_crop_id THEN
        v_sql := v_sql || ' AND ($4::uuid IS NULL OR crop_id = $4::uuid)';
    END IF;

    v_sql := v_sql || '
        ),
        canon AS (
            SELECT
                regexp_replace(btrim(name_raw), ''\s+'', '' '', ''g'') AS name_clean,
                lower(extensions.unaccent(regexp_replace(btrim(name_raw), ''\s+'', '' '', ''g''))) AS name_key,
                amount_val,
                last_dt
            FROM raw
        )
        SELECT
            COALESCE(MIN(name_clean) FILTER (WHERE name_clean <> ''Sin nombre''), ''Sin nombre'') AS buyer_name,
            SUM(amount_val)::numeric AS total,
            COUNT(*)::bigint AS operations,
            MAX(last_dt)::date AS last_date
        FROM canon
        GROUP BY name_key
        ORDER BY total DESC NULLS LAST, operations DESC NULLS LAST
        LIMIT ' || v_limit;

    RETURN QUERY EXECUTE v_sql USING v_uid, p_from, p_to, p_crop_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.agro_rank_pending_clients(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_limit integer DEFAULT 5, p_crop_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(client_name text, total_pending numeric, pending_count bigint, next_due_date date)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid uuid := auth.uid();
    v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
    v_table_name text;
    v_amount_expr text := 'COALESCE(monto, 0)';
    v_date_field text := 'fecha';
    v_due_field text := 'fecha';
    v_client_expr text := '''Sin nombre''';
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

    -- Amount expression
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

    -- Date field
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

    -- Due date field
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

    -- Client name expression (safe fallback)
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
        WITH raw AS (
            SELECT
                %1$s AS name_raw,
                (%2$s)::numeric AS amount_val,
                %3$I::date AS due_dt
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

    v_sql := v_sql || '
        ),
        canon AS (
            SELECT
                regexp_replace(btrim(name_raw), ''\s+'', '' '', ''g'') AS name_clean,
                lower(extensions.unaccent(regexp_replace(btrim(name_raw), ''\s+'', '' '', ''g''))) AS name_key,
                amount_val,
                due_dt
            FROM raw
        )
        SELECT
            COALESCE(MIN(name_clean) FILTER (WHERE name_clean <> ''Sin nombre''), ''Sin nombre'') AS client_name,
            SUM(amount_val)::numeric AS total_pending,
            COUNT(*)::bigint AS pending_count,
            MIN(due_dt)::date AS next_due_date
        FROM canon
        GROUP BY name_key
        ORDER BY total_pending DESC NULLS LAST, pending_count DESC NULLS LAST
        LIMIT ' || v_limit;

    RETURN QUERY EXECUTE v_sql USING v_uid, p_from, p_to, p_crop_id;
END;
$function$;
