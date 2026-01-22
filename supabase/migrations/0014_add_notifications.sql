-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete cascade,
  notification_type text not null check (notification_type in (
    'like_post', 'comment_post', 'repost', 'follow_request', 'follow_accepted',
    'like_outfit', 'comment_outfit', 'like_lookbook', 'comment_lookbook'
  )),
  entity_type text check (entity_type in ('post', 'outfit', 'lookbook', 'comment', 'follow')),
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz default now(),
  
  -- Prevent self-notifications
  constraint no_self_notify check (recipient_user_id <> actor_user_id)
);

-- Indexes for performance
create index if not exists idx_notifications_recipient on public.notifications(recipient_user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(recipient_user_id, is_read) where is_read = false;
create index if not exists idx_notifications_entity on public.notifications(entity_type, entity_id);

-- RLS policies
alter table public.notifications enable row level security;

create policy "notifications_read_own" on public.notifications
for select using (auth.uid() = recipient_user_id);

create policy "notifications_update_own" on public.notifications
for update using (auth.uid() = recipient_user_id);

-- Function to create a notification (prevents duplicates within a time window)
create or replace function public.create_notification(
  p_recipient_user_id uuid,
  p_actor_user_id uuid,
  p_notification_type text,
  p_entity_type text,
  p_entity_id uuid
) returns uuid as $$
declare
  v_notification_id uuid;
  v_existing_count int;
begin
  -- Don't notify self
  if p_recipient_user_id = p_actor_user_id then
    return null;
  end if;

  -- Check for duplicate notification in last 5 minutes (prevent spam)
  select count(*) into v_existing_count
  from public.notifications
  where recipient_user_id = p_recipient_user_id
    and actor_user_id = p_actor_user_id
    and notification_type = p_notification_type
    and entity_type = p_entity_type
    and entity_id = p_entity_id
    and created_at > now() - interval '5 minutes';

  if v_existing_count > 0 then
    return null; -- Don't create duplicate
  end if;

  -- Create notification
  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    notification_type,
    entity_type,
    entity_id
  ) values (
    p_recipient_user_id,
    p_actor_user_id,
    p_notification_type,
    p_entity_type,
    p_entity_id
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$ language plpgsql security definer;

-- Trigger function for likes
create or replace function public.notify_on_like() returns trigger as $$
declare
  v_owner_id uuid;
  v_notif_type text;
begin
  -- Get owner of the entity
  if NEW.entity_type = 'post' then
    select owner_user_id into v_owner_id
    from public.posts
    where id = NEW.entity_id;
    v_notif_type := 'like_post';
  elsif NEW.entity_type = 'outfit' then
    select owner_user_id into v_owner_id
    from public.outfits
    where id = NEW.entity_id;
    v_notif_type := 'like_outfit';
  elsif NEW.entity_type = 'lookbook' then
    select owner_user_id into v_owner_id
    from public.lookbooks
    where id = NEW.entity_id;
    v_notif_type := 'like_lookbook';
  end if;

  -- Create notification if owner exists
  if v_owner_id is not null and v_owner_id <> NEW.user_id then
    perform public.create_notification(
      v_owner_id,
      NEW.user_id,
      v_notif_type,
      NEW.entity_type,
      NEW.entity_id
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger function for comments
create or replace function public.notify_on_comment() returns trigger as $$
declare
  v_owner_id uuid;
  v_notif_type text;
begin
  -- Get owner of the entity
  if NEW.entity_type = 'post' then
    select owner_user_id into v_owner_id
    from public.posts
    where id = NEW.entity_id;
    v_notif_type := 'comment_post';
  elsif NEW.entity_type = 'outfit' then
    select owner_user_id into v_owner_id
    from public.outfits
    where id = NEW.entity_id;
    v_notif_type := 'comment_outfit';
  elsif NEW.entity_type = 'lookbook' then
    select owner_user_id into v_owner_id
    from public.lookbooks
    where id = NEW.entity_id;
    v_notif_type := 'comment_lookbook';
  end if;

  -- Create notification if owner exists
  if v_owner_id is not null and v_owner_id <> NEW.user_id then
    perform public.create_notification(
      v_owner_id,
      NEW.user_id,
      v_notif_type,
      NEW.entity_type,
      NEW.entity_id
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger function for reposts
create or replace function public.notify_on_repost() returns trigger as $$
declare
  v_owner_id uuid;
begin
  -- Get owner of the original post
  select owner_user_id into v_owner_id
  from public.posts
  where id = NEW.original_post_id;

  -- Create notification if owner exists
  if v_owner_id is not null and v_owner_id <> NEW.user_id then
    perform public.create_notification(
      v_owner_id,
      NEW.user_id,
      'repost',
      'post',
      NEW.original_post_id
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger function for follows
create or replace function public.notify_on_follow() returns trigger as $$
begin
  -- Notify on new follow request
  if NEW.status = 'requested' and (OLD is null or OLD.status <> 'requested') then
    perform public.create_notification(
      NEW.followed_user_id,
      NEW.follower_user_id,
      'follow_request',
      'follow',
      NEW.id
    );
  end if;

  -- Notify when follow is accepted
  if NEW.status = 'accepted' and (OLD is null or OLD.status <> 'accepted') then
    perform public.create_notification(
      NEW.follower_user_id,
      NEW.followed_user_id,
      'follow_accepted',
      'follow',
      NEW.id
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Create triggers
drop trigger if exists trigger_notify_on_like on public.likes;
create trigger trigger_notify_on_like
  after insert on public.likes
  for each row execute function public.notify_on_like();

drop trigger if exists trigger_notify_on_comment on public.comments;
create trigger trigger_notify_on_comment
  after insert on public.comments
  for each row execute function public.notify_on_comment();

drop trigger if exists trigger_notify_on_repost on public.reposts;
create trigger trigger_notify_on_repost
  after insert on public.reposts
  for each row execute function public.notify_on_repost();

drop trigger if exists trigger_notify_on_follow on public.follows;
create trigger trigger_notify_on_follow
  after insert or update on public.follows
  for each row execute function public.notify_on_follow();
