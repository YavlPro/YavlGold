begin;

create or replace function public.agro_canonicalize_buyer_name(raw_name text)
returns text
language sql
immutable
set search_path = public, pg_catalog
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

notify pgrst, 'reload schema';

commit;
