-- Fix outfits RLS to allow viewing outfits that are part of accessible lookbooks
-- This fixes the issue where lookbook posts don't load because the outfits inside are blocked

-- Drop the existing read policy
DROP POLICY IF EXISTS "outfits_read_public_followers" ON public.outfits;

-- Create new policy that allows reading outfits if:
-- 1. Direct access: outfit visibility allows it (public/followers)
-- 2. Through lookbook: outfit is part of a lookbook the user can view
CREATE POLICY "outfits_read_accessible" ON public.outfits
FOR SELECT
TO authenticated
USING (
  -- Own outfits
  auth.uid() = owner_user_id
  OR
  -- Outfits viewable based on their visibility
  public.can_view_visibility(auth.uid(), owner_user_id, visibility)
  OR
  -- Outfits that are part of an accessible lookbook
  EXISTS (
    SELECT 1 
    FROM public.lookbook_outfits lo
    JOIN public.lookbooks l ON l.id = lo.lookbook_id
    WHERE lo.outfit_id = outfits.id
      AND (
        l.owner_user_id = auth.uid()
        OR public.can_view_visibility(auth.uid(), l.owner_user_id, l.visibility)
      )
  )
);
