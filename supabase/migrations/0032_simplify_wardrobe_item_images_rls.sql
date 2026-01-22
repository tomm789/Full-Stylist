-- Simplify wardrobe_item_images RLS policies using trust-based approach
-- Following the same pattern as migration 0027 for the images table:
-- Since wardrobe_items already have RLS, we don't need expensive re-checks here
-- The links table can have simple policies - security is enforced at the entity level

-- Drop the complex policies that cause 500ms+ planning times
DROP POLICY IF EXISTS "wardrobe_item_images_select_owner" ON public.wardrobe_item_images;
DROP POLICY IF EXISTS "wardrobe_item_images_select_visible" ON public.wardrobe_item_images;
DROP POLICY IF EXISTS "wardrobe_item_images_select_public" ON public.wardrobe_item_images;

-- Simple SELECT policy: authenticated users can read all wardrobe_item_images links
-- Security is enforced at the wardrobe_items and images table level
-- This eliminates the expensive EXISTS subqueries with joins
CREATE POLICY "wardrobe_item_images_select_all_authenticated" ON public.wardrobe_item_images
FOR SELECT
TO authenticated
USING (true);

-- Keep write policies restricted to owners (INSERT/UPDATE/DELETE)
-- These are less frequent operations so complex checks are acceptable
-- The existing policies for INSERT/UPDATE/DELETE remain unchanged
