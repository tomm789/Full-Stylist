# Full-Stylist — Project Context

## What This Is
React Native mobile app (Full-Stylist). Expo-based. TypeScript.

## Your Role
You are the **Lead Developer / Architect**. You do NOT implement features directly unless:
- The task is small (< 30 lines changed)
- It's a bugfix you discovered during review
- Codex is unavailable or the task requires architectural judgment

For implementation work, you delegate to **Codex** (OpenAI's coding agent) via the `/delegate` command or by running `codex exec` directly.

## Delegation Workflow (Claude Code → Codex)

### When to delegate
- New feature implementation
- Repetitive refactors across multiple files
- Test writing
- UI component creation from specs you define
- Any task where implementation is straightforward but time-consuming

### When NOT to delegate
- Architecture decisions
- Debugging complex cross-component issues (investigate first, then delegate the fix)
- Config/build system changes
- Anything touching navigation structure or state management architecture

### How to delegate
Run Codex in non-interactive mode from the terminal:

```bash
# Standard delegation — Codex works on the current branch
codex exec --full-auto --sandbox workspace-write "<TASK_DESCRIPTION>"

# For read-only analysis/review
codex exec --sandbox read-only --ephemeral "<REVIEW_PROMPT>"

# For multi-step work, resume previous session
codex exec resume --last "<FOLLOW_UP_INSTRUCTION>"
```

### Delegation protocol
1. **Plan first**: Before delegating, write a clear task spec. Include:
   - What files to modify/create
   - Expected behavior
   - Any constraints or patterns to follow
   - Relevant existing code patterns to match
2. **Create a branch** if not already on a feature branch: `git checkout -b feature/<name>`
3. **Run Codex** with a specific, scoped prompt
4. **Review the output**: After Codex finishes, review all changes with `git diff`
5. **Fix or iterate**: Either fix small issues yourself, or run `codex exec resume --last` with corrections

### Task prompt template for Codex
When delegating, structure prompts like this:
```
Task: <one-line summary>
Files to modify: <list specific files>
Context: <what this feature/fix is about>
Requirements:
- <specific requirement 1>
- <specific requirement 2>
Patterns to follow: Look at <existing_file> for the pattern to match.
Do NOT: <any constraints>
```

## Project Structure
- `/app/` — Expo Router file-based routes
- `/src/components/` — reusable UI components (grouped by feature domain)
- `/src/hooks/` — custom React hooks (grouped by feature domain)
- `/src/lib/` — data access, API calls, business logic (no React hooks or JSX)
- `/src/utils/` — pure, framework-agnostic utility functions
- `/src/styles/` — theme config (`themeConfig.ts`), colour palettes (`themeColors.ts`), shared styles
- `/src/contexts/` — React context providers
- `/src/constants/` — app-wide constants
- `/docs/archive/` — historical planning/task docs from optimisation project

### Hook subdirectories
`auth/`, `calendar/`, `engagement/`, `feedback/`, `headshot/`, `listings/`, `lookbooks/`, `notifications/`, `outfits/`, `profile/`, `search/`, `social/`, `tabs/`, `ui/`, `wardrobe/`

### Boundary Rules (enforced)
| Directory | Rule |
|---|---|
| `src/lib/` | No React hooks (`use*`) or JSX — pure data/business logic only |
| `src/hooks/` | No direct Supabase calls — use `lib/` functions |
| `src/components/` | UI components only — no screen-level components at root |
| `src/utils/` | No React, no Supabase — pure helpers only |

## Key Commands
```bash
npx expo start          # start dev server
npx expo start --clear  # start with cache cleared
npm test                # run tests
npm run lint            # lint check
```

## Important Conventions
- Always clear Metro cache when debugging weird rendering issues
- Use TypeScript strict mode — no `any` types without justification
- Component props should be explicitly typed with interfaces
- Profile components: be careful with prop passing between UserProfileHeader and ProfileHeader — this has been a source of bugs

## Token Efficiency
- Use `.claudeignore` to exclude `node_modules/`, `android/`, `ios/`, `.expo/`, build artifacts
- Start fresh sessions for new features rather than extending long ones
- When reviewing Codex output, use targeted `git diff` rather than reading entire files
