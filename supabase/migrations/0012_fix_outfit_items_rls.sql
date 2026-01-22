-- Add RLS policies for outfit_items, outfit_renders, and lookbook_outfits
-- Users can manage outfit_items for outfits they own

create policy "outfit_items_owner_all" on public.outfit_items
for all using (
  auth.uid() = (select o.owner_user_id from public.outfits o where o.id = outfit_id)
) with check (
  auth.uid() = (select o.owner_user_id from public.outfits o where o.id = outfit_id)
);

-- Allow reading outfit_items if the parent outfit is readable
create policy "outfit_items_read_with_outfit" on public.outfit_items
for select using (
  exists (
    select 1 from public.outfits o
    where o.id = outfit_id
    and (
      o.owner_user_id = auth.uid()
      or public.can_view_visibility(auth.uid(), o.owner_user_id, o.visibility)
    )
  )
);

-- Outfit renders: owner can manage
create policy "outfit_renders_owner_all" on public.outfit_renders
for all using (
  auth.uid() = (select o.owner_user_id from public.outfits o where o.id = outfit_id)
) with check (
  auth.uid() = (select o.owner_user_id from public.outfits o where o.id = outfit_id)
);

-- Lookbook outfits: owner can manage
create policy "lookbook_outfits_owner_all" on public.lookbook_outfits
for all using (
  auth.uid() = (select l.owner_user_id from public.lookbooks l where l.id = lookbook_id)
) with check (
  auth.uid() = (select l.owner_user_id from public.lookbooks l where l.id = lookbook_id)
);

-- Allow reading lookbook_outfits if the parent lookbook is readable
create policy "lookbook_outfits_read_with_lookbook" on public.lookbook_outfits
for select using (
  exists (
    select 1 from public.lookbooks l
    where l.id = lookbook_id
    and (
      l.owner_user_id = auth.uid()
      or public.can_view_visibility(auth.uid(), l.owner_user_id, l.visibility)
    )
  )
);
