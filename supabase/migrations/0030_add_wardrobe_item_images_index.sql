-- Add critical missing index for wardrobe_item_images queries
-- This index is essential for the query: SELECT * FROM wardrobe_item_images WHERE wardrobe_item_id = 'xxx'
-- Without this index, queries do sequential scans and timeout after a few page loads

CREATE INDEX IF NOT EXISTS idx_wardrobe_item_images_wardrobe_item_id 
ON public.wardrobe_item_images(wardrobe_item_id);

-- Composite index for the common query pattern with sort_order
CREATE INDEX IF NOT EXISTS idx_wardrobe_item_images_item_sort 
ON public.wardrobe_item_images(wardrobe_item_id, sort_order);
