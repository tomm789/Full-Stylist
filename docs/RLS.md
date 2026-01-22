# Row Level Security (RLS) Documentation

> **⚠️ IMPORTANT:** For detailed RLS strategy, implementation patterns, and best practices, see [RLS_STRATEGY.md](./RLS_STRATEGY.md)

## Overview

All tables in the `public` schema have Row Level Security (RLS) enabled. This ensures that data access is restricted at the database level, even if an application bug or malicious query attempts to access unauthorized data.

**Current Strategy:** Trust-based security model where entity tables enforce visibility rules, and junction/asset tables have simple authenticated access policies for optimal performance.

## RLS Concepts

### Policies
Each table has policies that define:
- **SELECT**: Who can read rows
- **INSERT**: Who can create rows (and what values)
- **UPDATE**: Who can update rows (and what values)
- **DELETE**: Who can delete rows

### Helper Functions

#### `is_accepted_follower(viewer uuid, owner uuid)`
Returns `true` if the viewer is an accepted follower of the owner.

#### `can_view_visibility(viewer uuid, owner uuid, visibility visibility)`
Determines if a viewer can see an entity based on:
- `viewer` = `owner`: Always allowed
- `visibility = 'public'`: Always allowed
- `visibility = 'followers'`: Only if `is_accepted_follower(viewer, owner) = true`
- `visibility = 'private_link'`: Always allowed (share slug validation handled in application)
- `visibility = 'private'`: Only if `viewer` = `owner`

#### `effective_item_visibility(override visibility, wardrobe_visibility visibility)`
Returns the effective visibility for a wardrobe item:
- If `override` is `'inherit'`, returns `wardrobe_visibility`
- Otherwise, returns `override`

## Table-by-Table Policies

### Users (`public.users`)

**SELECT**: `users_select_public`
- **Rule**: Anyone can read user profiles (for display names, avatars, etc.)

**UPDATE**: `users_update_self`
- **Rule**: Users can only update their own profile (`auth.uid() = id`)

**INSERT**: `users_insert_self`
- **Rule**: Users can only insert their own profile (`auth.uid() = id`)

### User Settings (`public.user_settings`)

**All operations**: `user_settings_owner_all`
- **Rule**: Users can manage their own settings only (`auth.uid() = user_id`)

### Follows (`public.follows`)

**All operations**: Owner-only policies
- Users can manage their own follow relationships
- Separate policies for `follower_user_id` and `followed_user_id` operations

### Wardrobes (`public.wardrobes`)

**All operations**: `wardrobes_owner_all`
- **Rule**: Users can manage their own wardrobes (`auth.uid() = owner_user_id`)

**SELECT (additional)**: `wardrobes_read_public_followers`
- **Rule**: Viewable if `can_view_visibility(viewer, owner, visibility)` returns true

### Wardrobe Items (`public.wardrobe_items`)

**All operations**: `wardrobe_items_owner_all`
- **Rule**: Users can manage their own wardrobe items (`auth.uid() = owner_user_id`)

**SELECT (additional)**: `wardrobe_items_read_followers` (Migration 0022)
- **Rule**: Users can read:
  - Their own wardrobe items, OR
  - Items from users they follow (simplified follower-based access)
- **Note**: Uses simplified visibility check for performance

### Outfits (`public.outfits`)

**All operations**: `outfits_owner_all`
- **Rule**: Users can manage their own outfits (`auth.uid() = owner_user_id`)

**SELECT (additional)**: `outfits_read_accessible` (Migration 0018)
- **Rule**: Viewable if:
  - User owns the outfit, OR
  - `can_view_visibility(viewer, owner, visibility)` returns true, OR
  - Outfit is part of an accessible lookbook

### Lookbooks (`public.lookbooks`)

**All operations**: `lookbooks_owner_all`
- **Rule**: Users can manage their own lookbooks (`auth.uid() = owner_user_id`)

**SELECT (additional)**: `lookbooks_read_public_followers`
- **Rule**: Viewable if `can_view_visibility(viewer, owner, visibility)` returns true

### Posts (`public.posts`)

**All operations**: `posts_owner_all`
- **Rule**: Users can manage their own posts (`auth.uid() = owner_user_id`)

**SELECT (additional)**: `posts_read_accessible` (Migration 0016)
- **Rule**: Users can read:
  - Their own posts (any visibility)
  - Public posts from anyone
  - Follower-only posts from users they follow (accepted status)

### Reposts (`public.reposts`)

**All operations**: `reposts_owner_all`
- **Rule**: Users can manage their own reposts (`auth.uid() = user_id`)
- **Note**: Reposts can only be created for publicly readable posts (enforced in application)

### Likes (`public.likes`)

**INSERT**: `likes_insert_authed`
- **Rule**: Authenticated users can create likes (`auth.uid() = user_id`)

**DELETE**: `likes_delete_self`
- **Rule**: Users can only delete their own likes (`auth.uid() = user_id`)

**SELECT**: `likes_read_all`
- **Rule**: Anyone can read likes (for displaying counts)

### Saves (`public.saves`)

**INSERT**: `saves_insert_authed`
- **Rule**: Authenticated users can create saves (`auth.uid() = user_id`)

**DELETE**: `saves_delete_self`
- **Rule**: Users can only delete their own saves (`auth.uid() = user_id`)

**SELECT**: `saves_read_all`
- **Rule**: Anyone can read saves (for displaying counts)

### Comments (`public.comments`)

**INSERT**: `comments_insert_authed`
- **Rule**: Authenticated users can create comments (`auth.uid() = user_id`)

**UPDATE**: `comments_update_self`
- **Rule**: Users can only update their own comments (`auth.uid() = user_id`)

**DELETE**: `comments_delete_self`
- **Rule**: Users can only delete their own comments (`auth.uid() = user_id`)

**SELECT**: `comments_read_all`
- **Rule**: Anyone can read comments (soft-deleted comments filtered by application)

### Calendar Entries (`public.calendar_entries`)

**All operations**: `calendar_entries_owner_all`
- **Rule**: Users can manage their own calendar entries via `calendar_days` ownership
- Access controlled through `calendar_days.owner_user_id`

### Images (`public.images`)

**INSERT/UPDATE/DELETE**: Owner-only policies
- **Rule**: Users can manage their own images (`auth.uid() = owner_user_id`)

**SELECT**: `images_select_all_authenticated` (Migration 0027)
- **Rule**: All authenticated users can read all images
- **Rationale**: Security is enforced at entity level (posts, outfits, wardrobe_items)
- **Performance**: Simple policy eliminates 500ms+ query planning times

### AI Jobs (`public.ai_jobs`)

**All operations**: `ai_jobs_owner_all`
- **Rule**: Users can manage their own AI jobs (`auth.uid() = owner_user_id`)

### Listings (`public.listings`)

**All operations**: `listings_owner_all`
- **Rule**: Users can manage their own listings (`auth.uid() = seller_user_id`)

**SELECT (additional)**: `listings_read_active`
- **Rule**: Anyone can read active listings (for marketplace)

### Outfit Bundles (`public.outfit_bundles`)

**All operations**: `outfit_bundles_owner_all`
- **Rule**: Users can manage their own outfit bundles (`auth.uid() = seller_user_id`)

**SELECT (additional)**: `outfit_bundles_read_active`
- **Rule**: Anyone can read active bundles (for marketplace)

## Visibility Flow

### Example: Viewing a Wardrobe Item

1. User requests wardrobe item via API
2. RLS policy `wardrobe_items_read_public_followers` checks:
   - Is viewer the owner? → Allow
   - What is the effective visibility? (check `visibility_override` vs `wardrobe.visibility`)
   - Call `can_view_visibility(viewer, owner, effective_visibility)`
3. If `can_view_visibility()` returns `true`, row is returned
4. If `false`, no row is returned (as if it doesn't exist)

### Example: Viewing a Post

1. User requests post via API
2. RLS policy `posts_read_public` checks:
   - Is `visibility = 'public'`? → Allow
   - Otherwise, policy denies (for MVP)
3. Application can implement additional filtering for `followers` and `private_link` visibility

## Private Links

For entities with `visibility = 'private_link'`:
- RLS policy allows reading if entity is public or viewer is owner/follower
- Share slug validation is handled in **application logic** (not RLS)
- Application checks `share_slug` parameter against entity's `share_slug` field
- If slug matches, entity is viewable regardless of other visibility rules

## Best Practices

1. **Never disable RLS**: Always keep RLS enabled for all tables
2. **Test policies**: Verify policies work correctly with different user scenarios
3. **Service role key**: Only use in Netlify Functions (never in client code)
4. **Visibility helpers**: Use `can_view_visibility()` for consistent visibility checks
5. **Application + RLS**: Combine RLS with application-level validation for complex cases
6. **Trust entity security**: Don't re-check security in junction/asset tables (see [RLS_STRATEGY.md](./RLS_STRATEGY.md))
7. **Performance first**: Avoid complex EXISTS subqueries in asset table policies
8. **Simple policies**: Prefer `USING (true)` for authenticated reads on junction/asset tables

## Testing RLS Policies

To test RLS policies:
1. Create test users with different relationships (follower, non-follower, owner)
2. Test SELECT policies with different visibility values
3. Verify INSERT/UPDATE/DELETE policies prevent unauthorized modifications
4. Use Supabase dashboard to test policies directly with different `auth.uid()` values

## Junction and Asset Tables

For optimal performance, junction tables (like `wardrobe_item_images`, `outfit_items`, `lookbook_outfits`) and asset tables (like `images`) use simple authenticated access policies:

- **SELECT**: `USING (true)` for authenticated users
- **INSERT/UPDATE/DELETE**: Owner-based checks through parent tables

This "trust entity security" approach prevents expensive nested queries and improves query planning times from 500ms+ to ~5-10ms.

**See [RLS_STRATEGY.md](./RLS_STRATEGY.md) for complete details and rationale.**

## Migration History

Recent significant RLS changes:
- **Migration 0027**: Simplified images table to trust entity security
- **Migration 0032**: Simplified wardrobe_item_images to trust entity security
- **Migration 0022**: Simplified wardrobe_items visibility checks
- **Migration 0018**: Added lookbook-based outfit access
- **Migration 0016**: Added follower-based post access

**Note:** 11 obsolete migration files (0004, 0007-0010, 0017, 0019-0020, 0024-0026) were removed to prevent confusion. They contained deprecated, overcomplicated patterns that caused performance issues.
