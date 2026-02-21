-- YavlGold — agro_profit_date_filters_inclusive
-- Fecha: 2026-02-21
-- Proposito: alinear filtros por dia en agro_rank_top_crops_profit (timestamp-safe)

do $$
declare
  v_profit text;
begin
  v_profit := pg_get_functiondef('public.agro_rank_top_crops_profit(date,date,integer,uuid)'::regprocedure);
  v_profit := replace(v_profit, '($2::date IS NULL OR %2$I >= $2::date)', '($2::date IS NULL OR %2$I::date >= $2::date)');
  v_profit := replace(v_profit, '($3::date IS NULL OR %2$I <= $3::date)', '($3::date IS NULL OR %2$I::date <= $3::date)');
  v_profit := replace(v_profit, '($2::date IS NULL OR %3$I >= $2::date)', '($2::date IS NULL OR %3$I::date >= $2::date)');
  v_profit := replace(v_profit, '($3::date IS NULL OR %3$I <= $3::date)', '($3::date IS NULL OR %3$I::date <= $3::date)');
  execute v_profit;
end $$;
