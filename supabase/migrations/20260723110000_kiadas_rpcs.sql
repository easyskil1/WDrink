-- =============================================================================
-- Modul 6: kigyűjtés → kiadás RPC-k (atomi) + cégadat alapsor
-- =============================================================================

-- Cégadatok egysoros táblájának alap rekordja (a szállítólevélhez kell).
insert into public.company_settings (id, cegnev)
values (true, 'Drink World Győr')
on conflict (id) do nothing;

-- =============================================================================
-- kigyujt: betárolt tétel (rész)kigyűjtése FEFO alapján.
--   Teljesnél a sor 'kigyujtve' lesz; résznél a forrás csökken és új
--   'kigyujtve' sor jön létre (a helyhez kötött, betárolt készlet csökken).
-- =============================================================================
create or replace function public.kigyujt(
  p_stock_item_id uuid,
  p_mennyiseg integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v stock_items%rowtype;
  v_target uuid;
begin
  if not public.is_staff() then
    raise exception 'Nincs jogosultság.';
  end if;

  select * into v from public.stock_items where id = p_stock_item_id for update;
  if v.id is null then
    raise exception 'Ismeretlen készlettétel.';
  end if;
  if v.statusz <> 'betarolva' then
    raise exception 'Csak betárolt tétel gyűjthető ki.';
  end if;
  if p_mennyiseg <= 0 or p_mennyiseg > v.mennyiseg_alapegysegben then
    raise exception 'Érvénytelen mennyiség (elérhető: %).', v.mennyiseg_alapegysegben;
  end if;

  if p_mennyiseg = v.mennyiseg_alapegysegben then
    update public.stock_items set statusz = 'kigyujtve' where id = v.id;
    v_target := v.id;
  else
    update public.stock_items
      set mennyiseg_alapegysegben = mennyiseg_alapegysegben - p_mennyiseg
      where id = v.id;

    insert into public.stock_items
      (product_id, product_unit_id, lot_szam, lejarat_datum, location_id, mennyiseg_alapegysegben, statusz, created_by)
    values
      (v.product_id, v.product_unit_id, v.lot_szam, v.lejarat_datum, v.location_id, p_mennyiseg, 'kigyujtve', auth.uid())
    returning id into v_target;
  end if;

  insert into public.movement_log
    (tipus, stock_item_id, mennyiseg, forras_location_id, user_id)
  values
    ('kigyujtes', v_target, p_mennyiseg, v.location_id, auth.uid());

  return v_target;
end;
$$;

-- =============================================================================
-- kiad: kigyűjtött tételek összesítése egy kiadási bizonylatba.
--   A tételek 'kiadva' státuszba kerülnek (globális készlet csökken).
-- Visszaad: a delivery_note id.
-- =============================================================================
create or replace function public.kiad(
  p_vevo_nev text,
  p_datum date,
  p_stock_item_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_note_id uuid;
  v_sorszam text;
  v_sid uuid;
  v stock_items%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Nincs jogosultság.';
  end if;
  if array_length(p_stock_item_ids, 1) is null then
    raise exception 'Legalább egy kigyűjtött tétel szükséges.';
  end if;

  v_sorszam := 'KIAD-' || to_char(coalesce(p_datum, current_date), 'YYYY')
    || '-' || lpad(nextval('public.delivery_kiad_seq')::text, 5, '0');

  insert into public.delivery_notes (irany, vevo_nev, datum, sorszam, created_by)
  values ('kiadas', p_vevo_nev, coalesce(p_datum, current_date), v_sorszam, auth.uid())
  returning id into v_note_id;

  foreach v_sid in array p_stock_item_ids
  loop
    select * into v from public.stock_items where id = v_sid for update;
    if v.id is null then
      raise exception 'Ismeretlen tétel: %', v_sid;
    end if;
    if v.statusz <> 'kigyujtve' then
      raise exception 'Csak kigyűjtött tétel adható ki (%).', v_sid;
    end if;

    update public.stock_items set statusz = 'kiadva' where id = v.id;

    insert into public.movement_log
      (tipus, stock_item_id, mennyiseg, forras_location_id, delivery_note_id, user_id)
    values
      ('kiadas', v.id, v.mennyiseg_alapegysegben, v.location_id, v_note_id, auth.uid());
  end loop;

  return v_note_id;
end;
$$;

grant execute on function public.kigyujt(uuid, integer) to authenticated;
grant execute on function public.kiad(text, date, uuid[]) to authenticated;
