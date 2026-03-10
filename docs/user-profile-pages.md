# User Profile Pages — Current Architecture

## Overview

Two profile page variations exist:

1. **Own Profile** — logged-in user viewing their own profile (`/(tabs)/profile`)
2. **Other User Profile** — viewing someone else's profile (`/users/[id]`)

Both share `ProfileHeader` and `ProfileStats` components but diverge significantly in tabs, content, and available actions.

---

## File Manifest

### Route / Screen Files

| File | Purpose |
|------|---------|
| `app/(tabs)/profile.tsx` | Own profile screen (tab-based route) |
| `app/users/[id].tsx` | Other user profile screen (stack route) |
| `app/users/[id]/followers.tsx` | Followers list |
| `app/users/[id]/following.tsx` | Following list |
| `app/users/[id]/feed.tsx` | User's feed with individual post view |

### Shared Profile Components

| File | Purpose |
|------|---------|
| `src/components/profile/ProfileHeader.tsx` | Avatar + name + stats row (used by both) |
| `src/components/profile/ProfileStats.tsx` | Posts/Followers/Following stat counters |
| `src/components/profile/index.ts` | Barrel export |

### Own Profile Only

| File | Purpose |
|------|---------|
| `src/components/profile/ProfileTabs.tsx` | Headshots / Body Shots tab bar + grid content |
| `src/components/profile/EditProfileModal.tsx` | Edit handle, display name, avatar |

### Other User Profile Only

| File | Purpose |
|------|---------|
| `src/components/social/UserProfileHeader.tsx` | Thin wrapper around ProfileHeader (passes outfit count + follow props) |
| `src/components/social/UserWardrobeScreen.tsx` | Wardrobe grid with search/filter/category |
| `src/components/social/DiscoverGrid.tsx` | Feed grid for outfits/lookbooks tabs |
| `src/components/social/PostGrid.tsx` | Generic image grid layout (used by both via ProfileTabs and UserProfileHeader) |

### Hooks

| File | Used By | Purpose |
|------|---------|---------|
| `src/hooks/profile/useProfileData.ts` | Own profile | Loads profile, settings, posts, headshot/bodyshot images |
| `src/hooks/profile/useProfileEdit.ts` | Own profile | Handle/name validation, save, avatar upload |
| `src/hooks/social/useUserProfile.ts` | Other user | Loads profile, outfits, lookbooks, wear counts, images |
| `src/hooks/social/useFollowStatus.ts` | Other user | Follow/unfollow state + actions |
| `src/hooks/social/useFeed.ts` | Other user | Feed data filtered by userId |
| `src/hooks/ui/useHideHeaderOnScroll.ts` | Other user | Animated header collapse on scroll |

### Style Files

| File | Purpose |
|------|---------|
| `src/styles/screens/profile-tab.styles.ts` | Own profile screen styles |
| `src/styles/screens/user-profile.styles.ts` | Other user profile screen styles |

### Lib (Data Access)

| File | Purpose |
|------|---------|
| `src/lib/user/profile.ts` | `getUserProfile`, `updateUserProfile`, `getFullUserProfile`, `searchUsers` |

---

## Current Layout Comparison

### What's SHARED

Both screens use `ProfileHeader` which renders:

```
┌─────────────────────────────────────────────┐
│  ┌─────────┐                                │
│  │  Avatar  │   Display Name  [Edit btn?]   │
│  │ 110x110  │                               │
│  │ circular │   Posts/Outfits | Followers |  │
│  └─────────┘       Following               │
│                    (clickable)              │
└─────────────────────────────────────────────┘
```

- **Avatar**: 110x110 circular, uses `avatar_url` or `headshot_image_url` fallback, or person icon placeholder
- **Display name**: Bold 22px, falls back to handle then "User"
- **Stats row** (`ProfileStats`): 3 columns — primary stat, Followers, Following
  - Followers/Following are clickable → navigates to `/users/[id]/followers` or `/following`

### Own Profile Layout

```
┌─────────────────────────────────────┐
│          Navigation Header          │
│       (title = user's handle)       │
├─────────────────────────────────────┤
│                                     │
│         ProfileHeader               │
│   (primaryStat = "Posts")           │
│   (edit button visible)             │
│                                     │
├─────────────────────────────────────┤
│   [person icon] Headshots  │  [body icon] Body Shots  │  ← ProfileTabs
├─────────────────────────────────────┤
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │  +   │ │      │ │      │       │  ← PostGrid
│  │ New  │ │ img  │ │ img  │       │     (3-col grid)
│  │      │ │      │ │      │       │     First cell = "New" upload card
│  └──────┘ └──────┘ └──────┘       │
│                                     │
├─────────────────────────────────────┤
│      EditProfileModal (overlay)     │
│  ┌───────────────────────────────┐  │
│  │  Avatar preview (100x100)     │  │
│  │  "Profile Photo" label        │  │
│  │  [Remove] button              │  │
│  │  Horizontal scroll of         │  │
│  │    headshot options (72x72)   │  │
│  │    + "New" headshot card      │  │
│  │  Handle input                 │  │
│  │  Display Name input           │  │
│  │  [Save Changes] button        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Key features:**
- Tab bar uses icons + text labels (always visible)
- Primary stat label = "Posts"
- Edit button (pencil icon) next to display name → opens EditProfileModal
- Upload cards ("New Headshot" / "New Body Shot") as first grid item
- Headshot tap → navigates to Hair & Makeup screen
- Body shot tap → navigates to `/bodyshot/[id]`
- No follow button
- ScrollView wraps everything (no pull-to-refresh)
- Loading state: `SkeletonProfileCard` + `SkeletonGrid`

### Other User Profile Layout

```
┌─────────────────────────────────────┐
│  ← @handle          [Follow btn]   │  ← Animated header (hides on scroll)
├─────────────────────────────────────┤
│                                     │
│         ProfileHeader               │
│   (primaryStat = "Outfits")         │
│   (no edit button)                  │
│                                     │
├─────────────────────────────────────┤
│  👕 Outfits │ 📖 Lookbooks │ 🔲 Wardrobe │  ← 3 icon tabs
├─────────────────────────────────────┤
│                                     │
│  [Outfits tab]                      │
│    DiscoverGrid — feed items        │
│    with outfit images, tap → feed   │
│                                     │
│  [Lookbooks tab]                    │
│    DiscoverGrid — lookbook items    │
│    with thumbnails, tap → feed      │
│                                     │
│  [Wardrobe tab]                     │
│    UserWardrobeScreen               │
│    Search + filter + category       │
│    controls + wardrobe item grid    │
│                                     │
└─────────────────────────────────────┘
```

**Key features:**
- Animated header with `@handle` + Follow/Following/Requested button (hides on scroll)
- Primary stat label = "Outfits"
- No edit button
- 3 tabs: Outfits, Lookbooks, Wardrobe
  - Tab labels shown only on web (≥1024px); mobile shows icons only
- Outfits/Lookbooks use `DiscoverGrid` (FlatList-based feed grid)
- Wardrobe uses `UserWardrobeScreen` with search/filter controls
- Pull-to-refresh on DiscoverGrid + UserWardrobeScreen
- Follow button appears in header (not in ProfileHeader)
- ProfileHeader + tabs are injected as `ListHeaderComponent` into the FlatList/UserWardrobeScreen
- Loading state: `LoadingSpinner`

**Note:** There is also a SECOND version in `src/components/social/UserProfileHeader.tsx` — this is an older/alternate implementation with `UserProfileHeader` wrapper + 2-tab layout (Outfits/Lookbooks only, no Wardrobe tab). It uses `PostGrid` directly with outfit/lookbook grids, pull-to-refresh via `RefreshControl`, and inline tab + content rendering. Both files coexist in the codebase.

---

## Differences Summary

| Feature | Own Profile | Other User Profile |
|---------|-------------|-------------------|
| **Route** | `/(tabs)/profile` | `/users/[id]` |
| **Primary stat** | "Posts" | "Outfits" |
| **Edit button** | Yes (pencil icon → modal) | No |
| **Follow button** | No | Yes (in animated header) |
| **Tabs** | Headshots / Body Shots (2) | Outfits / Lookbooks / Wardrobe (3) |
| **Tab labels** | Always shown (icon + text) | Icons only on mobile, + text on web |
| **Grid content** | PostGrid with upload cards | DiscoverGrid (feed) + UserWardrobeScreen |
| **Create actions** | "New Headshot" / "New Body Shot" cards | None |
| **Header behavior** | Static nav header | Animated hide-on-scroll |
| **Scroll container** | ScrollView (ProfileTabs has scrollEnabled=false) | FlatList inside DiscoverGrid/UserWardrobeScreen |
| **Pull-to-refresh** | No | Yes |
| **Loading skeleton** | SkeletonProfileCard + SkeletonGrid | LoadingSpinner |
| **Data hooks** | `useProfileData` + `useProfileEdit` | `useUserProfile` + `useFollowStatus` + `useFeed` |
| **Empty states** | Warning text if no profile | EmptyState component with icon + message |

---

## Known Issues / Tech Debt

1. **Duplicate screen file**: `src/components/social/UserProfileHeader.tsx` contains a full alternate `UserProfileScreen` component (default export) with a 2-tab layout. The actual route at `app/users/[id].tsx` has a 3-tab layout. The older file's default export may be dead code.

2. **Hardcoded colors in ProfileHeader**: `ProfileHeader.tsx` uses hardcoded colors (`#fff`, `#000`, `#999`, `#e0e0e0`, `#007AFF`, `#f0f0f0`) via `StyleSheet.create` instead of theme colors. ProfileStats has the same issue.

3. **Inconsistent tab implementations**: Own profile tabs are a separate component (`ProfileTabs`) while other user tabs are inline JSX in the screen file. Tab styling is defined in 3 different places (ProfileTabs styles, user-profile.styles.ts, and UserProfileHeader.tsx inline styles).

4. **`any` types**: `useProfileData` returns `profile: any`, `UserProfileHeader` accepts `profile: any`. Missing proper type definitions.

5. **Follow button rendered twice on other user profile**: Once in the animated header (`app/users/[id].tsx` lines 255-283) and props are passed to `ProfileHeader` (`isFollowing`, `onFollowPress`) but `ProfileHeader` doesn't actually render a follow button — it only destructures `isOwnProfile` and `onEditPress`. The follow-related props are accepted but unused in ProfileHeader.

6. **No bio/description field**: Neither profile variation displays or edits a user bio.

7. **Avatar backfill side effect**: `useProfileData` automatically writes to the database (fire-and-forget) during a query function, which is a side effect inside a read operation.
