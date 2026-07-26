-- Bevételezés szállítólevél-alapú átalakítása – 2. FÁZIS: RPC-k
-- (claude/TERV_bevetelezes_szallitolevel.md)

-- =============================================================================
-- create_bevetelezes v2 – FIND-OR-CREATE a beszállítói szállítólevél szám alapján
--
-- Változás a v1-hez képest:
--  * Új paraméter: p_szallitolevel_szam (a beszállító papírszáma, kötelező).
--  * A supplier_id is kötelező (eddig NULL-t is engedett).
--  * NEM nyílik minden hívásra új szállítólevél: ha a (supplier_id,
--    szallitolevel_szam) páros már létezik bevételezésként, a tételek
--    HOZZÁFŰZŐDNEK. Eddig egy 20 tételes beszállítás 20 külön "szállítólevelet"
--    hozott létre, mert a wizard egy tételes módja tételenként hívta ezt.
--  * Visszatérés uuid helyett jsonb – benne a sorszam is, így az actions.ts-ben
--    megszűnik a plusz kör (a Feladatlista 2 / G2 tétele).
--
-- Paraméter bővítés miatt DROP + CREATE kell (a v1 szignatúra eltér).
-- =============================================================================

drop function if exists public.create_bevetelezes(uuid, date, text, jsonb);

create or replace function public.create_bevetelezes(
  p_supplier_id uuid,
  p_szallitolevel_szam text,
  p_datum date,
  p_fenykep_url text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_note_id  uuid;
  v_sorszam  text;
  v_szl      text;
  v_uj       boolean := false;
  v_item     jsonb;
  v_product_id uuid;
  v_mult     integer;
  v_alap     integer;
  v_stock_id uuid;
  v_db       integer := 0;
begin
  if not public.is_staff() then
    raise exception 'Nincs jogosultság.';
  end if;

  v_szl := nullif(btrim(p_szallitolevel_szam), '');
  if v_szl is null then
    raise exception 'A szállítólevél szám megadása kötelező.';
  end if;
  if p_supplier_id is null then
    raise exception 'A beszállító megadása kötelező.';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Legalább egy tétel szükséges.';
  end if;

  -- Find: ugyanaz a beszállítói papír már nyitva van-e?
  select id, sorszam into v_note_id, v_sorszam
  from public.delivery_notes
  where irany = 'bevetelezes'
    and supplier_id = p_supplier_id
    and szallitolevel_szam = v_szl;

  if v_note_id is null then
    -- Create: új levél, generált belső sorszámmal.
    v_sorszam := 'BEV-' || to_char(coalesce(p_datum, current_date), 'YYYY')
      || '-' || lpad(nextval('public.delivery_bev_seq')::text, 5, '0');

    insert into public.delivery_notes
      (irany, supplier_id, szallitolevel_szam, datum, fenykep_url, sorszam, created_by)
    values
      ('bevetelezes', p_supplier_id, v_szl, coalesce(p_datum, current_date),
       p_fenykep_url, v_sorszam, auth.uid())
    returning id into v_note_id;

    v_uj := true;
  else
    -- Hozzáfűzés: a levél `datum`-át SZÁNDÉKOSAN nem írjuk át (a papír dátuma a
    -- levélé, a tételek a saját movement_log.created_at-jüket viszik). A fotó
    -- csak akkor kerül fel, ha még nem volt.
    if p_fenykep_url is not null then
      update public.delivery_notes
        set fenykep_url = coalesce(fenykep_url, p_fenykep_url)
      where id = v_note_id;
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select product_id, mennyiseg_alapegysegben
      into v_product_id, v_mult
      from public.product_units
      where id = (v_item->>'product_unit_id')::uuid;

    if v_product_id is null then
      raise exception 'Ismeretlen kiszerelés: %', v_item->>'product_unit_id';
    end if;

    v_alap := (v_item->>'mennyiseg')::integer * v_mult;
    if v_alap <= 0 then
      raise exception 'A mennyiség legyen pozitív.';
    end if;

    if coalesce((v_item->>'selejt')::boolean, false) then
      -- Sérülten érkezett: nem kerül jó készletként, csak selejt-mozgás.
      insert into public.movement_log
        (tipus, mennyiseg, selejt_ok, selejt_forras_lepes, delivery_note_id, user_id, megjegyzes)
      values
        ('selejtezes', v_alap,
         nullif(v_item->>'selejt_ok','')::selejt_ok, 'bevetelezes',
         v_note_id, auth.uid(), 'Bevételezéskor selejtezve');
    else
      insert into public.stock_items
        (product_id, product_unit_id, lot_szam, lejarat_datum, location_id, mennyiseg_alapegysegben, statusz, created_by)
      values
        (v_product_id, (v_item->>'product_unit_id')::uuid,
         nullif(v_item->>'lot_szam',''), nullif(v_item->>'lejarat_datum','')::date,
         null, v_alap, 'puffer', auth.uid())
      returning id into v_stock_id;

      insert into public.movement_log
        (tipus, stock_item_id, mennyiseg, delivery_note_id, user_id)
      values
        ('bevetelezes', v_stock_id, v_alap, v_note_id, auth.uid());
    end if;

    v_db := v_db + 1;
  end loop;

  return jsonb_build_object(
    'note_id',            v_note_id,
    'sorszam',            v_sorszam,
    'szallitolevel_szam', v_szl,
    'uj_level',           v_uj,
    'tetelek',            v_db
  );
end;
$$;

-- =============================================================================
-- update_bevetelezes_note – a szállítólevél FEJLÉCÉNEK szerkesztése.
-- Szabadon módosítható (nem érinti a készletet): papírszám, beszállító, dátum,
-- EKAER szám, fotó.
-- =============================================================================

create or replace function public.update_bevetelezes_note(
  p_note_id uuid,
  p_supplier_id uuid,
  p_szallitolevel_szam text,
  p_datum date,
  p_ekaer_szam text,
  p_fenykep_url text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_szl text;
  v_irany delivery_irany;
begin
  if not public.is_staff() then
    raise exception 'Nincs jogosultság.';
  end if;

  select irany into v_irany from public.delivery_notes where id = p_note_id;
  if v_irany is null then
    raise exception 'Nincs ilyen szállítólevél.';
  end if;
  if v_irany <> 'bevetelezes' then
    raise exception 'Csak bevételezési szállítólevél szerkeszthető itt.';
  end if;

  v_szl := nullif(btrim(p_szallitolevel_szam), '');
  if v_szl is null then
    raise exception 'A szállítólevél szám megadása kötelező.';
  end if;
  if p_supplier_id is null then
    raise exception 'A beszállító megadása kötelező.';
  end if;

  -- Beszédes hiba a részleges unique index (delivery_notes_bev_szl_uniq) helyett.
  if exists (
    select 1 from public.delivery_notes
    where irany = 'bevetelezes'
      and supplier_id = p_supplier_id
      and szallitolevel_szam = v_szl
      and id <> p_note_id
  ) then
    raise exception 'Ehhez a beszállítóhoz már létezik ilyen szállítólevél szám: %', v_szl;
  end if;

  update public.delivery_notes
    set supplier_id        = p_supplier_id,
        szallitolevel_szam = v_szl,
        datum              = coalesce(p_datum, datum),
        ekaer_szam         = nullif(btrim(p_ekaer_szam), ''),
        fenykep_url        = coalesce(p_fenykep_url, fenykep_url)
  where id = p_note_id;
end;
$$;

-- =============================================================================
-- korrigal_bevetelezes_tetel – bevételezett tétel utólagos javítása.
--
-- Felhasználói döntés: MINDEN szerkeszthető, de a javítás korrekciós MOZGÁST
-- hagy a movement_log-ban (tipus='korrekcio', mennyiseg = ELŐJELES DELTA),
-- tehát a nyomkövetés nem sérül.
--
-- A LOT és a lejárat módosítása nem érinti a mennyiséget, ezért ahhoz nem
-- keletkezik korrekciós sor – csak a mennyiség-változás naplózódik.
-- =============================================================================

create or replace function public.korrigal_bevetelezes_tetel(
  p_stock_item_id uuid,
  p_uj_mennyiseg_alap integer,
  p_lot text,
  p_lejarat date,
  p_megjegyzes text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_regi   integer;
  v_statusz stock_statusz;
  v_note_id uuid;
  v_delta  integer;
begin
  if not public.is_staff() then
    raise exception 'Nincs jogosultság.';
  end if;
  if p_uj_mennyiseg_alap is null or p_uj_mennyiseg_alap < 0 then
    raise exception 'A mennyiség nem lehet negatív.';
  end if;

  select mennyiseg_alapegysegben, statusz
    into v_regi, v_statusz
    from public.stock_items
    where id = p_stock_item_id
    for update;

  if v_regi is null then
    raise exception 'Nincs ilyen készlet-tétel.';
  end if;

  -- A tételhez tartozó bevételezési szállítólevél (a kapcsolat a movement_log-on
  -- él, a stock_items-nek nincs delivery_note_id-ja).
  select delivery_note_id into v_note_id
    from public.movement_log
    where stock_item_id = p_stock_item_id
      and tipus = 'bevetelezes'
    order by created_at
    limit 1;

  v_delta := p_uj_mennyiseg_alap - v_regi;

  if v_delta <> 0 then
    insert into public.movement_log
      (tipus, stock_item_id, mennyiseg, delivery_note_id, user_id, megjegyzes)
    values
      ('korrekcio', p_stock_item_id, v_delta, v_note_id, auth.uid(),
       coalesce(nullif(btrim(p_megjegyzes), ''),
                'Bevételezés javítása: ' || v_regi || ' → ' || p_uj_mennyiseg_alap));
  end if;

  update public.stock_items
    set mennyiseg_alapegysegben = p_uj_mennyiseg_alap,
        lot_szam      = nullif(btrim(p_lot), ''),
        lejarat_datum = p_lejarat
  where id = p_stock_item_id;

  return jsonb_build_object(
    'regi_mennyiseg', v_regi,
    'uj_mennyiseg',   p_uj_mennyiseg_alap,
    'delta',          v_delta,
    'statusz',        v_statusz
  );
end;
$$;

-- =============================================================================
-- sztorno_bevetelezes_tetel – tétel teljes visszavonása.
-- A stock_items sor MEGMARAD (nyomkövetés), a mennyiség 0-ra áll, és a teljes
-- negatív delta korrekciós mozgásként naplózódik. A UI "sztornózva"-ként jelöli.
-- =============================================================================

create or replace function public.sztorno_bevetelezes_tetel(
  p_stock_item_id uuid,
  p_megjegyzes text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lot     text;
  v_lejarat date;
begin
  -- A LOT / lejárat MEGMARAD: a korrigáló függvény felülírja ezeket, ezért a
  -- meglévő értékeket visszaadjuk neki (különben a sztornó letörölné a tétel
  -- azonosító adatait, amikre épp a nyomkövetéshez van szükség).
  select lot_szam, lejarat_datum
    into v_lot, v_lejarat
    from public.stock_items
    where id = p_stock_item_id;

  return public.korrigal_bevetelezes_tetel(
    p_stock_item_id,
    0,
    v_lot,
    v_lejarat,
    coalesce(nullif(btrim(p_megjegyzes), ''), 'Bevételezett tétel sztornózva')
  );
end;
$$;

notify pgrst, 'reload schema';
