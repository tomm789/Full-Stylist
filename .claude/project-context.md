# Full-Stylist Project Context

## Architecture Overview

React Native/Expo app for AI-powered virtual styling. Runs on native (iOS/Android) and web via expo-router. Backend is Supabase (auth, DB, storage) + Netlify Functions (AI job orchestration via Gemini API).

**Tech Stack:** React 19 + React Native 0.81 + Expo 54 + expo-router 6 + TypeScript 5.9 + Supabase 2.90

### Directory Structure

```
app/                          # Expo Router file-based routing
  _layout.tsx                 # Root: ThemeProvider > AuthProvider > NotificationsProvider
  (tabs)/                     # Main tab navigation
    _layout.tsx               # 5 visible tabs + 2 hidden
    calendar.tsx              # Monthly calendar with outfit entries
    wardrobe.tsx              # Item grid with category pills + filters
    outfits/                  # Outfit management (sub-layout)
      index.tsx               # My/Explore/Following/Lookbooks
      lookbooks.tsx           # Lookbook grid
    hair-and-make-up.tsx      # Route entry for hair & makeup
    profile.tsx               # Menu tab (opens FullScreenMenuModal)
  auth/                       # Login/signup flows
  headshot/                   # Headshot generation
  bodyshot/                   # Bodyshot generation
  lookbooks/                  # Lookbook CRUD
  wardrobe/                   # Item CRUD
  outfits/                    # Outfit details
  hair-and-make-up.tsx        # Main hair & makeup screen (single-page flow)

src/
  components/
    shared/                   # Reusable primitives
      buttons/PillButton.tsx  # Multi-variant pill (horizontal/vertical layout, leading icon)
      layout/Header.tsx       # 3-column header (left flex:1, center title, right flex:1)
      modals/                 # DropdownMenuModal, FullScreenMenuModal
      WardrobeCategoryIcon.tsx # SVG icon wrapper with normalized lookup
    wardrobe/                 # CategoryPills, ItemGrid, FilterDrawer, ItemDetailModal
    outfits/                  # OutfitCard, GenerationProgressModal, LookbookSelectionBar
    calendar/                 # CalendarDayCell, MonthNavigator
    social/                   # PostGrid, FeedCard, UserProfileHeader
    icons/wardrobe/           # SVG icon components (Tops, Bottoms, Dresses, etc.)

  contexts/
    AuthContext.tsx            # User session + sign in/out
    ThemeContext.tsx           # Light/dark mode, useThemeColors() hook
    NotificationsContext.tsx   # Toast system
    HeaderSearchContext.tsx    # Search bar state

  hooks/                      # Feature-specific hooks
    wardrobe/                 # useWardrobe, useWardrobeItems, useFilters
    outfits/                  # useOutfits, useOutfitGeneration, useOutfitFilters
    calendar/                 # useCalendarEntries, useDayEntries
    headshot/                 # useHairAndMakeup (large: all state + generation logic)
    profile/                  # useProfileImages, useImageGeneration
    social/                   # useFeed, useEngagementActions
    lookbooks/                # useLookbookTabs, useLookbookSelection

  lib/                        # Data/API layer
    supabase.ts               # Client init
    netlify.ts                # Netlify URL resolution
    ai-jobs/                  # Job creation, polling, execution (circuit breaker)
    wardrobe/                 # Items, categories, images queries
    outfits/                  # CRUD, scheduling
    headshot/                 # Generation sessions, presets, prompt builder
    settings.ts               # User settings (active headshot, etc.)
    images.ts                 # getPublicImageUrl helper

  styles/
    theme.ts                  # Constants: spacing, borderRadius, typography, shadows
    themes.ts                 # lightColors/darkColors (ThemeColors type)
    commonStyles.ts           # createCommonStyles(colors) factory

  lib/icons/
    wardrobeCategoryIcons.ts  # Map category names to SVG components

assets/icons/wardrobe/        # Raw SVG files (14 categories)
netlify/functions/            # AI job runner + process handlers
```

## Navigation Setup

**Bottom Tabs** (5 visible):
1. Calendar - `calendar-outline`
2. Wardrobe - `shirt-outline`
3. Outfits - `sparkles-outline`
4. Hair & Make-Up - `cut-outline`
5. Menu - `menu-outline` (custom button opens FullScreenMenuModal)

**Menu Grid Items:** Profile, Lookbooks, Explore, Followers, Search, Feedback, Hair & Make-Up, Notifications, Archive, Account Settings, Log Out

**Hidden Tabs:** Create, Social (used as modal routes)

## Key Patterns

### Styling Pattern
Every component uses dynamic theme colors:
```tsx
const colors = useThemeColors();
const styles = createStyles(colors);
// ...
const createStyles = (colors: ThemeColors) => StyleSheet.create({ ... });
```

### Hook Pattern
Business logic lives in hooks, components are thin UI:
```tsx
// Hook returns all state + handlers
export function useFeature() {
  const [data, setData] = useState(...);
  const handleAction = async () => { ... };
  return { data, handleAction };
}
// Component consumes
const state = useFeature();
return <View><Text>{state.data}</Text></View>;
```

### AI Job Flow
1. Client calls `triggerXxxJob()` -> creates row in `ai_jobs` table
2. Client calls `triggerAIJobExecution(jobId)` -> hits Netlify function
3. Client polls with `waitForAIJobCompletion(jobId, maxAttempts, interval)`
4. Netlify function processes (Gemini API) -> updates job status/result
5. Client reads result (usually `image_id` for generated images)

### Preset Data Architecture
Hair/makeup presets are `PresetCategory[]` arrays in `hairPresets.ts` / `makeupPresets.ts`. Each category has sections with options. The UI dynamically renders from these arrays, so adding new categories/options requires zero UI changes. The `buildHairMakeupPrompt()` function flattens selected option IDs into a text prompt.

### Image Handling
- `expo-image` (ExpoImage) for rendering
- Supabase Storage for persistence
- `getPublicImageUrl(image)` resolves storage bucket/key to URL
- SVG icons use `react-native-svg-transformer` via metro.config.js

## Important Files & Their Roles

| File | Purpose |
|------|---------|
| `app/(tabs)/_layout.tsx` | Tab bar definition, menu modal, header components |
| `app/(tabs)/wardrobe.tsx` | Main wardrobe screen (~570 lines) |
| `app/hair-and-make-up.tsx` | Hair & makeup UI (~894 lines, refactored) |
| `src/hooks/headshot/useHairAndMakeup.ts` | All hair/makeup state + logic (~790 lines) |
| `src/components/shared/buttons/PillButton.tsx` | Universal pill button (horizontal/vertical, leading, icon) |
| `src/components/wardrobe/CategoryPills.tsx` | Category/subcategory pill rows with SVG icons + sort order |
| `src/components/shared/WardrobeCategoryIcon.tsx` | SVG icon wrapper with normalized name lookup |
| `src/lib/icons/wardrobeCategoryIcons.ts` | Map of category names to SVG components |
| `src/lib/headshot/hairPresets.ts` | Hair preset data (styles, colors, lengths) |
| `src/lib/headshot/makeupPresets.ts` | Makeup preset data (styles + color sections) |
| `src/styles/themes.ts` | Light/dark color definitions (ThemeColors type) |
| `src/styles/commonStyles.ts` | Shared styles factory (sectionTopPadding, sectionHorizontalPadding) |
| `src/lib/ai-jobs/` | AI job orchestration (create, poll, execute) |

## Known Issues & Quirks

### Pre-existing TypeScript Errors
These exist across branches and resolve when other feature branches merge:
- `selfie_image_id` not in `UserSettings` type (settings.ts needs updating)
- `saveUploadedImage` not in `UseImageGenerationReturn` (hook type needs updating)
- `cacheDirectory`/`documentDirectory` not on expo-file-system type (version mismatch)
- `sectionTopPadding`/`sectionHorizontalPadding` on commonStyles (restored from 16d06b3)

### SVG Icon Pipeline
- SVGs use `fill="currentColor"` but RN doesn't support `currentColor`
- `WardrobeCategoryIcon` passes both `fill={color}` and `color={color}` to SVG components
- Category name lookup is normalized (lowercase, whitespace/ampersand collapsed) to handle DB vs hardcoded key mismatches
- `PillButton` requires `leading` prop to render custom icons (not `icon` which is Ionicons-only)

### Hair & Make-Up Refactor
- Screen file (`app/hair-and-make-up.tsx`) was refactored: all state/logic extracted to `useHairAndMakeup` hook
- The screen is a single-page flow with ViewMode tabs (grid/hair/makeup/face), NOT the old 3-screen library/detail/editor flow
- Uses `useNavigation().setOptions()` for header right buttons (not the Header component)

### Calendar
- Scrolls to today's row on initial load via `onContentSizeChange` handler
- Uses `programmaticScrollInProgressRef` to prevent auto-extend during programmatic scrolls
- Has debug agent log blocks (`#region agent log`) that should be stripped

### Git Worktree
- Working worktree: `/Users/thomasmeehan/.claude-worktrees/Full-Stylist/hungry-panini`
- Main repo: `/Users/thomasmeehan/development-projects/full-stylist-vs-code/Full-Stylist`
- Parent git dir referenced via `.git` file in worktree root
- Branch: `hungry-panini`

## Recent Changes

### This Session
1. **Hair & makeup preset data** - Added hair-color (30 options), hair-length (8 options) to `hairPresets.ts`; added color sections to 5 makeup categories in `makeupPresets.ts`
2. **Hair & makeup refactor** - Extracted `useHairAndMakeup` hook from 1600-line monolith; screen file now ~894 lines (UI only)
3. **Restored files from commit `16d06b3`** - Bottom nav tabs (5-tab layout), menu grid, calendar scroll-to-today, wardrobe CategoryPills with SVG icons, commonStyles
4. **SVG icon pipeline fixes** - Normalized icon map lookup, added `fill` prop, added `leading` prop to PillButton, vertical layout mode for category pills
5. **Wardrobe category ordering** - Default sort order defined in CategoryPills (tops, bottoms, dresses, shoes, outerwear, bags, accessories, etc.)
6. **Category pill styling** - Vertical layout matching tab bar (icon 28px, label 10px, 2px gap, minWidth 72)
7. **Subcategory label** - Restored `selectedCategoryLabel` prop passing in wardrobe.tsx

### Key Commit Reference
- `16d06b3` - "Enhance Hair & Make-Up Screen" - Contains the working version of tabs layout, calendar scroll, CategoryPills with SVG icons, commonStyles additions. Use this as reference for the intended UI state.

## Dependencies of Note

| Package | Purpose |
|---------|---------|
| `expo-router` | File-based routing |
| `@supabase/supabase-js` | Auth, DB, Storage |
| `expo-image` | Efficient image rendering |
| `react-native-svg` + `react-native-svg-transformer` | SVG icon rendering |
| `expo-file-system` | File caching for share |
| `@expo/vector-icons` (Ionicons) | Standard icons throughout app |
| `expo-image-manipulator` | Client-side image processing |
