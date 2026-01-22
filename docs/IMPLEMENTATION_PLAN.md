# Implementation Plan (Cursor Agent)

## Phase 0 — Convert to Expo (React Native + Web)
1) Initialize Expo with Expo Router (TypeScript).
2) Ensure web build works (expo start --web).
3) Add Supabase client and env wiring for Expo + Netlify.

## Phase 1 — Database + Seed
1) Add migrations in /supabase/migrations:
   - 0001_init.sql
   - 0002_rls.sql
2) Add seed SQL in /supabase/seed/0001_taxonomy.sql
3) Apply migrations and seed.

## Phase 2 — Auth + Profile
1) Supabase Auth: email magic link or password.
2) On first login:
   - create public.users
   - create public.user_settings
   - create default wardrobe
3) Settings UI:
   - account_privacy public/private
   - search_visibility visible/hidden
   - default_visibility
   - allow_external_sharing

## Phase 3 — Wardrobe
1) Wardrobe list screen:
   - category pills
   - search
   - filter drawer
2) Add item flow:
   - upload original images to Storage
   - insert images rows + wardrobe_item_images(type='original')
   - insert wardrobe_item row
   - if category is Intimates -> set visibility_override='private' by default
3) Item fullscreen carousel.

## Phase 4 — Attributes + auto_tag
1) Implement attribute definitions + values bootstrap usage.
2) Add “Auto-tag” action (ai_jobs auto_tag) after upload.
3) Function writes entity_attributes + suggested fields.

## Phase 5 — Outfit Editor
1) Outfit create/edit screen:
   - category slots (max 1 per category)
   - select from wardrobe
   - enforce unique (outfit_id, category_id)
2) Suggest per category:
   - create ai_jobs outfit_suggest
   - show candidate picker
3) Render:
   - create ai_jobs outfit_render
   - generating screen with ad placeholder
   - on success create outfit_renders + images rows + set outfit cover

## Phase 6 — Lookbooks
1) System tabs computed:
   - All: outfits visible to viewer
   - Favorites: is_favorite
   - Recent: created_at desc
   - Top Rated: derived from likes/comments/saves
2) Custom:
   - manual: lookbook_outfits
   - filter: filter_definition
3) Lookbook publish creates post.

## Phase 7 — Calendar
1) Month view showing multiple entries per day.
2) Slot presets:
   - system: Morning/Work/Evening seeded
   - user: create custom occasion -> calendar_slot_presets(scope='user')
3) CRUD entries.

## Phase 8 — Social Feed + Engagement + Reposts
1) Feed shows posts(outfit/lookbook) + reposts.
2) Like/comment/save.
3) Repost creates repost row; feed card shows original post.

## Phase 9 — Find Similar
1) Outfit post action sheet:
   - My Wardrobe: similarity by attributes
   - Shop in App: wardrobe_items is_sellable=true
   - Search Online: only after user taps
2) Similarity uses entity_attributes + attribute_cache; no image reprocessing.

## Phase 10 — Commerce Foundations
1) Listings:
   - must attach original images only (enforce in UI)
2) Outfit bundles:
   - create outfit_bundles
   - create bundle_groups (packaged sets) and mark required if bundle-only
   - sale_mode: items_only | bundle_only | both
3) Transaction shell rows (no real checkout yet).

## Phase 11 — LocalStorage Import Utility
1) Create a one-time “Import” screen:
   - read current local storage items/outfits
   - upload images to Storage
   - create wardrobe_items/outfits/outfit_items
2) After import, disable local storage writes.

## Phase 12 — Documentation
- docs/ARCHITECTURE.md
- docs/RLS.md
- docs/AI_JOBS.md already included