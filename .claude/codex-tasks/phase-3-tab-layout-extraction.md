# Task: Extract FloatingTabBar and menu items from _layout.tsx

## Files to read first
- `app/(tabs)/_layout.tsx` (785 lines — the file being refactored)
- `src/components/tabs/FullScreenMenuModal.tsx` (verify existing tabs component location)
- `src/components/tabs/index.ts` (barrel export — will need updating)

## Overview

Extract the `FloatingTabBar` component (~310 lines including styles) into its own file, and extract the menu item data + handlers into a custom hook. This should reduce `_layout.tsx` to ~200-250 lines.

## Changes

### 1. Create `src/components/tabs/FloatingTabBar.tsx`

Move from `_layout.tsx`:
- The `SEARCH_EXPAND_DURATION_MS` constant (line 18)
- The entire `FloatingTabBar` function component (lines 20-279)
- The `floatingTabBarStyles` StyleSheet (lines 281-329)

The component's props type is already defined inline. Extract it as a named interface:

```tsx
import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/styles/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const SEARCH_EXPAND_DURATION_MS = 180;

export interface FloatingTabBarProps extends BottomTabBarProps {
  onMenuPress?: () => void;
  menuActive?: boolean;
  tabSearchEnabled?: boolean;
  tabSearchQuery?: string;
  tabSearchOpen?: boolean;
  onTabSearchToggle?: (expanded: boolean) => void;
  onTabSearchChange?: (value: string) => void;
  tabSearchPlaceholder?: string;
  onNotificationsPress?: () => void;
  onCreatePress?: () => void;
  onProfilePress?: () => void;
}

export function FloatingTabBar(props: FloatingTabBarProps) {
  // [paste entire component body unchanged]
}

const floatingTabBarStyles = StyleSheet.create({
  // [paste entire StyleSheet unchanged]
});
```

### 2. Create `src/hooks/tabs/useTabMenuItems.ts`

Move from `_layout.tsx`:
- `handleMenuOption` callback (lines 399-450)
- `handleCreateOption` function (lines 377-397)
- `gridItems` useMemo (lines 452-488)
- `actionItems` useMemo (lines 490-549)

The hook needs these dependencies passed in or imported:
- `router` (from `useRouter()`)
- `signOut` (from `useAuth()`)
- `openDateSelector` (from `useCalendarEntryFlow()`)

```tsx
import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarEntryFlow } from '@/contexts/CalendarEntryFlowContext';

export function useTabMenuItems() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { openDateSelector } = useCalendarEntryFlow();

  const handleCreateOption = useCallback((type: string) => {
    // [paste switch body]
  }, [router, openDateSelector]);

  const handleMenuOption = useCallback(async (action: string) => {
    // [paste switch body]
  }, [router, signOut]);

  const gridItems = useMemo(() => [
    // [paste array — replace handleMenuOption calls with handleMenuOption]
  ], [handleMenuOption]);

  const actionItems = useMemo(() => [
    // [paste array]
  ], [handleMenuOption]);

  return { handleCreateOption, handleMenuOption, gridItems, actionItems };
}
```

### 3. Create `src/hooks/tabs/` directory if it doesn't exist

### 4. Update `src/components/tabs/index.ts`

Add export for the new FloatingTabBar:
```tsx
export { FloatingTabBar } from './FloatingTabBar';
export type { FloatingTabBarProps } from './FloatingTabBar';
```

### 5. Update `app/(tabs)/_layout.tsx`

After extraction, `_layout.tsx` should:
- Remove the `FloatingTabBar` component, `floatingTabBarStyles`, and `SEARCH_EXPAND_DURATION_MS`
- Remove `handleMenuOption`, `handleCreateOption`, `gridItems`, `actionItems`
- Remove imports that are no longer directly used (`useAuth`, `useCalendarEntryFlow` if only used by the hook)
- Add imports:
  ```tsx
  import { FloatingTabBar } from '@/components/tabs/FloatingTabBar';
  import { useTabMenuItems } from '@/hooks/tabs/useTabMenuItems';
  ```
- In `TabsLayoutInner`, call the hook:
  ```tsx
  const { handleCreateOption, gridItems, actionItems } = useTabMenuItems();
  ```
- Keep: `TabsLayout` (providers wrapper), `TabsLayoutInner` (Tabs config, modals, FloatingTabBar render), `createStyles` (small, only for create menu dropdown)
- Keep the `showCreateMenu`, `showMenu`, `menuQuery` state
- Keep `handleBottomPillCreate`, `handleBottomPillNotifications`, `handleBottomPillProfile` callbacks
- Keep the tab search wiring logic

## Constraints

- Do NOT change `FloatingTabBar` props or behavior
- Do NOT change how `FullScreenMenuModal` receives `gridItems` and `actionItems`
- Do NOT change how `DropdownMenuModal` renders the create menu
- The `createStyles` for the create menu dropdown can stay in `_layout.tsx` (it's only ~38 lines)
- Keep `handleBottomPillCreate/Notifications/Profile` in `_layout.tsx` (they manage local state `showMenu`)

## Acceptance criteria

- [ ] `src/components/tabs/FloatingTabBar.tsx` exists and exports `FloatingTabBar` + `FloatingTabBarProps`
- [ ] `src/hooks/tabs/useTabMenuItems.ts` exists and exports `useTabMenuItems` returning `{ handleCreateOption, handleMenuOption, gridItems, actionItems }`
- [ ] `app/(tabs)/_layout.tsx` is under 280 lines
- [ ] `app/(tabs)/_layout.tsx` imports `FloatingTabBar` from `@/components/tabs/FloatingTabBar`
- [ ] `app/(tabs)/_layout.tsx` imports `useTabMenuItems` from `@/hooks/tabs/useTabMenuItems`
- [ ] Tab navigation works identically (wardrobe, outfits, hair-and-make-up, profile/menu)
- [ ] Menu opens/closes, create menu works, search in tab bar works
- [ ] No TypeScript errors (`npx tsc --noEmit`)
