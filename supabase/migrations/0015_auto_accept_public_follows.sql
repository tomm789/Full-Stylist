-- Auto-accept existing follow requests for public accounts
update public.follows f
set status = 'accepted'
where status = 'requested'
  and exists (
    select 1 from public.user_settings s
    where s.user_id = f.followed_user_id
      and s.account_privacy = 'public'
  );

-- Create trigger to auto-accept follows for public accounts
create or replace function public.auto_accept_public_follows() returns trigger as $$
declare
  v_account_privacy text;
begin
  -- Only process if status is 'requested'
  if NEW.status <> 'requested' then
    return NEW;
  end if;

  -- Check if followed user has public account
  select account_privacy into v_account_privacy
  from public.user_settings
  where user_id = NEW.followed_user_id;

  -- Auto-accept if public account
  if v_account_privacy = 'public' then
    NEW.status := 'accepted';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Add trigger for new follow inserts
drop trigger if exists trigger_auto_accept_public_follows on public.follows;
create trigger trigger_auto_accept_public_follows
  before insert on public.follows
  for each row execute function public.auto_accept_public_follows();
