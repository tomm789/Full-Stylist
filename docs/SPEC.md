# AI Outfit Planner + Social Feedback — Product Spec (MVP)

## Platforms
- Single codebase: Expo (React Native) + Web (React Native Web) using Expo Router.
- Backend: Supabase (Auth + Postgres + Storage).
- Server: Netlify Functions for Gemini API calls and privileged operations.

## Main Sections (Tabs)
- Calendar
- Wardrobe
- Lookbooks
- Social
- Profile

## Core Concepts
- Users upload wardrobe items (photos + metadata).
- Outfits are composed from wardrobe items.
  - Rule: max 1 item per top-level category in an outfit.
  - If a category is empty, it is omitted from the outfit and render.
- Lookbooks group outfits (manual or filter-based).
- Calendar supports multiple outfit entries per day using slot presets or custom occasions.
- Social feed supports ONLY outfits and lookbooks (no wardrobe posts).
- Engagement: likes, comments, saves. Top Rated is derived from these.
- Reposting is supported (subject to original visibility).

## Privacy & Discovery
### Account settings
- account_privacy: public | private
- search_visibility: visible | hidden
  - hidden: user does not appear in search/discovery
  - profile accessible only to connected users or via valid private link (if shared)

### Entity visibility
Visibility values:
- public: anyone can view/interact
- followers: only accepted followers can view/interact
- private_link: anyone with share link can view/interact and can follow private accounts
- private: owner only (used primarily for wardrobe item overrides)
- inherit: wardrobe item uses wardrobe visibility

### Wardrobe share
- A wardrobe can be shared as a whole (public/followers/private_link).
- Individual wardrobe items can override and be private.
- Intimates/Shapewear default to private visibility_override.

### Private link behavior (important)
- If entity is private_link and viewer has valid share_slug:
  - allow view + like/comment/save
  - allow follow action (follow request/accept flow depending on privacy)
  - engagement counts toward ranking

## AI Capabilities (Gemini)
### AI jobs
- auto_tag: derive attributes for wardrobe item once, store results to entity_attributes
- outfit_suggest:
  - given prompt + constraints + category/subcategory, return candidates
  - do NOT generate images
- reference_match:
  - given reference image + constraints, return candidates per category with confidence; may return missing categories
- outfit_render:
  - given selected outfit items (+ optional prompt/ref), generate one or more images
  - store outputs as images + outfit_renders

### Cost control rules
- Never re-analyze images for similarity if attributes exist.
- Similarity and outfit selection use entity_attributes + attribute_cache first.

## Find Similar (Feed Outfit Action)
When viewing an outfit post:
1) Find similar in my wardrobe (attribute overlap scoring; category required)
2) Find similar from retailers on the app (items with is_sellable=true)
3) Search online for similar items (only when user taps “Search online”)
- In-app matches must always be shown first.

## Commerce (Foundations)
### Retailer selling
- wardrobe_items can be flagged is_sellable and include SKU/price/inventory basics
- later: checkout can be in-app OR external; MVP stores links/metadata and enables “try on” renders

### Resale marketplace
- Listings use original photos only (no AI images).
- Users can sell:
  - individual items
  - bundled outfit (complete only)
  - both options available
- Must support “packaged together” bundles via bundle_groups:
  - user can mark group as required (bundle integrity)

## Engagement / Ranking
- Top Rated uses: likes + comments + saves (with optional decay later)
- Engagement from private links counts.

## Women’s Taxonomy (Seeded)
Top-level categories (starter):
- Tops
- Bottoms
- Dresses
- Jumpsuits & Rompers
- Outerwear
- Knitwear
- Activewear
- Sleepwear & Loungewear
- Swimwear
- Shoes
- Bags
- Accessories
- Jewellery
- Intimates (default private)

Each has common subcategories (see seed file).

## Screens (Required UI Elements)
### Auth / Onboarding
- Sign in/up
- Create handle, display name
- Account privacy toggle
- Search visibility toggle
- Create default wardrobe row
- Seed system slot presets visible in calendar UI

### Wardrobe
- Search
- Category tabs/pills
- Filter drawer: subcategory, colors, material, size, season, tags, favorites
- Add item flow:
  - upload original photos
  - set category/subcategory
  - optional: auto_tag, product_shot
- Item fullscreen carousel:
  - original + product shots
  - details + tags
  - add-to-outfit
  - share wardrobe/private link

### Outfit Editor
- Category slots (max 1 each)
- Suggest per category/subcategory (returns options; user chooses)
- Suggest all empty (options, not final)
- Render action -> generating screen -> results saved
- Save options:
  - publish to feed (creates post)
  - visibility (public/followers/private_link)

### Lookbooks
- System tabs: All, Favorites, Recent, Top Rated
- Custom: manual or filter-based
- Publish lookbook to feed

### Calendar
- Month view with multiple entries per day
- Slot presets: Morning/Work/Evening + user-created occasions
- Add entry: pick slot, pick outfit, status planned/worn/skipped
- Day carousel view: reorder entries

### Social Feed
- Shows posts (outfit/lookbook) + reposts + sponsored cards
- Like/comment/save + repost
- Outfit post action sheet: Find Similar modal

### Profile
- User’s outfits, lookbooks
- Settings: privacy, search visibility, default visibility, allow external sharing
- Follow requests for private accounts