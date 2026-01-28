import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderAddMenu, HeaderRightMenu } from '@/components/tabs';

export default function TabsLayout() {
  return (
    <Tabs
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
      <Tabs.Screen
        name="calendar"
        options={{
          headerTitle: () => <HeaderAddMenu title="Calendar" />,
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          headerTitle: () => <HeaderAddMenu title="Wardrobe" />,
          tabBarLabel: 'Wardrobe',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="outfits"
        options={{
          headerTitle: () => <HeaderAddMenu title="Outfits" />,
          tabBarLabel: 'Outfits',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lookbooks"
        options={{
          headerTitle: () => <HeaderAddMenu title="Lookbooks" />,
          tabBarLabel: 'Lookbooks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          headerTitle: () => <HeaderAddMenu title="Social" />,
          tabBarLabel: 'Social',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: () => <HeaderAddMenu title="Profile" />,
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
