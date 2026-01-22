-- Add profile image references and AI model preference to user_settings
alter table public.user_settings
  add column if not exists headshot_image_id uuid references public.images(id) on delete set null,
  add column if not exists body_shot_image_id uuid references public.images(id) on delete set null,
  add column if not exists ai_model_preference text not null default 'gemini-2.5-flash-image',
  add column if not exists ai_model_password text; -- Hashed password for advanced models
