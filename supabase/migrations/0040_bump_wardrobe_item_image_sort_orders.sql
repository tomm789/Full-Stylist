-- Single-round-trip update: bump sort_order for all images of a wardrobe item.
-- Replaces per-row loop in product_shot, wardrobe_item_render, wardrobe_item_generate.

CREATE OR REPLACE FUNCTION bump_wardrobe_item_image_sort_orders(p_wardrobe_item_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE wardrobe_item_images
  SET sort_order = sort_order + 1
  WHERE wardrobe_item_id = p_wardrobe_item_id;
$$;
