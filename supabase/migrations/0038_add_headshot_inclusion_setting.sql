-- Add include_headshot_in_generation field to user_settings
-- Defaults to false (headshots excluded by default)

alter table public.user_settings
  add column if not exists include_headshot_in_generation boolean not null default false;
