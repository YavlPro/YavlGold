begin;

alter table if exists public.agro_buyers
    add column if not exists canonical_name text,
    add column if not exists status text;

update public.agro_buyers
set canonical_name = coalesce(
    nullif(trim(canonical_name), ''),
    nullif(trim(group_key), ''),
    public.agro_canonicalize_buyer_name(display_name)
)
where canonical_name is null
   or trim(canonical_name) = '';

update public.agro_buyers
set status = 'active'
where status is null
   or trim(status) = '';

alter table if exists public.agro_buyers
    alter column canonical_name set not null,
    alter column status set default 'active',
    alter column status set not null;

alter table if exists public.agro_buyers
    drop constraint if exists agro_buyers_status_check;

alter table if exists public.agro_buyers
    add constraint agro_buyers_status_check
    check (status in ('active', 'archived'));

create unique index if not exists agro_buyers_user_canonical_name_uidx
    on public.agro_buyers (user_id, canonical_name);

create index if not exists agro_buyers_user_status_idx
    on public.agro_buyers (user_id, status);

drop function if exists public.agro_buyer_portfolio_summary_v1();

create function public.agro_buyer_portfolio_summary_v1()
returns table(
    buyer_id uuid,
    display_name text,
    group_key text,
    credited_total numeric,
    paid_total numeric,
    loss_total numeric,
    transferred_total numeric,
    pending_total numeric,
    compliance_percent numeric,
    review_required_total numeric,
    legacy_unclassified_total numeric,
    non_debt_income_total numeric,
    global_status text,
    review_required_count bigint,
    legacy_unclassified_count bigint,
    balance_gap_total numeric,
    requires_review boolean,
    canonical_name text,
    client_status text
)
language sql
stable
set search_path = public, pg_catalog
as $$
    with scope as (
        select auth.uid() as user_id
    ),
    buyer_base as (
        select
            b.id as buyer_id,
            b.user_id,
            b.display_name,
            b.group_key,
            b.canonical_name,
            coalesce(b.status, 'active') as client_status
        from public.agro_buyers b
        join scope s
          on s.user_id = b.user_id
        where s.user_id is not null
    ),
    pending_matched as (
        select
            p.buyer_id,
            sum(coalesce(p.monto_usd, p.monto, 0))::numeric as credited_total,
            sum(
                case
                    when coalesce(p.transfer_state, 'active') = 'active'
                    then coalesce(p.monto_usd, p.monto, 0)
                    else 0
                end
            )::numeric as pending_total,
            sum(
                case
                    when coalesce(p.transfer_state, '') = 'transferred'
                     and coalesce(p.transferred_to, '') not in ('income', 'losses')
                    then coalesce(p.monto_usd, p.monto, 0)
                    else 0
                end
            )::numeric as transferred_total
        from public.agro_pending p
        join scope s
          on s.user_id = p.user_id
        where p.deleted_at is null
          and p.reverted_at is null
          and p.buyer_id is not null
          and p.buyer_match_status = 'matched'
        group by p.buyer_id
    ),
    income_paid as (
        select
            i.buyer_id,
            sum(coalesce(i.monto_usd, i.monto, 0))::numeric as paid_total
        from public.agro_income i
        join scope s
          on s.user_id = i.user_id
        where i.deleted_at is null
          and i.reverted_at is null
          and i.buyer_id is not null
          and i.buyer_match_status = 'matched'
          and lower(coalesce(i.origin_table, '')) = 'agro_pending'
        group by i.buyer_id
    ),
    loss_matched as (
        select
            l.buyer_id,
            sum(coalesce(l.monto_usd, l.monto, 0))::numeric as loss_total
        from public.agro_losses l
        join scope s
          on s.user_id = l.user_id
        where l.deleted_at is null
          and l.reverted_at is null
          and l.buyer_id is not null
          and l.buyer_match_status = 'matched'
          and lower(coalesce(l.origin_table, '')) = 'agro_pending'
        group by l.buyer_id
    ),
    review_union as (
        select
            p.user_id,
            p.buyer_id,
            p.buyer_group_key as group_key,
            coalesce(p.buyer_match_status, '') as buyer_match_status,
            coalesce(p.monto_usd, p.monto, 0)::numeric as amount
        from public.agro_pending p
        join scope s
          on s.user_id = p.user_id
        where p.deleted_at is null
          and p.reverted_at is null
          and coalesce(p.buyer_match_status, '') <> 'matched'
          and (p.buyer_id is not null or p.buyer_group_key is not null)

        union all

        select
            i.user_id,
            i.buyer_id,
            i.buyer_group_key as group_key,
            coalesce(i.buyer_match_status, '') as buyer_match_status,
            coalesce(i.monto_usd, i.monto, 0)::numeric as amount
        from public.agro_income i
        join scope s
          on s.user_id = i.user_id
        where i.deleted_at is null
          and i.reverted_at is null
          and coalesce(i.buyer_match_status, '') <> 'matched'
          and (i.buyer_id is not null or i.buyer_group_key is not null)

        union all

        select
            l.user_id,
            l.buyer_id,
            l.buyer_group_key as group_key,
            coalesce(l.buyer_match_status, '') as buyer_match_status,
            coalesce(l.monto_usd, l.monto, 0)::numeric as amount
        from public.agro_losses l
        join scope s
          on s.user_id = l.user_id
        where l.deleted_at is null
          and l.reverted_at is null
          and coalesce(l.buyer_match_status, '') <> 'matched'
          and (l.buyer_id is not null or l.buyer_group_key is not null)
    ),
    review_resolved as (
        select
            coalesce(r.buyer_id, b.buyer_id) as buyer_id,
            r.buyer_match_status,
            r.amount
        from review_union r
        left join buyer_base b
          on r.buyer_id is null
         and b.user_id = r.user_id
         and b.group_key = r.group_key
        where coalesce(r.buyer_id, b.buyer_id) is not null
    ),
    review_totals as (
        select
            buyer_id,
            sum(
                case when buyer_match_status = 'legacy_review_required' then amount else 0 end
            )::numeric as review_required_total,
            count(*) filter (where buyer_match_status = 'legacy_review_required')::bigint as review_required_count,
            sum(
                case when buyer_match_status = 'legacy_unclassified' then amount else 0 end
            )::numeric as legacy_unclassified_total,
            count(*) filter (where buyer_match_status = 'legacy_unclassified')::bigint as legacy_unclassified_count
        from review_resolved
        group by buyer_id
    ),
    non_debt_income as (
        select
            coalesce(i.buyer_id, b.buyer_id) as buyer_id,
            sum(coalesce(i.monto_usd, i.monto, 0))::numeric as non_debt_income_total
        from public.agro_income i
        join scope s
          on s.user_id = i.user_id
        left join buyer_base b
          on i.buyer_id is null
         and b.user_id = i.user_id
         and b.group_key = i.buyer_group_key
        where i.deleted_at is null
          and i.reverted_at is null
          and i.buyer_match_status = 'matched'
          and lower(coalesce(i.origin_table, '')) <> 'agro_pending'
          and (i.buyer_id is not null or i.buyer_group_key is not null)
        group by coalesce(i.buyer_id, b.buyer_id)
    ),
    portfolio as (
        select
            bb.buyer_id,
            bb.display_name,
            bb.group_key,
            bb.canonical_name,
            bb.client_status,
            coalesce(pm.credited_total, 0)::numeric as credited_total,
            coalesce(ip.paid_total, 0)::numeric as paid_total,
            coalesce(lm.loss_total, 0)::numeric as loss_total,
            coalesce(pm.transferred_total, 0)::numeric as transferred_total,
            coalesce(pm.pending_total, 0)::numeric as pending_total,
            coalesce(rt.review_required_total, 0)::numeric as review_required_total,
            coalesce(rt.legacy_unclassified_total, 0)::numeric as legacy_unclassified_total,
            coalesce(ndi.non_debt_income_total, 0)::numeric as non_debt_income_total,
            coalesce(rt.review_required_count, 0)::bigint as review_required_count,
            coalesce(rt.legacy_unclassified_count, 0)::bigint as legacy_unclassified_count
        from buyer_base bb
        left join pending_matched pm on pm.buyer_id = bb.buyer_id
        left join income_paid ip on ip.buyer_id = bb.buyer_id
        left join loss_matched lm on lm.buyer_id = bb.buyer_id
        left join review_totals rt on rt.buyer_id = bb.buyer_id
        left join non_debt_income ndi on ndi.buyer_id = bb.buyer_id
    )
    select
        p.buyer_id,
        p.display_name,
        p.group_key,
        p.credited_total,
        p.paid_total,
        p.loss_total,
        p.transferred_total,
        p.pending_total,
        case
            when p.credited_total <= 0 then null
            when (p.credited_total - p.paid_total - p.loss_total - p.transferred_total) < 0 then null
            else round(((p.paid_total / nullif(p.credited_total, 0)) * 100)::numeric, 2)
        end as compliance_percent,
        p.review_required_total,
        p.legacy_unclassified_total,
        p.non_debt_income_total,
        case
            when p.client_status = 'archived'
            then 'Archivado'
            when p.pending_total > 0
             and p.paid_total = 0
             and p.loss_total = 0
             and p.transferred_total = 0
            then 'Fiado'
            when p.credited_total > 0
             and p.pending_total <= 0
             and (p.credited_total - p.paid_total - p.loss_total - p.transferred_total) >= 0
             and p.review_required_total = 0
             and p.legacy_unclassified_total = 0
            then 'Pagado'
            when p.credited_total <= 0
             and p.paid_total <= 0
             and p.loss_total <= 0
             and p.pending_total <= 0
             and p.review_required_total <= 0
             and p.legacy_unclassified_total <= 0
            then 'Sin movimientos'
            else 'Mixto'
        end as global_status,
        p.review_required_count,
        p.legacy_unclassified_count,
        round((p.pending_total - (p.credited_total - p.paid_total - p.loss_total - p.transferred_total))::numeric, 2) as balance_gap_total,
        (
            p.review_required_total > 0
            or p.legacy_unclassified_total > 0
            or (p.credited_total - p.paid_total - p.loss_total - p.transferred_total) < 0
        ) as requires_review,
        p.canonical_name,
        p.client_status
    from portfolio p
    where p.client_status = 'active'
       or p.credited_total > 0
       or p.paid_total > 0
       or p.loss_total > 0
       or p.pending_total > 0
       or p.review_required_total > 0
       or p.legacy_unclassified_total > 0
    order by
        case when p.client_status = 'archived' then 1 else 0 end asc,
        p.pending_total desc nulls last,
        p.review_required_total desc nulls last,
        p.display_name asc;
$$;

comment on function public.agro_buyer_portfolio_summary_v1() is
'Agregacion client-centric de Cartera Viva V1. Mantiene compatibilidad buyer_id/group_key, pero incluye clientes activos sin movimientos y ciclo de vida active/archived.';

notify pgrst, 'reload schema';

commit;
