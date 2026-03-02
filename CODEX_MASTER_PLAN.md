# Full Stylist Optimization - Master Plan

## Communication Protocol

- **Claude** (head dev) writes task instructions → `CODEX_TASK_CURRENT.md`
- **Codex** reads task, does the work, writes back → `CODEX_TASK_REPORT.md`
- **Claude** reviews the report + file changes, then writes next task
- Each task gets a **new thread** in Codex unless stated otherwise

---

## Project Snapshot

| Metric | Value |
|--------|-------|
| Framework | Expo 54 (React Native 0.81) + Expo Router 6 |
| Backend | Supabase + Netlify Functions |
| Source files | ~575 (.ts/.tsx) |
| Total lines | ~72k |
| God files | `wardrobe.tsx` (1,043), `outfits/index.tsx` (900) |
| Largest hooks | `useWardrobeItemDetail` (570), `useOutfitGeneration` (549), `useHairAndMakeup` (527) |

---

## Phase Overview

### Phase 1 — Deep Audit (Codex)
Codex analyses the codebase in focused sweeps. Each sweep produces findings + concrete fix lists. No code changes yet.

### Phase 2 — Quick Wins (Codex, reviewed by Claude)
Low-risk, high-impact fixes that don't change architecture. Safe to batch.

### Phase 3 — Structural Refactoring (Codex, guided by Claude)
Break up god files, extract hooks, reduce coupling. Higher risk, done file-by-file.

### Phase 4 — Performance Tuning (Codex, guided by Claude)
Image loading, polling, memoization, lazy loading. Requires testing.

### Phase 5 — DX & Quality (Codex)
Error boundaries, logging cleanup, accessibility, developer experience.

---

## Phase 1 — Deep Audit (broken into 4 sweeps)

### Sweep 1A: Route File Bloat & Component Coupling
**Goal**: Analyse the 5 largest route files and map what logic lives in them vs. hooks/components.
**Files to read**:
- `app/(tabs)/wardrobe.tsx`
- `app/(tabs)/outfits/index.tsx`
- `app/hair-and-make-up.tsx`
- `app/calendar/day/[date].tsx`
- `app/lookbooks/[id]/view.tsx`

**Output**: For each file, list (a) what should stay as route logic, (b) what should extract to hooks, (c) what should extract to components.

### Sweep 1B: Hook Complexity & Duplication
**Goal**: Analyse the 10 largest hooks for duplication, missing cleanup, and over-responsibility.
**Files to read**: Top 10 hooks by line count.
**Output**: For each hook, list (a) responsibilities, (b) potential splits, (c) cleanup issues (timers, subscriptions), (d) any duplicated patterns across hooks.

### Sweep 1C: Re-render & Memoization Audit
**Goal**: Find components/hooks missing `useMemo`, `useCallback`, `React.memo` where they'd help.
**Focus**: List components, grid renderers, handlers passed as props, expensive derived data.
**Output**: Concrete list of what to wrap and where.

### Sweep 1D: Image, Polling & Resource Audit
**Goal**: Audit image loading patterns, polling/timer cleanup, and resource management.
**Files to read**: All hooks with polling, `imageProcessor.ts`, `image-compression.ts`, `imageUtils.ts`, components using `expo-image`.
**Output**: List of (a) inconsistent image patterns, (b) polling without cleanup, (c) missing abort/cancel.

---

## Phase 2 — Quick Wins (after audit)

- 2A: FlatList tuning (initialNumToRender, windowSize, getItemLayout)
- 2B: Add `React.memo` + `useCallback` to identified components
- 2C: Standardise `expo-image` cachePolicy + placeholders
- 2D: Gate console.log calls with `__DEV__`
- 2E: Fix known bugs (supabase.ts env typo, duplicate migration numbering)

## Phase 3 — Structural Refactoring (after quick wins)

- 3A: Extract `wardrobe.tsx` — split into screen + extracted hooks
- 3B: Extract `outfits/index.tsx` — same pattern
- 3C: Decouple `AuthContext` from hair/makeup session logic
- 3D: Split oversized hooks (useWardrobeItemDetail, useOutfitGeneration)

## Phase 4 — Performance Tuning

- 4A: Implement exponential backoff for AI job polling
- 4B: Lazy-load heavy screens (calendar, archive, ai-settings, lookbooks)
- 4C: Audit bundle size + code splitting opportunities
- 4D: Add `useMemo` for expensive derived data (filtered lists, selections)

## Phase 5 — DX & Quality

- 5A: Add root ErrorBoundary in `_layout.tsx`
- 5B: Centralise env/config into `src/lib/config.ts`
- 5C: Accessibility pass (labels, roles, focus trapping)
- 5D: Document conventions in `supabase/migrations/README.md`

---

## Status Tracker

| Task | Status | Codex Thread | Notes |
|------|--------|-------------|-------|
| 1A: Route audit | Pending | — | — |
| 1B: Hook audit | Pending | — | — |
| 1C: Memo audit | Pending | — | — |
| 1D: Resource audit | Pending | — | — |
| 2A-2E: Quick wins | Pending | — | — |
| 3A-3D: Structural | Pending | — | — |
| 4A-4D: Performance | Pending | — | — |
| 5A-5D: DX/Quality | Pending | — | — |
