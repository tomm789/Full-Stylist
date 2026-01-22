-- Add critical missing indexes for wardrobe_items table
-- These indexes are essential for RLS policy performance on wardrobe_item_images

-- Index on owner_user_id for auth checks in RLS policies
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_owner_user_id 
ON public.wardrobe_items(owner_user_id);

-- Index on wardrobe_id for joins to wardrobes table in RLS policies
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_wardrobe_id 
ON public.wardrobe_items(wardrobe_id);

-- Composite index for optimal RLS policy performance (id + owner_user_id)
-- This covers the common pattern: WHERE wi.id = X AND wi.owner_user_id = auth.uid()
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_id_owner 
ON public.wardrobe_items(id, owner_user_id);
