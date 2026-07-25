-- Termékkép URL (pl. Open Food Facts-ből importált fotó).
-- Egyelőre csak a kép URL-jét tároljuk (nem töltjük le Storage-ba).
alter table public.products
  add column if not exists kep_url text;
