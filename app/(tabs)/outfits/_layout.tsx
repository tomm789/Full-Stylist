import React from 'react';
import { Stack } from 'expo-router';
import { HeaderAddMenu, HeaderRightMenu, ConnectedHeaderSearchTitle, ConnectedHeaderSearchRight } from '@/components/tabs';
import { useThemeColors } from '@/contexts/ThemeContext';

export default function OutfitsLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerRight: () => <HeaderRightMenu />,
        headerTitleAlign: 'left',
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <ConnectedHeaderSearchTitle fallbackTitle="Outfits" />,
          headerRight: () => <ConnectedHeaderSearchRight />,
        }}
      />
      <Stack.Screen
        name="lookbooks"
        options={{
          headerTitle: () => <HeaderAddMenu title="Lookbooks" />,
        }}
      />
    </Stack>
  );
}
