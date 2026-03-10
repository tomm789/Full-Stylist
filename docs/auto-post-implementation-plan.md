# Auto-Post Feed System — Implementation Plan

> **Prerequisite reading:** [social-feed-posting-flow.md](social-feed-posting-flow.md) documents the current state.

## Design Principle

Every entity (outfit, lookbook, headshot, wardrobe item) is automatically represented on the user's feed when saved. There is no manual "publish" or "share to feed" step. Visibility settings — at account, entity-type, and per-post levels — control what others can see.

**Excluded from auto-posting:**
- Onboarding headshots (generated during signup)
- Body shots (not configured as postable entities)
- Draft/in-progress entities (posted on first save only)

---

## Current State (what already exists)

| Feature | Status | Location |
|---------|--------|----------|
| `posts` table with `entity_type`, `entity_id`, `visibility` | Exists | `src/lib/posts.ts` |
| `upsertOutfitPost()` — auto-creates post on outfit save | **Already works** | `src/lib/outfits/items.ts:13-55` |
| `createPost()` / `createHeadshotPost()` | Exists | `src/lib/posts.ts:51-147` |
| `user_settings.default_visibility` | Exists | `src/lib/settings.ts:8` |
| `'inherit'` visibility value on all entities | Exists | All entity types support it |
| Manual "Publish to Feed" for lookbooks | Exists (to be removed) | `src/hooks/lookbooks/useLookbookDetailActions.ts` |
| Manual "Share to Feed" for headshots | Exists (to be removed) | `src/hooks/headshot/useHairAndMakeup.ts` |

---

## Phase 1: Schema & Settings Changes — ✅ COMPLETE

### 1A. Add per-entity-type visibility defaults to `user_settings`

**Table:** `user_settings`
**New columns:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `default_visibility_outfit` | visibility enum | `'inherit'` | Default for new outfit posts |
| `default_visibility_lookbook` | visibility enum | `'inherit'` | Default for new lookbook posts |
| `default_visibility_headshot` | visibility enum | `'inherit'` | Default for new headshot posts |
| `default_visibility_wardrobe` | visibility enum | `'inherit'` | Default for new wardrobe posts |

When set to `'inherit'`, falls back to the existing `default_visibility` column (account-level default).

**Files to update:**
- `src/lib/settings.ts` — add columns to `UserSettings` interface
- Supabase migration — add columns with defaults

### 1B. Add onboarding flag to headshot generation

**Table:** `headshot_generation_sessions`
**New column:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `is_onboarding` | boolean | `false` | Prevents auto-posting for onboarding headshots |

The flag is set at session creation time. When a headshot variation from an onboarding session is saved, no post is created.

**Files to update:**
- `src/lib/headshot/generation.ts` — add `is_onboarding` to `HeadshotGenerationSession` type and creation function
- Onboarding flow (wherever the first headshot session is created) — pass `is_onboarding: true`

### 1C. Extend `posts` table for wardrobe aggregate posts

**Table:** `posts`
**New column:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `is_aggregate` | boolean | `false` | Marks daily wardrobe aggregate posts |

**New table:** `post_wardrobe_items` (join table for aggregate posts)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `post_id` | uuid | FK → `posts.id` |
| `wardrobe_item_id` | uuid | FK → `wardrobe_items.id` |
| `added_at` | timestamp | When the item was added to this aggregate |

**Extend `entity_type` enum:**
- Add `'wardrobe'` to the existing set: `'outfit' | 'lookbook' | 'headshot' | 'wardrobe'`

For wardrobe aggregate posts, `entity_id` will be `null` (the items are in the join table). Alternatively, `entity_id` can reference the user's wardrobe ID for consistency.

**Files to update:**
- `src/lib/posts.ts` — update `Post` interface (`entity_type` enum, `is_aggregate` field)
- Supabase migration — add column + new table

---

## Phase 2: Auto-Post Creation Logic — ✅ COMPLETE

### 2A. Outfit auto-post (already working — review only)

`upsertOutfitPost()` in `src/lib/outfits/items.ts:13-55` already creates a post when an outfit is saved for the first time, and updates visibility on subsequent saves. This is the pattern to follow for other entity types.

**Changes needed:**
- Update visibility resolution to respect the new per-type default: `outfitData.visibility || user's default_visibility_outfit || user's default_visibility || 'followers'`
- This requires passing `UserSettings` (or just the resolved default) into `saveOutfit()`

### 2B. Lookbook auto-post

Create `upsertLookbookPost()` following the same pattern as `upsertOutfitPost()`.

**Trigger point:** When a lookbook is saved/created (not when individual outfits are added to it).

**Visibility resolution:** `lookbook.visibility || user's default_visibility_lookbook || user's default_visibility || 'followers'`

**Files to modify:**
- `src/lib/lookbooks/` — add `upsertLookbookPost()`, call it from lookbook save function
- Remove manual publish logic from `src/hooks/lookbooks/useLookbookDetailActions.ts`
- Remove publish button from `app/lookbooks/[id].tsx`

### 2C. Headshot auto-post

Create `upsertHeadshotPost()` following the same pattern.

**Trigger point:** When `handleSaveVariation()` is called in `useHairAndMakeup.ts` — but only if the session is NOT onboarding (`!session.is_onboarding`).

**Visibility resolution:** `user's default_visibility_headshot || user's default_visibility || 'public'`

**Files to modify:**
- `src/lib/headshot/` — add `upsertHeadshotPost()`
- `src/hooks/headshot/useHairAndMakeup.ts` — replace manual share flow with auto-post on save, check `is_onboarding`
- Remove `ShareToFeedModal` usage from `app/hair-and-make-up.tsx` and `app/headshot/[id]/view.tsx`
- Remove `createHeadshotPost()` from `src/lib/posts.ts` (replaced by upsert)

### 2D. Wardrobe item aggregate post

New function: `upsertDailyWardrobePost()`

**Logic:**
1. On wardrobe item save, check: does a wardrobe aggregate post exist for this user today?
   - Query: `posts` where `owner_user_id = userId`, `entity_type = 'wardrobe'`, `is_aggregate = true`, `created_at >= start of today`
2. If **yes**: insert new row into `post_wardrobe_items`, update post (increment count in caption or metadata)
3. If **no**: create new aggregate post + first `post_wardrobe_items` row
   - Caption template: `"Added a new item to their wardrobe"` → updates to `"Added X new items to their wardrobe"`
   - The feed UI will render this as a carousel of wardrobe item images

**Max one aggregate post per user per day.** Additional items append to the existing post.

**Visibility resolution:** `item.visibility_override || user's default_visibility_wardrobe || user's default_visibility || 'followers'`

**Files to modify:**
- `src/lib/posts.ts` — add `upsertDailyWardrobePost()`
- `src/lib/wardrobe/items-mutations.ts` — call it from `createWardrobeItem()`

---

## Phase 3: Visibility UI

### 3A. Visibility quick-toggle (view page headers) — ✅ COMPLETE

`VisibilityToggle` component created at `src/components/shared/VisibilityToggle.tsx`. Uses `DropdownMenuModal` with Public/Followers/Link Only/Private options. Integrated into outfit, lookbook, and headshot view page headers. `usePostVisibility` hook at `src/hooks/social/usePostVisibility.ts` provides state management with optimistic updates.

### 3B. Visibility defaults settings page — ✅ COMPLETE

Added "Per-Type Defaults" section to `PrivacySettingsSection.tsx` with chip selectors for each entity type (Outfits, Lookbooks, Headshots, Wardrobe). Each type can be set to Use Default (inherit), Public, Followers, Link Only, or Private.

### 3C. First-time visibility intro modal — ✅ COMPLETE

A one-time modal that appears when a user triggers each post type for the **very first time**. The modal educates the user about auto-posting and lets them configure visibility before dismissing.

**Trigger:** Inside the save/create flow, right after the auto-post succeeds — only if the user has never posted this entity type before.

**Trigger points per type:**
- **Outfit**: after first `saveOutfit()` auto-post
- **Lookbook**: after first `saveLookbook()` auto-post (first save only)
- **Headshot**: after first `saveHeadshotVariationWithPost()` auto-post
- **Wardrobe**: after first `createWardrobeItem()` auto-post

**Modal content:**
1. Headline: "Your [outfit/lookbook/headshot/wardrobe item] is on your feed"
2. Default visibility for this type (editable — dropdown or segmented control)
3. This specific post's visibility (editable, pre-filled from default)
4. Helper text: "You can change visibility anytime using the eye icon in the header, or update your defaults in Settings."
5. Single "Done" button (blocking — must dismiss)

**Flags:** Add `has_seen_visibility_intro_outfit`, `_lookbook`, `_headshot`, `_wardrobe` boolean columns to `user_settings` (default `false`). Check before showing, set to `true` on dismissal.

**Files to create:**
- `src/components/shared/modals/FirstPostVisibilityModal.tsx` — reusable modal component
- `src/hooks/social/useFirstPostIntro.ts` — hook to check flag, show modal, update flag + visibility

**Files to modify:**
- `src/lib/settings.ts` — add `has_seen_visibility_intro_*` to `UserSettings` interface
- Supabase migration — add 4 boolean columns to `user_settings`
- `src/lib/outfits/items.ts` — return whether this was a first post
- `src/lib/lookbooks/core.ts` — return whether this was a first post
- `src/lib/headshot/generation.ts` — return whether this was a first post
- `src/lib/wardrobe/items-mutations.ts` — return whether this was a first post
- View screens (`app/outfits/[id]/view.tsx`, `app/lookbooks/[id].tsx`, `app/headshot/[id]/view.tsx`, wardrobe item view) — render modal when save flow returns `isFirstPost: true`

---

## Phase 4: Feed Query Updates — ✅ COMPLETE

### 4A. Add wardrobe posts to feed queries

**`getFeed()`** and **`getDiscoverFeed()`** in `src/lib/posts.ts` currently batch-fetch outfits, lookbooks, and headshots. Add a fourth batch for wardrobe aggregate posts:

- When `entity_type === 'wardrobe'`, fetch from `post_wardrobe_items` join table
- Hydrate with wardrobe item data (images, titles) for carousel rendering

### 4B. Update visibility resolution in feed queries

Current feed queries filter by `visibility: 'public'` for non-owner posts. Update to resolve `'inherit'`:

- If post `visibility === 'inherit'`, look up the post owner's `default_visibility` (or per-type default)
- This may be better handled as a Supabase view or database function to avoid N+1 queries

**Alternative (simpler):** Resolve `'inherit'` at write time — when a post is created, if visibility would be `'inherit'`, resolve it to the actual value from user settings. This means feed queries don't need to change. **Recommended approach.**

### 4C. Feed item rendering for wardrobe aggregates

**New component:** Wardrobe aggregate feed card

- Shows carousel of wardrobe item images
- Caption: "Added X new items to their wardrobe"
- Tapping an item navigates to the wardrobe item detail
- Engagement (likes, comments) on the aggregate post, not individual items

**Files to create:**
- `src/components/social/FeedWardrobeCard.tsx`

**Files to modify:**
- `src/components/social/FeedItem.tsx` — add case for `entity_type === 'wardrobe'`

---

## Phase 5: Remove Manual Publish Flows — ✅ COMPLETE

### 5A. Remove lookbook publish button

- Remove paper-plane icon and `handlePublish` from `app/lookbooks/[id].tsx`
- Remove `handlePublish` from `src/hooks/lookbooks/useLookbookDetailActions.ts`
- Replace with `VisibilityToggle` in header

### 5B. Remove headshot "Share to Feed" flow

- Remove "Share to Feed" menu option from `FaceMenuModal`
- Remove `ShareToFeedModal` component usage from `app/hair-and-make-up.tsx` and `app/headshot/[id]/view.tsx`
- Remove `handleShareToFeed` from `useHairAndMakeup.ts`
- Remove `createHeadshotPost()` from `src/lib/posts.ts`
- Replace with `VisibilityToggle` in header
- Consider whether `ShareToFeedModal` component itself can be deleted or repurposed

---

## Phase 6: Draft State Handling — ✅ COMPLETE

### 6A. Outfit drafts — ✅ COMPLETE

Outfits use the session/editor model. A post is only created when `saveOutfit()` is called (which triggers `upsertEntityPost()`). While the outfit is being edited/generated, no post exists.

### 6B. Headshot drafts — ✅ COMPLETE

Headshot variations are generated in a session. `is_saved: false` until the user explicitly saves. Auto-post only fires on `handleSaveVariation()` via `saveHeadshotVariationWithPost()`.

### 6C. Wardrobe item drafts — ✅ COMPLETE

Auto-post removed from `createWardrobeItem()` and deferred to explicit save. New `publishWardrobeItem()` function in `items-mutations.ts`. Detail screen shows Save/Close header buttons when navigated with `draft=true` param. Save publishes and triggers first-post intro; Close archives the item.

---

## Visibility Resolution Order (all entity types)

```
Per-post override (user changed via VisibilityToggle)
  ↓ if 'inherit'
Per-entity-type default (user_settings.default_visibility_outfit etc.)
  ↓ if 'inherit'
Account default (user_settings.default_visibility)
  ↓ if 'inherit' or not set
Hardcoded fallback: 'followers'
```

**Important:** Resolve at write time (when post is created/updated), not at read time. This keeps feed queries simple and fast.

---

## Implementation Order — ALL PHASES COMPLETE

All phases (1–6) are implemented. The auto-post feed system is fully functional.

---

## Key Files Summary

### Created (Phases 1–5)
- `src/components/shared/VisibilityToggle.tsx` — per-post visibility dropdown
- `src/hooks/social/usePostVisibility.ts` — visibility state + optimistic updates
- `src/components/social/FeedWardrobeCard.tsx` — wardrobe aggregate carousel card
- `supabase/migrations/0058_auto_post_feed_system.sql` — schema changes

### Modified (Phases 1–5)
- `src/lib/posts.ts` — `upsertEntityPost()`, `upsertDailyWardrobePost()`, `resolveVisibility()`, `updatePostVisibility()`, `getPostForEntity()`, feed query updates
- `src/lib/settings.ts` — per-type visibility columns in `UserSettings`
- `src/lib/outfits/items.ts` — auto-post with visibility resolution in `saveOutfit()`
- `src/lib/lookbooks/core.ts` — auto-post on first save in `saveLookbook()`
- `src/lib/headshot/generation.ts` — `saveHeadshotVariationWithPost()`, `is_onboarding` support
- `src/lib/wardrobe/items-mutations.ts` — auto-post in `createWardrobeItem()`
- `src/hooks/headshot/useHairAndMakeup.ts` — replaced manual share with auto-post
- `src/hooks/lookbooks/useLookbookDetailActions.ts` — removed manual publish
- `src/components/social/FeedItem.tsx` — wardrobe aggregate rendering
- `src/components/hair-and-makeup/FaceMenuModal.tsx` — removed "Share to Feed" option
- `app/outfits/[id]/view.tsx`, `app/lookbooks/[id].tsx`, `app/headshot/[id]/view.tsx` — added VisibilityToggle
- `app/hair-and-make-up.tsx` — removed ShareToFeedModal

### Removed
- `ShareToFeedModal` usage from hair-and-makeup screens
- `createHeadshotPost()` function (deprecated)
- Manual publish/share handlers and UI

### Created (Phases 3B, 3C, 6C)
- `src/components/shared/modals/FirstPostVisibilityModal.tsx` — first-time visibility intro modal
- `src/hooks/social/useFirstPostIntro.ts` — hook for first-post flag check + modal state
- `supabase/migrations/0059_add_visibility_intro_flags.sql` — `has_seen_visibility_intro_*` flags
- Per-type visibility defaults section in `PrivacySettingsSection.tsx`
- `publishWardrobeItem()` in `items-mutations.ts` — deferred auto-post for wardrobe drafts
- Draft Save/Close header buttons in wardrobe item detail screen
