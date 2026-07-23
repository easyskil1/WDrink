-- =============================================================================
-- Modul 7: átrárolás RPC (betárolt tétel mozgatása másik tárhelyre)
--   Globális készletet NEM érinti, csak a hely változik.
--   Teljesnél a sor helye frissül; résznél a forrás csökken és új sor jön létre.
-- =============================================================================
create or replace function public.atrarol(
  p_stock_item_id uuid,
  p_cel_location_id uuid,
  p_mennyiseg integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v stock_items%rowtype;
  v_forras uuid;
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
    raise exception 'Csak betárolt tétel rárolható át.';
  end if;
  if v.location_id = p_cel_location_id then
    raise exception 'A cél tárhely megegyezik a jelenlegivel.';
  end if;
  if p_mennyiseg <= 0 or p_mennyiseg > v.mennyiseg_alapegysegben then
    raise exception 'Érvénytelen mennyiség (elérhető: %).', v.mennyiseg_alapegysegben;
  end if;

  v_forras := v.location_id;

  if p_mennyiseg = v.mennyiseg_alapegysegben then
    update public.stock_items set location_id = p_cel_location_id where id = v.id;
    v_target := v.id;
  else
    update public.stock_items
      set mennyiseg_alapegysegben = mennyiseg_alapegysegben - p_mennyiseg
      where id = v.id;

    insert into public.stock_items
      (product_id, product_unit_id, lot_szam, lejarat_datum, location_id, mennyiseg_alapegysegben, statusz, created_by)
    values
      (v.product_id, v.product_unit_id, v.lot_szam, v.lejarat_datum, p_cel_location_id, p_mennyiseg, 'betarolva', auth.uid())
    returning id into v_target;
  end if;

  insert into public.movement_log
    (tipus, stock_item_id, mennyiseg, forras_location_id, cel_location_id, user_id)
  values
    ('atrarolas', v_target, p_mennyiseg, v_forras, p_cel_location_id, auth.uid());

  return v_target;
end;
$$;

grant execute on function public.atrarol(uuid, uuid, integer) to authenticated;
