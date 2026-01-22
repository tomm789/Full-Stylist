-- Storage Bucket Setup
-- Creates the 'media' bucket and configures policies for image uploads

-- Create storage bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true, -- Public bucket (allows public read access)
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Storage Policies for 'media' bucket

-- Policy: Allow authenticated users to upload files to their own folder
create policy "Users can upload to their own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to update their own files
create policy "Users can update their own files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media' and
  (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'media' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to delete their own files
create policy "Users can delete their own files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow public read access (since bucket is public)
create policy "Public can read media files"
on storage.objects
for select
to public
using (bucket_id = 'media');

-- Policy: Allow authenticated users to read all files in media bucket
-- (for viewing other users' public images)
create policy "Authenticated users can read media files"
on storage.objects
for select
to authenticated
using (bucket_id = 'media');
