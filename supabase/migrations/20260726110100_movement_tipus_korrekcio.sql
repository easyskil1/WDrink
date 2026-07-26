-- Bevételezés szállítólevél-alapú átalakítása – 1.2: korrekció mozgástípus
-- (claude/TERV_bevetelezes_szallitolevel.md)
--
-- Felhasználói döntés: a bevételezett tételek utólag szerkeszthetők, de a
-- javítás NEM csendes UPDATE – korrekciós mozgás keletkezik a movement_log-ban,
-- így a nyomkövetés megmarad (jövedéki termékeknél ez nem opcionális).
--
-- A `mennyiseg` a korrekciós sorokban ELŐJELES DELTA (új − régi): negatív, ha
-- csökkentés, pozitív, ha növelés. A movement_log.mennyiseg-en nincs
-- pozitivitás-ellenőrzés, tehát ez sémán belül van.
--
-- KÜLÖN migrációs fájl: az `alter type ... add value` új értéke ugyanabban a
-- tranzakcióban nem használható, ezért az ezt HASZNÁLÓ RPC-k a következő
-- migrációban (20260726110200) jönnek.

alter type movement_tipus add value if not exists 'korrekcio';

notify pgrst, 'reload schema';
