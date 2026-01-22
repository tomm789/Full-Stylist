-- Simplest RLS policy: Trust entity-level security
-- Since posts, outfits, and lookbooks already have RLS, we don't need to re-check here
-- Images are only referenced through secure entities, so if you can access the entity,
-- you should be able to access its images

DROP POLICY IF EXISTS "images_select_simple_public" ON public.images;
DROP POLICY IF EXISTS "images_select_public_posts" ON public.images;
DROP POLICY IF EXISTS "images_select_own_simple" ON public.images;

-- Simple policy: authenticated users can read all images
-- Security is enforced at the entity level (posts/outfits/lookbooks/wardrobe_items)
CREATE POLICY "images_select_all_authenticated" ON public.images
FOR SELECT
TO authenticated
USING (true);

-- Note: Write operations (INSERT/UPDATE/DELETE) are still restricted to owners
-- This only affects SELECT operations
