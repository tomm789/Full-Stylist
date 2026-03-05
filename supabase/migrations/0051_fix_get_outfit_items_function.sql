-- Fix get_outfit_items_with_details: correct column references to match actual schema.
-- Original (0021) referenced non-existent columns: name, color, purchase_date,
-- purchase_price, notes, attribute_cache.
-- Actual columns: title, color_primary, description, retail_price, etc.

CREATE OR REPLACE FUNCTION public.get_outfit_items_with_details(outfit_id uuid, viewer_id uuid)
RETURNS TABLE (
  id uuid,
  outfit_id uuid,
  category_id uuid,
  wardrobe_item_id uuid,
  position integer,
  created_at timestamptz,
  wardrobe_item jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Check if viewer can access this outfit
  IF NOT public.can_view_outfit(viewer_id, get_outfit_items_with_details.outfit_id) THEN
    RETURN;
  END IF;

  -- Return outfit items with wardrobe item details
  RETURN QUERY
  SELECT
    oi.id,
    oi.outfit_id,
    oi.category_id,
    oi.wardrobe_item_id,
    oi.position,
    oi.created_at,
    jsonb_build_object(
      'id', wi.id,
      'owner_user_id', wi.owner_user_id,
      'wardrobe_id', wi.wardrobe_id,
      'title', wi.title,
      'description', wi.description,
      'category_id', wi.category_id,
      'subcategory_id', wi.subcategory_id,
      'brand', wi.brand,
      'color_primary', wi.color_primary,
      'color_palette', wi.color_palette,
      'size', wi.size,
      'material', wi.material,
      'seasonality', wi.seasonality,
      'is_favorite', wi.is_favorite,
      'visibility_override', wi.visibility_override,
      'condition', wi.condition,
      'is_sellable', wi.is_sellable,
      'retail_price', wi.retail_price,
      'sale_price', wi.sale_price,
      'archived_at', wi.archived_at,
      'created_at', wi.created_at,
      'updated_at', wi.updated_at
    ) as wardrobe_item
  FROM public.outfit_items oi
  JOIN public.wardrobe_items wi ON wi.id = oi.wardrobe_item_id
  WHERE oi.outfit_id = get_outfit_items_with_details.outfit_id
  ORDER BY oi.position;
END;
$$;
