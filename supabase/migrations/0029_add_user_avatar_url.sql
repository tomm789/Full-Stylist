-- Add avatar_url column to users table
-- This is optional and references an image in the images table
alter table public.users
  add column if not exists avatar_url text;

-- Add comment for documentation
comment on column public.users.avatar_url is 'URL or storage path for user avatar image';
