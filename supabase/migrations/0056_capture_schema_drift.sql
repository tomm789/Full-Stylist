-- Capture objects that exist in production but were created manually
-- (not tracked in any migration file). This ensures fresh DB resets
-- via `supabase db reset` produce an identical schema.

-- 1. wardrobe_items.deleted_at — exists in prod, missing from 0001_init
ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. users.deactivated_at — needed by src/lib/user/deletion.ts but was
--    never created. Add it now so deactivateAccount() actually works.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

-- 3. ai_generation_feedback table — exists in prod, no migration
CREATE TABLE IF NOT EXISTS public.ai_generation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  rating integer,
  fault_tags text[] DEFAULT '{}',
  custom_comment text,
  metadata jsonb DEFAULT '{}',
  outfit_id uuid REFERENCES public.outfits(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_generation_feedback ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see and create their own feedback
DO $$ BEGIN
  CREATE POLICY "feedback_select_own" ON public.ai_generation_feedback
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "feedback_insert_own" ON public.ai_generation_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_ai_feedback_job
  ON public.ai_generation_feedback(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user
  ON public.ai_generation_feedback(user_id);

-- 4. submit_ai_feedback RPC — exists in prod, no migration
CREATE OR REPLACE FUNCTION public.submit_ai_feedback(
  p_job_id uuid,
  p_job_type text,
  p_rating integer,
  p_tags text[] DEFAULT '{}',
  p_comment text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO ai_generation_feedback (user_id, job_id, job_type, rating, fault_tags, custom_comment)
  VALUES (v_user_id, p_job_id, p_job_type, p_rating, p_tags, p_comment)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  UPDATE ai_jobs SET updated_at = now() WHERE id = p_job_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_ai_feedback(uuid, text, integer, text[], text) TO authenticated;
