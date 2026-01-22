# Architecture Documentation

## Overview

Full Stylist is a cross-platform application built with Expo (React Native + Web) using Expo Router for file-based routing. The backend is powered by Supabase (PostgreSQL, Auth, and Storage), with Netlify Functions handling serverless AI API calls and privileged operations.

## Tech Stack

### Frontend
- **Expo (React Native + Web)**: Single codebase for iOS, Android, and Web
- **Expo Router**: File-based routing system
- **TypeScript**: Type safety across the application
- **React Native Web**: Web compatibility for React Native components

### Backend
- **Supabase**: 
  - PostgreSQL database with Row Level Security (RLS)
  - Authentication (email/password, magic links)
  - Storage for images and media
- **Netlify Functions**: Serverless functions for:
  - Gemini API calls (AI image generation and tagging)
  - Privileged operations requiring service role access

### AI/ML
- **Google Gemini API**: AI capabilities including:
  - `auto_tag`: Automatic wardrobe item attribute extraction
  - `outfit_suggest`: AI-powered outfit suggestions per category
  - `reference_match`: Reference image matching for outfit creation
  - `outfit_render`: Full outfit image generation

## Project Structure

```
full-stylist/
├── app/                        # Expo Router app directory
│   ├── _layout.tsx            # Root layout with AuthProvider
│   ├── index.tsx              # Entry point (auth routing)
│   ├── (tabs)/                # Tab navigation screens
│   │   ├── calendar.tsx       # Calendar month view
│   │   ├── wardrobe.tsx       # Wardrobe list screen
│   │   ├── lookbooks.tsx      # Lookbooks screen
│   │   ├── social.tsx         # Social feed screen
│   │   └── profile.tsx        # Profile screen
│   ├── auth/                  # Authentication screens
│   │   ├── login.tsx          # Login screen
│   │   └── signup.tsx         # Signup screen
│   ├── onboarding.tsx         # Onboarding screen
│   ├── wardrobe/              # Wardrobe screens
│   │   ├── add.tsx            # Add item screen
│   │   └── item/[id].tsx      # Item detail screen
│   ├── outfits/               # Outfit screens
│   │   └── [id].tsx           # Outfit editor screen
│   ├── calendar/              # Calendar screens
│   │   └── day/[date].tsx     # Day detail screen
│   ├── components/            # Reusable components
│   │   └── FindSimilarModal.tsx
│   └── import.tsx             # LocalStorage import screen
├── lib/                       # Utility libraries
│   ├── supabase.ts            # Supabase client initialization
│   ├── user.ts                # User profile management
│   ├── settings.ts            # User settings management
│   ├── wardrobe.ts            # Wardrobe item management
│   ├── outfits.ts             # Outfit management
│   ├── lookbooks.ts           # Lookbook management
│   ├── calendar.ts            # Calendar management
│   ├── posts.ts               # Post management
│   ├── engagement.ts          # Likes, comments, saves
│   ├── reposts.ts             # Repost functionality
│   ├── attributes.ts          # Attribute definitions and values
│   ├── ai-jobs.ts             # AI job creation and polling
│   ├── similarity.ts          # Similarity search by attributes
│   ├── listings.ts            # Marketplace listings
│   ├── bundles.ts             # Outfit bundles
│   ├── transactions.ts        # Transaction shells
│   └── import.ts              # LocalStorage import utility
├── contexts/                  # React contexts
│   └── AuthContext.tsx        # Authentication context
├── supabase/                  # Database migrations and seeds
│   ├── migrations/
│   │   ├── 0001_init.sql     # Initial schema
│   │   └── 0002_rls.sql      # Row Level Security policies
│   └── seed/
│       └── 0001_taxonomy.sql  # Taxonomy seed data
├── netlify/                   # Netlify Functions
│   └── functions/
│       └── ai-job-runner.ts   # AI job processing
├── docs/                      # Documentation
│   ├── SPEC.md                # Product specification
│   ├── IMPLEMENTATION_PLAN.md # Phase-by-phase plan
│   ├── AI_JOBS.md             # AI job contracts
│   ├── ENV.md                 # Environment variables
│   ├── ARCHITECTURE.md        # This file
│   └── RLS.md                 # Row Level Security documentation
├── app.json                   # Expo configuration
├── tsconfig.json              # TypeScript configuration
├── babel.config.js            # Babel configuration
└── metro.config.js            # Metro bundler configuration
```

## Architecture Patterns

### Authentication Flow

1. User authenticates via Supabase Auth (email/password or magic link)
2. `AuthContext` provides `user` and `session` throughout the app
3. On first login, user profile is created via `initializeUserProfile()`
4. Route guards in `app/index.tsx` redirect based on auth/onboarding status

### Data Flow

1. **Client → Supabase**: Direct client access using anon key for read/write operations
2. **Client → Netlify Functions**: For AI jobs (client creates `ai_jobs` row, polls status)
3. **Netlify Functions → Supabase**: Functions use service role key for privileged operations
4. **Netlify Functions → Gemini API**: AI processing happens server-side only

### Image Storage

- **Upload**: Images uploaded to Supabase Storage bucket `media`
- **References**: Image metadata stored in `images` table
- **Linking**: `wardrobe_item_images` links images to items with `type` (original, product_shot, etc.)
- **Listing Images**: `listing_images` enforces original images only

### AI Job Processing

1. Client creates `ai_jobs` row with `status='queued'`
2. Client polls `ai_jobs` table for status updates
3. Netlify Function `ai-job-runner` processes queued jobs:
   - Validates JWT
   - Fetches job from database
   - Calls Gemini API
   - Updates job status and result
4. Client applies results when `status='succeeded'`

### Privacy & Visibility

- **Entity-level visibility**: Each entity (wardrobe, outfit, lookbook) has `visibility` field
- **Override support**: Wardrobe items can override wardrobe visibility
- **RLS enforcement**: Row Level Security policies enforce visibility rules at database level
- **Private links**: Entities can be shared via `share_slug` with `visibility='private_link'`

### Similarity Search

- Uses `entity_attributes` and `attribute_cache` (no image reprocessing)
- Attribute overlap scoring for similarity calculation
- Three search modes: My Wardrobe, Shop in App (sellable items), Search Online (external)

## Key Design Decisions

### Single Codebase (Expo)
- **Rationale**: Maintain one codebase for mobile and web
- **Benefit**: Reduced maintenance overhead, consistent feature set

### Supabase + Netlify Functions
- **Rationale**: Supabase for data/auth/storage, Netlify for serverless AI processing
- **Benefit**: Separation of concerns, scalable AI processing

### File-based Routing (Expo Router)
- **Rationale**: Intuitive routing structure, type-safe navigation
- **Benefit**: Clear file organization, easy navigation patterns

### Row Level Security (RLS)
- **Rationale**: Security at database level, not just application level
- **Benefit**: Prevents unauthorized access even with direct database queries

### Attribute-based Similarity
- **Rationale**: Avoid expensive image reprocessing for similarity
- **Benefit**: Fast similarity search, cost-effective (no AI calls for similarity)

### Original Images Only for Listings
- **Rationale**: Ensure marketplace listings show real items
- **Benefit**: Prevents AI-generated images in marketplace listings

## Data Models

### Core Entities

- **Users**: User profiles and authentication
- **Wardrobes**: User wardrobe collections
- **Wardrobe Items**: Individual clothing items with images and attributes
- **Outfits**: Composed from wardrobe items (max 1 per category)
- **Lookbooks**: Collections of outfits (system or custom)
- **Posts**: Social feed posts (outfits or lookbooks only)
- **Calendar**: Outfit scheduling with slot presets
- **Listings**: Marketplace listings (original images only)
- **Bundles**: Outfit bundles for sale

### Relationships

- Wardrobe → Wardrobe Items (one-to-many)
- Outfit → Outfit Items → Wardrobe Items (many-to-many via junction)
- Lookbook → Lookbook Outfits → Outfits (many-to-many via junction)
- Post → Outfit/Lookbook (polymorphic via `entity_type`)
- Outfit Bundle → Bundle Groups → Bundle Group Items (hierarchical)

## Security Considerations

- **RLS Policies**: All tables have Row Level Security enabled
- **Service Role Key**: Only used in Netlify Functions (never exposed to client)
- **JWT Validation**: Netlify Functions validate Supabase JWT tokens
- **Visibility Enforcement**: RLS policies enforce visibility rules at database level
- **Original Images**: Listings enforce original images only (prevents AI images in marketplace)

## Performance Considerations

- **Attribute Caching**: `attribute_cache` on outfits/items for fast similarity
- **Image Optimization**: Images stored in Supabase Storage with CDN
- **Polling**: Client polls AI jobs (consider WebSockets for future optimization)
- **Lazy Loading**: Images loaded on-demand in feed and lists

## Future Enhancements

- **WebSocket Updates**: Real-time AI job status updates
- **Image Compression**: On-the-fly image resizing for different contexts
- **Offline Support**: Cache data for offline viewing
- **Push Notifications**: Notify users of AI job completion
- **Follow-based Feed**: Filter social feed by followed users
