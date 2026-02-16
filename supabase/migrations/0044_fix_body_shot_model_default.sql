-- Restore Gemini-3 body shot model defaults
alter table public.user_settings
  alter column ai_model_body_shot_generate set default 'gemini-3-pro-image';

update public.user_settings
  set ai_model_body_shot_generate = 'gemini-3-pro-image'
  where ai_model_body_shot_generate = 'gemini-2.5-flash-image'
     or ai_model_body_shot_generate is null;
