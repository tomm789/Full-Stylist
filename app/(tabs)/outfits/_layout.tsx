import React from 'react';
import { Stack } from 'expo-router';
import { HeaderAddMenu, HeaderRightMenu } from '@/components/tabs';

export default function OutfitsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerRight: () => <HeaderRightMenu />,
        headerTitleAlign: 'left',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <HeaderAddMenu title="Outfits" />,
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
