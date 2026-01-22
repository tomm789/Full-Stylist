-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type visibility as enum ('public','followers','private_link','private','inherit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type follow_status as enum ('requested','accepted','blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('queued','running','succeeded','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_entity_type as enum ('outfit','lookbook');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attr_source as enum ('user','ai','derived','imported');
exception when duplicate_object then null; end $$;

-- Users (Supabase auth.users exists; use profile tables keyed by auth uid)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  account_privacy text not null check (account_privacy in ('public','private')) default 'public',
  search_visibility text not null check (search_visibility in ('visible','hidden')) default 'visible',
  default_visibility visibility not null default 'followers',
  allow_external_sharing boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references public.users(id) on delete cascade,
  followed_user_id uuid not null references public.users(id) on delete cascade,
  status follow_status not null default 'requested',
  created_at timestamptz default now(),
  unique (follower_user_id, followed_user_id)
);

-- Storage metadata (images)
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.users(id) on delete set null,
  storage_bucket text not null default 'media',
  storage_key text not null,
  mime_type text,
  width int,
  height int,
  source text not null check (source in ('upload','ai_generated')) default 'upload',
  created_at timestamptz default now()
);

-- Wardrobe
create table if not exists public.wardrobes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'My Wardrobe',
  visibility visibility not null default 'followers',
  share_slug text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.wardrobe_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table if not exists public.wardrobe_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.wardrobe_categories(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  unique (category_id, name)
);

create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  wardrobe_id uuid not null references public.wardrobes(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  category_id uuid not null references public.wardrobe_categories(id),
  subcategory_id uuid references public.wardrobe_subcategories(id),
  brand text,
  color_primary text,
  color_palette jsonb,
  size jsonb,
  material jsonb,
  seasonality jsonb,
  is_favorite boolean not null default false,
  visibility_override visibility not null default 'inherit',
  -- commerce + resale foundations
  condition text check (condition in ('new','like_new','good','worn')),
  is_sellable boolean not null default false,
  inventory_type text check (inventory_type in ('single','multi')) default 'single',
  inventory_count int,
  sku text,
  retail_price numeric,
  sale_price numeric,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.wardrobe_item_images (
  id uuid primary key default gen_random_uuid(),
  wardrobe_item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  image_id uuid not null references public.images(id) on delete cascade,
  type text not null check (type in ('original','product_shot','detail','on_body')) default 'original',
  sort_order int not null default 0
);

-- Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  visibility visibility not null default 'private',
  created_at timestamptz default now(),
  unique (owner_user_id, name)
);

create table if not exists public.tag_links (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  entity_type text not null check (entity_type in ('wardrobe_item','outfit','lookbook')),
  entity_id uuid not null,
  created_at timestamptz default now()
);

-- Outfits
create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  title text,
  notes text,
  visibility visibility not null default 'followers',
  share_slug text unique,
  is_favorite boolean not null default false,
  cover_image_id uuid references public.images(id),
  attribute_cache jsonb,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enforce one item per category per outfit
create table if not exists public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  category_id uuid not null references public.wardrobe_categories(id),
  wardrobe_item_id uuid not null references public.wardrobe_items(id),
  position int not null default 0,
  created_at timestamptz default now(),
  unique (outfit_id, category_id)
);

create table if not exists public.outfit_renders (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  image_id uuid references public.images(id),
  prompt text,
  reference_image_id uuid references public.images(id),
  settings jsonb not null default '{}'::jsonb,
  status job_status not null default 'queued',
  created_at timestamptz default now()
);

-- Lookbooks
create table if not exists public.lookbooks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  visibility visibility not null default 'followers',
  share_slug text unique,
  type text not null check (type in ('custom_manual','custom_filter','system_all','system_favorites','system_recent','system_top')) default 'custom_manual',
  filter_definition jsonb,
  cover_image_id uuid references public.images(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.lookbook_outfits (
  id uuid primary key default gen_random_uuid(),
  lookbook_id uuid not null references public.lookbooks(id) on delete cascade,
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz default now(),
  unique (lookbook_id, outfit_id)
);

-- Calendar
create table if not exists public.calendar_slot_presets (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('system','user')) default 'system',
  owner_user_id uuid references public.users(id) on delete cascade,
  name text not null,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (scope, owner_user_id, name)
);

create table if not exists public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (owner_user_id, date)
);

create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  calendar_day_id uuid not null references public.calendar_days(id) on delete cascade,
  outfit_id uuid references public.outfits(id),
  slot_preset_id uuid references public.calendar_slot_presets(id),
  custom_label text,
  start_time time,
  end_time time,
  status text not null check (status in ('planned','worn','skipped')) default 'planned',
  notes text,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Social: posts (only outfits/lookbooks)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  entity_type post_entity_type not null,
  entity_id uuid not null,
  caption text,
  visibility visibility not null default 'public',
  share_slug text unique,
  created_at timestamptz default now()
);

create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  original_post_id uuid not null references public.posts(id) on delete cascade,
  caption text,
  created_at timestamptz default now(),
  unique (user_id, original_post_id)
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('post','outfit','lookbook')),
  entity_id uuid not null,
  created_at timestamptz default now(),
  unique (user_id, entity_type, entity_id)
);

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('post','outfit','lookbook')),
  entity_id uuid not null,
  created_at timestamptz default now(),
  unique (user_id, entity_type, entity_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('post','outfit','lookbook')),
  entity_id uuid not null,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Attributes for similarity + AI (wardrobe_item + outfit)
create table if not exists public.attribute_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  type text not null check (type in ('enum','multiselect','text','numeric')) default 'multiselect',
  scope text not null check (scope in ('wardrobe_item','outfit','both')) default 'both',
  created_at timestamptz default now()
);

create table if not exists public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.attribute_definitions(id) on delete cascade,
  value text not null,
  normalized_value text,
  unique (definition_id, value)
);

create table if not exists public.entity_attributes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('wardrobe_item','outfit')),
  entity_id uuid not null,
  definition_id uuid not null references public.attribute_definitions(id) on delete cascade,
  value_id uuid references public.attribute_values(id) on delete set null,
  raw_value text,
  confidence numeric,
  source attr_source not null default 'user',
  created_at timestamptz default now()
);

-- AI jobs
create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  job_type text not null check (job_type in (
    'profile_photo','product_shot','auto_tag','outfit_suggest','outfit_render','lookbook_generate','reference_match'
  )),
  input jsonb not null default '{}'::jsonb,
  status job_status not null default 'queued',
  result jsonb,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Monetisation: plans + usage
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  monthly_price numeric not null default 0,
  ai_render_limit int not null default 0,
  ai_suggest_limit int not null default 0,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null check (status in ('active','canceled','expired')) default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz
);

create table if not exists public.ai_usage_counters (
  user_id uuid not null references public.users(id) on delete cascade,
  period_start date not null,
  renders_used int not null default 0,
  suggests_used int not null default 0,
  reference_matches_used int not null default 0,
  primary key (user_id, period_start)
);

-- Ads (tables only)
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('image','video','native_card')),
  target_context text not null check (target_context in ('generating','feed','carousel')),
  image_id uuid references public.images(id),
  cta_url text,
  sponsor_name text,
  active_from timestamptz,
  active_to timestamptz
);

create table if not exists public.ad_impressions (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  context text not null,
  created_at timestamptz default now()
);

-- Commerce: resale + bundles (data foundation)
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.users(id) on delete cascade,
  wardrobe_item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  price numeric not null,
  currency text not null default 'AUD',
  condition text not null check (condition in ('new','like_new','good','worn')),
  status text not null check (status in ('active','sold','withdrawn')) default 'active',
  created_at timestamptz default now()
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_id uuid not null references public.images(id) on delete cascade,
  sort_order int not null default 0
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid references public.users(id) on delete set null,
  seller_user_id uuid references public.users(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  amount numeric not null default 0,
  platform_fee numeric not null default 0,
  status text not null check (status in ('pending','paid','shipped','completed','canceled')) default 'pending',
  created_at timestamptz default now()
);

-- Outfit bundles and packaging rules
create table if not exists public.outfit_bundles (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  seller_user_id uuid not null references public.users(id) on delete cascade,
  bundle_price numeric,
  currency text not null default 'AUD',
  sale_mode text not null check (sale_mode in ('items_only','bundle_only','both')) default 'both',
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.bundle_groups (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.outfit_bundles(id) on delete cascade,
  title text not null, -- e.g., "Matching set", "2-piece suit"
  is_required boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.bundle_group_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.bundle_groups(id) on delete cascade,
  wardrobe_item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  quantity int not null default 1,
  unique (group_id, wardrobe_item_id)
);