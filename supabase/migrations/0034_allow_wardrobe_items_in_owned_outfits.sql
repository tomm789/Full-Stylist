-- Allow reading wardrobe items that are part of outfits owned by the current user
-- This ensures that when you create an outfit with saved items from other users,
-- the AI job runner can access those items' images for rendering
-- 
-- Note: This policy is additive to the existing wardrobe_items_read_followers policy.
-- PostgreSQL RLS combines SELECT policies with OR, so this adds an additional access path
-- without conflicting with existing policies.

-- Add index for performance on the EXISTS subquery
CREATE INDEX IF NOT EXISTS idx_outfit_items_wardrobe_item_id 
ON public.outfit_items(wardrobe_item_id);

CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit_id_owner 
ON public.outfits(id, owner_user_id);

CREATE POLICY "wardrobe_items_read_in_owned_outfits" ON public.wardrobe_items
FOR SELECT 
TO authenticated
USING (
  -- Allow if item is referenced in an outfit owned by the current user
  -- This covers edge cases where visibility might have changed after outfit creation
  EXISTS (
    SELECT 1 FROM public.outfit_items oi
    INNER JOIN public.outfits o ON o.id = oi.outfit_id
    WHERE oi.wardrobe_item_id = wardrobe_items.id
      AND o.owner_user_id = auth.uid()
  )
);
