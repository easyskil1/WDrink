-- =============================================================================
-- Modul 8: önálló selejtezés – opcionális dokumentum/fotó
--   - movement_log.dokumentum_url mező
--   - selejt-notes Storage bucket
--   - selejtez RPC bővítése p_dokumentum_url alapértelmezett paraméterrel
--     (a meglévő 5 argumentumos hívások változatlanul működnek);
--     önálló selejtezésnél p_forras_lepes = NULL is megengedett.
-- =============================================================================

alter table public.movement_log add column if not exists dokumentum_url text;

insert into storage.buckets (id, name, public)
values ('selejt-notes', 'selejt-notes', false)
on conflict (id) do nothing;

create policy "selejt_notes_read" on storage.objects
  for select using (bucket_id = 'selejt-notes' and public.is_staff());
create policy "selejt_notes_insert" on storage.objects
  for insert with check (bucket_id = 'selejt-notes' and public.is_staff());
create policy "selejt_notes_delete" on storage.objects
  for delete using (bucket_id = 'selejt-notes' and public.is_admin());

-- A régi 5-argumentumos változat eldobása, hogy ne legyen túlterhelés-ütközés.
drop function if exists public.selejtez(uuid, integer, selejt_ok, selejt_forras_lepes, text);

create or replace function public.selejtez(
  p_stock_item_id uuid,
  p_mennyiseg integer,
  p_selejt_ok selejt_ok,
  p_forras_lepes selejt_forras_lepes,
  p_megjegyzes text,
  p_dokumentum_url text default null
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
    (tipus, stock_item_id, mennyiseg, forras_location_id, selejt_ok, selejt_forras_lepes, user_id, megjegyzes, dokumentum_url)
  values
    ('selejtezes', v.id, p_mennyiseg, v.location_id, p_selejt_ok, p_forras_lepes, auth.uid(), p_megjegyzes, p_dokumentum_url);
end;
$$;

grant execute on function public.selejtez(uuid, integer, selejt_ok, selejt_forras_lepes, text, text) to authenticated;
