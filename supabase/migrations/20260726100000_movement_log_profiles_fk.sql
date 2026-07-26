-- C2 (Feladatlista 2): a Tranzakciók oldal a felhasználóneveket külön
-- lekérdezésben szedte össze, mert a movement_log.user_id FK-ja az auth.users-re
-- megy, a PostgREST pedig csak deklarált kapcsolat mentén tud embeddelni.
--
-- Ez a migráció egy MÁSODIK idegen kulcsot vesz fel ugyanarra az oszlopra, a
-- public.profiles felé. Ettől a `profiles(nev)` embeddelhető lesz a
-- movement_log selectből → 1 körrel kevesebb minden Tranzakciók-betöltésnél.
--
-- Miért biztonságos:
--  * A profiles.id maga is auth.users(id)-ra hivatkozik, tehát a két FK
--    ugyanarra az értékkészletre mutat – nem lehet olyan user_id, ami az
--    auth.users-ben létezik, de a profiles-ban nem, mert az
--    `on_auth_user_created` trigger (init_schema.sql:83-85) minden auth.users
--    insertre létrehozza a profilt.
--  * Ellenőrizve az éles adaton a migráció írásakor: 164 movement_log sor,
--    mind kitöltött user_id-vel, 0 árva sor.
--  * A törlési szabály NO ACTION (a default), pontosan úgy, ahogy a meglévő
--    movement_log_user_id_fkey-nél – a viselkedés nem változik: mozgás-előzménnyel
--    rendelkező felhasználó eddig sem volt törölhető.
--
-- Visszavonás (ha kell): alter table public.movement_log
--   drop constraint movement_log_user_id_profiles_fkey;

alter table public.movement_log
  add constraint movement_log_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id);

-- A PostgREST séma-cache újratöltése, hogy az új kapcsolat azonnal
-- embeddelhető legyen (különben csak a következő automatikus reloadnál).
notify pgrst, 'reload schema';
