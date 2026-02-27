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
  const colors = useThemeColors();
  const { tabBarOpacity, tabBarDimOpacity } = useFloatingTabBar();
  const tabSearchInputRef = useRef<TextInput>(null);
  const tabSearchAnim = useRef(new Animated.Value(props.tabSearchOpen ? 1 : 0)).current;
  const tabSearchEnabled = Boolean(props.tabSearchEnabled);
  const tabSearchQuery = props.tabSearchQuery ?? '';
  const tabSearchOpen = Boolean(props.tabSearchOpen);
  const containerZIndex = props.menuActive ? 60 : 40;
  const containerOpacity = props.menuActive
    ? 1
    : Animated.multiply(tabBarOpacity, tabBarDimOpacity);

  useEffect(() => {
    const animation = Animated.timing(tabSearchAnim, {
      toValue: tabSearchOpen ? 1 : 0,
      duration: SEARCH_EXPAND_DURATION_MS,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished && tabSearchOpen) {
        tabSearchInputRef.current?.focus();
      }
    });
    return () => {
      animation.stop();
    };
  }, [tabSearchAnim, tabSearchOpen]);

  if (props.menuActive) {
    return (
      <Animated.View
        style={[
          floatingTabBarStyles.container,
          {
            backgroundColor: colors.backgroundSecondary,
            zIndex: containerZIndex,
            ...shadows.lg,
            opacity: containerOpacity,
          },
        ]}
      >
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
          backgroundColor: colors.backgroundSecondary,
          zIndex: containerZIndex,
          ...shadows.lg,
          opacity: containerOpacity,
        },
      ]}
    >
      <View style={[floatingTabBarStyles.inner, floatingTabBarStyles.menuInner]}>
        <Animated.View
          style={[
            floatingTabBarStyles.menuActionsRow,
            {
              opacity: tabSearchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
              transform: [
                {
                  translateY: tabSearchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 8],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={tabSearchOpen ? 'none' : 'auto'}
        >
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
              <React.Fragment key={route.key}>
                {tabSearchEnabled ? (
                  <TouchableOpacity
                    onPress={() => {
                      props.onTabSearchToggle?.(true);
                    }}
                    style={floatingTabBarStyles.tab}
                    accessibilityRole="button"
                    accessibilityLabel="Search"
                  >
                    <Ionicons name="search-outline" size={22} color={colors.textTertiary} />
                    <Text style={[floatingTabBarStyles.label, { color: colors.textTertiary }]}>Search</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
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
              </React.Fragment>
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
        </Animated.View>

        <Animated.View
          style={[
            floatingTabBarStyles.expandedSearchRow,
            {
              opacity: tabSearchAnim,
              transform: [
                {
                  translateY: tabSearchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={tabSearchOpen ? 'auto' : 'none'}
        >
          <View
            style={[
              floatingTabBarStyles.searchWrapExpanded,
              { borderColor: colors.borderLight, backgroundColor: colors.background },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              ref={tabSearchInputRef}
              value={tabSearchQuery}
              onChangeText={props.onTabSearchChange}
              placeholder={props.tabSearchPlaceholder ?? 'Search'}
              placeholderTextColor={colors.textTertiary}
              style={[floatingTabBarStyles.searchInput, { color: colors.textPrimary }]}
              autoCorrect={false}
              returnKeyType="search"
              blurOnSubmit
            />
            <TouchableOpacity
              onPress={() => props.onTabSearchToggle?.(false)}
              accessibilityRole="button"
              accessibilityLabel="Collapse search"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    overflow: 'hidden',
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
  expandedSearchRow: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  searchWrapExpanded: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    paddingVertical: 0,
  },
});
