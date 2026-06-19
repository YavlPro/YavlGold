-- Fix: agro_rank_top_clients - farm_id filter must go through agro_crops
-- agro_income no tiene farm_id en las filas, pero agro_crops.sí
-- Cambia: i.farm_id = $5  →  i.crop_id IN (SELECT id FROM agro_crops WHERE farm_id = $5)

CREATE OR REPLACE FUNCTION public.agro_rank_top_clients(
    p_from date DEFAULT NULL,
    p_to date DEFAULT NULL,
    p_limit integer DEFAULT 5,
    p_crop_id uuid DEFAULT NULL,
    p_farm_id uuid DEFAULT NULL
)
RETURNS TABLE (
    buyer_name text,
    total numeric,
    operations bigint,
    last_date date
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
    v_amount_expr text := 'COALESCE(i.monto, 0)';
    v_date_field text := 'fecha';
    v_buyer_expr text := '''Sin nombre''';
    v_has_deleted_at boolean;
    v_has_reverted_at boolean;
    v_has_crop_id boolean;
    v_has_buyer_id boolean := false;
    v_sql text;
BEGIN
    IF v_uid IS NULL THEN RETURN; END IF;
    IF to_regclass('public.agro_income') IS NULL THEN RETURN; END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'deleted_at') INTO v_has_deleted_at;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'reverted_at') INTO v_has_reverted_at;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'crop_id') INTO v_has_crop_id;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'monto_usd') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'monto') THEN
            v_amount_expr := 'COALESCE(i.monto_usd, i.monto, 0)';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'amount') THEN
            v_amount_expr := 'COALESCE(i.monto_usd, i.amount, 0)';
        ELSE
            v_amount_expr := 'COALESCE(i.monto_usd, 0)';
        END IF;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'monto') THEN
        v_amount_expr := 'COALESCE(i.monto, 0)';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'amount') THEN
        v_amount_expr := 'COALESCE(i.amount, 0)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'date') THEN
        v_date_field := 'date';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'created_at') THEN
        v_date_field := 'created_at';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'comprador') THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(i.comprador), ''''), ''Sin nombre'')';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'cliente') THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(i.cliente), ''''), ''Sin nombre'')';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'client_name') THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(i.client_name), ''''), ''Sin nombre'')';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'buyer_name') THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(i.buyer_name), ''''), ''Sin nombre'')';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'buyer') THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(i.buyer), ''''), ''Sin nombre'')';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'customer_name') THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(i.customer_name), ''''), ''Sin nombre'')';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'buyer_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agro_buyers') THEN
        v_has_buyer_id := true;
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(b.display_name), ''''), regexp_replace(COALESCE(i.concepto, ''''), ''^Venta a\\s+(.+?)\\s+-\\s+(.+$)'', ''\\1''), ''Sin nombre'')';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agro_income' AND column_name = 'concepto') THEN
        v_buyer_expr := 'COALESCE(NULLIF(TRIM(regexp_replace(COALESCE(i.concepto, ''''), ''^Venta a\\s+(.+?)\\s+-\\s+(.+$)'', ''\\1''), ''''), ''Sin nombre'')';
    END IF;

    v_sql := format('
        SELECT
            %1$s AS buyer_name,
            SUM(%2$s)::numeric AS total,
            COUNT(*)::bigint AS operations,
            MAX(i.%3$I)::date AS last_date
        FROM public.agro_income i
        %4$s
        WHERE i.user_id = $1
          AND ($2::date IS NULL OR i.%3$I >= $2::date)
          AND ($3::date IS NULL OR i.%3$I <= $3::date)
    ', v_buyer_expr, v_amount_expr, v_date_field,
    CASE WHEN v_has_buyer_id THEN 'LEFT JOIN public.agro_buyers b ON b.id = i.buyer_id' ELSE '' END);

    IF v_has_deleted_at THEN v_sql := v_sql || ' AND i.deleted_at IS NULL'; END IF;
    IF v_has_reverted_at THEN v_sql := v_sql || ' AND i.reverted_at IS NULL'; END IF;
    IF v_has_crop_id THEN v_sql := v_sql || ' AND ($4::uuid IS NULL OR i.crop_id = $4::uuid)'; END IF;

    -- Farm filter: go through agro_crops since agro_income doesn't have farm_id
    IF p_farm_id IS NOT NULL AND to_regclass('public.agro_crops') IS NOT NULL THEN
        v_sql := v_sql || ' AND i.crop_id IN (SELECT c.id FROM public.agro_crops c WHERE c.farm_id = $5::uuid AND c.user_id = $1)';
    END IF;

    v_sql := v_sql || ' GROUP BY 1 ORDER BY total DESC NULLS LAST, operations DESC NULLS LAST LIMIT ' || v_limit;
    RETURN QUERY EXECUTE v_sql USING v_uid, p_from, p_to, p_crop_id, p_farm_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
