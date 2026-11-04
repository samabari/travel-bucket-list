-- Private storage for destination photos.
-- Object paths use: <auth user id>/<destination id>/<generated filename>.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'destination-photos',
  'destination-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own destination photos" on storage.objects;
create policy "Users can view their own destination photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'destination-photos'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.destinations as destination
      where destination.id::text = (storage.foldername(name))[2]
        and destination.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can upload photos to their own destinations" on storage.objects;
create policy "Users can upload photos to their own destinations"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'destination-photos'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.destinations as destination
      where destination.id::text = (storage.foldername(name))[2]
        and destination.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can replace their own destination photos" on storage.objects;
create policy "Users can replace their own destination photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'destination-photos'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.destinations as destination
      where destination.id::text = (storage.foldername(name))[2]
        and destination.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'destination-photos'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.destinations as destination
      where destination.id::text = (storage.foldername(name))[2]
        and destination.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own destination photos" on storage.objects;
create policy "Users can delete their own destination photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'destination-photos'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.destinations as destination
      where destination.id::text = (storage.foldername(name))[2]
        and destination.user_id = (select auth.uid())
    )
  );
