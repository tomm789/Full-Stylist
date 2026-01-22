-- Add feedback forum feature
-- Create feedback_threads table for user feedback and discussions

create table if not exists public.feedback_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null check (category in ('bug', 'feature', 'general', 'other')) default 'general',
  status text not null check (status in ('open', 'in_progress', 'resolved', 'closed')) default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for performance
create index if not exists idx_feedback_threads_user_id on public.feedback_threads(user_id);
create index if not exists idx_feedback_threads_category on public.feedback_threads(category);
create index if not exists idx_feedback_threads_status on public.feedback_threads(status);
create index if not exists idx_feedback_threads_created on public.feedback_threads(created_at);

-- Enable RLS
alter table public.feedback_threads enable row level security;

-- RLS Policies
-- All authenticated users can read feedback threads
create policy "feedback_threads_select_all" on public.feedback_threads
for select using (auth.uid() is not null);

-- Authenticated users can create feedback threads
create policy "feedback_threads_insert_authed" on public.feedback_threads
for insert with check (auth.uid() = user_id);

-- Users can update their own threads
create policy "feedback_threads_update_owner" on public.feedback_threads
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Users can delete their own threads (soft delete via status update)
-- Note: We'll use status='closed' for soft deletes, but allow hard delete for now
create policy "feedback_threads_delete_owner" on public.feedback_threads
for delete using (auth.uid() = user_id);

-- Update comments table to support feedback_thread entity type
-- First, drop the existing check constraint
alter table public.comments
  drop constraint if exists comments_entity_type_check;

-- Add new constraint that includes 'feedback_thread'
alter table public.comments
  add constraint comments_entity_type_check 
  check (entity_type in ('post', 'outfit', 'lookbook', 'feedback_thread'));

-- Create trigger to update updated_at timestamp
create or replace function update_feedback_threads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger feedback_threads_updated_at
  before update on public.feedback_threads
  for each row
  execute function update_feedback_threads_updated_at();
