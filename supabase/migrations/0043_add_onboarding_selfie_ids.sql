-- Add onboarding selfie references to user_settings
alter table public.user_settings
  add column if not exists selfie_image_id uuid references public.images(id) on delete set null,
  add column if not exists mirror_selfie_image_id uuid references public.images(id) on delete set null;
