-- Create table for saved wardrobe items
-- This allows users to save items from other users' wardrobes without duplicating them
-- Saved items can be viewed in the user's own wardrobe and used in outfits

create table if not exists public.saved_wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  wardrobe_item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, wardrobe_item_id)
);

-- Index for efficient lookups
create index if not exists idx_saved_wardrobe_items_user_id on public.saved_wardrobe_items(user_id);
create index if not exists idx_saved_wardrobe_items_item_id on public.saved_wardrobe_items(wardrobe_item_id);

-- RLS policies
alter table public.saved_wardrobe_items enable row level security;

-- Users can only see their own saved items
create policy "saved_wardrobe_items_select_own" on public.saved_wardrobe_items
for select
using (auth.uid() = user_id);

-- Users can only save items for themselves
create policy "saved_wardrobe_items_insert_own" on public.saved_wardrobe_items
for insert
with check (auth.uid() = user_id);

-- Users can only delete their own saved items
create policy "saved_wardrobe_items_delete_own" on public.saved_wardrobe_items
for delete
using (auth.uid() = user_id);
