-- Agro movement currency cleanup: normalize legacy aliases to USD/COP/VES
begin;

do $$
declare
    v_table text;
begin
    foreach v_table in array array['agro_income', 'agro_pending', 'agro_expenses']
    loop
        if to_regclass(format('public.%I', v_table)) is null then
            raise notice '[agro_currency_backfill] table %. skipped', v_table;
            continue;
        end if;

        if not exists (
            select 1
            from information_schema.columns c
            where c.table_schema = 'public'
              and c.table_name = v_table
              and c.column_name = 'currency'
        ) then
            raise notice '[agro_currency_backfill] table %.currency missing. skipped', v_table;
            continue;
        end if;

        execute format($sql$
            update public.%I
            set currency = case
                when currency is null then null
                when btrim(currency) = '' then null
                when upper(btrim(currency)) in ('USD','COP','VES') then upper(btrim(currency))
                when upper(btrim(currency)) in ('USDT','$','DOLAR','DOLARES') then 'USD'
                when upper(btrim(currency)) in ('COP','COL','PESO','PESOS') then 'COP'
                when upper(btrim(currency)) in ('BS','BSS','BOLIVAR','BOLIVARES','VEF','VES') then 'VES'
                else upper(btrim(currency))
            end
            where currency is not null;
        $sql$, v_table);
    end loop;
end $$;

notify pgrst, 'reload schema';

commit;
