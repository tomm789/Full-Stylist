# Codex Task: Sweep 1A — Route File Bloat & Component Coupling Audit

## Context

You are working on the Full Stylist app (Expo 54 / React Native / Expo Router). This is an audit-only task — **do not edit any source files**. Your job is to analyse and report.

The app's route files in `app/` have grown too large. The 5 biggest route files contain business logic, state management, and UI code that should live in hooks or components under `src/`. We need to understand exactly what's in them before refactoring.

## Your Task

Read and analyse these 5 route files:

1. `app/(tabs)/wardrobe.tsx` (1,043 lines)
2. `app/(tabs)/outfits/index.tsx` (900 lines)
3. `app/hair-and-make-up.tsx` (545 lines)
4. `app/calendar/day/[date].tsx` (510 lines)
5. `app/lookbooks/[id]/view.tsx` (479 lines)

For **each file**, produce the following analysis:

### A. What should STAY in the route file
- Screen-level layout/JSX composition
- Route-specific navigation logic (params, navigation calls)
- Screen-level state that genuinely belongs to the route

### B. What should EXTRACT to custom hooks (under `src/hooks/`)
- Business logic (data fetching, mutations, transformations)
- Complex state management (multiple related useState/useEffect)
- Timer/polling/subscription logic
- Any logic block over ~20 lines that isn't JSX composition

### C. What should EXTRACT to components (under `src/components/`)
- Large JSX blocks that could be standalone components
- Repeated UI patterns
- Sections with their own state that are self-contained

### D. Dependencies & coupling
- What hooks/contexts does this file import?
- What components does it render?
- Are there circular or tight coupling concerns?

### E. Risk assessment
- Rate refactor difficulty: Low / Medium / High
- Note any tricky dependencies that would make extraction hard

## Also check

Skim the corresponding existing hooks for these screens to understand what's **already** been extracted. This avoids recommending extractions that duplicate existing hooks:

- `src/hooks/wardrobe/` — all files
- `src/hooks/outfits/` — all files
- `src/hooks/headshot/` — all files
- `src/hooks/calendar/` — all files
- `src/hooks/lookbooks/` — all files

## Output

Write your full analysis to `CODEX_TASK_REPORT.md` in the project root. Use the structure above (sections A-E for each of the 5 files). End with a **Summary** section listing the top 5 highest-impact extractions across all files, ranked by (lines saved × risk reduction).

## Important

- **Do NOT edit any source files** — this is audit only
- **Do NOT create any new source files**
- Only create/edit `CODEX_TASK_REPORT.md`
- Be specific: reference line numbers or function names, not vague descriptions
- If a hook already exists that covers some logic, note it as "already extracted"
