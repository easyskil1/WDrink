-- =============================================================================
-- Modul 10: dashboard aggregátumok egyetlen RPC-ben (jsonb).
--   Készletérték = on-hand (puffer+betárolva+kigyűjtve) beszerzési áron.
--   Egy db értéke = product_units.beszerzesi_ar / mennyiseg_alapegysegben.
-- =============================================================================
create or replace function public.dashboard_data()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_staff() then
    raise exception 'Nincs jogosultság.';
  end if;

  select jsonb_build_object(
    -- Globális készletérték (beszerzési áron)
    'keszletertek', coalesce((
      select sum(si.mennyiseg_alapegysegben
        * coalesce(pu.beszerzesi_ar, 0) / nullif(pu.mennyiseg_alapegysegben, 0))
      from stock_items si
      join product_units pu on pu.id = si.product_unit_id
      where si.statusz in ('puffer','betarolva','kigyujtve')
    ), 0),

    -- Készletérték tárhelyenként (csak betárolt)
    'keszlet_helyenkent', coalesce((
      select jsonb_agg(x order by x->>'teljes_kod')
      from (
        select jsonb_build_object(
          'teljes_kod', l.teljes_kod,
          'ertek', sum(si.mennyiseg_alapegysegben
            * coalesce(pu.beszerzesi_ar, 0) / nullif(pu.mennyiseg_alapegysegben, 0))
        ) as x
        from stock_items si
        join product_units pu on pu.id = si.product_unit_id
        join locations l on l.id = si.location_id
        where si.statusz = 'betarolva'
        group by l.teljes_kod
      ) t
    ), '[]'::jsonb),

    -- Puffer / kigyűjtve áttekintés
    'puffer_db', coalesce((select sum(mennyiseg_alapegysegben) from stock_items where statusz='puffer'),0),
    'puffer_tetel', (select count(*) from stock_items where statusz='puffer' and mennyiseg_alapegysegben>0),
    'kigyujtve_db', coalesce((select sum(mennyiseg_alapegysegben) from stock_items where statusz='kigyujtve'),0),
    'kigyujtve_tetel', (select count(*) from stock_items where statusz='kigyujtve' and mennyiseg_alapegysegben>0),

    -- Alacsony készlet (available = puffer+betárolva < min_keszlet)
    'alacsony_keszlet', coalesce((
      select jsonb_agg(x order by (x->>'keszlet')::int asc)
      from (
        select jsonb_build_object('nev', p.nev, 'keszlet', coalesce(s.keszlet,0), 'min_keszlet', p.min_keszlet) as x
        from products p
        left join (
          select product_id, sum(mennyiseg_alapegysegben) keszlet
          from stock_items where statusz in ('puffer','betarolva') group by product_id
        ) s on s.product_id = p.id
        where p.aktiv and p.min_keszlet > 0 and coalesce(s.keszlet,0) < p.min_keszlet
      ) t
    ), '[]'::jsonb),

    -- Top termékek eladás (kiadás) szerint
    'top_termekek', coalesce((
      select jsonb_agg(x)
      from (
        select jsonb_build_object('nev', p.nev, 'eladott_db', sum(m.mennyiseg)) as x
        from movement_log m
        join stock_items si on si.id = m.stock_item_id
        join products p on p.id = si.product_id
        where m.tipus = 'kiadas'
        group by p.nev
        order by sum(m.mennyiseg) desc
        limit 10
      ) t
    ), '[]'::jsonb),

    -- Selejt/veszteség ok szerint
    'selejt', coalesce((
      select jsonb_agg(x order by (x->>'db')::int desc)
      from (
        select jsonb_build_object('ok', coalesce(m.selejt_ok::text,'egyeb'), 'db', sum(m.mennyiseg)) as x
        from movement_log m
        where m.tipus = 'selejtezes'
        group by m.selejt_ok
      ) t
    ), '[]'::jsonb),

    -- Idősor: utolsó 30 nap, bevételezés vs kiadás (db)
    'idosor', coalesce((
      select jsonb_agg(x order by x->>'nap')
      from (
        select jsonb_build_object(
          'nap', to_char(d.nap, 'YYYY-MM-DD'),
          'bevet_db', coalesce(b.db,0),
          'kiad_db', coalesce(k.db,0)
        ) as x
        from generate_series(current_date - interval '29 days', current_date, interval '1 day') d(nap)
        left join (
          select date_trunc('day', created_at)::date nap, sum(mennyiseg) db
          from movement_log where tipus='bevetelezes' group by 1
        ) b on b.nap = d.nap::date
        left join (
          select date_trunc('day', created_at)::date nap, sum(mennyiseg) db
          from movement_log where tipus='kiadas' group by 1
        ) k on k.nap = d.nap::date
      ) t
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.dashboard_data() to authenticated;
