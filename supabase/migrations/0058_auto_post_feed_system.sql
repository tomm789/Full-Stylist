-- Auto-Post Feed System
-- Adds per-entity-type visibility defaults, onboarding flag for headshots,
-- and wardrobe aggregate post support.

-- Phase 1A: Per-entity-type visibility defaults on user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS default_visibility_outfit   text NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS default_visibility_lookbook text NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS default_visibility_headshot text NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS default_visibility_wardrobe text NOT NULL DEFAULT 'inherit';

-- Phase 1B: Onboarding flag for headshot generation sessions
ALTER TABLE headshot_generation_sessions
  ADD COLUMN IF NOT EXISTS is_onboarding boolean NOT NULL DEFAULT false;

-- Phase 1C: Aggregate post support
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_aggregate boolean NOT NULL DEFAULT false;

-- Join table for wardrobe aggregate posts (one post → many wardrobe items)
CREATE TABLE IF NOT EXISTS post_wardrobe_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  wardrobe_item_id uuid NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
  added_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, wardrobe_item_id)
);

-- RLS for post_wardrobe_items
ALTER TABLE post_wardrobe_items ENABLE ROW LEVEL SECURITY;

-- Users can read post_wardrobe_items for posts they can see
CREATE POLICY "post_wardrobe_items_select"
  ON post_wardrobe_items FOR SELECT
  USING (true);

-- Users can insert/update/delete their own post_wardrobe_items (via post ownership)
CREATE POLICY "post_wardrobe_items_insert"
  ON post_wardrobe_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_wardrobe_items.post_id
        AND posts.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "post_wardrobe_items_delete"
  ON post_wardrobe_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_wardrobe_items.post_id
        AND posts.owner_user_id = auth.uid()
    )
  );

-- Indexes for feed query performance
CREATE INDEX IF NOT EXISTS idx_post_wardrobe_items_post_id
  ON post_wardrobe_items(post_id);

CREATE INDEX IF NOT EXISTS idx_post_wardrobe_items_wardrobe_item_id
  ON post_wardrobe_items(wardrobe_item_id);

-- Index for daily aggregate post lookup (user + type + date)
CREATE INDEX IF NOT EXISTS idx_posts_aggregate_lookup
  ON posts(owner_user_id, entity_type, created_at DESC)
  WHERE is_aggregate = true;
