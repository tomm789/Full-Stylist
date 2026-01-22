-- Add headshot_generate to ai_jobs job_type check constraint
-- Note: product_shot already exists in the constraint

-- Drop and recreate the constraint to add headshot_generate
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
    'headshot_generate'
  ));
