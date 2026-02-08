import React from 'react';
import { Stack } from 'expo-router';
import { HeaderAddMenu, HeaderRightMenu, ConnectedHeaderSearchMenu } from '@/components/tabs';
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
          headerTitle: 'Outfits',
          headerRight: () => <ConnectedHeaderSearchMenu />,
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
