# Social Feed Posting Flow — Current State

## Overview

This document maps the current processes for posting content to the social feed, covering all entity types (outfits, lookbooks, headshots). The goal is to identify gaps and plan improvements to the posting UX.

---

## Data Model

### Post Record (`posts` table)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `owner_user_id` | uuid | FK to auth user |
| `entity_type` | enum | `'outfit'` \| `'lookbook'` \| `'headshot'` |
| `entity_id` | uuid | FK to the outfit/lookbook/headshot record |
| `caption` | text? | Optional — only headshots currently use this |
| `visibility` | enum | `'public'` \| `'followers'` \| `'private_link'` \| `'private'` \| `'inherit'` |
| `share_slug` | text? | For shareable links |
| `created_at` | timestamp | |

### FeedItem (composite, assembled in code)

A `FeedItem` wraps a post with hydrated owner info, entity data, and engagement counts. It can be either a direct `post` or a `repost` (someone sharing another user's post).

### Related Tables

- **reposts** — shares of existing posts
- **likes** — on posts/outfits/lookbooks
- **saves** — bookmarked items
- **comments** — threaded comments on posts
- **follows** — determines feed visibility

---

## Posting Flows by Entity Type

### 1. Lookbook → Feed

**Entry point:** Paper-plane icon in lookbook detail header (`/app/lookbooks/[id].tsx`)

**Flow:**
1. User taps publish icon on lookbook detail screen
2. `useLookbookDetailActions.handlePublish()` fires
3. Calls `createPost(userId, 'lookbook', lookbook.id, undefined, visibility)`
4. Visibility inherited from lookbook settings (`'inherit'` → `'followers'`)
5. Toast: "Lookbook published to feed!"

**Gaps:**
- No caption input — posts without any user-written text
- No confirmation step — single tap publishes immediately
- No preview of how the post will appear in the feed
- No way to edit or update a published lookbook post

### 2. Headshot → Feed

**Entry point:** "Share to Feed" option in `FaceMenuModal` on headshot view (`/app/headshot/[id]/view.tsx`) and Hair & Make-Up screen (`/app/hair-and-make-up.tsx`)

**Flow:**
1. User opens menu on a headshot
2. Selects "Share to Feed"
3. `ShareToFeedModal` appears (bottom sheet with caption text input)
4. User optionally writes a caption, taps "Share"
5. `useHairAndMakeup.handleShareToFeed(caption, visibility)` fires
6. Calls `createHeadshotPost(userId, imageId, caption, visibility)`
7. Toast: "Your headshot has been posted to your feed."

**Gaps:**
- Visibility defaults to `'public'` with no UI to change it
- No preview of the post before sharing
- The headshot view screen's `onShareToFeed` callback may not be fully wired (TODO comment in code)

### 3. Outfit → Feed

**Current state: NO direct posting UI exists.**

- Outfits have engagement (likes, saves, comments) but no "Post to Feed" button
- The data model supports `entity_type: 'outfit'` and `createPost()` accepts it
- The feed renderer handles outfit posts correctly when they exist
- Outfit posts can only be created programmatically — there's no user-facing flow

**This is the primary gap to address.**

---

## Feed Consumption

### Feed Queries

| Function | Purpose | Visibility Filter |
|----------|---------|-------------------|
| `getFeed()` | Home feed — own posts + followed users' posts | Public posts from others; all own posts |
| `getDiscoverFeed()` | Explore — public posts from all users | `visibility: 'public'` only |

Both use batch-fetching with `Set`-based deduplication and `Promise.all()` for parallel entity hydration (outfits, lookbooks, headshots).

### Feed Screens

| Route | Status |
|-------|--------|
| `/app/(tabs)/social.tsx` | **Stubbed out** — intentionally blank |
| `/app/(tabs)/outfits/index.tsx` | Active — outfits tab with social feed views |
| `/app/social/explore.tsx` | Active — discover/explore feed |
| `/app/users/[id]/feed.tsx` | Active — user profile feed |

---

## Engagement Layer

All engagement actions are in `/src/lib/engagement/`:

| Action | Function | Tables |
|--------|----------|--------|
| Like | `likeEntity()` / `unlikeEntity()` | `likes` |
| Save | `saveEntity()` / `unsaveEntity()` | `saves` |
| Comment | `createComment()` | `comments` |
| Repost | `createRepost()` | `reposts` |

Engagement works on entity types: `'post'`, `'outfit'`, `'lookbook'`, `'feedback_thread'`.

### Feed Item Actions (UI)

The `FeedItem` component renders these action buttons:
- Like (heart), Comment (chat), Save (bookmark)
- Try on Outfit / Apply This Look (conditional on entity type)
- Repost (repeat icon)
- Find Similar (search icon, outfits only)

### Post Menu (owner vs. other)

**Own posts:** Edit Outfit, Archive Outfit, Delete Post
**Others' posts:** Try on Outfit, Apply This Look, Unfollow

---

## Key Files Reference

| Layer | File | Role |
|-------|------|------|
| **API** | `src/lib/posts.ts` | Post CRUD, feed queries |
| **API** | `src/lib/engagement/*.ts` | Likes, saves, comments, reposts |
| **Hooks** | `src/hooks/social/useFeed.ts` | Feed loading & caching |
| **Hooks** | `src/hooks/social/useSocialModals.ts` | Post menu actions |
| **Hooks** | `src/hooks/lookbooks/useLookbookDetailActions.ts` | Lookbook publish |
| **Hooks** | `src/hooks/headshot/useHairAndMakeup.ts` | Headshot share |
| **UI** | `src/components/social/FeedItem.tsx` | Feed item rendering |
| **UI** | `src/components/social/PostMenuModal.tsx` | Post context menu |
| **UI** | `src/components/headshots/ShareToFeedModal.tsx` | Caption input modal |
| **Routes** | `app/lookbooks/[id].tsx` | Lookbook detail + publish |
| **Routes** | `app/hair-and-make-up.tsx` | Headshot share entry point |
| **Routes** | `app/(tabs)/outfits/index.tsx` | Outfits tab with feed |

---

## Summary of Gaps

1. **No outfit posting flow** — the biggest missing piece. Backend supports it, UI doesn't.
2. **No caption support for lookbooks** — lookbooks publish with no user text.
3. **No visibility picker** — headshots default to public, lookbooks inherit. No UI to choose.
4. **No post preview** — neither flow shows what the post will look like before publishing.
5. **No confirmation** — lookbook publish is a single tap with no undo.
6. **Social tab is blank** — `/app/(tabs)/social.tsx` is stubbed out.
7. **Headshot share wiring** — the headshot view screen callback may be incomplete (TODO in code).
8. **No post editing** — once published, posts can only be deleted, not edited (caption, visibility).
9. **Repost UI incomplete** — can view reposts but the repost action flow isn't fully wired.
