-- Add performance indexes for images and follows tables
-- These indexes are critical for RLS policy performance

-- Index on follows table for RLS policy lookups
-- This speeds up the EXISTS check in images_select_accessible policy
create index if not exists idx_follows_follower_followed on public.follows(follower_user_id, followed_user_id, status);
create index if not exists idx_follows_followed_follower on public.follows(followed_user_id, follower_user_id, status);

-- Index on images.owner_user_id for faster filtering
create index if not exists idx_images_owner_user_id on public.images(owner_user_id);

-- Index on images.storage_key for LIKE queries
-- Using text_pattern_ops for better LIKE performance
create index if not exists idx_images_storage_key on public.images(storage_key text_pattern_ops);

-- Composite index for common query pattern: owner + storage_key LIKE
create index if not exists idx_images_owner_storage_key on public.images(owner_user_id, storage_key text_pattern_ops);
