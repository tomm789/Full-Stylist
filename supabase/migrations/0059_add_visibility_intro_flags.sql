-- Add has_seen_visibility_intro flags for first-post onboarding modal
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS has_seen_visibility_intro_outfit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_seen_visibility_intro_lookbook boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_seen_visibility_intro_headshot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_seen_visibility_intro_wardrobe boolean NOT NULL DEFAULT false;
