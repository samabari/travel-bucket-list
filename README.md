# Travel Bucket List

A personal travel journal. This branch currently contains the authentication milestone only: a landing page, account creation, login, and a protected welcome screen.

## Run in Replit

The `Start application` workflow runs the Vite development server on port 5000. To run it manually:

```sh
npm run dev
```

## Supabase setup

1. Create a Supabase project.
2. In **Project Settings → API**, copy the project URL and the public/anon client key.
3. Add them in Replit Secrets as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql) before creating accounts. It creates the `public.users` profile table, a trigger that adds each new Auth user to it, and a row-level security policy that only permits users to read their own profile.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to your app URL and add that URL to the allowed redirect URLs. Email confirmation returns to the app's current origin.

The browser client uses only the public/anon key. Never put a Supabase service-role key in client code or commit it to Git.

## Build

```sh
npm run build
```
