# Task: Extract sections from large components

## Files to read first
- `src/components/tabs/FullScreenMenuModal.tsx` (583 lines)
- `src/components/wardrobe/OutfitCreatorPanel.tsx` (566 lines)
- `app/ai-settings.tsx` (~482 lines after Phase 4 styles extraction)
- `src/components/tabs/index.ts` (barrel)
- `src/components/wardrobe/index.ts` (barrel)

## Overview

Extract styles, data constants, and sub-components from three large files. After this phase, each file should be under ~350 lines.

**Important:** Phase 4 already extracted `createStyles` from `app/ai-settings.tsx` into `app/ai-settings.styles.ts`. But `FullScreenMenuModal.tsx` and `OutfitCreatorPanel.tsx` are in `src/components/`, so their styles were NOT extracted in Phase 4. This phase handles their styles.

---

## Component 1: `FullScreenMenuModal.tsx` (583 lines)

### 1a. Create `src/components/tabs/FullScreenMenuModal.styles.ts`

Move from `FullScreenMenuModal.tsx`:
- The entire `createStyles` function (lines 394-583)

```tsx
import { StyleSheet } from 'react-native';
import { borderRadius, spacing, typography, shadows } from '@/styles/theme';
import type { ThemeColors } from '@/styles/themes';

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // [paste lines 395-582 exactly]
});
```

### 1b. Create `src/components/tabs/MenuGrid.tsx`

Extract the grid rendering block (currently lines 298-331 in FullScreenMenuModal) into a small component.

```tsx
import React from 'react';
import { View, Text as RNText, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MenuItem } from './FullScreenMenuModal';

interface MenuGridProps {
  title: string;
  items: MenuItem[];
  styles: {
    section: any;
    sectionTitle: any;
    grid: any;
    gridCard: any;
    gridIconWrap: any;
    gridCardTitle: any;
    cardTitleDestructive: any;
    gridCardDescription: any;
  };
  colors: { error: string; textPrimary: string };
}

export function MenuGrid({ title, items, styles, colors }: MenuGridProps) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      {!!title && <RNText style={styles.sectionTitle}>{title}</RNText>}
      <View style={styles.grid}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.gridCard}
            onPress={item.onPress}
            activeOpacity={0.85}
          >
            <View style={styles.gridIconWrap}>
              <Ionicons
                name={item.icon}
                size={20}
                color={item.tone === 'destructive' ? colors.error : colors.textPrimary}
              />
            </View>
            <RNText
              style={[
                styles.gridCardTitle,
                item.tone === 'destructive' && styles.cardTitleDestructive,
              ]}
            >
              {item.label}
            </RNText>
            {!!item.description && (
              <RNText style={styles.gridCardDescription}>{item.description}</RNText>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
```

### 1c. Create `src/components/tabs/MenuActionList.tsx`

Extract the action list rendering block (currently lines 333-368 in FullScreenMenuModal) into a small component.

```tsx
import React from 'react';
import { View, Text as RNText, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MenuItem } from './FullScreenMenuModal';

interface MenuActionListProps {
  items: MenuItem[];
  styles: {
    section: any;
    cardGroup: any;
    card: any;
    cardIconWrap: any;
    cardTextWrap: any;
    cardTitle: any;
    cardTitleDestructive: any;
    cardDescription: any;
  };
  colors: { error: string; textPrimary: string; textTertiary: string };
}

export function MenuActionList({ items, styles, colors }: MenuActionListProps) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.cardGroup}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.card}
            onPress={item.onPress}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconWrap}>
              <Ionicons
                name={item.icon}
                size={20}
                color={item.tone === 'destructive' ? colors.error : colors.textPrimary}
              />
            </View>
            <View style={styles.cardTextWrap}>
              <RNText
                style={[
                  styles.cardTitle,
                  item.tone === 'destructive' && styles.cardTitleDestructive,
                ]}
              >
                {item.label}
              </RNText>
              {!!item.description && (
                <RNText style={styles.cardDescription}>{item.description}</RNText>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
```

### 1d. Update `FullScreenMenuModal.tsx`

After extraction:
- Import `{ createStyles }` from `'./FullScreenMenuModal.styles'`
- Import `{ MenuGrid }` from `'./MenuGrid'`
- Import `{ MenuActionList }` from `'./MenuActionList'`
- Remove the `createStyles` function definition (lines 394-583)
- Remove the inline grid JSX block (lines 298-331) and replace with:
  ```tsx
  <MenuGrid
    title={gridTitle}
    items={filteredGridItems}
    styles={styles}
    colors={colors}
  />
  ```
- Remove the inline action list JSX block (lines 333-368) and replace with:
  ```tsx
  <MenuActionList
    items={filteredActionItems}
    styles={styles}
    colors={colors}
  />
  ```
- Remove `ThemeColors` type import (only used by createStyles, now in styles file)
- Keep `MenuItem` type export (MenuGrid and MenuActionList import it)

**Expected result:** ~290 lines

---

## Component 2: `OutfitCreatorPanel.tsx` (566 lines)

### 2a. Create `src/components/wardrobe/OutfitCreatorPanel.styles.ts`

Move from `OutfitCreatorPanel.tsx`:
- The `PANEL_HANDLE_AREA_HEIGHT` constant (line 52)
- The `TAB_BAR_HEIGHT` constant (line 53)
- The `ROW_CONTENT_HEIGHT` constant (line 54)
- The `PANEL_COLLAPSED_HEIGHT` constant (line 55)
- The entire `createStyles` function (lines 92-248)

```tsx
import { StyleSheet } from 'react-native';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

export const PANEL_HANDLE_AREA_HEIGHT = 24;
export const TAB_BAR_HEIGHT = 44;
const ROW_CONTENT_HEIGHT = 76;
export const PANEL_COLLAPSED_HEIGHT = PANEL_HANDLE_AREA_HEIGHT + ROW_CONTENT_HEIGHT;

export const createStyles = (colors: ThemeColors, cellSize: number) =>
  StyleSheet.create({
    // [paste lines 93-248 exactly]
  });
```

### 2b. Create `src/components/wardrobe/PanelCards.tsx`

Move from `OutfitCreatorPanel.tsx`:
- `PanelItemCardProps` interface (lines 252-262)
- `PanelItemCard` function (lines 264-293)
- `PanelCategoryCardProps` interface (lines 295-308)
- `PanelCategoryCard` function (lines 310-345)

```tsx
import React from 'react';
import { View, TouchableOpacity, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ImagePlaceholder, WardrobeCategoryIcon } from '@/components/shared';
import { WardrobeCategory } from '@/lib/wardrobe';

// [paste SelectedItem interface or import from OutfitCreatorPanel]
// NOTE: SelectedItem should be exported from OutfitCreatorPanel (or from this file)
export interface PanelSelectedItem {
  id: string;
  imageUrl: string | null;
  trimStatus: import('@/lib/outfits/canvasLayout').OutfitCanvasTrimStatus;
}

// [paste PanelItemCardProps, PanelItemCard, PanelCategoryCardProps, PanelCategoryCard unchanged]
```

Wait — `SelectedItem` is a private interface in OutfitCreatorPanel. For PanelCards to reference it, export it from OutfitCreatorPanel or define it in PanelCards.

**Best approach:** Keep the `SelectedItem` interface in `OutfitCreatorPanel.tsx` and export it. Import it in `PanelCards.tsx`. The `PanelItemCard` component accepts a `SelectedItem` item prop.

### 2c. Update `OutfitCreatorPanel.tsx`

After extraction:
- Import `{ createStyles, PANEL_HANDLE_AREA_HEIGHT, PANEL_COLLAPSED_HEIGHT }` from `'./OutfitCreatorPanel.styles'`
- Import `{ PanelItemCard, PanelCategoryCard }` from `'./PanelCards'`
- Remove the `createStyles` function, height constants, `PanelItemCard`, `PanelCategoryCard` and their interfaces
- Export the `SelectedItem` interface (add `export` keyword)
- Remove `theme` import and `{ spacing, borderRadius, typography }` destructuring (now in styles file)
- Remove `ThemeColors` type import (now in styles file)
- Keep re-exports of `PANEL_HANDLE_AREA_HEIGHT` and `PANEL_COLLAPSED_HEIGHT` from the styles file — actually, since the main file already exports these, update the export to come from the styles file:
  ```tsx
  export { PANEL_HANDLE_AREA_HEIGHT, PANEL_COLLAPSED_HEIGHT } from './OutfitCreatorPanel.styles';
  ```

**Expected result:** ~250 lines

---

## Component 3: `ai-settings.tsx` (~482 lines after Phase 4)

**Note:** Phase 4 already extracted `createStyles` to `app/ai-settings.styles.ts`. This component still has ~482 lines. The largest extractable block is the model data.

### 3a. Create `src/constants/aiModels.ts`

Move from `ai-settings.tsx`:
- `DEFAULT_IMAGE_MODEL` constant (line 21)
- `DEFAULT_BODY_MODEL` constant (line 22)
- `MODEL_CATALOG` array (lines 24-133)
- `MODEL_KEYS` array (lines 135-145)
- `GENERATION_SETTINGS` array (lines 147-217)

```tsx
import type { AIModelSettingKey, AIModelLockKey } from '@/hooks/profile';

export const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
export const DEFAULT_BODY_MODEL = 'gemini-3-pro-image-preview';

export interface ModelInfo {
  id: string;
  name: string;
  family: string;
  summary: string;
  price: string;
  description: string;
}

export const MODEL_CATALOG: ModelInfo[] = [
  // [paste lines 25-132 exactly]
];

export const MODEL_KEYS: AIModelSettingKey[] = [
  // [paste lines 136-144 exactly]
];

export interface GenerationSetting {
  key: AIModelSettingKey;
  lockKey: AIModelLockKey;
  label: string;
  description: string;
  defaultModel: string;
}

export const GENERATION_SETTINGS: GenerationSetting[] = [
  // [paste lines 153-216 exactly]
];
```

### 3b. Update `ai-settings.tsx`

After extraction:
- Add import:
  ```tsx
  import { MODEL_CATALOG, MODEL_KEYS, GENERATION_SETTINGS, type ModelInfo } from '@/constants/aiModels';
  ```
- Remove `DEFAULT_IMAGE_MODEL`, `DEFAULT_BODY_MODEL`, `MODEL_CATALOG`, `MODEL_KEYS`, `GENERATION_SETTINGS` definitions
- The component logic that references these constants stays unchanged

**Expected result:** ~285 lines

---

## Barrel export updates

### `src/components/tabs/index.ts`

No changes needed. `FullScreenMenuModal` keeps its existing export. `MenuGrid` and `MenuActionList` are internal implementation details — do NOT add them to the barrel.

### `src/components/wardrobe/index.ts`

Check if `OutfitCreatorPanel` is re-exported. If so, keep that export unchanged. `PanelCards` is internal — do NOT add to barrel.

---

## Constraints

- Do NOT change any component props, behavior, or visual output
- Do NOT change how `_layout.tsx` consumes `FullScreenMenuModal` or its `MenuItem` type
- Do NOT change how `wardrobe.tsx` / `OutfitCreatorSection.tsx` consume `OutfitCreatorPanel`
- Move code exactly as-is (no renaming style keys, no changing values)
- Keep all constants that are publicly re-exported (`PANEL_HANDLE_AREA_HEIGHT`, `PANEL_COLLAPSED_HEIGHT`)
- The `MenuItem` type MUST remain exported from `FullScreenMenuModal.tsx` (other files import it)
- Create the `src/constants/` directory if it doesn't exist

## Acceptance criteria

- [ ] `src/components/tabs/FullScreenMenuModal.styles.ts` exists, exports `createStyles`
- [ ] `src/components/tabs/MenuGrid.tsx` exists, exports `MenuGrid`
- [ ] `src/components/tabs/MenuActionList.tsx` exists, exports `MenuActionList`
- [ ] `FullScreenMenuModal.tsx` is under 300 lines, imports from new files
- [ ] `src/components/wardrobe/OutfitCreatorPanel.styles.ts` exists, exports `createStyles`, `PANEL_HANDLE_AREA_HEIGHT`, `PANEL_COLLAPSED_HEIGHT`
- [ ] `src/components/wardrobe/PanelCards.tsx` exists, exports `PanelItemCard`, `PanelCategoryCard`
- [ ] `OutfitCreatorPanel.tsx` is under 260 lines, imports from new files
- [ ] `src/constants/aiModels.ts` exists, exports `MODEL_CATALOG`, `MODEL_KEYS`, `GENERATION_SETTINGS`, `DEFAULT_IMAGE_MODEL`, `DEFAULT_BODY_MODEL`, `ModelInfo`, `GenerationSetting`
- [ ] `ai-settings.tsx` is under 300 lines, imports from `@/constants/aiModels`
- [ ] `MenuItem` type still exported from `FullScreenMenuModal.tsx`
- [ ] `PANEL_HANDLE_AREA_HEIGHT` and `PANEL_COLLAPSED_HEIGHT` still importable from `OutfitCreatorPanel` (re-exported from styles file)
- [ ] Barrel files (`src/components/tabs/index.ts`, `src/components/wardrobe/index.ts`) unchanged
- [ ] No TypeScript errors (pre-existing jest type error is OK)
