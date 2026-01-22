-- Drop the old restrictive policy
drop policy if exists "posts_read_public" on public.posts;

-- Create new policy that allows:
-- 1. Own posts (any visibility)
-- 2. Public posts from anyone
-- 3. Posts with visibility='followers' from users you're following (accepted status)
create policy "posts_read_accessible" on public.posts
for select using (
  -- Own posts (any visibility)
  auth.uid() = owner_user_id
  OR
  -- Public posts from anyone
  visibility = 'public'
  OR
  -- Posts from users you follow with accepted status (visibility = followers)
  (
    visibility = 'followers'
    AND exists (
      select 1 from public.follows f
      where f.follower_user_id = auth.uid()
        and f.followed_user_id = owner_user_id
        and f.status = 'accepted'
    )
  )
);
