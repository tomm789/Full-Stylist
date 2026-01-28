# Phase 1: Database Migration Guide

## Migration Files Verified ✅

All migration files are present and complete:
- ✅ `supabase/migrations/0001_init.sql` (443 lines) - Initial schema with all tables
- ✅ `supabase/migrations/0002_rls.sql` (222 lines) - Row Level Security policies
- ✅ `supabase/seed/0001_taxonomy.sql` (51 lines) - Taxonomy seed data (categories, subcategories, calendar slots, attributes)

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended - Easiest)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `earlhvpckbcpvppvmxsd`
3. Navigate to **SQL Editor**
4. Run each migration file **in order**:

   **Step 1: Initial Schema**
   - Click "New query"
   - Copy entire contents of `supabase/migrations/0001_init.sql`
   - Paste into SQL editor
   - Click "Run" (or press Cmd+Enter / Ctrl+Enter)
   - Wait for success message

   **Step 2: Row Level Security**
   - Click "New query"
   - Copy entire contents of `supabase/migrations/0002_rls.sql`
   - Paste into SQL editor
   - Click "Run"
   - Wait for success message

   **Step 3: Seed Data**
   - Click "New query"
   - Copy entire contents of `supabase/seed/0001_taxonomy.sql`
   - Paste into SQL editor
   - Click "Run"
   - Wait for success message

5. Verify in **Table Editor** that tables exist:
   - `users`, `user_settings`, `wardrobes`, `wardrobe_items`
   - `outfits`, `lookbooks`, `posts`, `calendar_*`
   - `ai_jobs`, `images`, etc.

6. Verify seed data:
   - Check `wardrobe_categories` has 14 categories
   - Check `wardrobe_subcategories` has subcategories
   - Check `calendar_slot_presets` has 3 system slots
   - Check `attribute_definitions` has 7 attributes

### Option 2: Supabase CLI

If you have Supabase CLI linked to your project:

```bash
# Link project (first time only)
supabase link --project-ref earlhvpckbcpvppvmxsd

# Apply migrations
supabase db push

# Apply seed data (if not included in migrations)
supabase db reset --seed
```

### Option 3: Direct psql Connection

If you have database connection string:

```bash
# Get connection string from Supabase Dashboard:
# Settings > Database > Connection string > URI

export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Apply migrations
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_rls.sql
psql "$SUPABASE_DB_URL" -f supabase/seed/0001_taxonomy.sql
```

Or use the helper script:

```bash
SUPABASE_DB_URL="postgresql://..." ./scripts/apply-migrations.sh
```

## Verification Checklist

After applying migrations, verify:

### Tables Created ✅
- [ ] `public.users` exists
- [ ] `public.user_settings` exists
- [ ] `public.wardrobes` exists
- [ ] `public.wardrobe_items` exists
- [ ] `public.wardrobe_categories` exists
- [ ] `public.wardrobe_subcategories` exists
- [ ] `public.outfits` exists
- [ ] `public.outfit_items` exists
- [ ] `public.lookbooks` exists
- [ ] `public.posts` exists
- [ ] `public.ai_jobs` exists
- [ ] `public.images` exists
- [ ] All other tables from migration

### RLS Enabled ✅
- [ ] Check any table: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
- [ ] Should see policies for all tables

### Seed Data ✅
- [ ] `SELECT COUNT(*) FROM wardrobe_categories;` → Should return 14
- [ ] `SELECT COUNT(*) FROM wardrobe_subcategories;` → Should return many rows
- [ ] `SELECT COUNT(*) FROM calendar_slot_presets WHERE scope = 'system';` → Should return 3
- [ ] `SELECT COUNT(*) FROM attribute_definitions;` → Should return 7

### Functions Created ✅
- [ ] `public.is_accepted_follower()` function exists
- [ ] `public.can_view_visibility()` function exists
- [ ] `public.effective_item_visibility()` function exists
- [ ] `public.get_outfit_by_slug()` function exists
- [ ] `public.get_lookbook_by_slug()` function exists
- [ ] `public.get_wardrobe_by_slug()` function exists

## Migration Order

**CRITICAL:** Apply migrations in this exact order:

1. `0001_init.sql` - Creates all tables, enums, and base structure
2. `0002_rls.sql` - Enables RLS and creates security policies
3. `0001_taxonomy.sql` - Seeds reference data (safe to run multiple times)

## Troubleshooting

### Error: "relation already exists"
- This means tables were already created
- Use `IF NOT EXISTS` clauses - migration should handle this gracefully
- For enums, use `CREATE TYPE IF NOT EXISTS` (migration uses DO blocks)

### Error: "permission denied"
- Ensure you're using the **postgres** role or **service_role** key
- Check you have admin access to the project

### Error: "column does not exist"
- Ensure migrations were run in correct order
- Check that `0001_init.sql` completed fully before running `0002_rls.sql`

### RLS Policies Not Working
- Verify `0002_rls.sql` was applied
- Check that RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
- All tables should show `rowsecurity = true`

## Next Steps After Migration

Once migrations are applied successfully:

1. ✅ Phase 1 Complete
2. Proceed to Phase 2: Auth + Profile implementation
3. Test database connection from Expo app
4. Implement user registration and profile creation