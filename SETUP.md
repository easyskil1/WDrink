# Drink World Győr / WDrink – Fejlesztői setup

## 1. Környezeti változók

Másold a `.env.example`-t `.env.local`-ba, és töltsd ki a Supabase kulcsokat
(Dashboard → Project Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL` – már beállítva (`https://qjpsvylskodxzoqklwsg.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – a publikus **anon** kulcs
- `SUPABASE_SERVICE_ROLE_KEY` – a **service_role** kulcs (SOHA ne kerüljön kliensre)

## 2. Függőségek

```bash
npm install
```

## 3. Adatbázis migrációk alkalmazása

A séma a `supabase/migrations/` mappában van (source of truth). Két mód:

### A) Supabase CLI (ajánlott)

```bash
npx supabase login                 # böngészős bejelentkezés
npx supabase link --project-ref qjpsvylskodxzoqklwsg
npx supabase db push               # migrációk feltöltése a távoli DB-re
```

### B) SQL Editor (gyors)

Másold be a `supabase/migrations/` fájljainak tartalmát **sorrendben** a
Dashboard → SQL Editor felületre, és futtasd le.

## 4. Első admin felhasználó

Nincs nyilvános regisztráció. Az első usert a Dashboard → Authentication →
Users → **Add user** felületen hozd létre (email + jelszó). Ekkor egy trigger
automatikusan `staff` profilt készít. Léptesd elő adminná az SQL Editorban:

```sql
update public.profiles set role = 'admin' where id =
  (select id from auth.users where email = 'ide@az-email.hu');
```

## 5. Futtatás

```bash
npm run dev
```

A `/login`-on lépj be. A védett admin felület a `/`-on érhető el.
