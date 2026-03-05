-- Add missing indexes for common query patterns.
-- These cover feed queries, comment threads, like/save counts, AI job polling,
-- and ordered loading of outfit items, calendar entries, and lookbook outfits.

-- Outfit items: ordered loading by position
CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit_position
  ON outfit_items(outfit_id, position);

-- Calendar entries: ordered loading by sort_order within a day
CREATE INDEX IF NOT EXISTS idx_calendar_entries_day_sort
  ON calendar_entries(calendar_day_id, sort_order);

-- Posts: user feed queries (own posts, chronological)
CREATE INDEX IF NOT EXISTS idx_posts_owner_created
  ON posts(owner_user_id, created_at DESC);

-- Posts: lookup by entity (e.g. "find the post for this outfit")
CREATE INDEX IF NOT EXISTS idx_posts_entity
  ON posts(entity_type, entity_id);

-- Comments: thread loading ordered by time
CREATE INDEX IF NOT EXISTS idx_comments_entity_created
  ON comments(entity_type, entity_id, created_at);

-- Likes: count queries and existence checks per entity
CREATE INDEX IF NOT EXISTS idx_likes_entity
  ON likes(entity_type, entity_id);

-- Saves: count queries and existence checks per entity
CREATE INDEX IF NOT EXISTS idx_saves_entity
  ON saves(entity_type, entity_id);

-- AI jobs: polling for user's active/recent jobs
CREATE INDEX IF NOT EXISTS idx_ai_jobs_owner_status
  ON ai_jobs(owner_user_id, status, created_at DESC);

-- Lookbook outfits: ordered loading by position
CREATE INDEX IF NOT EXISTS idx_lookbook_outfits_lookbook_position
  ON lookbook_outfits(lookbook_id, position);
