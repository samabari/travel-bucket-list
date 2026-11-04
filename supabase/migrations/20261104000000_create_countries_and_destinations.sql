-- Travel Bucket List destination database foundation.
-- This migration builds on the existing public.users profile table.

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  constraint countries_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade,
  constraint countries_name_not_empty
    check (char_length(btrim(name)) > 0),
  -- The composite key is referenced by destinations to enforce country ownership.
  constraint countries_id_user_id_unique unique (id, user_id)
);

create unique index if not exists countries_user_name_unique
  on public.countries (user_id, lower(btrim(name)));

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  country_id uuid not null,
  name text not null,
  status text not null default 'wishlist',
  visit_date date,
  rating numeric,
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  constraint destinations_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade,
  -- Including user_id prevents linking a destination to another user's country.
  constraint destinations_country_user_id_fkey
    foreign key (country_id, user_id)
    references public.countries (id, user_id)
    on delete cascade,
  constraint destinations_name_not_empty
    check (char_length(btrim(name)) > 0),
  constraint destinations_status_valid
    check (status in ('visited', 'wishlist'))
);

create index if not exists destinations_user_id_idx
  on public.destinations (user_id);

create index if not exists destinations_country_id_idx
  on public.destinations (country_id);

alter table public.countries enable row level security;
alter table public.destinations enable row level security;

revoke all on table public.countries, public.destinations from anon, authenticated;
grant select, insert, update, delete
  on table public.countries, public.destinations
  to authenticated;

drop policy if exists "Users can read their own countries" on public.countries;
create policy "Users can read their own countries"
  on public.countries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own countries" on public.countries;
create policy "Users can create their own countries"
  on public.countries
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own countries" on public.countries;
create policy "Users can update their own countries"
  on public.countries
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own countries" on public.countries;
create policy "Users can delete their own countries"
  on public.countries
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own destinations" on public.destinations;
create policy "Users can read their own destinations"
  on public.destinations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own destinations" on public.destinations;
create policy "Users can create their own destinations"
  on public.destinations
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own destinations" on public.destinations;
create policy "Users can update their own destinations"
  on public.destinations
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own destinations" on public.destinations;
create policy "Users can delete their own destinations"
  on public.destinations
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
