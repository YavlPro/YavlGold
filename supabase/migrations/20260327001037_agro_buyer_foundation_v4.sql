begin;

create or replace function public.agro_canonicalize_buyer_name(raw_name text)
returns text
language sql
immutable
as $$
    select nullif(
        trim(
            regexp_replace(
                lower(
                    translate(
                        coalesce(raw_name, ''),
                        'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑáàäâãéèëêíìïîóòöôõúùüûñ',
                        'AAAAAEEEEIIIIOOOOOUUUUNaaaaaeeeeiiiiooooouuuun'
                    )
                ),
                '\s+',
                ' ',
                'g'
            )
        ),
        ''
    );
$$;

comment on function public.agro_canonicalize_buyer_name(text) is
'Canonicalizacion simple Cartera Viva V4: lowercase(trim(collapse_spaces(remove_accents(name))))';

alter table if exists public.agro_pending
    add column if not exists buyer_id uuid null references public.agro_buyers(id) on delete set null,
    add column if not exists buyer_group_key text null,
    add column if not exists buyer_match_status text null;

alter table if exists public.agro_income
    add column if not exists buyer_id uuid null references public.agro_buyers(id) on delete set null,
    add column if not exists buyer_group_key text null,
    add column if not exists buyer_match_status text null;

alter table if exists public.agro_losses
    add column if not exists buyer_id uuid null references public.agro_buyers(id) on delete set null,
    add column if not exists buyer_group_key text null,
    add column if not exists buyer_match_status text null;

create index if not exists agro_pending_user_buyer_id_idx
    on public.agro_pending (user_id, buyer_id);
create index if not exists agro_pending_user_buyer_group_key_idx
    on public.agro_pending (user_id, buyer_group_key);

create index if not exists agro_income_user_buyer_id_idx
    on public.agro_income (user_id, buyer_id);
create index if not exists agro_income_user_buyer_group_key_idx
    on public.agro_income (user_id, buyer_group_key);

create index if not exists agro_losses_user_buyer_id_idx
    on public.agro_losses (user_id, buyer_id);
create index if not exists agro_losses_user_buyer_group_key_idx
    on public.agro_losses (user_id, buyer_group_key);

with buyer_sources as (
    select
        user_id,
        trim(
            coalesce(
                nullif(cliente, ''),
                nullif(substring(concepto from '(?:Cliente|Comprador):\s*(.+)$'), '')
            )
        ) as raw_name
    from public.agro_pending

    union all

    select
        user_id,
        trim(
            coalesce(
                nullif(substring(concepto from '^Venta a\s+(.+?)\s+-\s+.+$'), ''),
                nullif(substring(concepto from '(?:Cliente|Comprador):\s*(.+)$'), '')
            )
        ) as raw_name
    from public.agro_income

    union all

    select
        user_id,
        trim(
            coalesce(
                nullif(substring(causa from 'Cliente:\s*(.+)$'), ''),
                nullif(substring(concepto from '^.+?\s+-\s+Causa(?:/Responsable)?:\s*(.+)$'), '')
            )
        ) as raw_name
    from public.agro_losses
    where lower(coalesce(origin_table, '')) = 'agro_pending'
),
buyer_ranked as (
    select
        user_id,
        raw_name,
        public.agro_canonicalize_buyer_name(raw_name) as group_key,
        row_number() over (
            partition by user_id, public.agro_canonicalize_buyer_name(raw_name)
            order by
                case when raw_name ~ '[A-ZÁÉÍÓÚÑ]' then 0 else 1 end,
                length(raw_name) desc,
                raw_name asc
        ) as rn
    from buyer_sources
    where public.agro_canonicalize_buyer_name(raw_name) is not null
),
buyer_seed as (
    select
        user_id,
        raw_name,
        group_key
    from buyer_ranked
    where rn = 1
)
insert into public.agro_buyers (
    user_id,
    display_name,
    group_key,
    notes
)
select
    user_id,
    raw_name,
    group_key,
    'Backfill Fase 1 Cartera Viva V4'
from buyer_seed
on conflict (user_id, group_key) do nothing;

with pending_candidates as (
    select
        p.id,
        p.user_id,
        public.agro_canonicalize_buyer_name(
            coalesce(
                nullif(trim(p.cliente), ''),
                nullif(trim(substring(p.concepto from '(?:Cliente|Comprador):\s*(.+)$')), '')
            )
        ) as group_key
    from public.agro_pending p
)
update public.agro_pending as p
set
    buyer_group_key = c.group_key,
    buyer_id = b.id,
    buyer_match_status = case
        when b.id is not null then 'matched'
        else 'legacy_review_required'
    end
from pending_candidates as c
left join public.agro_buyers as b
    on b.user_id = c.user_id
   and b.group_key = c.group_key
where p.id = c.id
  and p.user_id = c.user_id;

with income_candidates as (
    select
        i.id,
        i.user_id,
        public.agro_canonicalize_buyer_name(
            coalesce(
                nullif(trim(substring(i.concepto from '^Venta a\s+(.+?)\s+-\s+.+$')), ''),
                nullif(trim(substring(i.concepto from '(?:Cliente|Comprador):\s*(.+)$')), '')
            )
        ) as group_key
    from public.agro_income i
)
update public.agro_income as i
set
    buyer_group_key = c.group_key,
    buyer_id = b.id,
    buyer_match_status = case
        when b.id is not null then 'matched'
        else 'legacy_review_required'
    end
from income_candidates as c
left join public.agro_buyers as b
    on b.user_id = c.user_id
   and b.group_key = c.group_key
where i.id = c.id
  and i.user_id = c.user_id;

with loss_candidates as (
    select
        l.id,
        l.user_id,
        lower(coalesce(l.origin_table, '')) = 'agro_pending' as from_pending,
        public.agro_canonicalize_buyer_name(
            coalesce(
                nullif(trim(substring(l.causa from 'Cliente:\s*(.+)$')), ''),
                nullif(trim(substring(l.concepto from '^.+?\s+-\s+Causa(?:/Responsable)?:\s*(.+)$')), '')
            )
        ) as safe_group_key,
        public.agro_canonicalize_buyer_name(
            coalesce(
                nullif(trim(substring(l.causa from 'Cliente:\s*(.+)$')), ''),
                nullif(trim(substring(l.concepto from '(?:Cliente|Comprador):\s*(.+)$')), '')
            )
        ) as review_group_key
    from public.agro_losses l
)
update public.agro_losses as l
set
    buyer_group_key = case
        when c.from_pending then c.safe_group_key
        else c.review_group_key
    end,
    buyer_id = case
        when c.from_pending then b.id
        else null
    end,
    buyer_match_status = case
        when c.from_pending and b.id is not null then 'matched'
        when c.from_pending then 'legacy_review_required'
        when c.review_group_key is not null then 'legacy_review_required'
        else 'legacy_unclassified'
    end
from loss_candidates as c
left join public.agro_buyers as b
    on b.user_id = c.user_id
   and b.group_key = c.safe_group_key
where l.id = c.id
  and l.user_id = c.user_id;

notify pgrst, 'reload schema';

commit;
