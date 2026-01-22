-- Create a performant function to get outfit items with wardrobe item details
-- This bypasses the complex RLS checks for better performance

-- Function to check if a user can view an outfit
CREATE OR REPLACE FUNCTION public.can_view_outfit(viewer_id uuid, outfit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.outfits o
    WHERE o.id = outfit_id
      AND (
        o.owner_user_id = viewer_id
        OR public.can_view_visibility(viewer_id, o.owner_user_id, o.visibility)
      )
  );
$$;

-- Function to get outfit items with wardrobe item details
-- This function allows reading wardrobe items when they're part of a viewable outfit
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
  IF NOT public.can_view_outfit(viewer_id, outfit_id) THEN
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
      'category_id', wi.category_id,
      'name', wi.name,
      'brand', wi.brand,
      'color', wi.color,
      'size', wi.size,
      'purchase_date', wi.purchase_date,
      'purchase_price', wi.purchase_price,
      'notes', wi.notes,
      'visibility_override', wi.visibility_override,
      'attribute_cache', wi.attribute_cache,
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_outfit_items_with_details(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_outfit(uuid, uuid) TO authenticated;
