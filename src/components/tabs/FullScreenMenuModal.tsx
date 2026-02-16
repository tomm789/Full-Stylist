/**
 * FullScreenMenuModal Component
 * Slide-in navigation menu panel from the right edge.
 * Header layout: title - add new ----- search - notifications
 * No close button — closed by tapping the menu icon in the floating pill.
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Animated,
  DevSettings,
  Dimensions,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationsContext';
import { borderRadius, spacing, typography, shadows } from '@/styles/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { HeaderActionIcons } from '@/components/shared';
import type { ThemeColors } from '@/styles/themes';

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
  gridTitle: string;
  gridItems: MenuItem[];
  actionItems: MenuItem[];
  query: string;
};

export function FullScreenMenuModal({
  visible,
  onClose,
  onAdd,
  gridTitle,
  gridItems,
  actionItems,
  query,
}: FullScreenMenuModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setRendered(false);
        }
      });
    }
  }, [visible]);

  // Swipe right to dismiss menu
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dx) > 10 && gestureState.dx > 0,
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          onClose();
        }
      },
    })
  ).current;

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
    onClose();
    router.push('/search' as any);
  };

  const handleNotifications = () => {
    onClose();
    router.push('/notifications' as any);
  };

  if (!rendered) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        { transform: [{ translateX: slideAnim }] },
      ]}
      {...panResponder.panHandlers}
    >
      <SafeAreaView style={styles.container}>
        {/* Header — title + actions */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.menuCollapseButton} onPress={onClose}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <RNText style={styles.title}>Menu</RNText>
          </View>
          <View style={styles.headerRight}>
            <HeaderActionIcons
              onAdd={onAdd}
              onSearch={handleSearch}
              onNotifications={handleNotifications}
              unreadCount={unreadCount}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
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

          {filteredGridItems.length > 0 && (
            <View style={styles.section}>
              {!!gridTitle && <RNText style={styles.sectionTitle}>{gridTitle}</RNText>}
              <View style={styles.grid}>
                {filteredGridItems.map((item) => (
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
          )}

          {filteredActionItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.cardGroup}>
                {filteredActionItems.map((item) => (
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
          )}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backgroundSecondary,
    zIndex: 50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuCollapseButton: {
    padding: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerIcon: {
    position: 'relative',
    padding: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.round,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.textLight,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.massive + spacing.huge,
    gap: spacing.lg,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  refreshIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  refreshTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  refreshTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  refreshDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  cardGroup: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  gridIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  gridCardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  cardTitleDestructive: {
    color: colors.error,
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
