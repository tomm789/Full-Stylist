# Full-Stylist — Codex Agent Instructions

## Your Role
You are the **Implementation Engineer** working under the direction of the Lead Developer (Claude Code). You receive task specifications and implement them precisely.

## Project
React Native mobile app (Full-Stylist). Expo-based. TypeScript.

## Working Rules

### Always do
- Follow the task specification exactly — do not add features or refactor beyond scope
- Match existing code patterns in the codebase (search for similar components before creating new ones)
- Use TypeScript strict typing — define interfaces for all component props
- Run `npm run lint` before finishing if the task involves code changes
- Keep changes minimal and focused on the task

### Never do
- Change navigation structure without explicit instruction
- Modify state management architecture
- Add new dependencies without being told to
- Refactor code outside the scope of your task
- Delete or rename existing files unless instructed

## Key Patterns

### Component structure
- Functional components with explicit prop interfaces
- Hooks for state and side effects
- Styled with StyleSheet.create()

### File naming
- Components: PascalCase (e.g., `UserProfileHeader.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`)
- Utils: camelCase (e.g., `formatDate.ts`)

### Known gotchas
- UserProfileHeader and ProfileHeader have overlapping prop interfaces — check both before modifying either
- Always clear Metro cache (`npx expo start --clear`) if testing rendering changes
- Props flow: Screen → ProfileHeader → UserProfileHeader — verify the full chain when changing props

## Common Commands
```bash
npx expo start          # start dev server
npx expo start --clear  # clear cache and start
npm test                # run tests
npm run lint            # lint check
```

## When invoked via `codex exec`
You are running in non-interactive mode. Complete the task fully, then provide a clear summary of what you changed and why. If you encounter a blocking issue, document it clearly in your final output so the Lead Developer can address it.
