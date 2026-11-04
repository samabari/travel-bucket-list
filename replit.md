# Project notes

## Scope

The current milestone is user authentication only. Do not add destination management, dashboard, favorites, charts, or photo uploads until requested.

## Run

- Run the app with `npm run dev`.
- Vite binds to `0.0.0.0:5000` and allows Replit's preview host.
- Check the production bundle with `npm run build`.

## Supabase

- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Replit Secrets.
- Before signup, run `supabase/schema.sql` in the Supabase SQL Editor. It creates the profile table, signup trigger, and own-profile row-level security policy.
- Configure the Supabase Auth Site URL and allowed redirect URLs to include the app's URL so email confirmation returns to the app.
- The client must only use the public/anon key. Never put the service-role key in frontend code or version control.
- Passwords are managed by Supabase Auth; `public.users` stores profile metadata, not passwords.

## Git

- Authentication work stays on `feature/authentication`.
- Do not commit or push without user approval, and do not merge branches automatically.
