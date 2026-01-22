# Row-Level Security (RLS) Strategy

## Overview

This document describes the **current, authoritative RLS strategy** for the Full Stylist application. It replaces 11 obsolete migration files that contained overcomplicated and deprecated approaches.

**Last Updated:** January 2026  
**Migration State:** Based on migrations through 0032

---

## Core Principle: Trust Entity Security

Our RLS strategy follows a **trust-based security model**:

1. **Entity tables** (users, wardrobes, wardrobe_items, outfits, lookbooks, posts) enforce visibility rules
2. **Junction/link tables** (wardrobe_item_images, outfit_items, lookbook_outfits) have simple authenticated access
3. **Asset tables** (images) have simple authenticated read access
4. **Write operations** are always restricted to owners

### Why This Approach?

- **Performance**: Eliminates expensive nested EXISTS subqueries and multi-table joins in RLS policies
- **Simplicity**: Security is enforced once at the entity level, not re-checked at every table
- **Maintainability**: Easy to understand and debug
- **Correctness**: If you can access an outfit through RLS, you should be able to access its images

---

## Current RLS Policies by Table

### 1. Images Table (`public.images`)

**Migration:** `0027_images_rls_trust_entity_security.sql`

```sql
-- SELECT: All authenticated users can read all images
CREATE POLICY "images_select_all_authenticated" ON public.images
FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: Restricted to owners (from 0002_rls.sql)
CREATE POLICY "images_insert_owner" ON public.images
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "images_update_owner" ON public.images
FOR UPDATE TO authenticated
USING (auth.uid() = owner_user_id);

CREATE POLICY "images_delete_owner" ON public.images
FOR DELETE TO authenticated
USING (auth.uid() = owner_user_id);
```

**Rationale:**
- Images are only referenced through secure entities (wardrobe_items, outfits)
- If entity RLS allows access, image access is safe
- Write operations ensure users can only modify their own images
- **DO NOT add complex visibility checks or follower checks here** - they cause severe performance issues

### 2. Wardrobe Item Images Table (`public.wardrobe_item_images`)

**Migration:** `0032_simplify_wardrobe_item_images_rls.sql`

```sql
-- SELECT: All authenticated users can read all links
CREATE POLICY "wardrobe_item_images_select_all_authenticated" ON public.wardrobe_item_images
FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: Restricted to wardrobe item owners (from 0002_rls.sql)
-- These policies check ownership through the wardrobe_items table
```

**Rationale:**
- This is a junction table linking wardrobe_items to images
- Both parent tables (wardrobe_items and images) enforce security
- Simple SELECT policy eliminates 500ms+ query planning times
- Write operations ensure proper ownership through parent table checks

### 3. Wardrobe Items Table (`public.wardrobe_items`)

**Current Migration:** `0002_rls.sql` + `0022_simple_wardrobe_items_fix.sql`

```sql
-- Owner can manage all their items
CREATE POLICY "wardrobe_items_owner_all" ON public.wardrobe_items
FOR ALL
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

-- Simplified follower-based read access
CREATE POLICY "wardrobe_items_read_followers" ON public.wardrobe_items
FOR SELECT 
TO authenticated
USING (
  auth.uid() = owner_user_id
  OR
  public.can_view_visibility(auth.uid(), owner_user_id, 'followers')
);
```

**Note:** The `can_view_visibility()` function checks if the viewer is an accepted follower or if visibility is public.

### 4. Outfits Table (`public.outfits`)

**Current Migration:** `0002_rls.sql` + `0018_fix_outfits_rls_in_lookbooks.sql`

```sql
-- Owner can manage all their outfits
CREATE POLICY "outfits_owner_all" ON public.outfits
FOR ALL
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

-- Read access based on visibility or through lookbooks
CREATE POLICY "outfits_read_accessible" ON public.outfits
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_user_id
  OR
  public.can_view_visibility(auth.uid(), owner_user_id, visibility)
  OR
  EXISTS (
    SELECT 1 
    FROM public.lookbook_outfits lo
    JOIN public.lookbooks l ON l.id = lo.lookbook_id
    WHERE lo.outfit_id = outfits.id
      AND (
        l.owner_user_id = auth.uid()
        OR public.can_view_visibility(auth.uid(), l.owner_user_id, l.visibility)
      )
  )
);
```

**Note:** The EXISTS clause is acceptable here because it's a single level deep and occurs at the entity level, not on every child table access.

### 5. Posts Table (`public.posts`)

**Current Migration:** `0016_fix_posts_rls_for_followers.sql`

```sql
-- Owner can manage all their posts
CREATE POLICY "posts_owner_all" ON public.posts
FOR ALL
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

-- Read access: own posts, public posts, or follower-only posts from followed users
CREATE POLICY "posts_read_accessible" ON public.posts
FOR SELECT
USING (
  auth.uid() = owner_user_id
  OR
  visibility = 'public'
  OR
  (
    visibility = 'followers'
    AND EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_user_id = auth.uid()
        AND f.followed_user_id = owner_user_id
        AND f.status = 'accepted'
    )
  )
);
```

### 6. Other Tables

For other tables (wardrobes, lookbooks, outfit_items, etc.), refer to `0002_rls.sql` and `0012_fix_outfit_items_rls.sql`. These follow similar patterns:

- **Owner policies**: `FOR ALL USING (auth.uid() = owner_user_id)`
- **Visibility policies**: Use `can_view_visibility()` function for read access
- **Junction tables**: Simple policies that trust parent table security

---

## Helper Functions

### `can_view_visibility(viewer, owner, visibility)`

**Defined in:** `0002_rls.sql`

```sql
CREATE OR REPLACE FUNCTION public.can_view_visibility(viewer uuid, owner uuid, v visibility)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN v = 'public' THEN true
    WHEN v = 'followers' THEN public.is_accepted_follower(viewer, owner)
    WHEN v = 'private' THEN viewer = owner
    WHEN v = 'inherit' THEN viewer = owner
    WHEN v = 'private_link' THEN false
    ELSE false
  END;
$$;
```

### `is_accepted_follower(viewer, owner)`

**Defined in:** `0002_rls.sql`

```sql
CREATE OR REPLACE FUNCTION public.is_accepted_follower(viewer uuid, owner uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows f
    WHERE f.follower_user_id = viewer
      AND f.followed_user_id = owner
      AND f.status = 'accepted'
  );
$$;
```

### `effective_item_visibility(item_override, wardrobe_vis)`

**Defined in:** `0002_rls.sql`

Used to determine if a wardrobe item inherits its wardrobe's visibility or has an override.

```sql
CREATE OR REPLACE FUNCTION public.effective_item_visibility(item_override visibility, wardrobe_vis visibility)
RETURNS visibility LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN item_override = 'inherit' THEN wardrobe_vis ELSE item_override END;
$$;
```

---

## Performance Considerations

### Indexes

The following indexes support RLS policy performance (from `0023_add_performance_indexes.sql` and subsequent migrations):

```sql
-- For follower checks
CREATE INDEX idx_follows_follower_followed_status ON public.follows(follower_user_id, followed_user_id, status);

-- For wardrobe item lookups
CREATE INDEX idx_wardrobe_items_owner_wardrobe ON public.wardrobe_items(owner_user_id, wardrobe_id);
CREATE INDEX idx_wardrobe_item_images_wardrobe_item ON public.wardrobe_item_images(wardrobe_item_id);
CREATE INDEX idx_wardrobe_item_images_image_id ON public.wardrobe_item_images(image_id);

-- For post lookups
CREATE INDEX idx_posts_entity_visibility ON public.posts(entity_type, entity_id, visibility);

-- For outfit lookups
CREATE INDEX idx_outfit_items_outfit ON public.outfit_items(outfit_id);
CREATE INDEX idx_lookbook_outfits_lookbook ON public.lookbook_outfits(lookbook_id);
```

### Query Planning Times

With the current trust-based approach:
- **images table SELECT**: ~5-10ms planning time
- **wardrobe_item_images SELECT**: ~5-10ms planning time
- **wardrobe_items SELECT**: ~20-50ms planning time (acceptable for entity table)

**⚠️ WARNING:** Adding EXISTS subqueries with joins to images or wardrobe_item_images policies can cause 500ms+ planning times.

---

## What NOT to Do

### ❌ DO NOT: Add Complex Visibility Checks to Asset Tables

**Bad Example (causes 500ms+ query planning):**

```sql
-- NEVER DO THIS on images table
CREATE POLICY "images_select_complex" ON public.images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wardrobe_item_images wii
    JOIN public.wardrobe_items wi ON wi.id = wii.wardrobe_item_id
    WHERE wii.image_id = images.id
      AND public.can_view_visibility(...)
  )
);
```

**Why it's bad:**
- Postgres must evaluate this EXISTS clause for every image row
- Multiple table joins in policy execution
- Cannot be optimized by the query planner
- Causes timeout errors on large datasets

### ❌ DO NOT: Re-check Security in Junction Tables

**Bad Example:**

```sql
-- NEVER DO THIS on junction tables
CREATE POLICY "wardrobe_item_images_complex" ON public.wardrobe_item_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wardrobe_items wi
    JOIN public.wardrobes w ON w.id = wi.wardrobe_id
    WHERE wi.id = wardrobe_item_images.wardrobe_item_id
      AND public.effective_item_visibility(...)
  )
);
```

**Why it's bad:**
- Security is already enforced at wardrobe_items table
- Redundant checks waste resources
- Junction tables are accessed through secured parent tables

### ❌ DO NOT: Mix Follower Checks with Post Visibility

**Bad Example:**

```sql
-- AVOID THIS pattern
CREATE POLICY "images_for_public_posts" ON public.images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    JOIN public.outfits o ON p.entity_id = o.id
    -- ... 5 more joins ...
    WHERE p.visibility = 'public'
  )
);
```

**Why it's bad:**
- Extremely deep join chains
- Difficult to debug and maintain
- Posts table already has RLS - trust it

---

## Decision Tree: Adding New RLS Policies

When adding a new table, use this decision tree:

```
1. Is this an entity table (users own it directly)?
   YES → Add owner policy + visibility-based read policy
   NO  → Go to 2

2. Is this a junction/link table (connects two entities)?
   YES → Simple authenticated SELECT, owner-based writes
   NO  → Go to 3

3. Is this an asset/metadata table (images, files, etc)?
   YES → Simple authenticated SELECT, owner-based writes
   NO  → Carefully evaluate - may need custom approach

4. Does the policy require an EXISTS subquery?
   YES → Only if at entity level AND single-level deep
   NO  → Prefer direct column checks
```

---

## Migration Naming Convention

To prevent future confusion:

- **Initial policies:** `NNNN_<table>_rls.sql`
- **Simple fixes:** `NNNN_fix_<table>_<issue>.sql`
- **Simplifications:** `NNNN_simplify_<table>_rls.sql`
- **Never name:** `fix_fix_`, `temporary_`, `rollback_` (indicates iteration problems)

---

## Deleted Obsolete Migrations

The following migrations were deleted to prevent confusion. They contained overcomplicated, deprecated patterns:

- `0004_images_rls.sql` - Overly permissive initial policy
- `0007_wardrobe_item_images_rls.sql` - Complex visibility checks
- `0008_fix_images_rls_for_wardrobe_items.sql` - Join-based policies
- `0009_fix_images_rls_join_issue.sql` - Expensive EXISTS subqueries
- `0010_fix_images_rls_simple_owner.sql` - Too restrictive
- `0017_fix_images_rls_for_followers.sql` - Follower checks without indexes
- `0019_fix_wardrobe_items_rls_for_outfits.sql` - Caused severe performance issues
- `0020_rollback_wardrobe_items_rls.sql` - Rollback of above
- `0024_temporary_simple_images_rls.sql` - Temporary policy
- `0025_images_rls_for_public_posts.sql` - Extremely complex multi-level joins
- `0026_simple_images_public_access.sql` - Still too complex

**If you need to reference these for historical context, they exist in git history.**

---

## Summary

**The golden rules:**

1. ✅ Entity tables enforce visibility
2. ✅ Junction/asset tables trust entity security
3. ✅ Simple policies = fast queries
4. ✅ Complex checks only at entity level
5. ❌ Never re-check security in child tables
6. ❌ Never add EXISTS subqueries to images or junction tables
7. ❌ Never try to enforce post/follower visibility in asset tables

When in doubt, refer to migrations `0027` (images) and `0032` (wardrobe_item_images) as best practice examples.
