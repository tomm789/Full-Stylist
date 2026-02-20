-- Drawing templates for the Draw Mode feature.
-- Stores the mask image path and prompt snapshot so users can
-- reload a drawing and re-generate with different text selections.

CREATE TABLE headshot_drawing_templates (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_image_id       uuid        REFERENCES images(id) ON DELETE SET NULL,
  mask_storage_path   text        NOT NULL,
  mask_storage_bucket text        NOT NULL DEFAULT 'user-images',
  prompt_snapshot_json jsonb      NOT NULL DEFAULT '{}',
  colour_map_json     jsonb       NOT NULL DEFAULT '{}',
  name                text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE headshot_drawing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own drawing templates"
  ON headshot_drawing_templates FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_hdt_user_image
  ON headshot_drawing_templates(user_id, base_image_id);
