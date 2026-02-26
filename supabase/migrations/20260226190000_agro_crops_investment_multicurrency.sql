-- Agro crops: investment base multi-currency + FX snapshot
begin;

alter table public.agro_crops
    add column if not exists investment_amount numeric,
    add column if not exists investment_currency text,
    add column if not exists investment_usd_equiv numeric,
    add column if not exists investment_fx_usd_cop numeric,
    add column if not exists investment_fx_usd_ves numeric,
    add column if not exists investment_fx_at timestamptz;

alter table public.agro_crops
    drop constraint if exists agro_crops_investment_currency_check;

alter table public.agro_crops
    add constraint agro_crops_investment_currency_check
    check (
        investment_currency is null
        or investment_currency in ('USD', 'COP', 'VES')
    );

-- Backfill legacy crops that only persisted `investment` (USD)
update public.agro_crops
set
    investment_currency = coalesce(nullif(investment_currency, ''), 'USD'),
    investment_amount = coalesce(investment_amount, investment, 0),
    investment_usd_equiv = coalesce(investment_usd_equiv, investment_amount, investment, 0),
    investment = coalesce(investment_usd_equiv, investment_amount, investment, 0)
where
    investment is not null
    or investment_amount is not null
    or investment_usd_equiv is not null;

notify pgrst, 'reload schema';

commit;
