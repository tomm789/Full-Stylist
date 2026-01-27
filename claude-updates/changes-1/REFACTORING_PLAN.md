# Wardrobe Refactoring Plan

## Overview
Refactor wardrobe files from monolithic 1000+ line files into modular, reusable components.

## Current Structure Issues
- ❌ Files over 1000 lines (wardrobe.tsx: ~1400 lines)
- ❌ Duplicated UI components across files
- ❌ Inline styles mixed with component logic
- ❌ Business logic tightly coupled with UI
- ❌ No shared component library

## Target Structure

```
app/
├── components/
│   ├── shared/           # App-wide reusable components
│   │   ├── buttons/
│   │   │   ├── PrimaryButton.tsx
│   │   │   ├── IconButton.tsx
│   │   │   └── PillButton.tsx
│   │   ├── forms/
│   │   │   ├── Input.tsx
│   │   │   ├── TextArea.tsx
│   │   │   └── Select.tsx
│   │   ├── images/
│   │   │   ├── ImageCarousel.tsx
│   │   │   ├── ImageGrid.tsx
│   │   │   └── ImagePlaceholder.tsx
│   │   ├── modals/
│   │   │   ├── BaseModal.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   └── FullScreenModal.tsx
│   │   ├── loading/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── LoadingOverlay.tsx
│   │   │   └── ProgressIndicator.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── ScrollContainer.tsx
│   │       └── EmptyState.tsx
│   │
│   └── wardrobe/         # Wardrobe-specific components
│       ├── ItemCard.tsx
│       ├── ItemGrid.tsx
│       ├── ItemDetailModal.tsx
│       ├── CategoryPills.tsx
│       ├── FilterDrawer.tsx
│       ├── OutfitCreatorBar.tsx
│       ├── NavigationSlider.tsx
│       └── AttributesList.tsx
│
├── hooks/                # Shared custom hooks
│   ├── wardrobe/
│   │   ├── useWardrobe.ts
│   │   ├── useWardrobeItems.ts
│   │   ├── useCategories.ts
│   │   ├── useFilters.ts
│   │   └── useImageCache.ts
│   ├── ai/
│   │   ├── useAIJobPolling.ts
│   │   └── useProductShot.ts
│   └── common/
│       ├── usePolling.ts
│       ├── useModal.ts
│       └── useDimensions.ts
│
├── styles/               # Shared styles and theme
│   ├── theme.ts          # Colors, spacing, typography
│   ├── commonStyles.ts   # Reusable style objects
│   └── index.ts          # Export all styles
│
├── utils/                # Utility functions
│   ├── imageUtils.ts
│   ├── wardrobeUtils.ts
│   ├── formatUtils.ts
│   └── validationUtils.ts
│
└── (tabs)/
    └── wardrobe/
        ├── index.tsx     # Main wardrobe screen (< 300 lines)
        ├── add.tsx       # Add item screen (< 300 lines)
        └── item/
            ├── [id].tsx  # Item detail (< 300 lines)
            └── [id]/
                └── edit.tsx  # Edit item (< 300 lines)
```

## Refactoring Phases

### Phase 1: Extract Shared Styles
- Create theme.ts with colors, spacing, typography
- Create commonStyles.ts with reusable style objects
- Benefits: Consistency, easy theming, reduced duplication

### Phase 2: Extract Shared UI Components
- Buttons (PrimaryButton, IconButton, PillButton)
- Forms (Input, TextArea, Select)
- Images (ImageCarousel, ImagePlaceholder)
- Modals (BaseModal, BottomSheet)
- Loading states
- Benefits: Reusability across app, consistent UI

### Phase 3: Extract Custom Hooks
- Wardrobe data hooks (useWardrobe, useWardrobeItems)
- Filter hooks (useFilters)
- AI polling hooks (useAIJobPolling, useProductShot)
- Image cache hook (useImageCache)
- Benefits: Separation of concerns, testability, reusability

### Phase 4: Extract Domain-Specific Components
- ItemCard, ItemGrid
- CategoryPills, FilterDrawer
- OutfitCreatorBar
- NavigationSlider
- Benefits: Cleaner main files, focused components

### Phase 5: Refactor Main Files
- Simplify wardrobe.tsx to use extracted components/hooks
- Simplify add.tsx
- Simplify item/[id].tsx
- Simplify item/[id]/edit.tsx
- Benefits: Readable, maintainable, < 300 lines each

## Success Metrics
- ✅ All main files under 300 lines
- ✅ No duplicate UI code
- ✅ Consistent styling across app
- ✅ Reusable components for outfits, social, etc.
- ✅ Clear separation of concerns
- ✅ Improved testability

## Process Optimization for Future Refactors
After completing wardrobe refactoring, document:
1. Common patterns identified
2. Component extraction criteria
3. Hook extraction criteria
4. Style organization best practices
5. Lessons learned

This will create a template for refactoring outfits, social, and other sections.
