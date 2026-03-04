/**
 * FullScreenMenuModal Component
 * Slide-in navigation menu panel from the right edge.
 * Header layout: title - add new ----- search - notifications
 * No close button — closed by tapping the menu icon in the floating pill.
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  DevSettings,
  Dimensions,
  SafeAreaView,
  ScrollView,
  TextInput,
  Text as RNText,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import HeaderSearchPill from '@/components/tabs/HeaderSearchPill';
import SearchOverlay from '@/components/search/SearchOverlay';
import { useSearch } from '@/hooks';
import { createStyles } from './FullScreenMenuModal.styles';
import { MenuGrid } from './MenuGrid';
import { MenuActionList } from './MenuActionList';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

export type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  description?: string;
  tone?: 'default' | 'destructive';
  keywords?: string[];
};

type FullScreenMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd?: () => void;
  onProfile?: () => void;
  gridTitle: string;
  gridItems: MenuItem[];
  actionItems: MenuItem[];
  query: string;
  onQueryChange: (value: string) => void;
};

export function FullScreenMenuModal({
  visible,
  onClose,
  onAdd,
  onProfile,
  gridTitle,
  gridItems,
  actionItems,
  query,
  onQueryChange,
}: FullScreenMenuModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const slideAnim = useSharedValue(SCREEN_WIDTH);
  const [rendered, setRendered] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const {
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    filteredResults,
    loading,
  } = useSearch({ userId: user?.id });

  useEffect(() => {
    if (visible) {
      setRendered(true);
      slideAnim.value = withTiming(0, { duration: 280 });
    } else {
      slideAnim.value = withTiming(SCREEN_WIDTH, { duration: 250 });
      // Delay unmount to allow the slide-out animation to complete
      const timeout = setTimeout(() => {
        setRendered(false);
      }, 260);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setSearchOpen(false);
    }
  }, [visible]);

  // Swipe right to dismiss menu
  const panGesture = Gesture.Pan()
    .activeOffsetX(10)
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(onClose)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  const normalizedQuery = query.trim().toLowerCase();

  const matchesQuery = (item: MenuItem) => {
    if (!normalizedQuery) return true;
    const haystack = [
      item.label,
      item.description || '',
      ...(item.keywords || []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  };

  const filteredGridItems = useMemo(
    () => gridItems.filter(matchesQuery),
    [gridItems, normalizedQuery]
  );
  const filteredActionItems = useMemo(
    () => actionItems.filter(matchesQuery),
    [actionItems, normalizedQuery]
  );

  const handleSearch = () => {
    setSearchOpen(true);
  };

  const handleBackFromSearch = () => {
    setSearchOpen(false);
    onClose();
  };

  const handleNotifications = () => {
    onClose();
    router.push('/notifications' as any);
  };

  if (!rendered) return null;

  return (
    <GestureDetector gesture={panGesture}>
    <Animated.View
      style={[
        styles.overlay,
        animatedStyle,
      ]}
    >
      <SafeAreaView style={styles.container}>
        {/* Header — title + actions */}
        <View
          style={styles.header}
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        >
          {searchOpen ? (
            <>
              <TouchableOpacity style={styles.menuCollapseButton} onPress={handleBackFromSearch}>
                <Ionicons name="chevron-back" size={22} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.searchHeaderPillWrap}>
                <HeaderSearchPill
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onFilter={() => {}}
                  hasActiveFilters={false}
                  placeholder="Search..."
                  showFilter={false}
                  inlineSearchEnabled
                  expanded
                  onToggleExpanded={() => handleBackFromSearch()}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.menuCollapseButton} onPress={onClose}>
                  <Ionicons name="chevron-back" size={22} color={colors.primary} />
                </TouchableOpacity>
                <RNText style={styles.title}>Menu</RNText>
              </View>
              <View style={styles.headerRight}>
                {onAdd && (
                  <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={onAdd}
                    accessibilityRole="button"
                    accessibilityLabel="Add item"
                  >
                    <Ionicons name="add-circle-outline" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.headerIcon}
                  onPress={handleSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Search"
                >
                  <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerIcon}
                  onPress={handleNotifications}
                  accessibilityRole="button"
                  accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                >
                  <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                {onProfile && (
                  <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={onProfile}
                    accessibilityRole="button"
                    accessibilityLabel="Profile"
                  >
                    <Ionicons name="person-outline" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.menuSearchRow}>
          <View style={styles.menuSearchWrap}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={onQueryChange}
              placeholder="Filter menu options"
              placeholderTextColor={colors.textTertiary}
              style={styles.menuSearchInput}
              autoCorrect={false}
              blurOnSubmit
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <TouchableOpacity
            style={styles.refreshRow}
            onPress={async () => {
              try {
                // Expo Go may not include expo-updates in some setups.
                // Use DevSettings reload as a safe fallback.
                const Updates = require('expo-updates');
                await Updates.reloadAsync();
              } catch (error) {
                DevSettings.reload();
              }
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Hard reload app"
          >
            <View style={styles.refreshIconWrap}>
              <Ionicons name="refresh" size={20} color={colors.textPrimary} />
            </View>
            <View style={styles.refreshTextWrap}>
              <RNText style={styles.refreshTitle}>Refresh</RNText>
              <RNText style={styles.refreshDescription}>
                Hard reload the Expo Go page
              </RNText>
            </View>
          </TouchableOpacity>

          <MenuGrid
            title={gridTitle}
            items={filteredGridItems}
            styles={styles}
            colors={colors}
          />

          <MenuActionList
            items={filteredActionItems}
            styles={styles}
            colors={colors}
          />
        </ScrollView>

        <SearchOverlay
          open={searchOpen}
          width={windowWidth}
          topOffset={headerHeight}
          searchQuery={searchQuery}
          loading={loading}
          selectedFilter={selectedFilter}
          filteredResults={filteredResults}
          onFilterChange={setSelectedFilter}
          onResultPress={(result) => {
            setSearchOpen(false);
            onClose();
            if (result.type === 'user') router.push(`/users/${result.id}`);
            if (result.type === 'outfit') router.push(`/outfits/${result.id}`);
            if (result.type === 'lookbook') router.push(`/lookbooks/${result.id}`);
            if (result.type === 'wardrobe_item') router.push(`/wardrobe/item/${result.id}`);
          }}
        />
      </SafeAreaView>
    </Animated.View>
    </GestureDetector>
  );
}
