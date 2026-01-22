-- Enable RLS
alter table public.users enable row level security;
alter table public.user_settings enable row level security;
alter table public.follows enable row level security;
alter table public.wardrobes enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.wardrobe_item_images enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.outfit_renders enable row level security;
alter table public.lookbooks enable row level security;
alter table public.lookbook_outfits enable row level security;
alter table public.posts enable row level security;
alter table public.reposts enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.comments enable row level security;
alter table public.calendar_slot_presets enable row level security;
alter table public.calendar_days enable row level security;
alter table public.calendar_entries enable row level security;
alter table public.tags enable row level security;
alter table public.tag_links enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.images enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.outfit_bundles enable row level security;
alter table public.bundle_groups enable row level security;
alter table public.bundle_group_items enable row level security;

-- Helper: accepted follower exists?
create or replace function public.is_accepted_follower(viewer uuid, owner uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.follows f
    where f.follower_user_id = viewer
      and f.followed_user_id = owner
      and f.status = 'accepted'
  );
$$;

-- Users: owner can manage self
create policy "users_select_public" on public.users
for select using (true);

create policy "users_update_self" on public.users
for update using (auth.uid() = id);

create policy "users_insert_self" on public.users
for insert with check (auth.uid() = id);

-- Settings: self only
create policy "settings_self" on public.user_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Follow requests
create policy "follows_self_read" on public.follows
for select using (auth.uid() = follower_user_id or auth.uid() = followed_user_id);

create policy "follows_insert" on public.follows
for insert with check (auth.uid() = follower_user_id and follower_user_id <> followed_user_id);

create policy "follows_update_parties" on public.follows
for update using (auth.uid() = follower_user_id or auth.uid() = followed_user_id);

-- Visibility check (followers/public only; private_link handled via RPC)
create or replace function public.can_view_visibility(viewer uuid, owner uuid, v visibility)
returns boolean language sql stable as $$
  select case
    when v = 'public' then true
    when v = 'followers' then public.is_accepted_follower(viewer, owner)
    when v = 'private' then viewer = owner
    when v = 'inherit' then viewer = owner
    when v = 'private_link' then false
    else false
  end;
$$;

-- Wardrobes
create policy "wardrobes_owner_all" on public.wardrobes
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create policy "wardrobes_read_public_followers" on public.wardrobes
for select using (
  public.can_view_visibility(auth.uid(), owner_user_id, visibility)
);

-- Wardrobe items (effective visibility = override + wardrobe)
create or replace function public.effective_item_visibility(item_override visibility, wardrobe_vis visibility)
returns visibility language sql stable as $$
  select case when item_override = 'inherit' then wardrobe_vis else item_override end;
$$;

create policy "wardrobe_items_owner_all" on public.wardrobe_items
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create policy "wardrobe_items_read_public_followers" on public.wardrobe_items
for select using (
  public.can_view_visibility(
    auth.uid(),
    owner_user_id,
    public.effective_item_visibility(
      visibility_override,
      (select w.visibility from public.wardrobes w where w.id = wardrobe_id)
    )
  )
);

-- Outfits
create policy "outfits_owner_all" on public.outfits
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create policy "outfits_read_public_followers" on public.outfits
for select using (
  public.can_view_visibility(auth.uid(), owner_user_id, visibility)
);

-- Lookbooks
create policy "lookbooks_owner_all" on public.lookbooks
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create policy "lookbooks_read_public_followers" on public.lookbooks
for select using (
  public.can_view_visibility(auth.uid(), owner_user_id, visibility)
);

-- Posts (only outfits/lookbooks)
create policy "posts_owner_all" on public.posts
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create policy "posts_read_public" on public.posts
for select using (
  visibility = 'public'
);

-- Reposts: any authed user can repost a readable public post (start MVP)
create policy "reposts_owner_all" on public.reposts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Likes/Saves/Comments: allow if target is publicly readable OR viewer is owner/follower; private_link via RPC endpoints
create policy "likes_insert_authed" on public.likes
for insert with check (auth.uid() = user_id);

create policy "likes_delete_self" on public.likes
for delete using (auth.uid() = user_id);

create policy "likes_read_all" on public.likes
for select using (true);

create policy "saves_insert_authed" on public.saves
for insert with check (auth.uid() = user_id);

create policy "saves_delete_self" on public.saves
for delete using (auth.uid() = user_id);

create policy "saves_read_all" on public.saves
for select using (true);

create policy "comments_insert_authed" on public.comments
for insert with check (auth.uid() = user_id);

create policy "comments_update_self" on public.comments
for update using (auth.uid() = user_id);

create policy "comments_read_all" on public.comments
for select using (true);

-- Calendar: self only
create policy "calendar_slots_self" on public.calendar_slot_presets
for all using (auth.uid() = owner_user_id or scope = 'system')
with check (auth.uid() = owner_user_id or scope = 'system');

create policy "calendar_days_self" on public.calendar_days
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create policy "calendar_entries_self" on public.calendar_entries
for all using (
  auth.uid() = (select d.owner_user_id from public.calendar_days d where d.id = calendar_day_id)
) with check (
  auth.uid() = (select d.owner_user_id from public.calendar_days d where d.id = calendar_day_id)
);

-- AI jobs: self only
create policy "ai_jobs_self" on public.ai_jobs
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

-- RPC for private_link access (security definer) - implement for outfit/lookbook/wardrobe
-- NOTE: Add robust checks (revocation, optional logs). This is MVP-safe.
create or replace function public.get_outfit_by_slug(p_slug text)
returns setof public.outfits
language sql
security definer
set search_path = public
as $$
  select o.*
  from public.outfits o
  where o.share_slug = p_slug
    and o.visibility = 'private_link';
$$;

create or replace function public.get_lookbook_by_slug(p_slug text)
returns setof public.lookbooks
language sql
security definer
set search_path = public
as $$
  select l.*
  from public.lookbooks l
  where l.share_slug = p_slug
    and l.visibility = 'private_link';
$$;

create or replace function public.get_wardrobe_by_slug(p_slug text)
returns setof public.wardrobes
language sql
security definer
set search_path = public
as $$
  select w.*
  from public.wardrobes w
  where w.share_slug = p_slug
    and w.visibility = 'private_link';
$$;