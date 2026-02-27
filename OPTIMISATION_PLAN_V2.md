# Optimisation Plan (Tier 2)

Separate from the structural refactoring in `REFACTOR_PLAN.md`. Tackle after Tier 1 phases are stable.

---

## 1. List performance (FlatList tuning)

- [ ] Add `initialNumToRender`, `maxToRenderPerBatch`, `windowSize` to long lists (wardrobe ItemGrid, outfits feeds, archive, users feed/followers/following, social explore, feedback, lookbooks)
- [ ] Add `getItemLayout` where item height is fixed
- [ ] Wrap `renderItem` in `useCallback` for list components that recreate it every render
- [ ] Audit `React.memo` on list row components; ensure stable callback props

## 2. Image loading and caching

- [ ] Standardise `expo-image` `cachePolicy` for remote list/grid/profile images
- [ ] Add `placeholder` (blurhash or grey) and `priority` where helpful
- [ ] Consider thumbnail URLs for grids to reduce memory

## 3. Polling, timers, and subscriptions

- [ ] Audit cleanup in: `useWardrobeItemDetail`, `useWardrobeItemPolling`, `useWardrobeItemEdit`, `useDescriptionPolling`, `useFeedSlideshow`, `useBackgroundGridGenerator`, `HeadshotSelectorModal`, `canvasTrim`
- [ ] Consider exponential backoff for AI job polling (cap at 5-10s)

## 4. Expensive derived data and re-renders

- [ ] Ensure expensive derivations (filtered lists, selected items) are wrapped in `useMemo` with correct deps
- [ ] `useCallback` for handlers passed to memoised list children

## 5. Developer experience

- [ ] Fix supabase.ts log typo: `EXPO_PUBLICABASE_ANON_KEY` → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Add root `ErrorBoundary` in `app/_layout.tsx`
- [ ] Decouple `AuthContext` from `clearHairMakeupSessionVisited` (event/callback or session module)
- [ ] Centralise env/config into single `src/lib/config.ts`
- [ ] Gate `AuthContext` console.log calls with `__DEV__`

## 6. Netlify backend

- [ ] Reduce verbose logging in `downloadImageFromStorage` (env-gate diagnostics)
- [ ] Consider job type registry pattern in `ai-job-runner.js`
- [ ] Measure cold start after utils split

## 7. SQL migrations

- [ ] Resolve duplicate 0043 numbering
- [ ] Update apply scripts to cover all migrations (0001-0049)
- [ ] Document conventions in `supabase/migrations/README.md`

## 8. Accessibility

- [ ] Add `accessibilityLabel` and `accessibilityRole` to all interactive elements
- [ ] Focus trapping in modals
- [ ] Ensure logical focus order in FullScreenMenuModal, create menu, edit modals

## 9. Bundle and load time

- [ ] Lazy-load heavy screens (calendar, archive, ai-settings, onboarding, lookbooks)
- [ ] Audit client bundle for heavy dependencies
- [ ] Ensure Hermes in production builds
