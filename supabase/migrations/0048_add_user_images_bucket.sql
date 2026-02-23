-- Create user-images storage bucket for user-specific content
-- (drawing masks, template thumbnails, etc.)
-- The 'media' bucket is for user-uploaded source images;
-- 'user-images' holds internally-generated or app-managed files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-images',
  'user-images',
  false, -- Private: not publicly readable via unauthenticated URL
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Authenticated users may upload to their own sub-folder only.
-- Path pattern: {userId}/masks/..., {userId}/templates/..., etc.
create policy "Users can insert into their own folder in user-images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may read back their own files.
create policy "Users can read their own files in user-images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may delete their own files (e.g., stale masks).
create policy "Users can delete their own files in user-images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note: the Netlify AI-job runner uses the service-role key, which bypasses
-- RLS automatically, so no additional policy is needed for server-side reads.
