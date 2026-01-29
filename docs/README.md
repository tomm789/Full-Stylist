# Full Stylist - Technical Documentation

## 1. Project Overview

**Full Stylist** is a web application for AI-powered virtual styling and outfit generation. The app enables users to create professional headshots with customizable hair and makeup, combine headshots with body photos to create studio models, and generate outfit variations using wardrobe items and AI image generation.

### Primary Purpose
- Generate professional studio headshots with customizable hair and makeup modifications
- Create full-body studio models by combining headshots with body reference photos
- Generate outfit variations on studio models using uploaded wardrobe items or text descriptions
- Manage wardrobe collections with categorization, grouping, and organization features
- Save and organize generated outfits into lookbooks and calendar views

### Target Users
- Individuals seeking virtual styling and outfit visualization
- Fashion enthusiasts experimenting with different looks
- Users wanting to preview how clothing items would look without physical try-ons

### Target Platforms
- **Primary**: Web browsers (desktop and mobile)
- **Responsive Support**: Mobile phones, tablets, and desktop browsers
- **No native mobile apps**: Web-only application

### Current Development Status
**Production/Active Development** (Version 3.1.0)

The application is functional and deployed. Features include:
- Complete onboarding flow (headshot and studio model generation)
- Wardrobe management with categories and groups
- Outfit generation using AI
- Outfit saving and organization
- Home page with calendar/planner view
- Salon tab for generating new headshot variations

---

## 2. Tech Stack

### Frontend
- **Expo (React Native + Web)**: Single codebase for iOS, Android, and Web
- **Expo Router**: File-based routing system
- **TypeScript**: Type safety across the application
- **React Native Web**: Web compatibility for React Native components
- **React**: UI library (v19.1.0)

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

### Tooling
- **Package Manager**: npm
- **Dev Server**: Expo CLI (`expo start --web`)
- **Build Tool**: Expo Metro bundler
- **Deployment**: Netlify (for production builds: `expo export --platform web`)

### Runtime Targets
- **Web**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile Web**: iOS Safari, Chrome Mobile, Android browsers
- **iOS/Android**: Native app support via Expo (future)

---

## 3. App Architecture

### Architecture Type
**Cross-platform React Native application** with Expo Router for file-based routing

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│         Client (Expo App)               │
│  ┌──────────────────────────────────┐   │
│  │  Expo Router (file-based)        │   │
│  │  - app/index.tsx (entry)         │   │
│  │  - app/(tabs)/ (navigation)      │   │
│  │  - app/auth/ (auth screens)      │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  React Components (TypeScript)   │   │
│  │  - State management (React hooks)│   │
│  │  - UI components                 │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Supabase Client                 │   │
│  │  - Auth                          │   │
│  │  - Database queries              │   │
│  │  - Storage                       │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
              │
              │ HTTPS
              ▼
┌─────────────────────────────────────────┐
│      Supabase (Backend)                 │
│  ┌──────────────────────────────────┐   │
│  │  PostgreSQL Database             │   │
│  │  - Row Level Security (RLS)      │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Authentication                  │   │
│  │  - Email/password                │   │
│  │  - Magic links                   │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Storage (Images)                │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
              │
              │ HTTPS
              ▼
┌─────────────────────────────────────────┐
│      Netlify Functions                  │
│  ┌──────────────────────────────────┐   │
│  │  ai-job-runner.ts                │   │
│  │  - Gemini API calls              │   │
│  │  - Service role operations       │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
              │
              │ HTTPS
              ▼
┌─────────────────────────────────────────┐
│    Google Gemini API                    │
│    (Image Generation)                   │
└─────────────────────────────────────────┘
```

### State Management

**Pattern**: React hooks and context-based state management

**Primary State Management**:
- **AuthContext**: Provides authentication state throughout the app
- **React Hooks**: `useState`, `useEffect` for component-level state
- **Supabase**: Database as source of truth for persistent data

**Authentication Flow**:
1. User authenticates via Supabase Auth (email/password or magic link)
2. `AuthContext` provides `user` and `session` throughout the app
3. On first login, user profile is created via `initializeUserProfile()`
4. Route guards in `app/index.tsx` redirect based on auth/onboarding status

---

## 4. Project Structure

```
full-stylist/
├── app/                         # Expo Router app directory
│   ├── _layout.tsx             # Root layout with AuthProvider
│   ├── index.tsx               # Entry point (auth routing)
│   ├── (tabs)/                 # Tab navigation screens
│   │   ├── _layout.tsx
│   │   ├── calendar.tsx        # Calendar month view
│   │   ├── wardrobe.tsx        # Wardrobe list screen
│   │   ├── lookbooks.tsx       # Lookbooks screen
│   │   ├── social.tsx          # Social feed screen
│   │   └── profile.tsx         # Profile screen
│   ├── auth/                   # Authentication screens
│   │   ├── login.tsx           # Login screen
│   │   └── signup.tsx          # Signup screen
│   ├── onboarding.tsx          # Onboarding screen
│   ├── wardrobe/               # Wardrobe screens
│   │   ├── add.tsx             # Add item screen
│   │   └── item/[id].tsx       # Item detail screen
│   ├── outfits/                # Outfit screens
│   │   └── [id].tsx            # Outfit editor screen
│   ├── calendar/               # Calendar screens
│   │   └── day/[date].tsx      # Day detail screen
│   └── components/             # Reusable components
├── lib/                        # Utility libraries
│   ├── supabase.ts             # Supabase client initialization
│   ├── user.ts                 # User profile management
│   ├── wardrobe.ts             # Wardrobe item management
│   ├── outfits.ts              # Outfit management
│   ├── ai-jobs.ts              # AI job creation and polling
│   └── ...                     # Other utility libraries
├── contexts/                   # React contexts
│   └── AuthContext.tsx         # Authentication context
├── supabase/                   # Database migrations and seeds
│   ├── migrations/
│   └── seed/
├── netlify/                    # Netlify Functions
│   └── functions/
│       └── ai-job-runner.ts    # AI job processing
├── public/                     # Static assets (images, etc.)
├── docs/                       # Documentation
├── app.json                    # Expo configuration
├── package.json                # npm configuration
└── tsconfig.json               # TypeScript configuration
```

### Directory Purposes

**`/app`**: 
- Expo Router file-based routing directory
- Entry point: `app/index.tsx` (imports `expo-router/entry` from `index.js`)
- Each file/folder represents a route

**`/lib`**: 
- Utility libraries and helper functions
- Supabase client initialization
- Data management functions (wardrobe, outfits, etc.)

**`/contexts`**: 
- React contexts for global state (e.g., authentication)

**`/supabase`**: 
- Database migrations and seed data
- Schema definitions and RLS policies

**`/netlify/functions`**: 
- Serverless functions for AI processing
- Accessible via `/.netlify/functions/{function-name}`

**`/public`**: 
- Static assets (images, etc.)
- Note: Expo generates its own HTML; `public/index.html` is not used

### Monorepo/Workspace Structure
**No monorepo**: Single application in root directory

---

## 5. Routing & Navigation

### Routing Mechanism
**Expo Router**: File-based routing system built on React Navigation

### Implementation
- **File-based routes**: Each file in `app/` directory represents a route
- **Route structure**: Follows directory structure
- **Layouts**: `_layout.tsx` files define nested layouts
- **Dynamic routes**: Use brackets in filename (e.g., `[id].tsx`)
- **Groups**: Parentheses create route groups without adding to URL (e.g., `(tabs)`)

### Route Definitions

**Root Route** (`app/index.tsx`):
- Entry point that handles authentication routing
- Redirects to `/auth/login` if not authenticated
- Redirects to `/onboarding` if profile incomplete
- Redirects to `/(tabs)/wardrobe` if authenticated and profile complete

**Auth Routes** (`app/auth/`):
- `/auth/login` - Login screen
- `/auth/signup` - Signup screen

**Tab Routes** (`app/(tabs)/`):
- `/(tabs)/calendar` - Calendar month view
- `/(tabs)/wardrobe` - Wardrobe list screen
- `/(tabs)/lookbooks` - Lookbooks screen
- `/(tabs)/social` - Social feed screen
- `/(tabs)/profile` - Profile screen

**Onboarding** (`app/onboarding.tsx`):
- Onboarding flow for new users

**Wardrobe Routes** (`app/wardrobe/`):
- `/wardrobe/add` - Add new wardrobe item
- `/wardrobe/item/[id]` - Item detail screen

**Outfit Routes** (`app/outfits/`):
- `/outfits/[id]` - Outfit editor/viewer screen

**Calendar Routes** (`app/calendar/`):
- `/calendar/day/[date]` - Day detail screen

### Navigation Patterns

**Programmatic Navigation**:
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/wardrobe/add');
router.replace('/auth/login');
router.back();
```

**Link Navigation**:
```typescript
import { Link } from 'expo-router';

<Link href="/wardrobe/item/123">View Item</Link>
```

### URL Structure
- **Web**: Full URLs with path (e.g., `/wardrobe/add`)
- **Deep linking**: Supported - can bookmark and share URLs
- **Browser history**: Full support for back/forward navigation

---

## 6. Layout & Responsiveness

### Responsive Strategy
**CSS Media Queries** with breakpoint-based layout changes

### Breakpoints
Defined in `public/css/style.css`:

- **Mobile**: `@media (max-width: 480px)`
- **Tablet**: `@media (max-width: 768px)` and `@media (min-width: 481px) and (max-width: 768px)`
- **Desktop**: `@media (min-width: 769px)`

### Layout Handling by Viewport

**Desktop (> 768px)**:
- Dashboard: 3-column grid (`nav-rail` | `stage-area` | `controls-panel`)
- Grid columns: `grid-template-columns: 70px 35% 1fr`

**Tablet (481px - 768px)**:
- Dashboard: 2-column grid (`nav-rail` | `stage-area`)
- Controls panel: Moves below stage area
- Grid: `grid-template-columns: 60px 1fr`

**Mobile (≤ 480px)**:
- Dashboard: Single column, stacked layout
- Nav rail: Horizontal bottom bar (`flex-direction: row`)
- Stage area: Full width, reduced height
- Controls panel: Full width below stage

**Home View**:
- Mobile: Full width, scrolling day cards
- Tablet/Desktop: Max-width 600px, centered

### Platform Detection
**None**: Relies solely on CSS media queries (no JavaScript platform detection)

### Viewport Meta Tag
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```
- Prevents zoom on mobile
- Sets initial scale to 1.0

---

## 7. UI & Styling

### Styling System
**Pure CSS** (no CSS-in-JS, no preprocessors, no CSS frameworks)

### Theme/Token Setup
**CSS Custom Properties** (CSS Variables) defined in `:root`:

```css
:root {
    --bg-color: #0d0e12;          /* Dark background */
    --surface: #1e1f26;            /* Card/surface background */
    --surface-light: #2a2b35;      /* Lighter surface */
    --primary: #c3ec52;            /* Primary accent (lime green) */
    --accent-purple: #d452ec;      /* Secondary accent (purple) */
    --text-main: #ffffff;          /* Primary text */
    --text-muted: #8b92a5;         /* Muted text */
    --border: #333;                /* Border color */
    --danger: #ff6b6b;             /* Error/danger color */
}
```

**Location**: `public/css/style.css` lines 1-11

### Component Styling Approach
**Utility Classes + Component Classes**:

**Utility Classes**:
- `.hidden` - `display: none`
- `.btn`, `.btn-primary`, `.btn-purple`, `.btn-outline`
- `.grid-3`, `.grid-4`, `.grid-2`
- `.thumb`, `.selected`

**Component Classes**:
- `.step-card` - Onboarding steps
- `.upload-box` - File upload areas
- `.wardrobe-item-card` - Wardrobe item display
- `.outfit-card` - Outfit display
- `.modal` - Modal dialogs
- `.lightbox` - Full-screen image viewer

### Shared vs Screen-Specific Components
**All styles in one file**: `public/css/style.css` (~2500+ lines)

**View-Specific Styles**:
- `.login-container`, `.login-card` - Login view
- `.onboarding-container` - Onboarding view
- `.app-layout`, `.nav-rail`, `.stage-area`, `.controls-panel` - Dashboard
- `.home-view`, `.home-top-nav`, `.home-bottom-nav` - Home view

**Shared Components**:
- Buttons, inputs, modals, lightbox
- Grid layouts, cards, tabs

### Font
```css
font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

---

## 8. Platform-Specific Logic

### Platform Detection
**None**: No JavaScript-based platform detection

### Feature Flags
**None**: No feature flag system

### Code Path Differences
**None**: All code paths are identical across platforms

### Browser Compatibility
- Relies on modern browser APIs:
  - `localStorage` API
  - `FileReader` API
  - `fetch` API
  - CSS Grid and Flexbox
  - CSS Custom Properties

**No polyfills**: Assumes modern browser support

---

## 9. Data & State

### Data Sources

**1. Supabase Database**:
- PostgreSQL database with Row Level Security (RLS)
- Tables: `users`, `wardrobes`, `wardrobe_items`, `outfits`, `lookbooks`, `posts`, etc.
- Real-time capabilities available (future enhancement)

**2. Supabase Storage**:
- Image storage for wardrobe items, outfits, and user profiles
- Bucket: `media` (with RLS policies)
- Images referenced via URLs, not stored as Base64 in database

**3. Supabase Auth**:
- User authentication (email/password, magic links)
- Session management
- User profiles linked to auth users

**4. Google Gemini API**:
- AI image generation and processing
- Accessed via Netlify Functions (`ai-job-runner.ts`)
- Jobs tracked in `ai_jobs` database table

**5. Netlify Functions**:
- `/.netlify/functions/ai-job-runner` - AI job processing (Gemini API calls)
- Service role access for privileged operations

### Data Format

**Images**: 
- Stored in Supabase Storage bucket `media`
- Metadata stored in `images` table
- URLs used for display (not Base64 strings)
- Original files preserved

**Wardrobe Items**:
- Stored in `wardrobe_items` table
- Images linked via `wardrobe_item_images` table
- Attributes stored in `entity_attributes` table
- Categories, groups, and other metadata in database

**Outfits**:
- Stored in `outfits` table
- Linked to wardrobe items via `outfit_items` junction table
- Images stored in Supabase Storage
- Metadata (categories, visibility) in database

### State Management

**Global State**:
- **AuthContext**: Provides authentication state (`user`, `session`) throughout app
- **React Hooks**: Component-level state using `useState`, `useEffect`
- **Supabase Client**: Real-time queries and mutations

**Data Persistence**:
- **Primary**: Supabase PostgreSQL database
- **Storage**: Supabase Storage for images
- **Local Caching**: React Query or similar (optional, future enhancement)
- **Offline Support**: Not currently implemented (future enhancement)

**Persistence Triggers**:
- User actions trigger database mutations via Supabase client
- AI jobs created in database, polled for status updates
- Real-time updates available via Supabase subscriptions (future)

---

## 10. Environment & Configuration

### Environment Variables

**Backend (Netlify Functions)**:
- `GEMINI_API_KEY` - Google Gemini API key
  - **Location**: Netlify environment variables (not in code)
  - **Usage**: `netlify/functions/generate.js` line 29
  - **Required**: Yes (function fails if missing)

**Frontend**:
- `EXPO_PUBLIC_PERF_LOGS` - When set to `'true'`, enables client-side timeline logs for outfit render (and other flows). Logs are emitted via `console.debug` only when enabled. Use to pinpoint delay between submit and image visible (e.g. cache/refresh vs image availability vs DB write). Events: `generate_press`, `job_created`, `execution_triggered`, `navigate_to_view`, `poll_start`, `poll_success`, `outfit_fetch_start`, `outfit_fetch_end`, `image_load_start`, `image_load_end` (or `image_load_error`). See `src/lib/perf/timeline.ts`.

### Config Files

**`netlify.toml`**:
```toml
[build]
  command = "npx expo export --platform web"
  publish = "web-build"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
- Build command: Exports Expo web app to `web-build` directory
- Publish directory: `web-build` (Expo-generated static files)
- Functions directory: `netlify/functions`
- SPA fallback redirect (all routes → index.html)

**`app.config.js`** / **`app.json`**:
- Expo configuration
- Entry point: `index.js` (imports `expo-router/entry`)
- Web bundler: Metro
- Router plugin: Expo Router enabled

**`package.json`**:
```json
{
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "dev": "netlify dev"
  }
}
```

### Build-Time vs Runtime Configuration

**Build-Time**:
- Expo exports web app to `web-build` directory
- Metro bundler compiles TypeScript/React to JavaScript
- Static assets bundled

**Runtime Configuration**:
- Supabase connection: Environment variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- User preferences: Stored in Supabase database
- AI job endpoints: Defined in `lib/ai-jobs.ts`

---

## 11. Dev & Preview Workflow

### Running Locally

**Frontend Development (Recommended)**:
```bash
npm run web
```
or
```bash
expo start --web
```

**What it does**:
- Starts Expo development server with Metro bundler
- Serves the Expo Router app
- Hot reloading enabled (automatic refresh on code changes)
- Typically runs on `http://localhost:8081` (web) or shows QR code for mobile

**Full Stack Development (with Netlify Functions)**:
```bash
npm run dev
```
or
```bash
netlify dev
```

**What it does**:
- Starts Netlify CLI development server
- Proxies Netlify functions locally
- Typically runs on `http://localhost:8888`
- Note: For Expo Router app, use `npm run web` instead. This is primarily for testing functions.

### Preview Methods

**Web Browser**:
- Open `http://localhost:8081` in browser (when running `npm run web`)
- Full Expo Router app functionality
- Hot reloading enabled

**Mobile Device Preview**:
- Run `expo start` and scan QR code with Expo Go app (iOS/Android)
- Or connect device to same network and access via local IP

**iOS Simulator**:
```bash
npm run ios
```

**Android Emulator**:
```bash
npm run android
```

### Requirements

- Node.js installed
- Expo CLI (installed via npm with expo package)
- For Netlify Functions testing: Netlify CLI (`npm install -g netlify-cli`)
- Environment variables: Create `.env` file with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 12. Known Constraints & Assumptions

### Hard Constraints

1. **Expo Router Dependency**: App relies on Expo Router for routing
   - **Implication**: Routing structure tied to file system

2. **Supabase Backend**: All persistent data stored in Supabase
   - **Implication**: Requires Supabase project and valid credentials

3. **Row Level Security**: Database security enforced via RLS policies
   - **Implication**: Must maintain RLS policies for data access

4. **Google Gemini API Dependency**: Core AI functionality requires external API
   - **Implication**: App non-functional if API unavailable or quota exceeded

5. **Netlify Functions**: AI jobs processed via Netlify Functions
   - **Implication**: Requires Netlify deployment or local Netlify CLI for function testing

6. **Cross-Platform Support**: Single codebase for web, iOS, and Android
   - **Implication**: Must use React Native compatible components and APIs

### Architectural Assumptions

1. **Modern JavaScript/TypeScript**: Uses ES6+, TypeScript, React hooks
   - **Must respect**: Maintain compatibility with React Native Web

2. **Expo Router File-Based Routing**: Routing structure follows file system
   - **Must respect**: File organization determines routes

3. **Supabase as Backend**: All data persistence via Supabase
   - **Must respect**: Database schema changes require migrations

4. **React Native Components**: UI built with React Native components
   - **Must respect**: Use cross-platform compatible components

5. **Metro Bundler**: Uses Expo's Metro bundler for web builds
   - **Must respect**: Metro bundler configuration and limitations

6. **Serverless Architecture**: AI processing via serverless functions
   - **Must respect**: Function execution time and memory limits

### Technical Debt / Constraints

1. **Type Safety**: TypeScript used but may have `any` types
2. **Testing**: Limited or no test coverage
3. **Error Handling**: May need improved error boundaries
4. **Loading States**: Some operations may need better loading indicators
5. **Offline Support**: Not currently implemented
6. **Real-time Updates**: AI job polling could be replaced with WebSockets (future)

---

## Additional Notes

### File Locations Summary

- **Entry Point**: `index.js` (imports `expo-router/entry`)
- **Root Layout**: `app/_layout.tsx`
- **Main Routes**: `app/` directory (file-based routing)
- **Utility Libraries**: `lib/` directory
- **Auth Context**: `contexts/AuthContext.tsx`
- **API Functions**: `netlify/functions/ai-job-runner.ts`
- **Config**: `app.config.js`, `netlify.toml`, `package.json`

### API Endpoints

**Client → Supabase**:
- Direct client access using anon key
- Tables: `wardrobes`, `wardrobe_items`, `outfits`, `lookbooks`, etc.
- Storage: `media` bucket for images

**Client → Netlify Functions**:
- `/.netlify/functions/ai-job-runner` - AI job processing
- Jobs created in `ai_jobs` table, polled for status

**Netlify Functions → External**:
- `https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:generateContent` - Gemini API

---

*Document Version: 1.0*  
*Last Updated: Based on codebase analysis*  
*Application Version: 3.1.0*
