-- =============================================================================
-- Készletmozgás RPC-k (atomi tranzakciók) + Storage bucket a szállítólevelekhez
-- Modul 5 (bevételezés → betárolás) és Modul 8 (selejtezés) alapja.
-- =============================================================================

-- ---- Szállítólevél sorszám szekvenciák ---------------------------------------
create sequence if not exists public.delivery_bev_seq;
create sequence if not exists public.delivery_kiad_seq;

-- ---- Storage bucket a bevételezési fotóknak ----------------------------------
insert into storage.buckets (id, name, public)
values ('delivery-notes', 'delivery-notes', false)
on conflict (id) do nothing;

-- Storage RLS: csak staff/admin tölthet fel és olvashat.
create policy "delivery_notes_read" on storage.objects
  for select using (bucket_id = 'delivery-notes' and public.is_staff());
create policy "delivery_notes_insert" on storage.objects
  for insert with check (bucket_id = 'delivery-notes' and public.is_staff());
create policy "delivery_notes_delete" on storage.objects
  for delete using (bucket_id = 'delivery-notes' and public.is_admin());

-- =============================================================================
-- create_bevetelezes: új bevételezés + tételek (puffer készlet) atomikusan
--   p_items: [{ product_unit_id, mennyiseg, lot_szam, lejarat_datum,
--               selejt (bool), selejt_ok }]
--   mennyiseg a KISZERELÉS egységében értendő (pl. 3 karton), az RPC váltja át.
-- Visszaad: a létrejött delivery_note id.
-- =============================================================================
create or replace function public.create_bevetelezes(
  p_supplier_id uuid,
  p_datum date,
  p_fenykep_url text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_note_id uuid;
  v_sorszam text;
  v_item jsonb;
  v_product_id uuid;
  v_mult integer;
  v_alap integer;
  v_stock_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Nincs jogosultság.';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Legalább egy tétel szükséges.';
  end if;

  v_sorszam := 'BEV-' || to_char(coalesce(p_datum, current_date), 'YYYY')
    || '-' || lpad(nextval('public.delivery_bev_seq')::text, 5, '0');

  insert into public.delivery_notes (irany, supplier_id, datum, fenykep_url, sorszam, created_by)
  values ('bevetelezes', p_supplier_id, coalesce(p_datum, current_date), p_fenykep_url, v_sorszam, auth.uid())
  returning id into v_note_id;

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
  end loop;

  return v_note_id;
end;
$$;

-- =============================================================================
-- betarol: pufferben lévő tétel (rész)betárolása egy tárhelyre.
--   Teljes mennyiségnél a meglévő sor kap helyet; részleges betárolásnál a
--   forrás csökken, és új 'betarolva' sor jön létre a cél helyen.
-- Visszaad: a betárolt (cél) stock_item id.
-- =============================================================================
create or replace function public.betarol(
  p_stock_item_id uuid,
  p_location_id uuid,
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
  if v.statusz <> 'puffer' then
    raise exception 'Csak pufferben lévő tétel tárolható be.';
  end if;
  if p_mennyiseg <= 0 or p_mennyiseg > v.mennyiseg_alapegysegben then
    raise exception 'Érvénytelen mennyiség (elérhető: %).', v.mennyiseg_alapegysegben;
  end if;

  if p_mennyiseg = v.mennyiseg_alapegysegben then
    update public.stock_items
      set location_id = p_location_id, statusz = 'betarolva'
      where id = v.id;
    v_target := v.id;
  else
    update public.stock_items
      set mennyiseg_alapegysegben = mennyiseg_alapegysegben - p_mennyiseg
      where id = v.id;

    insert into public.stock_items
      (product_id, product_unit_id, lot_szam, lejarat_datum, location_id, mennyiseg_alapegysegben, statusz, created_by)
    values
      (v.product_id, v.product_unit_id, v.lot_szam, v.lejarat_datum, p_location_id, p_mennyiseg, 'betarolva', auth.uid())
    returning id into v_target;
  end if;

  insert into public.movement_log
    (tipus, stock_item_id, mennyiseg, cel_location_id, user_id)
  values
    ('betarolas', v_target, p_mennyiseg, p_location_id, auth.uid());

  return v_target;
end;
$$;

-- =============================================================================
-- selejtez: tetszőleges készlettétel (rész)selejtezése. Modul 5/6/8 használja.
-- =============================================================================
create or replace function public.selejtez(
  p_stock_item_id uuid,
  p_mennyiseg integer,
  p_selejt_ok selejt_ok,
  p_forras_lepes selejt_forras_lepes,
  p_megjegyzes text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v stock_items%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Nincs jogosultság.';
  end if;

  select * into v from public.stock_items where id = p_stock_item_id for update;
  if v.id is null then
    raise exception 'Ismeretlen készlettétel.';
  end if;
  if p_mennyiseg <= 0 or p_mennyiseg > v.mennyiseg_alapegysegben then
    raise exception 'Érvénytelen mennyiség (elérhető: %).', v.mennyiseg_alapegysegben;
  end if;

  if p_mennyiseg = v.mennyiseg_alapegysegben then
    update public.stock_items set mennyiseg_alapegysegben = 0, statusz = 'selejtezve'
      where id = v.id;
  else
    update public.stock_items set mennyiseg_alapegysegben = mennyiseg_alapegysegben - p_mennyiseg
      where id = v.id;
  end if;

  insert into public.movement_log
    (tipus, stock_item_id, mennyiseg, forras_location_id, selejt_ok, selejt_forras_lepes, user_id, megjegyzes)
  values
    ('selejtezes', v.id, p_mennyiseg, v.location_id, p_selejt_ok, p_forras_lepes, auth.uid(), p_megjegyzes);
end;
$$;

grant execute on function public.create_bevetelezes(uuid, date, text, jsonb) to authenticated;
grant execute on function public.betarol(uuid, uuid, integer) to authenticated;
grant execute on function public.selejtez(uuid, integer, selejt_ok, selejt_forras_lepes, text) to authenticated;
