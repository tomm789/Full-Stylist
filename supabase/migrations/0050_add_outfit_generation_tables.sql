-- Outfit generation sessions and variations tables
-- These tables track outfit generation sessions and their variations,
-- mirroring the headshot generation pattern (0046).

CREATE TABLE IF NOT EXISTS outfit_generation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_json jsonb NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ogs_user_recent
  ON outfit_generation_sessions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS outfit_generation_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES outfit_generation_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_job_id uuid REFERENCES ai_jobs(id) ON DELETE SET NULL,
  outfit_id uuid REFERENCES outfits(id) ON DELETE SET NULL,
  image_id uuid REFERENCES images(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  input_snapshot_json jsonb NOT NULL DEFAULT '{}',
  is_saved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ogv_session
  ON outfit_generation_variations(session_id);

CREATE INDEX IF NOT EXISTS idx_ogv_image
  ON outfit_generation_variations(image_id);

-- RLS policies
ALTER TABLE outfit_generation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_generation_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own outfit sessions"
  ON outfit_generation_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own outfit variations"
  ON outfit_generation_variations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
