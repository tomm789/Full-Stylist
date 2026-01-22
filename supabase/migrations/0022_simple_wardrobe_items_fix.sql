-- Simpler approach: Just make wardrobe items readable for followers
-- This matches the pattern used for outfits and other entities

-- First, ensure the slow policy is dropped
DROP POLICY IF EXISTS "wardrobe_items_read_accessible" ON public.wardrobe_items;
DROP POLICY IF EXISTS "wardrobe_items_read_public_followers" ON public.wardrobe_items;

-- Create a simple, fast policy that allows reading items when:
-- 1. You own them
-- 2. The owner's account is public or you follow them (matching outfit visibility)
CREATE POLICY "wardrobe_items_read_followers" ON public.wardrobe_items
FOR SELECT 
TO authenticated
USING (
  auth.uid() = owner_user_id
  OR
  public.can_view_visibility(auth.uid(), owner_user_id, 'followers')
);
