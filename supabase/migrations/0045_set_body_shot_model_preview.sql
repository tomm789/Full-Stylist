alter table public.user_settings
  alter column ai_model_body_shot_generate set default 'gemini-3-pro-image-preview';

update public.user_settings
  set ai_model_body_shot_generate = 'gemini-3-pro-image-preview'
  where ai_model_body_shot_generate = 'gemini-3-pro-image'
     or ai_model_body_shot_generate is null;
