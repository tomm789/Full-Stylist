-- Drop stale RLS SELECT policies that were replaced by later migrations
-- but never explicitly dropped. PostgreSQL ORs all SELECT policies on a
-- table, so stale ones still get evaluated per row — wasting CPU.

-- wardrobe_items: 0002 policy replaced by 0022 (wardrobe_items_read_followers)
-- 0022 dropped wardrobe_items_read_public_followers AND
-- wardrobe_items_read_accessible, but the original from 0002 may persist
-- if it wasn't matched by name.
DROP POLICY IF EXISTS "wardrobe_items_read_public_followers" ON public.wardrobe_items;

-- Safety drops for policies already handled by 0016 and 0018:
DROP POLICY IF EXISTS "outfits_read_public_followers" ON public.outfits;
DROP POLICY IF EXISTS "posts_read_public" ON public.posts;
