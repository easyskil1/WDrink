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

A hálózat IPv6-ot nem támogat, ezért a direkt kapcsolat helyett az **IPv4
transaction pooler**-t használjuk (`--db-url`):

```bash
npx supabase db push --db-url \
  "postgresql://postgres.qjpsvylskodxzoqklwsg:[DB_JELSZO]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
```

Új migráció felvitele: tegyél új `.sql`-t a `supabase/migrations/`-ba, majd
futtasd újra a fenti `db push`-t. (A helyi Docker-figyelmeztetés ártalmatlan.)

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

## 5. Futtatás (helyi)

```bash
npm run dev
```

A `/login`-on lépj be. A védett admin felület a `/`-on érhető el.

## 6. Éles deploy – Vercel

A GitHub Pages NEM alkalmas (statikus), mert ez szerver-oldali Next.js app.
Vercel deploy (ingyenes):

1. https://vercel.com → **Sign in with GitHub** (easyskil1 fiók).
2. **Add New… → Project** → importáld az `easyskil1/WDrink` repót.
3. A framework automatikusan **Next.js** – ne állíts semmit.
4. **Environment Variables** – add hozzá a hármat (a `.env.local`-ból):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable kulcs)
   - `SUPABASE_SERVICE_ROLE_KEY` (secret kulcs – szerver oldali, nem publikus)
5. **Deploy**. Pár perc múlva kapsz egy `https://wdrink-….vercel.app` URL-t.
6. Belépés: `6gambino9@gmail.com` / `2026`.

A kamerás Scanner HTTPS-t igényel – a Vercel URL HTTPS, így működik.
(Supabase oldalon nincs teendő: jelszavas belépéshez nem kell redirect URL.)
