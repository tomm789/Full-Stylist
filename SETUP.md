# Full Stylist - Setup Instructions

## Phase 0: Complete ✅

The Expo project has been initialized with:
- Expo Router (file-based routing)
- TypeScript configuration
- Supabase client setup
- Netlify function structure for AI jobs
- Basic app structure with 5 tabs (Calendar, Wardrobe, Lookbooks, Social, Profile)

## Environment Variables

Create a `.env` file in the root directory with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://earlhvpckbcpvppvmxsd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

For Netlify Functions (set in Netlify dashboard):
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (never expose to client)
- `GEMINI_API_KEY` - Gemini API key (never expose to client)

## Phase 1: Database Setup

The migration files are already in place:
- `supabase/migrations/0001_init.sql` - Initial schema
- `supabase/migrations/0002_rls.sql` - Row Level Security policies
- `supabase/seed/0001_taxonomy.sql` - Taxonomy seed data

To apply migrations:

### Option 1: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: https://earlhvpckbcpvppvmxsd.supabase.co
3. Go to SQL Editor
4. Run `supabase/migrations/0001_init.sql`
5. Run `supabase/migrations/0002_rls.sql`
6. Run `supabase/seed/0001_taxonomy.sql`

### Option 2: Using Supabase CLI
```bash
supabase db push
```

## Running the App

### Development
```bash
npm run start    # Expo dev server
npm run web      # Web version
npm run ios      # iOS simulator
npm run android  # Android emulator
```

### Netlify Functions
```bash
npm run dev      # Netlify dev (includes functions)
```

## Project Structure

```
full-stylist/
├── app/                    # Expo Router app directory
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Root redirect
│   └── (tabs)/            # Tab navigation
│       ├── _layout.tsx
│       ├── calendar.tsx
│       ├── wardrobe.tsx
│       ├── lookbooks.tsx
│       ├── social.tsx
│       └── profile.tsx
├── lib/
│   └── supabase.ts        # Supabase client
├── netlify/
│   └── functions/
│       └── ai-job-runner.ts  # AI job processing (placeholder)
├── supabase/
│   ├── migrations/        # Database migrations
│   └── seed/             # Seed data
├── docs/                  # Specifications
└── app.json              # Expo configuration
```

## Next Steps

1. Apply database migrations (Phase 1)
2. Implement Auth + Profile (Phase 2)
3. Implement Wardrobe (Phase 3)
4. Continue with remaining phases per IMPLEMENTATION_PLAN.md