-- Add body_shot_generate to ai_jobs job_type check constraint
-- This job type combines a generated headshot with a body photo to create a studio model

-- Drop and recreate the constraint to add body_shot_generate
alter table public.ai_jobs
  drop constraint if exists ai_jobs_job_type_check;

alter table public.ai_jobs
  add constraint ai_jobs_job_type_check check (job_type in (
    'profile_photo',
    'product_shot',
    'auto_tag',
    'outfit_suggest',
    'outfit_render',
    'lookbook_generate',
    'reference_match',
    'headshot_generate',
    'body_shot_generate'
  ));
