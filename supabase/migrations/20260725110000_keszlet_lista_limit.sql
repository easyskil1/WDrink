-- Készletlisták megjelenítési felső korlátja (Feladatlista 2 / H1).
-- Szerveroldali lekérdezési limit a munkalistákhoz (betárolás, kigyűjtés, stb.),
-- a Cégadatok oldalon állítható. Default 500. Ha egy lista eléri, az oldal
-- látható figyelmeztetést mutat (nincs néma levágás).
alter table public.company_settings
  add column if not exists keszlet_lista_limit integer not null default 500
  check (keszlet_lista_limit between 50 and 100000);
