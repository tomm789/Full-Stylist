# Full Stylist — AI Agent Instructions

## Project Overview
Full Stylist is an Expo-based AI styling app combining React Native with Supabase backend. Users create headshots, studio models, and AI-generated outfit previews. The tech stack: Expo/React Native → Web (Supabase auth + storage) → Netlify Functions (Gemini API calls).

## Architecture & Data Flow

### Key Services
- **Frontend**: Expo Router (file-based routing), React hooks for state, Supabase JS client
- **Backend**: Supabase (PostgreSQL + RLS + Storage), Netlify Functions (only for AI calls)
- **AI**: Google Gemini API (server-side only via Netlify Functions)

### Critical Pattern: AI Jobs
Asynchronous AI work follows this flow:
1. Client creates `ai_jobs` row with `status='queued'` and JSON `input`
2. Client polls `ai_jobs` table for status updates (circuit breaker at 5 failures)
3. Netlify Function `ai-job-runner.ts` processes: validates JWT → fetches job → calls Gemini → updates `status` and `result`
4. Client applies result when `status='succeeded'`

**Key functions in [lib/ai-jobs.ts](lib/ai-jobs.ts)**:
- `createAIJob(userId, jobType, input)` — creates a queued job
- `pollAIJobWithFinalCheck(jobId, maxAttempts, intervalMs, prefix)` — polls with exponential backoff
- `getOutfitRenderItemLimit(modelPreference)` — returns 7 for pro, 2 for standard

**Job types** (`auto_tag`, `outfit_render`, `headshot_generate`, `body_shot_generate`, `outfit_suggest`, `reference_match`, `outfit_mannequin`, `lookbook_generate`) are defined in [docs/AI_JOBS.md](docs/AI_JOBS.md) with input/output contracts.

### Image Linking
- Images uploaded to Supabase Storage bucket `media`
- `images` table stores metadata (storage_key, storage_bucket)
- `wardrobe_item_images` junction table links images to items with type (original, product_shot, etc.)
- Always batch-load images: use `getWardrobeItemsImages(itemIds)` instead of querying per item

### Database & RLS
- Row Level Security enforces visibility at DB level
- Each entity (wardrobe, outfit, lookbook) has `visibility` field
- Visibility modes: `private`, `friends`, `public`, `private_link` (with share_slug)
- Policies check `auth.uid()` and `visibility` — never bypass with SQL

## Development Workflow

### Running Locally
```bash
npm install
npm run web        # Start Expo dev server for web
# OR
npm run dev        # Run with Netlify dev (includes local functions)
```

### Environment Setup
Required `.env` variables (see [docs/ENV.md](docs/ENV.md)):
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Supabase)
- `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` (Netlify)
- `GOOGLE_API_KEY` (Gemini API)

### Database Migrations
- Migrations live in `supabase/migrations/` and are numbered sequentially
- Apply with: `npm run apply-migrations` (runs migrations.sql script via Supabase CLI)
- Never modify applied migrations; create new ones for schema changes

### Testing AI Jobs
- Create a queued job via Supabase UI or client code
- Monitor job status with: `supabase.from('ai_jobs').select('*').eq('id', jobId)`
- Check Netlify function logs: `netlify functions:invoke ai-job-runner --local`

## Code Patterns & Conventions

### Supabase Client Access
```typescript
// Always use the singleton supabase client
import { supabase } from '@/lib/supabase';
const { data, error } = await supabase.from('table').select('*');
```

### Error Handling in UI
- Always destructure `{ data, error }` from queries
- Log with prefix: `console.error('[FeatureName] Error message:', error)`
- User-facing errors via `Alert.alert()` (React Native)
- Never leak Supabase error details to users

### State Management
- Use `useState` + `useEffect` for local state (no Redux/Context except auth)
- Use `useMemo` for expensive computations (e.g., filtered item lists in [app/(tabs)/wardrobe.tsx](app/(tabs)/wardrobe.tsx#L280))
- Use `useCallback` for event handlers passed to memoized child components

### Memoization Patterns
- Memoize components with `React.memo()` to prevent unnecessary re-renders
- Use `useMemo` for filtered/computed lists
- Example: `ItemCard` component in wardrobe is memoized to avoid re-rendering on parent updates

### Image Loading
- Use `expo-image` ExpoImage for optimized rendering
- Always set `aspectRatio` on images for layout stability
- Cache image URLs in state to avoid re-fetching: `itemImagesCache` Map in wardrobe
- Handle "No Image" placeholder gracefully

### Naming Conventions
- File names: `kebab-case` for screens/routes, `PascalCase` for components
- Types: `PascalCase` (e.g., `WardrobeItem`, `FilterState`)
- Constants: `UPPER_SNAKE_CASE`
- Functions: `camelCase`, prefix with `get`, `set`, `create`, `update`, `delete` (e.g., `getWardrobeItems`)

### TypeScript Best Practices
- Always export interface types from lib files for consumer imports
- Use `?` for optional fields: `owner_user_id?: string`
- Return `{ data, error }` tuple pattern from lib functions
- Avoid `any` — use `Record<string, unknown>` or `unknown` with type guards

### Logging Standards
- Use prefixes for context: `[ModuleName]`, `[Feature]`, `[Wardrobe]`
- Example: `console.log('[Wardrobe] Loading items for category:', categoryId)`
- Include structured data in logs: `JSON.stringify(data, null, 2)`

## File Organization

### Key Directories
- `app/` — Expo Router screens (file-based routing)
- `lib/` — Business logic, Supabase queries, AI job helpers
- `contexts/` — React Context providers (AuthContext for user session)
- `supabase/migrations/` — Database schema changes
- `netlify/functions/` — Serverless AI job processor
- `docs/` — Technical specs (ARCHITECTURE.md, AI_JOBS.md, RLS.md)

### Adding a New Feature
1. Create lib function in `lib/feature.ts` (query, logic)
2. Create screen in `app/feature/index.tsx` or `app/feature/[id].tsx`
3. Wire state with `useState` + `useEffect` in screen
4. Handle errors with `{ data, error }` pattern
5. Add any new tables/migrations in `supabase/migrations/`

## Common Pitfalls & Solutions

### Batch Loading Images
❌ **Wrong**: Loop per item calling `getWardrobeItemImages(itemId)` — N+1 queries
✅ **Right**: Call `getWardrobeItemsImages(itemIds)` once, cache results in Map

### Ignoring RLS
❌ **Wrong**: Update `visibility` directly without checking auth
✅ **Right**: RLS policy enforces `WHERE owner_user_id = auth.uid()` at DB level

### Polling Without Circuit Breaker
❌ **Wrong**: Infinite poll loop if Netlify function crashes
✅ **Right**: `pollAIJobWithFinalCheck` has `failureCountByJob` tracking + threshold

### Async in useEffect Without Cleanup
❌ **Wrong**: `useEffect(() => { loadItems(); })` causes double-fetch in React 18 strict mode
✅ **Right**: Check `if (wardrobeId && !isLoadingItems)` before fetching, track `isLoadingItems` flag

## Performance Optimization Tips

1. **Image Caching**: Store image URLs in Map state, invalidate on refresh
2. **Memoized Filtering**: Use `useMemo` for filtered item lists (not in loop)
3. **Lazy Loading**: Use FlatList with `numColumns` for wardrobe grid
4. **Batch AI**: Combine multiple item tags into single `auto_tag` job with image array
5. **RLS Queries**: Push filters to DB level where possible (subcategory, category)

## Important Files to Reference

- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **AI Contract**: [docs/AI_JOBS.md](docs/AI_JOBS.md)
- **RLS Strategy**: [docs/RLS_STRATEGY.md](docs/RLS_STRATEGY.md)
- **Wardrobe Logic**: [lib/wardrobe.ts](lib/wardrobe.ts)
- **AI Job Utils**: [lib/ai-jobs.ts](lib/ai-jobs.ts)
- **Example Screen**: [app/(tabs)/wardrobe.tsx](app/(tabs)/wardrobe.tsx) (filtering, outfit creator mode, image caching)

## Debugging Checklist

When diagnosing issues, check in order:
1. **Auth**: Is `user` loaded in AuthContext? Check `isLoadingWardrobe` flag
2. **Network**: Are Supabase env vars set? Check console for init errors
3. **RLS**: Is user's `auth.uid()` matching table rows? Check Supabase policy logs
4. **Images**: Run `repairWardrobeItemImageLinks(userId)` to rebuild broken links
5. **AI Jobs**: Check job status with: `supabase.from('ai_jobs').select('*').eq('id', jobId).single()`
6. **Netlify**: Tail logs with: `netlify functions:invoke ai-job-runner --local`
