-- Agro movement currency guardrail: enforce USD/COP/VES on movement tables
begin;

do $$
declare
    v_table text;
    v_constraint text;
begin
    foreach v_table in array array['agro_income', 'agro_pending', 'agro_expenses']
    loop
        if to_regclass(format('public.%I', v_table)) is null then
            raise notice '[agro_currency_check] table %. skipped', v_table;
            continue;
        end if;

        if not exists (
            select 1
            from information_schema.columns c
            where c.table_schema = 'public'
              and c.table_name = v_table
              and c.column_name = 'currency'
        ) then
            raise notice '[agro_currency_check] table %.currency missing. skipped', v_table;
            continue;
        end if;

        v_constraint := format('%s_currency_check', v_table);

        execute format(
            'alter table public.%I drop constraint if exists %I',
            v_table,
            v_constraint
        );

        execute format($sql$
            alter table public.%I
            add constraint %I
            check (currency is null or currency in ('USD', 'COP', 'VES'))
        $sql$, v_table, v_constraint);

        raise notice '[agro_currency_check] constraint % added on %', v_constraint, v_table;
    end loop;
end $$;

notify pgrst, 'reload schema';
commit;
