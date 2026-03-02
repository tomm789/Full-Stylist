# Codex Task: Sweep 1C — Re-render & Memoization Audit (Component Layer)

## Context

You are working on the Full Stylist app (Expo 54 / React Native / Expo Router). This is an audit-only task — **do not edit any source files**. Your job is to analyse and report.

This is the third sweep. Sweeps 1A and 1B analysed route files and hooks respectively. This sweep focuses on the **component layer** — looking for unnecessary re-renders, missing memoization, inline object/array creation in JSX, and list rendering performance.

Reference the previous reports if helpful:
- `CODEX_TASK_REPORT.md` (Sweep 1A — route file bloat)
- `CODEX_TASK_REPORT_1B.md` (Sweep 1B — hook complexity)

## Your Task

### Part 1: List Rendering Performance

Analyse all FlatList/ScrollView-based list components. For each, check:

- Is `renderItem` wrapped in `useCallback`?
- Is the row/item component wrapped in `React.memo`?
- Are `initialNumToRender`, `maxToRenderPerBatch`, `windowSize` configured?
- Is `getItemLayout` provided where item height is fixed/predictable?
- Are handler props passed to list items stable (useCallback) or recreated each render?

**Files to check** (search for `FlatList`, `SectionList`, `ScrollView` with mapped children):
- `src/components/wardrobe/ItemGrid.tsx`
- `src/components/social/FeedItem.tsx`
- `src/components/calendar/CalendarContinuousGrid.tsx`
- `src/components/lookbooks/LookbookPickerModal.tsx`
- `src/components/outfits/OutfitViewContent.tsx`
- Any other components that render lists of data — search broadly for `FlatList` and `.map(` in `src/components/`

### Part 2: Component Memoization Audit

Check the **20 largest components** (by line count) for:

- Is the component wrapped in `React.memo` where it receives props from a parent?
- Are there inline object/array literals in JSX `style` props that create new references each render? (e.g. `style={{ marginTop: 10 }}` instead of using StyleSheet)
- Are there inline arrow functions in JSX event handlers that should be `useCallback`? (e.g. `onPress={() => doSomething(id)}` in a list context)
- Are there expensive computations (filtering, sorting, mapping arrays) that should be wrapped in `useMemo`?

**Files to check** (the 20 largest components by line count):
1. `src/components/outfits/OutfitViewContent.tsx` (501)
2. `src/components/wardrobe/OutfitCreatorCanvas.tsx` (487)
3. `src/components/headshots/MirrorTabContent.tsx` (412)
4. `src/components/headshots/EditTabModal.tsx` (410)
5. `src/components/outfits/GenerationProgressModal.tsx` (387)
6. `src/components/social/FeedItem.tsx` (383)
7. `src/components/profile/OnboardingAccountStep.tsx` (378)
8. `src/components/lookbooks/LookbookPickerModal.tsx` (373)
9. `src/components/profile/AIModelSection.tsx` (372)
10. `src/components/ai/AIGenerationFeedback.tsx` (366)
11. `src/components/UserWardrobeScreen.tsx` (357)
12. `src/components/wardrobe/WardrobeCameraOverlay.tsx` (355)
13. `src/components/wardrobe/CropEditor.tsx` (353)
14. `src/components/calendar/CalendarDaySheet.tsx` (354)
15. `src/components/social/UserProfileHeader.tsx` (342)
16. `src/components/calendar/EntryCard.tsx` (337)
17. `src/components/tabs/FullScreenMenuModal.tsx` (333)
18. `src/components/wardrobe/HeadshotSelectorModal.tsx` (330)
19. `src/components/headshots/DrawModeModal.tsx` (326)
20. `src/components/tabs/HeaderSearchMenu.tsx` (323)

### Part 3: Context Re-render Risk

Check each context provider for potential over-rendering:

- `src/contexts/AuthContext.tsx`
- `src/contexts/FloatingTabBarContext.tsx`
- `src/contexts/HeaderSearchContext.tsx`
- `src/contexts/TabSearchContext.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/contexts/NotificationsContext.tsx`
- `src/contexts/CalendarEntryFlowContext.tsx`
- `src/contexts/CalendarPanelContext.tsx`

For each, note:
- Is the context value memoized (`useMemo`)?
- Does the context bundle frequently-changing values (like animated values) with stable values (like callbacks)?
- How many components consume this context? (Quick count of `useAuth`, `useThemeColors`, etc. imports)

## Output

Write your full analysis to `CODEX_TASK_REPORT_1C.md` in the project root. Structure it as:

1. **Part 1: List Rendering** — table format per list component
2. **Part 2: Component Memoization** — findings per component (only list issues found, skip components with no issues)
3. **Part 3: Context Re-render Risk** — table format per context
4. **Summary: Top 10 Quick Wins** — the 10 easiest, lowest-risk memoization/performance fixes ranked by impact
5. **Summary: Structural Concerns** — any deeper issues that need architectural changes (not just adding `useMemo`)

## Important

- **Do NOT edit any source files** — this is audit only
- **Do NOT create any new source files** other than the report
- Only create/edit `CODEX_TASK_REPORT_1C.md`
- Be specific: reference file names and line numbers
- Focus on issues that would cause real-world performance problems, not theoretical purity
