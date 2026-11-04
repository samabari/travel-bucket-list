-- Starred destinations are private to each user.
-- Run after the authentication and destination database migrations.

create table if not exists public.stars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  destination_id uuid not null,
  created_at timestamptz not null default now(),
  constraint stars_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade,
  constraint stars_destination_id_fkey
    foreign key (destination_id) references public.destinations (id) on delete cascade,
  constraint stars_user_destination_unique
    unique (user_id, destination_id)
);

create index if not exists stars_destination_id_idx
  on public.stars (destination_id);

alter table public.stars enable row level security;

revoke all on table public.stars from anon, authenticated;
grant select, insert, update, delete
  on table public.stars
  to authenticated;

drop policy if exists "Users can read their own stars" on public.stars;
create policy "Users can read their own stars"
  on public.stars
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own stars" on public.stars;
create policy "Users can create their own stars"
  on public.stars
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.destinations as d
      where d.id = destination_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update their own stars" on public.stars;
create policy "Users can update their own stars"
  on public.stars
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.destinations as d
      where d.id = destination_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own stars" on public.stars;
create policy "Users can delete their own stars"
  on public.stars
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
