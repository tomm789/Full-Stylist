-- B) NULL-safe bump_wardrobe_item_image_sort_orders (COALESCE)
-- C) Atomic bump + insert with advisory lock to avoid duplicate sort_order=0 under concurrency

-- B) Replace bump function with COALESCE for robustness
CREATE OR REPLACE FUNCTION bump_wardrobe_item_image_sort_orders(p_wardrobe_item_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE wardrobe_item_images
  SET sort_order = COALESCE(sort_order, 0) + 1
  WHERE wardrobe_item_id = p_wardrobe_item_id;
$$;

-- C) Atomic bump + insert under advisory lock (per wardrobe_item_id).
-- Schema: wardrobe_item_images(id, wardrobe_item_id, image_id, type, sort_order) only.
CREATE OR REPLACE FUNCTION bump_and_insert_product_shot(
  p_wardrobe_item_id uuid,
  p_image_id uuid,
  p_type text DEFAULT 'product_shot'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_wardrobe_item_id::text)::bigint);
  UPDATE wardrobe_item_images
  SET sort_order = COALESCE(sort_order, 0) + 1
  WHERE wardrobe_item_id = p_wardrobe_item_id;
  INSERT INTO wardrobe_item_images(wardrobe_item_id, image_id, type, sort_order)
  VALUES (p_wardrobe_item_id, p_image_id, p_type, 0);
END;
$$;
