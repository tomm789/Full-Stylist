-- Headshot generation sessions and variations tables
-- These tables track hair & makeup generation sessions and their variations.

CREATE TABLE IF NOT EXISTS headshot_generation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_image_id uuid REFERENCES images(id) ON DELETE SET NULL,
  input_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hgs_user_base
  ON headshot_generation_sessions(user_id, base_image_id);

CREATE TABLE IF NOT EXISTS headshot_generation_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES headshot_generation_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_job_id uuid REFERENCES ai_jobs(id) ON DELETE SET NULL,
  image_id uuid REFERENCES images(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  prompt_text text,
  input_snapshot_json jsonb NOT NULL DEFAULT '{}',
  is_saved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hgv_session
  ON headshot_generation_variations(session_id);

CREATE INDEX IF NOT EXISTS idx_hgv_image
  ON headshot_generation_variations(image_id);

-- RLS policies
ALTER TABLE headshot_generation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE headshot_generation_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions"
  ON headshot_generation_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own variations"
  ON headshot_generation_variations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
