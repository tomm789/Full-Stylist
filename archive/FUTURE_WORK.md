# Future Work & Enhancements

This document tracks features and enhancements that were noted during implementation but deferred to later phases.

## Phase 3 - Wardrobe
- **Filter drawer**: Full filter drawer implementation with subcategory, colors, material, size, season, tags, and favorites filters
- **Item fullscreen carousel**: Complete item detail view with original + product shots, details + tags, add-to-outfit, and share wardrobe/private link functionality

## Phase 4 - Attributes + auto_tag
- **Enhancements**: Additional attribute processing and display features

## Phase 5 - Outfit Editor
- **AI candidate picker**: UI for selecting from AI-generated outfit suggestions per category
- **Generating screen**: Dedicated screen for outfit render generation with ad placeholder
- **Outfit publishing**: Add "Publish to Feed" option in outfit editor to create post

## Phase 6 - Lookbooks
- **Custom lookbook creation UI**: Interface for creating manual and filter-based custom lookbooks

## Phase 7 - Calendar
- **Day carousel view**: Reorder entries view for calendar day (currently only list view implemented)
- **Entry reordering**: UI for reordering calendar entries (sort_order field exists; UI pending)
- **Custom slot preset creation UI**: Interface for creating user-defined slot presets

## Phase 8 - Social Feed + Engagement + Reposts
- **Outfit publishing**: `publishLookbook` exists; outfit publishing to feed can be added to outfit editor
- **Following/followers feed**: MVP shows all public posts; follow-based feed filtering can be added later
- **Sponsored cards**: Sponsored post cards in feed (not implemented; can be added later)

## Phase 9 - Find Similar
- **Search Online integration**: Currently returns empty; needs external shopping API integration (Google Shopping, etc.)
- **Category filtering**: For MVP, category filtering from outfit items is not implemented; can be enhanced later with category extraction from outfit items

## Phase 10 - Commerce Foundations
- **Checkout implementation**: Transaction shell rows are created but no real checkout flow (no payment processing)
- **Listing UI**: Listing creation/management UI not yet implemented (library functions ready)
- **Bundle UI**: Outfit bundle creation/management UI not yet implemented (library functions ready)
- **Marketplace view**: Marketplace browsing UI for active listings not yet implemented (library functions ready)

## Phase 11 - LocalStorage Import Utility
- **Item ID mapping**: Outfit import doesn't fully map old localStorage item IDs to new database IDs (simplified implementation)
- **Category matching**: Category matching from localStorage names to database categories could be improved with fuzzy matching
- **Image optimization**: Images are imported as-is from base64; could add compression/resizing during import
- **Import routing**: Import screen not automatically shown to users who have localStorage data (currently requires manual navigation)
