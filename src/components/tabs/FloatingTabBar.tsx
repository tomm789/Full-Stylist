import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useDerivedValue, useAnimatedStyle } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/styles/themeConfig';
import { haptics } from '@/utils/haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export interface FloatingTabBarProps extends BottomTabBarProps {
  onMenuPress?: () => void;
  menuActive?: boolean;
  onNotificationsPress?: () => void;
  onCreatePress?: () => void;
  onProfilePress?: () => void;
}

export function FloatingTabBar(props: FloatingTabBarProps) {
  const colors = useThemeColors();
  const { tabBarOpacity, tabBarDimOpacity } = useFloatingTabBar();
  const containerZIndex = props.menuActive ? 60 : 40;

  const combinedOpacity = useDerivedValue(
    () => tabBarOpacity.value * tabBarDimOpacity.value
  );

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: props.menuActive ? 1 : combinedOpacity.value,
  }));

  if (props.menuActive) {
    return (
      <Animated.View
        style={[
          floatingTabBarStyles.container,
          {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.18)',
            zIndex: containerZIndex,
            ...shadows.lg,
          },
          animatedContainerStyle,
        ]}
      >
        <BlurView
          intensity={40}
          tint="light"
          style={[StyleSheet.absoluteFillObject, { borderRadius: borderRadius.round, overflow: 'hidden' }]}
        />
        <View style={[floatingTabBarStyles.inner, floatingTabBarStyles.menuInner]}>
          <View style={floatingTabBarStyles.menuActionsRow}>
            <TouchableOpacity
              onPress={props.onNotificationsPress}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
              <Text style={[floatingTabBarStyles.label, { color: colors.textSecondary }]}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={props.onCreatePress}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityLabel="Create new"
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.textPrimary} />
              <Text style={[floatingTabBarStyles.label, { color: colors.textSecondary }]}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={props.onProfilePress}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <Ionicons name="person-outline" size={22} color={colors.textPrimary} />
              <Text style={[floatingTabBarStyles.label, { color: colors.textSecondary }]}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={props.onMenuPress}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <Ionicons name="menu-outline" size={22} color={colors.primary} />
              <Text style={[floatingTabBarStyles.label, { color: colors.primary }]}>Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        floatingTabBarStyles.container,
        {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.18)',
          zIndex: containerZIndex,
          ...shadows.lg,
        },
        animatedContainerStyle,
      ]}
    >
      <BlurView
        intensity={40}
        tint="light"
        style={[StyleSheet.absoluteFillObject, { borderRadius: borderRadius.round, overflow: 'hidden' }]}
      />
      <View style={[floatingTabBarStyles.inner, floatingTabBarStyles.menuInner]}>
        <View style={floatingTabBarStyles.menuActionsRow}>
        {props.state.routes.map((route, index) => {
          const { options } = props.descriptors[route.key];

          // Skip hidden tabs (create, social)
          const flatItemStyle = options.tabBarItemStyle
            ? StyleSheet.flatten(options.tabBarItemStyle)
            : null;
          if (flatItemStyle && (flatItemStyle as any).display === 'none') {
            return null;
          }

          const focused = props.state.index === index;
          const color = focused ? colors.primary : colors.textTertiary;
          const label = options.tabBarLabel ?? options.title ?? route.name;

          const onPress = () => {
            haptics.selection();
            const event = props.navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              props.navigation.navigate(route.name, route.params);
            }
          };

          const iconNode = options.tabBarIcon?.({ focused, color, size: 22 });
          const labelText = typeof label === 'string' ? label : '';

          if (route.name === 'profile' && props.onMenuPress) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={props.onMenuPress}
                style={floatingTabBarStyles.tab}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={labelText || 'Menu'}
              >
                {iconNode}
                {labelText ? (
                  <Text style={[floatingTabBarStyles.label, { color }]}>{labelText}</Text>
                ) : null}
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={floatingTabBarStyles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={labelText || undefined}
            >
              {iconNode}
              {labelText ? (
                <Text style={[floatingTabBarStyles.label, { color }]}>{labelText}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
        </View>
      </View>
    </Animated.View>
  );
}

const floatingTabBarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.round,
  },
  inner: {
    flexDirection: 'row',
    height: 60,
  },
  menuInner: {
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
  menuActionsRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
});
